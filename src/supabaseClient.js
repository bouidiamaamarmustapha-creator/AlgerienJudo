import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aolsbxfulbvpiobqqsao.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvbHNieGZ1bGJ2cGlvYnFxc2FvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5Njc4MjIsImV4cCI6MjA3MTU0MzgyMn0.gyDU9a8AvdOjkqTAxw6-p2F4DO3BlswxDXGTe-C6NVM'
export const supabase = createClient(supabaseUrl, supabaseKey)
