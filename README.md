# ⚽ Football AI Platform v5.0

综合足球赛程 · 真实赔率 · 多维 AI 评分分析

**在线预览**：https://football-ai-platform-one.vercel.app

---

## v5.0 更新（合并产品规格要点）

- 🔗 **真实赔率**：The Odds API（多家书商 h2h 平均，EU 区域）
- 🎯 **联赛筛选**：美职联 / 瑞典超 / 挪超 / 巴甲 / 英超 / 西甲 / 德甲 等
- 📊 **风险筛选**：低 / 中 / 高
- 💰 **自动赔率参与评分**：隐含概率估算实力与 xG
- 🟡 **本地回退**：未配置 Key 时使用 `matches.json`
- 📝 **深度中文分析**：赔率结构 + 模型 vs 市场偏差 + 风险建议

> 说明：规格文档中的 OpticOdds 为 B2B 企业级接口（需销售开通），当前免费可用方案仍为 **The Odds API**。

## 如何接入真实赔率

### 1. 获取 The Odds API Key（免费额度）

打开 → https://the-odds-api.com/  
注册后复制 API Key。

### 2. 在 Vercel 添加环境变量

1. 打开项目 Settings → Environment Variables
2. 新增：
   - **Key**：`THE_ODDS_API_KEY`
   - **Value**：你的 API Key
   - 环境勾选 Production / Preview
3. 保存后 **Redeploy**（Deployments → 最新 → ⋯ → Redeploy）

### 3. 验证

打开网站首页，数据状态应显示 **🟢 真实赔率（The Odds API）**。

---

## 评分算法

`js/score.js` → `analyzeMatch()`

| 维度 | 权重 |
|------|------|
| 实力差 | ×0.35 |
| 状态差 | ×0.25 |
| xG 差 | ×12 |
| 防守差 | ×0.18 |
| 盘口/热度/伤停等 | 直接加减 |

实时模式下，实力与 xG 由**赔率隐含概率**估算，热度影响风险评级。

## 项目结构

```
api/fixtures.js   # Vercel Serverless：赛程+赔率（The Odds API → TheSportsDB 回退）
css/style.css
js/score.js       # 评分 + 数据加载 + 中文分析报告
matches.json      # 本地示例回退
*.html
```

## 免责声明

仅供学习研究，不构成投注建议。请理性购彩。
