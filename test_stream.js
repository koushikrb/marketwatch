const WebSocket = require('ws');
const protobuf = require('protobufjs');

const protoDefinition = `
syntax = "proto3";
message PricingData {
    string id = 1;
    float price = 2;
    int64 time = 3;
    string currency = 4;
    string exchange = 5;
    string quoteType = 6;
    string marketHours = 7;
    float changePercent = 8;
    int64 dayVolume = 9;
    float dayHigh = 10;
    float dayLow = 11;
    float change = 12;
    string shortName = 13;
    int64 expireDate = 14;
    float openPrice = 15;
    float previousClose = 16;
    float bid = 17;
    int64 bidSize = 18;
    float ask = 19;
    int64 askSize = 20;
}
`;

async function runTest() {
    const root = await protobuf.parse(protoDefinition).root;
    const PricingData = root.lookupType("PricingData");

    console.log('Connecting to Yahoo Finance Stream...');
    const ws = new WebSocket('wss://streamer.finance.yahoo.com/?version=2');

    ws.on('open', () => {
        console.log('Connected!');
        const symbols = ['RELIANCE.NS', 'TCS.NS', 'BTC-USD'];
        console.log('Subscribing to:', symbols);
        ws.send(JSON.stringify({ subscribe: symbols }));
    });

    ws.on('message', (data) => {
        try {
            // Check if data is already a Buffer or a Base64 string
            let buffer;
            if (Buffer.isBuffer(data)) {
                buffer = data;
            } else if (typeof data === 'string') {
                buffer = Buffer.from(data, 'base64');
            } else {
                console.log('Unknown data type:', typeof data);
                return;
            }

            const decoded = PricingData.decode(buffer);
            const message = PricingData.toObject(decoded, { longs: Number });
            console.log(`[TICK] ${message.id}: ${message.price} (${message.changePercent}%)`);
        } catch (err) {
            console.error('Decode error:', err.message);
            console.log('Raw data sample:', data.toString().substring(0, 50));
        }
    });

    ws.on('error', (err) => console.error('WS Error:', err));
    ws.on('close', () => console.log('Disconnected'));

    // Run for 30 seconds
    setTimeout(() => {
        console.log('Test completed.');
        ws.close();
        process.exit(0);
    }, 30000);
}

runTest();
