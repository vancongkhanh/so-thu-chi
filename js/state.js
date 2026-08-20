// Cầu dao tắt/mở tính năng "Quản lý sinh hoạt" (tab Sinh hoạt, TK Sinh hoạt, TK Chung,
// và phần liên kết Trích quỹ → Sinh hoạt). Đổi thành true để mở lại toàn bộ khi cần —
// dữ liệu cũ vẫn được giữ nguyên trên Firebase, không mất gì khi tắt/mở lại.
const SINHHOAT_ENABLED = false;

let entries=[];
let statsRange='month';
let donutMode='thu';
let recentRange='month';
let filterFrom='';
let filterTo='';
let filterFromStats='';
let filterToStats='';
let transactions=[];
let lockedDates=[];
let entryDate='';
let txType='thu';
let txMethod='tm';
let withdrawals=[];
let wdRange='month';
let wdFilterFrom='';
let wdFilterTo='';
let wdDate='';
let wdHomeType='thu';

const DEFAULT_CATEGORIES = [
  {id:'cat-an-uong', name:'Ăn uống'},
  {id:'cat-hoc-phi', name:'Học phí con'},
  {id:'cat-dien-nuoc', name:'Điện nước'},
  {id:'cat-y-te', name:'Y tế'},
  {id:'cat-giai-tri', name:'Giải trí'},
  {id:'cat-khac', name:'Khác'},
  {id:'cat-trich-quy', name:'Trích quỹ', protected:true},
];
let categories=[];
let homeTransactions=[];
let homeType='thu';
let homeMethod='tm';
let hDate='';
let homeRange='month';
let homeFilterFrom='';
let homeFilterTo='';
let homeStatsRange='month';
let homeStatsFilterFrom='';
let homeStatsFilterTo='';
let hsSelectedCategories=[];
let homeSelectedCategories=[];
const CHI_MERGE_DATA = [];
const MERGE_DATA = [];
let selectedYm = '';
