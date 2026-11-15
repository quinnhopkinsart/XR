# Spreads each atlas's bead colours out into its transparent area, so mipmaps and filtering
# never mix in the black that sits under alpha 0. Writes WebP with the colour kept (exact).
#   python3 pad_atlas.py <in.png> <out.webp> [size]
import sys, numpy as np
from PIL import Image
from scipy import ndimage
src, out = sys.argv[1], sys.argv[2]
size = int(sys.argv[3]) if len(sys.argv) > 3 else None
im = Image.open(src).convert('RGBA')
a = np.asarray(im).astype(np.float32)
rgb, alpha = a[..., :3], a[..., 3]
solid = alpha > 8
idx = ndimage.distance_transform_edt(~solid, return_distances=False, return_indices=True)
rgb = rgb[idx[0], idx[1]]
res = Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), 'RGBA')
if size and max(res.size) > size:
    r = size / max(res.size); res = res.resize((round(res.width*r), round(res.height*r)), Image.LANCZOS)
res.save(out, 'WEBP', quality=88, alpha_quality=96, exact=True, method=6)
