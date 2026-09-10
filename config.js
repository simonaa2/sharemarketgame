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

  // Class & Authentication Settings
  CLASS_NAME: 'Commerce & Economics Market Challenge 2026',
  CLASS_CODE: 'COMMERCE2026',   // Default class code for open student login
  TEACHER_PASSWORD: 'market10', // Teacher dashboard password

  // Google Apps Script Web App URL (leave empty to use local/fallback mode)
  // When deployed, this proxies Yahoo Finance without CORS and syncs portfolio data to a Google Sheet
  SCRIPT_URL: '',

  // Optional: Pre-defined Student Roster
  // If populated, students can select their name or enter their exact password.
  // If empty, any student entering the CLASS_CODE can register and play.
  STUDENTS: [
    // { name: 'Alex Taylor', password: 'alex' },
    // { name: 'Jordan Lee', password: 'jordan' }
  ],

  // Supported Exchanges and Information
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

  // Featured Curated Stocks for Quick Discovery
  FEATURED_STOCKS: [
    // ASX Blue Chips (Australia - AUD)
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

    // NASDAQ Leaders (US - USD)
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

    // NYSE Giants (US - USD)
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
