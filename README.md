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

## 素材再生成

棋子贴图由 `tools/make_sprites.py` 从 `art/raw/` 原始素材裁剪去底生成（需 `pip install pillow`）：

python tools/make_sprites.py && python tools/check_sprites.py

## 上线 GitHub Pages（后续步骤）

1. git init 并推送本仓库（art/raw 已被 .gitignore 排除）
2. GitHub 仓库 Settings → Pages → 分支 main / 目录 root
3. 访问 https://<user>.github.io/<repo>/
