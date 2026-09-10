/**
 * Market Service - Handles Live Financial Data & Chart Intervals
 * Supports ASX, NYSE, and NASDAQ with multi-tier proxying and offline simulation fallback.
 */

const MarketService = {
  // Exchange rate cache
  audUsdRate: CONFIG.AUD_USD_RATE || 0.65,
  quoteCache: {},
  chartCache: {},

  /**
   * Initializes the market service and checks live AUD/USD exchange rate
   */
  async init() {
    try {
      const rateData = await this.fetchQuote('AUDUSD=X', false);
      if (rateData && rateData.price) {
        this.audUsdRate = rateData.price;
        console.log(`[MarketService] Live AUD/USD Rate updated: ${this.audUsdRate}`);
      }
    } catch (e) {
      console.warn('[MarketService] Using fallback AUD/USD rate:', this.audUsdRate);
    }
  },

  /**
   * Convert price to AUD
   * @param {number} price - Price in original currency
   * @param {string} currency - 'AUD' or 'USD'
   */
  toAUD(price, currency = 'AUD') {
    if (currency === 'AUD') return price;
    if (currency === 'USD') return price / this.audUsdRate;
    return price;
  },

  /**
   * Convert AUD amount to USD
   */
  toUSD(audAmount) {
    return audAmount * this.audUsdRate;
  },

  /**
   * Determine exchange and currency from symbol
   */
  detectExchange(symbol) {
    const sym = symbol.toUpperCase().trim();
    if (sym.endsWith('.AX')) {
      return { exchange: 'ASX', currency: 'AUD', baseSymbol: sym.replace('.AX', '') };
    }
    const found = CONFIG.FEATURED_STOCKS.find(s => s.symbol.toUpperCase() === sym);
    if (found) {
      return { exchange: found.exchange, currency: found.currency, baseSymbol: sym };
    }
    // Default to NASDAQ/NYSE in USD for non-.AX tickers
    return { exchange: 'US Market', currency: 'USD', baseSymbol: sym };
  },

  /**
   * Fetch live or simulated quote for a symbol
   */
  async fetchQuote(symbol, useCache = true) {
    const sym = symbol.toUpperCase().trim();
    if (useCache && this.quoteCache[sym] && (Date.now() - this.quoteCache[sym].timestamp < 60000)) {
      return this.quoteCache[sym].data;
    }

    let quote = null;

    // 1. Try external API
    try {
      quote = await this._fetchFromYahoo(sym);
    } catch (err) {
      // console.info(`[MarketService] Network fetch failed for ${sym}, using simulation engine.`);
    }

    // 2. Fallback to Offline Simulation if needed
    if (!quote) {
      quote = this._getSimulatedQuote(sym);
    }

    // Cache the result
    this.quoteCache[sym] = {
      timestamp: Date.now(),
      data: quote
    };

    return quote;
  },

  /**
   * Fetch historical chart series for single stock
   * range: '1d', '5d', '1mo', '6mo', '1y', '5y', 'max'
   */
  async fetchChart(symbol, range = '1mo') {
    const sym = symbol.toUpperCase().trim();
    const cacheKey = `${sym}_${range}`;
    if (this.chartCache[cacheKey] && (Date.now() - this.chartCache[cacheKey].timestamp < 120000)) {
      return this.chartCache[cacheKey].data;
    }

    let chartData = null;

    try {
      chartData = await this._fetchYahooChart(sym, range);
    } catch (e) {
      // chart fetch failed, will fallback to simulation
    }

    if (!chartData || !chartData.points || chartData.points.length === 0) {
      chartData = this._getSimulatedChart(sym, range);
    }

    this.chartCache[cacheKey] = {
      timestamp: Date.now(),
      data: chartData
    };

    return chartData;
  },

  /**
   * Multi-tier Yahoo Finance Quote & Chart Fetcher
   */
  async _fetchYahooChart(symbol, range) {
    const intervalMap = {
      '1d': '5m',
      '5d': '15m',
      '1mo': '1d',
      '6mo': '1d',
      '1y': '1d',
      '5y': '1wk',
      'max': '1mo'
    };
    const interval = intervalMap[range] || '1d';
    const rawUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;

    const json = await this._requestWithProxy(rawUrl);
    if (!json || !json.chart || !json.chart.result || !json.chart.result[0]) {
      throw new Error('Invalid Yahoo response');
    }

    const res = json.chart.result[0];
    const meta = res.meta || {};
    const timestamps = res.timestamp || [];
    const quotes = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {};
    const closes = quotes.close || [];
    const volumes = quotes.volume || [];

    const points = [];
    for (let i = 0; i < timestamps.length; i++) {
      const p = closes[i];
      if (p !== null && p !== undefined && !isNaN(p)) {
        points.push({
          timestamp: timestamps[i] * 1000,
          price: Number(p.toFixed(2)),
          volume: volumes[i] || 0
        });
      }
    }

    const currentPrice = meta.regularMarketPrice || (points.length > 0 ? points[points.length - 1].price : 0);
    const prevClose = meta.chartPreviousClose || (points.length > 0 ? points[0].price : currentPrice);
    const currency = meta.currency || (symbol.endsWith('.AX') ? 'AUD' : 'USD');

    return {
      symbol,
      range,
      currency,
      regularMarketPrice: currentPrice,
      previousClose: prevClose,
      points,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow
    };
  },

  async _fetchFromYahoo(symbol) {
    const chart = await this._fetchYahooChart(symbol, '1d');
    if (!chart) return null;
    const info = this.detectExchange(symbol);
    const change = chart.regularMarketPrice - chart.previousClose;
    const changePct = chart.previousClose > 0 ? (change / chart.previousClose) * 100 : 0;

    return {
      symbol: symbol.toUpperCase(),
      name: this._getCompanyName(symbol),
      exchange: info.exchange,
      currency: chart.currency,
      price: chart.regularMarketPrice,
      previousClose: chart.previousClose,
      change: Number(change.toFixed(2)),
      changePercent: Number(changePct.toFixed(2)),
      dayHigh: chart.regularMarketPrice * 1.015,
      dayLow: chart.regularMarketPrice * 0.985,
      fiftyTwoWeekHigh: chart.fiftyTwoWeekHigh || chart.regularMarketPrice * 1.25,
      fiftyTwoWeekLow: chart.fiftyTwoWeekLow || chart.regularMarketPrice * 0.75,
      volume: 1250000,
      peRatio: 22.4,
      marketCap: '$45.2B'
    };
  },

  /**
   * Proxy request runner: Google Apps Script -> corsproxy.io -> allorigins
   */
  async _requestWithProxy(targetUrl) {
    const proxies = [];

    if (CONFIG.SCRIPT_URL && CONFIG.SCRIPT_URL.trim() !== '') {
      proxies.push(`${CONFIG.SCRIPT_URL}?action=proxy&url=${encodeURIComponent(targetUrl)}`);
    }
    proxies.push(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
    proxies.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`);

    for (const url of proxies) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const resp = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (resp.ok) {
          return await resp.json();
        }
      } catch (e) {
        // try next proxy
      }
    }
    throw new Error('All CORS proxies failed or timed out');
  },

  /**
   * Helper: Resolve Company Name
   */
  _getCompanyName(symbol) {
    const found = CONFIG.FEATURED_STOCKS.find(s => s.symbol.toUpperCase() === symbol.toUpperCase());
    if (found) return found.name;
    const clean = symbol.replace('.AX', '');
    return `${clean} Corporation`;
  },

  /**
   * Baseline price book for simulated fallback
   */
  _basePrices: {
    'BHP.AX': { price: 41.80, name: 'BHP Group Ltd', exchange: 'ASX', currency: 'AUD', pe: 11.8, mktCap: '$212B', range52: [38.20, 47.40] },
    'CBA.AX': { price: 142.50, name: 'Commonwealth Bank of Australia', exchange: 'ASX', currency: 'AUD', pe: 23.5, mktCap: '$238B', range52: [98.50, 144.20] },
    'CSL.AX': { price: 295.30, name: 'CSL Limited', exchange: 'ASX', currency: 'AUD', pe: 34.2, mktCap: '$143B', range52: [230.00, 312.00] },
    'WES.AX': { price: 72.40, name: 'Wesfarmers Limited', exchange: 'ASX', currency: 'AUD', pe: 28.1, mktCap: '$82B', range52: [48.00, 74.50] },
    'MQG.AX': { price: 218.00, name: 'Macquarie Group Ltd', exchange: 'ASX', currency: 'AUD', pe: 24.0, mktCap: '$84B', range52: [160.00, 222.00] },
    'TLS.AX': { price: 3.92, name: 'Telstra Group Ltd', exchange: 'ASX', currency: 'AUD', pe: 22.1, mktCap: '$45B', range52: [3.55, 4.15] },
    'FMG.AX': { price: 18.60, name: 'Fortescue Ltd', exchange: 'ASX', currency: 'AUD', pe: 8.2, mktCap: '$57B', range52: [16.80, 29.80] },
    'WOW.AX': { price: 30.15, name: 'Woolworths Group Ltd', exchange: 'ASX', currency: 'AUD', pe: 20.4, mktCap: '$37B', range52: [29.50, 38.50] },
    'WTC.AX': { price: 124.00, name: 'WiseTech Global Ltd', exchange: 'ASX', currency: 'AUD', pe: 95.0, mktCap: '$41B', range52: [62.00, 138.00] },
    'RIO.AX': { price: 116.50, name: 'Rio Tinto Ltd', exchange: 'ASX', currency: 'AUD', pe: 10.5, mktCap: '$43B', range52: [105.00, 136.00] },
    'ANZ.AX': { price: 31.20, name: 'ANZ Group Holdings Ltd', exchange: 'ASX', currency: 'AUD', pe: 13.1, mktCap: '$94B', range52: [23.50, 32.00] },
    'NAB.AX': { price: 38.40, name: 'National Australia Bank Ltd', exchange: 'ASX', currency: 'AUD', pe: 16.2, mktCap: '$118B', range52: [27.50, 39.20] },
    'WBC.AX': { price: 32.80, name: 'Westpac Banking Corp', exchange: 'ASX', currency: 'AUD', pe: 16.0, mktCap: '$114B', range52: [20.80, 33.40] },
    'REA.AX': { price: 215.00, name: 'REA Group Ltd', exchange: 'ASX', currency: 'AUD', pe: 62.0, mktCap: '$28B', range52: [155.00, 225.00] },
    'XRO.AX': { price: 148.00, name: 'Xero Limited', exchange: 'ASX', currency: 'AUD', pe: 110.0, mktCap: '$22B', range52: [99.00, 155.00] },

    // US Tech & Leaders
    'AAPL': { price: 228.50, name: 'Apple Inc.', exchange: 'NASDAQ', currency: 'USD', pe: 34.1, mktCap: '$3.48T', range52: [164.00, 237.23] },
    'MSFT': { price: 425.80, name: 'Microsoft Corporation', exchange: 'NASDAQ', currency: 'USD', pe: 35.8, mktCap: '$3.16T', range52: [309.45, 468.35] },
    'NVDA': { price: 118.20, name: 'NVIDIA Corporation', exchange: 'NASDAQ', currency: 'USD', pe: 54.0, mktCap: '$2.91T', range52: [40.20, 140.76] },
    'GOOGL': { price: 162.40, name: 'Alphabet Inc.', exchange: 'NASDAQ', currency: 'USD', pe: 23.5, mktCap: '$2.02T', range52: [120.20, 191.75] },
    'AMZN': { price: 186.90, name: 'Amazon.com Inc.', exchange: 'NASDAQ', currency: 'USD', pe: 42.0, mktCap: '$1.95T', range52: [118.35, 201.20] },
    'TSLA': { price: 230.10, name: 'Tesla, Inc.', exchange: 'NASDAQ', currency: 'USD', pe: 65.4, mktCap: '$734B', range52: [138.80, 271.00] },
    'META': { price: 512.40, name: 'Meta Platforms, Inc.', exchange: 'NASDAQ', currency: 'USD', pe: 26.2, mktCap: '$1.30T', range52: [279.40, 544.23] },
    'NFLX': { price: 685.20, name: 'Netflix, Inc.', exchange: 'NASDAQ', currency: 'USD', pe: 42.5, mktCap: '$295B', range52: [375.00, 711.33] },
    'COST': { price: 880.00, name: 'Costco Wholesale Corp', exchange: 'NASDAQ', currency: 'USD', pe: 52.0, mktCap: '$390B', range52: [535.00, 900.00] },
    'AMD': { price: 145.60, name: 'Advanced Micro Devices', exchange: 'NASDAQ', currency: 'USD', pe: 105.0, mktCap: '$236B', range52: [94.00, 227.30] },

    // NYSE Giants
    'BRK-B': { price: 450.20, name: 'Berkshire Hathaway Inc.', exchange: 'NYSE', currency: 'USD', pe: 21.0, mktCap: '$980B', range52: [340.00, 465.00] },
    'JPM': { price: 212.40, name: 'JPMorgan Chase & Co.', exchange: 'NYSE', currency: 'USD', pe: 12.4, mktCap: '$608B', range52: [140.00, 225.00] },
    'V': { price: 278.30, name: 'Visa Inc.', exchange: 'NYSE', currency: 'USD', pe: 29.5, mktCap: '$560B', range52: [228.00, 290.00] },
    'DIS': { price: 92.40, name: 'The Walt Disney Company', exchange: 'NYSE', currency: 'USD', pe: 36.2, mktCap: '$168B', range52: [78.73, 123.74] },
    'KO': { price: 71.80, name: 'The Coca-Cola Company', exchange: 'NYSE', currency: 'USD', pe: 27.8, mktCap: '$309B', range52: [51.55, 73.53] },
    'WMT': { price: 78.50, name: 'Walmart Inc.', exchange: 'NYSE', currency: 'USD', pe: 31.0, mktCap: '$630B', range52: [49.85, 80.00] },
    'NKE': { price: 82.20, name: 'NIKE, Inc.', exchange: 'NYSE', currency: 'USD', pe: 24.1, mktCap: '$124B', range52: [70.75, 123.39] },
    'MCD': { price: 292.10, name: 'McDonald\'s Corporation', exchange: 'NYSE', currency: 'USD', pe: 25.8, mktCap: '$209B', range52: [243.00, 302.00] },
    'BA': { price: 160.50, name: 'The Boeing Company', exchange: 'NYSE', currency: 'USD', pe: 'N/A', mktCap: '$98B', range52: [155.00, 267.54] }
  },

  /**
   * Generates a realistic simulated quote for fallback
   */
  _getSimulatedQuote(symbol) {
    const info = this.detectExchange(symbol);
    const base = this._basePrices[symbol] || {
      price: symbol.endsWith('.AX') ? 25.00 : 150.00,
      name: this._getCompanyName(symbol),
      exchange: info.exchange,
      currency: info.currency,
      pe: 21.5,
      mktCap: '$15B',
      range52: [symbol.endsWith('.AX') ? 18.00 : 100.00, symbol.endsWith('.AX') ? 32.00 : 200.00]
    };

    // Micro-jitter to simulate live trading day movement (-1.5% to +1.8%)
    const seed = this._pseudoHash(symbol + new Date().toDateString());
    const dayChangePct = ((seed % 340) - 160) / 100; // e.g. -1.6% to +1.8%
    const currentPrice = Number((base.price * (1 + dayChangePct / 100)).toFixed(2));
    const prevClose = base.price;
    const change = Number((currentPrice - prevClose).toFixed(2));

    return {
      symbol,
      name: base.name,
      exchange: base.exchange,
      currency: base.currency,
      price: currentPrice,
      previousClose: prevClose,
      change: change,
      changePercent: Number(dayChangePct.toFixed(2)),
      dayHigh: Number((Math.max(currentPrice, prevClose) * 1.012).toFixed(2)),
      dayLow: Number((Math.min(currentPrice, prevClose) * 0.988).toFixed(2)),
      fiftyTwoWeekHigh: base.range52[1],
      fiftyTwoWeekLow: base.range52[0],
      volume: Math.floor(1000000 + (seed % 4000000)),
      peRatio: base.pe,
      marketCap: base.mktCap
    };
  },

  /**
   * Generates realistic historical chart data points for requested range
   */
  _getSimulatedChart(symbol, range) {
    const quote = this._getSimulatedQuote(symbol);
    const now = Date.now();
    const points = [];

    const config = {
      '1d': { count: 48, stepMs: 5 * 60 * 1000, volatility: 0.004, trend: (quote.changePercent / 100) },
      '5d': { count: 40, stepMs: 30 * 60 * 1000, volatility: 0.008, trend: (quote.changePercent / 100) * 1.5 },
      '1mo': { count: 30, stepMs: 24 * 3600 * 1000, volatility: 0.015, trend: 0.03 },
      '6mo': { count: 50, stepMs: 3.6 * 24 * 3600 * 1000, volatility: 0.02, trend: 0.08 },
      '1y': { count: 52, stepMs: 7 * 24 * 3600 * 1000, volatility: 0.025, trend: 0.14 },
      '5y': { count: 60, stepMs: 30 * 24 * 3600 * 1000, volatility: 0.04, trend: 0.65 },
      'max': { count: 70, stepMs: 45 * 24 * 3600 * 1000, volatility: 0.05, trend: 1.20 }
    }[range] || { count: 30, stepMs: 24 * 3600 * 1000, volatility: 0.015, trend: 0.03 };

    const endPrice = quote.price;
    // Calculate start price based on trend
    const startPrice = endPrice / (1 + config.trend);

    let runningPrice = startPrice;
    const startTime = now - (config.count * config.stepMs);

    for (let i = 0; i < config.count; i++) {
      const t = startTime + (i * config.stepMs);
      const progress = i / (config.count - 1);
      // Deterministic noise using trigonometric waves + hash
      const wave = Math.sin(i * 0.45) * 0.4 + Math.cos(i * 0.9) * 0.3;
      const noise = ((this._pseudoHash(symbol + i) % 100) / 100 - 0.5) * 2;
      const factor = (progress * (endPrice - startPrice)) + (wave + noise) * (startPrice * config.volatility);

      let price = Number((startPrice + factor).toFixed(2));
      if (i === config.count - 1) price = endPrice; // guarantee final point matches live quote
      if (price <= 0.1) price = 0.5;

      points.push({
        timestamp: t,
        price: price,
        volume: Math.floor(quote.volume * (0.6 + Math.abs(wave) * 0.8))
      });
    }

    return {
      symbol,
      range,
      currency: quote.currency,
      regularMarketPrice: quote.price,
      previousClose: quote.previousClose,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      points
    };
  },

  /**
   * Fast integer hash for repeatable procedural simulation
   */
  _pseudoHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  },

  /**
   * Search helper across featured stocks and general symbols
   */
  search(query) {
    if (!query || query.trim() === '') return CONFIG.FEATURED_STOCKS;
    const q = query.toUpperCase().trim();
    return CONFIG.FEATURED_STOCKS.filter(s => {
      return s.symbol.toUpperCase().includes(q) ||
             s.name.toUpperCase().includes(q) ||
             s.exchange.toUpperCase().includes(q) ||
             s.sector.toUpperCase().includes(q);
    });
  }
};
