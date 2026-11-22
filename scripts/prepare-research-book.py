"""Combine the approved research book's many small meshes for real-time use."""
import bpy, math, sys
from pathlib import Path
from mathutils import Matrix

root=Path(__file__).resolve().parent.parent
source=Path(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
groups={}
for o in meshes:
    material=o.data.materials[0]
    if material.name.startswith('Page edge tint '):
        # Fine page grooves stay geometric; reuse a handful of similar tints.
        index=int(material.name.split()[-1]);name='Page edge tint '+str(1+(index-1)%7)
        material=bpy.data.materials.get(name) or material;o.data.materials[0]=material
    matrix=o.matrix_world.copy();o.parent=None;o.matrix_world=matrix
    groups.setdefault(material.name,[]).append(o)
for name,objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1:bpy.ops.object.join()
    ob=bpy.context.object;ob.name='Research book '+name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
for o in list(bpy.context.scene.objects):
    if o.type=='EMPTY':bpy.data.objects.remove(o,do_unlink=True)
out=root/'public'/'studio-model'/'research-book.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_apply=True)
print('Optimized book:',len([o for o in bpy.context.scene.objects if o.type=='MESH']),'meshes')
