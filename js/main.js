/* ═══════════════════════════════════════════════════════════
   PRIMAL — Panel-switch HUD controller
═══════════════════════════════════════════════════════════ */

"use strict";

/* ── STATE ── */
const state = {
  panel: 0,
  total: 5,
  transitioning: false,
  dropCode: null,
  build: {
    photo: null, skinTone: null, height: null, weight: null,
    gender: "male", fit: "slim", archetype: "SHADOW",
  },
  selected: 0,
  prices: { jacket: 580, pants: 320, shoes: 240, bag: 100 },
};

/* ── BUILD CATALOG (Ch03 character-select) ── */
const BUILDS = [
  { tag: "SHADOW / BUILD 01", name: "ACRONYM LOADOUT", price: 1240,
    pieces: [["OUTER","ACRONYM J1A-GT"],["BOTTOM","STONE ISLAND"],["FEET","SALEHE 2002R"],["CARRY","PORTER TANKER"]] },
  { tag: "URBAN / BUILD 02", name: "Y-3 FIELD", price: 980,
    pieces: [["OUTER","Y-3 FIELD JKT"],["BOTTOM","NEMEN HYBRID"],["FEET","NB 990V6"],["CARRY","COTE&CIEL"]] },
  { tag: "FIELD / BUILD 03", name: "C.P. COMPANY", price: 1560,
    pieces: [["OUTER","CP GOGGLE JKT"],["BOTTOM","ISAORA ALPINE"],["FEET","NORDA 001"],["CARRY","OUTLIER PACK"]] },
  { tag: "SHADOW / BUILD 04", name: "VEILANCE", price: 1840,
    pieces: [["OUTER","VEILANCE MIONN"],["BOTTOM","ARC'TERYX"],["FEET","NORDA 001"],["CARRY","TILAK"]] },
  { tag: "URBAN / BUILD 05", name: "HYEIN SEO", price: 720,
    pieces: [["OUTER","HYEIN SEO BMBR"],["BOTTOM","STONE ISLAND"],["FEET","NB 990V6"],["CARRY","PORTER"]] },
];

/* ── HELPERS ── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function makeCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = (n) => Array.from({ length: n }, () => c[Math.floor(Math.random() * c.length)]).join("");
  return `PRM-${seg(4)}-${seg(4)}-${seg(4)}`;
}

/* ── PANEL SWITCHING ── */
function switchPanel(index, _dir) {
  if (state.transitioning || index < 0 || index >= state.total || index === state.panel) {
    // allow re-render of derived panels even if same
    if (index === state.panel) return;
    return;
  }
  state.transitioning = true;

  const panels = $$(".panel");
  const cur = panels[state.panel];
  const next = panels[index];

  cur.classList.add("exit");
  cur.classList.remove("active");
  requestAnimationFrame(() => requestAnimationFrame(() => next.classList.add("active")));

  setTimeout(() => { cur.classList.remove("exit"); state.transitioning = false; }, 500);

  state.panel = index;
  syncChrome(index);
  onEnterPanel(index);
}

function syncChrome(index) {
  $$(".tab").forEach((t, i) => t.classList.toggle("active", i === index));
  $$(".prog-seg").forEach((p, i) => p.classList.toggle("active", i <= index));
  const r = $("#r-panel");
  if (r) r.textContent = `0${index + 1}/05`;
  $("#navPrev").disabled = index === 0;
  $("#navNext").disabled = index === state.total - 1;
}

function onEnterPanel(index) {
  if (index === 2) renderSelectDetail(state.selected);
  if (index === 4) renderOrder();
}

/* ── NAV WIRING ── */
function initNav() {
  $$(".tab").forEach((tab, i) =>
    tab.addEventListener("click", () => switchPanel(i, i > state.panel ? "fwd" : "back")));

  $("#navPrev").addEventListener("click", () => switchPanel(state.panel - 1, "back"));
  $("#navNext").addEventListener("click", () => switchPanel(state.panel + 1, "fwd"));

  $$("[data-goto]").forEach((el) =>
    el.addEventListener("click", () => switchPanel(parseInt(el.dataset.goto, 10), "fwd")));

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if (e.key === "ArrowRight") switchPanel(state.panel + 1, "fwd");
    else if (e.key === "ArrowLeft") switchPanel(state.panel - 1, "back");
  });

  $("#navPrev").disabled = true;
}

/* ── CHROME LIVE DATA ── */
function initChromeData() {
  state.dropCode = makeCode();
  const short = state.dropCode.split("-").slice(0, 2).join("-");
  ["#dropCode", "#socialCode"].forEach((s) => { const e = $(s); if (e) e.textContent = state.dropCode; });
  const tc = $("#ticketCode"); if (tc) tc.textContent = short;

  const time = $("#r-time");
  const tick = () => { if (time) time.textContent = new Date().toISOString().slice(11, 19); };
  tick(); setInterval(tick, 1000);

  // geo
  setTimeout(() => {
    const g1 = $("#r-geo"), g2 = $("#geoStatus");
    const set = (txt, red) => { [g1, g2].forEach((e) => { if (e) { e.textContent = txt; if (red) e.classList.add("red"); } }); };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => set("UNLOCKED", true), () => set("GLOBAL", false));
    } else set("GLOBAL", false);
  }, 1600);

  // countdown
  const cd = $("#dropCountdown");
  let s = 23 * 3600 + 47 * 60 + 12;
  setInterval(() => {
    s = Math.max(0, s - 1);
    if (cd) cd.textContent = [s / 3600, (s % 3600) / 60, s % 60].map((n) => String(Math.floor(n)).padStart(2, "0")).join(":");
  }, 1000);
}

/* ── UPLOAD ── */
function initUpload() {
  const zone = $("#uploadZone"), input = $("#photoInput");
  const inner = $("#uploadInner"), preview = $("#uploadPreview"), img = $("#previewImg"), clear = $("#uploadClear");
  if (!zone) return;

  const show = (file) => {
    state.build.photo = file;
    img.src = URL.createObjectURL(file);
    preview.hidden = false; inner.hidden = true;
  };

  inner.addEventListener("click", () => input.click());
  input.addEventListener("change", () => input.files[0] && show(input.files[0]));
  ["dragover"].forEach((ev) => inner.addEventListener(ev, (e) => { e.preventDefault(); inner.style.borderColor = "var(--red)"; }));
  inner.addEventListener("dragleave", () => { inner.style.borderColor = ""; });
  inner.addEventListener("drop", (e) => {
    e.preventDefault(); inner.style.borderColor = "";
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) show(f);
  });
  clear.addEventListener("click", (e) => {
    e.stopPropagation();
    state.build.photo = null; input.value = "";
    preview.hidden = true; inner.hidden = false;
  });
}

/* ── PREPARE INPUTS ── */
function initPrepare() {
  $$("#tonePicker .tone").forEach((b) => b.addEventListener("click", () => {
    $$("#tonePicker .tone").forEach((x) => x.classList.remove("active"));
    b.classList.add("active"); state.build.skinTone = b.dataset.tone;
  }));

  [["#genderGroup", "gender"], ["#fitGroup", "fit"]].forEach(([sel, key]) => {
    $$(`${sel} .seg__btn`).forEach((b) => b.addEventListener("click", () => {
      $$(`${sel} .seg__btn`).forEach((x) => x.classList.remove("active"));
      b.classList.add("active"); state.build[key] = b.dataset.val;
    }));
  });

  $$("#archetypeGrid .arch").forEach((c) => c.addEventListener("click", () => {
    $$("#archetypeGrid .arch").forEach((x) => x.classList.remove("active"));
    c.classList.add("active"); state.build.archetype = c.dataset.archetype;
  }));

  $("#heightInput")?.addEventListener("input", (e) => state.build.height = +e.target.value || null);
  $("#weightInput")?.addEventListener("input", (e) => state.build.weight = +e.target.value || null);

  const btn = $("#generateBtn");
  btn?.addEventListener("click", () => {
    const txt = $(".btn__txt", btn), loader = $(".btn__loader", btn);
    txt.textContent = "GENERATING"; loader.classList.remove("hidden"); btn.disabled = true;
    setTimeout(() => {
      txt.textContent = "BUILD READY"; loader.classList.add("hidden");
      // bias selected build by archetype
      const idx = BUILDS.findIndex((b) => b.tag.startsWith(state.build.archetype));
      state.selected = idx >= 0 ? idx : 0;
      setTimeout(() => {
        txt.textContent = "GENERATE BUILD"; btn.disabled = false;
        switchPanel(2, "fwd");
      }, 650);
    }, 2200);
  });
}

/* ── PANEL 03 · CHARACTER SELECT ── */
function buildSelectRow() {
  const row = $("#selectRow");
  if (!row) return;
  row.innerHTML = BUILDS.map((b, i) => `
    <div class="select-card${i === state.selected ? " active" : ""}" data-index="${i}">
      <span class="select-card__num">0${i + 1}</span>
      <div class="select-card__fig">
        <div class="fig-slot"><img class="fig-img" src="" alt="${b.name}" /><div class="fig-placeholder"></div></div>
      </div>
      <div class="select-card__meta">
        <span class="select-card__tag">${b.tag}</span>
        <div class="select-card__name">${b.name}</div>
        <div class="select-card__price">$${b.price.toLocaleString()}</div>
      </div>
    </div>`).join("");

  $$(".select-card", row).forEach((card) => card.addEventListener("click", () => {
    state.selected = +card.dataset.index;
    $$(".select-card", row).forEach((c) => c.classList.toggle("active", c === card));
    renderSelectDetail(state.selected);
  }));
}

function renderSelectDetail(i) {
  const b = BUILDS[i];
  if (!b) return;
  $("#detailTag").textContent = b.tag;
  $("#detailName").textContent = b.name;
  $("#detailPrice").textContent = `$${b.price.toLocaleString()}`;
  $("#detailRows").innerHTML = b.pieces.map(([k, v]) =>
    `<div class="detail-line"><span>${k}</span><span>${v}</span></div>`).join("");
  // sync social card tag/price
  const scTag = $("#scTag"), scPrice = $("#scPrice");
  if (scTag) scTag.textContent = b.tag;
  if (scPrice) scPrice.textContent = `$${b.price.toLocaleString()}`;
}

/* ── PANEL 04 · EQUIP ── */
function initEquip() {
  $$(".slot").forEach((slot) => {
    const key = slot.dataset.slot;
    const cur = $("[data-cur]", slot);
    const piece = $(`.fl-piece[data-slot="${key}"]`);
    $$(".alt", slot).forEach((alt) => alt.addEventListener("click", () => {
      $$(".alt", slot).forEach((a) => a.classList.remove("active"));
      alt.classList.add("active");
      const price = +alt.dataset.price;
      state.prices[key] = price;
      cur.textContent = `${alt.dataset.name} · $${price}`;
      if (piece) { piece.classList.add("flash"); setTimeout(() => piece.classList.remove("flash"), 400); }
      updateTotal();
    }));
  });

  $("#resetBuild")?.addEventListener("click", () => {
    state.prices = { jacket: 580, pants: 320, shoes: 240, bag: 100 };
    $$(".slot").forEach((slot) => {
      const alts = $$(".alt", slot);
      alts.forEach((a, j) => a.classList.toggle("active", j === 0));
      const first = alts[0];
      $("[data-cur]", slot).textContent = `${first.dataset.name} · $${first.dataset.price}`;
    });
    updateTotal();
  });
}

function updateTotal() {
  const t = Object.values(state.prices).reduce((a, b) => a + b, 0);
  ["#totalPrice", "#scPrice"].forEach((s) => { const e = $(s); if (e) e.textContent = `$${t.toLocaleString()}`; });
}

/* ── PANEL 05 · DEPLOY ── */
function renderOrder() {
  const lines = $("#orderLines");
  if (!lines) return;
  const items = $$(".slot").map((slot) => {
    const active = $(".alt.active", slot);
    return [active.dataset.name, +active.dataset.price];
  });
  const total = items.reduce((a, [, p]) => a + p, 0);
  lines.innerHTML =
    items.map(([n, p]) => `<div class="order-line"><span>${n}</span><span>$${p}</span></div>`).join("") +
    `<div class="order-line order-line--total"><span>BUILD TOTAL</span><span class="red">$${total.toLocaleString()}</span></div>`;
}

function initDeploy() {
  $("#deployBtn")?.addEventListener("click", () => {
    $("#confirmedCode").textContent = state.dropCode;
    $("#deployOverlay").classList.remove("hidden");
  });
  $("#closeOverlay")?.addEventListener("click", () => {
    $("#deployOverlay").classList.add("hidden");
    switchPanel(0, "back");
  });
  $("#downloadCard")?.addEventListener("click", () => {
    const c = $("#socialCard");
    c.style.transform = "scale(0.97)"; setTimeout(() => c.style.transform = "", 150);
    alert("Card snapshot ready — wire html2canvas for true PNG export.");
  });
  $("#shareCard")?.addEventListener("click", () => {
    const payload = `PRIMAL BUILD ${state.dropCode}`;
    if (navigator.share) navigator.share({ title: "My PRIMAL Build", text: payload, url: location.href }).catch(() => {});
    else navigator.clipboard?.writeText(`${payload} — ${location.href}`).then(() => alert("Build link copied.")).catch(() => {});
  });
}

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", () => {
  initChromeData();
  initNav();
  initUpload();
  initPrepare();
  buildSelectRow();
  renderSelectDetail(state.selected);
  initEquip();
  initDeploy();
});
