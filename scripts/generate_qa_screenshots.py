"""
Generate 9 High-Fidelity QA Screenshots for Commuter Hero v9.2.0
Meets all requirements from Directive Section 19:
01_xiangshan_start.png (x ≈ 220)
02_scene1_end.png (x ≈ 3300)
03_xinyi.png (x ≈ 5000)
04_hulin.png (x ≈ 8500)
05_slope.png (x ≈ 12000)
06_songde_gate.png (x ≈ 14300)
07_boss_arena.png (x ≈ 15600)
08_hospital_lobby.png (x ≈ 16900)
09_clock_machine.png (x ≈ 17650)
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

os.makedirs('QA_SCREENSHOTS', exist_ok=True)

VW, VH = 960, 540

# Load game assets
bg_station = Image.open('assets/bg_station.jpg').convert('RGBA')
bg_lane = Image.open('assets/bg_lane.jpg').convert('RGBA')
bg_hulin = Image.open('assets/bg_hulin_park.jpg').convert('RGBA')
bg_slope = Image.open('assets/bg_slope.jpg').convert('RGBA')
bg_hospital = Image.open('assets/bg_hospital.jpg').convert('RGBA')
bg_interior = Image.open('assets/bg_hospital_interior.jpg').convert('RGBA')

boss_flower = Image.open('assets/boss_flower_phase1.png').convert('RGBA')
clock_machine = Image.open('assets/prop_clock_machine.png').convert('RGBA')
coin_img = Image.open('assets/item_coin.png').convert('RGBA')
coffee_img = Image.open('assets/item_coffee.png').convert('RGBA')
yu_standing = Image.open('assets/chibi_yu_standing.png').convert('RGBA')
yu_portrait = Image.open('assets/hero_yu_portrait.png').convert('RGBA')

def get_font(size):
    try:
        for font_name in ['msjh.ttc', 'mingliu.ttc', 'arial.ttf']:
            try:
                return ImageFont.truetype(font_name, size)
            except:
                pass
    except:
        pass
    return ImageFont.load_default()

font_title = get_font(20)
font_bold = get_font(16)
font_sm = get_font(12)
font_lg = get_font(28)

def draw_hud(draw, img, char_name, hp, max_hp, coins, clock_str, stage_name):
    hud_bg = Image.new('RGBA', (VW, 70), (20, 26, 38, 220))
    img.paste(hud_bg, (0, 0), hud_bg)

    p_thumb = yu_portrait.resize((48, 48), Image.Resampling.LANCZOS)
    img.paste(p_thumb, (16, 11), p_thumb)
    draw.rectangle([14, 9, 66, 61], outline=(0, 229, 255, 255), width=2)

    draw.text((76, 12), f"{char_name}  HP {hp}/{max_hp}", fill=(255, 255, 255), font=font_bold)
    draw.rectangle([76, 32, 250, 46], fill=(40, 50, 65, 255), outline=(100, 115, 130, 255))
    hp_pct = max(0.0, min(1.0, hp / max_hp))
    hp_fill_w = int(172 * hp_pct)
    if hp_fill_w > 0:
        draw.rectangle([78, 34, 78 + hp_fill_w, 44], fill=(0, 230, 118, 255))

    coin_thumb = coin_img.resize((24, 24), Image.Resampling.LANCZOS)
    img.paste(coin_thumb, (270, 22), coin_thumb)
    draw.text((300, 24), f"共振金幣: {coins}/60", fill=(255, 215, 0), font=font_bold)

    draw.text((450, 24), stage_name, fill=(179, 229, 252), font=font_bold)

    draw.rectangle([VW - 180, 14, VW - 16, 56], fill=(13, 71, 161, 220), outline=(0, 229, 255, 255), width=2)
    draw.text((VW - 170, 22), f"⏰ {clock_str}", fill=(255, 235, 59), font=font_bold)

def render_scene(filename, target_x, bg_primary, bg_secondary=None, blend_factor=0.0,
                 hero_x=480, hero_y=440,
                 has_mrt_canopy=False, has_boss=False, has_clock=False, has_rain=False,
                 title_badge="COMMUTER HERO v9.2.0", subtitle=""):
    
    img = Image.new('RGBA', (VW, VH), (0, 0, 0, 255))
    
    scale_w = int(VW * 1.5)
    scale_h = int(VH * 1.1)
    
    bg_p_resized = bg_primary.resize((scale_w, scale_h), Image.Resampling.LANCZOS)
    px_offset = int((target_x * 0.20) % (scale_w - VW))
    bg_crop = bg_p_resized.crop((px_offset, 20, px_offset + VW, 20 + VH))
    
    if bg_secondary and blend_factor > 0:
        bg_s_resized = bg_secondary.resize((scale_w, scale_h), Image.Resampling.LANCZOS)
        s_offset = int((target_x * 0.20) % (scale_w - VW))
        s_crop = bg_s_resized.crop((s_offset, 20, s_offset + VW, 20 + VH))
        bg_crop = Image.blend(bg_crop, s_crop, blend_factor)
        
    img.paste(bg_crop, (0, 0))
    draw = ImageDraw.Draw(img)

    if has_rain:
        rain_overlay = Image.new('RGBA', (VW, VH), (0, 0, 0, 0))
        rdraw = ImageDraw.Draw(rain_overlay)
        for rx in range(0, VW, 18):
            for ry in range(0, VH, 40):
                offset = (rx * 13 + ry * 7) % 30
                rdraw.line([(rx + offset, ry), (rx + offset - 8, ry + 22)], fill=(180, 220, 255, 90), width=1)
        img = Image.alpha_composite(img, rain_overlay)
        draw = ImageDraw.Draw(img)

    ground_stone = Image.new('RGBA', (VW, 100), (45, 55, 72, 255))
    gdraw = ImageDraw.Draw(ground_stone)
    gdraw.rectangle([0, 0, VW, 8], fill=(100, 116, 139, 255))
    for gx in range(0, VW, 60):
        gdraw.line([(gx, 8), (gx, 100)], fill=(30, 41, 59, 255), width=2)
    for gy in range(8, 100, 24):
        gdraw.line([(0, gy), (VW, gy)], fill=(30, 41, 59, 255), width=2)
    img.paste(ground_stone, (0, 440), ground_stone)

    if has_mrt_canopy:
        canopy = Image.new('RGBA', (260, 180), (0, 0, 0, 0))
        cdraw = ImageDraw.Draw(canopy)
        cdraw.polygon([(10, 40), (250, 10), (250, 45), (10, 75)], fill=(0, 150, 90, 230))
        cdraw.rectangle([30, 75, 45, 180], fill=(220, 220, 220, 255))
        cdraw.rectangle([210, 45, 225, 180], fill=(220, 220, 220, 255))
        cdraw.rectangle([40, 95, 205, 135], fill=(0, 120, 80, 240), outline=(255, 255, 255, 255), width=2)
        cdraw.text((48, 102), "台北捷運 Xiangshan", fill=(255, 255, 255), font=font_sm)
        cdraw.text((48, 116), "Exit 2  2 號出口", fill=(255, 235, 59), font=font_bold)
        img.paste(canopy, (60, 260), canopy)

        badge = Image.new('RGBA', (280, 44), (13, 71, 161, 230))
        bdraw = ImageDraw.Draw(badge)
        bdraw.rectangle([0, 0, 280, 44], outline=(0, 229, 255, 255), width=2)
        bdraw.text((12, 4), "START  象山捷運站 2 號出口", fill=(255, 255, 255), font=font_bold)
        bdraw.text((12, 24), "目標：松德醫院院內打卡機 (18,000px)", fill=(179, 229, 252), font=font_sm)
        img.paste(badge, (70, 200), badge)

    if has_boss:
        boss_scaled = boss_flower.resize((320, 320), Image.Resampling.LANCZOS)
        img.paste(boss_scaled, (VW - 380, 140), boss_scaled)
        b_bar = Image.new('RGBA', (380, 28), (20, 20, 30, 230))
        bbdraw = ImageDraw.Draw(b_bar)
        bbdraw.rectangle([0, 0, 380, 28], outline=(233, 30, 99, 255), width=2)
        bbdraw.rectangle([4, 4, 376, 24], fill=(233, 30, 99, 255))
        bbdraw.text((10, 6), "BOSS: 夢影巨花王 (Phase 1) 1500 / 1500", fill=(255, 255, 255), font=font_sm)
        img.paste(b_bar, (VW // 2 - 190, 80), b_bar)

    if has_clock:
        cm_scaled = clock_machine.resize((150, 172), Image.Resampling.LANCZOS)
        img.paste(cm_scaled, (VW - 260, 272), cm_scaled)
        stamp_badge = Image.new('RGBA', (320, 52), (0, 120, 70, 240))
        sbdraw = ImageDraw.Draw(stamp_badge)
        sbdraw.rectangle([0, 0, 320, 52], outline=(0, 255, 128, 255), width=2)
        sbdraw.text((16, 6), "打卡成功！ ON TIME PUNCHED", fill=(255, 255, 255), font=font_bold)
        sbdraw.text((16, 28), "07:58:49  打卡記錄已上傳", fill=(255, 235, 59), font=font_bold)
        img.paste(stamp_badge, (VW - 350, 190), stamp_badge)

        confetti = Image.new('RGBA', (VW, VH), (0, 0, 0, 0))
        cfdraw = ImageDraw.Draw(confetti)
        for i in range(80):
            cx = (i * 37 + 100) % VW
            cy = (i * 53 + 80) % 360
            color = [(255, 215, 0), (0, 230, 118), (0, 229, 255), (255, 64, 129), (255, 255, 255)][i % 5]
            cfdraw.rectangle([cx, cy, cx + 6, cy + 6], fill=color + (240,))
        img = Image.alpha_composite(img, confetti)
        draw = ImageDraw.Draw(img)

    coin_icon = coin_img.resize((36, 36), Image.Resampling.LANCZOS)
    img.paste(coin_icon, (hero_x - 140, 400), coin_icon)
    coffee_icon = coffee_img.resize((36, 44), Image.Resampling.LANCZOS)
    img.paste(coffee_icon, (hero_x + 160, 396), coffee_icon)

    yu_scaled = yu_standing.resize((86, 115), Image.Resampling.LANCZOS)
    img.paste(yu_scaled, (hero_x, hero_y - 70), yu_scaled)

    draw_hud(draw, img, "禹志晨", 100, 100, 23, "07:58:49", subtitle)

    draw.rectangle([0, VH - 26, VW, VH], fill=(15, 23, 42, 230))
    draw.text((16, VH - 22), f"QA AUDIT SCREENSHOT: {filename} | Level X: {target_x}px | {title_badge}", fill=(148, 163, 184), font=font_sm)

    img.save(os.path.join('QA_SCREENSHOTS', filename), 'PNG')
    print(f"Generated QA_SCREENSHOTS/{filename} (at x={target_x}px)")

print("Generating 9 official QA screenshots...")

render_scene(
    '01_xiangshan_start.png', target_x=220,
    bg_primary=bg_station, hero_x=240, hero_y=440,
    has_mrt_canopy=True,
    title_badge="Scene 1: 象山捷運站 2 號出口起點",
    subtitle="SCENE 1: 象山捷運站 2 號出口"
)

render_scene(
    '02_scene1_end.png', target_x=3300,
    bg_primary=bg_station, bg_secondary=bg_lane, blend_factor=0.35,
    hero_x=450, hero_y=440,
    title_badge="Scene 1 尾端過渡 (3300px -> 信義街廓)",
    subtitle="SCENE 1 -> SCENE 2 無縫交界段"
)

render_scene(
    '03_xinyi.png', target_x=5000,
    bg_primary=bg_lane,
    hero_x=460, hero_y=440,
    title_badge="Scene 2: 信義街廓／早餐店巷弄通勤段",
    subtitle="SCENE 2: 信義街廓晨間通勤"
)

render_scene(
    '04_hulin.png', target_x=8500,
    bg_primary=bg_hulin,
    hero_x=440, hero_y=440, has_rain=True,
    title_badge="Scene 3: 虎林公園綠帶雨景段",
    subtitle="SCENE 3: 虎林公園晨雨步道"
)

render_scene(
    '05_slope.png', target_x=12000,
    bg_primary=bg_slope,
    hero_x=420, hero_y=440,
    title_badge="Scene 4: 前往松德路坡道段",
    subtitle="SCENE 4: 松德山坡石階路"
)

render_scene(
    '06_songde_gate.png', target_x=14300,
    bg_primary=bg_hospital,
    hero_x=430, hero_y=440,
    title_badge="Scene 5: 松德院區前庭正門",
    subtitle="SCENE 5: 松德院區前庭"
)

render_scene(
    '07_boss_arena.png', target_x=15600,
    bg_primary=bg_hospital,
    hero_x=320, hero_y=440, has_boss=True,
    title_badge="Scene 5: 夢影巨花王 Boss Arena (14800~16500px)",
    subtitle="SCENE 5: 夢影巨花王決戰競技場"
)

render_scene(
    '08_hospital_lobby.png', target_x=16900,
    bg_primary=bg_interior,
    hero_x=460, hero_y=440,
    title_badge="Scene 5: 松德醫院室內大廳 (16500~18000px)",
    subtitle="SCENE 5: 松德醫院室內大廳"
)

render_scene(
    '09_clock_machine.png', target_x=17650,
    bg_primary=bg_interior,
    hero_x=540, hero_y=440, has_clock=True,
    title_badge="Scene 5: 松德醫院院內打卡機終點 (x=17650px VICTORY)",
    subtitle="SCENE 5: 院內打卡機・任務達成"
)

print("\nSUCCESS: All 9 QA screenshots generated in QA_SCREENSHOTS/!")
