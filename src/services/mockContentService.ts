import { storePreviews, stories } from "../data/mock/content";
import type { ContentService } from "../domain/content";

export const mockContentService: ContentService = {
  async findStores(term = "") {
    const search = term.trim().toLocaleLowerCase();
    return search
      ? storePreviews.filter((store) =>
          `${store.name} ${store.area} ${store.address}`
            .toLocaleLowerCase()
            .includes(search),
        )
      : storePreviews;
  },
  async getStore(slug) {
    return storePreviews.find((store) => store.slug === slug) ?? null;
  },
  async listStories(type) {
    return type ? stories.filter((story) => story.type === type) : stories;
  },
  async getStory(slug) {
    return stories.find((story) => story.slug === slug) ?? null;
  },
};
