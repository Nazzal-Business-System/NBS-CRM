import { z } from "zod";
import type { NextConfig } from "next";
const parsed = z.url().refine(value => /^https?:/.test(value)).safeParse(process.env.API_URL ?? "http://127.0.0.1:4000");
if (!parsed.success) throw new Error("Invalid API_URL configuration.");
const config: NextConfig = {
  poweredByHeader: false,
  async rewrites() { return [{ source: "/api/:path*", destination: `${parsed.data.replace(/\/$/, "")}/api/:path*` }]; },
};
export default config;
