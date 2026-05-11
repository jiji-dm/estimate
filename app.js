// ══════════════════════════════════════
// 定数・状態
// ══════════════════════════════════════
const TOTAL = 17;
const DEVICE_DEFS = [
  { key: 'IPカメラ',     icon: '📷' },
  { key: 'ステレオカメラ', icon: '📸' },
  { key: 'サイネージ',   icon: '🖥️' },
  { key: 'Lidar',       icon: '📡' },
  { key: 'AirKnock',    icon: '💨' },
];

let step = 1, d = {}, kosoMode = null, tokuMode = null, currentReport = null, modalReport = null;
d.systemCount  = 1;
d.cameraCounts = {};
d.armData      = {};
d.dateData = { single:{mode:'confirm'}, install:{mode:'confirm'}, remove:{mode:'confirm'} };

// ══════════════════════════════════════
// カレンダー（複数インスタンス対応）
// ══════════════════════════════════════
const today = new Date();
const WEEKDAYS = ['日','月','火','水','木','金','土'];
const MONTHS_JA = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

const calStateMap = {};
function initCalState(id) {
  if (!calStateMap[id]) calStateMap[id] = { year:today.getFullYear(), month:today.getMonth(), sel:null };
}
function buildCalById(id) {
  initCalState(id);
  const s = calStateMap[id];
  const containerId = 'calContainer_'+id;
  const el = document.getElementById(containerId);
  if (!el) return;
  const first = new Date(s.year, s.month, 1).getDay();
  const days  = new Date(s.year, s.month+1, 0).getDate();
  const selTxt = s.sel ? s.sel.y+'年 '+(s.sel.m+1)+'月 '+s.sel.d+'日' : '未選択';
  const selSub = s.sel ? '（'+WEEKDAYS[new Date(s.sel.y,s.sel.m,s.sel.d).getDay()]+'曜日）' : '';
  let grid = WEEKDAYS.map((w,i)=>`<div class="cal-head${i===0?' sun':i===6?' sat':''}">${w}</div>`).join('');
  grid += Array(first).fill('<div class="cal-day empty"></div>').join('');
  for (let dd=1;dd<=days;dd++) {
    const dow=(first+dd-1)%7;
    const isSel=s.sel&&s.sel.y===s.year&&s.sel.m===s.month&&s.sel.d===dd;
    const isToday=s.year===today.getFullYear()&&s.month===today.getMonth()&&dd===today.getDate();
    const cls=['cal-day',dow===0?'sun':dow===6?'sat':'',isSel?'selected-day':'',isToday&&!isSel?'today':''].filter(Boolean).join(' ');
    grid+=`<div class="${cls}" onclick="selectCalDayById('${id}',${dd})">${dd}</div>`;
  }
  el.innerHTML=`
    <div class="date-picker-wrap-sm">
      <div class="date-nav-row">
        <button class="date-nav-btn" onclick="calMoveById('${id}',-1)">‹</button>
        <div class="date-month-label" style="cursor:default">${s.year}年 ${MONTHS_JA[s.month]}</div>
        <button class="date-nav-btn" onclick="calMoveById('${id}',1)">›</button>
      </div>
      <div class="cal-grid">${grid}</div>
      <div class="date-display-row">
        <div>
          <div class="date-display-val">${selTxt}</div>
          <div class="date-display-sub">${selSub}</div>
        </div>
      </div>
    </div>`;
  if (s.sel) {
    const key = id;
    if (d.dateData[key]) d.dateData[key].date = s.sel;
  }
}
function calMoveById(id, delta) {
  initCalState(id); const s=calStateMap[id];
  s.month+=delta; if(s.month<0){s.month=11;s.year--;} if(s.month>11){s.month=0;s.year++;}
  buildCalById(id);
}
function selectCalDayById(id, day) {
  initCalState(id); const s=calStateMap[id];
  s.sel={y:s.year,m:s.month,d:day};
  if (d.dateData[id]) d.dateData[id].date = s.sel;
  buildCalById(id);
}

// ══════════════════════════════════════
// 電源供給グループ（Step9）
// ══════════════════════════════════════
let powerGroups = [];
let powerGid = 0;

function initPowerStep() {
  const sysTotal = d.systemCount || 1;
  document.getElementById('powerSysTotalLabel').textContent = sysTotal;
  document.getElementById('powerTotalNum').textContent = sysTotal;
  if (powerGroups.length === 0) addPowerGroup();
  renderPowerGroups();
}

function addPowerGroup() {
  const sysTotal = d.systemCount || 1;
  const assigned = powerGroups.reduce((s,g) => s+g.count, 0);
  const remain = Math.max(1, sysTotal - assigned);
  powerGroups.push({
    id: ++powerGid,
    groupName: '',
    count: Math.min(remain, remain),
    power: null,
    distMode: '1m以内', distVal: 1,
    newType: null,
    newDistMode: '10m以下', newDistVal: 10,
    pipe: null, pipeType: null,
    open: true,
  });
  renderPowerGroups();
}

function renderPowerGroups() {
  var sysTotal = d.systemCount || 1;
  var assigned = powerGroups.reduce(function(s,g){return s+g.count;}, 0);
  document.getElementById('powerAssignedNum').textContent = assigned;
  var badge = document.getElementById('powerStatusBadge');
  // ★ 修正箇所: 'next9step' を参照するよう変更
  var nextBtn = document.getElementById('next9step');
  var allDone = assigned === sysTotal && powerGroups.every(function(g){return isPowerGroupComplete(g);});
  if (allDone) {
    badge.className = 'arm-status-badge ok'; badge.textContent = '✓ 完了';
    if (nextBtn) nextBtn.disabled = false;
  } else {
    badge.className = 'arm-status-badge warn';
    badge.textContent = assigned < sysTotal ? '残り '+(sysTotal-assigned)+' 台' : '未入力あり';
    if (nextBtn) nextBtn.disabled = true;
  }
  var listEl = document.getElementById('powerGroupList');
  listEl.innerHTML = '';
  powerGroups.forEach(function(g, i) {
    var node = buildPowerGroupDOM(g, i, sysTotal);
    listEl.appendChild(node);
  });
}

function isPowerGroupComplete(g) {
  if (!g.power) return false;
  if (g.power === 'unknown') return true;
  if (g.power === 'yes') {
    if (!g.pipe) return false;
    if (g.pipe === 'yes' && !g.pipeType) return false;
    return true;
  }
  if (g.power === 'no') {
    if (!g.newType) return false;
    if (!g.pipe) return false;
    if (g.pipe === 'yes' && !g.pipeType) return false;
    return true;
  }
  return false;
}

function getPowerGroupSummary(g) {
  if (!g.power) return '未設定';
  if (g.power === 'unknown') return '既設電源：不明';
  if (g.power === 'yes') {
    const dist = g.distMode === '1m以内' ? '1m以内' : g.distVal+'m';
    const pipe = g.pipe === 'yes' ? '配管あり（'+g.pipeType+'）' : g.pipe === 'no' ? '配管なし' : '';
    return '既設あり・'+dist+(pipe?' ・'+pipe:'');
  }
  if (g.power === 'no') {
    const type = g.newType || '';
    const dist = g.newType ? (g.newDistMode === '10m以下' ? '10m以下' : g.newDistVal+'m') : '';
    const pipe = g.pipe === 'yes' ? '配管あり（'+g.pipeType+'）' : g.pipe === 'no' ? '配管なし' : '';
    return '既設なし・'+type+(dist?' '+dist:'')+(pipe?' ・'+pipe:'');
  }
  return '';
}

function buildPowerGroupDOM(g, idx, sysTotal) {
  var complete = isPowerGroupComplete(g);
  var summary  = getPowerGroupSummary(g);
  var assigned = powerGroups.reduce(function(s,x){return s+x.count;}, 0);
  var others   = assigned - g.count;
  var canInc   = others + g.count + 1 <= sysTotal;

  // ヘッダーのタイトル：グループ名があれば優先、なければ「システムN台」
  var displayTitle = (g.groupName && g.groupName.trim()) ? g.groupName.trim() : 'システム ' + g.count + '台';

  var wrap = document.createElement('div');
  wrap.className = 'power-group-card' + (complete ? ' complete' : '');

  var header = document.createElement('div');
  header.className = 'power-group-header';
  header.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;">' +
      '<div class="power-group-num">' + (idx+1) + '</div>' +
      '<div><div class="power-group-title">' + displayTitle + '</div>' +
      '<div class="power-group-summary">' + summary + '</div></div>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px;">' +
      '<div class="power-group-check">' + (complete ? '✓' : '') + '</div>' +
      '<button class="delete-btn" id="pgdel_'+g.id+'">🗑️</button>' +
    '</div>';
  header.addEventListener('click', function(e) {
    if (e.target.id === 'pgdel_'+g.id || e.target.closest('#pgdel_'+g.id)) {
      pgDelete(g.id); return;
    }
    pgToggle(g.id);
  });
  wrap.appendChild(header);

  if (!g.open) return wrap;

  var body = document.createElement('div');
  body.className = 'power-group-body';

  // グループ名入力欄
  var nameRow = document.createElement('div');
  nameRow.style.cssText = 'padding:10px 0 6px;border-bottom:1px solid var(--border);';
  nameRow.innerHTML =
    '<div class="power-count-label" style="margin-bottom:6px;">✏️ グループ名（任意）</div>' +
    '<input type="text" class="text-input" id="pgname_'+g.id+'" value="' + (g.groupName||'').replace(/"/g,'&quot;') + '" placeholder="例）1F駐車場・受付エリア等" style="margin-bottom:0;font-size:13px;padding:9px 12px;">';
  nameRow.querySelector('#pgname_'+g.id).addEventListener('input', function() {
    pgSetGroupName(g.id, this.value);
  });
  body.appendChild(nameRow);

  var countRow = document.createElement('div');
  countRow.className = 'power-count-row';
  countRow.innerHTML =
    '<div class="power-count-label">📦 システム台数</div>' +
    '<div class="camera-count-ctrl">' +
      '<button class="cnt-btn" id="pgm_'+g.id+'"' + (g.count<=1?' disabled':'') + '>−</button>' +
      '<div class="cnt-val" style="font-size:18px;">' + g.count + '</div>' +
      '<button class="cnt-btn" id="pgp_'+g.id+'"' + (!canInc?' disabled':'') + '>＋</button>' +
      '<span style="font-size:11px;color:var(--text-dim);">台</span>' +
    '</div>';
  countRow.querySelector('#pgm_'+g.id).addEventListener('click', function(){ pgChange(g.id,'count',-1); });
  countRow.querySelector('#pgp_'+g.id).addEventListener('click', function(){ pgChange(g.id,'count',1); });
  body.appendChild(countRow);

  var pwrLabel = document.createElement('div');
  pwrLabel.className = 'arm-sub-label';
  pwrLabel.style.cssText = 'margin:12px 0 8px;';
  pwrLabel.textContent = '⚡ 既設電源の有無';
  body.appendChild(pwrLabel);

  var pwrGrid = document.createElement('div');
  pwrGrid.className = 'btn-grid col3';
  pwrGrid.style.marginBottom = '4px';
  [['yes','✅ あり'],['no','❌ なし'],['unknown','❓ 不明']].forEach(function(pair) {
    var btn = document.createElement('button');
    btn.className = 'choice-btn' + (g.power===pair[0]?' selected':'');
    btn.innerHTML = pair[1];
    btn.addEventListener('click', function(){ pgSet(g.id,'power',pair[0]); });
    pwrGrid.appendChild(btn);
  });
  body.appendChild(pwrGrid);

  if (g.power === 'yes') {
    var distLabel = document.createElement('div');
    distLabel.className = 'arm-sub-label'; distLabel.style.cssText='margin:12px 0 8px;';
    distLabel.textContent = '📏 既設電源までの距離';
    body.appendChild(distLabel);
    var distGrid = document.createElement('div');
    distGrid.className = 'btn-grid col2'; distGrid.style.marginBottom='4px';
    [['1m以内','1m以内'],['custom','距離を指定']].forEach(function(pair) {
      var btn = document.createElement('button');
      btn.className = 'choice-btn'+(g.distMode===pair[0]?' selected':'');
      btn.textContent = pair[1];
      btn.addEventListener('click', function(){ pgSet(g.id,'distMode',pair[0]); });
      distGrid.appendChild(btn);
    });
    body.appendChild(distGrid);
    if (g.distMode === 'custom') {
      var dr = document.createElement('div'); dr.className='power-dist-row';
      dr.innerHTML='<span style="font-size:12px;color:var(--text-dim);">距離</span><div class="camera-count-ctrl"><button class="cnt-btn" id="pgdv_m_'+g.id+'"'+(g.distVal<=1?' disabled':'')+'>−</button><div class="cnt-val" style="font-size:18px;">'+g.distVal+'</div><button class="cnt-btn" id="pgdv_p_'+g.id+'">＋</button><span style="font-size:11px;color:var(--text-dim);">m</span></div>';
      dr.querySelector('#pgdv_m_'+g.id).addEventListener('click', function(){ pgChange(g.id,'distVal',-1); });
      dr.querySelector('#pgdv_p_'+g.id).addEventListener('click', function(){ pgChange(g.id,'distVal',1); });
      body.appendChild(dr);
    }
  }

  if (g.power === 'no') {
    var ntLabel = document.createElement('div');
    ntLabel.className='arm-sub-label'; ntLabel.style.cssText='margin:12px 0 8px;';
    ntLabel.textContent='🔌 新設電源の種別';
    body.appendChild(ntLabel);
    var ntGrid = document.createElement('div');
    ntGrid.className='btn-grid col2'; ntGrid.style.marginBottom='4px';
    [['既設延長','🔗 既設延長'],['新規設置','⚡ 新規設置']].forEach(function(pair) {
      var btn = document.createElement('button');
      btn.className='choice-btn'+(g.newType===pair[0]?' selected':'');
      btn.innerHTML=pair[1]+(pair[0]==='新規設置'?'<small class="sub">電力会社必要</small>':'');
      btn.addEventListener('click', function(){ pgSet(g.id,'newType',pair[0]); });
      ntGrid.appendChild(btn);
    });
    body.appendChild(ntGrid);
    if (g.newType) {
      var ndLabel = document.createElement('div');
      ndLabel.className='arm-sub-label'; ndLabel.style.cssText='margin:12px 0 8px;';
      ndLabel.textContent='📏 新設電源までの距離';
      body.appendChild(ndLabel);
      var ndGrid = document.createElement('div');
      ndGrid.className='btn-grid col2'; ndGrid.style.marginBottom='4px';
      [['10m以下','10m以下'],['custom','距離を指定']].forEach(function(pair) {
        var btn = document.createElement('button');
        btn.className='choice-btn'+(g.newDistMode===pair[0]?' selected':'');
        btn.textContent=pair[1];
        btn.addEventListener('click', function(){ pgSet(g.id,'newDistMode',pair[0]); });
        ndGrid.appendChild(btn);
      });
      body.appendChild(ndGrid);
      if (g.newDistMode === 'custom') {
        var ndr = document.createElement('div'); ndr.className='power-dist-row';
        ndr.innerHTML='<span style="font-size:12px;color:var(--text-dim);">距離</span><div class="camera-count-ctrl"><button class="cnt-btn" id="pgndv_m_'+g.id+'"'+(g.newDistVal<=10?' disabled':'')+'>−</button><div class="cnt-val" style="font-size:18px;">'+g.newDistVal+'</div><button class="cnt-btn" id="pgndv_p_'+g.id+'">＋</button><span style="font-size:11px;color:var(--text-dim);">m</span></div>';
        ndr.querySelector('#pgndv_m_'+g.id).addEventListener('click', function(){ pgChange(g.id,'newDistVal',-10); });
        ndr.querySelector('#pgndv_p_'+g.id).addEventListener('click', function(){ pgChange(g.id,'newDistVal',10); });
        body.appendChild(ndr);
      }
    }
  }

  if (g.power === 'yes' || (g.power === 'no' && g.newType)) {
    var pipeRow = document.createElement('div'); pipeRow.className='power-pipe-row';
    var pipeToggle = document.createElement('div'); pipeToggle.className='power-pipe-toggle';
    ['yes','no'].forEach(function(v) {
      var btn = document.createElement('button');
      btn.className='power-pipe-btn'+(g.pipe===v?' sel':'');
      btn.textContent = v==='yes'?'あり':'なし';
      btn.addEventListener('click', function(){ pgSet(g.id,'pipe',v); });
      pipeToggle.appendChild(btn);
    });
    pipeRow.innerHTML='<span style="font-size:12px;color:var(--text-dim);">🔧 配管の必要</span>';
    pipeRow.appendChild(pipeToggle);
    body.appendChild(pipeRow);
    if (g.pipe === 'yes') {
      var psub = document.createElement('div'); psub.className='power-pipe-sub';
      [['鉄','🔩 鉄'],['塩ビ','🟡 塩ビ'],['露出','📎 露出'],['モール','📏 モール']].forEach(function(pair) {
        var btn = document.createElement('button');
        btn.className='power-pipe-sub-btn'+(g.pipeType===pair[0]?' sel':'');
        btn.textContent=pair[1];
        btn.addEventListener('click', function(){ pgSet(g.id,'pipeType',pair[0]); });
        psub.appendChild(btn);
      });
      body.appendChild(psub);
    }
  }

  wrap.appendChild(body);
  return wrap;
}

function pgSet(id, key, val) {
  const g = powerGroups.find(x => x.id===id); if(!g) return;
  g[key] = val; renderPowerGroups();
}
function pgSetGroupName(id, val) {
  const g = powerGroups.find(x => x.id===id); if(!g) return;
  g.groupName = val;
  // ヘッダータイトルだけリアルタイム更新（再描画なし）
  const card = document.querySelector('.power-group-card .power-group-title');
  // カード全体を再描画せずタイトルのみ更新
  const cards = document.getElementById('powerGroupList').querySelectorAll('.power-group-card');
  powerGroups.forEach(function(pg, i) {
    if (pg.id === id && cards[i]) {
      var titleEl = cards[i].querySelector('.power-group-title');
      if (titleEl) titleEl.textContent = (val && val.trim()) ? val.trim() : 'システム ' + pg.count + '台';
    }
  });
}
function pgChange(id, key, delta) {
  const g = powerGroups.find(x => x.id===id); if(!g) return;
  const min = key==='newDistVal' ? 10 : 1;
  g[key] = Math.max(min, (g[key]||min) + delta);
  renderPowerGroups();
}
function pgToggle(id) {
  const g = powerGroups.find(x => x.id===id); if(!g) return;
  g.open = !g.open; renderPowerGroups();
}
function pgDelete(id) {
  powerGroups = powerGroups.filter(x => x.id!==id); renderPowerGroups();
}
function pickLocation(btn, val) {
  btn.closest('.btn-grid').querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  d.location = val;
  const poleSection = document.getElementById('poleSection');
  if (poleSection) poleSection.style.display = val === '屋外' ? 'block' : 'none';
  if (val === '屋内') { d.poleNew = null; d.excavation = null; d.poleFinish = null; }
  const nb = document.getElementById('next5');
  if (nb) nb.disabled = false;
}
function pickPole(btn, val) {
  btn.closest('.btn-grid').querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  d.poleNew = val;
  const excSec = document.getElementById('excavationSection');
  if (excSec) excSec.style.display = val === 'あり' ? 'block' : 'none';
  if (val === 'なし') { d.excavation = null; d.poleFinish = null; }
}

// ══════════════════════════════════════
// エリア選択
// ══════════════════════════════════════
function pickArea(btn, val) {
  btn.closest('.btn-grid').querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  d.area = val;
  const toggle = document.getElementById('areaDetailToggle');
  if (toggle) toggle.style.display = 'flex';
  const nb = document.getElementById('next6');
  if (nb) nb.disabled = false;
}
function toggleAreaDetail(mode) {
  document.getElementById('areaDetailYes').classList.toggle('selected', mode === 'yes');
  document.getElementById('areaDetailNo').classList.toggle('selected',  mode === 'no');
  const sec = document.getElementById('areaDetailSection');
  if (sec) sec.style.display = mode === 'yes' ? 'block' : 'none';
}
function pickKojiType(btn, val) {
  btn.closest('.btn-grid').querySelectorAll('.choice-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  d.kojiType = val;
  const nb = document.getElementById('next2');
  if (nb) nb.disabled = false;
}

// ══════════════════════════════════════
// 日付ステップ（Step3）の構築
// ══════════════════════════════════════
function buildDateStep() {
  const isKasetsu = d.kojiType === '仮設';
  document.getElementById('dateBlock_single').style.display  = isKasetsu ? 'none'  : 'block';
  document.getElementById('dateBlock_kasetsu').style.display = isKasetsu ? 'block' : 'none';
  const title = isKasetsu ? '設置日・撤去日を設定してください' :
    (d.kojiType==='撤去' ? '撤去日はいつですか？' : '設置日はいつですか？');
  document.getElementById('step3Title').textContent = title;

  if (isKasetsu) {
    buildDateSection('install');
    buildDateSection('remove');
  } else {
    buildDateSection('single');
  }
}

function buildDateSection(id) {
  const containerId = 'dateSection_'+id;
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!d.dateData[id]) d.dateData[id] = { mode:'confirm' };
  const mode = d.dateData[id].mode || 'confirm';
  el.innerHTML = `
    <div class="date-mode-tabs">
      <div class="date-mode-tab${mode==='confirm'?   ' active':''}" onclick="setDateMode('${id}','confirm',this)">📅 確定</div>
      <div class="date-mode-tab${mode==='range'?     ' active':''}" onclick="setDateMode('${id}','range',this)">📆 不確定</div>
      <div class="date-mode-tab${mode==='undecided'? ' active':''}" onclick="setDateMode('${id}','undecided',this)">❓ 未定</div>
    </div>
    <div id="datePanel_confirm_${id}"  style="display:${mode==='confirm'?'block':'none'}">
      <div id="calContainer_${id}"></div>
    </div>
    <div id="datePanel_range_${id}"    style="display:${mode==='range'?'block':'none'}">
      <div id="rangeContainer_${id}"></div>
    </div>
    <div id="datePanel_undecided_${id}" style="display:${mode==='undecided'?'block':'none'}">
      <div class="undecided-box-sm"><div class="em">📋</div><p>日付は未定としてレポートに記載されます<br>決定後に修正してください</p></div>
    </div>`;
  buildCalById(id);
  buildRangeSection(id);
}

function setDateMode(id, mode, el) {
  el.closest('.date-mode-tabs').querySelectorAll('.date-mode-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  d.dateData[id].mode = mode;
  ['confirm','range','undecided'].forEach(m=>{
    const p=document.getElementById(`datePanel_${m}_${id}`);
    if(p) p.style.display=m===mode?'block':'none';
  });
}

// ══════════════════════════════════════
// 不確定レンジUI
// ══════════════════════════════════════
const rangeStateMap = {};
function buildRangeSection(id) {
  var el = document.getElementById('rangeContainer_' + id);
  if (!el) return;
  if (!rangeStateMap[id]) rangeStateMap[id] = { fromPrec: 'jun', toPrec: 'jun' };

  var div = document.createElement('div');
  div.className = 'range-box-inner';

  var monthHTML = '<option value="">月</option>' + MONTHS_JA.map(function(m, i) {
    return '<option value="' + (i + 1) + '">' + m + '</option>';
  }).join('');
  var junHTML = '<option value="">旬</option><option>上旬</option><option>中旬</option><option>下旬</option>';

  div.innerHTML = [
    '<div class="range-inner-label">RANGE — 期間を指定</div>',
    '<div class="range-date-block">',
      '<div class="range-date-block-label">FROM — 開始</div>',
      '<div class="prec-toggle-sm">',
        '<div class="prec-btn-sm active" data-rid="' + id + '" data-side="from" data-mode="jun">旬で指定</div>',
        '<div class="prec-btn-sm" data-rid="' + id + '" data-side="from" data-mode="day">日付で指定</div>',
      '</div>',
      '<div class="range-row-sm">',
        '<div class="sel-wrap-sm"><select class="sel-sm" id="r_' + id + '_fromM" data-rid="' + id + '">' + monthHTML + '</select></div>',
        '<div class="sel-wrap-sm" id="r_' + id + '_fromJW"><select class="sel-sm" id="r_' + id + '_fromJ" data-rid="' + id + '">' + junHTML + '</select></div>',
        '<div class="sel-wrap-sm" id="r_' + id + '_fromDW" style="display:none"><select class="sel-sm" id="r_' + id + '_fromD" data-rid="' + id + '"><option value="">日</option></select></div>',
      '</div>',
    '</div>',
    '<div class="range-sep-sm">〜</div>',
    '<div class="range-date-block">',
      '<div class="range-date-block-label">TO — 終了</div>',
      '<div class="prec-toggle-sm">',
        '<div class="prec-btn-sm active" data-rid="' + id + '" data-side="to" data-mode="jun">旬で指定</div>',
        '<div class="prec-btn-sm" data-rid="' + id + '" data-side="to" data-mode="day">日付で指定</div>',
      '</div>',
      '<div class="range-row-sm">',
        '<div class="sel-wrap-sm"><select class="sel-sm" id="r_' + id + '_toM" data-rid="' + id + '">' + monthHTML + '</select></div>',
        '<div class="sel-wrap-sm" id="r_' + id + '_toJW"><select class="sel-sm" id="r_' + id + '_toJ" data-rid="' + id + '">' + junHTML + '</select></div>',
        '<div class="sel-wrap-sm" id="r_' + id + '_toDW" style="display:none"><select class="sel-sm" id="r_' + id + '_toD" data-rid="' + id + '"><option value="">日</option></select></div>',
      '</div>',
    '</div>',
    '<div class="range-preview-sm" id="r_' + id + '_preview">期間を選択してください</div>'
  ].join('');

  div.querySelectorAll('.prec-btn-sm').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var rid = this.dataset.rid;
      var side = this.dataset.side;
      var mode = this.dataset.mode;
      setPrecById(rid, side, mode, this);
    });
  });
  div.querySelectorAll('select[data-rid]').forEach(function(sel) {
    sel.addEventListener('change', function() {
      updRangeById(this.dataset.rid);
    });
  });

  el.innerHTML = '';
  el.appendChild(div);
}
function buildDayOptsById(selEl, month) {
  const days = month ? new Date(today.getFullYear(),month,0).getDate() : 31;
  selEl.innerHTML = '<option value="">日</option>';
  for(let i=1;i<=days;i++){const o=document.createElement('option');o.value=i+'日';o.textContent=i+'日';selEl.appendChild(o);}
}
function setPrecById(id, side, mode, el) {
  if(!rangeStateMap[id]) rangeStateMap[id]={fromPrec:'jun',toPrec:'jun'};
  rangeStateMap[id][side+'Prec']=mode;
  el.closest('.prec-toggle-sm').querySelectorAll('.prec-btn-sm').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(`r_${id}_${side}JW`).style.display=mode==='jun'?'flex':'none';
  document.getElementById(`r_${id}_${side}DW`).style.display=mode==='day'?'flex':'none';
  if(mode==='day'){const m=parseInt(document.getElementById(`r_${id}_${side}M`).value)||0;buildDayOptsById(document.getElementById(`r_${id}_${side}D`),m);}
  updRangeById(id);
}
function updRangeById(id) {
  const s=rangeStateMap[id]||{fromPrec:'jun',toPrec:'jun'};
  const _fmEl=document.getElementById(`r_${id}_fromM`); const fm=_fmEl?_fmEl.value:'';
  const _fjEl=document.getElementById(`r_${id}_fromJ`); const _fdEl=document.getElementById(`r_${id}_fromD`);
  const fv=s.fromPrec==='jun'?(_fjEl?_fjEl.value:''):(_fdEl?_fdEl.value:'');
  const _tmEl=document.getElementById(`r_${id}_toM`); const tm=_tmEl?_tmEl.value:'';
  const _tjEl=document.getElementById(`r_${id}_toJ`); const _tdEl=document.getElementById(`r_${id}_toD`);
  const tv=s.toPrec==='jun'?(_tjEl?_tjEl.value:''):(_tdEl?_tdEl.value:'');
  const from=(fm?fm+'月':'')+fv;
  const to=(tm?tm+'月':'')+tv;
  const txt=from&&to?from+' 〜 '+to:(from||to||'期間を選択してください');
  const prev=document.getElementById(`r_${id}_preview`);
  if(prev) prev.textContent=txt;
  if(!d.dateData[id]) d.dateData[id]={mode:'range'};
  d.dateData[id].rangeText=txt;
}

// ══════════════════════════════════════
// 日付テキスト取得
// ══════════════════════════════════════
function getDateText(id) {
  const dd = d.dateData[id];
  if (!dd) return '未入力';
  if (dd.mode==='undecided') return '未定';
  if (dd.mode==='range') return dd.rangeText || '期間未選択';
  if (dd.mode==='confirm' && dd.date) {
    const { y, m, d: day } = dd.date;
    return y+'-'+String(m+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
  }
  return '未選択';
}
function getDateFileStr() {
  const dd = d.dateData;
  if (d.kojiType==='仮設') {
    const inst = getDateText('install');
    return (inst!=='未定'&&inst!=='未選択'&&inst!=='期間未選択') ? inst.replace(/[^\d]/g,'').slice(0,8) : 'nodate';
  }
  const txt = getDateText('single');
  if (txt.match(/^\d{4}-\d{2}-\d{2}$/)) return txt.replace(/-/g,'_');
  return 'nodate';
}

// ══════════════════════════════════════
// ステップ管理
// ══════════════════════════════════════
function updateProgress() {
  document.getElementById('progressFill').style.width = ((step-1)/TOTAL*100) + '%';
  document.getElementById('progressNum').textContent = String(step).padStart(2,'0') + ' / 17';
}
function showStep(n) {
  document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
  const t = document.querySelector('[data-step="'+n+'"]');
  if (t) t.classList.add('active');
  updateProgress();
  if (n === 3) buildDateStep();
  if (n === 8) buildDeviceList();
  if (n === 9) initPowerStep();
  if (n === 10) initArmStep();
  if (n === 11) buildWorkStep();
  if (n === 15 && d.kojiType === '設置') { step=16; showStep(16); return; }
  if (n === 16 && isAllNoArm()) { step=17; showStep(17); return; }
}
function isAllNoArm() {
  const keys = Object.keys(d.armData||{});
  return keys.length === 0 || (keys.length===1 && keys[0]==='none');
}
const SKIP_STEPS = new Set([]);
function nextStep() {
  let n = step + 1;
  while (SKIP_STEPS.has(n)) n++;
  if (n <= TOTAL) { step = n; showStep(step); }
}
function prevStep() {
  let n = step - 1;
  while (SKIP_STEPS.has(n)) n--;
  if (n >= 1) { step = n; showStep(step); }
}
function goBackFrom10() {
  step = 9; showStep(step);
}

function pick(btn, key, val) {
  btn.closest('.btn-grid').querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  d[key] = val;
  const nb = document.getElementById('next'+step);
  if (nb) nb.disabled = false;
  if (key === 'excavation') {
    const fin = document.getElementById('finishSection');
    if (fin) fin.style.display = 'block';
  }
}

// ══════════════════════════════════════
// システム台数
// ══════════════════════════════════════
function sysCountChange(delta) {
  d.systemCount = Math.max(1, (d.systemCount||1) + delta);
  document.getElementById('sysCountVal').textContent = d.systemCount;
  document.getElementById('sysMaxCam').textContent = d.systemCount * 3;
  updateCameraTotal();
}

// ══════════════════════════════════════
// デバイスリスト（Step8）
// ══════════════════════════════════════
function buildDeviceList() {
  const list = document.getElementById('deviceList');
  list.innerHTML = DEVICE_DEFS.map(({ key, icon }) => {
    if (!d.cameraCounts[key]) d.cameraCounts[key] = 0;
    const sel = d.cameraCounts[key] > 0;
    return `
    <div class="device-row${sel?' selected':''}" id="devRow_${key.replace(/\s/g,'_')}" onclick="toggleDevice('${key}')">
      <div class="device-row-left">
        <div class="device-icon">${icon}</div>
        <div class="device-name">${key}</div>
      </div>
      <div class="device-count-ctrl" onclick="event.stopPropagation()">
        <button class="cnt-btn" onclick="devCntChange('${key}',-1)">−</button>
        <div class="device-cnt" id="devCnt_${key.replace(/\s/g,'_')}">${d.cameraCounts[key]||0}</div>
        <button class="cnt-btn" onclick="devCntChange('${key}',1)">＋</button>
      </div>
    </div>`;
  }).join('');
  updateCameraTotal();
}

function toggleDevice(key) {
  const id = key.replace(/\s/g,'_');
  const row = document.getElementById('devRow_'+id);
  if (!row) return;
  const isSel = row.classList.contains('selected');
  if (isSel) {
    d.cameraCounts[key] = 0;
    row.classList.remove('selected');
    document.getElementById('devCnt_'+id).textContent = 0;
  } else {
    d.cameraCounts[key] = 1;
    row.classList.add('selected');
    document.getElementById('devCnt_'+id).textContent = 1;
  }
  updateCameraTotal();
}

function devCntChange(key, delta) {
  const id = key.replace(/\s/g,'_');
  const row = document.getElementById('devRow_'+id);
  const cur = d.cameraCounts[key] || 0;
  const max = (d.systemCount||1) * 3;
  const totalOther = getTotalCameras() - cur;
  let next = cur + delta;
  if (next < 0) next = 0;
  if (delta > 0 && totalOther + next > max) {
    showToast('システム上限（' + max + '台）に達しています', 'red');
    return;
  }
  d.cameraCounts[key] = next;
  if (next === 0) row && row.classList.remove('selected');
  else row && row.classList.add('selected');
  document.getElementById('devCnt_'+id).textContent = next;
  updateCameraTotal();
}

function getTotalCameras() {
  return DEVICE_DEFS.reduce((s, { key }) => s + (d.cameraCounts[key]||0), 0);
}

function updateCameraTotal() {
  const total = getTotalCameras();
  const max   = (d.systemCount||1) * 3;
  const row   = document.getElementById('camTotalRow');
  const numEl = document.getElementById('camTotalVal');
  const stEl  = document.getElementById('camTotalStatus');
  const next8btn = document.getElementById('next8');
  const errEl = document.getElementById('sysErrorMsg');

  if (total === 0) {
    if (row) row.style.display = 'none';
    if (next8btn) next8btn.disabled = true;
    if (errEl) errEl.style.display = 'none';
    return;
  }
  if (row) row.style.display = 'flex';
  if (numEl) numEl.textContent = total;

  if (total > max) {
    if (stEl) { stEl.className = 'cam-total-status err'; stEl.textContent = '⚠ システム台数（' + max + '台）を超えています'; }
    if (next8btn) next8btn.disabled = true;
    if (errEl) {
      errEl.style.display = 'block';
      errEl.textContent = 'システム ' + (d.systemCount||1) + '台（最大 ' + max + '台）に対して、カメラ合計が ' + total + '台あります。\nシステム台数を増やすか、カメラ台数を減らしてください。';
    }
  } else {
    if (stEl) { stEl.className = 'cam-total-status ok'; stEl.textContent = '✓ OK'; }
    if (next8btn) next8btn.disabled = false;
    if (errEl) errEl.style.display = 'none';
  }
}

function tryNextStep8() {
  const total = getTotalCameras();
  const max   = (d.systemCount||1) * 3;
  if (total === 0) { showToast('機器を1台以上選択してください', 'red'); return; }
  if (total > max) { showToast('カメラ台数がシステム上限を超えています', 'red'); return; }
  step = 9; showStep(step);
}

// ══════════════════════════════════════
// アームステップ（Step10）
// ══════════════════════════════════════
function initArmStep() {
  const camTotal = getTotalCameras();
  document.getElementById('armTotalNum').textContent = camTotal;
  ['wall','pole','ceil','none'].forEach(k => {
    const card  = document.getElementById('armCard_'+k);
    const check = document.getElementById('armCheck_'+k);
    const sub   = document.getElementById('armSub_'+k);
    if (!card) return;
    const hasDat = !!d.armData[k];
    card.classList.toggle('selected', hasDat);
    check.textContent = hasDat ? '✓' : '';
    if (sub) sub.style.display = hasDat ? 'block' : 'none';
  });
  ['wall','ceil'].forEach(armKey => {
    if (d.armData[armKey] && d.armData[armKey].methods) {
      Object.entries(d.armData[armKey].methods).forEach(([method, cnt]) => {
        const el = document.getElementById('armMC_'+armKey+'_'+method);
        if (el) { el.textContent = cnt; updateMethodRowStyle(armKey, method, cnt); }
      });
      updateArmSubTotal(armKey);
    }
  });
  ['pole','none'].forEach(armKey => {
    if (d.armData[armKey]) {
      const el = document.getElementById('armCnt_'+armKey);
      if (el) el.textContent = d.armData[armKey].count || 0;
    }
  });
  updateArmStatus();
}

function getArmAssigned() {
  let total = 0;
  if (d.armData.wall) {
    Object.values(d.armData.wall.methods||{}).forEach(c => { total += c; });
  }
  if (d.armData.ceil) {
    Object.values(d.armData.ceil.methods||{}).forEach(c => { total += c; });
  }
  if (d.armData.pole) total += d.armData.pole.count || 0;
  if (d.armData.none) total += d.armData.none.count || 0;
  return total;
}

function getArmSubTotal(armKey) {
  if (!d.armData[armKey]) return 0;
  if (armKey === 'pole' || armKey === 'none') return d.armData[armKey].count || 0;
  return Object.values(d.armData[armKey].methods||{}).reduce((s,c) => s+c, 0);
}

function updateArmSubTotal(armKey) {
  const el = document.getElementById('armSubTotal_'+armKey);
  if (el) el.textContent = getArmSubTotal(armKey);
}

function updateMethodRowStyle(armKey, method, cnt) {
  const rows = document.querySelectorAll(`#armMethods_${armKey} .arm-method-row`);
  rows.forEach(row => {
    if (row.dataset.method === method) {
      row.classList.toggle('active', cnt > 0);
    }
  });
}

function updateArmStatus() {
  const camTotal  = getTotalCameras();
  const assigned  = getArmAssigned();
  const remaining = camTotal - assigned;

  document.getElementById('armAssignedNum').textContent = assigned;
  document.getElementById('armTotalNum').textContent    = camTotal;

  const badge  = document.getElementById('armStatusBadge');
  const next10btn = document.getElementById('next10');
  if (assigned === camTotal && camTotal > 0) {
    badge.className = 'arm-status-badge ok'; badge.textContent = '✓ 完了';
    if (next10btn) next10btn.disabled = false;
  } else {
    badge.className = 'arm-status-badge warn';
    badge.textContent = remaining > 0 ? '残り ' + remaining + ' 台' : '超過 ' + Math.abs(remaining) + ' 台';
    if (next10btn) next10btn.disabled = true;
  }
}

function toggleArm(key) {
  const card  = document.getElementById('armCard_'+key);
  const check = document.getElementById('armCheck_'+key);
  const sub   = document.getElementById('armSub_'+key);
  const isSel = card.classList.contains('selected');

  if (!isSel) {
    card.classList.add('selected');
    check.textContent = '✓';
    if (sub) sub.style.display = 'block';
    if (!d.armData[key]) {
      if (key === 'wall' || key === 'ceil') {
        d.armData[key] = { methods: {} };
      } else {
        const remain = Math.max(0, getTotalCameras() - getArmAssigned());
        d.armData[key] = { count: key === 'none' ? remain : 0 };
        const cntEl = document.getElementById('armCnt_'+key);
        if (cntEl) cntEl.textContent = d.armData[key].count;
      }
    }
  } else {
    card.classList.remove('selected');
    check.textContent = '';
    if (sub) sub.style.display = 'none';
    delete d.armData[key];
    if (key === 'wall' || key === 'ceil') {
      document.querySelectorAll(`#armMethods_${key} .arm-method-cnt`).forEach(el => el.textContent = '0');
      document.querySelectorAll(`#armMethods_${key} .arm-method-row`).forEach(el => el.classList.remove('active'));
      const stEl = document.getElementById('armSubTotal_'+key);
      if (stEl) stEl.textContent = '0';
    } else {
      const cntEl = document.getElementById('armCnt_'+key);
      if (cntEl) cntEl.textContent = '0';
    }
  }
  updateArmStatus();
}

function armMethodCntChange(armKey, method, delta) {
  if (!d.armData[armKey]) return;
  const camTotal = getTotalCameras();
  const assigned = getArmAssigned();
  const cur      = (d.armData[armKey].methods || {})[method] || 0;
  let next = cur + delta;
  if (next < 0) next = 0;
  if (delta > 0 && (assigned - cur + next) > camTotal) {
    showToast('カメラ台数（' + camTotal + '台）を超えて割り当てできません', 'red');
    return;
  }
  if (!d.armData[armKey].methods) d.armData[armKey].methods = {};
  d.armData[armKey].methods[method] = next;
  const el = document.getElementById('armMC_'+armKey+'_'+method);
  if (el) el.textContent = next;
  updateMethodRowStyle(armKey, method, next);
  updateArmSubTotal(armKey);
  updateArmStatus();
}

function armCntChange(armKey, delta) {
  if (!d.armData[armKey]) return;
  const camTotal = getTotalCameras();
  const assigned = getArmAssigned();
  const cur      = d.armData[armKey].count || 0;
  let next = cur + delta;
  if (next < 0) next = 0;
  if (delta > 0 && (assigned - cur + next) > camTotal) {
    showToast('カメラ台数（' + camTotal + '台）を超えて割り当てできません', 'red');
    return;
  }
  d.armData[armKey].count = next;
  const el = document.getElementById('armCnt_'+armKey);
  if (el) el.textContent = next;
  updateArmStatus();
}

function lanCntChange(delta) {
  const el   = document.getElementById('lanLength');
  const disp = document.getElementById('lanLengthVal');
  let val = parseInt(el.value) || 0;
  val = Math.max(0, val + delta);
  el.value = val;
  disp.textContent = val;
}

// ══════════════════════════════════════
// 作業計画ステップ（Step12）
// ══════════════════════════════════════
function buildWorkStep() {
  const isKasetsu = d.kojiType === '仮設';
  document.getElementById('workBlock_single').style.display   = isKasetsu ? 'none'  : 'block';
  document.getElementById('workBlock_kasetsu').style.display  = isKasetsu ? 'block' : 'none';
  const title = isKasetsu ? '設置・撤去の作業計画' :
    (d.kojiType==='撤去' ? '撤去工事の作業計画' : '設置工事の作業計画');
  document.getElementById('step11Title').textContent = title;
  if (!d.workPlan) d.workPlan = {};
  if (isKasetsu) {
    buildWorkSection('install');
    buildWorkSection('remove');
  } else {
    buildWorkSection('single');
  }
}

function buildWorkSection(id) {
  const el = document.getElementById('workSection_'+id);
  if (!el) return;
  if (!d.workPlan[id]) d.workPlan[id] = { workers:2, days:1, hours:3 };
  const p = d.workPlan[id];
  el.innerHTML = `
  <div class="work-plan-section">
    <div class="work-plan-row">
      <div class="work-plan-item-label">👷 作業人数</div>
      <div class="work-plan-ctrl">
        <button class="cnt-btn" onclick="workPlanChange('${id}','workers',-1)">−</button>
        <div class="work-plan-val" id="wp_${id}_workers">${p.workers}</div>
        <button class="cnt-btn" onclick="workPlanChange('${id}','workers',1)">＋</button>
        <div class="work-plan-unit">名</div>
      </div>
    </div>
    <div class="work-plan-row">
      <div class="work-plan-item-label">📅 かかる日数</div>
      <div class="work-plan-ctrl">
        <button class="cnt-btn" onclick="workPlanChange('${id}','days',-1)">−</button>
        <div class="work-plan-val" id="wp_${id}_days">${p.days}</div>
        <button class="cnt-btn" onclick="workPlanChange('${id}','days',1)">＋</button>
        <div class="work-plan-unit">日</div>
      </div>
    </div>
    <div class="work-plan-row">
      <div class="work-plan-item-label">⏱ 予想時間</div>
      <div class="work-plan-ctrl">
        <button class="cnt-btn" onclick="workPlanChange('${id}','hours',-0.5)">−</button>
        <div class="work-plan-val" id="wp_${id}_hours">${p.hours}</div>
        <button class="cnt-btn" onclick="workPlanChange('${id}','hours',0.5)">＋</button>
        <div class="work-plan-unit">時間</div>
      </div>
    </div>
  </div>`;
}

function workPlanChange(id, key, delta) {
  if (!d.workPlan) d.workPlan = {};
  if (!d.workPlan[id]) d.workPlan[id] = { workers:2, days:1, hours:3 };
  const min = key==='hours' ? 0.5 : 1;
  d.workPlan[id][key] = Math.max(min, (d.workPlan[id][key]||min) + delta);
  const el = document.getElementById(`wp_${id}_${key}`);
  if (el) el.textContent = d.workPlan[id][key];
}

function toggleKoso(mode) {
  kosoMode = mode;
  document.getElementById('kosoNone').classList.toggle('selected', mode==='none');
  document.getElementById('kosoYes').classList.toggle('selected',  mode==='yes');
  document.getElementById('kosoDetail').style.display = mode==='yes' ? 'block' : 'none';
  if (mode === 'none') { d.kosoEquip = []; d.kosoSupply = null; }
  document.getElementById('next13').disabled = false;
}

function kosoEquipPick(btn, val) {
  btn.classList.toggle('selected');
  if (!Array.isArray(d.kosoEquip)) d.kosoEquip = [];
  if (btn.classList.contains('selected')) {
    if (!d.kosoEquip.includes(val)) d.kosoEquip.push(val);
  } else {
    d.kosoEquip = d.kosoEquip.filter(v => v !== val);
  }
  const supSec = document.getElementById('kosoSupplySection');
  if (supSec) supSec.style.display = d.kosoEquip.length > 0 ? 'block' : 'none';
  // ラベルを「（{使用機材}準備方法）」に動的更新
  const labelEl = document.getElementById('kosoSupplyLabel');
  if (labelEl) {
    if (d.kosoEquip.length > 0) {
      labelEl.textContent = '📦 ' + d.kosoEquip.join('・') + '準備方法';
    } else {
      labelEl.textContent = '📦 準備方法';
    }
  }
}
function toggleToku(mode) {
  tokuMode = mode;
  document.getElementById('tokNone').classList.toggle('selected', mode==='none');
  document.getElementById('tokYes').classList.toggle('selected',  mode==='yes');
  document.getElementById('tokuDetail').style.display = mode==='yes' ? 'block' : 'none';
  document.getElementById('next17').disabled = false;
}

// ══════════════════════════════════════
// レポート生成
// ══════════════════════════════════════
function buildArmText(armData) {
  if (!armData || Object.keys(armData).length === 0) return 'アーム　　：未設定';
  const lines = [];
  if (armData.wall && armData.wall.methods) {
    Object.entries(armData.wall.methods).filter(([,c])=>c>0).forEach(([m,c]) => lines.push('アーム　　：壁付けアーム（' + m + '） × ' + c + '台'));
  }
  if (armData.ceil && armData.ceil.methods) {
    Object.entries(armData.ceil.methods).filter(([,c])=>c>0).forEach(([m,c]) => lines.push('アーム　　：天井吊り下げ（' + m + '） × ' + c + '台'));
  }
  if (armData.pole && armData.pole.count > 0) lines.push('アーム　　：ポールマウント × ' + armData.pole.count + '台');
  if (armData.none && armData.none.count > 0) lines.push('アーム　　：アームなし × ' + armData.none.count + '台');
  return lines.length ? lines.join('\n') : 'アーム　　：未設定';
}

function buildCameraText(counts, other) {
  const lines = DEVICE_DEFS
    .filter(({ key }) => (counts[key]||0) > 0)
    .map(({ key }) => `　 ${key}：${counts[key]}台`);
  if (other) lines.push('　 その他：' + other);
  return lines.length ? lines.join('\n') : '　 未選択';
}

function buildWorkDateText(r) {
  if (r.kojiType === '仮設') {
    return `設置日　　：${r.installDate}\n撤去日　　：${r.removeDate}`;
  }
  const label = r.kojiType === '撤去' ? '撤去日' : '設置日';
  return `${label}　　：${r.workDate}`;
}

function buildWorkPlanText(r) {
  if (r.kojiType === '仮設') {
    const i = r.workPlan.install || {};
    const rv = r.workPlan.remove  || {};
    return `【作業計画 — 設置】
作業人数　：${i.workers||'-'}名
かかる日数　：${i.days||'-'}日
予想時間　：${i.hours||'-'}時間
${r.kosoLine}

【作業計画 — 撤去】
作業人数　：${rv.workers||'-'}名
かかる日数　：${rv.days||'-'}日
予想時間　：${rv.hours||'-'}時間`;
  }
  const p = r.workPlan.single || {};
  return `【作業計画】
作業人数　：${p.workers||'-'}名
かかる日数　：${p.days||'-'}日
予想時間　：${p.hours||'-'}時間
${r.kosoLine}`;
}

function buildText(r) {
  const powerText = (r.powerGroups||[]).map(function(g,i) {
    var label = (g.groupName && g.groupName.trim())
      ? 'グループ'+(i+1)+'「'+g.groupName.trim()+'」（'+g.count+'台）'
      : 'グループ'+(i+1)+'（'+g.count+'台）';
    return '　' + label + '：' + getPowerGroupSummary(g);
  }).join('\n') || '　未設定';
  const haizaiLine      = r.haizai ? ('廃材処理　：'+r.haizai+(r.haizaiNote?' （'+r.haizaiNote+'）':'')) : '';
  const armHandlingLine = r.armHandling ? ('アーム手配　：'+r.armHandling) : '';
  const areaLine        = r.area ? ('エリア　　：'+r.area+(r.areaDetail?' '+r.areaDetail:'')) : '';
  const poleLine        = r.poleNew === 'あり'
    ? ('ポール新設　：あり（掘削：'+(r.excavation||'未選択')+'　仕上げ：'+(r.poleFinish||'未選択')+'）')
    : r.poleNew === 'なし' ? 'ポール新設　：なし' : '';
  return `━━━━━━━━━━━━━━━━━━━━━━
　現調レポート
　作成日：${r.createdAt}
━━━━━━━━━━━━━━━━━━━━━━

【基本情報】
現場名　　：${r.siteName}
工事内容　：${r.kojiType}
${buildWorkDateText(r)}
時間帯　　：${r.timeZone}
工事場所　：${r.location}
${areaLine}
${poleLine}
施工箇所　：${r.sekouSho}
${haizaiLine}

【機器情報】
システム台数：${r.systemCount}台（最大${r.systemCount*3}台接続可）
カメラ種類・台数：
${r.cameraText}
${r.armText}
${armHandlingLine}

【電源供給】
${powerText}

【配線・工事】
配線方法　：${r.wiring}
LANケーブル：${r.lanLength}m
配線支持材　：${r.wireSupport || '未記入'}

${buildWorkPlanText(r)}

【備考】
${r.tokuLine}

━━━━━━━━━━━━━━━━━━━━━━`;
}

function generateReport() {
  let kosoLine = '高所作業　：なし';
  if (kosoMode === 'yes') {
    const equip = (d.kosoEquip||[]).join('・') || '機材未選択';
    const supply = d.kosoSupply || '準備方法未選択';
    kosoLine = `高所作業　：あり\n使用機材　：${equip}\n${equip}準備方法：${supply}`;
  }
  let tokuLine = 'なし';
  if (tokuMode === 'yes') tokuLine = document.getElementById('tokuText').value || '詳細未入力';

  const cameraCounts    = Object.assign({}, d.cameraCounts);
  const cameraTypeOther = document.getElementById('cameraTypeOther').value;
  const isKasetsu       = d.kojiType === '仮設';
  const workDate        = isKasetsu ? getDateText('install') : getDateText('single');
  const installDate     = getDateText('install');
  const removeDate      = getDateText('remove');
  const workDateFile    = getDateFileStr();

  currentReport = {
    id:           Date.now(),
    createdAt:    new Date().toLocaleDateString('ja-JP'),
    siteName:     document.getElementById('siteName').value || '未入力',
    workDate, installDate, removeDate, workDateFile,
    timeZone:     d.timeZone || '未選択',
    kojiType:     d.kojiType || '未選択',
    location:     d.location || '未選択',
    sekouSho:     document.getElementById('sekouSho').value || '未入力',
    haizai:       d.haizai || '',
    haizaiNote:   (document.getElementById('haizaiNote') && document.getElementById('haizaiNote').value) || '',
    armHandling:  d.armHandling || '',
    area:         d.area || '',
    areaDetail:   (document.getElementById('areaDetail') && document.getElementById('areaDetail').value) || '',
    poleNew:      d.poleNew || '',
    excavation:   d.excavation || '',
    poleFinish:   d.poleFinish || '',
    systemCount:  d.systemCount || 1,
    cameraCounts, cameraTypeOther,
    cameraText:   buildCameraText(cameraCounts, cameraTypeOther),
    armData:      JSON.parse(JSON.stringify(d.armData||{})),
    armText:      buildArmText(d.armData),
    wiring:       d.wiring || '未選択',
    lanLength:    document.getElementById('lanLength').value,
    wireSupport:  document.getElementById('wireSupport').value,
    powerGroups:  JSON.parse(JSON.stringify(powerGroups||[])),
    kosoLine, tokuLine,
    kosoEquip:    JSON.parse(JSON.stringify(d.kosoEquip||[])),
    kosoSupply:   d.kosoSupply || '',
    workPlan:     JSON.parse(JSON.stringify(d.workPlan||{})),
  };

  document.getElementById('resultTitle').textContent =
    currentReport.workDate + ' — ' + currentReport.siteName;
  document.getElementById('resultBox').textContent = buildText(currentReport);

  document.getElementById('stepsContainer').style.display = 'none';
  document.getElementById('progressWrap').style.display   = 'none';
  document.getElementById('resultPanel').classList.add('active');
  renderEstimate(currentReport);
}

// ══════════════════════════════════════
// コピー・保存・ダウンロード
// ══════════════════════════════════════
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('コピーしました！', 'green'))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    const ok = document.execCommand('copy');
    showToast(ok ? 'コピーしました！' : 'コピーに失敗しました', ok ? 'green' : 'red');
  } catch(e) {
    showToast('コピーに失敗しました', 'red');
  }
  document.body.removeChild(ta);
}
function copyReport() {
  copyText(buildText(currentReport));
}
function copyModalReport() {
  if (!modalReport) return;
  copyText(buildText(modalReport));
}
function saveReport() {
  if (!currentReport) return;
  const list = getSaved();
  if (list.find(r => r.id === currentReport.id)) { showToast('すでに保存済みです'); return; }
  list.unshift(currentReport);
  setSaved(list);
  updateBadge();
  showToast('アプリ内に保存しました！', 'green');
}
function getFileName(r) {
  const sn = (r.siteName || '現場').replace(/[\\\/:\*\?"<>\|]/g,'_');
  // 作成日（createdAt）をyyyymmdd形式に変換
  let dateStr = 'nodate';
  if (r.createdAt) {
    // toLocaleDateString('ja-JP') → "2026/5/11" のような形式
    const parts = r.createdAt.replace(/\//g,'-').split('-');
    if (parts.length === 3) {
      dateStr = parts[0] + parts[1].padStart(2,'0') + parts[2].padStart(2,'0');
    }
  }
  return dateStr + '_' + sn + '.txt';
}
function downloadSingle() {
  if (!currentReport) return;
  dl(buildText(currentReport), getFileName(currentReport));
  showToast('ファイルを書き出しました！', 'green');
}
function exportAll() {
  const list = getSaved();
  if (!list.length) { showToast('保存済みデータがありません', 'red'); return; }
  const text = list.map(r => buildText(r)).join('\n\n' + '═'.repeat(40) + '\n\n');
  const today = new Date();
  const fname = today.getFullYear()+'_'+String(today.getMonth()+1).padStart(2,'0')+'_'+String(today.getDate()).padStart(2,'0')+'_現調レポート全件.txt';
  dl(text, fname);
  showToast('全' + list.length + '件を書き出しました！', 'green');
}
function dl(text, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ══════════════════════════════════════
// ローカルストレージ
// ══════════════════════════════════════
function getSaved() { try { return JSON.parse(localStorage.getItem('gencho_v4')) || []; } catch { return []; } }
function setSaved(list) { localStorage.setItem('gencho_v4', JSON.stringify(list)); }
function deleteSaved(id) {
  setSaved(getSaved().filter(r => r.id !== id));
  updateBadge(); renderList();
  showToast('削除しました', 'red');
}
function deleteAllSaved() {
  setSaved([]);
  updateBadge(); renderList();
  showToast('全件削除しました', 'red');
}
function updateBadge() {
  const n = getSaved().length;
  document.getElementById('savedCount').textContent = n ? '(' + n + ')' : '';
}

// ══════════════════════════════════════
// 確認ダイアログ
// ══════════════════════════════════════
let confirmCallback = null;
function showConfirm(icon, title, msg, cb) {
  document.getElementById('confirmIcon').textContent = icon;
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent = msg;
  confirmCallback = cb;
  document.getElementById('confirmOverlay').classList.add('active');
  document.getElementById('confirmOkBtn').onclick = () => { closeConfirm(); cb(); };
}
function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('active');
  confirmCallback = null;
}
function confirmDeleteOne(id, name) {
  showConfirm('🗑️', '削除しますか？', name + '\nこの操作は取り消せません。', () => deleteSaved(id));
}
function confirmDeleteAll() {
  const n = getSaved().length;
  if (!n) { showToast('保存済みデータがありません', 'red'); return; }
  showConfirm('⚠️', '全件削除しますか？', n + '件のレポートをすべて削除します。\nこの操作は取り消せません。', () => deleteAllSaved());
}

// ══════════════════════════════════════
// 保存一覧レンダリング
// ══════════════════════════════════════
function formatDateLabel(r) {
  const raw = r.workDate || '';
  if (!raw || raw === '未選択') return '日付未定';
  const parts = raw.split('-');
  if (parts.length === 3) {
    return parts[0] + '.' + parts[1].padStart(2,'0') + '.' + parts[2].padStart(2,'0');
  }
  return raw;
}
function renderList() {
  const list = getSaved();
  const lbl = document.getElementById('listCountLabel');
  lbl.textContent = list.length ? list.length + ' 件のレポート' : '';
  const el = document.getElementById('listContent');
  if (!list.length) {
    el.innerHTML = `<div class="list-empty"><div class="em">📂</div><div>保存済みレポートはありません</div><div style="font-size:12px;margin-top:8px;color:#444;">入力後「アプリ内保存」を押すと<br>ここに表示されます</div></div>`;
    return;
  }
  el.innerHTML = list.map(r => {
    const dateLabel = formatDateLabel(r);
    const title = r.siteName || '現場名未入力';
    return `
    <div class="report-card" id="rcard_${r.id}">
      <div class="report-card-inner" onclick="openModal(${r.id})">
        <div style="flex:1;min-width:0;">
          <div class="rc-date">${dateLabel}　作成：${r.createdAt}</div>
          <div class="rc-title">${title}</div>
          <div class="rc-tags">
            <span class="tag koji">${r.kojiType||''}</span>
            <span class="tag">${r.location||''}</span>
            <span class="tag">${r.timeZone||''}</span>
            ${Object.entries(r.cameraCounts||{}).filter(([,v])=>v>0).map(([k])=>`<span class="tag">${k}</span>`).join('')}
          </div>
        </div>
        <div class="card-actions">
          <button class="card-act-btn" onclick="event.stopPropagation();downloadFromList(${r.id})">⬇️ 書出</button>
          <button class="card-act-btn" onclick="event.stopPropagation();toggleCardEdit(${r.id})">✏️ 編集</button>
          <button class="card-act-btn del" onclick="event.stopPropagation();confirmDeleteOne(${r.id},'${(title).replace(/'/g,'')}')">🗑️ 削除</button>
        </div>
      </div>
      <div class="card-edit-panel" id="cedit_${r.id}" style="display:none;">
        <div class="cedit-section-label">基本情報</div>
        ${makeEditItem(r.id,'siteName','🏢 現場名',r.siteName,'text')}
        ${makeEditItem(r.id,'kojiType','⚙️ 工事内容',r.kojiType,'choice',['設置','撤去','仮設'])}
        ${makeEditItem(r.id,'timeZone','🕐 時間帯',r.timeZone,'choice',['日中','夜間'])}
        ${makeEditItem(r.id,'location','📍 工事場所',r.location,'choice',['屋内','屋外'])}
        ${makeEditItem(r.id,'area','🗾 エリア',r.area||'未選択','choice',['都内','関東','東北','関西','九州','北海道'])}
        ${makeEditItem(r.id,'sekouSho','📌 施工箇所',r.sekouSho,'text')}
        <div class="cedit-section-label" style="margin-top:10px;">作業計画</div>
        ${makeEditItem(r.id,'wiring','🔌 配線方法',r.wiring,'choice',['露出','配管','天井内'])}
        ${r.haizai ? makeEditItem(r.id,'haizai','♻️ 廃材処理',r.haizai,'choice',['引き取り（バカン）','施工会社が処分','現地残置','未定']) : ''}
        ${r.armHandling ? makeEditItem(r.id,'armHandling','🔧 アーム手配',r.armHandling,'choice',['バカン','施工会社','未定']) : ''}
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="card-act-btn" style="flex:1;background:linear-gradient(135deg,var(--accent),var(--accent2));border-color:transparent;color:#fff;font-weight:700;" onclick="saveCardEdit(${r.id})">💾 保存</button>
          <button class="card-act-btn" style="flex:1;" onclick="toggleCardEdit(${r.id})">キャンセル</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function makeEditItem(rid, key, label, currentVal, type, options) {
  var id = 'cei_' + rid + '_' + key;
  var areaId = 'cedit_area_' + rid + '_' + key;
  var inputHtml = '';
  if (type === 'text') {
    inputHtml = '<textarea class="text-input" id="' + id + '" rows="1" style="margin:0;font-size:13px;padding:10px 12px;">' + (currentVal||'') + '</textarea>';
  } else if (type === 'choice') {
    inputHtml = '<div style="display:flex;flex-wrap:wrap;gap:5px;">' +
      (options||[]).map(function(opt) {
        return '<button class="choice-btn' + (currentVal===opt?' selected':'') + '" style="flex:1;min-width:60px;padding:9px 6px;font-size:11px;border-radius:9px;" onclick="ceditChoice(this,' + rid + ',\'' + key + '\',\'' + opt + '\')">' + opt + '</button>';
      }).join('') + '</div>';
  }
  return '<div class="cedit-item">' +
    '<div class="cedit-item-label">' + label + '</div>' +
    '<div class="cedit-item-current" onclick="toggleCeditInput(\'' + areaId + '\')">' + (currentVal||'未設定') + ' <span style="float:right;color:var(--text-muted);">›</span></div>' +
    '<div class="cedit-input-area" id="' + areaId + '" style="display:none;margin-top:6px;">' + inputHtml + '</div>' +
    '</div>';
}

function toggleCeditInput(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'block';
}
function toggleCardEdit(rid) {
  const panel = document.getElementById('cedit_'+rid);
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
}
function ceditChoice(btn, rid, key, val) {
  btn.closest('div').querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  if (!window._ceditTmp) window._ceditTmp = {};
  if (!window._ceditTmp[rid]) window._ceditTmp[rid] = {};
  window._ceditTmp[rid][key] = val;
}
function saveCardEdit(rid) {
  const list = getSaved();
  const r = list.find(x => x.id === rid);
  if (!r) return;
  const keys = ['siteName','sekouSho'];
  keys.forEach(key => {
    const el = document.getElementById(`cei_${rid}_${key}`);
    if (el) r[key] = el.value;
  });
  if (window._ceditTmp && window._ceditTmp[rid]) {
    Object.assign(r, window._ceditTmp[rid]);
    delete window._ceditTmp[rid];
  }
  setSaved(list);
  updateBadge();
  renderList();
  showToast('保存しました！', 'green');
}
function downloadFromList(id) {
  const r = getSaved().find(x => x.id === id);
  if (!r) return;
  dl(buildText(r), getFileName(r));
  showToast('ファイルを書き出しました！', 'green');
}

// ══════════════════════════════════════
// モーダル
// ══════════════════════════════════════
function openModal(id) {
  modalReport = getSaved().find(r => r.id === id);
  if (!modalReport) return;
  document.getElementById('modalTitle').textContent = formatDateLabel(modalReport) + '　' + (modalReport.siteName||'');
  document.getElementById('modalBody').textContent  = buildText(modalReport);
  document.getElementById('modalOverlay').classList.add('active');
}
function closeModal(e) {
  if (!e || e.target === document.getElementById('modalOverlay'))
    document.getElementById('modalOverlay').classList.remove('active');
}
function downloadModal() {
  if (!modalReport) return;
  dl(buildText(modalReport), getFileName(modalReport));
  showToast('ファイルを書き出しました！', 'green');
}

// ══════════════════════════════════════
// リセット・タブ
// ══════════════════════════════════════
function resetAll() {
  d = { systemCount:1, cameraCounts:{}, armData:{}, workPlan:{}, kosoEquip:[],
        dateData:{ single:{mode:'confirm'}, install:{mode:'confirm'}, remove:{mode:'confirm'} } };
  kosoMode = null; tokuMode = null; step = 1; currentReport = null;
  document.getElementById('stepsContainer').style.display = 'block';
  document.getElementById('progressWrap').style.display   = 'block';
  document.getElementById('resultPanel').classList.remove('active');
  document.querySelectorAll('.choice-btn,.toggle-btn').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.next-btn[id]').forEach(b => b.disabled = true);
  document.getElementById('kosoDetail').style.display = 'none';
  document.getElementById('tokuDetail').style.display = 'none';
  document.getElementById('sysCountVal').textContent = '1';
  document.getElementById('sysMaxCam').textContent = '3';
  ['wall','pole','ceil','none'].forEach(k => {
    const card=document.getElementById('armCard_'+k), check=document.getElementById('armCheck_'+k), sub=document.getElementById('armSub_'+k);
    if(card) card.classList.remove('selected');
    if(check) check.textContent='';
    if(sub) sub.style.display='none';
  });
  document.querySelectorAll('.arm-method-cnt').forEach(el=>el.textContent='0');
  document.querySelectorAll('.arm-method-row').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.arm-sub-total span').forEach(el=>el.textContent='0');
  document.querySelectorAll('#armCnt_pole, #armCnt_none').forEach(el=>el.textContent='0');
  powerGroups = []; powerGid = 0;
  document.getElementById('lanLength').value='10';
  document.getElementById('lanLengthVal').textContent='10';
  showStep(1);
}
function switchTab(tab) {
  document.getElementById('tabInput').classList.toggle('active', tab==='input');
  document.getElementById('tabList').classList.toggle('active',  tab==='list');
  document.getElementById('inputTab').style.display = tab==='input' ? 'block' : 'none';
  document.getElementById('listTab').classList.toggle('active',  tab==='list');
  document.getElementById('listTab').style.display = tab==='list' ? 'block' : 'none';
  if (tab === 'list') renderList();
}

// ══════════════════════════════════════
// トースト
// ══════════════════════════════════════
let toastTimer;
function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type==='green' ? ' green' : type==='red' ? ' red' : '');
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// ══════════════════════════════════════
// 初期化
// ══════════════════════════════════════
d.systemCount  = 1;
d.cameraCounts = {};
d.armData      = {};
d.dateData     = { single:{mode:'confirm'}, install:{mode:'confirm'}, remove:{mode:'confirm'} };
updateProgress();
updateBadge();
document.getElementById('listTab').style.display = 'none';

let lastTouchEnd = 0;
document.addEventListener('touchend', function(e) {
  const now = Date.now();
  if (now - lastTouchEnd < 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  if (e.isComposing || e.keyCode === 229) return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'TEXTAREA') {
    if (!e.shiftKey) { e.preventDefault(); advanceFromCurrentStep(); }
    return;
  }
  if (tag === 'INPUT') {
    e.preventDefault(); advanceFromCurrentStep();
  }
});

function advanceFromCurrentStep() {
  if (step === 8) { tryNextStep8(); return; }
  // ★ 電源ステップ（9）の次へ
  if (step === 9) {
    const nb = document.getElementById('next9step');
    if (nb && !nb.disabled) nb.click();
    return;
  }
  const nb = document.getElementById('next'+step);
  if (nb && !nb.disabled) nb.click();
  else if (!nb) {
    const activeStep = document.querySelector('.step.active');
    const btn = activeStep && activeStep.querySelector('.next-btn:not([disabled])');
    if (btn) btn.click();
  }
}

