export type Rol = 'ventas' | 'comercial' | 'admin' | 'cliente'

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
  // Solo para rol='cliente' — qué contacto representa este login. NULL en roles internos.
  contacto_id: number | null
  // Solo presente en GET /api/usuarios (join con contactos) para mostrar a qué
  // cliente representa un login rol='cliente'.
  contacto_nombre?: string | null
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

// Campañas de publicidad — registro manual (sin integración OAuth en vivo
// con Google/Meta Ads, ver scripts/001_schema_mercadocorp.sql sección 4).
export type PlataformaAds = 'google' | 'meta'
export type EstadoCampanaPublicidad = 'activa' | 'pausada' | 'finalizada'

// 3 categorías fijas (ver scripts/002_objetivo_campanas_publicidad.sql) — cada
// una determina qué KPI se destaca en el detalle de la campaña:
// reconocimiento→CTR, trafico→CPC, conversion→costo por conversión + ROI.
export type ObjetivoCampana = 'reconocimiento' | 'trafico' | 'conversion'

export type UnidadMetrica = 'numero' | 'usd' | 'porcentaje'

// Catálogo abierto de métricas (Bloque 5 extendido) — reemplaza las columnas
// fijas impresiones/clics/conversiones/gasto de la campanas_metricas original.
// Ver scripts/003_metricas_extensibles.sql.
export interface MetricaDefinicion {
  id: number
  clave: string
  nombre: string
  unidad: UnidadMetrica
  categoria: string | null
  es_default: boolean
  activo: boolean
  creado_por: number | null
  fecha_creacion: string
  creado_por_nombre?: string | null
  // Solo en GET /api/metricas-definiciones: si ya tiene valores registrados,
  // no se puede eliminar (solo desactivar).
  tiene_valores?: boolean
}

// Valor registrado para una campaña/métrica/fecha (fila de la tabla EAV).
export interface CampanaMetricaValor {
  id: number
  campana_id: number
  metrica_definicion_id: number
  fecha: string
  valor: number
  registrado_por: number | null
  fecha_registro: string
  metrica_clave?: string
  metrica_nombre?: string
  metrica_unidad?: UnidadMetrica
  registrado_por_nombre?: string | null
}

// Catálogo de operaciones de una fórmula personalizada — extensible por
// diseño. `definicion` es JSONB libre en la BD (sin CHECK de Postgres), así
// que agregar una operación futura no toca el esquema: solo se suma una
// interfaz aquí a la unión FormulaDefinicion y un nuevo case en el
// evaluador (ver lib/formulas.ts, que documenta los 3 lugares a tocar).

// {"operacion":"ratio","numerador":[metrica_id,...],"denominador":[metrica_id,...]}
// numerador/denominador son listas porque el usuario puede sumar varias
// métricas antes de dividir (ej. (compras+conversiones)/gasto).
export interface FormulaOperacionRatio {
  operacion: 'ratio'
  numerador: number[]
  denominador: number[]
}

// {"operacion":"suma","metricas":[metrica_id,...]}
export interface FormulaOperacionSuma {
  operacion: 'suma'
  metricas: number[]
}

// {"operacion":"resta","metricas":[metrica_id,...]} — metricas[0] es la base;
// el resultado es metricas[0] - suma(metricas[1..]).
export interface FormulaOperacionResta {
  operacion: 'resta'
  metricas: number[]
}

// {"operacion":"multiplicacion","metricas":[metrica_id,...]}
export interface FormulaOperacionMultiplicacion {
  operacion: 'multiplicacion'
  metricas: number[]
}

export type FormulaDefinicion =
  | FormulaOperacionRatio
  | FormulaOperacionSuma
  | FormulaOperacionResta
  | FormulaOperacionMultiplicacion

export interface FormulaPersonalizada {
  id: number
  // Solo las fórmulas default (ctr/cpc/costo_por_conversion) tienen clave —
  // permite referenciarlas desde código (ver OBJETIVO_KPI_DESTACADO) sin
  // depender del nombre editable por el usuario.
  clave: string | null
  nombre: string
  descripcion: string | null
  unidad: UnidadMetrica
  definicion: FormulaDefinicion
  es_default: boolean
  archivada: boolean
  creado_por: number | null
  es_compartida: boolean
  fecha_creacion: string
  creado_por_nombre?: string | null
}

// Fórmula ya evaluada para una campaña específica — la devuelve el detalle de
// campaña (GET /api/campanas-publicidad/[id]), no se recalcula en el cliente.
export interface FormulaValor {
  id: number
  clave: string | null
  nombre: string
  unidad: UnidadMetrica
  es_default: boolean
  // null = no calculable (denominador en 0, o sin datos suficientes)
  valor: number | null
}

export interface CampanaPublicidad {
  id: number
  nombre: string
  plataforma: PlataformaAds
  cliente_id: number | null
  objetivo: ObjetivoCampana | null
  presupuesto: number | null
  fecha_inicio: string | null
  fecha_fin: string | null
  estado: EstadoCampanaPublicidad
  creado_por: number | null
  fecha_creacion: string
  cliente_nombre?: string | null
  creado_por_nombre?: string | null
  // Totales acumulados por métrica del catálogo, clave = metricas_definiciones.clave.
  // Reemplaza los antiguos impresiones_total/clics_total/conversiones_total/gasto_total.
  metricas_totales: Record<string, number>
  // Solo presentes en el detalle (GET /api/campanas-publicidad/[id]).
  formulas?: FormulaValor[]
  // ROI es un caso especial fuera del catálogo de fórmulas: depende de
  // negocios ganados por rango de fechas + cliente vinculado, no de valores
  // registrados en campanas_metricas_valores — no es atribución exacta por
  // campaña ni es editable/archivable como las demás fórmulas.
  ingreso_estimado?: number | null
  roi_estimado_pct?: number | null
}

export interface SerieTemporalPunto {
  fecha: string
  valores: Record<string, number>
}

export type Periodo = 'hoy' | 'semana' | 'mes' | 'total'

// KPIs de Negocios para /dashboard (Bloque 7). pipeline_valor/pipeline_ponderado son una foto
// del pipeline abierto actual (no filtran por período — no hay una noción natural de "pipeline
// de esta semana"). tasa_cierre es histórica completa (ganados/(ganados+perdidos) de siempre),
// no se filtra por período: con pocos cierres por semana el % sería ruidoso o indefinido.
// ganados_periodo usa fecha_actualizacion como proxy de "cuándo se ganó" — negocios no tiene una
// columna fecha_cierre_real, y fecha_actualizacion se actualiza en cualquier PATCH (no solo al
// cambiar de etapa), así que puede sobre-contar negocios editados en el período pero ganados
// antes. Ver tooltip junto al KPI en DashboardClient.tsx.
export interface NegociosKpis {
  pipeline_valor: number
  pipeline_ponderado: number
  ganados_periodo: number
  tasa_cierre: number
}

// KPIs de Leads para /dashboard (Bloque 7) — distintos de LeadsMetricas (/api/leads/metricas):
// total_contactos es histórico completo (universo total, sin filtro de período); los demás
// campos sí respetan el período seleccionado. tasa_conversion_negocio mide contacto→negocio
// (existe una fila en `negocios` con ese contacto_id), no contacto→estado_lead='cliente' como
// el conversion_rate de /api/leads/metricas.
export interface LeadsDashboardKpis {
  total_contactos: number
  nuevos_contactos_periodo: number
  tasa_conversion_negocio: number
  leads_por_canal: Record<string, number>
}

// KPIs de Campañas de publicidad para /dashboard (Bloque 7). null para rol='ventas' (mismo
// acceso restringido que /api/campanas-publicidad, que ya bloquea ese rol). Filtra
// cp.estado='activa' + período (campanas_metricas_valores.fecha) — ambos filtros son
// independientes entre sí.
export interface CampanasKpis {
  gasto_total: number
  conversiones_total: number
}

// KPIs de Proyectos para /dashboard (Bloque 7). Foto del estado actual (no se filtran por
// período, igual que pipeline_valor de Negocios). Sin filtro por vendedor_asignado_id — mismo
// criterio que /api/proyectos (rol='ventas' ve todos los proyectos, ver CLAUDE.md).
export interface ProyectosKpis {
  proyectos_activos: number
  tareas_vencidas: number
}

export interface DashboardMetrics {
  periodo: Periodo
  negocios: NegociosKpis
  leads: LeadsDashboardKpis
  campanas: CampanasKpis | null
  proyectos: ProyectosKpis
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
  // Solo para rol='cliente' — se valida server-side en cada endpoint de /api/portal,
  // nunca se confía en el frontend para decidir qué proyecto puede ver el cliente.
  contacto_id: number | null
  iat: number
  exp: number
}

// ============================================================================
// Proyectos (Bloque 6) — Gestor de tareas tipo Jira + Portal de cliente
// ============================================================================
// DECISIÓN DE PRODUCTO: rol='ventas' ve/edita TODOS los proyectos, sin filtro
// por vendedor_asignado_id (a diferencia de Negocios/Leads). La autorización
// fina vive a nivel de tarea individual vía Tarea.asignado_a. Ver comentario
// completo y la alternativa de aislamiento estricto en
// scripts/004_proyectos_portal_cliente.sql y CLAUDE.md.
export type EstadoProyecto = 'activo' | 'pausado' | 'completado' | 'cancelado'
export type VisibilidadCliente = 'ninguna' | 'resumen' | 'completo'
export type PrioridadTarea = 'baja' | 'media' | 'alta' | 'urgente'

export interface Proyecto {
  id: number
  nombre: string
  negocio_id: number | null
  cliente_id: number | null
  descripcion: string | null
  fecha_inicio: string | null
  fecha_fin_estimada: string | null
  estado: EstadoProyecto
  visibilidad_cliente: VisibilidadCliente
  creado_por: number | null
  fecha_creacion: string
  cliente_nombre?: string | null
  negocio_nombre?: string | null
  creado_por_nombre?: string | null
  tareas_total?: number
  tareas_completadas?: number
  tareas_vencidas?: number
  proxima_fecha_limite?: string | null
}

// Personalizable por cliente vía datos, igual que pipeline_estados — el
// código nunca debe comparar por `nombre`; usar es_estado_final para
// identificar el estado terminal, y `orden` para las columnas del Kanban.
export interface TareaEstado {
  id: number
  nombre: string
  orden: number
  color: string
  es_estado_final: boolean
}

export interface Tarea {
  id: number
  proyecto_id: number
  titulo: string
  descripcion: string | null
  tarea_estado_id: number
  prioridad: PrioridadTarea
  asignado_a: number | null
  fecha_limite: string | null
  visible_cliente: boolean
  fecha_creacion: string
  tarea_estado_nombre?: string
  tarea_estado_color?: string
  tarea_estado_orden?: number
  es_estado_final?: boolean
  asignado_a_nombre?: string | null
  adjuntos?: TareaAdjunto[]
}

export interface TareaAdjunto {
  id: number
  tarea_id: number
  url: string
  nombre_archivo: string | null
  tipo_mime: string | null
  subido_por: number | null
  fecha_creacion: string
  subido_por_nombre?: string | null
}
