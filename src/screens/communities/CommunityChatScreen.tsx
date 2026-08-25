import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
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
    CommunityMember,
    CommunityMessage,
    deleteCommunityMessage,
    getCommunityMembers,
    getCommunityMessages,
    getMe,
    sendCommunityMessage,
    updateCommunityMemberStatus,
} from "../../services/api";
import { COLORS, TYPOGRAPHY } from "../../theme";
import { getFriendlyErrorMessage } from "../../utils/errorMessages";

type CommunityChatRouteParams = {
  communityId?: number;
  communityName?: string;
  isAdmin?: boolean;
};

const AVATAR_PALETTE = [
  "#8B3DFF",
  "#FF6B9D",
  "#35C7E3",
  "#FFB03B",
  "#4ADE80",
  "#F87171",
];

const getAvatarColor = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 997;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};

const getInitial = (name?: string | null) =>
  (name?.trim()?.[0] || "?").toUpperCase();

const formatDayLabel = (isoDate: string) => {
  const date = new Date(isoDate);
  const today = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) {
    return "Today";
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const CommunityChatScreen = () => {
  const route = useRoute();
  const { communityId, communityName, isAdmin } =
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
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(
    null,
  );
  const [membersVisible, setMembersVisible] = useState(false);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberActionId, setMemberActionId] = useState<number | null>(null);
  const flatListRef = useRef<FlatList<CommunityMessage>>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        return;
      }
      getMe(token)
        .then((response) => setCurrentUserId(response.data.profile.id))
        .catch(() => undefined);
    }, [token]),
  );

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

  const handleDeleteMessage = useCallback(
    async (messageId: number) => {
      if (!token || !communityId) {
        return;
      }

      setDeletingMessageId(messageId);
      try {
        await deleteCommunityMessage(token, communityId, messageId);
        setMessages((current) =>
          current.filter((message) => message.id !== messageId),
        );
      } catch (err) {
        setError(getFriendlyErrorMessage(err, "Failed to delete message."));
      } finally {
        setDeletingMessageId(null);
      }
    },
    [communityId, token],
  );

  const fetchMembers = useCallback(async () => {
    if (!token || !communityId) {
      return;
    }

    setMembersLoading(true);
    try {
      const response = await getCommunityMembers(token, communityId);
      setMembers(response.data);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Failed to load members."));
    } finally {
      setMembersLoading(false);
    }
  }, [communityId, token]);

  const openMembers = useCallback(() => {
    setMembersVisible(true);
    void fetchMembers();
  }, [fetchMembers]);

  const handleMemberAction = useCallback(
    async (memberUserId: number, status: "active" | "removed") => {
      if (!token || !communityId) {
        return;
      }

      setMemberActionId(memberUserId);
      try {
        await updateCommunityMemberStatus(
          token,
          communityId,
          memberUserId,
          status,
        );
        if (status === "removed") {
          setMembers((current) =>
            current.filter((member) => member.userId !== memberUserId),
          );
        } else {
          setMembers((current) =>
            current.map((member) =>
              member.userId === memberUserId
                ? { ...member, status }
                : member,
            ),
          );
        }
      } catch (err) {
        setError(getFriendlyErrorMessage(err, "Failed to update member."));
      } finally {
        setMemberActionId(null);
      }
    },
    [communityId, token],
  );

  const composerSpacing = tabBarHeight + 8;

  const dateDividerIds = useMemo(() => {
    const ids = new Set<number>();
    let lastLabel: string | null = null;
    messages.forEach((message) => {
      const label = formatDayLabel(message.createdAt);
      if (label !== lastLabel) {
        ids.add(message.id);
        lastLabel = label;
      }
    });
    return ids;
  }, [messages]);

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
              <View style={styles.headerTopRow}>
                <View style={styles.headerCopy}>
                  <Text style={styles.headerEyebrow}>Community</Text>
                  <Text style={styles.headerTitle}>
                    {communityName || "Community Chat"}
                  </Text>
                  <Text style={styles.headerMeta}>
                    {messages.length} message{messages.length === 1 ? "" : "s"}
                    {" · "}
                    {token ? "Text-only room" : "Session needed"}
                  </Text>
                </View>
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    style={styles.headerIconBtn}
                    onPress={openMembers}
                  >
                    <Ionicons
                      name="people-outline"
                      size={18}
                      color={COLORS.accent}
                    />
                  </TouchableOpacity>
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
              </View>

              <View style={styles.summaryBanner}>
                <Text style={styles.summaryText}>
                  {"👋"} Welcome to {communityName || "this room"}!
                  Keep messages useful, anonymous, and easy to follow.
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
          renderItem={({ item }) => {
            const senderName =
              item.userId != null && item.userId === currentUserId
                ? "You"
                : "Anonymous";
            const canDelete =
              Boolean(isAdmin) || item.userId === currentUserId;
            return (
              <>
                {dateDividerIds.has(item.id) ? (
                  <Text style={styles.dateDivider}>
                    {formatDayLabel(item.createdAt)}
                  </Text>
                ) : null}
                <View style={styles.messageRow}>
                  <View
                    style={[
                      styles.senderAvatar,
                      { backgroundColor: `${getAvatarColor(senderName)}2A` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.senderAvatarText,
                        { color: getAvatarColor(senderName) },
                      ]}
                    >
                      {getInitial(senderName)}
                    </Text>
                  </View>
                  <View style={styles.messageContent}>
                    <View style={styles.messageHeader}>
                      <Text style={styles.senderText}>{senderName}</Text>
                      <Text style={styles.timeText}>
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                      {canDelete ? (
                        <TouchableOpacity
                          style={styles.messageDeleteBtn}
                          onPress={() => void handleDeleteMessage(item.id)}
                          disabled={deletingMessageId === item.id}
                        >
                          {deletingMessageId === item.id ? (
                            <ActivityIndicator
                              size="small"
                              color={COLORS.gray}
                            />
                          ) : (
                            <Ionicons
                              name="trash-outline"
                              size={14}
                              color={COLORS.gray}
                            />
                          )}
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <View style={styles.messageBubble}>
                      <Text style={styles.messageBody}>{item.message}</Text>
                    </View>
                  </View>
                </View>
              </>
            );
          }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        <View
          style={[
            styles.inputRow,
            {
              marginBottom: composerSpacing,
              paddingBottom: Math.max(12, insets.bottom + 6),
            },
          ]}
        >
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

      <Modal
        visible={membersVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMembersVisible(false)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setMembersVisible(false)}
          />
          <View
            style={[
              styles.membersSheet,
              { paddingBottom: Math.max(18, insets.bottom + 10) },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Members</Text>
              <TouchableOpacity onPress={() => setMembersVisible(false)}>
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {membersLoading ? (
              <ActivityIndicator
                size="small"
                color={COLORS.primary}
                style={styles.loading}
              />
            ) : (
              <FlatList
                data={members}
                keyExtractor={(member) => member.id.toString()}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No members yet.</Text>
                }
                renderItem={({ item: member }) => (
                  <View style={styles.memberRow}>
                    <View style={styles.memberCopy}>
                      <Text style={styles.memberName}>
                        {member.displayName || "Anonymous"}
                        {member.isAdmin ? "  ·  Admin" : ""}
                      </Text>
                      <Text style={styles.memberStatus}>
                        {member.status === "pending"
                          ? "Waiting for approval"
                          : "Active"}
                      </Text>
                    </View>
                    {isAdmin && !member.isAdmin ? (
                      memberActionId === member.userId ? (
                        <ActivityIndicator
                          size="small"
                          color={COLORS.gray}
                        />
                      ) : (
                        <View style={styles.memberActions}>
                          {member.status === "pending" ? (
                            <TouchableOpacity
                              style={styles.memberApproveBtn}
                              onPress={() =>
                                void handleMemberAction(
                                  member.userId,
                                  "active",
                                )
                              }
                            >
                              <Ionicons
                                name="checkmark"
                                size={16}
                                color="#47D16C"
                              />
                            </TouchableOpacity>
                          ) : null}
                          <TouchableOpacity
                            style={styles.memberRemoveBtn}
                            onPress={() =>
                              void handleMemberAction(
                                member.userId,
                                "removed",
                              )
                            }
                          >
                            <Ionicons
                              name="close"
                              size={16}
                              color="#F87171"
                            />
                          </TouchableOpacity>
                        </View>
                      )
                    ) : null}
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </ScreenSurface>
  );
};

const styles = StyleSheet.create({
  surface: { flex: 1, padding: 16 },
  chatLayout: { flex: 1 },
  messageList: { flex: 1 },
  content: { paddingBottom: 16 },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },
  headerCopy: { flex: 1 },
  headerEyebrow: {
    color: COLORS.primary,
    ...TYPOGRAPHY.meta,
    marginBottom: 4,
  },
  headerTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.heading,
    fontSize: 26,
    lineHeight: 30,
    marginBottom: 4,
  },
  headerMeta: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  summaryBanner: {
    backgroundColor: "rgba(139,61,255,0.08)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
  },
  summaryText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.label,
    fontSize: 12,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  errorText: { color: COLORS.text, ...TYPOGRAPHY.label, flex: 1 },
  loading: { marginTop: 20 },
  emptyCard: {
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.section,
    marginTop: 10,
    marginBottom: 6,
  },
  emptyText: { color: COLORS.gray, ...TYPOGRAPHY.label, textAlign: "center" },
  dateDivider: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    textAlign: "center",
    marginVertical: 12,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 16,
  },
  messageContent: { flex: 1 },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  senderAvatarText: {
    ...TYPOGRAPHY.label,
    fontWeight: "700",
    fontSize: 13,
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
  messageBubble: {
    alignSelf: "flex-start",
    maxWidth: "88%",
    backgroundColor: "rgba(139,61,255,0.14)",
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageBody: {
    color: COLORS.text,
    ...TYPOGRAPHY.body,
    fontSize: 13,
    lineHeight: 19,
  },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 112,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.06)",
    color: COLORS.text,
    paddingHorizontal: 18,
    paddingVertical: 13,
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
  headerActions: { flexDirection: "row", gap: 8 },
  messageDeleteBtn: {
    marginLeft: "auto",
    padding: 4,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  membersSheet: {
    maxHeight: "70%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "#0B0A10",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.14)",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sheetTitle: { color: COLORS.text, ...TYPOGRAPHY.section },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  memberCopy: { flex: 1 },
  memberName: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    marginBottom: 2,
  },
  memberStatus: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  memberActions: {
    flexDirection: "row",
    gap: 8,
  },
  memberApproveBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(71,209,108,0.14)",
  },
  memberRemoveBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248,113,113,0.12)",
  },
});

export default CommunityChatScreen;
