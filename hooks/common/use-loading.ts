export async function withLoading<T>(setLoading: (_val: boolean) => void, fn: () => Promise<T>): Promise<T> {
  setLoading(true)
  try {
    return await fn()
  } finally {
    setLoading(false)
  }
}
