import AsyncStorage from "@react-native-async-storage/async-storage";

const SAVED_POSTS_KEY = "ananymous.savedPosts";

export const loadSavedPostIds = async (): Promise<number[]> => {
  try {
    const raw = await AsyncStorage.getItem(SAVED_POSTS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => Number.isFinite(id)) : [];
  } catch {
    return [];
  }
};

export const persistSavedPostIds = async (ids: number[]) => {
  await AsyncStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(ids));
};
