'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen lang sein')
})

const signupSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen lang sein'),
  name: z.string().min(1, 'Name ist erforderlich')
})

export async function loginAction(formData: FormData) {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string
  }

  // Validate input
  const validatedData = loginSchema.safeParse(rawData)
  if (!validatedData.success) {
    return {
      error: validatedData.error.issues[0].message
    }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: validatedData.data.email,
    password: validatedData.data.password
  })

  if (error) {
    return {
      error: error.message
    }
  }

  redirect('/dashboard')
}

export async function signupAction(formData: FormData) {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    name: formData.get('name') as string
  }

  // Validate input
  const validatedData = signupSchema.safeParse(rawData)
  if (!validatedData.success) {
    return {
      error: validatedData.error.issues[0].message
    }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: validatedData.data.email,
    password: validatedData.data.password,
    options: {
      data: {
        name: validatedData.data.name
      }
    }
  })

  if (error) {
    return {
      error: error.message
    }
  }

  // Check if email confirmation is required
  return {
    success: true,
    message: 'Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse.'
  }
}

export async function signOutAction() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return {
      error: error.message
    }
  }

  redirect('/login')
}