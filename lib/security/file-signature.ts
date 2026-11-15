const FILE_SIGNATURES: Record<string, (header: Uint8Array) => boolean> = {
  "image/jpeg": (header) => header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff,
  "image/png": (header) => header.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => header[index] === byte),
  "image/webp": (header) => header.length >= 12
    && header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46
    && header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50,
  "application/pdf": (header) => header.length >= 5
    && header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46 && header[4] === 0x2d,
};

export async function hasAllowedFileSignature(file: Blob) {
  const matchesSignature = FILE_SIGNATURES[file.type];
  if (!matchesSignature) return false;
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return matchesSignature(header);
}
