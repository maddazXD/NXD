// js/donate.js — Fixed: konfirmasi bayar dulu, notif antrian, tidak bisa kirim tanpa konfirmasi

import { db } from './firebase.js';
import { ref, push, onValue, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { escHTML, formatRp, showToast, spawnConfetti } from './ui.js';
import { icons } from './icons.js';

let lastDonateTs = 0;

// ── ANTRIAN NOTIF DONATE ──────────────────────────────
// Notif akan mengantri — baru tampil setelah yang sebelumnya selesai
const donateQueue = [];
let isShowingDonate = false;

function enqueueDonateNotif(d) {
  donateQueue.push(d);
  processQueue();
}

function processQueue() {
  if (isShowingDonate || donateQueue.length === 0) return;
  isShowingDonate = true;
  const d = donateQueue.shift();
  showDonateInSidebar(d, () => {
    isShowingDonate = false;
    processQueue(); // proses berikutnya setelah 3 detik
  });
}

// ── INIT ──────────────────────────────────────────────
export function initDonate() {
  setupAmountChips();
  setupDonateForm();
  listenDonateNotif();
}

// ── AMOUNT CHIPS ──────────────────────────────────────
let selectedAmount = 0;

function setupAmountChips() {
  const chips = document.querySelectorAll('.amount-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      const val = parseInt(chip.dataset.amount || '0');
      selectedAmount = val;
      const input = document.getElementById('donateAmountInput');
      if (!input) return;
      if (val > 0) {
        input.value = val;
        input.readOnly = true;
      } else {
        input.value = '';
        input.readOnly = false;
        input.focus();
      }
    });
  });
}

// ── DONATE FORM ───────────────────────────────────────
function setupDonateForm() {
  const btn = document.getElementById('donateSubmitBtn');
  if (!btn) return;
  btn.addEventListener('click', handleDonateSubmit);
}

async function handleDonateSubmit() {
  const nameInput   = document.getElementById('donateNameInput');
  const amountInput = document.getElementById('donateAmountInput');
  const noteInput   = document.getElementById('donateNoteInput');
  const btn         = document.getElementById('donateSubmitBtn');

  const name   = nameInput?.value.trim() || 'Anonim';
  const amount = parseInt(amountInput?.value) || selectedAmount;
  const note   = noteInput?.value.trim() || '';

  if (!amount || amount < 1000) {
    showToast('Nominal minimal Rp 1.000');
    amountInput?.focus();
    return;
  }

  // ── WAJIB konfirmasi sudah transfer dulu ──────────────
  const confirmed = await showDonateConfirmModal(name, amount);
  if (!confirmed) return;

  btn.disabled = true;
  btn.textContent = 'Mengirim...';

  try {
    const payload = {
      type:   'donate_notif',
      name,
      amount,
      note,
      ts:     Date.now(),
    };

    await push(ref(db, 'chat/messages'), payload);
    await set(ref(db, 'stream/lastDonate'), payload);

    // Reset form
    if (nameInput)   nameInput.value   = '';
    if (amountInput) { amountInput.value = ''; amountInput.readOnly = false; }
    if (noteInput)   noteInput.value   = '';
    document.querySelectorAll('.amount-chip').forEach(c => c.classList.remove('selected'));
    selectedAmount = 0;

    showToast('Donasi terkirim! 🎉');

    const chatTab = document.querySelector('.s-tab[data-tab="chat"]');
    chatTab?.click();

  } catch (err) {
    console.error(err);
    showToast('Gagal mengirim. Coba lagi.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${icons.donate || '💰'} Kirim Donasi`;
  }
}

// ── MODAL KONFIRMASI SUDAH TRANSFER ───────────────────
function showDonateConfirmModal(name, amount) {
  return new Promise(resolve => {
    // Hapus modal lama kalau ada
    document.getElementById('donateConfirmModal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'donateConfirmModal';
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9000;
      display:flex;align-items:center;justify-content:center;padding:20px;
    `;
    modal.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;max-width:340px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.5)">
        <div style="font-size:32px;text-align:center;margin-bottom:12px">💸</div>
        <h3 style="font-family:'Outfit',sans-serif;font-size:18px;font-weight:700;text-align:center;margin-bottom:8px">Konfirmasi Transfer</h3>
        <p style="font-size:13px;color:var(--text-2);text-align:center;line-height:1.6;margin-bottom:16px">
          Pastikan kamu sudah transfer<br>
          <b style="font-size:18px;color:var(--gold)">${formatRp(amount)}</b><br>
          atas nama <b>${escHTML(name)}</b><br>
          ke rekening host sebelum melanjutkan.
        </p>
        <div style="background:var(--bg-2);border:1px solid rgba(245,158,11,.2);border-radius:10px;padding:10px 14px;font-size:12px;color:var(--text-2);margin-bottom:18px;line-height:1.6">
          ⚠️ Namamu hanya akan tampil ke semua penonton jika transfermu sudah masuk. Jangan klik "Sudah Transfer" kalau belum benar-benar transfer.
        </div>
        <div style="display:flex;gap:10px">
          <button id="dcBatal" style="flex:1;padding:11px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:13px;font-weight:600;cursor:pointer">
            Belum, Batal
          </button>
          <button id="dcKonfirm" style="flex:1;padding:11px;background:var(--gold);border:1px solid var(--gold);border-radius:10px;color:#000;font-size:13px;font-weight:700;cursor:pointer">
            ✓ Sudah Transfer
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('dcKonfirm').addEventListener('click', () => {
      modal.remove();
      resolve(true);
    });
    document.getElementById('dcBatal').addEventListener('click', () => {
      modal.remove();
      resolve(false);
    });
    // Klik backdrop juga batalkan
    modal.addEventListener('click', e => {
      if (e.target === modal) { modal.remove(); resolve(false); }
    });
  });
}

// ── DONATE NOTIF LISTENER ─────────────────────────────
function listenDonateNotif() {
  lastDonateTs = Date.now();

  onValue(ref(db, 'stream/lastDonate'), snap => {
    const d = snap.val();
    if (!d || !d.ts) return;
    if (d.ts <= lastDonateTs) return;
    lastDonateTs = d.ts;

    // Masukkan ke antrian, bukan langsung tampil
    enqueueDonateNotif(d);
    spawnConfetti();
  });
}

// ── NOTIF DI SIDEBAR (dengan antrian) ────────────────
function showDonateInSidebar(d, onDone) {
  const banner = document.getElementById('donateSidebarBanner');
  if (!banner) { onDone(); return; }

  // Hapus timer lama
  if (banner._hideTimer) clearTimeout(banner._hideTimer);

  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:36px;height:36px;border-radius:50%;background:var(--gold-soft);border:1px solid rgba(245,158,11,.3);display:flex;align-items:center;justify-content:center;color:var(--gold);flex-shrink:0;font-size:16px">
        ⭐
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-family:'Outfit',sans-serif;font-size:16px;font-weight:800;color:var(--gold)">${formatRp(d.amount)}</div>
        <div style="font-size:12px;color:var(--text-2)">dari <b style="color:var(--text)">${escHTML(d.name)}</b></div>
      </div>
    </div>
    ${d.note ? `<div style="font-size:13px;color:var(--text-2);margin-top:8px;padding-left:46px;font-style:italic">"${escHTML(d.note)}"</div>` : ''}
  `;

  banner.style.cssText = `
    background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(109,40,217,.1));
    border:1px solid rgba(245,158,11,.4);
    border-radius:12px;padding:12px 14px;margin:8px 12px 0;
    animation:msgIn .3s ease;
  `;
  banner.classList.remove('hidden');

  // Tampil 3 detik lalu hilang, baru panggil onDone
  banner._hideTimer = setTimeout(() => {
    banner.style.animation = 'fadeOut .3s ease forwards';
    setTimeout(() => {
      banner.innerHTML = '';
      banner.style.cssText = '';
      banner.classList.add('hidden');
      onDone(); // ← proses antrian berikutnya
    }, 300);
  }, 3000);
}
