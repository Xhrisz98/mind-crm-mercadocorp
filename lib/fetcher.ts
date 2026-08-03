let redirecting = false

// Evita redirecciones duplicadas cuando varios hooks de SWR reciben el 401 casi al mismo tiempo.
export function redirectToLoginExpired() {
  if (redirecting || typeof window === 'undefined') return
  redirecting = true
  window.location.href = '/login?expired=1'
}

export class FetchError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function fetcher(url: string) {
  const res = await fetch(url)
  if (res.status === 401) {
    redirectToLoginExpired()
    throw new FetchError('Sesión expirada', 401)
  }
  if (!res.ok) {
    let message = 'Error al cargar los datos'
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {}
    throw new FetchError(message, res.status)
  }
  return res.json()
}
