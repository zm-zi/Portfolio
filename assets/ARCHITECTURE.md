# 超时空激战 — 架构文档

竖版 Roguelike 飞机大战。纯 JS + Canvas，零依赖，`index.html` 直接加载。画布 600×800，基准 200fps，运动基于 `dt` 帧率无关。

## 文件结构

```
├── index.html                    # 入口：DOM HUD + Canvas + CRT
├── font/ image/ music/           # 素材
└── js/
    ├── core.js                   # Game 命名空间 + 工具（aabb, nearest）
    ├── constants.js              # 全部常量（难度/等级/超频/导弹等）
    ├── audio.js                  # BGM循环 + 音效池 + 音量控制
    ├── state.js                  # 全局状态 G + resetState()
    ├── main.js                   # 启动：canvas初始化、资源加载、注册表图片绑定
    ├── gameLoop.js               # 主循环（update/draw分离、帧率节流、Boss警戒）
    ├── input.js                  # 键盘/鼠标 + 调试器快捷键
    ├── save.js                   # localStorage存档系统
    ├── levels.js                 # 关卡数据配置（7关）
    ├── entities/
    │   ├── player.js             # 移动、拖尾、射击、僚机、超频、镀层
    │   ├── bullet.js             # 子弹更新/绘制（玩家+僚机+敌人+追踪导弹）
    │   ├── enemy.js              # ENEMY注册表 + 描边工具 + 入口函数
    │   ├── boss.js               # BOSS注册表 + 动画帧工具
    │   ├── gem.js                # 宝石（爆发/下落/磁吸三阶段）
    │   ├── particle.js           # 粒子系统（上限800，多通道渲染）
    │   ├── enemies/{basic,shooter,rusher,minion,spinner,phantom}.js
    │   └── bosses/{one_eye_king,night_fury,ice_evil_king,julingshen}.js
    ├── crafts/
    │   ├── default.js            # 紫色更有韵味：单发直上·均衡型
    │   ├── skysovereign.js       # 苍穹号：散射弹幕
    │   ├── mozi.js               # 墨子号：炸弹投掷
    │   └── chiHong.js            # 赤红号：持续激光
    ├── systems/
    │   ├── background.js         # 星空+背景飞机+陨石/战舰（三层视差）
    │   ├── collision.js          # 全部碰撞检测
    │   └── buff.js               # BUFF注册表 + 选择UI + 触发检测
    └── ui/{common,hud,startScreen,debugger,pauseOverlay,gameOver,levelMap}.js
```

## 加载顺序

```
core → constants → audio → state → particle → background → collision → common → buff → hud
→ startScreen → debugger → pauseOverlay → gameOver → levelMap → player → bullet → gem
→ enemy → enemies/* → boss → bosses/* → crafts/* → input → levels → save → gameLoop → main
```

## 核心架构

### 全局状态 G（state.js）

所有模块通过读写 `G` 通信。`G.player` 存玩家属性（含战机类型、僚机、追踪导弹、穿透、闪电连锁等），`G.game` 存游戏元状态（分数/生命/难度/暂停/关卡模式），各数组存实体（bullets/enemies/gems/particles 等），Boss/冰墙/漩涡/闪电连锁等独立属性挂 `G` 上。`resetState()` 全部还原 + 调用各词条 `onInit`。

### 战机注册表 CRAFT（crafts/*.js）

**CRAFT.register({id, name, desc, color, imgSrc, fireRate, fire, trailColors})**
- `fire(p, damage)` 定义射击逻辑（子弹生成方式）
- `trailColors` 定义拖尾颜色（outer/inner/glow + 超频变体）
- 4种战机：default（单发直射）、skysovereign（散射弹幕）、mozi（炸弹投掷）、chiHong（持续激光）
- 赤红号特殊：`isLaser: true`，走独立激光绘制和碰撞系统

### 注册表模式（三套）

**ENEMY**（`enemy.js`）— `ENEMY.register({type, spawn, update, draw})`
`spawnAll()` 遍历注册表调用各自的 `spawn`，自动传入 `spawnMult`/`hpMult`；`updateAll`/`drawAll` 遍历 `G.enemies` 委托。

**BOSS**（`boss.js`）— `BOSS.register({id, name, spawnScore, hp, update, draw})`
按注册顺序轮出场，`getByIndex(i)` 获取。`drawFrame()` 处理基础帧/动作帧交替 + 描边。

**BUFF**（`buff.js`）— `BUFF.register({id, name, desc, rarity, condition, onInit, apply})`
`randomPick(count)` 按稀有度权重（common:5 rare:3 epic:1 legendary:0.65）随机抽。

## 系统一览

### 战机系统（crafts/*.js）

4种可选战机，各有独特射击方式：

| 战机 | ID | 射击方式 | 特点 |
|------|----|---------|------|
| 紫色更有韵味 | default | 单发直射 | 均衡型，射速200ms |
| 苍穹号 | skysovereign | 散射弹幕 | 射速250ms，散射子弹速度2.8，射程320px |
| 墨子号 | mozi | 炸弹投掷 | 射速400ms，爆炸半径60px，伤害2 |
| 赤红号 | chiHong | 持续激光 | DPS 5/s，激光宽度6px，穿透词条增加宽度 |

### 关卡系统（levels.js）

7个关卡，支持分数达标和Boss击败两种通关条件：

| 关卡 | 名称 | 目标 | 特点 |
|------|------|------|------|
| 1 | 新兵试炼 | 100分 | 分阶段刷怪（50分前基础/后射击） |
| 2 | 火力初开 | 200分 | 一二三级混合，刷新率×0.9 |
| 3 | 独眼王 | 击败Boss | Boss关，无小怪 |
| 4 | 全面围攻 | 300分 | 全部敌人，血量×1.3 |
| 5 | 夜煞降临 | 击败Boss | Boss关，无小怪 |
| 6 | 冰封王座 | 击败Boss | Boss关，无小怪 |
| 7 | 终极决战 | 击败所有Boss | 三Boss连战，血量×1.5 |

关卡模式特性：
- 开局可选1个攻击类词条
- 不自动弹出词条选择
- 进度通过 `_levelProgress` 和 localStorage 持久化

### 等级 & 词条

等级阈值二次公式 `25l² + 75l + 50`（50→150→300→500→750...）。分数达标触发 3 选 1 buff，选完自动跳过已满足的阈值（防连续弹窗）。开局免费选一次。关卡模式只从攻击类词条中选1个。

### 动态难度

每 500 分 +1 级：刷新间隔 ×0.95（下限 50%），敌人血量 +10%/级（上限 +200%，即3倍）。

### Boss

四 Boss 轮回（独眼王→夜煞→冰邪王→巨灵神），首个 400 分触发，击败后按递增间隔再出下一个（500→600→800→1000→1500→2000）。全部击杀后 `bossRound++`，HP ×(1+轮次×0.5)。

| Boss | 技能 |
|------|------|
| 独眼王 | 热能扫射(带预警) / 暗红护盾(无敌+散射) / 召唤小怪(召唤阵特效) |
| 夜煞 | 单激光追踪 / 三激光横扫 / 反弹护盾 |
| 冰邪王 | 冰锥扫射 / 可破坏冰墙 / 冰霜漩涡(减速+内缩冰刺+终结爆散) |
| 巨灵神 | 多阶段Boss，待补充 |

### 超频

击杀攒能量（基础4，受词条+1，上限4层）。满100按空格：射速翻倍 + 无敌 + 3s（受词条+1s，上限3层）。

### 敌人

| 类型 | 出现 | 行为 |
|------|------|------|
| basic | 始终 | 直线下落 |
| shooter | 50分 | 悬停+每2s射击 |
| rusher | 300分 | 悬停+扇形射8s后冲刺 |
| spinner | 500分 | 悬停+每1.5s两波扇形弹 |
| minion | Boss召唤 | 快速下落 |

### 词条（17种）

| 词条 | 稀有度 | 效果 | 上限 |
|------|--------|------|------|
| 速射 | 普通 | 射速+25%（激光战机：伤害+25%/层） | 3 |
| 双发 | 传说 | 左右各增加一颗子弹（激光战机：双束激光） | 1 |
| 僚机 | 稀有 | 僚机协同（射速和伤害为主机一半） | 2 |
| 僚机伤 | 稀有 | 僚机伤害×2（需僚机） | 1 |
| 僚机疾 | 稀有 | 僚机射速×2（需僚机） | 1 |
| 追踪导弹 | 史诗 | 每3s自动发射追踪导弹 | 1 |
| 追踪导弹·疾 | 史诗 | 发射间隔-1s（需追踪导弹） | 2 |
| 追踪导弹·量 | 史诗 | 同时发射+1枚（需追踪导弹） | 2 |
| 超频延长 | 史诗 | 超频+1s | 3 |
| 超频充能 | 稀有 | 击杀能量+1 | 4 |
| 生命回复 | 稀有 | 生命+1（最大10，不可连续选） | — |
| 磁力宝石 | 普通 | 拾取范围+20%（5层满屏吸取） | 5 |
| 隐身镀层 | 传说 | 10s未伤生成镀层免疫一次 | 1 |
| 穿透弹 | 传说 | 穿透敌人（3级解锁闪电连锁前置） | 3 |
| 宝石增值 | 普通 | 宝石分数+10% | 5 |
| 贪婪 | 史诗 | 30%额外掉宝石 | 1 |
| 闪电连锁 | 传说 | 击杀连锁最近敌人，伤害2（需穿透满级，激光战机无前置） | 5 |

词条特性：
- 激光战机（赤红号）的词条适配：速射→伤害提升，双发→双束激光，穿透→激光宽度增加
- 关卡模式开局选1个攻击类词条，不自动弹出选择
- 稀有度权重：普通5 / 稀有3 / 史诗1 / 传说0.65

### 性能

粒子上限800、多通道批量渲染、`lighter` 代替 `shadowBlur`、就地数组压缩而非 splice、白边描边离屏缓存、帧率节流（60/90/120/144/200/无限制）。

### 存档系统（save.js）

- 使用 `localStorage` 持久化游戏数据
- 存储内容：无尽模式最高分、关卡最高分数组、关卡进度（`_levelProgress`）
- `Save.save()` 在游戏结束/关卡通关时调用
- `Save.load()` 在启动时加载
- `Save.clearProgress()` 重置关卡进度

### 关卡地图 UI（ui/levelMap.js）

- 7个关卡节点连线显示
- 状态标识：已通关（绿色）、当前可玩（蓝色脉冲）、未解锁（灰色）
- 点击可通关卡进入战机选择
- 支持鼠标和触控操作

## 拓展指南

- **新词条：** `buff.js` 注册 → `apply` 修改 `G.player` → `state.js` 加属性 + resetState 默认值
- **新敌人：** 新建 `enemies/xxx.js` 注册 → `constants.js` 加常量 → `index.html` 引入
- **新Boss：** 新建 `bosses/xxx.js` 注册 → `index.html` 引入 → 需新实体数组则加到 `G` 和 `resetState()`
- **新战机：** 新建 `crafts/xxx.js` 注册（id/name/desc/fire/trailColors）→ `index.html` 引入 → 如有新机制需在 `bullet.js`/`collision.js` 适配
- **新关卡：** `levels.js` 的 `LEVEL_DATA` 数组添加项 → 设置 bossId/targetScore/spawnMult/hpMult/getAllowedTypes
- **新音效：** `audio.js` 加 Audio 对象和播放函数，逻辑处调用

---

## 更新日志

### 2026/04/23 架构文档更新

**新增内容：**
- 战机系统：4种战机（紫色更有韵味/苍穹号/墨子号/赤红号）
- 关卡系统：7个关卡，支持分数达标和Boss击败两种通关条件
- 存档系统：localStorage 持久化（最高分/关卡进度）
- 关卡地图 UI：关卡节点可视化
- 新增敌人：phantom（幻影敌机）
- 新增Boss：巨灵神
- 新增词条适配：激光战机词条变体（速射→伤害/双发→双束/穿透→宽度）

**文件结构变化：**
- 新增 `js/crafts/` 目录（4个战机定义文件）
- 新增 `js/save.js`（存档系统）
- 新增 `js/levels.js`（关卡数据）
- 新增 `js/ui/levelMap.js`（关卡地图UI）
- 新增 `js/entities/enemies/phantom.js`
- 新增 `js/entities/bosses/julingshen.js`

**常量更新：**
- 动态难度间隔从300分改为500分
- 敌人血量上限从+300%改为+200%（3倍）
- Boss击败间隔改为递增数组（500→600→800→1000→1500→2000）
- 新增苍穹号/墨子号/赤红号相关常量
