/**
 * Football AI Scoring Engine v6.3
 * 扩充中文队名 · 多维分析 · 列表无残留 loading
 */

const TEAM_ZH = {
  // 巴西
  Internacional: "国际", Flamengo: "弗拉门戈", Mirassol: "米拉索", Remo: "雷莫",
  Fluminense: "弗鲁米嫩塞", Bahia: "巴伊亚", Vitoria: "维多利亚", "Vitória": "维多利亚",
  Palmeiras: "帕尔梅拉斯", Corinthians: "科林蒂安", "Athletico Paranaense": "巴拉纳竞技",
  "Atletico Paranaense": "巴拉纳竞技", Coritiba: "科里蒂巴", Cruzeiro: "克鲁塞罗",
  "Grêmio": "格雷米奥", Gremio: "格雷米奥", "Sao Paulo": "圣保罗", "São Paulo": "圣保罗",
  "Atletico Mineiro": "米内罗竞技", "Atlético Mineiro": "米内罗竞技", Chapecoense: "沙佩科",
  Botafogo: "博塔弗戈", "Vasco da Gama": "瓦斯科达伽马", Santos: "桑托斯",
  Bragantino: "布拉干蒂诺", "Red Bull Bragantino": "布拉干蒂诺", Cuiaba: "库亚巴",
  "Cuiabá": "库亚巴", Fortaleza: "福塔雷萨", Ceara: "塞阿拉", "Ceará": "塞阿拉",
  Juventude: "青年人", Sport: "累西腓体育", "Sport Recife": "累西腓体育",
  // MLS
  "New York City FC": "纽约城", "Toronto FC": "多伦多FC", "Philadelphia Union": "费城联",
  "Atlanta United FC": "亚特兰大联", "Atlanta United": "亚特兰大联",
  "CF Montreal": "蒙特利尔", "CF Montréal": "蒙特利尔",
  "New England Revolution": "新英格兰革命", "Inter Miami CF": "迈阿密国际", "Inter Miami": "迈阿密国际",
  "Columbus Crew SC": "哥伦布机员", "Columbus Crew": "哥伦布机员",
  "D.C. United": "华盛顿联", "Nashville SC": "纳什维尔", "FC Cincinnati": "辛辛那提",
  "San Jose Earthquakes": "圣何塞地震", "Vancouver Whitecaps FC": "温哥华白帽",
  "Vancouver Whitecaps": "温哥华白帽", "Los Angeles FC": "洛杉矶FC", "LAFC": "洛杉矶FC",
  "New York Red Bulls": "纽约红牛", "Orlando City SC": "奥兰多城", "Orlando City": "奥兰多城",
  "Chicago Fire": "芝加哥火焰", "Charlotte FC": "夏洛特FC",
  "Sporting Kansas City": "堪萨斯城体育", "Houston Dynamo": "休斯敦迪纳摩",
  "Houston Dynamo FC": "休斯敦迪纳摩", "Minnesota United FC": "明尼苏达联",
  "Minnesota United": "明尼苏达联", "San Diego FC": "圣地亚哥FC",
  "St. Louis City SC": "圣路易斯城", "St. Louis City": "圣路易斯城",
  "Real Salt Lake": "盐湖城实时", "Colorado Rapids": "科罗拉多急流",
  "Austin FC": "奥斯汀FC", "LA Galaxy": "洛杉矶银河", "FC Dallas": "达拉斯FC",
  "Portland Timbers": "波特兰伐木者", "Seattle Sounders FC": "西雅图海湾人",
  "Seattle Sounders": "西雅图海湾人",
  // 北欧
  "Vålerenga": "瓦勒伦加", HamKam: "汉坎", "Bodø/Glimt": "博德闪耀", "Bodo/Glimt": "博德闪耀",
  Lillestrom: "利勒斯特罗姆", "Lillestrøm": "利勒斯特罗姆",
  "Fredrikstad FK": "腓特烈斯塔", Sandefjord: "桑纳菲尤尔",
  "IK Start": "斯达特", "Viking FK": "维京", Aalesund: "奥勒松", Tromso: "特罗姆瑟", "Tromsø": "特罗姆瑟",
  KFUM: "KFUM奥斯陆", "Kristiansund BK": "克里斯蒂安松", Molde: "莫尔德",
  "Sarpsborg FK": "萨尔普斯堡", "Sarpsborg 08": "萨尔普斯堡", "SK Brann": "布兰", Rosenborg: "罗森博格",
  "BK Hacken": "哈肯", "BK Häcken": "哈肯", "Kalmar FF": "卡尔马",
  "IFK Goteborg": "哥德堡", "IFK Göteborg": "哥德堡", "Degerfors IF": "德格福什",
  "IF Brommapojkarna": "布罗马波伊卡纳", "Malmo FF": "马尔默", "Malmö FF": "马尔默",
  AIK: "AIK索尔纳", "Djurgardens IF": "佐加顿斯", "Djurgårdens IF": "佐加顿斯",
  "Halmstads BK": "哈尔姆斯塔德", "IK Sirius": "天狼星", Elfsborg: "埃尔夫斯堡",
  "IF Elfsborg": "埃尔夫斯堡", Norrkoping: "诺尔雪平", "IFK Norrköping": "诺尔雪平",
  HJK: "赫尔辛基", KuPS: "库普斯", Inter: "图尔库国际", "FC Inter Turku": "图尔库国际",
  SJK: "塞伊奈约基", Mariehamn: "玛丽港", VPS: "瓦萨", Ilves: "伊尔维斯",
  // 欧洲主流
  Arsenal: "阿森纳", Chelsea: "切尔西", Liverpool: "利物浦", "Manchester City": "曼城",
  "Manchester United": "曼联", Tottenham: "热刺", "Tottenham Hotspur": "热刺",
  "West Ham": "西汉姆", "West Ham United": "西汉姆", Newcastle: "纽卡斯尔",
  "Newcastle United": "纽卡斯尔", Brighton: "布莱顿", "Aston Villa": "阿斯顿维拉",
  "Bayern Munich": "拜仁慕尼黑", "Bayern München": "拜仁慕尼黑", Dortmund: "多特蒙德",
  "Borussia Dortmund": "多特蒙德", Leipzig: "莱比锡", "RB Leipzig": "莱比锡",
  Leverkusen: "勒沃库森", "Bayer Leverkusen": "勒沃库森", Stuttgart: "斯图加特",
  "Real Madrid": "皇家马德里", Barcelona: "巴塞罗那", "Atletico Madrid": "马德里竞技",
  "Atlético Madrid": "马德里竞技", Sevilla: "塞维利亚", Valencia: "瓦伦西亚",
  "Real Sociedad": "皇家社会", Villarreal: "比利亚雷亚尔", "Athletic Bilbao": "毕尔巴鄂竞技",
  "Athletic Club": "毕尔巴鄂竞技", "Inter Milan": "国际米兰", Inter: "国际米兰",
  Milan: "AC米兰", "AC Milan": "AC米兰", Juventus: "尤文图斯", Napoli: "那不勒斯",
  Roma: "罗马", Lazio: "拉齐奥", Atalanta: "亚特兰大", Fiorentina: "佛罗伦萨",
  "Paris Saint Germain": "巴黎圣日耳曼", "Paris Saint-Germain": "巴黎圣日耳曼", PSG: "巴黎圣日耳曼",
  Marseille: "马赛", Lyon: "里昂", Monaco: "摩纳哥", Lille: "里尔", Nice: "尼斯",
  Ajax: "阿贾克斯", PSV: "埃因霍温", "PSV Eindhoven": "埃因霍温", Feyenoord: "费耶诺德",
  Benfica: "本菲卡", Porto: "波尔图", "Sporting CP": "葡萄牙体育", "Sporting Lisbon": "葡萄牙体育",
  Celtic: "凯尔特人", Rangers: "流浪者", Galatasaray: "加拉塔萨雷", Fenerbahce: "费内巴切",
  "Fenerbahçe": "费内巴切", "Besiktas": "贝西克塔斯", "Beşiktaş": "贝西克塔斯",
  "Red Bull Salzburg": "萨尔茨堡红牛", "FC Salzburg": "萨尔茨堡", Shakhtar: "顿涅茨克矿工",
  "Shakhtar Donetsk": "顿涅茨克矿工", Dynamo: "基辅迪纳摩", "Dynamo Kyiv": "基辅迪纳摩",
  "Club Brugge": "布鲁日", Anderlecht: "安德莱赫特", "Young Boys": "年轻人",
  Strasbourg: "斯特拉斯堡", Udinese: "乌迪内斯", Como: "科莫",
  "Deportivo Alavés": "阿拉维斯", Alaves: "阿拉维斯", Getafe: "赫塔费",
  "Coventry City": "考文垂", Leeds: "利兹联", "Leeds United": "利兹联",
};

function toZh(name) {
  if (!name) return "未知";
  if (TEAM_ZH[name]) return TEAM_ZH[name];
  // 直接全表大小写无关匹配
  const lower = String(name).toLowerCase();
  for (const [en, zh] of Object.entries(TEAM_ZH)) {
    if (en.toLowerCase() === lower) return zh;
  }
  const cleaned = String(name).replace(/\s+(FC|SC|CF|FK|BK|IF|SK|United|City)$/i, "").trim();
  if (TEAM_ZH[cleaned]) return TEAM_ZH[cleaned];
  for (const [en, zh] of Object.entries(TEAM_ZH)) {
    if (en.toLowerCase() === cleaned.toLowerCase()) return zh;
    if (lower.includes(en.toLowerCase()) && en.length >= 5) return zh;
  }
  return name;
}

function num(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function safe(obj, path, def = 0) {
  try {
    const val = path.split(".").reduce((o, k) => (o != null ? o[k] : undefined), obj);
    return val !== undefined && val !== null ? val : def;
  } catch { return def; }
}

function fact(n) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function poissonP(k, lambda) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / fact(k);
}

function marketImplied(od) {
  const invH = 1 / (od.home || 2.2);
  const invD = 1 / (od.draw || 3.3);
  const invA = 1 / (od.away || 3.2);
  const sum = invH + invD + invA || 1;
  return { mktH: (invH / sum) * 100, mktD: (invD / sum) * 100, mktA: (invA / sum) * 100 };
}

function predictScoreFromXG(xgH, xgA, homeProb, awayProb, drawProb) {
  const lh = Math.max(0.35, Math.min(3.8, xgH));
  const la = Math.max(0.35, Math.min(3.8, xgA));
  const scores = [];
  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      scores.push({ h, a, p: poissonP(h, lh) * poissonP(a, la), str: h + "-" + a });
    }
  }
  scores.sort((x, y) => y.p - x.p);
  let pickSide = "draw";
  if (homeProb >= awayProb && homeProb >= drawProb) pickSide = "home";
  else if (awayProb > homeProb && awayProb >= drawProb) pickSide = "away";
  const matchSide = (s) => {
    if (pickSide === "home") return s.h > s.a;
    if (pickSide === "away") return s.a > s.h;
    return s.h === s.a;
  };
  const primary = scores.find(matchSide) || scores[0];
  const alts = scores.filter((s) => s.str !== primary.str).slice(0, 3);
  let overProb = 0;
  for (const s of scores) if (s.h + s.a > 2.5) overProb += s.p;
  return {
    predScore: primary.str,
    predProb: +(primary.p * 100).toFixed(1),
    altScores: alts.map((s) => ({ str: s.str, prob: +(s.p * 100).toFixed(1) })),
    altScoresText: alts.map((s) => s.str + "(" + (s.p * 100).toFixed(0) + "%)"),
    totalGoalsExp: +(lh + la).toFixed(2),
    xgHome: +lh.toFixed(2),
    xgAway: +la.toFixed(2),
    over25Prob: +(overProb * 100).toFixed(1),
    under25Prob: +((1 - overProb) * 100).toFixed(1),
  };
}

function getAsian(match) {
  const a = safe(match, "market.asian_handicap", null);
  if (a && typeof a === "object") {
    return {
      line: a.line != null ? String(a.line) : "-",
      home: a.home != null && a.home !== "-" ? a.home : null,
      away: a.away != null && a.away !== "-" ? a.away : null,
    };
  }
  return { line: "-", home: null, away: null };
}

function getTotals(match) {
  const t = safe(match, "market.goal", null);
  if (t && typeof t === "object") {
    return {
      line: t.line != null ? String(t.line) : "2.5",
      over: t.over != null && t.over !== "-" ? t.over : null,
      under: t.under != null && t.under !== "-" ? t.under : null,
    };
  }
  return { line: "2.5", over: null, under: null };
}

function buildAnalysis(ctx) {
  const {
    home, away, league, homeProb, drawProb, awayProb, pick, risk, riskLevel,
    predScore, odds, heatRisk, homeScore, awayScore, gap, scoreInfo, source,
    asian, totals, strengthHome, strengthAway, formHome, formAway,
  } = ctx;
  const od = odds || { home: 2.2, draw: 3.3, away: 3.2 };
  const { mktH, mktD, mktA } = marketImplied(od);
  const lines = [];
  const isLive = source === "odds-api";

  lines.push(
    `【分析范围】①胜平负 ②让球 ③大小球 ④实力评分 ⑤期望进球泊松比分 ⑥模型与市场偏差 ⑦风险。` +
      (isLive ? `赔率来自 The Odds API 联网。` : `当前为赛程估算盘口。`)
  );
  lines.push(`【对阵】${league} · ${home} vs ${away}。主 ${od.home} / 平 ${od.draw} / 客 ${od.away}（隐含约主${mktH.toFixed(0)}% 平${mktD.toFixed(0)}% 客${mktA.toFixed(0)}%）。`);

  if (od.home <= 1.35) lines.push(`【盘口】主队大热，需防平局/客队偷分。`);
  else if (od.away <= 1.75) lines.push(`【盘口】客队被市场看好。`);
  else if (Math.abs(od.home - od.away) < 0.35) lines.push(`【盘口】双方接近，方向感弱。`);
  else lines.push(`【盘口】三角盘相对均衡。`);

  if (asian && asian.line && asian.line !== "-") {
    lines.push(`【让球】${asian.line}，主 ${asian.home ?? "-"} / 客 ${asian.away ?? "-"}。`);
  }
  if (scoreInfo) {
    lines.push(
      `【大小/比分】期望总进球约 ${scoreInfo.totalGoalsExp}；主推【${predScore}】约 ${scoreInfo.predProb}%；备选 ${scoreInfo.altScoresText.join("、")}。`
    );
  }
  lines.push(`【实力】主 ${strengthHome} / 客 ${strengthAway}；模型分主 ${homeScore} / 客 ${awayScore}。`);
  const delta = homeProb - mktH;
  if (Math.abs(delta) >= 5) {
    lines.push(delta > 0
      ? `【偏差】模型主胜高于市场约 ${delta.toFixed(0)} 点。`
      : `【偏差】模型对主队更保守，低于市场约 ${Math.abs(delta).toFixed(0)} 点。`);
  }
  lines.push(
    `【结论】主 ${homeProb.toFixed(0)}% · 平 ${drawProb.toFixed(0)}% · 客 ${awayProb.toFixed(0)}%。推荐【${pick}】，预测 ${predScore}，风险【${risk}】。仅供参考。`
  );
  return lines.join("\n\n");
}

function analyzeMatch(match) {
  const strengthHome = num(safe(match, "strength.home", 75));
  const strengthAway = num(safe(match, "strength.away", 75));
  const strengthDiff = strengthHome - strengthAway;
  const formHome = num(safe(match, "form.home", 70));
  const formAway = num(safe(match, "form.away", 70));
  const formDiff = formHome - formAway;

  let xgHome = num(safe(match, "xg.home", 1.3));
  let xgAway = num(safe(match, "xg.away", 1.3));
  const od = match.odds || { home: 2.2, draw: 3.3, away: 3.2 };
  const { mktH, mktA, mktD } = marketImplied(od);
  const totalBase = xgHome + xgAway || 2.4;
  const shareH = Math.max(0.28, Math.min(0.72, (mktH + mktD * 0.35) / 100));
  xgHome = +(totalBase * shareH).toFixed(2);
  xgAway = +(totalBase * (1 - shareH)).toFixed(2);
  if (od.home <= 1.4) { xgHome = Math.min(3.2, xgHome + 0.25); xgAway = Math.max(0.4, xgAway - 0.15); }
  if (od.away <= 1.4) { xgAway = Math.min(3.2, xgAway + 0.25); xgHome = Math.max(0.4, xgHome - 0.15); }

  const xgDiff = xgHome - xgAway;
  const defDiff = num(safe(match, "defense.home", 75)) - num(safe(match, "defense.away", 75));
  const heatRisk = num(safe(match, "ai_market.heat_risk", 0));
  const handicapSupport = num(safe(match, "ai_market.handicap_support", 0));
  const marketLogic = num(safe(match, "market_logic.impact", 0));

  let homeScore =
    80 + strengthDiff * 0.35 + formDiff * 0.25 + xgDiff * 12 + defDiff * 0.18 +
    handicapSupport * 1.5 + heatRisk + marketLogic;
  homeScore = Math.max(35, Math.min(125, homeScore));
  let awayScore = Math.max(35, Math.min(125, 160 - homeScore));
  const diff = homeScore - awayScore;

  let homeProb = 28 + diff * 1.2 + mktH * 0.22;
  let awayProb = 28 - diff * 1.0 + mktA * 0.22;
  let drawProb = 100 - homeProb - awayProb;
  homeProb = Math.max(8, Math.min(72, homeProb));
  awayProb = Math.max(8, Math.min(72, awayProb));
  drawProb = Math.max(10, Math.min(42, 100 - homeProb - awayProb));
  const total = homeProb + drawProb + awayProb;
  homeProb = (homeProb / total) * 100;
  drawProb = (drawProb / total) * 100;
  awayProb = (awayProb / total) * 100;

  let pick = "防平", pickSide = "draw";
  if (homeProb >= awayProb && homeProb >= drawProb) { pick = "主胜"; pickSide = "home"; }
  else if (awayProb > homeProb && awayProb >= drawProb) { pick = "客胜"; pickSide = "away"; }

  const gap = Math.max(homeProb, awayProb, drawProb) - Math.min(homeProb, awayProb, drawProb);
  const maxProb = Math.max(homeProb, awayProb, drawProb);
  let risk = "中", riskLevel = "mid";
  if (gap >= 22 && maxProb >= 45 && heatRisk >= -1) { risk = "低"; riskLevel = "low"; }
  else if (gap < 12 || heatRisk <= -2 || maxProb < 38) { risk = "高"; riskLevel = "high"; }

  let stars = 3;
  if (diff > 22 && riskLevel === "low") stars = 5;
  else if (diff > 14 && riskLevel !== "high") stars = 4;
  else if (diff < -8 || riskLevel === "high") stars = 2;
  else if (diff < -18) stars = 1;

  const scoreInfo = predictScoreFromXG(xgHome, xgAway, homeProb, awayProb, drawProb);
  const asian = getAsian(match);
  const totals = getTotals(match);
  const homeZh = toZh(match.home);
  const awayZh = toZh(match.away);
  const league = match.league || "未知";
  const source = match.source || "local";

  const report = buildAnalysis({
    home: homeZh, away: awayZh, league, homeProb, drawProb, awayProb, pick, risk, riskLevel,
    predScore: scoreInfo.predScore, odds: match.odds, heatRisk,
    homeScore: Math.round(homeScore * 10) / 10, awayScore: Math.round(awayScore * 10) / 10,
    gap, scoreInfo, source, asian, totals, strengthHome, strengthAway, formHome, formAway,
  });

  return {
    id: String(match.id || ""),
    home: homeZh, away: awayZh,
    homeEn: match.home || "", awayEn: match.away || "",
    league, kickoff: match.kickoff || "",
    homeScore: Math.round(homeScore * 10) / 10,
    awayScore: Math.round(awayScore * 10) / 10,
    homeProb: Math.round(homeProb * 10) / 10,
    drawProb: Math.round(drawProb * 10) / 10,
    awayProb: Math.round(awayProb * 10) / 10,
    pick, pickSide, risk, riskLevel, stars, starStr: "⭐".repeat(stars),
    predScore: scoreInfo.predScore, predScoreProb: scoreInfo.predProb,
    altScores: scoreInfo.altScores, altScoresText: scoreInfo.altScoresText,
    over25Prob: scoreInfo.over25Prob, under25Prob: scoreInfo.under25Prob,
    maxProb: Math.round(maxProb * 10) / 10,
    odds: match.odds || null, asian, totals, source, report, raw: match,
  };
}

function sortByKickoff(list) {
  return [...list].sort((a, b) => (new Date(a.kickoff || 0).getTime() || 0) - (new Date(b.kickoff || 0).getTime() || 0));
}
function analyzeAll(matches) { return matches.map(analyzeMatch).sort((a, b) => b.homeScore - a.homeScore); }
function analyzeAllByDate(matches) { return sortByKickoff(matches.map(analyzeMatch)); }

async function loadMatches(leagueFilter) {
  try {
    const q = leagueFilter ? `?league=${encodeURIComponent(leagueFilter)}&` : "?";
    const res = await fetch(`/api/fixtures${q}t=` + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.matches) && data.matches.length > 0) {
        window.__DATA_SOURCE__ = data.source || "api";
        window.__DATA_UPDATED__ = data.updatedAt;
        window.__DATA_NOTE__ = data.note || "";
        try {
          sessionStorage.setItem("fa_matches", JSON.stringify(data.matches));
          sessionStorage.setItem("fa_matches_at", data.updatedAt || "");
        } catch (_) {}
        return data.matches;
      }
      // 接口空时也把 note 带出
      window.__DATA_NOTE__ = data.note || data.message || "接口无比赛";
      window.__DATA_SOURCE__ = data.source || "empty";
    }
  } catch (e) { console.warn(e); }

  try {
    const cached = sessionStorage.getItem("fa_matches");
    if (cached) {
      let list = JSON.parse(cached);
      if (leagueFilter) list = list.filter((m) => m.league === leagueFilter);
      if (list.length) { window.__DATA_SOURCE__ = "cache"; return list; }
    }
  } catch (_) {}

  try {
    const res = await fetch("matches.json?t=" + Date.now());
    if (!res.ok) return [];
    const data = await res.json();
    let list = Array.isArray(data) ? data : [];
    if (leagueFilter) list = list.filter((m) => m.league === leagueFilter);
    window.__DATA_SOURCE__ = "local";
    return list;
  } catch { return []; }
}

function findMatch(list, gameId) {
  if (!gameId) return null;
  const id = decodeURIComponent(String(gameId));
  return list.find((x) => String(x.id) === id) || list.find((x) => String(x.id) === gameId) || null;
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
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString("zh-CN", { month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}
function oddsSnippet(g) {
  const od = g.odds || {};
  const ah = g.asian || {};
  const tt = g.totals || {};
  const alts = (g.altScoresText || []).slice(0, 2).join(" · ") || "-";
  return `<table class="odds-table"><thead><tr><th></th><th>主</th><th>平</th><th>客</th><th>让</th><th>大</th><th>小</th></tr></thead>
    <tbody><tr><td class="book">盘</td><td>${od.home??"-"}</td><td>${od.draw??"-"}</td><td>${od.away??"-"}</td>
    <td>${ah.line&&ah.line!=="-"?ah.line:"-"}</td><td>${tt.over??"-"}</td><td>${tt.under??"-"}</td></tr></tbody></table>
    <div style="font-size:0.78rem;color:var(--text-muted);margin-top:6px">预测 <strong>${g.predScore}</strong>（${g.predScoreProb??"-"}%）备选 ${alts}
    · <span style="color:var(--primary)">主${g.homeProb}% 平${g.drawProb}% 客${g.awayProb}%</span></div>`;
}
