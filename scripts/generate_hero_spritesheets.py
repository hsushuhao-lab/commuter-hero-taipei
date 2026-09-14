import json
import os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

base_dir = r'c:\Users\Asher\Documents\game\08workbattle-v8_0-COMMUTER-HERO'
assets_dir = os.path.join(base_dir, 'assets')
source_assets_dir = os.path.join(base_dir, 'source', 'assets')
source_art_dir = os.path.join(os.path.dirname(base_dir), '美術設計')
os.makedirs(assets_dir, exist_ok=True)
os.makedirs(source_assets_dir, exist_ok=True)

FRAME_SIZE = 256
FEET_Y = 232
CENTER_X = 128
OUTPUT_FRAME_SIZE = 512
OUTPUT_FEET_Y = 448
OUTPUT_CENTER_X = 256

ANIM_MAP = {
    'idle': [0, 1, 2, 3],
    'land': [4, 5],
    'hit': [6, 7],
    'run': [8, 9, 10, 11, 12, 13],
    'jump_takeoff': [14],
    'jump_apex': [15],
    'jump_fall': [16],
    'attack': [17, 18, 19, 20, 21],
    'victory': [22, 23, 24, 25],
    'ultimate': [26, 27, 28, 29, 30, 31]
}

# Approximate hand/foot centers in each approved Q illustration after the
# runtime-facing horizontal flip. Local elastic deformation around these
# points makes limbs flex while the face and torso stay recognisable.
LIMB_CONTROL_POINTS = {
    'yu': {'left_arm': (0.25, 0.48), 'right_arm': (0.78, 0.55), 'left_leg': (0.34, 0.80), 'right_leg': (0.67, 0.84)},
    'shakira': {'left_arm': (0.24, 0.44), 'right_arm': (0.77, 0.48), 'left_leg': (0.40, 0.82), 'right_leg': (0.64, 0.83)},
    'sandra': {'left_arm': (0.27, 0.47), 'right_arm': (0.73, 0.53), 'left_leg': (0.30, 0.84), 'right_leg': (0.57, 0.84)},
}


CHARACTER_Q_FILES = {
    'yu': 'character_Q01.png',
    'shakira': 'character_Q02.png',
    'sandra': 'character_Q03.png',
}
SOURCE_FACING = {'yu': 'right', 'shakira': 'right_or_front', 'sandra': 'right'}


def _bilinear_remap(image, source_x, source_y):
    pixels = np.asarray(image, dtype=np.float32)
    height, width = pixels.shape[:2]
    source_x = np.clip(source_x, 0, width - 1)
    source_y = np.clip(source_y, 0, height - 1)
    x0 = np.floor(source_x).astype(np.int32)
    y0 = np.floor(source_y).astype(np.int32)
    x1 = np.minimum(x0 + 1, width - 1)
    y1 = np.minimum(y0 + 1, height - 1)
    wx = (source_x - x0)[..., None]
    wy = (source_y - y0)[..., None]
    top = pixels[y0, x0] * (1 - wx) + pixels[y0, x1] * wx
    bottom = pixels[y1, x0] * (1 - wx) + pixels[y1, x1] * wx
    return Image.fromarray(np.clip(top * (1 - wy) + bottom * wy, 0, 255).astype(np.uint8), 'RGBA')


def apply_joint_motion(image, char_key, anim_name, sub_idx):
    """Apply subtle local hand/foot motion without distorting the hero's face."""
    if anim_name == 'idle':
        phase = math.sin(sub_idx * math.pi / 2) * 0.25
    elif anim_name == 'run':
        phase = math.sin(sub_idx * math.pi / 3)
    elif anim_name.startswith('jump'):
        phase = 0.75
    elif anim_name in ('attack', 'ultimate'):
        phase = min(1.0, sub_idx / 2)
    elif anim_name == 'victory':
        phase = math.sin(sub_idx * math.pi / 2) * 0.8
    else:
        phase = 0.0
    if abs(phase) < 0.01:
        return image

    width, height = image.size
    yy, xx = np.indices((height, width), dtype=np.float32)
    source_x = xx.copy()
    source_y = yy.copy()
    controls = LIMB_CONTROL_POINTS[char_key]
    radius_x = max(12.0, width * 0.19)
    radius_y = max(16.0, height * 0.15)
    motions = {
        'left_arm': (5.0 * phase, -4.0 * phase),
        'right_arm': (-5.0 * phase, 4.0 * phase),
        'left_leg': (-6.0 * phase, 5.0 * phase),
        'right_leg': (6.0 * phase, -5.0 * phase),
    }
    if anim_name in ('attack', 'ultimate'):
        motions['right_arm'] = (-10.0 * phase, -3.0 * phase)
        motions['left_arm'] = (3.0 * phase, 3.0 * phase)

    for limb, (nx, ny) in controls.items():
        center_x, center_y = nx * width, ny * height
        weight = np.exp(-(((xx - center_x) / radius_x) ** 2 + ((yy - center_y) / radius_y) ** 2) * 1.8)
        dx, dy = motions[limb]
        source_x -= dx * weight
        source_y -= dy * weight
    return _bilinear_remap(image, source_x, source_y)


def prepare_character_art(char_key):
    source_path = os.path.join(source_art_dir, CHARACTER_Q_FILES[char_key])
    image = Image.open(source_path).convert('RGBA')
    bbox = image.getbbox()
    if bbox:
        image = image.crop(bbox)
    image.thumbnail((420, 560), Image.Resampling.LANCZOS)
    for directory in (assets_dir, source_assets_dir):
        image.save(os.path.join(directory, f'chibi_{char_key}_clean.png'), optimize=True)
        image.save(os.path.join(directory, f'intro_{char_key}_chibi.png'), optimize=True)

def transform_character(img, angle=0, scale_x=1.0, scale_y=1.0, flash_color=None):
    """Transforms the character with high quality bicubic resampling and optional tint."""
    w, h = img.size
    new_w = max(10, int(w * scale_x))
    new_h = max(10, int(h * scale_y))
    scaled = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    if flash_color is not None:
        r_col, g_col, b_col, alpha_mul = flash_color
        r, g, b, a = scaled.split()
        arr_r = np.array(r, dtype=np.float32)
        arr_g = np.array(g, dtype=np.float32)
        arr_b = np.array(b, dtype=np.float32)
        arr_a = np.array(a, dtype=np.float32)
        
        mask = arr_a > 10
        blend = alpha_mul / 255.0
        arr_r[mask] = arr_r[mask] * (1 - blend) + r_col * blend
        arr_g[mask] = arr_g[mask] * (1 - blend) + g_col * blend
        arr_b[mask] = arr_b[mask] * (1 - blend) + b_col * blend
        
        scaled = Image.merge('RGBA', (
            Image.fromarray(arr_r.astype(np.uint8)),
            Image.fromarray(arr_g.astype(np.uint8)),
            Image.fromarray(arr_b.astype(np.uint8)),
            a
        ))
        
    if abs(angle) > 0.05:
        # In PIL, positive angle rotates counterclockwise.
        # To tilt forward to the right (clockwise), use negative angle:
        scaled = scaled.rotate(-angle, resample=Image.Resampling.BICUBIC, expand=True)
    return scaled

def build_character_sheet(char_key, base_img_path, colors):
    base = Image.open(base_img_path).convert('RGBA')
    
    # Flip base image horizontally so that the character faces RIGHT (forward into the commute)!
    if SOURCE_FACING.get(char_key) == 'left':
        base = base.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    
    bw, bh = base.size
    
    # Target height 144px (1.8 head proportion in 256x256 box)
    target_h = 144
    scale = target_h / bh
    target_w = int(bw * scale)
    base = base.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    sheet = Image.new('RGBA', (OUTPUT_FRAME_SIZE * 8, OUTPUT_FRAME_SIZE * 4), (0, 0, 0, 0))
    
    accent_rgb = colors['accent'][:3]
    theme_rgb = colors['theme'][:3]
    
    for frame_idx in range(32):
        frame = Image.new('RGBA', (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        d = ImageDraw.Draw(frame)
        
        anim_name = ''
        sub_idx = 0
        for name, indices in ANIM_MAP.items():
            if frame_idx in indices:
                anim_name = name
                sub_idx = indices.index(frame_idx)
                break
                
        cx = CENTER_X
        body_angle = 0
        scale_x = 1.0
        scale_y = 1.0
        bob_y = 0
        flash_color = None
        draw_shadow = True
        shadow_w = 30
        
        if anim_name == 'idle':
            phase = sub_idx * (2 * math.pi / 4)
            bob_y = int(math.sin(phase) * 2.5)
            scale_y = 1.0 + math.sin(phase) * 0.02
            scale_x = 1.0 - math.sin(phase) * 0.015
            body_angle = math.sin(phase) * 0.8
            shadow_w = int(30 - bob_y)
            if sub_idx in (1, 2):
                d.ellipse([cx + 28, FEET_Y - target_h + 15, cx + 34, FEET_Y - target_h + 21], fill=(255, 255, 255, 180))
            
        elif anim_name == 'land':
            if sub_idx == 0:
                bob_y = 7
                scale_y = 0.88
                scale_x = 1.12
                body_angle = 1.5
                shadow_w = 38
                d.ellipse([cx - 44, FEET_Y - 5, cx - 18, FEET_Y + 3], fill=(255, 255, 255, 170))
                d.ellipse([cx + 18, FEET_Y - 5, cx + 44, FEET_Y + 3], fill=(255, 255, 255, 170))
                d.ellipse([cx - 30, FEET_Y - 8, cx - 10, FEET_Y - 1], fill=(240, 240, 240, 130))
                d.ellipse([cx + 10, FEET_Y - 8, cx + 30, FEET_Y - 1], fill=(240, 240, 240, 130))
            else:
                bob_y = 2
                scale_y = 0.97
                scale_x = 1.03
                shadow_w = 34
                d.ellipse([cx - 32, FEET_Y - 4, cx - 14, FEET_Y + 2], fill=(255, 255, 255, 100))
                d.ellipse([cx + 14, FEET_Y - 4, cx + 32, FEET_Y + 2], fill=(255, 255, 255, 100))
                
        elif anim_name == 'hit':
            draw_shadow = True
            shadow_w = 26
            if sub_idx == 0:
                bob_y = -6
                body_angle = -16
                scale_y = 1.05
                scale_x = 0.95
                flash_color = (255, 60, 60, 160)
                for i in range(5):
                    sa = i * (2 * math.pi / 5)
                    d.line([cx - 10, FEET_Y - target_h // 2, cx - 10 + math.cos(sa) * 36, FEET_Y - target_h // 2 + math.sin(sa) * 36], fill=(255, 240, 180, 220), width=3)
                d.ellipse([cx + 25, FEET_Y - target_h + 20, cx + 33, FEET_Y - target_h + 30], fill=(120, 210, 255, 220))
            else:
                bob_y = -2
                body_angle = -8
                flash_color = (255, 120, 120, 90)
                d.ellipse([cx + 28, FEET_Y - target_h + 26, cx + 34, FEET_Y - target_h + 34], fill=(120, 210, 255, 160))
                
        elif anim_name == 'run':
            p = sub_idx
            bob_offsets = [-4, -8, -3, 3, -1, 4]
            lean_angles = [12, 14, 11, 13, 15, 12] # Forward lean to the right!
            scale_ys    = [1.02, 1.05, 1.0, 0.96, 1.01, 0.95]
            scale_xs    = [0.98, 0.95, 1.0, 1.04, 0.99, 1.05]
            
            bob_y = bob_offsets[p]
            body_angle = lean_angles[p]
            scale_y = scale_ys[p]
            scale_x = scale_xs[p]
            shadow_w = 26 + int(abs(bob_y) * 0.5)
            
            streak_x = cx - 44
            sy = FEET_Y - target_h // 2 + bob_y
            d.line([streak_x - 18, sy - 14, streak_x + 6, sy - 14], fill=(255, 255, 255, 110), width=2)
            d.line([streak_x - 26, sy + 10, streak_x - 2, sy + 10], fill=(255, 255, 255, 130), width=2)
            d.line([streak_x - 14, sy + 28, streak_x + 10, sy + 28], fill=(255, 255, 255, 90), width=2)
            
            if p in (3, 5):
                fx = cx - 20 if p == 3 else cx + 15
                d.ellipse([fx - 12, FEET_Y - 4, fx + 12, FEET_Y + 2], fill=(255, 255, 255, 140))
                d.ellipse([fx - 18, FEET_Y - 6, fx - 4, FEET_Y], fill=(230, 230, 230, 100))
                
        elif anim_name == 'jump_takeoff':
            bob_y = 6
            scale_y = 0.86
            scale_x = 1.14
            body_angle = 6
            shadow_w = 36
            d.ellipse([cx - 36, FEET_Y - 5, cx + 36, FEET_Y + 4], fill=(255, 255, 255, 160))
            d.ellipse([cx - 24, FEET_Y - 7, cx + 24, FEET_Y + 2], fill=(255, 255, 255, 130))
            
        elif anim_name == 'jump_apex':
            bob_y = -20
            scale_y = 1.10
            scale_x = 0.94
            body_angle = 5
            shadow_w = 20
            d.line([cx - 25, FEET_Y + 5, cx - 25, FEET_Y - 20], fill=(255, 255, 255, 80), width=2)
            d.line([cx + 25, FEET_Y + 5, cx + 25, FEET_Y - 20], fill=(255, 255, 255, 80), width=2)
            
        elif anim_name == 'jump_fall':
            bob_y = -8
            scale_y = 1.04
            scale_x = 0.97
            body_angle = 10
            shadow_w = 24
            d.line([cx - 35, FEET_Y - target_h // 2 - 20, cx - 45, FEET_Y - target_h // 2 - 40], fill=(255, 255, 255, 80), width=2)
            d.line([cx + 35, FEET_Y - target_h // 2 - 20, cx + 45, FEET_Y - target_h // 2 - 40], fill=(255, 255, 255, 80), width=2)
            
        elif anim_name == 'attack':
            if sub_idx == 0:
                bob_y = 2
                body_angle = -14
                scale_y = 0.96
                scale_x = 1.04
                cx -= 10
                shadow_w = 30
                d.ellipse([cx - 25, FEET_Y - target_h // 2, cx + 25, FEET_Y - target_h // 2 + 50], outline=accent_rgb + (140,), width=2)
            elif sub_idx == 1:
                bob_y = 1
                body_angle = 8
                scale_y = 1.02
                scale_x = 0.98
                cx += 6
                shadow_w = 32
                d.arc([cx, FEET_Y - target_h, cx + 70, FEET_Y - target_h // 2], 260, 360, fill=accent_rgb + (180,), width=4)
            elif sub_idx == 2:
                bob_y = 3
                body_angle = 18
                scale_y = 0.96
                scale_x = 1.06
                cx += 20
                shadow_w = 38
                mid_y = FEET_Y - target_h // 2
                if char_key == 'yu':
                    d.arc([cx + 10, mid_y - 70, cx + 115, mid_y + 45], 280, 85, fill=(123, 211, 255, 240), width=9)
                    d.arc([cx + 15, mid_y - 64, cx + 110, mid_y + 39], 285, 80, fill=(255, 255, 255, 255), width=5)
                    for s in range(6):
                        rad = math.radians(280 + s * 28)
                        px = cx + 62 + math.cos(rad) * 52
                        py = mid_y - 12 + math.sin(rad) * 52
                        d.ellipse([px - 4, py - 4, px + 4, py + 4], fill=(220, 248, 255, 230))
                        d.line([px, py, px + math.cos(rad)*14, py + math.sin(rad)*14], fill=(123, 211, 255, 200), width=2)
                elif char_key == 'shakira':
                    d.ellipse([cx + 40, mid_y - 20, cx + 84, mid_y + 20], fill=(255, 218, 110, 240), outline=(255, 255, 255, 255), width=3)
                    d.ellipse([cx + 52, mid_y - 11, cx + 72, mid_y + 11], fill=(255, 155, 35, 255))
                    d.ellipse([cx + 80, mid_y - 30, cx + 96, mid_y - 14], fill=(255, 245, 180, 220))
                    d.ellipse([cx + 78, mid_y + 16, cx + 94, mid_y + 30], fill=(255, 245, 180, 220))
                    d.line([cx + 15, mid_y, cx + 55, mid_y], fill=(255, 255, 220, 240), width=6)
                else:
                    d.arc([cx + 12, mid_y - 50, cx + 100, mid_y + 55], 305, 95, fill=(255, 120, 50, 245), width=9)
                    d.arc([cx + 16, mid_y - 45, cx + 95, mid_y + 50], 310, 90, fill=(255, 235, 130, 255), width=4)
                    d.ellipse([cx + 75, mid_y - 32, cx + 91, mid_y - 16], fill=(235, 45, 35, 255), outline=(255, 255, 255, 200), width=2)
                    d.ellipse([cx + 85, mid_y + 12, cx + 101, mid_y + 28], fill=(45, 185, 65, 255), outline=(255, 255, 255, 200), width=2)
                    for sp in range(6):
                        sa = sp * math.pi / 3 + 0.2
                        d.line([cx + 60, mid_y, cx + 60 + math.cos(sa)*32, mid_y + math.sin(sa)*32], fill=(255, 220, 90, 230), width=3)
            elif sub_idx == 3:
                bob_y = 2
                body_angle = 12
                scale_y = 0.98
                scale_x = 1.02
                cx += 12
                shadow_w = 34
                d.ellipse([cx + 30, FEET_Y - target_h // 2 - 20, cx + 70, FEET_Y - target_h // 2 + 20], outline=accent_rgb + (100,), width=2)
            else:
                bob_y = 1
                body_angle = 4
                cx += 4
                shadow_w = 30
                
        elif anim_name == 'victory':
            if sub_idx == 0:
                bob_y = 4
                body_angle = -2
                scale_y = 0.92
                scale_x = 1.08
                shadow_w = 34
            elif sub_idx == 1:
                bob_y = -24
                scale_y = 1.12
                scale_x = 0.93
                body_angle = -2
                shadow_w = 18
                for star in [(-45, -70), (45, -75), (-30, -35), (35, -40)]:
                    sx, sy = cx + star[0], FEET_Y - target_h // 2 + star[1]
                    d.polygon([(sx, sy - 8), (sx + 3, sy - 2), (sx + 9, sy), (sx + 4, sy + 3), (sx + 6, sy + 9), (sx, sy + 5), (sx - 6, sy + 9), (sx - 4, sy + 3), (sx - 9, sy), (sx - 3, sy - 2)], fill=(255, 225, 75, 240))
            elif sub_idx == 2:
                bob_y = 3
                scale_y = 0.95
                scale_x = 1.05
                body_angle = 2
                shadow_w = 34
                card_x = cx + 32
                card_y = FEET_Y - target_h // 2 - 25
                d.rectangle([card_x, card_y, card_x + 32, card_y + 20], fill=(46, 125, 50, 255), outline=(255, 255, 255, 255), width=2)
                d.rectangle([card_x + 4, card_y + 4, card_x + 28, card_y + 9], fill=(255, 255, 255, 230))
                d.rectangle([card_x + 4, card_y + 12, card_x + 18, card_y + 16], fill=(255, 215, 64, 255))
            else:
                bob_y = 0
                body_angle = 0
                scale_y = 1.0
                scale_x = 1.0
                shadow_w = 30
                d.ellipse([cx - 40, FEET_Y - target_h - 10, cx - 26, FEET_Y - target_h + 4], fill=(255, 110, 160, 230))
                d.ellipse([cx + 26, FEET_Y - target_h - 8, cx + 40, FEET_Y - target_h + 6], fill=(255, 220, 80, 230))
                
        elif anim_name == 'ultimate':
            shadow_w = 32
            mid_y = FEET_Y - target_h // 2
            if sub_idx == 0:
                bob_y = 5
                body_angle = -10
                scale_y = 0.90
                scale_x = 1.10
                cx -= 10
                d.ellipse([cx - 55, mid_y - 55, cx + 55, mid_y + 55], outline=accent_rgb + (180,), width=3)
            elif sub_idx == 1:
                bob_y = -8
                body_angle = 4
                scale_y = 1.08
                scale_x = 0.95
                cx += 8
                d.ellipse([cx - 70, mid_y - 70, cx + 70, mid_y + 70], outline=theme_rgb + (220,), width=5)
                for i in range(12):
                    ang = i * math.pi / 6
                    d.line([cx + math.cos(ang)*45, mid_y + math.sin(ang)*45, cx + math.cos(ang)*82, mid_y + math.sin(ang)*82], fill=(255, 255, 255, 200), width=3)
            elif sub_idx == 2:
                bob_y = -4
                body_angle = 18
                scale_y = 1.02
                scale_x = 1.04
                cx += 24
                if char_key == 'yu':
                    for wb in range(7):
                        wy = mid_y - 75 + wb * 25
                        d.line([cx - 80, wy, cx + 110, wy], fill=(123, 211, 255, 240), width=5)
                        d.polygon([(cx + 110, wy), (cx + 80, wy - 9), (cx + 80, wy + 9)], fill=(255, 255, 255, 255))
                    d.line([cx - 90, mid_y - 40, cx - 40, mid_y, cx, mid_y - 30, cx + 60, mid_y + 10, cx + 110, mid_y - 20], fill=(255, 225, 80, 255), width=4)
                elif char_key == 'shakira':
                    d.ellipse([cx - 90, mid_y - 90, cx + 90, mid_y + 90], outline=(255, 220, 100, 240), width=5)
                    for st in range(8):
                        sang = st * (2 * math.pi / 8)
                        sx = cx + int(math.cos(sang) * 70)
                        sy = mid_y + int(math.sin(sang) * 55)
                        d.ellipse([sx - 14, sy - 10, sx + 14, sy + 10], fill=(255, 225, 110, 250), outline=(255, 255, 255, 255), width=3)
                        d.ellipse([sx - 6, sy - 6, sx + 6, sy + 6], fill=(255, 140, 30, 255))
                else:
                    for fb in range(14):
                        fang = fb * (2 * math.pi / 14)
                        fx1 = cx + math.cos(fang) * 38
                        fy1 = mid_y + math.sin(fang) * 38
                        fx2 = cx + math.cos(fang) * 92
                        fy2 = mid_y + math.sin(fang) * 92
                        d.line([fx1, fy1, fx2, fy2], fill=(255, 80 + fb * 11, 40, 245), width=5)
                    d.ellipse([cx - 52, mid_y - 52, cx + 52, mid_y + 52], fill=(255, 140, 40, 90), outline=(255, 240, 120, 255), width=5)
            elif sub_idx == 3:
                bob_y = 1
                body_angle = 12
                cx += 20
                scale_y = 0.98
                scale_x = 1.02
                d.ellipse([cx - 95, mid_y - 95, cx + 95, mid_y + 95], outline=theme_rgb + (140,), width=4)
            elif sub_idx == 4:
                bob_y = 2
                body_angle = 6
                cx += 10
                scale_y = 1.0
                scale_x = 1.0
                d.ellipse([cx - 75, mid_y - 75, cx + 75, mid_y + 75], outline=accent_rgb + (90,), width=2)
            else:
                bob_y = 3
                body_angle = -2
                scale_y = 0.97
                scale_x = 1.03
                for sp in range(5):
                    d.line([cx - 20 - sp * 7, FEET_Y, cx - 35 - sp * 9, FEET_Y - 12], fill=(255, 210, 70, 230), width=2)

        if draw_shadow:
            d.ellipse([cx - shadow_w, FEET_Y - 4, cx + shadow_w, FEET_Y + 4], fill=(0, 0, 0, 48))
            
        articulated = apply_joint_motion(base, char_key, anim_name, sub_idx)
        char_transformed = transform_character(articulated, angle=body_angle, scale_x=scale_x, scale_y=scale_y, flash_color=flash_color)
        tw, th = char_transformed.size
        target_bottom = FEET_Y + bob_y if anim_name.startswith('jump') else FEET_Y
        paste_x = int(cx - tw / 2)
        paste_y = int(target_bottom - th)
        frame.paste(char_transformed, (paste_x, paste_y), char_transformed)
        
        col = frame_idx % 8
        row = frame_idx // 8
        remastered_frame = Image.new('RGBA', (OUTPUT_FRAME_SIZE, OUTPUT_FRAME_SIZE), (0, 0, 0, 0))
        scaled_frame = frame.resize((OUTPUT_FRAME_SIZE, OUTPUT_FRAME_SIZE), Image.Resampling.LANCZOS)
        remastered_frame.alpha_composite(scaled_frame, (0, OUTPUT_FEET_Y - FEET_Y * 2))
        sheet.paste(remastered_frame, (col * OUTPUT_FRAME_SIZE, row * OUTPUT_FRAME_SIZE), remastered_frame)
        
    out_path = os.path.join(assets_dir, f'hero_{char_key}_anim.png')
    optimized_sheet = sheet.quantize(colors=192, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    optimized_sheet.save(out_path, optimize=True)
    # Also save to source/assets
    optimized_sheet.save(os.path.join(source_assets_dir, f'hero_{char_key}_anim.png'), optimize=True)
    print(f'Saved {out_path} (Facing RIGHT, 32 frames, 4096x2048)')

for character_key in CHARACTER_Q_FILES:
    prepare_character_art(character_key)

layout = {
    'version': 'v9.8.0',
    'frameSize': OUTPUT_FRAME_SIZE,
    'framesPerRow': 8,
    'frameCount': 32,
    'footY': OUTPUT_FEET_Y,
    'bodyCenterX': OUTPUT_CENTER_X,
    'shadowAnchorY': OUTPUT_FEET_Y,
    'weaponOrigins': {
        'yu': {'x': 52, 'y': -64},
        'shakira': {'x': 42, 'y': -58},
        'sandra': {'x': 50, 'y': -54}
    }
}
for directory in (assets_dir, source_assets_dir):
    with open(os.path.join(directory, 'chibi_sprite_layout_v9_8_0.json'), 'w', encoding='utf-8') as file:
        json.dump(layout, file, ensure_ascii=False, indent=2)

build_character_sheet('yu', os.path.join(assets_dir, 'chibi_yu_clean.png'), {
    'accent': (123, 211, 255, 220),
    'theme': (255, 215, 90, 240)
})

build_character_sheet('shakira', os.path.join(assets_dir, 'chibi_shakira_clean.png'), {
    'accent': (255, 215, 106, 220),
    'theme': (200, 160, 255, 240)
})

build_character_sheet('sandra', os.path.join(assets_dir, 'chibi_sandra_clean.png'), {
    'accent': (255, 120, 70, 220),
    'theme': (255, 210, 100, 240)
})

print('All 3 hero animation sheets successfully rebuilt FACING RIGHT!')
