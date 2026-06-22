/* ===== English for Canada — 今日やることアプリ 本体 ===== */
const LS = "engca_v1";
const $ = id => document.getElementById(id);
const todayISO = () => new Date().toLocaleDateString("en-CA");
const dnum = () => Math.floor(Date.parse(todayISO())/86400000);
const WD = ["日","月","火","水","木","金","土"];

const DECK = window.DECK || {cards:[],meta:{categories:{}}};
const C = window.CONTENT;

// 週間スケジュール（曜日 0=日 .. 6=土）
const SCHED = {
  0:[ {id:"free",type:"free",nm:"弱点補強・録音の聞き直し",min:20}, {id:"srs",type:"srs",nm:"SRS追い込み"} ],
  1:[ {id:"shadow",type:"shadow",nm:"シャドーイング",min:20}, {id:"role",type:"role",nm:"ロールプレイ＋採点",min:15}, {id:"srs",type:"srs",nm:"SRS復習"} ],
  2:[ {id:"shadow",type:"shadow",nm:"シャドーイング",min:20}, {id:"pron",type:"pron",nm:"発音 / OETリスニング",min:20}, {id:"srs",type:"srs",nm:"SRS復習"} ],
  3:[ {id:"shadow",type:"shadow",nm:"シャドーイング",min:20}, {id:"role",type:"role",nm:"ロールプレイ＋採点",min:20}, {id:"srs",type:"srs",nm:"SRS復習"} ],
  4:[ {id:"shadow",type:"shadow",nm:"シャドーイング",min:20}, {id:"letter",type:"letter",nm:"OET紹介状を1通",min:25}, {id:"srs",type:"srs",nm:"SRS復習"} ],
  5:[ {id:"listen",type:"shadow",nm:"多聴（ながら）",min:20}, {id:"role",type:"role",nm:"ロールプレイ＋採点",min:20}, {id:"srs",type:"srs",nm:"SRS復習"} ],
  6:[ {id:"mock",type:"mock",nm:"模試1セクション＋振り返り",min:40}, {id:"srs",type:"srs",nm:"SRS復習"} ],
};

// ---- state ----
function freshState(){ return {days:{}, srs:{}, meta:{startDate:todayISO(), baseline:null, dailyNew:8}, sync:{url:"",code:"",lastSync:0}}; }
let S = loadState();
function loadState(){ try{ const s=JSON.parse(localStorage.getItem(LS)); if(s&&s.days){ s.meta=s.meta||{}; s.meta.dailyNew=s.meta.dailyNew||8; s.sync=s.sync||{url:"",code:"",lastSync:0}; s.srs=s.srs||{}; return s; } }catch(e){} return freshState(); }
function save(){ localStorage.setItem(LS, JSON.stringify(S)); }
function ensureDay(d){ if(!S.days[d]) S.days[d]={listen:0,speak:0,srs:0,letter:0,wpm:null,filler:null,note:"",done:[],newSrs:0,letterDraft:"",ts:Date.now()}; return S.days[d]; }
function addField(f,n){ const d=ensureDay(todayISO()); d[f]=(d[f]||0)+n; d.ts=Date.now(); save(); scheduleSync(); }
function markDone(id){ const d=ensureDay(todayISO()); if(!d.done.includes(id)) d.done.push(id); d.ts=Date.now(); save(); scheduleSync(); }
// タスク単位の記録（二重計上を防止：再記録は前回分を差し替え、取り消しも可能）
function logTask(id,{listen=0,speak=0,letter=0,note,wpm,filler}={}){ const d=ensureDay(todayISO()); d.taskLog=d.taskLog||{};
  const p=d.taskLog[id]; if(p){ d.listen=Math.max(0,(d.listen||0)-(p.listen||0)); d.speak=Math.max(0,(d.speak||0)-(p.speak||0)); d.letter=Math.max(0,(d.letter||0)-(p.letter||0)); }
  d.listen=(d.listen||0)+listen; d.speak=(d.speak||0)+speak; d.letter=(d.letter||0)+letter;
  d.taskLog[id]={listen,speak,letter};
  if(note!=null)d.note=note; if(wpm!=null)d.wpm=wpm; if(filler!=null)d.filler=filler;
  if(!d.done.includes(id))d.done.push(id); d.ts=Date.now(); save(); scheduleSync(); }
function undoTask(id){ const d=ensureDay(todayISO()); const p=(d.taskLog||{})[id];
  if(p){ d.listen=Math.max(0,(d.listen||0)-(p.listen||0)); d.speak=Math.max(0,(d.speak||0)-(p.speak||0)); d.letter=Math.max(0,(d.letter||0)-(p.letter||0)); delete d.taskLog[id]; }
  d.done=(d.done||[]).filter(x=>x!==id); d.ts=Date.now(); save(); scheduleSync(); toast("取り消しました"); renderToday(); }
function taskLogged(id){ return (S.days[todayISO()]||{}).taskLog?.[id]; }

function toast(m){ const t=$("toast"); t.textContent=m; t.classList.add("show"); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove("show"),1800); }
function copy(text){ navigator.clipboard?.writeText(text).then(()=>toast("コピーしました"),()=>fallbackCopy(text)) || fallbackCopy(text); }
function fallbackCopy(t){ const a=document.createElement("textarea"); a.value=t; document.body.appendChild(a); a.select(); try{document.execCommand("copy");toast("コピーしました");}catch(e){toast("コピー失敗");} a.remove(); }
function addDays(iso,n){ const d=new Date(iso+"T00:00:00"); d.setDate(d.getDate()+n); return d.toLocaleDateString("en-CA"); }

// ---- navigation ----
let view="today";
function go(v){ view=v; document.querySelectorAll(".view").forEach(s=>s.classList.remove("on")); $("v-"+v).classList.add("on");
  document.querySelectorAll(".nav a").forEach(a=>a.classList.remove("on")); $("n-"+v).classList.add("on");
  if(v==="today")renderToday(); else if(v==="srs")renderSrsHome(); else if(v==="stats")renderStats(); else if(v==="plan")renderPlan(); else if(v==="settings")renderSettings();
  window.scrollTo(0,0);
}

// ===== TODAY =====
let openTask=null;
function toggleTask(id){ openTask = (openTask===id?null:id); renderToday(); }
function todayTasks(){ return SCHED[new Date().getDay()] || []; }
function isDone(t){ const d=S.days[todayISO()]||{}; if(t.type==="srs") return (d.srs||0)>0 || (d.done||[]).includes(t.id); return (d.done||[]).includes(t.id); }

function renderToday(){
  const d=ensureDay(todayISO());
  const tasks=todayTasks();
  // 3軸
  const input=(d.listen||0)>0, output=((d.speak||0)>0||(d.letter||0)>0), srs=(d.srs||0)>0;
  $("axis").innerHTML=
    ax("🎧","インプット",input)+ax("🗣️","アウトプット",output)+ax("🗂️","SRS",srs);
  function ax(ic,nm,on){ return `<div class="ax ${on?'done':''}"><div class="ic">${ic}</div><div class="nm">${nm}</div></div>`; }

  $("tasks").innerHTML = tasks.map(t=>{
    const done=isDone(t), open=openTask===t.id;
    const meta = t.type==="srs" ? srsMetaLine() : (t.min?`目安 ${t.min}分`:"");
    return `<div class="task ${done?'done':''} ${open?'open':''}">
      <div class="thead" onclick="toggleTask('${t.id}')">
        <div class="chk">${done?'✓':''}</div>
        <div class="tinfo"><div class="nm">${t.nm}</div><div class="mt">${meta}</div></div>
        <div class="caret">▸</div>
      </div>
      <div class="tbody">${toolUI(t)}</div>
    </div>`;
  }).join("");

  const allDone = tasks.every(isDone);
  const doneN = tasks.filter(isDone).length;
  $("todayProg").textContent = allDone ? "今日のメニュー完了 🎉" : `今日 ${doneN}/${tasks.length} 完了 — 続けましょう`;
  $("doneBanner").style.display = allDone ? "block":"none";
  renderHeader();
}
function srsMetaLine(){ const due=dueIds().length, nw=newRemaining(); return `復習 ${due}枚` + (nw>0?` ・ 新規 ${nw}枚`:""); }

function toolUI(t){
  let body;
  switch(t.type){
    case "shadow": body=shadowUI(t); break;
    case "role": body=roleUI(t); break;
    case "pron": body=pronUI(t); break;
    case "letter": body=letterUI(t); break;
    case "srs": body=`<p class="mut">下のボタンで復習を開始（SM-2で自動スケジュール）。</p>
      <div class="btns"><button onclick="openSrs()">▶ 今日の復習を始める</button></div>`; break;
    case "mock": body=mockUI(t); break;
    default: body=freeUI(t);
  }
  return doneSummary(t)+body;
}
function doneSummary(t){ const d=S.days[todayISO()]||{};
  if(t.type==="srs"){ return (d.srs||0)>0?`<div class="donerow">✓ 今日 ${d.srs}枚 復習済み</div>`:""; }
  const l=taskLogged(t.id); if(!l && !(d.done||[]).includes(t.id)) return "";
  const p=[]; if(l){ if(l.listen)p.push("IN +"+l.listen+"分"); if(l.speak)p.push("OUT +"+l.speak+"分"); if(l.letter)p.push("紹介状 "+l.letter+"通"); }
  return `<div class="donerow">✓ 記録済み${p.length?"（"+p.join(" / ")+"）":""}<button class="ghost sm" onclick="undoTask('${t.id}')">取り消す</button></div>`;
}

// --- shadowing / listening timer ---
let timer={id:null,sec:0,h:null};
function startTimer(tid){ if(timer.h){stopTimer(true);} timer={id:tid,sec:0,h:setInterval(()=>{timer.sec++;const e=$("tdisp_"+tid);if(e)e.textContent=fmt(timer.sec);},1000)}; const e=$("tdisp_"+tid);if(e)e.textContent=fmt(0); toast("計測開始"); }
function stopTimer(silent){ if(!timer.h)return; clearInterval(timer.h); const m=Math.max(1,Math.round(timer.sec/60)); const tid=timer.id; timer={id:null,sec:0,h:null}; if(!silent){ logTask(tid,{listen:m}); toast("+"+m+"分 記録しました"); renderToday(); } }
function fmt(s){ const m=String(Math.floor(s/60)).padStart(2,"0"),x=String(s%60).padStart(2,"0"); return m+":"+x; }
function shadowUI(t){ return `
  <p class="mut">英語の臨床音声を聞こえたまま0.5拍遅れで真似る。素材：医療系ポッドキャスト/講義、OET公式サンプル等。</p>
  <div class="timer" id="tdisp_${t.id}">00:00</div>
  <div class="btns"><button onclick="startTimer('${t.id}')">▶ 計測開始</button><button class="warn" onclick="stopTimer()">■ 停止して記録</button></div>
  <label>または手入力（分）</label>
  <div class="row"><input type="number" id="man_${t.id}" min="0" placeholder="${t.min}"><button onclick="manLog('${t.id}','listen')">記録</button></div>`;
}
function manLog(id,field){ const v=+($("man_"+id).value||0); if(v>0){ logTask(id, field==="listen"?{listen:v}:{speak:v}); toast("+"+v+"分"); renderToday(); } }

// --- roleplay ---
let roleOff=0, letterOff=0;
function nextRole(){ roleOff++; renderToday(); }
function nextLetter(){ letterOff++; renderToday(); }
function roleUI(t){
  const r = C.roleplays[ (dnum()+roleOff) % C.roleplays.length ];
  const full = r.prompt+"\n\n"+C.rubric;
  return `<p class="big"><b>今日の場面：${r.title}</b></p>
    <p class="mut">Claude/ChatGPTの音声モードに下を貼って開始 → 声に出して会話 → "END" → ルーブリックで採点。</p>
    <div class="pre">${esc(r.prompt)}</div>
    <div class="btns"><button onclick='copyText(${jstr(full)})'>📋 プロンプト＋ルーブリックをコピー</button>
      <button class="ghost" onclick="nextRole()">↻ 別の場面</button></div>
    ${wpmWidget("wpm_"+t.id)}
    <label>採点メモ（直すべき3つ・気づき）</label>
    <textarea id="note_${t.id}" placeholder="例: /θ/ が /s/ に。'titrate' が口に馴染まない。">${esc((S.days[todayISO()]||{}).note||"")}</textarea>
    <div class="row"><div><label>wpm(任意)</label><input type="number" id="wpm_${t.id}" min="0"></div>
      <div><label>filler%(任意)</label><input type="number" id="fil_${t.id}" min="0"></div>
      <div><label>かけた時間(分)</label><input type="number" id="min_${t.id}" min="0" placeholder="${t.min}"></div></div>
    <div class="btns"><button class="good" onclick="finishRole('${t.id}',${t.min})">✓ 完了して記録</button></div>`;
}
// 音読wpm自動計測（150語を音読→停止で語/分を算出）
let wpmT={sec:0,h:null};
function wpmWidget(targetId){ return `<div class="panel" style="background:var(--panel2);margin:8px 0">
    <div class="mut">音読でwpm自動計測：開始 → 下の150語を音読 → 停止で算出。</div>
    <div class="pre" style="max-height:110px;overflow:auto">${esc(C.wpmPassage)}</div>
    <div class="timer" id="wpmDisp">00:00</div>
    <div class="btns"><button onclick="wpmStart()">▶ 開始</button><button class="warn" onclick="wpmStop('${targetId}')">■ 停止して算出</button></div>
  </div>`; }
function wpmStart(){ if(wpmT.h)clearInterval(wpmT.h); wpmT={sec:0,h:setInterval(()=>{wpmT.sec++;const e=$("wpmDisp");if(e)e.textContent=fmt(wpmT.sec);},1000)}; const e=$("wpmDisp");if(e)e.textContent="00:00"; toast("音読開始"); }
function wpmStop(targetId){ if(!wpmT.h)return; clearInterval(wpmT.h); const sec=wpmT.sec; wpmT={sec:0,h:null}; if(sec<3){toast("短すぎます");return;} const wpm=Math.round(150/sec*60); const inp=$(targetId); if(inp)inp.value=wpm; toast("wpm = "+wpm+"（記入しました）"); }
function finishRole(id,defMin){ const m=+($("min_"+id).value||defMin); const w=$("wpm_"+id).value, f=$("fil_"+id).value;
  logTask(id,{speak:m, note:$("note_"+id).value||undefined, wpm:w===""?undefined:+w, filler:f===""?undefined:+f});
  toast("+"+m+"分 記録しました"); renderToday(); }

// --- pronunciation ---
function pronUI(t){ return `<p class="big"><b>発音・流暢性 / または OETリスニング</b></p>
  <p class="mut">録音→文字起こしを下のプロンプトに貼ってAIに診断させる。リスニング日にしてもOK。</p>
  <div class="btns"><button onclick='copyText(${jstr(C.pron)})'>📋 発音診断プロンプトをコピー</button>
    <button class="ghost" onclick='copyText(${jstr(C.wpmPassage)})'>📋 音読パッセージ(150語)</button></div>
  <label>かけた時間(分)</label>
  <div class="row"><input type="number" id="man_${t.id}" min="0" placeholder="${t.min}"><button onclick="manLog('${t.id}','speak')">記録</button></div>`;
}

// --- OET letter ---
function letterUI(t){
  const L = C.letters[ (dnum()+letterOff) % C.letters.length ];
  const d=ensureDay(todayISO());
  return `<p class="big"><b>${L.title}</b> <button class="ghost sm" onclick="nextLetter()">↻ 別の症例</button></p>
    <p class="mut">${esc(L.task)} 25分・本番条件。書けたら「採点プロンプト」をコピーしてAIへ。</p>
    <div class="pre">${esc(L.notes)}</div>
    <label>紹介状の下書き</label>
    <textarea id="draft_${t.id}" placeholder="Dear Dr ...," oninput="saveDraft(this.value)">${esc(d.letterDraft||"")}</textarea>
    <div class="btns">
      <button onclick='gradeLetter()'>📋 採点プロンプト＋下書きをコピー</button>
      <button class="good" onclick="finishLetter('${t.id}',${t.min})">✓ 提出（1通）</button>
    </div>`;
}
function saveDraft(v){ const d=ensureDay(todayISO()); d.letterDraft=v; d.ts=Date.now(); save(); }
function gradeLetter(){ const d=ensureDay(todayISO()); copyText(C.letterGrader + (d.letterDraft||"[まだ下書きがありません]")); }
function finishLetter(id,defMin){ logTask(id,{speak:defMin,letter:1}); toast("紹介状を記録（+"+defMin+"分）"); renderToday(); }

// --- mock / free ---
function mockUI(t){ return `<p class="mut">月替わりで4技能を巡回。1セクション解いて振り返り。</p>
  <label>やったセクション</label>
  <select id="sec_${t.id}"><option>Listening</option><option>Reading</option><option>Writing</option><option>Speaking</option></select>
  <label>結果・気づき</label><textarea id="note_${t.id}" placeholder="スコア/手応え/弱点"></textarea>
  <label>かけた時間(分)</label>
  <div class="row"><input type="number" id="man_${t.id}" min="0" placeholder="${t.min}">
    <button onclick="finishMock('${t.id}',${t.min})">✓ 完了</button></div>`;
}
function finishMock(id,defMin){ const m=+($("man_"+id).value||defMin); const d=ensureDay(todayISO());
  const sec=$("sec_"+id).value, nt=$("note_"+id).value; const note = nt ? ((d.note?d.note+" / ":"")+"[模試 "+sec+"] "+nt) : undefined;
  logTask(id,{listen:m, note}); toast("模試を記録"); renderToday(); }
function freeUI(t){ return `<p class="mut">弱点補強・録音の聞き直し・SRS追い込みなど自由枠。</p>
  <label>メモ</label><textarea id="note_${t.id}"></textarea>
  <label>かけた時間(分)</label>
  <div class="row"><input type="number" id="man_${t.id}" min="0" placeholder="${t.min}">
    <button onclick="finishFree('${t.id}',${t.min})">✓ 完了</button></div>`;
}
function finishFree(id,defMin){ const m=+($("man_"+id).value||defMin); const d=ensureDay(todayISO());
  const nt=$("note_"+id).value; const note = nt ? ((d.note?d.note+" / ":"")+nt) : undefined;
  logTask(id,{listen:m, note}); toast("記録しました"); renderToday(); }

function esc(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function jstr(s){ return JSON.stringify(s); }
function copyText(s){ copy(s); }

// ===== SRS =====
function dueIds(){ const t=todayISO(); return DECK.cards.filter(c=>S.srs[c.id]&&S.srs[c.id].due&&S.srs[c.id].due<=t).map(c=>c.id); }
function newRemaining(){ const introduced=(S.days[todayISO()]||{}).newSrs||0; return Math.max(0,(S.meta.dailyNew||8)-introduced); }
function newIds(){ return DECK.cards.filter(c=>!S.srs[c.id]).slice(0,newRemaining()).map(c=>c.id); }
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

let Q={list:[],i:0};
function openSrs(){ go("srs"); startSrs(); }
function startSrs(all){ const ids = all===true ? DECK.cards.map(c=>c.id) : shuffle([...dueIds(),...newIds()]);
  if(!ids.length){ toast("今日の復習はありません。お疲れさま！"); renderSrsHome(); return; }
  Q={list:ids,i:0}; const b=$("srsBrowse"); if(b)b.style.display="none"; $("srsHome").style.display="none"; $("srsPlay").style.display="block"; showCard(); }
function showCard(){ if(Q.i>=Q.list.length){ endSrs(); return; }
  const c=DECK.cards.find(x=>x.id===Q.list[Q.i]); if(!c){Q.i++;return showCard();}
  $("srsProg").textContent=(Q.i+1)+" / "+Q.list.length;
  $("cFront").textContent=c.front; $("cReveal").style.display="none";
  $("cBack").textContent=c.back; $("cNote").textContent=c.note||"";
  $("cTags").innerHTML=`<span class="tag">${DECK.meta.categories[c.cat]||c.cat}</span>`+(c.tags||[]).map(t=>`<span class="tag">${t}</span>`).join("");
  $("srsBtns").innerHTML=`<button class="ghost" style="width:100%" onclick="reveal()">答えを見る</button>`;
}
function reveal(){ $("cReveal").style.display="block";
  $("srsBtns").innerHTML=
    `<button class="bad" onclick="grade(2)">もう一度</button>
     <button class="warn" onclick="grade(3)">難しい</button>
     <button onclick="grade(4)">できた</button>
     <button class="good" onclick="grade(5)">余裕</button>`;
}
function grade(q){ const id=Q.list[Q.i]; const isNew=!S.srs[id]; sm2(id,q);
  const d=ensureDay(todayISO()); if(isNew)d.newSrs=(d.newSrs||0)+1; d.ts=Date.now(); save();
  addField("srs",1); markDone("srs");
  if(q<3){ Q.list.push(id); } // もう一度はセッション末尾へ
  Q.i++; scheduleSync(); showCard();
}
function sm2(id,q){ let s=S.srs[id]||{ef:2.5,interval:0,reps:0,due:todayISO(),last:0};
  if(q<3){ s.reps=0; s.interval=1; }
  else{ s.reps++; if(s.reps===1)s.interval=1; else if(s.reps===2)s.interval=6; else s.interval=Math.round(s.interval*s.ef);
    s.ef=s.ef+(0.1-(5-q)*(0.08+(5-q)*0.02)); if(s.ef<1.3)s.ef=1.3; }
  s.due=addDays(todayISO(),s.interval); s.last=Date.now(); S.srs[id]=s;
}
function endSrs(){ $("srsPlay").style.display="none"; $("srsHome").style.display="block"; renderSrsHome(); toast("セッション終了！"); }
// フレーズ一覧（ブラウズ）
function toggleBrowse(){ const b=$("srsBrowse"); const open=b.style.display!=="none"; b.style.display=open?"none":"block"; if(!open)renderBrowse(); }
function renderBrowse(){ const q=($("browseSearch").value||"").toLowerCase().trim();
  const cats=DECK.meta.categories||{}; const groups={};
  DECK.cards.forEach(c=>{ const hay=(c.front+" "+c.back+" "+(c.note||"")).toLowerCase(); if(q&&!hay.includes(q))return; (groups[c.cat]=groups[c.cat]||[]).push(c); });
  let html=""; Object.keys(groups).forEach(k=>{ html+=`<div class="catHdr">${cats[k]||k}（${groups[k].length}）</div>`;
    groups[k].forEach(c=>{ const s=S.srs[c.id]; const badge=s?` ・ 次回 ${s.due}`:" ・ 未学習";
      html+=`<div class="browseItem"><div class="f">${esc(c.front)}</div><div class="b">${esc(c.back)}</div>${c.note?`<div class="n">${esc(c.note)}</div>`:""}<div class="n">${badge}</div></div>`; }); });
  $("browseList").innerHTML=html||`<div class="mut">該当なし</div>`;
}
function renderSrsHome(){ const due=dueIds().length, nw=newRemaining(), learned=Object.keys(S.srs).length, total=DECK.cards.length;
  $("srsStat").innerHTML=`今日の復習 <b>${due}</b>枚 ・ 新規 <b>${nw}</b>枚 ・ 学習済 ${learned}/${total}`;
  const cats=DECK.meta.categories||{}; const cnt={}; DECK.cards.forEach(c=>cnt[c.cat]=(cnt[c.cat]||0)+1);
  $("catList").innerHTML=Object.keys(cnt).map(k=>`<span class="tag">${cats[k]||k}：${cnt[k]}</span>`).join(" ");
}

// ===== STATS =====
function sumLast(field,days){ let t=0,cur=new Date(todayISO()); for(let i=0;i<days;i++){const k=cur.toLocaleDateString("en-CA"); if(S.days[k])t+=(S.days[k][field]||0); cur.setDate(cur.getDate()-1);} return t; }
function streak(){ let s=0,cur=new Date(todayISO()); for(;;){ const k=cur.toLocaleDateString("en-CA"); const e=S.days[k]; if(e&&((e.listen||0)+(e.speak||0)+(e.srs||0))>0){s++;cur.setDate(cur.getDate()-1);} else break; } return s; }
function renderHeader(){ const dl=$("todayLabel"); const dt=new Date(); dl.textContent=`${todayISO()}（${WD[dt.getDay()]}）— 今日のメニューを上から順に。`;
  const wkMin=sumLast("listen",7)+sumLast("speak",7);
  $("gstats").innerHTML=g("🔥 "+streak(),"連続日数")+g(wkMin,"今週の分")+g(sumLast("srs",7),"今週SRS")+g(sumLast("letter",7),"今週letter");
  function g(v,l){return `<div class="gstat"><b>${v}</b>${l}</div>`;}
  const ep=endpoint(); const p=$("syncPill"); if(ep){p.className="pill on";p.textContent="⇅ 同期"+(S.sync.lastSync?" "+new Date(S.sync.lastSync).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}):"");}else{p.className="pill off";p.textContent="⇅ 未設定";}
  const due=dueIds().length+newRemaining(); const nb=$("srsBadge"); if(nb){ nb.textContent=due||""; nb.style.display=due?"inline-block":"none"; }
}
function renderStats(){ renderHeader();
  const wkMin=sumLast("listen",7)+sumLast("speak",7), letters=sumLast("letter",7);
  const wpmVals=Object.values(S.days).map(x=>x.wpm).filter(v=>v!=null); const avgWpm=wpmVals.length?Math.round(wpmVals.slice(-7).reduce((a,b)=>a+b,0)/Math.min(7,wpmVals.length)):"—";
  $("kpi").innerHTML=`<table>
    <tr><th>指標</th><th>今</th><th>目標</th></tr>
    <tr><td>連続学習日数</td><td>${streak()}日</td><td>切らさない</td></tr>
    <tr><td>週の学習量</td><td class="${wkMin>=200?'ok':'lo'}">${wkMin}分</td><td>200分+</td></tr>
    <tr><td>週のOET紹介状</td><td class="${letters>=2?'ok':'lo'}">${letters}通</td><td>2通</td></tr>
    <tr><td>平均発話速度</td><td>${avgWpm} wpm</td><td>130+</td></tr>
    <tr><td>週のSRS</td><td>${sumLast("srs",7)}枚</td><td>—</td></tr></table>`;
  // chart 14d
  let bars="",max=1,arr=[],cur=new Date(todayISO()); cur.setDate(cur.getDate()-13);
  for(let i=0;i<14;i++){const k=cur.toLocaleDateString("en-CA");const x=S.days[k]||{};arr.push({k,l:x.listen||0,s:(x.speak||0)});max=Math.max(max,x.listen||0,x.speak||0);cur.setDate(cur.getDate()+1);}
  arr.forEach(a=>{const lh=Math.round(a.l/max*100),sh=Math.round(a.s/max*100);bars+=`<div class="col"><div class="fill" style="height:${lh}%" title="IN ${a.l}分"></div><div class="fill sp" style="height:${sh}%" title="OUT ${a.s}分"></div><div class="d">${a.k.slice(5)}</div></div>`;});
  $("chart").innerHTML=bars;
  // log
  const rows=Object.keys(S.days).sort().reverse().slice(0,21).map(k=>{const x=S.days[k];return `<tr><td>${k}</td><td>${x.listen||0}</td><td>${x.speak||0}</td><td>${x.srs||0}</td><td>${x.letter||0}</td><td>${x.wpm??"—"}</td></tr>`;}).join("");
  document.querySelector("#log tbody").innerHTML=rows||`<tr><td colspan="6" class="mut">まだ記録がありません</td></tr>`;
  // manual form
  if(!$("mDate").value)$("mDate").value=todayISO();
  loadManual();
}
$("mDate")?.addEventListener?.("change",loadManual);
function loadManual(){ const d=S.days[$("mDate").value]||{}; $("mListen").value=d.listen??"";$("mSpeak").value=d.speak??"";$("mSrs").value=d.srs??"";$("mLetter").value=d.letter??"";$("mWpm").value=d.wpm??"";$("mFiller").value=d.filler??"";$("mNote").value=d.note??""; }
function saveManual(){ const k=$("mDate").value||todayISO(); const d=ensureDay(k);
  d.listen=+$("mListen").value||0;d.speak=+$("mSpeak").value||0;d.srs=+$("mSrs").value||0;d.letter=+$("mLetter").value||0;
  d.wpm=$("mWpm").value===""?null:+$("mWpm").value; d.filler=$("mFiller").value===""?null:+$("mFiller").value; d.note=$("mNote").value||""; d.taskLog={}; d.ts=Date.now();
  save(); scheduleSync(); renderStats(); toast("保存しました"); }

// ===== PLAN =====
function renderPlan(){ $("weekTbl").innerHTML="<tr><th>曜</th><th>メニュー</th></tr>"+
  [1,2,3,4,5,6,0].map(w=>`<tr><td>${WD[w]}</td><td>${SCHED[w].map(t=>t.nm).join(" ／ ")}</td></tr>`).join("");
  const b=S.meta.baseline; $("baseShow").innerHTML = b ? `保存済みベースライン（${b.date}）：Listening ${b.L??"—"}% ・ Writing ${b.W||"—"} ・ Speaking ${b.S||"—"} ・ wpm ${b.wpm??"—"}` : "まだ未測定。診断したら上に入力して保存。";
  if(b){ $("bL").value=b.L??"";$("bW").value=b.W||"";$("bS").value=b.S||"";$("bWpm").value=b.wpm??""; }
  renderReview();
}
const REVIEW_ITEMS=["フル模試 or セクション模試を1回やった","スコア/wpm/フィラーを記録し前月比を確認","ロールプレイ採点で繰り返し出た弱点→新カード追加","OETレターのバンドが上がっているか","業績：今月の投稿/発表/教育を1つ進めた","(Y3以降) フェロー先・締切・必要書類の進捗"];
function curMonth(){ return todayISO().slice(0,7); }
function renderReview(){ const el=$("reviewList"); if(!el)return; const m=curMonth(); S.meta.review=S.meta.review||{}; const chk=S.meta.review[m]||[];
  $("reviewMonth").textContent=m;
  el.innerHTML=REVIEW_ITEMS.map((t,i)=>`<label style="display:flex;gap:8px;align-items:flex-start;color:var(--ink);margin:6px 0"><input type="checkbox" style="width:auto;margin-top:3px" ${chk[i]?"checked":""} onchange="toggleReview(${i},this.checked)"> <span>${t}</span></label>`).join(""); }
function toggleReview(i,v){ const m=curMonth(); S.meta.review=S.meta.review||{}; const a=S.meta.review[m]||(S.meta.review[m]=[]); a[i]=v; save(); scheduleSync(); }
function saveBaseline(){ S.meta.baseline={date:todayISO(),L:$("bL").value===""?null:+$("bL").value,W:$("bW").value.toUpperCase(),S:$("bS").value.toUpperCase(),wpm:$("bWpm").value===""?null:+$("bWpm").value}; save(); scheduleSync(); renderPlan(); toast("ベースラインを保存しました"); }

// ===== SETTINGS =====
function renderSettings(){ $("syncUrl").value=S.sync.url||""; $("syncCode").value=S.sync.code||""; $("dailyNew").value=S.meta.dailyNew||8;
  const ep=endpoint(); $("syncMsg").innerHTML = ep ? ("有効：最終同期 "+(S.sync.lastSync?new Date(S.sync.lastSync).toLocaleString():"なし")) : "未設定（URLと同期コードを入力）";
  const bk=$("backupMsg"); if(bk){ const le=S.meta.lastExport; bk.textContent = le ? ("最終エクスポート: "+le) : "まだエクスポートしていません（クラウド同期があれば必須ではありません）"; } }
function saveSync(){ S.sync.url=$("syncUrl").value.trim(); S.sync.code=$("syncCode").value.trim(); save(); renderSettings(); if(endpoint()){toast("同期を有効化");cloudSync(false);}else toast("URLとコードを入れてください"); }
function setDailyNew(v){ S.meta.dailyNew=Math.max(0,+v||0); save(); scheduleSync(); }
function exportJSON(){ const blob=new Blob([JSON.stringify(S,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="english-canada-"+todayISO()+".json"; a.click(); S.meta.lastExport=todayISO(); save(); if(view==="settings")renderSettings(); }
function importJSON(ev){ const f=ev.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{ try{ const inc=JSON.parse(r.result); S=mergeState(S,inc); save(); toast("インポート完了"); go(view);}catch(e){toast("読み込み失敗");} }; r.readAsText(f); }

// ===== CLOUD SYNC (Firebase Realtime DB, REST) =====
function endpoint(){ if(!S.sync.url||!S.sync.code)return null; return S.sync.url.replace(/\/+$/,"")+"/engca/"+encodeURIComponent(S.sync.code)+".json"; }
let __syncing=false,__syncTimer=null;
function scheduleSync(){ if(!endpoint())return; clearTimeout(__syncTimer); __syncTimer=setTimeout(()=>cloudSync(true),3500); }
async function cloudSync(silent){ const url=endpoint(); if(!url){ if(!silent)toast("クラウド同期が未設定です"); return; }
  if(__syncing)return; __syncing=true;
  try{
    const res=await fetch(url,{cache:"no-store"}); if(!res.ok)throw new Error("HTTP "+res.status);
    const remote=await res.json(); if(remote&&typeof remote==="object") S=mergeRemote(S,remote);
    const put=await fetch(url,{method:"PUT",body:JSON.stringify({days:S.days,srs:S.srs,meta:S.meta,updatedAt:Date.now()})});
    if(!put.ok)throw new Error("HTTP "+put.status);
    S.sync.lastSync=Date.now(); save(); renderHeader(); if(view==="settings")renderSettings();
    if(!silent)toast("✅ 同期しました");
  }catch(e){ if(!silent)toast("同期失敗："+e.message); }
  finally{ __syncing=false; }
}
function mergeRemote(s,r){ return mergeState(s,{days:r.days||{},srs:r.srs||{},meta:r.meta||{}}); }
function mergeState(s,inc){
  // days
  const days=Object.assign({},s.days);
  for(const k in (inc.days||{})){ const a=days[k], b=inc.days[k]; if(!a){days[k]=b;continue;}
    const newer=(b.ts||0)>(a.ts||0)?b:a, older=(b.ts||0)>(a.ts||0)?a:b;
    days[k]={ listen:Math.max(a.listen||0,b.listen||0), speak:Math.max(a.speak||0,b.speak||0),
      srs:Math.max(a.srs||0,b.srs||0), letter:Math.max(a.letter||0,b.letter||0), newSrs:Math.max(a.newSrs||0,b.newSrs||0),
      wpm:newer.wpm!=null?newer.wpm:older.wpm, filler:newer.filler!=null?newer.filler:older.filler,
      note:newer.note||older.note||"", letterDraft:newer.letterDraft||older.letterDraft||"",
      taskLog:Object.assign({},older.taskLog||{},newer.taskLog||{}),
      done:[...new Set([...(a.done||[]),...(b.done||[])])], ts:Math.max(a.ts||0,b.ts||0) };
  }
  // srs : newer last wins
  const srs=Object.assign({},s.srs);
  for(const id in (inc.srs||{})){ const a=srs[id], b=inc.srs[id]; if(!a||((b.last||0)>(a.last||0)))srs[id]=b; }
  // meta
  const meta=Object.assign({},s.meta);
  if(inc.meta){ if(!meta.baseline&&inc.meta.baseline)meta.baseline=inc.meta.baseline;
    if(inc.meta.startDate&&(!meta.startDate||inc.meta.startDate<meta.startDate))meta.startDate=inc.meta.startDate;
    if(inc.meta.dailyNew&&!meta.dailyNew)meta.dailyNew=inc.meta.dailyNew;
    if(inc.meta.lastExport&&(!meta.lastExport||inc.meta.lastExport>meta.lastExport))meta.lastExport=inc.meta.lastExport;
    if(inc.meta.review){ meta.review=meta.review||{}; for(const mo in inc.meta.review){ const a=meta.review[mo]||[], bb=inc.meta.review[mo]||[]; const len=Math.max(a.length,bb.length); const out=[]; for(let i=0;i<len;i++)out[i]=!!(a[i]||bb[i]); meta.review[mo]=out; } } }
  return {days,srs,meta,sync:s.sync};
}

// ===== 日付またぎの自動切替 =====
let __curDay=todayISO();
setInterval(()=>{ const t=todayISO(); if(t!==__curDay){ __curDay=t; openTask=null; if(view==="today")renderToday(); else renderHeader(); } }, 30000);

// ===== SRSキーボード操作（Mac: Space/Enter=表示, 1–4=採点） =====
document.addEventListener("keydown",e=>{
  if($("srsPlay").style.display==="none"||$("v-srs").classList.contains("on")===false)return;
  const revealed=$("cReveal").style.display!=="none";
  if((e.code==="Space"||e.code==="Enter")&&!revealed){ e.preventDefault(); reveal(); }
  else if(revealed&&["1","2","3","4"].includes(e.key)){ e.preventDefault(); grade({"1":2,"2":3,"3":4,"4":5}[e.key]); }
});

// ===== 初回ウェルカム =====
function maybeWelcome(){ if(localStorage.getItem("engca_seen"))return;
  const o=$("welcome"); if(o){ o.style.display="flex"; } }
function closeWelcome(goSync){ localStorage.setItem("engca_seen","1"); const o=$("welcome"); if(o)o.style.display="none"; if(goSync)go("settings"); }

// ===== アプリ復帰時に最新へ自動同期（端末をまたいだ鮮度確保） =====
document.addEventListener("visibilitychange",()=>{ if(!document.hidden && endpoint()){ cloudSync(true).then(()=>{ if(view==="today")renderToday(); }); } });

// ===== boot =====
renderToday();
maybeWelcome();
if(endpoint()) cloudSync(true);
