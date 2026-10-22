# Code signing policy

Status: SignPath Foundation application preparation; not accepted or operational.
No release in this repository is represented as signed until its actual
signature and matching build provenance have been verified.

Maintainer/author: [imanhedeshy](https://github.com/imanhedeshy).
Proposed signing approver: the same owner. Reviewer roles, MFA status and the
final trusted-build integration must be verified during onboarding. No claim is
made here that account MFA or a SignPath role is already configured.

After acceptance: free code signing provided by SignPath.io, certificate by
SignPath Foundation. Foundation manages its own signing key; no existing Apple
or VPN-provisioning private key is exported. Every production signing request
requires manual release approval. Unreviewed pull requests cannot request signing.

Only generic client binaries built from reviewed public source may be submitted.
Personal pass files, VPN passwords, server administration data, private keys and
authentication files are excluded. Third-party vendor drivers retain their
original signatures. Windows forceCodeSigning remains enabled.
