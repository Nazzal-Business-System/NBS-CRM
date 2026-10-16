"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { ArrowUpRight, Check, Globe2, LayoutDashboard, Menu, Moon, ShieldCheck, SlidersHorizontal, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers";
import { messages } from "@/i18n/messages";
import { useShell } from "@/stores/shell";
import { BrandLogo } from "@/components/brand-logo";

export function AppShell() {
  const { locale, switchLocale } = useLocale();
  const t = messages[locale];
  const { resolvedTheme, setTheme } = useTheme();
  const { mobileOpen, setMobileOpen } = useShell();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (mobileOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [mobileOpen]);

  const brand = <div className="w-full min-w-0">
    <BrandLogo />
    <p className="mt-3 text-xs font-semibold leading-relaxed text-muted-foreground">{t.product}</p>
  </div>;
  const navigation = <nav aria-label={t.workspace} className="mt-12">
    <p className="px-3 text-xs font-semibold tracking-wider text-muted-foreground">{t.workspace}</p>
    <Link href="/" aria-current="page" onClick={() => setMobileOpen(false)} className="mt-3 flex items-center gap-3 rounded-xl bg-primary/10 px-3 py-3 text-sm font-semibold text-primary"><LayoutDashboard size={18} />{t.overview}</Link>
  </nav>;
  const cards = [
    { Icon: SlidersHorizontal, title: t.note, text: t.noteText },
    { Icon: Globe2, title: t.infrastructure, text: t.infrastructureText },
    { Icon: ShieldCheck, title: t.security, text: t.securityText },
  ];

  return <div className="min-h-dvh">
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-card focus:p-4">{t.skip}</a>
    <aside className="fixed inset-y-0 start-0 hidden w-64 flex-col border-e border-border bg-card p-6 lg:flex">
      {brand}{navigation}
      <div className="mt-auto rounded-xl border border-border p-4"><span className="text-xs font-semibold">{t.foundation}</span><p className="mt-2 text-xs leading-5 text-muted-foreground">{t.footer}</p></div>
    </aside>
    <dialog ref={dialog} onCancel={() => setMobileOpen(false)} onClose={() => { setMobileOpen(false); opener.current?.focus(); }} onClick={event => { if (event.target === event.currentTarget) setMobileOpen(false); }} aria-label={t.workspace} className="fixed inset-y-0 start-0 m-0 h-dvh max-h-none w-72 border-0 bg-card p-6 text-foreground backdrop:bg-black/50">
      <div className="flex items-start gap-3">{brand}<Button variant="ghost" size="icon" className="shrink-0" aria-label={t.close} onClick={() => setMobileOpen(false)}><X size={18} /></Button></div>{navigation}
    </dialog>
    <div className="lg:ps-64">
      <header className="flex h-20 items-center justify-between border-b border-border bg-card px-5 sm:px-10">
        <div className="flex items-center gap-3"><Button ref={opener} variant="ghost" size="icon" className="lg:hidden" aria-label={t.menu} aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={20} /></Button><span className="text-sm font-medium">{t.overview}</span></div>
        <div className="flex items-center gap-2"><Button variant="ghost" onClick={switchLocale}><Globe2 size={16} />{t.language}</Button><Button variant="outline" size="icon" aria-label={t.theme} onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}><Sun className="hidden size-4 dark:block" /><Moon className="size-4 dark:hidden" /></Button></div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-5 py-10 sm:px-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t.welcome}</p>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl"><h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{t.title}</h1><p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">{t.description}</p></div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-medium text-primary"><Check size={14} />{t.status}</span>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">{cards.map(({ Icon, title, text }) => <section key={title} className="rounded-2xl border border-border bg-card p-6"><Icon className="size-6 text-primary" /><h2 className="mt-7 font-semibold">{title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p></section>)}</div>
        <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground"><ArrowUpRight size={14} className="rtl:-rotate-90" />{t.footer}</div>
      </main>
    </div>
  </div>;
}
