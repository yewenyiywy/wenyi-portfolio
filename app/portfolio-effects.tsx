'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Lenis from 'lenis'
import './portfolio-effects.css'

export default function PortfolioEffects() {
  const pathname=usePathname()
  useEffect(()=>{
    const preference=matchMedia('(prefers-reduced-motion: reduce)')
    const root=document.documentElement
    let frame=0,x=0,y=0
    const paint=()=>{
      frame=0
      root.style.setProperty('--ambient-x',String(x))
      root.style.setProperty('--ambient-y',String(y))
      root.style.setProperty('--light-x',`${50+x*33}%`)
      root.style.setProperty('--light-y',`${30+y*22}%`)
    }
    const move=(e:PointerEvent)=>{
      if(preference.matches||e.pointerType!=='mouse')return
      x=e.clientX/Math.max(1,innerWidth)*2-1
      y=e.clientY/Math.max(1,innerHeight)*2-1
      if(!frame)frame=requestAnimationFrame(paint)
    }
    const reset=()=>{x=y=0;if(!frame)frame=requestAnimationFrame(paint)}
    document.addEventListener('pointermove',move,{passive:true})
    document.documentElement.addEventListener('pointerleave',reset)
    window.addEventListener('blur',reset)
    preference.addEventListener('change',reset)
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('pointermove',move);document.documentElement.removeEventListener('pointerleave',reset);window.removeEventListener('blur',reset);preference.removeEventListener('change',reset)}
  },[])

  useEffect(()=>{
    if(!pathname.startsWith('/classic')||matchMedia('(prefers-reduced-motion: reduce)').matches)return
    const lenis=new Lenis({autoRaf:true, duration:.75, prevent:node=>Boolean(node.closest('[role="dialog"],textarea,.journal-tarot-ring'))})
    return()=>lenis.destroy()
  },[pathname])
  return <div key={pathname} className="portfolio-ink-transition" data-dark={pathname==='/'?'true':undefined} aria-hidden="true"/>
}
