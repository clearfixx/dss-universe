/** Bound publication previews without splitting a Unicode code point. */
export function researchExcerpt(text: string): string {
  if (text.length <= 240) return text;
  let end = 0;
  let count = 0;
  for (const character of text) {
    end += character.length;
    if (++count === 240) break;
  }
  return text.slice(0, end);
}
