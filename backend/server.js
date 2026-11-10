import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 5000;
const DB_FILE = path.resolve("data.json");

const seed = {
  users: [
    { id:"u_demo", name:"Demo Player", email:"player@royalbet.demo", password:"demo12345", points:10000, role:"user" },
    { id:"u_admin", name:"ROYAL BET Admin", email:"admin@royalbet.demo", password:"RoyalDemo123!", points:10000, role:"admin" }
  ],
  matches: [
    { id:"m1", sport:"Football", country:"England", league:"Premier League", home:"Arsenal", away:"Chelsea", start:"2026-11-12T20:00:00Z", status:"upcoming", score:"—", markets:[
      {name:"Match Winner", options:[{label:"Arsenal",odd:1.85},{label:"Draw",odd:3.55},{label:"Chelsea",odd:4.1}]},
      {name:"Double Chance",options:[{label:"Arsenal or Draw",odd:1.25},{label:"Draw or Chelsea",odd:1.9},{label:"Arsenal or Chelsea",odd:1.3}]},
      {name:"Total Goals",options:[{label:"Over 2.5",odd:1.9},{label:"Under 2.5",odd:1.85}]},
      {name:"Both Teams To Score",options:[{label:"Yes",odd:1.72},{label:"No",odd:2.05}]}
    ]},
    { id:"m2", sport:"Football", country:"Spain", league:"La Liga", home:"Real Madrid", away:"Sevilla", start:"2026-11-12T21:00:00Z", status:"upcoming", score:"—", markets:[
      {name:"Match Winner",options:[{label:"Real Madrid",odd:1.42},{label:"Draw",odd:4.4},{label:"Sevilla",odd:6.8}]},
      {name:"Total Goals",options:[{label:"Over 2.5",odd:1.65},{label:"Under 2.5",odd:2.2}]}
    ]},
    { id:"m3", sport:"Cricket", country:"International", league:"T20 Friendly", home:"Bangladesh", away:"Sri Lanka", start:"2026-11-11T14:00:00Z", status:"live", score:"BAN 78/2 (9.4)", markets:[
      {name:"Match Winner",options:[{label:"Bangladesh",odd:1.95},{label:"Sri Lanka",odd:1.82}]},
      {name:"Next 10 Runs",options:[{label:"Over 9.5",odd:1.8},{label:"Under 9.5",odd:1.9}]}
    ]},
    { id:"m4", sport:"Basketball", country:"USA", league:"NBA", home:"Boston Celtics", away:"Miami Heat", start:"2026-11-13T00:30:00Z", status:"upcoming", score:"—", markets:[
      {name:"Match Winner",options:[{label:"Boston Celtics",odd:1.65},{label:"Miami Heat",odd:2.25}]},
      {name:"Total Points",options:[{label:"Over 215.5",odd:1.9},{label:"Under 215.5",odd:1.9}]}
    ]},
    { id:"m5", sport:"Tennis", country:"ATP", league:"World Tour", home:"Player A", away:"Player B", start:"2026-11-13T11:00:00Z", status:"upcoming", score:"—", markets:[
      {name:"Match Winner",options:[{label:"Player A",odd:1.75},{label:"Player B",odd:2.05}]}
    ]}
  ],
  predictions: []
};

function readDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
function writeDB(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function safeUser(u) { const {password, ...rest} = u; return rest; }
function tokenFor(id) { return crypto.createHash("sha256").update(id + ":royal-demo").digest("hex"); }
function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const db = readDB();
  const user = db.users.find(u => token && token === tokenFor(u.id));
  if (!user) return res.status(401).json({error:"Please log in"});
  req.user = user; req.db = db; next();
}
function admin(req,res,next) {
  if (req.user.role !== "admin") return res.status(403).json({error:"Admin access required"});
  next();
}

app.get("/api/health", (_,res) => res.json({status:"success",message:"ROYAL BET demo API connected"}));
app.get("/api/sports", (_,res) => {
  const db=readDB();
  res.json([...new Set(db.matches.map(m=>m.sport))].sort());
});
app.get("/api/matches", (req,res) => {
  const db=readDB(); let rows=db.matches;
  if(req.query.sport && req.query.sport!=="All") rows=rows.filter(m=>m.sport===req.query.sport);
  if(req.query.status && req.query.status!=="all") rows=rows.filter(m=>m.status===req.query.status);
  if(req.query.q) { const q=req.query.q.toLowerCase(); rows=rows.filter(m=>[m.home,m.away,m.league,m.country].some(x=>x.toLowerCase().includes(q))); }
  res.json(rows);
});
app.post("/api/register", (req,res) => {
  const {name,email,password}=req.body||{};
  if(!name||!email||!password||password.length<8) return res.status(400).json({error:"Name, email and password (8+ characters) required"});
  const db=readDB(); if(db.users.some(u=>u.email.toLowerCase()===email.toLowerCase())) return res.status(409).json({error:"Email already registered"});
  const user={id:"u_"+crypto.randomUUID(),name,email,password,points:10000,role:"user"};
  db.users.push(user); writeDB(db); res.json({token:tokenFor(user.id),user:safeUser(user)});
});
app.post("/api/login", (req,res) => {
  const {email,password}=req.body||{}; const db=readDB();
  const user=db.users.find(u=>u.email.toLowerCase()===String(email||"").toLowerCase()&&u.password===password);
  if(!user) return res.status(401).json({error:"Invalid email or password"});
  res.json({token:tokenFor(user.id),user:safeUser(user)});
});
app.get("/api/me",auth,(req,res)=>res.json(safeUser(req.user)));
app.get("/api/predictions",auth,(req,res)=>res.json(req.db.predictions.filter(p=>p.userId===req.user.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))));
app.post("/api/predictions",auth,(req,res)=>{
  const {selections,points}=req.body||{};
  if(!Array.isArray(selections)||!selections.length||selections.length>10) return res.status(400).json({error:"Select 1–10 outcomes"});
  const stake=Number(points);
  if(!Number.isInteger(stake)||stake<10||stake>5000) return res.status(400).json({error:"Points must be 10–5000"});
  const db=readDB(); const user=db.users.find(u=>u.id===req.user.id);
  if(user.points<stake) return res.status(400).json({error:"Not enough demo points"});
  let combined=1;
  for(const s of selections){
    const match=db.matches.find(m=>m.id===s.matchId);
    const market=match?.markets.find(x=>x.name===s.market);
    const option=market?.options.find(x=>x.label===s.label);
    if(!option) return res.status(400).json({error:"Invalid or outdated selection"});
    if(match.status==="finished") return res.status(400).json({error:"Match already settled"});
    combined*=Number(option.odd);
  }
  user.points-=stake;
  const p={id:"p_"+crypto.randomUUID(),userId:user.id,selections,points:stake,combinedOdds:Number(combined.toFixed(2)),possiblePoints:Math.floor(stake*combined),status:"pending",createdAt:new Date().toISOString()};
  db.predictions.push(p); writeDB(db); res.json({prediction:p,user:safeUser(user)});
});
app.get("/api/leaderboard",(_,res)=>{
  const db=readDB(); res.json(db.users.filter(u=>u.role==="user").map(safeUser).sort((a,b)=>b.points-a.points).slice(0,20));
});
app.get("/api/admin/overview",auth,admin,(req,res)=>{
  res.json({users:req.db.users.length,matches:req.db.matches.length,predictions:req.db.predictions.length,pending:req.db.predictions.filter(p=>p.status==="pending").length});
});
app.post("/api/admin/matches",auth,admin,(req,res)=>{
  const {sport,country,league,home,away,start}=req.body||{};
  if(![sport,country,league,home,away,start].every(Boolean)) return res.status(400).json({error:"All match fields are required"});
  const db=readDB(); const m={id:"m_"+crypto.randomUUID(),sport,country,league,home,away,start,status:"upcoming",score:"—",markets:[
    {name:"Match Winner",options:[{label:home,odd:1.8},{label:"Draw",odd:3.4},{label:away,odd:4.2}]},
    {name:"Total Goals",options:[{label:"Over 2.5",odd:1.9},{label:"Under 2.5",odd:1.9}]}
  ]}; db.matches.push(m); writeDB(db); res.json(m);
});
app.post("/api/admin/settle/:id",auth,admin,(req,res)=>{
  const {result,score}=req.body||{}; if(!["home","draw","away","void"].includes(result)) return res.status(400).json({error:"Result must be home, draw, away or void"});
  const db=readDB(); const match=db.matches.find(m=>m.id===req.params.id); if(!match) return res.status(404).json({error:"Match not found"});
  match.status="finished"; match.score=score||"Final";
  for(const p of db.predictions.filter(x=>x.status==="pending"&&x.selections.some(s=>s.matchId===match.id))){
    const impacted=p.selections.filter(s=>s.matchId===match.id);
    if(result==="void"){ p.status="void"; const u=db.users.find(x=>x.id===p.userId); if(u) u.points+=p.points; }
    else {
      const winner=result==="home"?match.home:result==="away"?match.away:"Draw";
      const won=impacted.every(s=>s.market==="Match Winner"&&s.label===winner);
      if(!won) p.status="lost";
      else if(p.selections.every(s=>s.matchId===match.id)){p.status="won";const u=db.users.find(x=>x.id===p.userId);if(u)u.points+=p.possiblePoints;}
    }
  }
  writeDB(db); res.json({ok:true,match});
});
app.listen(PORT,()=>console.log(`ROYAL BET API running on ${PORT}`));
