/**
 * Vercel Serverless: 拉取即将进行的比赛 + 赔率
 * 需要环境变量 API_FOOTBALL_KEY
 * 免费注册: https://dashboard.api-football.com/register
 */

const LEAGUES = [
  { id: 39, name: "英超", season: 2025 },
  { id: 140, name: "西甲", season: 2025 },
  { id: 135, name: "意甲", season: 2025 },
  { id: 78, name: "德甲", season: 2025 },
  { id: 61, name: "法甲", season: 2025 },
  { id: 2, name: "欧冠", season: 2025 },
];

async function apiGet(path, key) {
  const res = await fetch(`https://v3.football.api-sports.io${path}`, {
    headers: { "x-apisports-key": key },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function mapFixture(f, oddsMap, leagueName) {
  const home = f.teams?.home?.name || "主队";
  const away = f.teams?.away?.name || "客队";
  const fid = String(f.fixture?.id || "");
  const odds = oddsMap[fid] || { home: 2.0, draw: 3.2, away: 3.5 };

  // 用赔率反推隐含概率，再估一个 strength
  const invH = 1 / (odds.home || 2);
  const invD = 1 / (odds.draw || 3.2);
  const invA = 1 / (odds.away || 3.5);
  const sum = invH + invD + invA;
  const pH = invH / sum;
  const pA = invA / sum;

  const strengthHome = Math.round(70 + pH * 30);
  const strengthAway = Math.round(70 + pA * 30);

  // xG 粗估（和实力相关）
  const xgHome = +(1.1 + pH * 1.2).toFixed(2);
  const xgAway = +(1.1 + pA * 1.2).toFixed(2);

  const heat = odds.home < 1.6 ? "高" : odds.home < 2.2 ? "中" : "低";
  const heatRisk = heat === "高" ? -2 : heat === "中" ? -1 : 0;

  return {
    id: fid,
    league: leagueName,
    home,
    away,
    kickoff: f.fixture?.date || "",
    status: f.fixture?.status?.short || "NS",
    strength: { home: strengthHome, away: strengthAway },
    form: {
      home: strengthHome - 5,
      away: strengthAway - 5,
      detail: { home: "数据加载中", away: "数据加载中" },
    },
    xg: { home: xgHome, away: xgAway },
    defense: { home: strengthHome - 3, away: strengthAway - 3 },
    odds: { home: odds.home, draw: odds.draw, away: odds.away },
    market: {
      asian_handicap: { line: "-", home: "-", away: "-" },
      goal: { line: "2.5", over: "大", under: "小" },
    },
    market_analysis: {
      trend: "实时赔率",
      heat,
      risk_note: heat === "高" ? "热门过热，注意防冷" : "市场热度正常",
    },
    ai_market: {
      odds_change: 0,
      heat_risk: heatRisk,
      handicap_support: pH > 0.45 ? 1 : pA > 0.4 ? -1 : 0,
      analysis: `${home} vs ${away}，主胜赔 ${odds.home}，平 ${odds.draw}，客 ${odds.away}`,
    },
    injury: {
      home: { players: [], totalImpact: 0 },
      away: { players: [], totalImpact: 0 },
    },
    motivation: { level: "联赛", impact: 2 },
    schedule: { recent_match: "-", fatigue: 0 },
    rotation: { risk: "未知", impact: 0 },
    style_match: {
      home_style: "-",
      away_style: "-",
      matchup: "基于实时赔率与实力估算",
      impact: 0,
    },
    market_logic: {
      popular_side: pH > pA ? "主胜" : "客胜",
      cold_side: "平局",
      bookmaker_signal: "来自 API-Football 实时赔率",
      impact: heatRisk,
    },
    prediction: {
      home_win: Math.round(pH * 100) + "%",
      draw: Math.round((1 - pH - pA) * 100) + "%",
      away_win: Math.round(pA * 100) + "%",
      score: pH > 0.45 ? "2-1" : pA > 0.4 ? "1-2" : "1-1",
    },
    risk: heat === "高" ? "较高" : "中等",
    source: "api",
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    return res.status(200).json({
      ok: false,
      reason: "missing_key",
      message: "未配置 API_FOOTBALL_KEY，请使用本地数据",
      matches: [],
    });
  }

  try {
    const leagueParam = req.query?.league; // 可选筛选
    const targets = leagueParam
      ? LEAGUES.filter((l) => l.name === leagueParam || String(l.id) === leagueParam)
      : LEAGUES;

    const all = [];
    const oddsMap = {};

    for (const lg of targets.slice(0, 4)) {
      // 限制请求数，免费额度约 100/天
      const data = await apiGet(
        `/fixtures?league=${lg.id}&season=${lg.season}&next=8`,
        key
      );
      const fixtures = data?.response || [];

      // 批量拿赔率（每个 league 一次，节省额度）
      if (fixtures.length) {
        try {
          const oddsData = await apiGet(
            `/odds?league=${lg.id}&season=${lg.season}&bookmaker=8`,
            key
          );
          (oddsData?.response || []).forEach((o) => {
            const fid = String(o.fixture?.id || "");
            const bet = o.bookmakers?.[0]?.bets?.find((b) => b.name === "Match Winner");
            if (bet?.values) {
              const h = bet.values.find((v) => v.value === "Home");
              const d = bet.values.find((v) => v.value === "Draw");
              const a = bet.values.find((v) => v.value === "Away");
              oddsMap[fid] = {
                home: parseFloat(h?.odd) || 2.0,
                draw: parseFloat(d?.odd) || 3.2,
                away: parseFloat(a?.odd) || 3.5,
              };
            }
          });
        } catch (e) {
          // 赔率失败不影响赛程
        }
      }

      fixtures.forEach((f) => {
        if (f.fixture?.status?.short === "NS" || f.fixture?.status?.short === "TBD") {
          all.push(mapFixture(f, oddsMap, lg.name));
        }
      });
    }

    return res.status(200).json({
      ok: true,
      count: all.length,
      updatedAt: new Date().toISOString(),
      matches: all,
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      reason: "api_error",
      message: String(err.message || err),
      matches: [],
    });
  }
}
