import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { ThemeProvider } from 'next-themes'
import ServiceWorkerRegister from '@/components/ui/ServiceWorkerRegister'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mind CRM | Mercadocorp Ec',
  description: 'CRM interno para gestión de leads del agente Mind',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="mind-crm-theme">
          <ServiceWorkerRegister />
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              style: { fontFamily: 'Inter, sans-serif' },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
