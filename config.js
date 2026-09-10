/**
 * Portfolio Share Market Game - Global Configuration
 * Used across Student Portal, Game Engine, and Teacher Dashboard
 */

const CONFIG = {
  // Game Trading Parameters
  INITIAL_CASH: 50000,          // Starting balance in AUD ($50,000)
  BROKERAGE_FEE: 10.00,         // Flat brokerage fee per trade in AUD ($10)
  DEFAULT_CURRENCY: 'AUD',      // Base currency for portfolios and leaderboard
  AUD_USD_RATE: 0.65,           // Fallback AUD to USD exchange rate (1 AUD = 0.65 USD; 1 USD = ~1.538 AUD)

  // Educational Guardrails & Diversification Rules
  DIVERSIFICATION_CAP_ENABLED: true, // If true, limits how much of the portfolio can be in a single stock
  MAX_POSITION_PERCENT: 25,          // Maximum 25% of total portfolio value allowed in any single company

  // Trading Hours Mode:
  // 'INSTANT': Orders execute 24/7 at latest prices (allows trading US stocks during Australian school day)
  // 'STRICT': Orders only execute during official market hours, queueing as pending outside hours
  MARKET_HOURS_MODE: 'INSTANT',

  // Privacy & Leaderboard Display Mode:
  // 'INITIALS': Displays First Name + Last Initial (e.g. Samuel G.) - Recommended for student privacy
  // 'FULL': Displays Full Student Name
  // 'ANONYMOUS': Displays Trader Alias / Code (e.g. Trader #4)
  PRIVACY_MODE: 'INITIALS',

  // Automated Dividend Yield (3.8% p.a. prorated weekly into cash balances)
  AUTO_DIVIDENDS_ENABLED: true,
  DIVIDEND_ANNUAL_YIELD_RATE: 0.038,

  // Market Benchmark Comparison (Overlaid on Portfolio Chart)
  BENCHMARK_INDEX: 'ASX 200',
  BENCHMARK_ANNUAL_RETURN: 0.082, // 8.2% historical annualized baseline

  // Multi-Class Configurations
  CLASSES: [
    { code: '10COMM1', name: 'Year 10 Commerce (Class 1)' },
    { code: '10COMM2', name: 'Year 10 Commerce (Class 2)' },
    { code: '11ECON', name: 'Year 11 Preliminary Economics' },
    { code: 'COMMERCE2026', name: 'General Commerce Challenge' }
  ],
  DEFAULT_CLASS_CODE: '10COMM1',

  // Teacher Authentication
  TEACHER_PASSWORD: 'market10',

  // Assessment Marking Rubric Settings (Out of 20 marks)
  RUBRIC: {
    maxMarks: 20,
    criteria: [
      { id: 'crit_journal', name: 'Investment Journal & Research Rationale', max: 10, desc: 'Depth of economic research, company valuation, and thesis.' },
      { id: 'crit_diversification', name: 'Diversification & Risk Management', max: 5, desc: 'Portfolio spread across industries and compliance with the 25% cap.' },
      { id: 'crit_reflection', name: 'Market Reflection & Performance Analysis', max: 5, desc: 'Understanding of market drivers, Alpha, and economic trends.' }
    ]
  },

  // Google Apps Script Web App URL (leave empty to use local/fallback mode)
  SCRIPT_URL: '',

  // Optional: Pre-defined Student Roster
  STUDENTS: [
    // { name: 'Alex Taylor', classCode: '10COMM1', password: 'alex' }
  ],

  // Supported Exchanges
  EXCHANGES: {
    ASX: {
      name: 'Australian Securities Exchange',
      code: 'ASX',
      suffix: '.AX',
      currency: 'AUD',
      flag: '🇦🇺',
      openTimeAEST: '10:00',
      closeTimeAEST: '16:00',
      timezone: 'Australia/Sydney'
    },
    NYSE: {
      name: 'New York Stock Exchange',
      code: 'NYSE',
      suffix: '',
      currency: 'USD',
      flag: '🇺🇸',
      openTimeEST: '09:30',
      closeTimeEST: '16:00',
      timezone: 'America/New_York'
    },
    NASDAQ: {
      name: 'NASDAQ Stock Market',
      code: 'NASDAQ',
      suffix: '',
      currency: 'USD',
      flag: '🇺🇸',
      openTimeEST: '09:30',
      closeTimeEST: '16:00',
      timezone: 'America/New_York'
    }
  },

  // Featured Curated Stocks
  FEATURED_STOCKS: [
    // ASX Blue Chips
    { symbol: 'BHP.AX', name: 'BHP Group Ltd', exchange: 'ASX', sector: 'Materials & Mining', currency: 'AUD' },
    { symbol: 'CBA.AX', name: 'Commonwealth Bank of Australia', exchange: 'ASX', sector: 'Financials', currency: 'AUD' },
    { symbol: 'CSL.AX', name: 'CSL Limited', exchange: 'ASX', sector: 'Healthcare', currency: 'AUD' },
    { symbol: 'WES.AX', name: 'Wesfarmers Limited', exchange: 'ASX', sector: 'Consumer Discretionary', currency: 'AUD' },
    { symbol: 'MQG.AX', name: 'Macquarie Group Ltd', exchange: 'ASX', sector: 'Financials', currency: 'AUD' },
    { symbol: 'TLS.AX', name: 'Telstra Group Ltd', exchange: 'ASX', sector: 'Telecommunications', currency: 'AUD' },
    { symbol: 'FMG.AX', name: 'Fortescue Ltd', exchange: 'ASX', sector: 'Materials & Mining', currency: 'AUD' },
    { symbol: 'WOW.AX', name: 'Woolworths Group Ltd', exchange: 'ASX', sector: 'Consumer Staples', currency: 'AUD' },
    { symbol: 'WTC.AX', name: 'WiseTech Global Ltd', exchange: 'ASX', sector: 'Information Technology', currency: 'AUD' },
    { symbol: 'RIO.AX', name: 'Rio Tinto Ltd', exchange: 'ASX', sector: 'Materials & Mining', currency: 'AUD' },
    { symbol: 'ANZ.AX', name: 'ANZ Group Holdings Ltd', exchange: 'ASX', sector: 'Financials', currency: 'AUD' },
    { symbol: 'NAB.AX', name: 'National Australia Bank Ltd', exchange: 'ASX', sector: 'Financials', currency: 'AUD' },
    { symbol: 'WBC.AX', name: 'Westpac Banking Corp', exchange: 'ASX', sector: 'Financials', currency: 'AUD' },
    { symbol: 'REA.AX', name: 'REA Group Ltd', exchange: 'ASX', sector: 'Communication Services', currency: 'AUD' },
    { symbol: 'XRO.AX', name: 'Xero Limited', exchange: 'ASX', sector: 'Information Technology', currency: 'AUD' },

    // NASDAQ Leaders
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', sector: 'Technology', currency: 'USD' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', sector: 'Technology', currency: 'USD' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'Semiconductors', currency: 'USD' },
    { symbol: 'GOOGL', name: 'Alphabet Inc. (Google)', exchange: 'NASDAQ', sector: 'Communication Services', currency: 'USD' },
    { symbol: 'AMZN', name: 'Amazon.com, Inc.', exchange: 'NASDAQ', sector: 'Consumer Discretionary', currency: 'USD' },
    { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', sector: 'Automotive / Clean Tech', currency: 'USD' },
    { symbol: 'META', name: 'Meta Platforms, Inc.', exchange: 'NASDAQ', sector: 'Communication Services', currency: 'USD' },
    { symbol: 'NFLX', name: 'Netflix, Inc.', exchange: 'NASDAQ', sector: 'Entertainment', currency: 'USD' },
    { symbol: 'COST', name: 'Costco Wholesale Corp', exchange: 'NASDAQ', sector: 'Consumer Staples', currency: 'USD' },
    { symbol: 'AMD', name: 'Advanced Micro Devices', exchange: 'NASDAQ', sector: 'Semiconductors', currency: 'USD' },

    // NYSE Giants
    { symbol: 'BRK-B', name: 'Berkshire Hathaway Inc.', exchange: 'NYSE', sector: 'Financials', currency: 'USD' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', sector: 'Financials', currency: 'USD' },
    { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', sector: 'Financial Services', currency: 'USD' },
    { symbol: 'DIS', name: 'The Walt Disney Company', exchange: 'NYSE', sector: 'Entertainment', currency: 'USD' },
    { symbol: 'KO', name: 'The Coca-Cola Company', exchange: 'NYSE', sector: 'Consumer Staples', currency: 'USD' },
    { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', sector: 'Consumer Staples', currency: 'USD' },
    { symbol: 'NKE', name: 'NIKE, Inc.', exchange: 'NYSE', sector: 'Consumer Discretionary', currency: 'USD' },
    { symbol: 'MCD', name: 'McDonald\'s Corporation', exchange: 'NYSE', sector: 'Consumer Discretionary', currency: 'USD' },
    { symbol: 'BA', name: 'The Boeing Company', exchange: 'NYSE', sector: 'Aerospace & Defense', currency: 'USD' }
  ]
};
