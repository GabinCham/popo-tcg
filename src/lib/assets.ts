export function assetUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path
  const base = import.meta.env.BASE_URL
  const relative = path.replace(/^\//, '')
  return `${base}${relative}`
}
