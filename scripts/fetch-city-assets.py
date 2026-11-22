"""Fetch the CC0 exterior assets from the Poly Haven API, with checksums."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import subprocess

root = Path(__file__).parent / 'studio-textures' / 'city'
root.mkdir(parents=True, exist_ok=True)

def files(asset):
    return json.loads(subprocess.check_output(['curl','--fail','--silent','--show-error','--location','--max-time','30','https://api.polyhaven.com/files/'+asset]))

def fetch(spec, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and hashlib.md5(path.read_bytes()).hexdigest()==spec['md5']:
        return
    data=subprocess.check_output(['curl','--fail','--silent','--show-error','--location','--max-time','75',spec['url']])
    if hashlib.md5(data).hexdigest()!=spec['md5']:
        raise ValueError(f'Checksum mismatch: {path}')
    path.write_bytes(data)

jobs=[]
for asset in ['weathered_plank_siding','roof_slates_02','asphalt_02','brick_wall_003','plastered_wall_02']:
    data=files(asset)
    for channel in ['Diffuse','nor_gl','Rough']:
        jobs.append((data[channel]['1k']['jpg'],root/asset/(channel+'.jpg')))
sky=files('kloofendal_38d_partly_cloudy_puresky')['hdri']['2k']['hdr']
jobs.append((sky,root/'sky.hdr'))
shrub=files('shrub_01')['gltf']['1k']['gltf']
jobs.append((shrub,root/'shrub_01'/'shrub_01.gltf'))
for path,spec in shrub['include'].items():
    jobs.append((spec,root/'shrub_01'/path))
with ThreadPoolExecutor(max_workers=6) as executor:
    list(executor.map(lambda job:fetch(*job),jobs))
print(f'Fetched and verified {len(jobs)} assets')

# The scanned siding is bare dark wood. Derive six painted finishes from its
# measured grain while preserving the original normal and roughness textures.
from PIL import Image
import numpy as np
source=np.asarray(Image.open(root/'weathered_plank_siding'/'Diffuse.jpg').convert('RGB'),dtype=np.float32)
gray=source.mean(axis=2)
grain=np.clip((gray-np.median(gray))*.43,-35,35)
paint={'sage':(137,166,143),'ochre':(218,177,118),'rose':(185,127,125),'blue':(125,156,184),'cream':(226,213,182),'lavender':(168,150,181)}
for name,color in paint.items():
    rgb=np.clip(np.asarray(color)[None,None,:]+grain[:,:,None],0,255).astype(np.uint8)
    Image.fromarray(rgb).save(root/'weathered_plank_siding'/('Paint-'+name+'.jpg'),quality=93)
