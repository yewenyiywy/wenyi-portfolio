'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import './journal.css'

const steam = 'https://store.steampowered.com/app/3117820/Sultans_Game/'
const afterglowUrl = 'https://afterglow-gray-five.vercel.app/'

// One entry per two-page spread of the book.
const chapters = [
  { anchor: '', title: 'Contents' },
  { anchor: 'embroidery', title: 'Embroidery' },
  { anchor: 'game-design', title: 'Game design · Modding' },
  { anchor: 'afterglow', title: 'Game design · Afterglow' },
  { anchor: 'fashion-design', title: 'Fashion design' },
  { anchor: 'running', title: 'Running' },
]

// The table of contents: a chapter can span several spreads.
const contents = [
  { title: 'Embroidery', spread: 1 },
  { title: 'Game design', spread: 2 },
  { title: 'Fashion design', spread: 4 },
  { title: 'Running', spread: 5 },
]

const tarotCards = [
  ['00', 'The Fool', 'Jordan Park'],
  ['01', 'The Magician', 'Li Wei'],
  ['02', 'The High Priestess', 'Saoirse Byrne'],
  ['03', 'The Empress', 'Emily Carter'],
  ['04', 'The Emperor', 'Adrian Whitmore'],
  ['05', 'The Hierophant', 'Omar Farouk'],
  ['06', 'The Lovers', 'Ren Takahashi & Hana Sato'],
  ['07', 'The Chariot', 'Isaiah “Zay” Williams'],
  ['08', 'Strength', 'Amara Okafor'],
  ['09', 'The Hermit', 'Kenji Watanabe'],
  ['10', 'Wheel of Fortune', 'Kang Jiho'],
  ['11', 'Justice', 'Selin Yılmaz'],
  ['12', 'The Hanged Man', 'Sarah Benamar'],
  ['13', 'Death', 'Denise Brooks'],
  ['14', 'Temperance', 'Nour Haddad'],
  ['15', 'The Devil', 'Daniel Cho'],
  ['16', 'The Tower', 'Evan Miller'],
  ['17', 'The Star', 'Grace Huang'],
  ['18', 'The Moon', 'Nyibol Atem'],
  ['19', 'The Sun', 'Sofia Reyes'],
  ['20', 'Judgement', 'Theo Blackwood'],
  ['21', 'The World', 'Chloe Bennett'],
]

type Shot = { src: string; alt: string; title: string; note: string }
type FashionDesign = { design: string; pattern: string; title: string; subtitle: string; source: string; description: string }

const embroidery: Shot[] = [
  { src: '/hobbies/embroidery-pearl.jpg', alt: 'Blue bird embroidery made with feathers, beads and sequins', title: 'Blue bird', note: 'Sequins · feather · beadwork' },
  { src: '/hobbies/embroidery-bird-highres.png', alt: 'French-style beaded bird embroidery with a real feather wing', title: 'Beaded bird', note: 'Sequins · beads · feather detail' },
]

const gameStudies: Shot[] = [
  { src: '/hobbies/game-1.png', alt: "Hand-drawn character mod for Sultan's Game", title: 'Character study I', note: 'Ink · gouache' },
  { src: '/hobbies/game-2.png', alt: "Hand-drawn character mod for Sultan's Game", title: 'Character study II', note: 'Ink · gouache' },
]

const fashionDesigns: FashionDesign[] = [
  {
    design: '/hobbies/fashion-red-design.png', pattern: '/hobbies/fashion-red-pattern.png', title: 'Vermilion Swallows', subtitle: 'Bold red · swallow & blossom',
    source: "Pattern language from the founding era of the People's Republic of China, c. 1949.",
    description: 'A deliberately vivid red ground paired with swallows and blossoms, exploring the optimistic, graphic color language of early New China.',
  },
  {
    design: '/hobbies/fashion-navy-design.png', pattern: '/hobbies/fashion-navy-pattern.png', title: 'Navy Blossoms', subtitle: 'Deep blue · floral medallions',
    source: "Pattern language from the founding era of the People's Republic of China, c. 1949.",
    description: 'A deep navy ground with a dense floral repeat and circular motifs, using strong contrast to create a more dramatic qipao silhouette.',
  },
  {
    design: '/hobbies/fashion-snow-plum-design.png', pattern: '/hobbies/fashion-snow-plum-pattern.png', title: 'Snow Plum', subtitle: 'Pale blue · Ming-inspired',
    source: 'Ming-dynasty 雪梅纹 (snow-plum pattern).',
    description: 'A pale blue interpretation of the traditional snow-plum motif, translated into a quieter contemporary textile repeat.',
  },
]

function JournalLeaf({ children, footer, side }: { children: ReactNode; footer: ReactNode; side: 'left' | 'right' }) {
  return <div className={`journal-leaf journal-${side}`}>
    <div className="journal-leaf-content">{children}</div>
    <div className="journal-leaf-footer">{footer}</div>
  </div>
}

function JournalArt({ item, onOpen }: { item: Shot; onOpen: (item: Shot) => void }) {
  return <figure className="journal-art">
    <button type="button" onClick={() => onOpen(item)} aria-label={`View full size: ${item.title}`}>
      <img src={item.src} alt={item.alt} loading="lazy" />
      <span className="journal-view-label">View full size</span>
    </button>
    <figcaption><strong>{item.title}</strong><span>{item.note}</span></figcaption>
  </figure>
}

function FashionCard({ item, onOpen }: { item: FashionDesign; onOpen: (item: FashionDesign) => void }) {
  return <article className="journal-fashion-card">
    <button type="button" onClick={() => onOpen(item)} aria-label={`Open ${item.title} qipao design and pattern details`}>
      <img src={item.design} alt={`${item.title} qipao front and back design`} loading="lazy" />
      <span className="journal-view-label">View design</span>
    </button>
    <h3>{item.title}</h3><p>{item.subtitle}</p>
  </article>
}

function spreadFromHash() {
  const anchor = window.location.hash.slice(1)
  if (anchor === 'afterglow-tarot') return 3
  if (anchor === 'game-modding') return 2 // old link
  const index = chapters.findIndex(chapter => chapter.anchor === anchor)
  return index < 0 ? 0 : index
}

export default function HobbiesPage() {
  const bookRef = useRef<HTMLDivElement>(null)
  const tarotSpreadRef = useRef<HTMLUListElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const detailCloseRef = useRef<HTMLButtonElement>(null)
  const [activeSpread, setActiveSpread] = useState(0)
  const [shot, setShot] = useState<Shot | null>(null)
  const [fashion, setFashion] = useState<FashionDesign | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [runningPaused, setRunningPaused] = useState(false)

  const scrollBook = useCallback(() => {
    requestAnimationFrame(() => bookRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' }))
  }, [])

  useEffect(() => {
    const sync = () => {
      setActiveSpread(spreadFromHash())
      setShot(null)
      setFashion(null)
      if (window.location.hash) scrollBook()
    }
    sync()
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync) }
  }, [scrollBook])

  useEffect(() => {
    const onScroll = () => navRef.current?.classList.toggle('is-stuck', window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function turnTo(index: number) {
    if (index < 0 || index >= chapters.length) return
    setActiveSpread(index)
    setShot(null)
    setFashion(null)
    const anchor = chapters[index].anchor
    const url = `${window.location.pathname}${window.location.search}${anchor ? '#' + anchor : ''}`
    if (window.location.href !== new URL(url, window.location.href).href) window.history.pushState(null, '', url)
    scrollBook()
  }

  function open(item: Shot) {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setShot(item)
    setFashion(null)
    scrollBook()
  }

  function openFashion(item: FashionDesign) {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setFashion(item)
    setShot(null)
    scrollBook()
  }

  const close = useCallback(() => {
    setShot(null)
    setFashion(null)
    requestAnimationFrame(() => previousFocus.current?.focus())
  }, [])

  useEffect(() => {
    if (!shot && !fashion) return
    detailCloseRef.current?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shot, fashion, close])

  function scrollTarotDeck(direction: -1 | 1) {
    const spread = tarotSpreadRef.current
    if (spread) spread.scrollBy({ left: direction * spread.clientWidth * .7 })
  }

  function spread(index: number, left: ReactNode, right: ReactNode) {
    return <section className="journal-spread" id={chapters[index].anchor || undefined} aria-label={chapters[index].title} hidden={activeSpread !== index || !!shot || !!fashion}>
      <JournalLeaf side="left" footer={<>
        <span className="journal-page-number">{String(index * 2 + 1).padStart(2, '0')}</span>
        {index > 0 ? <div className="journal-page-actions"><button type="button" onClick={() => turnTo(index - 1)}>Previous</button><button type="button" onClick={() => turnTo(0)}>Contents</button></div> : <Link href="/">Back to portfolio</Link>}
      </>}>
        {left}
      </JournalLeaf>
      <JournalLeaf side="right" footer={<>
        {index < chapters.length - 1 ? <button type="button" onClick={() => turnTo(index + 1)}>Next page</button> : <Link href="/">Back to portfolio</Link>}
        <span className="journal-page-number">{String(index * 2 + 2).padStart(2, '0')}</span>
      </>}>
        {right}
      </JournalLeaf>
    </section>
  }

  return <main className="hobbies-page journal-page">
    <nav className="nav wrap" ref={navRef}>
      <Link href="/" className="logo">WENYI YE<span>.</span></Link>
      <div className="navlinks">
        <Link href="/#about">About</Link><Link href="/#education">Education</Link><Link href="/#experience">Experience</Link><Link href="/#projects">Projects</Link><Link href="/hobbies" className="active">Hobbies</Link>
      </div>
      <Link href="/#contact" className="nav-contact">Get in touch <span aria-hidden="true">↗</span></Link>
      <button type="button" className="mobile-menu-toggle" aria-label={mobileMenu ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileMenu} onClick={() => setMobileMenu(v => !v)}><span></span><span></span></button>
      {mobileMenu && <div className="mobile-menu">
        <Link href="/#about" onClick={() => setMobileMenu(false)}>About</Link><Link href="/#education" onClick={() => setMobileMenu(false)}>Education</Link><Link href="/#experience" onClick={() => setMobileMenu(false)}>Experience</Link><Link href="/#projects" onClick={() => setMobileMenu(false)}>Projects</Link><Link href="/hobbies" onClick={() => setMobileMenu(false)}>Hobbies</Link><Link href="/#contact" onClick={() => setMobileMenu(false)}>Get in touch ↗</Link>
      </div>}
    </nav>

    <div className="journal-book" ref={bookRef}>
      {spread(0, <div className="journal-intro">
        <p className="journal-kicker">Natural History Journal</p>
        <h1>Hobbies</h1>
        <p className="journal-kicker">Passions outside of work</p>
        <p>Beyond models and markets, I have plenty of other hobbies. Three I keep coming back to: art, vibe coding, and running.</p>
        <img className="journal-intro-plant" src="/rainforest/orchid.webp" alt="" />
        <small>Wenyi Ye · 2026</small>
      </div>, <div className="journal-contents">
        <h2>Contents</h2>
        <ol>{contents.map(entry => <li key={entry.title}>
          <button type="button" onClick={() => turnTo(entry.spread)}><span>{entry.title}</span><span>{String(entry.spread * 2 + 1).padStart(2, '0')}</span></button>
        </li>)}</ol>
      </div>)}

      {spread(1, <>
        <p className="journal-kicker">01 · Embroidery</p><h2>Stitching stories</h2>
        <p>Growing up, I loved fashion design and tailoring clothes. These days my favorite craft is French embroidery.</p>
        <JournalArt item={embroidery[0]} onOpen={open} />
      </>, <>
        <JournalArt item={embroidery[1]} onOpen={open} />
        <ul className="journal-keywords"><li>Patience</li><li>Focus</li><li>Craftsmanship</li><li>Beauty in detail</li></ul>
      </>)}

      {spread(2, <>
        <p className="journal-kicker">02 · Game design · Modding</p><h2>Reimagining worlds</h2>
        <p>I love playing games, and I also like making mods and drawing illustrations for them. Here are a few things I&apos;ve made.</p>
        <ul className="journal-keywords"><li>Drawn by hand</li><li>Coded in JavaScript</li></ul>
        <JournalArt item={gameStudies[0]} onOpen={open} />
      </>, <>
        <JournalArt item={gameStudies[1]} onOpen={open} />
        <div className="journal-game-text"><h3>苏丹的游戏 · Sultan&apos;s Game</h3><p>A card-driven narrative RPG by Double Cross. I create mods that introduce new characters, events, and storylines.</p>
          <a className="journal-link" href={steam} target="_blank" rel="noreferrer">View Sultan&apos;s Game on Steam</a></div>
      </>)}

      {spread(3, <>
        <p className="journal-kicker">02 · Game design · Afterglow</p><h2>Afterglow</h2>
        <img className="journal-cover" src="/hobbies/afterglow-cover.webp" alt="Afterglow cover art with pixel-art characters against a city skyline at dusk" width={960} height={640} loading="lazy" />
        <p>Afterglow is a life-sim game I made. I vibe coded the game itself. Apart from the original illustrations, which I drew by hand, about 80% of the art was generated with AI models.</p>
        <p>Building it taught me a lot of text-to-image shortcuts, and where each model tends to go wrong.</p>
        <a className="afterglow-cta" href={afterglowUrl} target="_blank" rel="noreferrer">Play Afterglow</a>
      </>, <section id="afterglow-tarot" className="journal-tarot" aria-labelledby="afterglow-tarot-title">
        <h2 id="afterglow-tarot-title">Character Tarot</h2>
        <p>I designed these 22 Major Arcana cards around characters from Afterglow.</p>
        <details className="tarot-deck">
          <summary className="tarot-deck-toggle">
            <span className="tarot-stack" aria-hidden="true"><img src={`${afterglowUrl}tarot/06.jpg`} alt="" width={480} height={720} loading="lazy" /></span>
            <span className="tarot-spread-label">Spread the deck</span><span className="tarot-stack-label">Gather the deck</span>
          </summary>
          <div className="tarot-browse"><p>Swipe across the spread. Select a card to see its artwork and character.</p><div className="tarot-controls"><button type="button" aria-controls="tarot-spread" onClick={() => scrollTarotDeck(-1)}>Previous</button><button type="button" aria-controls="tarot-spread" onClick={() => scrollTarotDeck(1)}>Next</button></div></div>
          <ul id="tarot-spread" className="tarot-spread" ref={tarotSpreadRef} aria-label="Afterglow tarot cards">
            {tarotCards.map(([number, title, character]) => {
              const src = `${afterglowUrl}tarot/${number}.jpg`
              return <li key={number}><button type="button" className="tarot-card" aria-label={`${title}, ${character}`} onClick={() => open({ src, alt: `${title} tarot card featuring ${character}`, title, note: character })}><img src={src} alt="" width={480} height={720} loading="lazy" decoding="async" draggable={false} /></button></li>
            })}
          </ul>
        </details>
      </section>)}

      {spread(4, <>
        <p className="journal-kicker">03 · Fashion design</p><h2>Designing in silk &amp; story</h2>
        <p>I want to revive traditional Chinese textile motifs by bringing historic pattern language into contemporary qipao silhouettes and a more daring palette.</p>
        <FashionCard item={fashionDesigns[0]} onOpen={openFashion} />
      </>, <div className="journal-fashion-grid">
        {fashionDesigns.slice(1).map(item => <FashionCard key={item.title} item={item} onOpen={openFashion} />)}
      </div>)}

      {spread(5, <>
        <p className="journal-kicker">04 · Running</p><h2>Running</h2>
        <p>I love long-distance running, and the version of me that lets my mind go blank out there.</p>
        <img className="journal-running-plant" src="/rainforest/fern.webp" alt="" />
      </>, <>
        <figure className="running-scene" data-paused={runningPaused}>
          <div className="running-track" role="img" aria-label="A pixel-art golden snub-nosed monkey running back and forth on all fours"><div className="running-monkey" aria-hidden="true"><span className="running-facing"><span className="running-sprite" /></span></div></div>
          <figcaption className="running-caption"><span>Golden snub-nosed monkey <em>Rhinopithecus roxellana</em></span><button type="button" className="running-control" onClick={() => setRunningPaused(paused => !paused)}>{runningPaused ? 'Play' : 'Pause'}</button></figcaption>
        </figure>
        <p className="journal-copyright">© 2026 Wenyi Ye</p>
      </>)}

      {(shot || fashion) && <section className="journal-spread journal-detail" aria-label={shot?.title ?? fashion?.title}>
        <JournalLeaf side="left" footer={<button type="button" ref={detailCloseRef} onClick={close}>Back to chapter</button>}>
          {shot ? <figure className="journal-detail-art"><img src={shot.src} alt={shot.alt} /><figcaption>{shot.title}</figcaption></figure> : fashion && <figure className="journal-detail-art"><img src={fashion.design} alt={`${fashion.title} qipao design`} /><figcaption>Qipao design</figcaption></figure>}
        </JournalLeaf>
        <JournalLeaf side="right" footer={<button type="button" onClick={close}>Close detail</button>}>
          {shot ? <><h2>{shot.title}</h2><p>{shot.note}</p></> : fashion && <>
            <p className="journal-kicker">Pattern study</p><h2>{fashion.title}</h2><p>{fashion.subtitle}</p>
            <figure className="journal-detail-pattern"><img src={fashion.pattern} alt={`${fashion.title} textile pattern detail`} /><figcaption>Pattern detail</figcaption></figure>
            <h3>Source</h3><p>{fashion.source}</p><p>{fashion.description}</p><p>Future clothing label · In preparation</p>
          </>}
          <p className="journal-detail-hint">Press Esc to return</p>
        </JournalLeaf>
      </section>}
    </div>
  </main>
}
