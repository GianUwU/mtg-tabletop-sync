# MTG Tabletop Sync

A synchronized, real-time multi-device web application designed for tracking Magic: The Gathering games. Optimized for a central flat-lying tablet or tabletop display, while allowing players to connect and control their life and counters directly from their mobile phones.

**Live Demo / Hosted Instance:** [**mtg.gian.ink**](https://mtg.gian.ink)

---

## Features

- **Tabletop-Optimized Display:**
  - Designed for a central screen placed flat on the table.
  - Players can be freely repositioned and rotated so cards face each player sitting around the table.
  - Customizable MTG ambient themes and sleek dark-mode UI.

- **Real-Time Multi-Device Sync:**
  - High-performance WebSocket architecture keeps all connected devices in instant sync.
  - Scan the on-screen **QR Code** or share the **4-digit room code** so players can control their life and counters directly from their smartphones.

- **Comprehensive Stat & Counter Tracking:**
  - **Life Totals:** Fast tap (+1/-1) and long-press (+10/-10) repeat increments.
  - **Commander Damage:** Per-opponent commander damage tracking with automatic main life deduction.
  - **Infect / Poison Counters:** Automatic lethal indicator at 10 poison counters or 21 Commander Damage Counters.
  - **Special MTG Counters:** Energy, Experience, Rad counters, Mana pool tracking, and Storm count.
  - **Custom Counters:** Add arbitrary counters with custom labels and colors.

- **Scryfall Card Art Integration:**
  - Live card search powered by the Scryfall API to set high-res commander artwork as player card backgrounds.

- **Built-in Table Tools:**
  - Action history log.

- **Game Modes & Formats:**
  - Commander / EDH (40 HP)
  - Standard / Modern / Pioneer / Limited (20 HP)
  - Two-Headed Giant (60 HP shared life) with player team merging
  - Brawl (25 HP / 30 HP)

- **Lightweight & Zero External DB Dependencies:**
  - In-memory WebSocket state backed by debounced JSON file persistence (`./data/sessions`).
  - Automatic cleanup for inactive rooms (> 2 hours).

---

## Hosted Version

You can use the publicly hosted instance right away at:
[**mtg.gian.ink**](https://mtg.gian.ink)

---

## Docker Deployment

Pre-built Docker images are available from the container registry:

```bash
docker pull registry.gian.ink/mtgstats:latest
```

### Run with Docker CLI

```bash
docker run -d \
  --name mtgstats \
  --restart unless-stopped \
  -p 8080:80 \
  -v $(pwd)/data:/app/backend/data \
  registry.gian.ink/mtgstats:latest
```

Open your browser at `http://localhost:8080`.

---

### Docker Compose

Create a `docker-compose.yml` file:

```yaml
services:
  mtgstats:
    image: registry.gian.ink/mtgstats:latest
    container_name: mtgstats
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ./data:/app/backend/data
    environment:
      - PORT=3000
```

Start the container:

```bash
docker compose up -d
```

---

## License

This project is open source and available under the [MIT License](LICENSE).

