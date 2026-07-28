/**
 * 精简请求版：免费计划约 10次/分钟、100次/天
 * 只打 1~3 个请求，避免 429
 */

async function apiGet(path, key) {
  const res = await fetch(`https://v3.football.api-sports.io${path}`, {
    headers: { "x-apisports-key": key },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.errors ? JSON.stringify(json.errors) : res.status;
    throw new Error(String(msg));
  }
  return json;
}

function mapFixture(f, odds) {
  const home = f.teams?.home?.name || "主队";
  const away = f.teams?.away?.name || "客队";
  const fid = String(f.fixture?.id || "");
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

  return {
    id: fid,
    league: f.league?.name || "国际赛事",
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
      trend: "实时赔率",
      heat,
      risk_note: heat === "高" ? "热门过热，注意防冷" : "市场热度正常",
    },
    ai_market: {
      odds_change: 0,
      heat_risk: heatRisk,
      handicap_support: pH > 0.45 ? 1 : pA > 0.4 ? -1 : 0,
      analysis: `${home} vs ${away}，主 ${od.home} / 平 ${od.draw} / 客 ${od.away}`,
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
  return !s || ["NS", "TBD", "PST", "SUSP"].includes(s);
}

function parseOdds(entry) {
  const bet =
    entry?.bookmakers?.[0]?.bets?.find((b) => b.name === "Match Winner" || b.id === 1) ||
    entry?.bookmakers?.[0]?.bets?.[0];
  if (!bet?.values) return null;
  const h = bet.values.find((v) => /home|1/i.test(String(v.value)));
  const d = bet.values.find((v) => /draw|x/i.test(String(v.value)));
  const a = bet.values.find((v) => /away|2/i.test(String(v.value)));
  return {
    home: parseFloat(h?.odd) || 2.1,
    draw: parseFloat(d?.odd) || 3.3,
    away: parseFloat(a?.odd) || 3.4,
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1200");

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
    // —— 只打 1 个主请求：全球接下来 30 场 ——
    let fixtures = [];
    try {
      const data = await apiGet(`/fixtures?next=30`, key);
      fixtures = (data?.response || []).filter(isUpcoming);
      debug.push(`next30: ${fixtures.length}`);
    } catch (e) {
      debug.push(`next30 err: ${e.message}`);
    }

    // 若为空，再试「今天 + 未来 14 天」日期范围（第 2 个请求）
    if (!fixtures.length) {
      try {
        const from = new Date().toISOString().slice(0, 10);
        const to = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
        const data = await apiGet(`/fixtures?from=${from}&to=${to}`, key);
        fixtures = (data?.response || []).filter(isUpcoming).slice(0, 30);
        debug.push(`dateRange: ${fixtures.length}`);
      } catch (e) {
        debug.push(`dateRange err: ${e.message}`);
      }
    }

    // 可选：给前 3 场补赔率（最多再 3 次，失败忽略）
    const oddsMap = {};
    for (const f of fixtures.slice(0, 3)) {
      const fid = f.fixture?.id;
      if (!fid) continue;
      try {
        const data = await apiGet(`/odds?fixture=${fid}`, key);
        const od = parseOdds(data?.response?.[0]);
        if (od) oddsMap[String(fid)] = od;
        debug.push(`odds ${fid}: ${od ? "ok" : "empty"}`);
      } catch (e) {
        debug.push(`odds ${fid}: ${e.message}`);
        break; // 限流就停
      }
    }

    const leagueFilter = req.query?.league;
    let matches = fixtures.map((f) =>
      mapFixture(f, oddsMap[String(f.fixture?.id)])
    );

    if (leagueFilter) {
      matches = matches.filter(
        (m) =>
          m.league === leagueFilter ||
          m.league.includes(leagueFilter)
      );
    }

    matches.sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff)));

    return res.status(200).json({
      ok: true,
      count: matches.length,
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
