/**
 * 综合赛程 + 真实赔率
 * 1) 有 THE_ODDS_API_KEY → The Odds API（真实赔率，优先）
 * 2) 否则 → TheSportsDB 赛程（无赔率）
 *
 * 免费注册 The Odds API: https://the-odds-api.com/
 * Vercel 环境变量名: THE_ODDS_API_KEY
 */

const ODDS_SPORTS = [
  { key: "soccer_epl", name: "英超" },
  { key: "soccer_spain_la_liga", name: "西甲" },
  { key: "soccer_italy_serie_a", name: "意甲" },
  { key: "soccer_germany_bundesliga", name: "德甲" },
  { key: "soccer_france_ligue_one", name: "法甲" },
  { key: "soccer_uefa_champs_league", name: "欧冠" },
  { key: "soccer_uefa_europa_league", name: "欧联" },
  { key: "soccer_usa_mls", name: "美职联" },
];

const TSDB_LEAGUES = [
  { id: "4328", name: "英超" },
  { id: "4335", name: "西甲" },
  { id: "4332", name: "意甲" },
  { id: "4331", name: "德甲" },
  { id: "4334", name: "法甲" },
  { id: "4480", name: "欧冠" },
];

const TSDB = "https://www.thesportsdb.com/api/v1/json/123";

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "FootballAI/4.3" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** 从多家书商取平均 1X2 赔率 */
function avgH2H(bookmakers, homeName, awayName) {
  const homes = [];
  const draws = [];
  const aways = [];
  for (const bk of bookmakers || []) {
    const m = (bk.markets || []).find((x) => x.key === "h2h");
    if (!m?.outcomes) continue;
    for (const o of m.outcomes) {
      const p = parseFloat(o.price);
      if (!p) continue;
      const n = (o.name || "").toLowerCase();
      if (n === "draw") draws.push(p);
      else if (homeName && n === homeName.toLowerCase()) homes.push(p);
      else if (awayName && n === awayName.toLowerCase()) aways.push(p);
      else if (o.name === homeName) homes.push(p);
      else if (o.name === awayName) aways.push(p);
    }
  }
  const avg = (arr, def) =>
    arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : def;
  return {
    home: avg(homes, 2.2),
    draw: avg(draws, 3.3),
    away: avg(aways, 3.2),
  };
}

function mapWithOdds(home, away, league, kickoff, id, odds, extra = {}) {
  const od = odds || { home: 2.2, draw: 3.3, away: 3.2 };
  const invH = 1 / (od.home || 2.2);
  const invD = 1 / (od.draw || 3.3);
  const invA = 1 / (od.away || 3.2);
  const sum = invH + invD + invA || 1;
  const pH = invH / sum;
  const pA = invA / sum;
  const strengthHome = Math.round(68 + pH * 32);
  const strengthAway = Math.round(68 + pA * 32);
  const heat = od.home < 1.5 ? "高" : od.home < 2.1 ? "中" : "低";
  const heatRisk = heat === "高" ? -2 : heat === "中" ? -1 : 0;

  return {
    id: String(id),
    league,
    home,
    away,
    kickoff: kickoff || "",
    status: "NS",
    strength: { home: strengthHome, away: strengthAway },
    form: {
      home: strengthHome - 4,
      away: strengthAway - 4,
      detail: { home: "赔率推算", away: "赔率推算" },
    },
    xg: {
      home: +(1.05 + pH * 1.3).toFixed(2),
      away: +(1.05 + pA * 1.3).toFixed(2),
    },
    defense: { home: strengthHome - 2, away: strengthAway - 2 },
    odds: od,
    market: {
      asian_handicap: { line: "-", home: "-", away: "-" },
      goal: { line: "2.5", over: "大", under: "小" },
    },
    market_analysis: {
      trend: extra.hasOdds ? "真实赔率" : "默认盘口",
      heat,
      risk_note:
        heat === "高" ? "热门过热，注意防冷" : heat === "中" ? "热度适中" : "冷门方向",
    },
    ai_market: {
      odds_change: 0,
      heat_risk: heatRisk,
      handicap_support: pH > 0.48 ? 1 : pA > 0.42 ? -1 : 0,
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
      matchup: extra.hasOdds ? "基于真实赔率隐含概率" : "综合赛程",
      impact: 0,
    },
    market_logic: {
      popular_side: pH > pA ? "主胜" : "客胜",
      cold_side: "平局",
      bookmaker_signal: extra.hasOdds ? "多家书商平均赔率" : "无",
      impact: heatRisk,
    },
    prediction: {
      home_win: Math.round(pH * 100) + "%",
      draw: Math.round((1 - pH - pA) * 100) + "%",
      away_win: Math.round(pA * 100) + "%",
      score: pH > 0.48 ? "2-1" : pA > 0.42 ? "1-2" : "1-1",
    },
    risk: heat === "高" ? "较高" : "中等",
    source: extra.source || "odds-api",
  };
}

async function fetchOddsApi(key, leagueFilter) {
  const debug = [];
  const all = [];
  let targets = ODDS_SPORTS;
  if (leagueFilter) {
    const hit = ODDS_SPORTS.filter(
      (s) => s.name === leagueFilter || s.key.includes(leagueFilter)
    );
    if (hit.length) targets = hit;
  }
  // 免费额度有限：默认最多拉 4 个联赛
  targets = targets.slice(0, leagueFilter ? 2 : 4);

  for (const sp of targets) {
    try {
      const url =
        `https://api.the-odds-api.com/v4/sports/${sp.key}/odds` +
        `?apiKey=${encodeURIComponent(key)}&regions=eu&markets=h2h&oddsFormat=decimal`;
      const res = await fetch(url);
      const remaining = res.headers.get("x-requests-remaining");
      const used = res.headers.get("x-requests-used");
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        debug.push({ sport: sp.name, err: `${res.status} ${t.slice(0, 80)}` });
        continue;
      }
      const events = await res.json();
      debug.push({
        sport: sp.name,
        n: Array.isArray(events) ? events.length : 0,
        remaining,
        used,
      });
      for (const ev of events || []) {
        const home = ev.home_team;
        const away = ev.away_team;
        const odds = avgH2H(ev.bookmakers, home, away);
        all.push(
          mapWithOdds(home, away, sp.name, ev.commence_time, ev.id, odds, {
            hasOdds: true,
            source: "odds-api",
          })
        );
      }
    } catch (e) {
      debug.push({ sport: sp.name, err: String(e.message || e) });
    }
  }
  return { matches: all, debug };
}

async function fetchSportsDb(leagueFilter) {
  const debug = [];
  const all = [];
  const seen = new Set();
  let targets = TSDB_LEAGUES;
  if (leagueFilter) {
    const hit = TSDB_LEAGUES.filter((l) => l.name === leagueFilter);
    if (hit.length) targets = hit;
  }
  for (const lg of targets) {
    try {
      const data = await getJson(`${TSDB}/eventsnextleague.php?id=${lg.id}`);
      const events = data?.events || [];
      debug.push({ league: lg.name, n: events.length });
      for (const e of events) {
        const id = String(e.idEvent || "");
        if (!id || seen.has(id)) continue;
        seen.add(id);
        all.push(
          mapWithOdds(
            e.strHomeTeam,
            e.strAwayTeam,
            lg.name,
            e.strTimestamp || `${e.dateEvent}T${e.strTime || "00:00:00"}`,
            id,
            null,
            { hasOdds: false, source: "thesportsdb" }
          )
        );
      }
    } catch (e) {
      debug.push({ league: lg.name, err: String(e.message || e) });
    }
  }
  return { matches: all, debug };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  if (req.method === "OPTIONS") return res.status(200).end();

  const leagueFilter = req.query?.league;
  const oddsKey = process.env.THE_ODDS_API_KEY;

  try {
    if (oddsKey) {
      const { matches, debug } = await fetchOddsApi(oddsKey, leagueFilter);
      matches.sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff)));
      return res.status(200).json({
        ok: matches.length > 0,
        count: matches.length,
        source: "odds-api",
        note:
          matches.length > 0
            ? "真实赔率来自 The Odds API（多家书商平均）"
            : "当前联赛暂无开售场次",
        updatedAt: new Date().toISOString(),
        debug,
        matches,
      });
    }

    // 无 Key：回退 TheSportsDB
    const { matches, debug } = await fetchSportsDb(leagueFilter);
    matches.sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff)));
    return res.status(200).json({
      ok: matches.length > 0,
      count: matches.length,
      source: "thesportsdb",
      note: "未配置 THE_ODDS_API_KEY，仅有赛程无真实赔率。请到 the-odds-api.com 免费注册并填入 Vercel 环境变量。",
      updatedAt: new Date().toISOString(),
      debug,
      matches,
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
