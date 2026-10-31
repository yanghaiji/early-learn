# 第三方许可声明

本文件登记「童识 · 认知卡片」（工程代号 `early-learn`）直接引入的第三方作品、许可要求，以及本项目对每一类要求的满足方式。项目自身代码与内置内容（图片、音频、拼音字典产物）不在此声明范围内。

| 作品 | 版本 | 许可 | 用途 | 安装位置 |
| --- | --- | --- | --- | --- |
| `hanzi-writer` | 3.7.3 | MIT | 汉字逐笔动画播放（只被 `StrokePlayer` 懒加载引用） | `dependencies` |
| `hanzi-writer-data` | 2.0.1 | Arphic Public License | 笔画路径与笔画中线数据的原始出处（构建期抽取 321 字） | `devDependencies` |
| Make Me a Hanzi / AR PL 系列字体 | — | Arphic Public License | 上述数据的上游来源 | 不直接安装 |

> 另有 `pinyin-pro`（3.29.x，MIT）仅作 `devDependencies`：`npm run prepare:pinyin` 在构建期读取它，产物是「字 → 读音」事实型字典，不含其代码，故不随运行时分发。

---

## 1. hanzi-writer — MIT

许可证原文（`node_modules/hanzi-writer/LICENSE`）：

```
The MIT License (MIT)

Copyright (c) 2014 David Chanin

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

满足方式：本文件即「随副本附上版权声明与许可声明」，`hanzi-writer` 打包进构建产物时其许可声明随本文件一同分发。

---

## 2. hanzi-writer-data — Arphic Public License

### 2.1 版权行（原文照录自 `node_modules/hanzi-writer/COPYING.md`）

```
Arphic PL KaitiM GB and UKai
Copyright 1999 Arphic Technology Co., Ltd.; licensed under the Arphic Public License
http://www.arphic.com.tw/en/home/index

Make Me a Hanzi
Copyright 1999 Arphic Technology Co., Ltd., copyright 2016 Shaunak Kishore; licensed under the Arphic Public License
https://github.com/skishore/makemeahanzi
```

### 2.2 本项目如何使用

- 构建期由 `scripts/build-stroke-data.mjs`（`npm run prepare:strokes`）从 `node_modules/hanzi-writer-data/<字>.json` 读取 321 个字的字形数据。
- 每字只保留 `strokes`（笔画轮廓的 SVG path）与 `medians`（笔画中线），丢弃 `radStrokes` 等运行时用不到的字段。
- 按 `src/data/seed/characterGroups.ts` 的八个主题组写成 `src/data/strokes/group-<key>.ts`，另出 `src/data/strokes/manifest.json` 供首屏判断与门禁 V8 使用。
- 上述产物随应用静态发布，属于许可第 0 条定义的 **Font 衍生物**（该条把「转换格式、增删字形」产生的衍生作品一并算作 Font）。

### 2.3 人工复核结论（2026-10-31）

逐条核对 `licenses/ARPHICPL.TXT`（58 行，与 `node_modules/hanzi-writer-data/ARPHICPL.TXT` 的 SHA256 完全一致）后的判定：

| 条款 | 要求 | 本项目的满足方式 |
| --- | --- | --- |
| §0 定义 | 转换格式、增删字形得到的衍生作品同样算 Font | 本项目的笔顺产物按 Font 衍生物对待，整体遵守本许可 |
| §1 复制与分发 | 分发时必须保留**未经改动**的 `ARPHICPL.TXT` | 仓库内 `licenses/ARPHICPL.TXT` 为逐字节副本（SHA256 `5590533436C70F10…D328`，6900 字节）；`.gitattributes` 对该文件关闭行尾转换，避免被「改过」 |
| §2a 修改声明 | 每个被改动的文件里要有醒目声明，写明改了**什么**、**何时**改 | 每个 `group-*.ts` 头部注释写明：由字形数据转为 SVG path + 中线、日期、本组字数；`manifest.json` 用 `license` / `notice` 字段说明（JSON 无法写注释） |
| §2b 自由可得 | 修改后的作品整体须以同一许可对第三方 Freely Available | 生成产物随公开仓库分发，`group-*.ts` 与 `manifest.json` 均标注 Arphic Public License 并指向许可证全文；任何人可取用同一份数据 |
| §2c 交互提示 | 若修改后的字体在交互运行时通常读命令，启动须打印版权与无担保声明 | 本项目的数据是静态 JSON/TS，不做交互式命令读取，本条按字面不适用；为稳妥起见，设置页「关于 → 第三方许可」仍列出出处与「按现状提供」声明 |
| §3 条件终止 | 不得复制、修改、再授权或分发许可外的用途；不得附加额外限制 | 生成的笔顺数据不附加任何额外条款；本文件只作说明，不构成附加限制 |
| §5 自动接收 | 每次再分发，接收者自动获得同一许可 | 每个生成文件都指向 `licenses/ARPHICPL.TXT`，接收者可直接读到全文 |
| §7 / §8 | 无担保、损害赔偿豁免 | 本文件照录全文，关于页同口径说明「按现状提供」 |

补充判断（§2 末段「mere aggregation」）：应用自身的代码、样式与内置图片音频并非 Font 衍生物，仅因与笔顺数据一起打包，不因此被拖入 Arphic Public License；项目主体仍按原许可发布，只有 `src/data/strokes/` 下的生成产物受本许可约束。

### 2.4 许可证全文

以下为 `licenses/ARPHICPL.TXT` 的全文（该文件为权威副本，二者内容一致）：

```
ARPHIC PUBLIC LICENSE

Copyright (C) 1999 Arphic Technology Co., Ltd.
11Fl. No.168, Yung Chi Rd., Taipei, 110 Taiwan
All rights reserved except as specified below.

Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is forbidden.

Preamble

   The licenses for most software are designed to take away your freedom to share and change it. By contrast, the ARPHIC PUBLIC LICENSE specifically permits and encourages you to use this software, provided that you give the recipients all the rights that we gave you and make sure they can get the modifications of this software.

Legal Terms

0. Definitions:
   Throughout this License, "Font" means the TrueType fonts "AR PL Mingti2L Big5", "AR PL KaitiM Big5" (BIG-5 character set) and "AR PL SungtiL GB", "AR PL KaitiM GB" (GB character set) which are originally distributed by Arphic, and the derivatives of those fonts created through any modification including modifying glyph, reordering glyph, converting format, changing font name, or adding/deleting some characters in/from glyph table.

   "PL" means "Public License".

   "Copyright Holder" means whoever is named in the copyright or copyrights for the Font.

   "You" means the licensee, or person copying, redistributing or modifying the Font.

   "Freely Available" means that you have the freedom to copy or modify the Font as well as redistribute copies of the Font under the same conditions you received, not price. If you wish, you can charge for this service.

1. Copying & Distribution
   You may copy and distribute verbatim copies of this Font in any medium, without restriction, provided that you retain this license file (ARPHICPL.TXT) unaltered in all copies.

2. Modification
   You may otherwise modify your copy of this Font in any way, including modifying glyph, reordering glyph, converting format, changing font name, or adding/deleting some characters in/from glyph table, and copy and distribute such modifications under the terms of Section 1 above, provided that the following conditions are met:

   a) You must insert a prominent notice in each modified file stating how and when you changed that file.

   b) You must make such modifications Freely Available as a whole to all third parties under the terms of this License, such as by offering access to copy the modifications from a designated place, or distributing the modifications on a medium customarily used for software interchange.

   c) If the modified fonts normally reads commands interactively when run, you must cause it, when started running for such interactive use in the most ordinary way, to print or display an announcement including an appropriate copyright notice and a notice that there is no warranty (or else, saying that you provide a warranty) and that users may redistribute the Font under these conditions, and telling the user how to view a copy of this License.

   These requirements apply to the modified work as a whole. If identifiable sections of that work are not derived from the Font, and can be reasonably considered independent and separate works in themselves, then this License and its terms, do not apply to those sections when you distribute them as separate works. Therefore, mere aggregation of another work not based on the Font with the Font on a volume of a storage or distribution medium does not bring the other work under the scope of this License.

3. Condition Subsequent
   You may not copy, modify, sublicense, or distribute the Font except as expressly provided under this License. Any attempt otherwise to copy, modify, sublicense or distribute the Font will automatically retroactively void your rights under this License. However, parties who have received copies or rights from you under this License will keep their licenses valid so long as such parties remain in full compliance.

4. Acceptance
   You are not required to accept this License, since you have not signed it. However, nothing else grants you permission to copy, modify, sublicense or distribute the Font. These actions are prohibited by law if you do not accept this License. Therefore, by copying, modifying, sublicensing or distributing the Font, you indicate your acceptance of this License and all its terms and conditions.

5. Automatic Receipt
   Each time you redistribute the Font, the recipient automatically receives a license from the original licensor to copy, distribute or modify the Font subject to these terms and conditions. You may not impose any further restrictions on the recipients' exercise of the rights granted herein. You are not responsible for enforcing compliance by third parties to this License.

6. Contradiction
   If, as a consequence of a court judgment or allegation of patent infringement or for any other reason (not limited to patent issues), conditions are imposed on you (whether by court order, agreement or otherwise) that contradict the conditions of this License, they do not excuse you from the conditions of this License. If you cannot distribute so as to satisfy simultaneously your obligations under this License and any other pertinent obligations, then as a consequence you may not distribute the Font at all. For example, if a patent license would not permit royalty-free redistribution of the Font by all those who receive copies directly or indirectly through you, then the only way you could satisfy both it and this License would be to refrain entirely from distribution of the Font.

   If any portion of this section is held invalid or unenforceable under any particular circumstance, the balance of the section is intended to apply and the section as a whole is intended to apply in other circumstances.

7. NO WARRANTY
   BECAUSE THE FONT IS LICENSED FREE OF CHARGE, THERE IS NO WARRANTY FOR THE FONT, TO THE EXTENT PERMITTED BY APPLICABLE LAW. EXCEPT WHEN OTHERWISE STATED IN WRITING THE COPYRIGHT HOLDERS OR OTHER PARTIES PROVIDE THE FONT "AS IS" WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE ENTIRE RISK AS TO THE QUALITY AND PERFORMANCE OF THE FONT IS WITH YOU. SHOULD THE FONT PROVE DEFECTIVE, YOU ASSUME THE COST OF ALL NECESSARY SERVICING, REPAIR OR CORRECTION.

8. DAMAGES WAIVER
   UNLESS REQUIRED BY APPLICABLE LAW OR AGREED TO IN WRITING, IN NO EVENT WILL ANY COPYRIGHTT HOLDERS, OR OTHER PARTIES WHO MAY COPY, MODIFY OR REDISTRIBUTE THE FONT AS PERMITTED ABOVE, BE LIABLE TO YOU FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, INCIDENTAL, SPECIAL OR EXEMPLARY DAMAGES ARISING OUT OF THE USE OR INABILITY TO USE THE FONT (INCLUDING BUT NOT LIMITED TO PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA OR PROFITS; OR BUSINESS INTERRUPTION), EVEN IF SUCH HOLDERS OR OTHER PARTIES HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
```

---

## 3. 维护约定

1. 升级 `hanzi-writer` 或 `hanzi-writer-data` 后必须重跑 `npm run prepare:strokes`，并回核 §2.3 表格里的版本号与 `licenses/ARPHICPL.TXT` 的哈希。
2. `npm run validate:content` 的门禁 V8 校验笔顺数据与 321 张汉字卡的笔画数一致，防止「数据换了、许可声明没跟上」。
3. 新增任何字体的 **轮廓/字形衍生数据**（不只是本方案的笔顺）都要先登记到本文件，再进仓库。
