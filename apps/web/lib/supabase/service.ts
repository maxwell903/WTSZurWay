/**
 * SUPABASE SERVICE-ROLE CLIENT -- SERVER ONLY.
 *
 * This module returns a Supabase client authenticated with the project's
 * service-role key, which BYPASSES Row-Level Security. Never import this
 * file from client-side code (components rendered in the browser, hooks,
 * or modules marked "use client"). Doing so would leak the service-role
 * key into the client bundle and grant any visitor full database access.
 *
 * Use only inside trusted server contexts: API route handlers, server
 * actions, scripts, and similar. The runtime guard below throws if this
 * function is ever invoked in a browser, but the right defense is not
 * importing this file from client code in the first place.
 */

import type { Database } from "@/types/database";
import { createClient } from "@supabase/supabase-js";

export function createServiceSupabaseClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "createServiceSupabaseClient() was called in a browser context. " +
        "This client uses the service-role key and must NEVER run client-side.",
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.",
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
