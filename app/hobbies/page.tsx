'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

const steam = "https://store.steampowered.com/app/3117820/Sultans_Game/"

type Shot = { src: string; alt: string; title: string; note: string }

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
  const navRef = useRef<HTMLElement>(null)
  const heroImgRef = useRef<HTMLImageElement>(null)
  const [shot, setShot] = useState<Shot | null>(null)

  const open = useCallback((s: Shot) => setShot(s), [])
  const close = useCallback(() => setShot(null), [])

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
    if (!shot) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
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
        </div>
      </section>

      <section className="other-passions wrap">
        <div className="section-label">Other passions</div>
        <div className="passion-list reveal">
          <div>
            <div className="passion-icon" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round">
                <path d="M20 4v3" />
                <path d="M13.5 12c0-2.6 2.9-4.4 6.5-4.4s6.5 1.8 6.5 4.4c0 3-1.9 5-1.9 7.8s2.4 3.9 2.4 6.9c0 3.1-3.2 4.8-7 4.8s-7-1.7-7-4.8c0-3 2.4-4.1 2.4-6.9s-1.9-4.8-1.9-7.8z" />
                <path d="M20 31.5V36" /><path d="M15.5 37h9" />
              </svg>
            </div>
            <div><h3>Fashion design</h3><p>Exploring form, fabric, and silhouette.</p></div>
          </div>
          <div>
            <div className="passion-icon" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round">
                <path d="M8 32l1.8-6.4L26.5 8.9a2.6 2.6 0 0 1 3.7 0l1.4 1.4a2.6 2.6 0 0 1 0 3.7L14.9 30.6z" />
                <path d="M24.4 11l4.9 4.9" /><path d="M9.8 25.6l4.9 4.9" /><path d="M9 36h22" />
              </svg>
            </div>
            <div><h3>Drawing</h3><p>Capturing ideas and moments.</p></div>
          </div>
          <div>
            <div className="passion-icon" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round">
                <path d="M5 24.5c0-2.6 1.4-4.3 3.9-5.2l4.4-1.6 3.4 3.1 4.9 1.4 7.3 2.3c2.7.9 4.1 2.1 4.1 4.1V31H5z" />
                <path d="M13.3 17.7l-1.6 3.6" /><path d="M17.7 20.8l-1.7 3.4" /><path d="M22.6 22.2l-1.6 3.2" /><path d="M5 34h30" />
              </svg>
            </div>
            <div><h3>Marathon</h3><p>Running long distances, clearing my mind.</p></div>
          </div>
        </div>
      </section>

      <footer className="hobbies-footer wrap">
        <Link href="/">← Back to portfolio</Link>
        <span>© 2026 Wenyi Ye</span>
      </footer>

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
