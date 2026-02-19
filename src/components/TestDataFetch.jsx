import React, { useEffect, useState } from 'react';
import { fetchStockData } from '../utils/yahooFinanceService';

const TestDataFetch = () => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch Reliance Industries data as a test
                const result = await fetchStockData('RELIANCE.NS');
                setData(result);
            } catch (err) {
                setError(err.message);
            }
        };
        loadData();
    }, []);

    if (error) return <div>Error: {error}</div>;
    if (!data) return <div>Loading data...</div>;

    return (
        <div>
            <h2>API Test: RELIANCE.NS</h2>
            <p>Fetched {data?.data?.length || 0} data points.</p>
            <pre>{JSON.stringify(data?.data?.slice(0, 5) || [], null, 2)}</pre>
        </div>
    );
};

export default TestDataFetch;
