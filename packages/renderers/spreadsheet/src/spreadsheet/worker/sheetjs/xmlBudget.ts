import type JSZip from 'jszip';

declare module 'jszip' {
  interface JSZipObject {
    internalStream(type: 'uint8array'): JSZip.JSZipStreamHelper<Uint8Array>;
  }
}

export interface XmlReadBudget {
  maxPartBytes: number;
  remainingBytes: number;
}

export const readBoundedZipText = (
  file: JSZip.JSZipObject,
  budget: XmlReadBudget,
): Promise<string> => {
  if (budget.remainingBytes <= 0)
    return Promise.reject(new Error('Workbook XML exceeds the preview limit'));
  return new Promise((resolve, reject) => {
    const stream = file.internalStream('uint8array');
    const decoder = new TextDecoder();
    const text: string[] = [];
    let bytes = 0;
    let finished = false;
    stream.on('data', (chunk) => {
      if (finished) return;
      bytes += chunk.byteLength;
      budget.remainingBytes -= chunk.byteLength;
      if (bytes > budget.maxPartBytes || budget.remainingBytes < 0) {
        finished = true;
        stream.pause();
        text.length = 0;
        reject(new Error('Workbook XML exceeds the preview limit'));
        return;
      }
      text.push(decoder.decode(chunk, { stream: true }));
    });
    stream.on('error', (error) => {
      if (finished) return;
      finished = true;
      text.length = 0;
      reject(error);
    });
    stream.on('end', () => {
      if (finished) return;
      finished = true;
      resolve(text.join('') + decoder.decode());
    });
    stream.resume();
  });
};
