const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const engine=fs.readFileSync('src/injected-playlist-sorter.js','utf8');
const bridge=fs.readFileSync('src/feature-playlist-sort-storage.js','utf8');
const SOURCE='PLsource';
const ratings={bNew:'INDIFFERENT',aNew:'LIKE',bOld:'DISLIKE',aOld:'INDIFFERENT',cNew:null};const liked=[];
const db={}; const copies=new Map(); let scans=0, creates=0, moves=0;
let original=['bNew','aNew','bOld','aOld','bOld'].map((videoId,i)=>({videoId,setVideoId:'s'+i}));
const shelf=tracks=>({header:{musicEditablePlaylistDetailHeaderRenderer:{}},contents:{musicPlaylistShelfRenderer:{contents:tracks.map((t,i)=>({musicResponsiveListItemRenderer:{menu:{likeButtonRenderer:{likeStatus:ratings[t.videoId||t]}},playlistItemData:{videoId:t.videoId||t,playlistSetVideoId:t.setVideoId||'s'+i},flexColumns:[{musicResponsiveListItemFlexColumnRenderer:{text:{runs:[{text:t.videoId||t}]}}}]}}))}}});
async function run(action='sort',youtube=false){
 const nodes=[],listeners=new Map();let task;
 const document={cookie:'SAPISID=test',title:'Test playlist',body:{append(){}},getElementById:()=>null,querySelector:()=>null,
 createElement:()=>{const e={style:{},textContent:'',setAttribute(){},remove(){this.removed=true;},append(){},prepend(child){this.firstChild=child;},click(){if(this.onclick) task=this.onclick();}};nodes.push(e);return e;},
 addEventListener:(k,f)=>{if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(f);},
 removeEventListener:(k,f)=>listeners.get(k)?.delete(f),
 dispatchEvent:e=>{for(const f of [...(listeners.get(e.type)||[])])f(e);}};
 const cfg={INNERTUBE_CONTEXT:{client:{clientName:'WEB_REMIX'}}};
 const ctx={document,location:{origin:youtube?'https://www.youtube.com':'https://music.youtube.com',href:(youtube?'https://www.youtube.com':'https://music.youtube.com')+'/playlist?list='+SOURCE},
 window:{bmPlaylistAction:action,ytcfg:{get:k=>cfg[k]}},chrome:{storage:{local:{get:async k=>({[k]:db[k]}),set:async x=>Object.assign(db,structuredClone(x))}}},
 localStorage:{getItem:()=>null},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail;}},
 navigator:{locks:{request:async(k,o,fn)=>fn({name:k})}},
 crypto:webcrypto,TextEncoder,structuredClone,AbortSignal,URL,Blob,console,
 setTimeout:(fn,ms)=>ms===15000?setTimeout(fn,ms):setTimeout(fn,0),clearTimeout,
 fetch:async(url,options)=>{
 const b=JSON.parse(options.body);let result;
 if(url.includes('/browse?')) { const tracks=b.browseId==='VL'+SOURCE?original:copies.get(b.browseId.slice(2)); result=youtube?{contents:{playlistVideoListRenderer:{isEditable:true,contents:tracks.map(t=>({playlistVideoRenderer:{videoId:t.videoId,title:{simpleText:t.videoId},isPlayable:true,menu:{playlistEditEndpoint:{actions:[{action:'ACTION_REMOVE_VIDEO',setVideoId:t.setVideoId}]}}}}))}}}:shelf(tracks); }
 else if(url.includes('/create?')){assert.equal(b.sourcePlaylistId,SOURCE);const id='PLcopy'+(++creates);copies.set(id,original.map((t,i)=>({videoId:t.videoId,setVideoId:id+'-'+i})));result={playlistId:id};}
 else if(url.includes('/player?')){scans++;result={videoDetails:{videoId:b.videoId,channelId:b.videoId[0],author:b.videoId[0]},microformat:{playerMicroformatRenderer:{uploadDate:(b.videoId.endsWith('Old')?'2020-01-01':'2025-09-05')+'T03:01:28-07:00'}}};}
 else if(url.includes('/like/like?')){assert.equal(ratings[b.target.videoId],'INDIFFERENT');liked.push(b.target.videoId);ratings[b.target.videoId]='LIKE';result={};}
 else if(url.includes('/edit_playlist?')){assert.equal(b.playlistId,SOURCE);const c=original,a=b.actions[0];if(a.action==='ACTION_REMOVE_VIDEO'){const idx=c.findIndex(x=>x.setVideoId===a.setVideoId);assert.ok(idx>=0,'remove known setVideoId');c.splice(idx,1);result={status:'STATUS_SUCCEEDED'};}else{moves++;const [t]=c.splice(c.findIndex(x=>x.setVideoId===a.setVideoId),1);c.splice(c.findIndex(x=>x.setVideoId===a.movedSetVideoIdSuccessor),0,t);result={status:'STATUS_SUCCEEDED'};}}
 else throw Error(url);
 return {ok:true,json:async()=>result};
 }};
 vm.createContext(ctx);vm.runInContext(bridge,ctx);vm.runInContext(engine,ctx);
 for(let i=0;i<100&&!task;i++)await new Promise(r=>setTimeout(r,1));
 assert.ok(task,'one-click automatic start');await task;
 assert.ok(nodes.some(n=>n.textContent.includes(action==='copy'?'順序已驗證':action==='like'?'新增喜歡':'順序已重新讀取驗證')),nodes.map(n=>n.textContent).join('\n'));
 assert.ok(nodes.some(n=>n.firstChild?.textContent==='開始／接續'),'start/resume is first in action row');
 nodes.find(n=>n.textContent==='×').onclick();assert.ok(nodes.find(n=>n.id?.startsWith('bm-playlist-')).removed,'completed panel closes');
}
(async()=>{
 await run();assert.equal(scans,4);assert.equal(creates,0);
 assert.deepEqual(original.map(t=>t.videoId),['bOld','bNew','aOld','aNew']);
 const oldMoves=moves;await run();assert.equal(scans,4);assert.equal(creates,0);assert.equal(moves,oldMoves);
 original.push({videoId:'cNew',setVideoId:'s5'});await run();assert.equal(scans,5);assert.equal(creates,0);
 original=original.filter(t=>t.videoId!=='aOld');await run();assert.equal(scans,5);assert.equal(original.length,4);
 assert.ok(Object.values(db)[0].completed);
 original.push({videoId:'aOld',setVideoId:'s6'},{videoId:'bNew',setVideoId:'s7'});
 const before=original.map(t=>t.videoId);await run('like');assert.deepEqual(liked,['bNew','aOld']);assert.equal(ratings.bOld,'DISLIKE');assert.equal(ratings.aNew,'LIKE');assert.equal(ratings.cNew,null);assert.deepEqual(original.map(t=>t.videoId),before);await run('like');assert.equal(liked.length,2);
 const beforeCopy=structuredClone(original);const priorMoves=moves;await run('copy');assert.equal(creates,1);assert.deepEqual(original,beforeCopy);assert.deepEqual(copies.get('PLcopy1').map(t=>t.videoId),original.map(t=>t.videoId));assert.equal(moves,priorMoves);
 const scansBeforeDate=scans;await run('date');assert.deepEqual(original.map(t=>t.videoId),['bOld','aOld','bNew','aNew','cNew']);assert.equal(scans,scansBeforeDate);const movesAfterDate=moves;await run('date');assert.equal(moves,movesAfterDate);await run('sort');assert.deepEqual(original.map(t=>t.videoId),['bOld','bNew','aOld','aNew','cNew']);assert.equal(scans,scansBeforeDate);
 original=['bNew','aOld','bOld','aNew','bOld'].map((videoId,i)=>({videoId,setVideoId:'y'+i}));await run('sort',true);assert.deepEqual(original.map(t=>t.videoId),['bOld','bNew','aOld','aNew']);await run('date',true);assert.deepEqual(original.map(t=>t.videoId),['bOld','aOld','bNew','aNew']);const ytBefore=structuredClone(original);await run('copy',true);assert.deepEqual(original,ytBefore);assert.deepEqual(copies.get('PLcopy2').map(t=>t.videoId),original.map(t=>t.videoId));
 console.log('PASS: extension storage bridge, automatic start, repeat run with zero scans/moves, incremental addition/deletion, direct writes without copies, removes newer duplicates then sorts by author/date; bulk like skips liked/disliked/unknown, deduplicates, verifies and is idempotent.');
})().catch(e=>{console.error(e);process.exitCode=1;});
