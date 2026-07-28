/**
 * 综合足球赛程 - TheSportsDB 免费 API（无需注册）
 * https://www.thesportsdb.com/
 * 免费版每个联赛 next 约 1 场，多联赛组合仍可用
 */

const LEAGUES = [
  { id: "4328", name: "英超" },
  { id: "4335", name: "西甲" },
  { id: "4332", name: "意甲" },
  { id: "4331", name: "德甲" },
  { id: "4334", name: "法甲" },
  { id: "4480", name: "欧冠" },
  { id: "4481", name: "欧联" },
  { id: "4346", name: "美职联" },
  { id: "4351", name: "日职联" },
  { id: "4338", name: "荷甲" },
];

const API = "https://www.thesportsdb.com/api/v1/json/123";

async function getJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "FootballAI/4.2" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function mapEvent(e, leagueName) {
  const home = e.strHomeTeam || "主队";
  const away = e.strAwayTeam || "客队";
  const kickoff = e.strTimestamp || `${e.dateEvent || ""}T${e.strTime || "00:00:00"}`;

  // 无官方赔率时用中性默认，评分仍可运行
  const odds = { home: 2.2, draw: 3.3, away: 3.2 };
  const invH = 1 / odds.home;
  const invD = 1 / odds.draw;
  const invA = 1 / odds.away;
  const sum = invH + invD + invA;
  const pH = invH / sum;
  const pA = invA / sum;
  const strengthHome = Math.round(72 + pH * 25);
  const strengthAway = Math.round(72 + pA * 25);

  return {
    id: String(e.idEvent || e.idAPIfootball || Math.random()),
    league: leagueName || e.strLeague || "综合",
    home,
    away,
    kickoff,
    status: e.strStatus || "NS",
    venue: e.strVenue || "",
    strength: { home: strengthHome, away: strengthAway },
    form: {
      home: strengthHome - 4,
      away: strengthAway - 4,
      detail: { home: "赛程数据", away: "赛程数据" },
    },
    xg: {
      home: +(1.2 + pH).toFixed(2),
      away: +(1.2 + pA).toFixed(2),
    },
    defense: { home: strengthHome - 2, away: strengthAway - 2 },
    odds,
    market: {
      asian_handicap: { line: "-", home: "-", away: "-" },
      goal: { line: "2.5", over: "大", under: "小" },
    },
    market_analysis: {
      trend: "综合赛程",
      heat: "中",
      risk_note: "免费源暂无实时赔率，评分仅供参考",
    },
    ai_market: {
      odds_change: 0,
      heat_risk: 0,
      handicap_support: 0,
      analysis: `${home} vs ${away} · ${leagueName || e.strLeague || ""}`,
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
      matchup: "综合赛事数据",
      impact: 0,
    },
    market_logic: {
      popular_side: "-",
      cold_side: "-",
      bookmaker_signal: "无赔率源",
      impact: 0,
    },
    prediction: {
      home_win: Math.round(pH * 100) + "%",
      draw: Math.round((1 - pH - pA) * 100) + "%",
      away_win: Math.round(pA * 100) + "%",
      score: "1-1",
    },
    risk: "中等",
    source: "thesportsdb",
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1200");
  if (req.method === "OPTIONS") return res.status(200).end();

  const debug = [];
  try {
    const leagueFilter = req.query?.league;
    let targets = LEAGUES;
    if (leagueFilter) {
      const hit = LEAGUES.filter(
        (l) => l.name === leagueFilter || String(l.id) === leagueFilter
      );
      if (hit.length) targets = hit;
    }

    const all = [];
    const seen = new Set();

    // 各联赛下一场（免费限制约 1 场/联赛）
    for (const lg of targets) {
      try {
        const data = await getJson(`${API}/eventsnextleague.php?id=${lg.id}`);
        const events = data?.events || [];
        debug.push({ league: lg.name, n: events.length });
        for (const e of events) {
          const id = String(e.idEvent || "");
          if (!id || seen.has(id)) continue;
          // 只要未开赛
          if (e.strStatus && !["NS", "Not Started", ""].includes(e.strStatus) && e.intHomeScore != null) {
            continue;
          }
          seen.add(id);
          all.push(mapEvent(e, lg.name));
        }
      } catch (err) {
        debug.push({ league: lg.name, err: String(err.message || err) });
      }
    }

    // 补充：按日期拉最近几天全球足球（可能含更多场）
    if (all.length < 8) {
      for (let d = 0; d < 14; d++) {
        const day = new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
        try {
          const data = await getJson(`${API}/eventsday.php?d=${day}&s=Soccer`);
          const events = data?.events || [];
          debug.push({ day, n: events.length });
          for (const e of events) {
            const id = String(e.idEvent || "");
            if (!id || seen.has(id)) continue;
            if (e.strStatus && e.strStatus !== "NS" && e.intHomeScore != null) continue;
            // 过滤冷门杂赛：保留知名联赛关键词
            const league = e.strLeague || "";
            const keep =
              /Premier|La Liga|Serie A|Bundesliga|Ligue|Champions|Europa|MLS|J-League|Eredivisie|Championship|Primeira|Super Lig|Chinese|Swedish|Norwegian/i.test(
                league
              );
            if (!keep && all.length >= 6) continue;
            seen.add(id);
            all.push(mapEvent(e, league));
            if (all.length >= 20) break;
          }
        } catch (err) {
          debug.push({ day, err: String(err.message || err) });
        }
        if (all.length >= 15) break;
      }
    }

    all.sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff)));

    return res.status(200).json({
      ok: all.length > 0,
      count: all.length,
      source: "thesportsdb",
      note: "综合足球赛程（TheSportsDB 免费源）。无实时竞彩赔率，评分基于默认盘口估算。",
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
