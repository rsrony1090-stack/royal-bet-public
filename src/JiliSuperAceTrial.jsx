import React from "react";

export default function JiliSuperAceTrial(){
  const trialUrl="https://jiligames.com/PlusTrial/49/en-us";
  const infoUrl="https://jiligames.com/PlusIntro/49?showGame=true";
  return <section style={{width:"100%",minWidth:0}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:12}}>
      <div><h2 style={{margin:"0 0 5px"}}>JILI Super Ace · Official Trial</h2><p style={{margin:0,color:"#9eabb7",fontSize:13}}>External provider demo · not connected to Royal Bet balance or admin game controls.</p></div>
      <a href={trialUrl} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",padding:"10px 16px",borderRadius:8,background:"#d6a943",color:"#101820",fontWeight:800,textDecoration:"none"}}>Open trial in new tab ↗</a>
    </div>
    <div style={{width:"100%",height:"min(76vh,780px)",minHeight:520,background:"#07131c",border:"1px solid #34424d",borderRadius:12,overflow:"hidden"}}>
      <iframe title="JILI Super Ace official trial" src={trialUrl} allow="fullscreen; autoplay" allowFullScreen referrerPolicy="strict-origin- referrer" style={{width:"100%",height:"100%",border:0,background:"#07131c"}}/>
    </div>
    <p style={{fontSize:12,color:"#9eabb7",lineHeight:1.5}}>If the provider blocks embedding, use “Open trial in new tab”. This preview uses JILI's public trial page; JILI integration permission and a production game API have not been granted or confirmed.</p>
    <a href={infoUrl} target="_blank" rel="noopener noreferrer" style={{color:"#e2b84f"}}>JILI official Super Ace information ↗</a>
  </section>;
}
