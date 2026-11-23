import * as T from 'three'

import riseRegions from './cat-rise-regions.json'

type Point = T.Vector3
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
  // Broaden the ribcage and haunches in model space. The mask follows vertex identity across poses.
  const frameSize=count*3
  for(let i=0;i<frameSize;i+=3){
    const z=frames[frameSize+i+2]/32000, y=frames[frameSize+i+1]/32000
    const torso=Math.exp(-Math.pow((z+.01)/.135,4))*T.MathUtils.smoothstep(y,.035,.115)
    for(let f=0;f<16;f++){
      const at=f*frameSize+i
      frames[at]*=1+(f===0?.14:.46)*torso
      frames[at+1]*=1+(f===0?.19:.06)*torso
    }
  }
  // Interpolate each part in its rotating local frame. Straight vertex blends collapse
  // the neck and ribcage halfway between the curled and upright silhouettes.
  const rise=Array.from({length:7},()=>new Int16Array(frameSize))
  const regions=riseRegions.map(values=>{
    const pivot=new T.Vector3().fromArray(values,3),end=new T.Vector3().fromArray(values,6)
    const q=new T.Quaternion().fromArray(values,9).normalize(),inverse=q.clone().invert()
    const matrices=rise.map((_,j)=>{
      const t=(j+1)/8,turn=new T.Quaternion().slerp(q,t)
      return [new T.Matrix4().makeRotationFromQuaternion(turn),new T.Matrix4().makeRotationFromQuaternion(turn.clone().multiply(inverse))]
    })
    return {center:new T.Vector3().fromArray(values),pivot,end,matrices}
  })
  const a=new T.Vector3(),b=new T.Vector3(),v=new T.Vector3(),u=new T.Vector3()
  for(let i=0;i<frameSize;i+=3){
    a.fromArray(frames,i).divideScalar(32000);b.fromArray(frames,i+frameSize).divideScalar(32000)
    // Neighbouring regions overlap so the skin remains continuous at their borders.
    const weights=regions.map(r=>Math.exp(-b.distanceToSquared(r.center)/.001225))
    const total=weights.reduce((sum,w)=>sum+w,0)
    for(let j=0;j<7;j++){
      const t=(j+1)/8;let x=0,y=0,z=0
      regions.forEach((r,k)=>{
        const w=weights[k]/total
        if(w<.00001)return
        v.copy(a).sub(r.pivot).applyMatrix4(r.matrices[j][0]).add(r.pivot)
        u.copy(b).sub(r.end).applyMatrix4(r.matrices[j][1]).add(r.end)
        v.lerp(u,t);x+=w*v.x;y+=w*v.y;z+=w*v.z
      })
      rise[j][i]=Math.round(x*32000);rise[j][i+1]=Math.round(Math.max(0,y)*32000);rise[j][i+2]=Math.round(z*32000)
    }
  }
  const poses=[...Array.from({length:16},(_,i)=>frames.subarray(i*frameSize,(i+1)*frameSize)),...rise]
  const positions=new Float32Array(count*3)
  const geometry=new T.BufferGeometry()
  geometry.setIndex(new T.BufferAttribute(index,1))
  geometry.setAttribute('color',new T.Uint8BufferAttribute(colors,3,true))
  geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage))
  const mesh=new T.Mesh(geometry,new T.MeshPhysicalMaterial({vertexColors:true,roughness:.94,sheen:.45,sheenColor:0x8b8885}))
  mesh.castShadow=true;mesh.receiveShadow=true
  const group=new T.Group();group.name='Studio cat';group.add(mesh)
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
    for(let i=0;i<n;i++)positions[i]=(poses[a][i]*(1-t)+poses[b][i]*t)/32000
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
  // The curled silhouette should occupy almost the full width of the CRT.
  let left=Infinity,right=-Infinity,radius=0
  for(let i=0;i<frameSize;i+=3){
    left=Math.min(left,poses[0][i+2]/32000);right=Math.max(right,poses[0][i+2]/32000)
    for(let p=1;p<16;p++)radius=Math.max(radius,Math.hypot(poses[p][i],poses[p][i+2])/32000)
  }
  const scale=(tower.max.x-tower.min.x)*.96/(right-left)
  const clearance=radius*scale+.025,stride=.40*scale,speed=stride/1.05
  group.scale.setScalar(scale)
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
    if(b.max.y<=p.y+.008||b.min.y>p.y+.30*scale)return false
    return Math.hypot(Math.max(b.min.x-p.x,0,p.x-b.max.x),Math.max(b.min.z-p.z,0,p.z-b.max.z))<clearance
  })
  function arc(a:Point,b:Point,t:number){
    const descending=a.y>b.y
    const u=descending?t:1-t, top=descending?a:b, bottom=descending?b:a
    const p=top.clone().lerp(bottom,u)
    p.y=top.y+(bottom.y-top.y)*u*u+2.8*u*(1-u)
    return p
  }
  function plan(){
    let best:Point[]=[]
    for(let reach=1.35;reach<=3.30;reach+=.10)for(let k=0;k<96;k++){
      const angle=k*Math.PI/48
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
  let elapsed=0,step=0,distance=0,last=0,walkStride=stride
  let restingSince=0
  type Phase={from:Point,to:Point,kind:'rise'|'walk'|'jump'|'rest',duration:number}
  let phases:Phase[]=[]
  function wake(){
    if(phases.length)return
    const path=plan()
    if(path.length<2){restingSince=performance.now();return}
    const landing=path[0],loop=path.concat(path.slice(0,-1).reverse())
    const phase=(from:Point,to:Point,kind:Phase['kind'],duration:number)=>({from,to,kind,duration})
    phases=[phase(home,home,'rise',1.1),phase(home,landing,'jump',.78)]
    for(let i=1;i<loop.length;i++)phases.push(phase(loop[i-1],loop[i],'walk',loop[i].distanceTo(loop[i-1])/speed))
    const travel=phases.filter(p=>p.kind==='walk').reduce((sum,p)=>sum+p.from.distanceTo(p.to),0)
    walkStride=travel/Math.max(1,Math.round(travel/stride))
    phases.push(phase(landing,home,'jump',.88),phase(home,home,'rest',1.15))
    elapsed=step=distance=last=0
  }
  function tick(now:number){
    if(!phases.length){
      // A sleeping cat remains grounded. A click stirs its breathing briefly.
      if(last&&now-last<90)return false
      last=now
      const stirred=restingSince?Math.max(0,1-(now-restingSince)/1800):0
      const breath=(.5+.5*Math.sin(now/580))*(.014+.012*stirred)
      mesh.scale.y=1+breath
      return true
    }
    mesh.scale.y=1
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
      else {group.position.lerpVectors(part.from,part.to,t);const covered=distance+t*part.from.distanceTo(part.to);const f=(covered/walkStride*12)%12;pose(1+Math.floor(f),1+(Math.floor(f)+1)%12,f%1)}
    }else {
      const u=t*t*(3-2*t),progress=(part.kind==='rise'?u:1-u)*8
      const keys=[0,16,17,18,19,20,21,22,1],j=Math.min(7,Math.floor(progress))
      pose(keys[j],keys[j+1],progress-j)
      if(part.kind==='rest'){
        const delta=Math.atan2(Math.sin(Math.PI/2-group.rotation.y),Math.cos(Math.PI/2-group.rotation.y))
        group.rotation.y+=T.MathUtils.clamp(delta,-dt*4,dt*4)
      }
    }
    if(t===1){if(part.kind==='walk')distance+=part.from.distanceTo(part.to);elapsed=0;if(++step===phases.length){phases=[];group.rotation.y=Math.PI/2}}
    return true
  }
  return {group,mesh,wake,tick,plan,get awake(){return phases.length>0}}
}
