export type Rol = 'ventas' | 'comercial' | 'admin'

export type Canal = 'whatsapp' | 'telegram' | 'messenger' | 'instagram' | 'web' | 'presencial'

export type EstadoLead =
  | 'inicial'
  | 'nuevo'
  | 'contactado'
  | 'interesado'
  | 'en_atencion_humana'
  | 'en_negociacion'
  | 'cliente'
  | 'perdido'

export type LeadScore = 'frio' | 'tibio' | 'caliente' | 'cliente'

export interface UsuarioCRM {
  id: number
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  puede_eliminar: boolean
}

export interface Contacto {
  id: number
  canal_user_id: string
  canal: Canal
  nombre: string
  telefono: string | null
  email: string | null
  estado_lead: EstadoLead
  fecha_primer_contacto: string
  fecha_ultima_interaccion: string
  fecha_cambio_estado: string | null
  notas_internas: string | null
  vendedor_asignado_id: number | null
  lead_score: LeadScore
  lead_score_manual?: boolean
  agente_pausado: boolean
  pausa_hasta: string | null
  vendedor_nombre?: string
  whatsapp_number?: string | null
  instagram_id?: string | null
  facebook_id?: string | null
  etiquetas?: Etiqueta[]
  origen?: 'automatico' | 'manual'
}

export interface Nota {
  id: number
  contacto_id: number
  contenido: string
  revisada: boolean
  usuario_id: number | null
  fecha_creacion: string
  usuario_nombre?: string
}

export interface ContactoVinculado {
  vinculacion_id: number
  fecha_vinculacion: string
  id: number
  nombre: string
  canal: Canal
  telefono: string | null
  canal_user_id: string
}

export interface SugerenciaVinculacion {
  id: number
  nombre: string
  canal: Canal
  telefono: string | null
}

export interface MensajeHistorial {
  id: number
  id_contacto: number
  canal: Canal
  rol: 'user' | 'assistant' | 'system' | 'vendedor'
  contenido: string
  timestamp: string
  imagen_url?: string | null
}

export interface Etiqueta {
  id: number
  nombre: string
  color: string
  creado_por: number | null
  fecha_creacion: string
}

export interface ActivityLog {
  id: number
  usuario_id: number
  contacto_id: number | null
  accion: string
  valor_anterior: string | null
  valor_nuevo: string | null
  timestamp: string
  usuario_nombre?: string
}

// Pipeline de Negocios — etapas personalizables por cliente vía datos (ver
// scripts/001_schema_mercadocorp.sql sección 3). El código nunca debe
// comparar por `nombre`; usar es_estado_ganado/es_estado_perdido para
// identificar los estados terminales, y `orden` para las columnas del Kanban.
export interface PipelineEstado {
  id: number
  nombre: string
  orden: number
  probabilidad_cierre: number
  es_estado_ganado: boolean
  es_estado_perdido: boolean
  color: string
}

export interface Negocio {
  id: number
  contacto_id: number | null
  nombre: string
  monto: number
  pipeline_estado_id: number
  descripcion_servicio: string | null
  fecha_cierre_estimada: string | null
  vendedor_asignado_id: number | null
  fecha_creacion: string
  fecha_actualizacion: string
  contacto_nombre?: string | null
  vendedor_nombre?: string | null
  pipeline_estado_nombre?: string
  pipeline_estado_color?: string
  pipeline_estado_orden?: number
  es_estado_ganado?: boolean
  es_estado_perdido?: boolean
}

export interface FunnelEtapa {
  estado: EstadoLead
  count: number
}

export interface ConversionCanal {
  canal: Canal
  total: number
  clientes: number
  tasa: number
}

// Métricas propias de /leads/metricas — el funnel es una foto de la
// distribución actual de estado_lead (no un análisis de cohorte por fecha de
// entrada a cada etapa). Ver app/api/leads/metricas/route.ts.
export interface LeadsMetricas {
  periodo: Periodo
  total_leads: number
  funnel: FunnelEtapa[]
  perdidos: number
  leads_por_canal: Record<string, number>
  conversion_rate: number
  conversion_por_canal: ConversionCanal[]
  // Vacío para rol 'ventas' (ver ruta): el desglose por vendedor no aporta
  // nada cuando el usuario ya ve solo sus propios leads.
  leads_por_vendedor: { vendedor_nombre: string; count: number }[]
}

export type Periodo = 'hoy' | 'semana' | 'mes' | 'total'

export interface VentaPorDia {
  fecha: string
  total: number
}

// Ligado a compras_crm (descartada). Se mantiene solo para que /dashboard siga
// compilando hasta que la sección de facturación se reemplace por las métricas
// de negocios/campañas/proyectos del Bloque 7.
// PENDIENTE Bloque 7: app/api/dashboard/route.ts consulta compras_crm en runtime
// (SUM/COUNT/GROUP BY sobre esa tabla) para ventas_periodo, facturas_emitidas,
// ticket_promedio, por_cobrar, ventas_por_dia, distribucion_medio_pago,
// top_productos y facturacion_por_vendedor. Al eliminar compras_crm, esas
// queries van a fallar y toda la sección de facturación de /dashboard
// (incluye PaymentMethodDonutChart) queda rota hasta que Bloque 7 la
// reconstruya sobre negocios/campañas/proyectos. Compila hoy; falla en runtime.
export type MedioPago = 'tarjeta_debito' | 'tarjeta_credito' | 'transferencia' | 'efectivo' | 'canje'

export interface DistribucionMedioPago {
  medio_pago: MedioPago | null
  total: number
}

export interface TopProducto {
  producto: string
  cantidad: number
  monto: number
}

export interface FacturacionPorVendedor {
  vendedor_nombre: string
  cantidad_facturas: number
  monto_total: number
}

export interface DashboardMetrics {
  periodo: Periodo
  total_leads: number
  leads_hoy: number
  leads_semana: number
  leads_por_estado: Record<EstadoLead, number>
  leads_por_canal: Record<Canal, number>
  conversion_rate: number
  ventas_periodo: number
  facturas_emitidas: number
  ticket_promedio: number
  por_cobrar: number
  /** % vs. el período anterior de igual duración. null si el período anterior no tuvo ventas (división por cero), o si periodo='total'. */
  ventas_comparativo_pct: number | null
  ventas_por_dia: VentaPorDia[]
  distribucion_medio_pago: DistribucionMedioPago[]
  top_productos: TopProducto[]
  facturacion_por_vendedor: FacturacionPorVendedor[]
}

// Filtros de segmentación de contactos para email marketing. A diferencia
// del CRM de Bullpadel (que segmentaba sobre `programa_clientes`, una base
// de lealtad de e-commerce), acá se segmenta directo sobre `contactos`.
export interface SegmentoFiltros {
  estado_lead?: EstadoLead
  canal?: Canal
  lead_score?: LeadScore
  vendedor_asignado_id?: number
  contacto_desde?: string
  contacto_hasta?: string
}

export interface SegmentoEmail {
  id: number
  nombre: string
  filtros: SegmentoFiltros
  creado_por: number | null
  fecha_creacion: string
  creado_por_nombre?: string
}

export interface PlantillaEmail {
  id: number
  nombre: string
  asunto: string | null
  contenido_html: string
  creado_por: number | null
  fecha_creacion: string
}

export type EstadoCampanaEmail = 'borrador' | 'enviando' | 'enviada' | 'error'

export interface CampanaEmail {
  id: number
  nombre: string
  asunto: string
  contenido_html: string
  segmento_id: number | null
  destinatarios_manual_ids: number[] | null
  destinatarios_count: number
  enviados_count: number
  fallidos_count: number
  estado: EstadoCampanaEmail
  creado_por: number | null
  fecha_creacion: string
  fecha_envio: string | null
  segmento_nombre?: string
}

export interface ConfiguracionIntegracionesView {
  brevo_api_key_mask: string | null
  brevo_sender_email: string
  brevo_sender_name: string
  configurado: boolean
}

export interface JWTPayload {
  sub: string
  email: string
  nombre: string
  rol: Rol
  puede_eliminar: boolean
  iat: number
  exp: number
}
