import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env'

let supabase: ReturnType<typeof createClient> | null = null

function getClient() {
  if (!supabase) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase non configuré (SUPABASE_URL et SUPABASE_SERVICE_KEY requis)')
    }
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
  }
  return supabase
}

const BUCKET = 'devis'

/**
 * Upload a file buffer to Supabase Storage.
 * Returns the public URL.
 */
export async function uploadFile(
  buffer: Buffer,
  path: string,
  mimeType: string
): Promise<string> {
  const client = getClient()

  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    })

  if (error) throw new Error(`Upload Supabase échoué : ${error.message}`)

  const { data } = client.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Delete a file from Supabase Storage by its path.
 */
export async function deleteFile(path: string): Promise<void> {
  const client = getClient()

  const { error } = await client.storage.from(BUCKET).remove([path])
  if (error) throw new Error(`Suppression Supabase échouée : ${error.message}`)
}

/**
 * Get a short-lived signed URL for private file access.
 */
export async function getSignedUrl(path: string, expiresInSeconds = 3600): Promise<string> {
  const client = getClient()

  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds)

  if (error || !data) throw new Error(`URL signée Supabase échouée : ${error?.message}`)

  return data.signedUrl
}

/**
 * Extract Supabase storage path from a full public URL.
 */
export function extractPathFromUrl(url: string): string {
  // e.g. https://xxx.supabase.co/storage/v1/object/public/devis/quotes/xxx/file.pdf
  const marker = `/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return url
  return url.slice(idx + marker.length)
}
