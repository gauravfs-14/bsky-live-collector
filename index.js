import { Firehose } from "@atproto/sync";
import { IdResolver } from "@atproto/identity";
import db from "./utils/db.js";
import { KEYWORDS } from "./config.js";

function isMatchingPost(text = "") {
  if (!text || typeof text !== "string") return false;

  // Normalize: lowercase and remove basic punctuation
  const cleaned = text
    .toLowerCase()
    .replace(/[^\w\s#]/g, "") // Keep hashtags
    .split(/\s+/); // Tokenize by space

  const joinedText = cleaned.join(" ");

  return KEYWORDS.some((kw) => {
    const normalizedKeyword = kw.toLowerCase();
    // Match inside hashtags or joined words
    return (
      joinedText.includes(normalizedKeyword) ||
      cleaned.some((word) =>
        word.includes(normalizedKeyword.replace(/\s+/g, ""))
      ) // e.g. "mentalhealth"
    );
  });
}

// === Insert Queue Config ===
import {
  INSERT_BATCH_SIZE,
  INSERT_INTERVAL_MS,
  MAX_QUEUE_LENGTH,
  MAX_RETRIES,
} from "./config.js";

let insertQueue = [];
let isInserting = false;

// === Flush Queue Safely ===
const flushQueue = async () => {
  if (insertQueue.length === 0 || isInserting) return;

  isInserting = true;
  const batch = insertQueue.splice(0, INSERT_BATCH_SIZE);

  try {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO posts_unlabeled (
        uri, did, text, created_at, langs, facets, reply, embed, ingestion_time
      ) VALUES (
        @uri, @did, @text, @created_at, @langs, @facets, @reply, @embed, @ingestion_time
      )
    `);

    const insertMany = db.transaction((records) => {
      for (const r of records) {
        insert.run({
          ...r,
          langs: JSON.stringify(r.langs || []),
          facets: JSON.stringify(r.facets),
          reply: r.reply || null,
          embed: JSON.stringify(r.embed),
        });
      }
    });

    insertMany(batch);
    console.log(`✅ Inserted batch of ${batch.length}`);
  } catch (err) {
    console.error("🔥 SQLite batch insert error:", err.stack || err);
    batch.forEach((item) => {
      item._retries = (item._retries || 0) + 1;
    });
    const retryable = batch.filter((item) => item._retries <= MAX_RETRIES);
    if (retryable.length > 0) {
      insertQueue.unshift(...retryable);
    }
  }

  isInserting = false;

  if (insertQueue.length > MAX_QUEUE_LENGTH) {
    insertQueue = insertQueue.slice(-MAX_QUEUE_LENGTH);
  }
};

setInterval(flushQueue, INSERT_INTERVAL_MS);

// === Graceful Shutdown ===
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down — flushing remaining posts...");
  await flushQueue();
  process.exit(0);
});

// === Firehose Setup ===
const idResolver = new IdResolver();
let firehoseStarted = false;

const firehose = new Firehose({
  service: "wss://bsky.network",
  idResolver,
  filterCollections: ["app.bsky.feed.post"],

  handleEvent: async (evt) => {
    try {
      if (evt.event !== "create") return;
      const post = evt.record;
      if (!post?.text || post.reply) return;
      if (post?.$type !== "app.bsky.feed.post") return;
      if (!isMatchingPost(post.text)) return;
      if (!evt.did) return;

      const record = {
        uri: evt.uri.toString(),
        did: evt.did,
        text: post.text,
        created_at: post.createdAt || evt.time,
        langs: post.langs || [],
        facets: post.facets || null,
        reply: null,
        embed: post.embed || null,
        ingestion_time: new Date().toISOString(),
      };

      insertQueue.push(record);

      if (insertQueue.length >= INSERT_BATCH_SIZE * 2) {
        console.log("⚠️ Queue large — flushing early...");
        await flushQueue();
      }
    } catch (err) {
      console.error("🔥 Event handler error:", err.stack || err);
    }
  },

  onError: (err) => {
    console.error("🔥 Firehose stream error:", err.stack || err);
  },
});

if (!firehoseStarted) {
  firehoseStarted = true;
  firehose.start();
  console.log("🚀 Firehose started.");
}
