import { useState } from 'react'

const SUGERENCIAS = [
  'React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'Astro', 'TypeScript', 'JavaScript',
  'Tailwind', 'CSS', 'HTML', 'Node.js', 'Express', 'NestJS', 'Python', 'Django', 'FastAPI',
  'PHP', 'Laravel', 'Supabase', 'Firebase', 'PostgreSQL', 'MySQL', 'MongoDB', 'Prisma',
  'Docker', 'AWS', 'Vercel', 'Figma', 'React Native', 'Flutter', 'Shopify', 'WordPress',
]

export default function TagInput({ value, onChange }) {
  const [text, setText] = useState('')

  function add(raw) {
    const tags = raw.split(',').map((t) => t.trim()).filter(Boolean)
    const next = [...value]
    for (const t of tags) {
      if (!next.some((v) => v.toLowerCase() === t.toLowerCase())) next.push(t)
    }
    onChange(next)
    setText('')
  }

  function onKeyDown(e) {
    if ((e.key === 'Enter' || e.key === ',') && text.trim()) {
      e.preventDefault()
      add(text)
    } else if (e.key === 'Backspace' && !text && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="tags">
      {value.map((t) => (
        <span key={t} className="chip">
          {t}
          <button type="button" onClick={() => onChange(value.filter((v) => v !== t))} aria-label={`Quitar ${t}`}>×</button>
        </span>
      ))}
      <input
        list="stack-sugerencias"
        value={text}
        onChange={(e) => {
          // Elegir una sugerencia del datalist la agrega directo
          const v = e.target.value
          if (SUGERENCIAS.includes(v)) add(v)
          else setText(v)
        }}
        onKeyDown={onKeyDown}
        onBlur={() => text.trim() && add(text)}
        placeholder={value.length ? '' : 'Escribe y presiona Enter (ej. React, Supabase)'}
      />
      <datalist id="stack-sugerencias">
        {SUGERENCIAS.filter((s) => !value.includes(s)).map((s) => <option key={s} value={s} />)}
      </datalist>
    </div>
  )
}
