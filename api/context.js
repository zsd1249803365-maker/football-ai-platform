/**
 * 比赛上下文：积分榜 / 近期战绩 / 历史交锋
 * 数据源：TheSportsDB 免费接口（无需额外 Key）
 */

const TSDB = "https://www.thesportsdb.com/api/v1/json/123";

const LEAGUE_MAP = {
  英超: "4328",
  西甲: "4335",
  意甲: "4332",
  德甲: "4331",
  法甲: "4334",
  欧冠: "4480",
  美职联: "4346",
  巴甲: "4351",
  荷甲: "4337",
  葡超: "4344",
  苏格兰超: "4330",
  土超: "4339",
  俄超: "4338",
  比甲: "4338",
  日职: "4447",
  挪超: "4420",
  瑞典超: "4419",
};

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+(fc|sc|cf|fk|bk|if|sk|united|city)$/i, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]/g, "")
    .trim();
}

function teamMatch(a, b) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

async function getJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "FootballAI/6.1" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function resolveLeagueId(league) {
  if (!league) return null;
  if (LEAGUE_MAP[league]) return LEAGUE_MAP[league];
  for (const [k, v] of Object.entries(LEAGUE_MAP)) {
    if (String(league).includes(k) || k.includes(String(league))) return v;
  }
  return null;
}

async function fetchStandings(leagueId) {
  const data = await getJson(`${TSDB}/lookuptable.php?l=${leagueId}`);
  const table = data?.table || [];
  return table.map((r) => {
    const rank = parseInt(r.intRank, 10) || 0;
    const n = table.length;
    let zone = "mid";
    let zoneLabel = "中游";
    if (rank <= 3) {
      zone = "promo";
      zoneLabel = r.strDescription || "争冠/欧战区";
    } else if (rank >= n - 2 && n > 5) {
      zone = "releg";
      zoneLabel = r.strDescription || "保级/降级区";
    } else if (r.strDescription) {
      zoneLabel = r.strDescription;
    }
    return {
      rank,
      name: r.strTeam,
      played: parseInt(r.intPlayed, 10) || 0,
      w: parseInt(r.intWin, 10) || 0,
      d: parseInt(r.intDraw, 10) || 0,
      l: parseInt(r.intLoss, 10) || 0,
      gf: parseInt(r.intGoalsFor, 10) || 0,
      ga: parseInt(r.intGoalsAgainst, 10) || 0,
      gd: parseInt(r.intGoalDifference, 10) || 0,
      pts: parseInt(r.intPoints, 10) || 0,
      form: r.strForm || "",
      zone,
      zoneLabel,
      season: r.strSeason || "",
    };
  });
}

async function fetchPastEvents(leagueId) {
  const data = await getJson(`${TSDB}/eventspastleague.php?id=${leagueId}`);
  return data?.events || [];
}

function buildForm(events, teamName, limit = 20) {
  const related = events.filter(
    (e) => teamMatch(e.strHomeTeam, teamName) || teamMatch(e.strAwayTeam, teamName)
  );
  const form = [];
  for (const e of related) {
    if (form.length >= limit) break;
    const hs = parseInt(e.intHomeScore, 10);
    const as = parseInt(e.intAwayScore, 10);
    if (isNaN(hs) || isNaN(as)) continue;
    const isHome = teamMatch(e.strHomeTeam, teamName);
    let r = "D";
    if (hs > as) r = isHome ? "W" : "L";
    else if (as > hs) r = isHome ? "L" : "W";
    form.push({
      result: r,
      score: `${hs}-${as}`,
      home: e.strHomeTeam,
      away: e.strAwayTeam,
      date: e.dateEvent || "",
      competition: e.strLeague || "",
      isHome,
    });
  }
  return form;
}

function buildH2H(events, home, away, limit = 10) {
  const rows = [];
  for (const e of events) {
    if (rows.length >= limit) break;
    const match =
      (teamMatch(e.strHomeTeam, home) && teamMatch(e.strAwayTeam, away)) ||
      (teamMatch(e.strHomeTeam, away) && teamMatch(e.strAwayTeam, home));
    if (!match) continue;
    const hs = parseInt(e.intHomeScore, 10);
    const as = parseInt(e.intAwayScore, 10);
    if (isNaN(hs) || isNaN(as)) continue;
    let result = "draw";
    if (hs > as) result = "home";
    else if (as > hs) result = "away";
    rows.push({
      date: e.dateEvent || "",
      competition: e.strLeague || "",
      home: e.strHomeTeam,
      away: e.strAwayTeam,
      hs,
      as,
      result,
      score: `${hs}-${as}`,
    });
  }
  return rows;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
  if (req.method === "OPTIONS") return res.status(200).end();

  const league = req.query?.league || "";
  const home = req.query?.home || "";
  const away = req.query?.away || "";
  const leagueId = resolveLeagueId(league);

  if (!leagueId) {
    return res.status(200).json({
      ok: false,
      reason: "unsupported_league",
      message: `联赛「${league}」暂无 TheSportsDB 映射`,
      standings: [],
      formHome: [],
      formAway: [],
      h2h: [],
      source: "none",
    });
  }

  try {
    const [standings, events] = await Promise.all([
      fetchStandings(leagueId).catch(() => []),
      fetchPastEvents(leagueId).catch(() => []),
    ]);

    // 标记焦点队
    const marked = standings.map((r) => ({
      ...r,
      isFocus: teamMatch(r.name, home) || teamMatch(r.name, away),
    }));

    const formHome = home ? buildForm(events, home, 20) : [];
    const formAway = away ? buildForm(events, away, 20) : [];
    const h2h = home && away ? buildH2H(events, home, away, 12) : [];

    return res.status(200).json({
      ok: true,
      source: "thesportsdb",
      leagueId,
      league,
      season: marked[0]?.season || "",
      note: "积分/战绩/交锋来自 TheSportsDB 免费接口",
      standings: marked,
      formHome,
      formAway,
      h2h,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      reason: "fetch_error",
      message: String(err.message || err),
      standings: [],
      formHome: [],
      formAway: [],
      h2h: [],
      source: "error",
    });
  }
}
