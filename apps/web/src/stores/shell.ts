import { create } from "zustand";
export const useShell = create<{ mobileOpen: boolean; setMobileOpen: (open: boolean) => void }>(set => ({ mobileOpen: false, setMobileOpen: mobileOpen => set({ mobileOpen }) }));
