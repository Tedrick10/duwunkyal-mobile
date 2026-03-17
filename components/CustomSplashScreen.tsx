import React from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator } from "react-native";

const logo = require("../assets/images/logo-white-bg.png");

export function CustomSplashScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={logo}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>DUWUNKYAL</Text>
      <ActivityIndicator
        size="large"
        color="#1a1a2e"
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#1a1a2e",
    marginBottom: 32,
  },
  loader: {
    marginTop: 8,
  },
});
