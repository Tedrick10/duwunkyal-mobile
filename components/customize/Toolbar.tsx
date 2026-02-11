import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  onImage: () => void;
  onText: () => void;
  onShapeRect: () => void;
  onShapeCircle: () => void;
};

export function Toolbar({
  onImage,
  onText,
  onShapeRect,
  onShapeCircle,
}: Props) {
  return (
    <View style={styles.toolbar}>
      <TouchableOpacity style={styles.btn} onPress={onImage} activeOpacity={0.7}>
        <Ionicons name="image-outline" size={20} color="#555" />
        <Text style={styles.btnLabel}>Image</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={onText} activeOpacity={0.7}>
        <Ionicons name="text-outline" size={20} color="#555" />
        <Text style={styles.btnLabel}>Text</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={onShapeRect} activeOpacity={0.7}>
        <Ionicons name="square-outline" size={20} color="#555" />
        <Text style={styles.btnLabel}>Shape</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={onShapeCircle} activeOpacity={0.7}>
        <Ionicons name="ellipse-outline" size={20} color="#555" />
        <Text style={styles.btnLabel}>Circle</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 6,
    paddingHorizontal: 8,
    height: 52,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 4,
  },
  btnLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#555",
    textTransform: "uppercase",
  },
});
