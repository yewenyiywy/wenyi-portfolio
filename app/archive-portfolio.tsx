'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
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
  const [active, setActive] = useState<Folder | null>(null)
  const documentRef = useRef<HTMLDivElement>(null)
  const indexRef = useRef<HTMLDivElement>(null)
  const scrollDocument = () => requestAnimationFrame(() => documentRef.current?.scrollIntoView({behavior:'smooth',block:'start'}))

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1)
      const folder = folders.find(f => f.id === hash || f.chapters.split(' ').includes(hash))
      setActive(folder ?? null)
      if(folder) requestAnimationFrame(() => {
        const target = document.getElementById(hash)
        if(target) target.scrollIntoView({block:'start'});else documentRef.current?.scrollIntoView({block:'start'})
      })
    }
    sync()
    window.addEventListener('hashchange',sync)
    window.addEventListener('popstate',sync)
    return () => {window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync)}
  }, [])

  function open(folder: Folder) {
    setActive(folder)
    window.history.pushState(null,'',`/classic#${folder.id}`)
    scrollDocument()
  }

  function close() {
    setActive(null)
    window.history.pushState(null,'','/classic')
    requestAnimationFrame(() => indexRef.current?.scrollIntoView({behavior:'smooth',block:'start'}))
  }

  return <div className="archive-home">
    <nav className="archive-nav"><Link href="/classic" className="archive-brand" onClick={e=>{if(active){e.preventDefault();close()}}}>WENYI YE<span>.</span></Link><div><Link href="/">Play game</Link><Link href="/hobbies">Hobbies</Link><Link href="/classic/full" className="archive-full-link">View full portfolio</Link></div></nav>
    <div className="archive-index" ref={indexRef}>
      <header><h1>Wenyi Ye</h1><p>Quantitative Finance × AI</p></header>
      <div className="archive-stacks" aria-label="Portfolio archives">{folders.map((folder,index) => <button key={folder.id} type="button" className={`archive-stack archive-stack-${index}`} aria-pressed={active?.id===folder.id} onClick={()=>open(folder)}><span className="archive-stack-paper"><strong>{folder.title}</strong><span>{folder.subtitle}</span></span></button>)}</div>
      <p className="archive-index-note">Select a document to explore.</p>
    </div>
    {active && <div ref={documentRef} className="archive-document">
      <div className="archive-document-actions"><button type="button" onClick={close}>Back to archives</button><span>{active.title}</span><Link href="/classic/full">Full portfolio</Link></div>
      <div className="archive-paper"><PortfolioView key={active.id} chapter={active.chapters}/></div>
    </div>}
  </div>
}
