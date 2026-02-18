import React, { useState, useCallback, useEffect, useRef, startTransition } from "react";
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getApiUrl, apiRequest, queryClient, type ClipartItem, type TemplateItem, type ProductCustomization, type ProductDetail } from "@/lib/query-client";
import { DesignEditor, type DesignEditorRef } from "@/components/customize/DesignEditor";
import { Preview3D } from "@/components/customize/Preview3D";
import { ImageLibraryModal } from "@/components/customize/ImageLibraryModal";
import type {
  DesignElement,
  DesignView,
  TextElement,
  ImageElement,
  TshirtColorPart,
} from "@/components/customize/types";
import * as ImagePicker from "expo-image-picker";
import { CONTAINER_W, CONTAINER_H } from "@/components/customize/types";
import { formatPriceMMK } from "@/lib/format";

function generateId() {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function CustomizeScreen() {
  const { id, image, imageBack } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [loadError, setLoadError] = useState<string | null>(null);

  const [view, setView] = useState<DesignView>("front");
  const [show3DFullScreen, setShow3DFullScreen] = useState(false);
  const [hasOpened3D, setHasOpened3D] = useState(false);
  const [clipartsOpen, setClipartsOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [tshirtBodyColor, setTshirtBodyColor] = useState("#ffffff");
  const [tshirtSleeveColor, setTshirtSleeveColor] = useState("#ffffff");
  const [tshirtCollarColor, setTshirtCollarColor] = useState("#ffffff");
  const [colorPart, setColorPart] = useState<"body" | "sleeves" | "collar">("body");
  const [frontDesign, setFrontDesign] = useState<DesignElement[]>([]);
  const [backDesign, setBackDesign] = useState<DesignElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [objUri, setObjUri] = useState<string | null>(null);
  // Keep latest captured texture per side (with a version counter so 3D reloads even
  // when the tmp file path is re-used by the capture library).
  const [designTextureByView, setDesignTextureByView] = useState<{
    front: { uri: string | null; v: number };
    back: { uri: string | null; v: number };
  }>({
    front: { uri: null, v: 0 },
    back: { uri: null, v: 0 },
  });
  const [undoStack, setUndoStack] = useState<DesignElement[][]>([]);
  const [redoStack, setRedoStack] = useState<DesignElement[][]>([]);
  const [addedToCart, setAddedToCart] = useState(false);
  const designEditorRef = useRef<DesignEditorRef>(null);
  const currentElementsRef = useRef<DesignElement[]>([]);
  const customizationColorsAppliedRef = useRef(false);
  currentElementsRef.current = view === "front" ? frontDesign : backDesign;

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/cart", {
        productId: Number(id),
        quantity: 1,
        customization: {
          bodyColor: tshirtBodyColor,
          sleeveColor: tshirtSleeveColor,
          collarColor: tshirtCollarColor,
          frontDesign,
          backDesign,
          totalPrice,
        },
        customPrice: totalPrice.toFixed(2),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2500);
    },
    onError: () => Alert.alert("Error", "Could not add to cart."),
  });

  const { data: productDetail } = useQuery<ProductDetail | null>({
    queryKey: ["productDetail", id],
    enabled: !!id,
  });
  const basePrice = productDetail != null
    ? Number(productDetail.sale_price ?? productDetail.price ?? 0)
    : 0;

  const { data: clipartListData } = useQuery<{ cliparts: ClipartItem[] }>({
    queryKey: ["clipartList"],
  });
  const { data: templateListData } = useQuery<{ templates: TemplateItem[] }>({
    queryKey: ["templateList"],
  });
  const { data: customization, isLoading: customizationLoading } = useQuery<ProductCustomization>({
    queryKey: ["productCustomization", id],
    enabled: !!id,
  });
  const cliparts: ClipartItem[] = clipartListData?.cliparts ?? [];
  const templates: TemplateItem[] = templateListData?.templates ?? [];
  const clipartPriceBySourceId = React.useMemo(
    () => Object.fromEntries(cliparts.map((c) => [`clipart-${c.id}`, c.price])),
    [cliparts]
  );
  const templatePriceBySourceId = React.useMemo(
    () => Object.fromEntries(templates.map((t) => [`template-${t.id}`, t.price])),
    [templates]
  );

  /** Template regions from API (Body / Sleeves / Collar) – only show regions present in template_regions. */
  const templateRegions = React.useMemo((): { id: TshirtColorPart; label: string }[] => {
    const front = customization?.template_regions?.front_regions;
    if (!front || typeof front !== "object") {
      return [{ id: "body", label: "Body" }, { id: "sleeves", label: "Sleeves" }, { id: "collar", label: "Collar" }];
    }
    const keys = Object.keys(front);
    const partOrder: TshirtColorPart[] = ["body", "sleeves", "collar"];
    const labelByPart: Record<TshirtColorPart, string> = { body: "Body", sleeves: "Sleeves", collar: "Collar" };
    const hasPart = (part: TshirtColorPart): boolean => {
      const k = part === "sleeves" ? "sleeve" : part;
      return keys.some((key) => key.toLowerCase().includes(k));
    };
    return partOrder.filter(hasPart).map((id) => ({ id, label: labelByPart[id] }));
  }, [customization?.template_regions?.front_regions]);

  useEffect(() => {
    const ids = templateRegions.map((r) => r.id);
    if (ids.length && !ids.includes(colorPart)) setColorPart(ids[0]);
  }, [templateRegions, colorPart]);

  useEffect(() => {
    if (!customization?.colors?.length || customizationColorsAppliedRef.current) return;
    const firstHex = customization.colors[0].hex;
    if (firstHex) {
      setTshirtBodyColor(firstHex);
      setTshirtSleeveColor(firstHex);
      setTshirtCollarColor(firstHex);
      customizationColorsAppliedRef.current = true;
    }
  }, [customization?.colors]);
  useEffect(() => {
    customizationColorsAppliedRef.current = false;
  }, [id]);

  const baseUrl = getApiUrl();
  const customizeUrlBase =
    baseUrl &&
      baseUrl !== "http://undefined" &&
      baseUrl !== "https://undefined"
      ? `${baseUrl.replace(/\/$/, "")}/customize/${id}`
      : "";

  const frontImageUrl = customization?.front_view?.image_url ?? (image as string);
  const backImageUrl = customization?.back_view?.image_url ?? (imageBack as string);
  const imageParam = frontImageUrl ? `&image=${encodeURIComponent(frontImageUrl)}` : "";
  const imageBackParam = backImageUrl ? `&imageBack=${encodeURIComponent(backImageUrl)}` : "";
  const customizeUrl =
    Platform.OS === "web"
      ? `${customizeUrlBase}?${frontImageUrl ? `image=${encodeURIComponent(frontImageUrl)}` : ""}${backImageUrl ? `&imageBack=${encodeURIComponent(backImageUrl)}` : ""}`
      : `${customizeUrlBase}?webview=1${imageParam}${imageBackParam}`;

  const currentElements = view === "front" ? frontDesign : backDesign;

  const colorPrice = customization?.colors
    ? (customization.colors.find((c) => c.hex === tshirtBodyColor)?.price_delta ?? 0) +
    (customization.colors.find((c) => c.hex === tshirtSleeveColor)?.price_delta ?? 0) +
    (customization.colors.find((c) => c.hex === tshirtCollarColor)?.price_delta ?? 0)
    : 0;
  const clipartTemplatePrice = [...frontDesign, ...backDesign].reduce((sum, el) => {
    if (el.type !== "image" || !("sourceId" in el) || !el.sourceId) return sum;
    const clip = clipartPriceBySourceId[el.sourceId];
    const tpl = templatePriceBySourceId[el.sourceId];
    return sum + (clip ?? 0) + (tpl ?? 0);
  }, 0);
  const totalPrice = basePrice + colorPrice + clipartTemplatePrice;

  // Auto-capture 2D design layer into a transparent PNG (decal) for 3D.
  // Front design shows only on 3D front; back design shows only on 3D back.
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!designEditorRef.current?.capture) return;
    if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
    captureTimerRef.current = setTimeout(async () => {
      try {
        const path = await designEditorRef.current?.capture?.();
        const uri = path
          ? path.startsWith("file://")
            ? path
            : `file://${path}`
          : null;
        setDesignTextureByView((prev) => {
          if (view === "front") return { ...prev, front: { uri, v: prev.front.v + 1 } };
          return { ...prev, back: { uri, v: prev.back.v + 1 } };
        });
      } catch {
        // If capture fails for any reason, keep existing texture (fallback to plain color in 3D).
      }
    }, 180);
    return () => {
      if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
    };
  }, [currentElements, view]);
  const setCurrentDesign = useCallback(
    (fn: (prev: DesignElement[]) => DesignElement[]) => {
      if (view === "front") setFrontDesign(fn);
      else setBackDesign(fn);
    },
    [view]
  );

  const pushUndo = useCallback(() => {
    setUndoStack((s) => [...s.slice(-29), currentElementsRef.current]);
    setRedoStack(() => []);
  }, []);

  const addElement = useCallback(
    (el: DesignElement) => {
      pushUndo();
      setCurrentDesign((prev) => [...prev, el]);
      setSelectedId(el.id);
    },
    [setCurrentDesign, pushUndo]
  );

  const addPresetImageFromUrl = useCallback(
    (uri: string, sourceId: string) => {
      if (!uri) return;
      const el: ImageElement = {
        id: generateId(),
        type: "image",
        x: CONTAINER_W / 2,
        y: CONTAINER_H / 2,
        width: 120,
        height: 120,
        uri,
        sourceId,
      };
      addElement(el);
    },
    [addElement]
  );

  const handleAddText = useCallback(() => setTextModalVisible(true), []);
  const handleTextModalClose = useCallback(() => setTextModalVisible(false), []);
  const handleTextModalAdd = useCallback(
    (opts: {
      text: string;
      fontSize: number;
      color: string;
      fontFamily: string;
      bold: boolean;
      italic: boolean;
    }) => {
      const el: TextElement = {
        id: generateId(),
        type: "text",
        text: opts.text,
        x: CONTAINER_W / 2,
        y: CONTAINER_H / 2,
        fontSize: opts.fontSize,
        boxWidth: 200,
        boxHeight: Math.max(32, Math.round(opts.fontSize * 1.3)),
        color: opts.color,
        fontFamily: opts.fontFamily,
        bold: opts.bold,
        italic: opts.italic,
      };
      addElement(el);
      setTextModalVisible(false);
    },
    [addElement]
  );

  const handleAddRect = useCallback(() => {
    addElement({
      id: generateId(),
      type: "rect",
      x: CONTAINER_W / 2,
      y: CONTAINER_H / 2,
      width: 80,
      height: 60,
      color: "#e94560",
    });
  }, [addElement]);

  const handleAddCircle = useCallback(() => {
    addElement({
      id: generateId(),
      type: "circle",
      x: CONTAINER_W / 2,
      y: CONTAINER_H / 2,
      radius: 40,
      color: "#3498db",
    });
  }, [addElement]);

  const handleAddImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission", "Gallery access is needed to add images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const uri = result.assets[0].uri;
    const el: ImageElement = {
      id: generateId(),
      type: "image",
      x: CONTAINER_W / 2,
      y: CONTAINER_H / 2,
      width: 80,
      height: 80,
      uri,
    };
    addElement(el);
  }, [addElement]);

  const handleMoveElement = useCallback(
    (id: string, x: number, y: number) => {
      setCurrentDesign((prev) =>
        prev.map((e) => (e.id === id ? { ...e, x, y } : e))
      );
    },
    [setCurrentDesign]
  );

  const handleUpdateElement = useCallback(
    (id: string, patch: Record<string, any>) => {
      setCurrentDesign((prev) =>
        prev.map((e) => (e.id === id ? ({ ...e, ...patch } as any) : e))
      );
    },
    [setCurrentDesign]
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    pushUndo();
    setCurrentDesign((prev) => prev.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  }, [selectedId, setCurrentDesign, pushUndo]);

  const handleClear = useCallback(() => {
    Alert.alert(
      "Clear",
      "Clear all objects on the current view?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            pushUndo();
            setCurrentDesign(() => []);
            setSelectedId(null);
          },
        },
      ]
    );
  }, [setCurrentDesign, pushUndo]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((s) => [...s, currentElements]);
    setUndoStack((s) => s.slice(0, -1));
    if (view === "front") setFrontDesign(prev);
    else setBackDesign(prev);
    setSelectedId(null);
  }, [undoStack, currentElements, view]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((s) => [...s, currentElements]);
    setRedoStack((s) => s.slice(0, -1));
    if (view === "front") setFrontDesign(next);
    else setBackDesign(next);
    setSelectedId(null);
  }, [redoStack, currentElements, view]);

  const handleSave = useCallback(() => {
    Alert.alert("Save", "Design saved. (Export image can be added later.)");
  }, []);

  const handleColorChange = useCallback((color: string) => {
    startTransition(() => {
      if (colorPart === "body") setTshirtBodyColor(color);
      else if (colorPart === "sleeves") setTshirtSleeveColor(color);
      else setTshirtCollarColor(color);
    });
  }, [colorPart]);

  const handleViewChange = useCallback((v: DesignView) => {
    startTransition(() => setView(v));
  }, []);

  const handleClipartsOpen = useCallback(() => setClipartsOpen(true), []);
  const handleTemplateOpen = useCallback(() => setTemplateOpen(true), []);
  const handleClipartsClose = useCallback(() => setClipartsOpen(false), []);
  const handleTemplateClose = useCallback(() => setTemplateOpen(false), []);

  useEffect(() => {
    if (Platform.OS === "web") {
      const handleMessage = (event: MessageEvent) => {
        if (event.data === "GO_BACK") router.back();
      };
      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }
  }, []);

  const [objReady, setObjReady] = useState(false);
  // 3D model: use only backend OBJ from productCustomization view_3d.obj_url (no local/fallback OBJ).
  useEffect(() => {
    if (Platform.OS === "web") return;
    const objUrl = customization?.view_3d?.obj_url ?? null;
    setObjUri(objUrl);
    setObjReady(true);
  }, [customization?.view_3d?.obj_url]);

  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <iframe
          src={customizeUrl}
          style={{ flex: 1, width: "100%", height: "100%", border: "none" } as any}
        />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.container}>
        <View style={[styles.nativeHeader, { paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color={Colors.textSecondary} />
          <Text style={styles.errorTitle}>Failed to load</Text>
          <Text style={styles.errorMessage}>{loadError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (id && customizationLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <View style={[styles.nativeHeader, { paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={{ fontSize: 14, color: Colors.textSecondary }}>Loading customization…</Text>
        </View>
      </View>
    );
  }

  const TRANSPARENT_PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const frontImage =
    customization?.front_view?.image_url
      ? { uri: customization.front_view.image_url }
      : (image ? { uri: image as string } : { uri: TRANSPARENT_PIXEL });
  const backImage =
    customization?.back_view?.image_url
      ? { uri: customization.back_view.image_url }
      : (imageBack ? { uri: imageBack as string } : { uri: TRANSPARENT_PIXEL });

  return (
    <View style={styles.container}>
      <View style={[styles.nativeHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleUndo}>
            <Ionicons name="arrow-undo-outline" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleRedo}>
            <Ionicons name="arrow-redo-outline" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.headerBtnText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainContent}>
        <DesignEditor
          ref={designEditorRef}
          view={view}
          bodyColor={tshirtBodyColor}
          sleeveColor={tshirtSleeveColor}
          collarColor={tshirtCollarColor}
          colorPart={colorPart}
          onColorPartChange={setColorPart}
          elements={currentElements}
          selectedId={selectedId}
          textModalVisible={textModalVisible}
          frontImage={frontImage}
          backImage={backImage}
          onViewChange={handleViewChange}
          onColorChange={handleColorChange}
          onAddText={handleAddText}
          onCliparts={handleClipartsOpen}
          onTemplate={handleTemplateOpen}
          onAddImage={handleAddImage}
          onTextModalClose={handleTextModalClose}
          onTextModalAdd={handleTextModalAdd}
          onSelectElement={setSelectedId}
          onDeleteSelected={handleDeleteSelected}
          onMoveElement={handleMoveElement}
          onUpdateElement={handleUpdateElement}
          onDragStart={pushUndo}
          availableColors={customization?.colors?.map((c) => ({ hex: c.hex, name: c.name }))}
          templateRegions={templateRegions}
        />
        <TouchableOpacity
          style={styles.preview3DWidget}
          onPress={async () => {
            // Force a capture right before opening full-screen (helps ensure latest state).
            const path = await designEditorRef.current?.capture?.();
            const uri = path
              ? path.startsWith("file://")
                ? path
                : `file://${path}`
              : null;
            setDesignTextureByView((prev) => {
              if (view === "front") return { ...prev, front: { uri, v: prev.front.v + 1 } };
              return { ...prev, back: { uri, v: prev.back.v + 1 } };
            });
            setHasOpened3D(true);
            setShow3DFullScreen(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.preview3DWidgetBox}>
            <View style={styles.preview3DGlWrap}>
              <Preview3D
                compact
                active
                tshirtColor={tshirtBodyColor}
                objUri={objUri}
                objReady={objReady}
                frontDesignTextureUri={designTextureByView.front.uri}
                frontDesignTextureVersion={designTextureByView.front.v}
                backDesignTextureUri={designTextureByView.back.uri}
                backDesignTextureVersion={designTextureByView.back.v}
              />
            </View>
            <Text style={styles.preview3DLabel}>3D</Text>
            <Ionicons name="expand-outline" size={14} color="#888" style={styles.preview3DExpand} />
            <Ionicons name="hand-left-outline" size={14} color="rgba(0,0,0,0.2)" style={styles.preview3DHand} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.addToCartBar, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.addToCartBarLabel}>Total</Text>
        <Text style={styles.addToCartBarPrice}>{formatPriceMMK(totalPrice)}</Text>
        <TouchableOpacity
          style={[styles.addToCartBarBtn, addedToCart && styles.addToCartBarBtnAdded]}
          onPress={() => addToCartMutation.mutate()}
          disabled={addToCartMutation.isPending}
          activeOpacity={0.85}
        >
          <Text style={styles.addToCartBarBtnText}>
            {addToCartMutation.isPending ? "Adding…" : addedToCart ? "Added!" : "Add to Cart"}
          </Text>
        </TouchableOpacity>
      </View>

      {hasOpened3D ? (
        <View
          style={[
            styles.fullScreen3DOverlay,
            { opacity: show3DFullScreen ? 1 : 0 },
          ]}
          pointerEvents={show3DFullScreen ? "auto" : "none"}
        >
          <View style={styles.modal3D}>
            <View style={[styles.modal3DHeader, { paddingTop: insets.top }]}>
              <TouchableOpacity
                style={styles.modal3DClose}
                onPress={() => setShow3DFullScreen(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#fff" />
                <Text style={styles.modal3DCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modal3DContent}>
              <Preview3D
                active={show3DFullScreen}
                tshirtColor={tshirtBodyColor}
                objUri={objUri}
                objReady={objReady}
                frontDesignTextureUri={designTextureByView.front.uri}
                frontDesignTextureVersion={designTextureByView.front.v}
                backDesignTextureUri={designTextureByView.back.uri}
                backDesignTextureVersion={designTextureByView.back.v}
              />
            </View>
          </View>
        </View>
      ) : null}

      <ImageLibraryModal
        visible={clipartsOpen}
        title="Cliparts"
        onClose={handleClipartsClose}
        items={cliparts.map((c) => ({
          id: String(c.id),
          source: { uri: c.thumbnail_url },
          price: c.price,
          onPress: () => {
            handleClipartsClose();
            addPresetImageFromUrl(c.file_url || c.thumbnail_url, `clipart-${c.id}`);
          },
        }))}
      />

      <ImageLibraryModal
        visible={templateOpen}
        title="Template"
        onClose={handleTemplateClose}
        items={templates.map((t) => ({
          id: String(t.id),
          source: { uri: t.thumbnail_url },
          price: t.price,
          onPress: () => {
            handleTemplateClose();
            addPresetImageFromUrl(t.file_url || t.thumbnail_url, `template-${t.id}`);
          },
        }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  nativeHeader: {
    backgroundColor: "#1a1a2e",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 4,
    gap: 4,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  backText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
    marginLeft: 2,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  mainContent: {
    flex: 1,
    position: "relative",
  },
  addToCartBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#1a1a2e",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  addToCartBarLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "600",
  },
  addToCartBarPrice: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  addToCartBarBtn: {
    backgroundColor: "#e94560",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 140,
    alignItems: "center",
  },
  addToCartBarBtnAdded: {
    backgroundColor: "#2ecc71",
  },
  addToCartBarBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  preview3DWidget: {
    position: "absolute",
    bottom: 72,
    left: 16,
    zIndex: 20,
  },
  preview3DWidgetBox: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    overflow: "hidden",
    position: "relative",
  },
  preview3DGlWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  preview3DLabel: {
    position: "absolute",
    top: 4,
    left: 6,
    fontSize: 10,
    fontWeight: "700",
    color: "#666",
    zIndex: 2,
  },
  preview3DExpand: {
    position: "absolute",
    top: 4,
    right: 6,
    zIndex: 2,
  },
  preview3DHand: {
    position: "absolute",
    bottom: 4,
    left: 6,
    zIndex: 2,
  },
  modal3D: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  fullScreen3DOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  modal3DHeader: {
    backgroundColor: "#1a1a2e",
    paddingHorizontal: 12,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  modal3DClose: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  modal3DCloseText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  modal3DContent: {
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerBtnText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: "#e94560",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginTop: 16,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 12,
    textAlign: "center",
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 24,
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
