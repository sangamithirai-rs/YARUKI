import { supabase } from '../lib/supabase'

export interface Assignment {
  id: string
  user_id: string
  subject_id: string | null
  title: string
  description: string | null
  due_date: string | null
  completed: boolean
  created_at: string
}

export async function getAssignments(): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .order('due_date', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function addAssignment(
  title: string,
  description?: string,
  dueDate?: string,
  subjectId?: string
): Promise<Assignment> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User is not logged in')
  }

  const { data, error } = await supabase
    .from('assignments')
    .insert({
      user_id: user.id,
      subject_id: subjectId || null,
      title,
      description: description || null,
      due_date: dueDate || null,
      completed: false,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateAssignment(
  id: string,
  updates: {
    title?: string
    description?: string | null
    due_date?: string | null
    subject_id?: string | null
    completed?: boolean
  }
): Promise<Assignment> {
  const { data, error } = await supabase
    .from('assignments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteAssignment(id: string): Promise<void> {
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', id)

  if (error) {
    throw error
  }
}