type QrCodeProps = {
  value: string;
  label: string;
  size?: number;
};

const QR_LEVEL_L = [
  { version: 1, dataCodewords: 19, eccCodewords: 7 },
  { version: 2, dataCodewords: 34, eccCodewords: 10 },
  { version: 3, dataCodewords: 55, eccCodewords: 15 },
  { version: 4, dataCodewords: 80, eccCodewords: 20 },
  { version: 5, dataCodewords: 108, eccCodewords: 26 },
];

const ALIGNMENT_CENTER: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
};

export function QrCode({ value, label, size = 128 }: QrCodeProps) {
  const qr = createQrCode(value);

  if (!qr) {
    return (
      <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-gray-700 p-3 text-center text-xs text-gray-300">
        QRを生成できません
      </div>
    );
  }

  const cells = qr.modules
    .flatMap((row, y) =>
      row.map((filled, x) =>
        filled ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null
      )
    )
    .filter(Boolean);

  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      className="rounded-lg bg-white p-2"
      shapeRendering="crispEdges"
    >
      <rect width={qr.size} height={qr.size} fill="#ffffff" />
      <g fill="#111827">{cells}</g>
    </svg>
  );
}

function createQrCode(value: string): { modules: boolean[][]; size: number } | null {
  const data = Array.from(new TextEncoder().encode(value));
  const spec = QR_LEVEL_L.find(
    ({ dataCodewords }) => encodedBitLength(data.length) <= dataCodewords * 8
  );

  if (!spec) return null;

  const size = spec.version * 4 + 17;
  const modules = createMatrix(size, false);
  const reserved = createMatrix(size, false);

  placeFunctionPatterns(modules, reserved, spec.version);

  const dataCodewords = encodeDataCodewords(data, spec.dataCodewords);
  const eccCodewords = createErrorCorrection(dataCodewords, spec.eccCodewords);
  placeDataBits(modules, reserved, [...dataCodewords, ...eccCodewords]);
  placeFormatBits(modules, reserved);

  const quietSize = size + 8;
  const quietModules = createMatrix(quietSize, false);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      quietModules[y + 4][x + 4] = modules[y][x];
    }
  }

  return { modules: quietModules, size: quietSize };
}

function encodedBitLength(byteLength: number) {
  return 4 + 8 + byteLength * 8 + 4;
}

function createMatrix<T>(size: number, value: T): T[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => value));
}

function encodeDataCodewords(bytes: number[], dataCodewordCount: number) {
  const bits = [0, 1, 0, 0];
  appendBits(bits, bytes.length, 8);
  bytes.forEach((byte) => appendBits(bits, byte, 8));

  const maxBits = dataCodewordCount * 8;
  appendBits(bits, 0, Math.min(4, maxBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));
  }

  for (let pad = 0xec; codewords.length < dataCodewordCount; pad = pad === 0xec ? 0x11 : 0xec) {
    codewords.push(pad);
  }

  return codewords;
}

function appendBits(bits: number[], value: number, length: number) {
  for (let i = length - 1; i >= 0; i -= 1) {
    bits.push((value >>> i) & 1);
  }
}

function placeFunctionPatterns(modules: boolean[][], reserved: boolean[][], version: number) {
  const size = modules.length;
  placeFinder(modules, reserved, 0, 0);
  placeFinder(modules, reserved, size - 7, 0);
  placeFinder(modules, reserved, 0, size - 7);

  for (let i = 0; i < size; i += 1) {
    if (!reserved[6][i]) setModule(modules, reserved, i, 6, i % 2 === 0);
    if (!reserved[i][6]) setModule(modules, reserved, 6, i, i % 2 === 0);
  }

  for (const y of ALIGNMENT_CENTER[version]) {
    for (const x of ALIGNMENT_CENTER[version]) {
      if (reserved[y][x]) continue;
      placeAlignment(modules, reserved, x, y);
    }
  }

  setModule(modules, reserved, 8, size - 8, true);
}

function placeFinder(modules: boolean[][], reserved: boolean[][], left: number, top: number) {
  const size = modules.length;
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const x = left + dx;
      const y = top + dy;
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      reserved[y][x] = true;
      modules[y][x] =
        dx >= 0 &&
        dx <= 6 &&
        dy >= 0 &&
        dy <= 6 &&
        (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
    }
  }
}

function placeAlignment(modules: boolean[][], reserved: boolean[][], centerX: number, centerY: number) {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      setModule(
        modules,
        reserved,
        centerX + dx,
        centerY + dy,
        Math.max(Math.abs(dx), Math.abs(dy)) !== 1
      );
    }
  }
}

function setModule(
  modules: boolean[][],
  reserved: boolean[][],
  x: number,
  y: number,
  value: boolean
) {
  modules[y][x] = value;
  reserved[y][x] = true;
}

function placeDataBits(modules: boolean[][], reserved: boolean[][], codewords: number[]) {
  const size = modules.length;
  const bits = codewords.flatMap((codeword) =>
    Array.from({ length: 8 }, (_, index) => (codeword >>> (7 - index)) & 1)
  );
  let bitIndex = 0;
  let upward = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right -= 1;

    for (let vertical = 0; vertical < size; vertical += 1) {
      const y = upward ? size - 1 - vertical : vertical;
      for (let dx = 0; dx < 2; dx += 1) {
        const x = right - dx;
        if (reserved[y][x]) continue;

        const bit = bitIndex < bits.length ? bits[bitIndex] : 0;
        modules[y][x] = Boolean(bit ^ maskBit(x, y));
        bitIndex += 1;
      }
    }

    upward = !upward;
  }
}

function maskBit(x: number, y: number) {
  return (x + y) % 2 === 0 ? 1 : 0;
}

function placeFormatBits(modules: boolean[][], reserved: boolean[][]) {
  const size = modules.length;
  const bits = createFormatBits();

  for (let i = 0; i <= 5; i += 1) setModule(modules, reserved, 8, i, Boolean((bits >>> i) & 1));
  setModule(modules, reserved, 8, 7, Boolean((bits >>> 6) & 1));
  setModule(modules, reserved, 8, 8, Boolean((bits >>> 7) & 1));
  setModule(modules, reserved, 7, 8, Boolean((bits >>> 8) & 1));
  for (let i = 9; i < 15; i += 1) setModule(modules, reserved, 14 - i, 8, Boolean((bits >>> i) & 1));

  for (let i = 0; i < 8; i += 1) setModule(modules, reserved, size - 1 - i, 8, Boolean((bits >>> i) & 1));
  for (let i = 8; i < 15; i += 1) setModule(modules, reserved, 8, size - 15 + i, Boolean((bits >>> i) & 1));
}

function createFormatBits() {
  const errorCorrectionLevelL = 1;
  const mask = 0;
  const data = (errorCorrectionLevelL << 3) | mask;
  let value = data << 10;
  const generator = 0x537;

  for (let bit = 14; bit >= 10; bit -= 1) {
    if (((value >>> bit) & 1) !== 0) {
      value ^= generator << (bit - 10);
    }
  }

  return ((data << 10) | value) ^ 0x5412;
}

function createErrorCorrection(dataCodewords: number[], eccCodewordCount: number) {
  const generator = createGenerator(eccCodewordCount);
  const result = Array.from({ length: eccCodewordCount }, () => 0);

  for (const codeword of dataCodewords) {
    const factor = codeword ^ result.shift()!;
    result.push(0);

    generator.forEach((coefficient, index) => {
      result[index] ^= gfMultiply(coefficient, factor);
    });
  }

  return result;
}

function createGenerator(degree: number) {
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = [1, gfPow(2, i)];
    const product = Array.from({ length: poly.length + 1 }, () => 0);
    poly.forEach((a, ai) => {
      next.forEach((b, bi) => {
        product[ai + bi] ^= gfMultiply(a, b);
      });
    });
    poly = product;
  }
  return poly.slice(1);
}

function gfPow(value: number, exponent: number) {
  let result = 1;
  for (let i = 0; i < exponent; i += 1) {
    result = gfMultiply(result, value);
  }
  return result;
}

function gfMultiply(a: number, b: number) {
  let result = 0;
  while (b > 0) {
    if ((b & 1) !== 0) result ^= a;
    a <<= 1;
    if ((a & 0x100) !== 0) a ^= 0x11d;
    b >>>= 1;
  }
  return result;
}
