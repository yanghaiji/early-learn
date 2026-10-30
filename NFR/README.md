# 技术总览（NFR Overview）

> 本目录存放全部**技术设计**文档。遵循 `agent/规约.md`：技术设计统一放在 `NFR/` 下、按版本管理，并在本文件维护**总项目预览**。

| 项 | 内容 |
| --- | --- |
| 项目 | 童识 · 认知卡片（工程代号 `early-learn`） |
| 技术定位 | 纯前端单页应用（SPA）+ 静态托管 |
| 当前版本 | v0.3.3（v0.3 完成故事 50 张逐张体检 + 全站 501 张卡片 / 30 张诗词同族画风；v0.3.1 把 22 张动物卡改为“剪影可分辨”；v0.3.2 修正侧身画师的腿身比；v0.3.3 修英文朗读静默失败；设备矩阵待真机验收） |
| 核心约束 | 无后端、无账号、数据仅存浏览器本地；1–3 岁可用性优先 |
| 最近更新 | 2026-10-30 |

---

## 1. 技术约束（不可协商）

| 编号 | 约束 | 影响 |
| --- | --- | --- |
| C1 | **无后端**，v0.1 不引入任何服务端代码与数据库 | 数据层必须抽象为仓储接口，预留后端替换点（ADR-003） |
| C2 | 数据存浏览器 `localStorage`，需版本化与迁移能力 | 必须有 `schemaVersion` + 迁移链 + 损坏恢复（ADR-009） |
| C3 | 目标设备为 iPad / 安卓平板 / 手机 | 触控优先、竖屏优先、图片体积敏感 |
| C4 | 无账号、不采集个人信息 | 不接入任何统计/广告 SDK；不上传内容 |
| C5 | 静态托管即可运行，无服务端路由 | 需 SPA fallback 或 Hash 路由 |
| C6 | 内容含第三方照片 | 必须登记许可，禁止来源不明图片 |
| C7 | 全职单人 + AI 协作开发 | 拒绝过度设计：不引入微前端、不引入 SSR、不引入复杂状态机库 |

---

## 2. 技术栈

> 版本按**主版本锁定**，实现时取该主版本最新稳定版。升级主版本需新增 ADR。

| 层次 | 选型 | 主版本 | 选型理由 |
| --- | --- | --- | --- |
| 框架 | React | 19 | 生态成熟、并发渲染、配合 IDE 工具链完善 |
| 语言 | TypeScript（`strict: true`） | 5.x | 数据模型即契约，字段多且需强校验 |
| 构建 | Vite | 7 | 冷启动快、静态产物简单、零服务端依赖 |
| 路由 | react-router-dom | 7 | 深链需求（`/card/:id`）、SPA fallback 成熟 |
| 样式 | Tailwind CSS + CSS 变量设计 token | 4 | 原子类保证一致性，token 承载儿童色板与字号阶梯 |
| 状态 | Zustand（仅 UI 与设置） | 5 | 无 Provider 嵌套、体积极小；业务数据走仓储，不塞 store |
| 校验 | Zod | 4 | 种子数据 / 导入数据 / localStorage 读取三处统一 schema |
| 图标 | lucide-react | latest | 线性图标、体积可控、风格统一 |
| 语音 | Web Speech API（`speechSynthesis`） | 浏览器原生 | 零成本、无网络依赖；需自建适配层与降级（ADR-008） |
| 测试 | Vitest + @testing-library/react + jsdom | 3 / 16 | 与 Vite 同源配置，启动快 |
| 规范 | ESLint（flat config）+ Prettier | 9 / 3 | 统一风格；`tsc --noEmit` 做类型门禁 |
| 包管理 | npm（Node 24） | — | 环境已具备，无需额外安装 |
| 部署 | 静态托管（Vercel / Netlify / GitHub Pages）+ SPA rewrite | — | 零运维 |

**明确不引入**

| 候选 | 不引入原因 |
| --- | --- |
| Next.js / SSR | 无 SEO 与首屏数据需求，纯静态足够，SSR 徒增部署复杂度 |
| Redux Toolkit | 数据量小，业务数据走仓储，Zustand 足够 |
| TanStack Query | 无网络请求，缓存需求由仓储 + 轻量 hook 满足 |
| UI 组件库（AntD/MUI） | 儿童化视觉需要高度定制，组件库反而成为负担 |
| 动画库（默认） | CSS transition 足够；若 v0.2 需要手势弹簧效果再评估 |
| IndexedDB | v0.2 数据量（501 卡 + 小图 + 故事正文段落）仍在 localStorage 内；容量预警后再迁移（见技术方案风险 R3） |

---

## 3. 架构分层

```
┌───────────────────────────────────────────────┐
│ 表现层 Presentation                            │
│   app/（路由·布局·Provider）  features/*/ui    │
├───────────────────────────────────────────────┤
│ 应用层 Application                             │
│   features/*/hooks（用例编排）  services/      │
├───────────────────────────────────────────────┤
│ 领域层 Domain（纯净：不依赖 React / 浏览器 API） │
│   entities · 不变量 · 校验 · 纯函数             │
├───────────────────────────────────────────────┤
│ 基础设施层 Infrastructure                      │
│   repositories · storage adapter · seed · TTS  │
└───────────────────────────────────────────────┘
        依赖方向：上 → 下，禁止反向依赖
```

- **领域层零依赖**：`domain/` 内不得 `import react`、`window`、`localStorage`，保证可纯函数测试。
- **仓储即边界**：UI 只认 `CategoryRepository` / `CardRepository` 接口，不认 `localStorage`。
- **适配器模式**：TTS 通过 `SpeechPort` 接口隔离，便于测试替换与后续换实现。

---

## 4. 目录规范

```
early-learn/
├─ FR/                    需求设计（版本化）
├─ NFR/                   技术设计（版本化）
├─ agent/                 项目规约
├─ AGENT.md               协作规约 / 实现思路 / 验证方式
├─ .tmp/                  临时素材与脚本产物（git 忽略，用完清理）
├─ public/
│  └─ assets/images/      卡片图片（按分类分目录）
├─ scripts/               图片处理等本地脚本
└─ src/
   ├─ app/                入口·路由·布局·全局 Provider
   ├─ features/           按业务特性切分（categories / cards / admin / settings / speech）
   ├─ domain/             实体·校验·不变量·纯函数
   ├─ data/               仓储实现·存储适配·种子数据·迁移
   ├─ shared/             通用 UI·工具·hooks
   └─ test/               测试环境与公共 fixture
```

命名约定：组件 `PascalCase.tsx`、hooks `useXxx.ts`、纯函数 `camelCase.ts`、类型文件 `xxx.types.ts`、常量 `xxx.constants.ts`、测试与被测文件同目录 `*.test.ts(x)`。

---

## 5. 质量门禁

| 门禁 | 命令 | 通过标准 |
| --- | --- | --- |
| 类型 | `npm run typecheck` | 0 error（strict） |
| 规范 | `npm run lint` | 0 error，0 warning |
| 测试 | `npm run test` | 全绿；领域层覆盖率 ≥ 80% |
| 构建 | `npm run build` | 成功；首屏 JS ≤ 350KB gzip |
| 手工 | 设备矩阵 + PRD 第 12 节清单 | 全部勾选 |

提交前必须四道自动门禁全绿；不允许 `--no-verify` 跳过。

---

## 6. 环境与命令

| 项 | 值 |
| --- | --- |
| Node | ≥ 20（当前环境 Node 24） |
| 包管理 | npm |
| 开发 | `npm run dev` |
| 预览产物 | `npm run preview` |
| 四道门禁 | `npm run typecheck` / `lint` / `test` / `build` |
| 覆盖率 | `npm run test:coverage` |
| 生成内置素材 | `npm run prepare:images`（依赖 sharp；可 `-- --force` / `-- --only=animals`） |
| 内容门禁 | `npm run validate:content` |

> 规约第 1 条：所有临时下载（图片原图、第三方脚本）置于项目内 `.tmp/`，任务结束立即清理。

---

## 7. 版本索引

| 版本 | 文档 | 内容 | 状态 |
| --- | --- | --- | --- |
| v0.1 | `NFR/README.md` | 技术总览：约束、技术栈、分层、目录、门禁（本文件） | ✅ |
| v0.1 | `NFR/v0.1/技术方案.md` | 架构决策 ADR、领域模型、数据模型、仓储与存储、TTS、图片管线、状态管理、测试策略、任务拆解、风险、验证方式 | ✅ |
| v0.2 | `NFR/README.md` | 技术总览同步：17 分类 / 501 卡 / 518 张图、ADR-004 扩为四类卡、内容门禁覆盖故事（本文件） | ✅ |
| v0.2 | `NFR/v0.2/技术方案-故事绘本.md` | ADR-S1~S7（复用 Card / 可选字段 / 显式图片路径 / 分组表独立 / 故事页独立成页 / 程序化插画 / 一故事一张综合图）、故事数据模型与常量、故事页设计、综合图聚合管线、兼容性与风险 | ✅ |
| v0.2.2 | `NFR/v0.2/技术方案-故事绘本.md` | 形态修正：新增 ADR-S7（一故事一张综合图、不翻页）、`pages[].image` 降为可选、综合图聚合规则与 `--prune`、故事页设计与验收重写 | ✅ |
| v0.2.3 | `NFR/v0.2/技术方案-故事绘本.md` | 版面修正：故事页改网格两栏（宽屏图左文右 / 窄屏单列）、图片容器 `aspect-ratio` + `object-fit: cover`、综合图主体「角色优先于道具」排序 | ✅ |
| v0.3 | `NFR/v0.3/技术方案-主体插画.md` | 主体插画重做（ADR-C1）：9 个画师 + 98 个 subject 规格、`CAST_TONES` 与背景同色板、落脚线（地面/飞行/水中/天空）、`boost` 尺度补偿、光晕退场、门禁改解析 `CAST_SPECS`；§10~12 记录 50 张逐张体检的 18 条问题与修正、全站卡片统一插画、诗词扁平水墨三层景 | ✅ |

**版本化规则**：技术设计随 FR 版本推进；`vX.Y` 目录对应需求版本。破坏性技术变更（换存储、换路由模式、换框架）必须新增 ADR 并在此表登记。

---

## 8. ADR 摘要（完整内容见 `NFR/v0.1/技术方案.md` 第 2 章）

| ADR | 决策 | 一句话理由 |
| --- | --- | --- |
| 001 | 纯前端 + localStorage，无后端 | 零门槛、零隐私风险、零运维 |
| 002 | Vite + React 19 + TS strict | 静态产物简单，数据契约靠类型保证 |
| 003 | Repository 接口隔离存储 | v1.0 换后端只换实现，UI 不动 |
| 004 | `Card` 单实体 + `kind` 区分实物卡/汉字卡/诗词卡/故事绘本 | 浏览、朗读、存储逻辑复用，避免四套 UI 与四套仓储 |
| 005 | 内置原创插画（脚本生成）+ 首字占位兜底 | 贴合实物认知且零授权风险；缺图不会白屏，后续可同名替换为实拍 |
| 006 | 远程 TTS 一律不用，只用浏览器 Web Speech | 免密钥、免成本、无隐私外泄 |
| 007 | Zustand 只管 UI 与设置，业务数据不进 store | 单一数据源，避免双写不一致 |
| 008 | 语音能力抽成 `SpeechPort` 适配器 | 可测试、可降级、可替换 |
| 009 | `schemaVersion` + 迁移链 + 损坏备份 | 本地数据无服务端兜底，必须能自愈 |
| 010 | 卡片图走 `public/` + 逻辑路径拼接 | 允许家长通过导入 JSON 引用新图，无需重新构建 |
| S1–S7 | 故事绘本：复用 `Card` + `pages[]` / `moral`（可选字段零迁移）、分组表独立、故事页独立成页、插画沿用程序化 SVG、**一故事一张综合图且不翻页** | 详见 `NFR/v0.2/技术方案-故事绘本.md` §1 |
| C1 | 故事主体改为**程序化扁平插画**（9 画师 + `CAST_TONES` 同族色板），emoji 退出故事图 | 单色剪影与彩色背景不同族；色板与造型必须可控才能 50 张不漂移（详见 `NFR/v0.3/技术方案-主体插画.md` §2） |

---

## 9. 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
| --- | --- | --- | --- |
| 2026-10-28 | v0.1 | 首次建立技术总览：约束、技术栈、分层架构、目录规范、门禁、ADR 摘要 | Architect / Agent |
| 2026-10-28 | v0.1.1 | 实现回写：状态改为已实现；§6 命令对齐实际 npm scripts（含素材生成与内容门禁）；ADR-005/010 落地为脚本生成插画 + HashRouter | Agent |
| 2026-10-28 | v0.1.5 | 诗词卡：ADR-004 扩为三类卡；技术方案新增诗词字段/不变量、水墨场景生成、`xuan` 色 token、391 张 / 16 分类与 147.24KB gzip 实测 | Agent |
| 2026-10-29 | v0.1.6 | 汉字扩容：内容门禁 451 张 / 16 分类（汉字 241）；构建 gzip 148.60KB；技术方案 v0.1.3 同步实测与计数 | Agent |
| 2026-10-29 | v0.1.7 | 分类页分组与分页：新增 `data/seed/characterGroups.ts`（不写进卡片、零迁移）；仓库序列支持 `filter`；构建 gzip 150.56KB / CSS 6.02KB；技术方案 v0.1.4 同步 | Agent |
| 2026-10-29 | v0.2 | 故事绘本大版本：① `Card.kind` 新增 `story` + 可选 `pages[]`/`moral`，`schemaVersion` 仍 1、`SEED_VERSION` 6→7；② 新增 `data/seed/stories.ts`（50 本 × 6 段）与 `storyGroups.ts`（四组，key 带 `story-` 前缀）；③ 新增 `/story/:cardId` 故事页；④ 图片管线增 18 个绘本场景 + 98 个主体 key；⑤ 内容门禁覆盖故事段数/文字/分组双向覆盖；⑥ 新增 `NFR/v0.2/技术方案-故事绘本.md` | Agent |
| 2026-10-29 | v0.2.2 | 形态修正（ADR-S7）：① 故事页改为一页读完，取消翻页/页码/滑动热区，旧 `?page=` 链接忽略；② 每本只出 1 张多角色综合图（背景取首段 `scene`、主体按全书计数排序最多 3 个），故事插图 350 → 50 张、全站 818 → 518 张（1641.3KB）；③ `pages[].image` 降为可选，旧数据可读；④ 图片管线新增 `storyCast/storyCastMarkup/storySvg` 与 `--prune` 清理旧分页图；⑤ 门禁去掉逐页图片校验；⑥ 构建 gzip 164.09KB / CSS 6.52KB（预算 350KB） | Agent |
| 2026-10-29 | v0.2.3 | 版面修正：① `.story` 由 flex 改 grid，宽屏（≥780px 且高 ≥520px）`5fr 6fr` 图左文右 + `grid-template-areas`，窄屏单列；② 图片容器 `aspect-ratio: 4/3` + `object-fit: cover`，删 `max-height: 42vh` 与 `contain`，两侧不再露分类色；③ 窄屏图宽 `width:100%` + `max-width: calc(58vh*4/3)`；④ 综合图主体新增 `STORY_PROPS` 道具集，改「角色优先于道具」，同票角色比首次出场、道具比最后出场；⑤ 图片 50 张 / 260.5KB（全站 518 张 / 1645.4KB）；⑥ CDP 实拍 390×844 / 768×1024 / 1024×768 / 1440×900 四档；⑦ 构建 gzip 164.10KB / CSS 6.63KB | Agent |
| 2026-10-29 | v0.3.0 | 主体插画重做（ADR-C1）：① 删除 `STORY_SUBJECTS`（subject → emoji），新增 `CAST_SPECS`（98 个 subject）+ `CAST_TONES`（与背景同族 24 色）+ `castShadow/castFace/earArt/tailArt` 共用件；② 新增 9 个画师 `beast/person/bird/fish/frog/bug/plant/sky/thing` + `tadpoleArt`，内部坐标统一「脚底 y=0，身高 96」；③ 新增 `castBaseY`（地面 292 / 飞行 252 / 水中 334 / 天空 296）、`castForScene`（夜景太阳→月亮）、`castArtwork` 的 `boost` 尺度补偿；④ 光晕全局退场（`glowOpacity = 0`）；⑤ 构图改为主 180 / 双主体 168+140 / 三主体 164+128+128，`STORY_SUBJECT_DY` 收敛为 pond 12 / river 6 / sea 6；⑥ `thingArt` 新增 20+ 形状（蛋糕、杯、牙刷、时钟、雨伞、滑梯、红绿灯等）；⑦ 内容门禁 `parseImageKeys` 改解析 `CAST_SPECS`；⑧ 图片 50 张 / 199.0KB（全站 518 张 / 1583.9KB，比 v0.2.3 减 61.5KB）；⑨ 构建 gzip 164.10KB / CSS 6.72KB | Agent |
| 2026-10-29 | v0.3.0（收尾） | 逐张体检 + 全站统一：① 50 张 cover.webp 拼缩略图逐张判定，修 18 条（夜景/洞穴地平线与落脚线对齐、夜景两个月亮、同画师主角被误去重、昆虫/斧头/钟/车/学校比例、羊像熊、狗与马同色、斑马线像台阶、毛巾/手/脚/画架/马桶/火造型不成立）；② 新增 `turtleArt`（侧身拱壳 + 探出的头）并换掉“绿色小人”式龟；③ `castShapeKey` 改 `SHAPE_TRAITS` 20 字段指纹，`storyCast` 一屏限 3 主体；④ 卡片侧撤掉 emoji 剪影，501 张统一「渐变天 + 地面带 + 彩色扁平主体」（7 个卡片画师 + `cardBaseY` + `CARD_BOOST`）；⑤ 诗词 30 张改「宣纸底 + `INK_SOFT` 三层景」，新增 `inkLotus` 等 14 个部件，`poemSceneMarkup` 20 个 case 全部重写；⑥ 新增视觉硬约束「< 3px 描线在 300px 缩略图上会消失」；⑦ 全量重出 518 个文件，五道门禁全绿 | Agent |
| 2026-10-29 | v0.3.1 | 动物辨识度（面向 1–3 岁的“认得出”）：① 22 张动物卡原为同一 `beastArt` 模板换色，小孩分不清 → `beastArt` 补 `build`（round/slim/long/big/tall）+ `legs`（short/long）+ `muzzle`/`noseTone` + 身份件 `collar/teeth/whiskers/socks/hoof/blaze/forelock/ossicone/tusks` + `patches`，`ear` 增 `cat`；② 虎纹竖改横（原竖纹长在身体侧边像贴纸）；③ 新增 `elephantArt/horseArt/giraffeArt` 三个侧身画师（象鼻必须比身体深一档；马/长颈鹿的长脸长颈正面无法展开）；④ 猫→橘、狗→棕+红项圈、牛→白身黑斑大角、羊→米色羊毛带边、蝴蝶 boost 0.72→0.88；⑤ 22 只动物收敛为 6 类可分辨剪影；⑥ 全量重出 518 个，五道门禁全绿（JS gzip 164.10KB / CSS 6.80KB）；⑦ 详见 `NFR/v0.3/技术方案-主体插画.md` §13 | Agent |
| 2026-10-29 | v0.3.2 | 腿身比（修 v0.3.1 遗留偏差“马在故事 cover 腿偏长”）：① 新增 `SIDE_LEG_RATIO`（象 1.4 / 马 1.6 / 长颈鹿 2.8），`elephantArt/horseArt/giraffeArt` 腿高一律由身体 `ry` 推导，`bodyCy = -(legH + ry - 重叠)` 与 `beastArt` 同口径，头颈五官改相对坐标（马腿身比 2.26→1.58、长颈鹿 3.19→2.81）；② 腿位收进躯干 `cx±rx`（马原 22~32 超出右缘 24 → 前后分组），蹄子与腿共用 `legXs`；③ 大象仅去写死、渲染逐像素不变；④ 重出 50 张 cover + 22 张动物卡 + 全量 518 个，目检与同框角色比例一致；⑤ 五道门禁全绿；⑥ 详见 `NFR/v0.3/技术方案-主体插画.md` §14 | Agent |
| 2026-10-30 | v0.3.3 | 英文朗读（需求方反馈“英语按钮点击没有声音”，中文正常）：① 根因定位——`getVoices()` 里**英文 3 个音色全是网络音色（本地 0 个）**，旧 `pickVoice` 用 `find(startsWith('en'))` 必然命中连不通的厂商服务器音色而静默失败；② `voiceCandidates` 重排序（同语言精确 > 同语系 > 其它语言兜底，同级内默认 > 本地 > 网络）；③ 1.5s 静默看门狗 + 最多 3 次换音色重试（本地音色保留一个名额）；④ `warmVoices()` 预热与模块内缓存，修正 `getVoices()` 首次空列表；⑤ 仅 `speaking\|\|pending` 时才 `cancel()`，首句在手势内同步派发；⑥ 失败按原因分类文案 Toast，设置页新增「本机音色」探测行；⑦ 新增 `webSpeechAdapter.test.ts` 12 例（共 138 用例）；⑧ 详见 `NFR/v0.1/技术方案.md` §9.4 | Agent |
