'use client'

import * as THREE from 'three'
import html2canvas from 'html2canvas'

// The Blender-rendered journal supplies realistic paper on both faces.
export async function flipLeaf(book: HTMLElement, direction: number, target: number, reveal: () => void) {
  const current = book.querySelector<HTMLElement>('.journal-spread:not([hidden])')
  const destination = book.querySelectorAll<HTMLElement>('.journal-spread:not(.journal-detail)')[target]
  if (!current || !destination) { reveal(); return }
  const fromSide = direction > 0 ? 'right' : 'left'
  const toSide = direction > 0 ? 'left' : 'right'
  const front = current.querySelector<HTMLElement>(`.journal-${fromSide}`)!
  const stationary = current.querySelector<HTMLElement>(`.journal-${toSide}`)!
  const back = destination.querySelector<HTMLElement>(`.journal-${toSide}`)!
  const resources: { dispose(): void }[] = []
  let renderer: THREE.WebGLRenderer | undefined
  let revealed = false
  const show = () => { if (!revealed) { revealed = true; reveal() } }
  try {
    const width = book.offsetWidth, height = book.offsetHeight
    const pixel = 1
    const pageWidth = width * .439, pageHeight = height * .83
    const pageTop = height * .08
    const artwork = new Image()
    artwork.src = '/hobbies/real-journal.webp'
    await artwork.decode()
    let captureId = 0
    const snapshot = async (leaf: HTMLElement, side: string, layout: HTMLElement) => {
      const id = `journal-capture-${++captureId}`
      leaf.dataset.captureId = id
      try {
        const content = await html2canvas(leaf, { scale: 1, backgroundColor: null, useCORS: true, imageTimeout: 600, logging: false, onclone(doc) {
          const cloned = doc.querySelector<HTMLElement>(`[data-capture-id="${id}"]`)
          if (!cloned) return
          cloned.closest<HTMLElement>('.journal-spread')!.hidden = false
          cloned.closest<HTMLElement>('.journal-book')!.style.transform = 'none'
        } })
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(pageWidth / pixel); canvas.height = Math.round(pageHeight / pixel)
        const ctx = canvas.getContext('2d')!
        const pageLeft = width * (side === 'left' ? .061 : .5)
        ctx.drawImage(artwork, artwork.width * (side === 'left' ? .061 : .5), artwork.height * .08, artwork.width * .439, artwork.height * .83, 0, 0, canvas.width, canvas.height)
        const spread = layout.parentElement!
        const x = ((layout.offsetParent===spread?spread.offsetLeft:0) + layout.offsetLeft - pageLeft) / pixel
        const y = ((layout.offsetParent===spread?spread.offsetTop:0) + layout.offsetTop - pageTop) / pixel
        ctx.drawImage(content, x, y, layout.offsetWidth / pixel, layout.offsetHeight / pixel)
        const texture = new THREE.CanvasTexture(canvas)
        texture.magFilter = texture.minFilter = THREE.LinearFilter
        texture.generateMipmaps = false
        texture.colorSpace = THREE.SRGBColorSpace
        resources.push(texture)
        return texture
      } finally { delete leaf.dataset.captureId }
    }
    const [frontMap, backMap, stationaryMap] = await Promise.all([snapshot(front, fromSide, front), snapshot(back, toSide, stationary), snapshot(stationary, toSide, stationary)])
    backMap.repeat.x = -1; backMap.offset.x = 1
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(Math.ceil(width / pixel), Math.ceil(height / pixel), false)
    renderer.domElement.className = 'journal-flip-canvas'
    renderer.domElement.setAttribute('aria-hidden', 'true')
    book.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-width / 2,width / 2,height / 2,-height / 2,1,5000)
    camera.position.z = 2000
    const segments = 48
    const geometry = new THREE.PlaneGeometry(pageWidth, pageHeight, segments, 8)
    const stationaryGeometry = new THREE.PlaneGeometry(pageWidth, pageHeight)
    const mat = new THREE.MeshBasicMaterial({ map: frontMap, side: THREE.FrontSide, vertexColors: true })
    const reverse = new THREE.MeshBasicMaterial({ map: backMap, side: THREE.BackSide, vertexColors: true })
    const fixedMaterial = new THREE.MeshBasicMaterial({ map: stationaryMap, transparent: true })
    resources.push(geometry, stationaryGeometry, mat, reverse, fixedMaterial)
    const fixed = new THREE.Mesh(stationaryGeometry, fixedMaterial)
    fixed.position.set(-direction * pageWidth / 2, height * .005, 0)
    const frontMesh = new THREE.Mesh(geometry, mat), backMesh = new THREE.Mesh(geometry, reverse)
    frontMesh.position.y = backMesh.position.y = height * .005
    scene.add(fixed, frontMesh, backMesh)
    const positions = geometry.attributes.position
    const uv = geometry.attributes.uv
    const colors = new Float32Array(positions.count * 3)
    const shading = new THREE.BufferAttribute(colors, 3)
    geometry.setAttribute('color', shading)
    // Arc-length integration keeps the paper a constant size throughout the turn.
    const render = (t: number) => {
      const p = t*t*(3-2*t)
      const curl = Math.sin(Math.PI*p) * 1.15
      const xs = [0], zs = [2]
      for(let j=1;j<=segments;j++) {
        const angle = Math.PI*p + curl*((j-.5)/segments-.5)
        xs[j]=xs[j-1]+direction*pageWidth/segments*Math.cos(angle)
        zs[j]=zs[j-1]+pageWidth/segments*Math.sin(angle)
      }
      for (let i=0;i<positions.count;i++) {
        const u = direction>0?uv.getX(i):1-uv.getX(i)
        const j = Math.round(u*segments)
        positions.setX(i,xs[j]);positions.setZ(i,zs[j])
        const angle=Math.PI*p+curl*(u-.5)
        const light=.75+.25*Math.abs(Math.cos(angle))
        shading.setXYZ(i,light,light,light)
      }
      positions.needsUpdate=true;shading.needsUpdate=true
      renderer!.render(scene,camera)
    }
    render(0)
    show()
    const start = performance.now()
    await new Promise<void>(resolve => {
      const frame=(now:number)=>{const t=Math.min(1,(now-start)/850); render(t); if(t<1)requestAnimationFrame(frame);else resolve()}
      requestAnimationFrame(frame)
    })
  } catch {
    // Progressive fallback still turns the live leaf without any extra UI.
    if (!revealed && front.animate) await front.animate([{opacity:1,transform:'perspective(900px) rotateY(0deg)'},{opacity:.2,transform:`perspective(900px) rotateY(${direction*-85}deg)`}],{duration:230,easing:'ease-in'}).finished.catch(()=>{})
  } finally {
    show()
    renderer?.domElement.remove(); renderer?.dispose()
    for (const resource of resources) resource.dispose()
  }
}
