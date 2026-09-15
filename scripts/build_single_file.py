import base64
import hashlib
import os
import re
from datetime import UTC, datetime

BUILD_VERSION = "v9.9.3"
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
assets_dir = os.path.join(base_dir, 'assets')
source_dir = os.path.join(base_dir, 'source')
src_dir = os.path.join(source_dir, 'src')
dist_dir = os.path.join(base_dir, 'dist')
os.makedirs(dist_dir, exist_ok=True)


def source_fingerprint() -> str:
    """Return a short deterministic fingerprint for the bundled runtime inputs."""
    digest = hashlib.sha256()
    for root, _, files in os.walk(src_dir):
        for filename in sorted(files):
            path = os.path.join(root, filename)
            digest.update(os.path.relpath(path, src_dir).encode("utf-8"))
            with open(path, "rb") as source_file:
                digest.update(source_file.read())
    return digest.hexdigest()[:16]


build_sha = source_fingerprint()
build_built_at = datetime.now(UTC).isoformat()

print('1. Encoding all image assets to base64 Data URIs...')
asset_map = {}
for f in os.listdir(assets_dir):
    fp = os.path.join(assets_dir, f)
    if os.path.isfile(fp) and not f.startswith('preview_') and not f.startswith('test_'):
        ext = os.path.splitext(f)[1].lower()
        mime = 'image/png' if ext == '.png' else ('image/jpeg' if ext in ('.jpg', '.jpeg') else 'application/octet-stream')
        with open(fp, 'rb') as img_f:
            b64 = base64.b64encode(img_f.read()).decode('utf-8')
        data_uri = f'data:{mime};base64,{b64}'
        asset_map[f'assets/{f}'] = data_uri

print(f'Encoded {len(asset_map)} game assets.')

# Files in dependency order
module_order = [
    os.path.join(src_dir, 'data', 'Characters.js'),
    os.path.join(src_dir, 'data', 'Monsters.js'),
    os.path.join(src_dir, 'engine', 'Audio.js'),
    os.path.join(src_dir, 'engine', 'Camera.js'),
    os.path.join(src_dir, 'engine', 'Input.js'),
    os.path.join(src_dir, 'entities', 'Particles.js'),
    os.path.join(src_dir, 'entities', 'Projectiles.js'),
    os.path.join(src_dir, 'entities', 'Monster.js'),
    os.path.join(src_dir, 'entities', 'Player.js'),
    os.path.join(src_dir, 'entities', 'Boss.js'),
    os.path.join(src_dir, 'world', 'Platforms.js'),
    os.path.join(src_dir, 'world', 'Level.js'),
    os.path.join(src_dir, 'ui', 'HUD.js'),
    os.path.join(src_dir, 'ui', 'StyleBible.js'),
    os.path.join(src_dir, 'ui', 'Intro.js'),
    os.path.join(src_dir, 'main.js')
]

print('2. Bundling modular JavaScript files...')
bundled_code_parts = []

# First, declare the ASSET_DATA_URIS dictionary
asset_dict_str = 'const ASSETS = {\n'
for k, v in asset_map.items():
    asset_dict_str += f'  "{k}": "{v}",\n'
asset_dict_str += '};\n'
bundled_code_parts.append(asset_dict_str)

for mod_path in module_order:
    with open(mod_path, 'r', encoding='utf-8') as mf:
        content = mf.read().replace("\r\n", "\n").replace("\r", "\n")

    # Remove import lines
    content = re.sub(r'import\s+.*?from\s+[\'"].*?[\'"];?\n?', '', content)
    # Remove export keywords
    content = re.sub(r'\bexport\s+(const|class|let|var|function)\b', r'\1', content)
    content = re.sub(r'\bexport\s+default\s+', '', content)

    # Replace asset paths with ASSETS lookup
    # Look for 'assets/filename.ext'
    for asset_key in asset_map.keys():
        content = content.replace(f"'{asset_key}'", f"ASSETS['{asset_key}']")
        content = content.replace(f'"{asset_key}"', f"ASSETS['{asset_key}']")

    bundled_code_parts.append(f'// --- Module: {os.path.basename(mod_path)} ---\n' + content + '\n')

combined_js = '(function() {\n"use strict";\n\n' + '\n'.join(bundled_code_parts) + '\n})();'

print('3. Generating self-contained index.html...')
html_content = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta name="game-build" content="{BUILD_VERSION}">
  <title>《08點上班大作戰：通勤英雄篇》象山捷運站 → 松德院區 ({BUILD_VERSION} Arena Chase + Water Shockwave)</title>
  <style>
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
      touch-action: manipulation;
    }}
    body, html {{
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #0a0e17;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft JhengHei", sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
    }}
    #gameContainer {{
      position: relative;
      width: 100vw;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #000;
    }}
    canvas {{
      display: block;
      touch-action: none;
      background-color: #101826;
      box-shadow: 0 0 30px rgba(0,0,0,0.8);
      image-rendering: auto;
    }}
    #orientationWarning {{
      display: none;
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: #0a0e17;
      color: #ffd54f;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 20px;
      z-index: 9999;
      font-size: 18px;
    }}
    @media (orientation: portrait) and (max-width: 768px) {{
      #orientationWarning {{ display: flex; }}
      body.opening-active #orientationWarning {{ display: none; }}
    }}
  </style>
</head>
<body>
  <div id="gameContainer">
    <canvas id="gameCanvas"></canvas>
    <div id="orientationWarning">
      <div style="font-size: 48px; margin-bottom: 12px;">📱 ↻</div>
      <h2>請旋轉手機為橫向螢幕</h2>
      <p style="margin-top: 8px; color: #b0bec5; font-size: 14px;">以獲得最佳橫向卷軸通勤跑酷體驗</p>
    </div>
  </div>

  <script>
    window.__GAME_BUILD__ = {{
      version: "{BUILD_VERSION}",
      status: "PI_REVIEW_REQUIRED",
      sha: "{build_sha}",
      builtAt: "{build_built_at}"
    }};
    console.info(`[GAME BUILD] {BUILD_VERSION} {build_sha}`);
{combined_js}
  </script>
</body>
</html>
"""

# Output to root index.html and dist/index.html
out_root_html = os.path.join(base_dir, 'index.html')
out_dist_html = os.path.join(dist_dir, 'index.html')

with open(out_root_html, 'w', encoding='utf-8') as f:
    f.write(html_content)
print(f'Saved {out_root_html} ({len(html_content)/1024/1024:.2f} MB)')

with open(out_dist_html, 'w', encoding='utf-8') as f:
    f.write(html_content)
print(f'Saved {out_dist_html} ({len(html_content)/1024/1024:.2f} MB)')

print('SUCCESS: Single-file offline zero-dependency build complete!')
