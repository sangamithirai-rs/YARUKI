import { supabase } from '../lib/supabase'

export interface Exam {
  id: string
  user_id: string
  subject_id: string | null
  title: string
  exam_date: string
  syllabus: string | null
  created_at: string
}

export async function getExams(): Promise<Exam[]> {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .order('exam_date', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function addExam(
  title: string,
  examDate: string,
  subjectId?: string,
  syllabus?: string
): Promise<Exam> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User is not logged in')
  }

  const { data, error } = await supabase
    .from('exams')
    .insert({
      user_id: user.id,
      subject_id: subjectId || null,
      title,
      exam_date: examDate,
      syllabus: syllabus || null,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateExam(
  id: string,
  updates: {
    title?: string
    exam_date?: string
    subject_id?: string | null
    syllabus?: string | null
  }
): Promise<Exam> {
  const { data, error } = await supabase
    .from('exams')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteExam(id: string): Promise<void> {
  const { error } = await supabase
    .from('exams')
    .delete()
    .eq('id', id)

  if (error) {
    throw error
  }
}