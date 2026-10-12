# Harbour Light Handbook

This handbook describes a small open-source tide-tracking service called Harbour Light. It is a demo document for the Tooee outline panel. It has headings at every depth from 1 to 6, some skipped levels, some empty sections and some long headings.

> Press `g o` to open or focus the outline. Use `j` and `k` in the outline, then `enter` to jump. Press `escape` to go back to the document. Use `z c`, `z o`, `z M` and `z R` to close and open sections.

## Getting started

Harbour Light runs as one Bun process. It reads tide tables, stores them, and serves a small HTTP API.

### Requirements

- Bun 1.3 or later
- 200 MB of free disk space for the tide archive
- A network connection for the first sync

### Install

```bash
# This line starts with a hash, but it is a shell comment and not a heading.
bun add -g harbour-light

## This line is also inside the fence. The outline must not list it.
harbour-light init ~/.harbour
```

### First run

Start the service and open the status page.

```bash
harbour-light serve --port 4100
```

#### Check the status page

Open `http://localhost:4100/status`. The page shows the last sync time and the number of stations.

#### Stop the service

Press `ctrl+c` in the terminal. The service writes its state and exits.

## Configuration

Harbour Light reads `~/.harbour/config.toml` at start. Every key is optional.

### The `stations` table

Each entry names a tide station and the source that feeds it.

```toml
[stations.dover]
source = "ukho"
id = "0089"

[stations.calais]
source = "shom"
id = "CALAIS"
```

#### Station sources

| Source | Region         | Update interval |
| ------ | -------------- | --------------- |
| `ukho` | United Kingdom | 6 hours         |
| `shom` | France         | 12 hours        |
| `noaa` | United States  | 1 hour          |

##### Source credentials

Some sources need an API key. Put the key in the environment, not in the config file.

###### UKHO keys

Set `HARBOUR_UKHO_KEY`. The key is free for low request rates.

###### NOAA keys

NOAA needs no key. The service keeps to the published rate limit.

##### Custom sources

Write a source as a module that exports one `fetchTides(station)` function. Put the module path in `source`.

#### Station names

Names are free text. The status page and the API both show them.

### Storage

The archive lives under `~/.harbour/archive`. Each station gets one SQLite file.

#### Retention

Old readings move to a compressed file after 90 days. Set `retention_days` to change this.

#### Backups

Copy the archive folder while the service is stopped. A copy of a running archive can be inconsistent.

### Logging

Logs go to standard error. Set `log_level` to `debug`, `info`, `warn` or `error`.

## Architecture

This part explains how the pieces fit together.

```text
fetchers --> normaliser --> archive --> query engine --> HTTP API
                                   \--> alert rules --> notifiers
```

### Fetchers

One fetcher runs for each station. A fetcher asks its source for new readings on the update interval.

#### Retry policy

A failed fetch waits 30 seconds, then 60, then 120. After five failures the fetcher marks the station as stale.

#### Clock drift

Sources report times in their own zone. The fetcher converts every time to UTC before it passes the reading on.

### Normaliser

The normaliser turns every source format into one `Reading` record.

```ts
interface Reading {
  station: string;
  at: Date;
  heightMetres: number;
  kind: "high" | "low" | "sample";
}
```

### Query engine

The query engine answers range queries and predicts the next high and low water.

##### A skipped level

This heading jumps from depth 3 to depth 5. The outline indents it two steps, and its fold ends at the next heading of depth 5 or less.

#### Prediction model

The model fits harmonic constituents to the last 30 days of readings. It needs at least 14 days of data.

### Alert rules and notifiers

Alert rules watch the archive. A rule fires when a reading crosses a threshold.

#### Rule syntax

```yaml
- station: dover
  when: height_above
  metres: 6.5
  notify: [desktop, email]
```

#### Notifiers

| Notifier  | Needs                            |
| --------- | -------------------------------- |
| `desktop` | A desktop notification daemon    |
| `email`   | SMTP settings in the config file |
| `webhook` | A URL that accepts POST requests |

## HTTP API

All responses are JSON. Times use ISO 8601 in UTC.

### `GET /stations`

Lists every configured station with its last reading.

### `GET /stations/:id/tides`

Returns readings for one station.

#### Query parameters

- `from`: start time, inclusive
- `to`: end time, exclusive
- `kind`: `high`, `low` or `sample`

#### Example response

```json
{
  "station": "dover",
  "readings": [
    { "at": "2026-10-05T04:12:00Z", "heightMetres": 6.21, "kind": "high" },
    { "at": "2026-10-05T10:31:00Z", "heightMetres": 1.04, "kind": "low" }
  ]
}
```

### `GET /stations/:id/next`

Returns the next predicted high and low water.

### `POST /alerts`

Creates an alert rule. The body uses the same fields as the YAML rule syntax.

## Operations

### Deploy on a small server

Copy the binary, the config file and a service unit to the server.

#### systemd unit

```ini
[Unit]
Description=Harbour Light

[Service]
ExecStart=/usr/local/bin/harbour-light serve --port 4100
Restart=on-failure
```

#### Reverse proxy

Put the service behind a reverse proxy that adds TLS. The service itself speaks plain HTTP.

### Monitoring

The `/status` page and the `/metrics` endpoint show sync health.

### A very long heading that explains why the archive can grow larger than expected after a source changes its station identifiers

When a source renames a station, the service sees a new station and starts a new archive file. Merge the two files with `harbour-light archive merge` after you update the config.

### An empty section

### Another empty section right after it

## Troubleshooting

### The status page shows a stale station

1. Check the network connection.
2. Check the source credentials.
3. Run `harbour-light fetch <station> --verbose`.

### Predictions look wrong

The model needs at least 14 days of readings. A station with a short history gives poor predictions.

### The service will not start

Look for a port clash. Another process can already use port 4100.

Frequently asked questions
==========================

This part uses setext headings. The line of `=` signs makes the heading above it depth 1. A line of `-` signs makes depth 2.

Is the data official?
---------------------

No. Harbour Light copies data from public sources. Use official tables for navigation.

Can I add my own station?
-------------------------

Yes. Write a custom source and add it to the `stations` table.

# Appendix

## Glossary

### Constituent

One periodic part of the tide, for example the main lunar term `M2`.

### Datum

The zero level that heights are measured from.

## Heading features in **bold**, _italic_, `code` and [links](https://example.com)

The outline shows the plain text of a heading. Bold, italic, code and link marks are removed.

## Change log

### 0.3.0

#### Added

- Webhook notifier
- `GET /stations/:id/next`

#### Fixed

- Clock drift for sources that report local time

### 0.2.0

#### Added

- Alert rules

### 0.1.0

First release.

# Licence

MIT. See the `LICENSE` file in the repository.
