// js/auth.js
// Sistem login pakai UID khusus (nobarpildun000001aaaa)
// Daftar = bayar + upload bukti → host approve → sistem generate UID
import { db } from './firebase.js';
import {
  ref, set, get, push, onValue, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { icons } from './icons.js';
import { showToast } from './ui.js';

// ── SESSION ──────────────────────────────────────────
const SESSION_KEY = 'nobar_session';

export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}
export function saveSession(data) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ── GENERATE UID ─────────────────────────────────────
// Format: nobarpildun + 6 digit angka acak + 4 huruf acak
// Contoh: nobarpildun382710kxwp
function generateUID() {
  const digits = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  const chars  = 'abcdefghijklmnopqrstuvwxyz';
  const letters = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return 'nobarpildun' + digits + letters;
}

async function generateUniqueUID() {
  let uid, exists = true;
  while (exists) {
    uid = generateUID();
    const snap = await get(ref(db, `uids/${uid}`));
    exists = snap.exists();
  }
  return uid;
}

// ── GATE PAGE CONTROLLER ──────────────────────────────
export function initGatePage() {
  const session = getSession();
  if (session) {
    checkAccessAndRedirect(session.accessUID);
    return;
  }

  // Setup tabs
  document.getElementById('tabLogin').addEventListener('click', () => switchGateTab('login'));
  document.getElementById('tabRegister').addEventListener('click', () => switchGateTab('register'));

  // Forms
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('registerForm').addEventListener('submit', handleRegister);

  // Proof upload preview
  const proofInput = document.getElementById('proofFile');
  if (proofInput) {
    proofInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const img = document.getElementById('proofPreview');
        const placeholder = document.getElementById('proofPlaceholder');
        const previewWrap = document.getElementById('proofPreviewWrap');
        if (img) img.src = ev.target.result;
        if (placeholder) placeholder.classList.add('hidden');
        if (previewWrap) previewWrap.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    });
  }
}

function switchGateTab(tab) {
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('loginSection').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerSection').classList.toggle('hidden', tab !== 'register');
}

// ── REGISTER ─────────────────────────────────────────
const WA_HOST = '6281915483630';

async function handleRegister(e) {
  e.preventDefault();
  const name      = document.getElementById('regName').value.trim();
  const submitBtn = document.getElementById('regSubmitBtn');

  clearErrors();
  if (!name) { showError('regNameErr', 'Nama tidak boleh kosong'); return; }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg> Mendaftarkan...';

  try {
    // Buat pendingKey dulu
    const pendingKey = 'reg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

    await set(ref(db, `pending/${pendingKey}`), {
      pendingKey,
      name,
      status: 'pending',
      createdAt: Date.now(),
    });

    // Simpan sesi sementara
    saveSession({ pendingKey, name, waitingApproval: true });

    // Buka WhatsApp dengan pesan otomatis
    const pesan = encodeURIComponent(
      `Halo, saya ingin daftar NobarXD!\n\n` +
      `Nama: ${name}\n` +
      `Kode Daftar: ${pendingKey}\n\n` +
      `Berikut saya lampirkan bukti transfer. Mohon dikonfirmasi ya! 🙏`
    );
    window.open(`https://wa.me/${WA_HOST}?text=${pesan}`, '_blank');

    // Tampil layar tunggu
    showWaitingScreen(pendingKey);
    startStatusListenerPending(pendingKey);

  } catch (err) {
    console.error(err);
    showToast('Terjadi kesalahan. Coba lagi.');
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> Daftar & Kirim Bukti ke WA`;
  }
}

// ── LOGIN DENGAN UID ──────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const uidInput  = document.getElementById('loginUID').value.trim().toLowerCase();
  const submitBtn = document.getElementById('loginSubmitBtn');

  clearErrors();

  if (!uidInput) { showError('loginUIDErr', 'Masukkan kode akses kamu'); return; }
  if (!uidInput.startsWith('nobarpildun')) {
    showError('loginUIDErr', 'Format kode akses tidak valid');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Memeriksa...';

  try {
    // Cek di index UID
    const uidSnap = await get(ref(db, `uids/${uidInput}`));
    if (!uidSnap.exists()) {
      showError('loginUIDErr', 'Kode akses tidak valid atau sudah kadaluwarsa. Beli tiket baru untuk acara berikutnya.');
      submitBtn.disabled = false; submitBtn.textContent = 'Masuk & Nonton';
      return;
    }

    const userRef = uidSnap.val(); // berisi userKey
    const userSnap = await get(ref(db, `users/${userRef}`));
    const user = userSnap.val();

    if (!user) {
      showError('loginUIDErr', 'Data akun tidak ditemukan');
      submitBtn.disabled = false; submitBtn.textContent = 'Masuk & Nonton';
      return;
    }

    if (user.status !== 'approved') {
      showError('loginUIDErr', 'Akun ini belum disetujui atau sudah ditolak host');
      submitBtn.disabled = false; submitBtn.textContent = 'Masuk & Nonton';
      return;
    }

    // Login berhasil
    saveSession({ accessUID: uidInput, userKey: userRef, name: user.name });
    window.location.href = 'watch.html';

  } catch (err) {
    console.error(err);
    showToast('Terjadi kesalahan. Coba lagi.');
    submitBtn.disabled = false; submitBtn.textContent = 'Masuk & Nonton';
  }
}

// ── STATUS CHECK (saat sudah ada sesi) ───────────────
async function checkAccessAndRedirect(accessUID) {
  if (!accessUID) { clearSession(); location.reload(); return; }

  const uidSnap = await get(ref(db, `uids/${accessUID}`));
  if (!uidSnap.exists()) { clearSession(); location.reload(); return; }

  const userKey  = uidSnap.val();
  const userSnap = await get(ref(db, `users/${userKey}`));
  const user = userSnap.val();

  if (!user) { clearSession(); location.reload(); return; }
  if (user.status !== 'approved') {
    clearSession();
    showError('loginUIDErr', 'Akun ditolak atau belum disetujui host.');
    return;
  }

  // Cek apakah sesi acara sedang aktif
  const acaraSnap = await get(ref(db, 'stream/acara'));
  const acara = acaraSnap.val();
  if (!acara || !acara.active || !acara.expiresAt || Date.now() > acara.expiresAt) {
    showError('loginUIDErr', 'Belum ada acara yang aktif saat ini. Tunggu host memulai acara.');
    return;
  }

  window.location.href = 'watch.html';
}

// Listener untuk pendaftar yang masih menunggu approval
function startStatusListenerPending(pendingKey) {
  onValue(ref(db, `pending/${pendingKey}/status`), snap => {
    const status = snap.val();
    if (status === 'approved') {
      // Host sudah approve dan sistem assign UID — ambil accessUID
      get(ref(db, `pending/${pendingKey}/accessUID`)).then(s => {
        const uid = s.val();
        if (uid) {
          get(ref(db, `uids/${uid}`)).then(us => {
            const userKey = us.val();
            get(ref(db, `users/${userKey}/name`)).then(ns => {
              saveSession({ accessUID: uid, userKey, name: ns.val() });
              showUIDRevealScreen(uid);
            });
          });
        }
      });
    } else if (status === 'rejected') {
      clearSession();
      showToast('Pembayaran ditolak host. Silakan coba lagi atau hubungi host.');
      location.reload();
    }
  });
}

// ── WAITING SCREEN ────────────────────────────────────
function showWaitingScreen(pendingKey) {
  const card = document.querySelector('.gate-card');
  if (!card) return;

  // Ambil nama dari sesi
  const sesi = getSession();
  const nama = sesi?.name || '';

  // Buat ulang link WA
  const pesan = encodeURIComponent(
    `Halo, saya ingin daftar NobarXD!\n\n` +
    `Nama: ${nama}\n` +
    `Kode Daftar: ${pendingKey}\n\n` +
    `Berikut saya lampirkan bukti transfer. Mohon dikonfirmasi ya! 🙏`
  );
  const waLink = `https://wa.me/${WA_HOST}?text=${pesan}`;

  card.innerHTML = `
    <div class="gate-waiting">
      <div style="font-size:48px">📱</div>
      <div class="waiting-title">Kirim Bukti Transfer via WA</div>
      <div class="waiting-sub">
        WhatsApp sudah terbuka dengan pesan otomatis.<br>
        <b>Lampirkan foto bukti transfer</b> lalu kirim ke host.<br><br>
        Setelah host konfirmasi, <b>Kode Akses kamu akan muncul di sini otomatis.</b>
      </div>

      <a href="${waLink}" target="_blank"
        style="display:inline-flex;align-items:center;gap:8px;background:#25d366;color:#fff;border:none;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;text-decoration:none;margin-top:4px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Buka WhatsApp
      </a>

      <div style="display:flex;align-items:center;gap:8px;margin-top:12px">
        <div class="waiting-spinner" style="width:20px;height:20px;border-width:2px"></div>
        <span style="font-size:13px;color:var(--text-2)">Menunggu konfirmasi host...</span>
      </div>
    </div>
  `;
}

// ── LAYAR TAMPIL UID SETELAH APPROVE ─────────────────
function showUIDRevealScreen(uid) {
  const card = document.querySelector('.gate-card');
  if (!card) return;
  card.innerHTML = `
    <div class="gate-waiting" style="gap:14px">
      <div style="font-size:40px">🎉</div>
      <div class="waiting-title" style="color:var(--green)">Pembayaran Disetujui!</div>
      <div class="waiting-sub">
        Ini adalah <b>Kode Akses</b> unik milik kamu.<br>
        Simpan dan jangan bagikan ke orang lain!
      </div>

      <div style="background:var(--bg-2);border:1.5px solid var(--gold);border-radius:12px;padding:16px 18px;width:100%;box-sizing:border-box">
        <div style="font-size:11px;color:var(--text-2);margin-bottom:6px;letter-spacing:.04em;text-transform:uppercase">Kode Akses Kamu</div>
        <div id="uidDisplay" style="font-family:monospace;font-size:16px;font-weight:700;color:var(--gold);word-break:break-all;letter-spacing:.06em">${escHTML(uid)}</div>
      </div>

      <button id="copyUIDBtn" class="btn btn-gold w-full" style="margin-top:4px">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Salin Kode Akses
      </button>

      <button id="enterWatchBtn" class="btn btn-primary w-full">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>
        Masuk & Nonton Sekarang
      </button>

      <div style="font-size:11px;color:var(--text-2);text-align:center;margin-top:4px">
        ⚠️ Screenshot atau catat kode ini. Kamu butuhkan untuk login berikutnya.
      </div>
    </div>
  `;

  document.getElementById('copyUIDBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(uid).then(() => {
      showToast('Kode akses tersalin!');
      document.getElementById('copyUIDBtn').textContent = '✓ Tersalin!';
    }).catch(() => showToast('Gagal menyalin. Salin manual: ' + uid));
  });

  document.getElementById('enterWatchBtn').addEventListener('click', () => {
    window.location.href = 'watch.html';
  });
}

// ── ADMIN / HOST: Approve/Reject di watch.html ────────
export async function loadPendingUsers(containerId) {
  onValue(ref(db, 'pending'), snap => {
    const pending_all = snap.val() || {};
    const pendingList = Object.values(pending_all).filter(u => u.status === 'pending');

    onValue(ref(db, 'users'), snap2 => {
      const users = snap2.val() || {};
      const approvedList = Object.values(users).filter(u => u.status === 'approved');
      const el = document.getElementById(containerId);
      if (!el) return;

      el.innerHTML = `
        <div style="font-size:12px;color:var(--text-2);margin-bottom:10px">
          ${icons.users} Menunggu: <b style="color:var(--gold)">${pendingList.length}</b> &nbsp;|&nbsp; Disetujui: <b style="color:var(--green)">${approvedList.length}</b>
        </div>
      `;

      if (pendingList.length === 0) {
        el.innerHTML += `<div class="sys-msg" style="padding:12px 0">Tidak ada pendaftar baru.</div>`;
        return;
      }

      pendingList.forEach(u => {
        const row = document.createElement('div');
        row.style.cssText = 'background:var(--bg-2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px';
        row.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div class="avatar" style="background:var(--accent);width:28px;height:28px;font-size:11px">${u.name[0].toUpperCase()}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:13px">${escHTML(u.name)}</div>
              <div style="font-size:11px;color:var(--text-2)">Belum punya kode akses</div>
            </div>
            <span class="status-badge status-pending">Pending</span>
          </div>
          <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:6px;padding:7px 10px;margin-bottom:8px;font-size:11px;color:var(--text-2)">
            📱 Bukti dikirim via WhatsApp · Kode: <b style="font-family:monospace;color:var(--text)">${u.pendingKey}</b>
          </div>
          <div style="display:flex;gap:6px">
            <button onclick="approveUser('${u.pendingKey}')" class="btn btn-sm" style="background:var(--green-soft);border-color:rgba(34,197,94,.3);color:var(--green);flex:1">
              ${icons.check} Setujui
            </button>
            <button onclick="rejectUser('${u.pendingKey}')" class="btn btn-sm btn-danger" style="flex:1">
              ${icons.x} Tolak
            </button>
          </div>
        `;
        el.appendChild(row);
      });
    }, { onlyOnce: true });
  });
}

// Host approve: generate UID unik → simpan user → update pending
export async function approveUser(pendingKey) {
  try {
    const snap = await get(ref(db, `pending/${pendingKey}`));
    const pending = snap.val();
    if (!pending) { showToast('Data tidak ditemukan.'); return; }

    // Generate UID unik
    const accessUID = await generateUniqueUID();

    // Buat entry user resmi
    const userKey = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    await set(ref(db, `users/${userKey}`), {
      userKey,
      name: pending.name,
      accessUID,
      status: 'approved',
      createdAt: Date.now(),
      approvedAt: Date.now(),
    });

    // Daftarkan UID ke index (untuk lookup cepat saat login)
    await set(ref(db, `uids/${accessUID}`), userKey);

    // Update pending record → trigger listener di client
    await set(ref(db, `pending/${pendingKey}/status`), 'approved');
    await set(ref(db, `pending/${pendingKey}/accessUID`), accessUID);

    showToast(`User disetujui! UID: ${accessUID}`);
  } catch (err) {
    console.error(err);
    showToast('Gagal menyetujui. Coba lagi.');
  }
}

export async function rejectUser(pendingKey) {
  await set(ref(db, `pending/${pendingKey}/status`), 'rejected');
  showToast('Pendaftaran ditolak.');
}

// Expose globally untuk onclick di HTML dinamis
window.approveUser = approveUser;
window.rejectUser  = rejectUser;

// ── HELPERS ───────────────────────────────────────────
// fileToBase64 dihapus — bukti transfer via WA, tidak perlu upload

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.add('show'); }
}

function clearErrors() {
  document.querySelectorAll('.form-error').forEach(el => el.classList.remove('show'));
}

export function escHTML(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
