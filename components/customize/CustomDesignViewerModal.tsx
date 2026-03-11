import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CustomizationData, DesignElement } from "./types";
import { getProductImageSource, getImageUrl, type ProductCustomizationRegion } from "@/lib/query-client";
import { CONTAINER_W, CONTAINER_H } from "./types";
import { DesignEditor } from "./DesignEditor";
import { formatPriceMMK } from "@/lib/format";
import { TSHIRT_FRONT_SVG } from "@/lib/tshirt-front-svg";
import { TSHIRT_BACK_SVG } from "@/lib/tshirt-back-svg";

const defaultFrontImage = require("@/assets/products/tshirt-front.png");
const defaultBackImage = require("@/assets/products/tshirt-back.png");

type ProductCustomizationView = {
  image_url: string;
  regions: Record<string, { type?: string; x?: number; y?: number; width?: number; height?: number; cx?: number; cy?: number; rx?: number; ry?: number }>;
  region_masks?: Record<string, string> | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  customization: CustomizationData;
  productName: string;
  /** Captured front/back images – only use when hasCustomPreview is true (real captured preview) */
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  /** True when front/back are captured custom previews, not default product images */
  hasCustomPreview?: boolean;
  /** Product customization from API – for regions, masks, template images */
  productCustomization?: { front_view: ProductCustomizationView; back_view: ProductCustomizationView; neck_style?: string | null } | null;
  /** Cart item custom price – fallback when customization.totalPrice is 0 */
  customPrice?: string | number | null;
};

function elementSummary(el: DesignElement): string {
  if (el.type === "text") {
    const t = (el as any).text ?? "";
    return `Text: "${t.slice(0, 20)}${t.length > 20 ? "…" : ""}"`;
  }
  if (el.type === "image") return (el as any).sourceId ? `Image (${(el as any).sourceId})` : "Image";
  if (el.type === "rect") return "Shape (rectangle)";
  if (el.type === "circle") return "Shape (circle)";
  return "Element";
}

/** Normalize customization from API (handles both camelCase and snake_case). */
function normalizeCustomization(c: CustomizationData | Record<string, unknown> | null | undefined) {
  if (!c || typeof c !== "object") return null;
  const raw = c as Record<string, unknown>;
  const get = (...keys: string[]) => keys.reduce<unknown>((v, k) => v ?? raw[k], undefined);
  const toHex = (v: unknown): string | undefined => {
    const s = String(v ?? "").trim();
    if (!s) return undefined;
    return s.startsWith("#") ? s : `#${s.replace(/^#/, "")}`;
  };
  const bodyColor = toHex(get("bodyColor", "body_color")) ?? "#ffffff";
  const sleeveColor = toHex(get("sleeveColor", "sleeve_color")) ?? bodyColor;
  const collarColor = toHex(get("collarColor", "collar_color")) ?? bodyColor;
  const cuffColor = toHex(get("cuffColor", "cuff_color")) ?? bodyColor;
  const frontDesign = Array.isArray(get("frontDesign", "front_design")) ? (get("frontDesign", "front_design") as DesignElement[]) : [];
  const backDesign = Array.isArray(get("backDesign", "back_design")) ? (get("backDesign", "back_design") as DesignElement[]) : [];
  const tp = get("totalPrice", "total_price", "designTotal", "design_total");
  const totalPrice = typeof tp === "number" ? tp : (typeof tp === "string" ? parseFloat(tp) || 0 : 0);
  const neck_style = get("neck_style", "neck_style") ?? undefined;
  return {
    bodyColor,
    sleeveColor,
    collarColor,
    cuffColor,
    neck_style,
    frontDesign,
    backDesign,
    totalPrice,
  };
}

export function CustomDesignViewerModal({
  visible,
  onClose,
  customization,
  productName,
  frontImageUrl,
  backImageUrl,
  hasCustomPreview = false,
  productCustomization,
  customPrice,
}: Props) {
  const [view, setView] = useState<"front" | "back">("front");
  const normalized = normalizeCustomization(customization as any);
  const safeCustomization = normalized ?? {
    bodyColor: customization?.bodyColor ?? (customization as any)?.body_color ?? "#ffffff",
    sleeveColor: customization?.sleeveColor ?? (customization as any)?.sleeve_color ?? "#ffffff",
    collarColor: customization?.collarColor ?? (customization as any)?.collar_color ?? "#ffffff",
    cuffColor: customization?.cuffColor ?? (customization as any)?.cuff_color ?? "#ffffff",
    neck_style: customization?.neck_style ?? (customization as any)?.neck_style ?? undefined,
    frontDesign: Array.isArray(customization?.frontDesign) ? customization.frontDesign : Array.isArray((customization as any)?.front_design) ? (customization as any).front_design : [],
    backDesign: Array.isArray(customization?.backDesign) ? customization.backDesign : Array.isArray((customization as any)?.back_design) ? (customization as any).back_design : [],
    totalPrice: typeof customization?.totalPrice === "number" ? customization.totalPrice : typeof (customization as any)?.total_price === "number" ? (customization as any).total_price : 0,
  };
  const displayTotal =
    safeCustomization.totalPrice > 0
      ? safeCustomization.totalPrice
      : customPrice != null
        ? (typeof customPrice === "string" ? parseFloat(customPrice) || 0 : customPrice)
        : 0;
  const frontDesign = safeCustomization.frontDesign;
  const backDesign = safeCustomization.backDesign;
  const elements = view === "front" ? frontDesign : backDesign;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>{productName}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
                <Ionicons name="close" size={24} color="#222" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Clothes colors</Text>
            <View style={styles.colorRow}>
              <View style={styles.colorWrap}>
                <View style={[styles.swatch, { backgroundColor: safeCustomization.bodyColor }]} />
                <Text style={styles.colorLabel}>Body</Text>
              </View>
              <View style={styles.colorWrap}>
                <View style={[styles.swatch, { backgroundColor: safeCustomization.sleeveColor }]} />
                <Text style={styles.colorLabel}>Sleeves</Text>
              </View>
              <View style={styles.colorWrap}>
                <View style={[styles.swatch, { backgroundColor: safeCustomization.collarColor }]} />
                <Text style={styles.colorLabel}>{safeCustomization.neck_style === "crew_neck" ? "Neckline" : "Collar"}</Text>
              </View>
              <View style={styles.colorWrap}>
                <View style={[styles.swatch, { backgroundColor: safeCustomization.cuffColor }]} />
                <Text style={styles.colorLabel}>Cut Off</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Design</Text>
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, view === "front" && styles.toggleBtnActive]}
                onPress={() => setView("front")}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleText, view === "front" && styles.toggleTextActive]}>
                  Front view
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, view === "back" && styles.toggleBtnActive]}
                onPress={() => setView("back")}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleText, view === "back" && styles.toggleTextActive]}>
                  Back view
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.previewWrap}>
              <View style={styles.canvasWrap} collapsable={false}>
                {frontImageUrl && backImageUrl ? (
                  <Image
                    source={getProductImageSource(view === "front" ? frontImageUrl : backImageUrl)}
                    style={styles.capturedImage}
                    resizeMode="contain"
                  />
                ) : (
                  <DesignEditor
                    view={view}
                    bodyColor={safeCustomization.bodyColor}
                    sleeveColor={safeCustomization.sleeveColor}
                    collarColor={safeCustomization.collarColor}
                    cuffColor={safeCustomization.cuffColor}
                    colorPart="body"
                    onColorPartChange={() => { }}
                    elements={elements}
                    selectedId={null}
                    textModalVisible={false}
                    frontImage={
                      productCustomization?.front_view?.image_url
                        ? { uri: getImageUrl(productCustomization.front_view.image_url) }
                        : defaultFrontImage
                    }
                    backImage={
                      productCustomization?.back_view?.image_url
                        ? { uri: getImageUrl(productCustomization.back_view.image_url) }
                        : defaultBackImage
                    }
                    frontSvg={TSHIRT_FRONT_SVG}
                    backSvg={TSHIRT_BACK_SVG}
                    frontRegions={productCustomization?.front_view?.regions as Record<string, ProductCustomizationRegion> | undefined}
                    backRegions={productCustomization?.back_view?.regions as Record<string, ProductCustomizationRegion> | undefined}
                    frontRegionMasks={
                      productCustomization?.front_view?.region_masks
                        ? Object.fromEntries(
                          Object.entries(productCustomization.front_view.region_masks).map(([k, v]) => [
                            k,
                            v.startsWith("http") ? v : getImageUrl(v),
                          ])
                        )
                        : undefined
                    }
                    backRegionMasks={
                      productCustomization?.back_view?.region_masks
                        ? Object.fromEntries(
                          Object.entries(productCustomization.back_view.region_masks).map(([k, v]) => [
                            k,
                            v.startsWith("http") ? v : getImageUrl(v),
                          ])
                        )
                        : undefined
                    }
                    neckStyle={(productCustomization?.neck_style ?? undefined) as "collar" | "crew_neck" | null | undefined}
                    onViewChange={(v) => setView(v)}
                    onColorChange={() => { }}
                    onAddText={() => { }}
                    onCliparts={() => { }}
                    onTemplate={() => { }}
                    onAddImage={() => { }}
                    onTextModalClose={() => { }}
                    onTextModalAdd={() => { }}
                    onSelectElement={() => { }}
                    onDeleteSelected={() => { }}
                    readOnly
                  />
                )}
              </View>
              {elements.length > 0 && (
                <View style={styles.elementsList}>
                  <Text style={styles.elementsListTitle}>
                    {view === "front" ? "Front" : "Back"} ({elements.length} item{elements.length !== 1 ? "s" : ""})
                  </Text>
                  {elements.map((el: DesignElement, idx: number) => (
                    <Text key={el.id ? `${el.id}-${idx}` : `el-${idx}`} style={styles.elementsListItem}>
                      {idx + 1}. {elementSummary(el)}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.footer}>
              <Text style={styles.totalLabel}>Design total</Text>
              <Text style={styles.totalValue}>{formatPriceMMK(displayTotal)}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "90%",
    maxHeight: "90%",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24, flexGrow: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    flex: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#555",
    marginTop: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  colorRow: {
    flexDirection: "row",
    gap: 16,
    marginHorizontal: 16,
  },
  colorWrap: {
    alignItems: "center",
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#ddd",
  },
  colorLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
    marginTop: 4,
  },
  viewToggle: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#1a1a2e",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  toggleTextActive: {
    color: "#fff",
  },
  previewWrap: {
    marginTop: 12,
    marginHorizontal: 16,
    minHeight: 200,
  },
  canvasWrap: {
    width: CONTAINER_W,
    height: CONTAINER_H,
    alignSelf: "center",
    backgroundColor: "#c7c5c5",
    borderRadius: 12,
    overflow: "hidden",
  },
  capturedImage: {
    width: "100%",
    height: "100%",
  },
  elementsList: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f7f7f7",
    borderRadius: 10,
  },
  elementsListTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
  },
  elementsListItem: {
    fontSize: 12,
    color: "#555",
    marginBottom: 2,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
});
