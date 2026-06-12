// api/admin/list.js - 图片列表 API
const GITHUB_USER = process.env.GITHUB_USER || 'chnbsdan'
const GITHUB_REPO = process.env.GITHUB_REPO || 'imgbed-storage'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const FOLDERS = ['wallpaper', 'cover']

// 从 GitHub 获取文件夹内容
async function getFolderImages(folder) {
  try {
    const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${folder}`
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'Vercel-Serverless'
      }
    })
    
    if (!response.ok) return []
    
    const files = await response.json()
    if (!Array.isArray(files)) return []
    
    return files
      .filter(f => f.name && f.name.match(/\.(jpg|jpeg|png|webp|gif|avif)$/i))
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
    console.error(`Failed to fetch ${folder}:`, error)
    return []
  }
}

// 获取外部图片
async function getExternalImages() {
  try {
    const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/external.json`
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3.raw',
        'User-Agent': 'Vercel-Serverless'
      }
    })
    if (response.ok) {
      const data = await response.json()
      if (data.wallpaper && data.cover) {
        return {
          wallpaper: (data.wallpaper || []).map(url => ({
            name: url.split('/').pop(),
            url: url,
            folder: 'wallpaper',
            source: 'external'
          })),
          cover: (data.cover || []).map(url => ({
            name: url.split('/').pop(),
            url: url,
            folder: 'cover',
            source: 'external'
          }))
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch external images:', error)
  }
  return { wallpaper: [], cover: [] }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  try {
    // 并行获取所有文件夹的图片
    const [wallpaperImages, coverImages, externalImages] = await Promise.all([
      getFolderImages('wallpaper'),
      getFolderImages('cover'),
      getExternalImages()
    ])
    
    // 合并外部图片
    const allWallpaper = [...wallpaperImages, ...externalImages.wallpaper]
    const allCover = [...coverImages, ...externalImages.cover]
    
    res.status(200).json({
      total: allWallpaper.length + allCover.length,
      folders: {
        wallpaper: allWallpaper,
        cover: allCover
      }
    })
  } catch (error) {
    console.error('Error in admin/list.js:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
