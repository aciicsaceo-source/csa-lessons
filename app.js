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
const hintBox=qs("#hintBox"), elHintText=qs("#hintText"), btnCloseHint=qs("#closeHintBtn");

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

// === Cortex (dots floating from cube centers) ===
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

const CUBE_CENTERS = { left: 0.33, mid: 0.50, right: 0.67 };
const EMIT_Y_RATIO = 0.30; // slightly lower (closer to cube top)
const EMIT_IDLE_MS = 200;
const EMIT_ACTIVE_MS = 40;

function spawnDot(x,y,color,speed,alpha,size){
  particles.push({x,y,vy:speed,vx:0,alpha,size, color, life:0, maxLife:300+Math.random()*200});
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

  const leftX  = left + w * CUBE_CENTERS.left;
  const midX   = left + w * CUBE_CENTERS.mid;
  const rightX = left + w * CUBE_CENTERS.right;

  // Idle: slow floating dots from each cube center
  if(!active){
    // Red cube - slow red dots
    spawnDot(leftX + (Math.random()-0.5)*6, originY + Math.random()*3, PAL.red,
      0.3+Math.random()*0.2, 0.25+Math.random()*0.15, 2+Math.random()*2);
    
    // Amber cube - slow amber dots  
    spawnDot(midX + (Math.random()-0.5)*6, originY + Math.random()*3, PAL.amber,
      0.3+Math.random()*0.2, 0.25+Math.random()*0.15, 2+Math.random()*2);
    
    // Blue cube - slow blue dots
    spawnDot(rightX + (Math.random()-0.5)*6, originY + Math.random()*3, PAL.blue,
      0.3+Math.random()*0.2, 0.25+Math.random()*0.15, 2+Math.random()*2);
  }

  // Active (thinking): burst of faster, brighter dots
  if(active){
    const burstCount = 25;
    for(let i=0;i<burstCount;i++){
      const r = Math.random();
      let x, color;
      
      // More amber (yellow) dots when thinking, some red/blue
      if(r < 0.60){ 
        x = midX + (Math.random()-0.5)*20; 
        color = PAL.amber; 
      } else if(r < 0.80){ 
        x = rightX + (Math.random()-0.5)*20; 
        color = PAL.blue; 
      } else { 
        x = leftX + (Math.random()-0.5)*20; 
        color = PAL.red; 
      }

      spawnDot(x, originY + Math.random()*5, color,
        1.5+Math.random()*2.5, 0.5+Math.random()*0.3, 3+Math.random()*4);
    }
  }
}

function cortexTick(){
  resizeCanvas();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  emit();

  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.life++;
    p.y-=p.vy;

    const fade=Math.max(0,1-p.life/p.maxLife);
    ctx.globalAlpha=p.alpha*fade;

    // Draw dots instead of lines
    ctx.fillStyle=p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
    ctx.fill();

    if(p.life>=p.maxLife || p.y<-240) particles.splice(i,1);
  }
  ctx.globalAlpha=1;
  requestAnimationFrame(cortexTick);
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
    stepIndex=Math.max(0, Math.min(p.stepIndex||0, (lesson.steps?.length||1)-1));
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
  pre.className="blocks"; // Add class for scratchblocks
  pre.textContent=t;
  elBlocks.appendChild(pre);

  try{
    console.log("[CSA] Calling scratchblocks.render...");
    scratchblocks.renderMatching("pre.blocks", {style:"scratch3"});
    
    // Wait a moment for rendering to complete
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
  const total=lesson.steps.length;
  const pct=Math.round((doneSteps.size/total)*100);
  elProgress.style.width=`${pct}%`;
}

function hideHint(){ hintBox.classList.add("hidden"); }
function showHint(){
  const step=lesson.steps[stepIndex];
  elHintText.textContent=cleanText(step.hint || "Try again – check the blocks panel.");
  hintBox.classList.remove("hidden");
}

function spike(){ cortexSpikeUntil=performance.now()+1600; }

async function renderStep(){
  const step=lesson.steps[stepIndex];
  const total=lesson.steps.length;

  elTitle.textContent=`${lesson.year} · ${lesson.term} · ${lesson.week} – ${lesson.title}`;
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
}

btnBack.addEventListener("click", async ()=>{
  stepIndex=Math.max(0, stepIndex-1);
  spike();
  await renderStep(); save(lesson.lessonId);
});
btnNext.addEventListener("click", async ()=>{
  if(stepIndex>=lesson.steps.length-1) return;
  stepIndex++;
  spike();
  await renderStep(); save(lesson.lessonId);
});
btnDone.addEventListener("click", ()=>{
  doneSteps.add(stepIndex);
  save(lesson.lessonId);
  setProgress();
  spike();
});
btnHint.addEventListener("click", showHint);
btnCloseHint.addEventListener("click", hideHint);

btnRestart.addEventListener("click", async ()=>{
  clearProgress(lesson.lessonId);
  stepIndex=0; doneSteps=new Set();
  spike();
  await renderStep();
});

(async function init(){
  resizeCanvas();
  requestAnimationFrame(cortexTick);

  // preload scratchblocks early so it's ready when steps render
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
