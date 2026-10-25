import { useEffect, useMemo, useRef, useState, type CSSProperties, type ChangeEvent, type PointerEvent } from 'react';
import * as htmlToImage from 'html-to-image';
import Tesseract from 'tesseract.js';
import { FolderImports } from './FolderImports';
import {
  DEFAULT_BOX_ID,
  convertLibraryImage,
  loadAllData,
  nowIso,
  saveBox,
  saveCanvas,
  saveFragment,
  saveSource,
  deleteSource as deleteSourceFromDb,
  deleteFragment as deleteFragmentFromDb,
  deleteCanvas as deleteCanvasFromDb,
} from './db';
import { createId, cropImageBlob, downloadBlob, downloadDataUrl, objectUrl } from './imageUtils';
import type {
  AppData,
  CanvasFragmentPlacement,
  CollageCanvas,
  CutRegion,
  Fragment,
  FragmentBox,
  SourcePage,
} from './types';

type SelectionRect = { x: number; y: number; width: number; height: number };
type CropRect = { x: number; y: number; width: number; height: number };
type DragState =
  | { type: 'move'; placementId: string; startX: number; startY: number; originalX: number; originalY: number }
  | {
      type: 'resize';
      placementId: string;
      startX: number;
      startY: number;
      originalWidth: number;
      originalHeight: number;
    };
type CropDraft = {
  placementId: string;
  originalCrop?: CropRect;
  crop: CropRect;
};
type BackgroundDragState =
  | { type: 'move'; startX: number; startY: number; originalX: number; originalY: number }
  | {
      type: 'resize';
      corner: 'nw' | 'ne' | 'sw' | 'se';
      startX: number;
      startY: number;
      originalX: number;
      originalY: number;
      originalWidth: number;
      originalHeight: number;
    };
type TableFragmentLayout = {
  x: number;
  y: number;
  width: number;
  rotation: number;
  z: number;
};
type TableDragState = {
  fragmentId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  offsetX: number;
  offsetY: number;
  originalX: number;
  originalY: number;
};

type BackupSourcePage = Omit<SourcePage, 'imageBlob'> & {
  imageFile: string;
  imageType: string;
};

type BackupFragment = Omit<Fragment, 'imageBlob'> & {
  imageFile: string;
  imageType: string;
};

type BackupCanvas = Omit<CollageCanvas, 'backgroundImageBlob'> & {
  backgroundImageFile?: string;
  backgroundImageType?: string;
};

interface LibraryManifest {
  version: 1;
  exportedAt: string;
  sources: BackupSourcePage[];
  fragments: BackupFragment[];
  boxes: FragmentBox[];
  canvases: BackupCanvas[];
  canvas?: BackupCanvas;
}

const CANVAS_PRESETS = [
  { id: 'landscape-4-3', name: '4:3 Landscape', width: 1200, height: 900 },
  { id: 'portrait-3-4', name: '3:4 Portrait', width: 900, height: 1200 },
  { id: 'square', name: '1:1 Square', width: 1000, height: 1000 },
  { id: 'a4-portrait', name: 'A4 Portrait', width: 874, height: 1240 },
  { id: 'a4-landscape', name: 'A4 Landscape', width: 1240, height: 874 },
  { id: 'story', name: '9:16 Story', width: 720, height: 1280 },
  { id: 'wide', name: '16:9 Wide', width: 1280, height: 720 },
];

type CanvasPreset = (typeof CANVAS_PRESETS)[number];
type ExportFormat = 'png' | 'jpg' | 'webp';

const OCR_LANGUAGES = ['chi_sim', 'chi_tra', 'eng', 'deu'];

const TRADITIONAL_TO_SIMPLIFIED: Record<string, string> = {
  萬: '万',
  與: '与',
  專: '专',
  業: '业',
  東: '东',
  絲: '丝',
  丟: '丢',
  兩: '两',
  嚴: '严',
  喪: '丧',
  個: '个',
  臨: '临',
  為: '为',
  麼: '么',
  義: '义',
  烏: '乌',
  樂: '乐',
  喬: '乔',
  習: '习',
  鄉: '乡',
  書: '书',
  買: '买',
  亂: '乱',
  爭: '争',
  於: '于',
  虧: '亏',
  雲: '云',
  亞: '亚',
  產: '产',
  親: '亲',
  褻: '亵',
  億: '亿',
  僅: '仅',
  從: '从',
  倉: '仓',
  儀: '仪',
  價: '价',
  眾: '众',
  優: '优',
  會: '会',
  傘: '伞',
  偉: '伟',
  傳: '传',
  傷: '伤',
  倫: '伦',
  偽: '伪',
  餘: '余',
  佛: '佛',
  來: '来',
  侖: '仑',
  倆: '俩',
  係: '系',
  俠: '侠',
  侶: '侣',
  僥: '侥',
  僑: '侨',
  儈: '侩',
  儕: '侪',
  儂: '侬',
  俁: '俣',
  儔: '俦',
  儼: '俨',
  儷: '俪',
  儉: '俭',
  債: '债',
  傾: '倾',
  偵: '侦',
  側: '侧',
  償: '偿',
  儲: '储',
  兒: '儿',
  兌: '兑',
  兗: '兖',
  內: '内',
  冊: '册',
  寫: '写',
  軍: '军',
  農: '农',
  馮: '冯',
  衝: '冲',
  決: '决',
  況: '况',
  凍: '冻',
  淨: '净',
  涼: '凉',
  減: '减',
  湊: '凑',
  凜: '凛',
  幾: '几',
  鳳: '凤',
  憑: '凭',
  凱: '凯',
  鑿: '凿',
  別: '别',
  刪: '删',
  剎: '刹',
  劑: '剂',
  剮: '剐',
  劍: '剑',
  劇: '剧',
  剩: '剩',
  勸: '劝',
  辦: '办',
  務: '务',
  動: '动',
  勵: '励',
  勁: '劲',
  勞: '劳',
  勢: '势',
  勳: '勋',
  匱: '匮',
  區: '区',
  醫: '医',
  華: '华',
  協: '协',
  單: '单',
  賣: '卖',
  盧: '卢',
  衛: '卫',
  卻: '却',
  廠: '厂',
  廳: '厅',
  歷: '历',
  厲: '厉',
  壓: '压',
  厭: '厌',
  廁: '厕',
  廂: '厢',
  廈: '厦',
  廚: '厨',
  廄: '厩',
  縣: '县',
  參: '参',
  雙: '双',
  發: '发',
  變: '变',
  敘: '叙',
  葉: '叶',
  號: '号',
  嘆: '叹',
  迴: '回',
  團: '团',
  園: '园',
  圖: '图',
  國: '国',
  圍: '围',
  聖: '圣',
  場: '场',
  壞: '坏',
  塊: '块',
  堅: '坚',
  壇: '坛',
  壩: '坝',
  墳: '坟',
  墜: '坠',
  壟: '垄',
  壘: '垒',
  墾: '垦',
  執: '执',
  擴: '扩',
  掃: '扫',
  揚: '扬',
  擾: '扰',
  撫: '抚',
  摺: '折',
  搶: '抢',
  護: '护',
  報: '报',
  擔: '担',
  據: '据',
  擬: '拟',
  擁: '拥',
  擇: '择',
  擊: '击',
  掛: '挂',
  擠: '挤',
  揮: '挥',
  挾: '挟',
  撓: '挠',
  擋: '挡',
  撥: '拨',
  擱: '搁',
  攜: '携',
  攝: '摄',
  攢: '攒',
  敵: '敌',
  敗: '败',
  數: '数',
  齊: '齐',
  齋: '斋',
  鬥: '斗',
  斬: '斩',
  斷: '断',
  舊: '旧',
  時: '时',
  曠: '旷',
  昇: '升',
  晝: '昼',
  顯: '显',
  晉: '晋',
  曉: '晓',
  暈: '晕',
  暫: '暂',
  曖: '暧',
  術: '术',
  樸: '朴',
  機: '机',
  殺: '杀',
  雜: '杂',
  權: '权',
  條: '条',
  楊: '杨',
  杯: '杯',
  傑: '杰',
  極: '极',
  構: '构',
  標: '标',
  樣: '样',
  樓: '楼',
  樹: '树',
  橋: '桥',
  檢: '检',
  歡: '欢',
  歐: '欧',
  歲: '岁',
  歸: '归',
  殘: '残',
  殼: '壳',
  毀: '毁',
  畢: '毕',
  氣: '气',
  漢: '汉',
  湯: '汤',
  溝: '沟',
  沒: '没',
  澤: '泽',
  潔: '洁',
  淚: '泪',
  淺: '浅',
  漿: '浆',
  濁: '浊',
  測: '测',
  濟: '济',
  濃: '浓',
  濕: '湿',
  溫: '温',
  灣: '湾',
  滿: '满',
  滅: '灭',
  燈: '灯',
  靈: '灵',
  災: '灾',
  燦: '灿',
  爐: '炉',
  點: '点',
  煉: '炼',
  煙: '烟',
  熱: '热',
  愛: '爱',
  爺: '爷',
  牆: '墙',
  牽: '牵',
  犧: '牺',
  獨: '独',
  狹: '狭',
  獄: '狱',
  獎: '奖',
  獻: '献',
  瑪: '玛',
  環: '环',
  現: '现',
  瑣: '琐',
  畫: '画',
  當: '当',
  疇: '畴',
  療: '疗',
  癥: '症',
  痾: '疴',
  瘋: '疯',
  皺: '皱',
  盜: '盗',
  盞: '盏',
  盤: '盘',
  眥: '眦',
  睜: '睁',
  矚: '瞩',
  礎: '础',
  確: '确',
  碼: '码',
  禮: '礼',
  禍: '祸',
  種: '种',
  積: '积',
  穩: '稳',
  窮: '穷',
  竄: '窜',
  竅: '窍',
  竊: '窃',
  競: '竞',
  筆: '笔',
  節: '节',
  範: '范',
  築: '筑',
  簡: '简',
  糧: '粮',
  糾: '纠',
  紀: '纪',
  約: '约',
  紅: '红',
  級: '级',
  純: '纯',
  紙: '纸',
  納: '纳',
  紐: '纽',
  線: '线',
  練: '练',
  組: '组',
  細: '细',
  織: '织',
  終: '终',
  經: '经',
  結: '结',
  繞: '绕',
  給: '给',
  絕: '绝',
  統: '统',
  綠: '绿',
  維: '维',
  綱: '纲',
  網: '网',
  罷: '罢',
  羅: '罗',
  聽: '听',
  聞: '闻',
  聯: '联',
  聰: '聪',
  聲: '声',
  膽: '胆',
  腦: '脑',
  腫: '肿',
  腳: '脚',
  臉: '脸',
  臟: '脏',
  舉: '举',
  艱: '艰',
  藝: '艺',
  蘇: '苏',
  藥: '药',
  處: '处',
  虛: '虚',
  蟲: '虫',
  蠶: '蚕',
  蛇: '蛇',
  衆: '众',
  補: '补',
  裝: '装',
  裡: '里',
  製: '制',
  複: '复',
  見: '见',
  規: '规',
  視: '视',
  覺: '觉',
  覽: '览',
  觀: '观',
  計: '计',
  訂: '订',
  討: '讨',
  訓: '训',
  記: '记',
  設: '设',
  許: '许',
  論: '论',
  詩: '诗',
  話: '话',
  說: '说',
  語: '语',
  誤: '误',
  認: '认',
  課: '课',
  誰: '谁',
  調: '调',
  請: '请',
  諸: '诸',
  諾: '诺',
  謀: '谋',
  謂: '谓',
  謝: '谢',
  證: '证',
  識: '识',
  警: '警',
  譯: '译',
  議: '议',
  貝: '贝',
  負: '负',
  財: '财',
  貢: '贡',
  貧: '贫',
  貨: '货',
  販: '贩',
  責: '责',
  貴: '贵',
  費: '费',
  貼: '贴',
  貿: '贸',
  賀: '贺',
  資: '资',
  賊: '贼',
  賓: '宾',
  賞: '赏',
  賢: '贤',
  質: '质',
  賬: '账',
  賴: '赖',
  贊: '赞',
  贈: '赠',
  趕: '赶',
  趙: '赵',
  跡: '迹',
  踐: '践',
  車: '车',
  軋: '轧',
  軌: '轨',
  軟: '软',
  轉: '转',
  輪: '轮',
  輕: '轻',
  較: '较',
  載: '载',
  輝: '辉',
  輩: '辈',
  邊: '边',
  達: '达',
  遷: '迁',
  過: '过',
  運: '运',
  還: '还',
  這: '这',
  進: '进',
  遠: '远',
  違: '违',
  連: '连',
  遲: '迟',
  適: '适',
  選: '选',
  遺: '遗',
  郵: '邮',
  鄰: '邻',
  醜: '丑',
  醞: '酝',
  釀: '酿',
  釋: '释',
  鑑: '鉴',
  鑒: '鉴',
  鐵: '铁',
  鈴: '铃',
  銀: '银',
  銅: '铜',
  銘: '铭',
  錢: '钱',
  錯: '错',
  錄: '录',
  鍾: '钟',
  鎮: '镇',
  鏡: '镜',
  長: '长',
  門: '门',
  閃: '闪',
  閉: '闭',
  問: '问',
  開: '开',
  閑: '闲',
  間: '间',
  閣: '阁',
  閱: '阅',
  關: '关',
  隊: '队',
  陽: '阳',
  陰: '阴',
  陣: '阵',
  階: '阶',
  際: '际',
  隨: '随',
  險: '险',
  難: '难',
  雛: '雏',
  雞: '鸡',
  離: '离',
  雖: '虽',
  電: '电',
  霧: '雾',
  霽: '霁',
  靜: '静',
  頂: '顶',
  項: '项',
  順: '顺',
  須: '须',
  預: '预',
  頑: '顽',
  頓: '顿',
  領: '领',
  頰: '颊',
  頭: '头',
  顏: '颜',
  願: '愿',
  類: '类',
  風: '风',
  飛: '飞',
  飢: '饥',
  飯: '饭',
  飲: '饮',
  養: '养',
  館: '馆',
  馬: '马',
  駐: '驻',
  駕: '驾',
  驗: '验',
  騙: '骗',
  驚: '惊',
  體: '体',
  髮: '发',
  魚: '鱼',
  魯: '鲁',
  鮮: '鲜',
  鳥: '鸟',
  鳴: '鸣',
  鴨: '鸭',
  鴻: '鸿',
  龍: '龙',
  龜: '龟',
};

const SEARCH_TRADITIONAL_TO_SIMPLIFIED: Record<string, string> = {
  ...TRADITIONAL_TO_SIMPLIFIED,
  併: '并',
  乾: '干',
  幹: '干',
  後: '后',
  復: '复',
  複: '复',
  徵: '征',
  摺: '折',
  檯: '台',
  颱: '台',
  臺: '台',
  祇: '只',
  隻: '只',
  裏: '里',
  麵: '面',
  鬆: '松',
  鐘: '钟',
  鍾: '钟',
};

function normalizeOcrText(text: string) {
  return text
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/[^\x00-\x7F]/g, (char) => SEARCH_TRADITIONAL_TO_SIMPLIFIED[char] ?? char)
    .replace(/([\u3400-\u9fff])\s+(?=[\u3400-\u9fff])/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function overlapRatio(a: SelectionRect, b: SelectionRect) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const smallerArea = Math.min(a.width * a.height, b.width * b.height);
  return smallerArea ? intersection / smallerArea : 0;
}

function clampCrop(crop: CropRect): CropRect {
  const x = Math.min(Math.max(0, crop.x), 0.98);
  const y = Math.min(Math.max(0, crop.y), 0.98);
  const width = Math.min(Math.max(0.02, crop.width), 1 - x);
  const height = Math.min(Math.max(0.02, crop.height), 1 - y);
  return { x, y, width, height };
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function sourceSummary(source: SourcePage) {
  return [source.book, source.author, source.chapterOrPage, source.context, source.note].filter(Boolean).join(' · ');
}

function sourceNameFromOcr(text: string) {
  const compact = normalizeOcrText(text).replace(/\s+/g, '');
  return compact.slice(0, 20);
}

function normalizeSearchText(text: string) {
  return normalizeOcrText(text).toLocaleLowerCase().replace(/\s+/g, '');
}

function matchesSearchText(text: string, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return true;
  }
  return normalizeSearchText(text).includes(normalizedQuery);
}

function seededRandom(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += hash << 13;
    hash ^= hash >>> 7;
    hash += hash << 3;
    hash ^= hash >>> 17;
    hash += hash << 5;
    return ((hash >>> 0) % 10000) / 10000;
  };
}

function createTableLayout(fragments: Fragment[]): Record<string, TableFragmentLayout> {
  const columns = Math.max(4, Math.ceil(Math.sqrt(Math.max(1, fragments.length))));
  const cellWidth = 150;
  const cellHeight = 112;
  return fragments.reduce<Record<string, TableFragmentLayout>>((layout, fragment, index) => {
    const random = seededRandom(fragment.id);
    const column = index % columns;
    const row = Math.floor(index / columns);
    layout[fragment.id] = {
      x: 34 + column * cellWidth + random() * 72,
      y: 34 + row * cellHeight + random() * 54,
      width: 86 + random() * 96,
      rotation: -22 + random() * 44,
      z: index + 1,
    };
    return layout;
  }, {});
}

function imageExtension(blob: Blob) {
  if (blob.type === 'image/jpeg') {
    return 'jpg';
  }
  if (blob.type === 'image/webp') {
    return 'webp';
  }
  if (blob.type === 'image/gif') {
    return 'gif';
  }
  return 'png';
}

async function writeTextFile(directory: FileSystemDirectoryHandle, name: string, text: string) {
  const fileHandle = await directory.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(text);
  await writable.close();
}

async function writeBlobIfMissing(directory: FileSystemDirectoryHandle, name: string, blob: Blob) {
  try {
    await directory.getFileHandle(name, { create: false });
    return false;
  } catch {
    const fileHandle = await directory.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  }
}

async function readJsonFile<T>(directory: FileSystemDirectoryHandle, name: string) {
  const file = await (await directory.getFileHandle(name)).getFile();
  return JSON.parse(await file.text()) as T;
}

async function getImageDimensions(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dimensions;
}

function centeredPlacement(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  mode: 'cover' | 'center',
) {
  if (mode === 'cover') {
    const scale = Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight);
    const width = imageWidth * scale;
    const height = imageHeight * scale;
    return { x: (canvasWidth - width) / 2, y: (canvasHeight - height) / 2, width, height };
  }
  return {
    x: (canvasWidth - imageWidth) / 2,
    y: (canvasHeight - imageHeight) / 2,
    width: imageWidth,
    height: imageHeight,
  };
}

function BlobImage({
  blob,
  alt,
  className,
  style,
  onLoad,
  draggable,
  onDragStart,
}: {
  blob: Blob;
  alt: string;
  className?: string;
  style?: CSSProperties;
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLImageElement>) => void;
}) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const nextUrl = objectUrl(blob);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [blob]);

  if (!url) {
    return null;
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={style}
      onLoad={onLoad}
      draggable={draggable ?? false}
      onDragStart={onDragStart}
    />
  );
}

function UploadDropzone({
  label,
  hint,
  onFiles,
}: {
  label: string;
  hint: string;
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [active, setActive] = useState(false);

  function pickFiles(fileList: FileList | null) {
    if (!fileList) {
      return;
    }
    onFiles(Array.from(fileList).filter((file) => file.type.startsWith('image/')));
  }

  return (
    <div
      className={`dropzone ${active ? 'active' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setActive(false);
        pickFiles(event.dataTransfer.files);
      }}
    >
      <strong>{label}</strong>
      <span>{hint}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => pickFiles(event.target.files)}
      />
    </div>
  );
}

function EditableCanvasName({
  canvas,
  onRename,
}: {
  canvas: CollageCanvas;
  onRename: (canvasId: string, name: string) => void;
}) {
  const [draft, setDraft] = useState(canvas.name);
  const isComposingRef = useRef(false);

  useEffect(() => {
    setDraft(canvas.name);
  }, [canvas.name]);

  function commit() {
    const nextName = draft.trim() || canvas.name;
    setDraft(nextName);
    onRename(canvas.id, nextName);
  }

  return (
    <input
      className="canvas-name-input"
      aria-label="Canvas name"
      value={draft}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onCompositionStart={() => {
        isComposingRef.current = true;
      }}
      onCompositionEnd={() => {
        isComposingRef.current = false;
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing && !isComposingRef.current) {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function SourcePanel({
  sources,
  selectedSourceId,
  canvases,
  selectedCanvasId,
  notice,
  onUpload,
  onSelect,
  onOpenSource,
  onDelete,
  onUpdateSource,
  onOpenCanvas,
  onRenameCanvas,
  onDeleteCanvas,
  onDismissNotice,
}: {
  sources: SourcePage[];
  selectedSourceId?: string;
  canvases: CollageCanvas[];
  selectedCanvasId?: string;
  notice: string;
  onUpload: (files: File[]) => void;
  onSelect: (id: string) => void;
  onOpenSource: (id: string) => void;
  onDelete: (sourceId: string) => void;
  onUpdateSource: (source: SourcePage) => void;
  onOpenCanvas: (canvasId: string) => void;
  onRenameCanvas: (canvasId: string, name: string) => void;
  onDeleteCanvas: (canvasId: string) => void;
  onDismissNotice: () => void;
}) {
  const [draftView, setDraftView] = useState<'sources' | 'canvases'>('sources');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'favorites'>('all');
  const [sourceSearchQuery, setSourceSearchQuery] = useState('');
  const [openSourceMenuId, setOpenSourceMenuId] = useState<string | null>(null);
  const [sourceNoteDrafts, setSourceNoteDrafts] = useState<
    Record<string, { name: string; book: string; author: string; chapterOrPage: string; context: string }>
  >({});
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const normalizedSourceSearch = normalizeSearchText(sourceSearchQuery);
  const sourcesInFilter = sourceFilter === 'favorites' ? sources.filter((source) => source.isFavorite) : sources;
  const visibleSources = normalizedSourceSearch
    ? sourcesInFilter.filter((source) =>
        matchesSearchText([source.name, source.ocrText, sourceSummary(source)].filter(Boolean).join(' '), sourceSearchQuery),
      )
    : sourcesInFilter;
  const pageCount = Math.max(1, Math.ceil(visibleSources.length / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const pageSources = visibleSources.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [sources.length, sourceFilter, normalizedSourceSearch]);

  return (
    <aside className="panel left-panel">
      <div className="brand-title">Fragmente-Projekt</div>
      <UploadDropzone
        label="Upload sources"
        hint="Add images here, then cut specific words in the center workspace"
        onFiles={onUpload}
      />
      <h2 className="draft-heading">Local library</h2>
      <div className="draft-tabs">
        <button className={draftView === 'sources' ? 'selected' : ''} onClick={() => setDraftView('sources')}>
          Sources
        </button>
        <button className={draftView === 'canvases' ? 'selected' : ''} onClick={() => setDraftView('canvases')}>
          Archived canvases
        </button>
      </div>
      {notice && (
        <div className="draft-notice">
          <span>{notice}</span>
          <button onClick={onDismissNotice}>Dismiss</button>
        </div>
      )}
      {draftView === 'canvases' && (
        <div className="canvas-draft-list">
          {canvases.filter((canvas) => canvas.archivedAt).length === 0 && (
            <div className="empty-library">No archived canvases yet.</div>
          )}
          {canvases.filter((canvas) => canvas.archivedAt).map((canvas) => (
            <div
              key={canvas.id}
              className={`canvas-draft-card ${canvas.id === selectedCanvasId ? 'selected' : ''}`}
              role="button"
              tabIndex={0}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('input, button')) {
                  return;
                }
                onOpenCanvas(canvas.id);
              }}
              onDoubleClick={(event) => {
                if ((event.target as HTMLElement).closest('input, button')) {
                  return;
                }
                onOpenCanvas(canvas.id);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !(event.target as HTMLElement).closest('input, button')) {
                  onOpenCanvas(canvas.id);
                }
              }}
            >
              <EditableCanvasName canvas={canvas} onRename={onRenameCanvas} />
              <span>
                Archived {new Date(canvas.archivedAt ?? canvas.updatedAt).toLocaleString()} · {canvas.width} x {canvas.height} ·{' '}
                {canvas.placements.length} placement{canvas.placements.length === 1 ? '' : 's'}
              </span>
              <div className="canvas-draft-actions">
                <button
                  className="danger-button"
                  onClick={() => {
                    if (window.confirm(`Delete canvas "${canvas.name}"? This removes the saved canvas draft.`)) {
                      onDeleteCanvas(canvas.id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {draftView === 'sources' && (
        <>
      <div className="source-filter-row">
        <button className={sourceFilter === 'all' ? 'selected' : ''} onClick={() => setSourceFilter('all')}>
          All sources
        </button>
        <button className={sourceFilter === 'favorites' ? 'selected' : ''} onClick={() => setSourceFilter('favorites')}>
          Favorite sources
        </button>
      </div>
      <label className="source-search">
        Search source
        <input
          value={sourceSearchQuery}
          onChange={(event) => setSourceSearchQuery(event.target.value)}
          placeholder="Search recognized text, author, or book"
        />
      </label>
      <div className="pagination source-pagination">
        <button disabled={safePage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
          Prev
        </button>
        <label>
          Page
          <input
            type="number"
            min="1"
            max={pageCount}
            value={safePage}
            onChange={(event) => setCurrentPage(Math.min(pageCount, Math.max(1, Number(event.target.value) || 1)))}
          />
          <span>of {pageCount}</span>
        </label>
        <button disabled={safePage >= pageCount} onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}>
          Next
        </button>
      </div>
      <div className="list">
        {visibleSources.length === 0 && <div className="empty-library">No sources found.</div>}
        {pageSources.map((source) => (
          <div key={source.id} className={`source-row ${source.id === selectedSourceId ? 'selected' : ''}`}>
            <button className="source-select" draggable onDragStart={(event) => {
              event.dataTransfer.setData('application/x-fragmente-source', source.id);
              event.dataTransfer.effectAllowed = 'move';
            }} onClick={() => onSelect(source.id)} onDoubleClick={() => onOpenSource(source.id)}>
              <BlobImage blob={source.imageBlob} alt="" className="source-thumb" />
              <span>
                <strong>{source.name}</strong>
                {sourceSummary(source) && <small>{sourceSummary(source)}</small>}
              </span>
            </button>
            <button
              className={`source-favorite ${source.isFavorite ? 'selected' : ''}`}
              title={source.isFavorite ? 'Remove favorite' : 'Add favorite'}
              onClick={() => onUpdateSource({ ...source, isFavorite: !source.isFavorite })}
            >
              {source.isFavorite ? '★' : '☆'}
            </button>
            <button
              className="source-menu-button"
              onClick={() => {
                setOpenSourceMenuId((current) => (current === source.id ? null : source.id));
                setSourceNoteDrafts((current) => ({
                  ...current,
                  [source.id]: current[source.id] ?? {
                    name: source.name,
                    book: source.book ?? '',
                    author: source.author ?? '',
                    chapterOrPage: source.chapterOrPage ?? '',
                    context: source.context ?? source.note ?? '',
                  },
                }));
              }}
            >
              ...
            </button>
            {openSourceMenuId === source.id && (
              <div className="source-menu">
                <span>Uploaded {formatDateTime(source.createdAt)}</span>
                {source.ocrStatus === 'processing' && <span>OCR processing...</span>}
                {source.ocrStatus === 'error' && <span className="status error">OCR error</span>}
                <label>
                  Source name
                  <input
                    value={sourceNoteDrafts[source.id]?.name ?? source.name}
                    onChange={(event) =>
                      setSourceNoteDrafts((current) => ({
                        ...current,
                        [source.id]: {
                          name: event.currentTarget.value,
                          book: current[source.id]?.book ?? source.book ?? '',
                          author: current[source.id]?.author ?? source.author ?? '',
                          chapterOrPage: current[source.id]?.chapterOrPage ?? source.chapterOrPage ?? '',
                          context: current[source.id]?.context ?? source.context ?? source.note ?? '',
                        },
                      }))
                    }
                    onBlur={() => {
                      const draft = sourceNoteDrafts[source.id];
                      if (!draft) {
                        return;
                      }
                      onUpdateSource({ ...source, name: draft.name.trim() || source.name, nameEdited: true });
                    }}
                  />
                </label>
                {(['book', 'author', 'chapterOrPage', 'context'] as const).map((field) => (
                  <label key={field}>
                    {field === 'book'
                      ? 'Book'
                      : field === 'author'
                        ? 'Author'
                        : field === 'chapterOrPage'
                          ? 'Chapter / page'
                          : 'Context / thoughts'}
                    <input
                      value={sourceNoteDrafts[source.id]?.[field] ?? ''}
                      onChange={(event) =>
                        setSourceNoteDrafts((current) => ({
                          ...current,
                          [source.id]: {
                            name: current[source.id]?.name ?? source.name,
                            book: current[source.id]?.book ?? '',
                            author: current[source.id]?.author ?? '',
                            chapterOrPage: current[source.id]?.chapterOrPage ?? '',
                            context: current[source.id]?.context ?? '',
                            [field]: event.currentTarget.value,
                          },
                        }))
                      }
                      onBlur={() => {
                        const draft = sourceNoteDrafts[source.id];
                        if (!draft) {
                          return;
                        }
                        onUpdateSource({
                          ...source,
                          book: draft.book.trim(),
                          author: draft.author.trim(),
                          chapterOrPage: draft.chapterOrPage.trim(),
                          context: draft.context.trim(),
                          note: '',
                        });
                      }}
                    />
                  </label>
                ))}
                <button
                  className="danger-button source-menu-delete"
                  onClick={() => {
                    if (window.confirm(`Delete source "${source.name}"? Saved fragments from it will stay in the library.`)) {
                      onDelete(source.id);
                      setOpenSourceMenuId(null);
                    }
                  }}
                >
                  Delete source
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
        </>
      )}
    </aside>
  );
}

function SourceViewer({
  source,
  onUpload,
  onSaveFragment,
}: {
  source?: SourcePage;
  onUpload: (files: File[]) => void;
  onSaveFragment: (source: SourcePage, region: SelectionRect) => Promise<void>;
}) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageSize, setImageSize] = useState({ naturalWidth: 0, naturalHeight: 0, displayWidth: 0, displayHeight: 0 });
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [draft, setDraft] = useState<{ startX: number; startY: number } | null>(null);
  const [moveDraft, setMoveDraft] = useState<
    { startX: number; startY: number; originalSelection: SelectionRect } | null
  >(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasUsableSelection = !!selection && selection.width >= 4 && selection.height >= 4;

  useEffect(() => {
    setSelection(null);
    setDraft(null);
    setMoveDraft(null);
  }, [source?.id]);

  function pointerPoint(event: PointerEvent<HTMLDivElement>) {
    const image = imageRef.current;
    if (!image) {
      return null;
    }
    const rect = image.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    return { x, y };
  }

  function updateSelection(event: PointerEvent<HTMLDivElement>, start = draft) {
    const point = pointerPoint(event);
    if (!point || !start) {
      return;
    }
    setSelection({
      x: Math.min(start.startX, point.x),
      y: Math.min(start.startY, point.y),
      width: Math.abs(point.x - start.startX),
      height: Math.abs(point.y - start.startY),
    });
  }

  function updateMovedSelection(event: PointerEvent<HTMLDivElement>) {
    const point = pointerPoint(event);
    if (!point || !moveDraft) {
      return;
    }
    const dx = point.x - moveDraft.startX;
    const dy = point.y - moveDraft.startY;
    const maxX = Math.max(0, imageSize.displayWidth - moveDraft.originalSelection.width);
    const maxY = Math.max(0, imageSize.displayHeight - moveDraft.originalSelection.height);
    setSelection({
      ...moveDraft.originalSelection,
      x: Math.min(Math.max(0, moveDraft.originalSelection.x + dx), maxX),
      y: Math.min(Math.max(0, moveDraft.originalSelection.y + dy), maxY),
    });
  }

  async function saveSelection() {
    if (!source || !selection || selection.width < 4 || selection.height < 4) {
      return;
    }
    const scaleX = imageSize.naturalWidth / imageSize.displayWidth;
    const scaleY = imageSize.naturalHeight / imageSize.displayHeight;
    setSaving(true);
    try {
      await onSaveFragment(source, {
        x: selection.x * scaleX,
        y: selection.y * scaleY,
        width: selection.width * scaleX,
        height: selection.height * scaleY,
      });
      setSelection(null);
    } catch {
      // Keep the current selection visible so the user can try saving again.
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="workspace-section">
      <div className="section-head">
        <h2>Source Viewer</h2>
      </div>
      <div
        className={`source-viewer ${isDropActive ? 'drop-active' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDropActive(true);
        }}
        onDragLeave={() => setIsDropActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDropActive(false);
          onUpload(Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/')));
        }}
      >
        {!source && (
          <UploadDropzone
            label="Upload source images"
            hint="Drop or click here to start from a page image"
            onFiles={onUpload}
          />
        )}
        {source && (
          <div
            className="image-stage"
            onPointerDown={(event) => {
              event.preventDefault();
              const point = pointerPoint(event);
              if (!point) {
                return;
              }
              event.currentTarget.setPointerCapture(event.pointerId);
              const start = { startX: point.x, startY: point.y };
              setDraft(start);
              setMoveDraft(null);
              setSelection({ x: point.x, y: point.y, width: 0, height: 0 });
            }}
            onPointerMove={(event) => {
              if (moveDraft) {
                updateMovedSelection(event);
              } else {
                updateSelection(event);
              }
            }}
            onPointerUp={(event) => {
              if (moveDraft) {
                updateMovedSelection(event);
              } else {
                updateSelection(event);
              }
              setDraft(null);
              setMoveDraft(null);
            }}
          >
            <BlobImage
              blob={source.imageBlob}
              alt={source.name}
              className="source-image"
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
              onLoad={(event) => {
                const image = event.currentTarget;
                setImageSize({
                  naturalWidth: image.naturalWidth,
                  naturalHeight: image.naturalHeight,
                  displayWidth: image.clientWidth,
                  displayHeight: image.clientHeight,
                });
                imageRef.current = image;
              }}
            />
            {source.cutRegions.map((region) => (
              <div
                key={region.id}
                className="cut-mask"
                style={{
                  left: `${(region.x / imageSize.naturalWidth) * 100}%`,
                  top: `${(region.y / imageSize.naturalHeight) * 100}%`,
                  width: `${(region.width / imageSize.naturalWidth) * 100}%`,
                  height: `${(region.height / imageSize.naturalHeight) * 100}%`,
                }}
              />
            ))}
            {selection && (
              <>
                <div
                  className="selection-box"
                  style={{
                    left: selection.x,
                    top: selection.y,
                    width: selection.width,
                    height: selection.height,
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const point = pointerPoint(event);
                    if (!point) {
                      return;
                    }
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDraft(null);
                    setMoveDraft({ startX: point.x, startY: point.y, originalSelection: selection });
                  }}
                />
                {hasUsableSelection && (
                  <div
                    className="selection-actions"
                    style={{
                      left: selection.x,
                      top: selection.y + selection.height + 8,
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button onClick={saveSelection} disabled={saving}>
                      {saving ? 'Saving...' : 'Save to box'}
                    </button>
                    <button onClick={() => setSelection(null)} disabled={saving}>
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function FragmentOcrInput({
  fragment,
  onUpdateFragment,
}: {
  fragment: Fragment;
  onUpdateFragment: (fragment: Fragment) => Promise<void>;
}) {
  const [draft, setDraft] = useState(fragment.ocrText ?? '');
  const isComposingRef = useRef(false);

  useEffect(() => {
    setDraft(fragment.ocrText ?? '');
  }, [fragment.id, fragment.ocrText]);

  async function commit() {
    const nextText = draft.trim();
    if (nextText === (fragment.ocrText ?? '')) {
      return;
    }
    await onUpdateFragment({
      ...fragment,
      ocrText: nextText,
      ocrStatus: nextText ? 'done' : 'idle',
      updatedAt: nowIso(),
    });
  }

  return (
    <input
      className="ocr-text-input"
      placeholder="OCR text"
      value={draft}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={() => void commit()}
      onCompositionStart={() => {
        isComposingRef.current = true;
      }}
      onCompositionEnd={() => {
        isComposingRef.current = false;
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing && !isComposingRef.current) {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function CanvasWorkspace({
  canvas,
  fragments,
  onCanvasChange,
  onArchive,
}: {
  canvas: CollageCanvas;
  fragments: Fragment[];
  onCanvasChange: (canvas: CollageCanvas) => Promise<void>;
  onArchive: (canvas: CollageCanvas) => Promise<void>;
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [backgroundDragState, setBackgroundDragState] = useState<BackgroundDragState | null>(null);
  const [isCustomizingBackground, setIsCustomizingBackground] = useState(false);
  const [isBackgroundMenuOpen, setIsBackgroundMenuOpen] = useState(false);
  const [backgroundNotice, setBackgroundNotice] = useState('');
  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const cropStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const fragmentById = useMemo(() => new Map(fragments.map((fragment) => [fragment.id, fragment])), [fragments]);

  function updateCanvas(next: CollageCanvas) {
    void onCanvasChange({ ...next, updatedAt: nowIso() });
  }

  function updatePlacement(placementId: string, patch: Partial<CanvasFragmentPlacement>) {
    updateCanvas({
      ...canvas,
      placements: canvas.placements.map((placement) =>
        placement.id === placementId ? { ...placement, ...patch } : placement,
      ),
    });
  }

  function deletePlacement(placementId: string) {
    updateCanvas({
      ...canvas,
      placements: canvas.placements.filter((item) => item.id !== placementId),
    });
    setSelectedPlacementId((current) => (current === placementId ? null : current));
    if (cropDraft?.placementId === placementId) {
      setCropDraft(null);
    }
  }

  async function uploadBackground(file: File) {
    const dimensions = await getImageDimensions(file);
    const isSameSize = dimensions.width === canvas.width && dimensions.height === canvas.height;
    let mode: 'cover' | 'center' = 'center';
    if (!isSameSize) {
      mode = window.confirm(
        `This image is ${dimensions.width} x ${dimensions.height}, but the canvas is ${canvas.width} x ${canvas.height}. Use OK to scale proportionally until it fills the canvas, or Cancel to keep the image at its original size centered on a black background.`,
      )
        ? 'cover'
        : 'center';
    }
    updateCanvas({
      ...canvas,
      backgroundColor: mode === 'center' && !isSameSize ? '#000000' : canvas.backgroundColor,
      backgroundImageBlob: file,
      backgroundImageName: file.name,
      backgroundImagePlacement: centeredPlacement(dimensions.width, dimensions.height, canvas.width, canvas.height, mode),
    });
    setIsCustomizingBackground(true);
    setIsBackgroundMenuOpen(false);
    setBackgroundNotice('');
  }

  function finishBackgroundCustomization() {
    setIsCustomizingBackground(false);
    setBackgroundNotice('To keep customizing or remove the image, open Background.');
  }

  function removeBackgroundImage() {
    updateCanvas({
      ...canvas,
      backgroundImageBlob: undefined,
      backgroundImageName: undefined,
      backgroundImagePlacement: undefined,
    });
    setIsCustomizingBackground(false);
    setIsBackgroundMenuOpen(false);
    setBackgroundNotice('');
  }

  function backgroundPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!backgroundDragState || !canvas.backgroundImagePlacement || !canvasRef.current) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = (event.clientX - backgroundDragState.startX) * (canvas.width / rect.width);
    const dy = (event.clientY - backgroundDragState.startY) * (canvas.height / rect.height);
    let nextPlacement = canvas.backgroundImagePlacement;
    if (backgroundDragState.type === 'move') {
      nextPlacement = {
        ...canvas.backgroundImagePlacement,
        x: backgroundDragState.originalX + dx,
        y: backgroundDragState.originalY + dy,
      };
    } else if (backgroundDragState.corner === 'se') {
      nextPlacement = {
        ...canvas.backgroundImagePlacement,
        width: Math.max(24, backgroundDragState.originalWidth + dx),
        height: Math.max(24, backgroundDragState.originalHeight + dy),
      };
    } else if (backgroundDragState.corner === 'sw') {
      const width = Math.max(24, backgroundDragState.originalWidth - dx);
      nextPlacement = {
        ...canvas.backgroundImagePlacement,
        x: backgroundDragState.originalX + (backgroundDragState.originalWidth - width),
        width,
        height: Math.max(24, backgroundDragState.originalHeight + dy),
      };
    } else if (backgroundDragState.corner === 'ne') {
      const height = Math.max(24, backgroundDragState.originalHeight - dy);
      nextPlacement = {
        ...canvas.backgroundImagePlacement,
        y: backgroundDragState.originalY + (backgroundDragState.originalHeight - height),
        width: Math.max(24, backgroundDragState.originalWidth + dx),
        height,
      };
    } else {
      const width = Math.max(24, backgroundDragState.originalWidth - dx);
      const height = Math.max(24, backgroundDragState.originalHeight - dy);
      nextPlacement = {
        ...canvas.backgroundImagePlacement,
        x: backgroundDragState.originalX + (backgroundDragState.originalWidth - width),
        y: backgroundDragState.originalY + (backgroundDragState.originalHeight - height),
        width,
        height,
      };
    }
    updateCanvas({ ...canvas, backgroundImagePlacement: nextPlacement });
  }

  function startBackgroundResize(event: PointerEvent<HTMLSpanElement>, corner: 'nw' | 'ne' | 'sw' | 'se') {
    if (!canvas.backgroundImagePlacement) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setBackgroundDragState({
      type: 'resize',
      corner,
      startX: event.clientX,
      startY: event.clientY,
      originalX: canvas.backgroundImagePlacement.x,
      originalY: canvas.backgroundImagePlacement.y,
      originalWidth: canvas.backgroundImagePlacement.width,
      originalHeight: canvas.backgroundImagePlacement.height,
    });
  }

  function cropStyle(crop?: CropRect): CSSProperties | undefined {
    if (!crop) {
      return undefined;
    }
    return {
      position: 'absolute',
      width: `${100 / crop.width}%`,
      height: `${100 / crop.height}%`,
      left: `${(-crop.x / crop.width) * 100}%`,
      top: `${(-crop.y / crop.height) * 100}%`,
      maxWidth: 'none',
      maxHeight: 'none',
    };
  }

  function cropPoint(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1),
      y: Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1),
    };
  }

  function startCrop(event: PointerEvent<HTMLDivElement>, placement: CanvasFragmentPlacement) {
    if (cropDraft?.placementId !== placement.id) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const point = cropPoint(event);
    cropStartRef.current = point;
    setCropDraft((current) => (current ? { ...current, crop: { x: point.x, y: point.y, width: 0.02, height: 0.02 } } : current));
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveCrop(event: PointerEvent<HTMLDivElement>) {
    if (!cropStartRef.current || !cropDraft) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const point = cropPoint(event);
    setCropDraft({
      ...cropDraft,
      crop: clampCrop({
        x: Math.min(cropStartRef.current.x, point.x),
        y: Math.min(cropStartRef.current.y, point.y),
        width: Math.abs(point.x - cropStartRef.current.x),
        height: Math.abs(point.y - cropStartRef.current.y),
      }),
    });
  }

  function finishCrop() {
    cropStartRef.current = null;
  }

  function applyCrop() {
    if (!cropDraft) {
      return;
    }
    const placement = canvas.placements.find((item) => item.id === cropDraft.placementId);
    if (!placement) {
      setCropDraft(null);
      return;
    }
    const crop = clampCrop(cropDraft.crop);
    const originalCrop = cropDraft.originalCrop ?? { x: 0, y: 0, width: 1, height: 1 };
    updatePlacement(cropDraft.placementId, {
      x: placement.x + placement.width * crop.x,
      y: placement.y + placement.height * crop.y,
      width: placement.width * crop.width,
      height: placement.height * crop.height,
      crop: {
        x: originalCrop.x + originalCrop.width * crop.x,
        y: originalCrop.y + originalCrop.height * crop.y,
        width: originalCrop.width * crop.width,
        height: originalCrop.height * crop.height,
      },
    });
    setCropDraft(null);
  }

  function revertCrop() {
    if (!cropDraft) {
      return;
    }
    updatePlacement(cropDraft.placementId, { crop: cropDraft.originalCrop });
    setCropDraft(null);
  }

  async function dropFragment(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const fragmentId = event.dataTransfer.getData('text/plain');
    const fragment = fragmentById.get(fragmentId);
    if (!fragment || !canvasRef.current) {
      return;
    }
    const dimensions = await getImageDimensions(fragment.imageBlob);
    const defaultWidth = Math.min(260, Math.max(80, dimensions.width));
    const defaultHeight = Math.max(24, defaultWidth * (dimensions.height / dimensions.width));
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const placement: CanvasFragmentPlacement = {
      id: createId('placement'),
      canvasId: canvas.id,
      fragmentId,
      x: Math.max(0, (event.clientX - rect.left) * scaleX - defaultWidth / 2),
      y: Math.max(0, (event.clientY - rect.top) * scaleY - defaultHeight / 2),
      width: defaultWidth,
      height: defaultHeight,
      rotation: 0,
    };
    updateCanvas({ ...canvas, placements: [...canvas.placements, placement] });
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragState || !canvasRef.current) {
      return;
    }

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaledDx = dx * (canvas.width / rect.width);
    const scaledDy = dy * (canvas.height / rect.height);

    if (dragState.type === 'move') {
      updatePlacement(dragState.placementId, {
        x: Math.max(0, dragState.originalX + scaledDx),
        y: Math.max(0, dragState.originalY + scaledDy),
      });
    } else {
      updatePlacement(dragState.placementId, {
        width: Math.max(40, dragState.originalWidth + scaledDx),
        height: Math.max(24, dragState.originalHeight + scaledDy),
      });
    }
  }

  async function exportCanvas(format: ExportFormat) {
    if (!canvasRef.current) {
      return;
    }
    const filename = `${canvas.name.replace(/\s+/g, '-').toLowerCase()}.${format}`;
    const exportOptions = {
      cacheBust: true,
      pixelRatio: 1,
      width: canvas.width,
      height: canvas.height,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      backgroundColor: canvas.backgroundColor,
      style: {
        width: `${canvas.width}px`,
        height: `${canvas.height}px`,
        maxWidth: 'none',
      },
    };

    if (format === 'png') {
      downloadDataUrl(await htmlToImage.toPng(canvasRef.current, exportOptions), filename);
    } else if (format === 'jpg') {
      downloadDataUrl(await htmlToImage.toJpeg(canvasRef.current, { ...exportOptions, quality: 0.95 }), filename);
    } else {
      const blob = await htmlToImage.toBlob(canvasRef.current, { ...exportOptions, type: 'image/webp', quality: 0.95 });
      if (blob) {
        downloadBlob(blob, filename);
      }
    }
    setIsExportOpen(false);
  }

  return (
    <section className="workspace-section">
      <div className="section-head">
        <h2>Canvas: {canvas.name}</h2>
        {isCustomizingBackground && <span className="background-edit-status">Customizing background</span>}
        {backgroundNotice && (
          <span className="background-notice">
            {backgroundNotice}
            <button onClick={() => setBackgroundNotice('')}>Dismiss</button>
          </span>
        )}
        {isCustomizingBackground && <button onClick={finishBackgroundCustomization}>Done</button>}
        <div className="background-menu-wrap">
          <button onClick={() => setIsBackgroundMenuOpen((current) => !current)}>Background</button>
          {isBackgroundMenuOpen && (
            <div className="background-menu">
              <label className="color-control">
                Color
                <input
                  type="color"
                  value={canvas.backgroundColor}
                  onChange={(event) => updateCanvas({ ...canvas, backgroundColor: event.target.value })}
                />
              </label>
              <button onClick={() => backgroundInputRef.current?.click()}>Upload image as background</button>
              {canvas.backgroundImageBlob && (
                <>
                  <button
                    onClick={() => {
                      setIsCustomizingBackground(true);
                      setIsBackgroundMenuOpen(false);
                      setBackgroundNotice('');
                    }}
                  >
                    Customize image
                  </button>
                  <button onClick={removeBackgroundImage}>Use solid color only</button>
                </>
              )}
            </div>
          )}
        </div>
        <input
          ref={backgroundInputRef}
          className="hidden-file-input"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) {
              void uploadBackground(file);
            }
          }}
        />
        <button onClick={() => void onArchive(canvas)}>{canvas.archivedAt ? 'Unarchive' : 'Archive'}</button>
        <div className="export-menu-wrap">
          <button onClick={() => setIsExportOpen((current) => !current)}>Export...</button>
          {isExportOpen && (
            <div className="export-menu">
              <button onClick={() => void exportCanvas('png')}>PNG ({canvas.width} x {canvas.height})</button>
              <button onClick={() => void exportCanvas('jpg')}>JPG ({canvas.width} x {canvas.height})</button>
              <button onClick={() => void exportCanvas('webp')}>WebP ({canvas.width} x {canvas.height})</button>
            </div>
          )}
        </div>
      </div>
      <div className="canvas-shell">
        <div
          ref={canvasRef}
          className="collage-canvas"
          style={{
            ['--canvas-ratio' as string]: `${canvas.width} / ${canvas.height}`,
            backgroundColor: canvas.backgroundColor,
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => void dropFragment(event)}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedPlacementId(null);
            }
          }}
          onPointerMove={(event) => {
            if (isCustomizingBackground) {
              backgroundPointerMove(event);
              return;
            }
            pointerMove(event);
          }}
          onPointerUp={() => {
            setDragState(null);
            setBackgroundDragState(null);
            finishCrop();
          }}
          onPointerLeave={() => {
            setDragState(null);
            setBackgroundDragState(null);
            finishCrop();
          }}
        >
          {canvas.backgroundImageBlob && canvas.backgroundImagePlacement && (
            <div
              className={`canvas-background-image ${isCustomizingBackground ? 'editing' : ''}`}
              style={{
                left: `${(canvas.backgroundImagePlacement.x / canvas.width) * 100}%`,
                top: `${(canvas.backgroundImagePlacement.y / canvas.height) * 100}%`,
                width: `${(canvas.backgroundImagePlacement.width / canvas.width) * 100}%`,
                height: `${(canvas.backgroundImagePlacement.height / canvas.height) * 100}%`,
              }}
              onPointerDown={(event) => {
                if (!isCustomizingBackground || !canvas.backgroundImagePlacement) {
                  return;
                }
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                setBackgroundDragState({
                  type: 'move',
                  startX: event.clientX,
                  startY: event.clientY,
                  originalX: canvas.backgroundImagePlacement.x,
                  originalY: canvas.backgroundImagePlacement.y,
                });
              }}
            >
              <BlobImage blob={canvas.backgroundImageBlob} alt="Canvas background" className="canvas-background-img" />
              {isCustomizingBackground && (
                <>
                  {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                    <span
                      key={corner}
                      className={`background-resize-handle ${corner}`}
                      onPointerDown={(event) => startBackgroundResize(event, corner)}
                    />
                  ))}
                </>
              )}
            </div>
          )}
          {canvas.placements.map((placement) => {
            const fragment = fragmentById.get(placement.fragmentId);
            if (!fragment) {
              return null;
            }
            const isCropping = cropDraft?.placementId === placement.id;
            const isSelected = selectedPlacementId === placement.id;
            const imageCrop = placement.crop;

            return (
              <div
                key={placement.id}
                className={`placement ${isCropping ? 'cropping' : ''} ${isSelected ? 'selected' : ''} ${isCustomizingBackground ? 'background-editing' : ''}`}
                tabIndex={0}
                style={{
                  left: `${(placement.x / canvas.width) * 100}%`,
                  top: `${(placement.y / canvas.height) * 100}%`,
                  width: `${(placement.width / canvas.width) * 100}%`,
                  height: `${(placement.height / canvas.height) * 100}%`,
                  transformOrigin: 'top left',
                  transform: `rotate(${placement.rotation ?? 0}deg)`,
                }}
                onPointerDown={(event) => {
                  setSelectedPlacementId(placement.id);
                  if (isCropping) {
                    startCrop(event, placement);
                    return;
                  }
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDragState({
                    type: 'move',
                    placementId: placement.id,
                    startX: event.clientX,
                    startY: event.clientY,
                    originalX: placement.x,
                    originalY: placement.y,
                  });
                }}
                onPointerMove={moveCrop}
                onPointerUp={finishCrop}
                onKeyDown={(event) => {
                  if (event.key === 'Backspace' || event.key === 'Delete') {
                    event.preventDefault();
                    deletePlacement(placement.id);
                  }
                }}
              >
                <div className="placement-viewport">
                  <BlobImage
                    blob={fragment.imageBlob}
                    alt="Canvas fragment"
                    className="placement-img"
                    style={cropStyle(imageCrop)}
                    draggable={false}
                  />
                  {isCropping && (
                    <div
                      className="crop-draft-box"
                      style={{
                        left: `${cropDraft.crop.x * 100}%`,
                        top: `${cropDraft.crop.y * 100}%`,
                        width: `${cropDraft.crop.width * 100}%`,
                        height: `${cropDraft.crop.height * 100}%`,
                      }}
                    />
                  )}
                </div>
                {!isCropping && !isCustomizingBackground && (
                  <button
                    className="placement-crop"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setSelectedPlacementId(placement.id);
                      setDragState(null);
                      setCropDraft({
                        placementId: placement.id,
                        originalCrop: placement.crop,
                        crop: placement.crop ?? { x: 0, y: 0, width: 1, height: 1 },
                      });
                    }}
                  >
                    Crop
                  </button>
                )}
                {isCropping && (
                  <div className="crop-actions" onPointerDown={(event) => event.stopPropagation()}>
                    <button onClick={applyCrop}>OK</button>
                    <button onClick={revertCrop}>Revert</button>
                  </div>
                )}
                {!isCustomizingBackground && (
                  <button
                    className="placement-delete"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setDragState(null);
                    }}
                    onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    deletePlacement(placement.id);
                  }}
                >
                    Delete
                  </button>
                )}
                <span
                  className="resize-handle"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    setSelectedPlacementId(placement.id);
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragState({
                      type: 'resize',
                      placementId: placement.id,
                      startX: event.clientX,
                      startY: event.clientY,
                      originalWidth: placement.width,
                      originalHeight: placement.height,
                    });
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CanvasSetup({
  canvases,
  selectedCanvasId,
  onOpenCanvas,
  onDeleteCanvas,
  onSelectPreset,
}: {
  canvases: CollageCanvas[];
  selectedCanvasId?: string;
  onOpenCanvas: (canvasId: string) => void;
  onDeleteCanvas: (canvasId: string) => void;
  onSelectPreset: (preset: CanvasPreset) => void;
}) {
  const selectedCanvas = canvases.find((canvas) => canvas.id === selectedCanvasId) ?? canvases[0];
  const [openCanvasMenuId, setOpenCanvasMenuId] = useState<string | null>(null);

  return (
    <section className="workspace-section canvas-setup">
      <div className="section-head">
        <h2>Collage Canvas</h2>
      </div>
      <h3>Choose canvas size</h3>
      <div className="preset-grid">
        {CANVAS_PRESETS.map((preset) => (
          <button
            key={preset.id}
            className={selectedCanvas?.width === preset.width && selectedCanvas.height === preset.height ? 'selected' : ''}
            onClick={() => onSelectPreset(preset)}
          >
            <strong>{preset.name}</strong>
            <span>
              {preset.width} x {preset.height}
            </span>
          </button>
        ))}
      </div>
      <div className="canvas-work-list">
        <h3>Open an existing canvas</h3>
        {canvases.map((canvas) => (
          <div
            key={canvas.id}
            className={`canvas-work-card ${canvas.id === selectedCanvasId ? 'selected' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => onOpenCanvas(canvas.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onOpenCanvas(canvas.id);
              }
            }}
          >
            <strong>
              {canvas.name}
              {canvas.id === selectedCanvasId && <span className="canvas-current-badge">You were working here</span>}
            </strong>
            <span>
              {canvas.archivedAt ? 'Archived' : 'Draft'} · {canvas.width} x {canvas.height} · Updated{' '}
              {new Date(canvas.updatedAt).toLocaleString()}
            </span>
            <button
              className="canvas-work-menu-button"
              onClick={(event) => {
                event.stopPropagation();
                setOpenCanvasMenuId((current) => (current === canvas.id ? null : canvas.id));
              }}
            >
              ...
            </button>
            {openCanvasMenuId === canvas.id && (
              <div className="canvas-work-menu" onClick={(event) => event.stopPropagation()}>
                <button
                  className="danger-button"
                  onClick={() => {
                    if (window.confirm(`Delete canvas "${canvas.name}"? This removes the saved canvas draft.`)) {
                      onDeleteCanvas(canvas.id);
                      setOpenCanvasMenuId(null);
                    }
                  }}
                >
                  Delete canvas
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function InspirationTable({
  fragments,
  sessionFragmentIds,
  onAddToSession,
}: {
  fragments: Fragment[];
  sessionFragmentIds: string[];
  onAddToSession: (fragmentId: string) => void;
}) {
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<Record<string, TableFragmentLayout>>({});
  const [dragState, setDragState] = useState<TableDragState | null>(null);
  const [showIntro, setShowIntro] = useState(() => localStorage.getItem('fragmente-inspiration-intro-seen') !== 'true');
  const maxZRef = useRef(1);
  const sessionSet = useMemo(() => new Set(sessionFragmentIds), [sessionFragmentIds]);
  const tableWidth = Math.max(920, Math.ceil(Math.sqrt(Math.max(1, fragments.length))) * 170 + 160);
  const tableHeight = Math.max(560, Math.ceil(fragments.length / Math.max(4, Math.ceil(Math.sqrt(Math.max(1, fragments.length))))) * 128 + 160);

  useEffect(() => {
    setLayout((current) => {
      const fresh = createTableLayout(fragments);
      const next: Record<string, TableFragmentLayout> = {};
      fragments.forEach((fragment) => {
        next[fragment.id] = current[fragment.id] ?? fresh[fragment.id];
      });
      maxZRef.current = Math.max(1, ...Object.values(next).map((item) => item.z));
      return next;
    });
  }, [fragments]);

  function shuffleTable() {
    const next = createTableLayout([...fragments].sort(() => Math.random() - 0.5));
    maxZRef.current = Math.max(1, ...Object.values(next).map((item) => item.z));
    setLayout(next);
  }

  function moveFragmentTo(clientX: number, clientY: number) {
    if (!dragState) {
      return;
    }
    const nextX = Math.max(0, dragState.originalX + clientX - dragState.startX);
    const nextY = Math.max(0, dragState.originalY + clientY - dragState.startY);
    setLayout((current) => {
      const item = current[dragState.fragmentId];
      if (!item) {
        return current;
      }
      return {
        ...current,
        [dragState.fragmentId]: {
          ...item,
          x: nextX,
          y: nextY,
        },
      };
    });
    setDragState({ ...dragState, currentX: clientX, currentY: clientY });
  }

  function finishTableDragAt(clientX: number, clientY: number) {
    if (dragState) {
      const dropTarget = document.elementFromPoint(clientX, clientY);
      const droppedIntoSession = Boolean(dropTarget?.closest('[data-session-dropzone="true"]'));
      if (droppedIntoSession) {
        onAddToSession(dragState.fragmentId);
        setLayout((current) => {
          const fresh = createTableLayout(fragments);
          const currentItem = current[dragState.fragmentId];
          const freshItem = fresh[dragState.fragmentId];
          if (!currentItem || !freshItem) {
            return current;
          }
          maxZRef.current += 1;
          return {
            ...current,
            [dragState.fragmentId]: {
              ...freshItem,
              z: maxZRef.current,
            },
          };
        });
      } else {
        setLayout((current) => {
          const currentItem = current[dragState.fragmentId];
          if (!currentItem) {
            return current;
          }
          return {
            ...current,
            [dragState.fragmentId]: {
              ...currentItem,
              x: dragState.originalX,
              y: dragState.originalY,
            },
          };
        });
      }
    }
    setDragState(null);
  }

  useEffect(() => {
    if (!dragState) {
      return undefined;
    }
    const handleMove = (event: globalThis.PointerEvent) => {
      event.preventDefault();
      moveFragmentTo(event.clientX, event.clientY);
    };
    const handleUp = (event: globalThis.PointerEvent) => {
      event.preventDefault();
      finishTableDragAt(event.clientX, event.clientY);
    };
    const handleCancel = () => {
      setLayout((current) => {
        const currentItem = current[dragState.fragmentId];
        if (!currentItem) {
          return current;
        }
        return {
          ...current,
          [dragState.fragmentId]: {
            ...currentItem,
            x: dragState.originalX,
            y: dragState.originalY,
          },
        };
      });
      setDragState(null);
    };
    window.addEventListener('pointermove', handleMove, { capture: true });
    window.addEventListener('pointerup', handleUp, { capture: true });
    window.addEventListener('pointercancel', handleCancel, { capture: true });
    return () => {
      window.removeEventListener('pointermove', handleMove, { capture: true });
      window.removeEventListener('pointerup', handleUp, { capture: true });
      window.removeEventListener('pointercancel', handleCancel, { capture: true });
    };
  }, [dragState, fragments, onAddToSession]);

  return (
    <section className="workspace-section inspiration-workspace">
      <div className="section-head">
        <h2>Inspiration Table</h2>
        <button onClick={shuffleTable}>Scatter again</button>
      </div>
      <p className="inspiration-note">
        A temporary table for finding unexpected combinations. Drag fragments around to uncover overlaps, or drag a
        fragment image into Inspiration session 1 on the right.
      </p>
      {showIntro && (
        <div className="inspiration-intro">
          <button
            onClick={() => {
              localStorage.setItem('fragmente-inspiration-intro-seen', 'true');
              setShowIntro(false);
            }}
          >
            Dismiss
          </button>
          <strong>Get some random ideas.</strong>
          <span>
            Move any fragment you want into the right panel. The right panel is a temporary box; save it as a new box if
            you want to keep it.
          </span>
        </div>
      )}
      <div className="inspiration-table-shell">
        <div
          ref={tableRef}
          className="inspiration-table"
          style={{ width: tableWidth, height: tableHeight }}
        >
          {fragments.length === 0 && <div className="empty-table">Collect some fragments first.</div>}
          {fragments.map((fragment) => {
            const isDragging = dragState?.fragmentId === fragment.id;
            if (sessionSet.has(fragment.id) && !isDragging) {
              return null;
            }
            const item = layout[fragment.id];
            if (!item) {
              return null;
            }
            return (
              <div
                key={fragment.id}
                className={`table-fragment ${isDragging ? 'dragging' : ''}`}
                style={{
                  left: isDragging ? dragState.currentX - dragState.offsetX : item.x,
                  top: isDragging ? dragState.currentY - dragState.offsetY : item.y,
                  width: item.width,
                  zIndex: isDragging ? 1000 : item.z,
                  transform: `rotate(${item.rotation}deg)`,
                }}
                onPointerDown={(event) => {
                  if ((event.target as HTMLElement).closest('button')) {
                    return;
                  }
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  const rect = event.currentTarget.getBoundingClientRect();
                  maxZRef.current += 1;
                  setLayout((current) => ({
                    ...current,
                    [fragment.id]: { ...current[fragment.id], z: maxZRef.current },
                  }));
                  setDragState({
                    fragmentId: fragment.id,
                    startX: event.clientX,
                    startY: event.clientY,
                    currentX: event.clientX,
                    currentY: event.clientY,
                    offsetX: event.clientX - rect.left,
                    offsetY: event.clientY - rect.top,
                    originalX: item.x,
                    originalY: item.y,
                  });
                }}
              >
                <BlobImage
                  blob={fragment.imageBlob}
                  alt="Inspiration fragment"
                  className="table-fragment-img"
                  draggable={false}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function InspirationSessionPanel({
  fragments,
  sessionFragmentIds,
  onAdd,
  onRemove,
  onClear,
  onSaveAsBox,
}: {
  fragments: Fragment[];
  sessionFragmentIds: string[];
  onAdd: (fragmentId: string) => void;
  onRemove: (fragmentId: string) => void;
  onClear: () => void;
  onSaveAsBox: (name: string) => Promise<void>;
}) {
  const [boxName, setBoxName] = useState('Inspiration session 1');
  const [isSaving, setIsSaving] = useState(false);
  const sessionSet = useMemo(() => new Set(sessionFragmentIds), [sessionFragmentIds]);
  const sessionFragments = sessionFragmentIds
    .map((fragmentId) => fragments.find((fragment) => fragment.id === fragmentId))
    .filter((fragment): fragment is Fragment => Boolean(fragment));

  async function saveSession(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = boxName.trim();
    if (!trimmed || sessionFragments.length === 0) {
      return;
    }
    setIsSaving(true);
    await onSaveAsBox(trimmed);
    setIsSaving(false);
  }

  return (
    <aside className="panel right-panel inspiration-session" data-session-dropzone="true">
      <h2>Inspiration session 1</h2>
      <p>
        This is temporary. Fragments keep their original box until you save this session as a new box.
      </p>
      <div
        className="session-dropzone"
        data-session-dropzone="true"
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(event) => {
          event.preventDefault();
          const fragmentId = event.dataTransfer.getData('text/plain');
          if (fragmentId) {
            onAdd(fragmentId);
          }
        }}
      >
        Drag fragments here
      </div>
      <div className="session-list">
        {sessionFragments.length === 0 && <div className="empty-library">No session fragments yet.</div>}
        {sessionFragments.map((fragment) => (
          <article key={fragment.id} className="session-fragment-card">
            <BlobImage blob={fragment.imageBlob} alt="" className="session-fragment-img" />
            <span>{fragment.ocrText || 'Untitled fragment'}</span>
            <button onClick={() => onRemove(fragment.id)}>Remove</button>
          </article>
        ))}
      </div>
      <form className="session-save" onSubmit={(event) => void saveSession(event)}>
        <input value={boxName} onChange={(event) => setBoxName(event.target.value)} placeholder="New box name" />
        <button disabled={isSaving || sessionSet.size === 0}>Save as box</button>
      </form>
      <button
        className="danger-button"
        onClick={() => {
          if (sessionSet.size === 0 || window.confirm('Close this temporary inspiration session without saving it as a box?')) {
            onClear();
          }
        }}
      >
        Close temporary session
      </button>
    </aside>
  );
}

function BoxControls({
  boxes,
  activeBoxId,
  onActiveBoxChange,
  onCreateBox,
}: {
  boxes: FragmentBox[];
  activeBoxId: string;
  onActiveBoxChange: (boxId: string) => void;
  onCreateBox: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [isCreatingBox, setIsCreatingBox] = useState(false);

  return (
    <div className="box-controls">
      <h2>Boxes</h2>
      <div className="box-row">
        <button className={activeBoxId === 'all' ? 'selected' : ''} onClick={() => onActiveBoxChange('all')}>
          All
        </button>
        <button
          className={activeBoxId === 'favorites' ? 'selected' : ''}
          onClick={() => onActiveBoxChange('favorites')}
        >
          Favorites
        </button>
        {boxes.map((box) => (
          <button
            key={box.id}
            className={activeBoxId === box.id ? 'selected' : ''}
            onClick={() => onActiveBoxChange(box.id)}
          >
            {box.id === DEFAULT_BOX_ID ? 'Default' : box.name}
          </button>
        ))}
        {!isCreatingBox && <button onClick={() => setIsCreatingBox(true)}>New box</button>}
      </div>
      {isCreatingBox && (
        <form
          className="new-box"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) {
              return;
            }
            void onCreateBox(trimmed);
            setName('');
            setIsCreatingBox(false);
          }}
        >
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="New box name" />
          <button>Create</button>
          <button
            type="button"
            onClick={() => {
              setName('');
              setIsCreatingBox(false);
            }}
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}

function FragmentLibrary({
  fragments,
  sources,
  boxes,
  activeBoxId,
  onUpdateFragment,
  onDeleteFragment,
}: {
  fragments: Fragment[];
  sources: SourcePage[];
  boxes: FragmentBox[];
  activeBoxId: string;
  onUpdateFragment: (fragment: Fragment) => Promise<void>;
  onDeleteFragment: (fragmentId: string) => Promise<void>;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const normalizedSearch = normalizeSearchText(searchQuery);
  const sourceById = useMemo(() => new Map(sources.map((source) => [source.id, source])), [sources]);
  const pageSize = 8;
  const fragmentsInBox =
    activeBoxId === 'all'
      ? fragments
      : activeBoxId === 'favorites'
        ? fragments.filter((fragment) => fragment.isFavorite)
        : fragments.filter((fragment) => fragment.boxId === activeBoxId);
  const visibleFragments = normalizedSearch
    ? fragmentsInBox.filter((fragment) => {
        const source = fragment.sourcePageId ? sourceById.get(fragment.sourcePageId) : undefined;
        const boxName = boxes.find((box) => box.id === fragment.boxId)?.name ?? '';
        const searchableText = [
          fragment.ocrText,
          boxName,
          source?.name,
          source?.ocrText,
          source ? sourceSummary(source) : '',
        ]
          .filter(Boolean)
          .join(' ');
        return matchesSearchText(searchableText, searchQuery);
      })
    : fragmentsInBox;
  const pageCount = Math.max(1, Math.ceil(visibleFragments.length / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const pageFragments = visibleFragments.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeBoxId, normalizedSearch]);

  return (
    <aside className="panel right-panel">
      <label className="fragment-search">
        Search OCR text
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search recognized text, author, or book"
        />
      </label>
      <div className="pagination">
        <button disabled={safePage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
          Prev
        </button>
        <label>
          Page
          <input
            type="number"
            min="1"
            max={pageCount}
            value={safePage}
            onChange={(event) => setCurrentPage(Math.min(pageCount, Math.max(1, Number(event.target.value) || 1)))}
          />
          <span>of {pageCount}</span>
        </label>
        <button disabled={safePage >= pageCount} onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}>
          Next
        </button>
      </div>
      <div className="fragment-list">
        {visibleFragments.length === 0 && <div className="empty-library">No fragments found.</div>}
        {pageFragments.map((fragment) => (
          <article key={fragment.id} className="fragment-card">
            <button
              className="fragment-menu-button"
              onClick={() => setOpenMenuId((current) => (current === fragment.id ? null : fragment.id))}
            >
              ...
            </button>
            {openMenuId === fragment.id && (
              <div className="fragment-menu">
                <label>
                  Stored in
                  <select
                    value={fragment.boxId}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                      void onUpdateFragment({ ...fragment, boxId: event.target.value, updatedAt: nowIso() });
                      setOpenMenuId(null);
                    }}
                  >
                    {boxes.map((box) => (
                      <option key={box.id} value={box.id}>
                        {box.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="danger-button" onClick={() => void onDeleteFragment(fragment.id)}>
                  Delete fragment
                </button>
              </div>
            )}
            <BlobImage
              blob={fragment.imageBlob}
              alt="Fragment"
              className="fragment-preview"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', fragment.id);
                event.dataTransfer.setData('application/x-fragmente-fragment', fragment.id);
              }}
            />
            <div className="ocr-row">
              <button
                className="favorite-button"
                title={fragment.isFavorite ? 'Remove favorite' : 'Add favorite'}
                onClick={() =>
                  void onUpdateFragment({ ...fragment, isFavorite: !fragment.isFavorite, updatedAt: nowIso() })
                }
              >
                {fragment.isFavorite ? '★' : '☆'}
              </button>
              {fragment.ocrStatus === 'processing' ? (
                <span className="status">OCR processing...</span>
              ) : (
                <FragmentOcrInput fragment={fragment} onUpdateFragment={onUpdateFragment} />
              )}
            </div>
            {fragment.ocrStatus === 'error' && <span className="status error">OCR error</span>}
          </article>
        ))}
      </div>
      {visibleFragments.length > pageSize && (
        <div className="pagination pagination-bottom">
          <button disabled={safePage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
            Prev
          </button>
          <label>
            Page
            <input
              type="number"
              min="1"
              max={pageCount}
              value={safePage}
              onChange={(event) => setCurrentPage(Math.min(pageCount, Math.max(1, Number(event.target.value) || 1)))}
            />
            <span>of {pageCount}</span>
          </label>
          <button disabled={safePage >= pageCount} onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}>
            Next
          </button>
        </div>
      )}
    </aside>
  );
}

function LibraryBackup({
  status,
  onDismissStatus,
  onExport,
  onImport,
}: {
  status: string;
  onDismissStatus: () => void;
  onExport: () => Promise<void>;
  onImport: () => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [folderError, setFolderError] = useState('');

  return (
    <div className="library-backup">
      <button className="tools-toggle" onClick={() => setIsOpen((current) => !current)}>
        ☰
      </button>
      {isOpen && (
        <div className="tools-panel">
          <div className="backup-actions">
            {window.desktopLibrary && <button onClick={async () => {
              try { await window.desktopLibrary!.openFolder(); setFolderError(''); }
              catch (failure) { setFolderError(String(failure)); }
            }}>Open Library Folder</button>}
            <button title="Save a backup to a separate folder. Choose where the backup will be written." onClick={() => void onExport()}>{window.desktopLibrary ? 'Back Up Library...' : 'Export / update library'}</button>
            <button title="Load an existing backup folder containing manifest.json. Matching items will be updated; other items remain." onClick={() => void onImport()}>{window.desktopLibrary ? 'Restore Library...' : 'Import library'}</button>
          </div>
          {folderError && <p role="alert">{folderError}</p>}
          {!window.desktopLibrary && <p>
            To update, choose the same library folder you exported before. Export updates <code>manifest.json</code>,{' '}
            <code>sources</code>, <code>fragments</code>, and <code>canvases</code>.
          </p>}
        </div>
      )}
      {status && (
        <span className="backup-status">
          {status}
          <button onClick={onDismissStatus}>Dismiss</button>
        </span>
      )}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | undefined>();
  const [selectedCanvasId, setSelectedCanvasId] = useState<string | undefined>();
  const [activeBoxId, setActiveBoxId] = useState('all');
  const [error, setError] = useState('');
  const [backupStatus, setBackupStatus] = useState('');
  const [libraryNotice, setLibraryNotice] = useState('');
  const [draftNotice, setDraftNotice] = useState('');
  const [transferNotice, setTransferNotice] = useState('');
  const [workspaceMode, setWorkspaceMode] = useState<'cut' | 'inspiration' | 'canvas-setup' | 'canvas'>('cut');
  const [inspirationFragmentIds, setInspirationFragmentIds] = useState<string[]>([]);

  const selectedSource = data?.sources.find((source) => source.id === selectedSourceId) ?? data?.sources[0];
  const selectedCanvas = data?.canvases.find((canvas) => canvas.id === selectedCanvasId) ?? data?.canvases[0];

  useEffect(() => {
    loadAllData()
      .then((loaded) => {
        setData(loaded);
        setSelectedSourceId(loaded.sources[0]?.id);
        setSelectedCanvasId(loaded.canvases[0]?.id);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Unable to load data.'));
  }, []);

  useEffect(() => {
    if (!data) {
      return;
    }
    data.sources
      .filter((source) => !source.ocrStatus || source.ocrStatus === 'idle')
      .slice(0, 2)
      .forEach((source) => {
        void autoRecognizeSource({ ...source, ocrStatus: 'processing' });
      });
  }, [data?.sources.length]);

  useEffect(() => {
    const remindToExport = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = 'Do not forget to export/update your local library backup.';
    };
    window.addEventListener('beforeunload', remindToExport);
    return () => window.removeEventListener('beforeunload', remindToExport);
  }, []);

  async function refresh() {
    setData(await loadAllData());
  }

  async function uploadSources(files: File[]) {
    const createdAt = nowIso();
    const existingNames = new Set(data?.sources.map((source) => source.name) ?? []);
    const batchNames = new Set<string>();
    const acceptedFiles: File[] = [];

    for (const file of files) {
      const isDuplicate = existingNames.has(file.name) || batchNames.has(file.name);
      if (
        isDuplicate &&
        !window.confirm(`A source named "${file.name}" is already in the library. Upload another copy anyway?`)
      ) {
        continue;
      }
      batchNames.add(file.name);
      acceptedFiles.push(file);
    }

    for (const file of acceptedFiles) {
      await saveSource({
        id: createId('source'),
        name: file.name,
        originalFileName: file.name,
        nameEdited: false,
        imageBlob: file,
        createdAt,
        isFavorite: false,
        ocrStatus: 'processing',
        note: '',
        book: '',
        author: '',
        chapterOrPage: '',
        context: '',
        cutRegions: [],
      });
    }
    if (acceptedFiles.length === 0) {
      return;
    }
    const loaded = await loadAllData();
    setData(loaded);
    setSelectedSourceId(loaded.sources[0]?.id);
    loaded.sources
      .filter((source) => acceptedFiles.some((file) => file.name === source.originalFileName) && source.ocrStatus === 'processing')
      .forEach((source) => void autoRecognizeSource(source));
  }

  async function removeSource(sourceId: string) {
    if (!data) {
      return;
    }
    await deleteSourceFromDb(sourceId);
    const nextFragments = data.fragments.map((fragment) =>
      fragment.sourcePageId === sourceId
        ? { ...fragment, sourcePageId: undefined, cutRegionId: undefined, updatedAt: nowIso() }
        : fragment,
    );
    await Promise.all(nextFragments.map((fragment) => saveFragment(fragment)));
    const loaded = await loadAllData();
    setData(loaded);
    setSelectedSourceId((current) => (current === sourceId ? loaded.sources[0]?.id : current));
    setDraftNotice('Source deleted.');
  }

  async function updateSource(source: SourcePage) {
    await saveSource(source);
    setData((current) =>
      current
        ? {
            ...current,
            sources: current.sources.map((item) => (item.id === source.id ? source : item)),
          }
        : current,
    );
  }

  async function autoRecognizeSource(source: SourcePage) {
    let worker: Awaited<ReturnType<typeof Tesseract.createWorker>> | undefined;
    const processingSource = { ...source, ocrStatus: 'processing' as const };
    await saveSource(processingSource);
    setData((current) =>
      current
        ? {
            ...current,
            sources: current.sources.map((item) => (item.id === source.id ? processingSource : item)),
          }
        : current,
    );
    try {
      worker = await Tesseract.createWorker(OCR_LANGUAGES, Tesseract.OEM.LSTM_ONLY);
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        preserve_interword_spaces: '0',
      });
      const result = await worker.recognize(source.imageBlob);
      const ocrText = normalizeOcrText(result.data.text);
      const ocrName = sourceNameFromOcr(ocrText);
      const updatedSource: SourcePage = {
        ...source,
        originalFileName: source.originalFileName ?? source.name,
        name: !source.nameEdited && ocrName ? ocrName : source.name,
        ocrText,
        ocrStatus: 'done',
      };
      await saveSource(updatedSource);
      setData((current) =>
        current
          ? {
              ...current,
              sources: current.sources.map((item) => (item.id === source.id ? updatedSource : item)),
            }
          : current,
      );
      setDraftNotice(`Source OCR recognized: ${ocrName || 'No text found. You can edit the source name manually.'}`);
    } catch {
      const updatedSource: SourcePage = { ...source, ocrStatus: 'error' };
      await saveSource(updatedSource);
      setData((current) =>
        current
          ? {
              ...current,
              sources: current.sources.map((item) => (item.id === source.id ? updatedSource : item)),
            }
          : current,
      );
      setDraftNotice('Source OCR failed. You can edit the source name manually.');
    } finally {
      await worker?.terminate();
    }
  }

  async function uploadFragments(files: File[]) {
    const createdAt = nowIso();
    let importedCount = 0;
    for (const file of files) {
      const fragment: Fragment = {
        id: createId('fragment'),
        imageBlob: file,
        createdAt,
        updatedAt: createdAt,
        sourceType: 'direct-upload',
        ocrStatus: 'processing',
        boxId: DEFAULT_BOX_ID,
        isFavorite: false,
      };
      await saveFragment(fragment);
      void autoRecognizeFragment(fragment);
      importedCount += 1;
    }
    await refresh();
    if (importedCount > 0) {
      setLibraryNotice(
        `${importedCount} direct fragment${importedCount === 1 ? '' : 's'} added to Default Box.`,
      );
    }
  }

  async function saveCroppedFragment(source: SourcePage, region: SelectionRect) {
    const duplicateRegion = source.cutRegions.find((cutRegion) => overlapRatio(region, cutRegion) > 0.75);
    if (
      duplicateRegion &&
      !window.confirm('This selection overlaps a fragment you already saved from this source. Save another copy anyway?')
    ) {
      return;
    }

    const createdAt = nowIso();
    const fragmentId = createId('fragment');
    const cutRegionId = createId('cut');
    const imageBlob = await cropImageBlob(source.imageBlob, region);
    const cutRegion: CutRegion = {
      id: cutRegionId,
      sourcePageId: source.id,
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height,
      fragmentId,
      createdAt,
    };
    const fragment: Fragment = {
      id: fragmentId,
      imageBlob,
      createdAt,
      updatedAt: createdAt,
      sourceType: 'cropped',
      sourcePageId: source.id,
      cutRegionId,
      ocrStatus: 'processing',
      boxId: DEFAULT_BOX_ID,
      isFavorite: false,
    };
    await saveFragment(fragment);
    await saveSource({ ...source, cutRegions: [...source.cutRegions, cutRegion] });
    await refresh();
    setLibraryNotice(`New fragment added to Default Box from ${source.name}.`);
    void autoRecognizeFragment(fragment);
  }

  async function updateFragment(fragment: Fragment) {
    await saveFragment(fragment);
    setData((current) =>
      current
        ? {
            ...current,
            fragments: current.fragments.map((item) => (item.id === fragment.id ? fragment : item)),
          }
        : current,
    );
  }

  async function removeFragment(fragmentId: string) {
    if (!data) {
      return;
    }
    const fragment = data.fragments.find((item) => item.id === fragmentId);
    const nextSources = data.sources.map((source) => ({
      ...source,
      cutRegions: source.cutRegions.filter(
        (region) => region.fragmentId !== fragmentId && region.id !== fragment?.cutRegionId,
      ),
    }));
    const changedSources = nextSources.filter((source, index) => source.cutRegions.length !== data.sources[index].cutRegions.length);

    await deleteFragmentFromDb(fragmentId);
    await Promise.all(changedSources.map((source) => saveSource(source)));
    const nextCanvases = data.canvases.map((canvas) => ({
      ...canvas,
      updatedAt: nowIso(),
      placements: canvas.placements.filter((placement) => placement.fragmentId !== fragmentId),
    }));
    await Promise.all(nextCanvases.map((canvas) => saveCanvas(canvas)));
    setData({
      ...data,
      canvases: nextCanvases,
      sources: nextSources,
      fragments: data.fragments.filter((fragment) => fragment.id !== fragmentId),
    });
  }

  async function createBox(name: string) {
    await saveBox({ id: createId('box'), name, createdAt: nowIso() });
    await refresh();
  }

  function addToInspiration(fragmentId: string) {
    setInspirationFragmentIds((current) => (current.includes(fragmentId) ? current : [...current, fragmentId]));
  }

  async function saveInspirationAsBox(name: string) {
    if (!data || inspirationFragmentIds.length === 0) {
      return;
    }
    const box: FragmentBox = { id: createId('box'), name, createdAt: nowIso() };
    const sessionSet = new Set(inspirationFragmentIds);
    const nextFragments = data.fragments.map((fragment) =>
      sessionSet.has(fragment.id) ? { ...fragment, boxId: box.id, updatedAt: nowIso() } : fragment,
    );
    await saveBox(box);
    await Promise.all(nextFragments.filter((fragment) => sessionSet.has(fragment.id)).map((fragment) => saveFragment(fragment)));
    setData({ ...data, boxes: [...data.boxes, box], fragments: nextFragments });
    setActiveBoxId(box.id);
    setInspirationFragmentIds([]);
    setLibraryNotice(`Inspiration session saved as "${name}".`);
  }

  async function updateCanvas(canvas: CollageCanvas) {
    await saveCanvas(canvas);
    setData((current) =>
      current
        ? {
            ...current,
            canvases: current.canvases.map((item) => (item.id === canvas.id ? canvas : item)),
          }
        : current,
    );
  }

  async function renameCanvas(canvasId: string, name: string) {
    if (!data) {
      return;
    }
    const canvas = data.canvases.find((item) => item.id === canvasId);
    if (!canvas || canvas.name === name) {
      return;
    }
    await updateCanvas({ ...canvas, name, updatedAt: nowIso() });
    setDraftNotice('Canvas renamed.');
  }

  async function archiveCanvas(canvas: CollageCanvas) {
    if (canvas.archivedAt) {
      if (!window.confirm(`Unarchive "${canvas.name}"? It will leave the Archived canvases list but stay available in Collage Canvas.`)) {
        return;
      }
      await updateCanvas({ ...canvas, archivedAt: undefined, updatedAt: nowIso() });
      setDraftNotice('Canvas unarchived.');
      return;
    }
    await updateCanvas({ ...canvas, archivedAt: nowIso(), updatedAt: nowIso() });
    setDraftNotice('Canvas archived.');
  }

  async function removeCanvas(canvasId: string) {
    if (!data) {
      return;
    }
    await deleteCanvasFromDb(canvasId);
    const loaded = await loadAllData();
    setData(loaded);
    setSelectedCanvasId((current) => {
      if (current !== canvasId) {
        return current;
      }
      return loaded.canvases[0]?.id;
    });
    setWorkspaceMode('cut');
    setDraftNotice('Canvas deleted.');
  }

  function openCanvas(canvasId: string) {
    setSelectedCanvasId(canvasId);
    setWorkspaceMode('canvas');
  }

  async function chooseCanvasPreset(preset: CanvasPreset) {
    if (!data) {
      return;
    }
    if (
      selectedCanvas &&
      !window.confirm(
        `Your current canvas "${selectedCanvas.name}" is already saved locally. Open a new blank ${preset.name} canvas?`,
      )
    ) {
      return;
    }
    const createdAt = nowIso();
    const nextCanvas: CollageCanvas = {
      id: createId('canvas'),
      name: preset.name,
      createdAt,
      updatedAt: createdAt,
      width: preset.width,
      height: preset.height,
      backgroundColor: '#fffaf0',
      placements: [],
    };
    await saveCanvas(nextCanvas);
    setData({ ...data, canvases: [nextCanvas, ...data.canvases] });
    setSelectedCanvasId(nextCanvas.id);
    setWorkspaceMode('canvas');
    setDraftNotice('Previous canvas saved. New canvas created.');
  }

  async function autoRecognizeFragment(fragment: Fragment) {
    let worker: Awaited<ReturnType<typeof Tesseract.createWorker>> | undefined;
    try {
      worker = await Tesseract.createWorker(OCR_LANGUAGES, Tesseract.OEM.LSTM_ONLY);
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
        preserve_interword_spaces: '0',
      });
      const result = await worker.recognize(fragment.imageBlob);
      const updatedFragment = {
        ...fragment,
        ocrStatus: 'done' as const,
        ocrText: normalizeOcrText(result.data.text),
        updatedAt: nowIso(),
      };
      await saveFragment(updatedFragment);
      setData((current) =>
        current
          ? {
              ...current,
              fragments: current.fragments.map((item) => (item.id === updatedFragment.id ? updatedFragment : item)),
            }
          : current,
      );
      setLibraryNotice(`OCR recognized: ${updatedFragment.ocrText || 'No text found. You can edit the search text manually.'}`);
    } catch {
      const updatedFragment = { ...fragment, ocrStatus: 'error' as const, updatedAt: nowIso() };
      await saveFragment(updatedFragment);
      setData((current) =>
        current
          ? {
              ...current,
              fragments: current.fragments.map((item) => (item.id === updatedFragment.id ? updatedFragment : item)),
            }
          : current,
      );
      setLibraryNotice('OCR failed. You can type the search text on the fragment card.');
    } finally {
      await worker?.terminate();
    }
  }

  async function exportLibrary() {
    if (!data) {
      return;
    }
    if (!window.showDirectoryPicker) {
      setBackupStatus('Folder export is not supported in this browser.');
      return;
    }

    try {
      setBackupStatus('Choose a folder for the library backup.');
      const directory = await window.showDirectoryPicker({ mode: 'readwrite' });
      const sourcesDirectory = await directory.getDirectoryHandle('sources', { create: true });
      const fragmentsDirectory = await directory.getDirectoryHandle('fragments', { create: true });
      const canvasesDirectory = await directory.getDirectoryHandle('canvases', { create: true });

      let newImageCount = 0;
      const sources: BackupSourcePage[] = [];
      const fragments: BackupFragment[] = [];
      const canvases: BackupCanvas[] = [];

      for (const source of data.sources) {
        const imageFile = `${source.id}.${imageExtension(source.imageBlob)}`;
        const { imageBlob, ...sourceMetadata } = source;
        if (await writeBlobIfMissing(sourcesDirectory, imageFile, imageBlob)) {
          newImageCount += 1;
        }
        sources.push({ ...sourceMetadata, imageFile, imageType: imageBlob.type || 'image/png' });
      }

      for (const fragment of data.fragments) {
        const imageFile = `${fragment.id}.${imageExtension(fragment.imageBlob)}`;
        const { imageBlob, ...fragmentMetadata } = fragment;
        if (await writeBlobIfMissing(fragmentsDirectory, imageFile, imageBlob)) {
          newImageCount += 1;
        }
        fragments.push({ ...fragmentMetadata, imageFile, imageType: imageBlob.type || 'image/png' });
      }

      for (const canvas of data.canvases) {
        const { backgroundImageBlob, ...canvasMetadata } = canvas;
        if (backgroundImageBlob) {
          const imageFile = `${canvas.id}-background.${imageExtension(backgroundImageBlob)}`;
          if (await writeBlobIfMissing(canvasesDirectory, imageFile, backgroundImageBlob)) {
            newImageCount += 1;
          }
          canvases.push({
            ...canvasMetadata,
            backgroundImageFile: imageFile,
            backgroundImageType: backgroundImageBlob.type || 'image/png',
          });
        } else {
          canvases.push(canvasMetadata);
        }
      }

      const manifest: LibraryManifest = {
        version: 1,
        exportedAt: nowIso(),
        sources,
        fragments,
        boxes: data.boxes,
        canvases,
      };

      await writeTextFile(directory, 'manifest.json', JSON.stringify(manifest, null, 2));
      setBackupStatus(
        `Exported/updated ${data.canvases.length} canvas${data.canvases.length === 1 ? '' : 'es'}. ${newImageCount} new image file${
          newImageCount === 1 ? '' : 's'
        } written.`,
      );
    } catch (backupError) {
      if (backupError instanceof DOMException && backupError.name === 'AbortError') {
        setBackupStatus('Export canceled.');
      } else {
        setBackupStatus(
          'Export failed. Choose a dedicated backup folder, such as Documents/Fragmente Library Backup, not the Desktop or Downloads folder itself.',
        );
      }
    }
  }

  async function importLibrary() {
    if (!window.showDirectoryPicker) {
      setBackupStatus('Folder import is not supported in this browser.');
      return;
    }

    try {
      setBackupStatus('Choose a library backup folder.');
      const directory = await window.showDirectoryPicker({ mode: 'read' });
      const sourcesDirectory = await directory.getDirectoryHandle('sources');
      const fragmentsDirectory = await directory.getDirectoryHandle('fragments');
      let canvasesDirectory: FileSystemDirectoryHandle | undefined;
      try {
        canvasesDirectory = await directory.getDirectoryHandle('canvases');
      } catch {
        canvasesDirectory = undefined;
      }
      const manifest = await readJsonFile<LibraryManifest>(directory, 'manifest.json');

      if (manifest.version !== 1) {
        setBackupStatus('Unsupported library backup version.');
        return;
      }

      for (const box of manifest.boxes) {
        await saveBox(box);
      }

      for (const source of manifest.sources) {
        const { imageFile, imageType, ...sourceMetadata } = source;
        const imageFileBlob = await (await sourcesDirectory.getFileHandle(imageFile)).getFile();
        await saveSource({
          ...sourceMetadata,
          imageBlob: new Blob([imageFileBlob], { type: imageType || imageFileBlob.type || 'image/png' }),
        });
      }

      for (const fragment of manifest.fragments) {
        const { imageFile, imageType, ...fragmentMetadata } = fragment;
        const imageFileBlob = await (await fragmentsDirectory.getFileHandle(imageFile)).getFile();
        await saveFragment({
          ...fragmentMetadata,
          imageBlob: new Blob([imageFileBlob], { type: imageType || imageFileBlob.type || 'image/png' }),
        });
      }

      const canvases = manifest.canvases ?? (manifest.canvas ? [manifest.canvas] : []);
      await Promise.all(
        canvases.map(async (canvas) => {
          const { backgroundImageFile, backgroundImageType, ...canvasMetadata } = canvas;
          if (backgroundImageFile && canvasesDirectory) {
            const backgroundImageFileBlob = await (await canvasesDirectory.getFileHandle(backgroundImageFile)).getFile();
            await saveCanvas({
              ...canvasMetadata,
              backgroundImageBlob: new Blob([backgroundImageFileBlob], {
                type: backgroundImageType || backgroundImageFileBlob.type || 'image/png',
              }),
            });
          } else {
            await saveCanvas(canvasMetadata);
          }
        }),
      );
      const loaded = await loadAllData();
      setData(loaded);
      setSelectedSourceId(loaded.sources[0]?.id);
      setSelectedCanvasId(loaded.canvases[0]?.id);
      setBackupStatus(
        `Imported ${manifest.sources.length} source${manifest.sources.length === 1 ? '' : 's'} and ${manifest.fragments.length} fragment${
          manifest.fragments.length === 1 ? '' : 's'
        }.`,
      );
    } catch (backupError) {
      if (backupError instanceof DOMException && backupError.name === 'AbortError') {
        setBackupStatus('Import canceled.');
      } else {
        setBackupStatus(
          'Import failed. Choose the dedicated backup folder that contains manifest.json, sources, fragments, and canvases. Avoid selecting Desktop or Downloads directly.',
        );
      }
    }
  }

  if (!data) {
    return <main className="loading">{error || 'Loading local library...'}</main>;
  }

  return (
    <main className="app-shell" onDragOverCapture={(event) => {
      const node = event.target as HTMLElement;
      const target = node.closest('.left-panel') ? 'source' : node.closest('.right-stack') ? 'fragment' : null;
      if (target && event.dataTransfer.types.includes(`application/x-fragmente-${target === 'source' ? 'fragment' : 'source'}`)) {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
      }
    }} onDropCapture={(event) => {
      const node = event.target as HTMLElement;
      const target = node.closest('.left-panel') ? 'source' : node.closest('.right-stack') ? 'fragment' : null;
      if (!target) return;
      const id = event.dataTransfer.getData(`application/x-fragmente-${target === 'source' ? 'fragment' : 'source'}`);
      if (!id) return;
      event.preventDefault();
      event.stopPropagation();
      if (target === 'source' && data.canvases.some((canvas) => canvas.placements.some((placement) => placement.fragmentId === id)) && !window.confirm('Convert to Source? This removes this fragment from canvas layouts.')) return;
      if (target === 'fragment' && data.sources.find((source) => source.id === id)?.cutRegions.length && !window.confirm('Convert to Fragment? Existing cropped fragments will remain, but their source links and cut marks will be removed.')) return;
      void convertLibraryImage(id, target).then(async () => {
        await refresh();
        if (target === 'source') { setSelectedSourceId(id); setWorkspaceMode('cut'); }
        else { setActiveBoxId(DEFAULT_BOX_ID); setWorkspaceMode('cut'); }
        setTransferNotice(target === 'source' ? 'Moved to Sources.' : 'Moved to Fragments.');
      }).catch((failure) => setError(String(failure)));
    }}>
      <SourcePanel
        sources={data.sources}
        selectedSourceId={selectedSource?.id}
        canvases={data.canvases}
        selectedCanvasId={selectedCanvas?.id}
        notice={draftNotice}
        onUpload={(files) => void uploadSources(files).catch((failure) => setError(`Upload could not be saved to the library: ${String(failure)}`))}
        onSelect={setSelectedSourceId}
        onOpenSource={(sourceId) => {
          setSelectedSourceId(sourceId);
          setWorkspaceMode('cut');
        }}
        onDelete={(sourceId) => void removeSource(sourceId)}
        onUpdateSource={(source) => void updateSource(source)}
        onOpenCanvas={openCanvas}
        onRenameCanvas={(canvasId, name) => void renameCanvas(canvasId, name)}
        onDeleteCanvas={(canvasId) => void removeCanvas(canvasId)}
        onDismissNotice={() => setDraftNotice('')}
      />
      <section className="center-panel">
        {transferNotice && <div className="transfer-notice" role="status">
          <span>{transferNotice}</span>
          <button onClick={() => setTransferNotice('')} aria-label="Dismiss notification">Dismiss</button>
        </div>}
        <FolderImports onImported={refresh} onFragment={(fragment) => void autoRecognizeFragment(fragment)} />
        {error && <div className="error-banner">{error}</div>}
        <div className="workspace-switch">
          <button className={workspaceMode === 'cut' ? 'selected' : ''} onClick={() => setWorkspaceMode('cut')}>
            Fragment Workbench
          </button>
          <button
            className={workspaceMode === 'inspiration' ? 'selected' : ''}
            onClick={() => setWorkspaceMode('inspiration')}
          >
            Inspiration Table
          </button>
          <button
            className={workspaceMode === 'canvas' || workspaceMode === 'canvas-setup' ? 'selected' : ''}
            onClick={() => setWorkspaceMode('canvas-setup')}
          >
            Collage Canvas
          </button>
        </div>
        {workspaceMode === 'cut' && (
          <SourceViewer
            source={selectedSource}
            onUpload={(files) => void uploadSources(files)}
            onSaveFragment={saveCroppedFragment}
          />
        )}
        {workspaceMode === 'inspiration' && (
          <InspirationTable
            fragments={data.fragments}
            sessionFragmentIds={inspirationFragmentIds}
            onAddToSession={addToInspiration}
          />
        )}
        {workspaceMode === 'canvas-setup' && (
          <CanvasSetup
            canvases={data.canvases}
            selectedCanvasId={selectedCanvas?.id}
            onOpenCanvas={openCanvas}
            onDeleteCanvas={(canvasId) => void removeCanvas(canvasId)}
            onSelectPreset={(preset) => void chooseCanvasPreset(preset)}
          />
        )}
        {workspaceMode === 'canvas' && selectedCanvas && (
          <>
            <CanvasWorkspace
              canvas={selectedCanvas}
              fragments={data.fragments}
              onCanvasChange={updateCanvas}
              onArchive={archiveCanvas}
            />
          </>
        )}
      </section>
      <section className="panel right-stack">
        <UploadDropzone
          label="Upload fragments"
          hint="Already have cropped word images? Add them directly here"
          onFiles={(files) => void uploadFragments(files).catch((failure) => setError(`Upload could not be saved to the library: ${String(failure)}`))}
        />
        <LibraryBackup
          status={backupStatus}
          onDismissStatus={() => setBackupStatus('')}
          onExport={exportLibrary}
          onImport={importLibrary}
        />
        {workspaceMode === 'inspiration' ? (
          <InspirationSessionPanel
            fragments={data.fragments}
            sessionFragmentIds={inspirationFragmentIds}
            onAdd={addToInspiration}
            onRemove={(fragmentId) =>
              setInspirationFragmentIds((current) => current.filter((item) => item !== fragmentId))
            }
            onClear={() => setInspirationFragmentIds([])}
            onSaveAsBox={saveInspirationAsBox}
          />
        ) : (
          <>
            <BoxControls
              boxes={data.boxes}
              activeBoxId={activeBoxId}
              onActiveBoxChange={setActiveBoxId}
              onCreateBox={createBox}
            />
            {libraryNotice && (
              <div className="library-notice">
                <span>{libraryNotice}</span>
                <button onClick={() => setLibraryNotice('')}>Dismiss</button>
              </div>
            )}
            <FragmentLibrary
              fragments={data.fragments}
              sources={data.sources}
              boxes={data.boxes}
              activeBoxId={activeBoxId}
              onUpdateFragment={updateFragment}
              onDeleteFragment={removeFragment}
            />
          </>
        )}
      </section>
    </main>
  );
}
