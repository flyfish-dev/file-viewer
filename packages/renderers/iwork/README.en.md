# @file-viewer/renderer-iwork

Offline Apple `.pages/.numbers/.key` renderer for modern IWA and iWork '09 XML/APXL containers. Heavy parsing runs in a module Worker. Animations, transitions, and Numbers formula recalculation are not executed. Embedded Quick Look previews are loading/failure fallbacks and never count as fidelity evidence.

`.pages`, `.numbers`, and `.key` meet the stable high-fidelity code gates. Real '09, 2013+, and current-version fixtures pass structural assertions, real-browser smoke, and fixed-font pixel-diff gates against Apple-native exports. Only the generic IWA fallback is labeled as a limited preview; npm, Release, and production-domain checks remain the authority for public release status.
