import { supabase } from '../lib/supabase'

const BUCKET_NAME = 'study-materials'

export const MAX_MATERIAL_SIZE_MB = 10

export const ALLOWED_MATERIAL_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx',
  'txt', 'md', 'csv', 'png', 'jpg', 'jpeg', 'gif', 'webp',
]

// Returns an error message, or null if the file is acceptable.
export function validateMaterialFile(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (!ALLOWED_MATERIAL_EXTENSIONS.includes(extension)) {
    return `This file type is not supported. Allowed: ${ALLOWED_MATERIAL_EXTENSIONS.join(', ')}.`
  }

  if (file.size === 0) {
    return 'This file is empty.'
  }

  if (file.size > MAX_MATERIAL_SIZE_MB * 1024 * 1024) {
    return `This file is too large. The maximum size is ${MAX_MATERIAL_SIZE_MB} MB.`
  }

  return null
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

  const validationError = validateMaterialFile(file)

  if (validationError) {
    throw new Error(validationError)
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

// Get a temporary link (valid for one hour).
// Pass downloadName to make the browser save the file instead of showing it.
export async function getMaterialUrl(
  filePath: string,
  downloadName?: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(
      filePath,
      3600,
      downloadName ? { download: downloadName } : undefined
    )

  if (error) {
    throw error
  }

  return data.signedUrl
}

// Delete a material.
// The database row goes first, so a failure never leaves a row that
// points to a missing file. A leftover file is harmless and is logged.
export async function deleteMaterial(
  id: string,
  filePath: string | null
): Promise<void> {
  const { error: databaseError } = await supabase
    .from('study_materials')
    .delete()
    .eq('id', id)

  if (databaseError) {
    throw databaseError
  }

  // An entry without a stored file has nothing to remove from storage
  if (!filePath) {
    return
  }

  const { error: fileError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath])

  if (fileError) {
    console.error('Material deleted but file removal failed:', fileError)
  }
}

// Update a material's title and/or subject
export async function updateMaterial(
  id: string,
  updates: {
    title?: string
    subjectId?: string | null
  }
): Promise<StudyMaterial> {
  const databaseUpdates: {
    title?: string
    subject_id?: string | null
  } = {}

  if (updates.title !== undefined) {
    databaseUpdates.title = updates.title
  }

  if (updates.subjectId !== undefined) {
    databaseUpdates.subject_id = updates.subjectId
  }

  if (Object.keys(databaseUpdates).length === 0) {
    throw new Error('No material changes provided')
  }

  const { data, error } = await supabase
    .from('study_materials')
    .update(databaseUpdates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}