import * as T from 'three'

// Blender armature samples: trot, resting-to-standing, descent, ascent.
const WALK=0, REST=12, STAND=20, DOWN=21, UP=30, FRAME_COUNT=39
const sleepingYaw=1.15
type Phase={kind:'rise'|'turn'|'down'|'walk'|'up'|'rest';from:T.Vector3;to:T.Vector3;yaw:number;duration:number}

export async function installCat(model:T.Group,signal:AbortSignal){
  async function load(name:string){
    const manifest=await fetch('/studio-model/'+name+'.json',{signal})
    if(!manifest.ok)throw Error('Cat animation unavailable')
    const parts=await manifest.json() as string[]
    const chunks=await Promise.all(parts.map(async part=>{
      const response=await fetch('/studio-model/'+part,{signal})
      if(!response.ok)throw Error('Cat animation unavailable')
      return response.arrayBuffer()
    }))
    const bytes=await new Blob(chunks).arrayBuffer()
    return new Uint8Array(bytes)[0]===31?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():bytes
  }
  const [raw,restingFrames]=await Promise.all([load('cat-rig-v3'),load('cat-rig-v4')])
  const header=new Uint32Array(raw,0,2),count=header[0],indices=header[1],offset=8+indices*4
  const index=new Uint32Array(raw,8,indices),colors=new Uint8Array(raw,offset,count*3)
  const frames=new Int16Array(raw.slice(offset+count*3)),size=count*3
  if(frames.length!==FRAME_COUNT*size)throw Error('Incomplete rig bake')
  if(restingFrames.byteLength!==9*size*2)throw Error('Incomplete sleeping animation')
  frames.set(new Int16Array(restingFrames),REST*size)
  const positions=new Float32Array(size),geometry=new T.BufferGeometry()
  geometry.setIndex(new T.BufferAttribute(index,1))
  geometry.setAttribute('color',new T.Uint8BufferAttribute(colors,3,true))
  geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage))
  const mesh=new T.Mesh(geometry,new T.MeshPhysicalMaterial({vertexColors:true,roughness:.92,sheen:.5,sheenColor:0x77736f}))
  mesh.castShadow=true;mesh.receiveShadow=true
  const group=new T.Group();group.name='Studio cat';group.add(mesh)
  const top=model.getObjectByName('Desk lacquered top'),crt=model.getObjectByName('CRT rear casing')
  if(!top||!crt)throw Error('Missing support surfaces')
  const desk=new T.Box3().setFromObject(top),tower=new T.Box3().setFromObject(crt)
  const rotated=new T.Vector3(),sleepBounds=new T.Box3()
  for(let i=0;i<size;i+=3){
    rotated.fromArray(frames,REST*size+i).divideScalar(32000).applyAxisAngle(new T.Vector3(0,1,0),sleepingYaw)
    sleepBounds.expandByPoint(rotated)
  }
  const extent=sleepBounds.getSize(new T.Vector3()),center=sleepBounds.getCenter(new T.Vector3())
  const scale=Math.min(.96*(tower.max.x-tower.min.x)/extent.x,.95*(tower.max.z-tower.min.z)/extent.z)
  group.scale.setScalar(scale)
  const home=tower.getCenter(new T.Vector3());home.y=tower.max.y+.021;home.x-=center.x*scale;home.z-=center.z*scale
  group.position.copy(home);group.rotation.y=sleepingYaw
  // The same root and physical scale are used for every frame.
  const strands=36000,hairs=new Float32Array(strands*6),hairColors=new Float32Array(strands*6),roots=new Uint32Array(strands)
  for(let i=0;i<strands;i++){
    roots[i]=index[((i*7919)%Math.floor(indices/3))*3]
    for(let j=0;j<6;j++)hairColors[6*i+j]=colors[roots[i]*3+j%3]/255*(j<3?.85:1.55)
  }
  const furGeometry=new T.BufferGeometry()
  furGeometry.setAttribute('position',new T.BufferAttribute(hairs,3).setUsage(T.DynamicDrawUsage))
  furGeometry.setAttribute('color',new T.BufferAttribute(hairColors,3))
  const fur=new T.LineSegments(furGeometry,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.6,depthWrite:false}))
  fur.frustumCulled=false;fur.raycast=()=>{};mesh.add(fur)
  // Whiskers are rooted in the actual cheek vertices and follow the local
  // head frame as the cat rolls or raises its head.
  const whiskerPositions=new Float32Array(12*4*6)
  const whiskerGeometry=new T.BufferGeometry()
  whiskerGeometry.setAttribute('position',new T.BufferAttribute(whiskerPositions,3).setUsage(T.DynamicDrawUsage))
  const whiskers=new T.LineSegments(whiskerGeometry,new T.LineBasicMaterial({color:0xe7dfd3,transparent:true,opacity:.82}))
  whiskers.frustumCulled=false;whiskers.raycast=()=>{};mesh.add(whiskers)
  const cheekL=new T.Vector3(),cheekR=new T.Vector3(),nose=new T.Vector3(),headTop=new T.Vector3(),sideAxis=new T.Vector3(),frontAxis=new T.Vector3(),upAxis=new T.Vector3(),origin=new T.Vector3(),point=new T.Vector3(),previous=new T.Vector3()
  function pose(a:number,b:number,t:number,pitch=0){
    let min=Infinity
    const c=Math.cos(pitch),s=Math.sin(pitch)
    for(let i=0;i<size;i+=3){
      const x=T.MathUtils.lerp(frames[a*size+i],frames[b*size+i],t)/32000
      const y=T.MathUtils.lerp(frames[a*size+i+1],frames[b*size+i+1],t)/32000
      const z=T.MathUtils.lerp(frames[a*size+i+2],frames[b*size+i+2],t)/32000
      positions[i]=x;positions[i+1]=c*y-s*z;positions[i+2]=s*y+c*z
      min=Math.min(min,positions[i+1])
    }
    for(let i=1;i<size;i+=3)positions[i]-=min
    geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere()
    const normal=geometry.attributes.normal.array
    for(let i=0;i<strands;i++)for(let j=0;j<3;j++){
      const k=roots[i]*3+j;hairs[i*6+j]=positions[k];hairs[i*6+3+j]=positions[k]+normal[k]*(.0024+.0018*((i*37)%101)/100)
    }
    furGeometry.attributes.position.needsUpdate=true
    cheekL.fromArray(positions,38689*3);cheekR.fromArray(positions,16668*3)
    sideAxis.subVectors(cheekR,cheekL).normalize()
    nose.fromArray(positions,44163*3);headTop.fromArray(positions,19423*3)
    frontAxis.copy(nose).sub(point.copy(cheekL).lerp(cheekR,.5)).normalize()
    upAxis.subVectors(headTop,nose).addScaledVector(sideAxis,-headTop.clone().sub(nose).dot(sideAxis)).normalize()
    let cursor=0
    for(const sign of [-1,1])for(let w=0;w<6;w++){
      const root=(sign<0?[38689,37784,22905]:[16668,15763,884])[w%3]
      origin.fromArray(positions,root*3);previous.copy(origin)
      for(let segment=1;segment<=4;segment++){
        const t=segment/4
        point.copy(origin).addScaledVector(sideAxis,sign*(.035+.008*(w%3))*t)
          .addScaledVector(frontAxis,(.009+.003*(w%3))*t)
          .addScaledVector(upAxis,(w-2.5)*.003*t-.004*t*t)
        whiskerPositions.set(previous.toArray(),cursor);whiskerPositions.set(point.toArray(),cursor+3);cursor+=6;previous.copy(point)
      }
    }
    whiskerGeometry.attributes.position.needsUpdate=true
  }
  function sample(first:number,last:number,t:number,pitch=0){
    const f=T.MathUtils.clamp(t,0,1)*(last-first),a=Math.floor(f)
    pose(first+a,Math.min(last,first+a+1),f-a,pitch)
  }
  pose(REST,REST,0)
  // Collision bounds are in the same coordinates as the current main scene.
  const obstacles:T.Box3[]=[]
  model.traverse(o=>{
    if(!(o instanceof T.Mesh)||o===top||/prism caustic|Leather desk pad|Stitched mat|CRT top vent/i.test(o.name))return
    const box=new T.Box3().setFromObject(o)
    if(box.max.y>desk.max.y+.012&&box.min.y<home.y+scale*.35)obstacles.push(box)
  })
  // Narrow tail and head sections should not block passages as if they
  // occupied the whole width of the shoulders.
  const sections=new Map<number,T.Box3>()
  for(let f=0;f<FRAME_COUNT;f++){
    if(f>=REST&&f<STAND)continue
    for(let i=0;i<size;i+=3){
      rotated.fromArray(frames,f*size+i).divideScalar(32000).multiplyScalar(scale)
      const key=Math.floor(rotated.z/.14)
      let box=sections.get(key)
      if(!box){box=new T.Box3();sections.set(key,box)}
      box.expandByPoint(rotated)
    }
  }
  function clear(p:T.Vector3,yaw:number,inAir=false){
    const s=Math.sin(yaw),c=Math.cos(yaw)
    for(const section of Array.from(sections.values())){
      const mid=section.getCenter(new T.Vector3()),extent=section.getSize(new T.Vector3())
      const halfWidth=extent.x/2+.018,halfLength=extent.z/2+.018
      const cx=p.x+c*mid.x+s*mid.z,cz=p.z-s*mid.x+c*mid.z
      const hx=Math.abs(c)*halfWidth+Math.abs(s)*halfLength,hz=Math.abs(s)*halfWidth+Math.abs(c)*halfLength
      if(!inAir&&section.min.y<.05&&(cx-hx<desk.min.x||cx+hx>desk.max.x||cz-hz<desk.min.z||cz+hz>desk.max.z))return false
      for(const box of obstacles){
        if(box.max.y<=p.y+Math.max(.008,section.min.y)||box.min.y>=p.y+section.max.y+.04)continue
        if(inAir&&box.intersectsBox(tower)&&box.max.y<=home.y+.015)continue
        const x=(box.min.x+box.max.x)/2-cx,z=(box.min.z+box.max.z)/2-cz
        const bx=(box.max.x-box.min.x)/2,bz=(box.max.z-box.min.z)/2
        if(Math.abs(x)>hx+bx||Math.abs(z)>hz+bz)continue
        if(Math.abs(c*x-s*z)>halfWidth+Math.abs(c)*bx+Math.abs(s)*bz)continue
        if(Math.abs(s*x+c*z)>halfLength+Math.abs(s)*bx+Math.abs(c)*bz)continue
        return false
      }
    }
    return true
  }
  // Short departure from the edge followed by an accelerating descent.
  function trajectory(a:T.Vector3,b:T.Vector3,t:number){
    const down=a.y>b.y,u=down?t:1-t,high=down?a:b,low=down?b:a
    const p=high.clone().lerp(low,u)
    p.y=high.y+(low.y-high.y)*u*u
    return p
  }
  let phases:Phase[]=[],step=0,elapsed=0,last=0,initialYaw=sleepingYaw
  let restingPoint=home.clone(),restingYaw=sleepingYaw,onCRT=true
  function plan(){
    let best:{edge:T.Vector3;land:T.Vector3;end:T.Vector3;yaw:number;returnSafe:boolean}|undefined
    for(let k=0;k<72;k++){
      const yaw=k*Math.PI/36,dir=new T.Vector3(Math.sin(yaw),0,Math.cos(yaw))
      const edge=home.clone().addScaledVector(dir,.12)
      for(let reach=1.1;reach<=3;reach+=.10){
        const land=edge.clone().addScaledVector(dir,reach);land.y=desk.max.y+.018
        if(!clear(land,yaw))continue
        if(Array.from({length:41},(_,i)=>trajectory(edge,land,i/40)).some(p=>!clear(p,yaw,true)))continue
        for(let length=.15;length<1.5;length+=.15){
          const end=land.clone().addScaledVector(dir,length)
          if(!clear(end,yaw))break
          const turnIsClear=Array.from({length:19},(_,i)=>yaw+i*Math.PI/18).every(angle=>clear(end,angle))
          if(!best||(turnIsClear&&!best.returnSafe)||(turnIsClear===best.returnSafe&&length>best.land.distanceTo(best.end)))best={edge,land,end,yaw,returnSafe:turnIsClear}
        }
      }
    }
    return best
  }
  function wake(){
    if(phases.length)return
    const route=onCRT?plan():undefined
    const add=(kind:Phase['kind'],from:T.Vector3,to:T.Vector3,yaw:number,duration:number)=>phases.push({kind,from,to,yaw,duration})
    add('rise',restingPoint,restingPoint,restingYaw,1.35)
    if(route){
      const {edge,land,end,yaw}=route
      add('turn',home,edge,yaw,.7)
      add('down',edge,land,yaw,.58)
      add('walk',land,end,yaw,Math.max(.6,land.distanceTo(end)/(.40*scale)))
      if(route.returnSafe){
        add('turn',end,end,yaw+Math.PI,.65)
        add('walk',end,land,yaw+Math.PI,Math.max(.6,land.distanceTo(end)/(.40*scale)))
        add('up',land,edge,yaw+Math.PI,.70)
        add('turn',edge,home,sleepingYaw,.7)
      }else{
        restingPoint=end.clone();restingYaw=yaw;onCRT=false
      }
    }
    add('rest',restingPoint,restingPoint,restingYaw,1.4)
    step=0;elapsed=0;last=0;initialYaw=group.rotation.y
  }
  function tick(now:number){
    if(!phases.length||last&&now-last<26)return false
    elapsed+=last?Math.min(.08,(now-last)/1000):0;last=now
    const part=phases[step],t=Math.min(1,elapsed/part.duration),smooth=t*t*(3-2*t)
    group.position.lerpVectors(part.from,part.to,smooth)
    const delta=Math.atan2(Math.sin(part.yaw-initialYaw),Math.cos(part.yaw-initialYaw))
    group.rotation.y=initialYaw+delta*smooth
    if(part.kind==='rise'||part.kind==='rest')sample(REST,STAND,part.kind==='rise'?smooth:1-smooth)
    else if(part.kind==='turn')pose(STAND,STAND,0)
    else if(part.kind==='walk'){
      const f=t*Math.max(1,Math.round(part.from.distanceTo(part.to)/(.4*scale)))*12
      const a=Math.floor(f)%12;pose(WALK+a,WALK+(a+1)%12,f%1)
    }else{
      // Separate anticipation, ballistic descent and joint-driven absorption.
      const u=T.MathUtils.clamp((t-.27)/.45,0,1)
      group.position.copy(trajectory(part.from,part.to,u))
      const pitch=(part.kind==='down'?1:-1)*Math.sin(Math.PI*u)*.62
      const first=part.kind==='down'?DOWN:UP
      sample(first,first+8,t,pitch)
    }
    if(t===1){
      elapsed=0;initialYaw=group.rotation.y
      if(++step===phases.length){phases=[];group.position.copy(restingPoint);group.rotation.y=restingYaw;pose(REST,REST,0)}
    }
    return true
  }
  return {group,mesh,wake,tick,plan,get awake(){return phases.length>0}}
}
