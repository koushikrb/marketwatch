
# NSE India Stock Screener & Dashboard

An advanced, fast, and interactive stock screener and dashboard for Indian equities, built with React and Vite. It provides real-time data, technical charts, analyst recommendations, and powerful watchlist management for NSE stocks.

---

## Features

- **Stock Screener**: Filter and sort NSE stocks by price, volume, RS rating, and more.
- **Live Data**: Real-time price updates and streaming using Yahoo Finance APIs and WebSockets.
- **Interactive Charts**: Candlestick, line, and volume charts with multiple timeframes.
- **Watchlists**: Create, rename, reorder, and manage multiple watchlists with drag-and-drop.
- **Analyst Recommendations**: Visualize buy/hold/sell consensus for each stock.
- **Search**: Fast fuzzy search for stocks by symbol or name.
- **Offline Caching**: IndexedDB-based local cache for faster reloads and offline use.
- **Responsive UI**: Works on desktop and mobile, with light/dark themes.

---

## Tech Stack

- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Yahoo Finance API](https://finance.yahoo.com/) (via CORS proxy)
- [stock-nse-india](https://www.npmjs.com/package/stock-nse-india) for index/constituent data
- [lightweight-charts](https://tradingview.github.io/lightweight-charts/) for charting
- [idb](https://www.npmjs.com/package/idb) for IndexedDB cache
- [Fuse.js](https://fusejs.io/) for fuzzy search
- [Lucide React](https://lucide.dev/) for icons

---

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Installation

1. Clone the repository:
	```sh
	git clone <your-repo-url>
	cd <project-folder>
	```
2. Install dependencies:
	```sh
	npm install
	```

### Running Locally

Start the development server:
```sh
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```sh
npm run build
```
The static site will be generated in the `dist/` folder.

### Preview Production Build

```sh
npm run preview
```

### Linting

```sh
npm run lint
```

---

## Data Fetching Scripts

To fetch the latest NSE indices and their constituent stocks, use:

```sh
node fetch_nse_indices_stocks.mjs
```
This will generate `nse_indices_stocks.csv` in the project root. Requires: `npm install stock-nse-india csv-writer`.

---

## Project Structure (Key Files)

- `src/` — Main React app source code
  - `components/` — UI components (charts, tables, layout, etc.)
  - `pages/` — Main pages (Dashboard, Search, StockDetail, Watchlist)
  - `utils/` — Data fetching, context, and helpers
- `public/` — Static assets
- `fetch_nse_indices_stocks.mjs` — Script to fetch index/stock data
- `nse_indices_stocks.csv` — Output of the above script

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Credits

- Yahoo Finance, NSE India, TradingView (lightweight-charts), and open-source contributors.
