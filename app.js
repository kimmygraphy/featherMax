(function(){
  "use strict";


  const STATE = {
    editingId: null,
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
        const subsHtml = (a.substats || []).map(sub => {
          const isCrit = sub.key === "critRate_" || sub.key === "critDMG_";
          return `<span class="${isCrit ? "crit" : ""}">${SUBSTAT_LABELS[sub.key] || sub.key} ${fmtVal(sub.key, sub.value)}</span>`;
        }).join("");
        html += `
          <div class="art-item" data-id="${a.id}">
            <div class="art-main">
              <div class="art-set">${a.setKey || "세트 미지정"} · ★${a.rarity || 5}</div>
              <div class="art-mainstat">${mainName} ${a.mainStatValue != null ? fmtVal(a.mainStatKey, a.mainStatValue) : ""}<span class="lvl">+${a.level != null ? a.level : 20}</span></div>
              <div class="art-subs">${subsHtml || '<span>부옵션 없음</span>'}</div>
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

  // ---------- reforge simulation ----------
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
    let gainSum = 0;

    for (let t = 0; t < REFORGE_TRIALS; t++){
      let newCritRate = 0, newCritDMG = 0;
      // 보장된 롤은 우선순위 2스탯에 번갈아 배정, 나머지는 4타입 중 랜덤
      const assigned = [];
      for (let g = 0; g < guaranteed; g++) assigned.push(priority[g % 2]);
      for (let r = guaranteed; r < rollCount; r++){
        assigned.push(types[Math.floor(Math.random() * types.length)]);
      }
      for (const type of assigned){
        if (type === "critRate_"){
          const tiers = ROLL_TABLE.critRate_;
          newCritRate += tiers[Math.floor(Math.random() * tiers.length)];
        } else if (type === "critDMG_"){
          const tiers = ROLL_TABLE.critDMG_;
          newCritDMG += tiers[Math.floor(Math.random() * tiers.length)];
        }
      }
      const newCV = 2 * newCritRate + newCritDMG;
      gainSum += Math.max(0, newCV - oldCV);
    }

    const expectedGain = gainSum / REFORGE_TRIALS;
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
            <span class="rf-eff">+${s.efficiency.toFixed(2)}/먼지</span>
          </div>
          <div class="rf-detail">
            <span>현재 CV ${s.oldCV.toFixed(1)}</span>
            <span>기대이득 +${s.expectedGain.toFixed(2)}</span>
            <span>먼지 ${s.dust}개</span>
            <span>보장 롤 ${s.guaranteedRolls}개</span>
            <span>우선순위: ${s.priorityLabel}</span>
          </div>
        </div>`;
    };

    let html = "";
    if (activeSet){
      const flexLabel = [...flexSlots].map(k => (SLOT_MAP[k] || {}).label || k).join(", ");
      html += `<p class="reforge-note">활성 세트: ${escapeHtml(activeSet)} (장착 5부위 중 4개 이상 차지)${flexLabel ? ` · 여유 슬롯: ${flexLabel} (세트 무관하게 후보 인정)` : ""}</p>`;
    } else {
      html += `<p class="reforge-note">지금 4개 이상 차지하는 세트가 없어서(빌드 탭에서 부위를 선택하거나 장착 캐릭터를 지정해주세요) 전체 성유물을 대상으로 계산했어요.</p>`;
    }
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

  // ---------- storage backend (브라우저 로컬저장소 전용) ----------
  function setSyncState(){}

  function localCollectionKey(){ return "artifactLedger.items"; }

  function localLoadAll(){
    try {
      const raw = localStorage.getItem(localCollectionKey());
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch(e){ return []; }
  }
  function localSaveAll(arr){
    try { localStorage.setItem(localCollectionKey(), JSON.stringify(arr)); } catch(e){}
  }

  function localAdd(data){
    const arr = localLoadAll();
    const id = "loc_" + Date.now() + "_" + Math.random().toString(36).slice(2,8);
    arr.unshift(Object.assign({ id }, data));
    localSaveAll(arr);
    STATE.artifacts = arr;
    renderList();
  }
  function localUpdate(id, data){
    const arr = localLoadAll();
    const idx = arr.findIndex(a => a.id === id);
    if (idx >= 0) arr[idx] = Object.assign({ id }, data);
    localSaveAll(arr);
    STATE.artifacts = arr;
    renderList();
  }
  function localDelete(id){
    let arr = localLoadAll();
    arr = arr.filter(a => a.id !== id);
    localSaveAll(arr);
    STATE.artifacts = arr;
    renderList();
  }

  // 신규 성유물 1건을 브라우저 로컬저장소에 기록한다. saveArtifact와 JSON 일괄 등록이 공유한다.
  async function createArtifactRecord(data){
    data.createdAt = Date.now();
    localAdd(data);
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
        localUpdate(STATE.editingId, data);
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
      localDelete(id);
      if (STATE.editingId === id) resetForm();
    } catch(err){
      alert("삭제 중 문제가 생겼어요: " + (err && err.message ? err.message : err));
    }
  }

  // ---------- init ----------
  function sortArtifacts(arr){
    return arr.slice().sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
  }

  function localLoadDustSpent(){
    try { return parseInt(localStorage.getItem("artifactLedger.dustSpent"), 10) || 0; }
    catch(e){ return 0; }
  }
  function localSaveDustSpent(v){
    try { localStorage.setItem("artifactLedger.dustSpent", String(v)); } catch(e){}
  }

  async function loadDustSetting(){
    $("dustSpentInput").value = localLoadDustSpent();
    updatePityDisplay();
  }

  async function saveDustSetting(value){
    localSaveDustSpent(value);
  }

  async function initStorage(){
    setSyncState();
    STATE.artifacts = sortArtifacts(localLoadAll());
    renderList();
    loadDustSetting();
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
    $("jsonExportBtnTop").addEventListener("click", exportJson);
    $("jsonExportBtnBottom").addEventListener("click", exportJson);
    $("dustSpentInput").addEventListener("change", () => {
      let v = parseInt($("dustSpentInput").value, 10) || 0;
      v = ((v % 18) + 18) % 18;
      $("dustSpentInput").value = v;
      updatePityDisplay();
      saveDustSetting(v);
    });
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
  initStorage();

})();
