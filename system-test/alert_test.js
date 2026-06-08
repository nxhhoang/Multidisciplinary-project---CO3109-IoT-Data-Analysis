const TARGET_URL = "http://localhost:3000/api/v1/telemetry/adafruit-webhook";

const ALERT_TESTS = [
    { feed_key: "temperature", value: 32, expected: "warning", reason: "trên ideal_max (30)" },
    { feed_key: "temperature", value: 38, expected: "critical", reason: "trên critical_max (36)" },
    { feed_key: "temperature", value: 18, expected: "warning", reason: "dưới ideal_min (20)" },
    { feed_key: "temperature", value: 8, expected: "critical", reason: "dưới critical_min (10)" },
    { feed_key: "humidity", value: 75, expected: "warning", reason: "trên ideal_max (70)" },
    { feed_key: "humidity", value: 90, expected: "critical", reason: "trên critical_max (85)" },
    { feed_key: "humidity", value: 35, expected: "warning", reason: "dưới ideal_min (40)" },
    { feed_key: "humidity", value: 15, expected: "critical", reason: "dưới critical_min (20)" },
    { feed_key: "light_intensity", value: 900, expected: "warning", reason: "trên ideal_max (800)" },
    { feed_key: "light_intensity", value: 1100, expected: "critical", reason: "trên critical_max (1000)" },
    { feed_key: "light_intensity", value: 80, expected: "warning", reason: "dưới ideal_min (100)" },
    { feed_key: "light_intensity", value: 30, expected: "critical", reason: "dưới critical_min (50)" },
];

const sendTest = async (test, index) => {
    const payload = {
        feed_key: test.feed_key,
        value: test.value,
        created_at: new Date().toISOString(),
    };

    const start = performance.now();
    try {
        const response = await fetch(TARGET_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const latency = (performance.now() - start).toFixed(2);
        const data = await response.json();

        const status = response.ok ? "OK" : `Lỗi ${response.status}`;
        const alertInfo = data.alertsCreated > 0
            ? `alert=${data.alertsCreated}`
            : "no alert";
        const autoInfo = data.autoActionsTriggered > 0
            ? `auto=${data.autoActionsTriggered}`
            : "";

        console.log(
            `[Test ${String(index).padStart(2, "0")}] ${status} | ` +
            `${test.feed_key}=${test.value} (${test.expected} - ${test.reason}) | ` +
            `${alertInfo} ${autoInfo} | ${latency}ms`
        );
    } catch (error) {
        const latency = (performance.now() - start).toFixed(2);
        console.error(
            `[Test ${String(index).padStart(2, "0")}] Lỗi kết nối: ${error.message} | ${latency}ms`
        );
    }
};

const runAll = async () => {
    console.log(`Chạy ${ALERT_TESTS.length} test cảnh báo tới ${TARGET_URL}...\n`);

    for (let i = 0; i < ALERT_TESTS.length; i++) {
        await sendTest(ALERT_TESTS[i], i + 1);
    }

    console.log("\nHoàn thành tất cả test cảnh báo.");
};

runAll();
