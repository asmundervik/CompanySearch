import { useCallback } from 'react'
import type { EnrichConfig } from '../components/CompanySearch/CompanySearch.types'

type EnrichSuccess = { enriched: Record<string, string | number | null> }
type EnrichFailure = { error: string }
type EnrichResult = EnrichSuccess | EnrichFailure

export function useCompanyEnrich(apiUrl: string | undefined) {
  const enrich = useCallback(
    async (
      companyName: string,
      homepageUrl?: string,
      config?: EnrichConfig
    ): Promise<EnrichResult> => {
      if (!apiUrl) return { enriched: {} }

      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName,
            homepageUrl,
            fields: config?.fields,
          }),
        })

        if (!res.ok) throw new Error(`Server returned ${res.status}`)

        const json = (await res.json()) as { enriched: Record<string, string | number | null> }
        return { enriched: json.enriched ?? {} }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Enrichment failed' }
      }
    },
    [apiUrl]
  )

  return { enrich }
}
