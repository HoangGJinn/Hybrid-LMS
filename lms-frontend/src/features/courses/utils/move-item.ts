/** Returns a copy of `list` with the element at `index` moved one step in `direction`. */
export const moveItem = <T>(list: T[], index: number, direction: -1 | 1): T[] => {
  const target = index + direction
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}