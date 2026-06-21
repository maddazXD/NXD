// js/chat.js
// Realtime chat — only for approved users

import { db } from './firebase.js';
import { ref, push, onValue, limitToLast, query } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { escHTML, timeAgo, avatarColor, showToast } from './ui.js';
import { icons } from './icons.js';
// getIsHost removed — cek dari session saja

let userName = '';
let unreadCount = 0;
let sidebarVisible = true;

export function initChat(name) {
  userName = name;
  renderChatIcons();
  setupChatInput();
  listenMessages();
  setupNameTag();
}

function renderChatIcons() {
  const el = document.getElementById('chatSendIcon');
  if (el) el.innerHTML = icons.send;
  const nameTagIcon = document.getElementById('nameTagIcon');
  if (nameTagIcon) nameTagIcon.innerHTML = icons.edit;
}

function setupNameTag() {
  const tag = document.getElementById('chatNameTag');
  if (!tag) return;
  tag.querySelector('span').textContent = userName;
  tag.addEventListener('click', () => {
    const overlay = document.getElementById('nameModal');
    if (overlay) overlay.classList.add('open');
    setTimeout(() => document.getElementById('newNameInput')?.focus(), 100);
  });
}

function setupChatInput() {
  const textarea = document.getElementById('chatInput');
  const btn = document.getElementById('chatSendBtn');
  if (!textarea) return;

  textarea.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 80) + 'px';
  });

  btn?.addEventListener('click', sendMessage);
}

export function sendMessage() {
  const textarea = document.getElementById('chatInput');
  const text = textarea?.value.trim();
  if (!text) return;

  push(ref(db, 'chat/messages'), {
    type: 'chat',
    name: userName,
    text,
    ts: Date.now(),
    isHost: false, // host kirim dari dashboard, bukan dari watch.html
  });

  textarea.value = '';
  textarea.style.height = 'auto';
}

export function sendSystemMsg(text) {
  push(ref(db, 'chat/messages'), {
    type: 'system',
    text,
    ts: Date.now(),
  });
}

function listenMessages() {
  const area = document.getElementById('chatMessages');
  if (!area) return;

  const q = query(ref(db, 'chat/messages'), limitToLast(150));
  onValue(q, snap => {
    const data = snap.val() || {};
    const msgs = Object.values(data).sort((a,b) => a.ts - b.ts);
    const wasAtBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 80;

    // Render only new messages (avoid full redraw flicker)
    const existingCount = area.querySelectorAll('[data-ts]').length;
    const newMsgs = msgs.slice(existingCount);

    newMsgs.forEach(m => {
      const el = renderMessage(m);
      if (el) {
        area.appendChild(el);
        // Unread FAB badge for landscape
        const sidebar = document.getElementById('chatCol');
        if (sidebar) {
          unreadCount++;
          const badge = document.getElementById('fabBadge');
          if (badge && unreadCount > 0) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.classList.add('show');
          }
        }
      }
    });

    if (wasAtBottom || newMsgs.length === msgs.length) {
      area.scrollTop = area.scrollHeight;
    }
  });
}

function renderMessage(m) {
  if (m.type === 'system') {
    const el = document.createElement('div');
    el.className = 'sys-msg';
    el.setAttribute('data-ts', m.ts);
    el.textContent = m.text;
    return el;
  }

  if (m.type === 'donate_notif') {
    return renderDonateAlert(m);
  }

  if (m.type === 'reaction') {
    const el = document.createElement('div');
    el.className = 'reaction-msg';
    el.setAttribute('data-ts', m.ts);
    el.textContent = m.emoji;
    return el;
  }

  if (m.type !== 'chat') return null;

  const el = document.createElement('div');
  el.className = 'chat-msg';
  el.setAttribute('data-ts', m.ts);

  const color = avatarColor(m.name || 'A');
  const initials = (m.name || 'A')[0].toUpperCase();

  el.innerHTML = `
    <div class="avatar" style="background:${color};width:30px;height:30px;font-size:11px">${initials}</div>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="msg-name${m.isHost ? ' is-host' : ''}">${escHTML(m.name || 'Anon')}</span>
        ${m.isHost ? `<span class="msg-host-badge">HOST</span>` : ''}
        <span class="msg-time">${timeAgo(m.ts)}</span>
      </div>
      <div class="msg-text">${escHTML(m.text)}</div>
    </div>
  `;
  return el;
}

function renderDonateAlert(m) {
  const el = document.createElement('div');
  el.className = 'donate-alert';
  el.setAttribute('data-ts', m.ts);
  el.innerHTML = `
    <div class="donate-alert-top">
      <div class="donate-alert-icon">${icons.donate}</div>
      <div>
        <div class="donate-alert-amount">${formatRp(m.amount)}</div>
        <div class="donate-alert-from">dari <b>${escHTML(m.name)}</b></div>
      </div>
    </div>
    ${m.note ? `<div class="donate-alert-note">"${escHTML(m.note)}"</div>` : ''}
  `;
  return el;
}

function formatRp(n) {
  return 'Rp ' + parseInt(n).toLocaleString('id-ID');
}

export function updateUserName(name) {
  userName = name;
  const tag = document.querySelector('#chatNameTag span');
  if (tag) tag.textContent = name;
}

export function resetUnread() {
  unreadCount = 0;
  const badge = document.getElementById('fabBadge');
  if (badge) badge.classList.remove('show');
}
