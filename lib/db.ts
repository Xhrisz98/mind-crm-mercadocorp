import { Pool, types } from 'pg'

// El parser default de node-postgres convierte columnas DATE (oid 1082) a
// objetos Date de JS en hora local, no a strings — pero todo el resto del
// código (tipos en lib/types.ts, comparaciones, .slice(0,10) en el cliente)
// asume 'YYYY-MM-DD' como string. Nunca fue un problema porque NextResponse
// .json() serializa un Date a ISO string de todas formas, pero cualquier
// lógica en JS del lado del servidor ANTES de esa serialización (ordenar,
// usar como key de Map, etc.) se rompe con un objeto Date real. Se fuerza a
// string acá, una sola vez, para que todo el proceso sea consistente.
types.setTypeParser(1082, (val) => val)

declare global {
  var _pgPool: Pool | undefined
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')

  return new Pool({
    connectionString,
    ssl: false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })
}

const pool = globalThis._pgPool ?? createPool()
if (process.env.NODE_ENV !== 'production') globalThis._pgPool = pool

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query(text, params)
  return result.rows as T[]
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

export default pool
