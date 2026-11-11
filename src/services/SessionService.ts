import { supabase } from '../lib/supabase'

export interface StudySession {
  id: string
  user_id: string
  subject_id: string | null
  topic: string | null
  duration_minutes: number | null
  session_date: string
  completed: boolean
  created_at: string
}

export async function getStudySessions(): Promise<StudySession[]> {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .order('session_date', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function addStudySession(
  sessionDate: string,
  topic?: string,
  durationMinutes?: number,
  subjectId?: string
): Promise<StudySession> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User is not logged in')
  }

  const { data, error } = await supabase
    .from('study_sessions')
    .insert({
      user_id: user.id,
      subject_id: subjectId || null,
      topic: topic || null,
      duration_minutes: durationMinutes ?? null,
      session_date: sessionDate,
      completed: false,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateStudySession(
  id: string,
  updates: {
    topic?: string | null
    duration_minutes?: number | null
    session_date?: string
    subject_id?: string | null
    completed?: boolean
  }
): Promise<StudySession> {
  const { data, error } = await supabase
    .from('study_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteStudySession(id: string): Promise<void> {
  const { error } = await supabase
    .from('study_sessions')
    .delete()
    .eq('id', id)

  if (error) {
    throw error
  }
}