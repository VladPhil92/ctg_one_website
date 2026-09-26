# Nvet Web Legal, Privacy & Account Compliance

**Status:** implementation candidate  
**Scope:** `ctgone.com/nvetcareapp`  
**Commercial launch:** not authorized by this document

## Implemented in this phase

- Nvet-specific Privacy Policy, Terms and Cookie Policy.
- Versioned legal acceptance wired to the canonical Nvet beta consent API.
- Booking fails closed unless the exact backend Terms + Privacy versions are accepted.
- Cookie preference UI with necessary/analytics separation and Nvet analytics opt-in.
- Keyboard/focus hardening inherited from PR #492.
- Web password change for local Nvet identities.
- Password recovery/reset surfaces.
- Authenticated deletion-readiness and account deletion.
- Public outside-the-app account deletion resource at `/nvetcareapp/eliminar-cuenta`.
- Legal and deletion links surfaced from the public CTG One footer and Nvet sign-in.

## Production integrations represented in the privacy disclosure

The production configuration currently includes infrastructure or integration variables for Railway/Postgres/Redis, Cloudinary, SendGrid, Sentry and CTG One/Supabase identity. Payment capabilities must only be described as active when their independent operational gates are closed.

## External gates that remain human/operator evidence

- Responsible legal review of the public Terms and Privacy wording.
- Confirm production mail delivery uses a real provider before relying on password-reset or external-deletion email.
- Confirm provider contracts, retention and international transfer/transmission classification.
- Keep the published legal versions synchronized with the Nvet backend constants.
- Record the public privacy/deletion URLs in the applicable store/compliance consoles before public release.

## Fail-closed rules

- A legal version mismatch blocks booking.
- Account deletion is blocked while the canonical backend reports operational or financial blockers.
- Federated CTG One identities are not offered a fictitious Nvet-local password change.
- Nvet analytics do not emit from Nvet routes without affirmative analytics consent.
