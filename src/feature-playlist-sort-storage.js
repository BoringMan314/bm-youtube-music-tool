/* Isolated-world bridge. Only sorter-prefixed storage is exposed to the page. */
(() => {
  if (globalThis.bmSortBridge) return;
  globalThis.bmSortBridge = true;
  let pending = Promise.resolve();
  document.addEventListener('bm-sort-store', event => {
    pending = pending.then(async () => {
      let request;
      try {
        if (typeof event.detail !== 'string' || event.detail.length > 4000000) return;
        request = JSON.parse(event.detail);
        if (!/^bm-sort-v1-[\w%.-]+-PL[\w-]+$/.test(request.key)) throw Error('無效清單儲存鍵');
        let value;
        if (request.op === 'get') value = (await chrome.storage.local.get(request.key))[request.key] || null;
        else if (request.op === 'set') {
          const data = request.value;
          if (!data || !/^PL[\w-]+$/.test(data.source) || !request.key.endsWith('-'+data.source) || !Array.isArray(data.tracks) || !data.metadata || data.copyId === data.source) throw Error('無效排序資料');
          await chrome.storage.local.set({[request.key]:data});
          value = true;
        } else throw Error('無效儲存操作');
        document.dispatchEvent(new CustomEvent('bm-sort-reply',{detail:JSON.stringify({id:request.id,value})}));
      } catch(error) {
        document.dispatchEvent(new CustomEvent('bm-sort-reply',{detail:JSON.stringify({id:request?.id,error:error.message})}));
      }
    });
  });
})();
