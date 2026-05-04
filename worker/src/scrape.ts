/**
 * Fetches a URL server-side and returns stripped plain text.
 * Running this in the Cloudflare Worker avoids CORS entirely — the browser
 * only ever sends the URL string; the actual HTTP request never leaves the
 * server boundary.
 */
export async function fetchHomepageText(url: string, maxChars = 3000): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CompanySearchBot/1.0 (company enrichment; not a crawler)' },
    redirect: 'follow',
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const html = await res.text()

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

  return text.slice(0, maxChars)
}
