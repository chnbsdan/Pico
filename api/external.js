// api/external.js - 从 GitHub 存储仓库读取外部图片列表（按分类）
const GITHUB_USER = process.env.GITHUB_USER || 'chnbsdan'
const GITHUB_REPO = process.env.GITHUB_REPO || 'imgbed-storage'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  
  // 获取请求的分类参数
  const { category } = req.query
  
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
      return res.status(200).json({ wallpaper: [], cover: [] })
    }
    
    const data = await response.json()
    
    // 如果指定了分类，只返回该分类
    if (category && (category === 'wallpaper' || category === 'cover')) {
      return res.status(200).json({ [category]: data[category] || [] })
    }
    
    res.status(200).json(data)
  } catch (error) {
    console.error('Error loading external images:', error)
    res.status(200).json({ wallpaper: [], cover: [] })
  }
}
