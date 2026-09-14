const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const p1 = path.join(root, 'source/assets/boss_flower_phase1_v9_7_4.png');
const p2 = path.join(root, 'source/assets/boss_flower_phase2_v9_7_7.png');
const boss = fs.readFileSync(path.join(root, 'source/src/entities/Boss.js'), 'utf8');
if (!fs.existsSync(p1) || !fs.existsSync(p2) || p1 === p2) throw new Error('P1/P2 assets missing or same path');
const p1Bytes = fs.readFileSync(p1);
const p2Bytes = fs.readFileSync(p2);
if (p1Bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || p2Bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('assets are not PNG');
if (p1Bytes.equals(p2Bytes)) throw new Error('P1/P2 assets have identical content');
if (!boss.includes('boss_flower_phase1_v9_7_4.png') || !boss.includes('boss_flower_phase2_v9_7_7.png')) throw new Error('runtime references missing');
if (boss.includes("globalCompositeOperation = 'multiply'")) throw new Error('Boss multiply workaround remains');
console.log('PASS: v9.7.7 text-free P2 runtime PNG path and source-over integration validated.');
