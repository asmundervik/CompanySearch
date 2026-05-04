export interface FieldDef {
  type: string
  description: string
}

export const DEFAULT_ENRICHMENT_SCHEMA: Record<string, FieldDef> = {
  domain: {
    type: 'string | null',
    description: 'Most likely public website domain, e.g. stripe.com — bare domain, no protocol',
  },
  industry: {
    type: 'string | null',
    description: 'Primary industry, e.g. Financial Technology',
  },
  subIndustry: {
    type: 'string | null',
    description: 'More specific category, e.g. Payment Processing',
  },
  description: {
    type: 'string | null',
    description: 'One sentence describing what the company does',
  },
  employeeRange: {
    type: 'string | null',
    description: 'Approximate headcount range using an en-dash, e.g. 1000–5000. Use "10000+" for very large companies.',
  },
  headquarters: {
    type: 'string | null',
    description: 'City, State/Region, Country — e.g. San Francisco, CA, USA',
  },
  founded: {
    type: 'string | null',
    description: 'Year the company was founded, e.g. 2010',
  },
}

/**
 * Builds a Gemini-compatible JSON Schema object from field definitions.
 * Used alongside responseMimeType: 'application/json' for guaranteed
 * structured output — the schema is enforced by Gemini, not just requested.
 */
export function buildResponseSchema(schema: Record<string, FieldDef>): object {
  const properties: Record<string, unknown> = {}
  for (const [key, { type }] of Object.entries(schema)) {
    const parts = type.split('|').map((t) => t.trim())
    properties[key] = parts.length === 1 ? { type: parts[0] } : { type: parts }
  }
  return {
    type: 'object',
    properties,
    required: Object.keys(schema),
  }
}

/**
 * Strips keys not in the schema and coerces values to string | number | null.
 * Prevents Gemini returning unexpected fields leaking to the client.
 */
export function sanitiseResponse(
  raw: Record<string, unknown>,
  schema: Record<string, FieldDef>
): Record<string, string | number | null> {
  const result: Record<string, string | number | null> = {}
  for (const key of Object.keys(schema)) {
    const val = raw[key]
    if (val === null || val === undefined) {
      result[key] = null
    } else if (typeof val === 'string' || typeof val === 'number') {
      result[key] = val
    } else {
      result[key] = String(val)
    }
  }
  return result
}
