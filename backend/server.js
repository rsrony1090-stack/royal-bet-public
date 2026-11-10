import express from "express";
import cors from "cors";
import crypto from "crypto";
import { MongoClient } from "mongodb";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is missing");
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI);

const seed = {
  users: [
    {
      id: "u_demo",
      name: "Demo Player",
      email: "player@royalbet.demo",
      password: "demo12345",
      points: 10000,
      role: "user"
    },
    {
      id: "u_admin",
      name: "ROYAL BET Admin",
      email: "admin@royalbet.demo",
      password: "RoyalDemo123!",
      points: 10000,
      role: "admin"
    }
  ],

  matches: [
    {
      id: "m1",
      sport: "Football",
      country: "England",
      league: "Premier League",
      home: "Arsenal",
      away: "Chelsea",
      start: "2026-11-12T20:00:00Z",
      status: "upcoming",
      score: "—",
      markets: [
        {
          name: "Match Winner",
          options: [
            { label: "Arsenal", odd: 1.85 },
            { label: "Draw", odd: 3.55 },
            { label: "Chelsea", odd: 4.1 }
          ]
        },
        {
          name: "Double Chance",
          options: [
            { label: "Arsenal or Draw", odd: 1.25 },
            { label: "Draw or Chelsea", odd: 1.9 },
            { label: "Arsenal or Chelsea", odd: 1.3 }
          ]
        },
        {
          name: "Total Goals",
          options: [
            { label: "Over 2.5", odd: 1.9 },
            { label: "Under 2.5", odd: 1.85 }
          ]
        },
        {
          name: "Both Teams To Score",
          options: [
            { label: "Yes", odd: 1.72 },
            { label: "No", odd: 2.05 }
          ]
        }
      ]
    },
    {
      id: "m2",
      sport: "Football",
      country: "Spain",
      league: "La Liga",
      home: "Real Madrid",
      away: "Sevilla",
      start: "2026-11-12T21:00:00Z",
      status: "upcoming",
      score: "—",
      markets: [
        {
          name: "Match Winner",
          options: [
            { label: "Real Madrid", odd: 1.42 },
            { label: "Draw", odd: 4.4 },
            { label: "Sevilla", odd: 6.8 }
          ]
        },
        {
          name: "Total Goals",
          options: [
            { label: "Over 2.5", odd: 1.65 },
            { label: "Under 2.5", odd: 2.2 }
          ]
        }
      ]
    },
    {
      id: "m3",
      sport: "Cricket",
      country: "International",
      league: "T20 Friendly",
      home: "Bangladesh",
      away: "Sri Lanka",
      start: "2026-11-11T14:00:00Z",
      status: "live",
      score: "BAN 78/2 (9.4)",
      markets: [
        {
          name: "Match Winner",
          options: [
            { label: "Bangladesh", odd: 1.95 },
            { label: "Sri Lanka", odd: 1.82 }
          ]
        },
        {
          name: "Next 10 Runs",
          options: [
            { label: "Over 9.5", odd: 1.8 },
            { label: "Under 9.5", odd: 1.9 }
          ]
        }
      ]
    },
    {
      id: "m4",
      sport: "Basketball",
      country: "USA",
      league: "NBA",
      home: "Boston Celtics",
      away: "Miami Heat",
      start: "2026-11-13T00:30:00Z",
      status: "upcoming",
      score: "—",
      markets: [
        {
          name: "Match Winner",
          options: [
            { label: "Boston Celtics", odd: 1.65 },
            { label: "Miami Heat", odd: 2.25 }
          ]
        },
        {
          name: "Total Points",
          options: [
            { label: "Over 215.5", odd: 1.9 },
            { label: "Under 215.5", odd: 1.9 }
          ]
        }
      ]
    },
    {
      id: "m5",
      sport: "Tennis",
      country: "ATP",
      league: "World Tour",
      home: "Player A",
      away: "Player B",
      start: "2026-11-13T11:00:00Z",
      status: "upcoming",
      score: "—",
      markets: [
        {
          name: "Match Winner",
          options: [
            { label: "Player A", odd: 1.75 },
            { label: "Player B", odd: 2.05 }
          ]
        }
      ]
    }
  ],

  predictions: []
};

let database;
let stateCollection;
let providerTestCollection;

async function initializeDatabase() {
  await client.connect();

  database = client.db("royalbet");
  stateCollection = database.collection("app_state");
  providerTestCollection = database.collection("provider_test_imports");
  await providerTestCollection.createIndex({ eventId: 1 }, { unique: true });

  await stateCollection.updateOne(
    { _id: "main" },
    {
      $setOnInsert: {
        ...seed,
        _id: "main"
      }
    },
    { upsert: true }
  );

  console.log("MongoDB connected successfully");
}

async function readDB() {
  const data = await stateCollection.findOne({ _id: "main" });

  if (!data) {
    throw new Error("Database state not found");
  }

  const { _id, ...db } = data;
  return db;
}

async function writeDB(db) {
  await stateCollection.replaceOne(
    { _id: "main" },
    { ...db, _id: "main" },
    { upsert: true }
  );
}

function safeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

function tokenFor(id) {
  return crypto
    .createHash("sha256")
    .update(id + ":royal-demo")
    .digest("hex");
}

async function auth(req, res, next) {
  try {
    const token = (req.headers.authorization || "")
      .replace(/^Bearer\s+/i, "");

    const db = await readDB();

    const user = db.users.find(
      u => token && token === tokenFor(u.id)
    );

    if (!user) {
      return res.status(401).json({ error: "Please log in" });
    }

    req.user = user;
    req.db = db;

    next();
  } catch (error) {
    next(error);
  }
}

function admin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Admin access required"
    });
  }

  next();
}

// HEALTH
app.get("/api/health", async (req, res) => {
  try {
    await stateCollection.findOne({ _id: "main" });

    res.json({
      status: "success",
      message: "ROYAL BET demo API connected",
      database: "connected"
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: "Database unavailable"
    });
  }
});

// SPORTS
app.get("/api/sports", async (req, res, next) => {
  try {
    const db = await readDB();

    res.json(
      [...new Set(db.matches.map(m => m.sport))].sort()
    );
  } catch (error) {
    next(error);
  }
});

// MATCHES
app.get("/api/matches", async (req, res, next) => {
  try {
    const db = await readDB();

    let rows = db.matches;

    if (req.query.sport && req.query.sport !== "All") {
      rows = rows.filter(m => m.sport === req.query.sport);
    }

    if (req.query.status && req.query.status !== "all") {
      rows = rows.filter(m => m.status === req.query.status);
    }

    if (req.query.q) {
      const q = String(req.query.q).toLowerCase();

      rows = rows.filter(m =>
        [m.home, m.away, m.league, m.country]
          .some(x => String(x).toLowerCase().includes(q))
      );
    }

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// REGISTER
app.post("/api/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      !name ||
      !email ||
      !password ||
      String(password).length < 8
    ) {
      return res.status(400).json({
        error: "Name, email and password (8+ characters) required"
      });
    }

    const db = await readDB();

    if (
      db.users.some(
        u => u.email.toLowerCase() === String(email).toLowerCase()
      )
    ) {
      return res.status(409).json({
        error: "Email already registered"
      });
    }

    const user = {
      id: "u_" + crypto.randomUUID(),
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password: String(password),
      points: 10000,
      role: "user"
    };

    db.users.push(user);

    await writeDB(db);

    res.json({
      token: tokenFor(user.id),
      user: safeUser(user)
    });
  } catch (error) {
    next(error);
  }
});

// LOGIN
app.post("/api/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    const db = await readDB();

    const user = db.users.find(
      u =>
        u.email.toLowerCase() === String(email || "").toLowerCase() &&
        u.password === password
    );

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    res.json({
      token: tokenFor(user.id),
      user: safeUser(user)
    });
  } catch (error) {
    next(error);
  }
});

// CURRENT USER
app.get("/api/me", auth, (req, res) => {
  res.json(safeUser(req.user));
});

// PREDICTION HISTORY
app.get("/api/predictions", auth, (req, res) => {
  res.json(
    req.db.predictions
      .filter(p => p.userId === req.user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );
});

// CREATE PREDICTION
app.post("/api/predictions", auth, async (req, res, next) => {
  try {
    const { selections, points } = req.body || {};

    if (
      !Array.isArray(selections) ||
      !selections.length ||
      selections.length > 10
    ) {
      return res.status(400).json({
        error: "Select 1–10 outcomes"
      });
    }

    const stake = Number(points);

    if (
      !Number.isInteger(stake) ||
      stake < 10 ||
      stake > 5000
    ) {
      return res.status(400).json({
        error: "Points must be 10–5000"
      });
    }

    const db = await readDB();

    const user = db.users.find(
      u => u.id === req.user.id
    );

    if (!user || user.points < stake) {
      return res.status(400).json({
        error: "Not enough demo points"
      });
    }

    let combined = 1;

    for (const selection of selections) {
      const match = db.matches.find(
        m => m.id === selection.matchId
      );

      const market = match?.markets.find(
        x => x.name === selection.market
      );

      const option = market?.options.find(
        x => x.label === selection.label
      );

      if (!option) {
        return res.status(400).json({
          error: "Invalid or outdated selection"
        });
      }

      if (match.status === "finished") {
        return res.status(400).json({
          error: "Match already settled"
        });
      }

      combined *= Number(option.odd);
    }

    user.points -= stake;

    const prediction = {
      id: "p_" + crypto.randomUUID(),
      userId: user.id,
      selections,
      points: stake,
      combinedOdds: Number(combined.toFixed(2)),
      possiblePoints: Math.floor(stake * combined),
      status: "pending",
      createdAt: new Date().toISOString()
    };

    db.predictions.push(prediction);

    await writeDB(db);

    res.json({
      prediction,
      user: safeUser(user)
    });
  } catch (error) {
    next(error);
  }
});

// LEADERBOARD
app.get("/api/leaderboard", async (req, res, next) => {
  try {
    const db = await readDB();

    res.json(
      db.users
        .filter(u => u.role === "user")
        .map(safeUser)
        .sort((a, b) => b.points - a.points)
        .slice(0, 20)
    );
  } catch (error) {
    next(error);
  }
});

// ADMIN OVERVIEW
app.get("/api/admin/overview", auth, admin, (req, res) => {
  res.json({
    users: req.db.users.length,
    matches: req.db.matches.length,
    predictions: req.db.predictions.length,
    pending: req.db.predictions.filter(
      p => p.status === "pending"
    ).length
  });
});

// ADMIN ADD MATCH
app.post("/api/admin/matches", auth, admin, async (req, res, next) => {
  try {
    const {
      sport,
      country,
      league,
      home,
      away,
      start
    } = req.body || {};

    if (![sport, country, league, home, away, start].every(Boolean)) {
      return res.status(400).json({
        error: "All match fields are required"
      });
    }

    const db = await readDB();

    const match = {
      id: "m_" + crypto.randomUUID(),
      sport,
      country,
      league,
      home,
      away,
      start,
      status: "upcoming",
      score: "—",
      markets: [
        {
          name: "Match Winner",
          options: [
            { label: home, odd: 1.8 },
            { label: "Draw", odd: 3.4 },
            { label: away, odd: 4.2 }
          ]
        },
        {
          name: "Total Goals",
          options: [
            { label: "Over 2.5", odd: 1.9 },
            { label: "Under 2.5", odd: 1.9 }
          ]
        }
      ]
    };

    db.matches.push(match);

    await writeDB(db);

    res.json(match);
  } catch (error) {
    next(error);
  }
});

// ADMIN SETTLE MATCH
app.post("/api/admin/settle/:id", auth, admin, async (req, res, next) => {
  try {
    const { result, score } = req.body || {};

    if (!["home", "draw", "away", "void"].includes(result)) {
      return res.status(400).json({
        error: "Result must be home, draw, away or void"
      });
    }

    const db = await readDB();

    const match = db.matches.find(
      m => m.id === req.params.id
    );

    if (!match) {
      return res.status(404).json({
        error: "Match not found"
      });
    }

    match.status = "finished";
    match.score = score || "Final";

    for (const prediction of db.predictions.filter(
      p =>
        p.status === "pending" &&
        p.selections.some(s => s.matchId === match.id)
    )) {
      const impacted = prediction.selections.filter(
        s => s.matchId === match.id
      );

      const user = db.users.find(
        u => u.id === prediction.userId
      );

      if (result === "void") {
        prediction.status = "void";

        if (user) {
          user.points += prediction.points;
        }

        continue;
      }

      const winner =
        result === "home"
          ? match.home
          : result === "away"
            ? match.away
            : "Draw";

      const won = impacted.every(
        s =>
          s.market === "Match Winner" &&
          s.label === winner
      );

      if (!won) {
        prediction.status = "lost";
      } else if (
        prediction.selections.every(
          s => s.matchId === match.id
        )
      ) {
        prediction.status = "won";

        if (user) {
          user.points += prediction.possiblePoints;
        }
      }
    }

    await writeDB(db);

    res.json({
      ok: true,
      match
    });
  } catch (error) {
    next(error);
  }
});


// THERUNDOWN API — ADMIN-ONLY TEST ROUTES
// Free-plan data stays private for internal testing; do not expose it on public match pages.
const rundownCache = new Map();
let rundownLastRequestAt = 0;

async function rundownGet(url) {
  const apiKey = process.env.THERUNDOWN_API_KEY;
  if (!apiKey) {
    const error = new Error("THERUNDOWN_API_KEY is not configured");
    error.status = 503;
    throw error;
  }

  const cached = rundownCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const waitMs = Math.max(0, 1100 - (Date.now() - rundownLastRequestAt));
  if (waitMs) await new Promise(resolve => setTimeout(resolve, waitMs));
  rundownLastRequestAt = Date.now();

  const response = await fetch(url, {
    headers: { "X-TheRundown-Key": apiKey },
    signal: AbortSignal.timeout(15000)
  });

  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = { raw }; }

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || `TheRundown returned HTTP ${response.status}`);
    error.status = response.status === 429 ? 429 : 502;
    error.providerStatus = response.status;
    throw error;
  }

  const result = {
    data,
    usage: {
      datapoints: response.headers.get("x-datapoints"),
      remaining: response.headers.get("x-datapoints-remaining"),
      delaySeconds: response.headers.get("x-data-delay-seconds")
    }
  };
  rundownCache.set(url, { data: result, expiresAt: Date.now() + 60000 });
  return result;
}

app.get("/api/admin/provider/sports", auth, admin, async (req, res, next) => {
  try {
    const result = await rundownGet("https://therundown.io/api/v2/sports");
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/provider/events/:sportId/:date", auth, admin, async (req, res, next) => {
  try {
    const { sportId, date } = req.params;
    if (!/^\d+$/.test(sportId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "Use a numeric sport ID and date in YYYY-MM-DD format" });
    }
    const parsedDate = new Date(date + "T00:00:00Z");
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
      return res.status(400).json({ error: "Invalid date" });
    }

    const url = new URL(`https://therundown.io/api/v2/sports/${sportId}/events/${date}`);
    url.searchParams.set("market_ids", "1,2,3");
    url.searchParams.set("affiliate_ids", "3,19,23");
    url.searchParams.set("main_line", "true");
    url.searchParams.set("hide_closed", "true");

    const result = await rundownGet(url.toString());
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ADMIN-ONLY PROVIDER TEST IMPORT — stored separately from public matches.
// This keeps free-plan provider data out of the public sportsbook endpoints.
app.post("/api/admin/provider/import-test", auth, admin, async (req, res, next) => {
  try {
    const { events, sportId, sportName, date } = req.body || {};
    if (!Array.isArray(events) || events.length === 0 || events.length > 100) {
      return res.status(400).json({ error: "Provide 1–100 provider events" });
    }

    const docs = events.filter(ev => ev && (ev.event_id || ev.event_uuid)).map(ev => ({
      eventId: String(ev.event_id || ev.event_uuid),
      sportId: String(sportId || ""),
      sportName: String(sportName || "Unknown sport"),
      requestedDate: String(date || ""),
      event: ev,
      importedAt: new Date().toISOString(),
      source: "TheRundown"
    }));

    if (!docs.length) {
      return res.status(400).json({ error: "No valid event IDs found in provider response" });
    }

    let inserted = 0;
    let existing = 0;
    for (const doc of docs) {
      try {
        await providerTestCollection.updateOne(
          { eventId: doc.eventId },
          { $set: { ...doc, lastImportedAt: doc.importedAt }, $setOnInsert: { firstImportedAt: doc.importedAt } },
          { upsert: true }
        );
        inserted++;
      } catch (error) {
        if (error.code === 11000) existing++;
        else throw error;
      }
    }

    res.json({ ok: true, saved: inserted, skipped: existing, total: docs.length, storage: "admin-only test collection", publicMatchesChanged: false });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/provider/imported-tests", auth, admin, async (req, res, next) => {
  try {
    const rows = await providerTestCollection.find({}, { projection: { eventId: 1, sportId: 1, sportName: 1, requestedDate: 1, importedAt: 1, _id: 0 } }).sort({ importedAt: -1 }).limit(100).toArray();
    res.json({ count: rows.length, events: rows });
  } catch (error) {
    next(error);
  }
});

// ERROR HANDLER
app.use((error, req, res, next) => {
  console.error("API Error:", error);

  res.status(error.status || 500).json({
    error: error.status ? error.message : "Server error. Please try again."
  });
});

// START SERVER
async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`ROYAL BET API running on ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
