'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './marmoset-pet.module.css'

export default function MarmosetPet() {
  const pathname = usePathname()
  const [hopping, setHopping] = useState(false)
  const [greeting, setGreeting] = useState(false)

  useEffect(() => {
    if (!hopping) return
    const timer = window.setTimeout(() => setHopping(false), 680)
    return () => window.clearTimeout(timer)
  }, [hopping])

  function greet() {
    setHopping(true)
    setGreeting(open => !open)
  }

  return (
    <div className={styles.world} onKeyDown={event => {
      if (event.key === 'Escape') setGreeting(false)
    }}>
      <div className={styles.roamer} data-hopping={hopping} data-greeting={greeting}>
        <button
          type="button"
          className={styles.pet}
          aria-label="Say hello to the pixel marmoset"
          aria-expanded={greeting}
          aria-controls="marmoset-greeting"
          onClick={greet}
        >
          <span className={styles.facing} aria-hidden="true">
            <span className={styles.sprite} />
          </span>
        </button>
        <div className={styles.greeting} id="marmoset-greeting" hidden={!greeting}>
          {pathname === '/hobbies' ? 'Hi there!' : (
            <Link href="/hobbies" onClick={() => setGreeting(false)}>Explore Hobbies</Link>
          )}
        </div>
      </div>
    </div>
  )
}
