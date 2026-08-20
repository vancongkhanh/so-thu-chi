// ===== TK Chung =====
function computeBusinessLifetimeCumulative(){
  const byMonth = getMonthlyTotals();
  const months = Object.keys(byMonth).sort();
  let cumTm=0, cumCk=0;
  months.forEach(ym=>{
    const d = byMonth[ym];
    cumTm += (d.thu_tm-d.chi_tm) - (d.wd_tm||0);
    cumCk += (d.thu_ck-d.chi_ck) - (d.wd_ck||0);
  });
  return {tm:cumTm, ck:cumCk};
}

function getCombinedAssetMonthlySeries(){
  const bizMonths = getMonthlyTotals();
  const homeMonths = getHomeMonthlyTotals();
  const allKeys = [...new Set([...Object.keys(bizMonths), ...Object.keys(homeMonths)])].sort();
  let cum = 0;
  const labels=[], netValues=[], cumValues=[];
  allKeys.forEach(ym=>{
    const b = bizMonths[ym];
    const h = homeMonths[ym];
    // bizNet = Lãi kinh doanh - Trích quỹ (đã trừ sẵn wd trong dữ liệu getMonthlyTotals)
    const bizNet = b ? (b.thu_tm+b.thu_ck)-(b.chi_tm+b.chi_ck)-((b.wd_tm||0)+(b.wd_ck||0)) : 0;
    // homeNet = Thu sinh hoạt - Chi sinh hoạt (đã gồm cả tiền nhận từ trích quỹ, không trừ 2 lần)
    const homeNet = h ? (h.thu - h.chi) : 0;
    const net = bizNet + homeNet;
    cum += net;
    labels.push('T'+ym.slice(5,7));
    netValues.push(net);
    cumValues.push(cum);
  });
  return {labels, netValues, cumValues};
}
function renderAllStats(){
  const biz = computeBusinessLifetimeCumulative();
  const home = computeHomeLifetimeCumulative();
  const totalTm = biz.tm + home.tm;
  const totalCk = biz.ck + home.ck;
  $('allAssetTotal').textContent = fmt(totalTm + totalCk);
  $('allBizTm').textContent = fmt(biz.tm);
  $('allBizCk').textContent = fmt(biz.ck);
  $('allHomeTm').textContent = fmt(home.tm);
  $('allHomeCk').textContent = fmt(home.ck);
  $('allSumTm').textContent = fmt(totalTm);
  $('allSumCk').textContent = fmt(totalCk);

  const currentYm = todayISO().slice(0,7);
  const chiSHThisMonth = homeTransactions
    .filter(h=>h.type==='chi' && h.date.slice(0,7)===currentYm)
    .reduce((s,h)=>s+h.amount,0);
  const wdThisMonth = withdrawals
    .filter(w=>w.date.slice(0,7)===currentYm)
    .reduce((s,w)=>s+w.tm+w.ck,0);
  const ratio = wdThisMonth>0 ? (chiSHThisMonth/wdThisMonth*100) : null;
  $('allUseRatio').textContent = ratio===null? '—' : ratio.toFixed(0)+'%';
  $('allUseRatio').style.color = (ratio!==null && ratio>100) ? 'var(--red)' : 'var(--gold)';

  const series = getCombinedAssetMonthlySeries();
  if(series.labels.length===0){
    $('assetTrendChart').innerHTML = '<div class="empty">Chưa có dữ liệu</div>';
    $('netFlowChart').innerHTML = '<div class="empty">Chưa có dữ liệu</div>';
    $('netFlowThisMonth').textContent = '0';
  }else{
    $('assetTrendChart').innerHTML = buildValueLineSVG(series.labels, series.cumValues);
    $('assetTrendChart').scrollLeft = $('assetTrendChart').scrollWidth;
    $('netFlowChart').innerHTML = buildValueLineSVG(series.labels, series.netValues);
    $('netFlowChart').scrollLeft = $('netFlowChart').scrollWidth;

    const lastIdx = series.labels.length-1;
    const thisMonthLabel = 'T'+currentYm.slice(5,7);
    let netThisMonth = 0;
    if(series.labels[lastIdx]===thisMonthLabel){
      netThisMonth = series.netValues[lastIdx];
    }
    $('netFlowThisMonth').textContent = fmt(netThisMonth);
    $('netFlowThisMonth').style.color = netThisMonth>=0 ? 'var(--green)' : 'var(--red)';
  }
}
