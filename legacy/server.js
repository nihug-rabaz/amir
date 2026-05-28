import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.dirname(url.fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

class StaticServer {
  constructor(root, port) {
    this.root = root;
    this.port = port;
  }

  resolveFile(reqPath) {
    const safe = decodeURIComponent(reqPath.split('?')[0]);
    let target = path.normalize(path.join(this.root, safe));
    if (!target.startsWith(this.root)) target = this.root;
    if (safe === '/' || safe === '') target = path.join(this.root, 'index.html');
    return target;
  }

  serve(req, res) {
    let file = this.resolveFile(req.url);
    fs.stat(file, (err, stat) => {
      if (err || stat.isDirectory()) {
        const fallback = path.join(this.root, 'index.html');
        fs.readFile(fallback, (e, data) => {
          if (e) { res.writeHead(404); res.end('Not Found'); return; }
          res.writeHead(200, { 'Content-Type': MIME['.html'] });
          res.end(data);
        });
        return;
      }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      fs.createReadStream(file).pipe(res);
    });
  }

  start() {
    http.createServer((req, res) => this.serve(req, res)).listen(this.port, () => {
      console.log(`AMIR 2.0 running at http://localhost:${this.port}`);
    });
  }
}

new StaticServer(ROOT, PORT).start();
