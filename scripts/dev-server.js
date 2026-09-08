#!/usr/bin/env node

/**
 * 本地开发服务器
 * 
 * 使用方法：
 *   node scripts/dev-server.js
 *   或
 *   npm run dev:web
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const WEB_DIR = path.join(__dirname, '..', 'src', 'web');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let filePath = path.join(WEB_DIR, req.url === '/' ? 'index.html' : req.url);
  
  // 安全检查：防止目录遍历
  if (!filePath.startsWith(WEB_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // 尝试加载 index.html（SPA 路由支持）
        fs.readFile(path.join(WEB_DIR, 'index.html'), (err2, data2) => {
          if (err2) {
            res.writeHead(404);
            res.end('Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data2);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    } else {
      // 开发环境下禁用缓存
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n  农历生日日历生成器 - 开发服务器\n`);
  console.log(`  本地访问: http://localhost:${PORT}`);
  console.log(`  按 Ctrl+C 停止服务器\n`);
});
