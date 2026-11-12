import React,{useState} from "react";

const games=[
  {name:"Super Ace",category:"Slot",tag:"TRIAL AVAILABLE",description:"Classic JILI card-themed slot.",trial:true},
  {name:"Fortune Gems 2",category:"Slot",tag:"OFFICIAL LISTING",description:"Gem-themed slot game."},
  {name:"Golden Empire",category:"Slot",tag:"OFFICIAL LISTING",description:"Gold and treasure-themed slot."},
  {name:"Boxing King",category:"Slot",tag:"OFFICIAL LISTING",description:"Boxing-themed slot game."},
  {name:"Mega Ace",category:"Slot",tag:"OFFICIAL LISTING",description:"Ace-themed slot game."},
  {name:"Jackpot Fishing",category:"Fishing",tag:"OFFICIAL LISTING",description:"JILI fishing game."}
];
const catalogUrl="https://jiligames.com/games";
const trialUrl="https://jiligames.com/PlusTrial/49/en-us";
const infoUrl="https://jiligames.com/PlusIntro/49?showGame=true";

export default function JiliSuperAceTrial(){
  const [selected,setSelected]=useState("Super Ace");
  const current=games.find(g=>g.name===selected)||games[0];
  return <section style={{width:"100%",minWidth:0}}>
    <div style={{marginBottom:18}}>
      <h2 style={{margin:"0 0 6px"}}>JILI Popular Games</h2>
      <p style={{margin:0,color:"#9eabb7",fontSize:13}}>Official JILI game listings. Only Super Ace currently has a verified public trial link in this section.</p>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:10,marginBottom:20}}>
      {games.map((game,index)=><button key={game.name} onClick={()=>setSelected(game.name)} style={{textAlign:"left",padding:14,minHeight:112,borderRadius:11,border:selected===game.name?"2px solid #d6a943":"1px solid #34424d",background:selected===game.name?"#182b35":"#0c1b25",color:"#fff",cursor:"pointer"}}>
        <div style={{fontSize:11,color:"#d6a943",fontWeight:800,marginBottom:10}}>{game.category.toUpperCase()}</div>
        <b style={{display:"block",fontSize:15,marginBottom:8}}>{game.name}</b>
        <small style={{color:"#9eabb7",fontSize:10}}>{game.tag}</small>
      </button>)}
    </div>
    <div style={{border:"1px solid #34424d",borderRadius:12,padding:16,background:"#0c1b25"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:12}}>
        <div><h3 style={{margin:"0 0 5px"}}>{current.name}</h3><p style={{margin:0,color:"#9eabb7",fontSize:13}}>{current.description}</p></div>
        {current.trial?<a href={trialUrl} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",padding:"10px 16px",borderRadius:8,background:"#d6a943",color:"#101820",fontWeight:800,textDecoration:"none"}}>Open trial ↗</a>:<a href={catalogUrl} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",padding:"10px 16px",borderRadius:8,background:"#d6a943",color:"#101820",fontWeight:800,textDecoration:"none"}}>View official JILI catalog ↗</a>}
      </div>
      {current.trial?<><div style={{width:"100%",height:"min(76vh,780px)",minHeight:520,background:"#07131c",border:"1px solid #34424d",borderRadius:12,overflow:"hidden"}}><iframe title="JILI Super Ace official trial" src={trialUrl} allow="fullscreen; autoplay" allowFullScreen referrerPolicy="strict-origin" style={{width:"100%",height:"100%",border:0,background:"#07131c"}}/></div><p style={{fontSize:12,color:"#9eabb7",lineHeight:1.5}}>If the provider blocks embedding, use “Open trial”. This public trial is not connected to Royal Bet balance or admin controls.</p><a href={infoUrl} target="_blank" rel="noopener noreferrer" style={{color:"#e2b84f"}}>Super Ace official game information ↗</a></>:<div style={{padding:18,borderRadius:9,background:"#07131c",color:"#9eabb7",fontSize:13,lineHeight:1.6}}>A playable public trial link for {current.name} has not been verified. Use the official JILI catalog to check its current game page. This card does not simulate or claim to launch the original game.</div>}
    </div>
    <p style={{fontSize:11,color:"#82919d",marginTop:12}}>Game names are listed from JILI's catalog. Third-party game launch/API access and embedding permission have not been confirmed.</p>
  </section>;
}
