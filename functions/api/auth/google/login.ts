interface Env {
  GOOGLE_CLIENT_ID: string
  GOOGLE_REDIRECT_URI?: string
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => chars[byte % chars.length]).join('')
}

async function sha256Base64Url(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * GET /api/auth/google/login
 * Starts Google OAuth 2.0 PKCE flow
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  const clientId = env.GOOGLE_CLIENT_ID || 'dummy-google-client-id'
  const origin = new URL(request.url).origin
  const redirectUri = env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`

  // Generate PKCE code_verifier and code_challenge
  const codeVerifier = generateRandomString(64)
  const codeChallenge = await sha256Base64Url(codeVerifier)
  const state = generateRandomString(32)

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  googleAuthUrl.searchParams.set('client_id', clientId)
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri)
  googleAuthUrl.searchParams.set('response_type', 'code')
  googleAuthUrl.searchParams.set('scope', 'openid email profile')
  googleAuthUrl.searchParams.set('state', state)
  googleAuthUrl.searchParams.set('code_challenge', codeChallenge)
  googleAuthUrl.searchParams.set('code_challenge_method', 'S256')
  googleAuthUrl.searchParams.set('access_type', 'offline')
  googleAuthUrl.searchParams.set('prompt', 'select_account')

  // Set cookies for validation in callback
  const headers = new Headers()
  headers.set('Location', googleAuthUrl.toString())
  headers.append(
    'Set-Cookie',
    `oxford_oauth_verifier=${encodeURIComponent(codeVerifier)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
  )
  headers.append(
    'Set-Cookie',
    `oxford_oauth_state=${encodeURIComponent(state)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
  )

  return new Response(null, {
    status: 302,
    headers,
  })
}
