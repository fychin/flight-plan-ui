export const EMPTY_VALUE = '—'

export const formatDateTime = (value?: string) => {
  if (!value) return EMPTY_VALUE
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
