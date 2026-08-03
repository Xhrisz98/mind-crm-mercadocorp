import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'
import { ESTADO_LABELS, LEAD_SCORE_LABELS } from '@/lib/utils'
import type { Contacto } from '@/lib/types'

const HEADERS = [
  'ID',
  'Nombre',
  'Teléfono',
  'Email',
  'Canal',
  'Estado',
  'Score',
  'Vendedor',
  'Etiquetas',
  'Fecha primer contacto',
  'Última interacción',
]

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatFecha(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin' && user.rol !== 'comercial') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado')
  const canal = searchParams.get('canal')
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')

  const conditions: string[] = []
  const params: unknown[] = []
  let idx = 1

  if (estado) {
    conditions.push(`c.estado_lead = $${idx++}`)
    params.push(estado)
  }

  if (canal) {
    conditions.push(`c.canal = $${idx++}`)
    params.push(canal)
  }

  if (desde) {
    conditions.push(`c.fecha_primer_contacto >= $${idx++}`)
    params.push(desde)
  }

  if (hasta) {
    conditions.push(`c.fecha_primer_contacto < $${idx++}::date + interval '1 day'`)
    params.push(hasta)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const leads = await query<Contacto & { etiquetas_nombres: string | null }>(
    `SELECT c.*, u.nombre as vendedor_nombre,
       (SELECT string_agg(e.nombre, ', ' ORDER BY e.nombre)
        FROM contacto_etiquetas ce
        JOIN etiquetas e ON e.id = ce.etiqueta_id
        WHERE ce.contacto_id = c.id) as etiquetas_nombres
     FROM contactos c
     LEFT JOIN usuarios_crm u ON c.vendedor_asignado_id = u.id
     ${where}
     ORDER BY c.fecha_ultima_interaccion DESC`,
    params
  )

  const rows = leads.map((lead) => [
    lead.id,
    lead.nombre,
    lead.telefono,
    lead.email,
    lead.canal,
    ESTADO_LABELS[lead.estado_lead] ?? lead.estado_lead,
    LEAD_SCORE_LABELS[lead.lead_score] ?? lead.lead_score,
    lead.vendedor_nombre ?? '',
    lead.etiquetas_nombres ?? '',
    formatFecha(lead.fecha_primer_contacto),
    formatFecha(lead.fecha_ultima_interaccion),
  ])

  const csvLines = [HEADERS, ...rows].map((row) => row.map(csvEscape).join(','))
  const csv = '﻿' + csvLines.join('\r\n')

  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const filename = `leads_bullpadel_${yyyy}${mm}${dd}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
