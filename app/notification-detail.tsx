import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/theme-context";
import { resolveNotificationImageUrl } from "@/lib/api-config";

export default function NotificationDetailScreen() {
  const params = useLocalSearchParams<{
    title?: string;
    body?: string;
    image?: string;
  }>();
  const { colors: C } = useTheme();
  const { width } = useWindowDimensions();
  const title = params.title ?? "Notification";
  const body = params.body ?? "";
  const imageUrl = resolveNotificationImageUrl(params.image ?? "");

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={styles.content}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[styles.image, { width: width - 40 }]}
          resizeMode="cover"
        />
      ) : null}
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[styles.title, { color: C.text }]}>{title}</Text>
        {body ? (
          <Text style={[styles.body, { color: C.textSecondary }]}>{body}</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  image: {
    height: 200,
    borderRadius: 14,
    marginBottom: 16,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
});
