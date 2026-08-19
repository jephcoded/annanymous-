import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";

import ScreenSurface from "../components/ScreenSurface";
import { useWallet } from "../contexts/WalletContext";
import { createPost, uploadImage } from "../services/api";
import { buildContentRecord } from "../services/decentralized";
import { COLORS, TYPOGRAPHY } from "../theme";
import { getFriendlyErrorMessage } from "../utils/errorMessages";

const BODY_LIMIT = 500;
type Category =
  | "general"
  | "relationships"
  | "confession"
  | "school"
  | "tech"
  | "city";
const COMPOSER_CATEGORIES = [
  { id: "general", label: "General" },
  { id: "relationships", label: "Relationships" },
  { id: "confession", label: "Rant" },
  { id: "school", label: "School" },
  { id: "tech", label: "Music" },
  { id: "city", label: "More" },
] as const;

const CreatePostScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token } = useWallet();
  const { width } = useWindowDimensions();
  const [body, setBody] = useState("");
  const [shareLocation, setShareLocation] = useState(false);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [category, setCategory] = useState<Category>("general");
  const [temporaryEnabled, setTemporaryEnabled] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedImageDataUrl, setSelectedImageDataUrl] = useState<
    string | null
  >(null);
  const [selectedImageMimeType, setSelectedImageMimeType] = useState<
    string | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const normalizedOptions = useMemo(
    () => pollOptions.map((option: string) => option.trim()).filter(Boolean),
    [pollOptions],
  );
  const trimmedBody = body.trim();
  const characterCount = body.length;
  const isCompact = width < 380;

  useEffect(() => {
    if (!route.params?.startWithPoll) {
      return;
    }

    setPollEnabled(true);
    navigation.setParams({ startWithPoll: undefined });
  }, [navigation, route.params?.startWithPoll]);

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
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.45,
        base64: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      if (!asset?.base64 || !asset.uri) {
        setStatusMessage("Unable to load this image. Try a different one.");
        return;
      }

      const mimeType = asset.mimeType || "image/jpeg";
      setSelectedImageUri(asset.uri);
      setSelectedImageDataUrl(`data:${mimeType};base64,${asset.base64}`);
      setSelectedImageMimeType(mimeType);
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(
        getFriendlyErrorMessage(error, "Unable to open your image library."),
      );
    }
  };

  const clearImage = () => {
    setSelectedImageUri(null);
    setSelectedImageDataUrl(null);
    setSelectedImageMimeType(null);
  };

  const submitPost = async () => {
    if (!token) {
      setStatusMessage("Your session expired. Log in again to continue.");
      return;
    }

    if (!trimmedBody && !selectedImageUri) {
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      let uploadedMediaUrl: string | null = null;
      if (selectedImageUri) {
        setStatusMessage("Uploading image...");
        const uploadResponse = await uploadImage(token, {
          uri: selectedImageUri,
          type: selectedImageMimeType || "image/jpeg",
          name: `post.${(selectedImageMimeType || "image/jpeg").split("/")[1] || "jpg"}`,
        });
        uploadedMediaUrl = uploadResponse.data.url;
        setStatusMessage(null);
      }

      await createPost(token, {
        body: trimmedBody,
        mediaUrl: uploadedMediaUrl,
        pollOptions: pollEnabled ? normalizedOptions : [],
        category,
        contentMode: temporaryEnabled
          ? "story"
          : pollEnabled
            ? "qna"
            : "standard",
        expiresAt: temporaryEnabled
          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          : null,
        campusTag: null,
        cityTag: null,
        decentralized: buildContentRecord(trimmedBody || "image-post"),
      });

      setBody("");
      clearImage();
      setShareLocation(false);
      setPollEnabled(false);
      setPollOptions(["", ""]);
      setCategory("general");
      setTemporaryEnabled(false);
      setStatusMessage("Post published to the anonymous feed.");
      navigation.navigate("Home");
    } catch (error) {
      setStatusMessage(
        getFriendlyErrorMessage(error, "Unable to publish post."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    (trimmedBody.length > 0 || Boolean(selectedImageDataUrl)) &&
    trimmedBody.length <= BODY_LIMIT &&
    (!pollEnabled || normalizedOptions.length >= 2);

  return (
    <ScreenSurface>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          isCompact && styles.containerCompact,
        ]}
      >
        <View style={[styles.topBar, isCompact && styles.topBarCompact]}>
          <TouchableOpacity
            style={styles.topBarIcon}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={18} color={COLORS.text} />
          </TouchableOpacity>
          <Text
            style={[styles.topBarTitle, isCompact && styles.topBarTitleCompact]}
          >
            Post
          </Text>
          <TouchableOpacity
            style={[
              styles.postTopButton,
              (!canSubmit || isSubmitting) && styles.postTopButtonDisabled,
            ]}
            onPress={submitPost}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.postTopButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <View
          style={[styles.composerCard, isCompact && styles.composerCardCompact]}
        >
          <Text style={styles.composerPrompt}>What&apos;s on your mind?</Text>
          <TextInput
            style={styles.storyInput}
            placeholder="Share anonymously..."
            placeholderTextColor={COLORS.gray}
            multiline
            value={body}
            onChangeText={setBody}
            maxLength={BODY_LIMIT}
            textAlignVertical="top"
          />
          <Text style={styles.counterText}>
            {characterCount}/{BODY_LIMIT}
          </Text>

          {selectedImageUri ? (
            <View style={styles.imagePreviewCard}>
              <Image
                source={{ uri: selectedImageUri }}
                style={styles.imagePreview}
                contentFit="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={clearImage}
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.text} />
                <Text style={styles.removeImageText}>Remove image</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View
            style={[
              styles.categoryGrid,
              isCompact && styles.categoryGridCompact,
            ]}
          >
            {COMPOSER_CATEGORIES.map((item) => {
              const active = category === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.categoryPill,
                    isCompact && styles.categoryPillCompact,
                    active && styles.categoryPillActive,
                  ]}
                  onPress={() => setCategory(item.id)}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      isCompact && styles.categoryPillTextCompact,
                      active && styles.categoryPillTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View
            style={[
              styles.composerActionsRow,
              isCompact && styles.composerActionsRowCompact,
            ]}
          >
            <TouchableOpacity
              style={[
                styles.quickSquareAction,
                isCompact && styles.quickSquareActionCompact,
              ]}
              activeOpacity={0.88}
              onPress={() => void pickImage()}
            >
              <Ionicons name="image-outline" size={18} color={COLORS.accent} />
              <Text style={styles.quickSquareText}>
                {selectedImageUri ? "Change image" : "Add image"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickSquareAction,
                isCompact && styles.quickSquareActionCompact,
              ]}
              onPress={() => setPollEnabled((current) => !current)}
            >
              <Ionicons
                name="stats-chart-outline"
                size={18}
                color={COLORS.accent}
              />
              <Text style={styles.quickSquareText}>
                {pollEnabled ? "Poll on" : "Add poll"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickSquareAction,
                isCompact && styles.quickSquareActionCompact,
              ]}
              onPress={() => setTemporaryEnabled((current) => !current)}
            >
              <Ionicons name="time-outline" size={18} color={COLORS.accent} />
              <Text style={styles.quickSquareText}>
                {temporaryEnabled ? "24h on" : "24h post"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {statusMessage ? (
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
        ) : null}

        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>Share my location</Text>
              <Text style={styles.settingSubtitle}>(Approximately)</Text>
            </View>
            <Switch
              value={shareLocation}
              onValueChange={setShareLocation}
              trackColor={{ false: "#2A2233", true: "#8B3DFF88" }}
              thumbColor={shareLocation ? "#8B3DFF" : "#FBE4D8"}
            />
          </View>
          <View style={styles.settingRowLast}>
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>Post anonymously</Text>
              <Text style={styles.settingSubtitle}>
                Your identity is hidden
              </Text>
            </View>
            <View style={styles.lockBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#47D16C" />
            </View>
          </View>
        </View>

        {pollEnabled ? (
          <>
            <Text style={styles.sectionLabel}>Poll options</Text>
            <View style={styles.pollCard}>
              {pollOptions.map((option: string, index: number) => (
                <View key={index} style={styles.optionRow}>
                  <TextInput
                    style={[styles.input, styles.optionInput]}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor={COLORS.gray}
                    value={option}
                    onChangeText={(value: string) => updateOption(index, value)}
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
                <Text style={styles.addOptionText}>Add option</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenSurface>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, paddingBottom: 140 },
  containerCompact: { paddingHorizontal: 14, paddingBottom: 132 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  topBarCompact: {
    marginBottom: 12,
  },
  topBarIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    fontFamily: TYPOGRAPHY.section.fontFamily,
  },
  topBarTitleCompact: {
    fontSize: 15,
    lineHeight: 18,
  },
  postTopButton: {
    minWidth: 56,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8B3DFF",
  },
  postTopButtonDisabled: { opacity: 0.5 },
  postTopButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
    fontFamily: TYPOGRAPHY.label.fontFamily,
  },
  composerCard: {
    backgroundColor: "#09090C",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 14,
    marginBottom: 14,
  },
  composerCardCompact: {
    padding: 12,
  },
  composerPrompt: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    marginBottom: 10,
  },
  storyInput: {
    minHeight: 120,
    maxHeight: 220,
    borderRadius: 12,
    paddingHorizontal: 0,
    paddingVertical: 0,
    color: COLORS.text,
    backgroundColor: "transparent",
    borderWidth: 0,
    ...TYPOGRAPHY.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  counterText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    textAlign: "right",
    marginBottom: 12,
  },
  imagePreviewCard: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#101015",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 12,
  },
  imagePreview: {
    width: "100%",
    height: 220,
  },
  removeImageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  removeImageText: {
    color: COLORS.text,
    ...TYPOGRAPHY.meta,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  categoryGridCompact: {
    gap: 6,
    marginBottom: 10,
  },
  categoryPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#101015",
  },
  categoryPillCompact: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  categoryPillActive: {
    backgroundColor: "#8B3DFF",
  },
  categoryPillText: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    fontFamily: TYPOGRAPHY.meta.fontFamily,
  },
  categoryPillTextCompact: {
    fontSize: 10,
    lineHeight: 12,
  },
  categoryPillTextActive: {
    color: "#FFFFFF",
  },
  composerActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  composerActionsRowCompact: {
    gap: 8,
  },
  quickSquareAction: {
    flex: 1,
    minHeight: 68,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: "#101015",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  quickSquareActionCompact: {
    minHeight: 62,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  quickSquareText: {
    color: COLORS.text,
    ...TYPOGRAPHY.meta,
    textAlign: "center",
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#09090C",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 12,
    marginBottom: 14,
  },
  statusText: { color: COLORS.text, flex: 1, ...TYPOGRAPHY.label },
  settingsCard: {
    backgroundColor: "#09090C",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  settingRowLast: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 58,
  },
  settingCopy: { flex: 1 },
  settingTitle: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "600",
    fontFamily: TYPOGRAPHY.label.fontFamily,
    marginBottom: 2,
  },
  settingSubtitle: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  lockBadge: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    marginBottom: 10,
  },
  pollCard: {
    backgroundColor: "#09090C",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 14,
    marginBottom: 18,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    backgroundColor: "#101015",
    color: COLORS.text,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 10,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  optionInput: { flex: 1 },
  removeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248,113,113,0.10)",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.18)",
  },
  addOptionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  addOptionText: { color: COLORS.primary, ...TYPOGRAPHY.label },
});

export default CreatePostScreen;
