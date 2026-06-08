const TARGET_URL = "http://localhost:3000/api/v1/telemetry/adafruit-webhook";
const NUM_SENSORS = 50;
const INTERVAL_MS = 10000; 

const getRandom = (min, max) => (Math.random() * (max - min) + min).toFixed(2);

const METRICS = [
    { feed_key: "temperature", min: 22.0, max: 38.0 },
    { feed_key: "humidity", min: 50.0, max: 90.0 },
    { feed_key: "light_intensity", min: 100, max: 1000 },
];

const generatePayloads = (nodeId) => {
    return METRICS.map((m) => ({
        feed_key: `${m.feed_key}-node-${nodeId}`,
        value: parseFloat(getRandom(m.min, m.max)),
        created_at: new Date().toISOString(),
    }));
};

const sendData = async (nodeId) => {
    const payloads = generatePayloads(nodeId);
    for (const payload of payloads) {
        const start = performance.now();
        try {
            const response = await fetch(TARGET_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const latency = (performance.now() - start).toFixed(2);

            if (response.ok) {
                console.log(`[Node ${nodeId}] OK -> ${payload.feed_key}: ${payload.value} | ${latency}ms`);
            } else {
                console.error(`[Node ${nodeId}] Lỗi ${response.status}: ${payload.feed_key} | ${latency}ms`);
            }
        } catch (error) {
            const latency = (performance.now() - start).toFixed(2);
            console.error(`[Node ${nodeId}] Kết nối thất bại: ${error.message} | ${latency}ms`);
        }
    }
};

const startSimulation = () => {
    console.log(`Bắt đầu giả lập ${NUM_SENSORS} Sensors gửi dữ liệu tới ${TARGET_URL}...`);
    
    for (let i = 1; i <= NUM_SENSORS; i++) {
        const staggerDelay = Math.floor(Math.random() * 5000); 
        
        setTimeout(() => {
            sendData(i);
            
            setInterval(() => {
                sendData(i);
            }, INTERVAL_MS);
        }, staggerDelay);
    }
};

startSimulation();