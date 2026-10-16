import { branding } from "@nbs-crm/shared";
export const messages = {
  en: {
    product: "CRM Professional", workspace: "Workspace", overview: "Overview", foundation: "Foundation",
    title: "A clear foundation for every relationship.",
    description: "Your CRM workspace is ready for its next chapter. Sales workflows and customer modules will be introduced in the next phase.",
    status: "Foundation ready", infrastructure: "Built for your business", infrastructureText: "An independent deployment with a shared product foundation.",
    language: "العربية", theme: "Switch color theme", menu: "Open navigation", close: "Close navigation",
    welcome: branding.welcome.en, note: "Workspace setup", noteText: "Configure your local environment to begin development.",
    security: "Private by design", securityText: "Identity, sessions, and access controls form the secure workspace foundation.",
    footer: branding.footer.en, skip: "Skip to content",
  },
  ar: {
    product: "إدارة علاقات العملاء الاحترافية", workspace: "مساحة العمل", overview: "نظرة عامة", foundation: "الأساس",
    title: "أساس واضح لكل علاقة.",
    description: "مساحة عملك جاهزة للمرحلة القادمة. ستُضاف مسارات المبيعات ووحدات العملاء في المرحلة التالية.",
    status: "الأساس جاهز", infrastructure: "مصمم لأعمالك", infrastructureText: "نشر مستقل قائم على أساس موحد للمنتج.",
    language: "English", theme: "تغيير المظهر", menu: "فتح التنقل", close: "إغلاق التنقل",
    welcome: branding.welcome.ar, note: "إعداد مساحة العمل", noteText: "اضبط البيئة المحلية لبدء التطوير.",
    security: "الخصوصية أساس التصميم", securityText: "الهوية والجلسات وضوابط الوصول هي أساس مساحة العمل الآمنة.",
    footer: branding.footer.ar, skip: "انتقل إلى المحتوى",
  },
} as const;
