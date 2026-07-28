/**
 * Vercel Serverless: 拉取即将进行的比赛 + 赔率
 * 环境变量: API_FOOTBALL_KEY
 */

const LEAGUES = [
  { id: 39, name: "英超" },
  { id: 140, name: "西甲" },
  { id: 135, name: "意甲" },
  { id: 78, name: "德甲" },
  { id: 61, name: "法甲" },
  { id: 2, name: "欧冠" },
  { id: 3, name: "欧联" },
  { id: 848, name: "世俱杯" },
];

// 当前可能有效的赛季（7月跨赛季）
const SEASONS = [2026, 2025, 2024];

async function apiGet(path, key) {
  const res = await fetch(`https://v3.football.api-sports.io${path}`, {
    headers: { "x-apisports-key": key },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${t.slice(0, 120)}`);
  }
  return res.json();
}

function mapFixture(f, oddsMap, leagueName) {
  const home = f.teams?.home?.name || "主队";
  const away = f.teams?.away?.name || "客队";
  const fid = String(f.fixture?.id || "");
  const odds = oddsMap[fid] || { home: 2.1, draw: 3.3, away: 3.4 };

  const invH = 1 / (odds.home || 2.1);
  const invD = 1 / (odds.draw || 3.3);
  const invA = 1 / (odds.away || 3.4);
  const sum = invH + invD + invA || 1;
  const pH = invH / sum;
  const pA = invA / sum;

  const strengthHome = Math.round(70 + pH * 30);
  const strengthAway = Math.round(70 + pA * 30);
  const xgHome = +(1.1 + pH * 1.2).toFixed(2);
  const xgAway = +(1.1 + pA * 1.2).toFixed(2);

  const heat = odds.home < 1.55 ? "高" : odds.home < 2.15 ? "中" : "低";
  const heatRisk = heat === "高" ? -2 : heat === "中" ? -1 : 0;

  return {
    id: fid,
    league: leagueName || f.league?.name || "未知",
    home,
    away,
    kickoff: f.fixture?.date || "",
    status: f.fixture?.status?.short || "NS",
    strength: { home: strengthHome, away: strengthAway },
    form: {
      home: strengthHome - 5,
      away: strengthAway - 5,
      detail: { home: "实时估算", away: "实时估算" },
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
      analysis: `${home} vs ${away}，主 ${odds.home} / 平 ${odds.draw} / 客 ${odds.away}`,
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
      matchup: "基于实时赔率估算",
      impact: 0,
    },
    market_logic: {
      popular_side: pH > pA ? "主胜" : "客胜",
      cold_side: "平局",
      bookmaker_signal: "API-Football 实时赔率",
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

function isUpcoming(f) {
  const s = f.fixture?.status?.short;
  // 未开赛 / 待定 / 推迟 都算可分析
  return !s || ["NS", "TBD", "PST", "SUSP"].includes(s);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=300");

  if (req.method === "OPTIONS") return res.status(200).end();

  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    return res.status(200).json({
      ok: false,
      reason: "missing_key",
      message: "未配置 API_FOOTBALL_KEY",
      matches: [],
    });
  }

  const debug = [];
  try {
    const leagueParam = req.query?.league;
    const targets = leagueParam
      ? LEAGUES.filter((l) => l.name === leagueParam || String(l.id) === leagueParam)
      : LEAGUES;

    const all = [];
    const seen = new Set();
    const oddsMap = {};

    // 策略1: 按联赛 + next（多赛季尝试）
    for (const lg of targets.slice(0, 5)) {
      let fixtures = [];
      for (const season of SEASONS) {
        try {
          const data = await apiGet(
            `/fixtures?league=${lg.id}&season=${season}&next=10`,
            key
          );
          fixtures = data?.response || [];
          debug.push(`${lg.name} s${season}: ${fixtures.length}`);
          if (fixtures.length) break;
        } catch (e) {
          debug.push(`${lg.name} s${season}: err ${e.message}`);
        }
      }

      // 策略2: 该联赛用日期范围
      if (!fixtures.length) {
        try {
          const from = new Date().toISOString().slice(0, 10);
          const to = new Date(Date.now() + 21 * 864e5).toISOString().slice(0, 10);
          const data = await apiGet(
            `/fixtures?league=${lg.id}&from=${from}&to=${to}`,
            key
          );
          fixtures = data?.response || [];
          debug.push(`${lg.name} date: ${fixtures.length}`);
        } catch (e) {
          debug.push(`${lg.name} date: err`);
        }
      }

      for (const f of fixtures) {
        if (!isUpcoming(f)) continue;
        const fid = String(f.fixture?.id || "");
        if (!fid || seen.has(fid)) continue;
        seen.add(fid);
        all.push(mapFixture(f, oddsMap, lg.name));
      }
    }

    // 策略3: 全局 next（任意联赛，保证有数据）
    if (all.length < 3) {
      try {
        const data = await apiGet(`/fixtures?next=25`, key);
        const fixtures = data?.response || [];
        debug.push(`global next: ${fixtures.length}`);
        for (const f of fixtures) {
          if (!isUpcoming(f)) continue;
          const fid = String(f.fixture?.id || "");
          if (!fid || seen.has(fid)) continue;
          seen.add(fid);
          const lname = f.league?.name || "国际赛事";
          all.push(mapFixture(f, oddsMap, lname));
        }
      } catch (e) {
        debug.push(`global: ${e.message}`);
      }
    }

    // 尝试补赔率（按 fixture id，最多 5 个请求）
    const needOdds = all.slice(0, 8).filter((m) => !oddsMap[m.id]);
    for (const m of needOdds.slice(0, 5)) {
      try {
        const data = await apiGet(`/odds?fixture=${m.id}`, key);
        const o = data?.response?.[0];
        const bet = o?.bookmakers?.[0]?.bets?.find(
          (b) => b.name === "Match Winner" || b.id === 1
        );
        if (bet?.values) {
          const h = bet.values.find((v) => v.value === "Home");
          const d = bet.values.find((v) => v.value === "Draw");
          const a = bet.values.find((v) => v.value === "Away");
          const od = {
            home: parseFloat(h?.odd) || 2.1,
            draw: parseFloat(d?.odd) || 3.3,
            away: parseFloat(a?.odd) || 3.4,
          };
          oddsMap[m.id] = od;
          // 回写
          m.odds = od;
          const invH = 1 / od.home;
          const invD = 1 / od.draw;
          const invA = 1 / od.away;
          const s = invH + invD + invA;
          m.prediction = {
            home_win: Math.round((invH / s) * 100) + "%",
            draw: Math.round((invD / s) * 100) + "%",
            away_win: Math.round((invA / s) * 100) + "%",
            score: m.prediction.score,
          };
          m.ai_market.analysis = `${m.home} vs ${m.away}，主 ${od.home} / 平 ${od.draw} / 客 ${od.away}`;
        }
      } catch (_) {}
    }

    // 按时间排序
    all.sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff)));

    return res.status(200).json({
      ok: true,
      count: all.length,
      updatedAt: new Date().toISOString(),
      debug,
      matches: all,
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      reason: "api_error",
      message: String(err.message || err),
      debug,
      matches: [],
    });
  }
}
