export function sitePath(path: string, base: string) {
  const normalized = base.endsWith('/') ? base : `${base}/`;
  if (!path || path === '/') return normalized;
  if (path.startsWith('#')) return `${normalized}${path}`;
  return asset(path, normalized);
}

export function asset(path: string, base: string) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (normalizedPath === normalizedBase || normalizedPath.startsWith(`${normalizedBase}/`)) {
    return normalizedPath;
  }
  return `${normalizedBase}${normalizedPath}`;
}
