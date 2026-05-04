import { DEFAULT_ENRICHMENT_SCHEMA, buildResponseSchema, sanitiseResponse, type FieldDef } from './schema'
import { buildPrompt } from './prompt'
import { fetchHomepageText } from './scrape'

interface Env {
  GEMINI_API_KEY: string
  ALLOWED_ORIGIN?: string
}

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

function corsHeaders(allowedOrigin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function isValidHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function isFieldDef(v: unknown): v is FieldDef {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Record<string, unknown>)['type'] === 'string' &&
    typeof (v as Record<string, unknown>)['description'] === 'string'
  )
}

function json(body: unknown, status: number, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowedOrigin = env.ALLOWED_ORIGIN ?? 'http://localhost:5173'
    const cors = corsHeaders(allowedOrigin)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors })
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, cors)
    }

    // ── Validate & sanitise companyName ─────────────────────────────────────
    if (typeof body['companyName'] !== 'string' || !body['companyName'].trim()) {
      return json({ error: 'companyName is required' }, 400, cors)
    }
    const companyName = body['companyName']
      .replace(/[\x00-\x1f\x7f]/g, '') // strip control characters
      .slice(0, 200)
      .trim()

    // ── Resolve schema ───────────────────────────────────────────────────────
    let schema = DEFAULT_ENRICHMENT_SCHEMA
    if (body['fields'] !== undefined) {
      const raw = body['fields']
      if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
        const custom: Record<string, FieldDef> = {}
        for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
          if (isFieldDef(val)) custom[key] = val
        }
        if (Object.keys(custom).length > 0) schema = custom
      }
    }

    // ── Optional homepage scrape ─────────────────────────────────────────────
    let homepageText: string | undefined
    if (typeof body['homepageUrl'] === 'string' && isValidHttpsUrl(body['homepageUrl'])) {
      try {
        homepageText = await fetchHomepageText(body['homepageUrl'])
      } catch {
        // Non-fatal — continue without homepage context
      }
    }

    // ── Build prompt & call Gemini ───────────────────────────────────────────
    const prompt = buildPrompt(companyName, schema, homepageText)

    let geminiRes: Response
    try {
      geminiRes = await fetch(`${GEMINI_URL}?key=${env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: buildResponseSchema(schema),
          },
        }),
      })
    } catch (err) {
      console.error('Gemini fetch error:', err)
      return json({ error: 'Could not reach enrichment service' }, 502, cors)
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('Gemini API error:', geminiRes.status, errText)
      return json({ error: 'Enrichment service error' }, 502, cors)
    }

    // ── Parse & sanitise Gemini response ────────────────────────────────────
    const geminiBody = (await geminiRes.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> }
      }>
    }

    const rawText = geminiBody.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>
    } catch {
      console.error('Failed to parse Gemini output:', rawText)
      return json({ error: 'Failed to parse enrichment response' }, 502, cors)
    }

    const enriched = sanitiseResponse(parsed, schema)

    return json({ enriched }, 200, cors)
  },
}
