export interface EnrichFieldDef {
  type: string
  description: string
}

export interface EnrichConfig {
  fields: Record<string, EnrichFieldDef>
}

export interface PlaceSuggestion {
  placeId: string
  text: string
  secondaryText: string
}

export interface CompanyResult {
  name: string
  homepageUrl?: string
  source: 'google' | 'manual'
  enriched: Record<string, string | number | null>
}

export interface CompanySearchProps {
  onSelect: (result: CompanyResult) => void
  placeholder?: string
  googlePlacesApiKey?: string
  /** URL of the Cloudflare Worker endpoint. Mutually exclusive with onEnrich. */
  enrichApiUrl?: string
  /**
   * Local enrichment function — use instead of enrichApiUrl for mocking,
   * testing, or Storybook. When provided, the homepage URL step is skipped
   * (no server-side scraping needed) and no network request is made.
   */
  onEnrich?: (companyName: string) => Promise<Record<string, string | number | null>>
  enrichConfig?: EnrichConfig
  theme?: 'light' | 'dark' | 'auto'
}
