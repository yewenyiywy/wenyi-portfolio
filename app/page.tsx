'use client'

import { ArrowUpRight, Github, Linkedin, Mail, Instagram } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type Shot = { src: string; alt: string; title: string; note: string }

const gallery: (Shot & { cls: string })[] = [
  { cls:'shot-main', src:'/wenyi.jpg',    alt:'Wenyi Ye in the garden', title:'Archive 01', note:'In the garden' },
  { cls:'shot-a',    src:'/photo-03.jpg', alt:'Wenyi Ye in a pink dress', title:'Archive 02', note:'In the garden' },
  { cls:'shot-b',    src:'/photo-02.jpg', alt:'Wenyi Ye', title:'Archive 03', note:'Beijing' },
  { cls:'shot-c',    src:'/photo-04.jpg', alt:'Wenyi Ye', title:'Archive 04', note:'Berkeley' },
]

const navItems = [
  { id:'about', label:'About' },
  { id:'education', label:'Education' },
  { id:'experience', label:'Experience' },
  { id:'research', label:'Research' },
]

const logos = {
  berkeley: '/logos/ucb-seal.png', umich: '/logos/umich.png', bdfz: '/logos/bdfz.png',
  tiktok: '/logos/tiktok.png', csc: '/logos/china-securities.png', boc: '/logos/boc.png',
  imc: '/logos/imc.png', ramify: '/logos/ramify.png', shepherd: '/logos/shepherd.png',
}

const experience = [
  { company:'TikTok', logo:logos.tiktok, location:'San Jose, CA', role:'AI Product Manager Intern', date:'03/2026 – 08/2026', tags:['AI Evaluation','LangGraph','Python','SQL'], bullets:[<>Built an agentic evaluation framework for AI safety policies; red-team findings improved detection accuracy from <strong>69% → 91%</strong>.</>,<>Led A/B testing, marginal-traffic attribution, and A/A validation infrastructure for AI policy iteration.</>] },
  { company:'Shepherd Ventures', logo:logos.shepherd, location:'San Diego, CA', role:'Quant Researcher', date:'10/2023 – 01/2025', tags:['Machine Learning','K-Means','Optimization','Python'], bullets:[<>Applied K-Means clustering and multivariate optimization to S&amp;P 500 data, reducing maximum drawdown by <strong>35.8%</strong>.</>,<>Automated monthly portfolio rebalancing; <strong>70%+</strong> of orders completed within a predefined trading horizon.</>] },
  { company:'China Securities', logo:logos.csc, location:'Beijing, China', role:'Summer Quant Research Intern', date:'07/2024 – 09/2024', tags:['Alpha Research','ML','Regression','SQL'], bullets:[<>Built alternative-data coverage for <strong>50+ biotech companies</strong> with <strong>100K+</strong> records; derived <strong>35 alpha factors</strong>, with the top factor returning 15.2% annualized.</>,<>Developed style-index rotation strategies using regularized regression, generating a <strong>25.4%</strong> annual return.</>] },
  { company:'Bank of China', logo:logos.boc, location:'Beijing, China', role:'Summer Liquidity Risk Intern', date:'07/2023 – 09/2023', tags:['Python','SQL','ETL','Risk Modeling'], bullets:[<>Built ETL pipelines and liquidity-monitoring tools across <strong>$7T+</strong> in daily settlement volumes.</>,<>Performed liquidity stress testing and KRI analysis across entities, currencies, and agent banks.</>] },
]

const research = [
  { title:'Ramify — UCB MFE Industry Project', logo:logos.ramify, location:'Berkeley, CA', role:'Apprenticeship', date:'08/2026 – 10/2026', tags:['Stochastic Control','Optimization','Backtesting'], bullets:[<>Developing a stochastic-control framework for capital allocation across evergreen and closed-end private funds.</>,<>Backtesting optimal allocation policies against heuristic strategies using historical fund-level data.</>] },
  { title:'IMC Prosperity 3', logo:logos.imc, location:'Ann Arbor, MI', role:'Participant', date:'04/2025 – 05/2025', tags:['Algorithmic Trading','Market Making','Multi-Asset'], bullets:[<>Built multi-asset trading agents across pair trading, ETF arbitrage, delta/gamma hedging, and market making.</>,<>Ranked <strong>Top 1% among 12,620 global teams</strong> (7th in China) across algorithmic and manual rounds.</>] }
]

function Brand({src,alt,className=''}:{src:string,alt:string,className?:string}){return <span className={`brand ${className}`}><img src={src} alt={alt}/></span>}
function InlineInstitution({children,logo,alt,href}:{children:ReactNode,logo:string,alt:string,href:string}){return <a className="inline-institution" href={href} target="_blank" rel="noreferrer"><Brand src={logo} alt={alt} className="inline-brand"/><strong>{children}</strong></a>}
function Tags({items}:{items:string[]}){return <span className="tags">{items.map(t=><span key={t}>{t}</span>)}</span>}

function Entry({item}:{item:any}){return <article className="timeline-entry reveal">
  <div className="date">{item.date}</div>
  <div className="entry-content">
    <div className="entry-top"><Brand src={item.logo} alt={item.company || item.title}/><div className="entry-title"><div className="title-line"><h3>{item.company || item.title}</h3><span className="location">{item.location}</span></div><div className="role">{item.role} <Tags items={item.tags}/></div></div></div>
    <ul>{item.bullets.map((b:ReactNode,i:number)=><li key={i}>{b}</li>)}</ul>
  </div>
</article>}

export default function Home(){
  const pageRef = useRef<HTMLElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState('')
  const [shot, setShot] = useState<Shot | null>(null)
  const close = useCallback(() => setShot(null), [])

  /* Reveal on scroll. The hiding class is added by script, so the page still
     reads in full if JS never runs. */
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
    const hero = items.filter(el => el.closest('.fashion-hero'))
    const rest = items.filter(el => !el.closest('.fashion-hero'))
    const raf = requestAnimationFrame(() => hero.forEach(el => el.classList.add('is-in')))
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target) }
      })
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 })
    rest.forEach(el => io.observe(el))
    return () => { cancelAnimationFrame(raf); io.disconnect() }
  }, [])

  /* Reading progress, condensed nav, and a slow drift on the portrait. */
  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        const max = document.documentElement.scrollHeight - window.innerHeight
        if (barRef.current) barRef.current.style.width = `${max > 0 ? (y / max) * 100 : 0}%`
        navRef.current?.classList.toggle('is-stuck', y > 12)
        ticking = false
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Highlight the section currently being read. */
  useEffect(() => {
    const sections = navItems
      .map(n => document.getElementById(n.id))
      .filter((el): el is HTMLElement => Boolean(el))
    if (!sections.length || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible) setActive(visible.target.id)
    }, { rootMargin: '-30% 0px -55% 0px', threshold: [0.05, 0.25, 0.6] })
    sections.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  /* Viewer: lock the page behind it and close on Escape. */
  useEffect(() => {
    if (!shot) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [shot, close])

  return <main id="top" ref={pageRef}>
  <div className="progress" ref={barRef} aria-hidden="true"></div>

  <nav className="nav wrap" ref={navRef}>
    <a href="#top" className="logo">WENYI YE<span>.</span></a>
    <div className="navlinks">
      {navItems.map(n => (
        <a key={n.id} href={`#${n.id}`} className={active === n.id ? 'active' : undefined}>{n.label}</a>
      ))}
      <a href="/hobbies">Hobbies</a>
    </div>
    <a href="#contact" className="nav-contact">Get in touch <ArrowUpRight size={13}/></a>
  </nav>

  <header className="fashion-hero wrap">
    <div className="hero-editorial reveal reveal-1">
      <div className="hero-kicker"><span>AI / ML</span><i></i><span>Quant</span><i></i><span>Trading</span></div>
      <h1>Wenyi<em>Ye</em></h1>
      <p className="hero-lede">Building at the intersection of <strong>AI, markets, and quantitative systems</strong> — and curious about what happens when machines learn to trade.</p>
      <div className="hero-rule"></div>
      <div className="hero-meta"><span>Berkeley · 2026</span><span>SF / Ann Arbor / Beijing</span></div>
      <div className="socials">
        <a href="mailto:ywywywy@berkeley.edu">Email</a>
        <a href="https://www.linkedin.com/in/wenyi-wendy-ye-01458a280/" target="_blank" rel="noreferrer">LinkedIn</a>
        <a href="https://github.com/yewenyiywy" target="_blank" rel="noreferrer">GitHub</a>
        <a href="https://www.instagram.com/ye_wen_yi/" target="_blank" rel="noreferrer">Instagram</a>
      </div>
    </div>
    <div className="hero-gallery reveal reveal-2">
      {gallery.map(g => (
        <button key={g.src} type="button" className={`shot ${g.cls}`} onClick={() => setShot(g)}>
          <img src={g.src} alt={g.alt}/>
        </button>
      ))}
      <div className="gallery-caption">A personal archive / 2026</div>
    </div>
  </header>

  <section id="about" className="section wrap"><div className="section-label reveal">ABOUT</div><div className="about-prose reveal">
    <p>I’m currently pursuing a <a className="degree-link" href="https://mfe.haas.berkeley.edu/?utm_campaign=MFE%20MV%20Campaign&utm_source=mw_mfe_brand&utm_medium=paid%20search%20ad&utm_term=2022&utm_content=Branding%20%26%20Competitor&utm_campaign=MFE%20MV%20Campaign&utm_source=mw_mfe_ad4&utm_medium=paid%20search%20ad&utm_term=2020&gclsrc=aw.ds&gad_source=1&gad_campaignid=11879260732&gbraid=0AAAAACZTh32gkiHBGdoU41pyKDWnAIn3H&gclid=CjwKCAjwzNTUBhAjEiwA7zcvWk2k_Bh0vKyCmaN4JclIPBjX4PfJJ8XOVZPLfgmQJnJPSvI7FIz8ThoC238QAvD_BwE"><strong>Master of Financial Engineering</strong></a> at <InlineInstitution logo={logos.berkeley} alt="UC Berkeley" href="https://www.berkeley.edu/">UC Berkeley</InlineInstitution>, exploring the intersection of <strong>AI, machine learning, and financial markets</strong>. I’m a big fan of <strong>trading</strong> and fascinated by how AI will transform alpha discovery, strategy design, and decision-making in markets.</p>
    <p>My background is a little unconventional—I studied <strong>Mathematics</strong> alongside <strong>Human Origins, Biology, and Behavior</strong> at <InlineInstitution logo={logos.umich} alt="University of Michigan" href="https://umich.edu/">the University of Michigan</InlineInstitution>, with a particular interest in <strong>biology and genetics</strong>. This has given me niche interests in <strong>healthcare and biotech</strong>, especially where AI and quantitative methods meet complex biological data. I’ve worked across <strong>AI product, quantitative research, and risk management</strong> at <InlineInstitution logo={logos.tiktok} alt="TikTok" href="https://www.tiktok.com/">TikTok</InlineInstitution>, <InlineInstitution logo={logos.shepherd} alt="Shepherd Ventures" href="https://www.privateequityinternational.com/institution-profiles/shepherd-ventures.html">Shepherd Ventures</InlineInstitution>, <InlineInstitution logo={logos.csc} alt="China Securities" href="https://www.csc108.com/">China Securities</InlineInstitution>, and <InlineInstitution logo={logos.boc} alt="Bank of China" href="https://www.bocusa.com/">Bank of China</InlineInstitution>.</p>
  </div></section>

  <section id="education" className="section wrap"><div className="section-label reveal">EDUCATION</div><div className="timeline">
    <article className="timeline-entry edu"><div className="date">03/2026 – 03/2027</div><div className="entry-content"><div className="entry-top"><Brand src={logos.berkeley} alt="UC Berkeley"/><div className="entry-title"><div className="title-line"><h3>University of California, Berkeley · Haas</h3><span className="location">Berkeley, CA</span></div><div className="role">Master of Financial Engineering</div></div></div></div></article>
    <article className="timeline-entry edu"><div className="date">08/2021 – 05/2025</div><div className="entry-content"><div className="entry-top"><Brand src={logos.umich} alt="University of Michigan"/><div className="entry-title"><div className="title-line"><h3>University of Michigan, Ann Arbor</h3><span className="location">Ann Arbor, MI</span></div><div className="role">B.S. Mathematics · B.S. Human Origins, Biology, and Behavior <span className="minor-note">GPA 3.9/4.0 · University Honors · Math Merit Scholarship</span></div></div></div></div></article>
    <article className="timeline-entry edu"><div className="date">09/2018 – 07/2021</div><div className="entry-content"><div className="entry-top"><Brand src={logos.bdfz} alt="The Affiliated High School of Peking University"/><div className="entry-title"><div className="title-line"><h3>The Affiliated High School of Peking University</h3><span className="location">Beijing, China</span></div><div className="role">High School</div></div></div></div></article>
  </div></section>

  <section id="skills" className="section wrap"><div className="section-label reveal">FOCUS</div><div className="focus-lines reveal"><div><b>AI / ML</b><span>Machine Learning · Deep Learning · Model Evaluation · AI Safety · LangGraph · PyTorch · scikit-learn</span></div><div><b>Quant</b><span>Alpha Research · Time Series · Optimization · Stochastic Calculus · Algorithmic Trading · Backtesting</span></div><div><b>Tools</b><span>Python · C++ · SQL · R · Pandas · NumPy · SciPy · Git · Docker</span></div><div><b>Languages</b><span>Chinese (Native) · English (Professional) · French (Intermediate) · Korean (Beginner)</span></div><div><b>Certification</b><span>CFA Level 1 · Passed</span></div></div></section>

  <section id="experience" className="section wrap"><div className="section-label reveal">EXPERIENCE</div><div className="timeline">{experience.map(item=><Entry item={item} key={item.company}/>)}</div></section>
  <section id="research" className="section wrap"><div className="section-label reveal">RESEARCH / TRADING</div><div className="timeline">{research.map(item=><Entry item={item} key={item.title}/>)}</div></section>

  <footer id="contact" className="footer wrap reveal"><div><div className="section-label reveal">CONTACT</div><h2>Say hello.</h2></div><div className="footer-links"><a href="mailto:ywywywy@berkeley.edu"><Mail size={14}/>ywywywy@berkeley.edu</a><a href="https://www.linkedin.com/in/wenyi-wendy-ye-01458a280/" target="_blank" rel="noreferrer"><Linkedin size={14}/> LinkedIn</a><a href="https://github.com/yewenyiywy" target="_blank" rel="noreferrer"><Github size={14}/> GitHub / yewenyiywy</a><a href="https://www.instagram.com/ye_wen_yi/" target="_blank" rel="noreferrer"><Instagram size={14}/> Instagram / ye_wen_yi</a></div><div className="copyright">© 2026 Wenyi Ye</div></footer>

  {shot && (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={shot.title} onClick={close}>
      <button className="lightbox-close" type="button" aria-label="Close" autoFocus>✕</button>
      <img src={shot.src} alt={shot.alt}/>
      <figcaption><span>{shot.title}</span><em>{shot.note}</em></figcaption>
      <div className="lightbox-hint">Click anywhere or press Esc to close</div>
    </div>
  )}
</main>
}
