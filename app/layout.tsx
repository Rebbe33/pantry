import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: 'Mon Garde-Manger | Gestion intelligente de votre cuisine',
  description: 'Gérez votre garde-manger, planifiez vos repas et créez vos listes de courses en toute simplicité',
  manifest: '/manifest.json',
  themeColor: '#F16528',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Garde-Manger',
  },
  icons: {
    apple: '/icons/icon-192x192.png',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'glass',
            duration: 3000,
            style: {
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(251, 146, 60, 0.2)',
              borderRadius: '12px',
              padding: '12px 16px',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
