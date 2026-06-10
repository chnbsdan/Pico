// api/json.js - 返回随机图片的 JSON 信息
const GITHUB_USER = process.env.GITHUB_USER || 'chnbsdan'
const GITHUB_REPO = process.env.GITHUB_REPO || 'imgbed-storage'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const FOLDERS = ['wallpaper', 'cover']

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
      return data.images || []
    }
  } catch (error) {
    console.error('Failed to fetch external images:', error)
  }
  return []
}

async function isImageValid(url) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal })
    clearTimeout(timeoutId)
    return res.ok
  } catch {
    return false
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  try {
    let allImages = []
    
    // 获取 GitHub 图片
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
          const images = files
            .filter(f => f.name && f.name.match(/\.(jpg|jpeg|png|webp|gif|avif)$/i))
            .map(f => f.download_url)
          allImages.push(...images)
        }
      }
    }
    
    // 获取外部图片
    const externalImages = await getExternalImages()
    for (const url of externalImages) {
      if (await isImageValid(url)) {
        allImages.push(url)
      }
    }
    
    if (allImages.length === 0) {
      return res.status(404).json({ error: 'No images found' })
    }
    
    const randomUrl = allImages[Math.floor(Math.random() * allImages.length)]
    const host = req.headers.host || ''
    const protocol = req.headers['x-forwarded-proto'] || 'https'
    
    res.status(200).json({
      code: '200',
      imgurl: `${protocol}://${host}/api/random`,
      source: randomUrl,
      total: allImages.length
    })
  } catch (error) {
    console.error('Error in json.js:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
