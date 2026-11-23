import * as T from 'three'

type Point = T.Vector3
const scale = 1.16, stride = .40 * scale, speed = stride / .72
// The walking mesh, including its tail, stays inside this swept circle at every heading.
const clearance = .35
export async function installCat(model:T.Group, signal:AbortSignal) {
  const response=await fetch('/studio-model/cat.bin.gz',{signal})
  if(!response.ok)throw Error('Cat model unavailable')
  const bytes=await response.arrayBuffer()
  const buf=new Uint8Array(bytes)[0]===31?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():bytes
  const header=new Uint32Array(buf,0,2),count=header[0],indices=header[1]
  const index=new Uint32Array(buf,8,indices), start=8+indices*4
  const colors=new Uint8Array(buf,start,count*3)
  const frames=new Int16Array(buf.slice(start+count*3))
  if(frames.length!==16*count*3)throw Error('Incomplete cat animation')
  const positions=new Float32Array(count*3)
  const geometry=new T.BufferGeometry()
  geometry.setIndex(new T.BufferAttribute(index,1))
  geometry.setAttribute('color',new T.Uint8BufferAttribute(colors,3,true))
  geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage))
  const mesh=new T.Mesh(geometry,new T.MeshPhysicalMaterial({vertexColors:true,roughness:.94,sheen:.45,sheenColor:0x8b8885}))
  mesh.castShadow=true;mesh.receiveShadow=true
  const group=new T.Group();group.name='Studio cat';group.scale.setScalar(scale);group.add(mesh)
  // Short guard hairs follow the animated skin at their roots.
  const strands=8500,roots=new Uint32Array(strands),tips=new Uint32Array(strands)
  const hairs=new Float32Array(strands*6),hairColors=new Float32Array(strands*6)
  for(let i=0;i<strands;i++){
    const face=((i*7919)%Math.floor(indices/3))*3
    roots[i]=index[face];tips[i]=index[face+1]
    for(let j=0;j<6;j++)hairColors[6*i+j]=colors[3*roots[i]+j%3]/255*(j<3?.84:1.30)
  }
  const furGeometry=new T.BufferGeometry()
  furGeometry.setAttribute('position',new T.BufferAttribute(hairs,3).setUsage(T.DynamicDrawUsage))
  furGeometry.setAttribute('color',new T.BufferAttribute(hairColors,3))
  const fur=new T.LineSegments(furGeometry,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.55,depthWrite:false}))
  fur.frustumCulled=false;fur.raycast=()=>{};mesh.add(fur)
  function pose(a:number,b:number,t:number){
    const n=positions.length
    for(let i=0;i<n;i++)positions[i]=(frames[a*n+i]*(1-t)+frames[b*n+i]*t)/32000
    geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
    const normals=geometry.attributes.normal.array
    for(let i=0;i<strands;i++){
      const root=roots[i]*3,edge=tips[i]*3
      for(let j=0;j<3;j++){
        const v=positions[root+j]
        hairs[i*6+j]=v
        hairs[i*6+3+j]=v+normals[root+j]*.0017+(positions[edge+j]-v)*.12
      }
    }
    furGeometry.attributes.position.needsUpdate=true
  }
  const bounds=(o:T.Object3D)=>new T.Box3().setFromObject(o)
  const top=model.getObjectByName('Desk lacquered top'),crt=model.getObjectByName('CRT rear casing')
  if(!top||!crt)throw Error('Missing cat support surfaces')
  const desk=bounds(top),tower=bounds(crt),home=tower.getCenter(new T.Vector3())
  home.y=tower.max.y+.02
  group.position.copy(home);group.rotation.y=Math.PI/2;pose(0,0,0)
  const obstacles:T.Box3[]=[]
  model.traverse(o=>{
    if(!(o instanceof T.Mesh)||o===top||/prism caustic|Leather desk pad|Stitched mat/i.test(o.name))return
    const box=bounds(o)
    if(box.max.y<=desk.max.y+.009||box.min.y>home.y+.5)return
    obstacles.push(box)
  })
  const clear=(p:Point,air=false)=>p.x>desk.min.x+clearance&&p.x<desk.max.x-clearance&&p.z>desk.min.z+clearance&&p.z<desk.max.z-clearance&&!obstacles.some(b=>{
    if(air&&b.intersectsBox(tower)&&b.max.y<=home.y+.015)return false
    if(b.max.y<=p.y+.008||b.min.y>p.y+.40)return false
    return Math.hypot(Math.max(b.min.x-p.x,0,p.x-b.max.x),Math.max(b.min.z-p.z,0,p.z-b.max.z))<clearance
  })
  const arc=(a:Point,b:Point,t:number)=>a.clone().lerp(b,t).addScaledVector(new T.Vector3(0,1,0),4*t*(1-t)*.72)
  function plan(){
    let best:Point[]=[]
    for(const reach of [1.30,1.55,1.8,2.05,2.30,2.55])for(let k=0;k<48;k++){
      const angle=k*Math.PI/24
      const land=home.clone().add(new T.Vector3(reach*Math.cos(angle),0,reach*Math.sin(angle)));land.y=desk.max.y+.012
      if(!clear(land))continue
      if(Array.from({length:31},(_,i)=>arc(home,land,i/30)).some(p=>!clear(p,true)))continue
      const nodes=[{p:land,x:0,z:0,parent:-1}],seen=new Set(['0,0'])
      for(let i=0;i<nodes.length;i++)for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1]]){
        const prev=nodes[i],x=prev.x+dx,z=prev.z+dz,key=x+','+z
        if(seen.has(key))continue
        const p=land.clone();p.x+=x*.14;p.z+=z*.14
        if(!clear(p)||!clear(p.clone().lerp(prev.p,.5)))continue
        seen.add(key);nodes.push({p,x,z,parent:i})
      }
      const route:Point[]=[]
      for(let i=nodes.length-1;i>=0;i=nodes[i].parent)route.unshift(nodes[i].p)
      if(route.length>best.length)best=route
    }
    return best
  }
  let elapsed=0,step=0,distance=0,last=0
  type Phase={from:Point,to:Point,kind:'rise'|'walk'|'jump'|'rest',duration:number}
  let phases:Phase[]=[]
  function wake(){
    if(phases.length)return
    const path=plan()
    if(path.length<2)return
    const landing=path[0],loop=path.concat(path.slice(0,-1).reverse())
    const phase=(from:Point,to:Point,kind:Phase['kind'],duration:number)=>({from,to,kind,duration})
    phases=[phase(home,home,'rise',1.1),phase(home,landing,'jump',.78)]
    for(let i=1;i<loop.length;i++)phases.push(phase(loop[i-1],loop[i],'walk',loop[i].distanceTo(loop[i-1])/speed))
    phases.push(phase(landing,home,'jump',.88),phase(home,home,'rest',1.15))
    elapsed=step=distance=last=0
  }
  function tick(now:number){
    if(!phases.length)return false
    if(last&&now-last<30)return false
    const dt=last?Math.min(.10,(now-last)/1000):0;last=now
    const part=phases[step];elapsed+=dt
    const t=Math.min(1,elapsed/part.duration)
    if(part.kind==='jump'||part.kind==='walk'){
      const yaw=Math.atan2(part.to.x-part.from.x,part.to.z-part.from.z)
      const delta=Math.atan2(Math.sin(yaw-group.rotation.y),Math.cos(yaw-group.rotation.y))
      group.rotation.y+=T.MathUtils.clamp(delta,-dt*10,dt*10)
      if(part.kind==='jump'){const u=T.MathUtils.clamp((t-.14)/.72,0,1)
        group.position.copy(arc(part.from,part.to,u))
        const keys=[1,13,14,15,1],times=[0,.14,.51,.86,1]
        const j=t<.14?0:t<.51?1:t<.86?2:3
        pose(keys[j],keys[j+1],(t-times[j])/(times[j+1]-times[j]))}
      else {group.position.lerpVectors(part.from,part.to,t);distance+=dt*speed;const f=(distance/stride*12)%12;pose(1+Math.floor(f),1+(Math.floor(f)+1)%12,f%1)}
    }else {
      const u=t*t*(3-2*t);pose(0,1,part.kind==='rise'?u:1-u)
    }
    if(t===1){elapsed=0;if(++step===phases.length){phases=[];group.rotation.y=Math.PI/2}}
    return true
  }
  return {group,mesh,wake,tick,plan,get awake(){return phases.length>0}}
}
