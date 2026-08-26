(() => {
  const EXT = globalThis.browser ?? globalThis.chrome;
  if (!EXT?.runtime?.getURL) return;
  // Facebook and Messenger create many short-lived embedded documents. The call
  // capture happens in the top-level page, so never install the engine in an
  // iframe even if a future manifest change enables all_frames again.
  if (window.top !== window) return;

  const injectorUrl = EXT.runtime.getURL('core/injector.js');

  function sendHeartbeat() {
    try {
      const result = EXT.runtime.sendMessage({ type: 'MICMAX_HEARTBEAT' });
      if (result?.catch) result.catch(() => {});
    } catch (_) {}
  }

  function inject() {
    if (window.__micMaxLoaderBusy) return;
    window.__micMaxLoaderBusy = true;

    const alreadyInjected = document.documentElement?.dataset?.micMaxLoaderInjected === '1';
    // Content scripts run in an isolated world in Chrome. The injector runs in
    // the page world, so its window.__micMaxInjectorReady flag is not visible
    // here. The document dataset is shared by both worlds and is the only safe
    // completion marker to use from this loader.
    if (alreadyInjected) {
      window.__micMaxLoaderBusy = false;
      sendHeartbeat();
      return;
    }

    const script = document.createElement('script');
    script.src = injectorUrl;
    script.async = false;
    script.dataset.omniMessengerLord = 'injector';
    script.onload = () => {
      document.documentElement.dataset.micMaxLoaderInjected = '1';
      window.__micMaxLoaderBusy = false;
      sendHeartbeat();
      script.remove();
    };
    script.onerror = () => {
      window.__micMaxLoaderBusy = false;
      script.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  inject();
})();
