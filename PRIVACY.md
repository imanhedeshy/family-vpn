# Privacy

Personal VPN passes contain private credentials. Share them only with the
intended recipient; never attach one to an issue, build artifact or pull request.
The public source contains a verification public key, not the signing private key.

The clients use pass data to connect to the VPN endpoint selected by the pass.
Network traffic, DNS resolution and optional protocol-specific services follow
that configuration. A VPN operator and contacted services can observe data
according to the protocol and their policies; this app does not promise anonymity.

The Windows integration encrypts its saved pass with Electron safeStorage/DPAPI.
Apple uses private app/group storage; Android uses credential-protected no-backup
storage. Signed expiry and account matching are checked on import and startup.
Private storage does not prevent someone with a copied pass from trying it;
concurrency restrictions are enforced separately by the service operator.

Custom setup disables inherited upstream update checks by default. Users can
change settings; optional upstream network features and external links can
contact their respective providers. No new central account, analytics backend or
pass-upload service is introduced by this fork. Diagnostic logs can contain
network information; inspect and redact them before sharing.

GitHub hosting/Actions, Apple notarization/TestFlight and SignPath onboarding
process generic source, build artifacts or release metadata under their own
policies. Personal pass files are not sent to those services by our release flow.
