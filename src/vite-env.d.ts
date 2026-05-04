/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_PLACES_KEY?: string
  readonly VITE_ENRICH_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
