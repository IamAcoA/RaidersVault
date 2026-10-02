(()=>{"use strict";
const $=id=>document.getElementById(id);
const SUITS=["♠","♥","♦","♣"],RANKS=[2,3,4,5,6,7,8,9,10,11,12,13,14];
const RN={11:"J",12:"Q",13:"K",14:"A"};
const POS=["UTG","HJ","CO","BTN","SB","BB"];
const POST_RANK={SB:0,BB:1,UTG:2,HJ:3,CO:4,BTN:5};
const BOT_PROFILES=[
{name:"Rio",style:"Loose-passive",loose:.22,agg:.28},
{name:"Tess",style:"Aggressive",loose:.10,agg:.82},
{name:"Mack",style:"Tight",loose:-.08,agg:.42},
{name:"Dex",style:"Balanced",loose:.02,agg:.55},
{name:"Lou",style:"Tight-aggressive",loose:-.04,agg:.72}
];
const G=[
{street:"Preflop",context:"$1/$2. You are on the button. Two players limp for $2.",hole:["A♣","T♣"],board:[],q:"Best default?",a:["Call $2","Raise to $8","Raise to $12–$14","Fold"],c:2,h:"Position + suited ace + dead money. Will $8 actually isolate?",e:"Raise bigger. With two limpers, around $12–$14 is a better live-game isolation size."},
{street:"Flop",context:"You raised and one player called. Pot $29. Villain checks.",hole:["A♣","T♣"],board:["A♦","9♣","6♣"],q:"Best default?",a:["Check","Bet $10","Bet $18–$20","Shove"],c:2,h:"Top pair plus the nut-flush draw. What worse hands can call?",e:"Bet for value. Worse aces, 9x, straight draws and lower club draws can all continue."},
{street:"Turn",context:"Pot $69. You bet flop and got called. Villain checks.",hole:["A♣","T♣"],board:["A♦","9♣","6♣","8♥"],q:"Best default?",a:["Check back","Bet $25","Bet $50","Shove"],c:0,h:"The 8 improves several pieces of the caller's range.",e:"Check back. You still have showdown value and the nut-flush draw, while the turn improved T7, 75, 98 and 88."},
{street:"Flop",context:"Six players saw the flop. A player bets $8 into $12.",hole:["8♠","7♠"],board:["9♠","6♦","2♠"],q:"Best aggressive option?",a:["Fold","Call only","Raise $25–$30","Shove"],c:2,h:"Count straight and flush outs.",e:"Raise is a strong semi-bluff. Your combo draw has major equity and the raise can fold out better made hands."},
{street:"River",context:"Pot $230. You called a turn bet. Villain bets $120 on a blank river.",hole:["K♠","Q♠"],board:["K♦","8♠","3♣","A♥","2♦"],q:"Best default vs a normal $1/$2 player?",a:["Fold","Call","Raise","Shove"],c:0,h:"You need to be right about a quarter of the time. Is this line bluffed that often?",e:"Fold by default. A second sizable river barrel from a normal low-stakes player is usually too value-heavy."},
{street:"Pot Odds",context:"Pot $100. Villain bets $50.",hole:["Q♠","J♠"],board:["T♠","4♦","2♠"],q:"Equity needed to call?",a:["20%","25%","33%","50%"],c:1,h:"Your $50 call creates a $200 final pot.",e:"25%. Call cost divided by final pot: 50 / 200."},
{street:"Preflop",context:"$1/$2. You are UTG with a marginal offsuit ace.",hole:["A♣","8♦"],board:[],q:"Best default?",a:["Raise","Limp","Fold","Shove"],c:2,h:"Think domination and position.",e:"Fold. A8 offsuit gets dominated too often and plays poorly out of position."},
{street:"Preflop",context:"$1/$2. Everyone folds to you on the button.",hole:["9♠","8♠"],board:[],q:"Best default?",a:["Fold","Raise","Limp","Shove"],c:1,h:"Late position lets you open wider.",e:"Raise. Suited connectors gain value from position, fold equity and postflop playability."}
];

let mode="live",coachTiming="end";
let handNo=0,sessionNet=0,live=null,spot=null,gidx=0,gscore=0,gatt=0,tableSeats=null,tableButtonSeat=null,liveSessionActive=false;

function show(id){document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));$(id).classList.add("active");window.scrollTo(0,0)}
function rand(n){return Math.floor(Math.random()*n)}
function choice(a){return a[rand(a.length)]}
function shuffle(a){for(let i=a.length-1;i>0;i--){let j=rand(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function money(n){return "$"+Math.max(0,Math.round(n))}
function makeDeck(){let d=[];for(const s of SUITS)for(const r of RANKS)d.push({r,s});return shuffle(d)}
function ct(c){return (RN[c.r]||c.r)+c.s}
function parseCard(t){const s=t.slice(-1),x=t.slice(0,-1);return {r:x==="A"?14:x==="K"?13:x==="Q"?12:x==="J"?11:x==="T"?10:Number(x),s}}
function cardHTML(c,back=false){if(back)return '<div class="card back">??</div>';let x=typeof c==="string"?parseCard(c):c;return '<div class="card '+((x.s==="♥"||x.s==="♦")?"red":"")+'"><span>'+(RN[x.r]||x.r)+'</span><span>'+x.s+'</span></div>'}
function miniCards(cards,hide=false){return cards.map(c=>cardHTML(c,hide)).join("")}

function cmpArr(a,b){for(let i=0;i<Math.max(a.length,b.length);i++){let x=a[i]||0,y=b[i]||0;if(x!==y)return x-y}return 0}
function eval5(c){
 let rs=c.map(x=>x.r).sort((a,b)=>b-a),cnt={};rs.forEach(r=>cnt[r]=(cnt[r]||0)+1);
 let groups=Object.entries(cnt).map(([r,n])=>({r:+r,n})).sort((a,b)=>b.n-a.n||b.r-a.r);
 let flush=c.every(x=>x.s===c[0].s),u=[...new Set(rs)],sh=0;
 if(u[0]===14)u.push(1);
 for(let i=0;i<=u.length-5;i++)if(u[i]-u[i+4]===4){sh=u[i];break}
 if(flush&&sh)return[8,sh];
 if(groups[0].n===4)return[7,groups[0].r,groups.find(g=>g.n===1).r];
 if(groups[0].n===3&&groups[1]&&groups[1].n>=2)return[6,groups[0].r,groups[1].r];
 if(flush)return[5,...rs];
 if(sh)return[4,sh];
 if(groups[0].n===3)return[3,groups[0].r,...groups.filter(g=>g.n===1).map(g=>g.r).sort((a,b)=>b-a)];
 let pairs=groups.filter(g=>g.n===2).sort((a,b)=>b.r-a.r);
 if(pairs.length>=2){let k=groups.filter(g=>g.n===1).map(g=>g.r).sort((a,b)=>b-a)[0];return[2,pairs[0].r,pairs[1].r,k]}
 if(pairs.length===1)return[1,pairs[0].r,...groups.filter(g=>g.n===1).map(g=>g.r).sort((a,b)=>b-a)];
 return[0,...rs]
}
function bestEval(cards){
 if(cards.length<5)return[0,...cards.map(c=>c.r).sort((a,b)=>b-a)];
 let best=null,n=cards.length;
 for(let a=0;a<n-4;a++)for(let b=a+1;b<n-3;b++)for(let c=b+1;c<n-2;c++)for(let d=c+1;d<n-1;d++)for(let e=d+1;e<n;e++){let v=eval5([cards[a],cards[b],cards[c],cards[d],cards[e]]);if(!best||cmpArr(v,best)>0)best=v}
 return best
}
const CAT=["High card","One pair","Two pair","Three of a kind","Straight","Flush","Full house","Four of a kind","Straight flush"];
function handName(cards){return CAT[bestEval(cards)[0]]}
function preScore(h){
 let a=Math.max(h[0].r,h[1].r),b=Math.min(h[0].r,h[1].r),pair=a===b,suited=h[0].s===h[1].s,gap=a-b;
 if(pair)return Math.min(100,49+a*3.5);
 let sc=a*3.6+b*1.7+(suited?7:0)+(gap===1?5:gap===2?2:0)-(gap>=5?5:0);
 if(a===14)sc+=4;if(a>=13&&b>=10)sc+=5;return Math.max(0,Math.min(100,sc))
}
function openThreshold(pos){return {UTG:72,HJ:68,CO:61,BTN:54,SB:60,BB:58}[pos]||65}
function postStrength(h,b){
 let ev=bestEval(h.concat(b)),cat=ev[0],base=[.12,.34,.58,.68,.78,.82,.93,.98,1][cat];
 if(cat===1&&b.length){
   let hr=h.map(c=>c.r),br=b.map(c=>c.r),max=Math.max(...br);
   if(h[0].r===h[1].r&&h[0].r>max)base=.57;
   else if(hr.includes(max))base=.50;
 }
 let all=h.concat(b),suits={};all.forEach(c=>suits[c.s]=(suits[c.s]||0)+1);
 let fd=Object.values(suits).some(n=>n===4)&&cat<5;
 let seen=new Set(all.map(c=>c.r)),sd=false;
 if(cat<4){
   for(const r of RANKS){if(seen.has(r))continue;let test=all.concat([{r,s:"♠"}]);if(bestEval(test)[0]>=4){sd=true;break}}
 }
 let bonus=(fd?.13:0)+(sd?.10:0);
 return {v:Math.min(1,base+bonus),base,fd,sd,cat,name:CAT[cat]}
}
function boardWet(b){
 if(b.length<3)return false;let suits={};b.forEach(c=>suits[c.s]=(suits[c.s]||0)+1);
 let two=Object.values(suits).some(n=>n>=2),rs=[...new Set(b.map(c=>c.r))].sort((a,b)=>a-b),conn=false;
 for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++)if(rs[j]-rs[i]<=4)conn=true;
 return two&&conn
}
function labelAction(k,amt){if(k==="fold")return"Fold";if(k==="check")return"Check";if(k==="call")return"Call "+money(amt);if(k==="raise")return"Raise to "+money(amt);if(k==="betSmall")return"Bet "+money(amt);if(k==="betBig")return"Bet "+money(amt);return k}

function coachPreflop(st){
 const hero=st.seats[0],score=preScore(hero.cards),th=openThreshold(hero.pos),toCall=Math.max(0,st.currentBet-hero.streetInvest);
 if(st.currentBet<=2){
   if(toCall===0){
     if(score>=th-2)return{k:"raise",ok:["raise"],why:"Your hand is strong enough to build the pot from "+hero.pos+"."};
     return{k:"check",ok:["check"],why:"You can see the flop without adding money; there is no reason to fold your option."}
   }
   if(score>=th)return{k:"raise",ok:["raise"],why:"This hand clears the opening threshold for "+hero.pos+"; raise rather than limp."};
   if(score>=th-9&&(hero.cards[0].s===hero.cards[1].s||hero.cards[0].r===hero.cards[1].r))return{k:"call",ok:["call","raise"],why:"This is a playable speculative hand at a cheap price; calling is fine and an isolation raise can also work."};
   return{k:"fold",ok:["fold"],why:"This holding is too weak for this position and price. Save the chips."}
 }
 if(score>=th+15)return{k:"raise",ok:["raise","call"],why:"Your hand is strong enough to continue aggressively against the raise."};
 if(score>=th+1)return{k:"call",ok:["call"],why:"You have enough strength to continue, but not enough to automatically inflate the pot."};
 return{k:"fold",ok:["fold"],why:"Against a raise, this hand is too dominated or too weak to continue profitably."}
}
function coachPost(st,facing,toCall){
 const h=postStrength(st.seats[0].cards,st.board),wet=boardWet(st.board),pot=st.pot;
 if(facing){
   let req=toCall/(pot+toCall),est=h.v;
   if(h.base>=.78)return{k:"raise",ok:["raise","call"],why:h.name+" is strong enough to raise for value; calling is also defensible against some lines."};
   if((h.fd&&h.sd)&&est>=req)return{k:"raise",ok:["raise","call"],why:"Your combo draw has enough equity to continue and can profitably apply pressure."};
   if(est>=req+.07)return{k:"call",ok:["call"],why:"The price requires about "+Math.round(req*100)+"% equity, and your made hand/draw is strong enough to continue."};
   if(est>=req-.02)return{k:"call",ok:["call","fold"],why:"This is close. The price is near the edge of your estimated equity, so opponent tendencies matter."};
   return{k:"fold",ok:["fold"],why:"The price is too high for the strength of your hand and draw."}
 }else{
   if(h.base>=.78)return{k:"betBig",ok:["betBig","betSmall"],why:"You have a very strong made hand. Build a pot and charge worse hands."};
   if(h.base>=.55)return{k:wet?"betBig":"betSmall",ok:wet?["betBig","betSmall"]:["betSmall","check"],why:"You have a value hand. "+(wet?"The coordinated board favors a larger protection/value size.":"The dry board lets you use a smaller value size.")};
   if(h.base>=.45)return{k:"check",ok:["check","betSmall"],why:"You have showdown value but not a hand that needs a large pot."};
   if((h.fd||h.sd)&&POST_RANK[st.seats[0].pos]>=3)return{k:"betSmall",ok:["betSmall","check"],why:"Your draw can semi-bluff in position while retaining equity when called."};
   return{k:"check",ok:["check"],why:"Your hand is weak enough that checking preserves chips and realizes whatever equity remains."}
 }
}

function makeSeats(){
 const seats=[{id:0,name:"You",style:"Hero",profile:{loose:0,agg:0},stack:300,busted:false}];
 BOT_PROFILES.forEach((p,i)=>seats.push({id:i+1,name:p.name,style:p.style,profile:p,stack:300,busted:false}));
 return seats
}
function nextActiveSeat(from){
 if(!tableSeats)return null;
 const active=tableSeats.filter(s=>s.stack>0);
 if(!active.length)return null;
 if(from===null||from===undefined)return active[0].id;
 for(let step=1;step<=tableSeats.length;step++){
   const id=(from+step)%tableSeats.length;
   if(tableSeats[id].stack>0)return id
 }
 return active[0].id
}
function assignPositions(seats,buttonSeat){
 seats.forEach(s=>s.pos="OUT");
 const clockwise=[];
 for(let step=0;step<seats.length;step++){
   const s=seats[(buttonSeat+step)%seats.length];
   if(s.stack>0)clockwise.push(s)
 }
 const n=clockwise.length;
 const layouts={
   6:["BTN","SB","BB","UTG","HJ","CO"],
   5:["BTN","SB","BB","UTG","CO"],
   4:["BTN","SB","BB","CO"],
   3:["BTN","SB","BB"],
   2:["BTN","BB"],
   1:["BTN"]
 };
 const labels=layouts[n]||[];
 clockwise.forEach((s,i)=>s.pos=labels[i]||"OUT")
}
function preflopOrder(seats){
 const names=["UTG","HJ","CO","BTN","SB","BB"];
 return names.map(p=>seats.find(s=>s.pos===p&&s.stack>=0&&!s.busted)).filter(Boolean)
}
function startLiveSession(){
 handNo=0;sessionNet=0;tableSeats=makeSeats();tableButtonSeat=null;liveSessionActive=true;
 newLiveHand()
}
function put(st,seat,target){
 target=Math.min(target,seat.streetInvest+seat.stack);let d=Math.max(0,target-seat.streetInvest);seat.stack-=d;seat.streetInvest+=d;st.pot+=d;if(seat.id===0)st.heroInvested+=d
}
function botPreAction(st,seat,allowRaise=true){
 let sc=preScore(seat.cards),th=openThreshold(seat.pos)-seat.profile.loose*35,toCall=st.currentBet-seat.streetInvest;
 if(st.currentBet<=2){
   if(toCall===0)return{kind:sc>=th&&allowRaise?"raise":"check"};
   if(sc>=th+6&&allowRaise&&Math.random()<seat.profile.agg)return{kind:"raise"};
   if(sc>=th-10)return{kind:Math.random()<.45+seat.profile.loose?"call":"raise"};
   if(Math.random()<.08+seat.profile.loose)return{kind:"call"};return{kind:"fold"}
 }else{
   if(sc>=th+17&&allowRaise&&Math.random()<seat.profile.agg*.7)return{kind:"raise"};
   if(sc>=th+1)return{kind:"call"};
   if(sc>=th-7&&Math.random()<.18+seat.profile.loose)return{kind:"call"};
   return{kind:"fold"}
 }
}
function logLive(t){live.log.push(t);renderLog()}
function renderLog(){if(!$("liveLog"))return;$("liveLog").innerHTML=live.log.slice(-10).map(x=>'<div class="logline">'+x+'</div>').join("");$("liveLog").scrollTop=$("liveLog").scrollHeight}
function preBotApply(st,seat,act,allowRaise=true){
 let toCall=st.currentBet-seat.streetInvest;
 if(act.kind==="fold"){seat.folded=true;logLive(seat.name+" folds.");return}
 if(act.kind==="check"){logLive(seat.name+" checks.");return}
 if(act.kind==="call"){put(st,seat,st.currentBet);logLive(seat.name+(st.currentBet<=2?" limps.":" calls "+money(toCall)+"."));return}
 if(act.kind==="raise"){
   let limpers=st.seats.filter(s=>!s.folded&&s.streetInvest===2).length;
   let target=st.currentBet<=2?Math.max(8,8+Math.max(0,limpers-1)*2):Math.max(st.currentBet*3,st.currentBet+10);
   target=Math.min(target,seat.streetInvest+seat.stack);put(st,seat,target);st.currentBet=target;logLive(seat.name+" raises to "+money(target)+".")
 }
}
function newLiveHand(){
 if(!liveSessionActive||!tableSeats)return startLiveSession();
 const activeBefore=tableSeats.filter(s=>s.stack>0);
 if(tableSeats[0].stack<=0||activeBefore.length<=1){
   liveSessionActive=false;
   return show("home")
 }
 handNo++;tableButtonSeat=nextActiveSeat(tableButtonSeat);assignPositions(tableSeats,tableButtonSeat);
 let seats=tableSeats,d=makeDeck();
 seats.forEach(s=>{
   s.busted=s.stack<=0;
   s.cards=s.busted?[]:[d.pop(),d.pop()];
   s.streetInvest=0;s.folded=s.busted;s.handStartStack=s.stack
 });
 live={deck:d,seats,buttonSeat:tableButtonSeat,pot:0,currentBet:0,heroInvested:0,board:[],street:"Preflop",log:[],decisions:[],ended:false,villain:null,sessionStartNet:sessionNet};
 const sb=seats.find(s=>s.pos==="SB")||seats.find(s=>s.pos==="BTN");
 const bb=seats.find(s=>s.pos==="BB");
 if(sb)put(live,sb,1);
 if(bb)put(live,bb,2);
 live.currentBet=Math.max(sb?sb.streetInvest:0,bb?bb.streetInvest:0);
 logLive("Hand "+handNo+". Blinds posted. You are "+seats[0].pos+".");
 let order=preflopOrder(seats);
 for(const s of order){if(s.id===0)break;if(!s.folded)preBotApply(live,s,botPreAction(live,s,true),true)}
 show("liveScreen");renderLive();presentPreflop()
}
function renderSeats(){
 for(let i=0;i<6;i++){
   let s=live.seats[i],box=$("seat"+i),out=s.stack<=0;
   box.className="seat s"+i+(i===0?" hero":"")+(live.villain&&live.villain.id===i?" active":"")+(out?" busted":"");
   box.innerHTML='<div class="avatar">'+(i===0?"YOU":s.name[0])+'</div><div class="name">'+s.name+' · '+(out?"OUT":s.pos)+'</div><div class="meta">'+(out?"Eliminated":money(s.stack)+(i?(" · "+s.style):""))+'</div>'
 }
}
function renderLive(){
 renderSeats();$("livePot").textContent=money(live.pot);$("liveStreet").textContent=live.street;$("liveNet").textContent=(sessionNet>=0?"+":"-")+money(Math.abs(sessionNet));
 if($("livePlayers"))$("livePlayers").textContent=live.seats.filter(s=>s.stack>0).length+"/6";
 $("heroHole").innerHTML=miniCards(live.seats[0].cards);$("liveBoard").innerHTML=live.board.map(c=>cardHTML(c)).join("");renderLog()
}
function clearDecision(){
 $("livePrompt").textContent="";$("liveActions").innerHTML="";$("liveHint").style.display="none";$("liveFeedback").style.display="none";$("handEnd").style.display="none";$("liveHintBtn").style.display="inline-block"
}
function addDecisionButtons(opts,handler){
 const box=$("liveActions");box.innerHTML="";opts.forEach(o=>{let b=document.createElement("button");b.className="action "+(o.kind==="fold"?"fold":(o.kind.includes("bet")||o.kind==="raise")?"raise":"");b.textContent=o.label;b.addEventListener("click",()=>handler(o));box.appendChild(b)})
}
function liveHint(coach){$("liveHint").textContent="Think first: "+coach.why;$("liveHint").style.display="block"}
function recordDecision(street,chosen,coach){
 let ok=coach.ok.includes(chosen.kind);live.decisions.push({street,chosen:chosen.label,preferred:labelAction(coach.k,chosen.amount||0),ok,why:coach.why});
 if(coachTiming==="instant"){let f=$("liveFeedback");f.className="feedback "+(ok?"good":"bad");f.innerHTML="<b>"+(ok?"Solid decision.":"Coach prefers another line.")+"</b><br>"+coach.why;f.style.display="block"}
}
function presentPreflop(){
 clearDecision();renderLive();let hero=live.seats[0],toCall=Math.max(0,live.currentBet-hero.streetInvest),coach=coachPreflop(live);
 $("livePrompt").textContent=toCall?"Action is on you. "+money(toCall)+" to call.":"Action is on you.";
 let opts=[];
 if(toCall===0){opts=[{kind:"check",label:"Check"},{kind:"raise",amount:Math.min(hero.streetInvest+hero.stack,Math.max(8,live.currentBet*4)),label:"Raise"}]}
 else{
   let rt=live.currentBet<=2?Math.max(8,8+live.seats.filter(s=>s.streetInvest===2&&!s.folded).length*2):Math.max(live.currentBet*3,live.currentBet+10);
   opts=[{kind:"fold",label:"Fold"},{kind:"call",amount:toCall,label:"Call "+money(toCall)},{kind:"raise",amount:Math.min(hero.streetInvest+hero.stack,rt),label:"Raise to "+money(Math.min(hero.streetInvest+hero.stack,rt))}]
 }
 $("liveHintBtn").onclick=()=>liveHint(coach);
 addDecisionButtons(opts,o=>resolvePreflop(o,coach))
}
function resolvePreflop(o,coach){
 recordDecision("Preflop",o,coach);let hero=live.seats[0];
 if(o.kind==="fold"){hero.folded=true;logLive("You fold.");return endHand("fold")}
 if(o.kind==="check")logLive("You check.");
 if(o.kind==="call"){put(live,hero,live.currentBet);logLive("You call "+money(o.amount)+".")}
 if(o.kind==="raise"){put(live,hero,o.amount);live.currentBet=o.amount;logLive("You raise to "+money(o.amount)+".")}
 let order=preflopOrder(live.seats),passedHero=false;
 for(const s of order){
   if(s.id===0){passedHero=true;continue}
   if(!passedHero||s.folded)continue;
   let act=botPreAction(live,s,false);if(live.currentBet>s.streetInvest&&act.kind==="raise")act.kind="call";preBotApply(live,s,act,false)
 }
 let surv=live.seats.filter(s=>s.id!==0&&!s.folded&&s.streetInvest>=live.currentBet);
 if(!surv.length){logLive("Everyone folds. You win the pot.");return endHand("villainFold")}
 surv.sort((a,b)=>b.streetInvest-a.streetInvest||preScore(b.cards)-preScore(a.cards));live.villain=surv[0];
 surv.slice(1).forEach(s=>{s.folded=true;logLive(s.name+" releases. Training continues heads-up with "+live.villain.name+".")});
 for(const s of live.seats)s.streetInvest=0;live.currentBet=0;
 live.board.push(live.deck.pop(),live.deck.pop(),live.deck.pop());live.street="Flop";logLive("Flop: "+live.board.map(ct).join(" "));
 prepareStreet()
}
function heroIP(){return POST_RANK[live.seats[0].pos]>POST_RANK[live.villain.pos]}
function botLead(){
 let b=postStrength(live.villain.cards,live.board),p=live.villain.profile,bluff=Math.random()<.06+p.agg*.10;
 if(b.base>=.78||b.base>=.55&&Math.random()<.72||((b.fd||b.sd)&&Math.random()<p.agg*.55)||bluff){
   let frac=(b.base>=.7||boardWet(live.board))?.66:.38,amt=Math.max(4,Math.round(live.pot*frac/2)*2);amt=Math.min(amt,live.villain.stack);put(live,live.villain,amt);live.currentBet=amt;logLive(live.villain.name+" bets "+money(amt)+".");return{kind:"bet",amount:amt}
 }
 logLive(live.villain.name+" checks.");return{kind:"check",amount:0}
}
function botRespond(heroBet){
 let v=live.villain,b=postStrength(v.cards,live.board),toCall=live.currentBet-v.streetInvest,req=toCall/(live.pot+toCall),adj=b.v+v.profile.loose*.08;
 if(b.base>=.82&&v.stack>toCall&&Math.random()<.45+v.profile.agg*.35){
   let target=Math.min(v.streetInvest+v.stack,Math.max(live.currentBet*3,live.currentBet+Math.round(live.pot*.5)));put(live,v,target);live.currentBet=target;logLive(v.name+" raises to "+money(target)+".");return{kind:"raise",amount:target}
 }
 if(adj>=req+.07||Math.random()<v.profile.loose*.12){put(live,v,live.currentBet);logLive(v.name+" calls.");return{kind:"call"}}
 v.folded=true;logLive(v.name+" folds.");return{kind:"fold"}
}
function prepareStreet(){
 for(const s of live.seats)s.streetInvest=0;live.currentBet=0;clearDecision();renderLive();
 if(heroIP()){let a=botLead();renderLive();if(a.kind==="bet")presentFacingBet();else presentOpenAction()}
 else presentOpenAction()
}
function betSizes(){
 let h=live.seats[0],small=Math.min(h.stack,Math.max(4,Math.round(live.pot*.35/2)*2)),big=Math.min(h.stack,Math.max(6,Math.round(live.pot*.68/2)*2));return{small,big}
}
function presentOpenAction(){
 renderLive();let coach=coachPost(live,false,0),z=betSizes();$("livePrompt").textContent="Action is on you.";
 $("liveHintBtn").onclick=()=>liveHint(coach);
 addDecisionButtons([{kind:"check",label:"Check"},{kind:"betSmall",amount:z.small,label:"Bet "+money(z.small)},{kind:"betBig",amount:z.big,label:"Bet "+money(z.big)}],o=>resolveOpen(o,coach))
}
function resolveOpen(o,coach){
 recordDecision(live.street,o,coach);let hero=live.seats[0];
 if(o.kind==="check"){logLive("You check.");if(heroIP())return advanceStreet();let a=botLead();renderLive();if(a.kind==="bet")return presentFacingBet();return advanceStreet()}
 let amt=o.amount;put(live,hero,amt);live.currentBet=amt;logLive("You bet "+money(amt)+".");
 let r=botRespond(amt);renderLive();if(r.kind==="fold")return endHand("villainFold");if(r.kind==="raise")return presentFacingRaise();return advanceStreet()
}
function presentFacingBet(){
 renderLive();let hero=live.seats[0],toCall=live.currentBet-hero.streetInvest,coach=coachPost(live,true,toCall),raiseTo=Math.min(hero.streetInvest+hero.stack,Math.max(live.currentBet*3,live.currentBet+Math.round(live.pot*.5)));
 $("livePrompt").textContent=live.villain.name+" has bet. "+money(toCall)+" to call.";
 $("liveHintBtn").onclick=()=>liveHint(coach);
 addDecisionButtons([{kind:"fold",label:"Fold"},{kind:"call",amount:toCall,label:"Call "+money(toCall)},{kind:"raise",amount:raiseTo,label:"Raise to "+money(raiseTo)}],o=>resolveFacing(o,coach))
}
function presentFacingRaise(){
 renderLive();let hero=live.seats[0],toCall=live.currentBet-hero.streetInvest,coach=coachPost(live,true,toCall);
 $("livePrompt").textContent=live.villain.name+" raised. "+money(toCall)+" more to call.";
 $("liveHintBtn").onclick=()=>liveHint(coach);
 addDecisionButtons([{kind:"fold",label:"Fold"},{kind:"call",amount:toCall,label:"Call "+money(toCall)}],o=>resolveFacing(o,coach))
}
function resolveFacing(o,coach){
 recordDecision(live.street,o,coach);let hero=live.seats[0],toCall=live.currentBet-hero.streetInvest;
 if(o.kind==="fold"){hero.folded=true;logLive("You fold.");return endHand("fold")}
 if(o.kind==="call"){put(live,hero,live.currentBet);logLive("You call "+money(toCall)+".");return advanceStreet()}
 if(o.kind==="raise"){
   put(live,hero,o.amount);live.currentBet=o.amount;logLive("You raise to "+money(o.amount)+".");let r=botRespond(o.amount);renderLive();if(r.kind==="fold")return endHand("villainFold");if(r.kind==="raise")return presentFacingRaise();return advanceStreet()
 }
}
function advanceStreet(){
 if(live.street==="River")return showdown();
 if(live.street==="Flop"){live.board.push(live.deck.pop());live.street="Turn"}
 else if(live.street==="Turn"){live.board.push(live.deck.pop());live.street="River"}
 logLive(live.street+": "+ct(live.board[live.board.length-1]));prepareStreet()
}
function showdown(){
 logLive("Showdown.");let h=bestEval(live.seats[0].cards.concat(live.board)),v=bestEval(live.villain.cards.concat(live.board)),c=cmpArr(h,v);
 if(c>0)endHand("heroShowdown");else if(c<0)endHand("villainShowdown");else endHand("tie")
}
function endHand(reason){
 live.ended=true;clearDecision();
 let hero=live.seats[0],won=0,title="",reveal=false,recipient=null;
 const opponents=live.seats.filter(s=>s.id!==0&&!s.folded&&s.cards&&s.cards.length===2);
 const fallbackOpponent=live.villain||opponents.sort((a,b)=>b.streetInvest-a.streetInvest||preScore(b.cards)-preScore(a.cards))[0]||live.seats.find(s=>s.id!==0&&s.stack>0);

 if(reason==="villainFold"){
   recipient=hero;won=live.pot;title="You win "+money(live.pot)+".";
 }else if(reason==="fold"){
   recipient=fallbackOpponent;
   if(recipient)recipient.stack+=live.pot;
   title="You folded. "+(recipient?recipient.name+" takes "+money(live.pot)+".":"Pot awarded.");
 }else if(reason==="heroShowdown"){
   recipient=hero;won=live.pot;title="You win at showdown.";
 }else if(reason==="villainShowdown"){
   recipient=live.villain||fallbackOpponent;
   if(recipient)recipient.stack+=live.pot;
   title=(recipient?recipient.name:"Villain")+" wins at showdown.";reveal=true;
 }else if(reason==="tie"){
   const v=live.villain||fallbackOpponent,heroShare=Math.floor(live.pot/2),villainShare=live.pot-heroShare;
   hero.stack+=heroShare;won=heroShare;if(v)v.stack+=villainShare;
   title="Split pot.";reveal=true
 }
 if((reason==="villainFold"||reason==="heroShowdown")&&recipient===hero)hero.stack+=live.pot;
 if(reason==="heroShowdown")reveal=true;

 live.seats.forEach(s=>{s.busted=s.stack<=0});
 sessionNet=hero.stack-300;
 const net=hero.stack-hero.handStartStack;
 const newlyOut=live.seats.filter(s=>s.stack<=0&&s.handStartStack>0);
 newlyOut.forEach(s=>logLive((s.id===0?"You":s.name)+" has been knocked out."));
 renderLive();

 $("handEnd").style.display="block";$("handWinner").textContent=title+"  Hand: "+(net>=0?"+":"-")+money(Math.abs(net));
 $("heroShow").innerHTML='<b>You</b><div class="miniCards">'+miniCards(hero.cards)+'</div><div class="muted">'+(live.board.length>=3?handName(hero.cards.concat(live.board)):"")+'</div>';
 $("villainShow").innerHTML='<b>'+(live.villain?live.villain.name:"Table")+'</b><div class="miniCards">'+(live.villain?miniCards(live.villain.cards,!reveal):miniCards([{r:2,s:"♠"},{r:2,s:"♥"}],true))+'</div><div class="muted">'+(reveal&&live.villain?handName(live.villain.cards.concat(live.board)):"Mucked")+'</div>';
 $("handReview").innerHTML=live.decisions.length?live.decisions.map(d=>'<div class="reviewitem"><b>'+d.street+' · <span class="'+(d.ok?"taggood":"tagwarn")+'">'+(d.ok?"Solid":"Review")+'</span></b>You: '+d.chosen+' · Coach: '+d.preferred+'<br><span class="muted">'+d.why+'</span></div>').join(""):'<div class="muted">No decision points this hand.</div>';

 const active=live.seats.filter(s=>s.stack>0);
 if(hero.stack<=0){
   liveSessionActive=false;$("nextHand").textContent="Start New Session";$("nextHand").onclick=startLiveSession;
   $("handWinner").textContent+="  You are out."
 }else if(active.length===1){
   liveSessionActive=false;$("nextHand").textContent="Start New Session";$("nextHand").onclick=startLiveSession;
   $("handWinner").textContent+="  You won the table."
 }else{
   $("nextHand").textContent="Deal Next Hand";$("nextHand").onclick=newLiveHand
 }
}

function randomHole(deck){return[deck.pop(),deck.pop()]}
function newSpot(){
 let d=makeDeck(),street=choice(["Preflop","Flop","Turn","River"]),hero=randomHole(d),board=[],pos=choice(POS),pot=choice([18,24,32,46,64,90,120,150]),facing=false,bet=0,st={seats:[{cards:hero,pos,streetInvest:0,stack:300}],board,pot,currentBet:0};
 if(street==="Preflop"){
   let sit=choice(["unopened","limpers","raise"]);if(sit==="unopened"){st.currentBet=2;spot={street,hero,board,pos,pot:3,context:"$1/$2. Everyone folds to you in "+pos+".",toCall:pos==="BB"?0:2,st}}
   else if(sit==="limpers"){st.currentBet=2;spot={street,hero,board,pos,pot:choice([7,9,11]),context:"$1/$2. Two players limp and action reaches you in "+pos+".",toCall:pos==="BB"?0:2,st}}
   else{st.currentBet=8;spot={street,hero,board,pos,pot:choice([12,15,18]),context:"$1/$2. A player raises to $8 and action reaches you in "+pos+".",toCall:8,st}}
 }else{
   let n=street==="Flop"?3:street==="Turn"?4:5;for(let i=0;i<n;i++)board.push(d.pop());facing=Math.random()<.52;if(facing)bet=Math.max(6,Math.round(pot*choice([.33,.5,.66,.8])/2)*2);
   st.board=board;st.pot=facing?pot+bet:pot;spot={street,hero,board,pos,pot:st.pot,context:"$1/$2. You are "+pos+". "+(facing?"Villain bets "+money(bet)+" into "+money(pot)+".":"Villain checks to you. Pot "+money(pot)+"."),toCall:bet,st}
 }
 renderSpot()
}
function renderSpot(){
 show("spotScreen");$("spotStreet").textContent=spot.street+" · "+spot.pos;$("spotContext").textContent=spot.context;$("spotHole").innerHTML=miniCards(spot.hero);$("spotBoardWrap").style.display=spot.board.length?"block":"none";$("spotBoard").innerHTML=spot.board.map(c=>cardHTML(c)).join("");$("spotHint").style.display="none";$("spotFeedback").style.display="none";
 let coach=spot.street==="Preflop"?coachPreflop(spot.st):coachPost(spot.st,spot.toCall>0,spot.toCall),opts=[];
 if(spot.street==="Preflop"){
   if(spot.toCall===0)opts=[{kind:"check",label:"Check"},{kind:"raise",label:"Raise"}];
   else opts=[{kind:"fold",label:"Fold"},{kind:"call",label:"Call"},{kind:"raise",label:"Raise"}]
 }else if(spot.toCall>0)opts=[{kind:"fold",label:"Fold"},{kind:"call",label:"Call"},{kind:"raise",label:"Raise"}];
 else opts=[{kind:"check",label:"Check"},{kind:"betSmall",label:"Bet small"},{kind:"betBig",label:"Bet big"}];
 $("spotHintBtn").onclick=()=>{$("spotHint").textContent=coach.why;$("spotHint").style.display="block"};
 addGenericButtons("spotActions",opts,o=>{let ok=coach.ok.includes(o.kind),f=$("spotFeedback");f.className="feedback "+(ok?"good":"bad");f.innerHTML="<b>"+(ok?"Solid.":"Coach prefers a different line.")+"</b><br>"+coach.why;f.style.display="block";document.querySelectorAll("#spotActions button").forEach(b=>b.disabled=true);$("nextSpot").style.display="block"},coach)
 $("nextSpot").style.display="none";$("nextSpot").onclick=newSpot
}
function addGenericButtons(id,opts,fn){let box=$(id);box.innerHTML="";opts.forEach(o=>{let b=document.createElement("button");b.className="action";b.textContent=o.label;b.addEventListener("click",()=>fn(o));box.appendChild(b)})}

function renderGuided(){
 show("guidedScreen");let s=G[gidx%G.length];$("gStreet").textContent=s.street;$("gContext").textContent=s.context;$("gHole").innerHTML=s.hole.map(c=>cardHTML(c)).join("");$("gBoardWrap").style.display=s.board.length?"block":"none";$("gBoard").innerHTML=s.board.map(c=>cardHTML(c)).join("");$("gQuestion").textContent=s.q;$("gHint").style.display="none";$("gFeedback").style.display="none";$("gNext").style.display="none";$("gScore").textContent=gscore+"/"+gatt;
 let box=$("gAnswers");box.innerHTML="";s.a.forEach((x,i)=>{let b=document.createElement("button");b.className="answer";b.textContent=String.fromCharCode(65+i)+") "+x;b.onclick=()=>{if(document.querySelector("#gAnswers .correct,#gAnswers .wrong"))return;gatt++;if(i===s.c){gscore++;b.classList.add("correct")}else{b.classList.add("wrong");box.children[s.c].classList.add("correct")}Array.from(box.children).forEach(q=>q.disabled=true);$("gScore").textContent=gscore+"/"+gatt;$("gFeedback").innerHTML="<b>"+(i===s.c?"Good decision.":"Review this one.")+"</b><br>"+s.e;$("gFeedback").style.display="block";$("gNext").style.display="block"};box.appendChild(b)});
 $("gHintBtn").onclick=()=>{$("gHint").textContent=s.h;$("gHint").style.display="block"};$("gNext").onclick=()=>{gidx++;if(gidx%G.length===0)shuffle(G);renderGuided()}
}

function selectMode(m){mode=m;document.querySelectorAll(".modecard").forEach(x=>x.classList.toggle("selected",x.dataset.mode===m))}
document.querySelectorAll(".modecard").forEach(b=>b.addEventListener("click",()=>selectMode(b.dataset.mode)));
$("coachTiming").addEventListener("change",e=>coachTiming=e.target.value);
$("startMain").addEventListener("click",()=>{if(mode==="live")startLiveSession();else if(mode==="spot")newSpot();else renderGuided()});
$("backLive").onclick=()=>show("home");$("backSpot").onclick=()=>show("home");$("backGuided").onclick=()=>show("home");
selectMode("live");
})();