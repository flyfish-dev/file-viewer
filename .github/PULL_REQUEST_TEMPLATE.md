<!--
Thank you for contributing. Keep the comments: they explain the evidence contract but are ignored by validation.

PR title format: type(scope): concise outcome
Allowed types: feat, fix, perf, refactor, docs, test, build, ci, chore, revert
Example: fix(spreadsheet): preserve WPS embedded image dimensions
-->

## Summary

<!-- Explain the user-visible or engineering outcome in 2-5 focused bullets. -->

-

## Related issue

<!-- Use `Closes #123`, a full issue URL, or `N/A: <specific reason>`. -->

Closes #

## Change classification

<!-- Select exactly one visibility option. Select format behavior when a real file route changes. -->

- [ ] User-visible UI or rendering change
- [ ] Non-visual change
- [ ] File-format or renderer behavior
- [ ] Public API, package, Worker, WASM, or deployment-path change

## Verification

<!-- List commands you actually ran. Use `Pass` only for completed checks; do not paste the whole CI matrix. -->

| Check            | Result   |
| ---------------- | -------- |
| `pnpm <command>` | <result> |
| `pnpm <focused>` | <result> |

## Sample / fixture evidence

<!--
Required for file-format or renderer changes. Provide a public fixture/link, a repository fixture path,
or `Private sample sent to admin@flyfish.dev on YYYY-MM-DD: filename.ext`.
For other changes use `N/A: <specific reason>`.
-->

- N/A:

## Visual evidence

<!--
User-visible UI or rendering changes require at least one screenshot in this section. Matched before/after
images at the same viewport/zoom are preferred. For a non-visual change use `N/A: <specific reason>`.
-->

- Before:
- After:

## Risk and compatibility

<!-- Note affected packages/formats, browser or deployment assumptions, migration needs, and rollback path. -->

- Affected packages/formats:
- Compatibility or migration risk:
- Rollback:

## Checklist

- [ ] I added or updated focused automated coverage, or explained why it is not needed.
- [ ] I updated user-facing documentation or release notes when behavior or API changed, or marked them not applicable.
- [ ] I verified offline/private-deployment paths when changing Worker, WASM, fonts, vendor assets, or URLs.
- [ ] I did not commit secrets, customer files, private samples, generated caches, or unrelated changes.
