import { AsyncStorageFeedRepository } from "@/services/storage/AsyncStorageFeedRepository";
import { IFeedRepository } from "@/services/storage/IFeedRepository";
import { Feed } from "@/types/feed";
import { useCallback, useState } from "react";

const repository: IFeedRepository = new AsyncStorageFeedRepository();

export function useFeeds() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadFeeds = useCallback(async () => {
    const data = await repository.getFeeds();
    setFeeds(data);
    setIsLoaded(true);
  }, []);

  const addFeed = async (newFeedData: {
    time: string;
    daysText: string;
    feedTime: number;
  }) => {
    const newFeed: Feed = {
      id: Date.now(),
      time: newFeedData.time,
      days: newFeedData.daysText,
      portions: newFeedData.feedTime,
      enabled: true,
    };

    setFeeds((prev) => {
      if (prev.some((f) => f.id === newFeed.id)) return prev;
      const updated = [...prev, newFeed];
      repository.saveFeeds(updated);
      return updated;
    });
  };

  const toggleFeed = async (id: number) => {
    setFeeds((prev) => {
      const updated = prev.map((f) =>
        f.id === id ? { ...f, enabled: !f.enabled } : f,
      );
      repository.saveFeeds(updated);
      return updated;
    });
  };

  const deleteFeed = async (id: number) => {
    setFeeds((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      repository.saveFeeds(updated);
      return updated;
    });
  };

  return { feeds, isLoaded, loadFeeds, addFeed, toggleFeed, deleteFeed };
}
