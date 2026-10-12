import urllib.request
import json

req = urllib.request.Request('http://localhost:8000/api/cruises/?sort_by=rating')
with urllib.request.urlopen(req) as r:
    data = json.loads(r.read())
    cruises = data.get('cruises', [])[:8]
    print('=== FIRST 8 FEATURED CRUISES ON HOMEPAGE ===')
    for c in cruises:
        print(f"ID {c['id']}: {c['name']} | category: {c.get('category')} | img: {c.get('image')}")
