import urllib.request
import urllib.parse
import json

def search_wikimedia(query, limit=5):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={urllib.parse.quote(query)}&gsrnamespace=6&gsrlimit={limit}&prop=imageinfo&iiprop=url|size&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'CrossHuntImageBot/1.0 (contact@crosshunt.org)'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            pages = data.get('query', {}).get('pages', {})
            results = []
            for pid, p in pages.items():
                title = p.get('title', '')
                ii = p.get('imageinfo', [{}])[0]
                img_url = ii.get('url', '')
                w = ii.get('width', 0)
                h = ii.get('height', 0)
                if img_url and (img_url.lower().endswith('.jpg') or img_url.lower().endswith('.jpeg') or img_url.lower().endswith('.png')):
                    if w >= 800 and h >= 500:
                        results.append({'title': title, 'url': img_url, 'width': w, 'height': h})
            return results
    except Exception as e:
        print(f"Error searching {query}: {e}")
        return []

test_queries = [
    "Cruise ship sunset",
    "Night cruise ship",
    "Passenger catamaran",
    "River cruise boat evening",
    "Dolphin tour boat",
    "Dinner cruise ship",
]

for q in test_queries:
    res = search_wikimedia(q, 3)
    print(f"\n=== Query: {q} (Found {len(res)}) ===")
    for r in res[:2]:
        print(f"- {r['title']} ({r['width']}x{r['height']}): {r['url'][:90]}...")
