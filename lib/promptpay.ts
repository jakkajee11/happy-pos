/**
 * PromptPay QR Code generator — EMVCo Merchant Presented QR Code standard
 * รองรับ PromptPay ด้วย หมายเลขโทรศัพท์ หรือ เลขประจำตัวประชาชน/นิติบุคคล
 * ไม่มี external dependencies — ใช้ CRC-16/CCITT-FALSE แบบ pure TypeScript
 */

// ─── CRC-16/CCITT-FALSE ─────────────────────────────────────────────────────
const CRC16_TABLE: number[] = (() => {
  const table: number[] = []
  for (let i = 0; i < 256; i++) {
    let crc = i << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
    }
    table.push(crc & 0xffff)
  }
  return table
})()

function crc16(data: string): string {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc = ((crc << 8) ^ CRC16_TABLE[((crc >> 8) ^ data.charCodeAt(i)) & 0xff]) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

// ─── EMV TLV helper ─────────────────────────────────────────────────────────
function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0')
  return `${id}${len}${value}`
}

// ─── PromptPay Account Normalization ────────────────────────────────────────
/**
 * แปลงหมายเลขโทรศัพท์/บัตรประชาชน เป็น format ที่ PromptPay ต้องการ
 * - โทรศัพท์ 10 หลัก: 0812345678 → 0066812345678
 * - เลขนิติบุคคล/บัตรประชาชน 13 หลัก: ใช้ตรงๆ
 */
function normalizeAccount(account: string): string {
  const digits = account.replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('0')) {
    // Mobile phone: replace leading 0 with 0066
    return `0066${digits.slice(1)}`
  }
  if (digits.length === 13) {
    // National ID or corporate tax ID
    return digits
  }
  // ใช้ตรงๆ ถ้าไม่ match
  return digits
}

// ─── Build EMV Payload ───────────────────────────────────────────────────────
/**
 * สร้าง EMV QR payload สำหรับ PromptPay
 * @param account - หมายเลขโทรศัพท์ หรือ เลขประจำตัว 13 หลัก
 * @param amount  - จำนวนเงิน (ถ้าไม่ระบุ = any amount)
 * @returns string ที่ใช้ generate QR Code
 */
export function buildPromptPayPayload(account: string, amount?: number): string {
  const normalizedAccount = normalizeAccount(account)

  // Merchant Account Information (tag 29) for PromptPay
  const accountTag = tlv('01', normalizedAccount)
  const merchantAccountInfo = tlv('29',
    tlv('00', 'A000000677010111') + // Globally Unique Identifier
    accountTag
  )

  let payload = [
    tlv('00', '01'),         // Payload Format Indicator
    tlv('01', '11'),         // Point of Initiation Method (12 = dynamic, 11 = static)
    merchantAccountInfo,
    tlv('52', '0000'),       // Merchant Category Code
    tlv('53', '764'),        // Transaction Currency (764 = THB)
    // Amount (optional)
    ...(amount !== undefined && amount > 0
      ? [tlv('54', amount.toFixed(2))]
      : []),
    tlv('58', 'TH'),         // Country Code
    tlv('59', 'HappyPOS'),   // Merchant Name
    tlv('60', 'Bangkok'),    // Merchant City
    // CRC placeholder (will be appended after)
    '6304',
  ].join('')

  const checksum = crc16(payload)
  return payload + checksum
}

/**
 * ตรวจสอบว่า account string ถูกต้องสำหรับ PromptPay
 */
export function isValidPromptPayAccount(account: string): boolean {
  const digits = account.replace(/\D/g, '')
  return digits.length === 10 || digits.length === 13
}

/**
 * แสดง account ในรูป readable (mask บางส่วน)
 * 0812345678 → 081-234-5678
 */
export function formatPromptPayAccount(account: string): string {
  const digits = account.replace(/\D/g, '')
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 13) {
    return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits.slice(12)}`
  }
  return account
}
