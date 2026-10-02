/**
 * Portfolio Share Market Game - Global Configuration
 * Used across Student Portal, Game Engine, and Teacher Dashboard
 */

const CONFIG = {
  // Set to false to disable demo/sample classmates
  ENABLE_DEMO_CLASSMATES: false,

  // Google Firebase Backend (maths-f3c6d) for Live Classroom Firestore Sync
  FIREBASE_CONFIG: (typeof DATATRENDS_CONFIG !== 'undefined' && DATATRENDS_CONFIG.FIREBASE_CONFIG) ? DATATRENDS_CONFIG.FIREBASE_CONFIG : {
    apiKey: "AIzaSyCvbWTB94JYqAECVSOKLIepI5vXeTaTwww",
    authDomain: "maths-f3c6d.firebaseapp.com",
    projectId: "maths-f3c6d",
    storageBucket: "maths-f3c6d.firebasestorage.app",
    messagingSenderId: "76007634547",
    appId: "1:76007634547:web:0b9773147e26dd2940dc06",
    measurementId: "G-414P42GKGV"
  },

  // Game Trading Parameters
  INITIAL_CASH: 50000,          // Starting balance in AUD ($50,000)
  BROKERAGE_FEE: 10.00,         // Flat brokerage fee per trade in AUD ($10)
  DEFAULT_CURRENCY: 'AUD',      // Base currency for portfolios and leaderboard
  AUD_USD_RATE: 0.65,           // Fallback AUD to USD exchange rate (1 AUD = 0.65 USD; 1 USD = ~1.538 AUD)

  // Educational Guardrails & Diversification Rules (Syllabus Enforced)
  DIVERSIFICATION_CAP_ENABLED: true,  // Enforces 25% max allocation per company
  MAX_POSITION_PERCENT: 25,           // Max 25% ($12,500 of $50k) per stock to teach risk management
  MANDATORY_RATIONALE_MIN_CHARS: 15,  // Requires investment thesis (min 15 chars) before execution

  // Competition Round & Lifecycle Settings
  COMPETITION_ROUND: {
    name: 'Term 1 Share Market Challenge',
    status: 'ACTIVE',                 // 'ACTIVE' | 'FROZEN' | 'COMPLETED'
    durationWeeks: 6,
    endDate: '2026-04-10T15:30:00+10:00'
  },

  // Interactive Teacher Macro Catalysts & Market Events
  MACRO_CATALYSTS: [
    {
      id: 'rba_hike',
      title: '🏦 RBA Hikes Official Cash Rate (+25 bps)',
      summary: 'The Reserve Bank raises interest rates to tame inflation. High interest rates pressure consumer borrowing and tech valuations, while widening net interest margins for major banks.',
      sectorImpact: { 'Financials': +1.8, 'Technology': -2.5, 'Consumer Discretionary': -1.9 },
      prompt: 'Reflect in your Journal: How does rising interest rate risk impact your holding valuations?'
    },
    {
      id: 'mining_boom',
      title: '⛏️ Resources Super-Cycle Surge',
      summary: 'Global steel manufacturing and green infrastructure drive heavy demand for iron ore, copper, and lithium. Major mining exporters report record revenue projections.',
      sectorImpact: { 'Materials & Mining': +3.4, 'Materials & Lithium': +4.2, 'Energy & Oil': +1.5 },
      prompt: 'Reflect in your Journal: Did your portfolio benefit from Australian resource export strength?'
    },
    {
      id: 'tech_correction',
      title: '📉 Tech & AI Valuation Pullback',
      summary: 'High P/E semiconductor and cloud software companies face profit-taking across Wall Street as investors rotate into defensive dividend-paying value stocks.',
      sectorImpact: { 'Technology': -3.8, 'Semiconductors': -4.5, 'Consumer Staples': +1.2 },
      prompt: 'Reflect in your Journal: How did your asset allocation cushion against technology volatility?'
    },
    {
      id: 'oil_shock',
      title: '⚡ Global Energy Supply Disruption',
      summary: 'Supply constraints push crude oil prices up 7%. Energy producers jump while airlines and transport providers face elevated jet fuel operating costs.',
      sectorImpact: { 'Energy & Oil': +4.1, 'Industrials & Aviation': -3.2, 'Consumer & Travel': -2.1 },
      prompt: 'Reflect in your Journal: How do input commodity costs affect industrial and airline profit margins?'
    },
    {
      id: 'dividend_season',
      title: '💰 ASX Semi-Annual Dividend Distribution (2%)',
      summary: 'Corporate earnings season delivers a 2.0% cash dividend yield across active stock holdings directly into student cash balances.',
      sectorImpact: {},
      isDividend: true,
      prompt: 'Check your available cash balance: reinvest dividends or keep liquid cash for market dips?'
    }
  ],

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
  TEACHER_PASSWORD: 'hscsando1603',
  TEACHER_PASSWORDS: ['hscsando1603', 'market10', 'datatrends2026', '1982', '1603'],

  // Assessment Marking Rubric Settings (Stage 5 Commerce / Stage 6 Economics - Out of 20 marks)
  RUBRIC: {
    maxMarks: 20,
    criteria: [
      { id: 'crit_research', name: 'Financial Research & Market Analysis', max: 5, desc: 'Quality of company research, sector trends, and data grounding.' },
      { id: 'crit_rationale', name: 'Trade Rationale & Investment Thesis', max: 5, desc: 'Clear qualitative justification written for each trade execution.' },
      { id: 'crit_risk', name: 'Risk Evaluation & Asset Allocation', max: 5, desc: 'Portfolio concentration awareness, diversification, and downside management.' },
      { id: 'crit_context', name: 'Economic Context & Performance Evaluation', max: 5, desc: 'Analysis of macroeconomic forces, interest rates, and Alpha vs ASX 200.' }
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
    // ASX Blue Chips & Australian Market Leaders
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
    { symbol: 'WDS.AX', name: 'Woodside Energy Group Ltd', exchange: 'ASX', sector: 'Energy & Oil', currency: 'AUD' },
    { symbol: 'STO.AX', name: 'Santos Limited', exchange: 'ASX', sector: 'Energy & Oil', currency: 'AUD' },
    { symbol: 'ORG.AX', name: 'Origin Energy Ltd', exchange: 'ASX', sector: 'Energy & Utilities', currency: 'AUD' },
    { symbol: 'QAN.AX', name: 'Qantas Airways Ltd', exchange: 'ASX', sector: 'Industrials & Aviation', currency: 'AUD' },
    { symbol: 'COL.AX', name: 'Coles Group Ltd', exchange: 'ASX', sector: 'Consumer Staples', currency: 'AUD' },
    { symbol: 'GMG.AX', name: 'Goodman Group', exchange: 'ASX', sector: 'Real Estate & Industrial', currency: 'AUD' },
    { symbol: 'TCL.AX', name: 'Transurban Group', exchange: 'ASX', sector: 'Infrastructure & Tolls', currency: 'AUD' },
    { symbol: 'COH.AX', name: 'Cochlear Limited', exchange: 'ASX', sector: 'Healthcare', currency: 'AUD' },
    { symbol: 'PLS.AX', name: 'Pilbara Minerals Ltd', exchange: 'ASX', sector: 'Materials & Lithium', currency: 'AUD' },
    { symbol: 'MIN.AX', name: 'Mineral Resources Ltd', exchange: 'ASX', sector: 'Materials & Mining', currency: 'AUD' },
    { symbol: 'JBH.AX', name: 'JB Hi-Fi Limited', exchange: 'ASX', sector: 'Consumer Discretionary', currency: 'AUD' },
    { symbol: 'FLT.AX', name: 'Flight Centre Travel Group', exchange: 'ASX', sector: 'Consumer & Travel', currency: 'AUD' },
    { symbol: 'DRO.AX', name: 'DroneShield Ltd', exchange: 'ASX', sector: 'Aerospace & Defense', currency: 'AUD' },
    { symbol: 'ZIP.AX', name: 'Zip Co Limited', exchange: 'ASX', sector: 'Information Technology', currency: 'AUD' },
    { symbol: 'NXT.AX', name: 'NEXTDC Limited', exchange: 'ASX', sector: 'Information Technology', currency: 'AUD' },

    // NASDAQ Leaders & Tech
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

    // NYSE Giants & Global Leaders
    { symbol: 'BRK-B', name: 'Berkshire Hathaway Inc.', exchange: 'NYSE', sector: 'Financials', currency: 'USD' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', sector: 'Financials', currency: 'USD' },
    { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', sector: 'Financial Services', currency: 'USD' },
    { symbol: 'DIS', name: 'The Walt Disney Company', exchange: 'NYSE', sector: 'Entertainment', currency: 'USD' },
    { symbol: 'KO', name: 'The Coca-Cola Company', exchange: 'NYSE', sector: 'Consumer Staples', currency: 'USD' },
    { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', sector: 'Consumer Staples', currency: 'USD' },
    { symbol: 'NKE', name: 'NIKE, Inc.', exchange: 'NYSE', sector: 'Consumer Discretionary', currency: 'USD' },
    { symbol: 'MCD', name: 'McDonald\'s Corporation', exchange: 'NYSE', sector: 'Consumer Discretionary', currency: 'USD' },
    { symbol: 'BA', name: 'The Boeing Company', exchange: 'NYSE', sector: 'Aerospace & Defense', currency: 'USD' },
    { symbol: 'PLTR', name: 'Palantir Technologies Inc.', exchange: 'NYSE', sector: 'Technology & AI', currency: 'USD' },
    { symbol: 'XOM', name: 'Exxon Mobil Corporation', exchange: 'NYSE', sector: 'Energy & Oil', currency: 'USD' },
    { symbol: 'GME', name: 'GameStop Corp.', exchange: 'NYSE', sector: 'Consumer Discretionary', currency: 'USD' }
  ],

  // Common Search Aliases (Company Names, Nicknames, Colloquial Terms -> Tickers)
  COMPANY_ALIASES: {
    'santos': 'STO.AX',
    'santos limited': 'STO.AX',
    'santos ltd': 'STO.AX',
    'sto': 'STO.AX',
    'woodside': 'WDS.AX',
    'woodside energy': 'WDS.AX',
    'woodside petroleum': 'WDS.AX',
    'wds': 'WDS.AX',
    'qantas': 'QAN.AX',
    'qantas airways': 'QAN.AX',
    'qan': 'QAN.AX',
    'coles': 'COL.AX',
    'coles group': 'COL.AX',
    'col': 'COL.AX',
    'commonwealth bank': 'CBA.AX',
    'commonwealth': 'CBA.AX',
    'commbank': 'CBA.AX',
    'cba': 'CBA.AX',
    'woolworths': 'WOW.AX',
    'woolies': 'WOW.AX',
    'wow': 'WOW.AX',
    'wesfarmers': 'WES.AX',
    'bunnings': 'WES.AX',
    'wes': 'WES.AX',
    'macquarie': 'MQG.AX',
    'macquarie group': 'MQG.AX',
    'mqg': 'MQG.AX',
    'telstra': 'TLS.AX',
    'tls': 'TLS.AX',
    'fortescue': 'FMG.AX',
    'fmg': 'FMG.AX',
    'origin': 'ORG.AX',
    'origin energy': 'ORG.AX',
    'org': 'ORG.AX',
    'transurban': 'TCL.AX',
    'tcl': 'TCL.AX',
    'goodman': 'GMG.AX',
    'goodman group': 'GMG.AX',
    'gmg': 'GMG.AX',
    'cochlear': 'COH.AX',
    'coh': 'COH.AX',
    'pilbara': 'PLS.AX',
    'pilbara minerals': 'PLS.AX',
    'pls': 'PLS.AX',
    'flight centre': 'FLT.AX',
    'flt': 'FLT.AX',
    'jb hifi': 'JBH.AX',
    'jb hi-fi': 'JBH.AX',
    'jbhifi': 'JBH.AX',
    'jbh': 'JBH.AX',
    'droneshield': 'DRO.AX',
    'dro': 'DRO.AX',
    'zip': 'ZIP.AX',
    'zip co': 'ZIP.AX',
    'nextdc': 'NXT.AX',
    'palantir': 'PLTR',
    'pltr': 'PLTR',
    'gamestop': 'GME',
    'gme': 'GME',
    'apple': 'AAPL',
    'microsoft': 'MSFT',
    'nvidia': 'NVDA',
    'google': 'GOOGL',
    'alphabet': 'GOOGL',
    'amazon': 'AMZN',
    'tesla': 'TSLA',
    'netflix': 'NFLX',
    'disney': 'DIS',
    'coke': 'KO',
    'coca cola': 'KO',
    'boeing': 'BA',
    'nike': 'NKE',
    'walmart': 'WMT',
    'mcdonalds': 'MCD',
    'costco': 'COST',
    'exxon': 'XOM',
    'exxonmobil': 'XOM'
  }
};
