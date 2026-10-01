from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "art" / "raw"
OUT = ROOT / "assets" / "sprites"
OUT.mkdir(parents=True, exist_ok=True)

# key -> (源文件, 象限框或 None)；象限为比例 (x0, y0, x1, y1)
SRC = {
    "s4": ("source-4poses.png", (0.0, 0.0, 0.5, 0.5)),   # 捧腹(蹲)
    "s1": ("source-4poses.png", (0.5, 0.0, 1.0, 0.5)),   # 比耶
    "s2": ("source-4poses.png", (0.0, 0.5, 0.5, 1.0)),   # 比心(站)
    "s6": ("source-4poses.png", (0.5, 0.5, 1.0, 1.0)),   # 比心(盘腿)
    "s3": ("q17.jpeg", None),                            # 抱头震惊
    "s5": ("q13.gif", None),                             # 蛋形捧腹笑
    "s7": ("q01.jpeg", None),                            # 粉色魔化终极
    "s8": ("q07.png", None),                           # 弯腰 S 形大笑
    "s9": ("q09.jpeg", None),                          # 绿色站立捧腹大笑
}


def bg_like(r, g, b):
    # min 190->170：s3/s5/s7 底部软阴影核偏暗，190 会残留灰带
    return min(r, g, b) > 170 and max(r, g, b) - min(r, g, b) < 30


def shadow_like(r, g, b):
    """地面残影灰：低饱和中亮灰。仅对 SHADOW_FLOOD 指定的源启用，
    以免吞掉 s5/s6 保留的软地影（同色域但控制器已验收）。"""
    return max(r, g, b) - min(r, g, b) < 25 and min(r, g, b) > 120


# 启用阴影泛洪分支的源（s3 底边锯齿灰地残；s8/s9 脚下软影）
SHADOW_FLOOD = {"s3", "s8", "s9"}

# 水印字与主体轮廓相连、flood/drop_small 都清不掉时：在该源矩形内把白字
# 及其抗alias混边（b 高且 g-b 小）按列竖填——上下都探到主体绿才填两者均值，
# 轮廓列因此复原；落在白底上的字上下探不到绿，保持白待 flood 清除。
# s9 右下“豆包AI生成”用（字压在右腿右缘上）。
WM_INPAINT = {"s9": (0.80, 0.93, 0.99, 1.0)}


def tip_like(r, g, b):
    """上象限棍头插进下象限顶部：黑核及其与黄头/白底的混色（橄榄灰）。
    max<202 以避开头部侧面偏绿的阴影带 (205,211,99) 等。"""
    return max(r, g, b) < 202


def pale_aa(c):
    """冠顶/边缘的浅黄抗alias：亮且偏白，视为背景侧。"""
    return max(c) > 235 and min(c) > 125


def stick_like(r, g, b):
    """黑棍核、棍边抗alias、棍×主体混色：暗或中低亮低饱和；奶油肚皮(mx>220)与黄身(diff>100)不命中。"""
    mx, mn = max(r, g, b), min(r, g, b)
    return mx < 210 and mx - mn < 70


def remove_top_tip(px, w, h):
    """下象限顶部邻象限棍头：自第 0 行暗像素泛洪（限上 1/4 区），返回 mask。"""
    mask = bytearray(w * h)
    dq = deque()
    for x in range(w):
        r, g, b, a = px[x, 0]
        if a and tip_like(r, g, b):
            mask[x] = 1
            dq.append((x, 0))
    lim = h // 4
    while dq:
        x, y = dq.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < lim:
                i = ny * w + nx
                if not mask[i]:
                    r, g, b, a = px[nx, ny]
                    if a and tip_like(r, g, b):
                        mask[i] = 1
                        dq.append((nx, ny))
    for _ in range(3):                             # 收掉棍头圈浅橄榄抗alias环
        grown = []
        for y in range(lim):
            base = y * w
            for x in range(w):
                if mask[base + x]:
                    continue
                r, g, b, a = px[x, y]
                if not a or not (max(r, g, b) < 250 and min(r, g, b) < 210
                                 and max(r, g, b) - min(r, g, b) < 90):
                    continue
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < lim and mask[ny * w + nx]:
                        grown.append(base + x)
                        break
        if not grown:
            break
        for i in grown:
            mask[i] = 1
    return mask


def stick_span_mask(px, w, h):
    """自底行向上逐行追踪黑棍列跨度（含棍上白点与抗alias），返回 mask。"""
    mask = bytearray(w * h)
    dark = [x for x in range(w) if stick_like(*px[x, h - 1][:3])]
    if not dark:
        return mask
    c = sum(dark) / len(dark)
    prev = (min(dark), max(dark))
    lo = hi = None
    for y in range(h - 1, h // 2 - 1, -1):
        x0, x1 = max(0, int(c) - 14), min(w, int(c) + 15)
        run = []
        for x in range(x0, x1):
            r, g, b, a = px[x, y]
            if a and stick_like(r, g, b):
                run.append(x)
            elif a and min(r, g, b) > 225 and prev[0] + 2 <= x <= prev[1] - 2:
                run.append(x)                      # 棍上白点
        if not run:
            if lo is not None:
                for yy in (y, y - 1):              # 棍顶抗alias残行一并纳入
                    if yy >= h // 2:
                        for x in range(max(0, lo - 5), min(w, hi + 6)):
                            mask[yy * w + x] = 1
            break
        lo = max(min(run) - 3, int(c) - 10)
        hi = min(max(run) + 3, int(c) + 14)
        for _ in range(4):                         # 吸收跨度外相邻灰残料(不吞暗手)
            if lo > 0 and stick_like(*px[lo - 1, y][:3]) and max(px[lo - 1, y][:3]) > 120:
                lo -= 1
            if hi < w - 1 and stick_like(*px[hi + 1, y][:3]) and max(px[hi + 1, y][:3]) > 120:
                hi += 1
        for x in range(lo, hi + 1):
            mask[y * w + x] = 1
        c = (min(run) + max(run)) / 2
        prev = (min(run), max(run))
    return mask


def inpaint(px, w, h, mask):
    """mask 跨度按行水平线性插值补色（主体区补主体色，白底区补白待 flood 清除）。"""
    for y in range(h):
        base = y * w
        x = 0
        while x < w:
            if mask[base + x]:
                x0 = x
                while x < w and mask[base + x]:
                    x += 1
                x1 = x - 1
                kind = mask[base + x0]
                xl, xr = x0 - 1, x1 + 1
                cl = px[xl, y][:3] if xl >= 0 else None
                cr = px[xr, y][:3] if xr < w else None
                if cl is None and cr is None:
                    continue
                if cl is None:
                    cl = cr
                if cr is None:
                    cr = cl
                lb = bg_like(*cl)
                rb = bg_like(*cr)
                if lb and rb:
                    mode = "white"                    # 白底区：补白待 flood 清除
                elif kind == 1 and (lb or rb or pale_aa(cl) or pale_aa(cr)):
                    mode = "body"                     # 棍头区靠边：恒填主体侧色
                else:
                    mode = "lerp"
                span = xr - xl
                edge = max(3, (x1 - x0 + 1) // 4)
                # 体侧取色：自邻像素向体内探 4px，取最暖(r-g)者，
                # 跳过棍投在体侧的橄榄阴影带(g>=r)，避免填出绿色抹痕（s6 冠右）
                bx = xl if rb else xr
                bdx = -1 if rb else 1
                body, bv = None, -999
                xx2 = bx
                for _ in range(4):
                    if 0 <= xx2 < w:
                        c = px[xx2, y][:3]
                        if c[0] - c[1] > bv:
                            bv, body = c[0] - c[1], c
                        if bv >= 15:
                            break
                    xx2 += bdx
                if body is None:
                    body = cl if rb else cr
                for xx in range(x0, x1 + 1):
                    if mode == "lerp":
                        t = (xx - xl) / span
                        px[xx, y] = tuple(int(cl[i] * (1 - t) + cr[i] * t) for i in range(3)) + (255,)
                    elif mode == "white":
                        px[xx, y] = (255, 255, 255, 255)
                    elif lb and xx < x0 + edge:
                        px[xx, y] = (255, 255, 255, 255)
                    elif rb and xx > x1 - edge:
                        px[xx, y] = (255, 255, 255, 255)
                    else:
                        px[xx, y] = tuple(body) + (255,)
            else:
                x += 1


def flood_bg(px, w, h, shadow=False):
    """从四边泛洪，把连通的白底/软阴影置透明；透明区可穿越，不透明非背景区停止。
    shadow=True 时额外接受 shadow_like 灰影（主体内部封闭，不会误吞）。"""
    seen = bytearray(w * h)
    dq = deque()
    for x in range(w):
        dq.append((x, 0)); dq.append((x, h - 1))
    for y in range(h):
        dq.append((0, y)); dq.append((w - 1, y))
    while dq:
        x, y = dq.popleft()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        r, g, b, a = px[x, y]
        if a:
            if not (bg_like(r, g, b) or (shadow and shadow_like(r, g, b))):
                continue          # 不透明的主体：停止扩散
            px[x, y] = (0, 0, 0, 0)
        dq.append((x + 1, y)); dq.append((x - 1, y))
        dq.append((x, y + 1)); dq.append((x, y - 1))


def drop_small(px, w, h):
    """删除面积 < 总面积 0.5% 的不透明连通块（最大块恒保留），清除游离残料。"""
    lab = bytearray(w * h)
    comps = []
    for start in range(w * h):
        if lab[start] or not px[start % w, start // w][3]:
            continue
        cid = len(comps) + 1
        cells = [start]
        lab[start] = cid
        dq = deque([start])
        while dq:
            i = dq.popleft()
            x, y = i % w, i // w
            for nx in (x - 1, x, x + 1):
                for ny in (y - 1, y, y + 1):
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if not lab[j] and px[nx, ny][3]:
                            lab[j] = cid
                            cells.append(j)
                            dq.append(j)
        comps.append(cells)
    if not comps:
        return
    thresh = w * h * 0.005
    biggest = max(range(len(comps)), key=lambda k: len(comps[k]))
    for k, cells in enumerate(comps):
        if k == biggest or len(cells) >= thresh:
            continue
        for i in cells:
            px[i % w, i // w] = (0, 0, 0, 0)


def trim_square(img):
    bbox = img.getbbox()
    img = img.crop(bbox)
    w, h = img.size
    side = int(max(w, h) * 1.08)          # 4% 边距
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - w) // 2, (side - h) // 2), img)
    return canvas.resize((512, 512), Image.LANCZOS)


def build(key, fname, quad):
    im = Image.open(RAW / fname)
    try:
        im.seek(0)
    except Exception:
        pass
    im = im.convert("RGBA")
    if quad:
        w, h = im.size
        x0, y0, x1, y1 = quad
        im = im.crop((int(w * x0), int(h * y0), int(w * x1), int(h * y1)))
    px = im.load()
    w, h = im.size
    if quad:
        mt = remove_top_tip(px, w, h)
        ms = stick_span_mask(px, w, h)
        mask = bytearray(w * h)
        for i in range(w * h):
            mask[i] = 1 if mt[i] else (2 if ms[i] else 0)
        inpaint(px, w, h, mask)
    if key in WM_INPAINT:
        x0, y0, x1, y1 = WM_INPAINT[key]

        def green_dom(c):
            return c[1] - c[2] >= 80

        def wm_like(c):
            return c[2] > 110 and c[1] - c[2] < 80

        for xx in range(int(w * x0), min(w, int(w * x1) + 1)):
            for yy in range(int(h * y0), min(h, int(h * y1) + 1)):
                if not wm_like(px[xx, yy]):
                    continue
                up = dn = None
                for uy in range(yy - 1, max(yy - 90, -1), -1):
                    if green_dom(px[xx, uy]):
                        up = px[xx, uy][:3]
                        break
                for dy in range(yy + 1, min(yy + 90, h)):
                    if green_dom(px[xx, dy]):
                        dn = px[xx, dy][:3]
                        break
                if up is not None and dn is not None:
                    px[xx, yy] = tuple((u + d) // 2 for u, d in zip(up, dn)) + (255,)
        # 竖填留在轮廓列的浅混色（上下取样到边缘抗alias）向内取纯色抹平
        for xx in range(int(w * x0) + 2, min(w, int(w * x1) + 1)):
            for yy in range(int(h * y0), min(h, int(h * y1) + 1)):
                r, g, b, a = px[xx, yy]
                if a and b > 150 and g - b < 60 and green_dom(px[xx - 2, yy]):
                    px[xx, yy] = px[xx - 2, yy]
    flood_bg(px, w, h, shadow=key in SHADOW_FLOOD)
    drop_small(px, w, h)
    for yy in range(h):
        for xx in range(w):
            if px[xx, yy][3] <= 8:
                px[xx, yy] = (0, 0, 0, 0)
    out = trim_square(im)
    out.save(OUT / f"{key}.png")
    print(key, "ok", out.size)


for key, (fname, quad) in SRC.items():
    build(key, fname, quad)
