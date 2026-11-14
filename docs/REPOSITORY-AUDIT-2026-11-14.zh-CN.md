# 仓库审计与接单准备度：2026-11-14

**结论：本地演示商店及沙箱代码检查通过；项目目前不能接受真实订单或收款。** 缺少真实商业资料、生产支付与履约实现、账户配置、部署同步及外部验收，不能通过移除 demo 标记或填入密钥直接上线。

本次从 GitHub 重新克隆 `wuchan1870422-byte/desk-setup-store`，基线为 `9508fb4e23ca3a593694165d8fffb190ca258412`；工作分支为 `audit/commerce-readiness-2026-11-14`。没有沿用此前聊天或历史文档中的通过结论。以下源码结论针对本分支，线上观察另列，二者不等同。

## 实际技术栈与部署

| 部分 | 当前事实 |
| --- | --- |
| 前端 | Next.js App Router，React，TypeScript strict，Tailwind CSS 4；`output: export`，11 个 HTML 页面，含 404 |
| 本次锁定版本 | Next.js 16.4.1，React/React DOM 19.3.1，TypeScript 5.9.3，Tailwind 4.3.3，ESLint 9.39.5 |
| 自动化 | Node.js 内置 test runner + tsx；真实内存 SQLite 执行 SQL 迁移，支付/供应商响应使用测试替身；Playwright 1.64.1；新增 axe 4.14.0 |
| 前端部署 | `.openai/hosting.json` 指向既有 Sites 静态项目；也有 Cloudflare Pages 部署说明。构建输出为 `out/`，不需要服务端密钥 |
| 独立后端 | `commerce/worker.ts`，Cloudflare Worker + D1，三个 SQL 迁移；另有单独的 Sites 后端打包配置 |
| 后端默认配置 | `commerce/wrangler.jsonc` 为 `COMMERCE_MODE=disabled`，没有真实 D1 database ID；Sites 后端也需要自己的项目身份、运行时秘密和访问策略 |
| CI | GitHub Actions：Node 24，安装、依赖审计、lint、类型检查、单元测试、准备度诊断、两个构建、导出检查、浏览器测试 |

本次运行使用 Node.js 24.22.1、npm 11.9.0、Chromium 156.0.8078.4。安装过程仍有 ESLint 9 生命周期弃用提示，已如实保留；它不属于本次审计中的已知漏洞，但后续应单独验证工具链主版本升级。

## 商品与支付链路

| 数据集 | 内容 | 能否销售 |
| --- | --- | --- |
| 公开商品 | Cable Keeper A$29、Desk Shelf A$79、Tech Pouch A$39；统一演示配送 A$9 | 不能。三个 `demo-*` ID，虚构供应商，插画和未验证规格；不代表库存、质检、真实售价或运费 |
| 后端测试目录 | `tech-organiser-black-3`，CJ SKU `CJJT107047201AZ`，A$39.90 测试金额，上限 3 件 | 仅固定沙箱夹具，与三个公开商品没有 SKU 映射或商业批准 |
| 客服及政策 | `hello@desksetup.example`、政策草案 | 保留示例域名，不是可工作的客服邮箱；没有已验证卖家身份、退货地址或售后承诺 |

公开链路是：浏览商品 → localStorage 保存 ID/数量 → 客户端演示总价 → 下载 demo JSON。购物车没有支付 SDK、订单提交或收货地址收集；PayPal 按钮禁用。返回 URL 上的 `sandbox=approved` 或伪造 token 不会生成已付款订单，已增加浏览器回归测试。

独立沙箱链路是：管理员 Bearer 鉴权 → 校验商品/数量并由服务器定价 → D1 持久化和幂等键 → PayPal **sandbox** 创建/买家批准/capture → 核验订单、发票、AUD 金额与最终 capture → CJ `isSandbox=1` 创建及模拟付款。不确定结果进入 REVIEW，避免盲目重放；退款/冲正事件可以记录持久 hold，但没有发起真实退款、退货或生产履约的完整实现。公共购物车不能调用管理员接口，也不能把管理员 token 放入浏览器来补上此链路。

仓库保留的 [11 月 1 日沙箱记录](PROVIDER-SANDBOX-2026-11-01.md) 是历史文档。本次没有重新登录对应账户、创建远程 PayPal/CJ 订单、capture、退款或模拟供应商付款，不能把历史记录当成本次外部验收。

## 已修复的问题与证据

| 问题 | 修改及验证 |
| --- | --- |
| 损坏 JSON 返回支付故障 502；`application/jsonp` 被当 JSON 接受 | 精确解析媒体类型，损坏 JSON/UTF-8 返回不回显输入的 400；保留 16 KiB 字节限制；新增 API 边界测试 |
| 商品行可携带额外个人信息或客户端价格字段 | 仅接受 `productId`、`quantity` 两个字段，拒绝数组和额外字段；已改原有价格测试并覆盖嵌套地址、邮箱、价格注入 |
| 未完成配置时 readiness 本身不可用 | 鉴权后允许读取缺项诊断；不调用供应商，不把配置存在当作支付验收 |
| 订单入口未使用既有 HTTPS origin 校验 | 无效协议、URL 凭据、路径、query 等在数据库/供应商操作前返回 503 |
| 支付核验未同时检查 intent 和 invoice | 已要求 `CAPTURE` 与当前订单的 `test-<id>` 发票，增加错误 intent/发票回归用例 |
| 服务端支付/CJ 请求默认跟随重定向 | OAuth、API key 交换和 API 请求统一 `redirect: error`；本地真实 HTTP 307 夹具证明重定向接收端收到 0 次请求，避免凭据特别是 CJ 自定义头被转送 |
| 全站小字对比度不足 | 统一加深辅助文字；所有正常页面、空/非空购物车与两个不存在路由执行 axe WCAG A/AA 标签扫描，无报告违规 |
| 触控操作目标偏小 | 数量按钮扩大到 44×44 CSS px，移除按钮至少 44px 高；在触屏模拟中实际用 tap 增量至上限 |
| 移动菜单无法 Escape 关闭，缩放视口后保留打开状态 | 增加 Escape、焦点返回、桌面断点关闭和事件清理，浏览器回归覆盖 |
| 空白 cable 输入被转换为零，错误没有关联输入 | 空白数字作为无效值处理；对错误字段设置 `aria-invalid`/`aria-describedby`；推荐卡片按钮增加商品名区分 |
| lint 间接依赖的 7 项中等风险告警 | 更新兼容范围内锁定依赖，并对 typescript-estree 的 minimatch 设置 11.0.1 定向 override；保留其调用的 `minimatch()` API，lint、类型检查、构建均通过，最终 npm audit 为 0 |
| 验证日志难以复现 | 新增 `npm run verify`，逐项保存完整输出、实际/预期退出码和时间，锁文件 SHA-256 记录在 summary 中；CI 增加依赖审计 |

修复前复现日志：[5 个后端边界失败](qa/2026-11-14/logs/13-security-reproduction.log)、[原始浏览器审计 18 失败 / 22 通过](qa/2026-11-14/logs/14-browser-reproduction.log)、[首页 axe 原始违规](qa/2026-11-14/baseline-axe.json)。历史失败和一次中间构建类型错误均保留在日志中，没有删去失败结果冒充一次性成功。

## 本次最终运行结果

完整机器记录：[final/summary.json](qa/2026-11-14/final/summary.json)。每个步骤的完整 stdout/stderr 在同目录，合并输出在 [29-final-verification.log](qa/2026-11-14/logs/29-final-verification.log)。

| 命令 | 实际结果 |
| --- | --- |
| `npm ci` | 通过；375 个包安装完成，锁文件可复现 |
| `npm audit --json` | 通过；0 已知告警，修复前为 7 项 moderate |
| `npm run lint` | 通过，0 warnings |
| `npm run typecheck` | 通过 |
| `npm test` | **70/70 通过**，0 skipped，包含 SQLite、并发、幂等、金额/订单核验、异常 hold、鉴权、配置、输入、重定向、购物车、成本证据等 |
| `npm run build:commerce` | 通过；仅编译独立 Worker，没有部署 |
| `npm run build` | 通过；静态页面生成完成 |
| `npm run check:export` | 通过；11 个 HTML、251 个站内资源/链接引用，metadata/OG/robots/sitemap、无支付 SDK 检查 |
| `npm run test:e2e` | **54/54 通过**；5 个宽度 320/375/390/768/1440，加 390px 移动触屏模拟项目；0 skipped，最终运行无重试失败 |
| `npm run check:launch` | 诊断命令运行通过，但结果是 `commercialEvidenceReady=false`、`checkoutEnabled=false`，列出 20 个商业阻碍 |
| `npm run check:launch -- --require-commercial` | **预期阻断，退出 2**，不是已可商用 |
| 无凭据 `sandbox:acceptance check --network=sandbox` | **预期阻断，退出 2**，`externalEndToEndAccepted=false`，没有远程调用 |

浏览器覆盖每个项目的 12 个正常/错误路由扫描，另有非空 bag 扫描；检查横向溢出、页面脚本异常、导航/筛选、localStorage 损坏和禁用、跨页/刷新/跨标签同步、增减/删除/清空、上限、金额和下载 JSON 内容、键盘跳过链接、菜单焦点、伪造支付回跳。测试拦截外部请求并要求外部请求列表为空。

这不是完整 WCAG 合规证明：真实 iOS Safari/Android 设备、屏幕阅读器及人工 200% 浏览器缩放仍需验收。自动扫描也不能替代图片描述质量和所有交互状态的人工判断。

本机 `playwright install --with-deps chromium` 的系统安装阶段因无 root 密码失败；随后 `playwright install chromium` 成功下载匹配浏览器，并使用环境已有系统库完成了全部浏览器测试。[失败安装记录](qa/2026-11-14/logs/09-browser-install.log) 和 [成功下载记录](qa/2026-11-14/logs/11-browser-download.log) 均已保留。

## 密钥、性能、SEO 与实际线上差异

密钥扫描使用校验了官方 release SHA-256 的 Gitleaks 8.30.1，并全量脱敏输出。Git 完整历史有 20 个可达提交，扫描器扫描了 17 个有内容的提交；另扫描了待发布源码快照和最终 `out/`。三者均无检测命中：[历史](qa/2026-11-14/logs/26-gitleaks-history.log)、[工作树](qa/2026-11-14/logs/28-gitleaks-worktree-final.log)、[最终导出](qa/2026-11-14/logs/31-gitleaks-export-final.log)。这只能说明未检测到规则匹配，不能证明远端秘密已配置、密钥未被外部泄露或拥有生产权限。

后端管理员 token 需要至少 32 字符，订单/供应商读写和 readiness 都受 Bearer 鉴权；webhook 独立验证签名和支付状态。没有开放管理员 CORS。SQL 使用参数绑定；异常不回显供应商响应。生产仍需管理员身份与细分权限、共享限速、轮换、审计/告警、备份恢复及部署级安全控制。CJ 请求限速/令牌缓存目前仅作用于单个 Worker isolate，不足以证明生产多实例下的共享协调。

性能实验见 [performance.json](qa/2026-11-14/performance.json)：本地静态预览、CPU 4 倍降速、150ms latency、500KB/s 下行，一次首页冷 context，后续路由共享缓存；390/1440px 的首页、商品、空 bag 共 6 次观察。LCP 约 0.62–1.71 秒，CLS 0–0.039；单路由加载的 JS 原始体积约 505–516KB，单独 gzip 估算约 155–160KB。预览服务器未启用实际 HTTP 压缩，不能把估算写成线上传输量；这些不是现场 Core Web Vitals 或 Lighthouse 分数。当前未观察到需要为本次修复引入额外性能框架的瓶颈，发布时仍应确认 CDN Brotli/gzip、缓存和真实移动网络。

本地导出有页面 description/canonical、OG 图片、viewport、`en-AU`、noindex 和 robots 全站禁止抓取。没有把演示商品添加为可售 Offer，也没有为了“SEO”移除演示 noindex。

**2026-11-14 08:27 UTC 实际公开站点与源码存在漂移**，证据在 [public-host.json](qa/2026-11-14/public-host.json)：

- 首页、抽查商品、bag、政策返回 200，随机不存在路由返回 404，演示提示存在。
- 这些 HTML 响应没有 `X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`；源码 `public/_headers` 的声明不能视作线上已生效。抽查响应也没有 CSP。
- 线上 robots 允许 `/` 和 `/tech-kit/`，不同于源码 `Disallow: /`；线上 sitemap 只有首页及 `/tech-kit/`，后者不存在于本仓库路由中。
- 未识别线上对应的精确源码 commit；本分支修复尚不能被视作已经部署。上线负责人需要确认部署来源与项目身份，处理 host 的响应头/robots 规则，并发布后重新从真实域名验证。

## 距离真实接单还差什么

| 优先级 | 所需工作 | 可验证的完成条件 |
| --- | --- | --- |
| P0 商品与供货 | 选择真实 SKU/变体，批准样品、规格、安全/负载资料、图片使用权，接入有效库存/价格 | 经人工核验的供货/样品记录；公开商品 ID 与受控服务端目录一致 |
| P0 运费、税务与利润 | AU 服务范围、邮编运费、GST/关税、费率、汇率、采购预算与损失准备 | 有效期内报价与成本证据；正毛利；服务器对每个订单重新报价和检查 |
| P0 卖家与售后 | 合法卖家身份、可接收的客服、退货地址、最终政策和支持时效 | 实际验证客服收件与退货流程；对外条款与实际运营一致 |
| P0 生产结账实现 | 买家交互、收货地址验证、隐私控制、服务端报价/库存、生产支付与订单确认 | 经过独立审查的实现；不得复用管理员 token 或把演示金额当付款依据 |
| P0 真实账户及配置 | PayPal 商户及对应 sandbox/live app、webhook、CJ 账户权限、数据库和服务器秘密 | 仅在秘密存储中配置；运行时鉴权/数据库检查通过；公开端没有服务端秘密 |
| P0 外部与故障验收 | 新鲜沙箱买家批准→capture→供应商模拟、外部签名回调、退款/冲正、超时恢复、重复事件 | 对应部署 commit 的私有官方账户记录；重复请求不重复采购；失败有人工处理入口 |
| P0 履约能力 | 真实采购授权、发货/追踪、取消/退款/争议、订单交接与告警 | 从付款到实际交付与异常处理的可追踪证据；CJ 模拟付款不算发货 |
| P0 部署同步 | 确认 storefront/backend 独立身份、D1 绑定/迁移、回调可达性、安全响应头和域名配置 | 精确 commit 发布记录；真实域名路由、404、robots、安全头、回调重新验收 |
| P1 上线体验 | 真机 Safari/Android、读屏、人工放大、真实网络与现场性能 | 有日期、设备/浏览器和结论的验收记录 |

本环境没有注入支付/CJ 运行时秘密，也没有已确认的外部部署授权和商业采购预算。本次没有创建新账户、购买域名、付费调用、真实扣款、退款、采购、远程迁移或部署。所需外部权限/账户与成本资料不能由源码测试替代。

## 复现与交付范围

```sh
# Node 22/24；先安装依赖及匹配的 Playwright Chromium。
npm ci
npx playwright install chromium
# 将完整输出写到 gitignored 的 verification-results/。
npm run verify
# 或指定保存目录（本次提交包含如下目录的真实运行日志）。
npm run verify -- docs/qa/2026-11-14/final
```

`verify` 中两个退出 2 是“商业条件未满足”和“无凭据沙箱阻断”的预期结果；`allExpected=true` 只表示检查行为与预期一致。它不是 `checkoutEnabled=true`，也不是真实收入、发货或外部验收。

本次交付的可验证状态为：**源码修复完成、完整本地检查完成、商业接单阻断、外部部署与真实交易未执行。** 本分支用于代码审查，不应据此切换生产收款。
