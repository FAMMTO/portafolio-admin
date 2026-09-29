import { useEffect, useRef, useState } from 'react'

// Galería única: la primera imagen es la principal (portada), el resto son secundarias.
// Soporta arrastrar archivos, seleccionar, pegar (Ctrl+V) y reordenar arrastrando.
export default function ImageGallery({ images, onFiles, onChange }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)

  useEffect(() => {
    function onPaste(e) {
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'))
      if (files.length) {
        e.preventDefault()
        onFiles(files)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [onFiles])

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'))
    if (files.length) onFiles(files)
  }

  function moveTo(from, to) {
    if (from === to || to < 0 || to >= images.length) return
    const next = [...images]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  return (
    <div>
      <div
        className={`dropzone ${dragOver ? 'over' : ''}`}
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault()
            setDragOver(true)
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <strong>Arrastra imágenes aquí</strong>
        <span className="muted small">o haz clic para elegir · también puedes pegar con Ctrl+V · se optimizan a WebP automáticamente</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            onFiles([...e.target.files])
            e.target.value = ''
          }}
        />
      </div>

      {images.length > 0 && (
        <ul className="gallery">
          {images.map((img, i) => (
            <li
              key={img.key}
              className={`tile ${i === 0 ? 'main' : ''} ${dragIndex === i ? 'dragging' : ''}`}
              draggable={!img.uploading}
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(e) => dragIndex !== null && e.preventDefault()}
              onDrop={(e) => {
                if (dragIndex === null) return
                e.preventDefault()
                e.stopPropagation()
                moveTo(dragIndex, i)
                setDragIndex(null)
              }}
            >
              <img src={img.preview ?? img.url} alt="" />
              {img.uploading && <div className="overlay">Subiendo…</div>}
              {img.error && <div className="overlay error">Error: {img.error}</div>}
              {i === 0 && <span className="tag-main">Principal</span>}
              <div className="tile-actions">
                {i !== 0 && (
                  <button type="button" title="Hacer principal" onClick={() => moveTo(i, 0)}>★</button>
                )}
                <button type="button" title="Mover a la izquierda" onClick={() => moveTo(i, i - 1)} disabled={i === 0}>←</button>
                <button type="button" title="Mover a la derecha" onClick={() => moveTo(i, i + 1)} disabled={i === images.length - 1}>→</button>
                <button type="button" title="Quitar" onClick={() => onChange(images.filter((_, j) => j !== i))}>🗑</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
