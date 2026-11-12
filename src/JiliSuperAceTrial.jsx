import React,{useEffect,useState} from "react";

const WALLET_KEY="sa_demo_credits";
const games=[
 {name:"Super Ace",category:"Slot",description:"Open the existing Super Ace trial.",external:true,tag:"ORIGINAL TRIAL"},
 {name:"Fortune Gems 2",category:"Slot",description:"Gem-themed original virtual slot demo.",symbols:["💎","🔴","🟢","🟣","⭐","7️⃣"],pay:{"💎":8,"⭐":5,"7️⃣":4,"🔴":3,"🟢":3,"🟣":3}},
 {name:"Golden Empire",category:"Slot",description:"Treasure-themed original virtual slot demo.",symbols:["👑","🏆","💰","🪙","⚱️","⭐"],pay:{"👑":8,"🏆":6,"💰":4,"🪙":3,"⚱️":3,"⭐":3}},
 {name:"Boxing King",category:"Slot",description:"Boxing-themed original virtual slot demo.",symbols:["🥊","👑","🏅","🧤","⭐","🔥"],pay:{"🥊":8,"👑":6,"🏅":4,"🧤":3,"⭐":3,"🔥":3}},
 {name:"Mega Ace",category:"Slot",description:"Ace-themed original virtual slot demo.",symbols:["🃏","♠️","👑","💎","♥️","⭐"],pay:{"🃏":8,"♠️":6,"👑":5,"💎":4,"♥️":3,"⭐":3}},
 {name:"Jackpot Fishing",category:"Fishing",description:"Fishing-themed original virtual catch demo.",symbols:["🐟","🐠","🐡","🦈","🐙","🦀"],pay:{"🐟":3,"🐠":4,"🐡":5,"🦈":8,"🐙":6,"🦀":4}}
];
const trialUrl="https://jiligames.com/PlusTrial/49/en-us";
const money=n=>Number(n||0).toLocaleString("en-US",{maximumFractionDigits:2});
const readWallet=()=>{try{return Number(localStorage.getItem(WALLET_KEY)??1000)}catch{return 1000}};
function makeGrid(symbols){return Array.from({length:3},()=>Array.from({length:5},()=>symbols[Math.floor(Math.random()*symbols.length)]));}
function evaluate(grid,bet,pay){let total=0,lines=[];for(let r=0;r<3;r++){const row=grid[r];for(const sym of [...new Set(row)]){const count=row.filter(x=>x===sym).length;if(count>=3){const amount=bet*(pay[sym]||3)*(count===3?1:count===4?2:5)/10;total+=amount;lines.push({symbol:sym,count,amount});}}}return{total,lines};}
export default function JiliSuperAceTrial(){
 const [selected,setSelected]=useState("Fortune Gems 2");
 const [credits,setCredits]=useState(readWallet);
 const [bet,setBet]=useState(1);
 const [grid,setGrid]=useState(()=>makeGrid(games[1].symbols));
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("Choose a game and press PLAY.");
 const [lastWin,setLastWin]=useState(0);
 const current=games.find(g=>g.name===selected)||games[1];
 useEffect(()=>{const sync=()=>setCredits(readWallet());window.addEventListener("storage",sync);window.addEventListener("royal-demo-wallet",sync);return()=>{window.removeEventListener("storage",sync);window.removeEventListener("royal-demo-wallet",sync)}},[]);
 useEffect(()=>{if(!current.external)setGrid(makeGrid(current.symbols));setLastWin(0);setMessage(current.external?"Open the public Super Ace trial.":"Ready to play with shared Super Ace demo credits.");},[selected]);
 function saveWallet(value){const next=Math.max(0,Number(value)||0);localStorage.setItem(WALLET_KEY,String(next));setCredits(next);window.dispatchEvent(new Event("royal-demo-wallet"));}
 function play(){if(current.external){window.open(trialUrl,"_blank","noopener,noreferrer");return;}if(busy)return;const amount=Math.max(.1,Math.min(100,Number(bet)||1));const balance=readWallet();if(amount>balance){setMessage("Not enough shared demo credits.");setCredits(balance);return;}saveWallet(balance-amount);setBusy(true);setLastWin(0);setMessage("Spinning…");const next=makeGrid(current.symbols);setGrid(next);window.setTimeout(()=>{const result=evaluate(next,amount,current.pay);setLastWin(result.total);if(result.total>0){saveWallet(readWallet()+result.total);setMessage("WIN · "+money(result.total)+" demo credits");}else setMessage("No win this round. Try again.");setBusy(false);},750);}
 const card=(label)=><div key={label} style={{display:"grid",placeItems:"center",minHeight:76,borderRadius:9,background:"linear-gradient(145deg,#f7e9c2,#c99d4c)",border:"2px solid #f7d98a",fontSize:"clamp(25px,6vw,38px)",boxShadow:"inset 0 0 12px #fff9,0 3px 8px #0008"}}>{label}</div>;
 return <section style={{width:"100%",minWidth:0,color:"#fff"}}>
  <div style={{marginBottom:16}}><h2 style={{margin:"0 0 5px"}}>JILI Games · Demo Room</h2><p style={{margin:0,color:"#9eabb7",fontSize:13}}>Original virtual demo versions. All playable games share the same demo-credit balance as the custom Super Ace game.</p></div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(135px,1fr))",gap:9,marginBottom:16}}>
   {games.map(g=><button key={g.name} onClick={()=>setSelected(g.name)} style={{textAlign:"left",padding:13,minHeight:88,borderRadius:10,border:selected===g.name?"2px solid #e5bb55":"1px solid #34424d",background:selected===g.name?"#263b42":"#0c1b25",color:"#fff",cursor:"pointer"}}><small style={{display:"block",color:"#e5bb55",fontWeight:800,marginBottom:7}}>{g.category.toUpperCase()}</small><b>{g.name}</b><small style={{display:"block",color:"#a9b8c0",marginTop:6}}>{g.external?"PUBLIC TRIAL":"PLAY DEMO"}</small></button>)}
  </div>
  <div style={{border:"1px solid #4a5961",borderRadius:13,padding:14,background:"radial-gradient(ellipse at top,#24434a,#0a1720 75%)"}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:14}}><div><h3 style={{margin:"0 0 4px"}}>{current.name}</h3><small style={{color:"#a9b8c0"}}>{current.description}</small></div><div style={{padding:"9px 12px",background:"#08131a",border:"1px solid #d5ad55",borderRadius:9,color:"#ffdf83",fontWeight:900}}>BALANCE: {money(credits)}</div></div>
   {current.external?<div style={{padding:20,textAlign:"center",background:"#07131c",borderRadius:10}}><p style={{color:"#b8c4ca"}}>The provider's original Super Ace public trial opens separately. It does not use the shared demo wallet.</p><button onClick={play} style={{padding:"12px 22px",border:0,borderRadius:8,background:"#d6a943",fontWeight:900,cursor:"pointer"}}>OPEN SUPER ACE TRIAL ↗</button></div>:<>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:6,padding:8,borderRadius:10,background:"#06131a",border:"2px solid #a9813f"}}>{grid.flatMap((row,r)=>row.map((symbol,c)=>card(symbol)))}</div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginTop:13}}><div style={{color:"#ffdf83",fontWeight:900}}>LAST WIN: {money(lastWin)}</div><div style={{display:"flex",alignItems:"center",gap:7}}><button disabled={busy} onClick={()=>setBet(v=>Math.max(.1,Math.round((v-.5)*100)/100))} style={betBtn}>−</button><b>{bet.toFixed(2)}</b><button disabled={busy} onClick={()=>setBet(v=>Math.min(100,Math.round((v+.5)*100)/100))} style={betBtn}>+</button><button disabled={busy} onClick={()=>setBet(1)} style={betBtn}>1</button><button disabled={busy} onClick={()=>setBet(5)} style={betBtn}>5</button></div></div>
    <button disabled={busy} onClick={play} style={{width:"100%",marginTop:13,padding:15,border:0,borderRadius:9,background:busy?"#77633a":"linear-gradient(#ffe18a,#c88a27)",color:"#211607",fontWeight:1000,fontSize:17,cursor:busy?"wait":"pointer"}}>{busy?"PLAYING…":"PLAY DEMO"}</button>
    <p style={{textAlign:"center",margin:"10px 0 0",color:"#ffdf83",fontWeight:800,fontSize:13}}>{message}</p>
   </>}
  </div>
  <p style={{fontSize:11,color:"#82919d",lineHeight:1.5,marginTop:12}}>These are independently built virtual demo games inspired by the listed themes, not the original licensed JILI games. Demo credits have no cash value. The official provider game requires its own authorized integration.</p>
 </section>;
}
const betBtn={border:"1px solid #b88a3d",borderRadius:7,padding:"7px 11px",background:"#1c3038",color:"#ffdf83",fontWeight:900,cursor:"pointer"};
