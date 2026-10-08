# Campus Crowd Management and Route Optimization

A small full-stack project: React + Vite UI, with a C++ HTTP API that runs Dijkstra's algorithm using simulated crowd-adjusted walking costs.

> **Distance data is illustrative/simulated and has not been surveyed.** Treat route lengths and the 80 m/min walking-speed estimate as demo values.

## Fastest local setup (Windows PowerShell)

Install Node.js LTS, Git, CMake, a C++ compiler (Visual Studio Build Tools with **Desktop development with C++**), and vcpkg. Crow uses standalone Asio, which vcpkg supplies. In a Developer PowerShell, set up vcpkg once:

```powershell
git clone https://github.com/microsoft/vcpkg $env:USERPROFILE\vcpkg
& "$env:USERPROFILE\vcpkg\bootstrap-vcpkg.bat"
& "$env:USERPROFILE\vcpkg\vcpkg.exe" install asio
$env:VCPKG_ROOT = "$env:USERPROFILE\vcpkg"
```

Restart PowerShell after installing tools. Verify:

```powershell
node -v
npm -v
cmake --version
```

Open PowerShell in this project folder. Build and start the C++ API in terminal 1:

```powershell
cmake -S backend -B backend/build -DCMAKE_TOOLCHAIN_FILE="$env:VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake"
cmake --build backend/build --config Release
cd backend
./build/Release/campus-api.exe
```

If your generator creates the executable directly under `build`, use `./build/campus-api.exe` instead. Keep this terminal open. The API listens on `http://localhost:8080`.

Open a second PowerShell in the project folder and start the React site:

```powershell
cd frontend
npm install
npm run dev
```

Open the local address Vite prints (usually `http://localhost:5173`). Choose a source, destination, and crowd level, then click **Find best route**.

## Project layout

```text
campus-crowd-route-system/
├── backend/
│   ├── CMakeLists.txt
│   ├── Dockerfile
│   └── src/main.cpp
└── frontend/
    ├── .env.example
    ├── index.html
    ├── package.json
    └── src/{App.jsx,App.css,index.css,main.jsx}
```

## API

`POST /route` accepts:

```json
{"source":"Main","destination":"Library","crowd":"Moderate"}
```

Example response:

```json
{
  "route":["Main","L Block","Library"],
  "segments":[
    {"from":"Main","to":"L Block","distance":110,"crowd":"Moderate","multiplier":1.3,"effectiveCost":143},
    {"from":"L Block","to":"Library","distance":60,"crowd":"Moderate","multiplier":1.3,"effectiveCost":78}
  ],
  "distance":170,
  "effectiveCost":221,
  "estimatedMinutes":2.1,
  "crowd":"Moderate",
  "multiplier":1.3
}
```

Valid crowd values are `Low`, `Moderate`, and `High` (multipliers 1.0, 1.3, 1.7). Effective edge cost is distance × multiplier. Dijkstra minimizes effective cost; the response also reports physical distance. Invalid nodes/crowd values return HTTP 400. `GET /health` returns `{"status":"ok"}`.

Try the API from a third PowerShell window:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8080/route -ContentType 'application/json' -Body '{"source":"Main","destination":"Library","crowd":"Moderate"}'
```

## Graph used by the demo

Undirected edges, with illustrative distances in metres:

| Connection | Distance |
|---|---:|
| R & E Block — Main | 120 |
| Statue — Main | 70 |
| L Block — Main | 110 |
| Main — A Block | 140 |
| L Block — Open Audit | 80 |
| Open Audit — A Block | 75 |
| L Block — Library | 60 |
| Library — Open Audit | 90 |
| Open Audit — Canteen | 85 |
| A Block — Canteen | 55 |
| Library — Cricket Ground | 100 |
| Cricket Ground — Football Ground | 130 |
| Football Ground — Canteen | 95 |

## Deployment

From the project folder, create and push a new GitHub repository (replace the URL with the empty repository you create on GitHub):

```powershell
git init
git add .
git commit -m "Build campus route planner MVP"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

### C++ API on Render

1. Push this project to a GitHub repository.
2. In Render, create a **Web Service** from that repository, choose **Docker**, and set the root directory to `backend`.
3. Deploy. The included Dockerfile builds the C++ service and listens on Render's `PORT` at `0.0.0.0`.
4. Copy the deployed service URL, such as `https://your-service.onrender.com`.

### React site on Vercel

1. Import the same GitHub repository into Vercel and set **Root Directory** to `frontend`.
2. Add environment variable `VITE_API_URL` with the Render service URL (no trailing slash).
3. Deploy. Vite's default build settings (`npm run build`, output `dist`) are already suitable.

Free hosting may sleep or cold-start, so the first API request can take a little longer. This is a classroom demo; distances and walking estimates are simulated. No database or live crowd sensor is connected.
