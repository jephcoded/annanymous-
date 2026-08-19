import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import React, { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScreenSurface from "../../components/ScreenSurface";
import { useWallet } from "../../contexts/WalletContext";
import {
    CommunityMessage,
    getCommunityMessages,
    sendCommunityMessage,
} from "../../services/api";
import { COLORS, TYPOGRAPHY } from "../../theme";
import { getFriendlyErrorMessage } from "../../utils/errorMessages";

type CommunityChatRouteParams = {
  communityId?: number;
  communityName?: string;
};

const QUICK_REPLIES = [
  "Welcome in.",
  "Share the update.",
  "Who has context?",
  "Let's verify first.",
];

const CommunityChatScreen = () => {
  const route = useRoute();
  const { communityId, communityName } =
    (route.params as CommunityChatRouteParams) || {};
  const { token } = useWallet();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList<CommunityMessage>>(null);

  const fetchMessages = useCallback(async () => {
    if (!token || !communityId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const response = await getCommunityMessages(token, communityId);
      setMessages(response.data);
      setError(null);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Failed to load messages."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [communityId, token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchMessages();
    }, [fetchMessages]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMessages();
  }, [fetchMessages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !token || !communityId) {
      return;
    }

    setSending(true);
    try {
      const response = await sendCommunityMessage(token, {
        communityId,
        message: input.trim(),
      });
      setMessages((current) => [...current, response.data]);
      setInput("");
      setError(null);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 120);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Failed to send message."));
    } finally {
      setSending(false);
    }
  }, [communityId, input, token]);

  const composerSpacing = tabBarHeight + 8;

  return (
    <ScreenSurface style={styles.surface}>
      <View style={styles.chatLayout}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          style={styles.messageList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View>
              <View style={styles.headerCard}>
                <View style={styles.headerTopRow}>
                  <View style={styles.headerCopy}>
                    <Text style={styles.headerEyebrow}>Community</Text>
                    <Text style={styles.headerTitle}>
                      {communityName || "Community Chat"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.headerIconBtn}
                    onPress={fetchMessages}
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={18}
                      color={COLORS.accent}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.headerMetaRow}>
                  <View style={styles.metaChip}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={13}
                      color={COLORS.primary}
                    />
                    <Text style={styles.metaChipText}>
                      {messages.length} messages
                    </Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={13}
                      color={COLORS.secondary}
                    />
                    <Text style={styles.metaChipText}>
                      {token ? "Member access" : "Session needed"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Room guide</Text>
                <Text style={styles.summaryText}>
                  Keep messages useful, anonymous, and easy to follow. This room
                  is text-only.
                </Text>
              </View>

              {error ? (
                <View style={styles.errorBanner}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color={COLORS.secondary}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Text style={styles.sectionTitle}>Conversation</Text>
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator
                size="large"
                color={COLORS.primary}
                style={styles.loading}
              />
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={28}
                  color={COLORS.primary}
                />
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptyText}>
                  Be the first person to set the tone in this room.
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={styles.messageCard}>
              <View style={styles.messageHeader}>
                <View style={styles.senderRow}>
                  <View style={styles.senderAvatar}>
                    <Ionicons
                      name="shield-half-outline"
                      size={14}
                      color={COLORS.primary}
                    />
                  </View>
                  <View>
                    <Text style={styles.senderText}>
                      {item.sender || "Anonymous"}
                    </Text>
                    <Text style={styles.timeText}>
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
                <View style={styles.messageTimePill}>
                  <Text style={styles.messageTimePillText}>Live</Text>
                </View>
              </View>
              <Text style={styles.messageBody}>{item.message}</Text>
            </View>
          )}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        <View
          style={[
            styles.composerCard,
            {
              marginBottom: composerSpacing,
              paddingBottom: Math.max(12, insets.bottom + 6),
            },
          ]}
        >
          <View style={styles.quickReplyRow}>
            {QUICK_REPLIES.map((reply) => (
              <TouchableOpacity
                key={reply}
                style={styles.quickReplyChip}
                onPress={() =>
                  setInput((current) =>
                    current ? `${current} ${reply}` : reply,
                  )
                }
              >
                <Text style={styles.quickReplyText}>{reply}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={token ? "Type a message..." : "Log in again to chat"}
              placeholderTextColor={COLORS.gray}
              value={input}
              onChangeText={setInput}
              editable={Boolean(token) && !sending}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!input.trim() || sending || !token) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!input.trim() || sending || !token}
            >
              {sending ? (
                <ActivityIndicator color={COLORS.text} size="small" />
              ) : (
                <Ionicons name="send" size={18} color={COLORS.text} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScreenSurface>
  );
};

const styles = StyleSheet.create({
  surface: { flex: 1, padding: 16 },
  chatLayout: { flex: 1 },
  messageList: { flex: 1 },
  content: { paddingBottom: 16 },
  headerCard: {
    backgroundColor: "#08080C",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 18,
    marginBottom: 14,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  headerCopy: { flex: 1 },
  headerEyebrow: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    marginBottom: 4,
  },
  headerTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.heading,
    fontSize: 28,
    lineHeight: 32,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  headerMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  metaChipText: {
    color: COLORS.text,
    ...TYPOGRAPHY.meta,
    fontSize: 11,
    lineHeight: 14,
  },
  summaryCard: {
    backgroundColor: "#0D0D11",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 14,
    marginBottom: 14,
  },
  summaryTitle: { color: COLORS.text, ...TYPOGRAPHY.section, marginBottom: 6 },
  summaryText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.label,
    fontSize: 12,
    lineHeight: 17,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  errorText: { color: COLORS.text, ...TYPOGRAPHY.label, flex: 1 },
  sectionTitle: { color: COLORS.text, ...TYPOGRAPHY.title, marginBottom: 12 },
  loading: { marginTop: 20 },
  emptyCard: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
  },
  emptyTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.section,
    marginTop: 10,
    marginBottom: 6,
  },
  emptyText: { color: COLORS.gray, ...TYPOGRAPHY.label, textAlign: "center" },
  messageCard: {
    backgroundColor: "#0F1014",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 14,
    marginBottom: 10,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  senderRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  senderAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${COLORS.primary}18`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  senderText: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    fontSize: 12,
    lineHeight: 16,
  },
  timeText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    fontSize: 10,
    lineHeight: 13,
  },
  messageTimePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageTimePillText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    fontSize: 10,
    lineHeight: 13,
  },
  messageBody: {
    color: COLORS.text,
    ...TYPOGRAPHY.body,
    fontSize: 13,
    lineHeight: 19,
  },
  composerCard: {
    backgroundColor: "rgba(11,11,15,0.98)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 12,
    marginTop: 12,
  },
  quickReplyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  quickReplyChip: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: `${COLORS.secondary}14`,
    borderWidth: 1,
    borderColor: `${COLORS.secondary}22`,
  },
  quickReplyText: {
    color: COLORS.secondary,
    ...TYPOGRAPHY.meta,
    fontSize: 10,
    lineHeight: 13,
  },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 112,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.03)",
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...TYPOGRAPHY.label,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  sendButtonDisabled: { opacity: 0.55 },
});

export default CommunityChatScreen;
