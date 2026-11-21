"""Build the portfolio's real 3D studio. Run: blender -b -t 2 -P scripts/build-studio.py"""
import bpy, math, os, gzip
from mathutils import Vector

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mat(name, color, rough=.65, metal=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    return m

walnut=mat('Walnut',(.24,.105,.045),.53)
edge=mat('Walnut end grain',(.13,.052,.025),.64)
wall=mat('Warm plaster',(.54,.45,.35),.91)
oak=mat('Light oak',(.36,.21,.105),.67)
ivory=mat('Aged ABS plastic',(.7,.64,.47),.42)
keycap=mat('Keycaps',(.49,.44,.33),.68)
dark=mat('Graphite',(.025,.032,.029),.42)
glass=mat('CRT glass',(.025,.15,.13),.25)
paper=mat('Ivory paper',(.92,.86,.72),.92)
green=mat('Forest green cloth',(.025,.12,.074),.85)
gold=mat('Brass',(.57,.37,.09),.32,.65)
burgundy=mat('Oxblood leather',(.24,.045,.039),.82)
navy=mat('Midnight blue',(.055,.09,.14),.8)
black=mat('Black painted metal',(.026,.026,.023),.37,.18)
deskpad=mat('Desk mat leather',(.045,.105,.082),.83)
stitch=mat('Desk mat stitching',(.23,.29,.21),.85)
leaf=mat('Plant foliage',(.075,.25,.095),.8)
ceramic=mat('Cream ceramic',(.63,.55,.41),.41)
screenmat=mat('Computer display',(.015,.17,.15),.4)

def group(name):
    ob=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(ob);return ob

def box(name,loc,size,material,bevel=.025,parent=None,rotation=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);ob=bpy.context.object;ob.name=name;ob.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=ob.modifiers.new('Rounded edges','BEVEL');mod.width=bevel;mod.segments=2
        mod=ob.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    ob.data.materials.append(material);ob.rotation_euler.z=rotation
    if parent:ob.parent=parent
    return ob

def cylinder(name,loc,radius,depth,material,parent=None,rotation=(0,0,0),vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc,rotation=rotation)
    ob=bpy.context.object;ob.name=name;ob.data.materials.append(material)
    if parent:ob.parent=parent
    return ob

def rod(name,a,b,r,material,parent=None):
    a,b=Vector(a),Vector(b);ob=cylinder(name,(a+b)/2,r,(b-a).length,material,parent)
    ob.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return ob

def cable(name,points,radius,material,parent=None):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=16;curve.bevel_depth=radius;curve.bevel_resolution=3
    spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
    for point,location in zip(spline.bezier_points,points):
        point.co=location;point.handle_left_type='AUTO';point.handle_right_type='AUTO'
    ob=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(ob);curve.materials.append(material)
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
    bpy.ops.object.convert(target='MESH');ob=bpy.context.object;ob.name=name
    if parent:ob.parent=parent
    return ob

def mouse_shell(parent):
    # A tapered, softly domed mouse with a low rear palm rest and rounded nose.
    count=40;verts=[];faces=[]
    rings=[(1.373,.84),(1.386,.97),(1.414,1),(1.463,.98),(1.508,.83),(1.536,.57),(1.548,.24),(1.55,.018)]
    for z,scale in rings:
        for i in range(count):
            a=2*math.pi*i/count;si,co=math.sin(a),math.cos(a)
            shape=lambda v:math.copysign(abs(v)**.73,v)
            verts.append((1.22+.175*scale*shape(co)*(1-.12*si),-1.19+.285*scale*shape(si),z))
    for j in range(len(rings)-1):
        for i in range(count):faces.append((j*count+i,j*count+(i+1)%count,(j+1)*count+(i+1)%count,(j+1)*count+i))
    faces.append(tuple(reversed(range(count))));faces.append(tuple((len(rings)-1)*count+i for i in range(count)))
    mesh=bpy.data.meshes.new('Mouse shell');mesh.from_pydata(verts,[],faces);mesh.update()
    ob=bpy.data.objects.new('Mouse shell',mesh);bpy.context.collection.objects.link(ob);ob.parent=parent;mesh.materials.append(ivory)
    for polygon in mesh.polygons:polygon.use_smooth=True
    for i,x in enumerate((1.142,1.298)):
        button=box(f'Mouse button {i}',(x,-1.02,1.507),(.137,.16,.023),ivory,.026,parent)
        button.rotation_euler.x=-.18
    box('Mouse button seam',(1.22,-1.038,1.516),(.008,.13,.012),keycap,.002,parent)
    box('Mouse cable strain relief',(1.22,-.901,1.42),(.055,.06,.045),keycap,.01,parent)

def surface(name,loc,w,h,material,vertical=True,parent=None):
    x,y,z=loc
    if vertical:verts=[(x-w/2,y,z-h/2),(x+w/2,y,z-h/2),(x+w/2,y,z+h/2),(x-w/2,y,z+h/2)]
    else:verts=[(x-w/2,y-h/2,z),(x+w/2,y-h/2,z),(x+w/2,y+h/2,z),(x-w/2,y+h/2,z)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],[(0,1,2,3)]);mesh.update()
    uv=mesh.uv_layers.new(name='UVMap')
    for i,value in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[i].uv=value
    ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob);mesh.materials.append(material)
    if parent:ob.parent=parent
    return ob

# Architectural shell, a restrained desk set rather than a walkable room.
box('Back wall',(0,2.35,2.6),(14,.16,5.2),wall,.005)
box('Floor',(0,0,-.1),(12,12,.2),oak,0)
box('Desk top',(0,-.1,1.24),(7.4,3.5,.20),walnut,.045)
box('Desk front lip',(0,-1.84,1.17),(7.4,.12,.16),edge,.025)
for x in (-3.3,3.3):
    for y in (-1.53,1.36):box('Desk leg',(x,y,.56),(.16,.16,1.14),edge,.025)
box('Wall baseboard',(0,2.23,.18),(10,.13,.29),edge,.012)
box('Leather desk pad',(.25,-1.04,1.354),(2.95,1.30,.025),deskpad,.035)
for x in (-1.17,1.67):box('Stitched mat edge',(x,-1.04,1.37),(.009,1.19,.003),stitch,0)
for y in (-1.63,-.45):box('Stitched mat edge',(.25,y,1.37),(2.83,.009,.003),stitch,0)

# Real framed photographs, their images are applied by Three.js.
photos=group('target_about')
for i,(x,z,w,h) in enumerate([(-2.56,3.48,.85,1.07),(-1.49,3.63,.78,.99),(1.40,3.61,.81,1.03),(2.48,3.43,.86,1.08)]):
    box('Photo frame', (x,2.20,z),(w,.11,h),edge,.025,photos)
    box('Photo mat',(x,2.133,z),(w-.085,.025,h-.085),paper,.005,photos)
    surface(f'photo_texture_{i}',(x,2.115,z),w-.18,h-.18,paper,True,photos)

# Compact 1980s CRT computer: separate enclosure, bevelled bezel, glass, floppy drive.
computer=group('target_computer')
box('CRT rear casing',(0,.55,2.15),(1.63,1.28,1.65),ivory,.095,computer)
box('CRT front shell',(0,-.075,2.15),(1.67,.18,1.66),ivory,.065,computer)
box('CRT raised screen bezel',(0,-.19,2.40),(1.43,.10,1.05),keycap,.065,computer)
box('CRT black gasket',(0,-.252,2.40),(1.25,.045,.89),dark,.047,computer)
surface('computer_screen',(0,-.28,2.40),1.17,.81,screenmat,True,computer)
box('Floppy drive inset',(.39,-.18,1.67),(.63,.03,.085),keycap,.01,computer)
box('Floppy drive slot',(.39,-.202,1.67),(.52,.026,.031),dark,.005,computer)
box('Floppy eject',(.66,-.211,1.67),(.085,.025,.055),ivory,.004,computer)
box('Computer badge',(-.61,-.18,1.68),(.09,.021,.09),gold,.009,computer)
for i in range(13):box('CRT top vent',(-.54+i*.09,.49,2.983),(.025,.55,.014),dark,.003,computer)
for i in range(15):box('CRT base vent',(-.60+i*.085,-.178,1.43),(.034,.023,.016),dark,.002,computer)
box('CRT foot',(0,.45,1.35),(1.45,1.20,.13),keycap,.04,computer)

# Keyboard and mouse, actual individually modelled keys and wire.
box('Keyboard case',(0,-1.08,1.395),(1.9,.73,.13),ivory,.052,computer)
for r,n in enumerate((14,14,13,12)):
    for c in range(n):
        x=(c-(n-1)/2)*.125; y=-.84-r*.125
        box('Keyboard key',(x,y,1.49),(.103,.102,.076),keycap,.009,computer)
        surface(f'keyboard_label_{r}_{c}',(x,y,1.529),.09,.09,keycap,False,computer)
box('Spacebar',(0,-1.39,1.49),(.75,.105,.075),keycap,.012,computer)
mouse_shell(computer)
for i in range(12):cylinder('Coiled keyboard cable',(-.7+i*.033,-.56,1.40),.047,.025,ivory,computer,(0,math.pi/2,0),12)
box('Mouse port',(.831,.43,1.53),(.04,.10,.078),dark,.008,computer)
cable('Mouse cable',[(1.22,-.88,1.42),(1.25,-.74,1.38),(1.38,-.47,1.37),(1.46,-.10,1.37),(1.32,.25,1.38),(1.02,.42,1.40),(.90,.43,1.49),(.849,.43,1.53)],.014,keycap,computer)

# Degrees as a pair of horizontally framed certificates hung below the photos.
education=group('target_education')
for i,x in enumerate((-2.05,2.05)):
    z=2.47
    box(f'Degree frame_{i}',(x,2.20,z),(1.24,.11,.79),edge,.025,education)
    box(f'Degree paper_{i}',(x,2.132,z),(1.15,.025,.70),paper,.005,education)
    surface(f'degree_texture_{i}',(x,2.115,z),1.08,.63,paper,True,education)

# A substantial cloth-bound hobby book, gold rules and an ivory page block.
hobbies=group('target_hobbies')
box('Hobbies back cover', (2.38,-.78,1.36),(1.16,.85,.09),green,.025,hobbies)
box('Hobbies paper block',(2.38,-.77,1.47),(1.08,.79,.15),paper,.018,hobbies)
box('Hobbies front cover',(2.38,-.78,1.57),(1.16,.85,.075),green,.024,hobbies)
box('Hobbies spine',(1.82,-.78,1.47),(.10,.85,.26),green,.026,hobbies)
for y in (-1.09,-.49):box('Gilt spine bands',(1.814,y,1.48),(.11,.035,.26),gold,.005,hobbies)
surface('hobbies_cover',(2.39,-.78,1.611),1.06,.76,green,False,hobbies)

# Resume and project notebook are separate, touchable physical objects.
experience=group('target_experience')
for i in range(4):box('Resume sheet',(1.87,.66,1.348+i*.012),(1.05,.87,.012),paper,.004,experience,rotation=(i-1)*.014)
surface('resume_texture',(1.87,.66,1.398),1.03,.85,paper,False,experience)
projects=group('target_projects')
box('Research notebook cover',(-1.60,-1.12,1.37),(.88,.72,.08),burgundy,.026,projects)
box('Research notebook pages',(-1.60,-1.12,1.43),(.83,.67,.07),paper,.01,projects)
box('Research notebook front',(-1.60,-1.12,1.484),(.88,.72,.045),burgundy,.018,projects)
surface('research_cover',(-1.60,-1.12,1.51),.82,.65,burgundy,False,projects)

# A sculptural reading lamp, a few books, a ceramic plant. No decorative clutter.
cylinder('Lamp base',(-3.23,1.03,1.40),.29,.12,black)
rod('Lamp arm lower',(-3.23,1.03,1.45),(-3.12,1.18,2.46),.035,black)
rod('Lamp arm upper',(-3.12,1.18,2.46),(-2.89,.50,2.80),.035,black)
bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=.30,radius2=.13,depth=.26,location=(-2.88,.48,2.75),rotation=(.18,0,0));ob=bpy.context.object;ob.name='Lamp shade';ob.data.materials.append(black)
cylinder('Lamp warm liner',(-2.88,.48,2.612),.27,.025,gold)
for i,material in enumerate((navy,burgundy,green)):
    box('Shelf book',(3.14+i*.14,1.09,1.70),(.12,.55,.70-i*.07),material,.015)
    box('Shelf book gilt',(3.14+i*.14,.805,1.78),(.08,.018,.025),gold,.003)
cylinder('Ceramic planter',(3.25,-.38,1.54),.22,.39,ceramic)
cylinder('Pot soil',(3.25,-.38,1.744),.19,.026,edge)
for i in range(7):
    angle=i*2.399;end=(3.25+math.cos(angle)*.32,-.38+math.sin(angle)*.25,2.02+.12*(i%3))
    rod('Plant stem',(3.25,-.38,1.74),end,.014,leaf)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=1,location=end);ob=bpy.context.object;ob.name='Plant leaf';ob.scale=(.17,.065,.045);ob.rotation_euler.z=angle;ob.data.materials.append(leaf)

out=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','public','studio.glb'))
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_apply=True,export_materials='EXPORT',export_yup=True)
with open(out,'rb') as source, open(out+'.gz','wb') as dest:
    dest.write(gzip.compress(source.read(),compresslevel=9,mtime=0))
print('STUDIO_EXPORT',out,os.path.getsize(out))
