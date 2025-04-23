type ArrayNumber = number[];

/**
 * Quick Sort ⚡ → Selects a pivot, partitions elements around it, and sorts recursively.
 */
function quickSort(data: ArrayNumber): ArrayNumber {
  if (data.length <= 1) {
    return data;
  }

  const pivot = data[data.length - 1];
  const left = [];
  const right = [];
  const middle = [];

  for (let i = 0; i < data.length; i++) {
    if (data[i] < pivot) {
      left.push(data[i]);
    }
    if (data[i] === pivot) {
      middle.push(data[i]);
    }

    if (data[i] > pivot) {
      right.push(data[i]);
    }
  }

  return [...quickSort(left), ...middle, ...quickSort(right)];
}

/**
 * Bubble Sort 🫧 → Repeatedly swaps adjacent elements if they are in the wrong order.
 */
function bubbleSort(data: ArrayNumber): ArrayNumber {
  for (let i = 0; i < data.length; i++) {
    for (let j = 1; j < data.length; j++) {
      const first = data[j - 1];
      const second = data[j];
      if (second < first) {
        data[j] = first;
        data[j - 1] = second;
      }
    }
  }
  return data;
}

/**
 * Selection Sort 🎯 → Selects the smallest element and places it in the correct position.
 */
function selectionSort(data: ArrayNumber): ArrayNumber {
  for (let i = 0; i < data.length; i++) {
    let index = i; // 1
    let swap = false;
    for (let j = i + 1; j < data.length; j++) {
      if (data[j] < data[index]) {
        index = j;
        swap = true;
      }
    }

    if (swap) {
      const save = data[i];
      data[i] = data[index];
      data[index] = save;
    }
  }
  return data;
}

/**
 * Insertion Sort 📝 → Picks elements one by one and inserts them in the correct position.
 */
function insertionSort(data: ArrayNumber): ArrayNumber {
  for (let i = 1; i < data.length; i++) {
    if (data[i] < data[i - 1]) {
      let removedValue = data[i];
      let k = 0;
      let put = false;

      while (k <= i) {
        const currentValue = data[k];
        if (!put && removedValue <= currentValue) {
          data[k] = removedValue;
          removedValue = currentValue;
          put = true;
        } else if (put && k == i) {
          data[k] = removedValue;
        } else if (put) {
          data[k] = removedValue;
          removedValue = currentValue;
        }
        k++;
      }
    }
  }
  return data;
}

/**
 * Divides the array into halves, sorts each half, and then merges them.
 */
function mergeSort(data: ArrayNumber): ArrayNumber {
  if (data.length <= 2) {
    if (data.length === 1) {
      return data;
    } else {
      if (data[0] > data[1]) {
        const t = data[0];
        data[0] = data[1];
        data[1] = t;
        return data;
      }
      return data;
    }
  }
  const half = data.length / 2;
  const firstHalf = mergeSort(data.slice(0, half));
  const secondHalf = mergeSort(data.slice(half));
  return merge(firstHalf, secondHalf);
}

function merge(first: ArrayNumber, second: ArrayNumber) {
  let i = 0,
    j = 0;
  const res = [];
  while (i < first.length && j < second.length) {
    if (first[i] < second[i]) {
      res.push(first[i]);
      i++;
    } else {
      res.push(second[j]);
      j++;
    }
  }

  return res.concat(first.slice(i)).concat(second.slice(j));
}

// deno-lint-ignore no-unused-vars
function swap(arr: ArrayNumber, index1: number, index2: number) {
  const index1Value = arr[index1];
  const index2Value = arr[index2];
  arr[index1] = index2Value;
  arr[index2] = index1Value;
}

export { quickSort, mergeSort, bubbleSort, insertionSort, selectionSort };
