/**
 * TYPE//TANK - Curated High-Quality Lexicon & Arsenal Dictionaries
 * Clean, readable, intuitive combat & tactical terms for each tier.
 */

window.TypeTankWords = (function () {
  'use strict';

  // Mode 1: Alpha (Pure lowercase armor & ballistic terms)
  const MODE_1_WORDS = [
    'tank', 'radar', 'turret', 'armor', 'shell', 'cannon', 'strike', 'patrol',
    'bunker', 'sector', 'target', 'vector', 'missile', 'breach', 'flank', 'scout',
    'convoy', 'mortar', 'platoon', 'ballistic', 'recoil', 'chassis', 'velocity',
    'caliber', 'barrage', 'defend', 'combat', 'sortie', 'recon', 'tactical',
    'payload', 'warhead', 'perimeter', 'assault', 'outpost', 'tracer', 'battery',
    'citadel', 'howitzer', 'infantry', 'trench', 'shield', 'artillery', 'squad',
    'gunner', 'loader', 'traverse', 'elevation', 'muzzle', 'penetrate',
    'ricochet', 'shrapnel', 'fragment', 'detonate', 'ignite', 'treads',
    'engine', 'diesel', 'turbine', 'radio', 'beacon', 'sensor', 'thermal',
    'laser', 'bearing', 'azimuth', 'range', 'salvo', 'ambush', 'garrison',
    'stronghold', 'vanguard', 'titan', 'citadel', 'bastion', 'redoubt'
  ];

  // Mode 2: Bravo (Capitalized Tactical Callsigns & Units)
  const MODE_2_WORDS = [
    'Vanguard', 'Titan', 'Ghost', 'Valkyrie', 'BlackHawk', 'Warhammer',
    'Centurion', 'Paladin', 'Grizzly', 'Panther', 'Leopard', 'Abrams',
    'Challenger', 'Striker', 'Wolverine', 'Bulldog', 'FrontLine', 'TaskForce',
    'Overwatch', 'IronDome', 'Dreadnought', 'FireStorm', 'ShockWave', 'SkyGuard',
    'RedSector', 'HeavyArmor', 'BattleMech', 'HellFire', 'NightRaid', 'ApexPredator',
    'IronClad', 'CyberGun', 'HavocTeam', 'StormTroop', 'CommandPost', 'OmegaSquad',
    'BravoSix', 'EchoUnit', 'ZuluDawn', 'SierraTeam', 'SteelRain', 'FireBase'
  ];

  // Mode 3: Charlie (Clean Alphanumeric Squad & Spec Designations)
  const MODE_3_WORDS = [
    'Squad-5', 'Tank-99', 'Delta-7', 'Viper-2', 'Falcon-9', 'Echo-4', 'Raid-10',
    'Unit-01', 'Sector-7', 'Raven-X', 'Mach-3', 'Mark-4', 'Base-12', 'Zone-51',
    'Alpha-8', 'Phantom-X', 'Hawk-3', 'Defcon-1', 'Bunker-42', 'Grid-88',
    'Titan-9', 'Iron-7', 'Apex-4', 'Code-99', 'Striker-2', 'Armor-6', 'Wolf-8',
    'Tiger-4', 'Blaze-7', 'Nova-5', 'Scout-3', 'Ranger-9', 'Pulse-8', 'Command-1'
  ];

  // Mode 4: Delta (High-Energy Operations & Tactical Commands)
  const MODE_4_WORDS = [
    'Target-Lock', 'Laser-Burst', 'Fast-Strike', 'Deep-Recon', 'Full-Armor',
    'Overdrive', 'Hyper-Beam', 'Air-Support', 'Fire-Storm', 'Shock-Wave',
    'Cyber-Tank', 'Mega-Blast', 'Strike-Force', 'Shield-Up', 'Rapid-Fire',
    'Heavy-Shell', 'Combat-Ready', 'Battle-Line', 'Direct-Hit', 'High-Damage',
    'Armor-Piercing', 'Night-Assault', 'Core-Breach', 'Storm-Troop', 'Alpha-Strike',
    'Power-Surge', 'Super-Sonic', 'Sonic-Boom', 'Laser-Grid', 'Radar-Scan'
  ];

  // Red Bonus high-threat targets (Epic, punchy, high-adrenaline words)
  const BONUS_WORDS = {
    1: ['ballistic', 'howitzer', 'artillery', 'citadel', 'stronghold', 'periscope', 'annihilate', 'destruction', 'barricade'],
    2: ['Dreadnought', 'TitanMech', 'ThunderBolt', 'BattleCruiser', 'ApexPredator', 'IronFortress', 'StormBringer', 'Vindicator'],
    3: ['Warhead-X7', 'Sector-777', 'Defcon-101', 'Titan-M1A2', 'Phantom-99', 'HyperSpeed-4', 'UltraStrike-8'],
    4: ['TARGET-MEGA', 'SUPER-STRIKE', 'OVERRIDE-NOW', 'CRITICAL-HIT', 'TOTAL-ASSAULT', 'HYPER-BURST', 'FIRE-STORM']
  };

  // Exclusion & Cooldown State
  let activeBonusInitial = null;
  const cooldownMap = new Map();

  function setActiveBonusInitial(char) {
    activeBonusInitial = char ? char.charAt(0) : null;
  }

  function clearBonusTarget(initialChar) {
    activeBonusInitial = null;
    if (initialChar) {
      cooldownMap.set(initialChar.charAt(0), Date.now() + 3000);
    }
  }

  function isSuppressed(char) {
    if (!char) return false;
    const c = char.charAt(0);
    if (activeBonusInitial && activeBonusInitial === c) {
      return true;
    }
    const cd = cooldownMap.get(c);
    if (cd) {
      if (Date.now() < cd) {
        return true;
      } else {
        cooldownMap.delete(c);
      }
    }
    return false;
  }

  function getWordList(mode, customMatrix) {
    if (!customMatrix) {
      switch (mode) {
        case 2: return MODE_2_WORDS;
        case 3: return MODE_3_WORDS;
        case 4: return MODE_4_WORDS;
        case 1:
        default: return MODE_1_WORDS;
      }
    }

    const { uppercase, numbers, specials } = customMatrix;
    if (specials) return MODE_4_WORDS;
    if (numbers) return MODE_3_WORDS;
    if (uppercase) return MODE_2_WORDS;
    return MODE_1_WORDS;
  }

  function getRandomWord(mode, isBonus, existingInitials = [], customMatrix = null) {
    const list = isBonus ? (BONUS_WORDS[mode] || BONUS_WORDS[1]) : getWordList(mode, customMatrix);
    
    let candidates = list.filter(w => !isSuppressed(w.charAt(0)));
    if (candidates.length === 0) candidates = list;

    const nonConflicting = candidates.filter(w => !existingInitials.includes(w.charAt(0)));
    const pool = nonConflicting.length > 0 ? nonConflicting : candidates;

    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
  }

  function resetExclusions() {
    activeBonusInitial = null;
    cooldownMap.clear();
  }

  return {
    MODE_1_WORDS,
    MODE_2_WORDS,
    MODE_3_WORDS,
    MODE_4_WORDS,
    BONUS_WORDS,
    setActiveBonusInitial,
    clearBonusTarget,
    isSuppressed,
    getWordList,
    getRandomWord,
    resetExclusions
  };
})();
