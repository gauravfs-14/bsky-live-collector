# 🦋 BSKY Live Data Collector

A tool for collecting live posts from Bluesky (BSKY) on specific topics using the BSKY Firehose API. This application captures posts matching configured keywords and stores them in a local SQLite database for later analysis.

## Features

- 🔄 Real-time data collection from the BSKY Firehose
- 🔍 Keyword filtering with smart matching (including hashtags)
- 💾 Efficient SQLite storage with batch processing
- 🛡️ Resilient error handling with automatic retries
- 🚦 Queue management to prevent memory overflows

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/gauravfs-14/bsky-live-collector.git
   cd bsky-live-collector
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. The postinstall script will automatically create the config file which can be found at `config.js`. If you need to modify the keywords, you can edit this file directly.

## Configuration

1. Change the `config.js` file in the root directory with your target keywords:

   ```javascript
   export const KEYWORDS = [
     "keyword1",
     "keyword2",
     "specific phrase",
     "#hashtag"
   ];
   ```

2. If you want to change the database name or other settings, modify the same `config.js` file:

   ```javascript
    export const DB_NAME = "bsky_posts.db"; // SQLite database name
   ```

## Usage

Start the collector:

```bash
npm start
```

The collector will:

1. Connect to the BSKY Firehose
2. Filter for posts containing your keywords
3. Store matching posts in the SQLite database
4. Log activity to the console

Press `Ctrl+C` to gracefully shut down. The system will flush any remaining posts to the database before exiting.

## How It Works

### Keyword Matching

The system uses a smart matching algorithm that:

- Normalizes text (lowercase, punctuation removal)
- Handles hashtags (e.g., #keywordmatch)
- Supports multi-word phrases
- Processes text tokens to find partial matches

### Database Structure

Posts are stored in the `posts_unlabeled` table with the following schema:

| Column         | Type     | Description                              |
|----------------|----------|------------------------------------------|
| uri            | TEXT     | Unique post identifier                   |
| did            | TEXT     | Author's decentralized identifier        |
| text           | TEXT     | Post content                             |
| created_at     | TEXT     | Post creation timestamp                  |
| langs          | TEXT     | Language tags (JSON array)               |
| facets         | TEXT     | Rich text features (JSON)                |
| reply          | TEXT     | Reply information if applicable          |
| embed          | TEXT     | Embedded content (JSON)                  |
| ingestion_time | TEXT     | When the post was collected              |

### Batch Processing

To optimize performance and reduce database load:

- Posts are collected in a queue
- Flushed in batches (default: every 5 seconds or 100 posts)
- Failed inserts are automatically retried
- Queue size is limited to prevent memory issues

## Troubleshooting

**Issue**: Firehose connection errors

- Check your internet connection
- Verify the BSKY service is available
- Restart the collector

**Issue**: Database errors

- Check disk space
- Ensure write permissions for the database directory
- Verify the database isn't locked by another process

**Issue**: High memory usage

- Lower the `MAX_QUEUE_LENGTH` in `config.js`
- Increase flush frequency by reducing `INSERT_INTERVAL_MS`

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
