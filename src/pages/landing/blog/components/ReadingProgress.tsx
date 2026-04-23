import { useState, useEffect } from 'react'

export function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const total = doc.scrollHeight - doc.clientHeight
      if (!total) return
      setProgress(Math.min(100, (doc.scrollTop / total) * 100))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className="fixed top-0 left-0 h-[3px] bg-gradient-to-r from-[#0849ac] to-[#2563eb] z-[200] transition-[width] duration-100 pointer-events-none"
      style={{ width: `${progress}%` }}
      aria-hidden="true"
    />
  )
}
