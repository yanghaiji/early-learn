/**
 * 生成内置卡片与分类封面图片（T16）。
 *
 * 设计：扁平几何 + 字形/符号主体，风格统一、体积小、可离线生成。
 * 输出：public/assets/images/{categoryId}/{slug}.webp 与 public/assets/images/covers/{categoryId}.webp
 *      故事：public/assets/images/stories/{slug}/cover.webp（一故事一张综合图，v0.2 / ADR-S7）
 * 说明：这是 v0.1 的占位插画；替换为实拍/AI 图时保持同名同路径即可，无需改代码。
 *
 * 用法：
 *   npm run prepare:images            # 仅补缺失图片
 *   npm run prepare:images -- --force # 全量重绘
 *   npm run prepare:images -- --only=animals
 *   npm run prepare:images -- --only=stories   # 只重算 50 本故事的综合图（50 张）
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEED_FILE = path.join(ROOT, 'src/data/seed/cards.ts');
const STORY_FILE = path.join(ROOT, 'src/data/seed/stories.ts');
const OUT_ROOT = path.join(ROOT, 'public/assets/images');
const CARD_SIZE = 320;
const COVER_SIZE = { width: 480, height: 360 };
const STORY_SIZE = { width: 480, height: 360 };
const QUALITY = 82;
/** 故事综合图张数少、但画面更大，质量略降一档换体积 */
const STORY_QUALITY = 78;

const THEME = {
  animals: { bg: '#E8F7EE', accent: '#2E6B4F', soft: '#CDECDc' },
  fruit: { bg: '#FFEFEB', accent: '#B4453A', soft: '#FFD9D2' },
  vegetables: { bg: '#EFF7E4', accent: '#4C6B2F', soft: '#D9EBC6' },
  vehicles: { bg: '#E9F3FD', accent: '#2F5D8A', soft: '#CFE6FB' },
  daily: { bg: '#FBF3E2', accent: '#7A5A22', soft: '#F2E6C9' },
  body: { bg: '#FFF0E6', accent: '#A8552A', soft: '#FFE0CC' },
  colors: { bg: '#F7F2FC', accent: '#5B4A7A', soft: '#E4DBF7' },
  shapes: { bg: '#F2ECFB', accent: '#5A4392', soft: '#E4DBF7' },
  numbers: { bg: '#E8F0F7', accent: '#2E5473', soft: '#CFE0EE' },
  characters: { bg: '#F4F2EE', accent: '#3A3A3A', soft: '#DCDCDC' },
  // v0.1.3 主题分类
  family: { bg: '#FFF0F3', accent: '#8A4A5E', soft: '#FFDCE5' },
  weather: { bg: '#EDF3FA', accent: '#3A5677', soft: '#DCE8F6' },
  verbs: { bg: '#F3FAE8', accent: '#4C6B2F', soft: '#E2F2C9' },
  food: { bg: '#FFF6E8', accent: '#8A5A22', soft: '#FFE8C6' },
  school: { bg: '#F5F1FD', accent: '#54408A', soft: '#E6DEF8' },
  // v0.2 诗词（宣纸 + 淡墨）
  poems: { bg: '#F7F4EC', accent: '#3B3A33', soft: '#E7E1D2' },
  // v0.2 故事绘本（莓粉 + 暖黄）
  stories: { bg: '#FFF3F6', accent: '#8A4A5E', soft: '#FFE1EA' },
};

/** 诗词插画调色：宣纸底 + 淡墨 + 一点赭石与水青 */
const INK = {
  paper: '#F7F4EC',
  ink: '#3B3A33',
  pale: '#B4AA93',
  water: '#8FA9B8',
  sun: '#D9A96A',
  leaf: '#7E9B78',
};

const EMOJI = {
  cat: '🐱', dog: '🐶', pig: '🐷', cow: '🐮', sheep: '🐑', horse: '🐴', rabbit: '🐰',
  chicken: '🐔', duck: '🦆', fish: '🐟', bird: '🐦', elephant: '🐘', tiger: '🐯',
  bear: '🐻', monkey: '🐵', panda: '🐼',
  apple: '🍎', banana: '🍌', watermelon: '🍉', grape: '🍇', orange: '🍊',
  strawberry: '🍓', pear: '🍐', peach: '🍑', pineapple: '🍍', lemon: '🍋',
  cherry: '🍒', mango: '🥭',
  carrot: '🥕', tomato: '🍅', cucumber: '🥒', potato: '🥔', cabbage: '🥬',
  corn: '🌽', eggplant: '🍆', mushroom: '🍄', pumpkin: '🎃', pepper: '🫑',
  car: '🚗', bus: '🚌', bicycle: '🚲', train: '🚆', plane: '✈', boat: '⛵',
  motorcycle: '🏍', ambulance: '🚑', 'fire-truck': '🚒', 'police-car': '🚓',
  truck: '🚚', subway: '🚇',
  cup: '☕', bowl: '🥣', spoon: '🥄', chair: '🪑', table: '🍽', book: '📖',
  ball: '⚽', umbrella: '☂', toothbrush: '🪥', towel: '🧺', shoes: '👟', hat: '🎩',
  eyes: '👀', nose: '👃', mouth: '👄', ears: '👂', hand: '✋', foot: '🦶',
  head: '😀', hair: '💇', teeth: '🦷', tummy: '🤰',
  // v0.2 补充词汇
  lion: '🦁', giraffe: '🦒', frog: '🐸', turtle: '🐢', bee: '🐝', butterfly: '🦋',
  coconut: '🥥', kiwi: '🥝', blueberry: '🫐', avocado: '🥑',
  broccoli: '🥦', onion: '🧅', garlic: '🧄',
  rocket: '🚀', helicopter: '🚁', ship: '🚢', taxi: '🚕',
  clock: '⏰', key: '🔑', backpack: '🎒',
  leg: '🦵', arm: '💪',
  // v0.1.3 主题分类：家人 Family
  dad: '👨', mom: '👩', baby: '👶', grandpa: '👴', grandma: '👵',
  brother: '👦', sister: '👧', uncle: '🧔', aunt: '💁', family: '👪',
  friend: '🤝', teacher: '🎓',
  // v0.1.3 主题分类：天气 Weather
  sunny: '☀', cloudy: '☁', rainy: '🌧', snowy: '❄', windy: '🌬',
  hot: '🔥', cold: '🧊', rainbow: '🌈', thunder: '⚡', storm: '🌪',
  foggy: '🌫', moon: '🌙',
  // v0.1.3 主题分类：动作 Verbs
  run: '🏃', jump: '🤸', walk: '🚶', swim: '🏊', eat: '🍴',
  drink: '🥤', sleep: '😴', sing: '🎤', dance: '💃', read: '📖',
  write: '✍', draw: '🎨',
  // v0.1.3 主题分类：食物 Food
  rice: '🍚', noodles: '🍜', bread: '🍞', egg: '🥚', milk: '🥛',
  water: '💧', 'fish-dish': '🍣', meat: '🍖', cake: '🍰', candy: '🍬',
  juice: '🧃', soup: '🥣',
  // v0.1.3 主题分类：学校用品 School
  pencil: '✏', pen: '🖊', ruler: '📏', eraser: '🧽', crayon: '🖍',
  notebook: '📒', map: '🗺', blackboard: '📋', glue: '🧴', scissors: '✂',
  classroom: '🏫', playground: '🎠',
};

const COLOR_HEX = {
  red: '#E4483C',
  yellow: '#F2C230',
  blue: '#3E7BFA',
  green: '#4C9A5B',
  orange: '#EE8B3A',
  purple: '#8A63C7',
  black: '#2B2B2B',
  white: '#FFFFFF',
};

function shapeMarkup(slug, accent) {
  switch (slug) {
    case 'circle':
      return `<circle cx="160" cy="160" r="96" fill="${accent}"/>`;
    case 'square':
      return `<rect x="70" y="70" width="180" height="180" rx="12" fill="${accent}"/>`;
    case 'triangle':
      return `<polygon points="160,60 254,250 66,250" fill="${accent}"/>`;
    case 'rectangle':
      return `<rect x="46" y="96" width="228" height="128" rx="12" fill="${accent}"/>`;
    case 'star':
      return `<polygon points="160,52 187,126 266,126 202,172 226,246 160,200 94,246 118,172 54,126 133,126" fill="${accent}"/>`;
    case 'heart':
      return `<path d="M160 258c-8-6-96-62-96-124 0-35 26-58 56-58 18 0 32 9 40 22 8-13 22-22 40-22 30 0 56 23 56 58 0 62-88 118-96 124z" fill="${accent}"/>`;
    case 'oval':
      return `<ellipse cx="160" cy="160" rx="118" ry="76" fill="${accent}"/>`;
    case 'diamond':
      return `<polygon points="160,52 262,160 160,268 58,160" fill="${accent}"/>`;
    default:
      return `<circle cx="160" cy="160" r="96" fill="${accent}"/>`;
  }
}

const CN_NUMERAL = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

/* ---------- 诗词水墨小景（v0.2）---------- */

/** slug → 意境场景；未列出时走 mountain */
const POEM_SCENES = {
  yonge: 'waterfowl',
  jingyesi: 'moon',
  chunxiao: 'spring',
  minnong: 'farm',
  guanquelou: 'tower',
  yongliu: 'willow',
  jiangxue: 'snow',
  lushanpubu: 'waterfall',
  gulangyuexing: 'moon',
  baidicheng: 'river',
  xiangsi: 'blossom',
  hua: 'mountain',
  chishang: 'lotus',
  luchai: 'forest',
  shanxing: 'autumn',
  jueju: 'willow',
  xunyinzhe: 'forest',
  fengqiaoyebo: 'night',
  tianmenshan: 'gorge',
  huixiang: 'cottage',
  rumengling: 'lotus',
  qingpingyue: 'cottage',
  xijiangyue: 'moonrise',
  huanxisha: 'pavilion',
  caisangzi: 'lake',
  xiangjianhuan: 'moon',
  'huanxisha-qingquan': 'spring',
  yulouchun: 'blossom',
  dianjiangchun: 'swing',
  'huanxisha-zaohua': 'cottage',
};

/** 远山：两层墨色，下重上轻 */
function ridges(dy = 0, opacity = 0.1) {
  return `<path d="M-8 ${272 - dy} Q40 ${200 - dy} 92 ${240 - dy} T180 ${210 - dy} T268 ${242 - dy} T328 ${218 - dy} V328 H-8 Z" fill="${INK.ink}" opacity="${Math.min(0.46, opacity * 2.6).toFixed(2)}"/>`;
}

/**
 * 诗景调色：宣纸底 + 三层墨色 + 一点赭石/豆绿/水青。
 * 与故事图同族的“扁平水墨”：形是实的（有边、有底），色只比纸深一档。
 */
const INK_SOFT = {
  far: '#D2CBBA',
  near: '#B0A794',
  deep: '#8C8474',
  water: '#D9E5E2',
  line: '#9DB6BC',
  ground: '#EDE5D3',
  sun: '#E9C67E',
  leaf: '#8FAE88',
  leafDeep: '#6E8F6C',
  flower: '#DDA0A2',
  wood: '#AC8767',
  roof: '#C68C6F',
  white: '#FBFDFE',
};

/** 山：实色填充 + 山顶一道勾线 */
function inkHill(y = 232, amp = 96, color = INK_SOFT.near, edge = INK_SOFT.deep) {
  const crest = `M-8 ${y} Q32 ${y - amp} 84 ${y - amp * 0.34} T168 ${y - amp * 0.72} T258 ${y - amp * 0.26} T328 ${y - amp * 0.62}`;
  return `<path d="${crest} V320 H-8 Z" fill="${color}"/>
    <path d="${crest}" fill="none" stroke="${edge}" stroke-width="2.4" opacity="0.5"/>`;
}

/** 地面：一笔浅土黄，压住画面下半，避免主体“悬空” */
function inkGround(y = 240, color = INK_SOFT.ground) {
  return `<path d="M-8 ${y} Q60 ${y - 12} 150 ${y - 2} T328 ${y - 8} V320 H-8 Z" fill="${color}"/>`;
}

/** 水面：淡青底 + 几行水纹 */
function inkWater(y = 236, lines = 3) {
  return `<path d="M-8 ${y} Q60 ${y - 10} 150 ${y - 2} T328 ${y - 7} V320 H-8 Z" fill="${INK_SOFT.water}"/>
    ${Array.from({ length: lines })
      .map(
        (_, i) =>
          `<path d="M${40 + i * 14} ${y + 20 + i * 16} q30 -8 60 0 t60 0 t60 0" fill="none" stroke="${INK_SOFT.line}" stroke-width="2.6" stroke-linecap="round" opacity="${(0.6 - i * 0.14).toFixed(2)}"/>`,
      )
      .join('')}`;
}

function inkSun(cx = 244, cy = 74, r = 30) {
  return `<circle cx="${cx}" cy="${cy}" r="${Math.round(r * 1.7)}" fill="${INK_SOFT.sun}" opacity="0.18"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${INK_SOFT.sun}" opacity="0.88"/>`;
}

function inkMoon(cx = 246, cy = 70, r = 30) {
  return `<circle cx="${cx}" cy="${cy}" r="${Math.round(r * 1.7)}" fill="#F3E3B8" opacity="0.22"/>
    <path d="M${(cx + r * 0.3).toFixed(1)} ${cy - r} a${r} ${r} 0 1 0 0 ${r * 2} a${(r * 0.78).toFixed(1)} ${(r * 0.78).toFixed(1)} 0 1 1 0 ${-r * 2} z" fill="#F4E7C0" stroke="${INK_SOFT.near}" stroke-width="1.6"/>`;
}

/** 云：三团圆 + 一道浅边，宣纸底上也能看清 */
function inkCloud(cx, cy, w = 120) {
  const h = w * 0.28;
  return `<g fill="${INK_SOFT.white}" stroke="${INK_SOFT.far}" stroke-width="1.6" opacity="0.95">
    <ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2}"/>
    <circle cx="${(cx - w * 0.2).toFixed(1)}" cy="${(cy - h * 0.35).toFixed(1)}" r="${(h * 0.62).toFixed(1)}"/>
    <circle cx="${(cx + w * 0.18).toFixed(1)}" cy="${(cy - h * 0.3).toFixed(1)}" r="${(h * 0.52).toFixed(1)}"/></g>`;
}

/** 树：豆绿三层冠 + 木色干 */
function inkTree(x, baseY, s = 1, crown = INK_SOFT.leaf) {
  return `<path d="M${x} ${baseY} v-${34 * s}" stroke="${INK_SOFT.wood}" stroke-width="${5.5 * s}" stroke-linecap="round"/>
    <circle cx="${x}" cy="${baseY - 48 * s}" r="${18 * s}" fill="${crown}"/>
    <circle cx="${x - 14 * s}" cy="${baseY - 36 * s}" r="${12 * s}" fill="${crown}"/>
    <circle cx="${x + 14 * s}" cy="${baseY - 37 * s}" r="${11 * s}" fill="${crown}"/>`;
}

/** 松：两层三角冠 */
function inkPine(x, baseY, s = 1) {
  return `<path d="M${x} ${baseY} v-${40 * s}" stroke="${INK_SOFT.wood}" stroke-width="${4.5 * s}" stroke-linecap="round"/>
    <path d="M${x} ${baseY - 96 * s} L${x + 22 * s} ${baseY - 52 * s} H${x - 22 * s} Z" fill="${INK_SOFT.leafDeep}"/>
    <path d="M${x} ${baseY - 122 * s} L${x + 16 * s} ${baseY - 84 * s} H${x - 16 * s} Z" fill="${INK_SOFT.leaf}"/>`;
}

/** 荷：五瓣 + 花心，缩略图里也能看出是荷花 */
function inkLotus(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="-14" rx="7.5" ry="15" fill="${INK_SOFT.flower}"/>
    <ellipse cx="-11" cy="-8" rx="6.5" ry="13" transform="rotate(-30 -11 -8)" fill="#EFB9BB"/>
    <ellipse cx="11" cy="-8" rx="6.5" ry="13" transform="rotate(30 11 -8)" fill="#EFB9BB"/>
    <ellipse cx="-19" cy="1" rx="5.6" ry="10" transform="rotate(-58 -19 1)" fill="${INK_SOFT.flower}" opacity="0.9"/>
    <ellipse cx="19" cy="1" rx="5.6" ry="10" transform="rotate(58 19 1)" fill="${INK_SOFT.flower}" opacity="0.9"/>
    <circle cx="0" cy="-5" r="3.4" fill="#F6D98F"/></g>`;
}

/** 鸟：一道双弧当远翼 */
function inkBird(cx, cy, s = 1) {
  return `<path d="M${cx - 12 * s} ${cy} q${6 * s} ${-7 * s} ${12 * s} 0 q${6 * s} ${-7 * s} ${12 * s} 0" fill="none" stroke="${INK_SOFT.deep}" stroke-width="${2.4 * s}" stroke-linecap="round"/>`;
}

/** 舟：船身 + 桅 + 帆 */
function inkBoat(cx, cy, s = 1) {
  return `<path d="M${cx - 34 * s} ${cy} q${34 * s} ${12 * s} ${68 * s} 0 q${-10 * s} ${12 * s} ${-34 * s} ${12 * s} q${-24 * s} 0 ${-34 * s} ${-12 * s} z" fill="${INK_SOFT.wood}"/>
    <path d="M${cx} ${cy - 4 * s} v-${40 * s}" stroke="${INK_SOFT.deep}" stroke-width="${3 * s}" stroke-linecap="round"/>
    <path d="M${cx + 2 * s} ${cy - 40 * s} l${26 * s} ${30 * s} h${-26 * s} z" fill="${INK_SOFT.white}" stroke="${INK_SOFT.far}" stroke-width="1.4"/>`;
}

/** 屋：墙 + 瓦顶 + 门 */
function inkHouse(x, baseY, w = 74, h = 54) {
  return `<rect x="${x - w / 2}" y="${baseY - h}" width="${w}" height="${h}" fill="${INK_SOFT.white}" stroke="${INK_SOFT.far}" stroke-width="1.6"/>
    <path d="M${x - w / 2 - 9} ${baseY - h + 2} L${x} ${baseY - h - 26} L${x + w / 2 + 9} ${baseY - h + 2} Z" fill="${INK_SOFT.roof}"/>
    <rect x="${x - 9}" y="${baseY - 26}" width="18" height="26" fill="${INK_SOFT.wood}" opacity="0.85"/>`;
}

/** 亭：台基 + 双柱 + 飞檐 */
function inkPavilion(x, baseY, w = 96) {
  return `<rect x="${x - w / 2}" y="${baseY - 6}" width="${w}" height="8" rx="3" fill="${INK_SOFT.far}"/>
    <path d="M${x - w / 2 + 12} ${baseY - 4} v-40 M${x + w / 2 - 12} ${baseY - 4} v-40" stroke="${INK_SOFT.wood}" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M${x - w / 2} ${baseY - 42} L${x} ${baseY - 72} L${x + w / 2} ${baseY - 42} Z" fill="${INK_SOFT.roof}"/>`;
}

/** 楼：三层飞檐 */
function inkTower(x, baseY, w = 76) {
  const tiers = [0, 1, 2]
    .map((i) => {
      const y = baseY - 26 - i * 40;
      const ww = w - i * 14;
      return `<rect x="${x - ww / 2 + 6}" y="${y - 24}" width="${ww - 12}" height="24" fill="${INK_SOFT.white}" stroke="${INK_SOFT.far}" stroke-width="1.4"/>
        <path d="M${x - ww / 2} ${y - 24} L${x} ${y - 46} L${x + ww / 2} ${y - 24} Z" fill="${INK_SOFT.roof}"/>`;
    })
    .join('');
  return `<rect x="${x - w / 2}" y="${baseY - 10}" width="${w}" height="10" fill="${INK_SOFT.far}"/>${tiers}`;
}

/** 20 个诗境：每个都按「远景 → 中景 → 前景」三层搭，保证画面下半不空 */
function poemSceneMarkup(name) {
  switch (name) {
    case 'moon':
      return `${inkHill(232, 92, INK_SOFT.far)}${inkHill(262, 56, INK_SOFT.near)}${inkMoon(240, 74, 32)}${inkCloud(94, 150, 104)}`;
    case 'night':
      return `${inkMoon(252, 62, 26)}${inkHill(226, 82, INK_SOFT.far)}${inkHill(258, 46, INK_SOFT.near)}
        ${inkWater(252, 3)}${inkBoat(168, 262, 1)}${inkPine(46, 300, 1.05)}
        <g fill="${INK_SOFT.white}" opacity="0.9">${[[86, 60], [140, 96], [204, 52], [286, 108]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4"/>`).join('')}</g>`;
    case 'mountain':
      return `${inkHill(228, 104, INK_SOFT.far)}${inkHill(266, 62, INK_SOFT.near)}
        ${inkCloud(104, 152, 128)}${inkCloud(238, 106, 80)}${inkPine(54, 306, 1.3)}${inkPine(276, 312, 1)}`;
    case 'gorge':
      return `<path d="M-8 320 V118 q30 62 64 98 q-18 48 -10 104 z" fill="${INK_SOFT.near}"/>
        <path d="M328 320 V118 q-30 62 -64 98 q18 48 10 104 z" fill="${INK_SOFT.near}"/>
        ${inkSun(160, 58, 22)}${inkWater(250, 3)}${inkBoat(158, 258, 1)}`;
    case 'river':
      return `${inkHill(198, 92, INK_SOFT.far)}${inkHill(228, 54, INK_SOFT.near)}${inkWater(246, 3)}
        ${inkBoat(150, 256, 1.1)}${inkCloud(92, 92, 92)}${inkBird(232, 84, 1.2)}`;
    case 'lake':
      return `${inkHill(206, 80, INK_SOFT.far)}${inkWater(226, 3)}${inkBoat(126, 250, 1)}
        <ellipse cx="252" cy="264" rx="38" ry="13" fill="${INK_SOFT.leaf}" opacity="0.55"/>${inkBird(262, 92, 1.2)}${inkCloud(86, 86, 84)}`;
    case 'willow':
      return `${inkHill(238, 70, INK_SOFT.far)}${inkWater(266, 2)}
        <path d="M104 300 q-6 -58 -2 -110" fill="none" stroke="${INK_SOFT.wood}" stroke-width="10" stroke-linecap="round"/>
        <ellipse cx="104" cy="174" rx="46" ry="22" fill="${INK_SOFT.leaf}"/>
        <ellipse cx="70" cy="186" rx="26" ry="14" fill="${INK_SOFT.leaf}"/>
        <ellipse cx="138" cy="186" rx="26" ry="14" fill="${INK_SOFT.leaf}"/>
        ${[-42, -30, -18, -6, 6, 18, 30, 42]
          .map((dx) => {
            const tipX = Math.round(104 + dx * 1.28);
            const tipY = Math.round(248 + Math.abs(dx) * 0.34);
            return `<path d="M${104 + dx} 192 q${Math.round(dx * 0.5)} 34 ${dx * 1.28 - dx} ${tipY - 192}" fill="none" stroke="${INK_SOFT.leafDeep}" stroke-width="2.6" stroke-linecap="round" opacity="0.85"/>
              <ellipse cx="${tipX}" cy="${tipY - 6}" rx="6.4" ry="3.2" fill="${INK_SOFT.leaf}" opacity="0.95"/>
              <ellipse cx="${Math.round(104 + dx * 1.1)}" cy="${Math.round((192 + tipY) / 2)}" rx="5.6" ry="2.8" fill="${INK_SOFT.leaf}" opacity="0.8"/>`;
          })
          .join('')}${inkBird(236, 106, 1.2)}${inkBird(264, 122, 1)}`;
    case 'waterfowl':
      return `${inkHill(186, 44, INK_SOFT.far)}${inkWater(196, 3)}
        <ellipse cx="150" cy="262" rx="46" ry="23" fill="${INK_SOFT.white}" stroke="${INK_SOFT.far}" stroke-width="1.8"/>
        <path d="M186 240 q24 -34 10 -60" fill="none" stroke="${INK_SOFT.white}" stroke-width="14" stroke-linecap="round"/>
        <circle cx="198" cy="178" r="8" fill="${INK_SOFT.white}" stroke="${INK_SOFT.far}" stroke-width="1.6"/>
        <circle cx="201" cy="176" r="2" fill="${INK_SOFT.deep}"/>
        <path d="M205 180 l16 5 l-16 5 z" fill="#D98A4C"/>
        <path d="M132 258 q12 10 28 0" fill="none" stroke="#D98A4C" stroke-width="5" stroke-linecap="round"/>${inkBird(84, 92, 1.2)}`;
    case 'farm':
      return `${inkSun(64, 62, 26)}${inkHill(218, 68, INK_SOFT.far)}${inkGround(238, '#E9E4C8')}
        ${inkHouse(258, 244, 62, 44)}
        ${[0, 1, 2, 3, 4, 5]
          .map((i) => {
            const x = 32 + i * 44;
            return `<path d="M${x} 288 v-26" stroke="${INK_SOFT.leafDeep}" stroke-width="3.4" stroke-linecap="round"/>
              <path d="M${x} 264 q-8 -8 -3 -16 q7 6 3 16 M${x} 264 q8 -8 3 -16 q-7 6 -3 16" fill="${INK_SOFT.leaf}"/>`;
          })
          .join('')}
        ${[0, 1, 2].map((i) => `<path d="M24 ${258 + i * 16} q66 -10 132 0 t132 0" fill="none" stroke="${INK_SOFT.leafDeep}" stroke-width="4" opacity="${(0.4 - i * 0.08).toFixed(2)}"/>`).join('')}`;
    case 'blossom':
      return `${inkHill(238, 70, INK_SOFT.far)}${inkGround(272)}
        <path d="M36 268 q54 -72 116 -96" fill="none" stroke="${INK_SOFT.wood}" stroke-width="5" stroke-linecap="round"/>
        ${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${74 + i * 22}" cy="${236 - i * 16}" r="${10 - i}" fill="${INK_SOFT.flower}"/>`).join('')}${inkBird(233, 94, 1.1)}`;
    case 'waterfall':
      // 瀑布：两侧崖壁夹一道白练，崖口与水面相连，避免“水龙头悬空”
      return `${inkHill(226, 92, INK_SOFT.far)}${inkHill(262, 52, INK_SOFT.near)}
        <path d="M96 244 q4 -74 34 -78 q22 -3 30 40 h44 q8 -43 30 -40 q30 4 34 78 z" fill="#9C9484"/>
        <path d="M164 202 h28 q7 30 2 52 h-32 q-5 -22 2 -52 z" fill="${INK_SOFT.white}" opacity="0.96"/>
        <path d="M171 206 v44 M179 206 v44 M187 206 v44" stroke="${INK_SOFT.line}" stroke-width="2" opacity="0.6"/>
        ${inkWater(252, 3)}
        <ellipse cx="178" cy="254" rx="40" ry="9" fill="${INK_SOFT.white}" opacity="0.8"/>
        ${inkPine(44, 300, 0.95)}${inkPine(286, 304, 0.85)}`;
    case 'snow':
      // 江雪：两座雪峰 + 寒江 + 孤舟蓑笠翁（原“巨浪”形山脊与诗境不符）
      return `<path d="M-10 268 L56 178 L122 268 Z" fill="#DCE6EA"/>
        <path d="M56 178 L82 214 L64 209 L56 218 L48 209 L30 214 Z" fill="${INK_SOFT.white}"/>
        <path d="M100 268 L196 136 L292 268 Z" fill="#E9EFF2"/>
        <path d="M196 136 L230 182 L208 176 L198 188 L188 176 L164 182 Z" fill="${INK_SOFT.white}"/>
        ${inkWater(266, 2)}
        <path d="M-10 274 q26 -14 54 -6 v40 h-54 z" fill="#EDF3F6"/>${inkPine(26, 272, 0.8)}
        ${inkBoat(164, 288, 0.85)}
        <circle cx="140" cy="272" r="5" fill="${INK_SOFT.deep}"/>
        <path d="M130 268 h20 l-10 -9 z" fill="${INK_SOFT.wood}"/>
        <path d="M144 276 v10" stroke="${INK_SOFT.deep}" stroke-width="2"/>
        ${[[46, 52], [118, 40], [196, 66], [262, 38], [300, 86], [72, 110]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="${INK_SOFT.white}"/>`).join('')}`;
    case 'tower':
      return `${inkSun(238, 70, 30)}${inkHill(230, 78, INK_SOFT.far)}${inkWater(268, 2)}${inkTower(112, 288, 82)}${inkBird(206, 104, 1.1)}`;
    case 'pavilion':
      return `${inkSun(240, 66, 26)}${inkHill(220, 66, INK_SOFT.far)}${inkWater(244, 3)}${inkPavilion(160, 258, 108)}${inkBird(228, 94, 1.1)}`;
    case 'cottage':
      return `${inkSun(252, 62, 24)}${inkHill(226, 72, INK_SOFT.far)}${inkGround(246)}${inkHouse(126, 282, 84, 58)}
        <path d="M56 286 v-30 M56 262 h96 M56 276 h96" stroke="${INK_SOFT.wood}" stroke-width="3.6" stroke-linecap="round" opacity="0.75"/>${inkTree(252, 290, 1.1)}`;
    case 'forest':
      return `${inkGround(250, '#EDE7D6')}${inkPine(62, 306, 1.35)}${inkPine(150, 300, 1.7)}${inkPine(250, 308, 1.2)}
        ${inkCloud(180, 150, 168)}<path d="M96 320 q40 -28 74 -4" fill="none" stroke="${INK_SOFT.far}" stroke-width="6" stroke-linecap="round" opacity="0.6"/>`;
    case 'autumn':
      return `${inkHill(224, 88, INK_SOFT.far)}${inkGround(260, '#EFE3CB')}${inkTree(94, 296, 1.15, '#CE8E5E')}${inkTree(238, 288, 0.9, '#C9754F')}
        ${[[150, 262], [176, 276], [126, 284], [204, 264]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.4" fill="#C9754F" opacity="0.8"/>`).join('')}`;
    case 'lotus':
      return `${inkWater(212, 3)}
        <ellipse cx="92" cy="246" rx="34" ry="13" fill="${INK_SOFT.leaf}" opacity="0.85"/>
        <ellipse cx="232" cy="260" rx="40" ry="15" fill="${INK_SOFT.leafDeep}" opacity="0.7"/>
        ${inkLotus(92, 242, 1)}${inkLotus(232, 258, 0.86)}${inkLotus(58, 268, 0.6)}
        ${inkBoat(158, 282, 0.85)}${inkBird(206, 66, 1.2)}${inkBird(238, 84, 1)}`;
    case 'moonrise':
      // 西江月「明月别枝惊鹊」：月 + 栖枝 + 惊飞的两只鹊 + 田埂
      return `${inkMoon(240, 68, 26)}${inkHill(224, 88, INK_SOFT.far)}${inkGround(252)}
        ${inkTree(84, 292, 1.15)}${inkBird(148, 112, 1.2)}${inkBird(196, 88, 1.05)}
        ${[0, 1, 2, 3, 4]
          .map((i) => {
            const x = 196 + i * 26;
            return `<path d="M${x} 296 v-22" stroke="${INK_SOFT.leafDeep}" stroke-width="2.8" stroke-linecap="round"/>
              <ellipse cx="${x}" cy="272" rx="5" ry="9" fill="#E3C87F"/>`;
          })
          .join('')}`;
    case 'spring':
      return `${inkSun(248, 66, 28)}${inkHill(236, 84, INK_SOFT.far)}${inkGround(258)}${inkTree(92, 292, 1.2)}
        ${inkBird(196, 96, 1.2)}${inkBird(222, 112, 1)}
        ${[[140, 268], [168, 282], [118, 286]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${INK_SOFT.flower}"/>`).join('')}`;
    case 'swing':
      return `${inkHill(228, 70, INK_SOFT.far)}${inkGround(250)}
        <path d="M114 292 V180 M204 292 V180" stroke="${INK_SOFT.wood}" stroke-width="7" stroke-linecap="round"/>
        <path d="M104 182 h110" stroke="${INK_SOFT.wood}" stroke-width="8" stroke-linecap="round"/>
        <path d="M140 186 v44 M178 186 v44" stroke="${INK_SOFT.deep}" stroke-width="2.8"/>
        <rect x="132" y="230" width="54" height="8" rx="4" fill="${INK_SOFT.roof}"/>${inkTree(258, 292, 1)}${inkBird(70, 96, 1.1)}`;
    default:
      return `${inkHill(228, 96, INK_SOFT.far)}${inkHill(262, 58, INK_SOFT.near)}${inkCloud(150, 130, 140)}`;
  }
}

function poemSvg({ slug, kind }) {
  if (kind !== 'poem') return null;
  const scene = POEM_SCENES[slug] ?? 'mountain';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_SIZE}" height="${CARD_SIZE}">
    <rect width="${CARD_SIZE}" height="${CARD_SIZE}" fill="${INK.paper}"/>
    <rect x="0.5" y="0.5" width="${CARD_SIZE - 1}" height="${CARD_SIZE - 1}" fill="none" stroke="${INK.pale}" stroke-width="1.4" opacity="0.75"/>
    ${poemSceneMarkup(scene)}
  </svg>`;
}

function poemCoverSvg() {
  const { width, height } = COVER_SIZE;
  // 诗景是 320×320 画布，整幅放进 480×360：按高度缩放后左右留纸边
  const scale = height / CARD_SIZE;
  const offsetX = (width - CARD_SIZE * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="${INK.paper}"/>
    <g transform="translate(${offsetX.toFixed(1)} 0) scale(${scale.toFixed(3)})">${poemSceneMarkup('mountain')}</g>
  </svg>`;
}

/**
 * 卡片背景（v0.3）：与故事综合图同一套语言——柔和渐变天 + 浅色地面 + 两朵白云。
 * 17 个分类只换色调，不再出现“渐变底 + 单色 emoji 剪影”的脱节感。
 */
function cardScene(theme, outdoor = false) {
  const size = CARD_SIZE;
  const clouds = outdoor
    ? `<g fill="#FFFFFF" opacity="0.8"><circle cx="46" cy="44" r="13"/><circle cx="64" cy="38" r="17"/><circle cx="84" cy="46" r="12"/><rect x="46" y="44" width="38" height="14" rx="7"/></g>
      <g fill="#FFFFFF" opacity="0.55"><circle cx="244" cy="30" r="10"/><circle cx="258" cy="26" r="13"/><circle cx="272" cy="32" r="9"/><rect x="244" y="30" width="28" height="11" rx="5.5"/></g>`
    : '';
  return `<defs><linearGradient id="cSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${theme.bg}"/><stop offset="1" stop-color="#FFFDF8"/>
    </linearGradient></defs>
    <rect width="${size}" height="${size}" fill="url(#cSky)"/>
    <circle cx="${size - 40}" cy="56" r="70" fill="${theme.soft}" opacity="0.5"/>
    <circle cx="34" cy="${size - 70}" r="54" fill="${theme.soft}" opacity="0.4"/>
    ${clouds}
    <path d="M0 268 q80 -16 160 0 t160 0 V${size} H0 Z" fill="${theme.soft}" opacity="0.75"/>`;
}

/** 户外感更强的分类：多两朵云；室内分类保持干净的“墙面 + 地面” */
const CARD_OUTDOOR = new Set(['animals', 'fruit', 'vegetables', 'vehicles', 'weather', 'verbs']);

/** 分类内主体大小：车/人宽一点，果子小一点，保证同一列的视觉重量差不多 */
const CARD_SUBJECT_SIZE = {
  animals: 205,
  fruit: 190,
  vegetables: 190,
  vehicles: 205,
  daily: 190,
  body: 200,
  family: 200,
  weather: 190,
  verbs: 200,
  food: 190,
  school: 190,
};

/** 个别主体本身画得小（香蕉/鱼/鼻子），卡片里给一点补偿，免得同一列里忽大忽小 */
const CARD_BOOST = {
  banana: 1.3, fish: 1.25, nose: 1.2, butterfly: 1.2, dragonfly: 1.15, blueberry: 1.18, lemon: 1.15,
  cherry: 1.12, 'fish-dish': 1.15, key: 1.12, scissors: 1.12, pencil: 1.1, cold: 1.15,
};

/** 主体的落脚线（与故事同一套口径：天空抬升、鱼不下沉、其它踩地） */
function cardBaseY(slug) {
  const spec = cardSpecOf(slug);
  if (spec?.art === 'sky') return 300;
  if (spec?.art === 'fish' || spec?.art === 'tadpole' || spec?.art === 'body') return 236;
  return 272;
}

/** 卡片主体：优先取故事侧画师，其次取卡片侧画师，两者都不支持时返回空串 */
function cardSubject(slug, size = 190) {
  const spec = cardSpecOf(slug);
  if (!spec) return '';
  const draw = CARD_ART[spec.art] ?? CAST_ART[spec.art];
  if (!draw) return '';
  const { art, boost = 1, ...rest } = spec;
  const factor = boost * (CARD_BOOST[slug] ?? 1);
  return `<g transform="translate(${CARD_SIZE / 2} ${cardBaseY(slug)})">${draw(rest, { scale: (size / 96) * factor })}</g>`;
}

function cardSvg({ slug, categoryId, zh, kind, index }) {
  const theme = THEME[categoryId] ?? THEME.characters;
  // 天气分类用略深的天空：白云/月亮/雪花在近白底上会“消失”
  const sceneTheme = categoryId === 'weather' ? { ...theme, bg: '#D3E5F6' } : theme;
  const head = cardScene(sceneTheme, CARD_OUTDOOR.has(categoryId));

  if (categoryId === 'colors') {
    const hex = COLOR_HEX[slug] ?? theme.accent;
    const ring = slug === 'white' ? `stroke="${theme.accent}" stroke-width="6"` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_SIZE}" height="${CARD_SIZE}">
      ${head}
      <ellipse cx="160" cy="276" rx="86" ry="16" fill="#5C4E3E" opacity="0.12"/>
      <circle cx="160" cy="168" r="98" fill="${hex}" ${ring}/>
      <circle cx="128" cy="136" r="24" fill="#ffffff" opacity="0.28"/>
    </svg>`;
  }

  if (categoryId === 'shapes') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_SIZE}" height="${CARD_SIZE}">
      ${head}
      ${shapeMarkup(slug, theme.accent)}
    </svg>`;
  }

  if (categoryId === 'numbers') {
    const value = index + 1;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_SIZE}" height="${CARD_SIZE}">
      ${head}
      <circle cx="160" cy="150" r="96" fill="#FFFFFF" opacity="0.72"/>
      <text x="160" y="196" font-size="128" font-weight="700" text-anchor="middle"
        font-family="Microsoft YaHei, Segoe UI" fill="${theme.accent}">${value}</text>
      <text x="160" y="248" font-size="30" text-anchor="middle"
        font-family="KaiTi, Microsoft YaHei" fill="${theme.accent}" opacity="0.8">${CN_NUMERAL[index] ?? ''}</text>
      <path d="M88 278 q72 -10 144 0" fill="none" stroke="${theme.accent}" stroke-width="4" stroke-linecap="round" opacity="0.35"/>
    </svg>`;
  }

  if (kind === 'character') {
    // 汉字卡：仍以字形为主体，但底色/边框/落脚线与全站同一套（不再用虚线框）
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_SIZE}" height="${CARD_SIZE}">
      ${head}
      <rect x="44" y="34" width="232" height="232" rx="30" fill="#FFFFFF" opacity="0.82"/>
      <text x="160" y="214" font-size="176" text-anchor="middle"
        font-family="KaiTi, STKaiti, Microsoft YaHei" fill="${theme.accent}">${zh}</text>
      <path d="M112 266 h96" stroke="${theme.accent}" stroke-width="5" stroke-linecap="round" opacity="0.3"/>
    </svg>`;
  }

  const size = CARD_SUBJECT_SIZE[categoryId] ?? 190;
  const subject = cardSubject(slug, size);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_SIZE}" height="${CARD_SIZE}">
    ${head}
    ${subject}
  </svg>`;
}

function coverSvg(categoryId, slugs) {
  const theme = THEME[categoryId] ?? THEME.characters;
  const { width, height } = COVER_SIZE;
  const picks = slugs.slice(0, 3);
  const spots = picks.length >= 3
    ? [{ cx: 240, size: 168 }, { cx: 120, size: 132 }, { cx: 362, size: 132 }]
    : picks.length === 2
      ? [{ cx: 300, size: 168 }, { cx: 160, size: 148 }]
      : [{ cx: 240, size: 180 }];
  const subjects = picks
    .map((slug, i) => {
      const spot = spots[i];
      const spec = cardSpecOf(slug);
      if (!spec) return '';
      const draw = CARD_ART[spec.art] ?? CAST_ART[spec.art];
      if (!draw) return '';
      const { art, boost = 1, ...rest } = spec;
      const baseY = spec.art === 'sky' ? height - 60 : height - 58;
      return `<g transform="translate(${spot.cx} ${baseY})">${draw(rest, { scale: (spot.size / 96) * boost })}</g>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="vSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${theme.bg}"/><stop offset="1" stop-color="#FFFDF8"/>
    </linearGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#vSky)"/>
    <circle cx="${width - 54}" cy="52" r="96" fill="${theme.soft}" opacity="0.55"/>
    <g fill="#FFFFFF" opacity="0.7"><circle cx="58" cy="54" r="15"/><circle cx="78" cy="46" r="20"/><circle cx="100" cy="56" r="14"/><rect x="58" y="54" width="44" height="16" rx="8"/></g>
    <path d="M0 302 q120 -20 240 0 t240 0 V${height} H0 Z" fill="${theme.soft}" opacity="0.8"/>
    ${subjects}
  </svg>`;
}

/* ---------- 故事绘本插画（v0.2）：18 个场景 × 96 个主体 ---------- */

/** 绘本统一调色：低饱和，350 张不漂移 */
const STORY_INK = {
  sun: '#F6D27A',
  grass: '#A6D69B',
  grassDeep: '#8AC484',
  soil: '#E0C39A',
  soilDeep: '#CBAF87',
  water: '#A8D6EC',
  waterDeep: '#82BAD6',
  wood: '#C08A52',
  roof: '#D98A6A',
  snow: '#F2F8FD',
  nightTop: '#2F3A5A',
  nightBottom: '#5B6E9E',
  rockTop: '#4B4139',
  rockBottom: '#6E5C4C',
};

function storySky(top = '#E8F4FF', bottom = '#F6FBEF') {
  return `<defs><linearGradient id="sSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>
    </linearGradient></defs><rect width="${STORY_SIZE.width}" height="${STORY_SIZE.height}" fill="url(#sSky)"/>`;
}

function storySun(cx = 392, cy = 66, r = 30) {
  return `<circle cx="${cx}" cy="${cy}" r="${r * 1.9}" fill="${STORY_INK.sun}" opacity="0.16"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${STORY_INK.sun}" opacity="0.88"/>`;
}

function puffCloud(cx, cy, w = 110) {
  const h = w * 0.3;
  return `<g opacity="0.92">
    <ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2}" fill="#FFFFFF"/>
    <ellipse cx="${cx - w * 0.24}" cy="${cy - h * 0.3}" rx="${w / 3.4}" ry="${h / 2.4}" fill="#FFFFFF"/>
    <ellipse cx="${cx + w * 0.26}" cy="${cy - h * 0.2}" rx="${w / 3.8}" ry="${h / 2.6}" fill="#FFFFFF"/>
  </g>`;
}

function groundBand(y, color, opacity = 1) {
  return `<path d="M0 ${y} Q120 ${y - 22} 240 ${y - 6} T480 ${y - 10} V${STORY_SIZE.height} H0 Z" fill="${color}" opacity="${opacity}"/>`;
}

function flowerRow(y, color) {
  return [0, 1, 2, 3, 4, 5, 6]
    .map((i) => {
      const x = 34 + i * 70;
      const h = 16 + (i % 3) * 6;
      return `<path d="M${x} ${y + 12} v-${h}" stroke="#7FBE7B" stroke-width="3" stroke-linecap="round"/><circle cx="${x}" cy="${y + 12 - h}" r="7" fill="${color}"/>`;
    })
    .join('');
}

function storyTree(x, baseY, s = 1) {
  return `<path d="M${x} ${baseY} q-4 -${50 * s} 0 -${86 * s}" stroke="${STORY_INK.soilDeep}" stroke-width="${10 * s}" stroke-linecap="round"/>
    <circle cx="${x}" cy="${baseY - 104 * s}" r="${34 * s}" fill="#8FCB86"/>
    <circle cx="${x - 26 * s}" cy="${baseY - 84 * s}" r="${24 * s}" fill="#9FD796"/>
    <circle cx="${x + 26 * s}" cy="${baseY - 84 * s}" r="${22 * s}" fill="#84C07B"/>`;
}

/** 18 个背景模板：scene key 由 stories.ts 每页声明 */
const STORY_SCENES = {
  meadow: () => `${storySky()}${storySun()}${puffCloud(96, 74, 104)}${puffCloud(300, 52, 78)}
    ${groundBand(262, STORY_INK.grass)}${groundBand(300, STORY_INK.grassDeep, 0.85)}
    ${flowerRow(250, '#F3A8B8')}${flowerRow(312, '#F7C978')}`,
  forest: () => `${storySky()}${storySun(74, 58, 24)}
    ${groundBand(268, STORY_INK.grass)}${storyTree(46, 306, 1.5)}${storyTree(436, 312, 1.7)}${storyTree(122, 296, 1.1)}
    <rect y="304" width="480" height="56" fill="${STORY_INK.grassDeep}" opacity="0.5"/>`,
  hill: () => `${storySky()}${storySun(112, 70, 26)}${puffCloud(360, 70, 96)}
    <path d="M-20 302 Q120 148 260 302 Z" fill="${STORY_INK.grass}" opacity="0.85"/>
    <path d="M180 302 Q330 128 500 302 Z" fill="${STORY_INK.grassDeep}" opacity="0.8"/>
    <rect y="300" width="480" height="60" fill="${STORY_INK.grassDeep}" opacity="0.55"/>`,
  house: () => `${storySky()}${storySun(406, 60, 26)}${puffCloud(118, 66, 92)}${groundBand(276, STORY_INK.grass)}
    <path d="M150 302 V212 h180 v90 z" fill="#FBF3E5" stroke="${STORY_INK.soilDeep}" stroke-width="3"/>
    <path d="M132 214 L240 146 L348 214 Z" fill="${STORY_INK.roof}"/>
    <rect x="222" y="248" width="40" height="54" rx="6" fill="${STORY_INK.wood}" opacity="0.85"/>
    <rect x="176" y="232" width="34" height="30" rx="5" fill="#BFE3F2" stroke="${STORY_INK.soilDeep}" stroke-width="2"/>
    <rect x="302" y="232" width="34" height="30" rx="5" fill="#BFE3F2" stroke="${STORY_INK.soilDeep}" stroke-width="2"/>`,
  kitchen: () => `${storySky('#FBF4EA', '#F1E5D4')}
    <rect x="62" y="58" width="126" height="94" rx="8" fill="#BFE3F2" stroke="#FFFFFF" stroke-width="7"/>
    <path d="M125 58 v94 M62 105 h126" stroke="#FFFFFF" stroke-width="5" opacity="0.9"/>
    <rect y="240" width="480" height="120" fill="${STORY_INK.soil}" opacity="0.4"/>
    <rect y="240" width="480" height="14" fill="#FFFFFF" opacity="0.7"/>
    <rect x="326" y="148" width="92" height="92" rx="10" fill="#EAD9C0"/>
    <path d="M326 172 h92" stroke="#D6C2A4" stroke-width="5"/>`,
  garden: () => `${storySky()}${storySun(84, 62, 24)}${groundBand(248, STORY_INK.grass)}
    <rect y="286" width="480" height="74" fill="${STORY_INK.soil}" opacity="0.55"/>
    ${[0, 1, 2, 3, 4, 5]
      .map((i) => {
        const x = 40 + i * 80;
        return `<path d="M${x} 302 v-58" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" opacity="0.9"/><path d="M${x} 268 l-16 -18 M${x} 268 l16 -18" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity="0.9"/>`;
      })
      .join('')}
    ${flowerRow(244, '#F3A8B8')}`,
  room: () => `${storySky('#FAF6EF', '#F1E9DB')}
    <rect x="272" y="52" width="140" height="112" rx="10" fill="#CFE7F6" stroke="#FFFFFF" stroke-width="8"/>
    <path d="M342 52 v112 M272 108 h140" stroke="#FFFFFF" stroke-width="6"/>
    <path d="M264 38 h156" stroke="${STORY_INK.roof}" stroke-width="10" stroke-linecap="round" opacity="0.5"/>
    <rect y="250" width="480" height="110" fill="#E7DACA"/>
    <path d="M0 250 h480" stroke="#D9C9B4" stroke-width="6"/>
    ${[0, 1, 2, 3, 4]
      .map((i) => `<path d="M0 ${282 + i * 16} h480" stroke="#DCCEB9" stroke-width="2" opacity="0.7"/>`)
      .join('')}`,
  road: () => `${storySky()}${storySun(400, 58, 22)}${puffCloud(120, 62, 92)}
    ${groundBand(238, STORY_INK.grass)}
    <rect y="286" width="480" height="74" fill="#D8D5CE"/>
    <rect y="286" width="480" height="18" fill="#EDEAE2"/>
    <path d="M0 304 H480" stroke="#BFBBB2" stroke-width="3" opacity="0.75"/>
    ${[0, 1, 2, 3, 4, 5, 6]
      .map((i) => `<rect x="${24 + i * 68}" y="334" width="40" height="12" rx="5" fill="#FFFFFF" opacity="0.85"/>`)
      .join('')}
    ${storyTree(432, 288, 0.85)}`,
  pond: () => `${storySky('#E6F5FF', '#F2FBEF')}${storySun(88, 56, 22)}${puffCloud(300, 58, 96)}
    ${groundBand(238, STORY_INK.grass)}
    <ellipse cx="240" cy="302" rx="222" ry="58" fill="${STORY_INK.water}"/>
    <ellipse cx="240" cy="298" rx="196" ry="46" fill="${STORY_INK.waterDeep}" opacity="0.32"/>
    <ellipse cx="152" cy="288" rx="34" ry="11" fill="#8FCB86" opacity="0.9"/>
    <ellipse cx="330" cy="310" rx="28" ry="9" fill="#8FCB86" opacity="0.8"/>
    <path d="M356 294 v-92" stroke="#8FB87A" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="356" cy="196" rx="7" ry="16" fill="#A88A62"/>
    <path d="M356 246 q-22 -10 -30 -26" fill="none" stroke="#8FB87A" stroke-width="5" stroke-linecap="round"/>`,
  snow: () => `${storySky('#E7F1FB', '#F7FBFF')}${puffCloud(120, 68, 100)}${puffCloud(340, 52, 84)}
    <path d="M-10 302 Q110 200 240 302 T500 292 V360 H-10 Z" fill="${STORY_INK.snow}"/>
    <path d="M-10 324 Q140 262 280 324 T500 318 V360 H-10 Z" fill="#FFFFFF"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7, 8]
      .map((i) => `<circle cx="${36 + i * 52}" cy="${70 + (i % 3) * 36}" r="${4 + (i % 3)}" fill="#FFFFFF" opacity="0.9"/>`)
      .join('')}`,
  river: () => `${storySky()}${storySun(80, 58, 22)}${puffCloud(320, 60, 90)}${groundBand(236, STORY_INK.grass)}
    <path d="M0 302 Q120 268 240 296 T480 288 V360 H0 Z" fill="${STORY_INK.water}"/>
    ${[0, 1, 2]
      .map((i) => `<path d="M${40 + i * 20} ${314 + i * 16} q34 -10 68 0 t68 0 t68 0" fill="none" stroke="${STORY_INK.waterDeep}" stroke-width="4" stroke-linecap="round" opacity="${(0.55 - i * 0.12).toFixed(2)}"/>`)
      .join('')}
    <ellipse cx="392" cy="284" rx="20" ry="12" fill="${STORY_INK.soilDeep}" opacity="0.7"/>`,
  night: () => `<defs><linearGradient id="sSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${STORY_INK.nightTop}"/><stop offset="1" stop-color="${STORY_INK.nightBottom}"/>
    </linearGradient></defs><rect width="480" height="360" fill="url(#sSky)"/>
    ${[[60, 52], [122, 92], [196, 44], [286, 78], [360, 50], [420, 104], [250, 118], [150, 132]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#FFFFFF" opacity="0.85"/>`)
      .join('')}
    <circle cx="392" cy="70" r="30" fill="#F6E9BF"/>
    <circle cx="378" cy="60" r="26" fill="${STORY_INK.nightTop}" opacity="0.85"/>
    <path d="M-10 292 Q140 258 280 290 T500 282 V360 H-10 Z" fill="#45527A"/>
    <path d="M-10 292 Q140 258 280 290 T500 282" fill="none" stroke="#8C9AC4" stroke-width="3" opacity="0.65"/>
    <ellipse cx="240" cy="304" rx="206" ry="22" fill="#9FAEDB" opacity="0.22"/>`,
  farm: () => `${storySky('#EAF7FF', '#F6FBEF')}${storySun(70, 56, 24)}
    <path d="M300 290 V214 h120 v76 z" fill="#E2B6A6"/>
    <path d="M288 216 L360 166 L432 216 Z" fill="${STORY_INK.roof}"/>
    <rect x="344" y="240" width="34" height="50" rx="4" fill="${STORY_INK.wood}" opacity="0.8"/>
    <rect y="290" width="480" height="70" fill="${STORY_INK.soil}" opacity="0.5"/>
    ${[0, 1, 2, 3]
      .map((i) => `<path d="M20 ${302 + i * 14} q70 -12 130 0" fill="none" stroke="#8AC484" stroke-width="3" opacity="${(0.5 - i * 0.08).toFixed(2)}"/>`)
      .join('')}`,
  cave: () => `<defs><linearGradient id="sSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${STORY_INK.rockTop}"/><stop offset="1" stop-color="${STORY_INK.rockBottom}"/>
    </linearGradient></defs><rect width="480" height="360" fill="url(#sSky)"/>
    <ellipse cx="240" cy="150" rx="164" ry="118" fill="#F7E9C8" opacity="0.18"/>
    <path d="M0 44 Q120 -10 240 32 T480 26 V0 H0 Z" fill="#3E362F" opacity="0.5"/>
    <ellipse cx="240" cy="314" rx="268" ry="46" fill="${STORY_INK.soilDeep}" opacity="0.55"/>
    <ellipse cx="240" cy="320" rx="228" ry="34" fill="${STORY_INK.soil}" opacity="0.5"/>
    <path d="M58 360 V130 q40 -74 120 -74" fill="none" stroke="#3E362F" stroke-width="26" opacity="0.28"/>
    <path d="M422 360 V130 q-40 -74 -120 -74" fill="none" stroke="#3E362F" stroke-width="26" opacity="0.28"/>`,
  sea: () => `${storySky('#DDEEFB', '#F3FAF5')}${storySun(392, 60, 28)}${puffCloud(120, 60, 96)}
    <path d="M0 300 H480 V360 H0 Z" fill="${STORY_INK.water}"/>
    ${[0, 1, 2]
      .map((i) => `<path d="M${20 + i * 30} ${310 + i * 16} q30 -8 60 0 t60 0 t60 0 t60 0" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="${(0.7 - i * 0.15).toFixed(2)}"/>`)
      .join('')}`,
  castle: () => `${storySky('#E9F1FC', '#F7F5FB')}${puffCloud(96, 66, 96)}${storySun(404, 54, 22)}
    <path d="M-10 314 Q140 272 300 310 T500 302 V360 H-10 Z" fill="${STORY_INK.grass}" opacity="0.7"/>
    <path d="M150 302 V176 h44 v-30 h44 v30 h44 v-30 h44 v30 h44 v126 z" fill="#B7AFD9"/>
    <path d="M126 178 L172 140 L218 178 Z M218 148 L262 112 L306 148 Z M306 178 L352 140 L398 178 Z" fill="#8F86BC" opacity="0.9"/>
    <rect x="222" y="250" width="36" height="52" rx="18" fill="#6E6699" opacity="0.8"/>`,
  school: () => `${storySky()}${storySun(74, 56, 22)}${puffCloud(392, 58, 84)}
    <rect y="272" width="480" height="88" fill="${STORY_INK.grass}" opacity="0.55"/>
    <rect x="110" y="150" width="260" height="122" rx="8" fill="#F6EBD8" stroke="#E4D2B6" stroke-width="3"/>
    <path d="M96 152 L240 94 L384 152 Z" fill="${STORY_INK.roof}"/>
    <rect x="226" y="212" width="40" height="60" rx="4" fill="${STORY_INK.wood}" opacity="0.8"/>
    ${[0, 1, 2]
      .map((i) => `<rect x="${140 + i * 46}" y="176" width="30" height="24" rx="4" fill="#CFE7F6"/>`)
      .join('')}
    <path d="M360 94 v-34" stroke="${STORY_INK.wood}" stroke-width="4"/>
    <path d="M360 60 h34 v18 h-34 z" fill="#E07A6A"/>`,
  rain: () => `${storySky('#DAE1E8', '#EDF1F4')}${puffCloud(140, 68, 130)}${puffCloud(360, 84, 110)}${puffCloud(250, 46, 120)}
    <rect y="288" width="480" height="72" fill="#CBD3D8" opacity="0.7"/>
    ${[...Array(12)]
      .map((_, i) => `<path d="M${24 + i * 38} ${112 + (i % 5) * 26} l-8 34" stroke="#9FB4C2" stroke-width="3" stroke-linecap="round" opacity="0.55"/>`)
      .join('')}
    <ellipse cx="180" cy="316" rx="70" ry="12" fill="#B9C7D0"/>
    <ellipse cx="330" cy="326" rx="52" ry="10" fill="#B9C7D0"/>`,
};

/* ---------- 主体插画（v0.3）：与背景同一套扁平绘本语言 ---------- */

/** 主体色板：低饱和，与 18 个背景同族，保证 50 张不漂移 */
const CAST_TONES = {
  snow: '#FBF4E7', cream: '#F5E4C6', sand: '#E7CFAB', wheat: '#DDBB88',
  peach: '#F6D3B0', blush: '#F2B8C6', rose: '#E79AA8', coral: '#EB9A7C',
  amber: '#EFC383', honey: '#E3AF62', clay: '#C9A386', brown: '#B08258',
  cocoa: '#8E6A46', leaf: '#A6D69B', fern: '#86BC79', mint: '#C2E1B2',
  sky: '#A8D6EC', dusk: '#9FB0D0', stone: '#BDC3C9', slate: '#96A3B3',
  lilac: '#C6B8DE', berry: '#C98BA6',
  soil: '#E0C39A', soilDeep: '#CBAF87',
  wood: '#C08A52', woodDeep: '#A2703F',
};

/** 主体统一的暖墨色：眼睛、嘴、轮廓细节 */
const CAST_INK = '#4A4038';

/**
 * 每个色调的“深一档”：只用于一道细边和底部暗部。
 * 奶白/米色主体在奶油底上会糊成一团「虚影」，靠这道同色深边把轮廓拉出来。
 */
const TONE_DEEP = {
  snow: '#DCC9A9', cream: '#D3B98C', sand: '#C4A177', wheat: '#B78E58',
  peach: '#D9A379', blush: '#D0869A', rose: '#BC6B79', coral: '#C46C4B',
  amber: '#CE9A45', honey: '#B58237', clay: '#9E785C', brown: '#845C3C',
  cocoa: '#63482F', leaf: '#7EB073', fern: '#669459', mint: '#96BC83',
  sky: '#7BAEC7', dusk: '#7484A4', stone: '#949CA3', slate: '#6C7989',
  lilac: '#9D8DBC', berry: '#9F617D', soil: '#BE9F78', soilDeep: '#A88A62',
  wood: '#8E6136',
};

/** 主体轮廓：一道深一档的细边，保证浅色主体不发虚（内部坐标，随 scale 缩放） */
function castEdge(toneKey, width = 1.5) {
  const deep = TONE_DEEP[toneKey] ?? TONE_DEEP.stone;
  return ` stroke="${deep}" stroke-width="${width}"`;
}

/** 落地阴影：让主体站在草地上而不是浮着（内部坐标，脚底 y=0） */
function castShadow(rx) {
  return `<ellipse cx="0" cy="3" rx="${rx}" ry="${(rx * 0.2).toFixed(1)}" fill="#5C4E3E" opacity="0.14"/>`;
}

/** 眼睛 + 嘴：所有角色共用一套脸，保证画风一致 */
function castFace({ cy, r, gap = 0.4, mouth = true, nose = '' }) {
  const ex = r * gap;
  const er = Math.max(2.1, r * 0.125);
  const eyes = [-ex, ex]
    .map(
      (x) =>
        `<circle cx="${x.toFixed(1)}" cy="${cy}" r="${er.toFixed(1)}" fill="${CAST_INK}"/>` +
        `<circle cx="${(x + er * 0.35).toFixed(1)}" cy="${(cy - er * 0.45).toFixed(1)}" r="${(er * 0.38).toFixed(1)}" fill="#FFFDF8"/>`,
    )
    .join('');
  const smile = mouth
    ? `<path d="M${(-r * 0.16).toFixed(1)} ${(cy + r * 0.36).toFixed(1)} q${(r * 0.16).toFixed(1)} ${(r * 0.22).toFixed(1)} ${(r * 0.32).toFixed(1)} 0" fill="none" stroke="${CAST_INK}" stroke-width="${Math.max(1.3, r * 0.065).toFixed(1)}" stroke-linecap="round"/>`
    : '';
  return `${eyes}${nose}${smile}`;
}

/** 耳朵：long 兔 / cat 尖长 / point 猫狼狐 / round 熊 / big 鼠 / drop 垂耳 / flop 猪 */
function earArt(type, headCy, headR, earColor, inner) {
  const top = headCy - headR;
  switch (type) {
    case 'long':
      return [-1, 1]
        .map(
          (dir) => `<g transform="rotate(${dir * 7} ${dir * 11} ${top + 6})">
            <ellipse cx="${dir * 11}" cy="${top - 9}" rx="7.5" ry="20" fill="${earColor}"/>
            <ellipse cx="${dir * 11}" cy="${top - 6}" rx="3.8" ry="13" fill="${inner}"/></g>`,
        )
        .join('');
    case 'cat':
      return [-1, 1]
        .map(
          (dir) => `<path d="M${dir * 5} ${top + 11} l${dir * 5} -27 l${dir * 14} 21 z" fill="${earColor}"/>
            <path d="M${dir * 9} ${top + 7} l${dir * 3} -14 l${dir * 7} 11 z" fill="${inner}" opacity="0.9"/>`,
        )
        .join('');
    case 'point':
      return [-1, 1]
        .map(
          (dir) => `<path d="M${dir * 4} ${top + 9} l${dir * 6} -21 l${dir * 11} 17 z" fill="${earColor}"/>
            <path d="M${dir * 7} ${top + 7} l${dir * 4} -12 l${dir * 6} 10 z" fill="${inner}" opacity="0.9"/>`,
        )
        .join('');
    case 'round':
      return [-1, 1]
        .map(
          (dir) =>
            `<circle cx="${dir * 15}" cy="${top + 5}" r="9" fill="${earColor}"/>` +
            `<circle cx="${dir * 15}" cy="${top + 5}" r="4.6" fill="${inner}" opacity="0.85"/>`,
        )
        .join('');
    case 'big':
      return [-1, 1]
        .map(
          (dir) =>
            `<circle cx="${dir * 19}" cy="${top + 10}" r="13" fill="${earColor}"/>` +
            `<circle cx="${dir * 19}" cy="${top + 10}" r="7.6" fill="${inner}" opacity="0.9"/>`,
        )
        .join('');
    case 'drop':
      // 垂耳：从头顶两侧挂下来，内耳也垂着（狗/牛/羊靠它和圆耳兽分开）
      return [-1, 1]
        .map(
          (dir) =>
            `<ellipse cx="${dir * 20}" cy="${headCy + 6}" rx="8" ry="14" fill="${earColor}"/>` +
            `<ellipse cx="${dir * 20}" cy="${headCy + 8}" rx="4" ry="8" fill="${inner}" opacity="0.75"/>`,
        )
        .join('');
    case 'flop':
      return [-1, 1]
        .map(
          (dir) => `<path d="M${dir * 9} ${top + 5} q${dir * 13} -9 ${dir * 15} 6 q${dir * 1} 8 ${-dir * 8} 5 q${-dir * 6} -4 ${-dir * 7} -11 z" fill="${earColor}"/>`,
        )
        .join('');
    default:
      return '';
  }
}

/** 尾巴：puff 球 / stub 小尾 / wave 曲线 / bush 蓬尾 / curl 卷尾 / hair 束尾 / tuft 球棒尾 / thin / long */
function tailArt(type, bodyCy, body, inner) {
  switch (type) {
    case 'puff':
      return `<circle cx="28" cy="${bodyCy + 6}" r="8.5" fill="${inner ?? body}"/>`;
    case 'stub':
      return `<path d="M24 ${bodyCy - 2} q8 -2 8 7 q-6 3 -8 -1 z" fill="${body}"/>`;
    case 'wave':
      return `<path d="M26 ${bodyCy + 9} q14 1 13 -12" fill="none" stroke="${body}" stroke-width="5.5" stroke-linecap="round"/>`;
    case 'bush':
      return `<path d="M24 ${bodyCy + 8} q22 -2 24 12 q2 10 -10 8 q-14 -4 -16 -16 z" fill="${body}"/>`;
    case 'curl':
      return `<path d="M27 ${bodyCy + 9} q11 1 10 -7 q-1 -6 -7 -4" fill="none" stroke="${body}" stroke-width="4" stroke-linecap="round"/>`;
    case 'hair':
      return `<path d="M24 ${bodyCy} q12 4 10 20" fill="none" stroke="${body}" stroke-width="8" stroke-linecap="round"/>`;
    case 'tuft':
      return `<path d="M25 ${bodyCy + 10} q13 -1 15 -10" fill="none" stroke="${body}" stroke-width="3.4" stroke-linecap="round"/>
        <circle cx="41" cy="${bodyCy - 1}" r="5" fill="${body}"/>`;
    case 'thin':
      return `<path d="M24 ${bodyCy + 10} q18 2 20 -8" fill="none" stroke="${body}" stroke-width="2.6" stroke-linecap="round"/>`;
    case 'long':
      return `<path d="M24 ${bodyCy + 10} q18 6 24 -2 q6 -8 -4 -10" fill="none" stroke="${body}" stroke-width="6" stroke-linecap="round"/>`;
    default:
      return '';
  }
}

/**
 * 体型档：让同一套小兽模板在轮廓上就能分开。
 * 默认 round 与旧版一致（不写 build 的主体不受影响）。
 * slim = 猫狗狼狐鼠（瘦高）/ long = 马猪牛羊（长背）/ big = 熊狮象熊猫（厚身）/ tall = 长颈鹿
 */
const BEAST_BUILD = {
  round: { rx: 29, ry: 21, legH: 28, headR: 21 },
  slim: { rx: 24, ry: 23, legH: 26, headR: 20 },
  long: { rx: 35, ry: 19, legH: 26, headR: 20 },
  big: { rx: 33, ry: 24, legH: 24, headR: 23 },
  tall: { rx: 24, ry: 18, legH: 34, headR: 19 },
};

/** 腿长档：short 短腿小兽（猫狗猪羊）/ long 大长腿（马牛羊鹿） */
const BEAST_LEGS = { short: 20, long: 34 };

/**
 * 侧身画师的腿身比：腿单一律由身体短半轴 ry 推导，不写死像素。
 * 写死时马的腿身比 2.26，而正面模板最修长档 tall 也只有 1.89，
 * 绘本里马和兽类、人物同框就退化成“踩高跷”（卡片单看不明显）。
 * elephant 1.4 敦实 / horse 1.6 修长 / giraffe 2.8 长腿即身份。
 */
const SIDE_LEG_RATIO = { elephant: 1.4, horse: 1.6, giraffe: 2.8 };

/** 四足小兽：正面站立，脚底 y=0，整体高约 100（含耳朵） */
function beastArt(spec, { scale = 1.45 } = {}) {
  const body = CAST_TONES[spec.tone] ?? CAST_TONES.sand;
  const belly = CAST_TONES[spec.belly] ?? CAST_TONES.snow;
  const inner = CAST_TONES[spec.earIn] ?? belly;
  const earColor = CAST_TONES[spec.earTone] ?? body;
  const edge = castEdge(spec.tone ?? 'sand');
  const build = BEAST_BUILD[spec.build ?? 'round'];
  const legH = BEAST_LEGS[spec.legs] ?? build.legH;
  const headR = build.headR;
  const bodyCy = -(legH + build.ry - 8);
  // 长颈（长颈鹿）：头抬高一截，脖子单独补一段，否则会像普通小兽；neck: 'short' 给短脖的马
  const neck = spec.neck === true || spec.neck === 'short';
  const headCy = neck
    ? bodyCy - (spec.neck === 'short' ? 22 : 44) - headR
    : bodyCy - build.ry - headR + 8;
  const snout = spec.snout
    ? `<ellipse cx="0" cy="${headCy + 7}" rx="${spec.snoutBig ? 13 : 11}" ry="${spec.snoutBig ? 9 : 7.5}" fill="${CAST_TONES[spec.snoutTone] ?? inner}"/>
      <ellipse cx="-3.6" cy="${headCy + 7}" rx="1.9" ry="2.6" fill="${CAST_INK}"/>
      <ellipse cx="3.6" cy="${headCy + 7}" rx="1.9" ry="2.6" fill="${CAST_INK}"/>`
    : '';
  /** 口鼻区：狗/狼/狐/猫/虎/牛一块浅色吻部 + 墨色鼻头，比单改颜色更能分出“谁是谁” */
  const muzzle = spec.muzzle
    ? `<ellipse cx="0" cy="${headCy + headR * 0.4}" rx="${headR * 0.6}" ry="${headR * 0.42}" fill="${CAST_TONES[spec.muzzle]}"/>
      <path d="M-4.6 ${headCy + headR * 0.26} q4.6 4.6 9.2 0 q-4.6 3.8 -9.2 0 z" fill="${CAST_TONES[spec.noseTone] ?? CAST_INK}"/>`
    : '';
  /** 额前白斑 + 白鼻梁（马）：与鹿/驴区分的重要标识 */
  const blaze = spec.blaze
    ? `<path d="M-4.5 ${headCy - headR + 4} q-1 12 0 21 q4.5 -7 9 0 q1 -9 0 -21 z" fill="${CAST_TONES.snow}" opacity="0.92"/>`
    : '';
  /** 额前鬃毛（马）：像头发一样盖在额头上 */
  const forelock = spec.forelock
    ? `<path d="M${-headR * 0.45} ${headCy - headR + 4} q${headR * 0.45} -9 ${headR * 0.9} 0 q${-headR * 0.22} 7 ${-headR * 0.34} 13 q${-headR * 0.24} -9 ${-headR * 0.56} -13 z" fill="${CAST_TONES.cocoa}"/>`
    : '';
  const mane = spec.mane
    ? `${Array.from({ length: 12 })
        .map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return `<circle cx="${(Math.cos(a) * (headR + 7)).toFixed(1)}" cy="${(headCy + 2 + Math.sin(a) * (headR + 7)).toFixed(1)}" r="9" fill="${CAST_TONES[spec.mane] ?? CAST_TONES.amber}"/>`;
        })
        .join('')}<circle cx="0" cy="${headCy + 2}" r="${headR + 4}" fill="${CAST_TONES[spec.mane] ?? CAST_TONES.amber}"/>`
    : '';
  const wool = spec.wool
    ? [-2, -1, 0, 1, 2]
        .flatMap((row) =>
          [-1, 0, 1].map((col) => ({ x: col * 17 + (row % 2 === 0 ? 0 : 8), y: bodyCy - 12 + row * 11 })),
        )
        .filter((dot) => Math.abs(dot.x) < 31)
        .map(
          (dot) =>
            `<circle cx="${dot.x}" cy="${dot.y}" r="10.5" fill="${CAST_TONES.snow}" stroke="${TONE_DEEP.snow}" stroke-width="1" opacity="0.96"/>`,
        )
        .join('')
    : '';
  const spots = spec.spots
    ? `<ellipse cx="-10" cy="${bodyCy - 3}" rx="8" ry="6" fill="${CAST_TONES[spec.spots]}" opacity="0.7"/>
      <ellipse cx="11" cy="${bodyCy + 6}" rx="6" ry="5" fill="${CAST_TONES[spec.spots]}" opacity="0.55"/>`
    : '';
  /** 大块牛斑（奶牛）：比 spots 大两三倍，缩略图里才看得见 */
  const patches = spec.patches
    ? `<ellipse cx="-14" cy="${bodyCy - 3}" rx="13" ry="9.5" transform="rotate(-16 -14 ${bodyCy - 3})" fill="${CAST_TONES[spec.patches]}"/>
      <ellipse cx="13" cy="${bodyCy + 2}" rx="9.5" ry="7.5" fill="${CAST_TONES[spec.patches]}"/>
      <ellipse cx="${-headR + 7}" cy="${headCy + 3}" rx="7.5" ry="6.5" fill="${CAST_TONES[spec.patches]}" opacity="0.9"/>`
    : '';
  const shell = spec.shell
    ? `<ellipse cx="0" cy="${bodyCy - 2}" rx="27" ry="20" fill="${CAST_TONES[spec.shell]}"/>
      <path d="M-13 ${bodyCy - 16} q13 8 0 28 M13 ${bodyCy - 16} q-13 8 0 28" fill="none" stroke="${CAST_TONES.snow}" stroke-width="2.4" opacity="0.8"/>`
    : '';
  const horn = spec.horn
    ? `<path d="M${-headR + 5} ${headCy - headR * 0.66} q-8 -8 -3 -12 q3 6 8 7 z" fill="${CAST_TONES.cream}"
        stroke="${CAST_TONES.sand}" stroke-width="1.4"/>
      <path d="M${headR - 5} ${headCy - headR * 0.66} q8 -8 3 -12 q-3 6 -8 7 z" fill="${CAST_TONES.cream}"
        stroke="${CAST_TONES.sand}" stroke-width="1.4"/>`
    : '';
  /** 长颈鹿的小角（ossicone）：头顶两支带小球的短杆 */
  const ossicone = spec.ossicone
    ? `<path d="M-8 ${headCy - headR + 3} v-9" stroke="${CAST_TONES.cocoa}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="-8" cy="${headCy - headR - 8}" r="4.6" fill="${CAST_TONES.cocoa}"/>
      <path d="M8 ${headCy - headR + 3} v-9" stroke="${CAST_TONES.cocoa}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="8" cy="${headCy - headR - 8}" r="4.6" fill="${CAST_TONES.cocoa}"/>`
    : '';
  /** 脖子上的斑点（长颈鹿）：只有身体两块斑时，长脖子看着像根棍 */
  const neckSpots =
    spec.neckSpots && neck
      ? [0, 1, 2]
          .map(
            (i) =>
              `<ellipse cx="${i % 2 ? 3.5 : -3.5}" cy="${bodyCy - 13 - i * 13}" rx="4.8" ry="3.6" fill="${CAST_TONES[spec.neckSpots]}" opacity="0.75"/>`,
          )
          .join('')
      : '';
  /** 虎纹：三道横向弧纹（竖纹会长在身体侧边，看着像手臂上的贴纸） */
  const stripe = spec.stripe
    ? `<g stroke="${CAST_TONES.cocoa}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.85">
        <path d="M${-build.rx * 0.62} ${bodyCy - 11} q${build.rx * 0.62} 8 ${build.rx * 1.24} 0"/>
        <path d="M${-build.rx * 0.7} ${bodyCy} q${build.rx * 0.7} 8 ${build.rx * 1.4} 0"/>
        <path d="M${-build.rx * 0.56} ${bodyCy + 11} q${build.rx * 0.56} 7 ${build.rx * 1.12} 0"/>
        <path d="M${-headR - 1} ${headCy - headR * 0.55} q7 3 4 9"/><path d="M${headR + 1} ${headCy - headR * 0.55} q-7 3 -4 9"/>
      </g>`
    : '';
  /** 熊猫眼斑：两块深色圆斑，一眼认得出 */
  const patch = spec.patch
    ? `<ellipse cx="-9" cy="${headCy - 3}" rx="8" ry="10.5" transform="rotate(-14 -9 ${headCy - 3})" fill="${CAST_TONES.slate}"/>
      <ellipse cx="9" cy="${headCy - 3}" rx="8" ry="10.5" transform="rotate(14 9 ${headCy - 3})" fill="${CAST_TONES.slate}"/>`
    : '';
  /** 浅色脸盘（猴）：脸与身体不同色，猴脸才像猴脸 */
  const faceMask = spec.faceMask
    ? `<ellipse cx="0" cy="${headCy + 2}" rx="${headR * 0.8}" ry="${headR * 0.78}" fill="${CAST_TONES[spec.faceMask]}"/>`
    : '';
  /** 猫须 */
  const whiskers = spec.whiskers
    ? `<g stroke="${CAST_INK}" stroke-width="1.5" stroke-linecap="round" opacity="0.45">
        <path d="M${-headR * 0.55} ${headCy + 4} h-10"/><path d="M${-headR * 0.55} ${headCy + 9} h-9"/>
        <path d="M${headR * 0.55} ${headCy + 4} h10"/><path d="M${headR * 0.55} ${headCy + 9} h9"/></g>`
    : '';
  /** 门牙（兔/松鼠）：两颗小白牙 */
  const teeth = spec.teeth
    ? `<rect x="-4.6" y="${headCy + headR * 0.5}" width="4.2" height="6.2" rx="1.4" fill="#FFFFFF" stroke="${CAST_TONES.stone}" stroke-width="0.9"/>
      <rect x="0.4" y="${headCy + headR * 0.5}" width="4.2" height="6.2" rx="1.4" fill="#FFFFFF" stroke="${CAST_TONES.stone}" stroke-width="0.9"/>`
    : '';
  /** 项圈（狗）：最直接的身份提示 */
  const collar = spec.collar
    ? `<path d="M${-headR * 0.82} ${headCy + headR + 2} q${headR * 0.82} 8 ${headR * 1.64} 0" fill="none" stroke="${CAST_TONES[spec.collar]}" stroke-width="5.5" stroke-linecap="round"/>
      <circle cx="0" cy="${headCy + headR + 6}" r="3.6" fill="${CAST_TONES.honey}"/>`
    : '';
  /** 象牙（大象） */
  const tusks = spec.tusks
    ? `<path d="M-7 ${headCy + headR * 0.62} q-2 10 2 15 q3 -7 2 -15 z" fill="${CAST_TONES.snow}"/>
      <path d="M7 ${headCy + headR * 0.62} q2 10 -2 15 q-3 -7 -2 -15 z" fill="${CAST_TONES.snow}"/>`
    : '';
  /** 象鼻：从头下方弯下来，与两条前腿拉开一个空隙 */
  const trunk = spec.trunk
    ? `<path d="M-2 ${headCy + 13} q-10 20 2 32 q8 8 15 1" fill="none" stroke="${body}" stroke-width="11" stroke-linecap="round"/>
      <path d="M-2 ${headCy + 13} q-10 20 2 32 q8 8 15 1" fill="none" stroke="${CAST_TONES.stone}" stroke-width="2" stroke-linecap="round" opacity="0.35"/>`
    : '';
  return `<g transform="scale(${scale.toFixed(3)})">
    ${castShadow(build.rx + 3)}
    ${tailArt(spec.tail, bodyCy, body, inner)}
    <rect x="-14" y="${-legH}" width="9" height="${legH + 1}" rx="4.5" fill="${body}"${edge}/>
    <rect x="5" y="${-legH}" width="9" height="${legH + 1}" rx="4.5" fill="${body}"${edge}/>
    ${spec.socks ? `<rect x="-14" y="-11" width="9" height="12" rx="4" fill="${CAST_TONES[spec.socks]}"/><rect x="5" y="-11" width="9" height="12" rx="4" fill="${CAST_TONES[spec.socks]}"/>` : ''}
    ${spec.hoof ? `<path d="M-14 ${-7} h9 v8 h-9 z M5 ${-7} h9 v8 h-9 z" fill="${CAST_TONES[spec.hoof]}"/>` : ''}
    <ellipse cx="0" cy="${bodyCy}" rx="${build.rx}" ry="${build.ry}" fill="${body}"${edge}/>
    <ellipse cx="0" cy="${bodyCy + build.ry * 0.2}" rx="${build.rx * 0.44}" ry="${build.ry * 0.5}" fill="${belly}" opacity="0.55"/>
    <ellipse cx="0" cy="${bodyCy + build.ry - 6}" rx="${build.rx * 0.76}" ry="7" fill="${CAST_INK}" opacity="0.06"/>
    ${wool}${spots}${patches}${shell}${stripe}
    ${neck ? `<rect x="${-headR * 0.44}" y="${headCy + 8}" width="${headR * 0.88}" height="${bodyCy + 4 - (headCy + 8)}" rx="${headR * 0.44}" fill="${body}"${edge}/>` : ''}
    ${neckSpots}
    ${mane}
    <circle cx="0" cy="${headCy}" r="${headR}" fill="${body}"${edge}/>
    <ellipse cx="0" cy="${headCy + headR * 0.55}" rx="${headR * 0.55}" ry="${headR * 0.4}" fill="${belly}" opacity="0.45"/>
    ${faceMask}${blaze}${patch}${snout}${muzzle}${tusks}${trunk}
    ${castFace({ cy: headCy - 2, r: headR, mouth: !spec.snout && !spec.muzzle })}
    ${earArt(spec.ear, headCy, headR, earColor, inner)}
    ${ossicone}${horn}${forelock}${whiskers}${teeth}${collar}
  </g>`;
}

/** 乌龟：侧身拱壳 + 四足 + 探出的头（正面四足版会画成“绿色小人”） */
function turtleArt(spec, { scale = 1.45 } = {}) {
  const shell = CAST_TONES[spec.shell ?? 'fern'];
  const skin = CAST_TONES[spec.tone ?? 'leaf'];
  const skinEdge = castEdge(spec.tone ?? 'leaf');
  return `<g transform="scale(${scale.toFixed(3)})">
    ${castShadow(32)}
    <path d="M-30 -14 q-11 -5 -11 5 q8 5 12 1 z" fill="${skin}"/>
    <rect x="-26" y="-17" width="11" height="17" rx="5" fill="${skin}"${skinEdge}/>
    <rect x="13" y="-17" width="11" height="17" rx="5" fill="${skin}"${skinEdge}/>
    <ellipse cx="34" cy="-20" rx="12" ry="9.5" fill="${skin}"${skinEdge}/>
    <rect x="22" y="-25" width="10" height="13" rx="5" fill="${skin}"${skinEdge}/>
    <circle cx="38" cy="-23" r="2.2" fill="${CAST_INK}"/>
    <path d="M42 -17 q4 3 0 5" fill="none" stroke="${CAST_INK}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M-31 -14 q1 -44 31 -44 q30 0 31 44 z" fill="${shell}"${castEdge(spec.shell ?? 'fern')}/>
    <path d="M-21 -30 q21 -18 42 0" fill="none" stroke="${CAST_TONES.snow}" stroke-width="2.6" opacity="0.55"/>
    <path d="M0 -56 v42 M-15 -50 q15 24 0 36 M15 -50 q-15 24 0 36" fill="none" stroke="${CAST_TONES.snow}" stroke-width="2.2" opacity="0.4"/>
  </g>`;
}

/** 大象：大扇形耳 + 带深边的长鼻（与身体同色的鼻子会糊在肚子上，看着像灰老鼠） */
function elephantArt(spec, { scale = 1.45 } = {}) {
  const body = CAST_TONES[spec.tone ?? 'stone'];
  const deep = TONE_DEEP[spec.tone ?? 'stone'];
  const edge = castEdge(spec.tone ?? 'stone');
  const ry = 25;
  const legH = Math.round(ry * SIDE_LEG_RATIO.elephant);
  const bodyCy = -(legH + ry - 14);
  const headCy = bodyCy - 32;
  const headR = 22;
  const trunk = `M-1 ${headCy + 20} q-8 15 -1 27 q5 9 13 3 q5 -4 0 -8`;
  return `<g transform="scale(${scale.toFixed(3)})">
    ${castShadow(38)}
    <path d="M33 ${bodyCy + 2} q11 5 9 17" fill="none" stroke="${body}" stroke-width="4.5" stroke-linecap="round"/>
    <rect x="-38" y="${1 - legH}" width="13" height="${legH}" rx="6.5" fill="${deep}"/>
    <rect x="25" y="${1 - legH}" width="13" height="${legH}" rx="6.5" fill="${deep}"/>
    <rect x="-24" y="${5 - legH}" width="14" height="${legH - 4}" rx="7" fill="${body}"${edge}/>
    <rect x="10" y="${5 - legH}" width="14" height="${legH - 4}" rx="7" fill="${body}"${edge}/>
    <ellipse cx="0" cy="${bodyCy}" rx="36" ry="${ry}" fill="${body}"${edge}/>
    <ellipse cx="0" cy="${bodyCy - 6}" rx="19" ry="11" fill="${CAST_TONES.cream}" opacity="0.22"/>
    <ellipse cx="-31" cy="${headCy - 2}" rx="16" ry="21" fill="${deep}"/>
    <ellipse cx="31" cy="${headCy - 2}" rx="16" ry="21" fill="${deep}"/>
    <ellipse cx="-29" cy="${headCy - 3}" rx="9" ry="12" fill="${body}" opacity="0.5"/>
    <ellipse cx="29" cy="${headCy - 3}" rx="9" ry="12" fill="${body}" opacity="0.5"/>
    <circle cx="0" cy="${headCy}" r="${headR}" fill="${body}"${edge}/>
    <path d="${trunk}" fill="none" stroke="${deep}" stroke-width="15" stroke-linecap="round"/>
    <path d="${trunk}" fill="none" stroke="${body}" stroke-width="11" stroke-linecap="round"/>
    <path d="M-9 ${headCy + 16} q-3 9 1 13 q3 -6 1 -13 z" fill="${CAST_TONES.snow}"/>
    <path d="M9 ${headCy + 16} q3 9 -1 13 q-3 -6 -1 -13 z" fill="${CAST_TONES.snow}"/>
    <circle cx="-9" cy="${headCy - 6}" r="3" fill="${CAST_INK}"/><circle cx="9" cy="${headCy - 6}" r="3" fill="${CAST_INK}"/>
    <circle cx="-8" cy="${headCy - 7}" r="1.1" fill="#FFFDF8"/><circle cx="10" cy="${headCy - 7}" r="1.1" fill="#FFFDF8"/>
  </g>`;
}

/** 马：侧身站姿。正面模板下长脸、鬃毛、马尾都展开不了，只能画成“戴围脖的熊” */
function horseArt(spec, { scale = 1.45 } = {}) {
  const body = CAST_TONES[spec.tone ?? 'wood'];
  const mane = CAST_TONES[spec.mane ?? 'cocoa'];
  const hoof = CAST_TONES[spec.hoof ?? 'cocoa'];
  const edge = castEdge(spec.tone ?? 'wood');
  const ry = 19;
  const legH = Math.round(ry * SIDE_LEG_RATIO.horse);
  const bodyCy = -(legH + ry - 8);
  const headCy = bodyCy - 40;
  /** 腿位必须落在身体跨度（cx±rx = -36~24）内，否则外侧腿会脱离躯干变成一根浮着的柱子；
   *  前后各两条分成两组，中间露出腹部，才像四条腿而不是一排栅栏 */
  const legXs = [-31, -19, -1, 11];
  const legs = legXs
    .map(
      (x, i) =>
        `<rect x="${x}" y="${1 - legH - (i === 0 || i === 3 ? 2 : 0)}" width="10" height="${
          legH + (i === 0 || i === 3 ? 2 : 0)
        }" rx="5" fill="${body}"${edge}/>`,
    )
    .join('');
  const hooves = legXs.map((x) => `M${x} -8 h10 v9 h-10 z`).join(' ');
  return `<g transform="scale(${scale.toFixed(3)})">
    ${castShadow(36)}
    <path d="M-32 ${bodyCy - 6} q-12 12 -10 30" fill="none" stroke="${mane}" stroke-width="7" stroke-linecap="round"/>
    <path d="M-42 ${bodyCy + 24} q6 -6 2 4 q-2 4 -5 2 z" fill="${mane}"/>
    ${legs}
    <path d="${hooves}" fill="${hoof}"/>
    <ellipse cx="-6" cy="${bodyCy}" rx="30" ry="${ry}" fill="${body}"${edge}/>
    <path d="M6 ${bodyCy - 10} q13 -8 19 -21 q4 -8 11 -5 q7 3 4 11 q-5 13 -16 24 z" fill="${body}"${edge}/>
    <path d="M8 ${bodyCy - 14} q14 -9 19 -20" fill="none" stroke="${mane}" stroke-width="10" stroke-linecap="round"/>
    <ellipse cx="34" cy="${headCy}" rx="12" ry="15" transform="rotate(10 34 ${headCy})" fill="${body}"${edge}/>
    <path d="M28 ${headCy - 15} q-4 -8 2 -10 q3 4 3 8 z" fill="${body}"${edge}/>
    <path d="M43 ${headCy - 12} q6 -7 8 -2 q-2 6 -6 8 z" fill="${body}"${edge}/>
    <circle cx="37" cy="${headCy - 3}" r="2.6" fill="${CAST_INK}"/>
    <circle cx="37.9" cy="${headCy - 3.8}" r="0.9" fill="#FFFDF8"/>
    <ellipse cx="44" cy="${headCy + 5}" rx="1.6" ry="2.1" fill="${mane}" opacity="0.8"/>
    <path d="M41 ${headCy + 11} q4 1 2 4" fill="none" stroke="${CAST_INK}" stroke-width="1.6" stroke-linecap="round"/>
  </g>`;
}

/** 长颈鹿：侧身长颈，正面画只会得到一个“台灯” */
function giraffeArt(spec, { scale = 1.45 } = {}) {
  const body = CAST_TONES[spec.tone ?? 'honey'];
  const spot = CAST_TONES[spec.spots ?? 'clay'];
  const edge = castEdge(spec.tone ?? 'honey');
  const ry = 16;
  const legH = Math.round(ry * SIDE_LEG_RATIO.giraffe);
  const bodyCy = -(legH + ry - 11);
  const headCy = bodyCy - 37;
  /** 同马：腿收在身体跨度（-34~22）内并前后分组，不然最右那条会看着像旁边的木桩 */
  const legXs = [-29, -19, -3, 7];
  const legs = legXs
    .map(
      (x, i) =>
        `<rect x="${x}" y="${1 - legH - (i === 0 || i === 3 ? 2 : 0)}" width="9" height="${
          legH + (i === 0 || i === 3 ? 2 : 0)
        }" rx="4.5" fill="${body}"${edge}/>`,
    )
    .join('');
  const hooves = legXs.map((x) => `M${x} -8 h9 v9 h-9 z`).join(' ');
  return `<g transform="scale(${scale.toFixed(3)})">
    ${castShadow(32)}
    <path d="M-28 ${bodyCy - 1} q-9 10 -7 26" fill="none" stroke="${spot}" stroke-width="3" stroke-linecap="round"/>
    ${legs}
    <path d="${hooves}" fill="${CAST_TONES.cocoa}"/>
    <ellipse cx="-6" cy="${bodyCy}" rx="28" ry="${ry}" fill="${body}"${edge}/>
    <path d="M10 ${bodyCy - 9} q12 -16 18 -28 l12 3 q-8 20 -18 31 z" fill="${body}"${edge}/>
    <ellipse cx="20" cy="${bodyCy - 19}" rx="4.4" ry="3" fill="${spot}" opacity="0.8"/>
    <ellipse cx="18" cy="${bodyCy - 8}" rx="4" ry="3" fill="${spot}" opacity="0.7"/>
    <ellipse cx="28" cy="${bodyCy - 29}" rx="4.2" ry="3" fill="${spot}" opacity="0.8"/>
    <ellipse cx="-16" cy="${bodyCy - 3}" rx="8" ry="6" fill="${spot}" opacity="0.85"/>
    <ellipse cx="0" cy="${bodyCy + 5}" rx="7" ry="5.5" fill="${spot}" opacity="0.8"/>
    <ellipse cx="-6" cy="${bodyCy - 7}" rx="5.5" ry="4" fill="${spot}" opacity="0.7"/>
    <ellipse cx="44" cy="${headCy}" rx="12" ry="8.5" transform="rotate(-6 44 ${headCy})" fill="${body}"${edge}/>
    <path d="M37 ${headCy - 3} q-2 -10 1 -13" fill="none" stroke="${CAST_TONES.cocoa}" stroke-width="3.4" stroke-linecap="round"/>
    <circle cx="37.4" cy="${headCy - 18}" r="3.4" fill="${CAST_TONES.cocoa}"/>
    <path d="M45 ${headCy - 4} q-1 -9 2 -12" fill="none" stroke="${CAST_TONES.cocoa}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="46.6" cy="${headCy - 18}" r="3" fill="${CAST_TONES.cocoa}"/>
    <path d="M37 ${headCy - 10} l-6 -5 l7 -2 z" fill="${body}"${edge}/>
    <circle cx="44" cy="${headCy - 1}" r="2.3" fill="${CAST_INK}"/>
    <circle cx="55" cy="${headCy + 2}" r="1.6" fill="${CAST_INK}" opacity="0.6"/>
  </g>`;
}

/** 人物：头 + 头发/帽子 + 衣服 + 四肢，脚底 y=0，高约 100 */
function personArt(spec, { scale = 1.45 } = {}) {
  const skin = CAST_TONES[spec.skin] ?? CAST_TONES.peach;
  const hair = CAST_TONES[spec.hair] ?? CAST_TONES.cocoa;
  const cloth = CAST_TONES[spec.cloth] ?? CAST_TONES.sky;
  const headCy = -66;
  const headR = 20;
  const top = headCy - headR;
  const edge = castEdge(spec.skin ?? 'peach');
  /** 身高系数：孩子矮一点、成年人高一点，三个人物并排时不至于像“复制粘贴” */
  const grow = spec.grow ?? 1;
  /** 头发：先一层“发帽”盖住头顶，再按发型叠细节 */
  const hairCap = `<path d="M${-headR} ${headCy} a${headR} ${headR} 0 0 1 ${headR * 2} 0 q${(-headR * 0.5).toFixed(1)} ${(-headR * 0.42).toFixed(1)} ${-headR * 2} 0 z" fill="${hair}"/>`;
  const hairStyle = (() => {
    switch (spec.style) {
      case 'long':
        return hairCap;
      case 'bun':
        return `${hairCap}<circle cx="0" cy="${(top + 5).toFixed(1)}" r="8" fill="${hair}"/>`;
      case 'twin':
        return `${hairCap}
          <circle cx="${-headR - 4}" cy="${headCy + 2}" r="7" fill="${hair}"/>
          <circle cx="${headR + 4}" cy="${headCy + 2}" r="7" fill="${hair}"/>`;
      case 'spiky':
        return `${hairCap}
          ${[-1, 0, 1]
            .map(
              (i) =>
                `<path d="M${i * 8 - 4} ${(headCy - headR + 3).toFixed(1)} l4 -9 l4 9 z" fill="${hair}"/>`,
            )
            .join('')}`;
      case 'hat':
        return `<ellipse cx="0" cy="${top + 8}" rx="${headR + 11}" ry="6" fill="${CAST_TONES.wheat}"/>
          <path d="M${-headR + 2} ${top + 7} q${headR - 2} ${-headR - 2} ${headR * 2 - 4} 0 z" fill="${CAST_TONES.cream}"/>`;
      case 'cap':
        return `<path d="M${-headR - 1} ${top + 9} q${headR + 1} ${-headR - 4} ${headR * 2 + 2} 0 z" fill="${cloth}"/>
          <ellipse cx="0" cy="${top + 9}" rx="${headR + 6}" ry="4" fill="${CAST_TONES.wheat}"/>`;
      case 'hunter':
        return `<path d="M${-headR - 1} ${top + 9} q${headR + 1} ${-headR - 6} ${headR * 2 + 2} 0 z" fill="${CAST_TONES.cocoa}"/>
          <ellipse cx="0" cy="${top + 9}" rx="${headR + 4}" ry="4" fill="${CAST_TONES.cocoa}"/>`;
      default:
        return `${hairCap}
          <path d="M${-headR * 0.9} ${(headCy - headR * 0.4).toFixed(1)} q${headR * 0.3} ${headR * 0.5} ${-headR * 0.1} ${headR * 0.9}" fill="none" stroke="${hair}" stroke-width="5" stroke-linecap="round"/>`;
    }
  })();
  const hairBack =
    spec.style === 'long' || spec.style === 'twin'
      ? [-1, 1]
          .map(
            (dir) =>
              `<ellipse cx="${dir * (headR - 3)}" cy="${headCy + 10}" rx="${(headR * 0.36).toFixed(1)}" ry="${(headR * 0.95).toFixed(1)}" fill="${hair}"/>`,
          )
          .join('')
      : '';
  const beard = spec.beard
    ? `<path d="M${-headR + 4} ${headCy + 8} q${headR - 4} ${headR - 2} ${headR * 2 - 8} 0 q-3 8 -${headR - 4} 8 q-${headR - 5} 0 -${headR - 4} -8 z" fill="${CAST_TONES.snow}" opacity="0.95"/>`
    : '';
  const dress = spec.dress
    ? `<path d="M-14 -52 q14 -5 28 0 l8 32 q-22 7 -44 0 z" fill="${cloth}"${castEdge(spec.cloth ?? 'sky')}/>`
    : `<rect x="-14" y="-52" width="28" height="32" rx="10" fill="${cloth}"${castEdge(spec.cloth ?? 'sky')}/>`;
  return `<g transform="scale(${(scale * grow).toFixed(3)})">
    ${castShadow(22)}
    <rect x="-9" y="-22" width="7" height="22" rx="3.5" fill="${skin}"/>
    <rect x="2" y="-22" width="7" height="22" rx="3.5" fill="${skin}"/>
    ${dress}
    <path d="M-13 -46 q-8 10 -9 20" fill="none" stroke="${skin}" stroke-width="6" stroke-linecap="round"/>
    <path d="M13 -46 q8 10 9 20" fill="none" stroke="${skin}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="-22" cy="-24" r="4" fill="${skin}"/>
    <circle cx="22" cy="-24" r="4" fill="${skin}"/>
    ${hairBack}
    <circle cx="0" cy="${headCy}" r="${headR}" fill="${skin}"${edge}/>
    ${hairStyle}${beard}
    ${castFace({ cy: headCy + 1, r: headR, gap: 0.42 })}
  </g>`;
}

/** 鸟类：身体 + 头 + 喙 + 翅膀；duck/swan 长颈，chick/duckling 圆身小黄 */
function birdArt(spec, { scale = 1.45 } = {}) {
  const body = CAST_TONES[spec.tone] ?? CAST_TONES.snow;
  // 翅膀默认比身体深一档：白鸭/灰鸦的白翅膀在浅底上会看不见，一层深色翅把体态托出来
  const wing = CAST_TONES[spec.wing] ?? TONE_DEEP[spec.tone ?? 'snow'];
  const beak = CAST_TONES[spec.beak] ?? CAST_TONES.honey;
  const neck = spec.neck === 'long';
  const headCy = neck ? -82 : -62;
  const headR = spec.headBig || spec.tone === 'slate' ? 16.5 : 14.5;
  const bodyCy = -34;
  const neckPath = neck
    ? `<path d="M0 ${bodyCy - 10} q2 -26 -2 -44" fill="none" stroke="${body}" stroke-width="15" stroke-linecap="round"/>`
    : `<path d="M0 ${bodyCy - 8} q1 -12 -1 -18" fill="none" stroke="${body}" stroke-width="13" stroke-linecap="round"/>`;
  return `<g transform="scale(${scale.toFixed(3)})">
    ${castShadow(22)}
    <path d="M-6 -16 v15 M6 -16 v15" fill="none" stroke="${beak}" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M-18 ${bodyCy + 8} q-8 8 -6 14 q8 -2 12 -8 z" fill="${wing}"/>
    <ellipse cx="0" cy="${bodyCy}" rx="22" ry="19" fill="${body}"${castEdge(spec.tone ?? 'snow')}/>
    ${neckPath}
    <ellipse cx="-2" cy="${bodyCy + 2}" rx="12" ry="10" fill="${CAST_TONES.snow}" opacity="0.45"/>
    <path d="M4 ${bodyCy - 8} q16 3 17 15 q-3 8 -11 4 q-8 -4 -8 -10 z" fill="${wing}"/>
    <circle cx="0" cy="${headCy}" r="${headR}" fill="${body}"${castEdge(spec.tone ?? 'snow')}/>
    ${spec.crest ? `<path d="M-7 ${headCy - headR + 1} q3 -13 7 -3 q4 -11 7 1 z" fill="${CAST_TONES.rose}"/>` : ''}
    <path d="M${headR - 4} ${headCy - 1} l${spec.beakLong ? 16 : 10} 4 l${spec.beakLong ? -16 : -10} 4 z" fill="${beak}"/>
    ${castFace({ cy: headCy - 1, r: headR, gap: 0.34, mouth: false })}
  </g>`;
}

/** 鱼：身体 + 尾鳍 + 背鳍，不落地（水中悬着） */
function fishArt(spec, { scale = 1.45 } = {}) {
  const body = CAST_TONES[spec.tone] ?? CAST_TONES.sky;
  const fin = CAST_TONES[spec.fin] ?? CAST_TONES.dusk;
  return `<g transform="scale(${scale.toFixed(3)})" transform-origin="0 0">
    <g transform="translate(0 -46)">
      <path d="M20 0 q14 -10 16 -16 q2 16 -2 16 q4 2 2 16 q-6 -8 -16 -14 z" fill="${fin}"/>
      <ellipse cx="0" cy="0" rx="26" ry="17" fill="${body}"${castEdge(spec.tone ?? 'sky')}/>
      <path d="M-4 -15 q10 -9 16 -1 q-8 4 -16 1 z" fill="${fin}"/>
      <ellipse cx="-4" cy="5" rx="12" ry="8" fill="${CAST_TONES.snow}" opacity="0.5"/>
      <circle cx="-15" cy="-3" r="3.2" fill="${CAST_INK}"/>
      <path d="M-20 4 q3 3 6 1" fill="none" stroke="${CAST_INK}" stroke-width="1.5" stroke-linecap="round"/>
    </g>
  </g>`;
}

/** 青蛙：蹲姿，大眼泡在头顶 */
function frogArt(spec, { scale = 1.45 } = {}) {
  const body = CAST_TONES[spec.tone] ?? CAST_TONES.leaf;
  return `<g transform="scale(${scale.toFixed(3)})">
    ${castShadow(26)}
    <ellipse cx="0" cy="-20" rx="28" ry="20" fill="${body}"${castEdge(spec.tone ?? 'leaf')}/>
    <ellipse cx="0" cy="-14" rx="16" ry="12" fill="${CAST_TONES.snow}" opacity="0.55"/>
    <path d="M-26 -12 q-8 6 -4 12 M26 -12 q8 6 4 12" fill="none" stroke="${body}" stroke-width="7" stroke-linecap="round"/>
    <circle cx="-13" cy="-40" r="11" fill="${body}"/>
    <circle cx="13" cy="-40" r="11" fill="${body}"/>
    <circle cx="-13" cy="-41" r="5.5" fill="${CAST_TONES.snow}"/>
    <circle cx="13" cy="-41" r="5.5" fill="${CAST_TONES.snow}"/>
    <circle cx="-12" cy="-41" r="2.8" fill="${CAST_INK}"/>
    <circle cx="14" cy="-41" r="2.8" fill="${CAST_INK}"/>
    <path d="M-8 -24 q8 7 16 0" fill="none" stroke="${CAST_INK}" stroke-width="2" stroke-linecap="round"/>
  </g>`;
}

/** 昆虫：ant 三节 + 六腿 / butterfly 双对翅 / dragonfly 细身长翅 */
function bugArt(spec, { scale = 1.45 } = {}) {
  const tone = CAST_TONES[spec.tone] ?? CAST_TONES.cocoa;
  if (spec.bug === 'butterfly') {
    const wing = CAST_TONES[spec.wing] ?? CAST_TONES.blush;
    return `<g transform="scale(${scale.toFixed(3)})">
      <g transform="translate(0 -52)">
        <path d="M-2 -2 q-26 -22 -30 -4 q-2 12 16 12 q-18 4 -12 16 q8 10 26 -8 z" fill="${wing}"/>
        <path d="M2 -2 q26 -22 30 -4 q2 12 -16 12 q18 4 12 16 q-8 10 -26 -8 z" fill="${wing}"/>
        <rect x="-2.6" y="-14" width="5.2" height="30" rx="2.6" fill="${tone}"/>
        <path d="M-2 -14 q-6 -10 -10 -12 M2 -14 q6 -10 10 -12" fill="none" stroke="${tone}" stroke-width="2" stroke-linecap="round"/>
      </g>
    </g>`;
  }
  if (spec.bug === 'dragonfly') {
    const wing = CAST_TONES[spec.wing] ?? CAST_TONES.sky;
    return `<g transform="scale(${scale.toFixed(3)})">
      <g transform="translate(0 -58)">
        <ellipse cx="-16" cy="-6" rx="16" ry="5" fill="${wing}" opacity="0.85"/>
        <ellipse cx="16" cy="-6" rx="16" ry="5" fill="${wing}" opacity="0.85"/>
        <ellipse cx="-14" cy="4" rx="12" ry="4" fill="${wing}" opacity="0.7"/>
        <ellipse cx="14" cy="4" rx="12" ry="4" fill="${wing}" opacity="0.7"/>
        <ellipse cx="0" cy="6" rx="4" ry="16" fill="${tone}"/>
        <circle cx="0" cy="-12" r="6" fill="${tone}"/>
        <circle cx="-2" cy="-13" r="1.5" fill="${CAST_TONES.snow}"/>
        <circle cx="2" cy="-13" r="1.5" fill="${CAST_TONES.snow}"/>
      </g>
    </g>`;
  }
  // 蜜蜂：黄黑条纹身体 + 双翅 + 触角（同时留给卡片“bee”用）
  if (spec.bug === 'bee') {
    const wing = CAST_TONES[spec.wing] ?? CAST_TONES.sky;
    return `<g transform="scale(${scale.toFixed(3)})">
      <g transform="translate(0 -62)">
        <ellipse cx="-15" cy="-12" rx="14" ry="8" transform="rotate(-24 -15 -12)" fill="${wing}" opacity="0.85"/>
        <ellipse cx="15" cy="-12" rx="14" ry="8" transform="rotate(24 15 -12)" fill="${wing}" opacity="0.85"/>
        <ellipse cx="0" cy="0" rx="21" ry="16" fill="${tone}"${castEdge(spec.tone ?? 'honey')}/>
        <path d="M-9 -14 v28 M1 -16 v32 M11 -14 v28" stroke="${CAST_INK}" stroke-width="4" opacity="0.7" stroke-linecap="round"/>
        <path d="M-5 -6 q5 4 10 0" fill="none" stroke="${CAST_INK}" stroke-width="2" stroke-linecap="round"/>
        <path d="M-4 -16 q-6 -9 -13 -11 M4 -16 q6 -9 13 -11" fill="none" stroke="${tone}" stroke-width="2" stroke-linecap="round"/>
      </g>
    </g>`;
  }
  // 蚂蚁：三节身体（腹/胸/头）+ 六条折腿 + 触角；腿要挂在胸部，否则会像一根“棕色小棍”
  return `<g transform="scale(${scale.toFixed(3)})">
    ${castShadow(20)}
    <g stroke="${tone}" stroke-width="2.6" stroke-linecap="round" fill="none">
      <path d="M-8 -40 l-14 -6 l-4 12"/><path d="M-8 -34 l-16 2 l-2 12"/><path d="M-8 -28 l-12 10 l2 10"/>
      <path d="M8 -40 l14 -6 l4 12"/><path d="M8 -34 l16 2 l2 12"/><path d="M8 -28 l12 10 l-2 10"/>
    </g>
    <ellipse cx="0" cy="-24" rx="15" ry="12" fill="${tone}"${castEdge(spec.tone ?? 'cocoa')}/>
    <ellipse cx="0" cy="-43" rx="9" ry="8" fill="${tone}"${castEdge(spec.tone ?? 'cocoa')}/>
    <circle cx="0" cy="-58" r="10" fill="${tone}"${castEdge(spec.tone ?? 'cocoa')}/>
    <path d="M-4 -66 q-6 -8 -12 -10 M4 -66 q6 -8 12 -10" fill="none" stroke="${tone}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="-3.4" cy="-59" r="2" fill="${CAST_TONES.snow}"/>
    <circle cx="3.4" cy="-59" r="2" fill="${CAST_TONES.snow}"/>
    <path d="M-3 -53 q3 3 6 0" fill="none" stroke="${CAST_INK}" stroke-width="1.4" stroke-linecap="round"/>
  </g>`;
}


/** 植物：草 / 花 / 树 / 种子 / 嫩芽 / 叶子 / 西兰花 / 萝卜 / 果实，脚底 y=0 */
function plantArt(spec, { scale = 1.45 } = {}) {
  const tone = CAST_TONES[spec.tone] ?? CAST_TONES.fern;
  const leaf = CAST_TONES[spec.leaf] ?? CAST_TONES.leaf;
  const wrap = (body) => `<g transform="scale(${scale.toFixed(3)})">${castShadow(18)}${body}</g>`;
  switch (spec.shape) {
    case 'grass':
      return wrap(
        [-2, -1, 0, 1, 2]
          .map(
            (i) =>
              `<path d="M${i * 7} 0 q${i * 4} ${-24 - Math.abs(i) * 7} ${i * 6} ${-30 - Math.abs(i) * 8}" fill="none" stroke="${i === 0 ? leaf : tone}" stroke-width="5.5" stroke-linecap="round"/>`,
          )
          .join(''),
      );
    case 'flower':
      return wrap(`<path d="M0 0 v-34" stroke="${leaf}" stroke-width="5" stroke-linecap="round"/>
        <path d="M-2 -14 q-12 -8 -16 -2 q8 8 16 6" fill="${leaf}"/>
        ${[0, 1, 2, 3, 4]
          .map((i) => {
            const a = (i / 5) * Math.PI * 2;
            return `<ellipse cx="${(Math.cos(a) * 11).toFixed(1)}" cy="${(-44 + Math.sin(a) * 11).toFixed(1)}" rx="9" ry="8" fill="${tone}"/>`;
          })
          .join('')}
        <circle cx="0" cy="-44" r="6.5" fill="${CAST_TONES.cream}"/>`);
    case 'tree':
      return wrap(`<path d="M0 0 v-42" stroke="${CAST_TONES.soilDeep}" stroke-width="9" stroke-linecap="round"/>
        <circle cx="0" cy="-58" r="26" fill="${tone}"/>
        <circle cx="-19" cy="-44" r="17" fill="${leaf}"/>
        <circle cx="19" cy="-46" r="15" fill="${leaf}"/>`);
    case 'sprout':
      return wrap(`<ellipse cx="0" cy="-3" rx="20" ry="5" fill="${CAST_TONES.soil}"/>
        <path d="M0 -3 v-24" stroke="${leaf}" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M0 -22 q-16 -4 -18 -14 q14 -2 18 10 z" fill="${tone}"/>
        <path d="M0 -26 q16 -6 18 -16 q-14 -2 -18 10 z" fill="${leaf}"/>`);
    case 'seed':
      return wrap(`<ellipse cx="0" cy="-4" rx="22" ry="6" fill="${CAST_TONES.soil}"/>
        <ellipse cx="0" cy="-20" rx="13" ry="17" fill="${tone}"/>
        <ellipse cx="-4" cy="-26" rx="4" ry="6" fill="${CAST_TONES.cream}" opacity="0.7"/>`);
    case 'leaves':
      return wrap(`<path d="M0 0 q-6 -20 4 -34" stroke="${CAST_TONES.soilDeep}" stroke-width="3" fill="none"/>
        <path d="M2 -22 q-18 -6 -20 -18 q16 -2 20 12 z" fill="${tone}"/>
        <path d="M4 -30 q18 -8 20 -20 q-18 0 -20 14 z" fill="${leaf}"/>`);
    case 'broccoli':
      return wrap(`<path d="M0 0 v-24" stroke="${CAST_TONES.leaf}" stroke-width="12" stroke-linecap="round"/>
        <circle cx="0" cy="-42" r="18" fill="${tone}"/>
        <circle cx="-15" cy="-34" r="12" fill="${leaf}"/>
        <circle cx="15" cy="-36" r="11" fill="${leaf}"/>`);
    case 'radish':
      return wrap(`<path d="M0 -30 q-14 -14 -6 -26 q10 4 8 22 z" fill="${CAST_TONES.leaf}"/>
        <path d="M0 -30 q14 -16 8 -28 q-12 6 -10 24 z" fill="${CAST_TONES.fern}"/>
        <path d="M0 -30 q18 10 8 26 q-10 12 -18 0 q-8 -14 10 -26 z" fill="${tone}"/>
        <ellipse cx="0" cy="-12" rx="13" ry="7" fill="#FFFFFF" opacity="0.55"/>`);
    case 'banana':
      return wrap(`<path d="M-16 -26 q6 30 34 24 q6 -2 2 -8 q-22 2 -26 -18 q-1 -6 -10 2 z" fill="${tone}"/>
        <path d="M-14 -24 q8 24 30 20" fill="none" stroke="${CAST_TONES.cream}" stroke-width="2.4" opacity="0.7"/>`);
    case 'papaya':
      return wrap(`<ellipse cx="0" cy="-24" rx="14" ry="20" fill="${tone}"/>
        <path d="M0 -44 q-4 -8 2 -12" fill="none" stroke="${CAST_TONES.leaf}" stroke-width="3.4" stroke-linecap="round"/>
        <ellipse cx="-4" cy="-32" rx="4" ry="8" fill="#FFFFFF" opacity="0.35"/>`);
    default:
      return wrap(`<circle cx="0" cy="-24" r="20" fill="${tone}"/>`);
  }
}

/** 天空/天气：统一悬在天上（内部 -170 偏移），不落地 */
function skyArt(spec, { scale = 1.45 } = {}) {
  const tone = CAST_TONES[spec.tone] ?? CAST_TONES.amber;
  const lift = `<g transform="translate(0 -170) scale(${scale.toFixed(3)})">`;
  switch (spec.shape) {
    case 'sun':
      return `${lift}${Array.from({ length: 8 })
        .map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return `<path d="M${(Math.cos(a) * 24).toFixed(1)} ${(Math.sin(a) * 24).toFixed(1)} L${(Math.cos(a) * 33).toFixed(1)} ${(Math.sin(a) * 33).toFixed(1)}" stroke="${tone}" stroke-width="5" stroke-linecap="round"/>`;
        })
        .join('')}<circle cx="0" cy="0" r="20" fill="${tone}"/><circle cx="-6" cy="-6" r="5" fill="#FFFFFF" opacity="0.45"/></g>`;
    case 'moon':
      return `${lift}<path d="M8 -24 a24 24 0 1 0 0 48 a19 19 0 1 1 0 -48 z" fill="${tone}" stroke="${TONE_DEEP[spec.tone ?? 'cream']}" stroke-width="1.6"/>
        <circle cx="-8" cy="-6" r="3" fill="${CAST_TONES.wheat}" opacity="0.6"/>
        <circle cx="-4" cy="10" r="2.2" fill="${CAST_TONES.wheat}" opacity="0.5"/></g>`;
    case 'star':
      return `${lift}<path d="M0 -26 l7 16 l18 2 l-13 12 l4 18 l-16 -9 l-16 9 l4 -18 l-13 -12 l18 -2 z" fill="${tone}"/></g>`;
    case 'cloud':
      return `${lift}<g fill="#FFFFFF" opacity="0.96"><circle cx="-14" cy="2" r="14"/><circle cx="6" cy="-4" r="18"/><circle cx="22" cy="4" r="12"/><rect x="-14" y="2" width="36" height="14" rx="7"/></g></g>`;
    case 'rain':
      return `${lift}<g fill="#FFFFFF" opacity="0.96"><circle cx="-12" cy="-4" r="13"/><circle cx="6" cy="-10" r="16"/><circle cx="20" cy="-2" r="11"/><rect x="-12" y="-4" width="32" height="13" rx="6"/></g>
        ${[-8, 4, 16]
          .map((x, i) => `<path d="M${x} ${18 + i * 2} l-4 12" stroke="${tone}" stroke-width="3.4" stroke-linecap="round"/>`)
          .join('')}</g>`;
    case 'snowflake':
      // 先画一层淡灰底再叠白：落在浅天/夜里都不至于“消失”（卡片与雪景共用）
      return `${lift}${[0, 60, 120]
        .map((deg) => `<g transform="rotate(${deg})"><path d="M0 -24 L0 24" stroke="${CAST_TONES.stone}" stroke-width="7" stroke-linecap="round" opacity="0.4"/><path d="M0 -24 L0 24" stroke="${CAST_TONES.snow}" stroke-width="4" stroke-linecap="round"/><path d="M0 -18 l-6 -6 M0 -18 l6 -6" stroke="${CAST_TONES.snow}" stroke-width="3" stroke-linecap="round"/></g>`)
        .join('')}</g>`;
    case 'snowman':
      return `<g transform="scale(${scale.toFixed(3)})">${castShadow(28)}
        <circle cx="0" cy="-20" r="22" fill="${CAST_TONES.snow}"/>
        <circle cx="0" cy="-54" r="17" fill="${CAST_TONES.snow}"/>
        <circle cx="0" cy="-82" r="13" fill="${CAST_TONES.snow}"/>
        <path d="M-11 -92 h22" stroke="${CAST_TONES.slate}" stroke-width="5" stroke-linecap="round"/>
        <path d="M-9 -95 h18 v-9 h-18 z" fill="${CAST_TONES.slate}"/>
        <path d="M0 -82 l10 3 l-10 3 z" fill="${tone}"/>
        <path d="M-13 -66 q13 5 26 0" fill="none" stroke="${tone}" stroke-width="4"/>
        <circle cx="-4" cy="-85" r="1.8" fill="${CAST_INK}"/><circle cx="4" cy="-85" r="1.8" fill="${CAST_INK}"/></g>`;
    case 'fire':
      // 火：木柴 + 三层火苗（单层橙火苗在雪地上会被看成“橙色水滴”）
      return `<g transform="scale(${scale.toFixed(3)})">
        ${castShadow(22)}
        <path d="M-22 -2 l44 6 M-22 4 l44 -6" stroke="${CAST_TONES.brown}" stroke-width="6" stroke-linecap="round"/>
        <path d="M0 0 q-18 -10 -15 -28 q3 -12 11 -16 q-2 12 5 14 q-2 -19 9 -26 q12 14 9 30 q-2 21 -19 26 z" fill="${tone}"/>
        <path d="M0 -4 q-9 -8 -7 -19 q3 -7 8 -10 q0 12 5 14 q2 -9 7 -14 q5 12 3 21 q-3 9 -11 10 z" fill="${CAST_TONES.amber}"/>
        <path d="M0 -8 q-4 -6 -3 -12 q2 -4 5 -5 q0 7 3 8 q1 -5 4 -8 q3 7 1 12 q-2 5 -6 5 z" fill="#FFF1C9" opacity="0.85"/></g>`;
    case 'water':
      return `<g transform="scale(${scale.toFixed(3)})">${castShadow(14)}
        <path d="M0 -46 q16 18 16 27 a16 16 0 0 1 -32 0 q0 -9 16 -27 z" fill="${tone}"/>
        <ellipse cx="-5" cy="-16" rx="4" ry="6" fill="#FFFFFF" opacity="0.6"/></g>`;
    default:
      return `${lift}<circle cx="0" cy="0" r="20" fill="${tone}"/></g>`;
  }
}

/** 物件：建筑 / 球 / 书 / 容器 / 衣物 / 工具 / 桶 / 车 / 木石，均落地 */
function thingArt(spec, { scale = 1.45 } = {}) {
  const tone = CAST_TONES[spec.tone] ?? CAST_TONES.stone;
  const wrap = (body, shadow = 20) => `<g transform="scale(${scale.toFixed(3)})">${castShadow(shadow)}${body}</g>`;
  switch (spec.shape) {
    case 'house':
      return wrap(`<path d="M-28 0 V-38 h56 V0 z" fill="${CAST_TONES.cream}"/>
        <path d="M-34 -36 L0 -64 L34 -36 Z" fill="${tone}"/>
        <rect x="-8" y="-22" width="16" height="22" rx="3" fill="${CAST_TONES.brown}"/>
        <rect x="-24" y="-30" width="12" height="11" rx="2" fill="${CAST_TONES.sky}"/>
        <rect x="12" y="-30" width="12" height="11" rx="2" fill="${CAST_TONES.sky}"/>`);
    case 'castle':
      return wrap(`<path d="M-30 0 V-44 h60 V0 z" fill="${tone}"/>
        <path d="M-30 -44 h8 v-12 h8 v12 h8 v-12 h8 v12 h8 v-12 h8 v12 h4 v-8 h8 v8 h-60 z" fill="${CAST_TONES.lilac}"/>
        <rect x="-7" y="-22" width="14" height="22" rx="7" fill="${CAST_TONES.dusk}"/>`);
    case 'school':
      return wrap(`<rect x="-30" y="-40" width="60" height="40" rx="4" fill="${CAST_TONES.cream}"/>
        <path d="M-36 -38 L0 -62 L36 -38 Z" fill="${tone}"/>
        ${[-18, 0, 18].map((x) => `<rect x="${x - 5}" y="-32" width="10" height="9" rx="2" fill="${CAST_TONES.sky}"/>`).join('')}
        <rect x="-7" y="-20" width="14" height="20" rx="2" fill="${CAST_TONES.brown}"/>`);
    case 'ball':
      return wrap(`<circle cx="0" cy="-18" r="18" fill="${tone}"/>
        <path d="M-18 -22 q18 8 36 0 M0 -36 q6 18 0 36" fill="none" stroke="#FFFFFF" stroke-width="3.2" opacity="0.8"/>`);
    case 'blocks':
      return wrap(`<rect x="-30" y="-18" width="26" height="18" rx="4" fill="${tone}"/>
        <rect x="2" y="-18" width="26" height="18" rx="4" fill="${CAST_TONES.rose}"/>
        <rect x="-14" y="-38" width="26" height="18" rx="4" fill="${CAST_TONES.leaf}"/>`);
    case 'book':
      return wrap(`<rect x="-24" y="-34" width="46" height="34" rx="4" fill="${tone}"/>
        <rect x="-24" y="-34" width="7" height="34" rx="3" fill="${CAST_TONES.dusk}"/>
        <path d="M-12 -26 h24 M-12 -18 h18" stroke="#FFFFFF" stroke-width="2.6" opacity="0.85" stroke-linecap="round"/>`);
    case 'dish':
      return wrap(`<path d="M-24 -14 h48 l-6 14 h-36 z" fill="${tone}"/>
        <ellipse cx="0" cy="-14" rx="24" ry="6" fill="${CAST_TONES.cream}"/>
        <circle cx="-6" cy="-20" r="8" fill="${CAST_TONES.rose}"/>
        <circle cx="8" cy="-18" r="6" fill="${CAST_TONES.leaf}"/>`);
    case 'cloth':
      // T 恤：领口 + 短袖 + 衣身，孩子能看出这是“衣服”
      return wrap(`<path d="M-19 -34 q0 -7 7 -7 h9 l3 6 l3 -6 h9 q7 0 7 7 l5 12 l-10 4 v18 h-28 v-18 l-10 -4 z" fill="${tone}"${castEdge(spec.tone ?? 'sky')}/>
        <path d="M-9 -40 q9 8 18 0" fill="none" stroke="${CAST_TONES.snow}" stroke-width="3" opacity="0.75"/>`);
    case 'tool':
      return wrap(`<path d="M-4 0 V-30" stroke="${CAST_TONES.brown}" stroke-width="6" stroke-linecap="round"/>
        <rect x="-14" y="-44" width="28" height="14" rx="6" fill="${tone}"/>`);
    case 'bin':
      return wrap(`<path d="M-18 0 h36 l-4 -34 h-28 z" fill="${tone}"/>
        <rect x="-22" y="-38" width="44" height="6" rx="3" fill="${CAST_TONES.slate}"/>`);
    case 'bottle':
      // 瓶颈 + 瓶身 + 瓶底积着的石子，与「乌鸦喝水」对得上
      return wrap(`<path d="M-13 0 q-3 0 -3 -7 v-24 q0 -5 4 -7 v-9 h24 v9 q4 2 4 7 v24 q0 7 -3 7 z" fill="${tone}" opacity="0.92"/>
        <rect x="-6" y="-53" width="12" height="7" rx="2.5" fill="${CAST_TONES.slate}"/>
        <path d="M-12 -13 h24 v6 q0 7 -3 7 h-18 q-3 0 -3 -7 z" fill="${CAST_TONES.stone}"/>
        <ellipse cx="-3" cy="-15" rx="3.2" ry="2.4" fill="${CAST_TONES.stone}"/>
        <ellipse cx="4" cy="-17" rx="2.6" ry="2" fill="${CAST_TONES.slate}"/>
        <rect x="-7" y="-32" width="5" height="13" rx="2.5" fill="#FFFFFF" opacity="0.42"/>`);
    case 'car':
      return wrap(`<path d="M-30 0 V-14 q0 -4 4 -5 l8 -9 q2 -3 6 -3 h22 q4 0 6 3 l7 9 q4 1 4 5 V0 z" fill="${tone}"/>
        <circle cx="-16" cy="0" r="6" fill="${CAST_TONES.slate}"/><circle cx="16" cy="0" r="6" fill="${CAST_TONES.slate}"/>
        <rect x="-14" y="-26" width="12" height="9" rx="2" fill="${CAST_TONES.sky}"/><rect x="2" y="-26" width="12" height="9" rx="2" fill="${CAST_TONES.sky}"/>`);
    case 'log':
      return wrap(`<rect x="-24" y="-22" width="48" height="22" rx="6" fill="${tone}"/>
        <ellipse cx="24" cy="-11" rx="6" ry="11" fill="${CAST_TONES.cream}"/>`);
    case 'brick':
      // 砖砌小屋：主体是“砖房子”而不是一堆砖块，与小猪的建筑故事对得上
      return wrap(`<path d="M-30 0 V-38 H30 V0 Z" fill="${tone}"/>
        <g stroke="${CAST_TONES.cream}" stroke-width="2" opacity="0.7">
          <path d="M-30 -12.7 H30 M-30 -25.3 H30"/>
          <path d="M-20 -38 V-25.3 M0 -38 V-25.3 M20 -38 V-25.3"/>
          <path d="M-10 -25.3 V-12.7 M10 -25.3 V-12.7"/>
          <path d="M-20 -12.7 V0 M0 -12.7 V0 M20 -12.7 V0"/>
        </g>
        <path d="M-36 -36 L0 -66 L36 -36 Z" fill="${CAST_TONES.cocoa}"/>
        <rect x="-8" y="-18" width="16" height="18" rx="3" fill="${CAST_TONES.cream}"/>
        <circle cx="5" cy="-9" r="1.6" fill="${CAST_TONES.cocoa}"/>`);
    case 'stone':
      return wrap(`<path d="M-20 0 q-4 -14 6 -18 q8 -8 16 -2 q12 2 12 12 q0 8 -10 8 z" fill="${tone}"/>
        <path d="M-8 -12 q6 -4 10 0" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.5"/>`);
    case 'cake':
      return wrap(`<path d="M-22 0 h44 v-16 q-22 -6 -44 0 z" fill="${CAST_TONES.cream}"/>
        <path d="M-22 -16 q22 -7 44 0 v-10 q-22 -7 -44 0 z" fill="${tone}"/>
        <path d="M-22 -26 q22 -7 44 0 v-6 q-22 -7 -44 0 z" fill="${CAST_TONES.blush}"/>
        <path d="M0 -32 v-10" stroke="${CAST_TONES.honey}" stroke-width="3" stroke-linecap="round"/>
        <path d="M0 -44 q4 -4 0 -7 q-4 3 0 7 z" fill="${CAST_TONES.amber}"/>`);
    case 'cup':
      return wrap(`<path d="M-14 0 h28 l-3 -30 h-22 z" fill="${tone}"/>
        <ellipse cx="0" cy="-30" rx="11" ry="4" fill="${CAST_TONES.cream}"/>
        <path d="M14 -24 q10 2 8 10 q-2 6 -9 4" fill="none" stroke="${tone}" stroke-width="4" stroke-linecap="round"/>
        <path d="M-5 -34 q3 -8 0 -14" fill="none" stroke="${CAST_TONES.snow}" stroke-width="2.6" stroke-linecap="round" opacity="0.9"/>`);
    case 'bowl':
      return wrap(`<path d="M-22 -16 h44 q-2 16 -22 16 q-20 0 -22 -16 z" fill="${tone}"${castEdge(spec.tone ?? 'sand')}/>
        <ellipse cx="0" cy="-16" rx="22" ry="6" fill="${CAST_TONES.snow}"/>
        <ellipse cx="0" cy="-19" rx="15" ry="4" fill="${CAST_TONES.cream}"/>`);
    case 'spoon':
      return wrap(`<path d="M0 0 v-26" stroke="${CAST_TONES.stone}" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="0" cy="-34" rx="8" ry="11" fill="${CAST_TONES.stone}"/>
        <ellipse cx="0" cy="-34" rx="4.6" ry="7" fill="${CAST_TONES.snow}" opacity="0.55"/>`);
    case 'soap':
      return wrap(`<rect x="-20" y="-20" width="40" height="20" rx="8" fill="${tone}"/>
        <rect x="-14" y="-17" width="28" height="8" rx="4" fill="#FFFFFF" opacity="0.55"/>
        <circle cx="-16" cy="-28" r="4.4" fill="#FFFFFF" opacity="0.8"/>
        <circle cx="4" cy="-33" r="5.4" fill="#FFFFFF" opacity="0.7"/>
        <circle cx="16" cy="-26" r="3.4" fill="#FFFFFF" opacity="0.75"/>`);
    case 'tooth':
      return wrap(`<path d="M-14 -6 q-4 -24 8 -26 q6 -3 6 4 q0 -7 6 -4 q12 2 8 26 q-2 10 -6 8 q-4 -2 -4 -10 q0 -6 -4 -6 q-4 0 -4 6 q0 8 -4 10 q-4 2 -6 -8 z" fill="${CAST_TONES.snow}"/>
        <path d="M-6 -20 q4 -4 8 -2" fill="none" stroke="${CAST_TONES.stone}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>`);
    case 'brush':
      // 牙刷：柄 + 斜向刷头 + 蓝色刷毛（白刷头在浅底上会“消失”）
      return wrap(`<g transform="rotate(-12 0 -28)">
        <rect x="-7" y="-34" width="14" height="34" rx="7" fill="${tone}"${castEdge(spec.tone ?? 'sky')}/>
        <rect x="-9" y="-56" width="18" height="24" rx="7" fill="${CAST_TONES.snow}"${castEdge('snow')}/>
        ${[-4, 0, 4].map((x) => `<path d="M${x} -56 v-8" stroke="${CAST_TONES.sky}" stroke-width="3.4" stroke-linecap="round"/>`).join('')}
        <path d="M-4 -40 h8" stroke="${CAST_TONES.snow}" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
      </g>`);
    case 'shoes':
      // 鞋子：鞋面 + 鞋口 + 鞋带 + 鞋底（之前像一顶鸭舌帽）
      return wrap(`<path d="M-30 -10 q-2 -14 8 -14 q8 0 10 8 q4 10 16 12 q10 1 10 6 q0 4 -8 4 h-30 q-8 0 -6 -16 z" fill="${tone}"${castEdge(spec.tone ?? 'coral')}/>
        <path d="M-30 -3 h58 q4 0 4 -3 q0 -3 -5 -3 h-54 q-4 0 -3 6 z" fill="${CAST_TONES.slate}"/>
        <path d="M-18 -16 l9 -5 M-13 -11 l9 -5 M-8 -6 l9 -5" stroke="${CAST_TONES.snow}" stroke-width="2.8" stroke-linecap="round"/>
        <path d="M-24 -20 q6 -2 8 4" fill="none" stroke="${CAST_TONES.snow}" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>`);
    case 'potty':
      // 小马桶：水箱 + 座圈 + 桶身（只有一个白盆会被看成碗）
      return wrap(`<rect x="-16" y="-58" width="32" height="22" rx="6" fill="${CAST_TONES.sky}"${castEdge('sky')}/>
        <rect x="-9" y="-52" width="18" height="5" rx="2.5" fill="${CAST_TONES.snow}" opacity="0.9"/>
        <path d="M-20 -36 h40 q4 0 4 4 q0 8 -6 10 q-4 22 -18 22 q-16 0 -18 -22 q-6 -2 -6 -10 q0 -4 4 -4 z" fill="${tone}"${castEdge(spec.tone ?? 'snow')}/>
        <ellipse cx="0" cy="-36" rx="20" ry="6.5" fill="${CAST_TONES.snow}"/>
        <ellipse cx="0" cy="-36" rx="12" ry="4" fill="${CAST_TONES.sky}" opacity="0.6"/>`);
    case 'pot':
      return wrap(`<path d="M-20 -26 h40 q0 26 -20 26 q-20 0 -20 -26 z" fill="${tone}"/>
        <ellipse cx="0" cy="-26" rx="20" ry="6" fill="${CAST_TONES.stone}"/>
        <path d="M-12 -40 q4 -8 0 -12 M12 -40 q4 -8 0 -12" fill="none" stroke="${CAST_TONES.snow}" stroke-width="3" stroke-linecap="round" opacity="0.85"/>`);
    case 'bag':
      // 双肩包：包体 + 手提环 + 背带 + 前袋 + 拉链
      return wrap(`<path d="M-18 0 h36 q6 0 6 -26 q0 -15 -15 -15 h-18 q-15 0 -15 15 q0 26 6 26 z" fill="${tone}"${castEdge(spec.tone ?? 'coral')}/>
        <path d="M-6 -40 q0 -11 6 -11 q6 0 6 11" fill="none" stroke="${CAST_TONES.brown}" stroke-width="4" stroke-linecap="round"/>
        <path d="M-17 -25 h34" stroke="${CAST_TONES.brown}" stroke-width="3" opacity="0.45"/>
        <rect x="-10" y="-21" width="20" height="13" rx="4" fill="${CAST_TONES.cream}" opacity="0.9"/>
        <path d="M-7 -6 v4 M7 -6 v4" stroke="${CAST_TONES.brown}" stroke-width="4" stroke-linecap="round" opacity="0.55"/>`);
    case 'towel':
      // 毛巾：横杆 + 下宽上窄的垂布 + 两道折痕 + 底边白条（上方两道白条会看成箱子盖）
      return wrap(`<path d="M-28 -47 h56" stroke="${CAST_TONES.stone}" stroke-width="4.5" stroke-linecap="round"/>
        <circle cx="-28" cy="-47" r="3" fill="${CAST_TONES.stone}"/><circle cx="28" cy="-47" r="3" fill="${CAST_TONES.stone}"/>
        <path d="M-19 -45 h38 l4 33 q-6 4 -12 1 q-7 -4 -13 0 q-6 3 -12 1 z" fill="${tone}"${castEdge(spec.tone ?? 'mint')}/>
        <path d="M-8 -43 v30 M8 -43 v30" stroke="${TONE_DEEP.mint}" stroke-width="2.2" opacity="0.45"/>
        <path d="M-18 -22 h40" stroke="${CAST_TONES.snow}" stroke-width="4" opacity="0.8"/>
        <path d="M-19 -45 q9.5 5 19 0 q9.5 -5 19 0" fill="none" stroke="${CAST_TONES.snow}" stroke-width="2.4" opacity="0.6"/>`);
    case 'clock':
      // 闹钟：表盘 + 表圈 + 两个铃 + 指针 + 底座
      return wrap(`<circle cx="0" cy="-32" r="25" fill="${CAST_TONES.snow}"${castEdge('slate')}/>
        <circle cx="0" cy="-32" r="25" fill="none" stroke="${tone}" stroke-width="5"/>
        <path d="M-13 -53 l-6 -9 M13 -53 l6 -9" stroke="${tone}" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M0 -32 v-14 M0 -32 l10 6" stroke="${CAST_INK}" stroke-width="2.8" stroke-linecap="round"/>
        <circle cx="0" cy="-32" r="2.6" fill="${CAST_INK}"/>
        <path d="M-9 -1 v-7 h18 v7 z" fill="${tone}"${castEdge(spec.tone ?? 'slate')} opacity="0.9"/>`);
    case 'lamp':
      return wrap(`<path d="M0 0 v-14" stroke="${CAST_TONES.slate}" stroke-width="4"/>
        <ellipse cx="0" cy="0" rx="12" ry="4" fill="${CAST_TONES.slate}"/>
        <path d="M-16 -14 h32 l-6 -20 h-20 z" fill="${tone}"/>
        <circle cx="0" cy="-16" r="7" fill="${CAST_TONES.cream}"/>
        <circle cx="0" cy="-16" r="13" fill="${CAST_TONES.cream}" opacity="0.35"/>`);
    case 'teddy':
      return wrap(`<circle cx="-13" cy="-52" r="8" fill="${tone}"/>
        <circle cx="13" cy="-52" r="8" fill="${tone}"/>
        <ellipse cx="0" cy="-18" rx="18" ry="19" fill="${tone}"/>
        <ellipse cx="0" cy="-18" rx="10" ry="11" fill="${CAST_TONES.cream}" opacity="0.8"/>
        <circle cx="0" cy="-44" r="15" fill="${tone}"/>
        <circle cx="-5" cy="-46" r="2" fill="${CAST_INK}"/><circle cx="5" cy="-46" r="2" fill="${CAST_INK}"/>
        <ellipse cx="0" cy="-40" rx="6" ry="4.6" fill="${CAST_TONES.cream}"/>
        <ellipse cx="-16" cy="-6" rx="7" ry="6" fill="${tone}"/>
        <ellipse cx="16" cy="-6" rx="7" ry="6" fill="${tone}"/>`);
    case 'meat':
      return wrap(`<path d="M-22 -18 q6 -14 22 -12 q18 2 20 14 q2 10 -12 12 q-20 3 -26 -4 q-6 -6 -4 -10 z" fill="${tone}"/>
        <circle cx="-2" cy="-12" r="6" fill="${CAST_TONES.snow}" opacity="0.85"/>
        <path d="M6 0 v-6 q4 -4 8 0" fill="none" stroke="${CAST_TONES.cream}" stroke-width="5" stroke-linecap="round"/>`);
    case 'axe':
      // 斧头：斜靠的木柄 + 挂在柄头的斧刃（竖直刀片会看着像小旗子）
      return wrap(`<path d="M14 0 L-12 -54" stroke="${CAST_TONES.brown}" stroke-width="7" stroke-linecap="round"/>
        <path d="M-10 -58 L-36 -50 Q-42 -40 -36 -26 L-8 -34 Z" fill="${tone}"${castEdge(spec.tone ?? 'stone')}/>
        <path d="M-33 -47 Q-38 -40 -33 -30" fill="none" stroke="${CAST_TONES.snow}" stroke-width="3.6" stroke-linecap="round" opacity="0.6"/>`);
    case 'umbrella':
      return wrap(`<path d="M0 -30 v26 q0 6 6 6" fill="none" stroke="${CAST_TONES.brown}" stroke-width="4" stroke-linecap="round"/>
        <path d="M-30 -30 q30 -26 60 0 q-15 -6 -30 0 q-15 -6 -30 0 z" fill="${tone}"/>
        <circle cx="0" cy="-34" r="2.6" fill="${CAST_TONES.brown}"/>`);
    case 'chair':
      return wrap(`<rect x="-22" y="-58" width="44" height="30" rx="7" fill="${tone}"${castEdge(spec.tone ?? 'sky')}/>
        <rect x="-26" y="-30" width="52" height="9" rx="4" fill="${CAST_TONES.wood}"${castEdge('brown')}/>
        <path d="M-20 -22 v22 M20 -22 v22" stroke="${CAST_TONES.brown}" stroke-width="5" stroke-linecap="round"/>`);
    case 'table':
      return wrap(`<rect x="-34" y="-40" width="68" height="9" rx="4" fill="${tone}"${castEdge(spec.tone ?? 'wheat')}/>
        <path d="M-26 -31 v31 M26 -31 v31" stroke="${CAST_TONES.brown}" stroke-width="5.5" stroke-linecap="round"/>
        <path d="M-26 -14 h52" stroke="${CAST_TONES.brown}" stroke-width="3" opacity="0.6"/>`);
    case 'hat':
      return wrap(`<ellipse cx="0" cy="-18" rx="34" ry="9" fill="${tone}"${castEdge(spec.tone ?? 'slate')}/>
        <path d="M-19 -20 q0 -26 19 -26 q19 0 19 26 z" fill="${tone}"${castEdge(spec.tone ?? 'slate')}/>
        <path d="M-19 -30 h38" stroke="${CAST_TONES.rose}" stroke-width="5" opacity="0.85"/>`);
    case 'key':
      return wrap(`<circle cx="0" cy="-56" r="14" fill="none" stroke="${tone}" stroke-width="7"/>
        <circle cx="0" cy="-56" r="6" fill="${tone}" opacity="0.55"/>
        <path d="M0 -42 v42" stroke="${tone}" stroke-width="7" stroke-linecap="round"/>
        <path d="M0 -14 h14 v10 h-14 M0 -2 h10" fill="none" stroke="${tone}" stroke-width="6" stroke-linecap="round"/>`);
    case 'slide':
      // 滑梯：立柱 + 横杆梯 + 弧形滑道，不再是“三根细线”
      return wrap(`<path d="M-30 0 v-46 M-30 -46 h15" fill="none" stroke="${CAST_TONES.stone}" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M-30 -38 h15 M-30 -28 h15 M-30 -18 h15" fill="none" stroke="${CAST_TONES.stone}" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
        <path d="M-15 -46 q30 5 34 36" fill="none" stroke="${tone}" stroke-width="11" stroke-linecap="round"/>
        <path d="M-15 -46 q30 5 34 36" fill="none" stroke="${CAST_TONES.snow}" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
        <rect x="-22" y="-56" width="17" height="11" rx="3.5" fill="${CAST_TONES.rose}"/>`);
    case 'road':
      return wrap(`<path d="M-30 0 V-12 q0 -22 30 -32 q30 10 30 32 V0 z" fill="${CAST_TONES.slate}"/>
        ${[-6, 0, 6]
          .map((x) => `<rect x="${x - 2}" y="${-38 + Math.abs(x)}" width="4" height="8" rx="2" fill="${CAST_TONES.snow}" opacity="0.9"/>`)
          .join('')}`);
    case 'traffic':
      // 红绿灯：灯箱 + 三灯（红亮/黄绿暗）+ 立柱 + 底座
      return wrap(`<rect x="-11" y="-64" width="22" height="50" rx="8" fill="${CAST_TONES.slate}"${castEdge('slate')}/>
        <circle cx="0" cy="-53" r="5.4" fill="${CAST_TONES.rose}"/>
        <circle cx="0" cy="-39" r="5.4" fill="${CAST_TONES.amber}" opacity="0.4"/>
        <circle cx="0" cy="-25" r="5.4" fill="${CAST_TONES.leaf}" opacity="0.4"/>
        <circle cx="0" cy="-53" r="9" fill="${CAST_TONES.rose}" opacity="0.22"/>
        <rect x="-3.4" y="-16" width="6.8" height="14" rx="3" fill="${CAST_TONES.slate}"/>
        <ellipse cx="0" cy="0" rx="13" ry="4.5" fill="${CAST_TONES.slate}"/>
        <ellipse cx="0" cy="0" rx="13" ry="4.5" fill="${CAST_INK}" opacity="0.08"/>`);
    case 'hands':
      // 两只手：四指平行 + 拇指 + 圆掌 + 腕部 + 泡泡；手指画成实心胶囊（细线会整根消失）
      return wrap(`${[-22, 22]
        .map((cx) => {
          const fingers = [
            { x: cx - 17, top: -46 },
            { x: cx - 9, top: -50 },
            { x: cx - 1, top: -49 },
            { x: cx + 7, top: -44 },
          ]
            .map(
              (f) =>
                `<rect x="${f.x}" y="${f.top}" width="7.4" height="${-30 - f.top}" rx="3.7" fill="${CAST_TONES.peach}"${castEdge('peach', 1.6)}/>`,
            )
            .join('');
          return `${fingers}<ellipse cx="${cx - 21}" cy="-24" rx="6" ry="4.6" transform="rotate(-28 ${cx - 21} -24)" fill="${CAST_TONES.peach}"${castEdge('peach', 1.6)}/>
            <ellipse cx="${cx}" cy="-20" rx="19" ry="15" fill="${CAST_TONES.peach}"${castEdge('peach')}/>
            <rect x="${cx - 9}" y="-8" width="18" height="9" rx="4.5" fill="${CAST_TONES.peach}"${castEdge('peach')}/>`;
        })
        .join('')}
        <circle cx="-4" cy="-52" r="4.6" fill="#FFFFFF" opacity="0.9"/>
        <circle cx="9" cy="-58" r="3.2" fill="#FFFFFF" opacity="0.8"/>
        <circle cx="-22" cy="-60" r="2.6" fill="#FFFFFF" opacity="0.7"/>`);
    case 'drawing':
      // 画架：三条木腿 + 斜画板 + 涂鸦纸（平放的米色方块看着像纸箱）
      return wrap(`<path d="M-15 0 L0 -40 L15 0" fill="none" stroke="${CAST_TONES.brown}" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M0 -40 v-16" stroke="${CAST_TONES.brown}" stroke-width="4" stroke-linecap="round"/>
        <g transform="rotate(-4 0 -40)">
          <rect x="-25" y="-66" width="50" height="36" rx="3" fill="${CAST_TONES.cream}"${castEdge('cream')}/>
          <path d="M-17 -52 q8 -12 16 0 q8 10 14 0" fill="none" stroke="${CAST_TONES.coral}" stroke-width="3.6" stroke-linecap="round"/>
          <circle cx="-15" cy="-60" r="3.6" fill="${CAST_TONES.amber}"/>
          <path d="M10 -44 h10 v-9 h-10 z" fill="${CAST_TONES.leaf}"/>
        </g>
        <path d="M-26 -28 h52" stroke="${CAST_TONES.brown}" stroke-width="4.5" stroke-linecap="round"/>`);
    default:
      return wrap(`<rect x="-20" y="-36" width="40" height="36" rx="10" fill="${tone}"/>`);
  }
}

/**
 * 果子 / 蔬菜 / 吃的：脚底 y=0，高约 96。
 * 与故事主体共用色板、同色深边、落地阴影，所以和故事图是同一套画风。
 */
function produceArt(spec, { scale = 1.45 } = {}) {
  const tone = CAST_TONES[spec.tone] ?? CAST_TONES.coral;
  const leaf = CAST_TONES[spec.leaf ?? 'leaf'];
  const deep = castEdge(spec.tone ?? 'coral');
  const wrap = (body, shadow = 24) => `<g transform="scale(${scale.toFixed(3)})">${castShadow(shadow)}${body}</g>`;
  switch (spec.produce) {
    case 'apple':
      return wrap(`<ellipse cx="0" cy="-30" rx="26" ry="26" fill="${tone}"${deep}/>
        <path d="M0 -54 q0 -10 6 -14" fill="none" stroke="${CAST_TONES.brown}" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="15" cy="-62" rx="10" ry="6" transform="rotate(-20 15 -62)" fill="${leaf}"/>
        <ellipse cx="-9" cy="-38" rx="6" ry="9" transform="rotate(-18 -9 -38)" fill="#FFFFFF" opacity="0.42"/>`);
    case 'orange':
      return wrap(`<circle cx="0" cy="-30" r="26" fill="${tone}"${deep}/>
        <circle cx="0" cy="-56" r="4" fill="${leaf}"/>
        <ellipse cx="8" cy="-33" rx="12" ry="10" fill="#FFFFFF" opacity="0.25"/>`);
    case 'watermelon':
      return wrap(`<path d="M-32 0 A32 32 0 0 1 32 0 Z" fill="${CAST_TONES.fern}"${deep}/>
        <path d="M-26 0 A26 26 0 0 1 26 0 Z" fill="${tone}"/>
        ${[-15, -7, 1, 9, 17].map((x, i) => `<ellipse cx="${x}" cy="${-10 - Math.abs(i - 2) * 6}" rx="2.2" ry="3.4" fill="${CAST_INK}" opacity="0.6"/>`).join('')}`);
    case 'grape':
      return wrap(`<path d="M0 -60 q-2 -10 6 -14" fill="none" stroke="${CAST_TONES.brown}" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="14" cy="-70" rx="10" ry="5" transform="rotate(-16 14 -70)" fill="${leaf}"/>
        ${[[-15, -44], [0, -48], [15, -44], [-8, -30], [8, -30], [0, -16]].map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="11" fill="${tone}"${deep}/>`).join('')}`);
    case 'pear':
      return wrap(`<path d="M0 -2 q-22 -2 -22 -20 q0 -14 13 -18 q-3 -14 9 -14 q12 0 9 14 q13 4 13 18 q0 18 -22 20 z" fill="${tone}"${deep}/>
        <path d="M0 -56 q0 -8 5 -10" fill="none" stroke="${CAST_TONES.brown}" stroke-width="3.6" stroke-linecap="round"/>
        <ellipse cx="-9" cy="-30" rx="5" ry="9" fill="#FFFFFF" opacity="0.35"/>`);
    case 'peach':
      return wrap(`<circle cx="0" cy="-30" r="26" fill="${tone}"${deep}/>
        <path d="M0 -54 q-5 22 0 48" fill="none" stroke="${CAST_TONES.rose}" stroke-width="3" opacity="0.55"/>
        <ellipse cx="12" cy="-58" rx="11" ry="6" transform="rotate(-24 12 -58)" fill="${leaf}"/>`);
    case 'lemon':
      return wrap(`<g transform="rotate(-8 0 -28)">
        <ellipse cx="0" cy="-28" rx="24" ry="21" fill="${tone}"${deep}/>
        <path d="M-25 -32 l-7 -5 v10 z M25 -32 l7 -5 v10 z" fill="${tone}"/>
        <ellipse cx="-8" cy="-34" rx="8" ry="6" fill="#FFFFFF" opacity="0.35"/></g>`, 22);
    case 'pineapple':
      return wrap(`<path d="M-7 -58 q-16 -16 -8 -32 q8 14 10 30 z M0 -60 v-34 q6 16 4 34 z M7 -58 q16 -16 8 -32 q-8 14 -10 30 z" fill="${leaf}"/>
        <rect x="-22" y="-58" width="44" height="58" rx="16" fill="${tone}"${deep}/>
        <g stroke="${CAST_TONES.honey}" stroke-width="2.2" opacity="0.8">
          <path d="M-20 -44 l40 16 M-20 -28 l40 16 M-20 -44 l40 -16 M-20 -28 l40 -16"/>
        </g>`);
    case 'cherry':
      return wrap(`<path d="M-13 -30 q4 -18 13 -26 M13 -30 q-4 -18 -13 -26" fill="none" stroke="${CAST_TONES.fern}" stroke-width="3.4" stroke-linecap="round"/>
        <ellipse cx="0" cy="-62" rx="11" ry="5" transform="rotate(-14)" fill="${leaf}"/>
        <circle cx="-13" cy="-16" r="13" fill="${tone}"${deep}/>
        <circle cx="14" cy="-14" r="12" fill="${tone}"${deep}/>`);
    case 'mango':
      return wrap(`<ellipse cx="0" cy="-30" rx="26" ry="23" transform="rotate(-10 0 -30)" fill="${tone}"${deep}/>
        <path d="M4 -52 q2 -10 9 -12" fill="none" stroke="${CAST_TONES.brown}" stroke-width="3.6" stroke-linecap="round"/>
        <ellipse cx="14" cy="-60" rx="9" ry="5" transform="rotate(-20 14 -60)" fill="${leaf}"/>`);
    case 'coconut':
      return wrap(`<circle cx="0" cy="-28" r="26" fill="${CAST_TONES.brown}"${deep}/>
        <ellipse cx="0" cy="-28" rx="17" ry="15" fill="${CAST_TONES.cream}"/>
        <circle cx="-6" cy="-30" r="2.6" fill="${CAST_TONES.brown}"/>
        <circle cx="6" cy="-30" r="2.6" fill="${CAST_TONES.brown}"/>`);
    case 'kiwi':
      return wrap(`<circle cx="0" cy="-30" r="27" fill="${CAST_TONES.clay}"${deep}/>
        <circle cx="0" cy="-30" r="21" fill="${CAST_TONES.leaf}"/>
        <circle cx="0" cy="-30" r="6" fill="${CAST_TONES.cream}"/>
        ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = (i / 8) * Math.PI * 2; return `<circle cx="${(Math.cos(a) * 13).toFixed(1)}" cy="${(-30 + Math.sin(a) * 13).toFixed(1)}" r="2" fill="${CAST_INK}" opacity="0.7"/>`; }).join('')}`);
    case 'blueberry':
      return wrap(`${[[-13, -18, 13], [13, -16, 12], [0, -38, 13]].map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" fill="${tone}"${deep}/><path d="M${p[0] - 3} ${p[1] - p[2] + 2} h6" stroke="${CAST_TONES.dusk}" stroke-width="2.4" stroke-linecap="round"/>`).join('')}`);
    case 'avocado':
      return wrap(`<path d="M0 -4 q-24 -4 -24 -30 q0 -18 11 -26 q-3 -22 13 -22 q16 0 13 22 q11 8 11 26 q0 26 -24 30 z" fill="${tone}"${deep}/>
        <circle cx="0" cy="-38" r="15" fill="${CAST_TONES.brown}"/>
        <circle cx="-5" cy="-43" r="4.6" fill="#FFFFFF" opacity="0.35"/>`);
    case 'strawberry':
      return wrap(`<path d="M0 -4 q-27 -8 -25 -28 q2 -18 25 -18 q23 0 25 18 q2 20 -25 28 z" fill="${tone}"${deep}/>
        ${[[-11, -28], [10, -30], [0, -18], [-6, -42], [8, -44]].map((p) => `<ellipse cx="${p[0]}" cy="${p[1]}" rx="1.8" ry="2.6" fill="${CAST_TONES.cream}"/>`).join('')}
        <path d="M0 -50 l-16 -6 l12 8 l-16 2 l16 6 l-8 8 z" fill="${leaf}"/>`);
    case 'tomato':
      return wrap(`<circle cx="0" cy="-28" r="26" fill="${tone}"${deep}/>
        <path d="M0 -54 l-12 -8 l4 12 l-12 4 l20 4 l20 -4 l-12 -4 l4 -12 z" fill="${leaf}"/>
        <ellipse cx="-9" cy="-34" rx="7" ry="10" fill="#FFFFFF" opacity="0.32"/>`);
    case 'carrot':
      return wrap(`<path d="M-9 -50 h18 q3 28 -9 50 q-12 -22 -9 -50 z" fill="${tone}"${deep}/>
        <path d="M-6 -50 q-12 -12 -16 -22 M0 -50 v-24 M6 -50 q12 -12 16 -22" fill="none" stroke="${leaf}" stroke-width="5" stroke-linecap="round"/>
        <path d="M-4 -34 h8 M-3 -24 h6" stroke="${CAST_TONES.coral}" stroke-width="2" opacity="0.5"/>`);
    case 'cucumber':
      return wrap(`<g transform="rotate(8 0 -28)">
        <rect x="-11" y="-56" width="22" height="54" rx="11" fill="${tone}"${deep}/>
        ${[[-3, -46], [4, -38], [-4, -28], [3, -20]].map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="1.6" fill="${CAST_TONES.fern}" opacity="0.8"/>`).join('')}</g>`);
    case 'potato':
      return wrap(`<path d="M-26 -18 q0 -20 14 -22 q10 -6 20 2 q14 4 12 20 q2 16 -14 16 q-18 4 -32 -16 z" fill="${tone}"${deep}/>
        <circle cx="-8" cy="-20" r="2" fill="${CAST_TONES.brown}"/>
        <circle cx="6" cy="-12" r="2" fill="${CAST_TONES.brown}"/>
        <circle cx="14" cy="-24" r="1.8" fill="${CAST_TONES.brown}"/>`);
    case 'cabbage':
      return wrap(`<circle cx="-14" cy="-24" r="19" fill="${CAST_TONES.leaf}"${deep}/>
        <circle cx="14" cy="-24" r="19" fill="${CAST_TONES.leaf}"${deep}/>
        <circle cx="0" cy="-36" r="21" fill="${tone}"${deep}/>
        <path d="M0 -56 q-4 18 0 34 M-10 -52 q-6 14 -4 26" fill="none" stroke="${CAST_TONES.mint}" stroke-width="2.4" opacity="0.7"/>`);
    case 'corn':
      return wrap(`<path d="M-12 -44 q-16 6 -16 26 q10 -4 16 -12 z" fill="${leaf}"/>
        <rect x="-13" y="-62" width="26" height="60" rx="13" fill="${tone}"${deep}/>
        ${[[-5, -54], [5, -54], [-5, -44], [5, -44], [-5, -34], [5, -34], [0, -24]].map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="2.4" fill="${CAST_TONES.honey}"/>`).join('')}`);
    case 'eggplant':
      return wrap(`<ellipse cx="0" cy="-30" rx="19" ry="28" fill="${tone}"${deep}/>
        <path d="M0 -56 q-10 -6 -8 -16 q8 2 10 12 q2 -10 10 -12 q2 10 -8 16 z" fill="${leaf}"/>
        <ellipse cx="-7" cy="-36" rx="4" ry="9" fill="#FFFFFF" opacity="0.25"/>`);
    case 'mushroom':
      return wrap(`<rect x="-9" y="-30" width="18" height="30" rx="8" fill="${CAST_TONES.cream}"${castEdge('cream')}/>
        <path d="M-28 -30 q4 -30 28 -30 q24 0 28 30 z" fill="${tone}"${deep}/>
        <circle cx="-11" cy="-42" r="3.4" fill="#FFFFFF" opacity="0.75"/>
        <circle cx="8" cy="-48" r="2.6" fill="#FFFFFF" opacity="0.75"/>`);
    case 'pumpkin':
      return wrap(`<ellipse cx="-16" cy="-26" rx="18" ry="24" fill="${tone}"${deep}/>
        <ellipse cx="16" cy="-26" rx="18" ry="24" fill="${tone}"${deep}/>
        <ellipse cx="0" cy="-26" rx="20" ry="25" fill="${tone}"${deep}/>
        <path d="M0 -50 q0 -10 6 -12" fill="none" stroke="${CAST_TONES.fern}" stroke-width="5" stroke-linecap="round"/>`);
    case 'pepper':
      return wrap(`<path d="M-16 -40 q-8 26 4 36 q8 8 14 -2 q10 -14 6 -34 z" fill="${tone}"${deep}/>
        <path d="M-2 -46 q0 -10 6 -12" fill="none" stroke="${CAST_TONES.fern}" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="-6" cy="-26" rx="3.4" ry="8" fill="#FFFFFF" opacity="0.3"/>`);
    case 'onion':
      return wrap(`<path d="M0 -2 q-23 -6 -21 -26 q2 -20 21 -24 q19 4 21 24 q2 20 -21 26 z" fill="${tone}"${deep}/>
        <path d="M-6 -50 q-4 -14 -10 -18 M0 -52 v-18 M6 -50 q4 -14 10 -18" fill="none" stroke="${leaf}" stroke-width="3" stroke-linecap="round"/>
        <path d="M-14 -34 q14 8 28 0 M-12 -22 q12 7 24 0" fill="none" stroke="${CAST_TONES.lilac}" stroke-width="2" opacity="0.6"/>`);
    case 'garlic':
      return wrap(`<path d="M0 -4 q-20 -6 -18 -24 q2 -18 18 -20 q16 2 18 20 q2 18 -18 24 z" fill="${CAST_TONES.snow}"${castEdge('snow')}/>
        <path d="M-6 -34 q6 10 0 28 M6 -34 q-6 10 0 28" fill="none" stroke="${CAST_TONES.stone}" stroke-width="2" opacity="0.7"/>
        <path d="M0 -48 q-2 -8 2 -12" fill="none" stroke="${CAST_TONES.sand}" stroke-width="3.2" stroke-linecap="round"/>`);
    case 'bread':
      return wrap(`<path d="M-28 -6 q-4 -34 28 -34 q32 0 28 34 z" fill="${CAST_TONES.honey}"${castEdge('honey')}/>
        <path d="M-14 -28 l8 -6 M0 -30 l8 -6 M14 -28 l8 -6" stroke="${CAST_TONES.wheat}" stroke-width="3" stroke-linecap="round"/>`);
    case 'egg':
      return wrap(`<path d="M-26 -8 q-8 -12 4 -18 q10 4 14 -2 q10 -10 22 0 q12 8 6 20 z" fill="${CAST_TONES.snow}"${castEdge('snow')}/>
        <circle cx="2" cy="-16" r="9" fill="${tone}"${deep}/>
        <circle cx="-1" cy="-19" r="3" fill="#FFFFFF" opacity="0.5"/>`);
    case 'noodles':
      return wrap(`<path d="M-28 -22 h56 q-6 22 -28 22 q-22 0 -28 -22 z" fill="${CAST_TONES.snow}"${castEdge('snow')}/>
        <ellipse cx="0" cy="-22" rx="28" ry="7" fill="${CAST_TONES.stone}"/>
        ${[-14, -6, 2, 10].map((x) => `<path d="M${x} -24 q4 -14 -2 -20" fill="none" stroke="${CAST_TONES.honey}" stroke-width="3.4" stroke-linecap="round"/>`).join('')}
        <path d="M-28 -22 h56" stroke="${CAST_TONES.stone}" stroke-width="3"/>`);
    case 'milk':
      return wrap(`<path d="M-16 -8 h32 v-32 l-6 -10 v-12 h-20 v12 l-6 10 z" fill="${CAST_TONES.snow}"${castEdge('snow')}/>
        <path d="M-16 -34 h32 v-14 h-32 z" fill="${tone}"${deep}/>
        <path d="M-8 -22 h16" stroke="${CAST_TONES.stone}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`);
    case 'juice':
      return wrap(`<path d="M-15 -10 h30 l-4 -34 h-22 z" fill="${tone}"${deep}/>
        <ellipse cx="0" cy="-44" rx="11" ry="3.6" fill="${CAST_TONES.cream}"/>
        <path d="M6 -44 l8 -26" stroke="${CAST_TONES.rose}" stroke-width="3.6" stroke-linecap="round"/>`);
    case 'soup':
      return wrap(`<path d="M-26 -20 h52 q-4 20 -26 20 q-22 0 -26 -20 z" fill="${tone}"${deep}/>
        <ellipse cx="0" cy="-20" rx="26" ry="6" fill="${CAST_TONES.cream}"/>
        <path d="M-12 -34 q4 -10 0 -16 M2 -36 q4 -10 0 -16 M14 -34 q4 -10 0 -16" fill="none" stroke="${CAST_TONES.snow}" stroke-width="3" stroke-linecap="round" opacity="0.85"/>`);
    case 'candy':
      return wrap(`<circle cx="0" cy="-26" r="17" fill="${tone}"${deep}/>
        <path d="M-16 -30 l-16 -10 v28 l16 -10 z M16 -30 l16 -10 v28 l-16 -10 z" fill="${CAST_TONES.blush}"/>
        <path d="M-8 -32 q8 -6 16 0" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.7"/>`);
    case 'fishDish':
      return wrap(`<ellipse cx="0" cy="-8" rx="32" ry="8" fill="${CAST_TONES.snow}"${castEdge('snow')}/>
        <ellipse cx="0" cy="-14" rx="22" ry="12" fill="${tone}"${deep}/>
        <path d="M16 -14 q10 -6 12 -10 q2 10 -2 10 q4 0 2 10 q-6 -6 -12 -10 z" fill="${CAST_TONES.coral}"/>
        <circle cx="-11" cy="-16" r="2.2" fill="${CAST_INK}"/>`);
    default:
      return wrap(`<circle cx="0" cy="-26" r="24" fill="${tone}"${deep}/>`);
  }
}

/** 车船飞机：统一“车身 + 窗 + 轮”，只换颜色与车顶配件，保证 16 张同一套画风 */
function rideArt(spec, { scale = 1.45 } = {}) {
  const tone = CAST_TONES[spec.tone] ?? CAST_TONES.coral;
  const glass = CAST_TONES[spec.glass ?? 'sky'];
  const deep = castEdge(spec.tone ?? 'coral');
  const wrap = (body, shadow = 34) => `<g transform="scale(${scale.toFixed(3)})">${castShadow(shadow)}${body}</g>`;
  const wheel = (x, r = 9) => `<circle cx="${x}" cy="${-r}" r="${r}" fill="${CAST_TONES.slate}"/><circle cx="${x}" cy="${-r}" r="${(r * 0.42).toFixed(1)}" fill="${CAST_TONES.snow}"/>`;
  const bodyCar = (fill, st = deep) => `<path d="M-38 0 v-12 q0 -5 5 -7 l7 -10 q2 -3 6 -3 h40 q4 0 6 3 l7 10 q5 2 5 7 V0 z" fill="${fill}"${st}/>`;
  switch (spec.ride) {
    case 'car':
      return wrap(`${bodyCar(tone)}${wheel(-22)}${wheel(22)}
        <rect x="-13" y="-29" width="12" height="9" rx="2" fill="${glass}"/>
        <rect x="2" y="-29" width="13" height="9" rx="2" fill="${glass}"/>`);
    case 'taxi':
      return wrap(`${bodyCar(tone)}${wheel(-22)}${wheel(22)}
        <rect x="-9" y="-38" width="18" height="7" rx="2" fill="${CAST_TONES.amber}"${castEdge('amber')}/>
        <rect x="-13" y="-29" width="26" height="9" rx="2" fill="${glass}"/>`);
    case 'police':
      return wrap(`${bodyCar(CAST_TONES.snow, castEdge('snow'))}${wheel(-22)}${wheel(22)}
        <rect x="-38" y="-16" width="76" height="9" fill="${CAST_TONES.sky}" opacity="0.85"/>
        <rect x="-10" y="-38" width="9" height="6" rx="2" fill="${CAST_TONES.sky}"/>
        <rect x="1" y="-38" width="9" height="6" rx="2" fill="${CAST_TONES.rose}"/>
        <rect x="-13" y="-29" width="26" height="9" rx="2" fill="${glass}"/>`);
    case 'ambulance':
      return wrap(`${bodyCar(CAST_TONES.snow, castEdge('snow'))}${wheel(-22)}${wheel(22)}
        <path d="M-2 -30 h8 v6 h6 v8 h-6 v6 h-8 v-6 h-6 v-8 h6 z" fill="${CAST_TONES.rose}"/>
        <rect x="-10" y="-38" width="20" height="6" rx="2" fill="${CAST_TONES.rose}"/>
        <rect x="-30" y="-29" width="14" height="9" rx="2" fill="${glass}"/>`);
    case 'fire':
      return wrap(`${bodyCar(tone)}${wheel(-22)}${wheel(22)}
        <path d="M-30 -32 h48 v-5 h-48 z" fill="${CAST_TONES.stone}"/>
        <path d="M-28 -37 h20 M-8 -37 h20" stroke="${CAST_TONES.snow}" stroke-width="2.6"/>
        <rect x="-13" y="-29" width="26" height="9" rx="2" fill="${glass}"/>
        <rect x="-9" y="-42" width="12" height="5" rx="2" fill="${CAST_TONES.rose}"/>`);
    case 'truck':
      return wrap(`<rect x="-38" y="-34" width="44" height="28" rx="4" fill="${CAST_TONES.stone}"${castEdge('stone')}/>
        <path d="M6 0 v-24 q0 -4 4 -5 h16 q4 1 5 5 l4 8 q3 2 3 6 V0 z" fill="${tone}"${deep}/>
        <rect x="16" y="-24" width="12" height="9" rx="2" fill="${glass}"/>
        ${wheel(-24)}${wheel(20)}`);
    case 'bus':
      return wrap(`<rect x="-34" y="-46" width="68" height="46" rx="9" fill="${tone}"${deep}/>
        <rect x="-27" y="-38" width="15" height="12" rx="3" fill="${glass}"/>
        <rect x="-8" y="-38" width="15" height="12" rx="3" fill="${glass}"/>
        <rect x="11" y="-38" width="15" height="12" rx="3" fill="${glass}"/>
        <rect x="-27" y="-20" width="54" height="8" rx="3" fill="${CAST_TONES.cream}" opacity="0.7"/>
        ${wheel(-20)}${wheel(20)}`);
    case 'train':
      return wrap(`<path d="M-34 0 v-34 q0 -4 4 -4 h22 q4 0 5 4 l3 10 h24 q4 0 4 4 v20 z" fill="${tone}"${deep}/>
        <rect x="10" y="-52" width="26" height="20" rx="5" fill="${tone}"${deep}/>
        <rect x="-26" y="-30" width="14" height="12" rx="3" fill="${glass}"/>
        <rect x="-8" y="-30" width="14" height="12" rx="3" fill="${glass}"/>
        <rect x="14" y="-46" width="16" height="11" rx="3" fill="${glass}"/>
        <path d="M-24 -38 v-10 h10 v10 z" fill="${CAST_TONES.slate}"/>
        <circle cx="-18" cy="-54" r="5" fill="${CAST_TONES.snow}" opacity="0.85"/>
        ${wheel(-22, 8)}${wheel(-2, 8)}${wheel(20, 8)}`);
    case 'subway':
      return wrap(`<rect x="-36" y="-44" width="72" height="44" rx="12" fill="${tone}"${deep}/>
        <path d="M-36 -32 h72" stroke="${CAST_TONES.cream}" stroke-width="4" opacity="0.8"/>
        <rect x="-28" y="-38" width="16" height="12" rx="4" fill="${glass}"/>
        <rect x="-6" y="-38" width="16" height="12" rx="4" fill="${glass}"/>
        <rect x="16" y="-38" width="16" height="12" rx="4" fill="${glass}"/>
        ${wheel(-22)}${wheel(22)}`);
    case 'plane':
      return wrap(`<path d="M-40 -28 q10 -10 26 -10 h34 q16 0 18 12 q2 12 -16 12 h-36 q-16 0 -26 -14 z" fill="${tone}"${deep}/>
        <path d="M-8 -20 l-24 -20 h14 l26 18 z" fill="${CAST_TONES.stone}"/>
        <path d="M-6 -6 l-22 16 h14 l24 -14 z" fill="${CAST_TONES.stone}"/>
        <path d="M30 -26 l14 -12 v14 z" fill="${CAST_TONES.stone}"/>
        <circle cx="-20" cy="-20" r="4" fill="${glass}"/>
        <circle cx="-6" cy="-20" r="4" fill="${glass}"/>
        <circle cx="8" cy="-20" r="4" fill="${glass}"/>`);
    case 'rocket':
      return wrap(`<path d="M-16 0 v-36 q0 -26 16 -40 q16 14 16 40 V0 z" fill="${CAST_TONES.snow}"${castEdge('snow')}/>
        <path d="M-16 -34 q-14 6 -14 22 h14 z M16 -34 q14 6 14 22 h-14 z" fill="${tone}"${deep}/>
        <circle cx="0" cy="-46" r="9" fill="${glass}"/>
        <circle cx="0" cy="-46" r="5" fill="${CAST_TONES.dusk}"/>
        <path d="M-8 0 q8 18 16 0 q-4 -8 -8 -8 q-4 0 -8 8 z" fill="${CAST_TONES.amber}"/>`);
    case 'helicopter':
      return wrap(`<ellipse cx="-2" cy="-26" rx="26" ry="20" fill="${tone}"${deep}/>
        <path d="M22 -30 h26" stroke="${CAST_TONES.stone}" stroke-width="6" stroke-linecap="round"/>
        <path d="M44 -40 v20" stroke="${CAST_TONES.stone}" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="-2" cy="-54" rx="40" ry="4" fill="${CAST_TONES.stone}"/>
        <circle cx="-6" cy="-28" r="7" fill="${glass}"/>
        <path d="M-22 0 h40" stroke="${CAST_TONES.slate}" stroke-width="4" stroke-linecap="round"/>`);
    case 'ship':
      return wrap(`<path d="M-40 0 h80 l-9 -20 h-62 z" fill="${CAST_TONES.slate}"${castEdge('slate')}/>
        <path d="M-36 -6 h72" stroke="${CAST_TONES.cream}" stroke-width="3.6" opacity="0.8"/>
        <rect x="-22" y="-42" width="38" height="22" rx="5" fill="${tone}"${deep}/>
        <rect x="-15" y="-36" width="10" height="9" rx="2" fill="${glass}"/>
        <rect x="1" y="-36" width="10" height="9" rx="2" fill="${glass}"/>
        <path d="M16 -42 v-12 h9 v12 z" fill="${CAST_TONES.rose}"/>
        <circle cx="-6" cy="-10" r="2.4" fill="${CAST_TONES.cream}"/><circle cx="6" cy="-10" r="2.4" fill="${CAST_TONES.cream}"/>`);
    case 'boat':
      return wrap(`<path d="M-32 0 h64 l-8 -14 h-48 z" fill="${CAST_TONES.wood}"${castEdge('brown')}/>
        <path d="M0 -14 v-40" stroke="${CAST_TONES.brown}" stroke-width="4" stroke-linecap="round"/>
        <path d="M3 -52 l26 30 h-26 z" fill="${tone}"${deep}/>
        <path d="M-3 -46 l-16 22 h16 z" fill="${CAST_TONES.cream}"/>`);
    case 'bicycle':
      return wrap(`<circle cx="-22" cy="-16" r="16" fill="none" stroke="${CAST_TONES.slate}" stroke-width="5"/>
        <circle cx="24" cy="-16" r="16" fill="none" stroke="${CAST_TONES.slate}" stroke-width="5"/>
        <path d="M-22 -16 l14 -18 h14 l18 18 M-8 -34 h16 M8 -34 l-16 18" fill="none" stroke="${tone}" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M-8 -38 h12" stroke="${CAST_TONES.brown}" stroke-width="5" stroke-linecap="round"/>
        <path d="M22 -36 h12" stroke="${CAST_TONES.brown}" stroke-width="4" stroke-linecap="round"/>`);
    case 'motorcycle':
      return wrap(`<circle cx="-24" cy="-14" r="14" fill="${CAST_TONES.slate}"/><circle cx="-24" cy="-14" r="6" fill="${CAST_TONES.snow}"/>
        <circle cx="24" cy="-14" r="14" fill="${CAST_TONES.slate}"/><circle cx="24" cy="-14" r="6" fill="${CAST_TONES.snow}"/>
        <path d="M-22 -20 h20 l10 6 h14" fill="none" stroke="${tone}" stroke-width="8" stroke-linecap="round"/>
        <path d="M14 -30 h12" stroke="${CAST_TONES.brown}" stroke-width="4" stroke-linecap="round"/>
        <path d="M-30 -30 h12" stroke="${CAST_TONES.brown}" stroke-width="4" stroke-linecap="round"/>`);
    default:
      return wrap(`${bodyCar(tone)}${wheel(-22)}${wheel(22)}`);
  }
}

/** 身体部位：不落地，居中摆放（卡片里给一只手/一只耳朵特写） */
function bodyArt(spec, { scale = 1.45 } = {}) {
  const skin = CAST_TONES[spec.tone ?? 'peach'];
  const deep = castEdge(spec.tone ?? 'peach');
  const wrap = (body) => `<g transform="scale(${scale.toFixed(3)})">${body}</g>`;
  switch (spec.part) {
    case 'eyes':
      return wrap(`<ellipse cx="-24" cy="-30" rx="22" ry="16" fill="${CAST_TONES.snow}"${castEdge('snow')}/>
        <ellipse cx="24" cy="-30" rx="22" ry="16" fill="${CAST_TONES.snow}"${castEdge('snow')}/>
        <circle cx="-24" cy="-30" r="9" fill="${CAST_TONES.cocoa}"/><circle cx="24" cy="-30" r="9" fill="${CAST_TONES.cocoa}"/>
        <circle cx="-24" cy="-30" r="4.4" fill="${CAST_INK}"/><circle cx="24" cy="-30" r="4.4" fill="${CAST_INK}"/>
        <circle cx="-21" cy="-33" r="2" fill="#FFFFFF"/><circle cx="27" cy="-33" r="2" fill="#FFFFFF"/>
        <path d="M-44 -46 q-4 -8 -10 -10 M44 -46 q4 -8 10 -10" fill="none" stroke="${CAST_INK}" stroke-width="2.4" stroke-linecap="round"/>`);
    case 'nose':
      return wrap(`<path d="M-8 -66 q-16 32 -7 42 q7 8 17 2 q8 -6 2 -14" fill="${skin}"${deep}/>
        <ellipse cx="-5" cy="-24" rx="9" ry="6" fill="${CAST_TONES.sand}" opacity="0.55"/>
        <circle cx="-11" cy="-27" r="2.8" fill="${CAST_INK}" opacity="0.7"/>`);
    case 'mouth':
      return wrap(`<path d="M-32 -24 q32 -26 64 0 q-32 30 -64 0 z" fill="${CAST_TONES.rose}"${deep}/>
        <path d="M-30 -24 q30 -16 60 0 q-30 12 -60 0 z" fill="${CAST_TONES.snow}"/>
        <path d="M-32 -24 h64" stroke="${CAST_TONES.coral}" stroke-width="2" opacity="0.6"/>`);
    case 'ears':
      return wrap(`<path d="M-40 -20 q-14 -10 -12 -30 q2 -20 18 -18 q14 2 12 22 q-1 16 -18 26 z" fill="${skin}"${deep}/>
        <path d="M40 -20 q14 -10 12 -30 q-2 -20 -18 -18 q-14 2 -12 22 q1 16 18 26 z" fill="${skin}"${deep}/>
        <path d="M-36 -28 q-8 -6 -7 -18 q1 -10 8 -10" fill="none" stroke="${CAST_TONES.blush}" stroke-width="3" stroke-linecap="round"/>
        <path d="M36 -28 q8 -6 7 -18 q-1 -10 -8 -10" fill="none" stroke="${CAST_TONES.blush}" stroke-width="3" stroke-linecap="round"/>`);
    case 'hand':
      return wrap(`<path d="M-22 -12 q-2 -34 8 -34 q8 0 8 24 v-22 q0 -8 7 -8 q7 0 7 8 v22 v-16 q0 -8 7 -8 q7 0 7 8 v20 q0 30 -22 30 q-22 0 -22 -24 z" fill="${skin}"${deep}/>
        <ellipse cx="-24" cy="-8" rx="7" ry="11" transform="rotate(-24 -24 -8)" fill="${skin}"${deep}/>
        <path d="M-10 -2 q12 4 22 0" fill="none" stroke="${CAST_TONES.sand}" stroke-width="2.4" opacity="0.7"/>`);
    case 'foot':
      // 脚：俯视脚掌 + 五个脚趾（侧视两段圆块会被看成面包）
      return wrap(`<ellipse cx="0" cy="-20" rx="24" ry="21" fill="${skin}"${deep}/>
        ${[
          [-23, -41, 5.6],
          [-12, -47, 5.6],
          [0, -49, 5.6],
          [12, -47, 5.2],
          [22, -43, 4.6],
        ]
          .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${skin}"${deep}/>`)
          .join('')}
        <path d="M-9 -18 q9 7 18 0" fill="none" stroke="${CAST_TONES.sand}" stroke-width="2.2" opacity="0.6"/>`);
    case 'head':
      return wrap(`<circle cx="0" cy="-34" r="30" fill="${skin}"${deep}/>
        <path d="M-30 -40 q0 -30 30 -30 q30 0 30 30 q-14 -12 -30 -12 q-16 0 -30 12 z" fill="${CAST_TONES.cocoa}"/>
        <circle cx="-11" cy="-32" r="3.4" fill="${CAST_INK}"/><circle cx="11" cy="-32" r="3.4" fill="${CAST_INK}"/>
        <path d="M-7 -20 q7 6 14 0" fill="none" stroke="${CAST_INK}" stroke-width="2.4" stroke-linecap="round"/>`);
    case 'hair':
      return wrap(`<path d="M-30 -48 q0 -28 30 -28 q30 0 30 28 q0 10 -6 12 q-2 -20 -24 -20 q-22 0 -24 20 q-6 -2 -6 -12 z" fill="${CAST_TONES.cocoa}"${castEdge('cocoa')}/>
        <path d="M-24 -20 q-4 12 2 20" fill="none" stroke="${CAST_TONES.cocoa}" stroke-width="7" stroke-linecap="round"/>`);
    case 'tummy':
      return wrap(`<path d="M-30 -64 q30 -10 60 0 v34 q0 30 -30 30 q-30 0 -30 -30 z" fill="${skin}"${deep}/>
        <ellipse cx="0" cy="-26" rx="18" ry="16" fill="${CAST_TONES.peach}" opacity="0.7"/>
        <circle cx="0" cy="-24" r="2.6" fill="${CAST_TONES.sand}"/>`);
    case 'leg':
      return wrap(`<rect x="-10" y="-74" width="20" height="48" rx="10" fill="${skin}"${deep}/>
        <ellipse cx="0" cy="-30" rx="10" ry="6" fill="${CAST_TONES.sand}" opacity="0.45"/>
        <path d="M-11 -8 q-2 -16 10 -16 q10 0 13 9 q14 2 16 9 q2 6 -7 6 h-24 q-8 0 -8 -8 z" fill="${skin}"${deep}/>
        <path d="M15 -9 h6" stroke="${CAST_TONES.sand}" stroke-width="2.6" stroke-linecap="round"/>`);
    case 'arm':
      return wrap(`<rect x="-9" y="-74" width="18" height="44" rx="9" fill="${skin}"${deep}/>
        <ellipse cx="0" cy="-32" rx="9" ry="5.5" fill="${CAST_TONES.sand}" opacity="0.45"/>
        <path d="M-11 -18 q0 -14 10 -14 q12 0 13 12 q1 20 -9 20 q-14 0 -14 -18 z" fill="${skin}"${deep}/>
        <ellipse cx="-13" cy="-20" rx="4" ry="7" transform="rotate(-20 -13 -20)" fill="${skin}"${deep}/>`);
    default:
      return wrap(`<circle cx="0" cy="-32" r="26" fill="${skin}"${deep}/>`);
  }
}

/**
 * 动作：复用人物画师保证脸/色一致，再用一个小道具把“动作”说清楚。
 * 人物与道具分开缩放（人物画师自带 scale）。
 */
function verbArt(spec, { scale = 1.45 } = {}) {
  const props = {
    run: `<path d="M-34 -54 h-14 M-38 -38 h-20 M-34 -22 h-14" stroke="${CAST_TONES.stone}" stroke-width="3.4" stroke-linecap="round" opacity="0.55"/>
      <ellipse cx="24" cy="-4" rx="8" ry="3" fill="${CAST_TONES.stone}" opacity="0.4"/>`,
    jump: `<path d="M-26 0 q26 -14 52 0" fill="none" stroke="${CAST_TONES.stone}" stroke-width="3" stroke-dasharray="6 5" opacity="0.6"/>
      <path d="M0 -116 l-8 14 h16 z" fill="${CAST_TONES.amber}"/>`,
    walk: `<ellipse cx="-18" cy="-4" rx="7" ry="3.4" fill="${CAST_TONES.stone}" opacity="0.45"/>
      <ellipse cx="16" cy="-12" rx="6.4" ry="3" fill="${CAST_TONES.stone}" opacity="0.3"/>`,
    swim: `<path d="M-44 -22 q14 -8 26 0 t26 0 t26 -2 v22 h-78 z" fill="${CAST_TONES.sky}" opacity="0.45"/>
      <path d="M-40 -26 q12 -8 24 0 t24 0" fill="none" stroke="${CAST_TONES.sky}" stroke-width="3.4" stroke-linecap="round"/>
      <circle cx="34" cy="-58" r="4" fill="${CAST_TONES.sky}" opacity="0.7"/>`,
    eat: `<path d="M14 -18 h30 q-2 16 -15 16 q-13 0 -15 -16 z" fill="${CAST_TONES.snow}"${castEdge('snow')}/>
      <ellipse cx="29" cy="-18" rx="15" ry="4" fill="${CAST_TONES.cream}"/>
      <path d="M46 -30 v12" stroke="${CAST_TONES.stone}" stroke-width="3.4" stroke-linecap="round"/>`,
    drink: `<path d="M20 -58 h22 l-3 -22 h-16 z" fill="${CAST_TONES.sky}"${castEdge('sky')}/>
      <ellipse cx="31" cy="-80" rx="8" ry="3" fill="${CAST_TONES.cream}"/>`,
    sleep: `<rect x="-40" y="-16" width="80" height="16" rx="6" fill="${CAST_TONES.wood}"${castEdge('brown')}/>
      <path d="M-40 -16 v-16 h6 v16 z" fill="${CAST_TONES.brown}"/>
      <rect x="-32" y="-30" width="20" height="13" rx="6" fill="${CAST_TONES.snow}"${castEdge('snow')}/>
      <circle cx="-4" cy="-28" r="11" fill="${CAST_TONES.peach}"${castEdge('peach')}/>
      <path d="M6 -18 q26 2 34 -12" fill="none" stroke="${CAST_TONES.blush}" stroke-width="13" stroke-linecap="round"/>
      <path d="M18 -46 h10 l-10 8 h10" fill="none" stroke="${CAST_TONES.dusk}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M32 -60 h8 l-8 6 h8" fill="none" stroke="${CAST_TONES.dusk}" stroke-width="2.2" stroke-linecap="round"/>`,
    sing: `<path d="M26 -74 v-14 q10 -6 14 2" fill="none" stroke="${CAST_TONES.berry}" stroke-width="3.6" stroke-linecap="round"/>
      <circle cx="22" cy="-74" r="6" fill="${CAST_TONES.berry}"/>
      <circle cx="38" cy="-82" r="5" fill="${CAST_TONES.berry}"/>`,
    dance: `<path d="M-38 -58 q20 -18 38 2 q16 18 34 2" fill="none" stroke="${CAST_TONES.rose}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="40" cy="-80" r="6" fill="${CAST_TONES.berry}"/>
      <path d="M40 -86 v-16" stroke="${CAST_TONES.berry}" stroke-width="3"/>`,
    read: `<path d="M-26 -58 h22 q4 0 4 4 v24 q0 -4 -4 -4 h-22 z" fill="${CAST_TONES.snow}"${castEdge('snow')}/>
      <path d="M26 -58 h-22 q-4 0 -4 4 v24 q0 -4 4 -4 h22 z" fill="${CAST_TONES.cream}"${castEdge('cream')}/>`,
    write: `<rect x="-30" y="-62" width="60" height="40" rx="5" fill="${CAST_TONES.snow}"${castEdge('snow')}/>
      <path d="M-20 -54 h40 M-20 -46 h32 M-20 -38 h36" stroke="${CAST_TONES.stone}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M30 -20 l6 -14 l6 4 l-6 14 z" fill="${CAST_TONES.amber}"/>`,
    draw: `<path d="M14 -4 v-46 M38 -4 l6 -46" stroke="${CAST_TONES.wood}" stroke-width="4" stroke-linecap="round"/>
      <rect x="6" y="-52" width="42" height="34" rx="3" fill="${CAST_TONES.snow}"${castEdge('snow')}/>
      <circle cx="20" cy="-40" r="6" fill="${CAST_TONES.coral}"/>
      <path d="M12 -22 q10 -12 18 0 q8 10 12 0" fill="none" stroke="${CAST_TONES.leaf}" stroke-width="3.4"/>`,
  }[spec.verb] ?? '';
  const person = spec.verb === 'sleep'
    ? ''
    : personArt({ style: 'spiky', cloth: spec.cloth ?? 'sky', hair: 'cocoa' }, { scale });
  return `${person}<g transform="scale(${scale.toFixed(3)})">${props}</g>`;
}

/** 文具：立/斜靠，脚底 y=0，与故事里的“笔/书”同一套圆角+深边 */
function stationeryArt(spec, { scale = 1.45 } = {}) {
  const tone = CAST_TONES[spec.tone] ?? CAST_TONES.sky;
  const deep = castEdge(spec.tone ?? 'sky');
  const wrap = (body, shadow = 20) => `<g transform="scale(${scale.toFixed(3)})">${castShadow(shadow)}${body}</g>`;
  switch (spec.item) {
    case 'pencil':
      return wrap(`<g transform="rotate(16 0 -30)">
        <rect x="-9" y="-62" width="18" height="44" rx="3" fill="${tone}"${deep}/>
        <path d="M-9 -62 l9 -18 l9 18 z" fill="${CAST_TONES.cream}"${castEdge('cream')}/>
        <path d="M-3.4 -70 l3.4 -10 l3.4 10 z" fill="${CAST_INK}"/>
        <rect x="-9" y="-30" width="18" height="6" fill="${CAST_TONES.rose}"/></g>`);
    case 'pen':
      return wrap(`<g transform="rotate(12 0 -30)">
        <rect x="-6" y="-64" width="12" height="48" rx="5" fill="${tone}"${deep}/>
        <rect x="-6" y="-44" width="12" height="10" fill="${CAST_TONES.slate}"/>
        <path d="M-5 -64 h3 v-14 h-3 z" fill="${CAST_TONES.slate}"/>
        <path d="M0 -16 l3 8 l-3 4 l-3 -4 z" fill="${CAST_TONES.slate}"/></g>`);
    case 'ruler':
      return wrap(`<g transform="rotate(-8 0 -30)">
        <rect x="-30" y="-56" width="60" height="20" rx="3" fill="${CAST_TONES.cream}"${castEdge('cream')}/>
        ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M${-26 + i * 8} -56 v${i % 2 ? 5 : 9}" stroke="${CAST_TONES.stone}" stroke-width="1.6"/>`).join('')}</g>`);
    case 'eraser':
      return wrap(`<rect x="-28" y="-30" width="56" height="28" rx="6" fill="${CAST_TONES.blush}"${castEdge('blush')}/>
        <rect x="-28" y="-14" width="56" height="12" rx="6" fill="${tone}"${deep}/>`);
    case 'crayon':
      return wrap(`<g transform="rotate(10 0 -30)">
        <rect x="-8" y="-54" width="16" height="42" rx="3" fill="${tone}"${deep}/>
        <path d="M-8 -54 l8 -14 l8 14 z" fill="${tone}"${deep}/>
        <rect x="-8" y="-40" width="16" height="12" fill="${CAST_TONES.cream}" opacity="0.85"/></g>`);
    case 'notebook':
      return wrap(`<rect x="-24" y="-62" width="48" height="60" rx="6" fill="${tone}"${deep}/>
        ${[0, 1, 2, 3].map((i) => `<circle cx="-24" cy="${-50 + i * 14}" r="3.4" fill="${CAST_TONES.stone}"/>`).join('')}
        <rect x="-14" y="-52" width="30" height="4" rx="2" fill="#FFFFFF" opacity="0.8"/>`);
    case 'map':
      return wrap(`<path d="M-30 -52 l20 -8 l20 8 l20 -8 v54 l-20 8 l-20 -8 l-20 8 z" fill="${CAST_TONES.cream}"${castEdge('cream')}/>
        <path d="M-30 -52 v54 M10 -52 v54" stroke="${CAST_TONES.wheat}" stroke-width="2" opacity="0.8"/>
        <path d="M-18 -40 q18 8 8 22 q-8 12 16 8" fill="none" stroke="${CAST_TONES.coral}" stroke-width="3" stroke-dasharray="7 5" stroke-linecap="round"/>
        <circle cx="6" cy="-10" r="5" fill="${CAST_TONES.rose}"/>`);
    case 'blackboard':
      return wrap(`<rect x="-32" y="-56" width="64" height="46" rx="4" fill="${CAST_TONES.wood}"${castEdge('brown')}/>
        <rect x="-28" y="-52" width="56" height="38" rx="2" fill="#4F6E5A"/>
        <path d="M-20 -42 h28 M-20 -32 h36" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity="0.85"/>
        <path d="M-16 0 v-10 M16 0 v-10" stroke="${CAST_TONES.stone}" stroke-width="4" stroke-linecap="round"/>`);
    case 'glue':
      return wrap(`<path d="M-14 0 h28 l-3 -38 h-22 z" fill="${tone}"${deep}/>
        <rect x="-9" y="-50" width="18" height="12" rx="3" fill="${CAST_TONES.amber}"/>
        <path d="M-4 -50 l4 -14 l4 14 z" fill="${CAST_TONES.stone}"/>
        <rect x="-11" y="-30" width="22" height="10" rx="2" fill="#FFFFFF" opacity="0.85"/>`);
    case 'scissors':
      return wrap(`<path d="M-12 0 l14 -50 M12 0 l-14 -50" stroke="${CAST_TONES.stone}" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="-12" cy="-6" rx="9" ry="7" fill="none" stroke="${tone}" stroke-width="5"/>
        <ellipse cx="12" cy="-6" rx="9" ry="7" fill="none" stroke="${tone}" stroke-width="5"/>`);
    default:
      return wrap(`<rect x="-22" y="-40" width="44" height="40" rx="6" fill="${tone}"${deep}/>`);
  }
}

/** 天气：风/冰/彩虹/雷电/暴风/雾（晴/阴/雨/雪/热复用天空画师） */
function weatherArt(spec, { scale = 1.45 } = {}) {
  const tone = CAST_TONES[spec.tone] ?? CAST_TONES.sky;
  const wrap = (body) => `<g transform="scale(${scale.toFixed(3)})">${body}</g>`;
  const cloud = (fill = CAST_TONES.stone) => `<g fill="${fill}"><circle cx="-14" cy="-60" r="16"/><circle cx="8" cy="-68" r="20"/><circle cx="28" cy="-58" r="14"/><rect x="-14" y="-64" width="44" height="20" rx="10"/></g>`;
  switch (spec.weather) {
    case 'windy':
      return wrap(`<path d="M-34 -66 q30 -14 52 0 M-40 -46 q36 16 62 -2 M-28 -26 q26 12 46 0" fill="none" stroke="${tone}" stroke-width="4.6" stroke-linecap="round" opacity="0.85"/>
        <path d="M18 -78 q14 -10 26 -2 q-14 4 -26 2 z" fill="${CAST_TONES.leaf}"/>`);
    case 'cold':
      return wrap(`<rect x="-26" y="-58" width="52" height="50" rx="10" fill="${CAST_TONES.sky}" opacity="0.75"${castEdge('sky')}/>
        <rect x="-18" y="-50" width="16" height="12" rx="4" fill="#FFFFFF" opacity="0.6"/>
        ${[0, 60, 120].map((deg) => `<g transform="translate(0 -34) rotate(${deg})"><path d="M0 -14 v28" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round"/></g>`).join('')}`);
    case 'rainbow':
      return wrap(`${['#F2B8C6', '#EFC383', '#A6D69B', '#A8D6EC'].map((c, i) => `<path d="M${-46 - i * 0} 0 a${46 - i * 8} ${46 - i * 8} 0 0 1 ${(46 - i * 8) * 2} 0" fill="none" stroke="${c}" stroke-width="8"/>`).join('')}`);
    case 'thunder':
      return wrap(`${cloud()}<path d="M2 -46 l-14 22 h10 l-8 20 l22 -26 h-10 l8 -16 z" fill="${CAST_TONES.amber}"${castEdge('amber')}/>`);
    case 'storm':
      return wrap(`${cloud(CAST_TONES.slate)}<path d="M-2 -46 l-12 20 h9 l-7 18 l20 -24 h-9 l7 -14 z" fill="${CAST_TONES.amber}"/>
        ${[-20, 0, 20].map((x) => `<path d="M${x} -40 l-6 18" stroke="${tone}" stroke-width="3.6" stroke-linecap="round"/>`).join('')}`);
    case 'foggy':
      return wrap(`${cloud(CAST_TONES.stone)}
        ${[-38, -22, -6].map((y, i) => `<path d="M${-42 + i * 6} ${y} q34 -6 70 0" fill="none" stroke="${CAST_TONES.snow}" stroke-width="7" stroke-linecap="round" opacity="0.8"/>`).join('')}`);
    default:
      return wrap(`${cloud()}`);
  }
}

/** 一家人 / 好朋友：把人物画师缩小后并排，保持同一套脸与色板 */
function groupArt(spec, { scale = 1.45 } = {}) {
  const list = spec.group === 'family'
    ? [
        [-38, { style: 'bun', cloth: 'lilac', hair: 'brown' }, 0.72],
        [38, { style: 'cap', cloth: 'sky', hair: 'cocoa' }, 0.78],
        [0, { style: 'twin', cloth: 'amber', hair: 'cocoa', grow: 0.9 }, 0.62],
      ]
    : [
        [-26, { style: 'twin', cloth: 'amber', hair: 'cocoa', grow: 0.92 }, 0.78],
        [26, { style: 'long', cloth: 'blush', hair: 'cocoa', grow: 0.92 }, 0.78],
      ];
  return list
    .map(([x, person, s]) => `<g transform="translate(${x * (scale / 1.45)} 0)">${personArt(person, { scale: scale * s })}</g>`)
    .join('');
}

/** 主体身后的奶油光晕：让主体从背景里“浮”出来（v0.3 保留，但压淡，避免像贴纸） */
function storyGlow(opacity = 0.9, cx = 240, cy = 190, radius = 138) {
  if (opacity <= 0) return '';
  const id = `sGlow-${Math.round(cx)}-${Math.round(cy)}`;
  return `<defs><radialGradient id="${id}">
      <stop offset="0.42" stop-color="#FFF8EC" stop-opacity="${opacity}"/>
      <stop offset="1" stop-color="#FFF8EC" stop-opacity="0"/>
    </radialGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#${id})"/>`;
}

/** 飞行主体：不落地，悬在草地上方 */
const FLY_SUBJECTS = new Set(['bird', 'butterfly', 'dragonfly']);

/**
 * subject → 插画规格。
 * 每个主体都走程序化插画（不再是 emoji 剪影），与背景共用 CAST_TONES 色板、
 * 无描边、带落地阴影——风格与 18 套背景同族。
 */
const CAST_SPECS = {
  /* ---- 四足小兽 ---- */
  pig: { art: 'beast', build: 'long', legs: 'short', tone: 'blush', ear: 'flop', snout: true, snoutTone: 'rose', snoutBig: true, tail: 'curl' },
  wolf: { art: 'beast', build: 'slim', tone: 'slate', earIn: 'stone', ear: 'point', muzzle: 'stone', tail: 'bush' },
  fox: { art: 'beast', build: 'slim', tone: 'coral', earIn: 'cream', ear: 'point', muzzle: 'snow', tail: 'bush' },
  rabbit: { art: 'beast', build: 'slim', tone: 'snow', earIn: 'blush', ear: 'long', teeth: true, tail: 'puff' },
  hare: { art: 'beast', build: 'slim', tone: 'sand', earIn: 'blush', ear: 'long', teeth: true, tail: 'puff' },
  dog: { art: 'beast', build: 'slim', legs: 'short', tone: 'clay', earIn: 'cream', ear: 'drop', muzzle: 'cream', collar: 'rose', tail: 'wave' },
  cat: { art: 'beast', build: 'slim', tone: 'honey', earIn: 'blush', ear: 'cat', muzzle: 'snow', whiskers: true, tail: 'long' },
  mouse: { art: 'beast', build: 'slim', tone: 'stone', earIn: 'blush', ear: 'big', muzzle: 'snow', tail: 'thin' },
  bear: { art: 'beast', build: 'big', legs: 'short', tone: 'brown', earIn: 'clay', ear: 'round' },
  lion: { art: 'beast', build: 'big', tone: 'honey', earIn: 'cream', ear: 'round', mane: 'amber', tail: 'tuft' },
  monkey: { art: 'beast', build: 'slim', legs: 'short', tone: 'clay', earIn: 'peach', ear: 'round', faceMask: 'peach', tail: 'long' },
  squirrel: { art: 'beast', build: 'slim', legs: 'short', tone: 'clay', earIn: 'peach', ear: 'point', teeth: true, tail: 'bush' },
  pony: { art: 'horse', tone: 'wood', mane: 'cocoa', hoof: 'cocoa' },
  cow: { art: 'beast', build: 'long', tone: 'snow', earIn: 'cream', ear: 'drop', horn: true, patches: 'slate', muzzle: 'sand', noseTone: 'rose', tail: 'thin' },
  sheep: { art: 'beast', build: 'round', legs: 'short', tone: 'cream', earIn: 'sand', ear: 'drop', wool: true, tail: 'stub' },
  tortoise: { art: 'turtle', tone: 'leaf', shell: 'fern', boost: 1 },
  gecko: { art: 'beast', tone: 'leaf', ear: 'none', tail: 'long' },
  frog: { art: 'frog', tone: 'leaf' },
  fish: { art: 'fish', tone: 'sky', fin: 'dusk' },
  goldfish: { art: 'fish', tone: 'amber', fin: 'coral' },
  tadpole: { art: 'tadpole', tone: 'slate' },

  /* ---- 鸟虫 ---- */
  crow: { art: 'bird', tone: 'slate', beak: 'honey' },
  bird: { art: 'bird', tone: 'sky', beak: 'honey' },
  chick: { art: 'bird', tone: 'amber', beak: 'honey', headBig: true },
  duck: { art: 'bird', tone: 'snow', beak: 'honey', beakLong: true },
  duckling: { art: 'bird', tone: 'amber', beak: 'coral', headBig: true },
  swan: { art: 'bird', tone: 'snow', beak: 'coral', beakLong: true, neck: 'long' },
  butterfly: { art: 'bug', bug: 'butterfly', wing: 'blush', tone: 'cocoa', boost: 0.88 },
  dragonfly: { art: 'bug', bug: 'dragonfly', wing: 'sky', tone: 'slate', boost: 0.72 },
  ant: { art: 'bug', bug: 'ant', tone: 'cocoa', boost: 0.72 },

  /* ---- 人物 ---- */
  girl: { art: 'person', style: 'long', cloth: 'blush', hair: 'cocoa' },
  boy: { art: 'person', style: 'spiky', cloth: 'sky', hair: 'cocoa' },
  kid: { art: 'person', style: 'twin', cloth: 'amber', hair: 'cocoa', grow: 0.9 },
  mom: { art: 'person', style: 'long', cloth: 'lilac', hair: 'brown' },
  grandma: { art: 'person', style: 'bun', cloth: 'lilac', hair: 'snow', dress: true, grow: 0.94 },
  grandpa: { art: 'person', style: 'bun', cloth: 'slate', hair: 'snow', beard: true },
  elder: { art: 'person', style: 'bun', cloth: 'slate', hair: 'snow', beard: true },
  farmer: { art: 'person', style: 'hat', cloth: 'fern', hair: 'cocoa' },
  hunter: { art: 'person', style: 'cap', cloth: 'fern', hair: 'cocoa' },
  teacher: { art: 'person', style: 'bun', cloth: 'dusk', hair: 'cocoa', dress: true, grow: 1.06 },
  fisherman: { art: 'person', style: 'cap', cloth: 'sky', hair: 'brown', beard: true },

  /* ---- 植物 ---- */
  grass: { art: 'plant', shape: 'grass', tone: 'fern', leaf: 'leaf' },
  sprout: { art: 'plant', shape: 'sprout', tone: 'leaf', leaf: 'fern', boost: 1.4 },
  seed: { art: 'plant', shape: 'seed', tone: 'brown', boost: 1.4 },
  flower: { art: 'plant', shape: 'flower', tone: 'blush', leaf: 'leaf' },
  tree: { art: 'plant', shape: 'tree', tone: 'fern', leaf: 'leaf' },
  leaves: { art: 'plant', shape: 'leaves', tone: 'leaf', leaf: 'fern', boost: 1.4 },
  radish: { art: 'plant', shape: 'radish', tone: 'coral', leaf: 'leaf' },
  papaya: { art: 'plant', shape: 'papaya', tone: 'honey' },
  banana: { art: 'plant', shape: 'banana', tone: 'amber' },
  broccoli: { art: 'plant', shape: 'broccoli', tone: 'fern', leaf: 'leaf' },

  /* ---- 天空 / 天气 ---- */
  sun: { art: 'sky', shape: 'sun', tone: 'amber' },
  moon: { art: 'sky', shape: 'moon', tone: 'cream' },
  star: { art: 'sky', shape: 'star', tone: 'honey' },
  cloud: { art: 'sky', shape: 'cloud' },
  rain: { art: 'sky', shape: 'rain', tone: 'sky' },
  snowflake: { art: 'sky', shape: 'snowflake' },
  fire: { art: 'sky', shape: 'fire', tone: 'coral', boost: 1.35 },
  water: { art: 'sky', shape: 'water', tone: 'sky' },
  snowman: { art: 'sky', shape: 'snowman', tone: 'coral' },

  /* ---- 物件（boost：小道具在大构图里不至于变成小点） ---- */
  wood: { art: 'thing', shape: 'log', tone: 'cocoa', boost: 1.3 },
  brick: { art: 'thing', shape: 'brick', tone: 'clay', boost: 1.5 },
  stone: { art: 'thing', shape: 'stone', tone: 'stone', boost: 1.35 },
  house: { art: 'thing', shape: 'house', tone: 'coral', boost: 1.3 },
  castle: { art: 'thing', shape: 'castle', tone: 'stone', boost: 1.15 },
  school: { art: 'thing', shape: 'school', tone: 'coral', boost: 1.35 },
  meat: { art: 'thing', shape: 'meat', tone: 'coral', boost: 1.4 },
  cake: { art: 'thing', shape: 'cake', tone: 'blush', boost: 1.4 },
  pot: { art: 'thing', shape: 'pot', tone: 'slate', boost: 1.35 },
  cup: { art: 'thing', shape: 'cup', tone: 'sky', boost: 1.35 },
  bowl: { art: 'thing', shape: 'bowl', tone: 'sand', boost: 1.35 },
  rice: { art: 'thing', shape: 'bowl', tone: 'snow', boost: 1.35 },
  spoon: { art: 'thing', shape: 'spoon', boost: 1.6 },
  bottle: { art: 'thing', shape: 'bottle', tone: 'sky', boost: 1.35 },
  tooth: { art: 'thing', shape: 'tooth', boost: 1.7 },
  toothbrush: { art: 'thing', shape: 'brush', tone: 'sky', boost: 1.5 },
  brush: { art: 'thing', shape: 'brush', tone: 'rose', boost: 1.5 },
  soap: { art: 'thing', shape: 'soap', tone: 'mint', boost: 1.5 },
  towel: { art: 'thing', shape: 'towel', tone: 'mint', boost: 1.3 },
  shoes: { art: 'thing', shape: 'shoes', tone: 'coral', boost: 1.35 },
  clothes: { art: 'thing', shape: 'cloth', tone: 'sky', boost: 1.25 },
  potty: { art: 'thing', shape: 'potty', tone: 'snow', boost: 1.3 },
  bag: { art: 'thing', shape: 'bag', tone: 'coral', boost: 1.3 },
  trash: { art: 'thing', shape: 'bin', tone: 'slate', boost: 1.35 },
  toyBlocks: { art: 'thing', shape: 'blocks', tone: 'sky', boost: 1.35 },
  blocks: { art: 'thing', shape: 'blocks', tone: 'sky', boost: 1.35 },
  ball: { art: 'thing', shape: 'ball', tone: 'rose', boost: 1.4 },
  teddy: { art: 'thing', shape: 'teddy', tone: 'wheat', boost: 1.3 },
  car: { art: 'thing', shape: 'car', tone: 'coral', boost: 1.6 },
  lamp: { art: 'thing', shape: 'lamp', tone: 'amber', boost: 1.4 },
  clock: { art: 'thing', shape: 'clock', tone: 'slate', boost: 1 },
  book: { art: 'thing', shape: 'book', tone: 'berry', boost: 1.4 },
  drawing: { art: 'thing', shape: 'drawing', tone: 'leaf', boost: 1.35 },
  umbrella: { art: 'thing', shape: 'umbrella', tone: 'lilac', boost: 1.35 },
  axe: { art: 'thing', shape: 'axe', tone: 'stone', boost: 1.12 },
  hands: { art: 'thing', shape: 'hands', boost: 1.45 },
  playground: { art: 'thing', shape: 'slide', tone: 'sky', boost: 1.3 },
  road: { art: 'thing', shape: 'road', boost: 1.25 },
  light: { art: 'thing', shape: 'traffic', boost: 1.5 },
};

const CAST_ART = {
  beast: beastArt,
  person: personArt,
  bird: birdArt,
  fish: fishArt,
  frog: frogArt,
  bug: bugArt,
  plant: plantArt,
  sky: skyArt,
  thing: thingArt,
  turtle: turtleArt,
  elephant: elephantArt,
  horse: horseArt,
  giraffe: giraffeArt,
};

/** 卡片侧新增画师：与故事画师共用色板 / 落脚线 / 阴影，只是多了果子、车、身体、动作这几类 */
const CARD_ART = {
  produce: produceArt,
  ride: rideArt,
  body: bodyArt,
  verb: verbArt,
  stationery: stationeryArt,
  weather: weatherArt,
  group: groupArt,
};

/**
 * 卡片 slug → 已有主体：同一个东西不用画两遍（turtle 就是故事里的 tortoise）。
 * 16 个分类里的 154 张实物卡靠这张表 + CARD_SPECS 补齐，全部走程序化插画。
 */
const CARD_ALIAS = {
  horse: 'pony',
  turtle: 'tortoise',
  backpack: 'bag',
  teeth: 'tooth',
  sunny: 'sun',
  cloudy: 'cloud',
  rainy: 'rain',
  snowy: 'snowflake',
  hot: 'fire',
  classroom: 'school',
};

/** 卡片专属主体（161 张里除上面这些以外的新东西） */
const CARD_SPECS = {
  /* ---- 动物 ---- */
  chicken: { art: 'bird', tone: 'snow', beak: 'honey', crest: true, boost: 1.05 },
  elephant: { art: 'elephant', tone: 'stone', boost: 1.02 },
  tiger: { art: 'beast', build: 'slim', tone: 'amber', earIn: 'cream', ear: 'point', muzzle: 'snow', stripe: true, tail: 'long' },
  panda: { art: 'beast', build: 'big', legs: 'short', tone: 'snow', earTone: 'slate', ear: 'round', patch: true, socks: 'slate', belly: 'snow' },
  giraffe: { art: 'giraffe', tone: 'honey', spots: 'clay', boost: 1 },
  bee: { art: 'bug', bug: 'bee', tone: 'honey', wing: 'sky' },

  /* ---- 水果 ---- */
  apple: { art: 'produce', produce: 'apple', tone: 'coral' },
  watermelon: { art: 'produce', produce: 'watermelon', tone: 'rose' },
  grape: { art: 'produce', produce: 'grape', tone: 'lilac' },
  orange: { art: 'produce', produce: 'orange', tone: 'amber' },
  strawberry: { art: 'produce', produce: 'strawberry', tone: 'coral' },
  pear: { art: 'produce', produce: 'pear', tone: 'leaf' },
  peach: { art: 'produce', produce: 'peach', tone: 'peach' },
  pineapple: { art: 'produce', produce: 'pineapple', tone: 'honey' },
  lemon: { art: 'produce', produce: 'lemon', tone: 'amber' },
  cherry: { art: 'produce', produce: 'cherry', tone: 'berry' },
  mango: { art: 'produce', produce: 'mango', tone: 'amber' },
  coconut: { art: 'produce', produce: 'coconut', tone: 'brown' },
  kiwi: { art: 'produce', produce: 'kiwi', tone: 'clay' },
  blueberry: { art: 'produce', produce: 'blueberry', tone: 'dusk' },
  avocado: { art: 'produce', produce: 'avocado', tone: 'fern' },

  /* ---- 蔬菜 ---- */
  carrot: { art: 'produce', produce: 'carrot', tone: 'coral' },
  tomato: { art: 'produce', produce: 'tomato', tone: 'rose' },
  cucumber: { art: 'produce', produce: 'cucumber', tone: 'fern' },
  potato: { art: 'produce', produce: 'potato', tone: 'clay' },
  cabbage: { art: 'produce', produce: 'cabbage', tone: 'leaf' },
  corn: { art: 'produce', produce: 'corn', tone: 'amber' },
  eggplant: { art: 'produce', produce: 'eggplant', tone: 'lilac' },
  mushroom: { art: 'produce', produce: 'mushroom', tone: 'coral' },
  pumpkin: { art: 'produce', produce: 'pumpkin', tone: 'honey' },
  pepper: { art: 'produce', produce: 'pepper', tone: 'fern' },
  onion: { art: 'produce', produce: 'onion', tone: 'lilac' },
  garlic: { art: 'produce', produce: 'garlic', tone: 'snow' },

  /* ---- 交通工具 ---- */
  bus: { art: 'ride', ride: 'bus', tone: 'amber' },
  bicycle: { art: 'ride', ride: 'bicycle', tone: 'sky' },
  train: { art: 'ride', ride: 'train', tone: 'coral' },
  plane: { art: 'ride', ride: 'plane', tone: 'sky' },
  boat: { art: 'ride', ride: 'boat', tone: 'coral' },
  motorcycle: { art: 'ride', ride: 'motorcycle', tone: 'slate' },
  ambulance: { art: 'ride', ride: 'ambulance', tone: 'snow' },
  'fire-truck': { art: 'ride', ride: 'fire', tone: 'coral' },
  'police-car': { art: 'ride', ride: 'police', tone: 'snow' },
  truck: { art: 'ride', ride: 'truck', tone: 'leaf' },
  subway: { art: 'ride', ride: 'subway', tone: 'dusk' },
  rocket: { art: 'ride', ride: 'rocket', tone: 'coral' },
  helicopter: { art: 'ride', ride: 'helicopter', tone: 'leaf' },
  ship: { art: 'ride', ride: 'ship', tone: 'sky' },
  taxi: { art: 'ride', ride: 'taxi', tone: 'amber' },

  /* ---- 日常用品 ---- */
  chair: { art: 'thing', shape: 'chair', tone: 'sky' },
  table: { art: 'thing', shape: 'table', tone: 'wheat' },
  hat: { art: 'thing', shape: 'hat', tone: 'slate' },
  key: { art: 'thing', shape: 'key', tone: 'honey' },

  /* ---- 身体 ---- */
  eyes: { art: 'body', part: 'eyes' },
  nose: { art: 'body', part: 'nose' },
  mouth: { art: 'body', part: 'mouth' },
  ears: { art: 'body', part: 'ears' },
  hand: { art: 'body', part: 'hand' },
  foot: { art: 'body', part: 'foot' },
  head: { art: 'body', part: 'head' },
  hair: { art: 'body', part: 'hair' },
  tummy: { art: 'body', part: 'tummy' },
  leg: { art: 'body', part: 'leg' },
  arm: { art: 'body', part: 'arm' },

  /* ---- 家人 ---- */
  dad: { art: 'person', style: 'spiky', cloth: 'sky', hair: 'cocoa', grow: 1.04 },
  baby: { art: 'person', style: 'cap', cloth: 'blush', hair: 'cocoa', grow: 0.66 },
  brother: { art: 'person', style: 'spiky', cloth: 'leaf', hair: 'cocoa', grow: 0.88 },
  sister: { art: 'person', style: 'twin', cloth: 'blush', hair: 'cocoa', grow: 0.88 },
  uncle: { art: 'person', style: 'cap', cloth: 'slate', hair: 'cocoa', grow: 1.02 },
  aunt: { art: 'person', style: 'bun', cloth: 'coral', hair: 'brown', dress: true, grow: 1 },
  family: { art: 'group', group: 'family' },
  friend: { art: 'group', group: 'friend' },

  /* ---- 天气 ---- */
  windy: { art: 'weather', weather: 'windy', tone: 'sky' },
  cold: { art: 'weather', weather: 'cold', tone: 'sky' },
  rainbow: { art: 'weather', weather: 'rainbow' },
  thunder: { art: 'weather', weather: 'thunder', tone: 'sky' },
  storm: { art: 'weather', weather: 'storm', tone: 'sky' },
  foggy: { art: 'weather', weather: 'foggy' },

  /* ---- 动作 ---- */
  run: { art: 'verb', verb: 'run', cloth: 'sky' },
  jump: { art: 'verb', verb: 'jump', cloth: 'amber' },
  walk: { art: 'verb', verb: 'walk', cloth: 'leaf' },
  swim: { art: 'verb', verb: 'swim', cloth: 'sky' },
  eat: { art: 'verb', verb: 'eat', cloth: 'coral' },
  drink: { art: 'verb', verb: 'drink', cloth: 'sky' },
  sleep: { art: 'verb', verb: 'sleep', cloth: 'lilac' },
  sing: { art: 'verb', verb: 'sing', cloth: 'berry' },
  dance: { art: 'verb', verb: 'dance', cloth: 'rose' },
  read: { art: 'verb', verb: 'read', cloth: 'leaf' },
  write: { art: 'verb', verb: 'write', cloth: 'dusk' },
  draw: { art: 'verb', verb: 'draw', cloth: 'amber' },

  /* ---- 食物 ---- */
  noodles: { art: 'produce', produce: 'noodles', tone: 'honey' },
  bread: { art: 'produce', produce: 'bread', tone: 'honey' },
  egg: { art: 'produce', produce: 'egg', tone: 'amber' },
  milk: { art: 'produce', produce: 'milk', tone: 'sky' },
  juice: { art: 'produce', produce: 'juice', tone: 'amber' },
  soup: { art: 'produce', produce: 'soup', tone: 'coral' },
  candy: { art: 'produce', produce: 'candy', tone: 'berry' },
  'fish-dish': { art: 'produce', produce: 'fishDish', tone: 'amber' },

  /* ---- 学校用品 ---- */
  pencil: { art: 'stationery', item: 'pencil', tone: 'amber' },
  pen: { art: 'stationery', item: 'pen', tone: 'sky' },
  ruler: { art: 'stationery', item: 'ruler', tone: 'wheat' },
  eraser: { art: 'stationery', item: 'eraser', tone: 'sky' },
  crayon: { art: 'stationery', item: 'crayon', tone: 'coral' },
  notebook: { art: 'stationery', item: 'notebook', tone: 'berry' },
  map: { art: 'stationery', item: 'map', tone: 'cream' },
  blackboard: { art: 'stationery', item: 'blackboard', tone: 'fern' },
  glue: { art: 'stationery', item: 'glue', tone: 'sky' },
  scissors: { art: 'stationery', item: 'scissors', tone: 'rose' },
};

/** 取一个 slug 的插画规格：先查别名，再查故事侧，最后查卡片侧 */
function cardSpecOf(slug) {
  const key = CARD_ALIAS[slug] ?? slug;
  return CAST_SPECS[key] ?? CARD_SPECS[key];
}

/** 小蝌蚪：圆头 + 长尾，与主体同一色板（不走 emoji，emoji 里没有蝌蚪） */
function tadpoleArt(spec, { scale = 1.45 } = {}) {
  const body = CAST_TONES[spec.tone] ?? CAST_TONES.slate;
  return `<g transform="scale(${scale.toFixed(3)})" transform-origin="0 0">
    <g transform="translate(0 -34)">
      <ellipse cx="0" cy="0" rx="20" ry="17" fill="${body}"/>
      <path d="M16 0 q22 -9 40 0 q-20 10 -40 5 z" fill="${body}" opacity="0.85"/>
      <ellipse cx="-3" cy="5" rx="10" ry="7" fill="${CAST_TONES.snow}" opacity="0.5"/>
      <circle cx="-9" cy="-4" r="3.4" fill="${CAST_INK}"/>
      <circle cx="4" cy="-4" r="3.4" fill="${CAST_INK}"/>
      <path d="M-5 6 q5 4 10 0" fill="none" stroke="${CAST_INK}" stroke-width="1.6" stroke-linecap="round"/>
    </g>
  </g>`;
}

CAST_ART.tadpole = tadpoleArt;

/** 主体统一入口：按 spec 分派到对应画师，scale 按“身高 96”归一；物件内部尺寸小，靠 boost 找回视觉分量 */
function castArtwork(subject, size) {
  const spec = CAST_SPECS[subject];
  if (!spec) return thingArt({ tone: 'stone' }, { scale: size / 96 });
  const { art, boost = 1, ...rest } = spec;
  const draw = CAST_ART[art] ?? thingArt;
  return draw(rest, { scale: (size / 96) * boost });
}

/** 主体的落脚线：地面 / 飞行 / 水中 / 天空（天空由 skyArt 内部 -170 抬升） */
function castBaseY(subject, scene) {
  const spec = CAST_SPECS[subject];
  if (spec?.art === 'sky') return 296;
  // 鱼与蝌蚪只在池塘/河/海的画面里沉到水面以下；在屋子里会“沉到地板下”，改回踩实地面
  if (spec?.art === 'fish' || subject === 'tadpole') {
    return WATER_SCENES.has(scene) ? 334 : 292;
  }
  if (FLY_SUBJECTS.has(subject)) return 252;
  return 292;
}

/** 单个主体：彩色插画直接压在背景上，不再需要光晕（保留参数以兼容调用方） */
function storySubjectMarkup(subject, { glowOpacity = 0, cx = 240, size = 190, scene = 'meadow' } = {}) {
  const y = castBaseY(subject, scene);
  const glow = storyGlow(glowOpacity, cx, y - size * 0.48, size * 0.62);
  return `${glow}<g transform="translate(${cx} ${y})">${castArtwork(subject, size)}</g>`;
}

/** 水面场景把主体往下放：鸭子、鱼、小蝌蚪应该在水里而不是在岸上 */
const STORY_SUBJECT_DY = { pond: 12, river: 6, sea: 6, cave: 0 };

/**
 * 环境与用品：同票时不与角色抢位。
 * 三只小猪的 subject 是 pig/grass/wood/brick/wolf/pig，若只看次数会把「嫩芽 + 木桩」画上去，
 * 而狼与砖房被挤掉——角色必须优先。
 */
const STORY_PROPS = new Set([
  'grass', 'wood', 'brick', 'stone', 'water', 'meat', 'cake', 'rice', 'cup', 'bowl', 'spoon',
  'tooth', 'toothbrush', 'brush', 'soap', 'towel', 'trash', 'bag', 'blocks', 'ball', 'teddy',
  'car', 'lamp', 'clothes', 'book', 'shoes', 'potty', 'umbrella', 'seed', 'sprout', 'leaves',
  'snowflake', 'bottle', 'pot', 'axe', 'flower', 'tree', 'rain',
]);

/**
 * 不当作主体的东西：它们是“背景的一部分”（滑梯、马路、红绿灯、云、雨、水、星、太阳…）。
 * 把它们当主角会出现「一屏两个太阳」「背景道具抢角色位」的问题。
 */
const STORY_BACKDROP = new Set([
  'playground', 'road', 'light', 'cloud', 'rain', 'water', 'star', 'snowflake',
  'grass', 'flower', 'tree', 'sun',
]);

/** 真正“在水里”的场景：其他场景的鱼不应该沉到地平线以下 */
const WATER_SCENES = new Set(['pond', 'river', 'sea']);

/** 主体外形指纹：同一种画法的同一个形状只上一次画（避免两个“盆”、两个“女孩”） */
const SHAPE_TRAITS = [
  'shape', 'bug', 'style', 'ear', 'tail', 'shell', 'neck', 'beak', 'beakLong', 'headBig',
  'crest', 'wool', 'mane', 'patch', 'stripe', 'trunk', 'horn', 'spots', 'fin', 'beard',
  'dress', 'tone',
];

function castShapeKey(subject) {
  const spec = CAST_SPECS[subject];
  if (!spec) return `none:${subject}`;
  // 只看 art 会把「兔 + 龟」「鸭 + 天鹅」「猪 + 狼」当成同一个主角而只画一只，
  // 指纹必须带上耳朵/尾巴/壳/脖子/色调这些辨识特征。
  return [spec.art, ...SHAPE_TRAITS.map((key) => spec[key] ?? '')].join(':');
}

/**
 * 取故事的主体：角色优先，背景元素不上场；同外形只上一次；
 * 只有 1 个角色时才用道具补位（乌鸦 + 石头 + 瓶子这种“单主角 + 关键道具”仍然成立）。
 */
function storyCast(pages) {
  const stats = new Map();
  pages.forEach((page, index) => {
    if (!page.subject) return;
    const item = stats.get(page.subject) ?? { count: 0, first: index, last: index };
    item.count += 1;
    item.last = index;
    stats.set(page.subject, item);
  });
  const ranked = [...stats.entries()].sort(([subjectA, a], [subjectB, b]) => {
    const propA = STORY_PROPS.has(subjectA) ? 1 : 0;
    const propB = STORY_PROPS.has(subjectB) ? 1 : 0;
    if (propA !== propB) return propA - propB;
    if (a.count !== b.count) return b.count - a.count;
    return propA === 1 ? b.last - a.last : a.first - b.first;
  });

  const roles = ranked.filter(([s]) => !STORY_BACKDROP.has(s) && !STORY_PROPS.has(s));
  const props = ranked.filter(([s]) => !STORY_BACKDROP.has(s) && STORY_PROPS.has(s));

  const picks = [];
  const push = (subject) => {
    if (!subject || picks.includes(subject)) return;
    if (picks.some((picked) => castShapeKey(picked) === castShapeKey(subject))) return;
    picks.push(subject);
  };

  roles.slice(0, 3).forEach(([subject]) => push(subject));
  // 角色不足 3 个时用关键道具补位（乌鸦 + 石头 + 瓶子），但一屏最多 3 个主体
  props.slice(0, 3).forEach(([subject]) => {
    if (picks.length < 3) push(subject);
  });
  // 整篇只有背景元素（雨从哪里来）：退回排名前两个，至少能看出“云 + 太阳”
  if (picks.length === 0) ranked.slice(0, 2).forEach(([subject]) => push(subject));

  return { main: picks[0], rest: picks.slice(1) };
}

/**
 * 场景适配：
 * 1. 夜景 / 洞里换成月亮，避免“满天星斗里挂着大太阳”；
 * 2. 鱼只在水面场景里出场，屋里/草地上的鱼会悬在地板上（返回 null 由调用方剔除）。
 */
function castForScene(subject, scene) {
  if (!subject) return subject;
  // 夜景背景自带月亮：主体再来一个会变成“两个月亮”；洞里同理不该挂大太阳
  if (scene === 'night' && (subject === 'sun' || subject === 'moon')) return null;
  if (scene === 'cave' && subject === 'sun') return 'moon';
  // 雨天不要再出太阳（「雨从哪里来」会变成一边下雨一边出太阳）
  if (scene === 'rain' && subject === 'sun') return null;
  if ((subject === 'fish' || subject === 'goldfish' || subject === 'tadpole') && !WATER_SCENES.has(scene)) return null;
  return subject;
}

/** 综合图的主体布局：主角居中最大，配角分列两侧（脚底都踩在同一条地面线上） */
function storyCastMarkup(pages, scene) {
  const { main, rest } = storyCast(pages);
  // 场景适配后再剔除（草地上的鱼、夜里的太阳都会被 castForScene 判掉），位次按剩余主体重排
  const subjects = [main, ...rest]
    .map((subject) => castForScene(subject, scene))
    .filter((subject) => Boolean(subject));
  if (subjects.length === 0) {
    return storySubjectMarkup('book', { cx: 240, size: 170, scene });
  }
  const spots = subjects.length === 1
    ? [{ cx: 240, size: 180 }]
    : subjects.length === 2
      ? [
          { cx: 300, size: 172 },
          { cx: 118, size: 142 },
        ]
      : [
          { cx: 240, size: 156 },
          { cx: 78, size: 126 },
          { cx: 402, size: 126 },
        ];
  const markup = subjects
    .map((subject, index) => storySubjectMarkup(subject, { ...spots[index], scene }))
    .join('');
  const dy = STORY_SUBJECT_DY[scene] ?? 0;
  return dy === 0 ? markup : `<g transform="translate(0 ${dy})">${markup}</g>`;
}

/**
 * 故事综合图：一个故事只出一张。
 * 背景取首个分镜的 scene，主体由全书的 scene/subject 聚合（ADR-S7）。
 */
function storySvg(story) {
  const { width, height } = STORY_SIZE;
  const scene = story.pages[0]?.scene ?? 'meadow';
  const draw = STORY_SCENES[scene] ?? STORY_SCENES.meadow;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${draw()}
    ${storyCastMarkup(story.pages, scene)}
  </svg>`;
}

/** 分类封面：三本叠放的小书 */
function storyShelfSvg() {
  const { width, height } = COVER_SIZE;
  const theme = THEME.stories;
  const books = [
    { x: 78, y: 104, w: 104, h: 146, fill: '#F2B8C8', rotate: -7 },
    { x: 182, y: 88, w: 112, h: 162, fill: '#A9D3E8', rotate: 2 },
    { x: 288, y: 108, w: 100, h: 142, fill: '#F6D27A', rotate: 8 },
  ];
  const markup = books
    .map(
      (b) => `<g transform="rotate(${b.rotate} ${b.x + b.w / 2} ${b.y + b.h / 2})">
      <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="10" fill="${b.fill}"/>
      <rect x="${b.x + 14}" y="${b.y + 16}" width="${b.w - 28}" height="${b.h - 58}" rx="6" fill="#FFFFFF" opacity="0.7"/>
      <rect x="${b.x + 14}" y="${b.y + b.h - 30}" width="${b.w - 28}" height="8" rx="4" fill="#FFFFFF" opacity="0.6"/>
      <rect x="${b.x + 4}" y="${b.y}" width="6" height="${b.h}" fill="#2F2A24" opacity="0.08"/>
    </g>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="${theme.bg}"/>
    <circle cx="${width - 56}" cy="46" r="104" fill="${theme.soft}" opacity="0.7"/>
    <circle cx="44" cy="${height - 38}" r="82" fill="${theme.soft}" opacity="0.55"/>
    ${markup}
  </svg>`;
}

/** 从种子源码解析卡片（避免在脚本里重复维护一份内容） */
async function parseSeed() {
  const source = await readFile(SEED_FILE, 'utf8');
  const groups = [];
  const groupRe = /const (\w+): readonly Row\[\] = \[([\s\S]*?)\n\];/g;
  let match;
  while ((match = groupRe.exec(source))) {
    const [, name, body] = match;
    const rows = [...body.matchAll(/\['([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'/g)].map(
      (row) => ({ slug: row[1], zh: row[2] }),
    );
    groups.push({ name, rows });
  }

  const bindings = new Map(
    [...source.matchAll(/buildObjects\('([^']+)',\s*(\w+)\)/g)].map((item) => [item[2], item[1]]),
  );

  const cards = [];
  for (const group of groups) {
    const categoryId = bindings.get(group.name);
    if (!categoryId) continue;
    group.rows.forEach((row, index) => {
      cards.push({ categoryId, slug: row.slug, zh: row.zh, kind: 'object', index });
    });
  }

  const charBody = /const CHARACTERS: readonly CharRow\[\] = \[([\s\S]*?)\n\];/.exec(source);
  if (charBody) {
    const lines = charBody[1]
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('['));
    lines.forEach((line, index) => {
      // 只取行首的 slug 与汉字，避免把组词数组也当成一行
      const strings = [...line.matchAll(/'([^']*)'/g)].map((item) => item[1]);
      const slug = strings[0];
      const zh = strings[1];
      if (slug && zh) {
        cards.push({ categoryId: 'characters', slug, zh, kind: 'character', index });
      }
    });
  }

  const poemBody = /const POEMS: readonly PoemRow\[\] = \[([\s\S]*?)\n\];/.exec(source);
  if (poemBody) {
    poemBody[1]
      .split(/\n(?=\s*\{ slug:)/)
      .forEach((block, index) => {
        const slug = /slug: '([^']*)'/.exec(block)?.[1];
        if (!slug) return;
        cards.push({ categoryId: 'poems', slug, zh: slug, kind: 'poem', index });
      });
  }

  return cards;
}

/** 故事从 stories.ts 解析：slug / zh / 每段 { scene, subject }（分镜信息，用于合成综合图） */
async function parseStories() {
  const source = await readFile(STORY_FILE, 'utf8');
  const blockRe = /\{\s*slug: '([^']+)',\s*zh: '([^']+)',[\s\S]*?pages: \[([\s\S]*?)\n    \],/g;
  const stories = [];
  let match;
  while ((match = blockRe.exec(source))) {
    const [, slug, zh, body] = match;
    const pages = [...body.matchAll(/\{ text: '[^']*', scene: '([^']+)', subject: '([^']+)' \}/g)].map(
      (item) => ({ scene: item[1], subject: item[2] }),
    );
    if (pages.length > 0) stories.push({ slug, zh, pages });
  }
  return stories;
}

async function fileExists(target) {
  try {
    await readFile(target);
    return true;
  } catch {
    return false;
  }
}

/** 清理早期版本遗留在故事目录里的分页插图（{n}.webp）：一个故事只保留 cover.webp */
async function pruneStoryPages(dir) {
  let removed = 0;
  for (let index = 1; index <= 8; index += 1) {
    const target = path.join(dir, `${index}.webp`);
    if (!(await fileExists(target))) continue;
    await rm(target);
    removed += 1;
  }
  return removed;
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const only = args.find((arg) => arg.startsWith('--only='))?.split('=')[1];

  const cards = await parseSeed();
  if (cards.length === 0) throw new Error('未能从种子源码解析出卡片，请检查 scripts/prepare-images.mjs');
  const stories = await parseStories();

  // 调试：只打印每本故事的背景与聚合出的主体，便于人工核对配图是否对得上
  if (args.includes('--print-cast')) {
    for (const story of stories) {
      const { main: lead, rest } = storyCast(story.pages);
      const cast = [lead, ...rest].filter(Boolean).join(', ');
      console.log(`${story.slug}\t${story.zh}\t${story.pages[0]?.scene ?? 'meadow'}\t${cast}`);
    }
    return;
  }

  const byCategory = new Map();
  for (const card of cards) {
    const list = byCategory.get(card.categoryId) ?? [];
    list.push(card);
    byCategory.set(card.categoryId, list);
  }

  let written = 0;
  let skipped = 0;

  for (const [categoryId, list] of byCategory) {
    if (only && only !== categoryId) continue;
    const dir = path.join(OUT_ROOT, categoryId);
    await mkdir(dir, { recursive: true });

    // 故事卡是一本一个目录（{slug}/cover.webp + 1..n.webp），不走单图 tiles
    if (categoryId !== 'stories') {
      for (const card of list) {
        const target = path.join(dir, `${card.slug}.webp`);
        if (!force && (await fileExists(target))) {
          skipped += 1;
          continue;
        }
        const svg = card.kind === 'poem' ? poemSvg(card) : cardSvg(card);
        await sharp(Buffer.from(svg)).webp({ quality: QUALITY }).toFile(target);
        written += 1;
      }
    }

    const coverDir = path.join(OUT_ROOT, 'covers');
    await mkdir(coverDir, { recursive: true });
    const coverTarget = path.join(coverDir, `${categoryId}.webp`);
    if (force || !(await fileExists(coverTarget))) {
      const svg =
        categoryId === 'poems'
          ? poemCoverSvg()
          : categoryId === 'stories'
            ? storyShelfSvg()
            : coverSvg(categoryId, list.map((card) => card.slug));
      await sharp(Buffer.from(svg)).webp({ quality: QUALITY }).toFile(coverTarget);
      written += 1;
    } else {
      skipped += 1;
    }
  }

  // 生成清单，便于校验脚本核对文件是否齐备
  const manifest = Object.fromEntries(
    [...byCategory].map(([categoryId, list]) => [categoryId, list.map((card) => card.slug)]),
  );

  // 故事：每本只出一张综合图 cover.webp（480×360 / q78），--only=stories 可单独补图
  let pruned = 0;
  if (stories.length > 0 && (!only || only === 'stories')) {
    // 故事卡不在 cards.ts 的 Row 组里，分类封面要在这里单独出
    const coverDir = path.join(OUT_ROOT, 'covers');
    await mkdir(coverDir, { recursive: true });
    const shelf = path.join(coverDir, 'stories.webp');
    if (force || !(await fileExists(shelf))) {
      await sharp(Buffer.from(storyShelfSvg())).webp({ quality: QUALITY }).toFile(shelf);
      written += 1;
    } else {
      skipped += 1;
    }

    const storyRoot = path.join(OUT_ROOT, 'stories');
    for (const story of stories) {
      const dir = path.join(storyRoot, story.slug);
      await mkdir(dir, { recursive: true });

      const cover = path.join(dir, 'cover.webp');
      if (force || !(await fileExists(cover))) {
        await sharp(Buffer.from(storySvg(story))).webp({ quality: STORY_QUALITY }).toFile(cover);
        written += 1;
      } else {
        skipped += 1;
      }

      pruned += await pruneStoryPages(dir);
    }
    manifest.stories = stories.map((story) => story.slug);
  }

  await writeFile(path.join(OUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const storyParagraphs = stories.reduce((sum, story) => sum + story.pages.length, 0);
  console.log(
    `图片生成完成：写入 ${written} 个，跳过 ${skipped} 个（共 ${cards.length + stories.length} 张卡片；故事 ${stories.length} 本 / ${storyParagraphs} 段 / 综合图 ${stories.length} 张；清理旧分页图 ${pruned} 张）`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
