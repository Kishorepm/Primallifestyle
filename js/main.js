/* ─────────────────────────────────────────────────────────────
   PRIMAL LIFESTYLE — MAIN SCRIPT
───────────────────────────────────────────────────────────── */

'use strict';

/* ── STATE ─────────────────────────────────────── */
const state = {
  currentChapter: 0,
  totalChapters: 5,
  carouselIndex: 2,
  buildData: {
    photo: null,
    skinTone: null,
    height: null,
    weight: null,
    gender: 'male',
    fit: 'slim',
    archetype: 'SHADOW',
  },
  prices: {
    jacket: 580,
    pants: 320,
    shoes: 240,
    bag: 100,
  },
  dropCode: null,
  isTransitioning: false,
};

/* ── HELPERS ───────────────────────────────────── */
function generateDropCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `PRM-${seg()}-${seg()}-${seg()}`;
}

function formatTime(date) {
  return date.toISOString().split('T')[1].split('.')[0];
}

/* ── LIVE CLOCK ────────────────────────────────── */
function initClock() {
  const el = document.getElementById('live-time');
  if (!el) return;
  const tick = () => { el.textContent = formatTime(new Date()); };
  tick();
  setInterval(tick, 1000);
}

/* ── DROP CODE ─────────────────────────────────── */
function initDropCode() {
  state.dropCode = generateDropCode();
  const els = document.querySelectorAll('#dropCode, #socialCode, #confirmedCode');
  els.forEach(el => { if (el) el.textContent = state.dropCode; });
}

/* ── GEO DETECTION ─────────────────────────────── */
function initGeo() {
  const el = document.getElementById('geoStatus');
  if (!el) return;
  setTimeout(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => { el.textContent = 'UNLOCKED'; el.style.color = 'var(--hud)'; },
        () => { el.textContent = 'REGION: GLOBAL'; el.style.color = 'var(--ink-2)'; }
      );
    } else {
      el.textContent = 'REGION: GLOBAL';
    }
  }, 1800);
}

/* ── COUNTDOWN TIMER ───────────────────────────── */
function initCountdown() {
  const el = document.getElementById('dropCountdown');
  if (!el) return;
  let secs = 23 * 3600 + 47 * 60 + 12;
  const tick = () => {
    secs = Math.max(0, secs - 1);
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    el.textContent = `${h}:${m}:${s}`;
  };
  setInterval(tick, 1000);
}

/* ── CHAPTER NAVIGATION ────────────────────────── */
function goToChapter(index, direction) {
  if (state.isTransitioning) return;
  if (index < 0 || index >= state.totalChapters) return;

  const chapters = document.querySelectorAll('.chapter');
  const dots = document.querySelectorAll('.nav__dot');
  const current = chapters[state.currentChapter];
  const next = chapters[index];

  state.isTransitioning = true;

  const exitClass = direction === 'up' ? 'exit-up' : 'exit-down';
  current.classList.add(exitClass);
  current.classList.remove('active');

  next.style.transform = direction === 'up' ? 'translateY(30px)' : 'translateY(-30px)';
  next.style.opacity = '0';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      next.classList.add('active');
      next.style.transform = '';
      next.style.opacity = '';
    });
  });

  setTimeout(() => {
    current.classList.remove(exitClass);
    state.isTransitioning = false;
  }, 520);

  state.currentChapter = index;

  dots.forEach((dot, i) => dot.classList.toggle('active', i === index));

  const prevBtn = document.getElementById('prevChapter');
  const nextBtn = document.getElementById('nextChapter');
  if (prevBtn) prevBtn.disabled = index === 0;
  if (nextBtn) nextBtn.disabled = index === state.totalChapters - 1;
}

function initChapterNav() {
  document.getElementById('prevChapter')?.addEventListener('click', () => {
    goToChapter(state.currentChapter - 1, 'down');
  });
  document.getElementById('nextChapter')?.addEventListener('click', () => {
    goToChapter(state.currentChapter + 1, 'up');
  });

  document.querySelectorAll('.nav__dot').forEach((dot, i) => {
    dot.addEventListener('click', () => {
      const dir = i > state.currentChapter ? 'up' : 'down';
      goToChapter(i, dir);
    });
  });

  // Initial state
  document.getElementById('prevChapter').disabled = true;
}

/* ── KEYBOARD NAV ──────────────────────────────── */
function initKeyboardNav() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      goToChapter(state.currentChapter + 1, 'up');
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      goToChapter(state.currentChapter - 1, 'down');
    } else if (e.key === 'ArrowRight') {
      if (state.currentChapter === 2) advanceCarousel(1);
    } else if (e.key === 'ArrowLeft') {
      if (state.currentChapter === 2) advanceCarousel(-1);
    }
  });
}

/* ── BEGIN BUTTON ──────────────────────────────── */
function initBeginBtn() {
  document.getElementById('beginBtn')?.addEventListener('click', () => {
    goToChapter(1, 'up');
  });
}

/* ── PHOTO UPLOAD ──────────────────────────────── */
function initUpload() {
  const zone = document.getElementById('uploadZone');
  const input = document.getElementById('photoInput');
  const preview = document.getElementById('uploadPreview');
  const previewImg = document.getElementById('previewImg');
  const clearBtn = document.getElementById('uploadClear');
  const inner = zone?.querySelector('.upload-zone__inner');

  if (!zone) return;

  zone.addEventListener('click', (e) => {
    if (e.target !== clearBtn) input?.click();
  });

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.style.borderColor = 'var(--hud)';
  });
  zone.addEventListener('dragleave', () => {
    zone.style.borderColor = '';
  });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handlePhoto(file);
  });

  input?.addEventListener('change', () => {
    if (input.files[0]) handlePhoto(input.files[0]);
  });

  clearBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    state.buildData.photo = null;
    preview.hidden = true;
    inner.style.display = '';
    input.value = '';
  });

  function handlePhoto(file) {
    state.buildData.photo = file;
    const url = URL.createObjectURL(file);
    previewImg.src = url;
    preview.hidden = false;
    inner.style.display = 'none';
  }
}

/* ── TONE PICKER ───────────────────────────────── */
function initTonePicker() {
  const picker = document.getElementById('tonePicker');
  if (!picker) return;
  picker.querySelectorAll('.tone-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      picker.querySelectorAll('.tone-swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.buildData.skinTone = btn.dataset.tone;
    });
  });
}

/* ── TOGGLE GROUPS ─────────────────────────────── */
function initToggleGroups() {
  [['genderGroup', 'gender'], ['fitGroup', 'fit']].forEach(([id, key]) => {
    const group = document.getElementById(id);
    if (!group) return;
    group.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.buildData[key] = btn.dataset.val;
      });
    });
  });
}

/* ── ARCHETYPE ─────────────────────────────────── */
function initArchetype() {
  const grid = document.getElementById('archetypeGrid');
  if (!grid) return;
  grid.querySelectorAll('.archetype-card').forEach(card => {
    card.addEventListener('click', () => {
      grid.querySelectorAll('.archetype-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.buildData.archetype = card.dataset.archetype;
    });
  });
}

/* ── GENERATE BUILD ────────────────────────────── */
function initGenerateBtn() {
  const btn = document.getElementById('generateBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const inner = btn.querySelector('.btn-primary__inner');
    const loader = document.getElementById('btnLoader');
    const arrow = btn.querySelector('.btn-primary__arrow');

    inner.textContent = 'GENERATING';
    loader?.classList.remove('hidden');
    arrow?.classList.add('hidden');
    btn.disabled = true;
    btn.style.borderColor = 'var(--hud)';
    btn.style.color = 'var(--hud)';

    let dots = 0;
    const dotInterval = setInterval(() => {
      dots = (dots + 1) % 4;
      inner.textContent = 'GENERATING' + '.'.repeat(dots);
    }, 300);

    setTimeout(() => {
      clearInterval(dotInterval);
      loader?.classList.add('hidden');
      arrow?.classList.remove('hidden');
      inner.textContent = 'BUILD READY';
      btn.style.borderColor = '';
      btn.style.color = '';
      btn.disabled = false;

      setTimeout(() => {
        inner.textContent = 'GENERATE BUILD';
        goToChapter(2, 'up');
      }, 800);
    }, 2400);
  });
}

/* ── CAROUSEL ──────────────────────────────────── */
function initCarousel() {
  const track = document.getElementById('carouselTrack');
  const slides = track?.querySelectorAll('.carousel-slide');
  const indicatorsCont = document.getElementById('carouselIndicators');

  if (!track || !slides) return;

  // Build indicators
  slides.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.classList.add('carousel-indicator');
    if (i === state.carouselIndex) dot.classList.add('active');
    indicatorsCont?.appendChild(dot);
  });

  function updateCarousel() {
    const slideWidth = 280 + 24; // flex width + gap
    const containerWidth = track.parentElement.offsetWidth;
    const centerOffset = (containerWidth - 280) / 2 - (3 * slideWidth) + 16;
    const offset = -(state.carouselIndex * slideWidth) + centerOffset;
    track.style.transform = `translateX(${offset}px)`;

    slides.forEach((slide, i) => {
      slide.classList.toggle('center', i === state.carouselIndex);
    });

    const indicators = indicatorsCont?.querySelectorAll('.carousel-indicator');
    indicators?.forEach((dot, i) => dot.classList.toggle('active', i === state.carouselIndex));
  }

  window.advanceCarousel = function(dir) {
    state.carouselIndex = Math.max(0, Math.min(slides.length - 1, state.carouselIndex + dir));
    updateCarousel();
  };

  document.getElementById('carouselPrev')?.addEventListener('click', () => advanceCarousel(-1));
  document.getElementById('carouselNext')?.addEventListener('click', () => advanceCarousel(1));

  // Touch/drag
  let startX = 0;
  track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; });
  track.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) advanceCarousel(dx < 0 ? 1 : -1);
  });

  updateCarousel();
  window.addEventListener('resize', updateCarousel);
}

/* ── SLOT PANELS ───────────────────────────────── */
function initSlotPanels() {
  document.querySelectorAll('.slot-panel').forEach(panel => {
    const slot = panel.dataset.slot;
    const alts = panel.querySelectorAll('.alt-btn');
    const currentName = panel.querySelector('.slot-current-name');
    const currentPrice = panel.querySelector('.slot-current-price');

    alts.forEach(btn => {
      btn.addEventListener('click', () => {
        alts.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (slot && state.prices[slot] !== undefined) {
          const price = parseInt(btn.dataset.price, 10);
          state.prices[slot] = price;

          const fullText = btn.textContent.trim();
          const parts = fullText.split(' · ');
          if (currentName) currentName.textContent = parts[0] || fullText;
          if (currentPrice) currentPrice.textContent = `$${price}`;

          updateTotalPrice();
        }
      });
    });
  });
}

function updateTotalPrice() {
  const total = Object.values(state.prices).reduce((a, b) => a + b, 0);
  const el = document.getElementById('totalPrice');
  if (el) el.textContent = `$${total.toLocaleString()}`;
}

/* ── LOCK BUILD BTN ────────────────────────────── */
function initLockBuild() {
  document.getElementById('lockBuildBtn')?.addEventListener('click', () => {
    goToChapter(4, 'up');
  });

  document.getElementById('resetBuild')?.addEventListener('click', () => {
    document.querySelectorAll('.slot-panel .alt-btn').forEach((btn, i) => {
      const panel = btn.closest('.slot-panel');
      const alts = panel.querySelectorAll('.alt-btn');
      alts.forEach((b, j) => b.classList.toggle('active', j === 0));
    });
    state.prices = { jacket: 580, pants: 320, shoes: 240, bag: 100 };
    updateTotalPrice();
  });
}

/* ── DEPLOY ────────────────────────────────────── */
function initDeploy() {
  const deployBtn = document.getElementById('deployBtn');
  const overlay = document.getElementById('deployOverlay');
  const closeBtn = document.getElementById('closeOverlay');
  const confirmedCode = document.getElementById('confirmedCode');

  deployBtn?.addEventListener('click', () => {
    if (confirmedCode) confirmedCode.textContent = state.dropCode;
    overlay?.classList.remove('hidden');
  });

  closeBtn?.addEventListener('click', () => {
    overlay?.classList.add('hidden');
    goToChapter(0, 'down');
  });
}

/* ── SOCIAL PACK ───────────────────────────────── */
function initSocialPack() {
  document.getElementById('downloadCard')?.addEventListener('click', () => {
    const el = document.getElementById('socialCard');
    if (!el) return;
    // Simple snapshot approach with visual feedback
    el.style.transform = 'scale(0.97)';
    setTimeout(() => { el.style.transform = ''; }, 150);
    alert('Card download ready — integrate html2canvas for real export.');
  });

  document.getElementById('shareCard')?.addEventListener('click', () => {
    if (navigator.share) {
      navigator.share({
        title: 'My PRIMAL Build',
        text: `Check my custom streetwear build — ${state.dropCode}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`PRIMAL BUILD ${state.dropCode} — ${window.location.href}`)
        .then(() => alert('Build link copied to clipboard.'))
        .catch(() => {});
    }
  });
}

/* ── INPUT SYNC ────────────────────────────────── */
function initInputSync() {
  document.getElementById('heightInput')?.addEventListener('input', e => {
    state.buildData.height = parseInt(e.target.value, 10) || null;
  });
  document.getElementById('weightInput')?.addEventListener('input', e => {
    state.buildData.weight = parseInt(e.target.value, 10) || null;
  });
}

/* ── SCROLL-WITHIN-CHAPTER → NAV ───────────────── */
function initScrollNav() {
  let scrollTimeout;
  document.querySelectorAll('.chapter').forEach(chapter => {
    chapter.addEventListener('wheel', (e) => {
      clearTimeout(scrollTimeout);
      const atBottom = chapter.scrollHeight - chapter.scrollTop <= chapter.clientHeight + 2;
      const atTop = chapter.scrollTop <= 2;

      if (e.deltaY > 0 && atBottom) {
        scrollTimeout = setTimeout(() => goToChapter(state.currentChapter + 1, 'up'), 120);
      } else if (e.deltaY < 0 && atTop) {
        scrollTimeout = setTimeout(() => goToChapter(state.currentChapter - 1, 'down'), 120);
      }
    }, { passive: true });
  });
}

/* ── STAGGER ENTRANCE ANIMATIONS ──────────────── */
function observeChapters() {
  const fadeEls = document.querySelectorAll(
    '.archetype-card, .catalog-card, .slot-panel, .drop-module, .order-line'
  );
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.style.animation = `fadeRise 0.5s ${i * 0.06}s both`;
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  fadeEls.forEach(el => observer.observe(el));
}

/* ── INIT ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initDropCode();
  initGeo();
  initCountdown();
  initChapterNav();
  initKeyboardNav();
  initBeginBtn();
  initUpload();
  initTonePicker();
  initToggleGroups();
  initArchetype();
  initGenerateBtn();
  initCarousel();
  initSlotPanels();
  initLockBuild();
  initDeploy();
  initSocialPack();
  initInputSync();
  initScrollNav();
  observeChapters();
});
