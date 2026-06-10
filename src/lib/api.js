import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// 使用相对路径，调用同域下的 API
export async function fetchStats() {
  const res = await fetch(`/api/stats`)
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}

export async function uploadImage(file, folder) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)
  
  const res = await fetch(`/api/upload`, {
    method: 'POST',
    body: formData,
  })
  
  return res.json()
}

export function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
}
