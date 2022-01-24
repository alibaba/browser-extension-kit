export default class PropertyStore {
  private store = new WeakMap<any, Map<string, any>>();

  get(target: any, key: string): any {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.store.get(target)?.get(key);
  }

  set(target: any, key: string, value: any) {
    if (!this.store.has(target)) {
      this.store.set(target, new Map<string, any>());
    }
    this.store.get(target)?.set(key, value);
  }
}
