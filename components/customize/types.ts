export type DesignView = "front" | "back";
export type CustomizeMode = "design" | "preview";

/** Which part of the shirt the color picker edits (body / sleeves / collar). */
export type TshirtColorPart = "body" | "sleeves" | "collar";

/** Region % for splitting one shirt image into collar / body / sleeves (0–1).
 *  Sleeve: အဲ့နားလောက်ထိဘဲ ယူချင်တာ – body/sleeve ကွေးကြောင်းလောက်ထိပဲ. */
export const TSHIRT_REGIONS = {
  collarHeight: 0.10,
  collarWidth: 0.9,
  /** Sleeve: ပုံထဲက ကွေးကြောင်း (body နဲ့ ဆက်တဲ့နား) လောက်ထိပဲ. */
  sleeveWidth: 0.174,
} as const;

export type TextElement = {
  id: string;
  type: "text";
  text: string;
  x: number;
  y: number;
  fontSize: number;
  /** Text box width used for wrapping in 2D editor/capture. */
  boxWidth?: number;
  /** Text box height (auto-measured) to prevent clipping. */
  boxHeight?: number;
  color: string;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
};

export type RectElement = {
  id: string;
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

export type CircleElement = {
  id: string;
  type: "circle";
  x: number;
  y: number;
  radius: number;
  color: string;
};

export type ImageElement = {
  id: string;
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  uri: string;
  /** e.g. "clipart-1", "template-2" – used for price calculation */
  sourceId?: string;
};

export type DesignElement = TextElement | RectElement | CircleElement | ImageElement;

/** Saved with cart when adding from Customize – so user can view design (colors + front/back) in cart. */
export type CustomizationData = {
  bodyColor: string;
  sleeveColor: string;
  collarColor: string;
  frontDesign: DesignElement[];
  backDesign: DesignElement[];
  totalPrice: number;
};

export const TSHIRT_COLORS = [
  "#ffffff",
  "#111111",
  "#e94560",
  "#1a1a2e",
  "#2ecc71",
  "#3498db",
] as const;

/** Price per color (hex). Default 0 if not listed. */
export const TSHIRT_COLOR_PRICES: Record<string, number> = {
  "#ffffff": 0,
  "#111111": 1.5,
  "#e94560": 2,
  "#1a1a2e": 1.5,
  "#2ecc71": 2,
  "#3498db": 2,
};

/** Price per clipart id (e.g. clipart-1). */
export const CLIPART_PRICES: Record<string, number> = {
  "clipart-1": 1.5,
  "clipart-2": 2,
  "clipart-3": 2.5,
  "clipart-4": 2,
};

/** Price per template id (e.g. template-1). */
export const TEMPLATE_PRICES: Record<string, number> = {
  "template-1": 3,
  "template-2": 4,
  "template-3": 3.5,
  "template-4": 4,
};

export const TEXT_COLORS = [
  "#000000",
  "#ffffff",
  "#e94560",
  "#1a1a2e",
  "#f39c12",
  "#2ecc71",
  "#3498db",
  "#9b59b6",
];

export const FONTS = [
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
];

export const CONTAINER_W = 320;
export const CONTAINER_H = 380;
