import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import TrayectoriaForm, { MODALIDADES } from './TrayectoriaForm'
import SQL_TRAYECTORIA from '../supabase/trayectoria.sql?raw'

const fmtMonth = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })

// "2 años 3 meses" contando el mes de inicio y el de fin
function duracion(inicio, fin) {
  const a = new Date(`${inicio}T00:00:00`)
  const b = fin ? new Date(`${fin}T00:00:00`) : new Date()
  const total = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() + 1
  const y = Math.floor(total / 12)
  const m = total % 12
  return [y && `${y} ${y === 1 ? 'año' : 'años'}`, m && `${m} ${m === 1 ? 'mes' : 'meses'}`]
    .filter(Boolean)
    .join(' ')
}

export default function Trayectoria({ onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [missingTable, setMissingTable] = useState(false)
  const [editing, setEditing] = useState(null) // null | 'new' | puesto

  async function load() {
    const { data, error } = await supabase
      .from('trayectoria')
      .select('*')
      .order('orden')
      .order('fecha_inicio', { ascending: false })
    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') setMissingTable(true)
      else alert(error.message)
    }
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function saveOrder(list) {
    const renumbered = list.map((p, i) => ({ ...p, orden: i }))
    const changed = renumbered.filter((p) => items.find((o) => o.id === p.id).orden !== p.orden)
    setItems(renumbered)
    const results = await Promise.all(
      changed.map((p) => supabase.from('trayectoria').update({ orden: p.orden }).eq('id', p.id))
    )
    const failed = results.find((r) => r.error)
    if (failed) {
      alert(failed.error.message)
      load()
    }
  }

  function move(index, dir) {
    const target = index + dir
    if (target < 0 || target >= items.length) return
    const list = [...items]
    ;[list[index], list[target]] = [list[target], list[index]]
    saveOrder(list)
  }

  // Actuales primero, luego del más reciente al más antiguo
  function sortByDate() {
    const key = (p) => `${p.fecha_fin ? 0 : 1}${p.fecha_fin ?? ''}${p.fecha_inicio}`
    saveOrder([...items].sort((a, b) => key(b).localeCompare(key(a))))
  }

  async function togglePublish(p) {
    setItems((ps) => ps.map((x) => (x.id === p.id ? { ...x, publicado: !p.publicado } : x)))
    const { error } = await supabase.from('trayectoria').update({ publicado: !p.publicado }).eq('id', p.id)
    if (error) {
      alert(error.message)
      load()
    }
  }

  async function remove(p) {
    if (!confirm(`¿Eliminar "${p.puesto}" en ${p.empresa}? No se puede deshacer.`)) return
    const { error } = await supabase.from('trayectoria').delete().eq('id', p.id)
    if (error) return alert(error.message)
    setItems((ps) => ps.filter((x) => x.id !== p.id))
  }

  if (editing) {
    return (
      <TrayectoriaForm
        item={editing === 'new' ? null : editing}
        nextOrden={items.length ? Math.max(...items.map((p) => p.orden)) + 1 : 0}
        onClose={(saved) => {
          setEditing(null)
          if (saved) load()
        }}
      />
    )
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1>Trayectoria profesional</h1>
        <button className="ghost" onClick={onClose}>← Volver</button>
      </header>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : missingTable ? (
        <div className="card">
          <h3>Falta la tabla <code>trayectoria</code></h3>
          <p className="muted">Ejecuta esto en el SQL editor de Supabase y recarga:</p>
          <pre>{SQL_TRAYECTORIA}</pre>
          <button onClick={() => location.reload()}>Ya lo hice, recargar</button>
        </div>
      ) : (
        <>
          <div className="row toolbar">
            <button onClick={() => setEditing('new')}>+ Nuevo puesto</button>
            {items.length > 1 && (
              <button className="ghost" onClick={sortByDate}>Ordenar por fecha</button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="empty">
              <p>Aún no hay puestos en tu trayectoria.</p>
              <button onClick={() => setEditing('new')}>Agregar el primero</button>
            </div>
          ) : (
            <ul className="list">
              {items.map((p, index) => (
                <li key={p.id} className={`item ${p.publicado ? '' : 'draft'}`}>
                  <div className="info">
                    <strong>{p.puesto}</strong>
                    <div className="row small">
                      <span>{p.empresa}</span>
                      {p.ubicacion && <span className="muted">· {p.ubicacion}</span>}
                      {p.modalidad && (
                        <span className="badge">{MODALIDADES.find((m) => m.value === p.modalidad)?.label}</span>
                      )}
                    </div>
                    <span className="muted small">
                      {fmtMonth(p.fecha_inicio)} – {p.fecha_fin ? fmtMonth(p.fecha_fin) : 'Actual'} · {duracion(p.fecha_inicio, p.fecha_fin)}
                    </span>
                    {p.funciones?.length > 0 && (
                      <span className="muted small">{p.funciones.length} {p.funciones.length === 1 ? 'función' : 'funciones'}</span>
                    )}
                    <div className="chips small">
                      {p.stack?.map((s) => <span key={s} className="chip">{s}</span>)}
                    </div>
                  </div>
                  <div className="actions">
                    <button className="icon" title="Subir" onClick={() => move(index, -1)} disabled={index === 0}>↑</button>
                    <button className="icon" title="Bajar" onClick={() => move(index, 1)} disabled={index === items.length - 1}>↓</button>
                    <label className="switch">
                      <input type="checkbox" checked={p.publicado} onChange={() => togglePublish(p)} />
                      <span>{p.publicado ? 'Publicado' : 'Borrador'}</span>
                    </label>
                    <button className="ghost" onClick={() => setEditing(p)}>Editar</button>
                    <button className="ghost danger" onClick={() => remove(p)}>Eliminar</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
