# CJ 供货核验记录

记录日期：2026-10-22（上海）。以下来自用户已登录的 CJ 商品页面，属于供应商页面报价与陈述，未采购样品，未验证实物质量，也未开通销售。

## 真实候选商品

- 商品：三层数码配件收纳包，黑色。
- CJ SKU：`CJJT107047201AZ`。
- [供应商商品页](https://cjdropshipping.com/product/cable-organizer-bag-travel-electronic-accessories-carrying-case-for-digital-camera-usb-charger-power-bank-storage-bag-box-p-1380028552015122432.html)。
- 页面货价：**US$3.95 / 件**。
- 页面重量：320 g；商品尺寸 27 × 20 × 10 cm；包装尺寸 280 × 210 × 100 mm。
- 发货地：中国；计算条件：**Selling on API、Ship to AU、数量 1**。
- 未输入客户地址或邮编，因此这是国家级试算，**不是全澳任意邮编的最终含税到手价**。
- CJ 页面区分工厂数量和 CJ 仓数量；未将其复制为本店“现货”或库存承诺。

## 两条核查线路（USD）

| 线路 | 运费 | 货价加运费 | 页面时效分布 |
| --- | ---: | ---: | --- |
| CJPacket Eub | 8.33 | 12.28 | 6–10 天 48%；11–14 天 37%；15 天以上 15% |
| CJPacket Ordinary | 11.62 | 15.57 | 4–8 天 52%；9–11 天 36%；12 天以上 12% |

两条线路页面均给出处理阶段“1–3 天，覆盖 90% 订单”。这些是页面展示的统计/估计，不能写成对买家的交付保证，也未确认页面的“天”是否全部指工作日。

Eub 页面附有部分目的地无法持续追踪、争议受理限制及 DDU 清关提示。Ordinary 用作**后续沙盒接口的候选线路**，不代表已验证全程追踪或可免税。真实路线、邮编附加费、GST、清关责任、退货政策和最终账单仍需核实。

## 商业判断

暂不确定零售价或利润，不把美元成本直接与澳元售价相减。网站现有 A$39 示例售价不构成这件真实商品的定价依据。应在真实邮编报价、兑换和支付费用、售后损耗、图片权利及样品检查完成后定价。

## 接入说明

真实账户的验证、API 连接状态和凭据不在公开仓库中记录。

- 按 CJ 官方文档完成邮箱验证和 API 应用配置。首次创建 API 时，平台会提示创建默认主 API 店铺。
- API 名称中的 Sandbox 不限制密钥本身的权限。测试限制必须由订单代码和运行环境执行。
- 仅在服务端密钥存储中配置凭据；不要将密钥写入源码、GitHub、公开页面或浏览器存储。
- API 配置完成后仍须验证认证、订单创建、付款核验、签名回调、重复通知和失败处理，不能以配置状态代替端到端测试。
- 真实采购、充值、扣款、客户地址处理及真实发货属于后续正式上线范围。

## 官方接口依据

- [认证与 API Key 设置](https://developers.cjdropshipping.com/en/api/api2/api/auth.html)
- [订单创建和沙盒支付](https://developers.cjdropshipping.com/en/api/api2/api/shopping.html)
- [沙盒模式](https://developers.cjdropshipping.com/en/api/start/sandbox.html)
- [运费试算](https://developers.cjdropshipping.com/en/api/api2/api/logistic.html)
