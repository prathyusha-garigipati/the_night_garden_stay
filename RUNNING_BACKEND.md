Running the backend locally

This project exposes the backend in `backend/server.js`.

Prerequisites
- Node.js (v18+ recommended)
- npm (comes with Node)
- A MongoDB instance (Atlas or local). If using Atlas, add your local IP to the Network Access whitelist.

1) Install dependencies

From the project root:

```bash
# install dependencies
npm install
```

2) Configure environment

- Copy the example env file into place:

```bash
cp backend/.env.example .env
# or
cp backend/.env.example backend/.env
```

- Edit `.env` (or `backend/.env`) and set `MONGO_URI` to your MongoDB connection string. If you use Atlas, make sure your current IP is whitelisted.

3) Start the server

You can run the server directly with Node:

```bash
# run from project root
node backend/server.js
```

Or use nodemon for development (auto-restarts on change):

```bash
npm install -g nodemon
nodemon backend/server.js
```

The server logs will show `MongoDB Connected` if the DB connection is successful and `Server running on http://localhost:PORT`.

4) Quick smoke test

In a separate terminal, run:

```bash
curl http://localhost:5000/api/bookings | jq '.'
```

You should see an array of bookings (may be empty).

Common issues & troubleshooting

- "MongoDB URI not set" / server exits immediately:
  - Make sure `.env` exists and contains `MONGO_URI` (or set `MONGODB_URI`).
  - Example `.env`:
    MONGO_URI="mongodb://localhost:27017/the_night_garden"

- "MongooseServerSelectionError" / connection timeouts:
  - If using Atlas, add your client IP to Atlas Network Access.
  - Check the connection string for typos.
  - Verify your MongoDB user has the correct database permissions.

- Port already in use:
  - Change `PORT` in `.env` or stop the other process.

5) Deploy notes (Render / Vercel / other hosts)

- Set the `MONGO_URI` environment variable in the host's dashboard.
- Ensure the host can reach your MongoDB Atlas cluster (add the host IP range to Atlas whitelist if necessary, or allow access from anywhere temporarily while securing credentials).

If you want, I can:
- Add a script to `package.json` to run the server (e.g., `start:backend`).
- Create a small `db-migrate.js` script to patch existing bookings that have lowercase `checkin/checkout` fields.

Tell me if you'd like either of those added and I'll create them and commit them to the repo.
