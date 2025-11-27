export function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      `Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.

You can find these values in your Supabase project settings:
https://supabase.com/dashboard/project/_/settings/api

Add them to the "Vars" section in the v0 sidebar.`
    )
  }

  return { supabaseUrl, supabaseAnonKey }
}
