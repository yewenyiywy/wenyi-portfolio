'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import PortfolioView from './portfolio-view'
import './archive.css'

const folders = [
  { id:'personal', title:'Personal', subtitle:'About & contact', chapters:'about contact' },
  { id:'academic', title:'Academic', subtitle:'Education & awards', chapters:'education awards' },
  { id:'technical', title:'Technical', subtitle:'Skills', chapters:'skills' },
  { id:'professional', title:'Professional', subtitle:'Experience', chapters:'experience' },
  { id:'research', title:'Research', subtitle:'Projects', chapters:'projects' },
] as const
type Folder = typeof folders[number]

export default function ArchivePortfolio() {
  const [active, setActive] = useState<Folder>(folders[0])
  const stackRef = useRef<HTMLDivElement>(null)
  const ordered = [...folders.filter(f=>f.id!==active.id),active]
  const scrollStack = () => requestAnimationFrame(() => stackRef.current?.scrollIntoView({behavior:'smooth',block:'start'}))

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1)
      const folder = folders.find(f => f.id === hash || f.chapters.split(' ').includes(hash))
      setActive(folder ?? folders[0])
      if(folder) requestAnimationFrame(() => {
        const target = document.getElementById(hash)
        if(target) target.scrollIntoView({block:'start'});else stackRef.current?.scrollIntoView({block:'start'})
      })
    }
    sync()
    window.addEventListener('hashchange',sync)
    window.addEventListener('popstate',sync)
    return () => {window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync)}
  }, [])

  function open(folder: Folder) {
    if(folder.id===active.id)return
    setActive(folder)
    window.history.pushState(null,'',`/classic#${folder.id}`)
    scrollStack()
  }

  function close() {
    setActive(folders[0])
    window.history.pushState(null,'','/classic')
    requestAnimationFrame(() => window.scrollTo({top:0,behavior:'smooth'}))
  }

  return <div className="archive-home">
    <nav className="archive-nav"><Link href="/classic" className="archive-brand" onClick={e=>{e.preventDefault();close()}}>WENYI YE<span>.</span></Link><div><Link href="/">Play game</Link><Link href="/hobbies">Hobbies</Link><Link href="/classic/full" className="archive-full-link">View full portfolio</Link></div></nav>
    <div className="archive-index">
      <div className="archive-paper-stack" ref={stackRef} aria-label="Five overlapping portfolio papers">
        {ordered.slice(0,4).map((folder,index)=><div key={folder.id} className="archive-sheet archive-sheet-back" style={{'--sheet-index':index} as CSSProperties}><button className="archive-sheet-label" type="button" aria-pressed={false} onClick={()=>open(folder)}><strong>{folder.title}</strong><span>{folder.subtitle}</span></button></div>)}
        <div className="archive-sheet archive-sheet-front archive-paper" key={active.id}>
          <button className="archive-sheet-label archive-sheet-selected" type="button" aria-pressed={true} onClick={()=>open(active)}><strong>{active.title}</strong><span>{active.subtitle}</span></button>
          <PortfolioView chapter={active.chapters}/>
        </div>
      </div>
    </div>
  </div>
}
