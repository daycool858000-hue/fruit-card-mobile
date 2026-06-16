# 市場阿怡水果照片加字工具

這是一個第一階段可用的 PWA 網頁工具，目標是讓市場阿怡可以只用 iPhone Safari 完成水果照片加字、排版、匯出 PNG、分享或儲存圖片。

## 已完成的第一階段功能

- 從 iPhone 相簿選擇水果照片。
- 照片上傳後立即顯示在預覽畫布。
- 使用瀏覽器圖片解碼能力自動處理手機照片 EXIF 方向。
- 可直接拖曳照片位置。
- 可用滑桿縮放照片。
- 支援三種輸出尺寸：
  - IG貼文直式 4:5
  - IG限時動態 9:16
  - 正方形 1:1
- 可輸入並即時顯示：水果名稱、價格、產地、規格、風味、簡短介紹、訂購提醒。
- 每個欄位可個別顯示或隱藏。
- 可拖曳文字區塊位置。
- 可調整文字大小、粗細、對齊、顏色、底色透明度。
- 文字內容與版面設定會保存到 `localStorage`，重新整理後仍會保留。
- 提供「清除本次內容」按鈕，清除前會跳出確認。
- 可輸出 PNG。
- 在支援 Web Share API 的 iPhone Safari，可開啟系統分享選單分享或儲存圖片；不支援時會改用下載。
- 已加入 PWA manifest 與 service worker，可加入 iPhone 主畫面像 App 一樣開啟。
- 全站介面與文件使用繁體中文。

## 如何在本機測試

```bash
npm run check
npm run build
npm run dev
```

開啟 `http://localhost:5173` 後即可測試。若要測試 iPhone，請讓手機與電腦在同一個網路，改用電腦區網 IP 開啟。

## 如何部署到 GitHub Pages

本專案已提供 `.github/workflows/deploy.yml`。部署步驟如下：

1. 將程式碼推送到 GitHub 的 `main` 分支。
2. 到 GitHub repository 的 **Settings → Pages**。
3. Source 選擇 **GitHub Actions**。
4. Actions 會執行 `npm run build`，並把 `dist` 內容部署到 GitHub Pages。

固定網址通常會是：

```text
https://<你的 GitHub 帳號>.github.io/fruit-card-mobile/
```

若 repository 屬於 organization，請將 `<你的 GitHub 帳號>` 換成 organization 名稱。實際網址也會顯示在 GitHub Actions 的部署結果中。

## iPhone Safari 使用方式

1. 用 iPhone Safari 開啟 GitHub Pages 網址。
2. 點「選擇水果照片」，從相簿選一張水果照片。
3. 在照片上拖曳可調整照片位置。
4. 使用「照片縮放」滑桿調整照片大小。
5. 編輯水果名稱、價格、產地等欄位，文字會即時顯示在照片上。
6. 拖曳文字區塊調整位置。
7. 切換 IG 貼文、限時動態或正方形尺寸。
8. 點「匯出 PNG／分享」，Safari 會優先開啟系統分享選單，可儲存圖片或分享到其他 App。
9. 點 Safari 分享按鈕，選「加入主畫面」，下次可像 App 一樣開啟。

## 保存策略與限制

- 第一階段會保存文字內容、欄位顯示狀態、照片位置、縮放比例與文字樣式設定。
- 保存方式使用瀏覽器 `localStorage`。
- 第一階段不強制保存原始照片檔案，因為 iPhone Safari 對大型照片與瀏覽器儲存空間較敏感；若重新整理後照片消失，重新選擇照片即可，不會影響文字與版面設定。
- 本工具不使用後端、不需要登入、不使用資料庫、不包含 API 金鑰。

## 待改進項目

- 加入更多文字模板與常用水果範本。
- 支援多個文字區塊或貼紙。
- 更細緻的雙指縮放與旋轉。
- 若未來確認 iPhone Safari 儲存大型圖片穩定，可改用 IndexedDB 保存照片。
