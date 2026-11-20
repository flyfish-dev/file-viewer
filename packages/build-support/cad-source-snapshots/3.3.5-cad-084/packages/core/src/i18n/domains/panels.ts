import type { FileViewerResolvedLocale } from '../locales'

/** Explicit UI copy for signature inspection, binary inspection, and design panels. */
export const FILE_VIEWER_PANEL_MESSAGE_ROWS = {
  'signature.ui.signer.58e1dd': {
    'en-US': 'Signer {p0}',
    'zh-CN': '签名者 {p0}',
    'ja-JP': '署名者 {p0}',
    'de-DE': 'Unterzeichner {p0}',
    'ru-RU': 'Подписант {p0}',
    'zh-TW': '簽名者 {p0}',
    'zh-HK': '簽名者 {p0}'
  },
  'signature.ui.certificate.not.matched.4e6a84': {
    'en-US': 'certificate not matched',
    'zh-CN': '未匹配证书',
    'ja-JP': '対応する証明書なし',
    'de-DE': 'Kein passendes Zertifikat',
    'ru-RU': 'Сертификат не сопоставлен',
    'zh-TW': '未匹配證書',
    'zh-HK': '未匹配證書'
  },
  'signature.ui.certificate.6ca9e8': {
    'en-US': 'certificate {p0}',
    'zh-CN': '证书 {p0}',
    'ja-JP': '証明書 {p0}',
    'de-DE': 'Zertifikat {p0}',
    'ru-RU': 'сертификат {p0}',
    'zh-TW': '證書 {p0}',
    'zh-HK': '證書 {p0}'
  },
  'signature.ui.signature.2f32be': {
    'en-US': 'Signature',
    'zh-CN': '签名',
    'ja-JP': '署名',
    'de-DE': 'Signatur',
    'ru-RU': 'Подпись',
    'zh-TW': '簽名',
    'zh-HK': '簽名'
  },
  'signature.ui.not.verified.c75397': {
    'en-US': 'not verified',
    'zh-CN': '未验证',
    'ja-JP': '未検証',
    'de-DE': 'Nicht geprüft',
    'ru-RU': 'не проверено',
    'zh-TW': '未驗證',
    'zh-HK': '未驗證'
  },
  'signature.ui.content.digest.a3ab15': {
    'en-US': 'Content digest',
    'zh-CN': '内容摘要',
    'ja-JP': '内容のダイジェスト',
    'de-DE': 'Inhaltsprüfsumme',
    'ru-RU': 'Хеш содержимого',
    'zh-TW': '內容摘要',
    'zh-HK': '內容摘要'
  },
  'signature.ui.original.required.95cf87': {
    'en-US': 'original required',
    'zh-CN': '需要原始文件',
    'ja-JP': '元のファイルが必要',
    'de-DE': 'Original erforderlich',
    'ru-RU': 'требуется исходный файл',
    'zh-TW': '需要原始檔案',
    'zh-HK': '需要原始檔案'
  },
  'signature.ui.signer.identifier.6aa443': {
    'en-US': 'Signer identifier',
    'zh-CN': '签名者标识',
    'ja-JP': '署名者識別子',
    'de-DE': 'Kennung des Unterzeichners',
    'ru-RU': 'Идентификатор подписанта',
    'zh-TW': '簽名者標識',
    'zh-HK': '簽名者標識'
  },
  'signature.ui.digest.algorithm.5b4cb2': {
    'en-US': 'Digest algorithm',
    'zh-CN': '摘要算法',
    'ja-JP': 'ダイジェストアルゴリズム',
    'de-DE': 'Digest-Algorithmus',
    'ru-RU': 'Алгоритм хеширования',
    'zh-TW': '摘要算法',
    'zh-HK': '摘要算法'
  },
  'signature.ui.signature.algorithm.601824': {
    'en-US': 'Signature algorithm',
    'zh-CN': '签名算法',
    'ja-JP': '署名アルゴリズム',
    'de-DE': 'Signaturalgorithmus',
    'ru-RU': 'Алгоритм подписи',
    'zh-TW': '簽名算法',
    'zh-HK': '簽名算法'
  },
  'signature.ui.signing.time.f74d88': {
    'en-US': 'Signing time',
    'zh-CN': '签名时间',
    'ja-JP': '署名日時',
    'de-DE': 'Signaturzeit',
    'ru-RU': 'Время подписания',
    'zh-TW': '簽名時間',
    'zh-HK': '簽名時間'
  },
  'signature.ui.signed.content.type.c0f982': {
    'en-US': 'Signed content type',
    'zh-CN': '已签名内容类型',
    'ja-JP': '署名対象のコンテンツタイプ',
    'de-DE': 'Signierter Inhaltstyp',
    'ru-RU': 'Тип подписанного содержимого',
    'zh-TW': '已簽名內容類型',
    'zh-HK': '已簽名內容類型'
  },
  'signature.ui.signed.message.digest.84d8d2': {
    'en-US': 'Signed message digest',
    'zh-CN': '已签名消息摘要',
    'ja-JP': '署名済みメッセージダイジェスト',
    'de-DE': 'Signierte Nachrichtenprüfsumme',
    'ru-RU': 'Подписанный хеш сообщения',
    'zh-TW': '已簽名消息摘要',
    'zh-HK': '已簽名消息摘要'
  },
  'signature.ui.cades.signingcertificatev2.125f12': {
    'en-US': 'CAdES signingCertificateV2',
    'zh-CN': 'CAdES signingCertificateV2',
    'ja-JP': 'CAdES signingCertificateV2',
    'de-DE': 'CAdES signingCertificateV2',
    'ru-RU': 'CAdES signingCertificateV2',
    'zh-TW': 'CAdES signingCertificateV2',
    'zh-HK': 'CAdES signingCertificateV2'
  },
  'signature.ui.present.4e9f7a': {
    'en-US': 'Present',
    'zh-CN': '存在',
    'ja-JP': 'あり',
    'de-DE': 'Vorhanden',
    'ru-RU': 'Присутствует',
    'zh-TW': '存在',
    'zh-HK': '存在'
  },
  'signature.ui.not.detected.a5cb42': {
    'en-US': 'Not detected',
    'zh-CN': '未检测到',
    'ja-JP': '未検出',
    'de-DE': 'Nicht erkannt',
    'ru-RU': 'Не обнаружено',
    'zh-TW': '未檢測到',
    'zh-HK': '未檢測到'
  },
  'signature.ui.signature.timestamp.tokens.1b9092': {
    'en-US': 'Signature timestamp tokens',
    'zh-CN': '签名时间戳令牌',
    'ja-JP': '署名タイムスタンプトークン',
    'de-DE': 'Signaturzeitstempel-Token',
    'ru-RU': 'Токены метки времени подписи',
    'zh-TW': '簽名時間戳令牌',
    'zh-HK': '簽名時間戳令牌'
  },
  'signature.ui.verification.note.a5d1f9': {
    'en-US': 'Verification note',
    'zh-CN': '验证说明',
    'ja-JP': '検証メモ',
    'de-DE': 'Prüfhinweis',
    'ru-RU': 'Примечание проверки',
    'zh-TW': '驗證說明',
    'zh-HK': '驗證說明'
  },
  'signature.ui.certificate.042c9a': {
    'en-US': 'Certificate {p0}',
    'zh-CN': '证书 {p0}',
    'ja-JP': '証明書 {p0}',
    'de-DE': 'Zertifikat {p0}',
    'ru-RU': 'Сертификат {p0}',
    'zh-TW': '證書 {p0}',
    'zh-HK': '證書 {p0}'
  },
  'signature.ui.subject.8d183d': {
    'en-US': 'Subject',
    'zh-CN': '主体',
    'ja-JP': 'サブジェクト',
    'de-DE': 'Inhaber',
    'ru-RU': 'Субъект',
    'zh-TW': '主體',
    'zh-HK': '主體'
  },
  'signature.ui.issuer.2587e4': {
    'en-US': 'Issuer',
    'zh-CN': '颁发者',
    'ja-JP': '発行者',
    'de-DE': 'Aussteller',
    'ru-RU': 'Издатель',
    'zh-TW': '頒發者',
    'zh-HK': '頒發者'
  },
  'signature.ui.serial.number.a5349d': {
    'en-US': 'Serial number',
    'zh-CN': '序列号',
    'ja-JP': 'シリアル番号',
    'de-DE': 'Seriennummer',
    'ru-RU': 'Серийный номер',
    'zh-TW': '序列號',
    'zh-HK': '序列號'
  },
  'signature.ui.valid.from.160fde': {
    'en-US': 'Valid from',
    'zh-CN': '有效期起始',
    'ja-JP': '有効期間の開始',
    'de-DE': 'Gültig ab',
    'ru-RU': 'Действует с',
    'zh-TW': '有效期起始',
    'zh-HK': '有效期起始'
  },
  'signature.ui.valid.until.c8214d': {
    'en-US': 'Valid until',
    'zh-CN': '有效期结束',
    'ja-JP': '有効期間の終了',
    'de-DE': 'Gültig bis',
    'ru-RU': 'Действует до',
    'zh-TW': '有效期結束',
    'zh-HK': '有效期結束'
  },
  'signature.ui.public.key.affb45': {
    'en-US': 'Public key',
    'zh-CN': '公钥',
    'ja-JP': '公開鍵',
    'de-DE': 'Öffentlicher Schlüssel',
    'ru-RU': 'Открытый ключ',
    'zh-TW': '公鑰',
    'zh-HK': '公鑰'
  },
  'signature.ui.public.key.curve.d05166': {
    'en-US': 'Public key curve',
    'zh-CN': '公钥曲线',
    'ja-JP': '公開鍵の曲線',
    'de-DE': 'Kurve des öffentlichen Schlüssels',
    'ru-RU': 'Кривая открытого ключа',
    'zh-TW': '公鑰曲線',
    'zh-HK': '公鑰曲線'
  },
  'signature.ui.certificate.signature.974399': {
    'en-US': 'Certificate signature',
    'zh-CN': '证书签名',
    'ja-JP': '証明書の署名',
    'de-DE': 'Zertifikatssignatur',
    'ru-RU': 'Подпись сертификата',
    'zh-TW': '證書簽名',
    'zh-HK': '證書簽名'
  },
  'signature.ui.subject.key.identifier.71af2c': {
    'en-US': 'Subject key identifier',
    'zh-CN': '主体密钥标识',
    'ja-JP': 'サブジェクト鍵識別子',
    'de-DE': 'Schlüsselkennung des Inhabers',
    'ru-RU': 'Идентификатор ключа субъекта',
    'zh-TW': '主體密鑰標識',
    'zh-HK': '主體密鑰標識'
  },
  'signature.ui.sha.256.fingerprint.b98c7c': {
    'en-US': 'SHA-256 fingerprint',
    'zh-CN': 'SHA-256 指纹',
    'ja-JP': 'SHA-256 フィンガープリント',
    'de-DE': 'SHA-256-Fingerabdruck',
    'ru-RU': 'Отпечаток SHA-256',
    'zh-TW': 'SHA-256 指紋',
    'zh-HK': 'SHA-256 指紋'
  },
  'signature.ui.rfc.3161.timestamp.58248c': {
    'en-US': 'RFC 3161 timestamp',
    'zh-CN': 'RFC 3161 时间戳',
    'ja-JP': 'RFC 3161 タイムスタンプ',
    'de-DE': 'RFC-3161-Zeitstempel',
    'ru-RU': 'Метка времени RFC 3161',
    'zh-TW': 'RFC 3161 時間戳',
    'zh-HK': 'RFC 3161 時間戳'
  },
  'signature.ui.message.imprint.5addc3': {
    'en-US': 'Message imprint',
    'zh-CN': '消息印记',
    'ja-JP': 'メッセージインプリント',
    'de-DE': 'Nachrichtenabdruck',
    'ru-RU': 'Отпечаток сообщения',
    'zh-TW': '消息印記',
    'zh-HK': '消息印記'
  },
  'signature.ui.policy.oid.3ad507': {
    'en-US': 'Policy OID',
    'zh-CN': '策略 OID',
    'ja-JP': 'ポリシー OID',
    'de-DE': 'Richtlinien-OID',
    'ru-RU': 'OID политики',
    'zh-TW': '策略 OID',
    'zh-HK': '策略 OID'
  },
  'signature.ui.generation.time.8a9b2b': {
    'en-US': 'Generation time',
    'zh-CN': '生成时间',
    'ja-JP': '生成日時',
    'de-DE': 'Erstellungszeitpunkt',
    'ru-RU': 'Время создания',
    'zh-TW': '生成時間',
    'zh-HK': '生成時間'
  },
  'signature.ui.message.imprint.algorithm.5c1dbc': {
    'en-US': 'Message imprint algorithm',
    'zh-CN': '消息印记算法',
    'ja-JP': 'メッセージインプリントのアルゴリズム',
    'de-DE': 'Algorithmus des Nachrichtenabdrucks',
    'ru-RU': 'Алгоритм отпечатка сообщения',
    'zh-TW': '消息印記算法',
    'zh-HK': '消息印記算法'
  },
  'signature.ui.nonce.3aed2d': {
    'en-US': 'Nonce',
    'zh-CN': '随机数',
    'ja-JP': 'ノンス',
    'de-DE': 'Nonce',
    'ru-RU': 'Одноразовое значение',
    'zh-TW': '隨機數',
    'zh-HK': '隨機數'
  },
  'signature.ui.tsa.certificate.requested.1ba199': {
    'en-US': 'TSA certificate requested',
    'zh-CN': '请求 TSA 证书',
    'ja-JP': 'TSA 証明書の要求',
    'de-DE': 'TSA-Zertifikat angefordert',
    'ru-RU': 'Запрошен сертификат TSA',
    'zh-TW': '請求 TSA 證書',
    'zh-HK': '請求 TSA 證書'
  },
  'signature.ui.yes.5397e0': {
    'en-US': 'Yes',
    'zh-CN': '是',
    'ja-JP': 'はい',
    'de-DE': 'Ja',
    'ru-RU': 'Да',
    'zh-TW': '是',
    'zh-HK': '是'
  },
  'signature.ui.no.816c52': {
    'en-US': 'No',
    'zh-CN': '否',
    'ja-JP': 'いいえ',
    'de-DE': 'Nein',
    'ru-RU': 'Нет',
    'zh-TW': '否',
    'zh-HK': '否'
  },
  'signature.ui.ordering.d3ed86': {
    'en-US': 'Ordering',
    'zh-CN': '排序标志',
    'ja-JP': '順序保証フラグ',
    'de-DE': 'Reihenfolgekennzeichen',
    'ru-RU': 'Признак упорядочения',
    'zh-TW': '排序標誌',
    'zh-HK': '排序標誌'
  },
  'signature.ui.accuracy.12a3a4': {
    'en-US': 'Accuracy',
    'zh-CN': '精度',
    'ja-JP': '精度',
    'de-DE': 'Genauigkeit',
    'ru-RU': 'Точность',
    'zh-TW': '精度',
    'zh-HK': '精度'
  },
  'signature.ui.timestamp.authority.bc3c7b': {
    'en-US': 'Timestamp authority',
    'zh-CN': '时间戳机构',
    'ja-JP': 'タイムスタンプ局',
    'de-DE': 'Zeitstempelstelle',
    'ru-RU': 'Служба меток времени',
    'zh-TW': '時間戳機構',
    'zh-HK': '時間戳機構'
  },
  'signature.ui.key.id.unavailable.386d2a': {
    'en-US': 'key id unavailable',
    'zh-CN': '密钥 ID 不可用',
    'ja-JP': '鍵 ID を取得できません',
    'de-DE': 'Schlüssel-ID nicht verfügbar',
    'ru-RU': 'ID ключа недоступен',
    'zh-TW': '密鑰 ID 不可用',
    'zh-HK': '密鑰 ID 不可用'
  },
  'signature.ui.fingerprint.fed4c9': {
    'en-US': 'Fingerprint',
    'zh-CN': '指纹',
    'ja-JP': 'フィンガープリント',
    'de-DE': 'Fingerabdruck',
    'ru-RU': 'Отпечаток',
    'zh-TW': '指紋',
    'zh-HK': '指紋'
  },
  'signature.ui.algorithm.02f024': {
    'en-US': 'Algorithm',
    'zh-CN': '算法',
    'ja-JP': 'アルゴリズム',
    'de-DE': 'Algorithmus',
    'ru-RU': 'Алгоритм',
    'zh-TW': '算法',
    'zh-HK': '算法'
  },
  'signature.ui.created.accf40': {
    'en-US': 'Created',
    'zh-CN': '创建时间',
    'ja-JP': '作成日時',
    'de-DE': 'Erstellt',
    'ru-RU': 'Создано',
    'zh-TW': '創建時間',
    'zh-HK': '創建時間'
  },
  'signature.ui.user.ids.250639': {
    'en-US': 'User IDs',
    'zh-CN': '用户 ID',
    'ja-JP': 'ユーザー ID',
    'de-DE': 'Benutzerkennungen',
    'ru-RU': 'ID пользователей',
    'zh-TW': '使用者 ID',
    'zh-HK': '用戶 ID'
  },
  'signature.ui.subkeys.d35a7c': {
    'en-US': 'Subkeys',
    'zh-CN': '子密钥',
    'ja-JP': '副鍵',
    'de-DE': 'Unterschlüssel',
    'ru-RU': 'Подключи',
    'zh-TW': '子密鑰',
    'zh-HK': '子密鑰'
  },
  'signature.ui.only.public.metadata.is.exposed.secret.cc9299': {
    'en-US':
      'Only public metadata is exposed. Secret MPIs, private scalars and passphrases never cross the WASM boundary.',
    'zh-CN': '仅展示公开元数据。秘密 MPI、私有标量和口令不会跨越 WASM 边界。',
    'ja-JP':
      '公開メタデータのみ表示します。秘密 MPI、秘密スカラー、パスフレーズは WASM の境界を越えません。',
    'de-DE':
      'Es werden nur öffentliche Metadaten angezeigt. Geheime MPI-Werte, private Skalare und Passphrasen verlassen die WASM-Grenze nicht.',
    'ru-RU':
      'Показаны только открытые метаданные. Секретные MPI, закрытые скаляры и парольные фразы не выходят за границу WASM.',
    'zh-TW': '僅展示公開中繼資料。秘密 MPI、私有標量和口令不會跨越 WASM 邊界。',
    'zh-HK': '僅展示公開元數據。秘密 MPI、私有標量和口令不會跨越 WASM 邊界。'
  },
  'signature.ui.signature.9556e5': {
    'en-US': 'Signature {p0}',
    'zh-CN': '签名 {p0}',
    'ja-JP': '署名 {p0}',
    'de-DE': 'Signatur {p0}',
    'ru-RU': 'Подпись {p0}',
    'zh-TW': '簽名 {p0}',
    'zh-HK': '簽名 {p0}'
  },
  'signature.ui.openpgp.05835a': {
    'en-US': 'OpenPGP',
    'zh-CN': 'OpenPGP',
    'ja-JP': 'OpenPGP',
    'de-DE': 'OpenPGP',
    'ru-RU': 'OpenPGP',
    'zh-TW': 'OpenPGP',
    'zh-HK': 'OpenPGP'
  },
  'signature.ui.cryptographic.signature.c5cee8': {
    'en-US': 'Cryptographic signature',
    'zh-CN': '密码学签名',
    'ja-JP': '暗号学的署名',
    'de-DE': 'Kryptografische Signatur',
    'ru-RU': 'Криптографическая подпись',
    'zh-TW': '密碼學簽名',
    'zh-HK': '密碼學簽名'
  },
  'signature.ui.public.key.or.original.required.204142': {
    'en-US': 'public key or original required',
    'zh-CN': '需要公钥或原始文件',
    'ja-JP': '公開鍵または元のファイルが必要',
    'de-DE': 'Öffentlicher Schlüssel oder Original erforderlich',
    'ru-RU': 'требуется открытый ключ или исходный файл',
    'zh-TW': '需要公鑰或原始檔案',
    'zh-HK': '需要公鑰或原始檔案'
  },
  'signature.ui.hash.algorithm.917ccc': {
    'en-US': 'Hash algorithm',
    'zh-CN': '哈希算法',
    'ja-JP': 'ハッシュアルゴリズム',
    'de-DE': 'Hashalgorithmus',
    'ru-RU': 'Алгоритм хеширования',
    'zh-TW': '哈希算法',
    'zh-HK': '哈希算法'
  },
  'signature.ui.public.key.algorithm.69be1d': {
    'en-US': 'Public-key algorithm',
    'zh-CN': '公钥算法',
    'ja-JP': '公開鍵アルゴリズム',
    'de-DE': 'Public-Key-Algorithmus',
    'ru-RU': 'Алгоритм открытого ключа',
    'zh-TW': '公鑰算法',
    'zh-HK': '公鑰算法'
  },
  'signature.ui.expires.a99be3': {
    'en-US': 'Expires',
    'zh-CN': '到期时间',
    'ja-JP': '有効期限',
    'de-DE': 'Läuft ab',
    'ru-RU': 'Истекает',
    'zh-TW': '到期時間',
    'zh-HK': '到期時間'
  },
  'signature.ui.issuer.key.ids.14896c': {
    'en-US': 'Issuer key IDs',
    'zh-CN': '颁发者密钥 ID',
    'ja-JP': '発行者の鍵 ID',
    'de-DE': 'Schlüsselkennungen des Ausstellers',
    'ru-RU': 'ID ключей издателя',
    'zh-TW': '頒發者密鑰 ID',
    'zh-HK': '頒發者密鑰 ID'
  },
  'signature.ui.issuer.fingerprints.5cc1ef': {
    'en-US': 'Issuer fingerprints',
    'zh-CN': '颁发者指纹',
    'ja-JP': '発行者のフィンガープリント',
    'de-DE': 'Fingerabdrücke des Ausstellers',
    'ru-RU': 'Отпечатки издателя',
    'zh-TW': '頒發者指紋',
    'zh-HK': '頒發者指紋'
  },
  'signature.ui.verification.key.fingerprint.603ea8': {
    'en-US': 'Verification key fingerprint',
    'zh-CN': '验证密钥指纹',
    'ja-JP': '検証鍵のフィンガープリント',
    'de-DE': 'Fingerabdruck des Prüfschlüssels',
    'ru-RU': 'Отпечаток ключа проверки',
    'zh-TW': '驗證密鑰指紋',
    'zh-HK': '驗證密鑰指紋'
  },
  'signature.ui.verification.key.id.5513a9': {
    'en-US': 'Verification key ID',
    'zh-CN': '验证密钥 ID',
    'ja-JP': '検証鍵の ID',
    'de-DE': 'Kennung des Prüfschlüssels',
    'ru-RU': 'ID ключа проверки',
    'zh-TW': '驗證密鑰 ID',
    'zh-HK': '驗證密鑰 ID'
  },
  'signature.ui.inspecting.signature.and.timestamp.structures.locally.7ce0cc': {
    'en-US': 'Inspecting signature and timestamp structures locally…',
    'zh-CN': '正在本地检查签名和时间戳结构…',
    'ja-JP': '署名とタイムスタンプの構造をローカルで確認しています…',
    'de-DE': 'Signatur- und Zeitstempelstrukturen werden lokal geprüft…',
    'ru-RU': 'Локальная проверка структур подписей и меток времени…',
    'zh-TW': '正在本機檢查簽名和時間戳結構…',
    'zh-HK': '正在本機檢查簽名和時間戳結構…'
  },
  'signature.ui.parsed.metadata.only.f0ba09': {
    'en-US': 'Parsed metadata only',
    'zh-CN': '仅解析了元数据',
    'ja-JP': 'メタデータのみ解析済み',
    'de-DE': 'Nur Metadaten verarbeitet',
    'ru-RU': 'Обработаны только метаданные',
    'zh-TW': '僅解析了中繼資料',
    'zh-HK': '僅解析了元數據'
  },
  'signature.ui.cryptographic.signature.valid.93aead': {
    'en-US': 'Cryptographic signature valid',
    'zh-CN': '密码学签名有效',
    'ja-JP': '暗号学的署名は有効',
    'de-DE': 'Kryptografische Signatur gültig',
    'ru-RU': 'Криптографическая подпись действительна',
    'zh-TW': '密碼學簽名有效',
    'zh-HK': '密碼學簽名有效'
  },
  'signature.ui.cryptographic.signature.invalid.b99f60': {
    'en-US': 'Cryptographic signature invalid',
    'zh-CN': '密码学签名无效',
    'ja-JP': '暗号学的署名は無効',
    'de-DE': 'Kryptografische Signatur ungültig',
    'ru-RU': 'Криптографическая подпись недействительна',
    'zh-TW': '密碼學簽名無效',
    'zh-HK': '密碼學簽名無效'
  },
  'signature.ui.original.document.mapping.required.5578a3': {
    'en-US': 'Original document mapping required',
    'zh-CN': '需要匹配原始文档',
    'ja-JP': '元の文書の対応付けが必要',
    'de-DE': 'Zuordnung des Originaldokuments erforderlich',
    'ru-RU': 'Требуется сопоставление исходного документа',
    'zh-TW': '需要匹配原始文件',
    'zh-HK': '需要匹配原始文件'
  },
  'signature.ui.signature.not.checked.98ef0a': {
    'en-US': 'Signature not checked',
    'zh-CN': '未检查签名',
    'ja-JP': '署名は未確認',
    'de-DE': 'Signatur nicht geprüft',
    'ru-RU': 'Подпись не проверена',
    'zh-TW': '未檢查簽名',
    'zh-HK': '未檢查簽名'
  },
  'signature.ui.timestamp.structure.parsed.b32961': {
    'en-US': 'Timestamp structure parsed',
    'zh-CN': '已解析时间戳结构',
    'ja-JP': 'タイムスタンプ構造を解析済み',
    'de-DE': 'Zeitstempelstruktur verarbeitet',
    'ru-RU': 'Структура метки времени обработана',
    'zh-TW': '已解析時間戳結構',
    'zh-HK': '已解析時間戳結構'
  },
  'signature.ui.archive.timestamp.s.parsed.f400f9': {
    'en-US': 'Parsed archive timestamps: {p0}',
    'zh-CN': '已解析的归档时间戳：{p0}',
    'ja-JP': '解析済みアーカイブタイムスタンプ：{p0}',
    'de-DE': 'Verarbeitete Archivzeitstempel: {p0}',
    'ru-RU': 'Обработано архивных меток времени: {p0}',
    'zh-TW': '已解析的歸檔時間戳：{p0}',
    'zh-HK': '已解析的歸檔時間戳：{p0}'
  },
  'signature.ui.jws.signature.invalid.d3137a': {
    'en-US': 'JWS signature invalid',
    'zh-CN': 'JWS 签名无效',
    'ja-JP': 'JWS 署名は無効',
    'de-DE': 'JWS-Signatur ungültig',
    'ru-RU': 'Подпись JWS недействительна',
    'zh-TW': 'JWS 簽名無效',
    'zh-HK': 'JWS 簽名無效'
  },
  'signature.ui.jws.signatures.valid.45d54e': {
    'en-US': 'JWS signatures valid',
    'zh-CN': 'JWS 签名有效',
    'ja-JP': 'JWS 署名は有効',
    'de-DE': 'JWS-Signaturen gültig',
    'ru-RU': 'Подписи JWS действительны',
    'zh-TW': 'JWS 簽名有效',
    'zh-HK': 'JWS 簽名有效'
  },
  'signature.ui.jws.parsed.verification.key.or.payload.fd738a': {
    'en-US': 'JWS parsed; verification key or payload required',
    'zh-CN': '已解析 JWS；需要验证密钥或载荷',
    'ja-JP': 'JWS を解析済み。検証鍵またはペイロードが必要',
    'de-DE': 'JWS verarbeitet; Prüfschlüssel oder Nutzdaten erforderlich',
    'ru-RU': 'JWS обработан; требуется ключ проверки или полезная нагрузка',
    'zh-TW': '已解析 JWS；需要驗證密鑰或載荷',
    'zh-HK': '已解析 JWS；需要驗證密鑰或載荷'
  },
  'signature.ui.xml.signature.metadata.references.document.s.50933a': {
    'en-US': 'XML signature metadata references {p0} document(s)',
    'zh-CN': 'XML 签名元数据引用的文档数：{p0}',
    'ja-JP': 'XML 署名メタデータの参照文書数：{p0}',
    'de-DE': 'In XML-Signaturmetadaten referenzierte Dokumente: {p0}',
    'ru-RU': 'Документов в ссылках метаданных XML-подписи: {p0}',
    'zh-TW': 'XML 簽名中繼資料引用的文件數：{p0}',
    'zh-HK': 'XML 簽名元數據引用的文件數：{p0}'
  },
  'signature.ui.xml.signature.metadata.parsed.canonicalization.not.b71f6e': {
    'en-US': 'XML signature metadata parsed; canonicalization not verified',
    'zh-CN': '已解析 XML 签名元数据；未验证规范化过程',
    'ja-JP': 'XML 署名メタデータを解析済み。正規化は未検証',
    'de-DE': 'XML-Signaturmetadaten verarbeitet; Kanonisierung nicht geprüft',
    'ru-RU': 'Метаданные XML-подписи обработаны; канонизация не проверена',
    'zh-TW': '已解析 XML 簽名中繼資料；未驗證規範化過程',
    'zh-HK': '已解析 XML 簽名元數據；未驗證規範化過程'
  },
  'signature.ui.inspection.failed.1fb1d0': {
    'en-US': 'Inspection failed: {p0}',
    'zh-CN': '检查失败：{p0}',
    'ja-JP': '検査に失敗しました：{p0}',
    'de-DE': 'Prüfung fehlgeschlagen: {p0}',
    'ru-RU': 'Ошибка проверки: {p0}',
    'zh-TW': '檢查失敗：{p0}',
    'zh-HK': '檢查失敗：{p0}'
  },
  'signature.ui.associated.signature.container.0599c5': {
    'en-US': 'ASSOCIATED SIGNATURE CONTAINER',
    'zh-CN': '关联签名容器',
    'ja-JP': '関連署名コンテナー',
    'de-DE': 'Zugehöriger Signaturcontainer',
    'ru-RU': 'Контейнер связанных подписей',
    'zh-TW': '關聯簽名容器',
    'zh-HK': '關聯簽名容器'
  },
  'signature.ui.opt.in.bounded.zip.worker.6a02c6': {
    'en-US': 'OPT-IN · BOUNDED ZIP WORKER',
    'zh-CN': '按需启用 · 有界 ZIP Worker',
    'ja-JP': '明示的に有効化 · 制限付き ZIP Worker',
    'de-DE': 'Optional · begrenzter ZIP-Worker',
    'ru-RU': 'По выбору · ZIP Worker с ограничениями',
    'zh-TW': '按需啓用 · 有界 ZIP Worker',
    'zh-HK': '按需啓用 · 有界 ZIP Worker'
  },
  'signature.ui.asic.package.edd529': {
    'en-US': 'ASiC package',
    'zh-CN': 'ASiC 包',
    'ja-JP': 'ASiC パッケージ',
    'de-DE': 'ASiC-Paket',
    'ru-RU': 'Пакет ASiC',
    'zh-TW': 'ASiC 包',
    'zh-HK': 'ASiC 包'
  },
  'signature.ui.type.3deb74': {
    'en-US': 'Type',
    'zh-CN': '类型',
    'ja-JP': '種類',
    'de-DE': 'Typ',
    'ru-RU': 'Тип',
    'zh-TW': '類型',
    'zh-HK': '類型'
  },
  'signature.ui.source.size.b608b7': {
    'en-US': 'Source size',
    'zh-CN': '原始大小',
    'ja-JP': '元のサイズ',
    'de-DE': 'Originalgröße',
    'ru-RU': 'Исходный размер',
    'zh-TW': '原始大小',
    'zh-HK': '原始大小'
  },
  'signature.ui.inflated.total.e12e1a': {
    'en-US': 'Inflated total',
    'zh-CN': '解压后总大小',
    'ja-JP': '展開後の合計サイズ',
    'de-DE': 'Entpackte Gesamtgröße',
    'ru-RU': 'Общий размер после распаковки',
    'zh-TW': '解壓後總大小',
    'zh-HK': '解壓後總大小'
  },
  'signature.ui.documents.687c82': {
    'en-US': 'Documents',
    'zh-CN': '文档',
    'ja-JP': '文書',
    'de-DE': 'Dokumente',
    'ru-RU': 'Документы',
    'zh-TW': '文件',
    'zh-HK': '文件'
  },
  'signature.ui.signature.evidence.members.cb5f36': {
    'en-US': 'Signature/evidence members',
    'zh-CN': '签名／证据条目',
    'ja-JP': '署名・証拠の項目',
    'de-DE': 'Signatur-/Beweiseinträge',
    'ru-RU': 'Элементы подписей и доказательств',
    'zh-TW': '簽名／證據條目',
    'zh-HK': '簽名／證據條目'
  },
  'signature.ui.security.and.validation.boundaries.de6c50': {
    'en-US': 'Security and validation boundaries',
    'zh-CN': '安全与验证边界',
    'ja-JP': '安全性と検証の範囲',
    'de-DE': 'Sicherheits- und Prüfgrenzen',
    'ru-RU': 'Границы безопасности и проверки',
    'zh-TW': '安全與驗證邊界',
    'zh-HK': '安全與驗證邊界'
  },
  'signature.ui.signatures.and.evidence.10d85e': {
    'en-US': 'Signatures and evidence',
    'zh-CN': '签名与证据',
    'ja-JP': '署名と証拠',
    'de-DE': 'Signaturen und Beweise',
    'ru-RU': 'Подписи и доказательства',
    'zh-TW': '簽名與證據',
    'zh-HK': '簽名與證據'
  },
  'signature.ui.result.5faa59': {
    'en-US': 'Result',
    'zh-CN': '结果',
    'ja-JP': '結果',
    'de-DE': 'Ergebnis',
    'ru-RU': 'Результат',
    'zh-TW': '結果',
    'zh-HK': '結果'
  },
  'signature.ui.matched.document.0f3134': {
    'en-US': 'Matched document',
    'zh-CN': '匹配的文档',
    'ja-JP': '対応する文書',
    'de-DE': 'Zugeordnetes Dokument',
    'ru-RU': 'Сопоставленный документ',
    'zh-TW': '匹配的文件',
    'zh-HK': '匹配的文件'
  },
  'signature.ui.contained.document.preview.610ff8': {
    'en-US': 'Contained document preview',
    'zh-CN': '容器内文档预览',
    'ja-JP': '格納された文書のプレビュー',
    'de-DE': 'Vorschau enthaltener Dokumente',
    'ru-RU': 'Предпросмотр документов контейнера',
    'zh-TW': '容器內文件預覽',
    'zh-HK': '容器內文件預覽'
  },
  'signature.ui.contained.documents.1a4aed': {
    'en-US': 'Contained documents',
    'zh-CN': '容器内文档',
    'ja-JP': '格納された文書',
    'de-DE': 'Enthaltene Dokumente',
    'ru-RU': 'Документы контейнера',
    'zh-TW': '容器內文件',
    'zh-HK': '容器內文件'
  },
  'signature.ui.contained.document.d10a62': {
    'en-US': 'Contained document · {p0}',
    'zh-CN': '容器内文档 · {p0}',
    'ja-JP': '格納された文書 · {p0}',
    'de-DE': 'Enthaltenes Dokument · {p0}',
    'ru-RU': 'Документ контейнера · {p0}',
    'zh-TW': '容器內文件 · {p0}',
    'zh-HK': '容器內文件 · {p0}'
  },
  'signature.ui.this.contained.document.exceeds.the.configured.c1719c': {
    'en-US': 'This contained document exceeds the configured nested-preview boundary.',
    'zh-CN': '此文档超过配置的嵌套预览限制。',
    'ja-JP': 'この文書は設定された入れ子プレビューの上限を超えています。',
    'de-DE':
      'Dieses Dokument überschreitet die konfigurierte Grenze für verschachtelte Vorschauen.',
    'ru-RU': 'Документ превышает настроенный предел вложенного предпросмотра.',
    'zh-TW': '此文件超過配置的嵌套預覽限制。',
    'zh-HK': '此文件超過配置的嵌套預覽限制。'
  },
  'signature.ui.no.compatible.nested.renderer.is.installed.2c9897': {
    'en-US': 'No compatible nested renderer is installed for this contained document.',
    'zh-CN': '未安装适用于此文档的嵌套预览模块。',
    'ja-JP': 'この文書に対応する入れ子プレビューモジュールがありません。',
    'de-DE': 'Für dieses Dokument ist kein passender verschachtelter Renderer installiert.',
    'ru-RU': 'Совместимый модуль вложенного предпросмотра для этого документа не установлен.',
    'zh-TW': '未安裝適用於此文件的嵌套預覽模組。',
    'zh-HK': '未安裝適用於此文件的嵌套預覽模組。'
  },
  'signature.ui.no.contained.document.was.found.56328c': {
    'en-US': 'No contained document was found.',
    'zh-CN': '容器内未找到文档。',
    'ja-JP': '格納された文書が見つかりません。',
    'de-DE': 'Kein enthaltenes Dokument gefunden.',
    'ru-RU': 'Документы в контейнере не найдены.',
    'zh-TW': '容器內未找到文件。',
    'zh-HK': '容器內未找到文件。'
  },
  'signature.ui.archival.evidence.17b2e6': {
    'en-US': 'ARCHIVAL EVIDENCE',
    'zh-CN': '归档证据',
    'ja-JP': 'アーカイブ証拠',
    'de-DE': 'Archivierungsbeweise',
    'ru-RU': 'Архивные доказательства',
    'zh-TW': '歸檔證據',
    'zh-HK': '歸檔證據'
  },
  'signature.ui.rfc.4998.structural.bounded.41444f': {
    'en-US': 'RFC 4998 · STRUCTURAL + BOUNDED',
    'zh-CN': 'RFC 4998 · 有界结构解析',
    'ja-JP': 'RFC 4998 · 制限付き構造解析',
    'de-DE': 'RFC 4998 · begrenzte Strukturprüfung',
    'ru-RU': 'RFC 4998 · ограниченный структурный анализ',
    'zh-TW': 'RFC 4998 · 有界結構解析',
    'zh-HK': 'RFC 4998 · 有界結構解析'
  },
  'signature.ui.evidence.record.ad9cdf': {
    'en-US': 'Evidence record',
    'zh-CN': '证据记录',
    'ja-JP': '証拠レコード',
    'de-DE': 'Beweisdatensatz',
    'ru-RU': 'Запись доказательств',
    'zh-TW': '證據記錄',
    'zh-HK': '證據記錄'
  },
  'signature.ui.digest.algorithms.c099a5': {
    'en-US': 'Digest algorithms',
    'zh-CN': '摘要算法',
    'ja-JP': 'ダイジェストアルゴリズム',
    'de-DE': 'Digest-Algorithmen',
    'ru-RU': 'Алгоритмы хеширования',
    'zh-TW': '摘要算法',
    'zh-HK': '摘要算法'
  },
  'signature.ui.archive.timestamp.chains.0bb476': {
    'en-US': 'Archive timestamp chains',
    'zh-CN': '归档时间戳链',
    'ja-JP': 'アーカイブタイムスタンプの連鎖',
    'de-DE': 'Archivzeitstempelketten',
    'ru-RU': 'Цепочки архивных меток времени',
    'zh-TW': '歸檔時間戳鏈',
    'zh-HK': '歸檔時間戳鏈'
  },
  'signature.ui.archive.timestamps.548a13': {
    'en-US': 'Archive timestamps',
    'zh-CN': '归档时间戳',
    'ja-JP': 'アーカイブタイムスタンプ',
    'de-DE': 'Archivzeitstempel',
    'ru-RU': 'Архивные метки времени',
    'zh-TW': '歸檔時間戳',
    'zh-HK': '歸檔時間戳'
  },
  'signature.ui.original.supplied.581ca6': {
    'en-US': 'Original supplied',
    'zh-CN': '已提供原始文件',
    'ja-JP': '元のファイルを提供済み',
    'de-DE': 'Original bereitgestellt',
    'ru-RU': 'Исходный файл предоставлен',
    'zh-TW': '已提供原始檔案',
    'zh-HK': '已提供原始檔案'
  },
  'signature.ui.first.evidence.digest.97980c': {
    'en-US': 'First evidence digest',
    'zh-CN': '首个证据摘要',
    'ja-JP': '最初の証拠ダイジェスト',
    'de-DE': 'Erste Beweisprüfsumme',
    'ru-RU': 'Первый хеш доказательства',
    'zh-TW': '首個證據摘要',
    'zh-HK': '首個證據摘要'
  },
  'signature.ui.not.checked.22705e': {
    'en-US': 'Not checked',
    'zh-CN': '未检查',
    'ja-JP': '未確認',
    'de-DE': 'Nicht geprüft',
    'ru-RU': 'Не проверено',
    'zh-TW': '未檢查',
    'zh-HK': '未檢查'
  },
  'signature.ui.matches.ee2dbd': {
    'en-US': 'Matches',
    'zh-CN': '匹配',
    'ja-JP': '一致',
    'de-DE': 'Stimmt überein',
    'ru-RU': 'Совпадает',
    'zh-TW': '匹配',
    'zh-HK': '匹配'
  },
  'signature.ui.does.not.match.3c0ba3': {
    'en-US': 'Does not match',
    'zh-CN': '不匹配',
    'ja-JP': '不一致',
    'de-DE': 'Stimmt nicht überein',
    'ru-RU': 'Не совпадает',
    'zh-TW': '不匹配',
    'zh-HK': '不匹配'
  },
  'signature.ui.full.archival.validation.b7f535': {
    'en-US': 'Full archival validation',
    'zh-CN': '完整归档验证',
    'ja-JP': 'アーカイブ全体の検証',
    'de-DE': 'Vollständige Archivierungsprüfung',
    'ru-RU': 'Полная архивная проверка',
    'zh-TW': '完整歸檔驗證',
    'zh-HK': '完整歸檔驗證'
  },
  'signature.ui.not.performed.0c6a89': {
    'en-US': 'Not performed',
    'zh-CN': '未执行',
    'ja-JP': '未実施',
    'de-DE': 'Nicht durchgeführt',
    'ru-RU': 'Не выполнено',
    'zh-TW': '未執行',
    'zh-HK': '未執行'
  },
  'signature.ui.validation.boundaries.f9e13b': {
    'en-US': 'Validation boundaries',
    'zh-CN': '验证边界',
    'ja-JP': '検証の範囲',
    'de-DE': 'Prüfgrenzen',
    'ru-RU': 'Границы проверки',
    'zh-TW': '驗證邊界',
    'zh-HK': '驗證邊界'
  },
  'signature.ui.protected.original.content.3ababd': {
    'en-US': 'Protected original content',
    'zh-CN': '受保护的原始内容',
    'ja-JP': '保護対象の元の内容',
    'de-DE': 'Geschützter Originalinhalt',
    'ru-RU': 'Защищённое исходное содержимое',
    'zh-TW': '受保護的原始內容',
    'zh-HK': '受保護的原始內容'
  },
  'signature.ui.choose.evidencerecord.protected.content.ed2331': {
    'en-US': 'Choose EvidenceRecord protected content',
    'zh-CN': '选择 EvidenceRecord 保护的内容',
    'ja-JP': 'EvidenceRecord の保護対象を選択',
    'de-DE': 'Durch EvidenceRecord geschützten Inhalt auswählen',
    'ru-RU': 'Выбрать содержимое, защищённое EvidenceRecord',
    'zh-TW': '選擇 EvidenceRecord 保護的內容',
    'zh-HK': '選擇 EvidenceRecord 保護的內容'
  },
  'signature.ui.chain.timestamp.838ded': {
    'en-US': 'Chain {p0} · timestamp {p1}',
    'zh-CN': '链 {p0} · 时间戳 {p1}',
    'ja-JP': '連鎖 {p0} · タイムスタンプ {p1}',
    'de-DE': 'Kette {p0} · Zeitstempel {p1}',
    'ru-RU': 'Цепочка {p0} · метка времени {p1}',
    'zh-TW': '鏈 {p0} · 時間戳 {p1}',
    'zh-HK': '鏈 {p0} · 時間戳 {p1}'
  },
  'signature.ui.reduced.hash.tree.nodes.a0f158': {
    'en-US': 'Reduced hash-tree nodes',
    'zh-CN': '缩减哈希树节点',
    'ja-JP': '縮約ハッシュツリーのノード',
    'de-DE': 'Knoten des reduzierten Hashbaums',
    'ru-RU': 'Узлы сокращённого хеш-дерева',
    'zh-TW': '縮減哈希樹節點',
    'zh-HK': '縮減哈希樹節點'
  },
  'signature.ui.timestamp.signatures.b20626': {
    'en-US': 'Timestamp signatures',
    'zh-CN': '时间戳签名',
    'ja-JP': 'タイムスタンプの署名',
    'de-DE': 'Zeitstempelsignaturen',
    'ru-RU': 'Подписи меток времени',
    'zh-TW': '時間戳簽名',
    'zh-HK': '時間戳簽名'
  },
  'signature.ui.timestamp.signature.check.0ddbeb': {
    'en-US': 'Timestamp signature check',
    'zh-CN': '时间戳签名检查',
    'ja-JP': 'タイムスタンプ署名の確認',
    'de-DE': 'Prüfung der Zeitstempelsignatur',
    'ru-RU': 'Проверка подписи метки времени',
    'zh-TW': '時間戳簽名檢查',
    'zh-HK': '時間戳簽名檢查'
  },
  'signature.ui.valid.a4aefa': {
    'en-US': 'Valid',
    'zh-CN': '有效',
    'ja-JP': '有効',
    'de-DE': 'Gültig',
    'ru-RU': 'Действительно',
    'zh-TW': '有效',
    'zh-HK': '有效'
  },
  'signature.ui.invalid.54e07a': {
    'en-US': 'Invalid',
    'zh-CN': '无效',
    'ja-JP': '無効',
    'de-DE': 'Ungültig',
    'ru-RU': 'Недействительно',
    'zh-TW': '無效',
    'zh-HK': '無效'
  },
  'signature.ui.evidence.digest.vs.original.357896': {
    'en-US': 'Evidence digest vs original',
    'zh-CN': '证据摘要与原始文件比对',
    'ja-JP': '証拠ダイジェストと元のファイルの比較',
    'de-DE': 'Beweisprüfsumme gegen Original',
    'ru-RU': 'Хеш доказательства и исходный файл',
    'zh-TW': '證據摘要與原始檔案比對',
    'zh-HK': '證據摘要與原始檔案比對'
  },
  'signature.ui.json.web.signature.8d3b8d': {
    'en-US': 'JSON WEB SIGNATURE',
    'zh-CN': 'JSON Web 签名',
    'ja-JP': 'JSON Web 署名',
    'de-DE': 'JSON-Web-Signatur',
    'ru-RU': 'Подпись JSON Web',
    'zh-TW': 'JSON Web 簽名',
    'zh-HK': 'JSON Web 簽名'
  },
  'signature.ui.signature.s.5167b7': {
    'en-US': '{p0} · signatures: {p1}',
    'zh-CN': '{p0} · 签名数：{p1}',
    'ja-JP': '{p0} · 署名数：{p1}',
    'de-DE': '{p0} · Signaturen: {p1}',
    'ru-RU': '{p0} · подписей: {p1}',
    'zh-TW': '{p0} · 簽名數：{p1}',
    'zh-HK': '{p0} · 簽名數：{p1}'
  },
  'signature.ui.rfc.7515.public.key.verify.b4d206': {
    'en-US': 'RFC 7515 · PUBLIC-KEY VERIFY',
    'zh-CN': 'RFC 7515 · 公钥验证',
    'ja-JP': 'RFC 7515 · 公開鍵検証',
    'de-DE': 'RFC 7515 · Public-Key-Prüfung',
    'ru-RU': 'RFC 7515 · проверка открытым ключом',
    'zh-TW': 'RFC 7515 · 公鑰驗證',
    'zh-HK': 'RFC 7515 · 公鑰驗證'
  },
  'signature.ui.jws.summary.5cd34c': {
    'en-US': 'JWS summary',
    'zh-CN': 'JWS 摘要',
    'ja-JP': 'JWS の概要',
    'de-DE': 'JWS-Zusammenfassung',
    'ru-RU': 'Сводка JWS',
    'zh-TW': 'JWS 摘要',
    'zh-HK': 'JWS 摘要'
  },
  'signature.ui.serialization.892823': {
    'en-US': 'Serialization',
    'zh-CN': '序列化方式',
    'ja-JP': 'シリアライズ形式',
    'de-DE': 'Serialisierung',
    'ru-RU': 'Сериализация',
    'zh-TW': '序列化方式',
    'zh-HK': '序列化方式'
  },
  'signature.ui.detached.payload.d2448e': {
    'en-US': 'Detached payload',
    'zh-CN': '分离式载荷',
    'ja-JP': '分離ペイロード',
    'de-DE': 'Abgetrennte Nutzdaten',
    'ru-RU': 'Отделённая полезная нагрузка',
    'zh-TW': '分離式載荷',
    'zh-HK': '分離式載荷'
  },
  'signature.ui.base64url.payload.5a6cdf': {
    'en-US': 'Base64url payload',
    'zh-CN': 'Base64url 载荷',
    'ja-JP': 'Base64url ペイロード',
    'de-DE': 'Base64url-Nutzdaten',
    'ru-RU': 'Полезная нагрузка Base64url',
    'zh-TW': 'Base64url 載荷',
    'zh-HK': 'Base64url 載荷'
  },
  'signature.ui.payload.size.6e03ab': {
    'en-US': 'Payload size',
    'zh-CN': '载荷大小',
    'ja-JP': 'ペイロードのサイズ',
    'de-DE': 'Nutzdatengröße',
    'ru-RU': 'Размер полезной нагрузки',
    'zh-TW': '載荷大小',
    'zh-HK': '載荷大小'
  },
  'signature.ui.not.supplied.25fa1c': {
    'en-US': 'Not supplied',
    'zh-CN': '未提供',
    'ja-JP': '未提供',
    'de-DE': 'Nicht bereitgestellt',
    'ru-RU': 'Не предоставлено',
    'zh-TW': '未提供',
    'zh-HK': '未提供'
  },
  'signature.ui.signatures.e4cf03': {
    'en-US': 'Signatures',
    'zh-CN': '签名',
    'ja-JP': '署名',
    'de-DE': 'Signaturen',
    'ru-RU': 'Подписи',
    'zh-TW': '簽名',
    'zh-HK': '簽名'
  },
  'signature.ui.verification.keys.e72433': {
    'en-US': 'Verification keys',
    'zh-CN': '验证密钥',
    'ja-JP': '検証鍵',
    'de-DE': 'Prüfschlüssel',
    'ru-RU': 'Ключи проверки',
    'zh-TW': '驗證密鑰',
    'zh-HK': '驗證密鑰'
  },
  'signature.ui.security.and.trust.boundary.0fc870': {
    'en-US': 'Security and trust boundary',
    'zh-CN': '安全与信任边界',
    'ja-JP': '安全性と信頼の範囲',
    'de-DE': 'Sicherheits- und Vertrauensgrenzen',
    'ru-RU': 'Границы безопасности и доверия',
    'zh-TW': '安全與信任邊界',
    'zh-HK': '安全與信任邊界'
  },
  'signature.ui.public.jwk.verification.keys.40f129': {
    'en-US': 'Public JWK verification keys',
    'zh-CN': '公开 JWK 验证密钥',
    'ja-JP': 'JWK 形式の公開検証鍵',
    'de-DE': 'Öffentliche JWK-Prüfschlüssel',
    'ru-RU': 'Открытые ключи проверки JWK',
    'zh-TW': '公開 JWK 驗證密鑰',
    'zh-HK': '公開 JWK 驗證密鑰'
  },
  'signature.ui.payload.required.a32535': {
    'en-US': 'payload required',
    'zh-CN': '需要载荷',
    'ja-JP': 'ペイロードが必要',
    'de-DE': 'Nutzdaten erforderlich',
    'ru-RU': 'требуется полезная нагрузка',
    'zh-TW': '需要載荷',
    'zh-HK': '需要載荷'
  },
  'signature.ui.public.key.required.4cdfc5': {
    'en-US': 'public key required',
    'zh-CN': '需要公钥',
    'ja-JP': '公開鍵が必要',
    'de-DE': 'Öffentlicher Schlüssel erforderlich',
    'ru-RU': 'требуется открытый ключ',
    'zh-TW': '需要公鑰',
    'zh-HK': '需要公鑰'
  },
  'signature.ui.key.id.4ade01': {
    'en-US': 'Key ID',
    'zh-CN': '密钥 ID',
    'ja-JP': '鍵 ID',
    'de-DE': 'Schlüssel-ID',
    'ru-RU': 'ID ключа',
    'zh-TW': '密鑰 ID',
    'zh-HK': '密鑰 ID'
  },
  'signature.ui.signature.bytes.8d4134': {
    'en-US': 'Signature bytes',
    'zh-CN': '签名字节数',
    'ja-JP': '署名のバイト数',
    'de-DE': 'Signaturbytes',
    'ru-RU': 'Байты подписи',
    'zh-TW': "簽名位元組數",
    'zh-HK': '簽名字節數'
  },
  'signature.ui.jades.related.properties.24cc16': {
    'en-US': 'JAdES-related properties',
    'zh-CN': 'JAdES 相关属性',
    'ja-JP': 'JAdES 関連プロパティ',
    'de-DE': 'JAdES-bezogene Eigenschaften',
    'ru-RU': 'Свойства JAdES',
    'zh-TW': 'JAdES 相關屬性',
    'zh-HK': 'JAdES 相關屬性'
  },
  'signature.ui.protected.header.bab312': {
    'en-US': 'Protected header',
    'zh-CN': '受保护头部',
    'ja-JP': '保護されたヘッダー',
    'de-DE': 'Geschützter Header',
    'ru-RU': 'Защищённый заголовок',
    'zh-TW': '受保護頭部',
    'zh-HK': '受保護頭部'
  },
  'signature.ui.unprotected.header.43bbaf': {
    'en-US': 'Unprotected header',
    'zh-CN': '未受保护头部',
    'ja-JP': '保護されていないヘッダー',
    'de-DE': 'Ungeschützter Header',
    'ru-RU': 'Незащищённый заголовок',
    'zh-TW': '未受保護頭部',
    'zh-HK': '未受保護頭部'
  },
  'signature.ui.payload.preview.21beba': {
    'en-US': 'Payload preview · {p0}',
    'zh-CN': '载荷预览 · {p0}',
    'ja-JP': 'ペイロードのプレビュー · {p0}',
    'de-DE': 'Nutzdatenvorschau · {p0}',
    'ru-RU': 'Предпросмотр полезной нагрузки · {p0}',
    'zh-TW': '載荷預覽 · {p0}',
    'zh-HK': '載荷預覽 · {p0}'
  },
  'signature.ui.payload.unavailable.ffcf3b': {
    'en-US': 'payload unavailable',
    'zh-CN': '载荷不可用',
    'ja-JP': 'ペイロードを利用できません',
    'de-DE': 'Nutzdaten nicht verfügbar',
    'ru-RU': 'полезная нагрузка недоступна',
    'zh-TW': '載荷不可用',
    'zh-HK': '載荷不可用'
  },
  'signature.ui.no.compatible.nested.renderer.is.installed.3d7e85': {
    'en-US': 'No compatible nested renderer is installed for this payload.',
    'zh-CN': '未安装适用于此载荷的嵌套预览模块。',
    'ja-JP': 'このペイロードに対応する入れ子プレビューモジュールがありません。',
    'de-DE': 'Für diese Nutzdaten ist kein passender verschachtelter Renderer installiert.',
    'ru-RU': 'Совместимый модуль вложенного предпросмотра для этой нагрузки не установлен.',
    'zh-TW': '未安裝適用於此載荷的嵌套預覽模組。',
    'zh-HK': '未安裝適用於此載荷的嵌套預覽模組。'
  },
  'signature.ui.supply.the.detached.payload.to.preview.b0d906': {
    'en-US': 'Supply the detached payload to preview and verify it.',
    'zh-CN': '请提供分离式载荷以预览并验证。',
    'ja-JP': 'プレビューと検証には分離ペイロードを指定してください。',
    'de-DE': 'Stellen Sie die abgetrennten Nutzdaten zur Vorschau und Prüfung bereit.',
    'ru-RU': 'Предоставьте отделённую полезную нагрузку для предпросмотра и проверки.',
    'zh-TW': '請提供分離式載荷以預覽並驗證。',
    'zh-HK': '請提供分離式載荷以預覽並驗證。'
  },
  'signature.ui.openpgp.rpgp.wasm.6cb1b1': {
    'en-US': 'OPENPGP · rPGP / WASM',
    'zh-CN': 'OpenPGP · rPGP / WASM',
    'ja-JP': 'OpenPGP · rPGP / WASM',
    'de-DE': 'OpenPGP · rPGP / WASM',
    'ru-RU': 'OpenPGP · rPGP / WASM',
    'zh-TW': 'OpenPGP · rPGP / WASM',
    'zh-HK': 'OpenPGP · rPGP / WASM'
  },
  'signature.ui.optional.lazy.worker.wasm.986d54': {
    'en-US': 'OPTIONAL · LAZY WORKER / WASM',
    'zh-CN': '可选 · 按需 Worker / WASM',
    'ja-JP': '任意 · オンデマンド Worker / WASM',
    'de-DE': 'Optional · Worker/WASM bei Bedarf',
    'ru-RU': 'По выбору · Worker/WASM по запросу',
    'zh-TW': '可選 · 按需 Worker / WASM',
    'zh-HK': '可選 · 按需 Worker / WASM'
  },
  'signature.ui.openpgp.summary.f9e7d1': {
    'en-US': 'OpenPGP summary',
    'zh-CN': 'OpenPGP 摘要',
    'ja-JP': 'OpenPGP の概要',
    'de-DE': 'OpenPGP-Zusammenfassung',
    'ru-RU': 'Сводка OpenPGP',
    'zh-TW': 'OpenPGP 摘要',
    'zh-HK': 'OpenPGP 摘要'
  },
  'signature.ui.classification.94c2a3': {
    'en-US': 'Classification',
    'zh-CN': '分类',
    'ja-JP': '分類',
    'de-DE': 'Klassifizierung',
    'ru-RU': 'Классификация',
    'zh-TW': '分類',
    'zh-HK': '分類'
  },
  'signature.ui.ascii.armored.8275d0': {
    'en-US': 'ASCII armored',
    'zh-CN': 'ASCII 装甲',
    'ja-JP': 'ASCII Armor',
    'de-DE': 'ASCII-Armor',
    'ru-RU': 'ASCII-оболочка',
    'zh-TW': 'ASCII 裝甲',
    'zh-HK': 'ASCII 裝甲'
  },
  'signature.ui.armor.type.d90919': {
    'en-US': 'Armor type',
    'zh-CN': '装甲类型',
    'ja-JP': 'Armor の種類',
    'de-DE': 'Armor-Typ',
    'ru-RU': 'Тип ASCII-оболочки',
    'zh-TW': '裝甲類型',
    'zh-HK': '裝甲類型'
  },
  'signature.ui.encrypted.bde2fb': {
    'en-US': 'Encrypted',
    'zh-CN': '已加密',
    'ja-JP': '暗号化済み',
    'de-DE': 'Verschlüsselt',
    'ru-RU': 'Зашифровано',
    'zh-TW': '已加密',
    'zh-HK': '已加密'
  },
  'signature.ui.integrity.protected.781297': {
    'en-US': 'Integrity protected',
    'zh-CN': '完整性保护',
    'ja-JP': '完全性の保護',
    'de-DE': 'Integritätsschutz',
    'ru-RU': 'Защита целостности',
    'zh-TW': '完整性保護',
    'zh-HK': '完整性保護'
  },
  'signature.ui.symmetric.algorithm.b57fe8': {
    'en-US': 'Symmetric algorithm',
    'zh-CN': '对称算法',
    'ja-JP': '対称暗号アルゴリズム',
    'de-DE': 'Symmetrischer Algorithmus',
    'ru-RU': 'Симметричный алгоритм',
    'zh-TW': '對稱算法',
    'zh-HK': '對稱算法'
  },
  'signature.ui.aead.mode.0cdcf9': {
    'en-US': 'AEAD mode',
    'zh-CN': 'AEAD 模式',
    'ja-JP': 'AEAD モード',
    'de-DE': 'AEAD-Modus',
    'ru-RU': 'Режим AEAD',
    'zh-TW': 'AEAD 模式',
    'zh-HK': 'AEAD 模式'
  },
  'signature.ui.recipients.78cbf8': {
    'en-US': 'Recipients',
    'zh-CN': '接收者',
    'ja-JP': '受信者',
    'de-DE': 'Empfänger',
    'ru-RU': 'Получатели',
    'zh-TW': '接收者',
    'zh-HK': '接收者'
  },
  'signature.ui.compressed.1238ea': {
    'en-US': 'Compressed',
    'zh-CN': '已压缩',
    'ja-JP': '圧縮済み',
    'de-DE': 'Komprimiert',
    'ru-RU': 'Сжато',
    'zh-TW': '已壓縮',
    'zh-HK': '已壓縮'
  },
  'signature.ui.packet.count.308f5c': {
    'en-US': 'Packet count',
    'zh-CN': '数据包数量',
    'ja-JP': 'パケット数',
    'de-DE': 'Paketanzahl',
    'ru-RU': 'Число пакетов',
    'zh-TW': '資料包數量',
    'zh-HK': '數據包數量'
  },
  'signature.ui.packet.types.2a59ca': {
    'en-US': 'Packet types',
    'zh-CN': '数据包类型',
    'ja-JP': 'パケットの種類',
    'de-DE': 'Pakettypen',
    'ru-RU': 'Типы пакетов',
    'zh-TW': '資料包類型',
    'zh-HK': '數據包類型'
  },
  'signature.ui.keys.e5651c': {
    'en-US': 'Keys',
    'zh-CN': '密钥',
    'ja-JP': '鍵',
    'de-DE': 'Schlüssel',
    'ru-RU': 'Ключи',
    'zh-TW': '密鑰',
    'zh-HK': '密鑰'
  },
  'signature.ui.openpgp.parsing.runs.browser.local.inside.1623a8': {
    'en-US':
      'OpenPGP parsing runs browser-local inside a dedicated Worker backed by rPGP WebAssembly. OpenPGP.js and GnuPG are not used.',
    'zh-CN':
      'OpenPGP 使用 rPGP WebAssembly 在浏览器本地的独立 Worker 中解析，不使用 OpenPGP.js 或 GnuPG。',
    'ja-JP':
      'OpenPGP は rPGP WebAssembly を使い、ブラウザー内の専用 Worker で解析します。OpenPGP.js や GnuPG は使用しません。',
    'de-DE':
      'OpenPGP wird browserlokal in einem eigenen Worker mit rPGP WebAssembly verarbeitet. OpenPGP.js und GnuPG werden nicht verwendet.',
    'ru-RU':
      'OpenPGP обрабатывается локально в отдельном Worker на rPGP WebAssembly. OpenPGP.js и GnuPG не используются.',
    'zh-TW':
      'OpenPGP 使用 rPGP WebAssembly 在瀏覽器本機的獨立 Worker 中解析，不使用 OpenPGP.js 或 GnuPG。',
    'zh-HK':
      'OpenPGP 使用 rPGP WebAssembly 在瀏覽器本機的獨立 Worker 中解析，不使用 OpenPGP.js 或 GnuPG。'
  },
  'signature.ui.security.boundaries.19ff5f': {
    'en-US': 'Security boundaries',
    'zh-CN': '安全边界',
    'ja-JP': '安全性の範囲',
    'de-DE': 'Sicherheitsgrenzen',
    'ru-RU': 'Границы безопасности',
    'zh-TW': '安全邊界',
    'zh-HK': '安全邊界'
  },
  'signature.ui.detached.signature.verification.188470': {
    'en-US': 'Detached signature verification',
    'zh-CN': '分离式签名验证',
    'ja-JP': '分離署名の検証',
    'de-DE': 'Prüfung abgetrennter Signaturen',
    'ru-RU': 'Проверка отделённой подписи',
    'zh-TW': '分離式簽名驗證',
    'zh-HK': '分離式簽名驗證'
  },
  'signature.ui.key.fingerprint.aaf1a9': {
    'en-US': 'Key fingerprint',
    'zh-CN': '密钥指纹',
    'ja-JP': '鍵のフィンガープリント',
    'de-DE': 'Schlüsselfingerabdruck',
    'ru-RU': 'Отпечаток ключа',
    'zh-TW': '密鑰指紋',
    'zh-HK': '密鑰指紋'
  },
  'signature.ui.choose.original.openpgp.signed.content.25903f': {
    'en-US': 'Choose original OpenPGP signed content',
    'zh-CN': '选择 OpenPGP 签名的原始内容',
    'ja-JP': 'OpenPGP 署名対象の元の内容を選択',
    'de-DE': 'Mit OpenPGP signierten Originalinhalt auswählen',
    'ru-RU': 'Выбрать исходное содержимое, подписанное OpenPGP',
    'zh-TW': '選擇 OpenPGP 簽名的原始內容',
    'zh-HK': '選擇 OpenPGP 簽名的原始內容'
  },
  'signature.ui.original.content.is.required.4e89df': {
    'en-US': 'Original content is required.',
    'zh-CN': '需要原始内容。',
    'ja-JP': '元の内容が必要です。',
    'de-DE': 'Originalinhalt erforderlich.',
    'ru-RU': 'Требуется исходное содержимое.',
    'zh-TW': '需要原始內容。',
    'zh-HK': '需要原始內容。'
  },
  'signature.ui.choose.openpgp.public.verification.keys.1b4faf': {
    'en-US': 'Choose OpenPGP public verification keys',
    'zh-CN': '选择 OpenPGP 公开验证密钥',
    'ja-JP': 'OpenPGP の公開検証鍵を選択',
    'de-DE': 'Öffentliche OpenPGP-Prüfschlüssel auswählen',
    'ru-RU': 'Выбрать открытые ключи проверки OpenPGP',
    'zh-TW': '選擇 OpenPGP 公開驗證密鑰',
    'zh-HK': '選擇 OpenPGP 公開驗證密鑰'
  },
  'signature.ui.verification.key.file.s.supplied.a5f723': {
    'en-US': '{p0} verification key file(s) supplied.',
    'zh-CN': '已提供验证密钥文件：{p0}',
    'ja-JP': '提供済みの検証鍵ファイル数：{p0}',
    'de-DE': 'Bereitgestellte Prüfschlüsseldateien: {p0}',
    'ru-RU': 'Предоставлено файлов ключей проверки: {p0}',
    'zh-TW': '已提供驗證密鑰檔案：{p0}',
    'zh-HK': '已提供驗證密鑰檔案：{p0}'
  },
  'signature.ui.supply.one.or.more.public.keys.cfb238': {
    'en-US': 'Supply one or more public keys; no keyring lookup is performed.',
    'zh-CN': '请提供一个或多个公钥；不会查询密钥环。',
    'ja-JP': '公開鍵を 1 つ以上指定してください。鍵リングの検索は行いません。',
    'de-DE':
      'Stellen Sie einen oder mehrere öffentliche Schlüssel bereit. Es erfolgt keine Schlüsselbundsuche.',
    'ru-RU':
      'Предоставьте один или несколько открытых ключей. Поиск в связке ключей не выполняется.',
    'zh-TW': '請提供一個或多個公鑰；不會查詢密鑰環。',
    'zh-HK': '請提供一個或多個公鑰；不會查詢密鑰環。'
  },
  'signature.ui.key.metadata.13db5d': {
    'en-US': 'Key metadata',
    'zh-CN': '密钥元数据',
    'ja-JP': '鍵のメタデータ',
    'de-DE': 'Schlüsselmetadaten',
    'ru-RU': 'Метаданные ключей',
    'zh-TW': '密鑰中繼資料',
    'zh-HK': '密鑰元數據'
  },
  'signature.ui.signature.metadata.a35935': {
    'en-US': 'Signature metadata',
    'zh-CN': '签名元数据',
    'ja-JP': '署名のメタデータ',
    'de-DE': 'Signaturmetadaten',
    'ru-RU': 'Метаданные подписей',
    'zh-TW': '簽名中繼資料',
    'zh-HK': '簽名元數據'
  },
  'signature.ui.literal.data.preview.646f29': {
    'en-US': 'Literal-data preview · {p0}',
    'zh-CN': '字面数据预览 · {p0}',
    'ja-JP': 'リテラルデータのプレビュー · {p0}',
    'de-DE': 'Vorschau der Literaldaten · {p0}',
    'ru-RU': 'Предпросмотр буквальных данных · {p0}',
    'zh-TW': '字面資料預覽 · {p0}',
    'zh-HK': '字面數據預覽 · {p0}'
  },
  'signature.ui.not.extracted.cd7e24': {
    'en-US': 'not extracted',
    'zh-CN': '未提取',
    'ja-JP': '未抽出',
    'de-DE': 'Nicht extrahiert',
    'ru-RU': 'не извлечено',
    'zh-TW': '未提取',
    'zh-HK': '未提取'
  },
  'signature.ui.encrypted.openpgp.data.is.inspection.only.e40345': {
    'en-US': 'Encrypted OpenPGP data is inspection-only; automatic decryption is not exposed.',
    'zh-CN': '加密的 OpenPGP 数据仅供结构检查，不提供自动解密。',
    'ja-JP': '暗号化された OpenPGP データは構造確認のみです。自動復号は提供しません。',
    'de-DE':
      'Verschlüsselte OpenPGP-Daten können nur untersucht werden. Automatische Entschlüsselung wird nicht angeboten.',
    'ru-RU':
      'Зашифрованные данные OpenPGP доступны только для анализа. Автоматическая расшифровка не предоставляется.',
    'zh-TW': '加密的 OpenPGP 資料僅供結構檢查，不提供自動解密。',
    'zh-HK': '加密的 OpenPGP 數據僅供結構檢查，不提供自動解密。'
  },
  'signature.ui.compressed.openpgp.data.did.not.expose.c7ecf7': {
    'en-US':
      'Compressed OpenPGP data did not expose literal content within the configured nesting and output limits.',
    'zh-CN': '在配置的嵌套和输出限制内，未从压缩 OpenPGP 数据中取得字面内容。',
    'ja-JP':
      '設定された入れ子深度と出力上限の範囲では、圧縮 OpenPGP データからリテラル内容を取得できませんでした。',
    'de-DE':
      'Innerhalb der konfigurierten Verschachtelungs- und Ausgabegrenzen wurden aus den komprimierten OpenPGP-Daten keine Literaldaten gewonnen.',
    'ru-RU':
      'В пределах настроенных ограничений вложенности и объёма из сжатых данных OpenPGP не удалось получить буквальное содержимое.',
    'zh-TW': '在配置的嵌套和輸出限制內，未從壓縮 OpenPGP 資料中取得字面內容。',
    'zh-HK': '在配置的嵌套和輸出限制內，未從壓縮 OpenPGP 數據中取得字面內容。'
  },
  'signature.ui.no.safely.extractable.literal.data.is.891a41': {
    'en-US': 'No safely extractable literal data is available.',
    'zh-CN': '没有可安全提取的字面数据。',
    'ja-JP': '安全に抽出できるリテラルデータがありません。',
    'de-DE': 'Keine sicher extrahierbaren Literaldaten vorhanden.',
    'ru-RU': 'Нет буквальных данных, которые можно безопасно извлечь.',
    'zh-TW': '沒有可安全提取的字面資料。',
    'zh-HK': '沒有可安全提取的字面數據。'
  },
  'signature.ui.extracted.literal.data.exceeds.the.nested.38a726': {
    'en-US': 'Extracted literal data exceeds the nested-preview limit.',
    'zh-CN': '提取的字面数据超过嵌套预览限制。',
    'ja-JP': '抽出したリテラルデータは入れ子プレビューの上限を超えています。',
    'de-DE': 'Die extrahierten Literaldaten überschreiten die Grenze der verschachtelten Vorschau.',
    'ru-RU': 'Извлечённые буквальные данные превышают предел вложенного предпросмотра.',
    'zh-TW': '提取的字面資料超過嵌套預覽限制。',
    'zh-HK': '提取的字面數據超過嵌套預覽限制。'
  },
  'signature.ui.literal.data.was.extracted.but.no.386863': {
    'en-US': 'Literal data was extracted, but no compatible nested renderer is available.',
    'zh-CN': '已提取字面数据，但没有兼容的嵌套预览模块。',
    'ja-JP': 'リテラルデータを抽出しましたが、対応する入れ子プレビューモジュールがありません。',
    'de-DE':
      'Literaldaten wurden extrahiert, aber kein passender verschachtelter Renderer ist verfügbar.',
    'ru-RU':
      'Буквальные данные извлечены, но совместимый модуль вложенного предпросмотра отсутствует.',
    'zh-TW': '已提取字面資料，但沒有相容的嵌套預覽模組。',
    'zh-HK': '已提取字面數據，但沒有相容的嵌套預覽模組。'
  },
  'signature.ui.cryptographic.container.5168db': {
    'en-US': 'CRYPTOGRAPHIC CONTAINER',
    'zh-CN': '密码学容器',
    'ja-JP': '暗号コンテナー',
    'de-DE': 'Kryptografischer Container',
    'ru-RU': 'Криптографический контейнер',
    'zh-TW': '密碼學容器',
    'zh-HK': '密碼學容器'
  },
  'signature.ui.cms.rfc.3161.rfc.5544.bounded.184403': {
    'en-US': 'CMS · RFC 3161 · RFC 5544 · BOUNDED',
    'zh-CN': 'CMS · RFC 3161 · RFC 5544 · 有界解析',
    'ja-JP': 'CMS · RFC 3161 · RFC 5544 · 制限付き解析',
    'de-DE': 'CMS · RFC 3161 · RFC 5544 · begrenzt',
    'ru-RU': 'CMS · RFC 3161 · RFC 5544 · с ограничениями',
    'zh-TW': 'CMS · RFC 3161 · RFC 5544 · 有界解析',
    'zh-HK': 'CMS · RFC 3161 · RFC 5544 · 有界解析'
  },
  'signature.ui.container.summary.bdd0e6': {
    'en-US': 'Container summary',
    'zh-CN': '容器摘要',
    'ja-JP': 'コンテナーの概要',
    'de-DE': 'Containerzusammenfassung',
    'ru-RU': 'Сводка контейнера',
    'zh-TW': '容器摘要',
    'zh-HK': '容器摘要'
  },
  'signature.ui.detected.format.0c8a72': {
    'en-US': 'Detected format',
    'zh-CN': '识别到的格式',
    'ja-JP': '検出形式',
    'de-DE': 'Erkanntes Format',
    'ru-RU': 'Обнаруженный формат',
    'zh-TW': '識別到的格式',
    'zh-HK': '識別到的格式'
  },
  'signature.ui.cms.content.type.496884': {
    'en-US': 'CMS content type',
    'zh-CN': 'CMS 内容类型',
    'ja-JP': 'CMS コンテンツタイプ',
    'de-DE': 'CMS-Inhaltstyp',
    'ru-RU': 'Тип содержимого CMS',
    'zh-TW': 'CMS 內容類型',
    'zh-HK': 'CMS 內容類型'
  },
  'signature.ui.encapsulated.content.a1dd6f': {
    'en-US': 'Encapsulated content',
    'zh-CN': '封装内容',
    'ja-JP': 'カプセル化された内容',
    'de-DE': 'Eingekapselter Inhalt',
    'ru-RU': 'Инкапсулированное содержимое',
    'zh-TW': '封裝內容',
    'zh-HK': '封裝內容'
  },
  'signature.ui.detached.bbbf4e': {
    'en-US': 'Detached',
    'zh-CN': '分离式',
    'ja-JP': '分離形式',
    'de-DE': 'Abgetrennt',
    'ru-RU': 'Отделённое',
    'zh-TW': '分離式',
    'zh-HK': '分離式'
  },
  'signature.ui.signers.e01e92': {
    'en-US': 'Signers',
    'zh-CN': '签名者',
    'ja-JP': '署名者',
    'de-DE': 'Unterzeichner',
    'ru-RU': 'Подписанты',
    'zh-TW': '簽名者',
    'zh-HK': '簽名者'
  },
  'signature.ui.certificates.b3e4eb': {
    'en-US': 'Certificates',
    'zh-CN': '证书',
    'ja-JP': '証明書',
    'de-DE': 'Zertifikate',
    'ru-RU': 'Сертификаты',
    'zh-TW': '證書',
    'zh-HK': '證書'
  },
  'signature.ui.crls.094cb8': {
    'en-US': 'CRLs',
    'zh-CN': '证书吊销列表（CRL）',
    'ja-JP': '証明書失効リスト（CRL）',
    'de-DE': 'Zertifikatsperrlisten (CRL)',
    'ru-RU': 'Списки отзыва сертификатов (CRL)',
    'zh-TW': '證書吊銷列表（CRL）',
    'zh-HK': '證書吊銷列表（CRL）'
  },
  'signature.ui.timestamp.response.da81cf': {
    'en-US': 'Timestamp response',
    'zh-CN': '时间戳响应',
    'ja-JP': 'タイムスタンプ応答',
    'de-DE': 'Zeitstempelantwort',
    'ru-RU': 'Ответ службы меток времени',
    'zh-TW': '時間戳響應',
    'zh-HK': '時間戳響應'
  },
  'signature.ui.status.bae7d5': {
    'en-US': 'Status',
    'zh-CN': '状态',
    'ja-JP': '状態',
    'de-DE': 'Status',
    'ru-RU': 'Состояние',
    'zh-TW': '狀態',
    'zh-HK': '狀態'
  },
  'signature.ui.status.code.fcbb29': {
    'en-US': 'Status code',
    'zh-CN': '状态代码',
    'ja-JP': '状態コード',
    'de-DE': 'Statuscode',
    'ru-RU': 'Код состояния',
    'zh-TW': '狀態程式碼',
    'zh-HK': '狀態程式碼'
  },
  'signature.ui.status.text.b68390': {
    'en-US': 'Status text',
    'zh-CN': '状态文本',
    'ja-JP': '状態テキスト',
    'de-DE': 'Statustext',
    'ru-RU': 'Текст состояния',
    'zh-TW': '狀態文字',
    'zh-HK': '狀態文字'
  },
  'signature.ui.failure.info.6c3ba0': {
    'en-US': 'Failure info',
    'zh-CN': '失败信息',
    'ja-JP': '失敗情報',
    'de-DE': 'Fehlerinformationen',
    'ru-RU': 'Сведения об ошибке',
    'zh-TW': '失敗資訊',
    'zh-HK': '失敗資訊'
  },
  'signature.ui.rfc.5544.timestampeddata.f1750c': {
    'en-US': 'RFC 5544 TimeStampedData',
    'zh-CN': 'RFC 5544 TimeStampedData',
    'ja-JP': 'RFC 5544 TimeStampedData',
    'de-DE': 'RFC 5544 TimeStampedData',
    'ru-RU': 'RFC 5544 TimeStampedData',
    'zh-TW': 'RFC 5544 TimeStampedData',
    'zh-HK': 'RFC 5544 TimeStampedData'
  },
  'signature.ui.data.uri.a46f09': {
    'en-US': 'Data URI',
    'zh-CN': '数据 URI',
    'ja-JP': 'データ URI',
    'de-DE': 'Daten-URI',
    'ru-RU': 'URI данных',
    'zh-TW': '資料 URI',
    'zh-HK': '數據 URI'
  },
  'signature.ui.filename.a3cbb9': {
    'en-US': 'Filename',
    'zh-CN': '文件名',
    'ja-JP': 'ファイル名',
    'de-DE': 'Dateiname',
    'ru-RU': 'Имя файла',
    'zh-TW': '檔案名',
    'zh-HK': '檔案名'
  },
  'signature.ui.media.type.77e4c3': {
    'en-US': 'Media type',
    'zh-CN': '媒体类型',
    'ja-JP': 'メディアタイプ',
    'de-DE': 'Medientyp',
    'ru-RU': 'Тип содержимого',
    'zh-TW': '媒體類型',
    'zh-HK': '媒體類型'
  },
  'signature.ui.metadata.hash.protected.942921': {
    'en-US': 'Metadata hash protected',
    'zh-CN': '元数据哈希保护',
    'ja-JP': 'メタデータのハッシュ保護',
    'de-DE': 'Hashschutz der Metadaten',
    'ru-RU': 'Хеш-защита метаданных',
    'zh-TW': '中繼資料哈希保護',
    'zh-HK': '元數據哈希保護'
  },
  'signature.ui.temporal.evidence.entries.46c366': {
    'en-US': 'Temporal evidence entries',
    'zh-CN': '时间证据条目',
    'ja-JP': '時間的証拠の項目',
    'de-DE': 'Zeitliche Beweiseinträge',
    'ru-RU': 'Элементы временных доказательств',
    'zh-TW': '時間證據條目',
    'zh-HK': '時間證據條目'
  },
  'signature.ui.original.content.b9d592': {
    'en-US': 'Original content',
    'zh-CN': '原始内容',
    'ja-JP': '元の内容',
    'de-DE': 'Originalinhalt',
    'ru-RU': 'Исходное содержимое',
    'zh-TW': '原始內容',
    'zh-HK': '原始內容'
  },
  'signature.ui.choose.original.content.9fefe9': {
    'en-US': 'Choose original content',
    'zh-CN': '选择原始内容',
    'ja-JP': '元の内容を選択',
    'de-DE': 'Originalinhalt auswählen',
    'ru-RU': 'Выбрать исходное содержимое',
    'zh-TW': '選擇原始內容',
    'zh-HK': '選擇原始內容'
  },
  'signature.ui.choose.the.original.file.to.compare.050ce0': {
    'en-US': 'Choose the original file to compare its digest locally.',
    'zh-CN': '选择原始文件，在本地比对摘要。',
    'ja-JP': '元のファイルを選択してローカルでダイジェストを比較します。',
    'de-DE': 'Wählen Sie die Originaldatei, um ihre Prüfsumme lokal zu vergleichen.',
    'ru-RU': 'Выберите исходный файл для локального сравнения хеша.',
    'zh-TW': '選擇原始檔案，在本機比對摘要。',
    'zh-HK': '選擇原始檔案，在本機比對摘要。'
  },
  'signature.ui.included.certificates.5aa167': {
    'en-US': 'Included certificates',
    'zh-CN': '包含的证书',
    'ja-JP': '含まれる証明書',
    'de-DE': 'Enthaltene Zertifikate',
    'ru-RU': 'Включённые сертификаты',
    'zh-TW': '包含的證書',
    'zh-HK': '包含的證書'
  },
  'signature.ui.document.preview.2ee0ab': {
    'en-US': 'Document preview · {p0}',
    'zh-CN': '文档预览 · {p0}',
    'ja-JP': '文書プレビュー · {p0}',
    'de-DE': 'Dokumentvorschau · {p0}',
    'ru-RU': 'Предпросмотр документа · {p0}',
    'zh-TW': '文件預覽 · {p0}',
    'zh-HK': '文件預覽 · {p0}'
  },
  'signature.ui.content.unavailable.6886f1': {
    'en-US': 'content unavailable',
    'zh-CN': '内容不可用',
    'ja-JP': '内容を利用できません',
    'de-DE': 'Inhalt nicht verfügbar',
    'ru-RU': 'содержимое недоступно',
    'zh-TW': '內容不可用',
    'zh-HK': '內容不可用'
  },
  'signature.ui.supply.the.original.content.to.compare.167006': {
    'en-US':
      'Supply the original content to compare its digest or timestamp message imprint and open it through the nested renderer.',
    'zh-CN': '请提供原始内容以比对摘要或时间戳消息印记，并通过嵌套预览模块打开。',
    'ja-JP':
      '元の内容を指定してダイジェストやタイムスタンプのメッセージインプリントを比較し、入れ子プレビューで開いてください。',
    'de-DE':
      'Stellen Sie den Originalinhalt bereit, um Prüfsumme oder Zeitstempelabdruck zu vergleichen und ihn im verschachtelten Renderer zu öffnen.',
    'ru-RU':
      'Предоставьте исходное содержимое для сравнения хеша или отпечатка метки времени и открытия во вложенном просмотрщике.',
    'zh-TW': '請提供原始內容以比對摘要或時間戳消息印記，並通過嵌套預覽模組打開。',
    'zh-HK': '請提供原始內容以比對摘要或時間戳消息印記，並通過嵌套預覽模組打開。'
  },
  'signature.ui.the.container.does.not.include.previewable.d0b3f9': {
    'en-US': 'The container does not include previewable document content.',
    'zh-CN': '容器不含可预览的文档内容。',
    'ja-JP': 'このコンテナーにはプレビュー可能な文書がありません。',
    'de-DE': 'Der Container enthält keinen darstellbaren Dokumentinhalt.',
    'ru-RU': 'В контейнере нет содержимого документа для предпросмотра.',
    'zh-TW': '容器不含可預覽的文件內容。',
    'zh-HK': '容器不含可預覽的文件內容。'
  },
  'signature.ui.nested.preview.is.disabled.because.exceeds.9108b1': {
    'en-US': 'Nested preview is disabled because {p0} exceeds the {p1} limit.',
    'zh-CN': '{p0} 超过 {p1} 限制，已停用嵌套预览。',
    'ja-JP': '{p0} が上限 {p1} を超えているため、入れ子プレビューは無効です。',
    'de-DE':
      'Die verschachtelte Vorschau ist deaktiviert, weil {p0} die Grenze {p1} überschreitet.',
    'ru-RU': 'Вложенный предпросмотр отключён: {p0} превышает предел {p1}.',
    'zh-TW': '{p0} 超過 {p1} 限制，已停用嵌套預覽。',
    'zh-HK': '{p0} 超過 {p1} 限制，已停用嵌套預覽。'
  },
  'signature.ui.the.content.was.extracted.but.no.baea5a': {
    'en-US':
      'The content was extracted, but no compatible nested renderer is available for this file type.',
    'zh-CN': '已提取内容，但未安装适用于此文件类型的嵌套预览模块。',
    'ja-JP':
      '内容を抽出しましたが、このファイル形式に対応する入れ子プレビューモジュールがありません。',
    'de-DE':
      'Der Inhalt wurde extrahiert, aber für diesen Dateityp ist kein passender verschachtelter Renderer verfügbar.',
    'ru-RU':
      'Содержимое извлечено, но совместимый модуль вложенного предпросмотра для этого типа файла отсутствует.',
    'zh-TW': '已提取內容，但未安裝適用於此檔案類型的嵌套預覽模組。',
    'zh-HK': '已提取內容，但未安裝適用於此檔案類型的嵌套預覽模組。'
  },
  'binary.ui.binary.inspector.a17d48': {
    'en-US': 'Binary inspector',
    'zh-CN': '二进制检查器',
    'ja-JP': 'バイナリインスペクター',
    'de-DE': 'Binäranalyse',
    'ru-RU': 'Анализ двоичных файлов',
    'zh-TW': "二進位檢查器",
    'zh-HK': '二進制檢查器'
  },
  'binary.ui.worker.parsed.82ab13': {
    'en-US': '{p0} | {p1} | Worker parsed',
    'zh-CN': '{p0} · {p1} · 已由 Worker 解析',
    'ja-JP': '{p0} · {p1} · Worker で解析済み',
    'de-DE': '{p0} · {p1} · im Worker verarbeitet',
    'ru-RU': '{p0} · {p1} · обработано в Worker',
    'zh-TW': '{p0} · {p1} · 已由 Worker 解析',
    'zh-HK': '{p0} · {p1} · 已由 Worker 解析'
  },
  'binary.ui.offset.ce6677': {
    'en-US': 'Offset',
    'zh-CN': '偏移量',
    'ja-JP': 'オフセット',
    'de-DE': 'Offset',
    'ru-RU': 'Смещение',
    'zh-TW': '偏移量',
    'zh-HK': '偏移量'
  },
  'binary.ui.hexadecimal.54b1a9': {
    'en-US': 'Hexadecimal',
    'zh-CN': '十六进制',
    'ja-JP': '16 進数',
    'de-DE': 'Hexadezimal',
    'ru-RU': 'Шестнадцатеричные данные',
    'zh-TW': "十六進位",
    'zh-HK': '十六進制'
  },
  'binary.ui.typed.values.4e4cf0': {
    'en-US': 'Typed values',
    'zh-CN': '类型化数值',
    'ja-JP': '型付きの値',
    'de-DE': 'Typisierte Werte',
    'ru-RU': 'Значения по типам',
    'zh-TW': '類型化數值',
    'zh-HK': '類型化數值'
  },
  'binary.ui.byte.8ed6f4': {
    'en-US': 'Byte {p0}: {p1}',
    'zh-CN': '字节 {p0}：{p1}',
    'ja-JP': 'バイト {p0}：{p1}',
    'de-DE': 'Byte {p0}: {p1}',
    'ru-RU': 'Байт {p0}: {p1}',
    'zh-TW': "位元組 {p0}：{p1}",
    'zh-HK': '字節 {p0}：{p1}'
  },
  'binary.ui.selection.d1f8e5': {
    'en-US': 'Selection',
    'zh-CN': '选区',
    'ja-JP': '選択範囲',
    'de-DE': 'Auswahl',
    'ru-RU': 'Выделение',
    'zh-TW': '選區',
    'zh-HK': '選區'
  },
  'binary.ui.none.71f8e7': {
    'en-US': 'none',
    'zh-CN': '无',
    'ja-JP': 'なし',
    'de-DE': 'Keine',
    'ru-RU': 'нет',
    'zh-TW': '無',
    'zh-HK': '無'
  },
  'design.ui.resources.eabdb3': {
    'en-US': '{p0} resources · {p1} {p2}',
    'zh-CN': '资源数：{p0} · {p1} {p2}',
    'ja-JP': 'リソース数：{p0} · {p1} {p2}',
    'de-DE': 'Ressourcen: {p0} · {p1} {p2}',
    'ru-RU': 'Ресурсов: {p0} · {p1} {p2}',
    'zh-TW': '資源數：{p0} · {p1} {p2}',
    'zh-HK': '資源數：{p0} · {p1} {p2}'
  },
  'design.ui.unnamed.brush.30bf19': {
    'en-US': '(unnamed brush)',
    'zh-CN': '（未命名笔刷）',
    'ja-JP': '（名前のないブラシ）',
    'de-DE': '(Unbenannter Pinsel)',
    'ru-RU': '(кисть без имени)',
    'zh-TW': '（未命名筆刷）',
    'zh-HK': '（未命名筆刷）'
  },
  'design.ui.px.0898ab': {
    'en-US': '{p0} · {p1} px · {p2}°',
    'zh-CN': '{p0} · {p1} px · {p2}°',
    'ja-JP': '{p0} · {p1} px · {p2}°',
    'de-DE': '{p0} · {p1} px · {p2}°',
    'ru-RU': '{p0} · {p1} px · {p2}°',
    'zh-TW': '{p0} · {p1} px · {p2}°',
    'zh-HK': '{p0} · {p1} px · {p2}°'
  },
  'design.ui.unnamed.tip.0813e8': {
    'en-US': '(unnamed tip)',
    'zh-CN': '（未命名笔尖）',
    'ja-JP': '（名前のないブラシ先端）',
    'de-DE': '(Unbenannte Pinselspitze)',
    'ru-RU': '(наконечник без имени)',
    'zh-TW': '（未命名筆尖）',
    'zh-HK': '（未命名筆尖）'
  },
  'design.ui.unnamed.shape.1b3a1c': {
    'en-US': '(unnamed shape)',
    'zh-CN': '（未命名形状）',
    'ja-JP': '（名前のないシェイプ）',
    'de-DE': '(Unbenannte Form)',
    'ru-RU': '(фигура без имени)',
    'zh-TW': '（未命名形狀）',
    'zh-HK': '（未命名形狀）'
  },
  'design.ui.paths.eb5db6': {
    'en-US': '{p0} × {p1} · {p2} paths',
    'zh-CN': '{p0} × {p1} · 路径数：{p2}',
    'ja-JP': '{p0} × {p1} · パス数：{p2}',
    'de-DE': '{p0} × {p1} · Pfade: {p2}',
    'ru-RU': '{p0} × {p1} · контуров: {p2}',
    'zh-TW': '{p0} × {p1} · 路徑數：{p2}',
    'zh-HK': '{p0} × {p1} · 路徑數：{p2}'
  },
  'design.ui.blend.options.e3dab3': {
    'en-US': 'blend options',
    'zh-CN': '混合选项',
    'ja-JP': '描画オプション',
    'de-DE': 'Fülloptionen',
    'ru-RU': 'параметры наложения',
    'zh-TW': '混合選項',
    'zh-HK': '混合選項'
  },
  'design.ui.previous.idml.page.aee2a6': {
    'en-US': 'Previous IDML page',
    'zh-CN': '上一页 IDML',
    'ja-JP': '前の IDML ページ',
    'de-DE': 'Vorherige IDML-Seite',
    'ru-RU': 'Предыдущая страница IDML',
    'zh-TW': '上一頁 IDML',
    'zh-HK': '上一頁 IDML'
  },
  'design.ui.next.idml.page.fe7930': {
    'en-US': 'Next IDML page',
    'zh-CN': '下一页 IDML',
    'ja-JP': '次の IDML ページ',
    'de-DE': 'Nächste IDML-Seite',
    'ru-RU': 'Следующая страница IDML',
    'zh-TW': '下一頁 IDML',
    'zh-HK': '下一頁 IDML'
  },
  'design.ui.idml.pages.bc51ac': {
    'en-US': 'IDML pages',
    'zh-CN': 'IDML 页面',
    'ja-JP': 'IDML のページ',
    'de-DE': 'IDML-Seiten',
    'ru-RU': 'Страницы IDML',
    'zh-TW': 'IDML 頁面',
    'zh-HK': 'IDML 頁面'
  },
  'design.ui.postscript.pages.8024cc': {
    'en-US': 'PostScript pages',
    'zh-CN': 'PostScript 页面',
    'ja-JP': 'PostScript のページ',
    'de-DE': 'PostScript-Seiten',
    'ru-RU': 'Страницы PostScript',
    'zh-TW': 'PostScript 頁面',
    'zh-HK': 'PostScript 頁面'
  },
  'design.ui.dpi.036751': {
    'en-US': '{p0}×{p1} @ {p2} DPI',
    'zh-CN': '{p0}×{p1}，{p2} DPI',
    'ja-JP': '{p0}×{p1}、{p2} DPI',
    'de-DE': '{p0}×{p1} bei {p2} DPI',
    'ru-RU': '{p0}×{p1}, {p2} DPI',
    'zh-TW': '{p0}×{p1}，{p2} DPI',
    'zh-HK': '{p0}×{p1}，{p2} DPI'
  },
  'design.ui.layout.fragment.1fe731': {
    'en-US': '{p0} layout fragment',
    'zh-CN': '{p0} 版面片段',
    'ja-JP': '{p0} レイアウト断片',
    'de-DE': '{p0}-Layoutfragment',
    'ru-RU': 'Фрагмент макета {p0}',
    'zh-TW': '{p0} 版面片段',
    'zh-HK': '{p0} 版面片段'
  },
  'design.ui.worker.utf.8.xml.max.depth.bdc9b9': {
    'en-US': 'Worker · UTF-8 XML · {p0} max depth · {p1} layers',
    'zh-CN': 'Worker · UTF-8 XML · 最大深度 {p0} · 图层数 {p1}',
    'ja-JP': 'Worker · UTF-8 XML · 最大深度 {p0} · レイヤー数 {p1}',
    'de-DE': 'Worker · UTF-8 XML · maximale Tiefe {p0} · Ebenen: {p1}',
    'ru-RU': 'Worker · UTF-8 XML · максимальная глубина: {p0} · слоёв: {p1}',
    'zh-TW': 'Worker · UTF-8 XML · 最大深度 {p0} · 圖層數 {p1}',
    'zh-HK': 'Worker · UTF-8 XML · 最大深度 {p0} · 圖層數 {p1}'
  },
  'design.ui.entries.expanded.manifest.a4e5c5': {
    'en-US': '{p0} entries · {p1} expanded · manifest {p2}',
    'zh-CN': '条目数：{p0} · 解压后 {p1} · 清单 {p2}',
    'ja-JP': '項目数：{p0} · 展開後 {p1} · マニフェスト {p2}',
    'de-DE': 'Einträge: {p0} · entpackt: {p1} · Manifest {p2}',
    'ru-RU': 'Записей: {p0} · после распаковки: {p1} · манифест: {p2}',
    'zh-TW': '條目數：{p0} · 解壓後 {p1} · 清單 {p2}',
    'zh-HK': '條目數：{p0} · 解壓後 {p1} · 清單 {p2}'
  },
  'design.ui.embedded.preview.0a32a6': {
    'en-US': 'EMBEDDED PREVIEW',
    'zh-CN': '内嵌预览',
    'ja-JP': '埋め込みプレビュー',
    'de-DE': 'Eingebettete Vorschau',
    'ru-RU': 'Встроенный предпросмотр',
    'zh-TW': '內嵌預覽',
    'zh-HK': '內嵌預覽'
  },
  'design.ui.structure.only.ba4f09': {
    'en-US': 'STRUCTURE ONLY',
    'zh-CN': '仅结构',
    'ja-JP': '構造のみ',
    'de-DE': 'Nur Struktur',
    'ru-RU': 'Только структура',
    'zh-TW': '僅結構',
    'zh-HK': '僅結構'
  },
  'design.ui.embedded.preview.08818c': {
    'en-US': '{p0} embedded preview',
    'zh-CN': '{p0} 内嵌预览',
    'ja-JP': '{p0} 埋め込みプレビュー',
    'de-DE': 'Eingebettete {p0}-Vorschau',
    'ru-RU': 'Встроенный предпросмотр {p0}',
    'zh-TW': '{p0} 內嵌預覽',
    'zh-HK': '{p0} 內嵌預覽'
  },
  'design.ui.this.xd.package.has.no.valid.714d44': {
    'en-US':
      'This XD package has no valid bounded PNG/JPEG rendition. Its manifest, artboard structure, and resource inventory are still available.',
    'zh-CN': '此 XD 包没有通过限制校验的 PNG/JPEG 预览图，仍可查看清单、画板结构和资源列表。',
    'ja-JP':
      'この XD パッケージには上限内の有効な PNG/JPEG プレビューがありません。マニフェスト、アートボード構造、リソース一覧は確認できます。',
    'de-DE':
      'Dieses XD-Paket enthält keine gültige PNG/JPEG-Vorschau innerhalb der Grenzen. Manifest, Zeichenflächenstruktur und Ressourcenliste bleiben verfügbar.',
    'ru-RU':
      'В пакете XD нет допустимого PNG/JPEG-предпросмотра в пределах ограничений. Манифест, структура монтажных областей и список ресурсов доступны.',
    'zh-TW': '此 XD 包沒有通過限制校驗的 PNG/JPEG 預覽圖，仍可查看清單、畫板結構和資源列表。',
    'zh-HK': '此 XD 包沒有通過限制校驗的 PNG/JPEG 預覽圖，仍可查看清單、畫板結構和資源列表。'
  },
  'design.ui.artboards.0b7d30': {
    'en-US': 'Artboards ({p0})',
    'zh-CN': '画板（{p0}）',
    'ja-JP': 'アートボード（{p0}）',
    'de-DE': 'Zeichenflächen ({p0})',
    'ru-RU': 'Монтажные области ({p0})',
    'zh-TW': '畫板（{p0}）',
    'zh-HK': '畫板（{p0}）'
  },
  'design.ui.no.artboard.metadata.was.present.in.3be5bb': {
    'en-US': 'No artboard metadata was present in the bounded AGC structure.',
    'zh-CN': '有界读取的 AGC 结构中没有画板元数据。',
    'ja-JP': '制限内で読み取った AGC 構造にアートボードのメタデータがありません。',
    'de-DE': 'Die begrenzt gelesene AGC-Struktur enthält keine Zeichenflächenmetadaten.',
    'ru-RU': 'В прочитанной с ограничениями структуре AGC нет метаданных монтажных областей.',
    'zh-TW': '有界讀取的 AGC 結構中沒有畫板中繼資料。',
    'zh-HK': '有界讀取的 AGC 結構中沒有畫板元數據。'
  },
  'design.ui.resources.df7fbd': {
    'en-US': 'Resources ({p0})',
    'zh-CN': '资源（{p0}）',
    'ja-JP': 'リソース（{p0}）',
    'de-DE': 'Ressourcen ({p0})',
    'ru-RU': 'Ресурсы ({p0})',
    'zh-TW': '資源（{p0}）',
    'zh-HK': '資源（{p0}）'
  },
  'design.ui.no.additional.packaged.resources.6a5c47': {
    'en-US': 'No additional packaged resources.',
    'zh-CN': '没有其他封装资源。',
    'ja-JP': '追加の格納リソースはありません。',
    'de-DE': 'Keine weiteren gepackten Ressourcen.',
    'ru-RU': 'Дополнительные ресурсы в пакете отсутствуют.',
    'zh-TW': '沒有其他封裝資源。',
    'zh-HK': '沒有其他封裝資源。'
  },
  'design.ui.read.limits.5290ec': {
    'en-US': 'Read limits',
    'zh-CN': '读取限制',
    'ja-JP': '読み取り制限',
    'de-DE': 'Lesegrenzen',
    'ru-RU': 'Ограничения чтения',
    'zh-TW': '讀取限制',
    'zh-HK': '讀取限制'
  },
  'design.ui.fps.xfl.9e44dd': {
    'en-US': '{p0} × {p1} · {p2} fps · XFL {p3}',
    'zh-CN': '{p0} × {p1} · {p2} fps · XFL {p3}',
    'ja-JP': '{p0} × {p1} · {p2} fps · XFL {p3}',
    'de-DE': '{p0} × {p1} · {p2} fps · XFL {p3}',
    'ru-RU': '{p0} × {p1} · {p2} fps · XFL {p3}',
    'zh-TW': '{p0} × {p1} · {p2} fps · XFL {p3}',
    'zh-HK': '{p0} × {p1} · {p2} fps · XFL {p3}'
  },
  'design.ui.first.frame.9ceee4': {
    'en-US': 'FIRST FRAME',
    'zh-CN': '首帧',
    'ja-JP': '最初のフレーム',
    'de-DE': 'Erstes Bild',
    'ru-RU': 'Первый кадр',
    'zh-TW': '首幀',
    'zh-HK': '首幀'
  },
  'design.ui.bounded.first.frame.preview.609410': {
    'en-US': '{p0} bounded first-frame preview',
    'zh-CN': '{p0} 有界首帧预览',
    'ja-JP': '{p0} 制限付き最初のフレームのプレビュー',
    'de-DE': 'Begrenzte Vorschau des ersten Bildes von {p0}',
    'ru-RU': 'Ограниченный предпросмотр первого кадра {p0}',
    'zh-TW': '{p0} 有界首幀預覽',
    'zh-HK': '{p0} 有界首幀預覽'
  },
  'design.ui.verified.xfl.document.a2f5b8': {
    'en-US': 'Verified XFL document',
    'zh-CN': '已验证的 XFL 文档',
    'ja-JP': '検証済み XFL 文書',
    'de-DE': 'Geprüftes XFL-Dokument',
    'ru-RU': 'Проверенный документ XFL',
    'zh-TW': '已驗證的 XFL 文件',
    'zh-HK': '已驗證的 XFL 文件'
  },
  'design.ui.creator.817b79': {
    'en-US': 'Creator',
    'zh-CN': '创建工具',
    'ja-JP': '作成ツール',
    'de-DE': 'Erstellungsprogramm',
    'ru-RU': 'Средство создания',
    'zh-TW': '創建工具',
    'zh-HK': '創建工具'
  },
  'design.ui.package.7431e3': {
    'en-US': 'Package',
    'zh-CN': '封装包',
    'ja-JP': 'パッケージ',
    'de-DE': 'Paket',
    'ru-RU': 'Пакет',
    'zh-TW': '封裝包',
    'zh-HK': '封裝包'
  },
  'design.ui.entries.78be25': {
    'en-US': '{p0} entries · {p1}',
    'zh-CN': '条目数：{p0} · {p1}',
    'ja-JP': '項目数：{p0} · {p1}',
    'de-DE': 'Einträge: {p0} · {p1}',
    'ru-RU': 'Записей: {p0} · {p1}',
    'zh-TW': '條目數：{p0} · {p1}',
    'zh-HK': '條目數：{p0} · {p1}'
  },
  'design.ui.symbols.resources.a2d8fc': {
    'en-US': '{p0} symbols · {p1} resources',
    'zh-CN': '符号数：{p0} · 资源数：{p1}',
    'ja-JP': 'シンボル数：{p0} · リソース数：{p1}',
    'de-DE': 'Symbole: {p0} · Ressourcen: {p1}',
    'ru-RU': 'Символов: {p0} · ресурсов: {p1}',
    'zh-TW': '符號數：{p0} · 資源數：{p1}',
    'zh-HK': '符號數：{p0} · 資源數：{p1}'
  },
  'design.ui.preview.f1fbb2': {
    'en-US': 'Preview',
    'zh-CN': '预览',
    'ja-JP': 'プレビュー',
    'de-DE': 'Vorschau',
    'ru-RU': 'Предпросмотр',
    'zh-TW': '預覽',
    'zh-HK': '預覽'
  },
  'design.ui.rendered.omitted.9e59bb': {
    'en-US': '{p0} rendered · {p1} omitted',
    'zh-CN': '已渲染：{p0} · 已省略：{p1}',
    'ja-JP': '描画済み：{p0} · 省略：{p1}',
    'de-DE': 'Dargestellt: {p0} · ausgelassen: {p1}',
    'ru-RU': 'Отображено: {p0} · пропущено: {p1}',
    'zh-TW': '已呈現：{p0} · 已省略：{p1}',
    'zh-HK': '已呈現：{p0} · 已省略：{p1}'
  },
  'design.ui.timelines.ff46e7': {
    'en-US': 'Timelines ({p0})',
    'zh-CN': '时间轴（{p0}）',
    'ja-JP': 'タイムライン（{p0}）',
    'de-DE': 'Zeitleisten ({p0})',
    'ru-RU': 'Временные шкалы ({p0})',
    'zh-TW': '時間軸（{p0}）',
    'zh-HK': '時間軸（{p0}）'
  },
  'design.ui.frames.layers.583824': {
    'en-US': '{p0} frames · {p1} layers',
    'zh-CN': '帧数：{p0} · 图层数：{p1}',
    'ja-JP': 'フレーム数：{p0} · レイヤー数：{p1}',
    'de-DE': 'Bilder: {p0} · Ebenen: {p1}',
    'ru-RU': 'Кадров: {p0} · слоёв: {p1}',
    'zh-TW': '幀數：{p0} · 圖層數：{p1}',
    'zh-HK': '幀數：{p0} · 圖層數：{p1}'
  },
  'design.ui.layers.18f822': {
    'en-US': 'Layers ({p0})',
    'zh-CN': '图层（{p0}）',
    'ja-JP': 'レイヤー（{p0}）',
    'de-DE': 'Ebenen ({p0})',
    'ru-RU': 'Слои ({p0})',
    'zh-TW': '圖層（{p0}）',
    'zh-HK': '圖層（{p0}）'
  },
  'design.ui.frames.elements.a5a0b3': {
    'en-US': '{p0} · {p1} frames · {p2} elements{p3}',
    'zh-CN': '{p0} · 帧数：{p1} · 元素数：{p2}{p3}',
    'ja-JP': '{p0} · フレーム数：{p1} · 要素数：{p2}{p3}',
    'de-DE': '{p0} · Bilder: {p1} · Elemente: {p2}{p3}',
    'ru-RU': '{p0} · кадров: {p1} · элементов: {p2}{p3}',
    'zh-TW': '{p0} · 幀數：{p1} · 元素數：{p2}{p3}',
    'zh-HK': '{p0} · 幀數：{p1} · 元素數：{p2}{p3}'
  },
  'design.ui.preview.boundary.8378f0': {
    'en-US': 'Preview boundary',
    'zh-CN': '预览边界',
    'ja-JP': 'プレビューの範囲',
    'de-DE': 'Vorschaugrenzen',
    'ru-RU': 'Границы предпросмотра',
    'zh-TW': '預覽邊界',
    'zh-HK': '預覽邊界'
  },
  'design.ui.only.modern.zip.xfl.based.fla.ebd4b1': {
    'en-US':
      'Only modern ZIP/XFL-based FLA is accepted. The static stage covers bounded first-frame shapes, text, symbols, and PNG/JPEG instances; the timeline and resource inventory remain authoritative when an effect is omitted.',
    'zh-CN':
      '仅接受现代 ZIP/XFL 格式的 FLA。静态舞台在限制范围内显示首帧形状、文本、符号和 PNG/JPEG 实例；省略效果时，以时间轴和资源清单为准。',
    'ja-JP':
      '現行の ZIP/XFL 形式の FLA のみ対応します。静的ステージは制限内で最初のフレームの形状、テキスト、シンボル、PNG/JPEG を表示します。省略された効果はタイムラインとリソース一覧で確認してください。',
    'de-DE':
      'Unterstützt wird modernes ZIP/XFL-basiertes FLA. Die statische Bühne zeigt begrenzt Formen, Text, Symbole und PNG/JPEG-Instanzen des ersten Bildes. Bei ausgelassenen Effekten sind Zeitleiste und Ressourcenliste maßgeblich.',
    'ru-RU':
      'Поддерживается современный FLA на основе ZIP/XFL. Статическая сцена в пределах ограничений показывает фигуры, текст, символы и PNG/JPEG первого кадра. Для пропущенных эффектов ориентируйтесь на временную шкалу и список ресурсов.',
    'zh-TW':
      '僅接受現代 ZIP/XFL 格式的 FLA。靜態舞台在限制範圍內顯示首幀形狀、文字、符號和 PNG/JPEG 實例；省略效果時，以時間軸和資源清單為準。',
    'zh-HK':
      '僅接受現代 ZIP/XFL 格式的 FLA。靜態舞台在限制範圍內顯示首幀形狀、文字、符號和 PNG/JPEG 實例；省略效果時，以時間軸和資源清單為準。'
  },
  'design.ui.read.notes.fc2bee': {
    'en-US': 'Read notes',
    'zh-CN': '读取说明',
    'ja-JP': '読み取りメモ',
    'de-DE': 'Lesehinweise',
    'ru-RU': 'Примечания чтения',
    'zh-TW': '讀取說明',
    'zh-HK': '讀取說明'
  },
  'design.ui.adobe.indesign.c33112': {
    'en-US': 'Adobe InDesign {p0}',
    'zh-CN': 'Adobe InDesign {p0}',
    'ja-JP': 'Adobe InDesign {p0}',
    'de-DE': 'Adobe InDesign {p0}',
    'ru-RU': 'Adobe InDesign {p0}',
    'zh-TW': 'Adobe InDesign {p0}',
    'zh-HK': 'Adobe InDesign {p0}'
  },
  'design.ui.format.database.pages.5a4511': {
    'en-US': 'Format {p0} · {p1} · {p2} database pages',
    'zh-CN': '格式 {p0} · {p1} · 数据库页数 {p2}',
    'ja-JP': '形式 {p0} · {p1} · データベースページ数 {p2}',
    'de-DE': 'Format {p0} · {p1} · Datenbankseiten: {p2}',
    'ru-RU': 'Формат {p0} · {p1} · страниц базы данных: {p2}',
    'zh-TW': '格式 {p0} · {p1} · 資料庫頁數 {p2}',
    'zh-HK': '格式 {p0} · {p1} · 數據庫頁數 {p2}'
  },
  'design.ui.indesign.embedded.by.preview.87f77a': {
    'en-US': 'InDesign embedded {p0} by {p1} preview',
    'zh-CN': 'InDesign 内嵌预览：{p0} × {p1}',
    'ja-JP': 'InDesign 埋め込みプレビュー：{p0} × {p1}',
    'de-DE': 'Eingebettete InDesign-Vorschau: {p0} × {p1}',
    'ru-RU': 'Встроенный предпросмотр InDesign: {p0} × {p1}',
    'zh-TW': 'InDesign 內嵌預覽：{p0} × {p1}',
    'zh-HK': 'InDesign 內嵌預覽：{p0} × {p1}'
  },
  'design.ui.this.native.structure.is.not.safely.d55fbd': {
    'en-US': 'This native structure is not safely addressable.',
    'zh-CN': '无法安全定位此原生结构。',
    'ja-JP': 'このネイティブ構造を安全に参照できません。',
    'de-DE': 'Diese native Struktur kann nicht sicher adressiert werden.',
    'ru-RU': 'Безопасная адресация этой нативной структуры невозможна.',
    'zh-TW': '無法安全定位此原生結構。',
    'zh-HK': '無法安全定位此原生結構。'
  },
  'design.ui.no.saved.document.preview.is.embedded.50f51e': {
    'en-US': 'No saved document preview is embedded.',
    'zh-CN': '未内嵌已保存的文档预览。',
    'ja-JP': '保存済みの文書プレビューが埋め込まれていません。',
    'de-DE': 'Keine gespeicherte Dokumentvorschau eingebettet.',
    'ru-RU': 'Сохранённый предпросмотр документа не встроен.',
    'zh-TW': '未內嵌已儲存的文件預覽。',
    'zh-HK': '未內嵌已儲存的文件預覽。'
  },
  'design.ui.the.native.indd.indt.layout.database.c5380b': {
    'en-US':
      'The native INDD/INDT layout database is proprietary. This browser reader only follows declared master pages and contiguous XMP objects; it never scans arbitrary binary bytes for coincidental JPEG or PNG signatures.',
    'zh-CN':
      '原生 INDD/INDT 版面数据库属于专有格式。浏览器读取器仅跟随已声明的主页面和连续 XMP 对象，不扫描任意二进制字节来猜测 JPEG 或 PNG 签名。',
    'ja-JP':
      'ネイティブの INDD/INDT レイアウトデータベースは独自形式です。宣言されたマスターページと連続 XMP オブジェクトだけを読み取り、任意のバイト列から JPEG/PNG シグネチャを探しません。',
    'de-DE':
      'Die native INDD/INDT-Layoutdatenbank ist proprietär. Der Browserleser folgt nur deklarierten Masterseiten und zusammenhängenden XMP-Objekten; er durchsucht keine beliebigen Binärdaten nach zufälligen JPEG-/PNG-Signaturen.',
    'ru-RU':
      'Нативная база макета INDD/INDT имеет закрытый формат. Просмотрщик следует только объявленным мастер-страницам и непрерывным объектам XMP, не ищет случайные сигнатуры JPEG/PNG в произвольных байтах.',
    'zh-TW':
      "原生 INDD/INDT 版面資料庫屬於專有格式。瀏覽器讀取器僅跟隨已聲明的主頁面和連續 XMP 物件，不掃描任意二進位位元組來猜測 JPEG 或 PNG 簽名。",
    'zh-HK':
      '原生 INDD/INDT 版面數據庫屬於專有格式。瀏覽器讀取器僅跟隨已聲明的主頁面和連續 XMP 物件，不掃描任意二進制字節來猜測 JPEG 或 PNG 簽名。'
  },
  'design.ui.verified.structure.1a23e4': {
    'en-US': 'Verified structure',
    'zh-CN': '已验证的结构',
    'ja-JP': '検証済みの構造',
    'de-DE': 'Geprüfte Struktur',
    'ru-RU': 'Проверенная структура',
    'zh-TW': '已驗證的結構',
    'zh-HK': '已驗證的結構'
  },
  'design.ui.active.master.292374': {
    'en-US': 'Active master',
    'zh-CN': '活动主页面',
    'ja-JP': '使用中のマスターページ',
    'de-DE': 'Aktive Masterseite',
    'ru-RU': 'Активная мастер-страница',
    'zh-TW': '活動主頁面',
    'zh-HK': '活動主頁面'
  },
  'design.ui.sequence.ecfa60': {
    'en-US': '{p0} (sequence {p1})',
    'zh-CN': '{p0}（序列 {p1}）',
    'ja-JP': '{p0}（シーケンス {p1}）',
    'de-DE': '{p0} (Sequenz {p1})',
    'ru-RU': '{p0} (последовательность {p1})',
    'zh-TW': '{p0}（序列 {p1}）',
    'zh-HK': '{p0}（序列 {p1}）'
  },
  'design.ui.database.boundary.f40789': {
    'en-US': 'Database boundary',
    'zh-CN': '数据库边界',
    'ja-JP': 'データベースの範囲',
    'de-DE': 'Datenbankgrenze',
    'ru-RU': 'Граница базы данных',
    'zh-TW': '資料庫邊界',
    'zh-HK': '數據庫邊界'
  },
  'design.ui.bytes.dda44a': {
    'en-US': '{p0} bytes',
    'zh-CN': '{p0} 字节',
    'ja-JP': '{p0} バイト',
    'de-DE': '{p0} Byte',
    'ru-RU': '{p0} байт',
    'zh-TW': "{p0} 位元組",
    'zh-HK': '{p0} 字節'
  },
  'design.ui.contiguous.objects.b753e5': {
    'en-US': 'Contiguous objects',
    'zh-CN': '连续对象',
    'ja-JP': '連続するオブジェクト',
    'de-DE': 'Zusammenhängende Objekte',
    'ru-RU': 'Непрерывные объекты',
    'zh-TW': '連續物件',
    'zh-HK': '連續物件'
  },
  'design.ui.verified.xmp.packets.7a2b4a': {
    'en-US': 'Verified XMP packets',
    'zh-CN': '已验证的 XMP 包',
    'ja-JP': '検証済み XMP パケット',
    'de-DE': 'Geprüfte XMP-Pakete',
    'ru-RU': 'Проверенные пакеты XMP',
    'zh-TW': '已驗證的 XMP 包',
    'zh-HK': '已驗證的 XMP 包'
  },
  'design.ui.xmp.bytes.89338f': {
    'en-US': 'XMP bytes',
    'zh-CN': 'XMP 字节数',
    'ja-JP': 'XMP バイト数',
    'de-DE': 'XMP-Bytes',
    'ru-RU': 'Байты XMP',
    'zh-TW': "XMP 位元組數",
    'zh-HK': 'XMP 字節數'
  },
  'design.ui.none.71f8e7': {
    'en-US': 'none',
    'zh-CN': '无',
    'ja-JP': 'なし',
    'de-DE': 'Keine',
    'ru-RU': 'нет',
    'zh-TW': '無',
    'zh-HK': '無'
  },
  'design.ui.preview.raster.1b4dda': {
    'en-US': 'Preview raster',
    'zh-CN': '预览栅格',
    'ja-JP': 'プレビューのラスター画像',
    'de-DE': 'Vorschauraster',
    'ru-RU': 'Растр предпросмотра',
    'zh-TW': '預覽柵格',
    'zh-HK': '預覽柵格'
  },
  'design.ui.a.preview.exists.only.when.indesign.28cc31': {
    'en-US':
      'A preview exists only when InDesign saved a JPEG/PNG thumbnail inside a structurally verified XMP packet. Full page layout rendering still requires InDesign/IDML conversion.',
    'zh-CN':
      '仅当 InDesign 在已验证结构的 XMP 包中保存了 JPEG/PNG 缩略图时，才有预览。完整版面渲染仍需要 InDesign/IDML 转换。',
    'ja-JP':
      '検証済み XMP パケット内に InDesign が JPEG/PNG サムネイルを保存した場合のみプレビューできます。完全なページ描画には InDesign/IDML への変換が必要です。',
    'de-DE':
      'Eine Vorschau ist nur verfügbar, wenn InDesign eine JPEG/PNG-Miniatur in einem strukturell geprüften XMP-Paket gespeichert hat. Für das vollständige Seitenlayout ist weiterhin eine InDesign-/IDML-Konvertierung erforderlich.',
    'ru-RU':
      'Предпросмотр доступен, только если InDesign сохранил миниатюру JPEG/PNG в структурно проверенном пакете XMP. Полное отображение макета по-прежнему требует преобразования через InDesign/IDML.',
    'zh-TW':
      '僅當 InDesign 在已驗證結構的 XMP 包中儲存了 JPEG/PNG 縮圖時，才有預覽。完整版面呈現仍需要 InDesign/IDML 轉換。',
    'zh-HK':
      '僅當 InDesign 在已驗證結構的 XMP 包中儲存了 JPEG/PNG 縮圖時，才有預覽。完整版面呈現仍需要 InDesign/IDML 轉換。'
  },
  'design.ui.adobe.illustrator.native.pgf.606fad': {
    'en-US': 'Adobe Illustrator · native PGF',
    'zh-CN': 'Adobe Illustrator · 原生 PGF',
    'ja-JP': 'Adobe Illustrator · ネイティブ PGF',
    'de-DE': 'Adobe Illustrator · natives PGF',
    'ru-RU': 'Adobe Illustrator · нативный PGF',
    'zh-TW': 'Adobe Illustrator · 原生 PGF',
    'zh-HK': 'Adobe Illustrator · 原生 PGF'
  },
  'design.ui.artboard.layers.nodes.768ef9': {
    'en-US': 'Artboards: {p0} · layers: {p2} · nodes: {p3} · {p4}',
    'zh-CN': '画板：{p0} · 图层：{p2} · 节点：{p3} · {p4}',
    'ja-JP': 'アートボード：{p0} · レイヤー：{p2} · ノード：{p3} · {p4}',
    'de-DE': 'Zeichenflächen: {p0} · Ebenen: {p2} · Knoten: {p3} · {p4}',
    'ru-RU': 'Монтажные области: {p0} · слои: {p2} · узлы: {p3} · {p4}',
    'zh-TW': '畫板：{p0} · 圖層：{p2} · 節點：{p3} · {p4}',
    'zh-HK': '畫板：{p0} · 圖層：{p2} · 節點：{p3} · {p4}'
  },
  'design.ui.previous.illustrator.artboard.2dc9be': {
    'en-US': 'Previous Illustrator artboard',
    'zh-CN': '上一个 Illustrator 画板',
    'ja-JP': '前の Illustrator アートボード',
    'de-DE': 'Vorherige Illustrator-Zeichenfläche',
    'ru-RU': 'Предыдущая монтажная область Illustrator',
    'zh-TW': '上一個 Illustrator 畫板',
    'zh-HK': '上一個 Illustrator 畫板'
  },
  'design.ui.next.illustrator.artboard.97698a': {
    'en-US': 'Next Illustrator artboard',
    'zh-CN': '下一个 Illustrator 画板',
    'ja-JP': '次の Illustrator アートボード',
    'de-DE': 'Nächste Illustrator-Zeichenfläche',
    'ru-RU': 'Следующая монтажная область Illustrator',
    'zh-TW': '下一個 Illustrator 畫板',
    'zh-HK': '下一個 Illustrator 畫板'
  },
  'design.ui.artboards.d8d8a5': {
    'en-US': 'Artboards',
    'zh-CN': '画板',
    'ja-JP': 'アートボード',
    'de-DE': 'Zeichenflächen',
    'ru-RU': 'Монтажные области',
    'zh-TW': '畫板',
    'zh-HK': '畫板'
  },
  'design.ui.opening.native.illustrator.scene.51c513': {
    'en-US': 'Opening native Illustrator scene…',
    'zh-CN': '正在打开原生 Illustrator 场景…',
    'ja-JP': 'ネイティブ Illustrator シーンを開いています…',
    'de-DE': 'Native Illustrator-Szene wird geöffnet…',
    'ru-RU': 'Открытие нативной сцены Illustrator…',
    'zh-TW': '正在打開原生 Illustrator 場景…',
    'zh-HK': '正在打開原生 Illustrator 場景…'
  },
  'design.ui.artboard.73f0ba': {
    'en-US': 'Artboard {p0}',
    'zh-CN': '画板 {p0}',
    'ja-JP': 'アートボード {p0}',
    'de-DE': 'Zeichenfläche {p0}',
    'ru-RU': 'Монтажная область {p0}',
    'zh-TW': '畫板 {p0}',
    'zh-HK': '畫板 {p0}'
  },
  'design.ui.pt.081718': {
    'en-US': '{p0} × {p1} pt',
    'zh-CN': '{p0} × {p1} pt',
    'ja-JP': '{p0} × {p1} pt',
    'de-DE': '{p0} × {p1} pt',
    'ru-RU': '{p0} × {p1} pt',
    'zh-TW': '{p0} × {p1} pt',
    'zh-HK': '{p0} × {p1} pt'
  },
  'design.ui.rendering.in.worker.3311db': {
    'en-US': 'Rendering {p0} in Worker…',
    'zh-CN': '正在 Worker 中渲染 {p0}…',
    'ja-JP': 'Worker で {p0} を描画しています…',
    'de-DE': '{p0} wird im Worker dargestellt…',
    'ru-RU': 'Отображение {p0} в Worker…',
    'zh-TW': '正在 Worker 中呈現 {p0}…',
    'zh-HK': '正在 Worker 中呈現 {p0}…'
  },
  'design.ui.px.unsupported.feature.group.s.9000e5': {
    'en-US': '{p0} · {p1} × {p2}px · {p3} · {p4} unsupported feature group(s)',
    'zh-CN': '{p0} · {p1} × {p2}px · {p3} · 不支持的功能组：{p4}',
    'ja-JP': '{p0} · {p1} × {p2}px · {p3} · 未対応の機能グループ：{p4}',
    'de-DE': '{p0} · {p1} × {p2}px · {p3} · nicht unterstützte Funktionsgruppen: {p4}',
    'ru-RU': '{p0} · {p1} × {p2}px · {p3} · неподдерживаемых групп функций: {p4}',
    'zh-TW': '{p0} · {p1} × {p2}px · {p3} · 不支援的功能組：{p4}',
    'zh-HK': '{p0} · {p1} × {p2}px · {p3} · 不支援的功能組：{p4}'
  },
  'design.ui.adobe.illustrator.selecting.preview.representation.8f529c': {
    'en-US': 'Adobe Illustrator · selecting preview representation',
    'zh-CN': 'Adobe Illustrator · 正在选择预览表示',
    'ja-JP': 'Adobe Illustrator · プレビュー形式を選択中',
    'de-DE': 'Adobe Illustrator · Vorschauformat wird gewählt',
    'ru-RU': 'Adobe Illustrator · выбор представления предпросмотра',
    'zh-TW': 'Adobe Illustrator · 正在選擇預覽表示',
    'zh-HK': 'Adobe Illustrator · 正在選擇預覽表示'
  },
  'design.ui.pdf.surface.c1bf72': {
    'en-US': 'PDF surface',
    'zh-CN': 'PDF 表面',
    'ja-JP': 'PDF 表示',
    'de-DE': 'PDF-Darstellung',
    'ru-RU': 'Представление PDF',
    'zh-TW': 'PDF 表面',
    'zh-HK': 'PDF 表面'
  },
  'design.ui.native.pgf.08229f': {
    'en-US': 'Native PGF',
    'zh-CN': '原生 PGF',
    'ja-JP': 'ネイティブ PGF',
    'de-DE': 'Natives PGF',
    'ru-RU': 'Нативный PGF',
    'zh-TW': '原生 PGF',
    'zh-HK': '原生 PGF'
  },
  'design.ui.opening.native.pgf.private.source.scene.5c8fb3': {
    'en-US': 'Opening native PGF/private-source scene in a Dedicated Worker…',
    'zh-CN': '正在独立 Worker 中打开原生 PGF／私有来源场景…',
    'ja-JP': '専用 Worker でネイティブ PGF・独自形式のシーンを開いています…',
    'de-DE': 'Native PGF-Szene aus proprietären Quelldaten wird im eigenen Worker geöffnet…',
    'ru-RU': 'Открытие нативной PGF-сцены из закрытого исходного формата в отдельном Worker…',
    'zh-TW': '正在獨立 Worker 中打開原生 PGF／私有來源場景…',
    'zh-HK': '正在獨立 Worker 中打開原生 PGF／私有來源場景…'
  },
  'design.ui.opening.the.saved.pdf.compatible.representation.c7cb26': {
    'en-US': 'Opening the saved PDF-compatible representation…',
    'zh-CN': '正在打开已保存的 PDF 相容表示…',
    'ja-JP': '保存済みの PDF 互換表示を開いています…',
    'de-DE': 'Gespeicherte PDF-kompatible Darstellung wird geöffnet…',
    'ru-RU': 'Открытие сохранённого PDF-совместимого представления…',
    'zh-TW': '正在打開已儲存的 PDF 相容表示…',
    'zh-HK': '正在打開已儲存的 PDF 相容表示…'
  },
  'design.ui.native.pgf.scene.layers.and.artboards.0b75eb': {
    'en-US': 'Native PGF scene · layers and artboards come from illustrator-pgf',
    'zh-CN': '原生 PGF 场景 · 图层与画板来自 illustrator-pgf',
    'ja-JP': 'ネイティブ PGF シーン · レイヤーとアートボードは illustrator-pgf で解析',
    'de-DE': 'Native PGF-Szene · Ebenen und Zeichenflächen aus illustrator-pgf',
    'ru-RU': 'Нативная PGF-сцена · слои и монтажные области из illustrator-pgf',
    'zh-TW': '原生 PGF 場景 · 圖層與畫板來自 illustrator-pgf',
    'zh-HK': '原生 PGF 場景 · 圖層與畫板來自 illustrator-pgf'
  },
  'design.ui.pdf.compatible.surface.switch.to.native.1268f5': {
    'en-US': 'PDF-compatible surface · switch to Native PGF for parsed artboards and layers',
    'zh-CN': 'PDF 相容表面 · 切换到原生 PGF 可查看已解析的画板和图层',
    'ja-JP': 'PDF 互換表示 · 解析済みのアートボードとレイヤーはネイティブ PGF に切り替えて確認',
    'de-DE':
      'PDF-kompatible Darstellung · für verarbeitete Zeichenflächen und Ebenen zu nativem PGF wechseln',
    'ru-RU':
      'PDF-совместимое представление · для обработанных монтажных областей и слоёв переключитесь на нативный PGF',
    'zh-TW': 'PDF 相容表面 · 切換到原生 PGF 可查看已解析的畫板和圖層',
    'zh-HK': 'PDF 相容表面 · 切換到原生 PGF 可查看已解析的畫板和圖層'
  },
  'design.ui.pdf.compatible.illustrator.surface.9a601c': {
    'en-US': 'PDF-compatible Illustrator surface',
    'zh-CN': 'PDF 相容的 Illustrator 表面',
    'ja-JP': 'PDF 互換の Illustrator 表示',
    'de-DE': 'PDF-kompatible Illustrator-Darstellung',
    'ru-RU': 'PDF-совместимое представление Illustrator',
    'zh-TW': 'PDF 相容的 Illustrator 表面',
    'zh-HK': 'PDF 相容的 Illustrator 表面'
  },
  'design.ui.native.pgf.unavailable.falling.back.to.a6cb99': {
    'en-US': 'Native PGF unavailable: {p0}. Falling back to the PDF-compatible surface.',
    'zh-CN': '原生 PGF 不可用：{p0}。改用 PDF 相容表面。',
    'ja-JP': 'ネイティブ PGF を利用できません：{p0}。PDF 互換表示に切り替えます。',
    'de-DE': 'Natives PGF nicht verfügbar: {p0}. Wechsel zur PDF-kompatiblen Darstellung.',
    'ru-RU': 'Нативный PGF недоступен: {p0}. Переход к PDF-совместимому представлению.',
    'zh-TW': '原生 PGF 不可用：{p0}。改用 PDF 相容表面。',
    'zh-HK': '原生 PGF 不可用：{p0}。改用 PDF 相容表面。'
  },
  'design.ui.native.pgf.unavailable.2cd1f7': {
    'en-US': 'Native PGF unavailable: {p0}',
    'zh-CN': '原生 PGF 不可用：{p0}',
    'ja-JP': 'ネイティブ PGF を利用できません：{p0}',
    'de-DE': 'Natives PGF nicht verfügbar: {p0}',
    'ru-RU': 'Нативный PGF недоступен: {p0}',
    'zh-TW': '原生 PGF 不可用：{p0}',
    'zh-HK': '原生 PGF 不可用：{p0}'
  },
  'design.ui.layers.7c3bc0': {
    'en-US': '{p0} · {p1} × {p2} · {p3} layers · {p4} {p5}',
    'zh-CN': '{p0} · {p1} × {p2} · 图层数：{p3} · {p4} {p5}',
    'ja-JP': '{p0} · {p1} × {p2} · レイヤー数：{p3} · {p4} {p5}',
    'de-DE': '{p0} · {p1} × {p2} · Ebenen: {p3} · {p4} {p5}',
    'ru-RU': '{p0} · {p1} × {p2} · слоёв: {p3} · {p4} {p5}',
    'zh-TW': '{p0} · {p1} × {p2} · 圖層數：{p3} · {p4} {p5}',
    'zh-HK': '{p0} · {p1} × {p2} · 圖層數：{p3} · {p4} {p5}'
  },
  'design.ui.merged.0c4455': {
    'en-US': 'Merged',
    'zh-CN': '合成图',
    'ja-JP': '合成画像',
    'de-DE': 'Gesamtbild',
    'ru-RU': 'Сводное изображение',
    'zh-TW': '合成圖',
    'zh-HK': '合成圖'
  },
  'design.ui.restore.the.embedded.merged.composite.e26241': {
    'en-US': 'Restore the embedded merged composite',
    'zh-CN': '恢复内嵌合成图',
    'ja-JP': '埋め込み合成画像を復元',
    'de-DE': 'Eingebettetes Gesamtbild wiederherstellen',
    'ru-RU': 'Восстановить встроенное сводное изображение',
    'zh-TW': '恢復內嵌合成圖',
    'zh-HK': '恢復內嵌合成圖'
  },
  'design.ui.rendering.selected.layers.2a5de9': {
    'en-US': 'Rendering selected layers…',
    'zh-CN': '正在渲染所选图层…',
    'ja-JP': '選択したレイヤーを描画しています…',
    'de-DE': 'Ausgewählte Ebenen werden dargestellt…',
    'ru-RU': 'Отображение выбранных слоёв…',
    'zh-TW': '正在呈現所選圖層…',
    'zh-HK': '正在呈現所選圖層…'
  },
  'design.ui.interactive.layer.composite.cec553': {
    'en-US': 'Interactive layer composite',
    'zh-CN': '交互式图层合成',
    'ja-JP': 'インタラクティブなレイヤー合成',
    'de-DE': 'Interaktives Ebenengesamtbild',
    'ru-RU': 'Интерактивное сводное изображение слоёв',
    'zh-TW': '交互式圖層合成',
    'zh-HK': '交互式圖層合成'
  },
  'design.ui.show.photoshop.layer.a96960': {
    'en-US': 'Show Photoshop layer {p0}',
    'zh-CN': '显示 Photoshop 图层 {p0}',
    'ja-JP': 'Photoshop レイヤー {p0} を表示',
    'de-DE': 'Photoshop-Ebene {p0} anzeigen',
    'ru-RU': 'Показать слой Photoshop {p0}',
    'zh-TW': '顯示 Photoshop 圖層 {p0}',
    'zh-HK': '顯示 Photoshop 圖層 {p0}'
  }
} satisfies Record<string, Record<FileViewerResolvedLocale, string>>
