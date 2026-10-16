// Client-facing identity is centralized here; package/workspace names are internal.
export const branding = {
  monogram: "A",
  name: { en: "Acme CRM", ar: "أكمي CRM" },
  welcome: { en: "Welcome to Acme CRM", ar: "مرحبًا بك في أكمي CRM" },
  footer: { en: "Acme CRM · Workspace foundation", ar: "أكمي CRM · أساس مساحة العمل" },
  description: { en: "A flexible customer relationship workspace.", ar: "مساحة مرنة لإدارة علاقات العملاء." },
  localeCookie: "crm_locale",
} as const;
