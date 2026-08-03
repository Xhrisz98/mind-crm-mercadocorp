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

export type EstadoFactura = 'pendiente' | 'pagado' | 'anulado'

export type MedioPago = 'tarjeta_debito' | 'tarjeta_credito' | 'transferencia' | 'efectivo' | 'canje'

export interface Compra {
  id: number
  contacto_id: number
  producto: string
  precio: number | null
  canal: string | null
  notas: string | null
  vendedor_id: number | null
  fecha_compra: string
  numero_factura: string | null
  estado: EstadoFactura
  medio_pago: MedioPago | null
  vendedor_nombre?: string
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

export type Periodo = 'hoy' | 'semana' | 'mes' | 'total'

export interface VentaPorDia {
  fecha: string
  total: number
}

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

export type TipoCliente = 'blackbull' | 'gift_card'

export interface ProgramaCliente {
  id: number
  tipo_cliente: TipoCliente
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
  fecha_carga: string
  cargado_por: number | null
}

export interface ProgramaClientesKpis {
  total_blackbull_activos: number
  total_gift_card_activos: number
  pct_opt_in_email: number
  pct_opt_in_sms: number
  pct_wallet: number
  nuevos_este_mes: number
  inactivos_90_dias: number
}

export interface SegmentoFiltros {
  tipo_cliente?: TipoCliente
  activo?: boolean
  tiene_wallet?: boolean
  signup_desde?: string
  signup_hasta?: string
  accion_desde?: string
  accion_hasta?: string
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
