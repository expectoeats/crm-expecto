import mongoose, { type InferSchemaType, Schema, model, models } from "mongoose";

const callLogSchema = new Schema(
  {
    calledBy: { type: Schema.Types.ObjectId, ref: "User" },
    calledAt: { type: Date, default: Date.now },
    duration: { type: String },
    outcome: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const leadSchema = new Schema(
  {
    name: { type: String, required: [true, "Lead name is required"], trim: true },
    ownerName: { type: String, trim: true },
    phone: { type: String, required: [true, "Phone is required"], trim: true },
    email: { type: String, trim: true, lowercase: true },
    city: { type: String, trim: true },
    niche: { type: String, required: [true, "Niche is required"], trim: true },
    businessDescription: { type: String, trim: true },
    websiteStatus: { type: String, enum: ["no_website", "has_website", "website_is_bad"], default: "no_website" },
    websiteUrl: { type: String, trim: true },
    weakPoints: {
      type: [String],
      default: [],
      validate: [(value: string[]) => Array.isArray(value), "Weak points must be an array"],
    },
    strongHook: { type: String, trim: true },
    suggestedService: { type: String, trim: true },
    callScript: { type: String, trim: true },
    source: { type: String, default: "google_research", trim: true },
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
  { timestamps: true }
);

leadSchema.index({ name: "text", phone: "text", ownerName: "text", city: "text", niche: "text" });
leadSchema.index({ assignedTo: 1, status: 1, followUpDate: 1 });

export type LeadDocument = InferSchemaType<typeof leadSchema>;

export const Lead = (models.Lead as mongoose.Model<LeadDocument>) || model<LeadDocument>("Lead", leadSchema);

