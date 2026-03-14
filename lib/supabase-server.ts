import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET ?? "resumes";

if (!supabaseUrl || !supabaseServiceRoleKey) {
  // We intentionally avoid throwing here so that build can still succeed;
  // upload endpoints should validate and fail gracefully at runtime.
  console.warn(
    "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

export const SUPABASE_BUCKET = supabaseBucket;

export const supabaseServerClient =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false
        }
      })
    : null;

