(function(){
  "use strict";


  const STATE = {
    editingId: null,
    uid: null,
    artifacts: [],
    buildSelection: { flower: "", feather: "", sands: "", goblet: "", circlet: "" },
    buildCharacter: CHARACTERS[0] ? CHARACTERS[0].name : null,
    buildCharLevel: DEFAULT_CHAR_LEVEL,
    reforgeScope: "equipped", // "equipped" | "all" — 재구축 후보 범위
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
    const disp = $("mainStatDisplay");
    if (slot === "circlet"){
      // 모자는 치피/치확 중 선택 가능한 드롭다운
      const current = disp.dataset.circletKey || CIRCLET_MAIN_OPTIONS[0].key;
      disp.innerHTML = `<select id="circletMainSelect">${
        CIRCLET_MAIN_OPTIONS.map(o =>
          `<option value="${o.key}" ${o.key===current?"selected":""}>${o.label} ${fmtVal(o.key, o.value)}</option>`
        ).join("")
      }</select>`;
      disp.dataset.circletKey = current;
      const sel = $("circletMainSelect");
      sel.addEventListener("change", () => {
        const prev = disp.dataset.circletKey;
        disp.dataset.circletKey = sel.value;
        // 주옵션과 중복되는 부옵션만 리셋
        const rows = Array.from(document.querySelectorAll("#substatRows .substat-row"));
        rows.forEach(row => {
          const subKey = row.querySelector(".sub-key");
          if (subKey.value === sel.value){
            subKey.value = "";
            row.querySelector(".sub-value").value = "";
          }
        });
        // FIXED_MAIN_STATS 동적 갱신
        const opt = CIRCLET_MAIN_OPTIONS.find(o => o.key === sel.value);
        if (opt) FIXED_MAIN_STATS.circlet = { key: opt.key, value: opt.value, label: opt.label };
        refreshSubstatOptions();
      });
      return;
    }
    const fixed = FIXED_MAIN_STATS[slot];
    if (!fixed){ disp.textContent = "—"; return; }
    disp.textContent = fixed.label + " " + fmtVal(fixed.key, fixed.value);
  }

  function substatRowHtml(idx, key, value){
    const opts = SUBSTAT_KEYS.map(k => `<option value="${k}" ${k===key?"selected":""}>${SUBSTAT_LABELS[k]}</option>`).join("");
    const ti = idx * 2 + 1; // tabindex: key1=1, val1=2, key2=3, val2=4, ...
    return `
      <div class="substat-row" data-idx="${idx}">
        <select class="sub-key" tabindex="${ti}">
          <option value="">— 없음 —</option>
          ${opts}
        </select>
        <input type="number" step="0.1" class="sub-value" placeholder="값" value="${value != null ? value : ""}" tabindex="${ti+1}" />
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

  // 부옵션 키를 선택하면 해당 행의 값 입력칸으로 자동 포커스
  function autoFocusSubValue(e){
    if (!e.target.classList.contains("sub-key")) return;
    if (e.target.value){
      const valInput = e.target.closest(".substat-row").querySelector(".sub-value");
      if (valInput) valInput.focus();
    }
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
    hideFormSuccess();
  }
  function clearFormError(){
    const el = $("formError");
    el.textContent = "";
    el.classList.remove("show");
  }
  function showFormSuccess(msg){
    const el = $("formSuccess");
    el.textContent = msg;
    el.classList.add("show");
  }
  function hideFormSuccess(){
    const el = $("formSuccess");
    if (el){ el.textContent = ""; el.classList.remove("show"); }
  }

  // preserveFields=true: 등록 성공 후에는 부옵션만 리셋하고 부위/세트/장착캐릭터/주스탯은 유지
  function resetForm(preserveSlot, preserveFields){
    clearFormError();
    hideFormSuccess();
    STATE.editingId = null;
    $("formTitle").textContent = "성유물 등록";
    $("saveBtn").textContent = "성유물 등록";
    $("cancelBtn").style.display = "none";
    if (!preserveFields){
      setFieldValue("slotKey", preserveSlot || "flower");
      updateMainStatDisplay();
      setFieldValue("setKey", SET_OPTIONS[0]);
      setFieldValue("location", LOCATION_OPTIONS[0]);
    }
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

  function initSubTabs(){
    document.querySelectorAll(".sub-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".sub-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const name = btn.dataset.subtab;
        document.querySelectorAll(".sub-tab-panel").forEach(p => {
          p.style.display = p.id === ("subtab-" + name) ? "" : "none";
        });
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

  // 현재 "캐릭터 스펙" 탭에 선택된 5부위 기준으로 최종 스탯을 계산한다.
  // computeBuild()(화면 렌더용)와 computeDamageWeights()(재구축 가중치용) 둘 다 이걸 쓴다.
  function computeBuildStats(){
    const char = getCharacter(STATE.buildCharacter);
    if (!char) return null;
    const level = STATE.buildCharLevel || DEFAULT_CHAR_LEVEL;
    const charBaseATK = char.atkByLevel[level] != null ? char.atkByLevel[level] : Object.values(char.atkByLevel)[0];
    const baseATKSum = charBaseATK + char.weaponBaseATK; // ATK%가 곱해지는 기초값(캐릭터+무기)

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

    const finalATK = baseATKSum * (1 + atkPercentSum / 100) + atkFlatSum;
    const finalCritRate = UNIVERSAL_BASE_CRIT_RATE + char.weaponBaseCritRate + critRateSum;
    const finalCritDMG = char.charBaseCritDMG + critDmgSum;
    const cv = 2 * finalCritRate + finalCritDMG;

    return {
      char, level, charBaseATK, baseATKSum, chosenCount: chosen.length,
      atkPercentSum, atkFlatSum, critRateSum, critDmgSum,
      finalATK, finalCritRate, finalCritDMG, cv,
    };
  }

  function computeBuild(){
    const resultsEl = $("buildResults");
    if (!resultsEl) return;

    const titleEl = $("buildResultsTitle");
    if (titleEl) titleEl.textContent = "최종 스펙";

    const stats = computeBuildStats();
    if (!stats){
      resultsEl.innerHTML = `<div class="empty">등록된 캐릭터가 없어요.</div>`;
      return;
    }
    if (!stats.chosenCount){
      resultsEl.innerHTML = `<div class="empty">부위를 하나 이상 선택하면 빌드가 계산돼요.</div>`;
      return;
    }

    resultsEl.innerHTML = `
      <div class="stat-line headline"><span>공격력</span><span class="v">${Math.round(stats.finalATK).toLocaleString()}</span></div>
      <div class="stat-line crit"><span>치명타 확률</span><span class="v">${stats.finalCritRate.toFixed(1)}%</span></div>
      <div class="stat-line crit"><span>치명타 피해</span><span class="v">${stats.finalCritDMG.toFixed(1)}%</span></div>
      <div class="stat-line headline"><span>CV (2×치확+치피)</span><span class="v">${stats.cv.toFixed(1)}</span></div>
      <div class="stat-line"><span>성유물 공격력% 합</span><span class="v">${stats.atkPercentSum.toFixed(1)}%</span></div>
      <div class="stat-line"><span>성유물 깡공 합</span><span class="v">${Math.round(stats.atkFlatSum)}</span></div>
      <div class="sub-note">${stats.chosenCount}/5부위 선택됨 · 캐릭터 Lv.${stats.level} · 전용 무기 Lv.90 기준</div>
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
  // 그걸 전부 컨볼루션(합성곱)해서 최종 점수의 정확한 분포를 구하고, 그 분포로 기대이득을 계산한다.
  // 몬테카를로보다 더 빠르고, 버튼을 몇 번을 눌러도 항상 똑같은 값이 나온다(노이즈 없음).
  function round6(v){ return Math.round(v * 1e6) / 1e6; }

  // ---------- 데미지 기반 가중치 (후보 C) ----------
  // 데미지 ∝ ATK_total × (1 + 치확×치피)  로 보고, 각 스탯 1%p의 한계 기여도(편미분)를 구한다.
  //   치확 1%p 가치 = ATK_total × 치피(소수)
  //   치피 1%p 가치 = ATK_total × 치확(소수)
  //   공격력% 1%p 가치 = (캐릭터+무기 기초ATK)/100 × (1 + 치확×치피)(소수)
  // 치피 1단위를 기준(=1)으로 정규화해서, 치확/치피만 있는 기존 CV(2CR+CD)와 눈금이 비슷하게 유지된다.
  // "캐릭터 스펙" 탭에 빌드가 없으면(캐릭터 미선택/부위 미선택) 레거시 CV 가중치로 자동 대체된다.
  var LEGACY_CV_WEIGHTS = { critRate_: 2, critDMG_: 1, atk_: 0 };

  function computeDamageWeights(){
    const stats = computeBuildStats();
    if (!stats || !stats.chosenCount) return LEGACY_CV_WEIGHTS;

    const CR = stats.finalCritRate / 100;
    const CD = stats.finalCritDMG / 100;
    const critMult = 1 + CR * CD;

    const wCritRate = stats.finalATK * CD;
    const wCritDMG = stats.finalATK * CR;
    const wAtkPct = (stats.baseATKSum / 100) * critMult;

    if (!(wCritDMG > 0)) return LEGACY_CV_WEIGHTS; // 치확/치피가 0이면 안전하게 레거시로

    return {
      critRate_: wCritRate / wCritDMG,
      critDMG_: 1,
      atk_: wAtkPct / wCritDMG,
    };
  }

  // 롤 하나가 `type`으로 확정 배정됐을 때, 가중 점수 기여값의 확률분포(Map: 기여값 → 확률)
  function rollDistribution(type, weights){
    const w = (weights || LEGACY_CV_WEIGHTS)[type] || 0;
    const table = ROLL_TABLE[type];
    if (!w || !table) return new Map([[0, 1]]); // 가중치 없는 타입(원마/원충/방어력 등)은 기여 없음
    const m = new Map();
    for (const v of table){ const k = round6(w * v); m.set(k, (m.get(k) || 0) + 0.25); }
    return m;
  }

  // 롤 하나가 `types`(4개) 중 무작위로 배정될 때의 가중 점수 분포
  function randomRollDistribution(types, weights){
    const m = new Map();
    for (const t of types){
      const sub = rollDistribution(t, weights);
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

  // 부옵션 4개 중, 가중치가 있는 타입(치확/치피/공격력%)이 하나라도 있는 성유물만 재구축 의미가 있다.
  // 우선순위 2스탯은 가중치가 높은 순으로 상위 2개(치확+치피+공격력% 중 어떤 조합이든 가능).
  function simulateOneArtifact(art, guaranteedRolls, weights){
    weights = weights || LEGACY_CV_WEIGHTS;
    const subs = art.substats || [];
    if (subs.length < 4) return { skip: true, reason: "부옵션 4개 모두 입력해야 계산돼요" };

    const types = subs.map(s => s.key);
    const relevant = types.filter(t => (weights[t] || 0) > 0);
    if (!relevant.length) return { skip: true, reason: "치확/치피/공격력% 부옵션이 없어 재구축 효과 없음" };

    // 꽃/깃털은 시계·잔과 달리 주옵이 공격력%가 아니라서, 부옵으로 공격력%를 못 챙기면
    // 그 성유물은 이 빌드에서 영원히 공격력%를 공급할 수 없다(재구축은 부옵 종류를 못 바꿈).
    // 빌드가 잡혀서 공격력%가 실제로 가치 있는 상황(weights.atk_ > 0)에서만 이 필터를 적용한다.
    if ((weights.atk_ || 0) > 0 && (art.slotKey === "flower" || art.slotKey === "feather") && !types.includes("atk_")){
      return { skip: true, reason: "공격력% 부옵이 없어 후보에서 제외 (꽃/깃털은 공격력% 확보가 가능한 유일한 부위)" };
    }

    const oldScore = subs.reduce((acc, s) => acc + (weights[s.key] || 0) * s.value, 0);

    let priority = relevant.slice().sort((a, b) => weights[b] - weights[a]).slice(0, 2);
    if (priority.length === 1){
      const other = types.find(t => t !== priority[0]);
      priority.push(other);
    }

    const rollCount = art.startedWith4Substats ? 5 : 4;
    const guaranteed = Math.min(guaranteedRolls || 2, rollCount);

    let dist = new Map([[0, 1]]);
    for (let g = 0; g < guaranteed; g++) dist = convolve(dist, rollDistribution(priority[g % 2], weights));
    if (guaranteed < rollCount){
      const randDist = randomRollDistribution(types, weights);
      for (let r = guaranteed; r < rollCount; r++) dist = convolve(dist, randDist);
    }

    let expectedGain = 0;
    for (const [v, p] of dist) expectedGain += p * Math.max(0, v - oldScore);

    const dust = DUST_COST[art.slotKey] || 2;
    return {
      skip: false,
      oldCV: oldScore, expectedGain, dust,
      efficiency: expectedGain / dust,
      priorityLabel: priority.map(p => SUBSTAT_LABELS[p]).join(" + "),
      guaranteedRolls: guaranteed,
    };
  }

  // 지금 "장착 중"인 5부위(빌드 탭 선택값 우선, 없으면 현재 빌드 캐릭터로 지정된 첫 성유물)를 반환.
  // getActiveSetInfo(활성 세트 판별)와 재구축 탭의 "장착 중인 것만" 범위 필터가 공유해서 쓴다.
  function getEquippedBySlot(){
    const equippedBySlot = {};
    for (const s of SLOTS){
      let piece = STATE.artifacts.find(a => a.id === STATE.buildSelection[s.key]);
      if (!piece) piece = STATE.artifacts.find(a => a.slotKey === s.key && a.location === STATE.buildCharacter);
      equippedBySlot[s.key] = piece || null;
    }
    return equippedBySlot;
  }

  // 지금 장착 중인 5부위 중, 그중 4개 이상을 차지하는 세트를 "활성 세트"로 본다. 4세트만 채우면 되니,
  // 활성 세트가 아닌 장비를 낀 나머지 1자리는 "여유 슬롯(flex slot)"으로 보고 세트 무관하게 다 후보로 인정한다.
  function getActiveSetInfo(){
    const equippedBySlot = getEquippedBySlot();
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
    let eligible = STATE.artifacts.filter(a => a.rarity === 5);
    if (!eligible.length){
      root.innerHTML = `<div class="empty">계산할 5★ 성유물이 없어요.</div>`;
      return;
    }

    // 범위 필터: "장착 중인 것만"이면 지금 5부위에 실제로 낀 성유물로 후보를 좁힌다.
    if (STATE.reforgeScope === "equipped"){
      const equippedIds = new Set(Object.values(getEquippedBySlot()).filter(Boolean).map(a => a.id));
      eligible = eligible.filter(a => equippedIds.has(a.id));
      if (!eligible.length){
        root.innerHTML = `<div class="empty">"캐릭터 스펙" 탭에서 장착 중인 성유물이 없어요. 부위를 선택하거나 "배낭 전체"로 바꿔보세요.</div>`;
        return;
      }
    }

    const progress = parseInt($("dustSpentInput").value, 10) || 0;
    const { activeSet, flexSlots } = getActiveSetInfo();
    const weights = computeDamageWeights(); // 빌드 있으면 ATK%까지 반영, 없으면 레거시 CV로 자동 대체

    // 활성 세트가 없으면 전부 대상. 있으면: 활성 세트 소속이거나, 여유 슬롯(세트 상관없이 껴도 되는 자리)인 것만 후보.
    const inScope = a => !activeSet || a.setKey === activeSet || flexSlots.has(a.slotKey);
    const inSet = eligible.filter(inScope);
    const outSet = eligible.filter(a => !inScope(a));

    const scored = inSet.map(a => {
      const cost = DUST_COST[a.slotKey] || 2;
      const guaranteedRolls = calcGuaranteedRolls(progress, cost);
      return { art: a, ...simulateOneArtifact(a, guaranteedRolls, weights) };
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
            <span>현재 점수 ${s.oldCV.toFixed(1)}</span>
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

    // 빌드가 없으면(캐릭터/부위 미선택) 레거시 CV 기준으로 대체됐음을 안내.
    if (weights === LEGACY_CV_WEIGHTS){
      html += `<p class="reforge-note">"캐릭터 스펙" 탭에서 빌드를 선택하면 공격력%까지 반영한 정밀 계산으로 전환돼요. 지금은 치확/치피만 보는 기존 방식(CV)이에요.</p>`;
    } else {
      html += `<p class="reforge-note">현재 빌드(공격력/치확/치피) 기준으로 공격력%까지 반영해 계산했어요.</p>`;
    }
    html += `<p class="reforge-note">범위: ${STATE.reforgeScope === "equipped" ? "장착 중인 성유물만" : "배낭 전체"}</p>`;

    html += `<div class="reforge-table-head"><span>성유물</span><span>기대 상승치</span></div>`;
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

  // 신규 성유물 1건을 로그인한 사용자의 Firestore 문서로 기록한다. saveArtifact와 호요랩 등록이 쓴다.
  async function createArtifactRecord(data){
    data.createdAt = Date.now();
    await artifactsCollection().add(data);
  }

  // 대량 쓰기: Firestore writeBatch는 1회 500건 제한이라 500건 단위로 끊어 커밋한다.
  async function batchCreateArtifacts(items){
    const BATCH_SIZE = 500;
    const col = artifactsCollection();
    for (let i = 0; i < items.length; i += BATCH_SIZE){
      const batch = fbDb.batch();
      const chunk = items.slice(i, i + BATCH_SIZE);
      for (const data of chunk){
        data.createdAt = Date.now();
        batch.set(col.doc(), data);
      }
      await batch.commit();
    }
  }

  // 대량 삭제: 위와 동일하게 500건 단위 batch delete.
  async function batchDeleteArtifacts(ids){
    const BATCH_SIZE = 500;
    const col = artifactsCollection();
    for (let i = 0; i < ids.length; i += BATCH_SIZE){
      const batch = fbDb.batch();
      const chunk = ids.slice(i, i + BATCH_SIZE);
      for (const id of chunk) batch.delete(col.doc(id));
      await batch.commit();
    }
  }

  // 붙여넣은 JSON 한 건을 저장 가능한 형태로 검증/정규화한다.
  // 자체 포맷과 옵티마이저 포맷(setKey 영문, eleMas/enerRech_ 등) 모두 지원.
  function normalizeImportItem(item, idx){
    const errors = [];
    const slotKey = normalizeSlotKey(item && item.slotKey);
    if (!SLOT_MAP[slotKey]) errors.push(`#${idx + 1}: slotKey가 올바르지 않아요 (flower/feather/plume/sands/goblet/circlet 중 하나)`);

    // setKey: 영문 옵티마이저 키면 한글로 변환, 이미 한글이면 그대로.
    const rawSet = (item && item.setKey) || "";
    const setKey = ARTIFACT_SET_KEY_MAP[rawSet] || rawSet || "오프셋";

    // location: 영문 옵티마이저 캐릭터키면 한글로 변환, 빈 문자열이면 '기타'.
    const rawLoc = (item && item.location) || "";
    const mappedLoc = CHARACTER_KEY_MAP[rawLoc] || rawLoc;
    const location = LOCATION_OPTIONS.includes(mappedLoc) ? mappedLoc : OTHER_LOCATION;

    // 이 앱은 풀강(+20) 5성 성유물만 다룬다 — FIXED_MAIN_STATS의 주옵 값 자체가 +20 기준 고정치라서,
    // 레벨이 낮은 성유물을 그대로 받으면 주옵/부옵 상태가 실제와 안 맞게 된다. level이 명시돼 있고
    // 20이 아니면 가져오기에서 제외한다(level 필드가 아예 없으면 우리 자체 내보내기 포맷이므로 20으로 간주).
    const level = (item && item.level != null) ? item.level : 20;
    if (level !== 20){
      errors.push(`#${idx + 1}: 레벨 ${level}(풀강 아님) — 풀강(+20) 성유물만 가져올 수 있어요`);
    }

    const rawSubs = Array.isArray(item && item.substats) ? item.substats : [];
    const seen = new Set();
    const substats = [];
    for (const s of rawSubs){
      if (!s) continue;
      const mappedKey = normalizeStatKey(s.key);           // 옵티마이저 키 → 내부 키
      if (!SUBSTAT_KEYS.includes(mappedKey) || seen.has(mappedKey)) continue;
      const val = Number(s.value);
      if (!isFinite(val)) continue;
      seen.add(mappedKey);
      substats.push({ key: mappedKey, value: val });
      if (substats.length >= 4) break;
    }
    // 풀강(+20) 성유물은 3줄/4줄 시작 여부와 무관하게 4강 시점에 4번째 줄이 무조건 열리므로,
    // +20이면 부옵이 반드시 4개여야 한다. 4개 미만이면 원본 데이터 자체가 불완전한 것.
    if (substats.length < 4) errors.push(`#${idx + 1}: 부옵션이 ${substats.length}개만 인식됐어요 (풀강 성유물은 4개여야 해요)`);

    if (errors.length) return { ok: false, errors };

    // startedWith4Substats: 명시된 필드가 있으면 그대로, 없으면 totalRolls로 역산.
    // totalRolls = 시작 줄 수(3 또는 4) + 레벨업당 1롤(4/8/12/16/20 = 5회) → 시작줄수 = totalRolls - 5 (level=20 기준)
    let startedWith4Substats;
    if (item && item.startedWith4Substats != null){
      startedWith4Substats = !!item.startedWith4Substats;
    } else if (item && typeof item.totalRolls === "number"){
      const initialLines = item.totalRolls - Math.floor(level / 4);
      startedWith4Substats = initialLines >= 4;
    } else {
      startedWith4Substats = true; // 정보가 전혀 없으면 기존 동작대로 낙관적 기본값
    }

    // mainStatKey: 옵티마이저 키 매핑 적용 후, FIXED_MAIN_STATS에 있으면 그 값, 없으면 item 원본 값 사용
    const mappedMain = normalizeStatKey((item && item.mainStatKey) || "");
    const fixed = FIXED_MAIN_STATS[slotKey];
    const mainStatKey = fixed ? fixed.key : mappedMain;
    const mainStatValue = fixed ? fixed.value : 0;

    return {
      ok: true,
      data: {
        slotKey, rarity: item.rarity || 5, setKey, level: 20, location,
        mainStatKey, mainStatValue,
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

    // 옵티마이저 형식: { "artifacts": [...] }  /  일반 배열: [...]  /  단일 객체: {...}
    const items = Array.isArray(parsed) ? parsed
      : (parsed.artifacts && Array.isArray(parsed.artifacts)) ? parsed.artifacts
      : [parsed];
    const btn = $("jsonImportBtn");
    btn.disabled = true;

    const errors = [];
    const toAdd = [];
    items.forEach((item, idx) => {
      const r = normalizeImportItem(item, idx);
      if (r.ok) toAdd.push(r.data); else errors.push(...r.errors);
    });

    try {
      await batchCreateArtifacts(toAdd);
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

  function buildExportJson(){
    return JSON.stringify(STATE.artifacts.map(a => ({
      slotKey: a.slotKey,
      setKey: a.setKey,
      location: a.location,
      startedWith4Substats: !!a.startedWith4Substats,
      substats: (a.substats || []).map(s => ({ key: s.key, value: s.value })),
    })), null, 2);
  }

  // #13-a: 클립보드에 복사
  async function copyJsonToClipboard(){
    const statusEl = $("exportStatus");
    const json = buildExportJson();
    try {
      await navigator.clipboard.writeText(json);
      if (statusEl) statusEl.textContent = `${STATE.artifacts.length}개 목록이 클립보드에 복사되었습니다.`;
    } catch(e){
      if (statusEl) statusEl.textContent = "복사에 실패했어요. 브라우저가 클립보드 접근을 차단했을 수 있어요.";
    }
  }

  // #13-b: JSON 파일로 다운로드
  function exportJsonFile(){
    const statusEl = $("exportStatus");
    const json = buildExportJson();
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
      if (statusEl) statusEl.textContent = `${STATE.artifacts.length}개 내보냄 (artifacts-export.json)`;
    } catch(e){
      if (statusEl) statusEl.textContent = "다운로드를 지원하지 않는 환경이에요.";
    }
  }

  // #14: 보유 성유물 전체 삭제 (batch)
  async function clearAllArtifacts(){
    if (!STATE.artifacts.length) return;
    if (!confirm("정말 비우시겠습니까?")) return;
    try {
      await batchDeleteArtifacts(STATE.artifacts.map(a => a.id));
    } catch(e){
      alert("삭제 중 오류: " + (e && e.message ? e.message : e));
    }
  }

  // ---------- 호요랩 "캐릭터 정보" 화면 붙여넣기 파서 ----------
  // 부위 판별: 주스탯 종류로 자동 판별. 세트는 사용자가 미리보기에서 직접 지정.
  function classifySlotFromMainStat(mainName, mainIsPct, posState){
    if (mainName === "HP" && !mainIsPct) return "flower";
    if (mainName === "공격력" && !mainIsPct) return "feather";
    if (mainName === "원소 충전 효율") return "sands";
    if (mainName === "치명타 확률" || mainName === "치명타 피해" || mainName === "치유 보너스") return "circlet";
    if (mainIsPct && mainName !== "치명타 피해" && /피해/.test(mainName)) return "goblet";
    const order = ["sands", "goblet", "circlet"];
    return order.find(s => !posState.usedSlots.has(s)) || null;
  }

  // 텍스트를 파싱해서 미리보기용 아이템 배열을 리턴한다. setKey는 아직 미정(사용자가 지정).
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
      // 세트 추천: 이름 DB에 있으면 해당 세트, 없으면 첫 번째 옵션을 기본값으로 제안
      const suggestedSet = knownSlot ? "하늘 경계가 드러난 밤" : SET_OPTIONS[0];

      if (!slotKey){
        errors.push(`"${name}": 주스탯("${mainName}")으로 부위를 판별하지 못했어요`);
        return;
      }
      posState.usedSlots.add(slotKey);

      let idx = 2;
      const substats = [];
      while (idx < content.length && substats.length < 4){
        const subName = content[idx]; idx++;
        if (idx >= content.length) break;
        if (/^[1-9]$/.test(content[idx])) idx++;
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
        name, slotKey, suggestedSet, rarity: 5, level: 20,
        mainStatKey: fixed.key, mainStatValue: fixed.value,
        location: defaultLocation, startedWith4Substats: true, substats,
      });
    });

    if (!levelIdxs.length) errors.push("붙여넣은 텍스트에서 'Lv.NN' 줄을 찾지 못했어요 — 캐릭터 정보 화면의 성유물 부분을 그대로 복사했는지 확인해주세요.");

    return { items, errors };
  }

  // 호요랩 파싱 결과를 미리보기 리스트로 표시
  let hoyoParsedItems = []; // 미리보기 상태 보관

  function showHoyoPreview(items){
    hoyoParsedItems = items;
    const root = $("hoyoPreviewList");
    const setOpts = SET_OPTIONS.map(s =>
      `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`
    ).join("");

    root.innerHTML = items.map((item, i) => {
      const slotLabel = SLOT_MAP[item.slotKey] ? SLOT_MAP[item.slotKey].label : item.slotKey;
      const slotIcon = SLOT_MAP[item.slotKey] ? SLOT_MAP[item.slotKey].icon : "";
      // suggestedSet에 맞는 옵션을 selected로 세팅
      const opts = SET_OPTIONS.map(s =>
        `<option value="${escapeHtml(s)}" ${s === item.suggestedSet ? "selected" : ""}>${escapeHtml(s)}</option>`
      ).join("");
      return `
        <div class="hoyo-preview-item" data-idx="${i}">
          <div class="hoyo-preview-head">
            <span class="slot-label">${iconMarkup(slotIcon)} ${escapeHtml(slotLabel)} — ${escapeHtml(item.name)}</span>
            <select class="hoyo-set-select">${opts}</select>
          </div>
          <div class="hoyo-preview-main">${FIXED_MAIN_STATS[item.slotKey] ? FIXED_MAIN_STATS[item.slotKey].label : ""} ${fmtVal(item.mainStatKey, item.mainStatValue)}</div>
          <div class="hoyo-preview-subs">${substatsLineHtml(item.substats)}</div>
        </div>`;
    }).join("");

    $("hoyoPreview").style.display = "";
  }

  function hideHoyoPreview(){
    $("hoyoPreview").style.display = "none";
    $("hoyoPreviewList").innerHTML = "";
    hoyoParsedItems = [];
  }

  // Step 1: 인식하기 — 텍스트 파싱 + 미리보기 렌더
  function parseAndPreviewHoyo(){
    const errEl = $("hoyoError");
    const statusEl = $("hoyoStatus");
    errEl.textContent = ""; errEl.classList.remove("show");
    if (statusEl) statusEl.textContent = "";
    hideHoyoPreview();

    const text = $("hoyoInput").value;
    const { items, errors } = parseHoyolabPaste(text);

    if (errors.length){
      errEl.innerHTML = errors.map(escapeHtml).join("<br>");
      errEl.classList.add("show");
    }
    if (!items.length){
      if (!errors.length){
        errEl.textContent = "인식된 성유물이 없어요.";
        errEl.classList.add("show");
      }
      return;
    }
    showHoyoPreview(items);
  }

  // Step 2: 저장하기 — 사용자가 세트를 지정한 후 실제 저장 (batch)
  async function saveHoyoPreview(){
    const rows = Array.from(document.querySelectorAll("#hoyoPreviewList .hoyo-preview-item"));
    const statusEl = $("hoyoStatus");
    const btn = $("hoyoSaveBtn");
    btn.disabled = true;

    const toAdd = [];
    for (let i = 0; i < rows.length; i++){
      const item = hoyoParsedItems[i];
      if (!item) continue;
      const setKey = rows[i].querySelector(".hoyo-set-select").value;
      toAdd.push({
        slotKey: item.slotKey, rarity: item.rarity, setKey, level: item.level,
        location: item.location, mainStatKey: item.mainStatKey, mainStatValue: item.mainStatValue,
        substats: item.substats, startedWith4Substats: item.startedWith4Substats,
      });
    }

    const errors = [];
    try {
      await batchCreateArtifacts(toAdd);
    } catch(e){
      errors.push("저장 중 오류: " + (e && e.message ? e.message : e));
    }

    btn.disabled = false;
    hideHoyoPreview();
    if (toAdd.length && !errors.length){
      if (statusEl) statusEl.textContent = `${toAdd.length}개 등록 완료`;
      $("hoyoInput").value = "";
    }
    if (errors.length){
      const errEl = $("hoyoError");
      errEl.innerHTML = errors.map(escapeHtml).join("<br>");
      errEl.classList.add("show");
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
    const isEditing = !!STATE.editingId;
    btn.disabled = true;
    try {
      if (isEditing){
        await artifactsCollection().doc(STATE.editingId).set(data);
        resetForm(data.slotKey, false);
      } else {
        await createArtifactRecord(data);
        resetForm(data.slotKey, true);  // 신규 등록: 부옵션만 리셋
        showFormSuccess("등록 성공");
      }
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
    $("cancelBtn").addEventListener("click", () => resetForm());
    $("substatRows").addEventListener("change", (e) => {
      if (e.target.classList.contains("sub-key")) refreshSubstatOptions();
      autoFocusSubValue(e);  // #12: 키 선택 시 값 칸으로 자동 포커스
    });
    $("resetSubstatsBtn").addEventListener("click", () => {  // #11
      if (confirm("정말 리셋하시겠습니까?")) renderSubstatRows([]);
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
    document.querySelectorAll(".reforge-scope-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".reforge-scope-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        STATE.reforgeScope = btn.dataset.scope;
      });
    });
    $("jsonImportBtn").addEventListener("click", importFromJson);
    $("hoyoParseBtn").addEventListener("click", parseAndPreviewHoyo);
    $("hoyoSaveBtn").addEventListener("click", saveHoyoPreview);
    $("hoyoCancelBtn").addEventListener("click", hideHoyoPreview);
    $("jsonCopyBtn").addEventListener("click", copyJsonToClipboard);   // #13
    $("jsonExportBtn").addEventListener("click", exportJsonFile);       // #13
    $("clearAllBtn").addEventListener("click", clearAllArtifacts);      // #14
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
  initSubTabs();
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
