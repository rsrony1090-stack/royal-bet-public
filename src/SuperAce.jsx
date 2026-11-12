import React,{useEffect,useMemo,useRef,useState} from "react";
import "./super-ace.css";

const SUITS=[
 {id:"A",name:"ACE",glyph:"♠",tone:"black",pay:8},
 {id:"K",name:"KING",glyph:"👑",tone:"gold",pay:6},
 {id:"Q",name:"QUEEN",glyph:"♛",tone:"red",pay:5},
 {id:"J",name:"JACK",glyph:"♞",tone:"blue",pay:4},
 {id:"S",name:"SPADE",glyph:"♠",tone:"black",pay:3},
 {id:"H",name:"HEART",glyph:"♥",tone:"red",pay:3},
 {id:"C",name:"CLUB",glyph:"♣",tone:"blue",pay:3},
 {id:"D",name:"DIAMOND",glyph:"♦",tone:"orange",pay:3}
];
const WILD="W",GOLD="G",SCATTER="X";
const ICONS={W:"🃏",G:"👑",X:"⭐",A:"♠",K:"♛",Q:"♛",J:"♞",S:"♠",H:"♥",C:"♣",D:"♦"};
const PAY={A:8,K:6,Q:5,J:4,S:3,H:3,C:3,D:3};
const MULT=[1,2,3,5];
const FREE_MULT=[2,4,6,10];
const money=n=>Number(n||0).toLocaleString("en-US",{maximumFractionDigits:2});
const pick=a=>a[Math.floor(Math.random()*a.length)];
function makeGrid(boost=false){
 const weights=boost?["A","K","Q","J","S","H","C","D","G","W","X"]:["A","K","Q","J","S","H","C","D","G","W","X"];
 const grid=Array.from({length:5},()=>Array.from({length:4},()=>pick(weights)));
 if(boost&&Math.random()<.35){const sym=pick(["A","K","Q","J","S","H","C","D"]);const n=3+Math.floor(Math.random()*2);for(let c=0;c<n;c++)grid[c][Math.floor(Math.random()*4)]=sym;}
 return grid;
}
function evaluate(grid,bet,mult){
 const wins=[];
 for(const sym of Object.keys(PAY)){
  let ways=1,cols=0,matched=[];
  for(let c=0;c<5;c++){
   const rows=[];for(let r=0;r<4;r++)if(grid[c][r]===sym||grid[c][r]===WILD||grid[c][r]===GOLD)rows.push(r);
   if(!rows.length)break;ways*=rows.length;cols++;matched.push(rows);
  }
  if(cols>=3)wins.push({sym,cols,ways,amount:bet*PAY[sym]*ways*mult/100,matched});
 }
 wins.sort((a,b)=>b.amount-a.amount);
 return wins;
}
function Card({symbol,small=false,highlight=false}){
 const s=SUITS.find(x=>x.id===symbol);
 const tone=s?.tone|| (symbol===WILD?"wild":symbol===GOLD?"gold":symbol===SCATTER?"scatter":"black");
 const label=s?.name||(symbol===WILD?"WILD":symbol===GOLD?"GOLD":symbol===SCATTER?"SCATTER":"");
 return <div className={"sa-card sa-"+tone+(highlight?" sa-hit":"")+(small?" sa-small":"")}>
  {s?<><span className="sa-card-rank">{symbol==="S"||symbol==="H"||symbol==="C"||symbol==="D"?"":symbol}</span><span className="sa-card-art">{symbol==="K"?"♛":symbol==="Q"?"♕":symbol==="J"?"♞":s.glyph}</span><span className="sa-card-suit">{s.glyph}</span></>:<><span className="sa-special-label">{label}</span><span className="sa-special-art">{ICONS[symbol]}</span><span className="sa-special-label sa-card-bottom">{label}</span></>}
 </div>
}
export default function SuperAce({api,user}){
 const [config,setConfig]=useState({mode:"fair",winChance:20,enabled:true});
 const [grid,setGrid]=useState(()=>makeGrid()),[bet,setBet]=useState(0.5),[credits,setCredits]=useState(()=>Number(localStorage.getItem("sa_demo_credits")||1000));
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState("Place your bet and press SPIN"),[win,setWin]=useState(0),[mult,setMult]=useState(1),[freeSpins,setFreeSpins]=useState(0),[freeTotal,setFreeTotal]=useState(0),[auto,setAuto]=useState(false),[sound,setSound]=useState(true),[showBet,setShowBet]=useState(false),[showPay,setShowPay]=useState(false);
 const [adminMode,setAdminMode]=useState("fair"),[adminChance,setAdminChance]=useState(20),[saving,setSaving]=useState(false);
 const autoRef=useRef(false),timerRef=useRef(null),soundRef=useRef(null);
 async function load(){try{const c=await api("/api/super-ace/config");setConfig(c);setAdminMode(c.mode||"fair");setAdminChance(Number(c.winChance||20));}catch{setNotice("Game settings load hoyni. Backend check koro.");}}
 useEffect(()=>{load();return()=>clearTimeout(timerRef.current)},[]);
 function saveCredits(n){setCredits(n);localStorage.setItem("sa_demo_credits",String(n));}
 function tone(freq=520,duration=.12){if(!sound)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!soundRef.current)soundRef.current=new C();const c=soundRef.current,o=c.createOscillator(),g=c.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.04,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+duration)}catch{}}
 async function saveConfig(){setSaving(true);try{const c=await api("/api/admin/super-ace-config",{method:"POST",body:JSON.stringify({mode:adminMode,winChance:Number(adminChance),enabled:config.enabled})});setConfig(c);setNotice("Game settings saved.");}catch(e){setNotice(e.message||"Settings save hoyni.");}finally{setSaving(false)}}
 async function toggleGame(){setSaving(true);try{const c=await api("/api/admin/super-ace-config",{method:"POST",body:JSON.stringify({mode:adminMode,winChance:Number(adminChance),enabled:!config.enabled})});setConfig(c);setNotice(c.enabled?"Game enabled.":"Game disabled.");}catch(e){setNotice(e.message||"Update failed.");}finally{setSaving(false)}}
 function stopAuto(){autoRef.current=false;setAuto(false);clearTimeout(timerRef.current)}
 function spin(isAuto=false){
  if(!config.enabled||busy)return;
  const amount=Math.max(.1,Math.min(100,Number(bet)||.5));
  const isFree=freeSpins>0;
  if(!isFree&&amount>credits){setNotice("Not enough demo balance.");stopAuto();return;}
  setBusy(true);setWin(0);setNotice(isFree?"FREE SPIN":"GOOD LUCK!");tone(300,.08);
  if(!isFree)saveCredits(credits-amount);
  if(isFree)setFreeSpins(v=>Math.max(0,v-1));
  const next=makeGrid(config.mode==="boost");
  const boost=config.mode==="boost"&&Math.random()*100<Number(config.winChance||20);
  if(boost){const sym=pick(["A","K","Q","J","S","H","C","D"]);for(let c=0;c<3;c++)next[c][Math.floor(Math.random()*4)]=sym;}
  setGrid(next);setMult(isFree?2:1);
  let chain=0,total=0,working=next.map(c=>c.slice());
  const runCascade=()=>{
   const currentMult=isFree?FREE_MULT[Math.min(chain,3)]:MULT[Math.min(chain,3)];
   const found=evaluate(working,amount,currentMult);
   if(!found.length){
    const scatters=working.flat().filter(x=>x===SCATTER).length;
    if(scatters>=3){setFreeSpins(v=>v+10);setFreeTotal(v=>v+10);setNotice("FREE GAME! 10 FREE SPINS AWARDED");tone(880,.3);}
    else setNotice(total>0?"WIN TOTAL: "+money(total):"No win. Try again.");
    setWin(total);if(total>0)saveCredits(Number(localStorage.getItem("sa_demo_credits")||credits)+(isFree?0:0)+total);
    setBusy(false);
    if(autoRef.current)timerRef.current=setTimeout(()=>spin(true),900);
    return;
   }
   const best=found[0];total+=best.amount;setWin(total);setMult(currentMult);tone(650+chain*100,.14);
   setNotice("COMBO "+(chain+1)+" · "+best.cols+" REELS · "+best.ways+" WAYS · ×"+currentMult);
   const remove=new Set();
   for(const w of found){for(let c=0;c<w.cols;c++)for(let r=0;r<4;r++)if(working[c][r]===w.sym||working[c][r]===WILD||working[c][r]===GOLD)remove.add(c+":"+r);}
   const before=working.map(c=>c.slice());
   working=working.map((col,c)=>{const survivors=col.filter((_,r)=>!remove.has(c+":"+r));while(survivors.length<4)survivors.unshift(pick(["A","K","Q","J","S","H","C","D","G","W","X"]));return survivors;});
   setGrid(working.map(c=>c.slice()));chain++;
   if(chain<8)timerRef.current=setTimeout(runCascade,650);
   else {setBusy(false);saveCredits(Number(localStorage.getItem("sa_demo_credits")||credits)+total);}
  };
  timerRef.current=setTimeout(runCascade,700);
 }
 function changeBet(delta){setBet(v=>Math.max(.1,Math.min(100,Math.round((Number(v)+delta)*100)/100)))}
 const displayMultiplier=freeSpins>0?FREE_MULT[Math.min(3,Math.max(0,freeTotal-freeSpins))]:MULT[Math.min(3,Math.max(0,mult-1))];
 return <div className="sa-game-shell">
  <div className="sa-game">
   <header className="sa-top"><button className="sa-menu-tab" onClick={()=>setShowPay(v=>!v)}>☰<small>MENU</small></button><div className="sa-title">SUPER ACE</div><button className="sa-buy" onClick={()=>setNotice("Bonus purchase is disabled in this virtual demo.")}>BUY<br/>BONUS</button><div className="sa-multipliers">{MULT.map((m,i)=><span key={m} className={(displayMultiplier===m?"active":"")}>×{m}</span>)}</div><div className="sa-tagline">{freeSpins?"MULTIPLIER REWARD IN FREE GAME":"I HAVE A CHANCE TO WIN"} <b>🃏 WILD</b></div>
   </header>
   <div className="sa-reel-frame"><div className="sa-reel-grid">{grid.map((col,c)=><div className="sa-column" key={c}>{col.map((symbol,r)=><Card key={c+"-"+r+"-"+symbol} symbol={symbol}/>)}</div>)}</div></div>
   <div className="sa-win-line"><span>WIN</span><b>{money(win)}</b></div>
   <footer className="sa-bottom">
    <button className="sa-round-btn" onClick={()=>setShowPay(v=>!v)} title="Settings">⚙</button>
    <button className="sa-round-btn sa-bet-btn" onClick={()=>setShowBet(v=>!v)}>▤<small>Bet {bet}</small></button>
    <button className="sa-spin-btn" disabled={busy||!config.enabled} onClick={()=>spin(false)}>{busy?"✦":"SPIN"}</button>
    <button className={"sa-round-btn "+(auto?"sa-active":"")} onClick={()=>{if(auto)stopAuto();else{autoRef.current=true;setAuto(true);spin(true)}}}>⟳<small>AUTO</small></button>
    <button className={"sa-round-btn "+(sound?"":"sa-muted")} onClick={()=>setSound(v=>!v)}>♫<small>SOUND</small></button>
   </footer>
   <div className="sa-balance"><span>LV 0</span><b>BALANCE</b> {money(credits)} <span className="sa-wifi">▰</span></div>
   {freeSpins>0&&<div className="sa-free-badge">FREE SPINS: {freeSpins}</div>}
   {notice&&<div className="sa-toast">{notice}</div>}
   {showBet&&<div className="sa-popover sa-bet-pop"><b>BET AMOUNT</b><div><button onClick={()=>changeBet(-.1)}>−</button><strong>{bet.toFixed(2)}</strong><button onClick={()=>changeBet(.1)}>+</button></div><div className="sa-bet-presets">{[.5,1,2,5,10].map(n=><button key={n} onClick={()=>{setBet(n);setShowBet(false)}}>{n}</button>)}</div></div>}
   {showPay&&<div className="sa-popover sa-pay-pop"><button className="sa-close" onClick={()=>setShowPay(false)}>×</button><b>PAYTABLE · DEMO VALUES</b>{SUITS.map(s=><div key={s.id}><Card symbol={s.id} small/><span>{s.name}</span><strong>{s.pay}×</strong></div>)}<p>3+ Scatters: 10 Free Spins · Golden Card transforms to Wild during a winning cascade.</p></div>}
  </div>
  <p className="sa-demo-note">ROYAL BET · ORIGINAL VIRTUAL DEMO. Demo credits have no cash value. This is an independently implemented approximation, not the licensed JILI game.</p>
  {user?.role==="admin"&&<section className="sa-admin"><div><h3>Super Ace · Admin Control</h3><small>ADMIN ONLY · GLOBAL GAME SETTINGS</small></div><label className="sa-switch"><input type="checkbox" checked={config.enabled} onChange={toggleGame}/> Game {config.enabled?"ON":"OFF"}</label><div className="sa-admin-grid"><label>Mode<select value={adminMode} onChange={e=>setAdminMode(e.target.value)}><option value="fair">Fair random</option><option value="boost">Demo Boost (visible)</option></select></label><label>Demo win chance (%)<input type="number" min="1" max="60" value={adminChance} onChange={e=>setAdminChance(e.target.value)}/></label></div><button className="sa-save" disabled={saving} onClick={saveConfig}>{saving?"SAVING…":"SAVE SETTINGS"}</button><small>Boost mode is clearly labelled to all players. Virtual demo only.</small></section>}
 </div>;
}
