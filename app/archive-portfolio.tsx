'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import PortfolioView from './portfolio-view'
import PortfolioNav from './portfolio-nav'
import './archive.css'

const folders = [
  { id:'personal', title:'About', chapters:'about contact', tape:7 },
  { id:'academic', title:'Education & Awards', chapters:'education awards', tape:5 },
  { id:'technical', title:'Skills', chapters:'skills', tape:4 },
  { id:'professional', title:'Experience', chapters:'experience', tape:6 },
  { id:'research', title:'Projects', chapters:'projects', tape:1 },
] as const
type Folder = typeof folders[number]

function SheetTitle({folder}:{folder:Folder}) {
  return <span className={`archive-sheet-tape archive-sheet-tape-${folder.tape}`}>{folder.title}</span>
}

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

  function navigateSection(section:string) {
    const folder=folders.find(f=>f.chapters.split(' ').includes(section))
    if(!folder)return
    setActive(folder)
    window.history.pushState(null,'',`/classic#${section}`)
    requestAnimationFrame(()=>{
      if(section==='contact')document.getElementById(section)?.scrollIntoView({behavior:'smooth',block:'start'})
      else stackRef.current?.scrollIntoView({behavior:'smooth',block:'start'})
    })
  }

  return <div className="archive-home">
    <PortfolioNav page="archive" activeSection={active.chapters.split(' ')[0]} onHome={close} onSection={navigateSection}/>
    <div className="archive-index">
      <div className="archive-paper-stack" ref={stackRef} aria-label="Five overlapping portfolio papers">
        {ordered.slice(0,4).map((folder,index)=><div key={folder.id} className="archive-sheet archive-sheet-back" style={{'--sheet-index':index} as CSSProperties}><button className="archive-sheet-label" type="button" aria-pressed={false} onClick={()=>open(folder)}><SheetTitle folder={folder}/></button></div>)}
        <div className="archive-sheet archive-sheet-front archive-paper" key={active.id}>
          <button className="archive-sheet-label archive-sheet-selected" type="button" aria-pressed={true} onClick={()=>open(active)}><SheetTitle folder={active}/></button>
          <PortfolioView chapter={active.chapters}/>
        </div>
      </div>
    </div>
  </div>
}
