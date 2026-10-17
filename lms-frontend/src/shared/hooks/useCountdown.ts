import { useEffect, useState } from 'react'

export const useCountdown = (target: string | number) => {
  const end = typeof target === 'number' ? target : new Date(target).getTime()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const ms = Math.max(0, end - now)
  const s = Math.floor(ms / 1000)
  return { ms, expired: ms === 0, days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 }
}
