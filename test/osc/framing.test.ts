import { describe, it, expect } from "vitest";
import { encodePacket, decodeStream } from "../../src/osc/framing.js";

describe("encodePacket", () => {
  it("prepends 4-byte big-endian length", () => {
    const data = Buffer.from([1, 2, 3, 4, 5]);
    const encoded = encodePacket(data);
    expect(encoded.length).toBe(9);
    expect(encoded.readUInt32BE(0)).toBe(5);
    expect(encoded.subarray(4)).toEqual(data);
  });

  it("handles empty buffer", () => {
    const encoded = encodePacket(Buffer.alloc(0));
    expect(encoded.length).toBe(4);
    expect(encoded.readUInt32BE(0)).toBe(0);
  });
});

describe("decodeStream", () => {
  it("decodes a single complete packet", () => {
    const payload = Buffer.from("hello");
    const stream = encodePacket(payload);
    const { packets, remainder } = decodeStream(stream);
    expect(packets).toHaveLength(1);
    expect(packets[0]).toEqual(payload);
    expect(remainder.length).toBe(0);
  });

  it("decodes multiple packets in one buffer", () => {
    const a = Buffer.from("first");
    const b = Buffer.from("second packet");
    const stream = Buffer.concat([encodePacket(a), encodePacket(b)]);
    const { packets, remainder } = decodeStream(stream);
    expect(packets).toHaveLength(2);
    expect(packets[0]).toEqual(a);
    expect(packets[1]).toEqual(b);
    expect(remainder.length).toBe(0);
  });

  it("returns incomplete tail as remainder", () => {
    const payload = Buffer.from("complete");
    const partial = Buffer.from("pa"); // incomplete header (< 4 bytes)
    const stream = Buffer.concat([encodePacket(payload), partial]);
    const { packets, remainder } = decodeStream(stream);
    expect(packets).toHaveLength(1);
    expect(remainder).toEqual(partial);
  });

  it("handles a packet split across two calls", () => {
    const payload = Buffer.from("split data");
    const full = encodePacket(payload);
    const half = full.length / 2 | 0;
    const part1 = full.subarray(0, half);
    const part2 = full.subarray(half);

    const { packets: p1, remainder: r1 } = decodeStream(part1);
    expect(p1).toHaveLength(0);

    const combined = Buffer.concat([r1, part2]);
    const { packets: p2, remainder: r2 } = decodeStream(combined);
    expect(p2).toHaveLength(1);
    expect(p2[0]).toEqual(payload);
    expect(r2.length).toBe(0);
  });

  it("round-trips through encode/decode", () => {
    const payloads = [Buffer.from("alpha"), Buffer.from("beta gamma"), Buffer.alloc(0)];
    const stream = Buffer.concat(payloads.map(encodePacket));
    const { packets } = decodeStream(stream);
    expect(packets).toHaveLength(3);
    for (let i = 0; i < payloads.length; i++) {
      expect(packets[i]).toEqual(payloads[i]);
    }
  });
});
