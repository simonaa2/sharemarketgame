/**
 * Teacher Dashboard Controller
 * Handles authentication, class analytics, student inspection, and gradebook export.
 */

const TeacherApp = {
  students: [],
  selectedStudent: null,

  init() {
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
  },

  showDashboard() {
    document.getElementById('teacher-gate').style.display = 'none';
    document.getElementById('teacher-dashboard').style.display = 'block';
    this.loadClassData();
  },

  attemptLogin() {
    const input = document.getElementById('teacher-pw-input').value.trim();
    const error = document.getElementById('teacher-pw-error');

    if (input === CONFIG.TEACHER_PASSWORD) {
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
   * Scan localStorage for all student portfolios
   */
  loadClassData() {
    this.students = [];

    // 1. Scan for individual portfolio objects
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('portfolio_v1_')) {
        try {
          const p = JSON.parse(localStorage.getItem(key));
          if (p && p.studentName) {
            const currentTotal = p.equityHistory && p.equityHistory.length > 0
              ? p.equityHistory[p.equityHistory.length - 1].totalValue
              : p.cash;

            this.students.push({
              name: p.studentName,
              classCode: p.classCode || CONFIG.CLASS_CODE,
              totalValue: currentTotal,
              cash: p.cash,
              tradesCount: p.trades ? p.trades.length : 0,
              lastUpdated: p.lastUpdated || Date.now(),
              portfolioRef: p
            });
          }
        } catch (e) {}
      }
    }

    // 2. If roster is empty, populate demo classmates
    if (this.students.length === 0) {
      this.seedSampleData(false);
      return;
    }

    this.renderDashboard();
  },

  /**
   * Seed realistic student data for classroom demos
   */
  seedSampleData(showToastAlert = true) {
    const samples = [
      {
        name: 'Liam Zhang',
        classCode: CONFIG.CLASS_CODE,
        cash: 12400.00,
        holdings: [
          { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', currency: 'USD', shares: 120, avgPriceAUD: 160.00, totalCostAUD: 19200 },
          { symbol: 'BHP.AX', name: 'BHP Group Ltd', exchange: 'ASX', currency: 'AUD', shares: 450, avgPriceAUD: 41.50, totalCostAUD: 18675 }
        ],
        trades: [
          { timestamp: Date.now() - 86400000 * 3, type: 'BUY', symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', shares: 120, price: 104.00, currency: 'USD', exchangeRate: 0.65, brokerageAUD: 10, totalAUD: 19210 },
          { timestamp: Date.now() - 86400000 * 2, type: 'BUY', symbol: 'BHP.AX', name: 'BHP Group Ltd', exchange: 'ASX', shares: 450, price: 41.50, currency: 'AUD', exchangeRate: 1, brokerageAUD: 10, totalAUD: 18685 }
        ],
        equityHistory: [
          { timestamp: Date.now() - 86400000 * 5, totalValue: 50000, cash: 50000, investedValue: 0 },
          { timestamp: Date.now(), totalValue: 54320.50, cash: 12400, investedValue: 41920.50 }
        ]
      },
      {
        name: 'Chloe Davies',
        classCode: CONFIG.CLASS_CODE,
        cash: 8500.00,
        holdings: [
          { symbol: 'CBA.AX', name: 'Commonwealth Bank', exchange: 'ASX', currency: 'AUD', shares: 250, avgPriceAUD: 138.00, totalCostAUD: 34500 },
          { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', currency: 'USD', shares: 30, avgPriceAUD: 320.00, totalCostAUD: 9600 }
        ],
        trades: [
          { timestamp: Date.now() - 86400000 * 4, type: 'BUY', symbol: 'CBA.AX', name: 'Commonwealth Bank', exchange: 'ASX', shares: 250, price: 138.00, currency: 'AUD', exchangeRate: 1, brokerageAUD: 10, totalAUD: 34510 }
        ],
        equityHistory: [
          { timestamp: Date.now() - 86400000 * 5, totalValue: 50000, cash: 50000, investedValue: 0 },
          { timestamp: Date.now(), totalValue: 53150.00, cash: 8500, investedValue: 44650.00 }
        ]
      },
      {
        name: 'Marcus Wong',
        classCode: CONFIG.CLASS_CODE,
        cash: 18900.00,
        holdings: [
          { symbol: 'CSL.AX', name: 'CSL Limited', exchange: 'ASX', currency: 'AUD', shares: 110, avgPriceAUD: 288.00, totalCostAUD: 31680 }
        ],
        trades: [
          { timestamp: Date.now() - 86400000 * 4, type: 'BUY', symbol: 'CSL.AX', name: 'CSL Limited', exchange: 'ASX', shares: 110, price: 288.00, currency: 'AUD', exchangeRate: 1, brokerageAUD: 10, totalAUD: 31690 }
        ],
        equityHistory: [
          { timestamp: Date.now() - 86400000 * 5, totalValue: 50000, cash: 50000, investedValue: 0 },
          { timestamp: Date.now(), totalValue: 51890.20, cash: 18900, investedValue: 32990.20 }
        ]
      },
      {
        name: 'Sophie Miller',
        classCode: CONFIG.CLASS_CODE,
        cash: 24000.00,
        holdings: [
          { symbol: 'WES.AX', name: 'Wesfarmers Limited', exchange: 'ASX', currency: 'AUD', shares: 350, avgPriceAUD: 71.00, totalCostAUD: 24850 }
        ],
        trades: [
          { timestamp: Date.now() - 86400000 * 3, type: 'BUY', symbol: 'WES.AX', name: 'Wesfarmers Limited', exchange: 'ASX', shares: 350, price: 71.00, currency: 'AUD', exchangeRate: 1, brokerageAUD: 10, totalAUD: 24860 }
        ],
        equityHistory: [
          { timestamp: Date.now() - 86400000 * 5, totalValue: 50000, cash: 50000, investedValue: 0 },
          { timestamp: Date.now(), totalValue: 49450.00, cash: 24000, investedValue: 25450.00 }
        ]
      },
      {
        name: 'Ethan Brown',
        classCode: CONFIG.CLASS_CODE,
        cash: 3100.00,
        holdings: [
          { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', currency: 'USD', shares: 130, avgPriceAUD: 360.00, totalCostAUD: 46800 }
        ],
        trades: [
          { timestamp: Date.now() - 86400000 * 2, type: 'BUY', symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', shares: 130, price: 234.00, currency: 'USD', exchangeRate: 0.65, brokerageAUD: 10, totalAUD: 46810 }
        ],
        equityHistory: [
          { timestamp: Date.now() - 86400000 * 5, totalValue: 50000, cash: 50000, investedValue: 0 },
          { timestamp: Date.now(), totalValue: 47800.00, cash: 3100, investedValue: 44700.00 }
        ]
      }
    ];

    samples.forEach(s => {
      const key = `portfolio_v1_${s.name.replace(/\s+/g, '_').toLowerCase()}`;
      s.studentName = s.name;
      s.lastUpdated = Date.now();
      localStorage.setItem(key, JSON.stringify(s));
    });

    this.loadClassData();
    if (showToastAlert) {
      this.showToast('Demo classmates loaded into the class roster!', 'success');
    }
  },

  /**
   * Render Dashboard Statistics & Roster Table
   */
  renderDashboard() {
    this.students.sort((a, b) => b.totalValue - a.totalValue);

    // 1. KPI Calculations
    const totalCount = this.students.length;
    const topStudent = this.students[0];
    const topROI = topStudent ? ((topStudent.totalValue - CONFIG.INITIAL_CASH) / CONFIG.INITIAL_CASH) * 100 : 0;
    const avgVal = totalCount > 0 ? this.students.reduce((acc, s) => acc + s.totalValue, 0) / totalCount : CONFIG.INITIAL_CASH;
    const avgROI = ((avgVal - CONFIG.INITIAL_CASH) / CONFIG.INITIAL_CASH) * 100;
    const totalTrades = this.students.reduce((acc, s) => acc + (s.tradesCount || 0), 0);

    document.getElementById('t-kpi-students').textContent = totalCount;
    document.getElementById('t-kpi-top-roi').textContent = `${topROI >= 0 ? '+' : ''}${topROI.toFixed(2)}%`;
    document.getElementById('t-kpi-top-name').textContent = topStudent ? `${topStudent.name} ($${topStudent.totalValue.toLocaleString('en-AU', { maximumFractionDigits: 0 })})` : '--';
    document.getElementById('t-kpi-avg-roi').textContent = `${avgROI >= 0 ? '+' : ''}${avgROI.toFixed(2)}%`;
    document.getElementById('t-kpi-avg-val').textContent = `$${avgVal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} avg`;
    document.getElementById('t-kpi-trades').textContent = totalTrades;

    // 2. Render Roster Table
    this.renderRosterTable(this.students);
  },

  renderRosterTable(list) {
    const tbody = document.getElementById('teacher-roster-tbody');
    if (!tbody) return;

    let rows = '';
    list.forEach((s, idx) => {
      const rank = idx + 1;
      const rankBadge = rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : rank === 3 ? '🥉 3' : `#${rank}`;
      const roi = ((s.totalValue - CONFIG.INITIAL_CASH) / CONFIG.INITIAL_CASH) * 100;
      const isUp = roi >= 0;
      const sign = isUp ? '+' : '';
      const dateStr = new Date(s.lastUpdated).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      rows += `
        <tr>
          <td style="font-family:var(--font-mono);font-weight:700;">${rankBadge}</td>
          <td style="font-weight:600;color:#fff;">${s.name}</td>
          <td class="num-cell" style="font-weight:700;">$${s.totalValue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD</td>
          <td class="num-cell ${isUp ? 'val-up' : 'val-down'}">${sign}${roi.toFixed(2)}%</td>
          <td class="num-cell">$${s.cash.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="num-cell">${s.tradesCount || 0}</td>
          <td style="color:var(--text-dim);font-size:0.8rem;">${dateStr}</td>
          <td>
            <button class="btn-action-sm btn-buy-sm" style="background:rgba(6,182,212,0.15);color:var(--asx-blue);border-color:rgba(6,182,212,0.3);" onclick="TeacherApp.inspectStudent('${s.name}')">
              🔍 Inspect
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rows;
  },

  filterRoster(query) {
    const q = query.toLowerCase().trim();
    const filtered = this.students.filter(s => s.name.toLowerCase().includes(q));
    this.renderRosterTable(filtered);
  },

  /**
   * Inspect individual student portfolio details
   */
  inspectStudent(name) {
    const key = `portfolio_v1_${name.replace(/\s+/g, '_').toLowerCase()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;

    const p = JSON.parse(raw);
    this.selectedStudent = p;

    const modal = document.getElementById('inspector-modal');
    document.getElementById('insp-student-name').textContent = p.studentName;
    document.getElementById('insp-student-code').textContent = p.classCode || CONFIG.CLASS_CODE;

    const currentTotal = p.equityHistory && p.equityHistory.length > 0
      ? p.equityHistory[p.equityHistory.length - 1].totalValue
      : p.cash;
    const roi = ((currentTotal - CONFIG.INITIAL_CASH) / CONFIG.INITIAL_CASH) * 100;
    const isUp = roi >= 0;
    const sign = isUp ? '+' : '';

    document.getElementById('insp-total-val').textContent = `$${currentTotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD`;
    const roiBadge = document.getElementById('insp-roi-badge');
    roiBadge.className = `kpi-badge ${isUp ? 'up' : 'down'}`;
    roiBadge.textContent = `${sign}${roi.toFixed(2)}% ROI`;

    // Render holdings
    const holdTbody = document.getElementById('insp-holdings-tbody');
    if (p.holdings && p.holdings.length > 0) {
      holdTbody.innerHTML = p.holdings.map(h => `
        <tr>
          <td><strong style="color:#fff;">${h.symbol}</strong> <small style="color:var(--text-dim);">(${h.name})</small></td>
          <td><span class="exchange-chip ${h.exchange.toLowerCase()}">${h.exchange}</span></td>
          <td class="num-cell">${h.shares}</td>
          <td class="num-cell">$${h.avgPriceAUD.toFixed(2)} AUD</td>
          <td class="num-cell" style="font-weight:700;">$${(h.currentValueAUD || h.shares * h.avgPriceAUD).toFixed(2)} AUD</td>
        </tr>
      `).join('');
    } else {
      holdTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);">No active holdings (100% Cash).</td></tr>';
    }

    // Render trades
    const tradeTbody = document.getElementById('insp-trades-tbody');
    if (p.trades && p.trades.length > 0) {
      tradeTbody.innerHTML = p.trades.map(t => `
        <tr>
          <td style="color:var(--text-dim);font-size:0.78rem;">${new Date(t.timestamp).toLocaleString('en-AU')}</td>
          <td><span class="kpi-badge ${t.type === 'BUY' ? 'up' : 'down'}">${t.type}</span></td>
          <td><strong style="color:#fff;">${t.symbol}</strong></td>
          <td class="num-cell">${t.shares}</td>
          <td class="num-cell">${t.currency === 'USD' ? 'US$' : '$'}${t.price.toFixed(2)}</td>
          <td class="num-cell" style="font-weight:700;">$${t.totalAUD.toFixed(2)} AUD</td>
        </tr>
      `).join('');
    } else {
      tradeTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);">No trades executed yet.</td></tr>';
    }

    modal.classList.add('open');
  },

  closeInspector() {
    const modal = document.getElementById('inspector-modal');
    if (modal) modal.classList.remove('open');
    this.selectedStudent = null;
  },

  /**
   * Reset student portfolio to starting $50,000 cash
   */
  resetSelectedStudent() {
    if (!this.selectedStudent) return;
    const name = this.selectedStudent.studentName;
    if (!confirm(`Are you sure you want to reset ${name}'s portfolio back to initial $50,000 AUD? This cannot be undone.`)) {
      return;
    }

    const key = `portfolio_v1_${name.replace(/\s+/g, '_').toLowerCase()}`;
    const now = Date.now();
    const fresh = {
      studentName: name,
      classCode: CONFIG.CLASS_CODE,
      cash: CONFIG.INITIAL_CASH,
      holdings: [],
      trades: [],
      equityHistory: [
        { timestamp: now, totalValue: CONFIG.INITIAL_CASH, cash: CONFIG.INITIAL_CASH, investedValue: 0 }
      ],
      createdAt: now,
      lastUpdated: now
    };

    localStorage.setItem(key, JSON.stringify(fresh));
    this.closeInspector();
    this.loadClassData();
    this.showToast(`Reset ${name}'s portfolio to starting capital.`, 'success');
  },

  /**
   * Classroom Administrative Action: Issue 2% dividend bonus to all holding students
   */
  triggerDividendBonus() {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('portfolio_v1_')) {
        try {
          const p = JSON.parse(localStorage.getItem(key));
          if (p && p.holdings && p.holdings.length > 0) {
            const investedAUD = p.holdings.reduce((sum, h) => sum + (h.currentValueAUD || h.shares * h.avgPriceAUD), 0);
            const dividend = Number((investedAUD * 0.02).toFixed(2));
            if (dividend > 0) {
              p.cash += dividend;
              const lastHist = p.equityHistory[p.equityHistory.length - 1];
              if (lastHist) lastHist.totalValue += dividend;

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
                totalAUD: dividend
              });

              localStorage.setItem(key, JSON.stringify(p));
              count++;
            }
          }
        } catch (e) {}
      }
    }

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

    const headers = ['Rank', 'Student Name', 'Class Code', 'Total Portfolio Value (AUD)', 'Return on Investment (%)', 'Available Cash (AUD)', 'Total Trades', 'Last Active'];
    const rows = this.students.map((s, idx) => {
      const rank = idx + 1;
      const roi = ((s.totalValue - CONFIG.INITIAL_CASH) / CONFIG.INITIAL_CASH) * 100;
      return [
        rank,
        `"${s.name.replace(/"/g, '""')}"`,
        `"${s.classCode}"`,
        s.totalValue.toFixed(2),
        roi.toFixed(2),
        s.cash.toFixed(2),
        s.tradesCount || 0,
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
