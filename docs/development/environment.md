# Development Environment

> This document describes the standard development environment used for DSS Universe.
>
> Its purpose is to ensure that every developer works in a consistent and reproducible environment.

---

# Purpose

A consistent development environment reduces setup time, avoids configuration drift, and minimizes environment-specific issues.

This document should always reflect the recommended development setup.

---

# Supported Operating Systems

The project officially supports:

- macOS
- Windows

Linux support is expected but not officially documented yet.

---

# Development Stack

The recommended development stack includes:

- Git
- Node.js (LTS)
- pnpm
- Docker Desktop
- PostgreSQL
- Redis
- Visual Studio Code
- Cursor

Additional tools may be introduced as the project evolves.

---

# Repository

Clone the repository.

```bash
git clone <repository-url>
```

Install dependencies.

```bash
pnpm install
```

---

# Environment Variables

Environment variables should never be committed.

Each application should provide its own:

```text
.env.example
```

Developers should copy it to:

```text
.env
```

and configure local values.

---

# Development Services

Development services are started using Docker Compose when applicable.

Typical services include:

- PostgreSQL
- Redis

Additional infrastructure may be added later.

---

# Project Structure

The project uses a monorepo architecture.

Applications, shared packages, and documentation live in the same repository.

Refer to the architecture documentation for details.

---

# Recommended Editor

The preferred editors are:

- Cursor
- Visual Studio Code

The recommended extensions and editor configuration will be documented as the project evolves.

---

# Git Configuration

Developers should configure:

- user name;
- email;
- SSH authentication (recommended);
- LF line endings.

Git configuration should follow the project's Git standards.

---

# Updating the Environment

Development tools should be kept reasonably up to date.

Major version upgrades should be evaluated before adoption.

Avoid unnecessary upgrades during active feature development.

---

# Future Improvements

This document will later include:

- macOS setup guide;
- Homebrew packages;
- terminal configuration;
- recommended fonts;
- editor settings;
- useful aliases;
- debugging tools;
- productivity tips.

---

**Build for years, not for weeks.**
