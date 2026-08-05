// ─── Company Details ────────────────────────────────────────────────────────
export const COMPANY = {
  name:    "Expecto Digital",
  email:   "hello@expecto.online",
  phone:   "+91 87072 24376",
  gst:     "",
  address: "",
} as const;

// ─── Payment Details ────────────────────────────────────────────────────────
export const PAYMENT = {
  upiId:         "adarshwebofficial@oksbi",
  accountName:   "Adarsh Singh",
  bankName:      "State Bank of India",
  accountNumber: "413972415741",
  ifsc:          "SBIN0000017",
  mobile:        "+91 87072 24376",
} as const;

// ─── Default T&C ────────────────────────────────────────────────────────────
export const DEFAULT_TERMS = [
  "Quotation is valid for 7 days from the issue date.",
  "50% advance payment is required before work begins.",
  "Remaining payment must be completed before final delivery/deployment.",
  "This quotation includes up to 2 revision rounds. Additional revisions may incur extra charges.",
  "Any new features or scope changes requested after project approval will be quoted separately.",
  "The delivery timeline starts after advance payment and all required content (text, images, logo) are received.",
  "Domain and hosting charges are non-refundable once purchased.",
  "One month of free technical support is included after project delivery (if applicable).",
  "The source code will be provided only if it is explicitly included in the quotation.",
  "Full ownership of the website is transferred to the client after full payment is received.",
];

// ─── Default Notes ───────────────────────────────────────────────────────────
export const DEFAULT_NOTES = [
  "Free 1 month support after delivery.",
  "Training session included.",
];

// ─── Project Types ──────────────────────────────────────────────────────────
export type ServiceItem = {
  name: string;
  category: string;
  defaultPrice: number;
  price: number;
  qty: number;
};

export const PROJECT_TYPES: Array<{ label: string; price: number }> = [
  { label: "Portfolio Website",  price: 5000  },
  { label: "Business Website",   price: 8000  },
  { label: "Ecommerce Website",  price: 25000 },
  { label: "LMS",                price: 40000 },
  { label: "CRM",                price: 50000 },
  { label: "ERP",                price: 75000 },
  { label: "Custom Website",     price: 0     },
];

// ─── Feature Sections ───────────────────────────────────────────────────────
export type FeatureDef = {
  name: string;
  defaultPrice: number;
  category: string;
};

export const BASIC_FEATURES: FeatureDef[] = [
  { name: "Responsive Design",  defaultPrice: 0,    category: "basic" },
  { name: "Contact Form",       defaultPrice: 0,    category: "basic" },
  { name: "WhatsApp Button",    defaultPrice: 500,  category: "basic" },
  { name: "SEO Friendly",       defaultPrice: 0,    category: "basic" },
  { name: "Fast Loading",       defaultPrice: 0,    category: "basic" },
  { name: "SSL Setup",          defaultPrice: 0,    category: "basic" },
  { name: "Social Media Links", defaultPrice: 500,  category: "basic" },
  { name: "Google Map",         defaultPrice: 500,  category: "basic" },
  { name: "Gallery",            defaultPrice: 1000, category: "basic" },
  { name: "Testimonials",       defaultPrice: 500,  category: "basic" },
  { name: "FAQ",                defaultPrice: 500,  category: "basic" },
  { name: "Blog",               defaultPrice: 3000, category: "basic" },
  { name: "Admin Panel",        defaultPrice: 5000, category: "basic" },
  { name: "CMS",                defaultPrice: 4000, category: "basic" },
];

export const PREMIUM_FEATURES: FeatureDef[] = [
  { name: "Login System",       defaultPrice: 3000,  category: "premium" },
  { name: "Payment Gateway",    defaultPrice: 3000,  category: "premium" },
  { name: "Email Notifications",defaultPrice: 1500,  category: "premium" },
  { name: "OTP Login",          defaultPrice: 2000,  category: "premium" },
  { name: "AI Integration",     defaultPrice: 10000, category: "premium" },
  { name: "Chat System",        defaultPrice: 3000,  category: "premium" },
  { name: "Dashboard",          defaultPrice: 5000,  category: "premium" },
  { name: "Analytics",          defaultPrice: 1000,  category: "premium" },
  { name: "Multi Language",     defaultPrice: 3000,  category: "premium" },
  { name: "Dark Mode",          defaultPrice: 1000,  category: "premium" },
  { name: "API Integration",    defaultPrice: 5000,  category: "premium" },
  { name: "Booking System",     defaultPrice: 5000,  category: "premium" },
  { name: "Inventory",          defaultPrice: 8000,  category: "premium" },
  { name: "Invoice Module",     defaultPrice: 5000,  category: "premium" },
  { name: "Role Management",    defaultPrice: 4000,  category: "premium" },
];

export const EXTRA_SERVICES: FeatureDef[] = [
  { name: "Domain (1 Year)",          defaultPrice: 800,  category: "extra" },
  { name: "Hosting (1 Year)",         defaultPrice: 1500, category: "extra" },
  { name: "Business Email",           defaultPrice: 600,  category: "extra" },
  { name: "Logo Design",              defaultPrice: 1000, category: "extra" },
  { name: "Banner Design",            defaultPrice: 800,  category: "extra" },
  { name: "SEO Package",              defaultPrice: 3000, category: "extra" },
  { name: "Google Analytics Setup",   defaultPrice: 0,    category: "extra" },
  { name: "Google Search Console",    defaultPrice: 0,    category: "extra" },
  { name: "Monthly Maintenance",      defaultPrice: 1500, category: "extra" },
];
