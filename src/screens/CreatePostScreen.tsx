import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import HeroHeading from "../components/HeroHeading";
import GuideModal from "../components/GuideModal";
import ScreenSurface from "../components/ScreenSurface";
import { useWallet } from "../contexts/WalletContext";
import { createPost } from "../services/api";
import { buildContentRecord, detectIpfsCid } from "../services/decentralized";
import { COLORS, TYPOGRAPHY } from "../theme";
import ConnectWalletScreen from "./auth/ConnectWalletScreen";

const BODY_LIMIT = 280;
const CATEGORIES = [
  "general",
  "school",
  "relationships",
  "tech",
  "confession",
  "city",
] as const;
const CONTENT_MODES = [
  {
    id: "standard",
    label: "Standard",
    helper: "Normal anonymous post for the main feed.",
  },
  {
    id: "confession",
    label: "Confession",
    helper: "Secret-style post built for reactions and advice.",
  },
  {
    id: "qna",
    label: "Anonymous Q&A",
    helper: "Invite people to ask or answer anonymously.",
  },
  {
    id: "story",
    label: "24h story",
    helper: "Temporary post that disappears after one day.",
  },
] as const;
const POST_TEMPLATES = [
  { label: "Confession", body: "Confession: " },
  { label: "Campus alert", body: "Campus alert: " },
  { label: "Hot take", body: "Hot take: " },
  { label: "Ask the feed", body: "Need advice on " },
];

const QUALITY_CHECKS = [
  "Clear opening line",
  "Enough context to reply",
  "No personal identifiers",
  "Fits the anonymous tone",
];

const CreatePostScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isConnected, token } = useWallet();
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number]>("general");
  const [contentMode, setContentMode] =
    useState<(typeof CONTENT_MODES)[number]["id"]>("standard");
  const [campusTag, setCampusTag] = useState("");
  const [cityTag, setCityTag] = useState("");
  const [temporaryEnabled, setTemporaryEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const normalizedOptions = useMemo(
    () => pollOptions.map((option) => option.trim()).filter(Boolean),
    [pollOptions],
  );
  const trimmedBody = body.trim();
  const trimmedMediaUrl = mediaUrl.trim();
  const remainingCharacters = BODY_LIMIT - body.length;
  const completedChecks = useMemo(
    () =>
      QUALITY_CHECKS.filter((check) => {
        if (!trimmedBody && trimmedMediaUrl) {
          return check !== "Enough context to reply";
        }
        if (check === "Clear opening line") {
          return trimmedBody.length >= 24 || Boolean(trimmedMediaUrl);
        }
        if (check === "Enough context to reply") {
          return trimmedBody.split(" ").filter(Boolean).length >= 8;
        }
        if (check === "No personal identifiers") {
          return !/@|\d{7,}|https?:\/\//i.test(trimmedBody);
        }
        return trimmedBody.length > 0 || Boolean(trimmedMediaUrl);
      }).length,
    [trimmedBody, trimmedMediaUrl],
  );

  useEffect(() => {
    if (!route.params?.startWithPoll) {
      return;
    }

    setPollEnabled(true);
    setPollOptions((current) => (current.length >= 2 ? current : ["", ""]));
    navigation.setParams({ startWithPoll: undefined });
  }, [navigation, route.params?.startWithPoll]);

  useEffect(() => {
    setTemporaryEnabled(contentMode === "story");
    if (contentMode === "confession") {
      setCategory("confession");
    }
  }, [contentMode]);

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

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatusMessage("Allow photo access to attach an image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.35,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset?.base64) {
      setStatusMessage("Could not prepare that image. Try another one.");
      return;
    }

    const mimeType = asset.mimeType || "image/jpeg";
    setMediaUrl(`data:${mimeType};base64,${asset.base64}`);
    setStatusMessage("Image attached.");
  };

  const submitPost = async () => {
    if (!token) {
      setStatusMessage("Wallet session missing. Reconnect to continue.");
      return;
    }

    if (!trimmedBody && !trimmedMediaUrl) {
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const normalizedMediaUrl = trimmedMediaUrl || null;
      await createPost(token, {
        body: trimmedBody,
        mediaUrl: normalizedMediaUrl,
        pollOptions: pollEnabled ? normalizedOptions : [],
        category,
        contentMode,
        expiresAt: temporaryEnabled
          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          : null,
        campusTag: campusTag.trim() || null,
        cityTag: cityTag.trim() || null,
        decentralized: buildContentRecord(trimmedBody || "image-post", {
          contentCid: detectIpfsCid(normalizedMediaUrl),
        }),
      });

      setBody("");
      setMediaUrl("");
      setPollEnabled(false);
      setPollOptions(["", ""]);
      setCampusTag("");
      setCityTag("");
      setCategory("general");
      setContentMode("standard");
      setTemporaryEnabled(false);
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
      label: "Names stay hidden",
      color: COLORS.primary,
    },
    {
      icon: "image-outline" as const,
      label: trimmedMediaUrl ? "Image attached" : "Photo ready",
      color: COLORS.secondary,
    },
  ];

  const canSubmit =
    (trimmedBody.length > 0 || trimmedMediaUrl.length > 0) &&
    trimmedBody.length <= BODY_LIMIT &&
    (!pollEnabled || normalizedOptions.length >= 2);

  return (
    <ScreenSurface>
      <ScrollView contentContainerStyle={styles.container}>
        <HeroHeading
          title={pollEnabled ? "Create Poll" : "Post Anonymously"}
          subtitle="Add a caption, add a photo, or do both. Keep it sharp and anonymous."
          ctaLabel={pollEnabled ? "Poll ready" : "Draft safe"}
          stats={heroStats}
        />
        <GuideModal
          guideKey="post"
          title="Post Guide"
          items={[
            "Write a caption, add an image, or do both before posting.",
            "Use Comments and Polls buttons at the top when you want those tools.",
            "Connect your wallet first if the app sends you to Wallet before posting.",
          ]}
        />

        <View style={styles.toolsCard}>
          <TouchableOpacity
            style={styles.toolButton}
            onPress={() => navigation.navigate("Comments")}
          >
            <Ionicons
              name="chatbubble-outline"
              size={18}
              color={COLORS.text}
            />
            <Text style={styles.toolButtonText}>Comments</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolButton}
            onPress={() => navigation.navigate("Polls")}
          >
            <Ionicons
              name="stats-chart-outline"
              size={18}
              color={COLORS.text}
            />
            <Text style={styles.toolButtonText}>Polls</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.templateRow}>
          {POST_TEMPLATES.map((template) => (
            <TouchableOpacity
              key={template.label}
              style={styles.templateChip}
              onPress={() =>
                setBody((current) =>
                  current.trim().length ? current : template.body,
                )
              }
            >
              <Text style={styles.templateChipText}>{template.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.modeCard}>
          <Text style={styles.sectionLabel}>Post mode</Text>
          <View style={styles.modeRow}>
            {CONTENT_MODES.map((mode) => {
              const active = contentMode === mode.id;
              return (
                <TouchableOpacity
                  key={mode.id}
                  style={[styles.modeChip, active && styles.modeChipActive]}
                  onPress={() => setContentMode(mode.id)}
                >
                  <Text
                    style={[
                      styles.modeChipTitle,
                      active && styles.modeChipTitleActive,
                    ]}
                  >
                    {mode.label}
                  </Text>
                  <Text style={styles.modeChipHelper}>{mode.helper}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.strategyCard}>
          <View style={styles.strategyCopy}>
            <Text style={styles.strategyTitle}>High-signal posting</Text>
            <Text style={styles.strategyText}>
              Strong posts feel specific, easy to answer, and safe to engage with anonymously.
            </Text>
          </View>
          <View style={styles.scorePill}>
            <Text style={styles.scorePillLabel}>Quality</Text>
            <Text style={styles.scorePillValue}>
              {completedChecks}/{QUALITY_CHECKS.length}
            </Text>
          </View>
        </View>

        {statusMessage && (
          <View style={styles.statusBanner}>
            <Ionicons
              name={
                statusMessage.includes("published") || statusMessage.includes("attached")
                  ? "checkmark-circle-outline"
                  : "alert-circle-outline"
              }
              size={18}
              color={
                statusMessage.includes("published") || statusMessage.includes("attached")
                  ? COLORS.primary
                  : COLORS.secondary
              }
            />
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        )}

        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORIES.map((item) => {
              const active = category === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.categoryChip,
                    active && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(item)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      active && styles.categoryChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder="Write a caption, confession, report, or leave it blank and post only the image..."
            placeholderTextColor={COLORS.gray}
            multiline
            value={body}
            onChangeText={setBody}
            maxLength={BODY_LIMIT}
          />
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              Captions are optional when you attach an image.
            </Text>
            <Text style={styles.metaText}>{remainingCharacters} left</Text>
          </View>

          <View style={styles.mediaCard}>
            <View style={styles.mediaHeader}>
              <Text style={styles.mediaTitle}>Photo attachment</Text>
              {trimmedMediaUrl ? (
                <TouchableOpacity onPress={() => setMediaUrl("")}>
                  <Text style={styles.mediaLink}>Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={styles.mediaHelper}>
              Add a picture from your phone and post it with or without a caption.
            </Text>
            <TouchableOpacity style={styles.mediaButton} onPress={pickImage}>
              <Ionicons name="image-outline" size={18} color={COLORS.text} />
              <Text style={styles.mediaButtonText}>
                {trimmedMediaUrl ? "Change image" : "Pick image"}
              </Text>
            </TouchableOpacity>
            {trimmedMediaUrl ? (
              <Image source={{ uri: trimmedMediaUrl }} style={styles.mediaPreview} contentFit="cover" />
            ) : null}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Campus tag (optional, privacy-safe)"
            placeholderTextColor={COLORS.gray}
            value={campusTag}
            onChangeText={setCampusTag}
          />
          <TextInput
            style={styles.input}
            placeholder="City tag (optional, privacy-safe)"
            placeholderTextColor={COLORS.gray}
            value={cityTag}
            onChangeText={setCityTag}
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
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => setTemporaryEnabled((current) => !current)}
            >
              <Ionicons
                name="time-outline"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.quickText}>
                {temporaryEnabled ? "24h expiry on" : "Make temporary"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.sectionLabel}>Live preview</Text>
          <View style={styles.previewShell}>
            <View style={styles.previewHeader}>
              <View style={styles.previewAvatar}>
                <Ionicons
                  name="shield-half-outline"
                  size={16}
                  color={COLORS.primary}
                />
              </View>
              <View>
                <Text style={styles.previewTitle}>Anonymous draft</Text>
                <Text style={styles.previewMeta}>
                  {pollEnabled
                    ? "Interactive post"
                    : `${contentMode} | ${category}`}
                </Text>
              </View>
            </View>
            {trimmedMediaUrl ? (
              <Image source={{ uri: trimmedMediaUrl }} style={styles.previewImage} contentFit="cover" />
            ) : null}
            <Text style={styles.previewBody}>
              {trimmedBody ||
                (trimmedMediaUrl
                  ? "Image-only post ready."
                  : "Your anonymous post preview will appear here as you type.")}
            </Text>
            <View style={styles.previewBadgeRow}>
              {!!campusTag.trim() && (
                <View style={styles.previewMetaPill}>
                  <Text style={styles.previewMetaPillText}>
                    Campus: {campusTag.trim()}
                  </Text>
                </View>
              )}
              {!!cityTag.trim() && (
                <View style={styles.previewMetaPill}>
                  <Text style={styles.previewMetaPillText}>
                    City: {cityTag.trim()}
                  </Text>
                </View>
              )}
              {temporaryEnabled && (
                <View style={styles.previewMetaPill}>
                  <Text style={styles.previewMetaPillText}>24h temporary</Text>
                </View>
              )}
            </View>
            {!!normalizedOptions.length && (
              <View style={styles.previewPollList}>
                {normalizedOptions.map((option, index) => (
                  <View
                    key={`${option}-${index}`}
                    style={styles.previewPollRow}
                  >
                    <Text style={styles.previewPollIndex}>{index + 1}</Text>
                    <Text style={styles.previewPollText}>{option}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.checklistCard}>
          <Text style={styles.sectionLabel}>Quality checklist</Text>
          {QUALITY_CHECKS.map((item, index) => {
            const complete = index < completedChecks;
            return (
              <View key={item} style={styles.checkRow}>
                <Ionicons
                  name={
                    complete ? "checkmark-circle-outline" : "ellipse-outline"
                  }
                  size={18}
                  color={complete ? COLORS.primary : COLORS.gray}
                />
                <Text style={styles.checkText}>{item}</Text>
              </View>
            );
          })}
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
            <ActivityIndicator color={COLORS.background} style={{ marginRight: 8 }} />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={COLORS.background}
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
  toolsCard: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  toolButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingVertical: 14,
  },
  toolButtonText: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
  },
  templateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  templateChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  templateChipText: {
    color: COLORS.text,
    ...TYPOGRAPHY.meta,
  },
  modeCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  modeRow: {
    gap: 10,
  },
  modeChip: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: 14,
    marginBottom: 10,
  },
  modeChipActive: {
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  modeChipTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    marginBottom: 4,
  },
  modeChipTitleActive: {
    color: COLORS.text,
  },
  modeChipHelper: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  strategyCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 18,
  },
  strategyCopy: { flex: 1 },
  strategyTitle: { color: COLORS.text, ...TYPOGRAPHY.label, marginBottom: 4 },
  strategyText: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  scorePill: {
    minWidth: 74,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  scorePillLabel: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  scorePillValue: { color: COLORS.text, ...TYPOGRAPHY.section },
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
  categoryRow: {
    gap: 8,
    paddingBottom: 12,
  },
  categoryChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  categoryChipActive: {
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  categoryChipText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    textTransform: "capitalize",
  },
  categoryChipTextActive: {
    color: COLORS.text,
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
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  messageInput: { minHeight: 140, textAlignVertical: "top" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: -4,
    marginBottom: 12,
  },
  metaText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    flex: 1,
  },
  mediaCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 14,
    marginBottom: 12,
  },
  mediaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  mediaTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
  },
  mediaHelper: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    marginBottom: 12,
  },
  mediaLink: {
    color: COLORS.text,
    ...TYPOGRAPHY.meta,
  },
  mediaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 12,
    marginBottom: 12,
  },
  mediaButtonText: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
  },
  mediaPreview: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  quickText: { color: COLORS.gray, ...TYPOGRAPHY.label },
  sectionLabel: {
    color: COLORS.text,
    ...TYPOGRAPHY.section,
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 24,
  },
  previewShell: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  previewAvatar: {
    width: Math.min(Dimensions.get("window").width * 0.09, 36),
    height: Math.min(Dimensions.get("window").width * 0.09, 36),
    borderRadius: Math.min(Dimensions.get("window").width * 0.045, 18),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  previewTitle: { color: COLORS.text, ...TYPOGRAPHY.label },
  previewMeta: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  previewBody: { color: COLORS.text, ...TYPOGRAPHY.body },
  previewPollList: { gap: 8 },
  previewBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  previewMetaPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewMetaPillText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  previewPollRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewPollIndex: { color: COLORS.secondary, ...TYPOGRAPHY.label },
  previewPollText: { color: COLORS.text, ...TYPOGRAPHY.label },
  checklistCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 24,
    gap: 10,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkText: { color: COLORS.text, ...TYPOGRAPHY.label },
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
    backgroundColor: "rgba(248,113,113,0.10)",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.18)",
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
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
  },
  postBtnDisabled: {
    opacity: 0.55,
  },
  postBtnText: { color: COLORS.background, ...TYPOGRAPHY.button },
});

export default CreatePostScreen;
