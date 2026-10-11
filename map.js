(function () {
  "use strict";

  var config = window.TRIP_CONFIG || {};
  var dialog = document.getElementById("routeMapDialog");
  var map = null;

  function dayById(id) { return (config.days || []).find(function (day) { return day.id === id; }); }
  function routeUrl(points) {
    if (!points.length) return "https://www.google.com/maps";
    var origin = points[0].name;
    var destination = points[points.length - 1].name;
    var waypoints = points.slice(1, -1).map(function (point) { return point.name; }).join("|");
    var url = "https://www.google.com/maps/dir/?api=1&travelmode=transit&origin=" + encodeURIComponent(origin) + "&destination=" + encodeURIComponent(destination);
    if (waypoints) url += "&waypoints=" + encodeURIComponent(waypoints);
    return url;
  }
  function marker(number) {
    return window.L.divIcon({ className: "route-marker-wrap", html: '<span class="route-marker">' + number + "</span>", iconSize: [30, 30], iconAnchor: [15, 15] });
  }
  function open(day, slotDate) {
    if (!dialog || !day || !Array.isArray(day.route) || !day.route.length) return;
    document.getElementById("mapDialogDate").textContent = slotDate || day.date;
    document.getElementById("mapDialogTitle").textContent = day.title;
    var list = document.getElementById("dialogMapStops"); list.replaceChildren();
    day.route.forEach(function (point) { var item = document.createElement("li"); item.textContent = point.name; list.appendChild(item); });
    document.getElementById("dialogMapRoute").href = routeUrl(day.route);
    dialog.showModal();
    setTimeout(function () {
      var canvas = document.getElementById("dialogMap");
      if (map) map.remove(); map = null; canvas.replaceChildren();
      if (!window.L || !navigator.onLine) { canvas.textContent = "離線時無法載入底圖；仍可查看右側站點順序。"; return; }
      if (location.protocol === "file:") { canvas.textContent = "本機檔案模式不下載地圖底圖。可查看站點或開啟 Google Maps；以 HTTP(S) 開啟本範本可顯示底圖。"; return; }
      var plotted = day.route.filter(function (point) { return Number.isFinite(point.lat) && Number.isFinite(point.lng); });
      if (!plotted.length) { canvas.textContent = "未填座標；仍可查看站點順序或開啟 Google Maps 導航。"; return; }
      map = window.L.map(canvas, { scrollWheelZoom: true }).setView([plotted[0].lat, plotted[0].lng], 12);
      window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
      var points = plotted.map(function (point) { return [point.lat, point.lng]; });
      var line = window.L.polyline(points, { color: "#d9654f", weight: 4, opacity: .85, dashArray: "8 7" }).addTo(map);
      day.route.forEach(function (point, index) { if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return; var label = document.createElement("b"); label.textContent = point.name; window.L.marker([point.lat, point.lng], { icon: marker(index + 1) }).bindPopup(label).addTo(map); });
      map.fitBounds(line.getBounds(), { padding: [36, 36], maxZoom: 14, animate: false });
    }, 40);
  }
  document.getElementById("dayList").addEventListener("click", function (event) {
    var button = event.target.closest("[data-open-map]");
    if (button) open(dayById(button.dataset.openMap), button.dataset.mapDate);
  });
  dialog.addEventListener("close", function () { if (map) map.remove(); map = null; });
})();
