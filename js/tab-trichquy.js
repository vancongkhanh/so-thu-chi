function addWithdrawal(){
  const tm = unformat($('wdTm').value);
  const ck = unformat($('wdCk').value);
  if(!tm && !ck){ alert('Bạn chưa nhập số tiền trích quỹ.'); return; }
  const wdId = 'wd-'+Date.now()+Math.random().toString(16).slice(2);
  withdrawals.push({id:wdId, date:wdDate, tm, ck});

  if(SINHHOAT_ENABLED && $('wdLinkHome').checked){
    const note = $('wdHomeNote').value.trim() || 'Trích quỹ kinh doanh';
    if(tm){
      homeTransactions.push({
        id:'h-'+wdId+'-tm', date:wdDate, type:wdHomeType, method:'tm', amount:tm,
        note, category:'cat-trich-quy', linkedWithdrawalId:wdId
      });
    }
    if(ck){
      homeTransactions.push({
        id:'h-'+wdId+'-ck', date:wdDate, type:wdHomeType, method:'ck', amount:ck,
        note, category:'cat-trich-quy', linkedWithdrawalId:wdId
      });
    }
  }

  persistAll();
  $('wdTm').value=''; $('wdCk').value=''; $('wdHomeNote').value='';
  renderWithdrawalsTab();
}

function deleteWithdrawal(id){
  withdrawals = withdrawals.filter(w=>w.id!==id);
  // Cascade: also remove any Sinh hoạt entries created from this trích quỹ.
  homeTransactions = homeTransactions.filter(h=>h.linkedWithdrawalId!==id);
  persistAll();
  renderWithdrawalsTab();
  renderHomeTab();
}

function renderWithdrawalsTab(){
  const list = [...filteredWithdrawals()].sort((a,b)=> b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const listEl = $('wdList');
  if(list.length===0){
    listEl.innerHTML = '<div class="empty">Không có khoản trích quỹ nào trong khoảng đã chọn.</div>';
  }else{
    listEl.innerHTML = list.map(w=>`
      <div class="wd-row" data-id="${w.id}">
        <div class="d">${ddmmyyyy(w.date)}</div>
        <div class="col">${w.tm? fmt(w.tm):'—'}</div>
        <div class="col">${w.ck? fmt(w.ck):'—'}</div>
        <button class="wd-del" data-del="${w.id}">✕</button>
      </div>`).join('');
    listEl.querySelectorAll('[data-del]').forEach(btn=>{
      btn.addEventListener('click',()=>deleteWithdrawal(btn.dataset.del));
    });
  }
}
function filteredWithdrawals(){
  if(withdrawals.length===0) return [];
  return filterByMode(withdrawals, wdRange, wdFilterFrom, wdFilterTo);
}
