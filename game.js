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
  journalSaveTimeout: null,

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

    // Check for automated periodic dividends
    this.processAutomatedDividends();

    // Start background market ticker refresh every 45s
    this.refreshTimer = setInterval(() => this.backgroundRefresh(), 45000);

    // Initialize Cloud Firestore Real-Time Subscriptions
    this.initCloudSync();
  },

  /**
   * Cloud Firestore Real-Time Subscriptions & Event Listeners
   */
  initCloudSync() {
    if (typeof FirestoreSync === 'undefined') return;

    FirestoreSync.init();

    // 1. Subscribe to Live Class Leaderboard (Cross-laptop real-time sync)
    FirestoreSync.listenToClassLeaderboard(this.student.classCode, (remoteStudents) => {
      if (remoteStudents && remoteStudents.length > 0) {
        this.remoteClassmates = remoteStudents;
        this.renderLeaderboard();
      }
    });

    // 2. Subscribe to Teacher Macro Catalysts & Market Events
    FirestoreSync.listenToMacroCatalysts((catalyst) => {
      this.handleMacroCatalystEvent(catalyst);
    });

    // 3. Subscribe to Round Freeze / Active Status
    FirestoreSync.listenToRoundStatus(this.student.classCode, (status) => {
      this.handleRoundStatusChange(status);
    });
  },

  handleMacroCatalystEvent(catalyst) {
    if (!catalyst) return;
    const banner = document.getElementById('macro-catalyst-banner');
    const title = document.getElementById('catalyst-banner-title');
    const summary = document.getElementById('catalyst-banner-summary');
    if (banner && title && summary) {
      title.textContent = catalyst.title || 'Breaking Economic News:';
      summary.textContent = catalyst.summary || '';
      banner.style.display = 'block';
    }
    this.showToast(`🚨 BREAKING NEWS: ${catalyst.title}`, 'info');
  },

  handleRoundStatusChange(status) {
    this.roundStatus = status;
    const badge = document.getElementById('round-status-badge');
    if (badge) {
      if (status === 'FROZEN') {
        badge.textContent = '🔒 TRADING FROZEN';
        badge.style.background = 'rgba(239,68,68,0.2)';
        badge.style.color = '#f87171';
      } else {
        badge.textContent = '🟢 TRADING OPEN';
        badge.style.background = 'rgba(16,185,129,0.2)';
        badge.style.color = '#34d399';
      }
    }
  },

  /**
   * Auth Guard & SDK Initialization (Unified SSO)
   */
  checkAuth() {
    // 1. DataTrends Platform Authentication Session (Single Sign-On)
    if (typeof DataTrendsAuth !== 'undefined') {
      try {
        DataTrendsAuth.init();
        const portalUser = DataTrendsAuth.getUser();
        if (portalUser && portalUser.name) {
          this.student = {
            name: portalUser.name,
            classCode: portalUser.classCode || CONFIG.DEFAULT_CLASS_CODE || '10COMM1'
          };
          sessionStorage.setItem('studentName', this.student.name);
          sessionStorage.setItem('classCode', this.student.classCode);
          return;
        }
      } catch (e) {
        console.warn('DataTrendsAuth SSO check:', e);
      }
    }

    // 2. DataTrends Universal SDK Integration
    if (window.DataTrendsSDK) {
      try {
        this.dtSdk = new window.DataTrendsSDK({
          appId: 'sharemarket',
          appName: 'Global Share Market Arena',
          portalUrl: (typeof DataTrendsAuth !== 'undefined') ? '../../launchpad.html' : 'index.html'
        });
        this.dtSdk.init();
        const u = this.dtSdk.getUser();
        if (u) {
          this.student = {
            name: u.name,
            classCode: (u.classes && u.classes.length > 0) ? u.classes[0] : (CONFIG.DEFAULT_CLASS_CODE || '10COMM1')
          };
          return;
        }
      } catch (e) {
        console.warn('DataTrendsSDK initialization fallback', e);
      }
    }

    // 3. Direct URL parameters (?student=...&class=...)
    const urlParams = new URLSearchParams(window.location.search);
    const paramStudent = urlParams.get('student');
    const paramClass = urlParams.get('class');
    if (paramStudent) {
      this.student = {
        name: paramStudent,
        classCode: paramClass || CONFIG.DEFAULT_CLASS_CODE || '10COMM1'
      };
      sessionStorage.setItem('studentName', paramStudent);
      sessionStorage.setItem('classCode', this.student.classCode);
      return;
    }

    // 4. Fallback to existing sessionStorage or Guest Trader
    const studentName = sessionStorage.getItem('studentName');
    const classCode = sessionStorage.getItem('classCode');

    this.student = {
      name: studentName || 'Guest Trader',
      classCode: classCode || CONFIG.DEFAULT_CLASS_CODE || '10COMM1'
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
        journal: {}, // symbol -> { thesis, riskFactors, priceTarget, updated }
        watchlist: ['BHP.AX', 'NVDA', 'CBA.AX'], // default starter watchlist
        lastDividendTimestamp: now,
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
    } else {
      if (!this.portfolio.journal) this.portfolio.journal = {};
      if (!this.portfolio.lastDividendTimestamp) this.portfolio.lastDividendTimestamp = Date.now();
      if (!this.portfolio.watchlist) this.portfolio.watchlist = ['BHP.AX', 'NVDA', 'CBA.AX'];
    }
  },

  /**
   * Save portfolio to localStorage & optionally sync to Google Sheet
   */
  savePortfolio() {
    this.portfolio.lastUpdated = Date.now();
    const storageKey = `portfolio_v1_${this.student.name.replace(/\s+/g, '_').toLowerCase()}`;
    localStorage.setItem(storageKey, JSON.stringify(this.portfolio));

    this._updateClassRoster();

    // Cloud Firestore Live Classroom Sync
    if (typeof FirestoreSync !== 'undefined') {
      FirestoreSync.saveStudentPortfolio(this.student.name, this.student.classCode, this.portfolio);
    }

    // DataTrends Universal SDK Cloud Sync
    if (this.dtSdk) {
      this.dtSdk.saveData(this.portfolio).catch(() => {});
    }

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
    document.getElementById('header-student-name').textContent = this.formatStudentName(this.student.name, false);
    document.getElementById('header-student-code').textContent = this.student.classCode;
    const initial = this.student.name.charAt(0).toUpperCase();
    document.getElementById('header-avatar').textContent = initial;

    this.updateMarketStatusBadges();
  },

  /**
   * Formats student name according to PRIVACY_MODE
   */
  formatStudentName(fullName, applyPrivacy = true) {
    if (!applyPrivacy || CONFIG.PRIVACY_MODE === 'FULL') return fullName;

    if (CONFIG.PRIVACY_MODE === 'ANONYMOUS') {
      let hash = 0;
      for (let i = 0; i < fullName.length; i++) hash = (hash << 5) - hash + fullName.charCodeAt(i);
      return `Trader #${Math.abs(hash % 900) + 100}`;
    }

    // Default 'INITIALS': e.g. "Samuel Green" -> "Samuel G."
    const parts = fullName.trim().split(' ');
    if (parts.length > 1) {
      return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
    }
    return fullName;
  },

  /**
   * Compute Open / Closed status for Sydney and New York
   */
  updateMarketStatusBadges() {
    const now = new Date();
    // AEST Sydney Check (Weekdays 10:00 - 16:00)
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
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });

    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.filterStockGrid(chip.getAttribute('data-filter'));
      });
    });

    const searchInput = document.getElementById('stock-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchStockGrid(e.target.value);
        this.showSearchDropdown('stock-search-input', 'explorer-search-results', e.target.value);
      });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleSearchEnter('stock-search-input', 'explorer-search-results');
        }
      });
    }

    const dashSearch = document.getElementById('dashboard-stock-search');
    if (dashSearch) {
      dashSearch.addEventListener('input', (e) => {
        this.showSearchDropdown('dashboard-stock-search', 'dashboard-search-results', e.target.value);
      });
      dashSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleQuickSearch();
        }
      });
    }

    const btnDashSearch = document.getElementById('btn-dashboard-search');
    if (btnDashSearch) {
      btnDashSearch.addEventListener('click', () => {
        this.handleQuickSearch();
      });
    }

    // Close search dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-input-wrap')) {
        const d1 = document.getElementById('dashboard-search-results');
        const d2 = document.getElementById('explorer-search-results');
        if (d1) d1.style.display = 'none';
        if (d2) d2.style.display = 'none';
      }
    });

    const modalClose = document.getElementById('modal-close-btn');
    if (modalClose) {
      modalClose.addEventListener('click', () => this.closeStockModal());
    }

    const modalOverlay = document.getElementById('stock-modal');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) this.closeStockModal();
      });
    }

    const btnOrderBuy = document.getElementById('btn-order-buy');
    const btnOrderSell = document.getElementById('btn-order-sell');
    if (btnOrderBuy && btnOrderSell) {
      btnOrderBuy.addEventListener('click', () => this.setOrderType('BUY'));
      btnOrderSell.addEventListener('click', () => this.setOrderType('SELL'));
    }

    const sharesInput = document.getElementById('order-shares-input');
    if (sharesInput) {
      sharesInput.addEventListener('input', () => this.updateOrderCalculations());
    }

    const rationaleInput = document.getElementById('order-justification-input');
    if (rationaleInput) {
      rationaleInput.addEventListener('input', () => this.updateOrderCalculations());
    }

    const btnMaxShares = document.getElementById('btn-max-shares');
    if (btnMaxShares) {
      btnMaxShares.addEventListener('click', () => this.calculateMaxShares());
    }

    const btnExecute = document.getElementById('btn-execute-order');
    if (btnExecute) {
      btnExecute.addEventListener('click', () => this.submitOrder());
    }

    document.querySelectorAll('#portfolio-timeline-pills .time-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#portfolio-timeline-pills .time-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.selectedPortfolioRange = pill.getAttribute('data-range');
        ChartManager.renderPortfolioChart('portfolio-chart-canvas', this.portfolio.equityHistory, this.selectedPortfolioRange);
      });
    });

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

    const btnExportLedger = document.getElementById('btn-export-ledger');
    if (btnExportLedger) {
      btnExportLedger.addEventListener('click', () => this.exportTradeLedgerCSV());
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        sessionStorage.removeItem('studentName');
        sessionStorage.removeItem('classCode');
        if (this.dtSdk) {
          window.location.href = (typeof DataTrendsAuth !== 'undefined' && DataTrendsAuth.getUser()) ? '../../launchpad.html' : 'index.html?logout=true';
        } else {
          window.location.href = 'index.html?logout=true';
        }
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

    if (tabId === 'tab-portfolio') {
      ChartManager.renderPortfolioChart('portfolio-chart-canvas', this.portfolio.equityHistory, this.selectedPortfolioRange);
      ChartManager.renderAllocationChart('allocation-chart-canvas', this.portfolio.holdings, this.portfolio.cash);
    } else if (tabId === 'tab-journal') {
      this.renderJournal();
    } else if (tabId === 'tab-leaderboard') {
      this.renderLeaderboard();
    }
  },

  /**
   * Refresh all live quotes, portfolio valuations, and ticker ribbon
   */
  async refreshAllData() {
    this.updateMarketStatusBadges();

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

    // Calculate Alpha against ASX 200 benchmark
    const now = Date.now();
    const startTime = this.portfolio.createdAt || (now - 7 * 86400000);
    const elapsedDays = Math.max(1, (now - startTime) / 86400000);
    const benchmarkGrowthPct = (Math.pow(1 + CONFIG.BENCHMARK_ANNUAL_RETURN, elapsedDays / 365) - 1) * 100;
    const alphaPct = totalReturnPct - benchmarkGrowthPct;

    this._recordEquitySnapshot(totalPortfolioValue, totalInvestedAUD);

    this.renderKPIs({
      totalValue: totalPortfolioValue,
      cash: this.portfolio.cash,
      invested: totalInvestedAUD,
      totalReturnAUD: totalReturnAUD,
      totalReturnPct: totalReturnPct,
      dayChangeAUD: todayHoldingsGainAUD,
      alphaPct: alphaPct,
      benchmarkGrowthPct: benchmarkGrowthPct
    });

    this.renderHoldingsTable();
    await this.renderWatchlist();
    this.renderMarketNews();

    ChartManager.renderPortfolioChart('portfolio-chart-canvas', this.portfolio.equityHistory, this.selectedPortfolioRange);
    ChartManager.renderAllocationChart('allocation-chart-canvas', this.portfolio.holdings, this.portfolio.cash);

    await this.renderMarketExplorer();
    this.renderTradeLedger();
    await this.renderTickerTape();

    this.savePortfolio();
  },

  async backgroundRefresh() {
    await this.refreshAllData();
  },

  _recordEquitySnapshot(totalVal, investedVal) {
    const now = Date.now();
    const hist = this.portfolio.equityHistory;
    const last = hist[hist.length - 1];

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

    if (hist.length > 300) hist.shift();
  },

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

    // Alpha / Market Benchmark Card
    const alphaElem = document.getElementById('kpi-alpha-val');
    const alphaSub = document.getElementById('kpi-alpha-sub');
    if (alphaElem && alphaSub) {
      const alphaUp = metrics.alphaPct >= 0;
      const alphaSign = alphaUp ? '+' : '';
      alphaElem.textContent = `${alphaSign}${metrics.alphaPct.toFixed(2)}%`;
      alphaElem.style.color = alphaUp ? 'var(--profit)' : 'var(--loss)';
      alphaSub.textContent = alphaUp
        ? `Beating ASX 200 by ${alphaSign}${metrics.alphaPct.toFixed(2)}%`
        : `Trailing ASX 200 by ${metrics.alphaPct.toFixed(2)}%`;
    }
  },

  /**
   * Automated Periodic Dividend Engine
   */
  processAutomatedDividends() {
    if (!CONFIG.AUTO_DIVIDENDS_ENABLED) return;
    const now = Date.now();
    const lastCheck = this.portfolio.lastDividendTimestamp || this.portfolio.createdAt || now;
    const elapsedHours = (now - lastCheck) / (3600 * 1000);

    // If more than 6 hours have passed since last check, credit prorated simulated dividend
    if (elapsedHours >= 6 && this.portfolio.holdings.length > 0) {
      const investedAUD = this.portfolio.holdings.reduce((sum, h) => sum + (h.currentValueAUD || h.shares * h.avgPriceAUD), 0);
      // Prorated based on elapsed days: (invested * 0.038 * days / 365)
      const elapsedDays = elapsedHours / 24;
      const dividendAUD = Number(((investedAUD * CONFIG.DIVIDEND_ANNUAL_YIELD_RATE * elapsedDays) / 365).toFixed(2));

      if (dividendAUD >= 0.50) {
        this.portfolio.cash += dividendAUD;
        this.portfolio.lastDividendTimestamp = now;

        this.portfolio.trades.unshift({
          id: `div_${now}`,
          timestamp: now,
          type: 'DIVIDEND',
          symbol: 'PORTFOLIO',
          name: 'Simulated Quarterly Holding Dividend Yield',
          exchange: 'AUTOMATED',
          shares: 0,
          price: 0,
          currency: 'AUD',
          exchangeRate: 1.0,
          brokerageAUD: 0,
          totalAUD: dividendAUD,
          rationale: `Automated yield distribution (${(CONFIG.DIVIDEND_ANNUAL_YIELD_RATE * 100).toFixed(1)}% p.a.) on invested portfolio.`
        });

        this.showToast(`Received $${dividendAUD.toFixed(2)} AUD in simulated portfolio dividends!`, 'success');
        this.savePortfolio();
      }
    }
  },

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

    track.innerHTML = html + html;
  },

  async renderWatchlist() {
    const card = document.getElementById('watchlist-card');
    const tbody = document.getElementById('watchlist-table-body');
    const countBadge = document.getElementById('watchlist-count-badge');
    if (!card || !tbody) return;

    const list = this.portfolio.watchlist || [];
    if (countBadge) countBadge.textContent = `${list.length} watched`;

    if (list.length === 0) {
      card.style.display = 'none';
      return;
    }

    card.style.display = 'block';
    let rows = '';
    for (const sym of list) {
      const q = await MarketService.fetchQuote(sym);
      const isUp = q.change >= 0;
      const sign = isUp ? '+' : '';
      const flag = q.exchange === 'ASX' ? '🇦🇺' : '🇺🇸';
      const exchClass = q.exchange.toLowerCase();

      rows += `
        <tr>
          <td>
            <div class="ticker-cell">
              <span class="market-flag">${flag}</span>
              <div class="ticker-text">
                <span class="ticker-sym">${q.symbol}</span>
                <span class="ticker-name">${q.name}</span>
              </div>
            </div>
          </td>
          <td><span class="exchange-chip ${exchClass}">${q.exchange}</span></td>
          <td class="num-cell" style="font-weight:700;">
            ${q.currency === 'USD' ? `US$${q.price.toFixed(2)} ` : `$${q.price.toFixed(2)} AUD`}
          </td>
          <td class="num-cell ${isUp ? 'val-up' : 'val-down'}" style="font-weight:700;">
            ${sign}${q.changePercent.toFixed(2)}%
          </td>
          <td>
            <button class="btn-action-sm btn-buy-sm" onclick="GameApp.openStockModal('${q.symbol}', 'BUY')">Trade ➔</button>
            <button class="btn-action-sm btn-sell-sm" style="background:rgba(255,255,255,0.05);color:var(--text-dim);border-color:var(--border);" onclick="GameApp.removeFromWatchlist('${q.symbol}')" title="Remove from watchlist">✕</button>
          </td>
        </tr>
      `;
    }
    tbody.innerHTML = rows;
  },

  toggleWatchlistCurrent() {
    if (!this.selectedStock) return;
    const sym = this.selectedStock.symbol;
    if (!this.portfolio.watchlist) this.portfolio.watchlist = [];
    const idx = this.portfolio.watchlist.indexOf(sym);
    const btn = document.getElementById('modal-btn-watchlist');

    if (idx >= 0) {
      this.portfolio.watchlist.splice(idx, 1);
      if (btn) { btn.textContent = '⭐ Watch'; btn.style.color = ''; }
      this.showToast(`Removed ${sym} from Watchlist.`, 'success');
    } else {
      this.portfolio.watchlist.push(sym);
      if (btn) { btn.textContent = '★ Watching'; btn.style.color = 'var(--gold)'; }
      this.showToast(`Added ${sym} to your Watchlist!`, 'success');
    }

    this.savePortfolio();
    this.renderWatchlist();
  },

  removeFromWatchlist(symbol) {
    if (!this.portfolio.watchlist) return;
    const idx = this.portfolio.watchlist.indexOf(symbol);
    if (idx >= 0) {
      this.portfolio.watchlist.splice(idx, 1);
      this.savePortfolio();
      this.renderWatchlist();
      this.showToast(`Removed ${symbol} from watchlist.`, 'success');
    }
  },

  renderMarketNews() {
    const listWrap = document.getElementById('market-news-list');
    if (!listWrap) return;
    const items = MarketService.getMarketNews();
    listWrap.innerHTML = items.map(n => `
      <div style="background:rgba(0,0,0,0.25);border:1px solid var(--border);border-radius:10px;padding:0.75rem 1rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.35rem;">
          <span style="font-size:0.68rem;font-weight:700;color:var(--asx-blue);background:rgba(6,182,212,0.12);padding:0.15rem 0.45rem;border-radius:4px;letter-spacing:0.05em;">${n.tag}</span>
          <span style="font-size:0.7rem;color:var(--text-dim);">${n.time}</span>
        </div>
        <h5 style="font-size:0.85rem;color:#fff;font-weight:700;margin-bottom:0.25rem;line-height:1.3;">${n.title}</h5>
        <p style="font-size:0.78rem;color:var(--text-muted);line-height:1.4;">${n.summary}</p>
        <div style="font-size:0.7rem;color:var(--text-dim);margin-top:0.35rem;">Source: ${n.source}</div>
      </div>
    `).join('');
  },

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
        <div class="stock-card" data-symbol="${s.symbol}" data-name="${s.name.toLowerCase().replace(/"/g, '')}" data-sector="${s.sector}" data-exchange="${s.exchange}" onclick="GameApp.openStockModal('${s.symbol}')">
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
        card.style.display = (sector.includes('Mining') || sector.includes('Materials')) ? 'flex' : 'none';
      } else if (filter === 'banks') {
        card.style.display = sector.includes('Financial') ? 'flex' : 'none';
      } else if (filter === 'energy') {
        card.style.display = (sector.includes('Energy') || sector.includes('Oil')) ? 'flex' : 'none';
      } else if (filter === 'travel') {
        card.style.display = (sector.includes('Consumer') || sector.includes('Travel') || sector.includes('Aviation') || sector.includes('Retail')) ? 'flex' : 'none';
      }
    });
  },

  searchStockGrid(query) {
    const q = (query || '').toLowerCase().trim();
    const grid = document.getElementById('market-stocks-grid');
    const cards = document.querySelectorAll('.stock-card');
    let matchCount = 0;
    const aliasedTicker = (CONFIG.COMPANY_ALIASES && CONFIG.COMPANY_ALIASES[q]) ? CONFIG.COMPANY_ALIASES[q].toLowerCase() : null;

    cards.forEach(card => {
      const sym = (card.getAttribute('data-symbol') || '').toLowerCase();
      const name = (card.getAttribute('data-name') || '').toLowerCase();
      const sec = (card.getAttribute('data-sector') || '').toLowerCase();
      const exch = (card.getAttribute('data-exchange') || '').toLowerCase();
      const baseSym = sym.replace('.ax', '');

      const isMatch = !q || sym.includes(q) || baseSym.includes(q) || name.includes(q) || sec.includes(q) || exch.includes(q) || (aliasedTicker && (sym === aliasedTicker || baseSym === aliasedTicker.replace('.ax', '')));
      card.style.display = isMatch ? 'flex' : 'none';
      if (isMatch) matchCount++;
    });

    // If no preloaded blue-chip matches, display live market search button
    let emptyCard = document.getElementById('search-live-lookup-card');
    if (q && matchCount === 0) {
      if (!emptyCard && grid) {
        emptyCard = document.createElement('div');
        emptyCard.id = 'search-live-lookup-card';
        emptyCard.className = 'section-card';
        emptyCard.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 2.5rem 1.5rem; background: var(--bg-card2); border: 1px dashed var(--border-light); border-radius: 16px; margin: 1rem 0;';
        grid.appendChild(emptyCard);
      }
      if (emptyCard) {
        const cleanTicker = q.toUpperCase();
        emptyCard.style.display = 'block';
        emptyCard.innerHTML = `
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🔍</div>
          <h3 style="font-family: var(--font-head); font-size: 1.2rem; color: #fff; margin-bottom: 0.35rem;">
            Search Global Market for "${cleanTicker}"
          </h3>
          <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 480px; margin: 0 auto 1.5rem;">
            No preloaded blue-chip matches "<strong>${query}</strong>". You can fetch live market quotes and trade <strong>any</strong> ASX or US stock directly!
          </p>
          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn-primary" style="padding: 0.65rem 1.5rem; font-size: 0.9rem;" onclick="GameApp.searchAndOpenCustomStock('${cleanTicker}')">
              ⚡ Quote &amp; Trade "${cleanTicker}" ➔
            </button>
            ${!cleanTicker.includes('.') ? `
            <button class="btn-secondary" style="padding: 0.65rem 1.25rem; font-size: 0.9rem;" onclick="GameApp.searchAndOpenCustomStock('${cleanTicker}.AX')">
              🇦🇺 Trade as ASX (${cleanTicker}.AX)
            </button>` : ''}
          </div>
        `;
      }
    } else if (emptyCard) {
      emptyCard.style.display = 'none';
    }
  },

  handleSearchEnter(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const q = input.value.trim();
    if (!q) return;

    const dropdown = document.getElementById(dropdownId);
    if (dropdown) dropdown.style.display = 'none';

    // If in explorer, check visible cards
    const visibleCards = Array.from(document.querySelectorAll('.stock-card')).filter(c => c.style.display !== 'none');
    if (visibleCards.length === 1) {
      const sym = visibleCards[0].getAttribute('data-symbol');
      this.openStockModal(sym);
    } else {
      this.searchAndOpenCustomStock(q);
    }
  },

  handleQuickSearch() {
    const input = document.getElementById('dashboard-stock-search');
    if (!input) return;
    const q = input.value.trim();
    if (!q) return;

    const dropdown = document.getElementById('dashboard-search-results');
    if (dropdown) dropdown.style.display = 'none';

    this.searchAndOpenCustomStock(q);
  },

  showSearchDropdown(inputId, dropdownId, query) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      return;
    }

    const aliasedTicker = (CONFIG.COMPANY_ALIASES && CONFIG.COMPANY_ALIASES[q]) ? CONFIG.COMPANY_ALIASES[q].toUpperCase() : null;

    const matches = CONFIG.FEATURED_STOCKS.filter(s => {
      const sym = s.symbol.toLowerCase();
      const baseSym = sym.replace('.ax', '');
      const name = s.name.toLowerCase();
      const sec = s.sector.toLowerCase();
      const isAliasMatch = aliasedTicker && (s.symbol.toUpperCase() === aliasedTicker);
      return isAliasMatch || sym.includes(q) || baseSym.includes(q) || name.includes(q) || sec.includes(q);
    }).sort((a, b) => {
      if (aliasedTicker) {
        if (a.symbol.toUpperCase() === aliasedTicker) return -1;
        if (b.symbol.toUpperCase() === aliasedTicker) return 1;
      }
      return 0;
    }).slice(0, 6);

    let html = '';
    if (matches.length > 0) {
      html += matches.map(s => {
        const flag = s.exchange === 'ASX' ? '🇦🇺' : '🇺🇸';
        const qData = MarketService.quoteCache[s.symbol.toUpperCase()]?.data;
        const priceStr = qData ? `${s.currency === 'USD' ? 'US$' : '$'}${qData.price.toFixed(2)}` : '';
        return `
          <div class="search-result-item" onclick="GameApp.selectSearchResult('${s.symbol}', '${dropdownId}')">
            <div class="search-result-left">
              <span>${flag}</span>
              <div>
                <div class="search-result-sym">${s.symbol}</div>
                <div class="search-result-name">${s.name}</div>
              </div>
            </div>
            <div class="search-result-right">
              <span class="search-result-price">${priceStr}</span>
              <span class="btn-action-sm btn-buy-sm" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">Trade ➔</span>
            </div>
          </div>
        `;
      }).join('');
    }

    const upperQ = q.toUpperCase();
    html += `
      <div class="search-result-item" style="background: rgba(6, 182, 212, 0.08); border-top: 1px solid var(--border);" onclick="GameApp.selectSearchResult('${aliasedTicker || upperQ}', '${dropdownId}')">
        <div class="search-result-left">
          <span style="font-size: 1.1rem;">⚡</span>
          <div>
            <div class="search-result-sym" style="color: var(--asx-blue);">Search global market for "${upperQ}"</div>
            <div class="search-result-name">Fetch live price &amp; trade ticker directly</div>
          </div>
        </div>
        <div class="search-result-right">
          <span class="btn-action-sm btn-buy-sm" style="padding: 0.25rem 0.6rem; font-size: 0.75rem; background: var(--asx-blue); color: #070b14;">Quote ➔</span>
        </div>
      </div>
    `;

    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
  },

  selectSearchResult(symbol, dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) dropdown.style.display = 'none';
    this.searchAndOpenCustomStock(symbol);
  },

  async searchAndOpenCustomStock(query) {
    const raw = (query || '').trim().toUpperCase();
    if (!raw) return;

    const lower = query.toLowerCase().trim();
    // 1. Check direct company aliases first (e.g. 'santos' -> 'STO.AX', 'woodside' -> 'WDS.AX')
    let targetSymbol = (CONFIG.COMPANY_ALIASES && CONFIG.COMPANY_ALIASES[lower]) ? CONFIG.COMPANY_ALIASES[lower] : null;

    // 2. Check if query matches any featured stock symbol or company name
    if (!targetSymbol) {
      const matchedFeatured = CONFIG.FEATURED_STOCKS.find(s => {
        return s.symbol.toLowerCase() === lower ||
               s.symbol.replace('.ax', '').toLowerCase() === lower ||
               s.name.toLowerCase().includes(lower);
      });
      targetSymbol = matchedFeatured ? matchedFeatured.symbol : raw;
    }

    this.showToast(`Fetching quote for ${targetSymbol}...`, 'info');

    try {
      let quote = await MarketService.fetchQuote(targetSymbol);
      if ((!quote || !quote.price) && !targetSymbol.includes('.')) {
        quote = await MarketService.fetchQuote(targetSymbol + '.AX');
      }

      if (quote && quote.price) {
        this.openStockModal(quote.symbol, 'BUY');
        this.showToast(`Loaded ${quote.symbol} (${quote.name}): $${quote.price.toFixed(2)}`, 'success');
      } else {
        this.showToast(`Could not find symbol "${raw}". Try with .AX for ASX stocks.`, 'loss');
      }
    } catch (err) {
      this.showToast(`Error finding ${raw}: ${err.message}`, 'loss');
    }
  },

  /**
   * Render Investment Journal Tab
   */
  renderJournal() {
    const wrap = document.getElementById('journal-cards-wrap');
    if (!wrap) return;

    if (!this.portfolio.holdings || this.portfolio.holdings.length === 0) {
      wrap.innerHTML = `
        <div style="text-align:center;padding:3rem 1rem;">
          <div style="font-size:2rem;margin-bottom:0.5rem;">📖</div>
          <h4 style="font-family:var(--font-head);color:#fff;">No Active Holdings to Document</h4>
          <p style="color:var(--text-dim);font-size:0.85rem;margin-bottom:1rem;">Buy your first shares in the Market Explorer, and their investment analysis cards will appear here automatically.</p>
          <button class="btn-secondary" onclick="GameApp.switchTab('tab-explorer')">Explore Market ➔</button>
        </div>
      `;
      return;
    }

    let html = '';
    this.portfolio.holdings.forEach(h => {
      const j = (this.portfolio.journal && this.portfolio.journal[h.symbol]) || {
        thesis: '',
        riskFactors: '',
        priceTarget: ''
      };
      const flag = h.exchange === 'ASX' ? '🇦🇺' : '🇺🇸';

      html += `
        <div class="section-card" style="background:var(--bg-card2);margin-bottom:1.5rem;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
            <div>
              <span style="font-size:1.1rem;margin-right:0.3rem;">${flag}</span>
              <strong style="font-family:var(--font-mono);font-size:1.15rem;color:#fff;">${h.symbol}</strong>
              <span style="color:var(--text-muted);font-size:0.85rem;margin-left:0.4rem;">${h.name}</span>
            </div>
            <div style="font-size:0.8rem;color:var(--text-dim);">
              Position: <strong>${h.shares} shares</strong> ($${(h.currentValueAUD || h.shares * h.avgPriceAUD).toFixed(2)} AUD)
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1.8fr 1fr;gap:1.25rem;">
            <div>
              <label style="display:block;font-size:0.75rem;text-transform:uppercase;color:var(--text-dim);font-weight:700;margin-bottom:0.4rem;">
                Investment Thesis &amp; Research Rationale
              </label>
              <textarea class="order-input" rows="3" style="width:100%;font-size:0.85rem;padding:0.75rem;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;resize:vertical;"
                placeholder="Why did you invest in this company? (Earnings outlook, competitive moat, ESG factors, macroeconomic tailwinds)..."
                oninput="GameApp.updateJournalField('${h.symbol}', 'thesis', this.value)">${j.thesis || ''}</textarea>
            </div>

            <div>
              <div style="margin-bottom:0.75rem;">
                <label style="display:block;font-size:0.75rem;text-transform:uppercase;color:var(--text-dim);font-weight:700;margin-bottom:0.4rem;">
                  Primary Risk Factors
                </label>
                <input type="text" class="order-input" style="width:100%;font-size:0.85rem;padding:0.6rem;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;"
                  placeholder="e.g. Commodity price fall, interest rates, currency risk"
                  value="${j.riskFactors || ''}"
                  oninput="GameApp.updateJournalField('${h.symbol}', 'riskFactors', this.value)"/>
              </div>

              <div>
                <label style="display:block;font-size:0.75rem;text-transform:uppercase;color:var(--text-dim);font-weight:700;margin-bottom:0.4rem;">
                  Target Exit Price / Goal (AUD)
                </label>
                <input type="text" class="order-input" style="width:100%;font-size:0.85rem;padding:0.6rem;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;"
                  placeholder="e.g. $52.00 AUD"
                  value="${j.priceTarget || ''}"
                  oninput="GameApp.updateJournalField('${h.symbol}', 'priceTarget', this.value)"/>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    wrap.innerHTML = html;
  },

  updateJournalField(symbol, field, value) {
    if (!this.portfolio.journal) this.portfolio.journal = {};
    if (!this.portfolio.journal[symbol]) {
      this.portfolio.journal[symbol] = { thesis: '', riskFactors: '', priceTarget: '', updated: Date.now() };
    }
    this.portfolio.journal[symbol][field] = value;
    this.portfolio.journal[symbol].updated = Date.now();

    const badge = document.getElementById('journal-autosave-badge');
    if (badge) badge.textContent = 'Saving...';

    clearTimeout(this.journalSaveTimeout);
    this.journalSaveTimeout = setTimeout(() => {
      this.savePortfolio();
      if (badge) badge.textContent = '✓ Autosaved';
    }, 800);
  },

  async openStockModal(symbol, defaultOrder = 'BUY') {
    const quote = await MarketService.fetchQuote(symbol);
    this.selectedStock = quote;
    this.orderType = defaultOrder;

    const modal = document.getElementById('stock-modal');
    if (!modal) return;

    document.getElementById('modal-stock-sym').textContent = quote.symbol;
    document.getElementById('modal-stock-name').textContent = quote.name;
    document.getElementById('modal-exchange-badge').textContent = quote.exchange;
    document.getElementById('modal-exchange-badge').className = `exchange-chip ${quote.exchange.toLowerCase()}`;

    const flag = quote.exchange === 'ASX' ? '🇦🇺' : '🇺🇸';
    document.getElementById('modal-stock-flag').textContent = flag;

    document.getElementById('modal-stock-price').textContent = `${quote.currency === 'USD' ? 'US$' : '$'}${quote.price.toFixed(2)}`;
    const audPrice = MarketService.toAUD(quote.price, quote.currency);
    document.getElementById('modal-stock-price-aud').textContent = quote.currency === 'USD' ? `≈ $${audPrice.toFixed(2)} AUD` : '';

    const isUp = quote.change >= 0;
    const sign = isUp ? '+' : '';
    const chgBadge = document.getElementById('modal-stock-change');
    chgBadge.className = `kpi-badge ${isUp ? 'up' : 'down'}`;
    chgBadge.textContent = `${sign}$${quote.change.toFixed(2)} (${sign}${quote.changePercent.toFixed(2)}%)`;

    document.getElementById('modal-meta-range52').textContent = `$${quote.fiftyTwoWeekLow.toFixed(2)} - $${quote.fiftyTwoWeekHigh.toFixed(2)}`;
    document.getElementById('modal-meta-mktcap').textContent = quote.marketCap;
    document.getElementById('modal-meta-pe').textContent = quote.peRatio;

    // Catalyst and Watchlist state
    const catalystElem = document.getElementById('modal-stock-catalyst');
    if (catalystElem) {
      catalystElem.textContent = `⚡ Market Catalyst: ${MarketService.getStockCatalyst(quote.symbol)}`;
    }
    const watchBtn = document.getElementById('modal-btn-watchlist');
    if (watchBtn) {
      const isWatched = (this.portfolio.watchlist || []).includes(quote.symbol);
      watchBtn.textContent = isWatched ? '★ Watching' : '⭐ Watch';
      watchBtn.style.color = isWatched ? 'var(--gold)' : '';
    }

    const holding = this.portfolio.holdings.find(h => h.symbol === quote.symbol);
    const ownedShares = holding ? holding.shares : 0;
    document.getElementById('modal-owned-shares').textContent = `${ownedShares.toLocaleString()} shares`;

    document.getElementById('order-shares-input').value = 10;
    const justInput = document.getElementById('order-justification-input');
    if (justInput) {
      const existingThesis = this.portfolio.journal && this.portfolio.journal[quote.symbol] && this.portfolio.journal[quote.symbol].thesis;
      justInput.value = existingThesis || '';
    }

    this.setOrderType(defaultOrder);
    modal.classList.add('open');

    const currentRange = this.selectedRange || '1mo';
    document.querySelectorAll('#stock-timeline-pills .time-pill').forEach(p => {
      if (p.getAttribute('data-range') === currentRange) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    await this.loadStockChart(symbol, currentRange);
  },

  async loadStockChart(symbol, range) {
    const chartData = await MarketService.fetchChart(symbol, range);
    ChartManager.renderStockChart('stock-modal-canvas', chartData, range);
  },

  closeStockModal() {
    const modal = document.getElementById('stock-modal');
    if (modal) modal.classList.remove('open');
    this.selectedStock = null;
  },

  setOrderType(type) {
    this.orderType = type;
    const btnBuy = document.getElementById('btn-order-buy');
    const btnSell = document.getElementById('btn-order-sell');
    const btnExec = document.getElementById('btn-execute-order');
    const justField = document.getElementById('trade-justification-field');

    if (type === 'BUY') {
      btnBuy.classList.add('active');
      btnSell.classList.remove('active');
      btnExec.className = 'btn-execute buy';
      btnExec.textContent = 'Confirm Buy Order ➔';
      if (justField) justField.style.display = 'block';
    } else {
      btnBuy.classList.remove('active');
      btnSell.classList.add('active');
      btnExec.className = 'btn-execute sell';
      btnExec.textContent = 'Confirm Sell Order ➔';
      if (justField) justField.style.display = 'none';
    }

    this.updateOrderCalculations();
  },

  /**
   * Live calculations with Diversification Position Cap Guard (25% max)
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

    // Total portfolio valuation
    const totalPortfolioVal = this.portfolio.equityHistory[this.portfolio.equityHistory.length - 1]?.totalValue || this.portfolio.cash;

    // Update rationale character counter
    const rationaleInput = document.getElementById('order-justification-input');
    const rationaleCounter = document.getElementById('rationale-char-counter');
    const minChars = CONFIG.MANDATORY_RATIONALE_MIN_CHARS || 15;
    const rationaleLen = (rationaleInput?.value || '').trim().length;
    if (rationaleCounter) {
      rationaleCounter.textContent = `${rationaleLen} / ${minChars} min`;
      rationaleCounter.style.color = (this.orderType === 'BUY' && rationaleLen < minChars) ? '#f87171' : '#34d399';
    }

    if (this.roundStatus === 'FROZEN') {
      btnExec.disabled = true;
      warning.textContent = '🔒 Trading is currently frozen by your teacher for competition marking.';
      warning.style.display = 'block';
      return;
    }

    if (this.orderType === 'BUY') {
      const totalCostAUD = subtotalAUD + brokerage;
      document.getElementById('calc-total').textContent = `$${totalCostAUD.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD`;

      // Diversification Cap Check (enforce max 25%)
      const existingHolding = this.portfolio.holdings.find(h => h.symbol === quote.symbol);
      const existingVal = existingHolding ? (existingHolding.currentValueAUD || existingHolding.shares * existingHolding.avgPriceAUD) : 0;
      const resultingVal = existingVal + subtotalAUD;
      const maxAllowed = totalPortfolioVal * (CONFIG.MAX_POSITION_PERCENT / 100);

      // Update projected position size pill
      const positionPct = totalPortfolioVal > 0 ? (resultingVal / totalPortfolioVal) * 100 : 0;
      const posPill = document.getElementById('modal-position-pct');
      if (posPill) {
        posPill.textContent = `${positionPct.toFixed(1)}% / ${CONFIG.MAX_POSITION_PERCENT}% Max`;
        posPill.style.color = (positionPct > CONFIG.MAX_POSITION_PERCENT + 0.1) ? '#f87171' : 'var(--asx-blue)';
      }

      if (shares <= 0) {
        btnExec.disabled = true;
        warning.style.display = 'none';
      } else if (totalCostAUD > this.portfolio.cash) {
        btnExec.disabled = true;
        warning.textContent = `Insufficient cash ($${this.portfolio.cash.toFixed(2)} AUD available).`;
        warning.style.display = 'block';
      } else if (CONFIG.DIVERSIFICATION_CAP_ENABLED && resultingVal > (maxAllowed + 0.5) && totalPortfolioVal >= CONFIG.INITIAL_CASH * 0.7) {
        // Enforce 25% cap
        btnExec.disabled = true;
        warning.textContent = `Diversification Rule: Single company cannot exceed ${CONFIG.MAX_POSITION_PERCENT}% ($${maxAllowed.toFixed(2)} AUD) of total portfolio.`;
        warning.style.display = 'block';
      } else {
        btnExec.disabled = false;
        warning.style.display = 'none';
      }
    } else {
      // SELL
      const netProceedsAUD = Math.max(0, subtotalAUD - brokerage);
      document.getElementById('calc-total').textContent = `$${netProceedsAUD.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD`;

      const posPill = document.getElementById('modal-position-pct');
      if (posPill) {
        posPill.textContent = 'Closing / Trimming Position';
        posPill.style.color = '#34d399';
      }

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

  calculateMaxShares() {
    if (!this.selectedStock) return;
    const quote = this.selectedStock;
    const unitAUD = MarketService.toAUD(quote.price, quote.currency);

    if (this.orderType === 'BUY') {
      const usableCash = this.portfolio.cash - CONFIG.BROKERAGE_FEE;
      let maxShares = usableCash > 0 ? Math.floor(usableCash / unitAUD) : 0;

      // Restrict by Diversification Cap if enabled
      if (CONFIG.DIVERSIFICATION_CAP_ENABLED) {
        const totalPortfolioVal = this.portfolio.equityHistory[this.portfolio.equityHistory.length - 1]?.totalValue || this.portfolio.cash;
        const maxAllowedVal = totalPortfolioVal * (CONFIG.MAX_POSITION_PERCENT / 100);
        const existingHolding = this.portfolio.holdings.find(h => h.symbol === quote.symbol);
        const existingVal = existingHolding ? (existingHolding.currentValueAUD || existingHolding.shares * existingHolding.avgPriceAUD) : 0;
        const headroomVal = Math.max(0, maxAllowedVal - existingVal);
        const maxCapShares = Math.floor(headroomVal / unitAUD);
        maxShares = Math.min(maxShares, maxCapShares);
      }

      document.getElementById('order-shares-input').value = Math.max(0, maxShares);
    } else {
      const holding = this.portfolio.holdings.find(h => h.symbol === quote.symbol);
      document.getElementById('order-shares-input').value = holding ? holding.shares : 0;
    }

    this.updateOrderCalculations();
  },

  submitOrder() {
    if (!this.selectedStock) return;

    if (this.roundStatus === 'FROZEN') {
      this.showToast('Trading is currently frozen by your teacher for competition assessment.', 'error');
      return;
    }

    const sharesInput = document.getElementById('order-shares-input');
    const shares = parseInt(sharesInput.value) || 0;
    if (shares <= 0) return;

    const quote = this.selectedStock;
    const unitAUD = MarketService.toAUD(quote.price, quote.currency);
    const subtotalAUD = shares * unitAUD;
    const brokerage = CONFIG.BROKERAGE_FEE;
    const now = Date.now();
    const rationale = (document.getElementById('order-justification-input')?.value || '').trim();
    const totalPortfolioVal = this.portfolio.equityHistory[this.portfolio.equityHistory.length - 1]?.totalValue || this.portfolio.cash;

    if (this.orderType === 'BUY') {
      const minChars = CONFIG.MANDATORY_RATIONALE_MIN_CHARS || 15;
      if (rationale.length < minChars) {
        this.showToast(`Please write an investment thesis (min ${minChars} characters) explaining why you are buying this security for teacher assessment.`, 'error');
        document.getElementById('order-justification-input')?.focus();
        return;
      }

      // Check Diversification Cap
      const existingHolding = this.portfolio.holdings.find(h => h.symbol === quote.symbol);
      const existingVal = existingHolding ? (existingHolding.currentValueAUD || existingHolding.shares * existingHolding.avgPriceAUD) : 0;
      const resultingVal = existingVal + subtotalAUD;
      const maxAllowed = totalPortfolioVal * (CONFIG.MAX_POSITION_PERCENT / 100);

      if (CONFIG.DIVERSIFICATION_CAP_ENABLED && resultingVal > (maxAllowed + 0.5) && totalPortfolioVal >= CONFIG.INITIAL_CASH * 0.7) {
        this.showToast(`Diversification Rule: Single company cannot exceed ${CONFIG.MAX_POSITION_PERCENT}% ($${maxAllowed.toFixed(2)} AUD) of total portfolio.`, 'error');
        return;
      }

      const totalCostAUD = subtotalAUD + brokerage;
      if (totalCostAUD > this.portfolio.cash) {
        this.showToast('Order failed: Insufficient funds.', 'error');
        return;
      }

      this.portfolio.cash -= totalCostAUD;

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

      // Save rationale into journal if provided
      if (rationale) {
        if (!this.portfolio.journal) this.portfolio.journal = {};
        if (!this.portfolio.journal[quote.symbol]) {
          this.portfolio.journal[quote.symbol] = { thesis: rationale, riskFactors: '', priceTarget: '', updated: now };
        } else {
          this.portfolio.journal[quote.symbol].thesis = rationale;
          this.portfolio.journal[quote.symbol].updated = now;
        }
      }

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
        totalAUD: totalCostAUD,
        rationale: rationale || 'Market order purchase'
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

      const costBasis = holding.avgPriceAUD * shares;
      const realizedGainAUD = netProceedsAUD - costBasis;

      holding.shares -= shares;
      holding.totalCostAUD -= costBasis;

      if (holding.shares <= 0) {
        this.portfolio.holdings.splice(holdingIdx, 1);
      }

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
        realizedGainAUD: realizedGainAUD,
        rationale: 'Position liquidation'
      });

      const sign = realizedGainAUD >= 0 ? '+' : '';
      this.showToast(`Sold ${shares} shares of ${quote.symbol} for $${netProceedsAUD.toFixed(2)} AUD (${sign}$${realizedGainAUD.toFixed(2)} gain)`, 'success');
    }

    this.closeStockModal();
    this.refreshAllData();
  },

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
      const badgeClass = isBuy ? 'up' : (t.type === 'DIVIDEND' ? 'up' : 'down');
      const flag = t.exchange === 'ASX' ? '🇦🇺' : (t.exchange === 'AUTOMATED' ? '💰' : '🇺🇸');

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
          <td style="font-size:0.8rem;color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${t.rationale || ''}">
            ${t.rationale || '<span style="color:var(--text-dim);">—</span>'}
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rows;
  },

  renderLeaderboard() {
    const tbody = document.getElementById('leaderboard-table-body');
    if (!tbody) return;

    let roster = [];
    if (this.remoteClassmates && this.remoteClassmates.length > 0) {
      roster = this.remoteClassmates.map(s => ({
        name: s.studentName || s.name,
        classCode: s.classCode || CONFIG.DEFAULT_CLASS_CODE,
        totalValue: s.totalValue || s.cash || CONFIG.INITIAL_CASH,
        cash: s.cash || 0,
        tradesCount: s.tradesCount || 0,
        holdingsCount: s.holdingsCount || (s.holdings ? s.holdings.length : 0),
        holdings: s.holdings || [],
        trades: s.trades || [],
        journal: s.journal || {}
      }));
    } else {
      try {
        roster = JSON.parse(localStorage.getItem('class_leaderboard_all_students') || '[]');
      } catch (e) {}
    }

    // Purge any legacy simulated demo classmates
    const demoNames = ['liam zhang', 'chloe davies', 'marcus wong', 'sophie miller', 'ethan brown'];
    roster = roster.filter(s => !demoNames.includes((s.name || '').trim().toLowerCase()));

    // Include current student only if they have placed at least 1 trade or registered
    const userTradeCount = (this.portfolio && this.portfolio.trades) ? this.portfolio.trades.length : 0;
    if (userTradeCount > 0) {
      const currentTotalVal = this.portfolio.equityHistory[this.portfolio.equityHistory.length - 1]?.totalValue || this.portfolio.cash;
      const currentStudentObj = {
        name: this.student.name,
        classCode: this.student.classCode,
        totalValue: currentTotalVal,
        cash: this.portfolio.cash,
        tradesCount: userTradeCount,
        holdingsCount: (this.portfolio.holdings || []).length,
        holdings: this.portfolio.holdings || [],
        trades: this.portfolio.trades || [],
        isUser: true
      };

      const userIdx = roster.findIndex(s => s.name.toLowerCase() === this.student.name.toLowerCase());
      if (userIdx >= 0) {
        roster[userIdx] = currentStudentObj;
      } else {
        roster.push(currentStudentObj);
      }
    }

    // Populate class filter dropdown
    const filterSelect = document.getElementById('leaderboard-class-filter');
    if (filterSelect && filterSelect.options.length === 0 && CONFIG.CLASSES) {
      filterSelect.innerHTML = `<option value="ALL">All Classes (Global)</option>` +
        CONFIG.CLASSES.map(c => `<option value="${c.code}" ${c.code === this.student.classCode ? 'selected' : ''}>${c.name}</option>`).join('');
    }

    const selectedClass = filterSelect ? filterSelect.value : 'ALL';
    const filteredRoster = (selectedClass === 'ALL')
      ? roster
      : roster.filter(s => (s.classCode || CONFIG.DEFAULT_CLASS_CODE) === selectedClass || s.name.toLowerCase() === this.student.name.toLowerCase());

    // Filter to active traders only (with at least 1 trade)
    const activeTraders = filteredRoster.filter(s => (s.tradesCount || 0) > 0);
    activeTraders.sort((a, b) => b.totalValue - a.totalValue);

    if (activeTraders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;padding:3.5rem 1.5rem;color:var(--text-dim);">
            <div style="font-size:2.4rem;margin-bottom:0.75rem;">📈</div>
            <strong style="color:var(--text-main);font-size:1.1rem;">The Trading Floor Is Open!</strong><br>
            <p style="margin-top:0.5rem;font-size:0.88rem;color:var(--text-muted);max-width:480px;margin-left:auto;margin-right:auto;line-height:1.6;">
              No trades have been executed yet in this class cohort.<br>
              Research equities on the <strong style="color:var(--asx-blue);">Trading Floor</strong> and place your first buy order to take #1 on the leaderboard!
            </p>
          </td>
        </tr>
      `;
      return;
    }

    let rows = '';
    activeTraders.forEach((s, idx) => {
      const rank = idx + 1;
      const rankBadge = rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : rank === 3 ? '🥉 3' : `#${rank}`;
      const roi = ((s.totalValue - CONFIG.INITIAL_CASH) / CONFIG.INITIAL_CASH) * 100;
      const isProfit = roi >= 0;
      const sign = isProfit ? '+' : '';
      const isCurrentUser = s.name.toLowerCase() === this.student.name.toLowerCase();
      const displayName = isCurrentUser ? this.student.name : this.formatStudentName(s.name, true);

      // Compute Syllabus Badges
      const badges = [];
      if (roi > ((CONFIG.BENCHMARK_ANNUAL_RETURN || 0.082) * 100)) {
        badges.push('<span class="tab-badge" style="background:rgba(52,211,153,0.15);color:#34d399;" title="Beating ASX 200 Benchmark">🏛️ Beat Market</span>');
      }
      const hCount = s.holdingsCount || (s.holdings ? s.holdings.length : 0);
      if (hCount >= 3) {
        badges.push('<span class="tab-badge" style="background:rgba(96,165,250,0.15);color:#60a5fa;" title="Well Diversified (3+ Holdings)">🧺 Diversified</span>');
      }
      if ((s.tradesCount || 0) >= 1) {
        badges.push('<span class="tab-badge" style="background:rgba(192,132,252,0.15);color:#c084fc;" title="Investment Thesis Documented">📔 Journal</span>');
      }
      const badgeHtml = badges.length > 0 ? badges.join(' ') : '<span style="color:var(--text-dim);font-size:0.75rem;">-</span>';

      rows += `
        <tr style="${isCurrentUser ? 'background:rgba(6,182,212,0.1);font-weight:600;' : ''}">
          <td style="font-family:var(--font-mono);font-weight:700;">${rankBadge}</td>
          <td>
            ${displayName} ${isCurrentUser ? '<span class="tab-badge" style="background:var(--asx-blue);color:#070b14;margin-left:0.4rem;">YOU</span>' : ''}
          </td>
          <td class="num-cell" style="font-weight:700;">$${s.totalValue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD</td>
          <td class="num-cell ${isProfit ? 'val-up' : 'val-down'}">${sign}${roi.toFixed(2)}%</td>
          <td style="white-space:nowrap;">${badgeHtml}</td>
          <td class="num-cell">$${s.cash.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="num-cell">${s.tradesCount || 0}</td>
        </tr>
      `;
    });

    tbody.innerHTML = rows;
  },

  exportTradeLedgerCSV() {
    if (!this.portfolio.trades || this.portfolio.trades.length === 0) {
      this.showToast('No trades executed yet to export.', 'error');
      return;
    }

    const headers = ['Timestamp', 'Type', 'Symbol', 'Name', 'Exchange', 'Shares', 'Price', 'Currency', 'ExchangeRate', 'BrokerageAUD', 'TotalAUD', 'RealizedGainAUD', 'Rationale'];
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
      t.realizedGainAUD || 0,
      `"${(t.rationale || '').replace(/"/g, '""')}"`
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

document.addEventListener('DOMContentLoaded', () => {
  GameApp.init();
});
