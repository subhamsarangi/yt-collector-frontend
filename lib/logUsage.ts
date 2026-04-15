import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Fire-and-forget usage event logger.
 * Call from any server-side route — never throws.
 */
export async function logUsage(
  event: string,
  meta: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabaseAdmin.from("usage_logs").insert({ event, meta });
  } catch {
    // non-fatal — never block the main flow
  }
}
