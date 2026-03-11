const LightColors = {
  primary: "#1a1a2e",
  secondary: "#16213e",
  accent: "#e94560",
  accentLight: "#ff6b81",
  background: "#f8f9fa",
  surface: "#ffffff",
  surfaceSecondary: "#f0f1f3",
  text: "#1a1a2e",
  textSecondary: "#6c757d",
  textLight: "#adb5bd",
  border: "#e9ecef",
  borderLight: "#f0f1f3",
  success: "#2ecc71",
  warning: "#f39c12",
  error: "#e74c3c",
  white: "#ffffff",
  black: "#000000",
  overlay: "rgba(0,0,0,0.5)",
  cardShadow: "rgba(0,0,0,0.06)",
  productImageBg: "#f5f5f5",
};

const DarkColors = {
  primary: "#e8e8f0",
  secondary: "#c0c8d8",
  accent: "#e94560",
  accentLight: "#ff6b81",
  background: "#0f0f14",
  surface: "#1a1a24",
  surfaceSecondary: "#24242f",
  text: "#e8e8f0",
  textSecondary: "#9a9aab",
  textLight: "#6a6a7a",
  border: "#2a2a36",
  borderLight: "#22222e",
  success: "#2ecc71",
  warning: "#f39c12",
  error: "#e74c3c",
  white: "#ffffff",
  black: "#000000",
  overlay: "rgba(0,0,0,0.7)",
  cardShadow: "rgba(0,0,0,0.2)",
  productImageBg: "#2a2a36",
};

/** Card shadow for iOS/Android (use with StyleSheet or spread). Softer spread so it doesn’t clip as a line. */
export const cardShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 4,
};

const Colors = {
  ...LightColors,
  light: {
    text: "#1a1a2e",
    background: "#f8f9fa",
    tint: "#e94560",
    tabIconDefault: "#adb5bd",
    tabIconSelected: "#e94560",
  },
};

export { LightColors, DarkColors };
export default Colors;
