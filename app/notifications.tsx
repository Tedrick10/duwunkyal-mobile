import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { markNotificationRead, deleteNotification } from "@/lib/query-client";
import { resolveNotificationImageUrl } from "@/lib/api-config";

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  orderId: number | null;
  orderNumber: string | null;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors: C } = useTheme();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data, isLoading, refetch, isRefetching } = useQuery<{ notifications: NotificationItem[] }>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const notifications: NotificationItem[] = data?.notifications ?? [];

  function handlePress(item: NotificationItem) {
    if (!item.readAt) {
      markReadMutation.mutate(item.id);
    }
    if (item.orderId) {
      router.push(`/order/${item.orderId}`);
    } else if (item.type === "custom") {
      const data = item.data ?? {};
      const image = (data.image ?? data.imageUrl ?? data.image_url ?? data.imageurl) as string | undefined;
      const resolvedImage = resolveNotificationImageUrl(image ?? "");
      router.push({
        pathname: "/notification-detail",
        params: {
          title: item.title,
          body: item.body ?? "",
          image: resolvedImage,
        },
      });
    }
  }

  function handleDelete(item: NotificationItem) {
    deleteMutation.mutate(item.id);
  }

  function renderEmpty() {
    return (
      <View style={[styles.empty, { paddingTop: insets.top + webTopInset + 80 }]}>
        <Ionicons name="notifications-off-outline" size={64} color={C.textLight} />
        <Text style={[styles.emptyTitle, { color: C.text }]}>No notifications</Text>
        <Text style={[styles.emptySub, { color: C.textSecondary }]}>
          {!user ? "Sign in to see your notifications" : "You're all caught up!"}
        </Text>
        {!user && (
          <Pressable
            style={({ pressed }) => [styles.loginBtn, pressed && { opacity: 0.9 }]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.loginBtnText}>Sign In</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        {renderEmpty()}
      </View>
    );
  }

  if (isLoading) {
    return (
      <View
        style={[
          styles.loading,
          { paddingTop: insets.top + webTopInset, backgroundColor: C.background },
        ]}
      >
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{
          paddingTop: insets.top + webTopInset + 16,
          paddingBottom: 100,
          paddingHorizontal: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={refetch}
            tintColor={Colors.accent}
          />
        }
        ListEmptyComponent={renderEmpty}
        renderItem={({ item }) => (
          <View style={styles.itemWrapper}>
            <Pressable
              style={({ pressed }) => [
                styles.item,
                { backgroundColor: C.surface, borderColor: C.border },
                !item.readAt && styles.itemUnread,
                pressed && { opacity: 0.9 },
              ]}
              onPress={() => handlePress(item)}
            >
              <View style={styles.itemLeft}>
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor:
                        item.type === "order_placed"
                          ? "rgba(46,204,113,0.15)"
                          : item.type === "custom"
                            ? "rgba(155,89,182,0.15)"
                            : "rgba(52,152,219,0.15)",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      item.type === "order_placed"
                        ? "checkmark-circle"
                        : item.type === "custom"
                          ? "megaphone"
                          : "receipt"
                    }
                    size={24}
                    color={
                      item.type === "order_placed"
                        ? "#27ae60"
                        : item.type === "custom"
                          ? "#9b59b6"
                          : "#3498db"
                    }
                  />
                </View>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemTitle, { color: C.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.itemBody, { color: C.textSecondary }]} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <Text style={[styles.itemTime, { color: C.textLight }]}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
              </View>
              <View style={styles.itemRight}>
                <Pressable
                  onPress={() => handleDelete(item)}
                  style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
                  hitSlop={12}
                >
                  <Ionicons name="trash-outline" size={20} color={C.textLight} />
                </Pressable>
              </View>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
    textAlign: "center",
  },
  loginBtn: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.accent,
    borderRadius: 12,
  },
  loginBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  itemWrapper: { marginBottom: 12 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteBtn: {
    padding: 4,
  },
  itemUnread: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemContent: { flex: 1 },
  itemTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  itemBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  itemTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
