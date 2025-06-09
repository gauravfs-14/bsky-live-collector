import { Firehose } from "@atproto/sync";
import { IdResolver } from "@atproto/identity";
import db from "./utils/db.js"; // Adjust the import path as needed

const MENTAL_HEALTH_KEYWORDS = [
  "mental health",
  "mental illness",
  "mental disorder",
  "mental breakdown",
  "mental fatigue",
  "psychological",
  "emotional health",
  "emotional support",
  "cognitive therapy",
  "psychotherapy",
  "clinical depression",
  "depression",
  "depressed",
  "hopeless",
  "worthless",
  "numb",
  "empty",
  "crying",
  "grief",
  "mourning",
  "loss",
  "low mood",
  "burnout",
  "anxiety",
  "anxious",
  "panic attack",
  "panic disorder",
  "worry",
  "nervous",
  "overwhelmed",
  "racing thoughts",
  "dread",
  "tension",
  "suicide",
  "suicidal",
  "self harm",
  "cutting",
  "attempted suicide",
  "taking my life",
  "ending it all",
  "thoughts of suicide",
  "hurting myself",
  "ptsd",
  "trauma",
  "flashbacks",
  "hypervigilance",
  "dissociation",
  "emotional numbness",
  "abuse trauma",
  "childhood trauma",
  "sexual trauma",
  "bipolar",
  "ocd",
  "adhd",
  "borderline",
  "schizophrenia",
  "eating disorder",
  "anorexia",
  "bulimia",
  "personality disorder",
  "therapy",
  "counseling",
  "counsellor",
  "therapist",
  "psychologist",
  "psychiatrist",
  "meds",
  "mental health treatment",
  "support group",
  "recovery",
  "mental health app",
  "insomnia",
  "sleep disorder",
  "can’t sleep",
  "racing mind",
  "stressed",
  "stress",
  "burned out",
  "sleep paralysis",
  "i want to die",
  "i want to end it",
  "i can’t do this anymore",
  "life isn’t worth it",
  "no reason to live",
  "ending my life",
];

// Precompile keyword regexes
const mentalHealthRegexes = MENTAL_HEALTH_KEYWORDS.map(
  (kw) =>
    new RegExp(`\\b${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i")
);

function isMentalHealthPost(text = "") {
  return mentalHealthRegexes.some((regex) => regex.test(text));
}
// === Insert Queue Config ===
const INSERT_BATCH_SIZE = 100;
const INSERT_INTERVAL_MS = 5000;
const MAX_QUEUE_LENGTH = 1000;
const MAX_RETRIES = 3;

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
      if (!isMentalHealthPost(post.text)) return;
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
