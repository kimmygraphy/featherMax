// data.js — 성유물/캐릭터 고정 데이터. 캐릭터를 추가하려면 CHARACTERS 배열에 객체를 더 넣으면 됨.

  const SLOTS = [
    { key: "flower", label: "꽃", icon: "🌸" },
    { key: "feather", label: "깃털", icon: "🪶" },
    { key: "sands", label: "시계", icon: "⏳" },
    { key: "goblet", label: "잔", icon: "🏆" },
    { key: "circlet", label: "모자", icon: "👑" },
  ];
  const SLOT_MAP = Object.fromEntries(SLOTS.map(s => [s.key, s]));

  const SUBSTAT_LABELS = {
    hp: "HP", hp_: "HP%", atk: "공격력", atk_: "공격력%",
    def: "방어력", def_: "방어력%", em: "원소 마스터리",
    er_: "원소 충전 효율%", critRate_: "치명타 확률%", critDMG_: "치명타 피해%",
  };
  const SUBSTAT_KEYS = Object.keys(SUBSTAT_LABELS);

  const SET_OPTIONS = ["하늘 경계가 드러난 밤", "오프셋"];

  // 캐릭터 레지스트리 — 나중에 캐릭터를 추가하려면 이 배열에 객체 하나만 더 넣으면 됨.
  // charBaseATK/charBaseCritDMG는 캐릭터 기초스탯(레벨 95), weaponBase*는 장착 무기 기초스탯(레벨 90) 기준.
  const CHARACTERS = [
    {
      name: "플린스",
      charBaseATK: 391,
      charBaseCritDMG: 88.4,
      weaponBaseATK: 674,
      weaponBaseCritRate: 22.1,
    },
  ];
  const UNIVERSAL_BASE_CRIT_RATE = 5; // 모든 캐릭터 공통 치확 기본값
  const OTHER_LOCATION = "기타";
  const LOCATION_OPTIONS = [...CHARACTERS.map(c => c.name), OTHER_LOCATION];
  function getCharacter(name){ return CHARACTERS.find(c => c.name === name) || CHARACTERS[0] || null; }

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
  const REFORGE_TRIALS = 3000;
