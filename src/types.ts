export type OcrStatus = 'idle' | 'processing' | 'done' | 'error';

export interface CutRegion {
  id: string;
  sourcePageId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fragmentId: string;
  createdAt: string;
}

export interface SourcePage {
  id: string;
  name: string;
  imageBlob: Blob;
  createdAt: string;
  originalFileName?: string;
  nameEdited?: boolean;
  note?: string;
  book?: string;
  author?: string;
  chapterOrPage?: string;
  context?: string;
  isFavorite?: boolean;
  ocrText?: string;
  ocrStatus?: OcrStatus;
  cutRegions: CutRegion[];
}

export interface Fragment {
  id: string;
  imageBlob: Blob;
  createdAt: string;
  updatedAt: string;
  sourceType: 'cropped' | 'direct-upload';
  sourcePageId?: string;
  cutRegionId?: string;
  ocrText?: string;
  ocrStatus: OcrStatus;
  boxId: string;
  boxIds?: string[];
  isFavorite: boolean;
}

export interface FragmentBox {
  id: string;
  name: string;
  createdAt: string;
}

export interface CanvasFragmentPlacement {
  id: string;
  canvasId: string;
  fragmentId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface CollageCanvas {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImageBlob?: Blob;
  backgroundImageName?: string;
  backgroundImagePlacement?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  placements: CanvasFragmentPlacement[];
}

export interface AppData {
  sources: SourcePage[];
  fragments: Fragment[];
  boxes: FragmentBox[];
  canvases: CollageCanvas[];
}
