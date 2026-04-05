const fs = require('fs')
const config = JSON.parse(fs.readFileSync(
    'config/upstream.conf', 'utf-8'
))

console.log(config)

let host = config.backends.map((x) => String(x.host))
let port = config.backends.map((x) => String(x.port))
let backends = config.backends;
const PORT = config.http_port;

console.log(host)
console.log(port)

let idx = 0;

const http = require('http')
const url = require('url');
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true)
    const pathName = parsedUrl.pathName
    const query = parsedUrl.query;

    res.writeHead(200, {'Content-Type': 'application/json'})
    res.end(JSON.stringify({
        pathName, 
        query, 
        fullUrl: req.url,
        concu: 'concu'
    }, null, 2))

    console.log(parsedUrl)
})

server.timeout = 5000
server.maxConnections = 100
server.keepAliveTimeout = 5000

console.log(PORT)

server.listen(PORT, 'localhost', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
