/**
 * OSC TCP stream framing using 4-byte big-endian length prefix (OSC 1.1 spec).
 * QLab expects each OSC packet to be preceded by a 32-bit unsigned integer
 * indicating the byte length of the following OSC data.
 */

export function encodePacket(oscBytes: Buffer): Buffer {
  const out = Buffer.allocUnsafe(4 + oscBytes.length);
  out.writeUInt32BE(oscBytes.length, 0);
  oscBytes.copy(out, 4);
  return out;
}

export function decodeStream(buf: Buffer): { packets: Buffer[]; remainder: Buffer } {
  const packets: Buffer[] = [];
  let offset = 0;

  while (offset + 4 <= buf.length) {
    const len = buf.readUInt32BE(offset);
    if (offset + 4 + len > buf.length) break;
    packets.push(buf.subarray(offset + 4, offset + 4 + len));
    offset += 4 + len;
  }

  return { packets, remainder: buf.subarray(offset) };
}
