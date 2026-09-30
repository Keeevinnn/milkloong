from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "assets" / "sprites"
for n in range(1, 8):
    p = OUT / f"s{n}.png"
    im = Image.open(p)
    assert im.size == (512, 512), (p, im.size)
    assert im.mode == "RGBA", (p, im.mode)
    a = im.getchannel("A")
    assert a.getpixel((0, 0)) == 0 and a.getpixel((511, 511)) == 0, (p, "角落不透明")
    bbox = a.getbbox()
    assert bbox and (bbox[2] - bbox[0]) > 300, (p, "主体过小", bbox)
    hist = a.histogram()
    opaque = sum(hist[200:])
    assert opaque > 512 * 512 * 0.2, (p, "主体像素过少", opaque)
    print(f"s{n}.png ok opaque={opaque}")
print("ALL SPRITES OK")
