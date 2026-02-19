// Script to fetch all NSE indices and their constituent stocks using stock-nse-india package
// Saves as nse_indices_stocks.csv in the current folder
// Requires: npm install stock-nse-india csv-writer

import { NseIndia } from "stock-nse-india";
import { createObjectCsvWriter } from "csv-writer";

const nseIndia = new NseIndia();

async function main() {
    const indices = await nseIndia.getEquityStockIndices();
    let allRows = [];
    for (const idx of indices) {
        try {
            const details = await nseIndia.getIndexDetails(idx.index);
            if (details && details.stocks && details.stocks.length > 0) {
                for (const stock of details.stocks) {
                    allRows.push({
                        index: idx.index,
                        symbol: stock.symbol,
                        name: stock.companyName || ''
                    });
                }
                console.log(`Fetched ${details.stocks.length} stocks for index ${idx.index}`);
            }
        } catch (e) {
            console.warn(`Failed to fetch for index ${idx.index}:`, e.message);
        }
    }
    const csvWriter = createObjectCsvWriter({
        path: './nse_indices_stocks.csv',
        header: [
            { id: 'index', title: 'Index' },
            { id: 'symbol', title: 'Symbol' },
            { id: 'name', title: 'Name' }
        ]
    });
    await csvWriter.writeRecords(allRows);
    console.log('Saved nse_indices_stocks.csv');
}

main();
