(function () {
  "use strict";

  var config = window.TRIP_CONFIG;
  if (!config || !Array.isArray(config.days)) {
    document.body.textContent = "找不到 trip.config.js，請先建立旅程設定。";
    return;
  }

  var prefix = String(config.projectKey || "travel-handbook") + ".v1";
  var storage = {
    progress: prefix + ".progress",
    traveler: prefix + ".traveler",
    notificationRead: prefix + ".notificationRead"
  };
  var state = { progress: { checks: {}, notes: "", schedule: {} }, shopping: [], shoppingFilter: "all", comments: [], notifications: [], latestNotification: 0, activeDay: "all", moveSource: null };


  function byId(id) { return document.getElementById(id); }
  function node(tag, className, text) {
    var item = document.createElement(tag);
    if (className) item.className = className;
    if (text != null) item.textContent = text;
    return item;
  }
  function safeUrl(value) {
    try {
      var parsed = new URL(value);
      return /^(https?):$/.test(parsed.protocol) ? parsed.href : "";
    } catch (error) { return ""; }
  }
  function dateLabel(value, options) {
    try {
      return new Intl.DateTimeFormat(config.locale || "zh-TW", Object.assign({ timeZone: config.timezone || "UTC" }, options || {})).format(new Date(value + "T12:00:00Z"));
    } catch (error) { return value; }
  }
  function todayKey() {
    var parts = new Intl.DateTimeFormat("en-CA", { timeZone: config.timezone || "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    var data = {};
    parts.forEach(function (part) { data[part.type] = part.value; });
    return data.year + "-" + data.month + "-" + data.day;
  }
  function identity() {
    return localStorage.getItem(storage.traveler) || (config.travelers && config.travelers[0]) || "旅伴 A";
  }
  function rememberIdentity(value) {
    var clean = String(value || "").trim().slice(0, 24);
    if (!clean) return;
    localStorage.setItem(storage.traveler, clean);
    ["shoppingAuthor", "commentAuthor", "notificationTraveler"].forEach(function (id) { if (byId(id)) byId(id).value = clean; });
  }
  function request(url, options) { return window.TravelStore.request(url, options); }

  function renderHeader() {
    document.title = config.title + "｜旅遊手冊範本";
    byId("tripTitle").textContent = config.title;
    byId("tripSubtitle").textContent = config.subtitle || "旅行手冊";
    byId("travelDates").textContent = dateLabel(config.dates.start, { year: "numeric", month: "numeric", day: "numeric" }) + " – " + dateLabel(config.dates.end, { year: "numeric", month: "numeric", day: "numeric" });
    byId("travelers").textContent = (config.travelers || []).join(" × ") || "尚未設定旅伴";
    byId("travelTimezone").textContent = config.timezone || "UTC";
    var grid = byId("introGrid");
    grid.replaceChildren();
    (config.intro || []).forEach(function (entry) {
      var article = node("article", "intro-card");
      article.append(node("small", "", entry.label), node("h3", "", entry.title), node("p", "", entry.text));
      grid.appendChild(article);
    });
  }

  function originalSchedule() {
    var value = {};
    config.days.forEach(function (day) { value[day.id] = day.id; });
    return value;
  }
  function normalizedSchedule(candidate) {
    var original = originalSchedule();
    var movable = config.days.filter(function (day) { return !day.locked; }).map(function (day) { return day.id; });
    var used = new Set();
    movable.forEach(function (slot) {
      var plan = candidate && candidate[slot];
      if (movable.indexOf(plan) >= 0 && !used.has(plan)) { original[slot] = plan; used.add(plan); }
      else original[slot] = null;
    });
    var missing = movable.filter(function (id) { return !used.has(id); });
    movable.forEach(function (slot) { if (!original[slot]) original[slot] = missing.shift() || slot; });
    config.days.filter(function (day) { return day.locked; }).forEach(function (day) { original[day.id] = day.id; });
    return original;
  }
  function dayById(id) { return config.days.find(function (day) { return day.id === id; }); }

  function renderTabs() {
    var tabs = byId("dayTabs");
    tabs.replaceChildren();
    var all = node("button", "", "全部");
    all.type = "button"; all.dataset.day = "all"; all.setAttribute("role", "tab");
    tabs.appendChild(all);
    config.days.forEach(function (day) {
      var button = node("button", "", dateLabel(day.date, { month: "numeric", day: "numeric" }));
      button.type = "button"; button.dataset.day = day.id; button.setAttribute("role", "tab");
      tabs.appendChild(button);
    });
    tabs.addEventListener("click", function (event) {
      var button = event.target.closest("[data-day]");
      if (!button) return;
      state.activeDay = button.dataset.day;
      applyDayFilter();
    });
  }
  function applyDayFilter() {
    document.querySelectorAll("#dayTabs [data-day]").forEach(function (button) {
      button.setAttribute("aria-selected", String(button.dataset.day === state.activeDay));
    });
    document.querySelectorAll("[data-day-card]").forEach(function (card) {
      card.hidden = state.activeDay !== "all" && card.dataset.dayCard !== state.activeDay;
    });
    if (state.activeDay === "all") byId("dayViewStatus").textContent = "目前顯示全部行程。";
    else {
      var slot = dayById(state.activeDay);
      byId("dayViewStatus").textContent = "目前顯示 " + dateLabel(slot.date, { month: "numeric", day: "numeric", weekday: "long" }) + "。";
    }
  }

  function renderDays() {
    state.progress.schedule = normalizedSchedule(state.progress.schedule);
    var list = byId("dayList");
    list.replaceChildren();
    config.days.forEach(function (slot) {
      var plan = dayById(state.progress.schedule[slot.id]) || slot;
      var card = node("article", "day-card");
      card.dataset.dayCard = slot.id;
      card.dataset.planId = plan.id;
      card.dataset.scheduleLocked = String(Boolean(slot.locked));
      card.dataset.weatherDate = slot.date;
      card.dataset.weatherName = plan.location.name;
      card.dataset.weatherLat = plan.location.lat;
      card.dataset.weatherLng = plan.location.lng;

      var date = node("div", "day-date");
      date.append(node("strong", "", dateLabel(slot.date, { day: "2-digit" })), node("span", "", dateLabel(slot.date, { month: "long", weekday: "short" })));
      var main = node("div", "day-main");
      var heading = node("div", "day-title");
      var titleWrap = node("div");
      titleWrap.append(node("span", "pill", slot.locked ? "已鎖定" : "可調動"), node("h3", "", plan.title));
      heading.append(titleWrap, node("span", "pace", plan.pace || "中"));
      if (!slot.locked) {
        var move = node("button", "move-button", "調動");
        move.type = "button"; move.dataset.moveDay = slot.id;
        heading.appendChild(move);
      } else {
        heading.appendChild(node("small", "lock-label", slot.lockReason || "固定行程"));
      }
      var edit = node("button", "secondary-button", "編輯行程");
      edit.type = "button"; edit.dataset.editDay = slot.id; heading.appendChild(edit);
      main.appendChild(heading);

      var weather = node("div", "day-weather");
      weather.innerHTML = '<span aria-hidden="true">☁</span><div><b>讀取當地天氣…</b><small></small></div>';
      main.appendChild(weather);

      var timeline = node("div", "timeline");
      (plan.timeline || []).forEach(function (entry) {
        var row = node("div");
        var detail = node("p");
        detail.append(node("b", "", entry.title), node("span", "", entry.note || ""));
        row.append(node("time", "", entry.time), detail);
        timeline.appendChild(row);
      });
      main.appendChild(timeline);

      var links = node("div", "day-links");
      (plan.links || []).forEach(function (entry) {
        var url = safeUrl(entry.url);
        if (!url) return;
        var anchor = node("a", "", entry.label + " ↗");
        anchor.href = url; anchor.target = "_blank"; anchor.rel = "noreferrer";
        links.appendChild(anchor);
      });
      if (links.childElementCount) main.appendChild(links);
      var transport = node("div", "transport-note");
      transport.append(node("b", "", "交通與費用"), node("span", "", plan.transport || "尚未填寫。"));
      main.appendChild(transport);
      if (Array.isArray(plan.route) && plan.route.length) {
        var mapButton = node("button", "secondary-button map-button", "查看路線地圖");
        mapButton.type = "button"; mapButton.dataset.openMap = plan.id; mapButton.dataset.mapDate = slot.date; main.appendChild(mapButton);
      }
      card.append(date, main); list.appendChild(card);
    });
    applyDayFilter();
    window.dispatchEvent(new CustomEvent("tripdaysrendered"));
  }

  function setupSchedule() {
    byId("dayList").addEventListener("click", function (event) {
      var button = event.target.closest("[data-move-day]");
      if (!button) return;
      state.moveSource = button.dataset.moveDay;
      var sourcePlan = dayById(state.progress.schedule[state.moveSource]);
      byId("moveDescription").textContent = "將「" + sourcePlan.title + "」與另一個未鎖定日期交換。";
      var select = byId("moveTarget"); select.replaceChildren();
      config.days.filter(function (day) { return !day.locked && day.id !== state.moveSource; }).forEach(function (day) {
        var option = node("option", "", dateLabel(day.date, { month: "numeric", day: "numeric", weekday: "short" }));
        option.value = day.id; select.appendChild(option);
      });
      byId("moveDialog").showModal();
    });
    byId("confirmMove").addEventListener("click", function (event) {
      event.preventDefault();
      var target = byId("moveTarget").value;
      if (!state.moveSource || !target) return;
      var sourcePlan = state.progress.schedule[state.moveSource];
      state.progress.schedule[state.moveSource] = state.progress.schedule[target];
      state.progress.schedule[target] = sourcePlan;
      byId("moveDialog").close(); renderDays(); queueSave().catch(function () {});
    });
    byId("resetSchedule").addEventListener("click", function () { state.progress.schedule = originalSchedule(); renderDays(); queueSave().catch(function () {}); });
  }

  function renderReservations() {
    var list = byId("reservationList"); list.replaceChildren();
    (config.reservations || []).forEach(function (entry) {
      var row = node("article", "reservation-row");
      var text = node("div"); text.append(node("h3", "", entry.title), node("p", "", entry.date));
      row.append(node("span", "reservation-status", entry.status), text);
      var url = safeUrl(entry.url);
      if (url) { var link = node("a", "", "官方入口 ↗"); link.href = url; link.target = "_blank"; link.rel = "noreferrer"; row.appendChild(link); }
      list.appendChild(row);
    });
    if (!list.childElementCount) list.appendChild(node("p", "empty-state", "尚未加入預約。"));
  }

  function renderChecklist() {
    var grid = byId("checklistGrid"); grid.replaceChildren();
    (config.checklist || []).forEach(function (group, groupIndex) {
      var article = node("article", "check-group"); article.appendChild(node("h3", "", group.title));
      (group.items || []).forEach(function (label, itemIndex) {
        var key = "check-" + groupIndex + "-" + itemIndex;
        var wrapper = node("label"); var input = document.createElement("input"); input.type = "checkbox"; input.dataset.check = key; input.checked = Boolean(state.progress.checks[key]);
        wrapper.append(input, node("span", "", label)); article.appendChild(wrapper);
      });
      grid.appendChild(article);
    });
    byId("tripNotes").value = state.progress.notes || "";
  }
  function collectProgress() {
    var checks = {};
    document.querySelectorAll("[data-check]").forEach(function (input) { checks[input.dataset.check] = input.checked; });
    return { version: 1, checks: checks, edits: {}, notes: byId("tripNotes").value, schedule: state.progress.schedule };
  }
  function queueSave() {
    state.progress = collectProgress();
    return request("/api/progress", { method: "PUT", body: JSON.stringify({ progress: state.progress }) })
      .then(function () { byId("progressStatus").textContent = "已儲存在這個瀏覽器"; })
      .catch(function (error) { byId("progressStatus").textContent = error.message; throw error; });
  }
  function loadProgress() {
    state.progress = window.TravelStore.current().data.progress;
    state.progress.schedule = normalizedSchedule(state.progress.schedule);
    renderChecklist(); renderDays(); byId("progressStatus").textContent = "已載入本機進度";
  }
  function setupProgress() {
    byId("checklistGrid").addEventListener("change", function () { queueSave().catch(function () {}); });
    byId("tripNotes").addEventListener("input", function () { queueSave().catch(function () {}); });
    byId("exportProgress").addEventListener("click", function () {
      try { window.TravelStore.exportTrip(false, collectProgress()); byId("progressStatus").textContent = "完整備份已匯出"; }
      catch (error) { byId("progressStatus").textContent = error.message; }
    });
    byId("importProgress").addEventListener("change", function (event) {
      var file = event.target.files[0]; if (!file) return;
      if (file.size > 5 * 1024 * 1024) { byId("progressStatus").textContent = "檔案過大，最多 5 MB。"; event.target.value = ""; return; }
      file.text().then(function (text) { window.TravelStore.importTrip(JSON.parse(text)); location.reload(); })
        .catch(function (error) { byId("progressStatus").textContent = "匯入失敗：" + error.message; });
      event.target.value = "";
    });
    byId("printHandbook").addEventListener("click", function () { window.print(); });
  }

  function statusLabel(value) { return { pending: "待安排", planned: "已安排", bought: "已買到", skipped: "不購買" }[value] || value; }
  function renderShopping() {
    var list = byId("shoppingList"); list.replaceChildren();
    var shown = state.shopping.filter(function (item) { return state.shoppingFilter === "all" || item.status === state.shoppingFilter; });
    shown.forEach(function (item) {
      var card = node("article", "shopping-card");
      var heading = node("div", "shopping-card-heading"); heading.append(node("span", "pill", statusLabel(item.status)), node("small", "", item.author));
      card.append(heading, node("h3", "", item.item_name));
      if (item.details) card.appendChild(node("p", "", item.details));
      var editor = node("div", "shopping-editor");
      var select = document.createElement("select"); select.setAttribute("aria-label", "待購狀態");
      ["pending", "planned", "bought", "skipped"].forEach(function (value) { var option = node("option", "", statusLabel(value)); option.value = value; option.selected = item.status === value; select.appendChild(option); });
      var plannedDate = document.createElement("input"); plannedDate.placeholder = "順路日期"; plannedDate.value = item.planned_date || ""; plannedDate.setAttribute("aria-label", "順路日期");
      var location = document.createElement("input"); location.placeholder = "店舖／區域"; location.value = item.buy_location || ""; location.setAttribute("aria-label", "店舖或區域");
      var save = node("button", "secondary-button", "儲存"); save.type = "button";
      save.addEventListener("click", function () { updateShopping(item.id, { status: select.value, planned_date: plannedDate.value, buy_location: location.value }); });
      var remove = node("button", "secondary-button", "移除"); remove.type = "button";
      remove.addEventListener("click", function () { request("/api/shopping?id=" + encodeURIComponent(item.id), { method: "DELETE" }).then(loadShopping).catch(function (error) { byId("shoppingStatus").textContent = error.message; }); });
      editor.append(select, plannedDate, location, save, remove); card.appendChild(editor); list.appendChild(card);
    });
    if (!shown.length) list.appendChild(node("p", "empty-state", "這個分類目前沒有項目。"));
  }
  function loadShopping() {
    byId("shoppingStatus").textContent = "讀取本機清單中…";
    request("/api/shopping").then(function (data) { state.shopping = data.items || []; renderShopping(); byId("shoppingStatus").textContent = "共 " + state.shopping.length + " 項"; }).catch(function () { state.shopping = []; renderShopping(); byId("shoppingStatus").textContent = "無法讀取本機清單"; });
  }
  function updateShopping(id, changes) {
    request("/api/shopping?id=" + encodeURIComponent(id), { method: "PATCH", headers: { "Content-Type": "application/json", "X-Traveler-Name": encodeURIComponent(identity()) }, body: JSON.stringify(changes) })
      .then(loadShopping).catch(function () { byId("shoppingStatus").textContent = "儲存失敗，請匯出備份並檢查瀏覽器儲存空間"; });
  }
  function setupShopping() {
    byId("shoppingAuthor").value = identity();
    byId("shoppingForm").addEventListener("submit", function (event) {
      event.preventDefault(); rememberIdentity(byId("shoppingAuthor").value);
      request("/api/shopping", { method: "POST", headers: { "Content-Type": "application/json", "X-Traveler-Name": encodeURIComponent(identity()) }, body: JSON.stringify({ author: identity(), item_name: byId("shoppingItem").value, details: byId("shoppingDetails").value }) })
        .then(function () { byId("shoppingItem").value = ""; byId("shoppingDetails").value = ""; loadShopping(); })
        .catch(function () { byId("shoppingStatus").textContent = "新增失敗，清單最多 200 項；請檢查瀏覽器儲存空間"; });
    });
    byId("shoppingFilters").addEventListener("click", function (event) {
      var button = event.target.closest("[data-shopping-filter]"); if (!button) return;
      state.shoppingFilter = button.dataset.shoppingFilter;
      document.querySelectorAll("[data-shopping-filter]").forEach(function (item) { item.setAttribute("aria-pressed", String(item === button)); }); renderShopping();
    });
    loadShopping();
  }

  function renderComments() {
    var list = byId("commentList"); list.replaceChildren();
    state.comments.slice().reverse().forEach(function (item) {
      var article = node("article", "comment-item"); var meta = node("div", "comment-meta");
      meta.append(node("b", "", item.author), node("span", "", item.topic), node("time", "", new Date(item.created_at).toLocaleString(config.locale || "zh-TW")));
      article.append(meta, node("p", "", item.message)); list.appendChild(article);
    });
    if (!state.comments.length) list.appendChild(node("p", "empty-state", "還沒有留言。"));
  }
  function loadComments() {
    byId("commentStatus").textContent = "讀取中…";
    request("/api/comments").then(function (data) { state.comments = data.comments || []; renderComments(); byId("commentStatus").textContent = "已更新"; }).catch(function () { state.comments = []; renderComments(); byId("commentStatus").textContent = "無法讀取本機資料"; });
  }
  function setupComments() {
    byId("commentAuthor").value = identity();
    var topics = byId("commentTopic");
    (config.commentTopics || ["整體行程"]).forEach(function (topic) { var option = node("option", "", topic); option.value = topic; topics.appendChild(option); });
    byId("commentsLauncher").addEventListener("click", function () { byId("commentsDialog").showModal(); loadComments(); });
    byId("reloadComments").addEventListener("click", loadComments);
    byId("commentForm").addEventListener("submit", function (event) {
      event.preventDefault(); rememberIdentity(byId("commentAuthor").value);
      request("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ author: identity(), topic: topics.value, message: byId("commentMessage").value }) })
        .then(function () { byId("commentMessage").value = ""; loadComments(); }).catch(function () { byId("commentStatus").textContent = "送出失敗"; });
    });
  }

  function readCursor(viewer) { return Number(localStorage.getItem(storage.notificationRead + "." + encodeURIComponent(viewer)) || 0); }
  function renderNotifications() {
    var list = byId("notificationList"); list.replaceChildren();
    state.notifications.forEach(function (item) {
      var article = node("article", "notification-item"); article.append(node("b", "", item.actor), node("p", "", item.message), node("time", "", new Date(item.created_at).toLocaleString(config.locale || "zh-TW"))); list.appendChild(article);
    });
    if (!state.notifications.length) list.appendChild(node("p", "empty-state", "目前沒有其他旅伴的動態。"));
  }
  function loadNotifications() {
    var viewer = byId("notificationTraveler").value.trim() || identity(); rememberIdentity(viewer);
    request("/api/notifications?viewer=" + encodeURIComponent(viewer) + "&readThrough=" + readCursor(viewer)).then(function (data) {
      state.notifications = data.items || []; state.latestNotification = data.latest_id || 0; renderNotifications();
      var badge = byId("notificationCount"); badge.textContent = data.unread || 0; badge.hidden = !data.unread;
      byId("notificationStatus").textContent = data.unread ? data.unread + " 則未讀" : "已讀完";
    }).catch(function () { state.notifications = []; renderNotifications(); byId("notificationStatus").textContent = "無法讀取本機資料"; });
  }
  function setupNotifications() {
    byId("notificationTraveler").value = identity();
    byId("notificationsLauncher").addEventListener("click", function () { byId("notificationsDialog").showModal(); loadNotifications(); });
    byId("reloadNotifications").addEventListener("click", loadNotifications);
    byId("notificationTraveler").addEventListener("change", loadNotifications);
    byId("markNotificationsRead").addEventListener("click", function () { var viewer = identity(); localStorage.setItem(storage.notificationRead + "." + encodeURIComponent(viewer), String(state.latestNotification)); loadNotifications(); });
    loadNotifications();
  }

  function setupDialogs() {
    document.querySelectorAll("[data-close-dialog]").forEach(function (button) { button.addEventListener("click", function () { byId(button.dataset.closeDialog).close(); }); });
  }
  function setupPwa() {
    var deferred;
    window.addEventListener("beforeinstallprompt", function (event) { event.preventDefault(); deferred = event; byId("installApp").hidden = false; });
    byId("installApp").addEventListener("click", function () { if (!deferred) return; deferred.prompt(); deferred = null; byId("installApp").hidden = true; });
    if (/^https?:$/.test(location.protocol) && "serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").then(function (registration) {
      registration.addEventListener("updatefound", function () {
        var worker = registration.installing;
        worker.addEventListener("statechange", function () { if (worker.state === "installed" && navigator.serviceWorker.controller) byId("updateNotice").hidden = false; });
      });
    }).catch(function () {});
    byId("refreshUpdate").addEventListener("click", function () { location.reload(); });
    byId("dismissUpdate").addEventListener("click", function () { byId("updateNotice").hidden = true; });
  }
  function chooseInitialDay() {
    var today = todayKey(); var match = config.days.find(function (day) { return day.date === today; });
    state.activeDay = match ? match.id : "all";
  }

  renderHeader(); renderTabs(); chooseInitialDay(); renderReservations(); setupDialogs(); setupSchedule(); setupProgress(); setupShopping(); setupComments(); setupNotifications(); setupPwa(); loadProgress(); window.TravelManager.init();
})();
