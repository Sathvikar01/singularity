"""Generate optional Singularity GLB art. Run with Blender 3.6+."""
import bpy
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]/"art"/"generated";ROOT.mkdir(parents=True,exist_ok=True)
for o in list(bpy.data.objects): bpy.data.objects.remove(o,do_unlink=True)
def mat(n,c,m=0,r=.5):
 x=bpy.data.materials.new(n);x.diffuse_color=(*c,1);x.metallic=m;x.roughness=r;return x
coral=mat("Coral",(1,.28,.2),.15,.35);mint=mat("Mint",(.45,1,.78),.2,.3);dark=mat("Frame",(.035,.1,.14),.6,.28);gold=mat("Cargo",(1,.62,.12),.2,.3);ivory=mat("Platform",(.72,.82,.8),.05,.65)
def cube(n,p,s,m):
 bpy.ops.mesh.primitive_cube_add(location=p);o=bpy.context.object;o.name=n;o.scale=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m);b=o.modifiers.new("Soft edges","BEVEL");b.width=.08;b.segments=3;return o
def sphere(n,p,r,m):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=r,location=p);o=bpy.context.object;o.name=n;o.data.materials.append(m);bpy.ops.object.shade_smooth();return o
def rod(n,a,b,r,m):
 a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.name=n;o.data.materials.append(m);o.rotation_mode='QUATERNION';o.rotation_quaternion=d.to_track_quat('Z','Y');return o
def export(n,items):
 bpy.ops.object.select_all(action='DESELECT');[x.select_set(True) for x in items];bpy.context.view_layer.objects.active=items[0];bpy.ops.export_scene.gltf(filepath=str(ROOT/n),export_format='GLB',use_selection=True,export_materials='EXPORT')
pts=[(0,2,0),(0,3,0),(-1,2,0),(1,2,0),(-.45,.35,0),(.45,.35,0)];items=[sphere(["TorsoBack","EyesHead","LeftArm","RightArm","LeftLeg","RightLeg"][i],p,.48 if i<2 else .3,coral if i<2 else dark) for i,p in enumerate(pts)]
for i,(a,b) in enumerate([(0,1),(0,2),(0,3),(0,4),(0,5),(4,5),(1,2),(1,3)]):items.append(rod("Joint_%d"%i,pts[a],pts[b],.13,mint if i<5 else dark))
export("singularity_body.glb",items)
course=[]
for z,d in [(1,12),(21,12),(36,18)]:course += [cube("Platform_%d"%z,(0,-.4,z),(4.6,.35,d/2),ivory),cube("Underframe_%d"%z,(0,-.85,z),(4.8,.1,d/2+.15),dark)]
for z in range(7,15):course.append(cube("BridgeSlat_%d"%z,(0,0,z),(1.3,.03,.08),mint))
export("course_modules.glb",course)
export("cargo_and_finish.glb",[cube("CargoCube",(0,.5,18),(.45,.45,.45),gold),cube("FinishBeam",(0,6,42),(4,.3,.25),dark),rod("FinishPostL",(-3.8,0,42),(-3.8,6,42),.15,dark),rod("FinishPostR",(3.8,0,42),(3.8,6,42),.15,dark)])
print("Generated",ROOT)
