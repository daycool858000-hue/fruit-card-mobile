import { mkdir, rm, cp, readFile, writeFile } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
await cp('src', 'dist/src', { recursive: true });
let html = await readFile('index.html', 'utf8');
await writeFile('dist/index.html', html);
console.log('已建立 dist，可部署到 GitHub Pages。');
