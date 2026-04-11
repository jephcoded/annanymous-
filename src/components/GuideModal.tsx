import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { COLORS, TYPOGRAPHY } from "../theme";

type GuideModalProps = {
  guideKey: string;
  title: string;
  items: string[];
};

const GuideModal = ({ guideKey, title, items }: GuideModalProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;

    const check = async () => {
      const value = await AsyncStorage.getItem(`guide.${guideKey}`);
      if (!value && active) {
        setVisible(true);
      }
    };

    check();

    return () => {
      active = false;
    };
  }, [guideKey]);

  const closeGuide = async () => {
    await AsyncStorage.setItem(`guide.${guideKey}`, "seen");
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)}>
        <Ionicons
          name="help-circle-outline"
          size={16}
          color={COLORS.text}
        />
        <Text style={styles.triggerText}>Guide</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={closeGuide}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.list}>
              {items.map((item) => (
                <View key={item} style={styles.row}>
                  <View style={styles.dot} />
                  <Text style={styles.text}>{item}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.button} onPress={closeGuide}>
              <Text style={styles.buttonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  triggerText: {
    color: COLORS.text,
    ...TYPOGRAPHY.meta,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
  },
  title: {
    color: COLORS.text,
    ...TYPOGRAPHY.title,
    marginBottom: 14,
  },
  list: {
    gap: 12,
    marginBottom: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 7,
  },
  text: {
    flex: 1,
    color: COLORS.gray,
    ...TYPOGRAPHY.label,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
  },
  buttonText: {
    color: COLORS.background,
    ...TYPOGRAPHY.button,
  },
});

export default GuideModal;
