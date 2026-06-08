import mongoose, { type InferSchemaType, Schema, model, models } from "mongoose";

const callLogSchema = new Schema(
  {
    calledBy: { type: Schema.Types.ObjectId, ref: "User" },
    calledAt: { type: Date, default: Date.now },
    connected: { type: Boolean, default: false },
    duration: { type: String },
    outcome: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const leadSchema = new Schema(
  {
    // Core identity — name OR business_name (Google Maps scraper uses business_name)
    name: { type: String, trim: true },
    business_name: { type: String, trim: true }, // Google Maps scraper field
    ownerName: { type: String, trim: true },
    phone: { type: String, required: [true, "Phone is required"], trim: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    city: { type: String, trim: true },

    // Niche — niche OR category (Google Maps scraper uses category)
    niche: { type: String, trim: true },
    category: { type: String, trim: true }, // Google Maps scraper field

    businessDescription: { type: String, trim: true },

    // Website — websiteStatus + websiteUrl OR has_website + website_url
    websiteStatus: { type: String, enum: ["no_website", "has_website", "website_is_bad"], default: "no_website" },
    websiteUrl: { type: String, trim: true },
    has_website: { type: Boolean, default: false }, // Google Maps scraper field
    website_url: { type: String, trim: true },      // Google Maps scraper field

    weakPoints: {
      type: [String],
      default: [],
    },
    strongHook: { type: String, trim: true },
    suggestedService: { type: String, trim: true },
    callScript: { type: String, trim: true },
    source: { type: String, default: "google_research", trim: true },

    // Google Maps scraped data
    rating: { type: Number, default: null },
    review_count: { type: Number, default: null }, // Google Maps scraper field
    reviewCount: { type: Number, default: null },
    score: { type: Number, default: null },
    pitch_message: { type: String, trim: true },   // Google Maps scraper field
    pitchMessage: { type: String, trim: true },
    is_generic: { type: Boolean, default: false }, // Google Maps scraper field
    isGeneric: { type: Boolean, default: false },
    hasWebsite: { type: Boolean, default: false },

    leadQuality: { type: String, enum: ["hot", "warm", "cold"], default: "warm" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: {
      type: String,
      enum: ["new", "called", "interested", "callback", "proposal_sent", "closed_won", "closed_lost", "not_interested"],
      default: "new",
    },
    callLogs: { type: [callLogSchema], default: [] },
    followUpDate: { type: Date, default: null },
    followUpNote: { type: String, trim: true, default: "" },
  },
  {
    timestamps: true,
    // Allow fields not in schema (scraper may send extra fields)
    strict: false,
  }
);

leadSchema.index({ assignedTo: 1, status: 1, followUpDate: 1 });

export type LeadDocument = InferSchemaType<typeof leadSchema>;

export const Lead = (models.Lead as mongoose.Model<LeadDocument>) || model<LeadDocument>("Lead", leadSchema);
