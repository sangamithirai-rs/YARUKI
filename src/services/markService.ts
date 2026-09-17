import { supabase } from '../lib/supabase'

export interface Mark {
  id: string
  user_id: string
  subject_id: string
  assessment_name: string
  marks_obtained: number
  max_marks: number
  assessment_date: string | null
  created_at: string
}

// Get marks for a subject
export async function getMarks(subjectId: string): Promise<Mark[]> {
  const { data, error } = await supabase
    .from('marks')
    .select('*')
    .eq('subject_id', subjectId)
    .order('assessment_date', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

// Add marks
export async function addMark(
  subjectId: string,
  assessmentName: string,
  marksObtained: number,
  maxMarks: number,
  assessmentDate?: string
): Promise<Mark> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User is not logged in')
  }

  const { data, error } = await supabase
    .from('marks')
    .insert({
      user_id: user.id,
      subject_id: subjectId,
      assessment_name: assessmentName,
      marks_obtained: marksObtained,
      max_marks: maxMarks,
      assessment_date: assessmentDate || null,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

// Update marks
export async function updateMark(
  id: string,
  updates: {
    assessment_name?: string
    marks_obtained?: number
    max_marks?: number
    assessment_date?: string
  }
): Promise<Mark> {
  const { data, error } = await supabase
    .from('marks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

// Delete marks
export async function deleteMark(id: string): Promise<void> {
  const { error } = await supabase
    .from('marks')
    .delete()
    .eq('id', id)

  if (error) {
    throw error
  }
}