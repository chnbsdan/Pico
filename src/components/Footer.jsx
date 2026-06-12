import React, { useState, useEffect } from 'react'

export default function Footer() {
  // 设置为 100 天前的日期（2026年3月4日前后，根据当天自动计算）
  // 这样显示的就是从 100 天开始累加
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 100)  // 自动设为 100 天前
  startDate.setHours(0, 0, 0, 0)  // 归零到当天 00:00:00
  
  const [timeElapsed, setTimeElapsed] = useState({
    days: 100,  // 初始显示 100 天
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const diff = now - startDate // 时间差（毫秒）

      // 计算天数、小时、分钟、秒
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (86400000)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (3600000)) / (1000 * 60))
      const seconds = Math.floor((diff % (60000)) / 1000)

      setTimeElapsed({ days, hours, minutes, seconds })
    }, 1000)

    return () => clearInterval(timer)
  }, [startDate])

  return (
    <footer className="text-center mt-8 pt-4 border-t border-white/20 text-white/40 text-xs">
      <p>
        <span className="text-white/60">Powered by</span>
        <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition mx-1">Vercel</a>
        <span className="text-white/60">+</span>
        <a href="https://github.com/chnbsdan" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition ml-1">GitHub</a>
      </p>
      
      {/* 稳定运行时间 */}
      <p className="mt-3 text-white/60 text-xs flex items-center justify-center gap-1">
         <span className="ml-1">当前服务器运行正常 </span>
        {/* 绿色闪烁圆点 */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        | 本站已稳定运行
        <span className="text-white/80 font-mono mx-1">{timeElapsed.days}</span>天
        <span className="text-white/80 font-mono mx-1">{timeElapsed.hours}</span>小时
        <span className="text-white/80 font-mono mx-1">{timeElapsed.minutes}</span>分钟
        <span className="text-white/80 font-mono mx-1">{timeElapsed.seconds}</span>秒
       
      </p>

      <p className="mt-2 text-white/80 text-xs">
        未来可期，不负韶华
      </p>
    </footer>
  )
}
