import { useState } from 'react'
import { CompanySearch } from '../components/CompanySearch'
import type { CompanyResult } from '../components/CompanySearch'
import styles from './App.module.css'

// ─── JSON coloriser ───────────────────────────────────────────────────────────

function colorizeJson(obj: unknown): string {
  const json = JSON.stringify(obj, null, 2)
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
    .replace(/: (null)/g, ': <span class="json-null">$1</span>')
    .replace(/: (true|false)/g, ': <span class="json-bool">$1</span>')
    .replace(/: (-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [result, setResult] = useState<CompanyResult | null>(null)

  // Read API config from env vars (Vite exposes VITE_* vars at build time)
  const googleApiKey = import.meta.env.VITE_GOOGLE_PLACES_KEY as string | undefined
  const enrichApiUrl = import.meta.env.VITE_ENRICH_API_URL as string | undefined

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span className={styles.logoMark} aria-hidden="true">⬡</span>
            <span className={styles.logoText}>CompanySearch</span>
          </div>
          <a
            href="https://github.com/asmundervik/CompanySearch"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.githubLink}
            aria-label="View on GitHub"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          </a>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.hero}>
          <p className={styles.heroEyebrow}>✦ AI-powered enrichment</p>
          <h1 className={styles.heroTitle}>
            Find any company.<br />
            <span className={styles.heroAccent}>Instantly enriched.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Search by name, confirm with Google Places, and get AI-powered company data in seconds.
            Built with React, Cloudflare Workers, and Gemini Flash.
          </p>
        </div>

        <div className={styles.layout}>
          <div className={styles.componentCol}>
            <div className={styles.componentCard}>
            <div className={styles.componentCardInner}>
              <CompanySearch
                onSelect={setResult}
                googlePlacesApiKey={googleApiKey}
                enrichApiUrl={enrichApiUrl}
                placeholder="Search for a company…"
                theme="light"
              />
              {!googleApiKey && (
                <p className={styles.apiNotice}>
                  <span>ℹ️</span> No Google Places key — autocomplete disabled. You can still type any company name.
                </p>
              )}
              {!enrichApiUrl && (
                <p className={styles.apiNotice}>
                  <span>ℹ️</span> No enrichment URL — Gemini enrichment disabled. Set <code>VITE_ENRICH_API_URL</code>.
                </p>
              )}
            </div>
            </div>
          </div>

          <div className={styles.outputCol}>
            <div className={styles.outputCard}>
              <div className={styles.outputHeader}>
                <span className={styles.outputDot} style={{ background: '#ef4444' }} />
                <span className={styles.outputDot} style={{ background: '#f59e0b' }} />
                <span className={styles.outputDot} style={{ background: '#22c55e' }} />
                <span className={styles.outputTitle}>onSelect output</span>
              </div>
              <div className={styles.outputBody}>
                {result ? (
                  <pre
                    className={styles.outputJson}
                    dangerouslySetInnerHTML={{ __html: colorizeJson(result) }}
                  />
                ) : (
                  <p className={styles.outputPlaceholder}>
                    Select a company to see the result here.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>
          Open source · MIT licence ·{' '}
          <a href="https://github.com/asmundervik/CompanySearch" target="_blank" rel="noopener noreferrer">
            github.com/asmundervik/CompanySearch
          </a>
        </p>
      </footer>
    </div>
  )
}
