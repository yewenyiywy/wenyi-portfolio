'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import styles from './marmoset-pet.module.css'

export default function MarmosetPet() {
  const pathname = usePathname()
  const [activity, setActivity] = useState<'idle' | 'hop' | 'eat' | 'happy' | 'rest'>('idle')
  const [greeting, setGreeting] = useState(false)
  const [fullness, setFullness] = useState(1)
  const [alignRight, setAlignRight] = useState(false)

  useEffect(() => {
    if (activity === 'idle' || activity === 'rest') return
    const duration = activity === 'eat' ? 2400 : activity === 'happy' ? 1500 : 680
    const timer = window.setTimeout(() => setActivity(activity === 'eat' ? 'happy' : 'idle'), duration)
    return () => window.clearTimeout(timer)
  }, [activity])

  useEffect(() => {
    const timer = window.setInterval(() => setFullness(value => Math.max(0, value - 1)), 45000)
    return () => window.clearInterval(timer)
  }, [])

  function greet(event: MouseEvent<HTMLButtonElement>) {
    setAlignRight(event.currentTarget.getBoundingClientRect().left > window.innerWidth / 2)
    if (activity === 'idle') setActivity('hop')
    if (activity === 'rest' && !greeting) setActivity('idle')
    setGreeting(open => !open)
  }

  function feed() {
    if (fullness >= 3 || activity === 'eat' || activity === 'happy') return
    setFullness(value => Math.min(3, value + 1))
    setActivity('eat')
  }

  const busy = activity === 'eat' || activity === 'happy'

  return (
    <div className={styles.world} onKeyDown={event => {
      if (event.key === 'Escape') setGreeting(false)
    }}>
      <div className={styles.roamer} data-activity={activity} data-greeting={greeting} data-align-right={alignRight}>
        <button
          type="button"
          className={styles.pet}
          aria-label="Say hello to the pixel marmoset"
          aria-expanded={greeting}
          aria-controls="marmoset-greeting"
          onClick={greet}
        >
          <span className={styles.facing} aria-hidden="true">
            <span className={styles.walkLayer}><span className={styles.sprite} /></span>
            <span className={styles.edgeIdle} />
          </span>
        </button>
        <div className={styles.greeting} id="marmoset-greeting" hidden={!greeting}>
          <div className={styles.petTitle}>Marmoset <button type="button" aria-label="Close pet menu" onClick={() => setGreeting(false)}>×</button></div>
          <div className={styles.fullness} aria-label={`Fullness: ${fullness} of 3`}>
            <span>Fullness</span><span aria-hidden="true">{'♥'.repeat(fullness)}{'♡'.repeat(3 - fullness)}</span>
          </div>
          <p className={styles.status} role="status">{activity === 'eat' ? 'Nom nom…' : activity === 'happy' ? 'Yummy!' : activity === 'rest' ? 'Zzz…' : fullness === 3 ? 'I’m full!' : 'Hi there!'}</p>
          <div className={styles.actions}>
            <button type="button" onClick={feed} disabled={busy || fullness === 3}>Feed apple</button>
            <button type="button" onClick={() => setActivity(activity === 'rest' ? 'idle' : 'rest')} disabled={busy}>{activity === 'rest' ? 'Wake' : 'Rest'}</button>
          </div>
          {pathname !== '/hobbies' && <Link href="/hobbies" onClick={() => setGreeting(false)}>Explore Hobbies</Link>}
        </div>
      </div>
    </div>
  )
}
