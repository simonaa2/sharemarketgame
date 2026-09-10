# Share Market Arena — Student Portfolio Simulator

An interactive, modern educational share market simulation game designed for secondary school **Commerce**, **Economics**, and **Business Studies** classrooms.

Students manage a virtual portfolio starting with **$50,000 AUD**, research equities across Australian (**ASX**) and US (**NYSE**, **NASDAQ**) markets using live Yahoo/Google Finance data, analyze trends on interactive timeline charts, execute buy/sell orders with realistic brokerage fees, and track portfolio valuation over time while competing on a live class leaderboard.

---

## Key Features

### 1. Multi-Market Trading (ASX, NYSE & NASDAQ)
- **Australian Market (ASX)**: Trade blue chips like BHP, Commonwealth Bank (CBA), CSL, Wesfarmers (WES), Macquarie (MQG), Telstra (TLS), Woolworths (WOW) in Australian Dollars (AUD).
- **US Markets (NYSE & NASDAQ)**: Trade global tech giants and conglomerates like Apple (AAPL), Nvidia (NVDA), Microsoft (MSFT), Tesla (TSLA), Alphabet (GOOGL), Berkshire Hathaway (BRK-B) in US Dollars (USD).
- **Automatic Currency Conversion**: Live AUD/USD exchange rate converts US purchases and valuations to AUD in real-time.

### 2. Interactive Financial Charts
- **Per-Share Timeline Graphs**: Switch between **1D**, **5D**, **1M**, **6M**, **1Y**, **5Y**, and **MAX** timeline intervals with dynamic gain/loss color fills (green for gains, red for losses) and interactive crosshairs.
- **Whole Portfolio Valuation Graph**: Track overall account net worth (liquid cash + active equities) over time.
- **Asset Allocation Donut Chart**: Visual breakdown of portfolio diversification between cash and individual share holdings.

### 3. Student Trading Engine
- **Starting Cash**: $50,000 AUD per student.
- **Flat Brokerage**: $10.00 AUD per transaction to teach students the cost of over-trading.
- **Real-Time Validation**: Prevents buying beyond available cash or selling more shares than currently owned.
- **Detailed Trade Ledger**: Full chronological audit trail of all transactions with timestamps, prices, brokerage, and realized profit/loss calculations.
- **CSV Export**: Students can download their complete trade ledger as a CSV spreadsheet for assessment submission.

### 4. Teacher Dashboard & Administration
- **Password-Protected Portal** (`market10` by default, configurable in `config.js`).
- **Live Class Leaderboard**: View all student portfolios ranked by total valuation and ROI (%).
- **Student Portfolio Inspector**: Inspect any student's individual holdings, trade history, and portfolio chart in detail.
- **Administrative Controls**: Issue 2% dividend bonuses across the class, reset student accounts, or populate demo classmates for testing.
- **Gradebook Export**: One-click download of the complete class leaderboard in CSV format.

### 5. Curriculum Learning Hub
- Embedded Commerce and Economics study notes explaining:
  - *Portfolio Diversification*
  - *Foreign Exchange (FX) Risk in international investing*
  - *Brokerage costs and position sizing*
  - *Bull vs. Bear market cycles*

---

## File Structure

```
portfolio_sharemarket_game/
├── config.js               # Central parameters (cash, brokerage, class code, teacher pass)
├── index.html              # Student login portal & market status ticker
├── game.html               # Student trading floor (Portfolio, Explorer, Ledger, Leaderboard)
├── style.css               # Modern fintech dark theme (glowing neon charts, ticker tape, modals)
├── market_service.js       # Live Yahoo Finance API fetcher with multi-tier CORS fallback
├── chart_manager.js        # Chart.js engine for single-stock and portfolio timeline charts
├── game.js                 # Trading engine (buy/sell execution, portfolio valuation, autosave)
├── teacher.html            # Teacher command center & student inspector
├── teacher.js              # Teacher dashboard logic & CSV gradebook export
├── google_script.js        # Google Apps Script backend for Google Sheets sync & zero-CORS proxy
└── README.md               # Teacher guide and documentation
```

---

## Quick Start Guide

### Running Locally
1. Double-click `index.html` to open the game in any modern web browser (Chrome, Edge, Firefox, Safari).
2. Students enter their name and the class code (Default: `COMMERCE2026`).
3. Alternatively, click **"⚡ Quick Demo / Guest Trader"** for immediate access.

### Teacher Access
1. From the login page footer, click **"Teacher & Admin Dashboard"** (or open `teacher.html`).
2. Enter the teacher password: `market10`.
3. Monitor rankings, view trades, or click **"⚡ Populate Demo Classmates"** to see a full sample class roster.

---

## Optional: Connecting to Google Sheets Backend

For zero-CORS live quotes and automatic spreadsheet logging of all student portfolios:

1. Create a new Google Sheet in Google Drive (e.g. named `Commerce Share Market 2026`).
2. Click **Extensions > Apps Script**.
3. Replace any existing code with the contents of [`google_script.js`](file:///C:/Users/simon.anderson/.gemini/antigravity/scratch/portfolio_sharemarket_game/google_script.js).
4. Click **Deploy > New deployment**.
5. Select **Web app**:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
6. Click **Deploy**, authorize permissions, and copy the **Web app URL**.
7. In `config.js`, paste your URL:
   ```javascript
   SCRIPT_URL: 'https://script.google.com/macros/s/.../exec'
   ```

---

## Australian Curriculum Alignment
- **NSW Stage 5 Commerce**: Topic 1 Consumer and Financial Decisions (investing in shares, risk vs return, role of the ASX, managing financial risk).
- **NSW Stage 6 Economics**: Topic 2 Australia's Place in the Global Economy (exchange rates, foreign investment, global financial flows).
- **Victorian Curriculum (Economics and Business)**: Financial literacy, investment decisions, markets, and risk management.
