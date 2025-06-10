// === Database Config ===
// Change this path to your desired database location
// This is the SQLite database file path
export const DB_PATH = "./local.db";

// === Keywords Config ===
// Customize these keywords to filter posts
// related to your topic of interest
// You can add or remove keywords as needed
// This will be used to filter posts for insertion
// into the database
export const KEYWORDS = [
  "suicide",
  "suicidal",
  "suicide attempt",
  "attempted suicide",
  "ending my life",
  "taking my life",
  "ending it all",
  "i want to die",
  "i want to end it",
  "i can't do this anymore",
  "no reason to live",
  "i’m done with life",
  "i hate my life",
  "life is meaningless",
  "kill myself",
  "killing myself",
  "wish i was dead",
  "just want to die",
  "tired of living",
  "can't take it anymore",
  "i want out",
  "give up on life",
  "self harm",
  "self-harm",
  "hurting myself",
  "cutting myself",
  "cut my wrist",
  "slit my wrist",
  "wrist cutting",
  "bleeding out",
  "razor blades",
  "burning myself",
  "overdose on pills",
  "pills and alcohol",
  "drank bleach",
  "drink bleach",
  "carbon monoxide",
  "hang myself",
  "hanging myself",
  "jumping off a bridge",
  "jumping off the building",
  "suicide note",
  "final message",
  "last goodbye",
  "goodbye forever",
  "see you in another life",
  "won't be here tomorrow",
  "don’t want to be here",
];

// === Insert Queue Config ===
// These are the settings for how posts are inserted
// into the database
// Optionally adjust these settings to control how posts are inserted
// into the database
export const INSERT_BATCH_SIZE = 100;
export const INSERT_INTERVAL_MS = 5000;
export const MAX_QUEUE_LENGTH = 1000;
export const MAX_RETRIES = 3;
