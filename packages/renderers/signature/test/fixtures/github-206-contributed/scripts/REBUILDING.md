# Rebuilding

All cryptographic objects in this pack were generated with OpenSSL 3.5.x and
`asn1crypto` 1.5.x. No private key is distributed. To regenerate equivalent
fixtures, create a disposable test root, CMS signer certificates, and a TSA
certificate whose only critical EKU is `timeStamping`; then run the command
patterns documented in the repository-level README. Use newly generated keys
and delete them after fixture creation.
