# insighta CLI

A terminal tool for interacting with the [Insighta Labs+ Profiles API](https://db-query-backend-myitjournal8137-tp61obq3.leapcell.dev). Supports GitHub OAuth login with PKCE, role-based access (admin / analyst), and full profile management from the command line.

---

## Requirements

- Node.js >= 18.0.0
- npm >= 8

---

## Installation

### From source (development)

```bash
git clone https://github.com/MyITjournal/db-query-cli.git
cd db-query-cli
npm install
npm link
```

`npm link` registers `insighta` as a global command so it works from any directory.

### Verify installation

```bash
insighta --version
```

---

## Authentication

All commands (except `--help` and `--version`) require you to be logged in.

### Login

```bash
insighta login
```

Opens your browser to complete GitHub OAuth. The CLI:

1. Generates a `state` token (CSRF protection) and a PKCE `code_challenge` (SHA-256)
2. Opens `GET /auth/github?state=...&code_challenge=...&code_challenge_method=S256`
3. Waits on `http://localhost:9876/callback` for the backend to redirect back with an `auth_code`
4. Verifies the returned `state` matches to prevent CSRF attacks
5. Exchanges `{ auth_code, code_verifier }` with `POST /auth/cli/token` to receive JWTs
6. Saves credentials to `~/.insighta/credentials.json`

On success:

```
Logged in as {github_username}
```

### Logout

```bash
insighta logout
```

Invalidates the refresh token on the server and clears `~/.insighta/credentials.json`.

### Who am I?

```bash
insighta whoami
```

Displays the currently logged-in GitHub username.

---

## Token management

Tokens are stored locally at `~/.insighta/credentials.json` and managed automatically:

| Token         | Expiry    |
| ------------- | --------- |
| Access token  | 3 minutes |
| Refresh token | 5 minutes |

Before every API call, the CLI checks if the access token is expiring within 30 seconds. If so, it automatically refreshes both tokens. If the refresh token is also expired, you will be prompted to run `insighta login` again.

---

## Commands

### `insighta login`

Log in via GitHub OAuth (PKCE flow).

### `insighta logout`

Log out and clear saved credentials.

### `insighta whoami`

Show the currently logged-in user.

---

### `insighta profiles list`

List profiles with optional filters and pagination.

```bash
insighta profiles list [options]
```

| Option                | Description                                                        | Default |
| --------------------- | ------------------------------------------------------------------ | ------- |
| `--gender <gender>`   | Filter by gender (`male` \| `female`)                              | —       |
| `--age-group <group>` | Filter by age group (`child` \| `teenager` \| `adult` \| `senior`) | —       |
| `--country <code>`    | Filter by ISO country code (e.g. `NG`, `US`)                       | —       |
| `--min-age <n>`       | Minimum age                                                        | —       |
| `--max-age <n>`       | Maximum age                                                        | —       |
| `--sort-by <field>`   | Sort field (`age` \| `created_at` \| `gender_probability`)         | —       |
| `--order <dir>`       | Sort direction (`asc` \| `desc`)                                   | `desc`  |
| `--page <n>`          | Page number                                                        | `1`     |
| `--limit <n>`         | Results per page (1–50)                                            | `10`    |

**Examples:**

```bash
# First 10 profiles
insighta profiles list

# Page 2, 20 results
insighta profiles list --page 2 --limit 20

# Female profiles from Nigeria, sorted by age ascending
insighta profiles list --gender female --country NG --sort-by age --order asc

# Adults aged 25–40
insighta profiles list --age-group adult --min-age 25 --max-age 40
```

**Output** (JSON):

```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 2026,
  "total_pages": 203,
  "links": {
    "self": "/api/profiles?page=1&limit=10",
    "next": "/api/profiles?page=2&limit=10",
    "prev": null
  },
  "data": [ ... ]
}
```

---

### `insighta profiles get <id>`

Fetch a single profile by its UUID.

```bash
insighta profiles get 018f1a2b-3c4d-7e8f-9a0b-1c2d3e4f5a6b
```

**Output** (JSON):

```json
{
  "id": "018f1a2b-...",
  "name": "Harriet Tubman",
  "gender": "female",
  "gender_probability": 0.97,
  "age": 28,
  "age_group": "adult",
  "country_id": "US",
  "country_name": "United States",
  "country_probability": 0.89,
  "created_at": "2025-01-15T10:30:00.000Z"
}
```

---

### `insighta profiles search <query>`

Natural language search across profiles.

```bash
insighta profiles search "young women from Nigeria" [options]
```

| Option        | Description      | Default |
| ------------- | ---------------- | ------- |
| `--page <n>`  | Page number      | `1`     |
| `--limit <n>` | Results per page | `10`    |

**Examples:**

```bash
insighta profiles search "male adults in Canada"
insighta profiles search "seniors over 60" --limit 5
```

---

### `insighta profiles create` _(admin only)_

Create a new profile. The backend automatically enriches the name with gender, age, and nationality data.

```bash
insighta profiles create --name "Harriet Tubman"
```

| Option          | Required | Description               |
| --------------- | -------- | ------------------------- |
| `--name <name>` | ✅       | Full name for the profile |

---

### `insighta profiles export` _(admin + analyst)_

Export profiles as a CSV file, saved to the current directory.

```bash
insighta profiles export --format csv [options]
```

| Option              | Required | Description                             |
| ------------------- | -------- | --------------------------------------- |
| `--format <fmt>`    | ✅       | Export format — only `csv` is supported |
| `--gender <gender>` | —        | Filter by gender                        |
| `--country <code>`  | —        | Filter by ISO country code              |

**Example:**

```bash
insighta profiles export --format csv --country NG
```

Saves a file named `profiles_<timestamp>.csv` in the current directory.

**CSV columns** (in order):
`id, name, gender, gender_probability, age, age_group, country_id, country_name, country_probability, created_at`

---

## Roles & permissions

| Role      | Allowed commands                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------- |
| `analyst` | `login`, `logout`, `whoami`, `profiles list`, `profiles get`, `profiles search`, `profiles export` |
| `admin`   | All of the above + `profiles create`                                                               |

Default role for new users is `analyst`. Roles are assigned on the backend.

---

## Credentials file

Credentials are stored at:

```
~/.insighta/credentials.json
```

The directory is created with `700` permissions and the file with `600` permissions (owner read/write only). To manually clear credentials:

```bash
insighta logout
```

Or delete the file directly:

```bash
# Unix/macOS
rm ~/.insighta/credentials.json

# Windows PowerShell
Remove-Item "$env:USERPROFILE\.insighta\credentials.json"
```

---

## Development

```bash
# Run directly without linking
node bin/insighta.js profiles list

# Lint
npm run lint

# Test
npm test
```

---

## Project structure

```
bin/
  insighta.js          # Entry point — CLI definition and command registration
src/
  auth.js              # OAuth + PKCE login flow, token refresh, logout
  api.js               # All HTTP calls to the backend API
  config.js            # BASE_URL, credentials read/write/clear
  commands/
    login.js           # insighta login
    logout.js          # insighta logout
    whoami.js          # insighta whoami
    profiles.js        # insighta profiles list|get|search|create|export
```
