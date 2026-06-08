import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectDatabase } from "@/lib/db";
import { Lead, User } from "@/models";
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
  const filter: Record<string, unknown> = {};

  const status = searchParams.get("status");
  const niche = searchParams.get("niche");
  const assignedTo = searchParams.get("assignedTo");
  const websiteStatus = searchParams.get("websiteStatus");
  const leadQuality = searchParams.get("leadQuality");
  const city = searchParams.get("city");
  const search = searchParams.get("search");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (status) filter.status = status;
  if (niche) filter.$or = [...(filter.$or as unknown[] ?? []), { niche }, { category: niche }];
  if (assignedTo) filter.assignedTo = assignedTo;
  if (websiteStatus) filter.websiteStatus = websiteStatus;
  if (leadQuality) filter.leadQuality = leadQuality;
  if (city) filter.city = new RegExp(city, "i");
  if (search) {
    filter.$or = [
      { name: new RegExp(search, "i") },
      { business_name: new RegExp(search, "i") },
      { phone: new RegExp(search, "i") },
    ];
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) (filter.createdAt as Record<string, Date>).$gte = new Date(from);
    if (to) (filter.createdAt as Record<string, Date>).$lte = new Date(to);
  }

  return filter;
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

      const [items, total] = await Promise.all([
        Lead.find(filter).populate("assignedTo").sort({ followUpDate: 1, status: 1, createdAt: -1 }).skip(skip).limit(limit),
        Lead.countDocuments(filter),
      ]);

      return ok({
        leads: normalizeLeads(items.map((doc) => doc.toObject())),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    }

    return methodNotAllowed(["GET", "POST"]);
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

    // Aggregate unique niches from both `niche` and `category` fields
    const [nicheGroups, categoryGroups] = await Promise.all([
      Lead.aggregate([
        { $match: { niche: { $exists: true, $nin: [null, ""] } } },
        { $group: { _id: "$niche" } },
        { $sort: { _id: 1 } },
      ]),
      Lead.aggregate([
        { $match: { category: { $exists: true, $nin: [null, ""] } } },
        { $group: { _id: "$category" } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const allNiches = Array.from(
      new Set([
        ...nicheGroups.map((g: { _id: string }) => g._id as string),
        ...categoryGroups.map((g: { _id: string }) => g._id as string),
      ])
    ).filter(Boolean).sort();

    return ok({ niches: allNiches });
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

    const employees = await User.find({ role: "employee" }).lean();
    const allLeads = await Lead.find().lean();

    const countsByEmployee = new Map<
      string,
      {
        totalLeads: number;
        activeLeads: number;
        calledLeads: number;
        interestedLeads: number;
        closedLeads: number;
      }
    >();

    for (const lead of allLeads) {
      if (!lead.assignedTo) continue;
      const key = lead.assignedTo.toString();
      const existing = countsByEmployee.get(key) ?? {
        totalLeads: 0,
        activeLeads: 0,
        calledLeads: 0,
        interestedLeads: 0,
        closedLeads: 0,
      };

      existing.totalLeads += 1;
      if (["new", "called", "interested", "callback", "proposal_sent"].includes(lead.status)) {
        existing.activeLeads += 1;
      }
      if (lead.status === "called") existing.calledLeads += 1;
      if (lead.status === "interested") existing.interestedLeads += 1;
      if (["closed_won", "closed_lost"].includes(lead.status)) existing.closedLeads += 1;
      countsByEmployee.set(key, existing);
    }

    return ok({
      employees: employees.map((employee) => {
        const stats = countsByEmployee.get(employee._id.toString());
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

  const [totalLeads, statusGroups, nicheGroups, employeeGroups, wonCount, employeeCount] = await Promise.all([
    Lead.countDocuments(),
    Lead.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Lead.aggregate([{ $group: { _id: "$niche", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Lead.aggregate([
      { $lookup: { from: "users", localField: "assignedTo", foreignField: "_id", as: "employee" } },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
      { $group: { _id: "$assignedTo", name: { $first: "$employee.name" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Lead.countDocuments({ status: "closed_won" }),
    User.countDocuments({ role: "employee", isActive: true }),
  ]);

  const { start, end } = getIstDayRange();
  const todayFollowUps = await Lead.countDocuments({
    followUpDate: { $gte: start, $lte: end },
  });

  const conversionRate = totalLeads === 0 ? 0 : Math.round((wonCount / totalLeads) * 100);

  return ok({
    summary: {
      totalLeads,
      todayFollowUps,
      hotLeads: await Lead.countDocuments({ leadQuality: "hot" }),
      closedWon: wonCount,
      conversionRate,
      employees: employeeCount,
    },
    leadsByStatus: statusGroups,
    leadsByNiche: nicheGroups,
    leadsByEmployee: employeeGroups,
  });
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
