import React from 'react'

export default function Footer() {
  return (
    <footer className="text-center mt-8 pt-4 border-t border-white/20 text-white/40 text-xs">
      <p>
        Powered by <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition">Vercel</a> + 
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition ml-1">GitHub</a>
      </p>
      <p className="mt-2 text-white/30 text-xs">
        未来可期，不负韶华
      </p>
    </footer>
  )
}
