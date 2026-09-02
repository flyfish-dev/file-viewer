//! Stable, non-panicking error surface for untrusted CHM input.

use thiserror::Error;

#[derive(Debug, Error)]
pub enum ParseError {
    #[error("not a valid CHM file: {0}")]
    Header(&'static str),
    #[error("malformed CHM directory: {0}")]
    Directory(&'static str),
    #[error("malformed MSCompressed metadata: {0}")]
    Compression(&'static str),
    #[error("LZX stream is malformed: {0}")]
    Lzx(&'static str),
    #[error("entry not found: {0}")]
    NotFound(String),
    #[error("entry uses unsupported storage section {0}")]
    UnsupportedSection(u32),
    #[error("{0}")]
    ResourceLimit(String),
    #[error("integer or range calculation overflow")]
    Overflow,
}

pub type ParseResult<T> = Result<T, ParseError>;

/// Public, stable error surface consumed by the Worker integration.
#[derive(Debug, Error)]
pub enum CoreError {
    #[error("{0}")]
    Format(ParseError),
    #[error("{0}")]
    Limit(String),
    #[error("{0}")]
    UnsafePath(String),
    #[error("archive is disposed")]
    Disposed,
}

impl CoreError {
    #[must_use]
    pub fn code(&self) -> &'static str {
        match self {
            Self::Limit(_) => "CHM_LIMIT_EXCEEDED",
            Self::UnsafePath(_) => "CHM_UNSAFE_PATH",
            Self::Disposed => "CHM_DISPOSED",
            Self::Format(ParseError::NotFound(_)) => "CHM_NOT_FOUND",
            Self::Format(ParseError::Lzx(_)) => "CHM_LZX_ERROR",
            Self::Format(ParseError::Header(_)) => "CHM_BAD_HEADER",
            Self::Format(_) => "CHM_CORRUPT",
        }
    }
}

impl From<ParseError> for CoreError {
    fn from(error: ParseError) -> Self {
        match error {
            ParseError::ResourceLimit(message) => Self::Limit(message),
            error => Self::Format(error),
        }
    }
}

pub type CoreResult<T> = Result<T, CoreError>;
