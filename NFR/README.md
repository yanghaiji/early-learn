# 技术总览（NFR Overview）

> 本目录存放全部**技术设计**文档。遵循 `agent/规约.md`：技术设计统一放在 `NFR/` 下、按版本管理，并在本文件维护**总项目预览**。

| 项 | 内容 |
| --- | --- |
| 项目 | 童识 · 认知卡片（工程代号 `early-learn`） |
| 技术定位 | 纯前端单页应用（SPA）+ 静态托管 |
| 当前版本 | **v0.8.0（分龄与拼音辅助）已实现**：首页两档分龄入口（1–3 岁 / 3–6 岁）+ `/age/:band` 分龄分类墙 + 分类页 `?band=` 筛选 + 详情页按龄翻页（复用 `difficulty`，零契约变更）、管理区拼音候选（构建期字典 3755 字 / gzip 19.1 kB，点选才写入）；**307 个用例 / 22 文件全绿**，主 chunk gzip 197.08 kB（偏差 D-1）；复审已修「详情 → 故事页 → 详情」往返丢 `?band=` 与拼音点选覆盖已确认读音。**下一版 v0.9.0（笔顺与生产工具）已规划**：汉字详情逐笔动画（321 字、按 8 个汉字主题组切片懒加载、`hanzi-writer` 作懒加载依赖）、CSV 批量录入（整表拒绝）、上传图 canvas 压缩（最长边 1280 / WebP / ≤150 KB）、IndexedDB 内容快照与回滚（保留 5 份）；首屏不增长，技术方案见 §7。上一版 **v0.7.0（搜索与离线）已实现**：新增 `/search`（复用 `searchCards`，URL 唯一事实源，12 张一页）、PWA（manifest + 手写 `sw.js`，导航网络优先 / 静态缓存优先，sharp 生成三档图标）、六个低频页懒加载（主 chunk 613.95 → 580.27 kB，gzip 206.11 → 196.00）、超宽屏 ≥1700 px → 1680 与顶栏 `--topbar-max` / `--topbar-pad` 反算对齐；**281 个用例 / 21 文件**，零契约与零数据变更。上一版 **v0.6.1（成语词典）收尾到 v0.6.2**：659 → **809 张 / 21 → 22 分类**（新增第 22 分类「成语」150 条 / 5 组各 30，`kind=idiom` + 5 个可选字段）、图片 831 张（+150 四字卡 +1 封面）、音频仍 659 条（成语无英文）、`SEED_VERSION` 8→9，`schemaVersion` 仍 1；扩契约不升版（`CardKind` 加 `idiom`）；**274 个用例 / 20 文件**，JS gzip 206.11KB（硬线 350KB）。v0.6.1：四字卡从「14 类意境」改为「每条 2 件实物意象」（`IDIOM_PROPS` 150×2 + `IDIOM_MOTIFS` 78 件），并修掉详情页图块 `100cqh` 解析为 0 导致的图片塌陷。v0.6.2 界面改版：容器分档（列表 1440 / 详情 960）、分类卡等高、首页顶栏合并、主色改墨绿、源码入口三处，零契约与零数据变更。上一版 v0.5.0 内容大扩容（659 张 / 21 分类）已实现；设备矩阵待真机验收 |
| 核心约束 | 无后端、无账号、数据仅存浏览器本地；1–3 岁可用性优先 |
| 最近更新 | 2026-10-31 |

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
| 离线 | 手写 Service Worker + Web App Manifest | 浏览器原生 | 零新依赖、策略只有两条可审；不引 Workbox（ADR-V3） |
| 图标渲染 | sharp（devDependency） | 0.34 | 从 `public/icons/icon.svg` 出一份 192 / 512 / maskable PNG，与图片管线同一依赖 |
| 笔顺数据 | `hanzi-writer-data`（devDependency，Arphic 许可） + `scripts/build-stroke-data.mjs` | 2.x / — | 构建期只抽 321 字、按 8 主题组切块，运行时零加载；导出 `manifest.json` 供首屏判断与门禁 V8 共用（ADR-X2） |
| 笔顺演示 | `hanzi-writer` | 3 | 逐笔时序、描边动画、暂停/重播开箱即用，MIT 且零依赖；仅被 `StrokePlayer` 懒加载引用（ADR-X1） |
| 内容快照 | 原生 IndexedDB（窄用途） | 浏览器原生 | 只用于「内容快照与回滚」5 份，接口端口化可换内存实现；业务主数据仍单 key localStorage（ADR-X5） |
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
| IndexedDB | v0.2 数据量（501 卡 + 小图 + 故事正文段落）仍在 localStorage 内；容量预警后再迁移（见技术方案风险 R3）。v0.9 例外：仅「内容快照」用 IndexedDB，业务主数据仍单 key localStorage，不改变「读路径只用 localStorage」这一取舍（ADR-X5） |
| Workbox / next-pwa | 策略只有「导航网络优先 + 静态缓存优先」两条，手写 90 行可审；引入后多一层构建期 precache manifest，对 7 MB 资产的收益不抵复杂度（ADR-V3） |

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
| 内容 | `npm run validate:content` | 卡片 / 分类 / 图片 / 音频 / 分组齐全，成语规则 V6 / V7 全过；v0.9 新增 V8：`manifest.json` 笔画数与 321 张汉字卡 `strokes` 双向一致 |
| 手工 | 设备矩阵 + PRD 第 12 节清单 | 全部勾选 |

提交前必须五道自动门禁全绿（含 `validate:content`）；不允许 `--no-verify` 跳过。

---

## 6. 环境与命令

| 项 | 值 |
| --- | --- |
| Node | ≥ 20（当前环境 Node 24） |
| 包管理 | npm |
| 开发 | `npm run dev` |
| 预览产物 | `npm run preview` |
| 五道门禁 | `npm run typecheck` / `lint` / `test` / `build` / `validate:content` |
| 覆盖率 | `npm run test:coverage` |
| 生成内置素材 | `npm run prepare:images`（依赖 sharp；可 `-- --force` / `-- --only=animals`） |
| 生成 PWA 图标 | `npm run prepare:icons`（从 `public/icons/icon.svg` 出 192 / 512 / maskable 三份 PNG） |
| 生成笔顺数据 | `npm run prepare:strokes`（v0.9：从 `hanzi-writer-data` 抽 321 字，出 8 组模块与 `manifest.json`；二次运行幂等） |

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
| v0.4 | `NFR/v0.4/技术方案.md` | 发音根治 + 学习闭环：预录音频适配器与单飞清单（ADR-P1/P2）、`SpeakPort.cardId`、`ProgressDocument` 聚合与 `ProgressRepository`、quiz/progress 纯函数 + rng 注入、连播状态机、生成管线与隐私、ADR-P1~P6 与风险 R1~R6 | ✅ M-A~M-D 已实现 |
| v0.5 | `NFR/v0.5/技术方案.md` | 内容大扩容（零契约变更）：数字改按中文数字解析、诗词朝代三组映射、汉字第八主题组、四个新分类与色板四处同步、`seaArt` 新画师与 `personArt` 身份件扩展、未登记主体由静默空景改抛错、门禁新增 V1~V5、`SEED_VERSION` 7→8、ADR-T1~T7 与风险 R1~R7 | **已实现**（M-A 结构先行 + M-B 内容全铺；§12 M-A 回写 + §13 M-B 回写；659 张 / 21 分类，256 例，gzip 181.69KB） |
| v0.6 | `NFR/v0.6/技术方案-成语词典.md` | 成语词典（扩契约）：`kind=idiom` 与 5 个可选字段、内置分组表 `IDIOM_GROUP_BY_ID`（不写 `tags`）、第 22 分类与 `denim` 复用、详情页成语版式与 English 隐藏、`quizPool` 排除成语、`IDIOM_PROPS`（150 × 2 件实物意象）+ 78 件 `IDIOM_MOTIFS` 出图与未登记抛错、门禁 V6/V7 与音频口径改按 `en` 判定、`SEED_VERSION` 8→9、ADR-I1~I6 与风险 R1~R7 | **已实现**（809 张 / 22 分类，274 例，gzip 205.63KB；实测见 §11.1、窄屏复测见 §11.3） |
| v0.6.2 | `NFR/v0.6/技术方案-界面改版.md` | 界面改版（零契约变更）：token 暖调 + 主色墨绿 `#2F6B57` + 21 分类色降饱和、容器分档 `.page`/`.page--wide`/`.detail`（1180 / 1440 / 960）、`.grid-cats` 6 列与 `.grid-cards` 2·4·6 列整除 12 张、`.cat-tile` 改「封面 + 单行名称 + 角标」、首页 `topbar--hero` 合并与窄屏横滑 + `mask-image`、`.detail--idiom` 三行网格（左图 396px / 右文内部滚动）、`REPO_URL` 三处入口、ADR-U1~U3 与 CDP 两档实测 | **已实现**（274 例全绿，CSS gzip 7.89KB / JS gzip 206.11KB） |
| v0.7 | `NFR/v0.7/技术方案-搜索与离线.md` | 搜索与离线（零契约变更）：复用 `searchCards` + URL 唯一事实源（不做防抖与 state↔URL 双向同步）、`CardTile` 抽公用与 `.card-tile__cat` 角标、manifest + 手写 `sw.js`（`early-learn:v1`，导航网络优先 / 静态缓存优先 / 跨源不拦）、sharp 三档图标、六个低频页 `lazy` + `AppShell` 内 `Suspense`、`--page-max-detail` 与 ≥1700 px → 1680、顶栏 `--topbar-max` / `--topbar-pad` 反算对齐、详情页图与右列重心对齐、ADR-V1~V5 与 CDP 四档 + 断网实测 | **已实现**（281 例全绿，CSS gzip 8.36KB / JS gzip 196.00KB） |
| v0.8 | `NFR/v0.8/技术方案-分龄与拼音辅助.md` | 分龄与拼音辅助（零契约变更）：龄段 `AgeBand`（`1-3` / `3-6`）复用既有 `difficulty` 做映射（难度 2 为重叠带）、`isAgeBand` / `matchesBand` / `countCardsByBand` 领域纯函数、`?band=` 走 URL 唯一事实源（沿用 v0.7）、首页 `.band-row` 两张大卡 + `/age/:band` 分类墙（静态 import）+ 分类页筛龄 + 详情页序列合并过滤并修「翻页丢 `?group=`」、`CategoryTile` 从 `HomePage` 抽出公用、拼音候选改为 `pinyin-pro`（devDependency）+ `prepare:pinyin` 构建期生成 GB2312 一级字字典（运行时零依赖）、`PinyinSuggest` 按字点选不静默写入、ADR-W1~W4 与风险 R1~R5；笔顺动画顺延 v0.8.1 | **已实现**（v0.8.0：307 例全绿；主 chunk gzip 197.08 kB；字典 gzip 19.1 kB；五道门禁与 CDP 三档见 §5 实测；复审另补故事页往返透传与拼音按位沿用 `value`） |
| v0.9 | `NFR/v0.9/技术方案-笔顺与生产工具.md` | 笔顺与生产工具（零契约变更）：笔顺数据管线（`build-stroke-data.mjs` 只抽 321 字 → 8 组模块 + `manifest.json`，门禁 V8 双向校验笔画数）、`StrokePlayer` 状态机 + `reduceMotion` + 组 chunk 懒加载 + 失败降级、CSV 解析器（RFC4180 子集）与整表拒绝、上传图档位压缩（1280 / WebP / ≤150 KB）、IndexedDB 快照端口（保留 5 份 / 单份 8 MB / 恢复前自动备份 / 隐私模式降级）、ADR-X1~X5 与风险 R1~R6 | **已规划**（PRD 与 NFR 成稿，待实现；任务拆解 T-X1~T-X12，预估 307 → 约 349 例） |

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
| P1 | 英文发音走应用自带预录音频，失败才回退 WebSpeech | 设备无本地英文音色时 TTS 会静默失败；自带音频把「能不能出声」从设备条件变成应用条件（详见 `NFR/v0.4/技术方案.md`） |
| P2 | 音频按 `cardId` 定名 + manifest 懒加载，真人录音同名覆盖 | 与 ADR-005 图片策略同构；`Card` 字段零变更，家长自建卡天然回退 TTS |
| P3 | 学习进度存单切片 `early-learn:v1:progress`，与内容 catalog 分开 | 避免学习痕迹混进导入导出包；脏数据→空文档、写失败静默降级，形态对齐 settingsStore |
| P4 | 复习队列只按「标记为不认识」这一条硬规则，不做遗忘曲线 / 自适应难度 | 幼儿内容量小（501），可解释的简单规则比神秘算法更适合家长 |
| P5 | 复习 / 游戏 / 收藏 / 连播不加家长门，只有「清除学习进度」要门 | 这些本就是给孩子点的主用途，加门即挡住主流程；门只给破坏性操作 |
| P6 | 连播到末尾不循环、切后台即停；连播首句在点击手势内同步派发 | 循环对幼儿是「停不下来的屏幕」；iOS 会静默丢弃非手势内的播放/朗读 |
| T1–T7 | 内容大扩容（v0.5）：数字值**由 `zh` 推导**不给 `Card` 加 `value` / 朝代三组映射（五代仍归宋词）/ 汉字单开「口语与常用」第八组 / 主体未登记改**抛错中止** / 新分类 `sortOrder` 追加 18–21 不插队 / 数字只做 28 张骨架 / 本版不引内容分包 | 详见 `NFR/v0.5/技术方案.md` §11 |
| I1–I6 | 成语词典（v0.6）：分组用**内置表**不写 `tags[0]` / 分类色复用 `denim` 不新增 token / 成语排除听音选图 / 不引种子分包 / 释义下限取 6 字（词表实际区间）/ 卡面只画 2 件实物意象 + 四字不写释义 | 详见 `NFR/v0.6/技术方案-成语词典.md` §10 |
| U1–U3 | 界面改版（v0.6.2）：容器**分档**不分全站放宽 / 主色改墨绿且分类色只做浅色底 / 窄屏入口条**横滑 + 右渐隐**而不换行堆叠 | 详见 `NFR/v0.6/技术方案-界面改版.md` §10 |
| V1–V5 | 搜索与离线（v0.7）：搜索全前端复用 `searchCards` 不建索引 / 详情翻页仍按同分类不按结果集 / 手写 `sw.js` 不引 Workbox / 懒加载只拆低频页不动高频页 / 超宽屏用 `:root` 变量覆盖 + `%` 反算顶栏内距（不用 `100vw`） | 详见 `NFR/v0.7/技术方案-搜索与离线.md` §7 |
| W1–W4 | 分龄与拼音辅助（v0.8）：分龄**复用 `difficulty`** 不加 `ageBand` 字段 / 龄段走 **URL `?band=`** 不做全局设置项 / 拼音字典**构建期生成**（`pinyin-pro` 只作 devDependency）/ 拼音只做**按字候选**不猜整词 | 详见 `NFR/v0.8/技术方案-分龄与拼音辅助.md` §7 |
| X1–X5 | 笔顺与生产工具（v0.9）：笔顺渲染引 **`hanzi-writer`（懒加载）** 而不自写 / 数据产物分 **8 组模块 + `manifest.json`** / CSV 走 `bulkUpsert` 且**整表拒绝** / 图片压缩用 canvas `toBlob` **不引压缩库** / 快照放 **IndexedDB 且端口化**（业务主数据仍在 localStorage） | 详见 `NFR/v0.9/技术方案-笔顺与生产工具.md` §9 |

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
| 2026-10-29 | v0.3.0（收尾） | 逐张体检 + 全站统一：① 50 张 cover.webp 拼缩略图逐张判定，修 18 条（夜景/洞穴地平线与落脚线对齐、夜景两个月亮、同画师主角被误去重、昆虫/斧头/钟/车/学校比例、羊像熊、狗与马同色、斑马线像台阶、毛巾/手/脚/画架/马桶/火造型不成立）；② 新增 `turtleArt`（侧身拱壳 + 探出的头）并换掉「绿色小人」式龟；③ `castShapeKey` 改 `SHAPE_TRAITS` 20 字段指纹，`storyCast` 一屏限 3 主体；④ 卡片侧撤掉 emoji 剪影，501 张统一「渐变天 + 地面带 + 彩色扁平主体」（7 个卡片画师 + `cardBaseY` + `CARD_BOOST`）；⑤ 诗词 30 张改「宣纸底 + `INK_SOFT` 三层景」，新增 `inkLotus` 等 14 个部件，`poemSceneMarkup` 20 个 case 全部重写；⑥ 新增视觉硬约束「< 3px 描线在 300px 缩略图上会消失」；⑦ 全量重出 518 个文件，五道门禁全绿 | Agent |
| 2026-10-29 | v0.3.1 | 动物辨识度（面向 1–3 岁的「认得出」）：① 22 张动物卡原为同一 `beastArt` 模板换色，小孩分不清 → `beastArt` 补 `build`（round/slim/long/big/tall）+ `legs`（short/long）+ `muzzle`/`noseTone` + 身份件 `collar/teeth/whiskers/socks/hoof/blaze/forelock/ossicone/tusks` + `patches`，`ear` 增 `cat`；② 虎纹竖改横（原竖纹长在身体侧边像贴纸）；③ 新增 `elephantArt/horseArt/giraffeArt` 三个侧身画师（象鼻必须比身体深一档；马/长颈鹿的长脸长颈正面无法展开）；④ 猫→橘、狗→棕+红项圈、牛→白身黑斑大角、羊→米色羊毛带边、蝴蝶 boost 0.72→0.88；⑤ 22 只动物收敛为 6 类可分辨剪影；⑥ 全量重出 518 个，五道门禁全绿（JS gzip 164.10KB / CSS 6.80KB）；⑦ 详见 `NFR/v0.3/技术方案-主体插画.md` §13 | Agent |
| 2026-10-29 | v0.3.2 | 腿身比（修 v0.3.1 遗留偏差「马在故事 cover 腿偏长」）：① 新增 `SIDE_LEG_RATIO`（象 1.4 / 马 1.6 / 长颈鹿 2.8），`elephantArt/horseArt/giraffeArt` 腿高一律由身体 `ry` 推导，`bodyCy = -(legH + ry - 重叠)` 与 `beastArt` 同口径，头颈五官改相对坐标（马腿身比 2.26→1.58、长颈鹿 3.19→2.81）；② 腿位收进躯干 `cx±rx`（马原 22~32 超出右缘 24 → 前后分组），蹄子与腿共用 `legXs`；③ 大象仅去写死、渲染逐像素不变；④ 重出 50 张 cover + 22 张动物卡 + 全量 518 个，目检与同框角色比例一致；⑤ 五道门禁全绿；⑥ 详见 `NFR/v0.3/技术方案-主体插画.md` §14 | Agent |
| 2026-10-30 | v0.3.3 | 英文朗读（需求方反馈「英语按钮点击没有声音」，中文正常）：① 根因定位——`getVoices()` 里**英文 3 个音色全是网络音色（本地 0 个）**，旧 `pickVoice` 用 `find(startsWith('en'))` 必然命中连不通的厂商服务器音色而静默失败；② `voiceCandidates` 重排序（同语言精确 > 同语系 > 其它语言兜底，同级内默认 > 本地 > 网络）；③ 1.5s 静默看门狗 + 最多 3 次换音色重试（本地音色保留一个名额）；④ `warmVoices()` 预热与模块内缓存，修正 `getVoices()` 首次空列表；⑤ 仅 `speaking\|\|pending` 时才 `cancel()`，首句在手势内同步派发；⑥ 失败按原因分类文案 Toast，设置页新增「本机音色」探测行；⑦ 新增 `webSpeechAdapter.test.ts` 12 例（共 138 用例）；⑧ 详见 `NFR/v0.1/技术方案.md` §9.4 | Agent |
| 2026-10-30 | v0.4.0 M-A | 发音根治（M-A，ADR-P1/P2）：① 新增 `scripts/prepare-audio.mjs`（PowerShell System.Speech 取 Zira 出 WAV → ffmpeg 转 mp3，32kbps/mono/22.05kHz，体积≤12KB、时长 0.4~3.0s）；② 新增 `data/speech/audioManifest.ts`（单飞 + 失败缓存 EMPTY 不再重试）与 `preRecordedAdapter.ts`（中文永不试音频、命中同步播、失败/无条目回退 fallback、`generation` 令牌防叠加、超时 3s 掉声）；③ `SpeakOptions` 新增可选 `cardId`（签名向后兼容）；④ `domain/constants` 新增 `AUDIO_ROOT`/`AUDIO_MANIFEST_PATH`/`AUDIO_TIMEOUT_MS`；⑤ `validate-content.mjs` 扩展音频齐全性与体积校验（导出 `parseCards/parseStories` 供复用）；⑥ 新增 `preRecordedAdapter.test.ts` 14 例（共 152 用例）；⑦ 五道门禁全绿（501 条音频 / 3.22MB，JS gzip 165.99KB仅 +0.78KB）；详见 `NFR/v0.4/技术方案.md` | Agent |
| 2026-10-30 | v0.4.0 M-B | 留下痕迹（M-B，ADR-P3）：① 新增 `domain/entities/progress.ts`（`ProgressDocument` 聚合 + `EMPTY_PROGRESS`）；② `domain/services/progress.ts` 纯函数（toggleFavorite/touchRecent/setMark/prune/isFavorite/markOf/knownCount/unknownCount）+ 16 例；③ `validation.parseProgress`（脏数据→undefined）；④ `ports/repositories.ts` 追加同步 `ProgressRepository`；⑤ `data/storage/progressStorage.ts` 实现（单切片、静默降级、加载可选剪枝）+ 14 例；⑥ `shared/store/progressStore.ts`（zustand，形态对齐 settingsStore）；⑦ 详情页「收藏/认识·不认识」行与进入记最近浏览、`/favorites` 页、首页入口；⑧ 五道门禁全绿（共 182 用例，JS gzip 169.08KB仅 +3.09KB）；详见 `NFR/v0.4/技术方案.md` §2~3 | Agent |
| 2026-10-30 | v0.4.0 M-C | 复习与听音选图（M-C，ADR-P4/P5）：① 新增 `domain/services/random.ts`（注入 rng 的 Fisher-Yates，出题与复习可确定性重放）；② `progress.ts` 增 `buildReviewQueue`（只取「不认识」、按 difficulty 升序、同级随机、截断 `REVIEW_ROUND_MAX`）+ 6 例；③ 新增 `domain/services/quiz.ts`（`buildDeck` 已浏览优先不足全库补、`buildQuestion` 干扰同分类优先、`pickLangOptions`）+ 14 例；④ 新增 `features/learn/ui/`：`ReviewPage`（单卡流，ref 记进入时队列长度区分 M=0 空态与完成态）、`QuizPage`（开局前 `hasVoice` 探测拦截、答错只高亮正确项并播其发音、无分数）、`ProgressStats`（首页三入口条 + 统计一句话），`FavoritesPage` 按技术方案移到 `learn/ui`；⑤ 首页补「接着看」横滑区（补上 M-B 遗留的 US-A2 偏差）；⑥ 新增 `learn.test.tsx` 7 例；⑦ 五道门禁全绿（共 209 用例，JS gzip 171.45KB 累计 +5.46KB）；详见 `NFR/v0.4/技术方案.md` §4.4 | Agent |
| 2026-10-30 | v0.4.0 M-D | 解放双手（M-D，ADR-P6，v0.4 收尾）：① 新增 `features/cards/hooks/useSlideshow.ts`——连播控制器放**模块级**（同路由换卡是组件复用、跨路由是销毁，React 状态活不过每一次跳张），定时器只负责跳张、详情页重挂后的 `notifySlideshowCard` 负责朗读与排下一个节拍（单一入口不双通道重复排程），`markDetailPageAlive` 区分换卡与离页，末位卡播完靠 `runningListeners` 订阅回传（否则按钮停在「停止连播」）；② `useSpeech.speak` 改返回 `Promise<boolean>`（是否真出声），页面据此「没出声就停」；朗读开关中途关闭时详情页即时停播并给原因；③ `domain/constants` 新增 `SLIDESHOW_GAP_MS = 2000`；④ `toastStore` 同文案合并、`progressStore` 增 `resetProgress`（只 `clear()` 删键不写回空文档）与 `hintReadOnlyOnce`（sessionStorage 只提一次）；⑤ 新增 `/guide` 说明页与首页链接、管理区「清除学习进度」（家长门 + DangerConfirm，只动 progress 键）；⑥ 提取 `src/test/helpers.ts` 共用 jsdom 语音桩；⑦ 新增 `slideshow.test.tsx` 14 例（共 223 例 / 17 文件），五道门禁全绿（JS gzip 174.02KB，v0.3.3 累计 +8.81KB）；详见 `NFR/v0.4/技术方案.md` §4.3 | Agent |
| 2026-10-30 | v0.5.0（技术方案） | 新增 `NFR/v0.5/技术方案.md`（内容大扩容，零契约变更）：① §1 逐条事实核对（带行号出处）——数字出图按 `index + 1`、诗景缺省落 `mountain`、未登记主体 `cardSubject` 返回空串、`THEME` 缺项串色四个静默坑；② §4.1 新增 `cnNumberToValue` 按中文数字推值（十一–二十 / 整十 / 一百，解析失败即抛错）；③ §4.2 朝代三组 `POEM_GROUP_BY_DYNASTY` 替换「非唐即宋」二元判断；④ §4.3 汉字第八组 `speech` 与 80 字逐行速查表（含 slug 冲突后缀）；⑤ §4.4 四个新色 token `wave`/`moss`/`denim`/`linen` 与四处同步链；⑥ §4.5 画师扩展（`seaArt` 新画师、`bugArt` +8、`personArt` 新增 `hat`/`prop`、`thingArt` +10）与未登记主体改抛错；⑦ §5 门禁新增 V1~V5；⑧ §8 十四步任务拆解（测试先行）、§9 体积预算（JS gzip ≤ 200KB）、§10 风险 R1~R7、§11 ADR-T1~T7 | Agent |
| 2026-10-30 | v0.5.0（实现） | v0.5 内容大扩容实现完成（M-A 结构 + M-B 内容全铺，§8 任务 1–14）：种子 501→**659 张 / 17→21 分类**（数字 28 / 汉字 321 含第八组 speech / 古诗 50 / 四新分类各 10）、`categories.ts` 四行（wave/moss/denim/linen）、`seaArt`+`bugArt`+8+`personArt`(hat/prop)+`thingArt`+10+`cardBaseY` 水生、`SEED_VERSION` 7→8 与升级合并三例；全量出图 680 张（既有逐字节不变）、出音频 659 条 / 4.25MB；**内容修正 C1~C3**（的/了 轻声按字白名单豁免同时落脚本与 domain、三首英译超词与《村居》七言分行、`/动物/` 正则加锚）；五道门禁全绿（256 例，JS gzip 181.69KB）；详见 `NFR/v0.5/技术方案.md` §13 | Agent |
| 2026-10-30 | v0.5.1 | 首页版面回归分类墙（需求方：「接着看单独一个菜单，不影响下方选择」）：① `HomePage` 删掉「接着看」横滑区及其 `recentCards` 派生（连带去 `useProgressStore`/`CardTile`/`useMemo` 依赖）；② 新增 `features/learn/ui/RecentPage.tsx`（`/recent` 网格页，最近浏览 ≤ `RECENT_MAX`，删卡自动过滤，空态「还没有浏览记录」）；③ `ProgressEntries` 新增菜单项「接着看（N）」（`History` 图标，仅 `recent.length > 0` 时渲染）；④ `router.tsx` 增路由、`index.css` 删 `.slide-row` 三条规则；⑤ `learn.test.tsx` +3 例（7→10 例）：无记录不出入口、点入口进独立页、直连空态；⑥ 零数据/字段变更，`schemaVersion`/`SEED_VERSION` 不动 | Agent |
| 2026-10-30 | v0.6.0 | 成语词典（扩契约，ADR-I1~I6）：① `CardKind` 加 `idiom`，`Card` 加 5 个可选字段 `meaning` / `examples` / `synonyms` / `antonyms` / `citation`，`schemaVersion` 仍 1、`SEED_VERSION` 8→9；② 新增 `data/seed/idioms/`（`types.ts` + 五组内容各 30 条 + `index.ts` 的 `IDIOM_GROUPS` / `IDIOM_GROUP_BY_ID` / `buildIdioms`）；③ `categories.ts` 第 22 行（`denim` / `sortOrder=22` / `covers/idioms.webp`），`COLOR_TOKENS` 仍 21；④ `CatalogProvider.groupOf` 加 idiom 分支（按 id 查表，不用 `tags`）；⑤ 详情页 `detail--idiom` 版式（释义 17px+ / 例句 15px / 出处 13px）、点读读「成语 + 释义」、English 按钮整块不渲染；⑥ 管理区成语 chip 与字段组、`en` 写空串；⑦ `quizPool` 排除成语（QuizPage 全程走 pool）；⑧ 出图新增 `IDIOM_SCENES`（150）+ `idiomSceneMarkup`（14 类）+ `idiomSvg` / `idiomCoverSvg`，未登记即抛错，产出 151 张；⑨ 门禁新增 V6（场景登记）/ V7（分组双向覆盖）与逐卡成语规则，音频口径改「只查 `en` 非空卡」；⑩ 新增 15 例、五道门禁全绿（274 例，JS gzip 205.55KB）；详见 `NFR/v0.6/技术方案-成语词典.md` | Agent |
| 2026-10-30 | v0.6.1 | 四字卡意象件重做 + 详情页图片塌陷修复（需求方「有些配图和内容完全不搭，没有真正表达出真实世界的物」+ 360px 窄屏核验）：① `prepare-images.mjs` 删 `idiomSceneMarkup`（14 类意境）与旧 `IDIOM_SCENES`，改为 `IDIOM_PROPS`（150 条 × 2 件）+ `IDIOM_MOTIFS`（78 件实物）+ `motifMarkup` 统一外壳 + `inkPerson` / `inkQuadruped` 骨架 + `idiomBackdrop`（淡远山 + 地平线做背景）；落脚件 `y=186`、天象件 `y=108`，两件 `x=102/218`、单件 `x=160`；② 151 张 `--only=idioms --force` 重出（脚本是「文件已存在即跳过」），拼 4 张 48 格缩略图逐张目检；③ 门禁 V6 改口径（0 件 / 超 2 件 / 未实现三种失败）+ 自守断言改 `idiomProps` / `idiomMotifs`；④ `index.css` 删 `@supports (width:1cqw)` 与 `container-type:size`，图块改 `height:100%; width:auto; aspect-ratio:1/1`，成语 stage 定高 `clamp(132px, 23dvh, 210px)`，修掉 `100cqh` 解析为 0 导致整站详情页图缩成 2px；⑤ 360 / 375 / 1440 三档 CDP 复测无溢出，图块 170 / 153 / 207；⑥ 五道门禁全绿（274 例，JS gzip 205.63KB、CSS gzip 7.14KB）；⑦ 版本号 0.6.0 → 0.6.1 | Agent |
| 2026-10-30 | v0.6.2 | 界面改版（零契约 / 零数据变更，ADR-U1~U3）：① `tokens.css` 主色 `#3E7BFA` → `#2F6B57`、`--c-primary-soft` 同步、`--c-ink` / `--c-line` / `--c-bg-soft` / 危险与警告色改暖调、21 个分类色统一降一档饱和、阴影改暖（`rgba(72,62,46,…)`）、新增 `--page-max` / `--page-max-wide` / `--page-max-narrow`；② `index.css` 新增 `.page--wide`（1440）并挂到首页 / 分类页 / 收藏页 / 最近页，`.detail` 1180 → 960；③ `.grid-cats` 改 `minmax(176px,1fr)` + ≥1200 固定 6 列，`.grid-cards` 768–1099 固定 4 列 / ≥1100 固定 6 列（12 张永远整行）；④ `.cat-tile` 改 `height:100%` + `.cat-tile__foot`（<560 纵 / ≥560 横）+ 张数角标压封面右下，`.section-hint` 替代原提示行；⑤ 新增 `.topbar--hero` / `.topbar__brand` / `.topbar__tools`，<960px 入口条换行横滑 + `mask-image` 右渐隐，`.chip.is-active` 由 ink 改主色；⑥ `.detail--idiom` 桌面三行网格 `stage / idiom / actions`，图块 `width: min(100%, 44vh)`（207 → 396px），`detail__idiom` 内部滚动；⑦ `version.ts` 新增 `REPO_URL`，页脚 / 首页顶栏 / 设置页「关于」三处入口，`AppShell` 页脚去 `aria-hidden`；⑧ `cards.test.tsx` 两处按 `.card-tile` 计数（原按链接数，页脚新增链接后失效）；⑨ CDP 1440 / 360 两档实测无横向溢出、分类卡高 205 / 178，五道门禁全绿（274 例，CSS gzip 7.89KB / JS gzip 206.11KB）；⑩ 版本号 0.6.1 → 0.6.2 | Agent |
| 2026-10-30 | v0.7.0 | 搜索与离线（零契约 / 零数据变更，ADR-V1~V5）：① 新增 `features/search/ui/SearchPage.tsx`（`?q=` / `?page=` 作唯一事实源、`replace: true`、12 张一页、命中 ≤ 6 张或 0 张补分类 chips）与 7 例测试；② `CardTile` 从 `CategoryPage` 抽出公用，新增可选 `categoryName` 渲染 `.card-tile__cat`（右下角）；③ `/search` 路由 + 首页顶栏放大镜 + `/` 快捷键 + 分类页顶栏入口；④ `public/manifest.webmanifest` + 手写 `public/sw.js`（`early-learn:v1`，导航网络优先 / 静态缓存优先 / 跨源不拦，`install` 里 `skipWaiting`）+ `scripts/build-icons.mjs`（sharp 出 192 / 512 / maskable）+ `src/app/pwa.ts`（`PROD` 守卫注册）；⑤ `index.html` 补 manifest / icon / apple-touch-icon，设置页「关于」补安装说明；⑥ `router.tsx` 六页 `lazy`（`CardAdmin` / `CategoryAdmin` / `DataAdmin` / `QuizPage` / `StoryReaderPage` / `GuidePage`），`Suspense` 放在 `AppShell` 的 `<Outlet />` 内，新增 `RouteFallback`；⑦ `tokens.css` 新增 `--page-max-detail` 与 `@media (min-width:1700px){ --page-max-wide: 1680px }`，`index.css` 顶栏改 `--topbar-max` + `--topbar-pad` + `max()` 反算（必须排在四类修饰类之后），420px 以下收 14px；⑧ 详情页普通卡改 `grid-template-rows: auto auto` + `align-content: center`（诗词 / 成语卡 `:not()` 排除），图块 `width: min(100%, 62vh)`，修掉「图偏上、文字偏下」220px 错位；⑨ `tsconfig.json` types 加 `vite/client`；⑩ 版本号 0.6.2 → 0.7.0；五道门禁全绿（281 例，CSS gzip 8.36KB / JS gzip 196.00KB），CDP 四档 + 断网 reload 实测通过；详见 `NFR/v0.7/技术方案-搜索与离线.md` | Agent |
| 2026-10-31 | v0.8.0（技术方案） | 新增 `NFR/v0.8/技术方案-分龄与拼音辅助.md`（规划稿，零契约变更）：① §1 事实核对 8 条——`difficulty` 从 v0.1 就在实体里但**前台从未读取**、种子已按难度标好（实物 58/115/64、汉字 92/150/79、古诗 12/21/17、故事 15/31/4、成语 23/58/69）、`buildCardSequence` 已支持筛选器、`CardTile` 已透传 `location.search`、详情页 `goPrev/goNext` 不带 search 是既有 bug、无任何拼音库、`AGENT.md` §6 禁自动生成；② §2 龄段 `AgeBand` + `AGE_BAND_DIFFICULTIES`（`1-3` = 难度 1+2、`3-6` = 难度 2+3，难度 2 重叠带；只取难度 1 会让蔬菜/海洋/小虫/职业/穿戴 5 类为 0 张，58 → 173 张）+ 三个领域纯函数 + `?band=` URL 约定；③ §3 首页 `.band-row` 两张大卡、新增 `AgePage`（静态 import、0 张分类不渲染）、`CategoryPage` 认 `?band=` 且 `goto` 保留 band、详情页序列合并 band 过滤并修翻页丢参、`CategoryTile` 抽公用（`countSuffix` / `search`）；④ §4 拼音走「构建期生成字典」——`scripts/build-pinyin-dict.mjs` + `npm run prepare:pinyin` 出 `src/data/pinyin/dict.ts`（GB2312 一级字 3755，45–55 kB / gzip 20–25 kB），`PinyinSuggest` 按字列全部读音、点选才写入、`zh` 变化清空已选、库外字回退手输；⑤ §5 五道门禁与 CDP 三档待回填、§6 任务拆解 12 步（测试先行）、§7 ADR-W1~W4、§8 风险 R1~R5（含 v0.8.1 笔顺数据授权与体积） | Architect / Agent |
| 2026-10-31 | v0.8.0（实现） | 分龄与拼音辅助落地（T-W1–T-W12）：① 领域 `AgeBand` / `AGE_BAND_*` / `isAgeBand` / `matchesBand` / `countCardsByBand`（难度 2 重叠带），`catalog.test.ts` +6；② `CategoryTile` 抽公用（`countSuffix` / `search`），首页 `.band-row` 两张分龄大卡（576 / 609）；③ 新增 `AgePage` + 静态路由 `age/:band`，0 张分类不渲染、非法 band 空态；④ 分类页 `?band=` 双层 `all` / `list`（6 / 13）、`goto` 加 `nextBand`、年龄 chips + 「看全部」、0 张给出口；⑤ 详情页序列合并 band 谓词，`goPrev/goNext` 透传 `location.search` 与 `state`（修 v0.7 丢 `?group=`）；⑥ `scripts/build-pinyin-dict.mjs` + `prepare:pinyin` 出 3755 字字典（76.7 kB / gzip 19.1 kB，幂等），`PinyinSuggest` 只回调 `onPick`；⑦ 五道门禁全绿（**303 例 / 22 文件**，+22：领域 6 / 页面 12 / 拼音 4；CSS gzip 8.55 kB）；⑧ CDP 360 / 1440 / 1826 三档：溢 0，分龄卡 332 / 683 / 810 宽、高恒 105，分类墙 2 / 6 / 6 列，1826 容器 1680；⑨ 偏差 D-1：主 chunk gzip 196.00 → 197.08（+1.08，分龄入口与 `AgePage` 静态 import）；⑩ 版本号 0.8.0 | Agent |
| 2026-10-31 | v0.8.0（复审） | 全量代码复审后修订 4 条：① `NFR/v0.8` §3.4 补「详情 → 故事页 → 详情」往返链路（`openStory` / `StoryReaderPage.detailUrl` 带 `location.search`，修前序列从 35 张退回 50 张）；② §4.3/§4.4 `PinyinSuggest` 改收可选 `value`，点选按「被点位 > 已选 > `value[i]` > 首读音」补齐并补缺字点名 / 改词提示；③ §5.1 test 303 → **307**、`CardAdmin` gzip 25.89、`built in 6.60s`（主 chunk gzip 仍 197.08）；④ §5.2 新增 CDP 9 步复核（含故事往返）；低优先 L1~L5 仅登记 `AGENT.md` §6 待办 | Agent |
| 2026-10-31 | v0.9.0（技术方案） | 新增 `NFR/v0.9/技术方案-笔顺与生产工具.md`（规划稿，零契约变更）：① §1 事实核对 12 条（汉字 321 张分 8 组 25/55/44/38/38/44/61/16、笔顺只有 `strokes: number`、`hanzi-writer@3.7.3` MIT 零依赖 / `hanzi-writer-data@2.0.1` Arphic 32.3 MB、「一」0.4 KB 与「赢」4.5 KB 单字体量、上传入口全站唯一、`auto-backup` 无读取入口、`bulkUpsert` 已就绪、`storage.replace` + `run()` 可复用、`resolveJsonModule` 已开）；② §2 笔顺管线：脚本产物 8 组模块 + `manifest.json`（幂等、缺字非零退出）、`hasStrokeData` 静态判断 + 组 chunk 动态 import + Promise 缓存、`charDataLoader` 接入、门禁 V8 三条；③ §3 `StrokePlayer` 状态机（idle/loading/playing/done/stopped）、固定方块 `clamp(120px, 36vw, 220px)`、`reduceMotion` 直接显示整字、lazy + Suspense 占位、四类失败降级；④ §4 CSV：RFC4180 子集解析器、10 列映射、整表拒绝、同分类同 `zh` 判重跳过、`bulkCreateCards` 接入、模板带 BOM；⑤ §5 图片压缩档位（0.82/0.72/0.62/0.55 × 1280/1024/800）与 `LIMITS` 新增三项；⑥ §6 快照端口与 IndexedDB 实现、保留 5 份 / 单份 8 MB / 5 处自动触发 / 恢复流程 / 隐私模式降级；⑦ §7 门禁与 CDP 7 步待回填、§8 T-X1~T-X12（预估 +42 例）、§9 ADR-X1~X5、§10 风险 6 条 | Architect / Agent |
