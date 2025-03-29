# MartinAI - Maritime AIS Threat Detection System

A real-time AIS-based maritime threat detection system that monitors vessel movements inside a defined geofence, detects anomalies such as AIS shutoff or deviation from route, and includes a chat-based AI agent interface for querying vessel status and triggering actions.

## Features

- Draw custom geofences or use the default geofence around the Washington DC area
- Real-time AIS data ingestion from Datalastic API
- Route deviation detection using Turf.js geospatial analysis
- AIS shutoff detection for vessels disappearing in monitored zones
- AI-powered chat interface for natural language queries about maritime threats
- User-friendly setup wizard with phone number registration for alerts

## Tech Stack

- **Frontend**: React, Tailwind CSS, ShadCN UI, React-Leaflet, Leaflet-Draw
- **Backend**: Node.js, Express.js
- **Geospatial Analysis**: Turf.js
- **AI**: OpenAI API
- **Data Source**: Datalastic AIS API

## Setup Instructions

### Prerequisites
- Node.js v14+ and npm
- Datalastic API key (for AIS data)
- OpenAI API key (for the AI agent)

### Environment Variables
Create `.env` files in both client and server directories with the following variables:

**Client (.env)**
```
REACT_APP_API_URL=http://localhost:5050
REACT_APP_DATALASTIC_API_URL=https://api.datalastic.com/api/v0
```

**Server (.env)**
```
PORT=5000
DATALASTIC_API_KEY=your_datalastic_api_key
OPENAI_API_KEY=your_openai_api_key
DATALASTIC_API_URL=https://api.datalastic.com/api/v0
CLIENT_URL=http://localhost:3000
```

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/martin-ai-2.git
   cd martin-ai-2
   ```

2. Install server dependencies
   ```bash
   cd server
   npm install
   ```

3. Install client dependencies
   ```bash
   cd ../client
   npm install --legacy-peer-deps
   ```

### Running the Application

1. Start the server
   ```bash
   cd server
   npm run dev
   ```

2. Start the client in a separate terminal
   ```bash
   cd client
   npm start
   ```

3. Open your browser and navigate to http://localhost:3000

## Usage

1. Complete the setup wizard to define your geofence and input your phone number for alerts
2. The dashboard displays vessels in the monitored zone, with anomalies highlighted
3. Use the AI chat interface to query vessel information and anomalies
4. Sample queries:
   - "List all US vessels currently in zone"
   - "Show route deviation cases"
   - "Who turned off AIS near Washington in last 2 hours?"

## MVP Note

This MVP runs entirely without a database. All state (geofence, phone number, vessel cache) is stored in memory per session.
