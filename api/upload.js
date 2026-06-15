// api/upload.js - 完整修复版
const GITHUB_USER = process.env.GITHUB_USER || 'chnbsdan'
const GITHUB_REPO = process.env.GITHUB_REPO || 'pcbed'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const FOLDER_WALLPAPER = process.env.FOLDER_WALLPAPER || 'wallpaper'
const FOLDER_COVER = process.env.FOLDER_COVER || 'cover'

// 映射函数：前端传 wallpaper/cover → 实际文件夹名
function mapFolder(folder) {
  if (folder === 'wallpaper') return FOLDER_WALLPAPER
  if (folder === 'cover') return FOLDER_COVER
  return folder
}

// 获取预签名 URL
async function getPresignedUrl(filename, folder) {
  const now = new Date()
  const datePrefix = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
  const originalName = filename.replace(/\.[^/.]+$/, '')
  const safeName = originalName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')
  const ext = filename.split('.').pop().toLowerCase()
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

function getBoundary(contentType) {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)
  return match ? (match[1] || match[2]) : null
}

function parseMultipart(buffer, boundary) {
  const result = {}
  const boundaryBuffer = Buffer.from(`--${boundary}`)
  
  let start = 0
  let end = buffer.indexOf(boundaryBuffer, start)
  
  while (end !== -1) {
    start = end + boundaryBuffer.length
    let nextBoundary = buffer.indexOf(boundaryBuffer, start)
    let partEnd = nextBoundary !== -1 ? nextBoundary : buffer.length
    
    if (buffer[start] === 13 && buffer[start+1] === 10) {
      start += 2
    }
    
    const part = buffer.slice(start, partEnd)
    if (part.length === 0) {
      end = nextBoundary
      continue
    }
    
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
    
    if (headers.includes('filename')) {
      const filenameMatch = headers.match(/filename="([^"]+)"/)
      const contentEnd = content.length >= 2 && content[content.length-2] === 13 && content[content.length-1] === 10 
        ? content.length - 2 
        : content.length
      const fileData = content.slice(0, contentEnd)
      
      result[name] = {
        filename: filenameMatch ? filenameMatch[1] : 'unknown',
        data: Buffer.from(fileData),
        size: fileData.length
      }
    } else {
      const textEnd = content.length >= 2 && content[content.length-2] === 13 && content[content.length-1] === 10
        ? content.length - 2
        : content.length
      result[name] = content.slice(0, textEnd).toString()
    }
    
    end = nextBoundary
  }
  
  return result
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  
  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN missing' })
  }
  
  const { action } = req.query
  
  // 打印环境变量（调试用）
  console.log('=== 环境变量 ===')
  console.log('FOLDER_WALLPAPER:', FOLDER_WALLPAPER)
  console.log('FOLDER_COVER:', FOLDER_COVER)
  console.log('================')
  
  // 获取预签名 URL
  if (action === 'presign') {
    const { filename, folder } = req.body
    if (!filename || !folder) {
      return res.status(400).json({ error: 'Missing filename or folder' })
    }
    
    // 映射文件夹名
    const targetFolder = mapFolder(folder)
    console.log(`映射: ${folder} → ${targetFolder}`)
    
    if (![FOLDER_WALLPAPER, FOLDER_COVER].includes(targetFolder)) {
      return res.status(400).json({ error: `Invalid folder. Use: ${FOLDER_WALLPAPER} or ${FOLDER_COVER}` })
    }
    
    const presigned = await getPresignedUrl(filename, targetFolder)
    return res.status(200).json({
      success: true,
      ...presigned
    })
  }
  
  // 传统上传
  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)
    const contentType = req.headers['content-type'] || ''
    const boundary = getBoundary(contentType)
    if (!boundary) return res.status(400).json({ error: 'Cannot parse boundary' })
    
    const formData = parseMultipart(buffer, boundary)
    const file = formData.file
    let rawFolder = formData.folder || 'wallpaper'
    
    // 映射文件夹名
    const targetFolder = mapFolder(rawFolder)
    console.log(`传统上传映射: ${rawFolder} → ${targetFolder}`)
    
    if (![FOLDER_WALLPAPER, FOLDER_COVER].includes(targetFolder)) {
      return res.status(400).json({ error: `Invalid folder. Use: ${FOLDER_WALLPAPER} or ${FOLDER_COVER}` })
    }
    
    if (!file || !file.data) return res.status(400).json({ error: 'No file uploaded' })
    if (file.size > 25 * 1024 * 1024) return res.status(400).json({ error: 'File too large (max 25MB)' })
    
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
    const fullUrl = `${protocol}://${host}/api/image?path=${targetFolder}/${filename}`
    
    res.status(200).json({ success: true, filename, folder: targetFolder, url: fullUrl })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
