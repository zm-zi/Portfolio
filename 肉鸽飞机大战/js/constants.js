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
const ENEMY2_FIRE_RATE = 2000;
const ENEMY2_BULLET_SPEED = 2.4;

const ENEMY3_SPEED = 1.5;
const ENEMY3_SPAWN_RATE = 5000;
const ENEMY3_SIZE = 70;
const ENEMY3_HP = 2;
const ENEMY3_SCORE = 20;
const ENEMY3_FIRE_RATE = 2000;
const ENEMY3_BULLET_SPEED = 1.8;
const ENEMY3_RUSH_SPEED = 2.5;
const ENEMY3_STALL_TIME = 8000;

const ENEMY4_SPEED = 1.8;
const ENEMY4_SPAWN_RATE = 6000;  // 刷新概率为2级怪的一半
const ENEMY4_SIZE = 65;
const ENEMY4_HP = 3;
const ENEMY4_SCORE = 30;
const ENEMY4_FIRE_RATE = 1500;
const ENEMY4_BULLET_SPEED = 2.1;
const ENEMY4_HOVER_Y = 350; // 悬停位置靠近屏幕中间

const ENEMY_MINION_SPEED = 4; // Boss小怪下落速度

// Boss 列表由 js/entities/boss.js + bosses/*.js 注册表管理
// 以下为通用 Boss 常量
const BOSS_WARNING_TIME = 3000;
// 每轮循环 Boss 血量倍率（第2轮 x1.5，第3轮 x2.0 ...）
const BOSS_HP_SCALE_PER_ROUND = 0.5;
// Boss 击败后下次出现的分数间隔
const BOSS_RESUME_INTERVAL = 500;

// 动态难度：每 DIFFICULTY_SCORE_INTERVAL 分提升一级
const DIFFICULTY_SCORE_INTERVAL = 300;
const DIFF_SPAWN_RATE_FACTOR = 0.95;   // 刷新间隔乘以此值（越来越快）
const DIFF_SPAWN_RATE_MIN = 0.5;       // 刷新间隔最低为基准的 50%
const DIFF_HP_BONUS_PER_LEVEL = 0.2;   // 每级难度敌人额外 +20% 血量
const DIFF_HP_BONUS_MAX = 3.0;         // 最多 +300%（4倍）

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
