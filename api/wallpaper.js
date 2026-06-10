// api/wallpaper.js - 仅返回 wallpaper 文件夹的随机图片
const GITHUB_USER = process.env.GITHUB_USER || 'chnbsdan'
const GITHUB_REPO = process.env.GITHUB_REPO || 'imgbed-storage'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const FOLDER = 'wallpaper'

export default async function handler(req, res) {
  // 禁止缓存，确保每次刷新都是新图片
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.setHeader('Access-Control-Allow-Origin', '*')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  try {
    const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${FOLDER}`
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'Vercel-Serverless'
      }
    })
    
    if (!response.ok) {
      console.error(`GitHub API error: ${response.status}`)
      return res.status(500).send('Failed to fetch images')
    }
    
    const files = await response.json()
    if (!Array.isArray(files)) {
      return res.status(500).send('Invalid response from GitHub')
    }
    
    const images = files.filter(f => f.name && f.name.match(/\.(jpg|jpeg|png|webp|gif)$/i))
      .map(f => f.download_url)
    
    if (images.length === 0) {
      return res.status(404).send('No images found in wallpaper folder')
    }
    
    const randomUrl = images[Math.floor(Math.random() * images.length)]
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
    console.error('Error in wallpaper.js:', error)
    res.status(500).send('Internal server error')
  }
}
