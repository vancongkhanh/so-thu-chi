// ===== Hạng mục (Sinh hoạt) =====
function categoryName(id){
  const c = categories.find(x=>x.id===id);
  return c ? c.name : 'Khác';
}

function populateCategorySelect(){
  const sel = $('hCategory');
  const prev = sel.value;
  sel.innerHTML = categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  if(categories.some(c=>c.id===prev)) sel.value = prev;
}

function openCategoryManager(){
  renderCategoryModal();
}

function renderCategoryModal(){
  $('modalRoot').innerHTML = `
    <div class="modal-bg" id="catModalBg">
      <div class="modal">
        <h3>Quản lý hạng mục</h3>
        <div id="catManageList"></div>
        <div class="row2" style="margin-top:12px;">
          <input type="text" id="newCatName" placeholder="Tên hạng mục mới" style="flex:1;">
        </div>
        <div class="btn-row" style="margin-top:10px;">
          <button class="btn btn-ghost" id="closeCatModal">Đóng</button>
          <button class="btn btn-primary" id="addCatBtn">Thêm hạng mục</button>
        </div>
      </div>
    </div>`;
  renderCatManageList();
  $('closeCatModal').onclick = ()=>{ $('modalRoot').innerHTML=''; populateCategorySelect(); };
  $('addCatBtn').onclick = ()=>{
    const name = $('newCatName').value.trim();
    if(!name){ return; }
    categories.push({id:'cat-'+Date.now()+Math.random().toString(16).slice(2), name});
    persistAll();
    $('newCatName').value='';
    renderCatManageList();
  };
}

function renderCatManageList(){
  const el = $('catManageList');
  el.innerHTML = categories.map(c=>`
    <div class="cat-manage-row" data-id="${c.id}">
      <div class="cat-name">${c.name}${c.protected? ' 🔒':''}</div>
      ${c.protected? '' : `<button class="cat-rename" data-id="${c.id}">Sửa</button><button class="danger cat-delete" data-id="${c.id}">Xoá</button>`}
    </div>`).join('');
  el.querySelectorAll('.cat-rename').forEach(btn=>{
    btn.addEventListener('click', ()=> startRenameCategory(btn.dataset.id));
  });
  el.querySelectorAll('.cat-delete').forEach(btn=>{
    btn.addEventListener('click', ()=> deleteCategory(btn.dataset.id));
  });
}

function startRenameCategory(id){
  const row = $('catManageList').querySelector(`.cat-manage-row[data-id="${id}"]`);
  const cat = categories.find(c=>c.id===id);
  row.querySelector('.cat-name').innerHTML = `<input type="text" value="${cat.name}" id="renameInput">`;
  const btns = row.querySelectorAll('button');
  btns[0].outerHTML = '<button class="ok" id="saveRenameBtn">Lưu</button>';
  btns[1].outerHTML = '<button id="cancelRenameBtn">Huỷ</button>';
  $('saveRenameBtn').addEventListener('click', ()=>{
    const newName = $('renameInput').value.trim();
    if(newName){ cat.name = newName; persistAll(); }
    renderCatManageList();
  });
  $('cancelRenameBtn').addEventListener('click', renderCatManageList);
}

function deleteCategory(id){
  const usedCount = homeTransactions.filter(h=>h.category===id).length;
  if(usedCount>0){
    alert(`Không thể xoá — hạng mục này đang có ${usedCount} khoản thu/chi sử dụng.`);
    return;
  }
  categories = categories.filter(c=>c.id!==id);
  persistAll();
  renderCatManageList();
}
// ===== Thu chi sinh hoạt =====
function addHomeTransaction(){
  const amount = unformat($('hAmount').value);
  if(!amount){ alert('Bạn chưa nhập số tiền.'); return; }
  const note = $('hNote').value.trim();
  const category = $('hCategory').value;
  homeTransactions.push({
    id:'h-'+Date.now()+Math.random().toString(16).slice(2),
    date:hDate, type:homeType, method:homeMethod, amount, note, category
  });
  persistAll();
  $('hAmount').value=''; $('hNote').value='';
  renderHomeTab();
}

function deleteHomeTransaction(id){
  homeTransactions = homeTransactions.filter(h=>h.id!==id);
  persistAll();
  renderHomeTab();
}

function filteredHomeTransactions(range, from, to){
  if(homeTransactions.length===0) return [];
  return filterByMode(homeTransactions, range, from, to);
}

function renderHomeTab(){
  renderCategoryDropdown('homeCatTrigger', 'homeCatPanel', homeSelectedCategories, (arr)=>{ homeSelectedCategories=arr; renderHomeTab(); });

  let list = [...filteredHomeTransactions(homeRange, homeFilterFrom, homeFilterTo)];
  if(homeSelectedCategories.length>0){
    list = list.filter(h=>homeSelectedCategories.includes(h.category));
  }
  list.sort((a,b)=> b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const listEl = $('homeList');
  if(list.length===0){
    listEl.innerHTML = '<div class="empty">Không có khoản nào trong khoảng đã chọn.</div>';
    return;
  }
  listEl.innerHTML = list.map(h=>`
    <div class="home-row" data-id="${h.id}">
      <div class="home-top">
        <div class="home-main">
          <span class="tx-badge ${h.type}">${h.type==='thu'?'Thu':'Chi'} ${h.method==='tm'?'TM':'CK'}</span>
          <span class="tx-amt">${fmt(h.amount)}</span>
        </div>
        <button class="wd-del" data-del="${h.id}">✕</button>
      </div>
      <div class="home-bottom">
        <span class="d">${ddmmyyyy(h.date)}</span>
        <span class="cat-tag">${categoryName(h.category)}</span>
        ${h.note? `<span class="tx-note">${h.note}</span>`:''}
      </div>
    </div>`).join('');
  listEl.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click', ()=> deleteHomeTransaction(btn.dataset.del));
  });
}
