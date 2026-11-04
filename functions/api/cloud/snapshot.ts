interface Env {
  DB: D1Database
  BACKUP_BUCKET: R2Bucket
}

function getUserIdFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim()
  }
  const cookieHeader = request.headers.get('Cookie') || ''
  const match = cookieHeader.match(/oxford_user_id=([^;]+)/)
  if (match) {
    return decodeURIComponent(match[1])
  }
  return null
}

async function computeSha256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * GET /api/cloud/snapshot
 * Fetches the latest backup snapshot binary (or metadata) for the authenticated user
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const userId = getUserIdFromRequest(request)

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const url = new URL(request.url)
  const metaOnly = url.searchParams.get('meta') === 'true'

  try {
    const latestRow: any = await env.DB.prepare(
      `SELECT id, user_id, version, device_id, r2_object_key, sha256, size_bytes, counts_json, created_at
       FROM cloud_snapshots
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`
    )
      .bind(userId)
      .first()

    if (!latestRow) {
      return new Response(JSON.stringify({ snapshot: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (metaOnly) {
      return new Response(JSON.stringify({ snapshot: latestRow }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Retrieve from Cloudflare R2 bucket
    const r2Object = await env.BACKUP_BUCKET.get(latestRow.r2_object_key)
    if (!r2Object) {
      return new Response(JSON.stringify({ error: 'Snapshot object missing from storage' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const headers = new Headers()
    r2Object.writeHttpMetadata(headers)
    headers.set('etag', r2Object.httpEtag)
    headers.set('Content-Type', 'application/zip')
    headers.set('Content-Disposition', `attachment; filename="${latestRow.r2_object_key}"`)
    headers.set('X-Snapshot-Sha256', latestRow.sha256)
    headers.set('X-Snapshot-Id', latestRow.id)

    return new Response(r2Object.body, {
      status: 200,
      headers,
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/**
 * PUT /api/cloud/snapshot
 * Uploads a new .zip backup archive into Cloudflare R2 and writes a row in D1
 */
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const userId = getUserIdFromRequest(request)

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const deviceId = request.headers.get('X-Device-Id') || 'unknown-device'
  const countsHeader = request.headers.get('X-Item-Counts') || '{}'

  try {
    const arrayBuffer = await request.arrayBuffer()
    const sizeBytes = arrayBuffer.byteLength

    if (sizeBytes === 0) {
      return new Response(JSON.stringify({ error: 'Empty backup payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const sha256 = await computeSha256(arrayBuffer)
    const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const r2Key = `backups/${userId}/${snapshotId}.zip`

    // Write to Cloudflare R2
    await env.BACKUP_BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: 'application/zip',
      },
      customMetadata: {
        userId,
        deviceId,
        sha256,
        sizeBytes: String(sizeBytes),
      },
    })

    // Write metadata to Cloudflare D1
    await env.DB.prepare(
      `INSERT INTO cloud_snapshots (id, user_id, version, device_id, r2_object_key, sha256, size_bytes, counts_json, created_at)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        snapshotId,
        userId,
        deviceId,
        r2Key,
        sha256,
        sizeBytes,
        countsHeader,
        Date.now()
      )
      .run()

    return new Response(
      JSON.stringify({
        success: true,
        snapshotId,
        r2Key,
        sha256,
        sizeBytes,
        uploadedAt: Date.now(),
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal upload error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
