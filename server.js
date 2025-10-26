// Simple static file server for local development
// Serves this folder on the specified port
const http = require('http');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

const PORT = process.env.PORT || 8000;
const root = __dirname;

// Buffer size for streaming (64KB chunks)
const BUFFER_SIZE = 64 * 1024;

// Maximum concurrent requests to prevent memory exhaustion
const MAX_CONCURRENT_REQUESTS = 100;
let activeRequests = 0;
const requestQueue = [];

// MIME types with proper encoding
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
  '.txt': 'text/plain; charset=UTF-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Buffered response sender with proper error handling
function sendBuffered(res, status, headers, body) {
  try {
    // Set buffering headers for better performance
    const responseHeaders = {
      ...headers,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Cache-Control': 'public, max-age=300', // 5 minute cache for static files
    };

    res.writeHead(status, responseHeaders);

    if (body) {
      // Buffer the response for small payloads
      if (Buffer.isBuffer(body) && body.length < BUFFER_SIZE) {
        res.end(body);
      } else {
        // Use chunked transfer for larger content
        res.write(body);
        res.end();
      }
    } else {
      res.end();
    }
  } catch (err) {
    console.error('Error sending buffered response:', err);
    try {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=UTF-8' });
      }
      res.end('Internal Server Error');
    } catch (finalErr) {
      console.error('Failed to send error response:', finalErr);
    }
  }
}

// Stream file with proper buffering and error handling
async function streamFile(res, filePath, mimeType) {
  try {
    const stat = await fs.promises.stat(filePath);

    // Set appropriate headers for streaming
    const headers = {
      'Content-Type': mimeType,
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    };

    // Handle range requests for video/audio streaming
    const range = res.req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
      headers['Content-Length'] = chunkSize;

      res.writeHead(206, headers);

      const stream = fs.createReadStream(filePath, { start, end, highWaterMark: BUFFER_SIZE });
      await pipeline(stream, res);
      return;
    }

    res.writeHead(200, headers);

    // Stream file with buffered chunks
    const stream = fs.createReadStream(filePath, { highWaterMark: BUFFER_SIZE });
    await pipeline(stream, res);

  } catch (err) {
    console.error('Error streaming file:', err);
    if (!res.headersSent) {
      sendBuffered(res, 500, { 'Content-Type': 'text/plain; charset=UTF-8' }, 'Internal Server Error');
    }
  }
}

// Request queue processor for load management
function processRequestQueue() {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) {
    return;
  }

  const { req, res, handler } = requestQueue.shift();
  activeRequests++;
  handler(req, res).finally(() => {
    activeRequests--;
    processRequestQueue();
  });
}

// Queue request if at capacity
function queueRequest(req, res, handler) {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    handler(req, res).finally(() => {
      activeRequests--;
      processRequestQueue();
    });
  } else {
    requestQueue.push({ req, res, handler });
    // Send a waiting response if queue is getting long
    if (requestQueue.length > 10) {
      sendBuffered(res, 503, { 'Content-Type': 'text/plain; charset=UTF-8' },
        'Server busy, please try again later');
      return;
    }
  }
}

const server = http.createServer((req, res) => {
  // Queue request for load management
  queueRequest(req, res, async (req, res) => {
    try {
      let urlPath = decodeURIComponent(req.url.split('?')[0]);

      // Security: prevent directory traversal
      if (urlPath.includes('..') || urlPath.includes('\\')) {
        return sendBuffered(res, 400, { 'Content-Type': 'text/plain; charset=UTF-8' }, 'Bad Request');
      }

      if (urlPath === '/') urlPath = '/index.html';

      const filePath = path.join(root, urlPath);
      let stat;

      try {
        stat = await fs.promises.stat(filePath);
      } catch (e) {
        // File not found
        return sendBuffered(res, 404, { 'Content-Type': 'text/plain; charset=UTF-8' }, 'Not Found');
      }

      if (stat.isDirectory()) {
        const idx = path.join(filePath, 'index.html');
        try {
          await fs.promises.access(idx);
          // Stream the index file
          const ext = '.html';
          const type = mime[ext] || 'application/octet-stream';
          return await streamFile(res, idx, type);
        } catch (e) {
          return sendBuffered(res, 403, { 'Content-Type': 'text/plain; charset=UTF-8' }, 'Forbidden');
        }
      }

      if (!stat.isFile()) {
        return sendBuffered(res, 404, { 'Content-Type': 'text/plain; charset=UTF-8' }, 'Not Found');
      }

      // Determine content type
      const ext = path.extname(filePath).toLowerCase();
      const type = mime[ext] || 'application/octet-stream';

      // Stream the file with proper buffering
      await streamFile(res, filePath, type);

    } catch (err) {
      console.error('Request handler error:', err);
      if (!res.headersSent) {
        sendBuffered(res, 500, { 'Content-Type': 'text/plain; charset=UTF-8' }, 'Internal Server Error');
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Buffered static server listening on http://localhost:${PORT}`);
  console.log(`📊 Buffer size: ${BUFFER_SIZE} bytes`);
  console.log(`🔄 Max concurrent requests: ${MAX_CONCURRENT_REQUESTS}`);
  console.log(`🎯 Features: streaming, range requests, request queuing, security headers`);

  // Monitor active requests
  setInterval(() => {
    if (activeRequests > 0 || requestQueue.length > 0) {
      console.log(`📈 Active: ${activeRequests}, Queued: ${requestQueue.length}`);
    }
  }, 30000); // Log every 30 seconds if there's activity
});
