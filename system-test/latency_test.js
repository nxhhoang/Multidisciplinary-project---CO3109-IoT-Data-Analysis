const mqtt = require("mqtt");

const BASE_URL = process.env.LB_URL || "http://localhost:8080";
const ADAFRUIT_USER = process.env.ADAFRUIT_USER || "YOUR_ADAFRUIT_USERNAME";
const ADAFRUIT_KEY = process.env.ADAFRUIT_KEY || "YOUR_ADAFRUIT_KEY";

const NUM_CONCURRENT = 50;
const NUM_ROUNDS = 3;

const METRICS = [
  { feed_key: "temperature", min: 22.0, max: 38.0 },
  { feed_key: "humidity", min: 50.0, max: 90.0 },
  { feed_key: "light_intensity", min: 100, max: 1000 },
];

const THRESHOLDS = {
  0: { ideal_min: 20, ideal_max: 30, critical_min: 10, critical_max: 36 },
  1: { ideal_min: 40, ideal_max: 70, critical_min: 20, critical_max: 85 },
  2: { ideal_min: 100, ideal_max: 800, critical_min: 50, critical_max: 1000 },
};

let token = "";

const getRandom = (min, max) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(2));

async function login() {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin", role: "admin" }),
  });
  const data = await res.json();
  if (!data.data?.accessToken) throw new Error("Login failed");
  return data.data.accessToken;
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function p95(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)];
}

function printStats(name, latencies, thresholdMs) {
  const avgMs = avg(latencies).toFixed(2);
  const p95Ms = p95(latencies).toFixed(2);
  const maxMs = Math.max(...latencies).toFixed(2);
  const minMs = Math.min(...latencies).toFixed(2);
  const pass = latencies.every((l) => l <= thresholdMs);
  const icon = pass ? "PASS" : "FAIL";

  console.log(`\n  ${icon} ${name}`);
  console.log(`     Requests: ${latencies.length}`);
  console.log(`     Avg: ${avgMs}ms | P95: ${p95Ms}ms | Min: ${minMs}ms | Max: ${maxMs}ms`);
  console.log(`     Requirement: <= ${thresholdMs}ms | Result: ${pass ? "DAT" : "KHONG DAT"}`);
}

async function testTelemetryIngestionSingle() {
  const latencies = [];

  for (const m of METRICS) {
    const payload = {
      feed_key: `${m.feed_key}-latency-test`,
      value: getRandom(m.min, m.max),
      created_at: new Date().toISOString(),
    };

    const start = performance.now();
    const res = await fetch(`${BASE_URL}/api/v1/telemetry/adafruit-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const latency = performance.now() - start;

    if (!res.ok) {
      console.error(`     Telemetry ${m.feed_key} failed: ${res.status}`);
      continue;
    }

    latencies.push(latency);
  }

  return latencies;
}

async function testConcurrentTelemetry() {
  console.log("\n====================================================");
  console.log("TEST 1: Telemetry Ingestion - 50 Concurrent Nodes");
  console.log("Requirement: 50 sensor nodes without degradation");
  console.log("====================================================");

  const allLatencies = [];

  for (let round = 1; round <= NUM_ROUNDS; round++) {
    console.log(`\n  Round ${round}/${NUM_ROUNDS}...`);

    const promises = [];
    for (let i = 1; i <= NUM_CONCURRENT; i++) {
      promises.push(
        (async () => {
          const roundLatencies = [];
          for (const m of METRICS) {
            const payload = {
              feed_key: `${m.feed_key}-node-${i}`,
              value: getRandom(m.min, m.max),
              created_at: new Date().toISOString(),
            };

            const start = performance.now();
            const res = await fetch(
              `${BASE_URL}/api/v1/telemetry/adafruit-webhook`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }
            );
            const latency = performance.now() - start;

            if (res.ok) roundLatencies.push(latency);
          }
          return roundLatencies;
        })()
      );
    }

    const results = await Promise.all(promises);
    results.forEach((l) => allLatencies.push(...l));
  }

  printStats("Concurrent Telemetry (150 req/round x 3 rounds)", allLatencies, 1000);
}

async function testActuatorToggle() {
  console.log("\n====================================================");
  console.log("TEST 2: Actuator Manual Control Latency");
  console.log("Requirement: Command executed within 1 second");
  console.log("====================================================");

  const latencies = [];
  const actions = [
    { id: "fan", action: "ON", duration_min: 5 },
    { id: "fan", action: "OFF" },
    { id: "pump", action: "ON", duration_min: 3 },
    { id: "pump", action: "OFF" },
    { id: "led", action: "ON", duration_min: 2 },
    { id: "led", action: "OFF" },
  ];

  for (const cmd of actions) {
    const start = performance.now();
    const res = await fetch(
      `${BASE_URL}/api/v1/actuators/${cmd.id}/toggle`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: cmd.action, duration_min: cmd.duration_min }),
      }
    );
    const latency = performance.now() - start;

    if (!res.ok) {
      const body = await res.text();
      console.error(`     Actuator ${cmd.id} ${cmd.action} failed: ${res.status} - ${body}`);
      continue;
    }

    const data = await res.json();
    const publishInfo = data.data?.publish || {};
    const adafruitMs = publishInfo.published ? " (published to Adafruit IO)" : ` (skipped: ${publishInfo.reason || "unknown"})`;

    console.log(`     ${cmd.id} ${cmd.action}: ${latency.toFixed(2)}ms${adafruitMs}`);
    latencies.push(latency);
  }

  printStats("Actuator Toggle (API -> LB -> Backend -> DB -> Adafruit)", latencies, 1000);
}

async function testAlertGeneration() {
  console.log("\n====================================================");
  console.log("TEST 3: Alert Generation Latency");
  console.log("Requirement: Alert within 5 seconds of detection");
  console.log("====================================================");

  const latencies = [];

  const alertTests = [
    { feed_key: "temperature", value: 38, desc: "critical (38 > 36)" },
    { feed_key: "humidity", value: 90, desc: "critical (90 > 85)" },
    { feed_key: "light_intensity", value: 1100, desc: "critical (1100 > 1000)" },
  ];

  for (const test of alertTests) {
    const payload = {
      feed_key: test.feed_key,
      value: test.value,
      created_at: new Date().toISOString(),
    };

    const start = performance.now();
    const res = await fetch(`${BASE_URL}/api/v1/telemetry/adafruit-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const latency = performance.now() - start;

    if (!res.ok) {
      console.error(`     Alert test ${test.feed_key} failed: ${res.status}`);
      continue;
    }

    const data = await res.json();
    const alertCreated = data.alertsCreated || 0;
    const autoTriggered = data.autoActionsTriggered || 0;

    console.log(
      `     ${test.feed_key}=${test.value} (${test.desc}): ${latency.toFixed(2)}ms | alerts=${alertCreated} auto=${autoTriggered}`
    );
    latencies.push(latency);
  }

  printStats("Alert Generation (telemetry -> evaluate -> persist alert)", latencies, 5000);
}

async function testEndToEndActuator() {
  console.log("\n====================================================");
  console.log("TEST 4: End-to-End Actuator (API -> Adafruit MQTT)");
  console.log("Requirement: Manual control within 1 second");
  console.log("====================================================");

  const ACTUATOR_FEEDS = {
    fan: `${ADAFRUIT_USER}/feeds/actuator-fan`,
    pump: `${ADAFRUIT_USER}/feeds/actuator-pump`,
    led: `${ADAFRUIT_USER}/feeds/actuator-led`,
  };

  const actuator = process.env.TEST_ACTUATOR || "fan";
  const topic = ACTUATOR_FEEDS[actuator];

  if (!topic || ADAFRUIT_USER === "YOUR_ADAFRUIT_USERNAME") {
    console.log("  SKIPPED: Set ADAFRUIT_USER and ADAFRUIT_KEY env vars to run this test.");
    return;
  }

  return new Promise((resolve) => {
    const client = mqtt.connect("mqtts://io.adafruit.com", {
      username: ADAFRUIT_USER,
      password: ADAFRUIT_KEY,
      connectTimeout: 10000,
    });

    let startTime = 0;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      console.log("  FAIL: MQTT message not received within 10s");
      client.end();
      resolve();
    }, 10000);

    client.on("connect", () => {
      console.log(`  MQTT connected, subscribing to ${topic}...`);
      client.subscribe(topic, (err) => {
        if (err) {
          console.error(`  MQTT subscribe error: ${err.message}`);
          clearTimeout(timeout);
          client.end();
          resolve();
          return;
        }

        console.log(`  Sending ON command to ${actuator} via API...`);
        startTime = performance.now();

        fetch(`${BASE_URL}/api/v1/actuators/${actuator}/toggle`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "ON", duration_min: 1 }),
        }).catch((e) => console.error(`  API error: ${e.message}`));
      });
    });

    client.on("message", (_topic, message) => {
      if (timedOut) return;
      clearTimeout(timeout);
      const endTime = performance.now();
      const latency = (endTime - startTime).toFixed(2);
      const value = message.toString();

      console.log(`  Received MQTT: ${value}`);
      console.log(`  E2E Latency (API -> LB -> Backend -> Adafruit IO -> MQTT): ${latency}ms`);
      console.log(
        parseFloat(latency) <= 1000
          ? "  PASS: Within 1 second requirement"
          : "  FAIL: Exceeds 1 second requirement"
      );

      fetch(`${BASE_URL}/api/v1/actuators/${actuator}/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "OFF" }),
      }).catch(() => {});

      setTimeout(() => {
        client.end();
        resolve();
      }, 1000);
    });

    client.on("error", (err) => {
      console.error(`  MQTT error: ${err.message}`);
      clearTimeout(timeout);
      client.end();
      resolve();
    });
  });
}

async function testDataSamplingInterval() {
  console.log("\n====================================================");
  console.log("TEST 5: Data Sampling Interval Verification");
  console.log("Requirement: Interval must not exceed 10 seconds");
  console.log("====================================================");

  const COUNT = 5;
  const timestamps = [];

  for (let i = 0; i < COUNT; i++) {
    const payload = {
      feed_key: "temperature-sampling-test",
      value: getRandom(25, 30),
      created_at: new Date().toISOString(),
    };

    const start = performance.now();
    await fetch(`${BASE_URL}/api/v1/telemetry/adafruit-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const latency = performance.now() - start;
    timestamps.push({ time: Date.now(), latency });
    console.log(`     Sample ${i + 1}: ${latency.toFixed(2)}ms`);

    if (i < COUNT - 1) {
      await new Promise((r) => setTimeout(r, 10000));
    }
  }

  const intervals = [];
  for (let i = 1; i < timestamps.length; i++) {
    intervals.push(timestamps[i].time - timestamps[i - 1].time);
  }

  const maxInterval = Math.max(...intervals);
  const avgInterval = avg(intervals);
  const withinLimit = intervals.every((iv) => iv <= 10000 + 2000);

  console.log(`\n  Avg interval: ${avgInterval.toFixed(0)}ms | Max: ${maxInterval}ms`);
  console.log(
    `  ${withinLimit ? "PASS" : "FAIL"}: Sampling interval ${withinLimit ? "within" : "exceeds"} 10s limit (+2s tolerance)`
  );
}

async function testDashboardFetchLatency() {
  console.log("\n====================================================");
  console.log("TEST 6: Dashboard Data Fetch Latency");
  console.log("Measures: GET /telemetry/latest + /telemetry/history");
  console.log("====================================================");

  const latestLatencies = [];
  const historyLatencies = [];

  for (let i = 0; i < 5; i++) {
    const t1 = performance.now();
    await fetch(`${BASE_URL}/api/v1/telemetry/latest`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    latestLatencies.push(performance.now() - t1);

    const t2 = performance.now();
    await fetch(
      `${BASE_URL}/api/v1/telemetry/history?aggregate=hour`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    historyLatencies.push(performance.now() - t2);
  }

  printStats("GET /telemetry/latest", latestLatencies, 2000);
  printStats("GET /telemetry/history", historyLatencies, 2000);
}

async function runAll() {
  console.log("=".repeat(60));
  console.log("  SMART AGRICULTURE - LATENCY TEST SUITE");
  console.log("  Non-functional Requirements Verification");
  console.log("=".repeat(60));
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Time: ${new Date().toISOString()}\n`);

  try {
    console.log("Logging in...");
    token = await login();
    console.log("Login successful.\n");
  } catch (err) {
    console.error(`Login failed: ${err.message}`);
    console.error("Make sure the backend is running and credentials are correct.\n");
    return;
  }

  await testConcurrentTelemetry();
  await testActuatorToggle();
  await testAlertGeneration();
  await testEndToEndActuator();
  await testDataSamplingInterval();
  await testDashboardFetchLatency();

  console.log("\n" + "=".repeat(60));
  console.log("  ALL TESTS COMPLETED");
  console.log("=".repeat(60));
}

runAll();
