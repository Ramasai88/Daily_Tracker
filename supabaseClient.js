import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://ljnqizdmoathaljaurmz.supabase.co' 
const supabaseKey = 'sb_publishable_GHPG3cUh76lRKSs0TAY69A_CJHHAfuC'

export const supabase = createClient(supabaseUrl, supabaseKey)