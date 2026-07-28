# ⚽ Football AI Platform v4.1

竞彩智能分析系统 —— 支持实时赛程/赔率 + 多维评分 + 联赛筛选。

**在线预览**：https://football-ai-platform-one.vercel.app

---

## 新功能 (v4.1)

- 🔗 **真实数据接入**：通过 Vercel Serverless 代理 API-Football
- 🎯 **联赛筛选**：英超 / 西甲 / 意甲 / 德甲 / 法甲 / 欧冠
- 📊 **风险筛选**：低 / 中 / 高
- 💰 **自动赔率**：拉取书商赔率并参与评分
- 🟡 **本地回退**：未配置 Key 时自动使用 `matches.json`

## 如何接入实时数据（必须）

### 1. 注册免费 API Key

打开 → https://dashboard.api-football.com/register  
注册后在 Dashboard 复制 **API Key**（免费约 100 次/天）

### 2. 在 Vercel 添加环境变量

1. 打开 https://vercel.com/mini20/football-ai-platform/settings/environment-variables
2. 新增：
   - **Key**：`API_FOOTBALL_KEY`
   - **Value**：你的 API Key
   - 环境勾选 Production / Preview
3. 保存后 **Redeploy** 一次（Deployments → 最新 → Redeploy）

### 3. 验证

打开网站首页，应显示 **🟢 实时 API 数据**。  
比赛列表可按联赛、风险筛选，并显示实时赔率。

---

## 评分算法（统一）

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
api/fixtures.js   # Vercel Serverless：赛程+赔率
css/style.css
js/score.js       # 评分 + 数据加载（API优先）
matches.json      # 本地示例回退
*.html
```

## 免责声明

仅供学习研究，不构成投注建议。请理性购彩。
