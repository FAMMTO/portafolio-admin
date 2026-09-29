import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)

export const BUCKET = 'proyectos'
const PUBLIC_MARK = `/storage/v1/object/public/${BUCKET}/`

// Reduce imágenes grandes a WebP (máx 2000px) antes de subir. GIF/SVG se suben tal cual.
async function compress(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.85))
  return blob && blob.size < file.size ? blob : file
}

export async function uploadImage(projectId, file) {
  const data = await compress(file)
  const ext = data.type === 'image/webp' ? 'webp' : file.name.split('.').pop().toLowerCase()
  const path = `${projectId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, data, { contentType: data.type || file.type, cacheControl: '31536000' })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export function pathFromUrl(url) {
  const i = url?.indexOf(PUBLIC_MARK) ?? -1
  return i === -1 ? null : decodeURIComponent(url.slice(i + PUBLIC_MARK.length))
}

// Borra solo archivos que viven en nuestro bucket (ignora URLs externas).
export async function removeImages(urls) {
  const paths = urls.map(pathFromUrl).filter(Boolean)
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
}

export async function removeProjectFolder(projectId) {
  const { data } = await supabase.storage.from(BUCKET).list(projectId, { limit: 1000 })
  if (data?.length) {
    await supabase.storage.from(BUCKET).remove(data.map((f) => `${projectId}/${f.name}`))
  }
}
