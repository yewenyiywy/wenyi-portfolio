'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode, CSSProperties, Ref } from 'react'
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
type TapeKind = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
type FashionDesign = { design: string; swatch: string; tape: TapeKind; swatchTape: TapeKind; title: string; subtitle: string; source: string; description: string }

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
    design: '/hobbies/fashion-red-design.png', swatch: '/hobbies/scrapbook/swatch-red.webp', tape: 4, swatchTape: 7, title: 'Vermilion Swallows', subtitle: 'Bold red · swallow & blossom',
    source: "Pattern language from the founding era of the People's Republic of China, c. 1949.",
    description: 'A deliberately vivid red ground paired with swallows and blossoms, exploring the optimistic, graphic color language of early New China.',
  },
  {
    design: '/hobbies/fashion-navy-design.png', swatch: '/hobbies/scrapbook/swatch-navy.webp', tape: 5, swatchTape: 1, title: 'Navy Blossoms', subtitle: 'Deep blue · floral medallions',
    source: "Pattern language from the founding era of the People's Republic of China, c. 1949.",
    description: 'A deep navy ground with a dense floral repeat and circular motifs, using strong contrast to create a more dramatic qipao silhouette.',
  },
  {
    design: '/hobbies/fashion-snow-plum-design.png', swatch: '/hobbies/scrapbook/swatch-snow-plum.webp', tape: 6, swatchTape: 2, title: 'Snow Plum', subtitle: 'Pale blue · Ming-inspired',
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

type PhotoStyle = 'portrait' | 'tilted' | 'mounted'

function Tape({ kind = 0 }: { kind?: TapeKind }) {
  return <span className={`scrap-tape scrap-tape-${kind}`} aria-hidden="true" />
}

function GameTapeLink({ href, label, kind }: { href: string; label: string; kind: TapeKind }) {
  return <a className="journal-game-entry" href={href} target="_blank" rel="noreferrer"><Tape kind={kind} /><span className="game-entry-label">{label}</span></a>
}

function PageTape({ label, kind, onClick, href, buttonRef }: { label:string; kind:TapeKind; onClick?:()=>void; href?:string; buttonRef?:Ref<HTMLButtonElement> }) {
  const style={'--page-tape-angle':`${[-5,4,-3,6,-5,3,-6,5][kind]}deg`} as CSSProperties
  const className=`journal-page-tape${label.length>10?' journal-page-tape-long':''}`
  const content=<><Tape kind={kind}/><span>{label}</span></>
  return href?<Link href={href} className={className} style={style}>{content}</Link>:<button type="button" className={className} style={style} onClick={onClick} ref={buttonRef}>{content}</button>
}

const pageTapeKinds: [TapeKind,TapeKind,TapeKind][] = [[0,2,5],[1,3,2],[0,1,3],[5,2,6],[1,0,7],[6,2,1]]

const tarotSlots = [
  [31, 20, -18, .72, 1], [13, 41, -35, .77, 2], [27, 70, -18, .88, 4],
  [50, 78, 0, 1, 6], [73, 70, 18, .88, 4], [87, 41, 35, .77, 2], [69, 20, 18, .72, 1],
]

function TarotRing({ onOpen }: { onOpen: (item: Shot) => void }) {
  const [center, setCenter] = useState(0)
  const gesture = useRef<{ x: number; y: number; dragged: boolean } | null>(null)
  const moved = useRef(false)
  const lastWheel = useRef(0)
  const rotate = (direction: number) => setCenter(i => (i + direction + tarotCards.length) % tarotCards.length)
  return <>
    <div className="journal-tarot-ring" role="group" aria-label="Circular tarot deck. Drag horizontally or use left and right arrow keys to rotate." tabIndex={0}
      onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {e.preventDefault();rotate(e.key === 'ArrowLeft' ? -1 : 1)} }}
      onPointerDown={e => { if (e.button !== 0) return; gesture.current = {x:e.clientX,y:e.clientY,dragged:false};moved.current=false }}
      onPointerMove={e => {const g=gesture.current;if(!g)return;const dx=e.clientX-g.x;const dy=e.clientY-g.y;if(Math.abs(dx)>24&&Math.abs(dx)>Math.abs(dy)){g.dragged=true;moved.current=true;g.x=e.clientX;g.y=e.clientY;rotate(dx<0?1:-1);if(!e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.setPointerCapture(e.pointerId)}}}
      onPointerUp={() => {gesture.current=null}} onPointerCancel={() => {gesture.current=null}}
      onClickCapture={e => {if(moved.current){e.preventDefault();e.stopPropagation();moved.current=false}}}
      onWheel={e => {const d=e.deltaX || (e.shiftKey?e.deltaY:0);if(Math.abs(d)>5 && Date.now()-lastWheel.current>110){rotate(d>0?1:-1);lastWheel.current=Date.now()}}}>
      {tarotSlots.map(([x,y,angle,scale,z],slot) => {const index=(center+slot-3+tarotCards.length)%tarotCards.length;const [number,title,character]=tarotCards[index];const src=`${afterglowUrl}tarot/${number}.jpg`;return <button key={slot} type="button" className="journal-ring-card" style={{'--ring-x':`${x}%`,'--ring-y':`${y}%`,'--ring-angle':`${angle}deg`,'--ring-scale':scale,'--ring-z':z} as CSSProperties} aria-label={`${title}, ${character}`} onClick={() => onOpen({src,alt:`${title} tarot card featuring ${character}`,title,note:character})}><img src={src} alt="" width={480} height={720} loading="lazy" decoding="async" draggable={false}/></button>})}
    </div>
    <p className="journal-ring-hint">Drag the ring · Select a card</p>
  </>
}

function Pressed({ kind, className = '' }: { kind: 0 | 1 | 2 | 3 | 4 | 5; className?: string }) {
  return <span className={`scrap-pressed scrap-pressed-${kind} ${className}`} aria-hidden="true" />
}

function PressedCollage({ kinds, arrangement = 'pair', tape }: { kinds: (0 | 1 | 2 | 3 | 4 | 5)[]; arrangement?: 'pair' | 'bouquet' | 'single'; tape?: TapeKind }) {
  return <div className={`scrap-collage scrap-collage-${arrangement}${tape !== undefined ? ' scrap-collage-taped' : ''}`} aria-hidden="true">
    {kinds.map((kind, index) => <Pressed key={`${kind}-${index}`} kind={kind} className={`scrap-stem-${index}`} />)}
    {tape !== undefined && <Tape kind={tape} />}
  </div>
}

function ScrapPhoto({ src, alt, style = 'portrait', tape = 0, contain = false }: { src: string; alt: string; style?: PhotoStyle; tape?: TapeKind; contain?: boolean }) {
  return <span className={`scrap-photo scrap-${style}${contain ? ' scrap-contain' : ''}`}>
    <span className="scrap-photo-window"><img src={src} alt={alt} loading="lazy" /></span>
    {style === 'mounted' ? <>{[0, 1, 2, 3].map(i => <span key={i} className={`scrap-corner scrap-corner-${i}`} aria-hidden="true" />)}</> : <img className="scrap-paper-frame" src={`/hobbies/scrapbook/${style}.webp`} alt="" aria-hidden="true" />}
    <Tape kind={tape} />
  </span>
}

function JournalArt({ item, onOpen, style = 'portrait', tape = 0, contain = false }: { item: Shot; onOpen: (item: Shot) => void; style?: PhotoStyle; tape?: TapeKind; contain?: boolean }) {
  return <figure className="journal-art">
    <button type="button" onClick={() => onOpen(item)} aria-label={`View full size: ${item.title}`}>
      <ScrapPhoto src={item.src} alt={item.alt} style={style} tape={tape} contain={contain} />
    </button>
    <figcaption>{item.title}</figcaption>
  </figure>
}

function FashionCard({ item, onOpen }: { item: FashionDesign; onOpen: (item: FashionDesign) => void }) {
  return <article className="journal-fashion-card">
    <button type="button" onClick={() => onOpen(item)} aria-label={`Open ${item.title} qipao design and pattern details`}>
      <ScrapPhoto src={item.design} alt={`${item.title} qipao front and back design`} style="portrait" tape={item.tape} contain />
    </button>
    <h3>{item.title}</h3>
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
  const navRef = useRef<HTMLElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const detailCloseRef = useRef<HTMLButtonElement>(null)
  const [activeSpread, setActiveSpread] = useState(0)
  const [shot, setShot] = useState<Shot | null>(null)
  const [fashion, setFashion] = useState<FashionDesign | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)

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

  function spread(index: number, left: ReactNode, right: ReactNode) {
    const [previousTape,contentsTape,nextTape]=pageTapeKinds[index]
    return <section className="journal-spread" id={chapters[index].anchor || undefined} aria-label={chapters[index].title} hidden={activeSpread !== index || !!shot || !!fashion}>
      <JournalLeaf side="left" footer={<>
        <span className="journal-page-number">{String(index * 2 + 1).padStart(2, '0')}</span>
        {index > 0 ? <div className="journal-page-actions"><PageTape label="Previous" kind={previousTape} onClick={() => turnTo(index - 1)}/><PageTape label="Contents" kind={contentsTape} onClick={() => turnTo(0)}/></div> : <PageTape label="Back to portfolio" kind={previousTape} href="/"/>}
      </>}>
        {left}
      </JournalLeaf>
      <JournalLeaf side="right" footer={<>
        {index < chapters.length - 1 ? <PageTape label="Next page" kind={nextTape} onClick={() => turnTo(index + 1)}/> : <PageTape label="Back to portfolio" kind={nextTape} href="/"/>}
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
        <Link href="/classic#about">About</Link><Link href="/classic#education">Education</Link><Link href="/classic#experience">Experience</Link><Link href="/classic#projects">Projects</Link><Link href="/hobbies" className="active">Hobbies</Link>
      </div>
      <Link href="/classic#contact" className="nav-contact">Get in touch <span aria-hidden="true">↗</span></Link>
      <button type="button" className="mobile-menu-toggle" aria-label={mobileMenu ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileMenu} onClick={() => setMobileMenu(v => !v)}><span></span><span></span></button>
      {mobileMenu && <div className="mobile-menu">
        <Link href="/classic#about" onClick={() => setMobileMenu(false)}>About</Link><Link href="/classic#education" onClick={() => setMobileMenu(false)}>Education</Link><Link href="/classic#experience" onClick={() => setMobileMenu(false)}>Experience</Link><Link href="/classic#projects" onClick={() => setMobileMenu(false)}>Projects</Link><Link href="/hobbies" onClick={() => setMobileMenu(false)}>Hobbies</Link><Link href="/classic#contact" onClick={() => setMobileMenu(false)}>Get in touch ↗</Link>
      </div>}
    </nav>

    <div className="journal-book" ref={bookRef}>
      {spread(0, <div className="journal-intro">
        <h1>Hobbies</h1>
        <p>Beyond models and markets, I have plenty of other hobbies. Three I keep coming back to: art, vibe coding, and running.</p>
        <PressedCollage kinds={[1, 3, 4]} arrangement="bouquet" tape={4} />
        <small>Wenyi Ye · 2026</small>
      </div>, <div className="journal-contents">
        <h2>Contents</h2>
        <ol>{contents.map(entry => <li key={entry.title}>
          <button type="button" onClick={() => turnTo(entry.spread)}><span>{entry.title}</span><span>{String(entry.spread * 2 + 1).padStart(2, '0')}</span></button>
        </li>)}</ol>
        <PressedCollage kinds={[0, 2, 5]} arrangement="bouquet" tape={1} />
      </div>)}

      {spread(1, <>
        <h2>Stitching stories</h2>
        <p>Growing up, I loved fashion design and tailoring clothes. These days my favorite craft is French embroidery.</p>
        <JournalArt item={embroidery[0]} onOpen={open} style="portrait" tape={0} />
        <PressedCollage kinds={[4]} arrangement="single" />
      </>, <>
        <JournalArt item={embroidery[1]} onOpen={open} style="tilted" tape={6} />
        <PressedCollage kinds={[1, 3]} />
      </>)}

      {spread(2, <>
        <h2>Reimagining worlds</h2>
        <p>I love playing games, and I also like making mods and drawing illustrations for them. Here are a few things I&apos;ve made.</p>
        <JournalArt item={gameStudies[0]} onOpen={open} style="portrait" tape={3} contain />
        <PressedCollage kinds={[0, 2]} />
      </>, <>
        <JournalArt item={gameStudies[1]} onOpen={open} style="mounted" tape={5} contain />
        <div className="journal-game-text"><h3>苏丹的游戏 · Sultan&apos;s Game</h3><p>A card-driven narrative RPG by Double Cross. I create mods that introduce new characters, events, and storylines.</p>
          <GameTapeLink href={steam} label="Sultan’s Game on Steam" kind={2} /></div>
        <PressedCollage kinds={[5]} arrangement="single" />
      </>)}

      {spread(3, <>
        <h2>Afterglow</h2>
        <div className="journal-cover"><ScrapPhoto src="/hobbies/afterglow-cover.webp" alt="Afterglow cover art with pixel-art characters against a city skyline at dusk" style="mounted" tape={7} /></div>
        <p>Afterglow is a life-sim game I made. I vibe coded the game itself. Apart from the original illustrations, which I drew by hand, about 80% of the art was generated with AI models.</p>
        <p>Building it taught me a lot of text-to-image shortcuts, and where each model tends to go wrong.</p>
        <GameTapeLink href={afterglowUrl} label="Play Afterglow" kind={1} />
        <PressedCollage kinds={[1, 4]} />
      </>, <><section id="afterglow-tarot" className="journal-tarot" aria-labelledby="afterglow-tarot-title">
        <h2 id="afterglow-tarot-title">Character Tarot</h2>
        <p>I designed these 22 Major Arcana cards around characters from Afterglow.</p>
        <TarotRing onOpen={open} />
      </section><PressedCollage kinds={[0, 2, 3]} arrangement="bouquet" tape={2} /></>)}

      {spread(4, <>
        <h2>Designing in silk &amp; story</h2>
        <p>I want to revive traditional Chinese textile motifs by bringing historic pattern language into contemporary qipao silhouettes and a more daring palette.</p>
        <FashionCard item={fashionDesigns[0]} onOpen={openFashion} />
        <PressedCollage kinds={[5]} arrangement="single" />
      </>, <><div className="journal-fashion-grid">
        {fashionDesigns.slice(1).map(item => <FashionCard key={item.title} item={item} onOpen={openFashion} />)}
      </div><PressedCollage kinds={[1, 3, 4]} arrangement="bouquet" tape={3} /></>)}

      {spread(5, <>
        <h2>Running</h2>
        <p>I love long-distance running, and the version of me that lets my mind go blank out there.</p>
        <PressedCollage kinds={[0, 2, 5]} arrangement="bouquet" tape={0} />
      </>, <>
        <PressedCollage kinds={[1,3,4]} arrangement="bouquet" tape={7} />
        <p className="journal-copyright">© 2026 Wenyi Ye</p>
      </>)}

      {(shot || fashion) && <section className="journal-spread journal-detail" aria-label={shot?.title ?? fashion?.title}>
        <JournalLeaf side="left" footer={<PageTape label="Back to chapter" kind={5} buttonRef={detailCloseRef} onClick={close}/>}>
          {shot ? <figure className="journal-detail-art"><img src={shot.src} alt={shot.alt} /><figcaption>{shot.title}</figcaption></figure> : fashion && <figure className="journal-detail-art"><img src={fashion.design} alt={`${fashion.title} qipao design`} /><figcaption>Qipao design</figcaption></figure>}
        </JournalLeaf>
        <JournalLeaf side="right" footer={<PageTape label="Close detail" kind={3} onClick={close}/>}>
          {shot ? <><h2>{shot.title}</h2>{shot.src.startsWith(afterglowUrl) && <p>{shot.note}</p>}</> : fashion && <>
            <h2>{fashion.title}</h2>
            <figure className="journal-detail-pattern"><div className="journal-swatch"><img src={fashion.swatch} alt={`${fashion.title} fabric swatch with frayed edges`} /><Tape kind={fashion.swatchTape} /></div><figcaption>Fabric swatch</figcaption></figure>
            <h3>Source</h3><p>{fashion.source}</p><p>{fashion.description}</p><p>Future clothing label · In preparation</p>
          </>}
          <p className="journal-detail-hint">Press Esc to return</p>
          <PressedCollage kinds={[5, 3]} tape={0} />
        </JournalLeaf>
      </section>}
    </div>
  </main>
}
