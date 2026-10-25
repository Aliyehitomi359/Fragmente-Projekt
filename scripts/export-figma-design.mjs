import fs from 'node:fs/promises';
import path from 'node:path';

const out = path.resolve('outputs/figma-ui');
await fs.mkdir(path.join(out, 'figma-plugin'), { recursive: true });
const C = {
  'Brand / Orange red': '#611412', 'Brand / Header text': '#F7EADE',
  'Workspace / Black': '#02121F', 'UI / Ink': '#252B28',
  'UI / Paper': '#D4B275', 'UI / Sidebar': '#A3936F',
  'UI / Strip': '#AF3724', 'UI / Button': '#F0EEE2',
  'UI / Upload': '#76A895', 'UI / Mode active': '#AF3724',
  'UI / Line': '#B9B5AC', 'UI / Muted': '#706E68',
  'Tools / Cyan': '#B0D5C5', 'Tools / Border': '#789C8B',
  'Tools / Previous cut': '#8FB8A8', 'UI / Fragment': '#F7F4EB',
  'UI / Highlight': '#FFFDF6', 'UI / Shadow': '#9B9486',
};
const words = ['夜色', 'the quiet between', '一首未完成的诗', 'still becoming', '纸上的森林', '没有名字的风', 'a little elsewhere', '停留片刻', 'das leise Licht', '不必抵达', 'hold the light', '把时间折起来'];
const scenes = [];
let nodes;
function rect(name, x, y, w, h, color, stroke, extra = {}) { nodes.push({ type: 'rect', name, x, y, w, h, color, stroke, ...extra }); }
function text(name, value, x, y, size = 12, color = 'UI / Ink', font = 'DM Mono', extra = {}) { nodes.push({ type: 'text', name, value, x, y, size, color, font, ...extra }); }
function button(name, label, x, y, w, h = 32, selected = false, tool = false) {
  const fill = tool ? 'Tools / Cyan' : name.endsWith('/ Upload') ? 'UI / Upload' : selected ? name.startsWith('04 Workspace') ? 'UI / Mode active' : 'Brand / Orange red' : 'UI / Button';
  rect(name + ' / Shadow', x + 1, y + 1, w, h, 'UI / Shadow');
  rect(name + ' / Face', x, y, w, h, fill, tool ? 'Tools / Border' : 'UI / Line');
  rect(name + ' / Highlight', x + 1, y + 1, w - 2, 1, 'UI / Highlight', null, { opacity: .5 });
  text(name + ' / Label', label, x + 10, y + (h - 12) / 2, 11, selected && !tool ? 'Brand / Header text' : 'UI / Ink');
}
function page(name, x, y, w, h) {
  rect(name + ' / Shadow', x + 4, y + 5, w, h, '#242522', null, { opacity: .18 });
  rect(name + ' / Paper', x, y, w, h, '#FAF8F0');
  const k = w / 660;
  text(name + ' / Running header', 'COLLECTED PAGES                         FRAGMENTE / 001', x + 72 * k, y + 43 * k, 12 * k, '#35362D', 'Georgia');
  rect(name + ' / Rule', x + 72 * k, y + 68 * k, 516 * k, 1, '#35362D');
  text(name + ' / Subtitle', 'On the art of paying attention', x + 72 * k, y + 108 * k, 22 * k, '#35362D', 'Georgia');
  text(name + ' / Title', '把日子慢慢拆开', x + 72 * k, y + 163 * k, 43 * k, '#35362D', 'Noto Serif SC');
  const lines = ['有时候，一句话并不需要走向终点。', '它只是停在那里，像窗边的一束光，', '把那些还没有名字的事物照亮。', '', '我把日子慢慢拆开，留下一点夜色，', '一点没有说完的话，还有纸上的森林。', '这些零散的词语，从别人的故事里，', '来到自己的桌面。', '', '一首未完成的诗，等待另一个词。', '也许我们寻找的，并不是一个答案，', '而是让陌生的事物再次相遇的方法。'];
  lines.forEach((line, i) => text(name + ' / Line ' + (i + 1), line, x + 72 * k, y + (258 + i * 38) * k, 23 * k, '#35362D', 'Noto Serif SC'));
  text(name + ' / Footnote', 'the quiet between one thing and another.', x + 72 * k, y + 790 * k, 18 * k, '#35362D', 'Georgia');
  text(name + ' / Footer', 'NOTES ON NOTICING                               17', x + 72 * k, y + 863 * k, 12 * k, '#35362D', 'Georgia');
}
function fragment(name, label, x, y, w = 118, h = 48) {
  rect(name + ' / Paper', x, y, w, h, '#FAF8F0');
  text(name + ' / Words', label, x + 8, y + h / 2 - 10, /[\u3400-\u9fff]/.test(label) ? 18 : 14, 'UI / Ink', /[\u3400-\u9fff]/.test(label) ? 'Noto Serif SC' : 'Georgia');
}
function base(mode) {
  nodes = [];
  rect('00 Background / Paper', 0, 0, 1440, 1000, 'UI / Paper');
  rect('01 Header / Orange red', 0, 0, 1440, 78, 'Brand / Orange red');
  text('01 Header / Mark', 'f.', 24, 24, 34, 'Brand / Header text', 'Special Elite');
  text('01 Header / Wordmark', 'Fragmente-Projekt', 67, 26, 27, 'Brand / Header text', 'Special Elite');
  rect('01 Header / Divider', 405, 22, 1, 34, 'Brand / Header text', null, { opacity: .45 });
  text('01 Header / Edition', 'A COLLECTION OF WORDS\nA PRACTICE OF NOTICING', 422, 24, 10, 'Brand / Header text');
  rect('01 Header / Saved dot', 1120, 37, 6, 6, '#B4C0A0');
  text('01 Header / Saved', 'Saved locally', 1134, 31, 11, 'Brand / Header text');
  rect('01 Header / Library frame', 1255, 27, 119, 25, 'Brand / Orange red', 'Brand / Header text');
  text('01 Header / Library label', 'LIBRARY № 01', 1265, 34, 10, 'Brand / Header text');
  text('01 Header / Menu', '☰', 1393, 27, 20, 'Brand / Header text', 'Arial');
  rect('02 Left panel / Background', 0, 78, 230, 922, 'UI / Sidebar');
  rect('02 Left panel / Divider', 229, 78, 1, 922, 'UI / Line');
  rect('03 Right panel / Background', 1150, 78, 290, 922, 'UI / Sidebar');
  rect('03 Right panel / Divider', 1150, 78, 1, 922, 'UI / Line');
  for (const [label, x, w] of [['Source material', 12, 206], [mode === 'table' ? 'Inspiration session 01' : 'Fragments', 1162, 266]]) {
    const isSource = label === 'Source material';
    const isSession = mode === 'table' && !isSource;
    text(label + ' / Section title', isSession ? label : isSource ? '📖' : '🏷️', x + 8, 96, isSession ? 13 : 28);
    if (!isSession) text(label + ' / Count', isSource ? '3' : String(words.length), x + 50, 104, 13);
  }
  button('02 Left panel / Upload', 'Upload sources                  ↥', 17, 145, 196, 49);
  button('02 Left panel / Sources tab', 'Sources', 17, 214, 76, 29, true);
  button('02 Left panel / Canvas tab', 'Canvases', 99, 214, 92, 29);
  rect('02 Left panel / Rule', 17, 259, 196, 1, 'UI / Line');
  text('02 Left panel / Filter', 'ALL SOURCES            01—03', 17, 275, 10, 'UI / Muted');
  ['A page worth keeping.', 'Notes on paying attention', '没有名字的风'].forEach((name, i) => {
    const y = 307 + i * 105;
    if (i === 0) rect('02 Left panel / Selected source', 17, y, 196, 94, '#EFEDDF', '#8D887D');
    page('02 Left panel / Thumbnail ' + i, 24, y + 13, 40, 56);
    text('02 Left panel / Name ' + i, name.length > 22 ? 'Notes on paying\nattention' : name === 'A page worth keeping.' ? 'A page worth\nkeeping.' : name, 75, y + 17, 11);
    text('02 Left panel / Metadata ' + i, 'Collected pages\np.' + (17 + i), 75, y + 53, 9, 'UI / Muted');
    text('02 Left panel / More ' + i, '⋯', 192, y + 24, 17);
  });
  rect('02 Left panel / Bottom rule', 17, 690, 196, 1, 'UI / Line');
  text('02 Left panel / Inventory', '3 sources / 12 fragments\nLast gathered · Today, 14:32\n\nPERSONAL COLLECTION / VOL. I', 17, 709, 10, 'UI / Muted');
  rect('04 Workspace / Mode strip', 230, 78, 920, 49, 'UI / Strip');
  button('04 Workspace / Workbench tab', '01 Workbench', 242, 87, 148, 31, mode === 'workbench');
  button('04 Workspace / Inspiration tab', '02 Inspiration Table', 399, 87, 206, 31, mode === 'table');
  button('04 Workspace / Canvas tab', '03 Collage Canvas', 614, 87, 182, 31, mode === 'canvas');
  text('04 Workspace / Title', mode === 'workbench' ? 'A page worth keeping.' : mode === 'table' ? 'Unexpected company.' : 'A little elsewhere', 254, 151, 16);
  text('04 Workspace / Metadata', mode === 'canvas' ? 'Canvas / 4:3' : 'Source / 001', 565, 155, 10, 'UI / Muted');
  if (mode === 'workbench') button('04 Workspace / Zoom', '100% ⤢', 1043, 145, 83, 29);
  rect('04 Workspace / Black workbench', 252, 196, 876, 692, 'Workspace / Black');
  text('04 Workspace / Footer', mode === 'canvas' ? 'A LITTLE ELSEWHERE / DRAFT' : 'FIELD NOTES / WORDS IN THE WILD', 254, 909, 10, 'UI / Muted');
  text('04 Workspace / Footer right', mode === 'canvas' ? 'ARCHIVE     EXPORT ↗' : 'CUT 02 · ORIGINAL INTACT', 921, 909, 10, 'UI / Muted');
  if (mode !== 'table') {
    button('03 Right panel / Upload', 'Upload fragments                     ↥', 1167, 145, 256, 49);
    ['All', 'Favorites', 'Default', '+'].forEach((label, i) => button('03 Right panel / Filter ' + label, label, 1167 + [0, 44, 126, 201][i], 214, [37, 75, 68, 29][i], 29, i === 0));
    text('03 Right panel / Search', '⌕  Text, book, author…', 1167, 269, 11, 'UI / Muted');
    rect('03 Right panel / Search rule', 1167, 290, 256, 1, 'UI / Ink');
    text('03 Right panel / Pagination', '01 / 01                       ←  →', 1167, 307, 10, 'UI / Muted');
    words.forEach((word, i) => {
      const x = 1167 + (i % 2) * 132, y = 341 + Math.floor(i / 2) * 94;
      rect('03 Right panel / Fragment ' + i + ' / Card', x, y, 124, 82, 'UI / Fragment', '#C5BFB4');
      fragment('03 Right panel / Fragment ' + i, word, x + 5, y + 6, 114, 39);
      rect('03 Right panel / Fragment ' + i + ' / Rule', x + 8, y + 52, 108, 1, '#D9D4CA');
      text('03 Right panel / Fragment ' + i + ' / OCR', word.length > 16 ? word.slice(0, 14) + '…' : word, x + 8, y + 62, 9);
      text('03 Right panel / Fragment ' + i + ' / Favorite', i === 0 || i === 5 ? '★' : '☆', x + 103, y + 58, 17, i === 0 || i === 5 ? 'Brand / Orange red' : 'UI / Ink', 'Georgia');
    });
  }
}
base('workbench');
page('05 Source page', 515, 224, 350, 493);
rect('06 Crop / Previous mask', 567, 375, 206, 24, 'Tools / Cyan', 'Tools / Previous cut', { opacity: .32, dash: true });
rect('06 Crop / Current selection', 585, 493, 224, 26, null, 'Tools / Cyan', { strokeWidth: 2 });
rect('06 Crop / Handle start', 582, 490, 5, 5, 'Tools / Cyan');
rect('06 Crop / Handle end', 806, 516, 5, 5, 'Tools / Cyan');
button('06 Crop / Save', 'Save to box ↗', 585, 529, 125, 31, false, true);
button('06 Crop / Cancel', '×', 715, 529, 30, 31, false, true);
scenes.push({ name: '01 Workbench', width: 1440, height: 1000, nodes });
base('table');
words.forEach((word, i) => fragment('05 Table / Paper ' + i, word, 283 + (i * 139) % 620, 235 + (i * 103) % 490, 150 + i % 3 * 24, 56));
rect('03 Right panel / Drop area', 1167, 145, 256, 75, null, 'Tools / Border', { dash: true });
text('03 Right panel / Drop label', 'Gathered words', 1210, 174, 12, 'UI / Muted');
[1, 3, 5].forEach((id, i) => { fragment('03 Right panel / Collected ' + i, words[id], 1175, 245 + i * 74, 186, 46); text('03 Right panel / Remove ' + i, '×', 1390, 258 + i * 74, 19); });
button('03 Right panel / Save session', 'Save as box ↗', 1167, 495, 256, 33, false, true);
text('03 Right panel / Temporary', '3 fragments gathered\nTemporary collection / 01', 1167, 552, 11, 'UI / Muted');
scenes.push({ name: '02 Inspiration Table', width: 1440, height: 1000, nodes });
base('canvas');
rect('05 Canvas / Paper', 323, 235, 734, 550, 'UI / Fragment');
fragment('05 Canvas / Fragment 0', words[0], 446, 344, 117, 55);
fragment('05 Canvas / Fragment 1', words[1], 578, 423, 225, 55);
fragment('05 Canvas / Fragment 6', words[6], 461, 570, 235, 55);
text('05 Canvas / Edition mark', 'FRAGMENTE / 001', 347, 745, 10, 'UI / Muted');
scenes.push({ name: '03 Collage Canvas', width: 1440, height: 1000, nodes });

const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const color = (value) => C[value] ?? value;
function svg(scene) {
  const parts = scene.nodes.map((n, i) => {
    const id = esc(n.name);
    if (n.type === 'rect') return `<g id="${id}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="${n.color ? color(n.color) : 'none'}"${n.stroke ? ` stroke="${color(n.stroke)}" stroke-width="${n.strokeWidth ?? 1}"` : ''}${n.opacity !== undefined ? ` opacity="${n.opacity}"` : ''}${n.dash ? ' stroke-dasharray="3 3"' : ''}/></g>`;
    return `<g id="${id}"><text x="${n.x}" y="${n.y + n.size}" fill="${color(n.color)}" font-family="${esc(n.font)}, monospace" font-size="${n.size}" xml:space="preserve">${n.value.split('\n').map((line, j) => `<tspan x="${n.x}" dy="${j === 0 ? 0 : n.size * 1.6}">${esc(line)}</tspan>`).join('')}</text></g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}"><title>Fragmente-Projekt / ${esc(scene.name)}</title>${parts.join('\n')}</svg>`;
}
for (const scene of scenes) await fs.writeFile(path.join(out, `${scene.name.replaceAll(' ', '-')}.svg`), svg(scene));
const tokens = Object.fromEntries(Object.entries(C).map(([name, value]) => [name, { $type: 'color', $value: value }]));
await fs.writeFile(path.join(out, 'colors.tokens.json'), JSON.stringify(tokens, null, 2));
await fs.writeFile(path.join(out, 'figma-plugin', 'manifest.json'), JSON.stringify({ name: 'Fragmente-Projekt Editable UI', id: 'fragmente-projekt-local-design-import', api: '1.0.0', main: 'code.js', editorType: ['figma'], networkAccess: { allowedDomains: ['none'] } }, null, 2));
const plugin = `const scenes=${JSON.stringify(scenes)};\nconst colors=${JSON.stringify(C)};\n` + String.raw`
function rgb(hex) { const h=hex.replace('#',''); return {r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255}; }
function paint(hex, opacity=1) { return [{type:'SOLID',color:rgb(colors[hex]||hex),opacity}]; }
(async()=>{
 const styles={};
 for(const [name,hex] of Object.entries(colors)){const style=figma.createPaintStyle();style.name='Fragmente / '+name;style.paints=paint(hex);styles[name]=style;}
 const available=await figma.listAvailableFontsAsync();const used=new Map();const missing=new Set();
 async function font(family){if(used.has(family))return used.get(family);const match=available.find(x=>x.fontName.family===family&&x.fontName.style==='Regular')||available.find(x=>x.fontName.family===family);let value=match?match.fontName:{family:'Inter',style:'Regular'};if(!match)missing.add(family);await figma.loadFontAsync(value);used.set(family,value);return value;}
 const frames=[];
 for(let index=0;index<scenes.length;index++){
  const scene=scenes[index],frame=figma.createFrame();frame.name='Fragmente / '+scene.name;frame.resize(scene.width,scene.height);frame.x=index*1520;frame.y=0;frame.fills=[];frames.push(frame);
  for(const n of scene.nodes){let node;if(n.type==='rect'){node=figma.createRectangle();node.resize(n.w,n.h);node.fills=n.color?paint(n.color,n.opacity??1):[];if(n.color&&styles[n.color]&&n.opacity===undefined)await node.setFillStyleIdAsync(styles[n.color].id);if(n.stroke){node.strokes=paint(n.stroke);node.strokeWeight=n.strokeWidth||1;}if(n.dash)node.dashPattern=[3,3];}
  else{node=figma.createText();node.fontName=await font(n.font);node.fontSize=n.size;node.characters=n.value;node.textAutoResize='WIDTH_AND_HEIGHT';node.fills=paint(n.color);if(styles[n.color])await node.setFillStyleIdAsync(styles[n.color].id);node.lineHeight={unit:'PERCENT',value:160};}
  frame.appendChild(node);node.name=n.name;node.x=n.x;node.y=n.y;}
 }
 figma.currentPage.selection=frames;figma.viewport.scrollAndZoomIntoView(frames);
 figma.closePlugin(missing.size?'Imported editable screens. Install missing fonts and rerun: '+[...missing].join(', '):'Imported 3 editable screens and local color styles.');
})().catch(error=>{figma.closePlugin('Import failed: '+error.message);});
`;
await fs.writeFile(path.join(out, 'figma-plugin', 'code.js'), plugin);
await fs.writeFile(path.join(out, 'READ-ME.zh-CN.md'), `# Fragmente-Projekt / Figma 调色包

基于当前红色标题栏、米白标题、近黑工作区、浅青蓝裁剪工具的预览设计。三个 1440 × 1000 的设计稿是重新构建的静态编辑稿，不是 HTML 自动转换或功能软件，部分示例布局与浏览器不同。色值以当前代码为准。

## 直接导入

把 01-Workbench.svg 拖进 Figma 画布即可。另两份分别是 Inspiration Table 和 Collage Canvas。颜色区域、按钮和书页均是 SVG 元素，没有整屏栅格化，也没有 foreignObject 或外部图片依赖。文本保留为 SVG text；Figma 的 SVG 导入对文字和字体的处理可能变化，需要原生文字图层时使用下方插件。

## 推荐：原生 Figma 图层与颜色样式

1. 在 Figma 桌面编辑器进入 Plugins → Development → Import plugin from manifest，选择 figma-plugin/manifest.json（菜单名称可能因版本不同）。
2. 运行 Fragmente-Projekt Editable UI。
3. 生成三个 Frame、可编辑文字/矩形和 Fragmente / … 本地颜色样式。插件不联网。
4. 使用的字体是 Special Elite、DM Mono、Georgia、Noto Serif SC、Arial。缺字体时插件会提示并临时使用 Inter；安装字体后可重新运行。SVG 和 PNG 本身不携带字体安装权限。

SVG 直接导入不会自动建立 Figma 颜色样式或 Auto Layout；插件会建立颜色样式，但也不包含组件系统、Auto Layout、软件逻辑和原型链接。

## 调色和交还

- 标题与主按钮：Brand / Orange red，#AF3724。
- 标题字：Brand / Header text，#F7EADE。
- 中间工作垫：Workspace / Black，#040000。
- 裁剪工具与选区：Tools / Cyan，#B0D5C5。
- 两侧背景：UI / Sidebar，#EEECE6。
- 页面背景：UI / Paper，#F5F3ED。
- 顶部导航条、栏目标题条：UI / Strip，#E2DFD7。

颜色调整可以修改本地颜色样式，或直接选矩形改 Fill。层名称包含 Header、Left panel、Right panel、Workspace、Crop、Canvas 等部位。

完成后从 Figma 选中 Frame 导出 SVG 发回来；再附一张 PNG 用于核对最终外观。如果用插件导入，最好把修改后的 HEX 色值也附上，因为导出 SVG 不一定完整保留样式名。无需改动真实 Library 或软件数据。

colors.tokens.json 是颜色对照文件，不是 Figma 原生 .fig 文件；要作为变量导入需要相应插件。本次没有生成原生 .fig 二进制文件。
`);
console.log(`Exported 3 SVGs, color tokens and local Figma importer to ${out}`);
