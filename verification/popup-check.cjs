const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try {
 const page=await browser.newPage({viewport:{width:360,height:420}});
 const messages=require('../_locales/zh_TW/messages.json');
 await page.addInitScript(messages=>{
   window.saved={};
   window.chrome={i18n:{getUILanguage:()=> 'zh-TW',getMessage:key=>messages[key]?.message||''},storage:{local:{get:async defaults=>({...defaults,...window.saved}),set:async values=>Object.assign(window.saved,values)}}};
 },messages);
 await page.goto('file:///F:/Cursor/bm-youtube-music-tool/popup.html');
 await page.locator('#alwaysShow').uncheck();
 assert.equal(await page.evaluate(()=>window.saved.alwaysShow),false);
 await page.locator('#alwaysShow').check();
 await page.locator('#pinFilterSearch').uncheck();
 assert.equal(await page.evaluate(()=>window.saved.pinFilterSearch),false);
 await page.locator('#pinFilterSearch').check();
 await page.screenshot({path:'screenshot/popup.png'});
 // Exercise content script with saved settings and live storage changes.
 await page.evaluate(()=>{
  chrome.storage.local.get=async()=>({alwaysShow:false,pinFilterSearch:false});
  chrome.storage.onChanged={addListener:fn=>window.storageListener=fn};
 });
 await page.addScriptTag({path:'src/feature-rating-buttons.js'});
 await page.waitForFunction(()=>document.documentElement.hasAttribute('data-bm-hide-ratings'));
 await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-bm-pin-filter-search'));
 await page.evaluate(()=>window.storageListener({alwaysShow:{newValue:true},pinFilterSearch:{newValue:true}},'local'));
 await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-bm-hide-ratings'));
 await page.waitForFunction(()=>document.documentElement.hasAttribute('data-bm-pin-filter-search'));
 console.log('Popup saving and content setting updates passed (mock Chrome storage).');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
