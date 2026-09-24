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
    reforgeTargets: {},
    buildWeapons: {},         // { 캐릭터명: { key, refine } } — 캐릭터별 선택 무기       // { 캐릭터명: { critRate, er, atk } } — 재구축 목표 (null = 사용 안 함)
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

  // 폼에서 현재 선택된 주옵 키. 선택값이 없거나 이 부위에 맞지 않으면 부위 기본값(첫 옵션).
  function currentFormMainKey(){
    const slot = $("slotKey").value;
    const opts = MAIN_STAT_FORM_OPTIONS[slot] || [];
    const disp = $("mainStatDisplay");
    const k = disp && disp.dataset.mainKey;
    if (k && (opts.includes(k) || MAIN_STAT_VALUES_20[k] != null)) return k;
    return opts[0] || null;
  }

  // 부위별 주옵 표시. 선택지가 2개 이상인 부위(잔/모자)는 드롭다운.
  // 수정 중인 성유물의 주옵이 폼 선택지에 없으면(예: 가져오기로 들어온 원충 시계) 선택지에 덧붙여 보존한다.
  function updateMainStatDisplay(){
    const slot = $("slotKey").value;
    const disp = $("mainStatDisplay");
    const current = currentFormMainKey();
    disp.dataset.mainKey = current || "";
    if (!current){ disp.textContent = "—"; return; }

    const opts = (MAIN_STAT_FORM_OPTIONS[slot] || []).slice();
    if (!opts.includes(current)) opts.push(current);
    if (opts.length === 1){
      disp.textContent = mainStatLabel(current) + " " + fmtVal(current, MAIN_STAT_VALUES_20[current]);
      return;
    }
    disp.innerHTML = `<select id="mainStatSelect">${
      opts.map(k => `<option value="${k}" ${k===current?"selected":""}>${mainStatLabel(k)} ${fmtVal(k, MAIN_STAT_VALUES_20[k])}</option>`).join("")
    }</select>`;
    $("mainStatSelect").addEventListener("change", (e) => {
      const next = e.target.value;
      disp.dataset.mainKey = next;
      // 새 주옵과 같은 부옵이 입력돼 있던 줄만 리셋 (나머지 부옵은 유지)
      document.querySelectorAll("#substatRows .substat-row").forEach(row => {
        const subKey = row.querySelector(".sub-key");
        if (subKey.value === next){
          subKey.value = "";
          row.querySelector(".sub-value").value = "";
        }
      });
      refreshSubstatOptions();
    });
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
    const mainKey = currentFormMainKey();
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
      $("mainStatDisplay").dataset.mainKey = "";
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
    $("mainStatDisplay").dataset.mainKey = art.mainStatKey || "";
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
        const mainName = mainStatLabel(a.mainStatKey);
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
    if (RELEVANT.includes(a.mainStatKey) && a.mainStatValue != null){
      parts.unshift(`[주]${mainStatLabel(a.mainStatKey)} ${fmtVal(a.mainStatKey, a.mainStatValue)}`);
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

  // ---------- 무기 선택 ----------
  // 캐릭터별 선택 무기. 저장값이 없거나 그 캐릭터 무기군이 아니면 기본 무기(전무), 재련 1.
  function getSelectedWeapon(char){
    const sel = STATE.buildWeapons[char.name] || {};
    const w = WEAPON_MAP[sel.key];
    const key = (w && w.type === char.weaponType) ? w.key : char.defaultWeapon;
    const refine = Math.min(5, Math.max(1, parseInt(sel.refine, 10) || 1));
    return { key, refine };
  }
  function currentCharBase(char){
    const sel = getSelectedWeapon(char);
    return getCharBaseStats(char, STATE.buildCharLevel || DEFAULT_CHAR_LEVEL, sel.key, sel.refine);
  }

  function weaponPassiveText(w, refine){
    if (!w || !w.passive) return "";
    const r = refine - 1, p = w.passive, parts = [];
    if (p.atk_) parts.push(`공격력 +${p.atk_[r]}%`);
    if (p.critRate_) parts.push(`치명타 확률 +${p.critRate_[r]}%`);
    if (p.critDMG_) parts.push(`치명타 피해 +${p.critDMG_[r]}%`);
    if (p.atkPerER) parts.push(`원충 100% 초과분의 ${p.atkPerER[r]}%만큼 공격력% (최대 ${p.atkPerERMax[r]}%)`);
    return parts.join(", ");
  }

  // 무기 드롭다운: 현재 캐릭터의 무기군만, 5성 → 4성 순. 재련 드롭다운 R1~R5.
  function populateWeaponSelect(){
    const sel = $("buildWeapon"), rsel = $("buildRefine");
    if (!sel || !rsel) return;
    const char = getCharacter(STATE.buildCharacter);
    if (!char){ sel.innerHTML = ""; return; }
    const cur = getSelectedWeapon(char);
    const list = WEAPONS.filter(w => w.type === char.weaponType);
    const opt = w => `<option value="${w.key}" ${w.key === cur.key ? "selected" : ""}>${escapeHtml(w.name)} · ${SUBSTAT_LABELS[w.sub.key] || mainStatLabel(w.sub.key)} ${fmtVal(w.sub.key, w.sub.value)}</option>`;
    sel.innerHTML = [5, 4].map(r => {
      const ws = list.filter(w => w.rarity === r);
      return ws.length ? `<optgroup label="★${r}">${ws.map(opt).join("")}</optgroup>` : "";
    }).join("");
    rsel.innerHTML = [1, 2, 3, 4, 5].map(r => `<option value="${r}" ${r === cur.refine ? "selected" : ""}>R${r}</option>`).join("");
    const label = $("buildWeaponLabel");
    if (label) label.textContent = `무기 (${WEAPON_TYPE_LABELS[char.weaponType] || ""})`;
    renderWeaponNote();
  }
  function renderWeaponNote(){
    const note = $("buildWeaponNote");
    if (!note) return;
    const char = getCharacter(STATE.buildCharacter);
    if (!char){ note.textContent = ""; return; }
    const cur = getSelectedWeapon(char);
    const w = WEAPON_MAP[cur.key];
    const txt = weaponPassiveText(w, cur.refine);
    note.textContent = w ? `기초 공격력 ${w.baseATK}${txt ? ` · 상시 효과 반영: ${txt}` : " · 반영되는 상시 스탯 효과 없음"}` : "";
  }
  function onWeaponChange(){
    const char = getCharacter(STATE.buildCharacter);
    if (!char) return;
    const val = { key: $("buildWeapon").value, refine: parseInt($("buildRefine").value, 10) || 1 };
    STATE.buildWeapons[char.name] = val;
    saveSettings({ buildWeapons: { [char.name]: val } });
    renderWeaponNote();
    computeBuild();
  }

  // 현재 "캐릭터 스펙" 탭에 선택된 5부위 기준으로 최종 스탯을 계산한다.
  // "캐릭터 스펙" 탭 최종 스펙 표시용. (재구축 계산은 buildReforgeContext가 장착 기준으로 따로 계산)
  function computeBuildStats(){
    const char = getCharacter(STATE.buildCharacter);
    if (!char) return null;
    const level = STATE.buildCharLevel || DEFAULT_CHAR_LEVEL;
    const base = currentCharBase(char);
    const baseATKSum = base.baseATKSum; // ATK%가 곱해지는 기초값(캐릭터+무기)

    const chosen = SLOTS.map(s => STATE.artifacts.find(a => a.id === STATE.buildSelection[s.key])).filter(Boolean);

    let atkPercentSum = 0, atkFlatSum = 0, critRateSum = 0, critDmgSum = 0, erSum = 0;
    for (const a of chosen){
      if (a.mainStatKey === "atk_") atkPercentSum += a.mainStatValue || 0;
      if (a.mainStatKey === "atk") atkFlatSum += a.mainStatValue || 0;
      if (a.mainStatKey === "critRate_") critRateSum += a.mainStatValue || 0;
      if (a.mainStatKey === "critDMG_") critDmgSum += a.mainStatValue || 0;
      if (a.mainStatKey === "er_") erSum += a.mainStatValue || 0;
      for (const sub of (a.substats || [])){
        if (sub.key === "atk_") atkPercentSum += sub.value;
        else if (sub.key === "atk") atkFlatSum += sub.value;
        else if (sub.key === "critRate_") critRateSum += sub.value;
        else if (sub.key === "critDMG_") critDmgSum += sub.value;
        else if (sub.key === "er_") erSum += sub.value;
      }
    }

    const finalER = base.er + erSum;
    const finalATK = baseATKSum * (1 + totalAtkPct(base, atkPercentSum, finalER) / 100) + atkFlatSum;
    const finalCritRate = base.critRate + critRateSum;
    const finalCritDMG = base.critDMG + critDmgSum;
    const cv = 2 * finalCritRate + finalCritDMG;

    return {
      char, level, base, baseATKSum, chosenCount: chosen.length,
      atkPercentSum, atkFlatSum, critRateSum, critDmgSum, erSum,
      finalATK, finalCritRate, finalCritDMG, finalER, cv,
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

    resultsEl.innerHTML = `
      <div class="stat-line headline"><span>공격력</span><span class="v">${Math.round(stats.finalATK).toLocaleString()}</span></div>
      <div class="stat-line crit"><span>치명타 확률</span><span class="v">${stats.finalCritRate.toFixed(1)}%</span></div>
      <div class="stat-line crit"><span>치명타 피해</span><span class="v">${stats.finalCritDMG.toFixed(1)}%</span></div>
      <div class="stat-line"><span>원소 충전 효율</span><span class="v">${stats.finalER.toFixed(1)}%</span></div>
      <div class="stat-line headline"><span>CV (2×치확+치피)</span><span class="v">${stats.cv.toFixed(1)}</span></div>
      <div class="stat-line"><span>성유물 공격력% 합</span><span class="v">${stats.atkPercentSum.toFixed(1)}%</span></div>
      <div class="stat-line"><span>성유물 깡공 합</span><span class="v">${Math.round(stats.atkFlatSum)}</span></div>
      <div class="sub-note">${stats.chosenCount}/5부위 선택됨 · 캐릭터 Lv.${stats.level} · ${escapeHtml(stats.base.weapon ? stats.base.weapon.name : "무기")} Lv.90 R${stats.base.refine} 기준</div>
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

  // ---------- 재구축 계산 엔진 ----------
  // 게임 규칙: 재구축은 부옵 4종과 각 부옵의 초기값을 유지하고, 강화 롤(4줄 시작 5회 / 3줄 시작 4회)만 다시 굴린다.
  // 사용자가 고른 부옵 2종에는 최소 g회(해석 진도에 따라 2~4)가 보장된다(바닥 보장, rollCountDist 참고).
  // 각 부옵이 몇 롤을 받는지(개수 벡터)와, 롤 개수별 합계 분포를 조합해 가능한 결과를 전부 정확히 계산한다.
  const TRACKED_KEYS = ["atk_", "atk", "critRate_", "critDMG_", "er_"]; // 딜/목표 계산에 쓰이는 스탯
  const r2 = v => Math.round(v * 100) / 100;
  const meanRoll = k => ROLL_TABLE[k].reduce((a, b) => a + b, 0) / ROLL_TABLE[k].length;

  // 부옵별 초기값. 옵티마이저 initialValue가 있으면 그 값, 없으면 "현재값 ÷ 추정 롤 횟수"로 추정.
  // 추정 롤 횟수 합은 성유물 전체 롤 수(4줄 시작 9 / 3줄 시작 8)에 맞춘다.
  function estimateInitials(art){
    const subs = art.substats || [];
    const total = art.startedWith4Substats ? 9 : 8;
    const ratio = subs.map(s => ROLL_TABLE[s.key] ? s.value / meanRoll(s.key) : 1);
    const n = ratio.map(r => Math.max(1, Math.round(r)));
    let sum = n.reduce((a, b) => a + b, 0);
    while (sum > total){
      let best = -1;
      n.forEach((v, i) => { if (v > 1 && (best < 0 || (v - ratio[i]) > (n[best] - ratio[best]))) best = i; });
      if (best < 0) break;
      n[best]--; sum--;
    }
    while (sum < total){
      let best = 0;
      n.forEach((v, i) => { if ((ratio[i] - v) > (ratio[best] - n[best])) best = i; });
      n[best]++; sum++;
    }
    return subs.map((s, i) => {
      if (s.init != null && isFinite(s.init)) return s.init;
      const table = ROLL_TABLE[s.key];
      if (!table) return s.value;
      return Math.min(table[3], Math.max(table[0], s.value / n[i]));
    });
  }

  // k롤 합계의 분포 (값 → 확률). 캐시해서 재사용.
  const SUM_DIST_CACHE = {};
  function sumDist(key, k){
    const ck = key + ":" + k;
    if (SUM_DIST_CACHE[ck]) return SUM_DIST_CACHE[ck];
    let dist = new Map([[0, 1]]);
    for (let i = 0; i < k; i++){
      const next = new Map();
      for (const [v, p] of dist){
        for (const r of ROLL_TABLE[key]){
          const nv = r2(v + r);
          next.set(nv, (next.get(nv) || 0) + p / 4);
        }
      }
      dist = next;
    }
    return (SUM_DIST_CACHE[ck] = [...dist]);
  }

  // 부옵 4종 각각이 받는 강화 롤 개수의 분포. pair = 사용자가 선택한 부옵 인덱스 2개, guaranteed = 보장 횟수.
  // 보장은 "바닥"이다: 매 롤은 4줄 균등이고, 남은 강화 횟수가 아직 못 채운 보장 횟수와 같아지면
  // 그때부터 남은 롤은 선택한 2종 중에서만(반반) 붙는다. 이미 보장을 채웠으면 끝까지 4줄 균등.
  function rollCountDist(pair, guaranteed, rollCount){
    let dist = new Map([["0,0,0,0|0", 1]]);
    for (let r = 0; r < rollCount; r++){
      const remaining = rollCount - r;
      const next = new Map();
      for (const [key, p] of dist){
        const [cs, hs] = key.split("|");
        const v = cs.split(",").map(Number), hits = Number(hs);
        const forced = Math.max(0, guaranteed - hits) >= remaining;
        const choices = forced ? pair : [0, 1, 2, 3];
        for (const i of choices){
          v[i]++;
          const nk = v.join(",") + "|" + (hits + (pair.includes(i) ? 1 : 0));
          v[i]--;
          next.set(nk, (next.get(nk) || 0) + p / choices.length);
        }
      }
      dist = next;
    }
    const merged = new Map();
    for (const [key, p] of dist){ const cs = key.split("|")[0]; merged.set(cs, (merged.get(cs) || 0) + p); }
    return [...merged].map(([k, p]) => [k.split(",").map(Number), p]);
  }

  function emptySums(){ return { atk_: 0, atk: 0, critRate_: 0, critDMG_: 0, er_: 0 }; }
  function addPieceSums(sums, a){
    if (!a) return sums;
    if (sums[a.mainStatKey] != null) sums[a.mainStatKey] += a.mainStatValue || 0;
    for (const sub of (a.substats || [])) if (sums[sub.key] != null) sums[sub.key] += sub.value;
    return sums;
  }

  // 빌드 스탯 → 딜 지표(D)와 목표 부족분(롤 개수 환산).
  //   D = 공격력 × (1 + 유효치확 × 치피). 유효치확은 min(치확, 치확 목표, 100) — 목표 초과 치확은 가치 0.
  //   원충은 딜에 안 들어가고(목표 초과분 가치 0), 공격력은 목표를 넘어도 D로 계속 가치를 인정한다.
  function evalBuild(ctx, sums){
    const b = ctx.base, t = ctx.targets;
    const ER = b.er + sums.er_;
    const ATK = ctx.baseATKSum * (1 + totalAtkPct(b, sums.atk_, ER) / 100) + sums.atk;
    const CR = b.critRate + sums.critRate_;
    const CD = b.critDMG + sums.critDMG_;
    const crCap = Math.min(100, t.critRate != null ? t.critRate : 100);
    const CReff = Math.max(0, Math.min(CR, crCap));
    const D = ATK * (1 + (CReff / 100) * (CD / 100));
    let deficit = 0, meets = true;
    if (t.critRate != null && CR < t.critRate){ deficit += (t.critRate - CR) / meanRoll("critRate_"); meets = false; }
    if (t.er != null && ER < t.er){ deficit += (t.er - ER) / meanRoll("er_"); meets = false; }
    if (t.atk != null && ATK < t.atk){ deficit += (t.atk - ATK) / (ctx.baseATKSum * meanRoll("atk_") / 100); meets = false; }
    return { ATK, CR, CD, ER, D, deficit, meets };
  }

  // 부족분이 더 작으면 더 좋은 빌드, 같으면 딜이 높은 쪽.
  function betterEval(a, b){
    if (Math.abs(a.deficit - b.deficit) > 1e-9) return a.deficit < b.deficit ? a : b;
    return a.D >= b.D ? a : b;
  }

  // 재구축에 필요한 빌드 맥락: 캐릭터, 목표, 슬롯별 장착품, 슬롯을 비운 나머지 빌드 합계, 현재 빌드 평가.
  function buildReforgeContext(){
    const char = getCharacter(STATE.buildCharacter);
    if (!char) return null;
    const base = currentCharBase(char);
    const equipped = getEquippedBySlot();
    const ctx = { char, base, baseATKSum: base.baseATKSum, targets: getReforgeTargets(), equipped, restBySlot: {} };
    const all = emptySums();
    for (const s of SLOTS) addPieceSums(all, equipped[s.key]);
    ctx.current = evalBuild(ctx, all);
    for (const s of SLOTS){
      const rest = emptySums();
      for (const o of SLOTS) if (o.key !== s.key) addPieceSums(rest, equipped[o.key]);
      ctx.restBySlot[s.key] = rest;
    }
    return ctx;
  }

  // 한 성유물을 재구축했을 때의 결과. 확정 롤을 줄 부옵 2종은 가능한 조합을 전부 계산해서 가장 좋은 걸 고른다.
  //  - 장착 중인 성유물: 재구축 결과가 그대로 빌드에 들어간다 (나빠질 수도 있음 → 기대치가 음수일 수 있음).
  //  - 미장착 성유물: 결과가 장착품보다 좋을 때만 교체한다고 보고, 현재 빌드 대비 이득을 계산한다.
  function simulateReforge(art, ctx, guaranteed){
    const subs = art.substats || [];
    if (subs.length < 4) return { skip: true, reason: "부옵션 4개 모두 입력해야 계산돼요" };
    const types = subs.map(s => s.key);
    const tracked = types.map((k, i) => TRACKED_KEYS.includes(k) ? i : -1).filter(i => i >= 0);
    if (!tracked.length) return { skip: true, reason: "공격력·치확·치피·원충 부옵이 없어 재구축 효과 없음" };
    if ((art.slotKey === "flower" || art.slotKey === "feather") && !types.includes("atk_")){
      return { skip: true, reason: "공격력% 부옵이 없어 후보에서 제외 (꽃/깃털은 공격력% 확보가 가능한 유일한 부위)" };
    }

    const rollCount = art.startedWith4Substats ? 5 : 4;
    const g = Math.min(guaranteed || 2, rollCount);
    const inits = estimateInitials(art);
    const equippedPiece = ctx.equipped[art.slotKey];
    const isEquipped = !!equippedPiece && equippedPiece.id === art.id;

    // 재구축과 무관한 부분(나머지 부위 + 이 성유물 주옵 + 부옵 초기값)은 고정
    const fixed = Object.assign({}, ctx.restBySlot[art.slotKey]);
    if (fixed[art.mainStatKey] != null) fixed[art.mainStatKey] += art.mainStatValue || 0;
    tracked.forEach(i => { fixed[types[i]] += inits[i]; });

    // 확정 롤 대상 조합: 딜/목표에 쓰이는 부옵끼리. 그런 부옵이 1개뿐이면 나머지 하나는 아무거나 (결과 동일).
    const pairs = [];
    if (tracked.length >= 2){
      for (let a = 0; a < tracked.length; a++) for (let b = a + 1; b < tracked.length; b++) pairs.push([tracked[a], tracked[b]]);
    } else {
      pairs.push([tracked[0], [0, 1, 2, 3].find(i => i !== tracked[0])]);
    }

    let best = null;
    for (const pair of pairs){
      let eDef = 0, eD = 0, pMeet = 0;
      for (const [counts, pc] of rollCountDist(pair, g, rollCount)){
        // 추적 부옵별 롤 합계 분포의 곱(독립)을 전부 순회
        const dims = tracked.filter(i => counts[i] > 0).map(i => ({ key: types[i], dist: sumDist(types[i], counts[i]) }));
        const sums = Object.assign({}, fixed);
        const walk = (d, p) => {
          if (d === dims.length){
            const ev = evalBuild(ctx, sums);
            const chosen = isEquipped ? ev : betterEval(ev, ctx.current);
            eDef += p * chosen.deficit; eD += p * chosen.D; if (chosen.meets) pMeet += p;
            return;
          }
          const { key, dist } = dims[d];
          for (const [v, pv] of dist){ sums[key] += v; walk(d + 1, p * pv); sums[key] -= v; }
        };
        walk(0, pc);
      }
      const res = {
        pair,
        reduction: ctx.current.deficit - eDef,
        gainPct: (eD / ctx.current.D - 1) * 100,
        pMeet,
      };
      if (!best || res.reduction > best.reduction + 1e-9 || (Math.abs(res.reduction - best.reduction) <= 1e-9 && res.gainPct > best.gainPct)) best = res;
    }

    const dust = DUST_COST[art.slotKey] || 2;
    return {
      skip: false, isEquipped, dust, guaranteedRolls: g,
      reduction: best.reduction, gainPct: best.gainPct, pMeet: best.pMeet,
      reductionPerDust: best.reduction / dust,
      efficiency: best.gainPct / dust,
      priorityLabel: best.pair.map(i => SUBSTAT_LABELS[types[i]]).join(" + "),
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
    const ctx = buildReforgeContext();
    if (!ctx){
      root.innerHTML = `<div class="empty">"캐릭터 스펙" 탭에서 캐릭터를 먼저 선택해주세요.</div>`;
      return;
    }
    const hasTargets = ["critRate", "er", "atk"].some(k => ctx.targets[k] != null);

    // 활성 세트가 없으면 전부 대상. 있으면: 활성 세트 소속이거나, 여유 슬롯(세트 상관없이 껴도 되는 자리)인 것만 후보.
    const inScope = a => !activeSet || a.setKey === activeSet || flexSlots.has(a.slotKey);
    const inSet = eligible.filter(inScope);
    const outSet = eligible.filter(a => !inScope(a));

    const scored = inSet.map(a => {
      const cost = DUST_COST[a.slotKey] || 2;
      const guaranteedRolls = calcGuaranteedRolls(progress, cost);
      return { art: a, ...simulateReforge(a, ctx, guaranteedRolls) };
    });
    // 1순위: 가루당 목표 부족분 해소량(롤 단위), 2순위: 가루당 기대 딜 상승률
    scored.sort((x, y) => {
      if (x.skip && y.skip) return 0;
      if (x.skip) return 1;
      if (y.skip) return -1;
      const dr = Math.round((y.reductionPerDust - x.reductionPerDust) * 1000);
      if (dr !== 0) return dr;
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
      const sign = v => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2);
      const targetLine = hasTargets
        ? `<div class="rf-detail"><span>부족분 해소 ${sign(s.reduction)}롤</span><span>목표 달성 확률 ${(s.pMeet * 100).toFixed(0)}%</span></div>`
        : "";
      const eqBadge = s.isEquipped ? `<span class="rf-badge">장착 중</span>` : "";
      return `
        <div class="reforge-item${outOfSet || s.efficiency < 0 ? " zero" : ""}">
          <div class="rf-head">
            <span class="rf-title">${title}${locBadge}${eqBadge}${outBadge}</span>
            <span class="rf-eff">딜 ${sign(s.efficiency)}%/가루</span>
          </div>
          <div class="rf-subs">${substatsLineHtml(s.art.substats)}</div>
          ${targetLine}
          <div class="rf-detail">
            <span>기대 딜 ${sign(s.gainPct)}%</span>
            <span class="rf-priority">확정 롤 추천: ${s.priorityLabel}</span>
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

    const cur = ctx.current, t = ctx.targets;
    const statusParts = [];
    if (t.critRate != null) statusParts.push(`치확 ${cur.CR.toFixed(1)}% / ${t.critRate}%`);
    if (t.er != null) statusParts.push(`원충 ${cur.ER.toFixed(1)}% / ${t.er}%`);
    if (t.atk != null) statusParts.push(`공격력 ${Math.round(cur.ATK)} / ${t.atk}`);
    html += `<p class="reforge-note">범위: ${STATE.reforgeScope === "equipped" ? "장착 중인 성유물만" : "배낭 전체 (미장착은 장착품보다 좋아질 때 교체 기준)"}</p>`;
    if (statusParts.length){
      html += `<p class="reforge-note">현재 빌드 / 목표 — ${statusParts.join(" · ")}${cur.meets ? " (모두 충족)" : ""}</p>`;
    }

    html += `<div class="reforge-table-head"><span>성유물</span><span>가루당 기대 딜 상승</span></div>`;
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
      const sub = { key: mappedKey, value: val };
      const init = Number(s.initialValue);
      if (s.initialValue != null && isFinite(init)) sub.init = init; // 옵티마이저가 아는 초기값 (재구축 계산에 사용)
      substats.push(sub);
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

    // mainStatKey: 원본 값을 옵티마이저 키 매핑 후 그대로 사용 (잔 원소 피해%, 모자 치확 등 보존).
    // 필드가 없으면(구버전 내보내기) 부위 기본 주옵으로 채운다. 값은 +20 고정 수치 표에서 가져온다.
    const rawMain = item && item.mainStatKey ? normalizeStatKey(item.mainStatKey) : (MAIN_STAT_FORM_OPTIONS[slotKey] || [])[0];
    if (MAIN_STAT_VALUES_20[rawMain] == null){
      return { ok: false, errors: [`#${idx + 1}: 주옵("${item && item.mainStatKey}")을 인식하지 못했어요`] };
    }
    const mainStatKey = rawMain;
    const mainStatValue = MAIN_STAT_VALUES_20[rawMain];

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
      mainStatKey: a.mainStatKey,
      location: a.location,
      startedWith4Substats: !!a.startedWith4Substats,
      substats: (a.substats || []).map(s => (s.init != null ? { key: s.key, value: s.value, initialValue: s.init } : { key: s.key, value: s.value })),
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

      const mainEntry = SUBSTAT_NAME_TO_KEY[mainName];
      const parsedMain = MAIN_STAT_NAME_TO_KEY[mainName] || (mainEntry ? (mainIsPct ? mainEntry.pct : mainEntry.flat) : null);
      const mainKey = MAIN_STAT_VALUES_20[parsedMain] != null ? parsedMain : (MAIN_STAT_FORM_OPTIONS[slotKey] || [])[0];
      items.push({
        name, slotKey, suggestedSet, rarity: 5, level: 20,
        mainStatKey: mainKey, mainStatValue: MAIN_STAT_VALUES_20[mainKey],
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
          <div class="hoyo-preview-main">${mainStatLabel(item.mainStatKey)} ${fmtVal(item.mainStatKey, item.mainStatValue)}</div>
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
    const mainKey = currentFormMainKey();
    const data = {
      slotKey,
      rarity: 5,
      setKey: $("setKey").value,
      level: 20,
      location: $("location").value,
      mainStatKey: mainKey,
      mainStatValue: MAIN_STAT_VALUES_20[mainKey],
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

  // 설정 문서(users/{uid}/meta/settings) 하나에 해석 진도·재구축 범위·캐릭터별 목표를 같이 저장한다.
  // merge 저장이라 한 항목을 저장해도 다른 항목이 지워지지 않는다.
  async function loadDustSetting(){
    let d = {};
    try {
      const snap = await settingsDoc().get();
      d = (snap.exists && snap.data()) || {};
    } catch(e){ /* 기본값 사용 */ }
    $("dustSpentInput").value = d.dustSpent || 0;
    STATE.reforgeScope = d.reforgeScope === "all" ? "all" : "equipped";
    STATE.reforgeTargets = (d.reforgeTargets && typeof d.reforgeTargets === "object") ? d.reforgeTargets : {};
    STATE.buildWeapons = (d.buildWeapons && typeof d.buildWeapons === "object") ? d.buildWeapons : {};
    populateWeaponSelect();
    computeBuild();
    renderScopeButtons();
    renderTargetInputs();
    updatePityDisplay();
  }

  async function saveSettings(partial){
    try { await settingsDoc().set(partial, { merge: true }); } catch(e){ /* 무시 — 다음 저장 때 재시도됨 */ }
  }
  function saveDustSetting(value){ return saveSettings({ dustSpent: value }); }

  function renderScopeButtons(){
    document.querySelectorAll(".reforge-scope-btn").forEach(b => b.classList.toggle("active", b.dataset.scope === STATE.reforgeScope));
  }

  // 현재 "캐릭터 스펙" 탭에서 고른 캐릭터의 목표. 3단계 재구축 계산에서 이 값을 쓴다.
  function getReforgeTargets(){
    const t = STATE.reforgeTargets[STATE.buildCharacter] || {};
    return { critRate: t.critRate ?? null, er: t.er ?? null, atk: t.atk ?? null };
  }

  function renderTargetInputs(){
    const label = $("reforgeTargetChar");
    if (label) label.textContent = STATE.buildCharacter ? `· ${STATE.buildCharacter}` : "";
    const t = getReforgeTargets();
    document.querySelectorAll(".target-input").forEach(inp => {
      const v = t[inp.dataset.target];
      inp.value = v == null ? "" : v;
    });
  }

  function onTargetInputChange(e){
    const inp = e.target;
    const raw = inp.value.trim();
    let v = raw === "" ? null : Number(raw);
    if (v != null && (!isFinite(v) || v < 0)) v = null;
    if (v != null && inp.dataset.target === "critRate") v = Math.min(v, 100);
    inp.value = v == null ? "" : v;
    const char = STATE.buildCharacter;
    if (!char) return;
    const cur = Object.assign({ critRate: null, er: null, atk: null }, STATE.reforgeTargets[char]);
    cur[inp.dataset.target] = v;
    STATE.reforgeTargets[char] = cur;
    saveSettings({ reforgeTargets: { [char]: cur } });
  }

  function bindEvents(){
    $("slotKey").addEventListener("change", () => {
      $("mainStatDisplay").dataset.mainKey = "";
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
      renderTargetInputs();
      populateWeaponSelect();
      STATE.buildSelection = { flower: "", feather: "", sands: "", goblet: "", circlet: "" };
      renderBuildSelectors();
      computeBuild();
    });
    $("buildCharLevel").addEventListener("change", () => {
      STATE.buildCharLevel = $("buildCharLevel").value;
      computeBuild();
    });
    $("reforgeRunBtn").addEventListener("click", runReforgeRecommendation);
    $("buildWeapon").addEventListener("change", onWeaponChange);
    $("buildRefine").addEventListener("change", onWeaponChange);
    document.querySelectorAll(".target-input").forEach(inp => inp.addEventListener("change", onTargetInputChange));
    document.querySelectorAll(".reforge-scope-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        STATE.reforgeScope = btn.dataset.scope;
        renderScopeButtons();
        saveSettings({ reforgeScope: STATE.reforgeScope });
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
  renderTargetInputs();
  populateWeaponSelect();
  bindEvents();
  watchAuthState();

})();
