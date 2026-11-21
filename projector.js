/**
 * Live Classroom Projector Floor Engine
 * Real-time Fullscreen Display for Smartboards and Projectors
 */

const ProjectorApp = {
  students: [],
  remoteStudents: [],
  currentClass: '10COMM1',
  firestoreUnsubscribe: null,

  init() {
    this.startClock();
    this.startTicker();
    this.bindEvents();
    this.loadData();
    this.connectFirestore();
  },

  startClock() {
    const update = () => {
      const now = new Date();
      // Format Sydney time
      const sydneyTimeStr = now.toLocaleTimeString('en-AU', {
        timeZone: 'Australia/Sydney',
        hour12: false
      });
      const clockEl = document.getElementById('p-sydney-clock');
      if (clockEl) clockEl.textContent = `${sydneyTimeStr} SYD`;

      // Check ASX trading hours: 10:00 to 16:00 Mon-Fri Sydney
      const sydneyDate = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
      const day = sydneyDate.getDay();
      const hour = sydneyDate.getHours();
      const isOpen = (day >= 1 && day <= 5 && hour >= 10 && hour < 16);

      const statusEl = document.getElementById('p-market-status');
      if (statusEl) {
        if (isOpen) {
          statusEl.textContent = 'ASX OPEN';
          statusEl.style.color = '#10b981';
        } else {
          statusEl.textContent = 'ASX CLOSED';
          statusEl.style.color = '#94a3b8';
        }
      }
    };
    update();
    setInterval(update, 1000);
  },

  startTicker() {
    const track = document.getElementById('p-ticker-track');
    if (!track) return;

    const items = [
      { sym: 'ASX 200', price: '8,412.50', chg: '+0.45%', up: true },
      { sym: 'BHP.AX', price: '$41.85', chg: '+1.20%', up: true },
      { sym: 'CBA.AX', price: '$142.10', chg: '+0.60%', up: true },
      { sym: 'CSL.AX', price: '$289.40', chg: '-0.30%', up: false },
      { sym: 'WES.AX', price: '$72.30', chg: '+0.80%', up: true },
      { sym: 'WOW.AX', price: '$33.95', chg: '-0.15%', up: false },
      { sym: 'NVDA', price: 'US$148.50', chg: '+2.80%', up: true },
      { sym: 'AAPL', price: 'US$228.40', chg: '+0.75%', up: true },
      { sym: 'MSFT', price: 'US$425.60', chg: '+0.50%', up: true },
      { sym: 'TSLA', price: 'US$342.10', chg: '+3.15%', up: true },
      { sym: 'QBE.AX', price: '$17.65', chg: '+1.10%', up: true },
      { sym: 'AUD/USD', price: '0.6540', chg: '+0.15%', up: true }
    ];

    // Duplicate list to make infinite seamless marquee scroll
    const fullList = [...items, ...items, ...items];
    track.innerHTML = fullList.map(item => `
      <div class="ticker-item">
        <span style="font-weight:700;color:#f8fafc;">${item.sym}</span>
        <span style="color:#cbd5e1;">${item.price}</span>
        <span style="font-weight:700;color:${item.up ? '#34d399' : '#f87171'};">${item.chg}</span>
      </div>
    `).join('');
  },

  bindEvents() {
    window.addEventListener('storage', () => {
      this.loadData();
    });

    // Check for macro catalyst broadcast in localStorage
    setInterval(() => {
      try {
        const cat = JSON.parse(localStorage.getItem('active_macro_catalyst') || 'null');
        const banner = document.getElementById('p-macro-banner');
        const text = document.getElementById('p-macro-text');
        if (cat && banner && text) {
          text.textContent = cat.title || cat.description;
          banner.style.display = 'flex';
        }
      } catch (e) {}
    }, 2000);
  },

  onFilterChange() {
    const filter = document.getElementById('p-class-filter');
    this.currentClass = filter ? filter.value : 'ALL';
    this.connectFirestore();
    this.loadData();
  },

  connectFirestore() {
    if (typeof FirestoreSync === 'undefined') return;

    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
      this.firestoreUnsubscribe = null;
    }

    if (this.currentClass !== 'ALL') {
      this.firestoreUnsubscribe = FirestoreSync.listenToClassroomRoster(this.currentClass, (students) => {
        this.remoteStudents = students || [];
        this.loadData();
      });
    }
  },

  loadData() {
    const studentMap = new Map();
    const baseInitial = (typeof CONFIG !== 'undefined' && CONFIG.INITIAL_CASH) ? CONFIG.INITIAL_CASH : 150000;

    const normalize = (p) => {
      if (!p) return null;
      const name = (p.studentName || p.name || '').trim();
      if (!name) return null;
      const classCode = (p.classCode || '10COMM1').trim();

      if (this.currentClass !== 'ALL' && classCode.toUpperCase() !== this.currentClass.toUpperCase()) {
        return null;
      }

      let totalVal = (p.totalValue !== undefined && p.totalValue !== null)
        ? Number(p.totalValue)
        : (p.equityHistory && p.equityHistory.length > 0
          ? Number(p.equityHistory[p.equityHistory.length - 1].totalValue)
          : Number(p.cash !== undefined ? p.cash : baseInitial));

      let cashVal = Number(p.cash !== undefined ? p.cash : baseInitial);

      // Automatic seamless migration for legacy $50k scale accounts
      if (totalVal > 0 && totalVal < 75000) {
        const delta = baseInitial - 50000;
        totalVal += delta;
        cashVal += delta;
      }

      const holdings = Array.isArray(p.holdings) ? p.holdings : [];
      const trades = Array.isArray(p.trades) ? p.trades : [];
      const invested = holdings.reduce((sum, h) => sum + (Number(h.currentValueAUD) || (Number(h.shares) * Number(h.avgPriceAUD || 0))), 0);

      return {
        key: `${classCode}_${name}`.toLowerCase(),
        name,
        classCode,
        totalValue: totalVal,
        cash: cashVal,
        invested,
        tradesCount: trades.length,
        holdings
      };
    };

    // 1. Scan localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('portfolio_v1_')) {
        try {
          const p = JSON.parse(localStorage.getItem(k));
          const norm = normalize(p);
          if (norm) studentMap.set(norm.key, norm);
        } catch (e) {}
      }
    }

    // 2. Scan class summary
    try {
      const summary = JSON.parse(localStorage.getItem('class_leaderboard_all_students') || '[]');
      summary.forEach(s => {
        const norm = normalize(s);
        if (norm && !studentMap.has(norm.key)) studentMap.set(norm.key, norm);
      });
    } catch (e) {}

    // 3. Remote Firestore students
    if (this.remoteStudents && this.remoteStudents.length > 0) {
      this.remoteStudents.forEach(remoteP => {
        const norm = normalize(remoteP);
        if (norm) studentMap.set(norm.key, norm);
      });
    }

    // 4. Default roster if empty
    if (studentMap.size === 0 && typeof CONFIG !== 'undefined' && Array.isArray(CONFIG.STUDENTS)) {
      CONFIG.STUDENTS.forEach(rs => {
        const norm = normalize({ name: rs.name, classCode: rs.classCode || '10COMM1', cash: baseInitial, totalValue: baseInitial, holdings: [], trades: [] });
        if (norm) studentMap.set(norm.key, norm);
      });
    }

    this.students = Array.from(studentMap.values()).sort((a, b) => b.totalValue - a.totalValue);
    this.render();
  },

  render() {
    const baseInitial = (typeof CONFIG !== 'undefined' && CONFIG.INITIAL_CASH) ? CONFIG.INITIAL_CASH : 150000;
    const countBadge = document.getElementById('p-student-count-badge');
    if (countBadge) countBadge.textContent = `${this.students.length} Student${this.students.length === 1 ? '' : 's'}`;

    // Render Podium (Top 3)
    const podiumEl = document.getElementById('p-podium');
    if (podiumEl) {
      if (this.students.length === 0) {
        podiumEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-dim);">No active students registered in this class.</div>`;
      } else {
        const top3 = this.students.slice(0, 3);
        const medals = ['🥇', '🥈', '🥉'];
        const rankClasses = ['rank-1', 'rank-2', 'rank-3'];

        podiumEl.innerHTML = top3.map((s, idx) => {
          const roi = ((s.totalValue - baseInitial) / baseInitial) * 100;
          const roiSign = roi >= 0 ? '+' : '';
          const roiColor = roi >= 0 ? 'var(--profit)' : 'var(--loss)';
          const topHolding = s.holdings && s.holdings.length > 0
            ? s.holdings.slice().sort((a,b) => (b.shares * b.avgPriceAUD) - (a.shares * a.avgPriceAUD))[0].symbol
            : '100% Cash';

          return `
            <div class="podium-card ${rankClasses[idx]}">
              <div class="podium-rank-badge">${medals[idx]}</div>
              <div class="podium-name">${s.name}</div>
              <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:0.5rem;font-weight:700;">${s.classCode}</div>
              <div class="podium-val">$${s.totalValue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="podium-roi" style="color:${roiColor};">${roiSign}${roi.toFixed(2)}%</div>
              <div style="margin-top:0.75rem;font-size:0.75rem;color:var(--text-muted);background:rgba(255,255,255,0.05);padding:0.25rem 0.6rem;border-radius:6px;">
                Top Position: <strong style="color:#fff;">${topHolding}</strong>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Render Table
    const tbody = document.getElementById('p-leaderboard-body');
    if (!tbody) return;

    if (this.students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-dim);">No students found for this class code.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.students.map((s, idx) => {
      const rank = idx + 1;
      const roi = ((s.totalValue - baseInitial) / baseInitial) * 100;
      const roiSign = roi >= 0 ? '+' : '';
      const roiColor = roi >= 0 ? 'var(--profit)' : 'var(--loss)';
      const investedPct = Math.min(100, Math.max(0, (s.invested / s.totalValue) * 100));

      const holdingsSummary = s.holdings && s.holdings.length > 0
        ? s.holdings.map(h => `<span class="badge" style="font-size:0.72rem;background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3);">${h.symbol}</span>`).join(' ')
        : `<span style="color:var(--text-dim);font-size:0.75rem;">Cash Only</span>`;

      return `
        <tr>
          <td style="text-align:center;font-weight:800;font-family:var(--font-head);font-size:1.1rem;color:${rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : rank === 3 ? '#d97706' : 'var(--text-dim)'};">
            #${rank}
          </td>
          <td>
            <div style="font-weight:700;color:#fff;font-size:1rem;">${s.name}</div>
          </td>
          <td>
            <span class="class-tag" style="font-size:0.72rem;">${s.classCode}</span>
          </td>
          <td style="text-align:right;font-family:var(--font-mono);font-weight:800;color:#fff;font-size:1rem;">
            $${s.totalValue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td style="text-align:right;font-family:var(--font-mono);font-weight:700;color:${roiColor};font-size:1rem;">
            ${roiSign}${roi.toFixed(2)}%
          </td>
          <td style="text-align:right;">
            <div style="font-size:0.78rem;font-family:var(--font-mono);color:var(--text-dim);margin-bottom:0.25rem;">
              Inv: $${s.invested.toLocaleString('en-AU', { maximumFractionDigits: 0 })} (${investedPct.toFixed(0)}%)
            </div>
            <div style="width:100%;height:6px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">
              <div style="width:${investedPct}%;height:100%;background:linear-gradient(90deg, #3b82f6, #10b981);border-radius:4px;"></div>
            </div>
          </td>
          <td style="text-align:center;font-family:var(--font-mono);font-weight:600;">
            ${s.tradesCount}
          </td>
          <td>
            <div style="display:flex;flex-wrap:wrap;gap:0.3rem;">
              ${holdingsSummary}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }
};

window.addEventListener('DOMContentLoaded', () => ProjectorApp.init());
