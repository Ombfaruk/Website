type WorkEntry = {
  data: {
    draft?: boolean;
    order: number;
    title: string;
  };
};

export function publishedWork<T extends WorkEntry>(entries: T[]) {
  return entries
    .filter((entry) => !entry.data.draft)
    .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}
