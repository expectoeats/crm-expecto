import mongoose, { type InferSchemaType, Schema, model, models } from "mongoose";

const lineItemSchema = new Schema(
  {
    name:         { type: String, required: true, trim: true },
    category:     { type: String, trim: true, default: "custom" }, // basic | premium | extra | project
    defaultPrice: { type: Number, default: 0 },
    price:        { type: Number, default: 0 },
    qty:          { type: Number, default: 1 },
    total:        { type: Number, default: 0 },
  },
  { _id: false }
);

const quotationSchema = new Schema(
  {
    quotationNumber: { type: String, required: false, unique: true, sparse: true, trim: true },

    // Client Details
    clientName:     { type: String, trim: true, default: "" },
    clientCompany:  { type: String, trim: true, default: "" },
    clientPhone:    { type: String, trim: true, default: "" },
    clientEmail:    { type: String, trim: true, default: "" },
    clientAddress:  { type: String, trim: true, default: "" },
    clientGst:      { type: String, trim: true, default: "" },

    // Optional link to existing lead
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", default: null },

    // Meta
    salesExecutive: { type: String, trim: true, default: "" },
    currency:       { type: String, default: "INR" },
    date:           { type: Date, default: Date.now },
    validTill:      { type: Date },

    // Project
    projectType: { type: String, trim: true, default: "" },

    // Line items
    lineItems: { type: [lineItemSchema], default: [] },

    // Pricing
    subtotal:       { type: Number, default: 0 },
    discountType:   { type: String, enum: ["percent", "fixed"], default: "fixed" },
    discountValue:  { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxRate:        { type: Number, default: 0 }, // percentage
    taxAmount:      { type: Number, default: 0 },
    grandTotal:     { type: Number, default: 0 },
    advancePercent: { type: Number, default: 50 },
    advanceAmount:  { type: Number, default: 0 },
    remainingAmount:{ type: Number, default: 0 },

    // Timeline & Terms
    timeline:     { type: String, default: "15 Days" },
    paymentTerms: { type: String, default: "50% Advance, 50% Before Delivery" },
    notes:        { type: [String], default: [] },
    termsAndConditions: { type: [String], default: [] },

    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected"],
      default: "draft",
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Auto-generate quotation number + validTill before save
quotationSchema.pre("validate", async function () {
  if (!this.quotationNumber) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `EX-${dateStr}-`;
    // Use the registered model directly from mongoose.models to avoid circular ref
    const Model = mongoose.models.Quotation as mongoose.Model<QuotationDocument>;
    if (Model) {
      const last = await Model.findOne(
        { quotationNumber: { $regex: `^${prefix}` } },
        { quotationNumber: 1 }
      ).sort({ quotationNumber: -1 }).lean();
      let seq = 1;
      if (last?.quotationNumber) {
        const parts = String(last.quotationNumber).split("-");
        seq = (parseInt(parts[parts.length - 1], 10) || 0) + 1;
      }
      this.quotationNumber = `${prefix}${String(seq).padStart(3, "0")}`;
    } else {
      // Fallback: timestamp-based unique number
      this.quotationNumber = `${prefix}${Date.now().toString().slice(-3)}`;
    }
  }
  // Auto-set validTill = date + 7 days
  if (!this.validTill && this.date) {
    const d = new Date(this.date as Date);
    d.setDate(d.getDate() + 7);
    this.validTill = d;
  }
});

export type QuotationDocument = InferSchemaType<typeof quotationSchema>;

export const Quotation =
  (models.Quotation as mongoose.Model<QuotationDocument>) ||
  model<QuotationDocument>("Quotation", quotationSchema);
