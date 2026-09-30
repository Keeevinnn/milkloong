# 合成大奶蛙 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个「合成大西瓜」玩法的奶蛙合成网页游戏：7 阶段合成链、计分、越线判负、鼠标/触屏双适配，纯静态可托管 GitHub Pages。

**Architecture:** matter.js（vendored）做圆形刚体物理与合并检测；Canvas 2D 自绘棋子与特效；DOM 做 HUD 与遮罩；经典 `<script>` 全局命名空间 `window.MF` 组织模块（保证 file:// 双击可玩）。

**Tech Stack:** 原生 JS (ES2019)、Canvas 2D、matter.js 0.20.0 (vendored)、Python 3.12 + Pillow（仅美术管线）、browser-use MCP（验收）。

**Spec:** `docs/superpowers/specs/2026-09-30-milk-frog-merge-design.md`

## Global Constraints

- 逻辑游戏区 `W=420, H=700`；瞄准区 `AIM_Y=60`；警戒线 `DANGER_Y=110`；墙内边距 `WALL=4`
- 阶段半径 r = [_, 24, 32, 41, 51, 63, 76, 92]；合并生成得分 = [_, _, 1, 3, 6, 10, 15, 21]；首次合成 stage7 额外 +100
- 落子随机 stage ∈ {1,2}，权重 0.6/0.4；落子冷却 400ms；越线判定：落龄 >1200ms 且 `y-r<110` 持续 1500ms → game over
- 最高分键 `localStorage["milkfrog-best"]`
- matter.js 0.20.0 vendored 于 `vendor/matter.min.js`，运行期禁止任何 CDN 引用
- 界面文案全中文；`art/raw/` 入 `.gitignore`，不上传公网
- 物理参数：棋子 restitution 0.15 / friction 0.05 / frictionAir 0.008；墙 restitution 0.1；`enableSleeping=false`
- 本仓库尚非 git 仓库；经批准的设计约定 **git init 与提交推迟到发布步骤**，故本计划各任务以「验收命令通过」代替 commit 步骤
- 一次性依赖安装（已在设计批准）：`pip install pillow`

---

### Task 1: 工程骨架 + vendored matter.js

**Files:**
- Create: `index.html`, `css/style.css`, `.gitignore`, `README.md`, `vendor/matter.min.js`
- Create dirs: `js/`, `assets/sprites/`, `tools/`

**Interfaces:**
- Produces: `index.html` 以固定顺序加载 `vendor/matter.min.js → js/rules.js → js/sprites.js → js/physics.js → js/render.js → js/input.js → js/main.js`；DOM 结构 id：`#wrap > canvas#game`、HUD `#score #best #next-img #btn-restart`、遮罩 `#overlay-win`（按钮 `#btn-continue #btn-win-restart`）、`#overlay-over`（按钮 `#btn-over-restart`）

- [ ] **Step 1: 下载 matter.js 并校验**

```bash
cd "D:/其它/Milkloong" && mkdir -p js assets/sprites tools css vendor
curl -s --max-time 30 -o vendor/matter.min.js https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js
stat -c%s vendor/matter.min.js   # 期望 > 60000
head -c 120 vendor/matter.min.js # 期望含 matter-js 版权注释
```

- [ ] **Step 2: 写 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>合成大奶蛙</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<div id="wrap">
  <canvas id="game"></canvas>
  <div id="hud">
    <div id="hud-left">
      <div id="title">合成大奶蛙</div>
      <div id="scores">分数 <span id="score">0</span> ｜ 最高 <span id="best">0</span></div>
    </div>
    <div id="hud-right">
      <div id="next-label">下一个</div>
      <img id="next-img" alt="下一个奶蛙">
      <button id="btn-restart" type="button">重开</button>
    </div>
  </div>
  <div class="overlay hidden" id="overlay-win">
    <div class="card">
      <h2>合成终极大奶蛙！</h2>
      <p>本局 <span class="final-score"></span> 分</p>
      <button id="btn-continue" type="button">继续无尽</button>
      <button id="btn-win-restart" type="button">再来一局</button>
    </div>
  </div>
  <div class="overlay hidden" id="overlay-over">
    <div class="card">
      <h2>堆太高啦！</h2>
      <p>本局 <span class="final-score"></span> 分 ｜ 最高 <span class="final-best"></span> 分</p>
      <button id="btn-over-restart" type="button">再来一局</button>
    </div>
  </div>
</div>
<script src="vendor/matter.min.js"></script>
<script src="js/rules.js"></script>
<script src="js/sprites.js"></script>
<script src="js/physics.js"></script>
<script src="js/render.js"></script>
<script src="js/input.js"></script>
<script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: 写 css/style.css**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; }
body {
  background: #fdf6e3;
  display: flex; align-items: center; justify-content: center;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  overflow: hidden; overscroll-behavior: none;
}
#wrap { position: relative; }
#game {
  display: block;
  aspect-ratio: 420 / 700;
  height: min(100dvh, calc(100vw * 700 / 420));
  touch-action: none;
  user-select: none; -webkit-user-select: none;
}
#hud {
  position: absolute; top: 0; left: 0; right: 0;
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 8px 12px; pointer-events: none; color: #6b4f2a;
}
#title { font-size: 18px; font-weight: 700; }
#scores { font-size: 13px; margin-top: 2px; }
#hud-right { display: flex; flex-direction: column; align-items: center; gap: 4px; }
#next-label { font-size: 12px; }
#next-img { width: 44px; height: 44px; object-fit: contain; }
#btn-restart {
  pointer-events: auto; border: none; border-radius: 999px;
  background: #ffd666; color: #6b4f2a; font-size: 13px;
  padding: 4px 14px; cursor: pointer;
}
.overlay {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(60, 40, 10, 0.45);
}
.overlay.hidden { display: none; }
.card {
  background: #fffaf0; border-radius: 16px; padding: 24px 32px;
  text-align: center; color: #6b4f2a; box-shadow: 0 8px 30px rgba(0,0,0,.25);
}
.card h2 { font-size: 22px; margin-bottom: 10px; }
.card p { font-size: 14px; margin-bottom: 16px; }
.card button {
  border: none; border-radius: 999px; background: #ffd666; color: #6b4f2a;
  font-size: 15px; padding: 8px 20px; margin: 0 6px; cursor: pointer;
}
```

- [ ] **Step 4: 写 .gitignore 与 README.md**

`.gitignore`：
```
art/raw/
__pycache__/
```

`README.md`：
```markdown
# 合成大奶蛙

借鉴「合成大西瓜」玩法的休闲合成小游戏：同形态奶蛙相撞合并升级，最终合成终极大奶蛙。

## 本地运行

双击 `index.html` 即可（无需服务器、无需联网）。

## 玩法

- 鼠标移动 / 手指拖动瞄准，点击 / 松手落下奶蛙
- 键盘：← → 移动，空格落下
- 同形态相撞合并为更大形态；奶蛙堆过警戒线 1.5 秒判负
- 合成粉色终极大奶蛙即通关，可继续无尽模式

## 声明

本项目为粉丝二创作品，非商用。角色形象版权归原作者方所有。
```

- [ ] **Step 5: 验收**

用 browser-use 打开 `file:///D:/其它/Milkloong/index.html`，`list_console_messages` 期望：无 error（允许 404 js 文件缺失提示，Task 3 起消除）；`take_screenshot` 期望：奶油底色 + HUD 文案可见。

---

### Task 2: 美术管线（Pillow 脚本生成 7 张棋子贴图）

**Files:**
- Create: `tools/make_sprites.py`, `tools/check_sprites.py`
- Produce: `assets/sprites/s1.png ~ s7.png`

**Interfaces:**
- Consumes: `art/raw/source-4poses.png`（四象限）、`art/raw/q17.jpeg`、`art/raw/q13.gif`、`art/raw/q01.jpeg`
- Produces: 512×512 RGBA 透明底 PNG，命名 `s1..s7`，对应 rules.js 的 sprite 字段

- [ ] **Step 1: 安装 Pillow**

```bash
pip install pillow
python -c "import PIL; print(PIL.__version__)"
```

- [ ] **Step 2: 写 tools/make_sprites.py**

```python
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
}


def bg_like(r, g, b):
    return min(r, g, b) > 190 and max(r, g, b) - min(r, g, b) < 30


def kill_stick(px, w, h):
    """截图象限下半区的黑棍柄与棍上白点置透明。"""
    for y in range(h // 2, h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not a:
                continue
            if max(r, g, b) < 60 or min(r, g, b) > 245:
                px[x, y] = (0, 0, 0, 0)


def flood_bg(px, w, h):
    """从四边泛洪，把连通的白底/软阴影置透明；透明区可穿越，不透明非背景区停止。"""
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
            if not bg_like(r, g, b):
                continue          # 不透明的主体：停止扩散
            px[x, y] = (0, 0, 0, 0)
        dq.append((x + 1, y)); dq.append((x - 1, y))
        dq.append((x, y + 1)); dq.append((x, y - 1))
```

```python
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
    im.seek(0)
    im = im.convert("RGBA")
    if quad:
        w, h = im.size
        x0, y0, x1, y1 = quad
        im = im.crop((int(w * x0), int(h * y0), int(w * x1), int(h * y1)))
    px = im.load()
    w, h = im.size
    if quad:
        kill_stick(px, w, h)
    flood_bg(px, w, h)
    out = trim_square(im)
    out.save(OUT / f"{key}.png")
    print(key, "ok", out.size)


for key, (fname, quad) in SRC.items():
    build(key, fname, quad)
```

- [ ] **Step 3: 写 tools/check_sprites.py（自动化验收）**

```python
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
```

- [ ] **Step 4: 运行并验收**

```bash
cd "D:/其它/Milkloong" && python tools/make_sprites.py && python tools/check_sprites.py
```
期望：输出 7 行 ok + `ALL SPRITES OK`。
随后用 Read 逐张查看 `assets/sprites/s1.png ~ s7.png`：主体完整、无黑棍残留、无白底块、无水印残字。若某张有残边：调 `bg_like` 阈值（min 190→170）或 `kill_stick` 阈值重跑。

---

### Task 3: rules.js + sprites.js（纯逻辑与贴图加载）

**Files:**
- Create: `js/rules.js`, `js/sprites.js`, `tools/test-rules.mjs`

**Interfaces:**
- Produces: `MF.rules.{W,H,AIM_Y,DANGER_Y,WALL,STAGES,MAX_STAGE,ULTIMATE_BONUS,clamp,clampX,clampPos,scoreFor,randSpawnStage}`；`MF.sprites.{load(onDone), get(n), isFailed(n)}`

- [ ] **Step 1: 写失败测试 tools/test-rules.mjs**

```js
import { readFileSync } from "node:fs";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
globalThis.window = globalThis;
new Function(readFileSync(join(root, "js/rules.js"), "utf8"))();

const R = globalThis.MF.rules;
assert.strictEqual(R.W, 420);
assert.strictEqual(R.H, 700);
assert.strictEqual(R.MAX_STAGE, 7);
assert.strictEqual(R.STAGES[7].r, 92);
assert.strictEqual(R.scoreFor(2), 1);
assert.strictEqual(R.scoreFor(7), 21);
assert.strictEqual(R.clamp(5, 10, 20), 10);
assert.strictEqual(R.clampX(0, 24), 28);          // WALL=4 → 24+4
assert.strictEqual(R.clampX(9999, 24), 392);      // 420-24-4
const p = R.clampPos(1, 1, 30);
assert.deepStrictEqual(p, { x: 34, y: 34 });
let ones = 0;
for (let i = 0; i < 4000; i++) if (R.randSpawnStage(Math.random) === 1) ones++;
assert.ok(ones > 1800 && ones < 2600, `权重偏离: ${ones}/4000`);
console.log("RULES TESTS PASS");
```

- [ ] **Step 2: 运行确认失败**

```bash
cd "D:/其它/Milkloong" && node tools/test-rules.mjs
```
期望：报错 `Cannot read properties of undefined (reading 'rules')` 或文件不存在。

- [ ] **Step 3: 写 js/rules.js**

```js
window.MF = window.MF || {};
MF.rules = (function () {
  "use strict";
  var W = 420, H = 700, AIM_Y = 60, DANGER_Y = 110, WALL = 4;
  var MAX_STAGE = 7, ULTIMATE_BONUS = 100;
  var STAGES = [
    null,
    { name: "比耶",       r: 24, score: 0,  sprite: "s1" },
    { name: "比心(站)",   r: 32, score: 1,  sprite: "s2" },
    { name: "抱头震惊",   r: 41, score: 3,  sprite: "s3" },
    { name: "捧腹(蹲)",   r: 51, score: 6,  sprite: "s4" },
    { name: "蛋形捧腹笑", r: 63, score: 10, sprite: "s5" },
    { name: "比心(盘腿)", r: 76, score: 15, sprite: "s6" },
    { name: "终极大奶蛙", r: 92, score: 21, sprite: "s7" }
  ];
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function clampX(x, r) { return clamp(x, r + WALL, W - r - WALL); }
  function clampPos(x, y, r) {
    return { x: clampX(x, r), y: clamp(y, r + WALL, H - r - WALL) };
  }
  function scoreFor(n) { return STAGES[n].score; }
  function randSpawnStage(rand) { return rand() < 0.6 ? 1 : 2; }
  return {
    W: W, H: H, AIM_Y: AIM_Y, DANGER_Y: DANGER_Y, WALL: WALL,
    STAGES: STAGES, MAX_STAGE: MAX_STAGE, ULTIMATE_BONUS: ULTIMATE_BONUS,
    clamp: clamp, clampX: clampX, clampPos: clampPos,
    scoreFor: scoreFor, randSpawnStage: randSpawnStage
  };
})();
```

- [ ] **Step 4: 运行测试确认通过**

```bash
node tools/test-rules.mjs
```
期望：`RULES TESTS PASS`

- [ ] **Step 5: 写 js/sprites.js**

```js
MF.sprites = (function () {
  "use strict";
  var images = {}, failed = {};
  function load(onDone) {
    var left = MF.rules.MAX_STAGE;
    for (var n = 1; n <= MF.rules.MAX_STAGE; n++) {
      (function (n) {
        var img = new Image();
        img.onload = function () { if (--left === 0) onDone(); };
        img.onerror = function () { failed[n] = true; if (--left === 0) onDone(); };
        img.src = "assets/sprites/" + MF.rules.STAGES[n].sprite + ".png";
        images[n] = img;
      })(n);
    }
  }
  function get(n) { return failed[n] ? null : images[n]; }
  function isFailed(n) { return !!failed[n]; }
  return { load: load, get: get, isFailed: isFailed };
})();
```

- [ ] **Step 6: 浏览器验收**

browser-use 打开 `file:///D:/其它/Milkloong/index.html` → `list_console_messages` 无脚本异常（此阶段 physics/render/input/main.js 尚未创建，忽略这些文件的 `ERR_FILE_NOT_FOUND` 资源报错）→ `evaluate_script` 执行 `() => { MF.sprites.load(() => { window.__loaded = true; }); return 'scheduled'; }` 后再执行 `() => ({ loaded: window.__loaded === true, failed: [1,2,3,4,5,6,7].filter(n => MF.sprites.isFailed(n)) })`，期望 `{loaded:true, failed:[]}`。

---

### Task 4: physics.js（世界、生成、合并检测）

**Files:**
- Create: `js/physics.js`

**Interfaces:**
- Consumes: `MF.rules.*`、全局 `Matter`
- Produces: `MF.physics.{init(mergeCb), spawn(stage,x,y,isDynamic), dropVelocity(body), pieces(), step(dtMs), reset(), now()}`；mergeCb 签名 `(newStage, x, y) => void`；棋子 body 带 `body.plugin = { stage, bornAt }`

- [ ] **Step 1: 写 js/physics.js**

```js
MF.physics = (function () {
  "use strict";
  var R = MF.rules;
  var engine = null, mergeCb = null;
  var pending = [], marked = {}, removed = {};

  function wallBodies() {
    var t = 60, o = { isStatic: true, restitution: 0.1, friction: 0.05 };
    return [
      Matter.Bodies.rectangle(R.WALL - t / 2, R.H / 2, t, R.H * 3, o),
      Matter.Bodies.rectangle(R.W - R.WALL + t / 2, R.H / 2, t, R.H * 3, o),
      Matter.Bodies.rectangle(R.W / 2, R.H - R.WALL + t / 2, R.W + 4 * t, t, o)
    ];
  }

  function init(cb) {
    mergeCb = cb;
    engine = Matter.Engine.create();
    engine.enableSleeping = false;
    Matter.Composite.add(engine.world, wallBodies());
    Matter.Events.on(engine, "collisionStart", function (e) {
      e.pairs.forEach(function (pair) {
        var a = pair.bodyA, b = pair.bodyB;
        var sa = a.plugin && a.plugin.stage, sb = b.plugin && b.plugin.stage;
        if (!sa || !sb || sa !== sb || sa >= R.MAX_STAGE) return;
        if (marked[a.id] || marked[b.id] || removed[a.id] || removed[b.id]) return;
        marked[a.id] = marked[b.id] = true;
        pending.push({ a: a, b: b, stage: sa });
      });
    });
    Matter.Events.on(engine, "afterUpdate", flushMerges);
  }

  function alive(body) {
    return !removed[body.id] && !!Matter.Composite.get(engine.world, body.id, "body");
  }

  function flushMerges() {
    if (!pending.length) return;
    var list = pending; pending = [];
    list.forEach(function (m) {
      delete marked[m.a.id]; delete marked[m.b.id];
      if (!alive(m.a) || !alive(m.b)) return;
      var ns = m.stage + 1;
      var nr = R.STAGES[ns].r;
      var mid = R.clampPos(
        (m.a.position.x + m.b.position.x) / 2,
        (m.a.position.y + m.b.position.y) / 2, nr);
      removeBody(m.a); removeBody(m.b);
      spawn(ns, mid.x, mid.y, true);
      if (mergeCb) mergeCb(ns, mid.x, mid.y);
    });
  }

  function removeBody(body) {
    removed[body.id] = true;
    Matter.Composite.remove(engine.world, body);
  }

  function spawn(stage, x, y, isDynamic) {
    var r = R.STAGES[stage].r;
    var body = Matter.Bodies.circle(x, y, r, {
      restitution: 0.15, friction: 0.05, frictionAir: 0.008,
      isStatic: !isDynamic
    });
    body.plugin = { stage: stage, bornAt: now() };
    Matter.Composite.add(engine.world, body);
    return body;
  }

  function dropVelocity(body) { Matter.Body.setVelocity(body, { x: 0, y: 8 }); }

  function pieces() {
    return Matter.Composite.allBodies(engine.world).filter(function (b) {
      return !b.isStatic && !removed[b.id];
    });
  }

  function step(dtMs) { Matter.Engine.update(engine, dtMs); }

  function reset() {
    pending = []; marked = {}; removed = {};
    Matter.Composite.clear(engine.world, false);
    Matter.Composite.add(engine.world, wallBodies());
  }

  function now() { return performance.now(); }

  return {
    init: init, spawn: spawn, dropVelocity: dropVelocity,
    pieces: pieces, step: step, reset: reset, now: now
  };
})();
```

- [ ] **Step 2: 浏览器验收合并链路**

browser-use 打开页面后 `evaluate_script`：
```js
() => {
  MF.physics.init(function (ns, x, y) { window.__merged = { ns: ns, x: x, y: y }; });
  MF.physics.spawn(1, 210, 300, true);
  MF.physics.spawn(1, 210, 200, true);
  for (let i = 0; i < 120; i++) MF.physics.step(1000 / 60);
  return { pieces: MF.physics.pieces().length, merged: window.__merged };
}
```
期望：`pieces === 1` 且 `merged.ns === 2`。再执行 reset 验证：`() => { MF.physics.reset(); return MF.physics.pieces().length; }` 期望 `0`。

---

### Task 5: render.js（Canvas 绘制与特效）

**Files:**
- Create: `js/render.js`

**Interfaces:**
- Consumes: `MF.rules.*`、`MF.sprites.get`
- Produces: `MF.render.{init(canvas), frame(view, dtMs), addPop(x,y,r), addText(x,y,str), addConfetti()}`；`view = { pieces:[{x,y,r,angle,stage}], aim:{stage,x}|null, warning:boolean, time:number }`

- [ ] **Step 1: 写 js/render.js**

```js
MF.render = (function () {
  "use strict";
  var R = MF.rules;
  var ctx = null, dpr = 1;
  var pops = [], texts = [], confetti = [];

  function init(canvas) {
    dpr = window.devicePixelRatio || 1;
    canvas.width = R.W * dpr;
    canvas.height = R.H * dpr;
    ctx = canvas.getContext("2d");
  }

  function addPop(x, y, r) { pops.push({ x: x, y: y, r: r, t: 0 }); }
  function addText(x, y, str) { texts.push({ x: x, y: y, str: str, t: 0 }); }
  function addConfetti() {
    for (var i = 0; i < 80; i++) {
      confetti.push({
        x: Math.random() * R.W, y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3,
        s: 4 + Math.random() * 6, rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.3,
        c: ["#ff6b81", "#ffd666", "#7bd389", "#6fa8ff", "#c58cff"][i % 5]
      });
    }
  }

  function drawPiece(p) {
    var img = MF.sprites.get(p.stage);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle || 0);
    if (img) {
      ctx.drawImage(img, -p.r, -p.r, p.r * 2, p.r * 2);
    } else {
      ctx.fillStyle = "#ffd666";
      ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 6.2832); ctx.fill();
      ctx.fillStyle = "#6b4f2a"; ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(p.stage), 0, 0);
    }
    ctx.restore();
  }

  function frame(view, dtMs) {
    var dt = dtMs / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var g = ctx.createLinearGradient(0, 0, 0, R.H);
    g.addColorStop(0, "#fff8e8"); g.addColorStop(1, "#ffe9c2");
    ctx.fillStyle = g; ctx.fillRect(0, 0, R.W, R.H);

    // 容器描边
    ctx.strokeStyle = "rgba(107,79,42,.35)"; ctx.lineWidth = 3;
    ctx.strokeRect(R.WALL, R.WALL, R.W - R.WALL * 2, R.H - R.WALL * 2);

    // 警戒线
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = view.warning
      ? "rgba(230,60,60," + (0.55 + 0.45 * Math.sin(view.time / 90)) + ")"
      : "rgba(230,60,60,.35)";
    ctx.lineWidth = view.warning ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(R.WALL, R.DANGER_Y); ctx.lineTo(R.W - R.WALL, R.DANGER_Y);
    ctx.stroke();
    ctx.restore();

    // 瞄准辅助线 + 当前棋子
    if (view.aim) {
      ctx.save();
      ctx.setLineDash([4, 8]);
      ctx.strokeStyle = "rgba(107,79,42,.25)"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(view.aim.x, R.AIM_Y + R.STAGES[view.aim.stage].r);
      ctx.lineTo(view.aim.x, R.H);
      ctx.stroke();
      ctx.restore();
      drawPiece({ x: view.aim.x, y: R.AIM_Y, r: R.STAGES[view.aim.stage].r, stage: view.aim.stage, angle: 0 });
    }

    view.pieces.forEach(drawPiece);

    // 合并 pop 光环
    pops = pops.filter(function (p) { return (p.t += dtMs) < 200; });
    pops.forEach(function (p) {
      var k = p.t / 200;
      ctx.strokeStyle = "rgba(255,214,102," + (1 - k) + ")";
      ctx.lineWidth = 4 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.7 + k * 0.6), 0, 6.2832); ctx.stroke();
    });

    // 飘分
    texts = texts.filter(function (t) { return (t.t += dtMs) < 800; });
    texts.forEach(function (t) {
      var k = t.t / 800;
      ctx.fillStyle = "rgba(107,79,42," + (1 - k) + ")";
      ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(t.str, t.x, t.y - 30 * k);
    });

    // confetti
    confetti = confetti.filter(function (c) { return c.y < R.H + 30; });
    confetti.forEach(function (c) {
      c.x += c.vx; c.y += c.vy; c.rot += c.vr;
      ctx.save();
      ctx.translate(c.x, c.y); ctx.rotate(c.rot);
      ctx.fillStyle = c.c; ctx.fillRect(-c.s / 2, -c.s / 2, c.s, c.s * 0.6);
      ctx.restore();
    });
  }

  return { init: init, frame: frame, addPop: addPop, addText: addText, addConfetti: addConfetti };
})();
```

- [ ] **Step 2: 浏览器验收**

（本阶段 main.js 尚未创建，控制台允许出现缺失 js 文件的资源加载报错 `net::ERR_FILE_NOT_FOUND`，只要求无脚本异常。）

`evaluate_script`：
```js
() => {
  MF.render.init(document.getElementById('game'));
  MF.sprites.load(() => {
    MF.render.addPop(210, 400, 40); MF.render.addText(210, 400, '+3');
    MF.render.frame({ pieces: [{ x: 210, y: 500, r: 41, angle: 0.3, stage: 3 }], aim: { stage: 1, x: 150 }, warning: false, time: 0 }, 16);
    window.__drawn = true;
  });
  return 'scheduled';
}
```
再执行 `() => window.__drawn === true` 期望 `true`；`take_screenshot` 期望：渐变背景、容器框、虚线警戒线、stage3 贴图棋子、瞄准虚线与比耶棋子可见。

---

### Task 6: input.js + main.js（状态机、HUD、遮罩、调试钩子）

**Files:**
- Create: `js/input.js`, `js/main.js`

**Interfaces:**
- Consumes: 前述全部模块
- Produces: `window.__milkfrog = { spawn(stage, x), dropAt(x), state() }` 供验收；`state()` 返回 `{ mode, score, best, pieces, aimStage, nextStage }`

- [ ] **Step 1: 写 js/input.js**

```js
MF.input = (function () {
  "use strict";
  function attach(canvas, handlers) {
    function toGameX(clientX) {
      var rect = canvas.getBoundingClientRect();
      return (clientX - rect.left) / rect.width * MF.rules.W;
    }
    canvas.addEventListener("pointermove", function (e) { handlers.aim(toGameX(e.clientX)); });
    canvas.addEventListener("pointerdown", function (e) {
      e.preventDefault(); handlers.aim(toGameX(e.clientX));
    });
    canvas.addEventListener("pointerup", function (e) {
      e.preventDefault(); handlers.aim(toGameX(e.clientX)); handlers.drop();
    });
    window.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); handlers.key(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); handlers.key(1); }
      else if (e.key === " " || e.key === "ArrowDown") { e.preventDefault(); handlers.drop(); }
    });
  }
  return { attach: attach };
})();
```

- [ ] **Step 2: 写 js/main.js**

```js
(function () {
  "use strict";
  var R = MF.rules;
  var S = {
    mode: "boot", score: 0,
    best: Number(localStorage.getItem("milkfrog-best") || 0),
    aim: null, next: 0, cooldownUntil: 0,
    overTimer: 0, wonShown: false, last: 0
  };
  var el = {};

  function $(id) { return document.getElementById(id); }

  function bindDom() {
    el.score = $("score"); el.best = $("best"); el.nextImg = $("next-img");
    el.win = $("overlay-win"); el.over = $("overlay-over");
    el.finalWin = el.win.querySelector(".final-score");
    el.finalOver = el.over.querySelector(".final-score");
    el.finalBest = el.over.querySelector(".final-best");
    $("btn-restart").addEventListener("click", restart);
    $("btn-win-restart").addEventListener("click", restart);
    $("btn-over-restart").addEventListener("click", restart);
    $("btn-continue").addEventListener("click", function () {
      S.mode = "playing"; el.win.classList.add("hidden");
    });
    el.best.textContent = S.best;
  }

  function newAim(keepX) {
    var x = S.aim && keepX ? S.aim.x : R.W / 2;
    S.aim = { stage: S.next || R.randSpawnStage(Math.random), x: x };
    S.next = R.randSpawnStage(Math.random);
    el.nextImg.src = "assets/sprites/" + R.STAGES[S.next].sprite + ".png";
  }

  function addScore(n) {
    S.score += n;
    el.score.textContent = S.score;
    if (S.score > S.best) {
      S.best = S.score;
      el.best.textContent = S.best;
      localStorage.setItem("milkfrog-best", String(S.best));
    }
  }

  function onMerge(ns, x, y) {
    addScore(R.scoreFor(ns));
    MF.render.addPop(x, y, R.STAGES[ns].r);
    MF.render.addText(x, y - R.STAGES[ns].r, "+" + R.scoreFor(ns));
    if (ns === R.MAX_STAGE && !S.wonShown) {
      S.wonShown = true;
      addScore(R.ULTIMATE_BONUS);
      MF.render.addConfetti();
      S.mode = "won";
      el.finalWin.textContent = S.score;
      el.win.classList.remove("hidden");
    }
  }

  function drop() {
    if (S.mode !== "playing" || !S.aim) return;
    if (performance.now() < S.cooldownUntil) return;
    var stage = S.aim.stage, r = R.STAGES[stage].r;
    var x = R.clampX(S.aim.x, r);
    var body = MF.physics.spawn(stage, x, R.AIM_Y, true);
    MF.physics.dropVelocity(body);
    S.cooldownUntil = performance.now() + 400;
    newAim(true);
  }

  function checkFail(dtMs) {
    var now = performance.now();
    var over = MF.physics.pieces().some(function (b) {
      return now - b.plugin.bornAt > 1200 && b.position.y - b.circleRadius < R.DANGER_Y;
    });
    S.overTimer = over ? S.overTimer + dtMs : 0;
    if (S.overTimer > 1500 && S.mode === "playing") {
      S.mode = "over";
      el.finalOver.textContent = S.score;
      el.finalBest.textContent = S.best;
      el.over.classList.remove("hidden");
    }
    return over;
  }

  function restart() {
    MF.physics.reset();
    S.score = 0; S.overTimer = 0; S.wonShown = false; S.cooldownUntil = 0;
    el.score.textContent = 0;
    el.win.classList.add("hidden"); el.over.classList.add("hidden");
    S.next = 0; S.aim = null;
    newAim(false);
    S.mode = "playing";
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    var dt = Math.min(ts - (S.last || ts), 50);
    S.last = ts;
    if (S.mode === "playing") {
      MF.physics.step(1000 / 60);
    }
    var warning = S.mode === "playing" && checkFail(S.mode === "playing" ? dt : 0);
    MF.render.frame({
      pieces: MF.physics.pieces().map(function (b) {
        return { x: b.position.x, y: b.position.y, r: b.circleRadius, angle: b.angle, stage: b.plugin.stage };
      }),
      aim: S.mode === "playing" ? S.aim : null,
      warning: warning, time: ts
    }, dt);
  }

  function start() {
    bindDom();
    MF.render.init($("game"));
    MF.physics.init(onMerge);
    MF.input.attach($("game"), {
      aim: function (x) { if (S.aim) S.aim.x = R.clampX(x, R.STAGES[S.aim.stage].r); },
      drop: drop,
      key: function (d) { if (S.aim) S.aim.x = R.clampX(S.aim.x + d * 12, R.STAGES[S.aim.stage].r); }
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) S.mode = S.mode === "playing" ? "paused" : S.mode;
      else if (S.mode === "paused") S.mode = "playing";
    });
    newAim(false);
    S.mode = "playing";
    requestAnimationFrame(loop);
  }

  window.__milkfrog = {
    spawn: function (stage, x) {
      var r = R.STAGES[stage].r;
      var b = MF.physics.spawn(stage, R.clampX(x == null ? R.W / 2 : x, r), R.AIM_Y, true);
      MF.physics.dropVelocity(b);
      return b.id;
    },
    spawnAt: function (stage, x, y) {
      return MF.physics.spawn(stage, x, y, true).id;
    },
    tick: function (n) {
      for (var i = 0; i < (n || 1); i++) MF.physics.step(1000 / 60);
    },
    dropAt: function (x) { if (x != null && S.aim) S.aim.x = R.clampX(x, R.STAGES[S.aim.stage].r); drop(); },
    state: function () {
      return {
        mode: S.mode, score: S.score, best: S.best,
        pieces: MF.physics.pieces().length,
        stages: MF.physics.pieces().map(function (b) { return b.plugin.stage; }),
        aimStage: S.aim && S.aim.stage, nextStage: S.next
      };
    }
  };

  MF.sprites.load(start);
})();
```

- [ ] **Step 3: 浏览器冒烟——正常游玩路径**

browser-use 打开页面 → `list_console_messages` 无 error → `take_screenshot`（HUD 分数 0、下一个预览图、瞄准棋子可见）→ 在 canvas 中部 `click` → 等 1s → `evaluate_script () => __milkfrog.state()` 期望 `pieces >= 1`。

- [ ] **Step 4: 浏览器冒烟——合并与计分**

`evaluate_script`：
```js
() => { __milkfrog.spawn(1, 210); __milkfrog.spawn(1, 210); return 'ok'; }
```
等 2s 后 `() => __milkfrog.state()` 期望 `pieces === 1 + 之前残留数 - 1` 且 `score >= 1`（若残留干扰，先 `location.reload()` 再测）。

- [ ] **Step 5: 浏览器冒烟——1→7 全链合成与通关庆祝（调试钩子定点投子，确定性）**

`evaluate_script`（同步手动步进物理，避开 rAF 时序）：
```js
() => {
  const R = MF.rules; const trace = [];
  let y = 660;
  for (let s = 1; s <= 6; s++) {
    __milkfrog.spawnAt(s, 210, y);
    __milkfrog.spawnAt(s, 210, y - R.STAGES[s].r * 2 + 4);  // 与上一枚重叠 4px，立即触发同级合并
    __milkfrog.tick(30);
    trace.push(__milkfrog.state().stages.slice());
    y -= R.STAGES[s + 1].r * 1.6;
  }
  __milkfrog.tick(60);
  return { trace, st: __milkfrog.state() };
}
```
期望：`st.mode === 'won'`（s=6 那对自合并直接产出 stage7），`st.score` 含 1+3+6+10+15+21+100 的累加（≥156）；截图见庆祝遮罩与 confetti → 点 `#btn-continue` → `() => __milkfrog.state().mode` 期望 `'playing'`；再 `__milkfrog.spawnAt(7, 100, 300); __milkfrog.spawnAt(7, 300, 300); __milkfrog.tick(60)` 后 `state().stages` 期望仍含两个 7（无尽模式终极之间不合并）。

- [ ] **Step 6: 浏览器冒烟——越线判负与重开**

reload → `evaluate_script`：`() => { for (let i = 0; i < 14; i++) __milkfrog.spawn(6, 60 + (i % 5) * 66); return 'ok'; }` 等 4s → state.mode 期望 `'over'`，截图见失败遮罩 → 点 `#btn-over-restart` → state 期望 `{mode:'playing', score:0, pieces:0}`。

---

### Task 7: 移动端适配验收 + 收尾

**Files:**
- Modify: 仅当验收发现问题时改 `css/style.css` / `js/input.js`

- [ ] **Step 1: 窄视口验收**

browser-use 将视口设为 390×844（iPhone 尺寸）→ 打开页面 → 截图期望：canvas 占满宽度、HUD 不溢出、无横向滚动条 → 用 `evaluate_script` 检查 `() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, touch: getComputedStyle(document.getElementById('game')).touchAction })` 期望 `sw <= iw` 且 `touch === 'none'`。

- [ ] **Step 2: 触屏路径验收**

同视口下用 browser-use 在 canvas 上 `click`（触摸设备 pointerup 同路径）→ state.pieces 增加；拖动：`drag` 从 (100,300) 到 (300,300) 后松开 → 落子 x 接近 300（`evaluate` 读最近 body 的 position.x 误差 <30）。

- [ ] **Step 3: 键盘验收**

桌面视口：`press_key` ArrowRight ×3 → 瞄准 x 从 210 增至 246（`evaluate` 读 `__milkfrog.state()` 不含 aim x 时改用 `() => window.MF && document.getElementById('game') && true` 之外，直接截图观察瞄准棋子右移）；`press_key` Space → pieces +1。

- [ ] **Step 4: README 补充运行/发布说明**

在 README.md 追加：

```markdown
## 素材再生成

棋子贴图由 `tools/make_sprites.py` 从 `art/raw/` 原始素材裁剪去底生成（需 `pip install pillow`）：

python tools/make_sprites.py && python tools/check_sprites.py

## 上线 GitHub Pages（后续步骤）

1. git init 并推送本仓库（art/raw 已被 .gitignore 排除）
2. GitHub 仓库 Settings → Pages → 分支 main / 目录 root
3. 访问 https://<user>.github.io/<repo>/
```

- [ ] **Step 5: 全量回归**

按 spec §12 清单逐条过：合并链 1→7（用调试钩子逐级验证 score 累加 1+3+6+10+15+21+100）、首次终极庆祝、无尽模式下两个 stage7 不合并、破纪录后 reload 页面 best 保留。

---

## 验收总标准

- 控制台零 error；桌面鼠标与 390px 触屏视口均可完整游玩一局
- 合并、计分、通关、判负、重开、最高分持久化全部通过 Task 6/7 冒烟
- `python tools/check_sprites.py` 与 `node tools/test-rules.mjs` 全绿
