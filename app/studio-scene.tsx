'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import './studio.css'

const destinations: Record<string, { label: string; href: string }> = {
  target_about:{label:'Photographs · About me',href:'/classic#about'},
  target_education:{label:'Degree certificate · Education & awards',href:'/classic#education'},
  target_experience:{label:'Résumé · Professional experience',href:'/classic#experience'},
  target_projects:{label:'Research notebook · Projects & skills',href:'/classic#projects'},
  target_hobbies:{label:'Hobbies · Personal journal',href:'/hobbies'},
  target_computer:{label:'Alchemy · Play game',href:'/game'},
  target_contact:{label:'Contact · Card index',href:'#contact-card'},
}

const contactCards=[
  {tab:'Email',hint:'The best way to reach me',value:'ywywywy@berkeley.edu',href:'mailto:ywywywy@berkeley.edu'},
  {tab:'LinkedIn',hint:'Professional network',value:'Wenyi (Wendy) Ye',href:'https://www.linkedin.com/in/wenyi-wendy-ye-01458a280/'},
  {tab:'GitHub',hint:'Code, research and open-source projects',value:'github.com/yewenyiywy',href:'https://github.com/yewenyiywy'},
  {tab:'Instagram',hint:'Art, hobbies and life outside work',value:'@ye_wen_yi',href:'https://www.instagram.com/ye_wen_yi/'},
]

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
function degreeTexture(michigan:boolean){
  const color='#302a23'
  const texture=canvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#fffcf3';ctx.fillRect(0,0,w,h)
    title(ctx,michigan?'The University of Michigan':'University of California, Berkeley',w/2,h*(michigan?.25:.16),michigan?47:39,color,'Georgia')
    title(ctx,michigan?'Ann Arbor · College of Literature, Science, and the Arts':'Haas School of Business',w/2,h*(michigan?.31:.23),22,color)
    ctx.fillStyle='#332c25';ctx.font='italic 52px Georgia';ctx.textAlign='center';ctx.fillText('Wenyi Ye',w/2,h*(michigan?.45:.39))
    if(michigan){title(ctx,'Bachelor of Science',w/2,h*.51,35,color);title(ctx,'Financial Mathematics',w/2,h*.60,25,color);title(ctx,'Human Origins, Biology, and Behavior',w/2,h*.67,25,color)}
    else title(ctx,'Master of Financial Engineering',w/2,h*.54,32,color)
    title(ctx,michigan?'Class of 2025':'Expected March 2027',w/2,h*.77,23,color)
    title(ctx,'PERSONAL ACADEMIC DISPLAY · NOT AN OFFICIAL DOCUMENT',w/2,h*.95,12,'#847562','Arial')
  },1024,640)
  const logo=new Image();logo.onload=()=>{const c=texture.image as HTMLCanvasElement,ctx=c.getContext('2d')!;const max=70,ratio=Math.min(max/logo.width,max/logo.height);ctx.drawImage(logo,(c.width-logo.width*ratio)/2,michigan?36:515,logo.width*ratio,logo.height*ratio);texture.needsUpdate=true}
  logo.src=michigan?'/logos/umich.png':'/logos/ucb-seal.png'
  return texture
}
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
function surfaceGrain(){const t=canvasTexture((ctx,w,h)=>{const im=ctx.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,v=140+Math.sin(x*127.1+y*311.7)*30+Math.sin(y*.73+Math.sin(x*.41)*3)*8;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255}ctx.putImageData(im,0,0)},256,256);t.colorSpace=THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);return t}
function contactCardTexture(){return canvasTexture((ctx,w,h)=>{
  ctx.fillStyle='#fbf4e1';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#b7c1a7';ctx.lineWidth=1;for(let y=56;y<h;y+=40){ctx.beginPath();ctx.moveTo(25,y);ctx.lineTo(w-25,y);ctx.stroke()}
  ctx.textAlign='left';ctx.fillStyle='#2f3e32';ctx.font='bold 40px Georgia';ctx.fillText('WENYI YE',38,66);ctx.font='bold 23px Arial';ctx.fillText('CONTACT',38,130);ctx.font='22px Georgia';ctx.fillText('Quantitative Finance · AI · Product',38,183);ctx.font='bold 31px Georgia';ctx.fillText('ywywywy@berkeley.edu',38,265);ctx.font='19px Arial';ctx.fillText('EMAIL  ·  LINKEDIN  ·  GITHUB  ·  INSTAGRAM',38,358)
},768,448)}

export default function StudioScene(){
  const mount=useRef<HTMLDivElement>(null)
  const tooltip=useRef<HTMLDivElement>(null)
  const contactAction=useRef<((open:boolean)=>void)|null>(null)
  const contactDialog=useRef<HTMLDivElement>(null)
  const router=useRouter()
  const [status,setStatus]=useState<'loading'|'ready'|'fallback'>('loading')
  const [hover,setHover]=useState('')
  const [contactOpen,setContactOpen]=useState(false)
  const [contactIndex,setContactIndex]=useState(0)
  const openContact=()=>{setContactIndex(0);setContactOpen(true);contactAction.current?.(true)}
  const closeContact=()=>{setContactOpen(false);contactAction.current?.(false)}
  useEffect(()=>{if(!contactOpen)return;contactDialog.current?.focus();const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){setContactOpen(false);contactAction.current?.(false)}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[contactOpen])
  useEffect(()=>{
    const hash=window.location.hash.slice(1)
    if(['about','education','skills','experience','projects','awards','contact'].includes(hash))router.replace(`/classic#${hash}`)
  },[router])
  useEffect(()=>{
    const host=mount.current;if(!host)return
    let dirty=true
    let alive=true,frame=0,renderer:THREE.WebGLRenderer|undefined,scene:THREE.Scene|undefined,model:THREE.Group|undefined
    let observer:ResizeObserver|undefined,transition:ReturnType<typeof setTimeout>|undefined,environmentTarget:THREE.WebGLRenderTarget|undefined
    let composer:EffectComposer|undefined,outline:OutlinePass|undefined
    const interactive=new Map<THREE.Object3D,THREE.Group>()
    const poses=new Map<THREE.Group,{start:number;rotation:THREE.Euler}>()
    const highlight=(group?:THREE.Group)=>{
      if(!outline)return
      if(outline.selectedObjects[0]!==group){outline.selectedObjects=group?[group]:[];dirty=true}
    }
    const assembleInteractions=()=>{
      if(!model)return
      const groups=new Map<string,THREE.Object3D[]>()
      model.updateMatrixWorld(true)
      model.traverse(o=>{
        if(!(o instanceof THREE.Mesh))return
        let root:THREE.Object3D|null=o
        while(root&&!destinations[root.name]&&root.name!=='Mint pocket MP3')root=root.parent
        const name=o.name
        let key=root?.name
        if(key==='target_about')key='photo-'+(name.match(/(?:_|\.)(\d+)$/)?.[1]?.replace(/^0+(?=\d)/,'')??'0')
        if(key==='target_education')key='degree-'+(name.match(/_(\d+)$/)?.[1]??'0')
        if(key==='target_computer')key=/^(Keyboard|keyboard_label|Spacebar|Coiled keyboard)/.test(name)?'keyboard':/^Mouse/.test(name)?'mouse':'computer'
        if(!key&&name.startsWith('Bird of paradise'))key=/ceramic|soil/.test(name)?'planter':'plant'
        if(!key&&/^(Fountain pen|Pen band)/.test(name))key='pen'
        if(!key&&/^(Leather desk pad|Stitched mat)/.test(name))key='mat'
        if(!key&&/^(Desk |Tabletop|Drawer|Raised |Handle |Drop ring|Turned olive|Leg gilt|Fluted knee|Apron |Gilt drawer)/.test(name))key='desk'
        if(!key&&/^(Window stile|Window rail|Deep sash)/.test(name))key='window'
        if(!key)return
        const list=groups.get(key)??[];list.push(o);groups.set(key,list)
      })
      for(const [key,meshes] of Array.from(groups.entries())){
        const box=new THREE.Box3()
        meshes.forEach(o=>box.expandByObject(o))
        const group=new THREE.Group();group.name=key
        const pivot=box.getCenter(new THREE.Vector3())
        if(key.startsWith('photo-')||key.startsWith('degree-'))pivot.y=box.max.y
        if(key==='plant')pivot.y=box.min.y
        group.position.copy(pivot);model.add(group);group.updateMatrixWorld(true)
        for(const o of meshes){group.attach(o);interactive.set(o,group)}
        group.userData.destination=key.startsWith('photo-')?'target_about':key.startsWith('degree-')?'target_education':key
      }
    }
    const textures:THREE.Texture[]=[]
    const ownedMaterials:THREE.Material[]=[]
    const abort=new AbortController()
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
    const camera=new THREE.PerspectiveCamera(35,1,.1,50)
    const baseLook=new THREE.Vector3(.10,1.76,-.35),look=baseLook.clone()
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
      const hit=intersections.find(entry=>!entry.object.name.includes('Window prism caustic'));if(!hit)return null
      const object=interactive.get(hit.object)
      if(!object)return null
      const name=hit.object.name.toLowerCase()
      const target=object.userData.destination as string
      let route: {label:string;href:string}|undefined=destinations[target]
      if(object.name==='computer'){
        route=undefined
        if(name==='computer_screen'&&hit.uv){
          const x=hit.uv.x*768,y=hit.uv.y*532
          if(y>=165&&y<=307){
            if(Math.abs(x-192)<=74)route={label:'Alchemy · Play game',href:'/game'}
            if(Math.abs(x-576)<=74)route={label:'Afterglow · Play game',href:'/game/afterglow'}
          }
        }
      }
      let label=route?.label??''
      if(target==='target_education')label=object.name==='degree-0'?'University of Michigan · Education':'UC Berkeley · Education'
      else if(object.name==='computer'||object.name==='keyboard'||object.name==='mouse'){
        if(object.name==='mouse')label='Wired mouse'
        else if(object.name==='keyboard')label='Keyboard'
        else if(!route)label='Retro CRT computer'
      }else if(!route){
        if(/miniature|earbud|earphone|headphone|player/.test(name))label='Mint MP3 player'
        else if(name.includes('bird'))label='Bird of paradise · Strelitzia'
        else if(name.includes('plant')||name.includes('planter')||name.includes('soil'))label='Potted plant'
        else if(name.includes('shelf book'))label='Books'
        else if(name.includes('desk pad')||name.includes('mat edge'))label='Leather desk mat'
      }
      return {route,label:label||({pen:'Fountain pen',mat:'Leather desk mat',desk:'Antique writing desk',window:'Window'} as Record<string,string>)[object.name]||'Desk object',object}
    }
    const updateHover=(text:string,clickable=false)=>{if(hovered!==text){hovered=text;setHover(text)}if(renderer)renderer.domElement.style.cursor=clickable?'pointer':'grab'}
    contactAction.current=(open)=>{
      moving=open;updateHover('');highlight();pointer=null
      if(!open){focus=null;focusCamera=null;return}
      const target=Array.from(interactive.values()).find(o=>o.name==='target_contact')
      if(target&&!reduced){focus=new THREE.Box3().setFromObject(target).getCenter(new THREE.Vector3());focusCamera=camera.position.clone().lerp(focus,.69)}
    }
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
        if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>5){updateHover('');highlight()}
      }else if(e.pointerType==='mouse'){
        const x=(e.clientX-bounds.left)/bounds.width*2-1,y=(e.clientY-bounds.top)/bounds.height*2-1
        yaw=x*.065;pitch=-y*.035;const hit=choose(e);highlight(hit?.object);updateHover(hit?.label??'',Boolean(hit));positionTooltip(e)
      }
    }
    const down=(e:PointerEvent)=>{if(moving||e.button!==0)return;pointer={x:e.clientX,y:e.clientY,yaw:dragYaw,pitch:dragPitch};renderer?.domElement.setPointerCapture(e.pointerId)}
    const up=(e:PointerEvent)=>{
      const p=pointer;pointer=null;if(!p||moving||Math.hypot(e.clientX-p.x,e.clientY-p.y)>8)return
      const hit=choose(e);if(!hit)return
      highlight(hit.object)
      const animated=hit.object.name==='planter'?Array.from(interactive.values()).find(group=>group.name==='plant')??hit.object:hit.object
      const existing=poses.get(animated);poses.set(animated,{start:performance.now(),rotation:existing?.rotation??animated.rotation.clone()});dirty=true
      if(!hit.route)return
      const route=hit.route
      if(route.href==='#contact-card'){setContactIndex(0);setContactOpen(true);contactAction.current?.(true);return}
      if(route.href.startsWith('https:')){window.open(route.href,'_blank','noopener,noreferrer');updateHover('');return}
      moving=true;updateHover('')
      if(!reduced&&!hit.object.name.startsWith('photo-')){focus=new THREE.Box3().setFromObject(hit.object).getCenter(new THREE.Vector3());focusCamera=camera.position.clone().lerp(focus,.34)}
      const navigate=()=>router.push(route.href)
      transition=setTimeout(navigate,hit.object.name.startsWith('photo-')?1100:reduced?0:580)
    }
    const leave=()=>{if(!pointer&&!moving){yaw=pitch=0;updateHover('');highlight()}}
    const cancel=()=>{pointer=null}
    try {
      renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'})
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace
      renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94
      renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap
      renderer.shadowMap.autoUpdate=false
      renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.style.cursor='grab';host.appendChild(renderer.domElement)
      scene=new THREE.Scene();scene.background=new THREE.Color('#73644f')
      const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);environmentTarget=pmrem.fromScene(room,.04);scene.environment=environmentTarget.texture;scene.environmentIntensity=.37;room.dispose();pmrem.dispose()
      scene.add(new THREE.HemisphereLight('#e9effa','#796653',.65))
      // Spread the key across the window aperture to create a soft penumbra.
      for(const [x,y,z] of [[-5.5,4.9,1.6],[-5.5,3.9,1.6],[-5.5,4.9,.3],[-5.5,3.9,.3]]){
        const sunlight=new THREE.DirectionalLight('#fff1d8',.44);sunlight.position.set(x,y,z);sunlight.target.position.set(.1,1.3,-.3);sunlight.castShadow=true
        sunlight.shadow.mapSize.set(1024,1024);sunlight.shadow.camera.left=-5;sunlight.shadow.camera.right=5;sunlight.shadow.camera.top=5;sunlight.shadow.camera.bottom=-5;sunlight.shadow.normalBias=.012;sunlight.shadow.bias=-.00012;sunlight.shadow.radius=3;scene.add(sunlight,sunlight.target)
      }
      const fill=new THREE.DirectionalLight('#d1e2e4',.38);fill.position.set(4,4,5);scene.add(fill)
      composer=new EffectComposer(renderer)
      composer.addPass(new RenderPass(scene,camera))
      outline=new OutlinePass(new THREE.Vector2(host.clientWidth,host.clientHeight),scene,camera)
      outline.visibleEdgeColor.set('#ffe8ad');outline.hiddenEdgeColor.set('#ffe8ad');outline.edgeStrength=3;outline.edgeGlow=.55;outline.edgeThickness=1.2
      composer.addPass(outline);composer.addPass(new OutputPass())
      const resize=()=>{if(!renderer||!host.clientWidth||!host.clientHeight)return;dirty=true;aspect=host.clientWidth/host.clientHeight;camera.aspect=aspect;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);composer?.setSize(host.clientWidth,host.clientHeight)}
      observer=new ResizeObserver(resize);observer.observe(host);resize()
      const apply=(mesh:THREE.Mesh,texture:THREE.Texture,unlit=false)=>{
        dirty=true;textures.push(texture);const material=unlit?new THREE.MeshBasicMaterial({map:texture}):new THREE.MeshStandardMaterial({map:texture,roughness:.86});ownedMaterials.push(material);mesh.material=material
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
          const wood=woodTexture(),grain=surfaceGrain();textures.push(wood,grain)
          model.traverse(obj=>{
            if(!(obj instanceof THREE.Mesh))return
            obj.castShadow=!obj.name.includes('Garden beyond the window')&&!obj.name.includes('Window prism caustic');obj.receiveShadow=true
            const m=obj.material as THREE.MeshStandardMaterial
            if(m.name.includes('cast glass')||m.name.includes('blown glass')){
              const green=m.name.includes('emerald');const physical=m instanceof THREE.MeshPhysicalMaterial?m:new THREE.MeshPhysicalMaterial({name:m.name,color:m.color,roughness:m.roughness})
              physical.metalness=0;physical.transmission=.92;physical.ior=1.48;physical.thickness=green?.095:.018;physical.attenuationDistance=green?.38:.16;physical.attenuationColor.set(green?'#519143':'#ffb72d');physical.roughness=green?.21:.13;physical.envMapIntensity=1.15;physical.side=THREE.DoubleSide;physical.needsUpdate=true
              if(physical!==m){ownedMaterials.push(physical);obj.material=physical}obj.castShadow=false
            }
            if(m.name==='Brass'||m.name==='Cast bronze maiden'){m.metalness=1;m.roughness=.29;m.envMapIntensity=1.2;m.needsUpdate=true}
            if(m.name.startsWith('Botanical ')){m.bumpMap=grain;m.bumpScale=m.name.includes('leaf')?.0035:.0018;m.envMapIntensity=.55;m.needsUpdate=true}
            if(m.name==='Walnut'){m.map=wood;m.color.set('#ffffff');m.roughness=.53;m.needsUpdate=true}
            if(obj.geometry.attributes.uv&&['Walnut','Desk mat leather','Forest green cloth','Warm plaster','Ivory paper','Aged ABS plastic'].includes(m.name)){m.bumpMap=grain;m.bumpScale=m.name==='Warm plaster'?.014:m.name==='Desk mat leather'?.009:.004;m.needsUpdate=true}
            const name=obj.name
            if(name==='computer_screen'){apply(obj,screenTexture(),true);obj.castShadow=false}
            else if(name==='research_cover')apply(obj,bookTexture('#762d31','RESEARCH','PROJECTS & SKILLS'))
            else if(name==='resume_texture')apply(obj,resumeTexture())
            else if(name==='contact_card_texture')apply(obj,contactCardTexture())
            else if(name.startsWith('contact_tab_')){const i=Number(name.split('_').pop());apply(obj,canvasTexture((ctx,w,h)=>{ctx.fillStyle='#103e33';ctx.fillRect(0,0,w,h);title(ctx,contactCards[i]?.tab.toUpperCase()??'',w/2,h*.64,29,'#f3e5c7','Arial')},256,112))}
            else if(name.startsWith('degree_texture_'))apply(obj,degreeTexture(name.endsWith('0')))
          })
          assembleInteractions();dirty=true;scene!.add(model);renderer!.shadowMap.needsUpdate=true;setStatus('ready')
        }catch(e){if(alive)setStatus('fallback')}
      })()
      const animate=()=>{
        if(!alive||!renderer||!scene)return
        const radius=8.9*Math.max(1,1.5/aspect)
        const a=reduced?.035:THREE.MathUtils.clamp(.035+yaw+dragYaw,-.28,.28),b=reduced?0:THREE.MathUtils.clamp(pitch+dragPitch,-.15,.15)
        desired.set(Math.sin(a)*radius,3.86+(radius-8.9)*.19+Math.sin(b)*radius,Math.cos(a)*radius)
        const position=focusCamera??desired,target=focus??baseLook
        for(const [group,pose] of Array.from(poses.entries())){
          const t=Math.min(1,(performance.now()-pose.start)/1100)
          group.rotation.copy(pose.rotation)
          group.rotation.z+=Math.sin(t*Math.PI*4)*(1-t)*(group.name==='plant'?.145:group.name.startsWith('photo-')?.13:group.name==='desk'||group.name==='window'?.005:.04)
          renderer.shadowMap.needsUpdate=true
          dirty=true
          if(t===1){group.rotation.copy(pose.rotation);poses.delete(group)}
        }
        if(dirty || camera.position.distanceToSquared(position)>1e-7 || look.distanceToSquared(target)>1e-7){
          camera.position.lerp(position,reduced?1:.085)
          look.lerp(target,reduced?1:.085);camera.lookAt(look)
          if(composer&&outline?.selectedObjects.length)composer.render();else renderer.render(scene,camera);dirty=false
        }
        frame=requestAnimationFrame(animate)
      }
      camera.position.set(.31,3.86,8.9);animate()
      const canvas=renderer.domElement;canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointerleave',leave);canvas.addEventListener('pointercancel',cancel)
    }catch{setStatus('fallback')}
    return()=>{alive=false;contactAction.current=null;abort.abort();cancelAnimationFrame(frame);if(transition)clearTimeout(transition);observer?.disconnect();scene?.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();const mats=Array.isArray(obj.material)?obj.material:[obj.material];mats.forEach(m=>m.dispose())}});textures.forEach(t=>t.dispose());ownedMaterials.forEach(m=>m.dispose());environmentTarget?.dispose();outline?.dispose();composer?.dispose();renderer?.dispose();renderer?.domElement.remove()}
  },[router])

  return <main className="studio-home" data-status={status}>
    <header className="studio-nav studio-accessible" data-allow-overflow><button className="studio-contact-link" onClick={openContact} type="button">Contact</button></header>
    <div className="studio-stage" data-status={status}>
      <div className="studio-render" ref={mount}/>
      {status==='loading'&&<p className="studio-state" role="status">Opening the studio…</p>}
      {status==='fallback'&&<p className="studio-state">The 3D studio is unavailable on this device. All sections are available below.</p>}
      <div ref={tooltip} className={`studio-object-tooltip${hover?' is-visible':''}`} role="tooltip" aria-hidden={!hover}>{hover}</div>
      {contactOpen&&<div className="contact-backdrop" onClick={closeContact}><div className="contact-index-dialog" role="dialog" aria-modal="true" aria-label="Wenyi Ye contact cards" tabIndex={-1} ref={contactDialog} onClick={e=>e.stopPropagation()}>
        <button type="button" className="contact-dismiss" onClick={closeContact}>← Back to desk</button>
        <div className="contact-tabs" role="tablist" aria-label="Contact channels">{contactCards.map((card,i)=><button type="button" role="tab" aria-selected={i===contactIndex} key={card.tab} onClick={()=>setContactIndex(i)}>{card.tab}</button>)}</div>
        <div className="contact-card" role="tabpanel"><div className="contact-card-heading"><span>WENYI YE</span><span>{contactIndex+1} / {contactCards.length}</span></div><h2>{contactCards[contactIndex].tab}</h2><p>{contactCards[contactIndex].hint}</p><a href={contactCards[contactIndex].href} target={contactIndex===0?undefined:'_blank'} rel="noopener noreferrer">{contactCards[contactIndex].value}</a><div className="contact-card-rule"/></div>
        <p className="contact-exit-hint">Press Esc or click outside to return</p>
      </div></div>}
    </div>
    <nav className="studio-index" aria-label="Portfolio sections" data-allow-overflow><Link href="/classic#about">About</Link><Link href="/classic#education">Education</Link><Link href="/classic#experience">Experience</Link><Link href="/classic#projects">Projects</Link><Link href="/classic#skills">Skills</Link><Link href="/hobbies">Hobbies</Link><Link href="/game">Alchemy</Link><Link href="/game/afterglow">Afterglow</Link><button type="button" className="studio-contact-link" onClick={openContact}>Contact</button></nav>
  </main>
}
