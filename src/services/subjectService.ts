import { supabase } from '../lib/supabase'

export interface Subject {
  id: string
  user_id: string
  name: string
  code: string | null
  credits: number | null
  created_at: string
}

// Get all subjects for the logged-in user
export async function getSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

// Add a new subject
export async function addSubject(
  name: string,
  code?: string,
  credits?: number
): Promise<Subject> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User is not logged in')
  }

  const { data, error } = await supabase
    .from('subjects')
    .insert({
      user_id: user.id,
      name,
      code: code || null,
      credits: credits ?? null,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

// Update a subject
export async function updateSubject(
  id: string,
  updates: {
    name?: string
    code?: string
    credits?: number
  }
): Promise<Subject> {
  const { data, error } = await supabase
    .from('subjects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

// Delete a subject
export async function deleteSubject(id: string): Promise<void> {
  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', id)

  if (error) {
    throw error
  }
}