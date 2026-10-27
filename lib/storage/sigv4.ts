import { createHash, createHmac } from "node:crypto";

const sha256 = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
const hmac = (key: string | Uint8Array, data: string) => createHmac("sha256", key).update(data).digest();

/** RFC 3986 encoding as S3 expects it: encodeURIComponent plus !'()*. */
const encode = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

export const hashPayload = sha256;

export type SignInput = {
  method: string;
  url: URL;
  headers: Record<string, string>;
  /** Hex SHA-256 of the body ("" body hashes to e3b0c442…). */
  payloadHash: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  date?: Date;
};

/** AWS Signature V4 for S3. Returns the headers to send, including Authorization. */
export function signS3Request(input: SignInput): Record<string, string> {
  const { method, url, region, accessKeyId, secretAccessKey, payloadHash } = input;
  const amzDate = (input.date ?? new Date()).toISOString().replace(/[:-]|\.\d{3}/g, "");
  const day = amzDate.slice(0, 8);

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.headers)) headers[k.toLowerCase()] = v.trim();
  headers.host = url.host;
  headers["x-amz-content-sha256"] = payloadHash;
  headers["x-amz-date"] = amzDate;

  const names = Object.keys(headers).sort();
  const canonicalHeaders = names.map((n) => `${n}:${headers[n]}\n`).join("");
  const signedHeaders = names.join(";");
  const canonicalUri = url.pathname.split("/").map((seg) => encode(decodeURIComponent(seg))).join("/") || "/";
  const canonicalQuery = [...url.searchParams.entries()]
    .map(([k, v]) => [encode(k), encode(v)] as const)
    .sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const canonicalRequest = [method, canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${day}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const kSigning = hmac(hmac(hmac(hmac("AWS4" + secretAccessKey, day), region), "s3"), "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return headers;
}
