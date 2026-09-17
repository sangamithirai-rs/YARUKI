import { supabase } from '../lib/supabase'

const BUCKET_NAME = 'study-materials'

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

// Get user's materials
export async function getMaterials(): Promise<StudyMaterial[]> {
  const { data, error } = await supabase
    .from('study_materials')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data ?? []
}

// Upload a material
export async function uploadMaterial(
  file: File,
  title: string,
  subjectId?: string
): Promise<StudyMaterial> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User is not logged in')
  }

  const fileExtension = file.name.split('.').pop() || 'file'

  const filePath =
    `${user.id}/${crypto.randomUUID()}.${fileExtension}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw uploadError
  }

  const { data, error } = await supabase
    .from('study_materials')
    .insert({
      user_id: user.id,
      subject_id: subjectId || null,
      title,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
    })
    .select()
    .single()

  if (error) {
    // Remove uploaded file if database insert fails
    await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    throw error
  }

  return data
}

// Get a temporary download URL
export async function getMaterialUrl(
  filePath: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 3600)

  if (error) {
    throw error
  }

  return data.signedUrl
}

// Delete a material
export async function deleteMaterial(
  id: string,
  filePath: string
): Promise<void> {
  const { error: fileError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath])

  if (fileError) {
    throw fileError
  }

  const { error: databaseError } = await supabase
    .from('study_materials')
    .delete()
    .eq('id', id)

  if (databaseError) {
    throw databaseError
  }
}