import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { TEXT_COLORS, FONTS } from "./types";

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (opts: {
    text: string;
    fontSize: number;
    color: string;
    fontFamily: string;
    bold: boolean;
    italic: boolean;
  }) => void;
};

export function TextModal({ visible, onClose, onAdd }: Props) {
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(24);
  const [color, setColor] = useState("#000000");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);

  const handleAdd = () => {
    const t = text.trim();
    if (!t) return;
    onAdd({ text: t, fontSize, color, fontFamily, bold, italic });
    setText("");
    setFontSize(24);
    setColor("#000000");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modal}>
            <Text style={styles.title}>Add Text</Text>

            <Text style={styles.label}>Text</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your text..."
              placeholderTextColor="#999"
              value={text}
              onChangeText={setText}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Font</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.fontRow}
            >
              {FONTS.map((font) => (
                <TouchableOpacity
                  key={font}
                  style={[
                    styles.fontChip,
                    fontFamily === font && styles.fontChipActive,
                  ]}
                  onPress={() => setFontFamily(font)}
                >
                  <Text
                    style={[
                      styles.fontChipText,
                      fontFamily === font && styles.fontChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {font}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Size</Text>
            <TextInput
              style={styles.input}
              value={String(fontSize)}
              onChangeText={(v) => setFontSize(parseInt(v, 10) || 24)}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Color</Text>
            <View style={styles.colorRow}>
              {TEXT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    color === c && styles.colorSwatchActive,
                  ]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.checkWrap, bold && styles.checkWrapActive]}
                onPress={() => setBold(!bold)}
              >
                <Text style={styles.checkLabel}>Bold</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.checkWrap, italic && styles.checkWrapActive]}
                onPress={() => setItalic(!italic)}
              >
                <Text style={styles.checkLabel}>Italic</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.btns}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnAdd}
                onPress={handleAdd}
                activeOpacity={0.8}
              >
                <Text style={styles.btnAddText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "80%",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1a1a2e",
    marginBottom: 10,
  },
  fontRow: {
    marginBottom: 10,
    maxHeight: 44,
  },
  fontChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "#f0f0f0",
  },
  fontChipActive: {
    backgroundColor: "#e94560",
  },
  fontChipText: {
    fontSize: 13,
    color: "#333",
  },
  fontChipTextActive: {
    color: "#fff",
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorSwatchActive: {
    borderColor: "#e94560",
    transform: [{ scale: 1.1 }],
  },
  row: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 10,
  },
  checkWrap: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  checkWrapActive: {
    backgroundColor: "rgba(233,69,96,0.2)",
  },
  checkLabel: {
    fontSize: 13,
    color: "#333",
  },
  btns: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  btnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  btnAdd: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#e94560",
  },
  btnAddText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
