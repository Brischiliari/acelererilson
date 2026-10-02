// ── ACELERERILSON Service Worker v1.1.0 ──

chrome.runtime.onInstalled.addListener(({ reason }) => {
  console.log('[ACELERERILSON] Extensão carregada com sucesso! ⚡');
  if (reason === 'install') {
    chrome.storage.local.set({ speed: 1.0 });
  }
});

