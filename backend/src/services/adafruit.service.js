const ACTUATOR_FEED_KEYS = {
  pump: "motor",
  fan: "fan",
  led: "led",
};

function toFeedValue(status) {
  return String(status || "OFF").toUpperCase() === "ON" ? "1" : "0";
}

function buildAuthHeaders() {
  const key = process.env.KEY_ADA;
  if (key) {
    return {
      "X-AIO-Key": key,
    };
  }

  const username = process.env.USER_ADA;
  const password = process.env.PASS_ADA;
  if (username && password) {
    return {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
    };
  }

  return null;
}

async function publishActuatorCommand(actuatorType, status) {
  const normalizedType = String(actuatorType || "")
    .trim()
    .toLowerCase();
  const feedKey = ACTUATOR_FEED_KEYS[normalizedType];
  const username = process.env.USER_ADA;
  const authHeaders = buildAuthHeaders();

  if (!feedKey) {
    return {
      published: false,
      skipped: true,
      reason: `No Adafruit feed mapping for actuator type: ${actuatorType}`,
    };
  }

  if (!username || !authHeaders) {
    return {
      published: false,
      skipped: true,
      reason:
        "Missing USER_ADA and/or KEY_ADA (or USER_ADA/PASS_ADA) in environment",
    };
  }

  const value = toFeedValue(status);
  const url = `https://io.adafruit.com/api/v2/${encodeURIComponent(username)}/feeds/${encodeURIComponent(feedKey)}/data`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ value }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Failed to publish actuator command (${response.status}): ${detail || "unknown error"}`,
    );
  }

  return {
    published: true,
    feedKey,
    value,
  };
}

module.exports = {
  ACTUATOR_FEED_KEYS,
  publishActuatorCommand,
};
