import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";

import { useSession } from "../src/lib/session";
import { colors } from "../src/lib/theme";

export default function IndexPage() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.background,
          flex: 1,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <Redirect href={session ? "/(tabs)/home" : "/sign-in"} />;
}

