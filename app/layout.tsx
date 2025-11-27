import type { Metadata } from "next"
import "./globals.css"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.talk-to-my-lawyers.com'

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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
