import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const SQL_PERFIL = `create table if not exists public.perfil (
  id int primary key default 1 check (id = 1),
  correo text,
  telefono text,
  github text,
  updated_at timestamptz not null default now()
);
alter table public.perfil enable row level security;
create policy "perfil lectura publica" on public.perfil for select using (true);
create policy "perfil escritura admin" on public.perfil
  for all using (public.is_admin()) with check (public.is_admin());
insert into public.perfil (id) values (1) on conflict (id) do nothing;`

const SQL_GITHUB = `alter table public.perfil add column if not exists github text;`

// Deja solo dígitos y un "+" inicial: "+52 (81) 1234-5678" -> "+528112345678"
const phoneDigits = (v) => v.trim().replace(/(?!^\+)[^\d]/g, '')

export default function ContactForm({ onClose }) {
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [github, setGithub] = useState('')
  const [loading, setLoading] = useState(true)
  const [missingTable, setMissingTable] = useState(false)
  const [missingGithub, setMissingGithub] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase
      .from('perfil')
      .select('correo, telefono, github')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          if (error.code === 'PGRST205' || error.code === '42P01') setMissingTable(true)
          else if (error.code === '42703') setMissingGithub(true)
          else setError(error.message)
        }
        setCorreo(data?.correo ?? '')
        setTelefono(data?.telefono ?? '')
        setGithub(data?.github ?? '')
        setLoading(false)
      })
  }, [])

  const edit = (setter) => (e) => {
    setter(e.target.value)
    setSaved(false)
  }

  async function save(e) {
    e.preventDefault()
    const tel = telefono.trim()
    if (tel && phoneDigits(tel).replace('+', '').length < 10) {
      return setError('El teléfono debe tener al menos 10 dígitos.')
    }
    setSaving(true)
    setError('')
    const { error } = await supabase.from('perfil').upsert({
      id: 1,
      correo: correo.trim() || null,
      telefono: tel || null,
      github: github.trim() || null,
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    if (error) return setError(error.message)
    setSaved(true)
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1>Datos de contacto</h1>
        <button className="ghost" onClick={onClose}>← Volver</button>
      </header>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : missingTable ? (
        <div className="card">
          <h3>Falta la tabla <code>perfil</code></h3>
          <p className="muted">Ejecuta esto en el SQL editor de Supabase y recarga:</p>
          <pre>{SQL_PERFIL}</pre>
          <button onClick={() => location.reload()}>Ya lo hice, recargar</button>
        </div>
      ) : missingGithub ? (
        <div className="card">
          <h3>Falta la columna <code>github</code></h3>
          <p className="muted">Ejecuta esto en el SQL editor de Supabase y recarga:</p>
          <pre>{SQL_GITHUB}</pre>
          <button onClick={() => location.reload()}>Ya lo hice, recargar</button>
        </div>
      ) : (
        <form className="form" onSubmit={save}>
          <section className="card">
            <h3>Contacto</h3>
            <p className="muted small">Se muestran en el portafolio para que te escriban o llamen.</p>
            <label>
              Correo
              <input type="email" value={correo} onChange={edit(setCorreo)} placeholder="tucorreo@dominio.com" />
            </label>
            <label>
              Teléfono
              <input type="tel" value={telefono} onChange={edit(setTelefono)} placeholder="+52 81 1234 5678" />
              {telefono.trim() && (
                <a className="small" href={`tel:${phoneDigits(telefono)}`}>Probar llamada ↗</a>
              )}
            </label>
            <label>
              GitHub
              <input type="url" value={github} onChange={edit(setGithub)} placeholder="https://github.com/usuario" />
              {github.trim() && (
                <a className="small" href={github.trim()} target="_blank" rel="noreferrer">Abrir perfil ↗</a>
              )}
            </label>
          </section>

          {error && <p className="error">{error}</p>}

          <div className="row sticky-actions">
            {saved && <span className="muted small">Guardado ✓</span>}
            <button disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      )}
    </div>
  )
}
