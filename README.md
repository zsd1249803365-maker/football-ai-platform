# ⚽ Football AI Platform v4.0

竞彩智能分析系统 —— 多维数据驱动的足球比赛评分与推荐。

**在线预览**：https://football-ai-platform-one.vercel.app

---

## 功能

- 首页数据概览 + AI 精选
- 比赛列表
- AI 评分排行榜（带概率条）
- 稳健 / 平衡 / 博冷 方案生成
- 单场深度分析报告

## 评分算法 v4.0（统一）

所有页面共用 `js/score.js` 中的 `analyzeMatch()`：

| 维度 | 权重说明 |
|------|----------|
| 球队实力差 | ×0.35 |
| 近期状态差 | ×0.25 |
| xG 差 | ×12（攻击威胁强信号） |
| 防守差 | ×0.18 |
| 盘口/市场信号 | odds_change、handicap、heat_risk |
| 伤停 / 战意 / 疲劳 / 风格 | 直接加减分 |

输出：主客评分、胜平负概率、推荐方向、风险等级、星级、预测比分。

## 项目结构

```
├── css/style.css      # 现代深色主题
├── js/score.js        # 统一评分引擎 + 数据加载
├── matches.json       # 比赛数据（当前示例）
├── index.html
├── matches.html
├── ai-ranking.html
├── ai-bet.html
└── match-detail.html
```

## 接入实时数据（API-Football）

当前为静态 JSON。要接真实数据：

1. 去 [https://www.api-football.com](https://www.api-football.com) 注册，免费计划约 100 次/天。
2. 获取 API Key。
3. 推荐在 Vercel 添加 Serverless Function（避免前端暴露 Key）：

```js
// api/fixtures.js (Vercel)
export default async function handler(req, res) {
  const key = process.env.API_FOOTBALL_KEY;
  const r = await fetch(
    "https://v3.football.api-sports.io/fixtures?league=39&season=2025&next=10",
    { headers: { "x-apisports-key": key } }
  );
  const data = await r.json();
  // 映射成 matches.json 结构后返回
  res.json(data);
}
```

4. 在 `js/score.js` 的 `loadMatches()` 中改为请求 `/api/fixtures`。

其他可选免费/便宜源：
- football-data.org（需注册）
- TheSportsDB
- API-Sports 全家桶

## 本地预览

直接打开 HTML 或使用任意静态服务器：

```bash
npx serve .
```

## 免责声明

本项目仅供学习与研究，数据与推荐不构成投注建议。请理性购彩，量力而行。
