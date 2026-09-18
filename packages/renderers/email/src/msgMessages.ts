import { resolveFileViewerLocale, type FileViewerI18nInput } from '@file-viewer/core';

// Renderer-owned MAPI notices do not add format-specific options to core.
export type MsgNotice = 'email.msg.rtfUnavailable' | 'email.msg.inlineUnavailable'
  | 'email.msg.noBody' | 'email.msg.protected';
type Labels = Record<MsgNotice | 'bcc' | 'sender' | 'close', string>;
const messages: Record<'en-US' | 'zh-CN' | 'ja-JP' | 'de-DE', Labels> = {
  'en-US': {
    bcc: 'Bcc', sender: 'Sender', close: 'Close attachment preview',
    'email.msg.rtfUnavailable': 'Rich-text rendering is unavailable. The readable plain-text body is shown when available. Install the RTF capability to render RTF-only messages.',
    'email.msg.inlineUnavailable': 'An inline image could not be displayed. The original attachment remains available.',
    'email.msg.noBody': 'This Outlook item has no readable email body. Its metadata and embedded attachments are shown.',
    'email.msg.protected': 'This message is protected or signed. Decryption and signature verification are not performed by this viewer.',
  },
  'zh-CN': {
    bcc: '密送', sender: '代发人', close: '关闭附件预览',
    'email.msg.rtfUnavailable': '富文本正文暂不可渲染，已尽可能显示纯文本正文。仅含 RTF 的邮件需要安装 RTF 预览能力。',
    'email.msg.inlineUnavailable': '部分内嵌图片无法显示，原始附件仍保留。',
    'email.msg.noBody': '此 Outlook 项目不含可读邮件正文，已展示元数据及内嵌附件。',
    'email.msg.protected': '此邮件包含加密或签名内容，本预览器不进行解密或签名验证。',
  },
  'ja-JP': {
    bcc: 'Bcc', sender: '送信者', close: '添付ファイルのプレビューを閉じる',
    'email.msg.rtfUnavailable': 'リッチテキストを表示できません。可能な場合はプレーンテキストを表示します。RTF 形式の本文には RTF プレビュー機能が必要です。',
    'email.msg.inlineUnavailable': '一部の埋め込み画像を表示できません。元の添付ファイルは保持されています。',
    'email.msg.noBody': 'この Outlook アイテムには表示可能なメール本文がありません。メタデータと添付ファイルを表示します。',
    'email.msg.protected': 'このメールには保護または署名が含まれます。復号と署名検証は行いません。',
  },
  'de-DE': {
    bcc: 'Bcc', sender: 'Absender', close: 'Anhangvorschau schließen',
    'email.msg.rtfUnavailable': 'Die Rich-Text-Darstellung ist nicht verfügbar. Wenn möglich, wird Klartext angezeigt. Für RTF-Nachrichten ist die RTF-Vorschaufunktion erforderlich.',
    'email.msg.inlineUnavailable': 'Ein eingebettetes Bild konnte nicht angezeigt werden. Der Originalanhang bleibt verfügbar.',
    'email.msg.noBody': 'Dieses Outlook-Element enthält keinen lesbaren Nachrichtentext. Metadaten und eingebettete Anhänge werden angezeigt.',
    'email.msg.protected': 'Diese Nachricht ist geschützt oder signiert. Entschlüsselung und Signaturprüfung werden nicht durchgeführt.',
  },
};
export const getMsgLabels = (options?: FileViewerI18nInput): Labels => messages[resolveFileViewerLocale(options)];
