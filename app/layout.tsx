import type { Metadata } from "next"
import "./globals.css"

const DEFAULT_APP_URL = 'https://www.talk-to-my-lawyer.com'

const APP_URL = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).toString()
  } catch (error) {
    console.error('[metadata] Invalid NEXT_PUBLIC_APP_URL, falling back to default', error)
    return DEFAULT_APP_URL
  }
})()
const LOGO_URL = 'https://mxhccjykkxbdvchmpqej.supabase.co/storage/v1/object/sign/hh/TALK%20LOGO.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMWRkYjc5OS02OTBjLTQzZGYtOWRmZi01ZGFkZjQ4ODk5YjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJoaC9UQUxLIExPR08ud2VicCIsImlhdCI6MTc2NDg1NDY2OCwiZXhwIjoxNzk2MzkwNjY4fQ.QS5KZxipeL6TCtNE_LlMW6dqdSQf81BHRuFdd-onBOQ'

export const metadata: Metadata = {
  title: "Talk-To-My-Lawyer - Professional Legal Letters",
  description: "Professional legal letter generation with attorney review. Get demand letters, cease and desist notices, and more.",
  generator: 'v0.app',
  metadataBase: new URL(APP_URL),
  icons: {
    icon: [
      { url: LOGO_URL, type: 'image/webp' },
    ],
    apple: [
      { url: LOGO_URL, type: 'image/webp' },
    ],
  },
  openGraph: {
    images: [{ url: LOGO_URL }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href={LOGO_URL} type="image/webp" />
        <link rel="apple-touch-icon" href={LOGO_URL} />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
