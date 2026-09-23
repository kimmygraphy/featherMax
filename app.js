(function(){
  "use strict";


  const STATE = {
    editingId: null,
    uid: null,
    artifacts: [],
    buildSelection: { flower: "", feather: "", sands: "", goblet: "", circlet: "" },
    buildCharacter: CHARACTERS[0] ? CHARACTERS[0].name : null,
    buildCharLevel: DEFAULT_CHAR_LEVEL,
  };

  // ---------- form setup ----------
  const $ = (id) => document.getElementById(id);

  // icon이 이미지 경로면 <img>, 아니면(이모지 등) 그대로 텍스트로 렌더링.
  function iconMarkup(icon){
    if (!icon) return "";
    if (/\.(png|jpe?g|svg|webp)$/i.test(icon)) return `<img class="icon-img" src="${icon}" alt="" />`;
    return `<span class="icon-emoji">${icon}</span>`;
  }

  // 네이티브 <select>는 옵션 안에 이미지를 못 넣어서, 아이콘+라벨을 보여주는 커스텀 드롭다운을 직접 구현.
  // 실제 값은 hiddenId를 id로 갖는 숨김 input에 저장되고, change 이벤트도 그대로 dispatch되므로
  // 기존에 $("slotKey") 등으로 값을 읽던 코드는 그대로 동작한다.
  const ICON_SELECT_REGISTRY = {};

  function mountIconSelect(containerId, hiddenId, options){
    const container = $(containerId);
    if (!container) return;
    container.innerHTML = `
      <button type="button" class="icon-select-btn"></button>
      <div class="icon-select-menu" hidden></div>
    `;
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.id = hiddenId;
    container.appendChild(hidden);

    const btn = container.querySelector(".icon-select-btn");
    const menu = container.querySelector(".icon-select-menu");

    function renderBtn(value){
      const opt = options.find(o => o.value === value) || options[0];
      btn.innerHTML = opt ? `${iconMarkup(opt.icon)}<span>${escapeHtml(opt.label)}</span>` : "";
    }
    menu.innerHTML = options.map(o =>
      `<div class="icon-select-option" data-value="${escapeHtml(o.value)}">${iconMarkup(o.icon)}<span>${escapeHtml(o.label)}</span></div>`
    ).join("");
    hidden.value = options[0] ? options[0].value : "";
    renderBtn(hidden.value);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".icon-select-menu").forEach(m => { if (m !== menu) m.hidden = true; });
      menu.hidden = !menu.hidden;
    });
    menu.addEventListener("click", (e) => {
      const opt = e.target.closest(".icon-select-option");
      if (!opt) return;
      hidden.value = opt.dataset.value;
      renderBtn(hidden.value);
      menu.hidden = true;
      hidden.dispatchEvent(new Event("change", { bubbles: true }));
    });

    ICON_SELECT_REGISTRY[hiddenId] = { setValue(v){ hidden.value = v; renderBtn(v); } };
  }

  document.addEventListener("click", () => {
    document.querySelectorAll(".icon-select-menu").forEach(m => m.hidden = true);
  });

  // $("slotKey").value = X 대신 이 헬퍼로 값을 바꾸면, 커스텀 드롭다운 버튼 표시도 같이 갱신된다.
  function setFieldValue(id, value){
    if (ICON_SELECT_REGISTRY[id]) ICON_SELECT_REGISTRY[id].setValue(value);
    else { const el = $(id); if (el) el.value = value; }
  }

  function populateSlotSelect(){
    mountIconSelect("slotKeyField", "slotKey", SLOTS.map(s => ({ value: s.key, label: s.label, icon: s.icon })));
  }

  function populateSetSelect(){
    mountIconSelect("setKeyField", "setKey", SET_OPTIONS.map(s => ({ value: s, label: s, icon: SET_ICONS[s] })));
  }

  function populateLocationSelect(){
    mountIconSelect("locationField", "location", LOCATION_OPTIONS.map(l => ({ value: l, label: l, icon: getLocationIcon(l) })));
  }

  function updateMainStatDisplay(){
    const slot = $("slotKey").value;
    const fixed = FIXED_MAIN_STATS[slot];
    const disp = $("mainStatDisplay");
    if (!fixed){ disp.textContent = "—"; return; }
    disp.textContent = fixed.label + " " + fmtVal(fixed.key, fixed.value);
  }

  function substatRowHtml(idx, key, value){
    const opts = SUBSTAT_KEYS.map(k => `<option value="${k}" ${k===key?"selected":""}>${SUBSTAT_LABELS[k]}</option>`).join("");
    return `
      <div class="substat-row" data-idx="${idx}">
        <select class="sub-key">
          <option value="">— 없음 —</option>
          ${opts}
        </select>
        <input type="number" step="0.1" class="sub-value" placeholder="값" value="${value != null ? value : ""}" />
      </div>`;
  }

  function renderSubstatRows(substats){
    substats = substats || [];
    const root = $("substatRows");
    let html = "";
    for (let i = 0; i < 4; i++){
      const s = substats[i] || {};
      html += substatRowHtml(i, s.key || "", s.value != null ? s.value : "");
    }
    root.innerHTML = html;
    refreshSubstatOptions();
  }

  // 이미 다른 줄에서 고른 부옵션은 나머지 줄의 선택지에서 빼고,
  // 종류를 고르지 않은 줄은 값 입력칸을 비활성화한다.
  function refreshSubstatOptions(){
    const rows = Array.from(document.querySelectorAll("#substatRows .substat-row"));
    const selectedKeys = rows.map(r => r.querySelector(".sub-key").value).filter(Boolean);
    const mainKey = (FIXED_MAIN_STATS[$("slotKey").value] || {}).key;
    rows.forEach(row => {
      const sel = row.querySelector(".sub-key");
      const current = sel.value;
      const available = SUBSTAT_KEYS.filter(k => k === current || (!selectedKeys.includes(k) && k !== mainKey));
      const opts = available.map(k => `<option value="${k}" ${k===current?"selected":""}>${SUBSTAT_LABELS[k]}</option>`).join("");
      sel.innerHTML = `<option value="">— 없음 —</option>${opts}`;

      const valInput = row.querySelector(".sub-value");
      valInput.disabled = !current;
      if (!current) valInput.value = "";
    });
  }

  function readSubstatRows(){
    const rows = Array.from(document.querySelectorAll("#substatRows .substat-row"));
    const out = [];
    for (const row of rows){
      const key = row.querySelector(".sub-key").value;
      const valRaw = row.querySelector(".sub-value").value;
      if (!key) continue;
      out.push({ key, value: parseFloat(valRaw) });
    }
    return out;
  }

  // 부옵션을 하나도 안 골랐거나, key는 골랐는데 값이 비어있는 줄이 있으면 저장을 막는다.
  function validateSubstatRows(){
    const rows = Array.from(document.querySelectorAll("#substatRows .substat-row"));
    let anySelected = false;
    for (const row of rows){
      const key = row.querySelector(".sub-key").value;
      const valRaw = row.querySelector(".sub-value").value;
      if (key){
        anySelected = true;
        if (valRaw === "") return false;
      }
    }
    return anySelected;
  }

  function showFormError(msg){
    const el = $("formError");
    el.textContent = msg;
    el.classList.add("show");
  }
  function clearFormError(){
    const el = $("formError");
    el.textContent = "";
    el.classList.remove("show");
  }

  function resetForm(preserveSlot){
    clearFormError();
    STATE.editingId = null;
    $("formTitle").textContent = "새 성유물 등록";
    $("saveBtn").textContent = "성유물 등록";
    $("cancelBtn").style.display = "none";
    setFieldValue("slotKey", preserveSlot || "flower");
    updateMainStatDisplay();
    setFieldValue("setKey", SET_OPTIONS[0]);
    setFieldValue("location", LOCATION_OPTIONS[0]);
    $("startedWith4").checked = true;
    renderSubstatRows([]);
  }

  function loadIntoForm(art){
    STATE.editingId = art.id;
    $("formTitle").textContent = "성유물 수정";
    $("saveBtn").textContent = "수정 완료";
    $("cancelBtn").style.display = "";
    setFieldValue("slotKey", art.slotKey);
    updateMainStatDisplay();
    setFieldValue("setKey", SET_OPTIONS.includes(art.setKey) ? art.setKey : SET_OPTIONS[0]);
    setFieldValue("location", LOCATION_OPTIONS.includes(art.location) ? art.location : OTHER_LOCATION);
    $("startedWith4").checked = !!art.startedWith4Substats;
    renderSubstatRows(art.substats || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- rendering the list ----------
  function fmtVal(key, v){
    const isPct = key.endsWith("_");
    return isPct ? (v.toFixed ? v.toFixed(1) : v) + "%" : (v.toFixed ? Math.round(v) : v);
  }

  // 부옵션 4개를 "부옵1 부옵2 부옵3 부옵4" 형태로 렌더링 (치확/치피는 강조). 성유물 목록/재구축 추천에서 공용으로 씀.
  function substatsLineHtml(substats){
    const html = (substats || []).map(sub => {
      const isCrit = sub.key === "critRate_" || sub.key === "critDMG_";
      return `<span class="${isCrit ? "crit" : ""}">${SUBSTAT_LABELS[sub.key] || sub.key} ${fmtVal(sub.key, sub.value)}</span>`;
    }).join("");
    return html || '<span>부옵션 없음</span>';
  }

  function renderList(){
    const root = $("listRoot");
    if (!STATE.artifacts.length){
      root.innerHTML = `<div class="empty">등록된 성유물이 아직 없어요.</div>`;
      renderBuildSelectors();
      return;
    }
    const bySlot = {};
    for (const s of SLOTS) bySlot[s.key] = [];
    for (const a of STATE.artifacts){
      (bySlot[a.slotKey] || (bySlot[a.slotKey] = [])).push(a);
    }
    let html = "";
    for (const s of SLOTS){
      const items = bySlot[s.key] || [];
      if (!items.length) continue;
      html += `<div class="slot-group"><h3>${iconMarkup(s.icon)}${s.label} · ${items.length}개</h3>`;
      for (const a of items){
        const fixed = FIXED_MAIN_STATS[a.slotKey];
        const mainName = fixed ? fixed.label : a.mainStatKey;
        html += `
          <div class="art-item" data-id="${a.id}">
            <div class="art-main">
              <div class="art-set">${a.setKey || "세트 미지정"} · ★${a.rarity || 5}</div>
              <div class="art-mainstat">${mainName} ${a.mainStatValue != null ? fmtVal(a.mainStatKey, a.mainStatValue) : ""}<span class="lvl">+${a.level != null ? a.level : 20}</span></div>
              <div class="art-subs">${substatsLineHtml(a.substats)}</div>
              ${a.location ? `<div class="art-loc">장착 중 · ${escapeHtml(a.location)}</div>` : ""}
            </div>
            <div class="art-actions">
              <button class="edit-btn">수정</button>
              <button class="danger del-btn">삭제</button>
            </div>
          </div>`;
      }
      html += `</div>`;
    }
    root.innerHTML = html;

    root.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.closest(".art-item").dataset.id;
        const art = STATE.artifacts.find(a => a.id === id);
        if (art) loadIntoForm(art);
      });
    });
    root.querySelectorAll(".del-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.closest(".art-item").dataset.id;
        if (confirm("이 성유물을 삭제할까요?")) deleteArtifact(id);
      });
    });

    renderBuildSelectors();
  }

  function escapeHtml(str){
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- tabs ----------
  function initTabs(){
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const name = btn.dataset.tab;
        $("tab-registry").style.display = name === "registry" ? "" : "none";
        $("tab-build").style.display = name === "build" ? "" : "none";
        $("tab-reforge").style.display = name === "reforge" ? "" : "none";
        if (name === "build") computeBuild();
      });
    });
  }

  // ---------- build summary tab ----------
  function artifactOptionLabel(a){
    const RELEVANT = ["critRate_", "critDMG_", "atk_", "atk"];
    const parts = (a.substats || []).filter(s => RELEVANT.includes(s.key))
      .map(s => `${SUBSTAT_LABELS[s.key]} ${fmtVal(s.key, s.value)}`);
    const mainLabel = FIXED_MAIN_STATS[a.slotKey];
    if (mainLabel && RELEVANT.includes(mainLabel.key)){
      parts.unshift(`[주]${mainLabel.label} ${fmtVal(mainLabel.key, mainLabel.value)}`);
    }
    return `${a.setKey || "세트 미지정"}${parts.length ? " · " + parts.join(", ") : ""}`;
  }

  function populateBuildCharSelect(){
    if (!$("buildCharSelectField")) return;
    mountIconSelect("buildCharSelectField", "buildCharSelect", CHARACTERS.map(c => ({ value: c.name, label: c.name, icon: c.icon })));
    setFieldValue("buildCharSelect", STATE.buildCharacter);
  }

  function populateBuildCharLevelSelect(){
    const sel = $("buildCharLevel");
    if (!sel) return;
    sel.innerHTML = CHAR_LEVEL_OPTIONS.map(l => `<option value="${l}">${l}</option>`).join("");
    sel.value = STATE.buildCharLevel;
  }

  function renderBuildSelectors(){
    const root = $("buildSlotSelectors");
    if (!root) return;
    const bySlot = {};
    for (const s of SLOTS) bySlot[s.key] = STATE.artifacts.filter(a => a.slotKey === s.key);

    // 선택이 아직 없으면, 장착 캐릭터가 지금 고른 캐릭터로 지정된 성유물을 부위별로 기본 선택해준다.
    for (const s of SLOTS){
      if (!STATE.buildSelection[s.key]){
        const preferred = bySlot[s.key].find(a => a.location === STATE.buildCharacter);
        if (preferred) STATE.buildSelection[s.key] = preferred.id;
      }
      // 선택된 id가 더 이상 존재하지 않으면 초기화
      if (STATE.buildSelection[s.key] && !bySlot[s.key].some(a => a.id === STATE.buildSelection[s.key])){
        STATE.buildSelection[s.key] = "";
      }
    }

    let html = "";
    for (const s of SLOTS){
      const items = bySlot[s.key];
      const current = STATE.buildSelection[s.key];
      const options = `<option value="">— 선택 안 함 —</option>` + items.map(a =>
        `<option value="${a.id}" ${a.id===current?"selected":""}>${escapeHtml(artifactOptionLabel(a))}</option>`
      ).join("");
      html += `
        <div class="build-row">
          <span class="icon">${iconMarkup(s.icon)}</span>
          <select class="build-slot-select" data-slot="${s.key}" ${!items.length ? "disabled" : ""}>${options}</select>
        </div>`;
    }
    root.innerHTML = html;
    root.querySelectorAll(".build-slot-select").forEach(sel => {
      sel.addEventListener("change", () => {
        STATE.buildSelection[sel.dataset.slot] = sel.value;
        computeBuild();
      });
    });
  }

  function computeBuild(){
    const resultsEl = $("buildResults");
    if (!resultsEl) return;

    const char = getCharacter(STATE.buildCharacter);
    const titleEl = $("buildResultsTitle");
    if (titleEl) titleEl.textContent = "최종 스펙";
    if (!char){
      resultsEl.innerHTML = `<div class="empty">등록된 캐릭터가 없어요.</div>`;
      return;
    }
    const level = STATE.buildCharLevel || DEFAULT_CHAR_LEVEL;
    const charBaseATK = char.atkByLevel[level] != null ? char.atkByLevel[level] : Object.values(char.atkByLevel)[0];

    const chosen = SLOTS.map(s => STATE.artifacts.find(a => a.id === STATE.buildSelection[s.key])).filter(Boolean);

    let atkPercentSum = 0, atkFlatSum = 0, critRateSum = 0, critDmgSum = 0;
    for (const a of chosen){
      if (a.mainStatKey === "atk_") atkPercentSum += a.mainStatValue || 0;
      if (a.mainStatKey === "atk") atkFlatSum += a.mainStatValue || 0;
      if (a.mainStatKey === "critRate_") critRateSum += a.mainStatValue || 0;
      if (a.mainStatKey === "critDMG_") critDmgSum += a.mainStatValue || 0;
      for (const sub of (a.substats || [])){
        if (sub.key === "atk_") atkPercentSum += sub.value;
        else if (sub.key === "atk") atkFlatSum += sub.value;
        else if (sub.key === "critRate_") critRateSum += sub.value;
        else if (sub.key === "critDMG_") critDmgSum += sub.value;
      }
    }

    const finalATK = (charBaseATK + char.weaponBaseATK) * (1 + atkPercentSum / 100) + atkFlatSum;
    const finalCritRate = UNIVERSAL_BASE_CRIT_RATE + char.weaponBaseCritRate + critRateSum;
    const finalCritDMG = char.charBaseCritDMG + critDmgSum;
    const cv = 2 * finalCritRate + finalCritDMG;

    if (!chosen.length){
      resultsEl.innerHTML = `<div class="empty">부위를 하나 이상 선택하면 빌드가 계산돼요.</div>`;
      return;
    }

    resultsEl.innerHTML = `
      <div class="stat-line headline"><span>공격력</span><span class="v">${Math.round(finalATK).toLocaleString()}</span></div>
      <div class="stat-line crit"><span>치명타 확률</span><span class="v">${finalCritRate.toFixed(1)}%</span></div>
      <div class="stat-line crit"><span>치명타 피해</span><span class="v">${finalCritDMG.toFixed(1)}%</span></div>
      <div class="stat-line headline"><span>CV (2×치확+치피)</span><span class="v">${cv.toFixed(1)}</span></div>
      <div class="stat-line"><span>성유물 공격력% 합</span><span class="v">${atkPercentSum.toFixed(1)}%</span></div>
      <div class="stat-line"><span>성유물 깡공 합</span><span class="v">${Math.round(atkFlatSum)}</span></div>
      <div class="sub-note">${chosen.length}/5부위 선택됨 · 캐릭터 Lv.${level} · 전용 무기 Lv.90 기준</div>
    `;
  }

  // ---------- reforge pity (하로우드 엑서지시스) ----------
  // 누적 소모 먼지가 6/12에 도달하면 다음 재구축은 3롤, 18이면 4롤 보장.
  // 공식 세부 로직이 완전히 공개돼있진 않아서, 18을 주기로 순환한다고 가정한 근사치예요.
  // progress: 현재 누적 진행도(0~17, 18 도달 시 리셋되는 주기).
  // cost: 이번에 쓸 재구축의 먼지 소모량(꽃/깃 1, 시계/성배/모자 2).
  // 진행도 + cost가 6/12/18 문턱을 이번에 "넘어가면" 그 등급의 보장이 적용된다.
  function calcGuaranteedRolls(progress, cost){
    const p = ((progress % 18) + 18) % 18; // 0~17로 정규화
    const next = p + cost;
    if (next >= 18) return 4;
    if (p < 12 && next >= 12) return 3;
    if (p < 6 && next >= 6) return 3;
    return 2;
  }

  // 보장 롤 미리보기 UI는 뺐지만, calcGuaranteedRolls 자체는 runReforgeRecommendation에서 계속 쓰임.
  function updatePityDisplay(){}

  // ---------- reforge exact expected-value calculation ----------
  // 예전엔 몬테카를로(3000회 시행 평균)로 기대이득을 "추정"했는데, 경우의 수가 적어서
  // 사실 정확한 확률분포를 직접 계산할 수 있다. 롤 하나하나의 결과가 유한한 이산분포이므로
  // 그걸 전부 컨볼루션(합성곱)해서 최종 CV의 정확한 분포를 구하고, 그 분포로 기대이득을 계산한다.
  // 몬테카를로보다 더 빠르고, 버튼을 몇 번을 눌러도 항상 똑같은 값이 나온다(노이즈 없음).
  function round6(v){ return Math.round(v * 1e6) / 1e6; }

  // 롤 하나가 `type`으로 확정 배정됐을 때, CV 기여값의 확률분포(Map: 기여값 → 확률)
  function rollDistribution(type){
    const m = new Map();
    if (type === "critRate_"){
      for (const v of ROLL_TABLE.critRate_){ const k = round6(2 * v); m.set(k, (m.get(k) || 0) + 0.25); }
      return m;
    }
    if (type === "critDMG_"){
      for (const v of ROLL_TABLE.critDMG_){ const k = round6(v); m.set(k, (m.get(k) || 0) + 0.25); }
      return m;
    }
    return new Map([[0, 1]]); // 치확/치피가 아닌 타입은 CV에 기여 없음
  }

  // 롤 하나가 `types`(4개) 중 무작위로 배정될 때의 CV 기여값 분포
  function randomRollDistribution(types){
    const m = new Map();
    for (const t of types){
      const sub = rollDistribution(t);
      for (const [v, p] of sub) m.set(v, (m.get(v) || 0) + p * (1 / types.length));
    }
    return m;
  }

  function convolve(dist, add){
    const result = new Map();
    for (const [v1, p1] of dist){
      for (const [v2, p2] of add){
        const v = round6(v1 + v2);
        result.set(v, (result.get(v) || 0) + p1 * p2);
      }
    }
    return result;
  }

  // 부옵션 4개(존재하는 타입) 중, 치확/치피가 하나라도 있는 성유물만 재구축 의미가 있다.
  // 우선순위 2스탯은 (치확+치피 둘 다 있으면) 그 둘로 고정, 하나만 있으면 [그 스탯, 나머지 중 하나]로.
  function simulateOneArtifact(art, guaranteedRolls){
    const subs = art.substats || [];
    if (subs.length < 4) return { skip: true, reason: "부옵션 4개 모두 입력해야 계산돼요" };

    const types = subs.map(s => s.key);
    const hasCritRate = types.includes("critRate_");
    const hasCritDMG = types.includes("critDMG_");
    if (!hasCritRate && !hasCritDMG) return { skip: true, reason: "치확/치피 부옵션이 없어 재구축 효과 없음" };

    const curCritRate = (subs.find(s => s.key === "critRate_") || {}).value || 0;
    const curCritDMG = (subs.find(s => s.key === "critDMG_") || {}).value || 0;
    const oldCV = 2 * curCritRate + curCritDMG;

    let priority;
    if (hasCritRate && hasCritDMG) priority = ["critRate_", "critDMG_"];
    else {
      const only = hasCritRate ? "critRate_" : "critDMG_";
      const other = types.find(t => t !== only);
      priority = [only, other];
    }

    const rollCount = art.startedWith4Substats ? 5 : 4;
    const guaranteed = Math.min(guaranteedRolls || 2, rollCount);

    let dist = new Map([[0, 1]]);
    for (let g = 0; g < guaranteed; g++) dist = convolve(dist, rollDistribution(priority[g % 2]));
    if (guaranteed < rollCount){
      const randDist = randomRollDistribution(types);
      for (let r = guaranteed; r < rollCount; r++) dist = convolve(dist, randDist);
    }

    let expectedGain = 0;
    for (const [v, p] of dist) expectedGain += p * Math.max(0, v - oldCV);

    const dust = DUST_COST[art.slotKey] || 2;
    return {
      skip: false,
      oldCV, expectedGain, dust,
      efficiency: expectedGain / dust,
      priorityLabel: priority.map(p => SUBSTAT_LABELS[p]).join(" + "),
      guaranteedRolls: guaranteed,
    };
  }

  // 지금 "장착 중"인 5부위(빌드 탭 선택값 우선, 없으면 현재 빌드 캐릭터로 지정된 첫 성유물)를 보고
  // 그중 4개 이상을 차지하는 세트를 "활성 세트"로 본다. 4세트만 채우면 되니, 활성 세트가 아닌
  // 장비를 낀 나머지 1자리는 "여유 슬롯(flex slot)"으로 보고 그 슬롯은 세트 무관하게 다 후보로 인정한다.
  function getActiveSetInfo(){
    const equippedBySlot = {};
    for (const s of SLOTS){
      let piece = STATE.artifacts.find(a => a.id === STATE.buildSelection[s.key]);
      if (!piece) piece = STATE.artifacts.find(a => a.slotKey === s.key && a.location === STATE.buildCharacter);
      equippedBySlot[s.key] = piece || null;
    }
    const counts = {};
    for (const s of SLOTS){
      const piece = equippedBySlot[s.key];
      if (!piece || !piece.setKey) continue;
      counts[piece.setKey] = (counts[piece.setKey] || 0) + 1;
    }
    const entry = Object.entries(counts).find(([, c]) => c >= 4);
    const activeSet = entry ? entry[0] : null;
    const flexSlots = new Set();
    if (activeSet){
      for (const s of SLOTS){
        const piece = equippedBySlot[s.key];
        if (!piece || piece.setKey !== activeSet) flexSlots.add(s.key);
      }
    }
    return { activeSet, flexSlots };
  }

  function runReforgeRecommendation(){
    updatePityDisplay();
    const root = $("reforgeResults");
    const eligible = STATE.artifacts.filter(a => a.rarity === 5);
    if (!eligible.length){
      root.innerHTML = `<div class="empty">계산할 5★ 성유물이 없어요.</div>`;
      return;
    }

    const progress = parseInt($("dustSpentInput").value, 10) || 0;
    const { activeSet, flexSlots } = getActiveSetInfo();

    // 활성 세트가 없으면 전부 대상. 있으면: 활성 세트 소속이거나, 여유 슬롯(세트 상관없이 껴도 되는 자리)인 것만 후보.
    const inScope = a => !activeSet || a.setKey === activeSet || flexSlots.has(a.slotKey);
    const inSet = eligible.filter(inScope);
    const outSet = eligible.filter(a => !inScope(a));

    const scored = inSet.map(a => {
      const cost = DUST_COST[a.slotKey] || 2;
      const guaranteedRolls = calcGuaranteedRolls(progress, cost);
      return { art: a, ...simulateOneArtifact(a, guaranteedRolls) };
    });
    scored.sort((x, y) => {
      if (x.skip && y.skip) return 0;
      if (x.skip) return 1;
      if (y.skip) return -1;
      return y.efficiency - x.efficiency;
    });

    const renderItem = (s, outOfSet) => {
      const slot = SLOT_MAP[s.art.slotKey];
      const title = `${slot ? iconMarkup(slot.icon) : ""}${slot ? slot.label : s.art.slotKey} · ${s.art.setKey || "세트 미지정"}`;
      const locBadge = s.art.location ? `<span class="rf-badge">${escapeHtml(s.art.location)}</span>` : "";
      const outBadge = outOfSet ? `<span class="rf-badge">세트 밖</span>` : "";
      if (s.skip){
        return `
          <div class="reforge-item zero">
            <div class="rf-head"><span class="rf-title">${title}${locBadge}${outBadge}</span></div>
            <div class="rf-detail">${s.reason}</div>
          </div>`;
      }
      return `
        <div class="reforge-item${outOfSet ? " zero" : ""}">
          <div class="rf-head">
            <span class="rf-title">${title}${locBadge}${outBadge}</span>
            <span class="rf-eff">+${s.efficiency.toFixed(2)}/가루</span>
          </div>
          <div class="rf-subs">${substatsLineHtml(s.art.substats)}</div>
          <div class="rf-detail">
            <span>현재 CV ${s.oldCV.toFixed(1)}</span>
            <span class="rf-priority">우선순위: ${s.priorityLabel}</span>
          </div>
        </div>`;
    };

    // 지금 진행도 기준으로, 다음 재구축이 고급/계시 재구축(보장 롤 3·4개) 대상인지 안내.
    const g1 = calcGuaranteedRolls(progress, 1);
    const g2 = calcGuaranteedRolls(progress, 2);
    let html = "";
    if (g1 > 2 || g2 > 2){
      const pityText = g1 === g2
        ? `고급/계시 재구축 발동으로 인해 부옵 ${g1}회 확정`
        : `고급/계시 재구축 발동으로 인해 부옵 확정 롤 상승 — 꽃/깃 ${g1}회, 시계/성배/모자 ${g2}회`;
      html += `<p class="reforge-note pity-banner">${pityText}</p>`;
    }

    html += `<div class="reforge-table-head"><span>성유물</span><span>CV상승잠재력</span></div>`;
    html += scored.map(s => renderItem(s, false)).join("");

    if (outSet.length){
      html += `<p class="reforge-note" style="margin-top:16px;">세트 밖 성유물 (참고용 — 재구축 계산은 생략했어요. 실제로 낄 계획이면 다른 부위 세트도 같이 바꿔야 해요)</p>`;
      html += outSet.map(a => {
        const slot = SLOT_MAP[a.slotKey];
        const title = `${slot ? iconMarkup(slot.icon) : ""}${slot ? slot.label : a.slotKey} · ${a.setKey || "세트 미지정"}`;
        const locBadge = a.location ? `<span class="rf-badge">${escapeHtml(a.location)}</span>` : "";
        return `
          <div class="reforge-item zero">
            <div class="rf-head"><span class="rf-title">${title}${locBadge}<span class="rf-badge">세트 밖</span></span></div>
            <div class="rf-detail">재구축 계산 생략됨</div>
          </div>`;
      }).join("");
    }

    root.innerHTML = html;
  }

  // ---------- Firebase Auth + Firestore storage ----------
  let fbApp = null, fbAuth = null, fbDb = null, artifactsUnsub = null;
  let authMode = "login"; // "login" | "signup"

  function firebaseConfigured(){
    return typeof firebaseConfig !== "undefined" && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY";
  }

  function initFirebase(){
    if (!firebaseConfigured() || !window.firebase) return false;
    if (!fbApp){
      fbApp = firebase.initializeApp(firebaseConfig);
      fbAuth = firebase.auth();
      fbDb = firebase.firestore();
    }
    return true;
  }

  function usernameToEmail(username){
    const domain = (typeof AUTH_FAKE_EMAIL_DOMAIN !== "undefined") ? AUTH_FAKE_EMAIL_DOMAIN : "artifact-ledger.local";
    return `${username}@${domain}`;
  }
  function validUsername(u){ return /^[a-zA-Z0-9_]{3,20}$/.test(u); }

  const AUTH_ERROR_MESSAGES = {
    "auth/email-already-in-use": "이미 존재하는 ID입니다",
    "auth/weak-password": "비밀번호는 6자 이상이어야 해요.",
    "auth/user-not-found": "등록되지 않은 ID입니다",
    "auth/wrong-password": "비밀번호가 맞지 않습니다",
    "auth/invalid-email": "아이디 형식이 올바르지 않아요.",
    // Firebase 프로젝트에서 "이메일 열거 보호(email enumeration protection)"가 켜져 있으면
    // 존재하지 않는 아이디/틀린 비밀번호 둘 다 이 코드 하나로 내려옵니다 (구분 불가).
    // 콘솔의 Authentication > Settings에서 해당 옵션을 끄면 위의 user-not-found / wrong-password로 세분화됩니다.
    "auth/invalid-credential": "등록되지 않은 ID이거나 비밀번호가 맞지 않습니다",
    "auth/too-many-requests": "시도가 너무 많아요. 잠시 후 다시 시도해주세요.",
  };
  function authErrorMessage(e){ return AUTH_ERROR_MESSAGES[e && e.code] || ("오류: " + (e && e.message ? e.message : e)); }

  function setAuthError(msg){
    const el = $("authError");
    el.textContent = msg || "";
    el.classList.toggle("show", !!msg);
  }

  function setAuthMode(mode){
    authMode = mode;
    setAuthError("");
    $("authPasswordConfirmField").style.display = mode === "signup" ? "" : "none";
    $("authLoginBtns").style.display = mode === "login" ? "" : "none";
    $("authSignupBtns").style.display = mode === "signup" ? "" : "none";
    $("authFormFields").style.display = mode === "success" ? "none" : "";
    $("authSuccess").style.display = mode === "success" ? "" : "none";
    $("authTitle").textContent = mode === "login" ? "로그인" : "회원가입";
    if (mode !== "success"){
      $("authUsername").value = "";
      $("authPassword").value = "";
      $("authPasswordConfirm").value = "";
    }
  }

  async function authSignup(){
    setAuthError("");
    if (!initFirebase()){ setAuthError("firebase-config.js에 Firebase 설정값을 먼저 채워넣어야 해요."); return; }
    const username = $("authUsername").value.trim();
    const password = $("authPassword").value;
    const passwordConfirm = $("authPasswordConfirm").value;
    if (!validUsername(username)){ setAuthError("아이디는 영문/숫자/밑줄 3~20자로 입력해주세요."); return; }
    if (password.length < 6){ setAuthError("비밀번호는 6자 이상이어야 해요."); return; }
    if (password !== passwordConfirm){ setAuthError("비밀번호가 일치하지 않습니다"); return; }
    try {
      await fbAuth.createUserWithEmailAndPassword(usernameToEmail(username), password);
      // 방금 만든 계정으로 자동 로그인된 상태이므로, 메인 화면으로 넘어가지 않도록 바로 로그아웃한다.
      await fbAuth.signOut();
      setAuthMode("success");
    }
    catch(e){ setAuthError(authErrorMessage(e)); }
  }

  async function authLogin(){
    setAuthError("");
    if (!initFirebase()){ setAuthError("firebase-config.js에 Firebase 설정값을 먼저 채워넣어야 해요."); return; }
    const username = $("authUsername").value.trim();
    const password = $("authPassword").value;
    try { await fbAuth.signInWithEmailAndPassword(usernameToEmail(username), password); }
    catch(e){ setAuthError(authErrorMessage(e)); }
  }

  async function authLogout(){
    if (artifactsUnsub){ artifactsUnsub(); artifactsUnsub = null; }
    if (fbAuth) await fbAuth.signOut();
  }

  function showAuthGate(){
    $("authGate").style.display = "";
    $("mainApp").style.display = "none";
    // 회원가입 성공 직후 signOut()이 트리거하는 onAuthStateChanged(null)이
    // "등록 완료" 화면을 로그인 화면으로 덮어써버리지 않도록 success 모드는 건드리지 않는다.
    if (authMode !== "success") setAuthMode("login");
  }
  function showMainApp(username){
    $("authGate").style.display = "none";
    $("mainApp").style.display = "";
    $("authUserLabel").textContent = username;
  }

  function artifactsCollection(){ return fbDb.collection("users").doc(STATE.uid).collection("artifacts"); }
  function settingsDoc(){ return fbDb.collection("users").doc(STATE.uid).collection("meta").doc("settings"); }

  function startFirestoreSync(){
    if (artifactsUnsub) artifactsUnsub();
    artifactsUnsub = artifactsCollection().onSnapshot((snap) => {
      STATE.artifacts = sortArtifacts(snap.docs.map(d => Object.assign({ id: d.id }, d.data())));
      renderList();
    }, (err) => { console.error("firestore snapshot error", err); });
    loadDustSetting();
  }

  function watchAuthState(){
    if (!initFirebase()){
      setAuthError("firebase-config.js에 Firebase 프로젝트 설정값을 채워넣어야 로그인 기능이 동작해요.");
      return;
    }
    fbAuth.onAuthStateChanged((user) => {
      if (user){
        STATE.uid = user.uid;
        showMainApp((user.email || "").split("@")[0]);
        startFirestoreSync();
      } else {
        STATE.uid = null;
        if (artifactsUnsub){ artifactsUnsub(); artifactsUnsub = null; }
        showAuthGate();
      }
    });
  }

  // 신규 성유물 1건을 로그인한 사용자의 Firestore 문서로 기록한다. saveArtifact와 JSON 일괄 등록이 공유한다.
  async function createArtifactRecord(data){
    data.createdAt = Date.now();
    await artifactsCollection().add(data);
  }

  // 붙여넣은 JSON 한 건을 저장 가능한 형태로 검증/정규화한다.
  function normalizeImportItem(item, idx){
    const errors = [];
    const slotKey = item && item.slotKey;
    if (!SLOT_MAP[slotKey]) errors.push(`#${idx + 1}: slotKey가 올바르지 않아요 (flower/feather/sands/goblet/circlet 중 하나)`);

    const setKey = item && item.setKey;
    if (!SET_OPTIONS.includes(setKey)) errors.push(`#${idx + 1}: setKey는 "${SET_OPTIONS.join('" / "')}" 중 하나여야 해요`);

    const location = LOCATION_OPTIONS.includes(item && item.location) ? item.location : OTHER_LOCATION;
    const startedWith4Substats = (item && item.startedWith4Substats) !== false;

    const rawSubs = Array.isArray(item && item.substats) ? item.substats : [];
    const seen = new Set();
    const substats = [];
    for (const s of rawSubs){
      if (!s || !SUBSTAT_KEYS.includes(s.key) || seen.has(s.key)) continue;
      const val = Number(s.value);
      if (!isFinite(val)) continue;
      seen.add(s.key);
      substats.push({ key: s.key, value: val });
      if (substats.length >= 4) break;
    }
    if (substats.length < 4) errors.push(`#${idx + 1}: 부옵션이 4개 미만으로 인식됐어요 (${substats.length}개)`);

    if (errors.length) return { ok: false, errors };

    const fixed = FIXED_MAIN_STATS[slotKey];
    return {
      ok: true,
      data: {
        slotKey, rarity: 5, setKey, level: 20, location,
        mainStatKey: fixed.key, mainStatValue: fixed.value,
        substats, startedWith4Substats,
      },
    };
  }

  async function importFromJson(){
    const errEl = $("jsonError");
    const resEl = $("jsonResult");
    errEl.textContent = "";
    errEl.classList.remove("show");
    resEl.textContent = "";

    let parsed;
    try {
      parsed = JSON.parse($("jsonInput").value);
    } catch(e){
      errEl.textContent = "JSON 형식이 올바르지 않아요: " + e.message;
      errEl.classList.add("show");
      return;
    }

    const items = Array.isArray(parsed) ? parsed : [parsed];
    const btn = $("jsonImportBtn");
    btn.disabled = true;

    const errors = [];
    const toAdd = [];
    items.forEach((item, idx) => {
      const r = normalizeImportItem(item, idx);
      if (r.ok) toAdd.push(r.data); else errors.push(...r.errors);
    });

    try {
      for (const data of toAdd) await createArtifactRecord(data);
    } catch(e){
      errors.push("저장 중 오류: " + (e && e.message ? e.message : e));
    }

    btn.disabled = false;
    if (toAdd.length){
      resEl.textContent = `${toAdd.length}개 등록 완료`;
      if (!errors.length) $("jsonInput").value = "";
    }
    if (errors.length){
      errEl.innerHTML = errors.map(escapeHtml).join("<br>");
      errEl.classList.add("show");
    }
  }

  // 보유 성유물 전체를 "JSON으로 한번에 등록" 입력창과 동일한 스키마로 내보낸다.
  function exportJson(){
    const statusEl = $("exportStatus");

    // "보유 성유물"로 등록된 실제 데이터(STATE.artifacts)만 내보낸다. 가져오기 입력창 내용과는 무관.
    const data = STATE.artifacts.map(a => ({
      slotKey: a.slotKey,
      setKey: a.setKey,
      location: a.location,
      startedWith4Substats: !!a.startedWith4Substats,
      substats: (a.substats || []).map(s => ({ key: s.key, value: s.value })),
    }));
    const json = JSON.stringify(data, null, 2);

    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "artifacts-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      if (statusEl) statusEl.textContent = `${data.length}개 내보냄 (artifacts-export.json 다운로드됨)`;
    } catch(e){
      if (statusEl) statusEl.textContent = "파일 다운로드를 지원하지 않는 환경이에요. 대신 '가져오기' 입력창에 붙여넣었어요.";
      $("jsonInput").value = json;
    }
  }

  // ---------- 호요랩 "캐릭터 정보" 화면 붙여넣기 파서 ----------
  // 형식: <피스 이름> / Lv.NN / <주스탯 이름> / <주스탯 값> / (<부옵션 이름> / [강화횟수 숫자]? / <부옵션 값>) x N
  // 강화횟수 배지는 항상 1~9 사이 "숫자 한 자리"뿐인 줄이라 이걸로 값 줄과 구분한다
  // (부옵션 값은 아무리 작아도 두 자리 이상이거나 소수점/%가 붙어있어서 안 겹침).
  //
  // 부위 판별: 이름이 NIGHT_SET_PIECE_NAMES에 있으면 그걸로 확정(세트="하늘 경계가 드러난 밤").
  // 없으면 주스탯 종류로 판별하고 세트는 "오프셋"으로 분류한다 — 게임 규칙상 아래 5가지는 겹칠 수 없음:
  //   HP(고정치)→꽃, 공격력(고정치)→깃털, 원소 충전 효율%→시계,
  //   치확%/치피%/치유 보너스%→왕관, 원소딸%/물리딸%→성배.
  // 공격력%/HP%/방어력%/원소 마스터리만 시계·성배·왕관이 다 가질 수 있어 애매한데,
  // 캐릭터 정보 화면은 항상 꽃→깃→시계→성배→왕관 순으로 나열되므로 "이 배치에서 몇 번째로
  // 나온 애매한 항목인지"로 순서대로 시계→성배→왕관에 배정한다 (5개를 한 번에 붙여넣는다는 전제).
  function classifySlotFromMainStat(mainName, mainIsPct, posState){
    if (mainName === "HP" && !mainIsPct) return "flower";
    if (mainName === "공격력" && !mainIsPct) return "feather";
    if (mainName === "원소 충전 효율") return "sands";
    if (mainName === "치명타 확률" || mainName === "치명타 피해" || mainName === "치유 보너스") return "circlet";
    if (mainIsPct && mainName !== "치명타 피해" && /피해/.test(mainName)) return "goblet";
    // 공격력%/HP%/방어력%/원소 마스터리 — 이미 배정된 슬롯(이름 매칭으로 확정된 것 포함)은 건너뛰고
    // 시계→성배→왕관 순서로 아직 안 쓰인 슬롯에 배정한다.
    const order = ["sands", "goblet", "circlet"];
    return order.find(s => !posState.usedSlots.has(s)) || null;
  }

  function parseHoyolabPaste(text){
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const levelIdxs = [];
    lines.forEach((l, i) => { if (/^Lv\.\d+$/.test(l)) levelIdxs.push(i); });

    const items = [];
    const errors = [];
    const defaultLocation = STATE.buildCharacter || (CHARACTERS[0] && CHARACTERS[0].name) || OTHER_LOCATION;
    const posState = { usedSlots: new Set() };

    levelIdxs.forEach((lvIdx, k) => {
      const nameIdx = lvIdx - 1;
      if (nameIdx < 0){ errors.push(`${k + 1}번째 항목: 이름 줄을 찾지 못했어요`); return; }
      const name = lines[nameIdx];
      const contentStart = lvIdx + 1;
      const contentEnd = (k + 1 < levelIdxs.length) ? levelIdxs[k + 1] - 2 : lines.length - 1;
      const content = lines.slice(contentStart, contentEnd + 1);

      if (content.length < 2){ errors.push(`"${name}": 주스탯 줄을 찾지 못했어요`); return; }
      const mainName = content[0];
      const mainIsPct = /%$/.test(content[1]);

      const knownSlot = NIGHT_SET_PIECE_NAMES[name];
      const slotKey = knownSlot || classifySlotFromMainStat(mainName, mainIsPct, posState);
      const setKey = knownSlot ? "하늘 경계가 드러난 밤" : "오프셋";

      if (!slotKey){
        errors.push(`"${name}": 주스탯("${mainName}")으로 부위를 판별하지 못했어요`);
        return;
      }
      posState.usedSlots.add(slotKey);

      // 앞 2줄(주스탯 이름+값)은 건너뛰고, 그 뒤부터 부옵션을 반복해서 읽는다.
      let idx = 2;
      const substats = [];
      while (idx < content.length && substats.length < 4){
        const subName = content[idx]; idx++;
        if (idx >= content.length) break;
        if (/^[1-9]$/.test(content[idx])) idx++; // 강화횟수 배지(있으면) 건너뜀
        if (idx >= content.length) break;
        const rawVal = content[idx]; idx++;
        const m = /^(-?\d+(?:\.\d+)?)(%)?$/.exec(rawVal);
        if (!m) continue;
        const isPct = !!m[2];
        const num = parseFloat(m[1]);
        const keyEntry = SUBSTAT_NAME_TO_KEY[subName];
        const key = keyEntry ? (isPct ? keyEntry.pct : keyEntry.flat) : null;
        if (key) substats.push({ key, value: num });
      }

      if (substats.length < 4){
        errors.push(`"${name}": 부옵션을 ${substats.length}개만 인식했어요 (4개 필요)`);
        return;
      }

      const fixed = FIXED_MAIN_STATS[slotKey];
      items.push({
        slotKey, setKey, rarity: 5, level: 20,
        mainStatKey: fixed.key, mainStatValue: fixed.value,
        location: defaultLocation, startedWith4Substats: true, substats,
      });
    });

    if (!levelIdxs.length) errors.push("붙여넣은 텍스트에서 'Lv.NN' 줄을 찾지 못했어요 — 캐릭터 정보 화면의 성유물 부분을 그대로 복사했는지 확인해주세요.");

    return { items, errors };
  }

  async function importFromHoyolab(){
    const statusEl = $("hoyoStatus");
    if (statusEl) statusEl.textContent = "";

    const text = $("hoyoInput").value;
    const { items, errors } = parseHoyolabPaste(text);

    const btn = $("hoyoImportBtn");
    if (btn) btn.disabled = true;
    try {
      for (const data of items) await createArtifactRecord(data);
    } catch(e){
      errors.push("저장 중 오류: " + (e && e.message ? e.message : e));
    }
    if (btn) btn.disabled = false;

    const parts = [];
    if (items.length) parts.push(`${items.length}개 등록 완료`);
    if (errors.length) parts.push(...errors);
    if (statusEl) statusEl.textContent = parts.join(" · ") || "인식된 성유물이 없어요.";
    if (items.length && !errors.length) $("hoyoInput").value = "";
  }

  // ---------- save / delete dispatch ----------
  async function saveArtifact(){
    clearFormError();
    if (!validateSubstatRows()){
      showFormError("부옵션을 모두 입력해주세요.");
      return;
    }
    const slotKey = $("slotKey").value;
    const fixed = FIXED_MAIN_STATS[slotKey] || {};
    const data = {
      slotKey,
      rarity: 5,
      setKey: $("setKey").value,
      level: 20,
      location: $("location").value,
      mainStatKey: fixed.key,
      mainStatValue: fixed.value,
      substats: readSubstatRows(),
      startedWith4Substats: $("startedWith4").checked,
      updatedAt: Date.now(),
    };

    const btn = $("saveBtn");
    btn.disabled = true;
    try {
      if (STATE.editingId){
        await artifactsCollection().doc(STATE.editingId).set(data);
      } else {
        await createArtifactRecord(data);
      }
      resetForm(data.slotKey);
    } catch(err){
      showFormError("저장 중 문제가 생겼어요: " + (err && err.message ? err.message : err));
    } finally {
      btn.disabled = false;
    }
  }

  async function deleteArtifact(id){
    try {
      await artifactsCollection().doc(id).delete();
      if (STATE.editingId === id) resetForm();
    } catch(err){
      alert("삭제 중 문제가 생겼어요: " + (err && err.message ? err.message : err));
    }
  }

  // ---------- init ----------
  function sortArtifacts(arr){
    return arr.slice().sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
  }

  async function loadDustSetting(){
    try {
      const snap = await settingsDoc().get();
      $("dustSpentInput").value = (snap.exists && snap.data().dustSpent) || 0;
    } catch(e){
      $("dustSpentInput").value = 0;
    }
    updatePityDisplay();
  }

  async function saveDustSetting(value){
    try { await settingsDoc().set({ dustSpent: value }); } catch(e){ /* 무시 — 다음 저장 때 재시도됨 */ }
  }

  function bindEvents(){
    $("slotKey").addEventListener("change", () => {
      updateMainStatDisplay();
      refreshSubstatOptions();
    });
    $("saveBtn").addEventListener("click", saveArtifact);
    $("cancelBtn").addEventListener("click", resetForm);
    $("substatRows").addEventListener("change", (e) => {
      if (e.target.classList.contains("sub-key")) refreshSubstatOptions();
    });
    $("buildCharSelect").addEventListener("change", () => {
      STATE.buildCharacter = $("buildCharSelect").value;
      STATE.buildSelection = { flower: "", feather: "", sands: "", goblet: "", circlet: "" };
      renderBuildSelectors();
      computeBuild();
    });
    $("buildCharLevel").addEventListener("change", () => {
      STATE.buildCharLevel = $("buildCharLevel").value;
      computeBuild();
    });
    $("reforgeRunBtn").addEventListener("click", runReforgeRecommendation);
    $("jsonImportBtn").addEventListener("click", importFromJson);
    $("hoyoImportBtn").addEventListener("click", importFromHoyolab);
    $("jsonExportBtnTop").addEventListener("click", exportJson);
    $("jsonExportBtnBottom").addEventListener("click", exportJson);
    $("dustSpentInput").addEventListener("change", () => {
      let v = parseInt($("dustSpentInput").value, 10) || 0;
      v = ((v % 18) + 18) % 18;
      $("dustSpentInput").value = v;
      updatePityDisplay();
      saveDustSetting(v);
    });
    $("authLoginBtn").addEventListener("click", authLogin);
    $("authSignupBtn").addEventListener("click", () => setAuthMode("signup"));
    $("authSignupSubmitBtn").addEventListener("click", authSignup);
    $("authSignupCancelBtn").addEventListener("click", () => setAuthMode("login"));
    $("authGoLoginBtn").addEventListener("click", () => setAuthMode("login"));
    $("authLogoutBtn").addEventListener("click", authLogout);
    $("authPassword").addEventListener("keydown", (e) => { if (e.key === "Enter") (authMode === "signup" ? authSignup() : authLogin()); });
    $("authPasswordConfirm").addEventListener("keydown", (e) => { if (e.key === "Enter") authSignup(); });
  }

  initTabs();
  populateSlotSelect();
  populateSetSelect();
  populateLocationSelect();
  populateBuildCharSelect();
  populateBuildCharLevelSelect();
  updateMainStatDisplay();
  renderSubstatRows([]);
  bindEvents();
  watchAuthState();

})();
