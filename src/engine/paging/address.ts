/**
 * Pure address arithmetic for paging. No simulation state, no React — just the
 * bit-level facts a translation depends on.
 */

export interface AddressParts {
  readonly pageNumber: number;
  readonly offset: number;
}

export interface PagingGeometry {
  readonly pageSize: number;
  readonly offsetBits: number;
  readonly pageBits: number;
  readonly frameBits: number;
  readonly pageCount: number;
  readonly frameCount: number;
  /** Bytes addressable by a logical address, i.e. `2 ** logicalAddressBits`. */
  readonly logicalSize: number;
  /** Bytes addressable by a physical address. */
  readonly physicalSize: number;
}

export function isPowerOfTwo(value: number): boolean {
  return Number.isInteger(value) && value > 0 && (value & (value - 1)) === 0;
}

/** `log2` of a power of two, or -1 when the value is not one. */
export function log2Int(value: number): number {
  return isPowerOfTwo(value) ? Math.log2(value) : -1;
}

export function offsetBitsFor(pageSize: number): number {
  return log2Int(pageSize);
}

export function pageCountFor(pageSize: number, logicalAddressBits: number): number {
  return 2 ** (logicalAddressBits - offsetBitsFor(pageSize));
}

export function frameCountFor(pageSize: number, physicalAddressBits: number): number {
  return 2 ** (physicalAddressBits - offsetBitsFor(pageSize));
}

/** Split a logical address into its page number and offset. */
export function decomposeAddress(logicalAddress: number, pageSize: number): AddressParts {
  const pageNumber = Math.floor(logicalAddress / pageSize);
  return { pageNumber, offset: logicalAddress - pageNumber * pageSize };
}

/** Recombine a frame number and offset into a physical address. */
export function composePhysical(frameNumber: number, offset: number, pageSize: number): number {
  return frameNumber * pageSize + offset;
}

export function maskBits(value: number, bits: number): number {
  if (bits <= 0) return 0;
  return value & ((1 << bits) - 1);
}

/** Binary string of exactly `bits` characters. */
export function formatBinary(value: number, bits: number): string {
  if (bits <= 0) return '';
  return maskBits(value, bits).toString(2).padStart(bits, '0');
}

/** Hex string padded to the width of `bits`. */
export function formatHex(value: number, bits: number): string {
  const digits = Math.max(1, Math.ceil(bits / 4));
  return `0x${value.toString(16).toUpperCase().padStart(digits, '0')}`;
}

export function pagingGeometry(input: {
  pageSize: number;
  logicalAddressBits: number;
  physicalAddressBits: number;
}): PagingGeometry {
  const offsetBits = offsetBitsFor(input.pageSize);
  const pageBits = input.logicalAddressBits - offsetBits;
  const frameBits = input.physicalAddressBits - offsetBits;
  return {
    pageSize: input.pageSize,
    offsetBits,
    pageBits,
    frameBits,
    pageCount: 2 ** pageBits,
    frameCount: 2 ** frameBits,
    logicalSize: 2 ** input.logicalAddressBits,
    physicalSize: 2 ** input.physicalAddressBits,
  };
}
