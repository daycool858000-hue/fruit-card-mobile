import './styles.css';

const STORAGE_KEY = 'ayi-fruit-card-v1';
const FIELDS = [
  ['name', '水果名稱', '🍊 愛文芒果'],
  ['price', '價格', '一斤 $99'],
  ['origin', '產地', '台南玉井'],
  ['spec', '規格', '大顆／約 5 入'],
  ['flavor', '風味', '香甜多汁、纖維細'],
  ['intro', '簡短介紹', '今天到貨，新鮮漂亮，適合送禮自用。'],
  ['notice', '訂購提醒', '私訊預留，售完為止']
];
const SIZES = {
  portrait: { label: 'IG貼文直式 4:5', w: 1080, h: 1350 },
  story: { label: 'IG限時動態 9:16', w: 1080, h: 1920 },
  square: { label: '正方形 1:1', w: 1080, h: 1080 }
};
const DEFAULT = {
  size: 'portrait', image: { x: 0, y: 0, scale: 1 },
  textBox: { x: 60, y: 820, fontSize: 46, weight: 700, align: 'left', color: '#ffffff', bgAlpha: 0.48 },
  fields: Object.fromEntries(FIELDS.map(([id,,value]) => [id, { value, visible: true }]))
};
let state = loadState();
let imageBitmap = null;
let imageInfo = '';
let isDirty = false;
const app = document.querySelector('#app');
app.innerHTML = `
<header class="top"><div><strong>市場阿怡水果照片加字工具</strong><small>PWA・iPhone Safari 可用</small></div><button id="clearBtn" class="ghost">清除本次內容</button></header>
<main>
<section class="stage-wrap">
  <canvas id="canvas" aria-label="照片編輯預覽"></canvas>
  <div class="stage-actions"><label class="primary file">選擇水果照片<input id="file" type="file" accept="image/*"></label><button id="exportBtn" class="primary">匯出 PNG／分享</button></div>
  <p id="hint" class="hint">照片會立即顯示；文字與版面會自動保留，照片本身重新整理後可能需重選。</p>
</section>
<section class="panel">
  <details open><summary>尺寸與照片</summary><div class="grid"><label>輸出尺寸<select id="size"></select></label><label>照片縮放<input id="imgScale" type="range" min="0.2" max="4" step="0.01"></label></div><p class="hint">在照片上拖曳可移動照片；拖曳文字框可移動文字區塊。</p></details>
  <details open><summary>文字內容</summary><div id="fields"></div></details>
  <details><summary>文字樣式</summary><div class="grid"><label>文字大小<input id="fontSize" type="range" min="22" max="92" step="1"></label><label>粗細<select id="weight"><option value="400">一般</option><option value="700">粗體</option><option value="900">超粗</option></select></label><label>對齊<select id="align"><option value="left">靠左</option><option value="center">置中</option><option value="right">靠右</option></select></label><label>文字顏色<input id="color" type="color"></label><label>底色透明度<input id="bgAlpha" type="range" min="0" max="0.85" step="0.01"></label></div></details>
</section>
</main>`;
const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const els = Object.fromEntries(['file','exportBtn','clearBtn','size','imgScale','fontSize','weight','align','color','bgAlpha','hint'].map(id=>[id,document.getElementById(id)]));
for (const [key, s] of Object.entries(SIZES)) els.size.add(new Option(s.label, key));
document.querySelector('#fields').innerHTML = FIELDS.map(([id,label]) => `<div class="field"><label><input type="checkbox" data-visible="${id}"> 顯示${label}</label><input data-value="${id}" placeholder="${label}"></div>`).join('');

function loadState(){ try { return { ...structuredClone(DEFAULT), ...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}') }; } catch { return structuredClone(DEFAULT); } }
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); isDirty = true; }
function syncControls(){
  els.size.value = state.size; els.imgScale.value = state.image.scale; els.fontSize.value = state.textBox.fontSize; els.weight.value = state.textBox.weight; els.align.value = state.textBox.align; els.color.value = state.textBox.color; els.bgAlpha.value = state.textBox.bgAlpha;
  FIELDS.forEach(([id]) => { document.querySelector(`[data-value="${id}"]`).value = state.fields[id].value; document.querySelector(`[data-visible="${id}"]`).checked = state.fields[id].visible; });
}
function fitCanvas(){ const s=SIZES[state.size]; const maxW = Math.min(window.innerWidth - 24, 520); canvas.style.width = `${maxW}px`; canvas.style.height = `${maxW*s.h/s.w}px`; canvas.width=s.w; canvas.height=s.h; draw(); }
function draw(){
  const s=SIZES[state.size]; ctx.clearRect(0,0,s.w,s.h); const g=ctx.createLinearGradient(0,0,s.w,s.h); g.addColorStop(0,'#fed7aa'); g.addColorStop(1,'#fb923c'); ctx.fillStyle=g; ctx.fillRect(0,0,s.w,s.h);
  if(imageBitmap){ const iw=imageBitmap.width*state.image.scale, ih=imageBitmap.height*state.image.scale; ctx.drawImage(imageBitmap, state.image.x, state.image.y, iw, ih); }
  else { ctx.fillStyle='rgba(255,255,255,.7)'; ctx.font='700 48px system-ui'; ctx.textAlign='center'; ctx.fillText('請選擇水果照片', s.w/2, s.h/2); }
  const lines = FIELDS.filter(([id])=>state.fields[id].visible && state.fields[id].value.trim()).map(([id,label]) => id==='name' ? state.fields[id].value : `${label}：${state.fields[id].value}`);
  const tb=state.textBox, pad=28, lh=tb.fontSize*1.32, width=s.w-120, height=lines.length*lh+pad*2;
  ctx.fillStyle=`rgba(17,24,39,${tb.bgAlpha})`; roundRect(ctx,tb.x,tb.y,width,height,28); ctx.fill();
  ctx.font=`${tb.weight} ${tb.fontSize}px -apple-system,BlinkMacSystemFont,"Noto Sans TC",sans-serif`; ctx.fillStyle=tb.color; ctx.textAlign=tb.align; ctx.textBaseline='top';
  const tx = tb.align==='left'?tb.x+pad:tb.align==='center'?tb.x+width/2:tb.x+width-pad; lines.forEach((line,i)=>ctx.fillText(line,tx,tb.y+pad+i*lh,width-pad*2));
  if(imageInfo) els.hint.textContent = imageInfo;
}
function roundRect(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
async function loadImage(file){
  const url=URL.createObjectURL(file); const blob=await file.arrayBuffer().then(b=>new Blob([b],{type:file.type}));
  try { imageBitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch { imageBitmap = await new Promise((res,rej)=>{ const img=new Image(); img.onload=()=>res(img); img.onerror=rej; img.src=url; }); }
  const s=SIZES[state.size]; const scale=Math.max(s.w/imageBitmap.width,s.h/imageBitmap.height); state.image={x:(s.w-imageBitmap.width*scale)/2,y:(s.h-imageBitmap.height*scale)/2,scale}; imageInfo=`已載入：${file.name}。可拖曳照片與文字，完成後匯出 PNG。`; save(); syncControls(); draw(); URL.revokeObjectURL(url);
}
function pos(e){ const r=canvas.getBoundingClientRect(); const t=e.touches?.[0]||e; return {x:(t.clientX-r.left)*canvas.width/r.width,y:(t.clientY-r.top)*canvas.height/r.height}; }
let drag=null; canvas.addEventListener('pointerdown',e=>{ const p=pos(e), tb=state.textBox; const target = p.x>=tb.x&&p.x<=tb.x+canvas.width-120&&p.y>=tb.y&&p.y<=tb.y+360 ? 'text':'image'; drag={target, p, ox: target==='text'?tb.x:state.image.x, oy: target==='text'?tb.y:state.image.y}; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove',e=>{ if(!drag) return; const p=pos(e), dx=p.x-drag.p.x, dy=p.y-drag.p.y; if(drag.target==='text'){ state.textBox.x=drag.ox+dx; state.textBox.y=drag.oy+dy; } else { state.image.x=drag.ox+dx; state.image.y=drag.oy+dy; } draw(); });
canvas.addEventListener('pointerup',()=>{ if(drag){ drag=null; save(); }});
['size','imgScale','fontSize','weight','align','color','bgAlpha'].forEach(id=>els[id].addEventListener('input',()=>{ if(id==='size') state.size=els[id].value; else if(id==='imgScale') state.image.scale=+els[id].value; else if(id==='fontSize') state.textBox.fontSize=+els[id].value; else if(id==='bgAlpha') state.textBox.bgAlpha=+els[id].value; else state.textBox[id]=els[id].value; save(); fitCanvas(); }));
document.querySelector('#fields').addEventListener('input',e=>{ const id=e.target.dataset.value||e.target.dataset.visible; if(!id) return; if(e.target.dataset.value) state.fields[id].value=e.target.value; else state.fields[id].visible=e.target.checked; save(); draw(); });
els.file.addEventListener('change',e=> e.target.files?.[0] && loadImage(e.target.files[0]));
els.clearBtn.addEventListener('click',()=>{ if(confirm('確定清除本次文字內容與版面設定？照片也會從預覽移除。')){ localStorage.removeItem(STORAGE_KEY); state=structuredClone(DEFAULT); imageBitmap=null; imageInfo='已清除，請重新選擇照片。'; syncControls(); fitCanvas(); }});
els.exportBtn.addEventListener('click',async()=>{ draw(); canvas.toBlob(async blob=>{ const file=new File([blob],'市場阿怡水果卡.png',{type:'image/png'}); if(navigator.canShare?.({files:[file]})){ await navigator.share({files:[file],title:'市場阿怡水果卡'}); } else { const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=file.name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); } },'image/png',0.96); });
window.addEventListener('resize',fitCanvas); window.addEventListener('beforeunload',()=>{ if(isDirty) save(); });
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
syncControls(); fitCanvas();
