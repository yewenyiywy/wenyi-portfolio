"""Bake poses from the cat's existing Blender armature for the web renderer."""
import bpy as b
import gzip
import io
import json
import math
import numpy as np
import os
import struct
from mathutils import Matrix, Vector

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
a = next(o for o in b.data.objects if o.type == 'ARMATURE')
scene = b.context.scene
objects = sorted([o for o in scene.objects if o.type == 'MESH' and
                  o.name.startswith('GreyTabbyCat') and
                  any(s in o.name for s in ['Body', 'Pupil', 'Sclera'])],
                 key=lambda o:o.name)
body = b.data.objects['GreyTabbyCat_Body']
samples = []

def capture():
    b.context.view_layer.update()
    dg = b.context.evaluated_depsgraph_get()
    return np.concatenate([np.array([list(e.matrix_world @ v.co) for v in e.data.vertices])
                           for o in objects for e in [o.evaluated_get(dg)]])

def shift(name, delta):
    p = a.pose.bones[name]
    mat = p.matrix.copy()
    mat.translation += a.matrix_world.inverted().to_3x3() @ Vector(delta)
    p.matrix = mat
    b.context.view_layer.update()

def rest():
    for p in a.pose.bones:
        p.matrix_basis = Matrix.Identity(4)
    b.context.view_layer.update()

def resting(t):
    rest()
    # Move torso toward the planted feet; the rig solves both limb chains.
    shift('CTR_body_root_M', (0, 0, -.101*t))
    shift('CTR_body_root_B', (0, 0, -.042*t))
    for side,sign in [('L',1),('R',-1)]:
        shift('CTR_leg_f.'+side,(sign*.005*t,-.045*t,0))
        shift('CTR_leg_b.'+side,(sign*.008*t,-.038*t,0))
        for lid in ['u','d']:
            a.pose.bones['CTR_blink_'+lid+'.'+side].location.y=.01*t
    shift('CTR_head',(0,-.005*t,-.083*t))
    for n in 'abcdefg':
        p=a.pose.bones['CTR_tail_'+n]
        p.rotation_mode='XYZ'
        p.rotation_euler.x=.29*t
        p.rotation_euler.z=.22*t
    b.context.view_layer.update()

def leap(t, direction):
    rest()
    # A distinct descent and ascent, with ground-contact poses at either end.
    crouch=math.sin(math.pi*min(1,t/.23)) if t<.23 else 0
    airborne=math.sin(math.pi*max(0,min(1,(t-.20)/.60)))
    landing=math.sin(math.pi*max(0,min(1,(t-.63)/.37)))
    shift('CTR_body_root_M',(0,0,-.043*crouch-.048*landing))
    shift('CTR_body_root_F',(0,-.008*airborne,direction*.035*airborne-.028*landing))
    for side in ['L','R']:
        shift('CTR_leg_f.'+side,(0,-.064*airborne-.018*landing,.013*airborne+max(0,direction)*.035*airborne))
        shift('CTR_leg_b.'+side,(0,.037*airborne,.070*airborne+.020*landing))
    shift('CTR_head',(0,-.011*airborne,.008*airborne))

for o in objects:
    for m in list(o.modifiers):
        if m.type in ['PARTICLE_SYSTEM','SUBSURF']:
            o.modifiers.remove(m)
# Give the ribcage volume in the rest mesh before skinning it. This keeps
# the body mass consistent through all of the bone-driven poses.
for key in body.data.shape_keys.key_blocks:
    for v in key.data:
        x,y,z=v.co
        weight=math.exp(-((y-.01)/.115)**4)*max(0,min(1,(z-.045)/.09))
        v.co.x=x*(1+.34*weight)
for f in range(12):
    scene.frame_set(f)
    p=capture();p[:,1]+=.03333*f
    samples.append(p)
a.animation_data_clear()
walk=samples[0]
for j in range(9):
    resting(1-j/8)
    samples.append(capture())
for direction in [-1,1]:
    for j in range(9):
        leap(j/8,direction)
        samples.append(capture())

triangles=[];colors=[];offset=0
for o in objects:
    m=o.data;m.calc_loop_triangles()
    triangles.extend([np.array(t.vertices)+offset for t in m.loop_triangles])
    offset+=len(m.vertices)
    if o==body:
        im=b.data.images['Wenyi tuxedo markings'];w,h=im.size
        pix=np.empty(w*h*4,'f');im.pixels.foreach_get(pix);pix=pix.reshape(h,w,4)
        c=np.zeros((len(m.vertices),3));uv=m.uv_layers.active.data
        for loop in m.loops:
            u,v=uv[loop.index].uv
            c[loop.vertex_index]=pix[min(h-1,max(0,int(v*h))),min(w-1,max(0,int(u*w/2))),:3]
    else:
        c=np.tile([.03,.045,.019] if 'Pupil' in o.name else [.17,.22,.08],(len(m.vertices),1))
    colors.append(c)
if any(len(p)!=offset for p in samples):
    raise RuntimeError('Topology differs between poses')
buffer=io.BytesIO()
with gzip.GzipFile(fileobj=buffer,mode='wb',compresslevel=7) as g:
    idx=np.asarray(triangles,'<u4')
    g.write(struct.pack('<II',offset,idx.size));g.write(idx.tobytes())
    g.write((np.clip(np.concatenate(colors),0,1)*255).astype('u1').tobytes())
    for i,p in enumerate(samples):
        p=p.copy()
        # Align the animated root, not each changing silhouette.
        p[:,1]-=.07 if i<12 else .0
        p=p[:,[0,2,1]];p[:,2]*=-1
        # All poses share the same root and model units.
        g.write(np.round(p*32000).astype('<i2').tobytes())
        if i in [0,12,28,34,40]:
            print('CAT_POSE',i,p.min(0),p.max(0))
data=buffer.getvalue()
parts=[]
for i,start in enumerate(range(0,len(data),2200000)):
    name=f'cat-rig-v3-{i:02d}.bin'
    with open(os.path.join(root,'public/studio-model',name),'wb') as f:
        f.write(data[start:start+2200000])
    parts.append(name)
with open(os.path.join(root,'public/studio-model/cat-rig-v3.json'),'w') as f:
    json.dump(parts,f)
