// The pipeline that runs server-side every time you upload a document or
// press "Reprocess". Shown read-only so you can see exactly how your
// knowledge base is built — these are the real steps, not a mock-up.
import { chunkFixedSize, chunkParagraph, chunkSectionHeading } from './chunking';
import { embedBatch } from './embeddings';
import { kbChunks } from './db';

const OVERLAP = 64;

export async function ingest(doc: Document, settings: KbSettings) {
  // 1. Extract plain text from the uploaded PDF, Markdown, or URL.
  const text = await extractText(doc);

  // 2. Split the text into chunks. Strategy + size come from your controls.
  const chunks =
    settings.strategy === 'paragraph'
      ? chunkParagraph(text, settings.chunkSize)
      : settings.strategy === 'section-heading'
        ? chunkSectionHeading(text, settings.chunkSize)
        : chunkFixedSize(text, settings.chunkSize, OVERLAP);

  // 3. Turn every chunk into a 384-dim vector with a local embedding model.
  const vectors = await embedBatch(
    chunks.map((c) => c.content),
    'Xenova/all-MiniLM-L6-v2',
  );

  // 4. Store each chunk + its vector in pgvector for the retriever to search.
  await kbChunks.insertMany(
    chunks.map((c, i) => ({
      content: c.content,
      embedding: vectors[i],
      metadata: c.metadata,
    })),
  );
}
