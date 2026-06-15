// api/admin/list.js - 最终完美版本
const GITHUB_USER = process.env.GITHUB_USER || 'chnbsdan'
const GITHUB_REPO = process.env.GITHUB_REPO || 'Pico'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

// 需要读取的文件夹列表（包含 sh 和 sd）
const FOLDERS = ['wallpaper', 'cover', 'sh', 'sd']

// 获取单个文件夹的图片
async function getFolderImages(folder) {
  try {
    const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${folder}`
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'Vercel-Serverless'
      }
    })
    
    // 文件夹不存在或为空，返回空数组
    if (!response.ok) {
      console.log(`[${folder}] 文件夹不存在: ${response.status}`)
      return []
    }
    
    const files = await response.json()
    if (!Array.isArray(files)) return []
    
    // 过滤图片文件，排除 .keep
    return files
      .filter(f => {
        const ext = f.name.split('.').pop().toLowerCase()
        const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(ext)
        return isImage && f.name !== '.keep'
      })
      .map(f => ({
        name: f.name,
        url: f.download_url,
        path: f.path,
        sha: f.sha,
        size: f.size,
        folder: folder,
        source: 'github'
      }))
  } catch (error) {
    console.error(`[${folder}] 获取失败:`, error.message)
    return []
  }
}

// 获取外部图片
async function getExternalImages() {
  const emptyResult = { wallpaper: [], cover: [], sh: [], sd: [] }
  try {
    const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/external.json`
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3.raw',
        'User-Agent': 'Vercel-Serverless'
      }
    })
    
    if (!response.ok) {
      console.log('external.json 不存在')
      return emptyResult
    }
    
    const data = await response.json()
    const result = {}
    for (const folder of FOLDERS) {
      result[folder] = (data[folder] || []).map(url => ({
        name: url.split('/').pop(),
        url: url,
        folder: folder,
        source: 'external'
      }))
    }
    return result
  } catch (error) {
    console.error('获取外部图片失败:', error.message)
    return emptyResult
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    // 并行获取所有文件夹
    const folderPromises = FOLDERS.map(folder => getFolderImages(folder))
    const folderResults = await Promise.all(folderPromises)
    
    const results = {}
    let totalCount = 0
    
    for (let i = 0; i < FOLDERS.length; i++) {
      const folder = FOLDERS[i]
      results[folder] = folderResults[i]
      totalCount += results[folder].length
    }
    
    // 合并外部图片
    const externalImages = await getExternalImages()
    for (const folder of FOLDERS) {
      const external = externalImages[folder] || []
      results[folder] = [...results[folder], ...external]
      totalCount += external.length
    }
    
    res.status(200).json({
      total: totalCount,
      folders: results
    })
  } catch (error) {
    console.error('API 错误:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
