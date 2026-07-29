/**
 * Football AI Scoring Engine v5.1
 * - 真实赔率联网（The Odds API）
 * - 比分：基于 xG 的简化泊松，不再千篇一律 2-1
 * - AI 分析：盘口结构 + 价值偏差 + 进球环境 + 操作建议
 */

const TEAM_ZH = {
  Internacional: "国际", Flamengo: "弗拉门戈", Mirassol: "米拉索", Remo: "雷莫",
  Fluminense: "弗鲁米嫩塞", Bahia: "巴伊亚", Vitoria: "维多利亚", Palmeiras: "帕尔梅拉斯",
  Corinthians: "科林蒂安", "Atletico Paranaense": "巴拉纳竞技", Coritiba: "科里蒂巴",
  Cruzeiro: "克鲁塞罗", "Grêmio": "格雷米奥", Gremio: "格雷米奥", "Sao Paulo": "圣保罗",
  "Atletico Mineiro": "米内罗竞技", Chapecoense: "沙佩科", Botafogo: "博塔弗戈",
  "Vasco da Gama": "瓦斯科达伽马", Santos: "桑托斯", Bragantino: "布拉加antino",
  "Bragantino-SP": "布拉加antino",
  "New York City FC": "纽约城", "Toronto FC": "多伦多FC", "Philadelphia Union": "费城联",
  "Atlanta United FC": "亚特兰大联", "CF Montreal": "蒙特利尔",
  "New England Revolution": "新英格兰革命", "Inter Miami CF": "迈阿密国际",
  "Columbus Crew SC": "哥伦布机员", "D.C. United": "华盛顿联", "Nashville SC": "纳什维尔",
  "FC Cincinnati": "辛辛那提", "San Jose Earthquakes": "圣何塞地震",
  "Vancouver Whitecaps FC": "温哥华白帽", "Los Angeles FC": "洛杉矶FC",
  "New York Red Bulls": "纽约红牛", "Orlando City SC": "奥兰多城", "Chicago Fire": "芝加哥火焰",
  "Charlotte FC": "夏洛特FC", "Sporting Kansas City": "堪萨斯城体育",
  "Houston Dynamo": "休斯敦迪纳摩", "Minnesota United FC": "明尼苏达联",
  "San Diego FC": "圣地亚哥FC", "St. Louis City SC": "圣路易斯城",
  "Real Salt Lake": "盐湖城实时", "Colorado Rapids": "科罗拉多急流",
  "Austin FC": "奥斯汀FC", "LA Galaxy": "洛杉矶银河", "FC Dallas": "达拉斯FC",
  "Portland Timbers": "波特兰伐木者", "Seattle Sounders FC": "西雅图海湾人",
  "Vålerenga": "瓦勒伦加", HamKam: "汉坎", "Bodø/Glimt": "博德闪耀",
  Lillestrom: "利勒斯特罗姆", "Fredrikstad FK": "腓特烈斯塔", Sandefjord: "桑纳菲尤尔",
  "IK Start": "斯达特", "Viking FK": "维京", Aalesund: "奥勒松", Tromso: "特罗姆瑟",
  KFUM: "KFUM奥斯陆", "Kristiansund BK": "克里斯蒂安松", Molde: "莫尔德",
  "Sarpsborg FK": "萨尔普斯堡", "SK Brann": "布兰", Rosenborg: "罗森博格",
  "BK Hacken": "哈肯", "Kalmar FF": "卡尔马", "IFK Goteborg": "哥德堡",
  "Degerfors IF": "德格福什", "IF Brommapojkarna": "布罗马波伊卡纳",
  "Malmo FF": "马尔默", AIK: "AIK索尔纳", "Örgryte IS": "厄尔格力特",
  "Djurgardens IF": "佐加顿斯", "Västerås SK": "韦斯特罗斯",
  "Halmstads BK": "哈尔姆斯塔德", "IK Sirius": "天狼星",
  Arsenal: "阿森纳", "Bayern Munich": "拜仁慕尼黑", Stuttgart: "斯图加特",
  Marseille: "马赛", Strasbourg: "斯特拉斯堡", Udinese: "乌迪内斯", Como: "科莫",
  "Deportivo Alavés": "阿拉维斯", Getafe: "赫塔费", "Coventry City": "考文垂",
};

function toZh(name) {
  if (!name) return "未知";
  if (TEAM_ZH[name]) return TEAM_ZH[name];
  const cleaned = String(name).replace(/\s+(FC|SC|CF|FK|BK|IF|SK|United)$/i, "").trim();
  if (TEAM_ZH[cleaned]) return TEAM_ZH[cleaned];
  for (const [en, zh] of Object.entries(TEAM_ZH)) {
    if (en.toLowerCase() === String(name).toLowerCase()) return zh;
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
  } catch {
    return def;
  }
}

function fact(n) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/** 泊松 P(k|λ) */
function poissonP(k, lambda) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / fact(k);
}

/**
 * 用主客期望进球（xG）生成最可能比分 + 备选比分
 * 不再写死 2-1
 */
function predictScoreFromXG(xgH, xgA, homeProb, awayProb, drawProb) {
  const lh = Math.max(0.35, Math.min(3.8, xgH));
  const la = Math.max(0.35, Math.min(3.8, xgA));
  const scores = [];
  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      const p = poissonP(h, lh) * poissonP(a, la);
      scores.push({ h, a, p, str: h + "-" + a });
    }
  }
  scores.sort((x, y) => y.p - x.p);

  // 按胜平负方向约束：优先取与 pick 一致的最高概率比分
  let pickSide = "draw";
  if (homeProb >= awayProb && homeProb >= drawProb) pickSide = "home";
  else if (awayProb > homeProb && awayProb >= drawProb) pickSide = "away";

  const matchSide = (s) => {
    if (pickSide === "home") return s.h > s.a;
    if (pickSide === "away") return s.a > s.h;
    return s.h === s.a;
  };

  const primary = scores.find(matchSide) || scores[0];
  const alts = scores.filter((s) => s.str !== primary.str).slice(0, 2);

  return {
    predScore: primary.str,
    predProb: +(primary.p * 100).toFixed(1),
    altScores: alts.map((s) => s.str + "(" + (s.p * 100).toFixed(0) + "%)"),
    totalGoalsExp: +(lh + la).toFixed(2),
    xgHome: +lh.toFixed(2),
    xgAway: +la.toFixed(2),
  };
}

function marketImplied(od) {
  const invH = 1 / (od.home || 2.2);
  const invD = 1 / (od.draw || 3.3);
  const invA = 1 / (od.away || 3.2);
  const sum = invH + invD + invA || 1;
  return {
    mktH: (invH / sum) * 100,
    mktD: (invD / sum) * 100,
    mktA: (invA / sum) * 100,
  };
}

function buildAnalysis(ctx) {
  const {
    home, away, league, homeProb, drawProb, awayProb, pick, risk, riskLevel,
    predScore, odds, heatRisk, homeScore, awayScore, gap, scoreInfo, source,
  } = ctx;

  const od = odds || { home: 2.2, draw: 3.3, away: 3.2 };
  const { mktH, mktD, mktA } = marketImplied(od);
  const lines = [];
  const isLiveOdds = source === "odds-api";

  lines.push(
    `【${league}】${home} vs ${away}。` +
      (isLiveOdds
        ? `当前为联网真实赔率：主 ${od.home} / 平 ${od.draw} / 客 ${od.away}（多家书商平均）。`
        : `当前为估算盘口：主 ${od.home} / 平 ${od.draw} / 客 ${od.away}（未拉到实时赔率时的回退）。`)
  );

  // 盘口画像
  if (od.home <= 1.35) {
    lines.push(
      `主队被开成大热（主胜仅 ${od.home}），隐含主胜约 ${mktH.toFixed(0)}%。盘口一边倒时，真正风险在「平局/客队偷分」——一旦打穿，回报和回撤都不对称。`
    );
  } else if (od.home <= 1.75) {
    lines.push(
      `主队受追捧但不极端（主 ${od.home}），隐含主胜约 ${mktH.toFixed(0)}%、平约 ${mktD.toFixed(0)}%。优势在，却仍要给平局留位置。`
    );
  } else if (od.away <= 1.75) {
    lines.push(
      `客队被市场看好（客 ${od.away}），隐含客胜约 ${mktA.toFixed(0)}%。客场仍能开出低赔，通常意味着状态或纸面实力差较明显。`
    );
  } else if (Math.abs(od.home - od.away) < 0.35) {
    lines.push(
      `主客赔率几乎咬死（主 ${od.home} / 客 ${od.away}），属于典型「难分伯仲」盘。方向感弱，更适合看进球数或观望。`
    );
  } else {
    lines.push(
      `三角盘相对均衡：主 ${od.home} / 平 ${od.draw} / 客 ${od.away}，隐含概率主 ${mktH.toFixed(0)}% · 平 ${mktD.toFixed(0)}% · 客 ${mktA.toFixed(0)}%。`
    );
  }

  // 模型 vs 市场
  const delta = homeProb - mktH;
  if (Math.abs(delta) >= 5) {
    if (delta > 0) {
      lines.push(
        `模型给主队 ${homeProb.toFixed(0)}%，高于市场隐含 ${mktH.toFixed(0)}% 约 ${delta.toFixed(0)} 个点——若你信任模型结构，主胜方向带一点「价值」色彩；否则也可能是模型对客队防守/战意估计不足。`
      );
    } else {
      lines.push(
        `模型对主队更保守（${homeProb.toFixed(0)}%），低于市场约 ${Math.abs(delta).toFixed(0)} 个点。常见于市场过热：赔率已提前兑现预期，实际出线未必有盘口看起来稳。`
      );
    }
  } else {
    lines.push(
      `模型与市场分歧不大（主 ${homeProb.toFixed(0)}% vs 市 ${mktH.toFixed(0)}%），说明这盘主要反映共识，而不是明显错定价。`
    );
  }

  // 进球环境 + 比分
  if (scoreInfo) {
    const tg = scoreInfo.totalGoalsExp;
    let goalTone = "中等";
    if (tg >= 3.0) goalTone = "偏大";
    else if (tg <= 2.1) goalTone = "偏小";
    lines.push(
      `期望进球环境：主 xG≈${scoreInfo.xgHome}、客 xG≈${scoreInfo.xgAway}，合计约 ${tg}，整体偏${goalTone}。` +
        `泊松推演最可能比分【${predScore}】（约 ${scoreInfo.predProb}%）；备选 ${scoreInfo.altScores.join("、")}。`
    );
  }

  // 推荐与仓位
  lines.push(
    `综合评分 主 ${homeScore} / 客 ${awayScore}；概率 主 ${homeProb.toFixed(0)}% · 平 ${drawProb.toFixed(0)}% · 客 ${awayProb.toFixed(0)}%。` +
      `倾向【${pick}】，预测比分 ${predScore}。`
  );

  if (riskLevel === "high" || heatRisk <= -2) {
    lines.push(
      `风险偏高：${heatRisk <= -2 ? "热门过热，爆冷赔率不对称；" : ""}概率差或盘口结构不支持重注。建议小仓或拆成「方向 + 防冷」组合，不宜一把梭。`
    );
  } else if (riskLevel === "low" && gap >= 18) {
    lines.push(
      `方向相对清晰（概率差约 ${gap.toFixed(0)} 点），可作稳健参考；仍建议看临场伤停/首发后再定仓位。`
    );
  } else {
    lines.push(
      `中等风险：有倾向但不够「锁死」。可用试探仓验证思路，或等临场信息更全再跟。`
    );
  }

  lines.push(
    `数据说明：赔率为联网书商均值；比分由期望进球做泊松推演，不是人工拍脑袋。不含伤停/阵容新闻的实时爬取。仅供研究，请理性决策。`
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

  // 若有真实赔率，用隐含概率微调 xG，让比分更跟盘
  const od = match.odds || { home: 2.2, draw: 3.3, away: 3.2 };
  const { mktH, mktA, mktD } = marketImplied(od);
  const totalBase = xgHome + xgAway || 2.4;
  // 市场强队分到更多期望进球
  const shareH = Math.max(0.28, Math.min(0.72, (mktH + mktD * 0.35) / 100));
  xgHome = +(totalBase * shareH).toFixed(2);
  xgAway = +(totalBase * (1 - shareH)).toFixed(2);
  // 热门再压一点客队进球
  if (od.home <= 1.4) {
    xgHome = Math.min(3.2, xgHome + 0.25);
    xgAway = Math.max(0.4, xgAway - 0.15);
  }
  if (od.away <= 1.4) {
    xgAway = Math.min(3.2, xgAway + 0.25);
    xgHome = Math.max(0.4, xgHome - 0.15);
  }

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

  // 概率同时吃一点市场隐含，避免和盘口完全脱节
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

  const scoreInfo = predictScoreFromXG(xgHome, xgAway, homeProb, awayProb, drawProb);
  const predScore = scoreInfo.predScore;

  const homeZh = toZh(match.home);
  const awayZh = toZh(match.away);
  const league = match.league || "未知";
  const source = match.source || "local";

  const report = buildAnalysis({
    home: homeZh,
    away: awayZh,
    league,
    homeProb,
    drawProb,
    awayProb,
    pick,
    risk,
    riskLevel,
    predScore,
    odds: match.odds,
    heatRisk,
    homeScore: Math.round(homeScore * 10) / 10,
    awayScore: Math.round(awayScore * 10) / 10,
    gap,
    scoreInfo,
    source,
  });

  return {
    id: String(match.id || ""),
    home: homeZh,
    away: awayZh,
    homeEn: match.home || "",
    awayEn: match.away || "",
    league,
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
    predScoreProb: scoreInfo.predProb,
    altScores: scoreInfo.altScores,
    maxProb: Math.round(maxProb * 10) / 10,
    odds: match.odds || null,
    source,
    report,
    raw: match,
  };
}

function sortByKickoff(list) {
  return [...list].sort((a, b) => {
    const ta = new Date(a.kickoff || 0).getTime() || 0;
    const tb = new Date(b.kickoff || 0).getTime() || 0;
    return ta - tb;
  });
}

function analyzeAll(matches) {
  return matches.map(analyzeMatch).sort((a, b) => b.homeScore - a.homeScore);
}

function analyzeAllByDate(matches) {
  return sortByKickoff(matches.map(analyzeMatch));
}

async function loadMatches(leagueFilter) {
  try {
    const q = leagueFilter ? `?league=${encodeURIComponent(leagueFilter)}` : "";
    const res = await fetch(`/api/fixtures${q}${q ? "&" : "?"}t=` + Date.now());
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
    }
  } catch (e) {
    console.warn("API 不可用，使用本地数据", e);
  }

  try {
    const cached = sessionStorage.getItem("fa_matches");
    if (cached) {
      let list = JSON.parse(cached);
      if (leagueFilter) list = list.filter((m) => m.league === leagueFilter);
      if (list.length) {
        window.__DATA_SOURCE__ = "cache";
        return list;
      }
    }
  } catch (_) {}

  const res = await fetch("matches.json?t=" + Date.now());
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  let list = Array.isArray(data) ? data : [];
  if (leagueFilter) list = list.filter((m) => m.league === leagueFilter);
  window.__DATA_SOURCE__ = "local";
  try {
    sessionStorage.setItem("fa_matches", JSON.stringify(list));
  } catch (_) {}
  return list;
}

function findMatch(list, gameId) {
  if (!gameId) return null;
  const id = decodeURIComponent(String(gameId));
  let m = list.find((x) => String(x.id) === id);
  if (m) return m;
  return list.find((x) => String(x.id) === gameId) || null;
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
    return d.toLocaleString("zh-CN", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
