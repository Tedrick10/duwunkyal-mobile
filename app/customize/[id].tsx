import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Text,
  Alert,
  Modal,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Asset from "expo-asset";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import { DesignEditor, type DesignEditorRef } from "@/components/customize/DesignEditor";
import { Preview3D } from "@/components/customize/Preview3D";
import type {
  DesignElement,
  DesignView,
  TextElement,
  ImageElement,
} from "@/components/customize/types";
import * as ImagePicker from "expo-image-picker";
import { CONTAINER_W, CONTAINER_H } from "@/components/customize/types";

function generateId() {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function CustomizeScreen() {
  const { id, image, imageBack } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [loadError, setLoadError] = useState<string | null>(null);

  const [view, setView] = useState<DesignView>("front");
  const [show3DFullScreen, setShow3DFullScreen] = useState(false);
  const [tshirtColor, setTshirtColor] = useState("#ffffff");
  const [frontDesign, setFrontDesign] = useState<DesignElement[]>([]);
  const [backDesign, setBackDesign] = useState<DesignElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [objUri, setObjUri] = useState<string | null>(null);
  const [designTextureUri, setDesignTextureUri] = useState<string | null>(null);
  const [fullScreen3DKey, setFullScreen3DKey] = useState(0);
  const [undoStack, setUndoStack] = useState<DesignElement[][]>([]);
  const [redoStack, setRedoStack] = useState<DesignElement[][]>([]);
  const designEditorRef = useRef<DesignEditorRef>(null);

  const baseUrl = getApiUrl();
  const customizeUrlBase =
    baseUrl &&
      baseUrl !== "http://undefined" &&
      baseUrl !== "https://undefined"
      ? `${baseUrl.replace(/\/$/, "")}/customize/${id}`
      : "";
  const imageParam = image ? `&image=${encodeURIComponent(image as string)}` : "";
  const imageBackParam = imageBack ? `&imageBack=${encodeURIComponent(imageBack as string)}` : "";
  const customizeUrl =
    Platform.OS === "web"
      ? `${customizeUrlBase}?${image ? `image=${encodeURIComponent(image as string)}` : ""}${imageBack ? `&imageBack=${encodeURIComponent(imageBack as string)}` : ""}`
      : `${customizeUrlBase}?webview=1${imageParam}${imageBackParam}`;

  const currentElements = view === "front" ? frontDesign : backDesign;
  const setCurrentDesign = useCallback(
    (fn: (prev: DesignElement[]) => DesignElement[]) => {
      if (view === "front") setFrontDesign(fn);
      else setBackDesign(fn);
    },
    [view]
  );

  const pushUndo = useCallback(() => {
    setUndoStack((s) => [...s.slice(-29), currentElements]);
    setRedoStack(() => []);
  }, [currentElements]);

  const addElement = useCallback(
    (el: DesignElement) => {
      pushUndo();
      setCurrentDesign((prev) => [...prev, el]);
      setSelectedId(el.id);
    },
    [setCurrentDesign, pushUndo]
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
  useEffect(() => {
    if (Platform.OS === "web") return;
    let cancelled = false;
    (async () => {
      try {
        const asset = Asset.Asset.fromModule(
          require("../../assets/models/man_tshirt.obj")
        );
        await asset.downloadAsync();
        if (!cancelled)
          setObjUri(asset.localUri ?? asset.uri ?? null);
      } catch {
        if (!cancelled) setObjUri(null);
      } finally {
        if (!cancelled) setObjReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

  const frontImage = require("@/assets/products/tshirt-front.png");
  const backImage = require("@/assets/products/tshirt-back.png");

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
          tshirtColor={tshirtColor}
          elements={currentElements}
          selectedId={selectedId}
          textModalVisible={textModalVisible}
          frontImage={frontImage}
          backImage={backImage}
          onViewChange={setView}
          onColorChange={setTshirtColor}
          onAddText={handleAddText}
          onAddRect={handleAddRect}
          onAddCircle={handleAddCircle}
          onAddImage={handleAddImage}
          onTextModalClose={handleTextModalClose}
          onTextModalAdd={handleTextModalAdd}
          onSelectElement={setSelectedId}
          onDeleteSelected={handleDeleteSelected}
          onMoveElement={handleMoveElement}
          onDragStart={pushUndo}
        />
        <TouchableOpacity
          style={styles.preview3DWidget}
          onPress={async () => {
            const path = await designEditorRef.current?.capture?.();
            const uri = path ? (path.startsWith("file://") ? path : `file://${path}`) : null;
            if (uri) setDesignTextureUri(uri);
            setFullScreen3DKey((k) => k + 1);
            setShow3DFullScreen(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.preview3DWidgetBox}>
            <View style={styles.preview3DGlWrap}>
              <Preview3D
                compact
                tshirtColor={tshirtColor}
                objUri={objUri}
                objReady={objReady}
                designTextureUri={designTextureUri}
              />
            </View>
            <Text style={styles.preview3DLabel}>3D</Text>
            <Ionicons name="expand-outline" size={14} color="#888" style={styles.preview3DExpand} />
            <Ionicons name="hand-left-outline" size={14} color="rgba(0,0,0,0.2)" style={styles.preview3DHand} />
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        visible={show3DFullScreen}
        animationType="slide"
        onRequestClose={() => {
          setShow3DFullScreen(false);
          setDesignTextureUri(null);
        }}
      >
        <View style={styles.modal3D}>
          <View style={[styles.modal3DHeader, { paddingTop: insets.top }]}>
            <TouchableOpacity
              style={styles.modal3DClose}
              onPress={() => {
                setShow3DFullScreen(false);
                setDesignTextureUri(null);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#fff" />
              <Text style={styles.modal3DCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modal3DContent}>
            <Preview3D
              key={`fullscreen-${fullScreen3DKey}-${tshirtColor}`}
              tshirtColor={tshirtColor}
              objUri={objUri}
              objReady={objReady}
              designTextureUri={designTextureUri}
            />
          </View>
        </View>
      </Modal>
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
    gap: 4,
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
