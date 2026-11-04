interface Env {
  DB: D1Database
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  // Check authorization header or session cookie
  const authHeader = request.headers.get('Authorization')
  let userId = ''

  if (authHeader && authHeader.startsWith('Bearer ')) {
    userId = authHeader.slice(7).trim()
  } else {
    const cookieHeader = request.headers.get('Cookie') || ''
    const match = cookieHeader.match(/oxford_user_id=([^;]+)/)
    if (match) {
      userId = decodeURIComponent(match[1])
    }
  }

  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: missing session or bearer token' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const user = await env.DB.prepare(
      `SELECT id, email, name, picture, exam_track, target_band, exam_date, preferred_mic_label, created_at, last_active_at
       FROM users WHERE id = ?`
    )
      .bind(userId)
      .first()

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Update last_active_at timestamp
    await env.DB.prepare(
      `UPDATE users SET last_active_at = ? WHERE id = ?`
    )
      .bind(Date.now(), userId)
      .run()

    return new Response(JSON.stringify({ user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
