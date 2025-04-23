function tokenize(text: string): string[] {
  return text.toLowerCase().match(/\b\w+\b/g) || [];
}

type TFIDFVector = { [key: string]: number };

function termFrequency(term: string, tokens: string[]): number {
  const count = tokens.filter((token) => token === term).length;
  return count / tokens.length;
}

function inverseDocumentFrequency(term: string, documents: string[][]): number {
  const numDocsWithTerm = documents.filter((doc) => doc.includes(term)).length;
  return Math.log((1 + documents.length) / (1 + numDocsWithTerm)) + 1;
}

function computeTFIDF(doc: string, documents: string[]): TFIDFVector {
  const tokens = tokenize(doc);
  const uniqueTokens = [...new Set(tokens)];
  const tokenizedDocs = documents.map(tokenize);

  console.log({
    tokens,
    uniqueTokens,
    tokenizedDocs,
  });

  return uniqueTokens.reduce((tfidfVector: TFIDFVector, term) => {
    const tf = termFrequency(term, tokens);
    const idf = inverseDocumentFrequency(term, tokenizedDocs);
    tfidfVector[term] = tf * idf;
    return tfidfVector;
  }, {});
}

function cosineSimilarity(vecA: TFIDFVector, vecB: TFIDFVector): number {
  const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dotProduct = 0,
    magA = 0,
    magB = 0;

  allKeys.forEach((key) => {
    const valA = vecA[key] || 0;
    const valB = vecB[key] || 0;
    dotProduct += valA * valB;
    magA += valA ** 2;
    magB += valB ** 2;
  });

  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
}

// Example Usage
const documents = [
  "Hello world, this is a test document.",
  "Machine learning is fascinating.",
  "Hello again, world!",
];

const text1 = "Hello world!";
const text2 = "Machine learning is great.";
const text3 = "Hello world!, my name is Sankar";

const vec1 = computeTFIDF(text1, documents);
const vec2 = computeTFIDF(text2, documents);
const vec3 = computeTFIDF(text3, documents);
console.log("Embedding Vector 1:", vec1);
console.log("Embedding Vector 2:", vec2);
console.log("Embedding Vector 3:", vec3);
console.log("Cosine Similarity:", cosineSimilarity(vec1, vec3));
