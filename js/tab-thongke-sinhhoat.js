function getHomeMonthlyTotals(){
  const byMonth = {};
  homeTransactions.forEach(h=>{
    const ym = h.date.slice(0,7);
    byMonth[ym] = byMonth[ym] || {thu:0, chi:0};
    if(h.type==='thu') byMonth[ym].thu += h.amount;
    else byMonth[ym].chi += h.amount;
  });
  return byMonth;
}

function computeHomeLifetimeCumulative(){
  let cumTm=0, cumCk=0;
  homeTransactions.forEach(h=>{
    const sign = h.type==='thu'? 1 : -1;
    if(h.method==='tm') cumTm += sign*h.amount;
    else cumCk += sign*h.amount;
  });
  return {tm:cumTm, ck:cumCk};
}
function renderHomeStats(){
  renderCategoryDropdown('hsCatTrigger', 'hsCatPanel', hsSelectedCategories, (arr)=>{ hsSelectedCategories=arr; renderHomeStats(); });

  let data = filteredHomeTransactions(homeStatsRange, homeStatsFilterFrom, homeStatsFilterTo);
  if(hsSelectedCategories.length>0){
    data = data.filter(h=>hsSelectedCategories.includes(h.category));
  }

  const sThu = data.filter(h=>h.type==='thu').reduce((s,h)=>s+h.amount,0);
  const sChi = data.filter(h=>h.type==='chi').reduce((s,h)=>s+h.amount,0);
  $('hsThu').textContent = fmt(sThu);
  $('hsChi').textContent = fmt(sChi);
  $('hsBalance').textContent = fmt(sThu-sChi);
  $('homeWarnCard').style.display = (sChi>sThu) ? 'block' : 'none';

  const savingsEl = $('hsSavingsRate');
  if(sThu>0){
    const rate = ((sThu-sChi)/sThu)*100;
    savingsEl.textContent = rate.toFixed(0)+'%';
    savingsEl.style.color = rate>=0 ? 'var(--green)' : 'var(--red)';
  }else{
    savingsEl.textContent = '—';
    savingsEl.style.color = 'var(--gold)';
  }

  const cum = computeHomeLifetimeCumulative();
  $('hsCumTm').textContent = fmt(cum.tm);
  $('hsCumCk').textContent = fmt(cum.ck);

  const byMonthAll = getHomeMonthlyTotals();
  const allMonthKeysH = Object.keys(byMonthAll);
  const totalChiAllTime = allMonthKeysH.reduce((s,ym)=>s+byMonthAll[ym].chi,0);
  const avgChi = allMonthKeysH.length>0 ? totalChiAllTime/allMonthKeysH.length : 0;
  const totalCum = cum.tm + cum.ck;
  const runwayEl = $('hsRunway');
  if(avgChi>0){
    const runway = totalCum/avgChi;
    runwayEl.textContent = runway.toFixed(1)+' tháng';
    runwayEl.style.color = runway>=0 ? 'var(--green)' : 'var(--red)';
  }else{
    runwayEl.textContent = '—';
    runwayEl.style.color = 'var(--gold)';
  }

  renderCategoryDonut(data, 'thu', 'thuCat');
  renderCategoryDonut(data, 'chi', 'cat');

  const byMonth = getHomeMonthlyTotals();
  const months = Object.keys(byMonth).sort();
  if(months.length===0){
    $('homeMonthlyChart').innerHTML = '<div class="empty">Chưa có dữ liệu</div>';
  }else{
    const labels = months.map(ym=>'T'+ym.slice(5,7));
    const thuArr = months.map(ym=>byMonth[ym].thu);
    const chiArr = months.map(ym=>byMonth[ym].chi);
    $('homeMonthlyChart').innerHTML = buildLineChartSVG(labels, thuArr, chiArr);
    $('homeMonthlyChart').scrollLeft = $('homeMonthlyChart').scrollWidth;
  }
}
