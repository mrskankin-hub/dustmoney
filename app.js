const LS_KEYS = {
  OVERRIDES: 'sanpai.priceOverrides.v1',
  HISTORY: 'sanpai.calcHistory.v1',
  UI: 'sanpai.uiState.v1',
};

const UNIT_LABELS = { kg: 'kg', m3: 'm³', m2: 'm²', 枚: '枚', 本: '本', 個: '個', 台: '台', 缶: '缶', 回: '回' };

function formatYen(n) {
  return '¥' + Math.round(n || 0).toLocaleString('ja-JP');
}

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn('storage read failed', e);
    return fallback;
  }
}
function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('storage write failed', e);
  }
}

// ---------------- Store ----------------
const Store = {
  loadOverrides() { return safeGet(LS_KEYS.OVERRIDES, {}); },
  saveOverrides(obj) { safeSet(LS_KEYS.OVERRIDES, obj); },
  setItemOverride(companyId, itemId, patch) {
    const all = Store.loadOverrides();
    if (!all[companyId]) all[companyId] = {};
    if (!all[companyId].items) all[companyId].items = {};
    all[companyId].items[itemId] = Object.assign({}, all[companyId].items[itemId], patch);
    Store.saveOverrides(all);
  },
  setTierOverride(companyId, tiersName, newArray) {
    const all = Store.loadOverrides();
    if (!all[companyId]) all[companyId] = {};
    if (!all[companyId].tiers) all[companyId].tiers = {};
    all[companyId].tiers[tiersName] = newArray;
    Store.saveOverrides(all);
  },
  resetItemOverride(companyId, itemId) {
    const all = Store.loadOverrides();
    if (all[companyId] && all[companyId].items) {
      delete all[companyId].items[itemId];
      Store.saveOverrides(all);
    }
  },
  resetTierOverride(companyId, tiersName) {
    const all = Store.loadOverrides();
    if (all[companyId] && all[companyId].tiers) {
      delete all[companyId].tiers[tiersName];
      Store.saveOverrides(all);
    }
  },
  resetAllOverrides(companyId) {
    const all = Store.loadOverrides();
    delete all[companyId];
    Store.saveOverrides(all);
  },
  loadHistory() { return safeGet(LS_KEYS.HISTORY, []); },
  pushHistoryEntry(entry) {
    const list = Store.loadHistory();
    list.unshift(entry);
    if (list.length > 100) list.length = 100;
    safeSet(LS_KEYS.HISTORY, list);
  },
  deleteHistoryEntry(id) {
    safeSet(LS_KEYS.HISTORY, Store.loadHistory().filter((e) => e.id !== id));
  },
  clearHistory() { safeSet(LS_KEYS.HISTORY, []); },
  loadUiState() { return safeGet(LS_KEYS.UI, {}); },
  saveUiState(patch) {
    safeSet(LS_KEYS.UI, Object.assign({}, Store.loadUiState(), patch));
  },
};

// ---------------- Pricing ----------------
const Pricing = {
  getEffectiveCompany(companyId) {
    const base = COMPANIES[companyId];
    const overrides = Store.loadOverrides()[companyId] || {};
    const items = base.items.map((item) => {
      const patch = overrides.items && overrides.items[item.id];
      return patch ? Object.assign({}, item, patch) : item;
    });
    const company = Object.assign({}, base, { items });
    ['plasticRateTiers', 'woodRateTiers'].forEach((tiersName) => {
      if (base[tiersName]) {
        const tOverride = overrides.tiers && overrides.tiers[tiersName];
        company[tiersName] = tOverride || base[tiersName];
      }
    });
    return company;
  },

  calcLine(item, company, input, cashPaymentOn) {
    if (!item) return { subtotalExcl: 0, subtotalIncl: 0 };
    let subtotalExcl = 0;
    switch (item.type) {
      case 'variant': {
        const variant = item.variants[input.variantIndex || 0];
        subtotalExcl = (variant ? variant.priceExcl : 0) * (input.qty || 0);
        break;
      }
      case 'tiered': {
        const tiers = company[item.tiers] || [];
        const tier = tiers[input.tierIndex || 0];
        subtotalExcl = (tier ? tier.priceExcl : 0) * (input.qty || 0);
        break;
      }
      case 'plastic_plus_unit': {
        const tiers = company.plasticRateTiers || [];
        const tier = tiers[input.tierIndex || 0];
        const kgCost = (tier ? tier.priceExcl : 0) * (input.kg || 0);
        const addOn = (item.addOnPerUnit || 0) * (input.count || 0);
        subtotalExcl = kgCost + addOn;
        break;
      }
      default: {
        subtotalExcl = (item.priceExcl || 0) * (input.qty || 0);
      }
    }
    if (item.cashDiscount && cashPaymentOn) {
      subtotalExcl = Math.max(0, subtotalExcl - 500);
    }
    return { subtotalExcl, subtotalIncl: incl(subtotalExcl) };
  },

  calcTotals(lineResults) {
    const subtotalExcl = lineResults.reduce((s, r) => s + r.subtotalExcl, 0);
    const tax = Math.round(subtotalExcl * TAX_RATE);
    const totalIncl = subtotalExcl + tax;
    const unconfirmedCount = lineResults.filter((r) => r.confirmed === false).length;
    return { subtotalExcl, tax, totalIncl, unconfirmedCount };
  },
};

// ---------------- Img ----------------
const Img = {
  async toProcessedCanvas(file, opts) {
    const { maxDim = 1600, grayscale = true, contrastBoost = true } = opts || {};
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    if (grayscale || contrastBoost) {
      const imageData = ctx.getImageData(0, 0, width, height);
      const d = imageData.data;
      if (grayscale) {
        for (let i = 0; i < d.length; i += 4) {
          const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          d[i] = d[i + 1] = d[i + 2] = g;
        }
      }
      if (contrastBoost) {
        let min = 255, max = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] < min) min = d[i];
          if (d[i] > max) max = d[i];
        }
        const range = max - min || 1;
        for (let i = 0; i < d.length; i += 4) {
          const v = Math.min(255, Math.max(0, ((d[i] - min) / range) * 255));
          d[i] = d[i + 1] = d[i + 2] = v;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }
    return canvas;
  },
};

// ---------------- OCR ----------------
const OCR = {
  STATUS_LABELS_JA: {
    'loading tesseract core': '認識エンジンを読み込み中...',
    'initializing tesseract': '初期化中...',
    'initializing api': '初期化中...',
    'loading language traineddata': '言語データを読み込み中...',
    'initialized api': '準備完了',
    'recognizing text': '文字を認識中...',
  },
  _workerPromise: null,
  _progressCallback: null,
  ensureWorker() {
    if (!OCR._workerPromise) {
      OCR._workerPromise = Tesseract.createWorker('jpn+eng', 1, {
        logger: (m) => { if (OCR._progressCallback) OCR._progressCallback(m); },
      });
    }
    return OCR._workerPromise;
  },
  async recognizeImage(canvas, onProgress) {
    OCR._progressCallback = onProgress || null;
    const worker = await OCR.ensureWorker();
    const { data } = await worker.recognize(canvas);
    OCR._progressCallback = null;
    const text = data.text || '';
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    return { text, lines };
  },
};

// ---------------- Parser ----------------
const FULLWIDTH_MAP = { '０': '0', '１': '1', '２': '2', '３': '3', '４': '4', '５': '5', '６': '6', '７': '7', '８': '8', '９': '9', '．': '.', '，': ',' };
const QTY_UNIT_REGEX = /(\d+(?:\.\d+)?)\s*(kg|m3|m2|枚|本|個|台|缶)/i;

const Parser = {
  toHalfWidth(str) {
    return str.replace(/[０-９．，]/g, (ch) => FULLWIDTH_MAP[ch] || ch);
  },
  normalizeUnits(str) {
    return str
      .replace(/[ｋK][ｇG]/gi, 'kg')
      .replace(/[ｍM]３|㎥|m３/gi, 'm3')
      .replace(/m³/gi, 'm3')
      .replace(/[ｍM]２|㎡|m２/gi, 'm2')
      .replace(/m²/gi, 'm2');
  },
  normalizeLine(line) {
    return Parser.normalizeUnits(Parser.toHalfWidth(line));
  },
  extractQuantityUnit(normalizedLine) {
    const m = normalizedLine.match(QTY_UNIT_REGEX);
    if (!m) return null;
    return { qty: parseFloat(m[1]), unit: m[2].toLowerCase(), matchText: m[0], index: m.index };
  },
  candidateName(normalizedLine, match) {
    let name = normalizedLine.slice(0, match.index) + normalizedLine.slice(match.index + match.matchText.length);
    return name.replace(/^[\s\d.．)　・-]+/, '').trim();
  },
  stripParenthetical(s) {
    return s.replace(/[（(][^）)]*[）)]/g, '').replace(/[\s　]/g, '');
  },
  bigrams(s) {
    const arr = [];
    for (let i = 0; i < s.length - 1; i++) arr.push(s.slice(i, i + 2));
    return arr;
  },
  diceCoefficient(a, b) {
    const bgA = Parser.bigrams(a), bgB = Parser.bigrams(b);
    if (bgA.length === 0 || bgB.length === 0) return a === b ? 1 : 0;
    const mapB = {};
    bgB.forEach((bg) => { mapB[bg] = (mapB[bg] || 0) + 1; });
    let matches = 0;
    bgA.forEach((bg) => { if (mapB[bg] > 0) { matches++; mapB[bg]--; } });
    return (2 * matches) / (bgA.length + bgB.length);
  },
  matchItem(candidateNameStr, items) {
    const target = Parser.stripParenthetical(candidateNameStr);
    let best = null, bestScore = 0;
    items.forEach((item) => {
      if (item.disabled) return;
      const score = Parser.diceCoefficient(target, Parser.stripParenthetical(item.name));
      if (score > bestScore) { bestScore = score; best = item; }
    });
    return { item: bestScore >= 0.3 ? best : null, score: bestScore };
  },
  parseOcrText(lines, company) {
    const suggestions = [];
    lines.forEach((rawLine) => {
      const norm = Parser.normalizeLine(rawLine);
      const qu = Parser.extractQuantityUnit(norm);
      if (!qu) return;
      const candName = Parser.candidateName(norm, qu);
      const { item, score } = Parser.matchItem(candName, company.items);
      suggestions.push({
        rawLine, qty: qu.qty, unit: qu.unit,
        matchedItemId: item ? item.id : null,
        matchedItemName: item ? item.name : (candName || rawLine),
        score,
        unitMismatch: item ? (item.unit && item.unit !== qu.unit) : false,
      });
    });
    return suggestions;
  },
  findForbiddenHits(rawText, forbiddenList) {
    if (!forbiddenList) return [];
    const hits = [];
    forbiddenList.forEach((keyword) => {
      const bare = keyword.replace(/[（(][^）)]*[）)]/g, '');
      if (bare && (rawText.includes(bare) || rawText.includes(keyword))) hits.push(keyword);
    });
    return hits;
  },
};

// ---------------- Calc (in-memory row state) ----------------
const Calc = (() => {
  let rows = [];
  let rowCounter = 0;
  return {
    addRow(prefill) {
      const rowId = 'row_' + (++rowCounter) + '_' + Date.now();
      const row = Object.assign({
        rowId, itemId: null, qty: 0, variantIndex: 0, tierIndex: UI.defaultTierIndex || 0,
        kg: 0, count: 0, confirmed: true, sourcedFromOcr: false,
      }, prefill || {});
      if (row.sourcedFromOcr) row.confirmed = false;
      rows.push(row);
      UI.renderCalcRows();
      return row;
    },
    removeRow(rowId) {
      rows = rows.filter((r) => r.rowId !== rowId);
      UI.renderCalcRows();
    },
    clearRows() {
      rows = [];
      UI.renderCalcRows();
    },
    getRows() { return rows; },
  };
})();

// ---------------- UI ----------------
const UI = {
  cashPaymentOn: false,
  defaultTierIndex: 0,

  buildCalcInputFromRow(row, item) {
    switch (item.type) {
      case 'variant': return { variantIndex: row.variantIndex || 0, qty: row.qty || 0 };
      case 'tiered': return { tierIndex: row.tierIndex || 0, qty: row.qty || 0 };
      case 'plastic_plus_unit': return { tierIndex: row.tierIndex || 0, kg: row.kg || 0, count: row.count || 0 };
      default: return { qty: row.qty || 0 };
    }
  },

  renderCompanyTabs() {
    const container = document.getElementById('companyTabs');
    container.innerHTML = '';
    const shortNames = { tsukasa: 'ツカサ・エコ', marumatsu: '丸松産業/エコファースト', koei: 'コーエイ' };
    Object.keys(COMPANIES).forEach((companyId) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'company-tab-btn';
      btn.textContent = shortNames[companyId] || COMPANIES[companyId].name;
      btn.setAttribute('aria-pressed', companyId === currentCompanyId ? 'true' : 'false');
      btn.addEventListener('click', () => UI.switchCompany(companyId));
      container.appendChild(btn);
    });
  },

  switchCompany(companyId) {
    if (companyId === currentCompanyId) return;
    if (Calc.getRows().length > 0) {
      const ok = confirm('会社を変更すると入力中の行は消えます。よろしいですか？');
      if (!ok) return;
    }
    currentCompanyId = companyId;
    Calc.clearRows();
    UI.defaultTierIndex = 0;
    Store.saveUiState({ lastCompanyId: companyId });
    document.getElementById('ocrSuggestions').innerHTML = '';
    document.getElementById('forbiddenWarning').classList.add('hidden');
    UI.renderCompanyTabs();
    UI.renderPriceTable();
    UI.renderDeliveryMethodArea();
    UI.renderCalcRows();
  },

  onPriceChanged() {
    UI.renderPriceTable();
    UI.renderDeliveryMethodArea();
    UI.renderCalcRows();
  },

  renderPriceTable() {
    const company = Pricing.getEffectiveCompany(currentCompanyId);
    const body = document.getElementById('priceTableBody');
    body.innerHTML = '';
    const byCategory = {};
    const order = [];
    company.items.forEach((item) => {
      if (!byCategory[item.category]) { byCategory[item.category] = []; order.push(item.category); }
      byCategory[item.category].push(item);
    });
    order.forEach((cat) => {
      const section = document.createElement('div');
      section.className = 'price-category';
      const h3 = document.createElement('h3');
      h3.textContent = cat;
      section.appendChild(h3);
      byCategory[cat].forEach((item) => section.appendChild(UI.buildPriceRow(item, company)));
      body.appendChild(section);
    });
    if (company.notes && company.notes.length) {
      const notesDiv = document.createElement('div');
      notesDiv.className = 'hint';
      const strong = document.createElement('strong');
      strong.textContent = '備考:';
      notesDiv.appendChild(strong);
      const ul = document.createElement('ul');
      company.notes.forEach((n) => {
        const li = document.createElement('li');
        li.textContent = n;
        ul.appendChild(li);
      });
      notesDiv.appendChild(ul);
      body.appendChild(notesDiv);
    }
    if (company.forbidden && company.forbidden.length) {
      const fDiv = document.createElement('div');
      fDiv.className = 'hint';
      const strong = document.createElement('strong');
      strong.textContent = '受入不可品目: ';
      fDiv.appendChild(strong);
      fDiv.appendChild(document.createTextNode(company.forbidden.join('、')));
      body.appendChild(fDiv);
    }
    UI.renderTieredRatesArea(company);
  },

  buildPriceRow(item, company) {
    const row = document.createElement('div');
    row.className = 'price-row' + (item.disabled ? ' disabled' : '');
    const nameDiv = document.createElement('div');
    nameDiv.className = 'price-row-name';
    nameDiv.textContent = `${item.category} - ${item.name}`;
    if (item.disabled) {
      const b = document.createElement('span');
      b.className = 'badge badge-disabled';
      b.textContent = '受入不可';
      nameDiv.appendChild(b);
    }
    if (item.note && item.note.startsWith('要確認')) {
      const b = document.createElement('span');
      b.className = 'badge badge-warn';
      b.textContent = '⚠要確認';
      nameDiv.appendChild(b);
    }
    row.appendChild(nameDiv);

    const controls = document.createElement('div');
    controls.className = 'price-row-controls';

    if (item.disabled) {
      // 入力なし
    } else if (item.type === 'variant') {
      item.variants.forEach((v, idx) => {
        const label = document.createElement('label');
        label.textContent = `${v.label} (円/${UNIT_LABELS[item.unit] || item.unit})`;
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'price-input';
        input.value = v.priceExcl;
        input.addEventListener('change', () => {
          const newVariants = item.variants.map((vv, i) => (i === idx ? Object.assign({}, vv, { priceExcl: parseFloat(input.value) || 0 }) : vv));
          Store.setItemOverride(currentCompanyId, item.id, { variants: newVariants });
          UI.onPriceChanged();
        });
        label.appendChild(input);
        controls.appendChild(label);
      });
    } else if (item.type === 'tiered') {
      const note = document.createElement('span');
      note.className = 'hint';
      note.textContent = '単価は上の「搬入方法別単価」で編集';
      controls.appendChild(note);
    } else if (item.type === 'plastic_plus_unit') {
      const label = document.createElement('label');
      label.textContent = `追加料金 (円/${UNIT_LABELS[item.unit] || item.unit})`;
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'price-input';
      input.value = item.addOnPerUnit;
      input.addEventListener('change', () => {
        Store.setItemOverride(currentCompanyId, item.id, { addOnPerUnit: parseFloat(input.value) || 0 });
        UI.onPriceChanged();
      });
      label.appendChild(input);
      controls.appendChild(label);
      const note = document.createElement('span');
      note.className = 'hint';
      note.textContent = '＋現在の廃プラ単価×kg';
      controls.appendChild(note);
    } else if (item.priceExcl === null || item.priceExcl === undefined) {
      const span = document.createElement('span');
      span.className = 'hint';
      span.textContent = item.note || '単価未設定';
      controls.appendChild(span);
    } else {
      const label = document.createElement('label');
      label.textContent = `税抜(円/${UNIT_LABELS[item.unit] || item.unit})`;
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'price-input';
      input.value = item.priceExcl;
      input.addEventListener('change', () => {
        const val = parseFloat(input.value) || 0;
        Store.setItemOverride(currentCompanyId, item.id, { priceExcl: val, priceIncl: incl(val) });
        UI.onPriceChanged();
      });
      label.appendChild(input);
      controls.appendChild(label);
      const inclSpan = document.createElement('span');
      inclSpan.className = 'hint';
      inclSpan.textContent = `税込 ${formatYen(incl(item.priceExcl))}`;
      controls.appendChild(inclSpan);
    }

    if (!item.disabled) {
      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'reset-btn';
      resetBtn.textContent = '元に戻す';
      resetBtn.addEventListener('click', () => {
        Store.resetItemOverride(currentCompanyId, item.id);
        UI.onPriceChanged();
      });
      controls.appendChild(resetBtn);
    }
    row.appendChild(controls);
    return row;
  },

  renderTieredRatesArea(company) {
    const area = document.getElementById('tieredRatesArea');
    area.innerHTML = '';
    const labels = { plasticRateTiers: '廃プラスチック類・搬入方法別単価', woodRateTiers: '木くず・搬入方法別単価' };
    ['plasticRateTiers', 'woodRateTiers'].forEach((tiersName) => {
      if (!company[tiersName]) return;
      const box = document.createElement('div');
      box.className = 'price-category';
      const h3 = document.createElement('h3');
      h3.textContent = labels[tiersName];
      box.appendChild(h3);
      company[tiersName].forEach((tier, idx) => {
        const row = document.createElement('div');
        row.className = 'price-row';
        const nameDiv = document.createElement('div');
        nameDiv.className = 'price-row-name';
        nameDiv.textContent = tier.label;
        row.appendChild(nameDiv);
        const controls = document.createElement('div');
        controls.className = 'price-row-controls';
        const label = document.createElement('label');
        label.textContent = '円/kg';
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'price-input';
        input.value = tier.priceExcl;
        input.addEventListener('change', () => {
          const newArr = company[tiersName].map((t, i) => (i === idx ? Object.assign({}, t, { priceExcl: parseFloat(input.value) || 0 }) : t));
          Store.setTierOverride(currentCompanyId, tiersName, newArr);
          UI.onPriceChanged();
        });
        label.appendChild(input);
        controls.appendChild(label);
        row.appendChild(controls);
        box.appendChild(row);
      });
      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'reset-btn';
      resetBtn.textContent = 'この表を元に戻す';
      resetBtn.addEventListener('click', () => {
        Store.resetTierOverride(currentCompanyId, tiersName);
        UI.onPriceChanged();
      });
      box.appendChild(resetBtn);
      area.appendChild(box);
    });
  },

  renderDeliveryMethodArea() {
    const area = document.getElementById('deliveryMethodArea');
    if (currentCompanyId !== 'marumatsu') {
      area.classList.add('hidden');
      area.innerHTML = '';
      return;
    }
    area.classList.remove('hidden');
    area.innerHTML = '';
    const company = Pricing.getEffectiveCompany(currentCompanyId);
    const label = document.createElement('label');
    label.className = 'toggle';
    label.appendChild(document.createTextNode('搬入方法（新規行の初期値）: '));
    const select = document.createElement('select');
    company.plasticRateTiers.forEach((t, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = t.label;
      select.appendChild(opt);
    });
    select.value = String(UI.defaultTierIndex || 0);
    select.addEventListener('change', () => { UI.defaultTierIndex = parseInt(select.value, 10) || 0; });
    label.appendChild(select);
    area.appendChild(label);
  },

  populateItemSelect(selectEl, company, filterText, selectedItemId) {
    selectEl.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '品目を選択...';
    selectEl.appendChild(placeholder);
    const byCategory = {};
    const order = [];
    company.items.forEach((item) => {
      if (item.disabled) return;
      if (filterText && !item.name.includes(filterText) && !(item.category || '').includes(filterText)) return;
      if (!byCategory[item.category]) { byCategory[item.category] = []; order.push(item.category); }
      byCategory[item.category].push(item);
    });
    order.forEach((cat) => {
      const og = document.createElement('optgroup');
      og.label = cat;
      byCategory[cat].forEach((item) => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = `${item.name}（${UNIT_LABELS[item.unit] || item.unit}）`;
        og.appendChild(opt);
      });
      selectEl.appendChild(og);
    });
    selectEl.value = selectedItemId || '';
  },

  updateRowSubtotalDisplay(rowEl, result) {
    rowEl.querySelector('.line-excl').textContent = formatYen(result.subtotalExcl || 0);
    rowEl.querySelector('.line-incl').textContent = formatYen(result.subtotalIncl || 0);
  },

  recomputeRowSubtotal(rowEl, row, item, company) {
    if (!item) { UI.updateRowSubtotalDisplay(rowEl, { subtotalExcl: 0, subtotalIncl: 0 }); return; }
    const input = UI.buildCalcInputFromRow(row, item);
    UI.updateRowSubtotalDisplay(rowEl, Pricing.calcLine(item, company, input, UI.cashPaymentOn));
  },

  refreshRowDynamicInputs(rowEl, row, company) {
    const container = rowEl.querySelector('.row-inputs');
    container.innerHTML = '';
    const item = company.items.find((i) => i.id === row.itemId);
    if (!item) { UI.recomputeRowSubtotal(rowEl, row, null, company); return; }

    const makeField = (labelText, inputEl) => {
      const div = document.createElement('div');
      const label = document.createElement('label');
      label.textContent = labelText;
      div.appendChild(label);
      div.appendChild(inputEl);
      return div;
    };

    const onChange = () => {
      UI.recomputeRowSubtotal(rowEl, row, item, company);
      UI.renderTotals();
    };

    if (item.type === 'variant') {
      const select = document.createElement('select');
      item.variants.forEach((v, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = `${v.label}（¥${v.priceExcl}）`;
        select.appendChild(opt);
      });
      select.value = String(row.variantIndex || 0);
      select.addEventListener('change', () => { row.variantIndex = parseInt(select.value, 10) || 0; onChange(); });
      container.appendChild(makeField('種類', select));

      const qtyInput = document.createElement('input');
      qtyInput.type = 'number';
      qtyInput.inputMode = 'decimal';
      qtyInput.value = row.qty || 0;
      qtyInput.addEventListener('input', () => { row.qty = parseFloat(qtyInput.value) || 0; onChange(); });
      container.appendChild(makeField(`数量 (${UNIT_LABELS[item.unit] || item.unit})`, qtyInput));
    } else if (item.type === 'tiered') {
      const tiers = company[item.tiers] || [];
      const select = document.createElement('select');
      tiers.forEach((t, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = `${t.label}（¥${t.priceExcl}/kg）`;
        select.appendChild(opt);
      });
      select.value = String(row.tierIndex || 0);
      select.addEventListener('change', () => { row.tierIndex = parseInt(select.value, 10) || 0; onChange(); });
      container.appendChild(makeField('搬入方法', select));

      const qtyInput = document.createElement('input');
      qtyInput.type = 'number';
      qtyInput.inputMode = 'decimal';
      qtyInput.value = row.qty || 0;
      qtyInput.addEventListener('input', () => { row.qty = parseFloat(qtyInput.value) || 0; onChange(); });
      container.appendChild(makeField(`数量 (${UNIT_LABELS[item.unit] || item.unit})`, qtyInput));
    } else if (item.type === 'plastic_plus_unit') {
      const tiers = company.plasticRateTiers || [];
      const select = document.createElement('select');
      tiers.forEach((t, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = `${t.label}（¥${t.priceExcl}/kg）`;
        select.appendChild(opt);
      });
      select.value = String(row.tierIndex || 0);
      select.addEventListener('change', () => { row.tierIndex = parseInt(select.value, 10) || 0; onChange(); });
      container.appendChild(makeField('搬入方法', select));

      const kgInput = document.createElement('input');
      kgInput.type = 'number';
      kgInput.inputMode = 'decimal';
      kgInput.value = row.kg || 0;
      kgInput.addEventListener('input', () => { row.kg = parseFloat(kgInput.value) || 0; onChange(); });
      container.appendChild(makeField('重量 (kg)', kgInput));

      const countInput = document.createElement('input');
      countInput.type = 'number';
      countInput.inputMode = 'decimal';
      countInput.value = row.count || 0;
      countInput.addEventListener('input', () => { row.count = parseFloat(countInput.value) || 0; onChange(); });
      container.appendChild(makeField(`数量 (${item.unit})`, countInput));
    } else {
      const qtyInput = document.createElement('input');
      qtyInput.type = 'number';
      qtyInput.inputMode = 'decimal';
      qtyInput.value = row.qty || 0;
      qtyInput.addEventListener('input', () => { row.qty = parseFloat(qtyInput.value) || 0; onChange(); });
      container.appendChild(makeField(`数量 (${UNIT_LABELS[item.unit] || item.unit})`, qtyInput));
    }

    UI.recomputeRowSubtotal(rowEl, row, item, company);
  },

  renderCalcRows() {
    const container = document.getElementById('calcRows');
    container.innerHTML = '';
    const company = Pricing.getEffectiveCompany(currentCompanyId);
    const template = document.getElementById('calcRowTemplate');
    Calc.getRows().forEach((row) => {
      const rowEl = template.content.firstElementChild.cloneNode(true);
      rowEl.dataset.rowId = row.rowId;
      if (row.sourcedFromOcr) rowEl.classList.add('source-ocr');

      const filterInput = rowEl.querySelector('.item-filter');
      const itemSelect = rowEl.querySelector('.item-select');
      UI.populateItemSelect(itemSelect, company, '', row.itemId);
      filterInput.addEventListener('input', () => {
        UI.populateItemSelect(itemSelect, company, filterInput.value, row.itemId);
      });
      itemSelect.addEventListener('change', () => {
        const isFirstAssignment = !row.itemId;
        row.itemId = itemSelect.value || null;
        if (!isFirstAssignment) {
          row.qty = 0; row.variantIndex = 0; row.tierIndex = UI.defaultTierIndex || 0; row.kg = 0; row.count = 0;
        }
        UI.refreshRowDynamicInputs(rowEl, row, company);
        UI.renderTotals();
      });

      UI.refreshRowDynamicInputs(rowEl, row, company);

      const confirmedCheck = rowEl.querySelector('.confirmed-check');
      confirmedCheck.checked = row.confirmed;
      confirmedCheck.addEventListener('change', () => { row.confirmed = confirmedCheck.checked; UI.renderTotals(); });

      rowEl.querySelector('.row-remove').addEventListener('click', () => Calc.removeRow(row.rowId));

      container.appendChild(rowEl);
    });
    UI.renderTotals();
  },

  renderTotals() {
    const company = Pricing.getEffectiveCompany(currentCompanyId);
    const results = [];
    Calc.getRows().forEach((row) => {
      if (!row.itemId) return;
      const item = company.items.find((i) => i.id === row.itemId);
      if (!item) return;
      const input = UI.buildCalcInputFromRow(row, item);
      const r = Pricing.calcLine(item, company, input, UI.cashPaymentOn);
      r.confirmed = row.confirmed;
      results.push(r);
    });
    const totals = Pricing.calcTotals(results);
    document.getElementById('subtotalExcl').textContent = formatYen(totals.subtotalExcl);
    document.getElementById('taxAmount').textContent = formatYen(totals.tax);
    document.getElementById('totalIncl').textContent = formatYen(totals.totalIncl);
    document.getElementById('miniTotal').textContent = `合計（税込）: ${formatYen(totals.totalIncl)}`;
    const warnEl = document.getElementById('unconfirmedWarning');
    if (totals.unconfirmedCount > 0) {
      warnEl.textContent = `⚠ 未確認の行が${totals.unconfirmedCount}件あります`;
      warnEl.classList.remove('hidden');
    } else {
      warnEl.classList.add('hidden');
    }
  },

  renderOcrSuggestions(suggestions) {
    const container = document.getElementById('ocrSuggestions');
    container.innerHTML = '';
    if (!suggestions.length) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = '数量らしき記載を検出できませんでした。下の「＋行を追加」から手動で入力してください。';
      container.appendChild(p);
      return;
    }
    suggestions.forEach((s) => {
      const card = document.createElement('div');
      card.className = 'ocr-suggestion-card';
      const raw = document.createElement('div');
      raw.className = 'raw-line';
      raw.textContent = s.rawLine;
      card.appendChild(raw);

      const nameDiv = document.createElement('div');
      nameDiv.className = 'matched-name';
      nameDiv.textContent = s.matchedItemId ? s.matchedItemName : `${s.matchedItemName}（未マッチ・手動で品目を選択してください）`;
      card.appendChild(nameDiv);

      const qtyDiv = document.createElement('div');
      qtyDiv.textContent = `数量: ${s.qty} ${s.unit}`;
      if (s.unitMismatch) {
        const span = document.createElement('span');
        span.className = 'unit-mismatch';
        span.textContent = ' ⚠ 単位が品目と異なる可能性';
        qtyDiv.appendChild(span);
      }
      card.appendChild(qtyDiv);

      const actions = document.createElement('div');
      actions.className = 'actions';
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'btn-primary';
      addBtn.textContent = '追加';
      addBtn.addEventListener('click', () => {
        Calc.addRow({ itemId: s.matchedItemId, qty: s.qty, kg: s.qty, sourcedFromOcr: true });
        card.remove();
      });
      const rejectBtn = document.createElement('button');
      rejectBtn.type = 'button';
      rejectBtn.className = 'btn-secondary';
      rejectBtn.textContent = '却下';
      rejectBtn.addEventListener('click', () => card.remove());
      actions.appendChild(addBtn);
      actions.appendChild(rejectBtn);
      card.appendChild(actions);

      container.appendChild(card);
    });
  },

  onPhotoSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    selectedPhotoFile = file;
    const url = URL.createObjectURL(file);
    document.getElementById('photoPreview').src = url;
    document.getElementById('photoPreviewWrap').classList.remove('hidden');
    document.getElementById('runOcrBtn').disabled = false;
    document.getElementById('ocrSuggestions').innerHTML = '';
    document.getElementById('forbiddenWarning').classList.add('hidden');
    document.getElementById('ocrRawWrap').classList.add('hidden');
  },

  async onRunOcr() {
    if (!selectedPhotoFile) return;
    const btn = document.getElementById('runOcrBtn');
    btn.disabled = true;
    document.getElementById('ocrProgressWrap').classList.remove('hidden');
    const progressEl = document.getElementById('ocrProgress');
    const statusEl = document.getElementById('ocrStatus');
    try {
      const canvas = await Img.toProcessedCanvas(selectedPhotoFile, {});
      const { text, lines } = await OCR.recognizeImage(canvas, (m) => {
        progressEl.value = m.progress || 0;
        statusEl.textContent = OCR.STATUS_LABELS_JA[m.status] || m.status || '';
      });
      document.getElementById('ocrRawWrap').classList.remove('hidden');
      document.getElementById('ocrRawText').value = text;

      const company = Pricing.getEffectiveCompany(currentCompanyId);
      UI.renderOcrSuggestions(Parser.parseOcrText(lines, company));

      const forbiddenHits = Parser.findForbiddenHits(text, company.forbidden);
      const warnEl = document.getElementById('forbiddenWarning');
      if (forbiddenHits.length) {
        warnEl.textContent = `⚠ 受入不可の可能性がある語句を検出しました: ${forbiddenHits.join('、')}`;
        warnEl.classList.remove('hidden');
      } else {
        warnEl.classList.add('hidden');
      }
    } catch (err) {
      console.error(err);
      alert('OCR処理でエラーが発生しました。ネットワーク接続を確認するか、しばらくしてから再試行してください。');
    } finally {
      btn.disabled = false;
      document.getElementById('ocrProgressWrap').classList.add('hidden');
    }
  },

  onSaveCalc() {
    const company = Pricing.getEffectiveCompany(currentCompanyId);
    const rows = Calc.getRows().filter((r) => r.itemId);
    if (!rows.length) { alert('保存する行がありません。'); return; }
    const lineDetails = [];
    let subtotalExcl = 0;
    rows.forEach((row) => {
      const item = company.items.find((i) => i.id === row.itemId);
      if (!item) return;
      const input = UI.buildCalcInputFromRow(row, item);
      const result = Pricing.calcLine(item, company, input, UI.cashPaymentOn);
      subtotalExcl += result.subtotalExcl;
      lineDetails.push({
        itemId: item.id, itemName: item.name, unit: item.unit,
        qty: row.qty, kg: row.kg, count: row.count,
        lineSubtotalExcl: result.subtotalExcl, lineSubtotalIncl: result.subtotalIncl,
      });
    });
    const tax = Math.round(subtotalExcl * TAX_RATE);
    const totalIncl = subtotalExcl + tax;
    Store.pushHistoryEntry({
      id: String(Date.now()),
      dateISO: new Date().toISOString(),
      companyId: currentCompanyId,
      companyName: company.name,
      cashPayment: UI.cashPaymentOn,
      rows: lineDetails,
      subtotalExcl, tax, totalIncl,
    });
    UI.renderHistory();
    alert('保存しました。');
  },

  onClearCalc() {
    if (!Calc.getRows().length) return;
    if (!confirm('入力中の計算行をすべて削除します。よろしいですか？')) return;
    Calc.clearRows();
  },

  onClearHistory() {
    if (!confirm('履歴をすべて削除します。よろしいですか？')) return;
    Store.clearHistory();
    UI.renderHistory();
  },

  renderHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    const history = Store.loadHistory();
    if (!history.length) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = '保存された計算はありません。';
      list.appendChild(p);
      return;
    }
    history.forEach((entry) => {
      const div = document.createElement('div');
      div.className = 'history-entry';
      const header = document.createElement('div');
      header.className = 'history-entry-header';
      const dateStr = new Date(entry.dateISO).toLocaleString('ja-JP');
      const left = document.createElement('span');
      left.textContent = `${dateStr}　${entry.companyName}　${formatYen(entry.totalIncl)}`;
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-danger history-delete';
      delBtn.textContent = '削除';
      delBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        Store.deleteHistoryEntry(entry.id);
        UI.renderHistory();
      });
      header.appendChild(left);
      header.appendChild(delBtn);
      div.appendChild(header);

      const detail = document.createElement('div');
      detail.className = 'history-entry-detail hidden';
      entry.rows.forEach((r) => {
        const rd = document.createElement('div');
        rd.textContent = `${r.itemName}：${formatYen(r.lineSubtotalIncl)}（税込）`;
        detail.appendChild(rd);
      });
      div.appendChild(detail);
      header.addEventListener('click', () => detail.classList.toggle('hidden'));

      list.appendChild(div);
    });
  },
};

// ---------------- init ----------------
let currentCompanyId = 'tsukasa';
let selectedPhotoFile = null;

function init() {
  const uiState = Store.loadUiState();
  UI.cashPaymentOn = !!uiState.cashPaymentOn;
  currentCompanyId = uiState.lastCompanyId && COMPANIES[uiState.lastCompanyId] ? uiState.lastCompanyId : 'tsukasa';

  document.getElementById('cashPaymentToggle').checked = UI.cashPaymentOn;
  document.getElementById('cashPaymentToggle').addEventListener('change', (e) => {
    UI.cashPaymentOn = e.target.checked;
    Store.saveUiState({ cashPaymentOn: UI.cashPaymentOn });
    UI.renderCalcRows();
  });

  document.getElementById('addRowBtn').addEventListener('click', () => Calc.addRow({}));
  document.getElementById('photoInputCamera').addEventListener('change', UI.onPhotoSelected);
  document.getElementById('photoInputLibrary').addEventListener('change', UI.onPhotoSelected);
  document.getElementById('runOcrBtn').addEventListener('click', UI.onRunOcr);
  document.getElementById('saveCalcBtn').addEventListener('click', UI.onSaveCalc);
  document.getElementById('clearCalcBtn').addEventListener('click', UI.onClearCalc);
  document.getElementById('clearHistoryBtn').addEventListener('click', UI.onClearHistory);

  UI.renderCompanyTabs();
  UI.renderPriceTable();
  UI.renderDeliveryMethodArea();
  UI.renderCalcRows();
  UI.renderHistory();
}

window.addEventListener('DOMContentLoaded', init);
