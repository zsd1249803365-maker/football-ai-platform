/**
 * Football AI fixtures v6.3
 * 多联赛并行 + 赔率与赛程合并，尽量接近 60+ 场
 */

const ODDS_SPORTS = [
  { key: "soccer_epl", name: "英超" },
  { key: "soccer_spain_la_liga", name: "西甲" },
  { key: "soccer_italy_serie_a", name: "意甲" },
  { key: "soccer_germany_bundesliga", name: "德甲" },
  { key: "soccer_france_ligue_one", name: "法甲" },
  { key: "soccer_usa_mls", name: "美职联" },
  { key: "soccer_brazil_campeonato", name: "巴甲" },
  { key: "soccer_sweden_allsvenskan", name: "瑞典超" },
  { key: "soccer_norway_eliteserien", name: "挪超" },
  { key: "soccer_finland_veikkausliiga", name: "芬超" },
  { key: "soccer_japan_j_league", name: "日职" },
  { key: "soccer_uefa_champs_league", name: "欧冠" },
  { key: "soccer_uefa_europa_league", name: "欧联" },
  { key: "soccer_uefa_europa_conference_league", name: "欧协联" },
  { key: "soccer_netherlands_eredivisie", name: "荷甲" },
  { key: "soccer_portugal_primeira_liga", name: "葡超" },
  { key: "soccer_australia_aleague", name: "澳超" },
  { key: "soccer_mexico_ligamx", name: "墨超" },
  { key: "soccer_denmark_superliga", name: "丹超" },
  { key: "soccer_switzerland_superleague", name: "瑞士超" },
  { key: "soccer_poland_ekstraklasa", name: "波超" },
  { key: "soccer_austria_bundesliga", name: "奥超" },
];

const TSDB_LEAGUES = [
  { id: "4328", name: "英超" },
  { id: "4335", name: "西甲" },
  { id: "4332", name: "意甲" },
  { id: "4331", name: "德甲" },
  { id: "4334", name: "法甲" },
  { id: "4480", name: "欧冠" },
  { id: "4481", name: "欧联" },
  { id: "5071", name: "欧协联" },
  { id: "4346", name: "美职联" },
  { id: "4351", name: "巴甲" },
  { id: "4337", name: "荷甲" },
  { id: "4339", name: "土超" },
  { id: "4344", name: "葡超" },
  { id: "4397", name: "芬超" },
  { id: "4419", name: "瑞典超" },
  { id: "4420", name: "挪超" },
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
  const res = await fetch(url, { headers: { "User-Agent": "FootballAI/6.3" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function avg(arr, def) {
  return arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : def;
}

function extractMarkets(bookmakers, homeName, awayName) {
  const homes = [], draws = [], aways = [];
  const spreadHome = [], spreadAway = [], spreadLines = [];
  const overs = [], unders = [], totalLines = [];
  const homeL = (homeName || "").toLowerCase();
  const awayL = (awayName || "").toLowerCase();

  for (const bk of bookmakers || []) {
    for (const m of bk.markets || []) {
      if (m.key === "h2h") {
        for (const o of m.outcomes || []) {
          const p = parseFloat(o.price);
          if (!p) continue;
          const n = (o.name || "").toLowerCase();
          if (n === "draw") draws.push(p);
          else if (n === homeL || o.name === homeName) homes.push(p);
          else if (n === awayL || o.name === awayName) aways.push(p);
        }
      }
      if (m.key === "spreads") {
        for (const o of m.outcomes || []) {
          const p = parseFloat(o.price);
          const point = parseFloat(o.point);
          if (!p || isNaN(point)) continue;
          const n = (o.name || "").toLowerCase();
          if (n === homeL || o.name === homeName) {
            spreadHome.push(p);
            spreadLines.push(point);
          } else if (n === awayL || o.name === awayName) spreadAway.push(p);
        }
      }
      if (m.key === "totals") {
        for (const o of m.outcomes || []) {
          const p = parseFloat(o.price);
          const point = parseFloat(o.point);
          if (!p) continue;
          const n = (o.name || "").toLowerCase();
          if (n === "over") {
            overs.push(p);
            if (!isNaN(point)) totalLines.push(point);
          } else if (n === "under") unders.push(p);
        }
      }
    }
  }

  const line = spreadLines.length
    ? spreadLines.sort((a, b) => a - b)[Math.floor(spreadLines.length / 2)]
    : null;
  const tLine = totalLines.length
    ? totalLines.sort((a, b) => a - b)[Math.floor(totalLines.length / 2)]
    : 2.5;

  return {
    odds: { home: avg(homes, 2.2), draw: avg(draws, 3.3), away: avg(aways, 3.2) },
    asian: {
      line: line != null ? (line > 0 ? "+" + line : String(line)) : "-",
      lineNum: line,
      home: avg(spreadHome, null),
      away: avg(spreadAway, null),
    },
    totals: {
      line: String(tLine),
      over: avg(overs, null),
      under: avg(unders, null),
    },
  };
}

function mapWithOdds(home, away, league, kickoff, id, markets, extra = {}) {
  const od = markets?.odds || { home: 2.2, draw: 3.3, away: 3.2 };
  const asian = markets?.asian || { line: "-", home: null, away: null };
  const totals = markets?.totals || { line: "2.5", over: null, under: null };
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
  let handicapSupport = 0;
  if (asian.lineNum != null) {
    if (asian.lineNum < 0) handicapSupport = 1;
    else if (asian.lineNum > 0) handicapSupport = -1;
  } else handicapSupport = pH > 0.48 ? 1 : pA > 0.42 ? -1 : 0;

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
      detail: { home: hasOdds ? "赔率" : "赛程", away: hasOdds ? "赔率" : "赛程" },
    },
    xg: { home: +(1.05 + pH * 1.3).toFixed(2), away: +(1.05 + pA * 1.3).toFixed(2) },
    defense: { home: strengthHome - 2, away: strengthAway - 2 },
    odds: od,
    market: {
      asian_handicap: {
        line: asian.line,
        home: asian.home != null ? asian.home : "-",
        away: asian.away != null ? asian.away : "-",
      },
      goal: {
        line: totals.line,
        over: totals.over != null ? totals.over : "-",
        under: totals.under != null ? totals.under : "-",
      },
    },
    market_analysis: {
      trend: hasOdds ? "真实赔率" : "赛程",
      heat,
      risk_note: heat === "高" ? "热门过热" : "正常",
    },
    ai_market: {
      odds_change: 0,
      heat_risk: heatRisk,
      handicap_support: handicapSupport,
      analysis: `${home} vs ${away}`,
    },
    injury: { home: { players: [], totalImpact: 0 }, away: { players: [], totalImpact: 0 } },
    motivation: { level: "联赛", impact: 2 },
    schedule: { recent_match: "-", fatigue: 0 },
    rotation: { risk: "未知", impact: 0 },
    style_match: { home_style: "-", away_style: "-", matchup: "-", impact: 0 },
    market_logic: {
      popular_side: pH > pA ? "主胜" : "客胜",
      cold_side: "平局",
      bookmaker_signal: hasOdds ? "均值" : "无",
      impact: heatRisk,
    },
    prediction: {
      home_win: Math.round(pH * 100) + "%",
      draw: Math.round((1 - pH - pA) * 100) + "%",
      away_win: Math.round(pA * 100) + "%",
    },
    risk: heat === "高" ? "较高" : "中等",
    source: extra.source || "odds-api",
  };
}

function pairKey(home, away, kickoff) {
  const d = String(kickoff || "").slice(0, 10);
  return `${String(home).toLowerCase()}|${String(away).toLowerCase()}|${d}`;
}

async function fetchOneOdds(key, sp) {
  // 先只拉 h2h 省额度；有结果再可选 spreads
  const url =
    `https://api.the-odds-api.com/v4/sports/${sp.key}/odds` +
    `?apiKey=${encodeURIComponent(key)}&regions=eu&markets=h2h,spreads,totals&oddsFormat=decimal`;
  const res = await fetch(url);
  const remaining = res.headers.get("x-requests-remaining");
  const used = res.headers.get("x-requests-used");
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return { sport: sp.name, err: `${res.status} ${t.slice(0, 60)}`, matches: [], remaining, used };
  }
  const events = await res.json();
  const matches = [];
  for (const ev of events || []) {
    if (!ev.home_team || !ev.away_team) continue;
    const markets = extractMarkets(ev.bookmakers, ev.home_team, ev.away_team);
    matches.push(
      mapWithOdds(ev.home_team, ev.away_team, sp.name, ev.commence_time, ev.id, markets, {
        hasOdds: true,
        source: "odds-api",
      })
    );
  }
  return { sport: sp.name, n: matches.length, matches, remaining, used };
}

async function fetchOddsApi(key, leagueFilter) {
  let targets = ODDS_SPORTS;
  if (leagueFilter) {
    const hit = ODDS_SPORTS.filter(
      (s) => s.name === leagueFilter || s.key.includes(String(leagueFilter).toLowerCase())
    );
    if (hit.length) targets = hit;
  }
  // 并行请求全部目标联赛
  const results = await Promise.all(
    targets.map((sp) => fetchOneOdds(key, sp).catch((e) => ({ sport: sp.name, err: String(e.message || e), matches: [] })))
  );
  const all = [];
  const debug = [];
  for (const r of results) {
    debug.push({
      sport: r.sport,
      n: r.n ?? (r.matches || []).length,
      err: r.err,
      remaining: r.remaining,
      used: r.used,
    });
    all.push(...(r.matches || []));
  }
  return { matches: all, debug };
}

async function fetchSportsDb(leagueFilter) {
  let targets = TSDB_LEAGUES;
  if (leagueFilter) {
    const hit = TSDB_LEAGUES.filter((l) => l.name === leagueFilter);
    if (hit.length) targets = hit;
  }
  const debug = [];
  const all = [];
  const seen = new Set();
  const results = await Promise.all(
    targets.map(async (lg) => {
      try {
        const data = await getJson(`${TSDB}/eventsnextleague.php?id=${lg.id}`);
        return { lg, events: data?.events || [] };
      } catch (e) {
        return { lg, events: [], err: String(e.message || e) };
      }
    })
  );
  for (const { lg, events, err } of results) {
    debug.push({ league: lg.name, n: events.length, err });
    for (const e of events) {
      const id = String(e.idEvent || "");
      if (!id || seen.has(id)) continue;
      if (e.strStatus === "Match Finished") continue;
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
  }
  return { matches: all, debug };
}

function mergeMatches(primary, secondary) {
  const map = new Map();
  for (const m of primary) map.set(pairKey(m.home, m.away, m.kickoff), m);
  for (const m of secondary) {
    const k = pairKey(m.home, m.away, m.kickoff);
    if (!map.has(k)) map.set(k, m);
  }
  return [...map.values()];
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=90, stale-while-revalidate=300");
  if (req.method === "OPTIONS") return res.status(200).end();

  const leagueFilter = req.query?.league;
  const oddsKey = getOddsKey();
  const hasKey = oddsKey.length > 8;

  try {
    const tasks = [];
    if (hasKey) tasks.push(fetchOddsApi(oddsKey, leagueFilter));
    else tasks.push(Promise.resolve({ matches: [], debug: [{ note: "no key" }] }));
    tasks.push(fetchSportsDb(leagueFilter));

    const [oddsRes, dbRes] = await Promise.all(tasks);
    let matches = mergeMatches(oddsRes.matches || [], dbRes.matches || []);
    matches.sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff)));

    const hasOdds = (oddsRes.matches || []).length > 0;
    const source = hasOdds ? "odds-api" : matches.length ? "thesportsdb" : "empty";

    return res.status(200).json({
      ok: matches.length > 0,
      count: matches.length,
      source,
      hasKey,
      note: hasOdds
        ? `赔率 ${(oddsRes.matches || []).length} + 赛程补 ${(dbRes.matches || []).length} → 合计 ${matches.length}`
        : hasKey
        ? "Key 有效但赔率接口暂无场次，已用赛程"
        : "无 Key，仅赛程",
      updatedAt: new Date().toISOString(),
      debug: { odds: oddsRes.debug, db: dbRes.debug },
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
