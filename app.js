/* ===== English for Canada — 今日やることアプリ 本体 ===== */
const LS = "engca_v1";
const $ = id => document.getElementById(id);
const todayISO = () => new Date().toLocaleDateString("en-CA");
const dnum = () => Math.floor(Date.parse(todayISO())/86400000);
const WD = ["日","月","火","水","木","金","土"];

const DECK = window.DECK || {cards:[],meta:{categories:{}}};
const C = window.CONTENT;
const WPM_WORDS = (C && C.wpmPassage) ? C.wpmPassage.trim().split(/\s+/).length : 150; // 音読パッセージの実語数（≈160）

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
  renderCharCard();
  renderHeader();
  checkLevelUp();
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
    <div class="mut">音読でwpm自動計測：開始 → 下の${WPM_WORDS}語を音読 → 停止で算出。</div>
    <div class="pre" style="max-height:110px;overflow:auto">${esc(C.wpmPassage)}</div>
    <div class="timer" id="wpmDisp">00:00</div>
    <div class="btns"><button onclick="wpmStart()">▶ 開始</button><button class="warn" onclick="wpmStop('${targetId}')">■ 停止して算出</button></div>
  </div>`; }
function wpmStart(){ if(wpmT.h)clearInterval(wpmT.h); wpmT={sec:0,h:setInterval(()=>{wpmT.sec++;const e=$("wpmDisp");if(e)e.textContent=fmt(wpmT.sec);},1000)}; const e=$("wpmDisp");if(e)e.textContent="00:00"; toast("音読開始"); }
function wpmStop(targetId){ if(!wpmT.h)return; clearInterval(wpmT.h); const sec=wpmT.sec; wpmT={sec:0,h:null}; if(sec<3){toast("短すぎます");return;} const wpm=Math.round(WPM_WORDS/sec*60); const inp=$(targetId); if(inp){inp.value=wpm; inp.dispatchEvent(new Event("input"));} toast("wpm = "+wpm+"（記入しました）"); }
function finishRole(id,defMin){ const m=+($("min_"+id).value||defMin); const w=$("wpm_"+id).value, f=$("fil_"+id).value;
  logTask(id,{speak:m, note:$("note_"+id).value||undefined, wpm:w===""?undefined:+w, filler:f===""?undefined:+f});
  toast("+"+m+"分 記録しました"); renderToday(); }

// --- pronunciation ---
function pronUI(t){ return `<p class="big"><b>発音・流暢性 / または OETリスニング</b></p>
  <p class="mut">録音→文字起こしを下のプロンプトに貼ってAIに診断させる。リスニング日にしてもOK。</p>
  <div class="btns"><button onclick='copyText(${jstr(C.pron)})'>📋 発音診断プロンプトをコピー</button>
    <button class="ghost" onclick='copyText(${jstr(C.wpmPassage)})'>📋 音読パッセージ(${WPM_WORDS}語)</button></div>
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
  Q.i++; scheduleSync(); checkLevelUp(); showCard();
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
function activeKey(k){ return actDay(S.days[k]); }
function prevKey(day){ const p=new Date(day); p.setDate(p.getDate()-1); return p.toLocaleDateString("en-CA"); }
function streakInfo(){ let day=new Date(todayISO());
  if(!activeKey(day.toLocaleDateString("en-CA"))) day.setDate(day.getDate()-1); // 今日未達でも“継続中”扱い（日が終わるまで0にしない）
  let count=0, walked=0, lastSkip=-999;
  for(;;){ const k=day.toLocaleDateString("en-CA");
    if(activeKey(k)){ count++; walked++; day.setDate(day.getDate()-1); continue; }
    // 週1の予備日：アクティブ日に挟まれたギャップだけ、直近7歩で未使用なら吸収
    if(count>0 && (walked-lastSkip)>=7 && activeKey(prevKey(day))){ lastSkip=walked; walked++; day.setDate(day.getDate()-1); continue; }
    break; }
  return {count, gracesLeft:(walked-lastSkip)>=7?1:0}; }
function streak(){ return streakInfo().count; }
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
    <tr><td>予備日（週1・継続保護）</td><td>残り ${streakInfo().gracesLeft}</td><td>1日空けてもOK</td></tr>
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
  renderHeatmap();
  // manual form
  if(!$("mDate").value)$("mDate").value=todayISO();
  loadManual();
}
function renderHeatmap(){ const el=$("heatmap"); if(!el)return;
  const today=new Date(todayISO()); const N=91; const days=[];
  for(let i=N-1;i>=0;i--){ const d=new Date(today); d.setDate(d.getDate()-i); days.push(d); }
  const pad=days[0].getDay(); const arr=[]; for(let i=0;i<pad;i++)arr.push(null); days.forEach(d=>arr.push(d));
  let html="";
  for(let c=0;c<arr.length;c+=7){ html+='<div class="hmcol">';
    for(let r=0;r<7;r++){ const d=arr[c+r];
      if(!d){ html+='<div class="hmcell empty"></div>'; continue; }
      const k=d.toLocaleDateString("en-CA"); const x=S.days[k]||{}; const m=(x.listen||0)+(x.speak||0);
      const lv=m===0?0:m<15?1:m<30?2:m<60?3:4;
      html+=`<div class="hmcell l${lv}" title="${k}: ${m}分"></div>`; }
    html+="</div>"; }
  el.innerHTML=html; }
$("mDate")?.addEventListener?.("change",loadManual);
function loadManual(){ const d=S.days[$("mDate").value]||{}; $("mListen").value=d.listen??"";$("mSpeak").value=d.speak??"";$("mSrs").value=d.srs??"";$("mLetter").value=d.letter??"";$("mWpm").value=d.wpm??"";$("mFiller").value=d.filler??"";$("mNote").value=d.note??""; }
function saveManual(){ const k=$("mDate").value||todayISO(); const d=ensureDay(k);
  d.listen=+$("mListen").value||0;d.speak=+$("mSpeak").value||0;d.srs=+$("mSrs").value||0;d.letter=+$("mLetter").value||0;
  d.wpm=$("mWpm").value===""?null:+$("mWpm").value; d.filler=$("mFiller").value===""?null:+$("mFiller").value; d.note=$("mNote").value||""; d.taskLog={}; d.ts=Date.now();
  save(); scheduleSync(); renderStats(); toast("保存しました"); }

// ===== PLAN =====
function renderPlan(){ $("weekTbl").innerHTML="<tr><th>曜</th><th>メニュー</th></tr>"+
  [1,2,3,4,5,6,0].map(w=>`<tr><td>${WD[w]}</td><td>${SCHED[w].map(t=>t.nm).join(" ／ ")}</td></tr>`).join("");
  const b=S.meta.baseline;
  if(b){ let html=`保存済みベースライン（${b.date}）：Listening ${b.L??"—"}% ・ Writing ${b.W||"—"} ・ Speaking ${b.S||"—"} ・ wpm ${b.wpm??"—"}`;
    if(b.label){ html+=`<div style="margin-top:8px;color:var(--ink)"><b>現在地（律速）：${b.label}</b>（最弱 ${b.weakest||"—"}）</div>`+(b.rules||[]).map(r=>`<div class="p0rule">▶ ${r}</div>`).join(""); }
    $("baseShow").innerHTML=html;
    $("bL").value=b.L??"";$("bW").value=b.W||"";$("bS").value=b.S||"";$("bWpm").value=b.wpm??"";
  } else $("baseShow").innerHTML="まだ未測定。「▶ ガイド付き診断を始める」から。";
  renderReview();
}
const REVIEW_ITEMS=["フル模試 or セクション模試を1回やった","スコア/wpm/フィラーを記録し前月比を確認","ロールプレイ採点で繰り返し出た弱点→新カード追加","OETレターのバンドが上がっているか","業績：今月の投稿/発表/教育を1つ進めた","(Y3以降) フェロー先・締切・必要書類の進捗"];
function curMonth(){ return todayISO().slice(0,7); }
function renderReview(){ const el=$("reviewList"); if(!el)return; const m=curMonth(); S.meta.review=S.meta.review||{}; const chk=S.meta.review[m]||[];
  $("reviewMonth").textContent=m;
  el.innerHTML=REVIEW_ITEMS.map((t,i)=>`<label style="display:flex;gap:8px;align-items:flex-start;color:var(--ink);margin:6px 0"><input type="checkbox" style="width:auto;margin-top:3px" ${chk[i]?"checked":""} onchange="toggleReview(${i},this.checked)"> <span>${t}</span></label>`).join(""); }
function toggleReview(i,v){ const m=curMonth(); S.meta.review=S.meta.review||{}; const a=S.meta.review[m]||(S.meta.review[m]=[]); a[i]=v; save(); scheduleSync(); }
function saveBaseline(){ const b={date:todayISO(),L:$("bL").value===""?null:+$("bL").value,W:$("bW").value.toUpperCase(),S:$("bS").value.toUpperCase(),wpm:$("bWpm").value===""?null:+$("bWpm").value};
  const a=assessBaseline(b); if(a){ b.weakest=a.weakest; b.label=a.label; b.rules=a.rules; }
  S.meta.baseline=b; save(); scheduleSync(); renderPlan(); toast("ベースラインを保存しました"); }

// ===== PHASE 0 — ガイド付き診断（モーダル） =====
const P0_CANDO={
 Listening:["医療系の講義/ポッドキャストを字幕なしで7割以上理解できる","カナダ英語の早口・なまり・口語の患者を1回で聞き取れる","電話越し（音質低下）でも要点を取り違えない","数字・薬剤名・否定/条件(unless等)を聞き逃さない"],
 Reading:["論文のAbstract〜結論を辞書なしで読み通せる","ガイドライン本文を実用速度で読める","同意書・行政文書の固い言い回しを誤解しない","知らない語を文脈で推測して止まらず読める"],
 Speaking:["術前面談を、言い直しはあっても最後まで自力で回せる","リスク説明を平易な言葉に言い換えできる","詰まっても沈黙でなくつなぎ語で繋げる","雑談を相手のテンポで返せる"],
 Writing:["紹介状を構成立てて20分で書ける","受動態・時制・冠詞のミスが「ときどき」程度","定型表現(I am writing to refer…)が手に馴染む","箇条書きでなく自然な文章で要約できる"]
};
let p0={cando:{}};
function assessBaseline(o){
  const gl=g=>({A:4,B:3,"C+":2,C:2,D:1,E:1})[(g||"").toUpperCase()]||null;
  const ll=p=>{ p=+p; if(!p)return null; if(p<55)return 1; if(p<79)return 2; return 3; };
  const skills={Listening:ll(o.L), Reading:o.reading?+o.reading:null, Writing:gl(o.W), Speaking:gl(o.S)};
  const have=Object.values(skills).filter(x=>x!=null); if(have.length<2)return null;
  const min=Math.min(...have);
  const weakest=Object.entries(skills).filter(([,x])=>x===min).map(([k])=>k).join("・");
  const LAB={1:"B1以下 (OET D / IELTS ~5)",2:"B2 (OET C / IELTS ~6)",3:"B2–C1 (OET B圏 / IELTS ~7)",4:"C1+ (OET A圏 / IELTS 7.5+)"};
  const rules=[];
  if(min===1)rules.push("最弱が <b>B1以下</b> → Y1前半は Listening×シャドーイング＋発音 に寄せる。OET戦略は底上げ後。SRSは毎日固定。");
  else if(min===2)rules.push("全体が <b>B1〜B2（C/C+圏）</b> → Y1後半から OET 4技能の型に着手。Writing週2・Speaking週3を主軸。");
  else rules.push("<b>B2〜C1（B圏が見える）</b> → 試験対策を前倒し。模試を月1に、Y2前半でのOET-B受験を射程に。MCCQE Part I も前倒し可。");
  if(o.wpm&&+o.wpm<110)rules.push("wpm &lt; 110 → 流暢性ドリル（音読・シャドーイング）を毎日固定。130+ が自然域の目標。");
  if(o.filler&&+o.filler>=8)rules.push("フィラー率が高い → つなぎ語の置換（um→ポーズ＋so,/right,）を1か月の重点に。");
  return {min,weakest,label:LAB[min],rules};
}
function p0Sub(skill){ const o=p0.cando[skill]||{}; return (o[0]||0)+(o[1]||0)+(o[2]||0)+(o[3]||0); }
function openPhase0(){
  const b=S.meta.baseline||{}; p0={cando:(b.p0&&b.p0.cando)||{}, L:b.L??null, W:b.W||"", S:b.S||"", wpm:b.wpm??null, filler:b.filler??null, reading:b.reading?String(b.reading):"", cefr:b.cefr||"", lcause:b.lcause||""};
  buildP0(); $("phase0Modal").style.display="flex"; computeP0();
}
function closePhase0(){ $("phase0Modal").style.display="none"; }
function p0grade(key,val,btn){ p0[key]=val; btn.parentElement.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===btn)); computeP0(); }
function p0cando(skill,i,val,btn){ p0.cando[skill]=p0.cando[skill]||{}; p0.cando[skill][i]=val; btn.parentElement.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===btn)); computeP0(); }
function p0in(key,el){ p0[key]= el.value===""?(key==="reading"||key==="cefr"||key==="lcause"?"":null):(el.type==="number"?+el.value:el.value); computeP0(); }
function gbtns(key){ return `<div class="p0g">`+["A","B","C+","C","D","E"].map(g=>`<button class="${p0[key]===g?'on':''}" onclick="p0grade('${key}','${g}',this)">${g}</button>`).join("")+`</div>`; }
function buildP0(){
  let h="";
  // Step 1
  h+=`<div class="p0step"><b>1. 自己申告 can-do（5分）</b><div class="mut">余裕=2 / 何とか=1 / 無理=0（目安。実測=Step2–5が本データ）</div>`;
  Object.entries(P0_CANDO).forEach(([skill,qs])=>{
    h+=`<div style="font-weight:700;color:var(--accent);font-size:13px;margin:10px 0 2px">${skill}</div>`;
    qs.forEach((q,i)=>{ const cur=(p0.cando[skill]||{})[i];
      h+=`<div class="p0q"><span>${q}</span><span class="p0opts">`+[0,1,2].map(v=>`<button class="${cur===v?'on':''}" onclick="p0cando('${skill}',${i},${v},this)">${v}</button>`).join("")+`</span></div>`; });
    h+=`<div class="mut" id="p0sub_${skill}" style="text-align:right"></div>`;
  });
  h+=`</div>`;
  // Step 2 Writing
  const Lt=C.letters[0];
  h+=`<div class="p0step"><b>2. Writing（25分）— OET紹介状</b>
    <div class="mut">タイマー25分で下の症例だけを根拠に紹介状(180–200語)→採点プロンプトをAIへ貼って A–E を採点。</div>
    <details><summary>${esc(Lt.title)}（症例ノート）</summary><div class="pre">${esc(Lt.notes)}</div></details>
    <div class="btns"><button class="ghost" onclick='copyText(${jstr(C.letterGrader)})'>📋 採点プロンプトをコピー</button></div>
    <label>採点結果（総合 A–E）</label>${gbtns("W")}</div>`;
  // Step 3 Speaking
  const rp=C.roleplays[0];
  h+=`<div class="p0step"><b>3. Speaking（15分）</b>
    <div class="mut">①下のロールプレイを録音しながら5分→"END"で採点。②パッセージを音読してwpm自動計測。</div>
    <div class="btns"><button class="ghost" onclick='copyText(${jstr(rp.prompt+"\n\n"+C.rubric)})'>📋 ロールプレイ①＋ルーブリック</button></div>
    ${wpmWidget("p0_wpm")}
    <div class="row">
      <div><label>CEFR</label><select onchange="p0in('cefr',this)">`+["","A2","B1","B1+","B2","B2+","C1","C1+"].map(o=>`<option ${p0.cefr===o?'selected':''}>${o}</option>`).join("")+`</select></div>
      <div><label>OET Speaking</label>${gbtns("S")}</div>
    </div>
    <div class="row">
      <div><label>wpm</label><input type="number" id="p0_wpm" min="0" value="${p0.wpm??''}" oninput="p0in('wpm',this)"></div>
      <div><label>filler %</label><input type="number" min="0" value="${p0.filler??''}" oninput="p0in('filler',this)"></div>
    </div></div>`;
  // Step 4 Listening
  h+=`<div class="p0step"><b>4. Listening（20分）</b>
    <div class="mut">下のどちらか：①OET無料サンプルListening1セクション→理解率%。②麻酔系音声を字幕オフ5分→字幕オンで答え合わせ。</div>
    <div class="mut" style="font-size:12px">・OET無料サンプル：oet.com/ready/sample-tests/oet-test-on-paper/medicine<br>・British Council 無料IELTS：takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-english-practice-tests</div>
    <div class="row">
      <div><label>字幕なし理解 %</label><input type="number" min="0" max="100" value="${p0.L??''}" oninput="p0in('L',this)"></div>
      <div><label>取りこぼし主因</label><select onchange="p0in('lcause',this)">`+["","数字・薬剤名","否定・条件","なまり・口語","速度","音質(電話)"].map(o=>`<option ${p0.lcause===o?'selected':''}>${o||"—"}</option>`).join("")+`</select></div>
    </div></div>`;
  // Step 5 Reading
  h+=`<div class="p0step"><b>5. Reading（15分）</b>
    <div class="mut">英語論文のAbstract1本＋本文1段落を辞書なし・時間計測で読む→日本語3行要約→正誤確認（PubMedで麻酔系1本）。</div>
    <label>辞書なしの理解</label><select onchange="p0in('reading',this)">`+[["","—"],["3","はい（ほぼ理解）"],["2","おおむね"],["1","つらい"]].map(([v,t])=>`<option value="${v}" ${String(p0.reading)===v?'selected':''}>${t}</option>`).join("")+`</select></div>`;
  $("p0body").innerHTML=h;
}
function computeP0(){
  Object.keys(P0_CANDO).forEach(s=>{ const el=$("p0sub_"+s); if(el){ const v=p0Sub(s); const band=v<=2?"A2〜B1":v<=5?"B1〜B2":v<=7?"B2〜C1":"C1+"; el.textContent=`小計 ${v}/8 → 目安 ${band}`; } });
  const a=assessBaseline(p0); const v=$("p0verdict"); if(!v)return;
  if(!a){ v.innerHTML=`<div class="mut">Step2–5を実測して、グレード／％を入れると「現在地」と「次の一手」が出ます。</div>`; return; }
  v.innerHTML=`<div class="big"><b>現在地（律速＝最弱）：${a.label}</b></div>
    <div class="mut" style="margin:4px 0">最弱技能：${a.weakest}</div>`+a.rules.map(r=>`<div class="p0rule">▶ ${r}</div>`).join("");
}
function savePhase0(){
  const b={ date:todayISO(), L:p0.L??null, W:(p0.W||"").toUpperCase(), S:(p0.S||"").toUpperCase(),
    wpm:p0.wpm??null, filler:p0.filler??null, reading:p0.reading?+p0.reading:null,
    cefr:p0.cefr||"", lcause:p0.lcause||"", p0:{cando:p0.cando} };
  const a=assessBaseline(b); if(a){ b.weakest=a.weakest; b.label=a.label; b.rules=a.rules; }
  S.meta.baseline=b; save(); scheduleSync(); closePhase0(); if(view==="plan")renderPlan(); toast("ベースラインを保存しました ✓");
}

// ===== SETTINGS =====
function renderSettings(){ $("syncUrl").value=S.sync.url||""; $("syncCode").value=S.sync.code||""; $("dailyNew").value=S.meta.dailyNew||8;
  if($("avatarStyle"))$("avatarStyle").value=S.meta.avatarStyle==="career"?"career":"animal";
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
function maybeIosHint(){ const el=$("iosHint"); if(!el)return;
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone=window.navigator.standalone===true||matchMedia("(display-mode: standalone)").matches;
  if(isIOS && !standalone && !localStorage.getItem("engca_ios")) el.style.display="flex"; }
function dismissIos(){ localStorage.setItem("engca_ios","1"); const el=$("iosHint"); if(el)el.style.display="none"; }

// ===== キャラクター育成（XP/レベル/称号/実績 — すべて記録から算出） =====
const STAGES=[
  {min:1,  ja:"医学生英語",         en:"Pre-clinical English", av:"🧑‍🎓"},
  {min:4,  ja:"臨床英語ビギナー",   en:"Clinical Beginner",    av:"🩺"},
  {min:7,  ja:"研修医レベル",       en:"Resident",             av:"🧑‍⚕️"},
  {min:11, ja:"OETチャレンジャー",  en:"OET Challenger",       av:"📝"},
  {min:16, ja:"クリニカルフェロー", en:"Clinical Fellow",      av:"🥼"},
  {min:22, ja:"指導医 (Attending)", en:"Attending",            av:"👨‍⚕️"},
  {min:29, ja:"准教授",             en:"Assistant Professor",  av:"👨‍🏫"},
  {min:37, ja:"FRCPC / 教授",       en:"Professor",            av:"🎓"},
];
// 動物マスコット版（同じレベル境界で進化）
const ANIMALS=[
  {min:1,  ja:"たまご",         en:"", av:"🥚"},
  {min:4,  ja:"ひな",           en:"", av:"🐣"},
  {min:7,  ja:"ビーバー",       en:"", av:"🦫"},
  {min:11, ja:"キツネ",         en:"", av:"🦊"},
  {min:16, ja:"シカ",           en:"", av:"🦌"},
  {min:22, ja:"ムース",         en:"", av:"🫎"},
  {min:29, ja:"クマ",           en:"", av:"🐻"},
  {min:37, ja:"カナダの主",     en:"", av:"🍁"},
];
function stageSet(){ return S.meta.avatarStyle==="career" ? STAGES : ANIMALS; } // 既定は動物マスコット版
function threeAxis(d){ return (d.listen||0)>0 && ((d.speak||0)>0||(d.letter||0)>0) && (d.srs||0)>0; }
function xpOfDay(d){ return (d.listen||0)+(d.speak||0)+(d.srs||0)*2+(d.letter||0)*40+(threeAxis(d)?20:0); }
function totalXP(){ return Object.values(S.days).reduce((a,d)=>a+xpOfDay(d),0); }
function levelInfo(xp){ let lvl=1, base=0, cost=120; while(xp>=base+cost){ base+=cost; lvl++; cost=80+40*lvl; }
  const set=stageSet(); let ci=0; for(let i=0;i<set.length;i++){ if(lvl>=set[i].min)ci=i; }
  return {lvl, into:xp-base, span:cost, stage:set[ci], ci, set}; }
function actDay(x){ return x&&((x.listen||0)+(x.speak||0)+(x.srs||0))>0; }
function moodLine(){ const t=todayISO(); if(actDay(S.days[t]))return "絶好調！今日も積み上げ中 🔥";
  if(actDay(S.days[addDays(t,-1)]))return "連続記録キープ中。今日もどれか1つ 🙂"; return "ひさしぶり！軽く1つから 💪"; }
function agg(){ let srs=0,letter=0,listen=0,maxWpm=0; const active=[];
  Object.entries(S.days).forEach(([k,d])=>{ srs+=d.srs||0; letter+=d.letter||0; listen+=d.listen||0; if(d.wpm!=null)maxWpm=Math.max(maxWpm,d.wpm); if(actDay(d))active.push(k); });
  active.sort(); let best=0,run=0,prev=null; active.forEach(k=>{ run=(prev&&k===addDays(prev,1))?run+1:1; best=Math.max(best,run); prev=k; });
  let bestWeek=0; Object.keys(S.days).forEach(k=>{ let s=0; for(let i=0;i<7;i++){ const kk=addDays(k,-i); if(S.days[kk])s+=(S.days[kk].listen||0)+(S.days[kk].speak||0);} bestWeek=Math.max(bestWeek,s); });
  const cats=new Set(); Object.keys(S.srs).forEach(id=>{ const c=DECK.cards.find(x=>x.id===id); if(c)cats.add(c.cat); });
  const allCats=Object.keys(DECK.meta.categories||{}).length||new Set(DECK.cards.map(c=>c.cat)).size;
  return {srs,letter,listen,maxWpm,best,bestWeek,catCount:cats.size,allCats}; }
function achievements(){ const a=agg(); return [
  {ic:"🔥",nm:"継続 7日",cur:a.best,tg:7},
  {ic:"🔥",nm:"継続 30日",cur:a.best,tg:30},
  {ic:"💯",nm:"継続 100日",cur:a.best,tg:100},
  {ic:"🗂️",nm:"SRS 100枚",cur:a.srs,tg:100},
  {ic:"🗂️",nm:"SRS 1000枚",cur:a.srs,tg:1000},
  {ic:"✉️",nm:"紹介状 10通",cur:a.letter,tg:10},
  {ic:"✉️",nm:"紹介状 50通",cur:a.letter,tg:50},
  {ic:"🎧",nm:"インプット 10h",cur:Math.floor(a.listen/60),tg:10},
  {ic:"🎧",nm:"インプット 50h",cur:Math.floor(a.listen/60),tg:50},
  {ic:"🗣️",nm:"wpm 130突破",cur:a.maxWpm,tg:130},
  {ic:"📚",nm:"全カテゴリ制覇",cur:a.catCount,tg:a.allCats},
  {ic:"🎯",nm:"週 200分達成",cur:a.bestWeek,tg:200},
]; }
function nextBadge(){ const lock=achievements().filter(a=>a.cur<a.tg); if(!lock.length)return null;
  return lock.sort((a,b)=>(b.cur/b.tg)-(a.cur/a.tg))[0]; }
function renderCharCard(){ const xp=totalXP(), li=levelInfo(xp), pct=Math.min(100,Math.round(li.into/li.span*100));
  const ac=achievements(), unlocked=ac.filter(x=>x.cur>=x.tg).length; const nb=nextBadge();
  $("charCard").innerHTML=`<div class="avatar" id="charAv">${li.stage.av}<span class="lv">Lv${li.lvl}</span></div>
    <div class="charInfo"><div class="title">${li.stage.ja}</div><div class="mood">${moodLine()}</div>
    <div class="xpbar"><i style="width:${pct}%"></i></div>
    <div class="xpnum">XP ${xp} ・ 次のレベルまで ${li.span-li.into} ・ 実績 ${unlocked}/${ac.length}</div>
    ${nb?`<div class="xpnum">次の実績：${nb.ic} ${nb.nm}（あと ${nb.tg-nb.cur}）`:`<div class="xpnum">実績コンプリート！🏆`}・ タップで詳細</div></div>`; }
function popAvatar(){ const a=$("charAv"); if(a){ a.classList.remove("pop"); void a.offsetWidth; a.classList.add("pop"); } }
function checkLevelUp(){ const li=levelInfo(totalXP()); const raw=localStorage.getItem("engca_lvl");
  if(raw===null){ localStorage.setItem("engca_lvl",li.lvl); return; }
  const prev=+raw;
  if(li.lvl>prev){ localStorage.setItem("engca_lvl",li.lvl);
    const evolved=stageSet().some(s=>s.min>prev && s.min<=li.lvl);
    toast(evolved ? `✨ 進化！ ${li.stage.av} ${li.stage.ja} になった！` : `🎉 レベルアップ！ Lv${li.lvl} ・ ${li.stage.ja}`);
    popAvatar();
  } else if(li.lvl<prev){ localStorage.setItem("engca_lvl",li.lvl); } }
function openBuddy(){ renderBuddy(); $("buddyModal").style.display="flex"; }
function closeBuddy(){ $("buddyModal").style.display="none"; }
function renderBuddy(){ const xp=totalXP(), li=levelInfo(xp), pct=Math.min(100,Math.round(li.into/li.span*100));
  $("bAvatar").textContent=li.stage.av; $("bTitle").textContent=`Lv${li.lvl} ${li.stage.ja}`; $("bSub").textContent=li.stage.en;
  $("bXp").style.width=pct+"%"; $("bXpNum").textContent=`XP ${xp} ・ 次のレベルまで ${li.span-li.into}`;
  $("bBadges").innerHTML=achievements().map(a=>{ const done=a.cur>=a.tg; return `<div class="badge ${done?'':'lock'}"><div class="bi">${done?a.ic:'🔒'}</div><div class="bn">${a.nm}</div><div class="bp">${Math.min(a.cur,a.tg)}/${a.tg}</div></div>`; }).join("");
  $("bLadder").innerHTML=li.set.map((s,i)=>`<div class="step ${i===li.ci?'cur':''} ${i<li.ci?'done2':''}"><span>${s.av}</span><span>Lv${s.min}〜 ${s.ja}${s.en?"（"+s.en+"）":""}</span></div>`).join(""); }
function setAvatarStyle(v){ S.meta.avatarStyle=v; save(); if(view==="today")renderToday(); toast(v==="animal"?"マスコット版にしました":"キャリア版にしました"); }

// ===== アプリ復帰時に最新へ自動同期（端末をまたいだ鮮度確保） =====
document.addEventListener("visibilitychange",()=>{ if(!document.hidden && endpoint()){ cloudSync(true).then(()=>{ if(view==="today")renderToday(); }); } });

// ===== boot =====
renderToday();
maybeWelcome();
maybeIosHint();
if(endpoint()) cloudSync(true);
