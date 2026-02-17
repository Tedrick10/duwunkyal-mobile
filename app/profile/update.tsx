import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { getImageUrl } from "@/lib/query-client";
import Colors from "@/constants/colors";

export default function ProfileUpdateScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { user, updateUser } = useAuth();
  const { colors: C } = useTheme();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission", "Gallery access is needed to change profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone ?? "");
    }
  }, [user]);

  async function handleUpdate() {
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required");
      return;
    }
    if (password.trim() || passwordConfirmation.trim()) {
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      if (password !== passwordConfirmation) {
        setError("Passwords do not match");
        return;
      }
    }
    setLoading(true);
    setError("");
    try {
      await updateUser({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        ...(password.trim() ? { password, password_confirmation: passwordConfirmation } : {}),
        ...(photoUri ? { photoUri } : {}),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <Text style={[styles.emptyText, { color: C.textSecondary }]}>
          Sign in to update your profile
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: C.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + webTopInset + 16, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: `${Colors.error}10` }]}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={[styles.photoSection, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <Pressable onPress={pickPhoto} style={styles.photoTouch}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoImage} />
            ) : user.photo_url ? (
              <Image source={{ uri: getImageUrl(user.photo_url) }} style={styles.photoImage} />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: `${C.accent}20` }]}>
                <Ionicons name="camera-outline" size={36} color={C.accent} />
              </View>
            )}
            <View style={styles.photoBadge}>
              <Ionicons name="camera" size={14} color={Colors.white} />
            </View>
          </Pressable>
          {photoUri ? (
            <Pressable onPress={() => setPhotoUri(null)} style={styles.removePhotoBtn}>
              <Text style={styles.removePhotoText}>Remove new photo</Text>
            </Pressable>
          ) : (
            <Text style={[styles.photoHint, { color: C.textSecondary }]}>Tap to change photo</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: C.textSecondary }]}>Full Name *</Text>
          <View style={[styles.inputContainer, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <Ionicons name="person-outline" size={20} color={C.textLight} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: C.text }]}
              placeholder="John Doe"
              placeholderTextColor={C.textLight}
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: C.textSecondary }]}>Email *</Text>
          <View style={[styles.inputContainer, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <Ionicons name="mail-outline" size={20} color={C.textLight} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: C.text }]}
              placeholder="your@email.com"
              placeholderTextColor={C.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: C.textSecondary }]}>Phone</Text>
          <View style={[styles.inputContainer, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <Ionicons name="call-outline" size={20} color={C.textLight} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: C.text }]}
              placeholder="09123456789"
              placeholderTextColor={C.textLight}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: C.textSecondary }]}>New Password (optional)</Text>
          <View style={[styles.inputContainer, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <Ionicons name="lock-closed-outline" size={20} color={C.textLight} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: C.text }]}
              placeholder="Leave blank to keep current"
              placeholderTextColor={C.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={C.textLight}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: C.textSecondary }]}>Confirm New Password</Text>
          <View style={[styles.inputContainer, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <Ionicons name="lock-closed-outline" size={20} color={C.textLight} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: C.text }]}
              placeholder="Re-enter new password"
              placeholderTextColor={C.textLight}
              value={passwordConfirmation}
              onChangeText={setPasswordConfirmation}
              secureTextEntry={!showPasswordConfirmation}
            />
            <Pressable onPress={() => setShowPasswordConfirmation(!showPasswordConfirmation)} style={styles.eyeBtn}>
              <Ionicons
                name={showPasswordConfirmation ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={C.textLight}
              />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>Save Changes</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  photoSection: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  photoTouch: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: "hidden",
    marginBottom: 8,
  },
  photoImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  photoPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  photoBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  photoHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  removePhotoBtn: { marginTop: 8 },
  removePhotoText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.error },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  errorText: { color: Colors.error, fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  inputGroup: { marginBottom: 18 },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginLeft: 4,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
  inputIcon: { marginLeft: 14 },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  eyeBtn: { padding: 14 },
  button: {
    backgroundColor: Colors.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  buttonPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
