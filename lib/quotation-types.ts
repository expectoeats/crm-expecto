// Shared quotation types — imported by both builder and preview to avoid circular deps

export type LineItem = {
  name: string;
  category: string;
  defaultPrice: number;
  price: number;
  qty: number;
  total: number;
};

export type QuotationData = {
  _id?: string;
  quotationNumber?: string;
  clientName: string;
  clientCompany: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  clientGst: string;
  salesExecutive: string;
  currency: string;
  date: string;
  validTill: string;
  projectType: string;
  lineItems: LineItem[];
  subtotal: number;
  discountType: "percent" | "fixed";
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  advancePercent: number;
  advanceAmount: number;
  remainingAmount: number;
  timeline: string;
  paymentTerms: string;
  notes: string[];
  termsAndConditions: string[];
  status: "draft" | "sent" | "accepted" | "rejected";
};
