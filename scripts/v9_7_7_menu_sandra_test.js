const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('Could not find embedded runtime');

const fills = [];
global.window = { innerWidth: 960, innerHeight: 540, addEventListener: () => {}, AudioContext: class { constructor(){ this.currentTime=0; this.state='running'; this.destination={}; } createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}},connect(){}};} createOscillator(){return {frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){}};} createBiquadFilter(){return {frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},Q:{setValueAtTime(){}},connect(){}};} resume(){} } };
const ctx = { save(){},restore(){},translate(){},scale(){},rotate(){},fillRect(x,y,w,h){fills.push([x,y,w,h]);},strokeRect(){},beginPath(){},arc(){},ellipse(){},moveTo(){},lineTo(){},stroke(){},fill(){},closePath(){},drawImage(){},clearRect(){},fillText(){},setLineDash(){},clip(){},roundRect(){},rect(){},createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}} };
global.document = { getElementById: () => ({ getContext:()=>ctx, style:{}, addEventListener(){}, getBoundingClientRect:()=>({left:0,top:0,width:960,height:540}) }) };
global.Image = class { constructor(){this.complete=true;this.naturalWidth=256;this.naturalHeight=256;} };
global.navigator={maxTouchPoints:0}; global.requestAnimationFrame=()=>{}; global.performance={now:()=>0};
eval(scriptMatch[1]);
const { Game } = window.CommuterGame;
const game = new Game(); game.state='MENU'; game.renderMenu();
assert(!fills.some(([x,y,w,h]) => (x===24 || x===666) && y===285 && w===270 && h===214), 'Main menu must not render expanded instruction panels');
game.handlePointerDown(410,483,{pointerId:1});
assert.strictEqual(game.instructionsOpen,true,'Instructions button must remain clickable');
console.log('PASS: main menu keeps the instructions button without expanded guide panels.');
