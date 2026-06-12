// api/upload.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN
  const GITHUB_USER = process.env.GITHUB_USER || 'chnbsdan'
  const GITHUB_REPO = process.env.GITHUB_REPO || 'imgbed'
  
  if (!GITHUB_TOKEN) return res.status(500).json({ error: 'GITHUB_TOKEN missing' })
  
  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)
    const contentType = req.headers['content-type'] || ''
    const boundary = getBoundary(contentType)
    if (!boundary) return res.status(400).json({ error: 'Cannot parse boundary' })
    
    const formData = await parseMultipart(buffer, boundary)  // 🔧 改为 await
    const file = formData.file
    const targetFolder = formData.folder || 'wallpaper'
    
    if (!file || !file.data) return res.status(400).json({ error: 'No file uploaded' })
    if (file.size > 10 * 1024 * 1024) return res.status(400).json({ error: 'File too large' })
    
    const ext = file.filename.split('.').pop().toLowerCase()
    if (!['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(ext)) {
      return res.status(400).json({ error: 'Unsupported file format' })
    }
    
    const now = new Date()
    const datePrefix = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
    const originalName = file.filename.replace(/\.[^/.]+$/, '')
    const safeName = originalName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')
    const filename = `${datePrefix}_${safeName}.${ext}`
    const base64Content = file.data.toString('base64')
    
    const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${targetFolder}/${filename}`
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: `Upload ${filename}`, content: base64Content, branch: 'main' })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('GitHub API error:', errorText)
      return res.status(response.status).json({ error: 'GitHub upload failed' })
    }
    
    const host = req.headers.host
    const protocol = req.headers['x-forwarded-proto'] || 'https'
    const fullUrl = `${protocol}://${host}/${targetFolder}/${filename}`
    
    res.status(200).json({ success: true, filename, folder: targetFolder, url: fullUrl })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

function getBoundary(contentType) {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)
  return match ? (match[1] || match[2]) : null
}

// 🔧 重写 parseMultipart 函数，使用 Buffer 而不是 binary 字符串
async function parseMultipart(buffer, boundary) {
  const result = {}
  const boundaryBuffer = Buffer.from(`--${boundary}`)
  const endBoundaryBuffer = Buffer.from(`--${boundary}--`)
  
  let start = 0
  let end = buffer.indexOf(boundaryBuffer, start)
  
  while (end !== -1) {
    start = end + boundaryBuffer.length
    end = buffer.indexOf(boundaryBuffer, start)
    
    let partEnd = end !== -1 ? end : buffer.length
    const part = buffer.slice(start, partEnd)
    
    // 跳过空部分
    if (part.length <= 2) continue
    
    // 查找 header 结束位置（\r\n\r\n）
    let headerEnd = -1
    for (let i = 0; i < part.length - 3; i++) {
      if (part[i] === 13 && part[i+1] === 10 && part[i+2] === 13 && part[i+3] === 10) {
        headerEnd = i
        break
      }
    }
    if (headerEnd === -1) continue
    
    const headers = part.slice(0, headerEnd).toString('utf-8')
    const content = part.slice(headerEnd + 4, part.length - 2) // 去掉末尾的\r\n
    
    // 解析 name
    const nameMatch = headers.match(/name="([^"]+)"/)
    if (!nameMatch) continue
    const name = nameMatch[1]
    
    // 检查是否是文件
    if (headers.includes('filename')) {
      const filenameMatch = headers.match(/filename="([^"]+)"/)
      result[name] = {
        filename: filenameMatch ? filenameMatch[1] : 'unknown',
        data: Buffer.from(content),  // 直接使用 Buffer
        size: content.length
      }
    } else {
      result[name] = content.toString('utf-8').trim()
    }
  }
  
  return result
}
