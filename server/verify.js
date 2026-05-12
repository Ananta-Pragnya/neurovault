import axios from 'axios';

async function waitForServer(url, retries = 10) {
    for (let i = 0; i < retries; i++) {
        try {
            await axios.get(url);
            return true;
        } catch (e) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    return false;
}

async function test() {
    const symbol = 'AAPL';
    console.log(`--- Testing Market-Intel AI Backend for ${symbol} ---`);

    const baseUrl = 'http://localhost:5000';

    console.log('Waiting for server to be ready...');
    const ready = await waitForServer(`${baseUrl}/api/health`);
    if (!ready) {
        console.error('Server failed to start in time.');
        return;
    }

    try {
        console.log('1. Requesting Price (First time)...');
        const res1 = await axios.get(`${baseUrl}/api/price/${symbol}`);
        console.log('Result:', res1.data);

        console.log('\n2. Requesting Price (Second time - should be cached)...');
        const res2 = await axios.get(`${baseUrl}/api/price/${symbol}`);
        console.log('Result:', res2.data);

        console.log('\n3. Requesting Market Intel Summary (AI-powered)...');
        const res3 = await axios.get(`${baseUrl}/api/market-intel/${symbol}`);
        console.log('Result:', res3.data);

        if (res2.data.cached === true) {
            console.log('\n✅ Caching Verification: SUCCESS');
        } else {
            console.log('\n❌ Caching Verification: FAILED');
        }

    } catch (error) {
        console.error('Test Failed:', error.response?.data || error.message);
    }
}

test();
