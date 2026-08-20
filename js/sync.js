let fbApp=null, fbAuth=null, fbDb=null, fbDocRef=null, fbReady=false, fbSuppressNextSnapshot=false;

async function initFirebase(){
  try{
    fbApp = firebase.initializeApp(firebaseConfig);
    fbAuth = firebase.auth();
    fbDb = firebase.firestore();
    fbDocRef = fbDb.collection('sothuchi').doc('main');
    await fbAuth.signInAnonymously();
    fbReady = true;
  }catch(e){
    fbReady = false;
    setStorageWarning(true);
  }
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
  await initFirebase();
  if(!fbReady){
    // Can't reach Firebase (offline / misconfigured) — fall back to whatever
    // was already in memory so the app doesn't crash, and keep the warning visible.
    render();
    hideLoading();
    return;
  }

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
