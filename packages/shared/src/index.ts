import { z } from "zod";
export * from "./branding.js";
export * from "./permissions.js";
export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const healthSchema = z.object({ status: z.literal("ok"), service: z.string() });
export type Health = z.infer<typeof healthSchema>;
export interface ApiErrorBody { code: string; message: string; requestId: string }
export type ApiResponse<T> = { data: T } | { error: ApiErrorBody };
