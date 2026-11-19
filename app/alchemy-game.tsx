'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PortfolioView from './portfolio-view'
import './alchemy.css'

const ingredients = [
  { id: 'coin', name: 'Golden Marmoset', frames: 6 },
  { id: 'tentacle', name: 'Octopus Tentacle', frames: 4 },
  { id: 'flower', name: 'Narcissus', frames: 4 },
  { id: 'chip', name: 'AI Chip', frames: 4 },
  { id: 'lace', name: 'Embroidered Lace', frames: 4 },
] as const
type Ingredient = typeof ingredients[number]['id']
const recipes: { id: string; title: string; items: [Ingredient, Ingredient] }[] = [
  { id: 'about', title: 'About me', items: ['flower', 'lace'] },
  { id: 'education', title: 'Education', items: ['tentacle', 'flower'] },
  { id: 'skills', title: 'Skills', items: ['chip', 'tentacle'] },
  { id: 'experience', title: 'Experience', items: ['coin', 'chip'] },
  { id: 'projects', title: 'Projects', items: ['chip', 'flower'] },
  { id: 'awards', title: 'Honors & awards', items: ['coin', 'lace'] },
  { id: 'contact', title: 'Contact', items: ['coin', 'flower'] },
]

function Sprite({ id, frames, pot = false }: { id: string; frames: number; pot?: boolean }) {
  return <span aria-hidden="true" className={`alchemy-sprite${pot ? ' alchemy-pot' : ''}`} style={{ '--sheet': `url(/alchemy/${id}.webp)`, '--frames': frames } as CSSProperties} />
}

export default function AlchemyGame() {
  const router = useRouter()
  const [selected, setSelected] = useState<Ingredient[]>([])
  const [unlocked, setUnlocked] = useState<string[]>([])
  const [chapter, setChapter] = useState<string | null>(null)
  const [brewing, setBrewing] = useState(false)
  const [message, setMessage] = useState('Choose two ingredients to brew a chapter.')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reward = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.location.hash) {
      const requested = window.location.hash.slice(1)
      if (recipes.some(r => r.id === requested)) router.replace(`/classic#${requested}`)
    }
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [router])

  function choose(id: Ingredient, onlyAdd = false) {
    if (brewing) return
    setSelected(prev => prev.includes(id) ? onlyAdd ? prev : prev.filter(i => i !== id) : prev.length === 2 ? [prev[1], id] : [...prev, id])
    setMessage('Choose a second ingredient, or brew your potion.')
  }

  function openChapter(id: string) {
    setChapter(id)
    requestAnimationFrame(() => reward.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function brew() {
    if (selected.length !== 2 || brewing) return
    const match = recipes.find(r => r.items.every(i => selected.includes(i)))
    setBrewing(true)
    setMessage('Something magical is happening…')
    timer.current = setTimeout(() => {
      setBrewing(false)
      setSelected([])
      if (!match) { setMessage('A mysterious potion… Try a different pair.'); return }
      setUnlocked(prev => prev.includes(match.id) ? prev : [...prev, match.id])
      setMessage(`${match.title} discovered!`)
      openChapter(match.id)
    }, 1100)
  }

  return <div className="alchemy-home">
    <nav className="alchemy-nav"><Link href="/" className="alchemy-brand">WENYI YE<span>.</span></Link><div><Link href="/hobbies">Hobbies</Link><Link href="/classic" className="alchemy-skip">Skip game · View portfolio</Link></div></nav>
    <div className="alchemy-shell">
      <header className="alchemy-heading"><h1>Mix two ingredients to uncover a chapter of Wenyi’s story.</h1></header>
      <div className="alchemy-scene" aria-label="Alchemy workbench">
        {ingredients.map(i => <button type="button" key={i.id} className={`alchemy-ingredient ingredient-${i.id}`} disabled={brewing} aria-label={i.name} aria-pressed={selected.includes(i.id)} onClick={() => choose(i.id)} draggable={!brewing} onDragStart={e => { e.dataTransfer.setData('text/plain', i.id); e.dataTransfer.effectAllowed = 'copy' }}><Sprite id={i.id} frames={i.frames}/></button>)}
        <div className="alchemy-cauldron" onDragOver={e => { if (!brewing) e.preventDefault() }} onDrop={e => { e.preventDefault(); const id = ingredients.find(i => i.id === e.dataTransfer.getData('text/plain'))?.id; if (id) choose(id, true) }}>
          <Sprite key={brewing ? 'splash' : selected.length === 2 ? 'purple' : selected.length === 1 ? 'green' : 'empty'} id={brewing ? 'splash' : selected.length === 2 ? 'purple' : selected.length === 1 ? 'green' : 'empty'} frames={brewing ? 5 : 6} pot />
        </div>
      </div>
      <div className="alchemy-actions">
        <div className="alchemy-selection" aria-live="polite">{selected.length === 2 ? 'Ready to brew' : selected.length === 1 ? 'Choose one more ingredient' : 'Select or drag two ingredients into the cauldron'}</div>
        <button className="alchemy-brew" type="button" onClick={brew} disabled={selected.length !== 2 || brewing}>{brewing ? 'Brewing…' : 'Brew potion'}</button>
        <p className="alchemy-message" role="status">{message}</p>
      </div>
      {unlocked.length > 0 && <div className="alchemy-discoveries"><span>Discovered:</span>{recipes.filter(r => unlocked.includes(r.id)).map(r => <button key={r.id} onClick={() => openChapter(r.id)} type="button">{r.title}</button>)}</div>}
      <p className="alchemy-note">Prefer a traditional introduction? <Link href="/classic">Read the complete portfolio.</Link></p>
      {chapter && <div ref={reward} className="alchemy-reward"><div className="alchemy-reward-header"><span>CHAPTER UNLOCKED · {recipes.find(r => r.id === chapter)?.title}</span><button onClick={() => setChapter(null)} type="button">Close ×</button></div><PortfolioView key={chapter} chapter={chapter}/></div>}
    </div>
  </div>
}
