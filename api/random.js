// api/random.js - 合并 JSON 功能
const GITHUB_USER = process.env.GITHUB_USER || 'chnbsdan'
const GITHUB_REPO = process.env.GITHUB_REPO || 'pcbed'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const FOLDERS = ['wallpaper', 'cover']

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
      const images = []
      if (data.wallpaper) images.push(...data.wallpaper)
      if (data.cover) images.push(...data.cover)
      return images
    }
  } catch (error) {
    console.error('Failed to fetch external images:', error)
  }
  return []
}

// 获取 GitHub 图片列表
async function getGitHubImages(folder) {
  try {
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
        return files
          .filter(f => f.name && f.name.match(/\.(jpg|jpeg|png|webp|gif|avif)$/i))
          .map(f => f.download_url)
      }
    }
  } catch (error) {
    console.error(`Failed to fetch ${folder}:`, error)
  }
  return []
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Access-Control-Allow-Origin', '*')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  const format = req.query.format  // 获取 format 参数
  
  try {
    // 获取所有图片
    const [wallpaperImages, coverImages, externalImages] = await Promise.all([
      getGitHubImages('wallpaper'),
      getGitHubImages('cover'),
      getExternalImages()
    ])
    
    const allImages = [...wallpaperImages, ...coverImages, ...externalImages]
    
    if (allImages.length === 0) {
      return res.status(404).json({ error: 'No images found' })
    }
    
    const randomIndex = Math.floor(Math.random() * allImages.length)
    const randomUrl = allImages[randomIndex]
    
    // 如果请求 JSON 格式
    if (format === 'json') {
      return res.status(200).json({
        code: "200",
        imgurl: randomUrl,
        source: randomUrl,
        total: allImages.length
      })
    }
    
    // 否则返回图片
    const imgRes = await fetch(randomUrl)
    if (!imgRes.ok) {
      return res.status(500).send('Failed to fetch image')
    }
    
    const contentType = imgRes.headers.get('Content-Type') || 'image/jpeg'
    const body = await imgRes.arrayBuffer()
    
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', 'inline')
    res.send(Buffer.from(body))
  } catch (error) {
    console.error('Error in random.js:', error)
    res.status(500).send('Internal error')
  }
}
