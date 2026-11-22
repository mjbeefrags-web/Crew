export type StorePreview = {
  slug: string;
  name: string;
  area: string;
  address: string;
  hours: readonly string[];
  phone: string;
  previewOnly: true;
};

export type EditorialStory = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  image: string;
  type: 'lookbook' | 'drop';
};

export interface ContentService {
  findStores(term?: string): Promise<readonly StorePreview[]>;
  getStore(slug: string): Promise<StorePreview | null>;
  listStories(type?: EditorialStory['type']): Promise<readonly EditorialStory[]>;
  getStory(slug: string): Promise<EditorialStory | null>;
}
