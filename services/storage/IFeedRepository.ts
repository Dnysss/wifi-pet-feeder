import { Feed } from "@/types/feed";

export interface IFeedRepository {
  getFeeds(): Promise<Feed[]>;
  saveFeeds(feeds: Feed[]): Promise<void>;
}
