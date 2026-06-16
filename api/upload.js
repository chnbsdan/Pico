// ============================================================
// API: 图片上传
// 支持两种模式：
//   1. 预签名 URL 模式 (action=presign) - 前端直传 GitHub，绕过 Vercel 限制
//   2. 传统上传模式 - 通过 Vercel 中转（备用）
// ============================================================

const GITHUB_USER = process.env.GITHUB_USER || 'chnbsdan'
const GITHUB_REPO = process.env.GITHUB_REPO || 'Pico'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

// ============================================================
// 🔧 允许的文件夹列表（独立方案，不做映射）
// ============================================================
const ALLOWED_FOLDERS = ['wallpaper', 'cover', 'sh', 'sd']

// 获取预签名 URL（用于前端直传）
async function getPresignedUrl(filename, folder) {
  // 生成日期前缀，如 20260615
  const now = new Date()
  const datePrefix = now.getFullYear() + 
    String(now.getMonth() + 1).padStart(2, '0') + 
    String(now.getDate()).padStart(2, '0')
  
  // 处理文件名：移除扩展名，特殊字符替换为下划线
  const originalName = filename.replace(/\.[^/.]+$/, '')
  const safeName = originalName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')
  const ext = filename.split('.').pop().toLowerCase()
  
  // 最终文件名格式：日期_原文件名.扩展名
  const finalFilename = `${datePrefix}_${safeName}.${ext}`
  const filePath = `${folder}/${finalFilename}`
  
  return {
    uploadUrl: `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${filePath}`,
    filename: finalFilename,
    folder: folder,
    path: filePath,
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    }
  }
}

// 解析 multipart/form-data 的 boundary
function getBoundary(contentType) {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)
  return match ? (match[1] || match[2]) : null
}

// 解析 multipart 数据
function parseMultipart(buffer, boundary) {
  const result = {}
  const boundaryBuffer = Buffer.from(`--${boundary}`)
  
  let start = 0
  let end = buffer.indexOf(boundaryBuffer, start)
  
  while (end !== -1) {
    start = end + boundaryBuffer.length
    let nextBoundary = buffer.indexOf(boundaryBuffer, start)
    let partEnd = nextBoundary !== -1 ? nextBoundary : buffer.length
    
    // 跳过开头的 \r\n
    if (buffer[start] === 13 && buffer[start+1] === 10) {
      start += 2
    }
    
    const part = buffer.slice(start, partEnd)
    if (part.length === 0) {
      end = nextBoundary
      continue
    }
    
    // 查找 headers 结束位置 (\r\n\r\n)
    let headerEnd = -1
    for (let i = 0; i < part.length - 3; i++) {
      if (part[i] === 13 && part[i+1] === 10 && part[i+2] === 13 && part[i+3] === 10) {
        headerEnd = i
        break
      }
    }
    
    if (headerEnd === -1) {
      end = nextBoundary
      continue
    }
    
    const headers = part.slice(0, headerEnd).toString()
    const content = part.slice(headerEnd + 4)
    
    const nameMatch = headers.match(/name="([^"]+)"/)
    if (!nameMatch) {
      end = nextBoundary
      continue
    }
    
    const name = nameMatch[1]
    
    // 判断是文件还是普通字段
    if (headers.includes('filename')) {
      const filenameMatch = headers.match(/filename="([^"]+)"/)
      const contentEnd = content.length >= 2 && 
        content[content.length-2] === 13 && 
        content[content.length-1] === 10 
        ? content.length - 2 
        : content.length
      const fileData = content.slice(0, contentEnd)
      
      result[name] = {
        filename: filenameMatch ? filenameMatch[1] : 'unknown',
        data: Buffer.from(fileData),
        size: fileData.length
      }
    } else {
      const textEnd = content.length >= 2 && 
        content[content.length-2] === 13 && 
        content[content.length-1] === 10
        ? content.length - 2
        : content.length
      result[name] = content.slice(0, textEnd).toString()
    }
    
    end = nextBoundary
  }
  
  return result
}

// 主处理函数
export default async function handler(req, res) {
  // 设置 CORS 头，允许跨域请求
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  
  // 处理预检请求
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  
  // 检查 Token
  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN missing' })
  }
  
  const { action } = req.query
  
  // ============================================================
  // 模式1: 获取预签名 URL（前端直传，支持大文件）
  // ============================================================
  if (action === 'presign') {
    const { filename, folder } = req.body
    if (!filename || !folder) {
      return res.status(400).json({ error: 'Missing filename or folder' })
    }
    
    // 验证文件夹是否允许（独立方案，不做映射）
    if (!ALLOWED_FOLDERS.includes(folder)) {
      return res.status(400).json({ 
        error: `Invalid folder. Use: ${ALLOWED_FOLDERS.join(', ')}` 
      })
    }
    
    // 获取预签名信息
    const presigned = await getPresignedUrl(filename, folder)
    
    // 返回给前端，前端将直接 PUT 到 GitHub
    return res.status(200).json({
      success: true,
      uploadUrl: presigned.uploadUrl,
      filename: presigned.filename,
      folder: folder,  // 直接返回原始文件夹名
      path: presigned.path,
      headers: presigned.headers
    })
  }
  
  // ============================================================
  // 模式2: 传统上传（通过 Vercel 中转，备用方案）
  // ============================================================
  try {
    // 读取请求体
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)
    const contentType = req.headers['content-type'] || ''
    const boundary = getBoundary(contentType)
    if (!boundary) return res.status(400).json({ error: 'Cannot parse boundary' })
    
    // 解析表单数据
    const formData = parseMultipart(buffer, boundary)
    const file = formData.file
    let targetFolder = formData.folder || 'wallpaper'
    
    // 验证文件夹
    if (!ALLOWED_FOLDERS.includes(targetFolder)) {
      return res.status(400).json({ 
        error: `Invalid folder. Use: ${ALLOWED_FOLDERS.join(', ')}` 
      })
    }
    
    // 验证文件
    if (!file || !file.data) return res.status(400).json({ error: 'No file uploaded' })
    if (file.size > 25 * 1024 * 1024) return res.status(400).json({ error: 'File too large (max 25MB)' })
    
    // 验证扩展名
    const ext = file.filename.split('.').pop().toLowerCase()
    if (!['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(ext)) {
      return res.status(400).json({ error: 'Unsupported file format' })
    }
    
    // 生成文件名
    const now = new Date()
    const datePrefix = now.getFullYear() + 
      String(now.getMonth() + 1).padStart(2, '0') + 
      String(now.getDate()).padStart(2, '0')
    const originalName = file.filename.replace(/\.[^/.]+$/, '')
    const safeName = originalName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')
    const filename = `${datePrefix}_${safeName}.${ext}`
    const base64Content = file.data.toString('base64')
    
    // 上传到 GitHub
    const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${targetFolder}/${filename}`
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        message: `Upload ${filename}`, 
        content: base64Content, 
        branch: 'main' 
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('GitHub API error:', errorText)
      return res.status(response.status).json({ error: 'GitHub upload failed' })
    }
    
    // 返回结果
    const host = req.headers.host
    const protocol = req.headers['x-forwarded-proto'] || 'https'
    const fullUrl = `${protocol}://${host}/api/image?path=${targetFolder}/${filename}`
    
    res.status(200).json({ 
      success: true, 
      filename, 
      folder: targetFolder, 
      url: fullUrl 
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
