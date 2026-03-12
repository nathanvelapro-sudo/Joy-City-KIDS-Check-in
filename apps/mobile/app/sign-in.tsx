import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { useState } from "react";

import { AppButton } from "../src/components/app-button";
import { Screen } from "../src/components/screen";
import { supabase } from "../src/lib/supabase";
import { colors } from "../src/lib/theme";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("Sign in failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      subtitle="Parents, volunteers, and admins share the same secure Supabase login."
      title="Welcome back"
    >
      <View style={styles.card}>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={email}
        />
        <TextInput
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          style={styles.input}
          value={password}
        />
        <AppButton loading={loading} onPress={handleSignIn}>
          Sign in
        </AppButton>
      </View>
      <Text style={styles.footer}>
        Need an account? <Link href="/sign-up" style={styles.link}>Create one.</Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  input: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  footer: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
  link: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
});

