import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import HeroHeading from "../components/HeroHeading";
import ScreenSurface from "../components/ScreenSurface";
import { useWallet } from "../contexts/WalletContext";
import { createPost } from "../services/api";
import { buildContentRecord, detectIpfsCid } from "../services/decentralized";
import { COLORS, TYPOGRAPHY } from "../theme";
import ConnectWalletScreen from "./auth/ConnectWalletScreen";

const CreatePostScreen = () => {
  const navigation = useNavigation<any>();
  const { isConnected, token } = useWallet();
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const normalizedOptions = useMemo(
    () => pollOptions.map((option) => option.trim()).filter(Boolean),
    [pollOptions],
  );

  if (!isConnected) {
    return <ConnectWalletScreen />;
  }

  const updateOption = (index: number, value: string) => {
    setPollOptions((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? value : entry,
      ),
    );
  };

  const addOption = () => {
    setPollEnabled(true);
    setPollOptions((current) => [...current, ""]);
  };

  const removeOption = (index: number) => {
    setPollOptions((current) =>
      current.filter((_, entryIndex) => entryIndex !== index),
    );
  };

  const submitPost = async () => {
    if (!token) {
      setStatusMessage("Wallet session missing. Reconnect to continue.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const normalizedMediaUrl = mediaUrl.trim() || null;
      await createPost(token, {
        body,
        mediaUrl: normalizedMediaUrl,
        pollOptions: pollEnabled ? normalizedOptions : [],
        decentralized: buildContentRecord(body, {
          contentCid: detectIpfsCid(normalizedMediaUrl),
        }),
      });

      setBody("");
      setMediaUrl("");
      setPollEnabled(false);
      setPollOptions(["", ""]);
      setStatusMessage("Post published to the anonymous feed.");
      navigation.navigate("Home");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to publish post.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const heroStats = [
    {
      icon: "create-outline" as const,
      label: "Zero names stored",
      color: COLORS.primary,
    },
    {
      icon: "lock-closed-outline" as const,
      label: "Wallet-gated publishing",
      color: COLORS.secondary,
    },
  ];

  const canSubmit =
    body.trim().length > 0 && (!pollEnabled || normalizedOptions.length >= 2);

  return (
    <ScreenSurface>
      <ScrollView contentContainerStyle={styles.container}>
        <HeroHeading
          title="Post Anonymously"
          subtitle="Stay unseen, but always heard."
          ctaLabel={pollEnabled ? "Poll ready" : "Draft safe"}
          stats={heroStats}
        />

        {statusMessage && (
          <View style={styles.statusBanner}>
            <Ionicons
              name={
                statusMessage.includes("published")
                  ? "checkmark-circle-outline"
                  : "alert-circle-outline"
              }
              size={18}
              color={
                statusMessage.includes("published")
                  ? COLORS.primary
                  : COLORS.secondary
              }
            />
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        )}

        <View style={styles.formCard}>
          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder="Drop your confession, report, or hot take..."
            placeholderTextColor={COLORS.gray}
            multiline
            value={body}
            onChangeText={setBody}
          />
          <TextInput
            style={styles.input}
            placeholder="Optional media URL"
            placeholderTextColor={COLORS.gray}
            autoCapitalize="none"
            value={mediaUrl}
            onChangeText={setMediaUrl}
          />
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => setPollEnabled((current) => !current)}
            >
              <Ionicons
                name="stats-chart-outline"
                size={18}
                color={COLORS.secondary}
              />
              <Text style={styles.quickText}>
                {pollEnabled ? "Remove poll" : "Attach poll"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {pollEnabled && (
          <>
            <Text style={styles.sectionLabel}>Poll options</Text>
            <View style={styles.pollCard}>
              {pollOptions.map((option, index) => (
                <View key={`${index}-${option}`} style={styles.optionRow}>
                  <TextInput
                    style={[styles.input, styles.optionInput]}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor={COLORS.gray}
                    value={option}
                    onChangeText={(value) => updateOption(index, value)}
                  />
                  {pollOptions.length > 2 ? (
                    <TouchableOpacity
                      onPress={() => removeOption(index)}
                      style={styles.removeBtn}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#F87171"
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
              <TouchableOpacity style={styles.addOptionBtn} onPress={addOption}>
                <Ionicons
                  name="add-circle-outline"
                  size={18}
                  color={COLORS.primary}
                />
                <Text style={[styles.quickText, { color: COLORS.primary }]}>
                  Add option
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <TouchableOpacity
          style={[
            styles.postBtn,
            (!canSubmit || isSubmitting) && styles.postBtnDisabled,
          ]}
          onPress={submitPost}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.text} style={{ marginRight: 8 }} />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={COLORS.text}
              style={{ marginRight: 8 }}
            />
          )}
          <Text style={styles.postBtnText}>
            {isSubmitting ? "Publishing..." : "Post"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenSurface>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, paddingBottom: 140 },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    marginBottom: 18,
  },
  statusText: { color: COLORS.text, flex: 1, ...TYPOGRAPHY.label },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.02)",
    color: COLORS.text,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    fontSize: 16,
    lineHeight: 22,
  },
  messageInput: { minHeight: 140, textAlignVertical: "top" },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${COLORS.secondary}20`,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${COLORS.secondary}25`,
  },
  quickText: { color: COLORS.gray, ...TYPOGRAPHY.label },
  sectionLabel: {
    color: COLORS.text,
    ...TYPOGRAPHY.section,
    marginBottom: 12,
  },
  pollCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  optionInput: { flex: 1 },
  removeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${COLORS.secondary}12`,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${COLORS.secondary}20`,
  },
  addOptionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignSelf: "stretch",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  postBtnDisabled: {
    opacity: 0.55,
  },
  postBtnText: { color: COLORS.text, ...TYPOGRAPHY.button },
});

export default CreatePostScreen;
