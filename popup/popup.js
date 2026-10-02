// ── ACELERERILSON Popup Script v1.1.0 ──
const MIN_SPEED = 0.1;
const MAX_SPEED = 16;


// DOM Elements
const speedSlider    = document.getElementById('speedSlider');
const speedDisplay   = document.getElementById('speedDisplay');
const speedLabel     = document.getElementById('speedLabel');

const decreaseBtn    = document.getElementById('decreaseBtn');
const increaseBtn    = document.getElementById('increaseBtn');
const resetBtn       = document.getElementById('resetBtn');
const quickBtns      = document.querySelectorAll('.quick-btn');
const statusDot      = document.getElementById('statusDot');

let currentSpeed      = 1.0;

// ─── Speed Labels & Colors ────────────────────────────────────────────────
function getSpeedLabel(speed) {
  if (speed < 0.5)   return 'Câmera lenta';
  if (speed < 1.0)   return 'Devagar';
  if (speed === 1.0) return 'Normal';
  if (speed <= 1.5)  return 'Mais rápido';
  if (speed <= 2.0)  return 'Rápido';
  if (speed <= 4.0)  return 'Muito rápido';
  if (speed <= 8.0)  return 'Turbinado';
  return 'Modo foguete';
}

function getSpeedColor(speed) {
  return '#f2f2f2';
}

// ─── UI Update ────────────────────────────────────────────────────────────
function updateUI(speed) {
  speed = Math.round(speed * 100) / 100;
  speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
  currentSpeed = speed;

  const color = getSpeedColor(speed);
  speedDisplay.textContent = (speed % 1 === 0) ? speed.toFixed(1) : speed.toString();
  speedDisplay.style.color = color;
  speedLabel.textContent   = getSpeedLabel(speed);
  speedSlider.value        = speed;
  speedSlider.style.setProperty('--progress', ((speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED) * 100) + '%');
  speedSlider.setAttribute('aria-valuetext', speed + ' vezes');
  decreaseBtn.disabled = speed <= MIN_SPEED;
  increaseBtn.disabled = speed >= MAX_SPEED;


  updateQuickBtns(speed);
}

function updateQuickBtns(speed) {
  quickBtns.forEach(btn => {
    const btnSpeed = parseFloat(btn.dataset.speed);
    const selected = Math.abs(btnSpeed - speed) < 0.001;
    btn.classList.toggle('active', selected);
    btn.setAttribute('aria-pressed', String(selected));
  });
}

// ─── Safe Messaging to Active Tab ─────────────────────────────────────────
let connection = null;
async function connectToVideos() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('Nenhuma aba disponível');
  const target = { tabId: tab.id, allFrames: true };
  const frames = await chrome.scripting.executeScript({ target, files: ['content/content.js'] });
  await chrome.scripting.insertCSS({ target, files: ['content/content.css'] });
  return { tabId: tab.id, frameIds: frames.map(frame => frame.frameId) };
}

async function sendToTab(msg, cb) {
  let response = null;
  try {
    if (!connection) connection = connectToVideos();
    const { tabId, frameIds } = await connection;
    const results = await Promise.allSettled(frameIds.map(frameId =>
      chrome.tabs.sendMessage(tabId, msg, { frameId })
    ));
    const replies = results.filter(result => result.status === 'fulfilled' && result.value).map(result => result.value);
    const successful = replies.filter(reply => reply.ok && reply.count > 0);
    response = successful[0] || replies.find(reply => reply.ok) || null;
    if (response) response = { ...response, count: successful.reduce((count, reply) => count + reply.count, 0) };
    if (!response) throw new Error('Sem conexão com a página');
  } catch (error) {
    connection = null;
    document.getElementById('connectionStatus').textContent = 'Não foi possível acessar esta página';
    if (msg.type !== 'GET_STATUS') document.getElementById('connectionStatus').textContent = 'Atualize a página ou verifique o acesso ao site.';
  }
  if (cb) cb(response);
  return response;
}

// ─── Apply Speed ──────────────────────────────────────────────────────────
function applySpeed(speed) {
  sendToTab({ type: 'SET_SPEED', speed, syncAll: true }, response => {
    if (!response) return;
    document.getElementById('connectionStatus').textContent = response.count > 0 ? 'Velocidade aplicada em ' + response.count + ' vídeo(s)' : 'Nenhum vídeo encontrado nesta página';
  });
  chrome.storage.local.set({ speed });
}

// ─── Listen for Storage Changes (e.g. changed via keyboard on page) ───────
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.speed && changes.speed.newValue !== undefined) {
      if (Math.abs(changes.speed.newValue - currentSpeed) > 0.01) {
        updateUI(changes.speed.newValue);
      }
    }

  }
});

// ─── Event Listeners ──────────────────────────────────────────────────────
speedSlider.addEventListener('input', () => {
  const speed = parseFloat(speedSlider.value);
  updateUI(speed);
  applySpeed(speed);
});

decreaseBtn.addEventListener('click', () => {
  const speed = Math.max(MIN_SPEED, Math.round((currentSpeed - 0.1) * 10) / 10);
  updateUI(speed);
  applySpeed(speed);
});

increaseBtn.addEventListener('click', () => {
  const speed = Math.min(MAX_SPEED, Math.round((currentSpeed + 0.1) * 10) / 10);
  updateUI(speed);
  applySpeed(speed);
});

resetBtn.addEventListener('click', () => {
  updateUI(1.0);
  applySpeed(1.0);
  resetBtn.style.boxShadow = 'none';
  setTimeout(() => { resetBtn.style.boxShadow = ''; }, 400);
});

quickBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const speed = parseFloat(btn.dataset.speed);
    updateUI(speed);
    applySpeed(speed);
  });
});

// ─── Init ─────────────────────────────────────────────────────────────────
chrome.storage.local.get(['speed'], result => {
  updateUI(result.speed ?? 1.0);
  sendToTab({ type: 'GET_STATUS' }, status => {
    const connected = status && status.ok && status.count > 0;
    document.getElementById('connectionStatus').textContent = connected ? (status.count === 1 ? '1 vídeo encontrado nesta aba' : status.count + ' vídeos encontrados nesta aba') : 'Abra uma página com vídeo para começar';
    statusDot.style.background = connected ? '#ddd' : '#888';
    if (!status || !status.ok) return;
    updateUI(status.currentSpeed);

  });
});





