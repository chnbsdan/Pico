// api/stats.js - 统计信息（包含所有文件夹和外部图片）
const GITHUB_USER = process.env.GITHUB_USER || 'chnbsdan'
const GITHUB_REPO = process.env.GITHUB_REPO || 'Pico'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

// 所有文件夹列表
const FOLDERS = ['wallpaper', 'cover', 'sh', 'sd']

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
      return {
        wallpaper: data.wallpaper || [],
        cover: data.cover || [],
        sh: data.sh || [],
        sd: data.sd || []
      }
    }
  } catch (error) {
    console.error('Failed to fetch external images:', error)
  }
  return { wallpaper: [], cover: [], sh: [], sd: [] }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  const stats = { github_folders: {}, github_total: 0, external_folders: {}, external_total: 0, grand_total: 0 }
  
  try {
    // 获取 GitHub 图片统计（遍历所有文件夹）
    for (const folder of FOLDERS) {
      const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${folder}`
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'User-Agent': 'Vercel-Serverless'
        }
      })
      if (response.ok) {
        const files = await response.json()
        if (Array.isArray(files)) {
          const count = files.filter(f => f.name && f.name.match(/\.(jpg|jpeg|png|webp|gif|avif)$/i) && f.name !== '.keep').length
          stats.github_folders[folder] = count
          stats.github_total += count
        } else {
          stats.github_folders[folder] = 0
        }
      } else {
        stats.github_folders[folder] = 0
      }
    }
    
    // 获取外部图片统计
    const externalImages = await getExternalImages()
    stats.external_folders.wallpaper = externalImages.wallpaper.length
    stats.external_folders.cover = externalImages.cover.length
    stats.external_folders.sh = externalImages.sh.length
    stats.external_folders.sd = externalImages.sd.length
    stats.external_total = externalImages.wallpaper.length + externalImages.cover.length + externalImages.sh.length + externalImages.sd.length
    stats.grand_total = stats.github_total + stats.external_total
    
    res.status(200).json(stats)
  } catch (error) {
    console.error('Error in stats.js:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
