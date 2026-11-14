import { supabase } from '../lib/supabase'


export async function signUp(
  email: string,
  password: string,
  fullName: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: 'https://yaruki.vercel.app',
    },
  })

  if (error) {
    throw error
  }

  return data
}


export async function signIn(
  email: string,
  password: string
) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function updateDisplayName(fullName: string) {
  const { data, error } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  })

  if (error) {
    throw error
  }

  // Keep the profiles table in step with the sign-up name (best effort)
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', data.user.id)

    if (profileError) {
      console.warn('Profile name was not updated:', profileError)
    }
  }

  return data.user
}

export async function changePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    throw error
  }
}
