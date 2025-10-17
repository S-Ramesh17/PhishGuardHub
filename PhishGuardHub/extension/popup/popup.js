document.addEventListener('DOMContentLoaded', async () => {
  const statEl = document.getElementById('stat');
  const recentEl = document.getElementById('recent');
  const testBtn = document.getElementById('testBtn');
  const reportsBtn = document.getElementById('reportsBtn');
  const scanBtn = document.getElementById('scanBtn');

  const DASHBOARD_URL = chrome.runtime.getURL('demo/dashboard.html');
  const REPORTS_URL = chrome.runtime.getURL('demo/report.html');

  async function loadRecent(){
    const data = await chrome.storage.sync.get({ phishshield_reports: [] });
    const arr = (data.phishshield_reports || []).slice(0,5);
    recentEl.innerHTML = '<strong>Recent:</strong><br/>' + (arr.length ? arr.map(r=>`${new Date(r.timestamp).toLocaleString()}: ${r.detected? 'PHISHING':'safe'} - ${r.url}`).join('<br/>') : 'No reports yet');
  }

  loadRecent();

  testBtn.addEventListener('click', ()=> chrome.tabs.create({ url: DASHBOARD_URL }));
  reportsBtn.addEventListener('click', ()=> chrome.tabs.create({ url: REPORTS_URL }));

  scanBtn.addEventListener('click', async ()=>{
    statEl.textContent = 'Scanning...';
    chrome.runtime.sendMessage({ type: 'manual_tab_check' }, (resp) => {
      if(resp && resp.report) {
        const r = resp.report;
        statEl.textContent = r.detected ? `Phishing suspected ⚠️ (score ${r.score})` : `Safe ✅ (score ${r.score})`;
        loadRecent();
      } else {
        statEl.textContent = 'Scan failed / no response.';
      }
    });
  });

  chrome.runtime.onMessage.addListener((message) => {
    if(message?.type === 'scan_result' && message.report) {
      const r = message.report;
      statEl.textContent = r.detected ? `Phishing suspected ⚠️ (score ${r.score})` : `Safe ✅ (score ${r.score})`;
      loadRecent();
    }
  });

  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export';
  exportBtn.style.background = '#34a853';
  exportBtn.style.marginTop = '8px';
  exportBtn.addEventListener('click', async ()=>{
    const data = await chrome.storage.sync.get({ phishshield_reports: [] });
    const text = JSON.stringify(data.phishshield_reports || [], null, 2);
    await navigator.clipboard.writeText(text);
    alert('Reports copied to clipboard. Paste into dashboard to import.');
  });
  document.querySelector('.container').appendChild(exportBtn);
});