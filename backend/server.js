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
let aviatorRoundCollection;
let aviatorGlobalCollection;
let aviatorCrashHistoryCollection;

async function initializeDatabase() {
  await client.connect();

  database = client.db("royalbet");
  stateCollection = database.collection("app_state");
  providerTestCollection = database.collection("provider_test_imports");
  aviatorRoundCollection = database.collection("aviator_rounds");
  aviatorGlobalCollection = database.collection("aviator_global_round");
  aviatorCrashHistoryCollection = database.collection("aviator_crash_history");
  await aviatorCrashHistoryCollection.createIndex({ roundId: 1 }, { unique: true });
  await aviatorRoundCollection.createIndex({ userId: 1, settledAt: -1 });
  await aviatorGlobalCollection.createIndex({ roundId: 1 });
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



// SHARED AVIATOR DEMO — one global round for every player
const AVIATOR_GROWTH_RATE = 0.13;
const AVIATOR_BET_SECONDS = 5;
const AVIATOR_NEXT_ROUND_SECONDS = 5;

function aviatorMultiplierAt(startedAt, now = Date.now()) {
  return Number(Math.exp(Math.max(0, now - new Date(startedAt).getTime()) / 1000 * AVIATOR_GROWTH_RATE).toFixed(2));
}
function newAviatorRound(now = Date.now()) {
  // Demo crash distribution: mostly regular rounds, with occasional rare high multipliers.
  const random = crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff;
  let crashAt;
  if (random < 0.85) {
    const r = crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff;
    crashAt = 1.35 + Math.pow(r, 2) * 8.65;       // 85%: 1.35x–10x
  } else if (random < 0.97) {
    const r = crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff;
    crashAt = 10 + r * 15;                        // 12%: 10x–25x
  } else if (random < 0.997) {
    const r = crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff;
    crashAt = 25 + r * 75;                        // 2.7%: 25x–100x
  } else {
    const r = crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff;
    crashAt = 100 + r * 400;                      // 0.3%: 100x–500x
  }
  crashAt = Number(crashAt.toFixed(2));
  const createdAt = new Date(now).toISOString();
  return {
    roundId: "av_" + crypto.randomUUID(),
    phase: "betting",
    createdAt,
    bettingEndsAt: new Date(now + AVIATOR_BET_SECONDS * 1000).toISOString(),
    flightStartedAt: null,
    crashAt,
    crashAtSeconds: Math.log(crashAt) / AVIATOR_GROWTH_RATE,
    bets: []
  };
}
async function saveAviatorHistory(round, bet, status, multiplier, payout = 0) {
  await aviatorRoundCollection.updateOne(
    { _id: bet.betId || (round.roundId + "_" + bet.userId) },
    { $setOnInsert: {
      _id: bet.betId || (round.roundId + "_" + bet.userId),
      roundId: round.roundId,
      userId: bet.userId,
      stake: bet.stake,
      status,
      finalMultiplier: multiplier,
      payout,
      panel: bet.panel || 1,
      betId: bet.betId || null,
      autoCashedOut: !!bet.autoCashedOut,
      autoCashoutAt: bet.autoCashoutAt || null,
      createdAt: round.createdAt,
      settledAt: new Date().toISOString()
    } },
    { upsert: true }
  );
}
async function tickAviatorRound() {
  const now = Date.now();
  let round = await aviatorGlobalCollection.findOne({ _id: "current" });
  if (!round) {
    const initial = { _id: "current", ...newAviatorRound(now) };
    await aviatorGlobalCollection.updateOne({ _id: "current" }, { $setOnInsert: initial }, { upsert: true });
    return;
  }
  if (round.phase === "betting" && now >= new Date(round.bettingEndsAt).getTime()) {
    await aviatorGlobalCollection.updateOne(
      { _id: "current", roundId: round.roundId, phase: "betting" },
      { $set: { phase: "flying", flightStartedAt: new Date(now).toISOString() } }
    );
    round = await aviatorGlobalCollection.findOne({ _id: "current" });
  }
  if (round?.phase === "flying") {
    const elapsed = (now - new Date(round.flightStartedAt).getTime()) / 1000;
    const currentMultiplier = aviatorMultiplierAt(round.flightStartedAt, now);
    if (elapsed < round.crashAtSeconds) {
      for (const bet of (round.bets || [])) {
        const target = Number(bet.autoCashoutAt || 0);
        if (bet.status !== "active" || !target || currentMultiplier < target || target >= round.crashAt) continue;
        const payout = Math.floor(bet.stake * target);
        const won = await aviatorGlobalCollection.updateOne(
          { _id: "current", roundId: round.roundId, phase: "flying", bets: { $elemMatch: { betId: bet.betId, status: "active" } } },
          { $set: { "bets.$.status": "won", "bets.$.payout": payout, "bets.$.finalMultiplier": target, "bets.$.cashedOutAt": new Date(now).toISOString(), "bets.$.autoCashedOut": true } }
        );
        if (won.modifiedCount) {
          const db = await readDB();
          const user = db.users.find(u => u.id === bet.userId);
          if (user) { user.points += payout; await writeDB(db); }
          await saveAviatorHistory(round, { ...bet, autoCashedOut: true }, "won", target, payout);
        }
      }
    }
    if (elapsed >= round.crashAtSeconds) {
      const crashed = await aviatorGlobalCollection.updateOne(
        { _id: "current", roundId: round.roundId, phase: "flying" },
        { $set: { phase: "crashed", finishedAt: new Date(now).toISOString(), finalMultiplier: round.crashAt } }
      );
      if (crashed.modifiedCount) {
        await aviatorCrashHistoryCollection.updateOne(
          { roundId: round.roundId },
          { $setOnInsert: { roundId: round.roundId, finalMultiplier: round.crashAt, crashedAt: new Date(now).toISOString(), createdAt: round.createdAt } },
          { upsert: true }
        );
        for (const bet of (round.bets || [])) {
          if (bet.status === "active") await saveAviatorHistory(round, bet, "lost", round.crashAt, 0);
        }
      }
      round = await aviatorGlobalCollection.findOne({ _id: "current" });
    }
  }
  if (round?.phase === "crashed" && now - new Date(round.finishedAt).getTime() >= AVIATOR_NEXT_ROUND_SECONDS * 1000) {
    await aviatorGlobalCollection.updateOne(
      { _id: "current", roundId: round.roundId, phase: "crashed" },
      { $set: newAviatorRound(now) }
    );
  }
}
app.get("/api/aviator/state", auth, async (req, res, next) => {
  try {
    await tickAviatorRound();
    const round = await aviatorGlobalCollection.findOne({ _id: "current" });
    const ownBet = (round.bets || []).find(b => b.userId === req.user.id) || null;
    const history = await aviatorRoundCollection.find({ userId: req.user.id }).sort({ settledAt: -1 }).toArray();
    const crashHistory = await aviatorCrashHistoryCollection.find({}).sort({ crashedAt: -1 }).limit(15).toArray();
    const now = Date.now();
    res.json({
      round: {
        id: round.roundId,
        phase: round.phase,
        bettingEndsAt: round.bettingEndsAt,
        flightStartedAt: round.flightStartedAt,
        countdownMs: round.phase === "betting" ? Math.max(0, new Date(round.bettingEndsAt).getTime() - now) : 0,
        multiplier: round.phase === "flying" ? aviatorMultiplierAt(round.flightStartedAt, now) : (round.finalMultiplier || 1),
        finalMultiplier: round.finalMultiplier || null,
        players: (round.bets || []).length
      },
      ownBet: ownBet ? { ...ownBet } : null,
      ownBets: (round.bets || []).filter(b => b.userId === req.user.id).map(b => ({ ...b })),
      livePlayers: [...new Map((round.bets || []).map(b => [b.userId, { player: "Player #" + String(b.userId).slice(-4), bets: (round.bets || []).filter(x => x.userId === b.userId).length }])).values()],
      liveBets: (round.bets || []).map(b => ({ player: "Player #" + String(b.userId).slice(-4), panel: b.panel || 1, stake: b.stake, status: b.status, payout: b.payout || 0, finalMultiplier: b.finalMultiplier || null })).slice(0, 30),
      topWins: (round.bets || []).filter(b => b.status === "won").sort((a,b) => (b.payout||0)-(a.payout||0)).slice(0,5).map(b => ({ player: "Player #" + String(b.userId).slice(-4), stake: b.stake, payout: b.payout || 0, multiplier: b.finalMultiplier || 0 })),
      crashHistory,
      history
    });
  } catch (error) { next(error); }
});
app.post("/api/aviator/start", auth, async (req, res, next) => {
  try {
    await tickAviatorRound();
    const stake = Number(req.body?.stake);
    const autoCashoutAt = req.body?.autoCashoutAt == null || req.body?.autoCashoutAt === "" ? null : Number(req.body.autoCashoutAt);
    if (autoCashoutAt !== null && (!Number.isFinite(autoCashoutAt) || autoCashoutAt < 1.1 || autoCashoutAt > 1000)) return res.status(400).json({ error: "Auto cashout must be between 1.10x and 1000x" });
    if (!Number.isInteger(stake) || stake < 10 || stake > 5000) return res.status(400).json({ error: "Bet must be 10–5000 demo points" });
    const round = await aviatorGlobalCollection.findOne({ _id: "current" });
    if (!round || round.phase !== "betting") return res.status(409).json({ error: "Betting is closed. Wait for the next round." });
    const panel = Number(req.body?.panel || 1);
    if (![1, 2].includes(panel)) return res.status(400).json({ error: "Choose bet panel 1 or 2." });
    if ((round.bets || []).some(b => b.userId === req.user.id && b.panel === panel)) return res.status(409).json({ error: "This bet panel is already used in this round." });
    const db = await readDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user || user.points < stake) return res.status(400).json({ error: "Not enough demo points" });
    user.points -= stake;
    await writeDB(db);
    const bet = { betId: crypto.randomUUID(), panel, userId: user.id, stake, status: "active", autoCashoutAt, placedAt: new Date().toISOString() };
    const result = await aviatorGlobalCollection.updateOne(
      { _id: "current", roundId: round.roundId, phase: "betting", bettingEndsAt: { $gt: new Date().toISOString() }, "bets.userId": { $ne: user.id } },
      { $push: { bets: bet } }
    );
    if (!result.modifiedCount) {
      user.points += stake;
      await writeDB(db);
      return res.status(409).json({ error: "Betting just closed. Your demo points were returned." });
    }
    res.json({ ok: true, roundId: round.roundId, bet, user: safeUser(user) });
  } catch (error) { next(error); }
});
app.post("/api/aviator/cashout", auth, async (req, res, next) => {
  try {
    // Do not run the round ticker before processing a cashout: first read the
    // current flying round and atomically claim the active bet.
    const round = await aviatorGlobalCollection.findOne({ _id: "current", roundId: String(req.body?.roundId || "") });
    if (!round || round.phase !== "flying") return res.status(409).json({ error: "The flight has ended or is not running." });
    const bet = (round.bets || []).find(b => b.userId === req.user.id && b.status === "active" && (req.body?.betId ? b.betId === req.body.betId : b.panel === Number(req.body?.panel || 1)));
    if (!bet) return res.status(404).json({ error: "No active bet found for this round." });
    const cashoutTime = Date.now();
    const crashDeadline = new Date(round.flightStartedAt).getTime() + Number(round.crashAtSeconds) * 1000;
    if (cashoutTime >= crashDeadline) {
      await tickAviatorRound();
      return res.status(409).json({ error: "Too late — this round has crashed." });
    }
    const multiplier = aviatorMultiplierAt(round.flightStartedAt, cashoutTime);
    const payout = Math.floor(bet.stake * multiplier);
    const updated = await aviatorGlobalCollection.updateOne(
      { _id: "current", roundId: round.roundId, phase: "flying", "bets": { $elemMatch: { betId: bet.betId, status: "active" } } },
      { $set: { "bets.$.status": "won", "bets.$.payout": payout, "bets.$.finalMultiplier": multiplier, "bets.$.cashedOutAt": new Date().toISOString() } }
    );
    if (!updated.modifiedCount) return res.status(409).json({ error: "Cash out was not accepted. Check the round status." });
    const db = await readDB();
    const user = db.users.find(u => u.id === req.user.id);
    user.points += payout;
    await writeDB(db);
    await saveAviatorHistory(round, bet, "won", multiplier, payout);
    res.json({ result: "won", round: { id: round.roundId, stake: bet.stake, status: "won", finalMultiplier: multiplier, payout }, user: safeUser(user) });
  } catch (error) { next(error); }
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

function americanToDecimal(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return null;
  return Number((n > 0 ? 1 + n / 100 : 1 + 100 / Math.abs(n)).toFixed(3));
}

function normalizeProviderEvent(row) {
  const ev = row.event || {};
  const teams = ev.teams || [];
  const away = teams.find(t => t.is_away) || teams[0] || {};
  const home = teams.find(t => t.is_home) || teams[1] || {};
  const markets = (ev.markets || []).map(market => {
    const options = [];
    (market.participants || []).forEach(participant => {
      (participant.lines || []).forEach(line => {
        const prices = Object.entries(line.prices || {});
        const validPrices = prices.map(([source, quote]) => ({
          source,
          american: Number(quote?.price ?? quote),
          decimal: americanToDecimal(quote?.price ?? quote)
        })).filter(x => x.decimal !== null);
        if (!validPrices.length) return;
        const quote = validPrices[0];
        const lineText = line.value == null ? "" : " " + line.value;
        options.push({
          label: String(participant.name || "Outcome") + lineText,
          odd: quote.decimal,
          americanOdds: quote.american,
          line: line.value ?? null,
          source: quote.source,
          availableSources: validPrices.length
        });
      });
    });
    return {
      name: String(market.name || market.market_description || "Market"),
      options
    };
  }).filter(m => m.options.length);
  return {
    eventId: row.eventId,
    sport: row.sportName,
    league: ev.schedule?.league_name || "Unknown league",
    home: [home.name, home.mascot].filter(Boolean).join(" "),
    away: [away.name, away.mascot].filter(Boolean).join(" "),
    start: ev.event_date || null,
    status: ev.score?.event_status || "Scheduled",
    markets,
    normalizedAt: new Date().toISOString(),
    format: "royalbet-demo-market-v1"
  };
}

app.post("/api/admin/provider/normalize-tests", auth, admin, async (req, res, next) => {
  try {
    const rows = await providerTestCollection.find({}).toArray();
    let normalized = 0;
    let withoutMarkets = 0;
    for (const row of rows) {
      const demoMarket = normalizeProviderEvent(row);
      if (!demoMarket.markets.length) withoutMarkets++;
      await providerTestCollection.updateOne(
        { eventId: row.eventId },
        { $set: { demoMarket } }
      );
      normalized++;
    }
    res.json({
      ok: true,
      normalized,
      withoutMarkets,
      storage: "admin-only test collection",
      publicMatchesChanged: false
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/provider/imported-tests", auth, admin, async (req, res, next) => {
  try {
    const rows = await providerTestCollection.find({}, { projection: { eventId: 1, sportId: 1, sportName: 1, requestedDate: 1, importedAt: 1, event: 1, demoMarket: 1, _id: 0 } }).sort({ importedAt: -1 }).limit(100).toArray();
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
    await tickAviatorRound();
    setInterval(() => tickAviatorRound().catch(error => console.error("Aviator round tick failed:", error)), 250);

    app.listen(PORT, () => {
      console.log(`ROYAL BET API running on ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
