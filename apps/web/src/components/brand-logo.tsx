"use client";
import { branding } from "@nbs-crm/shared";
import { useLocale } from "./providers";

export function BrandLogo() {
  const { locale } = useLocale();
  return (
    <div className="flex items-center gap-3" aria-label={branding.name[locale]}>
      <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">{branding.monogram}</span>
      <span className="text-lg font-semibold tracking-tight">{branding.name[locale]}</span>
    </div>
  );
}
