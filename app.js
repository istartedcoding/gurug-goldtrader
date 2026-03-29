/* ═══════════════════════════════════════════════════════
   GuruG GoldTrader — Main Application Logic
   XAUUSD · MT5 · USD Account
   ═══════════════════════════════════════════════════════ */

// ── STATE ──────────────────────────────────────────────
const STATE = {
  riskMode:   'pct',      // 'pct' | 'fixed'
  direction:  'buy',      // 'buy' | 'sell'
  outcome:    null,        // 'win' | 'loss' | 'be'
  lastCalc:   null,        // last successful calculation result
  trades:     [],          // trade journal array
};

// ── XAUUSD CONSTANTS (MT5, USD Account) ───────────────
const XAUUSD = {
  contract_size: 100,   // oz per 1 standard lot
  pip_size:      0.01,  // 1 pip = $0.01 price move
  // Pip value per 1 standard lot, USD account:
  // pip_value = pip_size × contract_size = 0.01 × 100 = $1.00
  pip_value_per_lot: 1.00,
  // Min lot / max lot / lot step for most MT5 brokers
  min_lot:  0.01,
  max_lot:  100,
  lot_step: 0.01,
};

// ── GOLD PRICE APIs (CORS-friendly, no key required) ──
const GOLD_PRICE_APIS = [
  {
    // Fawaz CDN: served from jsDelivr, explicit CORS: *
    name:  'Currency-API',
    url:   'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json',
    parse: d => d?.xau?.usd,
  },
  {
    // Fawaz Cloudflare Pages fallback
    name:  'Currency-API (CF)',
    url:   'https://latest.currency-api.pages.dev/v1/currencies/xau.json',
    parse: d => d?.xau?.usd,
  },
  {
    // metals.live free public API
    name:  'Metals.live',
    url:   'https://metals.live/api/spot',
    parse: d => Array.isArray(d) ? d.find(x => x.XAU != null)?.XAU : null,
  },
];

// session tracking
let _goldSessionOpen  = null;  // first price of the day
let _goldSessionHigh  = null;
let _goldSessionLow   = null;
let _goldRefreshTimer = null;

// ── INIT ───────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadTrades();
  renderJournal();
  setDefaultDate();
  updateHeaderBalance();
  fetchGoldPrice();
  fetchUsdInrRate();                    // live USD/INR on load
  setInterval(fetchGoldPrice, 60000);   // refresh gold every 60s
});

// ── FETCH LIVE GOLD PRICE ──────────────────────────────
async function fetchGoldPrice() {
  // Show loading state
  const badge  = document.getElementById('tickerLiveBadge');
  const dot    = document.getElementById('tickerDot');
  const refBtn = document.getElementById('tickerRefreshBtn');

  if (badge)  { badge.className = 'ticker-live-badge fetching'; }
  if (dot)    { dot.style.background = 'var(--gold-500)'; }
  if (refBtn) { refBtn.classList.add('spinning'); }

  let price = null;
  let source = '';

  for (const api of GOLD_PRICE_APIS) {
    try {
      const resp = await fetch(api.url, {
        cache:   'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const val  = api.parse(data);
      // Gold price sanity: between $500 and $15,000/oz
      if (val && val > 500 && val < 15000) {
        price  = val;
        source = api.name;
        break;
      }
    } catch { /* try next */ }
  }

  if (refBtn) refBtn.classList.remove('spinning');

  if (!price) {
    // All APIs failed — show offline state
    if (badge) { badge.className = 'ticker-live-badge offline'; badge.innerHTML = '<span id="tickerDot" style="width:8px;height:8px;border-radius:50%;background:var(--red);display:inline-block"></span> OFFLINE'; }
    document.getElementById('priceDisplay').textContent = 'Offline';
    return;
  }

  // ── Session tracking ──────────────────────────────
  if (!_goldSessionOpen) _goldSessionOpen = price;
  if (!_goldSessionHigh || price > _goldSessionHigh) _goldSessionHigh = price;
  if (!_goldSessionLow  || price < _goldSessionLow)  _goldSessionLow  = price;

  const change    = price - _goldSessionOpen;
  const changePct = (change / _goldSessionOpen) * 100;
  const isUp      = change >= 0;

  // ── Update header pill ────────────────────────────
  document.getElementById('priceDisplay').textContent = price.toFixed(2);

  // ── Update ticker bar ─────────────────────────────
  const tickerPriceEl  = document.getElementById('tickerPrice');
  const tickerChangeEl = document.getElementById('tickerChange');
  const tickerPctEl    = document.getElementById('tickerPct');
  const tickerHighEl   = document.getElementById('tickerHigh');
  const tickerLowEl    = document.getElementById('tickerLow');
  const tickerTimeEl   = document.getElementById('tickerTime');

  // Price with flash colour
  if (tickerPriceEl) {
    tickerPriceEl.textContent = price.toFixed(2);
    tickerPriceEl.classList.remove('price-up','price-down');
    tickerPriceEl.classList.add(isUp ? 'price-up' : 'price-down');
    // Return to gold after 2s
    setTimeout(() => {
      if (tickerPriceEl) tickerPriceEl.classList.remove('price-up','price-down');
    }, 2000);
  }

  if (tickerChangeEl) {
    tickerChangeEl.textContent = (isUp ? '+' : '') + change.toFixed(2);
    tickerChangeEl.className = 'ticker-change ' + (isUp ? 'up' : 'down');
  }
  if (tickerPctEl) {
    tickerPctEl.textContent = (isUp ? '+' : '') + changePct.toFixed(2) + '%';
    tickerPctEl.className   = 'ticker-pct ' + (isUp ? 'up' : 'down');
  }
  if (tickerHighEl) tickerHighEl.textContent = _goldSessionHigh.toFixed(2);
  if (tickerLowEl)  tickerLowEl.textContent  = _goldSessionLow.toFixed(2);

  // Time & badge
  const now  = new Date();
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (tickerTimeEl) tickerTimeEl.textContent = time;
  if (badge) {
    badge.className = 'ticker-live-badge';
    badge.innerHTML = `<span id="tickerDot" style="width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block;animation:pulse 2s infinite"></span> LIVE`;
  }
}

// ── TAB SWITCHING ──────────────────────────────────────
function switchTab(tab) {
  const tabs = { calc: 'pageCal', journal: 'pageJournal', inr: 'pageInr' };
  const btns = { calc: 'tabCalc', journal: 'tabJournal',  inr: 'tabInr'  };

  Object.keys(tabs).forEach(k => {
    document.getElementById(tabs[k]).style.display = (k === tab) ? '' : 'none';
    document.getElementById(btns[k]).classList.toggle('active', k === tab);
  });

  if (tab === 'journal') renderJournal();
  if (tab === 'inr') calcInr(); // auto-recalc when switching to INR tab
}

// ── RISK MODE ──────────────────────────────────────────
function setRiskMode(mode) {
  STATE.riskMode = mode;
  document.getElementById('btnPct').classList.toggle('active', mode === 'pct');
  document.getElementById('btnFixed').classList.toggle('active', mode === 'fixed');
  document.getElementById('riskPctGroup').classList.toggle('hidden', mode !== 'pct');
  document.getElementById('riskFixedGroup').classList.toggle('hidden', mode !== 'fixed');
  calculate();
}

function setRisk(val) {
  document.getElementById('riskPct').value = val;
  document.querySelectorAll('.qbtn').forEach(b => b.classList.remove('active-q'));
  event.target.classList.add('active-q');
  calculate();
}

function setFixedRisk(val) {
  document.getElementById('riskFixed').value = val;
  document.querySelectorAll('#riskFixedGroup .qbtn').forEach(b => b.classList.remove('active-q'));
  event.target.classList.add('active-q');
  calculate();
}

// ── DIRECTION ──────────────────────────────────────────
function setDirection(dir) {
  STATE.direction = dir;
  document.getElementById('btnBuy').classList.toggle('active', dir === 'buy');
  document.getElementById('btnSell').classList.toggle('active', dir === 'sell');
  calculate();
}

// ── MAIN CALCULATION ───────────────────────────────────
function calculate() {
  const balance  = parseFloat(document.getElementById('accountBalance').value) || 0;
  const entry    = parseFloat(document.getElementById('entryPrice').value);
  const sl       = parseFloat(document.getElementById('stopLoss').value);
  const tp       = parseFloat(document.getElementById('takeProfit').value);

  updateHeaderBalance(balance);
  hideWarning();
  resetResults();

  // Validate entry & SL (minimum required)
  if (!entry || !sl || isNaN(entry) || isNaN(sl)) return;
  if (entry === sl) { showWarning('Entry and Stop Loss cannot be the same price.'); return; }

  // ── Risk Amount ──────────────────────────────────────
  let riskAmount;
  if (STATE.riskMode === 'pct') {
    const pct = parseFloat(document.getElementById('riskPct').value) || 1;
    riskAmount = balance * (pct / 100);
  } else {
    riskAmount = parseFloat(document.getElementById('riskFixed').value) || 50;
  }

  // ── Pip Distances ────────────────────────────────────
  // For XAUUSD, price moves in USD. Distance in pips = (price diff) / pip_size
  const slDistance   = Math.abs(entry - sl);    // in USD/oz
  const slPips       = slDistance / XAUUSD.pip_size;  // convert to pips

  // Validate direction
  if (STATE.direction === 'buy'  && sl >= entry) {
    showWarning('For a BUY trade, Stop Loss must be BELOW entry price.');
    return;
  }
  if (STATE.direction === 'sell' && sl <= entry) {
    showWarning('For a SELL trade, Stop Loss must be ABOVE entry price.');
    return;
  }

  // ── Lot Size Calculation ─────────────────────────────
  // Lot Size = Risk$ / (SL_pips × pip_value_per_lot)
  const rawLots = riskAmount / (slPips * XAUUSD.pip_value_per_lot);
  const lots    = roundLots(rawLots);

  if (lots < XAUUSD.min_lot) {
    showWarning(`Calculated lot size (${rawLots.toFixed(4)}) is below the minimum (0.01). Increase risk or widen SL.`);
    return;
  }

  // ── TP Calculation ───────────────────────────────────
  let tpPips = null, maxProfit = null, rr = null;

  if (tp && !isNaN(tp)) {
    // Validate TP direction
    if (STATE.direction === 'buy'  && tp <= entry) {
      showWarning('For a BUY trade, Take Profit must be ABOVE entry price.');
    } else if (STATE.direction === 'sell' && tp >= entry) {
      showWarning('For a SELL trade, Take Profit must be BELOW entry price.');
    } else {
      const tpDistance = Math.abs(tp - entry);
      tpPips   = tpDistance / XAUUSD.pip_size;
      maxProfit = tpPips * XAUUSD.pip_value_per_lot * lots;
      rr        = tpPips / slPips;
    }
  }

  // ── Pip Value for this lot size ──────────────────────
  // Total pip value (not per lot) = lots × pip_value_per_lot
  const pipValueTotal = lots * XAUUSD.pip_value_per_lot;

  // ── Maximum Loss (should closely match riskAmount) ───
  const maxLoss = slPips * XAUUSD.pip_value_per_lot * lots;

  // ── Store result ─────────────────────────────────────
  STATE.lastCalc = {
    balance, riskAmount, entry, sl, tp, lots, rawLots,
    slPips, tpPips, maxLoss, maxProfit, rr, pipValueTotal,
    direction: STATE.direction,
    riskPct: STATE.riskMode === 'pct'
      ? parseFloat(document.getElementById('riskPct').value)
      : (riskAmount / balance * 100),
  };

  // ── Render Results ───────────────────────────────────
  renderResults(STATE.lastCalc);
}

function roundLots(lots) {
  // Round DOWN to nearest 0.01 (never exceed risk)
  return Math.floor(lots / XAUUSD.lot_step) * XAUUSD.lot_step;
}

// ── RENDER RESULTS ─────────────────────────────────────
function renderResults(c) {
  // Direction badge
  const badge = document.getElementById('directionBadge');
  badge.textContent = c.direction === 'buy' ? '▲ LONG' : '▼ SHORT';
  badge.className = 'direction-badge ' + (c.direction === 'buy' ? 'buy-badge' : 'sell-badge');

  // Lot size
  animateValue('resLotSize', c.lots.toFixed(2));
  document.getElementById('resLotSub').textContent =
    `= ${(c.lots * 100).toFixed(0)} oz gold · raw: ${c.rawLots.toFixed(4)}`;

  // SL pips
  animateValue('resSLPips', Math.round(c.slPips).toString());

  // TP pips
  if (c.tpPips !== null) {
    animateValue('resTPPips', Math.round(c.tpPips).toString());
  } else {
    document.getElementById('resTPPips').textContent = '—';
  }

  // Pip value (total for lot size)
  animateValue('resPipVal', `$${c.pipValueTotal.toFixed(2)}`);

  // R:R
  const rrEl = document.getElementById('resRR');
  const rrSub = document.getElementById('resRRSub');
  if (c.rr !== null) {
    const rrStr = `1 : ${c.rr.toFixed(2)}`;
    animateValue('resRR', rrStr);
    rrEl.className = 'result-value rr-value ' + (c.rr >= 2 ? 'good' : c.rr >= 1 ? '' : 'bad');
    rrSub.textContent = c.rr >= 2 ? '✅ Excellent setup' : c.rr >= 1 ? '👍 Positive RR' : '⚠ RR below 1:1';
  } else {
    rrEl.textContent  = '—';
    rrSub.textContent = 'Enter TP for R:R';
  }

  // P&L
  const balPct = (c.maxLoss / c.balance * 100).toFixed(2);
  document.getElementById('resMaxLoss').textContent   = `-$${c.maxLoss.toFixed(2)}`;
  document.getElementById('resMaxLossPct').textContent= `${balPct}% of account`;

  if (c.maxProfit !== null) {
    const profPct = (c.maxProfit / c.balance * 100).toFixed(2);
    document.getElementById('resMaxProfit').textContent    = `+$${c.maxProfit.toFixed(2)}`;
    document.getElementById('resMaxProfitPct').textContent = `${profPct}% of account`;
  } else {
    document.getElementById('resMaxProfit').textContent    = '—';
    document.getElementById('resMaxProfitPct').textContent = 'Enter TP';
  }

  // Trade levels visualizer
  if (c.tp) renderLevelsVisualizer(c);

  // Lot breakdown
  renderLotBreakdown(c.lots);

  // Enable log button
  document.getElementById('logTradeBtn').disabled = false;

  // Show sections
  if (c.tp) document.getElementById('levelsSection').style.display = '';
  document.getElementById('microSection').style.display = '';
}

function animateValue(id, val) {
  const el = document.getElementById(id);
  el.textContent = val;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

// ── LEVELS VISUALIZER ─────────────────────────────────
function renderLevelsVisualizer(c) {
  const { entry, sl, tp } = c;
  const allPrices = [entry, sl, tp].filter(Boolean);
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const range = max - min || 1;

  function pct(price) {
    return ((price - min) / range * 80 + 5).toFixed(1) + '%';
  }

  const bar = document.getElementById('levelsBar');
  // position as absolute within bar (bottom %)
  const lvls = {
    tp:    { el: document.getElementById('lvlTP'),    price: tp },
    entry: { el: document.getElementById('lvlEntry'), price: entry },
    sl:    { el: document.getElementById('lvlSL'),    price: sl },
  };

  bar.style.position = 'relative';
  Object.keys(lvls).forEach(k => {
    const l = lvls[k];
    l.el.style.position = 'absolute';
    l.el.style.bottom   = pct(l.price);
    l.el.style.left     = '0';
    l.el.style.right    = '0';
    l.el.style.display  = l.price ? '' : 'none';
  });

  document.getElementById('lvlSLPrice').textContent    = sl ? sl.toFixed(2)    : '';
  document.getElementById('lvlEntryPrice').textContent = entry ? entry.toFixed(2) : '';
  document.getElementById('lvlTPPrice').textContent    = tp ? tp.toFixed(2)    : '';
}

// ── LOT BREAKDOWN ──────────────────────────────────────
function renderLotBreakdown(lots) {
  const parts  = [];
  let remaining = +lots.toFixed(2);
  const sizes  = [1, 0.5, 0.1, 0.05, 0.01];

  sizes.forEach(s => {
    if (remaining >= s) {
      const count = Math.floor(remaining / s);
      parts.push({ label: `${count}×${s}`, count, size: s });
      remaining = +(remaining - count * s).toFixed(2);
    }
  });

  const box = document.getElementById('microBoxes');
  box.innerHTML = parts
    .map(p => `<div class="micro-box">${p.label} lot</div>`)
    .join('');
}

// ── RESET & CLEAR ──────────────────────────────────────
function resetResults() {
  ['resLotSize','resRR','resSLPips','resTPPips','resPipVal',
   'resMaxLoss','resMaxLossPct','resMaxProfit','resMaxProfitPct'].forEach(id => {
    document.getElementById(id).textContent = '—';
  });
  document.getElementById('directionBadge').className = 'direction-badge';
  document.getElementById('directionBadge').textContent = '—';
  document.getElementById('logTradeBtn').disabled = true;
  document.getElementById('levelsSection').style.display = 'none';
  document.getElementById('microSection').style.display = 'none';
  STATE.lastCalc = null;
}

function clearInputs() {
  ['entryPrice','stopLoss','takeProfit'].forEach(id => {
    document.getElementById(id).value = '';
  });
  resetResults();
  hideWarning();
  document.getElementById('resRRSub').textContent = 'ratio';
  document.getElementById('resLotSub').textContent = 'Standard lots';
}

// ── WARNINGS ──────────────────────────────────────────
function showWarning(msg) {
  document.getElementById('warningMsg').textContent = msg;
  document.getElementById('warningBox').style.display = 'flex';
}

function hideWarning() {
  document.getElementById('warningBox').style.display = 'none';
}

// ── HEADER BALANCE ─────────────────────────────────────
function updateHeaderBalance(val) {
  const balance = val ?? parseFloat(document.getElementById('accountBalance').value) ?? 5000;
  document.getElementById('headerBalance').textContent = '$' + balance.toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

// ── MODAL ──────────────────────────────────────────────
function openLogModal() {
  if (!STATE.lastCalc) return;
  const c = STATE.lastCalc;

  // Pre-fill trade date
  setDefaultDate();

  // Build summary
  document.getElementById('modalSummary').innerHTML = `
    <div class="ms-item">
      <span class="ms-label">Direction</span>
      <span class="ms-value ${c.direction === 'buy' ? 'green' : 'red'}">${c.direction === 'buy' ? '▲ LONG' : '▼ SHORT'}</span>
    </div>
    <div class="ms-item">
      <span class="ms-label">Entry</span>
      <span class="ms-value">${c.entry.toFixed(2)}</span>
    </div>
    <div class="ms-item">
      <span class="ms-label">Stop Loss</span>
      <span class="ms-value red">${c.sl.toFixed(2)}</span>
    </div>
    <div class="ms-item">
      <span class="ms-label">Take Profit</span>
      <span class="ms-value green">${c.tp ? c.tp.toFixed(2) : '—'}</span>
    </div>
    <div class="ms-item">
      <span class="ms-label">Lot Size</span>
      <span class="ms-value">${c.lots.toFixed(2)}</span>
    </div>
    <div class="ms-item">
      <span class="ms-label">Risk</span>
      <span class="ms-value">$${c.riskAmount.toFixed(2)} (${c.riskPct.toFixed(1)}%)</span>
    </div>
    ${c.rr !== null ? `
    <div class="ms-item">
      <span class="ms-label">R:R</span>
      <span class="ms-value">1 : ${c.rr.toFixed(2)}</span>
    </div>
    <div class="ms-item">
      <span class="ms-label">Max Profit</span>
      <span class="ms-value green">+$${c.maxProfit.toFixed(2)}</span>
    </div>
    ` : ''}
    <div class="ms-item">
      <span class="ms-label">SL Pips</span>
      <span class="ms-value">${Math.round(c.slPips)}</span>
    </div>
  `;

  // Reset outcome selection
  STATE.outcome = null;
  ['outWin','outLoss','outBe'].forEach(id =>
    document.getElementById(id).classList.remove('active')
  );
  document.getElementById('customPnlGroup').style.display = 'none';
  document.getElementById('tradeNotes').value = '';

  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal(e) {
  if (e.target === document.getElementById('modalOverlay')) closeLogModal();
}

function closeLogModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function setOutcome(out) {
  STATE.outcome = out;
  document.getElementById('outWin').classList.toggle('active',  out === 'win');
  document.getElementById('outLoss').classList.toggle('active', out === 'loss');
  document.getElementById('outBe').classList.toggle('active',   out === 'be');
  document.getElementById('customPnlGroup').style.display =
    (out === 'win' || out === 'loss') ? 'none' : '';
  // For partial close / manual
}

// ── LOG TRADE ──────────────────────────────────────────
function logTrade() {
  if (!STATE.outcome) {
    alert('Please select an outcome (Win / Loss / Break Even).');
    return;
  }

  const c       = STATE.lastCalc;
  const outcome = STATE.outcome;
  const notes   = document.getElementById('tradeNotes').value.trim();
  const date    = document.getElementById('tradeDate').value || new Date().toISOString().split('T')[0];

  let actualPnl;
  if (outcome === 'win') {
    actualPnl = c.maxProfit !== null ? +c.maxProfit.toFixed(2) : 0;
  } else if (outcome === 'loss') {
    actualPnl = -Math.abs(c.maxLoss.toFixed(2));
  } else if (outcome === 'be') {
    const custom = parseFloat(document.getElementById('customPnl').value);
    actualPnl = isNaN(custom) ? 0 : custom;
  }

  const trade = {
    id:        Date.now(),
    date,
    direction: c.direction,
    entry:     c.entry,
    sl:        c.sl,
    tp:        c.tp,
    lots:      c.lots,
    rr:        c.rr,
    riskAmount:c.riskAmount,
    outcome,
    pnl:       actualPnl,
    slPips:    Math.round(c.slPips),
    tpPips:    c.tpPips ? Math.round(c.tpPips) : null,
    notes,
  };

  STATE.trades.push(trade);
  saveTrades();
  closeLogModal();
  renderJournal();

  // Update badge
  document.getElementById('journalBadge').textContent = STATE.trades.length;

  // Flash notification
  showToast(`Trade logged! ${outcome === 'win' ? '✅ WIN' : outcome === 'loss' ? '❌ LOSS' : '〰 BE'} · $${actualPnl >= 0 ? '+' : ''}${actualPnl.toFixed(2)}`);
}

// ── TOAST ──────────────────────────────────────────────
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed', bottom: '24px', right: '24px',
    background: 'var(--bg-3)', border: '1px solid var(--border-gold)',
    borderRadius: '10px', padding: '12px 20px',
    color: 'var(--text-1)', fontFamily: 'Inter, sans-serif',
    fontSize: '14px', fontWeight: '600',
    zIndex: '9999', boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
    transition: 'all 0.4s ease', opacity: '0',
    transform: 'translateY(10px)',
  });
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; }, 10);
  setTimeout(() => {
    t.style.opacity = '0'; t.style.transform = 'translateY(10px)';
    setTimeout(() => t.remove(), 400);
  }, 3500);
}

// ── JOURNAL RENDER ─────────────────────────────────────
function renderJournal() {
  const trades  = STATE.trades;
  const tbody   = document.getElementById('tradeBody');
  const badge   = document.getElementById('journalBadge');

  badge.textContent = trades.length;

  // Stats
  const wins   = trades.filter(t => t.outcome === 'win').length;
  const losses = trades.filter(t => t.outcome === 'loss').length;
  const netPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
  const winRate = trades.length ? (wins / trades.length * 100).toFixed(1) + '%' : '—';
  const rrVals  = trades.map(t => t.rr).filter(Boolean);
  const avgRR   = rrVals.length ? (rrVals.reduce((a,b) => a+b,0) / rrVals.length).toFixed(2) : '—';
  const pnls    = trades.map(t => t.pnl).filter(v => v !== null && v !== undefined);
  const best    = pnls.length ? Math.max(...pnls) : null;
  const worst   = pnls.length ? Math.min(...pnls) : null;

  document.getElementById('statTotal').textContent   = trades.length;
  document.getElementById('statWinRate').textContent = winRate;
  document.getElementById('statNetPnl').textContent  =
    (netPnl >= 0 ? '+$' : '-$') + Math.abs(netPnl).toFixed(2);
  document.getElementById('statNetPnl').className    =
    'stat-value ' + (netPnl > 0 ? 'green' : netPnl < 0 ? 'red' : '');
  document.getElementById('statAvgRR').textContent   = avgRR !== '—' ? `1:${avgRR}` : '—';
  document.getElementById('statBest').textContent    = best !== null ? `+$${best.toFixed(2)}` : '—';
  document.getElementById('statWorst').textContent   = worst !== null ? `-$${Math.abs(worst).toFixed(2)}` : '—';

  // Equity chart
  renderEquityChart(trades);

  // Table
  if (!trades.length) {
    tbody.innerHTML = `
      <tr class="empty-row" id="emptyRow">
        <td colspan="13">
          <div class="empty-state">
            <span class="empty-icon">📭</span>
            <p>No trades logged. Use the Calculator → <strong>Log Trade</strong>.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  // Render newest first
  tbody.innerHTML = [...trades].reverse().map((t, i) => {
    const idx = trades.length - i;
    const pnlClass = t.pnl > 0 ? 'pnl-positive' : t.pnl < 0 ? 'pnl-negative' : 'pnl-zero';
    const pnlStr   = t.pnl > 0 ? `+$${t.pnl.toFixed(2)}` : `-$${Math.abs(t.pnl).toFixed(2)}`;
    const outcomeClass = { win: 'badge-win', loss: 'badge-loss', be: 'badge-be' }[t.outcome];
    const outcomeStr   = { win: '✅ Win', loss: '❌ Loss', be: '〰 BE' }[t.outcome];

    return `
      <tr>
        <td class="mono" style="color:var(--text-3)">#${idx}</td>
        <td class="mono" style="color:var(--text-2)">${t.date}</td>
        <td><span class="badge-${t.direction}">${t.direction === 'buy' ? '▲ BUY' : '▼ SELL'}</span></td>
        <td class="mono">${t.entry.toFixed(2)}</td>
        <td class="mono red">${t.sl.toFixed(2)}</td>
        <td class="mono green">${t.tp ? t.tp.toFixed(2) : '—'}</td>
        <td class="mono">${t.lots.toFixed(2)}</td>
        <td class="mono">${t.rr ? '1:' + t.rr.toFixed(2) : '—'}</td>
        <td class="mono">$${t.riskAmount.toFixed(2)}</td>
        <td class="${outcomeClass}">${outcomeStr}</td>
        <td class="${pnlClass}">${pnlStr}</td>
        <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;color:var(--text-2);font-size:12px">${t.notes || '—'}</td>
        <td><button class="btn-del" onclick="deleteTrade(${t.id})" title="Delete">✕</button></td>
      </tr>
    `;
  }).join('');
}

// ── EQUITY CHART ───────────────────────────────────────
function renderEquityChart(trades) {
  const chart = document.getElementById('equityChart');
  if (!trades.length) {
    chart.innerHTML = '<div class="empty-chart">No trades logged yet</div>';
    return;
  }

  const pnls = trades.map(t => t.pnl || 0);
  const minPnl = Math.min(...pnls, 0);
  const maxPnl = Math.max(...pnls, 0);
  const range  = (maxPnl - minPnl) || 1;

  chart.innerHTML = trades.map((t, i) => {
    const h    = Math.max(4, Math.abs(t.pnl / range) * 120);
    const type = t.pnl >= 0 ? 'win-bar' : 'loss-bar';
    const tip  = `#${i+1} · ${t.outcome.toUpperCase()} · $${t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}`;
    return `<div class="equity-bar ${type}" style="height:${h}px" title="${tip}"></div>`;
  }).join('') + '<div class="equity-baseline"></div>';
}

// ── DELETE TRADE ───────────────────────────────────────
function deleteTrade(id) {
  if (!confirm('Delete this trade?')) return;
  STATE.trades = STATE.trades.filter(t => t.id !== id);
  saveTrades();
  renderJournal();
}

function clearJournal() {
  if (!confirm('Clear ALL trades? This cannot be undone.')) return;
  STATE.trades = [];
  saveTrades();
  renderJournal();
}

// ── PERSISTENCE ────────────────────────────────────────
function saveTrades() {
  localStorage.setItem('gt_trades', JSON.stringify(STATE.trades));
}

function loadTrades() {
  try {
    const data = localStorage.getItem('gt_trades');
    if (data) STATE.trades = JSON.parse(data);
  } catch { STATE.trades = []; }
}

// ── EXPORT CSV ─────────────────────────────────────────
function exportCSV() {
  if (!STATE.trades.length) { alert('No trades to export.'); return; }

  const headers = ['#','Date','Direction','Entry','SL','TP','Lots','R:R','Risk $','Outcome','P&L ($)','SL Pips','TP Pips','Notes'];
  const rows = STATE.trades.map((t, i) => [
    i+1, t.date, t.direction.toUpperCase(),
    t.entry.toFixed(2), t.sl.toFixed(2), t.tp ? t.tp.toFixed(2) : '',
    t.lots.toFixed(2),
    t.rr ? (1 + ':' + t.rr.toFixed(2)) : '',
    t.riskAmount.toFixed(2), t.outcome, t.pnl.toFixed(2),
    t.slPips, t.tpPips || '',
    `"${t.notes || ''}"`,
  ]);

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `gurug-goldtrader-journal-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── HELPERS ────────────────────────────────────────────
function setDefaultDate() {
  const d = new Date().toISOString().split('T')[0];
  const el = document.getElementById('tradeDate');
  if (el) el.value = d;
}


/* ═══════════════════════════════════════════════════════
   GOLD → INR CALCULATOR
   ═══════════════════════════════════════════════════════ */

const TROY_OZ_TO_GRAM = 31.1035;  // 1 troy ounce = 31.1035 grams

// ── FETCH LIVE USD/INR RATE ────────────────────────────
// Tries multiple free CORS-friendly APIs in order, picks first success.
// All these APIs explicitly allow Origin: null (file://) and localhost.
const INR_APIS = [
  {
    name: 'Frankfurter',
    url:  'https://api.frankfurter.app/latest?from=USD&to=INR',
    parse: d => d?.rates?.INR,
  },
  {
    name: 'ExchangeRate-API',
    url:  'https://open.er-api.com/v6/latest/USD',
    parse: d => d?.rates?.INR,
  },
  {
    name: 'Currency-API',
    url:  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
    parse: d => d?.usd?.inr,
  },
  {
    name: 'Fawaz-Fallback',
    url:  'https://latest.currency-api.pages.dev/v1/currencies/usd.json',
    parse: d => d?.usd?.inr,
  },
];

let _inrRefreshTimer = null;

async function fetchUsdInrRate() {
  // Spin all refresh buttons
  ['inrRefreshBtn', 'inrRefreshBtnHero'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('spinning');
  });

  const dot    = document.getElementById('inrLiveDot');
  const srcEl  = document.getElementById('inrRateSource');
  const dispEl = document.getElementById('inrRateDisplay');

  if (dot)   dot.style.background = 'var(--gold-500)'; // yellow = fetching
  if (srcEl) srcEl.textContent = 'fetching live rate…';

  let rate = null;
  let usedSource = '';

  // Try each API until one succeeds
  for (const api of INR_APIS) {
    try {
      const resp = await fetch(api.url, {
        cache:   'no-store',
        headers: { 'Accept': 'application/json' },
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const val  = api.parse(data);
      if (val && val > 50 && val < 200) { // sanity: USD/INR between 50–200
        rate = val;
        usedSource = api.name;
        break;
      }
    } catch {
      // try next source
    }
  }

  // ── Update UI ───────────────────────────────────────
  if (rate) {
    // Update rate display
    if (dispEl) dispEl.textContent = '₹' + rate.toFixed(2);

    // Auto-fill the input ONLY if it's empty or was previously auto-filled
    const rateInput = document.getElementById('inrUsdInrRate');
    if (rateInput) {
      const prev = parseFloat(rateInput.dataset.autoFilled);
      if (!rateInput.value || prev) {
        rateInput.value = rate.toFixed(2);
        rateInput.dataset.autoFilled = rate.toFixed(2);
      }
    }

    // Timestamp
    const now = new Date();
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (srcEl) srcEl.textContent = `Live · ${usedSource} · ${time}`;
    if (dot)   dot.style.background = 'var(--green)'; // green = live

    // Recalculate
    calcInr();

    // Schedule next refresh in 5 minutes
    clearTimeout(_inrRefreshTimer);
    _inrRefreshTimer = setTimeout(fetchUsdInrRate, 5 * 60 * 1000);

  } else {
    // All APIs failed
    if (dispEl) dispEl.textContent = 'Offline';
    if (srcEl)  srcEl.textContent  = 'Could not fetch rate — enter manually';
    if (dot)    dot.style.background = 'var(--red)';
  }

  // Stop spin
  ['inrRefreshBtn', 'inrRefreshBtnHero'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('spinning');
  });
}

// ── QUICK PRICE SETTER ─────────────────────────────────
function setInrGoldPrice(price) {
  document.getElementById('inrGoldUsd').value = price;
  calcInr();
}

// ── MAIN INR CALCULATION ───────────────────────────────
function calcInr() {
  const goldUsd    = parseFloat(document.getElementById('inrGoldUsd').value);
  const usdInrRate = parseFloat(document.getElementById('inrUsdInrRate').value);
  const importDuty = parseFloat(document.getElementById('inrImportDuty').value) || 6;
  const gst        = parseFloat(document.getElementById('inrGst').value)       || 3;

  const stepsEl = document.getElementById('inrSteps');
  const finalEl = document.getElementById('inrFinal');

  // Need at minimum gold price and exchange rate
  if (!goldUsd || !usdInrRate || isNaN(goldUsd) || isNaN(usdInrRate)) {
    stepsEl.innerHTML = `
      <div class="inr-empty">
        <span style="font-size:36px">🪙</span>
        <p>Enter a XAUUSD price and USD/INR rate to see the full Indian market gold price calculation.</p>
      </div>`;
    finalEl.style.display = 'none';
    return;
  }

  // ── STEP 1: Price per gram in USD ─────────────────────
  // Gold is priced per troy ounce. Convert to per gram.
  const pricePerGramUsd = goldUsd / TROY_OZ_TO_GRAM;

  // ── STEP 2: Price per gram in INR (base) ──────────────
  const pricePerGramInr = pricePerGramUsd * usdInrRate;

  // ── STEP 3: Price per 10g in INR (base) ───────────────
  const pricePer10gBase = pricePerGramInr * 10;

  // ── STEP 4: Add Import Duty ────────────────────────────
  const dutyAmount     = pricePer10gBase * (importDuty / 100);
  const pricePer10gDuty = pricePer10gBase + dutyAmount;

  // ── STEP 5: Add GST ───────────────────────────────────
  const gstAmount      = pricePer10gDuty * (gst / 100);
  const pricePer10gFinal = pricePer10gDuty + gstAmount;

  // ── Derived weights ───────────────────────────────────
  const pricePer1gFinal   = pricePer10gFinal / 10;
  const pricePerTolaFinal = pricePer1gFinal * 8;   // 1 tola = 8 grams (traditional India)
  const pricePer100gFinal = pricePer1gFinal * 100;

  // ── Render steps ──────────────────────────────────────
  stepsEl.innerHTML = [
    {
      n: 1,
      label: 'Troy Ounce → Per Gram (USD)',
      formula: `$${goldUsd.toFixed(2)} ÷ ${TROY_OZ_TO_GRAM} g/oz`,
      result: `$${pricePerGramUsd.toFixed(4)}/g`,
      cls: ''
    },
    {
      n: 2,
      label: 'USD → INR (Base Price per Gram)',
      formula: `$${pricePerGramUsd.toFixed(4)} × ₹${usdInrRate.toFixed(2)}`,
      result: `₹${fmt(pricePerGramInr)}/g`,
      cls: ''
    },
    {
      n: 3,
      label: 'Price per 10 Grams (Base)',
      formula: `₹${fmt(pricePerGramInr)} × 10 g`,
      result: `₹${fmt(pricePer10gBase)}`,
      cls: ''
    },
    {
      n: 4,
      label: `Import Duty (${importDuty}%)`,
      formula: `₹${fmt(pricePer10gBase)} × ${importDuty}% = +₹${fmt(dutyAmount)}`,
      result: `₹${fmt(pricePer10gDuty)}`,
      cls: 'is-duty'
    },
    {
      n: 5,
      label: `GST (${gst}%)`,
      formula: `₹${fmt(pricePer10gDuty)} × ${gst}% = +₹${fmt(gstAmount)}`,
      result: `₹${fmt(pricePer10gFinal)}`,
      cls: 'is-gst'
    },
    {
      n: 6,
      label: 'Final Price per 1 Gram',
      formula: `₹${fmt(pricePer10gFinal)} ÷ 10`,
      result: `₹${fmt(pricePer1gFinal)}`,
      cls: 'is-final'
    },
  ].map(s => `
    <div class="inr-step ${s.cls}">
      <div class="inr-step-num">${s.n}</div>
      <div class="inr-step-body">
        <span class="inr-step-label">${s.label}</span>
        <span class="inr-step-formula">${s.formula}</span>
      </div>
      <div class="inr-step-result">${s.result}</div>
    </div>
  `).join('<div class="inr-arrow">↓</div>');

  // ── Render final cards ─────────────────────────────────
  document.getElementById('inrPer10g').textContent   = '₹' + fmt(pricePer10gFinal);
  document.getElementById('inrPer1g').textContent    = '₹' + fmt(pricePer1gFinal);
  document.getElementById('inrPerTola').textContent  = '₹' + fmt(pricePerTolaFinal);
  document.getElementById('inrPer100g').textContent  = '₹' + fmt(pricePer100gFinal);

  finalEl.style.display = '';

  // Update header rate display
  document.getElementById('inrRateDisplay').textContent = '₹' + usdInrRate.toFixed(2);
}

// ── FORMAT INR NUMBER ─────────────────────────────────
function fmt(n) {
  // Indian number format: commas at 2+3+3 pattern
  return Math.round(n).toLocaleString('en-IN');
}
