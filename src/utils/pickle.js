/**
 * Encoder mínimo do formato Python pickle (protocolo 2).
 * Suporta apenas os tipos necessários para serializar cookies Selenium:
 *   - list (array JS)
 *   - dict (objeto JS simples)
 *   - string
 *   - boolean
 *   - integer (signed 32-bit)
 *   - null / undefined → Python None
 *
 * Compatível com Python's pickle.loads() sem nenhuma dependência externa.
 */

// Opcodes do protocolo 2
const OP_PROTO           = 0x80; // \x80  — identifica o protocolo
const OP_STOP            = 0x2e; // '.'   — fim do pickle
const OP_NONE            = 0x4e; // 'N'   — None
const OP_NEWTRUE         = 0x88; // \x88  — True
const OP_NEWFALSE        = 0x89; // \x89  — False
const OP_BININT1         = 0x4b; // 'K'   — int 0-255 (1 byte)
const OP_BININT2         = 0x4d; // 'M'   — int 0-65535 (2 bytes LE)
const OP_BININT          = 0x4a; // 'J'   — int signed 32-bit (4 bytes LE)
const OP_SHORT_BINUNICODE = 0x8c; // \x8c — str com len < 256 (1 byte de tamanho)
const OP_BINUNICODE      = 0x58; // 'X'   — str com len ≥ 256 (4 bytes LE de tamanho)
const OP_MARK            = 0x28; // '('   — marca início de sequência
const OP_EMPTY_LIST      = 0x5d; // ']'   — lista vazia
const OP_APPENDS         = 0x65; // 'e'   — adiciona itens acima do MARK na lista
const OP_EMPTY_DICT      = 0x7d; // '}'   — dict vazio
const OP_SETITEMS        = 0x75; // 'u'   — adiciona pares chave/valor acima do MARK no dict

function encodeStr(s) {
  const bytes = Buffer.from(s, "utf8");
  if (bytes.length < 256) {
    return Buffer.concat([Buffer.from([OP_SHORT_BINUNICODE, bytes.length]), bytes]);
  }
  const header = Buffer.alloc(5);
  header[0] = OP_BINUNICODE;
  header.writeUInt32LE(bytes.length, 1);
  return Buffer.concat([header, bytes]);
}

function encodeInt(n) {
  if (n >= 0 && n <= 0xff) {
    return Buffer.from([OP_BININT1, n]);
  }
  if (n >= 0 && n <= 0xffff) {
    const b = Buffer.alloc(3);
    b[0] = OP_BININT2;
    b.writeUInt16LE(n, 1);
    return b;
  }
  // signed 32-bit (-2147483648 … 2147483647)
  const b = Buffer.alloc(5);
  b[0] = OP_BININT;
  b.writeInt32LE(n, 1);
  return b;
}

function encodeValue(v) {
  if (v == null)             return Buffer.from([OP_NONE]);
  if (v === true)            return Buffer.from([OP_NEWTRUE]);
  if (v === false)           return Buffer.from([OP_NEWFALSE]);
  if (typeof v === "string") return encodeStr(v);
  if (typeof v === "number" && Number.isInteger(v)) return encodeInt(v);
  throw new Error(`pickle: tipo não suportado: ${typeof v} (${String(v)})`);
}

function encodeDict(obj) {
  const parts = [Buffer.from([OP_EMPTY_DICT, OP_MARK])];
  for (const [k, v] of Object.entries(obj)) {
    parts.push(encodeStr(k));
    parts.push(encodeValue(v));
  }
  parts.push(Buffer.from([OP_SETITEMS]));
  return Buffer.concat(parts);
}

/**
 * Serializa um array de objetos simples no formato pickle do Python (protocolo 2).
 * Equivalente a `pickle.dumps(data, protocol=2)` em Python.
 *
 * @param {Object[]} list - array de objetos simples
 * @returns {Buffer} binário pickle
 */
export function pickleDumps(list) {
  if (!Array.isArray(list)) throw new Error("pickleDumps: esperava um Array");

  const parts = [
    Buffer.from([OP_PROTO, 2]), // header: protocolo 2
    Buffer.from([OP_EMPTY_LIST, OP_MARK]),
  ];

  for (const item of list) {
    if (item !== null && typeof item === "object" && !Array.isArray(item)) {
      parts.push(encodeDict(item));
    } else {
      parts.push(encodeValue(item));
    }
  }

  parts.push(Buffer.from([OP_APPENDS, OP_STOP]));
  return Buffer.concat(parts);
}
