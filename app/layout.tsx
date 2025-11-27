import type { Metadata } from "next"
import "./globals.css"

import { Inter as V0_Font_Inter, Geist_Mono as V0_Font_Geist_Mono, Source_Serif_4 as V0_Font_Source_Serif_4 } from 'next/font/google'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.talk-to-my-lawyers.com'

// Initialize fonts
const _inter = V0_Font_Inter({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700","800","900"] })
const _geistMono = V0_Font_Geist_Mono({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700","800","900"] })
const _sourceSerif_4 = V0_Font_Source_Serif_4({ subsets: ['latin'], weight: ["200","300","400","500","600","700","800","900"] })

export const metadata: Metadata = {
  title: "Talk-To-My-Lawyer - Professional Legal Letters",
  description: "Professional legal letter generation with attorney review. Get demand letters, cease and desist notices, and more.",
  generator: 'v0.app',
  metadataBase: new URL(APP_URL),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
