import { supabase } from '../lib/supabase'

export interface StudyPlan {
  id: string
  user_id: string
  title: string
  plan_date: string
  description: string | null
  ai_generated: boolean
  created_at: string
}

export async function getStudyPlans(): Promise<StudyPlan[]> {
  const { data, error } = await supabase
    .from('study_plans')
    .select('*')
    .order('plan_date', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function addStudyPlan(
  title: string,
  planDate: string,
  description?: string,
  aiGenerated = false
): Promise<StudyPlan> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User is not logged in')
  }

  const { data, error } = await supabase
    .from('study_plans')
    .insert({
      user_id: user.id,
      title,
      plan_date: planDate,
      description: description || null,
      ai_generated: aiGenerated,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateStudyPlan(
  id: string,
  updates: {
    title?: string
    plan_date?: string
    description?: string | null
    ai_generated?: boolean
  }
): Promise<StudyPlan> {
  const { data, error } = await supabase
    .from('study_plans')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteStudyPlan(id: string): Promise<void> {
  const { error } = await supabase
    .from('study_plans')
    .delete()
    .eq('id', id)

  if (error) {
    throw error
  }
}