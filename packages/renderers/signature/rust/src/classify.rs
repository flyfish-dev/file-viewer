pub fn armor_type(input: &[u8]) -> Option<&'static str> {
    let head = std::str::from_utf8(&input[..input.len().min(512)])
        .ok()?
        .trim_start();
    if head.starts_with("-----BEGIN PGP MESSAGE-----") {
        Some("message")
    } else if head.starts_with("-----BEGIN PGP SIGNATURE-----") {
        Some("signature")
    } else if head.starts_with("-----BEGIN PGP SIGNED MESSAGE-----") {
        Some("cleartext-signed-message")
    } else if head.starts_with("-----BEGIN PGP PUBLIC KEY BLOCK-----") {
        Some("public-key")
    } else if head.starts_with("-----BEGIN PGP PRIVATE KEY BLOCK-----") {
        Some("private-key")
    } else {
        None
    }
}

pub fn likely_binary_openpgp(input: &[u8]) -> bool {
    input.first().is_some_and(|byte| byte & 0x80 != 0)
}
