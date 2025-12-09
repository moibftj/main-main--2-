'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()
  const safeTheme = theme ?? 'system'
  const resolvedTheme: ToasterProps['theme'] =
    safeTheme === 'light' || safeTheme === 'dark' || safeTheme === 'system'
      ? safeTheme
      : 'system'
  const { theme: _unusedTheme, ...toasterProps } = props

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...toasterProps}
    />
  )
}

export { Toaster }
