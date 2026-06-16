const STORAGE_KEY = 'ayi-fruit-card-v1';
const SAFE = 40;
const FIELDS = [
  ['name', '水果名稱', '🍊 愛文芒果', 1.28, 900],
  ['price', '價格', '一斤 $99', 1.12, 900],
  ['origin', '產地', '台南玉井', 1, 700],
  ['spec', '規格', '大顆／約 5 入', 1, 700],
  ['flavor', '風味', '香甜多汁、纖維細', 1, 700],
  ['intro', '簡短介紹', '今天到貨，新鮮漂亮，適合送禮自用。', 0.88, 500],
  ['notice', '訂購提醒', '私訊預留，售完為止', 0.88, 700]
];
const SIZES = {
  portrait: { label: 'IG貼文直式 4:5', w: 1080, h: 1350 },
  story: { label: 'IG限時動態 9:16', w: 1080, h: 1920 },
  square: { label: '正方形 1:1', w: 1080, h: 1080 }
};
const DEFAULT = {
  size: 'portrait', image: { x: 0, y: 0, scale: 1 },
  textBox: { x: 65, y: 840, width: 950, fontSize: 46, weight: 700, align: 'left', color: '#ffffff', bgAlpha: 0.48 },
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
  <div class="stage-actions"><label class="primary file">選擇水果照片<input id="file" type="file" accept="image/*"></label><button id="exportBtn" class="primary">匯出 PNG／分享</button><button id="fitBtn" class="ghost wide">照片自動填滿／重置位置</button></div>
  <p id="hint" class="hint">照片會立即顯示；文字與版面會自動保留，照片本身重新整理後可能需重選。</p>
</section>
<section class="panel">
  <details open><summary>尺寸與照片</summary><div class="grid"><label>輸出尺寸<select id="size"></select></label><label>照片縮放<input id="imgScale" type="range" min="0.2" max="4" step="0.01"></label></div><p class="hint">照片會保持鋪滿畫布；拖曳時會自動避免露出底色。</p></details>
  <details open><summary>文字內容</summary><div id="fields"></div></details>
  <details><summary>文字樣式</summary><div class="grid"><label>文字大小<input id="fontSize" type="range" min="22" max="92" step="1"></label><label>文字框寬度<input id="boxWidth" type="range" min="320" max="1000" step="1"></label><label>粗細<select id="weight"><option value="400">一般</option><option value="700">粗體</option><option value="900">超粗</option></select></label><label>對齊<select id="align"><option value="left">靠左</option><option value="center">置中</option><option value="right">靠右</option></select></label><label>文字顏色<input id="color" type="color"></label><label>底色透明度<input id="bgAlpha" type="range" min="0" max="0.85" step="0.01"></label></div></details>
</section>
</main>`;
const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const els = Object.fromEntries(['file','exportBtn','clearBtn','fitBtn','size','imgScale','fontSize','boxWidth','weight','align','color','bgAlpha','hint'].map(id=>[id,document.getElementById(id)]));
for (const [key, s] of Object.entries(SIZES)) els.size.add(new Option(s.label, key));
document.querySelector('#fields').innerHTML = FIELDS.map(([id,label]) => `<div class="field"><label><input type="checkbox" data-visible="${id}"> 顯示${label}</label><input data-value="${id}" placeholder="${label}"></div>`).join('');

function loadState(){
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'); } catch {}
  const next = structuredClone(DEFAULT); Object.assign(next, saved); next.image = { ...DEFAULT.image, ...(saved.image||{}) }; next.textBox = { ...DEFAULT.textBox, ...(saved.textBox||{}) }; next.fields = { ...DEFAULT.fields, ...(saved.fields||{}) };
  return next;
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); isDirty = true; }
function size(){ return SIZES[state.size]; }
function coverScale(){ const s=size(); return imageBitmap ? Math.max(s.w/imageBitmap.width, s.h/imageBitmap.height) : 1; }
function clamp(v,min,max){ return Math.min(max, Math.max(min, v)); }
function clampImage(){
  if(!imageBitmap) return; const s=size(), minScale=coverScale(); state.image.scale=Math.max(state.image.scale, minScale);
  const iw=imageBitmap.width*state.image.scale, ih=imageBitmap.height*state.image.scale;
  state.image.x = iw<=s.w ? (s.w-iw)/2 : clamp(state.image.x, s.w-iw, 0);
  state.image.y = ih<=s.h ? (s.h-ih)/2 : clamp(state.image.y, s.h-ih, 0);
}
function resetImageCover(){ if(!imageBitmap) return; const s=size(), scale=coverScale(); state.image={x:(s.w-imageBitmap.width*scale)/2,y:(s.h-imageBitmap.height*scale)/2,scale}; updateScaleControl(); }
function clampTextBox(){
  const s=size(); const tb=state.textBox; const minW=Math.min(320, s.w - SAFE*2); const maxW=s.w - SAFE*2;
  tb.width = clamp(tb.width || Math.round(s.w*0.88), minW, maxW);
  tb.x = clamp(tb.x, SAFE, s.w - SAFE - tb.width);
  const h = measureTextBox().height; tb.y = clamp(tb.y, SAFE, Math.max(SAFE, s.h - SAFE - h));
  els.boxWidth.min = minW; els.boxWidth.max = maxW; els.boxWidth.value = tb.width;
}
function updateScaleControl(){ const min=coverScale(); els.imgScale.min=min.toFixed(3); els.imgScale.max=Math.max(4, min*3).toFixed(2); els.imgScale.value=state.image.scale; }
function syncControls(){
  els.size.value = state.size; els.fontSize.value = state.textBox.fontSize; els.weight.value = state.textBox.weight; els.align.value = state.textBox.align; els.color.value = state.textBox.color; els.bgAlpha.value = state.textBox.bgAlpha; updateScaleControl();
  FIELDS.forEach(([id]) => { document.querySelector(`[data-value="${id}"]`).value = state.fields[id].value; document.querySelector(`[data-visible="${id}"]`).checked = state.fields[id].visible; });
}
function fitCanvas(){ const s=size(); const maxW = Math.min(window.innerWidth - 24, 520); canvas.style.width = `${maxW}px`; canvas.style.height = `${maxW*s.h/s.w}px`; canvas.width=s.w; canvas.height=s.h; if(imageBitmap) clampImage(); clampTextBox(); draw(); }
function measureTextBox(){ return buildTextLines(false); }
function draw(){
  const s=size(); ctx.clearRect(0,0,s.w,s.h); ctx.fillStyle='#fb923c'; ctx.fillRect(0,0,s.w,s.h);
  if(imageBitmap){ clampImage(); const iw=imageBitmap.width*state.image.scale, ih=imageBitmap.height*state.image.scale; ctx.drawImage(imageBitmap, state.image.x, state.image.y, iw, ih); }
  else { ctx.fillStyle='rgba(255,255,255,.7)'; ctx.font='700 48px system-ui'; ctx.textAlign='center'; ctx.fillText('請選擇水果照片', s.w/2, s.h/2); }
  clampTextBox(); const tb=state.textBox, pad=28, box=buildTextLines(true); ctx.fillStyle=`rgba(17,24,39,${tb.bgAlpha})`; roundRect(ctx,tb.x,tb.y,tb.width,box.height,28); ctx.fill();
  for(const line of box.lines){ ctx.font=`${line.weight} ${line.size}px -apple-system,BlinkMacSystemFont,"Noto Sans TC",sans-serif`; ctx.fillStyle=tb.color; ctx.textAlign=tb.align; ctx.textBaseline='top'; const tx=tb.align==='left'?tb.x+pad:tb.align==='center'?tb.x+tb.width/2:tb.x+tb.width-pad; ctx.fillText(line.text,tx,tb.y+pad+line.y); }
  if(imageInfo) els.hint.textContent = imageInfo;
}
function buildTextLines(applyUserWeight){
  const tb=state.textBox, pad=28, maxWidth=Math.max(1, tb.width-pad*2); const lines=[]; let y=0;
  for(const [id,label,,ratio,defaultWeight] of FIELDS){
    const field=state.fields[id]; if(!field?.visible || !field.value.trim()) continue;
    const text = id==='name' ? field.value.trim() : `${label}：${field.value.trim()}`; const fontSize=Math.round(tb.fontSize*ratio); const weight=applyUserWeight ? Math.max(Number(tb.weight), defaultWeight) : defaultWeight; const lineHeight=fontSize*1.3;
    ctx.font=`${weight} ${fontSize}px -apple-system,BlinkMacSystemFont,"Noto Sans TC",sans-serif`;
    for(const wrapped of wrapText(text, maxWidth)){ lines.push({text:wrapped, size:fontSize, weight, y}); y += lineHeight; }
    y += fontSize*0.18;
  }
  return { lines, height: Math.max(90, y + pad*2) };
}
function wrapText(text, maxWidth){
  const result=[]; let line=''; const tokens=text.split(/(\s+)/).filter(Boolean);
  const units = tokens.some(t=>t.trim().length>8) ? [...text] : tokens;
  for(const unit of units){ const next=line+unit; if(line && ctx.measureText(next).width>maxWidth){ result.push(line.trimEnd()); line=unit.trimStart(); } else line=next; }
  while(line && ctx.measureText(line).width>maxWidth){ let cut=1; while(cut<line.length && ctx.measureText(line.slice(0,cut+1)).width<=maxWidth) cut++; result.push(line.slice(0,cut)); line=line.slice(cut); }
  if(line.trim()) result.push(line.trimEnd()); return result;
}
function roundRect(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
async function loadImage(file){
  const url=URL.createObjectURL(file); const blob=await file.arrayBuffer().then(b=>new Blob([b],{type:file.type}));
  try { imageBitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch { imageBitmap = await new Promise((res,rej)=>{ const img=new Image(); img.onload=()=>res(img); img.onerror=rej; img.src=url; }); }
  resetImageCover(); imageInfo=`已載入：${file.name}。照片已自動填滿畫布，可拖曳與縮放但不會露出底色。`; save(); syncControls(); draw(); URL.revokeObjectURL(url);
}
function pos(e){ const r=canvas.getBoundingClientRect(); const t=e.touches?.[0]||e; return {x:(t.clientX-r.left)*canvas.width/r.width,y:(t.clientY-r.top)*canvas.height/r.height}; }
let drag=null; canvas.addEventListener('pointerdown',e=>{ const p=pos(e), tb=state.textBox, box=buildTextLines(false); const target = p.x>=tb.x&&p.x<=tb.x+tb.width&&p.y>=tb.y&&p.y<=tb.y+box.height ? 'text':'image'; drag={target, p, ox: target==='text'?tb.x:state.image.x, oy: target==='text'?tb.y:state.image.y}; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove',e=>{ if(!drag) return; const p=pos(e), dx=p.x-drag.p.x, dy=p.y-drag.p.y; if(drag.target==='text'){ state.textBox.x=drag.ox+dx; state.textBox.y=drag.oy+dy; clampTextBox(); } else { state.image.x=drag.ox+dx; state.image.y=drag.oy+dy; clampImage(); } draw(); });
canvas.addEventListener('pointerup',()=>{ if(drag){ drag=null; save(); }});
['size','imgScale','fontSize','boxWidth','weight','align','color','bgAlpha'].forEach(id=>els[id].addEventListener('input',()=>{ if(id==='size'){ state.size=els[id].value; resetImageCover(); const s=size(); state.textBox.width=Math.round(s.w*0.88); state.textBox.x=Math.round((s.w-state.textBox.width)/2); state.textBox.y=Math.round(s.h*0.62); } else if(id==='imgScale') state.image.scale=+els[id].value; else if(id==='fontSize') state.textBox.fontSize=+els[id].value; else if(id==='boxWidth') state.textBox.width=+els[id].value; else if(id==='bgAlpha') state.textBox.bgAlpha=+els[id].value; else state.textBox[id]=els[id].value; if(id==='imgScale') clampImage(); clampTextBox(); save(); fitCanvas(); }));
document.querySelector('#fields').addEventListener('input',e=>{ const id=e.target.dataset.value||e.target.dataset.visible; if(!id) return; if(e.target.dataset.value) state.fields[id].value=e.target.value; else state.fields[id].visible=e.target.checked; clampTextBox(); save(); draw(); });
els.file.addEventListener('change',e=> e.target.files?.[0] && loadImage(e.target.files[0]));
els.fitBtn.addEventListener('click',()=>{ resetImageCover(); save(); draw(); });
els.clearBtn.addEventListener('click',()=>{ if(confirm('確定清除本次文字內容與版面設定？照片也會從預覽移除。')){ localStorage.removeItem(STORAGE_KEY); state=structuredClone(DEFAULT); imageBitmap=null; imageInfo='已清除，請重新選擇照片。'; syncControls(); fitCanvas(); }});
els.exportBtn.addEventListener('click',async()=>{ draw(); canvas.toBlob(async blob=>{ const file=new File([blob],'市場阿怡水果卡.png',{type:'image/png'}); if(navigator.canShare?.({files:[file]})){ await navigator.share({files:[file],title:'市場阿怡水果卡'}); } else { const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=file.name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); } },'image/png',0.96); });
window.addEventListener('resize',fitCanvas); window.addEventListener('beforeunload',()=>{ if(isDirty) save(); });
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
syncControls(); fitCanvas();
