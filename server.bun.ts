// server.bun.ts
// A simple, fast server using Bun's native APIs to serve the
// exported app bundle and display a landing page with a QR code.

import type { BunFile } from 'bun';
import os, { type NetworkInterfaceInfo } from 'os';
import path from 'path';
import qrcode from 'qrcode';

const PORT: number = 8081;
// import.meta.dir is a Bun-specific variable for the current directory
const DIST_PATH: string = path.join(import.meta.dir, 'dist');

/**
 * Gets the server's local IPv4 address.
 * @returns The local IPv4 address as a string, or '0.0.0.0' as a fallback.
 */
const getLocalIpAddress = (): string => {
  const interfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const ifaceGroup = interfaces[name];
    // Type guard for potentially undefined network interface group
    if (!ifaceGroup) continue;

    for (const iface of ifaceGroup) {
      // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '0.0.0.0'; // Fallback
};

const SERVER_IP: string = getLocalIpAddress();
const MANIFEST_URL: string = `exp://${SERVER_IP}:${PORT}`;

console.log(`🚀 Server starting on http://${SERVER_IP}:${PORT}`);
console.log(`Serving static files from: ${DIST_PATH}`);

Bun.serve({
  port: PORT,
  hostname: '0.0.0.0', // Listen on all network interfaces

  async fetch(req: Request): Promise<Response> {
    const url: URL = new URL(req.url);
    const pathname: string = url.pathname;

    // 1. Handle the manifest API route for expo-updates
    if (pathname === '/api/manifest') {
      const platform: string | null = req.headers.get('expo-platform');
      let manifestPath: string;

      if (platform === 'android') {
        manifestPath = path.join(DIST_PATH, 'android-index.json');
      } else if (platform === 'ios') {
        manifestPath = path.join(DIST_PATH, 'ios-index.json');
      } else {
        return new Response('Unsupported platform', { status: 404 });
      }

      const manifestFile: BunFile = Bun.file(manifestPath);
      return new Response(manifestFile);
    }

    // 2. Handle the root path to show the QR code page
    if (pathname === '/') {
      const qrCodeDataUrl: string = await qrcode.toDataURL(MANIFEST_URL);
      const htmlContent: string = `
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Local App Server (Bun)</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f4f4f9; }
              .container { text-align: center; padding: 2rem; background-color: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
              h1 { color: #333; }
              p { color: #666; }
              img { margin-top: 1rem; border: 5px solid #fff; border-radius: 8px; }
              code { background-color: #eee; padding: 0.2em 0.4em; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Local Expo App is Running</h1>
              <p>Served with Bun!</p>
              <p>Scan this QR code with the Expo Go app or your device's camera.</p>
              <p>Your device must be on the same Wi-Fi network.</p>
              <img src="${qrCodeDataUrl}" alt="QR Code" />
              <p>Or open manually: <code>${MANIFEST_URL}</code></p>
            </div>
          </body>
        </html>
      `;
      return new Response(htmlContent, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // 3. Handle static file serving for all other requests
    const filePath: string = path.join(DIST_PATH, pathname);
    const file: BunFile = Bun.file(filePath);

    // If the requested file exists, serve it.
    if (await file.exists()) {
      return new Response(file);
    }

    // 4. Fallback to 404 if no route is matched
    return new Response('Not Found', { status: 404 });
  },

  error(error: Error): Response {
    console.error(error);
    return new Response('Internal Server Error', { status: 500 });
  }
});