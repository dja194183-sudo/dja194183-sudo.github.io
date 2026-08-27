const P=["BTC/USDT","ETH/USDT","BNB/USDT","SOL/USDT","XRP/USDT","DOGE/USDT","ADA/USDT","AVAX/USDT","LINK/USDT","SUI/USDT","PEPE/USDT","TON/USDT","ARB/USDT","NEAR/USDT","OP/USDT"];
const TF=["5m","15m","1h","4h"];
const TIPS=["wait for pullback","do not chase candles","WAIT is a position","risk 0.4%","no revenge trade"];
const S={sym:"BTC/USDT",mkt:"futures",tf:"15m",sig:null,edit:null,paper:[]};
const K={j:"khatoon:j",c:"khatoon:c",p:"khatoon:p"};
function bsym(){return S.sym.replace("/","")}
function loadC(){try{return Object.assign({eq:1000,risk:0.4,day:2,open:6},JSON.parse(localStorage.getItem(K.c)||"{}"))}catch(e){return {eq:1000,risk:0.4,day:2,open:6}}}
function saveC(c){localStorage.setItem(K.c,JSON.stringify(c)); showC()}
function J(){try{return JSON.parse(localStorage.getItem(K.j)||"[]")}catch(e){return[]}}
function saveJ(a){localStorage.setItem(K.j,JSON.stringify(a.slice(0,120)))}
function unwrap(d){if(!d)return d;if(typeof d==="string"){try{return JSON.parse(d)}catch(e){return d}}if(d.contents){try{return JSON.parse(d.contents)}catch(e){return d.contents}}return d}
async function get(url){const r=await fetch(url); if(!r.ok) throw 0; return unwrap(await r.json())}
async function loadBinance(){const s=bsym(); const tk=await get("https://data-api.binance.vision/api/v3/ticker/24hr?symbol="+s); const kl=await get("https://data-api.binance.vision/api/v3/klines?symbol="+s+"&interval="+S.tf+"&limit=180"); return {px:Number(tk.lastPrice||tk.c), ch:Number(tk.priceChangePercent||0), kl, src:"Binance"}}
async function loadToobit(){const raw=S.mkt==="futures"?bsym().replace("USDT","")+"-SWAP-USDT":bsym(); const base="https://api.toobit.com"; const tk=await get(base+(S.mkt==="futures"?"/quote/v1/contract/ticker/24hr?symbol=":"/quote/v1/ticker/24hr?symbol=")+raw); const kl=await get(base+(S.mkt==="futures"?"/quote/v1/contract/klines?symbol=":"/quote/v1/klines?symbol=")+raw+"&interval="+S.tf+"&limit=180"); const row=Array.isArray(tk)?tk[0]:tk; return {px:Number(row.c||row.p), ch:Number(row.pcp||0)*100, kl, src:"Toobit"}}
function ema(a,n){const o=Array(a.length).fill(null);if(a.length<n)return o;const k=2/(n+1);let s=0;for(let i=0;i<n;i++)s+=a[i];s/=n;o[n-1]=s;for(let i=n;i<a.length;i++){s=a[i]*k+s*(1-k);o[i]=s}return o}
function rsi(a,n){if(a.length<=n)return 50; let g=0,l=0; for(let i=1;i<=n;i++){const d=a[i]-a[i-1]; g+=Math.max(d,0); l+=Math.max(-d,0)} let ag=g/n,al=l/n; for(let i=n+1;i<a.length;i++){const d=a[i]-a[i-1]; ag=(ag*(n-1)+Math.max(d,0))/n; al=(al*(n-1)+Math.max(-d,0))/n} return al===0?100:100-100/(1+ag/al)}
function analyze(cs,px){
  const i=cs.length-1; if(i<55) return {d:"WAIT",sc:0,sl:px,tp:px,why:"candles low"};
  const cl=cs.map(x=>x.c), e9=ema(cl,9), e21=ema(cl,21), e50=ema(cl,50);
  const a9=e9[i], a21=e21[i], a50=e50[i], rs=rsi(cl,14);
  const last=cs[i], prev=cs[i-1], prev2=cs[i-2];
  const dist21=Math.abs(px-a21)/px*100;
  const ext21=(px-a21)/px*100;
  const up=a21>a50 && a9>=a21*0.997;
  const dn=a21<a50 && a9<=a21*1.003;
  const pullL=px<=a21*1.004 && px>=a50*0.997;
  const pullS=px>=a21*0.996 && px<=a50*1.003;
  const recL=last.c>=last.o || last.c>prev.l;
  const recS=last.c<=last.o || last.c<prev.h;
  const chaseL=ext21>0.9;
  const chaseS=ext21<-0.9;
  const swingL=Math.min(last.l,prev.l,prev2.l);
  const swingH=Math.max(last.h,prev.h,prev2.h);
  if(up && pullL && recL && !chaseL && rs<72){
    const sl=swingL*0.998; const risk=Math.abs(px-sl)||px*0.004; const tp=px+1.6*risk;
    return {d:"LONG",sc:72,sl,tp,why:"pullback to EMA21 then reclaim · not chase"};
  }
  if(dn && pullS && recS && !chaseS && rs>28){
    const sl=swingH*1.002; const risk=Math.abs(sl-px)||px*0.004; const tp=px-1.6*risk;
    return {d:"SHORT",sc:72,sl,tp,why:"pullback to EMA21 then reject · not chase"};
  }
  if(chaseL) return {d:"WAIT",sc:40,sl:px,tp:px,why:"stretched above EMA · do not buy high"};
  if(chaseS) return {d:"WAIT",sc:40,sl:px,tp:px,why:"stretched below EMA · do not sell low"};
  return {d:"WAIT",sc:35,sl:px,tp:px,why:"no pullback confirm · wait"};
}
function fmt(n){return Number.isFinite(+n)?(+n>50?(+n).toFixed(1):(+n).toFixed(4)):"-"}
function drawPairs(){const q=document.getElementById("q").value.toUpperCase().replace("/",""); document.getElementById("pairs").innerHTML=P.filter(p=>!q||p.replace("/","").includes(q)).map(p=>`<button class="${p===S.sym?"pri":""}" data-p="${p}">${p}</button>`).join("")}
function drawTf(){document.getElementById("tfs").innerHTML=TF.map(t=>`<button class="${t===S.tf?"pri":""}" data-tf="${t}">${t}</button>`).join("")}
function showC(){const c=loadC(); document.getElementById("c-show").textContent=c.eq; document.getElementById("c-rshow").textContent=c.risk+"%"; document.getElementById("c-eq").value=c.eq; document.getElementById("c-risk").value=c.risk; document.getElementById("c-day").value=c.day; document.getElementById("c-open").value=c.open}
function renderJ(){const rows=J(); const open=rows.filter(r=>r.res==="OPEN").length; const wins=rows.filter(r=>r.res==="WIN").length; const closed=rows.filter(r=>r.res!=="OPEN").length; jstats.textContent="open "+open+" · win "+wins+" / "+closed; jlist.innerHTML=rows.map((r,i)=>`<div class="item"><div>${r.sym} <b class="${r.side}">${r.side}</b> ${r.res}<div class="hint">${r.px} SL ${r.sl||"-"} TP ${r.tp||"-"}</div></div><button data-e="${i}">edit</button></div>`).join("")||"empty"}
function fillEdit(i){const r=J()[i]; if(!r)return; S.edit=i; editbox.classList.remove("hide"); document.getElementById("e-sym").value=r.sym; document.getElementById("e-side").value=r.side; document.getElementById("e-res").value=r.res||"OPEN"; document.getElementById("e-px").value=r.px; document.getElementById("e-sl").value=r.sl||""; document.getElementById("e-tp").value=r.tp||""; document.getElementById("e-exit").value=r.exit||""; document.getElementById("e-note").value=r.note||""}
function riskBox(){const c=loadC(); const px=S.sig&&S.sig.px; const sl=S.sig&&S.sig.sl; if(!px||!sl){document.getElementById("r-out").textContent="need signal";return} const riskAmt=c.eq*(c.risk/100); const qty=riskAmt/Math.abs(px-sl||1); document.getElementById("r-out").textContent="risk "+riskAmt.toFixed(2)+" qty "+qty.toFixed(6)+" day cap "+(c.eq*c.day/100).toFixed(2)}
async function load(){document.getElementById("meta").textContent=S.sym+" · "+S.tf+" · "+S.mkt; try{let data; try{data=await loadToobit()}catch(e){data=await loadBinance()} const px=data.px; if(!Number.isFinite(px)) throw 0; const cs=(data.kl||[]).map(r=>({o:+r[1],h:+r[2],l:+r[3],c:+r[4]})); const sig=analyze(cs,px); S.sig={...sig,px}; live.className="ok"; live.textContent="Live "+data.src; price.textContent=px.toLocaleString(); chg.textContent=(data.ch>=0?"+":"")+Number(data.ch).toFixed(2)+"%"; dir.className=sig.d; dir.textContent=sig.d; score.className=sig.d; score.textContent=sig.sc+"%"; grade.textContent=sig.d==="WAIT"?sig.why:"pullback signal"; entry.textContent=fmt(px); sl.textContent=fmt(sig.sl); tp.textContent=fmt(sig.tp); why.textContent=sig.why+" · "+data.src; riskBox()}catch(e){live.className="bad"; live.textContent="retry"}}
document.getElementById("pairs").onclick=e=>{const b=e.target.closest("button"); if(!b)return; S.sym=b.dataset.p; drawPairs(); load()};
document.getElementById("tfs").onclick=e=>{const b=e.target.closest("button"); if(!b)return; S.tf=b.dataset.tf; drawTf(); load()};
document.getElementById("q").oninput=drawPairs;
document.getElementById("mkt").onchange=e=>{S.mkt=e.target.value; load()};
document.getElementById("save").onclick=()=>{if(!S.sig||!Number.isFinite(S.sig.px))return; const c=loadC(); if(J().filter(r=>r.res==="OPEN").length>=c.open){saved.textContent="max open";return} saveJ([{id:Date.now(),sym:S.sym,side:S.sig.d==="WAIT"?"LONG":S.sig.d,res:S.sig.d==="WAIT"?"BE":"OPEN",px:S.sig.px,sl:S.sig.sl,tp:S.sig.tp,note:S.tf+" "+S.sig.sc},...J()]); saved.textContent="saved "+S.sig.px; renderJ()};
document.getElementById("paper").onclick=()=>{if(!S.sig||S.sig.d==="WAIT"){saved.textContent="no WAIT paper";return} S.paper.unshift({sym:S.sym,d:S.sig.d,px:S.sig.px}); localStorage.setItem(K.p,JSON.stringify(S.paper.slice(0,40))); saved.textContent="paper open"; paperbox.textContent=S.sym+" "+S.sig.d+" @ "+S.sig.px};
document.getElementById("jlist").onclick=e=>{const b=e.target.closest("button"); if(!b)return; fillEdit(+b.dataset.e)};
document.getElementById("e-save").onclick=()=>{const rows=J(); if(S.edit==null||!rows[S.edit])return; rows[S.edit]={...rows[S.edit],sym:document.getElementById("e-sym").value,side:document.getElementById("e-side").value,res:document.getElementById("e-res").value,px:+document.getElementById("e-px").value,sl:+document.getElementById("e-sl").value||"",tp:+document.getElementById("e-tp").value||"",exit:+document.getElementById("e-exit").value||"",note:document.getElementById("e-note").value}; saveJ(rows); renderJ(); saved.textContent="edited"};
document.getElementById("e-del").onclick=()=>{const rows=J(); if(S.edit==null)return; rows.splice(S.edit,1); saveJ(rows); S.edit=null; editbox.classList.add("hide"); renderJ()};
document.getElementById("c-save").onclick=()=>{saveC({eq:+document.getElementById("c-eq").value||1000,risk:+document.getElementById("c-risk").value||0.4,day:+document.getElementById("c-day").value||2,open:+document.getElementById("c-open").value||6})};
document.querySelector("#t-desk .sub").onclick=e=>{const b=e.target.closest("button"); if(!b)return; document.querySelectorAll("#t-desk .sub button").forEach(x=>x.classList.remove("pri")); b.classList.add("pri"); ["cap","risk","chat","learn"].forEach(x=>document.getElementById("d-"+x).classList.toggle("hide",b.dataset.d!==x)); if(b.dataset.d==="risk") riskBox()};
document.getElementById("chat-go").onclick=()=>{const t=document.getElementById("chat-in").value.trim(); if(!t)return; const c=loadC(); let a="risk "+c.risk+"%"; if(/entry|signal|ورود|سیگنال/.test(t)) a=S.sig?(S.sig.d+" "+S.sig.sc):"no signal"; if(/journal|ژورنال/.test(t)) a=J().length+" rows"; thread.innerHTML="<div class='item'>"+t+"</div><div class='item'>"+a+"</div>"+thread.innerHTML};
document.querySelector(".dock").onclick=e=>{const b=e.target.closest("button"); if(!b)return; document.querySelectorAll(".dock button").forEach(x=>x.classList.remove("pri")); b.classList.add("pri"); ["signal","scan","journal","desk","more"].forEach(t=>document.getElementById("t-"+t).classList.toggle("hide",b.dataset.t!==t)); if(b.dataset.t==="journal") renderJ(); if(b.dataset.t==="scan") document.getElementById("t-scan").innerHTML=P.map(p=>`<div class="item"><button data-p="${p}">${p}</button></div>`).join(""); if(b.dataset.t==="desk") showC()};
document.getElementById("t-scan").onclick=e=>{const b=e.target.closest("button"); if(!b)return; S.sym=b.dataset.p; drawPairs(); document.querySelector("[data-t=signal]").click(); load()};
document.getElementById("tip").textContent=TIPS[new Date().getDate()%TIPS.length];
try{S.paper=JSON.parse(localStorage.getItem(K.p)||"[]")}catch(e){S.paper=[]}
drawPairs(); drawTf(); showC(); load(); setInterval(load,8000);
