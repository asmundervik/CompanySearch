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
  enrichApiUrl?: string
  enrichConfig?: EnrichConfig
  theme?: 'light' | 'dark' | 'auto'
}
