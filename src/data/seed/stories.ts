/**
 * 故事种子（v0.2）：50 个故事 × 6 段正文，一页读完、每故事 1 张综合图。
 *
 * 口径见 FR/v0.2/PRD-故事绘本.md §4；分组见 storyGroups.ts。
 * 每段声明的 scene（背景模板）与 subject（主体 key）是分镜信息，
 * 由 scripts/prepare-images.mjs 聚合全书主体生成一张综合图 cover.webp。
 *
 * 新增故事时必须：① 归入本文件某个主题数组；② 同步 storyGroups.ts 的组名；
 * ③ 跑 npm run prepare:images -- --only=stories 出图；④ SEED_VERSION +1。
 */

import type { Card, Difficulty } from '../../domain/entities/card';
import { SEED_TIME } from './categories';

const IMAGE_ROOT = 'assets/images/stories';

export interface StoryPageRow {
  text: string;
  scene: string;
  subject: string;
}

export interface StoryRow {
  slug: string;
  zh: string;
  pinyin: string;
  en: string;
  difficulty: Difficulty;
  /** 一句寓意，展示在末页与详情页 */
  moral: string;
  pages: readonly StoryPageRow[];
}

/** 童话改编 20 个：保留经典人物与关键情节，去掉血腥与惩罚桥段 */
export const FAIRY_STORIES: readonly StoryRow[] = [
  {
    slug: 'three-pigs', zh: '三只小猪', pinyin: 'sān zhī xiǎo zhū', en: 'Three Little Pigs',
    difficulty: 1, moral: '做事要认真，结实的房子才挡得住大风。',
    pages: [
      { text: '猪妈妈对三只小猪说：你们长大了，去盖自己的房子吧。', scene: 'meadow', subject: 'pig' },
      { text: '猪大哥用稻草盖了一座房子，一会儿就盖好了。', scene: 'meadow', subject: 'grass' },
      { text: '猪二哥用木头盖房子，钉钉敲敲，也盖好了。', scene: 'forest', subject: 'wood' },
      { text: '猪小弟一块一块搬砖头，盖了一座结实的房子。', scene: 'hill', subject: 'brick' },
      { text: '大灰狼来了，吹倒了草房和木房，砖房一动也不动。', scene: 'forest', subject: 'wolf' },
      { text: '三只小猪躲在砖房里，狼只好灰溜溜地走了。', scene: 'house', subject: 'pig' },
    ],
  },
  {
    slug: 'red-hood', zh: '小红帽', pinyin: 'xiǎo hóng mào', en: 'Red Riding Hood',
    difficulty: 1, moral: '不跟陌生人走，路上要告诉家人。',
    pages: [
      { text: '妈妈说：外婆生病了，把蛋糕送去给她吧。', scene: 'kitchen', subject: 'cake' },
      { text: '小红帽提着篮子走进森林，路边开满了小花。', scene: 'forest', subject: 'girl' },
      { text: '一只大灰狼走过来，问：小姑娘，你要去哪儿？', scene: 'forest', subject: 'wolf' },
      { text: '小红帽采了许多花，狼先跑到了外婆家。', scene: 'garden', subject: 'flower' },
      { text: '猎人听见屋里有怪声音，推开门把狼赶跑了。', scene: 'house', subject: 'hunter' },
      { text: '外婆吃了蛋糕，小红帽说：以后我不跟陌生人走。', scene: 'room', subject: 'grandma' },
    ],
  },
  {
    slug: 'tortoise-hare', zh: '龟兔赛跑', pinyin: 'guī tù sài pǎo', en: 'Tortoise and Hare',
    difficulty: 1, moral: '慢一点没关系，一直往前就能到。',
    pages: [
      { text: '兔子和乌龟站在起跑线上，大家都来看比赛。', scene: 'meadow', subject: 'rabbit' },
      { text: '哨声一响，兔子飞快地跑出去，乌龟慢慢爬。', scene: 'hill', subject: 'tortoise' },
      { text: '兔子回头一看，乌龟还远着呢，就躺在树下睡觉。', scene: 'forest', subject: 'rabbit' },
      { text: '乌龟一步一步往前爬，从兔子身边经过。', scene: 'road', subject: 'tortoise' },
      { text: '兔子醒来再跑，已经来不及了。', scene: 'meadow', subject: 'rabbit' },
      { text: '乌龟先到终点，大家都为它拍手。', scene: 'meadow', subject: 'tortoise' },
    ],
  },
  {
    slug: 'pull-radish', zh: '拔萝卜', pinyin: 'bá luó bo', en: 'Pull the Radish',
    difficulty: 1, moral: '一个人拔不动，大家一起就行。',
    pages: [
      { text: '老公公种了一个萝卜，长得又大又红。', scene: 'garden', subject: 'radish' },
      { text: '老公公拔呀拔，萝卜一动也不动。', scene: 'garden', subject: 'grandpa' },
      { text: '老婆婆来帮忙，两个人一起拔。', scene: 'garden', subject: 'grandma' },
      { text: '小狗跑来咬着老婆婆的衣服，一起往后拉。', scene: 'garden', subject: 'dog' },
      { text: '小猫也来了，大家一二三一起用力。', scene: 'garden', subject: 'cat' },
      { text: '小老鼠最后一个到，萝卜噗地拔出来了。', scene: 'garden', subject: 'mouse' },
    ],
  },
  {
    slug: 'ugly-duckling', zh: '丑小鸭', pinyin: 'chǒu xiǎo yā', en: 'Ugly Duckling',
    difficulty: 2, moral: '现在不一样，不代表以后不漂亮。',
    pages: [
      { text: '鸭妈妈孵出一群小鸭，最后一只灰灰的、大大的。', scene: 'pond', subject: 'duck' },
      { text: '小鸭们都笑它：你好丑啊！它低下了头。', scene: 'pond', subject: 'duckling' },
      { text: '它一个人走开，在芦苇丛里过了一个冬天。', scene: 'snow', subject: 'duckling' },
      { text: '春天来了，它看见水里有几只洁白的大鸟。', scene: 'pond', subject: 'swan' },
      { text: '它低头一看，自己也长出了白色的羽毛。', scene: 'pond', subject: 'swan' },
      { text: '原来它不是丑小鸭，是一只漂亮的天鹅。', scene: 'pond', subject: 'swan' },
    ],
  },
  {
    slug: 'pony-river', zh: '小马过河', pinyin: 'xiǎo mǎ guò hé', en: 'Pony Crosses River',
    difficulty: 2, moral: '别人说的不一定适合自己，试一试才知道。',
    pages: [
      { text: '妈妈让小马把半袋麦子送到磨坊去。', scene: 'meadow', subject: 'pony' },
      { text: '一条小河挡住了路，水哗哗地流。', scene: 'river', subject: 'pony' },
      { text: '松鼠说：水很深，别过去！', scene: 'river', subject: 'squirrel' },
      { text: '老牛说：水很浅，刚到我小腿。', scene: 'river', subject: 'cow' },
      { text: '小马抬起脚，一步一步自己试。', scene: 'river', subject: 'pony' },
      { text: '水刚好到肚子，它顺利过了河。', scene: 'river', subject: 'pony' },
    ],
  },
  {
    slug: 'kitten-fishing', zh: '小猫钓鱼', pinyin: 'xiǎo māo diào yú', en: 'Kitten Goes Fishing',
    difficulty: 1, moral: '做一件事要专心，别一会儿换一样。',
    pages: [
      { text: '猫妈妈带着小猫去河边钓鱼。', scene: 'river', subject: 'cat' },
      { text: '一只蝴蝶飞过来，小猫去追蝴蝶。', scene: 'garden', subject: 'butterfly' },
      { text: '回来一看，妈妈的桶里已经有鱼了。', scene: 'river', subject: 'cat' },
      { text: '一只蜻蜓停在竿上，小猫又去追蜻蜓。', scene: 'river', subject: 'dragonfly' },
      { text: '妈妈轻轻说：钓鱼要一心一意。', scene: 'river', subject: 'cat' },
      { text: '小猫坐好不动，终于钓到一条大鱼。', scene: 'river', subject: 'fish' },
    ],
  },
  {
    slug: 'tadpole-mother', zh: '小蝌蚪找妈妈', pinyin: 'xiǎo kē dǒu zhǎo mā ma', en: 'Tadpoles Find Mother',
    difficulty: 2, moral: '小蝌蚪长大就变成青蛙，模样会变。',
    pages: [
      { text: '池塘里有几只小蝌蚪，长着大脑袋和长尾巴。', scene: 'pond', subject: 'tadpole' },
      { text: '它们问鸭妈妈：你是我们的妈妈吗？', scene: 'pond', subject: 'duck' },
      { text: '鸭妈妈说：你们的妈妈有四条腿。', scene: 'pond', subject: 'tadpole' },
      { text: '它们长出两条后腿，又去问鱼妈妈。', scene: 'pond', subject: 'fish' },
      { text: '尾巴慢慢变短，四条腿都长齐了。', scene: 'pond', subject: 'frog' },
      { text: '荷叶上蹲着一只青蛙，正是它们的妈妈。', scene: 'pond', subject: 'frog' },
    ],
  },
  {
    slug: 'monkeys-moon', zh: '猴子捞月', pinyin: 'hóu zi lāo yuè', en: 'Monkeys Catch Moon',
    difficulty: 2, moral: '井里的月亮只是影子，看东西要抬头看清楚。',
    pages: [
      { text: '晚上，小猴子在井边玩，看见井里有个月亮。', scene: 'night', subject: 'monkey' },
      { text: '它叫来伙伴：月亮掉到井里了！', scene: 'night', subject: 'monkey' },
      { text: '猴子们一只拉着另一只，垂到井里去捞。', scene: 'night', subject: 'moon' },
      { text: '手一碰水，月亮就碎成了一片一片。', scene: 'night', subject: 'water' },
      { text: '它们抬头一看，月亮好好地挂在天上。', scene: 'night', subject: 'moon' },
      { text: '猴子们笑了：原来井里的是影子。', scene: 'night', subject: 'monkey' },
    ],
  },
  {
    slug: 'crow-water', zh: '乌鸦喝水', pinyin: 'wū yā hē shuǐ', en: 'Crow Drinks Water',
    difficulty: 2, moral: '遇到难题先想办法，一点一点也能做成。',
    pages: [
      { text: '一只乌鸦飞了很久，口渴得厉害。', scene: 'meadow', subject: 'crow' },
      { text: '它找到一个瓶子，瓶里有水。', scene: 'meadow', subject: 'bottle' },
      { text: '可是瓶口太小，水位太低，喝不到。', scene: 'meadow', subject: 'crow' },
      { text: '它叼起一颗小石子，丢进瓶子里。', scene: 'meadow', subject: 'stone' },
      { text: '一颗又一颗，水慢慢升上来了。', scene: 'meadow', subject: 'stone' },
      { text: '乌鸦低下头，痛痛快快喝了个饱。', scene: 'meadow', subject: 'crow' },
    ],
  },
  {
    slug: 'fox-crow', zh: '狐狸和乌鸦', pinyin: 'hú li hé wū yā', en: 'Fox and Crow',
    difficulty: 2, moral: '好听的话先想一想，别一高兴就张嘴。',
    pages: [
      { text: '乌鸦叼着一块肉，停在树枝上。', scene: 'forest', subject: 'crow' },
      { text: '狐狸走过来，抬头说：你的羽毛真漂亮！', scene: 'forest', subject: 'fox' },
      { text: '乌鸦听了，心里美滋滋的。', scene: 'forest', subject: 'crow' },
      { text: '狐狸又说：你的歌声一定很好听。', scene: 'forest', subject: 'fox' },
      { text: '乌鸦一张嘴，哇的一声，肉掉下去了。', scene: 'forest', subject: 'meat' },
      { text: '狐狸叼起肉跑了，乌鸦明白了：好听的话要想一想。', scene: 'forest', subject: 'fox' },
    ],
  },
  {
    slug: 'waiting-hare', zh: '守株待兔', pinyin: 'shǒu zhū dài tù', en: 'The Waiting Farmer',
    difficulty: 3, moral: '靠运气等不来收获，动手做才有。',
    pages: [
      { text: '农夫在田里锄草，一只兔子撞在树桩上。', scene: 'farm', subject: 'farmer' },
      { text: '他捡起兔子，高兴地回家去了。', scene: 'farm', subject: 'hare' },
      { text: '第二天，他不再锄草，坐在树桩旁等。', scene: 'farm', subject: 'farmer' },
      { text: '等了一天又一天，兔子再也没来。', scene: 'farm', subject: 'tree' },
      { text: '田里的草越长越高，庄稼也黄了。', scene: 'farm', subject: 'grass' },
      { text: '农夫叹口气：光等是不行的。', scene: 'farm', subject: 'farmer' },
    ],
  },
  {
    slug: 'frog-well', zh: '井底之蛙', pinyin: 'jǐng dǐ zhī wā', en: 'Frog in Well',
    difficulty: 3, moral: '世界很大，多出去看看才知道。',
    pages: [
      { text: '一只青蛙住在井里，觉得井就是整个世界。', scene: 'cave', subject: 'frog' },
      { text: '一只小鸟飞来，停在井边喝水。', scene: 'hill', subject: 'bird' },
      { text: '青蛙问：天上有多大？小鸟说：大得望不到边。', scene: 'cave', subject: 'frog' },
      { text: '小鸟说：你出来看看就知道了。', scene: 'hill', subject: 'bird' },
      { text: '青蛙费了好大劲，终于爬出井口。', scene: 'meadow', subject: 'frog' },
      { text: '它看见天和地，惊讶得说不出话。', scene: 'meadow', subject: 'frog' },
    ],
  },
  {
    slug: 'sheep-fold', zh: '亡羊补牢', pinyin: 'wáng yáng bǔ láo', en: 'Mend the Fold',
    difficulty: 3, moral: '发现漏洞马上补，后面的损失就少了。',
    pages: [
      { text: '牧羊人早上发现羊圈破了个洞，少了一只羊。', scene: 'farm', subject: 'sheep' },
      { text: '邻居说：快把洞补上吧。', scene: 'farm', subject: 'farmer' },
      { text: '他想：羊都丢了，补也没用。', scene: 'farm', subject: 'sheep' },
      { text: '第二天，狼又从洞里叼走了一只羊。', scene: 'farm', subject: 'wolf' },
      { text: '他赶紧找木板，把洞结结实实钉好。', scene: 'farm', subject: 'wood' },
      { text: '从此狼再也进不来，羊一只也没丢。', scene: 'farm', subject: 'sheep' },
    ],
  },
  {
    slug: 'boy-wolf', zh: '狼来了', pinyin: 'láng lái le', en: 'Wolf Is Coming',
    difficulty: 2, moral: '说谎会失去别人的信任，说真话才有人帮。',
    pages: [
      { text: '小男孩在山坡上放羊，觉得有点无聊。', scene: 'hill', subject: 'boy' },
      { text: '他大声喊：狼来了！狼来了！', scene: 'hill', subject: 'boy' },
      { text: '大人们拿着棍子跑来，一只狼也没有。', scene: 'hill', subject: 'farmer' },
      { text: '第二次他又喊，大人们又跑了一趟。', scene: 'hill', subject: 'boy' },
      { text: '有一天狼真的来了，他喊破了嗓子。', scene: 'hill', subject: 'wolf' },
      { text: '大家赶来时狼已经跑了，小男孩说：我以后不说谎了。', scene: 'hill', subject: 'boy' },
    ],
  },
  {
    slug: 'snow-child', zh: '雪孩子', pinyin: 'xuě hái zi', en: 'Snow Child',
    difficulty: 2, moral: '雪孩子帮助了朋友，变成了天上的云。',
    pages: [
      { text: '下雪了，小兔在门口堆了一个雪孩子。', scene: 'snow', subject: 'snowman' },
      { text: '雪孩子有胡萝卜鼻子，还会笑。', scene: 'snow', subject: 'rabbit' },
      { text: '小兔回屋睡觉，炉子里的火烧着了木头。', scene: 'room', subject: 'fire' },
      { text: '雪孩子看见烟，冲进屋里救小兔。', scene: 'house', subject: 'snowman' },
      { text: '小兔得救了，雪孩子却越来越小。', scene: 'snow', subject: 'water' },
      { text: '太阳出来，雪孩子变成了天上的白云。', scene: 'snow', subject: 'cloud' },
    ],
  },
  {
    slug: 'fisherman-fish', zh: '渔夫和金鱼', pinyin: 'yú fū hé jīn yú', en: 'The Golden Fish',
    difficulty: 3, moral: '想要太多，最后什么也留不住。',
    pages: [
      { text: '老渔夫撒下网，捞上来一条金色的鱼。', scene: 'sea', subject: 'goldfish' },
      { text: '金鱼说：放我回去吧，我会报答你。', scene: 'sea', subject: 'fisherman' },
      { text: '老太婆说：去要一只新木盆。', scene: 'house', subject: 'pot' },
      { text: '有了木盆，她又想要一座大房子。', scene: 'house', subject: 'house' },
      { text: '有了房子，她还想要一座宫殿。', scene: 'castle', subject: 'castle' },
      { text: '渔夫回到海边，一切又变回原来的样子。', scene: 'sea', subject: 'fisherman' },
    ],
  },
  {
    slug: 'golden-axe', zh: '金斧头', pinyin: 'jīn fǔ tou', en: 'The Golden Axe',
    difficulty: 2, moral: '诚实的人，别人愿意给他更多。',
    pages: [
      { text: '樵夫的铁斧头掉进了河里。', scene: 'river', subject: 'axe' },
      { text: '河神托起一把金斧头，问：这是你的吗？', scene: 'river', subject: 'elder' },
      { text: '樵夫摇摇头：不是，我的是一把铁斧头。', scene: 'river', subject: 'elder' },
      { text: '河神又拿出一把银斧头，他还是摇头。', scene: 'river', subject: 'axe' },
      { text: '河神把铁斧头还给他，还送了金斧头。', scene: 'river', subject: 'elder' },
      { text: '樵夫说：诚实最让人安心。', scene: 'river', subject: 'axe' },
    ],
  },
  {
    slug: 'gecko-tail', zh: '小壁虎借尾巴', pinyin: 'xiǎo bì hǔ jiè wěi ba', en: 'A Gecko Tail',
    difficulty: 2, moral: '别人的尾巴有自己的用处，自己的也会长回来。',
    pages: [
      { text: '小壁虎在墙上爬，被蛇咬住了尾巴。', scene: 'house', subject: 'gecko' },
      { text: '它一挣，尾巴断了，赶紧跑开。', scene: 'house', subject: 'gecko' },
      { text: '它问老牛：能借我尾巴吗？', scene: 'meadow', subject: 'cow' },
      { text: '老牛说：我要用尾巴赶苍蝇呢。', scene: 'meadow', subject: 'cow' },
      { text: '它又问小鱼：能借我尾巴吗？', scene: 'pond', subject: 'fish' },
      { text: '回到家，它发现自己又长出了一条新尾巴。', scene: 'house', subject: 'gecko' },
    ],
  },
  {
    slug: 'plop', zh: '咕咚来了', pinyin: 'gū dōng lái le', en: 'Here Comes Plop',
    difficulty: 2, moral: '听来的事要自己看一眼，别跟着乱跑。',
    pages: [
      { text: '一只木瓜掉进池塘，咕咚一声。', scene: 'pond', subject: 'papaya' },
      { text: '小兔吓得边跑边喊：咕咚来了！', scene: 'meadow', subject: 'rabbit' },
      { text: '狐狸、小猴也跟着跑起来。', scene: 'forest', subject: 'fox' },
      { text: '大熊拦住大家：咕咚是什么样子？', scene: 'forest', subject: 'bear' },
      { text: '它们回到池塘边，又一只木瓜掉下来。', scene: 'pond', subject: 'papaya' },
      { text: '大家笑了：原来是木瓜落水的声音。', scene: 'pond', subject: 'rabbit' },
    ],
  },
];

/** 生活习惯 15 个：一步一步做，孩子能照做 */
export const HABIT_STORIES: readonly StoryRow[] = [
  {
    slug: 'brush-teeth', zh: '小熊刷牙', pinyin: 'xiǎo xióng shuā yá', en: 'Bear Brushes Teeth',
    difficulty: 1, moral: '早晚都刷牙，牙齿才会白白的。',
    pages: [
      { text: '小熊爱吃蜂蜜，牙齿上粘粘的。', scene: 'kitchen', subject: 'bear' },
      { text: '晚上，妈妈说：该刷牙了。', scene: 'room', subject: 'mom' },
      { text: '小熊挤上一点点牙膏，接一杯水。', scene: 'room', subject: 'toothbrush' },
      { text: '上上下下，里里外外，刷满二十下。', scene: 'room', subject: 'bear' },
      { text: '漱漱口，把泡泡吐进水槽。', scene: 'room', subject: 'cup' },
      { text: '小熊张嘴笑，牙齿白白的真好看。', scene: 'room', subject: 'bear' },
    ],
  },
  {
    slug: 'wash-hands', zh: '洗手歌', pinyin: 'xǐ shǒu gē', en: 'Wash Your Hands',
    difficulty: 1, moral: '吃东西以前，先把小手洗干净。',
    pages: [
      { text: '小手上沾了泥，还有一点饭粒。', scene: 'garden', subject: 'hands' },
      { text: '妈妈说：先把手洗一洗。', scene: 'room', subject: 'soap' },
      { text: '打湿小手，抹上香香的肥皂。', scene: 'room', subject: 'soap' },
      { text: '手心搓搓，手背搓搓，手指缝也搓搓。', scene: 'room', subject: 'hands' },
      { text: '清水冲干净，甩一甩。', scene: 'room', subject: 'water' },
      { text: '小手干净了，可以吃饭啦。', scene: 'kitchen', subject: 'bowl' },
    ],
  },
  {
    slug: 'tidy-toys', zh: '收玩具', pinyin: 'shōu wán jù', en: 'Put Toys Away',
    difficulty: 1, moral: '玩具放回原处，明天一找就到。',
    pages: [
      { text: '玩了一天，地上全是积木和小车。', scene: 'room', subject: 'blocks' },
      { text: '妈妈说：玩具也要回家睡觉了。', scene: 'room', subject: 'mom' },
      { text: '小熊把积木一块一块放进盒子。', scene: 'room', subject: 'blocks' },
      { text: '小兔把小车排成一排，推进柜子。', scene: 'room', subject: 'car' },
      { text: '找不到的球，在沙发底下滚了出来。', scene: 'room', subject: 'ball' },
      { text: '房间整整齐齐，明天再玩更好找。', scene: 'room', subject: 'teddy' },
    ],
  },
  {
    slug: 'early-sleep', zh: '早睡早起', pinyin: 'zǎo shuì zǎo qǐ', en: 'Early to Bed',
    difficulty: 1, moral: '睡得早，早上才有力气玩。',
    pages: [
      { text: '天黑了，窗外亮起一颗小星星。', scene: 'night', subject: 'star' },
      { text: '小猪还想玩，打了一个大大的哈欠。', scene: 'room', subject: 'pig' },
      { text: '妈妈关掉大灯，开了一盏小夜灯。', scene: 'room', subject: 'lamp' },
      { text: '洗洗脸，刷刷牙，换上睡衣。', scene: 'room', subject: 'clothes' },
      { text: '躺在床上，听妈妈讲一个故事。', scene: 'room', subject: 'book' },
      { text: '太阳出来时，小猪自己醒了。', scene: 'meadow', subject: 'sun' },
    ],
  },
  {
    slug: 'eat-properly', zh: '好好吃饭', pinyin: 'hǎo hǎo chī fàn', en: 'Eat Your Meal',
    difficulty: 1, moral: '坐下来一口一口吃，饭才不会撒。',
    pages: [
      { text: '开饭了，桌上有米饭、青菜和鸡蛋。', scene: 'kitchen', subject: 'rice' },
      { text: '小猫一边吃一边跑，饭粒撒了一地。', scene: 'kitchen', subject: 'cat' },
      { text: '妈妈说：坐下来，慢慢吃。', scene: 'kitchen', subject: 'mom' },
      { text: '小猫坐好，用小勺子一口一口吃。', scene: 'kitchen', subject: 'spoon' },
      { text: '蔬菜也尝一尝，味道还不错。', scene: 'kitchen', subject: 'broccoli' },
      { text: '吃完把碗放好，说：我吃饱了。', scene: 'kitchen', subject: 'bowl' },
    ],
  },
  {
    slug: 'drink-water', zh: '多喝水', pinyin: 'duō hē shuǐ', en: 'Drink More Water',
    difficulty: 1, moral: '出汗以后喝口水，身体更舒服。',
    pages: [
      { text: '太阳很大，小狗在外面跑来跑去。', scene: 'meadow', subject: 'dog' },
      { text: '它吐着舌头，觉得口干干的。', scene: 'meadow', subject: 'sun' },
      { text: '妈妈递来一杯温温的水。', scene: 'house', subject: 'cup' },
      { text: '小狗咕嘟咕嘟喝下半杯。', scene: 'house', subject: 'water' },
      { text: '玩一会儿，再喝一口水。', scene: 'garden', subject: 'dog' },
      { text: '喝够水，小狗又有力气跑啦。', scene: 'meadow', subject: 'dog' },
    ],
  },
  {
    slug: 'dress-myself', zh: '自己穿衣服', pinyin: 'zì jǐ chuān yī fu', en: 'Dress Myself',
    difficulty: 2, moral: '一件一件慢慢来，自己也能穿好。',
    pages: [
      { text: '早上起床，小兔想自己穿衣服。', scene: 'room', subject: 'rabbit' },
      { text: '先套上头，再伸进两只手。', scene: 'room', subject: 'clothes' },
      { text: '扣子一颗一颗扣好。', scene: 'room', subject: 'clothes' },
      { text: '裤子两条腿，一条一条伸进去。', scene: 'room', subject: 'clothes' },
      { text: '鞋子分左右，粘扣拉一拉。', scene: 'room', subject: 'shoes' },
      { text: '穿好了，小兔对着镜子笑。', scene: 'room', subject: 'rabbit' },
    ],
  },
  {
    slug: 'potty', zh: '上厕所', pinyin: 'shàng cè suǒ', en: 'Go Potty',
    difficulty: 1, moral: '想上厕所马上说，不用憋着。',
    pages: [
      { text: '小猴玩着玩着，忽然扭来扭去。', scene: 'room', subject: 'monkey' },
      { text: '他说：妈妈，我想上厕所。', scene: 'room', subject: 'potty' },
      { text: '坐上小马桶，裤子拉到膝盖。', scene: 'room', subject: 'potty' },
      { text: '好啦，用纸巾擦一擦。', scene: 'room', subject: 'potty' },
      { text: '冲一冲水，把裤子穿好。', scene: 'room', subject: 'water' },
      { text: '洗洗手，小猴又去玩了。', scene: 'room', subject: 'monkey' },
    ],
  },
  {
    slug: 'line-up', zh: '排队一个接一个', pinyin: 'pái duì yī gè jiē yī gè', en: 'Line Up Please',
    difficulty: 2, moral: '一个接一个，每个人都玩得到。',
    pages: [
      { text: '滑梯前来了好多小朋友。', scene: 'garden', subject: 'playground' },
      { text: '大家挤在一起，谁也上不去。', scene: 'garden', subject: 'kid' },
      { text: '老师说：一个接一个，排好队。', scene: 'garden', subject: 'teacher' },
      { text: '小兔站在小猴后面，小狗站在最后。', scene: 'garden', subject: 'rabbit' },
      { text: '一个滑下来，下一个再上去。', scene: 'garden', subject: 'playground' },
      { text: '排队玩，每个人都玩到了。', scene: 'garden', subject: 'kid' },
    ],
  },
  {
    slug: 'share-toys', zh: '一起分享', pinyin: 'yī qǐ fēn xiǎng', en: 'Share Together',
    difficulty: 2, moral: '一起玩，比一个人抱着更有意思。',
    pages: [
      { text: '小兔有一辆红色的小车。', scene: 'room', subject: 'car' },
      { text: '小熊想玩，伸手来拿。', scene: 'room', subject: 'bear' },
      { text: '小兔抱住小车：这是我的！', scene: 'room', subject: 'rabbit' },
      { text: '小熊低下头，坐到一边去了。', scene: 'room', subject: 'bear' },
      { text: '小兔想了想，把车推过去：我们一起玩。', scene: 'room', subject: 'car' },
      { text: '两个人轮流开，笑声传得很远。', scene: 'room', subject: 'rabbit' },
    ],
  },
  {
    slug: 'no-picky', zh: '不挑食', pinyin: 'bù tiāo shí', en: 'No Picky Eating',
    difficulty: 2, moral: '先尝一小口，说不定就喜欢了。',
    pages: [
      { text: '饭桌上有绿色的青菜，小熊不想吃。', scene: 'kitchen', subject: 'bear' },
      { text: '他把青菜挑到盘子边上。', scene: 'kitchen', subject: 'broccoli' },
      { text: '妈妈说：尝一小口，就一口。', scene: 'kitchen', subject: 'mom' },
      { text: '小熊咬了一口，脆脆的，有点甜。', scene: 'kitchen', subject: 'bear' },
      { text: '他又吃了第二口、第三口。', scene: 'kitchen', subject: 'broccoli' },
      { text: '盘子空了，小熊说：青菜也好吃。', scene: 'kitchen', subject: 'bowl' },
    ],
  },
  {
    slug: 'traffic-light', zh: '过马路', pinyin: 'guò mǎ lù', en: 'Cross the Road',
    difficulty: 2, moral: '红灯停、绿灯走，手拉手过斑马线。',
    pages: [
      { text: '妈妈牵着小手，走到马路边。', scene: 'road', subject: 'road' },
      { text: '前面是红灯，车子呼呼地过。', scene: 'road', subject: 'light' },
      { text: '小兔想跑，妈妈说：等一等。', scene: 'road', subject: 'rabbit' },
      { text: '绿灯亮了，先看左边，再看右边。', scene: 'road', subject: 'light' },
      { text: '手拉手，走斑马线，不快也不慢。', scene: 'road', subject: 'road' },
      { text: '到了对面，小兔说：红灯要停，绿灯才走。', scene: 'road', subject: 'rabbit' },
    ],
  },
  {
    slug: 'trash-home', zh: '垃圾回家', pinyin: 'lā jī huí jiā', en: 'Trash Goes Home',
    difficulty: 1, moral: '垃圾丢进桶里，草地才干干净净。',
    pages: [
      { text: '小猴吃完香蕉，皮拿在手里。', scene: 'garden', subject: 'banana' },
      { text: '他看见地上有果皮和纸团。', scene: 'garden', subject: 'trash' },
      { text: '妈妈说：垃圾也有自己的家。', scene: 'garden', subject: 'mom' },
      { text: '小猴把香蕉皮放进垃圾桶。', scene: 'garden', subject: 'trash' },
      { text: '又把纸团捡起来，一起丢进去。', scene: 'garden', subject: 'trash' },
      { text: '草地干干净净，大家走着都舒服。', scene: 'garden', subject: 'monkey' },
    ],
  },
  {
    slug: 'pack-bag', zh: '整理书包', pinyin: 'zhěng lǐ shū bāo', en: 'Pack My Bag',
    difficulty: 2, moral: '前一晚收好，早上出门不慌张。',
    pages: [
      { text: '明天要上学，小兔自己整理书包。', scene: 'room', subject: 'bag' },
      { text: '先放课本，再放铅笔和橡皮。', scene: 'room', subject: 'book' },
      { text: '水壶放在侧袋，别漏水。', scene: 'room', subject: 'bottle' },
      { text: '纸巾和小毛巾也带上。', scene: 'room', subject: 'towel' },
      { text: '拉好拉链，把书包放在门口。', scene: 'room', subject: 'bag' },
      { text: '早上背起来就走，一样也没忘。', scene: 'school', subject: 'rabbit' },
    ],
  },
  {
    slug: 'no-late', zh: '上学不迟到', pinyin: 'shàng xué bù chí dào', en: 'Never Be Late',
    difficulty: 2, moral: '听到闹钟就起，路上不玩就能准时。',
    pages: [
      { text: '闹钟响了，小熊还想再睡一会儿。', scene: 'room', subject: 'clock' },
      { text: '妈妈拉开窗帘：太阳都出来了。', scene: 'room', subject: 'sun' },
      { text: '他快快穿衣、洗脸、吃早饭。', scene: 'kitchen', subject: 'bear' },
      { text: '背上书包，和妈妈一起出门。', scene: 'road', subject: 'bag' },
      { text: '路上不玩，一直往前走。', scene: 'road', subject: 'bear' },
      { text: '到教室时，铃还没响，小熊笑了。', scene: 'school', subject: 'school' },
    ],
  },
];

/** 情绪社交 10 个：先说出感受，再想办法 */
export const FEELING_STORIES: readonly StoryRow[] = [
  {
    slug: 'angry-lion', zh: '我生气了', pinyin: 'wǒ shēng qì le', en: 'I Am Angry',
    difficulty: 2, moral: '生气了先深呼吸，再慢慢说。',
    pages: [
      { text: '小狮子搭的积木塔倒了。', scene: 'room', subject: 'lion' },
      { text: '他握紧拳头，脸涨得红红的。', scene: 'room', subject: 'lion' },
      { text: '妈妈蹲下来说：我知道你生气了。', scene: 'room', subject: 'mom' },
      { text: '我们一起深呼吸，吸气，呼气。', scene: 'room', subject: 'lion' },
      { text: '小狮子数到十，拳头慢慢松开了。', scene: 'room', subject: 'lion' },
      { text: '他重新搭起积木，这次搭得更稳。', scene: 'room', subject: 'blocks' },
    ],
  },
  {
    slug: 'afraid-dark', zh: '怕黑的小兔', pinyin: 'pà hēi de xiǎo tù', en: 'Rabbit Fears Dark',
    difficulty: 2, moral: '黑的地方没有怪物，妈妈就在旁边。',
    pages: [
      { text: '关灯了，房间里黑黑的。', scene: 'night', subject: 'rabbit' },
      { text: '小兔把被子拉到眼睛上面。', scene: 'room', subject: 'rabbit' },
      { text: '妈妈说：我在这儿，门开着一条缝。', scene: 'room', subject: 'mom' },
      { text: '月光照进来，墙上有树的影子。', scene: 'night', subject: 'moon' },
      { text: '小兔数着窗外的小星星：一、二、三。', scene: 'night', subject: 'star' },
      { text: '数着数着，它就睡着了。', scene: 'night', subject: 'rabbit' },
    ],
  },
  {
    slug: 'miss-mom', zh: '想妈妈', pinyin: 'xiǎng mā ma', en: 'Missing Mom',
    difficulty: 1, moral: '想妈妈的时候，可以先做点别的事等她。',
    pages: [
      { text: '妈妈去上班，小熊站在门口。', scene: 'house', subject: 'bear' },
      { text: '门关上了，他的眼睛红红的。', scene: 'house', subject: 'mom' },
      { text: '奶奶抱抱他：妈妈下午就回来。', scene: 'house', subject: 'grandma' },
      { text: '小熊画了一张画，画上有妈妈。', scene: 'room', subject: 'drawing' },
      { text: '他把画贴在冰箱上，等妈妈看。', scene: 'kitchen', subject: 'drawing' },
      { text: '门开了，妈妈回来了，小熊跑过去抱住她。', scene: 'house', subject: 'mom' },
    ],
  },
  {
    slug: 'grab-toy', zh: '抢玩具', pinyin: 'qiǎng wán jù', en: 'Grabbing Toys',
    difficulty: 2, moral: '轮流玩，一个球两个人都开心。',
    pages: [
      { text: '小鸭和小鸡都想玩同一个球。', scene: 'garden', subject: 'ball' },
      { text: '两只小手一起抓住，谁也不放。', scene: 'garden', subject: 'duck' },
      { text: '球啪地掉在地上，滚远了。', scene: 'garden', subject: 'ball' },
      { text: '小鸭说：我们轮流玩吧。', scene: 'garden', subject: 'duck' },
      { text: '小鸡先玩三下，再给小鸭三下。', scene: 'garden', subject: 'chick' },
      { text: '一个球，两个人，玩得更开心。', scene: 'garden', subject: 'ball' },
    ],
  },
  {
    slug: 'say-sorry', zh: '说对不起', pinyin: 'shuō duì bu qǐ', en: 'Say Sorry',
    difficulty: 2, moral: '一句对不起，能把朋友找回来。',
    pages: [
      { text: '小兔跑得太快，撞倒了小熊的积木。', scene: 'room', subject: 'rabbit' },
      { text: '积木散了一地，小熊愣住了。', scene: 'room', subject: 'bear' },
      { text: '小兔站住，小声说：对不起。', scene: 'room', subject: 'rabbit' },
      { text: '小熊看看他，说：没关系。', scene: 'room', subject: 'bear' },
      { text: '两个人一起把积木捡起来。', scene: 'room', subject: 'blocks' },
      { text: '他们又一起搭了一座高高的塔。', scene: 'room', subject: 'blocks' },
    ],
  },
  {
    slug: 'new-friend', zh: '交新朋友', pinyin: 'jiāo xīn péng you', en: 'Making New Friends',
    difficulty: 2, moral: '走过去问一句，就能多一个朋友。',
    pages: [
      { text: '搬家了，小狐狸站在新院子里。', scene: 'house', subject: 'fox' },
      { text: '外面有小朋友在玩球，他不敢过去。', scene: 'garden', subject: 'ball' },
      { text: '他捡起滚到脚边的球，走了过去。', scene: 'garden', subject: 'fox' },
      { text: '我可以一起玩吗？他小声问。', scene: 'garden', subject: 'kid' },
      { text: '小狗说：当然可以！', scene: 'garden', subject: 'dog' },
      { text: '太阳下山时，他们已经成了好朋友。', scene: 'garden', subject: 'fox' },
    ],
  },
  {
    slug: 'left-out', zh: '被拒绝了', pinyin: 'bèi jù jué le', en: 'Left Out',
    difficulty: 2, moral: '被拒绝不是自己不好，可以再加入另一队。',
    pages: [
      { text: '小羊想加入跳房子的游戏。', scene: 'garden', subject: 'sheep' },
      { text: '小朋友说：人够了，不要你。', scene: 'garden', subject: 'kid' },
      { text: '小羊站在一边，心里酸酸的。', scene: 'garden', subject: 'sheep' },
      { text: '老师看见了，说：我们再开一队吧。', scene: 'garden', subject: 'teacher' },
      { text: '小羊跳得又稳又远，大家都鼓掌。', scene: 'garden', subject: 'sheep' },
      { text: '下课时，有人来拉他的手：明天还一起玩。', scene: 'garden', subject: 'kid' },
    ],
  },
  {
    slug: 'lose-game', zh: '输了不哭', pinyin: 'shū le bù kū', en: 'Lose Without Tears',
    difficulty: 2, moral: '输一次没关系，练一练就会进步。',
    pages: [
      { text: '小马和小狗比赛跑步。', scene: 'meadow', subject: 'pony' },
      { text: '小狗跑得快，先到了终点。', scene: 'meadow', subject: 'dog' },
      { text: '小马慢了一步，低着头不说话。', scene: 'meadow', subject: 'pony' },
      { text: '小狗说：你刚才跑得好快！', scene: 'meadow', subject: 'dog' },
      { text: '小马抬起头：下次我再练一练。', scene: 'meadow', subject: 'pony' },
      { text: '他们又跑了一次，这次两个人都笑了。', scene: 'meadow', subject: 'pony' },
    ],
  },
  {
    slug: 'wait-turn', zh: '等一等', pinyin: 'děng yī děng', en: 'Wait Your Turn',
    difficulty: 2, moral: '等一会儿，轮到自己时更开心。',
    pages: [
      { text: '秋千只有一个，小兔跑得最快。', scene: 'garden', subject: 'playground' },
      { text: '小熊来晚了，站在旁边看。', scene: 'garden', subject: 'bear' },
      { text: '小兔荡了十下，就下来了。', scene: 'garden', subject: 'rabbit' },
      { text: '轮到你啦。她把秋千推给小熊。', scene: 'garden', subject: 'playground' },
      { text: '小熊荡的时候，小兔在旁边数。', scene: 'garden', subject: 'bear' },
      { text: '一人一会儿，两个人都玩到了。', scene: 'garden', subject: 'playground' },
    ],
  },
  {
    slug: 'care-others', zh: '关心别人', pinyin: 'guān xīn bié rén', en: 'Care for Others',
    difficulty: 2, moral: '把伞往别人那边偏一点，就是关心。',
    pages: [
      { text: '下雨了，小猫没有带伞。', scene: 'rain', subject: 'cat' },
      { text: '它站在屋檐下，抱着书包。', scene: 'rain', subject: 'umbrella' },
      { text: '小狗跑过来：我们一起走吧。', scene: 'rain', subject: 'dog' },
      { text: '一把伞有点小，小狗把伞往小猫那边偏。', scene: 'rain', subject: 'umbrella' },
      { text: '到门口时，小狗的肩膀湿了一片。', scene: 'rain', subject: 'dog' },
      { text: '小猫说：谢谢你，明天我带你。', scene: 'rain', subject: 'cat' },
    ],
  },
];

/** 自然认知 5 个：看得见的自然现象 */
export const NATURE_STORIES: readonly StoryRow[] = [
  {
    slug: 'seed-sprout', zh: '小种子发芽', pinyin: 'xiǎo zhǒng zi fā yá', en: 'A Seed Sprouts',
    difficulty: 1, moral: '种子喝水晒太阳，就会长出小叶子。',
    pages: [
      { text: '一颗小种子躺在泥土里。', scene: 'garden', subject: 'seed' },
      { text: '春雨落下来，泥土湿湿的。', scene: 'rain', subject: 'rain' },
      { text: '小种子喝饱了水，鼓起了肚子。', scene: 'garden', subject: 'seed' },
      { text: '它顶开泥土，冒出两片小叶子。', scene: 'garden', subject: 'sprout' },
      { text: '太阳照着它，叶子一天天变多。', scene: 'garden', subject: 'sun' },
      { text: '后来，它开出了一朵小黄花。', scene: 'garden', subject: 'flower' },
    ],
  },
  {
    slug: 'four-seasons', zh: '四季的歌', pinyin: 'sì jì de gē', en: 'Song of Seasons',
    difficulty: 2, moral: '春夏秋冬轮流转，一年又一年。',
    pages: [
      { text: '春天来了，树枝上冒出绿芽。', scene: 'meadow', subject: 'sprout' },
      { text: '夏天的太阳很热，知了在树上叫。', scene: 'forest', subject: 'sun' },
      { text: '秋天到了，叶子变成红色和黄色。', scene: 'forest', subject: 'leaves' },
      { text: '风一吹，叶子一片片落下来。', scene: 'forest', subject: 'leaves' },
      { text: '冬天来了，雪花轻轻地飘。', scene: 'snow', subject: 'snowflake' },
      { text: '四季轮流转，一年又一年。', scene: 'snow', subject: 'tree' },
    ],
  },
  {
    slug: 'where-rain', zh: '雨从哪里来', pinyin: 'yǔ cóng nǎ lǐ lái', en: 'Where Rain Comes',
    difficulty: 2, moral: '水飞到天上变成云，云重了就下雨。',
    pages: [
      { text: '天空飘来一朵灰灰的云。', scene: 'rain', subject: 'cloud' },
      { text: '云里藏着许多小水珠。', scene: 'rain', subject: 'water' },
      { text: '水珠越来越多，抱在一起。', scene: 'rain', subject: 'cloud' },
      { text: '它们太重了，就从云里落下来。', scene: 'rain', subject: 'rain' },
      { text: '雨水落进小河，流进大海。', scene: 'river', subject: 'water' },
      { text: '太阳一晒，水又变成水汽飞上天。', scene: 'meadow', subject: 'sun' },
    ],
  },
  {
    slug: 'moon-round', zh: '月亮变圆了', pinyin: 'yuè liang biàn yuán le', en: 'Moon Grows Round',
    difficulty: 2, moral: '月亮每天都在变，月中最圆最亮。',
    pages: [
      { text: '晚上，小兔抬头看月亮。', scene: 'night', subject: 'moon' },
      { text: '今天的月亮弯弯的，像一条小船。', scene: 'night', subject: 'moon' },
      { text: '一天一天过去，月亮胖了一点。', scene: 'night', subject: 'moon' },
      { text: '到了月中，月亮变得又圆又亮。', scene: 'night', subject: 'moon' },
      { text: '后来又慢慢变瘦，成了弯弯的月牙。', scene: 'night', subject: 'moon' },
      { text: '妈妈说：月亮每个月都会变一次魔法。', scene: 'night', subject: 'rabbit' },
    ],
  },
  {
    slug: 'ants-move', zh: '蚂蚁搬家', pinyin: 'mǎ yǐ bān jiā', en: 'Ants Move House',
    difficulty: 2, moral: '下雨前蚂蚁搬家，是为了不挨水浸。',
    pages: [
      { text: '草地上，一队小蚂蚁排着走。', scene: 'garden', subject: 'ant' },
      { text: '每只蚂蚁头上都顶着一粒米。', scene: 'garden', subject: 'ant' },
      { text: '天边飘来乌云，要下雨了。', scene: 'rain', subject: 'cloud' },
      { text: '它们把家搬到高高的土坡上。', scene: 'hill', subject: 'ant' },
      { text: '大雨哗哗地下，低处的洞被水淹了。', scene: 'rain', subject: 'rain' },
      { text: '蚂蚁们在新的家里，安安全全。', scene: 'hill', subject: 'ant' },
    ],
  },
];

/** 组 key → 故事数组。顺序即分类页 chips 顺序（由易到难）；key 加 story- 前缀，避开汉字组 nature 同名 */
export const STORY_GROUP_SOURCES: readonly (readonly [string, readonly StoryRow[]])[] = [
  ['story-fairy', FAIRY_STORIES],
  ['story-habit', HABIT_STORIES],
  ['story-feeling', FEELING_STORIES],
  ['story-nature', NATURE_STORIES],
];

/** 种子里所有故事（供内容门禁与测试统计） */
export const ALL_STORIES: readonly StoryRow[] = STORY_GROUP_SOURCES.flatMap(([, rows]) => rows);

/** 组装为卡片：封面 + 每页一图（路径规则见文件头注释） */
export function buildStories(rows: readonly StoryRow[]): Card[] {
  return rows.map((row, index) => ({
    id: `stories-${row.slug}`,
    kind: 'story',
    categoryId: 'stories',
    zh: row.zh,
    pinyin: row.pinyin,
    en: row.en,
    image: `${IMAGE_ROOT}/${row.slug}/cover.webp`,
    tags: [],
    difficulty: row.difficulty,
    sortOrder: index + 1,
    pages: row.pages.map((page) => ({ text: page.text })),
    moral: row.moral,
    source: { provider: 'generated', license: 'AI 生成素材，仅限本项目使用' },
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  }));
}
