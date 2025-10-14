// Simple static file server for local development
// Serves this folder on the specified port
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8000;
const root = __dirname;

const mime = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=UTF-8'
};

function send(res, status, headers, body){
  res.writeHead(status, headers);
  res.end(body);
}

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(root, urlPath.replace(/\.{2,}/g, ''));
    let stat;
    try { stat = fs.statSync(filePath); } catch (e) {}

    if (stat && stat.isDirectory()) {
      const idx = path.join(filePath, 'index.html');
      if (fs.existsSync(idx)) {
        const data = fs.readFileSync(idx);
        return send(res, 200, { 'Content-Type': mime['.html'] }, data);
      } else {
        return send(res, 403, { 'Content-Type': 'text/plain' }, 'Forbidden');
      }
    }

    if (!stat || !stat.isFile()) {
      return send(res, 404, { 'Content-Type': 'text/plain' }, 'Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = mime[ext] || 'application/octet-stream';
    const data = fs.readFileSync(filePath);
    return send(res, 200, { 'Content-Type': type }, data);
  } catch (err) {
    return send(res, 500, { 'Content-Type': 'text/plain' }, 'Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Static server listening on http://localhost:${PORT}`);
});
