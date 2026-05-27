import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'The Prediction Sheet',
    template: '%s | The Prediction Sheet',
  },
  description:
    'The ultimate college football prediction platform. Pick game winners, predict season records, rank conference standings, and compete with friends.',
  keywords: ['college football', 'CFB', 'predictions', 'picks', 'fantasy sports'],
  openGraph: {
    title: 'The Prediction Sheet',
    description: 'Make your college football predictions. Track your accuracy. Beat your friends.',
    type: 'website',
    siteName: 'The Prediction Sheet',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  )
}
