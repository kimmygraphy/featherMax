// data.js — 성유물/캐릭터 고정 데이터. 캐릭터를 추가하려면 CHARACTERS 배열에 객체를 더 넣으면 됨.

  var SLOTS = [
    { key: "flower", label: "꽃", icon: "data/imgs/artifacts/flower.png" },
    { key: "feather", label: "깃털", icon: "data/imgs/artifacts/feather.png" },
    { key: "sands", label: "시계", icon: "data/imgs/artifacts/sands.png" },
    { key: "goblet", label: "잔", icon: "data/imgs/artifacts/goblet.png" },
    { key: "circlet", label: "모자", icon: "data/imgs/artifacts/circlet.png" },
  ];
  var SLOT_MAP = Object.fromEntries(SLOTS.map(s => [s.key, s]));

  var SUBSTAT_LABELS = {
    hp: "HP", hp_: "HP%", atk: "공격력", atk_: "공격력%",
    def: "방어력", def_: "방어력%", em: "원소 마스터리",
    er_: "원소 충전 효율", critRate_: "치명타 확률", critDMG_: "치명타 피해",
  };
  var SUBSTAT_KEYS = Object.keys(SUBSTAT_LABELS);

  // 옵티마이저 JSON의 키 → 내부 키 매핑. 같으면 생략.
  var OPTIMIZER_KEY_MAP = {
    eleMas: "em",
    enerRech_: "er_",
  };
  function normalizeStatKey(k){ return OPTIMIZER_KEY_MAP[k] || k; }

  // 옵티마이저 slotKey 매핑 (plume → feather)
  var OPTIMIZER_SLOT_MAP = { plume: "feather" };
  function normalizeSlotKey(k){ return OPTIMIZER_SLOT_MAP[k] || k; }

  var SET_OPTIONS = ["하늘 경계가 드러난 밤", "오프셋"];
  var OFFSET_ICON = "💬"; // 오프셋(및 미장착 '기타') 아이콘
  var SET_ICONS = {
    "하늘 경계가 드러난 밤": "data/imgs/artifacts/night.png",
    "오프셋": OFFSET_ICON,
  };

  // "하늘 경계가 드러난 밤" 세트만 개별 이름으로 인식한다 (세트 하나당 이름 5개 고정이라 유지보수 거의 없음).
  // 이 사전에 없는 이름은 전부 "오프셋"으로 분류되고, 부위는 주스탯 종류로 판별한다 (app.js의 classifySlotFromMainStat).
  var NIGHT_SET_PIECE_NAMES = {
    "진실 갈망의 꽃": "flower",
    "깊은 죄의 깃털": "feather",
    "계시의 종": "sands",
    "눈 덮인 고향의 최후": "sands",
    "넘치는 술잔": "goblet",
    "영겁의 왕관": "circlet",
  };

  // 붙여넣기 텍스트의 부옵션 이름 → {flat, pct} 키. 값에 %가 붙어있는지로 flat/pct를 가른다.
  var SUBSTAT_NAME_TO_KEY = {
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
  var CHAR_LEVEL_OPTIONS = ["80/80", "80/90", "90", "95", "100"];

  // atkByLevel: CHAR_LEVEL_OPTIONS의 각 단계에서 기초 공격력. charBaseCritDMG는 최대 돌파 이후로는
  // 레벨과 무관하게 고정이라 레벨별 테이블 없이 하나만 둠. weaponBase*는 장착 무기 기초스탯(레벨 90) 기준.
  // weaponType: 장착 가능 무기군. ascCritRateByLevel / ascCritDMGByLevel: 돌파 스탯(공통 기본치 5% / 50% 제외).
  // 수치 출처: genshin-db (레벨별 공식 성장치). defaultWeapon: WEAPONS의 key.
  var CHARACTERS = [
    {
      name: "플린스", key: "Flins", icon: "data/imgs/characters/flins.png", weaponType: "polearm",
      atkByLevel: { "80/80": 310.2, "80/90": 326.9, "90": 351.6, "95": 391.1, "100": 430.7 },
      ascCritDMGByLevel: { "80/80": 28.8, "80/90": 38.4, "90": 38.4, "95": 38.4, "100": 38.4 },
      defaultWeapon: "BloodsoakedRuins",
    },
    {
      name: "산드로네", key: "Sandrone", icon: "data/imgs/characters/sandrone.png", weaponType: "claymore",
      atkByLevel: { "80/80": 301.8, "80/90": 318.0, "90": 342.0, "95": 380.5, "100": 419.0 },
      ascCritRateByLevel: { "80/80": 14.4, "80/90": 19.2, "90": 19.2, "95": 19.2, "100": 19.2 },
      defaultWeapon: "ATeaspoonofTranscendence",
    },
    {
      name: "오데트", key: "Odette", icon: "data/imgs/characters/odette.png", weaponType: "sword",
      atkByLevel: { "80/80": 295.4, "80/90": 311.3, "90": 334.8, "95": 372.5, "100": 410.2 },
      ascCritDMGByLevel: { "80/80": 28.8, "80/90": 38.4, "90": 38.4, "95": 38.4, "100": 38.4 },
      defaultWeapon: "WhitelakeFrostfeather",
    },
  ];

  var WEAPON_TYPE_LABELS = { polearm: "장병기", claymore: "양손검", sword: "한손검" };
  // 90레벨 기준 4·5성 무기. passive: 조건 없이 상시 적용되는 스탯만 (재련 1~5 순서).
  //   atkPerER / atkPerERMax: 예초의 번개처럼 "원충 100% 초과분 × n% 만큼 공격력%(최대 m%)"인 경우.
  // 출처: genshin-db. 체력·원마 비례 공격력(호마, 반암결록, 적사 등)은 이 앱이 체력·원마를 계산하지 않아 미반영.
  var WEAPONS = [
    {"key": "BeaconoftheReedSea", "name": "갈대 바다의 등대", "type": "claymore", "rarity": 5, "baseATK": 608, "sub": {"key": "critRate_", "value": 33.1}},
    {"key": "WolfsGravestone", "name": "늑대의 말로", "type": "claymore", "rarity": 5, "baseATK": 608, "sub": {"key": "atk_", "value": 49.6}, "passive": {"atk_": [20, 25, 30, 35, 40]}},
    {"key": "GestoftheMightyWolf", "name": "늑대의 무용담", "type": "claymore", "rarity": 5, "baseATK": 608, "sub": {"key": "critRate_", "value": 33.1}},
    {"key": "TheUnforged", "name": "무공의 검", "type": "claymore", "rarity": 5, "baseATK": 608, "sub": {"key": "atk_", "value": 49.6}},
    {"key": "FangoftheMountainKing", "name": "산왕의 엄니", "type": "claymore", "rarity": 5, "baseATK": 741, "sub": {"key": "critRate_", "value": 11}},
    {"key": "SongofBrokenPines", "name": "송뢰가 울릴 무렵", "type": "claymore", "rarity": 5, "baseATK": 741, "sub": {"key": "physical_dmg_", "value": 20.7}, "passive": {"atk_": [16, 20, 24, 28, 32]}},
    {"key": "RedhornStonethresher", "name": "쇄석의 붉은 뿔", "type": "claymore", "rarity": 5, "baseATK": 542, "sub": {"key": "critDMG_", "value": 88.2}},
    {"key": "SkywardPride", "name": "천공의 긍지", "type": "claymore", "rarity": 5, "baseATK": 674, "sub": {"key": "er_", "value": 36.8}},
    {"key": "ATeaspoonofTranscendence", "name": "초월의 열쇠", "type": "claymore", "rarity": 5, "baseATK": 674, "sub": {"key": "critDMG_", "value": 44.1}, "passive": {"atk_": [28, 35, 42, 49, 56]}},
    {"key": "AThousandBlazingSuns", "name": "타오르는 천 개의 태양", "type": "claymore", "rarity": 5, "baseATK": 741, "sub": {"key": "critRate_", "value": 11}},
    {"key": "Verdict", "name": "판정", "type": "claymore", "rarity": 5, "baseATK": 674, "sub": {"key": "critRate_", "value": 22.1}, "passive": {"atk_": [20, 25, 30, 35, 40]}},
    {"key": "UltimateOverlordsMegaMagicSword", "name": "「슈퍼 울트라 패왕 마검」", "type": "claymore", "rarity": 4, "baseATK": 565, "sub": {"key": "er_", "value": 30.6}, "passive": {"atk_": [12, 15, 18, 21, 24]}},
    {"key": "PrototypeArchaic", "name": "고화 프로토타입", "type": "claymore", "rarity": 4, "baseATK": 565, "sub": {"key": "atk_", "value": 27.6}},
    {"key": "BladeofAtonement", "name": "구원의 대검", "type": "claymore", "rarity": 4, "baseATK": 565, "sub": {"key": "atk_", "value": 27.6}},
    {"key": "MailedFlower", "name": "꽃 장식 대검", "type": "claymore", "rarity": 4, "baseATK": 565, "sub": {"key": "em", "value": 110.3}},
    {"key": "EarthShaker", "name": "대지를 울리는 자", "type": "claymore", "rarity": 4, "baseATK": 565, "sub": {"key": "atk_", "value": 27.6}},
    {"key": "TalkingStick", "name": "대화봉", "type": "claymore", "rarity": 4, "baseATK": 565, "sub": {"key": "critRate_", "value": 18.4}},
    {"key": "MasterKey", "name": "만능 열쇠", "type": "claymore", "rarity": 4, "baseATK": 454, "sub": {"key": "er_", "value": 61.3}},
    {"key": "MakhairaAquamarine", "name": "물빛 마카이라", "type": "claymore", "rarity": 4, "baseATK": 510, "sub": {"key": "em", "value": 165.4}},
    {"key": "Whiteblind", "name": "백영검", "type": "claymore", "rarity": 4, "baseATK": 510, "sub": {"key": "def_", "value": 51.7}},
    {"key": "FlameForgedInsight", "name": "불로 벼린 지혜", "type": "claymore", "rarity": 4, "baseATK": 510, "sub": {"key": "em", "value": 165.4}},
    {"key": "Rainslasher", "name": "빗물 베기", "type": "claymore", "rarity": 4, "baseATK": 510, "sub": {"key": "em", "value": 165.4}},
    {"key": "SnowTombedStarsilver", "name": "설장의 성은", "type": "claymore", "rarity": 4, "baseATK": 565, "sub": {"key": "physical_dmg_", "value": 34.5}},
    {"key": "FruitfulHook", "name": "수확의 갈고리", "type": "claymore", "rarity": 4, "baseATK": 565, "sub": {"key": "atk_", "value": 27.6}},
    {"key": "ForestRegalia", "name": "숲의 리게일리어", "type": "claymore", "rarity": 4, "baseATK": 565, "sub": {"key": "er_", "value": 30.6}},
    {"key": "TheBell", "name": "시간의 검", "type": "claymore", "rarity": 4, "baseATK": 510, "sub": {"key": "hp_", "value": 41.3}},
    {"key": "Akuoumaru", "name": "아쿠오마루", "type": "claymore", "rarity": 4, "baseATK": 510, "sub": {"key": "atk_", "value": 41.3}},
    {"key": "RoyalGreatsword", "name": "왕실의 대검", "type": "claymore", "rarity": 4, "baseATK": 565, "sub": {"key": "atk_", "value": 27.6}},
    {"key": "SerpentSpine", "name": "이무기 검", "type": "claymore", "rarity": 4, "baseATK": 510, "sub": {"key": "critRate_", "value": 27.6}},
    {"key": "SacrificialGreatsword", "name": "제례 대검", "type": "claymore", "rarity": 4, "baseATK": 565, "sub": {"key": "er_", "value": 30.6}},
    {"key": "LuxuriousSeaLord", "name": "진주를 문 해황", "type": "claymore", "rarity": 4, "baseATK": 454, "sub": {"key": "atk_", "value": 55.1}},
    {"key": "LithicBlade", "name": "천암고검", "type": "claymore", "rarity": 4, "baseATK": 510, "sub": {"key": "atk_", "value": 41.3}},
    {"key": "KatsuragikiriNagamasa", "name": "카츠라기를 벤 나가마사", "type": "claymore", "rarity": 4, "baseATK": 510, "sub": {"key": "er_", "value": 45.9}},
    {"key": "TidalShadow", "name": "파도 그림자 대검", "type": "claymore", "rarity": 4, "baseATK": 510, "sub": {"key": "atk_", "value": 41.3}},
    {"key": "FavoniusGreatsword", "name": "페보니우스 대검", "type": "claymore", "rarity": 4, "baseATK": 454, "sub": {"key": "er_", "value": 61.3}},
    {"key": "ForgedbytheGoldenMelody", "name": "황금빛 선율", "type": "claymore", "rarity": 4, "baseATK": 510, "sub": {"key": "critRate_", "value": 27.6}},
    {"key": "PortablePowerSaw", "name": "휴대용 체인톱", "type": "claymore", "rarity": 4, "baseATK": 454, "sub": {"key": "hp_", "value": 55.1}},
    {"key": "BlackcliffSlasher", "name": "흑암참도", "type": "claymore", "rarity": 4, "baseATK": 510, "sub": {"key": "critDMG_", "value": 55.1}},
    {"key": "VortexVanquisher", "name": "관홍의 창", "type": "polearm", "rarity": 5, "baseATK": 608, "sub": {"key": "atk_", "value": 49.6}},
    {"key": "LumidouceElegy", "name": "등방울꽃의 애가", "type": "polearm", "rarity": 5, "baseATK": 608, "sub": {"key": "critRate_", "value": 33.1}, "passive": {"atk_": [15, 19, 23, 27, 31]}},
    {"key": "SymphonistofScents", "name": "맛의 지휘자", "type": "polearm", "rarity": 5, "baseATK": 608, "sub": {"key": "critDMG_", "value": 66.2}, "passive": {"atk_": [12, 15, 18, 21, 24]}},
    {"key": "CrimsonMoonsSemblance", "name": "붉은 달의 형상", "type": "polearm", "rarity": 5, "baseATK": 674, "sub": {"key": "critRate_", "value": 22.1}},
    {"key": "CalamityQueller", "name": "식재", "type": "polearm", "rarity": 5, "baseATK": 741, "sub": {"key": "atk_", "value": 16.5}},
    {"key": "EngulfingLightning", "name": "예초의 번개", "type": "polearm", "rarity": 5, "baseATK": 608, "sub": {"key": "er_", "value": 55.1}, "passive": {"atkPerER": [28, 35, 42, 49, 56], "atkPerERMax": [80, 90, 100, 110, 120]}},
    {"key": "DisasterandRemorse", "name": "재앙", "type": "polearm", "rarity": 5, "baseATK": 674, "sub": {"key": "critRate_", "value": 22.1}},
    {"key": "StaffoftheScarletSands", "name": "적색 사막의 지팡이", "type": "polearm", "rarity": 5, "baseATK": 542, "sub": {"key": "critRate_", "value": 44.1}},
    {"key": "SkywardSpine", "name": "천공의 마루", "type": "polearm", "rarity": 5, "baseATK": 674, "sub": {"key": "er_", "value": 36.8}, "passive": {"critRate_": [8, 10, 12, 14, 16]}},
    {"key": "FracturedHalo", "name": "파멸의 빛고리", "type": "polearm", "rarity": 5, "baseATK": 608, "sub": {"key": "critDMG_", "value": 66.2}},
    {"key": "BloodsoakedRuins", "name": "피로 물든 성", "type": "polearm", "rarity": 5, "baseATK": 674, "sub": {"key": "critRate_", "value": 22.1}},
    {"key": "StaffofHoma", "name": "호마의 지팡이", "type": "polearm", "rarity": 5, "baseATK": 608, "sub": {"key": "critDMG_", "value": 66.2}},
    {"key": "PrimordialJadeWingedSpear", "name": "화박연", "type": "polearm", "rarity": 5, "baseATK": 674, "sub": {"key": "critRate_", "value": 22.1}},
    {"key": "TheCatch", "name": "「어획」", "type": "polearm", "rarity": 4, "baseATK": 510, "sub": {"key": "er_", "value": 45.9}},
    {"key": "Deathmatch", "name": "결투의 창", "type": "polearm", "rarity": 4, "baseATK": 454, "sub": {"key": "critRate_", "value": 36.8}},
    {"key": "RightfulReward", "name": "공의의 보상", "type": "polearm", "rarity": 4, "baseATK": 565, "sub": {"key": "hp_", "value": 27.6}},
    {"key": "MissiveWindspear", "name": "날카로운 바람의 서신", "type": "polearm", "rarity": 4, "baseATK": 510, "sub": {"key": "atk_", "value": 41.3}},
    {"key": "Moonpiercer", "name": "달을 꿰뚫는 화살", "type": "polearm", "rarity": 4, "baseATK": 565, "sub": {"key": "em", "value": 110.3}},
    {"key": "FootprintoftheRainbow", "name": "무지개의 행적", "type": "polearm", "rarity": 4, "baseATK": 510, "sub": {"key": "def_", "value": 51.7}},
    {"key": "PrototypeStarglitter", "name": "별의 낫 프로토타입", "type": "polearm", "rarity": 4, "baseATK": 510, "sub": {"key": "er_", "value": 45.9}},
    {"key": "MountainBracingBolt", "name": "산을 고정하는 못", "type": "polearm", "rarity": 4, "baseATK": 565, "sub": {"key": "er_", "value": 30.6}},
    {"key": "Frostbreath", "name": "서리 숨결", "type": "polearm", "rarity": 4, "baseATK": 510, "sub": {"key": "er_", "value": 45.9}},
    {"key": "SongoftheVigil", "name": "수호의 노래", "type": "polearm", "rarity": 4, "baseATK": 565, "sub": {"key": "em", "value": 110.3}},
    {"key": "TamayurateinoOhanashi", "name": "쉼터의 이야기꾼", "type": "polearm", "rarity": 4, "baseATK": 565, "sub": {"key": "er_", "value": 30.6}},
    {"key": "SacrificersStaff", "name": "신성한 제사의 지팡이", "type": "polearm", "rarity": 4, "baseATK": 620, "sub": {"key": "critRate_", "value": 9.2}},
    {"key": "RoyalSpear", "name": "왕실의 장창", "type": "polearm", "rarity": 4, "baseATK": 565, "sub": {"key": "atk_", "value": 27.6}},
    {"key": "DragonspineSpear", "name": "용의 척추", "type": "polearm", "rarity": 4, "baseATK": 454, "sub": {"key": "physical_dmg_", "value": 69}},
    {"key": "DragonsBane", "name": "용학살창", "type": "polearm", "rarity": 4, "baseATK": 454, "sub": {"key": "em", "value": 220.5}},
    {"key": "DialoguesoftheDesertSages", "name": "위대한 사막 현자의 대답", "type": "polearm", "rarity": 4, "baseATK": 510, "sub": {"key": "hp_", "value": 41.3}},
    {"key": "CrescentPike", "name": "유월창", "type": "polearm", "rarity": 4, "baseATK": 565, "sub": {"key": "physical_dmg_", "value": 34.5}},
    {"key": "ProspectorsShovel", "name": "채굴의 삽", "type": "polearm", "rarity": 4, "baseATK": 510, "sub": {"key": "atk_", "value": 41.3}},
    {"key": "LithicSpear", "name": "천암장창", "type": "polearm", "rarity": 4, "baseATK": 565, "sub": {"key": "atk_", "value": 27.6}},
    {"key": "KitainCrossSpear", "name": "키타인 십자창", "type": "polearm", "rarity": 4, "baseATK": 565, "sub": {"key": "em", "value": 110.3}},
    {"key": "ProspectorsDrill", "name": "탐사용 드릴", "type": "polearm", "rarity": 4, "baseATK": 565, "sub": {"key": "atk_", "value": 27.6}},
    {"key": "WavebreakersFin", "name": "파도 베는 지느러미", "type": "polearm", "rarity": 4, "baseATK": 620, "sub": {"key": "atk_", "value": 13.8}},
    {"key": "FavoniusLance", "name": "페보니우스 장창", "type": "polearm", "rarity": 4, "baseATK": 565, "sub": {"key": "er_", "value": 30.6}},
    {"key": "BalladoftheFjords", "name": "협만의 노래", "type": "polearm", "rarity": 4, "baseATK": 510, "sub": {"key": "critRate_", "value": 27.6}},
    {"key": "BlackcliffPole", "name": "흑암창", "type": "polearm", "rarity": 4, "baseATK": 510, "sub": {"key": "critDMG_", "value": 55.1}},
    {"key": "AthameArtis", "name": "검은 침식", "type": "sword", "rarity": 5, "baseATK": 608, "sub": {"key": "critRate_", "value": 33.1}},
    {"key": "SplendorofTranquilWaters", "name": "고요히 샘솟는 빛", "type": "sword", "rarity": 5, "baseATK": 542, "sub": {"key": "critDMG_", "value": 88.2}},
    {"key": "BeyondtheChrysalis", "name": "나비의 우화", "type": "sword", "rarity": 5, "baseATK": 674, "sub": {"key": "critDMG_", "value": 44.1}},
    {"key": "AquilaFavonia", "name": "매의 검", "type": "sword", "rarity": 5, "baseATK": 674, "sub": {"key": "physical_dmg_", "value": 41.3}, "passive": {"atk_": [20, 25, 30, 35, 40]}},
    {"key": "PeakPatrolSong", "name": "바위산을 맴도는 노래", "type": "sword", "rarity": 5, "baseATK": 542, "sub": {"key": "def_", "value": 82.7}},
    {"key": "PrimordialJadeCutter", "name": "반암결록", "type": "sword", "rarity": 5, "baseATK": 542, "sub": {"key": "critRate_", "value": 44.1}},
    {"key": "WhitelakeFrostfeather", "name": "백조의 호수", "type": "sword", "rarity": 5, "baseATK": 674, "sub": {"key": "critRate_", "value": 22.1}},
    {"key": "ExaiphanesBlade", "name": "별빛검", "type": "sword", "rarity": 5, "baseATK": 608, "sub": {"key": "critRate_", "value": 33.1}},
    {"key": "Absolution", "name": "사면", "type": "sword", "rarity": 5, "baseATK": 674, "sub": {"key": "critDMG_", "value": 44.1}, "passive": {"critDMG_": [20, 25, 30, 35, 40]}},
    {"key": "KeyofKhajNisut", "name": "성현의 열쇠", "type": "sword", "rarity": 5, "baseATK": 542, "sub": {"key": "hp_", "value": 66.2}},
    {"key": "LightbearingMoonshard", "name": "신월의 달빛", "type": "sword", "rarity": 5, "baseATK": 542, "sub": {"key": "critDMG_", "value": 88.2}},
    {"key": "MistsplitterReforged", "name": "안개를 가르는 회광", "type": "sword", "rarity": 5, "baseATK": 674, "sub": {"key": "critDMG_", "value": 44.1}},
    {"key": "FreedomSworn", "name": "오래된 자유의 서약", "type": "sword", "rarity": 5, "baseATK": 608, "sub": {"key": "em", "value": 198.5}},
    {"key": "UrakuMisugiri", "name": "우라쿠의 미스기리", "type": "sword", "rarity": 5, "baseATK": 542, "sub": {"key": "critDMG_", "value": 88.2}},
    {"key": "LightofFoliarIncision", "name": "잎을 가르는 빛", "type": "sword", "rarity": 5, "baseATK": 542, "sub": {"key": "critDMG_", "value": 88.2}, "passive": {"critRate_": [4, 5, 6, 7, 8]}},
    {"key": "SummitShaper", "name": "참봉의 칼날", "type": "sword", "rarity": 5, "baseATK": 608, "sub": {"key": "atk_", "value": 49.6}},
    {"key": "Azurelight", "name": "창백한 섬광", "type": "sword", "rarity": 5, "baseATK": 674, "sub": {"key": "critRate_", "value": 22.1}},
    {"key": "SkywardBlade", "name": "천공의 검", "type": "sword", "rarity": 5, "baseATK": 608, "sub": {"key": "er_", "value": 55.1}, "passive": {"critRate_": [4, 5, 6, 7, 8]}},
    {"key": "HaranGeppakuFutsu", "name": "하란 월백의 후츠", "type": "sword", "rarity": 5, "baseATK": 608, "sub": {"key": "critRate_", "value": 33.1}},
    {"key": "PrizedIsshinBlade", "name": "「잇신의 기술」 명검", "type": "sword", "rarity": 4, "baseATK": 510, "sub": {"key": "atk_", "value": 41.3}},
    {"key": "SwordofDescension", "name": "강림의 검", "type": "sword", "rarity": 4, "baseATK": 440, "sub": {"key": "atk_", "value": 35.2}},
    {"key": "IronSting", "name": "강철 벌침", "type": "sword", "rarity": 4, "baseATK": 510, "sub": {"key": "em", "value": 165.4}},
    {"key": "SturdyBone", "name": "견고한 골검", "type": "sword", "rarity": 4, "baseATK": 565, "sub": {"key": "atk_", "value": 27.6}},
    {"key": "SerenitysCall", "name": "고요한 휘파람", "type": "sword", "rarity": 4, "baseATK": 454, "sub": {"key": "er_", "value": 61.3}},
    {"key": "ToukabouShigure", "name": "꽃잎비", "type": "sword", "rarity": 4, "baseATK": 510, "sub": {"key": "em", "value": 165.4}},
    {"key": "WolfFang", "name": "늑대 송곳니", "type": "sword", "rarity": 4, "baseATK": 510, "sub": {"key": "critRate_", "value": 27.6}},
    {"key": "MoonweaversDawn", "name": "달을 엮는 자의 새벽빛", "type": "sword", "rarity": 4, "baseATK": 565, "sub": {"key": "atk_", "value": 27.6}},
    {"key": "TheAlleyFlash", "name": "뒷골목의 섬광", "type": "sword", "rarity": 4, "baseATK": 620, "sub": {"key": "em", "value": 55.1}},
    {"key": "TheDockhandsAssistant", "name": "뱃도랑 장검", "type": "sword", "rarity": 4, "baseATK": 510, "sub": {"key": "hp_", "value": 41.3}},
    {"key": "FesteringDesire", "name": "부식의 검", "type": "sword", "rarity": 4, "baseATK": 510, "sub": {"key": "er_", "value": 45.9}},
    {"key": "Emberwell", "name": "불꽃의 인도자", "type": "sword", "rarity": 4, "baseATK": 510, "sub": {"key": "em", "value": 165.4}},
    {"key": "NewBough", "name": "새순", "type": "sword", "rarity": 4, "baseATK": 510, "sub": {"key": "critDMG_", "value": 55.1}},
    {"key": "SwordofNarzissenkreuz", "name": "수선화 십자검", "type": "sword", "rarity": 4, "baseATK": 510, "sub": {"key": "atk_", "value": 41.3}},
    {"key": "AmenomaKageuchi", "name": "아메노마 카게우치가타나", "type": "sword", "rarity": 4, "baseATK": 454, "sub": {"key": "atk_", "value": 55.1}},
    {"key": "CalamityofEshu", "name": "에슈의 재앙", "type": "sword", "rarity": 4, "baseATK": 565, "sub": {"key": "atk_", "value": 27.6}},
    {"key": "FluteofEzpitzal", "name": "에스피찰의 피리", "type": "sword", "rarity": 4, "baseATK": 454, "sub": {"key": "def_", "value": 69}},
    {"key": "RoyalLongsword", "name": "왕실의 장검", "type": "sword", "rarity": 4, "baseATK": 510, "sub": {"key": "atk_", "value": 41.3}},
    {"key": "LionsRoar", "name": "용의 포효", "type": "sword", "rarity": 4, "baseATK": 510, "sub": {"key": "atk_", "value": 41.3}},
    {"key": "SapwoodBlade", "name": "원목 검", "type": "sword", "rarity": 4, "baseATK": 565, "sub": {"key": "er_", "value": 30.6}},
    {"key": "SilverLight", "name": "은강검", "type": "sword", "rarity": 4, "baseATK": 510, "sub": {"key": "atk_", "value": 41.3}},
    {"key": "HereticsMoltenBlade", "name": "이단을 가르는 불꽃", "type": "sword", "rarity": 4, "baseATK": 510, "sub": {"key": "critRate_", "value": 27.6}},
    {"key": "FleuveCendreFerryman", "name": "잿빛의 강 뱃사공", "type": "sword", "rarity": 4, "baseATK": 510, "sub": {"key": "er_", "value": 45.9}},
    {"key": "SacrificialSword", "name": "제례검", "type": "sword", "rarity": 4, "baseATK": 454, "sub": {"key": "er_", "value": 61.3}},
    {"key": "CinnabarSpindle", "name": "진사의 방추", "type": "sword", "rarity": 4, "baseATK": 454, "sub": {"key": "def_", "value": 69}},
    {"key": "PrototypeRancour", "name": "참암 프로토타입", "type": "sword", "rarity": 4, "baseATK": 565, "sub": {"key": "physical_dmg_", "value": 34.5}},
    {"key": "TheBlackSword", "name": "칠흑검", "type": "sword", "rarity": 4, "baseATK": 510, "sub": {"key": "critRate_", "value": 27.6}},
    {"key": "KagotsurubeIsshin", "name": "카고츠루베 잇신", "type": "sword", "rarity": 4, "baseATK": 510, "sub": {"key": "atk_", "value": 41.3}},
    {"key": "XiphosMoonlight", "name": "크시포스의 달빛", "type": "sword", "rarity": 4, "baseATK": 510, "sub": {"key": "em", "value": 165.4}},
    {"key": "FavoniusSword", "name": "페보니우스 검", "type": "sword", "rarity": 4, "baseATK": 454, "sub": {"key": "er_", "value": 61.3}},
    {"key": "TheFlute", "name": "피리검", "type": "sword", "rarity": 4, "baseATK": 510, "sub": {"key": "atk_", "value": 41.3}},
    {"key": "FinaleoftheDeep", "name": "해연의 피날레", "type": "sword", "rarity": 4, "baseATK": 565, "sub": {"key": "atk_", "value": 27.6}},
    {"key": "BlackcliffLongsword", "name": "흑암 장검", "type": "sword", "rarity": 4, "baseATK": 565, "sub": {"key": "critDMG_", "value": 36.8}},
  ];
  var WEAPON_MAP = Object.fromEntries(WEAPONS.map(w => [w.key, w]));

  // 캐릭터 + 무기(+재련)의 기본 스탯. 성유물 합계는 여기에 더한다.
  function getCharBaseStats(char, level, weaponKey, refine){
    const lv = char.atkByLevel[level] != null ? level : Object.keys(char.atkByLevel)[0];
    const w = WEAPON_MAP[weaponKey] || WEAPON_MAP[char.defaultWeapon];
    const r = Math.min(5, Math.max(1, refine || 1)) - 1;
    const p = (w && w.passive) || {};
    const pick = k => (p[k] ? p[k][r] : 0) + (w && w.sub.key === k ? w.sub.value : 0);
    return {
      weapon: w, refine: r + 1,
      baseATKSum: char.atkByLevel[lv] + (w ? w.baseATK : 0),
      atkPct: pick("atk_"),
      critRate: UNIVERSAL_BASE_CRIT_RATE + ((char.ascCritRateByLevel || {})[lv] || 0) + pick("critRate_"),
      critDMG: 50 + ((char.ascCritDMGByLevel || {})[lv] || 0) + pick("critDMG_"),
      er: UNIVERSAL_BASE_ER + pick("er_"),
      atkPerER: p.atkPerER ? p.atkPerER[r] : 0,
      atkPerERMax: p.atkPerERMax ? p.atkPerERMax[r] : 0,
    };
  }
  // 최종 공격력% (예초의 번개처럼 원충에 비례하는 공격력%도 포함)
  function totalAtkPct(base, artifactAtkPct, finalER){
    const fromER = base.atkPerER ? Math.min(base.atkPerERMax, base.atkPerER / 100 * Math.max(0, finalER - 100)) : 0;
    return base.atkPct + artifactAtkPct + fromER;
  }

  var DEFAULT_CHAR_LEVEL = "90";
  var UNIVERSAL_BASE_CRIT_RATE = 5; // 모든 캐릭터 공통 치확 기본값
  var UNIVERSAL_BASE_ER = 100;       // 모든 캐릭터 공통 원충 기본값
  var OTHER_LOCATION = "기타";
  var LOCATION_OPTIONS = [...CHARACTERS.map(c => c.name), OTHER_LOCATION];
  function getCharacter(name){ return CHARACTERS.find(c => c.name === name) || CHARACTERS[0] || null; }
  // 장착 캐릭터 드롭다운/뱃지에 쓰는 아이콘. '기타'는 오프셋과 동일한 아이콘을 씀.
  function getLocationIcon(name){
    if (name === OTHER_LOCATION) return OFFSET_ICON;
    const c = getCharacter(name);
    return c ? c.icon : OFFSET_ICON;
  }

  // 풀강(+20) 5성 성유물은 부위별 주스탯이 사실상 고정값이라 입력받지 않고 바로 계산한다.
  // 모자(circlet)만 치피/치확 중 선택 가능 → CIRCLET_MAIN_OPTIONS 참고.
  var FIXED_MAIN_STATS = {
    flower: { key: "hp", value: 4780, label: "HP" },
    feather: { key: "atk", value: 311, label: "공격력" },
    sands: { key: "atk_", value: 46.6, label: "공격력" },
    goblet: { key: "atk_", value: 46.6, label: "공격력" },
    circlet: { key: "critDMG_", value: 62.2, label: "치명타 피해" },
  };
  var CIRCLET_MAIN_OPTIONS = [
    { key: "critDMG_", value: 62.2, label: "치명타 피해" },
    { key: "critRate_", value: 31.1, label: "치명타 확률" },
  ];

  // 5성 +20 주옵 수치 (모든 주옵 종류). JSON/호요랩 가져오기는 부위와 무관하게 이 표에서 값을 찾는다.
  var MAIN_STAT_VALUES_20 = {
    hp: 4780, atk: 311, hp_: 46.6, atk_: 46.6, def_: 58.3, em: 186.5, er_: 51.8,
    critRate_: 31.1, critDMG_: 62.2, heal_: 35.9,
    physical_dmg_: 58.3, anemo_dmg_: 46.6, geo_dmg_: 46.6, electro_dmg_: 46.6,
    hydro_dmg_: 46.6, pyro_dmg_: 46.6, cryo_dmg_: 46.6, dendro_dmg_: 46.6,
  };
  var MAIN_STAT_LABELS = Object.assign({}, SUBSTAT_LABELS, {
    heal_: "치유 보너스",
    physical_dmg_: "물리 피해 보너스", anemo_dmg_: "바람 원소 피해 보너스", geo_dmg_: "바위 원소 피해 보너스",
    electro_dmg_: "번개 원소 피해 보너스", hydro_dmg_: "물 원소 피해 보너스", pyro_dmg_: "불 원소 피해 보너스",
    cryo_dmg_: "얼음 원소 피해 보너스", dendro_dmg_: "풀 원소 피해 보너스",
  });
  function mainStatLabel(key){ return MAIN_STAT_LABELS[key] || key || "—"; }

  // 수동 등록 폼에서 부위별로 고를 수 있는 주옵. 1개뿐인 부위는 고정 표시, 2개 이상이면 드롭다운.
  var MAIN_STAT_FORM_OPTIONS = {
    flower: ["hp"],
    feather: ["atk"],
    sands: ["atk_"],
    goblet: ["atk_", "pyro_dmg_", "hydro_dmg_", "electro_dmg_", "cryo_dmg_", "anemo_dmg_", "geo_dmg_", "dendro_dmg_",
             "physical_dmg_", "hp_", "def_", "em"],
    circlet: ["critDMG_", "critRate_"],
  };

  // 호요랩 화면의 주옵 이름 → 키 (원소/물리 피해·치유는 부옵에 없어서 따로 둠)
  var MAIN_STAT_NAME_TO_KEY = {
    "물리 피해 보너스": "physical_dmg_", "바람 원소 피해 보너스": "anemo_dmg_", "바위 원소 피해 보너스": "geo_dmg_",
    "번개 원소 피해 보너스": "electro_dmg_", "물 원소 피해 보너스": "hydro_dmg_", "불 원소 피해 보너스": "pyro_dmg_",
    "얼음 원소 피해 보너스": "cryo_dmg_", "풀 원소 피해 보너스": "dendro_dmg_", "치유 보너스": "heal_",
  };

  // 옵티마이저 영문 세트키 → 한글 세트명 매핑
  var ARTIFACT_SET_KEY_MAP = {
    ADayCarvedFromRisingWinds: "바람이 시작되는 날",
    Adventurer: "모험가",
    ArchaicPetra: "유구한 반암",
    AubadeOfMorningstarAndMoon: "샛별과 달의 여명",
    Berserker: "전투광",
    BlizzardStrayer: "얼음바람 속에서 길잃은 용사",
    BloodstainedChivalry: "피에 물든 기사도",
    BraveHeart: "용사의 마음",
    CelestialGift: "하늘의 은총",
    CrimsonWitchOfFlames: "불타오르는 화염의 마녀",
    DeepwoodMemories: "숲의 기억",
    DefendersWill: "수호자의 마음",
    DesertPavilionChronicle: "모래 위 누각의 역사",
    DisenchantmentInDeepShadow: "그림자 속 산산조각 난 꿈",
    EchoesOfAnOffering: "제사의 여운",
    EmblemOfSeveredFate: "절연의 기치",
    FinaleOfTheDeepGalleries: "깊은 회랑의 피날레",
    FlowerOfParadiseLost: "잃어버린 낙원의 꽃",
    FragmentOfHarmonicWhimsy: "조화로운 공상의 단편",
    Gambler: "노름꾼",
    GildedDreams: "도금된 꿈",
    GladiatorsFinale: "검투사의 피날레",
    GoldenTroupe: "황금 극단",
    HeartOfDepth: "몰락한 마음",
    HeartOfTheFurnace: "용광로가 빚은 심장",
    HuskOfOpulentDreams: "풍요로운 꿈의 껍데기",
    Instructor: "교관",
    Lavawalker: "불 위를 걷는 현인",
    LongNightsOath: "긴 밤의 맹세",
    LuckyDog: "행운아",
    MaidenBeloved: "사랑받는 소녀",
    MarechausseeHunter: "그림자 사냥꾼",
    MartialArtist: "무인",
    NightOfTheSkysUnveiling: "하늘 경계가 드러난 밤",
    NighttimeWhispersInTheEchoingWoods: "메아리숲의 야화",
    NoblesseOblige: "옛 왕실의 의식",
    NymphsDream: "님프의 꿈",
    ObsidianCodex: "흑요석 비전",
    OceanHuedClam: "바다에 물든 거대 조개",
    PaleFlame: "창백의 화염",
    PrayersForDestiny: "물을 모시는 자",
    PrayersForIllumination: "불을 모시는 자",
    PrayersForWisdom: "뇌명을 모시는 자",
    PrayersToSpringtime: "얼음을 모시는 자",
    ResolutionOfSojourner: "행자의 마음",
    RetracingBolide: "날아오르는 유성",
    ScarletProof: "핏빛 증표",
    Scholar: "학사",
    ScrollOfTheHeroOfCinderCity: "잿더미성 용사의 두루마리",
    ShimenawasReminiscence: "추억의 시메나와",
    SilkenMoonsSerenade: "달을 엮는 밤노래",
    SongOfDaysPast: "지난날의 노래",
    TenacityOfTheMillelith: "견고한 천암",
    TheExile: "유배자",
    ThunderingFury: "번개 같은 분노",
    Thundersoother: "뇌명을 평정한 존자",
    TinyMiracle: "기적",
    TravelingDoctor: "떠돌이 의사",
    UnfinishedReverie: "미완의 몽상",
    VermillionHereafter: "진사 왕생록",
    ViridescentVenerer: "청록색 그림자",
    VourukashasGlow: "감로빛 꽃바다",
    WanderersTroupe: "대지를 유랑하는 악단",
  };
  // 역매핑: 한글 세트명 → 영문 키
  var ARTIFACT_SET_NAME_MAP = Object.fromEntries(
    Object.entries(ARTIFACT_SET_KEY_MAP).map(([k, v]) => [v, k])
  );

  // 옵티마이저 영문 캐릭터키 → 한글 캐릭터명 매핑
  var CHARACTER_KEY_MAP = {
    Aino: "아이노",
    Albedo: "알베도",
    Alhaitham: "알하이탐",
    Aloy: "에일로이",
    Alyosha: "알료샤",
    Amber: "엠버",
    AratakiItto: "아라타키 이토",
    Arlecchino: "아를레키노",
    Baizhu: "백출",
    Barbara: "바바라",
    Beidou: "북두",
    Bennett: "베넷",
    Candace: "캔디스",
    Charlotte: "샤를로트",
    Chasca: "차스카",
    Chevreuse: "슈브르즈",
    Chiori: "치오리",
    Chongyun: "중운",
    Citlali: "시틀라리",
    Clorinde: "클로린드",
    Collei: "콜레이",
    Columbina: "콜롬비나",
    Cyno: "사이노",
    Dahlia: "달리아",
    Dehya: "데히야",
    Diluc: "다이루크",
    Diona: "디오나",
    Dori: "도리",
    Durin: "두린",
    Emilie: "에밀리",
    Escoffier: "에스코피에",
    Eula: "유라",
    Faruzan: "파루잔",
    Fischl: "피슬",
    Flins: "플린스",
    Freminet: "프레미네",
    Furina: "푸리나",
    Gaming: "가명",
    Ganyu: "감우",
    Gorou: "고로",
    HuTao: "호두",
    Iansan: "얀사",
    Ifa: "이파",
    Illuga: "일루가",
    Ineffa: "이네파",
    Jahoda: "야호다",
    Jean: "진",
    Kachina: "카치나",
    KaedeharaKazuha: "카에데하라 카즈하",
    Kaeya: "케이아",
    KamisatoAyaka: "카미사토 아야카",
    KamisatoAyato: "카미사토 아야토",
    Kaveh: "카베",
    Keqing: "각청",
    Kinich: "키니치",
    Kirara: "키라라",
    Klee: "클레",
    KujouSara: "쿠죠 사라",
    KukiShinobu: "쿠키 시노부",
    LanYan: "남연",
    Lauma: "라우마",
    Layla: "레일라",
    Linnea: "린네아",
    Lisa: "리사",
    Lohen: "로엔",
    Lynette: "리넷",
    Lyney: "리니",
    Mavuika: "마비카",
    Mika: "미카",
    Mona: "모나",
    Mualani: "말라니",
    Nahida: "나히다",
    Navia: "나비아",
    Nefer: "네페르",
    Neuvillette: "느비예트",
    Nicole: "니콜",
    Nilou: "닐루",
    Ningguang: "응광",
    Noelle: "노엘",
    Odette: "오데트",
    Ororon: "올로룬",
    Prune: "프루네",
    Qiqi: "치치",
    RaidenShogun: "라이덴 쇼군",
    Razor: "레이저",
    Rosaria: "로자리아",
    Sandrone: "산드로네",
    SangonomiyaKokomi: "산고노미야 코코미",
    Sayu: "사유",
    Sethos: "세토스",
    Shenhe: "신학",
    ShikanoinHeizou: "시카노인 헤이조",
    Sigewinne: "시그윈",
    Skirk: "스커크",
    Somnia: "Somnia",
    Sucrose: "설탕",
    Tartaglia: "타르탈리아",
    Thoma: "토마",
    Tighnari: "타이나리",
    Traveler: "루미네",
    Varesa: "바레사",
    Varka: "바르카",
    Venti: "벤티",
    Wanderer: "방랑자",
    Wriothesley: "라이오슬리",
    Xiangling: "향릉",
    Xianyun: "한운",
    Xiao: "소",
    Xilonen: "실로닌",
    Xingqiu: "행추",
    Xinyan: "신염",
    YaeMiko: "야에 미코",
    Yanfei: "연비",
    Yaoyao: "요요",
    Yelan: "야란",
    Yoimiya: "요이미야",
    YumemizukiMizuki: "유메미즈키 미즈키",
    YunJin: "운근",
    Zhongli: "종려",
    Zibai: "자백",
  };
  // 역매핑: 한글 캐릭터명 → 영문 키
  var CHARACTER_NAME_MAP = Object.fromEntries(
    Object.entries(CHARACTER_KEY_MAP).map(([k, v]) => [v, k])
  );

  // 5성 성유물 부옵션 1롤 당 값 (4단계 중 균등 랜덤 — 공개 참고치)
  var ROLL_TABLE = {
    hp: [209.13, 239.00, 268.88, 298.75],
    atk: [13.62, 15.56, 17.51, 19.45],
    def: [16.20, 18.52, 20.83, 23.15],
    hp_: [4.08, 4.66, 5.25, 5.83],
    atk_: [4.08, 4.66, 5.25, 5.83],
    def_: [5.10, 5.83, 6.56, 7.29],
    em: [16.32, 18.65, 20.98, 23.31],
    er_: [4.53, 5.18, 5.83, 6.48],
    critRate_: [2.72, 3.11, 3.50, 3.89],
    critDMG_: [5.44, 6.22, 7.00, 7.77],
  };
  // 재구축(계몽의 먼지) 부위별 소모량
  var DUST_COST = { flower: 1, feather: 1, sands: 2, goblet: 2, circlet: 2 };
