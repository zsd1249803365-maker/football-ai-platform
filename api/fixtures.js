/**
 * Football AI fixtures API v4.3
 * 优先 The Odds API 真实赔率；失败则 TheSportsDB 赛程；再失败返回空让前端用本地 JSON
 *
 * Vercel 环境变量（任选其一）:
 *   THE_ODDS_API_KEY  （推荐）
 *   ODDS_API_KEY
 */

const ODDS_SPORTS = [
  // 夏季仍有比赛的联赛优先
  { key: "soccer_usa_mls", name: "美职联" },
  { key: "soccer_sweden_allsvenskan", name: "瑞典超" },
  { key: "soccer_norway_eliteserien", name: "挪超" },
  { key: "soccer_brazil_campeonato", name: "巴甲" },
  { key: "soccer_japan_j_league", name: "日职" },
  { key: "soccer_uefa_champs_league", name: "欧冠" },
  { key: "soccer_uefa_europa_league", name: "欧联" },
  { key: "soccer_epl", name: "英超" },
  { key: "soccer_spain_la_liga", name: "西甲" },
  { key: "soccer_italy_serie_a", name: "意甲" },
  { key: "soccer_germany_bundesliga", name: "德甲" },
  { key: "soccer_france_ligue_one", name: "法甲" },
];

const TSDB_LEAGUES = [
  { id: "4328", name: "英超" },
  { id: "4335", name: "西甲" },
  { id: "4332", name: "意甲" },
  { id: "4331", name: "德甲" },
  { id: "4334", name: "法甲" },
  { id: "4480", name: "欧冠" },
  { id: "4346", name: "美职联" },
];

const TSDB = "https://www.thesportsdb.com/api/v1/json/123";

function getOddsKey() {
  const raw =
    process.env.THE_ODDS_API_KEY ||
    process.env.ODDS_API_KEY ||
    process.env.the_odds_api_key ||
    "";
  return String(raw).trim();
}

async function getJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "FootballAI/4.3" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function avgH2H(bookmakers, homeName, awayName) {
  const homes = [];
  const draws = [];
  const aways = [];
  const homeL = (homeName || "").toLowerCase();
  const awayL = (awayName || "").toLowerCase();
  for (const bk of bookmakers || []) {
    const m = (bk.markets || []).find((x) => x.key === "h2h");
    if (!m?.outcomes) continue;
    for (const o of m.outcomes) {
      const p = parseFloat(o.price);
      if (!p) continue;
      const n = (o.name || "").toLowerCase();
      if (n === "draw") draws.push(p);
      else if (n === homeL || o.name === homeName) homes.push(p);
      else if (n === awayL || o.name === awayName) aways.push(p);
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
  const hasOdds = !!extra.hasOdds;

  return {
    id: String(id),
    league: league || "综合",
    home: home || "主队",
    away: away || "客队",
    kickoff: kickoff || "",
    status: "NS",
    strength: { home: strengthHome, away: strengthAway },
    form: {
      home: strengthHome - 4,
      away: strengthAway - 4,
      detail: { home: hasOdds ? "赔率推算" : "赛程数据", away: hasOdds ? "赔率推算" : "赛程数据" },
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
      trend: hasOdds ? "真实赔率" : "默认盘口",
      heat,
      risk_note:
        heat === "高" ? "热门过热，注意防冷" : heat === "中" ? "热度适中" : "偏冷门方向",
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
      matchup: hasOdds ? "基于真实赔率隐含概率" : "综合赛程",
      impact: 0,
    },
    market_logic: {
      popular_side: pH > pA ? "主胜" : "客胜",
      cold_side: "平局",
      bookmaker_signal: hasOdds ? "多家书商平均赔率" : "无",
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
      (s) => s.name === leagueFilter || s.key.includes(String(leagueFilter).toLowerCase())
    );
    if (hit.length) targets = hit;
  }
  // 免费额度：默认 5 个联赛
  targets = targets.slice(0, leagueFilter ? 3 : 5);

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
        debug.push({ sport: sp.name, err: `${res.status} ${t.slice(0, 100)}` });
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
        if (!home || !away) continue;
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
        // 跳过已完赛
        if (e.intHomeScore != null && e.intAwayScore != null && e.strStatus === "Match Finished") {
          continue;
        }
        seen.add(id);
        all.push(
          mapWithOdds(
            e.strHomeTeam,
            e.strAwayTeam,
            lg.name,
            e.strTimestamp || `${e.dateEvent || ""}T${e.strTime || "00:00:00"}`,
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
  res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=600");
  if (req.method === "OPTIONS") return res.status(200).end();

  const leagueFilter = req.query?.league;
  const oddsKey = getOddsKey();
  const hasKey = oddsKey.length > 8;

  try {
    // 1) 有 Key → 真实赔率
    if (hasKey) {
      const { matches, debug } = await fetchOddsApi(oddsKey, leagueFilter);
      if (matches.length > 0) {
        matches.sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff)));
        return res.status(200).json({
          ok: true,
          count: matches.length,
          source: "odds-api",
          hasKey: true,
          note: "真实赔率来自 The Odds API（多家书商平均）",
          updatedAt: new Date().toISOString(),
          debug,
          matches,
        });
      }
      // Key 有效但当前无场次 → 继续回退赛程
      const fb = await fetchSportsDb(leagueFilter);
      fb.matches.sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff)));
      return res.status(200).json({
        ok: fb.matches.length > 0,
        count: fb.matches.length,
        source: fb.matches.length ? "thesportsdb" : "empty",
        hasKey: true,
        note:
          "赔率 Key 已配置，但当前联赛暂无开售场次（可能休赛期），已回退综合赛程",
        updatedAt: new Date().toISOString(),
        debug: [...debug, ...fb.debug],
        matches: fb.matches,
      });
    }

    // 2) 无 Key → 仅赛程
    const { matches, debug } = await fetchSportsDb(leagueFilter);
    matches.sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff)));
    return res.status(200).json({
      ok: matches.length > 0,
      count: matches.length,
      source: "thesportsdb",
      hasKey: false,
      note: "未检测到 THE_ODDS_API_KEY（请在 Vercel 配置后 Redeploy）。当前仅综合赛程，赔率为默认值。",
      updatedAt: new Date().toISOString(),
      debug,
      matches,
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      reason: "api_error",
      hasKey,
      message: String(err.message || err),
      matches: [],
    });
  }
}
