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

  function choose(id: Ingredient) {
    if (brewing) return
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : prev.length === 2 ? [prev[1], id] : [...prev, id])
    setMessage('Mix two ingredients in the cauldron.')
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
      if (!match) { setMessage('A mysterious potion! Try a combination from the recipe book.'); return }
      setUnlocked(prev => prev.includes(match.id) ? prev : [...prev, match.id])
      setMessage(`${match.title} discovered!`)
      openChapter(match.id)
    }, 1100)
  }

  return <div className="alchemy-home">
    <nav className="alchemy-nav"><Link href="/" className="alchemy-brand">WENYI YE<span>.</span></Link><div><Link href="/hobbies">Hobbies</Link><Link href="/classic" className="alchemy-skip">Skip game · View portfolio</Link></div></nav>
    <div className="alchemy-shell">
      <header className="alchemy-heading"><p>THE ALCHEMY ARCHIVE</p><h1>A little magic, a lot of curiosity.</h1><p>Explore Wenyi’s story by mixing ingredients and uncovering the chapters of her portfolio.</p></header>
      <div className="alchemy-board">
        <section className="alchemy-panel alchemy-inventory"><h2>Ingredients</h2><p>Pick any two.</p><div className="alchemy-items">{ingredients.map(i => <button type="button" key={i.id} disabled={brewing} aria-pressed={selected.includes(i.id)} onClick={() => choose(i.id)}><Sprite id={i.id} frames={i.frames}/><span>{i.name}</span></button>)}</div></section>
        <section className="alchemy-panel alchemy-workbench"><div className="alchemy-counter">{unlocked.length} / {recipes.length} chapters discovered</div><div className="alchemy-cauldron"><Sprite key={brewing ? 'splash' : selected.length === 2 ? 'purple' : selected.length === 1 ? 'green' : 'empty'} id={brewing ? 'splash' : selected.length === 2 ? 'purple' : selected.length === 1 ? 'green' : 'empty'} frames={brewing ? 5 : 6} pot /></div><div className="alchemy-slots">{[0, 1].map(n => { const item = ingredients.find(i => i.id === selected[n]); return <button key={n} type="button" disabled={!item || brewing} onClick={() => item && choose(item.id)} aria-label={item ? `Remove ${item.name}` : 'Empty ingredient slot'}>{item ? <Sprite id={item.id} frames={item.frames}/> : '+'}</button> })}</div><button className="alchemy-brew" type="button" onClick={brew} disabled={selected.length !== 2 || brewing}>{brewing ? 'Brewing…' : 'Brew potion'}</button><p className="alchemy-message" role="status">{message}</p></section>
        <section className="alchemy-panel alchemy-book"><h2>Recipe book</h2><p>Discover every chapter.</p>{recipes.map(r => <button type="button" key={r.id} className={unlocked.includes(r.id) ? 'unlocked' : ''} disabled={brewing} onClick={() => { if (unlocked.includes(r.id)) openChapter(r.id); else { setSelected([...r.items]); setMessage(`Ready to brew: ${r.title}.`) } }}><span>{r.title}</span><span className="alchemy-recipe-icons">{r.items.map(id => <Sprite key={id} id={id} frames={ingredients.find(i => i.id === id)!.frames} />)}<span>{unlocked.includes(r.id) ? '✓' : '◇'}</span></span></button>)}</section>
      </div>
      <p className="alchemy-note">Prefer a traditional introduction? <Link href="/classic">Read the complete portfolio.</Link></p>
      {chapter && <div ref={reward} className="alchemy-reward"><div className="alchemy-reward-header"><span>CHAPTER UNLOCKED · {recipes.find(r => r.id === chapter)?.title}</span><button onClick={() => setChapter(null)} type="button">Close ×</button></div><PortfolioView key={chapter} chapter={chapter}/></div>}
    </div>
  </div>
}
