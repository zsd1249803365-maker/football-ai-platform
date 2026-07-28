/**
 * 精简请求 + 多数据源尝试
 * 免费计划限流严，尽量 1~2 次请求
 */

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
      trend: "实时数据",
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
    motivation: { level: "赛事", impact: 3 },
    schedule: { recent_match: "-", fatigue: 0 },
    rotation: { risk: "未知", impact: 0 },
    style_match: {
      home_style: "-",
      away_style: "-",
      matchup: "基于赔率/赛程估算",
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
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  if (req.method === "OPTIONS") return res.status(200).end();

  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    return res.status(200).json({
      ok: false,
      reason: "missing_key",
      matches: [],
    });
  }

  const debug = [];
  try {
    let raw = [];

    // 1) 全球 next
    try {
      const d = await apiGet(`/fixtures?next=50`, key);
      raw = d?.response || [];
      debug.push({ step: "next50", n: raw.length, errors: d?.errors || null });
    } catch (e) {
      debug.push({ step: "next50", err: String(e.message) });
    }

    // 2) 若空：今天起 30 天（不限联赛）
    if (!raw.length) {
      try {
        const from = new Date().toISOString().slice(0, 10);
        const to = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
        const d = await apiGet(`/fixtures?from=${from}&to=${to}`, key);
        raw = d?.response || [];
        debug.push({ step: "from-to", n: raw.length, errors: d?.errors || null });
      } catch (e) {
        debug.push({ step: "from-to", err: String(e.message) });
      }
    }

    // 3) 若仍空：世界杯 2026 (league=1)
    if (!raw.length) {
      try {
        const d = await apiGet(`/fixtures?league=1&season=2026&next=30`, key);
        raw = d?.response || [];
        debug.push({ step: "wc2026", n: raw.length, errors: d?.errors || null });
      } catch (e) {
        debug.push({ step: "wc2026", err: String(e.message) });
      }
    }

    // 4) 英超最近一轮（可能含已完赛，用于验证 Key 有数据）
    if (!raw.length) {
      try {
        const d = await apiGet(`/fixtures?league=39&season=2025&last=10`, key);
        raw = d?.response || [];
        debug.push({ step: "epl-last", n: raw.length, errors: d?.errors || null });
      } catch (e) {
        debug.push({ step: "epl-last", err: String(e.message) });
      }
    }

    // 不过滤状态：休赛期可能只有少数 NS；也展示近期完赛作演示
    const statusOk = new Set(["NS", "TBD", "PST", "SUSP", "1H", "HT", "2H", "ET", "P", "LIVE"]);
    let list = raw.filter((f) => {
      const s = f.fixture?.status?.short;
      return !s || statusOk.has(s) || s === "FT" || s === "AET" || s === "PEN";
    });

    // 优先未开赛
    list.sort((a, b) => {
      const au = statusOk.has(a.fixture?.status?.short) && a.fixture?.status?.short !== "FT" ? 0 : 1;
      const bu = statusOk.has(b.fixture?.status?.short) && b.fixture?.status?.short !== "FT" ? 0 : 1;
      if (au !== bu) return au - bu;
      return String(a.fixture?.date).localeCompare(String(b.fixture?.date));
    });

    list = list.slice(0, 25);

    // 尝试 1 场赔率（省额度）
    let sampleOdds = null;
    const firstId = list[0]?.fixture?.id;
    if (firstId) {
      try {
        const d = await apiGet(`/odds?fixture=${firstId}`, key);
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
          debug.push({ step: "odds", ok: true });
        }
      } catch (e) {
        debug.push({ step: "odds", err: String(e.message) });
      }
    }

    let matches = list.map((f, i) => mapFixture(f, i === 0 ? sampleOdds : null));

    const leagueFilter = req.query?.league;
    if (leagueFilter) {
      matches = matches.filter(
        (m) => m.league === leagueFilter || String(m.league).includes(leagueFilter)
      );
    }

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
