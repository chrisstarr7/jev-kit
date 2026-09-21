# Security Policy

## Reporting

Do not open a public issue containing API keys, tokens, credentials, customer data, production records, or private source code.

Report suspected secret exposure through the repository's private maintainer channel. Revoke exposed credentials first, then provide only the minimum information needed to reproduce the problem.

## Design boundaries

- `TYPESAFE_API_KEY` is read from the process environment and is not stored by this package.
- The package is a development-time decision aid, not an authorization, SQL-safety, or production-change approval system.
- Jev failures and low-confidence results must fall back to normal Agent review.
