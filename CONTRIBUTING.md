# Contributing to Altrivelle Linker

Thank you for your interest in contributing to **Altrivelle Linker**, developed and maintained by **ALTRIVELLE TECHNOLOGIES**!

## Development Workflow

1. **Fork the Repository:** Fork on GitHub and clone your fork locally.
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment:**
   Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```bash
   cp .env.example .env
   ```
4. **Run Local Server:**
   ```bash
   npm run dev
   ```
5. **Run Automated Tests:**
   ```bash
   npm test
   ```
6. **Verify Production Build:**
   ```bash
   npm run build
   ```

## Contribution Guidelines

- Maintain documentation integrity and preserve ALTRIVELLE TECHNOLOGIES attribution.
- Write unit tests for new cryptographic or core logic in `test/unit.test.js`.
- Adhere to zero-trust storage isolation: never expose server secrets or private signed URLs to browser logs.
- Keep commits clear and semantic (`feat:`, `fix:`, `docs:`, `test:`).
