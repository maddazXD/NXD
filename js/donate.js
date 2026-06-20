// js/donate.js — Donasi seikhlasnya via QRIS statis, dikonfirmasi MANUAL oleh host.
//
// Alurnya:
//   1. Viewer isi nama → catatan transfer "Donasi dari [Nama]" otomatis muncul, tinggal disalin
//   2. Viewer scan QRIS yang udah ada (diatur host lewat halaman host), transfer nominal
//      seikhlasnya, tempel catatan itu di kolom Catatan/Keterangan e-wallet/m-banking
//   3. Host ngecek saldo masuk manual, lihat nama di catatan, lalu input dari halaman host
//      → ke-push ke Firebase 'donations'
//   4. Semua viewer otomatis liat nama itu muncul di ticker yang geser terus-menerus
//      di atas kolom komentar (BUKAN popup, sesuai request)
//
// Gak ada form "kirim donasi" di sisi viewer — karena konfirmasinya manual oleh host
// yang beneran ngecek saldo, bukan self-report dari viewer.

import { db } from './firebase.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { escHTML, formatRp, spawnConfetti, copyText, showToast } from './ui.js';

// ── INIT ──────────────────────────────────────────────
export function initDonate() {
  setupNotePreview();
  listenDonationTicker();
}

// ── LIVE PREVIEW CATATAN TRANSFER ─────────────────────
function setupNotePreview() {
  const nameInput  = document.getElementById('donateNameInput');
  const previewTxt = document.getElementById('donateNotePreviewText');
  const copyBtn    = document.getElementById('donateCopyNoteBtn');
  if (!nameInput || !previewTxt || !copyBtn) return;

  const storedName = localStorage.getItem('nobar_donate_name') || '';
  nameInput.value = storedName;
  updatePreview();

  function updatePreview() {
    const name = nameInput.value.trim();
    previewTxt.textContent = `Donasi dari ${name || '-'}`;
  }

  nameInput.addEventListener('input', () => {
    localStorage.setItem('nobar_donate_name', nameInput.value.trim());
    updatePreview();
  });

  copyBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) {
      showToast('Isi nama kamu dulu ya');
      nameInput.focus();
      return;
    }
    copyText(`Donasi dari ${name}`);
    showToast('Catatan tersalin! Tempel pas transfer ✨');
  });
}

// ── TICKER DONASI (geser terus-menerus, di atas kolom komentar) ──
let lastDonationCount = 0;

function listenDonationTicker() {
  onValue(ref(db, 'donations'), snap => {
    const data = snap.val() || {};
    const list = Object.values(data).sort((a, b) => (a.ts || 0) - (b.ts || 0));
    renderTicker(list);
  });
}

function renderTicker(list) {
  const ticker = document.getElementById('donateTicker');
  const track  = document.getElementById('donateTickerTrack');
  if (!ticker || !track) return;

  if (list.length === 0) {
    ticker.classList.add('hidden');
    track.innerHTML = '';
    lastDonationCount = 0;
    return;
  }

  if (list.length > lastDonationCount) {
    spawnConfetti(); // ada donasi baru masuk
  }
  lastDonationCount = list.length;

  ticker.classList.remove('hidden');

  const singleSetHTML = list.map(d => `
    <span class="w-ticker-item">🎉 <b>${escHTML(d.name)}</b> donate <b>${formatRp(d.amount)}</b></span>
    <span class="w-ticker-sep">|</span>
  `).join('');

  // Ukur dulu lebar SATU set (render sementara, gak digandakan)
  track.innerHTML = singleSetHTML;
  const containerWidth = ticker.offsetWidth || window.innerWidth;
  const singleSetWidth = track.scrollWidth || 1;

  // Kalau cuma 1-2 donasi, satu set bisa lebih SEMPIT dari lebar layar.
  // Tanpa ini, pas animasi loop bakal kelihatan celah kosong sebelum
  // nama berikutnya muncul ("delay" yang dikomplain). Jadi ulangi
  // set-nya dulu sampai lebih lebar dari container, BARU digandakan 2x.
  const repeatCount = Math.max(1, Math.ceil((containerWidth * 1.5) / singleSetWidth));
  const blockHTML = singleSetHTML.repeat(repeatCount);

  // Digandakan 2x biar animasi translateX(-50%) jadi infinite loop yang seamless
  track.innerHTML = blockHTML + blockHTML;

  requestAnimationFrame(() => {
    const oneBlockWidth = track.scrollWidth / 2;
    const duration = Math.max(oneBlockWidth / 55, 8); // ~55px/detik, minimal 8 detik
    track.style.animationDuration = duration + 's';
  });
}
