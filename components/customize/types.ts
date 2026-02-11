export type DesignView = "front" | "back";
export type CustomizeMode = "design" | "preview";

export type TextElement = {
  id: string;
  type: "text";
  text: string;
  x: number;
  y: number;
  fontSize: number;
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
};

export type DesignElement = TextElement | RectElement | CircleElement | ImageElement;

export const TSHIRT_COLORS = [
  "#ffffff",
  "#111111",
  "#e94560",
  "#1a1a2e",
  "#2ecc71",
  "#3498db",
] as const;

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
