import { useState, useEffect, useRef, useCallback, useId } from 'react'
import type { CompanySearchProps, CompanyResult, PlaceSuggestion } from './CompanySearch.types'
import { useGooglePlaces } from '../../hooks/useGooglePlaces'
import { useCompanyEnrich } from '../../hooks/useCompanyEnrich'
import styles from './CompanySearch.module.css'

// ─── State machine ────────────────────────────────────────────────────────────

type Phase =
  | { kind: 'idle' }
  | { kind: 'homepage'; name: string }
  | { kind: 'enriching'; name: string; source: 'google' | 'manual'; homepageUrl?: string }
  | { kind: 'done'; result: CompanyResult }
  | { kind: 'error'; name: string; source: 'google' | 'manual'; homepageUrl?: string; message: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function labelFromKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconExternalLink() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function IconSpinner() {
  return (
    <svg className={styles.spinner} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  )
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className={styles.card} aria-busy="true" aria-label="Loading company information">
      <div className={styles.cardHeader}>
        <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
        <div className={`${styles.skeleton} ${styles.skeletonBadge}`} />
      </div>
      <div className={`${styles.skeleton} ${styles.skeletonSubtitle}`} />
      <div className={styles.cardDivider} />
      <div className={`${styles.skeleton} ${styles.skeletonText}`} />
      <div className={`${styles.skeleton} ${styles.skeletonTextShort}`} />
      <div className={styles.cardDivider} />
      <div className={styles.cardMeta}>
        <div className={`${styles.skeleton} ${styles.skeletonMeta}`} />
        <div className={`${styles.skeleton} ${styles.skeletonMeta}`} />
        <div className={`${styles.skeleton} ${styles.skeletonMeta}`} />
      </div>
    </div>
  )
}

// ─── Result card ──────────────────────────────────────────────────────────────

// Fields that get a dedicated meta-row slot (icon + compact value)
const META_FIELDS = new Set(['employeeRange', 'headquarters', 'founded'])
const META_ICONS: Record<string, string> = {
  employeeRange: '👥',
  headquarters: '📍',
  founded: '📅',
}

function ResultCard({ result }: { result: CompanyResult }) {
  const { name, enriched } = result
  const domain = enriched['domain']
  const industry = enriched['industry']
  const subIndustry = enriched['subIndustry']
  const description = enriched['description']

  // Fields that don't fit the known layout are rendered generically
  const knownKeys = new Set(['domain', 'industry', 'subIndustry', 'description', ...META_FIELDS])
  const extraEntries = Object.entries(enriched).filter(
    ([key, val]) => !knownKeys.has(key) && val != null
  )
  const metaEntries = [...META_FIELDS]
    .map((key) => ({ key, value: enriched[key] }))
    .filter((e) => e.value != null)

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{name}</h2>
        {domain && typeof domain === 'string' && (
          <a
            href={`https://${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cardDomain}
          >
            {domain}
            <IconExternalLink />
          </a>
        )}
      </div>

      {(industry || subIndustry) && (
        <p className={styles.cardIndustry}>
          {[industry, subIndustry].filter(Boolean).join(' · ')}
        </p>
      )}

      {description && (
        <>
          <div className={styles.cardDivider} />
          <p className={styles.cardDescription}>{String(description)}</p>
        </>
      )}

      {metaEntries.length > 0 && (
        <>
          <div className={styles.cardDivider} />
          <div className={styles.cardMeta}>
            {metaEntries.map(({ key, value }) => (
              <div key={key} className={styles.cardMetaItem}>
                <span className={styles.cardMetaIcon}>{META_ICONS[key]}</span>
                <div>
                  <span className={styles.cardMetaLabel}>{labelFromKey(key)}</span>
                  <span className={styles.cardMetaValue}>{String(value)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {extraEntries.length > 0 && (
        <>
          <div className={styles.cardDivider} />
          <dl className={styles.cardExtras}>
            {extraEntries.map(([key, value]) => (
              <div key={key} className={styles.cardExtraItem}>
                <dt className={styles.cardExtraLabel}>{labelFromKey(key)}</dt>
                <dd className={styles.cardExtraValue}>{String(value)}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CompanySearch({
  onSelect,
  placeholder = 'Search for a company…',
  googlePlacesApiKey,
  enrichApiUrl,
  enrichConfig,
  theme = 'auto',
}: CompanySearchProps) {
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [inputValue, setInputValue] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [homepageValue, setHomepageValue] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const { suggestions, loading: placesLoading } = useGooglePlaces(googlePlacesApiKey, debouncedQuery)
  const { enrich } = useCompanyEnrich(enrichApiUrl)

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(inputValue), 300)
    return () => clearTimeout(t)
  }, [inputValue])

  // Open/close dropdown
  useEffect(() => {
    if (phase.kind !== 'idle') {
      setDropdownOpen(false)
      return
    }
    setDropdownOpen(inputValue.trim().length > 0)
  }, [inputValue, phase.kind])

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIndex(-1)
  }, [suggestions])

  // Click outside → close dropdown
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const triggerEnrich = useCallback(
    async (name: string, source: 'google' | 'manual', homepageUrl?: string) => {
      setPhase({ kind: 'enriching', name, source, homepageUrl })
      const result = await enrich(name, homepageUrl, enrichConfig)
      if ('error' in result) {
        setPhase({ kind: 'error', name, source, homepageUrl, message: result.error })
      } else {
        const companyResult: CompanyResult = { name, homepageUrl, source, enriched: result.enriched }
        setPhase({ kind: 'done', result: companyResult })
        onSelect(companyResult)
      }
    },
    [enrich, enrichConfig, onSelect]
  )

  const confirmName = useCallback(
    (name: string, source: 'google' | 'manual') => {
      const trimmed = name.trim()
      if (!trimmed) return
      setInputValue(trimmed)
      setDropdownOpen(false)
      setActiveIndex(-1)
      if (source === 'google') {
        triggerEnrich(trimmed, 'google')
      } else {
        setPhase({ kind: 'homepage', name: trimmed })
      }
    },
    [triggerEnrich]
  )

  const reset = useCallback(() => {
    setInputValue('')
    setDebouncedQuery('')
    setPhase({ kind: 'idle' })
    setHomepageValue('')
    setActiveIndex(-1)
    setDropdownOpen(false)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen) return
    const total = suggestions.length + 1 // +1 for "use as typed"
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, total - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          confirmName((suggestions[activeIndex] as PlaceSuggestion).text, 'google')
        } else {
          confirmName(inputValue, 'manual')
        }
        break
      case 'Escape':
        setDropdownOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  const handleHomepageLookup = () => {
    const name = phase.kind === 'homepage' ? phase.name : ''
    const url = homepageValue.trim() || undefined
    triggerEnrich(name, 'manual', url)
  }

  const isConfirmed = phase.kind !== 'idle'
  const themeClass = theme === 'dark' ? styles.dark : theme === 'light' ? styles.light : ''

  return (
    <div
      ref={containerRef}
      className={`${styles.root} ${themeClass}`}
    >
      {/* Search input */}
      <div className={styles.inputWrapper}>
        <span className={styles.inputIcon}>
          {placesLoading && phase.kind === 'idle' ? <IconSpinner /> : <IconSearch />}
        </span>
        <input
          ref={inputRef}
          id={`${listboxId}-input`}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={dropdownOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          className={`${styles.input} ${isConfirmed ? styles.inputConfirmed : ''}`}
          placeholder={placeholder}
          value={inputValue}
          readOnly={isConfirmed}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (phase.kind === 'idle' && inputValue.trim()) setDropdownOpen(true)
          }}
          autoComplete="off"
          spellCheck={false}
        />
        {(inputValue || isConfirmed) && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={reset}
            aria-label="Clear"
          >
            <IconX />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {dropdownOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className={styles.dropdown}
          aria-label="Company suggestions"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              id={`${listboxId}-option-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={`${styles.dropdownItem} ${i === activeIndex ? styles.dropdownItemActive : ''}`}
              onPointerDown={(e) => {
                e.preventDefault()
                confirmName(s.text, 'google')
              }}
            >
              <span className={styles.dropdownItemMain}>{s.text}</span>
              {s.secondaryText && (
                <span className={styles.dropdownItemSub}>{s.secondaryText}</span>
              )}
            </li>
          ))}

          {/* "Use as typed" fallback — always shown */}
          <li
            id={`${listboxId}-option-${suggestions.length}`}
            role="option"
            aria-selected={activeIndex === suggestions.length}
            className={`${styles.dropdownItem} ${styles.dropdownItemFallback} ${
              activeIndex === suggestions.length ? styles.dropdownItemActive : ''
            }`}
            onPointerDown={(e) => {
              e.preventDefault()
              confirmName(inputValue, 'manual')
            }}
          >
            <span className={styles.dropdownItemMain}>
              Use &ldquo;{inputValue}&rdquo;
            </span>
            <span className={styles.dropdownItemSub}>Continue without Google data</span>
          </li>
        </ul>
      )}

      {/* Homepage field — slides in for manual entries */}
      {phase.kind === 'homepage' && (
        <div className={styles.homepagePanel}>
          <label className={styles.homepageLabel} htmlFor={`${listboxId}-homepage`}>
            Homepage URL
            <span className={styles.homepageOptional}> optional</span>
          </label>
          <p className={styles.homepageHint}>
            Adding your homepage lets us provide more accurate results.
          </p>
          <div className={styles.homepageRow}>
            <input
              id={`${listboxId}-homepage`}
              type="url"
              className={`${styles.input} ${styles.homepageInput}`}
              placeholder="https://yourcompany.com"
              value={homepageValue}
              onChange={(e) => setHomepageValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleHomepageLookup()}
              autoFocus
            />
            <button
              type="button"
              className={styles.lookupButton}
              onClick={handleHomepageLookup}
              disabled={!!homepageValue && !isValidUrl(homepageValue)}
            >
              Look up
              <IconArrowRight />
            </button>
          </div>
          {homepageValue && !isValidUrl(homepageValue) && (
            <p className={styles.homepageError}>Must be a valid https:// URL</p>
          )}
          <button
            type="button"
            className={styles.skipButton}
            onClick={() => triggerEnrich(phase.name, 'manual')}
          >
            Skip, look up by name only
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {phase.kind === 'enriching' && <SkeletonCard />}

      {/* Result card */}
      {phase.kind === 'done' && <ResultCard result={phase.result} />}

      {/* Error state */}
      {phase.kind === 'error' && (
        <div className={styles.errorPanel}>
          <p className={styles.errorMessage}>
            <strong>Could not enrich company data.</strong> {phase.message}
          </p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => triggerEnrich(phase.name, phase.source, phase.homepageUrl)}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
