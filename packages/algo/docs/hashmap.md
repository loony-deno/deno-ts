In JavaScript, different types of HashMaps (or hash tables) can be implemented based on how they handle collisions, storage, and retrieval. Below are some common types:

---

### 1. **Separate Chaining (Using Linked List or Array)**

- Each index in the hash table stores a list (array or linked list) of key-value pairs.
- If multiple keys hash to the same index, they are stored in a list.

#### Example:

```javascript
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
```

✅ **Pros:** Simple to implement, dynamically handles collisions.  
❌ **Cons:** Performance degrades if too many collisions occur, requiring traversal of long lists.

---

### 2. **Open Addressing (Linear Probing)**

- If a collision occurs, the algorithm searches for the next empty slot in a linear manner.

#### Example:

```javascript
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

```

✅ **Pros:** Avoids linked lists, reducing memory overhead.  
❌ **Cons:** Performance worsens with high load factor (clustering).

---

### 3. **Open Addressing (Quadratic Probing)**

- Instead of searching linearly, it uses a quadratic function (e.g., `index + i²`) to find an empty slot.

#### Example:

```javascript
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
```

✅ **Pros:** Reduces clustering compared to linear probing.  
❌ **Cons:** Requires careful handling to prevent infinite loops.

---

### 4. **Double Hashing**

- Uses a second hash function to determine the step size for probing.

#### Example:

```javascript
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
```

✅ **Pros:** Avoids clustering, better distribution.  
❌ **Cons:** Slightly more complex due to dual hash functions.

---

### 5. **JavaScript’s Built-in `Map` (ES6)**

- JavaScript provides a built-in `Map` object optimized for performance.

#### Example:

```javascript
const myMap = new Map();
myMap.set("name", "Alice");
myMap.set("age", 25);
console.log(myMap.get("name")); // Alice
console.log(myMap.has("age")); // true
```

✅ **Pros:** Highly optimized, supports any data type as keys.  
❌ **Cons:** Internals are not customizable like custom implementations.

---

### **Which HashMap Type to Use?**

| HashMap Type          | Collision Handling          | Best For            |
| --------------------- | --------------------------- | ------------------- |
| **Separate Chaining** | Linked List (Chaining)      | General-purpose use |
| **Linear Probing**    | Open Addressing             | Small datasets      |
| **Quadratic Probing** | Open Addressing             | Reducing clustering |
| **Double Hashing**    | Open Addressing (Dual Hash) | Best distribution   |
| **ES6 Map**           | Built-in Optimization       | Production use      |

Would you like a specific optimization for a particular use case? 🚀
