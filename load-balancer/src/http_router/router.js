const fs = require('fs');
const path = require('path');
const http = require('http');

const configPath = path.join(__dirname, '../../config/upstream.conf');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const backends = config.backends;
const PORT = config.http_port;
let idx = 0;


const startRouter = () => {
    const server = http.createServer((req, res) => {
        let target = backends[idx];
        idx = (idx + 1) % backends.length;

        const options = {
            hostname: target.host, 
            port: target.port,
            path: req.url,
            method: req.method,
            headers: req.headers
        };

        console.log(`Đang điều hướng tới: http://${options.hostname}:${options.port}${options.path}`);

        const proxyReq = http.request(options, (proxyRes) => {
            const { statusCode, headers } = proxyRes;
            
            res.writeHead(statusCode, headers);
            proxyRes.pipe(res); 
        });

        proxyReq.on('error', (err) => {
            console.error(`Lỗi kết nối tới Backend ${target.port}:`, err.message);
            res.statusCode = 502;
            res.end('Bad Gateway: Backend không phản hồi');
        });

        req.pipe(proxyReq);
    });

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Load Balancer đang chạy tại http://localhost:${PORT}/`);
    });
}

module.exports = {startRouter};