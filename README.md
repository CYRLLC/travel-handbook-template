# Travel Handbook Template｜旅遊手冊範本

可開源、可自行修改的通用旅遊手冊範本。用頁面表單建立任何目的地的旅程，管理每日活動、交通、預約與檢查表，並把資料保存到自己的瀏覽器。

A reusable static travel handbook with local trip editing, backup/restore and offline support. No account, server database or API key is required.

## 一般使用者

1. 解壓縮 `travel-handbook-template.zip`，保留檔案的相對位置。
2. 用 Chrome／Edge 開啟 `index.html`。
3. 按「建立旅程」開始填表，或複製現有範例。
4. 定期「匯出完整旅程」，在清除瀏覽器資料或換裝置前保存備份。

完整操作：[使用說明.html](使用說明.html)。開發者也可以直接 clone 此倉庫，開啟 `index.html`；一般使用者不需要安裝 Node.js 或修改程式。

## 功能

- 管理多趟旅程：名稱、日期、旅伴、時區、幣別與住宿。
- 編輯每日活動、交通費用、路線與參考連結。
- 交換未鎖定的行程日期，保留固定交通／預約日。
- 檢查表、備註、待購清單與本機留言／動態。
- 匯出完整旅程並還原；匯入建立新旅程，不覆蓋已有旅程。
- 匯出可重用模板：清空進度與紀錄，將旅伴改為通用暱稱。
- 手機／電腦版面；以 HTTPS 上架後可安裝為 PWA 並離線開啟已載入內容。

每趟最多 60 天，可保存 40 趟；匯入上限 5 MB，待購與留言各 200 筆。

## 個人資料與限制

範例使用通用暱稱與示例行程。程式沒有登入、遠端寫入 API、雲端資料庫、分析追蹤或即時多人同步。

旅程保存在目前瀏覽器的 localStorage，沒有加密；同一網站來源（origin）的其他程式也可能讀取這些資料。共用裝置或部署時請使用可信、獨立的網站來源，不要把身分證件、QR、票券代碼與憑證放入手冊。

「完整旅程」匯出檔包含你的私人內容；「可重用模板」仍保留行程文字、住宿、預約與連結，**不等於自動匿名化**。公開分享前請人工檢查。私人匯出檔不得加入 Git、issue、PR 或網站 ZIP。

換瀏覽器、清除資料、搬動本機檔案或更換網站來源，可能看不到先前旅程，請先匯出再匯入。旅伴交換檔案時需要自行約定最新版，沒有多人修改合併功能。

## 地圖與天氣

- 地圖只在使用者開啟時向 OpenStreetMap 請求底圖，不預先下載、不離線快取遠端圖磚。本機 `file://` 模式只顯示站點與 Google Maps 導航連結；以 HTTP(S) 開啟可使用底圖。
- 天氣預設關閉。啟用後會將城市座標與時區送到 Open-Meteo，頁面保留來源與 CC BY 4.0 標示。
- MIT 授權允許重用此程式，但不涵蓋外部服務的存取權或用量；Open-Meteo 免費 API 的非商業限制、OSM 圖磚使用政策另行適用。商業版本請選擇合適服務或保持天氣關閉。

詳見 [第三方授權與服務條件](THIRD_PARTY_NOTICES.md)。

## 維護者開發與測試

需要 Node.js 20+ 與 PowerShell 7（`pwsh`）。

```sh
npm ci
npx playwright install chromium
npm test
npm run build
```

Windows 標準位置已安裝 Chrome 時，測試會使用該 Chrome；也可設定 `CHROME_PATH`。其他系統使用安裝的 Playwright Chromium。套件版本固定在 `package-lock.json`。

測試涵蓋本機檔案與靜態 HTTP、表單、備份還原、旅程隔離、鎖定／交換日期、無效與惡意匯入、儲存容量不足、320px／390px 手機版面與 PWA 離線載入。GitHub Actions 執行相同測試並建置 ZIP，不部署網站，也不使用任何憑證。

`build.ps1` 只複製明確列出的公開檔案到 `dist/`，輸出 `travel-handbook-template.zip`。它不會把瀏覽器資料或旅程備份打包進去。

## 靜態部署

目前只公開原始碼，沒有自動上架網站。需要部署時，可由擁有者選擇 Cloudflare Pages 的 Direct Upload 專案並上傳建置 ZIP。PWA 需要 HTTPS；本機編輯不需要雲端服務。

`_headers` 提供 Cloudflare Pages 安全標頭與 CSP，其他靜態主機不一定會讀取它，需自行設定相同標頭。不要假設把檔案放到 GitHub Pages 後這些標頭會自動生效。

## 開源授權與參與

- 原始程式、文件與通用示例採 [MIT](LICENSE)。
- Leaflet 1.9.4 採 BSD-2-Clause，完整原始授權保留在 `vendor/leaflet-LICENSE.txt`。
- [CONTRIBUTING.md](CONTRIBUTING.md)：开发流程與 PR 檢查。
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)：社群互動與資料隱私。
- [SECURITY.md](SECURITY.md)：安全限制與私密漏洞回報。
- [CHANGELOG.md](CHANGELOG.md)：版本變更。

Fork 後可以改成自己的通用範本；請保留授權，並只使用有權分享、已移除個人資訊的素材。不要把實際旅遊照片、匯出備份或個人訂位資料提交到公開倉庫。
