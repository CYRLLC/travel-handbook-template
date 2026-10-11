(function () {
  "use strict";

  var config = window.TRIP_CONFIG || {};
  var prefix = String(config.projectKey || "travel-handbook") + ".weather.v1";
  var refreshMs = 3 * 60 * 60 * 1000;
  var running = false;
  var cache = readCache();

  function readCache() {
    try {
      var value = JSON.parse(localStorage.getItem(prefix) || "null");
      return value && value.data && Number.isFinite(value.fetchedAt) ? value : null;
    } catch (error) { return null; }
  }
  function icon(code) {
    if (code === 0) return ["☀️", "晴"];
    if (code <= 3) return ["⛅", "多雲"];
    if (code <= 48) return ["🌫️", "霧"];
    if (code <= 67) return ["🌧️", "雨"];
    if (code <= 77) return ["❄️", "雪"];
    if (code <= 86) return ["🌦️", "陣雨"];
    if (code <= 99) return ["⛈️", "雷雨"];
    return ["☁", "未明"];
  }
  function daysFromToday(date) {
    var parts = new Intl.DateTimeFormat("en-CA", { timeZone: config.timezone || "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    var data = {}; parts.forEach(function (part) { data[part.type] = part.value; });
    var today = data.year + "-" + data.month + "-" + data.day;
    return Math.round((Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86400000);
  }
  function render() {
    document.querySelectorAll("[data-day-card]").forEach(function (card) {
      var box = card.querySelector(".day-weather"); if (!box) return;
      var date = card.dataset.weatherDate;
      var location = card.dataset.weatherName || "當地";
      var key = [card.dataset.weatherLat, card.dataset.weatherLng].join(",");
      var daily = cache && cache.data[key] && cache.data[key].daily;
      var index = daily ? daily.time.indexOf(date) : -1;
      var distance = daysFromToday(date);
      var symbol = box.querySelector(":scope > span"); var title = box.querySelector("b"); var detail = box.querySelector("small");
      if (!config.features || !config.features.weather) {
        symbol.textContent = "☁"; title.textContent = "天氣未啟用"; detail.textContent = "可在旅程設定中開啟。";
      } else if (card.dataset.weatherLat === "null" || card.dataset.weatherLng === "null") {
        symbol.textContent = "☁"; title.textContent = "尚未填寫城市座標"; detail.textContent = "編輯每日行程以加入座標。";
      } else if (distance < 0) {
        symbol.textContent = "✓"; title.textContent = location + " · 日期已過"; detail.textContent = "不再顯示預報。";
      } else if (!daily || index < 0 || daily.weather_code[index] == null) {
        symbol.textContent = "☁"; title.textContent = location + " · 尚無逐日預報"; detail.textContent = distance > 15 ? "超出目前預報範圍。" : "連線後自動更新；不以平均氣候冒充預報。";
      } else {
        var label = icon(daily.weather_code[index]);
        symbol.textContent = label[0];
        title.textContent = location + " · " + label[1] + " · " + Math.round(daily.temperature_2m_min[index]) + "–" + Math.round(daily.temperature_2m_max[index]) + "°C";
        detail.textContent = "最高降雨機率 " + (daily.precipitation_probability_max[index] == null ? "未提供" : Math.round(daily.precipitation_probability_max[index]) + "%") + (navigator.onLine ? "" : " · 離線快取");
      }
    });
  }
  function refresh() {
    if (!config.features || !config.features.weather || !navigator.onLine || running || document.visibilityState === "hidden") return;
    if (cache && Date.now() - cache.fetchedAt < refreshMs) { render(); return; }
    var locations = {};
    (config.days || []).forEach(function (day) { if (day.location && Number.isFinite(day.location.lat) && Number.isFinite(day.location.lng) && daysFromToday(day.date) >= 0 && daysFromToday(day.date) <= 15) locations[[day.location.lat, day.location.lng].join(",")] = day.location; });
    var entries = Object.entries(locations);
    if (!entries.length) return;
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + entries.map(function (entry) { return entry[1].lat; }).join(",") + "&longitude=" + entries.map(function (entry) { return entry[1].lng; }).join(",") + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=16&timezone=" + encodeURIComponent(config.timezone || "UTC");
    running = true;
    fetch(url, { cache: "no-store" }).then(function (response) { if (!response.ok) throw new Error(String(response.status)); return response.json(); }).then(function (result) {
      var rows = Array.isArray(result) ? result : [result]; var data = {};
      entries.forEach(function (entry, index) { if (rows[index] && rows[index].daily) data[entry[0]] = rows[index]; });
      cache = { data: data, fetchedAt: Date.now() };
      try { localStorage.setItem(prefix, JSON.stringify(cache)); } catch (error) {}
      render();
    }).catch(render).finally(function () { running = false; });
  }
  window.addEventListener("tripdaysrendered", render);
  window.addEventListener("online", refresh);
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
  window.setInterval(refresh, refreshMs);
  render(); refresh();
})();
