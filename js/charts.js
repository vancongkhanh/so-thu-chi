function buildLineChartSVG(labels, thuArr, chiArr){
  const n=labels.length;
  const gap=58;
  const padL=10, padR=10, padTop=26, padBottom=22, plotH=118;
  const width=Math.max(280, n*gap+padL+padR);
  const height=padTop+plotH+padBottom;
  const maxV=Math.max(1, ...thuArr, ...chiArr);
  const x=(i)=> padL + gap/2 + i*gap;
  const y=(v)=> padTop + plotH - (v/maxV)*plotH;

  const thuPts = thuArr.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
  const chiPts = chiArr.map((v,i)=>`${x(i)},${y(v)}`).join(' ');

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="Space Mono, monospace">`;
  svg += `<polyline points="${thuPts}" fill="none" stroke="#3f6b4a" stroke-width="2"/>`;
  svg += `<polyline points="${chiPts}" fill="none" stroke="#a63d2f" stroke-width="2"/>`;

  for(let i=0;i<n;i++){
    const xi=x(i);
    const yThu=y(thuArr[i]), yChi=y(chiArr[i]);
    svg += `<circle cx="${xi}" cy="${yThu}" r="3" fill="#3f6b4a"/>`;
    svg += `<circle cx="${xi}" cy="${yChi}" r="3" fill="#a63d2f"/>`;
    if(thuArr[i]>0) svg += `<text x="${xi}" y="${yThu-7}" font-size="9.5" fill="#3f6b4a" text-anchor="middle">${fmtShort(thuArr[i])}</text>`;
    if(chiArr[i]>0) svg += `<text x="${xi}" y="${yChi+15}" font-size="9.5" fill="#a63d2f" text-anchor="middle">${fmtShort(chiArr[i])}</text>`;
    svg += `<text x="${xi}" y="${height-6}" font-size="9.5" fill="#4b5a55" text-anchor="middle">${labels[i]}</text>`;
  }
  svg += `</svg>`;
  return svg;
}
function buildMarginLineSVG(labels, values){
  const n=labels.length;
  const gap=58;
  const padL=10, padR=10, padTop=26, padBottom=22, plotH=118;
  const width=Math.max(280, n*gap+padL+padR);
  const height=padTop+plotH+padBottom;
  const maxAbs=Math.max(10, ...values.map(v=>Math.abs(v)));
  const x=(i)=> padL + gap/2 + i*gap;
  const y=(v)=> padTop + plotH/2 - (v/maxAbs)*(plotH/2);
  const pts = values.map((v,i)=>`${x(i)},${y(v)}`).join(' ');

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="Space Mono, monospace">`;
  svg += `<line x1="0" y1="${y(0)}" x2="${width}" y2="${y(0)}" stroke="#e1d9c6" stroke-width="1"/>`;
  svg += `<polyline points="${pts}" fill="none" stroke="#a9822f" stroke-width="2"/>`;
  for(let i=0;i<n;i++){
    const xi=x(i), yi=y(values[i]);
    const color = values[i]>=0 ? '#3f6b4a' : '#a63d2f';
    svg += `<circle cx="${xi}" cy="${yi}" r="3" fill="${color}"/>`;
    svg += `<text x="${xi}" y="${yi-8}" font-size="9.5" fill="${color}" text-anchor="middle">${values[i].toFixed(0)}%</text>`;
    svg += `<text x="${xi}" y="${height-6}" font-size="9.5" fill="#4b5a55" text-anchor="middle">${labels[i]}</text>`;
  }
  svg += `</svg>`;
  return svg;
}

// ===== TK Sinh hoạt =====
const CAT_COLORS = ['#a9822f','#3f6b4a','#a63d2f','#20302c','#6b8f9e','#c97b2e','#7d5ba6','#4a90a4'];
function buildMultiDonutGradient(segments){
  const total = segments.reduce((s,x)=>s+x.value,0);
  if(total<=0) return 'var(--paper-line)';
  let acc=0;
  const parts = segments.map(seg=>{
    const startDeg = (acc/total)*360;
    acc += seg.value;
    const endDeg = (acc/total)*360;
    return `${seg.color} ${startDeg}deg ${endDeg}deg`;
  });
  return `conic-gradient(${parts.join(', ')})`;
}

function renderCategoryDropdown(triggerId, panelId, selectedArr, onChange){
  const trigger = $(triggerId);
  const panel = $(panelId);

  let label;
  if(selectedArr.length===0) label = 'Tất cả hạng mục';
  else label = selectedArr.map(id=>categoryName(id)).join(', ');
  trigger.innerHTML = `<span class="cat-filter-label-text">${label}</span><span>▾</span>`;

  panel.innerHTML = `<div class="cat-filter-list">` + categories.map(c=>{
    const checked = selectedArr.includes(c.id);
    const cbId = panelId+'-chk-'+c.id;
    return `<div class="cat-check-row">
      <input type="checkbox" id="${cbId}" data-cat="${c.id}" ${checked?'checked':''}>
      <label for="${cbId}">${c.name}</label>
    </div>`;
  }).join('') + `</div>
    <div class="cat-filter-footer">
      <button class="btn btn-ghost" id="${panelId}-clearAll">Bỏ chọn hết</button>
      <button class="btn btn-primary" id="${panelId}-done">Xong</button>
    </div>`;

  panel.querySelectorAll('input[type=checkbox]').forEach(cb=>{
    cb.addEventListener('change',()=>{
      const cat = cb.dataset.cat;
      let newArr;
      if(cb.checked){
        newArr = selectedArr.includes(cat) ? selectedArr : selectedArr.concat(cat);
      }else{
        newArr = selectedArr.filter(c=>c!==cat);
      }
      onChange(newArr);
    });
  });
  $(panelId+'-clearAll').onclick = ()=> onChange([]);
  $(panelId+'-done').onclick = ()=>{ panel.style.display='none'; };
}

document.addEventListener('click',(e)=>{
  const dd1 = $('hsCatDropdown');
  if(dd1 && !dd1.contains(e.target)) $('hsCatPanel').style.display='none';
  const dd2 = $('homeCatDropdown');
  if(dd2 && !dd2.contains(e.target)) $('homeCatPanel').style.display='none';
});

function renderCategoryDonut(data, type, prefix){
  const catTotals = {};
  data.filter(h=>h.type===type).forEach(h=>{
    catTotals[h.category] = (catTotals[h.category]||0) + h.amount;
  });
  const catEntries = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
  const total = catEntries.reduce((s,[,v])=>s+v,0);
  const elDonut = $(prefix+'DonutEl'), elPct = $(prefix+'DonutPct'), elLbl = $(prefix+'DonutLbl'), elLegend = $(prefix+'DonutLegend');
  if(catEntries.length===0){
    elDonut.style.background = 'var(--paper-line)';
    elPct.textContent = '—';
    elLbl.textContent = 'Chưa có';
    elLegend.innerHTML = `<div class="empty">Chưa có khoản ${type==='thu'?'thu':'chi'} nào trong kỳ này</div>`;
    return;
  }
  const segments = catEntries.map(([id,val],i)=>({value:val, color:CAT_COLORS[i%CAT_COLORS.length]}));
  elDonut.style.background = buildMultiDonutGradient(segments);
  const top = catEntries[0];
  elPct.textContent = total>0? Math.round(top[1]/total*100)+'%' : '—';
  elLbl.textContent = categoryName(top[0]);
  elLegend.innerHTML = catEntries.map(([id,val],i)=>{
    const pct = total>0? Math.round(val/total*100) : 0;
    const color = CAT_COLORS[i%CAT_COLORS.length];
    return `<div><i class="dot" style="background:${color}"></i>${categoryName(id)}: ${fmt(val)} (${pct}%)</div>`;
  }).join('');
}
function buildValueLineSVG(labels, values){
  const n=labels.length;
  const gap=58;
  const padL=10, padR=10, padTop=26, padBottom=22, plotH=118;
  const width=Math.max(280, n*gap+padL+padR);
  const height=padTop+plotH+padBottom;
  const maxAbs=Math.max(1, ...values.map(v=>Math.abs(v)));
  const x=(i)=> padL + gap/2 + i*gap;
  const y=(v)=> padTop + plotH/2 - (v/maxAbs)*(plotH/2);
  const pts = values.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="Space Mono, monospace">`;
  svg += `<line x1="0" y1="${y(0)}" x2="${width}" y2="${y(0)}" stroke="#e1d9c6" stroke-width="1"/>`;
  svg += `<polyline points="${pts}" fill="none" stroke="#a9822f" stroke-width="2"/>`;
  for(let i=0;i<n;i++){
    const xi=x(i), yi=y(values[i]);
    const color = values[i]>=0 ? '#3f6b4a' : '#a63d2f';
    svg += `<circle cx="${xi}" cy="${yi}" r="3" fill="${color}"/>`;
    svg += `<text x="${xi}" y="${yi-8}" font-size="9.5" fill="${color}" text-anchor="middle">${fmtShort(values[i])}</text>`;
    svg += `<text x="${xi}" y="${height-6}" font-size="9.5" fill="#4b5a55" text-anchor="middle">${labels[i]}</text>`;
  }
  svg += `</svg>`;
  return svg;
}
