(function () {
  "use strict";

  // 公開示例集中於此。使用者直接在頁面上編輯，新旅程保存在瀏覽器。
  // 範例內容皆為虛構資料；請勿把票券 QR Code、護照號碼、訂房代碼或私人地址提交到 Git。
  window.TRIP_CONFIG = {
    schemaVersion: 1,
    features: { weather: false },
    projectKey: "travel-handbook",
    title: "下一趟旅程",
    subtitle: "填好表單，就能開始下一趟旅程",
    locale: "zh-TW",
    timezone: "Asia/Tokyo",
    currency: "JPY",
    travelers: ["旅伴 A", "旅伴 B"],
    dates: { start: "2027-04-10", end: "2027-04-12" },
    base: { name: "住宿地點", lat: 35.6812, lng: 139.7671 },
    intro: [
      { label: "先確認", title: "交通與住宿", text: "只放一般提醒；訂位代碼與證件資料留在安全的私人空間。" },
      { label: "共同決定", title: "每日節奏", text: "固定預約日鎖定，其餘行程可以在頁面上交換日期。" },
      { label: "離線可看", title: "出發前安裝", text: "加入手機主畫面後，已開啟過的內容可在離線時查看。" }
    ],
    days: [
      {
        id: "day-01",
        date: "2027-04-10",
        title: "抵達・入住・附近散步",
        pace: "慢",
        locked: true,
        lockReason: "交通與住宿日",
        location: { name: "目的地城市", lat: 35.6812, lng: 139.7671 },
        route: [
          { name: "主要車站", lat: 35.6812, lng: 139.7671 },
          { name: "住宿地點", lat: 35.6895, lng: 139.6917 }
        ],
        timeline: [
          { time: "上午", title: "抵達目的地", note: "預留入境、領行李與轉乘緩衝。" },
          { time: "下午", title: "入住或寄放行李", note: "不安排必須準時抵達的景點。" },
          { time: "晚上", title: "住宿附近用餐", note: "依體力決定是否散步。" }
        ],
        transport: "填入機場／車站至住宿的路線與每人預估費用。",
        links: [
          { label: "交通官方網站", url: "https://example.com/transport" }
        ]
      },
      {
        id: "day-02",
        date: "2027-04-11",
        title: "主要景點・在地午餐",
        pace: "中",
        locked: false,
        lockReason: "",
        location: { name: "目的地城市", lat: 35.6764, lng: 139.6500 },
        route: [
          { name: "住宿地點", lat: 35.6895, lng: 139.6917 },
          { name: "主要景點", lat: 35.6764, lng: 139.6500 },
          { name: "晚餐區域", lat: 35.6938, lng: 139.7034 }
        ],
        timeline: [
          { time: "10:00", title: "主要景點", note: "填入營業時間、票券與停留時間。" },
          { time: "13:00", title: "午餐", note: "記錄是否需要預約，以及臨時備選。" },
          { time: "15:00", title: "街區散步", note: "保留休息與購物時間。" }
        ],
        transport: "填入當日移動方式、轉乘次數與兩人預估費用。",
        links: [
          { label: "景點官方網站", url: "https://example.com/attraction" },
          { label: "餐廳資訊", url: "https://example.com/restaurant" }
        ]
      },
      {
        id: "day-03",
        date: "2027-04-12",
        title: "彈性日・補買・返程",
        pace: "慢",
        locked: false,
        lockReason: "",
        location: { name: "目的地城市", lat: 35.6812, lng: 139.7671 },
        route: [
          { name: "住宿地點", lat: 35.6895, lng: 139.6917 },
          { name: "購物區", lat: 35.6812, lng: 139.7671 }
        ],
        timeline: [
          { time: "上午", title: "尚未完成的清單", note: "先看待購與檢查表。" },
          { time: "下午", title: "彈性活動", note: "依天氣與體力選擇室內或戶外。" },
          { time: "晚上", title: "整理行李", note: "確認證件、重量與隔日交通。" }
        ],
        transport: "填入補買區域與返程交通預估。",
        links: []
      }
    ],
    reservations: [
      { title: "示例：指定席車票", date: "2027-04-10 09:00", status: "待確認", url: "https://example.com/reservation" },
      { title: "示例：晚餐", date: "2027-04-11 18:30", status: "尚未預約", url: "https://example.com/dinner" }
    ],
    checklist: [
      { title: "文件", items: ["護照效期確認", "交通票券已下載至手機", "旅遊保險資料已保存"] },
      { title: "連線與付款", items: ["eSIM／SIM", "交通卡", "信用卡與少量現金"] },
      { title: "行李", items: ["充電器與行動電源", "常備藥", "雨具與舒適鞋"] }
    ],
    commentTopics: ["整體行程", "交通", "住宿", "餐廳／預約", "想買清單"]
  };
})();
