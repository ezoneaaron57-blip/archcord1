// src/utils.js
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'

export const hashColor = (str = '') => {
  const palette = ['#5af78e','#57c7ff','#ff6ac1','#f3f99d','#9f4fff','#ff9248','#4ef0d0','#ff5f57']
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) % palette.length
  return palette[h]
}

export const initials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

export const fmtTime = (ts) => {
  if (!ts) return ''
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  return format(d, 'HH:mm')
}

export const fmtDay = (ts) => {
  if (!ts) return ''
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMMM d, yyyy')
}

export const fmtRelative = (ts) => {
  if (!ts) return ''
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  return formatDistanceToNow(d, { addSuffix: true })
}

export const fmtFull = (ts) => {
  if (!ts) return ''
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  return format(d, 'MMM d, yyyy HH:mm')
}

export const slugify = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const fileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export const isImageFile = (name = '') =>
  /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name)
