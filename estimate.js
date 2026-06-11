// ══════════════════════════════════════
// 概算見積計算
// ══════════════════════════════════════
// 配管種別ごとの単価（円/m）。モールは箇所単価で別途集計するため除外。
const PIPE_RATES = {
  'VE管(塩ビ)': 2000,
  'P薄鋼電線管': 3500,
  'Pドブ付(溶融亜鉛めっき)': 5000,
  '露出': 100,
};

// アーム取付方法ごとの単価。天吊ボルトと不明はトグル（数量なし）で別管理。
const ARM_METHOD_PRICES = {
  wall: { 'ビス': 0, 'アーム': 10000, 'マグネット': 10000, 'ブラケット': 25000 },
  pole: { 'マウント': 5000, 'ブラケット': 25000, 'パラペット': 20000 },
  ceil: { 'ビス': 0, 'アーム': 10000, 'マグネット': 10000 },
};

// Lidar設置・撤去の単価（1台）と専用アーム種別の単価
const LIDAR_INSTALL_PRICE = 10000;
const LIDAR_REMOVE_PRICE  = 6000;
const LIDAR_ARM_PRICES = {
  '仮設ポール': 2500,
  'Lアングル':  5000,
  'ボックス':   10000,
};

// グループの armData から取付方法別の費用明細を生成する
function buildArmMethodLines(groups) {
  const out = [];
  (groups || []).forEach(function(g, gi) {
    const ad = g.armData || {};
    const sysN = Math.max(1, g.count || 1);
    const camN = (g.camIP || 0) + (g.camStereo || 0);
    const gTag = (groups.length > 1)
      ? ' [' + ((g.groupName && g.groupName.trim()) || ('グループ' + (gi + 1))) + ']'
      : '';
    // 数量管理されている取付方法
    ['wall', 'pole', 'ceil'].forEach(function(armKey) {
      const methods = ad[armKey];
      if (!methods || typeof methods !== 'object') return;
      Object.entries(methods).forEach(function(e) {
        const method = e[0], cnt = e[1] || 0;
        if (cnt <= 0) return;
        const rate = (ARM_METHOD_PRICES[armKey] || {})[method];
        if (typeof rate === 'number' && rate > 0) {
          const fee = rate * cnt;
          const armLabel = armKey === 'wall' ? '壁付け' : armKey === 'pole' ? 'ポール' : '天井';
          out.push({
            label: 'アーム取付（' + armLabel + '・' + method + '）' + gTag
              + '（' + cnt + '台 × ' + fmtYen(rate) + '）',
            val: fee
          });
        }
      });
    });
    // 天吊ボルト：グループ単位で 8000*sys + 8000*cam + 30000
    if (ad.boltOn) {
      const fee = 8000 * sysN + 8000 * camN + 30000;
      out.push({
        label: 'アーム取付（天吊ボルト）' + gTag
          + '（sys' + sysN + '×¥8,000 + cam' + camN + '×¥8,000 + ¥30,000）',
        val: fee
      });
    }
    // 不明＋予備費「有」：cam × ¥10,000
    if (ad.unknownOn && ad.reserveFee === 'yes' && camN > 0) {
      const fee = camN * 10000;
      out.push({
        label: 'アーム取付・予備費（不明）' + gTag
          + '（cam' + camN + '×¥10,000）',
        val: fee
      });
    }
  });
  return out;
}

// LAN区間配列を取得する（旧フィールドからのフォールバック対応）
function getLanSegments(r) {
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
  if (r.wiring && r.wiring !== '未選択') {
    return [{
      wiring: r.wiring,
      pipeType: r.lanPipeType || null,
      length: parseFloat(r.lanLength) || 0,
    }];
  }
  return [];
}

// 現調費の単価
const GENTYO_BAKAN_PERSON   = 30000; // バカン 人件費（1名）
const GENTYO_VENDOR_CAM_BASE = 30000, GENTYO_VENDOR_CAM_ADD   = 5500; // 施工会社 IPステカメ：基本＋1sys
const GENTYO_VENDOR_SIGN_BASE = 10000, GENTYO_VENDOR_SIGN_ADD  = 5000; // 施工会社 サイネージ：1台目＋以降
const GENTYO_VENDOR_LIDAR_BASE = 10000, GENTYO_VENDOR_LIDAR_ADD = 5000; // 施工会社 Lidar：1台目＋以降

// 現調費の機器台数（カメラ系・サイネージ・Lidar・システム数）を集計する
function gentyoCounts(r) {
  const groups = r.powerGroups || [];
  const counts = r.cameraCounts || {};
  const camTotal = groups.reduce(function(s, g) { return s + (g.camIP || 0) + (g.camStereo || 0); }, 0)
                || ((counts['IPカメラ'] || 0) + (counts['ステレオカメラ'] || 0));
  const signageTotal = groups.reduce(function(s, g) { return s + (g.deviceType === 'signage' ? (g.count || 0) : 0); }, 0)
                || (counts['サイネージ'] || 0);
  const lidarTotal = groups.reduce(function(s, g) {
    if (g.deviceType !== 'lidar') return s;
    return s + ((g.lidarCount != null) ? (parseInt(g.lidarCount) || 0) : (g.count || 0));
  }, 0) || (counts['Lidar'] || 0);
  const sysCount = r.systemCount || 1;
  return { camTotal: camTotal, signageTotal: signageTotal, lidarTotal: lidarTotal, sysCount: sysCount };
}

// 現調費（バカン／施工会社）を計算する。明細(lines)と合計(total)を返す。
//   遠方費は現調=1日（往復のみ）として算出。バカンは新川本社から、施工会社は選択会社から。
function calcGentyoFee(r) {
  const g = r.gentyo || {};
  const lines = [];
  let total = 0;

  // ── バカン：人件費 ¥30,000 × 人数 ＋ 遠方費（新川本社→現場・往復のみ） ──
  if (g.bakan && g.bakan.on) {
    const people = Math.max(1, g.bakan.people || 1);
    const labor = GENTYO_BAKAN_PERSON * people;
    lines.push({ label: `現調費・バカン 人件費（¥30,000 × ${people}名）`, val: labor });
    total += labor;

    let transport = 0;
    const bd = r.bakanDistance;
    if (bd && typeof calcTransportInfo === 'function') {
      transport = calcTransportInfo(bd.distKm, bd.distM, 1).amount;
    }
    if (transport > 0) {
      lines.push({ label: `現調費・バカン 遠方費（往復ETC込）`, val: transport });
      total += transport;
    }
  }

  // ── 施工会社：機器別セット × 人数 ＋ 既存の遠方費（選択会社→現場・往復のみ） ──
  if (g.vendor && g.vendor.on) {
    const people = Math.max(1, g.vendor.people || 1);
    const c = gentyoCounts(r);
    const parts = [];
    let setFee = 0;
    if (c.camTotal > 0) {
      const f = GENTYO_VENDOR_CAM_BASE + GENTYO_VENDOR_CAM_ADD * Math.max(0, c.sysCount - 1);
      setFee += f;
      parts.push(`カメラ ${fmtYen(f)}`);
    }
    if (c.signageTotal > 0) {
      const f = GENTYO_VENDOR_SIGN_BASE + GENTYO_VENDOR_SIGN_ADD * Math.max(0, c.signageTotal - 1);
      setFee += f;
      parts.push(`サイネージ ${fmtYen(f)}`);
    }
    if (c.lidarTotal > 0) {
      const f = GENTYO_VENDOR_LIDAR_BASE + GENTYO_VENDOR_LIDAR_ADD * Math.max(0, c.lidarTotal - 1);
      setFee += f;
      parts.push(`Lidar ${fmtYen(f)}`);
    }
    if (setFee > 0) {
      const setTotal = setFee * people;
      lines.push({ label: `現調費・施工会社 機器別セット（${parts.join(' ＋ ')}）× ${people}名`, val: setTotal });
      total += setTotal;
    }

    let transport = 0;
    const sel = (typeof getSelectedTransport === 'function') ? getSelectedTransport(r) : null;
    if (sel && typeof calcTransportInfo === 'function') {
      transport = calcTransportInfo(sel.distKm, sel.distM, 1).amount;
    }
    if (transport > 0) {
      lines.push({ label: `現調費・施工会社 遠方費（${sel.company}・往復ETC込）`, val: transport });
      total += transport;
    }
  }

  return { lines: lines, total: total };
}

// currentReport を受け取り工事費の明細と合計を計算して返す
function calcEstimate(r) {
  const lines = [];
  let total = 0;
  let hasRange = false;
  let rangeMin = 0, rangeMax = 0;

  // カメラ台数集計（グループから算出、fallbackとしてcameraCountsも使う）
  const groups = r.powerGroups || [];
  const counts = r.cameraCounts || {};
  const ipCnt     = groups.reduce((s, g) => s + (g.camIP || 0), 0)
                  || (counts['IPカメラ'] || 0) + (counts['ip'] || 0);
  const sterCnt   = groups.reduce((s, g) => s + (g.camStereo || 0), 0)
                  || (counts['ステレオカメラ'] || 0) + (counts['stereo'] || 0);
  const camTotal  = ipCnt + sterCnt;
  const sysCount  = r.systemCount || 1;

  if (camTotal > 0) {
    // グループ内ではカメラがプール（システム別ではない）ため、count>=2のときは
    // ceil(カメラ数 / システム数) でそのグループのsys1のカメラ数を推定する。
    // 上限は1システムあたりの最大接続数3台。
    const groupFree = groups.map(function(g) {
      const gCam = (g.camIP || 0) + (g.camStereo || 0);
      const gCnt = Math.max(1, g.count || 1);
      return Math.min(3, Math.ceil(gCam / gCnt));
    });
    // 最もカメラの多いグループのsys1を「基本工事の充当先」として採用
    const freeCams = groupFree.length
      ? Math.max.apply(null, groupFree)
      : Math.min(3, camTotal);
    const sysExtra = Math.max(0, sysCount - 1);
    const extraCam = Math.max(0, camTotal - freeCams);

    // 工事種別ごとの適用判定
    const isInstall = r.kojiType !== '撤去';  // 設置/仮設/交換/移設
    const isRemove  = r.kojiType === '撤去' || r.kojiType === '仮設'
                   || r.kojiType === '交換' || r.kojiType === '移設';

    // ── 設置料金 ──
    if (isInstall) {
      lines.push({ label: `基本設置工事費`, val: 65000 });
      total += 65000;
      if (sysExtra > 0) {
        const sysFee = sysExtra * 20000;
        lines.push({ label: `システム追加費（${sysExtra}台 × ¥20,000）`, val: sysFee });
        total += sysFee;
      }
      if (extraCam > 0) {
        const extraFee = extraCam * 15000;
        lines.push({ label: `追加カメラ工事費（${extraCam}台 × ¥15,000）`, val: extraFee });
        total += extraFee;
      }
    }

    // ── 撤去料金 ──
    if (isRemove) {
      lines.push({ label: `撤去基本工事費`, val: 40000 });
      total += 40000;
      if (sysExtra > 0) {
        const sysFee = sysExtra * 5000;
        lines.push({ label: `撤去システム追加費（${sysExtra}台 × ¥5,000）`, val: sysFee });
        total += sysFee;
      }
      if (extraCam > 0) {
        const extraFee = extraCam * 1500;
        lines.push({ label: `撤去追加カメラ工事費（${extraCam}台 × ¥1,500）`, val: extraFee });
        total += extraFee;
      }
    }
  }

  // アーム取付費（設置系のみ：撤去では計上しない）
  if (r.kojiType !== '撤去') {
    const armLines = buildArmMethodLines(groups);
    armLines.forEach(function(l) { lines.push(l); total += l.val; });
  }

  // サイネージ取付費／撤去費／移設費
  const signageTotal = (r.powerGroups || []).reduce(function(s, g) {
    return s + (g.deviceType === 'signage' ? (g.count || 0) : 0);
  }, 0);
  if (signageTotal > 0) {
    const sigKoji = r.kojiType;
    const sigInstall = sigKoji !== '撤去' && sigKoji !== '移設';
    const sigRemove = sigKoji === '撤去' || sigKoji === '仮設' || sigKoji === '交換';
    const sigRelocate = sigKoji === '移設';

    if (sigInstall) {
      const fee = signageTotal * 50000;
      lines.push({ label: `サイネージ取付費（${signageTotal}台 × ¥50,000）`, val: fee });
      total += fee;
    }
    if (sigRemove) {
      // 補足：推定金額
      const fee = signageTotal * 30000;
      lines.push({ label: `サイネージ撤去費（${signageTotal}台 × ¥30,000・推定金額）`, val: fee });
      total += fee;
    }
    if (sigRelocate) {
      // 補足：推定金額
      const fee = signageTotal * 20000;
      lines.push({ label: `サイネージ移設費（${signageTotal}台 × ¥20,000・推定金額）`, val: fee });
      total += fee;
    }
  }

  // Lidar取付費・撤去費（カメラと同じ工事種別ロジック）
  //   設置系（撤去以外）：取付費 ¥10,000/台 ＋ アーム種別ごとの単価
  //   撤去系（撤去/仮設/交換/移設）：撤去費 ¥6,000/台
  const lidarInstall = r.kojiType !== '撤去';
  const lidarRemove  = r.kojiType === '撤去' || r.kojiType === '仮設'
                    || r.kojiType === '交換' || r.kojiType === '移設';
  (r.powerGroups || []).forEach(function(g, gi) {
    if (g.deviceType !== 'lidar') return;
    const lidarN = (g.lidarCount != null) ? (parseInt(g.lidarCount) || 0) : (g.count || 0);
    if (lidarN <= 0) return;
    const gTag = ((r.powerGroups || []).length > 1)
      ? ' [' + ((g.groupName && g.groupName.trim()) || ('グループ' + (gi + 1))) + ']'
      : '';
    // 設置：取付費 ＋ アーム
    if (lidarInstall) {
      const fee = lidarN * LIDAR_INSTALL_PRICE;
      lines.push({ label: `Lidar取付費${gTag}（${lidarN}台 × ${fmtYen(LIDAR_INSTALL_PRICE)}）`, val: fee });
      total += fee;
      const arm = g.lidarArm || {};
      Object.keys(LIDAR_ARM_PRICES).forEach(function(key) {
        const cnt = parseInt(arm[key]) || 0;
        if (cnt <= 0) return;
        const rate = LIDAR_ARM_PRICES[key];
        const armFee = rate * cnt;
        lines.push({ label: `Lidarアーム（${key}）${gTag}（${cnt}台 × ${fmtYen(rate)}）`, val: armFee });
        total += armFee;
      });
    }
    // 撤去：1台 ¥6,000
    if (lidarRemove) {
      const remFee = lidarN * LIDAR_REMOVE_PRICE;
      lines.push({ label: `Lidar撤去費${gTag}（${lidarN}台 × ${fmtYen(LIDAR_REMOVE_PRICE)}）`, val: remFee });
      total += remFee;
    }
  });

  // LAN配線：区間ベース計算（旧フィールドからのフォールバックも対応）
  const lanSegs = getLanSegments(r);
  const lan = lanSegs.reduce(function(s, x) { return s + (parseFloat(x.length) || 0); }, 0);

  // LAN配線を要する機器（カメラ or Lidar）がある場合に長さベースの費用を計上
  // サイネージのみの構成では長さ入力をスキップしているため、延長費・配線費は計算しない
  const lanHasDevice = (r.powerGroups || []).some(function(g) {
    if (g.deviceType === 'signage') return false;
    if (g.deviceType === 'camera') return ((g.camIP || 0) + (g.camStereo || 0)) > 0;
    return true; // lidar
  });

  if (lanHasDevice) {
    // LANケーブル延長費（合計長さで判定）
    if (lan > 50) {
      const lanFee = Math.round((lan - 50) * 750);
      lines.push({ label: `LANケーブル延長費（${lan - 50}m超過 × ¥750）`, val: lanFee });
      total += lanFee;
    }

    // 区間ごとに配線方法別の料金を加算
    lanSegs.forEach(function(seg, i) {
      const len = parseFloat(seg.length) || 0;
      if (len <= 0) return;
      const tag = lanSegs.length > 1 ? `（${seg.label || ('区間' + (i + 1))}）` : '';
      if (seg.wiring === '露出') {
        const exposedFee = Math.round(len * PIPE_RATES['露出']);
        lines.push({ label: `LAN露出配線${tag}（${len}m × ${fmtYen(PIPE_RATES['露出'])}）`, val: exposedFee });
        total += exposedFee;
      } else if (seg.wiring === '配管' && seg.pipeType && seg.pipeType !== 'モール') {
        const rate = PIPE_RATES[seg.pipeType] || 0;
        if (rate > 0) {
          const lanPipeFee = Math.round(len * rate);
          lines.push({ label: `LAN配管 ${seg.pipeType}${tag}（${len}m × ${fmtYen(rate)}）`, val: lanPipeFee });
          total += lanPipeFee;
        }
      }
      // 天井内は配線費なし（既存仕様）。モール配管は下のモール集計で別計上。
    });
  }

  // 電源工事費
  const powerGroups = r.powerGroups || [];
  powerGroups.forEach(function(g) {
    if (g.power === 'no') {
      // 条件A：電気新設（概算¥100,000、東電申請含む）
      const baseFee = 100000;
      lines.push({ label: `電源新設工事費（東電申請含む・最低¥75,000〜最高¥115,000程度）`, val: baseFee });
      total += baseFee;
      // 電気ケーブル敷設
      if (g.newDistMode === 'custom' && g.newDistVal > 0) {
        const cableFee = g.newDistVal * 700;
        lines.push({ label: `電気ケーブル敷設（${g.newDistVal}m × ¥700）`, val: cableFee });
        total += cableFee;
      }
    } else if (g.power === 'yes') {
      // 条件B：既設使用可
      const dist = g.distMode === '1m以内' ? 1 : (g.distVal || 0);
      if (dist > 2) {
        lines.push({ label: `電気工事費（コンセント新設等）`, val: 15000 });
        total += 15000;
      }
      if (dist > 1) {
        const cableFee = dist * 700;
        lines.push({ label: `電気ケーブル敷設（${dist}m × ¥700）`, val: cableFee });
        total += cableFee;
      }
    }
    // 条件C：配管
    if (g.pipe === 'yes' && g.pipeType === 'モール') {
      // モール配管は別途モール費で計上
    } else if (g.pipe === 'yes' && g.pipeType) {
      const rate = PIPE_RATES[g.pipeType] || 0;
      if (rate > 0) {
        const pipeLen = g.newDistMode === 'custom' ? (g.newDistVal || 0) : (g.distMode === '1m以内' ? 1 : (g.distVal || 0));
        if (pipeLen > 0) {
          const pipeFee = pipeLen * rate;
          lines.push({ label: `電源配管 ${g.pipeType}（${pipeLen}m × ${fmtYen(rate)}）`, val: pipeFee });
          total += pipeFee;
        }
      }
    }
  });

  // 高所作業費
  if (r.kosoLine && r.kosoLine.includes('あり')) {
    const equip = r.kosoEquip || [];
    const supply = r.kosoSupply || '';
    let kosoFee = 0;
    if (equip.includes('高所作業車') || equip.includes('バケット車')) {
      kosoFee = supply === '現地貸し出し' ? 15000 : 65000;
    } else {
      kosoFee = 15000;
    }
    lines.push({ label: `高所作業費（${equip.join('・') || ''}）`, val: kosoFee });
    total += kosoFee;
  }

  // 警備員費・道路使用許可申請費（Step11の選択に基づき加算）
  // workPlan の days 合算（仮設は install/remove の合計、単独は single の値）
  const wpAll = r.workPlan || {};
  let days = 0;
  if (r.kojiType === '仮設') {
    days = (parseInt((wpAll.install || {}).days) || 0)
         + (parseInt((wpAll.remove  || {}).days) || 0);
  } else {
    days = parseInt((wpAll.single || {}).days) || 0;
  }
  if (days < 1) days = 1;

  // 警備員費：有・不明で加算
  if (r.guardOption === 'yes' || r.guardOption === 'unknown') {
    const guardFee = 23000 * days;
    const noteTag = r.guardOption === 'unknown' ? '・要確認' : '';
    lines.push({ label: `警備員費（${days}日 × ¥23,000${noteTag}）`, val: guardFee });
    total += guardFee;
  }

  // 道路使用許可申請費：有・不明で加算（金額幅）
  if (r.roadPermit === 'yes' || r.roadPermit === 'unknown') {
    const noteTag = r.roadPermit === 'unknown' ? '要確認' : '実費';
    lines.push({ label: `道路使用許可申請費（${noteTag}）`, val: null, min: 0, max: 12000 });
    rangeMin += 0; rangeMax += 12000; hasRange = true;
  }

  // パーキング代
  if (days > 0) {
    const parkFee = days * 5000;
    lines.push({ label: `パーキング代（${days}日 × ¥5,000）`, val: parkFee });
    total += parkFee;
  }

  // 休日対応費
  if ((r.workPlan || {}).holiday === 'yes') {
    lines.push({ label: `休日対応費`, val: 10000 });
    total += 10000;
  }

  // 夜間作業費
  const wp = r.workPlan || {};
  if (wp.night === 'yes') {
    const nightDays = parseInt(wp.nightDays) || 1;
    const nightHours = parseInt(wp.nightHours) || 0;
    let nightFee = 24000;
    if (nightDays >= 2 && nightHours > 0) nightFee += nightHours * 3000;
    lines.push({ label: `夜間作業費`, val: nightFee });
    total += nightFee;
  }

  // ポール新設費（本数 × 種別ごとに加算）
  if (r.poleNew === 'あり') {
    // 旧形式（poleItems無し）の互換：excavation/poleFinish から1件合成
    let items = Array.isArray(r.poleItems) ? r.poleItems.slice() : [];
    if (items.length === 0 && (r.excavation || r.poleFinish)) {
      items = [{ excavation: r.excavation || null, finish: r.poleFinish || null }];
    }
    if (items.length === 0) items = [{ excavation: null, finish: null }];
    const count = Math.max(items.length, r.poleCount || items.length || 1);
    // まとめてモード（items が1件しかない）のときは count 本ぶんに展開
    const expanded = (items.length === 1 && count > 1)
      ? Array.from({ length: count }, function() { return items[0]; })
      : items;

    const POLE_BASE = 313500;
    expanded.forEach(function(it, i) {
      const tag = expanded.length > 1 ? ' #' + (i + 1) : '';
      lines.push({ label: `ポール新設費（基本）${tag}`, val: POLE_BASE });
      total += POLE_BASE;
      if (it.excavation === 'アスファルト') {
        lines.push({ label: `掘削費・アスファルト${tag}`, val: 83500 });
        total += 83500;
      } else if (it.excavation === 'コンクリ' || it.excavation === 'コンクリート') {
        lines.push({ label: `掘削費・コンクリ${tag}`, val: 208750 });
        total += 208750;
      }
      if (it.finish === 'アスファルト仕上げ') {
        lines.push({ label: `アスファルト復旧${tag}`, val: 26000 });
        total += 26000;
      } else if (it.finish === '左官仕上げ') {
        lines.push({ label: `コンクリートモルタル仕上げ復旧${tag}`, val: 50000 });
        total += 50000;
      }
    });
  }

  // モール配管費（電源グループ + LAN区間 から集計）
  let moorCount = powerGroups.filter(function(g) { return g.pipe === 'yes' && g.pipeType === 'モール'; }).length;
  moorCount += lanSegs.filter(function(s) { return s.wiring === '配管' && s.pipeType === 'モール'; }).length;
  if (moorCount > 0) {
    const moorFee = moorCount * 3000;
    lines.push({ label: `モール配管費（${moorCount}箇所 × ¥3,000）`, val: moorFee });
    total += moorFee;
  }

  // 遠方費（選択した施工会社の交通費・宿泊費）※15%諸経費の対象に含める
  const tSel = (typeof getSelectedTransport === 'function') ? getSelectedTransport(r) : null;
  if (tSel && tSel.amount > 0) {
    const srcNote = tSel.source === 'area' ? '・エリア概算' : '';
    lines.push({ label: `遠方費（${tSel.company}・${tSel.name}${srcNote}）`, val: tSel.amount });
    total += tSel.amount;
  }

  // 法定福利費・諸経費 15%
  const overhead = Math.round(total * 0.15);
  const overheadMin = Math.round(rangeMin * 0.15);
  const overheadMax = Math.round(rangeMax * 0.15);
  lines.push({ label: `法定福利費・諸経費（15%）`, val: overhead });
  total += overhead;

  // 現調費（バカン／施工会社）※諸経費の対象外・別枠で計上
  const gentyo = (typeof calcGentyoFee === 'function') ? calcGentyoFee(r) : { lines: [], total: 0 };
  if (gentyo.total > 0) {
    gentyo.lines.forEach(function(l) { lines.push(l); });
    total += gentyo.total;
  }

  const finalMin = total + overheadMin;
  const finalMax = total + overheadMax;

  return {
    lines: lines,
    total: total,
    hasRange: hasRange,
    finalMin: finalMin,
    finalMax: finalMax,
    camTotal: camTotal,
    lan: lan
  };
}

// 数値を円表示（¥1,000形式）にフォーマットする
function fmtYen(n) {
  return '¥' + n.toLocaleString('ja-JP');
}

// 概算見積セクションを計算結果で描画する
function renderEstimate(r) {
  const est = calcEstimate(r);
  const sec = document.getElementById('estimateSection');
  const rowsEl = document.getElementById('estimateRows');
  const totalEl = document.getElementById('estimateTotalVal');
  const rangeEl = document.getElementById('estimateRangeNote');
  const dlBtn = document.getElementById('downloadEstimateBtn');

  if (est.camTotal === 0 && (r.powerGroups || []).length === 0) {
    sec.style.display = 'none';
    dlBtn.style.display = 'none';
    return;
  }

  rowsEl.innerHTML = est.lines.map(function(l) {
    const valStr = l.val !== null && l.val !== undefined
      ? fmtYen(l.val)
      : (l.min === 0 ? `〜${fmtYen(l.max)}` : `${fmtYen(l.min)}〜${fmtYen(l.max)}`);
    return `<div class="estimate-row"><span class="estimate-row-label">${l.label}</span><span class="estimate-row-val">${valStr}</span></div>`;
  }).join('');

  totalEl.textContent = fmtYen(est.total);

  if (est.hasRange) {
    rangeEl.textContent = `※変動項目を含む場合の幅：${fmtYen(est.finalMin)}〜${fmtYen(est.finalMax)}`;
    rangeEl.style.display = 'block';
  } else {
    rangeEl.style.display = 'none';
  }

  // 遠方費：施工会社の選択UI（選んだ会社の額が上の合計に遠方費として計上される）
  const transpEl = document.getElementById('estimateTransport');
  if (transpEl) {
    transpEl.innerHTML = buildTransportSelectorHtml(r);
    transpEl.style.display = transpEl.innerHTML ? 'block' : 'none';
  }
  // 遠方費を変数として保持（他ツールへ受け渡し可能にする）
  storeTransportFee(r);

  sec.style.display = 'block';
  dlBtn.style.display = 'block';
}

// Step11「作業計画」の構造から交通費計算用の作業日数を取り出す
// 仮設：install（設置）+ remove（撤去）の合計、それ以外：single の日数
function getTransportDays(r) {
  const wp = r.workPlan || {};
  let days;
  if (r.kojiType === '仮設') {
    days = (parseInt(wp.install && wp.install.days) || 0)
         + (parseInt(wp.remove  && wp.remove.days)  || 0);
  } else {
    days = parseInt(wp.single && wp.single.days) || 0;
  }
  return days > 0 ? days : 1;
}

// 遠方費：施工会社の選択UI(HTML)を生成する。選択肢が無ければ空文字。
function buildTransportSelectorHtml(r) {
  const opts = buildTransportOptions(r);
  if (!opts.length) return '';
  const sel = getSelectedTransport(r);
  const selCompany = sel ? sel.company : null;
  const region = r.transportRegion || r.transportArea || null;
  const rec = recommendedCompany(region);
  const isArea = opts[0].source === 'area';

  let html = '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">'
    + '<div style="font-size:11px;color:var(--text-dim);font-weight:700;margin-bottom:8px;">🚗 遠方費：施工会社を選択（合計に計上）</div>';

  html += opts.map(function(o) {
    const checked = o.company === selCompany;
    const badge = o.recommended ? ' <span style="color:var(--accent2);font-weight:700;">⭐推奨</span>' : '';
    const border = checked ? 'var(--accent2)' : 'var(--border)';
    const bg = checked ? 'rgba(120,160,255,0.08)' : 'transparent';
    // 内訳（交通費＋宿泊費）
    let detail = '';
    if (o.amount > 0) {
      detail = '交通費 ' + fmtYen(o.transport);
      if (o.lodging > 0) detail += ' ＋ 宿泊費 ' + fmtYen(o.lodging) + '（' + o.nights + '泊）';
    }
    return '<label onclick="selectTransportCompany(\'' + o.company + '\')" '
      + 'style="display:block;padding:8px 10px;margin-bottom:6px;border:1px solid ' + border + ';'
      + 'border-radius:8px;background:' + bg + ';cursor:pointer;">'
      + '<span style="display:flex;align-items:center;justify-content:space-between;gap:8px;">'
      + '<span style="display:flex;align-items:center;gap:6px;font-size:12px;">'
      + '<input type="radio" name="transportCompany" ' + (checked ? 'checked' : '') + ' style="pointer-events:none;">'
      + '<span>' + o.company + '（' + o.name + '）' + badge + '</span></span>'
      + '<span style="font-size:12px;font-weight:700;white-space:nowrap;">' + o.label + '</span>'
      + '</span>'
      + (detail ? '<span style="display:block;font-size:11px;color:var(--text-dim);margin-top:4px;padding-left:22px;">' + detail + '</span>' : '')
      + '</label>';
  }).join('');

  if (rec === null && opts.length > 1) {
    html += '<div style="font-size:11px;color:var(--text-dim);margin-top:2px;">関東はどちらの会社でも対応可能です。</div>';
  }
  if (isArea) {
    html += '<div style="font-size:11px;color:var(--text-dim);margin-top:2px;">※住所が取得できなかったため、エリア代表距離による概算です。</div>';
  }
  html += '</div>';
  return html;
}

// 選択していない会社の遠方費を「他社参考」行として返す（モーダル・テキスト表示用）
function buildTransportAltRows(r) {
  const opts = buildTransportOptions(r);
  if (opts.length <= 1) return [];
  const sel = getSelectedTransport(r);
  const selCompany = sel ? sel.company : null;
  return opts.filter(function(o) { return o.company !== selCompany; })
    .map(function(o) {
      return { label: `他社参考：${o.company}（${o.name}）`, val: o.label };
    });
}

// 見積をダウンロード用のテキスト形式に変換する
function buildEstimateText(r) {
  const est = calcEstimate(r);
  const lines = [
    '【概算見積】※施工費のみ・機器代金別途',
    '',
    '■ 工事概要',
    `　現場名：${r.siteName || ''}`,
    `　カメラ台数：${est.camTotal}台`,
    `　LANケーブル：約${est.lan}m`,
    '',
    '■ 費用内訳',
  ];
  est.lines.forEach(function(l) {
    const valStr = l.val !== null && l.val !== undefined
      ? fmtYen(l.val)
      : (l.min === 0 ? `〜${fmtYen(l.max)}` : `${fmtYen(l.min)}〜${fmtYen(l.max)}`);
    lines.push(`　${l.label}：${valStr}`);
  });
  lines.push('');
  lines.push('■ 合計概算');
  lines.push(`　${fmtYen(est.total)}（税抜）`);
  if (est.hasRange) {
    lines.push(`　※変動項目を含む場合：${fmtYen(est.finalMin)}〜${fmtYen(est.finalMax)}`);
  }
  const altRows = buildTransportAltRows(r);
  if (altRows.length > 0) {
    lines.push('');
    lines.push('■ 遠方費 他社参考');
    altRows.forEach(function(row) {
      lines.push(`　${row.label}：${row.val}`);
    });
  }
  lines.push('');
  lines.push('※施工費のみの概算です。実際の費用は現場状況により変動します。');
  lines.push('※遠方費は選択した施工会社の交通費・宿泊費を計上しています。');
  return lines.join('\n');
}

// 指定レポートの見積テキストを .txt ファイルでダウンロードする
function downloadEstimateFor(r) {
  if (!r) return;
  const text = buildEstimateText(r);
  const sn = (r.siteName || '現場').replace(/[\\\/:\*\?"<>\|]/g,'_');
  let dateStr = 'nodate';
  if (r.createdAt) {
    const parts = r.createdAt.replace(/\//g,'-').split('-');
    if (parts.length === 3) dateStr = parts[0] + parts[1].padStart(2,'0') + parts[2].padStart(2,'0');
  }
  dl(text, dateStr + '_' + sn + '_見積.txt');
  showToast('見積ファイルを書き出しました！', 'green');
}

// 入力中レポートの見積を .txt ファイルでダウンロードする
function downloadEstimate() {
  downloadEstimateFor(currentReport);
}

// 保存済みリストから指定IDの見積を .txt ファイルでダウンロードする
function downloadEstimateFromList(id) {
  downloadEstimateFor(getSaved().find(x => x.id === id));
}

// モーダル表示中レポートの見積を .txt ファイルでダウンロードする
function downloadModalEstimate() {
  downloadEstimateFor(modalReport);
}
