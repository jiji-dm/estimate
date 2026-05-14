// ══════════════════════════════════════
// 概算見積計算
// ══════════════════════════════════════
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
    // 各グループの「sys1相当の無料枠候補値」を算出
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

    // 基本工事費（sys1 + sys1のカメラ最大3台込み）
    const base = 65000;
    lines.push({ label: `基本設置工事費`, val: base });
    total += base;

    // 追加システム費（2台目以降）
    const sysExtra = Math.max(0, sysCount - 1);
    if (sysExtra > 0) {
      const sysFee = sysExtra * 20000;
      lines.push({ label: `システム追加費（${sysExtra}台 × ¥20,000）`, val: sysFee });
      total += sysFee;
    }

    // 追加カメラ費（sys1の3台超過分 + 他システム紐付きのカメラ全部）
    const extraCam = Math.max(0, camTotal - freeCams);
    if (extraCam > 0) {
      const extraFee = extraCam * 15000;
      lines.push({ label: `追加カメラ工事費（${extraCam}台 × ¥15,000）`, val: extraFee });
      total += extraFee;
    }
  }

  // LANケーブル延長費
  const lan = parseFloat(r.lanLength) || 0;
  if (lan > 50) {
    const lanFee = Math.round((lan - 50) * 750);
    lines.push({ label: `LANケーブル延長費（${lan - 50}m超過 × ¥750）`, val: lanFee });
    total += lanFee;
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
    } else if (g.pipe === 'yes') {
      // 電源配管（¥1,500/m）- 距離不明の場合は注記のみ
      const pipeLen = g.newDistMode === 'custom' ? (g.newDistVal || 0) : (g.distMode === '1m以内' ? 1 : (g.distVal || 0));
      if (pipeLen > 0) {
        const pipeFee = pipeLen * 1500;
        lines.push({ label: `電源配管（${pipeLen}m × ¥1,500）`, val: pipeFee });
        total += pipeFee;
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

  // 屋外設置費用
  const days = parseInt((r.workPlan || {}).days) || 1;
  if (r.location === '屋外') {
    const guardFee = 23000 * days;
    lines.push({ label: `警備員費（${days}日 × ¥23,000）`, val: guardFee });
    total += guardFee;
    // 道路使用許可は要確認のため注記のみ
    lines.push({ label: `道路使用許可申請費（要確認）`, val: null, min: 0, max: 12000 });
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

  // 撤去工事費（仮設）
  if (r.kojiType === '仮設') {
    const remFee = (40000 + 5000) * sysCount;
    lines.push({ label: `撤去工事費（${sysCount}システム）`, val: remFee });
    total += remFee;
  }

  // ポール新設費
  if (r.poleNew === 'yes') {
    lines.push({ label: `ポール新設費（基本）`, val: 313500 });
    total += 313500;
    // 掘削条件
    const exc = r.excavation || '';
    if (exc === 'アスファルト') {
      lines.push({ label: `掘削費・アスファルト（約）`, val: 83500 });
      total += 83500;
    } else if (exc === 'コンクリート') {
      lines.push({ label: `掘削費・コンクリート（約）`, val: 208750 });
      total += 208750;
    }
  }

  // モール配管費（電源グループから集計）
  const moorCount = powerGroups.filter(function(g) { return g.pipe === 'yes' && g.pipeType === 'モール'; }).length;
  if (moorCount > 0) {
    const moorFee = moorCount * 3000;
    lines.push({ label: `モール配管費（${moorCount}箇所 × ¥3,000）`, val: moorFee });
    total += moorFee;
  }

  // 法定福利費・諸経費 15%
  const overhead = Math.round(total * 0.15);
  const overheadMin = Math.round(rangeMin * 0.15);
  const overheadMax = Math.round(rangeMax * 0.15);
  lines.push({ label: `法定福利費・諸経費（15%）`, val: overhead });
  total += overhead;

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

  // 交通費参考表示
  const transpEl = document.getElementById('estimateTransport');
  if (transpEl) {
    const transportRows = buildTransportRows(r);
    if (transportRows.length > 0) {
      transpEl.innerHTML = '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">'
        + '<div style="font-size:11px;color:var(--text-dim);font-weight:700;margin-bottom:6px;">🚗 交通費参考（施工費とは別）</div>'
        + transportRows.map(function(row) {
            return `<div class="estimate-row"><span class="estimate-row-label">${row.label}</span><span class="estimate-row-val">${row.val}</span></div>`;
          }).join('')
        + '</div>';
      transpEl.style.display = 'block';
    } else {
      transpEl.style.display = 'none';
    }
  }

  sec.style.display = 'block';
  dlBtn.style.display = 'block';
}

// officeDistances と作業日数から交通費参考行を生成する
function buildTransportRows(r) {
  const dists = r.officeDistances || [];
  if (!dists.length) return [];
  const days = parseInt(((r.workPlan || {}).days)) || 1;
  return dists.map(function(od) {
    const label = `交通費（${od.company}・${od.name}、${od.distKm}km）`;
    const val = calcTransportLabel(od.distKm, od.distM, days);
    return { label: label, val: val };
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
  const transportRows = buildTransportRows(r);
  if (transportRows.length > 0) {
    lines.push('');
    lines.push('■ 交通費参考（施工費とは別途）');
    transportRows.forEach(function(row) {
      lines.push(`　${row.label}：${row.val}`);
    });
  }
  lines.push('');
  lines.push('※施工費のみの概算です。実際の費用は現場状況により変動します。');
  return lines.join('\n');
}

// 見積テキストを .txt ファイルでダウンロードする
function downloadEstimate() {
  if (!currentReport) return;
  const text = buildEstimateText(currentReport);
  const r = currentReport;
  const sn = (r.siteName || '現場').replace(/[\\\/:\*\?"<>\|]/g,'_');
  let dateStr = 'nodate';
  if (r.createdAt) {
    const parts = r.createdAt.replace(/\//g,'-').split('-');
    if (parts.length === 3) dateStr = parts[0] + parts[1].padStart(2,'0') + parts[2].padStart(2,'0');
  }
  dl(text, dateStr + '_' + sn + '_見積.txt');
  showToast('見積ファイルを書き出しました！', 'green');
}
