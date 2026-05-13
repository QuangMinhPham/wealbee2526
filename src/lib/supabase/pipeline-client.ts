import { createClient } from "@supabase/supabase-js";

export const pipelineSupabase = createClient(
  "https://fkwsvyzguehtsjpwmttb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrd3N2eXpndWVodHNqcHdtdHRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MjczNTYsImV4cCI6MjA5MTAwMzM1Nn0.5GeYbx69S0n3R5FRhw8jlgTqL0GPVl2SsKUSNOCpiSw"
);
