import JSZip from 'jszip';
import {
  Charts,
  MediaFiles,
  genGlobalCSS,
  getContentTypes,
  getSlideSizeAndSetDefaultTextStyle,
  processSingleSlide, readXmlFile,
  setters
} from './support/vendor'

const PPTX_DIAGNOSTIC_ERROR_NAME = 'PptxDiagnosticError';

function stringifyErrorDetail(error) {
  if (error === undefined || error === null) {
    return '';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error.message === 'string' && error.message) {
    return error.message;
  }
  try {
    const serialized = JSON.stringify(error);
    return serialized && serialized !== '{}' ? serialized : String(error);
  } catch {
    return String(error);
  }
}

function createPptxDiagnosticError(code, stage, message, detailOrError, hint) {
  const detail = stringifyErrorDetail(detailOrError);
  return {
    name: PPTX_DIAGNOSTIC_ERROR_NAME,
    code,
    stage,
    message,
    detail,
    hint,
  };
}

function isPptxDiagnosticError(error) {
  return Boolean(
    error &&
    typeof error === 'object' &&
    (error.name === PPTX_DIAGNOSTIC_ERROR_NAME || error.code || error.stage)
  );
}

function normalizePptxWorkerError(error, stage = 'parse') {
  if (isPptxDiagnosticError(error)) {
    return {
      name: PPTX_DIAGNOSTIC_ERROR_NAME,
      code: error.code || 'PPTX_PARSE_FAILED',
      stage: error.stage || stage,
      message: error.message || 'PPTX 文件解析失败。',
      detail: error.detail || stringifyErrorDetail(error),
      hint: error.hint,
    };
  }
  return createPptxDiagnosticError(
    'PPTX_PARSE_FAILED',
    stage,
    'PPTX 文件解析失败。',
    error,
    '请确认文件是完整的 PowerPoint OpenXML 文件，并检查浏览器控制台中的原始错误。'
  );
}

function requireZipEntry(zip, filename, code, stage, message, hint) {
  if (!zip || !zip.file(filename)) {
    throw createPptxDiagnosticError(code, stage, message, filename, hint);
  }
}

/**
 * 导出唯一的处理入口，交由worker处置
 * @param setOnMessage worker消息处理器设置入口
 * @param postMessage 发送回主线程的消息回调
 */
export default function process(setOnMessage, postMessage) {
  // 设置worker通信回调处理器
  setOnMessage(async ({ type, data, options, IE11 }) => {
    if (type === 'processPPTX') {
      try {
        setters.settings = options;
        setters.processFullTheme = options.themeProcess;
        setters.IE11 = IE11
        await processPPTX(data)
      } catch (e) {
        console.error('AN ERROR HAPPENED DURING processPPTX', e)
        postMessage({
          type: 'ERROR',
          data: normalizePptxWorkerError(e)
        })
      }
    }
  }, e => {
    postMessage(e);
  });

  /**
   * 从zip压缩格式读取内容
   */
  async function readZip(file) {
    if (!file || typeof file.byteLength !== 'number' || file.byteLength < 10) {
      throw createPptxDiagnosticError(
        'PPTX_FILE_EMPTY',
        'read-zip',
        'PPTX 文件为空或过小，无法读取。',
        `byteLength=${file && typeof file.byteLength === 'number' ? file.byteLength : 'unknown'}`,
        '请检查文件是否下载完整，或服务端是否返回了空响应。'
      );
    }
    // 异步加载
    try {
      return await JSZip.loadAsync(file)
    } catch (error) {
      throw createPptxDiagnosticError(
        'PPTX_INVALID_ZIP',
        'read-zip',
        'PPTX 文件不是有效的 OpenXML 压缩包。',
        error,
        '请确认文件没有损坏，且接口返回的不是 HTML、JSON、登录页或错误页。'
      );
    }
  }

  /**
   * 处理pptx文件，唯一主入口
   * @param data 二进制数据
   */
  async function processPPTX(data) {
    MediaFiles.MsgQueue.length = 0;
    // A reused main-thread engine must not return charts from prior documents.
    // Replace the queue so a previous caller's result remains an immutable snapshot.
    Charts.MsgQueue = [];
    Charts.isDone = false;
    const zip = await readZip(data)
    const dateBefore = new Date();

    requireZipEntry(
      zip,
      '[Content_Types].xml',
      'PPTX_MISSING_CONTENT_TYPES',
      'read-content-types',
      'PPTX 文件缺少 [Content_Types].xml，无法识别内部结构。',
      '这通常表示文件不是标准 PPTX，或下载/上传过程中内容被截断。'
    );
    requireZipEntry(
      zip,
      'ppt/presentation.xml',
      'PPTX_MISSING_PRESENTATION',
      'read-presentation',
      'PPTX 文件缺少 ppt/presentation.xml，无法读取幻灯片列表。',
      '请确认文件是 PowerPoint 演示文稿，而不是其他 Office/OpenXML 文件。'
    );

    // 声明一个发送函数
    const sendIfPossible = index => {
      if (finished[index] && current === index) {
        postMessage(finished[current++]);
        delete finished[index];
        sendIfPossible(current);
      }
    }

    // 提前完成的缓存
    const finished = {};
    // 下标记录，要求有序
    let current = -1;
    // 获取缩略图
    if (zip.file('docProps/thumbnail.jpeg')) {
      const pptxThumbImg = await zip.file('docProps/thumbnail.jpeg').async('base64')
      postMessage({
        type: 'pptx-thumb',
        data: pptxThumbImg,
        slide_num: current++
      });
    } else {
      current = 0;
    }
    // 获取内容类型
    const filesInfo = await getContentTypes(zip);
    const slides = Array.isArray(filesInfo && filesInfo['slides']) ? filesInfo['slides'] : [];
    if (!slides.length) {
      throw createPptxDiagnosticError(
        'PPTX_NO_SLIDES',
        'read-slide-list',
        'PPTX 文件中没有找到可预览的幻灯片。',
        'slides.length=0',
        '请确认文件内存在 ppt/slides/slide*.xml，或重新保存演示文稿后再预览。'
      );
    }
    // 获取总幻灯片张数，并获取默认字体风格
    const slideSize = await getSlideSizeAndSetDefaultTextStyle(zip);
    // 获取表格样式
    setters.tableStyles = await readXmlFile(zip, 'ppt/tableStyles.xml');
    console.log("slideSize: ", slideSize)
    // 发送一个大小
    postMessage({
      type: 'slideSize',
      data: slideSize,
      slide_num: current++,
    });

    // 逐个读取slide，并发处理，注意，需要传入顺序，保证幻灯片是正确的顺序插入的
    const numOfSlides = slides.length;
    let renderedSlideCount = 0;
    for (let i = 0; i < numOfSlides; i++) {
      // 取得名字和下标
      const path = slides[i];
      if (!zip.file(path)) {
        throw createPptxDiagnosticError(
          'PPTX_MISSING_SLIDE',
          'read-slide',
          `PPTX 文件缺少第 ${i + 1} 页幻灯片内容。`,
          path,
          '请确认 PPTX 包内 slide 文件完整，或重新保存/重新上传该文件。'
        );
      }
      const first = path.includes('/') ? path.lastIndexOf('/') + 1 : 0;
      const last = path.includes('.') ? path.lastIndexOf('.') : path.length;
      const filename = path.substring(first, last);
      // OOXML part names are identifiers, not presentation positions. PowerPoint
      // keeps gaps after deleted slides (for example slide1.xml, slide21.xml,
      // slide22.xml), so the worker queue must use the resolved presentation
      // order instead of waiting for missing physical part numbers.
      const slideNumber = i + 1;
      // 最终渲染
      let body;
      let slideMedia = [];
      try {
        MediaFiles.MsgQueue.length = 0;
        const slideHtml = await processSingleSlide(zip, path, i, slideSize);
        slideMedia = MediaFiles.MsgQueue.splice(0);
        renderedSlideCount += 1;
        body = {
          type: 'slide',
          data: slideHtml,
          slide_num: slideNumber,
          file_name: filename
        };
      } catch (error) {
        MediaFiles.MsgQueue.length = 0;
        body = {
          type: 'slide-error',
          data: createPptxDiagnosticError(
          'PPTX_SLIDE_RENDER_FAILED',
          'render-slide',
          `PPTX 第 ${slideNumber || i + 1} 页解析失败。`,
          error,
          `请检查 ${path} 及其关联的图片、主题、布局或图表资源是否完整。`
          ),
          slide_num: slideNumber,
          file_name: filename
        };
      }
      for (const media of slideMedia) {
        const transfer = media.buffer instanceof ArrayBuffer ? [media.buffer] : [];
        postMessage({
          type: 'media',
          data: media
        }, transfer);
      }
      // 根据顺序发送，前面的没发送需要先等待，一旦前面发送完毕，后面的会立即触发
      // 当前顺位，发送，并检测后面排队的，顺便发送了
      if (current === slideNumber) {
        postMessage(body);
        sendIfPossible(++current)
      } else {
        finished[slideNumber] = body;
      }
      postMessage({
        type: 'progress-update',
        slide_num: (numOfSlides + i + 1),
        data: (i + 1) * 100 / numOfSlides
      });
    }

    if (renderedSlideCount === 0) {
      throw createPptxDiagnosticError(
        'PPTX_NO_RENDERABLE_SLIDES',
        'render-slide',
        'PPTX 中没有可成功渲染的幻灯片。',
        `failedSlides=${numOfSlides}`,
        '请检查幻灯片、布局、主题以及关联资源是否完整。'
      );
    }

    postMessage({
      type: 'globalCSS',
      data: genGlobalCSS()
    });

    postMessage({
      type: 'ExecutionTime',
      data: new Date() - dateBefore,
      charts: Charts,
    });
    MediaFiles.MsgQueue.length = 0;
    return finished;
  }
}
