import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS, TYPOGRAPHY } from "../theme";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message: string | null;
  stack: string | null;
  componentStack: string | null;
};

class AppErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    message: null,
    stack: null,
    componentStack: null,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      message: error?.message || String(error),
      stack: error?.stack || null,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App render crashed", error, info.componentStack);
    this.setState({ componentStack: info.componentStack || null });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      message: null,
      stack: null,
      componentStack: null,
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>App hit a startup issue</Text>
          <Text style={styles.subtitle}>
            The interface failed while loading. Retry first. If it happens
            again, rebuild and retest on the latest APK.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Retry launch</Text>
          </TouchableOpacity>
          {this.state.message ? (
            <ScrollView style={styles.detailsBox}>
              <Text style={styles.detailsLabel}>Error</Text>
              <Text selectable style={styles.detailsText}>
                {this.state.message}
              </Text>
              {this.state.componentStack ? (
                <>
                  <Text style={styles.detailsLabel}>Component stack</Text>
                  <Text selectable style={styles.detailsText}>
                    {this.state.componentStack}
                  </Text>
                </>
              ) : null}
              {this.state.stack ? (
                <>
                  <Text style={styles.detailsLabel}>JS stack</Text>
                  <Text selectable style={styles.detailsText}>
                    {this.state.stack}
                  </Text>
                </>
              ) : null}
            </ScrollView>
          ) : null}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 24,
  },
  title: {
    color: COLORS.text,
    ...TYPOGRAPHY.title,
    marginBottom: 10,
  },
  subtitle: {
    color: COLORS.gray,
    ...TYPOGRAPHY.label,
    marginBottom: 18,
  },
  button: {
    alignSelf: "flex-start",
    borderRadius: 14,
    backgroundColor: `${COLORS.primary}20`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}35`,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonText: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
  },
  detailsBox: {
    marginTop: 18,
    maxHeight: 260,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#050505",
    padding: 12,
  },
  detailsLabel: {
    color: COLORS.primary,
    ...TYPOGRAPHY.meta,
    marginBottom: 4,
    marginTop: 8,
  },
  detailsText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
});

export default AppErrorBoundary;
