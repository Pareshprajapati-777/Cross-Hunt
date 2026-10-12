import os

tours_dir = r'c:\Users\Paresh\Desktop\Cross Hunt\static\images\tours'
vessels_dir = r'c:\Users\Paresh\Desktop\Cross Hunt\static\images\vessels'

print("=== TOURS FILES ===")
for f in sorted(os.listdir(tours_dir)):
    p = os.path.join(tours_dir, f)
    print(f"{f}: {os.path.getsize(p)} bytes")
