const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

export const formatItemDate = (iso: string): string => {
  const d = new Date(iso)
  const h = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const period = h < 12 ? 'AM' : 'PM'
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} tháng ${d.getMonth() + 1} ${d.getFullYear()}, ${h % 12 || 12}:${minutes} ${period}`
}