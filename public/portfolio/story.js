const zh = document.documentElement.lang === 'zh-CN';
const copy = zh ? {
  eyebrow:'自主发起的创作工具 · 可操作的 MVP',title:'Fragmente-Projekt',
  lead:'从阅读中收集字句，把偶然遇到的语言，变成自己的拼贴诗。',
  try:'体验真实 App', walkthrough:'先看创作流程 ↓',
  meta:['起点：个人与同伴的拼贴诗创作经历','我的职责：产品构思、交互与视觉设计、迭代验证','实现：借助 AI 辅助开发'],
  caption:'真实 App 截图，使用你提供的《都柏林人·死者》中文片段；不是界面效果图。',
  origin:'为什么做这个项目',
  originP:'我有较多拼贴诗创作经历。创作中，我和同伴会从阅读、截图与日常遇到的文字里收集片段。但片段散落在大大小小的盒子和电脑文件夹里：收集很容易，之后重新找到、组合和使用却不顺手。',
  originP2:'我希望把这段断开的过程连起来：看到一句话时先留下它，创作时再像翻找纸片一样重新遇见它，而不是先整理一堆文件才能开始。',
  quote:'收集文字可以随时发生；重新遇见它们，也应该足够自然。',
  flow:'真实产品如何工作',flowP:'下面是完整 App 的实际界面。切换步骤可以查看从原始页面到拼贴作品的流程。',
  steps:[
    ['收集与剪裁','保留字句的原貌','上传或粘贴截图，在工作台框选片段。剪裁区域作为标记覆盖在原图上，原始图片不会被破坏。OCR 文本用于检索，可以直接修正。','real-workbench.png'],
    ['发现组合','把整理变成探索','灵感桌把收集的片段散落开来，可以移动、翻找，再拖到右侧临时 session。找到一组有感觉的字句后，可以把它保存成一个 box。','real-inspiration.png'],
    ['选择画布','从素材进入创作','新作品从画布尺寸开始；已有作品仍然可以继续打开。创作与归档分开，不必为了保留进度而先宣告作品完成。','real-canvas-picker.png'],
    ['拼贴与导出','组合，而不是重新打字','把片段拖上画布，移动、缩放或二次剪裁，也可以调整背景。每个摆放位置引用素材，保留原来的字形、纸张和视觉语气。','real-canvas.png'],
  ],prev:'← 上一步',next:'下一步 →',decisions:'我做出的三个取舍',
  decisionsList:[
    ['让素材属于创作者','不设登录，不把私人阅读截图默认传到云端。网页端在浏览器本地保存；桌面版增加本地素材文件夹。'],
    ['保留字句原来的样子','裁下来的片段保留原本的字体和纸张背景，而不是变成重新打出的文字。同一个片段可以收进多个盒子，也可以反复放到不同画布上尝试组合，不必担心弄丢原来的素材。'],
    ['把片段放在一起，寻找联系','Inspiration Table 适合把一堆片段放在一起，寻找它们之间可能产生的碰撞或联系。可以把想用的片段拖到右侧临时收集，之后再决定要不要存成一个新盒子。'],
  ],
  role:'我的工作与项目进度',roleP:'我从自己的创作实践与同伴遇到的问题出发，定义使用流程，设计交互与视觉方向，并在实际使用中持续发现问题、提出修改和验证结果。代码实现借助 AI 编程工具完成，我的重点是把创作需求变成可用的产品。',
  status:'目前是持续迭代中的功能性 MVP，已有剪裁、检索、素材组织、灵感桌、拼贴画布与导出流程，尚未完成系统性的外部用户测试。我现在正在验证首次使用体验，下一步是用它进行长时间创作，并验证桌面截图流程的可用性。',
  desktop:'桌面采集入口',desktopP:'阅读时，不必先回到软件。悬浮球可以移到屏幕上顺手的位置，再展开菜单，截取想留下的字句。下面是桌面开发版的实际操作录屏。',
  hands:'亲手试一遍',handsP:'这里进入的是完整 App，不是另做的一套演示器。示例库包含 1 张中文原始截图、6 个片段和 1 个已有画布。',
  tasks:['在 Fragment Workbench 查看原图与已剪裁区域。','打开 Inspiration Table，把一个片段拖进右侧 session，再移除它。','打开 Collage Canvas → 雪落在字句之间，移动一个片段或新建自己的画布。'],
  safe:'示例数据使用独立的浏览器数据库，不会读取你的个人素材库。示例文字与检索文本已预填；首次实际 OCR 仍可能需要联网下载语言模型。建议使用电脑体验拖拽。',
  details:'展示材料说明',disclosure:'本页包含真实 App 的静态截图及创作者提供的桌面操作录屏。示例来自詹姆斯·乔伊斯《都柏林人·死者》；中文译者未注明。体验库的改动仅保存在访客自己的浏览器中；清除浏览器数据会清除它。系统级截图功能需要桌面版。',
  footer:'从创作实践出发的自主项目 · AI 辅助实现',top:'回到顶部 ↑',
} : {
  eyebrow:'Self-directed creative tool · Working MVP',title:'Fragmente-Projekt',
  lead:'Collect words while reading. Turn found language into collage poetry.',try:'Try the real app',walkthrough:'See the workflow first ↓',
  meta:['Origin: my own and peers’ collage-poetry practice','My role: product, interaction, visual direction & iteration','Implementation: AI-assisted development'],
  caption:'The actual app, using the supplied English excerpt from James Joyce’s Dubliners, The Dead. Not a UI mockup.',
  origin:'A tool born from making',originP:'I make collage poetry. In my own practice and conversations with peers, collecting words was easy; finding and using them again was not. Fragments ended up scattered across boxes of different sizes and folders on the computer, separated from the moment that made them worth keeping.',
  originP2:'I wanted to connect these moments: collect a phrase wherever I encounter it, then rediscover it like a paper fragment when I am ready to compose. Less file management before the creative work can begin.',
  quote:'Collecting language can happen anywhere. Returning to it should feel just as natural.',
  flow:'Inside the working product',flowP:'These are screenshots of the full app. Follow the steps from a source page to an editable collage.',
  steps:[
    ['Collect & cut','Keep the words as found','Upload or paste a screenshot, then select fragments in the workbench. Cut marks sit over the original image without altering it. Recognized text makes fragments searchable and can be corrected directly.','real-workbench.png'],
    ['Find combinations','Make room for surprise','The Inspiration Table scatters collected fragments so they can be moved and uncovered. Drag promising pieces into a temporary session, then keep that selection as a box when it feels useful.','real-inspiration.png'],
    ['Choose a canvas','Move from collecting to composing','Start a new piece at a chosen size, or return to an existing work. Saving progress and archiving a finished piece are separate actions.','real-canvas-picker.png'],
    ['Compose & export','Arrange, rather than retype','Move, resize and crop fragments on a canvas, and adjust its background. Placements reference the original material, preserving the typography and visual character of each found phrase.','real-canvas.png'],
  ],prev:'← Previous',next:'Next →',decisions:'Three deliberate choices',
  decisionsList:[
    ['Keep the collection personal','No login and no default cloud upload of private reading screenshots. The browser version saves locally; the desktop version adds a local library folder.'],
    ['Keep words as they were found','Cropped fragments keep their original typography and paper background instead of becoming retyped text. A fragment can belong to several boxes and be reused across canvases, so trying a new arrangement does not mean losing the original material.'],
    ['Bring fragments together','The Inspiration Table brings a pile of fragments together to explore possible connections and unexpected combinations. Promising pieces can be dragged into a temporary collection, then saved as a new box if useful.'],
  ],role:'My contribution & current progress',roleP:'I initiated the project from my own creative practice and peers’ frustrations, defined the workflow, directed the interactions and visual language, and iterated through hands-on use. I used AI coding tools for implementation, focusing on turning creative needs into a usable product.',
  status:'This is a working, evolving MVP with cropping, search, organization, an inspiration table, collage canvases and export. Systematic external usability testing is still to come. I am currently validating the first-use experience; next I will use it for longer creative sessions and test the usability of desktop capture.',
  desktop:'Collect beyond the app',desktopP:'Stay with the reading instead of switching back to the app. Move the floating capture control somewhere convenient, open its menu and capture the words worth keeping. Watch the actual desktop development build in use below.',
  hands:'Try a short creative session',handsP:'This opens the full app, not a second demonstration interface. It starts with 1 English source screenshot, 6 fragments and 1 existing canvas.',
  tasks:['Look at the original page and its cut marks in Fragment Workbench.','Open Inspiration Table. Drag a fragment into the session, then remove it.','Open Collage Canvas → Snow between words. Move a fragment, or start your own canvas.'],
  safe:'The sample library uses a separate browser database and does not read your personal collection. Example search text is prefilled; actual OCR may need an initial language-model download. A computer is recommended for drag-and-drop.',
  details:'About the demonstration material',disclosure:'This page includes screenshots of the real app and a desktop workflow recording provided by the maker. The example uses The Dead from James Joyce’s Dubliners. The Chinese translation’s translator is not identified. Changes to the sample library stay in each visitor’s browser and are lost if its data is cleared. System-level capture requires the desktop app.',
  footer:'A self-directed project rooted in creative practice · AI-assisted implementation',top:'Back to top ↑',
};
document.querySelector('#app').innerHTML = `
<header id="top"><nav><a class="brand" href="#top">Fragmente-Projekt</a><div class="language"><a href="./index.html" ${!zh?'aria-current="page"':''}>EN</a><a href="./zh.html" ${zh?'aria-current="page"':''}>中文</a></div></nav></header>
<main class="wrap"><section class="intro"><p class="eyebrow">${copy.eyebrow}</p><h1>${copy.title}</h1><p class="lead">${copy.lead}</p><div class="actions"><a class="primary" href="/?demo=1" target="_blank" rel="noopener">${copy.try} <span aria-hidden="true">↗</span></a><a href="#workflow">${copy.walkthrough}</a></div><div class="meta">${copy.meta.map(t=>`<span>${t}</span>`).join('')}</div></section>
<figure class="hero-shot"><img src="./real-canvas.png" width="1280" height="720" alt="${zh?'真实 App 中的双语拼贴画布、原始素材和片段库':'Actual app showing a bilingual collage, source material and the fragment library'}"><figcaption>${copy.caption}</figcaption></figure>
<section class="section"><div class="section-head"><span class="number">01</span><h2>${copy.origin}</h2></div><div class="columns"><div><p>${copy.originP}</p><p>${copy.originP2}</p></div><blockquote class="quote">${copy.quote}</blockquote></div></section>
<section class="section" id="workflow"><div class="section-head"><span class="number">02</span><h2>${copy.flow}</h2></div><p>${copy.flowP}</p><div class="steps" role="tablist" aria-label="${zh?'创作流程':'Creative workflow'}">${copy.steps.map((s,i)=>`<button role="tab" id="step-${i}" aria-controls="screen-panel" aria-selected="${i===0}" tabindex="${i===0?0:-1}" data-step="${i}">${String(i+1).padStart(2,'0')} / ${s[0]}</button>`).join('')}</div><figure class="screen" id="screen-panel" role="tabpanel" aria-labelledby="step-0"><img id="flow-image" src="./real-workbench.png" width="1280" height="720" alt="${copy.steps[0][1]}"><figcaption><h3 id="flow-title">${copy.steps[0][1]}</h3><p id="flow-body">${copy.steps[0][2]}</p></figcaption></figure><div class="next-step"><button id="previous">${copy.prev}</button><span class="small" id="step-count">1 / 4</span><button id="next">${copy.next}</button></div></section>
<section class="section"><div class="section-head"><span class="number">03</span><h2>${copy.decisions}</h2></div>${copy.decisionsList.map(d=>`<div class="decision"><h3>${d[0]}</h3><p>${d[1]}</p></div>`).join('')}</section>
<section class="section"><div class="section-head"><span class="number">04</span><h2>${copy.role}</h2></div><div class="columns"><p>${copy.roleP}</p><div class="status"><p>${copy.status}</p></div></div><div class="desktop-feature"><div><h3>${copy.desktop}</h3><p class="disclosure">${copy.desktopP}</p></div><img class="desktop-shot" src="./capture-menu.png" loading="lazy" alt="${zh?'桌面开发版悬浮截图菜单':'Floating capture menu in the desktop development build'}"></div></section>
<section class="section" id="try"><div class="section-head"><span class="number">05</span><h2>${copy.hands}</h2></div><p>${copy.handsP}</p><div class="try"><ol>${copy.tasks.map(t=>`<li>${t}</li>`).join('')}</ol><a class="primary" href="/?demo=1" target="_blank" rel="noopener">${copy.try} <span aria-hidden="true">↗</span></a><p class="small" style="margin-top:18px;margin-bottom:0">${copy.safe}</p></div><details><summary>${copy.details}</summary><p class="disclosure">${copy.disclosure}</p></details></section>
<footer><span>${copy.footer}</span><a href="#top">${copy.top}</a></footer></main>`.replaceAll('/?demo=1', '../?demo=1&lang=' + (zh ? 'zh' : 'en'))
  .replaceAll(/real-(canvas|workbench)\.png/g, (_, name) => `real-${name}-${zh ? 'zh' : 'en'}.png`)
  .replaceAll('双语拼贴', '中文拼贴').replaceAll('a bilingual collage', 'an English collage');
let active = 0;
const tabs = [...document.querySelectorAll('[data-step]')];
function showStep(index, focus = false) {
  active = (index + copy.steps.length) % copy.steps.length;
  tabs.forEach((tab,i)=> { tab.setAttribute('aria-selected',String(i===active)); tab.tabIndex=i===active?0:-1; });
  const [label,title,body,file] = copy.steps[active];
  const image=document.querySelector('#flow-image'); image.src='./'+file.replace('.png',`-${zh ? 'zh' : 'en'}.png`); image.alt=label+': '+title;
  document.querySelector('#flow-title').textContent=title;
  document.querySelector('#flow-body').textContent=body;
  document.querySelector('#step-count').textContent=`${active+1} / ${copy.steps.length}`;
  document.querySelector('#screen-panel').setAttribute('aria-labelledby','step-'+active);
  if(focus) tabs[active].focus();
}
tabs.forEach((tab,i)=> {tab.addEventListener('click',()=>showStep(i)); tab.addEventListener('keydown',event=> {
  const keys={ArrowRight:active+1,ArrowLeft:active-1,Home:0,End:tabs.length-1};
  if(event.key in keys){event.preventDefault();showStep(keys[event.key],true);}
});});
document.querySelector('#previous').addEventListener('click',()=>showStep(active-1));
document.querySelector('#next').addEventListener('click',()=>showStep(active+1));

const desktopFeature=document.querySelector('.desktop-feature');
desktopFeature.id='capture';
const recordingCopy=zh ? {
  title:'从阅读到收集',label:'桌面开发版 · 实际录屏',
  aria:'悬浮球采集片段的桌面操作录屏',fallback:'你的浏览器无法播放此视频，请使用下方链接打开。',
  error:'此浏览器无法播放这个视频格式。可以下载后使用本地播放器打开。',
  download:'下载录屏',note:'系统级截图功能需要桌面版；网页仅播放操作记录。',
} : {
  title:'From reading to collecting',label:'Desktop development build · Actual recording',
  aria:'Desktop recording of capturing a fragment with the floating control',
  fallback:'Your browser cannot play this video. Use the download link below.',
  error:'This browser cannot play this video format. Download it to watch in a local player.',
  download:'Download recording',note:'System-level capture requires the desktop app. This page plays a recording only.',
};
desktopFeature.innerHTML=`<div><h3>${copy.desktop}</h3><p class="disclosure">${copy.desktopP}</p></div>
  <figure class="capture-recording">
    <div class="capture-demo-heading"><strong>${recordingCopy.title}</strong><span>${recordingCopy.label}</span></div>
    <video controls playsinline preload="metadata" aria-label="${recordingCopy.aria}">
      <source src="./desktop-capture-${zh?'zh':'en'}.mp4" type="video/mp4">
      ${recordingCopy.fallback}
    </video>
    <p class="capture-video-error" role="status" hidden>${recordingCopy.error}</p>
    <figcaption><a href="./desktop-capture-${zh?'zh':'en'}.mp4" download>${recordingCopy.download}</a><span>${recordingCopy.note}</span></figcaption>
  </figure>`;
const recording=desktopFeature.querySelector('video');
function showVideoError(){desktopFeature.querySelector('.capture-video-error').hidden=false;}
recording.addEventListener('error',showVideoError);
recording.querySelector('source').addEventListener('error',showVideoError);
