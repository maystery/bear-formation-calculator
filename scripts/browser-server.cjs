'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

module.exports = () =>
  http.createServer((request, response) => {
    const requestUrl = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname === '/changelog') {
      response.writeHead(301, { Location: `/changelog/${requestUrl.search}` }).end();
      return;
    }
    const pagePath = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const filename = path.resolve(root, `.${pagePath}`);
    if (!filename.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    fs.readFile(filename, (error, data) => {
      if (error) {
        response.writeHead(404).end();
        return;
      }
      response.setHeader(
        'Content-Type',
        types[path.extname(filename)] || 'application/octet-stream',
      );
      response.end(data);
    });
  });
