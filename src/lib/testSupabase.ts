import { supabase } from './supabase'

export async function testSupabaseConnection() {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Supabase connection failed:', error)
    return
  }

  console.log('Supabase connected successfully:', data)
}