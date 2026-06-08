const STORAGE_KEY = "terrafarming-save-v4";
const GROWTH_MS = 45 * 1000;
const MAX_PLOTS = 9;
const SOUND_VOLUME = 2.6;

const statLabels = {
  size: "大",
  sweetness: "甘",
  aroma: "香",
  vitality: "生",
  rarity: "希"
};

const cropCatalog = {
  carrot: {
    name: "スターキャロット",
    desc: "酸素を増やしやすい基本作物",
    visual: "vitality",
    stats: { size: 6, sweetness: 5, aroma: 4, vitality: 7, rarity: 1 },
    environmentYield: { oxygen: 5, water: 2, nitrogen: 1 }
  },
  tomato: {
    name: "ルナトマト",
    desc: "水分を増やしやすいみずみずしい作物",
    visual: "aroma",
    stats: { size: 5, sweetness: 7, aroma: 8, vitality: 4, rarity: 1 },
    environmentYield: { oxygen: 2, water: 6, nitrogen: 1 }
  },
  beans: {
    name: "ソイルビーンズ",
    desc: "窒素を増やしやすい土づくり作物",
    visual: "rarity",
    stats: { size: 4, sweetness: 4, aroma: 3, vitality: 6, rarity: 2 },
    environmentYield: { oxygen: 2, water: 2, nitrogen: 6 }
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
      s.unlockedPlots = MAX_PLOTS;
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
    title: "品種メモリ",
    desc: "交配時の突然変異率を上げる",
    bonusKey: "mutation",
    bonusPerLevel: 5,
    baseCost: 36,
    label: "突然変異率"
  }
];

const state = loadState();
let selectedParentA = null;
let selectedParentB = null;
let audioContext = null;
let pendingSellId = null;

const els = {
  terraStage: document.querySelector("#terraStage"),
  greenRate: document.querySelector("#greenRate"),
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
  bonusSummary: document.querySelector("#bonusSummary"),
  upgradeList: document.querySelector("#upgradeList"),
  unlockSummary: document.querySelector("#unlockSummary"),
  unlockList: document.querySelector("#unlockList"),
  storageList: document.querySelector("#storageList"),
  storageCount: document.querySelector("#storageCount"),
  sellAllBtn: document.querySelector("#sellAllBtn"),
  seedName: document.querySelector("#seedName"),
  parentA: document.querySelector("#parentA"),
  parentB: document.querySelector("#parentB"),
  breedBtn: document.querySelector("#breedBtn"),
  labResult: document.querySelector("#labResult"),
  logText: document.querySelector("#logText"),
  resetBtn: document.querySelector("#resetBtn")
};

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
    plots: Array.from({ length: MAX_PLOTS }, (_, id) => ({ id, crop: null })),
    unlockedPlots: 4,
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
    reportedMissions: [],
    bonuses: { growth: 0, mutation: 0, sale: 0 },
    upgradeLevels: { greenhouse: 0, shipping: 0, geneMemo: 0 },
    lastSeen: Date.now()
  });
}

function normalizeState(raw) {
  const coins = raw.resources?.coins ?? raw.resources?.minerals ?? 0;
  const normalized = {
    plots: Array.from({ length: MAX_PLOTS }, (_, id) => raw.plots?.[id] ?? { id, crop: null }),
    unlockedPlots: raw.unlockedPlots ?? 4,
    selectedFamily: raw.selectedFamily ?? raw.seed?.family ?? "carrot",
    seedBank: { carrot: createBaseSeed("carrot"), tomato: createBaseSeed("tomato"), beans: createBaseSeed("beans"), ...raw.seedBank },
    seed: raw.seed ?? structuredClone(baseSeed),
    storage: raw.storage ?? [],
    resources: { food: 0, coins, terraPoints: 0, ...raw.resources, coins },
    environment: { green: 0, oxygen: 0, water: 0, nitrogen: 0, ...raw.environment },
    stats: { totalHarvested: 0, totalBred: 0, totalSold: 0, ...raw.stats },
    reportedMissions: raw.reportedMissions ?? raw.completedMissions ?? [],
    bonuses: { growth: 0, mutation: 0, sale: 0, ...raw.bonuses },
    upgradeLevels: { greenhouse: 0, shipping: 0, geneMemo: 0, ...raw.upgradeLevels },
    lastSeen: raw.lastSeen ?? Date.now()
  };

  delete normalized.resources.minerals;
  delete normalized.environment.soil;
  normalized.seedBank = Object.fromEntries(Object.entries(normalized.seedBank).map(([family, seed]) => [family, decorateSeed(seed)]));
  normalized.seed = decorateSeed(normalized.seedBank[normalized.selectedFamily] ?? normalized.seed);
  normalized.storage = normalized.storage.map((crop) => decorateCrop(crop));
  normalized.plots = normalized.plots.map((plot, id) => ({
    id,
    crop: plot.crop ? decorateCrop(plot.crop) : null
  }));
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

function saveState() {
  state.lastSeen = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  state.environment.green = Math.min(100, Math.floor((state.environment.oxygen + state.environment.water + state.environment.nitrogen) / 3));
  state.stats.totalHarvested += 1;
  plot.crop = null;
  return true;
}

function harvestAll() {
  const count = state.plots.reduce((sum, plot) => sum + (harvest(plot.id) ? 1 : 0), 0);
  if (count) {
    playHarvestSound();
  }
  setLog(count ? `${count}個の作物を収穫しました。倉庫から売るとコインになります。` : "収穫できる作物はまだありません。");
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
  pendingSellId = null;
  playSellSound();
  setLog(`${count}個の作物を売って${total}コインを得ました。`);
  saveAndRender();
}

function selectParent(cropId) {
  const crop = state.storage.find((item) => item.id === cropId);
  if (!crop) return;

  if (selectedParentA === cropId) {
    selectedParentA = null;
  } else if (selectedParentB === cropId) {
    selectedParentB = null;
  } else if (!selectedParentA) {
    selectedParentA = cropId;
  } else {
    selectedParentB = cropId;
  }
  pendingSellId = null;
  render();
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

  const mutationChance = 0.22 + totalBonus("mutation") / 100;
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
  state.storage = state.storage.filter((item) => item.id !== parentA.id && item.id !== parentB.id);
  state.stats.totalBred += 1;
  selectedParentA = null;
  selectedParentB = null;

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

function clearInvalidParents() {
  const ids = new Set(state.storage.map((item) => item.id));
  if (!ids.has(selectedParentA)) selectedParentA = null;
  if (!ids.has(selectedParentB)) selectedParentB = null;
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
}

function saveAndRender() {
  saveState();
  render();
}

function render() {
  renderStats();
  renderSeedPicker();
  renderField();
  renderMissions();
  renderStorage();
  renderLab();
}

function renderStats() {
  els.terraStage.textContent = terraStageName();
  els.greenRate.textContent = `${Math.floor(state.environment.green)}%`;
  els.oxygen.textContent = state.environment.oxygen;
  els.water.textContent = state.environment.water;
  els.nitrogen.textContent = state.environment.nitrogen;
  els.food.textContent = state.resources.food;
  els.coins.textContent = state.resources.coins;
  els.terraPoints.textContent = state.resources.terraPoints;
  els.seedName.textContent = `第${state.seed.generation}世代 ${state.seed.name}`;
  document.body.dataset.stage = terraStageName();
}

function renderSeedPicker() {
  els.selectedSeedLabel.textContent = state.seed.name;
  els.seedPicker.innerHTML = "";
  Object.entries(state.seedBank).forEach(([family, seed]) => {
    const button = document.createElement("button");
    const selected = family === state.selectedFamily;
    button.className = `seed-card ${selected ? "selected" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <div class="crop-icon crop-${seed.visual}"></div>
      <strong>${seed.name}</strong>
      <span>${cropCatalog[family]?.desc ?? "交配で生まれた種"}</span>
      <small>酸${seed.environmentYield.oxygen} / 水${seed.environmentYield.water} / 窒${seed.environmentYield.nitrogen}</small>
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

    if (plot.id >= state.unlockedPlots) {
      button.className = "plot locked";
      button.innerHTML = `<span>未開拓</span><small>開拓報告で解放</small>`;
      els.fieldGrid.appendChild(button);
      return;
    }

    button.className = `plot${plot.crop ? "" : " empty"}`;
    if (!plot.crop) {
      button.textContent = "空き畑";
      button.addEventListener("click", () => plant(plot.id));
    } else {
      const progress = cropProgress(plot.crop);
      const ready = progress >= 1;
      button.innerHTML = `
        <div class="crop-icon crop-${plot.crop.visual}"></div>
        <div class="plot-name">${ready ? "収穫OK" : plot.crop.name}</div>
        <div class="progress"><span style="width:${Math.floor(progress * 100)}%"></span></div>
      `;
      button.addEventListener("click", () => {
        if (ready) {
          const cropName = plot.crop.name;
          harvest(plot.id);
          playHarvestSound();
          setLog(`${cropName}をすぽっと収穫しました。`);
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
  els.bonusSummary.textContent = `成長 +${totalBonus("growth")}% / 売却 +${totalBonus("sale")}% / 変異 +${totalBonus("mutation")}%`;
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
    `${state.unlockedPlots}/9区画の畑を利用可能`,
    `成長速度 +${totalBonus("growth")}%`,
    `売却価格 +${totalBonus("sale")}%`,
    `突然変異率 +${totalBonus("mutation")}%`,
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
      <span>
        <span class="item-name">第${crop.generation}世代 ${crop.name}</span>
        <span class="item-stats">
          ${Object.entries(crop.stats).map(([key, value]) => `<span class="chip">${statLabels[key]} ${value}</span>`).join("")}
          <span class="chip">食 ${foodValueForCrop(crop)}</span>
        </span>
      </span>
      <div class="item-actions">
        <strong>${saleValue(crop)}C</strong>
        <button class="mini-action parent-pick" data-parent="${crop.id}">交配に使う</button>
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

function renderLab() {
  const parentA = state.storage.find((item) => item.id === selectedParentA);
  const parentB = state.storage.find((item) => item.id === selectedParentB);
  fillParentSlot(els.parentA, parentA, "親Aを選択");
  fillParentSlot(els.parentB, parentB, "親Bを選択");
  els.breedBtn.disabled = !parentA || !parentB || parentA.id === parentB.id;
}

function fillParentSlot(el, crop, fallback) {
  el.classList.toggle("filled", Boolean(crop));
  el.textContent = crop ? `第${crop.generation}世代 ${crop.name}` : fallback;
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

function tone(freq, start, duration, type, volume) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.02);
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

document.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) {
    playButtonSound();
  }
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

els.upgradeList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-upgrade]");
  if (button) {
    buyUpgrade(button.dataset.upgrade);
  }
});

els.storageList.addEventListener("click", (event) => {
  const parentButton = event.target.closest("[data-parent]");
  const sellButton = event.target.closest("[data-sell]");
  if (parentButton) {
    selectParent(parentButton.dataset.parent);
  }
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
els.parentA.addEventListener("click", () => {
  selectedParentA = null;
  render();
});
els.parentB.addEventListener("click", () => {
  selectedParentB = null;
  render();
});
els.resetBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

render();
setInterval(render, 1000);
