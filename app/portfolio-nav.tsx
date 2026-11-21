'use client'

import Link from 'next/link'
import { useState } from 'react'

const sections = [
  {id:'about', label:'About'},
  {id:'education', label:'Education'},
  {id:'skills', label:'Skills'},
  {id:'experience', label:'Experience'},
  {id:'projects', label:'Projects'},
] as const

export default function PortfolioNav({page, activeSection, onHome, onSection}:{
  page:'hobbies'|'archive'
  activeSection?:string
  onHome?:()=>void
  onSection?:(section:string)=>void
}) {
  const [menu, setMenu]=useState(false)
  const closeMenu=()=>setMenu(false)
  const links=()=> <>
    {sections.map(({id,label})=><Link key={id} href={`/classic#${id}`} className={activeSection===id?'active':undefined} onClick={e=>{closeMenu();if(onSection){e.preventDefault();onSection(id)}}}>{label}</Link>)}
    <Link href="/hobbies" className={page==='hobbies'?'active':undefined} onClick={closeMenu}>Hobbies</Link>
    <Link href="/game" onClick={closeMenu}>Play game</Link>
    <Link href="/classic#contact" onClick={e=>{closeMenu();if(onSection){e.preventDefault();onSection('contact')}}}>Get in touch</Link>
  </>
  return <nav className="portfolio-topnav" aria-label="Portfolio navigation">
    <Link href="/" className="portfolio-topnav-brand" onClick={closeMenu}>WENYI YE<span>.</span></Link>
    <div className="portfolio-topnav-links">{links()}</div>
    <Link href="/classic/full" className="portfolio-topnav-full" onClick={closeMenu}>View full portfolio</Link>
    <button type="button" className="portfolio-topnav-toggle" aria-label={menu?'Close navigation':'Open navigation'} aria-expanded={menu} onClick={()=>setMenu(v=>!v)}><span/><span/></button>
    {menu&&<div className="portfolio-topnav-menu">{links()}</div>}
  </nav>
}
