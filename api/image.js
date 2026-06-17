// Pico/api/image.js - 统一图片代理（Vercel 版，支持 302 重定向 + 私有仓库 + 强缓存）
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

// 生成 ETag（基于文件路径 + 内容）
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

  // 设置跨域和缓存头（核心优化：强缓存 1 年）
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.setHeader('Content-Disposition', 'inline')

  try {
    // 方式1：如果有 Token，使用 302 重定向到 raw URL（更快，不消耗 Vercel 带宽）
    if (GITHUB_TOKEN) {
      // 先验证文件是否存在（HEAD 请求）
      const headResponse = await fetch(rawUrl, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'User-Agent': 'Vercel-Serverless'
        }
      })

      if (headResponse.ok) {
        // 302 重定向到 raw URL，浏览器直接访问，不经过 Vercel
        res.setHeader('Location', rawUrl)
        return res.status(302).end()
      }
    }

    // 方式2：没有 Token 或 HEAD 请求失败，使用代理方式返回
    const response = await fetch(rawUrl, {
      headers: GITHUB_TOKEN ? {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'Vercel-Serverless'
      } : {}
    })

    if (!response.ok) {
      return res.status(404).send('Image not found')
    }

    // 获取图片数据
    const body = await response.arrayBuffer()
    const buffer = Buffer.from(body)
    const contentType = getContentType(filename)
    res.setHeader('Content-Type', contentType)

    // 【新增】生成并返回 ETag，支持 304 缓存协商
    const etag = generateETag(buffer)
    res.setHeader('ETag', etag)

    // 检查客户端是否已有缓存（304）
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

    res.send(buffer)
  } catch (error) {
    console.error('Image proxy error:', error)
    res.status(500).send('Internal server error')
  }
}
