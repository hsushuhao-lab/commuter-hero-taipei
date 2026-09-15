# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow"]
# ///
# ─── How to run ───
# python3 V984_RECOVERY/build_shakira_true_run_v2.py
from pathlib import Path
from typing import Final
import hashlib
import shutil
import numpy as np
from PIL import Image

REPO: Final = Path(__file__).resolve().parents[1]
BASE: Final = REPO / "assets/chibi_shakira_clean.png"
OUT: Final = REPO / "assets/shakira_run_keyframes_v2"
MIRROR: Final = REPO / "source/assets/shakira_run_keyframes_v2"
QA: Final = REPO / "QA_V9_8_4"
POSES: Final = (
    ((-15, 8), (14, -8), (-18, 5), (20, -7), (0, 0)),
    ((-10, 12), (10, -12), (-8, 10), (9, -12), (0, 4)),
    ((8, -5), (-8, 5), (3, -16), (-3, 14), (0, -2)),
    ((14, -8), (-15, 8), (20, -7), (-18, 5), (0, 0)),
    ((10, -12), (-10, 12), (9, -12), (-8, 10), (0, 4)),
    ((-8, 5), (8, -5), (-3, 14), (3, -16), (0, -2)),
)

def remap(image: Image.Image, pose: tuple[tuple[int, int], ...]) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8)
    height, width = rgba.shape[:2]
    yy, xx = np.indices((height, width), dtype=np.float32)
    sx, sy = xx.copy(), yy.copy()
    controls = ((0.31, 0.56), (0.69, 0.56), (0.38, 0.82), (0.62, 0.82), (0.50, 0.68))
    radii = ((0.16, 0.18), (0.16, 0.18), (0.15, 0.20), (0.15, 0.20), (0.22, 0.16))
    for (nx, ny), (rx, ry), (dx, dy) in zip(controls, radii, pose, strict=True):
        weight = np.exp(-(((xx-width*nx)/(width*rx))**2 + ((yy-height*ny)/(height*ry))**2)*2.1)
        sx -= dx * weight; sy -= dy * weight
    trail = np.exp(-(((xx-width*0.24)/(width*0.20))**2 + ((yy-height*0.32)/(height*0.26))**2)*2.0)
    sx += 4.0 * trail
    x0=np.floor(sx).astype(np.int32); y0=np.floor(sy).astype(np.int32)
    x1=x0+1; y1=y0+1
    x0=np.clip(x0,0,width-1); x1=np.clip(x1,0,width-1); y0=np.clip(y0,0,height-1); y1=np.clip(y1,0,height-1)
    wx=(sx-np.floor(sx))[...,None]; wy=(sy-np.floor(sy))[...,None]
    out=(rgba[y0,x0]*(1-wx)*(1-wy)+rgba[y0,x1]*wx*(1-wy)+rgba[y1,x0]*(1-wx)*wy+rgba[y1,x1]*wx*wy)
    return Image.fromarray(np.clip(out,0,255).astype(np.uint8), "RGBA")

def main() -> None:
    base=Image.open(BASE).convert("RGBA")
    bbox=base.getbbox()
    if bbox is not None: base=base.crop(bbox)
    OUT.mkdir(parents=True,exist_ok=True); MIRROR.mkdir(parents=True,exist_ok=True); QA.mkdir(parents=True,exist_ok=True)
    frames=[]
    for number,pose in enumerate(POSES,start=8):
        frame=remap(base,pose)
        path=OUT/f"shakira_run_{number:02d}.png"; frame.save(path,optimize=True)
        shutil.copy2(path,MIRROR/path.name); shutil.copy2(path,QA/f"shakira_run_v2_{number:02d}.png")
        frames.append(frame)
    cell=max(max(f.size) for f in frames); strip=Image.new("RGBA",(cell*6,cell),(0,0,0,0))
    for i,f in enumerate(frames): strip.alpha_composite(f,(i*cell+(cell-f.width)//2,cell-f.height))
    strip.save(QA/"shakira_run_v2_strip.png",optimize=True)
    gif_frames=[]
    for f in frames:
        canvas=Image.new("RGBA",(cell,cell),(0,0,0,0)); canvas.alpha_composite(f,((cell-f.width)//2,cell-f.height)); gif_frames.append(canvas)
    gif_frames[0].save(QA/"shakira_run_v2_right.gif",save_all=True,append_images=gif_frames[1:],duration=91,loop=0,disposal=2)
    left=[f.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for f in gif_frames]
    left[0].save(QA/"shakira_run_v2_left.gif",save_all=True,append_images=left[1:],duration=91,loop=0,disposal=2)
    gif_frames[0].save(QA/"shakira_run_v2_footplant.gif",save_all=True,append_images=gif_frames[1:],duration=125,loop=0,disposal=2)
    print("generated",len(frames),"true-run poses",hashlib.sha256(strip.tobytes()).hexdigest()[:16])
if __name__ == "__main__": main()
