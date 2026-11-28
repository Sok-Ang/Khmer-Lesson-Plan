/* =====================================================================
   1. CONFIGURATION & CONSTANTS
   ===================================================================== */
const DAYS=[
  ['mon','ច័ន្ទ','Mon'],
  ['tue','អង្គារ','Tue'],
  ['wed','ពុធ','Wed'],
  ['fri','សុក្រ','Fri'],
  ['sat','សៅរ៍','Sat']
];
const DAY_OFFSET={mon:0,tue:1,wed:2,thu:3,fri:4,sat:5};

const SUBJ={
  k:'ភាសាខ្មែរ',
  m:'គណិតវិទ្យា',
  p:'អប់រំកាយ',
  s:'វិទ្យាសាស្ត្រ/សិក្សាសង្គម'
};

const TIMES={
  m:['7:00 – 7:40','7:50 – 8:30','8:40 – 9:20','9:30 – 10:10','10:20 – 11:00'],
  a:['1:00 – 1:40','1:50 – 2:30','2:40 – 3:20','3:30 – 4:10','4:20 – 5:00']
};

const PLAN={
  m:{mon:'pkkmk',tue:'kkmms',wed:'pkkms',fri:'kkkms',sat:'kkmms'},
  a:{mon:'kkmkp',tue:'kkmms',wed:'kkmsp',fri:'skkmk',sat:'kkmmk'}
};

const KH_MONTHS=['មករា','កុម្ភៈ','មីនា','មេសា','ឧសភា','មិថុនា','កក្កដា','សីហា','កញ្ញា','តុលា','វិច្ឆិកា','ធ្នូ'];
const KH_ANIMALS=['ជូត','ឆ្លូវ','ខាល','ថោះ','រោង','ម្សាញ់','មមី','មមែ','វក','រកា','ច','កុរ'];
const KH_SAKS=['សំរឹទ្ធិស័ក','ឯកស័ក','ទោស័ក','ត្រីស័ក','ចត្វាស័ក','បញ្ចស័ក','ឆស័ក','សប្តស័ក','អដ្ឋស័ក','នព្វស័ក'];
const toKhNum=n=>String(n).replace(/\d/g,d=>'០១២៣៤៥៦៧៨៩'[d]);
// Works on null-prototype objects and on older phone browsers (Object.hasOwn needs Chrome 93 / Safari 15.4)
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const MAX_LEN=500; // longest text kept per field (inputs are limited to this too)

/* =====================================================================
   2. OFFLINE KHMER LUNAR CALENDAR (CHHANKITEK / ចន្ទគតិ) ENGINE
   Verified against:
     2026-11-22 -> ថ្ងៃអាទិត្យ ១៣កើត ខែកត្តិក ឆ្នាំមមី អដ្ឋស័ក ពុទ្ធសករាជ ២៥៧០
   ===================================================================== */
const Chhankitek=(()=>{
  const aharkun=be=>Math.floor((be*292207+499)/800)+4;
  const kromathopol=be=>800-((be*292207+499)%800);
  const avoman=be=>(aharkun(be)*11+25)%692;
  const bodithey=be=>(Math.floor((aharkun(be)*11+25)/692)+aharkun(be)+29)%30;
  const isSolarLeap=be=>kromathopol(be)<=207;
  const isBoditheyLeap=be=>{
    const b=bodithey(be),nb=bodithey(be+1);
    if(b===25&&nb===5)return false;
    return (b===24&&nb===6)||b>=25||b<=5;
  };
  const isAvomanLeap=be=>isSolarLeap(be)?avoman(be)<=137:avoman(be)<=126;
  const yearType=be=>{
    if(isBoditheyLeap(be))return 2; // Adhikameas (13 months, 384 days)
    if(isAvomanLeap(be))return 1;   // Adhikavereak (355 days, ជេស្ឋ = 30)
    if(isBoditheyLeap(be-1)&&isAvomanLeap(be-1))return 1;
    return 0;                       // Normal year (354 days)
  };
  const yearMonths=t=>{
    if(t===2){
      return [['មិគសិរ',29],['បុស្ស',30],['មាឃ',29],['ផល្គុន',30],['ចេត្រ',29],['ពិសាខ',30],['ជេស្ឋ',29],['បឋមាសាឍ',30],['ទុតិយាសាឍ',30],['ស្រាពណ៍',29],['ភទ្របទ',30],['អស្សុជ',29],['កត្តិក',30]];
    }
    return [['មិគសិរ',29],['បុស្ស',30],['មាឃ',29],['ផល្គុន',30],['ចេត្រ',29],['ពិសាខ',30],['ជេស្ឋ',t===1?30:29],['អាសាឍ',30],['ស្រាពណ៍',29],['ភទ្របទ',30],['អស្សុជ',29],['កត្តិក',30]];
  };
  const yearLen=be=>{const t=yearType(be);return t===2?384:(t===1?355:354);};

  // Anchor: 2025-11-21 = ១កើត ខែមិគសិរ (day 0 of lunar cycle BE 2570)
  const ANCHOR_BE=2570;
  const ANCHOR_UTC=Date.UTC(2025,10,21);

  return function toKhmerLunar(date){
    const gy=date.getFullYear(),gm=date.getMonth(),gd=date.getDate();
    let diff=Math.round((Date.UTC(gy,gm,gd)-ANCHOR_UTC)/86400000);
    let be=ANCHOR_BE;
    while(diff<0){be--;diff+=yearLen(be);}
    while(diff>=yearLen(be)){diff-=yearLen(be);be++;}

    const months=yearMonths(yearType(be));
    let rem=diff,mName=months[0][0];
    for(const [name,len] of months){
      if(rem<len){mName=name;break;}
      rem-=len;
    }
    const lunarDay=rem<15?`${toKhNum(rem+1)}កើត`:`${toKhNum(rem-14)}រោច`;
    // Buddhist Era increments on ១រោច ខែពិសាខ (day index 162)
    const beYear=diff>=162?be:be-1;
    // Animal year & Sak increment on Khmer New Year Lerng Sak (~April 16)
    const js=(gm>3||(gm===3&&gd>=16))?gy-638:gy-639;
    const animal=KH_ANIMALS[((js+10)%12+12)%12];
    const sak=KH_SAKS[((js%10)+10)%10];

    return {
      khDay:lunarDay,
      khMonth:mName,
      khZodiac:`${animal} ${sak}`,
      beYear:toKhNum(beYear),
      grDay:toKhNum(gd),
      grMonth:KH_MONTHS[gm],
      grYear:toKhNum(gy)
    };
  };
})();

/* =====================================================================
   3. BILINGUAL UI STRINGS (UI Controls Only — Lesson Sheet Stays Khmer)
   ===================================================================== */
const UI={
  km:{
    langBtn:'🌐 English',
    themeDark:'🌙 ងងឹត',
    themeLight:'☀️ ភ្លឺ',
    khDateOn:'📅 បំពេញកាលបរិច្ឆេទស្វ័យប្រវត្តិ៖ បើក ✓',
    khDateOff:'📅 បំពេញកាលបរិច្ឆេទស្វ័យប្រវត្តិ៖ បិទ',
    saving:'កំពុងរក្សាទុក…',
    saved:'បានរក្សាទុករួចរាល់ ✓',
    storageErr:'មិនអាចរក្សាទុកបានទេ! សូមរក្សាទុកច្បាប់ចម្លង (.json) ដើម្បីការពារមេរៀនរបស់អ្នក។',
    weekLbl:'🗂️ សប្តាហ៍ដែលបានរក្សាទុក និង គំរូ',
    wkPrevLbl:'◀ សប្តាហ៍មុន',
    wkNextLbl:'សប្តាហ៍បន្ទាប់ ▶',
    weekOf:(d,m,y)=>`សប្តាហ៍ចាប់ពី ${d} ${m} ${y}`,
    wkDel:'🗑️ លុបសប្តាហ៍នេះ',
    tplSave:'📌 រក្សាទុកជាគំរូ',
    tplApply:'📋 ប្រើគំរូ',
    tplClear:'✖ លុបគំរូ',
    tplNote:'«គំរូ» គឺជាមេរៀនដែលអ្នកប្រើដដែលៗរៀងរាល់សប្តាហ៍។ ពេលបើកសប្តាហ៍ថ្មី មេរៀននឹងចម្លងពីគំរូ (ឬពីសប្តាហ៍ដែលអ្នកកំពុងមើល បើគ្មានគំរូ)។',
    legend:'✓ = បានវាយមេរៀនរួច     ● = ថ្ងៃឈប់សម្រាក',
    holiday:'ថ្ងៃឈប់សម្រាក',
    weekNew:(l,h,c)=>`បានបើកសប្តាហ៍ថ្មី៖ ${l}${c?' · '+c:''}${h?' · '+h:''}`,
    fromTpl:'បានចម្លងមេរៀនពីគំរូ',
    fromLast:'បានចម្លងមេរៀនពីសប្តាហ៍ដែលអ្នកបានមើលមុននេះ',
    tplSaved:'បានរក្សាទុកគំរូរួចរាល់ ✓',
    tplEmpty:'មិនទាន់មានមេរៀនសម្រាប់រក្សាទុកទេ។ សូមវាយមេរៀនជាមុន។',
    noTpl:'មិនទាន់មានគំរូទេ។',
    tplApplied:'បានប្រើគំរូរួចរាល់។',
    tplCleared:'បានលុបគំរូរួចរាល់។',
    askApplyTpl:'តើអ្នកចង់ប្រើគំរូសម្រាប់សប្តាហ៍នេះឬ?\nមេរៀនសប្តាហ៍នេះនឹងត្រូវជំនួស។\n(អ្នកអាចចុច «ត្រឡប់ក្រោយ» បាន)',
    askClearTpl:'តើអ្នកប្រាកដថាចង់លុបគំរូឬ?',
    askDelWeek:l=>`តើអ្នកប្រាកដថាចង់លុប «${l}» ឬ?\n(មិនអាចត្រឡប់ក្រោយបានទេ)`,
    weekDeleted:'បានលុបសប្តាហ៍រួចរាល់។',
    importMulti:n=>`បាននាំចូល ${toKhNum(n)} សប្តាហ៍រួចរាល់។`,
    sessM:'ពេលព្រឹក (៧:០០–១១:០០)',
    sessA:'ពេលរសៀល (១:០០–៥:០០)',
    guideTitle:'របៀបប្រើ មាន ៣ ជំហានសាមញ្ញ',
    guideItems:[
      'ជ្រើសថ្ងៃច័ន្ទនៃសប្តាហ៍ — កាលបរិច្ឆេទខ្មែរ (ចន្ទគតិ) និងសកល នឹងបំពេញដោយស្វ័យប្រវត្តិ។',
      'ចុចលើថ្ងៃខាងលើ ហើយវាយមេរៀន។ ការរក្សាទុកធ្វើឡើងដោយស្វ័យប្រវត្តិ។',
      'ចុច «ទាញយក PDF» ឬ «បោះពុម្ព»។'
    ],
    guideOk:'✓ យល់ហើយ',
    pdfOne:'📥 ទាញយក PDF',
    p1:'🖨️ បោះពុម្ព',
    monLbl:'📅 ជ្រើសរើសសប្តាហ៍ (ចុចលើថ្ងៃណាមួយក្នុងសប្តាហ៍នោះ)',
    todayWeekBtn:'📅 សប្តាហ៍នេះ',
    monNote:'កាលបរិច្ឆេទខ្មែរ (ចន្ទគតិ) និងសកល បំពេញដោយស្វ័យប្រវត្តិ។ អ្នកគ្រាន់តែវាយមេរៀន។ ស.គ ស.ស ហ្វីស ទុកសម្រាប់សរសេរដៃ។',
    where:(d,s)=>`កំពុងធ្វើការ៖ ថ្ងៃ${d[1]} · ${s==='m'?'ពេលព្រឹក':'ពេលរសៀល'}`,
    moreSum:'⚙️ ជម្រើសបន្ថែម',
    secCopy:'ចម្លង និង ទាញយកទាំងអស់',
    copyMtoA:'📋 ចម្លងមេរៀនថ្ងៃនេះ ព្រឹក → រសៀល',
    copyAtoM:'📋 ចម្លងមេរៀនថ្ងៃនេះ រសៀល → ព្រឹក',
    pdfAll:'📥 ទាញយក PDF ទាំងអស់ (១០ ទំព័រ)',
    pa:'🖨️ បោះពុម្ពទាំងអស់ (១០ ទំព័រ)',
    secHelp:'ជំនួយ',
    fminus:'អក្សរ −',
    fplus:'អក្សរ +',
    guideShow:'❓ បង្ហាញរបៀបប្រើ',
    secFile:'រក្សាទុកច្បាប់ចម្លង (ការពារកុំឱ្យបាត់មេរៀន)',
    backupBtn:'💾 រក្សាទុកច្បាប់ចម្លង',
    importBtn:'📂 បើកច្បាប់ចម្លងដែលបានរក្សាទុក',
    secDanger:'លុប (ប្រយ័ត្ន)',
    cl:'🗑️ លុបមេរៀនទាំងអស់',
    prev:'◀ ថ្ងៃមុន',
    next:'ថ្ងៃបន្ទាប់ ▶',
    undoBtn:'↩ ត្រឡប់ក្រោយ',
    closeBtn:'បិទ',
    cancel:'បោះបង់',
    ok:'យល់ព្រម',
    askCopy:(f,t)=>`តើអ្នកចង់ចម្លងមេរៀនថ្ងៃនេះពី${f} ទៅ${t}ឬ?\nមេរៀន${t}ថ្ងៃនេះនឹងត្រូវជំនួស។\n(អ្នកអាចចុច «ត្រឡប់ក្រោយ» បាន)`,
    askClear:'តើអ្នកប្រាកដថាចង់លុបមេរៀនទាំងអស់ឬ?\n(អ្នកអាចចុច «ត្រឡប់ក្រោយ» ក្នុងរយៈពេល ១ នាទី)',
    askImport:'តើអ្នកចង់បើកច្បាប់ចម្លងនេះឬ?\nសប្តាហ៍ដែលមានកាលបរិច្ឆេទដូចគ្នានឹងត្រូវជំនួស ហើយសប្តាហ៍ផ្សេងទៀតនៅដដែល។',
    pdfProg:(i,t)=>`កំពុងបង្កើត PDF ទំព័រទី ${toKhNum(i)} នៃ ${toKhNum(t)}…`,
    pdfDone:f=>`បានទាញយក «${f}» រួចរាល់ ✓\nរកមើលឯកសារនេះក្នុងថត «Downloads» (ទាញយក) នៃទូរស័ព្ទ ឬកុំព្យូទ័រ។`,
    pdfErr:'មិនអាចបង្កើត PDF បានទេ។ សូមចុចប៊ូតុង «បោះពុម្ព» ជំនួស។',
    wipedAll:'បានលុបមេរៀនទាំងអស់រួចរាល់។',
    copiedDay:d=>`បានចម្លងមេរៀនថ្ងៃ${d[1]}រួចរាល់។`,
    filledDates:'បានបំពេញកាលបរិច្ឆេទខ្មែរ (ចន្ទគតិ) និងសកលដោយស្វ័យប្រវត្តិ។',
    newWeek:'បានប្តូរកាលបរិច្ឆេទខ្មែរ និងសកលទៅសប្តាហ៍ថ្មី (+៧ ថ្ងៃ) រួចរាល់។',
    backupDone:f=>`បានរក្សាទុកច្បាប់ចម្លង «${f}» រួចរាល់ ✓\nឯកសារនេះនៅក្នុងថត «Downloads» (ទាញយក)។ សូមរក្សាវាទុក។`,
    importDone:'បានបើកច្បាប់ចម្លងរួចរាល់។',
    importErr:'ឯកសារមិនត្រឹមត្រូវ។ សូមជ្រើសរើសឯកសារ .json ដែលបានរក្សាទុក។'
  },
  en:{
    langBtn:'🌐 ភាសាខ្មែរ',
    themeDark:'🌙 Dark',
    themeLight:'☀️ Light',
    khDateOn:'📅 Auto-Fill Dates: ON ✓',
    khDateOff:'📅 Auto-Fill Dates: OFF',
    saving:'Saving…',
    saved:'Saved ✓',
    storageErr:'Could not save! Your browser is blocking storage. Use "Save Backup Copy" to keep your lessons.',
    weekLbl:'🗂️ Saved Weeks & Template',
    wkPrevLbl:'◀ Previous Week',
    wkNextLbl:'Next Week ▶',
    weekOf:(d,m,y)=>`Week of ${d} ${m} ${y}`,
    wkDel:'🗑️ Delete This Week',
    tplSave:'📌 Save as Template',
    tplApply:'📋 Apply Template',
    tplClear:'✖ Remove Template',
    tplNote:'A "template" is the lessons you reuse every week. When you open a new week, lessons are copied from the template (or from the week you are viewing, if there is no template).',
    legend:'✓ = lessons typed     ● = public holiday',
    holiday:'Holiday',
    weekNew:(l,h,c)=>`Opened new week: ${l}${c?' · '+c:''}${h?' · '+h:''}`,
    fromTpl:'lessons copied from your template',
    fromLast:'lessons copied from the week you were viewing',
    tplSaved:'Template saved ✓',
    tplEmpty:'Nothing to save yet. Type some lessons first.',
    noTpl:'No template saved yet.',
    tplApplied:'Template applied.',
    tplCleared:'Template removed.',
    askApplyTpl:'Apply the template to this week?\nThis week\'s lessons will be replaced.\n(You can click "Undo" afterwards.)',
    askClearTpl:'Remove the saved template?',
    askDelWeek:l=>`Delete "${l}"?\nThis cannot be undone.`,
    weekDeleted:'Week deleted.',
    importMulti:n=>`Imported ${n} week(s).`,
    sessM:'Morning (7:00–11:00)',
    sessA:'Afternoon (1:00–5:00)',
    guideTitle:'How to Use (3 Simple Steps)',
    guideItems:[
      'Pick Monday of the week — Khmer Lunar & Gregorian dates fill in automatically.',
      'Tap a day above and type your lessons. Everything saves automatically.',
      'Tap "Download PDF" or "Print".'
    ],
    guideOk:'✓ Got it',
    pdfOne:'📥 Download PDF',
    p1:'🖨️ Print',
    monLbl:'📅 Choose the Week (tap any day in that week)',
    todayWeekBtn:'📅 This Week',
    monNote:'Khmer Lunar & Gregorian dates fill in by themselves. You only type the lessons. ស.គ / ស.ស / ហ្វីស are left blank for handwriting.',
    where:(d,s)=>`Editing: ${d[2]} (${d[1]}) · ${s==='m'?'Morning':'Afternoon'}`,
    moreSum:'⚙️ More Options',
    secCopy:'Copy & Export All',
    copyMtoA:'📋 Copy Today: Morning → Afternoon',
    copyAtoM:'📋 Copy Today: Afternoon → Morning',
    pdfAll:'📥 Download All PDF (10 Pages)',
    pa:'🖨️ Print All (10 Pages)',
    secHelp:'Help',
    fminus:'Text −',
    fplus:'Text +',
    guideShow:'❓ Show How-To Guide',
    secFile:'Backup Copy (keeps your lessons safe)',
    backupBtn:'💾 Save Backup Copy',
    importBtn:'📂 Open Backup Copy',
    secDanger:'Clear (Caution)',
    cl:'🗑️ Clear All Lessons',
    prev:'◀ Previous Day',
    next:'Next Day ▶',
    undoBtn:'↩ Undo',
    closeBtn:'Close',
    cancel:'Cancel',
    ok:'Confirm',
    askCopy:(f,t)=>`Copy today's lessons from ${f} to ${t}?\nCurrent ${t} lessons for this day will be replaced.\n(You can click "Undo" afterwards.)`,
    askClear:'Clear all lessons for the whole week?\n(You can click "Undo" within 1 minute.)',
    askImport:'Open this backup file?\nWeeks with the same date are replaced; your other saved weeks are kept.',
    pdfProg:(i,t)=>`Building PDF page ${i} of ${t}…`,
    pdfDone:f=>`Downloaded "${f}" ✓\nLook for it in the "Downloads" folder of your phone or computer.`,
    pdfErr:'Could not build PDF. Please use the "Print" button instead.',
    wipedAll:'All lessons cleared.',
    copiedDay:d=>`Copied lessons for ${d[2]}.`,
    filledDates:'Auto-filled Khmer Lunar & Gregorian dates for the week.',
    newWeek:'Advanced Khmer Lunar & Gregorian dates to next week (+7 days).',
    backupDone:f=>`Saved backup "${f}" ✓\nIt is in your "Downloads" folder. Keep it safe.`,
    importDone:'Backup restored successfully.',
    importErr:'Invalid file. Please choose a saved .json backup file.'
  }
};

/* =====================================================================
   4. SAFE STORAGE & STATE MANAGEMENT
   ===================================================================== */
const SK='khmer-lesson-plan-v2';
const FK='khmer-lesson-plan-font2';
const LK='khmer-lesson-plan-lang';
const GK='khmer-lesson-plan-guide';
const THK='khmer-lesson-plan-theme';
const KDK='khmer-lesson-plan-khdate';

function safeGet(k,def){try{return localStorage.getItem(k)||def}catch(e){return def}}
function safeSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}

let lang=safeGet(LK,'km');
if(!UI[lang])lang='km';
const L=()=>UI[lang];

function parseISO(s){ // strict YYYY-MM-DD -> local Date, or null
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');
  if(!m)return null;
  const d=new Date(+m[1],+m[2]-1,+m[3]);
  return d.getFullYear()===+m[1]&&d.getMonth()===+m[2]-1&&d.getDate()===+m[3]?d:null;
}

/* Never trust stored/imported JSON: keep only short string values under sane keys.
   Null-prototype result so a "__proto__" key in a hostile file is just data. */
function sanitizeState(raw){
  const out=Object.create(null);
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
  for(const [k,raw_v] of Object.entries(raw)){
    if(typeof raw_v!=='string'||!/^[a-z0-9:_-]{1,40}$/i.test(k))continue;
    const v=raw_v.slice(0,MAX_LEN); // trim over-long text instead of throwing the whole field away
    if(k.endsWith(':subj')&&!has(SUBJ,v))continue;
    if(k==='meta:mon'&&!parseISO(v))continue;
    out[k]=v;
  }
  return out;
}

let S=Object.create(null);
try{
  // Migrate from v1 storage if v2 is empty
  S=sanitizeState(JSON.parse(safeGet(SK,'')||safeGet('khmer-lesson-plan-v1','{}')));
}catch(e){S=Object.create(null)}

/* Week history: one localStorage key per week, so saving only rewrites the open week.
   A week that was opened but never edited is NOT stored (no clutter from browsing). */
const WP='khmer-lesson-plan-w:';
const TK='khmer-lesson-plan-template';
const LESSON_RE=/^[ma]:[a-z]{3}:\d:/;
function pickLesson(src){
  const o=Object.create(null);
  for(const k of Object.keys(src))if(LESSON_RE.test(k))o[k]=src[k];
  return o;
}
function readWeek(iso){
  try{
    const raw=localStorage.getItem(WP+iso);
    if(!raw)return null;
    const s=sanitizeState(JSON.parse(raw));
    s['meta:mon']=iso;
    return s;
  }catch(e){return null}
}
function hasWeek(iso){try{return localStorage.getItem(WP+iso)!==null}catch(e){return false}}
function removeWeek(iso){try{localStorage.removeItem(WP+iso)}catch(e){}}
function listWeeks(){
  const out=[];
  try{
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k&&k.startsWith(WP)&&parseISO(k.slice(WP.length)))out.push(k.slice(WP.length));
    }
  }catch(e){}
  return out.sort();
}
let template=null;
try{
  const t=pickLesson(sanitizeState(JSON.parse(safeGet(TK,'null'))));
  if(Object.keys(t).length)template=t;
}catch(e){}

/* Debounced persistence: stringify + write once per pause in typing, not per keystroke. */
let persistTimer,dirty=false,storageWarned=false,weekTouched=!!parseISO(S['meta:mon']);
function persist(){
  clearTimeout(persistTimer);
  if(!dirty)return;
  const iso=S['meta:mon'];
  const json=JSON.stringify(S);
  let ok=safeSet(SK,json); // pointer to the open week (also the v2 format)
  if(ok&&weekTouched&&parseISO(iso)){
    ok=safeSet(WP+iso,json);
    const del=document.getElementById('wkDel');if(del)del.disabled=false;
  }
  const b=document.getElementById('savedBadge');
  b.classList.toggle('err',!ok);
  if(ok){dirty=false;storageWarned=false;b.textContent=L().saved}
  else{
    b.textContent=L().storageErr;
    if(!storageWarned){storageWarned=true;showNotice(L().storageErr,true)}
  }
}
const flush=persist;
function save(touch=true){
  if(touch)weekTouched=true;
  dirty=true;
  const sb=document.getElementById('savedBadge');
  sb.classList.remove('err');
  sb.textContent=L().saving;
  clearTimeout(persistTimer);
  persistTimer=setTimeout(persist,300);
  if(document.querySelector('#days button'))markDone();
}

/* Custom confirmation dialog: Escape cancels, Tab stays inside, focus is restored */
let modalPending=null;
function askModal(message,danger=false){
  if(modalPending)modalPending(false);
  return new Promise(resolve=>{
    const bg=document.getElementById('modalBg');
    const msgEl=document.getElementById('modalMsg');
    const okBtn=document.getElementById('modalOk');
    const cancelBtn=document.getElementById('modalCancel');
    const prevFocus=document.activeElement;
    msgEl.textContent=message;
    okBtn.textContent=L().ok;
    cancelBtn.textContent=L().cancel;
    okBtn.className=danger?'solid danger':'solid';
    bg.classList.add('open');
    (danger?cancelBtn:okBtn).focus();
    const onKey=e=>{
      if(e.key==='Escape'){e.preventDefault();done(false)}
      else if(e.key==='Tab'){
        e.preventDefault();
        const f=[cancelBtn,okBtn],i=f.indexOf(document.activeElement);
        f[(i+(e.shiftKey?-1:1)+f.length)%f.length].focus();
      }
    };
    const done=val=>{
      bg.classList.remove('open');
      okBtn.onclick=null;cancelBtn.onclick=null;bg.onclick=null;
      document.removeEventListener('keydown',onKey,true);
      modalPending=null;
      if(prevFocus&&prevFocus.focus)prevFocus.focus();
      resolve(val);
    };
    modalPending=done;
    document.addEventListener('keydown',onKey,true);
    okBtn.onclick=()=>done(true);
    cancelBtn.onclick=()=>done(false);
    bg.onclick=e=>{if(e.target===bg)done(false)};
  });
}

let ses='m',di=0;

/* =====================================================================
   5. BUILD THE 10 KHMER LESSON SHEETS
   ===================================================================== */
function build(){
  let h='';
  for(const s of ['m','a'])for(const [d,n] of DAYS){
    h+=`<section class="sheet" id="sh-${s}-${d}"><div class="ui-only holflag" data-day="${d}" hidden></div>
    <div class="head"><b class="dn">ថ្ងៃ${n}</b> <input data-k="d:${d}:kh" class="kh" aria-label="ថ្ងៃចន្ទគតិ"> ខែ<input data-k="d:${d}:km" class="m" aria-label="ខែចន្ទគតិ"> ឆ្នាំ<input data-k="d:${d}:kz" class="kz" aria-label="ឆ្នាំ និងស័ក"> ពុទ្ធសករាជ <input data-k="d:${d}:be" class="y" aria-label="ពុទ្ធសករាជ"></div>
    <div class="head">ត្រូវនឹងថ្ងៃទី<input data-k="d:${d}:gr" class="s" aria-label="ថ្ងៃទីគ្រិស្ត"> ខែ<input data-k="d:${d}:gm" class="m" aria-label="ខែគ្រិស្ត"> ឆ្នាំ<input data-k="d:${d}:gy" class="y" aria-label="ឆ្នាំគ្រិស្ត"></div>`;
    PLAN[s][d].split('').forEach((c,i)=>{
      const k=`${s}:${d}:${i}`;
      h+=`<div class="per"${i===0?' data-first="1"':''}><span class="time">${TIMES[s][i]}</span><div class="main"><div class="top">
      <div class="fld f-subj"><span class="fl ui-only">មុខវិជ្ជា</span><select data-k="${k}:subj" data-def="${c}" aria-label="មុខវិជ្ជា">${Object.entries(SUBJ).map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></div>
      <div class="fld f-les"><span class="fl ui-only">មេរៀន</span><input class="les" data-k="${k}:les" aria-label="មេរៀន" placeholder="មេរៀនទី… ចំណងជើង"></div>
      <div class="fld f-box"><span class="fl ui-only">ទំព័រ ឬ ចំណាំ</span><input class="box" data-k="${k}:box" aria-label="ទំព័រ ឬ ចំណាំ" placeholder="ទំព័រទី…"></div></div>
      <div class="body"><span class="fl ui-only">ខ្លឹមសាររង / សកម្មភាព</span><input class="ln" data-k="${k}:l2" aria-label="ខ្លឹមសាររង / សកម្មភាព" placeholder="វាយនៅទីនេះ"><span class="fl ui-only">កិច្ចការផ្ទះ / បន្ថែម</span><div class="pl"><span>+</span><input data-k="${k}:l3" aria-label="កិច្ចការផ្ទះ / បន្ថែម" placeholder="វាយនៅទីនេះ"></div>
      <div class="hand"><span>ស.គ</span><i></i><span>ស.ស</span><i></i><span>ហ្វីស</span><i></i></div></div></div></div>`;
    });
    h+='</section>';
  }
  document.getElementById('sheets').innerHTML=h;
  document.querySelectorAll('#sheets input[data-k]').forEach(el=>{el.maxLength=MAX_LEN});
  syncInputsFromState();
}

function syncInputsFromState(){
  document.querySelectorAll('[data-k]').forEach(el=>{
    const k=el.dataset.k;
    el.value=has(S,k)?S[k]:(el.dataset.def||'');
  });
  monInput.value=S['meta:mon']||'';
  peFix();
}

function onFieldInput(e){
  const el=e.target;
  if(!el.matches||!el.matches('[data-k]'))return;
  const k=el.dataset.k;
  if(has(S,k)&&S[k]===el.value)return; // 'input' + 'change' both fire on selects
  S[k]=el.value;
  document.querySelectorAll(`[data-k="${CSS.escape(k)}"]`).forEach(o=>{if(o!==el)o.value=el.value});
  if(el.tagName==='SELECT')peFix();
  save();
}

function peFix(){
  document.querySelectorAll('.per').forEach(p=>{
    p.classList.toggle('pe',p.querySelector('select').value==='p'&&!p.dataset.first);
  });
}

/* =====================================================================
   6. BILINGUAL UI & NAVIGATION
   ===================================================================== */
const TEXT_BINDINGS=[
  ['langBtn','langBtn'],['savedBadge','saved'],['guideTitle','guideTitle'],['guideOk','guideOk'],
  ['pdfOne','pdfOne'],['p1','p1'],['monLbl','monLbl'],['todayWeekBtn','todayWeekBtn'],['monNote','monNote'],
  ['moreSum','moreSum'],['secCopy','secCopy'],['pdfAll','pdfAll'],['pa','pa'],['secHelp','secHelp'],
  ['fminus','fminus'],['fplus','fplus'],['guideShow','guideShow'],['secFile','secFile'],
  ['backupBtn','backupBtn'],['importBtn','importBtn'],['secDanger','secDanger'],['cl','cl'],
  ['prev','prev'],['next','next'],['undoBtn','undoBtn'],['closeMsgBtn','closeBtn'],
  ['weekLbl','weekLbl'],['wkDel','wkDel'],['tplSave','tplSave'],['tplApply','tplApply'],['tplClear','tplClear'],
  ['wkPrev','wkPrevLbl'],['wkNext','wkNextLbl'],['tplNote','tplNote'],['legend','legend']
];
function applyLanguageUI(){
  const t=L();
  for(const [id,key] of TEXT_BINDINGS){const el=document.getElementById(id);if(el)el.textContent=t[key]}
  document.getElementById('guideList').innerHTML=t.guideItems.map(x=>`<li>${x}</li>`).join('');
  tabs();
  show({scroll:false}); // switching language must not jump the page to the top
  renderPlannerBar();
  updateToggleLabels();
}

document.getElementById('langBtn').onclick=()=>{
  lang=lang==='km'?'en':'km';
  safeSet(LK,lang);
  applyLanguageUI();
setDockH();
};

function tabs(){
  const t=L();
  const withTime=s=>esc(s).replace(/ \((.+)\)$/,' <span class="sess-time">($1)</span>');
  document.getElementById('sess').innerHTML=`<button data-s="m">${withTime(t.sessM)}</button><button data-s="a">${withTime(t.sessA)}</button>`;
  document.getElementById('days').innerHTML=DAYS.map((d,i)=>`<button data-i="${i}">${lang==='en'?d[2]:d[1]}<span class="tick" aria-hidden="true">✓</span></button>`).join('');
}
// Registered once: only the buttons' innerHTML is rebuilt, the containers persist.
document.getElementById('sess').onclick=e=>{const b=e.target.closest('button');if(b){ses=b.dataset.s;show()}};
document.getElementById('days').onclick=e=>{const b=e.target.closest('button');if(b){di=+b.dataset.i;show()}};

function show({scroll=true}={}){
  document.querySelectorAll('.sheet').forEach(x=>x.classList.remove('on'));
  document.getElementById(`sh-${ses}-${DAYS[di][0]}`).classList.add('on');
  document.querySelectorAll('#sess button').forEach(b=>{const on=b.dataset.s===ses;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
  document.querySelectorAll('#days button').forEach(b=>{const on=+b.dataset.i===di;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
  document.getElementById('copyShift').textContent=ses==='m'?L().copyMtoA:L().copyAtoM;
  document.getElementById('where').textContent=L().where(DAYS[di],ses);
  markDone();
  markHolidays();
  if(scroll)window.scrollTo({top:0,behavior:'auto'});
}

function markDone(){
  document.querySelectorAll('#days button').forEach(b=>{
    const d=DAYS[+b.dataset.i][0];
    let any=false;
    for(let j=0;j<5;j++){if((S[`${ses}:${d}:${j}:les`]||'').trim()){any=true;break}}
    b.classList.toggle('done',any);
  });
}

function step(n){
  let x=(ses==='a'?5:0)+di+n;
  x=Math.max(0,Math.min(9,x));
  ses=x>=5?'a':'m';di=x%5;show();
}
document.getElementById('prev').onclick=()=>step(-1);
document.getElementById('next').onclick=()=>step(1);

/* Delegated field events (one listener instead of one per input).
   Sideways swipe to change day was removed: it switched pages by accident while scrolling. */
const sheetsEl=document.getElementById('sheets');
sheetsEl.addEventListener('input',onFieldInput);
sheetsEl.addEventListener('change',onFieldInput);

/* Keep the floating message just above the bottom bar, whatever its height */
const dockEl=document.getElementById('dock');
function setDockH(){document.documentElement.style.setProperty('--dock-h',dockEl.offsetHeight+'px')}
if(window.ResizeObserver)new ResizeObserver(setDockH).observe(dockEl);
window.addEventListener('resize',setDockH);

/* =====================================================================
   7. FONT SIZE, THEME (LIGHT/DARK) & KHMER DATE TOGGLE
   ===================================================================== */
let fontSize=Math.min(28,Math.max(16,parseInt(safeGet(FK,'20'),10)||20));
function applyFont(){
  document.documentElement.style.setProperty('--fs',fontSize+'px');
  safeSet(FK,fontSize);
}
document.getElementById('fminus').onclick=()=>{fontSize=Math.max(16,fontSize-2);applyFont()};
document.getElementById('fplus').onclick=()=>{fontSize=Math.min(28,fontSize+2);applyFont()};
applyFont();

let theme=safeGet(THK,'light')==='dark'?'dark':'light';
let autoFillDate=safeGet(KDK,'1')!=='0';
const DATE_FIELD_RE=/^d:[a-z]{3}:(kh|km|kz|be|gr|gm|gy)$/;
function updateToggleLabels(){
  const t=L();
  const tb=document.getElementById('themeBtn');
  if(tb){
    tb.textContent=theme==='dark'?t.themeLight:t.themeDark;
    tb.setAttribute('aria-pressed',theme==='dark');
  }
  const kb=document.getElementById('khDateBtn');
  if(kb){
    kb.textContent=autoFillDate?t.khDateOn:t.khDateOff;
    kb.classList.toggle('on',autoFillDate);
    kb.setAttribute('aria-pressed',autoFillDate);
  }
}
function applyTheme(){
  if(theme==='dark')document.documentElement.dataset.theme='dark';
  else delete document.documentElement.dataset.theme;
  safeSet(THK,theme);
  updateToggleLabels();
}
function clearWeekDates(){
  Object.keys(S).forEach(k=>{if(DATE_FIELD_RE.test(k))delete S[k]});
}
function toggleAutoFillDate(){
  autoFillDate=!autoFillDate;
  safeSet(KDK,autoFillDate?'1':'0');
  if(autoFillDate){
    fillWeekFromMonday(parseISO(S['meta:mon'])||upcomingMonday());
  }else{
    clearWeekDates();
  }
  syncInputsFromState();
  save();
  updateToggleLabels();
}
document.getElementById('themeBtn').onclick=()=>{theme=theme==='dark'?'light':'dark';applyTheme()};
document.getElementById('khDateBtn').onclick=toggleAutoFillDate;
applyTheme();
updateToggleLabels();

/* =====================================================================
   8. AUTOMATIC KHMER LUNAR + GREGORIAN DATE FILLING
   ===================================================================== */
const monInput=document.getElementById('monDate');
const isoDate=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');

const nextFrame=()=>new Promise(r=>{
  let fired=false;const go=()=>{if(!fired){fired=true;r()}};
  requestAnimationFrame(()=>requestAnimationFrame(go));
  setTimeout(go,250); // rAF never fires in hidden tabs
});
// Sunday -> following Monday; Mon-Sat -> Monday of the same week
function mondayOf(d){
  const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  const w=x.getDay();
  x.setDate(x.getDate()+(w===0?1:1-w));
  return x;
}
const upcomingMonday=()=>mondayOf(new Date());

function fillWeekFromMonday(base){
  if(autoFillDate){
    DAYS.forEach(([d])=>{
      const dt=new Date(base);
      dt.setDate(base.getDate()+(DAY_OFFSET[d]||0));
      const kh=Chhankitek(dt);
      S[`d:${d}:kh`]=kh.khDay;
      S[`d:${d}:km`]=kh.khMonth;
      S[`d:${d}:kz`]=kh.khZodiac;
      S[`d:${d}:be`]=kh.beYear;
      S[`d:${d}:gr`]=kh.grDay;
      S[`d:${d}:gm`]=kh.grMonth;
      S[`d:${d}:gy`]=kh.grYear;
    });
  }else{
    clearWeekDates();
  }
  S['meta:mon']=isoDate(base);
  monInput.value=S['meta:mon'];
}

monInput.onchange=()=>{
  const picked=parseISO(monInput.value);
  if(!picked){monInput.value=S['meta:mon']||'';return}
  openWeek(mondayOf(picked)); // any picked date snaps to that week's Monday
};
document.getElementById('todayWeekBtn').onclick=()=>openWeek(upcomingMonday());

/* =====================================================================
   9. A4 PDF EXPORT (SINGLE PAGE OR ALL 10 PAGES)
   ===================================================================== */
async function downloadAsPDF(allPages){
  if(!window.html2canvas||!window.jspdf){
    showNotice(L().pdfErr,true);
    return;
  }
  const btns=['pdfOne','pdfAll'].map(id=>document.getElementById(id));
  btns.forEach(b=>{if(b)b.disabled=true});
  const stage=document.getElementById('pdfStage');
  stage.innerHTML='';
  stage.classList.add('capturing');

  try{
    if(document.fonts&&document.fonts.ready)await document.fonts.ready;
    const targets=allPages
      ?Array.from(document.querySelectorAll('.sheet'))
      :[document.getElementById(`sh-${ses}-${DAYS[di][0]}`)];

    const {jsPDF}=window.jspdf;
    const pdf=new jsPDF({orientation:'p',unit:'mm',format:'a4',compress:true});
    const pageW=pdf.internal.pageSize.getWidth();
    const pageH=pdf.internal.pageSize.getHeight();

    for(let idx=0;idx<targets.length;idx++){
      showNotice(L().pdfProg(idx+1,targets.length),true);
      const clone=targets[idx].cloneNode(true);
      clone.className='sheet on pdf-page';
      clone.removeAttribute('id');

      // Replace inputs/selects with static text divs for crisp Khmer rendering
      const origEls=targets[idx].querySelectorAll('[data-k]');
      const cloneEls=clone.querySelectorAll('[data-k]');
      origEls.forEach((o,i)=>{
        const c=cloneEls[i];
        if(o.tagName==='SELECT'){
          const box=document.createElement('div');
          box.className='selbox';
          box.textContent=o.options[o.selectedIndex]?o.options[o.selectedIndex].text:'';
          c.replaceWith(box);
        }else{
          const div=document.createElement('div');
          div.className=c.className;
          div.textContent=o.value||'\u00A0';
          c.replaceWith(div);
        }
      });

      // Remove screen-only helper labels so PDF matches the clean paper form
      clone.querySelectorAll('.ui-only').forEach(n=>n.remove());
      clone.querySelectorAll('.fld').forEach(f=>{
        while(f.firstChild)f.parentNode.insertBefore(f.firstChild,f);
        f.remove();
      });

      stage.appendChild(clone);
      await nextFrame();
      if(document.fonts&&document.fonts.ready)await document.fonts.ready;

      const w=794;
      const h=Math.max(clone.offsetHeight,1122);
      const canvas=await html2canvas(clone,{
        scale:2,
        useCORS:true,
        backgroundColor:'#ffffff',
        scrollX:0,
        scrollY:0,
        x:0,
        y:0,
        width:w,
        height:h,
        windowWidth:w,
        windowHeight:h
      });
      stage.innerHTML='';

      if(!canvas.width||!canvas.height)throw new Error('Empty canvas');
      const imgData=canvas.toDataURL('image/jpeg',0.95);

      let drawW=pageW;
      let drawH=(canvas.height*pageW)/canvas.width;
      if(drawH>pageH){
        const k=pageH/drawH;
        drawW=pageW*k;
        drawH=pageH;
      }
      const offX=(pageW-drawW)/2;

      if(idx>0)pdf.addPage();
      pdf.addImage(imgData,'JPEG',offX,0,drawW,drawH);
    }

    const today=isoDate(new Date());
    const sesLabel=ses==='m'?'ពេលព្រឹក':'ពេលរសៀល';
    const dayLabel=DAYS[di][1];
    const filename=allPages
      ?`ផែនការមេរៀន_ទាំងអស់_${today}.pdf`
      :`ផែនការមេរៀន_${sesLabel}_ថ្ងៃ${dayLabel}_${today}.pdf`;

    pdf.save(filename);
    showNotice(L().pdfDone(filename),true);
  }catch(e){
    console.error(e);
    showNotice(L().pdfErr,true);
  }finally{
    stage.classList.remove('capturing');
    stage.innerHTML='';
    btns.forEach(b=>{if(b)b.disabled=false});
  }
}

document.getElementById('pdfOne').onclick=()=>downloadAsPDF(false);
document.getElementById('pdfAll').onclick=()=>downloadAsPDF(true);

/* =====================================================================
   10. PRINTING
   ===================================================================== */
function doPrint(mode){
  document.body.classList.remove('one','all');
  document.body.classList.add(mode);
  try{window.print()}catch(e){}
}
window.addEventListener('afterprint',()=>document.body.classList.remove('one','all'));
document.getElementById('p1').onclick=()=>doPrint('one');
document.getElementById('pa').onclick=()=>doPrint('all');

/* =====================================================================
   11. UNDO & NOTIFICATION BANNER (1-Minute Undo Window)
   ===================================================================== */
let undoSnapshot=null,undoTimer=null,undoUntil=0;
/* An info message (e.g. "PDF downloaded") must not hide a still-valid Undo:
   the Undo button stays visible until its 1-minute window ends. */
function showNotice(msg,infoOnly=false){
  const bar=document.getElementById('undoBar');
  const uBtn=document.getElementById('undoBtn');
  const cBtn=document.getElementById('closeMsgBtn');
  const left=undoSnapshot?undoUntil-Date.now():0;
  const canUndo=left>0;
  document.getElementById('undoMsg').textContent=msg;
  bar.classList.toggle('info',infoOnly);
  uBtn.style.display=canUndo?'inline-flex':'none';
  cBtn.style.display=infoOnly?'inline-flex':'none';
  bar.classList.add('show');
  clearTimeout(undoTimer);
  undoTimer=setTimeout(()=>{
    bar.classList.remove('show');
    if(Date.now()>=undoUntil)undoSnapshot=null;
  },canUndo?Math.max(left,infoOnly?10000:0):10000);
}
function showUndo(msg){
  undoSnapshot=JSON.stringify(S);
  undoUntil=Date.now()+60000;
  showNotice(msg,false);
}
function dropUndo(){
  undoSnapshot=null;undoUntil=0;
  const bar=document.getElementById('undoBar');
  document.getElementById('undoBtn').style.display='none';
  if(!bar.classList.contains('info'))bar.classList.remove('show');
}
document.getElementById('closeMsgBtn').onclick=()=>document.getElementById('undoBar').classList.remove('show');
document.getElementById('undoBtn').onclick=()=>{
  if(!undoSnapshot)return;
  S=sanitizeState(JSON.parse(undoSnapshot));
  save();
  syncInputsFromState();
  document.getElementById('undoBar').classList.remove('show');
  undoSnapshot=null;undoUntil=0;
};

/* =====================================================================
   12. NEW WEEK, CLEAR ALL, COPY SHIFT & BACKUP/RESTORE
   ===================================================================== */
document.getElementById('cl').onclick=async()=>{
  if(!await askModal(L().askClear,true))return;
  showUndo(L().wipedAll);
  Object.keys(S).forEach(k=>{if(/:(les|box|l2|l3|sk|ss|fis)$/.test(k))delete S[k]});
  save();
  syncInputsFromState();
};

document.getElementById('copyShift').onclick=async()=>{
  const d=DAYS[di][0];
  const from=ses,to=ses==='m'?'a':'m';
  const nm=x=>lang==='en'?(x==='m'?'Morning':'Afternoon'):(x==='m'?'ព្រឹក':'រសៀល');
  if(!await askModal(L().askCopy(nm(from),nm(to))))return;
  showUndo(L().copiedDay(DAYS[di]));
  for(let i=0;i<5;i++){
    ['subj','les','box','l2','l3','sk','ss','fis'].forEach(f=>{
      const sk=`${from}:${d}:${i}:${f}`,tk=`${to}:${d}:${i}:${f}`;
      if(has(S,sk))S[tk]=S[sk];
      else if(f==='subj')S[tk]=PLAN[from][d][i];
      else delete S[tk];
    });
  }
  save();
  ses=to;
  syncInputsFromState();
  show();
};

document.getElementById('backupBtn').onclick=()=>{
  dirty=true;persist();
  const weeks={};
  for(const iso of listWeeks()){const w=readWeek(iso);if(w)weeks[iso]=w}
  const cur=S['meta:mon'];
  if(parseISO(cur))weeks[cur]={...S}; // include the open week even if not stored yet
  const payload=Object.keys(weeks).length
    ?{format:'khmer-lesson-plan-v3',exported:new Date().toISOString(),weeks,template:template?{...template}:null}
    :{...S}; // old single-week shape, when the open week has no valid date
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const today=isoDate(new Date());
  const fname=`ផែនការមេរៀន_ច្បាប់ចម្លង_${today}.json`;
  a.href=url;a.download=fname;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  showNotice(L().backupDone(fname),true);
};

/* Accepts the new multi-week format and the old single-week file. */
function parseBackup(data){
  if(data&&typeof data==='object'&&data.format==='khmer-lesson-plan-v3'
     &&data.weeks&&typeof data.weeks==='object'&&!Array.isArray(data.weeks)){
    const weeks={};
    for(const [iso,raw] of Object.entries(data.weeks)){
      if(!parseISO(iso))continue;
      const s=sanitizeState(raw);
      s['meta:mon']=iso;
      weeks[iso]=s;
    }
    const t=data.template?pickLesson(sanitizeState(data.template)):null;
    return {weeks,template:t&&Object.keys(t).length?t:null,legacy:null};
  }
  const flat=sanitizeState(data);
  return {weeks:{},template:null,legacy:Object.keys(flat).length?flat:null};
}

const importFile=document.getElementById('importFile');
document.getElementById('importBtn').onclick=()=>importFile.click();
importFile.onchange=async()=>{
  const f=importFile.files[0];if(!f)return;
  try{
    if(f.size>5e6)throw new Error('too large');
    const bk=parseBackup(JSON.parse(await f.text()));
    const isos=Object.keys(bk.weeks).sort();
    if(!isos.length&&!bk.legacy){showNotice(L().importErr,true)}
    else if(await askModal(L().askImport)){
      if(bk.legacy&&parseISO(bk.legacy['meta:mon'])){ // old file that knows its week -> treat as a week
        bk.weeks[bk.legacy['meta:mon']]=bk.legacy;isos.push(bk.legacy['meta:mon']);bk.legacy=null;
      }
      if(bk.legacy){ // old file without a date: replaces the open week (undoable)
        showUndo(L().importDone);
        const keepMon=parseISO(S['meta:mon']);
        S=bk.legacy;
        if(keepMon)fillWeekFromMonday(keepMon); // stay on the open week (keeps its date and history entry)
        save();syncInputsFromState();show({scroll:false});renderPlannerBar();
      }else{
        dirty=true;persist(); // keep the week that is open now
        let ok=true;
        for(const iso of isos)ok=safeSet(WP+iso,JSON.stringify(bk.weeks[iso]))&&ok;
        if(bk.template){template=bk.template;ok=safeSet(TK,JSON.stringify(template))&&ok}
        if(!ok)showNotice(L().storageErr,true);
        else showNotice(L().importMulti(isos.length),true);
        S['meta:mon']='';weekTouched=false;dirty=false; // never write the old open week over imported data
        openWeek(parseISO(isos[isos.length-1]));
      }
    }
  }catch(e){showNotice(L().importErr,true)}
  importFile.value='';
};

/* =====================================================================
   12b. HOLIDAYS, WEEK HISTORY, WEEKLY TEMPLATE & PLANNER BAR
   ===================================================================== */
const HOL_ICON='<span class="hol-ico" role="img" aria-label="Cambodia"></span>';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const EN_MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const kd=(n,p)=>toKhNum(n)+(p==='k'?'កើត':'រោច');

/* Indicative public holidays [Khmer, English]. Always confirm against the Ministry's
   yearly calendar; add or correct days for a given year in EXTRA_HOLIDAYS below. */
const FIXED_HOLIDAYS={
  '01-01':['ទិវាចូលឆ្នាំសកល','International New Year'],
  '01-07':['ទិវាជ័យជម្នះលើរបបប្រល័យពូជសាសន៍','Victory over Genocide Day'],
  '03-08':['ទិវាអន្តរជាតិនារី','International Women\'s Day'],
  '05-01':['ទិវាពលកម្មអន្តរជាតិ','International Labor Day'],
  '05-14':['ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម ព្រះមហាក្សត្រ','King\'s Birthday'],
  '06-18':['ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម ព្រះមហាក្សត្រី','Queen Mother\'s Birthday'],
  '09-24':['ទិវារដ្ឋធម្មនុញ្ញ','Constitution Day'],
  '10-15':['ទិវាគោរពព្រះវិញ្ញាណក្ខន្ធ ព្រះបរមរតនកោដ្ឋ','King Father\'s Commemoration Day'],
  '10-29':['ព្រះរាជពិធីគ្រងរាជសម្បត្តិ','Coronation Day'],
  '11-09':['ទិវាបុណ្យឯករាជ្យជាតិ','Independence Day'],
  '12-29':['ទិវាសន្តិភាព','Peace Day']
};
const NEW_YEAR=['ពិធីបុណ្យចូលឆ្នាំខ្មែរ','Khmer New Year']; // Apr 14-16; shifts by a day in some years
const PCHUM=['បុណ្យភ្ជុំបិណ្ឌ','Pchum Ben'];
const WATER=['បុណ្យអុំទូក បណ្តែតប្រទីប សំពះព្រះខែ អកអំបុក','Water Festival (Bon Om Touk)'];
// [lunar day, lunar month, names] - matched against the Chhankitek engine
const LUNAR_HOLIDAYS=[
  [kd(15,'k'),'ពិសាខ',['ទិវាវិសាខបូជា','Visak Bochea Day']],
  [kd(4,'r'),'ពិសាខ',['ព្រះរាជពិធីច្រត់ព្រះនង្គ័ល','Royal Ploughing Ceremony']],
  [kd(14,'r'),'ភទ្របទ',PCHUM],[kd(15,'r'),'ភទ្របទ',PCHUM],[kd(1,'k'),'អស្សុជ',PCHUM],
  [kd(14,'k'),'កត្តិក',WATER],[kd(15,'k'),'កត្តិក',WATER],[kd(1,'r'),'កត្តិក',WATER]
];
// Your own additions/corrections, e.g. '2027-01-04':['ថ្ងៃឈប់សម្រាកសាលា','School day off']
const EXTRA_HOLIDAYS={};

function holidaysOn(date){
  const out=[];
  const mm=String(date.getMonth()+1).padStart(2,'0'),dd=String(date.getDate()).padStart(2,'0');
  if(FIXED_HOLIDAYS[`${mm}-${dd}`])out.push(FIXED_HOLIDAYS[`${mm}-${dd}`]);
  if(mm==='04'&&dd>='14'&&dd<='16')out.push(NEW_YEAR);
  const k=Chhankitek(date);
  for(const [day,month,names] of LUNAR_HOLIDAYS)if(k.khDay===day&&k.khMonth===month)out.push(names);
  if(EXTRA_HOLIDAYS[isoDate(date)])out.push(EXTRA_HOLIDAYS[isoDate(date)]);
  return out;
}
const hname=h=>lang==='en'?h[1]:h[0];
function weekHolidays(){
  const base=parseISO(S['meta:mon']);
  return DAYS.map(([d])=>{
    if(!base)return [];
    const dt=new Date(base);
    dt.setDate(base.getDate()+(DAY_OFFSET[d]||0));
    return holidaysOn(dt);
  });
}
function holidaySummary(){
  const wk=weekHolidays();
  const dayName=i=>lang==='en'?DAYS[i][2]:DAYS[i][1];
  const sig=hs=>hs.map(hname).join(' · ');
  const parts=[];
  for(let i=0;i<wk.length;i++){
    if(!wk[i].length)continue;
    let j=i; // merge consecutive days with the same holiday: "Mon–Wed: Water Festival"
    while(j+1<wk.length&&wk[j+1].length&&sig(wk[j+1])===sig(wk[i]))j++;
    parts.push(`${i===j?dayName(i):dayName(i)+'–'+dayName(j)}: ${sig(wk[i])}`);
    i=j;
  }
  return parts.length?`🎌 ${parts.join(' | ')}`:'';
}
function markHolidays(){
  const wk=weekHolidays();
  document.querySelectorAll('#days button').forEach(b=>{
    const hs=wk[+b.dataset.i]||[];
    b.classList.toggle('hol',hs.length>0);
    if(hs.length)b.title=hs.map(hname).join(' · ');else b.removeAttribute('title');
  });
  DAYS.forEach(([d],i)=>{
    const hs=wk[i];
    document.querySelectorAll(`.holflag[data-day="${d}"]`).forEach(el=>{
      el.hidden=!hs.length;
      el.textContent=hs.length?`🎌 ${L().holiday}: ${hs.map(hname).join(' · ')}`:'';
    });
  });
}

/* ---- weeks ---- */
function weekLabel(iso){
  const d=parseISO(iso);
  if(!d)return iso;
  const en=lang==='en';
  const label=L().weekOf(en?d.getDate():toKhNum(d.getDate()),en?EN_MON[d.getMonth()]:KH_MONTHS[d.getMonth()],en?d.getFullYear():toKhNum(d.getFullYear()));
  return iso===isoDate(upcomingMonday())?label+' ★':label;
}
/* New week = saved template if there is one, otherwise the lessons of the week you came from.
   Returns where the lessons came from ('tpl' | 'last' | '') so the teacher can be told. */
function newWeekState(base,carry){
  const last=carry?pickLesson(S):null;
  const kind=template?'tpl':(last&&Object.keys(last).length?'last':'');
  S=Object.create(null);
  if(kind==='tpl')Object.assign(S,template);
  else if(kind==='last')Object.assign(S,last);
  fillWeekFromMonday(base);
  return kind;
}
function openWeek(base,{carry=true}={}){
  const iso=isoDate(base);
  if(iso===S['meta:mon']){monInput.value=iso;renderPlannerBar();return}
  dirty=true;persist();        // save the week we are leaving
  dropUndo();                  // an undo for the old week must not apply to the new one
  const stored=readWeek(iso);
  const created=!stored;
  let kind='';
  if(stored){S=stored;weekTouched=true}
  else{kind=newWeekState(base,carry);weekTouched=false}
  dirty=true;persist();        // move the open-week pointer (week itself is stored only once edited)
  syncInputsFromState();
  show({scroll:false});
  renderPlannerBar();
  if(created){
    const from=kind==='tpl'?L().fromTpl:kind==='last'?L().fromLast:'';
    showNotice(L().weekNew(weekLabel(iso),holidaySummary(),from),true);
  }
}

function renderPlannerBar(){
  const sel=document.getElementById('weekSel');
  if(!sel)return;
  const t=L(),cur=S['meta:mon'];
  const set=new Set(listWeeks());
  if(parseISO(cur))set.add(cur);
  const isos=[...set].sort().reverse();
  sel.innerHTML=isos.map(i=>`<option value="${i}">${weekLabel(i)}</option>`).join('');
  if(parseISO(cur))sel.value=cur;
  document.getElementById('wkDel').disabled=!(parseISO(cur)&&hasWeek(cur));
  document.getElementById('tplApply').disabled=!template;
  document.getElementById('tplClear').disabled=!template;
  document.getElementById('holSummary').textContent=holidaySummary();
}

/* The card itself is markup in index.html (#plannerBar); this only wires it up. */
function buildPlannerBar(){
  if(!document.getElementById('plannerBar'))return;
  const $=id=>document.getElementById(id);
  const shift=n=>{const b=parseISO(S['meta:mon'])||upcomingMonday();b.setDate(b.getDate()+n);openWeek(b)};
  $('wkPrev').onclick=()=>shift(-7);
  $('wkNext').onclick=()=>shift(7);
  $('weekSel').onchange=e=>{const d=parseISO(e.target.value);if(d)openWeek(d)};

  $('wkDel').onclick=async()=>{
    const iso=S['meta:mon'];
    if(!hasWeek(iso))return;
    if(!await askModal(L().askDelWeek(weekLabel(iso)),true))return;
    removeWeek(iso);
    weekTouched=false;S['meta:mon']='';        // do not re-save the deleted week while leaving it
    const rest=listWeeks();
    openWeek(rest.length?parseISO(rest[rest.length-1]):upcomingMonday(),{carry:false});
    showNotice(L().weekDeleted,true);
  };

  $('tplSave').onclick=()=>{
    const t=pickLesson(S);
    if(!Object.keys(t).length){showNotice(L().tplEmpty,true);return}
    template=t;
    showNotice(safeSet(TK,JSON.stringify(t))?L().tplSaved:L().storageErr,true);
    renderPlannerBar();
  };
  $('tplApply').onclick=async()=>{
    if(!template){showNotice(L().noTpl,true);return}
    if(!await askModal(L().askApplyTpl))return;
    showUndo(L().tplApplied);
    for(const k of Object.keys(S))if(LESSON_RE.test(k))delete S[k];
    Object.assign(S,template);
    save();syncInputsFromState();show({scroll:false});
  };
  $('tplClear').onclick=async()=>{
    if(!template){showNotice(L().noTpl,true);return}
    if(!await askModal(L().askClearTpl,true))return;
    template=null;
    try{localStorage.removeItem(TK)}catch(e){}
    showNotice(L().tplCleared,true);
    renderPlannerBar();
  };
}

/* =====================================================================
   13. FIRST-TIME GUIDE & INITIALIZATION
   ===================================================================== */
const guideBox=document.getElementById('guide');
guideBox.style.display=safeGet(GK,'')==='1'?'none':'block';
document.getElementById('guideOk').onclick=()=>{
  guideBox.style.display='none';
  safeSet(GK,'1');
};
document.getElementById('guideShow').onclick=()=>{
  guideBox.style.display='block';
  window.scrollTo({top:0,behavior:'auto'});
};

/* Initialize App */
build();
buildPlannerBar();
// Decide from the saved week date, not the editable date boxes: erasing Monday's date
// by hand must not move the lessons to another week on the next reload.
if(!parseISO(S['meta:mon'])){
  fillWeekFromMonday(upcomingMonday());
  weekTouched=Object.keys(S).some(k=>LESSON_RE.test(k));
  save(false);
  syncInputsFromState();
}else if(S['meta:mon']){
  monInput.value=S['meta:mon'];
}
applyLanguageUI();
setDockH();
window.addEventListener('pagehide',flush);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()});
dirty=true;persist(); // migrates the open week from the old single-week storage into week history