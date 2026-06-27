import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://hobjwwzcixxowirsesir.supabase.co";
const supabaseKey = "sb_publishable_Ldx-kYx3_avYHXsR8danow_2exTZvYz";

export const supabase = createClient(supabaseUrl, supabaseKey);