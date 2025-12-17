import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Analytics } from '@vercel/analytics/react'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'RemoteDevAI - Your AI Developer in Your Pocket',
    template: '%s | RemoteDevAI',
  },
  description: 'Work on your projects from anywhere with AI-powered voice and video assistance. Access your development environment remotely with natural conversation.',
  keywords: ['AI developer', 'remote development', 'voice coding', 'AI assistant', 'pair programming', 'remote workspace'],
  authors: [{ name: 'RemoteDevAI Team' }],
  creator: 'RemoteDevAI',
  metadataBase: new URL('https://remotedevai.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://remotedevai.com',
    title: 'RemoteDevAI - Your AI Developer in Your Pocket',
    description: 'Work on your projects from anywhere with AI-powered voice and video assistance.',
    siteName: 'RemoteDevAI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'RemoteDevAI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RemoteDevAI - Your AI Developer in Your Pocket',
    description: 'Work on your projects from anywhere with AI-powered voice and video assistance.',
    images: ['/og-image.png'],
    creator: '@remotedevai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable} suppressHydrationWarning>
        <body className="bg-slate-50 dark:bg-slate-900 antialiased transition-colors duration-300">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange={false}
          >
            {children}
            <Analytics />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
