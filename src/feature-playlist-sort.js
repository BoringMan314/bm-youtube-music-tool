'use strict';
async function startPlaylistAction(event, action) {
  const button = event.currentTarget;
  button.disabled = true;
  const status = document.getElementById('status');
  try {
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    const url = new URL(tab?.url || 'about:blank');
    if (!['https://music.youtube.com','https://www.youtube.com'].includes(url.origin) || !/^PL[\w-]+$/.test(url.searchParams.get('list') || '')) throw Error(chrome.i18n.getMessage('openPlaylistPrompt'));
    if (action==='like' && url.origin!=='https://music.youtube.com') throw Error(chrome.i18n.getMessage('musicOnlyLike'));
    await chrome.scripting.executeScript({target:{tabId:tab.id},files:['src/feature-playlist-sort-storage.js']});
    await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',func: (action,messages) => { window.bmPlaylistAction=action; window.bmPlaylistMessages=messages; },args:[action,Object.fromEntries(["unknownRatingTitle","unknownRatingHint","unknownRatingExport","musicOnlyLike","closePanel","closingPanel","panelFinished","playlistTools","sortAuthor","sortDate","likeAll","copyPlaylist","exportCache","authorDescription","dateDescription","likeDescription","copyDescription","cacheDescription","openPlaylistPrompt","panelOpened","exportOpened","stopAction","startAction","openCopy","copySuffix","playlistName","copySource","preparing"].map(key=>[key,chrome.i18n.getMessage(key)]))]});
    await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',files:['src/injected-playlist-sorter.js']});
    status.textContent = chrome.i18n.getMessage('panelOpened');
  } catch(error) { status.textContent = error.message; }
  finally { button.disabled = false; }
}
document.getElementById('sortPlaylist').addEventListener('click', event=>startPlaylistAction(event,'sort'));
document.getElementById('sortPlaylistByDate').addEventListener('click', event=>startPlaylistAction(event,'date'));
document.getElementById('likePlaylist').addEventListener('click', event=>startPlaylistAction(event,'like'));
document.getElementById('copyPlaylist').addEventListener('click', event=>startPlaylistAction(event,'copy'));
document.getElementById('exportSortCache').addEventListener('click', async () => {
  try {
    const all = await chrome.storage.local.get(null);
    const entries = Object.fromEntries(Object.entries(all).filter(([key])=>key.startsWith('bm-sort-v1-')));
    const blob = new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),entries},null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    try { await chrome.downloads.download({url,filename:'playlist-sort-cache.json',saveAs:true}); }
    finally { setTimeout(()=>URL.revokeObjectURL(url),60000); }
    document.getElementById('status').textContent = chrome.i18n.getMessage('exportOpened');
  } catch(error) { document.getElementById('status').textContent = error.message; }
});
