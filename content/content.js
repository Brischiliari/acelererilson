// ── ACELERERILSON Content Script v1.1.0 ──
(function () {
  'use strict';

  // Guard against multiple initializations in the same frame
  if (window.__acelererilson_initialized === '1.1.2') return;
  window.__acelererilson_initialized = '1.1.2';

  let currentSpeed = 1.0;
  let speedWasSelected = false;
  let overlayTimeout = null;
  let overlay = null;

  let scanQueued           = false;

  // ─────────────────────────────────────────────────────────────────────────
  // VIDEO DISCOVERY (Includes Shadow DOM)
  // ─────────────────────────────────────────────────────────────────────────
  function getAllVideos() {
    const videos = Array.from(document.querySelectorAll('video'));

    function searchShadowRoots(node) {
      if (!node) return;
      if (node.shadowRoot) {
        const shadowVideos = node.shadowRoot.querySelectorAll('video');
        shadowVideos.forEach(v => {
          if (!videos.includes(v)) videos.push(v);
        });
        node.shadowRoot.querySelectorAll('*').forEach(searchShadowRoots);
      }
    }

    try {
      document.querySelectorAll('*').forEach(searchShadowRoots);
    } catch (e) {}

    return videos;
  }

  function getVideosInNode(node) {
    if (!(node instanceof Element)) return [];

    const videos = [];
    if (node.matches('video')) videos.push(node);
    node.querySelectorAll('video').forEach(video => videos.push(video));

    node.querySelectorAll('*').forEach(element => {
      if (element.shadowRoot) {
        element.shadowRoot.querySelectorAll('video').forEach(video => videos.push(video));
      }
    });

    return [...new Set(videos)];
  }

  function getBestVideo() {
    const videos = getAllVideos();
    if (videos.length === 0) return null;

    // 1. Video currently playing
    const playing = videos.find(v => !v.paused && v.readyState >= 2 && !v.ended);
    if (playing) return playing;

    // 2. Video that has played or is loaded
    const loaded = videos.find(v => v.readyState >= 1);
    if (loaded) return loaded;

    // 3. Largest video on screen
    return videos.reduce((best, v) => {
      const area = (v.clientWidth || v.videoWidth || 0) * (v.clientHeight || v.videoHeight || 0);
      const bestArea = best ? ((best.clientWidth || best.videoWidth || 0) * (best.clientHeight || best.videoHeight || 0)) : -1;
      return area >= bestArea ? v : best;
    }, videos[0]);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OVERLAY HUD
  // ─────────────────────────────────────────────────────────────────────────
  function createOverlay() {
    if (overlay && document.body && document.body.contains(overlay)) return;
    overlay = document.createElement('div');
    overlay.id = 'acelererilson-overlay';
    overlay.innerHTML = `
      <div class="acl-inner">
        <div class="acl-icon" id="acl-icon-el">⚡</div>
        <div class="acl-texts">
          <div class="acl-speed" id="acl-speed-text">1.0×</div>
          <div class="acl-label" id="acl-label-text">NORMAL</div>
        </div>
      </div>
    `;
    (document.body || document.documentElement).appendChild(overlay);
  }

  function showOverlay(speed, icon, label) {
    createOverlay();
    const speedText = document.getElementById('acl-speed-text');
    const labelText = document.getElementById('acl-label-text');
    const iconEl    = document.getElementById('acl-icon-el');

    if (speedText) speedText.textContent = `${speed}×`;
    if (labelText) labelText.textContent = label || getLabel(speed);
    if (iconEl)    iconEl.textContent = icon || '⚡';

    const color = getColor(speed);
    const speedEl = overlay.querySelector('.acl-speed');
    if (speedEl) speedEl.style.color = color;
    overlay.style.borderColor = color + '55';
    overlay.style.boxShadow = `0 0 20px ${color}22`;

    overlay.classList.remove('acl-hide');
    overlay.classList.add('acl-show');

    clearTimeout(overlayTimeout);
    overlayTimeout = setTimeout(() => {
      overlay.classList.remove('acl-show');
      overlay.classList.add('acl-hide');
    }, 2000);
  }

  function getLabel(speed) {
    if (speed < 0.5)   return 'CÂMERA LENTA';
    if (speed < 1.0)   return 'DEVAGAR';
    if (speed === 1.0) return 'NORMAL';
    if (speed <= 1.5)  return 'UM POUCO RÁPIDO';
    if (speed <= 2.0)  return 'RÁPIDO';
    if (speed <= 4.0)  return 'MUITO RÁPIDO';
    if (speed <= 8.0)  return 'TURBINADO ⚡';
    return 'MODO FOGUETE 🚀';
  }

  function getColor(speed) {
    return '#e5e5e5';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIDEO SPEED APPLICATION
  // ─────────────────────────────────────────────────────────────────────────
  function applySpeedToVideo(v, speed) {
    try {
      v.playbackRate = speed;
      // Preserve pitch so audio doesn't sound distorted
      v.preservesPitch = true;
      v.mozPreservesPitch = true;
      v.webkitPreservesPitch = true;
      return v.playbackRate === speed;
    } catch (e) {}
  }

  function setVideoSpeed(speed, syncAll = true) {
    speedWasSelected = true;
    currentSpeed = speed;
    const videos = getAllVideos();
    if (videos.length === 0) return 0;

    if (syncAll) {
      return videos.filter(v => applySpeedToVideo(v, speed)).length;
    } else {
      const target = getBestVideo();
      return target && applySpeedToVideo(target, speed) ? 1 : 0;
    }


  }

  function bindVideoEvents(video) {
    if (video.__acelererilson_bound === '1.1.2') return;
    video.__acelererilson_bound = '1.1.2';

    // When video starts or loads new source, apply active speed
    const onPlayOrLoaded = () => {
      if (currentSpeed !== 1.0) {
        applySpeedToVideo(video, currentSpeed);
      }
    };

    video.addEventListener('play', onPlayOrLoaded);
    video.addEventListener('loadedmetadata', onPlayOrLoaded);
    video.addEventListener('ratechange', () => {
      if (speedWasSelected && video.playbackRate !== currentSpeed) {
        requestAnimationFrame(() => {
          if (video.playbackRate !== currentSpeed) applySpeedToVideo(video, currentSpeed);
        });
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MESSAGE LISTENER
  // ─────────────────────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    try {
      if (msg.type === 'SET_SPEED') {
        const count = setVideoSpeed(msg.speed, msg.syncAll !== false);
        showOverlay(msg.speed);
        sendResponse({ ok: true, count });
        return true;
      }

      if (msg.type === 'GET_STATUS') {
        sendResponse({
          ok: true,
          count: getAllVideos().length,
          currentSpeed
        });
        return true;
      }
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
    return true;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INIT & OBSERVERS
  // ─────────────────────────────────────────────────────────────────────────
  function scanAndBindVideos() {
    const videos = getAllVideos();
    videos.forEach(v => {
      bindVideoEvents(v);
      if (currentSpeed !== 1.0 && v.playbackRate !== currentSpeed) {
        applySpeedToVideo(v, currentSpeed);
      }
    });
  }

  function bindAndApplyVideos(videos) {
    videos.forEach(video => {
      bindVideoEvents(video);
      if (currentSpeed !== 1.0 && video.playbackRate !== currentSpeed) {
        applySpeedToVideo(video, currentSpeed);
      }
    });
  }

  function queueFullScan() {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(() => {
      scanQueued = false;
      scanAndBindVideos();
    });
  }

  function init() {
    // Retrieve saved speed
    chrome.storage.local.get(['speed'], result => {
      const savedSpeed = result.speed || 1.0;
      if (!speedWasSelected) currentSpeed = savedSpeed;
      scanAndBindVideos();
    });



    // Observe DOM changes for dynamically inserted video elements (YouTube, SPAs)
    const observer = new MutationObserver(records => {
      const addedVideos = records.flatMap(record =>
        [...record.addedNodes].flatMap(getVideosInNode)
      );

      if (addedVideos.length > 0) {
        bindAndApplyVideos([...new Set(addedVideos)]);
      }
    });

    const targetNode = document.body || document.documentElement;
    if (targetNode) {
      observer.observe(targetNode, { childList: true, subtree: true });
    }

    queueFullScan();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();






