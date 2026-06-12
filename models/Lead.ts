import mongoose, { type InferSchemaType, Schema, model, models } from "mongoose";

const contactHistorySchema = new Schema(
  {
    action: { type: String, enum: ["called", "whatsapped"], required: true },
    by_name: { type: String, trim: true },
    by_id:   { type: String },
    at:      { type: Date, default: Date.now },
    note:    { type: String, trim: true, default: "" },
  },
  { _id: true }
);

const callLogSchema = new Schema(
  {
    calledBy:  { type: Schema.Types.ObjectId, ref: "User" },
    calledAt:  { type: Date, default: Date.now },
    connected: { type: Boolean, default: false },
    duration:  { type: String },
    outcome:   { type: String, trim: true },
    notes:     { type: String, trim: true },
    via:       { type: String, enum: ["call", "whatsapp"], default: "call" },
  },
  { _id: false }
);

const leadSchema = new Schema(
  {
    // Core identity
    name:          { type: String, trim: true },
    business_name: { type: String, trim: true },
    ownerName:     { type: String, trim: true },
    phone:         { type: String, required: [true, "Phone is required"], trim: true },
    whatsapp:      { type: String, trim: true },
    email:         { type: String, trim: true, lowercase: true },
    city:          { type: String, trim: true },

    // Niche
    niche:    { type: String, trim: true },
    category: { type: String, trim: true },

    businessDescription: { type: String, trim: true },

    // Website
    websiteStatus: { type: String, enum: ["no_website", "has_website", "website_is_bad"], default: "no_website" },
    websiteUrl:    { type: String, trim: true },
    has_website:   { type: Boolean, default: false },
    website_url:   { type: String, trim: true },

    weakPoints:       { type: [String], default: [] },
    strongHook:       { type: String, trim: true },
    suggestedService: { type: String, trim: true },
    callScript:       { type: String, trim: true },
    source:           { type: String, default: "google_research", trim: true },

    // Google Maps scraped fields
    rating:       { type: Number, default: null },
    review_count: { type: Number, default: null },
    reviewCount:  { type: Number, default: null },
    score:        { type: Number, default: null },
    pitch_message: { type: String, trim: true },
    pitchMessage:  { type: String, trim: true },
    is_generic:    { type: Boolean, default: false },
    isGeneric:     { type: Boolean, default: false },
    hasWebsite:    { type: Boolean, default: false },

    leadQuality: { type: String, enum: ["hot", "warm", "cold"], default: "warm" },
    assignedTo:  { type: Schema.Types.ObjectId, ref: "User", default: null },

    // Updated status enum with new values
    status: {
      type: String,
      enum: [
        "new", "reached_out", "in_talks", "interested",
        "converted", "not_interested", "follow_up",
        // legacy
        "called", "callback", "proposal_sent", "closed_won", "closed_lost",
      ],
      default: "new",
    },

    // New: contact history (Feature 1)
    contact_history:    { type: [contactHistorySchema], default: [] },
    last_contacted_at:  { type: Date, default: null },
    last_contacted_by:  { type: String, default: null },
    last_action:        { type: String, enum: ["called", "whatsapped", null], default: null },

    // Legacy call logs
    callLogs: { type: [callLogSchema], default: [] },

    followUpDate: { type: Date, default: null },
    followUpNote: { type: String, trim: true, default: "" },
  },
  {
    timestamps: true,
    strict: false,
  }
);

leadSchema.index({ assignedTo: 1, status: 1, followUpDate: 1 });
leadSchema.index({ updatedAt: -1 });
leadSchema.index({ last_contacted_at: -1 });

// Smart scoring indexes
leadSchema.index({ rating: -1 });
leadSchema.index({ review_count: -1 });
leadSchema.index({ has_website: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ createdAt: -1 });
// Compound index for hot lead query
leadSchema.index({ has_website: 1, rating: -1, review_count: -1 });

export type LeadDocument = InferSchemaType<typeof leadSchema>;

export const Lead = (models.Lead as mongoose.Model<LeadDocument>) || model<LeadDocument>("Lead", leadSchema);
