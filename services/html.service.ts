const BLOCK_TAGS = /(<(script|style|nav|header|footer|noscript|iframe|aside)[^>]*>[\s\S]*?<\/\2>)/gi

export function extractTextFromHtml(html: string): string {
  let text = html

  // Strip non-content blocks entirely
  text = text.replace(BLOCK_TAGS, '')

  // Tables → pipe-delimited rows
  text = text
    .replace(/<tr[^>]*>/gi, '\n')
    .replace(/<\/tr>/gi, '')
    .replace(/<t[hd][^>]*>/gi, ' | ')
    .replace(/<\/t[hd]>/gi, '')

  // Headings → newline before + after
  text = text
    .replace(/<h[1-6][^>]*>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n')

  // Lists
  text = text
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')

  // Block-level line breaks
  text = text
    .replace(/<\/?(p|div|section|article|main|blockquote)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&#\d+;/g, '')

  // Normalize whitespace
  text = text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()

  return text
}
