import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import HeroHeading from "../../components/HeroHeading";
import ScreenSurface from "../../components/ScreenSurface";
import { useWallet } from "../../contexts/WalletContext";
import {
  CommunityMessage,
  getCommunityMessages,
  sendCommunityMessage,
} from "../../services/api";
import { COLORS, TYPOGRAPHY } from "../../theme";

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
  const { token, isConnected } = useWallet();
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
      setError(err instanceof Error ? err.message : "Failed to load messages.");
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
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }, [communityId, input, token]);

  const heroStats = useMemo(
    () => [
      {
        icon: "chatbubble-ellipses-outline" as const,
        label: `${messages.length} messages`,
        color: COLORS.primary,
      },
      {
        icon: "shield-checkmark-outline" as const,
        label: isConnected ? "Member access" : "Connect required",
        color: COLORS.secondary,
      },
      {
        icon: "flash-outline" as const,
        label: "Live room energy",
        color: COLORS.gray,
      },
    ],
    [isConnected, messages.length],
  );

  return (
    <KeyboardAvoidingView
      style={styles.keyboardShell}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenSurface style={styles.surface}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View>
              <HeroHeading
                title={communityName || "Community Chat"}
                subtitle="Private room chat for invited members. Pull to refresh for new messages."
                ctaLabel="Refresh"
                ctaIcon="refresh"
                onPressCta={fetchMessages}
                stats={heroStats}
              />

              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Room guide</Text>
                <Text style={styles.summaryText}>
                  Keep messages useful, anonymous, and easy to follow. Invite links keep this space tighter than the main feed.
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
          renderItem={({ item, index }) => (
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
                <View style={styles.messageIndex}>
                  <Text style={styles.messageIndexText}>#{index + 1}</Text>
                </View>
              </View>
              <Text style={styles.messageBody}>{item.message}</Text>
            </View>
          )}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        <View style={styles.composerCard}>
          <View style={styles.quickReplyRow}>
            {QUICK_REPLIES.map((reply) => (
              <TouchableOpacity
                key={reply}
                style={styles.quickReplyChip}
                onPress={() =>
                  setInput((current) => (current ? `${current} ${reply}` : reply))
                }
              >
                <Text style={styles.quickReplyText}>{reply}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={
                isConnected ? "Type a message..." : "Connect wallet to chat"
              }
              placeholderTextColor={COLORS.gray}
              value={input}
              onChangeText={setInput}
              editable={isConnected && !sending}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!input.trim() || sending || !isConnected) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!input.trim() || sending || !isConnected}
            >
              {sending ? (
                <ActivityIndicator color={COLORS.text} size="small" />
              ) : (
                <Ionicons name="send" size={18} color={COLORS.text} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScreenSurface>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardShell: { flex: 1 },
  surface: { flex: 1, padding: 16 },
  content: { paddingBottom: 200 },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: { color: COLORS.text, ...TYPOGRAPHY.section, marginBottom: 6 },
  summaryText: { color: COLORS.gray, ...TYPOGRAPHY.label },
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
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${COLORS.primary}18`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  senderText: { color: COLORS.text, ...TYPOGRAPHY.label },
  timeText: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  messageIndex: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageIndexText: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  messageBody: { color: COLORS.text, ...TYPOGRAPHY.body },
  composerCard: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: "rgba(16,17,26,0.98)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  quickReplyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  quickReplyChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: `${COLORS.secondary}14`,
    borderWidth: 1,
    borderColor: `${COLORS.secondary}22`,
  },
  quickReplyText: { color: COLORS.secondary, ...TYPOGRAPHY.meta },
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
