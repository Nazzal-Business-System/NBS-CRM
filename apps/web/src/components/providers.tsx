"use client";
import { useState, createContext, useContext } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { branding, type Locale } from "@nbs-crm/shared";
const LocaleContext = createContext<{ locale: Locale; switchLocale: () => void }>({ locale: "en", switchLocale: () => {} });
export function Providers({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }));
  function switchLocale() {
    document.cookie = `${branding.localeCookie}=${locale === "en" ? "ar" : "en"}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.location.reload();
  }
  return <ThemeProvider attribute="class" defaultTheme="system" enableSystem><QueryClientProvider client={client}><LocaleContext.Provider value={{ locale, switchLocale }}>{children}</LocaleContext.Provider></QueryClientProvider></ThemeProvider>;
}
export const useLocale = () => useContext(LocaleContext);
