import { z } from "zod";

// Only supported email flows; tokens remain in memory and are never logged.
export const emailSessionSchema = z.object({
  access_token: z
    .string()
    .min(20)
    .max(8192)
    .regex(/^[A-Za-z0-9_.-]+$/),
  refresh_token: z
    .string()
    .min(10)
    .max(2048)
    .regex(/^[A-Za-z0-9_-]+$/),
  type: z.enum(["invite", "recovery"]),
});
export type EmailSession = z.infer<typeof emailSessionSchema>;
export function parseEmailFragment(fragment: string): EmailSession | null {
  if (fragment.length > 12000) return null;
  const params = new URLSearchParams(fragment.replace(/^#/, ""));
  if (params.has("error") || params.has("error_code")) return null;
  for (const key of ["access_token", "refresh_token", "type"])
    if (params.getAll(key).length !== 1) return null;
  const parsed = emailSessionSchema.safeParse(Object.fromEntries(params));
  return parsed.success ? parsed.data : null;
}
