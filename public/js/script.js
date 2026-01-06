// Floating chat widget and other client helpers
(function(){
  const btn = document.createElement('button');
  btn.textContent = 'Chat';
  btn.style.position = 'fixed';
  btn.style.bottom = '20px';
  btn.style.right = '20px';
  btn.style.padding = '10px 14px';
  btn.style.background = '#2ecc71';
  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.borderRadius = '20px';
  btn.style.cursor = 'pointer';
  btn.style.zIndex = '9999';

  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.bottom = '70px';
  panel.style.right = '20px';
  panel.style.width = '320px';
  panel.style.maxHeight = '50vh';
  panel.style.background = '#fff';
  panel.style.border = '1px solid #e0e0e0';
  panel.style.borderRadius = '8px';
  panel.style.boxShadow = '0 2px 12px rgba(0,0,0,.15)';
  panel.style.overflow = 'hidden';
  panel.style.display = 'none';
  panel.style.zIndex = '9999';

  const header = document.createElement('div');
  header.style.background = '#2ecc71';
  header.style.color = '#fff';
  header.style.padding = '8px 10px';
  header.textContent = 'Help Chat (EN/TE)';

  const body = document.createElement('div');
  body.style.padding = '8px';
  body.style.height = '220px';
  body.style.overflowY = 'auto';

  const inputWrap = document.createElement('div');
  inputWrap.style.display = 'flex';
  inputWrap.style.gap = '6px';
  inputWrap.style.padding = '8px';

  const lang = document.createElement('select');
  lang.innerHTML = '<option value="en">EN</option><option value="te">TE</option>';
  const mic = document.createElement('button');
  mic.textContent = '🎤';
  mic.title = 'Speak';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Type your question...';
  input.style.flex = '1';
  const send = document.createElement('button');
  send.textContent = 'Send';

  inputWrap.appendChild(lang);
  inputWrap.appendChild(mic);
  inputWrap.appendChild(input);
  inputWrap.appendChild(send);

  panel.appendChild(header);
  panel.appendChild(body);
  panel.appendChild(inputWrap);

  btn.addEventListener('click', ()=>{
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  function addMsg(who, text){
    const p = document.createElement('div');
    p.style.margin = '6px 0';
    p.innerHTML = '<strong>' + who + ':</strong> ' + text;
    body.appendChild(p);
    body.scrollTop = body.scrollHeight;
  }

  async function ask(){
    const msg = input.value.trim();
    if(!msg) return;
    addMsg('You', msg);
    input.value = '';
    try{
      const resp = await fetch('/api/chat',{
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ message: msg, lang: lang.value })
      });
      const data = await resp.json();
      if(data && data.success){
        addMsg('Bot', data.reply);
        // Speak out response (TTS)
        if('speechSynthesis' in window){
          const u = new SpeechSynthesisUtterance(data.reply);
          u.lang = lang.value === 'te' ? 'te-IN' : 'en-IN';
          window.speechSynthesis.speak(u);
        }
      }else{
        addMsg('Bot', 'Service unavailable');
      }
    }catch(e){
      addMsg('Bot', 'Network error');
    }
  }
  send.addEventListener('click', ask);
  input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') ask(); });

  // Microphone (speech-to-text)
  let recognizing = false;
  let recognition;
  if('webkitSpeechRecognition' in window || 'SpeechRecognition' in window){
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e)=>{
      const transcript = e.results[0][0].transcript;
      input.value = transcript;
      ask();
    };
    recognition.onerror = ()=>{ recognizing = false; mic.textContent = '🎤'; };
    recognition.onend = ()=>{ recognizing = false; mic.textContent = '🎤'; };
  }
  mic.addEventListener('click', ()=>{
    if(!recognition){ alert('Speech recognition not supported in this browser.'); return; }
    if(!recognizing){
      recognizing = true; mic.textContent = '🛑';
      recognition.lang = lang.value === 'te' ? 'te-IN' : 'en-IN';
      recognition.start();
    }else{
      recognition.stop();
    }
  });

  document.addEventListener('DOMContentLoaded', ()=>{
    document.body.appendChild(btn);
    document.body.appendChild(panel);
  });
})();

