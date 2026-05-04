import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the repo at /CompanySearch/ — set base accordingly.
  // On main (local dev / other deployments) this env var is absent, so
  // base falls back to '/' and everything works as normal.
  base: (process as NodeJS.Process).env['GITHUB_PAGES'] ? '/CompanySearch/' : '/',
})
