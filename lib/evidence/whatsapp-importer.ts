import { inflateRawSync } from "node:zlib";
import { parseCommunityMessages, type ParseBatchResult, type RawCommunityMessage } from "./observation-parser";

/**
 * Minimal pure-Node ZIP entry extractor for WhatsApp `.zip` exports (stored or deflated).
 */
export function extractTextFromZipBuffer(zipBuffer: Buffer, preferredNames = ["chat.txt"]): string {
  // Locate End of Central Directory signature (0x06054b50)
  let eocdOffset = -1;
  const minSearch = Math.max(0, zipBuffer.length - 65_557);
  for (let i = zipBuffer.length - 22; i >= minSearch; i--) {
    if (zipBuffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) {
    throw new Error("Invalid ZIP archive: EOCD header not found.");
  }

  const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);

  let cursor = cdOffset;
  let fallbackText: string | null = null;

  for (let idx = 0; idx < totalEntries && cursor + 46 <= zipBuffer.length; idx++) {
    if (zipBuffer.readUInt32LE(cursor) !== 0x02014b50) break;

    const compressionMethod = zipBuffer.readUInt16LE(cursor + 10);
    const compressedSize = zipBuffer.readUInt32LE(cursor + 20);
    const fileNameLen = zipBuffer.readUInt16LE(cursor + 28);
    const extraLen = zipBuffer.readUInt16LE(cursor + 30);
    const commentLen = zipBuffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(cursor + 42);
    const fileName = zipBuffer.subarray(cursor + 46, cursor + 46 + fileNameLen).toString("utf8");

    cursor += 46 + fileNameLen + extraLen + commentLen;

    const lower = fileName.toLowerCase();
    if (!lower.endsWith(".txt") && !lower.endsWith(".md")) continue;

    if (zipBuffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) continue;
    const localNameLen = zipBuffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = zipBuffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const compressedSlice = zipBuffer.subarray(dataStart, dataStart + compressedSize);

    let rawBytes: Buffer;
    if (compressionMethod === 0) {
      rawBytes = compressedSlice;
    } else if (compressionMethod === 8) {
      rawBytes = inflateRawSync(compressedSlice);
    } else {
      continue;
    }

    const text = rawBytes.toString("utf8");
    if (preferredNames.includes(lower)) return text;
    if (!fallbackText) fallbackText = text;
  }

  if (!fallbackText) {
    throw new Error("No WhatsApp chat.txt file found inside ZIP archive.");
  }
  return fallbackText;
}

function parseWhatsAppLineDate(datePart: string, timePart: string, ampm?: string): Date | null {
  const d = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(datePart.trim());
  const t = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(timePart.trim());
  if (!d || !t) return null;

  let month = +d[1] - 1;
  let day = +d[2];
  // Auto-handle DD/MM vs MM/DD when first component exceeds 12
  if (+d[1] > 12 && +d[2] <= 12) {
    day = +d[1];
    month = +d[2] - 1;
  }
  let year = +d[3];
  if (year < 100) year += 2000;

  let hour = +t[1];
  const min = +t[2];
  const sec = t[3] ? +t[3] : 0;
  if (ampm) {
    const up = ampm.toUpperCase();
    if (up === "PM" && hour < 12) hour += 12;
    if (up === "AM" && hour === 12) hour = 0;
  }

  const dt = new Date(Date.UTC(year, month, day, hour, min, sec));
  return Number.isFinite(dt.getTime()) ? dt : null;
}

/** Parses WhatsApp `.txt` export messages into normalized `RawCommunityMessage[]`. */
export function extractWhatsAppMessages(chatText: string): RawCommunityMessage[] {
  const headerRe = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?)(?:\s*(AM|PM))?\]\s*([^:]+):\s*(.*)$/i;
  const messages: RawCommunityMessage[] = [];
  let current: RawCommunityMessage | null = null;

  for (const rawLine of chatText.split(/\r?\n/)) {
    const cleanLine = rawLine.replace(/^\uFEFF/, "");
    const m = headerRe.exec(cleanLine);
    if (m) {
      if (current) messages.push(current);
      const publishedAt = parseWhatsAppLineDate(m[1], m[2], m[3]);
      if (!publishedAt) {
        current = null;
        continue;
      }
      const sender = m[4].trim();
      const firstBody = m[5];
      // Skip system lines (e.g. sender "-" or encryption banners)
      if (sender === "-" || /security code changed|end-to-end encrypted|added privacy/i.test(firstBody)) {
        current = null;
        continue;
      }
      current = { publishedAt, text: firstBody };
    } else if (current) {
      current.text += `\n${cleanLine}`;
    }
  }
  if (current) messages.push(current);
  return messages;
}

export function parseWhatsAppTextExport(chatText: string): ParseBatchResult {
  return parseCommunityMessages(extractWhatsAppMessages(chatText));
}

export function parseWhatsAppZipExport(zipBuffer: Buffer): ParseBatchResult {
  const chatText = extractTextFromZipBuffer(zipBuffer);
  return parseWhatsAppTextExport(chatText);
}
