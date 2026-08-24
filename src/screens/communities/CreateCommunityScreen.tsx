import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import GuideModal from "../../components/GuideModal";
import HeroHeading from "../../components/HeroHeading";
import ScreenSurface from "../../components/ScreenSurface";
import { useWallet } from "../../contexts/WalletContext";
import { createCommunity } from "../../services/api";
import { COLORS, TYPOGRAPHY } from "../../theme";
import { getFriendlyErrorMessage } from "../../utils/errorMessages";

const COMMUNITY_PROMPTS = [
  "Campus updates and rumors",
  "Project team room",
  "Anonymous accountability group",
  "Private event planning",
];

export default function CreateCommunityScreen() {
  const navigation = useNavigation<any>();
  const { token } = useWallet();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter a community name.");
      return;
    }

    if (!token) {
      Alert.alert(
        "Session required",
        "Log in again before creating a community.",
      );
      return;
    }

    setLoading(true);
    try {
      const response = await createCommunity(token, {
        name: name.trim(),
        description: description.trim(),
      });
      Alert.alert(
        "Community created",
        `Your room is live. Share code ${response.data.inviteCode} when you're ready to invite people.`,
      );
      navigation.replace("CommunityChat", {
        communityId: response.data.id,
        communityName: response.data.name,
      });
    } catch (error) {
      Alert.alert(
        "Create failed",
        getFriendlyErrorMessage(error, "Failed to create community."),
      );
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = name.trim().length > 0 && !loading;
  const bottomSpacing = tabBarHeight + Math.max(insets.bottom, 14) + 16;

  return (
    <ScreenSurface style={styles.surface}>
      <ScrollView
        stickyHeaderIndices={[0]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomSpacing },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <HeroHeading
          title="Create Room"
          subtitle="Private room. Invite who matters."
          artSection="community"
          ctaLabel="Ready to launch"
          ctaIcon="sparkles-outline"
          stats={[
            {
              icon: "lock-closed-outline" as const,
              label: "Private by default",
              color: COLORS.primary,
            },
            {
              icon: "paper-plane-outline" as const,
              label: "Invite-only access",
              color: COLORS.secondary,
            },
          ]}
          subtitleLines={2}
        />

        <GuideModal
          guideKey="create-community"
          title="Create Room Help"
          items={[
            "Add a clear name first so people know what the room is for.",
            "Add a short description so invited members understand the topic.",
            "After creation, go back to Community to open the room and share invites.",
          ]}
        />

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Community details</Text>
          <TextInput
            style={styles.input}
            placeholder="Community name"
            placeholderTextColor={COLORS.gray}
            value={name}
            onChangeText={setName}
            maxLength={32}
          />
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            placeholder="Describe what this room is for"
            placeholderTextColor={COLORS.gray}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={160}
          />
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              Name keeps the room discoverable to invited members.
            </Text>
            <Text style={styles.metaText}>{name.trim().length}/32</Text>
          </View>
        </View>

        <View style={styles.promptSection}>
          <Text style={styles.sectionTitle}>Fast room ideas</Text>
          <View style={styles.promptRow}>
            {COMMUNITY_PROMPTS.map((prompt) => (
              <TouchableOpacity
                key={prompt}
                style={styles.promptChip}
                onPress={() => {
                  if (!name.trim()) {
                    setName(prompt);
                  } else if (!description.trim()) {
                    setDescription(prompt);
                  }
                }}
              >
                <Text style={styles.promptChipText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.rulesSection}>
          <View style={styles.ruleRow}>
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.ruleText}>
              Creator becomes the first admin.
            </Text>
          </View>
          <View style={styles.ruleRow}>
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.ruleText}>
              Invite codes are how new members get in.
            </Text>
          </View>
          <View style={styles.ruleRow}>
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.ruleText}>
              Messages stay inside the room once access is granted.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.createButton,
            !canSubmit && styles.createButtonDisabled,
            { marginBottom: Math.max(insets.bottom, 10) },
          ]}
          onPress={handleCreate}
          disabled={!canSubmit}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <>
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={COLORS.text}
              />
              <Text style={styles.createButtonText}>Create community</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  surface: { flex: 1, padding: 16 },
  content: { paddingBottom: 60 },
  formSection: {
    paddingTop: 6,
    paddingBottom: 18,
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  sectionTitle: { color: COLORS.text, ...TYPOGRAPHY.section, marginBottom: 12 },
  input: {
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    ...TYPOGRAPHY.label,
  },
  descriptionInput: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  metaText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    flex: 1,
  },
  promptSection: {
    paddingBottom: 18,
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  promptRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  promptChip: {
    borderRadius: 999,
    backgroundColor: `${COLORS.secondary}14`,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  promptChipText: {
    color: COLORS.secondary,
    ...TYPOGRAPHY.meta,
  },
  rulesSection: {
    paddingBottom: 18,
    gap: 12,
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ruleText: { color: COLORS.text, ...TYPOGRAPHY.label, flex: 1 },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 16,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  createButtonDisabled: { opacity: 0.55 },
  createButtonText: { color: COLORS.text, ...TYPOGRAPHY.button },
});
