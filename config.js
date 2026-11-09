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
  TEACHER_PASSWORDS: ['hscsando1603', 'market10', 'datatrends2026', '1982', '1603', 'teacher', 'admin', 'commerce2026'],

  // 3-Week Independent Student Learning & Financial Independence Program
  LEARNING_PROGRAM: [
    {
      week: 1,
      title: 'Week 1: Foundations of Wealth, Risk & Building Your Core ASX Portfolio',
      theme: 'Inflation vs Investing, Compound Growth & Australian Blue-Chip Equities',
      teacherNotes: 'Lessons 1–3: Introduce why saving cash alone loses to inflation, how compound returns build financial independence, and how the ASX operates. Students construct a diversified Australian core portfolio respecting the 25% position cap.',
      modules: [
        {
          id: 'w1_m1',
          lesson: 'Lesson 1 (Independence Foundations)',
          title: 'Why Invest? Inflation, Compounding & Financial Independence',
          reading: 'Keeping $50,000 in a 0% bank account means inflation (~3% p.a.) silently erodes your purchasing power every year. Investing in productive assets (shares) allows your money to work for you through capital growth and dividends. Financial Independence is reached when your passive investment income covers your living expenses (often estimated using the "4% Rule" — needing 25x your annual expenses invested).',
          taskTitle: 'Use the Financial Independence Calculator & Define Your Goal',
          prompt: 'In your own words, explain why holding 100% cash is a long-term risk due to inflation, and describe what achieving "Financial Independence" in your 20s or 30s would allow you to do:',
          autoCheckType: 'reflection_only'
        },
        {
          id: 'w1_m2',
          lesson: 'Lesson 2 (ASX Market Research)',
          title: 'Australian Blue Chips, Sectors & Dividend Income (ASX)',
          reading: 'The Australian Securities Exchange (ASX) hosts major companies across Financials (CBA, NAB, MQG), Materials & Mining (BHP, RIO, FMG), Healthcare (CSL, COH), and Consumer Staples (WOW, COL). Defensive sectors (supermarkets, healthcare, telcos) provide steady dividends even in downturns, while cyclical sectors (mining, travel, retail) rise and fall with economic booms.',
          taskTitle: 'Place at least 2 ASX Buy Orders across different sectors',
          prompt: 'Which two ASX companies did you select for your foundational portfolio? Identify whether each is "Defensive" or "Cyclical" and explain how it earns its revenue:',
          autoCheckType: 'asx_holdings_2'
        },
        {
          id: 'w1_m3',
          lesson: 'Lesson 3 (Risk & Position Sizing)',
          title: 'Diversification (The 25% Rule) & Brokerage Drag',
          reading: 'Every trade costs $10 AUD in brokerage. Buying tiny $200 parcels means losing 5% immediately to fees! At the same time, putting 100% of your money into a single company exposes you to unsystematic (company-specific) risk. Our 25% position cap ($12,500 max per stock) ensures you hold at least 4 distinct companies.',
          taskTitle: 'Build a Diversified Portfolio of 3+ Active Holdings',
          prompt: 'How did you size your initial trades to minimize the impact of the $10 brokerage fee while staying safely below the 25% single-stock cap?',
          autoCheckType: 'total_holdings_3'
        }
      ]
    },
    {
      week: 2,
      title: 'Week 2: Global Markets, Currency Risk & Macroeconomic Shocks',
      theme: 'Wall Street (NYSE/NASDAQ), AUD/USD Exchange Rates & Central Bank Catalysts',
      teacherNotes: 'Lessons 4–6: Students expand internationally into US tech/global leaders, analyze P/E ratios, and respond to a live Teacher Macro Catalyst broadcast (e.g., RBA Cash Rate Hike or Tech Valuation Pullback).',
      modules: [
        {
          id: 'w2_m1',
          lesson: 'Lesson 4 (Global Investing & FX)',
          title: 'Wall Street (NYSE & NASDAQ) & Currency Risk (AUD/USD)',
          reading: 'Australia represents less than 2% of the global share market and is heavily concentrated in banks and miners. Investing on the NYSE and NASDAQ gives you exposure to global technology, semiconductor, and consumer giants (e.g. Apple, Microsoft, NVIDIA, Visa, Costco). Because US stocks trade in USD, a falling Australian Dollar boosts the AUD value of your US shares, while a rising AUD reduces it.',
          taskTitle: 'Execute at least 1 US Share Trade (NYSE or NASDAQ)',
          prompt: 'Which US company did you invest in, how does it diversify your Australian holdings, and what happens to your holding value in AUD if the AUD/USD exchange rate rises from 0.65 to 0.75?',
          autoCheckType: 'us_holdings_1'
        },
        {
          id: 'w2_m2',
          lesson: 'Lesson 5 (Valuation Metrics)',
          title: 'Reading Financial Data: P/E Ratio, Market Cap & 52-Week Range',
          reading: 'Smart independent investors don\'t just buy famous brand names—they check the price tag. The Price-to-Earnings (P/E) ratio shows how much investors pay for $1 of company profit. High P/E stocks (30x+) are priced for rapid future growth but can drop sharply if growth slows; lower P/E stocks (10x–18x) are often mature dividend payers.',
          taskTitle: 'Document Full Investment Journal Entries (Thesis, Risks & Target Price) for 3+ Stocks',
          prompt: 'Compare the P/E ratio and 52-week price range of two companies in your portfolio. Which one is priced as a high-growth stock and which is priced as a value/income stock?',
          autoCheckType: 'journal_entries_3'
        },
        {
          id: 'w2_m3',
          lesson: 'Lesson 6 (Macroeconomic Shocks)',
          title: 'Interest Rates (RBA), Inflation & Economic Catalysts',
          reading: 'Share markets react immediately to macroeconomic news. When the Reserve Bank of Australia (RBA) raises the cash rate to fight inflation, borrowing costs rise—hurting debt-heavy tech and retail companies, while often helping banks widen their interest margins. Conversely, commodity booms lift mining and energy exporters.',
          taskTitle: 'Respond to a Market Catalyst Event',
          prompt: 'Analyze how a +0.25% RBA interest rate hike OR a global tech pullback impacts your specific portfolio holdings. Did you hold, buy the dip, or rebalance?',
          autoCheckType: 'reflection_only'
        }
      ]
    },
    {
      week: 3,
      title: 'Week 3: Passive vs Active Investing, Rebalancing & Your Independence Roadmap',
      theme: 'Beating the ASX 200 Benchmark (Alpha), Dividends & Real-World Wealth Habits',
      teacherNotes: 'Lessons 7–9: Students evaluate their performance against the S&P/ASX 200 index benchmark, execute a strategic portfolio rebalance, design their real-world post-school investing plan, and export their portfolio for final rubric marking.',
      modules: [
        {
          id: 'w3_m1',
          lesson: 'Lesson 7 (Active vs Passive)',
          title: 'Generating "Alpha" vs Passive Index Investing (S&P/ASX 200)',
          reading: 'In the real world, over 80% of professional fund managers fail to beat the broader market index (like the S&P/ASX 200 or S&P 500) over a 10-year period after fees. "Alpha" measures how much your portfolio beat (or lagged) the passive ASX 200 benchmark (8.2% p.a.). For most independent investors, low-cost Index ETFs form the stress-free core of their wealth.',
          taskTitle: 'Compare Your Portfolio Return Against the ASX 200 Benchmark',
          prompt: 'Check your "Alpha vs ASX 200" KPI card on your dashboard. Is your active portfolio currently beating or trailing the passive benchmark, and what drove that result?',
          autoCheckType: 'reflection_only'
        },
        {
          id: 'w3_m2',
          lesson: 'Lesson 8 (Portfolio Rebalancing)',
          title: 'Strategic Rebalancing, Dividends & Controlling Investor Psychology',
          reading: 'Independent investors avoid two classic behavioural traps: FOMO (chasing stocks after they skyrocket) and Panic Selling (dumping quality companies during a temporary dip). Periodic rebalancing means trimming overweight winners or replacing underperforming companies whose original investment thesis no longer holds.',
          taskTitle: 'Execute at least 4 Total Trades (Including Strategic Adjustments)',
          prompt: 'Review your best and worst performing trades in your Trade Ledger. What adjustments or rebalancing decisions did you make, and what did you learn about your own risk tolerance?',
          autoCheckType: 'total_trades_4'
        },
        {
          id: 'w3_m3',
          lesson: 'Lesson 9 (Final Independence Plan)',
          title: 'My Real-World Financial Independence Blueprint (Age 16–30)',
          reading: 'The biggest advantage young investors have is TIME. Starting early with regular, automated contributions (Dollar-Cost Averaging), understanding your Superannuation investment options, reinvesting dividends, and keeping fees low can turn modest weekly savings into life-changing financial independence.',
          taskTitle: 'Complete Your Final Portfolio Audit & Export Your Ledger',
          prompt: 'Write your personal 3-step Financial Independence Plan for life after school (covering: 1. How much % of income you aim to invest regularly, 2. Your preferred mix of ETFs/ASX/US shares, and 3. Key mistakes you will avoid):',
          autoCheckType: 'reflection_only'
        }
      ]
    }
  ],

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
