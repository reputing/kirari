// Supabase browser client (stub).
//
// The shipped app runs entirely on the in-memory store in lib/useDesktop.ts
// so it can be demoed with zero backend. This file is the seam where real
// Supabase wiring drops in. To go live:
//
//   1. npm install @supabase/supabase-js
//   2. set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
//   3. apply supabase/schema.sql
//   4. uncomment the real client below and swap the action bodies in
//      useDesktop.ts for the Supabase calls noted in lib/supabase/README.md
//
// import { createClient } from "@supabase/supabase-js";
//
// export const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );

export const supabase = null as unknown as {
  // minimal shape used by the app; replace with the real SupabaseClient type
  channel: (name: string) => any;
  from: (table: string) => any;
  auth: any;
};
