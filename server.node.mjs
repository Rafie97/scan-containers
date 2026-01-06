// server.node.mjs
// Server to serve the exported app bundle, display QR codes, and provide API endpoints

import fs from 'fs/promises';
import http from 'http';
import os from 'os';
import path from 'path';
import pg from 'pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Node.js server listens on this port
const NODE_PORT = 8081;
// The Expo / app dev server (Metro/Expo) will run on this port
const APP_PORT = Number(process.env.APP_PORT) || 8082;

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_PATH = path.join(__dirname, 'dist');

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'myuser',
  password: process.env.DATABASE_PASSWORD || 'mypassword',
  database: process.env.DATABASE_NAME || 'mydatabase',
  port: 5432,
});

// Initialize database on startup
async function initializeDatabase() {
  try {
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('⚠️  Database initialization error:', error.message);
  }
}

/**
 * Gets the server's local IPv4 address.
 */
const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const ifaceGroup = interfaces[name];
    if (!ifaceGroup) continue;
    for (const iface of ifaceGroup) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.')) {
          return iface.address;
        }
      }
    }
  }
  for (const name of Object.keys(interfaces)) {
    const ifaceGroup = interfaces[name];
    if (!ifaceGroup) continue;
    for (const iface of ifaceGroup) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

const SERVER_IP = process.env.SERVER_IP || getLocalIpAddress();
const ADVERTISED_HOST = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || SERVER_IP;

if (ADVERTISED_HOST === 'host.docker.internal' && os.platform() === 'linux') {
  console.warn(`
    ========================================================================
    WARNING: Server is configured to use 'host.docker.internal', but this
    may not work on standard Linux Docker setups.

    Please use './start-dev.sh' or set HOST_IP environment variable.
    ========================================================================
  `);
}

console.log(`=========== Detected server IP address: ${SERVER_IP}`);

const WEB_URL = `http://${ADVERTISED_HOST}:${APP_PORT}`;

console.log(`🚀 Node.js server will listen on http://${SERVER_IP}:${NODE_PORT}`);
console.log(`🌐 App / Expo dev server expected at ${WEB_URL}`);
console.log(`📂 Serving static files from: ${DIST_PATH}`);

// Helper to parse JSON body
async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Helper to send JSON response
function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

// Helper to send error response
function sendError(res, message, status = 500) {
  sendJson(res, { error: message }, status);
}

// Generate session token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Auth middleware helper - validates session token
async function validateSession(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  const result = await pool.query(`
    SELECT u.id, u.email, u.name, u.role
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = $1 AND s.expires_at > NOW()
  `, [token]);
  return result.rows[0] || null;
}

// Require auth middleware
async function requireAuth(req, res, requiredRole = null) {
  const user = await validateSession(req);
  if (!user) {
    sendError(res, 'Unauthorized', 401);
    return null;
  }
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    sendError(res, 'Forbidden', 403);
    return null;
  }
  return user;
}

// API Routes
const apiRoutes = {
  // ============ SETUP ROUTES ============

  // GET /api/setup/status - Check if setup is needed
  'GET /api/setup/status': async (req, res) => {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    const needsSetup = parseInt(result.rows[0].count) === 0;
    sendJson(res, { needsSetup });
  },

  // POST /api/setup/init - Create initial admin (only if no users exist)
  'POST /api/setup/init': async (req, res) => {
    // Check if any users exist
    const countResult = await pool.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(countResult.rows[0].count) > 0) {
      return sendError(res, 'Setup already completed', 400);
    }

    const body = await parseJsonBody(req);
    const { username, password } = body;

    if (!username || !password) {
      return sendError(res, 'Username and password required', 400);
    }

    if (password.length < 6) {
      return sendError(res, 'Password must be at least 6 characters', 400);
    }

    // Create admin user
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(`
      INSERT INTO users (name, password_hash, role)
      VALUES ($1, $2, 'admin')
      RETURNING id, name, role
    `, [username, passwordHash]);

    // Create session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `, [result.rows[0].id, token, expiresAt]);

    sendJson(res, { user: result.rows[0], token }, 201);
  },

  // ============ AUTH ROUTES ============

  // POST /api/auth/register - Register new user
  'POST /api/auth/register': async (req, res) => {
    const body = await parseJsonBody(req);
    const { email, password, name } = body;

    if (!email || !password) {
      return sendError(res, 'Email and password required', 400);
    }

    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return sendError(res, 'Email already registered', 409);
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES ($1, $2, $3, 'user')
      RETURNING id, email, name, role
    `, [email, passwordHash, name || email.split('@')[0]]);

    // Create session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await pool.query(`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `, [result.rows[0].id, token, expiresAt]);

    sendJson(res, { user: result.rows[0], token }, 201);
  },

  // POST /api/auth/login - Login user
  'POST /api/auth/login': async (req, res) => {
    const body = await parseJsonBody(req);
    const { username, password } = body;

    if (!username || !password) {
      return sendError(res, 'Username and password required', 400);
    }

    const result = await pool.query(`
      SELECT id, name, role, password_hash
      FROM users WHERE name = $1
    `, [username]);

    if (result.rows.length === 0) {
      return sendError(res, 'Invalid credentials', 401);
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return sendError(res, 'Invalid credentials', 401);
    }

    // Create session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `, [user.id, token, expiresAt]);

    delete user.password_hash;
    sendJson(res, { user, token });
  },

  // POST /api/auth/logout - Logout user
  'POST /api/auth/logout': async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    }
    sendJson(res, { success: true });
  },

  // GET /api/auth/me - Get current user
  'GET /api/auth/me': async (req, res) => {
    const user = await validateSession(req);
    if (!user) {
      return sendError(res, 'Unauthorized', 401);
    }
    sendJson(res, { user });
  },

  // ============ ADMIN ROUTES ============

  // POST /api/admin/items - Create item (admin only)
  'POST /api/admin/items': async (req, res) => {
    const user = await requireAuth(req, res, 'admin');
    if (!user) return;

    const body = await parseJsonBody(req);
    const { barcode, name, category, imageLink, price, promo, stock } = body;

    const result = await pool.query(`
      INSERT INTO items (barcode, name, category, image_link, price, promo, stock)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, barcode, name, category, image_link as "imageLink", price, promo, stock
    `, [barcode, name, category, imageLink, price || 0, promo || false, stock || 0]);

    sendJson(res, result.rows[0], 201);
  },

  // PATCH /api/admin/items/:id - Update item (admin only)
  'PATCH /api/admin/items/:id': async (req, res, params) => {
    const user = await requireAuth(req, res, 'admin');
    if (!user) return;

    const body = await parseJsonBody(req);
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['barcode', 'name', 'category', 'image_link', 'price', 'promo', 'stock', 'location_id'];
    const fieldMapping = { imageLink: 'image_link', locationId: 'location_id' };

    for (const [key, value] of Object.entries(body)) {
      const dbField = fieldMapping[key] || key;
      if (allowedFields.includes(dbField)) {
        updates.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return sendError(res, 'No valid fields to update', 400);
    }

    values.push(params.id);
    const result = await pool.query(`
      UPDATE items SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING id, barcode, name, category, image_link as "imageLink", price, promo, stock
    `, values);

    if (result.rows.length === 0) {
      return sendError(res, 'Item not found', 404);
    }
    sendJson(res, result.rows[0]);
  },

  // DELETE /api/admin/items/:id - Delete item (admin only)
  'DELETE /api/admin/items/:id': async (req, res, params) => {
    const user = await requireAuth(req, res, 'admin');
    if (!user) return;

    const result = await pool.query('DELETE FROM items WHERE id = $1 RETURNING id', [params.id]);
    if (result.rows.length === 0) {
      return sendError(res, 'Item not found', 404);
    }
    sendJson(res, { success: true });
  },

  // PATCH /api/admin/items/:id/promo - Toggle promo status (admin only)
  'PATCH /api/admin/items/:id/promo': async (req, res, params) => {
    const user = await requireAuth(req, res, 'admin');
    if (!user) return;

    const body = await parseJsonBody(req);
    const result = await pool.query(`
      UPDATE items SET promo = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, barcode, name, price, promo
    `, [body.promo, params.id]);

    if (result.rows.length === 0) {
      return sendError(res, 'Item not found', 404);
    }
    sendJson(res, result.rows[0]);
  },

  // GET /api/admin/users - List all users (admin only)
  'GET /api/admin/users': async (req, res) => {
    const user = await requireAuth(req, res, 'admin');
    if (!user) return;

    const result = await pool.query(`
      SELECT id, email, name, role, created_at
      FROM users ORDER BY created_at DESC
    `);
    sendJson(res, result.rows);
  },

  // PATCH /api/admin/users/:id/role - Update user role (admin only)
  'PATCH /api/admin/users/:id/role': async (req, res, params) => {
    const user = await requireAuth(req, res, 'admin');
    if (!user) return;

    const body = await parseJsonBody(req);
    if (!['user', 'admin', 'manager'].includes(body.role)) {
      return sendError(res, 'Invalid role', 400);
    }

    const result = await pool.query(`
      UPDATE users SET role = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, email, name, role
    `, [body.role, params.id]);

    if (result.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }
    sendJson(res, result.rows[0]);
  },

  // GET /api/admin/credentials - Get database credentials (admin only)
  // Used by admin dashboard to display/download backup credentials
  'GET /api/admin/credentials': async (req, res) => {
    const user = await requireAuth(req, res, 'admin');
    if (!user) return;

    // Return non-sensitive connection info for backup purposes
    // Password is masked - full credentials are in the .env file on host
    const credentials = {
      database: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: 5432,
        user: process.env.DATABASE_USER || 'scanapp',
        name: process.env.DATABASE_NAME || 'scanapp_db',
        // Show masked password hint - full password is in .env file
        passwordHint: (process.env.DATABASE_PASSWORD || '').substring(0, 4) + '****',
      },
      note: 'Full credentials are stored in the .env file on your server. Keep that file backed up securely.',
      createdAt: new Date().toISOString(),
    };

    sendJson(res, credentials);
  },

  // PUT /api/admin/map - Save store map (admin only)
  'PUT /api/admin/map': async (req, res) => {
    const user = await requireAuth(req, res, 'admin');
    if (!user) return;

    const body = await parseJsonBody(req);
    const { storeId = 'default', mapSize, aisles = [], wallCoordinates = [] } = body;

    if (!mapSize?.width || !mapSize?.height) {
      return sendError(res, 'Map size required', 400);
    }

    // Upsert the map
    const mapResult = await pool.query(`
      INSERT INTO store_maps (store_id, map_width, map_height)
      VALUES ($1, $2, $3)
      ON CONFLICT (store_id) DO UPDATE SET
        map_width = $2, map_height = $3, updated_at = NOW()
      RETURNING id
    `, [storeId, mapSize.width, mapSize.height]);

    const mapId = mapResult.rows[0].id;

    // Clear existing aisles and walls
    await pool.query(`DELETE FROM aisles WHERE store_map_id = $1`, [mapId]);
    await pool.query(`DELETE FROM wall_coordinates WHERE store_map_id = $1`, [mapId]);

    // Insert aisles
    for (const aisle of aisles) {
      await pool.query(`
        INSERT INTO aisles (store_map_id, coordinate_x, coordinate_y)
        VALUES ($1, $2, $3)
      `, [mapId, aisle.coordinate.x, aisle.coordinate.y]);
    }

    // Insert walls
    for (const wall of wallCoordinates) {
      await pool.query(`
        INSERT INTO wall_coordinates (store_map_id, start_x, start_y, end_x, end_y)
        VALUES ($1, $2, $3, $4, $5)
      `, [mapId, wall.start.x, wall.start.y, wall.end.x, wall.end.y]);
    }

    sendJson(res, { success: true, mapId });
  },

  // ============ PUBLIC ROUTES ============

  // GET /api/items - Get all items
  'GET /api/items': async (req, res) => {
    const result = await pool.query(`
      SELECT id, barcode, name, category, image_link as "imageLink",
             price, promo, stock, location_id as "locationId", is_recipe as "isRecipe"
      FROM items ORDER BY name
    `);
    sendJson(res, result.rows);
  },

  // GET /api/items/promos - Get promo items
  'GET /api/items/promos': async (req, res) => {
    const result = await pool.query(`
      SELECT id, barcode, name, category, image_link as "imageLink",
             price, promo, stock, location_id as "locationId", is_recipe as "isRecipe"
      FROM items WHERE promo = true ORDER BY name
    `);
    sendJson(res, result.rows);
  },

  // GET /api/items/barcode/:barcode - Get item by barcode
  'GET /api/items/barcode': async (req, res, params) => {
    const barcode = params.barcode;
    const result = await pool.query(`
      SELECT id, barcode, name, category, image_link as "imageLink",
             price, promo, stock, location_id as "locationId", is_recipe as "isRecipe"
      FROM items WHERE barcode = $1
    `, [barcode]);

    if (result.rows.length === 0) {
      return sendError(res, 'Item not found', 404);
    }

    // Get reviews for this item
    const reviewsResult = await pool.query(`
      SELECT id, reviewer_id as "reviewerId", reviewer_name as "reviewerName",
             review_text as "reviewText", item_id as "productId", rating,
             created_at as "createdAt", updated_at as "updatedAt"
      FROM reviews WHERE item_id = $1
    `, [result.rows[0].id]);

    // Get price history
    const priceHistoryResult = await pool.query(`
      SELECT recorded_at as timestamp, price
      FROM price_history WHERE item_id = $1 ORDER BY recorded_at DESC LIMIT 40
    `, [result.rows[0].id]);

    const item = {
      ...result.rows[0],
      reviews: reviewsResult.rows,
      priceHistory: priceHistoryResult.rows.map(r => ({
        timestamp: r.timestamp.toISOString(),
        price: parseFloat(r.price)
      }))
    };

    sendJson(res, item);
  },

  // GET /api/items/:id - Get item by ID
  'GET /api/items/:id': async (req, res, params) => {
    const result = await pool.query(`
      SELECT id, barcode, name, category, image_link as "imageLink",
             price, promo, stock, location_id as "locationId", is_recipe as "isRecipe"
      FROM items WHERE id = $1
    `, [params.id]);

    if (result.rows.length === 0) {
      return sendError(res, 'Item not found', 404);
    }
    sendJson(res, result.rows[0]);
  },

  // GET /api/users/:userId/cart - Get user's cart
  'GET /api/users/:userId/cart': async (req, res, params) => {
    const result = await pool.query(`
      SELECT i.id, i.barcode, i.name, i.category, i.image_link as "imageLink",
             i.price, i.promo, i.stock, ci.quantity
      FROM cart_items ci
      JOIN items i ON ci.item_id = i.id
      WHERE ci.user_id = $1
    `, [params.userId]);
    sendJson(res, result.rows);
  },

  // POST /api/users/:userId/cart - Add item to cart
  'POST /api/users/:userId/cart': async (req, res, params) => {
    const body = await parseJsonBody(req);
    const { itemId } = body;

    await pool.query(`
      INSERT INTO cart_items (user_id, item_id, quantity)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, item_id)
      DO UPDATE SET quantity = cart_items.quantity + 1
    `, [params.userId, itemId]);

    // Return updated cart
    const result = await pool.query(`
      SELECT i.id, i.barcode, i.name, i.category, i.image_link as "imageLink",
             i.price, i.promo, i.stock, ci.quantity
      FROM cart_items ci
      JOIN items i ON ci.item_id = i.id
      WHERE ci.user_id = $1
    `, [params.userId]);
    sendJson(res, result.rows);
  },

  // PATCH /api/users/:userId/cart/:itemId - Update cart item quantity
  'PATCH /api/users/:userId/cart/:itemId': async (req, res, params) => {
    const body = await parseJsonBody(req);
    const { quantity } = body;

    if (quantity <= 0) {
      await pool.query(`
        DELETE FROM cart_items WHERE user_id = $1 AND item_id = $2
      `, [params.userId, params.itemId]);
    } else {
      await pool.query(`
        UPDATE cart_items SET quantity = $3 WHERE user_id = $1 AND item_id = $2
      `, [params.userId, params.itemId, quantity]);
    }

    // Return updated cart
    const result = await pool.query(`
      SELECT i.id, i.barcode, i.name, i.category, i.image_link as "imageLink",
             i.price, i.promo, i.stock, ci.quantity
      FROM cart_items ci
      JOIN items i ON ci.item_id = i.id
      WHERE ci.user_id = $1
    `, [params.userId]);
    sendJson(res, result.rows);
  },

  // DELETE /api/users/:userId/cart/:itemId - Remove item from cart
  'DELETE /api/users/:userId/cart/:itemId': async (req, res, params) => {
    await pool.query(`
      DELETE FROM cart_items WHERE user_id = $1 AND item_id = $2
    `, [params.userId, params.itemId]);
    sendJson(res, { success: true });
  },

  // DELETE /api/users/:userId/cart - Clear cart
  'DELETE /api/users/:userId/cart': async (req, res, params) => {
    await pool.query(`DELETE FROM cart_items WHERE user_id = $1`, [params.userId]);
    sendJson(res, { success: true });
  },

  // GET /api/stores/:storeId/map - Get store map
  'GET /api/stores/:storeId/map': async (req, res, params) => {
    const mapResult = await pool.query(`
      SELECT id, store_id as "storeId", map_width, map_height
      FROM store_maps WHERE store_id = $1
    `, [params.storeId]);

    if (mapResult.rows.length === 0) {
      return sendJson(res, {
        id: 'default',
        storeId: params.storeId,
        aisles: [],
        mapSize: { width: 10, height: 10 },
        wallCoordinates: []
      });
    }

    const map = mapResult.rows[0];

    // Get aisles
    const aislesResult = await pool.query(`
      SELECT a.id, a.coordinate_x as x, a.coordinate_y as y,
             ARRAY_AGG(ap.item_id) as products
      FROM aisles a
      LEFT JOIN aisle_products ap ON a.id = ap.aisle_id
      WHERE a.store_map_id = $1
      GROUP BY a.id, a.coordinate_x, a.coordinate_y
    `, [map.id]);

    // Get walls
    const wallsResult = await pool.query(`
      SELECT start_x, start_y, end_x, end_y
      FROM wall_coordinates WHERE store_map_id = $1
    `, [map.id]);

    sendJson(res, {
      id: map.id,
      storeId: map.storeId,
      aisles: aislesResult.rows.map(a => ({
        id: a.id,
        coordinate: { x: a.x, y: a.y },
        products: a.products.filter(p => p != null)
      })),
      mapSize: { width: map.map_width, height: map.map_height },
      wallCoordinates: wallsResult.rows.map(w => ({
        start: { x: w.start_x, y: w.start_y },
        end: { x: w.end_x, y: w.end_y }
      }))
    });
  },
};

// Route matcher
function matchRoute(method, pathname) {
  // First check exact matches
  const exactKey = `${method} ${pathname}`;
  if (apiRoutes[exactKey]) {
    return { handler: apiRoutes[exactKey], params: {} };
  }

  // Check pattern matches
  for (const [pattern, handler] of Object.entries(apiRoutes)) {
    const [routeMethod, routePath] = pattern.split(' ');
    if (routeMethod !== method) continue;

    // Special case for barcode route
    if (routePath === '/api/items/barcode' && pathname.startsWith('/api/items/barcode/')) {
      const barcode = pathname.replace('/api/items/barcode/', '');
      return { handler, params: { barcode } };
    }

    // Convert route pattern to regex
    const paramNames = [];
    const regexPattern = routePath.replace(/:(\w+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });

    const regex = new RegExp(`^${regexPattern}$`);
    const match = pathname.match(regex);

    if (match) {
      const params = {};
      paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });
      return { handler, params };
    }
  }

  return null;
}

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  if (!req.url) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    // Handle API routes
    if (pathname.startsWith('/api/')) {
      const route = matchRoute(req.method, pathname);
      if (route) {
        await route.handler(req, res, route.params);
        return;
      }
      return sendError(res, 'Not Found', 404);
    }

    // Handle the manifest API route for expo-updates
    if (pathname === '/api/manifest') {
      const platform = req.headers['expo-platform'];
      const userAgent = req.headers['user-agent'];
      let manifestPath;

      if (userAgent?.includes('Mozilla')) {
        res.writeHead(302, { 'Location': `${WEB_URL}/index.html` });
        res.end();
        return;
      }

      if (pathname.includes('android-index.json') || platform === 'android') {
        manifestPath = path.join(DIST_PATH, 'android-index.json');
      } else if (pathname.includes('ios-index.json') || platform === 'ios') {
        manifestPath = path.join(DIST_PATH, 'ios-index.json');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Unsupported platform');
        return;
      }

      try {
        const manifestContent = await fs.readFile(manifestPath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(manifestContent);
      } catch (error) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Manifest not found');
      }
      return;
    }

    // Handle static file serving
    const filePath = path.join(DIST_PATH, pathname);
    try {
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const fileContent = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.html') contentType = 'text/html';
      else if (ext === '.js') contentType = 'application/javascript';
      else if (ext === '.css') contentType = 'text/css';
      else if (ext === '.json') contentType = 'application/json';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.svg') contentType = 'image/svg+xml';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(fileContent);
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

// Initialize database and start server
initializeDatabase().then(() => {
  server.listen(NODE_PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${NODE_PORT}`);
  });
});
