# Beaded Flowers: makes the small models for the home page's floating background.
# One .glb per flower, each with its own material and textures inside, taken from the
# viewer's files in public/builds/beaded-flowers/ (models/flowers.glb and tex/).
#   python3 scripts/beaded-flowers/build_field_models.py        (from the repo's top folder; needs Pillow)
# The viewer's normal maps are baked for Unreal (green points down). A .glb expects green
# up, so the green channel is turned over here.
import json, struct, io, os
from PIL import Image, ImageChops

BUILD = 'public/builds/beaded-flowers'
OUT = 'src/projects/beaded-flowers/models'
FLOWERS = ['asters', 'coneflowers', 'wild-rice', 'blueberry', 'prairie-crocus', 'wolf-willow', 'table-flowers', 'spray']

raw = open(f'{BUILD}/models/flowers.glb', 'rb').read()
jlen = struct.unpack_from('<I', raw, 12)[0]
src = json.loads(raw[20:20 + jlen])
blob = raw[20 + jlen + 8:]

def view(i):
    a = src['accessors'][i]; v = src['bufferViews'][a['bufferView']]
    return a, blob[v['byteOffset']:v['byteOffset'] + v['byteLength']]

def webp(img, quality):
    out = io.BytesIO(); img.save(out, 'WEBP', quality=quality, alpha_quality=95, exact=True, method=6); return out.getvalue()

os.makedirs(OUT, exist_ok=True)
for name in FLOWERS:
    mesh = next(m for m in src['meshes'] if m['name'] == name)['primitives'][0]
    colour = webp(Image.open(f'{BUILD}/tex/{name}-1k.webp').convert('RGBA'), 86)
    n = Image.open(f'{BUILD}/tex/{name}-n.webp').convert('RGB')
    r, g, b = n.split()
    normal = webp(Image.merge('RGB', (r, ImageChops.invert(g), b)), 82)

    out = bytearray(); views = []; accessors = []
    def add(data, target=None):
        while len(out) % 4: out.append(0)
        v = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)}
        if target: v['target'] = target
        out.extend(data); views.append(v); return len(views) - 1
    attributes = {}
    for key in ('POSITION', 'NORMAL', 'TEXCOORD_0'):
        a, data = view(mesh['attributes'][key])
        acc = {k: a[k] for k in ('componentType', 'count', 'type', 'min', 'max') if k in a}
        acc['bufferView'] = add(data, 34962); accessors.append(acc); attributes[key] = len(accessors) - 1
    a, data = view(mesh['indices'])
    accessors.append({'componentType': a['componentType'], 'count': a['count'], 'type': 'SCALAR', 'bufferView': add(data, 34963)})
    images = [{'bufferView': add(colour), 'mimeType': 'image/webp'}, {'bufferView': add(normal), 'mimeType': 'image/webp'}]
    while len(out) % 4: out.append(0)
    doc = {
        'asset': {'version': '2.0', 'generator': 'Noodin Studio build_field_models.py'},
        'extensionsUsed': ['EXT_texture_webp'], 'extensionsRequired': ['EXT_texture_webp'],
        'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'name': name, 'mesh': 0}],
        'meshes': [{'name': name, 'primitives': [{'attributes': attributes, 'indices': len(accessors) - 1, 'material': 0}]}],
        'materials': [{'name': name, 'doubleSided': True, 'alphaMode': 'MASK', 'alphaCutoff': 0.4,
                       'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 0.35},
                       'normalTexture': {'index': 1, 'scale': 1.4}}],
        'textures': [{'extensions': {'EXT_texture_webp': {'source': 0}}}, {'extensions': {'EXT_texture_webp': {'source': 1}}}],
        'images': images, 'accessors': accessors, 'bufferViews': views, 'buffers': [{'byteLength': len(out)}],
    }
    j = json.dumps(doc, separators=(',', ':')).encode(); j += b' ' * ((4 - len(j) % 4) % 4)
    with open(f'{OUT}/{name}.glb', 'wb') as fh:
        fh.write(struct.pack('<4sII', b'glTF', 2, 28 + len(j) + len(out)))
        fh.write(struct.pack('<I4s', len(j), b'JSON')); fh.write(j)
        fh.write(struct.pack('<I4s', len(out), b'BIN\0')); fh.write(out)
    print(name, os.path.getsize(f'{OUT}/{name}.glb') // 1024, 'KB')
