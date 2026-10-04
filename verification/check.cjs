const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.route('**/*',route=>route.request().url().startsWith('file:') && route.request().resourceType()!=='script' ? route.continue():route.abort());
 await page.goto('file:///F:/Cursor/bm-youtube-music-tool/參考/VOCALOID%27s%20MUSIC.html',{waitUntil:'load'});
 // The saved extensionless stylesheet is not reliably loaded under file://.
 await page.addStyleTag({path:"參考/VOCALOID's MUSIC_files/rs=ADGLRXIFX_DXXDo9KZq9hAiAnsvEk1-r6Q"});
 await page.mouse.move(0,0);
 const measure=()=>page.locator('ytmusic-responsive-list-item-renderer .menu:has(ytmusic-like-button-renderer)').evaluateAll(nodes=>nodes.slice(0,20).map(n=>({width:n.getBoundingClientRect().width,basis:getComputedStyle(n).flexBasis,overflow:getComputedStyle(n).overflow,buttons:[...n.querySelectorAll('.like,.dislike')].map(b=>({opacity:getComputedStyle(b).opacity,width:b.getBoundingClientRect().width}))})));
 const before=await measure();
 if (!before.some(n=>n.width===0 || n.buttons.some(b=>Number(b.opacity)<0.01))) throw Error('Reference does not reproduce hidden controls');
 await page.addStyleTag({path:'content.css'});
 const after=await measure();
 if(!after.length || after.some(n=>n.width===0 || n.buttons.some(b=>b.opacity!=='1'||b.width===0))) throw Error('Rating controls not visible');
 await page.screenshot({path:'screenshot/reference-after.png'});
 // Reproduce collapsed stacked layout even if the saved playlist overrides it.
 const row=page.locator('ytmusic-responsive-list-item-renderer:has(ytmusic-like-button-renderer)').first();
 await row.evaluate(n=>{n.setAttribute('stack-flex-columns','');n.removeAttribute('is-playlist-detail-page');n.removeAttribute('is-album-detail-page');});
 const stacked=await measure();
 if(stacked[0].width===0 || stacked[0].basis!=='auto') throw Error('Stacked row remains collapsed');
 fs.writeFileSync('verification/results.json',JSON.stringify({before,after,stacked:stacked[0]},null,2));
 console.log(JSON.stringify({checkedRows:after.length,before:before[0],after:after[0],stacked:stacked[0]}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
