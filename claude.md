# Scan Containers - Grocery Store Shopping Assistant

A cross-platform mobile/web application that allows customers to scan product barcodes, browse inventory, manage carts, and navigate store maps. Includes a web-based admin portal for store management.

## Tech Stack

**Frontend:**
- Expo (React Native) v54 with expo-router v6 (file-based routing)
- React 19.1.0
- State management: React Context + useReducer pattern
- expo-camera for barcode scanning
- @react-native-async-storage/async-storage for local storage

**Backend:**
- Node.js HTTP server (server.node.mjs)
- PostgreSQL 14
- JWT authentication with bcrypt password hashing
- QR code generation for device connection

**DevOps:**
- Docker + docker-compose
- Expo dev server on port 8082
- Node.js API server on port 8081

## Project Structure

```
app/
├── (tabs)/                    # User-facing mobile app (tab navigation)
│   ├── _layout.tsx           # Tab navigation config (6 tabs)
│   ├── index.tsx             # Redirects to /scan
│   ├── scan.tsx              # Barcode scanner
│   ├── promo.tsx             # Promotional items
│   ├── map.tsx               # Store map navigation
│   ├── cart.tsx              # Shopping cart
│   └── account.tsx           # User profile/wishlists/receipts
├── admin/                     # Web-only admin portal
│   ├── _layout.tsx           # Admin sidebar navigation
│   ├── login.tsx             # Admin authentication
│   ├── setup.tsx             # First-time admin setup wizard
│   ├── index.tsx             # Dashboard
│   ├── inventory.tsx         # Product management
│   ├── promos.tsx            # Promotion management
│   ├── map.tsx               # Store map editor
│   ├── recipes.tsx           # Recipe management
│   ├── users.tsx             # User management
│   └── preview.tsx           # Device preview
└── _layout.tsx               # Root layout with providers

contexts/
└── AuthContext.tsx           # Authentication state (login/logout/session)

store/
├── index.tsx                 # StateProvider component
├── reducer.ts                # Cart and app state reducer
└── types.ts                  # State and action type definitions

services/
├── api.ts                    # Centralized API client (all endpoints)
└── index.ts                  # Service exports

models/
├── Item.ts, User.ts, Receipt.ts, Review.ts, Aisle.ts, etc.
└── index.ts                  # Type definitions and exports

db/
└── schema.sql                # PostgreSQL schema (14+ tables)

server.node.mjs               # Main Node.js HTTP server
docker-compose.yml            # Container orchestration
Dockerfile                    # App container definition
```

## How It Works

### User Flow
1. User opens the app and scans product barcodes with their phone camera
2. App looks up product info via API and displays details (price, reviews, location)
3. User can add items to cart, view promotions, and check store maps
4. Cart persists locally and syncs with backend when authenticated

### Admin Flow
1. First-time setup creates initial admin account via `/admin/setup`
2. Admin logs in at `/admin/login` (JWT stored in AsyncStorage)
3. Admin manages inventory, promotions, store maps, and users
4. Changes reflect immediately in the customer-facing app

### Authentication
- JWT tokens with 7-day expiration
- Roles: `admin`, `manager`, `user`
- Admin routes protected by role check in AuthContext
- Passwords hashed with bcrypt

### API Server (server.node.mjs)
- Serves QR code landing page at root (for connecting mobile devices)
- All API routes under `/api/*`
- Key endpoint groups:
  - `/api/setup/*` - Initial admin setup
  - `/api/auth/*` - Login/logout/session
  - `/api/items/*` - Product CRUD
  - `/api/cart/*` - Cart management
  - `/api/map/*` - Store layout
  - `/api/promos/*` - Promotions
  - `/api/users/*` - User management

## Running the Project

### Development (Docker)
```bash
./start-dev.sh
```
This starts:
- PostgreSQL container (port 5432)
- Node.js API server (port 8081)
- Expo dev server (port 8082)

### Production
```bash
./start.sh
```

### Manual Commands
```bash
# Install dependencies
npm install

# Start API server only
npm run server:node

# Start Expo dev server
npx expo start --port 8082
```

### First-Time Setup
1. Run the containers with `./start-dev.sh`
2. Navigate to `http://localhost:8082/admin/setup`
3. Create the initial admin account
4. Log in at `/admin/login`

## Database

PostgreSQL schema in `db/schema.sql` includes:
- `users` - User accounts with roles
- `items` - Product catalog
- `item_prices` - Price history tracking
- `promotions` - Active promos
- `carts` / `cart_items` - Shopping carts
- `receipts` / `receipt_items` - Purchase history
- `reviews` - Product reviews
- `wishlists` / `wishlist_items` - User wishlists
- `aisles` / `aisle_items` - Store layout mapping
- `recipes` / `recipe_ingredients` - Recipe management

## Current Implementation Status

### Complete
- Barcode scanner with camera integration
- Authentication system (JWT + roles)
- API server with 40+ endpoints
- Database schema with sample data
- Admin: login, setup, inventory, promos, users, map editor
- Promo page (user-facing)
- Docker containerization

### Incomplete (Placeholders)
- `cart.tsx` - Shows placeholder text only, needs cart display
- `account.tsx` - Shows placeholder text only, needs profile/wishlist/receipt UI
- `map.tsx` (user-facing) - Needs store layout display
- `recipes.tsx` (admin) - Has TODO comment, needs API integration

### Missing UI (API Exists)
- Wishlist management pages
- Receipt viewing pages
- Review display on products
- Price history visualization

## Key Files to Know

| File | Purpose |
|------|---------|
| `server.node.mjs` | All backend logic, API routes, auth |
| `services/api.ts` | Frontend API client, all endpoint calls |
| `contexts/AuthContext.tsx` | Auth state, login/logout functions |
| `store/reducer.ts` | Cart state management logic |
| `db/schema.sql` | Complete database structure |
| `app/(tabs)/_layout.tsx` | Tab navigation configuration |
| `app/admin/_layout.tsx` | Admin sidebar navigation |

## NixOS Deployment (compose.nix)

The `compose.nix` file is a NixOS module auto-generated by [compose2nix](https://github.com/aksiksi/compose2nix). It converts the docker-compose.yml into native NixOS/systemd configuration, allowing the containers to run as managed systemd services.

### What It Defines

**Docker Configuration:**
- Enables Docker with auto-pruning
- Uses Docker as the OCI container backend

**Containers:**
1. `expo-db-stack-app-server` - The app server container
   - Ports: 8081 (API), 8082 (Expo)
   - Environment: Database credentials, hostname config
   - Depends on the database container

2. `expo-db-stack-db` - PostgreSQL 14 database
   - Port: 5432
   - Health checks configured
   - Persistent volume for data

**Infrastructure:**
- `expo-db-stack_app-network` - Bridge network for container communication
- `expo-db-stack_postgres_data` - Named volume for database persistence
- Build service that builds the app-server image from the Dockerfile

### Systemd Integration

Each container becomes a systemd service:
- `docker-expo-db-stack-app-server.service`
- `docker-expo-db-stack-db.service`

Root target `docker-compose-expo-db-stack-root.target` manages all services together.

### Usage on NixOS

```nix
# In your NixOS configuration (e.g., /etc/nixos/configuration.nix)
{ config, pkgs, ... }:
{
  imports = [
    ./path/to/compose.nix
  ];
}
```

Then rebuild:
```bash
sudo nixos-rebuild switch
```

## Environment

- Node.js 20+
- PostgreSQL 14
- Expo SDK 54
- Ports: 8081 (API), 8082 (Expo), 5432 (Postgres)
