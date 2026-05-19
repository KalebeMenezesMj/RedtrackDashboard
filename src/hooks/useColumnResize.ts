import { useRef, useState, useCallback } from 'react'

/**
 * Provides index-based column-resize state + a stable mousedown handler.
 * Attach `startResize(e, colIndex)` to the onMouseDown of a resize handle.
 */
export function useColumnResize(initialWidths: number[]) {
  const [widths, setWidths] = useState(initialWidths)
  const ref = useRef(widths)
  ref.current = widths

  const startResize = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault()
    e.stopPropagation()
    const x0 = e.clientX
    const w0 = ref.current[idx]

    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(48, w0 + ev.clientX - x0)
      setWidths(prev => {
        const next = [...prev]
        next[idx] = newW
        return next
      })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  return { widths, startResize }
}
