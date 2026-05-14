// ══════════════════════════════════════
// 定数・状態
// ══════════════════════════════════════

// ══ 拠点定義 ══
// 施工拠点の定義（会社名・住所・担当都道府県・nearGroup）
const OFFICES = [
  {
    company: 'SRM', name: '北海道',
    address: '北海道札幌市中央区大通西14-1-13',
    prefectures: ['北海道']
  },
  {
    company: 'SRM', name: '東北・東京近郊',
    address: '東京都港区新橋2-20-15',
    prefectures: ['青森県','岩手県','宮城県','秋田県','山形県','福島県',
                  '東京都','神奈川県','埼玉県','千葉県','茨城県','栃木県','群馬県',
                  '新潟県','長野県','山梨県','静岡県','愛知県','岐阜県']
  },
  {
    company: 'SRM', name: '沖縄',
    address: '沖縄県糸満市西崎町',
    prefectures: ['沖縄県']
  },
  {
    company: 'バディネット', name: '東京近郊',
    address: '東京都中央区新富1-18-1',
    prefectures: ['東京都','神奈川県','埼玉県','千葉県','茨城県','栃木県','群馬県',
                  '新潟県','長野県','山梨県','静岡県','愛知県','岐阜県']
  },
  {
    company: 'バディネット', name: '関西',
    address: '大阪府大阪市中央区道修町1-5-18',
    prefectures: ['大阪府','京都府','兵庫県','奈良県','滋賀県','和歌山県','三重県',
                  '鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県'],
    nearGroup: '関西九州'
  },
  {
    company: 'バディネット', name: '九州',
    address: '福岡県福岡市博多区博多駅中央街5-11',
    prefectures: ['福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県',
                  '鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県'],
    nearGroup: '関西九州'
  },
  {
    company: 'バディネット', name: '広島',
    address: '広島県広島市中区上八丁堀5-2',
    prefectures: ['広島県','岡山県','山口県','島根県','鳥取県','愛媛県','香川県','高知県','徳島県'],
    nearGroup: '関西九州'
  },
];

// 総ステップ数
const TOTAL = 17;
// 選択可能な機器種別の定義（キー名・アイコン）
const DEVICE_DEFS = [
  { key: 'IPカメラ',     icon: '📷' },
  { key: 'ステレオカメラ', icon: '📸' },
  { key: 'サイネージ',   icon: '🖥️' },
  { key: 'Lidar',       icon: '📡' },
  { key: 'AirKnock',    icon: '💨' },
];

// アプリ全体の状態変数（step:現在ステップ / d:入力値 / kosoMode:高所作業 / tokuMode:特記事項 / currentReport:生成済みレポート / modalReport:モーダル表示中レポート）
let step = 1, d = {}, kosoMode = null, tokuMode = null, currentReport = null, modalReport = null;
// d の初期値設定
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

// カレンダー状態マップ（ステップID → {year, month, sel}）
const calStateMap = {};
// カレンダー状態の初期化（未初期化の場合のみ）
function initCalState(id) {
  if (!calStateMap[id]) calStateMap[id] = { year:today.getFullYear(), month:today.getMonth(), sel:null };
}
// 指定IDのカレンダーUIを構築・描画する
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
// カレンダーの月を前後に移動する
function calMoveById(id, delta) {
  initCalState(id); const s=calStateMap[id];
  s.month+=delta; if(s.month<0){s.month=11;s.year--;} if(s.month>11){s.month=0;s.year++;}
  buildCalById(id);
}
// カレンダーで日付を選択し d.dateData に反映する
function selectCalDayById(id, day) {
  initCalState(id); const s=calStateMap[id];
  s.sel={y:s.year,m:s.month,d:day};
  if (d.dateData[id]) d.dateData[id].date = s.sel;
  buildCalById(id);
}

// ══════════════════════════════════════
// 電源供給グループ（Step9）
// ══════════════════════════════════════
// 電源供給グループの配列
let powerGroups = [];
// 電源グループのID採番カウンター
let powerGid = 0;

// 電源供給ステップの初期化（グループがなければ1件追加）
function initPowerStep() {
  const sysTotal = d.systemCount || 1;
  document.getElementById('powerSysTotalLabel').textContent = sysTotal;
  document.getElementById('powerTotalNum').textContent = sysTotal;
  if (powerGroups.length === 0) addPowerGroup();
  renderPowerGroups();
}

// 電源供給グループを1件追加する
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
    camIP: 0,
    camStereo: 0,
    armData: {},
  });
  renderPowerGroups();
}

// 電源供給グループ一覧をDOMに描画する
function renderPowerGroups() {
  var sysTotal = d.systemCount || 1;
  var assigned = powerGroups.reduce(function(s,g){return s+g.count;}, 0);
  document.getElementById('powerAssignedNum').textContent = assigned;
  var badge = document.getElementById('powerStatusBadge');
  var nextBtn = document.getElementById('next11');
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

// 電源グループの入力が完了しているか判定する
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

// 電源グループの設定内容をサマリーテキストで返す
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

// 電源グループ1件分のDOMノードを生成して返す
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

// 電源グループの任意キーに値をセットして再描画する
function pgSet(id, key, val) {
  const g = powerGroups.find(x => x.id===id); if(!g) return;
  g[key] = val; renderPowerGroups();
}
// 電源グループのグループ名をセットする
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
// 電源グループの数値項目を増減する
function pgChange(id, key, delta) {
  const g = powerGroups.find(x => x.id===id); if(!g) return;
  const min = key==='newDistVal' ? 10 : 1;
  g[key] = Math.max(min, (g[key]||min) + delta);
  renderPowerGroups();
}
// 電源グループの開閉状態を切り替える
function pgToggle(id) {
  const g = powerGroups.find(x => x.id===id); if(!g) return;
  g.open = !g.open; renderPowerGroups();
}
// 電源グループを削除する
function pgDelete(id) {
  powerGroups = powerGroups.filter(x => x.id!==id); renderPowerGroups();
}
// 設置場所（屋内/屋外）を選択しポール設置セクションの表示を切り替える
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
// ポール新設の有無を選択し掘削セクションの表示を切り替える
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
// エリアを選択し「次へ」ボタンを有効化する
function pickArea(btn, val) {
  btn.closest('.btn-grid').querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  d.area = val;
  const toggle = document.getElementById('areaDetailToggle');
  if (toggle) toggle.style.display = 'flex';
  const nb = document.getElementById('next6');
  if (nb) nb.disabled = false;
}
// エリア詳細入力欄の表示/非表示を切り替える
function toggleAreaDetail(mode) {
  document.getElementById('areaDetailYes').classList.toggle('selected', mode === 'yes');
  document.getElementById('areaDetailNo').classList.toggle('selected',  mode === 'no');
  const sec = document.getElementById('areaDetailSection');
  if (sec) sec.style.display = mode === 'yes' ? 'block' : 'none';
}
// 工事内容（設置/撤去/仮設）を選択する
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
// 工事内容に応じた日付入力ステップを構築する
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

// 指定IDの日付入力セクション（確定/不確定/未定タブ）を構築する
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

// 日付入力モード（確定/不確定/未定）を切り替える
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
// 日付範囲選択の状態マップ（ステップID → {fromPrec, toPrec}）
const rangeStateMap = {};
// 日付範囲選択UIを構築する
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
// 指定IDの選択済み日付をテキスト形式で返す
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
// ファイル名用の日付文字列（yyyymmdd）を返す
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
// プログレスバーと現在ステップ番号を更新する
function updateProgress() {
  document.getElementById('progressFill').style.width = ((step-1)/TOTAL*100) + '%';
  document.getElementById('progressNum').textContent = String(step).padStart(2,'0') + ' / 17';
}
// 指定ステップを表示する（スキップステップは自動スルー）
function showStep(n) {
  document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
  const t = document.querySelector('[data-step="'+n+'"]');
  if (t) t.classList.add('active');
  updateProgress();
  if (n === 3) buildDateStep();
  if (n === 8) buildDeviceList();
  if (n === 9) initGroupArmStep();
  if (n === 11) initPowerStep();
  if (n === 12) buildWorkStep();
  if (n === 15 && d.kojiType === '設置') { step=16; showStep(16); return; }
  if (n === 16 && isAllNoArm()) { step=17; showStep(17); return; }
}
// アーム取付がすべて「なし」か判定する（グループarmDataを優先チェック）
function isAllNoArm() {
  // グループのarmDataを確認
  const hasGroupArm = powerGroups.some(function(g) {
    const ad = g.armData || {};
    return (ad.wall || 0) > 0 || (ad.pole || 0) > 0 || (ad.ceil || 0) > 0;
  });
  if (powerGroups.length > 0) return !hasGroupArm;
  // fallback: 旧d.armData
  const keys = Object.keys(d.armData||{});
  return keys.length === 0 || (keys.length===1 && keys[0]==='none');
}
// スキップするステップ番号のSet（場所確定時にStep6を追加）
const SKIP_STEPS = new Set([]);

// 場所確定状態を管理する（確定時はStep6をSKIP_STEPSに追加）
function setLocationConfirmed(confirmed) {
  if (confirmed) {
    SKIP_STEPS.add(6);
  } else {
    SKIP_STEPS.delete(6);
    d.officeDistances = null;
  }
}

// エリア選択ステップをスキップして次ステップへ進む
function skipAreaStep() {
  d.area = '';
  d.areaDetail = '';
  d.officeDistances = null;
  let n = step + 1;
  while (SKIP_STEPS.has(n)) n++;
  if (n <= TOTAL) { step = n; showStep(step); }
}
// 次のステップへ進む（SKIP_STEPSに含まれるステップは飛ばす）
function nextStep() {
  let n = step + 1;
  while (SKIP_STEPS.has(n)) n++;
  if (n <= TOTAL) { step = n; showStep(step); }
}
// 前のステップへ戻る（SKIP_STEPSに含まれるステップは飛ばす）
function prevStep() {
  let n = step - 1;
  while (SKIP_STEPS.has(n)) n--;
  if (n >= 1) { step = n; showStep(step); }
}
// 汎用選択ボタン処理（d[key]に値をセットし次へボタンを有効化）
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
// システム台数を増減する
function sysCountChange(delta) {
  d.systemCount = Math.max(1, (d.systemCount||1) + delta);
  document.getElementById('sysCountVal').textContent = d.systemCount;
  document.getElementById('sysMaxCam').textContent = d.systemCount * 3;
  updateCameraTotal();
}

// ══════════════════════════════════════
// デバイスリスト（Step8）
// ══════════════════════════════════════
// 機器選択リストをDOMに構築する
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

// 機器種別の選択状態をトグルする
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

// 機器の台数を増減する
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

// IPカメラ＋ステレオカメラの合計台数を返す（グループデータ優先、fallbackはcameraCounts）
function getTotalCameras() {
  const fromGroups = powerGroups.reduce((s, g) => s + (g.camIP||0) + (g.camStereo||0), 0);
  if (fromGroups > 0) return fromGroups;
  return DEVICE_DEFS.reduce((s, { key }) => s + (d.cameraCounts[key]||0), 0);
}

// カメラ合計台数表示を更新する
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

// Step8（機器選択）の次へ処理（カメラ未選択時は警告）
function tryNextStep8() {
  const total = getTotalCameras();
  const max   = (d.systemCount||1) * 3;
  if (total === 0) { showToast('機器を1台以上選択してください', 'red'); return; }
  if (total > max) { showToast('カメラ台数がシステム上限を超えています', 'red'); return; }
  step = 9; showStep(step);
}

// ══════════════════════════════════════
// グループ×カメラ×アーム設定ステップ（新Step9）
// ══════════════════════════════════════

// Step9初期化
function initGroupArmStep() {
  const sysTotal = d.systemCount || 1;
  document.getElementById('groupCamTotal').textContent = sysTotal * 3;
  if (powerGroups.length === 0) addPowerGroup();
  renderGroupCamArmList();
}

// グループカード一覧を描画する
function renderGroupCamArmList() {
  const el = document.getElementById('groupCamArmList');
  if (!el) return;
  const sysTotal = d.systemCount || 1;
  const frag = document.createDocumentFragment();
  powerGroups.forEach(function(g, i) {
    frag.appendChild(buildGroupCamArmDOM(g, i, sysTotal));
  });
  el.innerHTML = '';
  el.appendChild(frag);
  updateGroupCamStatus();
}

// グループカード1件分のDOMを生成して返す
function buildGroupCamArmDOM(g, idx, sysTotal) {
  var totalCam = (g.camIP || 0) + (g.camStereo || 0);
  var armData = g.armData || {};
  var armTotal = (armData.wall || 0) + (armData.pole || 0) + (armData.ceil || 0) + (armData.none || 0);
  var summary = 'IPカメラ' + (g.camIP || 0) + '台・ステレオ' + (g.camStereo || 0) + '台';
  if (totalCam > 0) {
    summary += '　アーム合計' + armTotal + '/' + totalCam + '台';
  }
  var displayTitle = (g.groupName && g.groupName.trim()) ? g.groupName.trim() : 'グループ ' + (idx + 1);

  var wrap = document.createElement('div');
  wrap.className = 'power-group-card';

  var header = document.createElement('div');
  header.className = 'power-group-header';
  header.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;">' +
      '<div class="power-group-num">' + (idx + 1) + '</div>' +
      '<div><div class="power-group-title">' + displayTitle + '</div>' +
      '<div class="power-group-summary">' + summary + '</div></div>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px;">' +
      '<button class="delete-btn" id="gcadel_' + g.id + '">🗑️</button>' +
    '</div>';
  header.addEventListener('click', function(e) {
    if (e.target.id === 'gcadel_' + g.id || e.target.closest('#gcadel_' + g.id)) {
      pgDelete(g.id); return;
    }
    pgToggle(g.id);
  });
  wrap.appendChild(header);

  if (!g.open) return wrap;

  var body = document.createElement('div');
  body.className = 'power-group-body';

  // グループ名入力
  var nameRow = document.createElement('div');
  nameRow.style.cssText = 'padding:10px 0 6px;border-bottom:1px solid var(--border);';
  nameRow.innerHTML =
    '<div class="power-count-label" style="margin-bottom:6px;">✏️ グループ名（任意）</div>' +
    '<input type="text" class="text-input" id="gcaname_' + g.id + '" value="' + (g.groupName || '').replace(/"/g, '&quot;') + '" placeholder="例）1F駐車場・受付エリア等" style="margin-bottom:0;font-size:13px;padding:9px 12px;">';
  nameRow.querySelector('#gcaname_' + g.id).addEventListener('input', function() {
    pgSetGroupName(g.id, this.value);
  });
  body.appendChild(nameRow);

  // システム台数
  var assigned = powerGroups.reduce(function(s, x) { return s + x.count; }, 0);
  var others = assigned - g.count;
  var canInc = others + g.count + 1 <= sysTotal;
  var countRow = document.createElement('div');
  countRow.className = 'power-count-row';
  countRow.innerHTML =
    '<div class="power-count-label">📦 システム台数</div>' +
    '<div class="camera-count-ctrl">' +
      '<button class="cnt-btn" id="gcam_' + g.id + '"' + (g.count <= 1 ? ' disabled' : '') + '>−</button>' +
      '<div class="cnt-val" style="font-size:18px;">' + g.count + '</div>' +
      '<button class="cnt-btn" id="gcap_' + g.id + '"' + (!canInc ? ' disabled' : '') + '>＋</button>' +
      '<span style="font-size:11px;color:var(--text-dim);">台</span>' +
    '</div>';
  countRow.querySelector('#gcam_' + g.id).addEventListener('click', function() { pgChange(g.id, 'count', -1); });
  countRow.querySelector('#gcap_' + g.id).addEventListener('click', function() { pgChange(g.id, 'count', 1); });
  body.appendChild(countRow);

  // カメラ台数セクション
  var camLabel = document.createElement('div');
  camLabel.className = 'arm-sub-label';
  camLabel.style.cssText = 'margin:12px 0 8px;';
  camLabel.textContent = '📷 カメラ台数';
  body.appendChild(camLabel);

  // IPカメラ
  var ipRow = document.createElement('div');
  ipRow.className = 'power-count-row';
  ipRow.innerHTML =
    '<div class="power-count-label">IPカメラ</div>' +
    '<div class="camera-count-ctrl">' +
      '<button class="cnt-btn" id="gcip_m_' + g.id + '"' + ((g.camIP || 0) <= 0 ? ' disabled' : '') + '>−</button>' +
      '<div class="cnt-val" style="font-size:18px;" id="gcip_v_' + g.id + '">' + (g.camIP || 0) + '</div>' +
      '<button class="cnt-btn" id="gcip_p_' + g.id + '">＋</button>' +
      '<span style="font-size:11px;color:var(--text-dim);">台</span>' +
    '</div>';
  ipRow.querySelector('#gcip_m_' + g.id).addEventListener('click', function() { pgCamChange(g.id, 'camIP', -1); });
  ipRow.querySelector('#gcip_p_' + g.id).addEventListener('click', function() { pgCamChange(g.id, 'camIP', 1); });
  body.appendChild(ipRow);

  // ステレオカメラ
  var sterRow = document.createElement('div');
  sterRow.className = 'power-count-row';
  sterRow.innerHTML =
    '<div class="power-count-label">ステレオカメラ</div>' +
    '<div class="camera-count-ctrl">' +
      '<button class="cnt-btn" id="gcst_m_' + g.id + '"' + ((g.camStereo || 0) <= 0 ? ' disabled' : '') + '>−</button>' +
      '<div class="cnt-val" style="font-size:18px;" id="gcst_v_' + g.id + '">' + (g.camStereo || 0) + '</div>' +
      '<button class="cnt-btn" id="gcst_p_' + g.id + '">＋</button>' +
      '<span style="font-size:11px;color:var(--text-dim);">台</span>' +
    '</div>';
  sterRow.querySelector('#gcst_m_' + g.id).addEventListener('click', function() { pgCamChange(g.id, 'camStereo', -1); });
  sterRow.querySelector('#gcst_p_' + g.id).addEventListener('click', function() { pgCamChange(g.id, 'camStereo', 1); });
  body.appendChild(sterRow);

  // アーム設定セクション（カメラ台数>0のとき表示）
  if (totalCam > 0) {
    var armLabel = document.createElement('div');
    armLabel.className = 'arm-sub-label';
    armLabel.style.cssText = 'margin:12px 0 8px;';
    armLabel.textContent = '🔩 アーム取付方法・台数';
    body.appendChild(armLabel);

    var armKeys = [
      { key: 'wall', label: '🔩 壁付け' },
      { key: 'pole', label: '🏗️ ポール' },
      { key: 'ceil', label: '⬆️ 天井' },
      { key: 'none', label: '🚫 なし' },
    ];
    if (!g.armData) g.armData = {};
    armKeys.forEach(function(ak) {
      var armRow = document.createElement('div');
      armRow.className = 'power-count-row';
      var armCnt = g.armData[ak.key] || 0;
      armRow.innerHTML =
        '<div class="power-count-label">' + ak.label + '</div>' +
        '<div class="camera-count-ctrl">' +
          '<button class="cnt-btn" id="ga_m_' + g.id + '_' + ak.key + '"' + (armCnt <= 0 ? ' disabled' : '') + '>−</button>' +
          '<div class="cnt-val" style="font-size:18px;" id="ga_v_' + g.id + '_' + ak.key + '">' + armCnt + '</div>' +
          '<button class="cnt-btn" id="ga_p_' + g.id + '_' + ak.key + '">＋</button>' +
          '<span style="font-size:11px;color:var(--text-dim);">台</span>' +
        '</div>';
      armRow.querySelector('#ga_m_' + g.id + '_' + ak.key).addEventListener('click', function() { pgArmCntChange(g.id, ak.key, -1); });
      armRow.querySelector('#ga_p_' + g.id + '_' + ak.key).addEventListener('click', function() { pgArmCntChange(g.id, ak.key, 1); });
      body.appendChild(armRow);
    });

    // アーム合計表示
    var armTotalRow = document.createElement('div');
    armTotalRow.style.cssText = 'font-size:12px;color:var(--text-dim);padding:6px 0;text-align:right;';
    armTotalRow.textContent = 'アーム合計 ' + armTotal + ' / ' + totalCam + ' 台';
    body.appendChild(armTotalRow);
  }

  wrap.appendChild(body);
  return wrap;
}

// カメラ台数を増減する
function pgCamChange(gid, type, delta) {
  const g = powerGroups.find(x => x.id === gid);
  if (!g) return;
  g[type] = Math.max(0, (g[type] || 0) + delta);
  renderGroupCamArmList();
}

// アーム台数を増減する
function pgArmCntChange(gid, armKey, delta) {
  const g = powerGroups.find(x => x.id === gid);
  if (!g) return;
  if (!g.armData) g.armData = {};
  g.armData[armKey] = Math.max(0, (g.armData[armKey] || 0) + delta);
  renderGroupCamArmList();
}

// ステータスバーとStep9次へボタンを更新する
function updateGroupCamStatus() {
  const maxCam = (d.systemCount || 1) * 3;
  const totalCam = powerGroups.reduce((s, g) => s + (g.camIP || 0) + (g.camStereo || 0), 0);
  const el = document.getElementById('groupCamAssigned');
  if (el) el.textContent = totalCam;
  const badge = document.getElementById('groupCamBadge');
  const next9btn = document.getElementById('next9');
  if (totalCam > 0 && totalCam <= maxCam) {
    if (badge) { badge.className = 'arm-status-badge ok'; badge.textContent = '✓ OK'; }
    if (next9btn) next9btn.disabled = false;
  } else if (totalCam > maxCam) {
    if (badge) { badge.className = 'arm-status-badge warn'; badge.textContent = '上限超過'; }
    if (next9btn) next9btn.disabled = true;
  } else {
    if (badge) { badge.className = 'arm-status-badge warn'; badge.textContent = '未設定'; }
    if (next9btn) next9btn.disabled = true;
  }
}

// Step9次へバリデーション
function tryNextStep9() {
  const totalCam = powerGroups.reduce((s, g) => s + (g.camIP || 0) + (g.camStereo || 0), 0);
  const maxCam = (d.systemCount || 1) * 3;
  if (totalCam === 0) { showToast('カメラ台数を入力してください', 'red'); return; }
  if (totalCam > maxCam) { showToast('カメラ台数がシステム上限を超えています', 'red'); return; }
  step = 10; showStep(step);
}

// ══════════════════════════════════════
// アームステップ（旧Step10 — 現在は使用しないが関数は残す）
// ══════════════════════════════════════
// アーム取付ステップを初期化する
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

// アーム取付済みのシステム台数を返す
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

// 指定アーム種別の取付方法別合計数を返す
function getArmSubTotal(armKey) {
  if (!d.armData[armKey]) return 0;
  if (armKey === 'pole' || armKey === 'none') return d.armData[armKey].count || 0;
  return Object.values(d.armData[armKey].methods||{}).reduce((s,c) => s+c, 0);
}

// 指定アーム種別のサブ合計表示を更新する
function updateArmSubTotal(armKey) {
  const el = document.getElementById('armSubTotal_'+armKey);
  if (el) el.textContent = getArmSubTotal(armKey);
}

// アーム取付方法の行スタイル（選択済みかどうか）を更新する
function updateMethodRowStyle(armKey, method, cnt) {
  const rows = document.querySelectorAll(`#armMethods_${armKey} .arm-method-row`);
  rows.forEach(row => {
    if (row.dataset.method === method) {
      row.classList.toggle('active', cnt > 0);
    }
  });
}

// アーム取付ステップ全体のステータスと次へボタンを更新する
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

// アーム種別（壁面/天井等）の展開状態をトグルする
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

// アーム取付方法の台数を増減する
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

// アーム種別の合計台数を増減する
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

// LANケーブル長を増減する
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
// 作業計画ステップのUIを構築する
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

// 作業計画の1セクション（日数・休日・夜間等）を構築する
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

// 作業計画の数値項目を増減する
function workPlanChange(id, key, delta) {
  if (!d.workPlan) d.workPlan = {};
  if (!d.workPlan[id]) d.workPlan[id] = { workers:2, days:1, hours:3 };
  const min = key==='hours' ? 0.5 : 1;
  d.workPlan[id][key] = Math.max(min, (d.workPlan[id][key]||min) + delta);
  const el = document.getElementById(`wp_${id}_${key}`);
  if (el) el.textContent = d.workPlan[id][key];
}

// 高所作業の有無を切り替える
function toggleKoso(mode) {
  kosoMode = mode;
  document.getElementById('kosoNone').classList.toggle('selected', mode==='none');
  document.getElementById('kosoYes').classList.toggle('selected',  mode==='yes');
  document.getElementById('kosoDetail').style.display = mode==='yes' ? 'block' : 'none';
  if (mode === 'none') { d.kosoEquip = []; d.kosoSupply = null; }
  document.getElementById('next13').disabled = false;
}

// 高所作業の使用機材を選択する
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
// 特記事項入力欄の表示/非表示を切り替える
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
// アーム取付情報をレポート用テキストに変換する
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

// グループのarmDataからアームテキストを生成する
function buildGroupArmText(groups) {
  if (!groups || groups.length === 0) return '';
  var totals = { wall: 0, pole: 0, ceil: 0, none: 0 };
  groups.forEach(function(g) {
    var ad = g.armData || {};
    totals.wall += ad.wall || 0;
    totals.pole += ad.pole || 0;
    totals.ceil += ad.ceil || 0;
    totals.none += ad.none || 0;
  });
  var lines = [];
  if (totals.wall > 0) lines.push('アーム　　：壁付けアーム × ' + totals.wall + '台');
  if (totals.pole > 0) lines.push('アーム　　：ポールマウント × ' + totals.pole + '台');
  if (totals.ceil > 0) lines.push('アーム　　：天井吊り下げ × ' + totals.ceil + '台');
  if (totals.none > 0) lines.push('アーム　　：アームなし × ' + totals.none + '台');
  return lines.length ? lines.join('\n') : '';
}

// カメラ台数情報をレポート用テキストに変換する
function buildCameraText(counts, other) {
  const lines = DEVICE_DEFS
    .filter(({ key }) => (counts[key]||0) > 0)
    .map(({ key }) => `　 ${key}：${counts[key]}台`);
  if (other) lines.push('　 その他：' + other);
  return lines.length ? lines.join('\n') : '　 未選択';
}

// 作業日程をレポート用テキストに変換する
function buildWorkDateText(r) {
  if (r.kojiType === '仮設') {
    return `設置日　　：${r.installDate}\n撤去日　　：${r.removeDate}`;
  }
  const label = r.kojiType === '撤去' ? '撤去日' : '設置日';
  return `${label}　　：${r.workDate}`;
}

// 作業計画（日数・休日・夜間等）をレポート用テキストに変換する
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

// currentReport オブジェクト全体をレポートテキストに変換する
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

// フォームの入力値から currentReport を生成し結果パネルに表示する
function generateReport() {
  let kosoLine = '高所作業　：なし';
  if (kosoMode === 'yes') {
    const equip = (d.kosoEquip||[]).join('・') || '機材未選択';
    const supply = d.kosoSupply || '準備方法未選択';
    kosoLine = `高所作業　：あり\n使用機材　：${equip}\n${equip}準備方法：${supply}`;
  }
  let tokuLine = 'なし';
  if (tokuMode === 'yes') tokuLine = document.getElementById('tokuText').value || '詳細未入力';

  const ipTotal    = powerGroups.reduce((s, g) => s + (g.camIP || 0), 0);
  const sterTotal  = powerGroups.reduce((s, g) => s + (g.camStereo || 0), 0);
  const cameraCounts = Object.assign({}, d.cameraCounts, {
    'IPカメラ': ipTotal || (d.cameraCounts['IPカメラ'] || 0),
    'ステレオカメラ': sterTotal || (d.cameraCounts['ステレオカメラ'] || 0),
  });
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
    armText:      buildGroupArmText(powerGroups) || buildArmText(d.armData),
    wiring:       d.wiring || '未選択',
    lanLength:    document.getElementById('lanLength').value,
    wireSupport:  document.getElementById('wireSupport').value,
    powerGroups:  JSON.parse(JSON.stringify(powerGroups||[])),
    kosoLine, tokuLine,
    kosoEquip:    JSON.parse(JSON.stringify(d.kosoEquip||[])),
    kosoSupply:   d.kosoSupply || '',
    workPlan:     JSON.parse(JSON.stringify(d.workPlan||{})),
  };

  showReport(currentReport);
}

// レポートを結果パネルに表示する（フォーム生成・JSON読込・保存済み復元で共通利用）
function showReport(r) {
  currentReport = r;
  document.getElementById('resultTitle').textContent = r.workDate + ' — ' + r.siteName;
  document.getElementById('resultBox').textContent   = buildText(r);
  document.getElementById('stepsContainer').style.display = 'none';
  document.getElementById('progressWrap').style.display   = 'none';
  document.getElementById('resultPanel').classList.add('active');
  renderEstimate(r);
}

// ══════════════════════════════════════
// コピー・保存・ダウンロード
// ══════════════════════════════════════
// テキストをクリップボードにコピーする
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('コピーしました！', 'green'))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}
// clipboard API が使えない場合のコピーフォールバック処理
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
// 現在のレポートをクリップボードにコピーする
function copyReport() {
  copyText(buildText(currentReport));
}
// モーダル表示中のレポートをクリップボードにコピーする
function copyModalReport() {
  if (!modalReport) return;
  copyText(buildText(modalReport));
}
// 現在のレポートを localStorage に保存する
function saveReport() {
  if (!currentReport) return;
  const list = getSaved();
  if (list.find(r => r.id === currentReport.id)) { showToast('すでに保存済みです'); return; }
  list.unshift(currentReport);
  setSaved(list);
  updateBadge();
  showToast('アプリ内に保存しました！', 'green');
}
// レポートのダウンロードファイル名（日付_現場名.txt）を生成する
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
// 現在のレポートを .txt ファイルでダウンロードする
function downloadSingle() {
  if (!currentReport) return;
  dl(buildText(currentReport), getFileName(currentReport));
  showToast('ファイルを書き出しました！', 'green');
}

// 現在のレポートを .json ファイルでダウンロードする（再読込・復元用）
function downloadJson() {
  if (!currentReport) return;
  const r = currentReport;
  const sn = (r.siteName || '現場').replace(/[\\\/:\*\?"<>\|]/g,'_');
  let dateStr = 'nodate';
  if (r.createdAt) {
    const parts = r.createdAt.replace(/\//g,'-').split('-');
    if (parts.length === 3) dateStr = parts[0] + parts[1].padStart(2,'0') + parts[2].padStart(2,'0');
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' }));
  a.download = dateStr + '_' + sn + '_data.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('JSONファイルを書き出しました！', 'green');
}

// JSONファイルを読み込んでレポートを結果パネルに表示する
function loadFromJson(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const r = JSON.parse(e.target.result);
      if (!r || !r.siteName) throw new Error('invalid');
      showReport(r);
      switchTab('input');
      showToast('JSONを読み込みました！', 'green');
    } catch(err) {
      showToast('JSONの読み込みに失敗しました', 'red');
    }
    input.value = '';
  };
  reader.readAsText(file);
}
// 保存済み全件を1つの .txt ファイルでダウンロードする
function exportAll() {
  const list = getSaved();
  if (!list.length) { showToast('保存済みデータがありません', 'red'); return; }
  const text = list.map(r => buildText(r)).join('\n\n' + '═'.repeat(40) + '\n\n');
  const today = new Date();
  const fname = today.getFullYear()+'_'+String(today.getMonth()+1).padStart(2,'0')+'_'+String(today.getDate()).padStart(2,'0')+'_現調レポート全件.txt';
  dl(text, fname);
  showToast('全' + list.length + '件を書き出しました！', 'green');
}
// テキストをファイルとしてダウンロードする汎用関数
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
// localStorage から保存済みレポート一覧を取得する
function getSaved() { try { return JSON.parse(localStorage.getItem('gencho_v4')) || []; } catch { return []; } }
// 保存済みレポート一覧を localStorage に保存する
function setSaved(list) { localStorage.setItem('gencho_v4', JSON.stringify(list)); }
// 指定IDのレポートを localStorage から削除する
function deleteSaved(id) {
  setSaved(getSaved().filter(r => r.id !== id));
  updateBadge(); renderList();
  showToast('削除しました', 'red');
}
// 保存済みレポートを全件削除する
function deleteAllSaved() {
  setSaved([]);
  updateBadge(); renderList();
  showToast('全件削除しました', 'red');
}
// タブの保存済み件数バッジを更新する
function updateBadge() {
  const n = getSaved().length;
  document.getElementById('savedCount').textContent = n ? '(' + n + ')' : '';
}

// ══════════════════════════════════════
// 確認ダイアログ
// ══════════════════════════════════════
// 確認ダイアログのOKボタン押下時のコールバック関数
let confirmCallback = null;
// 確認ダイアログを表示する
function showConfirm(icon, title, msg, cb) {
  document.getElementById('confirmIcon').textContent = icon;
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent = msg;
  confirmCallback = cb;
  document.getElementById('confirmOverlay').classList.add('active');
  document.getElementById('confirmOkBtn').onclick = () => { closeConfirm(); cb(); };
}
// 確認ダイアログを閉じる
function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('active');
  confirmCallback = null;
}
// 1件削除の確認ダイアログを表示する
function confirmDeleteOne(id, name) {
  showConfirm('🗑️', '削除しますか？', name + '\nこの操作は取り消せません。', () => deleteSaved(id));
}
// 全件削除の確認ダイアログを表示する
function confirmDeleteAll() {
  const n = getSaved().length;
  if (!n) { showToast('保存済みデータがありません', 'red'); return; }
  showConfirm('⚠️', '全件削除しますか？', n + '件のレポートをすべて削除します。\nこの操作は取り消せません。', () => deleteAllSaved());
}

// ══════════════════════════════════════
// 保存一覧レンダリング
// ══════════════════════════════════════
// レポートの日付を一覧表示用のラベルテキストに変換する
function formatDateLabel(r) {
  const raw = r.workDate || '';
  if (!raw || raw === '未選択') return '日付未定';
  const parts = raw.split('-');
  if (parts.length === 3) {
    return parts[0] + '.' + parts[1].padStart(2,'0') + '.' + parts[2].padStart(2,'0');
  }
  return raw;
}
// 保存済みレポート一覧を描画する
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

// カード編集用の入力欄HTMLを生成する
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

// カード編集入力欄の表示/非表示を切り替える
function toggleCeditInput(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'block';
}
// 保存済みカードの編集モードをトグルする
function toggleCardEdit(rid) {
  const panel = document.getElementById('cedit_'+rid);
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
}
// カード編集での選択ボタン処理
function ceditChoice(btn, rid, key, val) {
  btn.closest('div').querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  if (!window._ceditTmp) window._ceditTmp = {};
  if (!window._ceditTmp[rid]) window._ceditTmp[rid] = {};
  window._ceditTmp[rid][key] = val;
}
// カード編集内容を保存する
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
// 保存済みリストから指定レポートをダウンロードする
function downloadFromList(id) {
  const r = getSaved().find(x => x.id === id);
  if (!r) return;
  // .txt 書き出し
  dl(buildText(r), getFileName(r));
  // .json 書き出し
  const sn = (r.siteName || '現場').replace(/[\\\/:\*\?"<>\|]/g,'_');
  let dateStr = 'nodate';
  if (r.createdAt) {
    const parts = r.createdAt.replace(/\//g,'-').split('-');
    if (parts.length === 3) dateStr = parts[0] + parts[1].padStart(2,'0') + parts[2].padStart(2,'0');
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' }));
  a.download = dateStr + '_' + sn + '_data.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('.txt と .json を書き出しました！', 'green');
}

// ══════════════════════════════════════
// モーダル
// ══════════════════════════════════════
// 保存済みレポートをモーダルで開く
function openModal(id) {
  modalReport = getSaved().find(r => r.id === id);
  if (!modalReport) return;
  document.getElementById('modalTitle').textContent = formatDateLabel(modalReport) + '　' + (modalReport.siteName||'');
  document.getElementById('modalBody').textContent  = buildText(modalReport);
  renderModalEstimate(modalReport);
  document.getElementById('modalOverlay').classList.add('active');
}

// モーダル内に概算見積を表示する
function renderModalEstimate(r) {
  const el = document.getElementById('modalEstimate');
  if (!el) return;
  const est = calcEstimate(r);
  if (est.camTotal === 0 && (r.powerGroups || []).length === 0) {
    el.style.display = 'none';
    return;
  }
  const rows = est.lines.map(function(l) {
    const valStr = l.val !== null && l.val !== undefined
      ? fmtYen(l.val)
      : (l.min === 0 ? `〜${fmtYen(l.max)}` : `${fmtYen(l.min)}〜${fmtYen(l.max)}`);
    return `<div class="estimate-row"><span class="estimate-row-label">${l.label}</span><span class="estimate-row-val">${valStr}</span></div>`;
  }).join('');
  const transportRows = buildTransportRows(r);
  const transportHtml = transportRows.length > 0
    ? '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">'
      + '<div style="font-size:11px;color:var(--text-dim);font-weight:700;margin-bottom:6px;">🚗 交通費参考（施工費とは別）</div>'
      + transportRows.map(function(row) {
          return `<div class="estimate-row"><span class="estimate-row-label">${row.label}</span><span class="estimate-row-val">${row.val}</span></div>`;
        }).join('')
      + '</div>'
    : '';
  el.innerHTML = `
    <div class="estimate-section" style="display:block;margin:0;">
      <div class="estimate-section-title">💰 概算見積（施工費のみ・機器代金別途）</div>
      ${rows}
      <div class="estimate-total-row">
        <span class="estimate-total-label">最終概算合計（税抜）</span>
        <span class="estimate-total-val">${fmtYen(est.total)}</span>
      </div>
      ${est.hasRange ? `<div class="estimate-range">※変動項目を含む場合の幅：${fmtYen(est.finalMin)}〜${fmtYen(est.finalMax)}</div>` : ''}
      ${transportHtml}
      <div class="estimate-note">※施工費のみの概算です。実際の費用は現場状況により変動します。</div>
    </div>`;
  el.style.display = 'block';
}
// モーダルを閉じる
function closeModal(e) {
  if (!e || e.target === document.getElementById('modalOverlay'))
    document.getElementById('modalOverlay').classList.remove('active');
}
// モーダル表示中のレポートをダウンロードする
function downloadModal() {
  if (!modalReport) return;
  dl(buildText(modalReport), getFileName(modalReport));
  showToast('ファイルを書き出しました！', 'green');
}

// ══════════════════════════════════════
// リセット・タブ
// ══════════════════════════════════════
// フォームと状態を全リセットして入力画面に戻る
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
// 入力タブ/保存済みタブを切り替える
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
// トースト通知の自動非表示タイマー
let toastTimer;
// 画面下部にトースト通知を表示する
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

// ダブルタップズーム防止用タイムスタンプ
let lastTouchEnd = 0;
document.addEventListener('touchend', function(e) {
  const now = Date.now();
  if (now - lastTouchEnd < 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  if (e.isComposing || e.keyCode === 229) return;
  const el = document.activeElement;
  const tag = el && el.tagName;
  // 現場名入力欄はオートコンプリートに任せるためEnterで次へ進めない
  if (el && el.id === 'siteName') { e.preventDefault(); return; }
  if (tag === 'TEXTAREA') {
    if (!e.shiftKey) { e.preventDefault(); advanceFromCurrentStep(); }
    return;
  }
  if (tag === 'INPUT') {
    e.preventDefault(); advanceFromCurrentStep();
  }
});

// 現在のステップを自動で次へ進める
function advanceFromCurrentStep() {
  if (step === 8) { tryNextStep8(); return; }
  if (step === 9) { tryNextStep9(); return; }
  const nb = document.getElementById('next'+step);
  if (nb && !nb.disabled) nb.click();
  else if (!nb) {
    const activeStep = document.querySelector('.step.active');
    const btn = activeStep && activeStep.querySelector('.next-btn:not([disabled])');
    if (btn) btn.click();
  }
}

// ══════════════════════════════════════
// 場所検索・距離計算（Google Maps Places Autocomplete）
// ══════════════════════════════════════
// Google Maps Autocompleteで選択中の場所オブジェクト
let selectedPlace = null;

// Google Maps Places Autocomplete を初期化し入力欄に紐付ける
function initAutocomplete() {
  const input = document.getElementById('siteName');
  if (!input || typeof google === 'undefined') return;

  const autocomplete = new google.maps.places.Autocomplete(input, {
    componentRestrictions: { country: 'jp' },
    fields: ['name', 'formatted_address', 'geometry', 'address_components'],
  });

  // 入力内容の変化を監視（空になったら場所情報リセット）
  input.addEventListener('input', function() {
    const val = input.value.trim();
    if (!val) {
      setLocationConfirmed(false);
      document.getElementById('locationResult').style.display = 'none';
      selectedPlace = null;
    }
    // 内容があれば「次へ」ボタンを有効化（フリーテキストでも進める）
    const nextBtn = document.getElementById('nextStep1');
    if (nextBtn) nextBtn.disabled = !val;
  });

  // autocompleteが候補を入れると input イベントが発火しないので change でも監視
  input.addEventListener('change', function() {
    const val = input.value.trim();
    const nextBtn = document.getElementById('nextStep1');
    if (nextBtn) nextBtn.disabled = !val;
    if (!val) {
      setLocationConfirmed(false);
      document.getElementById('locationResult').style.display = 'none';
      selectedPlace = null;
    }
  });

  autocomplete.addListener('place_changed', function() {
    const place = autocomplete.getPlace();
    // geometryがない = リストから選ばずEnterした or 候補なし → 場所なしで進む
    if (!place.geometry) {
      setLocationConfirmed(false);
      document.getElementById('locationResult').style.display = 'none';
      selectedPlace = null;
      return;
    }
    onPlaceSelected(place);
  });

  // 初期状態：入力があれば次へ有効
  const nextBtn = document.getElementById('nextStep1');
  if (nextBtn) nextBtn.disabled = !input.value.trim();

  // APIコールバック前に入力されていた場合を補完
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

// 選択場所の都道府県名を返す
function getPrefecture(place) {
  const comps = place.address_components || [];
  const pref = comps.find(c => c.types.includes('administrative_area_level_1'));
  return pref ? pref.long_name : null;
}

// 都道府県に対応する担当拠点の配列を返す
function getTargetOffices(prefecture) {
  if (!prefecture) return OFFICES; // 不明なら全拠点

  const matched = OFFICES.filter(o => o.prefectures.includes(prefecture));
  if (matched.length === 0) return OFFICES; // マッチなしなら全拠点

  // 関西・九州のnearGroupは両方まとめて返す（近い方は距離で後判定）
  const hasNearGroup = matched.some(o => o.nearGroup);
  if (hasNearGroup) {
    const groups = [...new Set(matched.filter(o => o.nearGroup).map(o => o.nearGroup))];
    const extras = OFFICES.filter(o => groups.includes(o.nearGroup) && !matched.includes(o));
    return [...matched, ...extras];
  }
  return matched;
}

// Autocompleteで場所が選択されたときの処理（距離計算・Step6スキップ）
function onPlaceSelected(place) {
  selectedPlace = place;
  const resultEl = document.getElementById('locationResult');

  d.sitePlaceName = place.name || '';
  d.siteAddress = place.formatted_address || '';
  d.siteLatLng = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
  setLocationConfirmed(true); // Step6をスキップ

  const prefecture = getPrefecture(place);
  const offices = getTargetOffices(prefecture);

  resultEl.style.display = 'block';
  resultEl.innerHTML = '<div style="font-size:12px;color:var(--text-dim);padding:12px 0;">🚗 距離・料金を計算中...</div>';

  calcDistanceMulti(place, offices, resultEl);
}

// 複数拠点から現場までの距離をDistance Matrix APIで一括取得し表示する
function calcDistanceMulti(place, offices, resultEl) {
  const service = new google.maps.DistanceMatrixService();
  service.getDistanceMatrix({
    origins: offices.map(o => o.address),
    destinations: [place.geometry.location],
    travelMode: google.maps.TravelMode.DRIVING,
    unitSystem: google.maps.UnitSystem.METRIC,
  }, function(resp, status) {
    if (status !== 'OK') {
      resultEl.innerHTML = '<div style="font-size:12px;color:var(--danger);padding:8px 0;">距離の取得に失敗しました</div>';
      return;
    }

    // 結果を整理
    const results = offices.map(function(o, i) {
      const el = resp.rows[i].elements[0];
      if (el.status !== 'OK') return null;
      return {
        office: o,
        distM: el.distance.value,
        distKm: (el.distance.value / 1000).toFixed(1),
        mins: Math.round(el.duration.value / 60),
      };
    }).filter(Boolean);

    if (!results.length) {
      resultEl.innerHTML = '<div style="font-size:12px;color:var(--danger);padding:8px 0;">ルートが見つかりませんでした</div>';
      return;
    }

    // nearGroup（関西・九州）は近い方だけ残す
    const nearGroups = [...new Set(results.map(r => r.office.nearGroup).filter(Boolean))];
    let filtered = [...results];
    nearGroups.forEach(function(grp) {
      const grpItems = results.filter(r => r.office.nearGroup === grp);
      const nearest = grpItems.reduce((a, b) => a.distM < b.distM ? a : b);
      grpItems.forEach(function(item) {
        if (item !== nearest) filtered = filtered.filter(r => r !== item);
      });
    });

    d.officeDistances = filtered.map(r => ({
      company: r.office.company, name: r.office.name,
      distKm: r.distKm, distM: r.distM, mins: r.mins
    }));

    // 表示
    const placeName = place.name || '';
    const placeAddr = place.formatted_address || '';
    let html = '<div class="location-result-card">'
      + '<div class="location-result-title">📍 ' + placeName + '</div>'
      + '<div class="location-result-row"><span class="location-result-label">住所</span>'
      + '<span class="location-result-val" style="font-size:11px;max-width:65%;text-align:right;">' + placeAddr + '</span></div>';

    filtered.forEach(function(r) {
      const toll = calcTransportLabel(r.distKm, r.distM, null);
      html += '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">'
        + '<div style="font-size:11px;font-weight:700;color:var(--accent2);margin-bottom:6px;">🏢 ' + r.office.company + '（' + r.office.name + '）</div>'
        + '<div class="location-result-row"><span class="location-result-label">距離</span><span class="location-result-val">' + r.distKm + ' km</span></div>'
        + '<div class="location-result-row"><span class="location-result-label">所要時間</span><span class="location-result-val">' + r.mins + ' 分</span></div>'
        + '<div class="location-result-row"><span class="location-result-label">交通費概算（1日）</span><span class="location-result-val">' + toll + '</span></div>'
        + '</div>';
    });

    html += '</div>';
    resultEl.innerHTML = html;
  });
}

// ══════════════════════════════════════
// 交通費計算
// ══════════════════════════════════════
// 距離・日数から交通費の概算テキストを生成する
// days: 作業日数（nullの場合は1日として計算）
function calcTransportLabel(distKm, distM, days) {
  if (distM <= 20000) return '不要（目安）';
  const oneway = parseFloat(distKm);
  const roundTrip = Math.round(oneway * 2 * 110 * 1.1);
  const d = (!days || days <= 1) ? 1 : days;
  if (d <= 1) {
    return '¥' + roundTrip.toLocaleString() + '程度（往復ETC込）';
  }
  if (oneway >= 100) {
    // 宿泊パターン：往復交通費 + 宿泊費¥10,000×日数
    const total = roundTrip + (10000 * d);
    return '¥' + total.toLocaleString() + '程度（往復ETC込＋宿泊' + d + '日）';
  }
  // 日帰り複数日：往復×日数
  return '¥' + (roundTrip * d).toLocaleString() + '程度（往復ETC込×' + d + '日）';
}

// ══════════════════════════════════════
// Step 6：住所入力→ジオコード→距離計算
// ══════════════════════════════════════
// Step6の「次へ」処理（住所入力時はジオコーディングして距離計算）
function next6WithGeocode() {
  const addrText = (document.getElementById('areaDetail') && document.getElementById('areaDetail').value || '').trim();
  if (!addrText) {
    // 住所なし：そのまま次へ
    nextStep();
    return;
  }

  const btn = document.getElementById('next6');
  if (btn) { btn.disabled = true; btn.textContent = '📡 取得中...'; }

  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: addrText }, function(results, status) {
    if (btn) { btn.disabled = false; btn.textContent = '次へ →'; }

    if (status !== 'OK' || !results.length) {
      // ジオコード失敗：距離なしで次へ
      console.warn('Geocode failed:', status);
      nextStep();
      return;
    }

    const result = results[0];
    const mockPlace = {
      name: addrText,
      formatted_address: result.formatted_address,
      geometry: result.geometry,
    };

    // ステップ1の結果欄を再利用して表示（Step6には表示欄がないのでlocationResultへ）
    const resultEl = document.getElementById('locationResult');
    if (resultEl) {
      resultEl.style.display = 'block';
    }

    // 距離計算後に次ステップへ
    calcDistanceMultiThen(mockPlace, OFFICES, function() {
      setLocationConfirmed(true);
      nextStep();
    });
  });
}

// コールバック付きの複数拠点距離計算（Step6ジオコーディング後に使用）
// calcDistanceMulti のコールバック付き版
function calcDistanceMultiThen(place, offices, callback) {
  const service = new google.maps.DistanceMatrixService();
  service.getDistanceMatrix({
    origins: offices.map(o => o.address),
    destinations: [place.geometry.location],
    travelMode: google.maps.TravelMode.DRIVING,
    unitSystem: google.maps.UnitSystem.METRIC,
  }, function(resp, status) {
    if (status !== 'OK') {
      if (callback) callback();
      return;
    }

    const results = offices.map(function(o, i) {
      const el = resp.rows[i].elements[0];
      if (el.status !== 'OK') return null;
      return {
        office: o,
        distM: el.distance.value,
        distKm: (el.distance.value / 1000).toFixed(1),
        mins: Math.round(el.duration.value / 60),
      };
    }).filter(Boolean);

    if (!results.length) {
      if (callback) callback();
      return;
    }

    const nearGroups = [...new Set(results.map(r => r.office.nearGroup).filter(Boolean))];
    let filtered = [...results];
    nearGroups.forEach(function(grp) {
      const grpItems = results.filter(r => r.office.nearGroup === grp);
      const nearest = grpItems.reduce((a, b) => a.distM < b.distM ? a : b);
      grpItems.forEach(function(item) {
        if (item !== nearest) filtered = filtered.filter(r => r !== item);
      });
    });

    d.officeDistances = filtered.map(r => ({
      company: r.office.company, name: r.office.name,
      distKm: r.distKm, distM: r.distM, mins: r.mins
    }));
    d.siteAddress = place.formatted_address || place.name || '';

    if (callback) callback();
  });
}
