import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { useState } from "react";

import { AppButton } from "../src/components/app-button";
import { Screen } from "../src/components/screen";
import { supabase } from "../src/lib/supabase";
import { colors } from "../src/lib/theme";

export default function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
          },
        },
      });

      if (error) throw error;

      if (!data.session) {
        Alert.alert("Check your email", "Your account was created. Open the confirmation email to finish setup.");
        router.replace("/sign-in");
        return;
      }

      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("Sign up failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      subtitle="Create one secure account, then manage your family from mobile or web."
      title="Create your family login"
    >
      <View style={styles.card}>
        <TextInput
          onChangeText={setFullName}
          placeholder="Full name"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={fullName}
        />
        <TextInput
          keyboardType="phone-pad"
          onChangeText={setPhone}
          placeholder="Phone"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={phone}
        />
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
        <AppButton loading={loading} onPress={handleSignUp}>
          Create account
        </AppButton>
      </View>
      <Text style={styles.footer}>
        Already signed up? <Link href="/sign-in" style={styles.link}>Sign in.</Link>
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

