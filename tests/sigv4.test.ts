import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPayload, signS3Request } from "../lib/storage/sigv4";

// Worked example from the AWS S3 docs ("Signature Calculations for the Authorization Header", GET Object with Range).
describe("S3 SigV4 signer", () => {
  it("reproduces the AWS documented signature", () => {
    const headers = signS3Request({
      method: "GET",
      url: new URL("https://examplebucket.s3.amazonaws.com/test.txt"),
      headers: { range: "bytes=0-9" },
      payloadHash: hashPayload(""),
      region: "us-east-1",
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      date: new Date("2013-05-24T00:00:00Z"),
    });
    assert.match(headers.authorization, /Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41$/);
    assert.match(headers.authorization, /SignedHeaders=host;range;x-amz-content-sha256;x-amz-date,/);
  });
});
