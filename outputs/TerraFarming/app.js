const STORAGE_KEY = "terrafarming-save-v4";
const GROWTH_MS = 45 * 1000;
const HOME_PLANET_ID = "home";
const SOUND_VOLUME = 2.6;

const musicTracks = {
  play: {
    src: "assets/audio/gameplay.mp3",
    title: "わん泊二日",
    source: "DOVA-SYNDROME",
    creditRequired: false
  }
};

const defaultAudioSettings = { bgmVolume: 50, sfxVolume: 50 };

const statLabels = {
  size: "大",
  sweetness: "甘",
  aroma: "香",
  vitality: "生",
  rarity: "希"
};

const cropCatalog = {
  carrot: {
    no: 1,
    name: "スターキャロット",
    desc: "酸素を増やしやすい基本作物",
    flavor: "星形の葉に朝露をためる、開拓局おすすめの入門野菜。",
    image: "assets/images/crops/star-carrot.png",
    visual: "vitality",
    stats: { size: 6, sweetness: 5, aroma: 4, vitality: 7, rarity: 1 },
    environmentYield: { oxygen: 5, water: 2, nitrogen: 1 }
  },
  tomato: {
    no: 2,
    name: "ルナトマト",
    desc: "水分を増やしやすいみずみずしい作物",
    flavor: "月明かりのようなつやを持つ、食卓が少し静かになるトマト。",
    image: "assets/images/crops/luna-tomato.png",
    visual: "aroma",
    stats: { size: 5, sweetness: 7, aroma: 8, vitality: 4, rarity: 1 },
    environmentYield: { oxygen: 2, water: 6, nitrogen: 1 }
  },
  beans: {
    no: 3,
    name: "ソイルビーンズ",
    desc: "窒素を増やしやすい土づくり作物",
    flavor: "小さな畑の土をふかふかにしてくれる、働き者の豆。",
    image: "assets/images/crops/soil-beans.png",
    visual: "rarity",
    stats: { size: 4, sweetness: 4, aroma: 3, vitality: 6, rarity: 2 },
    environmentYield: { oxygen: 2, water: 2, nitrogen: 6 }
  },
  rice: {
    no: 4,
    name: "コメットライス",
    desc: "遠い星で育つ、空気をゆっくり増やす穀物",
    flavor: "尾を引く彗星みたいに、畑に白い穂を並べる宇宙米。",
    visual: "vitality",
    stats: { size: 4, sweetness: 5, aroma: 6, vitality: 8, rarity: 2 },
    environmentYield: { oxygen: 6, water: 3, nitrogen: 2 }
  },
  potato: {
    no: 5,
    name: "クリスタポテト",
    desc: "大きな星の土から見つかる結晶いも",
    flavor: "土の中でこっそり光る、腹もちのいい開拓者向けポテト。",
    visual: "size",
    stats: { size: 8, sweetness: 4, aroma: 3, vitality: 5, rarity: 2 },
    environmentYield: { oxygen: 3, water: 4, nitrogen: 5 }
  },
  pepper: {
    no: 6,
    name: "ネビュラペッパー",
    desc: "窒素を増やしやすい、刺激的な新星野菜",
    flavor: "ひとかじりで目が覚める。市場係が箱買いしたがる香辛野菜。",
    visual: "rarity",
    stats: { size: 3, sweetness: 3, aroma: 8, vitality: 6, rarity: 3 },
    environmentYield: { oxygen: 2, water: 3, nitrogen: 8 }
  }
};

const cropDexOrder = ["carrot", "tomato", "beans", "rice", "potato", "pepper"];
const planetCatalog = {
  home: {
    id: "home",
    fallbackName: "はじまりの小惑星",
    maxPlots: 9,
    initialPlots: 4,
    unlocks: [
      { green: 20, plots: 6 },
      { green: 50, plots: 9 }
    ],
    cropFamilies: ["carrot", "tomato", "beans"],
    greenScale: 1,
    nextPlanet: "frontier",
    desc: "最初に任された小さな開拓星"
  },
  frontier: {
    id: "frontier",
    fallbackName: "外縁ファーム星",
    maxPlots: 25,
    initialPlots: 3,
    unlocks: [
      { green: 15, plots: 6 },
      { green: 30, plots: 9 },
      { green: 60, plots: 18 },
      { green: 100, plots: 25 }
    ],
    cropFamilies: ["rice", "potato", "pepper"],
    greenScale: 0.36,
    desc: "広い畑を持つ、開拓に時間のかかる新しい星"
  }
};
const baseSeed = createBaseSeed("carrot");

const stageRules = [
  { name: "緑の星", oxygen: 100, water: 90, nitrogen: 60, bonuses: { growth: 12, sale: 15, mutation: 10 } },
  { name: "草原", oxygen: 50, water: 45, nitrogen: 20, bonuses: { growth: 8, sale: 10, mutation: 5 } },
  { name: "芽吹き", oxygen: 20, water: 15, nitrogen: 0, bonuses: { growth: 5, sale: 0, mutation: 0 } },
  { name: "荒野", oxygen: 0, water: 0, nitrogen: 0, bonuses: { growth: 0, sale: 0, mutation: 0 } }
];

const missions = [
  {
    id: "first_harvest",
    title: "はじめての収穫",
    target: "作物を3個収穫する",
    reward: "テラP +6 / 食料 +8",
    isReady: (s) => s.stats.totalHarvested >= 3,
    apply: (s) => {
      s.resources.terraPoints += 6;
      s.resources.food += 8;
    }
  },
  {
    id: "green_10",
    title: "緑の足場",
    target: "開拓段階を芽吹きにする",
    reward: "畑が6区画まで解放",
    isReady: (s) => stageRank(terraStageName(s.environment)) >= stageRank("芽吹き"),
    apply: (s) => {
      s.unlockedPlots = Math.max(s.unlockedPlots, 6);
    }
  },
  {
    id: "oxygen_20",
    title: "息づく温室",
    target: "酸素を20まで増やす",
    reward: "成長速度 +8%",
    isReady: (s) => s.environment.oxygen >= 20,
    apply: (s) => {
      s.bonuses.growth += 8;
    }
  },
  {
    id: "third_generation",
    title: "第3世代の種",
    target: "第3世代以上の種を作る",
    reward: "突然変異率 +10%",
    isReady: (s) => s.seed.generation >= 3,
    apply: (s) => {
      s.bonuses.mutation += 10;
    }
  },
  {
    id: "green_25",
    title: "小さな草原",
    target: "開拓段階を草原にする",
    reward: "畑が9区画まで解放",
    isReady: (s) => stageRank(terraStageName(s.environment)) >= stageRank("草原"),
    apply: (s) => {
      s.unlockedPlots = Math.max(s.unlockedPlots, Math.min(9, currentPlanetDef().maxPlots));
    }
  }
];

const upgrades = [
  {
    id: "greenhouse",
    title: "温室ヒーター",
    desc: "作物の成長時間を短くする",
    bonusKey: "growth",
    bonusPerLevel: 6,
    baseCost: 24,
    label: "成長速度"
  },
  {
    id: "shipping",
    title: "出荷箱",
    desc: "野菜を売ったときのコインを増やす",
    bonusKey: "sale",
    bonusPerLevel: 8,
    baseCost: 30,
    label: "売却価格"
  },
  {
    id: "geneMemo",
    title: "交配マシン",
    desc: "交配が成功する確率を上げる",
    bonusKey: "breeding",
    bonusPerLevel: 10,
    baseCost: 36,
    label: "交配成功率"
  }
];

const requestClients = {
  mira: { name: "ミラさん", role: "月面食堂の店主" },
  rou: { name: "ロウさん", role: "宇宙市の仕入れ係" },
  pico: { name: "ピコ", role: "小さな配達ロボ" },
  luka: { name: "ルカ先生", role: "宇宙学校の先生" },
  nono: { name: "ノノさん", role: "酸素庭園の管理人" }
};

const coopRequests = [
  {
    id: "mira_1",
    client: "mira",
    rank: 1,
    title: "今夜の甘いシチュー",
    comment: "今夜のシチューに、ちょっと甘い野菜を入れたくてねぇ。余ってたら分けてもらえるかい？",
    need: "甘み 7以上の作物を1個",
    thanks: "ミラさんへ野菜を届けました。食堂の鍋が少しにぎやかになりました。",
    reward: { coins: 24, terraPoints: 3 },
    matches: (crop) => crop.stats.sweetness >= 7
  },
  {
    id: "mira_2",
    client: "mira",
    rank: 2,
    title: "食堂の大鍋ランチ",
    comment: "今日はお客さんが多くてねぇ。食べごたえのある野菜があると助かるんだよ。",
    need: "大きさ 9以上の作物を1個",
    thanks: "ミラさんへ大きな野菜を届けました。ランチの皿がほかほか並びました。",
    reward: { coins: 42, food: 8 },
    matches: (crop) => crop.stats.size >= 9
  },
  {
    id: "mira_3",
    client: "mira",
    rank: 3,
    title: "月祭りの特製ポトフ",
    comment: "月祭りの夜に出す特別なポトフなんだ。甘くて大きな野菜をお願いできるかい？",
    need: "甘み 10以上、かつ大きさ 10以上の作物を1個",
    thanks: "ミラさんへ特製ポトフの野菜を届けました。月祭りの厨房に湯気が上がっています。",
    reward: { coins: 80, terraPoints: 10 },
    matches: (crop) => crop.stats.sweetness >= 10 && crop.stats.size >= 10
  },
  {
    id: "rou_1",
    client: "rou",
    rank: 1,
    title: "市場の入口飾り",
    comment: "へい、いい香りの野菜を探してんだ。入口に置きゃあ、客足も変わるってもんよ！",
    need: "香り 7以上の作物を1個",
    thanks: "ロウさんへ香りのよい野菜を届けました。市場の入口がぱっと明るくなりました。",
    reward: { coins: 28, terraPoints: 2 },
    matches: (crop) => crop.stats.aroma >= 7
  },
  {
    id: "rou_2",
    client: "rou",
    rank: 2,
    title: "朝市の目玉商品",
    comment: "ちょいと珍しいやつを出したくてな。見た目で客を振り向かせてぇんだ！",
    need: "希少度 4以上の作物を1個",
    thanks: "ロウさんへ珍しい野菜を届けました。朝市の棚に人だかりができています。",
    reward: { coins: 55, terraPoints: 5 },
    matches: (crop) => crop.stats.rarity >= 4
  },
  {
    id: "rou_3",
    client: "rou",
    rank: 3,
    title: "宇宙市の看板野菜",
    comment: "こいつぁ市場の看板にする一品だ。香りも珍しさも、ビシッと決まったやつを頼むぜ！",
    need: "香り 10以上、かつ希少度 5以上の作物を1個",
    thanks: "ロウさんへ看板野菜を届けました。宇宙市の声がいつもより威勢よく響いています。",
    reward: { coins: 95, terraPoints: 12 },
    matches: (crop) => crop.stats.aroma >= 10 && crop.stats.rarity >= 5
  },
  {
    id: "pico_1",
    client: "pico",
    rank: 1,
    title: "キラキラ便",
    comment: "ピコ、キラキラヤサイ、ハイタツシタイ。ミンナ、ニコニコ、スル？",
    need: "希少度 3以上の作物を1個",
    thanks: "ピコへ野菜を預けました。ピコ、キラキラ、ブジ、ハイタツ。",
    reward: { coins: 22, terraPoints: 4 },
    matches: (crop) => crop.stats.rarity >= 3
  },
  {
    id: "pico_2",
    client: "pico",
    rank: 2,
    title: "フシギ便",
    comment: "ピコ、フツウジャナイ、ヤサイ、スキ。セダイ、ススンダヤツ、ハコビタイ。",
    need: "第2世代以上の作物を1個",
    thanks: "ピコへ次世代の野菜を預けました。ピコ、フシギ、タイセツニ、ハコンダ。",
    reward: { coins: 45, terraPoints: 7 },
    matches: (crop) => crop.generation >= 2
  },
  {
    id: "pico_3",
    client: "pico",
    rank: 3,
    title: "ミュータント特急",
    comment: "ピコ、ミュータント、ハコブ。ピコ、チョット、ワクワク、シテル。",
    need: "ミュータント名の作物、または第3世代以上かつ希少度 5以上の作物を1個",
    thanks: "ピコへ特別な野菜を預けました。ピコ、ワクワク、トマラナイ。",
    reward: { coins: 90, terraPoints: 14 },
    matches: (crop) => crop.name.includes("ミュータント") || (crop.generation >= 3 && crop.stats.rarity >= 5)
  },
  {
    id: "luka_1",
    client: "luka",
    rank: 1,
    title: "香りの授業",
    comment: "子どもたちに、野菜の香りの違いを学んでもらいたいのです。特徴のあるものをお願いできますか？",
    need: "香り 7以上の作物を1個",
    thanks: "ルカ先生へ野菜を届けました。教室にやさしい香りが広がりました。",
    reward: { terraPoints: 5, coins: 18 },
    matches: (crop) => crop.stats.aroma >= 7
  },
  {
    id: "luka_2",
    client: "luka",
    rank: 2,
    title: "成長観察ノート",
    comment: "世代を重ねた作物を観察すると、学びが深まります。第2世代以上の野菜をお願いできますか？",
    need: "第2世代以上の作物を1個",
    thanks: "ルカ先生へ観察用の野菜を届けました。子どもたちのノートが一枚増えました。",
    reward: { terraPoints: 9, coins: 36 },
    matches: (crop) => crop.generation >= 2
  },
  {
    id: "luka_3",
    client: "luka",
    rank: 3,
    title: "宇宙農業の教材",
    comment: "生命力の強い作物は、子どもたちにとって良い教材になります。大切に扱わせていただきますね。",
    need: "第3世代以上、かつ生命力 11以上の作物を1個",
    thanks: "ルカ先生へ教材用の野菜を届けました。教室の窓辺に新しい観察棚ができました。",
    reward: { terraPoints: 16, coins: 70 },
    matches: (crop) => crop.generation >= 3 && crop.stats.vitality >= 11
  },
  {
    id: "nono_1",
    client: "nono",
    rank: 1,
    title: "庭園の深呼吸",
    comment: "庭園の芽たちが、今日は少し息苦しそうなんです。空気をふやせる野菜があれば、分けていただけませんか。",
    need: "酸素を5以上増やす作物を1個",
    thanks: "ノノさんへ野菜を届けました。酸素庭園の芽たちが少し背すじを伸ばしました。",
    reward: { terraPoints: 5, coins: 18 },
    matches: (crop) => crop.environmentYield.oxygen >= 5
  },
  {
    id: "nono_2",
    client: "nono",
    rank: 2,
    title: "しおれた温室",
    comment: "温室の葉先が、少し乾いているみたいで……水分をふくんだ野菜があると助かります。",
    need: "水分を6以上増やす作物を1個",
    thanks: "ノノさんへ水分をふくんだ野菜を届けました。温室の葉先にみずみずしさが戻りました。",
    reward: { terraPoints: 8, coins: 38 },
    matches: (crop) => crop.environmentYield.water >= 6
  },
  {
    id: "nono_3",
    client: "nono",
    rank: 3,
    title: "緑の星への小さな手当て",
    comment: "この庭園が、いつか小惑星ぜんぶの呼吸につながる気がするんです。力を貸していただけますか。",
    need: "酸素 7以上、水分 5以上、生命力 10以上の作物を1個",
    thanks: "ノノさんへ特別な野菜を届けました。庭園の空気が静かに澄んでいきます。",
    reward: { terraPoints: 18, coins: 75 },
    matches: (crop) => crop.environmentYield.oxygen >= 7 && crop.environmentYield.water >= 5 && crop.stats.vitality >= 10
  }
];

const introScenes = [
  {
    kicker: "宇宙歴831年",
    text: "人類は青い星を飛び出し、暮らしの場所を宇宙へ広げていきました。\n\n大きな惑星だけでなく、名もない小惑星にも、畑と台所と笑い声が少しずつ生まれています。"
  },
  {
    kicker: "宇宙開拓局より",
    text: "あなたに託されるのは、まだ緑の少ない小さな小惑星です。\n\n野菜を育て、空気と水をふやし、誰かの暮らしに届く農作物を作ってください。"
  },
  {
    kicker: "開拓登録書",
    text: "では、これから新たな開拓を始めましょう。\n\nこちらの書類にサインをお願いします。"
  }
];

const state = loadState();
let selectedParentA = null;
let selectedParentB = null;
let audioContext = null;
let pendingSellId = null;
let activeDeliveryId = null;
let activeParentSlot = null;
let pendingDiscoveryName = null;
let bgmTimer = null;
let bgmMode = null;
let bgmAudio = null;
let introIndex = 0;

const els = {
  app: document.querySelector(".app"),
  titleScreen: document.querySelector("#titleScreen"),
  introScreen: document.querySelector("#introScreen"),
  introKicker: document.querySelector("#introKicker"),
  introText: document.querySelector("#introText"),
  introForm: document.querySelector("#introForm"),
  introNextBtn: document.querySelector("#introNextBtn"),
  playerNameInput: document.querySelector("#playerNameInput"),
  planetNameInput: document.querySelector("#planetNameInput"),
  terraStage: document.querySelector("#terraStage"),
  greenRate: document.querySelector("#greenRate"),
  greenBar: document.querySelector("#greenBar"),
  profileLabel: document.querySelector("#profileLabel"),
  oxygen: document.querySelector("#oxygen"),
  water: document.querySelector("#water"),
  nitrogen: document.querySelector("#nitrogen"),
  food: document.querySelector("#food"),
  coins: document.querySelector("#coins"),
  terraPoints: document.querySelector("#terraPoints"),
  fieldGrid: document.querySelector("#fieldGrid"),
  seedPicker: document.querySelector("#seedPicker"),
  selectedSeedLabel: document.querySelector("#selectedSeedLabel"),
  plantAllBtn: document.querySelector("#plantAllBtn"),
  harvestAllBtn: document.querySelector("#harvestAllBtn"),
  missionProgress: document.querySelector("#missionProgress"),
  missionList: document.querySelector("#missionList"),
  planetSummary: document.querySelector("#planetSummary"),
  planetList: document.querySelector("#planetList"),
  coopSummary: document.querySelector("#coopSummary"),
  coopRequestList: document.querySelector("#coopRequestList"),
  bonusSummary: document.querySelector("#bonusSummary"),
  upgradeList: document.querySelector("#upgradeList"),
  unlockSummary: document.querySelector("#unlockSummary"),
  unlockList: document.querySelector("#unlockList"),
  storageList: document.querySelector("#storageList"),
  storageCount: document.querySelector("#storageCount"),
  dexList: document.querySelector("#dexList"),
  dexCount: document.querySelector("#dexCount"),
  sellAllBtn: document.querySelector("#sellAllBtn"),
  seedName: document.querySelector("#seedName"),
  parentA: document.querySelector("#parentA"),
  parentB: document.querySelector("#parentB"),
  labPicker: document.querySelector("#labPicker"),
  labPickerTitle: document.querySelector("#labPickerTitle"),
  labPickerClose: document.querySelector("#labPickerClose"),
  labCropList: document.querySelector("#labCropList"),
  labPrediction: document.querySelector("#labPrediction"),
  breedBtn: document.querySelector("#breedBtn"),
  labResult: document.querySelector("#labResult"),
  logText: document.querySelector("#logText"),
  deliveryModal: document.querySelector("#deliveryModal"),
  deliveryTitle: document.querySelector("#deliveryTitle"),
  deliveryNote: document.querySelector("#deliveryNote"),
  deliveryCropList: document.querySelector("#deliveryCropList"),
  deliveryCloseBtn: document.querySelector("#deliveryCloseBtn"),
  settingsBtn: document.querySelector("#settingsBtn"),
  settingsModal: document.querySelector("#settingsModal"),
  settingsCloseBtn: document.querySelector("#settingsCloseBtn"),
  bgmVolumeSlider: document.querySelector("#bgmVolumeSlider"),
  bgmVolumeLabel: document.querySelector("#bgmVolumeLabel"),
  sfxVolumeSlider: document.querySelector("#sfxVolumeSlider"),
  sfxVolumeLabel: document.querySelector("#sfxVolumeLabel"),
  resetBtn: document.querySelector("#resetBtn")
};
let toastTimer = null;

function startGame() {
  if (els.app.classList.contains("started")) return;
  playStartSound();
  stopBgm();
  if (shouldShowIntro()) {
    beginIntro();
    return;
  }
  enterGameplay();
}

function shouldShowIntro() {
  return !state.profile.introSeen && Math.floor(state.environment.green) === 0;
}

function beginIntro() {
  introIndex = 0;
  els.app.classList.remove("started");
  els.app.classList.add("introing");
  renderIntro();
}

function enterGameplay() {
  els.app.classList.remove("introing");
  els.app.classList.add("started");
  setTimeout(() => startBgm("play"), 520);
}

function renderIntro() {
  const scene = introScenes[introIndex];
  const isFormScene = introIndex === introScenes.length - 1;
  els.introKicker.textContent = scene.kicker;
  els.introText.textContent = scene.text;
  els.introForm.hidden = !isFormScene;
  els.introNextBtn.hidden = isFormScene;
  if (isFormScene) {
    els.playerNameInput.value = state.profile.playerName === "開拓者" ? "" : state.profile.playerName;
    els.planetNameInput.value = state.profile.planetName === "名もなき小惑星" ? "" : state.profile.planetName;
    setTimeout(() => els.playerNameInput.focus(), 80);
  }
}

function advanceIntro() {
  if (introIndex < introScenes.length - 1) {
    introIndex += 1;
    renderIntro();
  }
}

function completeIntro() {
  const playerName = els.playerNameInput.value.trim() || "開拓者";
  const planetName = els.planetNameInput.value.trim() || "テラファーム星";
  state.profile = { playerName, planetName, introSeen: true };
  if (state.planets[HOME_PLANET_ID]) {
    state.planets[HOME_PLANET_ID].name = planetName;
  }
  saveState();
  playRewardSound();
  setLog(`はい、${playerName}さんですね。これから${planetName}の開拓をよろしくお願いします。良き宇宙ライフを。`);
  render();
  enterGameplay();
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return normalizeState(JSON.parse(saved));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return normalizeState({
    plots: Array.from({ length: planetCatalog.home.maxPlots }, (_, id) => ({ id, crop: null })),
    unlockedPlots: planetCatalog.home.initialPlots,
    selectedFamily: "carrot",
    seedBank: {
      carrot: createBaseSeed("carrot"),
      tomato: createBaseSeed("tomato"),
      beans: createBaseSeed("beans")
    },
    seed: structuredClone(baseSeed),
    storage: [],
    resources: { food: 0, coins: 0, terraPoints: 0 },
    environment: { green: 0, oxygen: 0, water: 0, nitrogen: 0 },
    stats: { totalHarvested: 0, totalBred: 0, totalSold: 0 },
    profile: { playerName: "開拓者", planetName: "名もなき小惑星", introSeen: false },
    discoveredCrops: {},
    reportedMissions: [],
    completedRequests: [],
    activePlanetId: HOME_PLANET_ID,
    unlockedPlanets: [HOME_PLANET_ID],
    plantedCrops: {},
    planets: {},
    audioSettings: structuredClone(defaultAudioSettings),
    bonuses: { growth: 0, mutation: 0, sale: 0, breeding: 0 },
    upgradeLevels: { greenhouse: 0, shipping: 0, geneMemo: 0 },
    lastSeen: Date.now()
  });
}

function createPlanetState(planetId, customName) {
  const def = planetCatalog[planetId] ?? planetCatalog.home;
  const firstFamily = def.cropFamilies[0];
  const seedBank = Object.fromEntries(def.cropFamilies.map((family) => [family, createBaseSeed(family)]));
  return {
    id: planetId,
    name: customName || def.fallbackName,
    plots: Array.from({ length: def.maxPlots }, (_, id) => ({ id, crop: null })),
    unlockedPlots: def.initialPlots,
    selectedFamily: firstFamily,
    seedBank,
    seed: structuredClone(seedBank[firstFamily]),
    environment: { green: 0, oxygen: 0, water: 0, nitrogen: 0 },
    reportedMissions: []
  };
}

function normalizePlanetState(planetId, planet = {}) {
  const def = planetCatalog[planetId] ?? planetCatalog.home;
  const base = createPlanetState(planetId, planet.name);
  const seedBank = { ...base.seedBank, ...planet.seedBank };
  const selectedFamily = seedBank[planet.selectedFamily] ? planet.selectedFamily : base.selectedFamily;
  return {
    ...base,
    ...planet,
    plots: Array.from({ length: def.maxPlots }, (_, id) => planet.plots?.[id] ?? { id, crop: null }),
    unlockedPlots: Math.min(def.maxPlots, Math.max(def.initialPlots, planet.unlockedPlots ?? base.unlockedPlots)),
    selectedFamily,
    seedBank,
    seed: planet.seed ?? seedBank[selectedFamily],
    environment: { ...base.environment, ...planet.environment },
    reportedMissions: planet.reportedMissions ?? []
  };
}

function currentPlanetDef() {
  return planetCatalog[state?.activePlanetId] ?? planetCatalog.home;
}

function currentPlanet() {
  return state.planets[state.activePlanetId];
}

function syncRootToActivePlanet(target = state) {
  const planet = target.planets[target.activePlanetId];
  if (!planet) return;
  planet.plots = target.plots;
  planet.unlockedPlots = target.unlockedPlots;
  planet.selectedFamily = target.selectedFamily;
  planet.seedBank = target.seedBank;
  planet.seed = target.seed;
  planet.environment = target.environment;
  planet.reportedMissions = target.reportedMissions;
}

function syncActivePlanetToRoot(target = state) {
  const planet = target.planets[target.activePlanetId] ?? createPlanetState(target.activePlanetId);
  target.planets[target.activePlanetId] = planet;
  target.plots = planet.plots;
  target.unlockedPlots = planet.unlockedPlots;
  target.selectedFamily = planet.selectedFamily;
  target.seedBank = planet.seedBank;
  target.seed = planet.seed;
  target.environment = planet.environment;
  target.reportedMissions = planet.reportedMissions;
}

function switchPlanet(planetId) {
  if (!state.unlockedPlanets.includes(planetId) || planetId === state.activePlanetId) return;
  syncRootToActivePlanet();
  state.activePlanetId = planetId;
  state.planets[planetId] = normalizePlanetState(planetId, state.planets[planetId]);
  syncActivePlanetToRoot();
  state.seedBank = Object.fromEntries(Object.entries(state.seedBank).map(([family, seed]) => [family, decorateSeed(seed)]));
  state.seed = decorateSeed(state.seedBank[state.selectedFamily] ?? state.seed);
  state.plots = state.plots.map((plot, id) => ({ id, crop: plot.crop ? decorateCrop(plot.crop) : null }));
  selectedParentA = null;
  selectedParentB = null;
  activeParentSlot = null;
  setLog(`${currentPlanet().name}へ移動しました。`);
  saveAndRender();
}

function normalizeState(raw) {
  const coins = raw.resources?.coins ?? raw.resources?.minerals ?? 0;
  const hasPlanetData = Boolean(raw.planets && Object.keys(raw.planets).length);
  const hasProgress = Boolean(
    raw.profile?.introSeen ||
      raw.stats?.totalHarvested ||
      raw.stats?.totalBred ||
      raw.stats?.totalSold ||
      raw.environment?.green ||
      raw.environment?.oxygen ||
      raw.environment?.water ||
      raw.environment?.nitrogen ||
      raw.resources?.coins ||
      raw.resources?.terraPoints ||
      raw.storage?.length
  );
  const activePlanetId = raw.activePlanetId ?? HOME_PLANET_ID;
  const normalized = {
    activePlanetId,
    unlockedPlanets: raw.unlockedPlanets ?? [HOME_PLANET_ID],
    planets: raw.planets ?? {},
    plots: Array.from({ length: planetCatalog.home.maxPlots }, (_, id) => raw.plots?.[id] ?? { id, crop: null }),
    unlockedPlots: raw.unlockedPlots ?? planetCatalog.home.initialPlots,
    selectedFamily: raw.selectedFamily ?? raw.seed?.family ?? "carrot",
    seedBank: { carrot: createBaseSeed("carrot"), tomato: createBaseSeed("tomato"), beans: createBaseSeed("beans"), ...raw.seedBank },
    seed: raw.seed ?? structuredClone(baseSeed),
    storage: raw.storage ?? [],
    resources: { food: 0, coins, terraPoints: 0, ...raw.resources, coins },
    environment: { green: 0, oxygen: 0, water: 0, nitrogen: 0, ...raw.environment },
    stats: { totalHarvested: 0, totalBred: 0, totalSold: 0, ...raw.stats },
    profile: {
      playerName: raw.profile?.playerName ?? "開拓者",
      planetName: raw.profile?.planetName ?? "名もなき小惑星",
      introSeen: raw.profile?.introSeen ?? hasProgress
    },
    discoveredCrops: raw.discoveredCrops ?? {},
    plantedCrops: raw.plantedCrops ?? {},
    audioSettings: { ...defaultAudioSettings, ...raw.audioSettings },
    reportedMissions: raw.reportedMissions ?? raw.completedMissions ?? [],
    completedRequests: raw.completedRequests ?? [],
    bonuses: { growth: 0, mutation: 0, sale: 0, breeding: 0, ...raw.bonuses },
    upgradeLevels: { greenhouse: 0, shipping: 0, geneMemo: 0, ...raw.upgradeLevels },
    lastSeen: raw.lastSeen ?? Date.now()
  };

  delete normalized.resources.minerals;
  delete normalized.environment.soil;
  if (!hasPlanetData) {
    normalized.planets[HOME_PLANET_ID] = {
      ...createPlanetState(HOME_PLANET_ID, normalized.profile.planetName),
      plots: normalized.plots,
      unlockedPlots: normalized.unlockedPlots,
      selectedFamily: normalized.selectedFamily,
      seedBank: normalized.seedBank,
      seed: normalized.seed,
      environment: normalized.environment,
      reportedMissions: normalized.reportedMissions
    };
  }
  Object.keys(planetCatalog).forEach((planetId) => {
    normalized.planets[planetId] = normalizePlanetState(planetId, normalized.planets[planetId]);
  });
  if (!normalized.unlockedPlanets.includes(HOME_PLANET_ID)) {
    normalized.unlockedPlanets.unshift(HOME_PLANET_ID);
  }
  if (!normalized.unlockedPlanets.includes(normalized.activePlanetId)) {
    normalized.activePlanetId = HOME_PLANET_ID;
  }
  syncActivePlanetToRoot(normalized);
  normalized.seedBank = Object.fromEntries(Object.entries(normalized.seedBank).map(([family, seed]) => [family, decorateSeed(seed)]));
  normalized.seed = decorateSeed(normalized.seedBank[normalized.selectedFamily] ?? normalized.seed);
  normalized.storage = normalized.storage.map((crop) => decorateCrop(crop));
  normalized.plots = normalized.plots.map((plot, id) => ({
    id,
    crop: plot.crop ? decorateCrop(plot.crop) : null
  }));
  normalized.storage.forEach((crop) => {
    const family = crop.family ?? "carrot";
    if (cropCatalog[family] && !normalized.discoveredCrops[family]) {
      normalized.discoveredCrops[family] = {
        name: crop.name,
        discoverer: normalized.profile.playerName,
        discoveredAt: crop.harvestedAt ?? Date.now()
      };
    }
  });
  return normalized;
}

function decorateSeed(seed) {
  const catalog = cropCatalog[seed.family] ?? cropCatalog.carrot;
  return {
    ...createBaseSeed(seed.family ?? "carrot"),
    ...seed,
    environmentYield: { ...catalog.environmentYield, ...seed.environmentYield },
    stats: { ...catalog.stats, ...seed.stats },
    visual: seed.visual ?? dominantStat(seed.stats)
  };
}

function decorateCrop(crop) {
  const catalog = cropCatalog[crop.family] ?? cropCatalog.carrot;
  return {
    ...crop,
    family: crop.family ?? "carrot",
    environmentYield: { ...catalog.environmentYield, ...crop.environmentYield },
    visual: crop.visual ?? dominantStat(crop.stats)
  };
}

function createBaseSeed(family) {
  const crop = cropCatalog[family] ?? cropCatalog.carrot;
  return {
    name: crop.name,
    family,
    generation: 1,
    visual: crop.visual,
    environmentYield: structuredClone(crop.environmentYield),
    stats: structuredClone(crop.stats)
  };
}

function cropImage(cropOrFamily) {
  const family = typeof cropOrFamily === "string" ? cropOrFamily : cropOrFamily?.family;
  return cropCatalog[family]?.image ?? null;
}

function cropImageMarkup(cropOrFamily, className = "crop-art", alt = "") {
  const image = cropImage(cropOrFamily);
  if (image) {
    return `<img class="${className}" src="${image}" alt="${alt}" loading="lazy" draggable="false" />`;
  }
  const visual = typeof cropOrFamily === "string" ? cropCatalog[cropOrFamily]?.visual : cropOrFamily?.visual;
  return `<div class="crop-icon crop-${visual ?? "vitality"} ${className}"></div>`;
}

function formatDiscoveryDate(timestamp) {
  const date = new Date(timestamp || Date.now());
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function registerCropDiscovery(crop) {
  const family = crop.family ?? "carrot";
  if (!cropCatalog[family] || state.discoveredCrops[family]) return;
  state.discoveredCrops[family] = {
    name: crop.name,
    discoverer: state.profile.playerName,
    discoveredAt: Date.now()
  };
  pendingDiscoveryName = cropCatalog[family].name;
}

function updatePlanetUnlocks() {
  const def = currentPlanetDef();
  def.unlocks.forEach((unlock) => {
    if (state.environment.green >= unlock.green) {
      state.unlockedPlots = Math.max(state.unlockedPlots, unlock.plots);
    }
  });

}

function canCompletePlanet(planetId) {
  const def = planetCatalog[planetId];
  const planet = state.planets[planetId];
  return Boolean(def?.nextPlanet && planet?.environment.green >= 100 && !state.unlockedPlanets.includes(def.nextPlanet));
}

function completePlanet(planetId) {
  if (!canCompletePlanet(planetId)) return;

  const nextPlanetId = planetCatalog[planetId].nextPlanet;
  state.unlockedPlanets.push(nextPlanetId);
  state.planets[nextPlanetId] = normalizePlanetState(nextPlanetId, state.planets[nextPlanetId]);
  playRewardSound();
  setLog(`${currentPlanet().name}の開拓を達成しました。${planetCatalog[nextPlanetId].fallbackName}への航路が開きました。`);
  saveAndRender();
}

function saveState() {
  syncRootToActivePlanet();
  state.lastSeen = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clampVolume(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function bgmVolumeValue() {
  return clampVolume(state.audioSettings?.bgmVolume ?? defaultAudioSettings.bgmVolume);
}

function sfxVolumeValue() {
  return clampVolume(state.audioSettings?.sfxVolume ?? defaultAudioSettings.sfxVolume);
}

function bgmVolumeMultiplier() {
  return bgmVolumeValue() / 100;
}

function sfxVolumeMultiplier() {
  return sfxVolumeValue() / 50;
}

function applyAudioSettings() {
  if (!state.audioSettings) {
    state.audioSettings = structuredClone(defaultAudioSettings);
  }
  state.audioSettings.bgmVolume = bgmVolumeValue();
  state.audioSettings.sfxVolume = sfxVolumeValue();
  if (els.bgmVolumeSlider) {
    els.bgmVolumeSlider.value = state.audioSettings.bgmVolume;
    els.bgmVolumeLabel.textContent = `${state.audioSettings.bgmVolume}%`;
  }
  if (els.sfxVolumeSlider) {
    els.sfxVolumeSlider.value = state.audioSettings.sfxVolume;
    els.sfxVolumeLabel.textContent = `${state.audioSettings.sfxVolume}%`;
  }
  if (bgmAudio) {
    bgmAudio.volume = 0.42 * bgmVolumeMultiplier();
  }
}

function updateAudioSetting(key, value) {
  state.audioSettings[key] = clampVolume(value);
  applyAudioSettings();
  saveState();
}

function cropProgress(crop) {
  if (!crop) return 0;
  return Math.min(1, (Date.now() - crop.plantedAt) / crop.growthDuration);
}

function isReady(crop) {
  return cropProgress(crop) >= 1;
}

function growthDurationForSeed(seed) {
  const growthMultiplier = Math.max(0.35, 1 - totalBonus("growth") / 100);
  const base = GROWTH_MS - seed.stats.vitality * 950;
  return Math.max(8 * 1000, base * growthMultiplier);
}

function createCropFromSeed() {
  return {
    id: crypto.randomUUID(),
    name: state.seed.name,
    family: state.seed.family,
    visual: state.seed.visual,
    environmentYield: structuredClone(state.seed.environmentYield),
    generation: state.seed.generation,
    stats: structuredClone(state.seed.stats),
    plantedAt: Date.now(),
    growthDuration: growthDurationForSeed(state.seed)
  };
}

function plant(plotId) {
  const plot = state.plots.find((item) => item.id === plotId);
  if (!plot || plot.crop || plot.id >= state.unlockedPlots) return;

  plot.crop = createCropFromSeed();
  state.plantedCrops[state.seed.family] = true;
  playPlantSound();
  setLog(`${plot.id + 1}番の畑に${state.seed.name}を植えました。`);
  saveAndRender();
}

function selectSeed(family) {
  if (!state.seedBank[family]) return;
  state.selectedFamily = family;
  state.seed = decorateSeed(state.seedBank[family]);
  playPlantSound();
  setLog(`${state.seed.name}を植える種に選びました。`);
  saveAndRender();
}

function plantAll() {
  let count = 0;
  state.plots.forEach((plot) => {
    if (!plot.crop && plot.id < state.unlockedPlots) {
      plot.crop = createCropFromSeed();
      state.plantedCrops[state.seed.family] = true;
      count += 1;
    }
  });
  if (count) {
    playPlantSound();
  }
  setLog(count ? `${count}区画に種を植えました。` : "植えられる空き畑がありません。");
  saveAndRender();
}

function harvest(plotId) {
  const plot = state.plots.find((item) => item.id === plotId);
  if (!plot?.crop || !isReady(plot.crop)) return false;

  const crop = plot.crop;
  const quality = crop.stats.size + crop.stats.sweetness + crop.stats.aroma + crop.stats.vitality + crop.stats.rarity * 3;
  const foodValue = foodValueForCrop(crop);
  state.storage.unshift({ ...crop, harvestedAt: Date.now(), quality, foodValue, saleValue: saleValue(crop, quality) });
  state.resources.food += foodValue;
  state.resources.terraPoints += Math.ceil(quality / 9);
  state.environment.oxygen += Math.ceil(crop.environmentYield.oxygen + crop.stats.vitality * 0.25);
  state.environment.water += Math.ceil(crop.environmentYield.water + crop.stats.aroma * 0.18);
  state.environment.nitrogen += Math.ceil(crop.environmentYield.nitrogen + crop.stats.rarity * 0.3);
  state.environment.green = Math.min(100, Math.floor(((state.environment.oxygen + state.environment.water + state.environment.nitrogen) / 3) * currentPlanetDef().greenScale));
  state.stats.totalHarvested += 1;
  registerCropDiscovery(crop);
  updatePlanetUnlocks();
  plot.crop = null;
  return true;
}

function harvestAll() {
  const count = state.plots.reduce((sum, plot) => sum + (harvest(plot.id) ? 1 : 0), 0);
  if (count) {
    playHarvestSound();
  }
  const discoveryText = pendingDiscoveryName ? ` 図鑑に${pendingDiscoveryName}を登録しました。` : "";
  setLog(count ? `${count}個の作物を収穫しました。倉庫から売るとコインになります。${discoveryText}` : "収穫できる作物はまだありません。");
  pendingDiscoveryName = null;
  clearInvalidParents();
  saveAndRender();
}

function saleValue(crop, quality = crop.quality) {
  return Math.ceil((quality + crop.stats.sweetness + crop.stats.rarity * 4) * (1 + totalBonus("sale") / 100));
}

function foodValueForCrop(crop) {
  return crop.foodValue ?? Math.ceil((crop.stats.size + crop.stats.sweetness) / 2);
}

function sellCrop(cropId) {
  const crop = state.storage.find((item) => item.id === cropId);
  if (!crop) return;

  const value = saleValue(crop);
  state.resources.coins += value;
  state.resources.food = Math.max(0, state.resources.food - foodValueForCrop(crop));
  state.storage = state.storage.filter((item) => item.id !== cropId);
  state.stats.totalSold += 1;
  pendingSellId = null;
  clearInvalidParents();
  playSellSound();
  setLog(`${crop.name}を売って${value}コインを得ました。`);
  saveAndRender();
}

function sellAll() {
  if (!state.storage.length) {
    setLog("売れる作物がありません。");
    return;
  }

  const total = state.storage.reduce((sum, crop) => sum + saleValue(crop), 0);
  const foodTotal = state.storage.reduce((sum, crop) => sum + foodValueForCrop(crop), 0);
  const count = state.storage.length;
  state.resources.coins += total;
  state.resources.food = Math.max(0, state.resources.food - foodTotal);
  state.stats.totalSold += count;
  state.storage = [];
  selectedParentA = null;
  selectedParentB = null;
  activeParentSlot = null;
  pendingSellId = null;
  playSellSound();
  setLog(`${count}個の作物を売って${total}コインを得ました。`);
  saveAndRender();
}

function selectParent(cropId) {
  const crop = state.storage.find((item) => item.id === cropId);
  if (!crop) return;

  if (activeParentSlot === "B") {
    selectedParentB = cropId;
  } else {
    selectedParentA = cropId;
  }
  if (selectedParentA === selectedParentB) {
    if (activeParentSlot === "B") selectedParentA = null;
    else selectedParentB = null;
  }
  activeParentSlot = null;
  pendingSellId = null;
  els.labResult.textContent = "";
  render();
}

function openParentPicker(slot) {
  activeParentSlot = slot;
  pendingSellId = null;
  renderLab();
}

function closeParentPicker() {
  activeParentSlot = null;
  renderLab();
}

function requestSell(cropId) {
  const crop = state.storage.find((item) => item.id === cropId);
  if (!crop) return;

  if (pendingSellId === cropId) {
    sellCrop(cropId);
    return;
  }

  pendingSellId = cropId;
  setLog(`${crop.name}を売りますか？ もう一度「売却」を押すと確定します。`);
  render();
}

function cancelSell() {
  pendingSellId = null;
  setLog("売却をキャンセルしました。");
  render();
}

function breed() {
  const parentA = state.storage.find((item) => item.id === selectedParentA);
  const parentB = state.storage.find((item) => item.id === selectedParentB);
  if (!parentA || !parentB || parentA.id === parentB.id) return;

  const successRate = breedingSuccessRate();
  const success = Math.random() < successRate;
  state.storage = state.storage.filter((item) => item.id !== parentA.id && item.id !== parentB.id);
  selectedParentA = null;
  selectedParentB = null;
  activeParentSlot = null;

  if (!success) {
    playButtonSound();
    setLog("交配はうまくまとまりませんでした。交配マシンを強化すると成功率が上がります。");
    els.labResult.textContent = `交配失敗。成功率は${Math.round(successRate * 100)}%でした。`;
    saveAndRender();
    return;
  }

  const mutationChance = 0.08 + stageBonus("mutation") / 100;
  const mutation = Math.random() < mutationChance;
  const nextStats = {};
  Object.keys(cropCatalog[parentA.family]?.stats ?? baseSeed.stats).forEach((key) => {
    const average = Math.round((parentA.stats[key] + parentB.stats[key]) / 2);
    const drift = Math.floor(Math.random() * 3);
    nextStats[key] = Math.max(1, average + drift + (mutation ? 1 : 0));
  });

  const visual = dominantStat(nextStats);
  state.seed = {
    name: makeCropName(nextStats, mutation, parentA.family),
    family: parentA.family,
    generation: Math.max(parentA.generation, parentB.generation) + 1,
    visual,
    environmentYield: blendedEnvironment(parentA, parentB, mutation),
    stats: nextStats
  };
  state.selectedFamily = state.seed.family;
  state.seedBank[state.seed.family] = decorateSeed(state.seed);
  state.stats.totalBred += 1;

  playRewardSound();
  setLog(mutation ? `突然変異で${state.seed.name}が生まれました。` : `${state.seed.name}の種ができました。`);
  els.labResult.textContent = `第${state.seed.generation}世代の${state.seed.name}を入手。`;
  saveAndRender();
}

function reportMission(missionId) {
  const mission = missions.find((item) => item.id === missionId);
  if (!mission || state.reportedMissions.includes(mission.id) || !mission.isReady(state)) return;

  mission.apply(state);
  state.reportedMissions.push(mission.id);
  playRewardSound();
  setLog(`ミッション「${mission.title}」を報告しました。${mission.reward}`);
  saveAndRender();
}

function upgradeCost(upgrade) {
  const level = state.upgradeLevels[upgrade.id] ?? 0;
  return Math.round(upgrade.baseCost * (1 + level * 0.75));
}

function buyUpgrade(upgradeId) {
  const upgrade = upgrades.find((item) => item.id === upgradeId);
  if (!upgrade) return;

  const cost = upgradeCost(upgrade);
  if (state.resources.coins < cost) {
    setLog(`${upgrade.title}には${cost}コイン必要です。`);
    return;
  }

  state.resources.coins -= cost;
  state.upgradeLevels[upgrade.id] += 1;
  state.bonuses[upgrade.bonusKey] += upgrade.bonusPerLevel;
  playRewardSound();
  setLog(`${upgrade.title}を強化しました。${upgrade.label} +${upgrade.bonusPerLevel}%`);
  saveAndRender();
}

function requestRewardText(reward) {
  return [
    reward.coins ? `コイン ${reward.coins}` : "",
    reward.terraPoints ? `テラP ${reward.terraPoints}` : "",
    reward.food ? `食料 ${reward.food}` : ""
  ].filter(Boolean).join(" / ");
}

function applyRequestReward(reward) {
  state.resources.coins += reward.coins ?? 0;
  state.resources.terraPoints += reward.terraPoints ?? 0;
  state.resources.food += reward.food ?? 0;
}

function isRequestCompleted(requestId) {
  return state.completedRequests.includes(requestId);
}

function isRequestVisible(request) {
  if (request.rank === 1) return true;
  return isRequestCompleted(`${request.client}_${request.rank - 1}`);
}

function eligibleCropsForRequest(request) {
  return state.storage.filter((crop) => request.matches(crop));
}

function openDelivery(requestId) {
  const request = coopRequests.find((item) => item.id === requestId);
  if (!request || isRequestCompleted(request.id)) return;
  activeDeliveryId = request.id;
  renderDeliveryModal();
}

function closeDelivery() {
  activeDeliveryId = null;
  els.deliveryModal.classList.remove("show");
  els.deliveryModal.setAttribute("aria-hidden", "true");
}

function openSettings() {
  applyAudioSettings();
  els.settingsModal.classList.add("show");
  els.settingsModal.setAttribute("aria-hidden", "false");
}

function closeSettings() {
  els.settingsModal.classList.remove("show");
  els.settingsModal.setAttribute("aria-hidden", "true");
}

function deliverRequestCrop(cropId) {
  const request = coopRequests.find((item) => item.id === activeDeliveryId);
  const crop = state.storage.find((item) => item.id === cropId);
  if (!request || !crop || isRequestCompleted(request.id) || !request.matches(crop)) return;

  state.storage = state.storage.filter((item) => item.id !== crop.id);
  state.completedRequests.push(request.id);
  applyRequestReward(request.reward);
  pendingSellId = null;
  clearInvalidParents();
  closeDelivery();
  playRewardSound();
  setLog(request.thanks);
  saveAndRender();
}

function clearInvalidParents() {
  const ids = new Set(state.storage.map((item) => item.id));
  if (!ids.has(selectedParentA)) selectedParentA = null;
  if (!ids.has(selectedParentB)) selectedParentB = null;
  if (!state.storage.length) activeParentSlot = null;
}

function dominantStat(stats) {
  return Object.entries(stats).reduce((best, current) => (current[1] > best[1] ? current : best))[0];
}

function blendedEnvironment(parentA, parentB, mutation) {
  const next = {};
  ["oxygen", "water", "nitrogen"].forEach((key) => {
    next[key] = Math.max(1, Math.round((parentA.environmentYield[key] + parentB.environmentYield[key]) / 2) + (mutation ? 1 : 0));
  });
  return next;
}

function makeCropName(stats, mutation, family = state.selectedFamily) {
  const dominant = dominantStat(stats);
  const prefixes = {
    size: "ふとっちょ",
    sweetness: "あまあま",
    aroma: "みずみず",
    vitality: "いきいき",
    rarity: "きらめき"
  };
  const suffix = cropCatalog[family]?.name ?? "スターキャロット";
  return `${mutation ? "ミュータント" : prefixes[dominant]}${suffix}`;
}

function terraStageName(environment = state.environment) {
  return stageRules.find((stage) => environment.oxygen >= stage.oxygen && environment.water >= stage.water && environment.nitrogen >= stage.nitrogen)?.name ?? "荒野";
}

function stageRank(stageName) {
  return ["荒野", "芽吹き", "草原", "緑の星"].indexOf(stageName);
}

function stageBonus(key) {
  return stageRules.find((stage) => stage.name === terraStageName())?.bonuses[key] ?? 0;
}

function totalBonus(key) {
  return state.bonuses[key] + stageBonus(key);
}

function nextUnlockText() {
  const readyMission = missions.find((mission) => mission.isReady(state) && !state.reportedMissions.includes(mission.id));
  if (readyMission) return `「${readyMission.title}」を報告できます`;
  if (stageRank(terraStageName()) < stageRank("芽吹き")) return "酸素20 / 水分15で芽吹き";
  if (state.environment.oxygen < 20) return "酸素20で成長速度 +8%";
  if (state.seed.generation < 3) return "第3世代で突然変異率 +10%";
  if (stageRank(terraStageName()) < stageRank("草原")) return "酸素50 / 水分45 / 窒素20で草原";
  return "次の開拓計画を準備中";
}

function setLog(message) {
  els.logText.textContent = message;
  const toast = els.logText.closest(".toast");
  if (!toast) return;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function saveAndRender() {
  saveState();
  render();
}

function render() {
  renderStats();
  renderSeedPicker();
  renderField();
  renderPlanets();
  renderMissions();
  renderCoopRequests();
  renderStorage();
  renderDex();
  renderLab();
  renderDeliveryModal();
}

function cropGrowthStage(crop) {
  if (!crop) return "empty";
  const progress = cropProgress(crop);
  if (progress >= 1) return "ready";
  return progress < 0.5 ? "seedling" : "growing";
}

function renderTick() {
  renderStats();
  let needsFieldRender = false;

  state.plots.forEach((plot) => {
    const button = els.fieldGrid.querySelector(`[data-plot-id="${plot.id}"]`);
    const expectedStage = plot.id >= state.unlockedPlots ? "locked" : cropGrowthStage(plot.crop);
    if (!button || button.dataset.growthStage !== expectedStage || button.dataset.cropId !== (plot.crop?.id ?? "")) {
      needsFieldRender = true;
      return;
    }
    if (plot.crop) {
      const progress = cropProgress(plot.crop);
      const progressBar = button.querySelector(".progress span");
      if (progressBar) {
        progressBar.style.width = `${Math.floor(progress * 100)}%`;
      }
    }
  });

  if (needsFieldRender) {
    renderField();
  }
}

function renderStats() {
  els.terraStage.textContent = terraStageName();
  els.greenRate.textContent = `${Math.floor(state.environment.green)}%`;
  if (els.greenBar) {
    els.greenBar.style.width = `${Math.min(100, Math.floor(state.environment.green))}%`;
  }
  if (els.profileLabel) {
    els.profileLabel.textContent = `${state.profile.playerName} / ${currentPlanet().name}`;
  }
  els.oxygen.textContent = state.environment.oxygen;
  els.water.textContent = state.environment.water;
  els.nitrogen.textContent = state.environment.nitrogen;
  els.food.textContent = state.resources.food;
  els.coins.textContent = state.resources.coins;
  els.terraPoints.textContent = state.resources.terraPoints;
  els.seedName.textContent = `第${state.seed.generation}世代 ${state.seed.name}`;
  document.body.dataset.stage = terraStageName();
}

function renderPlanets() {
  els.planetSummary.textContent = `${state.unlockedPlanets.length}/${Object.keys(planetCatalog).length}`;
  els.planetList.innerHTML = "";

  Object.values(planetCatalog).forEach((def) => {
    const unlocked = state.unlockedPlanets.includes(def.id);
    const planet = state.planets[def.id] ?? createPlanetState(def.id, def.id === HOME_PLANET_ID ? state.profile.planetName : def.fallbackName);
    const completable = canCompletePlanet(def.id);
    const item = document.createElement("div");
    item.className = `planet-route ${state.activePlanetId === def.id ? "active" : ""}${unlocked || completable ? "" : " locked"}${completable ? " ready" : ""}`;
    item.innerHTML = `
      <div>
        <strong>${planet.name}</strong>
        <span>${def.desc}</span>
        <small>緑化率 ${Math.floor(planet.environment.green)}% / 畑 ${planet.unlockedPlots}/${def.maxPlots}${completable ? " / 開拓達成できます" : ""}</small>
      </div>
      <button class="mini-action" ${
        completable ? `data-complete-planet="${def.id}"` : unlocked && state.activePlanetId !== def.id ? `data-planet="${def.id}"` : "disabled"
      }>
        ${completable ? "開拓達成" : state.activePlanetId === def.id ? "滞在中" : unlocked ? "移動" : "未開通"}
      </button>
    `;
    els.planetList.appendChild(item);
  });
}

function renderSeedPicker() {
  els.selectedSeedLabel.textContent = state.seed.name;
  els.seedPicker.innerHTML = "";
  Object.entries(state.seedBank).forEach(([family, seed]) => {
    const button = document.createElement("button");
    const selected = family === state.selectedFamily;
    const planted = Boolean(state.plantedCrops[family]);
    button.className = `seed-card ${selected ? "selected" : ""}`;
    button.type = "button";
    button.innerHTML = `
      ${planted ? cropImageMarkup(family, "crop-art seed-art", seed.name) : `<div class="seed-silhouette"></div>`}
      <strong>${seed.name}</strong>
      <span>${cropCatalog[family]?.desc ?? "交配で生まれた種"}</span>
      <small>${planted ? `酸${seed.environmentYield.oxygen} / 水${seed.environmentYield.water} / 窒${seed.environmentYield.nitrogen}` : "植えると姿がわかります"}</small>
    `;
    button.addEventListener("click", () => selectSeed(family));
    els.seedPicker.appendChild(button);
  });
}

function renderField() {
  els.fieldGrid.innerHTML = "";
  state.plots.forEach((plot) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.plotId = plot.id;
    button.dataset.cropId = plot.crop?.id ?? "";

    if (plot.id >= state.unlockedPlots) {
      button.className = "plot locked";
      button.dataset.growthStage = "locked";
      button.innerHTML = `<span>未開拓</span><small>緑化で解放</small>`;
      els.fieldGrid.appendChild(button);
      return;
    }

    button.className = `plot${plot.crop ? "" : " empty"}`;
    if (!plot.crop) {
      button.dataset.growthStage = "empty";
      button.textContent = "空き畑";
      button.addEventListener("click", () => plant(plot.id));
    } else {
      const progress = cropProgress(plot.crop);
      const ready = progress >= 1;
      const isSeedling = progress < 0.5;
      const growthStage = ready ? "ready" : isSeedling ? "seedling" : "growing";
      button.dataset.cropId = plot.crop.id;
      button.dataset.growthStage = growthStage;
      button.innerHTML = `
        ${ready ? cropImageMarkup(plot.crop, "crop-art plot-art", plot.crop.name) : `<div class="${isSeedling ? "seedling-icon" : `crop-icon crop-${plot.crop.visual}`}"></div>`}
        <div class="plot-name">${ready ? "収穫OK" : isSeedling ? "芽吹き中" : plot.crop.name}</div>
        <div class="progress"><span style="width:${Math.floor(progress * 100)}%"></span></div>
      `;
      button.addEventListener("click", () => {
        if (ready) {
          const cropName = plot.crop.name;
          harvest(plot.id);
          playHarvestSound();
          const discoveryText = pendingDiscoveryName ? ` 図鑑に${pendingDiscoveryName}を登録しました。` : "";
          setLog(`${cropName}をすぽっと収穫しました。${discoveryText}`);
          pendingDiscoveryName = null;
          clearInvalidParents();
          saveAndRender();
        } else {
          setLog(`成長中です。あと${secondsLeft(plot.crop)}秒ほど待ちましょう。`);
        }
      });
    }
    els.fieldGrid.appendChild(button);
  });
}

function renderMissions() {
  const reported = state.reportedMissions.length;
  els.missionProgress.textContent = `${reported}/${missions.length}`;
  els.bonusSummary.textContent = `成長 +${totalBonus("growth")}% / 売却 +${totalBonus("sale")}% / 交配 +${totalBonus("breeding")}%`;
  els.unlockSummary.textContent = nextUnlockText();
  els.missionList.innerHTML = "";
  els.upgradeList.innerHTML = "";
  els.unlockList.innerHTML = "";

  missions.forEach((mission) => {
    const ready = mission.isReady(state);
    const reportedMission = state.reportedMissions.includes(mission.id);
    const item = document.createElement("div");
    item.className = `mission ${reportedMission ? "done" : ready ? "ready" : ""}`;
    item.innerHTML = `
      <div>
        <strong>${mission.title}</strong>
        <span>${mission.target}</span>
        <small>${reportedMission ? "報告済み" : mission.reward}</small>
      </div>
      <button class="mini-action" ${ready && !reportedMission ? "" : "disabled"} data-report="${mission.id}">
        ${reportedMission ? "済" : ready ? "報告" : "未達成"}
      </button>
    `;
    els.missionList.appendChild(item);
  });

  upgrades.forEach((upgrade) => {
    const cost = upgradeCost(upgrade);
    const level = state.upgradeLevels[upgrade.id] ?? 0;
    const item = document.createElement("div");
    item.className = "upgrade";
    item.innerHTML = `
      <div>
        <strong>${upgrade.title} Lv.${level}</strong>
        <span>${upgrade.desc}</span>
        <small>${upgrade.label} +${state.bonuses[upgrade.bonusKey]}% / 段階 +${stageBonus(upgrade.bonusKey)}%</small>
      </div>
      <button class="mini-action" ${state.resources.coins >= cost ? "" : "disabled"} data-upgrade="${upgrade.id}">
        ${cost}C
      </button>
    `;
    els.upgradeList.appendChild(item);
  });

  [
    `開拓証: ${state.profile.playerName} / ${currentPlanet().name}`,
    `${state.unlockedPlots}/${currentPlanetDef().maxPlots}区画の畑を利用可能`,
    `成長速度 +${totalBonus("growth")}%`,
    `売却価格 +${totalBonus("sale")}%`,
    `交配成功率 ${Math.round(breedingSuccessRate() * 100)}%`,
    `次段階: ${nextStageRequirement()}`,
    ...nextStageShortfalls(),
    `現在の開拓段階: ${terraStageName()}`
  ].forEach((text) => {
    const item = document.createElement("div");
    item.className = "unlock";
    item.textContent = text;
    els.unlockList.appendChild(item);
  });
}

function renderCoopRequests() {
  const visibleRequests = coopRequests.filter(isRequestVisible);
  const completedVisible = visibleRequests.filter((request) => isRequestCompleted(request.id)).length;
  els.coopSummary.textContent = `${completedVisible}/${visibleRequests.length}`;
  els.coopRequestList.innerHTML = "";

  visibleRequests.forEach((request) => {
    const client = requestClients[request.client];
    const completed = isRequestCompleted(request.id);
    const eligibleCount = eligibleCropsForRequest(request).length;
    const item = document.createElement("div");
    item.className = `coop-request ${completed ? "done" : eligibleCount ? "ready" : ""}`;
    item.innerHTML = `
      <div class="request-main">
        <div class="request-kicker">
          <span>${"★".repeat(request.rank)}</span>
          <small>${client.name} / ${client.role}</small>
        </div>
        <strong>${request.title}</strong>
        <p>${request.comment}</p>
        <small>ほしいもの: ${request.need}</small>
        <small>お礼: ${requestRewardText(request.reward)}</small>
      </div>
      <button class="mini-action" ${!completed && eligibleCount ? "" : "disabled"} data-delivery="${request.id}">
        ${completed ? "届け済み" : eligibleCount ? `届ける ${eligibleCount}` : "待ち"}
      </button>
    `;
    els.coopRequestList.appendChild(item);
  });
}

function renderDeliveryModal() {
  const request = coopRequests.find((item) => item.id === activeDeliveryId);
  if (!request) {
    els.deliveryModal.classList.remove("show");
    els.deliveryModal.setAttribute("aria-hidden", "true");
    return;
  }

  const client = requestClients[request.client];
  const eligibleCrops = eligibleCropsForRequest(request);
  els.deliveryTitle.textContent = `${request.title}へ届ける`;
  els.deliveryNote.textContent = `${client.name}に届ける作物を選びます。${request.need}`;
  els.deliveryCropList.innerHTML = "";

  eligibleCrops.forEach((crop) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "delivery-crop";
    item.dataset.deliverCrop = crop.id;
    item.innerHTML = `
      <span class="item-name">第${crop.generation}世代 ${crop.name}</span>
      <span class="item-stats">
        ${Object.entries(crop.stats).map(([key, value]) => `<span class="chip">${statLabels[key]} ${value}</span>`).join("")}
        <span class="chip">酸 ${crop.environmentYield.oxygen}</span>
        <span class="chip">水 ${crop.environmentYield.water}</span>
        <span class="chip">窒 ${crop.environmentYield.nitrogen}</span>
      </span>
    `;
    els.deliveryCropList.appendChild(item);
  });

  if (!eligibleCrops.length) {
    const empty = document.createElement("div");
    empty.className = "delivery-empty";
    empty.textContent = "届けられる作物がありません。";
    els.deliveryCropList.appendChild(empty);
  }

  els.deliveryModal.classList.add("show");
  els.deliveryModal.setAttribute("aria-hidden", "false");
}

function renderStorage() {
  els.storageCount.textContent = `${state.storage.length}個`;
  els.sellAllBtn.disabled = state.storage.length === 0;
  els.storageList.classList.toggle("empty", state.storage.length === 0);
  els.storageList.innerHTML = "";

  state.storage.forEach((crop) => {
    const item = document.createElement("div");
    const selected = crop.id === selectedParentA || crop.id === selectedParentB;
    const confirmingSell = pendingSellId === crop.id;
    item.className = `item${selected ? " selected" : ""}${confirmingSell ? " confirming" : ""}`;
    item.innerHTML = `
      ${cropImageMarkup(crop, "crop-art item-art", crop.name)}
      <span>
        <span class="item-name">第${crop.generation}世代 ${crop.name}</span>
        <span class="item-stats">
          ${Object.entries(crop.stats).map(([key, value]) => `<span class="chip">${statLabels[key]} ${value}</span>`).join("")}
          <span class="chip">食 ${foodValueForCrop(crop)}</span>
        </span>
      </span>
      <div class="item-actions">
        <strong>${saleValue(crop)}C</strong>
        ${
          confirmingSell
            ? `<div class="confirm-actions"><button class="mini-action sell" data-sell="${crop.id}">売却</button><button class="mini-action cancel" data-cancel-sell="true">やめる</button></div>`
            : `<button class="mini-action sell" data-sell-request="${crop.id}">売る</button>`
        }
      </div>
    `;
    els.storageList.appendChild(item);
  });
}

function renderDex() {
  const discoveredFamilies = cropDexOrder.filter((family) => state.discoveredCrops[family]);
  els.dexCount.textContent = `${discoveredFamilies.length}/${cropDexOrder.length}`;
  els.dexList.innerHTML = "";

  cropDexOrder.forEach((family) => {
    const catalog = cropCatalog[family];
    const discovery = state.discoveredCrops[family];
    const item = document.createElement("article");
    item.className = `dex-card${discovery ? " discovered" : " locked"}`;
    item.innerHTML = discovery
      ? `
        <div class="dex-image">${cropImageMarkup(family, "crop-art dex-art", catalog.name)}</div>
        <div class="dex-body">
          <small>No.${String(catalog.no).padStart(3, "0")}</small>
          <strong>${catalog.name}</strong>
          <span>品種名: ${discovery.name}</span>
          <span>発見者: ${discovery.discoverer}</span>
          <span>発見日: ${formatDiscoveryDate(discovery.discoveredAt)}</span>
          <p>${catalog.flavor}</p>
        </div>
      `
      : `
        <div class="dex-image unknown"></div>
        <div class="dex-body">
          <small>No.${String(catalog.no).padStart(3, "0")}</small>
          <strong>未発見の作物</strong>
          <span>収穫すると記録されます。</span>
          <p>この小惑星のどこかで、まだ出会っていない作物が待っています。</p>
        </div>
      `;
    els.dexList.appendChild(item);
  });
}

function renderLab() {
  const parentA = state.storage.find((item) => item.id === selectedParentA);
  const parentB = state.storage.find((item) => item.id === selectedParentB);
  fillParentSlot(els.parentA, parentA, "親Aを選択");
  fillParentSlot(els.parentB, parentB, "親Bを選択");
  els.breedBtn.disabled = !parentA || !parentB || parentA.id === parentB.id;
  renderLabPicker();
  renderLabPrediction(parentA, parentB);
}

function fillParentSlot(el, crop, fallback) {
  el.classList.toggle("filled", Boolean(crop));
  el.innerHTML = crop
    ? `
      <span class="parent-label">${el === els.parentA ? "親A" : "親B"}</span>
      <strong>第${crop.generation}世代 ${crop.name}</strong>
      <small>${Object.entries(crop.stats).map(([key, value]) => `${statLabels[key]}${value}`).join(" / ")}</small>
    `
    : `<span class="parent-empty">${fallback}</span>`;
}

function renderLabPicker() {
  const isOpen = Boolean(activeParentSlot);
  els.labPicker.hidden = !isOpen;
  if (!isOpen) return;

  els.labPickerTitle.textContent = `親${activeParentSlot}にする作物`;
  els.labCropList.innerHTML = "";

  if (!state.storage.length) {
    const empty = document.createElement("div");
    empty.className = "delivery-empty";
    empty.textContent = "倉庫に作物がありません。収穫してから交配しましょう。";
    els.labCropList.appendChild(empty);
    return;
  }

  state.storage.forEach((crop) => {
    const isOtherParent = activeParentSlot === "A" ? crop.id === selectedParentB : crop.id === selectedParentA;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lab-crop";
    button.disabled = isOtherParent;
    button.dataset.parentCrop = crop.id;
    button.innerHTML = `
      <span>
        <span class="item-name">第${crop.generation}世代 ${crop.name}</span>
        <span class="item-stats">
          ${Object.entries(crop.stats).map(([key, value]) => `<span class="chip">${statLabels[key]} ${value}</span>`).join("")}
          <span class="chip">食 ${foodValueForCrop(crop)}</span>
        </span>
      </span>
      <strong>${isOtherParent ? "選択中" : "選ぶ"}</strong>
    `;
    els.labCropList.appendChild(button);
  });
}

function renderLabPrediction(parentA, parentB) {
  if (!parentA || !parentB || parentA.id === parentB.id) {
    els.labPrediction.textContent = "親を2つ選ぶと予想が表示されます。";
    return;
  }

  const preview = previewBreed(parentA, parentB);
  els.labPrediction.innerHTML = `
    <span>できそうな種</span>
    <strong>第${preview.generation}世代 ${preview.name}</strong>
    <small>成功率 ${Math.round(breedingSuccessRate() * 100)}% / ${Object.entries(preview.stats).map(([key, value]) => `${statLabels[key]}${value}`).join(" / ")}</small>
  `;
}

function breedingSuccessRate() {
  return Math.min(0.9, 0.3 + totalBonus("breeding") / 100);
}

function previewBreed(parentA, parentB) {
  const nextStats = {};
  Object.keys(cropCatalog[parentA.family]?.stats ?? baseSeed.stats).forEach((key) => {
    nextStats[key] = Math.max(1, Math.round((parentA.stats[key] + parentB.stats[key]) / 2) + 1);
  });

  return {
    name: makeCropName(nextStats, false, parentA.family),
    generation: Math.max(parentA.generation, parentB.generation) + 1,
    stats: nextStats
  };
}

function nextStageRequirement() {
  const current = stageRank(terraStageName());
  const next = [...stageRules].reverse().find((stage) => stageRank(stage.name) === current + 1);
  if (!next) return "到達済み";
  return `${next.name} 酸素${next.oxygen} / 水分${next.water} / 窒素${next.nitrogen}`;
}

function nextStageShortfalls() {
  const current = stageRank(terraStageName());
  const next = [...stageRules].reverse().find((stage) => stageRank(stage.name) === current + 1);
  if (!next) return ["すべての開拓段階に到達済み"];

  return [
    `酸素 あと${Math.max(0, next.oxygen - state.environment.oxygen)}`,
    `水分 あと${Math.max(0, next.water - state.environment.water)}`,
    `窒素 あと${Math.max(0, next.nitrogen - state.environment.nitrogen)}`
  ];
}

function secondsLeft(crop) {
  return Math.max(1, Math.ceil((crop.growthDuration - (Date.now() - crop.plantedAt)) / 1000));
}

function ensureAudio() {
  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    audioContext = new AudioCtor();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

function tone(freq, start, duration, type, volume, channel = "sfx") {
  const ctx = ensureAudio();
  if (!ctx) return;
  const adjustedVolume = volume * (channel === "bgm" ? bgmVolumeMultiplier() : sfxVolumeMultiplier());
  if (adjustedVolume <= 0) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(adjustedVolume, ctx.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.02);
}

function playBgmPattern(mode) {
  if (mode === "title") {
    [
      [392, 0],
      [494, 0.34],
      [587, 0.68],
      [784, 1.08],
      [659, 1.55],
      [587, 2.05]
    ].forEach(([freq, start]) => tone(freq, start, 0.28, "sine", 0.0045 * SOUND_VOLUME, "bgm"));
    tone(196, 0, 2.55, "triangle", 0.0024 * SOUND_VOLUME, "bgm");
    return;
  }

  [
    [330, 0],
    [392, 0.28],
    [440, 0.56],
    [523, 0.92],
    [440, 1.34],
    [392, 1.72],
    [349, 2.1],
    [392, 2.52]
  ].forEach(([freq, start]) => tone(freq, start, 0.22, "triangle", 0.0038 * SOUND_VOLUME, "bgm"));
  tone(165, 0, 1.25, "sine", 0.0024 * SOUND_VOLUME, "bgm");
  tone(196, 1.42, 1.25, "sine", 0.0024 * SOUND_VOLUME, "bgm");
}

function startAudioBgm(mode) {
  const track = musicTracks[mode];
  if (!track?.src) return false;
  if (bgmMode === mode && bgmAudio && !bgmAudio.paused) return true;

  stopBgm();
  bgmMode = mode;
  bgmAudio = new Audio(track.src);
  bgmAudio.loop = true;
  bgmAudio.volume = 0.42 * bgmVolumeMultiplier();
  bgmAudio.play().catch(() => {
    setLog("BGMは画面をタップすると再生されます。");
  });
  return true;
}

function startBgm(mode) {
  if (startAudioBgm(mode)) return;
  if (bgmMode === mode && bgmTimer) return;
  stopBgm();
  bgmMode = mode;
  playBgmPattern(mode);
  bgmTimer = setInterval(() => playBgmPattern(mode), mode === "title" ? 3200 : 3000);
}

function stopBgm() {
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    bgmAudio = null;
  }
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
  bgmMode = null;
}

function playButtonSound() {
  tone(420, 0, 0.045, "triangle", 0.025 * SOUND_VOLUME);
}

function playPlantSound() {
  tone(310, 0, 0.06, "sine", 0.035 * SOUND_VOLUME);
  tone(520, 0.045, 0.07, "triangle", 0.026 * SOUND_VOLUME);
}

function playHarvestSound() {
  tone(150, 0, 0.055, "sawtooth", 0.05 * SOUND_VOLUME);
  tone(560, 0.04, 0.09, "triangle", 0.052 * SOUND_VOLUME);
  tone(820, 0.12, 0.08, "sine", 0.03 * SOUND_VOLUME);
}

function playSellSound() {
  tone(620, 0, 0.05, "square", 0.02 * SOUND_VOLUME);
  tone(930, 0.06, 0.08, "triangle", 0.026 * SOUND_VOLUME);
}

function playRewardSound() {
  tone(523, 0, 0.08, "triangle", 0.028 * SOUND_VOLUME);
  tone(659, 0.08, 0.08, "triangle", 0.028 * SOUND_VOLUME);
  tone(784, 0.16, 0.12, "triangle", 0.03 * SOUND_VOLUME);
}

function playStartSound() {
  tone(196, 0, 0.08, "sine", 0.045 * SOUND_VOLUME);
  tone(392, 0.04, 0.12, "triangle", 0.042 * SOUND_VOLUME);
  tone(523, 0.11, 0.13, "triangle", 0.04 * SOUND_VOLUME);
  tone(659, 0.19, 0.18, "sine", 0.034 * SOUND_VOLUME);
  tone(988, 0.28, 0.22, "triangle", 0.026 * SOUND_VOLUME);
}

document.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) {
    playButtonSound();
  }
});

els.titleScreen.addEventListener("pointerdown", () => startBgm("title"));
els.titleScreen.addEventListener("click", startGame);
els.titleScreen.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    startGame();
  }
});
els.introNextBtn.addEventListener("click", advanceIntro);
els.introForm.addEventListener("submit", (event) => {
  event.preventDefault();
  completeIntro();
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.tab}Panel`).classList.add("active");
  });
});

els.missionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-report]");
  if (button) {
    reportMission(button.dataset.report);
  }
});

els.planetList.addEventListener("click", (event) => {
  const completeButton = event.target.closest("[data-complete-planet]");
  if (completeButton) {
    completePlanet(completeButton.dataset.completePlanet);
    return;
  }

  const button = event.target.closest("[data-planet]");
  if (button) {
    switchPlanet(button.dataset.planet);
  }
});

els.upgradeList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-upgrade]");
  if (button) {
    buyUpgrade(button.dataset.upgrade);
  }
});

els.coopRequestList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delivery]");
  if (button) {
    openDelivery(button.dataset.delivery);
  }
});

els.deliveryCropList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-deliver-crop]");
  if (button) {
    deliverRequestCrop(button.dataset.deliverCrop);
  }
});

els.deliveryCloseBtn.addEventListener("click", closeDelivery);
els.deliveryModal.addEventListener("click", (event) => {
  if (event.target === els.deliveryModal) {
    closeDelivery();
  }
});

els.settingsBtn.addEventListener("click", openSettings);
els.settingsCloseBtn.addEventListener("click", closeSettings);
els.settingsModal.addEventListener("click", (event) => {
  if (event.target === els.settingsModal) {
    closeSettings();
  }
});
els.bgmVolumeSlider.addEventListener("input", (event) => {
  updateAudioSetting("bgmVolume", event.target.value);
});
els.sfxVolumeSlider.addEventListener("input", (event) => {
  updateAudioSetting("sfxVolume", event.target.value);
});

els.storageList.addEventListener("click", (event) => {
  const sellButton = event.target.closest("[data-sell]");
  const requestSellButton = event.target.closest("[data-sell-request]");
  if (requestSellButton) {
    requestSell(requestSellButton.dataset.sellRequest);
  }
  if (sellButton) {
    sellCrop(sellButton.dataset.sell);
  }
  if (event.target.closest("[data-cancel-sell]")) {
    cancelSell();
  }
});

els.plantAllBtn.addEventListener("click", plantAll);
els.harvestAllBtn.addEventListener("click", harvestAll);
els.sellAllBtn.addEventListener("click", sellAll);
els.breedBtn.addEventListener("click", breed);
els.parentA.addEventListener("click", () => openParentPicker("A"));
els.parentB.addEventListener("click", () => openParentPicker("B"));
els.labPickerClose.addEventListener("click", closeParentPicker);
els.labCropList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-parent-crop]");
  if (button) {
    selectParent(button.dataset.parentCrop);
  }
});
els.resetBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

applyAudioSettings();
render();
setInterval(renderTick, 1000);
