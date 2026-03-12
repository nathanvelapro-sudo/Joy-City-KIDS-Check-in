import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import { AppButton } from "../../src/components/app-button";
import { Screen } from "../../src/components/screen";
import { useRealtimeFamily } from "../../src/hooks/use-realtime-family";
import { useSession } from "../../src/lib/session";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/lib/theme";

export default function PrecheckinTab() {
  const { session } = useSession();
  const { familyId, snapshot, services } = useRealtimeFamily();
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedChildren, setSelectedChildren] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (services[0]?.id) {
      setSelectedServiceId((current) => current || services[0].id);
    }
  }, [services]);

  useEffect(() => {
    if (!snapshot?.children) return;
    setSelectedChildren(
      Object.fromEntries(snapshot.children.map((child: any) => [child.id, true])),
    );
  }, [snapshot?.children]);

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  async function handleSubmit() {
    if (!familyId) {
      Alert.alert("Set up your family first", "Open the Family tab to create your household.");
      return;
    }

    const childIds = Object.entries(selectedChildren)
      .filter(([, isSelected]) => isSelected)
      .map(([childId]) => childId);

    if (childIds.length === 0) {
      Alert.alert("Choose children", "Select at least one child for pre-check-in.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.rpc("submit_precheckin", {
        p_family_id: familyId,
        p_service_event_id: selectedServiceId,
        p_child_ids: childIds,
        p_notes: note || null,
      });

      if (error) throw error;
      Alert.alert("Pre-check-in submitted", "You are ready to head to the kiosk.");
      setNote("");
    } catch (error) {
      Alert.alert("Unable to pre-check-in", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      subtitle="Pick your service, select children, and send notes to the kiosk team before you arrive."
      title="Pre-check-in"
    >
      {!snapshot ? (
        <View style={styles.card}>
          <Text style={styles.title}>Set up your household first</Text>
          <Text style={styles.text}>
            You will be able to pre-check-in once your family record and children have been added.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.title}>Choose a service</Text>
            <View style={styles.chipWrap}>
              {services.map((service) => (
                <Pressable
                  key={service.id}
                  onPress={() => setSelectedServiceId(service.id)}
                  style={[
                    styles.chip,
                    selectedServiceId === service.id ? styles.chipActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedServiceId === service.id ? styles.chipTextActive : null,
                    ]}
                  >
                    {service.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Who is coming?</Text>
            {snapshot.children.map((child: any) => (
              <Pressable
                key={child.id}
                onPress={() =>
                  setSelectedChildren((current) => ({
                    ...current,
                    [child.id]: !current[child.id],
                  }))
                }
                style={[
                  styles.selectionCard,
                  selectedChildren[child.id] ? styles.selectionCardActive : null,
                ]}
              >
                <View>
                  <Text style={styles.selectionTitle}>
                    {child.preferred_name || child.first_name} {child.last_name}
                  </Text>
                  <Text style={styles.selectionText}>
                    {child.grade_label || child.birthdate}
                  </Text>
                  <Text style={styles.selectionText}>
                    {child.allergies || "No allergies listed"}
                  </Text>
                </View>
                <Text style={styles.checkbox}>{selectedChildren[child.id] ? "✓" : ""}</Text>
              </Pressable>
            ))}
            <TextInput
              multiline
              onChangeText={setNote}
              placeholder="Optional note for the kiosk team"
              placeholderTextColor={colors.textMuted}
              style={styles.textarea}
              value={note}
            />
            <AppButton loading={loading} onPress={handleSubmit}>
              Submit pre-check-in
            </AppButton>
          </View>
        </>
      )}
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
  text: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#fff",
  },
  selectionCard: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
  },
  selectionCardActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.primary,
  },
  selectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  selectionText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 3,
  },
  checkbox: {
    borderColor: colors.primary,
    borderRadius: 999,
    borderWidth: 1,
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "700",
    height: 28,
    lineHeight: 26,
    textAlign: "center",
    width: 28,
  },
  textarea: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    minHeight: 110,
    padding: 14,
    textAlignVertical: "top",
  },
});

