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
const TOTAL = 14;
// 選択可能な機器種別の定義（キー名・アイコン）
const DEVICE_DEFS = [
  { key: 'IPカメラ',     icon: '📷' },
  { key: 'ステレオカメラ', icon: '📸' },
  { key: 'サイネージ',   icon: '🖥️' },
  { key: 'Lidar',       icon: '📡' },
];

// アーム種別ごとの取付方法と単価。天吊ボルト・不明は数量ではなくトグル（後段で別管理）
const ARM_METHODS = {
  wall: [
    { key: 'ビス',      price: 0 },
    { key: 'アーム',    price: 10000 },
    { key: 'マグネット', price: 10000 },
    { key: 'ブラケット', price: 25000 },
  ],
  pole: [
    { key: 'マウント',   price: 5000 },
    { key: 'ブラケット', price: 25000 },
    { key: 'パラペット', price: 20000 },
  ],
  ceil: [
    { key: 'ビス',      price: 0 },
    { key: 'アーム',    price: 10000 },
    { key: 'マグネット', price: 10000 },
  ],
};
const ARM_LABELS = { wall: '🔩 壁付け', pole: '🏗️ ポール', ceil: '⬆️ 天井', none: '🚫 なし' };

// Lidar専用アーム種別（カメラとは別系統。台数管理し、Lidar台数と一致が必要）
const LIDAR_ARM_METHODS = [
  { key: '仮設ポール', price: 2500 },
  { key: 'Lアングル',  price: 5000 },
  { key: 'ボックス',   price: 10000 },
];
// 1システムあたりのLidar設置可能台数
const LIDAR_PER_SYS = 8;

// グループのLidar台数を返す（旧データはシステム台数にフォールバック）
function lidarCountForGroup(g) {
  if (!g) return 0;
  return (g.lidarCount != null) ? (Number(g.lidarCount) || 0) : (g.count || 0);
}
// グループのLidarアーム合計台数を返す
function lidarArmTotal(g) {
  if (!g || !g.lidarArm || typeof g.lidarArm !== 'object') return 0;
  return Object.values(g.lidarArm).reduce(function(s, n) { return s + (Number(n) || 0); }, 0);
}

// 指定アーム種別の合計台数を返す。none は数値、それ以外は { method: count } の合計。
function armKeyTotal(armData, key) {
  if (!armData || armData[key] == null) return 0;
  if (key === 'none') return Number(armData.none) || 0;
  if (typeof armData[key] === 'number') return armData[key];
  return Object.values(armData[key]).reduce(function(s, n) { return s + (Number(n) || 0); }, 0);
}

// 数量管理されているアーム（壁付け/ポール/天井/なし）の合計。天吊ボルト・不明トグルは含まない。
function armQtyTotal(armData) {
  return armKeyTotal(armData, 'wall') + armKeyTotal(armData, 'pole')
       + armKeyTotal(armData, 'ceil') + armKeyTotal(armData, 'none');
}

// グループ全体のアーム合計。天吊ボルト・不明トグルONならcam全部とみなす
function armTotalForGroup(g) {
  if (!g) return 0;
  var ad = g.armData || {};
  var camN = (g.camIP || 0) + (g.camStereo || 0);
  if (ad.boltOn) return camN;
  if (ad.unknownOn) return camN;
  return armQtyTotal(ad);
}

// アプリ全体の状態変数（step:現在ステップ / d:入力値 / kosoMode:高所作業 / tokuMode:特記事項 / currentReport:生成済みレポート / modalReport:モーダル表示中レポート）
let step = 1, d = {}, kosoMode = null, tokuMode = null, currentReport = null, modalReport = null;
// d の初期値設定
d.systemCount  = 1;
d.armData      = {};
d.dateData = { single:{mode:'confirm'}, install:{mode:'confirm'}, remove:{mode:'confirm'} };
d.lanChange = {};
d.lanSegments = [];
// LAN区間のID採番カウンター
let lanSegId = 0;
d.poleCount     = 1;
d.poleBatchMode = true;
d.poleItems     = [{ excavation: null, finish: null }];

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
  syncSystemTotal();
  const sysTotal = d.systemCount || 1;
  const elTotal = document.getElementById('powerTotalNum');
  if (elTotal) elTotal.textContent = sysTotal;
  if (powerGroups.length === 0) addPowerGroup();
  renderPowerGroups();
}

// グループ合計のシステム台数を d.systemCount に同期する
function syncSystemTotal() {
  d.systemCount = Math.max(1, powerGroups.reduce(function(s,g){return s+(g.count||0);}, 0));
}

// 電源供給グループを1件追加する
function addPowerGroup() {
  powerGroups.push({
    id: ++powerGid,
    groupName: '',
    count: 1,
    power: null,
    distMode: '1m以内', distVal: 1,
    newType: null,
    newDistMode: '10m以下', newDistVal: 10,
    pipe: null, pipeType: null,
    open: true,
    deviceType: 'camera',
    camIP: 0,
    camStereo: 0,
    armData: {},
    memo: '',
  });
  syncSystemTotal();
  if (document.getElementById('groupCamArmList')) renderGroupCamArmList();
  if (document.getElementById('powerGroupList')) renderPowerGroups();
}

// 電源供給グループ一覧をDOMに描画する
function renderPowerGroups() {
  var listEl = document.getElementById('powerGroupList');
  if (!listEl) return;
  syncSystemTotal();
  var sysTotal = d.systemCount || 1;
  var assignedEl = document.getElementById('powerAssignedNum');
  if (assignedEl) assignedEl.textContent = sysTotal;
  var totalEl = document.getElementById('powerTotalNum');
  if (totalEl) totalEl.textContent = sysTotal;
  var badge = document.getElementById('powerStatusBadge');
  var nextBtn = document.getElementById('next10');
  var allDone = powerGroups.length > 0 && powerGroups.every(function(g){return isPowerGroupComplete(g);});
  if (allDone) {
    if (badge) { badge.className = 'arm-status-badge ok'; badge.textContent = '✓ 完了'; }
    if (nextBtn) nextBtn.disabled = false;
  } else {
    if (badge) { badge.className = 'arm-status-badge warn'; badge.textContent = '未入力あり'; }
    if (nextBtn) nextBtn.disabled = true;
  }
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
    '</div>';
  header.addEventListener('click', function() {
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
    '<div class="cnt-val" style="font-size:18px;">' + g.count + ' 台</div>';
  body.appendChild(countRow);

  if (g.deviceType === 'camera') {
    var totalCam = (g.camIP || 0) + (g.camStereo || 0);
    var camRow = document.createElement('div');
    camRow.className = 'power-count-row';
    camRow.innerHTML =
      '<div class="power-count-label">📷 カメラ台数</div>' +
      '<div class="cnt-val" style="font-size:18px;">' + totalCam + ' 台</div>';
    body.appendChild(camRow);
  }

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
      dr.innerHTML='<span style="font-size:12px;color:var(--text-dim);">距離</span><div class="camera-count-ctrl"><button class="cnt-btn" id="pgdv_m_'+g.id+'"'+(g.distVal<=1?' disabled':'')+'>−</button><input type="number" inputmode="decimal" min="1" class="cnt-val cnt-input" id="pgdv_v_'+g.id+'" style="font-size:18px;width:56px;text-align:center;" value="'+g.distVal+'"><button class="cnt-btn" id="pgdv_p_'+g.id+'">＋</button><span style="font-size:11px;color:var(--text-dim);">m</span></div>';
      dr.querySelector('#pgdv_m_'+g.id).addEventListener('click', function(){ pgChange(g.id,'distVal',-1); });
      dr.querySelector('#pgdv_p_'+g.id).addEventListener('click', function(){ pgChange(g.id,'distVal',1); });
      dr.querySelector('#pgdv_v_'+g.id).addEventListener('input', function(){ pgSetNum(g.id,'distVal',this.value); });
      dr.querySelector('#pgdv_v_'+g.id).addEventListener('blur', function(){ renderPowerGroups(); });
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
        ndr.innerHTML='<span style="font-size:12px;color:var(--text-dim);">距離</span><div class="camera-count-ctrl"><button class="cnt-btn" id="pgndv_m_'+g.id+'"'+(g.newDistVal<=10?' disabled':'')+'>−</button><input type="number" inputmode="decimal" min="10" class="cnt-val cnt-input" id="pgndv_v_'+g.id+'" style="font-size:18px;width:56px;text-align:center;" value="'+g.newDistVal+'"><button class="cnt-btn" id="pgndv_p_'+g.id+'">＋</button><span style="font-size:11px;color:var(--text-dim);">m</span></div>';
        ndr.querySelector('#pgndv_m_'+g.id).addEventListener('click', function(){ pgChange(g.id,'newDistVal',-10); });
        ndr.querySelector('#pgndv_p_'+g.id).addEventListener('click', function(){ pgChange(g.id,'newDistVal',10); });
        ndr.querySelector('#pgndv_v_'+g.id).addEventListener('input', function(){ pgSetNum(g.id,'newDistVal',this.value); });
        ndr.querySelector('#pgndv_v_'+g.id).addEventListener('blur', function(){ renderPowerGroups(); });
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
      [['VE管(塩ビ)','🟡 VE管(塩ビ)'],['P薄鋼電線管','🔩 P薄鋼電線管'],['Pドブ付(溶融亜鉛めっき)','⚙️ Pドブ付'],['露出','📎 露出'],['モール','📏 モール']].forEach(function(pair) {
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
  // タイトルだけリアルタイム更新（再描画なし）
  document.querySelectorAll('.power-group-card').forEach(function(card) {
    var titleEl = card.querySelector('.power-group-title');
    if (titleEl && card.dataset && card.dataset.gid == String(id)) {
      titleEl.textContent = (val && val.trim()) ? val.trim() : ('グループ ' + (powerGroups.findIndex(x=>x.id===id)+1));
    }
  });
}
// グループのメモを更新する
function pgSetMemo(id, val) {
  const g = powerGroups.find(x => x.id===id); if(!g) return;
  g.memo = val;
}
// グループのデバイス種別を切り替える
function pgSetDeviceType(id, type) {
  const g = powerGroups.find(x => x.id===id); if(!g) return;
  g.deviceType = type;
  if (type !== 'camera') {
    g.camIP = 0;
    g.camStereo = 0;
    g.armData = {};
  }
  if (type === 'lidar') {
    if (g.lidarCount == null) g.lidarCount = g.count || 1;
    if (!g.lidarArm || typeof g.lidarArm !== 'object') g.lidarArm = {};
  } else {
    g.lidarArm = {};
  }
  renderGroupCamArmList();
}
// グループの数値項目を増減する（count, distVal, newDistVal）
function pgChange(id, key, delta) {
  const g = powerGroups.find(x => x.id===id); if(!g) return;
  const min = key==='newDistVal' ? 10 : 1;
  g[key] = Math.max(min, (g[key]||min) + delta);
  if (key === 'count') {
    if (g.deviceType === 'camera') {
      // カメラ＋アームの合計が新しい上限を超える場合は調整
      var maxCam = g.count * 3;
      while ((g.camIP || 0) + (g.camStereo || 0) > maxCam) {
        if ((g.camStereo || 0) > 0) g.camStereo--;
        else if ((g.camIP || 0) > 0) g.camIP--;
        else break;
      }
    } else if (g.deviceType === 'lidar') {
      // Lidar台数を新しい上限（sys×8）に丸め、アーム合計も追従させる
      var maxLidar = g.count * LIDAR_PER_SYS;
      if (lidarCountForGroup(g) > maxLidar) g.lidarCount = maxLidar;
      clampLidarArm(g);
    }
    syncSystemTotal();
  }
  if (document.getElementById('groupCamArmList')) renderGroupCamArmList();
  if (document.getElementById('powerGroupList')) renderPowerGroups();
}
// グループの数値項目を直接入力でセットする（distVal, newDistVal）
function pgSetNum(id, key, val) {
  const g = powerGroups.find(x => x.id===id); if(!g) return;
  const min = key==='newDistVal' ? 10 : 1;
  var n = parseFloat(val);
  if (isNaN(n) || n < min) n = min;
  g[key] = n;
}
// グループの開閉状態を切り替える
function pgToggle(id) {
  const g = powerGroups.find(x => x.id===id); if(!g) return;
  g.open = !g.open;
  if (document.getElementById('groupCamArmList')) renderGroupCamArmList();
  if (document.getElementById('powerGroupList')) renderPowerGroups();
}
// グループを削除する
function pgDelete(id) {
  powerGroups = powerGroups.filter(x => x.id!==id);
  syncSystemTotal();
  if (document.getElementById('groupCamArmList')) renderGroupCamArmList();
  if (document.getElementById('powerGroupList')) renderPowerGroups();
}
// 設置場所（屋内/屋外）を選択しポール設置セクションの表示を切り替える
function pickLocation(btn, val) {
  btn.closest('.btn-grid').querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  d.location = val;
  const poleSection = document.getElementById('poleSection');
  if (poleSection) poleSection.style.display = val === '屋外' ? 'block' : 'none';
  if (val === '屋内') {
    d.poleNew = null;
    d.poleCount = 1;
    d.poleBatchMode = true;
    d.poleItems = [{ excavation: null, finish: null }];
  }
  const nb = document.getElementById('next5');
  if (nb) nb.disabled = false;
}
// ポール新設の有無を選択し詳細セクションの表示を切り替える
function pickPole(btn, val) {
  btn.closest('.btn-grid').querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  d.poleNew = val;
  const cfg = document.getElementById('poleConfigSection');
  if (cfg) cfg.style.display = val === 'あり' ? 'block' : 'none';
  if (val === 'なし') {
    d.poleCount = 1;
    d.poleBatchMode = true;
    d.poleItems = [{ excavation: null, finish: null }];
  } else if (val === 'あり') {
    if (!Array.isArray(d.poleItems) || d.poleItems.length === 0) {
      d.poleItems = [{ excavation: null, finish: null }];
    }
    if (!d.poleCount || d.poleCount < 1) d.poleCount = 1;
    if (typeof d.poleBatchMode !== 'boolean') d.poleBatchMode = true;
    renderPoleEditor();
  }
}

// ポール本数を増減する（最低1本）
function pcntChange(delta) {
  const next = Math.max(1, (d.poleCount || 1) + delta);
  d.poleCount = next;
  // 個別モードのときは items の長さを揃える
  if (!d.poleBatchMode) {
    if (d.poleItems.length < next) {
      while (d.poleItems.length < next) d.poleItems.push({ excavation: null, finish: null });
    } else if (d.poleItems.length > next) {
      d.poleItems.length = next;
    }
  }
  renderPoleEditor();
}

// まとめて/個別 モード切替
function setPoleBatchMode(batch) {
  d.poleBatchMode = !!batch;
  if (batch) {
    // 個別→まとめて：先頭を残す（他の入力は破棄）
    d.poleItems = [d.poleItems[0] || { excavation: null, finish: null }];
  } else {
    // まとめて→個別：先頭の内容を本数分に複製
    const tmpl = d.poleItems[0] || { excavation: null, finish: null };
    const n = Math.max(1, d.poleCount || 1);
    const arr = [];
    for (let i = 0; i < n; i++) arr.push({ excavation: tmpl.excavation, finish: tmpl.finish });
    d.poleItems = arr;
  }
  renderPoleEditor();
}

// ポール1本分の選択を更新
function pickPoleItem(idx, key, val) {
  if (!d.poleItems[idx]) d.poleItems[idx] = { excavation: null, finish: null };
  d.poleItems[idx][key] = val;
  renderPoleEditor();
}

// ポール編集UIを描画する（本数カウンタ・モード・行リスト）
function renderPoleEditor() {
  const cntEl = document.getElementById('poleCountVal');
  if (cntEl) cntEl.textContent = String(d.poleCount || 1);
  const batchBtn = document.getElementById('poleModeBatch');
  const indBtn   = document.getElementById('poleModeIndividual');
  if (batchBtn) batchBtn.classList.toggle('selected',  !!d.poleBatchMode);
  if (indBtn)   indBtn.classList.toggle('selected',   !d.poleBatchMode);
  const container = document.getElementById('poleItemsContainer');
  if (!container) return;
  container.innerHTML = '';

  const rows = d.poleBatchMode
    ? [{ idx: 0, title: '全 ' + (d.poleCount || 1) + ' 本に適用' }]
    : Array.from({ length: d.poleCount || 1 }, (_, i) => ({ idx: i, title: 'ポール ' + (i + 1) }));

  rows.forEach(function(row) {
    const it = d.poleItems[row.idx] || { excavation: null, finish: null };
    if (!d.poleItems[row.idx]) d.poleItems[row.idx] = it;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'border:1.5px solid var(--border);border-radius:14px;padding:12px;margin-bottom:10px;background:var(--surface2,transparent);';
    const exc = it.excavation;
    const fin = it.finish;
    const showFin = !!exc;
    wrap.innerHTML =
      '<div class="field-section-label" style="margin-bottom:8px;">📍 ' + row.title + '</div>' +
      '<div class="field-section-label" style="margin-top:4px;">⛏️ 掘削するもの</div>' +
      '<div class="btn-grid col3" style="margin-bottom:0;">' +
        '<button class="choice-btn' + (exc === '土' ? ' selected' : '') + '" data-key="excavation" data-val="土"><span class="icon">🌱</span>土</button>' +
        '<button class="choice-btn' + (exc === 'アスファルト' ? ' selected' : '') + '" data-key="excavation" data-val="アスファルト"><span class="icon">🛣️</span>アスファルト</button>' +
        '<button class="choice-btn' + (exc === 'コンクリ' ? ' selected' : '') + '" data-key="excavation" data-val="コンクリ"><span class="icon">🧱</span>コンクリ</button>' +
      '</div>' +
      '<div style="display:' + (showFin ? 'block' : 'none') + ';margin-top:12px;">' +
        '<div class="field-section-label" style="margin-top:4px;">🪣 埋設後の仕上げ</div>' +
        '<div class="btn-grid col2" style="margin-bottom:0;">' +
          '<button class="choice-btn' + (fin === 'アスファルト仕上げ' ? ' selected' : '') + '" data-key="finish" data-val="アスファルト仕上げ"><span class="icon">🛣️</span>アスファルト</button>' +
          '<button class="choice-btn' + (fin === '左官仕上げ' ? ' selected' : '') + '" data-key="finish" data-val="左官仕上げ"><span class="icon">🪣</span>左官仕上げ</button>' +
        '</div>' +
      '</div>';
    wrap.querySelectorAll('button.choice-btn').forEach(function(b) {
      b.addEventListener('click', function() {
        pickPoleItem(row.idx, b.dataset.key, b.dataset.val);
      });
    });
    container.appendChild(wrap);
  });
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
  let title;
  if (isKasetsu) title = '設置日・撤去日を設定してください';
  else if (d.kojiType === '撤去') title = '撤去日はいつですか？';
  else if (d.kojiType === '交換' || d.kojiType === '移設') title = '作業日はいつですか？';
  else title = '設置日はいつですか？';
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
  document.getElementById('progressNum').textContent = String(step).padStart(2,'0') + ' / ' + String(TOTAL).padStart(2,'0');
}
// 指定ステップを表示する
function showStep(n) {
  document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
  const t = document.querySelector('[data-step="'+n+'"]');
  if (t) t.classList.add('active');
  updateProgress();
  if (n === 3) buildDateStep();
  if (n === 7) initGroupArmStep();
  if (n === 9) initLanStep();
  if (n === 10) initPowerStep();
  if (n === 11) buildWorkStep();
}

// LAN変更確認ブロック（交換/移設のみ表示）の表示制御と選択状態の復元
function buildLanQueryVisibility() {
  const el = document.getElementById('lanChangeQuery');
  if (!el) return;
  // LAN配線が無い構成（サイネージのみ）では距離変更の確認も無意味なので非表示
  const show = (d.kojiType === '交換' || d.kojiType === '移設') && hasLanDevices();
  el.style.display = show ? 'block' : 'none';
  if (show) {
    el.querySelectorAll('.choice-btn').forEach(b=>b.classList.remove('selected'));
    const lc = d.lanChange || {};
    Object.keys(lc).forEach(key => {
      const val = lc[key];
      const btn = el.querySelector(`button[onclick*="'${key}','${val}'"]`);
      if (btn) btn.classList.add('selected');
    });
  }
}

// LAN変更の Yes/No 選択
function pickLanChange(btn, key, val) {
  btn.closest('.btn-grid').querySelectorAll('.choice-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  if (!d.lanChange) d.lanChange = {};
  d.lanChange[key] = val;
}
// アーム取付がすべて「なし」か判定する（グループarmDataを優先チェック）
function isAllNoArm() {
  // グループのarmDataを確認
  const hasGroupArm = powerGroups.some(function(g) {
    const ad = g.armData || {};
    return armKeyTotal(ad, 'wall') > 0 || armKeyTotal(ad, 'pole') > 0
        || armKeyTotal(ad, 'ceil') > 0 || !!ad.boltOn || !!ad.unknownOn;
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

// 指定ステップがスキップ対象か判定（SKIP_STEPSおよび条件付きスキップ）
function isStepSkipped(n) {
  if (SKIP_STEPS.has(n)) return true;
  // Step8（アーム手配）：すべて「なし」ならスキップ
  if (n === 8 && isAllNoArm()) return true;
  // Step9（LAN配線）：LANが必要なグループが無い（サイネージのみ等）ならスキップ
  if (n === 9 && !hasLanDevices()) return true;
  // Step13（廃材処理）：設置工事ならスキップ
  if (n === 13 && d.kojiType === '設置') return true;
  return false;
}

// エリア選択ステップをスキップして次ステップへ進む
function skipAreaStep() {
  d.area = '';
  d.areaDetail = '';
  d.officeDistances = null;
  let n = step + 1;
  while (n <= TOTAL && isStepSkipped(n)) n++;
  if (n <= TOTAL) { step = n; showStep(step); }
}
// 次のステップへ進む（スキップ対象は飛ばす）
function nextStep() {
  let n = step + 1;
  while (n <= TOTAL && isStepSkipped(n)) n++;
  if (n <= TOTAL) { step = n; showStep(step); }
}
// 前のステップへ戻る（スキップ対象は飛ばす）
function prevStep() {
  let n = step - 1;
  while (n >= 1 && isStepSkipped(n)) n--;
  if (n >= 1) { step = n; showStep(step); }
}
// 汎用選択ボタン処理（d[key]に値をセットし次へボタンを有効化）
function pick(btn, key, val) {
  btn.closest('.btn-grid').querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  d[key] = val;
  const nb = document.getElementById('next'+step);
  if (nb) nb.disabled = false;
}

// ══════════════════════════════════════
// LAN区間（Step10）
// ══════════════════════════════════════
// 配線方法の選択肢
const LAN_WIRING_OPTS = ['露出','配管','天井内'];
// 配管種別の選択肢
const LAN_PIPE_OPTS = ['VE管(塩ビ)','P薄鋼電線管','Pドブ付(溶融亜鉛めっき)','モール'];

// 配管種別アイコン・ラベル定義
const LAN_PIPE_ICONS = { 'VE管(塩ビ)':'🟡', 'P薄鋼電線管':'🔩', 'Pドブ付(溶融亜鉛めっき)':'⚙️', 'モール':'📏' };
const LAN_PIPE_LABELS = { 'VE管(塩ビ)':'VE管(塩ビ)', 'P薄鋼電線管':'P薄鋼電線管', 'Pドブ付(溶融亜鉛めっき)':'Pドブ付', 'モール':'モール' };

// グループのLAN配線初期長さ（カメラ＝カメラ台数×10／Lidar＝台数×10／サイネージ＝0）
function lanGroupDefaultLen(g) {
  if (g.deviceType === 'lidar')  return (g.count || 0) * 10;
  if (g.deviceType === 'camera') return ((g.camIP || 0) + (g.camStereo || 0)) * 10;
  return 0; // サイネージはLAN不要
}

// グループがLAN配線入力を必要とするか（サイネージ／機器0台は不要）
function groupNeedsLan(g) {
  if (!g) return false;
  if (g.deviceType === 'signage') return false;
  if (g.deviceType === 'camera')  return ((g.camIP || 0) + (g.camStereo || 0)) > 0;
  return true; // lidar
}

// LAN配線が必要なグループが1つでもあるか（サイネージのみ施工ならfalse）
function hasLanDevices() {
  return (powerGroups || []).some(groupNeedsLan);
}

// グループにLAN情報オブジェクトを用意する（無ければ初期長さ付きで作成。
// 未編集（lenTouched=false）なら台数変動に追従して初期長さを再計算）
function ensureGroupLan(g) {
  if (!g.lan) {
    g.lan = { wiring: null, pipeType: null, length: lanGroupDefaultLen(g), lenTouched: false };
  } else if (!g.lan.lenTouched) {
    g.lan.length = lanGroupDefaultLen(g);
  }
  return g.lan;
}

// Step9表示時の初期化（グループごとにLAN情報を用意し、変更確認UIも復元）
function initLanStep() {
  (powerGroups || []).forEach(function(g) {
    if (groupNeedsLan(g)) ensureGroupLan(g);
  });
  buildLanQueryVisibility();
  renderLanGroups();
}

// IDからグループを取得
function lanGroupById(gid) {
  return (powerGroups || []).find(function(g) { return g.id === gid; });
}

// グループLANの配線方法をセット
function setLanWiring(gid, val) {
  const g = lanGroupById(gid);
  if (!g) return;
  ensureGroupLan(g);
  g.lan.wiring = val;
  if (val !== '配管') g.lan.pipeType = null;
  renderLanGroups();
}

// グループLANの配管種別をセット
function setLanPipeType(gid, val) {
  const g = lanGroupById(gid);
  if (!g) return;
  ensureGroupLan(g);
  g.lan.pipeType = val;
  renderLanGroups();
}

// グループLANの長さを増減する
function lanGroupLenChange(gid, delta) {
  const g = lanGroupById(gid);
  if (!g) return;
  ensureGroupLan(g);
  g.lan.length = Math.max(0, (g.lan.length || 0) + delta);
  g.lan.lenTouched = true;
  const el = document.getElementById('lanGroupLen_' + gid);
  if (el) el.value = g.lan.length;
  updateLanTotal();
  updateLanNextBtn();
}

// グループLANの長さを直接入力でセットする
function lanGroupLenSet(gid, val) {
  const g = lanGroupById(gid);
  if (!g) return;
  ensureGroupLan(g);
  var n = parseFloat(val);
  if (isNaN(n) || n < 0) n = 0;
  g.lan.length = n;
  g.lan.lenTouched = true;
  updateLanTotal();
  updateLanNextBtn();
}

// グループLAN入力の完了判定（LAN不要グループは常に完了扱い）
function isLanGroupComplete(g) {
  if (!groupNeedsLan(g)) return true;
  if (!g.lan || !g.lan.wiring) return false;
  if (g.lan.wiring === '配管' && !g.lan.pipeType) return false;
  return true;
}

// 全グループ入力済みかどうかで次へボタンの有効化を制御
function updateLanNextBtn() {
  const nb = document.getElementById('next9');
  if (!nb) return;
  const allOk = (powerGroups || []).length > 0 && powerGroups.every(isLanGroupComplete);
  nb.disabled = !allOk;
}

// LAN合計長さを再計算してバーに反映
function updateLanTotal() {
  const total = (powerGroups || []).filter(groupNeedsLan)
    .reduce((sum, g) => sum + (g.lan ? (parseFloat(g.lan.length) || 0) : 0), 0);
  const el = document.getElementById('lanTotalNum');
  if (el) el.textContent = total;
  const bar = document.getElementById('lanTotalBar');
  if (bar) bar.style.display = hasLanDevices() ? '' : 'none';
}

// グループ別LANリストを描画する
function renderLanGroups() {
  const list = document.getElementById('lanSegmentList');
  if (!list) return;
  list.innerHTML = '';
  (powerGroups || []).forEach(function(g, idx) {
    list.appendChild(buildLanGroupDOM(g, idx));
  });
  updateLanTotal();
  updateLanNextBtn();
}

// グループ別の機器サマリー文字列を返す
function lanGroupDeviceLabel(g) {
  if (g.deviceType === 'signage') return 'サイネージ×' + (g.count || 0) + '台';
  if (g.deviceType === 'lidar')   return 'Lidar×' + (g.count || 0) + '台';
  const parts = [];
  if (g.camIP    > 0) parts.push('IPカメラ×' + g.camIP + '台');
  if (g.camStereo > 0) parts.push('ステレオ×' + g.camStereo + '台');
  return parts.length ? parts.join('・') : 'カメラ未設定';
}

// グループ1件分のLAN入力DOMノードを生成
function buildLanGroupDOM(g, idx) {
  const needsLan = groupNeedsLan(g);
  const complete = isLanGroupComplete(g);
  const lan = g.lan || {};
  const wrap = document.createElement('div');
  wrap.className = 'power-group-card' + (needsLan && complete ? ' complete' : '');
  wrap.style.marginBottom = '10px';

  const displayTitle = (g.groupName && g.groupName.trim()) ? g.groupName.trim() : 'グループ ' + (idx + 1);
  const deviceLabel = lanGroupDeviceLabel(g);

  // ヘッダー
  const header = document.createElement('div');
  header.className = 'power-group-header';
  let summary;
  if (!needsLan) {
    summary = '🖥️ LAN配線の入力は不要';
  } else if (complete) {
    summary = lan.wiring + (lan.wiring === '配管' && lan.pipeType ? '（' + lan.pipeType + '）' : '') + ' ' + (lan.length || 0) + 'm';
  } else {
    summary = '未入力（' + deviceLabel + '）';
  }
  header.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;">' +
      '<div class="power-group-num">' + (idx + 1) + '</div>' +
      '<div><div class="power-group-title">' + displayTitle + '</div>' +
      '<div class="power-group-summary">' + summary + '</div></div>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px;">' +
      '<div class="power-group-check">' + (needsLan && complete ? '✓' : '') + '</div>' +
    '</div>';
  wrap.appendChild(header);

  // 本体
  const body = document.createElement('div');
  body.className = 'power-group-body';

  // サイネージ等LAN不要グループ：入力不可メッセージのみ
  if (!needsLan) {
    const msg = document.createElement('div');
    msg.style.cssText = 'font-size:12px;color:var(--text-dim);padding:6px 2px;line-height:1.6;';
    const reason = g.deviceType === 'signage'
      ? 'サイネージはLANケーブル配線の入力は不要です。'
      : 'カメラが未設定のためLAN配線の入力はありません。';
    msg.innerHTML = '🖥️ <strong>' + deviceLabel + '</strong><br>' + reason;
    body.appendChild(msg);
    wrap.appendChild(body);
    return wrap;
  }

  // 機器サマリー
  const devLabel = document.createElement('div');
  devLabel.style.cssText = 'font-size:12px;color:var(--text-dim);margin:2px 0 8px;';
  devLabel.textContent = '📦 ' + deviceLabel;
  body.appendChild(devLabel);

  // 配線方法
  const wLabel = document.createElement('div');
  wLabel.className = 'arm-sub-label';
  wLabel.style.cssText = 'margin:6px 0 8px;';
  wLabel.textContent = '🔌 配線方法';
  body.appendChild(wLabel);

  const wGrid = document.createElement('div');
  wGrid.className = 'btn-grid col3';
  wGrid.style.marginBottom = '4px';
  LAN_WIRING_OPTS.forEach(function(opt) {
    const btn = document.createElement('button');
    btn.className = 'choice-btn' + (lan.wiring === opt ? ' selected' : '');
    const icon = opt === '露出' ? '〰️' : (opt === '配管' ? '🔲' : '🏗️');
    btn.innerHTML = '<span class="icon">' + icon + '</span>' + opt;
    btn.addEventListener('click', function() { setLanWiring(g.id, opt); });
    wGrid.appendChild(btn);
  });
  body.appendChild(wGrid);

  // 配管種別（配管選択時のみ）
  if (lan.wiring === '配管') {
    const pLabel = document.createElement('div');
    pLabel.className = 'arm-sub-label';
    pLabel.style.cssText = 'margin:12px 0 8px;';
    pLabel.textContent = '🔧 配管の種別';
    body.appendChild(pLabel);

    const pGrid = document.createElement('div');
    pGrid.className = 'btn-grid col2';
    pGrid.style.marginBottom = '4px';
    LAN_PIPE_OPTS.forEach(function(opt) {
      const btn = document.createElement('button');
      btn.className = 'choice-btn' + (lan.pipeType === opt ? ' selected' : '');
      btn.innerHTML = '<span class="icon">' + (LAN_PIPE_ICONS[opt] || '') + '</span>' + (LAN_PIPE_LABELS[opt] || opt);
      btn.addEventListener('click', function() { setLanPipeType(g.id, opt); });
      pGrid.appendChild(btn);
    });
    body.appendChild(pGrid);
  }

  // 長さ（m）— 初期値は台数×10があらかじめ入力済み
  const lLabel = document.createElement('div');
  lLabel.className = 'arm-sub-label';
  lLabel.style.cssText = 'margin:12px 0 8px;';
  lLabel.textContent = '📏 長さ（m）';
  body.appendChild(lLabel);

  const lRow = document.createElement('div');
  lRow.className = 'inline-count-ctrl';
  lRow.style.marginBottom = '4px';
  lRow.innerHTML =
    '<button class="cnt-btn" id="lanGroupMinus_' + g.id + '">−</button>' +
    '<div style="display:flex;align-items:baseline;gap:4px;">' +
      '<input type="number" inputmode="decimal" min="0" class="cnt-val cnt-input" id="lanGroupLen_' + g.id + '" style="font-size:24px;width:64px;text-align:center;" value="' + (lan.length || 0) + '">' +
      '<span style="font-size:13px;color:var(--text-dim);">m</span>' +
    '</div>' +
    '<button class="cnt-btn" id="lanGroupPlus_' + g.id + '">＋</button>';
  body.appendChild(lRow);
  lRow.querySelector('#lanGroupMinus_' + g.id).addEventListener('click', function() { lanGroupLenChange(g.id, -5); });
  lRow.querySelector('#lanGroupPlus_' + g.id).addEventListener('click', function() { lanGroupLenChange(g.id, 5); });
  lRow.querySelector('#lanGroupLen_' + g.id).addEventListener('input', function() { lanGroupLenSet(g.id, this.value); });

  wrap.appendChild(body);
  return wrap;
}

// IPカメラ＋ステレオカメラの合計台数を返す（グループデータから集計）
function getTotalCameras() {
  return powerGroups.reduce((s, g) => s + (g.camIP||0) + (g.camStereo||0), 0);
}

// 統合Step8 のバリデーション結果を返す
//   { ok: bool, issues: [string], summary: {sys, cam, signage, lidar} }
function validateGroupsForStep8() {
  var issues = [];
  var sys = 0, cam = 0, signage = 0, lidar = 0;
  if (powerGroups.length === 0) {
    issues.push('グループを1つ以上追加してください');
  }
  powerGroups.forEach(function(g, i) {
    var label = (g.groupName && g.groupName.trim()) ? '「'+g.groupName.trim()+'」' : ('グループ'+(i+1));
    sys += (g.count || 0);
    if ((g.count || 0) < 1) {
      issues.push(label + '：システム台数が0です');
    }
    if (g.deviceType === 'camera') {
      var c = (g.camIP||0) + (g.camStereo||0);
      var armT = armTotalForGroup(g);
      cam += c;
      if (c === 0) issues.push(label + '：カメラ台数を入力してください');
      else if (c > g.count * 3) issues.push(label + '：カメラ台数がシステム上限('+(g.count*3)+'台)を超えています');
      else if (armT !== c) issues.push(label + '：アーム合計('+armT+')とカメラ合計('+c+')が一致しません');
    } else if (g.deviceType === 'signage') {
      signage += g.count || 0;
    } else if (g.deviceType === 'lidar') {
      var ln = lidarCountForGroup(g);
      var ldArmT = lidarArmTotal(g);
      lidar += ln;
      if (ln < 1) issues.push(label + '：Lidar台数を入力してください');
      else if (ln > g.count * LIDAR_PER_SYS) issues.push(label + '：Lidar台数がシステム上限('+(g.count*LIDAR_PER_SYS)+'台)を超えています');
      else if (ldArmT !== ln) issues.push(label + '：アーム合計('+ldArmT+')とLidar合計('+ln+')が一致しません');
    }
  });
  return { ok: issues.length === 0, issues: issues, summary: { sys: sys, cam: cam, signage: signage, lidar: lidar } };
}

// Step8 次へ処理（統合バリデーション）
function tryNextStep7() {
  var v = validateGroupsForStep8();
  if (!v.ok) {
    showToast(v.issues[0], 'red');
    return;
  }
  nextStep();
}

// ══════════════════════════════════════
// グループ×カメラ×アーム設定ステップ（新Step9）
// ══════════════════════════════════════

// 統合Step8 初期化
function initGroupArmStep() {
  if (powerGroups.length === 0) addPowerGroup();
  renderGroupCamArmList();
}

// グループカード一覧を描画する
function renderGroupCamArmList() {
  const el = document.getElementById('groupCamArmList');
  if (!el) return;
  const frag = document.createDocumentFragment();
  powerGroups.forEach(function(g, i) {
    frag.appendChild(buildGroupCamArmDOM(g, i));
  });
  el.innerHTML = '';
  el.appendChild(frag);
  updateGroupCamStatus();
}

// グループのデバイスサマリーテキストを返す（ヘッダー用）
function groupDeviceSummary(g) {
  if (g.deviceType === 'signage') return 'サイネージ×' + (g.count || 0) + '台';
  if (g.deviceType === 'lidar')   return 'Lidar×' + lidarCountForGroup(g) + '台・arm' + lidarArmTotal(g) + '/' + lidarCountForGroup(g);
  var cam = (g.camIP || 0) + (g.camStereo || 0);
  var arm = armTotalForGroup(g);
  return 'sys' + (g.count||0) + '台・cam' + cam + '台・arm' + arm + '/' + cam;
}

// グループカード1件分のDOMを生成して返す（統合UI：種別ラジオ・メモ・カメラ＝アーム一致チェック）
function buildGroupCamArmDOM(g, idx) {
  var deviceType = g.deviceType || 'camera';
  var totalCam = (g.camIP || 0) + (g.camStereo || 0);
  var armData = g.armData || {};
  var armTotal = armTotalForGroup(g);
  var displayTitle = (g.groupName && g.groupName.trim()) ? g.groupName.trim() : 'グループ ' + (idx + 1);

  var wrap = document.createElement('div');
  wrap.className = 'power-group-card';
  wrap.dataset.gid = g.id;

  var header = document.createElement('div');
  header.className = 'power-group-header';
  header.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;">' +
      '<div class="power-group-num">' + (idx + 1) + '</div>' +
      '<div><div class="power-group-title">' + displayTitle + '</div>' +
      '<div class="power-group-summary">' + groupDeviceSummary(g) + '</div></div>' +
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
  var countLabel = deviceType === 'signage' ? '📦 システム台数（＝ サイネージ台数）' : '📦 システム台数';
  var countRow = document.createElement('div');
  countRow.className = 'power-count-row';
  countRow.innerHTML =
    '<div class="power-count-label">' + countLabel + '</div>' +
    '<div class="camera-count-ctrl">' +
      '<button class="cnt-btn" id="gcam_' + g.id + '"' + (g.count <= 1 ? ' disabled' : '') + '>−</button>' +
      '<div class="cnt-val" style="font-size:18px;">' + g.count + '</div>' +
      '<button class="cnt-btn" id="gcap_' + g.id + '">＋</button>' +
      '<span style="font-size:11px;color:var(--text-dim);">台</span>' +
    '</div>';
  countRow.querySelector('#gcam_' + g.id).addEventListener('click', function() { pgChange(g.id, 'count', -1); });
  countRow.querySelector('#gcap_' + g.id).addEventListener('click', function() { pgChange(g.id, 'count', 1); });
  body.appendChild(countRow);

  // デバイス種別ラジオ
  var typeLabel = document.createElement('div');
  typeLabel.className = 'arm-sub-label';
  typeLabel.style.cssText = 'margin:12px 0 8px;';
  typeLabel.textContent = '📷 機器種別';
  body.appendChild(typeLabel);

  var typeRow = document.createElement('div');
  typeRow.className = 'device-type-row';
  var TYPES = [
    { key: 'camera',  label: '📷 カメラ' },
    { key: 'signage', label: '🖥️ サイネージ' },
    { key: 'lidar',   label: '📡 Lidar' },
  ];
  typeRow.innerHTML = TYPES.map(function(t) {
    return '<button class="device-type-btn ' + (deviceType === t.key ? 'selected' : '') + '" data-gid="' + g.id + '" data-type="' + t.key + '">' + t.label + '</button>';
  }).join('');
  typeRow.querySelectorAll('.device-type-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      pgSetDeviceType(parseInt(this.dataset.gid, 10), this.dataset.type);
    });
  });
  body.appendChild(typeRow);

  if (deviceType === 'camera') {
    // カメラ台数セクション
    var camLabel = document.createElement('div');
    camLabel.className = 'arm-sub-label';
    camLabel.style.cssText = 'margin:12px 0 8px;';
    camLabel.textContent = '📷 カメラ台数（上限 ' + (g.count * 3) + '台）';
    body.appendChild(camLabel);

    var maxCam = g.count * 3;
    [
      { key: 'camIP',     label: 'IPカメラ' },
      { key: 'camStereo', label: 'ステレオカメラ' },
    ].forEach(function(camDef) {
      var row = document.createElement('div');
      row.className = 'power-count-row';
      var val = g[camDef.key] || 0;
      var canInc = totalCam < maxCam;
      row.innerHTML =
        '<div class="power-count-label">' + camDef.label + '</div>' +
        '<div class="camera-count-ctrl">' +
          '<button class="cnt-btn" id="gc_m_' + g.id + '_' + camDef.key + '"' + (val <= 0 ? ' disabled' : '') + '>−</button>' +
          '<div class="cnt-val" style="font-size:18px;">' + val + '</div>' +
          '<button class="cnt-btn" id="gc_p_' + g.id + '_' + camDef.key + '"' + (!canInc ? ' disabled' : '') + '>＋</button>' +
          '<span style="font-size:11px;color:var(--text-dim);">台</span>' +
        '</div>';
      row.querySelector('#gc_m_' + g.id + '_' + camDef.key).addEventListener('click', function() { pgCamChange(g.id, camDef.key, -1); });
      row.querySelector('#gc_p_' + g.id + '_' + camDef.key).addEventListener('click', function() { pgCamChange(g.id, camDef.key, 1); });
      body.appendChild(row);
    });

    // アーム設定セクション（カメラ台数>0のとき表示）
    if (totalCam > 0) {
      var armLabel = document.createElement('div');
      armLabel.className = 'arm-sub-label';
      armLabel.style.cssText = 'margin:12px 0 8px;';
      armLabel.textContent = '🔩 アーム取付方法・台数（カメラ合計と一致が必要）';
      body.appendChild(armLabel);

      if (!g.armData) g.armData = {};
      if (!g.armOpen) g.armOpen = {};
      var ad = g.armData;
      var hasBolt = !!ad.boltOn;
      var hasUnknown = !!ad.unknownOn;
      var hasQty = armQtyTotal(ad) > 0;
      // 数量管理（壁付け/ポール/天井/なし）の+ボタンは、天吊ボルト or 不明 が選ばれているとき不可
      var qtyBlocked = hasBolt || hasUnknown;

      var armKeyDefs = [
        { key: 'wall' }, { key: 'pole' }, { key: 'ceil' }, { key: 'none' },
      ];
      armKeyDefs.forEach(function(ak) {
        var keyTotal = armKeyTotal(g.armData, ak.key);
        var isOpen = !!g.armOpen[ak.key] || keyTotal > 0;

        var headRow = document.createElement('div');
        headRow.className = 'power-count-row';
        headRow.style.cssText = 'cursor:pointer;';
        var caret = isOpen ? '▾' : '▸';
        headRow.innerHTML =
          '<div class="power-count-label">' +
            '<span style="display:inline-block;width:14px;color:var(--text-dim);">' + caret + '</span>' +
            ARM_LABELS[ak.key] +
            (keyTotal > 0 ? ' <span style="color:var(--text-dim);font-size:12px;">（' + keyTotal + '台）</span>' : '') +
          '</div>';
        headRow.addEventListener('click', function() { pgArmToggle(g.id, ak.key); });
        body.appendChild(headRow);

        if (!isOpen) return;

        if (ak.key === 'none') {
          var noneRow = document.createElement('div');
          noneRow.className = 'power-count-row';
          noneRow.style.cssText = 'padding-left:18px;';
          var canIncNone = (armQtyTotal(ad) < totalCam) && !qtyBlocked;
          noneRow.innerHTML =
            '<div class="power-count-label" style="font-size:12px;">台数</div>' +
            '<div class="camera-count-ctrl">' +
              '<button class="cnt-btn" id="ga_m_' + g.id + '_none"' + (keyTotal <= 0 ? ' disabled' : '') + '>−</button>' +
              '<div class="cnt-val" style="font-size:18px;">' + keyTotal + '</div>' +
              '<button class="cnt-btn" id="ga_p_' + g.id + '_none"' + (!canIncNone ? ' disabled' : '') + '>＋</button>' +
              '<span style="font-size:11px;color:var(--text-dim);">台</span>' +
            '</div>';
          noneRow.querySelector('#ga_m_' + g.id + '_none').addEventListener('click', function(e) { e.stopPropagation(); pgArmNoneChange(g.id, -1); });
          noneRow.querySelector('#ga_p_' + g.id + '_none').addEventListener('click', function(e) { e.stopPropagation(); pgArmNoneChange(g.id, 1); });
          body.appendChild(noneRow);
        } else {
          ARM_METHODS[ak.key].forEach(function(m) {
            var mCnt = (g.armData[ak.key] && g.armData[ak.key][m.key]) || 0;
            var canIncM = (armQtyTotal(ad) < totalCam) && !qtyBlocked;
            var priceLabel = m.price === 0 ? '¥0' : '¥' + m.price.toLocaleString();
            var mRow = document.createElement('div');
            mRow.className = 'power-count-row';
            mRow.style.cssText = 'padding-left:18px;';
            mRow.innerHTML =
              '<div class="power-count-label" style="font-size:12px;">' + m.key +
                ' <span style="color:var(--text-dim);">（' + priceLabel + '）</span></div>' +
              '<div class="camera-count-ctrl">' +
                '<button class="cnt-btn" id="ga_m_' + g.id + '_' + ak.key + '_' + m.key + '"' + (mCnt <= 0 ? ' disabled' : '') + '>−</button>' +
                '<div class="cnt-val" style="font-size:18px;">' + mCnt + '</div>' +
                '<button class="cnt-btn" id="ga_p_' + g.id + '_' + ak.key + '_' + m.key + '"' + (!canIncM ? ' disabled' : '') + '>＋</button>' +
                '<span style="font-size:11px;color:var(--text-dim);">台</span>' +
              '</div>';
            mRow.querySelector('#ga_m_' + g.id + '_' + ak.key + '_' + m.key).addEventListener('click', function(e) {
              e.stopPropagation(); pgArmMethodChange(g.id, ak.key, m.key, -1);
            });
            mRow.querySelector('#ga_p_' + g.id + '_' + ak.key + '_' + m.key).addEventListener('click', function(e) {
              e.stopPropagation(); pgArmMethodChange(g.id, ak.key, m.key, 1);
            });
            body.appendChild(mRow);
          });
          // 天井サブの末尾に「天吊ボルト」トグル
          if (ak.key === 'ceil') {
            var boltRow = document.createElement('div');
            boltRow.className = 'power-count-row';
            boltRow.style.cssText = 'padding-left:18px;';
            var boltLabel = '天吊ボルト ' +
              '<span style="color:var(--text-dim);">（¥8,000×sys + ¥8,000×cam + ¥30,000）</span>';
            var boltDisabled = hasQty || hasUnknown;
            var boltBtnStyle = hasBolt
              ? 'background:var(--accent);color:#fff;'
              : (boltDisabled ? 'opacity:0.4;' : '');
            boltRow.innerHTML =
              '<div class="power-count-label" style="font-size:12px;">' + boltLabel + '</div>' +
              '<button class="cnt-btn" id="ga_bolt_' + g.id + '" style="width:auto;padding:0 14px;' + boltBtnStyle + '"' +
                ((!hasBolt && boltDisabled) ? ' disabled' : '') + '>' +
                (hasBolt ? '✓ 選択中' : '選択') + '</button>';
            boltRow.querySelector('#ga_bolt_' + g.id).addEventListener('click', function(e) {
              e.stopPropagation(); pgArmBoltToggle(g.id);
            });
            body.appendChild(boltRow);
          }
        }
      });

      // 「不明」セクション（トグル）
      var unkHead = document.createElement('div');
      unkHead.className = 'power-count-row';
      unkHead.style.cssText = 'cursor:pointer;';
      var unkDisabled = hasQty || hasBolt;
      var unkBtnStyle = hasUnknown
        ? 'background:var(--accent);color:#fff;'
        : (unkDisabled ? 'opacity:0.4;' : '');
      unkHead.innerHTML =
        '<div class="power-count-label">❓ 不明</div>' +
        '<button class="cnt-btn" id="ga_unk_' + g.id + '" style="width:auto;padding:0 14px;' + unkBtnStyle + '"' +
          ((!hasUnknown && unkDisabled) ? ' disabled' : '') + '>' +
          (hasUnknown ? '✓ 選択中' : '選択') + '</button>';
      unkHead.querySelector('#ga_unk_' + g.id).addEventListener('click', function(e) {
        e.stopPropagation(); pgArmUnknownToggle(g.id);
      });
      body.appendChild(unkHead);

      // 不明ONなら予備費の選択を表示
      if (hasUnknown) {
        var reserveRow = document.createElement('div');
        reserveRow.className = 'power-count-row';
        reserveRow.style.cssText = 'padding-left:18px;';
        var rf = ad.reserveFee || 'no';
        var rfYesStyle = rf === 'yes' ? 'background:var(--accent);color:#fff;' : '';
        var rfNoStyle  = rf === 'no'  ? 'background:var(--accent);color:#fff;' : '';
        reserveRow.innerHTML =
          '<div class="power-count-label" style="font-size:12px;">予備費</div>' +
          '<div style="display:flex;gap:6px;">' +
            '<button class="cnt-btn" id="ga_rf_yes_' + g.id + '" style="width:auto;padding:0 10px;font-size:12px;' + rfYesStyle + '">有（cam' + totalCam + '×¥10,000）</button>' +
            '<button class="cnt-btn" id="ga_rf_no_'  + g.id + '" style="width:auto;padding:0 10px;font-size:12px;' + rfNoStyle  + '">無</button>' +
          '</div>';
        reserveRow.querySelector('#ga_rf_yes_' + g.id).addEventListener('click', function(e) { e.stopPropagation(); pgArmReserveSet(g.id, 'yes'); });
        reserveRow.querySelector('#ga_rf_no_'  + g.id).addEventListener('click', function(e) { e.stopPropagation(); pgArmReserveSet(g.id, 'no'); });
        body.appendChild(reserveRow);
      }

      // アーム合計表示（一致しなければ赤）
      var match = armTotal === totalCam;
      var armTotalRow = document.createElement('div');
      armTotalRow.style.cssText = 'font-size:12px;padding:6px 0;text-align:right;color:' + (match ? 'var(--text-dim)' : '#e44');
      armTotalRow.textContent = (match ? '✓ ' : '⚠️ ') + 'アーム合計 ' + armTotal + ' / カメラ合計 ' + totalCam + ' 台';
      body.appendChild(armTotalRow);
    }
  } else if (deviceType === 'lidar') {
    // Lidar台数セクション（上限 sys×8）
    var maxLidar = g.count * LIDAR_PER_SYS;
    var lidarN = lidarCountForGroup(g);
    var ldLabel = document.createElement('div');
    ldLabel.className = 'arm-sub-label';
    ldLabel.style.cssText = 'margin:12px 0 8px;';
    ldLabel.textContent = '📡 Lidar台数（上限 ' + maxLidar + '台）';
    body.appendChild(ldLabel);

    var ldRow = document.createElement('div');
    ldRow.className = 'power-count-row';
    ldRow.innerHTML =
      '<div class="power-count-label">設置台数</div>' +
      '<div class="camera-count-ctrl">' +
        '<button class="cnt-btn" id="gld_m_' + g.id + '"' + (lidarN <= 1 ? ' disabled' : '') + '>−</button>' +
        '<div class="cnt-val" style="font-size:18px;">' + lidarN + '</div>' +
        '<button class="cnt-btn" id="gld_p_' + g.id + '"' + (lidarN >= maxLidar ? ' disabled' : '') + '>＋</button>' +
        '<span style="font-size:11px;color:var(--text-dim);">台</span>' +
      '</div>';
    ldRow.querySelector('#gld_m_' + g.id).addEventListener('click', function() { pgLidarCountChange(g.id, -1); });
    ldRow.querySelector('#gld_p_' + g.id).addEventListener('click', function() { pgLidarCountChange(g.id, 1); });
    body.appendChild(ldRow);

    // Lidarアーム選定セクション（合計=Lidar台数が必要）
    var ldArmLabel = document.createElement('div');
    ldArmLabel.className = 'arm-sub-label';
    ldArmLabel.style.cssText = 'margin:12px 0 8px;';
    ldArmLabel.textContent = '🔩 アーム選定・台数（Lidar台数と一致が必要）';
    body.appendChild(ldArmLabel);

    if (!g.lidarArm || typeof g.lidarArm !== 'object') g.lidarArm = {};
    var ldArmSum = lidarArmTotal(g);
    LIDAR_ARM_METHODS.forEach(function(m) {
      var cnt = Number(g.lidarArm[m.key]) || 0;
      var canInc = ldArmSum < lidarN;
      var priceLabel = '¥' + m.price.toLocaleString();
      var row = document.createElement('div');
      row.className = 'power-count-row';
      row.innerHTML =
        '<div class="power-count-label">' + m.key +
          ' <span style="color:var(--text-dim);">（' + priceLabel + '）</span></div>' +
        '<div class="camera-count-ctrl">' +
          '<button class="cnt-btn" id="gla_m_' + g.id + '_' + m.key + '"' + (cnt <= 0 ? ' disabled' : '') + '>−</button>' +
          '<div class="cnt-val" style="font-size:18px;">' + cnt + '</div>' +
          '<button class="cnt-btn" id="gla_p_' + g.id + '_' + m.key + '"' + (!canInc ? ' disabled' : '') + '>＋</button>' +
          '<span style="font-size:11px;color:var(--text-dim);">台</span>' +
        '</div>';
      row.querySelector('#gla_m_' + g.id + '_' + m.key).addEventListener('click', function() { pgLidarArmChange(g.id, m.key, -1); });
      row.querySelector('#gla_p_' + g.id + '_' + m.key).addEventListener('click', function() { pgLidarArmChange(g.id, m.key, 1); });
      body.appendChild(row);
    });

    // アーム合計表示（一致しなければ赤）
    var ldMatch = ldArmSum === lidarN;
    var ldTotalRow = document.createElement('div');
    ldTotalRow.style.cssText = 'font-size:12px;padding:6px 0;text-align:right;color:' + (ldMatch ? 'var(--text-dim)' : '#e44');
    ldTotalRow.textContent = (ldMatch ? '✓ ' : '⚠️ ') + 'アーム合計 ' + ldArmSum + ' / Lidar合計 ' + lidarN + ' 台';
    body.appendChild(ldTotalRow);
  } else {
    // signage の概要表示
    var infoRow = document.createElement('div');
    infoRow.style.cssText = 'font-size:12px;color:var(--text-dim);padding:8px 0;';
    infoRow.textContent = '※ サイネージはシステム台数と同じ台数（' + g.count + '台）。アーム取付なし。';
    body.appendChild(infoRow);
  }

  // メモ欄
  var memoLabel = document.createElement('div');
  memoLabel.className = 'arm-sub-label';
  memoLabel.style.cssText = 'margin:12px 0 6px;';
  memoLabel.textContent = '📝 メモ（任意）';
  body.appendChild(memoLabel);
  var memoArea = document.createElement('textarea');
  memoArea.className = 'text-input';
  memoArea.rows = 2;
  memoArea.placeholder = '機器詳細・特記事項など（任意）';
  memoArea.style.cssText = 'font-size:13px;padding:9px 12px;margin-bottom:0;';
  memoArea.id = 'gcmemo_' + g.id;
  memoArea.value = g.memo || '';
  memoArea.addEventListener('input', function() { pgSetMemo(g.id, this.value); });
  body.appendChild(memoArea);

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

// アーム種別の展開/折りたたみを切り替える
function pgArmToggle(gid, armKey) {
  const g = powerGroups.find(x => x.id === gid);
  if (!g) return;
  if (!g.armOpen) g.armOpen = {};
  g.armOpen[armKey] = !g.armOpen[armKey];
  renderGroupCamArmList();
}

// アーム種別×取付方法の台数を増減する
function pgArmMethodChange(gid, armKey, method, delta) {
  const g = powerGroups.find(x => x.id === gid);
  if (!g) return;
  if (!g.armData) g.armData = {};
  if (!g.armData[armKey] || typeof g.armData[armKey] !== 'object') g.armData[armKey] = {};
  g.armData[armKey][method] = Math.max(0, (g.armData[armKey][method] || 0) + delta);
  renderGroupCamArmList();
}

// 「なし」の台数を増減する
function pgArmNoneChange(gid, delta) {
  const g = powerGroups.find(x => x.id === gid);
  if (!g) return;
  if (!g.armData) g.armData = {};
  g.armData.none = Math.max(0, (Number(g.armData.none) || 0) + delta);
  renderGroupCamArmList();
}

// 天吊ボルトのON/OFFを切り替える。他方法選択時はONにできない
function pgArmBoltToggle(gid) {
  const g = powerGroups.find(x => x.id === gid);
  if (!g) return;
  if (!g.armData) g.armData = {};
  if (g.armData.boltOn) {
    g.armData.boltOn = false;
  } else {
    if (armQtyTotal(g.armData) > 0 || g.armData.unknownOn) return;
    g.armData.boltOn = true;
  }
  renderGroupCamArmList();
}

// 「不明」のON/OFFを切り替える。他方法選択時はONにできない
function pgArmUnknownToggle(gid) {
  const g = powerGroups.find(x => x.id === gid);
  if (!g) return;
  if (!g.armData) g.armData = {};
  if (g.armData.unknownOn) {
    g.armData.unknownOn = false;
    g.armData.reserveFee = null;
  } else {
    if (armQtyTotal(g.armData) > 0 || g.armData.boltOn) return;
    g.armData.unknownOn = true;
    if (!g.armData.reserveFee) g.armData.reserveFee = 'no';
  }
  renderGroupCamArmList();
}

// 予備費の有無をセットする
function pgArmReserveSet(gid, val) {
  const g = powerGroups.find(x => x.id === gid);
  if (!g || !g.armData || !g.armData.unknownOn) return;
  g.armData.reserveFee = val;
  renderGroupCamArmList();
}

// Lidar台数を増減する（[1, sys×8] にクランプ、アーム合計も追従）
function pgLidarCountChange(gid, delta) {
  const g = powerGroups.find(x => x.id === gid);
  if (!g) return;
  const max = (g.count || 1) * LIDAR_PER_SYS;
  const cur = lidarCountForGroup(g);
  g.lidarCount = Math.min(max, Math.max(1, cur + delta));
  clampLidarArm(g);
  renderGroupCamArmList();
}

// Lidarアーム種別の台数を増減する（合計はLidar台数を超えない）
function pgLidarArmChange(gid, key, delta) {
  const g = powerGroups.find(x => x.id === gid);
  if (!g) return;
  if (!g.lidarArm || typeof g.lidarArm !== 'object') g.lidarArm = {};
  const next = Math.max(0, (Number(g.lidarArm[key]) || 0) + delta);
  if (delta > 0 && lidarArmTotal(g) >= lidarCountForGroup(g)) return; // 上限到達
  g.lidarArm[key] = next;
  renderGroupCamArmList();
}

// Lidarアーム合計がLidar台数を超えないように丸める
function clampLidarArm(g) {
  if (!g || !g.lidarArm) return;
  let over = lidarArmTotal(g) - lidarCountForGroup(g);
  if (over <= 0) return;
  // 後ろの種別から順に減らす
  for (let i = LIDAR_ARM_METHODS.length - 1; i >= 0 && over > 0; i--) {
    const k = LIDAR_ARM_METHODS[i].key;
    const cur = Number(g.lidarArm[k]) || 0;
    const dec = Math.min(cur, over);
    g.lidarArm[k] = cur - dec;
    over -= dec;
  }
}

// 統合Step8 ステータスバーと次へボタンを更新する
function updateGroupCamStatus() {
  syncSystemTotal();
  const v = validateGroupsForStep8();
  const sumEl = document.getElementById('groupCamSummary');
  if (sumEl) {
    var parts = ['sys ' + v.summary.sys, 'カメラ ' + v.summary.cam];
    if (v.summary.signage > 0) parts.push('サイネージ ' + v.summary.signage);
    if (v.summary.lidar > 0)   parts.push('Lidar ' + v.summary.lidar);
    sumEl.textContent = parts.join(' / ');
  }
  const badge = document.getElementById('groupCamBadge');
  const nextBtn = document.getElementById('next7');
  if (v.ok) {
    if (badge) { badge.className = 'arm-status-badge ok'; badge.textContent = '✓ OK'; }
    if (nextBtn) nextBtn.disabled = false;
  } else {
    if (badge) { badge.className = 'arm-status-badge warn'; badge.textContent = v.issues[0]; }
    if (nextBtn) nextBtn.disabled = true;
  }
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

// アーム取付ステップ全体のステータスと次へボタンを更新する（旧Step10専用・現在は未使用）
function updateArmStatus() {
  const assignedEl = document.getElementById('armAssignedNum');
  const totalEl    = document.getElementById('armTotalNum');
  // 旧Step10のDOMが存在しなければ何もしない（next10はLAN区間ステップ用なので絶対に触らない）
  if (!assignedEl || !totalEl) return;
  const camTotal  = getTotalCameras();
  const assigned  = getArmAssigned();
  const remaining = camTotal - assigned;
  assignedEl.textContent = assigned;
  totalEl.textContent    = camTotal;
  const badge  = document.getElementById('armStatusBadge');
  if (assigned === camTotal && camTotal > 0) {
    if (badge) { badge.className = 'arm-status-badge ok'; badge.textContent = '✓ 完了'; }
  } else if (badge) {
    badge.className = 'arm-status-badge warn';
    badge.textContent = remaining > 0 ? '残り ' + remaining + ' 台' : '超過 ' + Math.abs(remaining) + ' 台';
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

// ══════════════════════════════════════
// 作業計画ステップ（Step12）
// ══════════════════════════════════════
// 作業計画ステップのUIを構築する
function buildWorkStep() {
  const isKasetsu = d.kojiType === '仮設';
  document.getElementById('workBlock_single').style.display   = isKasetsu ? 'none'  : 'block';
  document.getElementById('workBlock_kasetsu').style.display  = isKasetsu ? 'block' : 'none';
  const title = isKasetsu ? '設置・撤去の作業計画' :
    (d.kojiType==='撤去' ? '撤去工事の作業計画' :
     d.kojiType==='交換' ? '交換工事の作業計画' :
     d.kojiType==='移設' ? '移設工事の作業計画' :
     '設置工事の作業計画');
  document.getElementById('step10Title').textContent = title;
  if (!d.workPlan) d.workPlan = {};
  if (isKasetsu) {
    buildWorkSection('install');
    buildWorkSection('remove');
  } else {
    buildWorkSection('single');
  }
  // 警備員配置・道路申請許可：デフォルト「無」を選択状態にする
  if (!d.guardOption) d.guardOption = 'no';
  if (!d.roadPermit)  d.roadPermit  = 'no';
  syncChoiceSelection('guardOptionGrid', 'guardOption', d.guardOption);
  syncChoiceSelection('roadPermitGrid',  'roadPermit',  d.roadPermit);
}

// 指定グリッド内の choice-btn のうち、value に一致するものを selected 状態にする
function syncChoiceSelection(gridId, key, val) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.querySelectorAll('.choice-btn').forEach(function(b) {
    b.classList.remove('selected');
    const oc = b.getAttribute('onclick') || '';
    if (oc.includes(`'${key}','${val}'`)) b.classList.add('selected');
  });
}

// 作業計画の1セクション（日数・休日・夜間等）を構築する
function buildWorkSection(id) {
  const el = document.getElementById('workSection_'+id);
  if (!el) return;
  if (!d.workPlan[id]) d.workPlan[id] = { workers:2, days:1, hours:8 };
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
        <button class="cnt-btn" onclick="workPlanChange('${id}','hours',-1)">−</button>
        <div class="work-plan-val" id="wp_${id}_hours">${p.hours}</div>
        <button class="cnt-btn" onclick="workPlanChange('${id}','hours',1)">＋</button>
        <div class="work-plan-unit">時間</div>
      </div>
    </div>
    <div class="work-plan-row work-plan-presets">
      <button class="hours-preset-btn" onclick="workPlanChange('${id}','hours',-8)">− 1日 (8h)</button>
      <button class="hours-preset-btn" onclick="workPlanChange('${id}','hours',8)">＋ 1日 (8h)</button>
    </div>
  </div>`;
}

// 作業計画の数値項目を増減する
function workPlanChange(id, key, delta) {
  if (!d.workPlan) d.workPlan = {};
  if (!d.workPlan[id]) d.workPlan[id] = { workers:2, days:1, hours:8 };
  const min = 1;
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
  document.getElementById('next12').disabled = false;
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
  document.getElementById('next14').disabled = false;
}

// ══════════════════════════════════════
// レポート生成
// ══════════════════════════════════════
// ポール新設の選択内容をレポート用テキストに変換する
function buildPoleText(r) {
  if (r.poleNew === 'なし') return 'ポール新設　：なし';
  if (r.poleNew !== 'あり') return '';
  // 旧形式互換：poleItems が無ければ excavation/poleFinish から1件合成
  let items = Array.isArray(r.poleItems) ? r.poleItems : [];
  if (items.length === 0 && (r.excavation || r.poleFinish)) {
    items = [{ excavation: r.excavation || null, finish: r.poleFinish || null }];
  }
  if (items.length === 0) items = [{ excavation: null, finish: null }];
  const count = Math.max(items.length, r.poleCount || items.length || 1);
  const fmt = function(it) {
    return '掘削=' + (it.excavation || '未選択') + '／仕上げ=' + (it.finish || '未選択');
  };
  if (r.poleBatchMode !== false && items.length === 1) {
    return 'ポール新設　：あり（' + count + '本）\n　全' + count + '本：' + fmt(items[0]);
  }
  const lines = items.map(function(it, i) {
    return '　ポール' + (i + 1) + '：' + fmt(it);
  });
  return 'ポール新設　：あり（' + count + '本）\n' + lines.join('\n');
}

// LAN区間情報をレポート用テキストに変換する
function buildLanSegmentsText(r) {
  const segs = normalizeLanSegments(r);
  if (!segs.length) return '配線　　　：未設定';
  const total = segs.reduce((s, x) => s + (parseFloat(x.length) || 0), 0);
  const lines = ['配線（LAN）：合計 ' + total + 'm'];
  segs.forEach(function(s, i) {
    const tag = '　' + (s.label || ('区間' + (i + 1))) + '：';
    const method = s.wiring + (s.wiring === '配管' && s.pipeType ? '（' + s.pipeType + '）' : '');
    lines.push(tag + method + '　' + (s.length || 0) + 'm');
  });
  return lines.join('\n');
}

// 旧フィールド（wiring/lanPipeType/lanLength）を持つレポートを区間配列に正規化
function normalizeLanSegments(r) {
  if (Array.isArray(r.lanSegments) && r.lanSegments.length > 0) {
    return r.lanSegments.map(function(s) {
      return {
        label: s.label || null,
        wiring: s.wiring || '',
        pipeType: s.pipeType || null,
        length: parseFloat(s.length) || 0,
      };
    });
  }
  // レガシー互換：旧フィールドから1区間に変換
  if (r.wiring && r.wiring !== '未選択') {
    return [{
      wiring: r.wiring,
      pipeType: r.lanPipeType || null,
      length: parseFloat(r.lanLength) || 0,
    }];
  }
  return [];
}

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
// グループ別のカメラ・アーム情報をレポート用テキストに変換する
function buildGroupSummaryText(groups) {
  if (!groups || groups.length === 0) return '';
  return groups.map(function(g, i) {
    var name = (g.groupName && g.groupName.trim())
      ? 'グループ' + (i + 1) + '「' + g.groupName.trim() + '」'
      : 'グループ' + (i + 1);
    var deviceType = g.deviceType || 'camera';
    var lines = [name + '（sys' + (g.count||0) + '台）'];
    if (deviceType === 'camera') {
      var camLines = [];
      if (g.camIP    > 0) camLines.push('IPカメラ×' + g.camIP + '台');
      if (g.camStereo > 0) camLines.push('ステレオカメラ×' + g.camStereo + '台');
      var camStr = camLines.length ? camLines.join('・') : 'カメラなし';
      var ad = g.armData || {};
      var armLines = [];
      ['wall','pole','ceil'].forEach(function(k) {
        if (!ad[k] || typeof ad[k] !== 'object') return;
        Object.entries(ad[k]).forEach(function(e) {
          var m = e[0], n = e[1];
          if (n > 0) armLines.push(ARM_LABELS[k].replace(/^\S+\s/, '') + '・' + m + '×' + n + '台');
        });
      });
      var noneN = armKeyTotal(ad, 'none');
      if (noneN > 0) armLines.push('アームなし×' + noneN + '台');
      if (ad.boltOn) armLines.push('天吊ボルト');
      if (ad.unknownOn) armLines.push('不明' + (ad.reserveFee === 'yes' ? '（予備費あり）' : '（予備費なし）'));
      var armStr = armLines.length ? armLines.join('・') : '未設定';
      lines.push('　機器：' + camStr);
      lines.push('　アーム：' + armStr);
    } else if (deviceType === 'signage') {
      lines.push('　機器：サイネージ×' + (g.count||0) + '台');
    } else if (deviceType === 'lidar') {
      lines.push('　機器：Lidar×' + lidarCountForGroup(g) + '台');
      var ldArmLines = [];
      LIDAR_ARM_METHODS.forEach(function(m) {
        var n = (g.lidarArm && Number(g.lidarArm[m.key])) || 0;
        if (n > 0) ldArmLines.push(m.key + '×' + n + '台');
      });
      lines.push('　アーム：' + (ldArmLines.length ? ldArmLines.join('・') : '未設定'));
    }
    if (g.memo && g.memo.trim()) lines.push('　メモ：' + g.memo.trim());
    return lines.join('\n');
  }).join('\n');
}

// 後方互換用：グループアームの合計テキスト（旧形式）
function buildGroupArmText(groups) {
  if (!groups || groups.length === 0) return '';
  var totals = { wall: 0, pole: 0, ceil: 0, none: 0 };
  groups.forEach(function(g) {
    var ad = g.armData || {};
    totals.wall += armKeyTotal(ad, 'wall');
    totals.pole += armKeyTotal(ad, 'pole');
    totals.ceil += armKeyTotal(ad, 'ceil');
    totals.none += armKeyTotal(ad, 'none');
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
  let label;
  if (r.kojiType === '撤去') label = '撤去日';
  else if (r.kojiType === '交換' || r.kojiType === '移設') label = '作業日';
  else label = '設置日';
  return `${label}　　：${r.workDate}`;
}

// guardOption / roadPermit のコード値を表示用ラベルに変換する
function guardOptionLabel(v) {
  return v === 'yes' ? '有' : v === 'unknown' ? '不明' : '無';
}
function roadPermitLabel(v) {
  return v === 'yes' ? '有' : v === 'unknown' ? '不明' : '無';
}

// 作業計画（日数・休日・夜間等）をレポート用テキストに変換する
function buildWorkPlanText(r) {
  const guardLine = `警備員配置　：${guardOptionLabel(r.guardOption)}`;
  const roadLine  = `道路申請許可：${roadPermitLabel(r.roadPermit)}`;
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
予想時間　：${rv.hours||'-'}時間

${guardLine}
${roadLine}`;
  }
  const p = r.workPlan.single || {};
  return `【作業計画】
作業人数　：${p.workers||'-'}名
かかる日数　：${p.days||'-'}日
予想時間　：${p.hours||'-'}時間
${r.kosoLine}
${guardLine}
${roadLine}`;
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
  const poleLine        = buildPoleText(r);
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
${haizaiLine}

【機器情報】
システム台数：${r.systemCount}台
${buildGroupSummaryText(r.powerGroups) || '　（グループ未設定）'}
${armHandlingLine}

【電源供給】
${powerText}

【配線・工事】
${buildLanSegmentsText(r)}
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

  syncSystemTotal();
  const ipTotal    = powerGroups.reduce((s, g) => s + (g.camIP || 0), 0);
  const sterTotal  = powerGroups.reduce((s, g) => s + (g.camStereo || 0), 0);
  const signageTotal = powerGroups.reduce((s, g) => s + (g.deviceType === 'signage' ? (g.count||0) : 0), 0);
  const lidarTotal   = powerGroups.reduce((s, g) => s + (g.deviceType === 'lidar'   ? lidarCountForGroup(g) : 0), 0);
  const cameraCounts = {
    'IPカメラ': ipTotal,
    'ステレオカメラ': sterTotal,
    'サイネージ': signageTotal,
    'Lidar': lidarTotal,
  };
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
    haizai:       d.haizai || '',
    haizaiNote:   (document.getElementById('haizaiNote') && document.getElementById('haizaiNote').value) || '',
    armHandling:  d.armHandling || '',
    area:         d.area || '',
    areaDetail:   (document.getElementById('areaDetail') && document.getElementById('areaDetail').value) || '',
    poleNew:      d.poleNew || '',
    poleCount:    d.poleCount || 1,
    poleBatchMode: d.poleBatchMode !== false,
    poleItems:    JSON.parse(JSON.stringify(d.poleItems || [])),
    systemCount:  d.systemCount || 1,
    cameraCounts,
    armData:      JSON.parse(JSON.stringify(d.armData||{})),
    armText:      buildGroupArmText(powerGroups) || buildArmText(d.armData),
    lanSegments:  (powerGroups || []).filter(groupNeedsLan).map(function(g, i) {
      return {
        label:    (g.groupName && g.groupName.trim()) ? g.groupName.trim() : ('グループ' + (i + 1)),
        wiring:   g.lan ? g.lan.wiring : null,
        pipeType: g.lan ? g.lan.pipeType : null,
        length:   g.lan ? (parseFloat(g.lan.length) || 0) : 0,
      };
    }),
    wireSupport:  document.getElementById('wireSupport').value,
    powerGroups:  JSON.parse(JSON.stringify(powerGroups||[])),
    lanChange:    JSON.parse(JSON.stringify(d.lanChange||{})),
    kosoLine, tokuLine,
    kosoEquip:    JSON.parse(JSON.stringify(d.kosoEquip||[])),
    kosoSupply:   d.kosoSupply || '',
    workPlan:     JSON.parse(JSON.stringify(d.workPlan||{})),
    guardOption:  d.guardOption || 'no',
    roadPermit:   d.roadPermit  || 'no',
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
      const r = migrateReport(JSON.parse(e.target.result));
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
// 旧フォーマット（deviceType未設定）のレポートを新形式にマイグレーション
function migrateReport(r) {
  if (!r) return r;
  (r.powerGroups || []).forEach(function(g) {
    if (!g.deviceType) g.deviceType = 'camera';
    if (g.memo == null) g.memo = '';
  });
  return r;
}
// localStorage から保存済みレポート一覧を取得する
function getSaved() {
  try {
    var list = JSON.parse(localStorage.getItem('gencho_v4')) || [];
    return list.map(migrateReport);
  } catch { return []; }
}
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
          <button class="card-act-btn" onclick="event.stopPropagation();downloadEstimateFromList(${r.id})">💰 見積</button>
          <button class="card-act-btn" onclick="event.stopPropagation();toggleCardEdit(${r.id})">✏️ 編集</button>
          <button class="card-act-btn del" onclick="event.stopPropagation();confirmDeleteOne(${r.id},'${(title).replace(/'/g,'')}')">🗑️ 削除</button>
        </div>
      </div>
      <div class="card-edit-panel" id="cedit_${r.id}" style="display:none;">
        <div class="cedit-section-label">基本情報</div>
        ${makeEditItem(r.id,'siteName','🏢 現場名',r.siteName,'text')}
        ${makeEditItem(r.id,'kojiType','⚙️ 工事内容',r.kojiType,'choice',['設置','撤去','仮設','交換','移設'])}
        ${makeEditItem(r.id,'timeZone','🕐 時間帯',r.timeZone,'choice',['日中','夜間'])}
        ${makeEditItem(r.id,'location','📍 工事場所',r.location,'choice',['屋内','屋外'])}
        ${makeEditItem(r.id,'area','🗾 エリア',r.area||'未選択','choice',['都内','関東','東北','関西','九州','北海道'])}
        <div class="cedit-section-label" style="margin-top:10px;">作業計画</div>
        ${buildLanSegmentsReadOnly(r)}
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

// LAN区間情報を読み取り専用でカード編集パネルに表示する
function buildLanSegmentsReadOnly(r) {
  const segs = normalizeLanSegments(r);
  if (!segs.length) {
    return '<div class="cedit-item"><div class="cedit-item-label">🔌 LAN配線</div><div class="cedit-item-current">未設定</div></div>';
  }
  const total = segs.reduce(function(s, x) { return s + (parseFloat(x.length) || 0); }, 0);
  const rows = segs.map(function(s, i) {
    const method = (s.wiring || '') + (s.wiring === '配管' && s.pipeType ? '（' + s.pipeType + '）' : '');
    return '<div style="font-size:12px;padding:4px 0;color:var(--text-dim);">' + (s.label || ('区間' + (i + 1))) + '：' + method + '　' + (s.length || 0) + 'm</div>';
  }).join('');
  return '<div class="cedit-item">' +
    '<div class="cedit-item-label">🔌 LAN配線（合計' + total + 'm）</div>' +
    '<div class="cedit-item-current" style="cursor:default;">' + rows + '</div>' +
    '</div>';
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
  const keys = ['siteName'];
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
  const estBtn = document.getElementById('modalEstimateBtn');
  const est = calcEstimate(r);
  if (est.camTotal === 0 && (r.powerGroups || []).length === 0) {
    el.style.display = 'none';
    if (estBtn) estBtn.style.display = 'none';
    return;
  }
  if (estBtn) estBtn.style.display = '';
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
  d = { systemCount:1, armData:{}, workPlan:{}, kosoEquip:[],
        dateData:{ single:{mode:'confirm'}, install:{mode:'confirm'}, remove:{mode:'confirm'} } };
  kosoMode = null; tokuMode = null; step = 1; currentReport = null;
  document.getElementById('stepsContainer').style.display = 'block';
  document.getElementById('progressWrap').style.display   = 'block';
  document.getElementById('resultPanel').classList.remove('active');
  document.querySelectorAll('.choice-btn,.toggle-btn').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.next-btn[id]').forEach(b => b.disabled = true);
  document.getElementById('kosoDetail').style.display = 'none';
  document.getElementById('tokuDetail').style.display = 'none';
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
  d.lanSegments = [];
  lanSegId = 0;
  const lanList = document.getElementById('lanSegmentList');
  if (lanList) lanList.innerHTML = '';
  const lanTotal = document.getElementById('lanTotalNum');
  if (lanTotal) lanTotal.textContent = '0';
  const wireSupport = document.getElementById('wireSupport');
  if (wireSupport) wireSupport.value = '';
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
  if (step === 7) { tryNextStep7(); return; }
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
