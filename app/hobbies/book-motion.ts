'use client'

import * as THREE from 'three'
import html2canvas from 'html2canvas'

// Render a faceted, flexible leaf over the live, accessible HTML journal.
export async function flipLeaf(book: HTMLElement, direction: number, reveal: () => void) {
  const leaf = book.querySelector<HTMLElement>(`.journal-spread:not([hidden]) .journal-${direction > 0 ? 'right' : 'left'}`)
  if (!leaf || window.innerWidth <= 850 || matchMedia('(prefers-reduced-motion: reduce)').matches) { reveal(); return }
  let renderer: THREE.WebGLRenderer | undefined
  let geometry: THREE.PlaneGeometry | undefined
  let texture: THREE.CanvasTexture | undefined
  let material: THREE.MeshBasicMaterial | undefined
  let reverse: THREE.MeshBasicMaterial | undefined
  let revealed = false
  const show = () => { if (!revealed) { revealed = true; reveal() } }
  try {
    const width = book.offsetWidth, height = book.offsetHeight
    const pageWidth = leaf.offsetWidth, pageHeight = leaf.offsetHeight
    const snapshot = await html2canvas(leaf, { scale: 1, backgroundColor: '#e9d9b4', useCORS: true, imageTimeout: 1000, logging: false })
    texture = new THREE.CanvasTexture(snapshot)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.LinearFilter
    texture.colorSpace = THREE.SRGBColorSpace
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false })
    renderer.setPixelRatio(1)
    renderer.setSize(width, height)
    renderer.domElement.className = 'journal-flip-canvas'
    renderer.domElement.setAttribute('aria-hidden', 'true')
    book.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 1, 5000)
    camera.position.z = 2000
    const segments = 22
    geometry = new THREE.PlaneGeometry(pageWidth, pageHeight, segments, 1)
    material = new THREE.MeshBasicMaterial({ map: texture, side: direction > 0 ? THREE.FrontSide : THREE.BackSide })
    reverse = new THREE.MeshBasicMaterial({ color: '#d8c69f', side: direction > 0 ? THREE.BackSide : THREE.FrontSide })
    const front = new THREE.Mesh(geometry, material), back = new THREE.Mesh(geometry, reverse)
    scene.add(front, back)
    const positions = geometry.attributes.position
    const uv = geometry.attributes.uv
    if (direction < 0) for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i))
    uv.needsUpdate = true
    const start = performance.now()
    await new Promise<void>(resolve => {
      const frame = (now: number) => {
        const t = Math.min(1, (now - start) / 760)
        const eased = t * t * (3 - 2 * t)
        const angle = Math.PI * eased
        const curl = .85 * Math.sin(Math.PI * eased)
        for (let i = 0; i < positions.count; i++) {
          const u = direction > 0 ? uv.getX(i) : 1 - uv.getX(i)
          const a = angle + curl * (u - .5)
          positions.setX(i, direction * pageWidth * u * Math.cos(a))
          positions.setZ(i, pageWidth * u * Math.sin(a) + 2)
        }
        positions.needsUpdate = true
        if (t >= .5) show()
        renderer!.render(scene, camera)
        if (t < 1) requestAnimationFrame(frame); else resolve()
      }
      requestAnimationFrame(frame)
    })
  } catch {
    // No WebGL or snapshot support: the HTML journal remains usable.
  } finally {
    show()
    renderer?.domElement.remove()
    renderer?.dispose()
    geometry?.dispose()
    texture?.dispose()
    material?.dispose()
    reverse?.dispose()
  }
}
