import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { Redirect } from "expo-router";
import { useState } from "react";

import { AppButton } from "../../src/components/app-button";
import { Screen } from "../../src/components/screen";
import { useRealtimeFamily } from "../../src/hooks/use-realtime-family";
import { formatGradeOrAge } from "../../src/lib/children";
import { useSession } from "../../src/lib/session";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/lib/theme";

export default function FamilyTab() {
  const { session } = useSession();
  const { familyId, snapshot, services } = useRealtimeFamily();
  const [familyForm, setFamilyForm] = useState({
    household_name: "",
    primary_phone: "",
    email: "",
  });
  const [childForm, setChildForm] = useState({
    first_name: "",
    last_name: "",
    birthdate: "",
    grade_label: "",
    allergies: "",
  });
  const [pickupForm, setPickupForm] = useState({
    full_name: "",
    phone: "",
    relationship: "",
  });
  const [loading, setLoading] = useState(false);

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  async function createFamily() {
    try {
      setLoading(true);
      const { error } = await supabase.rpc("create_family_household", {
        p_household_name: familyForm.household_name,
        p_primary_phone: familyForm.primary_phone,
        p_email: familyForm.email || null,
      });
      if (error) throw error;
      Alert.alert("Household created", "You can now add children and pickup adults.");
    } catch (error) {
      Alert.alert("Unable to create household", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function addChild() {
    if (!familyId) return;
    try {
      setLoading(true);
      const { error } = await supabase.from("children").insert({
        family_id: familyId,
        first_name: childForm.first_name,
        last_name: childForm.last_name,
        birthdate: childForm.birthdate,
        grade_label: childForm.grade_label || null,
        allergies: childForm.allergies || null,
      });
      if (error) throw error;
      setChildForm({
        first_name: "",
        last_name: "",
        birthdate: "",
        grade_label: "",
        allergies: "",
      });
      Alert.alert("Child added", "Your family profile has been updated.");
    } catch (error) {
      Alert.alert("Unable to add child", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function addPickupAdult() {
    if (!familyId) return;
    try {
      setLoading(true);
      const { error } = await supabase.from("authorized_pickups").insert({
        family_id: familyId,
        full_name: pickupForm.full_name,
        phone: pickupForm.phone || null,
        relationship: pickupForm.relationship || null,
        can_pick_up: true,
      });
      if (error) throw error;
      setPickupForm({ full_name: "", phone: "", relationship: "" });
      Alert.alert("Pickup adult added", "They can now be selected during pickup.");
    } catch (error) {
      Alert.alert("Unable to add pickup adult", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      subtitle="Keep children, allergies, and approved pickups up to date across mobile, web, and kiosk."
      title="Family"
    >
      {!snapshot ? (
        <View style={styles.card}>
          <Text style={styles.title}>Create your household</Text>
          <TextInput
            onChangeText={(value) =>
              setFamilyForm((current) => ({ ...current, household_name: value }))
            }
            placeholder="Rivera Family"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={familyForm.household_name}
          />
          <TextInput
            keyboardType="phone-pad"
            onChangeText={(value) =>
              setFamilyForm((current) => ({ ...current, primary_phone: value }))
            }
            placeholder="Primary phone"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={familyForm.primary_phone}
          />
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={(value) =>
              setFamilyForm((current) => ({ ...current, email: value }))
            }
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={familyForm.email}
          />
          <AppButton loading={loading} onPress={createFamily}>
            Create household
          </AppButton>
        </View>
      ) : (
        <>
          <View style={[styles.card, styles.darkCard]}>
            <Text style={styles.darkLabel}>Family summary</Text>
            <Text style={styles.darkTitle}>{snapshot.family.household_name}</Text>
            <Text style={styles.darkSubtext}>
              {snapshot.children.length} children · {snapshot.authorizedPickups.length} approved pickups · {services.length} service options
            </Text>
          </View>

        <View style={styles.card}>
          <Text style={styles.title}>Children</Text>
          {snapshot.children.map((child: any) => (
            <View key={child.id} style={styles.listRow}>
              <Text style={styles.listTitle}>
                {child.preferred_name || child.first_name} {child.last_name}
              </Text>
              <Text style={styles.listText}>
                {formatGradeOrAge(child.grade_label, child.birthdate)} · {child.allergies || "No allergies listed"}
              </Text>
            </View>
          ))}
            <TextInput
              onChangeText={(value) => setChildForm((current) => ({ ...current, first_name: value }))}
              placeholder="First name"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={childForm.first_name}
            />
            <TextInput
              onChangeText={(value) => setChildForm((current) => ({ ...current, last_name: value }))}
              placeholder="Last name"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={childForm.last_name}
            />
            <TextInput
              onChangeText={(value) => setChildForm((current) => ({ ...current, birthdate: value }))}
              placeholder="Birthdate (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={childForm.birthdate}
            />
            <TextInput
              onChangeText={(value) => setChildForm((current) => ({ ...current, grade_label: value }))}
              placeholder="Grade (optional)"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={childForm.grade_label}
            />
            <TextInput
              multiline
              onChangeText={(value) => setChildForm((current) => ({ ...current, allergies: value }))}
              placeholder="Allergies"
              placeholderTextColor={colors.textMuted}
              style={styles.textarea}
              value={childForm.allergies}
            />
            <AppButton loading={loading} onPress={addChild}>
              Add child
            </AppButton>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Approved pickup adults</Text>
            {snapshot.authorizedPickups.map((pickup: any) => (
              <View key={pickup.id} style={styles.listRow}>
                <Text style={styles.listTitle}>{pickup.full_name}</Text>
                <Text style={styles.listText}>
                  {pickup.relationship || "Approved adult"} · {pickup.phone || "No phone"}
                </Text>
              </View>
            ))}
            <TextInput
              onChangeText={(value) => setPickupForm((current) => ({ ...current, full_name: value }))}
              placeholder="Full name"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={pickupForm.full_name}
            />
            <TextInput
              keyboardType="phone-pad"
              onChangeText={(value) => setPickupForm((current) => ({ ...current, phone: value }))}
              placeholder="Phone"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={pickupForm.phone}
            />
            <TextInput
              onChangeText={(value) =>
                setPickupForm((current) => ({ ...current, relationship: value }))
              }
              placeholder="Relationship"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={pickupForm.relationship}
            />
            <AppButton loading={loading} onPress={addPickupAdult} variant="secondary">
              Add pickup adult
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
    lineHeight: 22,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
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
  textarea: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    minHeight: 90,
    padding: 14,
    textAlignVertical: "top",
  },
  listRow: {
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  listTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  listText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
