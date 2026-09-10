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
   * Render or update the Whole Portfolio Historical Net Worth Chart
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

    // Filter points based on range
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

    this.portfolioChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Total Portfolio Value (AUD)',
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
            padding: 12,
            displayColors: false,
            callbacks: {
              title: (items) => items[0].label,
              label: (context) => {
                const point = filteredPoints[context.dataIndex];
                const changeVal = point.totalValue - CONFIG.INITIAL_CASH;
                const changePct = (changeVal / CONFIG.INITIAL_CASH) * 100;
                const sign = changeVal >= 0 ? '+' : '';
                return [
                  `Portfolio Total: $${point.totalValue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD`,
                  `Cash: $${point.cash.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  `Invested: $${point.investedValue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  `Net Gain/Loss: ${sign}$${changeVal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${sign}${changePct.toFixed(2)}%)`
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

  /**
   * Date formatting utility based on timeline range
   */
  _formatDate(timestamp, range) {
    const d = new Date(timestamp);
    if (range === '1d') {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (range === '5d') {
      return `${d.toLocaleDateString([], { weekday: 'short' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (range === '1mo' || range === '1w') {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    if (range === '6mo' || range === '1y' || range === '3m') {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', year: 'numeric' });
  },

  /**
   * Filter portfolio history points by range
   */
  _filterHistoryByRange(points, range) {
    if (range === 'all' || points.length <= 1) return points;
    const now = Date.now();
    const durations = {
      '1w': 7 * 86400000,
      '1m': 30 * 86400000,
      '3m': 90 * 86400000,
      '6m': 180 * 86400000,
      '1y': 365 * 86400000
    };
    const span = durations[range] || 30 * 86400000;
    const cutoff = now - span;
    const subset = points.filter(p => p.timestamp >= cutoff);
    // If subset is too sparse, return at least 2 points
    return subset.length >= 2 ? subset : points.slice(-Math.min(points.length, 10));
  }
};
