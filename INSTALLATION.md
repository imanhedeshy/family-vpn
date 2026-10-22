# Installation and system changes

Development preview: finished coordinated installers are not available yet.
When verified releases are published, use one shared client for your platform
and open your own signed personal pass. Approve the normal OS VPN permissions.

Windows installation registers a separate Family VPN service, private data
locations, file association and its own context-menu entry; first setup enables
login launch and tray/background defaults once. Routing/DNS and any required
vendor driver are changed only through the normal privileged service/OS flow.
macOS and iOS require normal Network Extension/VPN consent. macOS login launch
is subject to OS approval; Android uses its foreground VPN service and permitted
boot recovery. Explicit Disconnect is respected. Sleep/force-stop can suspend
networking; these apps do not bypass OS controls.

Before removal, Disconnect. Use Windows Settings > Apps or the installed
uninstaller; its keep-data choice determines whether private app data is retained.
On macOS quit/remove the app and review its VPN/system-extension/login items in
System Settings. On iOS/Android remove the app and review remaining OS VPN entries.
Never post retained private data to the public repository. Installation,
upgrade/uninstall and reconnect behavior still require platform runtime testing.
