import os
import hashlib

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

def md5_file(filepath):
    if not os.path.exists(filepath):
        return None
    hash_md5 = hashlib.md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

vessels_dir = os.path.join(BASE_DIR, 'static', 'images', 'vessels')
tours_dir = os.path.join(BASE_DIR, 'static', 'images', 'tours')

print("=== CHECKING VESSELS DIRECTORY ===")
v_files = sorted(os.listdir(vessels_dir)) if os.path.exists(vessels_dir) else []
v_hashes = {}
for vf in v_files:
    p = os.path.join(vessels_dir, vf)
    h = md5_file(p)
    size_kb = os.path.getsize(p) / 1024
    if h in v_hashes:
        v_hashes[h].append(vf)
    else:
        v_hashes[h] = [vf]
    print(f"{vf}: {size_kb:.1f} KB (hash: {h[:8]})")

print("\n--- DUPLICATE VESSELS ---")
for h, fnames in v_hashes.items():
    if len(fnames) > 1:
        print(f"DUPLICATE GROUP ({len(fnames)} files): {', '.join(fnames)}")

print("\n=== CHECKING TOURS DIRECTORY ===")
t_files = sorted(os.listdir(tours_dir)) if os.path.exists(tours_dir) else []
t_hashes = {}
for tf in t_files:
    p = os.path.join(tours_dir, tf)
    h = md5_file(p)
    size_kb = os.path.getsize(p) / 1024
    if h in t_hashes:
        t_hashes[h].append(tf)
    else:
        t_hashes[h] = [tf]
    print(f"{tf}: {size_kb:.1f} KB (hash: {h[:8]})")

print("\n--- DUPLICATE TOURS ---")
for h, fnames in t_hashes.items():
    if len(fnames) > 1:
        print(f"DUPLICATE GROUP ({len(fnames)} files): {', '.join(fnames)}")
