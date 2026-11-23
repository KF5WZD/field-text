/* Field Text v0.2 — local-first UI prototype. Radio transmission is simulated. */
(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const main = $("#main");
  const storageKey = "fieldtext.v02";
  const defaultState = {
    callsign: "",
    loggedIn: false,
    quick: ["I am OK.","Need assistance.","At my location.","Returning to base.","Message received.","Radio check.","Battery low.","Will call again shortly."],
    chats: [
      {id:"demo-w4xyz", call:"W4XYZ", msgs:[
        {text:"Copy your signal. How is your setup working?",rx:true,time:"20:42"},
        {text:"Testing Field Text from the truck. Audio is good.",rx:false,time:"20:44"}
      ]},
      {id:"demo-k5abc",call:"K5ABC",msgs:[{text:"Meet at the trailhead at 0800.",rx:true,time:"19:10"}]}
    ]
  };
  const frequencies = {
    HF:[
      ["160m","1.840 MHz","FT8 activity reference","1.800–2.000 MHz band"],
      ["80m","3.573 MHz","FT8 activity reference","3.500–4.000 MHz band"],
      ["60m","Channelized","Digital operation is channel restricted; check current FCC rules","5 MHz band · US channel rules apply"],
      ["40m","7.074 MHz","FT8 activity reference","7.000–7.300 MHz band"],
      ["30m","10.136 MHz","FT8 activity reference","10.100–10.150 MHz band"],
      ["20m","14.074 MHz","FT8 activity reference","14.000–14.350 MHz band"],
      ["17m","18.100 MHz","FT8 activity reference","18.068–18.168 MHz band"],
      ["15m","21.074 MHz","FT8 activity reference","21.000–21.450 MHz band"],
      ["12m","24.915 MHz","FT8 activity reference","24.890–24.990 MHz band"],
      ["10m","28.074 MHz","FT8 activity reference","28.000–29.700 MHz band"],
      ["HF Data","3.590–3.600 MHz","Common RTTY/data segment reference","80m · check regional plan"],
      ["HF Data","7.080–7.125 MHz","Common RTTY/data segment reference","40m · check regional plan"],
      ["HF Data","14.070–14.112 MHz","Common RTTY/data segment reference","20m · check regional plan"]
    ],
    VHF:[
      ["6m","50.313 MHz","FT8 activity reference","50–54 MHz band"],
      ["2m","144.174 MHz","FT8 activity reference","144–148 MHz band"],
      ["2m","144.200 MHz","SSB calling frequency reference","Weak-signal activity"],
      ["2m","145.010 MHz","Common packet frequency in some areas","Regional packet use"],
      ["2m","145.030 MHz","Common packet frequency in some areas","Regional packet use"],
      ["2m","145.050 MHz","Common packet frequency in some areas","Regional packet use"],
      ["2m","146.520 MHz","National FM simplex calling frequency","FM voice calling"],
      ["1.25m","222.100 MHz","Weak-signal calling frequency reference","222–225 MHz band"],
      ["1.25m","223.520–223.640 MHz","Regional digital/packet activity reference","Check local band plan"]
    ],
    UHF:[
      ["70cm","432.174 MHz","FT8 activity reference","420–450 MHz US band"],
      ["70cm","432.100 MHz","Weak-signal calling frequency reference","CW / SSB"],
      ["70cm","446.000 MHz","Common FM simplex frequency","FM voice"],
      ["33cm","902–928 MHz","Amateur allocation; local usage varies","Digital / weak signal / FM"]
    ],
    SHF:[
      ["23cm","1.296 GHz","Common weak-signal/microwave reference","1240–1300 MHz"],
      ["13cm","2.3 GHz","Amateur allocation segments vary","US segments: 2300–2310 / 2390–2450 MHz"],
      ["9cm","3.4 GHz","Microwave band; allocation varies by region","US: 3300–3500 MHz"],
      ["5cm","5.76 GHz","Weak-signal activity reference","5650–5925 MHz US"],
      ["3cm","10.368 GHz","Weak-signal activity reference","10.0–10.5 GHz"],
      ["1.2cm","24.0 GHz","Amateur allocation reference","24.0–24.25 GHz"]
    ]
  };
  let state = loadState();
  let page = "messages", selectedChat = null, radioTab = "console", freqBand = "HF", freqSearch = "";

  function loadState(){
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if(saved && typeof saved === "object") return {...structuredClone(defaultState),...saved};
    } catch(e){}
    return structuredClone(defaultState);
  }
  function saveState(){
    try{localStorage.setItem(storageKey,JSON.stringify(state));}
    catch(e){setStatus("STORAGE UNAVAILABLE · SESSION ONLY");}
  }
  function setStatus(t){$("#statusText").textContent=t;}
  function timeNow(){return new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});}
  function nav(){
    document.querySelectorAll(".nav-button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function renderLogin(){
    const screen=$("#loginScreen");
    if(state.loggedIn){screen.classList.add("hidden");return;}
    screen.classList.remove("hidden");
    screen.innerHTML=`<div class="login-panel"><div class="login-brand"><span>▰</span> FIELD TEXT</div><div class="tagline">OFF-GRID DIGITAL MESSAGING</div><h2>Welcome to Field Text</h2><p>Enter your amateur radio callsign to get started. No password or account required. Your callsign and local messages will be remembered on this device.</p><label for="loginCallsign">Callsign</label><input id="loginCallsign" maxlength="16" autocomplete="nickname" placeholder="e.g. KF5WZD" value="${escapeHtml(state.callsign||"")}"><button class="primary" id="loginContinue">Continue</button><div class="tiny" style="margin-top:13px">Passwordless · Stored locally on this device</div></div>`;
    const input=$("#loginCallsign");
    $("#loginContinue").onclick=login;
    input.addEventListener("keydown",e=>{if(e.key==="Enter")login();});
    input.focus();
  }
  function login(){
    const value=$("#loginCallsign")?.value.trim().toUpperCase();
    if(!value){alert("Enter your callsign to continue.");return;}
    state.callsign=value;state.loggedIn=true;saveState();render();setStatus("READY · DEMO MODE");
  }
  function render(){
    renderLogin();
    if(!state.loggedIn){$("#appShell").classList.add("hidden");return;}
    $("#appShell").classList.remove("hidden");
    $("#headerCallsign").textContent=state.callsign;
    nav();
    if(page==="messages") renderMessages();
    if(page==="radio") renderRadio();
    if(page==="quick") renderQuick();
    if(page==="settings") renderSettings();
  }
  function renderMessages(){
    if(selectedChat){
      const chat=state.chats.find(c=>c.id===selectedChat);
      if(!chat){selectedChat=null;return renderMessages();}
      main.innerHTML=`<button class="ghost small" id="backInbox">← Inbox</button><h2 style="margin-top:13px">Conversation · ${escapeHtml(chat.call)}</h2><div class="conversation-actions"><button class="delete-btn small" id="clearConversation">Delete Conversation</button></div><div id="chatLog"></div><label for="reply">Message</label><textarea id="reply" maxlength="170" placeholder="Type a message…"></textarea><div class="tiny" id="replyCount">0 / 170 characters</div><button class="primary" id="sendReply" style="width:100%;margin-top:10px">Transmit Message</button>`;
      $("#backInbox").onclick=()=>{selectedChat=null;render();};
      const log=$("#chatLog");
      chat.msgs.forEach((m,index)=>appendMessage(log,m,index,chat));
      $("#clearConversation").onclick=()=>{
        if(confirm(`Delete the entire conversation with ${chat.call}? This cannot be undone.`)){
          state.chats=state.chats.filter(c=>c.id!==chat.id);saveState();selectedChat=null;render();
        }
      };
      $("#reply").oninput=e=>$("#replyCount").textContent=`${e.target.value.length} / 170 characters`;
      $("#sendReply").onclick=()=>sendToChat(chat,$("#reply").value);
      return;
    }
    main.innerHTML=`<h2>Messages</h2><button class="primary compose-button" id="newMessage">＋ Compose Message</button>${state.chats.length?state.chats.map(c=>{
      const last=c.msgs[c.msgs.length-1];
      return `<article class="card" data-card="${escapeHtml(c.id)}"><div class="flex"><button class="ghost" data-open="${escapeHtml(c.id)}" style="text-align:left;flex:1"><span class="call">${escapeHtml(c.call)}</span><span class="tiny" style="float:right">${escapeHtml(last?.time||"")}</span><div class="preview">${escapeHtml(last?.text||"No messages yet")}</div></button><button class="delete-btn small" data-delete-chat="${escapeHtml(c.id)}" title="Delete conversation">Delete</button></div></article>`;
    }).join(""):`<div class="empty">No conversations yet.<br>Compose a message to start.</div>`}<div class="tiny" style="margin-top:12px">Demo conversations are included. Your messages and callsign save locally on this device.</div>`;
    $("#newMessage").onclick=compose;
    main.querySelectorAll("[data-open]").forEach(el=>el.onclick=()=>{selectedChat=el.dataset.open;render();});
    main.querySelectorAll("[data-delete-chat]").forEach(btn=>btn.onclick=()=>{
      const id=btn.dataset.deleteChat,chat=state.chats.find(c=>c.id===id);
      if(chat&&confirm(`Delete the entire conversation with ${chat.call}? This cannot be undone.`)){
        state.chats=state.chats.filter(c=>c.id!==id);saveState();render();
      }
    });
  }
  function appendMessage(log,m,index,chat){
    const wrap=document.createElement("div");wrap.className="message-wrap "+(m.rx?"rx":"tx");
    const div=document.createElement("div");div.className="message "+(m.rx?"rx":"tx");div.textContent=m.text;
    const meta=document.createElement("div");meta.className="message-meta";meta.textContent=(m.rx?"RX":"TX")+" · "+m.time;
    div.appendChild(meta);wrap.appendChild(div);
    const actions=document.createElement("div");actions.className="message-actions";
    const del=document.createElement("button");del.textContent="Delete message";
    del.onclick=()=>{if(confirm("Delete this message? This cannot be undone.")){chat.msgs.splice(index,1);saveState();render();}};
    actions.appendChild(del);wrap.appendChild(actions);log.appendChild(wrap);
  }
  function sendToChat(chat,text){
    text=text.trim();if(!text)return alert("Enter a message first.");
    chat.msgs.push({text,rx:false,time:timeNow()});saveState();setStatus("TX · SIMULATED");
    render();window.setTimeout(()=>setStatus("READY · DEMO MODE"),900);
  }
  function compose(prefill=""){
    main.innerHTML=`<button class="ghost small" id="cancelCompose">← Back</button><h2 style="margin-top:13px">Compose Message</h2><label for="recipient">Recipient Callsign</label><input id="recipient" maxlength="16" placeholder="e.g. W4XYZ"><label for="messageBody">Message</label><textarea id="messageBody" maxlength="170" placeholder="Write message…">${escapeHtml(prefill)}</textarea><div class="tiny" id="count">0 / 170 characters</div><button class="primary" id="transmit" style="width:100%;margin-top:10px">Transmit</button><div class="card" style="margin-top:12px"><div class="tiny">PROTOTYPE NOTE</div><div class="preview">This version records messages locally. No radio audio is transmitted.</div></div>`;
    $("#cancelCompose").onclick=render;
    $("#messageBody").oninput=e=>$("#count").textContent=`${e.target.value.length} / 170 characters`;
    $("#transmit").onclick=()=>{
      const to=$("#recipient").value.trim().toUpperCase(),text=$("#messageBody").value.trim();
      if(!to||!text)return alert("Enter a recipient callsign and message.");
      let chat=state.chats.find(c=>c.call===to);
      if(!chat){chat={id:crypto.randomUUID?.()||String(Date.now()),call:to,msgs:[]};state.chats.unshift(chat);}
      chat.msgs.push({text,rx:false,time:timeNow()});saveState();selectedChat=chat.id;setStatus("TX · SIMULATED");render();window.setTimeout(()=>setStatus("READY · DEMO MODE"),900);
    };
  }
  function renderRadio(){
    main.innerHTML=`<h2>Radio</h2><div class="tabs"><button data-tab="console" class="${radioTab==="console"?"active":""}">Radio Console</button><button data-tab="guide" class="${radioTab==="guide"?"active":""}">Frequency Guide</button></div><div id="radioBody"></div>`;
    main.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{radioTab=b.dataset.tab;renderRadio();});
    if(radioTab==="console"){
      $("#radioBody").innerHTML=`<div class="card"><div class="flex"><b>Audio Link</b><span class="pill">SIMULATED</span></div><div style="font-size:23px;font-weight:900;margin:14px 0">Modem not connected</div><div class="note">Audio transmit and receive engine is not implemented yet.</div><div class="signal-bar"><div class="signal-fill"></div></div><div class="tiny">Demonstration signal meter</div></div><div class="button-row"><button class="primary" id="testTx">▶ Test TX</button><button id="listen">◉ Listen</button></div><div class="card" style="margin-top:12px"><b>Frequency Guide</b><div class="note">Common activity and band-plan references across HF, VHF, UHF and SHF.</div><button class="primary" id="openGuide" style="width:100%;margin-top:10px">Open Frequency Guide</button></div>`;
      $("#testTx").onclick=()=>{setStatus("TX TEST · SIMULATED");window.setTimeout(()=>setStatus("READY · DEMO MODE"),1400);};
      $("#listen").onclick=()=>{setStatus("RX MODE · SIMULATED");window.setTimeout(()=>setStatus("READY · DEMO MODE"),2000);};
      $("#openGuide").onclick=()=>{radioTab="guide";renderRadio();};
    }else renderGuide();
  }
  function renderGuide(){
    const body=$("#radioBody");
    body.innerHTML=`<div class="tabs">${["HF","VHF","UHF","SHF"].map(b=>`<button data-band="${b}" class="${freqBand===b?"active":""}">${b}</button>`).join("")}</div><input id="freqSearch" placeholder="Search band, frequency, or activity…" value="${escapeHtml(freqSearch)}"><div id="freqList"></div><div class="warning"><b>Frequency references only.</b> These are not Field Text-approved frequencies. Confirm current regional band plans, license privileges, emission/bandwidth restrictions, and listen before transmitting. US 60m operation is channelized and subject to specific rules.</div><div class="tiny">Activity frequencies are references and may vary by region or change over time.</div>`;
    body.querySelectorAll("[data-band]").forEach(b=>b.onclick=()=>{freqBand=b.dataset.band;renderGuide();});
    $("#freqSearch").oninput=e=>{freqSearch=e.target.value;updateFreqList();};
    updateFreqList();
  }
  function updateFreqList(){
    const list=$("#freqList");if(!list)return;
    const query=freqSearch.toLowerCase();
    const matches=frequencies[freqBand].filter(row=>row.join(" ").toLowerCase().includes(query));
    list.innerHTML=matches.map(row=>`<div class="card"><div class="flex"><div><div class="band">${escapeHtml(row[0])}</div><div class="freq">${escapeHtml(row[1])}</div></div><button class="small ghost" data-copy="${escapeHtml(row[1])}">Copy</button></div><div class="note">${escapeHtml(row[2])}</div><div class="tiny" style="margin-top:6px">${escapeHtml(row[3])}</div></div>`).join("")||`<div class="empty">No matches found.</div>`;
    list.querySelectorAll("[data-copy]").forEach(btn=>btn.onclick=async()=>{
      const val=btn.dataset.copy;
      try{await navigator.clipboard.writeText(val);btn.textContent="Copied";setStatus("FREQUENCY COPIED");}
      catch{fallbackCopy(val);btn.textContent="Copied";setStatus("FREQUENCY COPIED");}
    });
  }
  function fallbackCopy(text){
    const input=document.createElement("textarea");input.value=text;input.style.position="fixed";input.style.opacity="0";document.body.appendChild(input);input.select();try{document.execCommand("copy");}catch{}input.remove();
  }
  function renderQuick(){
    main.innerHTML=`<h2>Quick Messages</h2><div class="subheading">Tap a preset to prepare it for transmission.</div>${state.quick.map((q,i)=>`<button class="quick-button" data-quick="${i}">↗ ${escapeHtml(q)}</button>`).join("")}<div class="card" style="margin-top:13px"><label for="customQuick">Add a custom preset</label><input id="customQuick" placeholder="Your quick message"><button class="primary" id="addQuick">Add preset</button></div>`;
    main.querySelectorAll("[data-quick]").forEach(b=>b.onclick=()=>compose(state.quick[Number(b.dataset.quick)]));
    $("#addQuick").onclick=()=>{const q=$("#customQuick").value.trim();if(!q)return;state.quick.push(q);saveState();renderQuick();};
  }
  function renderSettings(){
    main.innerHTML=`<h2>Settings</h2><div class="card"><label for="callsign">Your Callsign</label><input id="callsign" maxlength="16" value="${escapeHtml(state.callsign)}"><button class="primary" id="saveCall">Save Callsign</button></div><div class="card"><div class="flex"><b>Offline-first</b><span class="pill">LOCAL STORAGE</span></div><div class="note">Calls, messages and custom quick messages are stored in this browser on this device.</div></div><div class="card"><b>App information</b><div class="note">Field Text v0.3 · UI prototype. Audio modem, radio integration, and true over-the-air messaging are not yet implemented.</div></div><button class="ghost" id="logout" style="width:100%;margin-bottom:9px">Log Out</button><button class="ghost" id="resetDemo" style="width:100%">Reset demo data</button>`;
    $("#saveCall").onclick=()=>{const c=$("#callsign").value.trim().toUpperCase();if(!c)return alert("Enter a callsign.");state.callsign=c;state.loggedIn=true;saveState();render();setStatus("CALLSIGN SAVED");};
    $("#logout").onclick=()=>{state.loggedIn=false;saveState();render();};
    $("#resetDemo").onclick=()=>{if(confirm("Reset local Field Text demo data, callsign and login?")){localStorage.removeItem(storageKey);state=structuredClone(defaultState);render();setStatus("DEMO DATA RESET");}};
  }
  document.querySelectorAll(".nav-button").forEach(b=>b.onclick=()=>{page=b.dataset.page;selectedChat=null;render();});
  render();
})();