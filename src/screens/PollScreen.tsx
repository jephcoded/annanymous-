import { Ionicons } from "@expo/vector-icons";
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

const COLOR_STOPS = [COLORS.primary, COLORS.secondary, "#4ADE80", "#F97316"];

const PollScreen = () => {
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

  const handleVote = useCallback(
    async (optionId: number) => {
      if (!selectedPoll || !token) {
        setStatusMessage("Connect your wallet before voting in polls.");
        return;
      }

      try {
        await voteOnPoll(
          token,
          selectedPoll.id,
          optionId,
          buildActionRecord(),
        );
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
      label: `${selectedPoll?.pollOptions.length || 0} options`,
      color: COLORS.secondary,
    },
    {
      icon: "time-outline" as const,
      label: `${totalVotes} votes`,
      color: COLORS.primary,
    },
  ];

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
          title="Pulse Polls"
          subtitle={
            selectedPoll?.body || "The latest community questions live here."
          }
          ctaLabel="Refresh"
          ctaIcon="refresh"
          onPressCta={loadPolls}
          stats={heroStats}
        />

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
});

export default PollScreen;
