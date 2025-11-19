/** Normalises a claim into a string array (handles string, string[], comma/space separated, undefined) */
export function toStrArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === 'string') {
    // split on comma or whitespace

    return value
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  return []
}
