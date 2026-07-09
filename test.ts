import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env", "utf-8");
const url = env.match(/VITE_SUPABASE_URL="(.*?)"/)?.[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY="(.*?)"/)?.[1] || env.match(/VITE_SUPABASE_ANON_KEY="(.*?)"/)?.[1];

const supabase = createClient(url!, key!);

async function run() {
  const { data: sections } = await supabase.from("sections").select("*").limit(1);
  console.log("Sections columns:", sections ? Object.keys(sections[0] || {}) : "none");
  
  const { data: students } = await supabase.from("students").select("*").limit(1);
  console.log("Students columns:", students ? Object.keys(students[0] || {}) : "none");
}
run();
