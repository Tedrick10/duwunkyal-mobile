import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { getImageUrl } from "@/lib/query-client";
import { useTheme } from "@/lib/theme-context";
import Colors from "@/constants/colors";

export default function PersonalInfoDetailsScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { user } = useAuth();
  const { colors: C } = useTheme();

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <Text style={[styles.emptyText, { color: C.textSecondary }]}>
          Sign in to view your information
        </Text>
      </View>
    );
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const rows = [
    { label: "Full Name", value: user.name, icon: "person-outline" as const },
    { label: "Phone", value: user.phone || "—", icon: "call-outline" as const },
    { label: "Email", value: user.email || "—", icon: "mail-outline" as const },
    { label: "Address", value: user.address || "—", icon: "location-outline" as const },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + webTopInset + 16, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.avatarSection, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
        <View style={styles.avatarWrapper}>
          {user.photo_url ? (
            <Image
              source={{ uri: getImageUrl(user.photo_url) }}
              style={styles.avatarLarge}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: `${C.accent}20` }]}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.userName, { color: C.text }]}>{user.name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Personal Information</Text>
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          {rows.map((row, index) => (
            <View
              key={row.label}
              style={[
                styles.row,
                index < rows.length - 1 && styles.rowBorder,
                index < rows.length - 1 && { borderColor: C.borderLight },
              ]}
            >
              <Ionicons name={row.icon} size={20} color={C.accent} style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: C.textSecondary }]}>{row.label}</Text>
                <Text style={[styles.rowValue, { color: C.text }]} numberOfLines={2}>
                  {row.value}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  avatarWrapper: {
    marginBottom: 12,
  },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
  userName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  section: { marginBottom: 8 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomWidth: 1,
  },
  rowIcon: { marginRight: 12 },
  rowContent: { flex: 1 },
  rowLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
