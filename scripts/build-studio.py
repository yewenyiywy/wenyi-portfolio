"""Build the portfolio's real 3D studio. Run: blender -b -t 2 -P scripts/build-studio.py"""
import bpy, math, os, gzip, sys
from mathutils import Vector
ASSET_REVIEW='--asset' in sys.argv
VARIANT=int(sys.argv[sys.argv.index('--variant')+1]) if '--variant' in sys.argv else 0

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mat(name, color, rough=.65, metal=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    return m

walnut=mat('Walnut',(.24,.105,.045),.53)
edge=mat('Walnut end grain',(.13,.052,.025),.64)
wall=mat('Warm plaster',(.66,.53,.46),.94)
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
deskpad=mat('Desk mat leather',(.30,.17,.17),.77)
stitch=mat('Desk mat stitching',(.62,.44,.36),.85)
leaf=mat('Plant foliage',(.075,.25,.095),.8)
ceramic=mat('Cream ceramic',(.63,.55,.41),.41)
orchid_purple=mat('Orchid velvet magenta',(.105,.001,.049),.68)
orchid_light=mat('Orchid petal highlights',(.19,.004,.085),.66)
orchid_lip=mat('Orchid magenta lip',(.29,.011,.11),.65)
for m in (orchid_purple,orchid_light,orchid_lip):
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Specular IOR Level'].default_value=.18;bs.inputs['Subsurface Weight'].default_value=.035
orchid_center=mat('Orchid pale throat',(.95,.78,.55),.48)
bird_orange=mat('Bird of paradise orange',(.92,.26,.025),.55)
bird_blue=mat('Bird of paradise blue',(.055,.16,.49),.49)
leaf_dark=mat('Deep glossy leaf',(.014,.078,.025),.38)
leaf_vein=mat('Botanical veins',(.055,.14,.033),.62)
pot_black=mat('Orchid matte black ceramic',(.009,.012,.011),.79)
rose=mat('Dusty rose ceramic',(.50,.23,.25),.42)
linen=mat('Pleated cream linen',(.83,.70,.52),.88)
bud_green=mat('Orchid green buds',(.29,.34,.07),.58)
def glass_material(name,color,rough=.17):
    m=mat(name,color,rough,0);bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Transmission Weight'].default_value=.92;bs.inputs['IOR'].default_value=1.48;bs.inputs['Coat Weight'].default_value=.16;return m
patina=glass_material('Art Nouveau emerald cast glass',(.12,.30,.105),.22)
amber=glass_material('Art Nouveau amber blown glass',(.95,.41,.035),.14)
bronze_figure=mat('Cast bronze maiden',(.36,.17,.047),.29,1)
bulb=mat('Lamp warm incandescent bulb',(1,.72,.25),.22);b=bulb.node_tree.nodes.get('Principled BSDF');b.inputs['Emission Color'].default_value=(1,.47,.075,1);b.inputs['Emission Strength'].default_value=4
card_green=mat('Contact holder lacquer',(.012,.053,.041),.39,.1)
screenmat=mat('Computer display',(.015,.17,.15),.4)

def botanical_map(name,kind):
    # Image textures use UV coordinates and export to glTF, unlike Blender-only nodes.
    size=256;img=bpy.data.images.new(name,size,size,alpha=False);pixels=[]
    for iy in range(size):
        t=iy/(size-1)
        for ix in range(size):
            q=ix/(size-1)*2-1;grain=math.sin(ix*71.91+iy*113.7)*.008+math.sin(ix*.43+iy*.38)*.009
            if kind=='leaf':
                mid=.055*math.exp(-abs(q)*65);vein=.018*math.exp(-abs(math.sin((t-abs(q)*.13)*math.pi*8))*22)
                edge=max(0,abs(q)-.72)*.07;v=mid+vein+grain-edge
                rgb=(.105+v*.65,.285+v,.091+v*.5)
            else:
                vein=.045*math.exp(-abs(math.sin((q/(.25+.8*t))*math.pi*5))*19)*(1-t)
                glow=.045*t+.028*(1-abs(q))+grain-vein
                rgb=(.235+glow,.012+glow*.22,.158+glow*.72)
            pixels.extend([max(0,min(1,c)) for c in rgb]+[1])
    img.pixels.foreach_set(pixels);img.pack();return img

def textured_botanical(name,image,rough):
    m=mat(name,(1,1,1),rough);nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF');bs.inputs['Specular IOR Level'].default_value=.27
    tex=nodes.new('ShaderNodeTexImage');tex.image=image;links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=180;noise.inputs['Detail'].default_value=2
    bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.0017;links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    return m
leaf_surface=textured_botanical('Botanical living leaf PBR',botanical_map('Leaf color and veins','leaf'),.34)
orchid_surface=textured_botanical('Botanical orchid petal PBR',botanical_map('Orchid petal veins','orchid'),.58)

def grid_uv(mesh,rows,cols):
    uv=mesh.uv_layers.new(name='UVMap')
    for loop in mesh.loops:
        i,j=divmod(loop.vertex_index,cols+1);uv.data[loop.index].uv=(j/cols,i/rows)

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
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=16 if ASSET_REVIEW else 8;curve.bevel_depth=radius;curve.bevel_resolution=3 if ASSET_REVIEW else 1
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

def petal(name,base,tip,width,material,normal=(0,-1,0),curl=.045):
    # Individual curved botanical surfaces, not flat billboards.
    a,b=Vector(base),Vector(tip);direction=(b-a).normalized();n=Vector(normal).normalized();side=direction.cross(n).normalized()
    verts=[];faces=[];rows=10;cols=6
    for i in range(rows+1):
        t=i/rows;span=width*(math.sin(math.pi*t)**.72)*.5+.001
        for j in range(cols+1):
            q=j/cols*2-1;fold=math.sin(math.pi*t)*(1-q*q);p=a.lerp(b,t)+side*(span*q)+n*(curl*fold+.012*math.sin(q*math.pi)*math.sin(math.pi*t))
            verts.append(tuple(p))
    for i in range(rows):
        for j in range(cols):
            k=i*(cols+1)+j;faces.append((k,k+1,k+cols+2,k+cols+1))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();grid_uv(mesh,rows,cols);ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob);mesh.materials.append(material)
    for p in mesh.polygons:p.use_smooth=True
    return ob

def orchid_petal(name,base,tip,width,material,normal,curl=.04,veins=False):
    """Broad rounded Phalaenopsis wings with a narrow claw, cupping and rippled margin."""
    a,b=Vector(base),Vector(tip);d=(b-a).normalized();n=Vector(normal).normalized();side=d.cross(n).normalized()
    verts=[];faces=[];rows=22 if ASSET_REVIEW else 14;cols=12 if ASSET_REVIEW else 8
    for i in range(rows+1):
        t=i/rows;span=width*.5*(math.sin(math.pi*t)**.39)*(.43+.8*t)+.001
        for j in range(cols+1):
            q=j/cols*2-1
            p=a.lerp(b,t)+side*(q*span)+n*(curl*math.sin(math.pi*t)*(1-.58*q*q)+.004*abs(q)**2*math.sin(5*math.pi*t+q*2))
            verts.append(tuple(p))
    for i in range(rows):
        for j in range(cols):
            k=i*(cols+1)+j;faces.append((k,k+1,k+cols+2,k+cols+1))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();grid_uv(mesh,rows,cols);ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob);mesh.materials.append(material)
    for p in mesh.polygons:p.use_smooth=True
    if veins:
        # Fine, low-relief forked magenta veins from the flower throat.
        for q in (-.67,-.31,.31,.67):
            ps=[]
            for t in (.16,.33,.55,.73,.86):
                span=width*.5*(math.sin(math.pi*t)**.39)*(.43+.8*t)
                ps.append(a.lerp(b,t)+side*(q*span*t)+n*(curl*math.sin(math.pi*t)*(1-.58*(q*t)**2)+.002))
            if ASSET_REVIEW:cable('Orchid petal vein',ps,.0007,orchid_light)
            else:
                vv=[]
                for p in ps:vv.extend([tuple(p+side*.00065),tuple(p-side*.00065)])
                mm=bpy.data.meshes.new('Petal vein ribbon');mm.from_pydata(vv,[],[(2*j,2*j+1,2*j+3,2*j+2) for j in range(len(ps)-1)]);mm.update();oo=bpy.data.objects.new('Orchid petal vein',mm);bpy.context.collection.objects.link(oo);mm.materials.append(orchid_light)
    return ob

def orchid_bloom(c,s,tilt=0,veins=False):
    # Each bloom is a real, asymmetric five-part corolla, facing slightly differently.
    n=Vector((math.sin(tilt),-math.cos(tilt),.06)).normalized();u=Vector((math.cos(tilt),math.sin(tilt),0));v=Vector((0,0,1))
    for i,(angle,length,width) in enumerate([(90,.87,.60),(226,.81,.58),(315,.86,.60),(18,1,1.06),(162,1,1.07)]):
        a=math.radians(angle);tip=c+u*(math.cos(a)*s*length)+v*(math.sin(a)*s*length)-n*.012
        orchid_petal('Orchid broad wing' if i>=3 else 'Orchid sepal',c,tip,s*width,orchid_surface,n,.048 if i>=3 else .022,False)
    # Three curled labellum lobes, pale yellow callus and a tiny column.
    throat=c+n*.042
    for sign in (-1,1):orchid_petal('Orchid curled lateral lip',throat,throat+u*(sign*s*.22)+v*(s*.04)+n*.035,s*.34,orchid_lip,n,.028)
    orchid_petal('Orchid central labellum',throat,throat-v*s*.44+n*.054,s*.42,orchid_lip,n,.037)
    for dx,dz,r in [(0,.026,.019),(-.014,.005,.012),(.014,.005,.012)]:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12 if ASSET_REVIEW else 8,ring_count=6 if ASSET_REVIEW else 4,radius=r,location=throat+u*dx+v*dz+n*.018);ob=bpy.context.object;ob.name='Orchid pale column';ob.scale=(.85,.62,1);ob.data.materials.append(orchid_center)

def planter(name,x,y,r,h):
    bpy.ops.mesh.primitive_cone_add(vertices=48,radius1=r*.79,radius2=r,depth=h,location=(x,y,1.34+h/2));ob=bpy.context.object;ob.name=name+' pot';ob.data.materials.append(ceramic)
    mod=ob.modifiers.new('Rounded lip','BEVEL');mod.width=.015;mod.segments=2
    cylinder(name+' soil',(x,y,1.34+h+.005),r*.88,.018,edge)
    return 1.34+h

def orchid(x,y):
    # Bulbous matte-black ceramic, upright glossy basal leaves, and two cascading flower spikes.
    z=1.74
    lathe('Orchid matte black ceramic pot',x,y,[(1.34,.03),(1.34,.19),(1.36,.23),(1.40,.265),(1.48,.29),(1.56,.29),(1.64,.265),(1.70,.224),(1.75,.214),(1.755,.198),(1.72,.19)],pot_black)
    cylinder('Orchid soil',(x,y,z-.025),.18,.018,dark)
    for i,(dx,dy,dz) in enumerate([(-.35,-.08,.14),(.37,-.12,.22),(-.21,.16,.34),(.18,.13,.39),(.05,-.25,.18)]):
        petal('Orchid glossy basal leaf',(x,y,z), (x+dx,y+dy,z+dz),.155,leaf_surface,(0,-1,.5),.055)
    paths=[[(x-.06,y,z),(x-.06,y+.02,z+.58),(x-.13,y+.01,z+1.18),(x-.34,y-.06,z+1.34),(x-.52,y-.10,z+1.21),(x-.63,y-.11,z+1.01)],[(x+.075,y,z),(x+.08,y,z+.60),(x+.14,y-.01,z+1.06),(x+.39,y-.07,z+1.13),(x+.56,y-.14,z+.92),(x+.58,y-.18,z+.69)],[(x,y,z),(x-.03,y-.03,z+.58),(x-.28,y-.17,z+.85),(x-.37,y-.23,z+.59),(x-.29,y-.27,z+.38)]]
    for stem,points in enumerate(paths):
        cable('Orchid arching spike',points,.0095,leaf_dark)
        rod('Orchid support stake',(x+(-.08 if stem==0 else .09),y+.07,z),(x+(-.08 if stem==0 else .09),y+.07,z+1.12),.007,edge)
        flower_points=[]
        for i,p in enumerate(points[2:]):
            flower_points.append(p)
            if i<len(points[2:])-1:flower_points.append(tuple(Vector(p).lerp(Vector(points[i+3]),.50)))
        for i,p in enumerate(flower_points):
            c=Vector(p)+Vector(((-1 if i%2 else 1)*.055,-.055-.025*(i%3),.015));s=.177-(i*.006)
            rod('Orchid pedicel',p,c,.006,leaf_dark)
            orchid_bloom(c,s,(-.48,.20,.48,-.12)[(i+stem)%4],i%3==0)
        p=Vector(points[-1]);
        for j in range(2):
            c=p+Vector(((-1 if stem==0 else 1)*(.035+j*.024),-.01,-.075-j*.055));rod('Orchid bud stalk',p,c,.004,leaf_dark)
            bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=.032,location=c);ob=bpy.context.object;ob.name='Orchid unopened bud';ob.scale=(.72,.85,1.3);ob.data.materials.append(bud_green)

def strelitzia_leaf(base,tip,width,normal):
    a,b=Vector(base),Vector(tip);d=(b-a).normalized();n=Vector(normal).normalized();side=d.cross(n).normalized()
    def point(t,q):
        span=width*.5*math.sin(math.pi*t)**.61
        ridge=.044*math.sin(math.pi*t)*(1-abs(q))+.012*math.sin(8*math.pi*t)*abs(q)**2
        return a.lerp(b,t)+side*(span*q)+n*ridge
    rows,cols=(26,12) if ASSET_REVIEW else (18,8);verts=[tuple(point(i/rows,j/cols*2-1)) for i in range(rows+1) for j in range(cols+1)];faces=[]
    for i in range(rows):
        for j in range(cols):
            k=i*(cols+1)+j;faces.append((k,k+1,k+cols+2,k+cols+1))
    mesh=bpy.data.meshes.new('Strelitzia ribbed lamina');mesh.from_pydata(verts,[],faces);mesh.update();grid_uv(mesh,rows,cols);o=bpy.data.objects.new('Bird of paradise ribbed paddle leaf',mesh);bpy.context.collection.objects.link(o);mesh.materials.append(leaf_surface)
    for p in mesh.polygons:p.use_smooth=True
    cable('Bird of paradise central midrib',[point(t,0)+n*.0015 for t in (0,.2,.4,.6,.8,1)],.0035,leaf_vein)
    for t in (.19,.30,.41,.52,.63,.74):
        for sign in (-1,1):
            v=[tuple(point(t+.11*j/6,sign*j/6*.93)+n*.0015) for j in range(7)]
            # Thin ribbons instead of chunky rods, so the venation reads as surface detail.
            vv=[]
            for p in v:vv.extend([tuple(Vector(p)+d*.0011),tuple(Vector(p)-d*.0011)])
            mm=bpy.data.meshes.new('Leaf vein');mm.from_pydata(vv,[],[(2*j,2*j+1,2*j+3,2*j+2) for j in range(6)]);mm.update();oo=bpy.data.objects.new('Bird of paradise fine lateral vein',mm);bpy.context.collection.objects.link(oo);mm.materials.append(leaf_vein)

def bird_of_paradise(x,y):
    z=planter('Bird of paradise',x,y,.29,.40)
    for i,(dx,dy,h) in enumerate([(-.47,-.08,.97),(.38,-.04,1.14),(-.26,.16,1.24),(.46,.12,.80),(.05,.06,1.03)]):
        end=(x+dx*.26,y+dy*.35,z+h*.28);tip=(x+dx,y+dy,z+h+.23)
        cable('Bird of paradise leaf stem',[(x,y,z), (x+dx*.25,y+dy*.3,z+h*.35),end],.016,leaf_dark)
        strelitzia_leaf(end,tip,.34,((-.32,.18,.34,-.28,.08)[i],-1,.08))
    for sign,h in [(-1,1.10),(1,1.25)]:
        base=Vector((x+sign*.15,y-.10,z+h))
        cable('Bird of paradise flower stem',[(x,y,z),(x+sign*.06,y,z+h*.55),base],.015,leaf_dark)
        petal('Bird of paradise spathe',base,base+Vector((sign*.34,0,.035)),.10,leaf_dark,(0,-1,0),.025)
        for k in range(3):petal('Bird of paradise pointed orange sepal',base+Vector((sign*.07,0,.02)),base+Vector((sign*(.08+k*.085),-.01,.29-k*.033)),.056,bird_orange,(0,-1,0),.016)
        petal('Bird of paradise blue tongue',base+Vector((sign*.08,-.025,.03)),base+Vector((sign*.28,-.06,.12)),.055,bird_blue,(0,-1,0),.02)

def lathe(name,x,y,profile,material,parent=None,segments=64,ripple=0):
    verts=[];faces=[]
    for z,r in profile:
        for i in range(segments):
            a=i*math.tau/segments;rr=r*(1+ripple*math.cos(a*6));verts.append((x+rr*math.cos(a),y+rr*math.sin(a),z))
    for j in range(len(profile)-1):
        for i in range(segments):faces.append((j*segments+i,j*segments+(i+1)%segments,(j+1)*segments+(i+1)%segments,(j+1)*segments+i))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob);mesh.materials.append(material)
    if parent:ob.parent=parent
    for p in mesh.polygons:p.use_smooth=True
    return ob

def glass_whiplash(x,y):
    # One watertight, flowing cast-glass piece rather than intersecting decorative rods.
    keys=[(-.27,1.405,.10,.055),(.01,1.43,.16,.09),(.26,1.53,.15,.085),(.37,1.77,.108,.065),(.38,2.07,.087,.054),(.34,2.39,.08,.05),(.19,2.66,.073,.045),(-.035,2.79,.080,.048),(-.24,2.77,.072,.047),(-.42,2.64,.015,.018)]
    samples=[]
    for k in range(len(keys)-1):
        a=Vector(keys[max(0,k-1)]);b=Vector(keys[k]);c=Vector(keys[k+1]);d=Vector(keys[min(len(keys)-1,k+2)])
        for j in range(10):
            t=j/10;samples.append((2*b+(c-a)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)*.5)
    samples.append(Vector(keys[-1]));verts=[];faces=[];n=24
    for i,p in enumerate(samples):
        a=samples[max(0,i-1)];b=samples[min(len(samples)-1,i+1)];t=Vector((b[0]-a[0],0,b[1]-a[1])).normalized();side=Vector((t.z,0,-t.x));c=Vector((x+p[0],y+.075,p[1]))
        for j in range(n):
            q=j*math.tau/n;verts.append(tuple(c+side*(math.cos(q)*max(.012,p[2]))+Vector((0,math.sin(q)*max(.012,p[3]),0))))
    for i in range(len(samples)-1):
        for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
    faces.extend([tuple(reversed(range(n))),tuple((len(samples)-1)*n+j for j in range(n))]);mesh=bpy.data.meshes.new('Cast glass sculpture');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Lamp sculptural emerald glass',mesh);bpy.context.collection.objects.link(o);mesh.materials.append(patina)
    for f in mesh.polygons:f.use_smooth=True

def art_nouveau_lamp(x,y):
    lathe('Lamp emerald glass pedestal',x,y,[(1.34,.025),(1.34,.23),(1.36,.29),(1.40,.31),(1.44,.28),(1.47,.19),(1.47,.025),(1.34,.025)],patina)
    glass_whiplash(x,y)
    shade_x=x-.23;shade_y=y-.035
    # Closed double-wall glass profile, open at its mouth. A separate metal cap holds it.
    outer=[(2.36,.217),(2.375,.229),(2.397,.217),(2.43,.20),(2.48,.177),(2.54,.159),(2.61,.144),(2.67,.131),(2.71,.112)]
    inner=[(z+.003,max(.03,r-.013)) for z,r in reversed(outer)]
    lathe('Lamp amber blown-glass shade',shade_x,shade_y,outer+inner+[outer[0]],amber,segments=96,ripple=.014)
    cylinder('Lamp solid brass shade socket',(shade_x,shade_y,2.727),.092,.043,gold)
    rod('Lamp brass suspension',(shade_x,shade_y,2.748),(shade_x,y+.075,2.775),.022,gold)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=.068,location=(shade_x,shade_y,2.55));ob=bpy.context.object;ob.name='Lamp interior glowing bulb';ob.scale=(.75,.75,1.12);ob.data.materials.append(bulb)
    # Maiden is a separate bronze sculpture in front of the green support.
    # Her hand is the only intended contact with the glass; no extra rod crosses the dress.
    fx=x-.08;fy=y-.125
    gown=lathe('Lamp sculptural bronze gown',fx,fy,[(1.47,.10),(1.53,.105),(1.61,.083),(1.70,.067),(1.79,.048),(1.87,.039),(1.94,.053),(1.99,.059),(2.035,.031)],bronze_figure,ripple=.085)
    for v in gown.data.vertices:
        t=(v.co.z-1.47)/.565;v.co.x+=.042*math.sin(t*math.pi*1.3);v.co.y+=.012*math.sin(t*math.pi)
    def sphere(name,at,scale):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=1,location=at);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(bronze_figure)
        for p in o.data.polygons:p.use_smooth=True
    sphere('Lamp maiden head',(fx-.006,fy,2.10),(.044,.036,.055));sphere('Lamp maiden hair',(fx+.012,fy+.023,2.129),(.038,.032,.035))
    cable('Lamp maiden neck',[(fx,fy,2.027),(fx-.006,fy,2.064)],.018,bronze_figure)
    cable('Lamp maiden outstretched arm',[(fx+.051,fy,1.992),(fx+.13,fy-.008,2.035),(x+.15,y-.07,2.045),(x+.293,y+.016,2.055)],.014,bronze_figure)
    sphere('Lamp maiden hand on glass',(x+.297,y+.025,2.055),(.025,.014,.018))
    cable('Lamp maiden resting arm',[(fx-.043,fy,1.99),(fx-.073,fy-.026,1.91),(fx-.054,fy-.037,1.815)],.012,bronze_figure)

def contact_holder(x,y):
    parent=group('target_contact')
    box('Contact walnut holder base',(x,y,1.385),(.91,.68,.09),edge,.028,parent)
    box('Contact green lacquer front',(x,y-.296,1.48),(.91,.08,.21),card_green,.018,parent)
    for sx in (-1,1):box('Contact side wall',(x+sx*.414,y,1.48),(.082,.61,.21),card_green,.015,parent)
    box('Contact back wall',(x,y+.296,1.48),(.91,.08,.21),card_green,.015,parent)
    for i in range(12):
        card=box('Contact index card',(x,y+.12+i*.009,1.72+i*.001),(.76,.009,.49),paper,.006,parent)
        card.rotation_euler.x=-.13
    for i,xx in enumerate((x-.25,x-.08,x+.09,x+.26)):
        box('Contact index tab',(xx,y+.13,1.98),(.15,.025,.075),card_green,.006,parent)
        surface(f'contact_tab_{i}',(xx,y+.115,1.98),.144,.067,card_green,True,parent)
    surface('contact_card_texture',(x,y+.073,1.72),.72,.42,paper,True,parent)
    for xx in (x-.25,x+.25):
        bpy.ops.mesh.primitive_torus_add(major_radius=.08,minor_radius=.012,location=(xx,y+.015,1.57),rotation=(0,math.pi/2,0),major_segments=32,minor_segments=8);ob=bpy.context.object;ob.name='Contact brass binding rings';ob.data.materials.append(gold);ob.parent=parent

def reference_bird(x,y,variant):
    """Three close interpretations of the photographed crane flower, not a tulip fan."""
    z=planter('Bird of paradise',x,y,.29,.40)
    for i,(dx,dy,h) in enumerate([(-.52,.12,.92),(.35,.22,1.02),(-.24,.3,1.15),(.48,.06,.71)]):
        root=(x+dx*.20,y+dy*.25,z+h*.34);end=(x+dx,y+dy,z+h)
        cable('Bird of paradise leaf petiole',[(x,y,z),(x+dx*.1,y,z+h*.2),root],.014,leaf_dark);strelitzia_leaf(root,end,.29,((-.35,.22,.4,-.12)[i],-1,.06))
    purple=mat('Indigo blue strelitzia petals',(.010,.003,.038),.61)
    orange=mat('Vivid orange strelitzia sepals',(.70,.064,.0015),.61)
    for m in (purple,orange):m.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.13
    settings={1:[(-.20,1.03,-1),(.24,1.31,1),(.12,.82,1)],2:[(-.30,1.18,1),(.19,1.37,1),(.42,.99,-1)],3:[(-.28,1.28,1),(.21,1.39,-1),(.35,.88,1)]}[variant]
    for i,(dx,h,side) in enumerate(settings):
        b=Vector((x+dx,y-.16-i*.02,z+h));direction=Vector((side,0,0));up=Vector((0,0,1));front=Vector((0,-1,0))
        cable('Bird of paradise slender flower stalk',[(x,y,z),(x+dx*.45,y-.07,z+h*.58),b],.013,leaf_dark)
        # Long, keeled green bract, swept upward against the orange sepals.
        spathe_tip=b-direction*(.37 if variant!=2 else .46)+up*.43
        orchid_petal('Bird of paradise spear-shaped green bract',b,spathe_tip,.105,leaf_surface,front,.031)
        cable('Bird of paradise bract keel',[b,b.lerp(spathe_tip,.48)+front*.032,spathe_tip],.005,leaf_vein)
        # Three independent narrow lanceolate sepals, two thrusting diagonally outward.
        origin=b+up*.028+front*.022
        vectors=[direction*.085+up*.35,direction*.40+up*.23,direction*.43+up*.115]
        if variant==2:vectors=[direction*.045+up*.40,direction*.46+up*.27,direction*.42+up*.13]
        if variant==3:vectors=[-direction*.015+up*.40,direction*.39+up*.31,direction*.49+up*.16]
        for k,v in enumerate(vectors):
            a=origin+up*.012*k+front*.008*k;petal('Bird of paradise vivid narrow orange sepal',a,a+v,.043 if k==0 else .061,orange,front,.018)
        # The blue structure is pointed and erect, not a flat blue spoon.
        blue_tip=origin+direction*.105+up*(.34 if variant!=3 else .39)
        petal('Bird of paradise indigo spear',origin+front*.028,blue_tip+front*.028,.05,purple,front,.014)
        cable('Bird of paradise blue central ridge',[origin+front*.036,blue_tip+front*.032],.003,purple)

def reference_lamp(x,y,variant):
    """Front silhouette and proportions taken from the supplied Art Nouveau photograph."""
    # The base is a sinuous loop with an open crescent, not a solid circular disc.
    basecurve=[(x-.01,y+.09,1.384),(x-.33,y+.03,1.382),(x-.36,y-.10,1.382),(x-.19,y-.22,1.382),(x+.16,y-.21,1.384),(x+.31,y-.06,1.39),(x+.27,y+.10,1.41)]
    cable('Lamp glass open crescent base',basecurve,.042,patina)
    # A broad leaf-like base folds into the tall, slender stem. One uninterrupted cast piece.
    keys=[(-.24,1.40,.075,.046),(.02,1.43,.15,.075),(.22,1.51,.14,.074),(.31,1.72,.104,.058),(.32,2.00,.075,.041),(.29,2.28,.061,.035),(.21,2.56,.053,.033),(.06,2.76,.056,.037),(-.15,2.84,.061,.033),(-.34,2.79,.05,.025),(-.43,2.60,.010,.014)]
    if variant==2:keys=[(a+(0.045 if 2<=i<=7 else 0),b,w*(1.10 if i<4 else .88),d) for i,(a,b,w,d) in enumerate(keys)]
    if variant==3:keys=[(a-.04*(i/10),b+(0.035 if i>=7 else 0),w*(.94 if i>=4 else 1.15),d) for i,(a,b,w,d) in enumerate(keys)]
    samples=[]
    for k in range(len(keys)-1):
        a=Vector(keys[max(0,k-1)]);b=Vector(keys[k]);c=Vector(keys[k+1]);d=Vector(keys[min(len(keys)-1,k+2)])
        for j in range(12):
            t=j/12;samples.append((2*b+(c-a)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)*.5)
    samples.append(Vector(keys[-1]));verts=[];faces=[];n=36
    for i,p in enumerate(samples):
        a=samples[max(0,i-1)];b=samples[min(len(samples)-1,i+1)];t=Vector((b[0]-a[0],0,b[1]-a[1])).normalized();s=Vector((t.z,0,-t.x));c=Vector((x+p[0],y+.055,p[1]))
        for j in range(n):
            angle=j*math.tau/n;verts.append(tuple(c+s*(math.cos(angle)*max(.009,p[2]))+Vector((0,math.sin(angle)*max(.009,p[3]),0))))
    for i in range(len(samples)-1):
        for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
    faces.extend([tuple(reversed(range(n))),tuple((len(samples)-1)*n+j for j in range(n))]);mesh=bpy.data.meshes.new('Reference glass stem');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Lamp reference glass stem',mesh);bpy.context.collection.objects.link(o);mesh.materials.append(patina)
    for p in mesh.polygons:p.use_smooth=True
    # Broad upward-pointing Art Nouveau leaf coronet with a curled, drooping left tip.
    p=Vector((x-.06,y+.04,2.79));q=Vector((x-.17,y+.04,2.98 if variant==2 else 2.92))
    orchid_petal('Lamp upper glass leaf finial',p,q,.175,patina,(0,-1,0),.025)
    crest=[(x-.14,y+.055,2.84),(x-.29,y-.005,2.835),(x-.42,y-.04,2.76),(x-.45,y-.025,2.63)]
    cable('Lamp curved leaf tip',crest,.023,patina)
    shade_x=x-.235;shade_y=y-.025
    # The reference shade is a tall amber bell with a rolled lower glass rim.
    bottom=2.35 if variant==1 else 2.32 if variant==2 else 2.38;top=2.76
    prof=[(bottom,.202),(bottom+.013,.219),(bottom+.032,.208),(bottom+.075,.181),(bottom+.15,.158),(top-.11,.135),(top-.035,.119),(top,.106)]
    frosted=glass_material('Lamp frosted honey glass',(1,.31,.002),.31);b=frosted.node_tree.nodes.get('Principled BSDF');b.inputs['Transmission Weight'].default_value=.58;b.inputs['Emission Strength'].default_value=.9
    nodes=frosted.node_tree.nodes;links=frosted.node_tree.links;tc=nodes.new('ShaderNodeTexCoord');sep=nodes.new('ShaderNodeSeparateXYZ');ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(1,.64,.004,1);ramp.color_ramp.elements[1].color=(.86,.105,.001,1);ramp.color_ramp.elements[1].position=.96;links.new(tc.outputs['Generated'],sep.inputs['Vector']);links.new(sep.outputs['Z'],ramp.inputs['Fac']);links.new(ramp.outputs['Color'],b.inputs['Base Color']);links.new(ramp.outputs['Color'],b.inputs['Emission Color'])
    inner=[(z+.004,r-.012) for z,r in reversed(prof)];lathe('Lamp amber reference shade',shade_x,shade_y,prof+inner+[prof[0]],frosted,segments=96)
    cylinder('Lamp small brass shade fitting',(shade_x,shade_y,top+.012),.092,.025,gold)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=.058,location=(shade_x,shade_y,bottom+.08));o=bpy.context.object;o.name='Lamp internal bulb';o.data.materials.append(bulb)
    # The bronze figure leans toward the outside, her gown merging visually with the leafy base.
    fx=x+({1:.04,2:.075,3:.005}[variant]);fy=y-.10;hshift=.055 if variant==2 else .02 if variant==3 else 0
    gown=lathe('Lamp bronze flowing figure',fx,fy,[(1.46,.085),(1.52,.115),(1.60,.09),(1.70,.064),(1.80,.049),(1.90,.034),(1.97,.046),(2.04,.058),(2.09,.037)],bronze_figure,ripple=.073)
    for v in gown.data.vertices:
        t=(v.co.z-1.46)/.63;v.co.x+=.07*math.sin(t*math.pi)-.09*t;v.co.z+=hshift*t
    hx=fx-.095;hz=2.15+hshift
    def ball(name,pos,scale):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=1,location=pos);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(bronze_figure);[setattr(p,'use_smooth',True) for p in o.data.polygons]
    ball('Lamp maiden oval head',(hx,fy,hz),(.055,.042,.062));ball('Lamp maiden hair bun',(hx-.028,fy+.035,hz+.028),(.043,.032,.033));ball('Lamp maiden nose',(hx-.038,fy-.026,hz-.009),(.015,.019,.012))
    cable('Lamp maiden neck',[(hx+.016,fy,2.08+hshift),(hx,fy,hz-.046)],.024,bronze_figure)
    cable('Lamp maiden reaching arm',[(hx+.05,fy,2.06+hshift),(hx+.14,fy-.012,2.08+hshift),(x+.13,y-.035,2.075+hshift),(x+.25,y+.01,2.08+hshift)],.017,bronze_figure)
    ball('Lamp maiden hand',(x+.26,y+.018,2.08+hshift),(.028,.016,.018))
    cable('Lamp maiden hanging arm',[(hx-.025,fy,2.05+hshift),(hx-.05,fy-.01,1.94+hshift),(hx-.037,fy-.025,1.80+hshift)],.014,bronze_figure)
    ball('Lamp maiden lowered hand',(hx-.037,fy-.025,1.79+hshift),(.015,.013,.027))

def section_mesh(name, rings, material):
    """Join ordered cross sections into a closed, smooth volume."""
    width=len(rings[0])
    vertices=[point for ring in rings for point in ring]
    faces=[tuple(reversed(range(width)))]
    for start in range(0,len(vertices)-width,width):
        for i in range(width):
            a=start+i
            b=start+(i+1)%width
            faces.append((a,b,b+width,a+width))
    faces.append(tuple(range(len(vertices)-width,len(vertices))))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(material)
    for face in mesh.polygons:face.use_smooth=True
    return mesh

def interpolated_sections(rows, steps=4):
    for i in range(len(rows)-1):
        a,b=Vector(rows[i]),Vector(rows[i+1])
        prev=Vector(rows[max(0,i-1)])
        following=Vector(rows[min(i+2,len(rows)-1)])
        for j in range(steps):
            t=j/steps
            yield (2*a+(b-prev)*t+(2*prev-5*a+4*b-following)*t*t+(-prev+3*a-3*b+following)*t*t*t)*.5
    yield Vector(rows[-1])

def sculpted_lamp(x,y):
    # Dimensions in the supplied front photograph. Each row gives height in
    # pixels, left and right contour, half-depth, and depth of the centreline.
    scale=.00345
    def point(u,v,d):
        return (x+(u-118)*scale,y+d*scale,1.34+(465-v)*scale)
    photo=os.path.join(os.path.dirname(__file__),'reference','lamp.png')
    pixels=list(bpy.data.images.load(photo,check_existing=True).pixels) if os.path.isfile(photo) else None
    def colored_material(original,name):
        material=original.copy()
        material.name=name
        node=material.node_tree.nodes.new('ShaderNodeVertexColor')
        node.layer_name='SurfaceTint'
        material.node_tree.links.new(node.outputs['Color'],material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
        return material
    jade=colored_material(patina,'Moulded green art glass')
    brass=colored_material(bronze_figure,'Hand finished brass')
    def sculpt(name,rows,mat,flute=0):
        rings=[]
        colors=[]
        for v,left,right,depth,center in interpolated_sections(rows):
            radius=max(.25,(right-left)/2)
            ring=[]
            for j in range(40):
                a=j*math.tau/40
                u=(left+right)/2+radius*math.cos(a)
                d=center+max(.3,depth)*math.sin(a)*(1+flute*math.cos(8*a+v*.014))
                ring.append(point(u,v,d))
                sample_x=min(235,max(0,round((left+right)/2+.84*radius*math.cos(a))))
                index=((472-min(472,max(0,round(v))))*236+sample_x)*4
                rgb=pixels[index:index+3] if pixels else None
                if rgb is None or min(rgb)>.78:rgb=(.30,.40,.17) if mat==jade else (.55,.29,.075)
                colors.append((*rgb,1))
            rings.append(ring)
        mesh=section_mesh('Lamp '+name,rings,mat)
        layer=mesh.color_attributes.new(name='SurfaceTint',type='FLOAT_COLOR',domain='POINT')
        for data,color in zip(layer.data,colors):data.color=color
    sculpt('swept glass standard',[(462,70,114,8,0),(455,42,146,29,0),(443,53,173,38,0),(426,59,195,37,0),(408,94,201,28,0),(382,133,204,20,0),(345,159,208,17,0),(295,179,211,13,0),(250,185,210,11,0),(205,181,205,10,0),(160,171,196,9,0),(120,155,182,9,0),(91,139,166,9,0),(68,124,151,8,0),(49,119,135,5,0)],jade,.15)
    # Bent oval toe, open inside the curl. Its back half meets the cast standard.
    cable('Lamp glass toe',[point(u,v,d) for u,v,d in [(106,403,9),(61,412,7),(32,427,1),(26,442,-8),(38,453,-14),(86,460,-18),(137,453,-12),(170,437,0)]],.017,patina)
    sculpt('folded leaf canopy',[(75,24,48,5,-4),(68,26,120,13,-4),(60,31,130,21,-3),(52,43,129,24,-1),(43,69,125,18,0),(32,88,118,13,1),(19,101,115,7,2),(10,111,114,1,2)],jade,.13)
    sculpt('pendant leaf tip',[(117,21,23,1,-5),(105,20,26,3,-5),(90,20,32,5,-5),(75,23,44,8,-4),(62,30,51,9,-4)],jade)
    sculpt('inner leaf tip',[(100,56,58,1,-5),(90,51,59,3,-5),(78,48,61,4,-4),(65,49,70,6,-3)],jade)
    # Bell has a return wall and a rolled lip, with air between it and the stem.
    bell=glass_material('Satin amber pendant glass',(.93,.31,.006),.29)
    bs=bell.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Transmission Weight'].default_value=.53
    bs.inputs['Emission Color'].default_value=(1,.38,.004,1)
    bs.inputs['Emission Strength'].default_value=.52
    profile=[(184,41),(182,46),(179,47),(176,44),(169,40),(148,37),(120,33),(95,30),(80,28),(75,24)]
    shell=[(point(0,v,0)[2],r*scale) for v,r in profile]
    lathe('Lamp rolled amber glass bell',point(99,0,0)[0],y,shell+[(h,r-.008) for h,r in reversed(shell)]+[shell[0]],bell)
    cylinder('Lamp pendant socket',point(99,74,0),.082,.023,gold)
    sculpt('gown and torso',[(389,144,147,2,-8),(375,145,157,7,-9),(350,149,164,9,-10),(325,154,173,12,-11),(304,158,181,13,-12),(288,155,178,10,-12),(278,146,172,11,-13),(267,139,162,10,-13),(260,137,153,6,-13)],brass,.13)
    sculpt('bowed head',[(269,127,137,3,-12),(265,122,140,8,-14),(258,121,146,11,-14),(249,120,145,10,-14),(242,126,140,5,-14)],brass)
    sculpt('lowered arm',[(345,138,142,2,-19),(339,137,145,4,-19),(329,139,145,3,-19),(305,140,146,4,-17),(283,138,146,5,-16),(269,138,150,6,-15)],brass)
    cable('Lamp outstretched brass arm',[point(u,v,d) for u,v,d in [(148,268,-14),(158,264,-15),(170,263,-16),(184,262,-13),(188,261,-7)]],.0135,bronze_figure)

def sculpted_bird(x,y):
    z=planter('Bird of paradise',x,y,.29,.40)
    for dx,dy,h in [(-.40,.15,.89),(.44,.24,.98),(-.24,.32,1.13),(.32,-.03,.68)]:
        root=(x+dx*.18,y+dy*.2,z+h*.32)
        cable('Bird of paradise leaf stem',[(x,y,z),root],.012,leaf_dark)
        strelitzia_leaf(root,(x+dx,y+dy,z+h),.24,(dx,-1,.05))
    orange=mat('Tangerine sepals',(.96,.185,.009),.42)
    indigo=mat('Indigo fused petals',(.045,.009,.102),.38)
    bract=mat('Glaucous spathe',(.16,.30,.079),.47)
    for material in (orange,indigo,bract):
        color=material.node_tree.nodes.new('ShaderNodeVertexColor')
        color.layer_name='PetalTint'
        material.node_tree.links.new(color.outputs['Color'],material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    for dx,dy,h,size,turn in [(-.10,.14,1.23,1.0,-.12),(.27,-.02,.82,.82,.49),(-.38,-.12,.62,.66,-.58)]:
        base=Vector((x+dx,y+dy,z+h))
        def at(u,d,v):
            return base+size*Vector((u*math.cos(turn)-d*math.sin(turn),u*math.sin(turn)+d*math.cos(turn),v))
        cable('Bird of paradise flower stem',[(x,y,z),(x+dx*.38,y+dy*.3,z+h*.46),at(-.016,0,-.12),at(0,0,0)],.014*size,leaf_dark)
        def blade(name,rows,material):
            rings=[]
            for u,v,d,w,thick in interpolated_sections(rows):
                # Folded cross section: broad faces share a pronounced keel.
                rings.append([at(u+w*math.cos(a),d+thick*math.sin(a)*(1-.32*abs(math.cos(a))),v)
                              for a in [j*math.tau/20 for j in range(20)]])
            mesh=section_mesh('Bird of paradise '+name,rings,material)
            layer=mesh.color_attributes.new(name='PetalTint',type='FLOAT_COLOR',domain='POINT')
            for i,entry in enumerate(layer.data):
                t=(i//20)/(len(rings)-1)
                angle=(i%20)*math.tau/20
                ridge=(1+math.cos(2*angle))*.5
                if material==bract:
                    fleck=.5+.5*math.sin(i*41.73)
                    rgb=(.06+.12*ridge+.08*t,.14+.12*ridge+.07*fleck,.028+.035*ridge)
                elif material==orange:
                    rgb=(.55+.43*ridge,.067+.18*t+.055*ridge,.002+.008*ridge)
                else:
                    rgb=(.017+.051*ridge,.004+.011*t,.044+.10*ridge)
                entry.color=(*rgb,1)
        blade('boat shaped spathe',[(0,-.13,0,.01,.012),(-.012,-.055,0,.052,.046),(-.023,.035,0,.077,.060),(-.09,.17,.014,.052,.046),(-.17,.33,.033,.037,.029),(-.26,.53,.052,.018,.015),(-.322,.69,.072,.001,.001)],bract)
        blade('upright sepal',[(.005,.030,-.038,.012,.008),(.004,.11,-.050,.024,.013),(-.022,.21,-.048,.018,.009),(-.070,.35,-.023,.008,.004),(-.112,.46,-.010,.001,.001)],orange)
        blade('forward sepal',[(0,.028,-.008,.017,.008),(.048,.08,-.025,.045,.014),(.137,.151,-.032,.055,.013),(.252,.235,-.011,.035,.008),(.394,.325,.015,.001,.001)],orange)
        blade('rear sepal',[(.013,.048,.016,.012,.006),(.084,.103,.038,.027,.009),(.211,.188,.073,.036,.010),(.339,.288,.096,.001,.001)],orange)
        blade('folded violet tongue',[(.006,.06,-.018,.012,.006),(.03,.108,-.022,.032,.014),(.060,.17,-.019,.018,.009),(.075,.263,-.007,.009,.006),(.115,.363,.005,.001,.001)],indigo)


def render_asset(name):
    # Asset-only review mode: build and render before the desk is assembled.
    if VARIANT and name in ('lamp','bird'):
        (reference_lamp if name=='lamp' else reference_bird)(0,0,VARIANT)
    else:{'orchid':orchid,'bird':sculpted_bird,'lamp':sculpted_lamp,'contact':contact_holder}[name](0,0)
    if name=='contact':
        for label,loc,size in [('WENYI YE',(-.31,.070,1.88),.043),('CONTACT',(-.31,.070,1.80),.024),('ywywywy@berkeley.edu',(-.31,.070,1.70),.031),('Email   /   LinkedIn   /   GitHub',(-.31,.070,1.61),.022)]:
            bpy.ops.object.text_add(location=loc,rotation=(math.pi/2,0,0));o=bpy.context.object;o.data.body=label;o.data.size=size;o.data.materials.append(dark)
        for i,label in enumerate(('EMAIL','LINKEDIN','GITHUB','INSTAGRAM')):
            x=(-.25,-.08,.09,.26)[i];bpy.ops.object.text_add(location=(x-.062,.113,1.969),rotation=(math.pi/2,0,0));o=bpy.context.object;o.data.body=label;o.data.size=.019;o.data.materials.append(paper)
    box('Neutral studio surface',(0,0,1.27),(5,5,.14),mat('Review backdrop',(.32,.29,.24),.9),.01)
    scene=bpy.context.scene;target=Vector((0,0,2.18 if name!='contact' else 1.67));loc=(2.7,-4.4,3.5) if name!='contact' else (1.6,-2.1,2.65)
    if name=='lamp':target=Vector((-.02,0,2.16));loc=(.15,-5,2.65)
    if name=='bird':target=Vector((0,0,2.88));loc=(.35,-5,3.12)
    if '--oblique' in sys.argv:loc=(2.35,-4.5,target.z+.45)
    bpy.ops.object.camera_add(location=loc);cam=bpy.context.object;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=(2.0 if name=='lamp' else 1.82) if name in ('lamp','bird') else (2.35 if name!='contact' else 1.55);scene.camera=cam
    scene.world.color=(.27,.25,.22)
    for loc,power,size,color in [((-3,-4,5),1050,3,(1,.87,.72)),((3,-1,4),550,2.5,(.91,.97,1))]:
        bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.size=size;l.data.color=color;l.rotation_euler=(target-l.location).to_track_quat('-Z','Y').to_euler()
    scene.render.engine='CYCLES';scene.cycles.use_denoising=False;scene.cycles.samples=48 if VARIANT else 64;scene.render.resolution_x=900 if VARIANT else 1000;scene.render.resolution_y=900 if VARIANT else 1000;scene.render.resolution_percentage=100
    project_dir=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    review_dir=os.environ.get('STUDIO_ASSET_RENDER_DIR',os.path.join(project_dir,'asset-review'));os.makedirs(review_dir,exist_ok=True)
    scene.render.filepath=os.path.join(review_dir,f'asset-{name}'+(f'-{VARIANT}' if VARIANT else '')+'.png');bpy.ops.render.render(write_still=True)

if '--asset' in sys.argv:
    render_asset(sys.argv[sys.argv.index('--asset')+1]);raise SystemExit(0)

def merge_botanical_meshes(prefix):
    material_groups={}
    for ob in list(bpy.context.scene.objects):
        if ob.type=='MESH' and ob.name.startswith(prefix):
            key=ob.data.materials[0].name if ob.data.materials else ''
            material_groups.setdefault(key,[]).append(ob)
    for material,objects in material_groups.items():
        if len(objects)<2:continue
        bpy.ops.object.select_all(action='DESELECT')
        for ob in objects:ob.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=prefix+' '+material

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
    box(f'Degree navy mat_{i}',(x,2.132,z),(1.15,.025,.70),navy,.005,education)
    box(f'Degree gilded inner edge_{i}',(x,2.113,z),(1.04,.013,.61),gold,.003,education)
    box(f'Degree paper_{i}',(x,2.104,z),(1.00,.013,.57),paper,.005,education)
    surface(f'degree_texture_{i}',(x,2.094,z),.98,.55,paper,True,education)

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

# Deliberate foreground/background layering: the orchids partially hide the
# higher strelitzia and left photographs; the journal overlaps the card holder.
sculpted_lamp(3.02,1.30)
contact_holder(2.62,.23)
# A porcelain trinket dish and fountain pen add an understated personal touch.
cylinder('Porcelain rose tray',(-2.43,-.83,1.374),.23,.045,rose)
cylinder('Porcelain tray interior',(-2.43,-.83,1.40),.20,.012,paper)
rod('Fountain pen barrel',(-1.03,.42,1.38),(-1.65,.85,1.38),.034,burgundy)
rod('Fountain pen brass trim',(-1.31,.61,1.38),(-1.36,.64,1.38),.036,gold)
sculpted_bird(-2.25,1.39)
orchid(-2.93,.54)
merge_botanical_meshes('Orchid');merge_botanical_meshes('Bird of paradise')

out=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','public','studio.glb'))
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_apply=True,export_materials='EXPORT',export_yup=True)
with open(out,'rb') as source, open(out+'.gz','wb') as dest:
    dest.write(gzip.compress(source.read(),compresslevel=9,mtime=0))
print('STUDIO_EXPORT',out,os.path.getsize(out))
