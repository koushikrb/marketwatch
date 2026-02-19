import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import { StockProvider, useStock } from './utils/StockContext';
import ErrorBoundary from './components/ErrorBoundary';
import SearchPage from './pages/SearchPage';
import StockDetail from './pages/StockDetail';
import WatchlistPage from './pages/Watchlist';
import ScreenerTable from './components/ScreenerTable'; // Assuming it's needed or was there

const AppContent = () => {
  const { currentPageName } = useStock();
  return (
    <Layout>
      {currentPageName === 'watchlist' ? (
        <WatchlistPage />
      ) : currentPageName === 'stock-detail' ? (
        <StockDetail />
      ) : currentPageName === 'search' ? (
        <SearchPage />
      ) : (
        <Dashboard />
      )}
    </Layout>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <StockProvider>
        <AppContent />
      </StockProvider>
    </ErrorBoundary>
  )
}

export default App;
