// api/image.js - 诊断版（显示详细错误）
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

export default async function handler(req, res) {
  const { path } = req.query

  // ============================================================
  // 1. 检查 path 参数
  // ============================================================
  if (!path) {
    return res.status(400).send('ERROR: Missing path parameter')
  }

  // ============================================================
  // 2. 解析路径
  // ============================================================
  const parts = path.split('/')
  const folder = parts[0]
  const filename = parts.slice(1).join('/')

  // ============================================================
  // 3. 验证文件夹
  // ============================================================
  if (!ALLOWED_FOLDERS.includes(folder)) {
    return res.status(403).send(`ERROR: Invalid folder: ${folder}`)
  }

  if (!filename || filename.includes('..')) {
    return res.status(403).send(`ERROR: Invalid filename: ${filename}`)
  }

  // ============================================================
  // 4. 检查环境变量
  // ============================================================
  if (!GITHUB_TOKEN) {
    return res.status(500).send('ERROR: GITHUB_TOKEN is not configured')
  }

  // ============================================================
  // 5. 构建 URL 并请求
  // ============================================================
  const rawUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${folder}/${filename}`

  try {
    console.log('Fetching:', rawUrl)

    const response = await fetch(rawUrl, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'Vercel-Serverless',
        'Accept': 'application/vnd.github.v3.raw'
      }
    })

    console.log('GitHub response status:', response.status)

    // ============================================================
    // 6. 详细错误反馈
    // ============================================================
    if (!response.ok) {
      let errorDetail = ''
      try {
        const errorJson = await response.json()
        errorDetail = JSON.stringify(errorJson, null, 2)
      } catch {
        errorDetail = await response.text()
      }
      
      console.error('GitHub API error:', response.status, errorDetail)
      
      return res.status(response.status).send(
        `GitHub API Error ${response.status}\n` +
        `URL: ${rawUrl}\n` +
        `Response: ${errorDetail.substring(0, 500)}`
      )
    }

    // ============================================================
    // 7. 成功：返回图片
    // ============================================================
    const body = await response.arrayBuffer()
    const buffer = Buffer.from(body)
    const contentType = getContentType(filename)

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', 'inline')

    res.send(buffer)
  } catch (error) {
    console.error('Image proxy error:', error)
    res.status(500).send(
      `ERROR: ${error.message}\n` +
      `Stack: ${error.stack}`
    )
  }
}
