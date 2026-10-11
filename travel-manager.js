(function () {
  'use strict';
  var store = window.TravelStore, draft, mode, dayId;
  function el(tag, text, cls) { var n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; }
  function byId(id) { return document.getElementById(id); }
  function button(text, action) { var n = el('button', text, 'secondary-button'); n.type = 'button'; n.addEventListener('click', action); return n; }
  function field(parent, label, value, key, type, max) {
    var wrap = el('label', label), input = el(type === 'textarea' ? 'textarea' : 'input');
    if (type !== 'textarea') input.type = type || 'text'; else input.rows = 3;
    input.value = value == null ? '' : value; input.dataset.field = key;
    if (max) input.maxLength = max;
    if (type === 'number') input.step = 'any';
    wrap.append(input); parent.append(wrap); return input;
  }
  function get(parent, key) { return parent.querySelector('[data-field="' + key + '"]').value.trim(); }
  function section(parent, title, hint) { var n = el('fieldset'); n.append(el('legend', title)); if (hint) n.append(el('p', hint, 'editor-hint')); parent.append(n); return n; }
  function rows(parent, title, values, fields, max) {
    var area = section(parent, title), list = el('div', null, 'repeat-list'); area.append(list);
    function add(value) {
      if (list.children.length >= max) { byId('editorStatus').textContent = '此處最多 ' + max + ' 項。'; return; }
      var row = el('div', null, 'repeat-row');
      fields.forEach(function (f) { field(row, f[1], value[f[0]], f[0], f[2], f[3]); });
      row.append(button('移除這一項', function () { row.remove(); })); list.append(row);
    }
    values.forEach(add); area.append(button('新增' + title, function () { add({}); }));
    return function () { return Array.from(list.children).map(function (row) { var v = {}; fields.forEach(function (f) { v[f[0]] = get(row, f[0]); }); return v; }); };
  }
  function offset(date, delta) { return new Date(Date.parse(date + 'T12:00:00Z') + delta * 86400000).toISOString().slice(0, 10); }
  function blankDay(date, index) { return { id: 'day-' + String(index + 1).padStart(2, '0'), date: date, title: '第 ' + (index + 1) + ' 天', pace: '中', locked: false, lockReason: '', location: { name: '', lat: null, lng: null }, route: [], timeline: [], links: [], transport: '' }; }
  var readers;
  function openSettings(nextMode) {
    mode = nextMode; draft = store.materializedConfig(); dayId = null; readers = {};
    if (mode === 'new') {
      var today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      var parts = {}; today.forEach(function (part) { parts[part.type] = part.value; });
      var start = parts.year + '-' + parts.month + '-' + parts.day;
      draft = store.validateConfig({ title: '我的新旅程', days: [blankDay(start, 0), blankDay(offset(start, 1), 1), blankDay(offset(start, 2), 2)], travelers: ['旅伴 A', '旅伴 B'], timezone: 'Asia/Taipei', checklist: [{ title: '行前準備', items: ['確認交通與住宿', '整理行李', '匯出旅程備份'] }] });
    }
    if (mode === 'duplicate') { draft.title += '（副本）'; draft.travelers = ['旅伴 A', '旅伴 B']; }
    byId('editorTitle').textContent = { new: '建立旅程', duplicate: '複製成新旅程', edit: '編輯旅程設定' }[mode];
    var body = byId('editorBody'); body.replaceChildren();
    var basics = section(body, '基本資訊', '縮短日期會移除超出天數的行程卡。請先匯出完整備份。預約摘要的日期需另外確認。');
    field(basics, '旅程名稱', draft.title, 'title', 'text', 120).required = true;
    field(basics, '簡介', draft.subtitle, 'subtitle', 'textarea', 1000);
    field(basics, '開始日期', draft.dates.start, 'start', 'date').required = true;
    field(basics, '結束日期', draft.dates.end, 'end', 'date').required = true;
    field(basics, '旅伴暱稱（每行一位）', draft.travelers.join('\n'), 'travelers', 'textarea', 500);
    field(basics, '時區（例如 Asia/Tokyo）', draft.timezone, 'timezone', 'text', 60);
    field(basics, '幣別（例如 JPY、TWD）', draft.currency, 'currency', 'text', 12);
    field(basics, '住宿／集合地點', draft.base.name, 'baseName', 'text', 120);
    field(basics, '住宿緯度（可留白）', draft.base.lat, 'baseLat', 'number');
    field(basics, '住宿經度（可留白）', draft.base.lng, 'baseLng', 'number');
    var weatherLabel = el('label', null, 'inline-check'), check = el('input'); check.type = 'checkbox'; check.checked = draft.features.weather; check.dataset.field = 'weather';
    weatherLabel.append(check, el('span', '啟用天氣：將城市座標與時區送往 Open-Meteo')); basics.append(weatherLabel);
    readers.basics = function () {
      var start = get(basics, 'start'), end = get(basics, 'end');
      if (!store.validDate(start) || !store.validDate(end)) throw new Error('請填寫有效的開始與結束日期。');
      var count = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
      if (count < 1 || count > 60) throw new Error('每趟旅程需為 1～60 天，結束日期不可早於開始日期。');
      draft.title = get(basics, 'title'); draft.subtitle = get(basics, 'subtitle');
      draft.travelers = get(basics, 'travelers').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      draft.timezone = get(basics, 'timezone'); draft.currency = get(basics, 'currency');
      draft.base = { name: get(basics, 'baseName'), lat: get(basics, 'baseLat'), lng: get(basics, 'baseLng') };
      draft.features.weather = check.checked;
      var oldDays = draft.days;
      // Keep the existing visible order while shifting a trip's date range.
      draft.days = Array.from({ length: count }, function (_, i) { var day = oldDays[i] || blankDay(offset(start, i), i); day.date = offset(start, i); day.id = 'day-' + String(i + 1).padStart(2, '0'); return day; });
    };
    readers.intro = rows(body, '總覽卡片', draft.intro, [['label','小標題','text',60],['title','標題','text',120],['text','說明','textarea',1000]], 10);
    readers.reservations = rows(body, '預約', draft.reservations, [['title','預約名稱','text',200],['date','日期／時間摘要','text',120],['status','狀態','text',80],['url','官方連結（可留白）','url',2048]], 100);
    var groups = section(body, '檢查表'), groupList = el('div', null, 'repeat-list'); groups.append(groupList);
    function addGroup(group) {
      if (groupList.children.length >= 20) { byId('editorStatus').textContent = '檢查表最多 20 組。'; return; }
      var row = el('div', null, 'repeat-row'); field(row, '分類標題', group.title, 'title', 'text',120); field(row, '檢查項目（每行一項）', (group.items || []).join('\n'), 'items', 'textarea',20000);
      row.append(button('移除分類', function () { row.remove(); })); groupList.append(row);
    }
    draft.checklist.forEach(addGroup); groups.append(button('新增檢查表分類', function () { addGroup({}); }));
    readers.checklist = function () { return Array.from(groupList.children).map(function (row) { return { title: get(row, 'title'), items: get(row, 'items').split('\n').map(function (s) { return s.trim(); }).filter(Boolean) }; }); };
    var topics = section(body, '留言分類'); field(topics, '分類（每行一項）', draft.commentTopics.join('\n'), 'topics', 'textarea',1200);
    readers.commentTopics = function () { return get(topics, 'topics').split('\n').map(function (s) { return s.trim(); }).filter(Boolean); };
    show();
  }
  function openDay(value) {
    mode = 'day'; draft = store.materializedConfig(); dayId = value; readers = {};
    var day = draft.days.find(function (d) { return d.id === value; }); if (!day) return;
    byId('editorTitle').textContent = '編輯 ' + day.date + ' 行程';
    var body = byId('editorBody'); body.replaceChildren();
    var basic = section(body, '每日資訊');
    field(basic, '行程標題', day.title, 'title', 'text',200).required = true;
    field(basic, '節奏（慢／中／快）', day.pace, 'pace', 'text',20);
    field(basic, '城市／地區', day.location.name, 'name', 'text',120);
    field(basic, '城市緯度（可留白）', day.location.lat, 'lat', 'number');
    field(basic, '城市經度（可留白）', day.location.lng, 'lng', 'number');
    var lockLabel = el('label', null, 'inline-check'), lock = el('input'); lock.type = 'checkbox'; lock.checked = day.locked; lock.dataset.field = 'locked'; lockLabel.append(lock, el('span', '鎖定日期，禁止互換')); basic.append(lockLabel);
    field(basic, '鎖定原因', day.lockReason, 'lockReason', 'text',120);
    field(basic, '交通與費用', day.transport, 'transport', 'textarea',3000);
    readers.basics = function () { day.title = get(basic,'title'); day.pace = get(basic,'pace'); day.location = {name:get(basic,'name'), lat:get(basic,'lat'),lng:get(basic,'lng')}; day.locked = lock.checked; day.lockReason = get(basic,'lockReason'); day.transport = get(basic,'transport'); };
    readers.timeline = rows(body, '活動', day.timeline, [['time','時間','text',60],['title','活動名稱','text',200],['note','補充說明','textarea',3000]],50);
    readers.route = rows(body, '路線站點', day.route, [['name','地點名稱','text',120],['lat','緯度（可留白）','number'],['lng','經度（可留白）','number']],30);
    readers.links = rows(body, '參考連結', day.links, [['label','連結名稱','text',120],['url','網址','url',2048]],30);
    show();
  }
  function show() { byId('editorStatus').textContent = ''; byId('tripEditor').showModal(); byId('editorBody').scrollTop = 0; }
  function action(callback) { try { callback(); } catch (error) { byId('libraryStatus').textContent = error.message; } }
  window.TravelManager = { init: function () {
    var picker = byId('tripPicker'); store.trips().forEach(function (trip) { var opt = el('option', trip.title + ' · ' + trip.dates.start); opt.value = trip.id; picker.append(opt); }); picker.value = store.current().id;
    picker.addEventListener('change', function () { action(function () { store.select(picker.value); location.reload(); }); });
    byId('newTrip').addEventListener('click', function () { openSettings('new'); });
    byId('duplicateTrip').addEventListener('click', function () { openSettings('duplicate'); });
    document.querySelectorAll('[data-edit-trip]').forEach(function (btn) { btn.addEventListener('click', function () { openSettings('edit'); }); });
    byId('dayList').addEventListener('click', function (event) { var btn = event.target.closest('[data-edit-day]'); if (btn) openDay(btn.dataset.editDay); });
    byId('exportTemplate').addEventListener('click', function () { action(function () { store.exportTrip(true); byId('libraryStatus').textContent = '已匯出模板；行程、預約與連結仍會保留，分享前請檢查內容。'; }); });
    byId('deleteTrip').addEventListener('click', function () { if (confirm('移除「' + store.current().config.title + '」及其本機資料？請先匯出完整備份。')) action(function () { store.remove(store.current().id); location.reload(); }); });
    byId('tripEditorForm').addEventListener('submit', function (event) {
      event.preventDefault();
      try {
        readers.basics(); var target = mode === 'day' ? draft.days.find(function (d) { return d.id === dayId; }) : draft;
        Object.keys(readers).filter(function (key) { return key !== 'basics'; }).forEach(function (key) { target[key] = readers[key](); });
        draft = store.validateConfig(draft);
        if (mode === 'new') store.create(draft); else if (mode === 'duplicate') store.duplicate(draft); else store.saveConfig(draft, true);
        location.reload();
      } catch (error) { byId('editorStatus').textContent = error.message; }
    });
    byId('libraryStatus').textContent = '資料保存在這個瀏覽器；換裝置請匯出完整旅程再匯入。';
  } };
})();
