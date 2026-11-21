'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import './studio.css'

const destinations: Record<string, { label: string; href: string }> = {
  target_about:{label:'Photographs · About me',href:'/classic#about'},
  target_education:{label:'Degree certificate · Education & awards',href:'/classic#education'},
  target_experience:{label:'Résumé · Professional experience',href:'/classic#experience'},
  target_projects:{label:'Research notebook · Projects & skills',href:'/classic#projects'},
  target_hobbies:{label:'Hobbies · Personal journal',href:'/hobbies'},
  target_computer:{label:'Alchemy · Play game',href:'/game'},
}
const photos=['/wenyi.jpg','/photo-03.jpg','/photo-02.jpg','/photo-04.jpg']

function canvasTexture(draw:(ctx:CanvasRenderingContext2D,w:number,h:number)=>void,w=768,h=512) {
  const c=document.createElement('canvas');c.width=w;c.height=h
  draw(c.getContext('2d')!,w,h)
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;t.anisotropy=4
  return t
}
function title(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,size:number,color:string,font='Georgia') {
  ctx.fillStyle=color;ctx.font=`${size}px ${font}`;ctx.textAlign='center';ctx.fillText(text,x,y)
}
function border(ctx:CanvasRenderingContext2D,w:number,h:number,color:string,inset=24) {
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(inset,inset,w-2*inset,h-2*inset);ctx.strokeRect(inset+8,inset+8,w-2*inset-16,h-2*inset-16)
  for(const [x,y,sx,sy] of [[inset,inset,1,1],[w-inset,inset,-1,1],[inset,h-inset,1,-1],[w-inset,h-inset,-1,-1]]){
    ctx.beginPath();ctx.moveTo(x+sx*65,y);ctx.quadraticCurveTo(x+sx*20,y+sy*12,x,y+sy*65);ctx.stroke()
  }
}
function bookTexture(color:string,heading:string,subtitle:string){return canvasTexture((ctx,w,h)=>{
  ctx.fillStyle=color;ctx.fillRect(0,0,w,h)
  // Fine, real woven-cloth grain, not a flattened book illustration.
  for(let y=0;y<h;y+=3){ctx.fillStyle=y%6===0?'#ffffff08':'#00000012';ctx.fillRect(0,y,w,1)}
  for(let x=0;x<w;x+=4){ctx.fillStyle='#ffffff08';ctx.fillRect(x,0,1,h)}
  border(ctx,w,h,'#c7a05a',24)
  title(ctx,heading,w/2,h*.46,62,'#d5b575');title(ctx,subtitle,w/2,h*.57,25,'#d5b575')
  title(ctx,'✦',w/2,h*.28,32,'#d5b575');title(ctx,'W. Y.',w/2,h*.79,28,'#d5b575')
})}
function degreeTexture(school:string,sub:string){return canvasTexture((ctx,w,h)=>{
  ctx.fillStyle='#f5ecd6';ctx.fillRect(0,0,w,h);border(ctx,w,h,'#a18a5a',22)
  title(ctx,school,w/2,h*.25,42,'#303b47');title(ctx,'Wenyi Ye',w/2,h*.47,46,'#50412c','Georgia');title(ctx,sub,w/2,h*.61,22,'#62543f')
  ctx.fillStyle='#ad8250';ctx.beginPath();ctx.arc(w/2,h*.78,27,0,Math.PI*2);ctx.fill();title(ctx,'✦',w/2,h*.795,23,'#f8e8b8')
})}
function resumeTexture(){return canvasTexture((ctx,w,h)=>{
  ctx.fillStyle='#faf7ee';ctx.fillRect(0,0,w,h);title(ctx,'WENYI YE',w/2,64,42,'#25352f','Arial');title(ctx,'PROFESSIONAL EXPERIENCE',w/2,100,19,'#72634f','Arial')
  ctx.fillStyle='#9d8b68';ctx.fillRect(48,120,w-96,2)
  ctx.textAlign='left';ctx.font='bold 23px Arial';ctx.fillStyle='#2b342d'
  const companies=['TikTok · AI Product','Trexquant · Quantitative Research','Research & Investment']
  companies.forEach((company,i)=>{
    const y=160+i*108;ctx.fillText(company,48,y);ctx.fillStyle='#b2ac9b';for(let j=0;j<3;j++)ctx.fillRect(48,y+16+j*17,w-96-(j%2)*60,3);ctx.fillStyle='#2b342d'
  })
})}
function screenTexture(){return canvasTexture((ctx,w,h)=>{
  ctx.fillStyle='#075c59';ctx.fillRect(0,0,w,h);ctx.fillStyle='#e5e6d7';ctx.fillRect(0,0,w,37)
  ctx.font='bold 20px monospace';ctx.fillStyle='#182620';ctx.textAlign='left';ctx.fillText('◈  Wenyi OS     File   Games',15,25)
  title(ctx,'WENYI’S PLAYROOM',w/2,112,39,'#d9e7c8','monospace')
  const icon=(x:number,label:string,symbol:string,color:string)=>{
    ctx.fillStyle='#082f30';ctx.fillRect(x-82,177,164,128);ctx.fillStyle='#e5e3cc';ctx.fillRect(x-73,168,146,128)
    ctx.fillStyle=color;ctx.fillRect(x-63,178,126,108);title(ctx,symbol,x,253,64,'#f0e8d0','monospace');title(ctx,label,x,338,27,'#fff6d6','monospace')
  }
  icon(w*.25,'ALCHEMY','✦','#5c376c');icon(w*.75,'AFTERGLOW','☾','#9a6058')
  title(ctx,'Choose a game',w/2,435,22,'#d2ded0','monospace')
  for(let y=0;y<h;y+=4){ctx.fillStyle='#101c2424';ctx.fillRect(0,y,w,1)}
},768,532)}
function woodTexture(){return canvasTexture((ctx,w,h)=>{
  const image=ctx.createImageData(w,h)
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const line=Math.sin(y*.31+Math.sin(x*.023)*2.4)+.45*Math.sin(y*1.19+x*.011)+.35*Math.sin(y*.081+x*.005)
    const grain=Math.sin(x*13.13+y*91.77)*.5, n=line*9+grain*4,i=(y*w+x)*4
    image.data[i]=99+n;image.data[i+1]=55+n*.69;image.data[i+2]=32+n*.42;image.data[i+3]=255
  }ctx.putImageData(image,0,0)
},768,256)}

export default function StudioScene(){
  const mount=useRef<HTMLDivElement>(null)
  const tooltip=useRef<HTMLDivElement>(null)
  const router=useRouter()
  const [status,setStatus]=useState<'loading'|'ready'|'fallback'>('loading')
  const [hover,setHover]=useState('')
  useEffect(()=>{
    const hash=window.location.hash.slice(1)
    if(['about','education','skills','experience','projects','awards','contact'].includes(hash))router.replace(`/classic#${hash}`)
  },[router])
  useEffect(()=>{
    const host=mount.current;if(!host)return
    let alive=true,frame=0,renderer:THREE.WebGLRenderer|undefined,scene:THREE.Scene|undefined,model:THREE.Group|undefined
    let observer:ResizeObserver|undefined,transition:ReturnType<typeof setTimeout>|undefined
    const textures:THREE.Texture[]=[]
    const ownedMaterials:THREE.Material[]=[]
    const abort=new AbortController()
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
    const camera=new THREE.PerspectiveCamera(40,1,.1,50)
    const look=new THREE.Vector3(0,2.03,-.18)
    let yaw=0,pitch=0,dragYaw=0,dragPitch=0,aspect=1,hovered='',moving=false
    let focus:THREE.Vector3|null=null,focusCamera:THREE.Vector3|null=null
    let pointer:{x:number;y:number;yaw:number;pitch:number}|null=null
    const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),desired=new THREE.Vector3()
    const choose=(event:PointerEvent)=>{
      if(!model||!renderer)return null
      const rect=renderer.domElement.getBoundingClientRect()
      mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1)
      ray.setFromCamera(mouse,camera)
      const intersections=ray.intersectObject(model,true)
      // A nearer non-interactive object occludes a more distant target.
      const hit=intersections[0];if(!hit)return null
      let object:THREE.Object3D|null=hit.object
      while(object&&!destinations[object.name])object=object.parent
      const name=hit.object.name.toLowerCase()
      const route=object?.name==='target_computer'&&hit.object.name==='computer_screen'&&hit.uv&&hit.uv.x>.5?{label:'Afterglow · Play game',href:'https://afterglow-gray-five.vercel.app/'}:object?destinations[object.name]:null
      let label=route?.label??''
      if(object?.name==='target_education')label=name.endsWith('_0')?'University of Michigan · Education':name.endsWith('_1')?'UC Berkeley · Education':'Degree certificate · Education'
      else if(object?.name==='target_computer'){
        if(name.startsWith('mouse'))label='Wired mouse · Computer'
        else if(name.includes('keyboard')||name.includes('spacebar'))label='Keyboard · Computer'
        else if(name!=='computer_screen')label='Retro CRT computer · Games'
      }else if(!route){
        if(name.includes('lamp'))label='Reading lamp'
        else if(name.includes('plant')||name.includes('planter')||name.includes('soil'))label='Potted plant'
        else if(name.includes('shelf book'))label='Books'
        else if(name.includes('desk pad')||name.includes('mat edge'))label='Leather desk mat'
      }
      return {route,label,object:hit.object}
    }
    const updateHover=(text:string,clickable=false)=>{if(hovered!==text){hovered=text;setHover(text)}if(renderer)renderer.domElement.style.cursor=clickable?'pointer':'grab'}
    const positionTooltip=(e:PointerEvent)=>{
      const box=host.getBoundingClientRect(),node=tooltip.current;if(!node)return
      const w=Math.min(300,box.width-16),h=Math.max(node.offsetHeight,40)
      const x=e.clientX-box.left,y=e.clientY-box.top
      node.style.left=`${Math.max(8,Math.min(box.width-w-8,x+17))}px`
      node.style.top=`${Math.max(8,Math.min(box.height-h-8,y+20))}px`
    }
    const move=(e:PointerEvent)=>{
      if(moving)return
      const bounds=host.getBoundingClientRect()
      if(pointer){
        dragYaw=THREE.MathUtils.clamp(pointer.yaw+(e.clientX-pointer.x)/bounds.width*.6,-.23,.23)
        dragPitch=THREE.MathUtils.clamp(pointer.pitch+(e.clientY-pointer.y)/bounds.height*.35,-.12,.12)
        if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>5)updateHover('')
      }else if(e.pointerType==='mouse'){
        const x=(e.clientX-bounds.left)/bounds.width*2-1,y=(e.clientY-bounds.top)/bounds.height*2-1
        yaw=x*.065;pitch=-y*.035;const hit=choose(e);updateHover(hit?.label??'',Boolean(hit?.route));positionTooltip(e)
      }
    }
    const down=(e:PointerEvent)=>{if(moving||e.button!==0)return;pointer={x:e.clientX,y:e.clientY,yaw:dragYaw,pitch:dragPitch};renderer?.domElement.setPointerCapture(e.pointerId)}
    const up=(e:PointerEvent)=>{
      const p=pointer;pointer=null;if(!p||moving||Math.hypot(e.clientX-p.x,e.clientY-p.y)>8)return
      const hit=choose(e);if(!hit?.route)return
      const route=hit.route
      moving=true;updateHover('')
      if(!reduced){focus=new THREE.Box3().setFromObject(hit.object).getCenter(new THREE.Vector3());focusCamera=camera.position.clone().lerp(focus,.34)}
      const navigate=()=>{if(route.href.startsWith('https:'))window.location.assign(route.href);else router.push(route.href)}
      if(reduced)navigate();else transition=setTimeout(navigate,580)
    }
    const leave=()=>{if(!pointer&&!moving){yaw=pitch=0;updateHover('')}}
    const cancel=()=>{pointer=null}
    try {
      renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'})
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace
      renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12
      renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap
      renderer.shadowMap.autoUpdate=false
      renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.style.cursor='grab';host.appendChild(renderer.domElement)
      scene=new THREE.Scene();scene.background=new THREE.Color('#73644f')
      scene.add(new THREE.HemisphereLight('#e3dfce','#493022',1.45))
      const sunlight=new THREE.DirectionalLight('#ffd4a0',3.1);sunlight.position.set(-4.5,6.2,2.8);sunlight.castShadow=true
      sunlight.shadow.mapSize.set(2048,2048);sunlight.shadow.camera.left=-6;sunlight.shadow.camera.right=6;sunlight.shadow.camera.top=6;sunlight.shadow.camera.bottom=-6;sunlight.shadow.normalBias=.025;sunlight.shadow.bias=-.00015;scene.add(sunlight)
      const fill=new THREE.DirectionalLight('#d1e2e4',.65);fill.position.set(4,4,5);scene.add(fill)
      const lamp=new THREE.PointLight('#ffc278',12,3,.8);lamp.position.set(-2.88,2.58,-.48);scene.add(lamp)
      const resize=()=>{if(!renderer||!host.clientWidth||!host.clientHeight)return;aspect=host.clientWidth/host.clientHeight;camera.aspect=aspect;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight)}
      observer=new ResizeObserver(resize);observer.observe(host);resize()
      const textureLoader=new THREE.TextureLoader()
      const apply=(mesh:THREE.Mesh,texture:THREE.Texture,unlit=false)=>{
        textures.push(texture);const material=unlit?new THREE.MeshBasicMaterial({map:texture}):new THREE.MeshStandardMaterial({map:texture,roughness:.86});ownedMaterials.push(material);mesh.material=material
      }
      const loader=new GLTFLoader()
      void (async()=>{
        try{
          const response=await fetch('/studio.glb.gz',{signal:abort.signal});if(!response.ok||!response.body)throw Error('Model unavailable')
          const encoded=await response.arrayBuffer()
          const signature=new Uint8Array(encoded,0,4)
          const buffer=signature[0]===0x67&&signature[1]===0x6c?encoded:await new Response(new Blob([encoded]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
          const gltf=await loader.parseAsync(buffer,'/');if(!alive)return
          model=gltf.scene
          const wood=woodTexture();textures.push(wood)
          model.traverse(obj=>{
            if(!(obj instanceof THREE.Mesh))return
            obj.castShadow=true;obj.receiveShadow=true
            const m=obj.material as THREE.MeshStandardMaterial
            if(m.name==='Walnut'){m.map=wood;m.color.set('#ffffff');m.roughness=.53;m.needsUpdate=true}
            const name=obj.name
            if(name==='computer_screen'){apply(obj,screenTexture(),true);obj.castShadow=false}
            else if(name.startsWith('keyboard_label_')){
              const [, ,row,col]=name.split('_');const chars=['1234567890–+=⌫','QWERTYUIOP[]\\','ASDFGHJKL;\'↵','ZXCVBNM,./⇧']
              const symbol=chars[Number(row)]?.[Number(col)]??''
              const texture=canvasTexture((ctx,w,h)=>title(ctx,symbol,w/2,h*.58,28,'#4d493d','Arial'),64,64)
              textures.push(texture);const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});ownedMaterials.push(material);obj.material=material;obj.castShadow=false
            }
            else if(name==='hobbies_cover')apply(obj,bookTexture('#173f30','HOBBIES','A PERSONAL JOURNAL'))
            else if(name==='research_cover')apply(obj,bookTexture('#762d31','RESEARCH','PROJECTS & SKILLS'))
            else if(name==='resume_texture')apply(obj,resumeTexture())
            else if(name.startsWith('degree_texture_'))apply(obj,name.endsWith('0')?degreeTexture('University of Michigan','Undergraduate studies'):degreeTexture('UC Berkeley','Graduate studies'))
            else if(name.startsWith('photo_texture_')){
              const index=Number(name.split('_').pop());const url=photos[index]
              if(url)textureLoader.load(url,t=>{if(!alive){t.dispose();return};t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;t.anisotropy=4;const image=t.image as HTMLImageElement;const imageAspect=image.width/image.height,frameAspect=.79;if(imageAspect>frameAspect){t.repeat.x=frameAspect/imageAspect;t.offset.x=(1-t.repeat.x)/2}else{t.repeat.y=imageAspect/frameAspect;t.offset.y=(1-t.repeat.y)/2}apply(obj,t)})
            }
          })
          scene!.add(model);renderer!.shadowMap.needsUpdate=true;setStatus('ready')
        }catch(e){if(alive)setStatus('fallback')}
      })()
      const animate=()=>{
        if(!alive||!renderer||!scene)return
        const radius=6.0*Math.max(1,1.5/aspect)
        const a=reduced?0:THREE.MathUtils.clamp(yaw+dragYaw,-.28,.28),b=reduced?0:THREE.MathUtils.clamp(pitch+dragPitch,-.15,.15)
        desired.set(Math.sin(a)*radius,3.48+(radius-6.0)*.19+Math.sin(b)*radius,Math.cos(a)*radius)
        camera.position.lerp(focusCamera??desired,.085)
        if(focus)look.lerp(focus,.085);camera.lookAt(look)
        renderer.render(scene,camera);frame=requestAnimationFrame(animate)
      }
      camera.position.set(0,3.48,6.0);animate()
      const canvas=renderer.domElement;canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointerleave',leave);canvas.addEventListener('pointercancel',cancel)
    }catch{setStatus('fallback')}
    return()=>{alive=false;abort.abort();cancelAnimationFrame(frame);if(transition)clearTimeout(transition);observer?.disconnect();scene?.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();const mats=Array.isArray(obj.material)?obj.material:[obj.material];mats.forEach(m=>m.dispose())}});textures.forEach(t=>t.dispose());ownedMaterials.forEach(m=>m.dispose());renderer?.dispose();renderer?.domElement.remove()}
  },[router])

  return <main className="studio-home">
    <header className="studio-nav"><Link href="/" className="studio-brand">Wenyi Ye<span>.</span></Link><div><Link href="/classic/full">View full portfolio</Link><Link href="/classic#contact">Contact</Link></div></header>
    <section className="studio-intro"><p>QUANTITATIVE FINANCE · AI · PRODUCT</p><h1>Welcome to my studio.</h1><div>Explore the objects on my desk, or read my portfolio directly.</div></section>
    <div className="studio-stage" data-status={status}>
      <div className="studio-render" ref={mount}/>
      {status==='loading'&&<p className="studio-state" role="status">Opening the studio…</p>}
      {status==='fallback'&&<p className="studio-state">The 3D studio is unavailable on this device. All sections are available below.</p>}
      {status==='ready'&&<div className="studio-scene-caption">Explore the desk · Drag to look around</div>}
      <div ref={tooltip} className={`studio-object-tooltip${hover?' is-visible':''}`} role="tooltip" aria-hidden={!hover}>{hover}</div>
    </div>
    <nav className="studio-index" aria-label="Portfolio sections"><Link href="/classic#about">About</Link><Link href="/classic#education">Education</Link><Link href="/classic#experience">Experience</Link><Link href="/classic#projects">Projects</Link><Link href="/classic#skills">Skills</Link><Link href="/hobbies">Hobbies</Link><Link href="/game">Alchemy</Link><a href="https://afterglow-gray-five.vercel.app/">Afterglow</a></nav>
  </main>
}
