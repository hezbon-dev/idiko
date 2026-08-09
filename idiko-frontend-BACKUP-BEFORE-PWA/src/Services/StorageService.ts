export const StorageService = {

  async set(key: string, value: any) {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  },

  async get(key: string) {
    const value =
      localStorage.getItem(key);

    return value
      ? JSON.parse(value)
      : null;
  },

  async remove(key: string) {
    localStorage.removeItem(key);
  }

};