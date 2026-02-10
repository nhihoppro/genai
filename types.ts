
export interface ProductAnalysis {
  productName: string;
  colors: string[];
  typography: string;
  style: string;
  packagingDetails: string;
  suggestedPrompts: string[];
  thematicKeywords: string; // New: Keywords like "fire", "spices", "ice", "nature"
}

export interface GeneratedBanner {
  id: string;
  url: string;
  prompt: string;
}

export enum AppStep {
  UPLOAD = 'UPLOAD',
  RESULT = 'RESULT' // Combined Analysis and Generation
}
