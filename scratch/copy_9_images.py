import os
import shutil

artifact_dir = r'C:\Users\Paresh\.gemini\antigravity-ide\brain\dfe24eb5-f047-4d49-9e06-a6cfd3ba1e02'
static_vessels = r'c:\Users\Paresh\Desktop\Cross Hunt\static\images\vessels'
frontend_vessels = r'c:\Users\Paresh\Desktop\Cross Hunt\frontend\public\static\images\vessels'

images = [
    ('apex_oceanic_sovereign', 'apex_oceanic_sovereign_1790871857764.jpg'),
    ('heritage_star_clipper', 'heritage_star_clipper_1790872144970.jpg'),
    ('aegean_pulse_yacht', 'aegean_pulse_yacht_1790872294617.jpg'),
    ('skyline_grandeur', 'skyline_grandeur_1790872456178.jpg'),
    ('mv_ocean_pearl', 'mv_ocean_pearl_1790872562625.jpg'),
    ('arabian_celestial', 'arabian_celestial_1790872695161.jpg'),
    ('nordic_horizon', 'nordic_horizon_1790872826879.jpg'),
    ('artisan_ocean_voyager', 'artisan_ocean_voyager_1790872968720.jpg'),
    ('emerald_isle_seafarer', 'emerald_isle_seafarer_1790873106759.jpg'),
]

for name, art_file in images:
    art_path = os.path.join(artifact_dir, art_file)
    stat_path = os.path.join(static_vessels, f'{name}.jpg')
    front_path = os.path.join(frontend_vessels, f'{name}.jpg')
    if os.path.exists(art_path):
        shutil.copy2(art_path, stat_path)
        shutil.copy2(art_path, front_path)
        print(f"Copied {name}: {os.path.getsize(stat_path)} bytes")
    else:
        print(f"ERROR: {art_path} does not exist!")

print("All 9 images copied successfully!")
