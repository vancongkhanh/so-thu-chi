let fbApp=null, fbAuth=null, fbDb=null, fbDocRef=null, fbReady=false, fbSuppressNextSnapshot=false;

// Đăng nhập bằng 1 tài khoản Firebase Auth cố định (email nội bộ, không dùng để
// nhận mail) — chỉ mật khẩu mới là bí mật thật. Cùng kiểu với trang "Giá vốn".
const THUCHI_EMAIL = 'thuchi@so-thu-chi-khanh-ha.internal';

// Giới hạn phiên đăng nhập 12 giờ kể từ lúc gõ mật khẩu — hạn chế rủi ro nếu
// lỡ mất điện thoại hoặc người khác cầm máy dùng khi mình không để ý. Đây là
// giới hạn tự làm ở phía app (Firebase Auth mặc định không tự hết hạn), nên
// nếu đổi mật khẩu qua Firebase Console thì mọi phiên đang mở trên MỌI thiết
// bị sẽ bị huỷ ngay lập tức — đó mới là biện pháp chính khi thực sự mất máy.
const SESSION_TTL_MS = 12*60*60*1000;
const SESSION_TS_KEY = 'thuchiLoginTs';

function isSessionExpired(){
  const ts = parseInt(localStorage.getItem(SESSION_TS_KEY)||'0',10);
  return !ts || (Date.now()-ts) > SESSION_TTL_MS;
}
function markSessionActive(){
  localStorage.setItem(SESSION_TS_KEY, String(Date.now()));
}
function clearSession(){
  localStorage.removeItem(SESSION_TS_KEY);
}

function showLoginGate(){
  $('loginGate').hidden = false;
  $('appRoot').hidden = true;
}
function showApp(){
  $('loginGate').hidden = true;
  $('appRoot').hidden = false;
  $('loginPassword').value = '';
}

async function initFirebase(){
  try{
    fbApp = firebase.initializeApp(firebaseConfig);
    fbAuth = firebase.auth();
    fbDb = firebase.firestore();
    try{
      // Bật cache offline (IndexedDB): lần mở sau app có thể đọc dữ liệu từ
      // cache local ngay lập tức trong lúc chờ đồng bộ với server, thay vì
      // luôn phải chờ trọn vẹn 1 round-trip mạng mới thấy gì. Nếu trình duyệt
      // không hỗ trợ (vd Safari ẩn danh) hoặc lỗi thì bỏ qua, không ảnh hưởng
      // luồng chạy chính.
      await fbDb.enablePersistence({synchronizeTabs:true});
    }catch(e){}
    fbDocRef = fbDb.collection('sothuchi').doc('main');
    fbReady = true;
  }catch(e){
    fbReady = false;
    setStorageWarning(true);
  }
}

async function attemptLogin(password){
  const btn = $('loginSubmitBtn');
  const errEl = $('loginError');
  errEl.textContent = '';
  if(!fbReady){ errEl.textContent = 'Không kết nối được máy chủ, thử lại sau.'; return; }
  btn.disabled = true;
  btn.textContent = 'Đang kiểm tra...';
  try{
    await fbAuth.signInWithEmailAndPassword(THUCHI_EMAIL, password);
    markSessionActive();
  }catch(e){
    errEl.textContent = 'Sai mật khẩu, thử lại.';
  }
  btn.disabled = false;
  btn.textContent = 'Vào ứng dụng';
}

async function enforceSessionTTL(){
  if(fbAuth && fbAuth.currentUser && isSessionExpired()){
    await fbAuth.signOut();
  }
}

async function bootAuth(){
  if(isSessionExpired()) showLoginGate(); // quyết định nhanh, không cần đợi Firebase
  await initFirebase();
  if(!fbReady){ hideLoading(); showLoginGate(); return; }
  await enforceSessionTTL();
  fbAuth.onAuthStateChanged((user)=>{
    if(user && !isSessionExpired()){
      showApp();
      loadEntries();
    }else{
      if(user) fbAuth.signOut();
      clearSession();
      hideLoading();
      showLoginGate();
    }
  });
}

async function persistAll(){
  if(!fbReady){ setStorageWarning(true); return; }
  try{
    fbSuppressNextSnapshot = true;
    await fbDocRef.set({
      entries: entries,
      transactions: transactions,
      lockedDates: lockedDates,
      withdrawals: withdrawals,
      categories: categories,
      homeTransactions: homeTransactions,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    setStorageWarning(false);
  }catch(e){
    setStorageWarning(true);
  }
}
// All three used to be separate storage keys; now they live in one Firestore
// document, so every save just writes the full current state.
async function persist(){ await persistAll(); }
async function persistTransactions(){ await persistAll(); }
async function persistLockedDates(){ await persistAll(); }

function setStorageWarning(show){
  const el = $('storageWarning');
  if(el) el.style.display = show? 'block':'none';
}

// One-off historical figures supplied after the main import (e.g. a prior year's
// closing totals). Only ever ADDS a date that isn't already present — never
// overwrites anything that's already there.
// Số dư mang sang đầu năm (từ tháng 12 năm trước), dùng làm điểm bắt đầu cho
// lũy kế của năm đó thay vì bắt đầu từ 0. Thêm năm khác vào đây nếu cần sau này.
const OPENING_BALANCES = {
  '2026': { tm: 13076000, ck: 182000 }
};

const ADDITIONAL_ENTRIES = [
  {date:'2025-12-31', thu_tm:13076000, thu_ck:182000, chi_tm:0, chi_ck:0, note:'Số liệu tổng tháng 12/2025'}
];

function mergeAdditionalData(){
  const existingDates = new Set(entries.map(e=>e.date));
  let changed = false;
  ADDITIONAL_ENTRIES.forEach(a=>{
    if(!existingDates.has(a.date)){
      entries.push({id:'extra-'+a.date, date:a.date, thu_tm:a.thu_tm, thu_ck:a.thu_ck, chi_tm:a.chi_tm, chi_ck:a.chi_ck, note:a.note||''});
      if(!lockedDates.includes(a.date)) lockedDates.push(a.date);
      changed = true;
    }
  });
  return changed;
}

function hideLoading(){
  const el = $('loadingOverlay');
  if(el) el.style.display = 'none';
}

async function loadEntries(){
  // fbReady + đăng nhập đã được xác nhận xong ở bootAuth() trước khi hàm này
  // được gọi — ở đây chỉ còn việc mở kết nối lắng nghe dữ liệu.
  fbDocRef.onSnapshot(async (doc)=>{
    if(fbSuppressNextSnapshot){
      // This snapshot is just an echo of our own write; state is already correct.
      fbSuppressNextSnapshot = false;
      return;
    }
    if(doc.exists){
      const data = doc.data();
      entries = data.entries || [];
      transactions = data.transactions || [];
      lockedDates = data.lockedDates || [];
      withdrawals = data.withdrawals || [];
      categories = (data.categories && data.categories.length) ? data.categories : DEFAULT_CATEGORIES.slice();
      homeTransactions = data.homeTransactions || [];
      if(mergeAdditionalData()){
        await persistAll();
      }
      render();
      hideLoading();
    }else{
      seedFirstRun();
    }
  }, (err)=>{
    setStorageWarning(true);
    hideLoading();
  });
}

async function seedFirstRun(){
  // SEED_DATA nằm trong data-seed.js (~25KB) — chỉ tải file này đúng lúc cần
  // seed lần đầu, không tải sẵn ở mọi lần mở app.
  const v = document.querySelector('meta[name="app-version"]').content;
  await loadScriptOnce('js/data-seed.js?v=' + v);
  entries = SEED_DATA.slice();
  transactions = [];
  lockedDates = [...new Set(entries.map(e=>e.date))];
  withdrawals = [];
  categories = DEFAULT_CATEGORIES.slice();
  homeTransactions = [];
  mergeAdditionalData();
  await persistAll();
  render();
  hideLoading();
}
