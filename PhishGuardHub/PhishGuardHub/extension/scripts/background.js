// background.js - demo + placeholders for WHOIS, PhishTank, Safe Browsing (Netlify-friendly)
// Cross-browser API alias
const api = (typeof browser !== 'undefined') ? browser : chrome;
const STORAGE_KEY = 'phishshield_reports';
const CONFIG = { WHOIS_API: 'https://YOUR_WHOIS_PROXY_ENDPOINT_OR_API?domain=', PHISHTANK_API: 'https://YOUR_PHISHTANK_PROXY_OR_ENDPOINT', SAFEBROWSING_PROXY: 'https://YOUR_SAFEBROWSING_PROXY' };

async function saveReport(report) {
  const data = await api.storage.sync.get({ [STORAGE_KEY]: [] });
  const arr = data[STORAGE_KEY] || [];
  arr.unshift(report);
  if (arr.length > 1000) arr.splice(1000);
  await api.storage.sync.set({ [STORAGE_KEY]: arr });
}

function heuristicScore(url, evidence=0) {
  const suspicious = ['login','secure','update','verify','confirm','account','bank','signin','webscr','password','otp'];
  const u = (url||'').toLowerCase();
  let score = Number(evidence)||0;
  suspicious.forEach(s=>{ if(u.includes(s)) score += 1; });
  try {
    const uo = new URL(url);
    if(/^\d+\.\d+\.\d+\.\d+$/.test(uo.hostname)) score += 2;
    const dots = (uo.hostname.match(/\./g)||[]).length;
    if(dots>=3) score += 1;
    ['paypal','facebook','google','instagram','microsoft','apple'].forEach(b=>{ if(u.includes(b) && !uo.hostname.includes(b + '.com')) score += 2; });
  } catch(e) { score += 1; }
  return { score, detected: score>=2 };
}

async function whoisLookup(domain) {
  try { const res = await fetch(CONFIG.WHOIS_API + encodeURIComponent(domain)); if(!res.ok) return null; return await res.json(); } catch(e){ return null; }
}
async function phishTankLookup(url) { try { const res = await fetch(CONFIG.PHISHTANK_API + '?url=' + encodeURIComponent(url)); if(!res.ok) return { listed:false }; return await res.json(); } catch(e){ return { listed:false }; } }
async function safeBrowsingLookup(url) { try { const res = await fetch(CONFIG.SAFEBROWSING_PROXY + '?url=' + encodeURIComponent(url)); if(!res.ok) return { safe:null }; return await res.json(); } catch(e){ return { safe:null }; } }
async function captureScreenshot() { try { const dataUrl = await api.tabs.captureVisibleTab(null, {format:'png'}); return dataUrl; } catch(e){ return null; } }

async function runFullScan({url, tabId, evidence_score=0}) {
  const heur = heuristicScore(url, evidence_score);
  const domain = (()=>{ try{ return new URL(url).hostname; }catch(e){return null;} })();
  let whois=null, phishtank=null, safeb=null, screenshot=null;
  if(domain) { whois = await whoisLookup(domain); phishtank = await phishTankLookup(url); safeb = await safeBrowsingLookup(url); }
  if(tabId) screenshot = await captureScreenshot();
  const report = { url, domain, detected: heur.detected || (phishtank && phishtank.listed), score: heur.score, whois, phishtank, safeb, screenshot: !!screenshot, timestamp: new Date().toISOString() };
  await saveReport(report);
  api.runtime.sendMessage({ type:'scan_result', report });
  return report;
}

api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if(!msg || !msg.type) { sendResponse({ ok:false, error:'invalid' }); return false; }
  if(msg.type === 'check_url' || msg.type === 'manual_tab_check') {
    (async ()=> {
      let url = msg.url;
      let tabId = msg.tabId || (sender.tab && sender.tab.id);
      if(!url) {
        const tabs = await api.tabs.query({ active:true, currentWindow:true });
        url = tabs[0]?.url || '';
        tabId = tabs[0]?.id || tabId;
      }
      try { const report = await runFullScan({ url, tabId, evidence_score: msg.evidence_score || 0 }); sendResponse({ report }); } catch(e) { sendResponse({ error: String(e) }); }
    })();
    return true;
  }
  if(msg.type === 'get_reports') { (async ()=> { const data = await api.storage.sync.get({ [STORAGE_KEY]: [] }); sendResponse({ reports: data[STORAGE_KEY] || [] }); })(); return true; }
  sendResponse({ ok:true });
  return false;
});
