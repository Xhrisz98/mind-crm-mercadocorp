// Parser CSV simple (RFC4180: comillas dobles, comas, saltos de línea dentro de campos)
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const src = text.replace(/^﻿/, '') // strip BOM

  for (let i = 0; i < src.length; i++) {
    const char = src[i]
    const next = src[i + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') { field += '"'; i++ }
      else if (char === '"') { inQuotes = false }
      else { field += char }
      continue
    }

    if (char === '"') { inQuotes = true; continue }
    if (char === ',') { row.push(field); field = ''; continue }
    if (char === '\r') continue
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue }
    field += char
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }

  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

export function parseBoolFlexible(value: string | undefined): boolean {
  if (!value) return false
  const v = value.trim().toLowerCase()
  return v === 'true' || v === 'yes' || v === 'y' || v === '1' || v === 'si' || v === 'sí'
}

export function parseDateFlexible(value: string | undefined): string | null {
  if (!value) return null
  const v = value.trim()
  if (!v) return null

  // YYYY-MM-DD
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`

  // MM/DD/YYYY
  m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const mm = m[1].padStart(2, '0')
    const dd = m[2].padStart(2, '0')
    return `${m[3]}-${mm}-${dd}`
  }

  const parsed = new Date(v)
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return null
}

export const PROGRAMA_CLIENTES_COLUMN_MAP: Record<string, string> = {
  'card': 'card',
  'active': 'activo',
  'customer id': 'customer_id',
  'card number': 'numero_tarjeta',
  'ext. card number': 'numero_tarjeta_ext',
  'first name': 'nombre',
  'last name': 'apellido',
  'phone': 'telefono',
  'email': 'email',
  'opt-in email': 'opt_in_email',
  'opt-in sms': 'opt_in_sms',
  'has wallet': 'tiene_wallet',
  'sign-up': 'fecha_signup',
  'last action': 'fecha_ultima_accion',
}

export interface ProgramaClienteCsvRow {
  card: string | null
  activo: boolean
  customer_id: string | null
  numero_tarjeta: string | null
  numero_tarjeta_ext: string | null
  nombre: string | null
  apellido: string | null
  telefono: string | null
  email: string | null
  opt_in_email: boolean
  opt_in_sms: boolean
  tiene_wallet: boolean
  fecha_signup: string | null
  fecha_ultima_accion: string | null
}

const BOOL_FIELDS = new Set(['activo', 'opt_in_email', 'opt_in_sms', 'tiene_wallet'])
const DATE_FIELDS = new Set(['fecha_signup', 'fecha_ultima_accion'])

export function mapCsvRows(rows: string[][]): ProgramaClienteCsvRow[] {
  if (rows.length === 0) return []
  const headerRow = rows[0].map((h) => h.trim().toLowerCase())
  const fieldByColIdx = headerRow.map((h) => PROGRAMA_CLIENTES_COLUMN_MAP[h] ?? null)

  return rows.slice(1).map((raw) => {
    const record: Record<string, string | boolean | null> = {
      card: null, activo: true, customer_id: null, numero_tarjeta: null, numero_tarjeta_ext: null,
      nombre: null, apellido: null, telefono: null, email: null,
      opt_in_email: false, opt_in_sms: false, tiene_wallet: false,
      fecha_signup: null, fecha_ultima_accion: null,
    }
    fieldByColIdx.forEach((field, i) => {
      if (!field) return
      const value = raw[i]
      if (BOOL_FIELDS.has(field)) record[field] = field === 'activo' && value === undefined ? true : parseBoolFlexible(value)
      else if (DATE_FIELDS.has(field)) record[field] = parseDateFlexible(value)
      else record[field] = value?.trim() || null
    })
    return record as unknown as ProgramaClienteCsvRow
  })
}
