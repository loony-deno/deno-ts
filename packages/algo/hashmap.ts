class HashMapChaining<K, V> {
  private buckets: [K, V][][];

  constructor(private size: number = 53) {
    this.buckets = new Array(size);
  }

  private _hash(key: string): number {
    let total = 0;
    const prime = 31;
    for (let i = 0; i < Math.min(key.length, 100); i++) {
      total = (total * prime + key.charCodeAt(i)) % this.size;
    }
    return total;
  }

  set(key: K, value: V): void {
    const index = this._hash(String(key));
    if (!this.buckets[index]) {
      this.buckets[index] = [];
    }
    this.buckets[index].push([key, value]);
  }

  get(key: K): V | undefined {
    const index = this._hash(String(key));
    if (this.buckets[index]) {
      for (const [k, v] of this.buckets[index]) {
        if (k === key) return v;
      }
    }
    return undefined;
  }
}

class HashMapLinearProbing<K, V> {
  private buckets: ([K, V] | undefined)[];

  constructor(private size: number = 53) {
    this.buckets = new Array(size);
  }

  private _hash(key: string): number {
    let hash = 0;
    const prime = 31;
    for (let i = 0; i < Math.min(key.length, 100); i++) {
      hash = (hash * prime + key.charCodeAt(i)) % this.size;
    }
    return hash;
  }

  set(key: K, value: V): void {
    let index = this._hash(String(key));
    while (this.buckets[index] !== undefined) {
      if (this.buckets[index]?.[0] === key) {
        this.buckets[index] = [key, value];
        return;
      }
      index = (index + 1) % this.size; // Linear probing
    }
    this.buckets[index] = [key, value];
  }

  get(key: K): V | undefined {
    let index = this._hash(String(key));
    while (this.buckets[index] !== undefined) {
      if (this.buckets[index]?.[0] === key) return this.buckets[index]?.[1];
      index = (index + 1) % this.size;
    }
    return undefined;
  }
}

class HashMapQuadraticProbing<K, V> {
  private buckets: ([K, V] | undefined)[];

  constructor(private size: number = 53) {
    this.buckets = new Array(size);
  }

  private _hash(key: string): number {
    let hash = 0;
    const prime = 31;
    for (let i = 0; i < Math.min(key.length, 100); i++) {
      hash = (hash * prime + key.charCodeAt(i)) % this.size;
    }
    return hash;
  }

  set(key: K, value: V): void {
    let index = this._hash(String(key));
    let i = 1;
    while (this.buckets[index] !== undefined) {
      index = (index + i * i) % this.size;
      i++;
    }
    this.buckets[index] = [key, value];
  }

  get(key: K): V | undefined {
    let index = this._hash(String(key));
    let i = 1;
    while (this.buckets[index] !== undefined) {
      if (this.buckets[index]?.[0] === key) return this.buckets[index]?.[1];
      index = (index + i * i) % this.size;
      i++;
    }
    return undefined;
  }
}

class HashMapDoubleHashing<K, V> {
  private buckets: ([K, V] | undefined)[];

  constructor(private size: number = 53) {
    this.buckets = new Array(size);
  }

  private _hash1(key: string): number {
    let hash = 0;
    const prime = 31;
    for (let i = 0; i < Math.min(key.length, 100); i++) {
      hash = (hash * prime + key.charCodeAt(i)) % this.size;
    }
    return hash;
  }

  private _hash2(key: string): number {
    return 1 + (key.length % (this.size - 1)); // Secondary step size
  }

  set(key: K, value: V): void {
    let index = this._hash1(String(key));
    let stepSize = this._hash2(String(key));

    while (this.buckets[index] !== undefined) {
      index = (index + stepSize) % this.size;
    }
    this.buckets[index] = [key, value];
  }

  get(key: K): V | undefined {
    let index = this._hash1(String(key));
    let stepSize = this._hash2(String(key));

    while (this.buckets[index] !== undefined) {
      if (this.buckets[index]?.[0] === key) return this.buckets[index]?.[1];
      index = (index + stepSize) % this.size;
    }
    return undefined;
  }
}
