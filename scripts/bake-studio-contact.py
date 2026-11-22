"""Bake stable contact occlusion from real Blender geometry, without decals."""
import bpy, math, struct, zlib
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

out=Path(__file__).resolve().parent.parent/'public'/'studio-surfaces'
out.mkdir(exist_ok=True)
deps=bpy.context.evaluated_depsgraph_get()
verts=[]; triangles=[]
excluded=('Exterior ', 'Papered ', 'Plaster ceiling', 'Continuous ', 'Window prism caustic', 'Sheer curtain')
for obj in bpy.context.scene.objects:
    if obj.type!='MESH' or obj.name.startswith(excluded):continue
    ev=obj.evaluated_get(deps);mesh=ev.to_mesh()
    if not mesh:continue
    mesh.calc_loop_triangles();start=len(verts)
    verts.extend([ev.matrix_world@v.co for v in mesh.vertices])
    triangles.extend(tuple(start+i for i in t.vertices) for t in mesh.loop_triangles)
    ev.to_mesh_clear()
tree=BVHTree.FromPolygons(verts,triangles,all_triangles=True)
print(f'Contact bake: {len(triangles)} triangles',flush=True)

def png(path,pixels):
    h,w=pixels.shape
    def chunk(key,data):return struct.pack('>I',len(data))+key+data+struct.pack('>I',zlib.crc32(key+data)&0xffffffff)
    raw=b''.join(b'\0'+row.tobytes() for row in pixels)
    path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,0,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b''))

def bake(name,w,h,origin,u,v,normal,distance,window_shadow=False):
    origin=Vector(origin);u=Vector(u);v=Vector(v);normal=Vector(normal)
    uh=u.normalized();vh=v.normalized();n=24
    directions=[]
    for i in range(n):
        radius=math.sqrt((i+.5)/n);a=i*2.399963229728653
        directions.append((uh*(radius*math.cos(a))+vh*(radius*math.sin(a))+normal*math.sqrt(1-radius*radius)).normalized())
    image=np.ones((h,w),np.float32)
    for y in range(h):
        for x in range(w):
            point=origin+u*((x+.5)/w)+v*((y+.5)/h)
            occlusion=0.
            for direction in directions:
                _,_,_,hit=tree.ray_cast(point,direction,distance)
                if hit is not None:occlusion+=(1-hit/distance)**1.4
            value=max(.24,1-.83*occlusion/n)
            if window_shadow:
                # Trace actual desk geometry toward a broad window aperture.
                blocked=0
                for wy in (-1.1,-.05,1.1):
                    for wz in (2.0,3.1,4.2):
                        delta=Vector((-3.85,wy,wz))-point
                        _,_,_,hit=tree.ray_cast(point,delta.normalized(),delta.length-.02)
                        blocked+=hit is not None
                value*=1-.43*blocked/9
            image[y,x]=value
    p=np.pad(image,1,mode='edge');image=(p[:-2,:-2]+2*p[:-2,1:-1]+p[:-2,2:]+2*p[1:-1,:-2]+4*p[1:-1,1:-1]+2*p[1:-1,2:]+p[2:,:-2]+2*p[2:,1:-1]+p[2:,2:])/16
    png(out/(name+'.png'),np.uint8(np.clip(image*255,0,255)))
    print(f'{name} {w}x{h}, minimum {image.min():.3f}',flush=True)

# Image rows advance with Three.js Z; PNG textures are loaded flipY=false.
bake('desk-contact',640,320,(-3.7,1.65,1.344),(7.4,0,0),(0,-3.5,0),(0,0,1),.72)
bake('mat-contact',384,192,(-1.225,-.39,1.370),(2.95,0,0),(0,-1.30,0),(0,0,1),.35)
bake('wall-contact',512,256,(-3.8,2.266,1.45),(7.6,0,0),(0,0,3.6),(0,-1,0),.45)
bake('floor-contact',512,320,(-4,2.27,-1.345),(8.5,0,0),(0,-7,0),(0,0,1),.75,True)
