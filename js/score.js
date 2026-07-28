/**
 * Football AI Scoring Engine v4.1
 * 支持真实 API 数据 + 本地回退 + 筛选
 */

function num(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function safe(obj, path, def = 0) {
  try {
    const val = path.split(".").reduce((o, k) => (o != null ? o[k] : undefined), obj);
    return val !== undefined && val !== null ? val : def;
  } catch {
    return def;
  }
}

function analyzeMatch(match) {
  const strengthHome = num(safe(match, "strength.home", 75));
  const strengthAway = num(safe(match, "strength.away", 75));
  const strengthDiff = strengthHome - strengthAway;

  const formHome = num(safe(match, "form.home", 70));
  const formAway = num(safe(match, "form.away", 70));
  const formDiff = formHome - formAway;

  const xgHome = num(safe(match, "xg.home", 1.3));
  const xgAway = num(safe(match, "xg.away", 1.3));
  const xgDiff = xgHome - xgAway;

  const defHome = num(safe(match, "defense.home", 75));
  const defAway = num(safe(match, "defense.away", 75));
  const defDiff = defHome - defAway;

  const oddsChange = num(safe(match, "ai_market.odds_change", 0));
  const handicapSupport = num(safe(match, "ai_market.handicap_support", 0));
  const heatRisk = num(safe(match, "ai_market.heat_risk", 0));
  const marketLogic = num(safe(match, "market_logic.impact", 0));

  const injuryHome = num(safe(match, "injury.home.totalImpact", 0));
  const injuryAway = num(safe(match, "injury.away.totalImpact", 0));
  const motivation = num(safe(match, "motivation.impact", 0));
  const fatigue = num(safe(match, "schedule.fatigue", 0));
  const rotation = num(safe(match, "rotation.impact", 0));
  const styleImpact = num(safe(match, "style_match.impact", 0));

  let homeScore =
    80 +
    strengthDiff * 0.35 +
    formDiff * 0.25 +
    xgDiff * 12 +
    defDiff * 0.18 +
    oddsChange * 1.2 +
    handicapSupport * 1.5 +
    heatRisk +
    marketLogic +
    injuryHome -
    injuryAway * 0.6 +
    motivation +
    fatigue +
    rotation +
    styleImpact;

  homeScore = Math.max(35, Math.min(125, homeScore));
  let awayScore = 160 - homeScore + injuryAway * 0.4;
  awayScore = Math.max(35, Math.min(125, awayScore));

  const diff = homeScore - awayScore;

  let homeProb = 33 + diff * 1.35;
  let awayProb = 33 - diff * 1.15;
  let drawProb = 100 - homeProb - awayProb;

  homeProb = Math.max(8, Math.min(72, homeProb));
  awayProb = Math.max(8, Math.min(72, awayProb));
  drawProb = Math.max(10, Math.min(45, 100 - homeProb - awayProb));

  const total = homeProb + drawProb + awayProb;
  homeProb = (homeProb / total) * 100;
  drawProb = (drawProb / total) * 100;
  awayProb = (awayProb / total) * 100;

  let pick = "防平";
  let pickSide = "draw";
  if (homeProb >= awayProb && homeProb >= drawProb) {
    pick = "主胜";
    pickSide = "home";
  } else if (awayProb > homeProb && awayProb >= drawProb) {
    pick = "客胜";
    pickSide = "away";
  }

  const gap = Math.max(homeProb, awayProb, drawProb) - Math.min(homeProb, awayProb, drawProb);
  const maxProb = Math.max(homeProb, awayProb, drawProb);

  let risk = "中";
  let riskLevel = "mid";
  if (gap >= 22 && maxProb >= 45 && heatRisk >= -1) {
    risk = "低";
    riskLevel = "low";
  } else if (gap < 12 || heatRisk <= -2 || maxProb < 38) {
    risk = "高";
    riskLevel = "high";
  }

  let stars = 3;
  if (diff > 22 && riskLevel === "low") stars = 5;
  else if (diff > 14 && riskLevel !== "high") stars = 4;
  else if (diff < -8 || riskLevel === "high") stars = 2;
  else if (diff < -18) stars = 1;

  const starStr = "⭐".repeat(stars);

  let predScore = "1-1";
  if (homeProb > 48) predScore = xgHome > 1.8 ? "2-1" : "1-0";
  else if (awayProb > 45) predScore = xgAway > 1.6 ? "1-2" : "0-1";
  else if (homeProb > 40) predScore = "2-1";
  else if (drawProb > 36) predScore = "1-1";

  return {
    id: match.id || "",
    home: match.home || "主队",
    away: match.away || "客队",
    league: match.league || "未知",
    kickoff: match.kickoff || "",
    homeScore: Math.round(homeScore * 10) / 10,
    awayScore: Math.round(awayScore * 10) / 10,
    homeProb: Math.round(homeProb * 10) / 10,
    drawProb: Math.round(drawProb * 10) / 10,
    awayProb: Math.round(awayProb * 10) / 10,
    pick,
    pickSide,
    risk,
    riskLevel,
    stars,
    starStr,
    predScore,
    maxProb: Math.round(maxProb * 10) / 10,
    odds: match.odds || null,
    source: match.source || "local",
    raw: match,
  };
}

function analyzeAll(matches) {
  return matches.map(analyzeMatch).sort((a, b) => b.homeScore - a.homeScore);
}

/** 优先 API，失败回退 matches.json */
async function loadMatches(leagueFilter) {
  // 1. 尝试真实 API
  try {
    const q = leagueFilter ? `?league=${encodeURIComponent(leagueFilter)}` : "";
    const res = await fetch(`/api/fixtures${q}&t=` + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.matches) && data.matches.length > 0) {
        window.__DATA_SOURCE__ = "api";
        window.__DATA_UPDATED__ = data.updatedAt;
        return data.matches;
      }
    }
  } catch (e) {
    console.warn("API 不可用，使用本地数据", e);
  }

  // 2. 本地回退
  const res = await fetch("matches.json?t=" + Date.now());
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  let list = Array.isArray(data) ? data : [];
  if (leagueFilter) {
    list = list.filter((m) => m.league === leagueFilter);
  }
  window.__DATA_SOURCE__ = "local";
  return list;
}

function pickBadgeClass(side) {
  if (side === "home") return "badge-home";
  if (side === "away") return "badge-away";
  return "badge-draw";
}

function riskBadgeClass(level) {
  if (level === "low") return "badge-risk-low";
  if (level === "high") return "badge-risk-high";
  return "badge-risk-mid";
}

function formatKickoff(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
