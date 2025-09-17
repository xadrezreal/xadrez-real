import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aijnllgwhekizfehhmuc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpam5sbGd3aGVraXpmZWhobXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MTEwMTIsImV4cCI6MjA3MDE4NzAxMn0.6fz3yyoZSQI5mcapL4AdrsZTzQcJydrXKW1YAOLX3wM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);