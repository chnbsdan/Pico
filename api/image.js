// api/image.js - 统一加强版（纯代理 + ETag + 超时控制）
const GITHUB_USER = process.env.GITHUB_USER || 'chnbsdan'
const GITHUB_REPO = process.env.GITHUB_REPO || 'pcbed'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

const ALLOWED_FOLDERS = ['wallpaper', 'cover', 'sh', 'sd']

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

  const rawUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/${folder}/${filename}`

  try {
    // 超时控制（8秒）
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

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

    // 缓存头（强缓存1年）
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', 'inline')
    res.setHeader('ETag', etag)

    // 304 协商缓存
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

    res.send(buffer)
  } catch (error) {
    console.error('Image proxy error:', error)
    
    if (error.name === 'AbortError') {
      res.status(504).send('Gateway Timeout')
    } else {
      res.status(500).send('Internal server error')
    }
  }
}
