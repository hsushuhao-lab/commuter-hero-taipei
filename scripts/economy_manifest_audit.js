const fs = require('fs');
const cp = require('child_process');
const assert = require('assert');

const currentPath = 'source/src/world/Level.js';
const baseline = cp.execFileSync('git', ['show', '19c2296:source/src/world/Level.js'], { encoding: 'utf8' });
const current = fs.readFileSync(currentPath, 'utf8');

function csvEscape(value) {
  const text = String(value);
  return /[,"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function evaluateY(expression) {
  const normalized = expression.trim().replace(/;.*$/, '');
  if (normalized === 'groundY - 35') return 525;
  const numeric = Number(normalized);
  assert(Number.isFinite(numeric), `Unsupported item y expression: ${expression}`);
  return numeric;
}

function parseLevel(source) {
  const items = [];
  const platforms = [];
  const lines = source.split(/\r?\n/);
  let loopXs = null;

  for (const line of lines) {
    const loopMatch = line.match(/^\s*\[([0-9,\s]+)\]\.forEach\(cx => \{/);
    if (loopMatch) {
      loopXs = loopMatch[1].split(',').map(value => Number(value.trim()));
      continue;
    }
    if (loopXs && /^\s*\}\);/.test(line)) {
      loopXs = null;
      continue;
    }

    const platformMatch = line.match(/addPlatform\(([-0-9.]+),\s*([-0-9.]+),\s*([-0-9.]+),\s*([-0-9.]+),\s*'([^']+)'\)/);
    if (platformMatch) {
      platforms.push({
        x: Number(platformMatch[1]),
        y: Number(platformMatch[2]),
        w: Number(platformMatch[3]),
        h: Number(platformMatch[4]),
        type: platformMatch[5]
      });
    }

    const itemMatch = line.match(/addItem\('(coin|coffee)',\s*([^,]+),\s*([^\)]+)\)/);
    if (!itemMatch) continue;
    const type = itemMatch[1];
    const xExpression = itemMatch[2].trim();
    const y = evaluateY(itemMatch[3]);
    const xs = xExpression === 'cx' ? loopXs : [Number(xExpression)];
    assert(xs && xs.every(Number.isFinite), `Unsupported item x expression: ${xExpression}`);
    xs.forEach(x => items.push({ type, x, y }));
  }
  return { items, platforms };
}

function byType(parsed, type) {
  return parsed.items.filter(item => item.type === type);
}

const oldLevel = parseLevel(baseline);
const newLevel = parseLevel(current);
const oldCoins = byType(oldLevel, 'coin');
const newCoins = byType(newLevel, 'coin');
assert.strictEqual(newCoins.length, oldCoins.length, 'Coin count changed from v9.6 baseline');

const coinRows = ['coin_id,v9.6_x,v9.6_y,v9.7.1_x,v9.7.1_y,status'];
oldCoins.forEach((oldCoin, index) => {
  const newCoin = newCoins[index];
  const same = newCoin && oldCoin.x === newCoin.x && oldCoin.y === newCoin.y;
  coinRows.push([
    `coin_${String(index + 1).padStart(3, '0')}`,
    oldCoin.x,
    oldCoin.y,
    newCoin ? newCoin.x : '',
    newCoin ? newCoin.y : '',
    same ? 'PASS_EXACT_MATCH' : 'FAIL_CHANGED_PLACEMENT'
  ].map(csvEscape).join(','));
});
fs.writeFileSync('COIN_PLACEMENT_AUDIT.csv', `${coinRows.join('\n')}\n`);

const newCoffee = byType(newLevel, 'coffee');
const oldCoffee = byType(oldLevel, 'coffee');
assert(newCoffee.length < oldCoffee.length, 'Coffee count was not reduced from v9.6 baseline');
const coffeeRows = ['coffee_id,x,y,v9.6_baseline_count,coffee_count,location,heal_amount,cap_at_max_hp,forbidden_buffs,status'];
newCoffee.forEach((coffee, index) => {
  const onBrick = newLevel.platforms.some(platform =>
    platform.type === 'brick' &&
    coffee.x >= platform.x && coffee.x <= platform.x + platform.w &&
    coffee.y === platform.y - 40
  );
  coffeeRows.push([
    `coffee_${String(index + 1).padStart(2, '0')}`,
    coffee.x,
    coffee.y,
    oldCoffee.length,
    newCoffee.length,
    onBrick ? 'BRICK_PLATFORM_REQUIRES_JUMP' : 'GROUND_OR_UNVERIFIED',
    25,
    'YES',
    'speed|shield|invulnerability|attack',
    onBrick ? 'PASS' : 'FAIL_MAIN_PATH_OR_UNVERIFIED'
  ].map(csvEscape).join(','));
});
fs.writeFileSync('COFFEE_PLACEMENT_AUDIT.csv', `${coffeeRows.join('\n')}\n`);

const player = fs.readFileSync('source/src/entities/Player.js', 'utf8');
const coffeeBody = player.match(/addCoffee\(\)\s*\{([\s\S]*?)\n\s*performDash\(\)/);
assert(coffeeBody, 'Could not locate Player.addCoffee implementation');
assert(/Math\.min\(this\.maxHp, this\.hp \+ 25\)/.test(coffeeBody[1]), 'Coffee must heal exactly +25 capped at maxHp');
assert(!/speed|shield|invulnerab|attackDamage|skillDamage/i.test(coffeeBody[1]), 'Coffee must not grant combat or movement buffs');

const exactCoinPass = newCoins.every((coin, index) => coin.x === oldCoins[index].x && coin.y === oldCoins[index].y);
const coffeeLocationsPass = newCoffee.every(coffee => newLevel.platforms.some(platform =>
  platform.type === 'brick' && coffee.x >= platform.x && coffee.x <= platform.x + platform.w && coffee.y === platform.y - 40
));
console.log(`Coins: ${newCoins.length} current / ${oldCoins.length} v9.6; exact placements: ${exactCoinPass ? 'PASS' : 'FAIL'}`);
console.log(`Coffee: ${newCoffee.length} current / ${oldCoffee.length} v9.6; +25 capped semantics: PASS; jump-platform locations: ${coffeeLocationsPass ? 'PASS' : 'FAIL'}`);
process.exit(exactCoinPass && coffeeLocationsPass ? 0 : 1);
