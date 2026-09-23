// data.js — 성유물/캐릭터 고정 데이터. 캐릭터를 추가하려면 CHARACTERS 배열에 객체를 더 넣으면 됨.

  const SLOTS = [
    { key: "flower", label: "꽃", icon: "data/imgs/artifacts/flower.png" },
    { key: "feather", label: "깃털", icon: "data/imgs/artifacts/feather.png" },
    { key: "sands", label: "시계", icon: "data/imgs/artifacts/sands.png" },
    { key: "goblet", label: "잔", icon: "data/imgs/artifacts/goblet.png" },
    { key: "circlet", label: "모자", icon: "data/imgs/artifacts/circlet.png" },
  ];
  const SLOT_MAP = Object.fromEntries(SLOTS.map(s => [s.key, s]));

  const SUBSTAT_LABELS = {
    hp: "HP", hp_: "HP%", atk: "공격력", atk_: "공격력%",
    def: "방어력", def_: "방어력%", em: "원소 마스터리",
    er_: "원소 충전 효율%", critRate_: "치명타 확률%", critDMG_: "치명타 피해%",
  };
  const SUBSTAT_KEYS = Object.keys(SUBSTAT_LABELS);

  const SET_OPTIONS = ["하늘 경계가 드러난 밤", "오프셋"];
  const OFFSET_ICON = "💬"; // 오프셋(및 미장착 '기타') 아이콘
  const SET_ICONS = {
    "하늘 경계가 드러난 밤": "data/imgs/artifacts/night.png",
    "오프셋": OFFSET_ICON,
  };

  // "하늘 경계가 드러난 밤" 세트만 개별 이름으로 인식한다 (세트 하나당 이름 5개 고정이라 유지보수 거의 없음).
  // 이 사전에 없는 이름은 전부 "오프셋"으로 분류되고, 부위는 주스탯 종류로 판별한다 (app.js의 classifySlotFromMainStat).
  const NIGHT_SET_PIECE_NAMES = {
    "진실 갈망의 꽃": "flower",
    "깊은 죄의 깃털": "feather",
    "계시의 종": "sands",
    "넘치는 술잔": "goblet",
    "영겁의 왕관": "circlet",
  };

  // 붙여넣기 텍스트의 부옵션 이름 → {flat, pct} 키. 값에 %가 붙어있는지로 flat/pct를 가른다.
  const SUBSTAT_NAME_TO_KEY = {
    "HP": { flat: "hp", pct: "hp_" },
    "공격력": { flat: "atk", pct: "atk_" },
    "방어력": { flat: "def", pct: "def_" },
    "원소 마스터리": { flat: "em", pct: "em" },
    "원소 충전 효율": { flat: "er_", pct: "er_" },
    "치명타 확률": { flat: "critRate_", pct: "critRate_" },
    "치명타 피해": { flat: "critDMG_", pct: "critDMG_" },
  };

  // 캐릭터 레지스트리 — 나중에 캐릭터를 추가하려면 이 배열에 객체 하나만 더 넣으면 됨.
  // 캐릭터 레벨(돌파 단계) 선택지 — 순서대로 드롭다운에 표시됨.
  const CHAR_LEVEL_OPTIONS = ["80/80", "80/90", "90", "95", "100"];

  // atkByLevel: CHAR_LEVEL_OPTIONS의 각 단계에서 기초 공격력. charBaseCritDMG는 최대 돌파 이후로는
  // 레벨과 무관하게 고정이라 레벨별 테이블 없이 하나만 둠. weaponBase*는 장착 무기 기초스탯(레벨 90) 기준.
  const CHARACTERS = [
    {
      name: "플린스",
      icon: "data/imgs/characters/flins.png",
      atkByLevel: { "80/80": 310, "80/90": 326, "90": 352, "95": 391, "100": 431 },
      charBaseCritDMG: 88.4,
      weaponBaseATK: 674,
      weaponBaseCritRate: 22.1,
    },
  ];
  const DEFAULT_CHAR_LEVEL = "95";
  const UNIVERSAL_BASE_CRIT_RATE = 5; // 모든 캐릭터 공통 치확 기본값
  const OTHER_LOCATION = "기타";
  const LOCATION_OPTIONS = [...CHARACTERS.map(c => c.name), OTHER_LOCATION];
  function getCharacter(name){ return CHARACTERS.find(c => c.name === name) || CHARACTERS[0] || null; }
  // 장착 캐릭터 드롭다운/뱃지에 쓰는 아이콘. '기타'는 오프셋과 동일한 아이콘을 씀.
  function getLocationIcon(name){
    if (name === OTHER_LOCATION) return OFFSET_ICON;
    const c = getCharacter(name);
    return c ? c.icon : OFFSET_ICON;
  }

  // 풀강(+20) 5성 성유물은 부위별 주스탯이 사실상 고정값이라 입력받지 않고 바로 계산한다.
  const FIXED_MAIN_STATS = {
    flower: { key: "hp", value: 4780, label: "HP" },
    feather: { key: "atk", value: 311, label: "공격력" },
    sands: { key: "atk_", value: 46.6, label: "공격력" },
    goblet: { key: "atk_", value: 46.6, label: "공격력" },
    circlet: { key: "critDMG_", value: 62.2, label: "치명타 피해" },
  };

  // 5성 성유물 부옵션 1롤 당 값 (4단계 중 균등 랜덤 — 공개 참고치)
  const ROLL_TABLE = {
    critRate_: [2.72, 3.11, 3.50, 3.89],
    critDMG_: [5.44, 6.22, 7.00, 7.77],
  };
  // 재구축(계몽의 먼지) 부위별 소모량
  const DUST_COST = { flower: 1, feather: 1, sands: 2, goblet: 2, circlet: 2 };
