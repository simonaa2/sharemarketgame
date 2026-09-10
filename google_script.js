/**
 * ===================================================================
 * SHARE MARKET ARENA — GOOGLE APPS SCRIPT BACKEND
 * ===================================================================
 * Free, zero-server backend that connects to a Google Sheet:
 * 1. Automatically logs student portfolios & trades into Google Sheets.
 * 2. Proxies Yahoo Finance live quote and chart API queries with ZERO CORS issues!
 *
 * HOW TO DEPLOY:
 * 1. Create a new Google Sheet (e.g. named "Commerce Share Market 2026").
 * 2. In the menu, click Extensions > Apps Script.
 * 3. Delete any code in the editor, and paste this entire file.
 * 4. Click the blue "Deploy" button in top-right > "New deployment".
 * 5. Select type: "Web app".
 * 6. Configuration:
 *    - Description: "Share Market Backend"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (crucial so student browsers can connect)
 * 7. Click Deploy, Authorize access with your Google account.
 * 8. Copy the "Web app URL" and paste it into config.js under SCRIPT_URL: '...'
 * ===================================================================
 */

function doPost(e) {
  try {
    const contents = e.postData ? e.postData.contents : '';
    if (!contents) return responseJSON({ status: 'error', message: 'No payload' });

    const payload = JSON.parse(contents);
    const action = payload.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'save_portfolio') {
      const p = payload.data;
      if (!p || !p.studentName) {
        return responseJSON({ status: 'error', message: 'Missing studentName' });
      }

      // 1. Update Portfolios Sheet
      let pSheet = ss.getSheetByName('Portfolios');
      if (!pSheet) {
        pSheet = ss.insertSheet('Portfolios');
        pSheet.appendRow([
          'Student Name', 'Class Code', 'Total Value (AUD)', 'Cash (AUD)',
          'Return (%)', 'Holdings Count', 'Holdings Summary', 'Total Trades', 'Last Updated'
        ]);
        pSheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#0e1526').setFontColor('#ffffff');
      }

      const totalVal = p.equityHistory && p.equityHistory.length > 0
        ? p.equityHistory[p.equityHistory.length - 1].totalValue
        : p.cash;
      const roi = ((totalVal - 50000) / 50000) * 100;
      const holdingsSummary = (p.holdings || []).map(h => `${h.symbol} (${h.shares}x)`).join(', ');

      const data = pSheet.getDataRange().getValues();
      let foundRow = -1;
      for (let r = 1; r < data.length; r++) {
        if (data[r][0].toString().toLowerCase() === p.studentName.toLowerCase()) {
          foundRow = r + 1;
          break;
        }
      }

      const rowValues = [
        p.studentName,
        p.classCode || 'COMMERCE2026',
        totalVal,
        p.cash,
        roi.toFixed(2) + '%',
        (p.holdings || []).length,
        holdingsSummary,
        (p.trades || []).length,
        new Date().toISOString()
      ];

      if (foundRow > 0) {
        pSheet.getRange(foundRow, 1, 1, 9).setValues([rowValues]);
      } else {
        pSheet.appendRow(rowValues);
      }

      // 2. Append New Trades to Trades Sheet
      if (p.trades && p.trades.length > 0) {
        let tSheet = ss.getSheetByName('Trades');
        if (!tSheet) {
          tSheet = ss.insertSheet('Trades');
          tSheet.appendRow([
            'Student Name', 'Timestamp', 'Type', 'Symbol', 'Name',
            'Exchange', 'Quantity', 'Price', 'Currency', 'Brokerage (AUD)', 'Total (AUD)', 'Realized P&L'
          ]);
          tSheet.getRange(1, 1, 1, 12).setFontWeight('bold').setBackground('#0e1526').setFontColor('#ffffff');
        }

        const latestTrade = p.trades[0];
        if (latestTrade) {
          tSheet.appendRow([
            p.studentName,
            new Date(latestTrade.timestamp).toISOString(),
            latestTrade.type,
            latestTrade.symbol,
            latestTrade.name,
            latestTrade.exchange,
            latestTrade.shares,
            latestTrade.price,
            latestTrade.currency,
            latestTrade.brokerageAUD,
            latestTrade.totalAUD,
            latestTrade.realizedGainAUD || 0
          ]);
        }
      }

      return responseJSON({ status: 'success' });
    }

    return responseJSON({ status: 'error', message: 'Unknown action' });
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

function doGet(e) {
  const action = e.parameter ? e.parameter.action : '';

  // PROXY ACTION: Serverless fetch for Yahoo Finance with zero CORS!
  if (action === 'proxy') {
    const targetUrl = e.parameter.url;
    if (!targetUrl) return responseJSON({ error: 'No URL parameter provided' });

    try {
      const response = UrlFetchApp.fetch(targetUrl, {
        muteHttpExceptions: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const code = response.getResponseCode();
      const content = response.getContentText();

      return ContentService.createTextOutput(content)
        .setMimeType(ContentService.MimeType.JSON);
    } catch (fetchErr) {
      return responseJSON({ error: fetchErr.toString() });
    }
  }

  // LEADERBOARD ACTION: Return current class standings from Google Sheet
  if (action === 'leaderboard') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const pSheet = ss.getSheetByName('Portfolios');
    if (!pSheet) return responseJSON({ students: [] });

    const values = pSheet.getDataRange().getValues();
    const list = [];
    for (let i = 1; i < values.length; i++) {
      list.push({
        name: values[i][0],
        classCode: values[i][1],
        totalValue: Number(values[i][2]),
        cash: Number(values[i][3]),
        roi: values[i][4],
        holdingsCount: Number(values[i][5]),
        tradesCount: Number(values[i][7]),
        lastUpdated: values[i][8]
      });
    }

    list.sort((a, b) => b.totalValue - a.totalValue);
    return responseJSON({ students: list });
  }

  return responseJSON({ status: 'online', service: 'Share Market Arena Backend' });
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
