'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { buildUrl, unwrap, HealthPayload, MetricDetail } from '@/lib/utils/common/actuator-helper'

export type Fetched = {
  health?: HealthPayload
  info?: any
  metrics?: { names: string[] }
  env?: any
  loggers?: any
  threaddump?: any
  logfile?: string
  metricDetail?: MetricDetail
  metricName?: string
  /** Optional map of per-endpoint HTTP status codes (e.g. { health: 503 }) */
  statusCodes?: Record<string, number>
}

export function useActuatorData(endpoint: string, actuatorPaths: string[]) {
  const [data, setData] = useState<Fetched>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMetric, setLoadingMetric] = useState(false)

  // logfile poller
  const [autoTail, setAutoTail] = useState(false)
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const results = await Promise.all(
          actuatorPaths.map(async (p) => {
            const res = await fetch(buildUrl(endpoint, p), { cache: 'no-store' })
            // We always try to parse JSON; API returns { endpoint, body } even on non-2xx
            let raw: any = null
            try {
              raw = await res.json()
            } catch {
              // leave as null if not JSON
            }
            const body = unwrap(raw)

            return [p, body, res.status] as const
          }),
        )

        if (!alive) return
        const next: Fetched = {}
        const codes: Record<string, number> = {}
        for (const [p, body, code] of results) {
          ;(next as any)[p] = body
          codes[p] = code
        }
        next.statusCodes = codes
        setData(next)
      } catch (e: any) {
        if (alive) setError(e?.message || 'Failed to fetch actuator data')
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [endpoint, actuatorPaths.join(',')])

  // Auto-refresh tail
  useEffect(() => {
    if (!autoTail) {
      if (autoTimer.current) clearInterval(autoTimer.current)
      autoTimer.current = null

      return
    }
    autoTimer.current = setInterval(async () => {
      try {
        const res = await fetch(buildUrl(endpoint, 'logfile'), { cache: 'no-store' })
        // logfile may be non-JSON upstream, but our API wraps it as JSON { body: string }
        let raw: any = null
        try {
          raw = await res.json()
        } catch {
          // if we can’t parse, just skip this tick
          return
        }
        const body = unwrap<string>(raw)
        setData((prev) => ({ ...prev, logfile: body }))
      } catch {
        // swallow polling errors
      }
    }, 5000)

    return () => {
      if (autoTimer.current) clearInterval(autoTimer.current)
      autoTimer.current = null
    }
  }, [autoTail, endpoint])

  async function loadMetric(name: string) {
    setLoadingMetric(true)
    setError(null)
    try {
      const res = await fetch(buildUrl(endpoint, `metrics/${name}`), { cache: 'no-store' })
      let raw: any = null
      try {
        raw = await res.json()
      } catch {
        // no JSON body available
      }
      const body = unwrap<MetricDetail>(raw)

      // Even if non-OK, prefer showing any parsed body; if nothing parsed, surface a soft error
      if (!res.ok && !body) {
        setError(`metrics/${name}: HTTP ${res.status}`)
      }

      setData((prev) => ({ ...prev, metricDetail: body, metricName: name }))
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch metric detail')
    } finally {
      setLoadingMetric(false)
    }
  }

  async function refreshLog() {
    try {
      const res = await fetch(buildUrl(endpoint, 'logfile'), { cache: 'no-store' })
      let raw: any = null
      try {
        raw = await res.json()
      } catch {
        // keep previous logfile if we can’t parse this tick
        return
      }
      const body = unwrap<string>(raw)
      setData((prev) => ({ ...prev, logfile: body }))
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch logfile')
    }
  }

  const health = data.health
  const components = health?.components || {}
  const summary = useMemo(() => {
    const keys = Object.keys(components)
    const statuses = keys.map((k) => components[k].status)
    const down = statuses.some((s) => s === 'DOWN' || s === 'OUT_OF_SERVICE')
    const overall = (down ? 'DOWN' : health?.status || 'UNKNOWN') as NonNullable<HealthPayload['status']>

    return { keys, overall }
  }, [components, health?.status])

  return {
    data,
    error,
    loading,
    loadingMetric,
    autoTail,
    setAutoTail,
    loadMetric,
    refreshLog,
    summary,
  }
}
