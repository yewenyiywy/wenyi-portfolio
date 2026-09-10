import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wenyi Ye — Quantitative Finance × AI',
  description: 'Personal portfolio of Wenyi Ye: quantitative finance, AI, markets, and product.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
