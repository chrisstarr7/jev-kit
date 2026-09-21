## Jev Decision Layer

When `docs/jev/README.md` is present, the user-level `java-jev` Skill may use Jev for bounded development-time classifications only. Jev is optional and must fall back to Codex on any failure or low confidence; SQL, API, transaction, MQ, permission, security, and migration changes remain Codex hard-review gates.
