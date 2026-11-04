export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
/** No backend configured → run entirely in the browser with sample data so the product can be tried and tested. */
export const DEMO: boolean = __DEMO__
export const JOB_WINDOW_LABEL = 'last 2 days'
export const NEXT_DROP_UTC_HOUR = 1.5 // matches the 01:30 UTC (7:00 AM IST) GitHub Action
