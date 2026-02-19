import protobuf from 'protobufjs';

// Protobuf definition for Yahoo Finance PricingData
// Derived from yfinance and reverse-engineered sources
const protoDefinition = `
syntax = "proto3";

message PricingData {
    enum QuoteType {
        NONE = 0;
        ALTSYMBOL = 5;
        HEARTBEAT = 7;
        EQUITY = 8;
        INDEX = 9;
        MUTUALFUND = 11;
        MONEYMARKET = 12;
        OPTION = 13;
        CURRENCY = 14;
        WARRANT = 15;
        BOND = 17;
        FUTURE = 18;
        ETF = 20;
        COMMODITY = 23;
        ECNQUOTE = 28;
        CRYPTOCURRENCY = 41;
        INDICATOR = 42;
        INDUSTRY = 1000;
    }

    enum MarketHoursType {
        PRE_MARKET = 0;
        REGULAR_MARKET = 1;
        POST_MARKET = 2;
        EXTENDED_HOURS_MARKET = 3;
    }

    string id = 1;
    float price = 2;
    sint64 time = 3;
    string currency = 4;
    string exchange = 5;
    QuoteType quoteType = 6;
    MarketHoursType marketHours = 7;
    float changePercent = 8;
    sint64 dayVolume = 9;
    float dayHigh = 10;
    float dayLow = 11;
    float change = 12;
    string shortName = 13;
    sint64 expireDate = 14;
    float openPrice = 15;
    float previousClose = 16;
    float strikePrice = 17;
    string underlyingSymbol = 18;
    sint64 openInterest = 19;
    sint64 miniOption = 21;
    sint64 lastSize = 22;
    float bid = 23;
    sint64 bidSize = 24;
    float ask = 25;
    sint64 askSize = 26;
    sint64 priceHint = 27;
    sint64 vol_24hr = 28;
    sint64 volAllCurrencies = 29;
    string fromcurrency = 30;
    string lastMarket = 31;
    double circulatingSupply = 32;
    double marketcap = 33;
}
`;

class YahooStreamingService {
    constructor() {
        this.ws = null;
        this.subscriptions = new Set();
        this.listeners = new Set();
        this.lastTicks = new Map(); // Track last update time per symbol
        this.onStatusChange = null;
        this.root = protobuf.parse(protoDefinition).root;
        this.PricingData = this.root.lookupType("PricingData");
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.isConnected = false;
        this.watchdogInterval = null;
    }

    startWatchdog() {
        if (this.watchdogInterval) return;

        this.watchdogInterval = setInterval(() => {
            const now = Date.now();
            this.subscriptions.forEach(symbol => {
                const lastTick = this.lastTicks.get(symbol) || 0;
                // If no tick for 30 seconds, and we are connected, it might be a silent stall
                if (this.isConnected && now - lastTick > 30000) {
                    // Trigger a recovery event (can be listened to by Context)
                    this.listeners.forEach(callback => callback({ id: symbol, type: 'STALE_DATA_RECOVERY' }));
                }
            });
        }, 10000); // Check every 10s
    }

    stopWatchdog() {
        if (this.watchdogInterval) {
            clearInterval(this.watchdogInterval);
            this.watchdogInterval = null;
        }
    }

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        console.log('[Stream] Connecting to Yahoo WebSocket...');
        this.ws = new WebSocket('wss://streamer.finance.yahoo.com/?version=2');
        this.ws.binaryType = 'arraybuffer'; // Handle binary data if sent

        this.ws.onopen = () => {
            console.log('[Stream] WebSocket Connected');
            this.isConnected = true;
            this.startWatchdog();
            this.reconnectAttempts = 0;
            if (this.onStatusChange) this.onStatusChange(true);
            if (this.subscriptions.size > 0) {
                this.subscribe(Array.from(this.subscriptions));
            }
        };

        this.ws.onmessage = (event) => {
            try {
                let buffer;
                if (typeof event.data === 'string') {
                    // Handle Base64 encoded string
                    const rawData = event.data;
                    buffer = Uint8Array.from(atob(rawData), c => c.charCodeAt(0));
                } else if (event.data instanceof ArrayBuffer) {
                    // Handle raw binary data
                    buffer = new Uint8Array(event.data);
                } else {
                    console.warn('[Stream] Received unknown data type:', typeof event.data);
                    return;
                }

                const decoded = this.PricingData.decode(buffer);
                const message = this.PricingData.toObject(decoded, {
                    longs: String,
                    enums: String,
                    bytes: String,
                });

                if (message.id) {
                    this.lastTicks.set(message.id, Date.now());
                    if (this.reconnectAttempts === 0) { // Log occasionally
                        console.log(`[Stream] Live tick for ${message.id}: ${message.price}`);
                    }
                }

                // Broadcast to all listeners
                this.listeners.forEach(callback => callback(message));
            } catch (err) {
                console.error('[Stream] Decode error:', err);
                if (typeof event.data === 'string') {
                    console.log('[Stream] Raw string sample:', event.data.substring(0, 50));
                }
            }
        };

        this.ws.onerror = (error) => {
            console.error('[Stream] WebSocket Error:', error);
        };

        this.ws.onclose = () => {
            console.log('[Stream] WebSocket Closed');
            this.isConnected = false;
            this.stopWatchdog();
            if (this.onStatusChange) this.onStatusChange(false);
            this.attemptReconnect();
        };
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            console.log(`[Stream] Reconnecting in ${delay / 1000}s (Attempt ${this.reconnectAttempts})...`);
            setTimeout(() => this.connect(), delay);
        }
    }

    subscribe(symbols) {
        const symbolArray = Array.isArray(symbols) ? symbols : [symbols];

        const newSymbols = symbolArray.filter(s => {
            if (!this.subscriptions.has(s)) {
                this.subscriptions.add(s);
                return true;
            }
            return false;
        });

        if (this.ws && this.ws.readyState === WebSocket.OPEN && newSymbols.length > 0) {
            console.log(`[Stream] Subscribing to ${newSymbols.length} new symbols:`, newSymbols);
            // Yahoo streamer often prefers individual messages or specific batching
            newSymbols.forEach(symbol => {
                this.ws.send(JSON.stringify({ subscribe: [symbol] }));
            });
        } else if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
            this.connect();
        }
    }

    unsubscribe(symbols) {
        const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
        symbolArray.forEach(s => this.subscriptions.delete(s));
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ unsubscribe: symbolArray }));
        }
    }

    addListener(callback) {
        this.listeners.add(callback);
    }

    removeListener(callback) {
        this.listeners.delete(callback);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.subscriptions.clear();
        this.listeners.clear();
    }
}

export const streamingService = new YahooStreamingService();
export default streamingService;
