export const semanticColors = {
  // Status colors
  status: {
    draft: 'bg-muted text-muted-foreground',
    pending: 'bg-accent/10 text-accent-foreground',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-destructive/10 text-destructive',
    underReview: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  // Role badges
  role: {
    subscriber: 'bg-primary/10 text-primary',
    employee: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    admin: 'bg-destructive/10 text-destructive',
  },
  // Commission status
  commission: {
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
} as const

export const semanticTextColors = {
  heading: 'text-foreground',
  body: 'text-foreground',
  muted: 'text-muted-foreground',
  link: 'text-primary hover:text-primary/80',
  error: 'text-destructive',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-amber-600 dark:text-amber-400',
} as const
