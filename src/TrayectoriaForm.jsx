import { useState } from 'react'
import { supabase } from './supabase'
import TagInput from './TagInput'

export const MODALIDADES = [
  { value: 'PRESENCIAL', label: 'Presencial' },
  { value: 'REMOTO', label: 'Remoto' },
  { value: 'HIBRIDO', label: 'Híbrido' },
]

// En la BD las fechas son "YYYY-MM-01"; el <input type="month"> usa "YYYY-MM"
const toMonth = (date) => date?.slice(0, 7) ?? ''
const fromMonth = (month) => (month ? `${month}-01` : null)

function normalizeLink(raw) {
  const v = raw.trim()
  if (!v) return null
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

export default function TrayectoriaForm({ item, nextOrden, onClose }) {
  const isNew = !item
  const [puesto, setPuesto] = useState(item?.puesto ?? '')
  const [empresa, setEmpresa] = useState(item?.empresa ?? '')
  const [ubicacion, setUbicacion] = useState(item?.ubicacion ?? '')
  const [modalidad, setModalidad] = useState(item?.modalidad ?? '')
  const [inicio, setInicio] = useState(toMonth(item?.fecha_inicio))
  const [fin, setFin] = useState(toMonth(item?.fecha_fin))
  const [actual, setActual] = useState(item ? !item.fecha_fin : false)
  const [descripcion, setDescripcion] = useState(item?.descripcion ?? '')
  const [funciones, setFunciones] = useState((item?.funciones ?? []).join('\n'))
  const [stack, setStack] = useState(item?.stack ?? [])
  const [link, setLink] = useState(item?.link ?? '')
  const [publicado, setPublicado] = useState(item?.publicado ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)

  const touch = (setter) => (v) => {
    setter(v)
    setDirty(true)
  }
  const onInput = (setter) => (e) => touch(setter)(e.target.value)

  async function save(e) {
    e.preventDefault()
    if (!puesto.trim() || !empresa.trim()) return setError('Puesto y empresa son obligatorios.')
    if (!inicio) return setError('Indica la fecha de inicio.')
    if (!actual && !fin) return setError('Indica la fecha de fin o marca "Trabajo aquí actualmente".')
    if (!actual && fin < inicio) return setError('La fecha de fin no puede ser anterior al inicio.')

    setSaving(true)
    setError('')
    const row = {
      puesto: puesto.trim(),
      empresa: empresa.trim(),
      ubicacion: ubicacion.trim() || null,
      modalidad: modalidad || null,
      fecha_inicio: fromMonth(inicio),
      fecha_fin: actual ? null : fromMonth(fin),
      descripcion: descripcion.trim() || null,
      funciones: funciones.split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean),
      stack,
      link: normalizeLink(link),
      publicado,
    }

    const { error } = isNew
      ? await supabase.from('trayectoria').insert({ ...row, orden: nextOrden })
      : await supabase.from('trayectoria').update(row).eq('id', item.id)

    setSaving(false)
    if (error) return setError(error.message)
    onClose(true)
  }

  function cancel() {
    if (dirty && !confirm('Tienes cambios sin guardar. ¿Descartarlos?')) return
    onClose(false)
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1>{isNew ? 'Nuevo puesto' : `Editar: ${item.puesto}`}</h1>
        <button className="ghost" onClick={cancel}>← Volver</button>
      </header>

      <form className="form" onSubmit={save}>
        <section className="card">
          <h3>Puesto</h3>
          <label>
            Nombre del puesto *
            <input value={puesto} onChange={onInput(setPuesto)} placeholder="Ej. Desarrollador Front-end Sr." required />
          </label>
          <label>
            Empresa / lugar de trabajo *
            <input value={empresa} onChange={onInput(setEmpresa)} placeholder="Ej. Aceros y Perfiles MTY" required />
          </label>
          <div className="grid-2">
            <label>
              Ubicación
              <input value={ubicacion} onChange={onInput(setUbicacion)} placeholder="Monterrey, N.L." />
            </label>
            <div className="field">
              <span>Modalidad</span>
              <div className="segmented" role="radiogroup">
                {MODALIDADES.map((m) => (
                  <label key={m.value} className={modalidad === m.value ? 'active' : ''}>
                    <input
                      type="radio"
                      name="modalidad"
                      checked={modalidad === m.value}
                      // Clic sobre la opción activa la deselecciona
                      onClick={() => touch(setModalidad)(modalidad === m.value ? '' : m.value)}
                      onChange={() => {}}
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <label>
            Sitio de la empresa
            <input type="text" inputMode="url" value={link} onChange={onInput(setLink)} placeholder="empresa.com" />
          </label>
        </section>

        <section className="card">
          <h3>Periodo</h3>
          <div className="grid-2">
            <label>
              Inicio *
              <input type="month" value={inicio} onChange={onInput(setInicio)} required />
            </label>
            <label>
              Fin
              <input type="month" value={actual ? '' : fin} onChange={onInput(setFin)} disabled={actual} min={inicio} />
            </label>
          </div>
          <label className="switch">
            <input type="checkbox" checked={actual} onChange={(e) => touch(setActual)(e.target.checked)} />
            <span>Trabajo aquí actualmente</span>
          </label>
        </section>

        <section className="card">
          <h3>Qué hacía en el puesto</h3>
          <label>
            Resumen
            <textarea rows={3} value={descripcion} onChange={onInput(setDescripcion)} placeholder="Breve descripción del rol y del equipo." />
          </label>
          <label>
            Funciones y logros
            <textarea
              rows={6}
              value={funciones}
              onChange={onInput(setFunciones)}
              placeholder={'Una por línea:\nDesarrollé el panel de administración en React\nReduje el tiempo de carga un 40%\nLideré un equipo de 3 personas'}
            />
            <span className="muted small">Cada línea se muestra como un punto de la lista.</span>
          </label>
          <label>
            Tecnologías / herramientas
            <TagInput value={stack} onChange={touch(setStack)} />
          </label>
          <label className="switch">
            <input type="checkbox" checked={publicado} onChange={(e) => touch(setPublicado)(e.target.checked)} />
            <span>{publicado ? 'Publicado (visible en el portafolio)' : 'Borrador (oculto)'}</span>
          </label>
        </section>

        {error && <p className="error">{error}</p>}

        <div className="row sticky-actions">
          <button type="button" className="ghost" onClick={cancel}>Cancelar</button>
          <button disabled={saving}>{saving ? 'Guardando…' : isNew ? 'Agregar puesto' : 'Guardar cambios'}</button>
        </div>
      </form>
    </div>
  )
}
