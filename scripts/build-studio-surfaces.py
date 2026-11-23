"""Build chevron parquet from scanned timber and a muted antique lacquer."""
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parent
out = root.parent / 'public' / 'studio-surfaces'
out.mkdir(parents=True, exist_ok=True)
scan = np.asarray(Image.open(root / 'studio-textures/city/weathered_plank_siding/Diffuse.jpg').convert('RGB'), dtype=np.float32)
scan = scan.mean(axis=2)
size, width = 2048, 256
y, x = np.mgrid[:size, :size]
col = x // width
direction = np.where(col % 2 == 0, 1, -1)
local_x = x % width
cross = y + direction * local_x
row = (cross // width) % 8
across = cross % width
rng = np.random.default_rng(143)
rgb = np.zeros((size, size, 3), dtype=np.float32)
height = np.zeros((size, size), dtype=np.float32)
# Rotate the grain along each plank, cropping different scanned patches.
for c in range(8):
    for r in range(8):
        mask = (col == c) & (row == r)
        along = (local_x[mask] * 1.5 + rng.integers(0, scan.shape[1])) % scan.shape[1]
        # Scan contains multiple horizontal boards; sample a single board strip.
        strip = rng.integers(0, 15) * 64 + 10
        sy = (strip + across[mask] * .17).astype(int) % scan.shape[0]
        source = scan[sy, along.astype(int)]
        variation = np.clip((source - np.median(source)) * .85, -35, 32)
        tone = rng.uniform(-13, 15)
        rgb[mask] = np.array([160, 115, 78]) + (variation + tone)[:, None] * np.array([1,.83,.66])
        height[mask] = 145 + variation * .8
seam = np.minimum.reduce([local_x, width-1-local_x, across, width-1-across])
rgb -= np.clip(3-seam, 0, 3)[...,None] * 8
height -= np.clip(4-seam, 0, 4) * 18
Image.fromarray(np.uint8(np.clip(rgb,0,255))).save(out/'chevron-oak.jpg',quality=92)
Image.fromarray(np.uint8(np.clip(height,0,255))).save(out/'chevron-height.jpg',quality=90)

grain = np.clip((scan-np.median(scan))*.15,-8,8)
lacquer = np.array([120,136,112]) + grain[...,None]*np.array([1,1,.85])  # approved A: #788870
Image.fromarray(np.uint8(np.clip(lacquer,0,255))).save(out/'olive-lacquer.jpg',quality=94)
