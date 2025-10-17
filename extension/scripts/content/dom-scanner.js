(function(){
  try {
    const url = location.href;
    let evidence = 0;
    const keywords = ['password','confirm','verify','secure','account','bank','otp','signin','login','update'];
    document.querySelectorAll('form').forEach(form => {
      const action = form.getAttribute('action') || '';
      const method = (form.getAttribute('method') || 'get').toLowerCase();
      if(action && action.startsWith('http://')) evidence += 2;
      if(method === 'post') evidence += 0.5;
      form.querySelectorAll('input').forEach(inp=>{
        const t = (inp.type||'').toLowerCase();
        const name = (inp.name||'').toLowerCase();
        const placeholder = (inp.placeholder||'').toLowerCase();
        if(['password','email','tel'].includes(t)) evidence += 0.8;
        keywords.forEach(k=>{ if(name.includes(k) || placeholder.includes(k)) evidence += 0.6; });
        const style = window.getComputedStyle(inp);
        if(style && (style.display === 'none' || style.visibility === 'hidden')) evidence += 0.5;
      });
    });
    document.querySelectorAll('iframe').forEach(ifr=>{
      const src = ifr.getAttribute('src') || '';
      if(src && !src.includes(location.hostname)) evidence += 0.8;
    });
    Array.from(document.querySelectorAll('a')).slice(0,100).forEach(a=>{
      const href = (a.href||'').toLowerCase();
      keywords.forEach(k=>{ if(href.includes(k)) evidence += 0.1; });
    });
    if(evidence >= 2) {
      chrome.runtime.sendMessage({ type:'check_url', url, evidence_score: evidence }, function(resp){
        try {
          if(resp && resp.report && resp.report.detected) {
            const id='__phishshield_warn';
            if(!document.getElementById(id)) {
              const el=document.createElement('div');
              el.id=id;
              el.style.position='fixed'; el.style.bottom='12px'; el.style.right='12px';
              el.style.zIndex=999999; el.style.background='rgba(220,60,60,0.95)';
              el.style.color='#fff'; el.style.padding='10px 14px'; el.style.borderRadius='8px';
              el.style.fontFamily='Arial, sans-serif'; el.textContent='PhishShield: Possible phishing detected. Open extension.';
              document.body.appendChild(el); setTimeout(()=> el.remove(),12000);
            }
          }
        } catch(e){}
      });
    }

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse)=>{
      if(msg?.type === 'manual_scan') {
        chrome.runtime.sendMessage({ type:'check_url', url, evidence_score: evidence }, resp=> sendResponse(resp));
        return true;
      }
    });

  } catch(e) { console.error('dom-scanner error', e); }
})();