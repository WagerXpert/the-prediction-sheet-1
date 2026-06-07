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
    default: 'The Prediction Sheet — CFB Predictions & CFP Bracket | Powered by WagerXpert',
    template: '%s | The Prediction Sheet',
  },
  description:
    'The #1 college football prediction platform. Pick CFB game winners week by week, predict team schedules, and fill out your 12-team CFP playoff bracket. Free to play. Powered by WagerXpert.',
  keywords: [
    'CFB predictions', 'college football picks', 'CFP bracket predictions', 'CFP playoff bracket 2026',
    'college football game picks', 'CFB schedule predictions', 'football prediction sheet',
    'college football bracket', 'CFB playoff bracket', 'weekly CFB picks',
    'college football season predictions', 'CFB accuracy tracker', 'WagerXpert',
    'pick college football games', 'predict CFB schedule', 'college football prediction contest',
    'FBS game predictions', 'college football playoff predictions',
  ],
  openGraph: {
    title: 'The Prediction Sheet — CFB Predictions & CFP Bracket',
    description: 'Predict college football game winners week by week, track your team\'s schedule, and build your 12-team CFP playoff bracket. Free to play. Powered by WagerXpert.',
    type: 'website',
    siteName: 'The Prediction Sheet by WagerXpert',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'The Prediction Sheet — CFB Predictions' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Prediction Sheet — CFB Predictions & CFP Bracket',
    description: 'Pick CFB game winners, predict team schedules, and fill out your CFP playoff bracket. Powered by WagerXpert.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
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
