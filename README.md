# Family VPN

A shared Windows VPN client that verifies and privately imports a signed personal
pass. Maintained by [Iman Hedeshy](https://github.com/imanhedeshy). This GPL-3.0-or-later
fork retains SagerNet client/core copyright and component license notices.

## Development status

No coordinated installer release is ready. Windows client, engine and native
sharing component compilation passed locally; installer signing and native
install/VPN runtime acceptance remain unfinished. macOS, Android, iPhone and iPad
are part of the coordinated project, but this first public source snapshot covers
Windows only. The other platform sources and verified installers will follow.
Source publication and passing source checks are not a usable VPN release.

The root contains the desktop client with its pinned dashboard vendored; `core/`
contains its Windows-specific sing-box engine. `UPSTREAMS.json` identifies the
exact upstream commits and reviewed input snapshot. `UPSTREAM-README.md` preserves
upstream documentation. No personal passes, production endpoints, VPN credentials,
private keys or local authentication are included. Only the pass verification
public key belongs in this repository.

Users import a separate authenticated `.familyvpn` pass. Required OS consent is
preserved. Reconnect/background/login behavior follows the OS and explicit
Connect/Disconnect choices; signed deadlines are enforced. Runtime acceptance
is still pending. This source does not supply a usable VPN service account.

SignPath Foundation onboarding is being prepared; acceptance/signing are not active.
If accepted, free code signing will be provided by SignPath.io, certificate by
SignPath Foundation, with manual release approval. See [SIGNING.md](SIGNING.md),
[BUILDING.md](BUILDING.md), [PRIVACY.md](PRIVACY.md) and [INSTALLATION.md](INSTALLATION.md).
