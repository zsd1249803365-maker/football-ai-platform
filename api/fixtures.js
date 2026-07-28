/**
 * API-Football 免费计划实际限制（实测）：
 * - 无 next / last 参数
 * - 赛季仅 2022-2024
 * - 可用: league + season + date  或  league + season（整季可能很大）
 */

const LEAGUES = [
  { id: 39, name: "英超" },
  { id: 140, name: "西甲" },
  { id: 135, name: "意甲" },
  { id: 78, name: "德甲" },
  { id: 61, name: "法甲" },
];

// 2023-24 赛季末尾几轮的日期（有比赛）
const SAMPLE_DATES = [
  "2024-05-19",
  "2024-05-18",
  "2024-05-12",
  "2024-05-11",
  "2024-05-05",
];

async function apiGet(path, key) {
  const res = await fetch(`https://v3.football.api-sports.io${path}`, {
    headers: { "x-apisports-key": key },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.errors ? JSON.stringify(json.errors) : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

function mapFixture(f, odds) {
  const home = f.teams?.home?.name || "主队";
  const away = f.teams?.away?.name || "客队";
  const fid = String(f.fixture?.id || Math.random());
  const od = odds || { home: 2.1, draw: 3.3, away: 3.4 };

  const invH = 1 / (od.home || 2.1);
  const invD = 1 / (od.draw || 3.3);
  const invA = 1 / (od.away || 3.4);
  const sum = invH + invD + invA || 1;
  const pH = invH / sum;
  const pA = invA / sum;

  const strengthHome = Math.round(70 + pH * 30);
  const strengthAway = Math.round(70 + pA * 30);
  const heat = od.home < 1.55 ? "高" : od.home < 2.15 ? "中" : "低";
  const heatRisk = heat === "高" ? -2 : heat === "中" ? -1 : 0;
  const status = f.fixture?.status?.short || "NS";

  return {
    id: fid,
    league: f.league?.name || "联赛",
    home,
    away,
    kickoff: f.fixture?.date || "",
    status,
    score: f.goals ? `${f.goals.home ?? "-"}-${f.goals.away ?? "-"}` : null,
    strength: { home: strengthHome, away: strengthAway },
    form: {
      home: strengthHome - 5,
      away: strengthAway - 5,
      detail: { home: "2024赛季数据", away: "2024赛季数据" },
    },
    xg: {
      home: +(1.1 + pH * 1.2).toFixed(2),
      away: +(1.1 + pA * 1.2).toFixed(2),
    },
    defense: { home: strengthHome - 3, away: strengthAway - 3 },
    odds: od,
    market: {
      asian_handicap: { line: "-", home: "-", away: "-" },
      goal: { line: "2.5", over: "大", under: "小" },
    },
    market_analysis: {
      trend: "2023-24赛季历史数据（免费计划限制）",
      heat,
      risk_note: heat === "高" ? "热门过热" : "热度正常",
    },
    ai_market: {
      odds_change: 0,
      heat_risk: heatRisk,
      handicap_support: pH > 0.45 ? 1 : pA > 0.4 ? -1 : 0,
      analysis: `${home} vs ${away} · 主${od.home} 平${od.draw} 客${od.away}`,
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
      matchup: "基于赔率估算",
      impact: 0,
    },
    market_logic: {
      popular_side: pH > pA ? "主胜" : "客胜",
      cold_side: "平局",
      bookmaker_signal: "API-Football",
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
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1200");
  if (req.method === "OPTIONS") return res.status(200).end();

  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    return res.status(200).json({ ok: false, reason: "missing_key", matches: [] });
  }

  const debug = [];
  try {
    const leagueParam = req.query?.league;
    let targets = LEAGUES.slice(0, 2); // 控制请求次数
    if (leagueParam) {
      const hit = LEAGUES.filter(
        (l) => l.name === leagueParam || String(l.id) === leagueParam
      );
      if (hit.length) targets = hit.slice(0, 2);
    }

    const raw = [];
    const seen = new Set();

    // 每个联赛试 2 个日期，最多约 4 次请求
    for (const lg of targets) {
      for (const date of SAMPLE_DATES.slice(0, 2)) {
        try {
          const d = await apiGet(
            `/fixtures?league=${lg.id}&season=2023&date=${date}`,
            key
          );
          // 也试 2024 season
          let list = d?.response || [];
          if (!list.length) {
            const d2 = await apiGet(
              `/fixtures?league=${lg.id}&season=2024&date=${date}`,
              key
            );
            list = d2?.response || [];
            debug.push({ league: lg.name, date, season: 2024, n: list.length, errors: d2?.errors });
          } else {
            debug.push({ league: lg.name, date, season: 2023, n: list.length });
          }
          for (const f of list) {
            const id = String(f.fixture?.id || "");
            if (id && !seen.has(id)) {
              seen.add(id);
              raw.push(f);
            }
          }
          if (raw.length >= 12) break;
        } catch (e) {
          debug.push({ league: lg.name, date, err: String(e.message) });
        }
      }
      if (raw.length >= 12) break;
    }

    // 兜底：不带 date，只 league+season（可能返回较多，截断）
    if (!raw.length) {
      try {
        const d = await apiGet(`/fixtures?league=39&season=2023`, key);
        const list = (d?.response || []).slice(-15);
        debug.push({ step: "epl-full-2023", n: list.length, errors: d?.errors });
        raw.push(...list);
      } catch (e) {
        debug.push({ step: "epl-full", err: String(e.message) });
      }
    }

    let sampleOdds = null;
    const fid = raw[0]?.fixture?.id;
    if (fid) {
      try {
        const d = await apiGet(`/odds?fixture=${fid}`, key);
        const bet = d?.response?.[0]?.bookmakers?.[0]?.bets?.find(
          (b) => b.name === "Match Winner" || b.id === 1
        );
        if (bet?.values) {
          const h = bet.values.find((v) => /Home|1/i.test(String(v.value)));
          const dr = bet.values.find((v) => /Draw|X/i.test(String(v.value)));
          const a = bet.values.find((v) => /Away|2/i.test(String(v.value)));
          sampleOdds = {
            home: parseFloat(h?.odd) || 2.1,
            draw: parseFloat(dr?.odd) || 3.3,
            away: parseFloat(a?.odd) || 3.4,
          };
          debug.push({ odds: "ok" });
        }
      } catch (e) {
        debug.push({ odds: String(e.message) });
      }
    }

    const matches = raw
      .map((f, i) => mapFixture(f, i === 0 ? sampleOdds : null))
      .sort((a, b) => String(b.kickoff).localeCompare(String(a.kickoff)));

    return res.status(200).json({
      ok: true,
      count: matches.length,
      note:
        "免费计划无法获取未来赛程（无 next/last）。当前展示 2023/2024 赛季真实历史比赛用于演示。升级付费可获实时赛程与赔率。",
      updatedAt: new Date().toISOString(),
      debug,
      matches,
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
