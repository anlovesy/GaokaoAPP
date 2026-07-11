export class BaseRepository {
  constructor(adapter) {
    this.adapter = adapter;
  }

  parseJson(value, fallback = null) {
    if (!value) {
      return fallback;
    }

    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
}
