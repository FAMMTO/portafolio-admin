import { useState } from 'react'

// Input de contraseña con botón para mostrar/ocultar lo escrito
export default function PasswordInput({ value, onChange, ...props }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="password">
      <input type={visible ? 'text' : 'password'} value={value} onChange={onChange} {...props} />
      <button
        type="button"
        className="icon"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        title={visible ? 'Ocultar' : 'Mostrar'}
      >
        {visible ? 'Ocultar' : 'Ver'}
      </button>
    </div>
  )
}
