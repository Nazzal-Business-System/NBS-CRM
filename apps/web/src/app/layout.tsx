import type { Metadata } from "next";
import { cookies } from "next/headers";
import { branding } from "@nbs-crm/shared";
import { Providers } from "@/components/providers";
import "./globals.css";
export async function generateMetadata(): Promise<Metadata> {
  const locale = (await cookies()).get(branding.localeCookie)?.value === "ar" ? "ar" : "en";
  return { title: branding.name[locale], description: branding.description[locale] };
}
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await cookies()).get(branding.localeCookie)?.value === "ar" ? "ar" : "en";
  return <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} suppressHydrationWarning><body><Providers locale={locale}>{children}</Providers></body></html>;
}
