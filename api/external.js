// api/external.js - 从 GitHub 存储仓库读取外部图片列表
const GITHUB_USER = process.env.GITHUB_USER || 'chnbsdan'
const GITHUB_REPO = process.env.GITHUB_REPO || 'imgbed-storage'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  
  try {
    // 从 GitHub 存储仓库读取 external.json
    const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/external.json`
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3.raw',
        'User-Agent': 'Vercel-Serverless'
      }
    })
    
    if (!response.ok) {
      // 文件不存在，返回空数组
      return res.status(200).json({ images: [] })
    }
    
    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('Error loading external images:', error)
    res.status(200).json({ images: [] })
  }
}
