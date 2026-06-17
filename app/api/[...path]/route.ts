import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectDatabase } from "@/lib/db";
import { Lead, User, CrmBuyerLead } from "@/models";
import { authCookieOptions, cookieName, signAuthToken, verifyAuthToken } from "@/lib/auth";
import { getIstDayRange } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthPayload = {
  id: string;
  role: "admin" | "employee";
  name: string;
  email: string;
};

type LoginBody = {
  email?: string;
  password?: string;
};

type PasswordBody = {
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  mode?: string;
  password?: string;
};

type LeadBody = Record<string, unknown> & {
  leads?: unknown;
  assignedTo?: string | null;
  status?: string;
  followUpDate?: string;
  followUpNote?: string;
  notes?: string;
  outcome?: string;
  duration?: string;
  connected?: boolean;
  via?: "call" | "whatsapp";
};

const defaultEmployeePassword = process.env.DEFAULT_EMPLOYEE_PASSWORD ?? "employee123";

const callOutcomeStatus: Record<string, string> = {
  deal_done: "converted",
  connected_interested: "interested",
  callback_requested: "follow_up",
  proposal_sent: "in_talks",
  no_answer: "reached_out",
  busy: "follow_up",
  wrong_number: "not_interested",
  not_interested: "not_interested",
};

type TierResult = { tier: "hot" | "warm" | "cold"; label: string; color: string };

/**
 * Calculates the lead tier from rating/review_count/has_website/status fields.
 * Works on both raw DB docs and normalized docs.
 */
function calculateTier(lead: Record<string, unknown>): TierResult {
  const r = Number(lead.rating ?? 0);
  const rv = Number(lead.review_count ?? lead.reviewCount ?? 0);
  // has_website can be a boolean OR derived from websiteStatus
  const noWeb =
    lead.has_website === false ||
    lead.has_website === undefined && lead.websiteStatus !== "has_website";
  const isNew = lead.status === "new";

  if (r >= 4.0 && rv >= 20 && noWeb && isNew)
    return { tier: "hot", label: "🔥 Hot", color: "#ff4757" };

  if (r >= 3.5 && rv >= 10 && noWeb)
    return { tier: "warm", label: "⚡ Warm", color: "#ffa502" };

  return { tier: "cold", label: "🧊 Cold", color: "#747d8c" };
}

/**
 * Calculates priority score — single number ranking lead contact-worthiness.
 * max 50 pts (rating) + max 30 pts (reviews) + 20 pts (no website)
 */
function calcPriorityScore(lead: Record<string, unknown>): number {
  const r = Number(lead.rating ?? 0);
  const rv = Number(lead.review_count ?? lead.reviewCount ?? 0);
  const noWeb =
    lead.has_website === false ||
    (lead.has_website === undefined && lead.websiteStatus !== "has_website");

  return (
    r * 10 +
    (Math.min(rv, 200) / 200) * 30 +
    (noWeb ? 20 : 0)
  );
}

/**
 * Normalizes a raw lead document (from DB or scraper) into a consistent shape
 * that the frontend LeadRecord type expects.
 * Handles both Google Maps scraper format and manual CRM format.
 */
function normalizeLead(doc: Record<string, unknown>): Record<string, unknown> {
  const lead = { ...doc };

  // business_name → name
  if (!lead.name && lead.business_name) {
    lead.name = lead.business_name;
  }
  // category → niche
  if (!lead.niche && lead.category) {
    lead.niche = lead.category;
  }
  // pitch_message → pitchMessage
  if (!lead.pitchMessage && lead.pitch_message) {
    lead.pitchMessage = lead.pitch_message;
  }
  // review_count → reviewCount
  if (lead.reviewCount == null && lead.review_count != null) {
    lead.reviewCount = lead.review_count;
  }
  // is_generic → isGeneric
  if (lead.isGeneric == null && lead.is_generic != null) {
    lead.isGeneric = lead.is_generic;
  }
  // has_website → websiteStatus
  if (!lead.websiteStatus || lead.websiteStatus === "no_website") {
    if (lead.has_website === true) {
      lead.websiteStatus = "has_website";
    }
  }
  // website_url → websiteUrl
  if (!lead.websiteUrl && lead.website_url) {
    lead.websiteUrl = lead.website_url;
  }
  // Fallback name
  if (!lead.name) {
    lead.name = "Unnamed Lead";
  }
  // Fallback niche
  if (!lead.niche) {
    lead.niche = "Other";
  }

  // Attach computed tier + priority_score
  const tierResult = calculateTier(lead);
  lead.tier = tierResult.tier;
  lead.tierLabel = tierResult.label;
  lead.tierColor = tierResult.color;
  lead.priority_score = calcPriorityScore(lead);

  return lead;
}

function normalizeLeads(docs: Record<string, unknown>[]): Record<string, unknown>[] {
  return docs.map(normalizeLead);
}

function json(
  payload: {
    success: boolean;
    message?: string;
    data?: unknown;
  },
  status = 200
) {
  return NextResponse.json(payload, { status });
}

function ok(data?: unknown, message?: string, status = 200) {
  return json({ success: true, message, data }, status);
}

function fail(message: string, status = 400) {
  return json({ success: false, message }, status);
}

function getSegments(request: NextRequest) {
  return request.nextUrl.pathname.split("/").filter(Boolean).slice(1);
}

async function parseJson<T>(request: NextRequest): Promise<T | null> {
  const text = await request.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function getAuthPayload(request: NextRequest): AuthPayload | null {
  const token = request.cookies.get(cookieName)?.value;
  if (!token) {
    return null;
  }

  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}

function unauthorized() {
  return fail("Authentication required", 401);
}

function forbidden(message = "Admin access required") {
  return fail(message, 403);
}

function notFound(message = "Not found") {
  return fail(message, 404);
}

function methodNotAllowed(_allow: string[] | string) {
  void _allow;
  return json({ success: false, message: "Method not allowed" }, 405);
}

function buildLeadFilter(searchParams: URLSearchParams) {
  const status = searchParams.get("status");
  const niche = searchParams.get("niche");
  const assignedTo = searchParams.get("assignedTo");
  const websiteStatus = searchParams.get("websiteStatus");
  const leadQuality = searchParams.get("leadQuality");
  const city = searchParams.get("city");
  const search = searchParams.get("search");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const tier = searchParams.get("tier");

  const andConditions: Record<string, unknown>[] = [];

  if (status) andConditions.push({ status });

  if (niche) {
    const nicheValues = niche.split(",").map((v) => v.trim()).filter(Boolean);
    if (nicheValues.length === 1) {
      andConditions.push({ $or: [{ niche: nicheValues[0] }, { category: nicheValues[0] }] });
    } else if (nicheValues.length > 1) {
      andConditions.push({ $or: [{ niche: { $in: nicheValues } }, { category: { $in: nicheValues } }] });
    }
  }

  if (assignedTo) andConditions.push({ assignedTo });
  if (websiteStatus) andConditions.push({ websiteStatus });
  if (leadQuality) andConditions.push({ leadQuality });
  if (city) andConditions.push({ city: new RegExp(city, "i") });

  if (search) {
    andConditions.push({
      $or: [
        { name: new RegExp(search, "i") },
        { business_name: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
      ],
    });
  }

  if (from || to) {
    const createdAt: Record<string, unknown> = {};
    if (from) createdAt.$gte = new Date(from);
    if (to) createdAt.$lte = new Date(to);
    andConditions.push({ createdAt });
  }

  // Tier filter — applies DB-level conditions matching calculateTier logic
  if (tier === "hot") {
    andConditions.push({ rating: { $gte: 4.0 }, review_count: { $gte: 20 }, has_website: false, status: "new" });
  } else if (tier === "warm") {
    andConditions.push({ rating: { $gte: 3.5 }, review_count: { $gte: 10 }, has_website: false });
    if (status) andConditions.push({ status });
  } else if (tier === "cold") {
    andConditions.push({ $or: [
      { review_count: { $lt: 10 } },
      { rating: { $lt: 3.5 } },
      { rating: null },
      { review_count: null },
    ] });
  }

  if (andConditions.length === 0) return {};
  if (andConditions.length === 1) return andConditions[0];
  return { $and: andConditions };
}

async function requireAuth(request: NextRequest) {
  const payload = getAuthPayload(request);
  if (!payload) {
    return null;
  }

  return payload;
}

async function requireAdmin(request: NextRequest) {
  const payload = await requireAuth(request);
  if (!payload) {
    return null;
  }

  if (payload.role !== "admin") {
    return null;
  }

  return payload;
}

async function handleAuth(request: NextRequest, segments: string[]) {
  const [action] = segments;

  if (action === "login") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);

    const body = (await parseJson<LoginBody>(request)) ?? {};
    const email = body.email?.toLowerCase().trim();
    const password = body.password;

    if (!email || !password) {
      return fail("Email and password are required", 400);
    }

    const user = await User.findOne({ email, isActive: true }).select("+password");
    if (!user) {
      return fail("Invalid credentials", 401);
    }

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) {
      return fail("Invalid credentials", 401);
    }

    const token = signAuthToken({
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    });

    const response = ok(
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
        },
      },
      undefined,
      200
    );

    response.cookies.set(cookieName, token, authCookieOptions());
    return response;
  }

  if (action === "logout") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);

    const response = ok(undefined, "Logged out successfully");
    response.cookies.set(cookieName, "", { ...authCookieOptions(), maxAge: 0 });
    return response;
  }

  if (action === "change-password") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);

    const payload = await requireAuth(request);
    if (!payload) return unauthorized();

    const body = (await parseJson<PasswordBody>(request)) ?? {};
    const currentPassword = body.currentPassword;
    const newPassword = body.newPassword;

    if (!currentPassword || !newPassword) {
      return fail("Current password and new password are required", 400);
    }

    if (newPassword.length < 6) {
      return fail("New password must be at least 6 characters", 400);
    }

    const user = await User.findById(payload.id).select("+password");
    if (!user) return notFound("User not found");

    const passwordMatches = await user.comparePassword(currentPassword);
    if (!passwordMatches) {
      return fail("Current password is incorrect", 401);
    }

    user.password = newPassword;
    user.passwordResetRequested = false;
    user.passwordResetRequestedAt = null;
    await user.save();

    return ok(undefined, "Password updated successfully");
  }

  if (action === "forgot-password") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);

    const body = (await parseJson<PasswordBody>(request)) ?? {};
    const email = body.email?.toLowerCase().trim();

    if (!email) {
      return fail("Email is required", 400);
    }

    await User.findOneAndUpdate(
      { email, role: "employee", isActive: true },
      { passwordResetRequested: true, passwordResetRequestedAt: new Date() }
    );

    return ok(undefined, "If this employee exists, the admin will see the reset request.");
  }

  if (action === "me") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);

    const payload = await requireAuth(request);
    if (!payload) {
      return unauthorized();
    }

    const user = await User.findById(payload.id).lean();
    if (!user) {
      return notFound("User not found");
    }

    return ok({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  }

  return notFound("Auth route not found");
}

/**
 * Cross-pipeline unlock: when a website lead (future_crm_opportunity=true) is closed/won,
 * find the linked CRM buyer lead via reverse lookup on linked_website_lead_id,
 * change its status from "blocked_needs_website" to "new", set a 30-day follow-up,
 * and append an auto_unlocked entry to its contact_history.
 */
async function unlockCrmBuyerLead(websiteLeadId: string) {
  const followUpDate = new Date();
  followUpDate.setDate(followUpDate.getDate() + 30);

  await CrmBuyerLead.findOneAndUpdate(
    {
      linked_website_lead_id: websiteLeadId,
      status: "blocked_needs_website",
    },
    {
      status: "new",
      followUpDate,
      $push: {
        contact_history: {
          action: "auto_unlocked",
          note: "Website deal closed — CRM pitch now eligible",
          at: new Date(),
        },
      },
    }
  );
}

async function handleLeadDetailAction(
  request: NextRequest,
  leadId: string,
  action: string,
  payload: AuthPayload
) {
  if (!isValidObjectId(leadId)) {
    return fail("Invalid lead id", 400);
  }

  const lead = await Lead.findById(leadId);
  if (!lead) {
    return notFound("Lead not found");
  }

  if (payload.role !== "admin") {
    const assignedTo = lead.assignedTo?.toString?.();
    if (!assignedTo || assignedTo !== payload.id) {
      return forbidden("You do not have access to this lead");
    }
  }

  if (action === "contact-action") {
    if (request.method !== "PATCH") return methodNotAllowed(["PATCH"]);
    const body = (await parseJson<Record<string, unknown>>(request)) ?? {};
    const contactAction = body.action === "whatsapped" ? "whatsapped" : "called";
    const note = typeof body.note === "string" ? body.note : "";

    // Don't downgrade status if already contacted
    const currentLead = await Lead.findById(leadId).lean();
    if (!currentLead) return notFound("Lead not found");

    const isNewStatus = (currentLead as Record<string, unknown>).status === "new";
    const updateObj: Record<string, unknown> = {
      last_contacted_at: new Date(),
      last_contacted_by: payload.name,
      last_action: contactAction,
      $push: {
        contact_history: {
          action: contactAction,
          by_name: payload.name,
          by_id: payload.id,
          at: new Date(),
          note,
        },
      },
    };

    // Only upgrade "new" → "reached_out", never downgrade
    if (isNewStatus) {
      updateObj.status = "reached_out";
    }

    const updatedLead = await Lead.findByIdAndUpdate(leadId, updateObj, { new: true });
    return ok({ lead: normalizeLead(updatedLead?.toObject() ?? {}) });
  }

  if (action === "note") {
    if (request.method !== "PATCH") return methodNotAllowed(["PATCH"]);
    const body = (await parseJson<Record<string, unknown>>(request)) ?? {};
    const historyEntryId = body.history_entry_id;
    const note = body.note ?? "";

    if (!historyEntryId) return fail("history_entry_id is required", 400);

    const updatedLead = await Lead.findOneAndUpdate(
      { _id: leadId, "contact_history._id": historyEntryId },
      { $set: { "contact_history.$.note": note } },
      { new: true }
    );

    return ok({ lead: normalizeLead(updatedLead?.toObject() ?? {}) });
  }

  if (action === "status") {
    if (request.method !== "PATCH") return methodNotAllowed(["PATCH"]);
    const body = (await parseJson<LeadBody>(request)) ?? {};
    if (!body.status) return fail("Status is required", 400);

    const updatedLead = await Lead.findByIdAndUpdate(leadId, { status: body.status }, { new: true });

    // Cross-pipeline unlock: when a website lead with future_crm_opportunity is closed,
    // unblock the linked CRM buyer lead so it becomes eligible for the CRM pitch.
    const newStatus = body.status.toLowerCase();
    const isClosed = newStatus === "closed" || newStatus === "converted" || newStatus === "closed_won";
    const leadDoc = updatedLead?.toObject() as Record<string, unknown> | undefined;
    if (isClosed && leadDoc && leadDoc.future_crm_opportunity === true) {
      await unlockCrmBuyerLead(leadId);
    }

    return ok({ lead: updatedLead });
  }

  if (action === "calllog") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const body = (await parseJson<LeadBody>(request)) ?? {};
    const via = (body as Record<string, unknown>).via === "whatsapp" ? "whatsapp" : "call";
    const update: Record<string, unknown> = {
      $push: {
        callLogs: {
          calledBy: payload.id,
          calledAt: new Date(),
          connected: Boolean(body.connected),
          notes: body.notes ?? "",
          outcome: body.outcome ?? "",
          duration: body.duration ?? "",
          via,
        },
      },
      status: callOutcomeStatus[String(body.outcome ?? "")] ?? "called",
    };

    if (body.followUpDate || body.followUpNote) {
      update.followUpDate = body.followUpDate ? new Date(body.followUpDate) : null;
      update.followUpNote = body.followUpNote ?? "";
    }

    const updatedLead = await Lead.findByIdAndUpdate(leadId, update, { new: true });

    return json({ success: true, data: { lead: normalizeLead(updatedLead?.toObject() ?? {}) } }, 201);
  }

  if (action === "followup") {
    if (request.method !== "PATCH") return methodNotAllowed(["PATCH"]);
    const body = (await parseJson<LeadBody>(request)) ?? {};

    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      {
        followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
        followUpNote: body.followUpNote ?? "",
      },
      { new: true }
    );

    return ok({ lead: updatedLead });
  }

  if (action === "assign") {
    if (request.method !== "PATCH") return methodNotAllowed(["PATCH"]);
    if (payload.role !== "admin") return forbidden();

    const body = (await parseJson<LeadBody>(request)) ?? {};
    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      { assignedTo: body.assignedTo || null },
      { new: true }
    ).populate("assignedTo");

    return ok({ lead: updatedLead });
  }

  return notFound("Lead route not found");
}

async function handleLeads(request: NextRequest, segments: string[]) {
  const [first, second] = segments;

  if (!first) {
    if (request.method === "POST") {
      const payload = await requireAdmin(request);
      if (!payload) {
        return unauthorized();
      }

      const raw = (await parseJson<Record<string, unknown>>(request)) ?? {};

      // Normalize Google Maps scraper format → Lead schema format
      const body: Record<string, unknown> = { ...raw };
      if (!body.name && body.business_name) { body.name = body.business_name; delete body.business_name; }
      if (!body.niche && body.category) { body.niche = body.category; delete body.category; }
      if (body.has_website !== undefined && !body.websiteStatus) {
        body.websiteStatus = body.has_website ? "has_website" : "no_website";
      }
      if (!body.websiteUrl && body.website_url) { body.websiteUrl = body.website_url; delete body.website_url; }
      if (!body.reviewCount && body.review_count !== undefined) { body.reviewCount = body.review_count; delete body.review_count; }
      if (!body.pitchMessage && body.pitch_message) { body.pitchMessage = body.pitch_message; delete body.pitch_message; }
      if (body.isGeneric === undefined && body.is_generic !== undefined) { body.isGeneric = body.is_generic; delete body.is_generic; }
      delete body.created_at;

      try {
        const lead = await Lead.create(body);
        return json({ success: true, data: { lead } }, 201);
      } catch (error) {
        return fail(error instanceof Error ? error.message : "Unable to create lead", 400);
      }
    }

    if (request.method === "GET") {
      const payload = await requireAdmin(request);
      if (!payload) {
        return unauthorized();
      }

      const page = Math.max(Number(request.nextUrl.searchParams.get("page") ?? 1), 1);
      const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 20), 1), 100);
      const filter = buildLeadFilter(request.nextUrl.searchParams);
      const skip = (page - 1) * limit;

      // Build sort order
      const sortParam = request.nextUrl.searchParams.get("sort") ?? "priority_score";
      type MongoSort = Record<string, 1 | -1>;
      const sortMap: Record<string, MongoSort> = {
        rating:         { rating: -1 },
        review_count:   { review_count: -1 },
        newest:         { createdAt: -1 },
        priority_score: { rating: -1, review_count: -1 },
      };
      const sortOrder: MongoSort = sortMap[sortParam] ?? sortMap["priority_score"];

      const [items, total] = await Promise.all([
        Lead.find(filter).populate("assignedTo").sort(sortOrder).skip(skip).limit(limit),
        Lead.countDocuments(filter),
      ]);

      // Normalize, then sort by priority_score in JS (since it's computed)
      const normalized = normalizeLeads(items.map((doc) => doc.toObject()));
      if (sortParam === "priority_score") {
        normalized.sort((a, b) => (Number(b.priority_score ?? 0)) - (Number(a.priority_score ?? 0)));
      }

      return ok({
        leads: normalized,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    }

    return methodNotAllowed(["GET", "POST"]);
  }

  if (first === "bulk-delete") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const payload = await requireAdmin(request);
    if (!payload) return unauthorized();

    const body = (await parseJson<{ ids?: string[]; niche?: string; rawValues?: string[] }>(request)) ?? {};

    // Delete by niche — body.rawValues contains all raw DB values that map to this broad category
    if (body.niche && !body.ids) {
      // rawValues is the list of exact DB niche/category strings that belong to this broad category
      const rawValues: string[] = Array.isArray(body.rawValues) && body.rawValues.length > 0
        ? body.rawValues
        : [body.niche]; // fallback to exact match

      const result = await Lead.deleteMany({
        $or: [
          { niche: { $in: rawValues } },
          { category: { $in: rawValues } },
        ],
      });
      return ok({ deletedCount: result.deletedCount }, `Deleted ${result.deletedCount} leads`);
    }

    // Delete by IDs
    if (Array.isArray(body.ids) && body.ids.length > 0) {
      const validIds = body.ids.filter((id) => isValidObjectId(id));
      const result = await Lead.deleteMany({ _id: { $in: validIds } });
      return ok({ deletedCount: result.deletedCount }, `Deleted ${result.deletedCount} leads`);
    }

    return fail("Provide ids array or niche string", 400);
  }

  if (first === "bulk") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const payload = await requireAdmin(request);
    if (!payload) return unauthorized();

    const body = (await parseJson<LeadBody>(request)) ?? {};
    const rawLeads = Array.isArray(body.leads) ? body.leads : Array.isArray(body) ? body : null;

    if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
      return fail("Lead array is required", 400);
    }

    // Normalize Google Maps scraper format → Lead schema format
    const leads = rawLeads.map((raw: Record<string, unknown>) => {
      const normalized: Record<string, unknown> = { ...raw };

      // Google Maps field: business_name → name
      if (!normalized.name && normalized.business_name) {
        normalized.name = normalized.business_name;
        delete normalized.business_name;
      }
      // category → niche
      if (!normalized.niche && normalized.category) {
        normalized.niche = normalized.category;
        delete normalized.category;
      }
      // has_website → websiteStatus
      if (normalized.has_website !== undefined && !normalized.websiteStatus) {
        normalized.websiteStatus = normalized.has_website ? "has_website" : "no_website";
      }
      // website_url → websiteUrl
      if (!normalized.websiteUrl && normalized.website_url) {
        normalized.websiteUrl = normalized.website_url;
        delete normalized.website_url;
      }
      // review_count → reviewCount
      if (!normalized.reviewCount && normalized.review_count !== undefined) {
        normalized.reviewCount = normalized.review_count;
        delete normalized.review_count;
      }
      // pitch_message → pitchMessage
      if (!normalized.pitchMessage && normalized.pitch_message) {
        normalized.pitchMessage = normalized.pitch_message;
        delete normalized.pitch_message;
      }
      // is_generic → isGeneric
      if (normalized.isGeneric === undefined && normalized.is_generic !== undefined) {
        normalized.isGeneric = normalized.is_generic;
        delete normalized.is_generic;
      }
      // created_at → use MongoDB default (drop to avoid cast errors)
      delete normalized.created_at;
      // _id from scraper — drop it so Mongo generates its own
      delete normalized._id;

      return normalized;
    });

    try {
      const created = await Lead.insertMany(leads, { ordered: false });
      return json({ success: true, data: { leads: created, insertedCount: created.length } }, 201);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Unable to bulk create leads", 400);
    }
  }

  if (first === "niches") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const payload = await requireAuth(request);
    if (!payload) return unauthorized();

    // Broad category map — sub-categories → parent category
    // Key: lowercase sub-category string (exact match), Value: broad parent label
    const CATEGORY_MAP: Record<string, string> = {
      // Salon & Beauty — exact + Google Maps variants
      "salon": "Salon & Beauty",
      "hair salon": "Salon & Beauty",
      "beauty salon": "Salon & Beauty",
      "beauty parlour": "Salon & Beauty",
      "beauty parlor": "Salon & Beauty",
      "barber shop": "Salon & Beauty",
      "barber": "Salon & Beauty",
      "nail salon": "Salon & Beauty",
      "spa": "Salon & Beauty",
      "day spa": "Salon & Beauty",
      "beautician": "Salon & Beauty",
      "makeup artist": "Salon & Beauty",
      "make-up artist": "Salon & Beauty",
      "hairdresser": "Salon & Beauty",
      "hair replacement service": "Salon & Beauty",
      "unisex salon": "Salon & Beauty",
      "fencing salon": "Salon & Beauty",
      "threading": "Salon & Beauty",
      "eyebrow threading": "Salon & Beauty",
      "beauty spa": "Salon & Beauty",
      "cosmetologist": "Salon & Beauty",
      "skin care clinic": "Salon & Beauty",
      "waxing hair removal service": "Salon & Beauty",
      "nail technician": "Salon & Beauty",
      "tattoo shop": "Salon & Beauty",
      "massage therapist": "Salon & Beauty",
      "massage spa": "Salon & Beauty",
      "laser hair removal service": "Salon & Beauty",

      // Real Estate — exact + all Google Maps variants
      "real estate": "Real Estate",
      "real estate agency": "Real Estate",
      "real estate agent": "Real Estate",
      "real estate consultant": "Real Estate",
      "real estate developer": "Real Estate",
      "real estate rental agency": "Real Estate",
      "commercial real estate agency": "Real Estate",
      "commercial real estate inspector": "Real Estate",
      "industrial real estate agency": "Real Estate",
      "office space rental agency": "Real Estate",
      "housing society": "Real Estate",
      "property": "Real Estate",
      "property dealer": "Real Estate",
      "property developer": "Real Estate",
      "property investment company": "Real Estate",
      "property management company": "Real Estate",
      "property administrator": "Real Estate",
      "builder": "Real Estate",
      "construction company": "Real Estate",
      "construction": "Real Estate",
      "interior design": "Real Estate",
      "interior designer": "Real Estate",
      "architect": "Real Estate",
      "home decor": "Real Estate",
      "furniture": "Real Estate",
      "home builder": "Real Estate",
      "land surveyor": "Real Estate",
      "mortgage broker": "Real Estate",
      "title company": "Real Estate",

      // Restaurant & Food
      "restaurant": "Restaurant & Food",
      "cafe": "Restaurant & Food",
      "food": "Restaurant & Food",
      "dhaba": "Restaurant & Food",
      "fast food restaurant": "Restaurant & Food",
      "fast food": "Restaurant & Food",
      "bakery": "Restaurant & Food",
      "sweet shop": "Restaurant & Food",
      "catering": "Restaurant & Food",
      "pizza restaurant": "Restaurant & Food",
      "pizza": "Restaurant & Food",
      "chinese restaurant": "Restaurant & Food",
      "north indian restaurant": "Restaurant & Food",
      "south indian restaurant": "Restaurant & Food",
      "ice cream shop": "Restaurant & Food",
      "juice shop": "Restaurant & Food",
      "tea house": "Restaurant & Food",
      "coffee shop": "Restaurant & Food",
      "food court": "Restaurant & Food",

      // Health & Medical
      "clinic": "Health & Medical",
      "hospital": "Health & Medical",
      "doctor": "Health & Medical",
      "dentist": "Health & Medical",
      "dental clinic": "Health & Medical",
      "physiotherapist": "Health & Medical",
      "pharmacy": "Health & Medical",
      "ayurveda": "Health & Medical",
      "homeopathy": "Health & Medical",
      "eye care": "Health & Medical",
      "eye hospital": "Health & Medical",
      "skin care": "Health & Medical",
      "dermatologist": "Health & Medical",
      "medical center": "Health & Medical",
      "nursing home": "Health & Medical",
      "diagnostic center": "Health & Medical",
      "pathology lab": "Health & Medical",
      "veterinarian": "Health & Medical",

      // Fitness & Gym
      "gym": "Fitness & Gym",
      "fitness center": "Fitness & Gym",
      "fitness club": "Fitness & Gym",
      "fitness": "Fitness & Gym",
      "yoga": "Fitness & Gym",
      "yoga studio": "Fitness & Gym",
      "pilates": "Fitness & Gym",
      "crossfit gym": "Fitness & Gym",
      "personal trainer": "Fitness & Gym",
      "sports": "Fitness & Gym",
      "swimming pool": "Fitness & Gym",
      "martial arts school": "Fitness & Gym",
      "zumba": "Fitness & Gym",

      // Education & Coaching
      "school": "Education & Coaching",
      "coaching": "Education & Coaching",
      "tutor": "Education & Coaching",
      "tutoring service": "Education & Coaching",
      "tutoring": "Education & Coaching",
      "coaching center": "Education & Coaching",
      "coaching centre": "Education & Coaching",
      "college": "Education & Coaching",
      "university": "Education & Coaching",
      "institute": "Education & Coaching",
      "training": "Education & Coaching",
      "dance school": "Education & Coaching",
      "music school": "Education & Coaching",
      "art school": "Education & Coaching",
      "preschool": "Education & Coaching",
      "play school": "Education & Coaching",

      // Hotel & Travel
      "hotel": "Hotel & Travel",
      "travel": "Hotel & Travel",
      "travel agency": "Hotel & Travel",
      "resort": "Hotel & Travel",
      "lodge": "Hotel & Travel",
      "guest house": "Hotel & Travel",
      "hostel": "Hotel & Travel",
      "tours": "Hotel & Travel",
      "tour operator": "Hotel & Travel",
      "motel": "Hotel & Travel",
      "bed & breakfast": "Hotel & Travel",

      // Retail & E-commerce
      "shop": "Retail & E-commerce",
      "store": "Retail & E-commerce",
      "clothing store": "Retail & E-commerce",
      "clothing": "Retail & E-commerce",
      "boutique": "Retail & E-commerce",
      "fashion": "Retail & E-commerce",
      "electronics store": "Retail & E-commerce",
      "electronics": "Retail & E-commerce",
      "mobile shop": "Retail & E-commerce",
      "jewellery": "Retail & E-commerce",
      "jewelry store": "Retail & E-commerce",
      "jewelry": "Retail & E-commerce",
      "footwear": "Retail & E-commerce",
      "hardware store": "Retail & E-commerce",
      "grocery store": "Retail & E-commerce",
      "grocery": "Retail & E-commerce",
      "supermarket": "Retail & E-commerce",
      "gift shop": "Retail & E-commerce",
      "stationery store": "Retail & E-commerce",

      // Legal & Finance
      "lawyer": "Legal & Finance",
      "law firm": "Legal & Finance",
      "advocate": "Legal & Finance",
      "ca": "Legal & Finance",
      "chartered accountant": "Legal & Finance",
      "finance": "Legal & Finance",
      "insurance agency": "Legal & Finance",
      "insurance": "Legal & Finance",
      "investment company": "Legal & Finance",
      "investment": "Legal & Finance",
      "tax consultant": "Legal & Finance",
      "accounting firm": "Legal & Finance",
      "accounting": "Legal & Finance",
      "financial planner": "Legal & Finance",

      // Automotive
      "car dealer": "Automotive",
      "car dealership": "Automotive",
      "car repair": "Automotive",
      "car wash": "Automotive",
      "car": "Automotive",
      "auto repair shop": "Automotive",
      "auto": "Automotive",
      "garage": "Automotive",
      "bike shop": "Automotive",
      "tyre shop": "Automotive",
      "automobile": "Automotive",
      "driving school": "Automotive",
      "used car dealer": "Automotive",
      "motorcycle dealer": "Automotive",
    };

    // Keyword-based fallback rules — checked when exact match fails
    // Order matters: first match wins
    const KEYWORD_RULES: Array<[string, string]> = [
      ["real estate", "Real Estate"],
      ["property", "Real Estate"],
      ["housing", "Real Estate"],
      ["construction", "Real Estate"],
      ["builder", "Real Estate"],
      ["salon", "Salon & Beauty"],
      ["beauty", "Salon & Beauty"],
      ["parlour", "Salon & Beauty"],
      ["parlor", "Salon & Beauty"],
      ["spa", "Salon & Beauty"],
      ["hair", "Salon & Beauty"],
      ["nail", "Salon & Beauty"],
      ["barber", "Salon & Beauty"],
      ["massage", "Salon & Beauty"],
      ["restaurant", "Restaurant & Food"],
      ["food", "Restaurant & Food"],
      ["cafe", "Restaurant & Food"],
      ["bakery", "Restaurant & Food"],
      ["hotel", "Hotel & Travel"],
      ["travel", "Hotel & Travel"],
      ["resort", "Hotel & Travel"],
      ["hospital", "Health & Medical"],
      ["clinic", "Health & Medical"],
      ["medical", "Health & Medical"],
      ["doctor", "Health & Medical"],
      ["dental", "Health & Medical"],
      ["pharmacy", "Health & Medical"],
      ["gym", "Fitness & Gym"],
      ["fitness", "Fitness & Gym"],
      ["yoga", "Fitness & Gym"],
      ["school", "Education & Coaching"],
      ["coaching", "Education & Coaching"],
      ["institute", "Education & Coaching"],
      ["college", "Education & Coaching"],
      ["university", "Education & Coaching"],
      ["shop", "Retail & E-commerce"],
      ["store", "Retail & E-commerce"],
      ["boutique", "Retail & E-commerce"],
      ["lawyer", "Legal & Finance"],
      ["finance", "Legal & Finance"],
      ["insurance", "Legal & Finance"],
      ["accounting", "Legal & Finance"],
      ["car", "Automotive"],
      ["auto", "Automotive"],
      ["garage", "Automotive"],
    ];

    // Fetch all raw niche/category values from DB
    const [nicheGroups, categoryGroups] = await Promise.all([
      Lead.aggregate([
        { $match: { niche: { $exists: true, $nin: [null, ""] } } },
        { $group: { _id: "$niche" } },
      ]),
      Lead.aggregate([
        { $match: { category: { $exists: true, $nin: [null, ""] } } },
        { $group: { _id: "$category" } },
      ]),
    ]);

    const rawValues: string[] = Array.from(
      new Set([
        ...nicheGroups.map((g: { _id: string }) => String(g._id)),
        ...categoryGroups.map((g: { _id: string }) => String(g._id)),
      ])
    ).filter(Boolean);

    // Map each raw value to its broad category
    const broadSet = new Set<string>();
    for (const raw of rawValues) {
      const lower = raw.toLowerCase().trim();
      // 1. Exact match
      const exactMatch = CATEGORY_MAP[lower];
      if (exactMatch) {
        broadSet.add(exactMatch);
        continue;
      }
      // 2. Keyword contains match
      let keywordMatch: string | undefined;
      for (const [keyword, broad] of KEYWORD_RULES) {
        if (lower.includes(keyword)) {
          keywordMatch = broad;
          break;
        }
      }
      if (keywordMatch) {
        broadSet.add(keywordMatch);
      } else {
        // 3. Fallback: capitalize first letter of raw value
        broadSet.add(raw.charAt(0).toUpperCase() + raw.slice(1));
      }
    }

    const categories = Array.from(broadSet).sort();
    // Also return raw→broad map so frontend can do exact DB queries
    const rawToBroad: Record<string, string> = {};
    for (const raw of rawValues) {
      const lower = raw.toLowerCase().trim();
      const exactMatch = CATEGORY_MAP[lower];
      if (exactMatch) {
        rawToBroad[raw] = exactMatch;
        continue;
      }
      let keywordMatch: string | undefined;
      for (const [keyword, broad] of KEYWORD_RULES) {
        if (lower.includes(keyword)) {
          keywordMatch = broad;
          break;
        }
      }
      rawToBroad[raw] = keywordMatch ?? (raw.charAt(0).toUpperCase() + raw.slice(1));
    }

    return ok({ categories, rawToBroad });
  }

  if (first === "recent-updates") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const payload = await requireAuth(request);
    if (!payload) return unauthorized();

    const since = request.nextUrl.searchParams.get("since");
    if (!since) return fail("since query param required", 400);

    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) return fail("Invalid since date", 400);

    const filter: Record<string, unknown> = { updatedAt: { $gt: sinceDate } };
    // Employees only see their own leads
    if (payload.role !== "admin") {
      filter.assignedTo = payload.id;
    }

    const leads = await Lead.find(filter).sort({ updatedAt: -1 }).limit(50);
    return ok({ leads: normalizeLeads(leads.map((doc) => doc.toObject())) });
  }

  if (first === "stats") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const authPayload = await requireAuth(request);
    if (!authPayload) return unauthorized();

    const { start, end } = getIstDayRange();

    // ALL statuses that are NOT "new" or "follow_up" = contacted
    const contactedStatuses = [
      "reached_out", "in_talks", "interested", "converted",
      "not_interested", "called", "callback", "proposal_sent",
      "closed_won", "closed_lost",
    ] as const;
    // Hot/active statuses
    const interestedStatuses = ["interested", "in_talks", "converted"] as const;

    if (authPayload.role === "admin") {
      const [total, newToday, contacted, interested, followUpsToday] = await Promise.all([
        Lead.countDocuments(),
        Lead.countDocuments({ createdAt: { $gte: start, $lte: end } }),
        Lead.countDocuments({ status: { $in: contactedStatuses } }),
        Lead.countDocuments({ status: { $in: interestedStatuses } }),
        Lead.countDocuments({ followUpDate: { $gte: start, $lte: end } }),
      ]);
      return ok({ total, new_today: newToday, contacted, interested, follow_ups_today: followUpsToday });
    } else {
      const [total, newToday, contacted, interested, followUpsToday] = await Promise.all([
        Lead.countDocuments({ assignedTo: authPayload.id }),
        Lead.countDocuments({ assignedTo: authPayload.id, createdAt: { $gte: start, $lte: end } }),
        Lead.countDocuments({ assignedTo: authPayload.id, status: { $in: contactedStatuses } }),
        Lead.countDocuments({ assignedTo: authPayload.id, status: { $in: interestedStatuses } }),
        Lead.countDocuments({ assignedTo: authPayload.id, followUpDate: { $gte: start, $lte: end } }),
      ]);
      return ok({ total, new_today: newToday, contacted, interested, follow_ups_today: followUpsToday });
    }
  }

  if (first === "my") {
    const payload = await requireAuth(request);
    if (!payload) return unauthorized();

    if (second === "today-followups") {
      if (request.method !== "GET") return methodNotAllowed(["GET"]);
      const { start, end } = getIstDayRange();
      const leads = await Lead.find({
        assignedTo: payload.id,
        followUpDate: { $gte: start, $lte: end },
      }).sort({ followUpDate: 1 });

      return ok({ leads: normalizeLeads(leads.map((doc) => doc.toObject())) });
    }

    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const status = request.nextUrl.searchParams.get("status");
    const filter: Record<string, unknown> = { assignedTo: payload.id };
    if (status) filter.status = status;

    const leads = await Lead.find(filter).sort({ followUpDate: 1, status: 1, createdAt: -1 });
    return ok({ leads: normalizeLeads(leads.map((doc) => doc.toObject())) });
  }

  if (first === "auto-assign") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const payload = await requireAdmin(request);
    if (!payload) return unauthorized();

    const employees = await User.find({ role: "employee", isActive: true }).sort({ createdAt: 1 });

    if (employees.length === 0) {
      return fail("No active employees found", 400);
    }

    // Assign ALL leads (not just unassigned) round-robin
    const allLeads = await Lead.find({}).sort({ createdAt: 1 });

    if (allLeads.length === 0) {
      return fail("No leads found to assign", 400);
    }

    const updates = allLeads.map((lead, index) => ({
      updateOne: {
        filter: { _id: lead._id },
        update: { assignedTo: employees[index % employees.length]._id },
      },
    }));

    await Lead.bulkWrite(updates);

    return ok({
      assignedCount: allLeads.length,
      employeeCount: employees.length,
      message: `${allLeads.length} leads assigned across ${employees.length} employees`,
    });
  }

  // DELETE /leads/:id
  if (first && isValidObjectId(first) && !second && request.method === "DELETE") {
    const payload = await requireAdmin(request);
    if (!payload) return unauthorized();
    await Lead.findByIdAndDelete(first);
    return ok(undefined, "Lead deleted");
  }

  if (second) {
    const payload = await requireAuth(request);
    if (!payload) return unauthorized();

    return handleLeadDetailAction(request, first, second, payload);
  }

  if (request.method === "GET") {
    const payload = await requireAuth(request);
    if (!payload) return unauthorized();

    if (!isValidObjectId(first)) {
      return fail("Invalid lead id", 400);
    }

    try {
      const lead = await Lead.findById(first);
      if (!lead) return notFound("Lead not found");
      if (payload.role !== "admin") {
        const assignedTo = lead.assignedTo?.toString?.();
        if (!assignedTo || assignedTo !== payload.id) {
          return forbidden("You do not have access to this lead");
        }
      }
      return ok({ lead: normalizeLead(lead.toObject()) });
    } catch {
      return fail("Invalid lead id", 400);
    }
  }

  return methodNotAllowed(["GET"]);
}

async function handleUsers(request: NextRequest, segments: string[]) {
  const [first, second] = segments;

  if (first === "employees") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const payload = await requireAdmin(request);
    if (!payload) return unauthorized();

    // Single aggregate: group lead counts per employee — no full collection scan in JS
    const [employees, leadStats] = await Promise.all([
      User.find({ role: "employee" }).lean(),
      Lead.aggregate([
        {
          $group: {
            _id: "$assignedTo",
            totalLeads: { $sum: 1 },
            activeLeads: {
              $sum: {
                $cond: [
                  { $in: ["$status", ["new", "called", "interested", "callback", "proposal_sent"]] },
                  1, 0,
                ],
              },
            },
            calledLeads: {
              $sum: { $cond: [{ $eq: ["$status", "called"] }, 1, 0] },
            },
            interestedLeads: {
              $sum: { $cond: [{ $eq: ["$status", "interested"] }, 1, 0] },
            },
            closedLeads: {
              $sum: {
                $cond: [
                  { $in: ["$status", ["closed_won", "closed_lost"]] },
                  1, 0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    // Build a lookup map from the aggregate result
    const statsMap = new Map<string, {
      totalLeads: number; activeLeads: number;
      calledLeads: number; interestedLeads: number; closedLeads: number;
    }>();
    for (const row of leadStats) {
      if (row._id) statsMap.set(row._id.toString(), row);
    }

    return ok({
      employees: employees.map((employee) => {
        const stats = statsMap.get(employee._id.toString());
        return {
          ...employee,
          passwordResetRequested: employee.passwordResetRequested ?? false,
          passwordResetRequestedAt: employee.passwordResetRequestedAt ?? null,
          totalLeads: stats?.totalLeads ?? 0,
          activeLeads: stats?.activeLeads ?? 0,
          callsMade: stats?.calledLeads ?? 0,
          interestedLeads: stats?.interestedLeads ?? 0,
          closedLeads: stats?.closedLeads ?? 0,
        };
      }),
    });
  }

  if (first && second === "password-reset") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const payload = await requireAdmin(request);
    if (!payload) return unauthorized();

    if (!isValidObjectId(first)) {
      return fail("Invalid employee id", 400);
    }

    const body = (await parseJson<PasswordBody>(request)) ?? {};
    const mode = body.mode === "custom" ? "custom" : "default";
    const nextPassword = mode === "custom" ? body.password?.trim() : defaultEmployeePassword;

    if (!nextPassword || nextPassword.length < 6) {
      return fail("Password must be at least 6 characters", 400);
    }

    const user = await User.findOne({ _id: first, role: "employee" }).select("+password");
    if (!user) {
      return notFound("Employee not found");
    }

    user.password = nextPassword;
    user.passwordResetRequested = false;
    user.passwordResetRequestedAt = null;
    await user.save();

    return ok({ defaultPassword: mode === "default" ? defaultEmployeePassword : undefined }, "Password reset successfully");
  }

  if (first === "create") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const payload = await requireAdmin(request);
    if (!payload) return unauthorized();

    const body = (await parseJson<LeadBody>(request)) ?? {};
    const { name, email, password, phone } = body as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
    };

    if (!name || !email || !password) {
      return fail("Name, email, and password are required", 400);
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return fail("Email already exists", 409);
    }

    try {
      const employee = await User.create({
        name,
        email,
        password,
        phone,
        role: "employee",
      });

      return json(
        {
          success: true,
          data: {
            user: {
              id: employee._id.toString(),
              name: employee.name,
              email: employee.email,
              phone: employee.phone,
              role: employee.role,
            },
          },
        },
        201
      );
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Unable to create employee", 400);
    }
  }

  if (first && request.method === "PATCH") {
    const payload = await requireAdmin(request);
    if (!payload) return unauthorized();

    if (!isValidObjectId(first)) {
      return fail("Invalid employee id", 400);
    }

    const body = (await parseJson<Record<string, unknown>>(request)) ?? {};
    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string") updates.name = body.name;
    if (typeof body.email === "string") updates.email = body.email;
    if (typeof body.phone === "string") updates.phone = body.phone;
    if (typeof body.isActive === "boolean") updates.isActive = body.isActive;

    const user = await User.findByIdAndUpdate(first, updates, { new: true });

    if (!user) {
      return notFound("Employee not found");
    }

    return ok({ user });
  }

  return notFound("Users route not found");
}

async function handleStats(request: NextRequest) {
  if (request.method !== "GET") return methodNotAllowed(["GET"]);
  const payload = await requireAdmin(request);
  if (!payload) return unauthorized();

  const { start, end } = getIstDayRange();

  // All queries in a single Promise.all — no serial waits
  const [
    totalLeads,
    statusGroups,
    nicheGroups,
    employeeGroups,
    wonCount,
    hotLeads,
    employeeCount,
    todayFollowUps,
  ] = await Promise.all([
    Lead.countDocuments(),
    Lead.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Lead.aggregate([
      { $match: { $or: [{ niche: { $ne: null } }, { category: { $ne: null } }] } },
      { $group: { _id: { $ifNull: ["$niche", "$category"] }, count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),
    // Lightweight employee grouping — no $lookup, just ObjectId grouping
    Lead.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Lead.countDocuments({ status: "closed_won" }),
    Lead.countDocuments({ leadQuality: "hot" }),
    User.countDocuments({ role: "employee", isActive: true }),
    Lead.countDocuments({ followUpDate: { $gte: start, $lte: end } }),
  ]);

  // Enrich employee groups with names — one User query for just the IDs we need
  const employeeIds = employeeGroups.map((g: { _id: unknown }) => g._id).filter(Boolean);
  const employeeNames = employeeIds.length
    ? await User.find({ _id: { $in: employeeIds } }, { name: 1 }).lean()
    : [];
  const nameMap = new Map(employeeNames.map((u) => [u._id.toString(), u.name]));

  const conversionRate = totalLeads === 0 ? 0 : Math.round((wonCount / totalLeads) * 100);

  return ok({
    summary: {
      totalLeads,
      todayFollowUps,
      hotLeads,
      closedWon: wonCount,
      conversionRate,
      employees: employeeCount,
    },
    leadsByStatus: statusGroups,
    leadsByNiche: nicheGroups,
    leadsByEmployee: employeeGroups.map((g: { _id: unknown; count: number }) => ({
      _id: g._id,
      name: g._id ? nameMap.get(g._id.toString()) ?? "Unknown" : "Unassigned",
      count: g.count,
    })),
  });
}

async function handleCrmLeads(request: NextRequest, segments: string[]) {
  const [first, second] = segments;

  // GET /crm-leads — list (admin sees all, employee sees assigned)
  // GET /crm-leads?status=blocked_needs_website — filter by status
  if (!first) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const payload = await requireAuth(request);
    if (!payload) return unauthorized();

    const status  = request.nextUrl.searchParams.get("status") ?? "";
    const search  = request.nextUrl.searchParams.get("search") ?? "";
    const page    = Math.max(Number(request.nextUrl.searchParams.get("page") ?? 1), 1);
    const limit   = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 20), 1), 100);
    const skip    = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    const andConditions: Record<string, unknown>[] = [];

    if (payload.role !== "admin") {
      andConditions.push({
        $or: [
          { assignedTo: payload.id },
          { assignedTo: null },
          { assignedTo: { $exists: false } },
        ],
      });
    }

    if (status) {
      andConditions.push({ status });
    }

    if (search) {
      andConditions.push({
        $or: [
          { name: new RegExp(search, "i") },
          { business_name: new RegExp(search, "i") },
          { phone: new RegExp(search, "i") },
        ],
      });
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const [items, total] = await Promise.all([
      CrmBuyerLead.find(filter).sort({ crm_lead_score: -1, createdAt: -1 }).skip(skip).limit(limit).populate("linked_website_lead_id", "name _id"),
      CrmBuyerLead.countDocuments(filter),
    ]);

    return ok({
      leads: items.map((d) => d.toObject()),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }

  // PATCH /crm-leads/:id/status
  if (second === "status") {
    if (request.method !== "PATCH") return methodNotAllowed(["PATCH"]);
    const payload = await requireAuth(request);
    if (!payload) return unauthorized();

    if (!isValidObjectId(first)) return fail("Invalid lead id", 400);
    const body = (await parseJson<{ status?: string }>(request)) ?? {};
    if (!body.status) return fail("Status is required", 400);

    const updated = await CrmBuyerLead.findByIdAndUpdate(first, { status: body.status }, { new: true });
    if (!updated) return notFound("CRM lead not found");
    return ok({ lead: updated.toObject() });
  }

  // PATCH /crm-leads/:id/assign
  if (second === "assign") {
    if (request.method !== "PATCH") return methodNotAllowed(["PATCH"]);
    const payload = await requireAdmin(request);
    if (!payload) return unauthorized();

    if (!isValidObjectId(first)) return fail("Invalid lead id", 400);
    const body = (await parseJson<{ assignedTo?: string | null }>(request)) ?? {};

    const updated = await CrmBuyerLead.findByIdAndUpdate(
      first,
      { assignedTo: body.assignedTo || null },
      { new: true }
    );
    if (!updated) return notFound("CRM lead not found");
    return ok({ lead: updated.toObject() });
  }

  // POST /crm-leads/auto-assign
  if (first === "auto-assign") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const payload = await requireAdmin(request);
    if (!payload) return unauthorized();

    const employees = await User.find({ role: "employee", isActive: true }).sort({ createdAt: 1 });
    if (employees.length === 0) return fail("No active employees found", 400);

    const allCrmLeads = await CrmBuyerLead.find({}).sort({ createdAt: 1 });
    if (allCrmLeads.length === 0) return fail("No CRM leads found", 400);

    const updates = allCrmLeads.map((lead, index) => ({
      updateOne: {
        filter: { _id: lead._id },
        update: { assignedTo: employees[index % employees.length]._id },
      },
    }));

    await CrmBuyerLead.bulkWrite(updates);
    return ok({ assignedCount: allCrmLeads.length, employeeCount: employees.length });
  }

  // GET /crm-leads/:id — single lead
  if (first && !second) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const payload = await requireAuth(request);
    if (!payload) return unauthorized();

    if (!isValidObjectId(first)) return fail("Invalid lead id", 400);
    const lead = await CrmBuyerLead.findById(first).populate("linked_website_lead_id", "name _id");
    if (!lead) return notFound("CRM lead not found");
    return ok({ lead: lead.toObject() });
  }

  return notFound("CRM leads route not found");
}

async function handleRequest(request: NextRequest) {
  const segments = getSegments(request);

  if (segments.length === 0) {
    return notFound("API route not found");
  }

  await connectDatabase();

  const [section, ...rest] = segments;

  try {
    if (section === "auth") return handleAuth(request, rest);
    if (section === "leads") return handleLeads(request, rest);
    if (section === "crm-leads") return handleCrmLeads(request, rest);
    if (section === "users") return handleUsers(request, rest);
    if (section === "stats") return handleStats(request);
    return notFound("API route not found");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unexpected server error", 500);
  }
}

export function GET(request: NextRequest) {
  return handleRequest(request);
}

export function POST(request: NextRequest) {
  return handleRequest(request);
}

export function PATCH(request: NextRequest) {
  return handleRequest(request);
}

export function PUT(request: NextRequest) {
  return handleRequest(request);
}

export function DELETE(request: NextRequest) {
  return handleRequest(request);
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
