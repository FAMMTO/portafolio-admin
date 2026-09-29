import { useCallback, useRef, useState } from 'react'
import { supabase, uploadImage, removeImages } from './supabase'
import ImageGallery from './ImageGallery'
import TagInput from './TagInput'

export const CATEGORIAS = [
  { value: 'WEB', label: 'Web' },
  { value: 'MOVIL', label: 'Móvil' },
  { value: 'LOCAL', label: 'Local' },
]

// Secciones fijas del contexto; se guardan como "Etiqueta: texto" una por línea
export const CONTEXTO_CAMPOS = [
  { key: 'Cliente', rows: 2, placeholder: 'Nombre del cliente y a qué se dedica.' },
  { key: 'Objetivo', rows: 3, placeholder: '¿Qué problema resolvía? ¿Qué buscaba lograr?' },
  { key: 'Alcance', rows: 3, placeholder: 'Dirección visual, diseño UI, desarrollo front-end, despliegue…' },
  { key: 'Stack', rows: 1, placeholder: 'Astro · React · Motion · Vercel' },
  { key: 'Enfoque visual', rows: 3, placeholder: 'Estética, paleta, jerarquía, interacciones…' },
  { key: 'Resultado', rows: 3, placeholder: '¿Qué se logró? ¿Qué puede hacer ahora el usuario?' },
]

const emptyContexto = () => Object.fromEntries(CONTEXTO_CAMPOS.map((c) => [c.key, '']))

function parseContexto(text) {
  const out = emptyContexto()
  let current = null
  for (const line of (text ?? '').split('\n')) {
    const match = CONTEXTO_CAMPOS.find((c) => line.toLowerCase().startsWith(`${c.key.toLowerCase()}:`))
    if (match) {
      current = match.key
      out[current] = line.slice(match.key.length + 1).trim()
    } else if (line.trim()) {
      // Texto fuera de formato: se une a la sección anterior (o a Objetivo si no hay)
      current ??= 'Objetivo'
      out[current] = [out[current], line.trim()].filter(Boolean).join(' ')
    }
  }
  return out
}

function serializeContexto(fields) {
  const text = CONTEXTO_CAMPOS.map((c) => [c.key, fields[c.key].replace(/\s+/g, ' ').trim()])
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
  return text || null
}

// Acepta "misitio.com" y lo convierte en "https://misitio.com"
function normalizeLink(raw) {
  const v = raw.trim()
  if (!v) return null
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

export default function ProjectForm({ project, nextOrden, onClose }) {
  const isNew = !project
  // Para proyectos nuevos generamos el id ya, así las imágenes van a su carpeta desde el inicio
  const idRef = useRef(project?.id ?? crypto.randomUUID())
  const originalUrls = useRef(
    project ? [project.imagen_principal, ...(project.imagenes_secundarias ?? [])].filter(Boolean) : []
  )
  const uploadedUrls = useRef([])

  const [nombre, setNombre] = useState(project?.nombre ?? '')
  const [categoria, setCategoria] = useState(project?.categoria ?? 'WEB')
  const [stack, setStack] = useState(project?.stack ?? [])
  const [link, setLink] = useState(project?.link ?? '')
  const [contexto, setContexto] = useState(() => parseContexto(project?.contexto))
  const [publicado, setPublicado] = useState(project?.publicado ?? true)
  const [images, setImages] = useState(() =>
    originalUrls.current.map((url) => ({ key: url, url }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)

  const touch = (setter) => (v) => {
    setter(v)
    setDirty(true)
  }

  const onFiles = useCallback((files) => {
    setDirty(true)
    for (const file of files) {
      const key = crypto.randomUUID()
      const preview = URL.createObjectURL(file)
      setImages((imgs) => [...imgs, { key, preview, uploading: true }])
      uploadImage(idRef.current, file)
        .then((url) => {
          uploadedUrls.current.push(url)
          setImages((imgs) => imgs.map((i) => (i.key === key ? { key, url, preview } : i)))
        })
        .catch((err) => {
          setImages((imgs) => imgs.map((i) => (i.key === key ? { ...i, uploading: false, error: err.message } : i)))
        })
    }
  }, [])

  const uploading = images.some((i) => i.uploading)
  const failed = images.some((i) => i.error)

  async function save(e) {
    e.preventDefault()
    if (!nombre.trim()) return setError('El nombre es obligatorio.')
    if (uploading) return setError('Espera a que terminen de subir las imágenes.')
    if (failed) return setError('Quita las imágenes con error antes de guardar.')

    setSaving(true)
    setError('')
    const urls = images.map((i) => i.url)
    const row = {
      nombre: nombre.trim(),
      categoria,
      link: normalizeLink(link),
      stack,
      contexto: serializeContexto(contexto),
      publicado,
      imagen_principal: urls[0] ?? null,
      imagenes_secundarias: urls.slice(1),
    }

    const { error } = isNew
      ? await supabase.from('proyectos').insert({ ...row, id: idRef.current, orden: nextOrden })
      : await supabase.from('proyectos').update(row).eq('id', idRef.current)

    if (error) {
      setSaving(false)
      return setError(error.message)
    }

    // Limpia del storage las imágenes quitadas (originales o subidas en esta sesión)
    const orphan = [...originalUrls.current, ...uploadedUrls.current].filter((u) => !urls.includes(u))
    await removeImages(orphan)
    onClose(true)
  }

  async function cancel() {
    if (dirty && !confirm('Tienes cambios sin guardar. ¿Descartarlos?')) return
    await removeImages(uploadedUrls.current)
    onClose(false)
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1>{isNew ? 'Nuevo proyecto' : `Editar: ${project.nombre}`}</h1>
        <button className="ghost" onClick={cancel}>← Volver</button>
      </header>

      <form className="form" onSubmit={save}>
        <section className="card">
          <h3>Imágenes</h3>
          <p className="muted small">
            La primera es la <b>principal</b> (portada del pin y primera del modal). Las demás forman la galería.
            Arrastra para reordenar o usa ★ para elegir la principal.
          </p>
          <ImageGallery images={images} onFiles={onFiles} onChange={touch(setImages)} />
        </section>

        <section className="card">
          <h3>Información</h3>
          <label>
            Nombre *
            <input value={nombre} onChange={(e) => touch(setNombre)(e.target.value)} placeholder="Ej. Tienda online Pieles" required />
          </label>

          <div className="field">
            <span>Categoría</span>
            <div className="segmented" role="radiogroup">
              {CATEGORIAS.map((c) => (
                <label key={c.value} className={categoria === c.value ? 'active' : ''}>
                  <input
                    type="radio"
                    name="categoria"
                    value={c.value}
                    checked={categoria === c.value}
                    onChange={() => touch(setCategoria)(c.value)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <label>
            Link
            <input
              type="text"
              inputMode="url"
              value={link}
              onChange={(e) => touch(setLink)(e.target.value)}
              placeholder="https://misitio.com (demo, tienda de apps, repo…)"
            />
            {link.trim() && (
              <a className="small" href={normalizeLink(link)} target="_blank" rel="noreferrer">
                Probar link ↗
              </a>
            )}
          </label>

          <label>
            Stack / tecnologías
            <TagInput value={stack} onChange={touch(setStack)} />
          </label>

          <label className="switch">
            <input type="checkbox" checked={publicado} onChange={(e) => touch(setPublicado)(e.target.checked)} />
            <span>{publicado ? 'Publicado (visible en el portafolio)' : 'Borrador (oculto)'}</span>
          </label>
        </section>

        <section className="card">
          <h3>Contexto del proyecto</h3>
          {CONTEXTO_CAMPOS.map((c) => (
            <label key={c.key}>
              {c.key}
              <textarea
                rows={c.rows}
                value={contexto[c.key]}
                onChange={(e) => touch(setContexto)((prev) => ({ ...prev, [c.key]: e.target.value }))}
                placeholder={c.placeholder}
              />
              {c.key === 'Stack' && stack.length > 0 && (
                <button
                  type="button"
                  className="ghost small"
                  onClick={() => touch(setContexto)((prev) => ({ ...prev, Stack: stack.join(' · ') }))}
                >
                  Usar tags del stack
                </button>
              )}
            </label>
          ))}
        </section>

        {error &&<p className="error">{error}</p>}

        <div className="row sticky-actions">
          <button type="button" className="ghost" onClick={cancel}>Cancelar</button>
          <button disabled={saving || uploading}>
            {saving ? 'Guardando…' : uploading ? 'Subiendo imágenes…' : isNew ? 'Crear proyecto' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
