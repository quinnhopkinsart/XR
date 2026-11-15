# Beaded Flowers: FBX card meshes -> one small .glb (geometry only, Y up, metres).
# Run with Blender's Python module:  python3 export_glb.py -- <fbx folder> <out.glb>
# Each mesh keeps POSITION, NORMAL, TEXCOORD_0 and _WIND (the wind_mask vertex colour, red channel).
# Textures ship beside the model as WebP, so nothing is embedded here.
import bpy, bmesh, sys, os, json, struct
src, out = sys.argv[sys.argv.index('--')+1:][:2]
NAMES = {'Asters':'asters','Beadwork2D':'spray','Blueberry':'blueberry','Coneflowers':'coneflowers',
         'PrairieCrocus':'prairie-crocus','TableFlowers':'table-flowers','WildRice':'wild-rice',
         'WolfWillow':'wolf-willow','SM_BeadPath':'bead-path'}
bin_ = bytearray(); views=[]; accs=[]; meshes=[]; nodes=[]; report={}
def add(data, fmt, comp, typ, target, mn=None, mx=None, count=None):
    while len(bin_)%4: bin_.append(0)
    off=len(bin_); bin_.extend(data)
    views.append({'buffer':0,'byteOffset':off,'byteLength':len(data),'target':target})
    a={'bufferView':len(views)-1,'componentType':comp,'count':count,'type':typ}
    if mn: a['min']=mn; a['max']=mx
    accs.append(a); return len(accs)-1
for f in sorted(os.listdir(src)):
    if not f.endswith('.fbx'): continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=os.path.join(src,f))
    ob=[o for o in bpy.data.objects if o.type=='MESH'][0]
    for m in list(ob.modifiers): ob.modifiers.remove(m)   # drop the armature: rest pose
    me=ob.data
    bm=bmesh.new(); bm.from_mesh(me); bmesh.ops.triangulate(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    mw=ob.matrix_world; n3=mw.to_3x3().inverted().transposed()
    uv=me.uv_layers.active.data
    col=me.color_attributes.get('wind_mask')
    key={}; P=[];N=[];U=[];W=[];I=[]
    for poly in me.polygons:
        for li in poly.loop_indices:
            l=me.loops[li]; v=me.vertices[l.vertex_index]
            p=mw@v.co; n=(n3@l.normal).normalized() if hasattr(l,'normal') else (n3@v.normal).normalized()
            u=uv[li].uv
            w=0.0
            if col: w=col.data[l.vertex_index if col.domain=='POINT' else li].color[0]
            k=(round(p.x,5),round(p.y,5),round(p.z,5),round(n.x,3),round(n.y,3),round(n.z,3),round(u.x,5),round(u.y,5))
            if k not in key:
                key[k]=len(P)//3
                P+= [p.x,p.z,-p.y]; N+=[n.x,n.z,-n.y]; U+=[u.x,1-u.y]; W.append(w)
            I.append(key[k])
    cnt=len(W); xs=P[0::3]; ys=P[1::3]; zs=P[2::3]
    prim={'attributes':{
        'POSITION':add(struct.pack(f'{len(P)}f',*P),'f',5126,'VEC3',34962,[min(xs),min(ys),min(zs)],[max(xs),max(ys),max(zs)],cnt),
        'NORMAL':add(struct.pack(f'{len(N)}f',*N),'f',5126,'VEC3',34962,count=cnt),
        'TEXCOORD_0':add(struct.pack(f'{len(U)}f',*U),'f',5126,'VEC2',34962,count=cnt),
        '_WIND':add(struct.pack(f'{len(W)}f',*W),'f',5126,'SCALAR',34962,count=cnt)},
        'indices':add(struct.pack(f'{len(I)}H',*I),'H',5123,'SCALAR',34963,count=len(I))}
    name=NAMES[f[:-4]]
    meshes.append({'name':name,'primitives':[prim]}); nodes.append({'name':name,'mesh':len(meshes)-1})
    report[name]={'tris':len(I)//3,'verts':cnt,'size':[round(max(xs)-min(xs),3),round(max(ys)-min(ys),3),round(max(zs)-min(zs),3)],
                  'min':[round(min(xs),3),round(min(ys),3),round(min(zs),3)],'wind':[round(min(W),2),round(max(W),2)]}
while len(bin_)%4: bin_.append(0)
g={'asset':{'version':'2.0','generator':'Noodin Studio export_glb.py'},'scene':0,'scenes':[{'nodes':list(range(len(nodes)))}],
   'nodes':nodes,'meshes':meshes,'accessors':accs,'bufferViews':views,'buffers':[{'byteLength':len(bin_)}]}
j=json.dumps(g,separators=(',',':')).encode(); j+=b' '*((4-len(j)%4)%4)
with open(out,'wb') as fh:
    fh.write(struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(bin_)))
    fh.write(struct.pack('<I4s',len(j),b'JSON')); fh.write(j)
    fh.write(struct.pack('<I4s',len(bin_),b'BIN\0')); fh.write(bin_)
print('REPORT',json.dumps(report))
