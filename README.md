# Multiplayer Connect 4

A real-time, fully Dockerized multiplayer Connect 4 game. This project features a FastAPI Python backend serving a React (Vite + TailwindCSS) frontend out of a single Docker container. 

It includes real-time matchmaking via WebSockets, a lobby waiting list, interactive challenge system, and a persistent leaderboard tracked in an SQLite database.

## Features
- **Real-Time Gameplay**: Play Connect 4 against online opponents seamlessly using WebSockets.
- **Matchmaking Lobby**: View players who are online and idle, and send real-time challenge requests.
- **Leaderboard**: Win/Loss/Draw statistics are persisted in a database and ranked by win ratio.
- **Session Restoration**: Disconnect accidentally? The app remembers your session via browser storage and reconnects you to your player identity.
- **Single Container Deployment**: Compiles both Node/React and Python environments into a single, easy-to-deploy Docker image.

## Getting Started

### Prerequisites
- Docker
- Docker Compose

### Running the Game

The preferred way to run this application is using `docker-compose`. We have configured the compose file to mount a local `./data` directory into the container to ensure your SQLite database and user statistics persist across container restarts.

1. Clone the repository:
   ```bash
   git clone https://github.com/OurAgents/connect4.git
   cd connect4
   ```

2. Start the container in detached mode:
   ```bash
   docker-compose up -d
   ```

3. The game will now be running on `http://localhost:8777`.

### Cloudflare Tunnel Setup (Production)

To route a domain (like `www.surfingshow.com`) to this Docker container using Cloudflare Tunnels:

1. Install `cloudflared` on your Linux server.
2. Authenticate `cloudflared` with your Cloudflare account:
   ```bash
   cloudflared tunnel login
   ```
3. Create a tunnel:
   ```bash
   cloudflared tunnel create connect4-tunnel
   ```
4. Create a configuration file `~/.cloudflared/config.yml` with the following contents:
   ```yaml
   tunnel: <your-tunnel-id>
   credentials-file: /root/.cloudflared/<your-tunnel-id>.json

   ingress:
     - hostname: www.surfingshow.com
       service: http://localhost:8777
     - service: http_status:404
   ```
5. Route the DNS to the tunnel:
   ```bash
   cloudflared tunnel route dns connect4-tunnel www.surfingshow.com
   ```
6. Start the tunnel:
   ```bash
   cloudflared tunnel run connect4-tunnel
   ```
