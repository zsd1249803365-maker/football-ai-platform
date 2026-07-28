/**
 * 从澳客网抓取竞彩足球开售赛程 + 赔率
 * 数据源: https://www.okooo.com/jingcai/
 * 无需 API Key，免费
 */

function parseOkoooHtml(html) {
  const matches = [];
  // 粗解析：按场次块切分（编号 3 位数字开头）
  // 结构大致：编号、联赛、时间、主队、赔率、客队、让球盘…
  const blocks = html.split(/(?=\d{3}\s*<)/);

  // 更稳：用正则抓「编号 + 联赛 + 时间 + 主客 + 赔率」
  // 页面文本化后的模式（open_page 已验证存在）
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n+/g, "\n");

  const lines = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  // 找类似: 201 瑞典超 / 22:00 / 赫根 / 1.75 / 3.75 / 3.43 / 索尔纳
  for (let i = 0; i < lines.length; i++) {
    const codeMatch = lines[i].match(/^(\d{3})$/);
    if (!codeMatch) continue;
    const code = codeMatch[1];

    // 往后扫若干行拼一场
    const window = lines.slice(i, i + 20);
    const leagueLine = window.find((l, idx) => idx > 0 && /超|甲|乙|杯|联|冠|友谊|锦标赛|联赛|瑞典|挪威|芬兰|中超|英|西|意|德|法|日|韩|美|巴|阿/.test(l) && l.length < 20);
    const timeLine = window.find((l) => /^\d{1,2}:\d{2}$/.test(l));
    const odds = [];
    for (const l of window) {
      if (/^\d+\.\d{2}$/.test(l)) odds.push(parseFloat(l));
    }

    // 队名：不含纯数字、不含赔率格式、长度合适
    const nameCandidates = window.filter(
      (l) =>
        l.length >= 2 &&
        l.length <= 16 &&
        !/^\d/.test(l) &&
        !/^\d+\.\d+$/.test(l) &&
        !/胜|平|负|让球|全选|反选|指数|开赛|截止|主|客|数据|最低/.test(l) &&
        l !== leagueLine
    );

    if (!leagueLine || nameCandidates.length < 2) continue;

    const home = nameCandidates[0];
    const away = nameCandidates[1];
    const homeOdd = odds[0] || 2.1;
    const drawOdd = odds[1] || 3.3;
    const awayOdd = odds[2] || 3.4;

    // 避免重复
    if (matches.some((m) => m.id === code || (m.home === home && m.away === away))) continue;

    matches.push({
      code,
      league: leagueLine.replace(/\[|\]/g, "").trim(),
      time: timeLine || "",
      home,
      away,
      odds: { home: homeOdd, draw: drawOdd, away: awayOdd },
    });
  }

  return matches;
}

function mapMatch(m) {
  const { home, away, odds: od, league, time, code } = m;
  const invH = 1 / (od.home || 2.1);
  const invD = 1 / (od.draw || 3.3);
  const invA = 1 / (od.away || 3.4);
  const sum = invH + invD + invA || 1;
  const pH = invH / sum;
  const pA = invA / sum;
  const strengthHome = Math.round(70 + pH * 30);
  const strengthAway = Math.round(70 + pA * 30);
  const heat = od.home < 1.55 ? "高" : od.home < 2.15 ? "中" : "低";
  const heatRisk = heat === "高" ? -2 : heat === "中" ? -1 : 0;

  // 拼一个 kickoff（只有时分时用今天日期）
  let kickoff = "";
  if (time) {
    const today = new Date().toISOString().slice(0, 10);
    kickoff = `${today}T${time}:00+08:00`;
  }

  return {
    id: code || String(Math.random()).slice(2, 10),
    league: league || "竞彩",
    home,
    away,
    kickoff,
    status: "NS",
    strength: { home: strengthHome, away: strengthAway },
    form: {
      home: strengthHome - 5,
      away: strengthAway - 5,
      detail: { home: "竞彩开售", away: "竞彩开售" },
    },
    xg: {
      home: +(1.1 + pH * 1.2).toFixed(2),
      away: +(1.1 + pA * 1.2).toFixed(2),
    },
    defense: { home: strengthHome - 3, away: strengthAway - 3 },
    odds: od,
    market: {
      asian_handicap: { line: "-", home: "-", away: "-" },
      goal: { line: "2.5", over: "大", under: "小" },
    },
    market_analysis: {
      trend: "竞彩开售（澳客）",
      heat,
      risk_note: heat === "高" ? "热门过热，注意防冷" : "市场热度正常",
    },
    ai_market: {
      odds_change: 0,
      heat_risk: heatRisk,
      handicap_support: pH > 0.45 ? 1 : pA > 0.4 ? -1 : 0,
      analysis: `${home} vs ${away}，竞彩主胜 ${od.home} / 平 ${od.draw} / 客 ${od.away}`,
    },
    injury: {
      home: { players: [], totalImpact: 0 },
      away: { players: [], totalImpact: 0 },
    },
    motivation: { level: "竞彩", impact: 3 },
    schedule: { recent_match: "-", fatigue: 0 },
    rotation: { risk: "未知", impact: 0 },
    style_match: {
      home_style: "-",
      away_style: "-",
      matchup: "基于竞彩奖金估算",
      impact: 0,
    },
    market_logic: {
      popular_side: pH > pA ? "主胜" : "客胜",
      cold_side: "平局",
      bookmaker_signal: "竞彩固定奖金",
      impact: heatRisk,
    },
    prediction: {
      home_win: Math.round(pH * 100) + "%",
      draw: Math.round((1 - pH - pA) * 100) + "%",
      away_win: Math.round(pA * 100) + "%",
      score: pH > 0.45 ? "2-1" : pA > 0.4 ? "1-2" : "1-1",
    },
    risk: heat === "高" ? "较高" : "中等",
    source: "jingcai",
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=300");
  if (req.method === "OPTIONS") return res.status(200).end();

  const debug = [];
  try {
    // 今天 + 昨天（竞彩跨日）
    const dates = [];
    const now = new Date();
    for (let d = 0; d <= 2; d++) {
      const t = new Date(now.getTime() - d * 864e5);
      dates.push(t.toISOString().slice(0, 10));
    }

    let parsed = [];
    for (const date of dates) {
      const url =
        date === dates[0]
          ? "https://www.okooo.com/jingcai/"
          : `https://www.okooo.com/jingcai/${date}/`;
      try {
        const r = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "zh-CN,zh;q=0.9",
          },
        });
        if (!r.ok) {
          debug.push({ date, status: r.status });
          continue;
        }
        const html = await r.text();
        const list = parseOkoooHtml(html);
        debug.push({ date, n: list.length });
        for (const m of list) {
          if (!parsed.some((x) => x.code === m.code && x.home === m.home)) {
            parsed.push(m);
          }
        }
      } catch (e) {
        debug.push({ date, err: String(e.message || e) });
      }
    }

    let matches = parsed.map(mapMatch);

    // 联赛筛选（前端传来的中文名）
    const leagueFilter = req.query?.league;
    if (leagueFilter) {
      matches = matches.filter(
        (m) => m.league === leagueFilter || String(m.league).includes(leagueFilter)
      );
    }

    return res.status(200).json({
      ok: matches.length > 0,
      count: matches.length,
      source: "okooo-jingcai",
      note:
        matches.length > 0
          ? "数据来自澳客网竞彩开售列表（与竞彩网同步）"
          : "今日暂无开售或页面结构变化，已回退本地数据",
      updatedAt: new Date().toISOString(),
      debug,
      matches,
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      reason: "scrape_error",
      message: String(err.message || err),
      debug,
      matches: [],
    });
  }
}
