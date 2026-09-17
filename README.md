# PowerTrack

PowerTrack is a South African load-shedding schedule and alert tracker. The Friday milestone includes a live public dashboard, a seeded Express API, timezone-aware status calculation, and a protected administrator statistics view.

See [PROJECT_CONTRACT.md](PROJECT_CONTRACT.md) for the complete product, architecture, phase, sprint, acceptance, and release contract.

## Run locally

```powershell
cd server
npm install
npm start
```

In another terminal:

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:3000`. The local admin credentials are `admin@powertrack.local` and `PowerTrackFriday!` unless overridden in `server/.env`. Copy `.env.example` files before configuring deployment. The API currently uses realistic in-memory seed data for a zero-setup local run; `database/schema.sql` defines the Neon PostgreSQL persistence boundary for the next integration step.

## Checks

```powershell
cd client; npm run lint; npm run build
cd ../server; npm start
```
# CS-Load-shedding-schedule-and-alert-tracker
The problem: Load-shedding schedules change frequently and are published in formats that are hard to check  quickly, making it difficult for households and small businesses to plan around outages. 
