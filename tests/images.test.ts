import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { IMAGE_LIMITS, ImageError, processImage, sniffImage } from "../lib/images";

const solid = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 80, b: 40 } } });

describe("image pipeline", () => {
  it("sniffs formats by magic bytes, not by name", () => {
    assert.equal(sniffImage(Buffer.from("<html>not an image</html>")), null);
    assert.equal(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])), "jpeg");
    assert.equal(sniffImage(Buffer.from("00000018667479706865696300000000", "hex")), "heic");
    assert.equal(sniffImage(Buffer.from("0000001c667479706d703432", "hex")), null); // mp4
  });

  it("rejects a non-image disguised as a JPG", async () => {
    await assert.rejects(processImage(Buffer.from("MZ this is an exe pretending to be a photo")), (e: any) => e instanceof ImageError && e.status === 415);
  });

  it("rejects a corrupt file that has a valid signature", async () => {
    const bad = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]);
    await assert.rejects(processImage(bad), ImageError);
  });

  it("rejects files over the size limit and photos that are too small", async () => {
    const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(IMAGE_LIMITS.maxBytes)]);
    await assert.rejects(processImage(big), (e: any) => e.status === 413);
    await assert.rejects(processImage(await solid(200, 200).jpeg().toBuffer()), /at least/);
  });

  it("produces three WebP variants at 320/800/1600 and never enlarges", async () => {
    const out = await processImage(await solid(2400, 1600).jpeg().toBuffer());
    assert.deepEqual(out.variants.map((v) => v.width), [320, 800, 1600]);
    for (const v of out.variants) {
      const m = await sharp(v.buffer).metadata();
      assert.equal(m.format, "webp");
      assert.equal(m.width, v.width);
    }
    const small = await processImage(await solid(1000, 700).png().toBuffer());
    assert.equal((await sharp(small.variants[2].buffer).metadata()).width, 1000);
  });

  it("applies EXIF rotation and strips metadata (including GPS)", async () => {
    const src = await solid(1200, 800)
      .withMetadata({ orientation: 6, exif: { IFD0: { Copyright: "secret-owner" } } })
      .jpeg()
      .toBuffer();
    const out = await processImage(src);
    assert.equal(out.width, 800); // orientation 6 swaps the axes
    assert.equal(out.height, 1200);
    const full = await sharp(out.variants[2].buffer).metadata();
    assert.equal(full.width, 800);
    assert.equal(full.height, 1200);
    assert.equal(full.exif, undefined);
    assert.equal(out.variants[2].buffer.includes(Buffer.from("secret-owner")), false);
  });
});
