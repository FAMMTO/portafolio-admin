import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const root = createRoot(document.getElementById('root'))
const { VITE_SUPABASE_URL, VITE_SUPABASE_KEY } = import.meta.env

// Sin variables, createClient truena al importar y la página queda en blanco: mejor avisar
if (!VITE_SUPABASE_URL || !VITE_SUPABASE_KEY) {
  root.render(
    <div className="center">
      <div className="card narrow">
        <h2>Faltan variables de entorno</h2>
        <p className="muted">
          Define <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_KEY</code> (en <code>.env</code> o en Vercel →
          Settings → Environment Variables) y vuelve a compilar.
        </p>
      </div>
    </div>
  )
} else {
  import('./App.jsx').then(({ default: App }) =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  )
}
