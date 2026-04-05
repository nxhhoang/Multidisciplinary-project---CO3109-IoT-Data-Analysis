const fs = require('fs')
const path = require('path')
const configPath = path.join(__dirname, '../../config/upstream.conf');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
let backends = config.backends;
const PORT = config.http_port;
let idx = 0;

const http = require('http')

const server = http.createServer((req, res) => {
    let target = backends[idx]
    idx = (idx + 1) % backends.length

    const options = {
        hostname: target.hostname,
        port: target.port,
        path: req.url,
        method: req.method,
        headers: req.headers
    }

    console.log(options)

    const proxyReq = http.request(options, (proxyRes) => {
        const {statusCode, headers} = proxyReq
        res.writeHead(statusCode, headers)
        proxyRes.pipe(res, {end: true})
    })

    proxyReq.on('error', (err) => {
        res.statusCode = 502;
        res.end('Bad Gateway')
    })

    req.pipe(proxyReq, {end: true})
})

server.listen(PORT, 'localhost', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
