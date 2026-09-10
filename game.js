/**
 * Game Engine - Handles Trading Logic, Portfolio State, and UI Events
 */

const GameApp = {
  student: null,
  portfolio: null,
  activeTab: 'tab-portfolio',
  selectedStock: null,
  selectedRange: '1mo',
  selectedPortfolioRange: '1m',
  orderType: 'BUY',
  refreshTimer: null,

  /**
   * Initialization
   */
  async init() {
    this.checkAuth();
    this.loadPortfolio();
    await MarketService.init();

    this.renderHeader();
    this.setupEventListeners();
    await this.refreshAllData();

    // Start background market ticker refresh every 45s
    this.refreshTimer = setInterval(() => this.backgroundRefresh(), 45000);
  },

  /**
   * Auth Guard
   */
  checkAuth() {
    const studentName = sessionStorage.getItem('studentName');
    const classCode = sessionStorage.getItem('classCode');

    if (!studentName) {
      window.location.href = 'index.html';
      return;
    }

    this.student = {
      name: studentName,
      classCode: classCode || CONFIG.CLASS_CODE
    };
  },

  /**
   * Load or initialize student portfolio from localStorage
   */
  loadPortfolio() {
    const storageKey = `portfolio_v1_${this.student.name.replace(/\s+/g, '_').toLowerCase()}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        this.portfolio = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse portfolio, creating fresh one', e);
      }
    }

    if (!this.portfolio) {
      const now = Date.now();
      this.portfolio = {
        studentName: this.student.name,
        classCode: this.student.classCode,
        cash: CONFIG.INITIAL_CASH,
        holdings: [],
        trades: [],
        equityHistory: [
          {
            timestamp: now - (7 * 86400000),
            totalValue: CONFIG.INITIAL_CASH,
            cash: CONFIG.INITIAL_CASH,
            investedValue: 0
          },
          {
            timestamp: now,
            totalValue: CONFIG.INITIAL_CASH,
            cash: CONFIG.INITIAL_CASH,
            investedValue: 0
          }
        ],
        createdAt: now,
        lastUpdated: now
      };
      this.savePortfolio();
    }
  },

  /**
   * Save portfolio to localStorage & optionally sync to Google Sheet
   */
  savePortfolio() {
    this.portfolio.lastUpdated = Date.now();
    const storageKey = `portfolio_v1_${this.student.name.replace(/\s+/g, '_').toLowerCase()}`;
    localStorage.setItem(storageKey, JSON.stringify(this.portfolio));

    // Also update class-wide roster in localStorage for instant teacher view
    this._updateClassRoster();

    // Sync with Google Apps Script if URL provided
    if (CONFIG.SCRIPT_URL && CONFIG.SCRIPT_URL.trim() !== '') {
      fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'save_portfolio',
          data: this.portfolio
        })
      }).catch(() => {});
    }
  },

  _updateClassRoster() {
    try {
      const allKey = 'class_leaderboard_all_students';
      let roster = JSON.parse(localStorage.getItem(allKey) || '[]');
      const idx = roster.findIndex(s => s.name.toLowerCase() === this.student.name.toLowerCase());
      const studentSummary = {
        name: this.student.name,
        classCode: this.student.classCode,
        totalValue: this.portfolio.equityHistory[this.portfolio.equityHistory.length - 1]?.totalValue || this.portfolio.cash,
        cash: this.portfolio.cash,
        tradesCount: this.portfolio.trades.length,
        lastUpdated: this.portfolio.lastUpdated
      };

      if (idx >= 0) {
        roster[idx] = studentSummary;
      } else {
        roster.push(studentSummary);
      }
      localStorage.setItem(allKey, JSON.stringify(roster));
    } catch (e) {}
  },

  /**
   * Render Top Header Info & Market Status
   */
  renderHeader() {
    document.getElementById('header-student-name').textContent = this.student.name;
    document.getElementById('header-student-code').textContent = this.student.classCode;
    const initial = this.student.name.charAt(0).toUpperCase();
    document.getElementById('header-avatar').textContent = initial;

    this.updateMarketStatusBadges();
  },

  /**
   * Compute Open / Closed status for Sydney and New York
   */
  updateMarketStatusBadges() {
    const now = new Date();
    // AEST/AEDT Sydney Check (Weekdays 10:00 - 16:00)
    const sydTimeStr = now.toLocaleTimeString('en-US', { timeZone: 'Australia/Sydney', hour12: false });
    const sydDay = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' })).getDay();
    const [sydH, sydM] = sydTimeStr.split(':').map(Number);
    const isAsxOpen = sydDay >= 1 && sydDay <= 5 && (sydH > 10 || (sydH === 10 && sydM >= 0)) && sydH < 16;

    const asxPill = document.getElementById('status-asx');
    if (asxPill) {
      asxPill.className = `status-pill ${isAsxOpen ? 'open' : 'closed'}`;
      asxPill.innerHTML = `🇦🇺 ASX ${isAsxOpen ? '● OPEN' : '○ CLOSED'}`;
    }

    // US NY Time Check (Weekdays 09:30 - 16:00)
    const nyTimeStr = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false });
    const nyDay = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })).getDay();
    const [nyH, nyM] = nyTimeStr.split(':').map(Number);
    const nyTotalMin = nyH * 60 + nyM;
    const isUsOpen = nyDay >= 1 && nyDay <= 5 && nyTotalMin >= (9 * 60 + 30) && nyTotalMin < (16 * 60);

    const usPill = document.getElementById('status-us');
    if (usPill) {
      usPill.className = `status-pill ${isUsOpen ? 'open' : 'closed'}`;
      usPill.innerHTML = `🇺🇸 US ${isUsOpen ? '● OPEN' : '○ CLOSED'}`;
    }
  },

  /**
   * Set up tab switching and global modal triggers
   */
  setupEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });

    // Market Explorer filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.filterStockGrid(chip.getAttribute('data-filter'));
      });
    });

    // Stock search input
    const searchInput = document.getElementById('stock-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchStockGrid(e.target.value);
      });
    }

    // Modal close button
    const modalClose = document.getElementById('modal-close-btn');
    if (modalClose) {
      modalClose.addEventListener('click', () => this.closeStockModal());
    }

    // Close modal on background click
    const modalOverlay = document.getElementById('stock-modal');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) this.closeStockModal();
      });
    }

    // Order modal Buy / Sell toggle
    const btnOrderBuy = document.getElementById('btn-order-buy');
    const btnOrderSell = document.getElementById('btn-order-sell');
    if (btnOrderBuy && btnOrderSell) {
      btnOrderBuy.addEventListener('click', () => this.setOrderType('BUY'));
      btnOrderSell.addEventListener('click', () => this.setOrderType('SELL'));
    }

    // Shares quantity input
    const sharesInput = document.getElementById('order-shares-input');
    if (sharesInput) {
      sharesInput.addEventListener('input', () => this.updateOrderCalculations());
    }

    // Max shares button
    const btnMaxShares = document.getElementById('btn-max-shares');
    if (btnMaxShares) {
      btnMaxShares.addEventListener('click', () => this.calculateMaxShares());
    }

    // Execute order button
    const btnExecute = document.getElementById('btn-execute-order');
    if (btnExecute) {
      btnExecute.addEventListener('click', () => this.submitOrder());
    }

    // Portfolio chart timeline buttons
    document.querySelectorAll('#portfolio-timeline-pills .time-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#portfolio-timeline-pills .time-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.selectedPortfolioRange = pill.getAttribute('data-range');
        ChartManager.renderPortfolioChart('portfolio-chart-canvas', this.portfolio.equityHistory, this.selectedPortfolioRange);
      });
    });

    // Stock modal timeline buttons
    document.querySelectorAll('#stock-timeline-pills .time-pill').forEach(pill => {
      pill.addEventListener('click', async () => {
        document.querySelectorAll('#stock-timeline-pills .time-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.selectedRange = pill.getAttribute('data-range');
        if (this.selectedStock) {
          await this.loadStockChart(this.selectedStock.symbol, this.selectedRange);
        }
      });
    });

    // Download CSV buttons
    const btnExportLedger = document.getElementById('btn-export-ledger');
    if (btnExportLedger) {
      btnExportLedger.addEventListener('click', () => this.exportTradeLedgerCSV());
    }

    // Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        sessionStorage.removeItem('studentName');
        sessionStorage.removeItem('classCode');
        window.location.href = 'index.html?logout=true';
      });
    }
  },

  /**
   * Switch Active Tabs
   */
  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    const activeContent = document.getElementById(tabId);
    if (activeBtn) activeBtn.classList.add('active');
    if (activeContent) activeContent.classList.add('active');

    // Trigger re-render of charts if tab has canvas
    if (tabId === 'tab-portfolio') {
      ChartManager.renderPortfolioChart('portfolio-chart-canvas', this.portfolio.equityHistory, this.selectedPortfolioRange);
      ChartManager.renderAllocationChart('allocation-chart-canvas', this.portfolio.holdings, this.portfolio.cash);
    } else if (tabId === 'tab-leaderboard') {
      this.renderLeaderboard();
    }
  },

  /**
   * Refresh all live quotes, portfolio valuations, and ticker ribbon
   */
  async refreshAllData() {
    this.updateMarketStatusBadges();

    // 1. Fetch quotes for all holdings
    let totalInvestedAUD = 0;
    let todayHoldingsGainAUD = 0;

    for (const h of this.portfolio.holdings) {
      const q = await MarketService.fetchQuote(h.symbol);
      h.currentPrice = q.price;
      h.currentPriceAUD = MarketService.toAUD(q.price, q.currency);
      h.currentValueAUD = h.shares * h.currentPriceAUD;
      h.unrealizedGainAUD = h.currentValueAUD - h.totalCostAUD;
      h.unrealizedGainPct = (h.unrealizedGainAUD / h.totalCostAUD) * 100;
      h.dayChangeAUD = (h.currentPrice - q.previousClose) * h.shares;
      if (q.currency === 'USD') h.dayChangeAUD = MarketService.toAUD(h.dayChangeAUD, 'USD');

      totalInvestedAUD += h.currentValueAUD;
      todayHoldingsGainAUD += h.dayChangeAUD;
    }

    const totalPortfolioValue = this.portfolio.cash + totalInvestedAUD;
    const totalReturnAUD = totalPortfolioValue - CONFIG.INITIAL_CASH;
    const totalReturnPct = (totalReturnAUD / CONFIG.INITIAL_CASH) * 100;

    // Record snapshot into equity history
    this._recordEquitySnapshot(totalPortfolioValue, totalInvestedAUD);

    // 2. Render KPI Cards
    this.renderKPIs({
      totalValue: totalPortfolioValue,
      cash: this.portfolio.cash,
      invested: totalInvestedAUD,
      totalReturnAUD: totalReturnAUD,
      totalReturnPct: totalReturnPct,
      dayChangeAUD: todayHoldingsGainAUD
    });

    // 3. Render Holdings Table
    this.renderHoldingsTable();

    // 4. Render Portfolio Charts
    ChartManager.renderPortfolioChart('portfolio-chart-canvas', this.portfolio.equityHistory, this.selectedPortfolioRange);
    ChartManager.renderAllocationChart('allocation-chart-canvas', this.portfolio.holdings, this.portfolio.cash);

    // 5. Render Market Explorer
    await this.renderMarketExplorer();

    // 6. Render Trade Ledger
    this.renderTradeLedger();

    // 7. Render Ticker Tape
    await this.renderTickerTape();

    this.savePortfolio();
  },

  /**
   * Background tick refresh
   */
  async backgroundRefresh() {
    await this.refreshAllData();
  },

  /**
   * Append equity snapshot to portfolio history
   */
  _recordEquitySnapshot(totalVal, investedVal) {
    const now = Date.now();
    const hist = this.portfolio.equityHistory;
    const last = hist[hist.length - 1];

    // If last point was less than 5 minutes ago, update it; otherwise append
    if (last && (now - last.timestamp < 300000)) {
      last.totalValue = Number(totalVal.toFixed(2));
      last.cash = Number(this.portfolio.cash.toFixed(2));
      last.investedValue = Number(investedVal.toFixed(2));
      last.timestamp = now;
    } else {
      hist.push({
        timestamp: now,
        totalValue: Number(totalVal.toFixed(2)),
        cash: Number(this.portfolio.cash.toFixed(2)),
        investedValue: Number(investedVal.toFixed(2))
      });
    }

    // Keep history manageable (last 300 data points)
    if (hist.length > 300) {
      hist.shift();
    }
  },

  /**
   * Render KPI Summary Cards
   */
  renderKPIs(metrics) {
    document.getElementById('kpi-total-val').textContent = `$${metrics.totalValue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('kpi-cash-val').textContent = `$${metrics.cash.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('kpi-invested-val').textContent = `$${metrics.invested.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const isUp = metrics.totalReturnAUD >= 0;
    const sign = isUp ? '+' : '';
    const badge = document.getElementById('kpi-return-badge');
    badge.className = `kpi-badge ${isUp ? 'up' : 'down'}`;
    badge.innerHTML = `${isUp ? '▲' : '▼'} ${sign}$${Math.abs(metrics.totalReturnAUD).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${sign}${metrics.totalReturnPct.toFixed(2)}%)`;

    const dayUp = metrics.dayChangeAUD >= 0;
    const daySign = dayUp ? '+' : '';
    const dayBadge = document.getElementById('kpi-day-badge');
    dayBadge.className = `kpi-badge ${dayUp ? 'up' : 'down'}`;
    dayBadge.innerHTML = `${dayUp ? '▲' : '▼'} ${daySign}$${Math.abs(metrics.dayChangeAUD).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  /**
   * Render Top Scrolling Ticker Ribbon
   */
  async renderTickerTape() {
    const track = document.getElementById('ticker-tape-track');
    if (!track) return;

    const featured = CONFIG.FEATURED_STOCKS.slice(0, 14);
    let html = '';

    for (const s of featured) {
      const q = await MarketService.fetchQuote(s.symbol);
      const isUp = q.change >= 0;
      const sign = isUp ? '+' : '';
      const flag = s.exchange === 'ASX' ? '🇦🇺' : '🇺🇸';

      html += `
        <div class="ticker-item" onclick="GameApp.openStockModal('${s.symbol}')">
          <span class="flag">${flag}</span>
          <span class="sym">${s.symbol}</span>
          <span class="price">${s.currency === 'USD' ? 'US$' : '$'}${q.price.toFixed(2)}</span>
          <span class="chg ${isUp ? 'up' : 'down'}">${sign}${q.changePercent.toFixed(2)}%</span>
        </div>
      `;
    }

    // Duplicate track content for seamless infinite CSS scroll
    track.innerHTML = html + html;
  },

  /**
   * Render Active Portfolio Holdings Table
   */
  renderHoldingsTable() {
    const tbody = document.getElementById('holdings-table-body');
    const emptyState = document.getElementById('holdings-empty-state');
    const countBadge = document.getElementById('holdings-count-badge');

    if (countBadge) countBadge.textContent = `${this.portfolio.holdings.length} stocks`;

    if (!this.portfolio.holdings || this.portfolio.holdings.length === 0) {
      if (tbody) tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    let rows = '';
    this.portfolio.holdings.forEach(h => {
      const isProfit = h.unrealizedGainAUD >= 0;
      const sign = isProfit ? '+' : '';
      const exchClass = h.exchange.toLowerCase();
      const flag = h.exchange === 'ASX' ? '🇦🇺' : '🇺🇸';

      rows += `
        <tr>
          <td>
            <div class="ticker-cell">
              <span class="market-flag">${flag}</span>
              <div class="ticker-text">
                <span class="ticker-sym">${h.symbol}</span>
                <span class="ticker-name">${h.name}</span>
              </div>
            </div>
          </td>
          <td><span class="exchange-chip ${exchClass}">${h.exchange}</span></td>
          <td class="num-cell" style="font-weight:700;">${h.shares.toLocaleString()}</td>
          <td class="num-cell">$${h.avgPriceAUD.toFixed(2)} AUD</td>
          <td class="num-cell" style="font-weight:700;">
            ${h.currency === 'USD' ? `US$${h.currentPrice.toFixed(2)}<br><small style="color:var(--text-dim);">` : ''}
            $${h.currentPriceAUD.toFixed(2)} AUD
            ${h.currency === 'USD' ? '</small>' : ''}
          </td>
          <td class="num-cell" style="font-weight:700;">$${h.currentValueAUD.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD</td>
          <td class="num-cell ${isProfit ? 'val-up' : 'val-down'}" style="font-weight:700;">
            ${sign}$${h.unrealizedGainAUD.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br>
            <small>(${sign}${h.unrealizedGainPct.toFixed(2)}%)</small>
          </td>
          <td>
            <button class="btn-action-sm btn-buy-sm" onclick="GameApp.openStockModal('${h.symbol}', 'BUY')">Buy +</button>
            <button class="btn-action-sm btn-sell-sm" onclick="GameApp.openStockModal('${h.symbol}', 'SELL')">Sell -</button>
          </td>
        </tr>
      `;
    });

    if (tbody) tbody.innerHTML = rows;
  },

  /**
   * Render Market Explorer Stock Cards
   */
  async renderMarketExplorer() {
    const grid = document.getElementById('market-stocks-grid');
    if (!grid) return;

    let html = '';
    for (const s of CONFIG.FEATURED_STOCKS) {
      const q = await MarketService.fetchQuote(s.symbol);
      const isUp = q.change >= 0;
      const sign = isUp ? '+' : '';
      const flag = s.exchange === 'ASX' ? '🇦🇺' : '🇺🇸';
      const exchClass = s.exchange.toLowerCase();
      const audPrice = MarketService.toAUD(q.price, s.currency);

      html += `
        <div class="stock-card" data-symbol="${s.symbol}" data-sector="${s.sector}" data-exchange="${s.exchange}" onclick="GameApp.openStockModal('${s.symbol}')">
          <div class="stock-card-top">
            <div>
              <div style="display:flex;align-items:center;gap:0.4rem;">
                <span style="font-size:1.1rem;">${flag}</span>
                <span class="stock-sym-large">${s.symbol}</span>
              </div>
              <div class="stock-name-sub">${s.name}</div>
            </div>
            <span class="exchange-chip ${exchClass}">${s.exchange}</span>
          </div>

          <div class="stock-price-box">
            <div class="stock-price-main">${s.currency === 'USD' ? 'US$' : '$'}${q.price.toFixed(2)}</div>
            ${s.currency === 'USD' ? `<div class="stock-price-aud">≈ $${audPrice.toFixed(2)} AUD</div>` : ''}
          </div>

          <div class="stock-card-meta">
            <span class="kpi-badge ${isUp ? 'up' : 'down'}">${sign}${q.changePercent.toFixed(2)}%</span>
            <span>${s.sector}</span>
          </div>
        </div>
      `;
    }

    grid.innerHTML = html;
  },

  /**
   * Filter Stock Grid by Exchange / Sector
   */
  filterStockGrid(filter) {
    const cards = document.querySelectorAll('.stock-card');
    cards.forEach(card => {
      const exch = card.getAttribute('data-exchange');
      const sector = card.getAttribute('data-sector');

      if (filter === 'all') {
        card.style.display = 'flex';
      } else if (filter === 'asx') {
        card.style.display = exch === 'ASX' ? 'flex' : 'none';
      } else if (filter === 'nyse') {
        card.style.display = exch === 'NYSE' ? 'flex' : 'none';
      } else if (filter === 'nasdaq') {
        card.style.display = exch === 'NASDAQ' ? 'flex' : 'none';
      } else if (filter === 'tech') {
        card.style.display = (sector.includes('Tech') || sector.includes('Semiconductors')) ? 'flex' : 'none';
      } else if (filter === 'mining') {
        card.style.display = sector.includes('Mining') ? 'flex' : 'none';
      } else if (filter === 'banks') {
        card.style.display = sector.includes('Financial') ? 'flex' : 'none';
      }
    });
  },

  /**
   * Search Stock Grid
   */
  searchStockGrid(query) {
    const q = query.toLowerCase().trim();
    const cards = document.querySelectorAll('.stock-card');
    cards.forEach(card => {
      const sym = card.getAttribute('data-symbol').toLowerCase();
      const sec = card.getAttribute('data-sector').toLowerCase();
      const isMatch = sym.includes(q) || sec.includes(q);
      card.style.display = isMatch ? 'flex' : 'none';
    });
  },

  /**
   * Open Stock Detailed Modal with Timeline Chart & Order Execution
   */
  async openStockModal(symbol, defaultOrder = 'BUY') {
    const quote = await MarketService.fetchQuote(symbol);
    this.selectedStock = quote;
    this.orderType = defaultOrder;

    const modal = document.getElementById('stock-modal');
    if (!modal) return;

    // Header info
    document.getElementById('modal-stock-sym').textContent = quote.symbol;
    document.getElementById('modal-stock-name').textContent = quote.name;
    document.getElementById('modal-exchange-badge').textContent = quote.exchange;
    document.getElementById('modal-exchange-badge').className = `exchange-chip ${quote.exchange.toLowerCase()}`;

    const flag = quote.exchange === 'ASX' ? '🇦🇺' : '🇺🇸';
    document.getElementById('modal-stock-flag').textContent = flag;

    // Prices
    document.getElementById('modal-stock-price').textContent = `${quote.currency === 'USD' ? 'US$' : '$'}${quote.price.toFixed(2)}`;
    const audPrice = MarketService.toAUD(quote.price, quote.currency);
    document.getElementById('modal-stock-price-aud').textContent = quote.currency === 'USD' ? `≈ $${audPrice.toFixed(2)} AUD` : '';

    const isUp = quote.change >= 0;
    const sign = isUp ? '+' : '';
    const chgBadge = document.getElementById('modal-stock-change');
    chgBadge.className = `kpi-badge ${isUp ? 'up' : 'down'}`;
    chgBadge.textContent = `${sign}$${quote.change.toFixed(2)} (${sign}${quote.changePercent.toFixed(2)}%)`;

    // Metadata
    document.getElementById('modal-meta-range52').textContent = `$${quote.fiftyTwoWeekLow.toFixed(2)} - $${quote.fiftyTwoWeekHigh.toFixed(2)}`;
    document.getElementById('modal-meta-mktcap').textContent = quote.marketCap;
    document.getElementById('modal-meta-pe').textContent = quote.peRatio;

    // Holding Info
    const holding = this.portfolio.holdings.find(h => h.symbol === quote.symbol);
    const ownedShares = holding ? holding.shares : 0;
    document.getElementById('modal-owned-shares').textContent = `${ownedShares.toLocaleString()} shares`;

    // Reset inputs
    document.getElementById('order-shares-input').value = 10;
    this.setOrderType(defaultOrder);

    modal.classList.add('open');

    // Render stock chart
    await this.loadStockChart(symbol, this.selectedRange);
  },

  /**
   * Load Historical Chart Series into Modal
   */
  async loadStockChart(symbol, range) {
    const chartData = await MarketService.fetchChart(symbol, range);
    ChartManager.renderStockChart('stock-modal-canvas', chartData, range);
  },

  /**
   * Close Stock Modal
   */
  closeStockModal() {
    const modal = document.getElementById('stock-modal');
    if (modal) modal.classList.remove('open');
    this.selectedStock = null;
  },

  /**
   * Set order type: BUY or SELL
   */
  setOrderType(type) {
    this.orderType = type;
    const btnBuy = document.getElementById('btn-order-buy');
    const btnSell = document.getElementById('btn-order-sell');
    const btnExec = document.getElementById('btn-execute-order');

    if (type === 'BUY') {
      btnBuy.classList.add('active');
      btnSell.classList.remove('active');
      btnExec.className = 'btn-execute buy';
      btnExec.textContent = 'Confirm Buy Order ➔';
    } else {
      btnBuy.classList.remove('active');
      btnSell.classList.add('active');
      btnExec.className = 'btn-execute sell';
      btnExec.textContent = 'Confirm Sell Order ➔';
    }

    this.updateOrderCalculations();
  },

  /**
   * Live calculations inside order execution panel
   */
  updateOrderCalculations() {
    if (!this.selectedStock) return;

    const sharesInput = document.getElementById('order-shares-input');
    const shares = parseInt(sharesInput.value) || 0;
    const quote = this.selectedStock;
    const unitAUD = MarketService.toAUD(quote.price, quote.currency);
    const subtotalAUD = shares * unitAUD;
    const brokerage = CONFIG.BROKERAGE_FEE;

    document.getElementById('calc-subtotal').textContent = `$${subtotalAUD.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD`;
    document.getElementById('calc-brokerage').textContent = `$${brokerage.toFixed(2)} AUD`;

    const btnExec = document.getElementById('btn-execute-order');
    const warning = document.getElementById('order-warning-msg');

    if (this.orderType === 'BUY') {
      const totalCostAUD = subtotalAUD + brokerage;
      document.getElementById('calc-total').textContent = `$${totalCostAUD.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD`;

      if (shares <= 0) {
        btnExec.disabled = true;
        warning.style.display = 'none';
      } else if (totalCostAUD > this.portfolio.cash) {
        btnExec.disabled = true;
        warning.textContent = `Insufficient cash ($${this.portfolio.cash.toFixed(2)} available).`;
        warning.style.display = 'block';
      } else {
        btnExec.disabled = false;
        warning.style.display = 'none';
      }
    } else {
      // SELL
      const netProceedsAUD = Math.max(0, subtotalAUD - brokerage);
      document.getElementById('calc-total').textContent = `$${netProceedsAUD.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD`;

      const holding = this.portfolio.holdings.find(h => h.symbol === quote.symbol);
      const owned = holding ? holding.shares : 0;

      if (shares <= 0) {
        btnExec.disabled = true;
        warning.style.display = 'none';
      } else if (shares > owned) {
        btnExec.disabled = true;
        warning.textContent = `You only own ${owned} shares of ${quote.symbol}.`;
        warning.style.display = 'block';
      } else {
        btnExec.disabled = false;
        warning.style.display = 'none';
      }
    }
  },

  /**
   * Calculate maximum shares user can afford to buy or sell
   */
  calculateMaxShares() {
    if (!this.selectedStock) return;
    const quote = this.selectedStock;
    const unitAUD = MarketService.toAUD(quote.price, quote.currency);

    if (this.orderType === 'BUY') {
      const usableCash = this.portfolio.cash - CONFIG.BROKERAGE_FEE;
      const maxShares = usableCash > 0 ? Math.floor(usableCash / unitAUD) : 0;
      document.getElementById('order-shares-input').value = Math.max(0, maxShares);
    } else {
      const holding = this.portfolio.holdings.find(h => h.symbol === quote.symbol);
      document.getElementById('order-shares-input').value = holding ? holding.shares : 0;
    }

    this.updateOrderCalculations();
  },

  /**
   * Submit Order
   */
  submitOrder() {
    if (!this.selectedStock) return;

    const sharesInput = document.getElementById('order-shares-input');
    const shares = parseInt(sharesInput.value) || 0;
    if (shares <= 0) return;

    const quote = this.selectedStock;
    const unitAUD = MarketService.toAUD(quote.price, quote.currency);
    const subtotalAUD = shares * unitAUD;
    const brokerage = CONFIG.BROKERAGE_FEE;
    const now = Date.now();

    if (this.orderType === 'BUY') {
      const totalCostAUD = subtotalAUD + brokerage;
      if (totalCostAUD > this.portfolio.cash) {
        this.showToast('Order failed: Insufficient funds.', 'error');
        return;
      }

      // Deduct cash
      this.portfolio.cash -= totalCostAUD;

      // Update or insert into holdings
      const existing = this.portfolio.holdings.find(h => h.symbol === quote.symbol);
      if (existing) {
        const prevTotalCost = existing.totalCostAUD;
        existing.shares += shares;
        existing.totalCostAUD = prevTotalCost + totalCostAUD;
        existing.avgPriceAUD = existing.totalCostAUD / existing.shares;
      } else {
        this.portfolio.holdings.push({
          symbol: quote.symbol,
          name: quote.name,
          exchange: quote.exchange,
          currency: quote.currency,
          shares: shares,
          avgPriceAUD: totalCostAUD / shares,
          totalCostAUD: totalCostAUD
        });
      }

      // Log trade
      this.portfolio.trades.unshift({
        id: `tr_${now}`,
        timestamp: now,
        type: 'BUY',
        symbol: quote.symbol,
        name: quote.name,
        exchange: quote.exchange,
        shares: shares,
        price: quote.price,
        currency: quote.currency,
        exchangeRate: quote.currency === 'USD' ? MarketService.audUsdRate : 1.0,
        brokerageAUD: brokerage,
        totalAUD: totalCostAUD
      });

      this.showToast(`Bought ${shares} shares of ${quote.symbol} for $${totalCostAUD.toFixed(2)} AUD!`, 'success');

    } else {
      // SELL ORDER
      const holdingIdx = this.portfolio.holdings.findIndex(h => h.symbol === quote.symbol);
      if (holdingIdx === -1) return;
      const holding = this.portfolio.holdings[holdingIdx];

      if (shares > holding.shares) {
        this.showToast('Order failed: Cannot sell more shares than owned.', 'error');
        return;
      }

      const netProceedsAUD = Math.max(0, subtotalAUD - brokerage);
      this.portfolio.cash += netProceedsAUD;

      // Realized gain calculation
      const costBasis = holding.avgPriceAUD * shares;
      const realizedGainAUD = netProceedsAUD - costBasis;

      holding.shares -= shares;
      holding.totalCostAUD -= costBasis;

      // Remove holding if all shares sold
      if (holding.shares <= 0) {
        this.portfolio.holdings.splice(holdingIdx, 1);
      }

      // Log trade
      this.portfolio.trades.unshift({
        id: `tr_${now}`,
        timestamp: now,
        type: 'SELL',
        symbol: quote.symbol,
        name: quote.name,
        exchange: quote.exchange,
        shares: shares,
        price: quote.price,
        currency: quote.currency,
        exchangeRate: quote.currency === 'USD' ? MarketService.audUsdRate : 1.0,
        brokerageAUD: brokerage,
        totalAUD: netProceedsAUD,
        realizedGainAUD: realizedGainAUD
      });

      const sign = realizedGainAUD >= 0 ? '+' : '';
      this.showToast(`Sold ${shares} shares of ${quote.symbol} for $${netProceedsAUD.toFixed(2)} AUD (${sign}$${realizedGainAUD.toFixed(2)} gain)`, 'success');
    }

    this.closeStockModal();
    this.refreshAllData();
  },

  /**
   * Render Trade History Ledger
   */
  renderTradeLedger() {
    const tbody = document.getElementById('ledger-table-body');
    const emptyState = document.getElementById('ledger-empty-state');
    if (!tbody) return;

    if (!this.portfolio.trades || this.portfolio.trades.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    let rows = '';
    this.portfolio.trades.forEach(t => {
      const d = new Date(t.timestamp).toLocaleString('en-AU', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const isBuy = t.type === 'BUY';
      const badgeClass = isBuy ? 'up' : 'down';
      const flag = t.exchange === 'ASX' ? '🇦🇺' : '🇺🇸';

      rows += `
        <tr>
          <td style="color:var(--text-dim);font-size:0.8rem;">${d}</td>
          <td><span class="kpi-badge ${badgeClass}">${t.type}</span></td>
          <td>
            <span style="margin-right:0.3rem;">${flag}</span>
            <strong style="font-family:var(--font-mono);">${t.symbol}</strong>
            <small style="color:var(--text-dim);margin-left:0.4rem;">(${t.name})</small>
          </td>
          <td class="num-cell">${t.shares.toLocaleString()}</td>
          <td class="num-cell">${t.currency === 'USD' ? 'US$' : '$'}${t.price.toFixed(2)}</td>
          <td class="num-cell">$${t.brokerageAUD.toFixed(2)} AUD</td>
          <td class="num-cell" style="font-weight:700;">$${t.totalAUD.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD</td>
          <td class="num-cell">
            ${t.realizedGainAUD !== undefined ? `
              <span class="${t.realizedGainAUD >= 0 ? 'val-up' : 'val-down'}">
                ${t.realizedGainAUD >= 0 ? '+' : ''}$${t.realizedGainAUD.toFixed(2)}
              </span>
            ` : '<span style="color:var(--text-dim);">—</span>'}
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rows;
  },

  /**
   * Render Class Leaderboard
   */
  renderLeaderboard() {
    const tbody = document.getElementById('leaderboard-table-body');
    if (!tbody) return;

    // Load registered classmates from localStorage
    let roster = [];
    try {
      roster = JSON.parse(localStorage.getItem('class_leaderboard_all_students') || '[]');
    } catch (e) {}

    // Add baseline realistic classmates if roster has few students
    if (roster.length < 5) {
      const simulatedClassmates = [
        { name: 'Liam Zhang', classCode: CONFIG.CLASS_CODE, totalValue: 54320.50, cash: 12400.00, tradesCount: 9 },
        { name: 'Chloe Davies', classCode: CONFIG.CLASS_CODE, totalValue: 53150.00, cash: 8500.00, tradesCount: 14 },
        { name: 'Marcus Wong', classCode: CONFIG.CLASS_CODE, totalValue: 51890.20, cash: 18900.00, tradesCount: 6 },
        { name: 'Sophie Miller', classCode: CONFIG.CLASS_CODE, totalValue: 49450.00, cash: 24000.00, tradesCount: 8 },
        { name: 'Ethan Brown', classCode: CONFIG.CLASS_CODE, totalValue: 47800.00, cash: 3100.00, tradesCount: 18 }
      ];

      simulatedClassmates.forEach(s => {
        if (!roster.some(r => r.name === s.name)) {
          roster.push(s);
        }
      });
    }

    // Always include current student
    const currentTotalVal = this.portfolio.equityHistory[this.portfolio.equityHistory.length - 1]?.totalValue || this.portfolio.cash;
    const currentStudentObj = {
      name: this.student.name,
      classCode: this.student.classCode,
      totalValue: currentTotalVal,
      cash: this.portfolio.cash,
      tradesCount: this.portfolio.trades.length,
      isUser: true
    };

    const userIdx = roster.findIndex(s => s.name.toLowerCase() === this.student.name.toLowerCase());
    if (userIdx >= 0) {
      roster[userIdx] = currentStudentObj;
    } else {
      roster.push(currentStudentObj);
    }

    // Sort descending by total portfolio value
    roster.sort((a, b) => b.totalValue - a.totalValue);

    let rows = '';
    roster.forEach((s, idx) => {
      const rank = idx + 1;
      const rankBadge = rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : rank === 3 ? '🥉 3' : `#${rank}`;
      const roi = ((s.totalValue - CONFIG.INITIAL_CASH) / CONFIG.INITIAL_CASH) * 100;
      const isProfit = roi >= 0;
      const sign = isProfit ? '+' : '';
      const isCurrentUser = s.name.toLowerCase() === this.student.name.toLowerCase();

      rows += `
        <tr style="${isCurrentUser ? 'background:rgba(6,182,212,0.1);font-weight:600;' : ''}">
          <td style="font-family:var(--font-mono);">${rankBadge}</td>
          <td>
            ${s.name} ${isCurrentUser ? '<span class="tab-badge" style="background:var(--asx-blue);color:#070b14;margin-left:0.4rem;">YOU</span>' : ''}
          </td>
          <td class="num-cell" style="font-weight:700;">$${s.totalValue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD</td>
          <td class="num-cell ${isProfit ? 'val-up' : 'val-down'}">${sign}${roi.toFixed(2)}%</td>
          <td class="num-cell">$${s.cash.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="num-cell">${s.tradesCount || 0}</td>
        </tr>
      `;
    });

    tbody.innerHTML = rows;
  },

  /**
   * Export Student Trade Ledger to CSV
   */
  exportTradeLedgerCSV() {
    if (!this.portfolio.trades || this.portfolio.trades.length === 0) {
      this.showToast('No trades executed yet to export.', 'error');
      return;
    }

    const headers = ['Timestamp', 'Type', 'Symbol', 'Name', 'Exchange', 'Shares', 'Price', 'Currency', 'ExchangeRate', 'BrokerageAUD', 'TotalAUD', 'RealizedGainAUD'];
    const rows = this.portfolio.trades.map(t => [
      `"${new Date(t.timestamp).toISOString()}"`,
      `"${t.type}"`,
      `"${t.symbol}"`,
      `"${t.name.replace(/"/g, '""')}"`,
      `"${t.exchange}"`,
      t.shares,
      t.price,
      `"${t.currency}"`,
      t.exchangeRate,
      t.brokerageAUD,
      t.totalAUD,
      t.realizedGainAUD || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${this.student.name.replace(/\s+/g, '_')}_trades.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast('Trade ledger exported to CSV successfully!', 'success');
  },

  /**
   * Show Toast Notification
   */
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : '⚠️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

// Start Game App when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  GameApp.init();
});
