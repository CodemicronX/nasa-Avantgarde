"""Fetch NASA textures (stitched from WMTS tiles) and CelesTrak TLE snapshots.
Run: python3 scripts/fetch_assets.py   (needs Pillow)"""
import io, json, urllib.request, datetime, os
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), "..", "public")
UA = {"User-Agent": "lost-in-space-hackathon/1.0"}
def get(url, tries=4):
    import time
    for i in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        except Exception as e:
            if i == tries-1: raise
            time.sleep(5*(i+1))

def stitch(tpl, z, cols, rows, size, out):
    if os.path.exists(os.path.join(ROOT, "textures", out)): return
    img = Image.new("RGB", (cols*size, rows*size))
    for y in range(rows):
        for x in range(cols):
            t = Image.open(io.BytesIO(get(tpl.format(z=z, y=y, x=x)))).convert("RGB")
            img.paste(t.resize((size, size)), (x*size, y*size))
    img.save(os.path.join(ROOT, "textures", out), quality=86)
    print("texture", out, img.size)

TREK = "https://trek.nasa.gov/tiles/{body}/EQ/{layer}/1.0.0/default/default028mm/{{z}}/{{y}}/{{x}}.jpg"
# z=2 -> 8x4 tiles of 256 px = 2048x1024 equirectangular
stitch(TREK.format(body="Moon", layer="LRO_WAC_Mosaic_Global_303ppd_v02"), 2, 8, 4, 256, "moon.jpg")
stitch(TREK.format(body="Mars", layer="Mars_Viking_MDIM21_ClrMosaic_global_232m"), 2, 8, 4, 256, "mars.jpg")
# GIBS EPSG:4326, 500m BlueMarble, level 2 -> 5x3 tiles of 512 (last row/col partly empty) ; use level 1 = 3x2? use level 2 and crop
if not os.path.exists(os.path.join(ROOT, "textures", "earth.jpg")):
  GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief_Bathymetry/default/500m/{z}/{y}/{x}.jpeg"
  img = Image.new("RGB", (5*512, 3*512))
  for y in range(3):
      for x in range(5):
          img.paste(Image.open(io.BytesIO(get(GIBS.format(z=2, y=y, x=x)))).convert("RGB"), (x*512, y*512))
  # level 2 covers 288 deg per 512 tile? compute: GIBS 4326 level2 tile = 72 deg -> 360/72=5 cols, 180/72=2.5 rows
  img = img.crop((0, 0, 2560, 1280)).resize((2048, 1024))
  img.save(os.path.join(ROOT, "textures", "earth.jpg"), quality=86)
  print("texture earth.jpg", img.size)

groups = {"cosmos-2251-debris": "Kosmos 2251 debris", "iridium-33-debris": "Iridium 33 debris",
          "fengyun-1c-debris": "Fengyun-1C debris"}
snap = {"fetched": datetime.datetime.now(datetime.timezone.utc).isoformat(), "source": "https://celestrak.org/NORAD/elements/", "groups": {}}
for g, label in groups.items():
    txt = get(f"https://celestrak.org/NORAD/elements/gp.php?GROUP={g}&FORMAT=tle").decode()
    lines = [l.rstrip() for l in txt.splitlines() if l.strip()]
    sats = [[lines[i].strip(), lines[i+1], lines[i+2]] for i in range(0, len(lines)-2, 3)]
    snap["groups"][g] = {"label": label, "tle": sats}
    print(g, len(sats)); import time; time.sleep(2)
special = {}
for name, catnr in {"VANGUARD 1": 5, "ENVISAT": 27386, "ISS (ZARYA)": 25544}.items():
    txt = get(f"https://celestrak.org/NORAD/elements/gp.php?CATNR={catnr}&FORMAT=tle").decode()
    l = [x.rstrip() for x in txt.splitlines() if x.strip()]
    special[name] = l[:3]
snap["special"] = special
json.dump(snap, open(os.path.join(ROOT, "data", "tle-snapshot.json"), "w"))
print("special", list(special))
