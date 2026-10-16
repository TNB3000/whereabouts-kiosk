"""Copy and size the brand assets the kiosk uses from the __TTC Assets library.

Run from anywhere:  python kiosk/tools/prepare-assets.py
Re-run after swapping a source file; existing outputs are overwritten.
"""
from pathlib import Path
import shutil
import subprocess
from PIL import Image

PROVENANCE = []  # (dest, origin note) pairs, embedded into each raster at the end
IMPECCABLE = Path.home() / ".claude" / "skills" / "impeccable" / "scripts" / ("impeccable.cmd" if __import__("os").name == "nt" else "impeccable")

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "__TTC Assets"
OUT = ROOT / "kiosk" / "assets"

BRAND = SRC / "01 Whereabouts Brand"
WEB = SRC / "03 Website"
MKT = SRC / "02 Marketing Assets" / "Whereabouts Component images"
BLOG = SRC / "04 Blog"
ADS = SRC / "06 Ads" / "2026 Tripper Ads" / "Assets"
NEWS = SRC / "08 Email Newsletters" / "2026 10"


def copy(src: Path, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dest)
    print("copy ", dest.relative_to(OUT))


def raster(src: Path, dest: Path, max_w: int | None = None, max_h: int | None = None, white=False, trim=False):
    dest.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(src)
    im = im.convert("RGBA") if (im.mode != "RGBA") else im
    if trim:
        bbox = im.getbbox()
        if bbox:
            im = im.crop(bbox)
    if white:
        # Grey client logos become white marks for the green field: keep alpha, paint ink white.
        a = im.getchannel("A")
        im = Image.merge("RGBA", (Image.new("L", im.size, 255),) * 3 + (a,))
    w, h = im.size
    scale = 1.0
    if max_w and w > max_w:
        scale = min(scale, max_w / w)
    if max_h and h > max_h:
        scale = min(scale, max_h / h)
    if scale < 1.0:
        im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    im.save(dest, optimize=True)
    print(f"image {dest.relative_to(OUT)}  {im.size[0]}x{im.size[1]}")
    note = f"Pre-existing Whereabouts asset, not generated. Source: {src.relative_to(ROOT).as_posix()}. Prepared by kiosk/tools/prepare-assets.py"
    if white:
        note += " (grey client logo recoloured white for the green field)"
    PROVENANCE.append((dest, note))


# Brand vectors
copy(BRAND / "01 Logos" / "Whereabouts Logo_White.svg", OUT / "brand" / "wordmark-white.svg")
copy(BRAND / "01 Logos" / "Whereabouts Icon.svg", OUT / "brand" / "icon.svg")
copy(BRAND / "04 Graphics" / "Road graphic.svg", OUT / "brand" / "road.svg")

# Font
copy(BRAND / "02 Font" / "Outfit" / "Outfit-VariableFont_wght.ttf", OUT / "fonts" / "Outfit-Variable.ttf")
copy(BRAND / "02 Font" / "Outfit" / "OFL.txt", OUT / "fonts" / "OFL.txt")

# Product shots
S = OUT / "shots"
raster(WEB / "TIAO Whereabouts Page" / "whereabouts-directory.png", S / "directory.png", 1600)
raster(MKT / "Event Card Mockup - Chili.png", S / "event-card-chili.png", trim=True)
raster(MKT / "Listing Card.png", S / "listing-card.png")
raster(MKT / "Note Card.png", S / "note-card.png")
raster(MKT / "People Card.png", S / "people-card.png")
raster(WEB / "TIAO Whereabouts Page" / "whereabouts-events.png", S / "events.png", 1600)
raster(BLOG / "2026_03_27 People App" / "People - Profiles.png", S / "people-profiles.png")
raster(BLOG / "2026_02_18 Broadcasts" / "Broadcasts - Cover.png", S / "broadcasts-cover.png", 2000)
raster(ADS / "Smartphone-title.png", S / "phone-title.png", 760, trim=True)
raster(ADS / "Smartphone-map.png", S / "phone-map.png", 760, trim=True)
raster(ADS / "Smartphone-lunchstops.png", S / "phone-lunch.png", 760, trim=True)
raster(WEB / "Feature Pages" / "Home Page Collages" / "widgets-collage-3.png", S / "widgets-collage.png", 1800)

# Proof
P = OUT / "proof"
raster(NEWS / "tiaoxwhereabouts.png", P / "tiao-x-whereabouts.png", 1800, trim=True)
raster(NEWS / "Group 24.png", P / "summit-ticketing.png", 1800)
raster(SRC / "2025 Travel & Hospitality Award" / "Whereabouts_Award Logo.png", P / "award-2025.png", 800)

# Client logos: white versions of the grey set, for the green field
L = OUT / "logos"
GREY = WEB / "01 Client Logos" / "Edited Logos (Grey)"
for name, out in [
    ("TIAO.png", "tiao"), ("DNO.png", "dno"), ("ITO.png", "ito"), ("The Seven.png", "the-seven"),
    ("BMVA.png", "bmva"), ("OHTO.png", "ohto"), ("Grey County.png", "grey-county"),
    ("Simcoe County.png", "simcoe"), ("Visit Nac.png", "visit-nac"), ("NW Illinois.png", "nw-illinois"),
    ("Yukon.png", "yukon"),
]:
    raster(GREY / name, L / f"{out}.png", 420, 160, white=True, trim=True)

# Video
V = OUT / "video"
V.mkdir(parents=True, exist_ok=True)
copy(SRC / "02 Marketing Assets" / "Whereabouts Supademo Video - 20260715.mp4", V / "whereabouts-demo.mp4")

# Provenance: every shipping raster records where it came from (Impeccable's embed-prompt, when installed).
if IMPECCABLE.exists():
    for dest, note in PROVENANCE:
        subprocess.run([str(IMPECCABLE), "embed-prompt", str(dest), "--prompt", note], check=False, capture_output=True)
    print(f"provenance embedded in {len(PROVENANCE)} rasters")
else:
    print("impeccable not found; provenance step skipped")
print("done")
