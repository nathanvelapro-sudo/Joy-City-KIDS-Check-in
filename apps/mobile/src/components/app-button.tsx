import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { colors } from "../lib/theme";

export function AppButton({
  children,
  onPress,
  variant = "primary",
  loading = false,
}: {
  children: ReactNode;
  onPress: () => void;
  variant?: "primary" | "secondary";
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" ? styles.secondaryButton : styles.primaryButton,
        pressed ? styles.pressed : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? colors.primary : "#fff"} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === "secondary" ? styles.secondaryText : styles.primaryText,
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.85,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderColor: colors.border,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  primaryText: {
    color: "#fff",
  },
  secondaryText: {
    color: colors.primaryDark,
  },
});

