(function () {
  'use strict';

  const KEY = 'bm-volume-step5-enabled';
  const FLAG_ATTR = 'data-bm-volume-step5';

  function apply(enabled) {
    const root = document.documentElement;
    if (root) {
      root.setAttribute(FLAG_ATTR, enabled ? '1' : '0');
      return;
    }
    document.addEventListener('DOMContentLoaded', () => apply(enabled), { once: true });
  }

  async function refresh() {
    try {
      const values = await chrome.storage.local.get({ [KEY]: true });
      apply(values[KEY] !== false);
    } catch (_) {
      apply(true);
    }
  }

  refresh();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[KEY]) refresh();
  });
})();