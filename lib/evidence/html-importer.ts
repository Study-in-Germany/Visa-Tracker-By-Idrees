import { decodeHtmlEntities, parseCommunityMessages, type ParseBatchResult, type RawCommunityMessage } from "./observation-parser";

/**
 * Parses timestamps of the form `[4:54 AM, 9/10/2026]` (WhatsApp Channel HTML export).
 */
export function parseChannelTimestamp(raw: string): Date | null {
  const m = /\[(\d{1,2}):(\d{2})\s*(AM|PM),\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\]/i.exec(raw);
  if (!m) return null;
  let hour = +m[1];
  const min = +m[2];
  const ap = m[3].toUpperCase();
  const month = +m[4] - 1;
  const day = +m[5];
  const year = +m[6];
  if (ap === "PM" && hour < 12) hour += 12;
  if (ap === "AM" && hour === 12) hour = 0;
  const dt = new Date(Date.UTC(year, month, day, hour, min));
  return Number.isFinite(dt.getTime()) ? dt : null;
}

export function extractHtmlChannelMessages(html: string): RawCommunityMessage[] {
  const messages: RawCommunityMessage[] = [];
  const regex = /<div class="post">\s*<div class="timestamp">([\s\S]*?)<\/div>\s*<div class="content">([\s\S]*?)<\/div>\s*<\/div>/gi;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const publishedAt = parseChannelTimestamp(match[1]);
    if (!publishedAt) continue;
    const content = decodeHtmlEntities(match[2].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""));
    if (!content.trim()) continue;
    messages.push({ publishedAt, text: content });
  }
  return messages;
}

export function parseHtmlChannelExport(html: string): ParseBatchResult {
  const messages = extractHtmlChannelMessages(html);
  return parseCommunityMessages(messages);
}
