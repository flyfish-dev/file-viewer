# iPhone PDF Navigation Regression

This is an Xcode UI test in mobile Safari, not a desktop browser with an iPhone user agent.
It taps Next and Previous through pages 1 -> 2 -> 3 -> 2 -> 1 of the hashed PDF sample.
The assertions check the page counter, actual heading movement into view, and reachable
navigation controls. A changed counter alone is not a pass.

Requirements: macOS, Xcode with an installed iOS Simulator runtime, XcodeGen, and one
booted iPhone. The runner does not erase devices or change existing simulator settings.

```sh
# Production domain; optionally select a specific already-booted iPhone.
IOS_SIMULATOR_UDID=<udid> pnpm verify:issue-243-ios

# Test a locally built and served Demo using the same UI test.
CLOSED_ISSUE_DEMO_URL=http://127.0.0.1:4179 pnpm verify:issue-243-ios
```

Use `XCODEGEN_BINARY` when XcodeGen is not on PATH. Evidence is written under
`output/ios-pdf-navigation/<timestamp>/`: the XCTest result bundle (with screenshots),
the full build/test log, device metadata, and the exact PDF hash. The runner reinstalls
only its own unsigned test runner to avoid stale Simulator test-bundle caching.
