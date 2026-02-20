import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { getImageUrl } from "@/lib/query-client";
import { useTheme } from "@/lib/theme-context";
import Colors from "@/constants/colors";

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { user, updateUser } = useAuth();
  const { colors: C } = useTheme();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setEmail(user.email || "");
      setAddress(user.address || "");
    }
  }, [user]);

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("Gallery access is needed to change your photo.");
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

  async function handleSave() {
    if (!user) return;
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!phone.trim()) {
      setError("Phone number is required");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email");
      return;
    }
    if (password || passwordConfirmation) {
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await updateUser({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        photoUri: photoUri ?? undefined,
        ...(password ? { password, password_confirmation: passwordConfirmation } : {}),
      });
      router.back();
    } catch (e: any) {
      setError(e.message || "Update failed");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <Text style={[styles.emptyText, { color: C.textSecondary }]}>
          Sign in to edit your profile
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

  const displayPhoto = photoUri ?? (user.photo_url ? getImageUrl(user.photo_url) : null);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: C.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + webTopInset + 16,
            paddingBottom: insets.bottom + 100,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.avatarSection, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <Pressable onPress={pickPhoto} style={styles.avatarPressable}>
            {displayPhoto ? (
              <Image source={{ uri: displayPhoto }} style={styles.avatarLarge} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${C.accent}20` }]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={[styles.cameraBadge, { backgroundColor: C.accent }]}>
              <Ionicons name="camera" size={14} color={Colors.white} />
            </View>
          </Pressable>
          {displayPhoto ? (
            <Pressable
              onPress={() => setPhotoUri(null)}
              style={({ pressed }) => [styles.removePhotoBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.removePhotoText}>Remove photo</Text>
            </Pressable>
          ) : (
            <Text style={[styles.photoHint, { color: C.textSecondary }]}>Tap to change photo</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Personal Information</Text>
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            {!!error && (
              <View style={[styles.errorBox, { borderColor: C.borderLight }]}>
                <Ionicons name="alert-circle" size={18} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={[styles.inputRow, { borderColor: C.borderLight }]}>
              <Ionicons name="person-outline" size={20} color={C.accent} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: C.text }]}
                placeholder="Full Name"
                placeholderTextColor={C.textLight}
                value={name}
                onChangeText={setName}
              />
            </View>
            <View style={[styles.inputRow, { borderColor: C.borderLight }]}>
              <Ionicons name="call-outline" size={20} color={C.accent} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: C.text }]}
                placeholder="Phone Number"
                placeholderTextColor={C.textLight}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
            <View style={[styles.inputRow, { borderColor: C.borderLight }]}>
              <Ionicons name="mail-outline" size={20} color={C.accent} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: C.text }]}
                placeholder="Email (optional)"
                placeholderTextColor={C.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={[styles.inputRow, styles.inputRowLast, { borderColor: C.borderLight }]}>
              <Ionicons name="location-outline" size={20} color={C.accent} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: C.text, minHeight: 44 }]}
                placeholder="Address (optional)"
                placeholderTextColor={C.textLight}
                value={address}
                onChangeText={setAddress}
                multiline
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Change Password (optional)</Text>
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <View style={[styles.inputRow, { borderColor: C.borderLight }]}>
              <Ionicons name="lock-closed-outline" size={20} color={C.accent} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: C.text }]}
                placeholder="New password"
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
            <View style={[styles.inputRow, styles.inputRowLast, { borderColor: C.borderLight }]}>
              <Ionicons name="lock-closed-outline" size={20} color={C.accent} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: C.text }]}
                placeholder="Confirm new password"
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
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: C.accent },
            pressed && { opacity: 0.9 },
            loading && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
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
  avatarPressable: {
    position: "relative",
    marginBottom: 8,
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
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  removePhotoBtn: { marginBottom: 4 },
  removePhotoText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
  },
  photoHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  section: { marginBottom: 24 },
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
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    margin: 16,
    marginBottom: 0,
    borderRadius: 10,
    backgroundColor: `${Colors.error}12`,
    borderWidth: 1,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  inputRowLast: {
    borderBottomWidth: 0,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  eyeBtn: { padding: 14 },
  saveBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
