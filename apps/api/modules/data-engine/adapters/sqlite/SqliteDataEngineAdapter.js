export class SqliteDataEngineAdapter {
  constructor(database) {
    this.database = database;
  }

  all(sql, ...params) {
    return this.database.prepare(sql).all(...params);
  }

  get(sql, ...params) {
    return this.database.prepare(sql).get(...params) || null;
  }

  run(sql, ...params) {
    return this.database.prepare(sql).run(...params);
  }

  transaction(callback) {
    this.database.exec("BEGIN");

    try {
      const result = callback();
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}
