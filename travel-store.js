(function () {
  'use strict';
  var KEY = 'travel-handbook.library.v1';
  var FORMAT = 'travel-handbook';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function id() { return 'trip-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)); }
  function text(value, max) { return String(value == null ? '' : value).trim().slice(0, max || 1000); }
  function list(value, max) { if (!Array.isArray(value) || value.length > max) throw new Error('項目數量或檔案格式不正確。'); return value; }
  function date(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value; }
  function point(value) {
    value = value || {};
    var lat = value.lat == null || value.lat === '' ? null : Number(value.lat);
    var lng = value.lng == null || value.lng === '' ? null : Number(value.lng);
    if ((lat != null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) || (lng != null && (!Number.isFinite(lng) || Math.abs(lng) > 180))) throw new Error('座標超出範圍：緯度 -90～90，經度 -180～180。');
    if ((lat == null) !== (lng == null)) throw new Error('緯度與經度請一起填寫，或一起留白。');
    return { name: text(value.name, 120), lat: lat, lng: lng };
  }
  function link(value) {
    var url = text(value.url, 2048);
    if (url && !/^https?:\/\//i.test(url)) throw new Error('連結必須以 https:// 或 http:// 開頭。');
    if (url) { try { new URL(url); } catch (error) { throw new Error('請填寫有效的網址。'); } }
    return { label: text(value.label, 120), url: url };
  }
  function config(value) {
    if (!value || typeof value !== 'object' || !text(value.title, 120)) throw new Error('請填寫旅程名稱。');
    var timezone = text(value.timezone, 60) || 'Asia/Taipei';
    try { new Intl.DateTimeFormat('en', { timeZone: timezone }); } catch (error) { throw new Error('時區不正確，例如 Asia/Taipei、Asia/Tokyo。'); }
    var days = list(value.days, 60); if (!days.length) throw new Error('請至少保留一天行程。');
    var ids = new Set(), dates = new Set();
    days = days.map(function (day) {
      if (!/^[a-zA-Z0-9_-]{1,80}$/.test(day.id) || ids.has(day.id)) throw new Error('行程識別碼重複或格式不正確。');
      if (!date(day.date) || dates.has(day.date)) throw new Error('日期無效或重複，每天只保留一張行程卡。');
      ids.add(day.id); dates.add(day.date);
      return { id: day.id, date: day.date, title: text(day.title, 200) || '尚未命名的行程', pace: text(day.pace, 20) || '中', locked: Boolean(day.locked), lockReason: text(day.lockReason, 120),
        location: point(day.location), route: list(day.route || [], 30).map(point),
        timeline: list(day.timeline || [], 50).map(function (row) { return { time: text(row.time, 60), title: text(row.title, 200), note: text(row.note, 3000) }; }),
        transport: text(day.transport, 3000), links: list(day.links || [], 30).map(link) };
    }).sort(function (a, b) { return a.date.localeCompare(b.date); });
    return { schemaVersion: 1, projectKey: text(value.projectKey, 80) || id(), title: text(value.title, 120), subtitle: text(value.subtitle, 1000), locale: 'zh-TW', timezone: timezone,
      currency: text(value.currency, 12) || 'TWD', travelers: list(value.travelers || [], 20).map(function (name) { return text(name, 24); }).filter(Boolean),
      dates: { start: days[0].date, end: days[days.length - 1].date }, base: point(value.base),
      intro: list(value.intro || [], 10).map(function (row) { return { label: text(row.label, 60), title: text(row.title, 120), text: text(row.text, 1000) }; }), days: days,
      reservations: list(value.reservations || [], 100).map(function (row) { return { title: text(row.title, 200), date: text(row.date, 120), status: text(row.status, 80), url: link({ url: row.url }).url }; }),
      checklist: list(value.checklist || [], 20).map(function (row) { return { title: text(row.title, 120), items: list(row.items || [], 100).map(function (item) { return text(item, 200); }) }; }),
      commentTopics: list(value.commentTopics || ['整體行程'], 30).map(function (item) { return text(item, 40); }),
      features: { weather: Boolean(value.features && value.features.weather) } };
  }
  function emptyData() { return { progress: { version: 1, checks: {}, notes: '', schedule: {} }, shopping: [], comments: [], notifications: [] }; }
  function progress(value) {
    value = value || {}; var checks = {}, schedule = {};
    Object.entries(value.checks || {}).slice(0, 2000).forEach(function (entry) { if (/^[a-zA-Z0-9_-]{1,80}$/.test(entry[0])) checks[entry[0]] = Boolean(entry[1]); });
    Object.entries(value.schedule || {}).slice(0, 60).forEach(function (entry) { if (/^[a-zA-Z0-9_-]{1,80}$/.test(entry[0]) && /^[a-zA-Z0-9_-]{1,80}$/.test(entry[1])) schedule[entry[0]] = entry[1]; });
    return { version: 1, checks: checks, notes: text(value.notes, 10000), schedule: schedule };
  }
  function data(value) {
    value = value || emptyData();
    return { progress: progress(value.progress),
      shopping: list(value.shopping || [], 200).map(function (row, i) { return { id: String(i + 1), author: text(row.author, 24), item_name: text(row.item_name, 120), details: text(row.details, 500),
        status: ['pending', 'planned', 'bought', 'skipped'].includes(row.status) ? row.status : 'pending', planned_date: text(row.planned_date, 40), buy_location: text(row.buy_location, 120),
        plan_note: text(row.plan_note, 500), created_at: text(row.created_at, 40), updated_at: text(row.updated_at, 40) }; }),
      comments: list(value.comments || [], 200).map(function (row, i) { return { id: String(i + 1), author: text(row.author, 24), topic: text(row.topic, 40), message: text(row.message, 600), created_at: text(row.created_at, 40) }; }),
      notifications: list(value.notifications || [], 200).map(function (row, i) { return { id: i + 1, actor: text(row.actor, 24), message: text(row.message, 200), created_at: text(row.created_at, 40) }; }) };
  }
  var library;
  try { library = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (error) {}
  if (!library || !Array.isArray(library.trips) || !library.trips.length) {
    var sample = config(window.TRIP_CONFIG);
    sample.projectKey = 'sample-trip';
    library = { version: 1, active: sample.projectKey, trips: [{ id: sample.projectKey, config: sample, data: emptyData() }] };
  }
  function current() { return library.trips.find(function (trip) { return trip.id === library.active; }) || library.trips[0]; }
  function persist(candidate) {
    try { localStorage.setItem(KEY, JSON.stringify(candidate || library)); }
    catch (error) { throw new Error('這個瀏覽器無法儲存，或空間已滿。請先匯出旅程備份，再換一般瀏覽視窗。'); }
    if (candidate) library = candidate;
  }
  function apply() { window.TRIP_CONFIG = copy(current().config); }
  function commit(mutator) { var next = copy(library); mutator(next); persist(next); }
  function activity(record, actor, message) {
    var rows = record.data.notifications;
    rows.push({ id: (rows.length ? rows[rows.length - 1].id : 0) + 1, actor: actor || '旅伴', message: message, created_at: new Date().toISOString() });
    record.data.notifications = rows.slice(-200);
  }
  function download(value, filename) {
    var url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
    var a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function addRecord(record) {
    if (library.trips.length >= 40) throw new Error('最多保存 40 趟旅程，請先備份並移除已結束的旅程。');
    commit(function (next) { next.trips.push(record); next.active = record.id; });
  }
  function cleanConfig(value) { var result = config(value); result.travelers = ['旅伴 A', '旅伴 B']; result.projectKey = id(); return result; }
  function materialized() {
    var trip = current(), cfg = copy(trip.config), used = new Set();
    var movable = cfg.days.filter(function (day) { return !day.locked; });
    var mapping = {};
    movable.forEach(function (slot) {
      var source = movable.find(function (day) { return day.id === trip.data.progress.schedule[slot.id]; });
      if (source && !used.has(source.id)) { mapping[slot.id] = source; used.add(source.id); }
    });
    var missing = movable.filter(function (day) { return !used.has(day.id); });
    cfg.days = cfg.days.map(function (slot) {
      var source = slot.locked ? slot : mapping[slot.id] || missing.shift();
      return Object.assign(copy(source), { id: slot.id, date: slot.date, locked: slot.locked, lockReason: slot.lockReason });
    });
    return cfg;
  }
  window.TravelStore = {
    validateConfig: config, validateData: data, newId: id, validDate: date, materializedConfig: materialized,
    current: function () { return copy(current()); }, trips: function () { return library.trips.map(function (trip) { return { id: trip.id, title: trip.config.title, dates: copy(trip.config.dates) }; }); },
    select: function (value) { if (!library.trips.some(function (trip) { return trip.id === value; })) throw new Error('找不到這趟旅程。'); commit(function (next) { next.active = value; }); },
    create: function (value) { var key = id(), cfg = config(value); cfg.projectKey = key; addRecord({ id: key, config: cfg, data: emptyData() }); },
    duplicate: function (value) { var cfg = config(value || current().config), key = id(); cfg.projectKey = key; addRecord({ id: key, config: cfg, data: emptyData() }); },
    saveConfig: function (value, resetSchedule) {
      var cfg = config(value); cfg.projectKey = current().id;
      commit(function (next) { var trip = next.trips.find(function (row) { return row.id === next.active; });
        // Checklist keys are positional. Retain checked items by label when the form reorders them.
        var checked = new Set(); trip.config.checklist.forEach(function (group, g) { group.items.forEach(function (label, i) { if (trip.data.progress.checks['check-' + g + '-' + i]) checked.add(group.title + '\u0000' + label); }); });
        var checks = {}; cfg.checklist.forEach(function (group, g) { group.items.forEach(function (label, i) { checks['check-' + g + '-' + i] = checked.has(group.title + '\u0000' + label); }); });
        trip.data.progress.checks = checks; trip.config = cfg;
        if (resetSchedule) trip.data.progress.schedule = {};
      });
    },
    remove: function (value) {
      if (library.trips.length === 1) throw new Error('請先建立另一趟旅程，再移除這趟。');
      if (!library.trips.some(function (row) { return row.id === value; })) throw new Error('找不到這趟旅程。');
      commit(function (next) { next.trips = next.trips.filter(function (row) { return row.id !== value; }); if (next.active === value) next.active = next.trips[0].id; });
      Object.keys(localStorage).filter(function (key) { return key.startsWith(value + '.'); }).forEach(function (key) { localStorage.removeItem(key); });
    },
    exportTrip: function (asTemplate, latestProgress) {
      var trip = current();
      var payload = { format: FORMAT, version: 1, kind: asTemplate ? 'template' : 'trip', exportedAt: new Date().toISOString(), config: asTemplate ? cleanConfig(materialized()) : copy(trip.config), data: asTemplate ? emptyData() : copy(trip.data) };
      // Backups must remain available even when browser storage is full.
      if (!asTemplate && latestProgress) payload.data.progress = progress(latestProgress);
      download(payload, (asTemplate ? 'travel-template' : 'travel-backup') + '-trip.json'); return payload;
    },
    importTrip: function (payload) {
      if (!payload || payload.format !== FORMAT || payload.version !== 1 || !['trip', 'template'].includes(payload.kind)) throw new Error('請選擇完整旅程檔或模板檔；舊版進度檔不能當作完整旅程。');
      var cfg = config(payload.config), key = id(); cfg.projectKey = key;
      var imported = payload.kind === 'template' ? emptyData() : data(payload.data);
      addRecord({ id: key, config: cfg, data: imported });
    },
    request: function (url, options) {
      return Promise.resolve().then(function () {
        var parsed = new URL(url, 'https://local.invalid'), method = options && options.method || 'GET';
        var body = options && options.body ? JSON.parse(options.body) : {};
        var output;
        if (method === 'GET') {
          var record = current();
          if (parsed.pathname === '/api/progress') return { progress: copy(record.data.progress) };
          if (parsed.pathname === '/api/shopping') return { items: copy(record.data.shopping) };
          if (parsed.pathname === '/api/comments') return { comments: copy(record.data.comments) };
          if (parsed.pathname === '/api/notifications') {
            var rows = record.data.notifications.filter(function (row) { return row.actor !== parsed.searchParams.get('viewer'); });
            return { items: copy(rows).reverse(), unread: rows.filter(function (row) { return row.id > Number(parsed.searchParams.get('readThrough') || 0); }).length, latest_id: rows.reduce(function (max, row) { return Math.max(max, row.id); }, 0) };
          }
          throw new Error('不支援這個操作。');
        }
        commit(function (next) {
          var record = next.trips.find(function (row) { return row.id === next.active; });
          if (parsed.pathname === '/api/progress' && method === 'PUT') { record.data.progress = progress(body.progress); output = { progress: record.data.progress }; return; }
          if (parsed.pathname === '/api/shopping' && method === 'POST') {
            if (!text(body.item_name, 120)) throw new Error('請填寫品名。');
            if (record.data.shopping.length >= 200) throw new Error('待購清單最多 200 項。');
            var item = data({ shopping: [body] }).shopping[0]; item.id = id(); item.created_at = item.updated_at = new Date().toISOString();
            record.data.shopping.push(item); activity(record, item.author, '新增待購：' + item.item_name); output = { item: item }; return;
          }
          if (parsed.pathname === '/api/shopping' && ['PATCH', 'DELETE'].includes(method)) {
            var item = record.data.shopping.find(function (row) { return String(row.id) === parsed.searchParams.get('id'); }); if (!item) throw new Error('找不到待購項目。');
            if (method === 'DELETE') { record.data.shopping = record.data.shopping.filter(function (row) { return row.id !== item.id; }); output = { ok: true }; return; }
            var normalized = data({ shopping: [Object.assign({}, item, body)] }).shopping[0]; normalized.id = item.id; normalized.updated_at = new Date().toISOString();
            record.data.shopping[record.data.shopping.indexOf(item)] = normalized; activity(record, item.author, '更新待購：' + item.item_name); output = { item: normalized }; return;
          }
          if (parsed.pathname === '/api/comments' && method === 'POST') {
            if (!text(body.message, 600)) throw new Error('請填寫留言。');
            if (record.data.comments.length >= 200) throw new Error('留言最多 200 則。');
            var comment = data({ comments: [body] }).comments[0]; comment.id = id(); comment.created_at = new Date().toISOString(); record.data.comments.push(comment);
            activity(record, comment.author, '新增留言：' + comment.topic); output = { comment: comment }; return;
          }
          throw new Error('不支援這個操作。');
        });
        return copy(output);
      });
    }
  };
  apply();
})();
