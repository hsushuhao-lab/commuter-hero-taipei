import os, glob
from PIL import Image
import numpy as np
from collections import deque

base_dir = r'c:\Users\Asher\Documents\game\08workbattle-v8_0-COMMUTER-HERO'
assets_dir = os.path.join(base_dir, 'assets')

f3_list = glob.glob(r'c:\Users\Asher\Documents\game\美術設計\*05_17_47 (3)*')
sheet3 = Image.open(f3_list[0]).convert('RGBA')
sw, sh = sheet3.size

col_w = sw / 7.0

# Precise columns for each monster
MONSTER_CONFIGS = [
    ('red', 0, 160, 420, 15, 15),
    ('ice', 1, 160, 420, 15, 15),
    ('grape', 2, 160, 420, 15, 15),
    ('blue', 3, 160, 420, 15, 15),
    ('yellow', 4, 160, 420, 15, 15),
    ('obsidian', 5, 160, 420, 15, 15),
    ('pink', 6, 160, 420, 15, 15)
]

for name, col_idx, y1, y2, pad_l, pad_r in MONSTER_CONFIGS:
    x1 = int(col_idx * col_w) + pad_l
    x2 = int((col_idx + 1) * col_w) - pad_r
    
    crop = sheet3.crop((x1, y1, x2, y2))
    arr = np.array(crop)
    h, w, _ = arr.shape
    
    # Outer border flood fill ONLY
    # Background in the card is pale cream/beige/white
    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    
    # Push outer border pixels
    for x in range(w):
        q.append((0, x)); visited[0, x] = True
        q.append((h - 1, x)); visited[h - 1, x] = True
    for y in range(h):
        q.append((y, 0)); visited[y, 0] = True
        q.append((y, w - 1)); visited[y, w - 1] = True
        
    def is_outer_bg(r, g, b, cx, cy):
        # Pale background of card
        if r > 200 and g > 195 and b > 185:
            return True
        if r > 185 and g > 180 and b > 175 and abs(int(r)-int(g)) < 15 and abs(int(g)-int(b)) < 15:
            return True
        # Faint floating background foliage on outer borders
        if (cx < 30 or cx > w - 30 or cy < 30 or cy > h - 30):
            if r > 150 and g > 160 and b > 140 and abs(int(r)-int(b)) < 30:
                return True
            # Faint blue/purple crystals on edges
            if b > 180 and r > 160 and g > 170:
                return True
        return False
        
    while q:
        cy, cx = q.popleft()
        r, g, b, a = arr[cy, cx]
        if is_outer_bg(r, g, b, cx, cy):
            arr[cy, cx, 3] = 0
            for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                    visited[ny, nx] = True
                    q.append((ny, nx))
                    
    # Now find connected components of alpha > 30
    # Keep ONLY the central monster body and stem
    alpha = arr[:, :, 3] > 30
    comp_visited = np.zeros((h, w), dtype=bool)
    components = []
    
    for y in range(h):
        for x in range(w):
            if alpha[y, x] and not comp_visited[y, x]:
                comp = []
                cq = deque([(y, x)])
                comp_visited[y, x] = True
                while cq:
                    py, px = cq.popleft()
                    comp.append((py, px))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = py + dy, px + dx
                            if 0 <= ny < h and 0 <= nx < w and not comp_visited[ny, nx] and alpha[ny, nx]:
                                comp_visited[ny, nx] = True
                                cq.append((ny, nx))
                components.append(comp)
                
    components.sort(key=lambda c: len(c), reverse=True)
    
    # Filter out detached small floating debris ('花邊')
    clean_arr = np.zeros_like(arr)
    if components:
        # Main body is components[0]
        main_size = len(components[0])
        for comp in components:
            # If component is connected or significant (>= 8% of main body)
            if len(comp) >= main_size * 0.08:
                for py, px in comp:
                    clean_arr[py, px] = arr[py, px]
                    
    # Tight crop
    a = clean_arr[:, :, 3]
    y_idx, x_idx = np.where(a > 20)
    if len(y_idx) > 0 and len(x_idx) > 0:
        res = Image.fromarray(clean_arr).crop((x_idx.min(), y_idx.min(), x_idx.max() + 1, y_idx.max() + 1))
    else:
        res = Image.fromarray(clean_arr)
        
    # Standardize all monsters to naturally face RIGHT (+X forward direction)
    res = res.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        
    out_path = os.path.join(assets_dir, f'monster_{name}.png')
    res.save(out_path)
    res.save(os.path.join(base_dir, 'source', 'assets', f'monster_{name}.png'))
    print(f'Pristine monster_{name}.png (Facing RIGHT, transparent): {res.size}')

print('All 7 monsters cleanly re-extracted: pure transparent cutout, zero background, naturally facing RIGHT!')
