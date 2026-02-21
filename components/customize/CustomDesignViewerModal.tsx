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
import { getProductImageSource } from "@/lib/query-client";
import { CONTAINER_W, CONTAINER_H } from "./types";
import { DesignEditor } from "./DesignEditor";
import { formatPriceMMK } from "@/lib/format";
import { TSHIRT_FRONT_SVG } from "@/lib/tshirt-front-svg";
import { TSHIRT_BACK_SVG } from "@/lib/tshirt-back-svg";

const frontImage = require("@/assets/products/tshirt-front.png");
const backImage = require("@/assets/products/tshirt-back.png");

type Props = {
  visible: boolean;
  onClose: () => void;
  customization: CustomizationData;
  productName: string;
  /** Captured front/back images from CustomizeScreen – when present, show these instead of default SVG */
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
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

export function CustomDesignViewerModal({
  visible,
  onClose,
  customization,
  productName,
  frontImageUrl,
  backImageUrl,
}: Props) {
  const [view, setView] = useState<"front" | "back">("front");
  const frontDesign = Array.isArray(customization?.frontDesign) ? customization.frontDesign : [];
  const backDesign = Array.isArray(customization?.backDesign) ? customization.backDesign : [];
  const elements = view === "front" ? frontDesign : backDesign;
  const safeCustomization = {
    bodyColor: customization?.bodyColor ?? "#ffffff",
    sleeveColor: customization?.sleeveColor ?? "#ffffff",
    collarColor: customization?.collarColor ?? "#ffffff",
    frontDesign,
    backDesign,
    totalPrice: typeof customization?.totalPrice === "number" ? customization.totalPrice : 0,
  };

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
                <Text style={styles.colorLabel}>Collar</Text>
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
                    colorPart="body"
                    onColorPartChange={() => { }}
                    elements={elements}
                    selectedId={null}
                    textModalVisible={false}
                    frontImage={frontImage}
                    backImage={backImage}
                    frontSvg={TSHIRT_FRONT_SVG}
                    backSvg={TSHIRT_BACK_SVG}
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
                  {elements.map((el, idx) => (
                    <Text key={el.id} style={styles.elementsListItem}>
                      {idx + 1}. {elementSummary(el)}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.footer}>
              <Text style={styles.totalLabel}>Design total</Text>
              <Text style={styles.totalValue}>{formatPriceMMK(safeCustomization.totalPrice)}</Text>
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
