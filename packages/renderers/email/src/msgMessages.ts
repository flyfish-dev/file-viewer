import { createFileViewerTranslator, type FileViewerI18nInput } from '@file-viewer/core';

export type MsgNotice = 'email.msg.rtfUnavailable' | 'email.msg.inlineUnavailable'
  | 'email.msg.noBody' | 'email.msg.protected';
type Labels = Record<MsgNotice | 'bcc' | 'sender' | 'close', string>;

export const getMsgLabels = (options?: FileViewerI18nInput): Labels => {
  const t = createFileViewerTranslator(options);
  return {
    get bcc() { return t('email.msg.bcc'); },
    get sender() { return t('email.msg.sender'); },
    get close() { return t('email.msg.close'); },
    get 'email.msg.rtfUnavailable'() { return t('email.msg.rtfUnavailable'); },
    get 'email.msg.inlineUnavailable'() { return t('email.msg.inlineUnavailable'); },
    get 'email.msg.noBody'() { return t('email.msg.noBody'); },
    get 'email.msg.protected'() { return t('email.msg.protected'); },
  };
};
