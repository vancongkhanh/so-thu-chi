const $=(id)=>document.getElementById(id);
const fmt=(n)=> (n||0).toLocaleString('vi-VN');
const unformat=(s)=> parseInt((s||'0').replace(/\D/g,''),10)||0;
function localISODate(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
const todayISO=()=> localISODate(new Date());
const dLabel=(iso)=>{ const d=new Date(iso+'T00:00:00'); return d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'}); };
const ddmmyyyy=(iso)=>{ const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; };

// Shared filter logic used by "Gần đây", "Thống kê" and "Lịch sử trích quỹ".
// A custom từ/đến ngày range always overrides the pill selection when set.
function filterByMode(dataset, mode, customFrom, customTo){
  if(customFrom || customTo){
    return dataset.filter(e=> (!customFrom || e.date>=customFrom) && (!customTo || e.date<=customTo));
  }
  const now=new Date();
  if(mode==='7' || mode==='30'){
    const days=parseInt(mode,10);
    const cutoff=new Date(now); cutoff.setDate(cutoff.getDate()-(days-1));
    const cutoffISO=localISODate(cutoff);
    return dataset.filter(e=>e.date>=cutoffISO);
  }
  if(mode==='month'){
    const ym=localISODate(now).slice(0,7);
    return dataset.filter(e=>e.date.slice(0,7)===ym);
  }
  if(mode==='prevmonth'){
    const prev=new Date(now.getFullYear(), now.getMonth()-1, 1);
    const ym=localISODate(prev).slice(0,7);
    return dataset.filter(e=>e.date.slice(0,7)===ym);
  }
  if(mode==='year'){
    const y=String(now.getFullYear());
    return dataset.filter(e=>e.date.slice(0,4)===y);
  }
  return dataset.slice();
}

function attachThousandFormat(input){
  input.addEventListener('input',()=>{
    const raw=unformat(input.value);
    input.value = raw? fmt(raw):'';
  });
}
function fmtShort(n){
  if(!n) return '0';
  const sign = n<0 ? '-' : '';
  const abs = Math.abs(n);
  if(abs>=1000000){ const v=abs/1000000; return sign+(Math.round(v*10)/10)+'tr'; }
  if(abs>=1000){ const v=abs/1000; return sign+(Math.round(v*10)/10)+'k'; }
  return sign+String(abs);
}
