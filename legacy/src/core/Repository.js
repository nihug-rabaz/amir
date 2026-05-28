export class LocalStorageDriver {
  read(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('Storage read error', key, e);
      return fallback;
    }
  }

  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { console.error('Storage write error', key, e); }
  }
}

export class Repository {
  constructor(name, driver = new LocalStorageDriver()) {
    this.key = `amir2:${name}`;
    this.driver = driver;
  }

  all() { return this.driver.read(this.key, []) || []; }

  saveAll(items) { this.driver.write(this.key, items); return items; }

  find(id) { return this.all().find((x) => x.id === id) || null; }

  upsert(item) {
    const items = this.all();
    const idx = items.findIndex((x) => x.id === item.id);
    if (idx >= 0) items[idx] = { ...items[idx], ...item };
    else items.push(item);
    this.saveAll(items);
    return item;
  }

  remove(id) {
    const items = this.all().filter((x) => x.id !== id);
    this.saveAll(items);
  }

  query(predicate) { return this.all().filter(predicate); }

  exists() { return localStorage.getItem(this.key) != null; }
}
