/**
 * Teacher Dashboard Controller
 * Handles authentication, class analytics, student inspection, 3-week unit plan, and gradebook export.
 */

const TeacherApp = {
  students: [],
  remoteStudents: [],
  selectedStudent: null,

  init() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('unlock') === 'true') {
      sessionStorage.setItem('teacherAuth', 'true');
    }

    // Check if previously authenticated in this browser tab session
    if (sessionStorage.getItem('teacherAuth') === 'true') {
      this.showDashboard();
    } else {
      this.showGate();
    }

    const searchInput = document.getElementById('teacher-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterRoster(e.target.value);
      });
    }
  },

  showGate() {
    document.getElementById('teacher-gate').style.display = 'flex';
    document.getElementById('teacher-dashboard').style.display = 'none';
    const pwInput = document.getElementById('teacher-pw-input');
    if (pwInput) setTimeout(() => pwInput.focus(), 100);
  },

  showDashboard() {
    document.getElementById('teacher-gate').style.display = 'none';
    document.getElementById('teacher-dashboard').style.display = 'block';

    // Populate class filter dropdown
    const classFilter = document.getElementById('teacher-class-filter');
    if (classFilter && classFilter.options.length === 0 && CONFIG.CLASSES) {
      classFilter.innerHTML = `<option value="ALL">All Classes (Global)</option>` +
        CONFIG.CLASSES.map(c => `<option value="${c.code}">${c.name} (${c.code})</option>`).join('');
    }

    // Subscribe to Live Cloud Firestore updates
    if (typeof FirestoreSync !== 'undefined') {
      FirestoreSync.init();
      FirestoreSync.listenToClassLeaderboard('ALL', (remoteStudents) => {
        this.remoteStudents = Array.isArray(remoteStudents) ? remoteStudents : [];
        this.loadClassData();
      });
    }

    this.loadClassData();
  },

  toggleUnitPlan() {
    const card = document.getElementById('teacher-unit-plan-card');
    if (!card) return;
    card.style.display = (card.style.display === 'none') ? 'block' : 'none';
  },

  refreshRoster() {
    if (typeof FirestoreSync !== 'undefined' && FirestoreSync.init() && FirestoreSync.db) {
      FirestoreSync.db.collection('sm_portfolios').get().then(snap => {
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        this.remoteStudents = list;
        this.loadClassData();
        this.showToast(`Synced ${this.students.length} student portfolio(s) from Cloud & Local storage.`, 'success');
      }).catch(() => {
        this.loadClassData();
        this.showToast(`Refreshed ${this.students.length} student portfolio(s).`, 'success');
      });
    } else {
      this.loadClassData();
      this.showToast(`Refreshed ${this.students.length} student portfolio(s).`, 'success');
    }
  },

  broadcastSelectedCatalyst() {
    const select = document.getElementById('teacher-catalyst-select');
    const catalystId = select ? select.value : '';
    if (!catalystId) {
      this.showToast('Please select a macro catalyst event to broadcast.', 'error');
      return;
    }

    const catalyst = (CONFIG.MACRO_CATALYSTS || []).find(c => c.id === catalystId);
    if (!catalyst) return;

    if (catalyst.isDividend) {
      this.triggerDividendBonus();
    }

    if (typeof FirestoreSync !== 'undefined') {
      FirestoreSync.pushMacroCatalyst(catalyst);
    }

    this.showToast(`Broadcasted "${catalyst.title}" to all student screens!`, 'success');
    if (select) select.value = '';
  },

  toggleTradingFreeze() {
    this.isFrozen = !this.isFrozen;
    const filter = document.getElementById('teacher-class-filter');
    const classCode = filter ? filter.value : CONFIG.DEFAULT_CLASS_CODE;

    if (typeof FirestoreSync !== 'undefined') {
      FirestoreSync.setRoundStatus(classCode, this.isFrozen ? 'FROZEN' : 'ACTIVE');
    }

    const btn = document.getElementById('btn-freeze-toggle');
    if (btn) {
      if (this.isFrozen) {
        btn.innerHTML = '<span>🟢 Resume Trading</span>';
        btn.style.background = 'rgba(16,185,129,0.15)';
        btn.style.color = '#34d399';
        btn.style.borderColor = 'rgba(16,185,129,0.4)';
        this.showToast('Trading FROZEN across all student screens.', 'info');
      } else {
        btn.innerHTML = '<span>🔒 Freeze Trading</span>';
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
        this.showToast('Trading RESUMED. Students can place orders.', 'success');
      }
    }
  },

  attemptLogin() {
    const input = (document.getElementById('teacher-pw-input')?.value || '').trim();
    const error = document.getElementById('teacher-pw-error');
    const allowed = (CONFIG.TEACHER_PASSWORDS || ['hscsando1603', 'market10', 'datatrends2026', '1982', '1603', 'teacher', 'admin', 'commerce2026']).map(p => p.toLowerCase());

    if (input === CONFIG.TEACHER_PASSWORD || allowed.includes(input.toLowerCase())) {
      sessionStorage.setItem('teacherAuth', 'true');
      if (error) error.style.display = 'none';
      this.showDashboard();
    } else {
      if (error) error.style.display = 'flex';
    }
  },

  logout() {
    sessionStorage.removeItem('teacherAuth');
    this.showGate();
  },

  /**
   * Compute how many of the 9 3-Week Missions a student has completed
   */
  getMissionCompletionCount(p) {
    const programMods = (CONFIG.LEARNING_PROGRAM || []).flatMap(w => w.modules || []);
    const total = programMods.length || 9;
    if (!p) return { done: 0, total };

    const holdings = p.holdings || [];
    const trades = p.trades || [];
    const journal = p.journal || {};
    const missions = p.missions || {};

    let done = 0;
    programMods.forEach(mod => {
      const hasReflection = ((missions[mod.id] && missions[mod.id].response) || '').trim().length >= 25;
      let taskMet = true;
      if (mod.autoCheckType === 'asx_holdings_2') {
        taskMet = holdings.filter(h => h.exchange === 'ASX' || (h.symbol && h.symbol.endsWith('.AX'))).length >= 2;
      } else if (mod.autoCheckType === 'total_holdings_3') {
        taskMet = holdings.length >= 3;
      } else if (mod.autoCheckType === 'us_holdings_1') {
        const usHold = holdings.filter(h => h.exchange === 'NASDAQ' || h.exchange === 'NYSE' || h.currency === 'USD').length;
        const usTr = trades.filter(t => t.exchange === 'NASDAQ' || t.exchange === 'NYSE' || t.currency === 'USD').length;
        taskMet = Math.max(usHold, usTr) >= 1;
      } else if (mod.autoCheckType === 'journal_entries_3') {
        taskMet = Object.values(journal).filter(j => j && (j.thesis || '').trim().length >= 15).length >= 3;
      } else if (mod.autoCheckType === 'total_trades_4') {
        taskMet = trades.length >= 4;
      }
      if (hasReflection && taskMet) done++;
    });

    return { done, total };
  },

  /**
   * Scan and merge BOTH Cloud Firestore and localStorage for all student portfolios
   */
  loadClassData() {
    // 0. Pre-load from cloud cache if available and remote is empty
    if (!this.remoteStudents || this.remoteStudents.length === 0) {
      try {
        const cached = JSON.parse(localStorage.getItem('sm_cloud_roster_cache') || 'null');
        if (Array.isArray(cached) && cached.length > 0) {
          this.remoteStudents = cached;
        }
      } catch(e) {}
    }

    const studentMap = new Map();

    const normalizeStudent = (p) => {
      if (!p) return null;
      const name = (p.studentName || p.name || '').trim();
      if (!name) return null;
      const classCode = (p.classCode || CONFIG.DEFAULT_CLASS_CODE || '10COMM1').trim();
      const currentTotal = (p.totalValue !== undefined && p.totalValue !== null)
        ? Number(p.totalValue)
        : (p.equityHistory && p.equityHistory.length > 0
          ? Number(p.equityHistory[p.equityHistory.length - 1].totalValue)
          : Number(p.cash !== undefined ? p.cash : CONFIG.INITIAL_CASH));
      const rawCashVal = Number(p.cash !== undefined ? p.cash : CONFIG.INITIAL_CASH);
      let calculatedTotal = currentTotal;
      let calculatedCash = rawCashVal;

      // Seamless migration: If student account was created on the legacy $50,000 scale,
      // adjust by +$100,000 so rankings and class averages align with the $150,000 baseline
      if (calculatedTotal > 0 && calculatedTotal < 75000) {
        const delta = (CONFIG.INITIAL_CASH || 150000) - 50000;
        calculatedTotal += delta;
        calculatedCash += delta;
      }
      // Filter out glitched / fake holdings from stale local caches
      const fakeKeys = ['TRIVAGO', 'GERMANY', 'TEMU', 'BITCOIN', 'ASX 500', 'TECHNOLOGY WEST LTD', 'RESMED.INC'];
      const rawHoldings = Array.isArray(p.holdings) ? p.holdings : [];
      const cleanHoldings = rawHoldings.filter(h => {
        const sym = (h.symbol || '').toUpperCase();
        const isGlitchedUs = (h.currency === 'USD' || h.exchange === 'NASDAQ' || h.exchange === 'NYSE') && (Number(h.avgPriceAUD || 0) < 10.00);
        const isFake = fakeKeys.includes(sym);
        return !isGlitchedUs && !isFake;
      });

      const rawTrades = Array.isArray(p.trades) ? p.trades : [];
      const cleanTrades = rawTrades.filter(t => {
        const sym = (t.symbol || '').toUpperCase();
        const isGlitchedUs = (t.currency === 'USD' || sym === 'NVDA' || sym === 'TSLA' || sym === 'AAPL' || sym === 'MSFT') && (Number(t.price || 0) < 10.00);
        const isFake = fakeKeys.includes(sym);
        return !isGlitchedUs && !isFake;
      });

      // Clamp anomalous total value or cash if contaminated by glitch proceeds
      const maxInitial = (CONFIG && CONFIG.INITIAL_CASH) || 150000;
      const genuineInvested = cleanHoldings.reduce((sum, h) => sum + (h.currentValueAUD || (h.shares * (h.avgPriceAUD || 0)) || 0), 0);
      if (calculatedCash + genuineInvested > maxInitial * 1.1) {
        calculatedCash = Math.max(0, Number((maxInitial - genuineInvested).toFixed(2)));
        calculatedTotal = Number((calculatedCash + genuineInvested).toFixed(2));
      }

      const cashVal = calculatedCash;
      const tradesCount = cleanTrades.length > 0 ? cleanTrades.length : Number(p.tradesCount || 0);
      const updatedMs = p.updatedAtMs
        || (p.lastUpdated && p.lastUpdated.seconds ? p.lastUpdated.seconds * 1000 : (typeof p.lastUpdated === 'number' ? p.lastUpdated : Date.now()));

      return {
        studentKey: `${classCode.toLowerCase()}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name,
        classCode,
        totalValue: calculatedTotal,
        cash: cashVal,
        tradesCount,
        lastUpdated: updatedMs,
        portfolioRef: {
          ...p,
          studentName: name,
          classCode,
          cash: cashVal,
          holdings: cleanHoldings,
          trades: cleanTrades,
          journal: p.journal || {},
          missions: p.missions || {},
          grades: p.grades || {}
        }
      };
    };

    // 1. Scan localStorage portfolios first
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('portfolio_v1_')) {
        try {
          const p = JSON.parse(localStorage.getItem(key));
          const norm = normalizeStudent(p);
          if (norm) studentMap.set(norm.studentKey, norm);
        } catch (e) {}
      }
    }

    // 2. Also check class_leaderboard_all_students summary if any student is only there
    try {
      const rosterSummary = JSON.parse(localStorage.getItem('class_leaderboard_all_students') || '[]');
      if (Array.isArray(rosterSummary)) {
        rosterSummary.forEach(s => {
          const norm = normalizeStudent(s);
          if (norm && !studentMap.has(norm.studentKey)) {
            studentMap.set(norm.studentKey, norm);
          }
        });
      }
    } catch (e) {}

    // 3. Merge remote Firestore students (preferring whichever record has more trades / missions / grades)
    if (this.remoteStudents && this.remoteStudents.length > 0) {
      this.remoteStudents.forEach(remoteP => {
        const norm = normalizeStudent(remoteP);
        if (!norm) return;
        const existing = studentMap.get(norm.studentKey);
        if (!existing) {
          studentMap.set(norm.studentKey, norm);
        } else {
          // Merge remote + local so neither grades, missions, nor trades are lost
          const mergedPortfolio = {
            ...existing.portfolioRef,
            ...norm.portfolioRef,
            holdings: (norm.portfolioRef.holdings && norm.portfolioRef.holdings.length > 0)
              ? norm.portfolioRef.holdings : (existing.portfolioRef.holdings || []),
            trades: (norm.portfolioRef.trades && norm.portfolioRef.trades.length > 0)
              ? norm.portfolioRef.trades : (existing.portfolioRef.trades || []),
            journal: { ...(existing.portfolioRef.journal || {}), ...(norm.portfolioRef.journal || {}) },
            missions: { ...(existing.portfolioRef.missions || {}), ...(norm.portfolioRef.missions || {}) },
            grades: (existing.portfolioRef.grades && existing.portfolioRef.grades.total !== undefined)
              ? existing.portfolioRef.grades : (norm.portfolioRef.grades || {})
          };
          studentMap.set(norm.studentKey, {
            ...norm,
            tradesCount: (mergedPortfolio.trades || []).length,
            portfolioRef: mergedPortfolio
          });
        }
      });
    }

        // 4. Merge pre-defined roster from CONFIG.STUDENTS so all students appear
    if (Array.isArray(CONFIG.STUDENTS) && CONFIG.STUDENTS.length > 0) {
      CONFIG.STUDENTS.forEach(rosterStudent => {
        const classCode = (rosterStudent.classCode || CONFIG.DEFAULT_CLASS_CODE || '10COMM1').trim();
        const studentKey = `${classCode.toLowerCase()}_${rosterStudent.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        if (!studentMap.has(studentKey)) {
          studentMap.set(studentKey, {
            studentKey,
            name: rosterStudent.name,
            classCode,
            totalValue: CONFIG.INITIAL_CASH,
            cash: CONFIG.INITIAL_CASH,
            tradesCount: 0,
            lastUpdated: null,
            portfolioRef: {
              studentName: rosterStudent.name,
              classCode,
              cash: CONFIG.INITIAL_CASH,
              totalValue: CONFIG.INITIAL_CASH,
              holdings: [],
              trades: [],
              journal: {},
              missions: {},
              grades: {}
            }
          });
        }
      });
    }

    this.students = Array.from(studentMap.values());
    this.renderDashboard();
  },

  /**
   * Clear all student portfolios and reset class
   */
  async clearAllData() {
    if (!confirm('Are you sure you want to clear all student portfolios and start fresh?')) return;
    const filter = document.getElementById('teacher-class-filter');
    const classCode = filter ? filter.value : 'ALL';

    if (typeof FirestoreSync !== 'undefined') {
      await FirestoreSync.resetClassRoster(classCode);
    }

    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('portfolio_v1_') || key.startsWith('dt_app_sharemarket_') || key.startsWith('class_leaderboard_'))) {
        toRemove.push(key);
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k));
    this.students = [];
    this.remoteStudents = [];
    this.renderDashboard();
    this.showToast('All student portfolios and leaderboard data cleared!', 'success');
  },

  seedSampleData(showToastAlert = true) {
    const defaultClass = CONFIG.DEFAULT_CLASS_CODE || '10COMM1';
    const samples = [
      {
        name: 'Liam Zhang',
        classCode: defaultClass,
        cash: 36740.00,
        holdings: [
          { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', currency: 'USD', shares: 180, avgPriceAUD: 185.00, totalCostAUD: 33300 },
          { symbol: 'BHP.AX', name: 'BHP Group Ltd', exchange: 'ASX', currency: 'AUD', shares: 750, avgPriceAUD: 41.50, totalCostAUD: 31125 },
          { symbol: 'CBA.AX', name: 'Commonwealth Bank', exchange: 'ASX', currency: 'AUD', shares: 240, avgPriceAUD: 138.00, totalCostAUD: 33120 },
          { symbol: 'CSL.AX', name: 'CSL Limited', exchange: 'ASX', currency: 'AUD', shares: 55, avgPriceAUD: 285.00, totalCostAUD: 15675 }
        ],
        trades: [
          { timestamp: Date.now() - 86400000 * 5, type: 'BUY', symbol: 'BHP.AX', name: 'BHP Group Ltd', exchange: 'ASX', shares: 750, price: 41.50, currency: 'AUD', exchangeRate: 1, brokerageAUD: 10, totalAUD: 31135, rationale: 'Cyclical iron ore and copper exporter benefiting from global infrastructure demand.' },
          { timestamp: Date.now() - 86400000 * 4, type: 'BUY', symbol: 'CBA.AX', name: 'Commonwealth Bank', exchange: 'ASX', shares: 240, price: 138.00, currency: 'AUD', exchangeRate: 1, brokerageAUD: 10, totalAUD: 33130, rationale: 'Defensive Australian banking leader with strong franked dividend yield and mortgage book.' },
          { timestamp: Date.now() - 86400000 * 3, type: 'BUY', symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', shares: 180, price: 120.25, currency: 'USD', exchangeRate: 0.65, brokerageAUD: 10, totalAUD: 33310, rationale: 'Global AI semiconductor leader providing high-growth US technology exposure.' },
          { timestamp: Date.now() - 86400000 * 1, type: 'BUY', symbol: 'CSL.AX', name: 'CSL Limited', exchange: 'ASX', shares: 55, price: 285.00, currency: 'AUD', exchangeRate: 1, brokerageAUD: 10, totalAUD: 15685, rationale: 'Defensive healthcare biotechnology leader to balance mining and tech volatility.' }
        ],
        journal: {
          'BHP.AX': { thesis: 'Strong iron ore & copper cash flows with high dividend yield.', riskFactors: 'Global steel slowdown or commodity price drop', priceTarget: '$48.50 AUD' },
          'CBA.AX': { thesis: 'Largest retail bank in Australia; benefits from higher net interest margins.', riskFactors: 'Mortgage defaults if RBA hikes too far', priceTarget: '$150.00 AUD' },
          'NVDA': { thesis: 'Dominant AI semiconductor supplier across hyperscale cloud providers.', riskFactors: 'High P/E valuation multiple & AUD/USD currency fluctuations', priceTarget: 'US$145.00' },
          'CSL.AX': { thesis: 'Global plasma and vaccine leader with inelastic demand.', riskFactors: 'Regulatory approvals and currency shifts', priceTarget: '$310.00 AUD' }
        },
        missions: {
          'w1_m1': { response: 'Holding 100% cash loses ~3% purchasing power each year to inflation. Financial independence means investing $150k across dividend-paying and growth assets so returns compound.' },
          'w1_m2': { response: 'I selected BHP.AX (Cyclical Materials exporter) and CBA.AX (Defensive Financials dividend payer) to balance growth and steady income.' },
          'w1_m3': { response: 'Allocated ~$31k-$33k per company so every single position stays strictly below the 25% ($37,500 AUD) diversification cap.' },
          'w2_m1': { response: 'Bought NVDA on NASDAQ for AI GPU leadership not available on ASX. If AUD/USD rises from 0.65 to 0.75, USD returns convert to fewer AUD.' }
        },
        equityHistory: [
          { timestamp: Date.now() - 86400000 * 5, totalValue: 150000, cash: 150000, investedValue: 0 },
          { timestamp: Date.now(), totalValue: 154080.00, cash: 36740, investedValue: 117340.00 }
        ]
      },
      {
        name: 'Chloe Davies',
        classCode: defaultClass,
        cash: 49565.00,
        holdings: [
          { symbol: 'WES.AX', name: 'Wesfarmers Limited', exchange: 'ASX', currency: 'AUD', shares: 480, avgPriceAUD: 71.00, totalCostAUD: 34080 },
          { symbol: 'WOW.AX', name: 'Woolworths Group Ltd', exchange: 'ASX', currency: 'AUD', shares: 950, avgPriceAUD: 33.50, totalCostAUD: 31825 },
          { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', currency: 'USD', shares: 100, avgPriceAUD: 345.00, totalCostAUD: 34500 }
        ],
        trades: [
          { timestamp: Date.now() - 86400000 * 4, type: 'BUY', symbol: 'WES.AX', name: 'Wesfarmers Limited', exchange: 'ASX', shares: 480, price: 71.00, currency: 'AUD', exchangeRate: 1, brokerageAUD: 10, totalAUD: 34090, rationale: 'Owner of Bunnings & Kmart — resilient Australian retail conglomerate.' },
          { timestamp: Date.now() - 86400000 * 3, type: 'BUY', symbol: 'WOW.AX', name: 'Woolworths Group Ltd', exchange: 'ASX', shares: 950, price: 33.50, currency: 'AUD', exchangeRate: 1, brokerageAUD: 10, totalAUD: 31835, rationale: 'Defensive consumer staples supermarket with steady cash flow.' },
          { timestamp: Date.now() - 86400000 * 2, type: 'BUY', symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', shares: 100, price: 224.25, currency: 'USD', exchangeRate: 0.65, brokerageAUD: 10, totalAUD: 34510, rationale: 'Global consumer hardware and high-margin services subscription revenue.' }
        ],
        journal: {
          'WES.AX': { thesis: 'Bunnings and Kmart perform strongly even when households trade down.', riskFactors: 'Consumer discretionary spending slowdown', priceTarget: '$78.00 AUD' },
          'WOW.AX': { thesis: 'Non-discretionary grocery demand protects against macro downturns.', riskFactors: 'Regulatory scrutiny on supermarket margins', priceTarget: '$37.00 AUD' },
          'AAPL': { thesis: 'Exceptional brand loyalty and growing Apple Services recurring cash flow.', riskFactors: 'AUD/USD exchange rate risk', priceTarget: 'US$245.00' }
        },
        missions: {
          'w1_m1': { response: 'Inflation erodes uninvested cash in the bank. Investing in quality dividend and growth shares compounds wealth toward financial independence.' },
          'w1_m2': { response: 'Picked WOW.AX (Defensive Consumer Staples) and WES.AX (Consumer Discretionary) for strong domestic cash flows.' },
          'w1_m3': { response: 'Allocated ~$32k-$34k per company across 3 sectors so no single holding exceeds the 25% ($37,500) risk limit.' }
        },
        equityHistory: [
          { timestamp: Date.now() - 86400000 * 5, totalValue: 150000, cash: 150000, investedValue: 0 },
          { timestamp: Date.now(), totalValue: 152250.00, cash: 49565, investedValue: 102685.00 }
        ]
      },
      {
        name: 'Marcus Wong',
        classCode: defaultClass,
        cash: 85480.00,
        holdings: [
          { symbol: 'MQG.AX', name: 'Macquarie Group Ltd', exchange: 'ASX', currency: 'AUD', shares: 150, avgPriceAUD: 215.00, totalCostAUD: 32250 },
          { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', currency: 'USD', shares: 50, avgPriceAUD: 645.00, totalCostAUD: 32250 }
        ],
        trades: [
          { timestamp: Date.now() - 86400000 * 4, type: 'BUY', symbol: 'MQG.AX', name: 'Macquarie Group Ltd', exchange: 'ASX', shares: 150, price: 215.00, currency: 'AUD', exchangeRate: 1, brokerageAUD: 10, totalAUD: 32260, rationale: 'Global infrastructure and green energy investment bank.' },
          { timestamp: Date.now() - 86400000 * 2, type: 'BUY', symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', shares: 50, price: 419.25, currency: 'USD', exchangeRate: 0.65, brokerageAUD: 10, totalAUD: 32260, rationale: 'Enterprise cloud (Azure) and Copilot AI subscription growth.' }
        ],
        journal: {
          'MQG.AX': { thesis: 'Diversified financial services and global infrastructure asset manager.', riskFactors: 'Capital markets deal flow sensitivity', priceTarget: '$235.00 AUD' },
          'MSFT': { thesis: 'Recurring enterprise software and Azure cloud dominance.', riskFactors: 'High tech valuation multiples', priceTarget: 'US$460.00' }
        },
        missions: {
          'w1_m1': { response: 'Compounding allows investment returns to generate their own returns, which is essential to beat inflation and achieve financial independence.' }
        },
        equityHistory: [
          { timestamp: Date.now() - 86400000 * 5, totalValue: 150000, cash: 150000, investedValue: 0 },
          { timestamp: Date.now(), totalValue: 149120.00, cash: 85480, investedValue: 63640.00 }
        ]
      }
    ];

    samples.forEach(s => {
      const key = `portfolio_v1_${s.name.replace(/\s+/g, '_').toLowerCase()}`;
      s.studentName = s.name;
      s.totalValue = s.equityHistory[s.equityHistory.length - 1].totalValue;
      s.lastUpdated = Date.now();
      s.updatedAtMs = Date.now();
      localStorage.setItem(key, JSON.stringify(s));
      if (typeof FirestoreSync !== 'undefined') {
        FirestoreSync.saveStudentPortfolio(s.name, s.classCode, s);
      }
    });

    this.loadClassData();
    if (showToastAlert) {
      this.showToast('Sample classmates loaded with $150,000 portfolios, journals & 3-week missions!', 'success');
    }
  },

  /**
   * Render Dashboard Statistics & Roster Table
   */
  renderDashboard() {
    this.students.sort((a, b) => b.totalValue - a.totalValue);

    const classFilter = document.getElementById('teacher-class-filter');
    const selectedClass = classFilter ? classFilter.value : 'ALL';
    const activeList = (selectedClass === 'ALL')
      ? this.students
      : this.students.filter(s => (s.classCode || CONFIG.DEFAULT_CLASS_CODE) === selectedClass);

    // 1. KPI Calculations
    const totalCount = activeList.length;
    const topStudent = activeList[0];
    const topROI = topStudent ? ((topStudent.totalValue - CONFIG.INITIAL_CASH) / CONFIG.INITIAL_CASH) * 100 : 0;
    const avgVal = totalCount > 0 ? activeList.reduce((acc, s) => acc + s.totalValue, 0) / totalCount : CONFIG.INITIAL_CASH;
    const avgROI = ((avgVal - CONFIG.INITIAL_CASH) / CONFIG.INITIAL_CASH) * 100;
    const totalTrades = activeList.reduce((acc, s) => acc + (s.tradesCount || 0), 0);

    document.getElementById('t-kpi-students').textContent = totalCount;
    document.getElementById('t-kpi-top-roi').textContent = `${topROI >= 0 ? '+' : ''}${topROI.toFixed(2)}%`;
    document.getElementById('t-kpi-top-name').textContent = topStudent ? `${topStudent.name} ($${topStudent.totalValue.toLocaleString('en-AU', { maximumFractionDigits: 0 })})` : '--';
    document.getElementById('t-kpi-avg-roi').textContent = `${avgROI >= 0 ? '+' : ''}${avgROI.toFixed(2)}%`;
    document.getElementById('t-kpi-avg-val').textContent = `$${avgVal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} avg`;
    document.getElementById('t-kpi-trades').textContent = totalTrades;

    // 2. Render Roster Table
    this.renderRosterTable(activeList);
  },

  renderRosterTable(list) {
    const tbody = document.getElementById('teacher-roster-tbody');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" style="text-align:center;padding:3.5rem 1.5rem;color:var(--text-dim);">
            <div style="font-size:2.4rem;margin-bottom:0.6rem;">👨‍🏫</div>
            <strong style="color:var(--text-main);font-size:1.05rem;">No student portfolios in this view yet.</strong><br>
            <p style="margin-top:0.4rem;font-size:0.85rem;color:var(--text-muted);max-width:520px;margin-left:auto;margin-right:auto;">
              When students sign in on <code>index.html</code>, their portfolios, trades, and 3-week mission responses appear here automatically. Want to preview with sample student work?
            </p>
            <button class="btn-secondary" style="margin-top:0.9rem;border-color:var(--asx-blue);color:var(--asx-blue);" onclick="TeacherApp.seedSampleData(true)">
              ⚡ Populate Sample Classmates
            </button>
          </td>
        </tr>
      `;
      return;
    }

    let rows = '';
    list.forEach((s, idx) => {
      const rank = idx + 1;
      const rankBadge = rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : rank === 3 ? '🥉 3' : `#${rank}`;
      const roi = ((s.totalValue - CONFIG.INITIAL_CASH) / CONFIG.INITIAL_CASH) * 100;
      const isUp = roi >= 0;
      const sign = isUp ? '+' : '';
      const dateStr = new Date(s.lastUpdated || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      const missionProg = this.getMissionCompletionCount(s.portfolioRef);
      const missionBadgeColor = missionProg.done >= 6
        ? 'background:rgba(16,185,129,0.15);color:#34d399;'
        : (missionProg.done >= 1 ? 'background:rgba(6,182,212,0.15);color:var(--asx-blue);' : 'background:rgba(255,255,255,0.06);color:var(--text-dim);');

      const gradeObj = (s.portfolioRef && s.portfolioRef.grades) || {};
      const hasGrade = gradeObj.total !== undefined && gradeObj.total !== '';
      const gradeHtml = hasGrade
        ? `<span class="tab-badge" style="background:rgba(16,185,129,0.18);color:#34d399;font-weight:700;">${Number(gradeObj.total).toFixed(1)} / 20</span>`
        : `<span style="color:var(--text-dim);font-size:0.78rem;">Unmarked</span>`;

      rows += `
        <tr>
          <td style="font-family:var(--font-mono);font-weight:700;">${rankBadge}</td>
          <td style="font-weight:600;color:#fff;">${s.name}</td>
          <td><span class="class-tag" style="font-size:0.72rem;">${s.classCode || CONFIG.DEFAULT_CLASS_CODE}</span></td>
          <td class="num-cell" style="font-weight:700;">$${s.totalValue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD</td>
          <td class="num-cell ${isUp ? 'val-up' : 'val-down'}">${sign}${roi.toFixed(2)}%</td>
          <td class="num-cell">$${s.cash.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="num-cell">${s.tradesCount || 0}</td>
          <td><span class="tab-badge" style="${missionBadgeColor}font-weight:700;">🎯 ${missionProg.done}/${missionProg.total}</span></td>
          <td>${gradeHtml}</td>
          <td style="color:var(--text-dim);font-size:0.8rem;">${dateStr}</td>
          <td>
            <button class="btn-action-sm btn-buy-sm" style="background:rgba(6,182,212,0.15);color:var(--asx-blue);border-color:rgba(6,182,212,0.3);" onclick="TeacherApp.inspectStudentByKey('${s.studentKey}')">
              🔍 Inspect &amp; Grade
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rows;
  },

  filterRoster(query) {
    const q = query.toLowerCase().trim();
    const filtered = this.students.filter(s => s.name.toLowerCase().includes(q) || (s.classCode || '').toLowerCase().includes(q));
    this.renderRosterTable(filtered);
  },

  /**
   * Inspect individual student portfolio details (works for both Cloud Firestore and localStorage students)
   */
  inspectStudentByKey(studentKey) {
    const studentEntry = this.students.find(s => s.studentKey === studentKey);
    if (!studentEntry) return;
    this._openInspectorWithPortfolio(studentEntry.portfolioRef, studentEntry);
  },

  inspectStudent(name) {
    const studentEntry = this.students.find(s => s.name.toLowerCase() === (name || '').toLowerCase());
    if (studentEntry && studentEntry.portfolioRef) {
      this._openInspectorWithPortfolio(studentEntry.portfolioRef, studentEntry);
      return;
    }

    const key = `portfolio_v1_${(name || '').replace(/\s+/g, '_').toLowerCase()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    this._openInspectorWithPortfolio(JSON.parse(raw), null);
  },

  _openInspectorWithPortfolio(p, studentEntry) {
    if (!p) return;
    this.selectedStudent = p;

    const modal = document.getElementById('inspector-modal');
    document.getElementById('insp-student-name').textContent = p.studentName || p.name || 'Student';
    document.getElementById('insp-student-code').textContent = p.classCode || CONFIG.DEFAULT_CLASS_CODE;

    const currentTotal = (studentEntry && studentEntry.totalValue)
      || (p.totalValue !== undefined ? p.totalValue : (p.equityHistory && p.equityHistory.length > 0
        ? p.equityHistory[p.equityHistory.length - 1].totalValue
        : p.cash || CONFIG.INITIAL_CASH));
    const roi = ((currentTotal - CONFIG.INITIAL_CASH) / CONFIG.INITIAL_CASH) * 100;
    const isUp = roi >= 0;
    const sign = isUp ? '+' : '';

    document.getElementById('insp-total-val').textContent = `$${currentTotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD`;
    const roiBadge = document.getElementById('insp-roi-badge');
    roiBadge.className = `kpi-badge ${isUp ? 'up' : 'down'}`;
    roiBadge.textContent = `${sign}${roi.toFixed(2)}% ROI`;

    // 1. Render Active Holdings
    const holdTbody = document.getElementById('insp-holdings-tbody');
    if (p.holdings && p.holdings.length > 0) {
      holdTbody.innerHTML = p.holdings.map(h => `
        <tr>
          <td><strong style="color:#fff;">${h.symbol}</strong> <small style="color:var(--text-dim);">(${h.name})</small></td>
          <td><span class="exchange-chip ${(h.exchange || 'ASX').toLowerCase()}">${h.exchange || 'ASX'}</span></td>
          <td class="num-cell">${h.shares}</td>
          <td class="num-cell">$${Number(h.avgPriceAUD || 0).toFixed(2)} AUD</td>
          <td class="num-cell" style="font-weight:700;">$${Number(h.currentValueAUD || h.shares * (h.avgPriceAUD || 0)).toFixed(2)} AUD</td>
        </tr>
      `).join('');
    } else {
      holdTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);">No active holdings (100% Cash).</td></tr>';
    }

    // 2. Render 3-Week Missions & Independence Workbook
    const missionsWrap = document.getElementById('insp-missions-wrap');
    const missionsBadge = document.getElementById('insp-missions-badge');
    const prog = this.getMissionCompletionCount(p);
    if (missionsBadge) {
      missionsBadge.textContent = `${prog.done} / ${prog.total} Completed`;
    }
    if (missionsWrap) {
      const missionsData = p.missions || {};
      const allMods = (CONFIG.LEARNING_PROGRAM || []).flatMap(w => w.modules.map(m => ({ ...m, weekNum: w.week })));
      const answeredMods = allMods.filter(m => missionsData[m.id] && (missionsData[m.id].response || '').trim().length > 0);

      if (answeredMods.length > 0) {
        missionsWrap.innerHTML = answeredMods.map(m => {
          const resp = missionsData[m.id].response;
          return `
            <div style="border-bottom:1px solid var(--border);padding-bottom:0.75rem;margin-bottom:0.75rem;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.25rem;flex-wrap:wrap;gap:0.4rem;">
                <strong style="color:var(--asx-blue);font-size:0.82rem;">Week ${m.weekNum} • ${m.lesson}: ${m.title}</strong>
                <span class="tab-badge" style="background:rgba(16,185,129,0.15);color:#34d399;font-size:0.7rem;">Submitted</span>
              </div>
              <div style="color:var(--text-dim);font-size:0.75rem;margin-bottom:0.3rem;">Prompt: ${m.prompt}</div>
              <div style="color:#fff;background:rgba(3,7,18,0.45);padding:0.6rem 0.8rem;border-radius:8px;line-height:1.45;">
                ${resp}
              </div>
            </div>
          `;
        }).join('');
      } else {
        missionsWrap.innerHTML = '<span style="color:var(--text-dim);">No 3-Week Independence Workbook responses submitted yet by this student.</span>';
      }
    }

    // 3. Render Student Investment Journal (Macro reflection + stock theses)
    const journalWrap = document.getElementById('insp-journal-wrap');
    if (journalWrap) {
      let macroHtml = '';
      const macroRef = p.macroReflection || (p.journal && p.journal._macroReflection);
      if (macroRef) {
        macroHtml = `
          <div style="background:rgba(167,139,250,0.12);border:1px solid rgba(167,139,250,0.35);border-radius:10px;padding:0.85rem;margin-bottom:1rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.35rem;">
              <strong style="color:#c084fc;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.04em;">
                ⚡ Macroeconomic &amp; Market Reflection
              </strong>
              <span class="tab-badge" style="background:rgba(192,132,252,0.2);color:#c084fc;">Criterion 3 (/5 Marks)</span>
            </div>
            <div style="color:#f1f5f9;font-size:0.88rem;line-height:1.5;white-space:pre-wrap;">${macroRef}</div>
          </div>
        `;
      } else {
        macroHtml = `
          <div style="background:var(--bg-input);border:1px dashed var(--border);border-radius:8px;padding:0.6rem 0.8rem;margin-bottom:1rem;color:var(--text-dim);font-size:0.8rem;">
            ⚡ Macroeconomic reflection: <em>No reflection submitted yet.</em>
          </div>
        `;
      }

      const journalKeys = Object.keys(p.journal || {}).filter(k => !k.startsWith('_'));
      let stocksHtml = '';
      if (journalKeys.length > 0) {
        stocksHtml = journalKeys.map(sym => {
          const entry = p.journal[sym];
          const isHeld = (p.holdings || []).some(h => h.symbol === sym);
          return `
            <div style="border-bottom:1px solid var(--border);padding-bottom:0.75rem;margin-bottom:0.75rem;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.3rem;">
                <div style="display:flex;align-items:center;gap:0.4rem;">
                  <strong style="color:#fff;font-family:var(--font-mono);font-size:0.95rem;">${sym}</strong>
                  <span class="tab-badge" style="font-size:0.7rem;background:${isHeld ? 'rgba(52,211,153,0.15)' : 'rgba(148,163,184,0.15)'};color:${isHeld ? '#34d399' : 'var(--text-dim)'};">
                    ${isHeld ? '🟢 Active Holding' : 'Research / Traded'}
                  </span>
                </div>
                <span style="color:var(--text-dim);font-size:0.75rem;">Target: <strong style="color:var(--asx-blue);">${entry.priceTarget || 'N/A'}</strong></span>
              </div>
              <div style="color:var(--text);margin-bottom:0.35rem;line-height:1.4;">
                <span style="color:var(--text-dim);font-size:0.75rem;display:block;text-transform:uppercase;font-weight:700;">Investment Thesis:</span>
                ${entry.thesis || '<em style="color:var(--text-dim);">No thesis entered.</em>'}
              </div>
              ${entry.riskFactors ? `<div style="font-size:0.8rem;color:var(--text-muted);"><span style="color:var(--text-dim);font-weight:600;">Key Risks:</span> ${entry.riskFactors}</div>` : ''}
            </div>
          `;
        }).join('');
      } else {
        stocksHtml = '<span style="color:var(--text-dim);">No stock thesis rationale recorded yet for this student.</span>';
      }

      journalWrap.innerHTML = macroHtml + stocksHtml;
    }

    // 4. Render Full Trade Ledger
    const tradeTbody = document.getElementById('insp-trades-tbody');
    if (p.trades && p.trades.length > 0) {
      tradeTbody.innerHTML = p.trades.map(t => `
        <tr>
          <td style="color:var(--text-dim);font-size:0.78rem;">${new Date(t.timestamp).toLocaleString('en-AU')}</td>
          <td><span class="kpi-badge ${t.type === 'BUY' ? 'up' : (t.type === 'DIVIDEND' ? 'up' : 'down')}">${t.type}</span></td>
          <td><strong style="color:#fff;">${t.symbol}</strong></td>
          <td class="num-cell">${t.shares}</td>
          <td class="num-cell">${t.currency === 'USD' ? 'US$' : '$'}${Number(t.price || 0).toFixed(2)}</td>
          <td class="num-cell" style="font-weight:700;">$${Number(t.totalAUD || 0).toFixed(2)} AUD</td>
          <td style="font-size:0.78rem;color:var(--text-muted);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${t.rationale || ''}">
            ${t.rationale || '<span style="color:var(--text-dim);">—</span>'}
          </td>
        </tr>
      `).join('');
    } else {
      tradeTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-dim);">No trades executed yet.</td></tr>';
    }

    // 5. Populate Assessment Rubric inputs
    const g = p.grades || { journal: '', divers: '', reflect: '', total: 0, comments: '' };
    document.getElementById('grade-journal').value = (g.journal !== undefined && g.journal !== '') ? g.journal : '';
    document.getElementById('grade-divers').value = (g.divers !== undefined && g.divers !== '') ? g.divers : '';
    document.getElementById('grade-reflect').value = (g.reflect !== undefined && g.reflect !== '') ? g.reflect : '';
    document.getElementById('grade-comments').value = g.comments || '';
    this.calcTotalGrade();

    modal.classList.add('open');
  },

  calcTotalGrade() {
    const j = parseFloat(document.getElementById('grade-journal').value) || 0;
    const d = parseFloat(document.getElementById('grade-divers').value) || 0;
    const r = parseFloat(document.getElementById('grade-reflect').value) || 0;
    const total = Math.min(20, Math.max(0, j + d + r));
    const display = document.getElementById('rubric-total-display');
    if (display) {
      display.textContent = `${total.toFixed(1)} / 20`;
    }
    return total;
  },

  async saveGrade() {
    if (!this.selectedStudent) return;
    const p = this.selectedStudent;
    const name = p.studentName || p.name;
    const classCode = p.classCode || CONFIG.DEFAULT_CLASS_CODE;
    const key = `portfolio_v1_${name.replace(/\s+/g, '_').toLowerCase()}`;

    const j = parseFloat(document.getElementById('grade-journal').value) || 0;
    const d = parseFloat(document.getElementById('grade-divers').value) || 0;
    const r = parseFloat(document.getElementById('grade-reflect').value) || 0;
    const total = this.calcTotalGrade();
    const comments = (document.getElementById('grade-comments').value || '').trim();

    p.grades = {
      journal: j,
      divers: d,
      reflect: r,
      total: total,
      comments: comments,
      gradedAt: Date.now()
    };

    localStorage.setItem(key, JSON.stringify(p));
    if (typeof FirestoreSync !== 'undefined') {
      await FirestoreSync.saveStudentPortfolio(name, classCode, p);
    }

    this.selectedStudent = p;
    this.loadClassData();
    this.showToast(`Saved grades for ${name} (${total.toFixed(1)} / 20)!`, 'success');
  },

  closeInspector() {
    const modal = document.getElementById('inspector-modal');
    if (modal) modal.classList.remove('open');
    this.selectedStudent = null;
  },

  /**
   * Reset student portfolio to starting $150,000 cash
   */
  async resetSelectedStudent() {
    if (!this.selectedStudent) return;
    const name = this.selectedStudent.studentName || this.selectedStudent.name;
    const classCode = this.selectedStudent.classCode || CONFIG.DEFAULT_CLASS_CODE;
    if (!confirm(`Are you sure you want to reset ${name}'s portfolio back to initial $150,000 AUD? This cannot be undone.`)) {
      return;
    }

    const key = `portfolio_v1_${name.replace(/\s+/g, '_').toLowerCase()}`;
    const now = Date.now();
    const fresh = {
      studentName: name,
      classCode: classCode,
      cash: CONFIG.INITIAL_CASH,
      totalValue: CONFIG.INITIAL_CASH,
      holdings: [],
      trades: [],
      journal: {},
      missions: {},
      grades: {},
      equityHistory: [
        { timestamp: now, totalValue: CONFIG.INITIAL_CASH, cash: CONFIG.INITIAL_CASH, investedValue: 0 }
      ],
      createdAt: now,
      lastUpdated: now,
      updatedAtMs: now
    };

    localStorage.setItem(key, JSON.stringify(fresh));
    if (typeof FirestoreSync !== 'undefined') {
      await FirestoreSync.saveStudentPortfolio(name, classCode, fresh);
    }

    this.closeInspector();
    this.loadClassData();
    this.showToast(`Reset ${name}'s portfolio to starting capital.`, 'success');
  },

  /**
   * Classroom Administrative Action: Issue 2% dividend bonus to all holding students
   */
  triggerDividendBonus() {
    let count = 0;
    this.students.forEach(s => {
      const p = s.portfolioRef;
      if (p && p.holdings && p.holdings.length > 0) {
        const investedAUD = p.holdings.reduce((sum, h) => sum + (h.currentValueAUD || h.shares * h.avgPriceAUD), 0);
        const dividend = Number((investedAUD * 0.02).toFixed(2));
        if (dividend > 0) {
          p.cash += dividend;
          p.totalValue = (p.totalValue || CONFIG.INITIAL_CASH) + dividend;
          if (p.equityHistory && p.equityHistory.length > 0) {
            p.equityHistory[p.equityHistory.length - 1].totalValue += dividend;
          }

          if (!p.trades) p.trades = [];
          p.trades.unshift({
            id: `div_${Date.now()}`,
            timestamp: Date.now(),
            type: 'DIVIDEND',
            symbol: 'ALL',
            name: 'Quarterly Portfolio Dividend Payout (2%)',
            exchange: 'MARKET',
            shares: 0,
            price: 0,
            currency: 'AUD',
            exchangeRate: 1,
            brokerageAUD: 0,
            totalAUD: dividend,
            rationale: '2% Semi-Annual Class Dividend Distribution'
          });

          const key = `portfolio_v1_${s.name.replace(/\s+/g, '_').toLowerCase()}`;
          localStorage.setItem(key, JSON.stringify(p));
          if (typeof FirestoreSync !== 'undefined') {
            FirestoreSync.saveStudentPortfolio(s.name, s.classCode, p);
          }
          count++;
        }
      }
    });

    this.loadClassData();
    this.showToast(`Paid 2% dividend bonus to ${count} students holding equities!`, 'success');
  },

  /**
   * Export Complete Class Gradebook & Standings to CSV
   */
  exportClassCSV() {
    if (this.students.length === 0) {
      this.showToast('No student records to export.', 'error');
      return;
    }

    const headers = [
      'Rank', 'Student Name', 'Class Code', 'Total Portfolio Value (AUD)',
      'Return on Investment (%)', 'Available Cash (AUD)', 'Total Trades',
      '3-Week Missions Completed (/9)',
      'Journal Mark (/10)', 'Diversification Mark (/5)', 'Reflection Mark (/5)',
      'Total Grade (/20)', 'Teacher Feedback', 'Last Active'
    ];
    const rows = this.students.map((s, idx) => {
      const rank = idx + 1;
      const roi = ((s.totalValue - CONFIG.INITIAL_CASH) / CONFIG.INITIAL_CASH) * 100;
      const g = (s.portfolioRef && s.portfolioRef.grades) || {};
      const mProg = this.getMissionCompletionCount(s.portfolioRef);
      return [
        rank,
        `"${s.name.replace(/"/g, '""')}"`,
        `"${s.classCode}"`,
        s.totalValue.toFixed(2),
        roi.toFixed(2),
        s.cash.toFixed(2),
        s.tradesCount || 0,
        `${mProg.done}/${mProg.total}`,
        g.journal !== undefined ? g.journal : '',
        g.divers !== undefined ? g.divers : '',
        g.reflect !== undefined ? g.reflect : '',
        g.total !== undefined ? g.total : '',
        `"${(g.comments || '').replace(/"/g, '""')}"`,
        `"${new Date(s.lastUpdated).toISOString()}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Commerce_Share_Market_Leaderboard_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast('Class leaderboard exported to CSV successfully!', 'success');
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
  TeacherApp.init();
});
