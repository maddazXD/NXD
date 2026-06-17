// js/ui.js
// UI utilities: toast, landscape mode, sidebar panel, tabs

import { icons } from './icons.js';

// ── TOAST ─────────────────────────────────────────────
export function showToast(message, duration = 3000) {
  let wrap = document.getElementById('toastWrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toastWrap';
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = message;
  wrap.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 250);
  }, duration);
}

// ── SIDEBAR TABS ──────────────────────────────────────
export function initSidebarTabs() {
  const tabs   = document.querySelectorAll('.s-tab');
  const chat   = document.getElementById('chatPanel');
  const donate = document.getElementById('donatePanel');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (target === 'chat') {
        chat?.classList.remove('hidden');
        donate?.classList.remove('active');
      } else {
        chat?.classList.add('hidden');
        donate?.classList.add('active');
      }
    });
  });
}

// ── LANDSCAPE / FAB DRAWER ────────────────────────────
export function initLandscapeDrawer() {
  const sidebar   = document.getElementById('sidebar');
  const backdrop  = document.getElementById('sidebarBackdrop');
  const fab       = document.getElementById('fabChat');
  if (!sidebar || !fab) return;

  fab.innerHTML = icons.chat || '';

  function isLandscapeMobile() {
    return window.innerWidth <= 900 && window.matchMedia('(orientation: landscape)').matches;
  }

  function openSidebar() {
    sidebar.classList.add('landscape-open');
    backdrop?.classList.add('show');
    document.getElementById('fabBadge')?.classList.remove('show');
  }

  function closeSidebar() {
    sidebar.classList.remove('landscape-open');
    backdrop?.classList.remove('show');
  }

  fab.addEventListener('click', () => {
    if (sidebar.classList.contains('landscape-open')) closeSidebar();
    else openSidebar();
  });

  backdrop?.addEventListener('click', closeSidebar);

  // On orientation change — close drawer, reset
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      if (!isLandscapeMobile()) {
        closeSidebar();
        fab.style.display = 'none';
      }
    }, 100);
  });

  // Show/hide FAB based on orientation
  function updateFAB() {
    fab.style.display = isLandscapeMobile() ? 'flex' : 'none';
    if (!isLandscapeMobile()) closeSidebar();
  }
  updateFAB();
  window.addEventListener('resize', updateFAB);
}

// ── MODALS ────────────────────────────────────────────
export function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('open'); setTimeout(() => m.querySelector('input,textarea')?.focus(), 100); }
}
export function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

export function initModalBackdrops() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
}

// ── CONFETTI ──────────────────────────────────────────
export function spawnConfetti() {
  const wrap = document.getElementById('confettiWrap');
  if (!wrap) return;
  const colors = ['#6d28d9','#f59e0b','#ec4899','#22c55e','#3b82f6','#f97316','#a855f7'];
  for (let i = 0; i < 50; i++) {
    const c = document.createElement('div');
    c.className = 'confetti-piece';
    c.style.cssText = `
      left:${Math.random()*100}%;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      transform:rotate(${Math.random()*360}deg);
      animation:fall ${1.2+Math.random()*1.8}s ease forwards;
      animation-delay:${Math.random()*0.6}s
    `;
    wrap.appendChild(c);
  }
  if (!document.getElementById('fallStyle')) {
    const s = document.createElement('style');
    s.id = 'fallStyle';
    s.textContent = '@keyframes fall{0%{opacity:1;transform:translateY(0) rotate(0deg)}100%{opacity:0;transform:translateY(100vh) rotate(720deg)}}';
    document.head.appendChild(s);
  }
  setTimeout(() => wrap.innerHTML = '', 3000);
}

// ── COPY TO CLIPBOARD ─────────────────────────────────
export function copyText(text) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text).then(() => showToast('Link disalin!'));
  }
  // Fallback
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('Link disalin!');
}

// ── FORMAT ────────────────────────────────────────────
export function formatRp(n) {
  return 'Rp ' + parseInt(n).toLocaleString('id-ID');
}

export function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)   return 'baru saja';
  if (s < 3600) return Math.floor(s / 60) + 'm lalu';
  return Math.floor(s / 3600) + 'j lalu';
}

export function escHTML(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export function avatarColor(name) {
  const palette = ['#6d28d9','#7c3aed','#db2777','#2563eb','#0891b2','#059669','#d97706'];
  const idx = (name || '').split('').reduce((a,c) => a + c.charCodeAt(0), 0) % palette.length;
  return palette[idx];
}
