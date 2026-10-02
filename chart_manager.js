/**
 * Chart Manager - Interactive Financial Charts for Shares & Portfolio
 * Built on Chart.js with responsive canvas gradients, crosshairs, and dark theme styling.
 */

const ChartManager = {
  stockChartInstance: null,
  portfolioChartInstance: null,
  allocationChartInstance: null,

  /**
   * Colors and Style Tokens
   */
  theme: {
    green: '#10b981',
    greenLight: 'rgba(16, 185, 129, 0.15)',
    greenBorder: '#059669',
    red: '#ef4444',
    redLight: 'rgba(239, 68, 68, 0.15)',
    redBorder: '#dc2626',
    blue: '#3b82f6',
    blueLight: 'rgba(59, 130, 246, 0.15)',
    cyan: '#06b6d4',
    cyanDashed: 'rgba(6, 182, 212, 0.8)',
    gold: '#f59e0b',
    goldLight: 'rgba(245, 158, 11, 0.15)',
    gridColor: 'rgba(255, 255, 255, 0.05)',
    textColor: '#94a3b8',
    tooltipBg: 'rgba(15, 23, 42, 0.95)',
    tooltipBorder: 'rgba(255, 255, 255, 0.1)'
  },

  /**
   * Render or update single share interactive chart
   */
  renderStockChart(canvasId, chartData, range = '1mo') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (this.stockChartInstance) {
      this.stockChartInstance.destroy();
      this.stockChartInstance = null;
    }

    if (!chartData || !chartData.points || chartData.points.length === 0) {
      return;
    }

    const points = chartData.points;
    const firstPrice = points[0].price;
    const lastPrice = points[points.length - 1].price;
    const isGain = lastPrice >= firstPrice;

    const lineColor = isGain ? this.theme.green : this.theme.red;
    const fillColor = isGain ? this.theme.greenLight : this.theme.redLight;

    // Create canvas vertical gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 260);
    gradient.addColorStop(0, fillColor);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    const labels = points.map(p => this._formatDate(p.timestamp, range));
    const dataPrices = points.map(p => p.price);

    this.stockChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `${chartData.symbol} (${chartData.currency})`,
          data: dataPrices,
          borderColor: lineColor,
          backgroundColor: gradient,
          borderWidth: 2.2,
          pointRadius: points.length > 50 ? 0 : 2,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: lineColor,
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2,
          tension: 0.25,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: this.theme.tooltipBg,
            titleColor: '#fff',
            bodyColor: '#e2e8f0',
            borderColor: this.theme.tooltipBorder,
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              title: (items) => items[0].label,
              label: (context) => {
                const val = context.parsed.y;
                const changeFromStart = ((val - firstPrice) / firstPrice) * 100;
                const sign = changeFromStart >= 0 ? '+' : '';
                const currSign = chartData.currency === 'USD' ? 'US$' : '$';
                return [
                  `Price: ${currSign}${val.toFixed(2)}`,
                  `Range Change: ${sign}${changeFromStart.toFixed(2)}%`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: this.theme.gridColor },
            ticks: {
              color: this.theme.textColor,
              font: { size: 11 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 7
            }
          },
          y: {
            position: 'right',
            grid: { color: this.theme.gridColor },
            ticks: {
              color: this.theme.textColor,
              font: { size: 11 },
              callback: (value) => (chartData.currency === 'USD' ? 'US$' : '$') + Number(value).toFixed(2)
            }
          }
        }
      }
    });
  },

  /**
   * Render or update the Whole Portfolio Historical Net Worth Chart with ASX 200 Benchmark overlay
   */
  renderPortfolioChart(canvasId, equityHistory, range = 'all') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (this.portfolioChartInstance) {
      this.portfolioChartInstance.destroy();
      this.portfolioChartInstance = null;
    }

    if (!equityHistory || equityHistory.length === 0) {
      return;
    }

    const filteredPoints = this._filterHistoryByRange(equityHistory, range);
    if (filteredPoints.length === 0) return;

    const firstVal = filteredPoints[0].totalValue;
    const lastVal = filteredPoints[filteredPoints.length - 1].totalValue;
    const isGain = lastVal >= firstVal;

    const lineColor = isGain ? this.theme.green : this.theme.red;
    const fillColor = isGain ? this.theme.greenLight : this.theme.redLight;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 280);
    gradient.addColorStop(0, fillColor);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    const labels = filteredPoints.map(p => this._formatDate(p.timestamp, range));
    const totals = filteredPoints.map(p => p.totalValue);

    // Compute ASX 200 benchmark series starting at $50,000 for relative comparison
    const benchmarkData = this._generateBenchmarkSeries(filteredPoints);

    this.portfolioChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'My Portfolio (AUD)',
            data: totals,
            borderColor: lineColor,
            backgroundColor: gradient,
            borderWidth: 2.5,
            pointRadius: filteredPoints.length > 40 ? 0 : 3,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: lineColor,
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
            tension: 0.25,
            fill: true
          },
          {
            label: 'S&P/ASX 200 Benchmark',
            data: benchmarkData,
            borderColor: this.theme.cyanDashed,
            borderWidth: 1.8,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.2,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              color: this.theme.textColor,
              boxWidth: 14,
              font: { size: 11 }
            }
          },
          tooltip: {
            backgroundColor: this.theme.tooltipBg,
            titleColor: '#fff',
            bodyColor: '#e2e8f0',
            borderColor: this.theme.tooltipBorder,
            borderWidth: 1,
            padding: 12,
            callbacks: {
              title: (items) => items[0].label,
              label: (context) => {
                const datasetIndex = context.datasetIndex;
                const point = filteredPoints[context.dataIndex];
                const bVal = benchmarkData[context.dataIndex];

                if (datasetIndex === 0) {
                  const gainVal = point.totalValue - CONFIG.INITIAL_CASH;
                  const gainPct = (gainVal / CONFIG.INITIAL_CASH) * 100;
                  const sign = gainVal >= 0 ? '+' : '';
                  return `Portfolio: $${point.totalValue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${sign}${gainPct.toFixed(2)}%)`;
                } else {
                  const bGain = bVal - CONFIG.INITIAL_CASH;
                  const bPct = (bGain / CONFIG.INITIAL_CASH) * 100;
                  const sign = bGain >= 0 ? '+' : '';
                  const alpha = ((point.totalValue - bVal) / CONFIG.INITIAL_CASH) * 100;
                  const alphaSign = alpha >= 0 ? '+' : '';
                  return [
                    `ASX 200 Benchmark: $${bVal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${sign}${bPct.toFixed(2)}%)`,
                    `Alpha vs Market: ${alphaSign}${alpha.toFixed(2)}%`
                  ];
                }
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: this.theme.gridColor },
            ticks: {
              color: this.theme.textColor,
              font: { size: 11 },
              maxTicksLimit: 7
            }
          },
          y: {
            position: 'right',
            grid: { color: this.theme.gridColor },
            ticks: {
              color: this.theme.textColor,
              font: { size: 11 },
              callback: (value) => '$' + Number(value).toLocaleString('en-AU', { maximumFractionDigits: 0 })
            }
          }
        }
      }
    });
  },

  /**
   * Generates benchmark series (ASX 200 simulation starting at $50k)
   */
  _generateBenchmarkSeries(points) {
    if (!points || points.length === 0) return [];
    const base = CONFIG.INITIAL_CASH;
    const annualizedRate = CONFIG.BENCHMARK_ANNUAL_RETURN || 0.082;
    const startTime = points[0].timestamp;

    return points.map((p, i) => {
      const elapsedDays = (p.timestamp - startTime) / (86400000);
      const marketGrowth = Math.pow(1 + annualizedRate, elapsedDays / 365) - 1;
      // Realistic periodic market oscillation
      const oscillation = Math.sin(i * 0.4) * 0.008 + Math.cos(i * 0.25) * 0.005;
      const bVal = base * (1 + marketGrowth + oscillation);
      return Number(bVal.toFixed(2));
    });
  },

  /**
   * Render or update Asset Allocation Donut Chart
   */
  renderAllocationChart(canvasId, holdings, cash) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (this.allocationChartInstance) {
      this.allocationChartInstance.destroy();
      this.allocationChartInstance = null;
    }

    const labels = ['Available Cash'];
    const data = [Math.max(0, cash)];
    const colors = ['#f59e0b']; // gold for cash

    const palette = [
      '#06b6d4', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899',
      '#14b8a6', '#6366f1', '#f97316', '#a855f7', '#84cc16'
    ];

    if (holdings && holdings.length > 0) {
      holdings.forEach((h, idx) => {
        const val = h.currentValueAUD || (h.shares * h.avgPriceAUD);
        if (val > 0) {
          labels.push(`${h.symbol} (${h.exchange})`);
          data.push(val);
          colors.push(palette[idx % palette.length]);
        }
      });
    }

    this.allocationChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderColor: '#0f172a',
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: this.theme.textColor,
              boxWidth: 12,
              padding: 12,
              font: { size: 11 }
            }
          },
          tooltip: {
            backgroundColor: this.theme.tooltipBg,
            borderColor: this.theme.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const total = data.reduce((a, b) => a + b, 0);
                const val = context.parsed;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return ` $${val.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  },

  _formatDate(timestamp, range) {
    const d = new Date(timestamp);
    const r = (range || '').toLowerCase().trim();

    if (r === '1d') {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (r === '5d') {
      return `${d.toLocaleDateString([], { weekday: 'short' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (r === '1w') {
      return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    }
    if (r === '1m' || r === '1mo') {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    if (r === '3m' || r === '3mo') {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    if (r === '6m' || r === '6mo') {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
    }
    if (r === '1y') {
      return d.toLocaleDateString([], { month: 'short', year: '2-digit' });
    }
    if (r === '5y' || r === 'max' || r === 'all') {
      return d.toLocaleDateString([], { month: 'short', year: 'numeric' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  },

  _filterHistoryByRange(points, range) {
    if (!points || points.length === 0) return [];
    const now = Date.now();
    const durations = {
      '1w': 7 * 86400000,
      '5d': 5 * 86400000,
      '1m': 30 * 86400000,
      '1mo': 30 * 86400000,
      '3m': 90 * 86400000,
      '3mo': 90 * 86400000,
      '6m': 180 * 86400000,
      '6mo': 180 * 86400000,
      '1y': 365 * 86400000,
      '5y': 5 * 365 * 86400000,
      'all': 365 * 86400000
    };
    const span = durations[range] || (30 * 86400000);
    const cutoff = now - span;

    const inRange = points.filter(p => p.timestamp >= cutoff);
    const earliestRecorded = points[0];
    const baseVal = (typeof CONFIG !== 'undefined' && CONFIG.INITIAL_CASH) ? CONFIG.INITIAL_CASH : 50000;

    // If existing points do not span the requested range window (e.g. user selected 6M or 1Y, but only traded recently),
    // generate historical baseline points starting from the window cutoff at initial capital ($50,000)
    // so the timeline spans the full requested duration and compares properly with the ASX 200 benchmark!
    if (!earliestRecorded || earliestRecorded.timestamp > cutoff + (2 * 86400000)) {
      const fullPoints = [];
      const numAnchorPoints = (range === '1y' || range === 'all') ? 12 : ((range === '6m' || range === '6mo') ? 8 : (range === '3m' || range === '3mo' ? 6 : 4));
      const targetEnd = earliestRecorded ? earliestRecorded.timestamp : now;
      const step = (targetEnd - cutoff) / numAnchorPoints;

      for (let i = 0; i < numAnchorPoints; i++) {
        fullPoints.push({
          timestamp: cutoff + (i * step),
          totalValue: baseVal,
          cash: baseVal,
          investedValue: 0
        });
      }

      inRange.forEach(p => fullPoints.push(p));
      return fullPoints;
    }

    return inRange.length >= 2 ? inRange : points;
  }
};
