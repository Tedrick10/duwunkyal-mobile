import React, { useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { WebView } from "react-native-webview";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

export default function CustomizeScreen() {
  const { id } = useLocalSearchParams();
  const webViewRef = useRef<WebView>(null);

  const baseUrl = getApiUrl();
  const customizeUrl = `${baseUrl.replace(/\/$/, "")}/customize/${id}`;

  useEffect(() => {
    if (Platform.OS === "web") {
      const handleMessage = (event: MessageEvent) => {
        if (event.data === "GO_BACK") {
          router.back();
        }
      };
      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }
  }, []);

  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
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

  const injectedJS = `
    (function() {
      var backBtn = document.querySelector('.back-btn');
      if (backBtn) {
        backBtn.onclick = function(e) {
          e.preventDefault();
          window.ReactNativeWebView.postMessage('GO_BACK');
        };
      }
    })();
    true;
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: customizeUrl }}
        style={styles.webView}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        injectedJavaScript={injectedJS}
        onMessage={(event) => {
          if (event.nativeEvent.data === "GO_BACK") {
            router.back();
          }
        }}
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
