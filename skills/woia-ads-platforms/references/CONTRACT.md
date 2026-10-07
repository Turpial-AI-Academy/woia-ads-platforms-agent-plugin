# woia-ads-platforms contract

## Initial Meta transport

`scripts/meta-port.mjs` implements configured Marketing API HTTP transport for campaign,
ad-set budget/targeting/conversion and insight operations. Supply exact account/version,
target IDs, account currency/scale and accepted campaign policy fields; none is guessed.
Only host-qualified binding PASS enables requests; context is rechecked at invocation.
No other ad vendor is advertised. This transport's real Meta qualification is NOT_RUN.
Human signal ingestion is normalized by `provider.mjs` and never dispatched to people.

Primary API reference: [Meta Marketing API collection](https://www.postman.com/meta/facebook-marketing-api/documentation/0zr4mes/facebook-marketing-api-mapi).
Official field reference: [Meta ad account](https://developers.facebook.com/docs/marketing-api/reference/ad-account).
Checked 2026-10-07. Synthetic transport tests do not prove account/API availability.

Authoritative source: Real Estate eb0a7278188b2f9968e21ed4299f08184d864cac ADR-0026/0027/0029/0030 and docs21/22/24/25.

Paid-media campaign and spend effects owned by Ads. No person-directed messaging; human inquiries route through Communications to Customer Service. Meta is the initial intended adapter; real account qualification remains NOT_RUN.

## Actions

- `ads.campaign.create`
- `ads.campaign.update`
- `ads.campaign.pause`
- `ads.campaign.resume`
- `ads.campaign.archive`
- `ads.targeting.configure`
- `ads.budget.set`
- `ads.conversion.configure`
- `ads.signal.observe`
- `ads.performance.read`
- `ads.effect.reconcile`

## Authority

All calls require authenticated actor/Task, organization/scope/action, current conflict-free source, unexpired unrevoked authority and no hold. Writes require Ads owner/writer and non-self exact approval over command digest and current policy/binding/authority revisions. Host supplies trusted verified context; untrusted inputs cannot self-assert grants. No account/limits/legal policy is invented.

## State and adapter port

Provider returns immutable JSON state; caller persists with atomic CAS against expected revision. Intent is not remote success. UNKNOWN is durably claimed before network dispatch, retained on ambiguous responses/crashes and reconciled only with source/evidence. Cross-store transactions are not claimed. Idempotency is organization/scope/effect ID plus exact digest.

Adapter port requires qualification PASS on exact binding, execute and durable persist methods. Real account/host/credential qualification: NOT_RUN. No external calls occurred. Schema storage is not runtime enforcement; synthetic tests prove deterministic guards only. No backend is selected.
