import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import HeroHeading from "../components/HeroHeading";
import ScreenSurface from "../components/ScreenSurface";
import { useWallet } from "../contexts/WalletContext";
import { FeedPost, getFeed, voteOnPoll } from "../services/api";
import { buildActionRecord } from "../services/decentralized";
import { COLORS, TYPOGRAPHY } from "../theme";

const COLOR_STOPS = [COLORS.primary, COLORS.secondary, "#6B7280", "#52525B"];

const getPollInsight = (poll: FeedPost | null) => {
  if (!poll || !poll.pollOptions.length) {
    return {
      leadLabel: "No live poll",
      turnoutLabel: "0 votes",
      competitivenessLabel: "Waiting for responses",
    };
  }

  const rankedOptions = [...poll.pollOptions].sort(
    (left, right) => Number(right.votes || 0) - Number(left.votes || 0),
  );
  const leader = rankedOptions[0];
  const runnerUp = rankedOptions[1];
  const totalVotes = rankedOptions.reduce(
    (sum, option) => sum + Number(option.votes || 0),
    0,
  );
  const gap = runnerUp
    ? Math.abs(Number(leader.votes || 0) - Number(runnerUp.votes || 0))
    : Number(leader.votes || 0);

  return {
    leadLabel: `Leading: ${leader.label}`,
    turnoutLabel: `${totalVotes} total vote${totalVotes === 1 ? "" : "s"}`,
    competitivenessLabel:
      gap <= 1 ? "Tight race" : gap <= 3 ? "Competitive" : "Clear leader",
  };
};

const PollScreen = () => {
  const navigation = useNavigation<any>();
  const { token, isConnected } = useWallet();
  const [polls, setPolls] = useState<FeedPost[]>([]);
  const [selectedPollId, setSelectedPollId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedPoll = useMemo(
    () => polls.find((poll) => poll.id === selectedPollId) || polls[0] || null,
    [polls, selectedPollId],
  );

  const loadPolls = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await getFeed({ limit: 10, pollsOnly: true });
      setPolls(response.data);
      setSelectedPollId((current) => current ?? response.data[0]?.id ?? null);
      setStatusMessage(
        response.data.length
          ? null
          : "Create a poll from the Post tab to see it here.",
      );
    } catch (error) {
      console.error("Poll fetch failed", error);
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to load polls.",
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPolls();
  }, [loadPolls]);

  const totalVotes = useMemo(
    () =>
      selectedPoll?.pollOptions.reduce(
        (sum, option) => sum + Number(option.votes || 0),
        0,
      ) || 0,
    [selectedPoll],
  );
  const pollInsight = useMemo(
    () => getPollInsight(selectedPoll),
    [selectedPoll],
  );

  const handleVote = useCallback(
    async (optionId: number) => {
      if (!selectedPoll || !token) {
        setStatusMessage("Connect your wallet before voting in polls.");
        return;
      }

      try {
        await voteOnPoll(token, selectedPoll.id, optionId, buildActionRecord());
        await loadPolls();
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Unable to submit poll vote.",
        );
      }
    },
    [loadPolls, selectedPoll, token],
  );

  const heroStats = [
    {
      icon: "stats-chart-outline" as const,
      label: `${polls.length} live polls`,
      color: COLORS.gray,
    },
    {
      icon: "list-outline" as const,
      label: `${selectedPoll?.pollOptions.length || 0} options`,
      color: COLORS.secondary,
    },
    {
      icon: "time-outline" as const,
      label: `${totalVotes} votes`,
      color: COLORS.primary,
    },
  ];

  const openPollComposer = useCallback(() => {
    navigation.navigate("Composer", { startWithPoll: true });
  }, [navigation]);

  return (
    <ScreenSurface style={styles.surface}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadPolls} />
        }
        showsVerticalScrollIndicator={false}
      >
        <HeroHeading
          title="Polls"
          subtitle={
            selectedPoll?.body ||
            "Vote in live polls or start a new one from the post flow."
          }
          ctaLabel="Refresh"
          ctaIcon="refresh"
          onPressCta={loadPolls}
          stats={heroStats}
        />

        <View style={styles.toolbarCard}>
          <View style={styles.toolbarCopy}>
            <Text style={styles.toolbarTitle}>Poll board</Text>
            <Text style={styles.toolbarText}>
              Browse live polls here, then jump straight into creating a new one.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.createPollBtn}
            onPress={openPollComposer}
          >
            <Ionicons name="add-circle-outline" size={18} color={COLORS.text} />
            <Text style={styles.createPollBtnText}>Create poll</Text>
          </TouchableOpacity>
        </View>

        {statusMessage && (
          <View style={styles.statusBanner}>
            <Ionicons
              name="cloud-offline-outline"
              size={18}
              color={COLORS.secondary}
            />
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        )}

        <View style={styles.insightCard}>
          <View style={styles.insightColumn}>
            <Text style={styles.insightLabel}>Lead</Text>
            <Text style={styles.insightValue}>{pollInsight.leadLabel}</Text>
          </View>
          <View style={styles.insightColumn}>
            <Text style={styles.insightLabel}>Turnout</Text>
            <Text style={styles.insightValue}>{pollInsight.turnoutLabel}</Text>
          </View>
          <View style={styles.insightColumn}>
            <Text style={styles.insightLabel}>Race</Text>
            <Text style={styles.insightValue}>
              {pollInsight.competitivenessLabel}
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pollSelector}
        >
          {polls.map((poll) => {
            const active = poll.id === selectedPoll?.id;
            return (
              <TouchableOpacity
                key={poll.id}
                style={[styles.pollChip, active && styles.pollChipActive]}
                onPress={() => setSelectedPollId(poll.id)}
              >
                <Text
                  style={[
                    styles.pollChipText,
                    active && styles.pollChipTextActive,
                  ]}
                  numberOfLines={2}
                >
                  {poll.body}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedPoll ? (
          <>
            <View style={styles.card}>
              <Text style={styles.voteHint}>
                Vote anonymously to reveal where the room is leaning.
              </Text>
              {selectedPoll.pollOptions.map((option, index) => {
                const count = Number(option.votes || 0);
                const percent = totalVotes
                  ? Math.round((count / totalVotes) * 100)
                  : 0;
                const color = COLOR_STOPS[index % COLOR_STOPS.length];
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.optionRow, { borderColor: color }]}
                    onPress={() => handleVote(option.id)}
                    disabled={!isConnected}
                  >
                    <View style={styles.optionLabel}>
                      <Ionicons
                        name="checkbox-outline"
                        size={20}
                        color={color}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.optionText}>{option.label}</Text>
                    </View>
                    <Text style={[styles.optionText, { color }]}>
                      {percent}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.resultsCard}>
              {selectedPoll.pollOptions.map((option, index) => {
                const count = Number(option.votes || 0);
                const percent = totalVotes
                  ? Math.round((count / totalVotes) * 100)
                  : 0;
                const color = COLOR_STOPS[index % COLOR_STOPS.length];
                return (
                  <View key={option.id} style={styles.resultRow}>
                    <View style={styles.resultLabel}>
                      <Text style={styles.resultText}>{option.label}</Text>
                      <Text style={[styles.resultText, { color }]}>
                        {count} vote{count === 1 ? "" : "s"}
                      </Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${percent}%`, backgroundColor: color },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="stats-chart-outline"
              size={28}
              color={COLORS.gray}
            />
            <Text style={styles.emptyTitle}>No polls yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a post with poll options to start voting.
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={openPollComposer}
            >
              <Ionicons name="add-outline" size={18} color={COLORS.text} />
              <Text style={styles.emptyActionText}>Create your first poll</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenSurface>
  );
};

const styles = StyleSheet.create({
  surface: { flex: 1, padding: 16 },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    borderRadius: 18,
    gap: 8,
    marginBottom: 16,
  },
  statusText: { color: COLORS.text, flex: 1, ...TYPOGRAPHY.label },
  toolbarCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  toolbarCopy: { gap: 4 },
  toolbarTitle: { color: COLORS.text, ...TYPOGRAPHY.section },
  toolbarText: { color: COLORS.gray, ...TYPOGRAPHY.label },
  createPollBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: `${COLORS.primary}1F`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}35`,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  createPollBtnText: { color: COLORS.text, ...TYPOGRAPHY.label },
  insightCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    gap: 12,
  },
  insightColumn: { flex: 1, gap: 4 },
  insightLabel: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  insightValue: { color: COLORS.text, ...TYPOGRAPHY.label },
  pollSelector: { gap: 10, paddingBottom: 14 },
  pollChip: {
    width: 210,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  pollChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
  },
  pollChipText: { color: COLORS.gray, ...TYPOGRAPHY.label },
  pollChipTextActive: { color: COLORS.text },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 24,
    gap: 12,
  },
  voteHint: { color: COLORS.gray, ...TYPOGRAPHY.meta, marginBottom: 2 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    opacity: 1,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  optionLabel: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  optionText: { color: COLORS.text, ...TYPOGRAPHY.section, fontSize: 16 },
  resultsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    gap: 16,
  },
  resultRow: { gap: 8 },
  resultLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultText: { color: COLORS.text, ...TYPOGRAPHY.label, fontSize: 14 },
  progressTrack: {
    height: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 10 },
  emptyState: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyTitle: { color: COLORS.text, ...TYPOGRAPHY.title },
  emptySubtitle: { color: COLORS.gray, ...TYPOGRAPHY.label },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    backgroundColor: `${COLORS.primary}20`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}35`,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  emptyActionText: { color: COLORS.text, ...TYPOGRAPHY.label },
});

export default PollScreen;
