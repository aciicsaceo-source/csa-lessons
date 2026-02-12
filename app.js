const DEFAULT_LESSON = "Y1_T1_W01";
const qs = (s)=>document.querySelector(s);

function cleanText(s){
  if(!s) return "";
  return String(s)
    .replace(/<[^>]*>/g,"")
    .replace(/\u00a0/g," ")
    .replace(/[^\S\r\n]+/g," ")
    .replace(/\\n/g,"\n")
    .trim();
}
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

let lesson=null, stepIndex=0, doneSteps=new Set();
let typingAbort={abort:false};
let cortexSpikeUntil=0;

const elTitle=qs("#lessonTitle"), elBubble=qs("#bubbleText"), elStepPill=qs("#stepPill"), elStepTitle=qs("#stepTitle");
const elBlocks=qs("#blocksSvg"), elBlocksFallback=qs("#blocksFallback"), elBlocksStatus=qs("#blocksStatus"), elProgress=qs("#progressBar");
const btnBack=qs("#backBtn"), btnNext=qs("#nextBtn"), btnDone=qs("#doneBtn"), btnHint=qs("#hintBtn"), btnRestart=qs("#restartBtn");
const hintBox=qs("#hintBox"), elHintText=qs("#hintText");
const bubbleEl=qs("#bubble");

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
    
    // Load CSS first (critical for rendering)
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
      await new Promise(r => setTimeout(r, 100)); // brief wait
      if(cssLoaded) break;
    }
    
    // IMPORTANT: unpkg is often blocked on some networks. Use jsDelivr first.
    const sources = [
      "https://cdn.jsdelivr.net/npm/scratchblocks@3.6.4/build/scratchblocks.min.js",
      "https://unpkg.com/scratchblocks@3.6.4/build/scratchblocks.min.js"
    ];
    setBlocksStatus("Loading Scratch blocks renderer… (if it fails, your network may block CDNs)");
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
    setBlocksStatus("Scratch blocks failed to load (CDN blocked). You'll see text blocks for now.");
    return false;
  })();
  return scratchblocksReady;
}

// === Cortex (dots floating from cube centers, stop at bubble) ===
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

// Adjusted positions: shift left by different amounts for each cube
const CM_TO_PX = 37.8;
const CUBE_CENTERS = { 
  left: 0.33,   // Red cube - shift left 1.1cm
  mid: 0.50,    // Amber cube - shift left 0.8cm
  right: 0.67   // Blue cube - shift left 0.3cm
};
const CUBE_OFFSETS = {
  left: -1.1 * CM_TO_PX,    // -41.58px
  mid: -0.8 * CM_TO_PX,     // -30.24px
  right: -0.3 * CM_TO_PX    // -11.34px
};

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

  // Calculate center positions with left shift offsets
  const leftX  = left + w * CUBE_CENTERS.left + CUBE_OFFSETS.left;
  const midX   = left + w * CUBE_CENTERS.mid + CUBE_OFFSETS.mid;
  const rightX = left + w * CUBE_CENTERS.right + CUBE_OFFSETS.right;

  // Idle: slow floating dots from each cube center
  if(!active){
    // Red cube - slow red dots
    spawnDot(leftX + (Math.random()-0.5)*6, originY + Math.random()*3, PAL.red,
      0.3+Math.random()*0.2, 0.25+Math.random()*0.15, 2+Math.random()*2, 0);
    
    // Amber cube - slow amber dots  
    spawnDot(midX + (Math.random()-0.5)*6, originY + Math.random()*3, PAL.amber,
      0.3+Math.random()*0.2, 0.25+Math.random()*0.15, 2+Math.random()*2, 0);
    
    // Blue cube - slow blue dots
    spawnDot(rightX + (Math.random()-0.5)*6, originY + Math.random()*3, PAL.blue,
      0.3+Math.random()*0.2, 0.25+Math.random()*0.15, 2+Math.random()*2, 0);
  }

  // Active (thinking): burst of faster, brighter dots - RED and BLUE drift toward YELLOW
  if(active){
    const burstCount = 15; // Reduced from 25 for less intensity
    for(let i=0;i<burstCount;i++){
      const r = Math.random();
      let x, color, vx;
      
      // More amber (yellow) dots when thinking, some red/blue
      if(r < 0.60){ 
        x = midX + (Math.random()-0.5)*20; 
        color = PAL.amber;
        vx = 0; // Yellow stays centered
      } else if(r < 0.80){ 
        x = rightX + (Math.random()-0.5)*20; 
        color = PAL.blue;
        vx = (midX - rightX) * 0.008; // Blue drifts LEFT toward yellow
      } else { 
        x = leftX + (Math.random()-0.5)*20; 
        color = PAL.red;
        vx = (midX - leftX) * 0.008; // Red drifts RIGHT toward yellow
      }

      spawnDot(x, originY + Math.random()*5, color,
        1.2+Math.random()*1.8, 0.4+Math.random()*0.25, 3+Math.random()*3, vx); // Reduced speed and alpha
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

    // Draw dots instead of lines
    ctx.fillStyle=p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
    ctx.fill();

    // Remove if: reached max life, went off top, OR reached bubble bottom
    if(p.life>=p.maxLife || p.y<-240 || p.y <= bubbleBottom) {
      particles.splice(i,1);
    }
  }
  ctx.globalAlpha=1;
  requestAnimationFrame(cortexTick);
}

// === Progressive Unlocking System ===
function getLevelProgress(lessonId){
  try{
    const raw = localStorage.getItem(`CSA_LEVEL__${lessonId}`);
    if(!raw) return {unlockedLevel: 'basic', completedLevels: []};
    return JSON.parse(raw);
  }catch(_){
    return {unlockedLevel: 'basic', completedLevels: []};
  }
}

function saveLevelProgress(lessonId, unlockedLevel, completedLevels){
  localStorage.setItem(`CSA_LEVEL__${lessonId}`, JSON.stringify({unlockedLevel, completedLevels}));
}

function unlockNextLevel(lessonId, currentLevel){
  const levelProgress = getLevelProgress(lessonId);
  
  // Add current level to completed if not already there
  if(!levelProgress.completedLevels.includes(currentLevel)){
    levelProgress.completedLevels.push(currentLevel);
  }
  
  // Unlock next level
  if(currentLevel === 'basic' && levelProgress.unlockedLevel === 'basic'){
    levelProgress.unlockedLevel = 'standard';
  } else if(currentLevel === 'standard' && levelProgress.unlockedLevel === 'standard'){
    levelProgress.unlockedLevel = 'advanced';
  }
  
  saveLevelProgress(lessonId, levelProgress.unlockedLevel, levelProgress.completedLevels);
  return levelProgress.unlockedLevel;
}

function getCurrentSteps(lesson){
  const levelProgress = getLevelProgress(lesson.lessonId);
  const currentLevel = levelProgress.unlockedLevel;
  
  // Return steps based on unlocked level
  if(currentLevel === 'basic' && lesson.steps_basic){
    return {steps: lesson.steps_basic, level: 'basic'};
  } else if(currentLevel === 'standard' && lesson.steps_standard){
    return {steps: lesson.steps_standard, level: 'standard'};
  } else if(currentLevel === 'advanced' && lesson.steps_advanced){
    return {steps: lesson.steps_advanced, level: 'advanced'};
  }
  
  // Fallback to basic or generic steps
  return {steps: lesson.steps_basic || lesson.steps || [], level: 'basic'};
}

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
function clearProgress(id){ 
  localStorage.removeItem(key(id)); 
  // Don't clear level progress on restart
}

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

  console.log("[CSA] Attempting to render blocks:", t);
  console.log("[CSA] scratchblocks version:", window.scratchblocks);

  const pre=document.createElement("pre");
  pre.className="blocks";
  pre.textContent=t;
  elBlocks.appendChild(pre);

  try{
    console.log("[CSA] Calling scratchblocks.render...");
    scratchblocks.renderMatching("pre.blocks", {style:"scratch3"});
    
    await sleep(100);
    
    const hasSvg = elBlocks.querySelector("svg");
    if(!hasSvg){
      console.warn("[CSA] scratchblocks rendered but no SVG found; falling back to text");
      console.log("[CSA] elBlocks content:", elBlocks.innerHTML);
      elBlocksFallback.textContent=t;
      elBlocksFallback.classList.remove("hidden");
      setBlocksStatus("Scratchblocks returned no SVG. Check console.");
    }else{
      console.log("[CSA] SVG rendered successfully!");
      setBlocksStatus("");
    }
  }catch(e){
    console.error("[CSA] scratchblocks render error:", e);
    console.error("[CSA] Error details:", e.message, e.stack);
    setBlocksStatus("Scratch blocks render error: " + e.message);
    elBlocksFallback.textContent=t;
    elBlocksFallback.classList.remove("hidden");
  }
}

function setProgress(){
  const currentData = getCurrentSteps(lesson);
  const total = currentData.steps.length;
  const pct=Math.round((doneSteps.size/total)*100);
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

  elTitle.textContent=`${lesson.year} · ${lesson.term} · ${lesson.week} – ${lesson.title} [${levelLabel}]`;
  elStepPill.textContent=`Step ${stepIndex+1} of ${total}`;
  elStepTitle.textContent=cleanText(step.title||"Step");

  hideHint();
  spike();
  await typeBubble(step.instruction);

  const blocks = step.blocks_text ?? step.blocks ?? step.scratchblocks ?? step.blockText ?? "";
  await renderBlocks(blocks);

  setProgress();

  btnBack.disabled=(stepIndex===0);
  btnNext.disabled=(stepIndex===total-1);
  
  // Check if all steps are done - unlock next level
  checkLevelCompletion();
}

function checkLevelCompletion(){
  const currentData = getCurrentSteps(lesson);
  const total = currentData.steps.length;
  
  if(doneSteps.size === total){
    // All steps completed! Unlock next level
    const newLevel = unlockNextLevel(lesson.lessonId, currentData.level);
    
    if(newLevel !== currentData.level){
      // Show notification
      const levelNames = {basic: 'Basic', standard: 'Standard', advanced: 'Advanced'};
      alert(`🎉 Congratulations! You've completed ${levelNames[currentData.level]} level!\n\n${levelNames[newLevel]} level is now unlocked. Click Restart to try it!`);
    }
  }
}

btnBack.addEventListener("click", async ()=>{
  stepIndex=Math.max(0, stepIndex-1);
  spike();
  await renderStep(); save(lesson.lessonId);
});
btnNext.addEventListener("click", async ()=>{
  const currentData = getCurrentSteps(lesson);
  if(stepIndex>=currentData.steps.length-1) return;
  stepIndex++;
  spike();
  await renderStep(); save(lesson.lessonId);
});
btnDone.addEventListener("click", ()=>{
  doneSteps.add(stepIndex);
  save(lesson.lessonId);
  setProgress();
  spike();
  checkLevelCompletion();
});
btnHint.addEventListener("click", showHint);

btnRestart.addEventListener("click", async ()=>{
  clearProgress(lesson.lessonId);
  stepIndex=0; doneSteps=new Set();
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
    elBubble.textContent=`Could not load ${lessonId}.json\n\nFix:\n1) Upload ${lessonId}.json to GitHub root.\n2) Ensure filename matches lessonId exactly.\n3) Hard refresh (Ctrl+Shift+R).`;
    await renderBlocks("say [Could not load lesson] for (2) seconds");
  }
})();
