'use strict';
document.documentElement.lang = chrome.i18n.getUILanguage();
document.querySelectorAll('[data-i18n]').forEach(element => {
  element.textContent = chrome.i18n.getMessage(element.dataset.i18n);
});
document.title = chrome.i18n.getMessage('extensionName');
const defaults = { alwaysShow: true, pinFilterSearch: true };
const status = document.getElementById('status');
async function init() {
  try {
    const settings = await chrome.storage.local.get(defaults);
    for (const key of Object.keys(defaults)) {
      const input = document.getElementById(key);
      input.checked = settings[key] !== false;
      input.disabled = false;
      input.addEventListener('change', async () => {
        input.disabled = true;
        try {
          await chrome.storage.local.set({ [key]: input.checked });
          status.textContent = chrome.i18n.getMessage('saved');
        } catch {
          input.checked = !input.checked;
          status.textContent = chrome.i18n.getMessage('settingsError');
        } finally {
          input.disabled = false;
        }
      });
    }
  } catch {
    status.textContent = chrome.i18n.getMessage('settingsError');
  }
}
init();
