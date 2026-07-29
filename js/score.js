/**
 * Football AI Scoring Engine v5.0
 * 中文队名 · 深度分析 · 按日期排序 · 详情缓存
 * 合并产品规格文档分析风格：赔率结构 / 模型偏差 / 风险操作建议
 */

const TEAM_ZH = {
  Internacional: "国际",
  Flamengo: "弗拉门戈",
  Mirassol: "米拉索",
  Remo: "雷莫",
  Fluminense: "弗鲁米嫩塞",
  Bahia: "巴伊亚",
  Vitoria: "维多利亚",
  Palmeiras: "帕尔梅拉斯",
  Corinthians: "科林蒂安",
  "Atletico Paranaense": "巴拉纳竞技",
  Coritiba: "科里蒂巴",
  Cruzeiro: "克鲁塞罗",
  "Grêmio": "格雷米奥",
  Gremio: "格雷米奥",
  "Sao Paulo": "圣保罗",
  "Atletico Mineiro": "米内罗竞技",
  Chapecoense: "沙佩科",
  Botafogo: "博塔弗戈",
  "Vasco da Gama": "瓦斯科达伽马",
  Santos: "桑托斯",
  "Bragantino-SP": "布拉加antino",
  Bragantino: "布拉加antino",
  "New York City FC": "纽约城",
  "Toronto FC": "多伦多FC",
  "Philadelphia Union": "费城联",
  "Atlanta United FC": "亚特兰大联",
  "CF Montreal": "蒙特利尔",
  "New England Revolution": "新英格兰革命",
  "Inter Miami CF": "迈阿密国际",
  "Columbus Crew SC": "哥伦布机员",
  "D.C. United": "华盛顿联",
  "Nashville SC": "纳什维尔",
  "FC Cincinnati": "辛辛那提",
  "San Jose Earthquakes": "圣何塞地震",
  "Vancouver Whitecaps FC": "温哥华白帽",
  "Los Angeles FC": "洛杉矶FC",
  "New York Red Bulls": "纽约红牛",
  "Orlando City SC": "奥兰多城",
  "Chicago Fire": "芝加哥火焰",
  "Charlotte FC": "夏洛特FC",
  "Sporting Kansas City": "堪萨斯城体育",
  "Houston Dynamo": "休斯敦迪纳摩",
  "Minnesota United FC": "明尼苏达联",
  "San Diego FC": "圣地亚哥FC",
  "St. Louis City SC": "圣路易斯城",
  "Real Salt Lake": "盐湖城实时",
  "Colorado Rapids": "科罗拉多急流",
  "Austin FC": "奥斯汀FC",
  "LA Galaxy": "洛杉矶银河",
  "FC Dallas": "达拉斯FC",
  "Portland Timbers": "波特兰伐木者",
  "Seattle Sounders FC": "西雅图海湾人",
  "Vålerenga": "瓦勒伦加",
  HamKam: "汉坎",
  "Bodø/Glimt": "博德闪耀",
  Lillestrom: "利勒斯特罗姆",
  "Fredrikstad FK": "腓特烈斯塔",
  Sandefjord: "桑纳菲尤尔",
  "IK Start": "斯达特",
  "Viking FK": "维京",
  Aalesund: "奥勒松",
  Tromso: "特罗姆瑟",
  KFUM: "KFUM奥斯陆",
  "Kristiansund BK": "克里斯蒂安松",
  Molde: "莫尔德",
  "Sarpsborg FK": "萨尔普斯堡",
  "SK Brann": "布兰",
  Rosenborg: "罗森博格",
  "BK Hacken": "哈肯",
  "Kalmar FF": "卡尔马",
  "IFK Goteborg": "哥德堡",
  "Degerfors IF": "德格福什",
  "IF Brommapojkarna": "布罗马波伊卡纳",
  "Malmo FF": "马尔默",
  AIK: "AIK索尔纳",
  "Örgryte IS": "厄尔格力特",
  "Djurgardens IF": "佐加顿斯",
  "Västerås SK": "韦斯特罗斯",
  "Halmstads BK": "哈尔姆斯塔德",
  "IK Sirius": "天狼星",
  Arsenal: "阿森纳",
  "Bayern Munich": "拜仁慕尼黑",
  Stuttgart: "斯图加特",
  Marseille: "马赛",
  Strasbourg: "斯特拉斯堡",
  Udinese: "乌迪内斯",
  Como: "科莫",
  "Deportivo Alavés": "阿拉维斯",
  Getafe: "赫塔费",
  "Coventry City": "考文垂",
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

/** 深度中文分析（规格文档风格：多维度解读） */
function buildAnalysis(ctx) {
  const {
    home, away, league, homeProb, drawProb, awayProb, pick, risk, riskLevel,
    predScore, odds, heatRisk, homeScore, awayScore, gap,
  } = ctx;

  const od = odds || { home: 2.2, draw: 3.3, away: 3.2 };
  const lines = [];

  lines.push(
    `【${league}】${home} 对阵 ${away}。市场给出主胜 ${od.home}、平 ${od.draw}、客胜 ${od.away}。`
  );

  const invH = 1 / od.home;
  const invD = 1 / od.draw;
  const invA = 1 / od.away;
  const sum = invH + invD + invA;
  const mktH = (invH / sum) * 100;
  const mktA = (invA / sum) * 100;
  const mktD = (invD / sum) * 100;

  if (od.home <= 1.4) {
    lines.push(
      `主队被大幅看高（主胜赔仅 ${od.home}），市场隐含主胜约 ${mktH.toFixed(0)}%。此类盘口一旦爆冷损失大，需警惕平局或客队偷分。`
    );
  } else if (od.home <= 1.85) {
    lines.push(
      `主队略受追捧（主 ${od.home}），隐含主胜约 ${mktH.toFixed(0)}%。优势存在，但并非一边倒，平局仍有约 ${mktD.toFixed(0)}% 的市场空间。`
    );
  } else if (od.away <= 1.85) {
    lines.push(
      `客队更被看好（客 ${od.away}），隐含客胜约 ${mktA.toFixed(0)}%。客场作战仍能开出低赔，说明基本面或状态明显占优。`
    );
  } else {
    lines.push(
      `双方实力接近，主 ${od.home} / 平 ${od.draw} / 客 ${od.away}，三角盘较均衡，结果弹性大，更适合稳健或观望。`
    );
  }

  const aiH = homeProb;
  const delta = aiH - mktH;
  if (Math.abs(delta) >= 6) {
    if (delta > 0) {
      lines.push(
        `模型给主队的概率（${aiH.toFixed(0)}%）高于市场隐含（${mktH.toFixed(0)}%）约 ${delta.toFixed(0)} 个百分点，主胜方向或存在一定「价值」。`
      );
    } else {
      lines.push(
        `模型对主队更谨慎（${aiH.toFixed(0)}%），低于市场约 ${Math.abs(delta).toFixed(0)} 个点，需防市场过热、实际出线不如赔率显示的稳。`
      );
    }
  } else {
    lines.push(
      `模型概率与市场隐含较为接近（主 ${aiH.toFixed(0)}% vs 市 ${mktH.toFixed(0)}%），分歧不大，可更多参考盘口本身与风险偏好。`
    );
  }

  if (pick === "主胜") {
    lines.push(
      `综合评分主 ${homeScore} / 客 ${awayScore}，主胜概率 ${homeProb.toFixed(0)}%，平 ${drawProb.toFixed(0)}%，客 ${awayProb.toFixed(0)}%。倾向主胜，预测比分 ${predScore}。`
    );
  } else if (pick === "客胜") {
    lines.push(
      `客队评分与概率更占优（客胜 ${awayProb.toFixed(0)}%），主 ${homeProb.toFixed(0)}% / 平 ${drawProb.toFixed(0)}%。倾向客胜，预测 ${predScore}。`
    );
  } else {
    lines.push(
      `胜负概率接近（主 ${homeProb.toFixed(0)}% / 平 ${drawProb.toFixed(0)}% / 客 ${awayProb.toFixed(0)}%），更适合防平或观望，预测 ${predScore}。`
    );
  }

  if (riskLevel === "high" || heatRisk <= -2) {
    lines.push(
      `风险偏高：${heatRisk <= -2 ? "热门过热，易生冷门；" : ""}概率差距不够大或盘口偏极端。建议控制仓位，不宜重注单边。`
    );
  } else if (riskLevel === "low" && gap >= 20) {
    lines.push(
      `方向相对清晰，概率差距约 ${gap.toFixed(0)} 个点，可作为稳健参考；仍需结合临场伤停与战意再确认。`
    );
  } else {
    lines.push(
      `中等风险：有倾向但不够「锁死」。可用小注验证思路，或等临场再决定是否跟进。`
    );
  }

  lines.push(`结论：推荐【${pick}】，风险【${risk}】。数据仅供参考，请理性决策。`);

  return lines.join("\n\n");
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

  const homeZh = toZh(match.home);
  const awayZh = toZh(match.away);
  const league = match.league || "未知";

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
    maxProb: Math.round(maxProb * 10) / 10,
    odds: match.odds || null,
    source: match.source || "local",
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
  m = list.find((x) => String(x.id) === gameId);
  return m || null;
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
