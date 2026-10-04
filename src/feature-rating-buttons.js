'use strict';
(() => {
  const ready = document.documentElement ? Promise.resolve() : new Promise(resolve => {
    const observer = new MutationObserver(() => {
      if (document.documentElement) { observer.disconnect(); resolve(); }
    });
    observer.observe(document, { childList: true });
  });
  const settings = { alwaysShow: true, pinFilterSearch: true };
  let revision = 0;
  async function apply() {
    await ready;
    document.documentElement.toggleAttribute('data-bm-hide-ratings', settings.alwaysShow === false);
    document.documentElement.toggleAttribute('data-bm-pin-filter-search', settings.pinFilterSearch !== false);
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    revision++;
    for (const key of Object.keys(settings)) {
      if (changes[key]) settings[key] = changes[key].newValue !== false;
    }
    apply();
  });
  const initialRevision = revision;
  chrome.storage.local.get(settings).then(values => {
    if (revision === initialRevision) Object.assign(settings, values);
    apply();
  }).catch(() => apply());
})();
