'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

const steam = "https://store.steampowered.com/app/3117820/Sultans_Game/"
const afterglowUrl = 'https://afterglow-gray-five.vercel.app/'

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
type FashionDesign = {
  design: string
  pattern: string
  title: string
  subtitle: string
  source: string
  description: string
}

/* Botanical line drawing used as a faint watermark behind the sections. */
function Sprig({ short = false }: { short?: boolean }) {
  return (
    <svg viewBox="0 0 260 400" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <path d="M132 400C132 330 122 282 100 240 78 198 66 158 70 112" />
      <path d="M116 300C144 280 178 272 206 270" />
      <path d="M104 244C80 234 62 214 54 186" />
      {!short && <path d="M92 196C116 176 146 166 172 162" />}
      {!short && <path d="M126 350C108 336 88 330 68 332" />}
      <g transform="translate(54 186) rotate(196)"><path d="M0 0c10-10 24-10 34 0-10 10-24 10-34 0z" /><path d="M2 0h30" /></g>
      <g transform="translate(150 288) rotate(-28)"><path d="M0 0c9-9 22-9 31 0-9 9-22 9-31 0z" /><path d="M2 0h27" /></g>
      {!short && <g transform="translate(68 332) rotate(190)"><path d="M0 0c9-9 22-9 31 0-9 9-22 9-31 0z" /><path d="M2 0h27" /></g>}
      {!short && <g transform="translate(112 184) rotate(-52)"><path d="M0 0c8-8 20-8 28 0-8 8-20 8-28 0z" /><path d="M2 0h24" /></g>}
      <g transform="translate(70 112)">
        <circle r="27" />
        <path d="M0 27A27 27 0 1 1 21-17 20 20 0 1 0-14 13 13 13 0 1 1-2-12 8 8 0 1 0 4 5" />
      </g>
      <g transform="translate(206 270) rotate(12)">
        <circle r="16" />
        <path d="M0 16A16 16 0 1 1 12-10 11 11 0 1 0-8 8 7 7 0 1 1-1-7 5 5 0 1 0 3 3" />
      </g>
      {!short && (
        <g transform="translate(172 162) rotate(-8)">
          <circle r="12" />
          <path d="M0 12A12 12 0 1 1 9-8 9 9 0 1 0-6 6 6 6 0 1 1-1-6" />
        </g>
      )}
    </svg>
  )
}

export default function HobbiesPage() {
  const pageRef = useRef<HTMLElement>(null)
  const tarotSpreadRef = useRef<HTMLUListElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const heroImgRef = useRef<HTMLImageElement>(null)
  const [shot, setShot] = useState<Shot | null>(null)
  const [fashion, setFashion] = useState<FashionDesign | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [runningPaused, setRunningPaused] = useState(false)

  const fashionDesigns: FashionDesign[] = [
    {
      design: '/hobbies/fashion-red-design.png',
      pattern: '/hobbies/fashion-red-pattern.png',
      title: 'Vermilion Swallows',
      subtitle: 'Bold red · swallow & blossom',
      source: 'Pattern language from the founding era of the People\'s Republic of China, c. 1949.',
      description: 'A deliberately vivid red ground paired with swallows and blossoms, exploring the optimistic, graphic color language of early New China.',
    },
    {
      design: '/hobbies/fashion-navy-design.png',
      pattern: '/hobbies/fashion-navy-pattern.png',
      title: 'Navy Blossoms',
      subtitle: 'Deep blue · floral medallions',
      source: 'Pattern language from the founding era of the People\'s Republic of China, c. 1949.',
      description: 'A deep navy ground with a dense floral repeat and circular motifs, using strong contrast to create a more dramatic qipao silhouette.',
    },
    {
      design: '/hobbies/fashion-snow-plum-design.png',
      pattern: '/hobbies/fashion-snow-plum-pattern.png',
      title: 'Snow Plum',
      subtitle: 'Pale blue · Ming-inspired',
      source: 'Ming-dynasty 雪梅纹 (snow-plum pattern).',
      description: 'A pale blue interpretation of the traditional snow-plum motif, translated into a quieter contemporary textile repeat.',
    },
  ]

  const open = useCallback((s: Shot) => setShot(s), [])
  const close = useCallback(() => setShot(null), [])

  function scrollTarotDeck(direction: -1 | 1) {
    const spread = tarotSpreadRef.current
    if (spread) spread.scrollBy({ left: direction * spread.clientWidth * 0.7 })
  }

  /* Reveal on scroll. The hiding class is only added by script, so the page
     still reads normally if JS never runs. */
  useEffect(() => {
    const page = pageRef.current
    if (!page) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const items = Array.from(page.querySelectorAll<HTMLElement>('.reveal'))
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-in'))
      return
    }
    page.classList.add('reveal-on')

    const hero = items.filter(el => el.closest('.hobbies-hero'))
    const rest = items.filter(el => !el.closest('.hobbies-hero'))
    const raf = requestAnimationFrame(() => hero.forEach(el => el.classList.add('is-in')))

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      })
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 })
    rest.forEach(el => io.observe(el))

    return () => { cancelAnimationFrame(raf); io.disconnect() }
  }, [])

  /* Condensed nav, and the hero photograph drifting against the scroll. */
  useEffect(() => {
    const img = heroImgRef.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (img && !reduce) img.style.transform = 'scale(1.06)'
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        navRef.current?.classList.toggle('is-stuck', y > 12)
        if (img && !reduce) {
          img.style.transform = `translate3d(0,${Math.min(y, 620) * 0.08}px,0) scale(1.06)`
        }
        ticking = false
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Viewer: lock the page behind it and close on Escape. */
  useEffect(() => {
    if (!shot && !fashion) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        setFashion(null)
      }
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [shot, close])

  return (
    <main className="hobbies-page" ref={pageRef}>
      <nav className="nav wrap" ref={navRef}>
        <Link href="/" className="logo">WENYI YE<span>.</span></Link>
        <div className="navlinks">
          <Link href="/#about">About</Link>
          <Link href="/#education">Education</Link>
          <Link href="/#experience">Experience</Link>
          <Link href="/#research">Research</Link>
          <Link href="/hobbies" className="active">Hobbies</Link>
        </div>
        <Link href="/#contact" className="nav-contact">Get in touch <span aria-hidden="true">↗</span></Link>
        <button
          type="button"
          className="mobile-menu-toggle"
          aria-label={mobileMenu ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileMenu}
          onClick={() => setMobileMenu(v => !v)}
        >
          <span></span><span></span>
        </button>
        {mobileMenu && (
          <div className="mobile-menu">
            <Link href="/#about" onClick={() => setMobileMenu(false)}>About</Link>
            <Link href="/#education" onClick={() => setMobileMenu(false)}>Education</Link>
            <Link href="/#experience" onClick={() => setMobileMenu(false)}>Experience</Link>
            <Link href="/#research" onClick={() => setMobileMenu(false)}>Research</Link>
            <Link href="/hobbies" onClick={() => setMobileMenu(false)}>Hobbies</Link>
            <Link href="/#contact" onClick={() => setMobileMenu(false)}>Get in touch ↗</Link>
          </div>
        )}
      </nav>

      <header className="hobbies-hero wrap">
        <div className="hobbies-hero-copy reveal reveal-1">
          <div className="hero-sparkle" aria-hidden="true">✦<span>✦</span></div>
          <h1>Hobbies</h1>
          <div className="hobbies-kicker">Passions outside of work</div>
          <p>Beyond research and markets, I find joy in creating with my hands, staying active, and exploring virtual worlds.</p>
          <div className="hero-ornament" aria-hidden="true"><span>✦</span><i></i></div>
        </div>
        <figure className="hero-photo reveal reveal-2">
          <img ref={heroImgRef} src="/hobbies/embroidery-blue.jpg" alt="Pearl and sequin embroidery in progress" />
        </figure>
      </header>

      <section className="atelier-section embroidery-section">
        <div className="botanic botanic-right" aria-hidden="true"><Sprig /></div>

        <div className="wrap">
          <div className="atelier-row">
            <div className="atelier-copy reveal">
              <div className="atelier-index">01</div>
              <div className="hobby-eyebrow">Embroidery</div>
              <h2>Stitching stories</h2>
              <p>Embroidery is my way of slowing down and paying attention to the details. Each stitch is a dialogue between patience and creativity.</p>
            </div>

            <figure className="plate plate-offset embroidery-plate reveal reveal-1">
              <button
                type="button"
                className="plate-frame"
                onClick={() => open({
                  src: '/hobbies/embroidery-pearl.jpg',
                  alt: 'Blue bird embroidery made with feathers, beads and sequins',
                  title: 'Blue bird',
                  note: 'Sequins · feather · beadwork',
                })}
              >
                <img src="/hobbies/embroidery-pearl.jpg" alt="Blue bird embroidery made with feathers, beads and sequins" />
                <span className="view-cue">View full size</span>
              </button>
              <figcaption><span>Blue bird</span><em>Sequins · feather · beadwork</em></figcaption>
            </figure>

            <ul className="keyword-list reveal reveal-2">
              <li>Patience</li>
              <li>Focus</li>
              <li>Craftsmanship</li>
              <li>Beauty in detail</li>
            </ul>
          </div>

          <div className="detail-strip reveal">
            <figure className="plate detail-zoom-plate">
              <button
                type="button"
                className="plate-frame"
                onClick={() => open({
                  src: '/hobbies/embroidery-bird-highres.png',
                  alt: 'French-style beaded bird embroidery with a real feather wing',
                  title: 'Beaded bird',
                  note: 'Sequins · beads · feather detail',
                })}
              >
                <img src="/hobbies/embroidery-bird-highres.png" alt="French-style beaded bird embroidery with a real feather wing" />
                <span className="view-cue">View full size</span>
              </button>
              <figcaption><span>Beaded bird</span><em>Sequins · beads · feather detail</em></figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="atelier-section game-section">
        <div className="botanic botanic-left" aria-hidden="true"><Sprig short /></div>

        <div className="wrap">
          <div className="game-row">
            <div className="atelier-copy reveal">
              <div className="atelier-index">02</div>
              <div className="hobby-eyebrow">Game modding</div>
              <h2>Reimagining worlds</h2>
              <p>I enjoy extending games, creating new stories, mechanics, and visual experiences.</p>
              <ul className="game-notes">
                <li><b aria-hidden="true">✦</b>Drawn by hand</li>
                <li><b aria-hidden="true">✦</b>Coded in JavaScript</li>
              </ul>
            </div>

            <div>
              <div className="game-editorial">
                <figure className="game-card game-card-one reveal reveal-1">
                  <button
                    type="button"
                    className="game-art game-art-ivory"
                    onClick={() => open({
                      src: '/hobbies/game-1.png',
                      alt: "Hand-drawn character mod for Sultan's Game",
                      title: 'Character study I',
                      note: 'Ink · gouache',
                    })}
                  >
                    <img src="/hobbies/game-1.png" alt="Hand-drawn character mod for Sultan's Game" />
                    <span className="view-cue">View full size</span>
                  </button>
                  <figcaption><span>Character study I</span><em>Ink · gouache</em></figcaption>
                </figure>
                <figure className="game-card game-card-two reveal reveal-2">
                  <button
                    type="button"
                    className="game-art game-art-blue"
                    onClick={() => open({
                      src: '/hobbies/game-2.png',
                      alt: "Hand-drawn character mod for Sultan's Game",
                      title: 'Character study II',
                      note: 'Ink · gouache',
                    })}
                  >
                    <img src="/hobbies/game-2.png" alt="Hand-drawn character mod for Sultan's Game" />
                    <span className="view-cue">View full size</span>
                  </button>
                  <figcaption><span>Character study II</span><em>Ink · gouache</em></figcaption>
                </figure>
              </div>

              <div className="game-footer-line reveal">
                <div className="game-plate"><b>苏丹的游戏</b><span>Sultan&apos;s Game</span></div>
                <div>
                  <p className="game-statement">A card-driven narrative RPG by Double Cross. I create mods that introduce new characters, events, and storylines.</p>
                  <a className="steam-cta" href={steam} target="_blank" rel="noreferrer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
                      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19" />
                    </svg>
                    View Sultan&apos;s Game on Steam
                  </a>
                </div>
              </div>
            </div>
          </div>

          <section id="game-design" className="afterglow-module" aria-labelledby="afterglow-title">
            <img
              className="afterglow-cover reveal"
              src="/hobbies/afterglow-cover.webp"
              alt="Afterglow cover art with pixel-art characters against a city skyline at dusk"
              width={960}
              height={640}
              loading="lazy"
            />
            <div className="afterglow-copy reveal">
              <div className="hobby-eyebrow">Game Design</div>
              <h2 id="afterglow-title">Afterglow</h2>
              <p>I designed and built Afterglow, a browser-based romance and life sim. Create a character, choose a career, and build a life across 19 cities.</p>
              <p>Friends can introduce you to someone new, and characters remember shared moments. Where you go and who you spend time with shape the relationships and stories that unfold.</p>
              <p>I built most of Afterglow through vibe coding. It was also my first time using text-to-image generation at scale.</p>
              <a className="afterglow-cta" href={afterglowUrl} target="_blank" rel="noreferrer">Play Afterglow</a>
            </div>
            <section id="afterglow-tarot" className="afterglow-tarot" aria-labelledby="afterglow-tarot-title">
              <h3 id="afterglow-tarot-title">Character Tarot</h3>
              <p>I designed these 22 Major Arcana cards around characters from Afterglow.</p>
              <details className="tarot-deck">
                <summary className="tarot-deck-toggle">
                  <span className="tarot-stack" aria-hidden="true">
                    <img src={`${afterglowUrl}tarot/06.jpg`} alt="" width={480} height={720} loading="lazy" />
                  </span>
                  <span className="tarot-spread-label">Spread the deck</span>
                  <span className="tarot-stack-label">Gather the deck</span>
                </summary>
                <div className="tarot-browse">
                  <p>Swipe across the spread. Select a card to see its artwork and character.</p>
                  <div className="tarot-controls">
                    <button type="button" aria-controls="tarot-spread" onClick={() => scrollTarotDeck(-1)}>Previous</button>
                    <button type="button" aria-controls="tarot-spread" onClick={() => scrollTarotDeck(1)}>Next</button>
                  </div>
                </div>
                <ul id="tarot-spread" className="tarot-spread" ref={tarotSpreadRef} aria-label="Afterglow tarot cards">
                  {tarotCards.map(([number, title, character]) => {
                    const src = `${afterglowUrl}tarot/${number}.jpg`
                    return (
                      <li key={number}>
                        <button
                          className="tarot-card"
                          type="button"
                          aria-label={`${title}, ${character}`}
                          onClick={() => open({ src, alt: `${title} tarot card featuring ${character}`, title, note: character })}
                        >
                          <img src={src} alt="" width={480} height={720} loading="lazy" decoding="async" draggable={false} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </details>
            </section>
          </section>
        </div>
      </section>

      <section className="atelier-section fashion-section">
        <div className="fashion-watermark" aria-hidden="true">衣</div>
        <div className="wrap">
          <div className="fashion-heading reveal">
            <div className="atelier-index">03</div>
            <div>
              <div className="hobby-eyebrow">Fashion design</div>
              <h2>Designing in silk &amp; story</h2>
              <p>
                I want to revive traditional Chinese textile motifs by bringing historic pattern
                language into contemporary qipao silhouettes and a more daring palette.
                <span className="fashion-inline-status">Currently in preparation — I am developing the visual language, textile patterns, and silhouettes for a future clothing label.</span>
              </p>
            </div>
          </div>

          <div className="fashion-grid">
            {fashionDesigns.map((item, index) => (
              <article className="fashion-card reveal" key={item.title} style={{ transitionDelay: `${index * 100}ms` }}>
                <button
                  type="button"
                  className="fashion-design-frame"
                  onClick={() => setFashion(item)}
                  aria-label={`Open ${item.title} qipao design and pattern details`}
                >
                  <img src={item.design} alt={`${item.title} qipao front and back design`} />
                  <span className="fashion-open">
                    <span>View design</span>
                    <b>＋</b>
                  </span>
                </button>
                <div className="fashion-card-meta">
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.subtitle}</p>
                  </div>
                  <span>0{index + 1}</span>
                </div>
              </article>
            ))}
          </div>

        </div>
      </section>

      <section id="running" className="atelier-section running-section" aria-labelledby="running-title">
        <div className="wrap running-row">
          <div className="atelier-copy reveal">
            <div className="atelier-index">04</div>
            <h2 id="running-title">Running</h2>
            <p>Running long distances, clearing my mind.</p>
          </div>
          <figure className="running-scene reveal" data-paused={runningPaused}>
            <div className="running-track" role="img" aria-label="A pixel-art golden snub-nosed monkey running back and forth on all fours">
              <div className="running-monkey" aria-hidden="true"><span className="running-facing"><span className="running-sprite" /></span></div>
            </div>
            <figcaption className="running-caption">
              <span>Golden snub-nosed monkey <em>Rhinopithecus roxellana</em></span>
              <button type="button" className="running-control" onClick={() => setRunningPaused(paused => !paused)}>{runningPaused ? 'Play' : 'Pause'}</button>
            </figcaption>
          </figure>
        </div>
      </section>

      <footer className="hobbies-footer wrap">
        <Link href="/">← Back to portfolio</Link>
        <span>© 2026 Wenyi Ye</span>
      </footer>

      {fashion && (
        <div
          className="fashion-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${fashion.title} fashion design details`}
          onClick={() => setFashion(null)}
        >
          <button
            type="button"
            className="fashion-lightbox-close"
            aria-label="Close fashion design"
            autoFocus
            onClick={() => setFashion(null)}
          >✕</button>
          <div className="fashion-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <div className="fashion-lightbox-visuals">
              <figure>
                <img src={fashion.design} alt={`${fashion.title} qipao design`} />
                <figcaption>Qipao design</figcaption>
              </figure>
              <figure>
                <img src={fashion.pattern} alt={`${fashion.title} textile pattern detail`} />
                <figcaption>Pattern detail</figcaption>
              </figure>
            </div>
            <div className="fashion-lightbox-copy">
              <div className="hobby-eyebrow">Pattern study</div>
              <h2>{fashion.title}</h2>
              <p className="fashion-lightbox-subtitle">{fashion.subtitle}</p>
              <div className="fashion-source">
                <span>Source</span>
                <p>{fashion.source}</p>
              </div>
              <p className="fashion-lightbox-description">{fashion.description}</p>
              <div className="fashion-lightbox-foot">
                <span>Future clothing label</span>
                <span>In preparation</span>
              </div>
            </div>
          </div>
          <div className="fashion-lightbox-hint">Click outside or press Esc to close</div>
        </div>
      )}

      {shot && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={shot.title} onClick={close}>
          <button className="lightbox-close" type="button" aria-label="Close" autoFocus>✕</button>
          <img src={shot.src} alt={shot.alt} />
          <figcaption><span>{shot.title}</span><em>{shot.note}</em></figcaption>
          <div className="lightbox-hint">Click anywhere or press Esc to close</div>
        </div>
      )}
    </main>
  )
}
