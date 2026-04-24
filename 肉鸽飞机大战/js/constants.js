// 常量
const BASE_FPS = 200; // 基准帧率，所有效果以此为准
const LOGICAL_W = 600;
const LOGICAL_H = 800;

const PLAYER_SPEED = 3.5;
const PLAYER_WIDTH = 80;
const PLAYER_HEIGHT = 100;
const INVINCIBLE_DURATION = 120;
const TRAIL_MAX_POINTS = 20;   // 拖尾记录的最大坐标点数

const BULLET_SPEED = 4;
const FIRE_RATE = 200;

const ENEMY1_SPEED = 2;
const ENEMY1_SPAWN_RATE = 1500;
const ENEMY1_SIZE = 50;
const ENEMY1_HP = 1;
const ENEMY1_SCORE = 5;

const ENEMY2_SPEED = 1.5;
const ENEMY2_SPAWN_RATE = 3000;
const ENEMY2_SIZE = 60;
const ENEMY2_HP = 2;
const ENEMY2_SCORE = 10;
const ENEMY2_FIRE_RATE = 3000;
const ENEMY2_BULLET_SPEED = 2.4;

const ENEMY3_SPEED = 1.5;
const ENEMY3_SPAWN_RATE = 5000;
const ENEMY3_SIZE = 70;
const ENEMY3_HP = 2;
const ENEMY3_SCORE = 20;
const ENEMY3_FIRE_RATE = 3000;
const ENEMY3_BULLET_SPEED = 1.8;
const ENEMY3_RUSH_SPEED = 2.5;
const ENEMY3_STALL_TIME = 8000;

const ENEMY4_SPEED = 1.8;
const ENEMY4_SPAWN_RATE = 6000;  // 刷新概率为2级怪的一半
const ENEMY4_SIZE = 65;
const ENEMY4_HP = 3;
const ENEMY4_SCORE = 30;
const ENEMY4_FIRE_RATE = 2500;
const ENEMY4_BULLET_SPEED = 2.1;
const ENEMY4_HOVER_Y = 350; // 悬停位置靠近屏幕中间

const ENEMY5_SPEED = 1.6;
const ENEMY5_SPAWN_RATE = 6000;
const ENEMY5_SIZE = 60;
const ENEMY5_HP = 3;
const ENEMY5_SCORE = 30;
const ENEMY5_SCORE_GATE = 500;
const ENEMY5_FIRE_RATE = 2800;
const ENEMY5_BULLET_SPEED = 2.5;
const ENEMY5_HOVER_Y_MIN = 150;
const ENEMY5_HOVER_Y_MAX = 300;
const ENEMY5_BLINK_INTERVAL = 3000;     // 瞬移间隔
const ENEMY5_BLINK_WARN = 400;          // 瞬移预警时长（毫秒）
const ENEMY5_BLINK_DIST_MIN = 80;
const ENEMY5_BLINK_DIST_MAX = 160;
const ENEMY5_HOMING_SPEED = 2.0;        // 追踪弹速度
const ENEMY5_HOMING_TURN = 0.03;        // 追踪弹转向力（比Boss导弹0.06更柔和）
const ENEMY5_HOMING_LIFE = 180;         // 追踪弹生存帧数

const ENEMY_MINION_SPEED = 4; // Boss小怪下落速度

// Boss 列表由 js/entities/boss.js + bosses/*.js 注册表管理
// 以下为通用 Boss 常量
const BOSS_WARNING_TIME = 3000;
// 每轮循环 Boss 血量倍率（第2轮 x1.5，第3轮 x2.0 ...）
const BOSS_HP_SCALE_PER_ROUND = 0.5;
// Boss 击败后下次出现的分数间隔（按击败次数递增，最多2000）
const BOSS_RESUME_INTERVALS = [500, 600, 800, 1000, 1000, 1500, 1500, 2000, 2000, 2000];
const BOSS_RESUME_INTERVAL_MAX = 2000;

// 动态难度：每 DIFFICULTY_SCORE_INTERVAL 分提升一级
const DIFFICULTY_SCORE_INTERVAL = 500;
const DIFF_SPAWN_RATE_FACTOR = 0.95;   // 刷新间隔乘以此值（越来越快）
const DIFF_SPAWN_RATE_MIN = 0.5;       // 刷新间隔最低为基准的 50%
const DIFF_HP_BONUS_PER_LEVEL = 0.1;   // 每级难度敌人额外 +10% 血量
const DIFF_HP_BONUS_MAX = 2.0;         // 最多 +200%（3倍）

// 等级系统：二次公式 exp(l) = 25(l+1)² + 25(l+1) - 50
// 简化为 25l² + 75l + 50，保证 level=0 时返回 50
// 0→1: 50, 1→2: 150, 2→3: 300, 3→4: 500, 4→5: 750 ...
function getLevelThreshold(level) {
    return 25 * level * level + 75 * level + 50;
}

// 词条系统
const BUFF_CHOICE_COUNT = 3;   // 每次可选词条数量

// 超频系统
const OVERCLOCK_MAX_ENERGY = 100;
const OVERCLOCK_DURATION = 3000;   // 超频持续3秒
const OVERCLOCK_DURATION_PER_STACK = 1000; // 每层超频时间延长词条+1秒
const OVERCLOCK_ENERGY_PER_KILL = 4;
const OVERCLOCK_BASE_ENERGY_PER_KILL = 4; // 基础击杀能量
const OVERCLOCK_FIRE_RATE_DIV = 2; // 射速翻倍（间隔除以2）

// 追踪导弹（敌人用）
const MISSILE_SPEED = 4.5;
const MISSILE_TURN_SPEED = 0.06;  // 每帧最大转动弧度
const MISSILE_LIFE = 180;          // 3秒（60fps）
const MISSILE_PARTICLE_COLORS = ['#FF4500', '#FFD700', '#FFFFFF'];

// 玩家追踪导弹（词条）
const PLAYER_MISSILE_SPEED = 3.5;
const PLAYER_MISSILE_TURN = 0.08;
const PLAYER_MISSILE_INTERVAL = 3000; // 每3秒发射一枚

// 苍穹号
const SPREAD_BULLET_SPEED = BULLET_SPEED * 0.7; // 散射子弹速度（2.8）
const SPREAD_BULLET_RANGE = 320; // 散射子弹射程（像素）

// 墨子号
const MOZI_FIRE_RATE = 400;         // 射速 0.4秒一发
const MOZI_BOMB_SPEED = 3.5;        // 炸弹飞行速度
const MOZI_BOMB_RANGE = 400;        // 射程 400像素
const MOZI_EXPLOSION_RADIUS = 60;   // 爆炸范围圆半径
const MOZI_EXPLOSION_DAMAGE = 2;    // 爆炸伤害

// 赤红号
const LASER_DPS = 5;                // 每秒伤害
const LASER_WIDTH = 6;              // 激光碰撞宽度
