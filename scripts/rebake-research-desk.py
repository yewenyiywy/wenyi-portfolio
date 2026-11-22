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
    before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(book))
    transform=Matrix.Translation(Vector((-2.78,-.55,1.34)))@Matrix.Rotation(math.radians(8),4,'Z')
    for o in set(bpy.context.scene.objects)-before:
        if o.parent is None:o.matrix_world=transform@o.matrix_world
    bpy.context.view_layer.update()
    sys.argv.append('--desk-only')
    runpy.run_path(str(root/'scripts'/'bake-studio-contact.py'),run_name='__main__')
