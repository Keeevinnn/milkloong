# 合成大奶蛙 —— 设计文档

- 日期：2026-09-30
- 状态：已批准（聊天中逐节确认）
- 项目根目录：`D:/其它/Milkloong`（尚非 git 仓库，本文档暂不提交；发布上线时统一 init）

## 1. 概述与目标

借鉴「合成大西瓜」玩法的休闲合成网页游戏：棋子为魔化梗图风格的奶蛙（奶龙 meme 形象），
同形态相撞合并为更大形态，最终合成终极大奶蛙。

首期目标（v1）：

1. 核心下落与合成逻辑（物理堆叠 + 同级合并升级）
2. 计分与失败判定
3. 手机端触屏与电脑端鼠标操作适配
4. 纯静态工程结构，可直接托管 GitHub Pages

## 2. 非目标（v1 不做）

- 连击/combo、道具、技能、音效、排行榜、账号、后端
- 动画 GIF 棋子（只用静态首帧/静图）
- 自动发布到 GitHub Pages（发布为后续独立步骤，需用户 GitHub 授权）

## 3. 技术选型

- 物理：matter.js 0.20.0，下载后 vendored 到 `vendor/matter.min.js`，运行期零 CDN 依赖
- 渲染：Canvas 2D 自绘（贴图、警戒线、特效）；HUD 与遮罩层用 DOM
- 输入：Pointer Events 统一鼠标/触屏；键盘为辅
- 无构建步骤：原生 ES module 或普通 script 标签均可（采用普通 `<script>` 顺序加载，Pages 友好）
- 美术处理：Python 3.12 + Pillow（需一次性 `pip install pillow`），脚本可重跑

## 4. 工程结构

```
Milkloong/
  index.html
  css/style.css
  js/main.js        启动、主循环、状态机（playing / won / over / paused）
  js/physics.js     matter.js 封装：世界、墙、生成、合并检测
  js/render.js      Canvas 绘制：背景、棋子、警戒线、飘分、confetti
  js/input.js       指针与键盘输入
  js/sprites.js     贴图清单与加载
  assets/sprites/s1.png ~ s7.png
  vendor/matter.min.js
  tools/make_sprites.py
  art/raw/          原始素材（gitignore，不上传公网）
  README.md
  .gitignore
  docs/superpowers/specs/本文件
```

## 5. 美术管线

源素材（均在 `art/raw/`）：

| 输出 | 源 | 处理 |
|---|---|---|
| s1 比耶 | source-4poses.png 右上象限 | 去棍柄 → 去白底 → 裁边 |
| s2 比心(站) | source-4poses.png 左下象限 | 同上 |
| s3 抱头震惊 | q17.jpeg | 去白底 → 裁边 |
| s4 捧腹(蹲) | source-4poses.png 左上象限 | 去棍柄 → 去白底 → 裁边 |
| s5 蛋形捧腹笑 | q13.gif 首帧 | 去白底(含地面软阴影) → 裁边 |
| s6 比心(盘腿) | source-4poses.png 右下象限 | 去棍柄 → 去白底 → 裁边 |
| s7 粉色魔化终极 | q01.jpeg | 去白底 → 裁边 |

处理算法（`tools/make_sprites.py`）：

1. 打开并转 RGBA（GIF 取首帧）
2. 截图象限：按固定框裁四象限；在象限下半区把 `max(r,g,b)<60`（黑棍）与 `min(r,g,b)>245`（棍上白点）置透明
3. 从四条边泛洪填充去背景：判定式 `min>190 且 max-min<30`（覆盖白底渐变与地面软阴影；奶蛙奶油色肚皮 `max-min≈40` 且被身体轮廓包围，不会被误删）
4. 按 alpha 裁边，四周留 4% 边距补成正方形，LANCZOS 缩放到 512×512 输出 PNG
5. 逐张人工目检（Read 查看），有残边再调阈值

备用素材池：q03 抱头大笑、q07 扭曲笑、q04/q02 站立捧腹、q09 绿色变体（换形象时启用）。

## 6. 阶段定义

逻辑游戏区 420×700（竖屏），墙厚计入边界。

| stage | 形态 | 半径 r | 合并生成得分 |
|---|---|---|---|
| 1 | 比耶 | 24 | — |
| 2 | 比心(站) | 32 | 1 |
| 3 | 抱头震惊 | 41 | 3 |
| 4 | 捧腹(蹲) | 51 | 6 |
| 5 | 蛋形捧腹笑 | 63 | 10 |
| 6 | 比心(盘腿) | 76 | 15 |
| 7 | 粉色魔化·终极大奶蛙 | 92 | 21（首次合成另 +100） |

## 7. 玩法规则

- 生成：当前棋子悬于瞄准区（y=60），跟随指针 x，夹紧在 `[r+4, 420-r-4]`；队列显示「下一个」预览；落点随机 stage ∈ {1,2}（权重 0.6/0.4）
- 落下：pointerup / 空格触发；以初速度 (0, 8) 变为动态刚体；冷却 400ms 后出现下一枚
- 合并：collisionStart 中两体 `stage` 相同且 <7 且均未被标记 → 标记；afterUpdate 中移除双体、在中点（夹紧进墙内）生成 stage+1；播放 pop 缩放（0.6→1，180ms）与飘分文字
- 终极：首次生成 stage 7 → 弹庆祝遮罩（confetti + 得分），可选「继续无尽」或「再来一局」；无尽模式下 stage 7 之间不再合并
- 失败：对落龄 >1.2s 的棋子，若 `y - r < 警戒线y(=110)` 持续累计 1.5s → game over 遮罩（本局分/最高分/再来一局）；越线期间警戒线红色脉冲告警
- 暂停：`visibilitychange` 隐藏时暂停主循环与引擎
- 物理参数：圆形刚体 restitution 0.15、friction 0.05、frictionAir 0.008；墙体 restitution 0.1；`enableSleeping: false`

## 8. 操作与适配

- Pointer Events：`pointermove` 瞄准、`pointerup` 落下；canvas 与 body `touch-action: none`，禁页面滚动/回弹
- 键盘：←/→ 每次移动 12px，空格/↓ 落下
- 高清屏：canvas 按 `devicePixelRatio` 放大 backing store，CSS 尺寸按视口等比缩放（保持 420:700，居中）
- 桌面与手机共用一套逻辑，无分支

## 9. 渲染与 UI

- Canvas：奶油色渐变背景、圆角容器描边、虚线警戒线、棋子按 `body.angle` 旋转绘制贴图（边长 2r 正方形）、合并飘分、confetti 粒子
- DOM HUD：标题「合成大奶蛙」、本局分、最高分、下一个预览图、重开按钮
- DOM 遮罩：庆祝层、失败层（半透明 + 卡片 + 按钮）
- 中文界面

## 10. 数据持久化

- `localStorage["milkfrog-best"]` 存最高分，开局读取、破纪录时写回并刷新显示

## 11. 错误处理与边界

- 三连撞同一帧：标记集合保证一体只参与一次合并；被移除 body 的后续事件按 id 忽略
- 合并中点越墙：夹紧到 `[r+4, 420-r-4] × [r+4, 700-r-4]`
- 贴图加载失败：onerror 回退为纯色圆 + 阶段编号文字，游戏不崩
- 调试钩子：`window.__milkfrog = { spawn(n), state() }` 供自动化测试定点投子

## 12. 测试策略

1. 素材目检：Read 查看 s1~s7 透明边与残边
2. 浏览器冒烟（browser-use）：打开 index.html → 控制台无报错 → 点击落子截图 → 用调试钩子同 x 连投两枚 stage1 验证合并与加分 → 堆高验证越线判负 → 重开验证状态复位
3. 移动端：视口调窄复测布局与 touch-action；Pointer Events 路径与鼠标同代码
4. 回归清单：合并链 1→7 全程、首次终极庆祝、无尽模式、破纪录写回

## 13. 版权与发布

- 奶龙为受版权保护 IP；本项目为粉丝二创、非商用
- `art/raw/` 不入库不上传；公网仓库仅含处理后的棋子贴图
- README 声明粉丝作品性质；若被投诉，用备用池/AI 同风格图替换
- 发布（git init、建 GitHub 仓库、开 Pages）为后续独立步骤，执行前再次向用户确认风险

## 14. 未来扩展（v2 候选，不在本期）

音效与震动、连击加成、每局随机事件、分享截图、PWA 离线
