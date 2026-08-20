function filteredForRange(){
  if(entries.length===0) return [];
  return filterByMode(entries, statsRange, filterFromStats, filterToStats);
}
function getMonthlyTotals(){
  const byMonth = {};
  entries.forEach(e=>{
    const ym = e.date.slice(0,7);
    byMonth[ym] = byMonth[ym] || {thu_tm:0,thu_ck:0,chi_tm:0,chi_ck:0,wd_tm:0,wd_ck:0};
    byMonth[ym].thu_tm += e.thu_tm;
    byMonth[ym].thu_ck += e.thu_ck;
    byMonth[ym].chi_tm += e.chi_tm;
    byMonth[ym].chi_ck += e.chi_ck;
  });
  withdrawals.forEach(w=>{
    const ym = w.date.slice(0,7);
    byMonth[ym] = byMonth[ym] || {thu_tm:0,thu_ck:0,chi_tm:0,chi_ck:0,wd_tm:0,wd_ck:0};
    byMonth[ym].wd_tm += w.tm;
    byMonth[ym].wd_ck += w.ck;
  });
  return byMonth;
}

function populateMonthSelect(){
  const byMonth = getMonthlyTotals();
  const currentYm = todayISO().slice(0,7);
  const months = new Set(Object.keys(byMonth));
  months.add(currentYm); // always allow selecting the current month even with no data yet
  const sortedMonths = [...months].sort().reverse(); // newest first

  const sel = $('monthSelect');
  const prevSelection = selectedYm || currentYm;
  sel.innerHTML = sortedMonths.map(ym=>
    `<option value="${ym}">Tháng ${parseInt(ym.slice(5,7),10)} - ${ym.slice(0,4)}</option>`
  ).join('');
  selectedYm = sortedMonths.includes(prevSelection) ? prevSelection : sortedMonths[0];
  sel.value = selectedYm;
}

function renderMonthlyTable(){
  populateMonthSelect();
  const byMonth = getMonthlyTotals();
  const ym = selectedYm;
  const year = ym.slice(0,4);
  const monthNum = parseInt(ym.slice(5,7),10);

  const cur = byMonth[ym] || {thu_tm:0,thu_ck:0,chi_tm:0,chi_ck:0,wd_tm:0,wd_ck:0};
  const laiTm = cur.thu_tm - cur.chi_tm;
  const laiCk = cur.thu_ck - cur.chi_ck;

  // Cumulative starts from this year's opening balance (số dư mang sang từ năm
  // trước, nếu có khai báo trong OPENING_BALANCES), rồi cộng dồn Lãi và trừ dồn
  // Trích quỹ từ tháng 1 đến hết tháng trước tháng đang chọn.
  const opening = OPENING_BALANCES[year] || {tm:0, ck:0};
  let prevCumTm=opening.tm, prevCumCk=opening.ck;
  for(let m=1; m<monthNum; m++){
    const key = year+'-'+String(m).padStart(2,'0');
    const d = byMonth[key];
    if(d){
      prevCumTm += (d.thu_tm-d.chi_tm) - (d.wd_tm||0);
      prevCumCk += (d.thu_ck-d.chi_ck) - (d.wd_ck||0);
    }
  }
  const cumTm = prevCumTm + laiTm - (cur.wd_tm||0);
  const cumCk = prevCumCk + laiCk - (cur.wd_ck||0);

  $('ymThuTm').textContent = fmt(cur.thu_tm);
  $('ymThuCk').textContent = fmt(cur.thu_ck);
  $('ymChiTm').textContent = fmt(cur.chi_tm);
  $('ymChiCk').textContent = fmt(cur.chi_ck);
  $('ymLaiTm').textContent = fmt(laiTm);
  $('ymLaiCk').textContent = fmt(laiCk);
  $('ymPrevLabel').textContent = monthNum===1 ? `Lũy kế đầu năm ${year}` : `Lũy kế đến hết tháng ${monthNum-1}`;
  $('ymPrevTm').textContent = fmt(prevCumTm);
  $('ymPrevCk').textContent = fmt(prevCumCk);
  $('ymWdTm').textContent = fmt(cur.wd_tm||0);
  $('ymWdCk').textContent = fmt(cur.wd_ck||0);
  $('ymCumTm').textContent = fmt(cumTm);
  $('ymCumCk').textContent = fmt(cumCk);

  // Tăng trưởng doanh thu so với tháng liền trước
  let prevYear = year, prevMonthNum = monthNum - 1;
  if(prevMonthNum < 1){ prevMonthNum = 12; prevYear = String(parseInt(year,10)-1); }
  const prevKey = prevYear+'-'+String(prevMonthNum).padStart(2,'0');
  const prevMonthData = byMonth[prevKey];
  const growthEl = $('ymGrowth');
  if(prevMonthData){
    const prevThu = prevMonthData.thu_tm + prevMonthData.thu_ck;
    const curThu = cur.thu_tm + cur.thu_ck;
    if(prevThu>0){
      const growth = ((curThu-prevThu)/prevThu)*100;
      growthEl.textContent = (growth>=0? '+':'') + growth.toFixed(1) + '%' + (growth>=0? ' 📈':' 📉');
      growthEl.className = growth>=0 ? 'thu' : 'chi';
    }else{
      growthEl.textContent = '—'; growthEl.className='';
    }
  }else{
    growthEl.textContent = '— (chưa có tháng trước)'; growthEl.className='';
  }

  // Tỷ lệ trích quỹ / lãi tháng này
  const wdRatioEl = $('ymWdRatio');
  const totalLai = laiTm + laiCk;
  const totalWd = (cur.wd_tm||0) + (cur.wd_ck||0);
  if(totalLai>0){
    const ratio = (totalWd/totalLai)*100;
    wdRatioEl.textContent = ratio.toFixed(0)+'%';
    wdRatioEl.className = ratio>100 ? 'chi' : '';
  }else if(totalWd>0){
    wdRatioEl.textContent = 'Đã trích dù tháng lỗ/hoà vốn';
    wdRatioEl.className = 'chi';
  }else{
    wdRatioEl.textContent = '—'; wdRatioEl.className='';
  }

  const retainEl = $('ymRetainRatio');
  if(totalLai>0){
    const ratio = (totalWd/totalLai)*100;
    const retain = 100 - ratio;
    retainEl.textContent = retain.toFixed(0)+'%';
    retainEl.className = retain>=0 ? 'thu' : 'chi';
  }else{
    retainEl.textContent = '—'; retainEl.className='';
  }
}

function renderLossStreak(){
  const sorted = [...entries]
    .filter(e=>(e.thu_tm+e.thu_ck+e.chi_tm+e.chi_ck)>0)
    .sort((a,b)=>b.date.localeCompare(a.date));
  let streak=0;
  for(const e of sorted){
    const lai = (e.thu_tm+e.thu_ck)-(e.chi_tm+e.chi_ck);
    if(lai<0) streak++;
    else break;
  }
  const card = $('lossStreakCard');
  if(streak>=3){
    card.style.display='block';
    $('lossStreakText').textContent = `Đã lỗ ${streak} ngày liên tiếp gần đây nhất.`;
  }else{
    card.style.display='none';
  }
}

function renderWeekdayChart(){
  const sums=[0,0,0,0,0,0,0], counts=[0,0,0,0,0,0,0]; // 0=T2 ... 6=CN
  entries.forEach(e=>{
    const d = new Date(e.date+'T00:00:00');
    const jsDay = d.getDay(); // 0=CN,1=T2,...6=T7
    const idx = jsDay===0 ? 6 : jsDay-1;
    sums[idx] += (e.thu_tm+e.thu_ck);
    counts[idx] += 1;
  });
  const avgs = sums.map((s,i)=> counts[i]? s/counts[i] : 0);
  const labels = ['T2','T3','T4','T5','T6','T7','CN'];
  const maxV = Math.max(1, ...avgs);
  $('weekdayChart').innerHTML = labels.map((lb,i)=>{
    const h = Math.round((avgs[i]/maxV)*120);
    return `<div class="wk-col">
      <div class="wk-val">${fmtShort(avgs[i])}</div>
      <div class="wk-bar" style="height:${Math.max(h,avgs[i]>0?2:0)}px"></div>
      <div class="wk-label">${lb}</div>
    </div>`;
  }).join('');
}

function renderMarginChart(){
  const byMonth = getMonthlyTotals();
  const months = Object.keys(byMonth).sort();
  if(months.length===0){
    $('marginChartWrap').innerHTML = '<div class="empty">Chưa có dữ liệu</div>';
    return;
  }
  const labels = months.map(ym=>'T'+ym.slice(5,7));
  const values = months.map(ym=>{
    const m = byMonth[ym];
    const thu = m.thu_tm+m.thu_ck, chi = m.chi_tm+m.chi_ck;
    return thu>0 ? ((thu-chi)/thu*100) : 0;
  });
  $('marginChartWrap').innerHTML = buildMarginLineSVG(labels, values);
  $('marginChartWrap').scrollLeft = $('marginChartWrap').scrollWidth;
}

function renderStats(){
  renderMonthlyTable();
  const data=filteredForRange();
  const sThu=data.reduce((s,e)=>s+e.thu_tm+e.thu_ck,0);
  const sChi=data.reduce((s,e)=>s+e.chi_tm+e.chi_ck,0);
  $('sThu').textContent=fmt(sThu);
  $('sChi').textContent=fmt(sChi);
  $('sLai').textContent=fmt(sThu-sChi);

  // Chỉ số kinh doanh (theo đúng khoảng đang lọc ở trên)
  const margin = sThu>0 ? ((sThu-sChi)/sThu*100) : 0;
  const chiRatio = sThu>0 ? (sChi/sThu*100) : 0;
  const activeDays = data.filter(e=>(e.thu_tm+e.thu_ck)>0).length;
  const avgPerDay = activeDays>0 ? sThu/activeDays : 0;
  $('bizMargin').textContent = margin.toFixed(1)+'%';
  $('bizMargin').style.color = margin>=0 ? 'var(--green)' : 'var(--red)';
  $('bizChiRatio').textContent = chiRatio.toFixed(1)+'%';
  $('bizAvgDay').textContent = fmtShort(avgPerDay);

  renderLossStreak();
  renderWeekdayChart();
  renderMarginChart();

  let keys=[], labels=[], thuArr=[], chiArr=[];
  const hasCustomStats = !!(filterFromStats || filterToStats);
  let useMonthly;
  if(hasCustomStats){
    if(data.length>0){
      const dates=data.map(e=>e.date);
      const minD=dates.reduce((m,d)=> d<m? d:m, dates[0]);
      const maxD=dates.reduce((m,d)=> d>m? d:m, dates[0]);
      const spanDays=(new Date(maxD)-new Date(minD))/86400000;
      useMonthly = spanDays>60;
    }else{ useMonthly=false; }
  }else{
    useMonthly = (statsRange==='all' || statsRange==='year');
  }

  if(useMonthly){
    const byMonth={};
    data.forEach(e=>{
      const k=e.date.slice(0,7);
      byMonth[k]=byMonth[k]||{thu:0,chi:0};
      byMonth[k].thu+=e.thu_tm+e.thu_ck;
      byMonth[k].chi+=e.chi_tm+e.chi_ck;
    });
    keys=Object.keys(byMonth).sort();
    labels=keys.map(k=>'T'+k.slice(5,7));
    thuArr=keys.map(k=>byMonth[k].thu);
    chiArr=keys.map(k=>byMonth[k].chi);
  }else{
    const byDay={};
    data.forEach(e=>{
      byDay[e.date]=byDay[e.date]||{thu:0,chi:0};
      byDay[e.date].thu+=e.thu_tm+e.thu_ck;
      byDay[e.date].chi+=e.chi_tm+e.chi_ck;
    });
    keys=Object.keys(byDay).sort();
    labels=keys.map(dLabel);
    thuArr=keys.map(k=>byDay[k].thu);
    chiArr=keys.map(k=>byDay[k].chi);
  }

  const barsWrap=$('barsWrap');
  if(keys.length===0){
    barsWrap.innerHTML='<div class="empty">Chưa có dữ liệu trong khoảng này</div>';
  }else{
    barsWrap.innerHTML = buildLineChartSVG(labels, thuArr, chiArr);
    barsWrap.scrollLeft = barsWrap.scrollWidth;
  }

  const tm = donutMode==='thu'? data.reduce((s,e)=>s+e.thu_tm,0) : data.reduce((s,e)=>s+e.chi_tm,0);
  const ck = donutMode==='thu'? data.reduce((s,e)=>s+e.thu_ck,0) : data.reduce((s,e)=>s+e.chi_ck,0);
  const total = tm+ck;
  const pctTm = total? Math.round((tm/total)*100) : 0;
  const deg = total? (tm/total)*360 : 0;
  $('donutEl').style.background = total
    ? `conic-gradient(var(--gold) 0deg ${deg}deg, var(--ink) ${deg}deg 360deg)`
    : `var(--paper-line)`;
  $('donutPct').textContent = total? pctTm+'%' : '—';
  $('donutTmVal').textContent = fmt(tm);
  $('donutCkVal').textContent = fmt(ck);
}

function parseDateFlexible(s){
  s = (s||'').trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m){
    const [_, d, mo, y] = m;
    return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  return null;
}

function parseCSV(text){
  const lines = text.trim().split(/\r?\n/).filter(l=>l.trim().length>0);
  const rows = [];
  for(const line of lines){
    // simple CSV split that respects "quoted,fields"
    const cells = [];
    let cur='', inQ=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch === '"'){
        if(inQ && line[i+1] === '"'){ cur+='"'; i++; }
        else inQ = !inQ;
      }else if(ch === ',' && !inQ){
        cells.push(cur); cur='';
      }else{
        cur += ch;
      }
    }
    cells.push(cur);
    rows.push(cells.map(c=>c.trim()));
  }
  return rows;
}

async function importData(){
  const raw = $('importText').value;
  const resultEl = $('importResult');
  if(!raw.trim()){
    resultEl.textContent = 'Chưa dán dữ liệu nào.';
    return;
  }
  const rows = parseCSV(raw);
  let updated=0, added=0, skipped=0;
  const byDate = {};
  entries.forEach(e=>{ byDate[e.date]=e; });

  rows.forEach(cols=>{
    if(cols.length < 2) { skipped++; return; }
    const dateISO = parseDateFlexible(cols[0]);
    if(!dateISO){ skipped++; return; } // likely a header row or bad date, skip quietly
    const thu_tm = unformat(cols[1]||'0');
    const thu_ck = unformat(cols[2]||'0');
    const chi_tm = unformat(cols[3]||'0');
    const chi_ck = unformat(cols[4]||'0');
    const note = cols[5] || '';

    const existing = byDate[dateISO];
    if(existing){
      existing.thu_tm = thu_tm;
      existing.thu_ck = thu_ck;
      existing.chi_tm = chi_tm;
      existing.chi_ck = chi_ck;
      existing.note = note;
      updated++;
    }else{
      const newE = {id:'import-'+dateISO+'-'+Date.now(), date:dateISO, thu_tm, thu_ck, chi_tm, chi_ck, note};
      entries.push(newE);
      byDate[dateISO] = newE;
      added++;
    }
  });

  await persist();
  render();
  resultEl.textContent = `Đã cập nhật ${updated} ngày, thêm mới ${added} ngày${skipped? `, bỏ qua ${skipped} dòng không đọc được`:''}.`;
  $('importText').value='';
}

function buildCSV(){
  const rows=[['Ngày','Thu tiền mặt','Thu chuyển khoản','Chi tiền mặt','Chi chuyển khoản','Ghi chú']];
  [...entries].sort((a,b)=>a.date.localeCompare(b.date)).forEach(e=>{
    rows.push([e.date,e.thu_tm,e.thu_ck,e.chi_tm,e.chi_ck,(e.note||'').replace(/\n/g,' ')]);
  });
  return rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
}

function exportCSV(){
  const csv=buildCSV();
  let downloadWorked=false;
  try{
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download='so-thu-chi.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 3000);
    downloadWorked=true;
  }catch(e){ downloadWorked=false; }
  // Always show a fallback view too — downloads are unreliable inside the artifact's
  // mobile webview, so this guarantees the person can still get their data out.
  showCSVModal(csv, downloadWorked);
}

function showCSVModal(csv, downloadAttempted){
  $('modalRoot').innerHTML = `
    <div class="modal-bg" id="csvBg">
      <div class="modal">
        <h3>Dữ liệu CSV</h3>
        <p class="hint">${downloadAttempted? 'Nếu file không tự tải xuống, ':''}Bạn có thể bôi đen (hoặc bấm "Sao chép") toàn bộ nội dung bên dưới rồi dán vào Zalo, Notes hoặc Email để lưu lại.</p>
        <textarea id="csvText" readonly style="width:100%;height:160px;font-family:'Space Mono',monospace;font-size:11px;padding:8px;border-radius:8px;border:1.5px solid var(--paper-line);background:#fffef9;">${csv.replace(/</g,'&lt;')}</textarea>
        <div class="btn-row" style="margin-top:10px;">
          <button class="btn btn-ghost" id="closeCsv">Đóng</button>
          <button class="btn btn-primary" id="copyCsv">Sao chép</button>
        </div>
      </div>
    </div>`;
  $('closeCsv').onclick=()=> $('modalRoot').innerHTML='';
  $('copyCsv').onclick=()=>{
    const ta=$('csvText');
    ta.focus(); ta.select(); ta.setSelectionRange(0,999999);
    let copied=false;
    try{ copied=document.execCommand('copy'); }catch(e){ copied=false; }
    if(copied){
      $('copyCsv').textContent='Đã sao chép ✓';
      setTimeout(()=>{ if($('copyCsv')) $('copyCsv').textContent='Sao chép'; }, 1800);
    }else if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(csv).then(()=>{
        $('copyCsv').textContent='Đã sao chép ✓';
        setTimeout(()=>{ if($('copyCsv')) $('copyCsv').textContent='Sao chép'; }, 1800);
      }).catch(()=>{
        alert('Không tự sao chép được — vui lòng bôi đen nội dung và copy thủ công.');
      });
    }else{
      alert('Không tự sao chép được — vui lòng bôi đen nội dung và copy thủ công.');
    }
  };
}
