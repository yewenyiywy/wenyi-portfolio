'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import PortfolioView from './portfolio-view'
import './professional.css'

const folders=[
  {id:'personal',title:'About',chapters:'about contact'},
  {id:'academic',title:'Education & Awards',chapters:'education awards'},
  {id:'professional',title:'Experience',chapters:'experience'},
  {id:'research',title:'Projects',chapters:'projects'},
  {id:'technical',title:'Skills',chapters:'skills'},
] as const
type Folder=typeof folders[number]

export default function ArchivePortfolio({full=false}:{full?:boolean}){
  const [active,setActive]=useState<Folder>(folders[0]);const paper=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    if(full)return
    const sync=()=>{const hash=window.location.hash.slice(1);const folder=folders.find(f=>f.id===hash||f.chapters.split(' ').includes(hash));setActive(folder??folders[0]);if(hash==='contact')requestAnimationFrame(()=>document.getElementById('contact')?.scrollIntoView({block:'start'}))}
    sync();window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync)
    return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync)}
  },[full])
  function open(folder:Folder){setActive(folder);window.history.pushState(null,'',`/classic#${folder.chapters.split(' ')[0]}`);requestAnimationFrame(()=>paper.current?.scrollIntoView({block:'start',behavior:'smooth'}))}
  return <div className={`professional-shell${full?' professional-full':''}`}>
    <header className="professional-topbar"><Link href="/" className="professional-back">← Back to studio</Link><Link href="/" className="professional-brand">Wenyi Ye<span>.</span></Link><Link href="/classic/full" className="professional-full-link">View full portfolio</Link></header>
    <div className="professional-heading"><p>WENYI YE / PROFESSIONAL DOSSIER</p><h1>{full?'Portfolio':active.title}</h1><span>Quantitative Finance · AI · Product</span></div>
    <nav className="professional-tabs" aria-label="Portfolio sections">
      {folders.map(folder=>full?<a key={folder.id} href={`#${folder.chapters.split(' ')[0]}`}>{folder.title}</a>:<button key={folder.id} type="button" aria-pressed={active.id===folder.id} onClick={()=>open(folder)}>{folder.title}</button>)}
      <Link href="/hobbies">Hobbies</Link>
    </nav>
    <div className="professional-paper-area" ref={paper}>
      {full?<PortfolioView/>:<div key={active.id} className="professional-dossier"><PortfolioView chapter={active.chapters}/></div>}
    </div>
    <footer className="professional-end"><Link href="/">← Back to studio</Link><span>Wenyi Ye · 2026</span></footer>
  </div>
}
