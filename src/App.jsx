import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Login from './Login'
import Dashboard from './Dashboard'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [isAdmin, setIsAdmin] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return setIsAdmin(null)
    supabase.rpc('is_admin').then(({ data }) => setIsAdmin(!!data))
  }, [session])

  if (session === undefined) return <div className="center muted">Cargando…</div>
  if (!session) return <Login />
  if (isAdmin === null) return <div className="center muted">Verificando permisos…</div>

  if (!isAdmin) {
    return (
      <div className="center">
        <div className="card narrow">
          <h2>Sin permisos de admin</h2>
          <p className="muted">
            Tu usuario existe pero no está en la tabla <code>admins</code>. Ejecuta en el SQL editor:
          </p>
          <pre>insert into public.admins (user_id) values ('{session.user.id}');</pre>
          <div className="row">
            <button onClick={() => location.reload()}>Ya lo hice, recargar</button>
            <button className="ghost" onClick={() => supabase.auth.signOut()}>Salir</button>
          </div>
        </div>
      </div>
    )
  }

  return <Dashboard user={session.user} />
}
