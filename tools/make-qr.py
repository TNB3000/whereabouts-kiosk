"""Regenerate the kiosk's demo QR code.

    python kiosk/tools/make-qr.py https://whereabouts.tech/your-booking-link

Writes kiosk/assets/qr-demo.svg (charcoal modules, transparent ground). Needs `pip install segno`.
"""
import sys
from pathlib import Path
import segno

url = sys.argv[1] if len(sys.argv) > 1 else "https://whereabouts.tech/"
out = Path(__file__).resolve().parents[1] / "assets" / "qr-demo.svg"
qr = segno.make(url, error="q")
qr.save(str(out), kind="svg", scale=10, border=0, dark="#2B2B2B", light=None, xmldecl=False, svgclass=None, lineclass=None)
print(f"wrote {out} for {url} (version {qr.version}, {qr.symbol_size()[0]} modules)")
