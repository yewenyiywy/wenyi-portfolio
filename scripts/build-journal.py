"""Render the open forest-green studio journal, using actual layered 3D paper."""
import bpy, math, os, subprocess
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def mat(name,color,rough=.82,noise=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
    if noise:
        tex=nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=170;tex.inputs['Detail'].default_value=2
        bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=noise;bump.inputs['Distance'].default_value=.012;links.new(tex.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    return m
cloth=mat('Forest green linen',(.025,.12,.074),.86,.25)
paper=mat('Warm white cotton writing paper',(.97,.91,.78),.94,.33)
# Cotton fibers have minute, warm tonal variations, not just bump geometry.
nodes=paper.node_tree.nodes;links=paper.node_tree.links
fiber=nodes.new('ShaderNodeTexNoise');fiber.inputs['Scale'].default_value=86;fiber.inputs['Detail'].default_value=3.2;fiber.inputs['Roughness'].default_value=.64
ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.21;ramp.color_ramp.elements[0].color=(.82,.75,.60,1);ramp.color_ramp.elements[1].position=.78;ramp.color_ramp.elements[1].color=(1,.975,.865,1)
links.new(fiber.outputs['Fac'],ramp.inputs['Fac']);links.new(ramp.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
edge=mat('Cut paper edges',(.86,.77,.61),.94,.18)
gilt=mat('Gilt cover rule',(.52,.36,.13),.36)
def box(name,loc,size,material,bevel=.02):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
    b=o.modifiers.new('Rounded bound edge','BEVEL');b.width=bevel;b.segments=3;o.modifiers.new('Soft normals','WEIGHTED_NORMAL');return o

for side in (-1,1):
    box('Cloth cover',(side*1.56,0,.10),(3.16,4.09,.12),cloth,.09)
    box('Paper block',(side*1.48,0,.23),(2.98,3.83,.15),edge,.035)
    for i in range(12):box('Individual layered sheet',(side*1.48,0,.264+i*.0065),(2.97-i*.003,3.82-i*.003,.007),paper if i%3 else edge,.004)
    # Thicker near the gutter, gracefully curved as a real open leaf.
    verts=[];faces=[];nx=50;ny=30
    for i in range(nx+1):
        u=i/nx; x=side*(.014+2.89*u)
        for j in range(ny+1):
            v=j/ny;y=(v-.5)*3.83
            # The open gutter dips, the adjacent paper arches up, and the outer
            # edge curls slightly; grazing light reveals the raised fibers.
            z=.348+.49*math.exp(-u*3.5)*(1-math.exp(-u*29))+.105*math.sin(math.pi*u)+.030*math.cos(v*math.tau+u*4)*math.sin(math.pi*u)+.075*(u**11)
            verts.append((x,y,z))
    for i in range(nx):
        for j in range(ny):
            k=i*(ny+1)+j;f=(k,k+ny+1,k+ny+2,k+1);faces.append(f if side>0 else tuple(reversed(f)))
    mesh=bpy.data.meshes.new('Curved page');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Curved writing leaf',mesh);bpy.context.collection.objects.link(o);mesh.materials.append(paper)
    for f in mesh.polygons:f.use_smooth=True
    solid=o.modifiers.new('Paper thickness','SOLIDIFY');solid.thickness=.006
    for y in (-1.94,1.94):box('Gilt cover border',(side*1.56,y,.166),(2.97,.018,.007),gilt,.003)
    box('Gilt cover border',(side*3.04,0,.166),(.018,3.9,.007),gilt,.003)
box('Bound spine',(0,0,.09),(.28,4.1,.20),cloth,.085)

scene=bpy.context.scene
bpy.ops.object.camera_add(location=(0,0,10));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=6.77;scene.camera=cam
for loc,power,size,color in [((-5,-3,2.9),1900,2.1,(1,.94,.79)),((4,3,5),620,4,(1,.98,.92))]:
    bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.size=size;l.data.color=color;l.rotation_euler=(Vector((0,0,.2))-l.location).to_track_quat('-Z','Y').to_euler()
scene.world.color=(.24,.23,.20);scene.render.engine='CYCLES';scene.cycles.use_denoising=False;scene.cycles.samples=48
scene.view_settings.exposure=.38
scene.render.resolution_x=1440;scene.render.resolution_y=960;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));tmp=os.path.join(root,'public','hobbies','real-journal-render.png');out=os.path.join(root,'public','hobbies','real-journal.webp')
scene.render.filepath=tmp;bpy.ops.render.render(write_still=True)
subprocess.run(['convert',tmp,'-quality','86',out],check=True)
print('JOURNAL_RENDER',out,os.path.getsize(out))
