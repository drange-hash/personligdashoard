/* ===== Utilities ===== */
const $ = id => document.getElementById(id);
const storage = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

const DAYS_NO = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
const DAYS_FULL_NO = ['Søndag','Mandag','Tirsdag','Onsdag','Torsdag','Fredag','Lørdag'];
const MONTHS_NO = ['januar','februar','mars','april','mai','juni','juli','august','september','oktober','november','desember'];

/* ===== Clock ===== */
function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  $('clock').textContent = `${hh}:${mm}:${ss}`;
  $('date').textContent = `${DAYS_FULL_NO[now.getDay()]} ${now.getDate()}. ${MONTHS_NO[now.getMonth()]} ${now.getFullYear()}`;
}

setInterval(updateClock, 1000);
updateClock();

/* ===== Theme ===== */
const themeToggle = $('theme-toggle');
let currentTheme = storage.get('theme', 'dark');
document.documentElement.setAttribute('data-theme', currentTheme);
themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

themeToggle.addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  storage.set('theme', currentTheme);
});

/* ===== Weather ===== */
const WMO_ICONS = {
  0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️',
  45: '🌫', 48: '🌫',
  51: '🌦', 53: '🌦', 55: '🌧',
  61: '🌧', 63: '🌧', 65: '🌧',
  71: '🌨', 73: '🌨', 75: '❄️',
  80: '🌦', 81: '🌧', 82: '⛈',
  95: '⛈', 96: '⛈', 99: '⛈',
};

const WMO_DESC = {
  0: 'Klart', 1: 'Mest klart', 2: 'Delvis skyet', 3: 'Overskyet',
  45: 'Tåke', 48: 'Rimdannende tåke',
  51: 'Lett yr', 53: 'Moderat yr', 55: 'Tett yr',
  61: 'Lett regn', 63: 'Moderat regn', 65: 'Kraftig regn',
  71: 'Lett snø', 73: 'Moderat snø', 75: 'Kraftig snø',
  80: 'Regnbyger', 81: 'Moderate regnbyger', 82: 'Kraftige regnbyger',
  95: 'Tordenvær', 96: 'Tordenvær med hagl', 99: 'Kraftig tordenvær',
};

let weatherConfig = storage.get('weatherConfig', { lat: 59.9139, lon: 10.7522, city: 'Oslo' });

async function fetchWeather() {
  const { lat, lon, city } = weatherConfig;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weathercode,windspeed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FOslo&forecast_days=6`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API-feil');
    const data = await res.json();

    const cur = data.current;
    const code = cur.weathercode;
    $('weather-icon').textContent = WMO_ICONS[code] || '❓';
    $('weather-temp').textContent = `${Math.round(cur.temperature_2m)}°C`;
    $('weather-desc').textContent = `${WMO_DESC[code] || 'Ukjent'} – ${city}`;
    $('weather-wind').textContent = `💨 ${Math.round(cur.windspeed_10m)} km/t`;
    $('weather-humidity').textContent = `💧 ${cur.relative_humidity_2m}%`;

    const forecast = $('weather-forecast');
    forecast.innerHTML = '';
    const daily = data.daily;
    for (let i = 1; i < 6; i++) {
      const date = new Date(daily.time[i] + 'T12:00:00');
      const dayDiv = document.createElement('div');
      dayDiv.className = 'weather-day';
      dayDiv.innerHTML = `
        <div class="day-name">${DAYS_NO[date.getDay()]}</div>
        <div class="day-icon">${WMO_ICONS[daily.weathercode[i]] || '❓'}</div>
        <div class="day-temp">${Math.round(daily.temperature_2m_max[i])}°</div>
        <div class="day-low">${Math.round(daily.temperature_2m_min[i])}°</div>
      `;
      forecast.appendChild(dayDiv);
    }
  } catch (e) {
    $('weather-desc').textContent = 'Kunne ikke hente vær';
    $('weather-icon').textContent = '❌';
  }
}

$('weather-settings-btn').addEventListener('click', () => {
  const panel = $('weather-settings');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    $('weather-lat').value = weatherConfig.lat;
    $('weather-lon').value = weatherConfig.lon;
    $('weather-city').value = weatherConfig.city;
  }
});

$('weather-save').addEventListener('click', () => {
  weatherConfig = {
    lat: parseFloat($('weather-lat').value) || 59.9139,
    lon: parseFloat($('weather-lon').value) || 10.7522,
    city: $('weather-city').value || 'Oslo',
  };
  storage.set('weatherConfig', weatherConfig);
  $('weather-settings').classList.add('hidden');
  fetchWeather();
});

fetchWeather();

/* ===== Todo ===== */
let todos = storage.get('todos', []);
let projects = storage.get('projects', []);
let todoFilter = 'all';
let activeTab = 'todo';

function saveTodos() { storage.set('todos', todos); }
function saveProjects() { storage.set('projects', projects); }

function renderTodos() {
  const list = $('todo-list');
  list.innerHTML = '';

  const filtered = todos.filter(t => {
    if (todoFilter === 'active') return !t.done;
    if (todoFilter === 'done') return t.done;
    return true;
  });

  if (filtered.length === 0) {
    list.innerHTML = '<li style="text-align:center;color:var(--text-muted);font-size:12px;padding:16px">Ingen gjøremål</li>';
  } else {
    filtered.forEach(t => {
      const li = document.createElement('li');
      li.className = `todo-item priority-${t.priority}${t.done ? ' done' : ''}`;
      li.innerHTML = `
        <input type="checkbox" ${t.done ? 'checked' : ''} data-id="${t.id}" />
        <span class="todo-text">${escapeHtml(t.text)}</span>
        <button class="todo-delete" data-id="${t.id}">✕</button>
      `;
      list.appendChild(li);
    });
  }

  const done = todos.filter(t => t.done).length;
  $('todo-stats').textContent = `${done} av ${todos.length} fullført`;
}

function renderProjects() {
  const list = $('project-list');
  list.innerHTML = '';
  if (projects.length === 0) {
    list.innerHTML = '<li style="text-align:center;color:var(--text-muted);font-size:12px;padding:16px">Ingen prosjekter</li>';
    return;
  }
  projects.forEach(p => {
    const li = document.createElement('li');
    li.className = 'project-item';
    li.innerHTML = `
      <div>
        <div class="project-name">${escapeHtml(p.name)}</div>
        ${p.deadline ? `<div class="project-deadline">📅 ${escapeHtml(p.deadline)}</div>` : ''}
      </div>
      <button class="project-delete" data-id="${p.id}">✕</button>
    `;
    list.appendChild(li);
  });
}

$('todo-add').addEventListener('click', addTodo);
$('todo-input').addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });

function addTodo() {
  const text = $('todo-input').value.trim();
  if (!text) return;
  todos.unshift({ id: Date.now(), text, priority: $('todo-priority').value, done: false });
  $('todo-input').value = '';
  saveTodos();
  renderTodos();
}

$('todo-list').addEventListener('change', e => {
  if (e.target.type === 'checkbox') {
    const id = Number(e.target.dataset.id);
    const t = todos.find(x => x.id === id);
    if (t) { t.done = e.target.checked; saveTodos(); renderTodos(); }
  }
});

$('todo-list').addEventListener('click', e => {
  if (e.target.classList.contains('todo-delete')) {
    const id = Number(e.target.dataset.id);
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    renderTodos();
  }
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    todoFilter = btn.dataset.filter;
    renderTodos();
  });
});

document.querySelectorAll('[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTab = btn.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    $(`tab-${activeTab}`).classList.add('active');
  });
});

$('project-add').addEventListener('click', addProject);
$('project-name').addEventListener('keydown', e => { if (e.key === 'Enter') addProject(); });

function addProject() {
  const name = $('project-name').value.trim();
  if (!name) return;
  projects.unshift({ id: Date.now(), name, deadline: $('project-deadline').value.trim() });
  $('project-name').value = '';
  $('project-deadline').value = '';
  saveProjects();
  renderProjects();
}

$('project-list').addEventListener('click', e => {
  if (e.target.classList.contains('project-delete')) {
    const id = Number(e.target.dataset.id);
    projects = projects.filter(p => p.id !== id);
    saveProjects();
    renderProjects();
  }
});

renderTodos();
renderProjects();

/* ===== Stocks ===== */
let stocks = storage.get('stocks', [
  { id: 1, symbol: 'EQNR.OL', name: 'Equinor', qty: 0, cost: 0 },
  { id: 2, symbol: 'DNB.OL', name: 'DNB', qty: 0, cost: 0 },
  { id: 3, symbol: 'AAPL', name: 'Apple', qty: 0, cost: 0 },
]);

function saveStocks() { storage.set('stocks', stocks); }

async function fetchStockPrice(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    const chart = data?.chart?.result?.[0];
    if (!chart) return null;
    const meta = chart.meta;
    return {
      price: meta.regularMarketPrice,
      prev: meta.chartPreviousClose || meta.previousClose,
      currency: meta.currency,
    };
  } catch {
    return null;
  }
}

async function renderStocks() {
  const list = $('stock-list');
  list.innerHTML = '<div class="loading">Henter kurser...</div>';
  $('stock-api-warning').classList.remove('hidden');

  const results = await Promise.all(stocks.map(s => fetchStockPrice(s.symbol)));

  list.innerHTML = '';
  if (stocks.length === 0) {
    list.innerHTML = '<div class="loading">Ingen aksjer lagt til</div>';
    $('stock-total').classList.add('hidden');
    return;
  }

  let totalValue = 0;
  let totalCost = 0;
  let hasPortfolio = false;

  stocks.forEach((s, i) => {
    const r = results[i];
    const item = document.createElement('div');
    item.className = 'stock-item';

    let priceHtml = '<span class="stock-price" style="color:var(--text-muted)">—</span>';
    let changeHtml = '<span class="stock-change">—</span>';

    if (r) {
      const change = r.price - r.prev;
      const changePct = (change / r.prev) * 100;
      const isUp = change >= 0;
      priceHtml = `<span class="stock-price">${r.price.toFixed(2)} <span style="font-size:10px;color:var(--text-muted)">${r.currency || ''}</span></span>`;
      changeHtml = `<span class="stock-change ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${changePct.toFixed(2)}%</span>`;

      if (s.qty > 0) {
        hasPortfolio = true;
        totalValue += s.qty * r.price;
        totalCost += s.qty * s.cost;
      }
    }

    item.innerHTML = `
      <span class="stock-symbol">${escapeHtml(s.symbol)}</span>
      <span class="stock-name">${escapeHtml(s.name)}</span>
      ${priceHtml}
      ${changeHtml}
      <button class="stock-delete" data-id="${s.id}">✕</button>
    `;
    list.appendChild(item);
  });

  if (hasPortfolio) {
    const gain = totalValue - totalCost;
    const gainPct = (gain / totalCost) * 100;
    $('stock-total').classList.remove('hidden');
    $('stock-total').innerHTML = `
      <span>Portefølje</span>
      <span class="gain ${gain >= 0 ? 'up' : 'down'}">
        ${gain >= 0 ? '+' : ''}${gain.toFixed(0)} (${gainPct.toFixed(1)}%)
      </span>
    `;
  } else {
    $('stock-total').classList.add('hidden');
  }
}

$('stock-list').addEventListener('click', e => {
  if (e.target.classList.contains('stock-delete')) {
    const id = Number(e.target.dataset.id);
    stocks = stocks.filter(s => s.id !== id);
    saveStocks();
    renderStocks();
  }
});

$('stock-add-btn').addEventListener('click', () => {
  $('stock-add-form').classList.toggle('hidden');
});

$('stock-save-btn').addEventListener('click', () => {
  const symbol = $('stock-symbol-input').value.trim().toUpperCase();
  if (!symbol) return;
  stocks.push({
    id: Date.now(),
    symbol,
    name: $('stock-name-input').value.trim() || symbol,
    qty: parseFloat($('stock-qty-input').value) || 0,
    cost: parseFloat($('stock-cost-input').value) || 0,
  });
  $('stock-symbol-input').value = '';
  $('stock-name-input').value = '';
  $('stock-qty-input').value = '';
  $('stock-cost-input').value = '';
  $('stock-add-form').classList.add('hidden');
  saveStocks();
  renderStocks();
});

renderStocks();

/* ===== Notes ===== */
let notes = storage.get('notes', [{ id: 1, title: 'Velkomstnotat', content: 'Skriv notater her. De lagres automatisk.' }]);
let activeNoteId = notes.length > 0 ? notes[0].id : null;
let saveTimeout = null;

function saveNotes() { storage.set('notes', notes); }

function renderNotesList() {
  const ul = $('notes-list');
  ul.innerHTML = '';
  notes.forEach(n => {
    const li = document.createElement('li');
    li.className = `notes-list-item${n.id === activeNoteId ? ' active' : ''}`;
    li.textContent = n.title || 'Uten tittel';
    li.dataset.id = n.id;
    li.addEventListener('click', () => {
      activeNoteId = n.id;
      renderNotesList();
      loadNote();
    });
    ul.appendChild(li);
  });
}

function loadNote() {
  const note = notes.find(n => n.id === activeNoteId);
  if (!note) { $('note-title').value = ''; $('note-content').value = ''; return; }
  $('note-title').value = note.title;
  $('note-content').value = note.content;
}

function autoSave() {
  const note = notes.find(n => n.id === activeNoteId);
  if (!note) return;
  note.title = $('note-title').value;
  note.content = $('note-content').value;
  saveNotes();
  renderNotesList();
  const indicator = $('note-saved');
  indicator.classList.add('visible');
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => indicator.classList.remove('visible'), 1500);
}

$('note-title').addEventListener('input', autoSave);
$('note-content').addEventListener('input', autoSave);

$('note-new-btn').addEventListener('click', () => {
  const note = { id: Date.now(), title: 'Nytt notat', content: '' };
  notes.unshift(note);
  activeNoteId = note.id;
  saveNotes();
  renderNotesList();
  loadNote();
  $('note-title').focus();
  $('note-title').select();
});

$('note-delete-btn').addEventListener('click', () => {
  if (!activeNoteId) return;
  if (notes.length === 1) { alert('Kan ikke slette det eneste notatet.'); return; }
  notes = notes.filter(n => n.id !== activeNoteId);
  activeNoteId = notes[0]?.id || null;
  saveNotes();
  renderNotesList();
  loadNote();
});

renderNotesList();
loadNote();

/* ===== Calendar ===== */
let calDate = new Date();
let selectedCalDate = new Date();
let calEvents = storage.get('calEvents', []);

function saveCalEvents() { storage.set('calEvents', calEvents); }

function renderCalendar() {
  const grid = $('calendar-grid');
  grid.innerHTML = '';

  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  $('cal-month-label').textContent = `${MONTHS_NO[month].charAt(0).toUpperCase() + MONTHS_NO[month].slice(1)} ${year}`;

  DAYS_NO.forEach(d => {
    const h = document.createElement('div');
    h.className = 'cal-header';
    h.textContent = d;
    grid.appendChild(h);
  });

  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const today = new Date();

  for (let i = 0; i < startDay; i++) {
    const d = document.createElement('div');
    d.className = 'cal-day other-month';
    d.textContent = daysInPrev - startDay + i + 1;
    grid.appendChild(d);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = document.createElement('div');
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    const isSelected = selectedCalDate.getFullYear() === year && selectedCalDate.getMonth() === month && selectedCalDate.getDate() === day;
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const hasEv = calEvents.some(e => e.date === dateStr);
    d.className = `cal-day${isToday ? ' today' : ''}${isSelected && !isToday ? ' selected' : ''}${hasEv ? ' has-event' : ''}`;
    d.textContent = day;
    d.addEventListener('click', () => {
      selectedCalDate = new Date(year, month, day);
      renderCalendar();
      renderCalEventList();
    });
    grid.appendChild(d);
  }

  const remaining = 42 - startDay - daysInMonth;
  for (let i = 1; i <= remaining; i++) {
    const d = document.createElement('div');
    d.className = 'cal-day other-month';
    d.textContent = i;
    grid.appendChild(d);
  }
}

function getSelectedDateStr() {
  const y = selectedCalDate.getFullYear();
  const m = String(selectedCalDate.getMonth() + 1).padStart(2, '0');
  const d = String(selectedCalDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function renderCalEventList() {
  const dateStr = getSelectedDateStr();
  const ul = $('cal-event-list');
  ul.innerHTML = '';
  const eventsForDay = calEvents.filter(e => e.date === dateStr);
  if (eventsForDay.length === 0) {
    ul.innerHTML = '<li style="font-size:11px;color:var(--text-muted);padding:4px 0">Ingen hendelser</li>';
    return;
  }
  eventsForDay.forEach(ev => {
    const li = document.createElement('li');
    li.className = 'cal-event-item';
    li.innerHTML = `<span>${escapeHtml(ev.text)}</span><button class="cal-event-delete" data-id="${ev.id}">✕</button>`;
    ul.appendChild(li);
  });
}

$('cal-prev').addEventListener('click', () => {
  calDate.setMonth(calDate.getMonth() - 1);
  renderCalendar();
});

$('cal-next').addEventListener('click', () => {
  calDate.setMonth(calDate.getMonth() + 1);
  renderCalendar();
});

$('cal-event-add').addEventListener('click', addCalEvent);
$('cal-event-input').addEventListener('keydown', e => { if (e.key === 'Enter') addCalEvent(); });

function addCalEvent() {
  const text = $('cal-event-input').value.trim();
  if (!text) return;
  calEvents.push({ id: Date.now(), date: getSelectedDateStr(), text });
  $('cal-event-input').value = '';
  saveCalEvents();
  renderCalendar();
  renderCalEventList();
}

$('cal-event-list').addEventListener('click', e => {
  if (e.target.classList.contains('cal-event-delete')) {
    const id = Number(e.target.dataset.id);
    calEvents = calEvents.filter(ev => ev.id !== id);
    saveCalEvents();
    renderCalendar();
    renderCalEventList();
  }
});

renderCalendar();
renderCalEventList();

/* ===== Misc: Crypto ===== */
async function fetchCrypto() {
  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,cardano&vs_currencies=nok,usd&include_24hr_change=true';
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const list = $('crypto-list');
    list.innerHTML = '';

    const COINS = [
      { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
      { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
      { id: 'solana', name: 'Solana', symbol: 'SOL' },
      { id: 'cardano', name: 'Cardano', symbol: 'ADA' },
    ];

    COINS.forEach(c => {
      const d = data[c.id];
      if (!d) return;
      const change = d.nok_24h_change || 0;
      const item = document.createElement('div');
      item.className = 'stock-item';
      item.innerHTML = `
        <span class="stock-symbol">${c.symbol}</span>
        <span class="stock-name">${c.name}</span>
        <span class="stock-price">${formatNOK(d.nok)}</span>
        <span class="stock-change ${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span>
      `;
      list.appendChild(item);
    });
  } catch {
    $('crypto-list').innerHTML = '<div class="error-msg">Kunne ikke hente kryptokurser</div>';
  }
}

function formatNOK(val) {
  if (val >= 1000000) return `${(val/1000000).toFixed(2)}M NOK`;
  if (val >= 1000) return `${Math.round(val).toLocaleString('no-NO')} NOK`;
  return `${val.toFixed(2)} NOK`;
}

fetchCrypto();

/* ===== Misc: Currency ===== */
async function fetchCurrency() {
  try {
    const url = 'https://api.frankfurter.app/latest?base=NOK&symbols=USD,EUR,GBP,SEK,DKK,JPY,CHF';
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const data = await res.json();

    const pairs = [
      { pair: 'USD/NOK', rate: 1 / data.rates.USD },
      { pair: 'EUR/NOK', rate: 1 / data.rates.EUR },
      { pair: 'GBP/NOK', rate: 1 / data.rates.GBP },
      { pair: 'SEK/NOK', rate: 1 / data.rates.SEK * 10 },
      { pair: 'DKK/NOK', rate: 1 / data.rates.DKK },
      { pair: 'CHF/NOK', rate: 1 / data.rates.CHF },
      { pair: 'JPY/NOK', rate: (1 / data.rates.JPY) * 100 },
    ];

    const list = $('currency-list');
    list.innerHTML = '';
    pairs.forEach(p => {
      const item = document.createElement('div');
      item.className = 'currency-item';
      item.innerHTML = `
        <div class="currency-pair">${p.pair}</div>
        <div class="currency-rate">${p.rate.toFixed(2)}</div>
      `;
      list.appendChild(item);
    });
  } catch {
    $('currency-list').innerHTML = '<div class="error-msg">Kunne ikke hente valutakurser</div>';
  }
}

fetchCurrency();

/* ===== Misc: Links ===== */
let links = storage.get('quickLinks', [
  { id: 1, name: 'VG', url: 'https://vg.no', icon: '📰' },
  { id: 2, name: 'NRK', url: 'https://nrk.no', icon: '📺' },
  { id: 3, name: 'GitHub', url: 'https://github.com', icon: '🐙' },
]);

function saveLinks() { storage.set('quickLinks', links); }

function renderLinks() {
  const grid = $('links-grid');
  grid.innerHTML = '';
  links.forEach(l => {
    const a = document.createElement('a');
    a.className = 'link-item';
    a.href = l.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.innerHTML = `
      <span class="link-icon">${l.icon || '🔗'}</span>
      <span>${escapeHtml(l.name)}</span>
      <button class="link-delete" data-id="${l.id}">✕</button>
    `;
    a.querySelector('.link-delete').addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      links = links.filter(x => x.id !== l.id);
      saveLinks();
      renderLinks();
    });
    grid.appendChild(a);
  });
}

$('link-add-btn').addEventListener('click', () => {
  const name = $('link-name-input').value.trim();
  let url = $('link-url-input').value.trim();
  if (!name || !url) return;
  if (!url.startsWith('http')) url = 'https://' + url;
  links.push({ id: Date.now(), name, url, icon: '🔗' });
  $('link-name-input').value = '';
  $('link-url-input').value = '';
  saveLinks();
  renderLinks();
});

$('link-url-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('link-add-btn').click();
});

renderLinks();

/* ===== Misc Tabs ===== */
document.querySelectorAll('[data-misc-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-misc-tab]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.misc-panel').forEach(p => p.classList.remove('active'));
    $(`misc-${btn.dataset.miscTab}`).classList.add('active');
  });
});

/* ===== Global Refresh ===== */
$('refresh-btn').addEventListener('click', () => {
  fetchWeather();
  renderStocks();
  fetchCrypto();
  fetchCurrency();
  const btn = $('refresh-btn');
  btn.style.transform = 'rotate(360deg)';
  btn.style.transition = 'transform 0.5s';
  setTimeout(() => { btn.style.transform = ''; btn.style.transition = ''; }, 600);
});

/* ===== Auto-refresh every 5 minutes ===== */
setInterval(() => {
  fetchWeather();
  renderStocks();
  fetchCrypto();
  fetchCurrency();
}, 5 * 60 * 1000);

/* ===== XSS protection ===== */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
