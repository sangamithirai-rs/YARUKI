// YARUKI shared database types
// Keep these types aligned with the Supabase database schema.

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Subject {
  id: string
  user_id: string
  name: string
  code: string | null
  credits: number | null
  created_at: string
}

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

export interface Exam {
  id: string
  user_id: string
  subject_id: string | null
  title: string
  exam_date: string
  syllabus: string | null
  created_at: string
}

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

export interface StudyMaterial {
  id: string
  user_id: string
  subject_id: string | null
  title: string
  file_name: string | null
  file_path: string | null
  file_type: string | null
  created_at: string
}

export interface StudyPlan {
  id: string
  user_id: string
  title: string
  plan_date: string
  description: string | null
  ai_generated: boolean
  created_at: string
}
