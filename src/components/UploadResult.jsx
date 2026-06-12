import React, { useState } from 'react'
import { copyToClipboard } from '../lib/api'

export default function UploadResult({ results }) {
  const [copied, setCopied] = useState(null)

  const handleCopy = (url, id) => {
    copyToClipboard(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const handlePreview = (url, id) => {
    const container = document.getElementById(`preview-${id}`)
    if (!container) return
    
    container.innerHTML = '<div class="text-xs text-gray-400 flex items-center gap-1"><div class="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> 加载中...</div>'
    
    const img = new Image()
    img.onload = () => {
      container.innerHTML = ''
      container.appendChild(img)
      img.className = 'max-w-full max-h-24 rounded-lg mt-2'
    }
    img.onerror = () => {
      container.innerHTML = '<span class="text-xs text-red-500">加载失败</span>'
    }
    img.src = url + '?t=' + Date.now()
  }

  // 生成完整的代理 URL（动态获取域名）
  const getProxyUrl = (folder, filename) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://pcbed.vercel.app'
    return `${baseUrl}/api/image?path=${folder}/${filename}`
  }

  if (results.length === 0) return null

  return (
    <div className="space-y-3 mt-4 animate-slide-up">
      <h4 className="text-sm font-medium text-green-500">上传结果</h4>
      {results.map((result, idx) => {
        const proxyUrl = result.success && result.filename ? getProxyUrl(result.folder, result.filename) : null
        
        return (
          <div 
            key={idx} 
            className={`rounded-xl p-3 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                    {result.success ? '✓' : '✗'} {result.filename}
                  </span>
                  <span className="text-xs text-gray-500">{result.folder === 'wallpaper' ? '横屏' : '竖屏'}</span>
                </div>
                {result.success && proxyUrl && (
                  <>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <code className="text-xs bg-white px-2 py-1 rounded flex-1 truncate">{proxyUrl}</code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopy(proxyUrl, `url-${idx}`)
                        }}
                        className="p-1.5 hover:bg-white rounded-lg transition"
                      >
                        {copied === `url-${idx}` ? <i className="fas fa-check text-green-500"></i> : <i className="fas fa-copy text-gray-400"></i>}
                      </button>
                      <a 
                        href={proxyUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="p-1.5 hover:bg-white rounded-lg transition"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <i className="fas fa-external-link-alt text-gray-400"></i>
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePreview(proxyUrl, idx)
                        }}
                        className="p-1.5 hover:bg-white rounded-lg transition"
                      >
                        <i className="fas fa-eye text-gray-400"></i>
                      </button>
                    </div>
                    <div id={`preview-${idx}`} className="mt-2"></div>
                  </>
                )}
                {!result.success && <p className="text-xs text-red-500 mt-1">{result.error}</p>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
