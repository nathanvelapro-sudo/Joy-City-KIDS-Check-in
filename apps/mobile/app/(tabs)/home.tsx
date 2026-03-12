import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Redirect } from "expo-router";

import { Screen } from "../../src/components/screen";
import { useRealtimeFamily } from "../../src/hooks/use-realtime-family";
import { formatTemplateLabel } from "../../src/lib/notifications";
import { useSession } from "../../src/lib/session";
import { colors } from "../../src/lib/theme";

export default function HomeTab() {
  const { session, loading: authLoading } = useSession();
  const { familyId, loading, snapshot, services } = useRealtimeFamily();

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Screen
      subtitle="Your family snapshot updates live whenever a volunteer checks kids in or sends a room message."
      title="SafeKids Home"
    >
      {!familyId || !snapshot ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Finish your family setup</Text>
          <Text style={styles.cardText}>
            Head to the Family tab to create your household, add children, and set approved pickup adults.
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.card, styles.darkCard]}>
            <Text style={styles.darkLabel}>Household</Text>
            <Text style={styles.darkTitle}>{snapshot.family.household_name}</Text>
            <Text style={styles.darkSubtext}>
              {snapshot.children.length} children · {snapshot.authorizedPickups.length} approved adults
            </Text>
          </View>

          {snapshot.activeSession ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Active security code</Text>
              <Text style={styles.code}>{snapshot.activeSession.security_code}</Text>
              <View style={styles.qrWrap}>
                <QRCode
                  backgroundColor="transparent"
                  color={colors.text}
                  size={180}
                  value={snapshot.activeSession.security_qr_token}
                />
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No active check-in</Text>
              <Text style={styles.cardText}>
                Pre-check-in from the next tab, then your live pickup code will appear here after kiosk drop-off.
              </Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Next services</Text>
            {services.map((service) => (
              <View key={service.id} style={styles.listRow}>
                <Text style={styles.listPrimary}>{service.name}</Text>
                <Text style={styles.listSecondary}>{service.starts_at}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent alerts</Text>
            {loading ? <ActivityIndicator color={colors.primary} /> : null}
            {snapshot.notifications.length === 0 ? (
              <Text style={styles.cardText}>No alerts yet.</Text>
            ) : (
              snapshot.notifications.slice(0, 5).map((notification: any) => (
                <View key={notification.id} style={styles.notice}>
                  <Text style={styles.noticeTitle}>{formatTemplateLabel(notification.template_key)}</Text>
                  <Text style={styles.noticeText}>{notification.message_body}</Text>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  darkCard: {
    backgroundColor: colors.text,
  },
  darkLabel: {
    color: "#fdba74",
    fontSize: 12,
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  darkTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
  },
  darkSubtext: {
    color: "#fed7aa",
    fontSize: 14,
  },
  cardLabel: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 2.2,
    textTransform: "uppercase",
  },
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  cardText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  code: {
    color: colors.text,
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: 6,
  },
  qrWrap: {
    alignItems: "center",
    paddingVertical: 12,
  },
  listRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 4,
    paddingTop: 12,
  },
  listPrimary: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  listSecondary: {
    color: colors.textMuted,
    fontSize: 13,
  },
  notice: {
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  noticeTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  noticeText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
