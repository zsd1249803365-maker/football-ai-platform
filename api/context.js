/**
 * 积分榜 / 近期战绩 / 交锋 — TheSportsDB 免费
 * v6.2 增强队名匹配 + 多联赛 ID
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
  日职: "4447",
  挪超: "4420",
  瑞典超: "4419",
  澳超: "4356",
  墨超: "4350",
  欧联: "4481",
};

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+(fc|sc|cf|fk|bk|if|sk|afc|cfc|united|city|town)$/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function teamMatch(a, b) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x))) return true;
  // 单词重叠
  const aw = String(a || "").toLowerCase().split(/\s+/);
  const bw = String(b || "").toLowerCase().split(/\s+/);
  const common = aw.filter((w) => w.length > 3 && bw.some((z) => z.includes(w) || w.includes(z)));
  return common.length >= 1;
}

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "FootballAI/6.2" } });
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
    if (rank <= 4 && n > 6) {
      zone = "promo";
      zoneLabel = r.strDescription || "争冠/欧战区";
    } else if (rank >= n - 2 && n > 5) {
      zone = "releg";
      zoneLabel = r.strDescription || "保级/降级区";
    } else if (r.strDescription) zoneLabel = r.strDescription;
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

/** 以 focus 队视角：胜红 平蓝 负灰，必须带对阵与比分 */
function buildForm(events, teamName, limit = 15) {
  const related = [];
  for (const e of events || []) {
    if (!(teamMatch(e.strHomeTeam, teamName) || teamMatch(e.strAwayTeam, teamName))) continue;
    const hs = parseInt(e.intHomeScore, 10);
    const as = parseInt(e.intAwayScore, 10);
    if (isNaN(hs) || isNaN(as)) continue;
    const isHome = teamMatch(e.strHomeTeam, teamName);
    const opponent = isHome ? e.strAwayTeam : e.strHomeTeam;
    let outcome = "draw"; // win | draw | lose
    if (hs > as) outcome = isHome ? "win" : "lose";
    else if (as > hs) outcome = isHome ? "lose" : "win";
    related.push({
      outcome,
      score: `${hs}-${as}`,
      home: e.strHomeTeam,
      away: e.strAwayTeam,
      opponent,
      isHome,
      date: e.dateEvent || "",
      competition: e.strLeague || "",
      focusScore: isHome ? hs : as,
      oppScore: isHome ? as : hs,
    });
    if (related.length >= limit) break;
  }
  return related;
}

function buildH2H(events, home, away, limit = 12) {
  const rows = [];
  for (const e of events || []) {
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
      message: `联赛「${league}」暂无映射，主流五大联赛/美职/巴甲等可查`,
      standings: [],
      formHome: [],
      formAway: [],
      h2h: [],
      source: "none",
    });
  }

  try {
    const [standings, events] = await Promise.all([
      fetchStandings(leagueId).catch((e) => {
        console.error("standings", e);
        return [];
      }),
      fetchPastEvents(leagueId).catch((e) => {
        console.error("events", e);
        return [];
      }),
    ]);

    const marked = standings.map((r) => ({
      ...r,
      isFocus: teamMatch(r.name, home) || teamMatch(r.name, away),
    }));

    const formHome = home ? buildForm(events, home, 15) : [];
    const formAway = away ? buildForm(events, away, 15) : [];
    const h2h = home && away ? buildH2H(events, home, away, 12) : [];

    return res.status(200).json({
      ok: true,
      source: "thesportsdb",
      leagueId,
      league,
      season: marked[0]?.season || "",
      eventsCount: events.length,
      note:
        events.length === 0
          ? "往绩接口暂无数据（休赛或源未更新）"
          : `已取 ${events.length} 场往绩 · TheSportsDB`,
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
