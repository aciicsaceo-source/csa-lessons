const DEFAULT_LESSON = "Y1_T1_W01";
const qs = (s)=>document.querySelector(s);

function cleanText(s){
  if(!s) return "";
  return String(s)
    .replace(/<[^>]*>/g,"")
    .replace(/\u00a0/g," ")
    .replace(/[^\S\r\n]+/g," ")
    .trim();
}
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

let lesson=null, stepIndex=0, doneSteps=new Set();
let typingAbort={abort:false};
let cortexSpikeUntil=0;
let currentZoom=1.0;

const elTitle=qs("#lessonTitle"), elBubble=qs("#bubbleText"), elStepPill=qs("#stepPill"), elStepTitle=qs("#stepTitle");
const elBlocks=qs("#blocksSvg"), elBlocksFallback=qs("#blocksFallback"), elBlocksStatus=qs("#blocksStatus"), elProgress=qs("#progressBar");
const btnBack=qs("#backBtn"), btnNext=qs("#nextBtn"), btnComplete=qs("#completeBtn"), btnHint=qs("#hintBtn"), btnRestart=qs("#restartBtn");
const hintBox=qs("#hintBox"), elHintText=qs("#hintText");
const bubbleEl=qs("#bubble");
const zoomControls=qs("#zoomControls"), zoomLevel=qs("#zoomLevel");
const btnZoomIn=qs("#zoomInBtn"), btnZoomOut=qs("#zoomOutBtn"), btnZoomReset=qs("#zoomResetBtn");
const levelSelector=qs("#levelSelector");

let scratchblocksReady = null;
function setBlocksStatus(msg){
  if(!msg){ elBlocksStatus.classList.add("hidden"); elBlocksStatus.textContent=""; return; }
  elBlocksStatus.textContent = msg;
  elBlocksStatus.classList.remove("hidden");
}
function injectScript(src){
  return new Promise((resolve)=>{
    const s=document.createElement("script");
    s.src=src;
    s.async=true;
    s.onload=()=>resolve(true);
    s.onerror=()=>resolve(false);
    document.head.appendChild(s);
  });
}
async function loadScratchblocks(){
  if(scratchblocksReady) return scratchblocksReady;
  scratchblocksReady = (async ()=>{
    if(window.scratchblocks){
      console.log("[CSA] scratchblocks already available");
      setBlocksStatus("");
      return true;
    }
    
    const cssUrls = [
      "https://cdn.jsdelivr.net/npm/scratchblocks@3.6.4/build/scratchblocks.min.css",
      "https://unpkg.com/scratchblocks@3.6.4/build/scratchblocks.min.css"
    ];
    let cssLoaded = false;
    for(const cssUrl of cssUrls){
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = cssUrl;
      link.onload = () => { cssLoaded = true; };
      link.onerror = () => { console.warn("[CSA] CSS failed from", cssUrl); };
      document.head.appendChild(link);
      await new Promise(r => setTimeout(r, 100));
      if(cssLoaded) break;
    }
    
    const sources = [
      "https://cdn.jsdelivr.net/npm/scratchblocks@3.6.4/build/scratchblocks.min.js",
      "https://unpkg.com/scratchblocks@3.6.4/build/scratchblocks.min.js"
    ];
    setBlocksStatus("Loading Scratch blocks renderer…");
    for(const src of sources){
      console.log("[CSA] loading scratchblocks:", src);
      const ok = await injectScript(src);
      if(ok && window.scratchblocks){
        console.log("[CSA] scratchblocks loaded OK");
        setBlocksStatus("");
        return true;
      }
      console.warn("[CSA] failed to load from", src);
    }
    console.error("[CSA] scratchblocks failed to load from all CDNs.");
    setBlocksStatus("Scratch blocks failed to load (CDN blocked).");
    return false;
  })();
  return scratchblocksReady;
}

// === Zoom Controls ===
function updateZoom(){
  elBlocks.style.transform = `scale(${currentZoom})`;
  zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
}

function autoZoomToFit(){
  const svg = elBlocks.querySelector("svg");
  if(!svg) return;
  
  const container = elBlocks.parentElement;
  const svgHeight = svg.getBoundingClientRect().height;
  const containerHeight = container.clientHeight - 80;
  
  if(svgHeight > containerHeight){
    currentZoom = Math.max(0.4, containerHeight / svgHeight);
    updateZoom();
  } else {
    currentZoom = 1.0;
    updateZoom();
  }
}

btnZoomIn.addEventListener("click", ()=>{
  currentZoom = Math.min(2.0, currentZoom + 0.1);
  updateZoom();
});

btnZoomOut.addEventListener("click", ()=>{
  currentZoom = Math.max(0.3, currentZoom - 0.1);
  updateZoom();
});

btnZoomReset.addEventListener("click", ()=>{
  autoZoomToFit();
});

// === Cortex Animation ===
const logoImg=qs("#csaLogo");
const leftPanel=qs("#leftPanel");
const canvas=qs("#cortexCanvas");
const ctx=canvas.getContext("2d");

function resizeCanvas(){
  const r=leftPanel.getBoundingClientRect();
  canvas.width=Math.floor(r.width*devicePixelRatio);
  canvas.height=Math.floor(r.height*devicePixelRatio);
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
}
window.addEventListener("resize", resizeCanvas);

const PAL={ red:"#ff3b30", amber:"#ffb020", blue:"#1e86ff" };
const particles=[];
let lastEmit=0;

const CM_TO_PX = 37.8;
const CUBE_CENTERS = { left: 0.33, mid: 0.50, right: 0.67 };
const CUBE_OFFSETS = { left: -1.1 * CM_TO_PX, mid: -0.8 * CM_TO_PX, right: -0.3 * CM_TO_PX };
const EMIT_Y_RATIO = 0.30;
const EMIT_IDLE_MS = 200;
const EMIT_ACTIVE_MS = 40;

function spawnDot(x,y,color,speed,alpha,size,vx){
  particles.push({x,y,vy:speed,vx:vx||0,alpha,size, color, life:0, maxLife:300+Math.random()*200});
}

function getBubbleBottomY(){
  const panel = leftPanel.getBoundingClientRect();
  const bubble = bubbleEl.getBoundingClientRect();
  return bubble.bottom - panel.top;
}

function emit(){
  const now = performance.now();
  const active = now < cortexSpikeUntil;
  const interval = active ? EMIT_ACTIVE_MS : EMIT_IDLE_MS;
  if(now - lastEmit < interval) return;
  lastEmit = now;

  const panel = leftPanel.getBoundingClientRect();
  const rect  = logoImg.getBoundingClientRect();
  const left = rect.left - panel.left;
  const top  = rect.top  - panel.top;
  const w    = rect.width;
  const h    = rect.height;

  const originY = top + h * EMIT_Y_RATIO;
  const leftX  = left + w * CUBE_CENTERS.left + CUBE_OFFSETS.left;
  const midX   = left + w * CUBE_CENTERS.mid + CUBE_OFFSETS.mid;
  const rightX = left + w * CUBE_CENTERS.right + CUBE_OFFSETS.right;

  if(!active){
    spawnDot(leftX + (Math.random()-0.5)*6, originY + Math.random()*3, PAL.red, 0.3+Math.random()*0.2, 0.25+Math.random()*0.15, 2+Math.random()*2, 0);
    spawnDot(midX + (Math.random()-0.5)*6, originY + Math.random()*3, PAL.amber, 0.3+Math.random()*0.2, 0.25+Math.random()*0.15, 2+Math.random()*2, 0);
    spawnDot(rightX + (Math.random()-0.5)*6, originY + Math.random()*3, PAL.blue, 0.3+Math.random()*0.2, 0.25+Math.random()*0.15, 2+Math.random()*2, 0);
  }

  if(active){
    const burstCount = 15;
    for(let i=0;i<burstCount;i++){
      const r = Math.random();
      let x, color, vx;
      if(r < 0.60){ x = midX + (Math.random()-0.5)*20; color = PAL.amber; vx = 0; }
      else if(r < 0.80){ x = rightX + (Math.random()-0.5)*20; color = PAL.blue; vx = (midX - rightX) * 0.008; }
      else { x = leftX + (Math.random()-0.5)*20; color = PAL.red; vx = (midX - leftX) * 0.008; }
      spawnDot(x, originY + Math.random()*5, color, 1.2+Math.random()*1.8, 0.4+Math.random()*0.25, 3+Math.random()*3, vx);
    }
  }
}

function cortexTick(){
  resizeCanvas();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  emit();
  const bubbleBottom = getBubbleBottomY();
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.life++;
    p.y-=p.vy;
    p.x+=p.vx;
    const fade=Math.max(0,1-p.life/p.maxLife);
    ctx.globalAlpha=p.alpha*fade;
    ctx.fillStyle=p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
    ctx.fill();
    if(p.life>=p.maxLife || p.y<-240 || p.y <= bubbleBottom) particles.splice(i,1);
  }
  ctx.globalAlpha=1;
  requestAnimationFrame(cortexTick);
}

// === Progressive Unlocking System ===
function getLevelProgress(lessonId){
  try{
    const raw = localStorage.getItem(`CSA_LEVEL__${lessonId}`);
    if(!raw) return {unlockedLevel: 'basic', currentLevel: 'basic', completedLevels: []};
    const data = JSON.parse(raw);
    if(!data.currentLevel) data.currentLevel = data.unlockedLevel || 'basic';
    return data;
  }catch(_){
    return {unlockedLevel: 'basic', currentLevel: 'basic', completedLevels: []};
  }
}

function saveLevelProgress(lessonId, unlockedLevel, currentLevel, completedLevels){
  localStorage.setItem(`CSA_LEVEL__${lessonId}`, JSON.stringify({unlockedLevel, currentLevel, completedLevels}));
}

function unlockNextLevel(lessonId, completedLevel){
  const levelProgress = getLevelProgress(lessonId);
  if(!levelProgress.completedLevels.includes(completedLevel)){
    levelProgress.completedLevels.push(completedLevel);
  }
  let newUnlockedLevel = levelProgress.unlockedLevel;
  if(completedLevel === 'basic' && levelProgress.unlockedLevel === 'basic'){
    newUnlockedLevel = 'standard';
  } else if(completedLevel === 'standard' && levelProgress.unlockedLevel === 'standard'){
    newUnlockedLevel = 'advanced';
  }
  saveLevelProgress(lessonId, newUnlockedLevel, levelProgress.currentLevel, levelProgress.completedLevels);
  return newUnlockedLevel;
}

function setCurrentLevel(lessonId, level){
  const levelProgress = getLevelProgress(lessonId);
  saveLevelProgress(lessonId, levelProgress.unlockedLevel, level, levelProgress.completedLevels);
}

function getCurrentSteps(lesson){
  const levelProgress = getLevelProgress(lesson.lessonId);
  const currentLevel = levelProgress.currentLevel;
  
  if(currentLevel === 'basic' && lesson.steps_basic){
    return {steps: lesson.steps_basic, level: 'basic'};
  } else if(currentLevel === 'standard' && lesson.steps_standard){
    return {steps: lesson.steps_standard, level: 'standard'};
  } else if(currentLevel === 'advanced' && lesson.steps_advanced){
    return {steps: lesson.steps_advanced, level: 'advanced'};
  }
  return {steps: lesson.steps_basic || lesson.steps || [], level: 'basic'};
}

function updateLevelSelector(){
  const levelProgress = getLevelProgress(lesson.lessonId);
  
  // Enable/disable options based on unlocked levels
  Array.from(levelSelector.options).forEach(option => {
    const level = option.value;
    if(level === 'basic'){
      option.disabled = false;
    } else if(level === 'standard'){
      option.disabled = levelProgress.unlockedLevel === 'basic';
    } else if(level === 'advanced'){
      option.disabled = levelProgress.unlockedLevel !== 'advanced';
    }
  });
  
  // Set current selection
  levelSelector.value = levelProgress.currentLevel;
}

// Level selector change handler
levelSelector.addEventListener('change', async ()=>{
  const selectedLevel = levelSelector.value;
  const levelProgress = getLevelProgress(lesson.lessonId);
  
  // Check if level is unlocked
  if(selectedLevel === 'standard' && levelProgress.unlockedLevel === 'basic'){
    alert('Standard level is locked. Complete Basic level first!');
    levelSelector.value = levelProgress.currentLevel;
    return;
  }
  if(selectedLevel === 'advanced' && levelProgress.unlockedLevel !== 'advanced'){
    alert('Advanced level is locked. Complete Standard level first!');
    levelSelector.value = levelProgress.currentLevel;
    return;
  }
  
  // Switch to selected level
  setCurrentLevel(lesson.lessonId, selectedLevel);
  clearProgress(lesson.lessonId);
  stepIndex = 0;
  doneSteps = new Set();
  spike();
  await renderStep();
});

// === Lesson loader & UI ===
function getLessonId(){ return new URL(location.href).searchParams.get("lesson") || DEFAULT_LESSON; }
async function loadLesson(lessonId){
  const res=await fetch(`${lessonId}.json`, {cache:"no-store"});
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}
function key(id){ return `CSA_PROGRESS__${id}`; }
function save(id){ localStorage.setItem(key(id), JSON.stringify({stepIndex, done:[...doneSteps]})); }
function loadProgress(id){
  try{
    const raw=localStorage.getItem(key(id)); if(!raw) return;
    const p=JSON.parse(raw);
    const currentSteps = getCurrentSteps(lesson).steps;
    stepIndex=Math.max(0, Math.min(p.stepIndex||0, (currentSteps?.length||1)-1));
    doneSteps=new Set(p.done||[]);
  }catch(_){}
}
function clearProgress(id){ localStorage.removeItem(key(id)); }

async function typeBubble(text){
  typingAbort.abort=true; await sleep(10); typingAbort={abort:false};
  const t=cleanText(text);
  elBubble.textContent="";
  cortexSpikeUntil=performance.now()+1500;
  for(let i=0;i<t.length;i++){
    if(typingAbort.abort) return;
    elBubble.textContent+=t[i];
    await sleep(14);
  }
}

async function renderBlocks(blocksText){
  elBlocks.innerHTML="";
  elBlocksFallback.classList.add("hidden");
  zoomControls.classList.add("hidden");

  const t=(blocksText||"").trim();
  if(!t){
    elBlocksFallback.textContent="No blocks needed for this step.";
    elBlocksFallback.classList.remove("hidden");
    return;
  }

  const ok = await loadScratchblocks();
  if(!ok || !window.scratchblocks){
    console.warn("[CSA] scratchblocks not available; using text fallback");
    elBlocksFallback.textContent=t;
    elBlocksFallback.classList.remove("hidden");
    return;
  }

  const pre=document.createElement("pre");
  pre.className="blocks";
  pre.textContent=t;
  elBlocks.appendChild(pre);

  try{
    scratchblocks.renderMatching("pre.blocks", {style:"scratch3"});
    await sleep(200);
    const hasSvg = elBlocks.querySelector("svg");
    if(!hasSvg){
      elBlocksFallback.textContent=t;
      elBlocksFallback.classList.remove("hidden");
      setBlocksStatus("Scratchblocks returned no SVG.");
    }else{
      setBlocksStatus("");
      zoomControls.classList.remove("hidden");
      autoZoomToFit();
    }
  }catch(e){
    console.error("[CSA] scratchblocks render error:", e);
    setBlocksStatus("Scratch blocks render error.");
    elBlocksFallback.textContent=t;
    elBlocksFallback.classList.remove("hidden");
  }
}

function setProgress(){
  const currentData = getCurrentSteps(lesson);
  const total = currentData.steps.length;
  const pct=Math.round(((stepIndex+1)/total)*100);
  elProgress.style.width=`${pct}%`;
}

function hideHint(){ hintBox.classList.add("hidden"); }
function showHint(){
  const currentData = getCurrentSteps(lesson);
  const step = currentData.steps[stepIndex];
  elHintText.textContent=cleanText(step.hint || "Try again – check the blocks panel.");
  hintBox.classList.remove("hidden");
}

function spike(){ cortexSpikeUntil=performance.now()+1600; }

async function renderStep(){
  const currentData = getCurrentSteps(lesson);
  const step = currentData.steps[stepIndex];
  const total = currentData.steps.length;
  const levelLabel = currentData.level.charAt(0).toUpperCase() + currentData.level.slice(1);
  const isLastStep = (stepIndex === total - 1);

  elTitle.textContent=`${lesson.year} · ${lesson.term} · ${lesson.week} – ${lesson.title} [${levelLabel}]`;
  elStepPill.textContent=`Step ${stepIndex+1} of ${total}`;
  elStepTitle.textContent=cleanText(step.title||"Step");

  hideHint();
  spike();
  await typeBubble(step.instruction);

  const blocks = step.blocks_text ?? step.blocks ?? step.scratchblocks ?? step.blockText ?? "";
  await renderBlocks(blocks);

  setProgress();
  updateLevelSelector();

  btnBack.disabled=(stepIndex===0);
  btnNext.disabled=isLastStep;
  
  if(isLastStep){
    btnComplete.classList.remove("hidden");
    btnNext.classList.add("hidden");
  } else {
    btnComplete.classList.add("hidden");
    btnNext.classList.remove("hidden");
  }
}

async function completeLevel(){
  const currentData = getCurrentSteps(lesson);
  const currentLevel = currentData.level;
  const newUnlockedLevel = unlockNextLevel(lesson.lessonId, currentLevel);
  spike();
  
  if(newUnlockedLevel !== currentLevel){
    const levelNames = {basic: 'Basic', standard: 'Standard', advanced: 'Advanced'};
    const ready = confirm(`🎉 Congratulations! You've completed ${levelNames[currentLevel]} level!\n\n${levelNames[newUnlockedLevel]} level is now unlocked.\n\nAre you ready for ${levelNames[newUnlockedLevel]} level?`);
    
    if(ready){
      setCurrentLevel(lesson.lessonId, newUnlockedLevel);
      clearProgress(lesson.lessonId);
      stepIndex = 0;
      doneSteps = new Set();
      await renderStep();
    } else {
      alert("No problem! Use the level selector or click Restart to try " + levelNames[newUnlockedLevel] + " level.");
    }
  } else {
    alert("🎉 Amazing work! You've completed all levels for this lesson!");
  }
}

btnBack.addEventListener("click", async ()=>{
  stepIndex=Math.max(0, stepIndex-1);
  spike();
  await renderStep(); 
  save(lesson.lessonId);
});

btnNext.addEventListener("click", async ()=>{
  const currentData = getCurrentSteps(lesson);
  if(stepIndex>=currentData.steps.length-1) return;
  stepIndex++;
  spike();
  await renderStep(); 
  save(lesson.lessonId);
});

btnComplete.addEventListener("click", completeLevel);
btnHint.addEventListener("click", showHint);

btnRestart.addEventListener("click", async ()=>{
  // Reset to Basic level
  setCurrentLevel(lesson.lessonId, 'basic');
  clearProgress(lesson.lessonId);
  stepIndex=0; 
  doneSteps=new Set();
  spike();
  await renderStep();
});

(async function init(){
  resizeCanvas();
  requestAnimationFrame(cortexTick);
  await loadScratchblocks();

  const lessonId=getLessonId();
  try{
    lesson=await loadLesson(lessonId);
    lesson.lessonId=lessonId;
    loadProgress(lessonId);
    await renderStep();
  }catch(e){
    console.error("[CSA] lesson load error", e);
    elTitle.textContent="Lesson load error";
    elStepTitle.textContent="Could not load lesson";
    elBubble.textContent=`Could not load ${lessonId}.json`;
  }
})();
