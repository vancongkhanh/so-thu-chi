function isLocked(date){
  return lockedDates.includes(date);
}

function dayTransactions(date){
  return transactions.filter(t=>t.date===date);
}

function computeTotals(list){
  let thu_tm=0, thu_ck=0, chi_tm=0, chi_ck=0;
  list.forEach(t=>{
    if(t.type==='thu'){ if(t.method==='tm') thu_tm+=t.amount; else thu_ck+=t.amount; }
    else { if(t.method==='tm') chi_tm+=t.amount; else chi_ck+=t.amount; }
  });
  return {thu_tm, thu_ck, chi_tm, chi_ck};
}

function addTransaction(){
  const amount = unformat($('txAmount').value);
  if(!amount){ alert('Bạn chưa nhập số tiền.'); return; }
  const note = $('txNote').value.trim();
  transactions.push({
    id: 'tx-'+Date.now()+Math.random().toString(16).slice(2),
    date: entryDate, type: txType, method: txMethod, amount, note
  });
  persistTransactions();
  $('txAmount').value=''; $('txNote').value='';
  renderEntryTab();
}

function deleteTransaction(id){
  transactions = transactions.filter(t=>t.id!==id);
  persistTransactions();
  renderEntryTab();
}

function upsertEntryForDate(date, totals){
  const idx = entries.findIndex(e=>e.date===date);
  if(idx>-1){
    entries[idx] = {...entries[idx], thu_tm:totals.thu_tm, thu_ck:totals.thu_ck, chi_tm:totals.chi_tm, chi_ck:totals.chi_ck};
  }else{
    entries.push({id:'entry-'+date, date, thu_tm:totals.thu_tm, thu_ck:totals.thu_ck, chi_tm:totals.chi_tm, chi_ck:totals.chi_ck, note:''});
  }
}

function finalizeDay(){
  const list = dayTransactions(entryDate);
  if(list.length===0){
    alert('Chưa có khoản nào để chốt.');
    return;
  }
  $('modalRoot').innerHTML = `
    <div class="modal-bg">
      <div class="modal">
        <h3>Chốt số liệu ngày ${ddmmyyyy(entryDate)}?</h3>
        <p class="hint">Sau khi chốt, ngày này sẽ bị khoá — cần bấm "Mở lại" mới sửa/thêm khoản được.</p>
        <div class="btn-row">
          <button class="btn btn-ghost" id="cancelFinalize">Huỷ</button>
          <button class="btn btn-primary" id="okFinalize">Chốt số liệu</button>
        </div>
      </div>
    </div>`;
  $('cancelFinalize').onclick = ()=> $('modalRoot').innerHTML='';
  $('okFinalize').onclick = async ()=>{
    const totals = computeTotals(list);
    upsertEntryForDate(entryDate, totals);
    if(!lockedDates.includes(entryDate)) lockedDates.push(entryDate);
    await persist();
    await persistLockedDates();
    $('modalRoot').innerHTML='';
    render();
  };
}

function unlockDay(){
  $('modalRoot').innerHTML = `
    <div class="modal-bg">
      <div class="modal">
        <h3>Mở lại ngày ${ddmmyyyy(entryDate)}?</h3>
        <p class="hint">Bạn sẽ thêm/sửa/xoá được từng khoản của ngày này. Nhớ bấm "Chốt số liệu ngày" lại sau khi sửa xong.</p>
        <div class="btn-row">
          <button class="btn btn-ghost" id="cancelUnlock">Huỷ</button>
          <button class="btn btn-primary" id="okUnlock">Mở lại</button>
        </div>
      </div>
    </div>`;
  $('cancelUnlock').onclick = ()=> $('modalRoot').innerHTML='';
  $('okUnlock').onclick = async ()=>{
    lockedDates = lockedDates.filter(d=>d!==entryDate);
    // If this day has no itemized transactions yet (historical/imported data),
    // seed them from the existing totals first so nothing gets lost.
    if(dayTransactions(entryDate).length===0){
      const entry = entries.find(e=>e.date===entryDate);
      if(entry){
        const seeds=[];
        if(entry.thu_tm) seeds.push({id:'seedtx-'+entryDate+'-thutm', date:entryDate, type:'thu', method:'tm', amount:entry.thu_tm, note:'Số liệu gốc'});
        if(entry.thu_ck) seeds.push({id:'seedtx-'+entryDate+'-thuck', date:entryDate, type:'thu', method:'ck', amount:entry.thu_ck, note:'Số liệu gốc'});
        if(entry.chi_tm) seeds.push({id:'seedtx-'+entryDate+'-chitm', date:entryDate, type:'chi', method:'tm', amount:entry.chi_tm, note:'Số liệu gốc'});
        if(entry.chi_ck) seeds.push({id:'seedtx-'+entryDate+'-chick', date:entryDate, type:'chi', method:'ck', amount:entry.chi_ck, note:'Số liệu gốc'});
        transactions = transactions.concat(seeds);
        await persistTransactions();
      }
    }
    await persistLockedDates();
    $('modalRoot').innerHTML='';
    render();
  };
}

function renderEntryTab(){
  if(!entryDate) return;
  const locked = isLocked(entryDate);
  $('lockedView').style.display = locked? 'block':'none';
  $('unlockedView').style.display = locked? 'none':'block';

  if(locked){
    const entry = entries.find(e=>e.date===entryDate) || {thu_tm:0,thu_ck:0,chi_tm:0,chi_ck:0};
    const thu = entry.thu_tm+entry.thu_ck, chi = entry.chi_tm+entry.chi_ck;
    $('lockedThu').textContent=fmt(thu);
    $('lockedChi').textContent=fmt(chi);
    $('lockedLai').textContent=fmt(thu-chi);
  }else{
    const list = dayTransactions(entryDate).sort((a,b)=> b.id.localeCompare(a.id));
    const txListEl = $('txList');
    if(list.length===0){
      txListEl.innerHTML = '<div class="empty">Chưa có khoản nào cho ngày này.</div>';
    }else{
      txListEl.innerHTML = list.map(t=>`
        <div class="tx-row" data-id="${t.id}">
          <div class="tx-main">
            <span class="tx-badge ${t.type}">${t.type==='thu'?'Thu':'Chi'} ${t.method==='tm'?'TM':'CK'}</span>
            <span class="tx-amt">${fmt(t.amount)}</span>
            <span class="tx-note">${t.note||''}</span>
          </div>
          <button class="tx-del" data-del="${t.id}">✕</button>
        </div>`).join('');
      txListEl.querySelectorAll('[data-del]').forEach(btn=>{
        btn.addEventListener('click',()=>deleteTransaction(btn.dataset.del));
      });
    }
    const totals = computeTotals(list);
    $('liveThu').textContent = fmt(totals.thu_tm+totals.thu_ck);
    $('liveChi').textContent = fmt(totals.chi_tm+totals.chi_ck);
    $('liveLai').textContent = fmt((totals.thu_tm+totals.thu_ck)-(totals.chi_tm+totals.chi_ck));
  }
}

function goToEntryDate(date){
  entryDate = date;
  $('fDate').value = date;
  $('fDateDisplay').textContent = ddmmyyyy(date);
  activeParent = 'thuchi';
  activeChildThuChi = 'kinhdoanh';
  renderTabUI();
  $('tabEntry').scrollIntoView({behavior:'smooth'});
}
