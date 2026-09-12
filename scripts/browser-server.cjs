'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.webp':'image/webp', '.svg':'image/svg+xml'};

module.exports = () => http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const filename = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if(!filename.startsWith(root + path.sep)){
    response.writeHead(403).end();
    return;
  }
  fs.readFile(filename, (error, data) => {
    if(error){ response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
    response.end(data);
  });
});
