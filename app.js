(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const state = { trip: null, selectedDate: null, theme: localStorage.getItem('mesha-canada-theme') || 'auto' };
  const THEME_ORDER = ['auto', 'light', 'dark'];

  const esc = (value = '') => String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  function safeUrl(url) {
    try {
      const parsed = new URL(url, location.href);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '#';
    } catch { return '#'; }
  }

  function mapsUrl(place) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
  }

  function formatDate(dateString) {
    const d = new Date(`${dateString}T12:00:00`);
    return new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(d);
  }

  function dateInZone(timeZone) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const value = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return `${value.year}-${value.month}-${value.day}`;
  }

  function minutesInZone(timeZone) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    const value = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return Number(value.hour) * 60 + Number(value.minute);
  }

  function minutesOf(label) {
    const m = String(label).match(/^(\d{1,2}):(\d{2})$/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }

  function findTodayDay() {
    return state.trip.days.find(day => dateInZone(day.timeZone) === day.date) || null;
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    const labels = { auto: '自動', light: '淺色', dark: '深色' };
    $('#theme-btn').title = `主題：${labels[state.theme]}`;
  }

  function cycleTheme() {
    const index = THEME_ORDER.indexOf(state.theme);
    state.theme = THEME_ORDER[(index + 1) % THEME_ORDER.length];
    localStorage.setItem('mesha-canada-theme', state.theme);
    applyTheme();
    toast(`主題：${({auto:'自動', light:'淺色', dark:'深色'})[state.theme]}`);
  }

  function toast(message) {
    $('.toast')?.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    document.body.append(el);
    setTimeout(() => el.remove(), 1800);
  }

  async function sharePage() {
    const payload = { title: document.title, text: state.trip.trip.title, url: location.href };
    try {
      if (navigator.share) await navigator.share(payload);
      else {
        await navigator.clipboard.writeText(location.href);
        toast('連結已複製');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') toast('無法分享，請手動複製網址');
    }
  }

  function renderRail() {
    const current = state.selectedDate || findTodayDay()?.date || state.trip.days[0].date;
    $('#day-rail').innerHTML = state.trip.days.map(day => `
      <button class="day-chip ${day.date === current ? 'active' : ''}" data-date="${esc(day.date)}" type="button">
        <strong>${esc(day.label)}</strong><span>${esc(day.weekday)} · ${esc(day.region.split('→')[0].trim())}</span>
      </button>`).join('');
    $$('.day-chip').forEach(btn => btn.addEventListener('click', () => {
      state.selectedDate = btn.dataset.date;
      location.hash = `day/${btn.dataset.date}`;
    }));
    requestAnimationFrame(() => $('.day-chip.active')?.scrollIntoView({inline:'center', block:'nearest'}));
  }

  function setActiveNav(view) {
    $$('.bottom-nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === view));
  }

  function activityHtml(item) {
    const actions = [];
    if (item.place) actions.push(`<a class="mini-link" href="${mapsUrl(item.place)}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a>`);
    if (item.url) actions.push(`<a class="mini-link" href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer">參考連結 ↗</a>`);
    return `<div class="activity ${item.kind === 'conflict' ? 'conflict' : ''}">
      <div class="time">${esc(item.time)}</div><div class="dot"></div>
      <div><h3>${esc(item.title)}</h3><p>${esc(item.meta || '')}</p>${actions.length ? `<div class="activity-actions">${actions.join('')}</div>` : ''}</div>
    </div>`;
  }

  function alertsFor(date) {
    const alerts = state.trip.alerts.filter(a => !date || a.date === date);
    return alerts.map(a => `<div class="alert ${esc(a.level)}"><strong>${esc(a.title)}</strong><p>${esc(a.body)}</p></div>`).join('');
  }

  function heroHtml(day, kicker = 'TODAY') {
    return `<section class="panel hero">
      <p class="eyebrow">${esc(kicker)}</p>
      <h2>${esc(day.theme)}</h2>
      <p>${esc(day.region)} · ${formatDate(day.date)}</p>
      <div class="hero-meta"><span class="pill">${esc(day.route)}</span><span class="pill">時區 ${esc(day.timeZone.replace('America/',''))}</span></div>
    </section>`;
  }

  function renderNow() {
    setActiveNav('now');
    const today = findTodayDay();
    const first = state.trip.days[0];
    const last = state.trip.days.at(-1);
    const localDate = new Date();
    const start = new Date(`${first.date}T00:00:00`);
    const end = new Date(`${last.date}T23:59:59`);

    if (!today && localDate < start) {
      const days = Math.max(0, Math.ceil((start - localDate) / 86400000));
      $('#view').innerHTML = `
        <section class="panel hero"><p class="eyebrow">PRE-TRIP</p><h2>${days === 0 ? '今天出發' : `距離出發 ${days} 天`}</h2><p>第一站：台北 → 溫哥華。先把出發前必需項目與 10/2 07:00 的 Joffre Lakes 預約提醒顧好。</p><div class="hero-meta"><span class="pill">10/1–10/13</span><span class="pill">Mesha + Kai</span></div></section>
        ${alertsFor()}
        <div class="section-head"><h2>出發前重點</h2><small>不顯示公開訂位代碼</small></div>
        <section class="panel">${renderChecklistPreview()}</section>
        <div class="section-head"><h2>第一天</h2><small>${esc(first.region)}</small></div>
        <section class="panel timeline">${first.activities.map(activityHtml).join('')}</section>`;
      return;
    }

    if (!today && localDate > end) {
      $('#view').innerHTML = `<section class="panel hero"><p class="eyebrow">TRIP COMPLETE</p><h2>加拿大行程已結束</h2><p>行程資料仍保留，可從「行程」與「路線」回看。</p></section>`;
      return;
    }

    const day = today || first;
    state.selectedDate = day.date;
    const nowMin = minutesInZone(day.timeZone);
    const timed = day.activities.filter(a => minutesOf(a.time) !== null);
    let previous = null, next = null;
    timed.forEach(a => {
      const m = minutesOf(a.time);
      if (m <= nowMin) previous = a;
      if (!next && m > nowMin) next = a;
    });
    const flexible = day.activities.filter(a => minutesOf(a.time) === null);
    $('#view').innerHTML = `${heroHtml(day, 'NOW')}${alertsFor(day.date)}
      <div class="section-head"><h2>現在附近的安排</h2><small>${esc(day.timeZone.replace('America/',''))}</small></div>
      <section class="panel timeline">
        ${previous ? activityHtml(previous) : '<p class="empty-note">今天第一個固定時間還沒到。</p>'}
        ${next ? activityHtml(next) : '<p class="empty-note">今天沒有更晚的固定時間。</p>'}
      </section>
      ${flexible.length ? `<div class="section-head"><h2>彈性安排</h2><small>${flexible.length} 項</small></div><section class="panel timeline">${flexible.map(activityHtml).join('')}</section>` : ''}`;
    renderRail();
  }

  function renderTrip() {
    setActiveNav('trip');
    state.selectedDate = null;
    const t = state.trip.trip;
    $('#view').innerHTML = `
      <section class="panel hero"><p class="eyebrow">TRIP OVERVIEW</p><h2>${esc(t.title)}</h2><p>${esc(t.notice)}</p><div class="hero-meta"><span class="pill">${esc(t.startDate)} → ${esc(t.endDate)}</span><span class="pill">${state.trip.days.length} 個日期節點</span></div></section>
      <div class="grid fact-grid">${state.trip.quickFacts.map(f => `<div class="fact"><small>${esc(f.label)}</small><b>${esc(f.value)}</b></div>`).join('')}</div>
      <div class="section-head"><h2>需要注意</h2><small>${state.trip.alerts.length} 項</small></div>${alertsFor()}
      <div class="section-head"><h2>全部行程</h2><small>點一天看細節</small></div>
      <section class="panel">${state.trip.days.map(day => `<article class="day-card" data-open-day="${esc(day.date)}"><div class="date-box"><div><b>${esc(day.label)}</b><small>週${esc(day.weekday)}</small></div></div><div><h3>${esc(day.theme)}</h3><p>${esc(day.region)}<br>${esc(day.route)}</p></div><span class="arrow">›</span></article>`).join('')}</section>`;
    $$('[data-open-day]').forEach(card => card.addEventListener('click', () => { location.hash = `day/${card.dataset.openDay}`; }));
    renderRail();
  }

  function renderDay(date) {
    setActiveNav('trip');
    const day = state.trip.days.find(d => d.date === date) || state.trip.days[0];
    state.selectedDate = day.date;
    const idx = state.trip.days.indexOf(day);
    const prev = state.trip.days[idx - 1];
    const next = state.trip.days[idx + 1];
    $('#view').innerHTML = `${heroHtml(day, `DAY ${idx + 1}`)}${alertsFor(day.date)}
      <div class="section-head"><h2>當日路線</h2><small>${esc(day.region)}</small></div>
      <section class="panel"><div class="route-line"><b>Route</b><span>${esc(day.route)}</span></div></section>
      <div class="section-head"><h2>時間軸</h2><small>${day.activities.length} 項</small></div>
      <section class="panel timeline">${day.activities.map(activityHtml).join('')}</section>
      <section class="panel"><div class="progress-row">${prev ? `<button class="mini-link" data-jump="${esc(prev.date)}">← ${esc(prev.label)}</button>` : '<span></span>'}<span style="flex:1"></span>${next ? `<button class="mini-link" data-jump="${esc(next.date)}">${esc(next.label)} →</button>` : ''}</div></section>`;
    $$('[data-jump]').forEach(btn => btn.addEventListener('click', () => { location.hash = `day/${btn.dataset.jump}`; }));
    renderRail();
  }

  function renderMap() {
    setActiveNav('map');
    state.selectedDate = null;
    $('#view').innerHTML = `
      <section class="panel hero"><p class="eyebrow">ROUTE</p><h2>三段式旅程，比一張擠滿 pin 的地圖更好讀</h2><p>這裡先給每天的移動脈絡；真正導航交給 Google Maps。離線時仍看得到文字路線。</p></section>
      <section class="panel">${state.trip.days.map((day, i) => {
        const place = day.activities.find(a => a.place)?.place;
        return `<article class="route-stage"><div class="route-num">${i + 1}</div><div><h3>${esc(day.label)} · ${esc(day.theme)}</h3><p>${esc(day.route)}</p>${place ? `<div class="activity-actions"><a class="mini-link" href="${mapsUrl(place)}" target="_blank" rel="noopener noreferrer">開啟起點附近 ↗</a><button class="mini-link" data-route-day="${esc(day.date)}">看當日</button></div>` : ''}</div></article>`;
      }).join('')}</section>`;
    $$('[data-route-day]').forEach(btn => btn.addEventListener('click', () => location.hash = `day/${btn.dataset.routeDay}`));
    renderRail();
  }

  function checkState() {
    try { return JSON.parse(localStorage.getItem('mesha-canada-checklist') || '{}'); }
    catch { return {}; }
  }

  function isDone(item, saved = checkState()) {
    return Object.prototype.hasOwnProperty.call(saved, item.id) ? saved[item.id] : item.defaultDone;
  }

  function renderChecklistPreview() {
    const saved = checkState();
    return state.trip.checklist.slice(0, 5).map(item => `<div class="check-item"><input type="checkbox" disabled ${isDone(item,saved) ? 'checked' : ''}><label><b>${esc(item.label)}</b><small>${esc(item.note)}</small></label></div>`).join('') + `<div class="activity-actions"><a class="mini-link" href="#check">打開完整清單 →</a></div>`;
  }

  function renderCheck() {
    setActiveNav('check');
    state.selectedDate = null;
    const saved = checkState();
    const items = state.trip.checklist;
    const done = items.filter(i => isDone(i, saved)).length;
    const groups = [...new Set(items.map(i => i.group))];
    $('#view').innerHTML = `
      <section class="panel hero"><p class="eyebrow">CHECK</p><h2>${done} / ${items.length} 已完成</h2><p>勾選狀態只存在這台裝置，不會回寫 Google Sheet，也不會影響其他旅伴。</p><div class="hero-meta"><span class="pill">本機儲存</span><span class="pill">可離線查看</span></div></section>
      <section class="panel"><div class="progress-row"><div class="progress"><i style="width:${Math.round(done/items.length*100)}%"></i></div><b>${Math.round(done/items.length*100)}%</b></div></section>
      <section class="panel">${groups.map(group => `<div class="check-group"><h3>${esc(group)}</h3>${items.filter(i => i.group === group).map(item => `<div class="check-item"><input id="check-${esc(item.id)}" data-check="${esc(item.id)}" type="checkbox" ${isDone(item,saved) ? 'checked' : ''}><label for="check-${esc(item.id)}"><b>${esc(item.label)}</b><small>${esc(item.note)}</small></label></div>`).join('')}</div>`).join('')}</section>`;
    $$('[data-check]').forEach(box => box.addEventListener('change', () => {
      const current = checkState(); current[box.dataset.check] = box.checked;
      localStorage.setItem('mesha-canada-checklist', JSON.stringify(current));
      renderCheck();
    }));
    renderRail();
  }

  function renderMore() {
    setActiveNav('more');
    state.selectedDate = null;
    const themeLabels = {auto:'跟隨系統', light:'淺色', dark:'深色'};
    $('#view').innerHTML = `
      <section class="panel hero"><p class="eyebrow">MORE</p><h2>訂位摘要與常用入口</h2><p>公開網站只保留執行行程需要的資訊；Google Sheet 裡的訂位確認碼與費用沒有放進 repo。</p></section>
      <div class="section-head"><h2>住宿 / 航班</h2><small>隱去確認碼</small></div>
      <section class="panel">${state.trip.bookings.map(b => `<article class="booking"><div class="booking-top"><h3>${esc(b.name)}</h3><span class="tag">${esc(b.type)}</span></div><p>${esc(b.dates)} · ${esc(b.detail)}</p></article>`).join('')}</section>
      <div class="section-head"><h2>連結</h2></div>
      <section class="panel link-list">${state.trip.links.map(link => `<a href="${safeUrl(link.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(link.label)}</span><b>↗</b></a>`).join('')}</section>
      <div class="section-head"><h2>顯示</h2></div>
      <section class="panel"><button class="mini-link" id="more-theme" type="button">主題：${themeLabels[state.theme]} · 點擊切換</button><p class="empty-note">資料版本：${esc(state.trip.trip.updatedAt)}<br>來源：${esc(state.trip.trip.source)}</p></section>`;
    $('#more-theme')?.addEventListener('click', cycleTheme);
    renderRail();
  }

  function route() {
    if (!state.trip) return;
    const raw = location.hash.replace(/^#/, '') || 'now';
    const [view, type, value] = raw.split('/');
    if (view === 'day') return renderDay(type);
    if (view === 'trip' && type === 'day') return renderDay(value);
    if (view === 'trip') return renderTrip();
    if (view === 'map') return renderMap();
    if (view === 'check') return renderCheck();
    if (view === 'more') return renderMore();
    return renderNow();
  }

  async function init() {
    applyTheme();
    try {
      const response = await fetch('./trip.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.trip = await response.json();
      document.documentElement.style.setProperty('--accent', state.trip.trip.accent);
      $('#trip-title').textContent = state.trip.trip.title;
      $('#trip-subtitle').textContent = `${state.trip.trip.subtitle} · ${state.trip.trip.startDate.replaceAll('-','.')}–${state.trip.trip.endDate.slice(5).replace('-', '.')}`;
      document.title = `${state.trip.trip.title} · 2026`;
      $('#theme-btn').addEventListener('click', cycleTheme);
      $('#share-btn').addEventListener('click', sharePage);
      window.addEventListener('hashchange', route);
      renderRail(); route();
      if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
    } catch (error) {
      console.error(error);
      $('#view').innerHTML = `<section class="panel"><p class="eyebrow">LOAD ERROR</p><h2>行程資料無法載入</h2><p class="empty-note">請透過 GitHub Pages 或本機 web server 開啟，而不是直接開啟 index.html。</p></section>`;
    }
  }

  init();
})();
