# Angular PPTX Worker regression

This fixture reproduces issue #140 with Angular 22.1.6 and build/CLI 22.1.8. It uses the application builder,
the standard Web component, an Office preset, and `baseHref: /ui/`. There is no
`deployUrl`, application alias, optimizer exclusion, custom Worker factory, or
replacement Worker. The normal asset-copy CLI provides offline resources.

The owning browser verifier installs packed candidates, builds the application,
then opens real PPTX slides in both `ng serve` and the production build. It checks
actual Worker network responses, the complete slide count from the source PPTX,
and the final virtualized slide, not just a computed URL or the first slide.

It additionally withholds the copied manifest from the production static output
to reproduce a broken deployment. The expected result is an explicit error
state with the recovery command, no guessed application-relative Worker URL,
and no unhandled browser error. The manifest is restored even when that check
fails.

## Consumer dependency policy

This application fixture explicitly overrides only the affected tooling paths:
`@angular/build > piscina` uses 5.3.2 and
`@angular/cli > @modelcontextprotocol/sdk` uses 1.31.0. These are same-major
security updates to Angular's exact transitive pins; they still require the
consumer build and browser regressions. The Angular framework and tooling pins
remain unchanged.

The packed-consumer helper preserves these fixture-owned npm overrides. It does
not inherit the repository's pnpm overrides. A clean audit of this application
policy is not evidence that arbitrary downstream installs are clean. Audit the
unmodified cold-consumer graph separately when evaluating library defaults.

Each packed install records separate full and production-only npm audit JSON,
the installed lockfile, and the candidate tarball hashes. Public CI uploads
these as `packed-consumer-security-evidence`. Audit summaries distinguish
affected dependency entries from distinct advisory identities. A build pass
does not imply that either audit is clean.
