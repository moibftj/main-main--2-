import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function format(date: Date, formatStr: string): string {
  // Simple date formatting - in production, use date-fns
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()
  const hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12

  if (formatStr === 'MMM d, yyyy') {
    return `${month} ${day}, ${year}`
  }
  if (formatStr === 'MMM d, yyyy h:mm a') {
    return `${month} ${day}, ${year} ${hour12}:${minutes} ${ampm}`
  }
  return date.toLocaleDateString()
}
