import os, zipfile, hashlib

base_dir = r'c:\Users\Asher\Documents\game\08workbattle-v8_0-COMMUTER-HERO'
dist_dir = os.path.join(base_dir, 'dist')

web_share_zip_path = os.path.join(base_dir, 'WEB-SHARE.zip')
full_source_zip_path = os.path.join(base_dir, 'FULL-SOURCE.zip')
sha256_path = os.path.join(base_dir, 'SHA256.txt')

print('1. Creating WEB-SHARE.zip...')
with zipfile.ZipFile(web_share_zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(os.path.join(base_dir, 'index.html'), 'index.html')
    z.write(os.path.join(base_dir, 'README.md'), 'README.md')
    z.write(os.path.join(base_dir, 'DEPLOY.md'), 'DEPLOY.md')
    z.write(os.path.join(base_dir, 'RELEASE_NOTES.md'), 'RELEASE_NOTES.md')
    z.write(os.path.join(base_dir, 'SCENE_ASSET_MANIFEST_v9_2.md'), 'SCENE_ASSET_MANIFEST_v9_2.md')
    z.write(os.path.join(base_dir, 'MAP_REFERENCE_AUDIT_v9_2.md'), 'MAP_REFERENCE_AUDIT_v9_2.md')
    z.write(os.path.join(base_dir, 'ROUTE_CONTINUITY_AUDIT.md'), 'ROUTE_CONTINUITY_AUDIT.md')
    z.write(os.path.join(base_dir, 'CAMERA_WORLD_BOUNDS_AUDIT.md'), 'CAMERA_WORLD_BOUNDS_AUDIT.md')
    z.write(os.path.join(base_dir, 'ITEM_ART_AUDIT.md'), 'ITEM_ART_AUDIT.md')
    z.write(os.path.join(base_dir, 'COMBAT_BALANCE_AUDIT.md'), 'COMBAT_BALANCE_AUDIT.md')
    z.write(os.path.join(base_dir, 'REAL_E2E_PLAYTEST.md'), 'REAL_E2E_PLAYTEST.md')
    qa_dir = os.path.join(base_dir, 'QA_SCREENSHOTS')
    if os.path.isdir(qa_dir):
        for qf in os.listdir(qa_dir):
            if qf.endswith('.png'):
                z.write(os.path.join(qa_dir, qf), os.path.join('QA_SCREENSHOTS', qf))
print(f'Created WEB-SHARE.zip ({os.path.getsize(web_share_zip_path)/1024/1024:.2f} MB)')

print('2. Creating FULL-SOURCE.zip...')
with zipfile.ZipFile(full_source_zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(base_dir):
        # Exclude existing zips and large git/cache if any
        if any(x in root for x in ['.git', '__pycache__', '.temp']):
            continue
        for file in files:
            if file in ('WEB-SHARE.zip', 'FULL-SOURCE.zip'):
                continue
            fp = os.path.join(root, file)
            arcname = os.path.relpath(fp, base_dir)
            z.write(fp, arcname)
print(f'Created FULL-SOURCE.zip ({os.path.getsize(full_source_zip_path)/1024/1024:.2f} MB)')

print('3. Computing SHA256 hashes...')
def get_sha256(file_path):
    h = hashlib.sha256()
    with open(file_path, 'rb') as f:
        while chunk := f.read(8192 * 1024):
            h.update(chunk)
    return h.hexdigest()

files_to_hash = [
    os.path.join(base_dir, 'index.html'),
    web_share_zip_path,
    full_source_zip_path
]

sha_lines = []
for fp in files_to_hash:
    sha = get_sha256(fp)
    fname = os.path.basename(fp)
    line = f"{sha}  {fname}"
    sha_lines.append(line)
    print(line)

with open(sha256_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(sha_lines) + '\n')

print(f'Saved SHA256.txt to {sha256_path}')
