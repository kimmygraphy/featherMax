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
  var CHARACTERS = [
    {
      name: "플린스",
      icon: "data/imgs/characters/flins.png",
      atkByLevel: { "80/80": 310, "80/90": 326, "90": 352, "95": 391, "100": 431 },
      charBaseCritDMG: 88.4,
      weaponBaseATK: 674,
      weaponBaseCritRate: 22.1,
    },
  ];
  var DEFAULT_CHAR_LEVEL = "90";
  var UNIVERSAL_BASE_CRIT_RATE = 5; // 모든 캐릭터 공통 치확 기본값
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
    critRate_: [2.72, 3.11, 3.50, 3.89],
    critDMG_: [5.44, 6.22, 7.00, 7.77],
    atk_: [4.08, 4.66, 5.25, 5.83],
  };
  // 재구축(계몽의 먼지) 부위별 소모량
  var DUST_COST = { flower: 1, feather: 1, sands: 2, goblet: 2, circlet: 2 };
