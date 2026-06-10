// api/random.js
const GITHUB_USER = process.env.GITHUB_USER || '你的GitHub用户名'
const GITHUB_REPO = process.env.GITHUB_REPO || 'imgbed-storage'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const FOLDERS = ['wallpaper', 'cover']

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  
  try {
    let allImages = []
    for (const folder of FOLDERS) {
      const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${folder}`
      const response = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` }
      })
      if (response.ok) {
        const files = await response.json()
        const images = files.filter(f => f.name && f.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)).map(f => f.download_url)
        allImages.push(...images)
      }
    }
    if (allImages.length === 0) return res.status(404).send('No images')
    const randomUrl = allImages[Math.floor(Math.random() * allImages.length)]
    const imgRes = await fetch(randomUrl)
    const body = await imgRes.arrayBuffer()
    res.setHeader('Content-Type', imgRes.headers.get('Content-Type') || 'image/jpeg')
    res.setHeader('Content-Disposition', 'inline')
    res.send(Buffer.from(body))
  } catch (error) {
    res.status(500).send('Internal error')
  }
}
