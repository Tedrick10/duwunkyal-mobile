import React, { useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

export default function CustomizeScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webViewRef = useRef<WebView>(null);

  const baseUrl = getApiUrl();
  const customizeUrl = `${baseUrl.replace(/\/$/, "")}/customize/${id}`;

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={styles.webHeader}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </Pressable>
        </View>
        <iframe
          src={customizeUrl}
          style={{
            flex: 1,
            width: "100%",
            height: "100%",
            border: "none",
          } as any}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.webHeader}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </Pressable>
      </View>
      <WebView
        ref={webViewRef}
        source={{ uri: customizeUrl }}
        style={styles.webView}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        )}
        scalesPageToFit={false}
        originWhitelist={["*"]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  webHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
});
