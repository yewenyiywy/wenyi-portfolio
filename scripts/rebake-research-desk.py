"""Recompute the desktop contact shadows for the approved book placement."""
import bpy, gzip, json, math, sys, tempfile, runpy
from pathlib import Path
from mathutils import Matrix, Vector
root=Path(__file__).resolve().parent.parent
model=root/'public'/'studio-model'
bpy.ops.wm.read_factory_settings(use_empty=True)
with tempfile.TemporaryDirectory() as tmp:
    main=Path(tmp)/'studio.glb';main.write_bytes(gzip.decompress(b''.join((model/p).read_bytes() for p in json.loads((model/'manifest.json').read_text())['parts'])))
    book=Path(tmp)/'book.glb';book.write_bytes(gzip.decompress((model/'research-book.glb.gz').read_bytes()))
    bpy.ops.import_scene.gltf(filepath=str(main))
    old=bpy.data.objects.get('target_projects')
    if old:
        for o in list(old.children_recursive):bpy.data.objects.remove(o,do_unlink=True)
    player=bpy.data.objects.get('Mint pocket MP3')
    if player:
        for o in list(player.children_recursive):
            if o.name.startswith(('Earphone lead','Earbud housing','Headphone plug')):bpy.data.objects.remove(o,do_unlink=True)
        # Match the new cable and silicone earpieces in the runtime. These
        # receiver-bake meshes are independent of the exported web geometry.
        def wire(name,points,r):
            cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=r;cu.bevel_resolution=3
            s=cu.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
            for p,(x,y,z) in zip(s.bezier_points,points):p.co=(x,-z,y);p.handle_left_type=p.handle_right_type='AUTO'
            o=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(o);o.parent=player
            bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
        wire('New main earphone cable',[(0,.021,.245),(.055,.013,.34),(.135,.012,.54),(.025,.012,.72),(-.29,.012,.80),(-.59,.012,.70),(-.67,.012,.48),(-.44,.012,.34),(-.23,.018,.43),(-.26,.019,.62),(-.48,.015,.63)],.0038)
        wire('New left branch',[(-.48,.015,.63),(-.50,.013,.57),(-.52,.013,.48),(-.542,.028,.471)],.0028)
        wire('New right branch',[(-.48,.015,.63),(-.62,.013,.64),(-.71,.013,.58),(-.758,.028,.608)],.0028)
        for x,y,z in [(-.59,.031,.45),(-.79,.031,.65)]:
            bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=.026,location=(0,0,0));o=bpy.context.object;o.name='New earbud contact';o.parent=player;o.location=(x,-z,y);o.scale=(1.3,1,.8)
    before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(book))
    transform=Matrix.Translation(Vector((-2.78,-.55,1.34)))@Matrix.Rotation(math.radians(8),4,'Z')
    for o in set(bpy.context.scene.objects)-before:
        if o.parent is None:o.matrix_world=transform@o.matrix_world
    bpy.context.view_layer.update()
    sys.argv.append('--desk-only')
    runpy.run_path(str(root/'scripts'/'bake-studio-contact.py'),run_name='__main__')
