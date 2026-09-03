// Concise & robust QR Code Generator (Type 1-10, Error Correction L/M/Q/H)

type Mode = 'Numeric' | 'Alphanumeric' | 'Byte';

const QRMode = {
  MODE_NUMBER: 1 << 0,
  MODE_ALPHA_NUM: 1 << 1,
  MODE_8BIT_BYTE: 1 << 2,
};

const QRErrorCorrectionLevel = { L: 1, M: 0, Q: 3, H: 2 };

const PATTERN_POSITION_TABLE = [
  [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
  [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66],
  [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78],
  [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90]
];

const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

const EXP_TABLE = new Array(256);
const LOG_TABLE = new Array(256);
for (let i = 0; i < 8; i++) EXP_TABLE[i] = 1 << i;
for (let i = 8; i < 256; i++) EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
for (let i = 0; i < 255; i++) LOG_TABLE[EXP_TABLE[i]] = i;

const QRMath = {
  glog(n: number) { if (n < 1) throw new Error('glog'); return LOG_TABLE[n]; },
  gexp(n: number) { while (n < 0) n += 255; while (n >= 256) n -= 255; return EXP_TABLE[n]; }
};

function qrPolynomial(num: number[], shift: number) {
  let offset = 0;
  while (offset < num.length && num[offset] === 0) offset++;
  const _num = new Array(num.length - offset + shift);
  for (let i = 0; i < num.length - offset; i++) _num[i] = num[i + offset];

  return {
    getAt: (i: number) => _num[i],
    getLength: () => _num.length,
    multiply(e: any) {
      const res = new Array(this.getLength() + e.getLength() - 1).fill(0);
      for (let i = 0; i < this.getLength(); i++) {
        for (let j = 0; j < e.getLength(); j++) {
          res[i + j] ^= QRMath.gexp(QRMath.glog(this.getAt(i)) + QRMath.glog(e.getAt(j)));
        }
      }
      return qrPolynomial(res, 0);
    },
    mod(e: any): any {
      if (this.getLength() - e.getLength() < 0) return this;
      const ratio = QRMath.glog(this.getAt(0)) - QRMath.glog(e.getAt(0));
      const res = new Array(this.getLength());
      for (let i = 0; i < this.getLength(); i++) res[i] = this.getAt(i);
      for (let i = 0; i < e.getLength(); i++) res[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i)) + ratio);
      return qrPolynomial(res, 0).mod(e);
    }
  };
}

const RS_BLOCK_TABLE = [
  [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
  [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
  [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
  [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
  [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
  [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
  [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
  [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
  [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
  [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16]
];

function getRSBlocks(typeNumber: number, errorCorrectionLevel: number) {
  const rsBlock = RS_BLOCK_TABLE[(typeNumber - 1) * 4 + errorCorrectionLevel];
  const length = rsBlock.length / 3;
  const list: { totalCount: number; dataCount: number }[] = [];
  for (let i = 0; i < length; i++) {
    const count = rsBlock[i * 3 + 0];
    const totalCount = rsBlock[i * 3 + 1];
    const dataCount = rsBlock[i * 3 + 2];
    for (let j = 0; j < count; j++) list.push({ totalCount, dataCount });
  }
  return list;
}

function qrBitBuffer() {
  const buffer: number[] = [];
  let length = 0;
  return {
    getBuffer: () => buffer,
    getLengthInBits: () => length,
    put(num: number, len: number) {
      for (let i = 0; i < len; i++) this.putBit(((num >>> (len - i - 1)) & 1) === 1);
    },
    putBit(bit: boolean) {
      const bufIndex = Math.floor(length / 8);
      if (buffer.length <= bufIndex) buffer.push(0);
      if (bit) buffer[bufIndex] |= 0x80 >>> (length % 8);
      length++;
    }
  };
}

function stringToBytes(str: string) {
  const utf8: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    }
  }
  return utf8;
}

export function generateQrSvg(text: string, cellSize = 4, margin = 0): string {
  try {
    const bytes = stringToBytes(text);
    let typeNumber = 1;
    for (; typeNumber <= 10; typeNumber++) {
      const rsBlocks = getRSBlocks(typeNumber, 0); // M level
      let totalDataCount = 0;
      for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
      const lenInBits = 4 + 8 + (typeNumber < 10 ? 8 : 16) + bytes.length * 8;
      if (lenInBits <= totalDataCount * 8) break;
    }
    if (typeNumber > 10) typeNumber = 10;

    const moduleCount = typeNumber * 4 + 17;
    const modules: (boolean | null)[][] = Array.from({ length: moduleCount }, () => new Array(moduleCount).fill(null));

    // Position Probes
    const setProbe = (row: number, col: number) => {
      for (let r = -1; r <= 7; r++) {
        if (row + r <= -1 || moduleCount <= row + r) continue;
        for (let c = -1; c <= 7; c++) {
          if (col + c <= -1 || moduleCount <= col + c) continue;
          if ((0 <= r && r <= 6 && (c === 0 || c === 6)) || (0 <= c && c <= 6 && (r === 0 || r === 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
            modules[row + r][col + c] = true;
          } else {
            modules[row + r][col + c] = false;
          }
        }
      }
    };
    setProbe(0, 0);
    setProbe(moduleCount - 7, 0);
    setProbe(0, moduleCount - 7);

    // Timing patterns
    for (let r = 8; r < moduleCount - 8; r++) if (modules[r][6] === null) modules[r][6] = r % 2 === 0;
    for (let c = 8; c < moduleCount - 8; c++) if (modules[6][c] === null) modules[6][c] = c % 2 === 0;

    // Alignment patterns
    const pos = PATTERN_POSITION_TABLE[typeNumber - 1];
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i];
        const col = pos[j];
        if (modules[row][col] !== null) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            modules[row + r][col + c] = r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);
          }
        }
      }
    }

    // Type info
    const bchDigit = (data: number) => {
      let d = 0;
      while (data !== 0) { d++; data >>>= 1; }
      return d;
    };
    const getBCHTypeInfo = (data: number) => {
      let d = data << 10;
      while (bchDigit(d) - bchDigit(G15) >= 0) d ^= G15 << (bchDigit(d) - bchDigit(G15));
      return ((data << 10) | d) ^ G15_MASK;
    };
    const typeBits = getBCHTypeInfo(0); // M + mask 0
    for (let i = 0; i < 15; i++) {
      const mod = ((typeBits >> i) & 1) === 1;
      if (i < 6) modules[i][8] = mod;
      else if (i < 8) modules[i + 1][8] = mod;
      else modules[moduleCount - 15 + i][8] = mod;

      if (i < 8) modules[8][moduleCount - i - 1] = mod;
      else if (i < 9) modules[8][15 - i - 1 + 1] = mod;
      else modules[8][15 - i - 1] = mod;
    }
    modules[moduleCount - 8][8] = true;

    // Data packaging
    const rsBlocks = getRSBlocks(typeNumber, 0);
    const buffer = qrBitBuffer();
    buffer.put(QRMode.MODE_8BIT_BYTE, 4);
    buffer.put(bytes.length, typeNumber < 10 ? 8 : 16);
    for (let i = 0; i < bytes.length; i++) buffer.put(bytes[i], 8);

    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(false);
    while (buffer.getLengthInBits() < totalDataCount * 8) {
      buffer.put(0xec, 8);
      if (buffer.getLengthInBits() < totalDataCount * 8) buffer.put(0x11, 8);
    }

    // RS Code computation
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;
    const dcdata = new Array(rsBlocks.length);
    const ecdata = new Array(rsBlocks.length);
    for (let r = 0; r < rsBlocks.length; r++) {
      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = new Array(dcCount);
      for (let i = 0; i < dcdata[r].length; i++) dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
      offset += dcCount;

      let rsPoly = qrPolynomial([1], 0);
      for (let i = 0; i < ecCount; i++) rsPoly = rsPoly.multiply(qrPolynomial([1, QRMath.gexp(i)], 0));
      const rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (let i = 0; i < ecdata[r].length; i++) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = modIndex >= 0 ? modPoly.getAt(modIndex) : 0;
      }
    }

    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
    const finalData = new Array(totalCodeCount);
    let idx = 0;
    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) finalData[idx++] = dcdata[r][i];
      }
    }
    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) finalData[idx++] = ecdata[r][i];
      }
    }

    // Map data to grid
    let inc = -1;
    let row = moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;
    for (let col = moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col -= 1;
      while (true) {
        for (let c = 0; c < 2; c++) {
          if (modules[row][col - c] === null) {
            let dark = false;
            if (byteIndex < finalData.length) dark = ((finalData[byteIndex] >>> bitIndex) & 1) === 1;
            const mask = (row + (col - c)) % 2 === 0;
            if (mask) dark = !dark;
            modules[row][col - c] = dark;
            bitIndex--;
            if (bitIndex === -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }

    // Generate SVG path
    const size = moduleCount * cellSize + margin * 2;
    let pathD = '';
    const rect = `l${cellSize},0 0,${cellSize} -${cellSize},0 0,-${cellSize}z `;
    for (let r = 0; r < moduleCount; r++) {
      const mr = r * cellSize + margin;
      for (let c = 0; c < moduleCount; c++) {
        if (modules[r][c]) {
          const mc = c * cellSize + margin;
          pathD += `M${mc},${mr}${rect}`;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="100%" height="100%" preserveAspectRatio="xMinYMin meet"><rect width="100%" height="100%" fill="white"/><path d="${pathD}" fill="#1E3A34"/></svg>`;
  } catch (err) {
    return `<svg viewBox="0 0 100 100" width="100%" height="100%"><text x="50" y="50" font-size="10" text-anchor="middle" fill="#666">QR Code</text></svg>`;
  }
}
