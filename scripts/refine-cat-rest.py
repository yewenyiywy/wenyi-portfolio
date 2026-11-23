"""Match the reviewed sleep pose using the cat's existing anatomical skin weights."""
import bpy as b
import gzip, json, math, os, struct
import numpy as np
from mathutils import Matrix, Quaternion

root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
folder=os.path.join(root,'public/studio-model')
with open(os.path.join(folder,'cat-rig-v3.json')) as f:
    names=json.load(f)
raw=gzip.decompress(b''.join(open(os.path.join(folder,p),'rb').read() for p in names))
n,k=struct.unpack_from('<II',raw)
head=8+4*k+3*n
frames=np.frombuffer(raw,'<i2',offset=head).reshape(-1,n,3).copy()
stand=frames[20].astype(float)/32000
axis=np.array([[1,0,0],[0,0,1],[0,-1,0]])

def meshes():
    return sorted([o for o in b.context.scene.objects if o.type=='MESH'
        and o.name.startswith('GreyTabbyCat') and any(s in o.name for s in ['Body','Pupil','Sclera'])],key=lambda o:o.name)

for o in meshes():
    for m in list(o.modifiers):
        if m.type in ['PARTICLE_SYSTEM','SUBSURF']:o.modifiers.remove(m)
b.context.view_layer.update()
dg=b.context.evaluated_depsgraph_get()
objects=meshes()
sleep=np.concatenate([np.array([list(e.matrix_world@v.co) for v in e.data.vertices])@axis.T
                      for o in objects for e in [o.evaluated_get(dg)]])
assert len(sleep)==n
arm=next(o for o in b.data.objects if o.type=='ARMATURE')
# Read actual deform groups, not spatial guesses. The rigid eyes follow the head.
groups={}
offset=0
for o in objects:
    names={g.index:g.name for g in o.vertex_groups}
    for v in o.data.vertices:
        weights=[(names[g.group],g.weight) for g in v.groups if names[g.group].startswith('DEF_') and g.weight>1e-5]
        if not weights:weights=[('DEF_head',1)]
        tot=sum(w for _,w in weights)
        for name,w in weights:groups.setdefault(name,[]).append((offset+v.index,w/tot))
    offset+=len(o.data.vertices)
idx=np.array([i for i,w in groups['DEF_head']])
body=objects[0]
# Align the reviewed pose so its face points forward in the web coordinate system.
face=sleep[idx].mean(0);center=(sleep.min(0)+sleep.max(0))/2
yaw=math.atan2(face[0]-center[0],face[2]-center[2])
c,s=math.cos(-yaw),math.sin(-yaw)
sleep=sleep@np.array([[c,0,-s],[0,1,0],[s,0,c]])
sleep-=np.array([(sleep[:,0].min()+sleep[:,0].max())/2,sleep[:,1].min(),(sleep[:,2].min()+sleep[:,2].max())/2])
# Estimate rotation and translation of every actual weighted deform bone.
parts=[]
for name,items in groups.items():
    ids=np.array([i for i,w in items]);w=np.array([w for i,w in items]);wn=w/w.sum()
    a=stand[ids];d=sleep[ids]
    pivot=wn@a;target=wn@d
    u,_,v=np.linalg.svd(((a-pivot)*wn[:,None]).T@(d-target))
    sign=np.eye(3);sign[2,2]=np.linalg.det(v.T@u.T)
    rot=v.T@sign@u.T
    q=Matrix(rot.tolist()).to_quaternion()
    parts.append((ids,w,pivot,target,q))

def skin(t):
    out=np.zeros_like(stand)
    for ids,w,pivot,target,q in parts:
        r=np.array(Quaternion().slerp(q,t).to_matrix())
        xyz=(stand[ids]-pivot)@r.T+pivot*(1-t)+target*t
        out[ids]+=xyz*w[:,None]
    return out

# Correct the small skin-fitting error so the exact reviewed sleeping shape
# is reproduced. This corrective shape fades out as the skeleton straightens.
residual=sleep-skin(1)
print('SKIN_FIT_RMS',np.sqrt(np.mean(residual**2)))
for j in range(9):
    t=1-j/8
    p=skin(t)+residual*(t*t*(3-2*t))
    p[:,1]-=p[:,1].min()
    frames[12+j]=np.round(p*32000).astype('<i2')
print('SLEEP_WIDTH_HEIGHT_LENGTH',np.ptp(sleep,axis=0))
payload=gzip.compress(frames[12:21].tobytes(),compresslevel=7)
names=[]
for i,start in enumerate(range(0,len(payload),2200000)):
    name=f'cat-rig-v4-{i:02d}.bin'
    with open(os.path.join(folder,name),'wb') as f:f.write(payload[start:start+2200000])
    names.append(name)
with open(os.path.join(folder,'cat-rig-v4.json'),'w') as f:json.dump(names,f)
