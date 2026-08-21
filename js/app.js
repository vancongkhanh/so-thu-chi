attachThousandFormat($('txAmount'));
attachThousandFormat($('wdTm'));
attachThousandFormat($('wdCk'));
attachThousandFormat($('hAmount'));

$('fDate').addEventListener('change',()=>{
  entryDate = $('fDate').value || todayISO();
  $('fDateDisplay').textContent = ddmmyyyy(entryDate);
  renderEntryTab();
});

// Gần đây: custom date range
$('fFrom').addEventListener('change',()=>{
  filterFrom = $('fFrom').value;
  $('fFromDisplay').textContent = filterFrom? ddmmyyyy(filterFrom) : '—';
  render();
});
$('fTo').addEventListener('change',()=>{
  filterTo = $('fTo').value;
  $('fToDisplay').textContent = filterTo? ddmmyyyy(filterTo) : '—';
  render();
});
$('clearFilterBtn').addEventListener('click',()=>{
  filterFrom=''; filterTo='';
  $('fFrom').value=''; $('fTo').value='';
  $('fFromDisplay').textContent='—'; $('fToDisplay').textContent='—';
  render();
});
document.querySelectorAll('#recentPills .pill').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('#recentPills .pill').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    recentRange=btn.dataset.r;
    render();
  });
});

// Trích quỹ: ngày nhập + bộ lọc lịch sử
$('wdDate').addEventListener('change',()=>{
  wdDate = $('wdDate').value || todayISO();
  $('wdDateDisplay').textContent = ddmmyyyy(wdDate);
});
$('wdFrom').addEventListener('change',()=>{
  wdFilterFrom = $('wdFrom').value;
  $('wdFromDisplay').textContent = wdFilterFrom? ddmmyyyy(wdFilterFrom) : '—';
  renderWithdrawalsTab();
});
$('wdTo').addEventListener('change',()=>{
  wdFilterTo = $('wdTo').value;
  $('wdToDisplay').textContent = wdFilterTo? ddmmyyyy(wdFilterTo) : '—';
  renderWithdrawalsTab();
});
$('clearWdFilterBtn').addEventListener('click',()=>{
  wdFilterFrom=''; wdFilterTo='';
  $('wdFrom').value=''; $('wdTo').value='';
  $('wdFromDisplay').textContent='—'; $('wdToDisplay').textContent='—';
  renderWithdrawalsTab();
});
document.querySelectorAll('#wdPills .pill').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('#wdPills .pill').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    wdRange=btn.dataset.r;
    renderWithdrawalsTab();
  });
});
$('addWdBtn').addEventListener('click', addWithdrawal);

// Thống kê: custom date range
$('fFromStats').addEventListener('change',()=>{
  filterFromStats = $('fFromStats').value;
  $('fFromStatsDisplay').textContent = filterFromStats? ddmmyyyy(filterFromStats) : '—';
  renderStats();
});
$('fToStats').addEventListener('change',()=>{
  filterToStats = $('fToStats').value;
  $('fToStatsDisplay').textContent = filterToStats? ddmmyyyy(filterToStats) : '—';
  renderStats();
});
$('clearFilterStatsBtn').addEventListener('click',()=>{
  filterFromStats=''; filterToStats='';
  $('fFromStats').value=''; $('fToStats').value='';
  $('fFromStatsDisplay').textContent='—'; $('fToStatsDisplay').textContent='—';
  renderStats();
});
function render(){
  const today=todayISO();
  $('todayLabel').textContent = new Date().toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'});

  const currentYm = today.slice(0,7);
  const thisMonth = entries.filter(e=>e.date.slice(0,7)===currentYm);
  const tThu = thisMonth.reduce((s,e)=>s+e.thu_tm+e.thu_ck,0);
  const tChi = thisMonth.reduce((s,e)=>s+e.chi_tm+e.chi_ck,0);
  $('tdThu').textContent=fmt(tThu);
  $('tdChi').textContent=fmt(tChi);
  $('tdLai').textContent=fmt(tThu-tChi);

  const filteredEntries = filterByMode(entries, recentRange, filterFrom, filterTo);
  const listData=[...filteredEntries].sort((a,b)=> b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const listEl=$('recentList');
  if(listData.length===0){
    listEl.innerHTML = '<div class="empty">Không có mục nào trong khoảng đã chọn.</div>';
  }else{
    listEl.innerHTML = listData.map(e=>{
      const thu=e.thu_tm+e.thu_ck, chi=e.chi_tm+e.chi_ck, lai=thu-chi;
      const laiClass = lai>0? 'pos' : (lai<0? 'neg' : '');
      return `<div class="entry" data-date="${e.date}">
        <div class="d">${ddmmyyyy(e.date)}</div>
        <div class="col thu">${thu? fmt(thu):'—'}</div>
        <div class="col chi">${chi? fmt(chi):'—'}</div>
        <div class="col lai ${laiClass}">${fmt(lai)}</div>
      </div>`;
    }).join('');
    listEl.querySelectorAll('.entry').forEach(el=>{
      el.addEventListener('click',()=>goToEntryDate(el.dataset.date));
    });
  }
  renderEntryTab();
  renderWithdrawalsTab();
  populateCategorySelect();
  renderHomeTab();
}
let activeParent = 'thuchi';
let activeChildThuChi = 'kinhdoanh';
let activeChildThongKe = 'kinhdoanh';

const CHILD_DIV_MAP = {
  thuchi: {kinhdoanh:'tabEntry', trichquy:'tabTrich', sinhhoat:'tabHome'},
  thongke: {kinhdoanh:'tabStats', sinhhoat:'tabHomeStats', tong:'tabAllStats'}
};
const ALL_CONTENT_DIVS = ['tabEntry','tabTrich','tabHome','tabStats','tabHomeStats','tabAllStats'];

function triggerRenderForTab(divId){
  if(divId==='tabEntry') renderEntryTab();
  else if(divId==='tabTrich') renderWithdrawalsTab();
  else if(divId==='tabHome') renderHomeTab();
  else if(divId==='tabStats') renderStats();
  else if(divId==='tabHomeStats') renderHomeStats();
  else if(divId==='tabAllStats') renderAllStats();
}

function renderTabUI(){
  $('parentThuChiBtn').classList.toggle('active', activeParent==='thuchi');
  $('parentThongKeBtn').classList.toggle('active', activeParent==='thongke');
  $('childThuChi').style.display = activeParent==='thuchi' ? 'flex' : 'none';
  $('childThongKe').style.display = activeParent==='thongke' ? 'flex' : 'none';

  const activeChild = activeParent==='thuchi' ? activeChildThuChi : activeChildThongKe;
  ALL_CONTENT_DIVS.forEach(id=> $(id).style.display='none');
  const targetDiv = CHILD_DIV_MAP[activeParent][activeChild];
  $(targetDiv).style.display = 'block';

  const childContainer = activeParent==='thuchi' ? $('childThuChi') : $('childThongKe');
  childContainer.querySelectorAll('button').forEach(b=>{
    b.classList.toggle('active', b.dataset.child===activeChild);
  });

  triggerRenderForTab(targetDiv);
}

$('parentThuChiBtn').addEventListener('click',()=>{ activeParent='thuchi'; renderTabUI(); });
$('parentThongKeBtn').addEventListener('click',()=>{ activeParent='thongke'; renderTabUI(); });
document.querySelectorAll('#childThuChi button').forEach(btn=>{
  btn.addEventListener('click',()=>{ activeChildThuChi = btn.dataset.child; renderTabUI(); });
});
document.querySelectorAll('#childThongKe button').forEach(btn=>{
  btn.addEventListener('click',()=>{ activeChildThongKe = btn.dataset.child; renderTabUI(); });
});

document.querySelectorAll('#rangePills .pill').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('#rangePills .pill').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    statsRange=btn.dataset.r;
    renderStats();
  });
});
$('donutThuBtn').addEventListener('click',()=>{
  donutMode='thu'; $('donutThuBtn').classList.add('active'); $('donutChiBtn').classList.remove('active'); renderStats();
});
$('donutChiBtn').addEventListener('click',()=>{
  donutMode='chi'; $('donutChiBtn').classList.add('active'); $('donutThuBtn').classList.remove('active'); renderStats();
});
$('monthSelect').addEventListener('change',()=>{
  selectedYm = $('monthSelect').value;
  renderMonthlyTable();
});
$('exportBtn').addEventListener('click',exportCSV);
$('importBtn').addEventListener('click',importData);

$('addTxBtn').addEventListener('click', addTransaction);
$('finalizeBtn').addEventListener('click', finalizeDay);
$('unlockBtn').addEventListener('click', unlockDay);
document.querySelectorAll('#comboToggle .combo-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('#comboToggle .combo-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    txType = btn.dataset.type;
    txMethod = btn.dataset.method;
  });
});

// Trích quỹ: bật/tắt liên kết sang Sinh hoạt
$('wdLinkHome').addEventListener('change',()=>{
  $('wdLinkOptions').classList.toggle('collapsed', !$('wdLinkHome').checked);
});
document.querySelectorAll('#wdHomeTypeToggle .combo-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('#wdHomeTypeToggle .combo-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    wdHomeType = btn.dataset.v;
  });
});

// Sinh hoạt: loại khoản (Thu/Chi x TM/CK)
document.querySelectorAll('#homeComboToggle .combo-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('#homeComboToggle .combo-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    homeType = btn.dataset.type;
    homeMethod = btn.dataset.method;
  });
});
$('manageCatBtn').addEventListener('click', openCategoryManager);
$('addHomeBtn').addEventListener('click', addHomeTransaction);
$('hDate').addEventListener('change',()=>{
  hDate = $('hDate').value || todayISO();
  $('hDateDisplay').textContent = ddmmyyyy(hDate);
});
$('hFrom').addEventListener('change',()=>{
  homeFilterFrom = $('hFrom').value;
  $('hFromDisplay').textContent = homeFilterFrom? ddmmyyyy(homeFilterFrom) : '—';
  renderHomeTab();
});
$('hTo').addEventListener('change',()=>{
  homeFilterTo = $('hTo').value;
  $('hToDisplay').textContent = homeFilterTo? ddmmyyyy(homeFilterTo) : '—';
  renderHomeTab();
});
$('clearHomeFilterBtn').addEventListener('click',()=>{
  homeFilterFrom=''; homeFilterTo='';
  $('hFrom').value=''; $('hTo').value='';
  $('hFromDisplay').textContent='—'; $('hToDisplay').textContent='—';
  renderHomeTab();
});
document.querySelectorAll('#homePills .pill').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('#homePills .pill').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    homeRange=btn.dataset.r;
    renderHomeTab();
  });
});

// TK Sinh hoạt: bộ lọc riêng
document.querySelectorAll('#homeStatsPills .pill').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('#homeStatsPills .pill').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    homeStatsRange=btn.dataset.r;
    renderHomeStats();
  });
});
$('hsFrom').addEventListener('change',()=>{
  homeStatsFilterFrom = $('hsFrom').value;
  $('hsFromDisplay').textContent = homeStatsFilterFrom? ddmmyyyy(homeStatsFilterFrom) : '—';
  renderHomeStats();
});
$('hsTo').addEventListener('change',()=>{
  homeStatsFilterTo = $('hsTo').value;
  $('hsToDisplay').textContent = homeStatsFilterTo? ddmmyyyy(homeStatsFilterTo) : '—';
  renderHomeStats();
});
$('clearHsFilterBtn').addEventListener('click',()=>{
  homeStatsFilterFrom=''; homeStatsFilterTo='';
  $('hsFrom').value=''; $('hsTo').value='';
  $('hsFromDisplay').textContent='—'; $('hsToDisplay').textContent='—';
  renderHomeStats();
});
$('hsCatTrigger').addEventListener('click',(e)=>{
  e.stopPropagation();
  const panel = $('hsCatPanel');
  panel.style.display = (panel.style.display==='none') ? 'block' : 'none';
});
$('homeCatTrigger').addEventListener('click',(e)=>{
  e.stopPropagation();
  const panel = $('homeCatPanel');
  panel.style.display = (panel.style.display==='none') ? 'block' : 'none';
});

entryDate = todayISO();
$('fDate').value = entryDate;
$('fDateDisplay').textContent = ddmmyyyy(entryDate);

wdDate = todayISO();
$('wdDate').value = wdDate;
$('wdDateDisplay').textContent = ddmmyyyy(wdDate);

hDate = todayISO();
$('hDate').value = hDate;
$('hDateDisplay').textContent = ddmmyyyy(hDate);

// Áp dụng cầu dao "Quản lý sinh hoạt": ẩn các tab/khối liên quan nếu đang tắt.
// Chỉ ẩn giao diện — dữ liệu Sinh hoạt trên Firebase vẫn giữ nguyên, không đụng tới.
if(!SINHHOAT_ENABLED){
  document.querySelectorAll('.sinhhoat-feature').forEach(el=> el.style.display='none');
  // Thống kê chỉ còn đúng 1 mục con (Kinh doanh) — ẩn cả thanh lớp con cho gọn,
  // giống hệt như khi chưa có tính năng Sinh hoạt.
  $('childThongKe').classList.add('single-child');
}

$('loginForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  attemptLogin($('loginPassword').value);
});

bootAuth();

// Kiểm tra bản mới: tải lại chính trang này (bỏ qua cache) và so sánh số phiên
// bản khai báo trong thẻ meta "app-version". Nếu khác, hiện banner nhắc tải lại.
// Dùng nhiều "cửa" kích hoạt khác nhau vì ở chế độ mở từ màn hình chính (standalone),
// iOS đôi khi không bắn đủ sự kiện visibilitychange/setInterval như khi mở bằng Safari.
const APP_VERSION = document.querySelector('meta[name="app-version"]').content;
let checkingUpdate = false;

function hasUnsavedInput(){
  const ids = ['txAmount','txNote','wdTm','wdCk','wdHomeNote','hAmount','hNote'];
  return ids.some(id=>{
    const el = $(id);
    return el && el.value && el.value.trim() !== '';
  });
}

async function checkForUpdate(){
  if(checkingUpdate) return;
  checkingUpdate = true;
  try{
    const bustUrl = window.location.href.split('?')[0].split('#')[0] + '?v=' + Date.now() + '-' + Math.random().toString(16).slice(2);
    const res = await fetch(bustUrl, {cache:'no-store', headers:{'Cache-Control':'no-cache, no-store, must-revalidate', 'Pragma':'no-cache'}});
    const text = await res.text();
    const m = text.match(/<meta name="app-version" content="([^"]+)">/);
    if(m && m[1] !== APP_VERSION){
      if(hasUnsavedInput()){
        // Có dữ liệu đang gõ dở chưa lưu — không tự tải lại để tránh mất dữ liệu,
        // chỉ hiện banner để bạn tự chọn thời điểm bấm.
        $('updateBanner').style.display = 'block';
      }else{
        // Không có gì đang nhập dở — an toàn để tự tải lại luôn.
        window.location.reload();
      }
    }
  }catch(e){ /* im lặng nếu mất mạng, thử lại ở lần sau */ }
  checkingUpdate = false;
}
$('updateBanner').addEventListener('click', ()=> window.location.reload());

checkForUpdate();
setTimeout(checkForUpdate, 3000);
setInterval(checkForUpdate, 2*60*1000);
setInterval(enforceSessionTTL, 5*60*1000);
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState === 'visible'){ checkForUpdate(); enforceSessionTTL(); }
});
window.addEventListener('focus', ()=>{ checkForUpdate(); enforceSessionTTL(); });
window.addEventListener('pageshow', ()=>{ checkForUpdate(); enforceSessionTTL(); });
