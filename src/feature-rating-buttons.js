'use strict';
(() => {
  const ready = document.documentElement ? Promise.resolve() : new Promise(resolve => {
    const observer = new MutationObserver(() => {
      if (document.documentElement) { observer.disconnect(); resolve(); }
    });
    observer.observe(document, { childList: true });
  });
  const settings = { alwaysShow: true, pinFilterSearch: true };
  let attemptedSearchShelves = new WeakSet();
  let revision = 0;
  let settingsLoaded = false;
  let searchObserver;
  let searchOpenQueued = false;

  function isVisible(element) {
    return element && element.getAttribute('aria-hidden') !== 'true' &&
      getComputedStyle(element).display !== 'none' && element.getBoundingClientRect().width > 0;
  }

  function findPlaylistSearchMenuItem() {
    const labels = [
      '在播放清單中尋找', '在播放清单中查找', 'find in playlist',
      'search within playlist', 'プレイリスト内を検索'
    ];
    return [...document.querySelectorAll('ytmusic-menu-popup-renderer ytmusic-menu-service-item-renderer')]
      .find(item => {
        if (!isVisible(item)) return false;
        const label = item.textContent.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
        if (labels.some(candidate => label.includes(candidate.toLocaleLowerCase()))) return true;
        const iconPath = item.querySelector('yt-icon svg path')?.getAttribute('d') || '';
        return iconPath.startsWith('M8.25 1.5a6.75');
      });
  }

  function updatePinnedSearchBar() {
    const root = document.documentElement;
    if (settings.pinFilterSearch === false) {
      root.removeAttribute('data-bm-filter-search-fixed');
      return;
    }
    const bar = document.querySelector(
      'ytmusic-playlist-shelf-renderer[show-filter-search] #filter-search-bar-container, ' +
      'ytmusic-playlist-shelf-renderer[show-filter-search] .ytmusicPlaylistFilterSearchShelfFilterSearchBarContainer'
    );
    const anchor = document.querySelector('ytmusic-search-box .search-container') ||
      document.querySelector('ytmusic-search-box');
    if (!bar || !anchor) {
      root.removeAttribute('data-bm-filter-search-fixed');
      return;
    }
    root.removeAttribute('data-bm-filter-search-fixed');
    const rect = anchor.getBoundingClientRect();
    if (!rect.width) return;
    const nav = document.querySelector('ytmusic-nav-bar');
    const navBottom = nav?.getBoundingClientRect().bottom || 0;
    const anchorStyle = getComputedStyle(anchor);
    root.style.setProperty('--bm-filter-search-left', `${rect.left}px`);
    root.style.setProperty('--bm-filter-search-width', `${rect.width}px`);
    root.style.setProperty('--bm-filter-search-top', `${Math.max(navBottom, rect.bottom + 8)}px`);
    root.style.setProperty('--bm-filter-search-background', anchorStyle.backgroundColor);
    root.style.setProperty('--bm-filter-search-radius', anchorStyle.borderRadius);
    root.setAttribute('data-bm-filter-search-fixed', '');
  }

  async function openPlaylistSearch() {
    if (!settingsLoaded || settings.pinFilterSearch === false) return;
    const playlist = document.querySelector('ytmusic-playlist-shelf-renderer[page-type="MUSIC_PAGE_TYPE_PLAYLIST"]');
    if (!playlist || playlist.hasAttribute('show-filter-search') || attemptedSearchShelves.has(playlist)) return;

    let item = findPlaylistSearchMenuItem();
    let menuButton;
    if (!item) {
      menuButton = document.querySelector(
        'ytmusic-responsive-header-renderer .action-buttons ytmusic-menu-renderer button'
      );
      if (!menuButton) return;
    }
    attemptedSearchShelves.add(playlist);
    if (!item) {
      menuButton.click();
      for (let attempt = 0; attempt < 12 && !item; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 40));
        item = findPlaylistSearchMenuItem();
      }
    }
    item?.click();
  }

  function queuePlaylistSearchOpen() {
    if (searchOpenQueued) return;
    searchOpenQueued = true;
    setTimeout(() => {
      searchOpenQueued = false;
      openPlaylistSearch();
    }, 0);
  }

  function handleSearchMutations(records) {
    let searchStateChanged = false;
    let pageContentChanged = false;
    for (const record of records) {
      if (record.type === 'attributes' && record.attributeName === 'show-filter-search') {
        searchStateChanged = true;
      } else if (record.type === 'childList' || record.attributeName === 'page-type') {
        pageContentChanged = true;
      }
    }
    if (searchStateChanged) updatePinnedSearchBar();
    if (pageContentChanged) queuePlaylistSearchOpen();
  }

  async function apply() {
    await ready;
    document.documentElement.toggleAttribute('data-bm-hide-ratings', settings.alwaysShow === false);
    document.documentElement.toggleAttribute('data-bm-pin-filter-search', settings.pinFilterSearch !== false);
    updatePinnedSearchBar();
    openPlaylistSearch();
    if (!searchObserver) {
      searchObserver = new MutationObserver(handleSearchMutations);
      searchObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['page-type', 'show-filter-search']
      });
      window.addEventListener('resize', updatePinnedSearchBar);
    }
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    revision++;
    for (const key of Object.keys(settings)) {
      if (changes[key]) {
        settings[key] = changes[key].newValue !== false;
        if (key === 'pinFilterSearch' && !settings[key]) attemptedSearchShelves = new WeakSet();
      }
    }
    apply();
  });
  const initialRevision = revision;
  chrome.storage.local.get(settings).then(values => {
    if (revision === initialRevision) Object.assign(settings, values);
    settingsLoaded = true;
    apply();
  }).catch(() => {
    settingsLoaded = true;
    apply();
  });
})();
