// api/image.js - 纯代理模式（不走 302 重定向，充分利用 Vercel 缓存）
const GITHUB_USER = process.env.GITHUB_USER || 'chnbsdan'
const GITHUB_REPO = process.env.GITHUB_REPO || 'pcbed'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

// 允许的文件夹列表
const ALLOWED_FOLDERS = ['wallpaper', 'cover', 'sh', 'sd']

// 根据扩展名获取 Content-Type
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

// 生成 ETag（基于图片内容）
function generateETag(content) {
  const crypto = require('crypto')
  return crypto.createHash('md5').update(content).digest('hex')
}

export default async function handler(req, res) {
  const { path } = req.query

  if (!path) {
    return res.status(400).send('Missing path parameter')
  }

  // 解析路径：folder/filename
  const parts = path.split('/')
  const folder = parts[0]
  const filename = parts.slice(1).join('/')

  // 验证文件夹
  if (!ALLOWED_FOLDERS.includes(folder)) {
    return res.status(403).send('Invalid folder')
  }

  if (!filename || filename.includes('..')) {
    return res.status(403).send('Invalid filename')
  }

  // 构建 GitHub raw URL
  const rawUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/${folder}/${filename}`

  // ============================================================
  // ⚠️ 关键：强制走代理模式，不走 302 重定向
  // 原因：302 会绕过 Vercel 缓存，且 GitHub raw 域名可能被限制
  // ============================================================

  try {
    // 直接 fetch 图片内容（代理模式）
    const response = await fetch(rawUrl, {
      headers: GITHUB_TOKEN ? {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'Vercel-Serverless'
      } : {
        'User-Agent': 'Vercel-Serverless'
      }
    })

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status} for ${rawUrl}`)
      return res.status(response.status).send('Image not found')
    }

    // 获取图片数据
    const body = await response.arrayBuffer()
    const buffer = Buffer.from(body)
    const contentType = getContentType(filename)

    // ============================================================
    // 设置缓存头（核心优化）
    // ============================================================
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', 'inline')

    // ETag 支持 304 协商缓存
    const etag = generateETag(buffer)
    res.setHeader('ETag', etag)

    // 检查客户端是否已有缓存（304）
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

    // 返回图片数据
    res.send(buffer)
  } catch (error) {
    console.error('Image proxy error:', error)
    res.status(500).send('Internal server error')
  }
}
