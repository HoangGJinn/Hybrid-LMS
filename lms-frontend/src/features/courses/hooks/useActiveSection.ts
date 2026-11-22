import { useEffect, useState } from 'react'

/** The section card nearest the top of the screen, so the course index can highlight where the student is. */
export const useActiveSection = (sectionIds: string[]): string | null => {
  const [activeId, setActiveId] = useState<string | null>(null)
  const key = sectionIds.join('|')

  useEffect(() => {
    const elements = key
      .split('|')
      .flatMap((id) => document.getElementById(`section-${id}`) ?? [])
    if (elements.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        const first = visible[0]
        if (first) setActiveId(first.target.id.replace('section-', ''))
      },
      { rootMargin: '-10% 0px -70% 0px' },
    )
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [key])

  return activeId
}