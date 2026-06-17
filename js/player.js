// js/player.js
// Video sync: host controls, viewer sync, like

import { db } from './firebase.js';
import { ref, set, get, onValue, push, onDisconnect } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { showToast } from './ui.js';
import { icons } from './icons.js';

const HOST_PASSWORD = 'HOST_PASS_GANTI_INI'; // GANTI password host

let isHost = false;
let likeCount = 0;
let hasLiked = localStorage.getItem('nobar_liked') === '1';

export function initPlayer() {
  renderPlayerIcons();
  setupLikeBtn();
  setupShareBtn();
  listenVideoState();
  listenLikes();
  listenViewers();
}

// ── ICONS ────────────────────────────────────────────
function renderPlayerIcons() {
  const el = id => document.getElementById(id);

  if (el('iconLike'))   el('iconLike').innerHTML   = hasLiked ? icons.heartFill : icons.heart;
  if (el('iconShare'))  el('iconShare').innerHTML   = icons.share;
  if (el('iconVideo'))  el('iconVideo').innerHTML   = icons.video;
  if (el('iconViewers'))el('iconViewers').innerHTML = icons.users;

  if (el('ctrlPlayIcon'))  el('ctrlPlayIcon').innerHTML  = icons.play;
  if (el('ctrlPauseIcon')) el('ctrlPauseIcon').innerHTML = icons.pause;
  if (el('ctrlStopIcon'))  el('ctrlStopIcon').innerHTML  = icons.stop;
  if (el('ctrlSyncIcon'))  el('ctrlSyncIcon').innerHTML  = icons.clock;
  if (el('ctrlBankIcon'))  el('ctrlBankIcon').innerHTML  = icons.creditCard;
  if (el('ctrlUserIcon'))  el('ctrlUserIcon').innerHTML  = icons.users;
}

// ── HOST LOGIN ────────────────────────────────────────
export function verifyHost(password) {
  if (password === HOST_PASSWORD) {
    isHost = true;
    document.getElementById('hostControls')?.classList.add('visible');
    showToast('Mode Host aktif');
    return true;
  }
  return false;
}

export function getIsHost() { return isHost; }

// ── VIDEO STATE LISTENER ──────────────────────────────
function listenVideoState() {
  const vid = document.getElementById('videoPlayer');
  const placeholder = document.getElementById('videoPlaceholder');
  if (!vid) return;

  onValue(ref(db, 'stream/video'), snap => {
    const data = snap.val() || {};

    if (data.url) {
      vid.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';

      if (vid.src !== data.url) {
        vid.src = data.url;
        vid.load();
      }

      if (data.state === 'play') {
        // Sync time within tolerance
        if (Math.abs(vid.currentTime - (data.seekTo || 0)) > 3) {
          vid.currentTime = data.seekTo || 0;
        }
        vid.play().catch(() => {});
      }
      if (data.state === 'pause') {
        vid.pause();
      }
    } else {
      vid.style.display = 'none';
      if (placeholder) placeholder.style.display = 'flex';
    }

    // Title
    const titleEl = document.getElementById('movieTitleDisplay');
    if (titleEl) titleEl.textContent = data.title || 'Belum ada film';
    const topTitle = document.getElementById('topbarTitle');
    if (topTitle) topTitle.textContent = data.title || 'NobarXD';
  });
}

// ── HOST ACTIONS ──────────────────────────────────────
export function hostLoadVideo() {
  const url = document.getElementById('videoUrl')?.value.trim();
  if (!url) return showToast('URL video tidak boleh kosong');
  set(ref(db, 'stream/video/url'), url);
  set(ref(db, 'stream/video/state'), 'pause');
  showToast('Video dimuat!');
}

export function hostSetTitle() {
  const t = document.getElementById('videoTitle')?.value.trim();
  if (!t) return;
  set(ref(db, 'stream/video/title'), t);
  showToast('Judul diset: ' + t);
}

export function hostPlay() {
  const vid = document.getElementById('videoPlayer');
  if (!vid) return;
  set(ref(db, 'stream/video/state'), 'play');
  set(ref(db, 'stream/video/seekTo'), vid.currentTime);
  vid.play().catch(() => {});
}

export function hostPause() {
  const vid = document.getElementById('videoPlayer');
  if (!vid) return;
  vid.pause();
  set(ref(db, 'stream/video/state'), 'pause');
}

export function hostSync() {
  const vid = document.getElementById('videoPlayer');
  if (!vid) return;
  set(ref(db, 'stream/video/seekTo'), vid.currentTime);
  showToast('Waktu disinkronkan ke semua viewer');
}

export function hostStop() {
  set(ref(db, 'stream/video'), { url: null, state: 'stop', title: '' });
  const vid = document.getElementById('videoPlayer');
  if (vid) { vid.pause(); vid.src = ''; vid.style.display = 'none'; }
  const ph = document.getElementById('videoPlaceholder');
  if (ph) ph.style.display = 'flex';
  showToast('Stream dihentikan');
}

export function hostSaveBankInfo(text) {
  set(ref(db, 'stream/bankInfo'), text);
  showToast('Info rekening disimpan');
}

// ── LIKES ────────────────────────────────────────────
function listenLikes() {
  onValue(ref(db, 'stream/likes'), snap => {
    likeCount = snap.val() || 0;
    const el = document.getElementById('likeCount');
    if (el) el.textContent = likeCount;
  });
}

function setupLikeBtn() {
  const btn = document.getElementById('likeBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (hasLiked) {
      hasLiked = false;
      localStorage.removeItem('nobar_liked');
      btn.classList.remove('liked');
      document.getElementById('iconLike').innerHTML = icons.heart;
      set(ref(db, 'stream/likes'), Math.max(0, likeCount - 1));
    } else {
      hasLiked = true;
      localStorage.setItem('nobar_liked', '1');
      btn.classList.add('liked');
      document.getElementById('iconLike').innerHTML = icons.heartFill;
      set(ref(db, 'stream/likes'), likeCount + 1);
      spawnFloatHeart();
    }
  });
}

function spawnFloatHeart() {
  const h = document.createElement('div');
  h.innerHTML = icons.heart;
  h.style.cssText = `
    position:fixed; bottom:70px; right:24px;
    color:var(--red); pointer-events:none; z-index:300;
    animation: floatH 1s ease forwards;
  `;
  document.body.appendChild(h);
  if (!document.getElementById('floatHStyle')) {
    const s = document.createElement('style');
    s.id = 'floatHStyle';
    s.textContent = '@keyframes floatH{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-70px) scale(1.5)}}';
    document.head.appendChild(s);
  }
  setTimeout(() => h.remove(), 1000);
}

// ── SHARE ─────────────────────────────────────────────
function setupShareBtn() {
  const btn = document.getElementById('shareBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const overlay = document.getElementById('shareModal');
    if (overlay) {
      document.getElementById('shareUrlInput').value = location.href;
      overlay.classList.add('open');
    }
  });
}

// ── VIEWERS ───────────────────────────────────────────
export function trackViewer() {
  // Buat node koneksi unik untuk setiap perangkat yang masuk
  const myConnRef = push(ref(db, 'stream/activeViewers'));
  // Firebase server akan otomatis menghapus node ini jika user offline/keluar
  onDisconnect(myConnRef).remove();
  // Set status online
  set(myConnRef, true);
}

function listenViewers() {
  onValue(ref(db, 'stream/activeViewers'), snap => {
    // Hitung jumlah ID unik yang sedang online
    const count = snap.exists() ? Object.keys(snap.val()).length : 0;
    const el = document.getElementById('viewerCount');
    if (el) el.textContent = count;
  });

  // Bank info + QRIS for donate panel
  onValue(ref(db, 'stream/payment'), snap => {
    const data  = snap.val() || {};
    const text  = data.bankInfo  || '';
    const qris  = data.qrisImage || null;
    const el    = document.getElementById('bankInfoDisplay');
    if (!el) return;

    let html = '';
    if (qris) {
      html += `<div style="text-align:center;margin-bottom:10px">
        <div style="font-size:10px;color:var(--text-2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;font-weight:600">QRIS</div>
        <img src="${qris}" alt="QRIS" style="width:160px;height:160px;object-fit:contain;border-radius:8px;border:1px solid var(--border);background:#fff;padding:6px">
      </div>`;
    }
    if (text) {
      if (qris) html += `<div style="height:1px;background:var(--border);margin:10px 0"></div>`;
      html += text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
    }
    el.innerHTML = html || 'Belum diisi oleh host.';
  });
}

// ── HAPUS SEMUA TIKET (dipanggil saat acara berakhir) ─
async function purgeAllTickets() {
  try {
    const [usersSnap, uidsSnap, pendingSnap] = await Promise.all([
      get(ref(db, 'users')),
      get(ref(db, 'uids')),
      get(ref(db, 'pending')),
    ]);
    const writes = [];
    if (usersSnap.exists())  Object.keys(usersSnap.val()).forEach(k  => writes.push(set(ref(db, `users/${k}`),   null)));
    if (uidsSnap.exists())   Object.keys(uidsSnap.val()).forEach(k   => writes.push(set(ref(db, `uids/${k}`),    null)));
    if (pendingSnap.exists()) Object.keys(pendingSnap.val()).forEach(k => writes.push(set(ref(db, `pending/${k}`), null)));
    await Promise.all(writes);
    await set(ref(db, 'stream/acara'), {
      active: false, startedAt: null, expiresAt: null,
      durasiMenit: null, lastEndedAt: Date.now(),
    });
  } catch (e) { console.error('purgeAllTickets error:', e); }
}

// ── ACARA SESSION WATCHER (di watch.html) ────────────
export function watchAcaraSession(onExpired) {
  let timerInterval = null;
  let expired = false;

  onValue(ref(db, 'stream/acara'), snap => {
    const acara = snap.val();
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    if (!acara || !acara.active || !acara.expiresAt) {
      if (!expired) {
        expired = true;
        onExpired('Acara telah berakhir atau dihentikan oleh host.');
      }
      return;
    }

    if (Date.now() > acara.expiresAt) {
      if (!expired) {
        expired = true;
        onExpired('Waktu acara telah habis.');
      }
      return;
    }

    expired = false;

    function tick() {
      const sisa = acara.expiresAt - Date.now();
      const el = document.getElementById('acaraCountdown');
      if (sisa <= 0) {
        clearInterval(timerInterval);
        if (el) el.textContent = '00:00:00';
        if (!expired) {
          expired = true;
          // Hapus semua tiket saat waktu habis (countdown sisi client)
          onExpired('Waktu acara telah habis. Beli tiket baru untuk acara berikutnya.');
        }
        return;
      }
      if (el) {
        const h = Math.floor(sisa / 3600000);
        const m = Math.floor((sisa % 3600000) / 60000);
        const s = Math.floor((sisa % 60000) / 1000);
        el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        el.style.color = sisa < 10 * 60 * 1000 ? 'var(--red)' : 'inherit';
      }
    }
    tick();
    timerInterval = setInterval(tick, 1000);
  });
}
