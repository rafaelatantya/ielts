interface Env {
  DB: D1Database
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_REDIRECT_URI?: string
}

function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('Cookie') || ''
  const regex = new RegExp(`(?:^|; )${name}=([^;]*)`)
  const match = cookieHeader.match(regex)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * GET /api/auth/google/callback
 * Exchanges authorization code + PKCE verifier for user token and profile,
 * creates or updates the user in Cloudflare D1, and redirects back to the app.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error || !code) {
    return new Response(`Authentication failed: ${error || 'Missing code'}`, {
      status: 400,
    })
  }

  const storedState = getCookie(request, 'oxford_oauth_state')
  const codeVerifier = getCookie(request, 'oxford_oauth_verifier')

  if (!storedState || storedState !== state) {
    return new Response('Invalid state parameter (CSRF protection failed)', {
      status: 403,
    })
  }

  const origin = url.origin
  const redirectUri = env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`

  try {
    // 1. Exchange code with Google OAuth token endpoint
    const tokenParams = new URLSearchParams()
    tokenParams.set('client_id', env.GOOGLE_CLIENT_ID || 'dummy-google-client-id')
    tokenParams.set('client_secret', env.GOOGLE_CLIENT_SECRET || '')
    tokenParams.set('code', code)
    tokenParams.set('code_verifier', codeVerifier || '')
    tokenParams.set('grant_type', 'authorization_code')
    tokenParams.set('redirect_uri', redirectUri)

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      return new Response(`Google token exchange failed: ${errText}`, { status: 400 })
    }

    const tokenData: any = await tokenRes.json()
    const accessToken = tokenData.access_token

    // 2. Fetch user profile from Google UserInfo endpoint
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!userRes.ok) {
      return new Response('Failed to retrieve user profile from Google', { status: 400 })
    }

    const profile: any = await userRes.json()
    const userId = `usr_${profile.sub}`
    const email = profile.email
    const name = profile.name || ''
    const picture = profile.picture || ''
    const now = Date.now()

    // 3. Upsert user into Cloudflare D1
    await env.DB.prepare(
      `INSERT INTO users (id, email, name, picture, exam_track, target_band, created_at, last_active_at)
       VALUES (?, ?, ?, ?, 'academic', 7.5, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         name = excluded.name,
         picture = excluded.picture,
         last_active_at = excluded.last_active_at`
    )
      .bind(userId, email, name, picture, now, now)
      .run()

    // 4. Set authentication session cookie and redirect to /account
    const headers = new Headers()
    headers.set('Location', `${origin}/account?auth=success`)
    headers.append(
      'Set-Cookie',
      `oxford_user_id=${encodeURIComponent(userId)}; Path=/; SameSite=Lax; Max-Age=2592000` // 30 days
    )
    // Clear oauth ephemeral cookies
    headers.append('Set-Cookie', 'oxford_oauth_verifier=; Path=/; Max-Age=0')
    headers.append('Set-Cookie', 'oxford_oauth_state=; Path=/; Max-Age=0')

    return new Response(null, {
      status: 302,
      headers,
    })
  } catch (err: any) {
    return new Response(`OAuth callback processing error: ${err.message}`, {
      status: 500,
    })
  }
}
