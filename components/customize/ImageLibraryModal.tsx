import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ImageSourcePropType,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatPriceMMK } from "@/lib/format";

export type ImageLibraryItem = {
  id: string;
  source: ImageSourcePropType;
  onPress: () => void;
  /** Price to show under the thumbnail (e.g. from CLIPART_PRICES / TEMPLATE_PRICES) */
  price?: number;
};

type Props = {
  visible: boolean;
  title: string;
  items: ImageLibraryItem[];
  onClose: () => void;
};

export function ImageLibraryModal({ visible, title, items, onClose }: Props) {
  const width = Dimensions.get("window").width;
  const cols = width >= 420 ? 4 : 3;
  const gap = 10;
  const pad = 14;
  const itemW = Math.floor((width - pad * 2 - gap * (cols - 1)) / cols);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
              <Ionicons name="close" size={22} color="#222" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={items}
            key={cols}
            keyExtractor={(it) => it.id}
            numColumns={cols}
            contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: 14, gap }}
            columnWrapperStyle={{ gap, paddingTop: gap }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={item.onPress}
                activeOpacity={0.85}
                style={[styles.card, { width: itemW, minHeight: itemW + 28 }]}
              >
                <View style={[styles.thumbWrap, { width: itemW - 16, height: itemW - 32 }]}>
                  <Image source={item.source} style={styles.thumb} resizeMode="contain" />
                </View>
                {item.price != null && (
                  <Text style={styles.priceText}>{formatPriceMMK(item.price)}</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "70%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f3f3",
  },
  card: {
    borderRadius: 12,
    backgroundColor: "#f7f7f7",
    borderWidth: 1,
    borderColor: "#eee",
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbWrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  priceText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a2e",
  },
});

