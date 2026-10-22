# Build status and source provenance

This tree contains reviewed source snapshots. `UPSTREAMS.json` records the exact
base commits and original snapshot hashes. Generated public-file manifests are
separate from the private task's logs and receipts.

Windows uses Node 26.7.0, pnpm 11.13.0, Go 1.26.8 and the pinned lockfile. Supply
`FAMILYVPN_CORE_DIRECTORY` pointing to this tree's `core/`; the package scripts
verify its manifest. The daemon/client/native component have compiled locally.
The original Microsoft SDK/CRT native module used SDK 10.0.26100 and CRT
14.44.17.14 with task-local Rust 1.99.1/xwin 0.9.0. You must obtain/accept your
own required vendor tools and agreements. No SDK or signing credentials are
redistributed here. The final Windows installer and verifiable public signing
pipeline are still being qualified; `forceCodeSigning` is not disabled.

Apple source requires Xcode and the matching core. macOS universal, iOS device
and arm64 simulator compilation passed locally; live VPN behavior and final
release acceptance remain separate. Apple signing identities/provisioning are
not included. Android requires the SDK/NDK and matching Libbox; its Kotlin/APK
build has not yet run. Its release key is supplied privately using
`FAMILYVPN_KEYSTORE_PATH`; the upstream tracked keystore is intentionally omitted.

The public source-check workflow is not an installer build or a runtime test.
Do not add real pass files or keys to reproduce tests: verifier fixtures create
ephemeral test keys and invented accounts.
