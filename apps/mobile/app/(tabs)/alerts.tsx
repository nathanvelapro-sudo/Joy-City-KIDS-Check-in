import { Redirect } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/screen";
import { useRealtimeFamily } from "../../src/hooks/use-realtime-family";
import { formatTemplateLabel, normalizeBrandCopy } from "../../src/lib/notifications";
import { useSession } from "../../src/lib/session";
import { colors } from "../../src/lib/theme";

export default function AlertsTab() {
  const { session } = useSession();
  const { snapshot, precheckins } = useRealtimeFamily();

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Screen
      subtitle="Stay aware of live volunteer alerts, recent pre-check-ins, and active pickup status."
      title="Alerts"
    >
      <View style={styles.card}>
        <Text style={styles.title}>Notifications</Text>
        {snapshot?.notifications?.length ? (
          snapshot.notifications.map((notification: any) => (
            <View key={notification.id} style={styles.row}>
              <Text style={styles.rowTitle}>{formatTemplateLabel(notification.template_key)}</Text>
              <Text style={styles.rowText}>{normalizeBrandCopy(notification.message_body)}</Text>
              <Text style={styles.badge}>{notification.status}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No alerts yet.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Recent pre-check-ins</Text>
        {precheckins.length ? (
          precheckins.map((precheckin: any) => (
            <View key={precheckin.id} style={styles.row}>
              <Text style={styles.rowTitle}>{precheckin.service?.name || "Upcoming service"}</Text>
              <Text style={styles.rowText}>{precheckin.notes || "No notes"}</Text>
              <Text style={styles.badge}>{precheckin.status}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No recent pre-check-ins.</Text>
        )}
      </View>
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
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  row: {
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  rowText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.secondary,
    borderRadius: 999,
    color: colors.primaryDark,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
