import { Feed } from "@/types/feed";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IFeedRepository } from "./IFeedRepository";

const STORAGE_KEY = "@wifi_pet_feeder:feeds";

export class AsyncStorageFeedRepository implements IFeedRepository {
  async getFeeds(): Promise<Feed[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Erro ao ler feeds:", error);
      return [];
    }
  }

  async saveFeeds(feeds: Feed[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(feeds));
    } catch (error) {
      console.error("Erro ao salvar feeds:", error);
    }
  }
}
