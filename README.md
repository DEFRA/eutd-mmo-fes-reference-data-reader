# mmo-ecc-reference-data-reader

main service to load reference data and run cron jobs including retrospect validation

# Things to Consider
* This repository should use GitFlow as a branching strategy.
* <img
    src="docs/images/GitFlow-branching-strategy.png"
    alt="Branching Strategy"
    title="GitFlow"
    style="display: inline-block; margin: 0 auto; max-width: 350px">
* If you won't call your branch as per agreed branching `standards`, the Azure pipeline won't start or may fail to deploy an image.



###To run after cloned:
```
 $ cd mmo-ecc-fe
 $ cp .envSample .env
 $ npm i
 $ npm start
```

###To run test
```
$ npm test
```

## Running with Docker Compose

Requires Docker, and `NPM_TOKEN` declared in a `.env` file at the project root — the `test`/`development` image targets run `npm ci` against the private `mmo-shared-reference-data` Azure Artifacts feed (see `.npmrc`).

### Set up `NPM_TOKEN`

1. Create a Personal Access Token in Azure DevOps (`https://dev.azure.com/defragovuk` → User settings → Personal access tokens) with **Packaging → Read** scope.
2. Copy `.envSample` to `.env` if you haven't already, then add the token as a line in `.env` (project root, already gitignored, so it's only used locally and never committed):

   ```bash
   NPM_TOKEN="<your-pat>"
   ```

   Docker Compose automatically reads `.env` in the project root and substitutes `${NPM_TOKEN}` into the build `args` in `docker-compose.yml`/`docker-compose.test.yml` — no shell export needed. This also means every `docker compose` command must be run from the project root so `.env` is picked up.
3. Verify it's set before running any of the commands below:

   ```bash
   grep -q '^NPM_TOKEN=.\+' .env && echo "NPM_TOKEN is set" || echo "NPM_TOKEN is NOT set"
   ```

Never commit a PAT, print it in logs, or share it — see the warning already in `.npmrc`.

### 1. Shared infra (run first, from any app)

`docker-compose.deps.yml` provisions mongo on the common `fes-shared-net` network, shared across all FES apps. Start it once and leave it running:

```bash
docker compose -f docker-compose.deps.yml up -d --wait
```

Mongo is on `127.0.0.1:27017` for host tools (e.g. `npm start`, a Mongo GUI). Data persists in a named volume across restarts; `docker compose -f docker-compose.deps.yml down -v` wipes it.

### 2. Run the app

Preferred — containerised, with hot-reload (joins `fes-shared-net`, base `docker-compose.yml` + dev overlay `docker-compose.override.yml` are merged automatically):

```bash
docker compose up --build
```

Backup — on the host (needs the shared infra from step 1 and a `.env` copied from `.envSample`):

```bash
npm start
```

### 3. Unit tests

Runs against an isolated, ephemeral mongo (own `test-net`, no shared infra, no host port) — the same command is used locally and in CI:

```bash
docker compose -f docker-compose.test.yml run --rm --build test
```

`--build` forces a rebuild so the image always reflects your latest code — `docker compose run` reuses an existing image otherwise and can silently test stale code. This is also what runs in the `pre-push` git hook, blocking the push if tests fail.

