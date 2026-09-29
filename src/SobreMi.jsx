import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import TagInput from './TagInput'

const SQL_SOBRE = `alter table public.perfil add column if not exists sobre_titulo text;
alter table public.perfil add column if not exists sobre_texto text;
alter table public.perfil add column if not exists sobre_stack text[];
alter table public.perfil add column if not exists sobre_stats jsonb;`

// Textos que hoy tiene el portafolio; se usan mientras la fila no tenga valores propios
const DEFAULTS = {
  titulo: 'Del diseño de la base de datos al último píxel.',
  texto:
    'Trabajo en todo el ciclo: entiendo el problema de negocio, modelo los datos, construyo la API, la interfaz y la infraestructura. Me importan el rendimiento, la accesibilidad y el código que otros puedan mantener.',
  stack: ['TypeScript', 'React', 'Next.js', 'Astro', 'Node.js', 'NestJS', 'Python', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'AWS', 'Git'],
  stats: [
    { valor: '3+', etiqueta: 'Años programando', auto: null },
    { valor: '25+', etiqueta: 'Proyectos entregados', auto: null },
    { valor: '100%', etiqueta: 'Código en Git', auto: null },
  ],
}

// "auto" calcula el número en el portafolio a partir de otras tablas
export const AUTO_STATS = [
  { value: '', label: 'Manual' },
  { value: 'anios', label: 'Años desde el primer puesto (Trayectoria)' },
  { value: 'proyectos', label: 'Proyectos publicados' },
]

export default function SobreMi({ onClose }) {
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [stack, setStack] = useState([])
  const [stats, setStats] = useState([])
  const [autoValues, setAutoValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [missingColumns, setMissingColumns] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase
      .from('perfil')
      .select('sobre_titulo, sobre_texto, sobre_stack, sobre_stats')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          if (error.code === '42703' || error.code === 'PGRST205' || error.code === '42P01') setMissingColumns(true)
          else setError(error.message)
        }
        setTitulo(data?.sobre_titulo ?? DEFAULTS.titulo)
        setTexto(data?.sobre_texto ?? DEFAULTS.texto)
        setStack(data?.sobre_stack ?? DEFAULTS.stack)
        setStats((data?.sobre_stats ?? DEFAULTS.stats).map((s) => ({ auto: null, ...s, key: crypto.randomUUID() })))
        setLoading(false)
      })

    // Valores que tendrían hoy los stats automáticos (vista previa)
    Promise.all([
      supabase.from('trayectoria').select('fecha_inicio').order('fecha_inicio').limit(1),
      supabase.from('proyectos').select('id', { count: 'exact', head: true }).eq('publicado', true),
    ]).then(([tray, proy]) => {
      const inicio = tray.data?.[0]?.fecha_inicio
      const anios = inicio ? Math.floor((Date.now() - new Date(`${inicio}T00:00:00`)) / (365.25 * 864e5)) : null
      setAutoValues({
        anios: anios != null ? `${Math.max(anios, 1)}+` : null,
        proyectos: proy.count != null ? `${proy.count}+` : null,
      })
    })
  }, [])

  const touch = (setter) => (v) => {
    setter(v)
    setSaved(false)
  }

  const setStat = (key, patch) => touch(setStats)((ss) => ss.map((s) => (s.key === key ? { ...s, ...patch } : s)))

  function moveStat(index, dir) {
    const target = index + dir
    const list = [...stats]
    ;[list[index], list[target]] = [list[target], list[index]]
    touch(setStats)(list)
  }

  async function save(e) {
    e.preventDefault()
    const clean = stats
      .map(({ valor, etiqueta, auto }) => ({ valor: valor.trim(), etiqueta: etiqueta.trim(), auto: auto || null }))
      .filter((s) => s.etiqueta && (s.valor || s.auto))
    setSaving(true)
    setError('')
    const { error } = await supabase
      .from('perfil')
      .update({
        sobre_titulo: titulo.trim() || null,
        sobre_texto: texto.trim() || null,
        sobre_stack: stack,
        sobre_stats: clean,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
    setSaving(false)
    if (error) return setError(error.message)
    setSaved(true)
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1>Sobre mí</h1>
        <button className="ghost" onClick={onClose}>← Volver</button>
      </header>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : missingColumns ? (
        <div className="card">
          <h3>Faltan columnas en <code>perfil</code></h3>
          <p className="muted">Ejecuta esto en el SQL editor de Supabase y recarga:</p>
          <pre>{SQL_SOBRE}</pre>
          <button onClick={() => location.reload()}>Ya lo hice, recargar</button>
        </div>
      ) : (
        <form className="form" onSubmit={save}>
          <section className="card">
            <h3>Texto</h3>
            <label>
              Título
              <input value={titulo} onChange={(e) => touch(setTitulo)(e.target.value)} placeholder={DEFAULTS.titulo} />
            </label>
            <label>
              Párrafo
              <textarea rows={4} value={texto} onChange={(e) => touch(setTexto)(e.target.value)} placeholder={DEFAULTS.texto} />
            </label>
          </section>

          <section className="card">
            <h3>Tecnologías</h3>
            <p className="muted small">Se muestran como etiquetas debajo del párrafo, en este orden.</p>
            <TagInput value={stack} onChange={touch(setStack)} />
          </section>

          <section className="card">
            <h3>Cifras</h3>
            <p className="muted small">
              Tarjetas a la derecha (ej. "3+ Años programando"). En modo automático el número se calcula en el portafolio.
            </p>
            <ul className="stats-editor">
              {stats.map((s, i) => (
                <li key={s.key} className="stat-row">
                  <div className="grid-3">
                    <label>
                      Número
                      <input
                        value={s.auto ? autoValues[s.auto] ?? '…' : s.valor}
                        onChange={(e) => setStat(s.key, { valor: e.target.value })}
                        disabled={!!s.auto}
                        placeholder="25+"
                      />
                    </label>
                    <label>
                      Texto
                      <input value={s.etiqueta} onChange={(e) => setStat(s.key, { etiqueta: e.target.value })} placeholder="Proyectos entregados" />
                    </label>
                    <label>
                      Origen
                      <select value={s.auto ?? ''} onChange={(e) => setStat(s.key, { auto: e.target.value || null })}>
                        {AUTO_STATS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="actions">
                    <button type="button" className="icon" title="Subir" onClick={() => moveStat(i, -1)} disabled={i === 0}>↑</button>
                    <button type="button" className="icon" title="Bajar" onClick={() => moveStat(i, 1)} disabled={i === stats.length - 1}>↓</button>
                    <button type="button" className="ghost danger" onClick={() => touch(setStats)(stats.filter((x) => x.key !== s.key))}>Quitar</button>
                  </div>
                </li>
              ))}
            </ul>
            {stats.some((s) => s.auto === 'anios') && autoValues.anios === null && (
              <p className="muted small">Agrega puestos en Trayectoria para calcular los años automáticamente.</p>
            )}
            <button
              type="button"
              className="ghost"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => touch(setStats)([...stats, { key: crypto.randomUUID(), valor: '', etiqueta: '', auto: null }])}
            >
              + Agregar cifra
            </button>
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
