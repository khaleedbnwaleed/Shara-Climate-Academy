import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from '@/context/auth-context'
import { ThemeProvider } from '@/context/theme-context'
import RemoveExtensionAttributes from '@/components/remove-extension-attrs'
import './globals.css'

export const metadata: Metadata = {
  title: 'Shara Climate Academy | Learn Climate Action',
  description:
    'Shara Climate Academy equips individuals and organisations worldwide with the knowledge and skills to tackle the climate crisis — at their own pace, online.',
  generator: 'v0.app',
  icons: {
    icon: '/Logo.png',
    apple: '/Logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className="scroll-smooth"
      suppressHydrationWarning
    >
      <body
        suppressHydrationWarning
        className="font-sans antialiased"
      >
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>

        <RemoveExtensionAttributes />

        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}