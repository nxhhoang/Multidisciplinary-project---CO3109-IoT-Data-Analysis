const mqtt = require('mqtt'); 
const http = require('http');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../../config/upstream.conf');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const host = config.adafruit_io.host;
const topics = config.adafruit_io.topics;

const startSubscriber = () => {
    const options = {
        username: config.adafruit_io.username,
        password: config.adafruit_io.key
    };

    const mqtt_client = mqtt.connect(host, options);

    mqtt_client.on('connect', () => {
        console.log('MQTT Kết nối thành công!');

        topics.forEach(topic => {
            mqtt_client.subscribe(topic, (err) => {
                if (!err) {
                    console.log(`${topic} subscribe thành công`);
                }
            });
        });
    });

    mqtt_client.on('message', (topic, message) => {
        const payload = message.toString();
        console.log(`\nNhận được từ ${topic}: ${payload}`);

        const sensorName = topic.split('.')[1];
        const jsonSensor = {
            sensor: sensorName, 
            value: payload,
            timestamp: Date.now()
        };

        const data = JSON.stringify(jsonSensor);

        const port_options = {
            host: '127.0.0.1',
            port: config.http_port,
            path: '/api/v1/internal/telemetry',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = http.request(port_options, (res) => {
            if (res.statusCode === 200 || res.statusCode === 201) {
                console.log(`[MQTT Subscriber] Đã chuyển tiếp dữ liệu ${sensorName} thành công.`);
            }
        });

        req.on('error', (e) => {
            console.error(`[MQTT Subscriber] Lỗi khi chuyển tiếp dữ liệu: ${e.message}`);
        });

        req.write(data);
        req.end();
    });
}

module.exports = {startSubscriber};