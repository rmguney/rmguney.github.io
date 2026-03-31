import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { createGzip } from 'node:zlib';

const TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.ico': 'image/x-icon',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.glb': 'model/gltf-binary',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml',
    '.woff2': 'font/woff2',
    '.webmanifest': 'application/manifest+json',
};

const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.svg', '.json', '.txt', '.xml', '.webmanifest']);

export interface StaticServer {
    port: number;
    url: string;
    close: () => Promise<void>;
}

export function startStaticServer(rootDir: string): Promise<StaticServer> {
    return new Promise((resolvePromise) => {
        const server = http.createServer((req, res) => {
            const urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
            let filePath = normalize(join(rootDir, urlPath));
            if (filePath !== normalize(rootDir) && !filePath.startsWith(normalize(rootDir) + sep)) {
                res.writeHead(403);
                res.end();
                return;
            }
            if (existsSync(filePath) && statSync(filePath).isDirectory()) {
                filePath = join(filePath, 'index.html');
            }
            if (!existsSync(filePath)) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
                return;
            }
            const ext = extname(filePath).toLowerCase();
            const headers: Record<string, string | number> = {
                'Content-Type': TYPES[ext] ?? 'application/octet-stream',
                'Cache-Control': 'public, max-age=600',
            };
            const gzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding']?.toString() ?? '');
            if (gzip) {
                headers['Content-Encoding'] = 'gzip';
                headers['Vary'] = 'Accept-Encoding';
            } else {
                headers['Content-Length'] = statSync(filePath).size;
            }
            res.writeHead(200, headers);
            const stream = createReadStream(filePath);
            (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
        });
        server.listen(0, () => {
            const address = server.address();
            const port = typeof address === 'object' && address !== null ? address.port : 0;
            resolvePromise({
                port,
                url: `http://localhost:${port}/`,
                close: () => new Promise<void>((r) => {
                    server.close(() => r());
                }),
            });
        });
    });
}
