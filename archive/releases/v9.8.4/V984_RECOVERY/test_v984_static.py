# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow"]
# ///
# ─── How to run ───
# python3 V984_RECOVERY/test_v984_static.py
from pathlib import Path
from typing import Final
import hashlib
import re
import numpy as np
from PIL import Image

REPO: Final = Path(__file__).resolve().parents[1]

def text(path: str) -> str:
    return (REPO / path).read_text(encoding="utf-8")

def require(condition: bool, name: str) -> None:
    if not condition:
        raise AssertionError(name)
    print(f"PASS {name}")

def main() -> None:
    main_js=text("source/src/main.js"); hud=text("source/src/ui/HUD.js"); chars=text("source/src/data/Characters.js")
    player=text("source/src/entities/Player.js"); boss=text("source/src/entities/Boss.js"); proj=text("source/src/entities/Projectiles.js")
    generator=text("scripts/generate_hero_spritesheets.py")
    companion=main_js[main_js.index("  renderCompanions(ctx) {"):main_js.index("  renderDialogueBubbles(ctx) {")]
    require("this.player.render" not in companion and "Also render the PLAYER" not in companion,"victory selected player not redrawn")
    require("x: 882, y: 18, w: 62" in hud and "x: 864, y: 18, w: 80" in hud,"pause positions 882/864")
    speeds=[int(v) for v in re.findall(r"speed:\s*(\d+)",chars)]
    require(speeds[0]==370 and speeds[1]==320 and speeds[2]==345,"hero speeds 370/345/320")
    require('"shakira_run_keyframes_v2"' in generator and "legacy_shakira_run_preview_only" in generator,"Shakira v2 production loader")
    paths=sorted((REPO/"assets/shakira_run_keyframes_v2").glob("shakira_run_*.png")); require(len(paths)==6,"six Shakira poses")
    alpha=[np.asarray(Image.open(p).convert("RGBA"))[:,:,3]>20 for p in paths]
    deltas=[]
    for a,b in zip(alpha[:-1],alpha[1:],strict=True):
        h=min(a.shape[0],b.shape[0]); w=min(a.shape[1],b.shape[1]); deltas.append(float(np.mean(a[:h,:w]!=b[:h,:w])))
    require(min(deltas)>0.002,"adjacent silhouette material difference")
    for left,right in ((0,3),(1,4),(2,5)):
        a,b=alpha[left],alpha[right]; h=min(a.shape[0],b.shape[0]); w=min(a.shape[1],b.shape[1])
        require(float(np.mean(a[int(h*.60):h,:w]!=b[int(h*.60):h,:w]))>0.003,f"opposite leg regions {left+8}/{right+8}")
        require(float(np.mean(a[int(h*.35):int(h*.72),:w]!=b[int(h*.35):int(h*.72),:w]))>0.002,f"opposite arm regions {left+8}/{right+8}")
    for p in paths:
        mirror=REPO/"source/assets/shakira_run_keyframes_v2"/p.name
        require(hashlib.sha256(p.read_bytes()).digest()==hashlib.sha256(mirror.read_bytes()).digest(),f"asset mirror {p.name}")
    require("for (let wave = 0; wave < 3; wave++)" in player and "for (let index = 0; index < 7; index++)" in player and "[0, 0.26, 0.56][wave]" in player and "const eggDmg = 23;" in player,"Shakira 3x7 ult")
    require("type: 'umbrella_wave'" in player and "[0, 0.18, 0.36][wave]" in player and "const waveDamage = 43;" in player,"Yu 3x4 umbrella ult")
    require("this.phase === 2 ? 0.36 : 0.82" in boss and "step === 4 ? 0.50 : 0.36" in boss,"Boss cadence/breathing")
    require("const count = 15" in boss and "const count = 26" in boss and "i < 32" in boss,"Boss petals 15/26/32")
    require("phase2 ? 12 : 7" in boss and "attackPhase === 2 ? 56 : 28" in proj,"Boss bubbles/caps")
    require("visualOnly: true" in boss,"Boss visual-only particles")
    root=(REPO/"index.html").read_bytes(); dist=(REPO/"dist/index.html").read_bytes()
    require(root==dist,"root/dist SHA parity"); require(b"v9.8.4" in root,"built version v9.8.4")
    print("ROOT_SHA256",hashlib.sha256(root).hexdigest())
if __name__=="__main__": main()
