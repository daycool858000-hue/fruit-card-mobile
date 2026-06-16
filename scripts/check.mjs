import { access, readFile } from 'node:fs/promises';
const files=['index.html','src/main.js','src/styles.css','public/manifest.webmanifest','public/sw.js','.github/workflows/deploy.yml'];
for (const f of files) await access(f);
const js=await readFile('src/main.js','utf8');
for (const token of ['toBlob','navigator.share','localStorage','createImageBitmap','serviceWorker']) if(!js.includes(token)) throw new Error(`缺少 ${token}`);
console.log('基本檔案與關鍵功能檢查通過。');
