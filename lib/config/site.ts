const DEFAULT_APP_URL = 'https://www.talk-to-my-lawyer.com'
const DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']

function parseAppUrl(): URL {
  const candidate = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL

  try {
    return new URL(candidate)
  } catch (error) {
    console.warn(
      `[config] Invalid NEXT_PUBLIC_APP_URL value "${candidate}". Falling back to ${DEFAULT_APP_URL}.`,
      error
    )
    return new URL(DEFAULT_APP_URL)
  }
}

export function getAppUrl(): URL {
  return parseAppUrl()
}

export function getAppOrigin(): string {
  return parseAppUrl().origin
}

export function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>(DEV_ORIGINS)
  origins.add(getAppOrigin())
  return origins
}

export { DEFAULT_APP_URL }
