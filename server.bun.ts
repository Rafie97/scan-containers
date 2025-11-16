// server.bun.ts
// A simple, fast server using Bun's native APIs to serve the
// exported app bundle and display a landing page with a QR code.

import type { BunFile } from 'bun';
import os, { type NetworkInterfaceInfo } from 'os';
import path from 'path';
import qrcode from 'qrcode';

// Bun server listens on this port
const BUN_PORT: number = 8081;
// The Expo / app dev server (Metro/Expo) will run on this port and the QR codes
// should point to this app port.
const APP_PORT: number = Number(process.env.APP_PORT) || 8082;
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
      // Skip over internal addresses and prefer 192.168.* or 10.* addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.')) {
          return iface.address;
        }
      }
    }
  }

  // Second pass for any IPv4 address if we didn't find a preferred one
  for (const name of Object.keys(interfaces)) {
    const ifaceGroup = interfaces[name];
    if (!ifaceGroup) continue;

    for (const iface of ifaceGroup) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return 'localhost'; // Fallback to localhost
};

// Allow overriding the detected IP from the environment. This is useful when
// running inside Docker where the container's IP (e.g. 172.x.x.x) is not the
// desired address to embed in QR codes. You can set either:
//  - REACT_NATIVE_PACKAGER_HOSTNAME (preferred) OR
//  - SERVER_IP
// If neither is set, we fall back to auto-detection.
const SERVER_IP: string = process.env.SERVER_IP || getLocalIpAddress();

// Prefer REACT_NATIVE_PACKAGER_HOSTNAME when present (this is what Metro/Expo
// uses to advertise the packager). Otherwise use SERVER_IP.
const ADVERTISED_HOST: string = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || SERVER_IP;

console.log(`=========== Detected server IP address: ${SERVER_IP}`);

// Define URLs for different platforms. Use APP_PORT for the app/dev server
// that Expo / browsers will connect to. The Bun server itself continues
// to listen on BUN_PORT (8081). The QR codes will point to ADVERTISED_HOST.
const WEB_URL: string = `http://${ADVERTISED_HOST}:${APP_PORT}`;
const EXPO_URL: string = `exp://${ADVERTISED_HOST}:${APP_PORT}`;

console.log(`🚀 Bun server will listen on http://${SERVER_IP}:${BUN_PORT}`);
console.log(`🌐 App / Expo dev server expected at ${WEB_URL}`);
console.log(`📂 Serving static files from: ${DIST_PATH}`);

Bun.serve({
  port: BUN_PORT,
  hostname: '0.0.0.0', // Listen on all network interfaces

  async fetch(req: Request): Promise<Response> {
    const url: URL = new URL(req.url);
    const pathname: string = url.pathname;

    // 1. Handle the manifest API route for expo-updates
    if (pathname === '/api/manifest') {
      const platform: string | null = req.headers.get('expo-platform');
      const userAgent: string | null = req.headers.get('user-agent');
      let manifestPath: string;

      // Check if this is a web request
      if (userAgent?.includes('Mozilla')) {
        // Serve web version
        return Response.redirect(`${WEB_URL}/index.html`, 302);
      }

      // For native platforms, check for EAS builds first
      if (pathname.includes('android-index.json') || platform === 'android') {
        manifestPath = path.join(DIST_PATH, 'android-index.json');
      } else if (pathname.includes('ios-index.json') || platform === 'ios') {
        manifestPath = path.join(DIST_PATH, 'ios-index.json');
      } else {
        return new Response('Unsupported platform', { status: 404 });
      }

      const manifestFile: BunFile = Bun.file(manifestPath);
      return new Response(manifestFile);
    }

    // 2. Handle the root path to show the QR code page
    if (pathname === '/') {
      const expoQRCode: string = await qrcode.toDataURL(EXPO_URL);
      const webQRCode: string = await qrcode.toDataURL(WEB_URL);
      const htmlContent: string = `
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Local App Server (Bun)</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #f4f4f9; }
              .container { text-align: center; padding: 2rem; background-color: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin: 2rem; }
              h1 { color: #333; }
              p { color: #666; }
              .qr-section { margin: 2rem 0; }
              img { margin-top: 1rem; border: 5px solid #fff; border-radius: 8px; }
              code { background-color: #eee; padding: 0.2em 0.4em; border-radius: 4px; }
              .divider { border-top: 1px solid #eee; margin: 2rem 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Local App Server</h1>
              <p>Served with Bun! 🚀</p>
              
              <div class="qr-section">
                <h2>Web Version</h2>
                <p>Scan to open in your mobile browser</p>
                <img src="${webQRCode}" alt="Web QR Code" />
                <p>Or open in browser: <code>${WEB_URL}</code></p>
              </div>

              <div class="divider"></div>

              <div class="qr-section">
                <h2>Expo Go Version</h2>
                <p>Scan with Expo Go app for development</p>
                <img src="${expoQRCode}" alt="Expo QR Code" />
                <p>Or open in Expo Go: <code>${EXPO_URL}</code></p>
              </div>
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