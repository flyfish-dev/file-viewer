# Angular PPTX Worker regression

This fixture pins Angular 22.0.7 from issue #140. It uses the application builder,
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
