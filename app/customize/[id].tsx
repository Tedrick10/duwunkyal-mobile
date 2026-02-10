import React, { useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

export default function CustomizeScreen() {
  const { id } = useLocalSearchParams();
  const webViewRef = useRef<WebView>(null);
  const hasNavigatedBack = useRef(false);
  const insets = useSafeAreaInsets();

  const baseUrl = getApiUrl();
  const customizeUrl = `${baseUrl.replace(/\/$/, "")}/customize/${id}`;

  const navigateBack = useCallback(() => {
    if (!hasNavigatedBack.current) {
      hasNavigatedBack.current = true;
      router.back();
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      const handleMessage = (event: MessageEvent) => {
        if (event.data === "GO_BACK") {
          navigateBack();
        }
      };
      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }
  }, [navigateBack]);

  const handleShouldStartLoad = useCallback((request: any) => {
    const url = request.url || "";
    if (url.startsWith("stylevault://")) {
      navigateBack();
      return false;
    }
    return true;
  }, [navigateBack]);

  const handleNavigationStateChange = useCallback((navState: any) => {
    const url = navState.url || "";
    if (url.startsWith("stylevault://")) {
      navigateBack();
    }
  }, [navigateBack]);

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

  const topInset = insets.top;

  const earlyInjectedJS = `
    document.documentElement.style.setProperty('--custom-top-inset', '${topInset}px');
    true;
  `;

  const injectedJS = `
    (function() {
      document.documentElement.style.setProperty('--custom-top-inset', '${topInset}px');

      window.goBack = function() {
        try { window.ReactNativeWebView.postMessage('GO_BACK'); } catch(e) {}
        setTimeout(function() {
          try { window.location.href = 'stylevault://back'; } catch(e) {}
        }, 200);
      };
      var btn = document.querySelector('.back-btn');
      if (btn) {
        var newBtn = btn.cloneNode(true);
        newBtn.removeAttribute('onclick');
        newBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          try { window.ReactNativeWebView.postMessage('GO_BACK'); } catch(ex) {}
          setTimeout(function() {
            try { window.location.href = 'stylevault://back'; } catch(ex) {}
          }, 200);
        }, true);
        btn.parentNode.replaceChild(newBtn, btn);
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
        allowsInlineMediaPlayback
        injectedJavaScriptBeforeContentLoaded={earlyInjectedJS}
        injectedJavaScript={injectedJS}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onNavigationStateChange={handleNavigationStateChange}
        onMessage={(event) => {
          if (event.nativeEvent.data === "GO_BACK") {
            navigateBack();
          }
        }}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        )}
        scalesPageToFit={false}
        originWhitelist={["*", "stylevault://*"]}
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
