/* Field Text v0.5.3 — favorite contacts */
(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const main = $("#main");
  const storageKey = "fieldtext.v02";
  let audioCtx = null, txBusy = false, txLevel = 0.35;
  const defaultState = {
    callsign: "",
    loggedIn: false,
    quick: ["I am OK.","Need assistance.","At my location.","Returning to base.","Message received.","Radio check.","Battery low.","Will call again shortly."],
    contacts: [],
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
  let rxPanelOpen = false, rxLastDecoded = null;

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
    if(page==="contacts") renderContacts();
  }
  function renderMessages(){
    if(selectedChat){
      const chat=state.chats.find(c=>c.id===selectedChat);
      if(!chat){selectedChat=null;return renderMessages();}
      main.innerHTML=`<button class="ghost small" id="backInbox">← Inbox</button><h2 style="margin-top:13px">Conversation · ${escapeHtml(chat.call)}</h2>${chat.msgs.some(m=>m.rx&&m.ackNeeded)?`<div class="card ack-card"><b>Delivery acknowledgment requested</b><div class="note">Send a short acknowledgment to ${escapeHtml(chat.call)} confirming receipt.</div><button class="primary" id="sendAck" style="width:100%;margin-top:8px">Send Delivery ACK</button></div>`:''}${audioRxPanelMarkup()}<div class="conversation-actions"><button class="delete-btn small" id="clearConversation">Delete Conversation</button></div><div id="chatLog"></div><label for="reply">Message</label><textarea id="reply" maxlength="170" placeholder="Type a message…"></textarea><div class="tiny" id="replyCount">0 / 170 characters</div><button class="primary" id="sendReply" style="width:100%;margin-top:10px">Transmit Message</button>`;
      $("#backInbox").onclick=()=>{selectedChat=null;render();};
      bindAudioRxPanel();
      const log=$("#chatLog");
      chat.msgs.forEach((m,index)=>appendMessage(log,m,index,chat));
      $("#clearConversation").onclick=()=>{
        if(confirm(`Delete the entire conversation with ${chat.call}? This cannot be undone.`)){
          state.chats=state.chats.filter(c=>c.id!==chat.id);saveState();selectedChat=null;render();
        }
      };
      $("#reply").oninput=e=>$("#replyCount").textContent=`${e.target.value.length} / 170 characters`;
      $("#sendReply").onclick=()=>sendToChat(chat,$("#reply").value);
      const ackBtn=$("#sendAck");if(ackBtn)ackBtn.onclick=()=>sendAcknowledgment(chat);
      return;
    }
    main.innerHTML=`<h2>Messages</h2>${audioRxPanelMarkup()}<button class="primary compose-button" id="newMessage">＋ Compose Message</button>${state.chats.length?state.chats.map(c=>{
      const last=c.msgs[c.msgs.length-1];
      return `<article class="card" data-card="${escapeHtml(c.id)}"><div class="flex"><button class="ghost" data-open="${escapeHtml(c.id)}" style="text-align:left;flex:1"><span class="call">${escapeHtml(c.call)}</span><span class="tiny" style="float:right">${escapeHtml(last?.time||"")}</span><div class="preview">${escapeHtml(last?.text||"No messages yet")}</div></button><button class="delete-btn small" data-delete-chat="${escapeHtml(c.id)}" title="Delete conversation">Delete</button></div></article>`;
    }).join(""):`<div class="empty">No conversations yet.<br>Compose a message to start.</div>`}<div class="tiny" style="margin-top:12px">Demo conversations are included. Your messages and callsign save locally on this device.</div>`;
    bindAudioRxPanel();
    $("#newMessage").onclick=compose;
    main.querySelectorAll("[data-open]").forEach(el=>el.onclick=()=>{selectedChat=el.dataset.open;render();});
    main.querySelectorAll("[data-delete-chat]").forEach(btn=>btn.onclick=()=>{
      const id=btn.dataset.deleteChat,chat=state.chats.find(c=>c.id===id);
      if(chat&&confirm(`Delete the entire conversation with ${chat.call}? This cannot be undone.`)){
        state.chats=state.chats.filter(c=>c.id!==id);saveState();render();
      }
    });
  }
  function audioRxPanelMarkup(){
    return `<div class="card audio-rx-card"><button class="ghost audio-rx-toggle" id="toggleAudioRx" style="width:100%;text-align:left"><span class="flex"><b>◉ Audio RX</b><span class="pill">${rxActive?'LISTENING':'RECEIVER'}</span></span><span class="tiny">${rxPanelOpen?'Tap to hide receiver controls':'Tap to open microphone receiver'}</span></button>${rxPanelOpen?`<div class="audio-rx-controls"><div class="note">Place your phone near the radio speaker. Listening for Field Text 1200/1800 Hz tones. Keep transmit audio muted while receiving.</div><div class="button-row" style="margin-top:10px"><button class="primary" id="rxStart">Start Listening</button><button class="delete-btn hidden" id="rxStop">Stop Listening</button></div><div id="rxStatus" class="tiny" style="margin-top:8px">${rxActive?'Listening for 1200/1800 Hz modem tones…':'Receiver stopped.'}</div><div class="signal-bar"><div class="signal-fill" id="rxMeterFill" style="width:0%"></div></div><div class="tiny" id="rxLevelText">Audio level 0.0% · ${rxActive?'listening':'idle'}</div><div id="rxDecoded" style="margin-top:10px">${rxLastDecoded?`<div class="success-note"><b>Packet decoded · CRC OK</b><div class="note">From ${escapeHtml(rxLastDecoded.from)}${rxLastDecoded.to?` → ${escapeHtml(rxLastDecoded.to)}`:''}</div><div class="preview">${escapeHtml(rxLastDecoded.text)}</div></div>`:''}</div></div>`:''}</div>`;
  }
  function bindAudioRxPanel(){
    const toggle=$('#toggleAudioRx');if(toggle)toggle.onclick=()=>{rxPanelOpen=!rxPanelOpen;renderMessages();};
    if(!rxPanelOpen)return;
    const start=$('#rxStart'),stop=$('#rxStop');if(start)start.onclick=startReceive;if(stop)stop.onclick=stopReceive;
    updateRxControls();
  }
  function updateRxControls(){
    const start=$('#rxStart'),stop=$('#rxStop'),status=$('#rxStatus');
    if(start)start.classList.toggle('hidden',rxActive);if(stop)stop.classList.toggle('hidden',!rxActive);
    if(status)status.textContent=rxActive?'Listening for 1200/1800 Hz modem tones…':'Receiver stopped.';
    const pill=$('.audio-rx-toggle .pill');if(pill)pill.textContent=rxActive?'LISTENING':'RECEIVER';
    const out=$('#rxDecoded');if(out&&rxLastDecoded)out.innerHTML=`<div class="success-note"><b>Packet decoded · CRC OK</b><div class="note">From ${escapeHtml(rxLastDecoded.from)}${rxLastDecoded.to?` → ${escapeHtml(rxLastDecoded.to)}`:''}</div><div class="preview">${escapeHtml(rxLastDecoded.text)}</div></div>`;
  }
  function appendMessage(log,m,index,chat){
    const wrap=document.createElement("div");wrap.className="message-wrap "+(m.rx?"rx":"tx");
    const div=document.createElement("div");div.className="message "+(m.rx?"rx":"tx");div.textContent=m.text;
    const meta=document.createElement("div");meta.className="message-meta";meta.textContent=(m.rx?"RX":"TX")+" · "+m.time+(m.rx?"":m.txState==="delivered"?" · DELIVERED":m.txState==="sent"?" · SENT (NO ACK)":m.txState==="failed"?" · TX FAILED":m.txState==="transmitting"?" · TRANSMITTING":"");
    div.appendChild(meta);wrap.appendChild(div);
    const actions=document.createElement("div");actions.className="message-actions";
    const del=document.createElement("button");del.textContent="Delete message";
    del.onclick=()=>{if(confirm("Delete this message? This cannot be undone.")){chat.msgs.splice(index,1);saveState();render();}};
    actions.appendChild(del);wrap.appendChild(actions);log.appendChild(wrap);
  }
  function sendToChat(chat,text){
    text=text.trim();if(!text)return alert("Enter a message first.");
    const messageId=(crypto.randomUUID?.()||String(Date.now())+"-"+Math.random().toString(16).slice(2));
    const packet={type:"message",id:messageId,from:state.callsign,to:chat.call,text};
    chat.msgs.push({id:messageId,text,rx:false,time:timeNow(),txState:"transmitting"});saveState();
    render(); transmitPacket(packet).then(ok=>{const m=chat.msgs.find(x=>x.id===messageId);if(m){m.txState=ok?"sent":"failed";saveState();}if(!ok)setStatus("TX FAILED");if(page==="messages"&&selectedChat===chat.id)renderMessages();});
  }
  function sendAcknowledgment(chat){
    const pending=chat.msgs.filter(m=>m.rx&&m.ackNeeded);
    if(!pending.length)return;
    const latest=pending[pending.length-1];
    const packet={type:"ack",messageId:latest.id,from:state.callsign,to:chat.call,text:"DELIVERED"};
    latest.ackNeeded=false;latest.ackSent=true;saveState();renderMessages();
    transmitPacket(packet).then(ok=>{setStatus(ok?"ACK TRANSMITTED":"ACK TX FAILED");});
  }
  function crc16(bytes){
    let crc=0xFFFF;
    for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc&1)?((crc>>>1)^0xA001):(crc>>>1);}
    return crc&0xFFFF;
  }
  function packetBytes(packet){
    const payload=new TextEncoder().encode(JSON.stringify(packet));
    if(payload.length>240)throw new Error("Payload too large for this prototype modem.");
    const framed=[...new Uint8Array(16).fill(0x55),0xD3,0x91,(payload.length>>8)&255,payload.length&255,...payload];
    const crc=crc16(framed.slice(16));framed.push(crc&255,(crc>>8)&255);return framed;
  }
  function bitsFromBytes(bytes){
    const bits=[];for(const b of bytes){bits.push(0);for(let i=0;i<8;i++)bits.push((b>>i)&1);bits.push(1);}return bits;
  }
  async function transmitPacket(packet){
    if(txBusy){alert("The modem is already transmitting.");return false;}
    if(!window.AudioContext&&!window.webkitAudioContext){alert("Web Audio is not supported in this browser.");return false;}
    try{
      txBusy=true;setStatus("TX · PREPARING AUDIO");
      audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
      await audioCtx.resume();
      const bytes=packetBytes(packet),bits=bitsFromBytes(bytes),baud=100,bitDur=1/baud,sr=audioCtx.sampleRate;
      const samples=Math.ceil(bits.length*bitDur*sr),buf=audioCtx.createBuffer(1,samples,sr),data=buf.getChannelData(0);
      let phase=0,idx=0;const f0=1200,f1=1800,edge=Math.max(1,Math.floor(sr*0.003));
      for(const bit of bits){const freq=bit?f1:f0,n=Math.round(bitDur*sr);for(let j=0;j<n&&idx<samples;j++,idx++){
        phase+=2*Math.PI*freq/sr;if(phase>2*Math.PI)phase-=2*Math.PI;
        let env=1;if(j<edge)env=j/edge;else if(j>n-edge)env=(n-j)/edge;
        data[idx]=Math.sin(phase)*env*txLevel;
      }}
      const source=audioCtx.createBufferSource(),gain=audioCtx.createGain();source.buffer=buf;gain.gain.value=1;source.connect(gain);gain.connect(audioCtx.destination);
      setStatus(`TX · ${bits.length} BITS · ${Math.ceil(bits.length/baud)}s`);
      source.onended=()=>{txBusy=false;setStatus("READY · AUDIO MODEM");};source.start();return true;
    }catch(err){txBusy=false;setStatus("TX ERROR");alert("Audio transmission failed: "+err.message);return false;}
  }
  function testTone(freq=1200,duration=1){
    if(txBusy)return alert("The modem is already transmitting.");
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return alert("Web Audio not supported in this browser.");
    try{
      audioCtx=audioCtx||new AC();
      const resumePromise=audioCtx.resume();
      const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
      osc.type="sine";osc.frequency.value=freq;
      const t=audioCtx.currentTime;
      gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(Math.min(txLevel,0.5),t+0.03);
      gain.gain.setValueAtTime(Math.min(txLevel,0.5),t+duration-0.04);gain.gain.linearRampToValueAtTime(0,t+duration);
      osc.connect(gain);gain.connect(audioCtx.destination);osc.start(t);osc.stop(t+duration);
      setStatus(`AUDIO TEST · ${freq} Hz`);osc.onended=()=>setStatus("READY · AUDIO MODEM");
      resumePromise.catch(err=>{setStatus("AUDIO BLOCKED");alert("Browser blocked audio playback: "+err.message+". Tap the test tone again and check your audio output device.");});
    }catch(err){setStatus("AUDIO ERROR");alert("Audio test failed: "+err.message);}
  }
  function compose(prefill=""){
    main.innerHTML=`<button class="ghost small" id="cancelCompose">← Back</button><h2 style="margin-top:13px">Compose Message</h2><label for="recipient">Recipient Callsign</label><input id="recipient" list="favoriteRecipientList" maxlength="16" placeholder="e.g. W4XYZ"><datalist id="favoriteRecipientList">${(state.contacts||[]).map(c=>`<option value="${escapeHtml(c.call)}">${escapeHtml(c.name||c.call)}</option>`).join("")}</datalist><label for="messageBody">Message</label><textarea id="messageBody" maxlength="170" placeholder="Write message…">${escapeHtml(prefill)}</textarea><div class="tiny" id="count">0 / 170 characters</div><button class="primary" id="transmit" style="width:100%;margin-top:10px">Transmit</button><div class="card" style="margin-top:12px"><div class="tiny">PROTOTYPE NOTE</div><div class="preview">Packets include a public recipient callsign. Only the addressed Field Text station saves the message. Delivery is confirmed only when that station sends an ACK.</div></div>`;
    $("#cancelCompose").onclick=render;
    $("#messageBody").oninput=e=>$("#count").textContent=`${e.target.value.length} / 170 characters`;
    $("#transmit").onclick=()=>{
      const to=$("#recipient").value.trim().toUpperCase(),text=$("#messageBody").value.trim();
      if(!to||!text)return alert("Enter a recipient callsign and message.");
      let chat=state.chats.find(c=>c.call===to);
      if(!chat){chat={id:crypto.randomUUID?.()||String(Date.now()),call:to,msgs:[]};state.chats.unshift(chat);}
      const messageId=(crypto.randomUUID?.()||String(Date.now())+"-"+Math.random().toString(16).slice(2));
      chat.msgs.push({id:messageId,text,rx:false,time:timeNow(),txState:"transmitting"});saveState();selectedChat=chat.id;
      const txPromise=transmitPacket({type:"message",id:messageId,from:state.callsign,to:to,text});render();txPromise.then(ok=>{const m=chat.msgs.find(x=>x.id===messageId);if(m){m.txState=ok?"sent":"failed";saveState();}if(!ok)setStatus("TX FAILED");if(page==="messages"&&selectedChat===chat.id)renderMessages();});
    };
  }
  // Experimental RX: microphone capture, 10ms 2-FSK detection, UART framing and packet/CRC parsing.
  let rxStream=null,rxProcessor=null,rxBuffer=[],rxBits=[],rxActive=false,rxWindowSize=0;
  function goertzelPower(samples,freq,sr){const coeff=2*Math.cos(2*Math.PI*freq/sr);let s0=0,s1=0,s2=0;for(let i=0;i<samples.length;i++){const w=0.5-0.5*Math.cos(2*Math.PI*i/(samples.length-1));s0=samples[i]*w+coeff*s1-s2;s2=s1;s1=s0;}return s1*s1+s2*s2-coeff*s1*s2;}
  function rxProcessWindow(samples,sr){let rms=0;for(const x of samples)rms+=x*x;rms=Math.sqrt(rms/samples.length);const p0=goertzelPower(samples,1200,sr),p1=goertzelPower(samples,1800,sr),conf=Math.abs(p1-p0)/(p0+p1||1);const meter=$('#rxMeterFill');if(meter)meter.style.width=Math.min(100,Math.round(rms*900))+'%';const lvl=$('#rxLevelText');if(lvl)lvl.textContent=`Audio level ${(rms*100).toFixed(1)}% · ${conf>.18?'tone detected':'listening'}`;if(rms>.006){rxBits.push({bit:p1>p0?1:0,conf});if(rxBits.length>24000)rxBits=rxBits.slice(-12000);rxTryDecode();}}
  function rxTryDecode(){for(let phase=0;phase<2;phase++){const symbols=[];for(let i=phase;i+1<rxBits.length;i+=2){const a=rxBits[i],b=rxBits[i+1];symbols.push(a.bit===b.bit?a.bit:(a.conf>=b.conf?a.bit:b.bit));}for(let offset=0;offset<10;offset++){const raw=[];for(let i=offset;i+9<symbols.length;i+=10){if(symbols[i]!==0||symbols[i+9]!==1)continue;let byte=0;for(let k=0;k<8;k++)byte|=symbols[i+1+k]<<k;raw.push(byte);}for(let j=0;j+5<raw.length;j++){if(raw[j]!==0xD3||raw[j+1]!==0x91)continue;const len=(raw[j+2]<<8)|raw[j+3];if(len>240||j+4+len+2>raw.length)continue;const payload=raw.slice(j+4,j+4+len),crc=raw[j+4+len]|raw[j+5+len]<<8;if(crc16(raw.slice(j,j+4+len))!==crc)continue;try{const packet=JSON.parse(new TextDecoder().decode(new Uint8Array(payload)));rxHandlePacket(packet);rxBits=[];return; }catch{}}}}}
  function rxHandlePacket(packet){
    if(!packet||typeof packet.from!=="string")return;
    const from=packet.from.trim().toUpperCase(),to=(packet.to||"").trim().toUpperCase();
    if(!from||from===state.callsign.toUpperCase())return;
    // Recipient callsigns are public routing labels, not encryption.
    if(to!=="ALL"&&to!==state.callsign.toUpperCase())return;
    if(packet.type==="ack"){
      const chat=state.chats.find(c=>c.call===from);
      if(chat){
        const msg=chat.msgs.find(m=>m.id===packet.messageId&&!m.rx);
        if(msg){msg.txState="delivered";msg.ackAt=Date.now();saveState();setStatus(`DELIVERY ACK · ${from}`);if(page==="messages")renderMessages();}
      }
      return;
    }
    if(packet.type==="test" || (packet.type && packet.type!=="message"))return;
    if(typeof packet.text!=="string"||!packet.text)return;
    let chat=state.chats.find(c=>c.call===from);
    if(!chat){chat={id:crypto.randomUUID?.()||String(Date.now()),call:from,msgs:[]};state.chats.unshift(chat);}
    if(chat.msgs.some(m=>m.rx&&m.id&&m.id===packet.id))return;
    if(chat.msgs.some(m=>m.rx&&m.text===packet.text&&m.from===from&&m.rxPacketAt&&Date.now()-m.rxPacketAt<60000))return;
    chat.msgs.push({id:packet.id||("rx-"+Date.now()),text:packet.text,rx:true,time:timeNow(),from,rxPacketAt:Date.now(),ackNeeded:!!packet.id});
    saveState();rxLastDecoded={from,to,text:packet.text};setStatus(`RX MESSAGE · ${from}`);
    if(page==="messages")renderMessages();updateRxControls();
  }
  async function startReceive(){if(rxActive)return;if(!navigator.mediaDevices?.getUserMedia){alert('Microphone access requires HTTPS/localhost and a supported browser.');return;}try{rxStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Web Audio unsupported');audioCtx=audioCtx||new AC();await audioCtx.resume();const src=audioCtx.createMediaStreamSource(rxStream);rxProcessor=audioCtx.createScriptProcessor(256,1,1);rxWindowSize=Math.round(audioCtx.sampleRate*.005);rxBuffer=[];rxBits=[];rxActive=true;rxProcessor.onaudioprocess=e=>{if(!rxActive)return;const input=e.inputBuffer.getChannelData(0);for(let i=0;i<input.length;i++)rxBuffer.push(input[i]);while(rxBuffer.length>=rxWindowSize){const win=rxBuffer.splice(0,rxWindowSize);rxProcessWindow(win,audioCtx.sampleRate);}};src.connect(rxProcessor);rxProcessor.connect(audioCtx.destination);updateRxControls();setStatus('RX LISTENING · MICROPHONE');}catch(err){stopReceive();setStatus('RX ERROR');alert('Could not start microphone: '+err.message);}}
  function stopReceive(){rxActive=false;try{rxProcessor?.disconnect();}catch{}rxProcessor=null;if(rxStream){rxStream.getTracks().forEach(t=>t.stop());rxStream=null;}updateRxControls();setStatus('READY · AUDIO MODEM');}

  function renderRadio(){
    main.innerHTML=`<h2>Radio</h2><div class="tabs"><button data-tab="console" class="${radioTab==="console"?"active":""}">Radio Console</button><button data-tab="guide" class="${radioTab==="guide"?"active":""}">Frequency Guide</button></div><div id="radioBody"></div>`;
    main.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{radioTab=b.dataset.tab;renderRadio();});
    if(radioTab==="console"){
      $("#radioBody").innerHTML=`<div class="card"><div class="flex"><b>Audio Modem</b><span class="pill">TX + RX EXPERIMENTAL</span></div><div style="font-size:23px;font-weight:900;margin:14px 0">2-FSK · 100 baud</div><div class="note">1200 Hz = bit 0 · 1800 Hz = bit 1 · UART-framed bytes · sync + payload length + CRC-16.</div><label for="txLevel">Audio output level</label><input id="txLevel" type="range" min="0.05" max="0.8" step="0.05" value="${txLevel}"><div class="tiny">Start low. Avoid overdriving your radio audio input.</div><div class="button-row" style="margin-top:12px"><button id="tone0">Test 1200 Hz</button><button id="tone1">Test 1800 Hz</button></div><button class="primary" id="testPacket" style="width:100%;margin-top:9px">Transmit Test Packet</button></div><div class="card"><div class="flex"><b>Receive / Decode</b><span class="pill">MICROPHONE</span></div><div class="note">Grant microphone access. For radio reception, place this phone near your radio speaker. The microphone listens for 1200/1800 Hz Field Text tones; no cable is needed. Keep TX audio muted while receiving to avoid feedback.</div><div class="button-row" style="margin-top:10px"><button class="primary" id="rxStart">Start RX</button><button class="delete-btn hidden" id="rxStop">Stop RX</button></div><div id="rxStatus" class="tiny" style="margin-top:8px">Receiver stopped.</div><div class="signal-bar"><div class="signal-fill" id="rxMeterFill" style="width:0%"></div></div><div class="tiny" id="rxLevelText">Audio level 0.0% · idle</div><div id="rxDecoded" style="margin-top:10px"></div></div><div class="warning"><b>Radio testing:</b> manual PTT only. Experimental modem, not optimized for RF. Start with a dummy load or shielded/local setup; verify frequency, mode, privileges and listen before transmitting.</div><div class="card" style="margin-top:12px"><b>Frequency Guide</b><div class="note">Common activity and band-plan references across HF, VHF, UHF and SHF.</div><button class="primary" id="openGuide" style="width:100%;margin-top:10px">Open Frequency Guide</button></div>`;
      $("#txLevel").oninput=e=>{txLevel=Number(e.target.value);};
      $("#tone0").onclick=()=>testTone(1200);$("#tone1").onclick=()=>testTone(1800);$("#testPacket").onclick=()=>transmitPacket({type:"test",from:state.callsign||"NOCALL",to:"ALL",text:"FIELD TEXT MODEM TEST"});
      $("#rxStart").onclick=startReceive;$("#rxStop").onclick=stopReceive;updateRxControls();
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
  function openContact(call){
    let chat=state.chats.find(c=>c.call===call);
    if(!chat){chat={id:crypto.randomUUID?.()||String(Date.now()),call,msgs:[]};state.chats.unshift(chat);saveState();}
    selectedChat=chat.id;page="messages";render();
  }
  function renderContacts(){
    const contacts=Array.isArray(state.contacts)?state.contacts:[];
    main.innerHTML=`<h2>Favorite Contacts</h2><div class="subheading">Save up to 5 callsigns for quick access to conversations.</div>${contacts.length?contacts.map((c,i)=>`<article class="card contact-card"><div class="flex"><div><div class="call">${escapeHtml(c.call)}</div>${c.name?`<div class="preview">${escapeHtml(c.name)}</div>`:''}</div><span class="pill">FAVORITE ${i+1}</span></div><div class="button-row contact-actions"><button class="primary" data-contact-open="${i}">Messages</button><button class="ghost small" data-contact-edit="${i}">Edit</button><button class="delete-btn small" data-contact-delete="${i}">Remove</button></div></article>`).join(''):`<div class="empty">No favorite contacts saved yet.</div>`}${contacts.length<5?`<div class="card"><h3>Add Favorite</h3><label for="contactCall">Callsign</label><input id="contactCall" maxlength="16" placeholder="e.g. W4XYZ"><label for="contactName">Name or nickname (optional)</label><input id="contactName" maxlength="32" placeholder="e.g. Bob"><button class="primary" id="saveContact" style="width:100%">Save Contact</button></div>`:`<div class="note">You have reached the 5-contact limit. Remove a contact to add another.</div>`}`;
    main.querySelectorAll('[data-contact-open]').forEach(b=>b.onclick=()=>openContact(contacts[Number(b.dataset.contactOpen)].call));
    main.querySelectorAll('[data-contact-delete]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.contactDelete),c=contacts[i];if(confirm(`Remove ${c.call} from favorite contacts? Their conversation will not be deleted.`)){state.contacts.splice(i,1);saveState();renderContacts();}});
    main.querySelectorAll('[data-contact-edit]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.contactEdit),c=contacts[i];const name=prompt('Contact name / nickname (leave blank to clear):',c.name||'');if(name===null)return;const call=prompt('Callsign:',c.call);if(call===null)return;const normalized=call.trim().toUpperCase();if(!normalized)return alert('Callsign cannot be blank.');if(state.contacts.some((x,j)=>j!==i&&x.call===normalized))return alert('That callsign is already saved.');state.contacts[i]={call:normalized,name:name.trim()};saveState();renderContacts();});
    const saveBtn=$('#saveContact');if(saveBtn)saveBtn.onclick=()=>{const call=$('#contactCall').value.trim().toUpperCase(),name=$('#contactName').value.trim();if(!call)return alert('Enter a callsign.');if(contacts.some(c=>c.call===call))return alert('That callsign is already in your favorites.');if(state.contacts.length>=5)return alert('You can save up to 5 favorite contacts.');state.contacts.push({call,name});saveState();renderContacts();};
  }
  function renderQuick(){
    main.innerHTML=`<h2>Quick Messages</h2><div class="subheading">Tap a preset to prepare it for transmission.</div>${state.quick.map((q,i)=>`<button class="quick-button" data-quick="${i}">↗ ${escapeHtml(q)}</button>`).join("")}<div class="card" style="margin-top:13px"><label for="customQuick">Add a custom preset</label><input id="customQuick" placeholder="Your quick message"><button class="primary" id="addQuick">Add preset</button></div>`;
    main.querySelectorAll("[data-quick]").forEach(b=>b.onclick=()=>compose(state.quick[Number(b.dataset.quick)]));
    $("#addQuick").onclick=()=>{const q=$("#customQuick").value.trim();if(!q)return;state.quick.push(q);saveState();renderQuick();};
  }
  function renderSettings(){
    main.innerHTML=`<h2>Settings</h2><div class="card"><label for="callsign">Your Callsign</label><input id="callsign" maxlength="16" value="${escapeHtml(state.callsign)}"><button class="primary" id="saveCall">Save Callsign</button></div><div class="card"><div class="flex"><b>Offline-first</b><span class="pill">LOCAL STORAGE</span></div><div class="note">Calls, messages and custom quick messages are stored in this browser on this device.</div></div><div class="card"><b>App information</b><div class="note">Field Text v0.6 · Directed messages, recipient filtering and manual delivery acknowledgments over experimental acoustic 2-FSK. No encryption or radio PTT control.</div></div><button class="ghost" id="logout" style="width:100%;margin-bottom:9px">Log Out</button><button class="ghost" id="resetDemo" style="width:100%">Reset demo data</button>`;
    $("#saveCall").onclick=()=>{const c=$("#callsign").value.trim().toUpperCase();if(!c)return alert("Enter a callsign.");state.callsign=c;state.loggedIn=true;saveState();render();setStatus("CALLSIGN SAVED");};
    $("#logout").onclick=()=>{state.loggedIn=false;saveState();render();};
    $("#resetDemo").onclick=()=>{if(confirm("Reset local Field Text demo data, callsign and login?")){localStorage.removeItem(storageKey);state=structuredClone(defaultState);render();setStatus("DEMO DATA RESET");}};
  }
  document.querySelectorAll(".nav-button").forEach(b=>b.onclick=()=>{page=b.dataset.page;selectedChat=null;render();});
  render();
})();