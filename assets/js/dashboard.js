const RING = 2 * Math.PI * 56;

const $ = (id) => document.getElementById(id);

function pct(done, total) {
  if (!total) return 0;
  return (done / total) * 100;
}

function fmt(n) {
  return new Intl.NumberFormat("en-US").format(n);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function loadData() {
  const res = await fetch("data/progress.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function challengeTotals(challenges) {
  const levels = ["easy", "medium", "hard"];
  return levels.reduce(
    (acc, key) => {
      acc.done += challenges[key].done;
      acc.total += challenges[key].total;
      return acc;
    },
    { done: 0, total: 0 }
  );
}

function aggregate(data) {
  const chal = challengeTotals(data.challenges);
  const cats = data.categories.reduce(
    (acc, cat) => {
      acc.done += cat.done;
      acc.inProgress += cat.inProgress;
      acc.notStarted += cat.notStarted;
      acc.all += cat.all;
      return acc;
    },
    { done: 0, inProgress: 0, notStarted: 0, all: 0 }
  );

  const done = chal.done + cats.done;
  const inProgress = cats.inProgress;
  const all = chal.total + cats.all;
  const notStarted = Math.max(0, all - done - inProgress);

  return { chal, cats, done, inProgress, notStarted, all };
}

function renderMeta(data, stats) {
  $("user-pill").textContent = `@${data.meta.username}`;
  $("sync-pill").textContent = `synced ${data.meta.lastUpdated}`;
  $("hero-title").textContent = data.meta.displayName;
  $("hero-tagline").textContent = data.meta.tagline;

  const overall = pct(stats.done, stats.all);
  $("overall-pct").textContent = `${round1(overall)}%`;
  $("overall-caption").textContent = `${fmt(stats.done)} of ${fmt(stats.all)} items completed`;
  requestAnimationFrame(() => {
    $("overall-ring").style.strokeDashoffset = String(RING * (1 - overall / 100));
  });

  $("hero-kpis").innerHTML = `
    <div class="mini-stat"><span>Completed</span><strong>${fmt(stats.done)}</strong></div>
    <div class="mini-stat"><span>In progress</span><strong>${fmt(stats.inProgress)}</strong></div>
    <div class="mini-stat"><span>Remaining</span><strong>${fmt(stats.notStarted)}</strong></div>
  `;
}

function renderKpis(stats) {
  const items = [
    { label: "Total items", value: stats.all, bar: 100 },
    { label: "Completed", value: stats.done, bar: pct(stats.done, stats.all) },
    { label: "In progress", value: stats.inProgress, bar: pct(stats.inProgress, stats.all) },
    { label: "Not started", value: stats.notStarted, bar: pct(stats.notStarted, stats.all) },
  ];

  $("kpi-row").innerHTML = items
    .map(
      (item) => `
      <article class="glass kpi">
        <span class="label">${item.label}</span>
        <strong class="value">${fmt(item.value)}</strong>
        <div class="bar"><i style="--w:${item.bar}%"></i></div>
      </article>`
    )
    .join("");

  requestAnimationFrame(() => {
    document.querySelectorAll(".kpi .bar > i").forEach((el) => {
      el.style.width = el.style.getPropertyValue("--w");
    });
  });
}

function renderChallenges(data) {
  const levels = [
    { key: "easy", label: "Easy" },
    { key: "medium", label: "Medium" },
    { key: "hard", label: "Hard" },
  ];
  const totals = challengeTotals(data.challenges);

  $("challenges-summary").textContent = `${fmt(totals.done)} / ${fmt(totals.total)} solved`;
  $("challenge-grid").innerHTML = levels
    .map(({ key, label }) => {
      const { done, total } = data.challenges[key];
      const p = pct(done, total);
      return `
        <article class="challenge ${key}">
          <header>
            <h3>${label}</h3>
            <span class="frac">${fmt(done)}/${fmt(total)}</span>
          </header>
          <div class="pct">${round1(p)}%</div>
          <div class="bar"><i data-width="${p}"></i></div>
        </article>`;
    })
    .join("");

  requestAnimationFrame(() => {
    document.querySelectorAll(".challenge .bar > i").forEach((el) => {
      el.style.width = `${el.dataset.width}%`;
    });
  });
}

function pieGradient(cat) {
  const done = pct(cat.done, cat.all);
  const wip = pct(cat.inProgress, cat.all);
  const doneEnd = done;
  const wipEnd = done + wip;
  return `conic-gradient(${cat.color} 0 ${doneEnd}%, var(--progress) ${doneEnd}% ${wipEnd}%, var(--idle) ${wipEnd}% 100%)`;
}

function renderCategories(data) {
  $("category-grid").innerHTML = data.categories
    .map((cat) => {
      const complete = round1(pct(cat.done, cat.all));
      return `
        <article class="glass cat">
          <div class="cat-top">
            <div class="pie" style="background:${pieGradient(cat)}"></div>
            <div>
              <h3>${escapeXml(cat.label)}</h3>
              <p class="all">${complete}% complete · ${fmt(cat.all)} total</p>
            </div>
          </div>
          <div class="stack">
            <div class="done"><span>Done</span><strong>${fmt(cat.done)}</strong></div>
            <div class="wip"><span>In progress</span><strong>${fmt(cat.inProgress)}</strong></div>
            <div><span>Not started</span><strong>${fmt(cat.notStarted)}</strong></div>
          </div>
        </article>`;
    })
    .join("");
}

function renderChart(data) {
  const svg = $("trend-chart");
  const series = [
    {
      label: "Challenges",
      color: "#fbbf24",
      value: pct(challengeTotals(data.challenges).done, challengeTotals(data.challenges).total),
      wip: 0,
    },
    ...data.categories.map((cat) => ({
      label: cat.label,
      color: cat.color,
      value: pct(cat.done, cat.all),
      wip: pct(cat.inProgress, cat.all),
    })),
  ];

  const W = 920;
  const H = 280;
  const pad = { l: 48, r: 20, t: 24, b: 48 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const max = 100;
  const step = innerW / Math.max(series.length - 1, 1);

  const points = series.map((item, i) => {
    const x = pad.l + i * step;
    const y = pad.t + innerH * (1 - item.value / max);
    return { ...item, x, y };
  });

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const area = `${line} L ${points.at(-1).x.toFixed(1)} ${pad.t + innerH} L ${points[0].x.toFixed(1)} ${pad.t + innerH} Z`;

  const bars = points
    .map((p) => {
      const bw = Math.min(36, step * 0.38);
      const hDone = (p.value / max) * innerH;
      const hWip = (p.wip / max) * innerH;
      const x = p.x - bw / 2;
      const yDone = pad.t + innerH - hDone;
      const yWip = yDone - hWip;
      return `
        <rect x="${x.toFixed(1)}" y="${yWip.toFixed(1)}" width="${bw}" height="${hWip.toFixed(1)}" rx="4" fill="#38bdf8" opacity="0.55"></rect>
        <rect x="${x.toFixed(1)}" y="${yDone.toFixed(1)}" width="${bw}" height="${hDone.toFixed(1)}" rx="4" fill="${p.color}" opacity="0.9"></rect>`;
    })
    .join("");

  const grid = [0, 25, 50, 75, 100]
    .map((tick) => {
      const y = pad.t + innerH * (1 - tick / max);
      return `
        <line class="chart-axis" x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}"></line>
        <text class="chart-label" x="8" y="${y + 4}">${tick}%</text>`;
    })
    .join("");

  const labels = points
    .map(
      (p) =>
        `<text class="chart-label" text-anchor="middle" x="${p.x.toFixed(1)}" y="${H - 16}">${escapeXml(p.label)}</text>`
    )
    .join("");

  const dots = points
    .map(
      (p) => `
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5.5" fill="#06090d" stroke="${p.color}" stroke-width="2.4">
        <title>${escapeXml(p.label)}: ${round1(p.value)}% completed</title>
      </circle>`
    )
    .join("");

  svg.innerHTML = `
    <defs>
      <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3ee8b5" stop-opacity="0.22" />
        <stop offset="100%" stop-color="#3ee8b5" stop-opacity="0" />
      </linearGradient>
    </defs>
    ${grid}
    ${bars}
    <path d="${area}" fill="url(#areaFill)"></path>
    <path d="${line}" fill="none" stroke="#3ee8b5" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"></path>
    ${dots}
    ${labels}
  `;
}

async function init() {
  try {
    const data = await loadData();
    const stats = aggregate(data);
    renderMeta(data, stats);
    renderKpis(stats);
    renderChallenges(data);
    renderCategories(data);
    renderChart(data);
  } catch (err) {
    console.error(err);
    $("error-overlay").hidden = false;
  }
}

init();
