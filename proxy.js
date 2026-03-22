const http = require('http');
const httpProxy = require('http-proxy');

const APP_URL = process.env.MAIN_URL || "http://localhost:3000";

const proxyOptions = {
    ws: true,
    xfwd: true,
    secure: false,
    changeOrigin: true
    // ❌ Removed cookieDomainRewrite from here — we'll handle it in proxyRes
};

const backendProxy = httpProxy.createProxyServer({ target: 'http://127.0.0.1:4000', ...proxyOptions });
const frontendProxy = httpProxy.createProxyServer({ target: 'http://127.0.0.1:4200', ...proxyOptions });

// ✨ FIX: Rewrite cookies from backend responses
function fixCookies(proxyRes, req, res) {
    const setCookie = proxyRes.headers['set-cookie'];
    if (!setCookie) return;

    proxyRes.headers['set-cookie'] = setCookie.map(cookie => {
        let fixed = cookie;

        // Remove any hardcoded domain (let browser default to request domain)
        fixed = fixed.replace(/;\s*Domain=[^;]*/gi, '');

        // Fix Path: if backend set a path, ensure it works with /api prefix
        // Replace Path=/ with Path=/ (no change needed for root)
        // But for specific paths, we need to prepend /api
        fixed = fixed.replace(/;\s*Path=\/(?!api)([^;]*)/gi, (match, subpath) => {
            // Keep Path=/ as is, but add /api version too
            return match; // Root path works for everything
        });

        // ✨ Force Secure flag (HF Spaces is HTTPS externally)
        if (!/;\s*Secure/i.test(fixed)) {
            fixed += '; Secure';
        }

        // ✨ Ensure SameSite=Lax for OAuth redirect compatibility
        if (!/;\s*SameSite/i.test(fixed)) {
            fixed += '; SameSite=Lax';
        }

        return fixed;
    });
}

backendProxy.on('proxyRes', fixCookies);
frontendProxy.on('proxyRes', fixCookies);

const errorHandler = (err, req, res) => {
    console.error('⚠️ Proxy Error:', err.message);
    if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('System loading... Please wait.');
    }
};

backendProxy.on('error', errorHandler);
frontendProxy.on('error', errorHandler);

const server = http.createServer((req, res) => {

    // --- TikTok Verification ---
    if (req.url === '/tiktokQDQMgLkzRU9aDBUTgDacXi8GWwyCR9Cn.txt') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('tiktok-developers-site-verification=QDQMgLkzRU9aDBUTgDacXi8GWwyCR9Cn');
        return;
    }

    // ✨ Force HTTPS headers for the backend
    req.headers['x-forwarded-proto'] = 'https';
    req.headers['x-forwarded-port'] = '443';

    if (req.headers.host) {
        req.headers['x-forwarded-host'] = req.headers.host;
    }

    // Route to backend
    if (req.url.startsWith('/api') || req.url.startsWith('/public') || req.url.startsWith('/webhooks') || req.url.startsWith('/v1')) {
        if (req.url.startsWith('/api')) {
            req.url = req.url.replace(/^\/api/, '') || '/';
        }
        backendProxy.web(req, res);
    } else {
        frontendProxy.web(req, res);
    }
});

// WebSocket support
server.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/socket.io')) {
        if (req.url.startsWith('/api')) req.url = req.url.replace(/^\/api/, '') || '/';
        backendProxy.ws(req, socket, head);
    } else {
        frontendProxy.ws(req, socket, head);
    }
});

server.listen(3000, () => {
    console.log('✅ Proxy V5 (OAuth-Safe) Running on Port 3000');
});

setInterval(() => {
    console.log(`\n🚀 APP READY: ${APP_URL}\n`);
}, 30000);
