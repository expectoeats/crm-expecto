import mongoose, { type InferSchemaType, Schema, model, models } from "mongoose";

const crmContactHistorySchema = new Schema(
  {
    action: { type: String, required: true },
    note:   { type: String, trim: true, default: "" },
    at:     { type: Date, default: Date.now },
  },
  { _id: true }
);

const crmBuyerLeadSchema = new Schema(
  {
    // Core identity
    name:          { type: String, trim: true },
    business_name: { type: String, trim: true },
    ownerName:     { type: String, trim: true },
    phone:         { type: String, required: [true, "Phone is required"], trim: true },
    whatsapp:      { type: String, trim: true },
    email:         { type: String, trim: true, lowercase: true },
    city:          { type: String, trim: true },

    niche:    { type: String, trim: true },
    category: { type: String, trim: true },

    // CRM scoring
    crm_lead_score: { type: Number, default: null },

    // Status — "blocked_needs_website" means the website deal is still in progress
    status: {
      type: String,
      enum: [
        "new", "reached_out", "in_talks", "interested",
        "converted", "not_interested", "follow_up",
        "blocked_needs_website",
      ],
      default: "new",
    },

    // Link back to the website lead in the main leads collection
    linked_website_lead_id: { type: Schema.Types.ObjectId, ref: "Lead", default: null },

    // Assigned employee
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },

    followUpDate: { type: Date, default: null },
    followUpNote: { type: String, trim: true, default: "" },

    contact_history: { type: [crmContactHistorySchema], default: [] },
  },
  {
    timestamps: true,
    collection: "crm_buyer_leads",
    strict: false,
  }
);

crmBuyerLeadSchema.index({ status: 1 });
crmBuyerLeadSchema.index({ linked_website_lead_id: 1 });

export type CrmBuyerLeadDocument = InferSchemaType<typeof crmBuyerLeadSchema>;

export const CrmBuyerLead =
  (models.CrmBuyerLead as mongoose.Model<CrmBuyerLeadDocument>) ||
  model<CrmBuyerLeadDocument>("CrmBuyerLead", crmBuyerLeadSchema);
