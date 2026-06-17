// api/image.js - 终极优化版（带超时控制、缓存、并发限制）
const GITHUB_USER = process.env.GITHUB_USER || 'chnbsdan'
const GITHUB_REPO = process.env.GITHUB_REPO || 'pcbed'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

const ALLOWED_FOLDERS = ['wallpaper', 'cover', 'sh', 'sd']

// 内存缓存（Vercel 无状态，但可以减少重复请求）
const memoryCache = new Map()
const CACHE_TTL = 60 * 60 * 1000 // 1小时

function getContentType(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  const types = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'avif': 'image/avif',
    'svg': 'image/svg+xml'
  }
  return types[ext] || 'image/jpeg'
}

function generateETag(content) {
  const crypto = require('crypto')
  return crypto.createHash('md5').update(content).digest('hex')
}

export default async function handler(req, res) {
  const { path } = req.query

  if (!path) {
    return res.status(400).send('Missing path parameter')
  }

  const parts = path.split('/')
  const folder = parts[0]
  const filename = parts.slice(1).join('/')

  if (!ALLOWED_FOLDERS.includes(folder)) {
    return res.status(403).send('Invalid folder')
  }

  if (!filename || filename.includes('..')) {
    return res.status(403).send('Invalid filename')
  }

  const cacheKey = `${folder}/${filename}`
  const rawUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/${folder}/${filename}`

  // ============================================================
  // 1. 检查内存缓存
  // ============================================================
  if (memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey)
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      // 缓存命中，直接返回
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('Content-Type', cached.contentType)
      res.setHeader('ETag', cached.etag)
      res.setHeader('X-Cache', 'HIT')
      
      if (req.headers['if-none-match'] === cached.etag) {
        return res.status(304).end()
      }
      
      return res.send(cached.buffer)
    }
    memoryCache.delete(cacheKey)
  }

  // ============================================================
  // 2. 设置超时控制（10秒超时，避免长时间等待）
  // ============================================================
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(rawUrl, {
      headers: GITHUB_TOKEN ? {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'Vercel-Serverless'
      } : {
        'User-Agent': 'Vercel-Serverless'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status} for ${rawUrl}`)
      return res.status(response.status).send('Image not found')
    }

    const body = await response.arrayBuffer()
    const buffer = Buffer.from(body)
    const contentType = getContentType(filename)
    const etag = generateETag(buffer)

    // ============================================================
    // 3. 存入内存缓存
    // ============================================================
    memoryCache.set(cacheKey, {
      buffer,
      contentType,
      etag,
      timestamp: Date.now()
    })

    // ============================================================
    // 4. 设置响应头
    // ============================================================
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('Content-Type', contentType)
    res.setHeader('ETag', etag)
    res.setHeader('X-Cache', 'MISS')

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

    res.send(buffer)
  } catch (error) {
    clearTimeout(timeoutId)
    console.error('Image proxy error:', error)
    
    if (error.name === 'AbortError') {
      res.status(504).send('Gateway Timeout')
    } else {
      res.status(500).send('Internal server error')
    }
  }
}
