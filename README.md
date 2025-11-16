# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Running with Docker (dev)

This project includes a small Bun server that serves a landing page with QR codes (`server.bun.ts`) and an Expo dev server (Metro). The Docker setup runs both services in one container for local development. The Bun server listens on port 8081 and the Expo dev server (Metro) runs on port 8082.

Recommended ways to run locally with Docker:

- Windows (PowerShell helper):

```powershell
.\start-dev.ps1
```

If PowerShell blocks running scripts you have three safe options:

1) Run the existing PowerShell helper with a temporary bypass (no permanent policy change):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-dev.ps1
```

2) Use the bundled Windows batch wrapper (no PowerShell policy changes required):

```powershell
.\start-dev.bat
```

3) If you'd rather allow scripts permanently for your user account (less recommended), run PowerShell as Administrator and execute:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

The batch wrapper (`start-dev.bat`) calls PowerShell internally to detect your LAN IP and then runs `docker-compose up --build` with `HOST_IP` set, so you don't need to change the system execution policy.

- macOS / Linux (shell helper):

```bash
./start-dev.sh
```

What these helpers do:
- Detect your host machine's LAN IP (e.g. `192.168.8.180`) and set `HOST_IP` before running `docker-compose up --build`.
- `HOST_IP` is passed into the container and used for two things:
   - `REACT_NATIVE_PACKAGER_HOSTNAME` — tells Metro/Expo which host/IP to advertise (so the packager QR and Metro URL point to your LAN IP)
   - `SERVER_IP` — used by `server.bun.ts` so the QR codes on the landing page point to the same LAN IP.

Manual option (no helper):

Create a `.env` file with your host IP:

```
HOST_IP=192.168.8.180
```

Then run:

```bash
docker-compose up --build
```

Verify:

- Open `http://localhost:8081` in your browser — you should see the Bun landing page with two QR codes.
- The Web QR should point to `http://<HOST_IP>:8082` and the Expo QR should be an `exp://` URL targeting `<HOST_IP>:8082`.

If you prefer to run without Docker for quick iteration, run the following in two terminals:

```bash
# Terminal A: start Expo (Metro) on port 8082 in LAN mode
bun run start -- --host lan

# Terminal B: start the Bun QR server
bun run server.bun.ts
```

Troubleshooting:
- If QR codes show `host.docker.internal` instead of your LAN IP, set `HOST_IP` manually as shown above.
- If devices can't connect, confirm phone/computer are on same Wi‑Fi network and any firewall is allowing the ports.
