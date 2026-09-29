import { useEffect, useState } from 'react'
import { supabase, removeProjectFolder } from './supabase'
import ProjectForm, { CATEGORIAS } from './ProjectForm'
import ContactForm from './ContactForm'
import Trayectoria from './Trayectoria'
import SobreMi from './SobreMi'

export default function Dashboard({ user }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | 'new' | proyecto
  const [filter, setFilter] = useState('')
  const [view, setView] = useState(null) // null | 'contacto' | 'trayectoria' | 'sobre'

  async function load() {
    const { data, error } = await supabase
      .from('proyectos')
      .select('*')
      .order('orden')
      .order('created_at')
    if (error) alert(error.message)
    setProjects(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function togglePublish(p) {
    setProjects((ps) => ps.map((x) => (x.id === p.id ? { ...x, publicado: !p.publicado } : x)))
    const { error } = await supabase.from('proyectos').update({ publicado: !p.publicado }).eq('id', p.id)
    if (error) {
      alert(error.message)
      load()
    }
  }

  async function move(index, dir) {
    const target = index + dir
    if (target < 0 || target >= projects.length) return
    const list = [...projects]
    const tmp = list[index]
    list[index] = list[target]
    list[target] = tmp
    const renumbered = list.map((p, i) => ({ ...p, orden: i }))
    const changed = renumbered.filter((p) => projects.find((o) => o.id === p.id).orden !== p.orden)
    setProjects(renumbered)
    const results = await Promise.all(
      changed.map((p) => supabase.from('proyectos').update({ orden: p.orden }).eq('id', p.id))
    )
    const failed = results.find((r) => r.error)
    if (failed) {
      alert(failed.error.message)
      load()
    }
  }

  async function remove(p) {
    if (!confirm(`¿Eliminar "${p.nombre}" y todas sus imágenes? No se puede deshacer.`)) return
    const { error } = await supabase.from('proyectos').delete().eq('id', p.id)
    if (error) return alert(error.message)
    await removeProjectFolder(p.id)
    setProjects((ps) => ps.filter((x) => x.id !== p.id))
  }

  if (view === 'contacto') return <ContactForm onClose={() => setView(null)} />
  if (view === 'trayectoria') return <Trayectoria onClose={() => setView(null)} />
  if (view === 'sobre') return <SobreMi onClose={() => setView(null)} />

  if (editing) {
    return (
      <ProjectForm
        project={editing === 'new' ? null : editing}
        nextOrden={projects.length ? Math.max(...projects.map((p) => p.orden)) + 1 : 0}
        onClose={(saved) => {
          setEditing(null)
          if (saved) load()
        }}
      />
    )
  }

  const q = filter.trim().toLowerCase()
  const visible = q
    ? projects.filter((p) =>
        [p.nombre, p.categoria, ...(p.stack ?? [])].join(' ').toLowerCase().includes(q)
      )
    : projects

  return (
    <div className="page">
      <header className="topbar">
        <h1>Proyectos</h1>
        <div className="row">
          <span className="muted small">{user.email}</span>
          <button className="ghost" onClick={() => setView('sobre')}>Sobre mí</button>
          <button className="ghost" onClick={() => setView('trayectoria')}>Trayectoria</button>
          <button className="ghost" onClick={() => setView('contacto')}>Contacto</button>
          <button className="ghost" onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      </header>

      <div className="row toolbar">
        <input
          className="grow"
          placeholder="Buscar por nombre, categoría o tecnología…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button onClick={() => setEditing('new')}>+ Nuevo proyecto</button>
      </div>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : projects.length === 0 ? (
        <div className="empty">
          <p>Aún no hay proyectos.</p>
          <button onClick={() => setEditing('new')}>Crear el primero</button>
        </div>
      ) : (
        <ul className="list">
          {visible.map((p) => {
            const index = projects.indexOf(p)
            const total = (p.imagen_principal ? 1 : 0) + (p.imagenes_secundarias?.length ?? 0)
            return (
              <li key={p.id} className={`item ${p.publicado ? '' : 'draft'}`}>
                <div className="thumb">
                  {p.imagen_principal ? <img src={p.imagen_principal} alt="" /> : <span>sin imagen</span>}
                </div>
                <div className="info">
                  <strong>{p.nombre}</strong>
                  <div className="row small">
                    <span className="badge">{CATEGORIAS.find((c) => c.value === p.categoria)?.label ?? p.categoria}</span>
                    <span className="muted">{total} {total === 1 ? 'imagen' : 'imágenes'}</span>
                    {p.link && (
                      <a href={p.link} target="_blank" rel="noreferrer" className="link">
                        {p.link.replace(/^https?:\/\//, '').replace(/\/$/, '')} ↗
                      </a>
                    )}
                  </div>
                  <div className="chips small">
                    {p.stack?.map((s) => <span key={s} className="chip">{s}</span>)}
                  </div>
                </div>
                <div className="actions">
                  {!q && (
                    <>
                      <button className="icon" title="Subir" onClick={() => move(index, -1)} disabled={index === 0}>↑</button>
                      <button className="icon" title="Bajar" onClick={() => move(index, 1)} disabled={index === projects.length - 1}>↓</button>
                    </>
                  )}
                  <label className="switch">
                    <input type="checkbox" checked={p.publicado} onChange={() => togglePublish(p)} />
                    <span>{p.publicado ? 'Publicado' : 'Borrador'}</span>
                  </label>
                  <button className="ghost" onClick={() => setEditing(p)}>Editar</button>
                  <button className="ghost danger" onClick={() => remove(p)}>Eliminar</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
