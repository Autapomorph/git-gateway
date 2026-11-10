# Git Gateway

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)

A high-performance, secure Git API gateway and multi-framework auto-updater proxy for client applications (Tauri, Wails, Electron, and more). It enables desktop and client apps to seamlessly interact with private and public Git repositories (fetching raw files, batch assets, localized release notes, and updates) without exposing secret API tokens or communicating directly with Git provider APIs.

Supported platforms include **GitHub** (Cloud & Enterprise Server), **GitLab** (Cloud & Self-Managed), **Gitea / Forgejo / Codeberg**, **GitVerse**, **GitFlic**, **Bitbucket Cloud**, **Azure DevOps**, and **OneDev**.

It shields your access tokens from end-users, streams installer downloads, handles multi-channel releases (`stable` and `prerelease`), and serves markdown/MDX release notes with full BCP 47 i18n support.

---

## Features

- **Multi-Provider Support:** First-class support for GitHub, GitLab, Gitea, Forgejo, Codeberg, GitVerse, GitFlic, Bitbucket, Azure DevOps, and OneDev (including self-hosted/enterprise instances).
- **Token Security:** Hides credentials from client apps; end-users never see or need API tokens.
- **Multi-Framework Auto-Updates (`/api/v1/update/{framework}/...`):**
  - **Tauri:** Natively compatible with Tauri v1 and Tauri v2 (`/api/v1/update/tauri/:target/:version` and `latest.json`) with automatic protocol version negotiation.
  - **Wails v3:** Fully compatible with official Wails v3 Update Manifest Protocol and in-place binary swapping.
  - **Electron, Sparkle & Generic:** Designed for extensible multi-platform update distribution.
- **Multi-Channel Releases:** Segregates `stable` and `prerelease` (beta/alpha) channels.
- **Flexible Channel Selection:** Supports channel selection via HTTP header (`X-Update-Channel`) or query parameter, with well-defined priority.
- **Binary Streaming:** Efficiently proxies binary downloads (`.exe`, `.zip`, `.sig`, `.dmg`, etc.) directly from release assets without memory bloat (`/api/v1/download`).
- **Raw & Batch Files (`/api/v1/file`, `/api/v1/files`):** Fetch single raw files or batch requests with automatic text/binary encoding from repository branches/tags.
- **Rich Release Notes System (`/api/v1/release-notes`):** Serves dedicated version release notes written in Markdown or MDX (`release-notes/<version>.mdx`), with full YAML frontmatter parsing (`title`, `date`, `tags`), multi-language BCP 47 localization support, and automatic fallbacks to provider release notes when needed.
- **Pure & Clean REST Architecture:** Structured around canonical `/api/v1/*` endpoints without URL legacy pollution.

---

## API Endpoints Reference (`/api/v1`)

All endpoints use the canonical `/api/v1` prefix.

### 1. Check for Updates (Tauri)

```http
GET /api/v1/update/tauri/:target/:version
```

Primary update endpoint for Tauri applications (supporting both Tauri v1 and Tauri v2).

- **Route Parameters:**
  - `:target` — Target platform identifier (e.g. `windows-x86_64`, `windows-aarch64`, `darwin-aarch64`, `linux-x86_64`).
  - `:version` — Currently installed client version (e.g. `1.3.1`, `1.4.0-beta.1`).
- **Framework Protocol Negotiation:**
  Automatically determines whether to return Tauri v1 format (flat JSON) or Tauri v2 format (nested `platforms[target]`) via Content Negotiation (`X-Framework-Version` > `Accept` > `User-Agent` > default: v2).
- **Channel Selection:** via `?channel=` query parameter or `X-Update-Channel` header.
- **Responses:**
  - `204 No Content`: The client is already running the latest version.
  - `200 OK`: A new version is available. Returns update metadata with secure download links pointing to `/api/v1/download?asset_id=...`.

---

### 2. Static Manifests (Tauri)

```http
GET /api/v1/update/tauri/latest.json
GET /api/v1/update/tauri/latest.:channel.json
```

Serves release manifests (`latest.json`, `latest.stable.json`, `latest.prerelease.json`) according to the `MANIFEST_SOURCE` strategy (`auto`, `releases`, or `repo`).

---

### 3. Wails v3 In-App Updates & Manifests

```http
GET /api/v1/update/wails/check?platform=:goos&arch=:goarch&version=:version
GET /api/v1/update/wails/manifest.json
GET /api/v1/update/wails/manifest.:channel.json
```

Endpoint for official Wails v3 Update Manifest Protocol and in-place binary swapping.

- **Query Parameters (for `/check`):**
  - `platform` — Target OS (`windows`, `darwin`, `linux`).
  - `arch` — Architecture (`amd64`, `arm64`, `386`, `arm`).
  - `version` — Installed version (e.g. `1.0.0`).
- **Responses:**
  - `204 No Content`: The client is already running the latest version.
  - `200 OK`: JSON manifest with target platforms, SHA-256 checksums, signatures, and secured binary download URLs.

---

### 4. Electron Auto-Updates (electron-updater)

```http
GET /api/v1/update/electron/:file
```

Serves YAML manifests for `electron-updater` (e.g. `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, `beta.yml`).

- Automatically rewrites release URLs to the secure `/api/v1/download` proxy.
- Dynamically generates the manifest with SHA-512 hashes if `.yml` was not pre-generated.

---

### 5. Sparkle / WinSparkle Appcast Feed

```http
GET /api/v1/update/sparkle/appcast.xml
```

Serves an RSS 2.0 XML appcast feed with `xmlns:sparkle` schema, EdDSA signatures (`sparkle:edSignature`), enclosure binary downloads, and links to release notes.

---

### 6. Generic Client Updates (REST / JSON)

```http
GET /api/v1/update/generic/check?version=:version&target=:target&arch=:arch
```

Universal update check endpoint for custom client apps, mobile clients, and CLI tools.

- Returns a standardized JSON object with `has_update`, `current_version`, `latest_version`, and `asset` metadata (download URL, SHA checksum, size).

---

### 7. Download Release Asset

```http
GET /api/v1/download?asset_id=:id
```

Securely proxies the release binary asset download from the Git provider.

- **Query Parameters:**
  - `asset_id` — Provider release asset identifier.
- **Response:**
  - Streams or redirects to the file with `Content-Type: application/octet-stream` and proper `Content-Disposition`.

---

### 8. Version Release Notes (Rich Markdown / MDX)

```http
GET /api/v1/release-notes/:version
```

Fetches the release notes for a specific version, with full multi-language (i18n) localization support.

- **Route Parameters:**
  - `:version` — Version string (e.g. `1.3.1`, `v1.3.1`, `1.4.0-beta.1`).
- **Language / Locale Selection:**
  - `?lang=` query parameter (highest priority, e.g. `?lang=pt-BR`, `?lang=ru`, `?lang=en`).
  - `X-App-Language` HTTP header (e.g. `X-App-Language: pt-BR`).
  - Falls back to `FALLBACK_LANGUAGE` (or `en`).

---

### 9. Release Notes Index (List Versions)

```http
GET /api/v1/release-notes
```

Returns an array of all available versions that have release notes files in `<RELEASE_NOTES_DIR>` (sorted descending by SemVer 2.0).

---

### 10. Single File Download (Raw Content)

```http
GET /api/v1/file/:path*
GET /api/v1/file?path=:path&ref=:ref
```

Fetches the raw contents of any file from the repository, securely streaming or sending it with the appropriate `Content-Type` header without exposing access tokens.

---

### 11. Batch Files Download (Multiple Files in JSON)

```http
POST /api/v1/files?ref=:ref
GET /api/v1/files?paths=:path1,:path2&ref=:ref
```

Retrieves multiple files in a single network request as a JSON object (text files encoded in `utf-8`, binary in `base64`).

- **Parameters:**
  - `ref` _(optional)_ — Git branch, tag, or commit hash (defaults to `REPO_BRANCH`).
  - `paths` — Array of file paths (via JSON body `{"paths": [...]}` in `POST`) or comma-separated string in `GET`. Maximum 50 files per request.
- **Response Example:**
  ```json
  {
    "ref": "main",
    "files": {
      "package.json": {
        "content": "{\n  \"name\": \"my-app\" ... }",
        "contentType": "application/json; charset=utf-8",
        "encoding": "utf-8",
        "size": 1240
      },
      "assets/icon.png": {
        "content": "iVBORw0KGgoAAAANSUhEUgAA...",
        "contentType": "image/png",
        "encoding": "base64",
        "size": 5432
      }
    },
    "errors": {
      "missing-file.txt": "Not Found"
    }
  }
  ```

---

## Update Channels & Precedence

Channel names are **fully arbitrary strings** (e.g. `stable`, `prerelease`, `alpha`, `beta`, `nightly`, `canary`, `preview`, `dev`) and are not restricted to a fixed set:

- **`stable`** _(reserved keyword, default)_: Exclusively serves official, non-prerelease releases. Any release marked as draft or pre-release is filtered out.
- **Any other channel name** (e.g. `prerelease`, `alpha`, `beta`, `nightly`, `canary`, etc.):
  - In **`/update/:target/:version`**: Activates pre-release eligibility, serving pre-release builds if newer than the client version. If a newer final stable release is published, pre-release clients also receive it.
  - In **`/latest.json`**: Dynamically looks for `latest.<channel>.json` in the repository (e.g. `channel=nightly` looks for `latest.nightly.json`, `channel=alpha` looks for `latest.alpha.json`), automatically falling back to `latest.json` if the channel file does not exist.

### Priority / Precedence Rules

When determining the release channel, the server applies the following priority order:

$$\text{Query Parameter}\; (\texttt{?channel=}) \quad \mathbf{>} \quad \text{HTTP Header}\; (\texttt{X-Update-Channel}) \quad \mathbf{>} \quad \text{Default}\; (\texttt{stable})$$

1. **Query Parameter (`?channel=...`)**: Takes highest precedence. Useful for manual testing, browser links, and direct overrides.
2. **HTTP Header (`X-Update-Channel: ...`)**: Used by automated client libraries (like Tauri v2 `check({ headers })`).
3. **Default (`stable`)**: Used when neither the query parameter nor the header is provided.

### Usage in Tauri v2

Pass the `headers` option to `check()` in `@tauri-apps/plugin-updater`:

```typescript
import { check } from '@tauri-apps/plugin-updater';

// Check for stable updates (default)
const update = await check({
  headers: {
    'X-Update-Channel': 'stable',
  },
});

// Check for pre-release / beta updates
const betaUpdate = await check({
  headers: {
    'X-Update-Channel': 'prerelease',
  },
});
```

---

## Framework Protocol Versioning (Content Negotiation)

Endpoints like `/api/v1/update/tauri/:target/:version` dynamically negotiate the protocol format to cleanly serve clients running different framework generations without polluting URL paths:

- **Tauri v1 Protocol**: Flat JSON with top-level `url`, `version`, `signature`, and `notes`.
- **Tauri v2 Protocol** _(default)_: Nested JSON containing `platforms[target]` with `url` and `signature`.

### Priority Rules

When determining the client protocol version, the server applies the following order of precedence:

$$\text{Query Parameter}\; (\texttt{?framework\_version=}) \quad \mathbf{>} \quad \text{HTTP Header}\; (\texttt{X-Framework-Version}) \quad \mathbf{>} \quad \text{Accept Header}\; (\texttt{application/vnd.<fw>.vX+json}) \quad \mathbf{>} \quad \text{User-Agent} \quad \mathbf{>} \quad \text{Default}\; (\text{Latest})$$

1. **Query Parameter (`?framework_version=...`)**: Explicit override, e.g. `?framework_version=1`.
2. **HTTP Header (`X-Framework-Version: ...`)**: Explicit framework protocol version, e.g. `X-Framework-Version: 1`.
3. **Accept Header (`Accept: application/vnd.tauri.v1+json`)**: Standard REST vendor MIME type.
4. **User-Agent Heuristic**:
   - `tauri-plugin-updater` $\to$ Tauri v2 protocol.
   - `tauri-updater` (or Tauri v1 client) $\to$ Tauri v1 protocol.
5. **Default**: Latest stable protocol version (Tauri v2).

---

## Environment Variables

Configure these variables in your deployment environment (e.g. Vercel Project Settings):

| Variable                      | Required |     Default     | Description                                                                                                                                                                          |
| :---------------------------- | :------: | :-------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GIT_PROVIDER`                |    No    |    `github`     | Git provider: `github`, `gitlab`, `gitea`, `gitverse`, `gitflic`, `bitbucket`, `azure_devops`, or `onedev`.                                                                          |
| `GIT_TOKEN`                   | **Yes**  |        —        | Personal Access Token with repository read access.                                                                                                                                   |
| `REPO_OWNER`                  | **Yes**  |        —        | Repository owner / group / organization. For Azure DevOps: `org` or `org/project`.                                                                                                   |
| `REPO_NAME`                   | **Yes**  |        —        | Repository / project name.                                                                                                                                                           |
| `GIT_API_URL`                 |    No    |        —        | Custom API Base URL for self-hosted instances (e.g. `https://gitlab.mycompany.com/api/v4`, `https://github.corp.com/api/v3`, `https://codeberg.org/api/v1`). Auto-detected if empty. |
| `REPO_BRANCH`                 |    No    |     `main`      | Target repository branch for fetching manifests (`latest*.json`) and release notes.                                                                                                  |
| `MANIFEST_SOURCE`             |    No    |     `auto`      | Manifest resolution strategy: `auto` (release assets first, fallback to repo), `releases` (only release assets), or `repo` (only repository files).                                  |
| `MANIFESTS_DIR`               |    No    |   `""` (root)   | Target directory in repository where release manifests (`latest*.json`) are located (used when served from repository).                                                              |
| `RELEASE_NOTES_DIR`           |    No    | `release-notes` | Target directory in repository where release notes (`.md` / `.mdx`) are located.                                                                                                     |
| `RELEASE_NOTES_DIR_STRUCTURE` |    No    |     `auto`      | Directory layout for release notes: `auto` (nested first, fallback to flat), `nested`, or `flat`.                                                                                    |
| `FALLBACK_LANGUAGE`           |    No    |      `en`       | Fallback language / locale when requested translation is unavailable (e.g. `en`, `en-US`, `ru`).                                                                                     |

---

## Provider Setup Examples

### 1. GitHub (Default)

```bash
GIT_PROVIDER=github
GIT_TOKEN=ghp_yourPersonalAccessTokenHere
REPO_OWNER=my-org
REPO_NAME=my-app
```

_For GitHub Enterprise Server:_ set `GIT_API_URL=https://github.mycompany.com/api/v3`.

### 2. GitLab (Cloud or Self-Managed)

```bash
GIT_PROVIDER=gitlab
GIT_TOKEN=glpat-yourPersonalAccessTokenHere
REPO_OWNER=my-group
REPO_NAME=my-app
```

_For GitLab Self-Managed:_ set `GIT_API_URL=https://gitlab.mycompany.com/api/v4`.

### 3. Gitea / Forgejo / Codeberg

```bash
GIT_PROVIDER=gitea
GIT_TOKEN=your_gitea_token
REPO_OWNER=my-org
REPO_NAME=my-app
GIT_API_URL=https://codeberg.org/api/v1  # or https://gitea.mycompany.com/api/v1
```

### 4. GitVerse (Сбер / СберТех)

```bash
GIT_PROVIDER=gitverse
GIT_TOKEN=your_gitverse_token
REPO_OWNER=my-org
REPO_NAME=my-app
```

_Pre-configured with `https://gitverse.ru/api/v1`._

### 5. GitFlic (ГК «Астра» / Ресолют)

```bash
GIT_PROVIDER=gitflic
GIT_TOKEN=your_gitflic_token
REPO_OWNER=my-alias
REPO_NAME=my-project
```

_Pre-configured with `https://api.gitflic.ru` (set `GIT_API_URL` for self-hosted GitFlic Enterprise)._

### 6. Bitbucket Cloud

```bash
GIT_PROVIDER=bitbucket
GIT_TOKEN=your_app_password_or_token  # For Basic auth: username:app_password
REPO_OWNER=my-workspace
REPO_NAME=my-repo
```

### 7. Azure DevOps

```bash
GIT_PROVIDER=azure_devops
GIT_TOKEN=your_azure_personal_access_token
REPO_OWNER=my-organization/my-project
REPO_NAME=my-repo
```

### 8. OneDev

```bash
GIT_PROVIDER=onedev
GIT_TOKEN=your_onedev_access_token
REPO_OWNER=my-group
REPO_NAME=my-project
GIT_API_URL=https://code.onedev.io/~api  # or https://onedev.mycompany.com/~api
```

---

## Deployment to Vercel

1. Create a Git repository (e.g. `git-gateway`) and push this project.
2. Log in to [Vercel](https://vercel.com/) and click **Add New -> Project**.
3. Select your repository, leave **Framework Preset** as **Other**, and click **Deploy**.
4. In the Vercel Dashboard, go to **Settings -> Environment Variables** and add your provider configuration (e.g. `GIT_PROVIDER`, `GIT_TOKEN`, `REPO_OWNER`, `REPO_NAME`).
5. **Deployment Protection / OPTIONS Allowlist (Required if Deployment Protection is enabled):**  
   If Vercel Deployment Protection (or Vercel Authentication) is enabled on your project or preview deployments, allow CORS preflight (`OPTIONS`) requests so client applications (such as Tauri Webviews or web frontends) can reach the API without 401 Unauthorized or redirect errors.

   Because Vercel limits the OPTIONS Allowlist to a maximum of 4 paths, all endpoints use the common `/api` prefix (e.g. `/api/v1/update/tauri/v2/...`, `/api/v1/download`, `/api/v1/files`):
   - Go to **Project Settings -> Deployment Protection -> OPTIONS Allowlist** (see [Vercel Documentation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/options-allowlist)).
   - Add the following path to the allowlist:
     - `/api`

6. Redeploy the latest deployment to apply the environment variables and settings.

---

## Deployment with Docker

You can run the proxy completely self-hosted using Docker and Compose without any dependency on Vercel:

```bash
# 1. Copy and edit environment configuration
cp .env.example .env

# 2. Build and run via Compose (includes Nginx reverse proxy)
docker compose up -d --build
```

For full setup, architecture details, and SSL configuration, see the [Docker Deployment Guide](docs/docker.md).

---

## Configuring Tauri Application

In your Tauri project's `tauri.conf.json`, specify your proxy endpoint:

```json
"plugins": {
  "updater": {
    "pubkey": "<your-tauri-pubkey>",
    "endpoints": [
      "https://your-proxy.vercel.app/api/v1/update/tauri/v2/{{target}}/{{current_version}}"
    ]
  }
}
```

---

## 📄 License

Distributed under the **GNU General Public License v3.0** (GPL-3.0). See [LICENSE](./LICENSE) for more details.
