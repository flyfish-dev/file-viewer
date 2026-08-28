import tinycolor from 'tinycolor2'
import { parse } from './txml'
import * as dingbatToUnicode from "dingbat-to-unicode";
import UTIFModule from 'utif';
import { normalizeJpegExifOrientation } from './image.js';
import { convertMetafileToSvg } from './metafile/vector.js';
import {
  formatSvgPoints,
  getInverseCenteredShapeTransform,
  getTrapezoidPoints
} from './geometry.js';
import {
  DRAWINGML_SINGLE_LINE_HEIGHT,
  resolveDrawingMlTableCellInsets,
  resolveDrawingMlTextRotation
} from './layout.js';

const UTIF = UTIFModule.default || UTIFModule;

// 共享变量，记录图表信息
export const Charts = {
  MsgQueue: [],
  isDone: false
}

export const MediaFiles = {
  MsgQueue: []
}

//var worker;
let slideLayoutClrOvride = ''
let isIE11 = false;

//var slideLayoutClrOvride = "";

let defaultTextStyle = null;

let chartID = 0;

let appVersion;

const rtl_langs_array = [ 'he-IL', 'ar-AE', 'ar-SA', 'dv-MV', 'fa-IR', 'ur-PK' ];

const CSS_PX_PER_INCH = 96;
const EMU_PER_INCH = 914400;
const POINTS_PER_INCH = 72;
const slideFactor = CSS_PX_PER_INCH / EMU_PER_INCH;
const fontSizeFactor = CSS_PX_PER_INCH / POINTS_PER_INCH;
const asArray = value => value === undefined || value === null ? [] : (Array.isArray(value) ? value : [value]);
const toFiniteNumber = (value, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const DEFAULT_APP_VERSION = 16;
const DEFAULT_SLIDE_EMU_SIZE = { cx: 9144000, cy: 6858000 };
const OPENXML_REL_PREFIX = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/";
const MS_REL_PREFIX = "http://schemas.microsoft.com/office/2007/relationships/";

function isConnectorShapeType(shapeType) {
  return shapeType === "line" ||
    shapeType === "straightConnector1" ||
    /^bentConnector[2-5]$/.test(shapeType || "") ||
    /^curvedConnector[2-5]$/.test(shapeType || "");
}

function getPresetGeometryAdjustments(node, defaults) {
  const adjustments = Object.assign({}, defaults);
  const guides = asArray(getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]));
  guides.forEach(function (guide) {
    const attrs = guide && guide["attrs"];
    if (!attrs || !Object.prototype.hasOwnProperty.call(adjustments, attrs["name"])) {
      return;
    }
    const formulaMatch = /^val\s+(-?(?:\d+(?:\.\d*)?|\.\d+))$/.exec(String(attrs["fmla"] || "").trim());
    if (!formulaMatch) {
      return;
    }
    const value = Number(formulaMatch[1]);
    if (Number.isFinite(value)) {
      adjustments[attrs["name"]] = value;
    }
  });
  return adjustments;
}

export function normalizeConnectorPoints(points) {
  const normalized = [];
  points.forEach(function (point) {
    const previous = normalized[normalized.length - 1];
    if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) {
      normalized.push(point);
    }
  });
  if (normalized.length === 1 && points.length > 1) {
    normalized.push(normalized[0]);
  }
  return normalized;
}

export function getBentConnectorPoints(shapeType, node, width, height) {
  const w = toFiniteNumber(width, 0);
  const h = toFiniteNumber(height, 0);
  const adjustments = getPresetGeometryAdjustments(node, {
    adj1: 50000,
    adj2: 50000,
    adj3: 50000
  });
  const x1 = w * adjustments.adj1 / 100000;
  const y2 = h * adjustments.adj2 / 100000;
  const x3 = w * adjustments.adj3 / 100000;

  switch (shapeType) {
    case "bentConnector2":
      return normalizeConnectorPoints([ [ 0, 0 ], [ w, 0 ], [ w, h ] ]);
    case "bentConnector3":
      return normalizeConnectorPoints([ [ 0, 0 ], [ x1, 0 ], [ x1, h ], [ w, h ] ]);
    case "bentConnector4":
      return normalizeConnectorPoints([ [ 0, 0 ], [ x1, 0 ], [ x1, y2 ], [ w, y2 ], [ w, h ] ]);
    case "bentConnector5":
      return normalizeConnectorPoints([ [ 0, 0 ], [ x1, 0 ], [ x1, y2 ], [ x3, y2 ], [ x3, h ], [ w, h ] ]);
    default:
      return [];
  }
}

function getConnectorMarkerAttributes(shpId, headEndNodeAttrs, tailEndNodeAttrs) {
  var attributes = "";
  if (headEndNodeAttrs !== undefined && (headEndNodeAttrs["type"] === "triangle" || headEndNodeAttrs["type"] === "arrow")) {
    attributes += "marker-start='url(#markerTriangle_" + shpId + ")' ";
  }
  if (tailEndNodeAttrs !== undefined && (tailEndNodeAttrs["type"] === "triangle" || tailEndNodeAttrs["type"] === "arrow")) {
    attributes += "marker-end='url(#markerTriangle_" + shpId + ")' ";
  }
  return attributes;
}

export function getConnectorViewportStyle(shapeType, width, height) {
  if (!isConnectorShapeType(shapeType)) {
    return "";
  }
  return " min-width:1px; min-height:1px; overflow:visible; transform-origin:" +
    (toFiniteNumber(width, 0) / 2) + "px " + (toFiniteNumber(height, 0) / 2) + "px;";
}

function normalizePartPath(path) {
  const parts = [];
  String(path || "").split("/").forEach(function (part) {
    if (part === "" || part === ".") {
      return;
    }
    if (part === "..") {
      parts.pop();
      return;
    }
    parts.push(part);
  });
  return parts.join("/");
}

function getPartDir(partPath) {
  const normalized = normalizePartPath(partPath);
  const index = normalized.lastIndexOf("/");
  return index === -1 ? "" : normalized.slice(0, index);
}

function resolvePartTarget(sourcePartPath, target) {
  if (!target) {
    return "";
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.charAt(0) === "#") {
    return target;
  }
  if (target.charAt(0) === "/") {
    return normalizePartPath(target.slice(1));
  }
  return normalizePartPath((getPartDir(sourcePartPath) ? getPartDir(sourcePartPath) + "/" : "") + target);
}

function getRelsPath(partPath) {
  const dir = getPartDir(partPath);
  const name = normalizePartPath(partPath).split("/").pop();
  return (dir ? dir + "/_rels/" : "_rels/") + name + ".rels";
}

function getRelationshipList(relsContent) {
  return asArray(getTextByPathList(relsContent, [ "Relationships", "Relationship" ]));
}

function getRelationshipTypeName(type) {
  return String(type || "").replace(OPENXML_REL_PREFIX, "").replace(MS_REL_PREFIX, "");
}

function addRelationshipResource(targetObj, relationship, sourcePartPath) {
  const attrs = relationship && relationship["attrs"] ? relationship["attrs"] : {};
  if (!attrs["Id"]) {
    return;
  }
  targetObj[attrs["Id"]] = {
    "type": getRelationshipTypeName(attrs["Type"]),
    "target": resolvePartTarget(sourcePartPath, attrs["Target"])
  };
}

function getEmptyIndexedNodes() {
  return { "idTable": {}, "idxTable": {}, "typeTable": {} };
}

function indexNodesSafely(content) {
  if (!content) {
    return getEmptyIndexedNodes();
  }
  try {
    return indexNodes(content);
  } catch (error) {
    console.warn("Unable to index PPTX layout/master nodes", error);
    return getEmptyIndexedNodes();
  }
}

async function getPresentationSlideOrder(zip, fallbackSlides) {
  try {
    const presentation = await readXmlFile(zip, "ppt/presentation.xml");
    const rels = await readXmlFile(zip, getRelsPath("ppt/presentation.xml"));
    const relMap = {};
    getRelationshipList(rels).forEach(function (relationship) {
      const attrs = relationship && relationship["attrs"] ? relationship["attrs"] : {};
      if (attrs["Id"] && getRelationshipTypeName(attrs["Type"]) === "slide") {
        relMap[attrs["Id"]] = resolvePartTarget("ppt/presentation.xml", attrs["Target"]);
      }
    });
    const slideIds = asArray(getTextByPathList(presentation, [ "p:presentation", "p:sldIdLst", "p:sldId" ]));
    const orderedSlides = slideIds
      .map(function (slideId) {
        return relMap[getTextByPathList(slideId, [ "attrs", "r:id" ])];
      })
      .filter(function (slidePath) {
        return slidePath && fallbackSlides.indexOf(slidePath) !== -1;
      });
    if (!orderedSlides.length) {
      return fallbackSlides;
    }
    const seen = new Set(orderedSlides);
    return orderedSlides.concat(fallbackSlides.filter(function (slidePath) {
      return !seen.has(slidePath);
    }));
  } catch (error) {
    console.warn("Unable to resolve PPTX slide order", error);
    return fallbackSlides;
  }
}
//////////////////////
let slideWidth = 0;
let slideHeight = 0;
let processFullTheme = true;
// Worker-generated CSS is keyed by declaration text. Keep it detached from
// Object.prototype so inherited or user-controlled keys cannot become rules.
const styleTable = Object.create(null);
let tableStyles = {};

let settings = {};

console.log(settings)

export const setters = {
  set processFullTheme(value) {
    processFullTheme = value
  },
  set settings(value) {
    settings = value;
  },
  set tableStyles(value) {
    tableStyles = value;
  },
  set IE11(value) {
    isIE11 = value;
  }
}

export const getters = {
  get settings() {
    return settings;
  }
}

export async function readXmlFile(zip, filename, isSlideContent = false) {
  try {
    let fileContent = await zip.file(filename).async('text');
    if (isSlideContent && appVersion <= 12) {
      //< office2007
      //remove "<![CDATA[ ... ]]>" tag
      fileContent = fileContent.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
    }
    // Keep whitespace-only <a:t> runs (spaces/tabs used for layout gaps).
    // Without this, txml trims them away and genSpanElement falls back to a
    // single &nbsp;, collapsing intentional multi-space gaps in slides.
    const xmlData = parse(fileContent, { simplify: true, keepWhitespace: true });
    if (xmlData['?xml']) {
      delete xmlData['?xml']
    }
    return xmlData;
  } catch (e) {
    // console.error("error readXmlFile: the file '", filename, "' not exit")
    return null;
  }
}

export async function getContentTypes(zip) {
  const ContentTypesJson = await readXmlFile(zip, '[Content_Types].xml');

  const subObj = asArray(getTextByPathList(ContentTypesJson, [ 'Types', 'Override' ]));
  const slidesLocArray = [];
  const slideLayoutsLocArray = [];
  for (const element of subObj) {
    const attrs = element['attrs'] || {};
    const partName = String(attrs['PartName'] || '').replace(/^\/+/, '');
    switch (attrs['ContentType']) {
      case 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml':
        slidesLocArray.push(partName);
        break;
      case 'application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml':
        slideLayoutsLocArray.push(partName);
        break;
      default:
    }
  }
  return {
    slides: await getPresentationSlideOrder(zip, slidesLocArray),
    slideLayouts: slideLayoutsLocArray
  };
}

export async function getSlideSizeAndSetDefaultTextStyle(zip) {
  //get app version
  const app = await readXmlFile(zip, "docProps/app.xml");
  appVersion = parseInt(getTextByPathList(app, [ "Properties", "AppVersion" ]));
  if (!Number.isFinite(appVersion)) {
    appVersion = DEFAULT_APP_VERSION;
  }
  console.log("create by Office PowerPoint app verssion: ", appVersion)

  const content = await readXmlFile(zip, "ppt/presentation.xml");
  const sldSzAttrs = getTextByPathList(content, [ "p:presentation", "p:sldSz", "attrs" ]) || DEFAULT_SLIDE_EMU_SIZE;
  const sldSzWidth = toFiniteNumber(sldSzAttrs["cx"], DEFAULT_SLIDE_EMU_SIZE.cx);
  const sldSzHeight = toFiniteNumber(sldSzAttrs["cy"], DEFAULT_SLIDE_EMU_SIZE.cy);
  const sldSzType = sldSzAttrs["type"];
  console.log("Presentation size type: ", sldSzType)

  defaultTextStyle = getTextByPathList(content, [ "p:presentation", "p:defaultTextStyle" ]) || {};

  const incSlide = settings.incSlide || {};
  slideWidth = sldSzWidth * slideFactor + toFiniteNumber(incSlide.width, 0)|0;// * scaleX;//parseInt(sldSzAttrs["cx"]) * 96 / 914400;
  slideHeight = sldSzHeight * slideFactor + toFiniteNumber(incSlide.height, 0)|0;// * scaleY;//parseInt(sldSzAttrs["cy"]) * 96 / 914400;
  //get slide dimensions
  return {
    width: slideWidth,
    height: slideHeight
  };
}

export async function processSingleSlide(zip, sldFileName, index, slideSize) {
  self.postMessage({
      "type": "INFO",
      "data": "Processing slide" + (index + 1)
  });
  // =====< Step 1 >=====
  // Read relationship filename of the slide (Get slideLayoutXX.xml)
  // @sldFileName: ppt/slides/slide1.xml
  // @resName: ppt/slides/_rels/slide1.xml.rels
  const resName = getRelsPath(sldFileName);
  const resContent = await readXmlFile(zip, resName);
  let layoutFilename = '';
  let diagramFilename = '';
  const slideResObj = {};
  for (const element of getRelationshipList(resContent)) {
    const attrs = element["attrs"] || {};
    const relationshipType = getRelationshipTypeName(attrs["Type"]);
    if (relationshipType === "slideLayout") {
      layoutFilename = resolvePartTarget(sldFileName, attrs["Target"]);
    } else if (relationshipType === "diagramDrawing") {
      diagramFilename = resolvePartTarget(sldFileName, attrs["Target"]);
    }
    addRelationshipResource(slideResObj, element, sldFileName);
  }
  //console.log(slideResObj);
  // Open slideLayoutXX.xml
  const slideLayoutContent = layoutFilename ? await readXmlFile(zip, layoutFilename) : null;
  const slideLayoutTables = indexNodesSafely(slideLayoutContent);
  const sldLayoutClrOvr = getTextByPathList(slideLayoutContent, [ 'p:sldLayout', 'p:clrMapOvr', 'a:overrideClrMapping' ]);

  //console.log(slideLayoutClrOvride);
  if (sldLayoutClrOvr !== undefined) {
    slideLayoutClrOvride = sldLayoutClrOvr["attrs"];
  }
  // =====< Step 2 >=====
  // Read slide master filename of the slidelayout (Get slideMasterXX.xml)
  // @resName: ppt/slideLayouts/slideLayout1.xml
  // @masterName: ppt/slideLayouts/_rels/slideLayout1.xml.rels
  const slideLayoutResFilename = layoutFilename ? getRelsPath(layoutFilename) : '';
  const slideLayoutResContent = slideLayoutResFilename ? await readXmlFile(zip, slideLayoutResFilename) : null;
  let masterFilename = '';
  const layoutResObj = {};
  for (const element of getRelationshipList(slideLayoutResContent)) {
    const attrs = element["attrs"] || {};
    if (getRelationshipTypeName(attrs["Type"]) === "slideMaster") {
      masterFilename = resolvePartTarget(layoutFilename, attrs["Target"]);
    } else {
      addRelationshipResource(layoutResObj, element, layoutFilename);
    }
  }
  // Open slideMasterXX.xml
  const slideMasterContent = masterFilename ? await readXmlFile(zip, masterFilename) : null;
  const slideMasterTextStyles = getTextByPathList(slideMasterContent, [ 'p:sldMaster', 'p:txStyles' ]);
  const slideMasterTables = indexNodesSafely(slideMasterContent);

  /////////////////Amir/////////////
  //Open slideMasterXX.xml.rels
  const slideMasterResFilename = masterFilename ? getRelsPath(masterFilename) : '';
  const slideMasterResContent = slideMasterResFilename ? await readXmlFile(zip, slideMasterResFilename) : null;
  let themeFilename = '';
  const masterResObj = {};
  for (const element of getRelationshipList(slideMasterResContent)) {
    const attrs = element["attrs"] || {};
    if (getRelationshipTypeName(attrs["Type"]) === "theme") {
      themeFilename = resolvePartTarget(masterFilename, attrs["Target"]);
    } else {
      addRelationshipResource(masterResObj, element, masterFilename);
    }
  }
  //console.log(themeFilename)
  //Load Theme file
  var themeResObj = {};
  var themeContent = null;
  if (themeFilename) {
    var themeResFileName = getRelsPath(themeFilename);
    //console.log("themeFilename: ", themeFilename, ", themeName: ", themeName, ", themeResFileName: ", themeResFileName)
    themeContent = await readXmlFile(zip, themeFilename);
    var themeResContent = await readXmlFile(zip, themeResFileName);
    for (const relationship of getRelationshipList(themeResContent)) {
      addRelationshipResource(themeResObj, relationship, themeFilename);
    }
  }
  //Load diagram file
  var diagramResObj = {};
  var digramFileContent = {};
  if (diagramFilename) {
    var diagramResFileName = getRelsPath(diagramFilename);
    //console.log("diagramFilename: ", diagramFilename, ", themeName: ", themeName, ", diagramResFileName: ", diagramResFileName)
    digramFileContent = await readXmlFile(zip, diagramFilename);
    if (digramFileContent !== null && digramFileContent !== undefined && digramFileContent != "") {
      var digramFileContentObjToStr = JSON.stringify(digramFileContent);
      digramFileContentObjToStr = digramFileContentObjToStr.replace(/dsp:/g, "p:");
      digramFileContent = JSON.parse(digramFileContentObjToStr);
    }

    var digramResContent = await readXmlFile(zip, diagramResFileName);
    if (digramResContent !== null) {
      for (const relationship of getRelationshipList(digramResContent)) {
        addRelationshipResource(diagramResObj, relationship, diagramFilename);
      }
    }
  }
  //console.log("diagramResObj: " , diagramResObj)
  // =====< Step 3 >=====
  var slideContent = await readXmlFile(zip, sldFileName , true);
  var nodes = getTextByPathList(slideContent, [ "p:sld", "p:cSld", "p:spTree" ]) || {};
  var warpObj = {
    "zip": zip,
    "slideLayoutContent": slideLayoutContent,
    "slideLayoutTables": slideLayoutTables,
    "slideMasterContent": slideMasterContent,
    "slideMasterTables": slideMasterTables,
    "slideContent": slideContent,
    "slideResObj": slideResObj,
    "slideMasterTextStyles": slideMasterTextStyles,
    "layoutResObj": layoutResObj,
    "masterResObj": masterResObj,
    "themeContent": themeContent,
    "themeResObj": themeResObj,
    "digramFileContent": digramFileContent,
    "diagramResObj": diagramResObj,
    "defaultTextStyle": defaultTextStyle,
    "slideIndex": index,
    "slideNumber": index + 1
  };
  var bgResult = "";
  if (processFullTheme === true) {
    bgResult = await getBackground(warpObj, slideSize, index);
  }

  var bgColor = "";
  if (processFullTheme == "colorsAndImageOnly") {
    bgColor = await getSlideBackgroundFill(warpObj, index) || "";
  }

  var result = "<div class='slide' style='width:" + slideSize.width + "px; height:" + slideSize.height + "px;" + bgColor + "'>"
  result += bgResult;
  for (const nodeKey in nodes) {
    if (nodes[nodeKey].constructor === Array) {
      for (var i = 0; i < nodes[nodeKey].length; i++) {
        result += await processNodesInSlide(nodeKey, nodes[nodeKey][i], nodes, warpObj, "slide");
      }
    } else {
      result += await processNodesInSlide(nodeKey, nodes[nodeKey], nodes, warpObj, "slide");
    }
  }
  return result + "</div>";
}

function indexNodes(content) {

  const keys = Object.keys(content);
  const spTreeNode = content[keys[0]]['p:cSld']['p:spTree'];

  const idTable = {};
  const idxTable = {};
  const typeTable = {};

  let type;
  let idx;
  let id;
  let nvSpPrNode;

  for (const key in spTreeNode) {
    if (key === "p:nvGrpSpPr" || key === "p:grpSpPr") {
      continue;
    }
    const targetNode = spTreeNode[key];

    if (targetNode.constructor === Array) {
      for (let i = 0; i < targetNode.length; i++) {
        nvSpPrNode = targetNode[i]["p:nvSpPr"];
        id = getTextByPathList(nvSpPrNode, ["p:cNvPr", "attrs", "id"]);
        idx = getTextByPathList(nvSpPrNode, ["p:nvPr", "p:ph", "attrs", "idx"]);
        type = getTextByPathList(nvSpPrNode, ["p:nvPr", "p:ph", "attrs", "type"]);

        if (id !== undefined) {
          idTable[id] = targetNode[i];
        }
        if (idx !== undefined) {
          idxTable[idx] = targetNode[i];
        }
        if (type !== undefined) {
          typeTable[type] = targetNode[i];
        }
      }
    } else {
      nvSpPrNode = targetNode['p:nvSpPr'];
      id = getTextByPathList(nvSpPrNode, [ 'p:cNvPr', 'attrs', 'id' ]);
      idx = getTextByPathList(nvSpPrNode, [ 'p:nvPr', 'p:ph', 'attrs', 'idx' ]);
      type = getTextByPathList(nvSpPrNode, [ 'p:nvPr', 'p:ph', 'attrs', 'type' ]);

      if (id !== undefined) {
        idTable[id] = targetNode;
      }
      if (idx !== undefined) {
        idxTable[idx] = targetNode;
      }
      if (type !== undefined) {
        typeTable[type] = targetNode;
      }
    }

  }

  return { "idTable": idTable, "idxTable": idxTable, "typeTable": typeTable };
}

async function processNodesInSlide(nodeKey, nodeValue, nodes, warpObj, source, sType, groupContext) {
  var result = "";

  if (isHiddenDrawingNode(nodeValue)) {
    return result;
  }

  switch (nodeKey) {
    case "p:sp":    // Shape, Text
      result = await processSpNode(nodeValue, nodes, warpObj, source, sType, groupContext);
      break;
    case "p:cxnSp":    // Shape, Text (with connection)
      result = await processCxnSpNode(nodeValue, nodes, warpObj, source, sType, groupContext);
      break;
    case "p:pic":    // Picture
      result = await processPicNode(nodeValue, warpObj, source, sType, groupContext);
      break;
    case "p:graphicFrame":    // Chart, Diagram, Table
      result = await processGraphicFrameNode(nodeValue, warpObj, source, sType, groupContext);
      break;
    case "p:grpSp":
      result = await processGroupSpNode(nodeValue, warpObj, source, groupContext);
      break;
    case "mc:AlternateContent": //Equations and formulas as Image
      //console.log("mc:AlternateContent nodeValue:" , nodeValue , "nodes:",nodes, "sType:",sType)
      var mcFallbackNode = getTextByPathList(nodeValue, ["mc:Fallback"]);
      result = await processGroupSpNode(mcFallbackNode, warpObj, source, groupContext);
      break;
    default:
    //console.log("nodeKey: ", nodeKey)
  }

  return result;

}

function emuToPx(value, fallback = 0) {
  var parsed = parseInt(value);
  return Number.isFinite(parsed) ? parsed * slideFactor : fallback;
}

function coordToNumber(value, fallback = 0) {
  var parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapGroupCoordinateToPx(value, axis, groupContext) {
  var parsed = coordToNumber(value, NaN);
  if (!Number.isFinite(parsed)) {
    return NaN;
  }
  if (groupContext === undefined) {
    return emuToPx(parsed);
  }
  var offset = axis === "y" ? groupContext.childOffsetY : groupContext.childOffsetX;
  var scale = axis === "y" ? groupContext.scaleY : groupContext.scaleX;
  return (parsed - offset) * scale;
}

function mapGroupSizeToPx(value, axis, groupContext) {
  var parsed = coordToNumber(value, NaN);
  if (!Number.isFinite(parsed)) {
    return NaN;
  }
  if (groupContext === undefined) {
    return emuToPx(parsed);
  }
  var scale = axis === "y" ? groupContext.scaleY : groupContext.scaleX;
  return parsed * scale;
}

function mapLineSizeToPx(value, axis, groupContext, fallback) {
  var parsed = coordToNumber(value, NaN);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  if (groupContext === undefined) {
    return emuToPx(parsed);
  }
  var scale = axis === "y" ? groupContext.scaleY : groupContext.scaleX;
  return parsed * scale;
}

function getTransformBool(value) {
  return value === true || value === "1" || value === "true";
}

function getDrawingNonVisualAttrs(node) {
  return getTextByPathList(node, ["p:nvSpPr", "p:cNvPr", "attrs"]) ||
    getTextByPathList(node, ["p:nvPicPr", "p:cNvPr", "attrs"]) ||
    getTextByPathList(node, ["p:nvGrpSpPr", "p:cNvPr", "attrs"]) ||
    getTextByPathList(node, ["p:nvCxnSpPr", "p:cNvPr", "attrs"]) ||
    getTextByPathList(node, ["p:nvGraphicFramePr", "p:cNvPr", "attrs"]) ||
    {};
}

function isHiddenDrawingNode(node) {
  var attrs = getDrawingNonVisualAttrs(node);
  return getTransformBool(attrs["hidden"]);
}

function getGroupTransformContext(xfrmNode, parentGroupContext) {
  var off = getTextByPathList(xfrmNode, ["a:off", "attrs"]) || {};
  var ext = getTextByPathList(xfrmNode, ["a:ext", "attrs"]) || {};
  var chOff = getTextByPathList(xfrmNode, ["a:chOff", "attrs"]) || {};
  var chExt = getTextByPathList(xfrmNode, ["a:chExt", "attrs"]) || {};

  var width = mapGroupSizeToPx(ext["cx"], "x", parentGroupContext);
  var height = mapGroupSizeToPx(ext["cy"], "y", parentGroupContext);
  var childWidth = coordToNumber(chExt["cx"], NaN);
  var childHeight = coordToNumber(chExt["cy"], NaN);
  if (!Number.isFinite(childWidth) || childWidth === 0) {
    childWidth = coordToNumber(ext["cx"], width || 1);
  }
  if (!Number.isFinite(childHeight) || childHeight === 0) {
    childHeight = coordToNumber(ext["cy"], height || 1);
  }

  return {
    x: mapGroupCoordinateToPx(off["x"], "x", parentGroupContext),
    y: mapGroupCoordinateToPx(off["y"], "y", parentGroupContext),
    width: width,
    height: height,
    childOffsetX: coordToNumber(chOff["x"], 0),
    childOffsetY: coordToNumber(chOff["y"], 0),
    childWidth: childWidth,
    childHeight: childHeight,
    scaleX: childWidth ? width / childWidth : 1,
    scaleY: childHeight ? height / childHeight : 1,
    rotate: angleToDegrees(getTextByPathList(xfrmNode, ["attrs", "rot"])),
    flipH: getTransformBool(getTextByPathList(xfrmNode, ["attrs", "flipH"])),
    flipV: getTransformBool(getTextByPathList(xfrmNode, ["attrs", "flipV"]))
  };
}

function getGroupTransformStyle(groupContext) {
  if (groupContext === undefined) {
    return "";
  }
  var transforms = [];
  if (groupContext.rotate) {
    transforms.push("rotate(" + groupContext.rotate + "deg)");
  }
  if (groupContext.flipH || groupContext.flipV) {
    transforms.push("scale(" + (groupContext.flipH ? -1 : 1) + "," + (groupContext.flipV ? -1 : 1) + ")");
  }
  return transforms.length ? "transform:" + transforms.join(" ") + ";transform-origin:center;" : "";
}

function formatSvgNumber(value) {
  return Math.round(value * 1000) / 1000;
}

function convertMetafileToSvgDataUrl(arrayBuffer, mime) {
  try {
    var bytes = arrayBuffer instanceof Uint8Array
      ? arrayBuffer
      : new Uint8Array(arrayBuffer);
    var converted = convertMetafileToSvg(mime, bytes);
    if (!converted || !converted.dataUrl) {
      return undefined;
    }
    return converted.dataUrl;
  } catch (e) {
    console.warn("Unable to convert metafile image", e);
    return undefined;
  }
}

function arrayBufferToUint8ClampedArray(bufferLike) {
  if (bufferLike instanceof Uint8ClampedArray) {
    return bufferLike;
  }
  if (bufferLike instanceof Uint8Array) {
    return new Uint8ClampedArray(bufferLike.buffer, bufferLike.byteOffset, bufferLike.byteLength);
  }
  return new Uint8ClampedArray(bufferLike);
}

async function canvasToPngDataUrl(canvas) {
  if (typeof canvas.convertToBlob === "function") {
    var blob = await canvas.convertToBlob({ type: "image/png" });
    var blobBuffer = await blob.arrayBuffer();
    return "data:image/png;base64," + base64ArrayBuffer(blobBuffer);
  }

  if (typeof canvas.toDataURL === "function") {
    return canvas.toDataURL("image/png");
  }

  return undefined;
}

async function convertTiffToPngDataUrl(imgArrayBuffer) {
  try {
    var ifds = UTIF.decode(imgArrayBuffer);
    if (!ifds || !ifds.length) {
      return undefined;
    }

    UTIF.decodeImage(imgArrayBuffer, ifds[0]);
    var width = ifds[0].width;
    var height = ifds[0].height;
    if (!width || !height) {
      return undefined;
    }

    var rgba = arrayBufferToUint8ClampedArray(UTIF.toRGBA8(ifds[0]));
    var imageData = new ImageData(rgba, width, height);
    var canvas;

    if (typeof OffscreenCanvas !== "undefined") {
      canvas = new OffscreenCanvas(width, height);
    } else if (typeof document !== "undefined" && document.createElement) {
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
    } else {
      return undefined;
    }

    var context = canvas.getContext("2d");
    if (!context) {
      return undefined;
    }
    context.putImageData(imageData, 0, 0);
    return await canvasToPngDataUrl(canvas);
  } catch (e) {
    console.warn("Unable to convert TIFF image", e);
    return undefined;
  }
}

async function getImageDataUrl(imgFileExt, imgArrayBuffer) {
  var normalizedExt = (imgFileExt || "").toLowerCase();
  if (normalizedExt == "tif" || normalizedExt == "tiff") {
    return await convertTiffToPngDataUrl(imgArrayBuffer);
  }
  if (normalizedExt == "emf" || normalizedExt == "wmf") {
    // Browsers cannot display raw EMF/WMF; only return a converted SVG data URL.
    return convertMetafileToSvgDataUrl(
      imgArrayBuffer,
      normalizedExt == "wmf" ? "image/wmf" : "image/emf"
    );
  }

  if (normalizedExt == "jpg" || normalizedExt == "jpeg") {
    imgArrayBuffer = normalizeJpegExifOrientation(imgArrayBuffer).bytes;
  }

  var mimeType = getMimeType(normalizedExt);
  if (!mimeType) {
    return undefined;
  }

  return "data:" + mimeType + ";base64," + base64ArrayBuffer(imgArrayBuffer);
}

function getBlipCropStyles(blipFillNode) {
  var srcRect = getTextByPathList(blipFillNode, ["a:srcRect", "attrs"]);
  if (srcRect === undefined) {
    return {
      container: "overflow:hidden;",
      image: "display:block;width:100%;height:100%;object-fit:fill;max-width:none;max-height:none;",
      svg: { x: 0, y: 0, width: 100, height: 100 }
    };
  }

  var left = parseInt(srcRect["l"] || 0) / 1000;
  var top = parseInt(srcRect["t"] || 0) / 1000;
  var right = parseInt(srcRect["r"] || 0) / 1000;
  var bottom = parseInt(srcRect["b"] || 0) / 1000;
  var visibleWidth = 100 - left - right;
  var visibleHeight = 100 - top - bottom;

  if (visibleWidth <= 0 || visibleHeight <= 0) {
    return {
      container: "overflow:hidden;",
      image: "display:block;width:100%;height:100%;object-fit:fill;max-width:none;max-height:none;",
      svg: { x: 0, y: 0, width: 100, height: 100 }
    };
  }

  var imageWidth = 10000 / visibleWidth;
  var imageHeight = 10000 / visibleHeight;
  var imageLeft = -left / visibleWidth * 100;
  var imageTop = -top / visibleHeight * 100;

  return {
    container: "overflow:hidden;",
    image: "position:absolute;max-width:none;max-height:none;width:" + imageWidth +
      "%;height:" + imageHeight + "%;left:" + imageLeft +
      "%;top:" + imageTop + "%;",
    svg: { x: imageLeft, y: imageTop, width: imageWidth, height: imageHeight }
  };
}

function getBlipEffectStyles(blipFillNode) {
  var duotone = getTextByPathList(blipFillNode, ["a:blip", "a:duotone"]);
  if (duotone !== undefined) {
    return "filter:grayscale(1);";
  }
  return "";
}

function getPicturePresetClipStyles(picNode) {
  var preset = getTextByPathList(picNode, ["p:spPr", "a:prstGeom", "attrs", "prst"]);
  if (preset === "ellipse") {
    return "border-radius:50%;";
  }
  if (preset === "roundRect") {
    return "border-radius:8px;";
  }
  return "";
}

// Group transforms use a child coordinate space (chOff/chExt) mapped into the
// group's bounding box (off/ext), per DrawingML CT_GroupTransform2D.
async function processGroupSpNode(node, warpObj, source, parentGroupContext) {
  var xfrmNode = getTextByPathList(node, ["p:grpSpPr", "a:xfrm"]);
  var groupContext = xfrmNode !== undefined ? getGroupTransformContext(xfrmNode, parentGroupContext) : undefined;
  var order = getTextByPathList(node, ["attrs", "order"]);
  var groupStyle = order !== undefined ? "z-index: " + order + ";" : "";

  if (xfrmNode !== undefined) {
    groupStyle += getPosition(xfrmNode, node, undefined, undefined, "group", parentGroupContext);
    groupStyle += getSize(xfrmNode, undefined, undefined, parentGroupContext);
    groupStyle += getGroupTransformStyle(groupContext);
  }

  var result = "<div class='block group' style='" + groupStyle + "'>";

  if (groupContext !== undefined) {
    result += "<div class='group-content' style='position:absolute;top:0;left:0;width:100%;height:100%;'>";
  }

  // Process all child nodes in the group's child coordinate space.
  for (var nodeKey in node) {
    if (node[nodeKey].constructor === Array) {
      for (var i = 0; i < node[nodeKey].length; i++) {
        result += await processNodesInSlide(nodeKey, node[nodeKey][i], node, warpObj, source, "group", groupContext);
      }
    } else {
      result += await processNodesInSlide(nodeKey, node[nodeKey], node, warpObj, source, "group", groupContext);
    }
  }

  if (groupContext !== undefined) {
    result += "</div>";
  }
  result += "</div>";

  return result;
}

async function processSpNode(node, pNode, warpObj, source, sType, groupContext) {

  /*
            *  958    <xsd:complexType name="CT_GvmlShape">
            *  959   <xsd:sequence>
            *  960     <xsd:element name="nvSpPr" type="CT_GvmlShapeNonVisual"     minOccurs="1" maxOccurs="1"/>
            *  961     <xsd:element name="spPr"   type="CT_ShapeProperties"        minOccurs="1" maxOccurs="1"/>
            *  962     <xsd:element name="txSp"   type="CT_GvmlTextShape"          minOccurs="0" maxOccurs="1"/>
            *  963     <xsd:element name="style"  type="CT_ShapeStyle"             minOccurs="0" maxOccurs="1"/>
            *  964     <xsd:element name="extLst" type="CT_OfficeArtExtensionList" minOccurs="0" maxOccurs="1"/>
            *  965   </xsd:sequence>
            *  966 </xsd:complexType>
            */

  var id = getTextByPathList(node, ["p:nvSpPr", "p:cNvPr", "attrs", "id"]);
  var name = getTextByPathList(node, ["p:nvSpPr", "p:cNvPr", "attrs", "name"]);
  var idx = (getTextByPathList(node, ["p:nvSpPr", "p:nvPr", "p:ph", "attrs", "idx"]) === undefined) ? undefined : getTextByPathList(node, ["p:nvSpPr", "p:nvPr", "p:ph", "attrs", "idx"]);
  var type = (getTextByPathList(node, ["p:nvSpPr", "p:nvPr", "p:ph", "attrs", "type"]) === undefined) ? undefined : getTextByPathList(node, ["p:nvSpPr", "p:nvPr", "p:ph", "attrs", "type"]);
  var order = getTextByPathList(node, ["attrs", "order"]);
  var isUserDrawnBg;
  if (source == "slideLayoutBg" || source == "slideMasterBg") {
    var userDrawn = getTextByPathList(node, ["p:nvSpPr", "p:nvPr", "attrs", "userDrawn"]);
    if (userDrawn == "1") {
      isUserDrawnBg = true;
    } else {
      isUserDrawnBg = false;
    }
  }
  var slideLayoutSpNode = undefined;
  var slideMasterSpNode = undefined;

  if (idx !== undefined) {
    slideLayoutSpNode = warpObj["slideLayoutTables"]["idxTable"][idx];
    if (type !== undefined) {
      slideMasterSpNode = warpObj["slideMasterTables"]["typeTable"][type];
    } else {
      slideMasterSpNode = warpObj["slideMasterTables"]["idxTable"][idx];
    }
  } else {
    if (type !== undefined) {
      slideLayoutSpNode = warpObj["slideLayoutTables"]["typeTable"][type];
      slideMasterSpNode = warpObj["slideMasterTables"]["typeTable"][type];
    }
  }

  if (type === undefined) {
    const txBoxVal = getTextByPathList(node, ["p:nvSpPr", "p:cNvSpPr", "attrs", "txBox"]);
    if (txBoxVal == "1") {
      type = "textBox";
    }
  }
  if (type === undefined) {
    type = getTextByPathList(slideLayoutSpNode, ["p:nvSpPr", "p:nvPr", "p:ph", "attrs", "type"]);
    if (type === undefined) {
      //type = getTextByPathList(slideMasterSpNode, ["p:nvSpPr", "p:nvPr", "p:ph", "attrs", "type"]);
      if (source == "diagramBg") {
        type = "diagram";
      } else {

        type = "obj"; //default type
      }
    }
  }
  //console.log("processSpNode type:", type, "idx:", idx);
  return genShape(node, pNode, slideLayoutSpNode, slideMasterSpNode, id, name, idx, type, order, warpObj, isUserDrawnBg, sType, source, groupContext);
}

async function processCxnSpNode(node, pNode, warpObj, source, sType, groupContext) {

  var id = node["p:nvCxnSpPr"]["p:cNvPr"]["attrs"]["id"];
  var name = node["p:nvCxnSpPr"]["p:cNvPr"]["attrs"]["name"];
  var idx = (node["p:nvCxnSpPr"]["p:nvPr"]["p:ph"] === undefined) ? undefined : node["p:nvSpPr"]["p:nvPr"]["p:ph"]["attrs"]["idx"];
  var type = (node["p:nvCxnSpPr"]["p:nvPr"]["p:ph"] === undefined) ? undefined : node["p:nvSpPr"]["p:nvPr"]["p:ph"]["attrs"]["type"];
  //<p:cNvCxnSpPr>(<p:cNvCxnSpPr>, <a:endCxn>)
  var order = node["attrs"]["order"];

  return genShape(node, pNode, undefined, undefined, id, name, idx, type, order, warpObj, undefined, sType, source, groupContext);
}

async function genShape(node, pNode, slideLayoutSpNode, slideMasterSpNode, id, name, idx, type, order, warpObj, isUserDrawnBg, sType, source, groupContext) {
  //var dltX = 0;
  //var dltY = 0;
  var xfrmList = [ "p:spPr", "a:xfrm" ];
  var slideXfrmNode = getTextByPathList(node, xfrmList);
  var slideLayoutXfrmNode = getTextByPathList(slideLayoutSpNode, xfrmList);
  var slideMasterXfrmNode = getTextByPathList(slideMasterSpNode, xfrmList);

  var result = "";
  var shpId = getTextByPathList(node, [ "attrs", "order" ]);
  //console.log("shpId: ",shpId)
  var shapType = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "attrs", "prst" ]);

  //custGeom - Amir
  var custShapType = getTextByPathList(node, [ "p:spPr", "a:custGeom" ]);

  var isFlipV = false;
  var isFlipH = false;
  var flip = "";
  if (getTextByPathList(slideXfrmNode, [ "attrs", "flipV" ]) === "1") {
    isFlipV = true;
  }
  if (getTextByPathList(slideXfrmNode, [ "attrs", "flipH" ]) === "1") {
    isFlipH = true;
  }
  if (isFlipH && !isFlipV) {
    flip = " scale(-1,1)"
  } else if (!isFlipH && isFlipV) {
    flip = " scale(1,-1)"
  } else if (isFlipH && isFlipV) {
    flip = " scale(-1,-1)"
  }
  /////////////////////////Amir////////////////////////
  //rotate
  var rotate = angleToDegrees(getTextByPathList(slideXfrmNode, [ "attrs", "rot" ]));

  //console.log("genShape rotate: " + rotate);
  var bodyPrAttrs = getTextByPathList(node, [ "p:txBody", "a:bodyPr", "attrs" ]) || {};
  var bodyRotation = angleToDegrees(bodyPrAttrs["rot"]);
  var textTransformRotation;
  var txtXframeNode = getTextByPathList(node, [ "p:txXfrm" ]);
  if (txtXframeNode !== undefined) {
    var txtXframeRot = getTextByPathList(txtXframeNode, [ "attrs", "rot" ]);
    if (txtXframeRot !== undefined) {
      textTransformRotation = angleToDegrees(txtXframeRot);
    }
  }
  var txtRotate = resolveDrawingMlTextRotation({
    shapeRotation: rotate,
    textTransformRotation: textTransformRotation,
    bodyRotation: bodyRotation,
    direction: bodyPrAttrs["vert"],
    upright: getTransformBool(bodyPrAttrs["upright"])
  });
  //////////////////////////////////////////////////
  if (shapType !== undefined || custShapType !== undefined /*&& slideXfrmNode !== undefined*/) {
    var off = getTextByPathList(slideXfrmNode, [ "a:off", "attrs" ]) || { x: 0, y: 0 };
    var x = mapGroupCoordinateToPx(off["x"], "x", groupContext);
    var y = mapGroupCoordinateToPx(off["y"], "y", groupContext);

    var ext = getTextByPathList(slideXfrmNode, [ "a:ext", "attrs" ]) || { cx: 0, cy: 0 };
    var w = mapGroupSizeToPx(ext["cx"], "x", groupContext);
    var h = mapGroupSizeToPx(ext["cy"], "y", groupContext);
    if (!Number.isFinite(x)) {
      x = 0;
    }
    if (!Number.isFinite(y)) {
      y = 0;
    }
    if (!Number.isFinite(w)) {
      w = 0;
    }
    if (!Number.isFinite(h)) {
      h = 0;
    }

    var svgCssName = "_svg_css_" + (Object.keys(styleTable).length + 1) + "_" + Math.floor(Math.random() * 1001);
    //console.log("name:", name, "svgCssName: ", svgCssName)
    var effectsClassName = svgCssName + "_effects";
    result += "<svg class='drawing " + svgCssName + " " + effectsClassName + " ' _id='" + id + "' _idx='" + idx + "' _type='" + type + "' _name='" + name + "'" +
      "' style='" +
      getPosition(slideXfrmNode, pNode, undefined, undefined, sType, groupContext) +
      getSize(slideXfrmNode, undefined, undefined, groupContext) +
      getConnectorViewportStyle(shapType, w, h) +
      " z-index: " + order + ";" +
      "transform: rotate(" + ((rotate !== undefined) ? rotate : 0) + "deg)" + flip + ";" +
      "'>";
    result += '<defs>'
    // Fill Color
    var fillColor = await getShapeFill(node, pNode, true, warpObj, source);
    //console.log("genShape: fillColor: ", fillColor)
    var grndFillFlg = false;
    var imgFillFlg = false;
    var ownFillType = getFillType(getTextByPathList(node, [ "p:spPr" ]));
    var clrFillType = ownFillType;
    var groupBlipFillNode;
    if (clrFillType == "GROUP_FILL") {
      clrFillType = getFillType(getTextByPathList(pNode, [ "p:grpSpPr" ]));
      if (clrFillType == "PIC_FILL") {
        groupBlipFillNode = getTextByPathList(pNode, [ "p:grpSpPr", "a:blipFill" ]);
      }
    }
    // if (clrFillType == "") {
    //     var clrFillType = getFillType(getTextByPathList(node, ["p:style","a:fillRef"]));
    // }
    //console.log("genShape: fillColor: ", fillColor, ", clrFillType: ", clrFillType, ", node: ", node)
    /////////////////////////////////////////
    if (clrFillType == "GRADIENT_FILL") {
      grndFillFlg = true;
      var color_arry = fillColor.color;
      var angl = fillColor.rot + 90;
      var svgGrdnt = getSvgGradient(w, h, angl, color_arry, shpId);
      //fill="url(#linGrd)"
      //console.log("genShape: svgGrdnt: ", svgGrdnt)
      result += svgGrdnt;

    } else if (clrFillType == "PIC_FILL") {
      imgFillFlg = true;
      var blipFillNode = groupBlipFillNode ||
        getTextByPathList(node, [ "p:spPr", "a:blipFill" ]);
      var sharedFillContext = ownFillType == "GROUP_FILL" && groupContext !== undefined
        ? {
          x: x,
          y: y,
          width: groupContext.width,
          height: groupContext.height,
          shapeTransform: {
            width: w,
            height: h,
            rotation: rotate || 0,
            flipH: isFlipH,
            flipV: isFlipV
          }
        }
        : undefined;
      var svgBgImg = await getSvgImagePattern(
        blipFillNode,
        fillColor,
        shpId,
        warpObj,
        sharedFillContext
      );
      //fill="url(#imgPtrn)"
      //console.log(svgBgImg)
      result += svgBgImg;
    } else if (clrFillType == "PATTERN_FILL") {
      var styleText = fillColor;
      if (Object.prototype.hasOwnProperty.call(styleTable, styleText)) {
        styleText += "do-nothing: " + svgCssName + ";";
      }
      styleTable[styleText] = {
        "name": svgCssName,
        "text": styleText
      };
      //}
      fillColor = "none";
    } else {
      if (clrFillType != "SOLID_FILL" && clrFillType != "PATTERN_FILL" &&
        (shapType == "arc" ||
          shapType == "bracketPair" ||
          shapType == "bracePair" ||
          shapType == "leftBracket" ||
          shapType == "leftBrace" ||
          shapType == "rightBrace" ||
          shapType == "rightBracket")) { //Temp. solution  - TODO
        fillColor = "none";
      }
    }
    // Border Color
    var border = getBorder(node, pNode, true, "shape", warpObj);

    var headEndNodeAttrs = getTextByPathList(node, [ "p:spPr", "a:ln", "a:headEnd", "attrs" ]);
    var tailEndNodeAttrs = getTextByPathList(node, [ "p:spPr", "a:ln", "a:tailEnd", "attrs" ]);
    // type: none, triangle, stealth, diamond, oval, arrow

    ////////////////////effects/////////////////////////////////////////////////////
    //p:spPr => a:effectLst =>
    //"a:blur"
    //"a:fillOverlay"
    //"a:glow"
    //"a:innerShdw"
    //"a:outerShdw"
    //"a:prstShdw"
    //"a:reflection"
    //"a:softEdge"
    //p:spPr => a:scene3d
    //"a:camera"
    //"a:lightRig"
    //"a:backdrop"
    //"a:extLst"?
    //p:spPr => a:sp3d
    //"a:bevelT"
    //"a:bevelB"
    //"a:extrusionClr"
    //"a:contourClr"
    //"a:extLst"?
    //////////////////////////////outerShdw///////////////////////////////////////////
    //not support sizing the shadow
    var outerShdwNode = getTextByPathList(node, [ "p:spPr", "a:effectLst", "a:outerShdw" ]);
    var oShadowSvgUrlStr = ""
    if (outerShdwNode !== undefined) {
      var chdwClrNode = getSolidFill(outerShdwNode, undefined, undefined, warpObj);
      var outerShdwAttrs = outerShdwNode["attrs"];

      //var algn = outerShdwAttrs["algn"];
      var dir = (outerShdwAttrs["dir"]) ? (parseInt(outerShdwAttrs["dir"]) / 60000) : 0;
      var dist = parseInt(outerShdwAttrs["dist"]) * slideFactor;//(px) //* (3 / 4); //(pt)
      //var rotWithShape = outerShdwAttrs["rotWithShape"];
      var blurRad = (outerShdwAttrs["blurRad"]) ? (parseInt(outerShdwAttrs["blurRad"]) * slideFactor) : ""; //+ "px"
      //var sx = (outerShdwAttrs["sx"]) ? (parseInt(outerShdwAttrs["sx"]) / 100000) : 1;
      //var sy = (outerShdwAttrs["sy"]) ? (parseInt(outerShdwAttrs["sy"]) / 100000) : 1;
      var vx = dist * Math.sin(dir * Math.PI / 180);
      var hx = dist * Math.cos(dir * Math.PI / 180);
      //SVG
      //var oShadowId = "outerhadow_" + shpId;
      //oShadowSvgUrlStr = "filter='url(#" + oShadowId+")'";
      //var shadowFilterStr = '<filter id="' + oShadowId + '" x="0" y="0" width="' + w * (6 / 8) + '" height="' + h + '">';
      //1:
      //shadowFilterStr += '<feDropShadow dx="' + vx + '" dy="' + hx + '" stdDeviation="' + blurRad * (3 / 4) + '" flood-color="#' + chdwClrNode +'" flood-opacity="1" />'
      //2:
      //shadowFilterStr += '<feFlood result="floodColor" flood-color="red" flood-opacity="0.5"   width="' + w * (6 / 8) + '" height="' + h + '"  />'; //#' + chdwClrNode +'
      //shadowFilterStr += '<feOffset result="offOut" in="SourceGraph ccfsdf-+ic"  dx="' + vx + '" dy="' + hx + '"/>'; //how much to offset
      //shadowFilterStr += '<feGaussianBlur result="blurOut" in="offOut" stdDeviation="' + blurRad*(3/4) +'"/>'; //tdDeviation is how much to blur
      //shadowFilterStr += '<feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer>'; //slope is the opacity of the shadow
      //shadowFilterStr += '<feBlend in="SourceGraphic" in2="blurOut"  mode="normal" />'; //this contains the element that the filter is applied to
      //shadowFilterStr += '</filter>';
      //result += shadowFilterStr;

      //css:
      var svg_css_shadow = "filter:drop-shadow(" + hx + "px " + vx + "px " + blurRad + "px #" + chdwClrNode + ");";

      if (Object.prototype.hasOwnProperty.call(styleTable, svg_css_shadow)) {
        svg_css_shadow += "do-nothing: " + svgCssName + ";";
      }

      styleTable[svg_css_shadow] = {
        "name": effectsClassName,
        "text": svg_css_shadow
      };

    }
    ////////////////////////////////////////////////////////////////////////////////////////
    if ((headEndNodeAttrs !== undefined && (headEndNodeAttrs["type"] === "triangle" || headEndNodeAttrs["type"] === "arrow")) ||
      (tailEndNodeAttrs !== undefined && (tailEndNodeAttrs["type"] === "triangle" || tailEndNodeAttrs["type"] === "arrow"))) {
      var triangleMarker = "<marker id='markerTriangle_" + shpId + "' viewBox='0 0 10 10' refX='10' refY='5' markerWidth='5' markerHeight='5' stroke='" + border.color + "' fill='" + border.color +
        "' orient='auto-start-reverse' markerUnits='strokeWidth'><path d='M 0 0 L 10 5 L 0 10 z' /></marker>";
      result += triangleMarker;
    }
    result += '</defs>'
  }
  if (shapType !== undefined && custShapType === undefined) {
    //console.log("shapType: ", shapType)
    switch (shapType) {
      case "rect":
      case "flowChartProcess":
      case "flowChartPredefinedProcess":
      case "flowChartInternalStorage":
      case "actionButtonBlank":
        result += "<rect x='0' y='0' width='" + w + "' height='" + h + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' " + oShadowSvgUrlStr + "  />";

        if (shapType == "flowChartPredefinedProcess") {
          result += "<rect x='" + w * (1 / 8) + "' y='0' width='" + w * (6 / 8) + "' height='" + h + "' fill='none' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        } else if (shapType == "flowChartInternalStorage") {
          result += " <polyline points='" + w * (1 / 8) + " 0," + w * (1 / 8) + " " + h + "' fill='none' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
          result += " <polyline points='0 " + h * (1 / 8) + "," + w + " " + h * (1 / 8) + "' fill='none' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        }
        break;
      case "flowChartCollate":
        var d = "M 0,0" +
          " L" + w + "," + 0 +
          " L" + 0 + "," + h +
          " L" + w + "," + h +
          " z";
        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "flowChartDocument":
        var y1, y2, y3, x1;
        x1 = w * 10800 / 21600;
        y1 = h * 17322 / 21600;
        y2 = h * 20172 / 21600;
        y3 = h * 23922 / 21600;
        var d = "M" + 0 + "," + 0 +
          " L" + w + "," + 0 +
          " L" + w + "," + y1 +
          " C" + x1 + "," + y1 + " " + x1 + "," + y3 + " " + 0 + "," + y2 +
          " z";
        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "flowChartMultidocument":
        var y1, y2, y3, y4, y5, y6, y7, y8, y9, x1, x2, x3, x4, x5, x6, x7;
        y1 = h * 18022 / 21600;
        y2 = h * 3675 / 21600;
        y3 = h * 23542 / 21600;
        y4 = h * 1815 / 21600;
        y5 = h * 16252 / 21600;
        y6 = h * 16352 / 21600;
        y7 = h * 14392 / 21600;
        y8 = h * 20782 / 21600;
        y9 = h * 14467 / 21600;
        x1 = w * 1532 / 21600;
        x2 = w * 20000 / 21600;
        x3 = w * 9298 / 21600;
        x4 = w * 19298 / 21600;
        x5 = w * 18595 / 21600;
        x6 = w * 2972 / 21600;
        x7 = w * 20800 / 21600;
        var d = "M" + 0 + "," + y2 +
          " L" + x5 + "," + y2 +
          " L" + x5 + "," + y1 +
          " C" + x3 + "," + y1 + " " + x3 + "," + y3 + " " + 0 + "," + y8 +
          " z" +
          "M" + x1 + "," + y2 +
          " L" + x1 + "," + y4 +
          " L" + x2 + "," + y4 +
          " L" + x2 + "," + y5 +
          " C" + x4 + "," + y5 + " " + x5 + "," + y6 + " " + x5 + "," + y6 +
          "M" + x6 + "," + y4 +
          " L" + x6 + "," + 0 +
          " L" + w + "," + 0 +
          " L" + w + "," + y7 +
          " C" + x7 + "," + y7 + " " + x2 + "," + y9 + " " + x2 + "," + y9;

        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "actionButtonBackPrevious":
        var hc = w / 2, vc = h / 2, ss = Math.min(w, h);
        var dx2, g9, g10, g11, g12;

        dx2 = ss * 3 / 8;
        g9 = vc - dx2;
        g10 = vc + dx2;
        g11 = hc - dx2;
        g12 = hc + dx2;
        var d = "M" + 0 + "," + 0 +
          " L" + w + "," + 0 +
          " L" + w + "," + h +
          " L" + 0 + "," + h +
          " z" +
          "M" + g11 + "," + vc +
          " L" + g12 + "," + g9 +
          " L" + g12 + "," + g10 +
          " z";

        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "actionButtonBeginning":
        var hc = w / 2, vc = h / 2, ss = Math.min(w, h);
        var dx2, g9, g10, g11, g12, g13, g14, g15, g16, g17;

        dx2 = ss * 3 / 8;
        g9 = vc - dx2;
        g10 = vc + dx2;
        g11 = hc - dx2;
        g12 = hc + dx2;
        g13 = ss * 3 / 4;
        g14 = g13 / 8;
        g15 = g13 / 4;
        g16 = g11 + g14;
        g17 = g11 + g15;
        var d = "M" + 0 + "," + 0 +
          " L" + w + "," + 0 +
          " L" + w + "," + h +
          " L" + 0 + "," + h +
          " z" +
          "M" + g17 + "," + vc +
          " L" + g12 + "," + g9 +
          " L" + g12 + "," + g10 +
          " z" +
          "M" + g16 + "," + g9 +
          " L" + g11 + "," + g9 +
          " L" + g11 + "," + g10 +
          " L" + g16 + "," + g10 +
          " z";

        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "actionButtonDocument":
        var hc = w / 2, vc = h / 2, ss = Math.min(w, h);
        var dx2, g9, g10, dx1, g11, g12, g13, g14, g15;

        dx2 = ss * 3 / 8;
        g9 = vc - dx2;
        g10 = vc + dx2;
        dx1 = ss * 9 / 32;
        g11 = hc - dx1;
        g12 = hc + dx1;
        g13 = ss * 3 / 16;
        g14 = g12 - g13;
        g15 = g9 + g13;
        var d = "M" + 0 + "," + 0 +
          " L" + w + "," + 0 +
          " L" + w + "," + h +
          " L" + 0 + "," + h +
          " z" +
          "M" + g11 + "," + g9 +
          " L" + g14 + "," + g9 +
          " L" + g12 + "," + g15 +
          " L" + g12 + "," + g10 +
          " L" + g11 + "," + g10 +
          " z" +
          "M" + g14 + "," + g9 +
          " L" + g14 + "," + g15 +
          " L" + g12 + "," + g15 +
          " z";

        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "actionButtonEnd":
        var hc = w / 2, vc = h / 2, ss = Math.min(w, h);
        var dx2, g9, g10, g11, g12, g13, g14, g15, g16, g17;

        dx2 = ss * 3 / 8;
        g9 = vc - dx2;
        g10 = vc + dx2;
        g11 = hc - dx2;
        g12 = hc + dx2;
        g13 = ss * 3 / 4;
        g14 = g13 * 3 / 4;
        g15 = g13 * 7 / 8;
        g16 = g11 + g14;
        g17 = g11 + g15;
        var d = "M" + 0 + "," + h +
          " L" + w + "," + h +
          " L" + w + "," + 0 +
          " L" + 0 + "," + 0 +
          " z" +
          " M" + g17 + "," + g9 +
          " L" + g12 + "," + g9 +
          " L" + g12 + "," + g10 +
          " L" + g17 + "," + g10 +
          " z" +
          " M" + g16 + "," + vc +
          " L" + g11 + "," + g9 +
          " L" + g11 + "," + g10 +
          " z";

        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "actionButtonForwardNext":
        var hc = w / 2, vc = h / 2, ss = Math.min(w, h);
        var dx2, g9, g10, g11, g12;

        dx2 = ss * 3 / 8;
        g9 = vc - dx2;
        g10 = vc + dx2;
        g11 = hc - dx2;
        g12 = hc + dx2;

        var d = "M" + 0 + "," + h +
          " L" + w + "," + h +
          " L" + w + "," + 0 +
          " L" + 0 + "," + 0 +
          " z" +
          " M" + g12 + "," + vc +
          " L" + g11 + "," + g9 +
          " L" + g11 + "," + g10 +
          " z";

        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "actionButtonHelp":
        var hc = w / 2, vc = h / 2, ss = Math.min(w, h);
        var dx2, g9, g11, g13, g14, g15, g16, g19, g20, g21, g23, g24, g27, g29, g30, g31, g33, g36, g37, g41, g42;

        dx2 = ss * 3 / 8;
        g9 = vc - dx2;
        g11 = hc - dx2;
        g13 = ss * 3 / 4;
        g14 = g13 / 7;
        g15 = g13 * 3 / 14;
        g16 = g13 * 2 / 7;
        g19 = g13 * 3 / 7;
        g20 = g13 * 4 / 7;
        g21 = g13 * 17 / 28;
        g23 = g13 * 21 / 28;
        g24 = g13 * 11 / 14;
        g27 = g9 + g16;
        g29 = g9 + g21;
        g30 = g9 + g23;
        g31 = g9 + g24;
        g33 = g11 + g15;
        g36 = g11 + g19;
        g37 = g11 + g20;
        g41 = g13 / 14;
        g42 = g13 * 3 / 28;
        var cX1 = g33 + g16;
        var cX2 = g36 + g14;
        var cY3 = g31 + g42;
        var cX4 = (g37 + g36 + g16) / 2;

        var d = "M" + 0 + "," + 0 +
          " L" + w + "," + 0 +
          " L" + w + "," + h +
          " L" + 0 + "," + h +
          " z" +
          "M" + g33 + "," + g27 +
          shapeArc(cX1, g27, g16, g16, 180, 360, false).replace("M", "L") +
          shapeArc(cX4, g27, g14, g15, 0, 90, false).replace("M", "L") +
          shapeArc(cX4, g29, g41, g42, 270, 180, false).replace("M", "L") +
          " L" + g37 + "," + g30 +
          " L" + g36 + "," + g30 +
          " L" + g36 + "," + g29 +
          shapeArc(cX2, g29, g14, g15, 180, 270, false).replace("M", "L") +
          shapeArc(g37, g27, g41, g42, 90, 0, false).replace("M", "L") +
          shapeArc(cX1, g27, g14, g14, 0, -180, false).replace("M", "L") +
          " z" +
          "M" + hc + "," + g31 +
          shapeArc(hc, cY3, g42, g42, 270, 630, false).replace("M", "L") +
          " z";

        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "actionButtonHome":
        var hc = w / 2, vc = h / 2, ss = Math.min(w, h);
        var dx2, g9, g10, g11, g12, g13, g14, g15, g16, g17, g18, g19, g20, g21, g22, g23, g24, g25, g26, g27, g28, g29,
          g30, g31, g32, g33;

        dx2 = ss * 3 / 8;
        g9 = vc - dx2;
        g10 = vc + dx2;
        g11 = hc - dx2;
        g12 = hc + dx2;
        g13 = ss * 3 / 4;
        g14 = g13 / 16;
        g15 = g13 / 8;
        g16 = g13 * 3 / 16;
        g17 = g13 * 5 / 16;
        g18 = g13 * 7 / 16;
        g19 = g13 * 9 / 16;
        g20 = g13 * 11 / 16;
        g21 = g13 * 3 / 4;
        g22 = g13 * 13 / 16;
        g23 = g13 * 7 / 8;
        g24 = g9 + g14;
        g25 = g9 + g16;
        g26 = g9 + g17;
        g27 = g9 + g21;
        g28 = g11 + g15;
        g29 = g11 + g18;
        g30 = g11 + g19;
        g31 = g11 + g20;
        g32 = g11 + g22;
        g33 = g11 + g23;

        var d = "M" + 0 + "," + 0 +
          " L" + w + "," + 0 +
          " L" + w + "," + h +
          " L" + 0 + "," + h +
          " z" +
          " M" + hc + "," + g9 +
          " L" + g11 + "," + vc +
          " L" + g28 + "," + vc +
          " L" + g28 + "," + g10 +
          " L" + g33 + "," + g10 +
          " L" + g33 + "," + vc +
          " L" + g12 + "," + vc +
          " L" + g32 + "," + g26 +
          " L" + g32 + "," + g24 +
          " L" + g31 + "," + g24 +
          " L" + g31 + "," + g25 +
          " z" +
          " M" + g29 + "," + g27 +
          " L" + g30 + "," + g27 +
          " L" + g30 + "," + g10 +
          " L" + g29 + "," + g10 +
          " z";

        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "actionButtonInformation":
        var hc = w / 2, vc = h / 2, ss = Math.min(w, h);
        var dx2, g9, g11, g13, g14, g17, g18, g19, g20, g22, g23, g24, g25, g28, g29, g30, g31, g32, g34, g35, g37, g38;

        dx2 = ss * 3 / 8;
        g9 = vc - dx2;
        g11 = hc - dx2;
        g13 = ss * 3 / 4;
        g14 = g13 / 32;
        g17 = g13 * 5 / 16;
        g18 = g13 * 3 / 8;
        g19 = g13 * 13 / 32;
        g20 = g13 * 19 / 32;
        g22 = g13 * 11 / 16;
        g23 = g13 * 13 / 16;
        g24 = g13 * 7 / 8;
        g25 = g9 + g14;
        g28 = g9 + g17;
        g29 = g9 + g18;
        g30 = g9 + g23;
        g31 = g9 + g24;
        g32 = g11 + g17;
        g34 = g11 + g19;
        g35 = g11 + g20;
        g37 = g11 + g22;
        g38 = g13 * 3 / 32;
        var cY1 = g9 + dx2;
        var cY2 = g25 + g38;

        var d = "M" + 0 + "," + 0 +
          " L" + w + "," + 0 +
          " L" + w + "," + h +
          " L" + 0 + "," + h +
          " z" +
          "M" + hc + "," + g9 +
          shapeArc(hc, cY1, dx2, dx2, 270, 630, false).replace("M", "L") +
          " z" +
          "M" + hc + "," + g25 +
          shapeArc(hc, cY2, g38, g38, 270, 630, false).replace("M", "L") +
          "M" + g32 + "," + g28 +
          " L" + g35 + "," + g28 +
          " L" + g35 + "," + g30 +
          " L" + g37 + "," + g30 +
          " L" + g37 + "," + g31 +
          " L" + g32 + "," + g31 +
          " L" + g32 + "," + g30 +
          " L" + g34 + "," + g30 +
          " L" + g34 + "," + g29 +
          " L" + g32 + "," + g29 +
          " z";

        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "actionButtonMovie":
        var hc = w / 2, vc = h / 2, ss = Math.min(w, h);
        var dx2, g9, g10, g11, g12, g13, g14, g15, g16, g17, g18, g19, g20, g21, g22, g23, g24, g25, g26, g27,
          g28, g29, g30, g31, g32, g33, g34, g35, g36, g37, g38, g39, g40, g41, g42, g43, g44, g45, g46, g47, g48;

        dx2 = ss * 3 / 8;
        g9 = vc - dx2;
        g10 = vc + dx2;
        g11 = hc - dx2;
        g12 = hc + dx2;
        g13 = ss * 3 / 4;
        g14 = g13 * 1455 / 21600;
        g15 = g13 * 1905 / 21600;
        g16 = g13 * 2325 / 21600;
        g17 = g13 * 16155 / 21600;
        g18 = g13 * 17010 / 21600;
        g19 = g13 * 19335 / 21600;
        g20 = g13 * 19725 / 21600;
        g21 = g13 * 20595 / 21600;
        g22 = g13 * 5280 / 21600;
        g23 = g13 * 5730 / 21600;
        g24 = g13 * 6630 / 21600;
        g25 = g13 * 7492 / 21600;
        g26 = g13 * 9067 / 21600;
        g27 = g13 * 9555 / 21600;
        g28 = g13 * 13342 / 21600;
        g29 = g13 * 14580 / 21600;
        g30 = g13 * 15592 / 21600;
        g31 = g11 + g14;
        g32 = g11 + g15;
        g33 = g11 + g16;
        g34 = g11 + g17;
        g35 = g11 + g18;
        g36 = g11 + g19;
        g37 = g11 + g20;
        g38 = g11 + g21;
        g39 = g9 + g22;
        g40 = g9 + g23;
        g41 = g9 + g24;
        g42 = g9 + g25;
        g43 = g9 + g26;
        g44 = g9 + g27;
        g45 = g9 + g28;
        g46 = g9 + g29;
        g47 = g9 + g30;
        g48 = g9 + g31;

        var d = "M" + 0 + "," + h +
          " L" + w + "," + h +
          " L" + w + "," + 0 +
          " L" + 0 + "," + 0 +
          " z" +
          "M" + g11 + "," + g39 +
          " L" + g11 + "," + g44 +
          " L" + g31 + "," + g44 +
          " L" + g32 + "," + g43 +
          " L" + g33 + "," + g43 +
          " L" + g33 + "," + g47 +
          " L" + g35 + "," + g47 +
          " L" + g35 + "," + g45 +
          " L" + g36 + "," + g45 +
          " L" + g38 + "," + g46 +
          " L" + g12 + "," + g46 +
          " L" + g12 + "," + g41 +
          " L" + g38 + "," + g41 +
          " L" + g37 + "," + g42 +
          " L" + g35 + "," + g42 +
          " L" + g35 + "," + g41 +
          " L" + g34 + "," + g40 +
          " L" + g32 + "," + g40 +
          " L" + g31 + "," + g39 +
          " z";

        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "actionButtonReturn":
        var hc = w / 2, vc = h / 2, ss = Math.min(w, h);
        var dx2, g9, g10, g11, g12, g13, g14, g15, g16, g17, g18, g19, g20, g21, g22, g23, g24, g25, g26, g27;

        dx2 = ss * 3 / 8;
        g9 = vc - dx2;
        g10 = vc + dx2;
        g11 = hc - dx2;
        g12 = hc + dx2;
        g13 = ss * 3 / 4;
        g14 = g13 * 7 / 8;
        g15 = g13 * 3 / 4;
        g16 = g13 * 5 / 8;
        g17 = g13 * 3 / 8;
        g18 = g13 / 4;
        g19 = g9 + g15;
        g20 = g9 + g16;
        g21 = g9 + g18;
        g22 = g11 + g14;
        g23 = g11 + g15;
        g24 = g11 + g16;
        g25 = g11 + g17;
        g26 = g11 + g18;
        g27 = g13 / 8;
        var cX1 = g24 - g27;
        var cY2 = g19 - g27;
        var cX3 = g11 + g17;
        var cY4 = g10 - g17;

        var d = "M" + 0 + "," + h +
          " L" + w + "," + h +
          " L" + w + "," + 0 +
          " L" + 0 + "," + 0 +
          " z" +
          " M" + g12 + "," + g21 +
          " L" + g23 + "," + g9 +
          " L" + hc + "," + g21 +
          " L" + g24 + "," + g21 +
          " L" + g24 + "," + g20 +
          shapeArc(cX1, g20, g27, g27, 0, 90, false).replace("M", "L") +
          " L" + g25 + "," + g19 +
          shapeArc(g25, cY2, g27, g27, 90, 180, false).replace("M", "L") +
          " L" + g26 + "," + g21 +
          " L" + g11 + "," + g21 +
          " L" + g11 + "," + g20 +
          shapeArc(cX3, g20, g17, g17, 180, 90, false).replace("M", "L") +
          " L" + hc + "," + g10 +
          shapeArc(hc, cY4, g17, g17, 90, 0, false).replace("M", "L") +
          " L" + g22 + "," + g21 +
          " z";

        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "actionButtonSound":
        var hc = w / 2, vc = h / 2, ss = Math.min(w, h);
        var dx2, g9, g10, g11, g12, g13, g14, g15, g16, g17, g18, g19, g20, g21, g22, g23, g24, g25, g26;

        dx2 = ss * 3 / 8;
        g9 = vc - dx2;
        g10 = vc + dx2;
        g11 = hc - dx2;
        g12 = hc + dx2;
        g13 = ss * 3 / 4;
        g14 = g13 / 8;
        g15 = g13 * 5 / 16;
        g16 = g13 * 5 / 8;
        g17 = g13 * 11 / 16;
        g18 = g13 * 3 / 4;
        g19 = g13 * 7 / 8;
        g20 = g9 + g14;
        g21 = g9 + g15;
        g22 = g9 + g17;
        g23 = g9 + g19;
        g24 = g11 + g15;
        g25 = g11 + g16;
        g26 = g11 + g18;

        var d = "M" + 0 + "," + 0 +
          " L" + w + "," + 0 +
          " L" + w + "," + h +
          " L" + 0 + "," + h +
          " z" +
          " M" + g11 + "," + g21 +
          " L" + g24 + "," + g21 +
          " L" + g25 + "," + g9 +
          " L" + g25 + "," + g10 +
          " L" + g24 + "," + g22 +
          " L" + g11 + "," + g22 +
          " z" +
          " M" + g26 + "," + g21 +
          " L" + g12 + "," + g20 +
          " M" + g26 + "," + vc +
          " L" + g12 + "," + vc +
          " M" + g26 + "," + g22 +
          " L" + g12 + "," + g23;

        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "irregularSeal1":
      case "irregularSeal2":
        if (shapType == "irregularSeal1") {
          var d = "M" + w * 10800 / 21600 + "," + h * 5800 / 21600 +
            " L" + w * 14522 / 21600 + "," + 0 +
            " L" + w * 14155 / 21600 + "," + h * 5325 / 21600 +
            " L" + w * 18380 / 21600 + "," + h * 4457 / 21600 +
            " L" + w * 16702 / 21600 + "," + h * 7315 / 21600 +
            " L" + w * 21097 / 21600 + "," + h * 8137 / 21600 +
            " L" + w * 17607 / 21600 + "," + h * 10475 / 21600 +
            " L" + w + "," + h * 13290 / 21600 +
            " L" + w * 16837 / 21600 + "," + h * 12942 / 21600 +
            " L" + w * 18145 / 21600 + "," + h * 18095 / 21600 +
            " L" + w * 14020 / 21600 + "," + h * 14457 / 21600 +
            " L" + w * 13247 / 21600 + "," + h * 19737 / 21600 +
            " L" + w * 10532 / 21600 + "," + h * 14935 / 21600 +
            " L" + w * 8485 / 21600 + "," + h +
            " L" + w * 7715 / 21600 + "," + h * 15627 / 21600 +
            " L" + w * 4762 / 21600 + "," + h * 17617 / 21600 +
            " L" + w * 5667 / 21600 + "," + h * 13937 / 21600 +
            " L" + w * 135 / 21600 + "," + h * 14587 / 21600 +
            " L" + w * 3722 / 21600 + "," + h * 11775 / 21600 +
            " L" + 0 + "," + h * 8615 / 21600 +
            " L" + w * 4627 / 21600 + "," + h * 7617 / 21600 +
            " L" + w * 370 / 21600 + "," + h * 2295 / 21600 +
            " L" + w * 7312 / 21600 + "," + h * 6320 / 21600 +
            " L" + w * 8352 / 21600 + "," + h * 2295 / 21600 +
            " z";
        } else if (shapType == "irregularSeal2") {
          var d = "M" + w * 11462 / 21600 + "," + h * 4342 / 21600 +
            " L" + w * 14790 / 21600 + "," + 0 +
            " L" + w * 14525 / 21600 + "," + h * 5777 / 21600 +
            " L" + w * 18007 / 21600 + "," + h * 3172 / 21600 +
            " L" + w * 16380 / 21600 + "," + h * 6532 / 21600 +
            " L" + w + "," + h * 6645 / 21600 +
            " L" + w * 16985 / 21600 + "," + h * 9402 / 21600 +
            " L" + w * 18270 / 21600 + "," + h * 11290 / 21600 +
            " L" + w * 16380 / 21600 + "," + h * 12310 / 21600 +
            " L" + w * 18877 / 21600 + "," + h * 15632 / 21600 +
            " L" + w * 14640 / 21600 + "," + h * 14350 / 21600 +
            " L" + w * 14942 / 21600 + "," + h * 17370 / 21600 +
            " L" + w * 12180 / 21600 + "," + h * 15935 / 21600 +
            " L" + w * 11612 / 21600 + "," + h * 18842 / 21600 +
            " L" + w * 9872 / 21600 + "," + h * 17370 / 21600 +
            " L" + w * 8700 / 21600 + "," + h * 19712 / 21600 +
            " L" + w * 7527 / 21600 + "," + h * 18125 / 21600 +
            " L" + w * 4917 / 21600 + "," + h +
            " L" + w * 4805 / 21600 + "," + h * 18240 / 21600 +
            " L" + w * 1285 / 21600 + "," + h * 17825 / 21600 +
            " L" + w * 3330 / 21600 + "," + h * 15370 / 21600 +
            " L" + 0 + "," + h * 12877 / 21600 +
            " L" + w * 3935 / 21600 + "," + h * 11592 / 21600 +
            " L" + w * 1172 / 21600 + "," + h * 8270 / 21600 +
            " L" + w * 5372 / 21600 + "," + h * 7817 / 21600 +
            " L" + w * 4502 / 21600 + "," + h * 3625 / 21600 +
            " L" + w * 8550 / 21600 + "," + h * 6382 / 21600 +
            " L" + w * 9722 / 21600 + "," + h * 1887 / 21600 +
            " z";
        }
        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "flowChartTerminator":
        var x1, x2, y1, cd2 = 180, cd4 = 90, c3d4 = 270;
        x1 = w * 3475 / 21600;
        x2 = w * 18125 / 21600;
        y1 = h * 10800 / 21600;
        //path attrs: w = 21600; h = 21600;
        var d = "M" + x1 + "," + 0 +
          " L" + x2 + "," + 0 +
          shapeArc(x2, h / 2, x1, y1, c3d4, c3d4 + cd2, false).replace("M", "L") +
          " L" + x1 + "," + h +
          shapeArc(x1, h / 2, x1, y1, cd4, cd4 + cd2, false).replace("M", "L") +
          " z";
        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "flowChartPunchedTape":
        var x1, x1, y1, y2, cd2 = 180;
        x1 = w * 5 / 20;
        y1 = h * 2 / 20;
        y2 = h * 18 / 20;
        var d = "M" + 0 + "," + y1 +
          shapeArc(x1, y1, x1, y1, cd2, 0, false).replace("M", "L") +
          shapeArc(w * (3 / 4), y1, x1, y1, cd2, 360, false).replace("M", "L") +
          " L" + w + "," + y2 +
          shapeArc(w * (3 / 4), y2, x1, y1, 0, -cd2, false).replace("M", "L") +
          shapeArc(x1, y2, x1, y1, 0, cd2, false).replace("M", "L") +
          " z";
        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "flowChartOnlineStorage":
        var x1, y1, c3d4 = 270, cd4 = 90;
        x1 = w * 1 / 6;
        y1 = h * 3 / 6;
        var d = "M" + x1 + "," + 0 +
          " L" + w + "," + 0 +
          shapeArc(w, h / 2, x1, y1, c3d4, 90, false).replace("M", "L") +
          " L" + x1 + "," + h +
          shapeArc(x1, h / 2, x1, y1, cd4, 270, false).replace("M", "L") +
          " z";
        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "flowChartDisplay":
        var x1, x2, y1, c3d4 = 270, cd2 = 180;
        x1 = w * 1 / 6;
        x2 = w * 5 / 6;
        y1 = h * 3 / 6;
        //path attrs: w = 6; h = 6;
        var d = "M" + 0 + "," + y1 +
          " L" + x1 + "," + 0 +
          " L" + x2 + "," + 0 +
          shapeArc(w, h / 2, x1, y1, c3d4, c3d4 + cd2, false).replace("M", "L") +
          " L" + x1 + "," + h +
          " z";
        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "flowChartDelay":
        var wd2 = w / 2, hd2 = h / 2, cd2 = 180, c3d4 = 270, cd4 = 90;
        var d = "M" + 0 + "," + 0 +
          " L" + wd2 + "," + 0 +
          shapeArc(wd2, hd2, wd2, hd2, c3d4, c3d4 + cd2, false).replace("M", "L") +
          " L" + 0 + "," + h +
          " z";
        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "flowChartMagneticTape":
        var wd2 = w / 2, hd2 = h / 2, cd2 = 180, c3d4 = 270, cd4 = 90;
        var idy, ib, ang1;
        idy = hd2 * Math.sin(Math.PI / 4);
        ib = hd2 + idy;
        ang1 = Math.atan(h / w);
        var ang1Dg = ang1 * 180 / Math.PI;
        var d = "M" + wd2 + "," + h +
          shapeArc(wd2, hd2, wd2, hd2, cd4, cd2, false).replace("M", "L") +
          shapeArc(wd2, hd2, wd2, hd2, cd2, c3d4, false).replace("M", "L") +
          shapeArc(wd2, hd2, wd2, hd2, c3d4, 360, false).replace("M", "L") +
          shapeArc(wd2, hd2, wd2, hd2, 0, ang1Dg, false).replace("M", "L") +
          " L" + w + "," + ib +
          " L" + w + "," + h +
          " z";
        result += "<path d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "ellipse":
      case "flowChartConnector":
      case "flowChartSummingJunction":
      case "flowChartOr":
        result += "<ellipse cx='" + (w / 2) + "' cy='" + (h / 2) + "' rx='" + (w / 2) + "' ry='" + (h / 2) + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        if (shapType == "flowChartOr") {
          result += " <polyline points='" + w / 2 + " " + 0 + "," + w / 2 + " " + h + "' fill='none' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
          result += " <polyline points='" + 0 + " " + h / 2 + "," + w + " " + h / 2 + "' fill='none' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        } else if (shapType == "flowChartSummingJunction") {
          var iDx, idy, il, ir, it, ib, hc = w / 2, vc = h / 2, wd2 = w / 2, hd2 = h / 2;
          var angVal = Math.PI / 4;
          iDx = wd2 * Math.cos(angVal);
          idy = hd2 * Math.sin(angVal);
          il = hc - iDx;
          ir = hc + iDx;
          it = vc - idy;
          ib = vc + idy;
          result += " <polyline points='" + il + " " + it + "," + ir + " " + ib + "' fill='none' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
          result += " <polyline points='" + ir + " " + it + "," + il + " " + ib + "' fill='none' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        }
        break;
      case "roundRect":
      case "round1Rect":
      case "round2DiagRect":
      case "round2SameRect":
      case "snip1Rect":
      case "snip2DiagRect":
      case "snip2SameRect":
      case "flowChartAlternateProcess":
      case "flowChartPunchedCard":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, sAdj1_val;// = 0.33334;
        var sAdj2, sAdj2_val;// = 0.33334;
        var shpTyp, adjTyp;
        if (shapAdjst_ary !== undefined && shapAdjst_ary.constructor === Array) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              sAdj1_val = parseInt(sAdj1.substr(4)) / 50000;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              sAdj2_val = parseInt(sAdj2.substr(4)) / 50000;
            }
          }
        } else if (shapAdjst_ary !== undefined && shapAdjst_ary.constructor !== Array) {
          var sAdj = getTextByPathList(shapAdjst_ary, [ "attrs", "fmla" ]);
          sAdj1_val = parseInt(sAdj.substr(4)) / 50000;
          sAdj2_val = 0;
        }
        //console.log("shapType: ",shapType,",node: ",node )
        var tranglRott = "";
        switch (shapType) {
          case "roundRect":
          case "flowChartAlternateProcess":
            shpTyp = "round";
            adjTyp = "cornrAll";
            if (sAdj1_val === undefined) sAdj1_val = 0.33334;
            sAdj2_val = 0;
            break;
          case "round1Rect":
            shpTyp = "round";
            adjTyp = "cornr1";
            if (sAdj1_val === undefined) sAdj1_val = 0.33334;
            sAdj2_val = 0;
            break;
          case "round2DiagRect":
            shpTyp = "round";
            adjTyp = "diag";
            if (sAdj1_val === undefined) sAdj1_val = 0.33334;
            if (sAdj2_val === undefined) sAdj2_val = 0;
            break;
          case "round2SameRect":
            shpTyp = "round";
            adjTyp = "cornr2";
            if (sAdj1_val === undefined) sAdj1_val = 0.33334;
            if (sAdj2_val === undefined) sAdj2_val = 0;
            break;
          case "snip1Rect":
          case "flowChartPunchedCard":
            shpTyp = "snip";
            adjTyp = "cornr1";
            if (sAdj1_val === undefined) sAdj1_val = 0.33334;
            sAdj2_val = 0;
            if (shapType == "flowChartPunchedCard") {
              tranglRott = "transform='translate(" + w + ",0) scale(-1,1)'";
            }
            break;
          case "snip2DiagRect":
            shpTyp = "snip";
            adjTyp = "diag";
            if (sAdj1_val === undefined) sAdj1_val = 0;
            if (sAdj2_val === undefined) sAdj2_val = 0.33334;
            break;
          case "snip2SameRect":
            shpTyp = "snip";
            adjTyp = "cornr2";
            if (sAdj1_val === undefined) sAdj1_val = 0.33334;
            if (sAdj2_val === undefined) sAdj2_val = 0;
            break;
        }
        var d_val = shapeSnipRoundRect(w, h, sAdj1_val, sAdj2_val, shpTyp, adjTyp);
        result += "<path " + tranglRott + "  d='" + d_val + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "snipRoundRect":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, sAdj1_val = 0.33334;
        var sAdj2, sAdj2_val = 0.33334;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              sAdj1_val = parseInt(sAdj1.substr(4)) / 50000;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              sAdj2_val = parseInt(sAdj2.substr(4)) / 50000;
            }
          }
        }
        var d_val = "M0," + h + " L" + w + "," + h + " L" + w + "," + (h / 2) * sAdj2_val +
          " L" + (w / 2 + (w / 2) * (1 - sAdj2_val)) + ",0 L" + (w / 2) * sAdj1_val + ",0 Q0,0 0," + (h / 2) * sAdj1_val + " z";

        result += "<path   d='" + d_val + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "bentConnector2":
        var connectorPoints = getBentConnectorPoints(shapType, node, w, h);
        result += "<polyline points='" + connectorPoints.map(function (point) { return point[0] + " " + point[1]; }).join(",") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray +
          "' fill='none' " + getConnectorMarkerAttributes(shpId, headEndNodeAttrs, tailEndNodeAttrs) + "/>";
        break;
      case "rtTriangle":
        result += " <polygon points='0 0,0 " + h + "," + w + " " + h + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "triangle":
      case "flowChartExtract":
      case "flowChartMerge":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var shapAdjst_val = 0.5;
        if (shapAdjst !== undefined) {
          shapAdjst_val = parseInt(shapAdjst.substr(4)) * slideFactor;
          //console.log("w: "+w+"\nh: "+h+"\nshapAdjst: "+shapAdjst+"\nshapAdjst_val: "+shapAdjst_val);
        }
        var tranglRott = "";
        if (shapType == "flowChartMerge") {
          tranglRott = "transform='rotate(180 " + w / 2 + "," + h / 2 + ")'";
        }
        result += " <polygon " + tranglRott + " points='" + (w * shapAdjst_val) + " 0,0 " + h + "," + w + " " + h + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "diamond":
      case "flowChartDecision":
      case "flowChartSort":
        result += " <polygon points='" + (w / 2) + " 0,0 " + (h / 2) + "," + (w / 2) + " " + h + "," + w + " " + (h / 2) + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        if (shapType == "flowChartSort") {
          result += " <polyline points='0 " + h / 2 + "," + w + " " + h / 2 + "' fill='none' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        }
        break;
      case "trapezoid":
        var trapezoidAdjustmentFormula = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var trapezoidAdjustment = 25000;
        if (trapezoidAdjustmentFormula !== undefined) {
          trapezoidAdjustment = toFiniteNumber(String(trapezoidAdjustmentFormula).replace(/^val\s+/, ""), 25000);
        }
        var trapezoidPoints = formatSvgPoints(getTrapezoidPoints(w, h, trapezoidAdjustment));
        result += " <polygon points='" + trapezoidPoints + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "flowChartManualOperation":
        result += " <polygon points='0 0," + w + " 0," + (w * 4 / 5) + " " + h + "," + (w / 5) + " " + h + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "flowChartManualInput":
        result += " <polygon points='0 " + (h / 5) + "," + w + " 0," + w + " " + h + ",0 " + h + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "parallelogram":
      case "flowChartInputOutput":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var adjst_val = 0.25;
        var max_adj_const;
        if (w > h) {
          max_adj_const = w / h;
        } else {
          max_adj_const = h / w;
        }
        if (shapAdjst !== undefined) {
          var adjst = parseInt(shapAdjst.substr(4)) / 100000;
          adjst_val = adjst / max_adj_const;
          //console.log("w: "+w+"\nh: "+h+"\nadjst: "+adjst_val+"\nmax_adj_const: "+max_adj_const);
        }
        result += " <polygon points='" + adjst_val * w + " 0,0 " + h + "," + (1 - adjst_val) * w + " " + h + "," + w + " 0' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;

        break;
      case "pentagon":
        result += " <polygon points='" + (0.5 * w) + " 0,0 " + (0.375 * h) + "," + (0.15 * w) + " " + h + "," + 0.85 * w + " " + h + "," + w + " " + 0.375 * h + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "hexagon":
      case "flowChartPreparation":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var adj = 25000 * slideFactor;
        var vf = 115470 * slideFactor;
        ;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        var angVal1 = 60 * Math.PI / 180;
        if (shapAdjst !== undefined) {
          adj = parseInt(shapAdjst.substr(4)) * slideFactor;
        }
        var maxAdj, a, shd2, x1, x2, dy1, y1, y2, vc = h / 2, hd2 = h / 2;
        var ss = Math.min(w, h);
        maxAdj = cnstVal1 * w / ss;
        a = (adj < 0) ? 0 : (adj > maxAdj) ? maxAdj : adj;
        shd2 = hd2 * vf / cnstVal2;
        x1 = ss * a / cnstVal2;
        x2 = w - x1;
        dy1 = shd2 * Math.sin(angVal1);
        y1 = vc - dy1;
        y2 = vc + dy1;

        var d = "M" + 0 + "," + vc +
          " L" + x1 + "," + y1 +
          " L" + x2 + "," + y1 +
          " L" + w + "," + vc +
          " L" + x2 + "," + y2 +
          " L" + x1 + "," + y2 +
          " z";

        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "heptagon":
        result += " <polygon points='" + (0.5 * w) + " 0," + w / 8 + " " + h / 4 + ",0 " + (5 / 8) * h + "," + w / 4 + " " + h + "," + (3 / 4) * w + " " + h + "," +
          w + " " + (5 / 8) * h + "," + (7 / 8) * w + " " + h / 4 + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "octagon":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var adj1 = 0.25;
        if (shapAdjst !== undefined) {
          adj1 = parseInt(shapAdjst.substr(4)) / 100000;

        }
        var adj2 = (1 - adj1);
        //console.log("adj1: "+adj1+"\nadj2: "+adj2);
        result += " <polygon points='" + adj1 * w + " 0,0 " + adj1 * h + ",0 " + adj2 * h + "," + adj1 * w + " " + h + "," + adj2 * w + " " + h + "," +
          w + " " + adj2 * h + "," + w + " " + adj1 * h + "," + adj2 * w + " 0' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "decagon":
        result += " <polygon points='" + (3 / 8) * w + " 0," + w / 8 + " " + h / 8 + ",0 " + h / 2 + "," + w / 8 + " " + (7 / 8) * h + "," + (3 / 8) * w + " " + h + "," +
          (5 / 8) * w + " " + h + "," + (7 / 8) * w + " " + (7 / 8) * h + "," + w + " " + h / 2 + "," + (7 / 8) * w + " " + h / 8 + "," + (5 / 8) * w + " 0' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "dodecagon":
        result += " <polygon points='" + (3 / 8) * w + " 0," + w / 8 + " " + h / 8 + ",0 " + (3 / 8) * h + ",0 " + (5 / 8) * h + "," + w / 8 + " " + (7 / 8) * h + "," + (3 / 8) * w + " " + h + "," +
          (5 / 8) * w + " " + h + "," + (7 / 8) * w + " " + (7 / 8) * h + "," + w + " " + (5 / 8) * h + "," + w + " " + (3 / 8) * h + "," + (7 / 8) * w + " " + h / 8 + "," + (5 / 8) * w + " 0' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "star4":
        var a, iwd2, ihd2, sdx, sdy, sx1, sx2, sy1, sy2, yAdj;
        var hc = w / 2, vc = h / 2, wd2 = w / 2, hd2 = h / 2;
        var adj = 19098 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);//[0]["attrs"]["fmla"];
        //console.log("star4 node: ", node, "shapAdjst:", shapAdjst)
        if (shapAdjst !== undefined) {
          var name = shapAdjst["attrs"]["name"];
          if (name == "adj") {
            adj = parseInt(shapAdjst["attrs"]["fmla"].substr(4)) * slideFactor;
            //min = 0
            //max = 50000
          }
        }
        a = (adj < 0) ? 0 : (adj > cnstVal1) ? cnstVal1 : adj;
        iwd2 = wd2 * a / cnstVal1;
        ihd2 = hd2 * a / cnstVal1;
        sdx = iwd2 * Math.cos(0.7853981634); //cd8 = 2700000; (45°) =>
        sdy = ihd2 * Math.sin(0.7853981634);
        sx1 = hc - sdx;
        sx2 = hc + sdx;
        sy1 = vc - sdy;
        sy2 = vc + sdy;
        yAdj = vc - ihd2;

        var d = "M0" + "," + vc +
          " L" + sx1 + "," + sy1 +
          " L" + hc + ",0" +
          " L" + sx2 + "," + sy1 +
          " L" + w + "," + vc +
          " L" + sx2 + "," + sy2 +
          " L" + hc + "," + h +
          " L" + sx1 + "," + sy2 +
          " z";

        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "star5":
        var a, swd2, shd2, svc, dx1, dx2, dy1, dy2, x1, x2, x3, x4, y1, y2, iwd2, ihd2, sdx1, sdx2, sdy1, sdy2, sx1,
          sx2, sx3, sx4, sy1, sy2, sy3, yAdj;
        var hc = w / 2, vc = h / 2, wd2 = w / 2, hd2 = h / 2;
        var adj = 19098 * slideFactor;
        var hf = 105146 * slideFactor;
        var vf = 110557 * slideFactor;
        var maxAdj = 50000 * slideFactor;
        var cnstVal1 = 100000 * slideFactor;
        //var radians = angle * (Math.PI / 180);
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);//[0]["attrs"]["fmla"];
        //console.log("star5 node: ", node, "shapAdjst:", shapAdjst)
        if (shapAdjst !== undefined) {
          Object.keys(shapAdjst).forEach(function (key) {
            var name = shapAdjst[key]["attrs"]["name"];
            if (name == "adj") {
              adj = parseInt(shapAdjst[key]["attrs"]["fmla"].substr(4)) * slideFactor;
              //min = 0
              //max = 50000
            } else if (name == "hf") {
              hf = parseInt(shapAdjst[key]["attrs"]["fmla"].substr(4)) * slideFactor;
            } else if (name == "vf") {
              vf = parseInt(shapAdjst[key]["attrs"]["fmla"].substr(4)) * slideFactor;
            }
          })
        }
        a = (adj < 0) ? 0 : (adj > maxAdj) ? maxAdj : adj;
        swd2 = wd2 * hf / cnstVal1;
        shd2 = hd2 * vf / cnstVal1;
        svc = vc * vf / cnstVal1;
        dx1 = swd2 * Math.cos(0.31415926536); // 1080000
        dx2 = swd2 * Math.cos(5.3407075111); // 18360000
        dy1 = shd2 * Math.sin(0.31415926536); //1080000
        dy2 = shd2 * Math.sin(5.3407075111);// 18360000
        x1 = hc - dx1;
        x2 = hc - dx2;
        x3 = hc + dx2;
        x4 = hc + dx1;
        y1 = svc - dy1;
        y2 = svc - dy2;
        iwd2 = swd2 * a / maxAdj;
        ihd2 = shd2 * a / maxAdj;
        sdx1 = iwd2 * Math.cos(5.9690260418); // 20520000
        sdx2 = iwd2 * Math.cos(0.94247779608); // 3240000
        sdy1 = ihd2 * Math.sin(0.94247779608); // 3240000
        sdy2 = ihd2 * Math.sin(5.9690260418); // 20520000
        sx1 = hc - sdx1;
        sx2 = hc - sdx2;
        sx3 = hc + sdx2;
        sx4 = hc + sdx1;
        sy1 = svc - sdy1;
        sy2 = svc - sdy2;
        sy3 = svc + ihd2;
        yAdj = svc - ihd2;

        var d = "M" + x1 + "," + y1 +
          " L" + sx2 + "," + sy1 +
          " L" + hc + "," + 0 +
          " L" + sx3 + "," + sy1 +
          " L" + x4 + "," + y1 +
          " L" + sx4 + "," + sy2 +
          " L" + x3 + "," + y2 +
          " L" + hc + "," + sy3 +
          " L" + x2 + "," + y2 +
          " L" + sx1 + "," + sy2 +
          " z";


        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "star6":
        var a, swd2, dx1, x1, x2, y2, iwd2, ihd2, sdx2, sx1, sx2, sx3, sx4, sdy1, sy1, sy2, yAdj;
        var hc = w / 2, vc = h / 2, wd2 = w / 2, hd2 = h / 2, hd4 = h / 4;
        var adj = 28868 * slideFactor;
        var hf = 115470 * slideFactor;
        var maxAdj = 50000 * slideFactor;
        var cnstVal1 = 100000 * slideFactor;
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);//[0]["attrs"]["fmla"];
        //console.log("star5 node: ", node, "shapAdjst:", shapAdjst)
        if (shapAdjst !== undefined) {
          Object.keys(shapAdjst).forEach(function (key) {
            var name = shapAdjst[key]["attrs"]["name"];
            if (name == "adj") {
              adj = parseInt(shapAdjst[key]["attrs"]["fmla"].substr(4)) * slideFactor;
              //min = 0
              //max = 50000
            } else if (name == "hf") {
              hf = parseInt(shapAdjst[key]["attrs"]["fmla"].substr(4)) * slideFactor;
            }
          })
        }
        a = (adj < 0) ? 0 : (adj > maxAdj) ? maxAdj : adj;
        swd2 = wd2 * hf / cnstVal1;
        dx1 = swd2 * Math.cos(0.5235987756); //1800000->30 ->0.5235987756
        x1 = hc - dx1;
        x2 = hc + dx1;
        y2 = vc + hd4;
        iwd2 = swd2 * a / maxAdj;
        ihd2 = hd2 * a / maxAdj;
        sdx2 = iwd2 / 2;
        sx1 = hc - iwd2;
        sx2 = hc - sdx2;
        sx3 = hc + sdx2;
        sx4 = hc + iwd2;
        sdy1 = ihd2 * Math.sin(1.0471975512); //3600000->60->1.0471975512
        sy1 = vc - sdy1;
        sy2 = vc + sdy1;
        yAdj = vc - ihd2;

        var d = "M" + x1 + "," + hd4 +
          " L" + sx2 + "," + sy1 +
          " L" + hc + ",0" +
          " L" + sx3 + "," + sy1 +
          " L" + x2 + "," + hd4 +
          " L" + sx4 + "," + vc +
          " L" + x2 + "," + y2 +
          " L" + sx3 + "," + sy2 +
          " L" + hc + "," + h +
          " L" + sx2 + "," + sy2 +
          " L" + x1 + "," + y2 +
          " L" + sx1 + "," + vc +
          " z";


        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "star7":
        var a, swd2, shd2, svc, dx1, dx2, dx3, dy1, dy2, dy3, x1, x2, x3, x4, x5, x6, y1, y2, y3,
          iwd2, ihd2, sdx1, sdx2, sdx3, sx1, sx2, sx3, sx4, sx5, sx6, sdy1, sdy2, sdy3, sy1, sy2, sy3, sy4, yAdj;
        var hc = w / 2, vc = h / 2, wd2 = w / 2, hd2 = h / 2;
        var adj = 34601 * slideFactor;
        var hf = 102572 * slideFactor;
        var vf = 105210 * slideFactor;
        var maxAdj = 50000 * slideFactor;
        var cnstVal1 = 100000 * slideFactor;

        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);//[0]["attrs"]["fmla"];
        //console.log("star5 node: ", node, "shapAdjst:", shapAdjst)
        if (shapAdjst !== undefined) {
          Object.keys(shapAdjst).forEach(function (key) {
            var name = shapAdjst[key]["attrs"]["name"];
            if (name == "adj") {
              adj = parseInt(shapAdjst[key]["attrs"]["fmla"].substr(4)) * slideFactor;
              //min = 0
              //max = 50000
            } else if (name == "hf") {
              hf = parseInt(shapAdjst[key]["attrs"]["fmla"].substr(4)) * slideFactor;
            } else if (name == "vf") {
              vf = parseInt(shapAdjst[key]["attrs"]["fmla"].substr(4)) * slideFactor;
            }
          })
        }
        a = (adj < 0) ? 0 : (adj > maxAdj) ? maxAdj : adj;
        swd2 = wd2 * hf / cnstVal1;
        shd2 = hd2 * vf / cnstVal1;
        svc = vc * vf / cnstVal1;
        dx1 = swd2 * 97493 / 100000;
        dx2 = swd2 * 78183 / 100000;
        dx3 = swd2 * 43388 / 100000;
        dy1 = shd2 * 62349 / 100000;
        dy2 = shd2 * 22252 / 100000;
        dy3 = shd2 * 90097 / 100000;
        x1 = hc - dx1;
        x2 = hc - dx2;
        x3 = hc - dx3;
        x4 = hc + dx3;
        x5 = hc + dx2;
        x6 = hc + dx1;
        y1 = svc - dy1;
        y2 = svc + dy2;
        y3 = svc + dy3;
        iwd2 = swd2 * a / maxAdj;
        ihd2 = shd2 * a / maxAdj;
        sdx1 = iwd2 * 97493 / 100000;
        sdx2 = iwd2 * 78183 / 100000;
        sdx3 = iwd2 * 43388 / 100000;
        sx1 = hc - sdx1;
        sx2 = hc - sdx2;
        sx3 = hc - sdx3;
        sx4 = hc + sdx3;
        sx5 = hc + sdx2;
        sx6 = hc + sdx1;
        sdy1 = ihd2 * 90097 / 100000;
        sdy2 = ihd2 * 22252 / 100000;
        sdy3 = ihd2 * 62349 / 100000;
        sy1 = svc - sdy1;
        sy2 = svc - sdy2;
        sy3 = svc + sdy3;
        sy4 = svc + ihd2;
        yAdj = svc - ihd2;

        var d = "M" + x1 + "," + y2 +
          " L" + sx1 + "," + sy2 +
          " L" + x2 + "," + y1 +
          " L" + sx3 + "," + sy1 +
          " L" + hc + ",0" +
          " L" + sx4 + "," + sy1 +
          " L" + x5 + "," + y1 +
          " L" + sx6 + "," + sy2 +
          " L" + x6 + "," + y2 +
          " L" + sx5 + "," + sy3 +
          " L" + x4 + "," + y3 +
          " L" + hc + "," + sy4 +
          " L" + x3 + "," + y3 +
          " L" + sx2 + "," + sy3 +
          " z";


        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "star8":
        var a, dx1, x1, x2, dy1, y1, y2, iwd2, ihd2, sdx1, sdx2, sdy1, sdy2, sx1, sx2, sx3, sx4, sy1, sy2, sy3, sy4,
          yAdj;
        var hc = w / 2, vc = h / 2, wd2 = w / 2, hd2 = h / 2;
        var adj = 37500 * slideFactor;
        var maxAdj = 50000 * slideFactor;
        var cnstVal1 = 100000 * slideFactor;
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);//[0]["attrs"]["fmla"];
        //console.log("star4 node: ", node, "shapAdjst:", shapAdjst)
        if (shapAdjst !== undefined) {
          var name = shapAdjst["attrs"]["name"];
          if (name == "adj") {
            adj = parseInt(shapAdjst["attrs"]["fmla"].substr(4)) * slideFactor;
            //min = 0
            //max = 50000
          }
        }
        a = (adj < 0) ? 0 : (adj > maxAdj) ? maxAdj : adj;
        dx1 = wd2 * Math.cos(0.7853981634); //2700000
        x1 = hc - dx1;
        x2 = hc + dx1;
        dy1 = hd2 * Math.sin(0.7853981634); //2700000
        y1 = vc - dy1;
        y2 = vc + dy1;
        iwd2 = wd2 * a / maxAdj;
        ihd2 = hd2 * a / maxAdj;
        sdx1 = iwd2 * 92388 / 100000;
        sdx2 = iwd2 * 38268 / 100000;
        sdy1 = ihd2 * 92388 / 100000;
        sdy2 = ihd2 * 38268 / 100000;
        sx1 = hc - sdx1;
        sx2 = hc - sdx2;
        sx3 = hc + sdx2;
        sx4 = hc + sdx1;
        sy1 = vc - sdy1;
        sy2 = vc - sdy2;
        sy3 = vc + sdy2;
        sy4 = vc + sdy1;
        yAdj = vc - ihd2;
        var d = "M0" + "," + vc +
          " L" + sx1 + "," + sy2 +
          " L" + x1 + "," + y1 +
          " L" + sx2 + "," + sy1 +
          " L" + hc + ",0" +
          " L" + sx3 + "," + sy1 +
          " L" + x2 + "," + y1 +
          " L" + sx4 + "," + sy2 +
          " L" + w + "," + vc +
          " L" + sx4 + "," + sy3 +
          " L" + x2 + "," + y2 +
          " L" + sx3 + "," + sy4 +
          " L" + hc + "," + h +
          " L" + sx2 + "," + sy4 +
          " L" + x1 + "," + y2 +
          " L" + sx1 + "," + sy3 +
          " z";
        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;

      case "star10":
        var a, swd2, dx1, dx2, x1, x2, x3, x4, dy1, dy2, y1, y2, y3, y4, iwd2, ihd2,
          sdx1, sdx2, sdy1, sdy2, sx1, sx2, sx3, sx4, sx5, sx6, sy1, sy2, sy3, sy4, yAdj;
        var hc = w / 2, vc = h / 2, wd2 = w / 2, hd2 = h / 2;
        var adj = 42533 * slideFactor;
        var hf = 105146 * slideFactor;
        var maxAdj = 50000 * slideFactor;
        var cnstVal1 = 100000 * slideFactor;
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);//[0]["attrs"]["fmla"];
        //console.log("star5 node: ", node, "shapAdjst:", shapAdjst)
        if (shapAdjst !== undefined) {
          Object.keys(shapAdjst).forEach(function (key) {
            var name = shapAdjst[key]["attrs"]["name"];
            if (name == "adj") {
              adj = parseInt(shapAdjst[key]["attrs"]["fmla"].substr(4)) * slideFactor;
              //min = 0
              //max = 50000
            } else if (name == "hf") {
              hf = parseInt(shapAdjst[key]["attrs"]["fmla"].substr(4)) * slideFactor;
            }
          })
        }
        a = (adj < 0) ? 0 : (adj > maxAdj) ? maxAdj : adj;
        swd2 = wd2 * hf / cnstVal1;
        dx1 = swd2 * 95106 / 100000;
        dx2 = swd2 * 58779 / 100000;
        x1 = hc - dx1;
        x2 = hc - dx2;
        x3 = hc + dx2;
        x4 = hc + dx1;
        dy1 = hd2 * 80902 / 100000;
        dy2 = hd2 * 30902 / 100000;
        y1 = vc - dy1;
        y2 = vc - dy2;
        y3 = vc + dy2;
        y4 = vc + dy1;
        iwd2 = swd2 * a / maxAdj;
        ihd2 = hd2 * a / maxAdj;
        sdx1 = iwd2 * 80902 / 100000;
        sdx2 = iwd2 * 30902 / 100000;
        sdy1 = ihd2 * 95106 / 100000;
        sdy2 = ihd2 * 58779 / 100000;
        sx1 = hc - iwd2;
        sx2 = hc - sdx1;
        sx3 = hc - sdx2;
        sx4 = hc + sdx2;
        sx5 = hc + sdx1;
        sx6 = hc + iwd2;
        sy1 = vc - sdy1;
        sy2 = vc - sdy2;
        sy3 = vc + sdy2;
        sy4 = vc + sdy1;
        yAdj = vc - ihd2;
        var d = "M" + x1 + "," + y2 +
          " L" + sx2 + "," + sy2 +
          " L" + x2 + "," + y1 +
          " L" + sx3 + "," + sy1 +
          " L" + hc + ",0" +
          " L" + sx4 + "," + sy1 +
          " L" + x3 + "," + y1 +
          " L" + sx5 + "," + sy2 +
          " L" + x4 + "," + y2 +
          " L" + sx6 + "," + vc +
          " L" + x4 + "," + y3 +
          " L" + sx5 + "," + sy3 +
          " L" + x3 + "," + y4 +
          " L" + sx4 + "," + sy4 +
          " L" + hc + "," + h +
          " L" + sx3 + "," + sy4 +
          " L" + x2 + "," + y4 +
          " L" + sx2 + "," + sy3 +
          " L" + x1 + "," + y3 +
          " L" + sx1 + "," + vc +
          " z";
        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "star12":
        var a, dx1, dy1, x1, x3, x4, y1, y3, y4, iwd2, ihd2, sdx1, sdx2, sdx3, sdy1,
          sdy2, sdy3, sx1, sx2, sx3, sx4, sx5, sx6, sy1, sy2, sy3, sy4, sy5, sy6, yAdj;
        var hc = w / 2, vc = h / 2, wd2 = w / 2, hd2 = h / 2, hd4 = h / 4, wd4 = w / 4;
        var adj = 37500 * slideFactor;
        var maxAdj = 50000 * slideFactor;
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);//[0]["attrs"]["fmla"];
        //console.log("star4 node: ", node, "shapAdjst:", shapAdjst)
        if (shapAdjst !== undefined) {
          var name = shapAdjst["attrs"]["name"];
          if (name == "adj") {
            adj = parseInt(shapAdjst["attrs"]["fmla"].substr(4)) * slideFactor;
            //min = 0
            //max = 50000
          }
        }
        a = (adj < 0) ? 0 : (adj > maxAdj) ? maxAdj : adj;
        dx1 = wd2 * Math.cos(0.5235987756);
        dy1 = hd2 * Math.sin(1.0471975512);
        x1 = hc - dx1;
        x3 = w * 3 / 4;
        x4 = hc + dx1;
        y1 = vc - dy1;
        y3 = h * 3 / 4;
        y4 = vc + dy1;
        iwd2 = wd2 * a / maxAdj;
        ihd2 = hd2 * a / maxAdj;
        sdx1 = iwd2 * Math.cos(0.2617993878); //900000->15
        sdx2 = iwd2 * Math.cos(0.7853981634);
        sdx3 = iwd2 * Math.cos(1.308996939); //4500000->75
        sdy1 = ihd2 * Math.sin(1.308996939);
        sdy2 = ihd2 * Math.sin(0.7853981634);
        sdy3 = ihd2 * Math.sin(0.2617993878);
        sx1 = hc - sdx1;
        sx2 = hc - sdx2;
        sx3 = hc - sdx3;
        sx4 = hc + sdx3;
        sx5 = hc + sdx2;
        sx6 = hc + sdx1;
        sy1 = vc - sdy1;
        sy2 = vc - sdy2;
        sy3 = vc - sdy3;
        sy4 = vc + sdy3;
        sy5 = vc + sdy2;
        sy6 = vc + sdy1;
        yAdj = vc - ihd2;
        var d = "M0" + "," + vc +
          " L" + sx1 + "," + sy3 +
          " L" + x1 + "," + hd4 +
          " L" + sx2 + "," + sy2 +
          " L" + wd4 + "," + y1 +
          " L" + sx3 + "," + sy1 +
          " L" + hc + ",0" +
          " L" + sx4 + "," + sy1 +
          " L" + x3 + "," + y1 +
          " L" + sx5 + "," + sy2 +
          " L" + x4 + "," + hd4 +
          " L" + sx6 + "," + sy3 +
          " L" + w + "," + vc +
          " L" + sx6 + "," + sy4 +
          " L" + x4 + "," + y3 +
          " L" + sx5 + "," + sy5 +
          " L" + x3 + "," + y4 +
          " L" + sx4 + "," + sy6 +
          " L" + hc + "," + h +
          " L" + sx3 + "," + sy6 +
          " L" + wd4 + "," + y4 +
          " L" + sx2 + "," + sy5 +
          " L" + x1 + "," + y3 +
          " L" + sx1 + "," + sy4 +
          " z";
        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "star16":
        var a, dx1, dx2, dx3, dy1, dy2, dy3, x1, x2, x3, x4, x5, x6, y1, y2, y3, y4, y5, y6,
          iwd2, ihd2, sdx1, sdx2, sdx3, sdx4, sdy1, sdy2, sdy3, sdy4, sx1, sx2, sx3, sx4,
          sx5, sx6, sx7, sx8, sy1, sy2, sy3, sy4, sy5, sy6, sy7, sy8, iDx, idy, il, it, ir, ib, yAdj;
        var hc = w / 2, vc = h / 2, wd2 = w / 2, hd2 = h / 2;
        var adj = 37500 * slideFactor;
        var maxAdj = 50000 * slideFactor;
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);//[0]["attrs"]["fmla"];
        //console.log("star4 node: ", node, "shapAdjst:", shapAdjst)
        if (shapAdjst !== undefined) {
          var name = shapAdjst["attrs"]["name"];
          if (name == "adj") {
            adj = parseInt(shapAdjst["attrs"]["fmla"].substr(4)) * slideFactor;
            //min = 0
            //max = 50000
          }
        }
        a = (adj < 0) ? 0 : (adj > maxAdj) ? maxAdj : adj;
        dx1 = wd2 * 92388 / 100000;
        dx2 = wd2 * 70711 / 100000;
        dx3 = wd2 * 38268 / 100000;
        dy1 = hd2 * 92388 / 100000;
        dy2 = hd2 * 70711 / 100000;
        dy3 = hd2 * 38268 / 100000;
        x1 = hc - dx1;
        x2 = hc - dx2;
        x3 = hc - dx3;
        x4 = hc + dx3;
        x5 = hc + dx2;
        x6 = hc + dx1;
        y1 = vc - dy1;
        y2 = vc - dy2;
        y3 = vc - dy3;
        y4 = vc + dy3;
        y5 = vc + dy2;
        y6 = vc + dy1;
        iwd2 = wd2 * a / maxAdj;
        ihd2 = hd2 * a / maxAdj;
        sdx1 = iwd2 * 98079 / 100000;
        sdx2 = iwd2 * 83147 / 100000;
        sdx3 = iwd2 * 55557 / 100000;
        sdx4 = iwd2 * 19509 / 100000;
        sdy1 = ihd2 * 98079 / 100000;
        sdy2 = ihd2 * 83147 / 100000;
        sdy3 = ihd2 * 55557 / 100000;
        sdy4 = ihd2 * 19509 / 100000;
        sx1 = hc - sdx1;
        sx2 = hc - sdx2;
        sx3 = hc - sdx3;
        sx4 = hc - sdx4;
        sx5 = hc + sdx4;
        sx6 = hc + sdx3;
        sx7 = hc + sdx2;
        sx8 = hc + sdx1;
        sy1 = vc - sdy1;
        sy2 = vc - sdy2;
        sy3 = vc - sdy3;
        sy4 = vc - sdy4;
        sy5 = vc + sdy4;
        sy6 = vc + sdy3;
        sy7 = vc + sdy2;
        sy8 = vc + sdy1;
        iDx = iwd2 * Math.cos(0.7853981634);
        idy = ihd2 * Math.sin(0.7853981634);
        il = hc - iDx;
        it = vc - idy;
        ir = hc + iDx;
        ib = vc + idy;
        yAdj = vc - ihd2;
        var d = "M0" + "," + vc +
          " L" + sx1 + "," + sy4 +
          " L" + x1 + "," + y3 +
          " L" + sx2 + "," + sy3 +
          " L" + x2 + "," + y2 +
          " L" + sx3 + "," + sy2 +
          " L" + x3 + "," + y1 +
          " L" + sx4 + "," + sy1 +
          " L" + hc + ",0" +
          " L" + sx5 + "," + sy1 +
          " L" + x4 + "," + y1 +
          " L" + sx6 + "," + sy2 +
          " L" + x5 + "," + y2 +
          " L" + sx7 + "," + sy3 +
          " L" + x6 + "," + y3 +
          " L" + sx8 + "," + sy4 +
          " L" + w + "," + vc +
          " L" + sx8 + "," + sy5 +
          " L" + x6 + "," + y4 +
          " L" + sx7 + "," + sy6 +
          " L" + x5 + "," + y5 +
          " L" + sx6 + "," + sy7 +
          " L" + x4 + "," + y6 +
          " L" + sx5 + "," + sy8 +
          " L" + hc + "," + h +
          " L" + sx4 + "," + sy8 +
          " L" + x3 + "," + y6 +
          " L" + sx3 + "," + sy7 +
          " L" + x2 + "," + y5 +
          " L" + sx2 + "," + sy6 +
          " L" + x1 + "," + y4 +
          " L" + sx1 + "," + sy5 +
          " z";
        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "star24":
        var a, dx1, dx2, dx3, dx4, dx5, dy1, dy2, dy3, dy4, dy5, x1, x2, x3, x4, x5, x6, x7, x8, x9, x10,
          y1, y2, y3, y4, y5, y6, y7, y8, y9, y10, iwd2, ihd2, sdx1, sdx2, sdx3, sdx4, sdx5, sdx6, sdy1,
          sdy2, sdy3, sdy4, sdy5, sdy6, sx1, sx2, sx3, sx4, sx5, sx6, sx7, sx8, sx9, sx10, sx11, sx12,
          sy1, sy2, sy3, sy4, sy5, sy6, sy7, sy8, sy9, sy10, sy11, sy12, iDx, idy, il, it, ir, ib, yAdj;
        var hc = w / 2, vc = h / 2, wd2 = w / 2, hd2 = h / 2, hd4 = h / 4, wd4 = w / 4;
        var adj = 37500 * slideFactor;
        var maxAdj = 50000 * slideFactor;
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);//[0]["attrs"]["fmla"];
        //console.log("star4 node: ", node, "shapAdjst:", shapAdjst)
        if (shapAdjst !== undefined) {
          var name = shapAdjst["attrs"]["name"];
          if (name == "adj") {
            adj = parseInt(shapAdjst["attrs"]["fmla"].substr(4)) * slideFactor;
          }
        }
        a = (adj < 0) ? 0 : (adj > maxAdj) ? maxAdj : adj;
        dx1 = wd2 * Math.cos(0.2617993878);
        dx2 = wd2 * Math.cos(0.5235987756);
        dx3 = wd2 * Math.cos(0.7853981634);
        dx4 = wd4
        dx5 = wd2 * Math.cos(1.308996939);
        dy1 = hd2 * Math.sin(1.308996939);
        dy2 = hd2 * Math.sin(1.0471975512);
        dy3 = hd2 * Math.sin(0.7853981634);
        dy4 = hd4
        dy5 = hd2 * Math.sin(0.2617993878);
        x1 = hc - dx1;
        x2 = hc - dx2;
        x3 = hc - dx3;
        x4 = hc - dx4;
        x5 = hc - dx5;
        x6 = hc + dx5;
        x7 = hc + dx4;
        x8 = hc + dx3;
        x9 = hc + dx2;
        x10 = hc + dx1;
        y1 = vc - dy1;
        y2 = vc - dy2;
        y3 = vc - dy3;
        y4 = vc - dy4;
        y5 = vc - dy5;
        y6 = vc + dy5;
        y7 = vc + dy4;
        y8 = vc + dy3;
        y9 = vc + dy2;
        y10 = vc + dy1;
        iwd2 = wd2 * a / maxAdj;
        ihd2 = hd2 * a / maxAdj;
        sdx1 = iwd2 * 99144 / 100000;
        sdx2 = iwd2 * 92388 / 100000;
        sdx3 = iwd2 * 79335 / 100000;
        sdx4 = iwd2 * 60876 / 100000;
        sdx5 = iwd2 * 38268 / 100000;
        sdx6 = iwd2 * 13053 / 100000;
        sdy1 = ihd2 * 99144 / 100000;
        sdy2 = ihd2 * 92388 / 100000;
        sdy3 = ihd2 * 79335 / 100000;
        sdy4 = ihd2 * 60876 / 100000;
        sdy5 = ihd2 * 38268 / 100000;
        sdy6 = ihd2 * 13053 / 100000;
        sx1 = hc - sdx1;
        sx2 = hc - sdx2;
        sx3 = hc - sdx3;
        sx4 = hc - sdx4;
        sx5 = hc - sdx5;
        sx6 = hc - sdx6;
        sx7 = hc + sdx6;
        sx8 = hc + sdx5;
        sx9 = hc + sdx4;
        sx10 = hc + sdx3;
        sx11 = hc + sdx2;
        sx12 = hc + sdx1;
        sy1 = vc - sdy1;
        sy2 = vc - sdy2;
        sy3 = vc - sdy3;
        sy4 = vc - sdy4;
        sy5 = vc - sdy5;
        sy6 = vc - sdy6;
        sy7 = vc + sdy6;
        sy8 = vc + sdy5;
        sy9 = vc + sdy4;
        sy10 = vc + sdy3;
        sy11 = vc + sdy2;
        sy12 = vc + sdy1;
        iDx = iwd2 * Math.cos(0.7853981634);
        idy = ihd2 * Math.sin(0.7853981634);
        il = hc - iDx;
        it = vc - idy;
        ir = hc + iDx;
        ib = vc + idy;
        yAdj = vc - ihd2;
        var d = "M0" + "," + vc +
          " L" + sx1 + "," + sy6 +
          " L" + x1 + "," + y5 +
          " L" + sx2 + "," + sy5 +
          " L" + x2 + "," + y4 +
          " L" + sx3 + "," + sy4 +
          " L" + x3 + "," + y3 +
          " L" + sx4 + "," + sy3 +
          " L" + x4 + "," + y2 +
          " L" + sx5 + "," + sy2 +
          " L" + x5 + "," + y1 +
          " L" + sx6 + "," + sy1 +
          " L" + hc + "," + 0 +
          " L" + sx7 + "," + sy1 +
          " L" + x6 + "," + y1 +
          " L" + sx8 + "," + sy2 +
          " L" + x7 + "," + y2 +
          " L" + sx9 + "," + sy3 +
          " L" + x8 + "," + y3 +
          " L" + sx10 + "," + sy4 +
          " L" + x9 + "," + y4 +
          " L" + sx11 + "," + sy5 +
          " L" + x10 + "," + y5 +
          " L" + sx12 + "," + sy6 +
          " L" + w + "," + vc +
          " L" + sx12 + "," + sy7 +
          " L" + x10 + "," + y6 +
          " L" + sx11 + "," + sy8 +
          " L" + x9 + "," + y7 +
          " L" + sx10 + "," + sy9 +
          " L" + x8 + "," + y8 +
          " L" + sx9 + "," + sy10 +
          " L" + x7 + "," + y9 +
          " L" + sx8 + "," + sy11 +
          " L" + x6 + "," + y10 +
          " L" + sx7 + "," + sy12 +
          " L" + hc + "," + h +
          " L" + sx6 + "," + sy12 +
          " L" + x5 + "," + y10 +
          " L" + sx5 + "," + sy11 +
          " L" + x4 + "," + y9 +
          " L" + sx4 + "," + sy10 +
          " L" + x3 + "," + y8 +
          " L" + sx3 + "," + sy9 +
          " L" + x2 + "," + y7 +
          " L" + sx2 + "," + sy8 +
          " L" + x1 + "," + y6 +
          " L" + sx1 + "," + sy7 +
          " z";
        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "star32":
        var a, dx1, dx2, dx3, dx4, dx5, dx6, dx7, dy1, dy2, dy3, dy4, dy5, dy6, dy7, x1, x2, x3, x4, x5, x6,
          x7, x8, x9, x10, x11, x12, x13, x14, y1, y2, y3, y4, y5, y6, y7, y8, y9, y10, y11, y12, y13, y14,
          iwd2, ihd2, sdx1, sdx2, sdx3, sdx4, sdx5, sdx6, sdx7, sdx8, sdy1, sdy2, sdy3, sdy4, sdy5, sdy6, sdy7,
          sdy8, sx1, sx2, sx3, sx4, sx5, sx6, sx7, sx8, sx9, sx10, sx11, sx12, sx13, sx14, sx15, sx16, sy1, sy2,
          sy3, sy4, sy5, sy6, sy7, sy8, sy9, sy10, sy11, sy12, sy13, sy14, sy15, sy16, iDx, idy, il, it, ir, ib, yAdj;
        var hc = w / 2, vc = h / 2, wd2 = w / 2, hd2 = h / 2, hd4 = h / 4, wd4 = w / 4;
        var adj = 37500 * slideFactor;
        var maxAdj = 50000 * slideFactor;
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);//[0]["attrs"]["fmla"];
        //console.log("star4 node: ", node, "shapAdjst:", shapAdjst)
        if (shapAdjst !== undefined) {
          var name = shapAdjst["attrs"]["name"];
          if (name == "adj") {
            adj = parseInt(shapAdjst["attrs"]["fmla"].substr(4)) * slideFactor;
          }
        }
        a = (adj < 0) ? 0 : (adj > maxAdj) ? maxAdj : adj;
        dx1 = wd2 * 98079 / 100000;
        dx2 = wd2 * 92388 / 100000;
        dx3 = wd2 * 83147 / 100000;
        dx4 = wd2 * Math.cos(0.7853981634);
        dx5 = wd2 * 55557 / 100000;
        dx6 = wd2 * 38268 / 100000;
        dx7 = wd2 * 19509 / 100000;
        dy1 = hd2 * 98079 / 100000;
        dy2 = hd2 * 92388 / 100000;
        dy3 = hd2 * 83147 / 100000;
        dy4 = hd2 * Math.sin(0.7853981634);
        dy5 = hd2 * 55557 / 100000;
        dy6 = hd2 * 38268 / 100000;
        dy7 = hd2 * 19509 / 100000;
        x1 = hc - dx1;
        x2 = hc - dx2;
        x3 = hc - dx3;
        x4 = hc - dx4;
        x5 = hc - dx5;
        x6 = hc - dx6;
        x7 = hc - dx7;
        x8 = hc + dx7;
        x9 = hc + dx6;
        x10 = hc + dx5;
        x11 = hc + dx4;
        x12 = hc + dx3;
        x13 = hc + dx2;
        x14 = hc + dx1;
        y1 = vc - dy1;
        y2 = vc - dy2;
        y3 = vc - dy3;
        y4 = vc - dy4;
        y5 = vc - dy5;
        y6 = vc - dy6;
        y7 = vc - dy7;
        y8 = vc + dy7;
        y9 = vc + dy6;
        y10 = vc + dy5;
        y11 = vc + dy4;
        y12 = vc + dy3;
        y13 = vc + dy2;
        y14 = vc + dy1;
        iwd2 = wd2 * a / maxAdj;
        ihd2 = hd2 * a / maxAdj;
        sdx1 = iwd2 * 99518 / 100000;
        sdx2 = iwd2 * 95694 / 100000;
        sdx3 = iwd2 * 88192 / 100000;
        sdx4 = iwd2 * 77301 / 100000;
        sdx5 = iwd2 * 63439 / 100000;
        sdx6 = iwd2 * 47140 / 100000;
        sdx7 = iwd2 * 29028 / 100000;
        sdx8 = iwd2 * 9802 / 100000;
        sdy1 = ihd2 * 99518 / 100000;
        sdy2 = ihd2 * 95694 / 100000;
        sdy3 = ihd2 * 88192 / 100000;
        sdy4 = ihd2 * 77301 / 100000;
        sdy5 = ihd2 * 63439 / 100000;
        sdy6 = ihd2 * 47140 / 100000;
        sdy7 = ihd2 * 29028 / 100000;
        sdy8 = ihd2 * 9802 / 100000;
        sx1 = hc - sdx1;
        sx2 = hc - sdx2;
        sx3 = hc - sdx3;
        sx4 = hc - sdx4;
        sx5 = hc - sdx5;
        sx6 = hc - sdx6;
        sx7 = hc - sdx7;
        sx8 = hc - sdx8;
        sx9 = hc + sdx8;
        sx10 = hc + sdx7;
        sx11 = hc + sdx6;
        sx12 = hc + sdx5;
        sx13 = hc + sdx4;
        sx14 = hc + sdx3;
        sx15 = hc + sdx2;
        sx16 = hc + sdx1;
        sy1 = vc - sdy1;
        sy2 = vc - sdy2;
        sy3 = vc - sdy3;
        sy4 = vc - sdy4;
        sy5 = vc - sdy5;
        sy6 = vc - sdy6;
        sy7 = vc - sdy7;
        sy8 = vc - sdy8;
        sy9 = vc + sdy8;
        sy10 = vc + sdy7;
        sy11 = vc + sdy6;
        sy12 = vc + sdy5;
        sy13 = vc + sdy4;
        sy14 = vc + sdy3;
        sy15 = vc + sdy2;
        sy16 = vc + sdy1;
        iDx = iwd2 * Math.cos(0.7853981634);
        idy = ihd2 * Math.sin(0.7853981634);
        il = hc - iDx;
        it = vc - idy;
        ir = hc + iDx;
        ib = vc + idy;
        yAdj = vc - ihd2;
        var d = "M0" + "," + vc +
          " L" + sx1 + "," + sy8 +
          " L" + x1 + "," + y7 +
          " L" + sx2 + "," + sy7 +
          " L" + x2 + "," + y6 +
          " L" + sx3 + "," + sy6 +
          " L" + x3 + "," + y5 +
          " L" + sx4 + "," + sy5 +
          " L" + x4 + "," + y4 +
          " L" + sx5 + "," + sy4 +
          " L" + x5 + "," + y3 +
          " L" + sx6 + "," + sy3 +
          " L" + x6 + "," + y2 +
          " L" + sx7 + "," + sy2 +
          " L" + x7 + "," + y1 +
          " L" + sx8 + "," + sy1 +
          " L" + hc + "," + 0 +
          " L" + sx9 + "," + sy1 +
          " L" + x8 + "," + y1 +
          " L" + sx10 + "," + sy2 +
          " L" + x9 + "," + y2 +
          " L" + sx11 + "," + sy3 +
          " L" + x10 + "," + y3 +
          " L" + sx12 + "," + sy4 +
          " L" + x11 + "," + y4 +
          " L" + sx13 + "," + sy5 +
          " L" + x12 + "," + y5 +
          " L" + sx14 + "," + sy6 +
          " L" + x13 + "," + y6 +
          " L" + sx15 + "," + sy7 +
          " L" + x14 + "," + y7 +
          " L" + sx16 + "," + sy8 +
          " L" + w + "," + vc +
          " L" + sx16 + "," + sy9 +
          " L" + x14 + "," + y8 +
          " L" + sx15 + "," + sy10 +
          " L" + x13 + "," + y9 +
          " L" + sx14 + "," + sy11 +
          " L" + x12 + "," + y10 +
          " L" + sx13 + "," + sy12 +
          " L" + x11 + "," + y11 +
          " L" + sx12 + "," + sy13 +
          " L" + x10 + "," + y12 +
          " L" + sx11 + "," + sy14 +
          " L" + x9 + "," + y13 +
          " L" + sx10 + "," + sy15 +
          " L" + x8 + "," + y14 +
          " L" + sx9 + "," + sy16 +
          " L" + hc + "," + h +
          " L" + sx8 + "," + sy16 +
          " L" + x7 + "," + y14 +
          " L" + sx7 + "," + sy15 +
          " L" + x6 + "," + y13 +
          " L" + sx6 + "," + sy14 +
          " L" + x5 + "," + y12 +
          " L" + sx5 + "," + sy13 +
          " L" + x4 + "," + y11 +
          " L" + sx4 + "," + sy12 +
          " L" + x3 + "," + y10 +
          " L" + sx3 + "," + sy11 +
          " L" + x2 + "," + y9 +
          " L" + sx2 + "," + sy10 +
          " L" + x1 + "," + y8 +
          " L" + sx1 + "," + sy9 +
          " z";
        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;

      case "pie":
      case "pieWedge":
      case "arc":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var adj1, adj2, H, shapAdjst1, shapAdjst2, isClose;
        if (shapType == "pie") {
          adj1 = 0;
          adj2 = 270;
          H = h;
          isClose = true;
        } else if (shapType == "pieWedge") {
          adj1 = 180;
          adj2 = 270;
          H = 2 * h;
          isClose = true;
        } else if (shapType == "arc") {
          adj1 = 270;
          adj2 = 0;
          H = h;
          isClose = false;
        }
        if (shapAdjst !== undefined) {
          shapAdjst1 = getTextByPathList(shapAdjst, [ "attrs", "fmla" ]);
          shapAdjst2 = shapAdjst1;
          if (shapAdjst1 === undefined) {
            shapAdjst1 = shapAdjst[0]["attrs"]["fmla"];
            shapAdjst2 = shapAdjst[1]["attrs"]["fmla"];
          }
          if (shapAdjst1 !== undefined) {
            adj1 = parseInt(shapAdjst1.substr(4)) / 60000;
          }
          if (shapAdjst2 !== undefined) {
            adj2 = parseInt(shapAdjst2.substr(4)) / 60000;
          }
        }
        var pieVals = shapePie(H, w, adj1, adj2, isClose);
        //console.log("shapType: ",shapType,"\nimgFillFlg: ",imgFillFlg,"\ngrndFillFlg: ",grndFillFlg,"\nshpId: ",shpId,"\nfillColor: ",fillColor);
        result += "<path   d='" + pieVals[0] + "' transform='" + pieVals[1] + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "chord":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, sAdj1_val = 45;
        var sAdj2, sAdj2_val = 270;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              sAdj1_val = parseInt(sAdj1.substr(4)) / 60000;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              sAdj2_val = parseInt(sAdj2.substr(4)) / 60000;
            }
          }
        }
        var hR = h / 2;
        var wR = w / 2;
        var d_val = shapeArc(wR, hR, wR, hR, sAdj1_val, sAdj2_val, true);
        //console.log("shapType: ",shapType,", sAdj1_val: ",sAdj1_val,", sAdj2_val: ",sAdj2_val)
        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "frame":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var adj1 = 12500 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        if (shapAdjst !== undefined) {
          adj1 = parseInt(shapAdjst.substr(4)) * slideFactor;
        }
        var a1, x1, x4, y4;
        if (adj1 < 0) a1 = 0
        else if (adj1 > cnstVal1) a1 = cnstVal1
        else a1 = adj1
        x1 = Math.min(w, h) * a1 / cnstVal2;
        x4 = w - x1;
        y4 = h - x1;
        var d = "M" + 0 + "," + 0 +
          " L" + w + "," + 0 +
          " L" + w + "," + h +
          " L" + 0 + "," + h +
          " z" +
          "M" + x1 + "," + x1 +
          " L" + x1 + "," + y4 +
          " L" + x4 + "," + y4 +
          " L" + x4 + "," + x1 +
          " z";
        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "donut":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var adj = 25000 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        if (shapAdjst !== undefined) {
          adj = parseInt(shapAdjst.substr(4)) * slideFactor;
        }
        var a, dr, iwd2, ihd2;
        if (adj < 0) a = 0
        else if (adj > cnstVal1) a = cnstVal1
        else a = adj
        dr = Math.min(w, h) * a / cnstVal2;
        iwd2 = w / 2 - dr;
        ihd2 = h / 2 - dr;
        var d = "M" + 0 + "," + h / 2 +
          shapeArc(w / 2, h / 2, w / 2, h / 2, 180, 270, false).replace("M", "L") +
          shapeArc(w / 2, h / 2, w / 2, h / 2, 270, 360, false).replace("M", "L") +
          shapeArc(w / 2, h / 2, w / 2, h / 2, 0, 90, false).replace("M", "L") +
          shapeArc(w / 2, h / 2, w / 2, h / 2, 90, 180, false).replace("M", "L") +
          " z" +
          "M" + dr + "," + h / 2 +
          shapeArc(w / 2, h / 2, iwd2, ihd2, 180, 90, false).replace("M", "L") +
          shapeArc(w / 2, h / 2, iwd2, ihd2, 90, 0, false).replace("M", "L") +
          shapeArc(w / 2, h / 2, iwd2, ihd2, 0, -90, false).replace("M", "L") +
          shapeArc(w / 2, h / 2, iwd2, ihd2, 270, 180, false).replace("M", "L") +
          " z";
        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "noSmoking":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var adj = 18750 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        if (shapAdjst !== undefined) {
          adj = parseInt(shapAdjst.substr(4)) * slideFactor;
        }
        var a, dr, iwd2, ihd2, ang, ang2rad, ct, st, m, n, drd2, dang, dang2, swAng, t3, stAng1, stAng2;
        if (adj < 0) a = 0
        else if (adj > cnstVal1) a = cnstVal1
        else a = adj
        dr = Math.min(w, h) * a / cnstVal2;
        iwd2 = w / 2 - dr;
        ihd2 = h / 2 - dr;
        ang = Math.atan(h / w);
        //ang2rad = ang*Math.PI/180;
        ct = ihd2 * Math.cos(ang);
        st = iwd2 * Math.sin(ang);
        m = Math.sqrt(ct * ct + st * st); //"mod ct st 0"
        n = iwd2 * ihd2 / m;
        drd2 = dr / 2;
        dang = Math.atan(drd2 / n);
        dang2 = dang * 2;
        swAng = -Math.PI + dang2;
        //t3 = Math.atan(h/w);
        stAng1 = ang - dang;
        stAng2 = stAng1 - Math.PI;
        var ct1, st1, m1, n1, dx1, dy1, x1, y1, y1, y2;
        ct1 = ihd2 * Math.cos(stAng1);
        st1 = iwd2 * Math.sin(stAng1);
        m1 = Math.sqrt(ct1 * ct1 + st1 * st1); //"mod ct1 st1 0"
        n1 = iwd2 * ihd2 / m1;
        dx1 = n1 * Math.cos(stAng1);
        dy1 = n1 * Math.sin(stAng1);
        x1 = w / 2 + dx1;
        y1 = h / 2 + dy1;
        x2 = w / 2 - dx1;
        y2 = h / 2 - dy1;
        var stAng1deg = stAng1 * 180 / Math.PI;
        var stAng2deg = stAng2 * 180 / Math.PI;
        var swAng2deg = swAng * 180 / Math.PI;
        var d = "M" + 0 + "," + h / 2 +
          shapeArc(w / 2, h / 2, w / 2, h / 2, 180, 270, false).replace("M", "L") +
          shapeArc(w / 2, h / 2, w / 2, h / 2, 270, 360, false).replace("M", "L") +
          shapeArc(w / 2, h / 2, w / 2, h / 2, 0, 90, false).replace("M", "L") +
          shapeArc(w / 2, h / 2, w / 2, h / 2, 90, 180, false).replace("M", "L") +
          " z" +
          "M" + x1 + "," + y1 +
          shapeArc(w / 2, h / 2, iwd2, ihd2, stAng1deg, (stAng1deg + swAng2deg), false).replace("M", "L") +
          " z" +
          "M" + x2 + "," + y2 +
          shapeArc(w / 2, h / 2, iwd2, ihd2, stAng2deg, (stAng2deg + swAng2deg), false).replace("M", "L") +
          " z";
        //console.log("adj: ",adj,"x1:",x1,",y1:",y1," x2:",x2,",y2:",y2,",stAng1:",stAng1,",stAng1deg:",stAng1deg,",stAng2:",stAng2,",stAng2deg:",stAng2deg,",swAng:",swAng,",swAng2deg:",swAng2deg)

        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "halfFrame":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, sAdj1_val = 3.5;
        var sAdj2, sAdj2_val = 3.5;
        var cnsVal = 100000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              sAdj1_val = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              sAdj2_val = parseInt(sAdj2.substr(4)) * slideFactor;
            }
          }
        }
        var minWH = Math.min(w, h);
        var maxAdj2 = (cnsVal * w) / minWH;
        var a1, a2;
        if (sAdj2_val < 0) a2 = 0
        else if (sAdj2_val > maxAdj2) a2 = maxAdj2
        else a2 = sAdj2_val
        var x1 = (minWH * a2) / cnsVal;
        var g1 = h * x1 / w;
        var g2 = h - g1;
        var maxAdj1 = (cnsVal * g2) / minWH;
        if (sAdj1_val < 0) a1 = 0
        else if (sAdj1_val > maxAdj1) a1 = maxAdj1
        else a1 = sAdj1_val
        var y1 = minWH * a1 / cnsVal;
        var dx2 = y1 * w / h;
        var x2 = w - dx2;
        var dy2 = x1 * h / w;
        var y2 = h - dy2;
        var d = "M0,0" +
          " L" + w + "," + 0 +
          " L" + x2 + "," + y1 +
          " L" + x1 + "," + y1 +
          " L" + x1 + "," + y2 +
          " L0," + h + " z";

        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        //console.log("w: ",w,", h: ",h,", sAdj1_val: ",sAdj1_val,", sAdj2_val: ",sAdj2_val,",maxAdj1: ",maxAdj1,",maxAdj2: ",maxAdj2)
        break;
      case "blockArc":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 180;
        var sAdj2, adj2 = 0;
        var sAdj3, adj3 = 25000 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) / 60000;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) / 60000;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * slideFactor;
            }
          }
        }

        var stAng, istAng, a3, sw11, sw12, swAng, iswAng;
        var cd1 = 360;
        if (adj1 < 0) stAng = 0
        else if (adj1 > cd1) stAng = cd1
        else stAng = adj1 //180

        if (adj2 < 0) istAng = 0
        else if (adj2 > cd1) istAng = cd1
        else istAng = adj2 //0

        if (adj3 < 0) a3 = 0
        else if (adj3 > cnstVal1) a3 = cnstVal1
        else a3 = adj3

        sw11 = istAng - stAng; // -180
        sw12 = sw11 + cd1; //180
        swAng = (sw11 > 0) ? sw11 : sw12; //180
        iswAng = -swAng; //-180

        var endAng = stAng + swAng;
        var iendAng = istAng + iswAng;

        var wt1, ht1, dx1, dy1, x1, y1, stRd, istRd, wd2, hd2, hc, vc;
        stRd = stAng * (Math.PI) / 180;
        istRd = istAng * (Math.PI) / 180;
        wd2 = w / 2;
        hd2 = h / 2;
        hc = w / 2;
        vc = h / 2;
        if (stAng > 90 && stAng < 270) {
          wt1 = wd2 * (Math.sin((Math.PI) / 2 - stRd));
          ht1 = hd2 * (Math.cos((Math.PI) / 2 - stRd));

          dx1 = wd2 * (Math.cos(Math.atan(ht1 / wt1)));
          dy1 = hd2 * (Math.sin(Math.atan(ht1 / wt1)));

          x1 = hc - dx1;
          y1 = vc - dy1;
        } else {
          wt1 = wd2 * (Math.sin(stRd));
          ht1 = hd2 * (Math.cos(stRd));

          dx1 = wd2 * (Math.cos(Math.atan(wt1 / ht1)));
          dy1 = hd2 * (Math.sin(Math.atan(wt1 / ht1)));

          x1 = hc + dx1;
          y1 = vc + dy1;
        }
        var dr, iwd2, ihd2, wt2, ht2, dx2, dy2, x2, y2;
        dr = Math.min(w, h) * a3 / cnstVal2;
        iwd2 = wd2 - dr;
        ihd2 = hd2 - dr;
        //console.log("stAng: ",stAng," swAng: ",swAng ," endAng:",endAng)
        if ((endAng <= 450 && endAng > 270) || ((endAng >= 630 && endAng < 720))) {
          wt2 = iwd2 * (Math.sin(istRd));
          ht2 = ihd2 * (Math.cos(istRd));
          dx2 = iwd2 * (Math.cos(Math.atan(wt2 / ht2)));
          dy2 = ihd2 * (Math.sin(Math.atan(wt2 / ht2)));
          x2 = hc + dx2;
          y2 = vc + dy2;
        } else {
          wt2 = iwd2 * (Math.sin((Math.PI) / 2 - istRd));
          ht2 = ihd2 * (Math.cos((Math.PI) / 2 - istRd));

          dx2 = iwd2 * (Math.cos(Math.atan(ht2 / wt2)));
          dy2 = ihd2 * (Math.sin(Math.atan(ht2 / wt2)));
          x2 = hc - dx2;
          y2 = vc - dy2;
        }
        var d = "M" + x1 + "," + y1 +
          shapeArc(wd2, hd2, wd2, hd2, stAng, endAng, false).replace("M", "L") +
          " L" + x2 + "," + y2 +
          shapeArc(wd2, hd2, iwd2, ihd2, istAng, iendAng, false).replace("M", "L") +
          " z";
        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "bracePair":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var adj = 8333 * slideFactor;
        var cnstVal1 = 25000 * slideFactor;
        var cnstVal2 = 50000 * slideFactor;
        var cnstVal3 = 100000 * slideFactor;
        if (shapAdjst !== undefined) {
          adj = parseInt(shapAdjst.substr(4)) * slideFactor;
        }
        var vc = h / 2, cd = 360, cd2 = 180, cd4 = 90, c3d4 = 270, a, x1, x2, x3, x4, y2, y3, y4;
        if (adj < 0) a = 0
        else if (adj > cnstVal1) a = cnstVal1
        else a = adj
        var minWH = Math.min(w, h);
        x1 = minWH * a / cnstVal3;
        x2 = minWH * a / cnstVal2;
        x3 = w - x2;
        x4 = w - x1;
        y2 = vc - x1;
        y3 = vc + x1;
        y4 = h - x1;
        //console.log("w:",w," h:",h," x1:",x1," x2:",x2," x3:",x3," x4:",x4," y2:",y2," y3:",y3," y4:",y4)
        var d = "M" + x2 + "," + h +
          shapeArc(x2, y4, x1, x1, cd4, cd2, false).replace("M", "L") +
          " L" + x1 + "," + y3 +
          shapeArc(0, y3, x1, x1, 0, (-cd4), false).replace("M", "L") +
          shapeArc(0, y2, x1, x1, cd4, 0, false).replace("M", "L") +
          " L" + x1 + "," + x1 +
          shapeArc(x2, x1, x1, x1, cd2, c3d4, false).replace("M", "L") +
          " M" + x3 + "," + 0 +
          shapeArc(x3, x1, x1, x1, c3d4, cd, false).replace("M", "L") +
          " L" + x4 + "," + y2 +
          shapeArc(w, y2, x1, x1, cd2, cd4, false).replace("M", "L") +
          shapeArc(w, y3, x1, x1, c3d4, cd2, false).replace("M", "L") +
          " L" + x4 + "," + y4 +
          shapeArc(x3, y4, x1, x1, 0, cd4, false).replace("M", "L");

        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "leftBrace":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 8333 * slideFactor;
        var sAdj2, adj2 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            }
          }
        }
        var vc = h / 2, cd2 = 180, cd4 = 90, c3d4 = 270, a1, a2, q1, q2, q3, y1, y2, y3, y4;
        if (adj2 < 0) a2 = 0
        else if (adj2 > cnstVal2) a2 = cnstVal2
        else a2 = adj2
        var minWH = Math.min(w, h);
        q1 = cnstVal2 - a2;
        if (q1 < a2) q2 = q1
        else q2 = a2
        q3 = q2 / 2;
        var maxAdj1 = q3 * h / minWH;
        if (adj1 < 0) a1 = 0
        else if (adj1 > maxAdj1) a1 = maxAdj1
        else a1 = adj1
        y1 = minWH * a1 / cnstVal2;
        y3 = h * a2 / cnstVal2;
        y2 = y3 - y1;
        y4 = y3 + y1;
        //console.log("w:",w," h:",h," q1:",q1," q2:",q2," q3:",q3," y1:",y1," y3:",y3," y4:",y4," maxAdj1:",maxAdj1)
        var d = "M" + w + "," + h +
          shapeArc(w, h - y1, w / 2, y1, cd4, cd2, false).replace("M", "L") +
          " L" + w / 2 + "," + y4 +
          shapeArc(0, y4, w / 2, y1, 0, (-cd4), false).replace("M", "L") +
          shapeArc(0, y2, w / 2, y1, cd4, 0, false).replace("M", "L") +
          " L" + w / 2 + "," + y1 +
          shapeArc(w, y1, w / 2, y1, cd2, c3d4, false).replace("M", "L");

        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "rightBrace":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 8333 * slideFactor;
        var sAdj2, adj2 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            }
          }
        }
        var vc = h / 2, cd = 360, cd2 = 180, cd4 = 90, c3d4 = 270, a1, a2, q1, q2, q3, y1, y2, y3, y4;
        if (adj2 < 0) a2 = 0
        else if (adj2 > cnstVal2) a2 = cnstVal2
        else a2 = adj2
        var minWH = Math.min(w, h);
        q1 = cnstVal2 - a2;
        if (q1 < a2) q2 = q1
        else q2 = a2
        q3 = q2 / 2;
        var maxAdj1 = q3 * h / minWH;
        if (adj1 < 0) a1 = 0
        else if (adj1 > maxAdj1) a1 = maxAdj1
        else a1 = adj1
        y1 = minWH * a1 / cnstVal2;
        y3 = h * a2 / cnstVal2;
        y2 = y3 - y1;
        y4 = h - y1;
        //console.log("w:",w," h:",h," q1:",q1," q2:",q2," q3:",q3," y1:",y1," y2:",y2," y3:",y3," y4:",y4," maxAdj1:",maxAdj1)
        var d = "M" + 0 + "," + 0 +
          shapeArc(0, y1, w / 2, y1, c3d4, cd, false).replace("M", "L") +
          " L" + w / 2 + "," + y2 +
          shapeArc(w, y2, w / 2, y1, cd2, cd4, false).replace("M", "L") +
          shapeArc(w, y3 + y1, w / 2, y1, c3d4, cd2, false).replace("M", "L") +
          " L" + w / 2 + "," + y4 +
          shapeArc(0, y4, w / 2, y1, 0, cd4, false).replace("M", "L");

        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "bracketPair":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var adj = 16667 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        if (shapAdjst !== undefined) {
          adj = parseInt(shapAdjst.substr(4)) * slideFactor;
        }
        var r = w, b = h, cd2 = 180, cd4 = 90, c3d4 = 270, a, x1, x2, y2;
        if (adj < 0) a = 0
        else if (adj > cnstVal1) a = cnstVal1
        else a = adj
        x1 = Math.min(w, h) * a / cnstVal2;
        x2 = r - x1;
        y2 = b - x1;
        //console.log("w:",w," h:",h," x1:",x1," x2:",x2," y2:",y2)
        var d = shapeArc(x1, x1, x1, x1, c3d4, cd2, false) +
          shapeArc(x1, y2, x1, x1, cd2, cd4, false).replace("M", "L") +
          shapeArc(x2, x1, x1, x1, c3d4, (c3d4 + cd4), false) +
          shapeArc(x2, y2, x1, x1, 0, cd4, false).replace("M", "L");
        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "leftBracket":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var adj = 8333 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        var maxAdj = cnstVal1 * h / Math.min(w, h);
        if (shapAdjst !== undefined) {
          adj = parseInt(shapAdjst.substr(4)) * slideFactor;
        }
        var r = w, b = h, cd2 = 180, cd4 = 90, c3d4 = 270, a, y1, y2;
        if (adj < 0) a = 0
        else if (adj > maxAdj) a = maxAdj
        else a = adj
        y1 = Math.min(w, h) * a / cnstVal2;
        if (y1 > w) y1 = w;
        y2 = b - y1;
        var d = "M" + r + "," + b +
          shapeArc(y1, y2, y1, y1, cd4, cd2, false).replace("M", "L") +
          " L" + 0 + "," + y1 +
          shapeArc(y1, y1, y1, y1, cd2, c3d4, false).replace("M", "L") +
          " L" + r + "," + 0
        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "rightBracket":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var adj = 8333 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        var maxAdj = cnstVal1 * h / Math.min(w, h);
        if (shapAdjst !== undefined) {
          adj = parseInt(shapAdjst.substr(4)) * slideFactor;
        }
        var cd = 360, cd2 = 180, cd4 = 90, c3d4 = 270, a, y1, y2, y3;
        if (adj < 0) a = 0
        else if (adj > maxAdj) a = maxAdj
        else a = adj
        y1 = Math.min(w, h) * a / cnstVal2;
        y2 = h - y1;
        y3 = w - y1;
        //console.log("w:",w," h:",h," y1:",y1," y2:",y2," y3:",y3)
        var d = "M" + 0 + "," + h +
          shapeArc(y3, y2, y1, y1, cd4, 0, false).replace("M", "L") +
          //" L"+ r + "," + y2 +
          " L" + w + "," + h / 2 +
          shapeArc(y3, y1, y1, y1, cd, c3d4, false).replace("M", "L") +
          " L" + 0 + "," + 0
        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "moon":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var adj = 0.5;
        if (shapAdjst !== undefined) {
          adj = parseInt(shapAdjst.substr(4)) / 100000;//*96/914400;;
        }
        var hd2, cd2, cd4;

        hd2 = h / 2;
        cd2 = 180;
        cd4 = 90;

        var adj2 = (1 - adj) * w;
        var d = "M" + w + "," + h +
          shapeArc(w, hd2, w, hd2, cd4, (cd4 + cd2), false).replace("M", "L") +
          shapeArc(w, hd2, adj2, hd2, (cd4 + cd2), cd4, false).replace("M", "L") +
          " z";
        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "corner":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, sAdj1_val = 50000 * slideFactor;
        var sAdj2, sAdj2_val = 50000 * slideFactor;
        var cnsVal = 100000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              sAdj1_val = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              sAdj2_val = parseInt(sAdj2.substr(4)) * slideFactor;
            }
          }
        }
        var minWH = Math.min(w, h);
        var maxAdj1 = cnsVal * h / minWH;
        var maxAdj2 = cnsVal * w / minWH;
        var a1, a2, x1, dy1, y1;
        if (sAdj1_val < 0) a1 = 0
        else if (sAdj1_val > maxAdj1) a1 = maxAdj1
        else a1 = sAdj1_val

        if (sAdj2_val < 0) a2 = 0
        else if (sAdj2_val > maxAdj2) a2 = maxAdj2
        else a2 = sAdj2_val
        x1 = minWH * a2 / cnsVal;
        dy1 = minWH * a1 / cnsVal;
        y1 = h - dy1;

        var d = "M0,0" +
          " L" + x1 + "," + 0 +
          " L" + x1 + "," + y1 +
          " L" + w + "," + y1 +
          " L" + w + "," + h +
          " L0," + h + " z";

        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "diagStripe":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var sAdj1_val = 50000 * slideFactor;
        var cnsVal = 100000 * slideFactor;
        if (shapAdjst !== undefined) {
          sAdj1_val = parseInt(shapAdjst.substr(4)) * slideFactor;
        }
        var a1, x2, y2;
        if (sAdj1_val < 0) a1 = 0
        else if (sAdj1_val > cnsVal) a1 = cnsVal
        else a1 = sAdj1_val
        x2 = w * a1 / cnsVal;
        y2 = h * a1 / cnsVal;
        var d = "M" + 0 + "," + y2 +
          " L" + x2 + "," + 0 +
          " L" + w + "," + 0 +
          " L" + 0 + "," + h + " z";

        result += "<path   d='" + d + "'  fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "gear6":
      case "gear9":
        txtRotate = 0;
        var gearNum = shapType.substr(4), d;
        if (gearNum == "6") {
          d = shapeGear(w, h / 3.5, parseInt(gearNum));
        } else { //gearNum=="9"
          d = shapeGear(w, h / 3.5, parseInt(gearNum));
        }
        result += "<path   d='" + d + "' transform='rotate(20," + (3 / 7) * h + "," + (3 / 7) * h + ")' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "bentConnector3":
        var connectorPoints = getBentConnectorPoints(shapType, node, w, h);
        result += "<polyline points='" + connectorPoints.map(function (point) { return point[0] + " " + point[1]; }).join(",") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray +
          "' fill='none' " + getConnectorMarkerAttributes(shpId, headEndNodeAttrs, tailEndNodeAttrs) + "/>";
        break;
      case "plus":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var adj1 = 0.25;
        if (shapAdjst !== undefined) {
          adj1 = parseInt(shapAdjst.substr(4)) / 100000;

        }
        var adj2 = (1 - adj1);
        result += " <polygon points='" + adj1 * w + " 0," + adj1 * w + " " + adj1 * h + ",0 " + adj1 * h + ",0 " + adj2 * h + "," +
          adj1 * w + " " + adj2 * h + "," + adj1 * w + " " + h + "," + adj2 * w + " " + h + "," + adj2 * w + " " + adj2 * h + "," + w + " " + adj2 * h + "," +
          +w + " " + adj1 * h + "," + adj2 * w + " " + adj1 * h + "," + adj2 * w + " 0' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "teardrop":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var adj1 = 100000 * slideFactor;
        var cnsVal1 = adj1;
        var cnsVal2 = 200000 * slideFactor;
        if (shapAdjst !== undefined) {
          adj1 = parseInt(shapAdjst.substr(4)) * slideFactor;
        }
        var a1, r2, tw, th, sw, sh, dx1, dy1, x1, y1, x2, y2, rd45;
        if (adj1 < 0) a1 = 0
        else if (adj1 > cnsVal2) a1 = cnsVal2
        else a1 = adj1
        r2 = Math.sqrt(2);
        tw = r2 * (w / 2);
        th = r2 * (h / 2);
        sw = (tw * a1) / cnsVal1;
        sh = (th * a1) / cnsVal1;
        rd45 = (45 * (Math.PI) / 180);
        dx1 = sw * (Math.cos(rd45));
        dy1 = sh * (Math.cos(rd45));
        x1 = (w / 2) + dx1;
        y1 = (h / 2) - dy1;
        x2 = ((w / 2) + x1) / 2;
        y2 = ((h / 2) + y1) / 2;

        var d_val = shapeArc(w / 2, h / 2, w / 2, h / 2, 180, 270, false) +
          "Q " + x2 + ",0 " + x1 + "," + y1 +
          "Q " + w + "," + y2 + " " + w + "," + h / 2 +
          shapeArc(w / 2, h / 2, w / 2, h / 2, 0, 90, false).replace("M", "L") +
          shapeArc(w / 2, h / 2, w / 2, h / 2, 90, 180, false).replace("M", "L") + " z";
        result += "<path   d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        // console.log("shapAdjst: ",shapAdjst,", adj1: ",adj1);
        break;
      case "plaque":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var adj1 = 16667 * slideFactor;
        var cnsVal1 = 50000 * slideFactor;
        var cnsVal2 = 100000 * slideFactor;
        if (shapAdjst !== undefined) {
          adj1 = parseInt(shapAdjst.substr(4)) * slideFactor;
        }
        var a1, x1, x2, y2;
        if (adj1 < 0) a1 = 0
        else if (adj1 > cnsVal1) a1 = cnsVal1
        else a1 = adj1
        x1 = a1 * (Math.min(w, h)) / cnsVal2;
        x2 = w - x1;
        y2 = h - x1;

        var d_val = "M0," + x1 +
          shapeArc(0, 0, x1, x1, 90, 0, false).replace("M", "L") +
          " L" + x2 + "," + 0 +
          shapeArc(w, 0, x1, x1, 180, 90, false).replace("M", "L") +
          " L" + w + "," + y2 +
          shapeArc(w, h, x1, x1, 270, 180, false).replace("M", "L") +
          " L" + x1 + "," + h +
          shapeArc(0, h, x1, x1, 0, -90, false).replace("M", "L") + " z";
        result += "<path   d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "sun":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var refr = slideFactor;
        var adj1 = 25000 * refr;
        var cnstVal1 = 12500 * refr;
        var cnstVal2 = 46875 * refr;
        if (shapAdjst !== undefined) {
          adj1 = parseInt(shapAdjst.substr(4)) * refr;
        }
        var a1;
        if (adj1 < cnstVal1) a1 = cnstVal1
        else if (adj1 > cnstVal2) a1 = cnstVal2
        else a1 = adj1

        var cnstVa3 = 50000 * refr;
        var cnstVa4 = 100000 * refr;
        var g0 = cnstVa3 - a1,
          g1 = g0 * (30274 * refr) / (32768 * refr),
          g2 = g0 * (12540 * refr) / (32768 * refr),
          g3 = g1 + cnstVa3,
          g4 = g2 + cnstVa3,
          g5 = cnstVa3 - g1,
          g6 = cnstVa3 - g2,
          g7 = g0 * (23170 * refr) / (32768 * refr),
          g8 = cnstVa3 + g7,
          g9 = cnstVa3 - g7,
          g10 = g5 * 3 / 4,
          g11 = g6 * 3 / 4,
          g12 = g10 + 3662 * refr,
          g13 = g11 + 36620 * refr,
          g14 = g11 + 12500 * refr,
          g15 = cnstVa4 - g10,
          g16 = cnstVa4 - g12,
          g17 = cnstVa4 - g13,
          g18 = cnstVa4 - g14,
          ox1 = w * (18436 * refr) / (21600 * refr),
          oy1 = h * (3163 * refr) / (21600 * refr),
          ox2 = w * (3163 * refr) / (21600 * refr),
          oy2 = h * (18436 * refr) / (21600 * refr),
          x8 = w * g8 / cnstVa4,
          x9 = w * g9 / cnstVa4,
          x10 = w * g10 / cnstVa4,
          x12 = w * g12 / cnstVa4,
          x13 = w * g13 / cnstVa4,
          x14 = w * g14 / cnstVa4,
          x15 = w * g15 / cnstVa4,
          x16 = w * g16 / cnstVa4,
          x17 = w * g17 / cnstVa4,
          x18 = w * g18 / cnstVa4,
          x19 = w * a1 / cnstVa4,
          wR = w * g0 / cnstVa4,
          hR = h * g0 / cnstVa4,
          y8 = h * g8 / cnstVa4,
          y9 = h * g9 / cnstVa4,
          y10 = h * g10 / cnstVa4,
          y12 = h * g12 / cnstVa4,
          y13 = h * g13 / cnstVa4,
          y14 = h * g14 / cnstVa4,
          y15 = h * g15 / cnstVa4,
          y16 = h * g16 / cnstVa4,
          y17 = h * g17 / cnstVa4,
          y18 = h * g18 / cnstVa4;

        var d_val = "M" + w + "," + h / 2 +
          " L" + x15 + "," + y18 +
          " L" + x15 + "," + y14 +
          "z" +
          " M" + ox1 + "," + oy1 +
          " L" + x16 + "," + y17 +
          " L" + x13 + "," + y12 +
          "z" +
          " M" + w / 2 + "," + 0 +
          " L" + x18 + "," + y10 +
          " L" + x14 + "," + y10 +
          "z" +
          " M" + ox2 + "," + oy1 +
          " L" + x17 + "," + y12 +
          " L" + x12 + "," + y17 +
          "z" +
          " M" + 0 + "," + h / 2 +
          " L" + x10 + "," + y14 +
          " L" + x10 + "," + y18 +
          "z" +
          " M" + ox2 + "," + oy2 +
          " L" + x12 + "," + y13 +
          " L" + x17 + "," + y16 +
          "z" +
          " M" + w / 2 + "," + h +
          " L" + x14 + "," + y15 +
          " L" + x18 + "," + y15 +
          "z" +
          " M" + ox1 + "," + oy2 +
          " L" + x13 + "," + y16 +
          " L" + x16 + "," + y13 +
          " z" +
          " M" + x19 + "," + h / 2 +
          shapeArc(w / 2, h / 2, wR, hR, 180, 540, false).replace("M", "L") +
          " z";
        //console.log("adj1: ",adj1,d_val);
        result += "<path   d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";


        break;
      case "heart":
        var dx1, dx2, x1, x2, x3, x4, y1;
        dx1 = w * 49 / 48;
        dx2 = w * 10 / 48
        x1 = w / 2 - dx1
        x2 = w / 2 - dx2
        x3 = w / 2 + dx2
        x4 = w / 2 + dx1
        y1 = -h / 3;
        var d_val = "M" + w / 2 + "," + h / 4 +
          "C" + x3 + "," + y1 + " " + x4 + "," + h / 4 + " " + w / 2 + "," + h +
          "C" + x1 + "," + h / 4 + " " + x2 + "," + y1 + " " + w / 2 + "," + h / 4 + " z";

        result += "<path   d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "lightningBolt":
        var x1 = w * 5022 / 21600,
          x2 = w * 11050 / 21600,
          x3 = w * 8472 / 21600,
          x4 = w * 8757 / 21600,
          x5 = w * 10012 / 21600,
          x6 = w * 14767 / 21600,
          x7 = w * 12222 / 21600,
          x8 = w * 12860 / 21600,
          x9 = w * 13917 / 21600,
          x10 = w * 7602 / 21600,
          x11 = w * 16577 / 21600,
          y1 = h * 3890 / 21600,
          y2 = h * 6080 / 21600,
          y3 = h * 6797 / 21600,
          y4 = h * 7437 / 21600,
          y5 = h * 12877 / 21600,
          y6 = h * 9705 / 21600,
          y7 = h * 12007 / 21600,
          y8 = h * 13987 / 21600,
          y9 = h * 8382 / 21600,
          y10 = h * 14277 / 21600,
          y11 = h * 14915 / 21600;

        var d_val = "M" + x3 + "," + 0 +
          " L" + x8 + "," + y2 +
          " L" + x2 + "," + y3 +
          " L" + x11 + "," + y7 +
          " L" + x6 + "," + y5 +
          " L" + w + "," + h +
          " L" + x5 + "," + y11 +
          " L" + x7 + "," + y8 +
          " L" + x1 + "," + y6 +
          " L" + x10 + "," + y9 +
          " L" + 0 + "," + y1 + " z";

        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "cube":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var refr = slideFactor;
        var adj = 25000 * refr;
        if (shapAdjst !== undefined) {
          adj = parseInt(shapAdjst.substr(4)) * refr;
        }
        var d_val;
        var cnstVal2 = 100000 * refr;
        var ss = Math.min(w, h);
        var a, y1, y4, x4;
        a = (adj < 0) ? 0 : (adj > cnstVal2) ? cnstVal2 : adj;
        y1 = ss * a / cnstVal2;
        y4 = h - y1;
        x4 = w - y1;
        d_val = "M" + 0 + "," + y1 +
          " L" + y1 + "," + 0 +
          " L" + w + "," + 0 +
          " L" + w + "," + y4 +
          " L" + x4 + "," + h +
          " L" + 0 + "," + h +
          " z" +
          "M" + 0 + "," + y1 +
          " L" + x4 + "," + y1 +
          " M" + x4 + "," + y1 +
          " L" + w + "," + 0 +
          "M" + x4 + "," + y1 +
          " L" + x4 + "," + h;

        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "bevel":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var refr = slideFactor;
        var adj = 12500 * refr;
        if (shapAdjst !== undefined) {
          adj = parseInt(shapAdjst.substr(4)) * refr;
        }
        var d_val;
        var cnstVal1 = 50000 * refr;
        var cnstVal2 = 100000 * refr;
        var ss = Math.min(w, h);
        var a, x1, x2, y2;
        a = (adj < 0) ? 0 : (adj > cnstVal1) ? cnstVal1 : adj;
        x1 = ss * a / cnstVal2;
        x2 = w - x1;
        y2 = h - x1;
        d_val = "M" + 0 + "," + 0 +
          " L" + w + "," + 0 +
          " L" + w + "," + h +
          " L" + 0 + "," + h +
          " z" +
          " M" + x1 + "," + x1 +
          " L" + x2 + "," + x1 +
          " L" + x2 + "," + y2 +
          " L" + x1 + "," + y2 +
          " z" +
          " M" + 0 + "," + 0 +
          " L" + x1 + "," + x1 +
          " M" + 0 + "," + h +
          " L" + x1 + "," + y2 +
          " M" + w + "," + 0 +
          " L" + x2 + "," + x1 +
          " M" + w + "," + h +
          " L" + x2 + "," + y2;

        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "foldedCorner":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var refr = slideFactor;
        var adj = 16667 * refr;
        if (shapAdjst !== undefined) {
          adj = parseInt(shapAdjst.substr(4)) * refr;
        }
        var d_val;
        var cnstVal1 = 50000 * refr;
        var cnstVal2 = 100000 * refr;
        var ss = Math.min(w, h);
        var a, dy2, dy1, x1, x2, y2, y1;
        a = (adj < 0) ? 0 : (adj > cnstVal1) ? cnstVal1 : adj;
        dy2 = ss * a / cnstVal2;
        dy1 = dy2 / 5;
        x1 = w - dy2;
        x2 = x1 + dy1;
        y2 = h - dy2;
        y1 = y2 + dy1;
        d_val = "M" + x1 + "," + h +
          " L" + x2 + "," + y1 +
          " L" + w + "," + y2 +
          " L" + x1 + "," + h +
          " L" + 0 + "," + h +
          " L" + 0 + "," + 0 +
          " L" + w + "," + 0 +
          " L" + w + "," + y2;

        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "cloud":
      case "cloudCallout":
        var x0, x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, y0, y1, y2, y3, y4, y5, y6, y7, y8, y9, y10, y11,
          rx1, rx2, rx3, rx4, rx5, rx6, rx7, rx8, rx9, rx10, rx11, ry1, ry2, ry3, ry4, ry5, ry6, ry7, ry8, ry9, ry10,
          ry11;
        x0 = w * 3900 / 43200;
        ;
        x1 = w * 4693 / 43200;
        x2 = w * 6928 / 43200;
        x3 = w * 16478 / 43200;
        x4 = w * 28827 / 43200;
        x5 = w * 34129 / 43200;
        x6 = w * 41798 / 43200;
        x7 = w * 38324 / 43200;
        x8 = w * 29078 / 43200;
        x9 = w * 22141 / 43200;
        x10 = w * 14000 / 43200;
        x11 = w * 4127 / 43200;
        y0 = h * 14370 / 43200;
        y1 = h * 26177 / 43200;
        y2 = h * 34899 / 43200;
        y3 = h * 39090 / 43200;
        y4 = h * 34751 / 43200;
        y5 = h * 22954 / 43200;
        y6 = h * 15354 / 43200;
        y7 = h * 5426 / 43200;
        y8 = h * 3952 / 43200;
        y9 = h * 4720 / 43200;
        y10 = h * 5192 / 43200;
        y11 = h * 15789 / 43200;
        //Path:
        //(path attrs: w = 43200; h = 43200; )
        var rX1 = w * 6753 / 43200, rY1 = h * 9190 / 43200, rX2 = w * 5333 / 43200, rY2 = h * 7267 / 43200,
          rX3 = w * 4365 / 43200,
          rY3 = h * 5945 / 43200, rX4 = w * 4857 / 43200, rY4 = h * 6595 / 43200, rY5 = h * 7273 / 43200,
          rX6 = w * 6775 / 43200,
          rY6 = h * 9220 / 43200, rX7 = w * 5785 / 43200, rY7 = h * 7867 / 43200, rX8 = w * 6752 / 43200,
          rY8 = h * 9215 / 43200,
          rX9 = w * 7720 / 43200, rY9 = h * 10543 / 43200, rX10 = w * 4360 / 43200, rY10 = h * 5918 / 43200,
          rX11 = w * 4345 / 43200;
        var sA1 = -11429249 / 60000, wA1 = 7426832 / 60000, sA2 = -8646143 / 60000, wA2 = 5396714 / 60000,
          sA3 = -8748475 / 60000,
          wA3 = 5983381 / 60000, sA4 = -7859164 / 60000, wA4 = 7034504 / 60000, sA5 = -4722533 / 60000,
          wA5 = 6541615 / 60000,
          sA6 = -2776035 / 60000, wA6 = 7816140 / 60000, sA7 = 37501 / 60000, wA7 = 6842000 / 60000,
          sA8 = 1347096 / 60000,
          wA8 = 6910353 / 60000, sA9 = 3974558 / 60000, wA9 = 4542661 / 60000, sA10 = -16496525 / 60000,
          wA10 = 8804134 / 60000,
          sA11 = -14809710 / 60000, wA11 = 9151131 / 60000;

        var cX0, cX1, cX2, cX3, cX4, cX5, cX6, cX7, cX8, cX9, cX10, cY0, cY1, cY2, cY3, cY4, cY5, cY6, cY7, cY8, cY9,
          cY10;
        var arc1, arc2, arc3, arc4, arc5, arc6, arc7, arc8, arc9, arc10, arc11;
        var lxy1, lxy2, lxy3, lxy4, lxy5, lxy6, lxy7, lxy8, lxy9, lxy10;

        cX0 = x0 - rX1 * Math.cos(sA1 * Math.PI / 180);
        cY0 = y0 - rY1 * Math.sin(sA1 * Math.PI / 180);
        arc1 = shapeArc(cX0, cY0, rX1, rY1, sA1, sA1 + wA1, false).replace("M", "L");
        lxy1 = arc1.substr(arc1.lastIndexOf("L") + 1).split(" ");
        cX1 = parseInt(lxy1[0]) - rX2 * Math.cos(sA2 * Math.PI / 180);
        cY1 = parseInt(lxy1[1]) - rY2 * Math.sin(sA2 * Math.PI / 180);
        arc2 = shapeArc(cX1, cY1, rX2, rY2, sA2, sA2 + wA2, false).replace("M", "L");
        lxy2 = arc2.substr(arc2.lastIndexOf("L") + 1).split(" ");
        cX2 = parseInt(lxy2[0]) - rX3 * Math.cos(sA3 * Math.PI / 180);
        cY2 = parseInt(lxy2[1]) - rY3 * Math.sin(sA3 * Math.PI / 180);
        arc3 = shapeArc(cX2, cY2, rX3, rY3, sA3, sA3 + wA3, false).replace("M", "L");
        lxy3 = arc3.substr(arc3.lastIndexOf("L") + 1).split(" ");
        cX3 = parseInt(lxy3[0]) - rX4 * Math.cos(sA4 * Math.PI / 180);
        cY3 = parseInt(lxy3[1]) - rY4 * Math.sin(sA4 * Math.PI / 180);
        arc4 = shapeArc(cX3, cY3, rX4, rY4, sA4, sA4 + wA4, false).replace("M", "L");
        lxy4 = arc4.substr(arc4.lastIndexOf("L") + 1).split(" ");
        cX4 = parseInt(lxy4[0]) - rX2 * Math.cos(sA5 * Math.PI / 180);
        cY4 = parseInt(lxy4[1]) - rY5 * Math.sin(sA5 * Math.PI / 180);
        arc5 = shapeArc(cX4, cY4, rX2, rY5, sA5, sA5 + wA5, false).replace("M", "L");
        lxy5 = arc5.substr(arc5.lastIndexOf("L") + 1).split(" ");
        cX5 = parseInt(lxy5[0]) - rX6 * Math.cos(sA6 * Math.PI / 180);
        cY5 = parseInt(lxy5[1]) - rY6 * Math.sin(sA6 * Math.PI / 180);
        arc6 = shapeArc(cX5, cY5, rX6, rY6, sA6, sA6 + wA6, false).replace("M", "L");
        lxy6 = arc6.substr(arc6.lastIndexOf("L") + 1).split(" ");
        cX6 = parseInt(lxy6[0]) - rX7 * Math.cos(sA7 * Math.PI / 180);
        cY6 = parseInt(lxy6[1]) - rY7 * Math.sin(sA7 * Math.PI / 180);
        arc7 = shapeArc(cX6, cY6, rX7, rY7, sA7, sA7 + wA7, false).replace("M", "L");
        lxy7 = arc7.substr(arc7.lastIndexOf("L") + 1).split(" ");
        cX7 = parseInt(lxy7[0]) - rX8 * Math.cos(sA8 * Math.PI / 180);
        cY7 = parseInt(lxy7[1]) - rY8 * Math.sin(sA8 * Math.PI / 180);
        arc8 = shapeArc(cX7, cY7, rX8, rY8, sA8, sA8 + wA8, false).replace("M", "L");
        lxy8 = arc8.substr(arc8.lastIndexOf("L") + 1).split(" ");
        cX8 = parseInt(lxy8[0]) - rX9 * Math.cos(sA9 * Math.PI / 180);
        cY8 = parseInt(lxy8[1]) - rY9 * Math.sin(sA9 * Math.PI / 180);
        arc9 = shapeArc(cX8, cY8, rX9, rY9, sA9, sA9 + wA9, false).replace("M", "L");
        lxy9 = arc9.substr(arc9.lastIndexOf("L") + 1).split(" ");
        cX9 = parseInt(lxy9[0]) - rX10 * Math.cos(sA10 * Math.PI / 180);
        cY9 = parseInt(lxy9[1]) - rY10 * Math.sin(sA10 * Math.PI / 180);
        arc10 = shapeArc(cX9, cY9, rX10, rY10, sA10, sA10 + wA10, false).replace("M", "L");
        lxy10 = arc10.substr(arc10.lastIndexOf("L") + 1).split(" ");
        cX10 = parseInt(lxy10[0]) - rX11 * Math.cos(sA11 * Math.PI / 180);
        cY10 = parseInt(lxy10[1]) - rY3 * Math.sin(sA11 * Math.PI / 180);
        arc11 = shapeArc(cX10, cY10, rX11, rY3, sA11, sA11 + wA11, false).replace("M", "L");

        var d1 = "M" + x0 + "," + y0 +
          arc1 +
          arc2 +
          arc3 +
          arc4 +
          arc5 +
          arc6 +
          arc7 +
          arc8 +
          arc9 +
          arc10 +
          arc11 +
          " z";
        if (shapType == "cloudCallout") {
          var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
          var refr = slideFactor;
          var sAdj1, adj1 = -20833 * refr;
          var sAdj2, adj2 = 62500 * refr;
          if (shapAdjst_ary !== undefined) {
            for (var i = 0; i < shapAdjst_ary.length; i++) {
              var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
              if (sAdj_name == "adj1") {
                sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
                adj1 = parseInt(sAdj1.substr(4)) * refr;
              } else if (sAdj_name == "adj2") {
                sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
                adj2 = parseInt(sAdj2.substr(4)) * refr;
              }
            }
          }
          var d_val;
          var cnstVal2 = 100000 * refr;
          var ss = Math.min(w, h);
          var wd2 = w / 2, hd2 = h / 2;

          var dxPos, dyPos, xPos, yPos, ht, wt, g2, g3, g4, g5, g6, g7, g8, g9, g10, g11, g12, g13, g14, g15, g16,
            g17, g18, g19, g20, g21, g22, g23, g24, g25, g26, x23, x24, x25;

          dxPos = w * adj1 / cnstVal2;
          dyPos = h * adj2 / cnstVal2;
          xPos = wd2 + dxPos;
          yPos = hd2 + dyPos;
          ht = hd2 * Math.cos(Math.atan(dyPos / dxPos));
          wt = wd2 * Math.sin(Math.atan(dyPos / dxPos));
          g2 = wd2 * Math.cos(Math.atan(wt / ht));
          g3 = hd2 * Math.sin(Math.atan(wt / ht));
          //console.log("adj1: ",adj1,"adj2: ",adj2)
          if (adj1 >= 0) {
            g4 = wd2 + g2;
            g5 = hd2 + g3;
          } else {
            g4 = wd2 - g2;
            g5 = hd2 - g3;
          }
          g6 = g4 - xPos;
          g7 = g5 - yPos;
          g8 = Math.sqrt(g6 * g6 + g7 * g7);
          g9 = ss * 6600 / 21600;
          g10 = g8 - g9;
          g11 = g10 / 3;
          g12 = ss * 1800 / 21600;
          g13 = g11 + g12;
          g14 = g13 * g6 / g8;
          g15 = g13 * g7 / g8;
          g16 = g14 + xPos;
          g17 = g15 + yPos;
          g18 = ss * 4800 / 21600;
          g19 = g11 * 2;
          g20 = g18 + g19;
          g21 = g20 * g6 / g8;
          g22 = g20 * g7 / g8;
          g23 = g21 + xPos;
          g24 = g22 + yPos;
          g25 = ss * 1200 / 21600;
          g26 = ss * 600 / 21600;
          x23 = xPos + g26;
          x24 = g16 + g25;
          x25 = g23 + g12;

          d_val = //" M" + x23 + "," + yPos +
            shapeArc(x23 - g26, yPos, g26, g26, 0, 360, false) + //.replace("M","L") +
            " z" +
            " M" + x24 + "," + g17 +
            shapeArc(x24 - g25, g17, g25, g25, 0, 360, false).replace("M", "L") +
            " z" +
            " M" + x25 + "," + g24 +
            shapeArc(x25 - g12, g24, g12, g12, 0, 360, false).replace("M", "L") +
            " z";
          d1 += d_val;
        }
        result += "<path d='" + d1 + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "smileyFace":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var refr = slideFactor;
        var adj = 4653 * refr;
        if (shapAdjst !== undefined) {
          adj = parseInt(shapAdjst.substr(4)) * refr;
        }
        var d_val;
        var cnstVal1 = 50000 * refr;
        var cnstVal2 = 100000 * refr;
        var cnstVal3 = 4653 * refr;
        var ss = Math.min(w, h);
        var a, x1, x2, x3, x4, y1, y3, dy2, y2, y4, dy3, y5, wR, hR, wd2, hd2;
        wd2 = w / 2;
        hd2 = h / 2;
        a = (adj < -cnstVal3) ? -cnstVal3 : (adj > cnstVal3) ? cnstVal3 : adj;
        x1 = w * 4969 / 21699;
        x2 = w * 6215 / 21600;
        x3 = w * 13135 / 21600;
        x4 = w * 16640 / 21600;
        y1 = h * 7570 / 21600;
        y3 = h * 16515 / 21600;
        dy2 = h * a / cnstVal2;
        y2 = y3 - dy2;
        y4 = y3 + dy2;
        dy3 = h * a / cnstVal1;
        y5 = y4 + dy3;
        wR = w * 1125 / 21600;
        hR = h * 1125 / 21600;
        var cX1 = x2 - wR * Math.cos(Math.PI);
        var cY1 = y1 - hR * Math.sin(Math.PI);
        var cX2 = x3 - wR * Math.cos(Math.PI);
        d_val = //eyes
          shapeArc(cX1, cY1, wR, hR, 180, 540, false) +
          shapeArc(cX2, cY1, wR, hR, 180, 540, false) +
          //mouth
          " M" + x1 + "," + y2 +
          " Q" + wd2 + "," + y5 + " " + x4 + "," + y2 +
          " Q" + wd2 + "," + y5 + " " + x1 + "," + y2 +
          //head
          " M" + 0 + "," + hd2 +
          shapeArc(wd2, hd2, wd2, hd2, 180, 540, false).replace("M", "L") +
          " z";
        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "verticalScroll":
      case "horizontalScroll":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var refr = slideFactor;
        var adj = 12500 * refr;
        if (shapAdjst !== undefined) {
          adj = parseInt(shapAdjst.substr(4)) * refr;
        }
        var d_val;
        var cnstVal1 = 25000 * refr;
        var cnstVal2 = 100000 * refr;
        var ss = Math.min(w, h);
        var t = 0, l = 0, b = h, r = w;
        var a, ch, ch2, ch4;
        a = (adj < 0) ? 0 : (adj > cnstVal1) ? cnstVal1 : adj;
        ch = ss * a / cnstVal2;
        ch2 = ch / 2;
        ch4 = ch / 4;
        if (shapType == "verticalScroll") {
          var x3, x4, x6, x7, x5, y3, y4;
          x3 = ch + ch2;
          x4 = ch + ch;
          x6 = r - ch;
          x7 = r - ch2;
          x5 = x6 - ch2;
          y3 = b - ch;
          y4 = b - ch2;

          d_val = "M" + ch + "," + y3 +
            " L" + ch + "," + ch2 +
            shapeArc(x3, ch2, ch2, ch2, 180, 270, false).replace("M", "L") +
            " L" + x7 + "," + t +
            shapeArc(x7, ch2, ch2, ch2, 270, 450, false).replace("M", "L") +
            " L" + x6 + "," + ch +
            " L" + x6 + "," + y4 +
            shapeArc(x5, y4, ch2, ch2, 0, 90, false).replace("M", "L") +
            " L" + ch2 + "," + b +
            shapeArc(ch2, y4, ch2, ch2, 90, 270, false).replace("M", "L") +
            " z" +
            " M" + x3 + "," + t +
            shapeArc(x3, ch2, ch2, ch2, 270, 450, false).replace("M", "L") +
            shapeArc(x3, x3 / 2, ch4, ch4, 90, 270, false).replace("M", "L") +
            " L" + x4 + "," + ch2 +
            " M" + x6 + "," + ch +
            " L" + x3 + "," + ch +
            " M" + ch + "," + y4 +
            shapeArc(ch2, y4, ch2, ch2, 0, 270, false).replace("M", "L") +
            shapeArc(ch2, (y4 + y3) / 2, ch4, ch4, 270, 450, false).replace("M", "L") +
            " z" +
            " M" + ch + "," + y4 +
            " L" + ch + "," + y3;
        } else if (shapType == "horizontalScroll") {
          var y3, y4, y6, y7, y5, x3, x4;
          y3 = ch + ch2;
          y4 = ch + ch;
          y6 = b - ch;
          y7 = b - ch2;
          y5 = y6 - ch2;
          x3 = r - ch;
          x4 = r - ch2;

          d_val = "M" + l + "," + y3 +
            shapeArc(ch2, y3, ch2, ch2, 180, 270, false).replace("M", "L") +
            " L" + x3 + "," + ch +
            " L" + x3 + "," + ch2 +
            shapeArc(x4, ch2, ch2, ch2, 180, 360, false).replace("M", "L") +
            " L" + r + "," + y5 +
            shapeArc(x4, y5, ch2, ch2, 0, 90, false).replace("M", "L") +
            " L" + ch + "," + y6 +
            " L" + ch + "," + y7 +
            shapeArc(ch2, y7, ch2, ch2, 0, 180, false).replace("M", "L") +
            " z" +
            "M" + x4 + "," + ch +
            shapeArc(x4, ch2, ch2, ch2, 90, -180, false).replace("M", "L") +
            shapeArc((x3 + x4) / 2, ch2, ch4, ch4, 180, 0, false).replace("M", "L") +
            " z" +
            " M" + x4 + "," + ch +
            " L" + x3 + "," + ch +
            " M" + ch2 + "," + y4 +
            " L" + ch2 + "," + y3 +
            shapeArc(y3 / 2, y3, ch4, ch4, 180, 360, false).replace("M", "L") +
            shapeArc(ch2, y3, ch2, ch2, 0, 180, false).replace("M", "L") +
            " M" + ch + "," + y3 +
            " L" + ch + "," + y6;
        }

        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "wedgeEllipseCallout":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var refr = slideFactor;
        var sAdj1, adj1 = -20833 * refr;
        var sAdj2, adj2 = 62500 * refr;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * refr;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * refr;
            }
          }
        }
        var d_val;
        var cnstVal1 = 100000 * slideFactor;
        var angVal1 = 11 * Math.PI / 180;
        var ss = Math.min(w, h);
        var dxPos, dyPos, xPos, yPos, sdx, sdy, pang, stAng, enAng, dx1, dy1, x1, y1, dx2, dy2,
          x2, y2, stAng1, enAng1, swAng1, swAng2, swAng,
          vc = h / 2, hc = w / 2;
        dxPos = w * adj1 / cnstVal1;
        dyPos = h * adj2 / cnstVal1;
        xPos = hc + dxPos;
        yPos = vc + dyPos;
        sdx = dxPos * h;
        sdy = dyPos * w;
        pang = Math.atan(sdy / sdx);
        stAng = pang + angVal1;
        enAng = pang - angVal1;
        console.log("dxPos: ", dxPos, "dyPos: ", dyPos)
        dx1 = hc * Math.cos(stAng);
        dy1 = vc * Math.sin(stAng);
        dx2 = hc * Math.cos(enAng);
        dy2 = vc * Math.sin(enAng);
        if (dxPos >= 0) {
          x1 = hc + dx1;
          y1 = vc + dy1;
          x2 = hc + dx2;
          y2 = vc + dy2;
        } else {
          x1 = hc - dx1;
          y1 = vc - dy1;
          x2 = hc - dx2;
          y2 = vc - dy2;
        }
        /*
                        //stAng = pang+angVal1;
                        //enAng = pang-angVal1;
                        //dx1 = hc*Math.cos(stAng);
                        //dy1 = vc*Math.sin(stAng);
                        x1 = hc+dx1;
                        y1 = vc+dy1;
                        dx2 = hc*Math.cos(enAng);
                        dy2 = vc*Math.sin(enAng);
                        x2 = hc+dx2;
                        y2 = vc+dy2;
                        stAng1 = Math.atan(dy1/dx1);
                        enAng1 = Math.atan(dy2/dx2);
                        swAng1 = enAng1-stAng1;
                        swAng2 = swAng1+2*Math.PI;
                        swAng = (swAng1 > 0)?swAng1:swAng2;
                        var stAng1Dg = stAng1*180/Math.PI;
                        var swAngDg = swAng*180/Math.PI;
                        var endAng = stAng1Dg + swAngDg;
                        */
        d_val = "M" + x1 + "," + y1 +
          " L" + xPos + "," + yPos +
          " L" + x2 + "," + y2 +
          //" z" +
          shapeArc(hc, vc, hc, vc, 0, 360, true);// +
        //shapeArc(hc,vc,hc,vc,stAng1Dg,stAng1Dg+swAngDg,false).replace("M","L") +
        //" z";
        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "wedgeRectCallout":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var refr = slideFactor;
        var sAdj1, adj1 = -20833 * refr;
        var sAdj2, adj2 = 62500 * refr;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * refr;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * refr;
            }
          }
        }
        var d_val;
        var cnstVal1 = 100000 * slideFactor;
        var dxPos, dyPos, xPos, yPos, dx, dy, dq, ady, adq, dz, xg1, xg2, x1, x2,
          yg1, yg2, y1, y2, t1, xl, t2, xt, t3, xr, t4, xb, t5, yl, t6, yt, t7, yr, t8, yb,
          vc = h / 2, hc = w / 2;
        dxPos = w * adj1 / cnstVal1;
        dyPos = h * adj2 / cnstVal1;
        xPos = hc + dxPos;
        yPos = vc + dyPos;
        dx = xPos - hc;
        dy = yPos - vc;
        dq = dxPos * h / w;
        ady = Math.abs(dyPos);
        adq = Math.abs(dq);
        dz = ady - adq;
        xg1 = (dxPos > 0) ? 7 : 2;
        xg2 = (dxPos > 0) ? 10 : 5;
        x1 = w * xg1 / 12;
        x2 = w * xg2 / 12;
        yg1 = (dyPos > 0) ? 7 : 2;
        yg2 = (dyPos > 0) ? 10 : 5;
        y1 = h * yg1 / 12;
        y2 = h * yg2 / 12;
        t1 = (dxPos > 0) ? 0 : xPos;
        xl = (dz > 0) ? 0 : t1;
        t2 = (dyPos > 0) ? x1 : xPos;
        xt = (dz > 0) ? t2 : x1;
        t3 = (dxPos > 0) ? xPos : w;
        xr = (dz > 0) ? w : t3;
        t4 = (dyPos > 0) ? xPos : x1;
        xb = (dz > 0) ? t4 : x1;
        t5 = (dxPos > 0) ? y1 : yPos;
        yl = (dz > 0) ? y1 : t5;
        t6 = (dyPos > 0) ? 0 : yPos;
        yt = (dz > 0) ? t6 : 0;
        t7 = (dxPos > 0) ? yPos : y1;
        yr = (dz > 0) ? y1 : t7;
        t8 = (dyPos > 0) ? yPos : h;
        yb = (dz > 0) ? t8 : h;

        d_val = "M" + 0 + "," + 0 +
          " L" + x1 + "," + 0 +
          " L" + xt + "," + yt +
          " L" + x2 + "," + 0 +
          " L" + w + "," + 0 +
          " L" + w + "," + y1 +
          " L" + xr + "," + yr +
          " L" + w + "," + y2 +
          " L" + w + "," + h +
          " L" + x2 + "," + h +
          " L" + xb + "," + yb +
          " L" + x1 + "," + h +
          " L" + 0 + "," + h +
          " L" + 0 + "," + y2 +
          " L" + xl + "," + yl +
          " L" + 0 + "," + y1 +
          " z";

        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "wedgeRoundRectCallout":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var refr = slideFactor;
        var sAdj1, adj1 = -20833 * refr;
        var sAdj2, adj2 = 62500 * refr;
        var sAdj3, adj3 = 16667 * refr;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * refr;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * refr;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * refr;
            }
          }
        }
        var d_val;
        var cnstVal1 = 100000 * slideFactor;
        var ss = Math.min(w, h);
        var dxPos, dyPos, xPos, yPos, dq, ady, adq, dz, xg1, xg2, x1, x2, yg1, yg2, y1, y2,
          t1, xl, t2, xt, t3, xr, t4, xb, t5, yl, t6, yt, t7, yr, t8, yb, u1, u2, v2,
          vc = h / 2, hc = w / 2;
        dxPos = w * adj1 / cnstVal1;
        dyPos = h * adj2 / cnstVal1;
        xPos = hc + dxPos;
        yPos = vc + dyPos;
        dq = dxPos * h / w;
        ady = Math.abs(dyPos);
        adq = Math.abs(dq);
        dz = ady - adq;
        xg1 = (dxPos > 0) ? 7 : 2;
        xg2 = (dxPos > 0) ? 10 : 5;
        x1 = w * xg1 / 12;
        x2 = w * xg2 / 12;
        yg1 = (dyPos > 0) ? 7 : 2;
        yg2 = (dyPos > 0) ? 10 : 5;
        y1 = h * yg1 / 12;
        y2 = h * yg2 / 12;
        t1 = (dxPos > 0) ? 0 : xPos;
        xl = (dz > 0) ? 0 : t1;
        t2 = (dyPos > 0) ? x1 : xPos;
        xt = (dz > 0) ? t2 : x1;
        t3 = (dxPos > 0) ? xPos : w;
        xr = (dz > 0) ? w : t3;
        t4 = (dyPos > 0) ? xPos : x1;
        xb = (dz > 0) ? t4 : x1;
        t5 = (dxPos > 0) ? y1 : yPos;
        yl = (dz > 0) ? y1 : t5;
        t6 = (dyPos > 0) ? 0 : yPos;
        yt = (dz > 0) ? t6 : 0;
        t7 = (dxPos > 0) ? yPos : y1;
        yr = (dz > 0) ? y1 : t7;
        t8 = (dyPos > 0) ? yPos : h;
        yb = (dz > 0) ? t8 : h;
        u1 = ss * adj3 / cnstVal1;
        u2 = w - u1;
        v2 = h - u1;
        d_val = "M" + 0 + "," + u1 +
          shapeArc(u1, u1, u1, u1, 180, 270, false).replace("M", "L") +
          " L" + x1 + "," + 0 +
          " L" + xt + "," + yt +
          " L" + x2 + "," + 0 +
          " L" + u2 + "," + 0 +
          shapeArc(u2, u1, u1, u1, 270, 360, false).replace("M", "L") +
          " L" + w + "," + y1 +
          " L" + xr + "," + yr +
          " L" + w + "," + y2 +
          " L" + w + "," + v2 +
          shapeArc(u2, v2, u1, u1, 0, 90, false).replace("M", "L") +
          " L" + x2 + "," + h +
          " L" + xb + "," + yb +
          " L" + x1 + "," + h +
          " L" + u1 + "," + h +
          shapeArc(u1, v2, u1, u1, 90, 180, false).replace("M", "L") +
          " L" + 0 + "," + y2 +
          " L" + xl + "," + yl +
          " L" + 0 + "," + y1 +
          " z";
        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "accentBorderCallout1":
      case "accentBorderCallout2":
      case "accentBorderCallout3":
      case "borderCallout1":
      case "borderCallout2":
      case "borderCallout3":
      case "accentCallout1":
      case "accentCallout2":
      case "accentCallout3":
      case "callout1":
      case "callout2":
      case "callout3":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var refr = slideFactor;
        var sAdj1, adj1 = 18750 * refr;
        var sAdj2, adj2 = -8333 * refr;
        var sAdj3, adj3 = 18750 * refr;
        var sAdj4, adj4 = -16667 * refr;
        var sAdj5, adj5 = 100000 * refr;
        var sAdj6, adj6 = -16667 * refr;
        var sAdj7, adj7 = 112963 * refr;
        var sAdj8, adj8 = -8333 * refr;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * refr;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * refr;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * refr;
            } else if (sAdj_name == "adj4") {
              sAdj4 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj4 = parseInt(sAdj4.substr(4)) * refr;
            } else if (sAdj_name == "adj5") {
              sAdj5 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj5 = parseInt(sAdj5.substr(4)) * refr;
            } else if (sAdj_name == "adj6") {
              sAdj6 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj6 = parseInt(sAdj6.substr(4)) * refr;
            } else if (sAdj_name == "adj7") {
              sAdj7 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj7 = parseInt(sAdj7.substr(4)) * refr;
            } else if (sAdj_name == "adj8") {
              sAdj8 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj8 = parseInt(sAdj8.substr(4)) * refr;
            }
          }
        }
        var d_val;
        var cnstVal1 = 100000 * refr;
        var isBorder = true;
        switch (shapType) {
          case "borderCallout1":
          case "callout1":
            if (shapType == "borderCallout1") {
              isBorder = true;
            } else {
              isBorder = false;
            }
            if (shapAdjst_ary === undefined) {
              adj1 = 18750 * refr;
              adj2 = -8333 * refr;
              adj3 = 112500 * refr;
              adj4 = -38333 * refr;
            }
            var y1, x1, y2, x2;
            y1 = h * adj1 / cnstVal1;
            x1 = w * adj2 / cnstVal1;
            y2 = h * adj3 / cnstVal1;
            x2 = w * adj4 / cnstVal1;
            d_val = "M" + 0 + "," + 0 +
              " L" + w + "," + 0 +
              " L" + w + "," + h +
              " L" + 0 + "," + h +
              " z" +
              " M" + x1 + "," + y1 +
              " L" + x2 + "," + y2;
            break;
          case "borderCallout2":
          case "callout2":
            if (shapType == "borderCallout2") {
              isBorder = true;
            } else {
              isBorder = false;
            }
            if (shapAdjst_ary === undefined) {
              adj1 = 18750 * refr;
              adj2 = -8333 * refr;
              adj3 = 18750 * refr;
              adj4 = -16667 * refr;

              adj5 = 112500 * refr;
              adj6 = -46667 * refr;
            }
            var y1, x1, y2, x2, y3, x3;

            y1 = h * adj1 / cnstVal1;
            x1 = w * adj2 / cnstVal1;
            y2 = h * adj3 / cnstVal1;
            x2 = w * adj4 / cnstVal1;

            y3 = h * adj5 / cnstVal1;
            x3 = w * adj6 / cnstVal1;
            d_val = "M" + 0 + "," + 0 +
              " L" + w + "," + 0 +
              " L" + w + "," + h +
              " L" + 0 + "," + h +
              " z" +

              " M" + x1 + "," + y1 +
              " L" + x2 + "," + y2 +

              " L" + x3 + "," + y3 +
              " L" + x2 + "," + y2;

            break;
          case "borderCallout3":
          case "callout3":
            if (shapType == "borderCallout3") {
              isBorder = true;
            } else {
              isBorder = false;
            }
            if (shapAdjst_ary === undefined) {
              adj1 = 18750 * refr;
              adj2 = -8333 * refr;
              adj3 = 18750 * refr;
              adj4 = -16667 * refr;

              adj5 = 100000 * refr;
              adj6 = -16667 * refr;

              adj7 = 112963 * refr;
              adj8 = -8333 * refr;
            }
            var y1, x1, y2, x2, y3, x3, y4, x4;

            y1 = h * adj1 / cnstVal1;
            x1 = w * adj2 / cnstVal1;
            y2 = h * adj3 / cnstVal1;
            x2 = w * adj4 / cnstVal1;

            y3 = h * adj5 / cnstVal1;
            x3 = w * adj6 / cnstVal1;

            y4 = h * adj7 / cnstVal1;
            x4 = w * adj8 / cnstVal1;
            d_val = "M" + 0 + "," + 0 +
              " L" + w + "," + 0 +
              " L" + w + "," + h +
              " L" + 0 + "," + h +
              " z" +

              " M" + x1 + "," + y1 +
              " L" + x2 + "," + y2 +

              " L" + x3 + "," + y3 +

              " L" + x4 + "," + y4 +
              " L" + x3 + "," + y3 +
              " L" + x2 + "," + y2;
            break;
          case "accentBorderCallout1":
          case "accentCallout1":
            if (shapType == "accentBorderCallout1") {
              isBorder = true;
            } else {
              isBorder = false;
            }

            if (shapAdjst_ary === undefined) {
              adj1 = 18750 * refr;
              adj2 = -8333 * refr;
              adj3 = 112500 * refr;
              adj4 = -38333 * refr;
            }
            var y1, x1, y2, x2;
            y1 = h * adj1 / cnstVal1;
            x1 = w * adj2 / cnstVal1;
            y2 = h * adj3 / cnstVal1;
            x2 = w * adj4 / cnstVal1;
            d_val = "M" + 0 + "," + 0 +
              " L" + w + "," + 0 +
              " L" + w + "," + h +
              " L" + 0 + "," + h +
              " z" +

              " M" + x1 + "," + y1 +
              " L" + x2 + "," + y2 +

              " M" + x1 + "," + 0 +
              " L" + x1 + "," + h;
            break;
          case "accentBorderCallout2":
          case "accentCallout2":
            if (shapType == "accentBorderCallout2") {
              isBorder = true;
            } else {
              isBorder = false;
            }
            if (shapAdjst_ary === undefined) {
              adj1 = 18750 * refr;
              adj2 = -8333 * refr;
              adj3 = 18750 * refr;
              adj4 = -16667 * refr;
              adj5 = 112500 * refr;
              adj6 = -46667 * refr;
            }
            var y1, x1, y2, x2, y3, x3;

            y1 = h * adj1 / cnstVal1;
            x1 = w * adj2 / cnstVal1;
            y2 = h * adj3 / cnstVal1;
            x2 = w * adj4 / cnstVal1;
            y3 = h * adj5 / cnstVal1;
            x3 = w * adj6 / cnstVal1;
            d_val = "M" + 0 + "," + 0 +
              " L" + w + "," + 0 +
              " L" + w + "," + h +
              " L" + 0 + "," + h +
              " z" +

              " M" + x1 + "," + y1 +
              " L" + x2 + "," + y2 +
              " L" + x3 + "," + y3 +
              " L" + x2 + "," + y2 +

              " M" + x1 + "," + 0 +
              " L" + x1 + "," + h;

            break;
          case "accentBorderCallout3":
          case "accentCallout3":
            if (shapType == "accentBorderCallout3") {
              isBorder = true;
            } else {
              isBorder = false;
            }
            isBorder = true;
            if (shapAdjst_ary === undefined) {
              adj1 = 18750 * refr;
              adj2 = -8333 * refr;
              adj3 = 18750 * refr;
              adj4 = -16667 * refr;
              adj5 = 100000 * refr;
              adj6 = -16667 * refr;
              adj7 = 112963 * refr;
              adj8 = -8333 * refr;
            }
            var y1, x1, y2, x2, y3, x3, y4, x4;

            y1 = h * adj1 / cnstVal1;
            x1 = w * adj2 / cnstVal1;
            y2 = h * adj3 / cnstVal1;
            x2 = w * adj4 / cnstVal1;
            y3 = h * adj5 / cnstVal1;
            x3 = w * adj6 / cnstVal1;
            y4 = h * adj7 / cnstVal1;
            x4 = w * adj8 / cnstVal1;
            d_val = "M" + 0 + "," + 0 +
              " L" + w + "," + 0 +
              " L" + w + "," + h +
              " L" + 0 + "," + h +
              " z" +

              " M" + x1 + "," + y1 +
              " L" + x2 + "," + y2 +
              " L" + x3 + "," + y3 +
              " L" + x4 + "," + y4 +
              " L" + x3 + "," + y3 +
              " L" + x2 + "," + y2 +

              " M" + x1 + "," + 0 +
              " L" + x1 + "," + h;
            break;
        }

        //console.log("shapType: ", shapType, ",isBorder:", isBorder)
        //if(isBorder){
        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        //}else{
        //    result += "<path d='"+d_val+"' fill='" + (!imgFillFlg?(grndFillFlg?"url(#linGrd_"+shpId+")":fillColor):"url(#imgPtrn_"+shpId+")") +
        //        "' stroke='none' />";

        //}
        break;
      case "leftRightRibbon":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var refr = slideFactor;
        var sAdj1, adj1 = 50000 * refr;
        var sAdj2, adj2 = 50000 * refr;
        var sAdj3, adj3 = 16667 * refr;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * refr;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * refr;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * refr;
            }
          }
        }
        var d_val;
        var cnstVal1 = 33333 * refr;
        var cnstVal2 = 100000 * refr;
        var cnstVal3 = 200000 * refr;
        var cnstVal4 = 400000 * refr;
        var ss = Math.min(w, h);
        var a3, maxAdj1, a1, w1, maxAdj2, a2, x1, x4, dy1, dy2, ly1, ry4, ly2, ry3, ly4, ry1,
          ly3, ry2, hR, x2, x3, y1, y2, wd32 = w / 32, vc = h / 2, hc = w / 2;

        a3 = (adj3 < 0) ? 0 : (adj3 > cnstVal1) ? cnstVal1 : adj3;
        maxAdj1 = cnstVal2 - a3;
        a1 = (adj1 < 0) ? 0 : (adj1 > maxAdj1) ? maxAdj1 : adj1;
        w1 = hc - wd32;
        maxAdj2 = cnstVal2 * w1 / ss;
        a2 = (adj2 < 0) ? 0 : (adj2 > maxAdj2) ? maxAdj2 : adj2;
        x1 = ss * a2 / cnstVal2;
        x4 = w - x1;
        dy1 = h * a1 / cnstVal3;
        dy2 = h * a3 / -cnstVal3;
        ly1 = vc + dy2 - dy1;
        ry4 = vc + dy1 - dy2;
        ly2 = ly1 + dy1;
        ry3 = h - ly2;
        ly4 = ly2 * 2;
        ry1 = h - ly4;
        ly3 = ly4 - ly1;
        ry2 = h - ly3;
        hR = a3 * ss / cnstVal4;
        x2 = hc - wd32;
        x3 = hc + wd32;
        y1 = ly1 + hR;
        y2 = ry2 - hR;

        d_val = "M" + 0 + "," + ly2 +
          "L" + x1 + "," + 0 +
          "L" + x1 + "," + ly1 +
          "L" + hc + "," + ly1 +
          shapeArc(hc, y1, wd32, hR, 270, 450, false).replace("M", "L") +
          shapeArc(hc, y2, wd32, hR, 270, 90, false).replace("M", "L") +
          "L" + x4 + "," + ry2 +
          "L" + x4 + "," + ry1 +
          "L" + w + "," + ry3 +
          "L" + x4 + "," + h +
          "L" + x4 + "," + ry4 +
          "L" + hc + "," + ry4 +
          shapeArc(hc, ry4 - hR, wd32, hR, 90, 180, false).replace("M", "L") +
          "L" + x2 + "," + ly3 +
          "L" + x1 + "," + ly3 +
          "L" + x1 + "," + ly4 +
          " z" +
          "M" + x3 + "," + y1 +
          "L" + x3 + "," + ry2 +
          "M" + x2 + "," + y2 +
          "L" + x2 + "," + ly3;

        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "ribbon":
      case "ribbon2":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 16667 * slideFactor;
        var sAdj2, adj2 = 50000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            }
          }
        }
        var d_val;
        var cnstVal1 = 25000 * slideFactor;
        var cnstVal2 = 33333 * slideFactor;
        var cnstVal3 = 75000 * slideFactor;
        var cnstVal4 = 100000 * slideFactor;
        var cnstVal5 = 200000 * slideFactor;
        var cnstVal6 = 400000 * slideFactor;
        var hc = w / 2, t = 0, l = 0, b = h, r = w, wd8 = w / 8, wd32 = w / 32;
        var a1, a2, x10, dx2, x2, x9, x3, x8, x5, x6, x4, x7, y1, y2, y4, y3, hR, y6;
        a1 = (adj1 < 0) ? 0 : (adj1 > cnstVal2) ? cnstVal2 : adj1;
        a2 = (adj2 < cnstVal1) ? cnstVal1 : (adj2 > cnstVal3) ? cnstVal3 : adj2;
        x10 = r - wd8;
        dx2 = w * a2 / cnstVal5;
        x2 = hc - dx2;
        x9 = hc + dx2;
        x3 = x2 + wd32;
        x8 = x9 - wd32;
        x5 = x2 + wd8;
        x6 = x9 - wd8;
        x4 = x5 - wd32;
        x7 = x6 + wd32;
        hR = h * a1 / cnstVal6;
        if (shapType == "ribbon2") {
          var dy1, dy2, y7;
          dy1 = h * a1 / cnstVal5;
          y1 = b - dy1;
          dy2 = h * a1 / cnstVal4;
          y2 = b - dy2;
          y4 = t + dy2;
          y3 = (y4 + b) / 2;
          y6 = b - hR;///////////////////
          y7 = y1 - hR;

          d_val = "M" + l + "," + b +
            " L" + wd8 + "," + y3 +
            " L" + l + "," + y4 +
            " L" + x2 + "," + y4 +
            " L" + x2 + "," + hR +
            shapeArc(x3, hR, wd32, hR, 180, 270, false).replace("M", "L") +
            " L" + x8 + "," + t +
            shapeArc(x8, hR, wd32, hR, 270, 360, false).replace("M", "L") +
            " L" + x9 + "," + y4 +
            " L" + x9 + "," + y4 +
            " L" + r + "," + y4 +
            " L" + x10 + "," + y3 +
            " L" + r + "," + b +
            " L" + x7 + "," + b +
            shapeArc(x7, y6, wd32, hR, 90, 270, false).replace("M", "L") +
            " L" + x8 + "," + y1 +
            shapeArc(x8, y7, wd32, hR, 90, -90, false).replace("M", "L") +
            " L" + x3 + "," + y2 +
            shapeArc(x3, y7, wd32, hR, 270, 90, false).replace("M", "L") +
            " L" + x4 + "," + y1 +
            shapeArc(x4, y6, wd32, hR, 270, 450, false).replace("M", "L") +
            " z" +
            " M" + x5 + "," + y2 +
            " L" + x5 + "," + y6 +
            "M" + x6 + "," + y6 +
            " L" + x6 + "," + y2 +
            "M" + x2 + "," + y7 +
            " L" + x2 + "," + y4 +
            "M" + x9 + "," + y4 +
            " L" + x9 + "," + y7;
        } else if (shapType == "ribbon") {
          var y5;
          y1 = h * a1 / cnstVal5;
          y2 = h * a1 / cnstVal4;
          y4 = b - y2;
          y3 = y4 / 2;
          y5 = b - hR; ///////////////////////
          y6 = y2 - hR;
          d_val = "M" + l + "," + t +
            " L" + x4 + "," + t +
            shapeArc(x4, hR, wd32, hR, 270, 450, false).replace("M", "L") +
            " L" + x3 + "," + y1 +
            shapeArc(x3, y6, wd32, hR, 270, 90, false).replace("M", "L") +
            " L" + x8 + "," + y2 +
            shapeArc(x8, y6, wd32, hR, 90, -90, false).replace("M", "L") +
            " L" + x7 + "," + y1 +
            shapeArc(x7, hR, wd32, hR, 90, 270, false).replace("M", "L") +
            " L" + r + "," + t +
            " L" + x10 + "," + y3 +
            " L" + r + "," + y4 +
            " L" + x9 + "," + y4 +
            " L" + x9 + "," + y5 +
            shapeArc(x8, y5, wd32, hR, 0, 90, false).replace("M", "L") +
            " L" + x3 + "," + b +
            shapeArc(x3, y5, wd32, hR, 90, 180, false).replace("M", "L") +
            " L" + x2 + "," + y4 +
            " L" + l + "," + y4 +
            " L" + wd8 + "," + y3 +
            " z" +
            " M" + x5 + "," + hR +
            " L" + x5 + "," + y2 +
            "M" + x6 + "," + y2 +
            " L" + x6 + "," + hR +
            "M" + x2 + "," + y4 +
            " L" + x2 + "," + y6 +
            "M" + x9 + "," + y6 +
            " L" + x9 + "," + y4;
        }
        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "doubleWave":
      case "wave":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = (shapType == "doubleWave") ? 6250 * slideFactor : 12500 * slideFactor;
        var sAdj2, adj2 = 0;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            }
          }
        }
        var d_val;
        var cnstVal2 = -10000 * slideFactor;
        var cnstVal3 = 50000 * slideFactor;
        var cnstVal4 = 100000 * slideFactor;
        var hc = w / 2, t = 0, l = 0, b = h, r = w, wd8 = w / 8, wd32 = w / 32;
        if (shapType == "doubleWave") {
          var cnstVal1 = 12500 * slideFactor;
          var a1, a2, y1, dy2, y2, y3, y4, y5, y6, of2, dx2, x2, dx8, x8, dx3, x3, dx4, x4, x5, x6, x7, x9, x15, x10,
            x11, x12, x13, x14;
          a1 = (adj1 < 0) ? 0 : (adj1 > cnstVal1) ? cnstVal1 : adj1;
          a2 = (adj2 < cnstVal2) ? cnstVal2 : (adj2 > cnstVal4) ? cnstVal4 : adj2;
          y1 = h * a1 / cnstVal4;
          dy2 = y1 * 10 / 3;
          y2 = y1 - dy2;
          y3 = y1 + dy2;
          y4 = b - y1;
          y5 = y4 - dy2;
          y6 = y4 + dy2;
          of2 = w * a2 / cnstVal3;
          dx2 = (of2 > 0) ? 0 : of2;
          x2 = l - dx2;
          dx8 = (of2 > 0) ? of2 : 0;
          x8 = r - dx8;
          dx3 = (dx2 + x8) / 6;
          x3 = x2 + dx3;
          dx4 = (dx2 + x8) / 3;
          x4 = x2 + dx4;
          x5 = (x2 + x8) / 2;
          x6 = x5 + dx3;
          x7 = (x6 + x8) / 2;
          x9 = l + dx8;
          x15 = r + dx2;
          x10 = x9 + dx3;
          x11 = x9 + dx4;
          x12 = (x9 + x15) / 2;
          x13 = x12 + dx3;
          x14 = (x13 + x15) / 2;

          d_val = "M" + x2 + "," + y1 +
            " C" + x3 + "," + y2 + " " + x4 + "," + y3 + " " + x5 + "," + y1 +
            " C" + x6 + "," + y2 + " " + x7 + "," + y3 + " " + x8 + "," + y1 +
            " L" + x15 + "," + y4 +
            " C" + x14 + "," + y6 + " " + x13 + "," + y5 + " " + x12 + "," + y4 +
            " C" + x11 + "," + y6 + " " + x10 + "," + y5 + " " + x9 + "," + y4 +
            " z";
        } else if (shapType == "wave") {
          var cnstVal5 = 20000 * slideFactor;
          var a1, a2, y1, dy2, y2, y3, y4, y5, y6, of2, dx2, x2, dx5, x5, dx3, x3, x4, x6, x10, x7, x8;
          a1 = (adj1 < 0) ? 0 : (adj1 > cnstVal5) ? cnstVal5 : adj1;
          a2 = (adj2 < cnstVal2) ? cnstVal2 : (adj2 > cnstVal4) ? cnstVal4 : adj2;
          y1 = h * a1 / cnstVal4;
          dy2 = y1 * 10 / 3;
          y2 = y1 - dy2;
          y3 = y1 + dy2;
          y4 = b - y1;
          y5 = y4 - dy2;
          y6 = y4 + dy2;
          of2 = w * a2 / cnstVal3;
          dx2 = (of2 > 0) ? 0 : of2;
          x2 = l - dx2;
          dx5 = (of2 > 0) ? of2 : 0;
          x5 = r - dx5;
          dx3 = (dx2 + x5) / 3;
          x3 = x2 + dx3;
          x4 = (x3 + x5) / 2;
          x6 = l + dx5;
          x10 = r + dx2;
          x7 = x6 + dx3;
          x8 = (x7 + x10) / 2;

          d_val = "M" + x2 + "," + y1 +
            " C" + x3 + "," + y2 + " " + x4 + "," + y3 + " " + x5 + "," + y1 +
            " L" + x10 + "," + y4 +
            " C" + x8 + "," + y6 + " " + x7 + "," + y5 + " " + x6 + "," + y4 +
            " z";
        }
        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "ellipseRibbon":
      case "ellipseRibbon2":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 25000 * slideFactor;
        var sAdj2, adj2 = 50000 * slideFactor;
        var sAdj3, adj3 = 12500 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * slideFactor;
            }
          }
        }
        var d_val;
        var cnstVal1 = 25000 * slideFactor;
        var cnstVal3 = 75000 * slideFactor;
        var cnstVal4 = 100000 * slideFactor;
        var cnstVal5 = 200000 * slideFactor;
        var hc = w / 2, t = 0, l = 0, b = h, r = w, wd8 = w / 8;
        var a1, a2, q10, q11, q12, minAdj3, a3, dx2, x2, x3, x4, x5, x6, dy1, f1, q1, q2,
          cx1, cx2, q1, dy3, q3, q4, q5, rh, q8, cx4, q9, cx5;
        a1 = (adj1 < 0) ? 0 : (adj1 > cnstVal4) ? cnstVal4 : adj1;
        a2 = (adj2 < cnstVal1) ? cnstVal1 : (adj2 > cnstVal3) ? cnstVal3 : adj2;
        q10 = cnstVal4 - a1;
        q11 = q10 / 2;
        q12 = a1 - q11;
        minAdj3 = (0 > q12) ? 0 : q12;
        a3 = (adj3 < minAdj3) ? minAdj3 : (adj3 > a1) ? a1 : adj3;
        dx2 = w * a2 / cnstVal5;
        x2 = hc - dx2;
        x3 = x2 + wd8;
        x4 = r - x3;
        x5 = r - x2;
        x6 = r - wd8;
        dy1 = h * a3 / cnstVal4;
        f1 = 4 * dy1 / w;
        q1 = x3 * x3 / w;
        q2 = x3 - q1;
        cx1 = x3 / 2;
        cx2 = r - cx1;
        q1 = h * a1 / cnstVal4;
        dy3 = q1 - dy1;
        q3 = x2 * x2 / w;
        q4 = x2 - q3;
        q5 = f1 * q4;
        rh = b - q1;
        q8 = dy1 * 14 / 16;
        cx4 = x2 / 2;
        q9 = f1 * cx4;
        cx5 = r - cx4;
        if (shapType == "ellipseRibbon") {
          var y1, cy1, y3, q6, q7, cy3, y2, y5, y6,
            cy4, cy6, y7, cy7, y8;
          y1 = f1 * q2;
          cy1 = f1 * cx1;
          y3 = q5 + dy3;
          q6 = dy1 + dy3 - y3;
          q7 = q6 + dy1;
          cy3 = q7 + dy3;
          y2 = (q8 + rh) / 2;
          y5 = q5 + rh;
          y6 = y3 + rh;
          cy4 = q9 + rh;
          cy6 = cy3 + rh;
          y7 = y1 + dy3;
          cy7 = q1 + q1 - y7;
          y8 = b - dy1;
          //
          d_val = "M" + l + "," + t +
            " Q" + cx1 + "," + cy1 + " " + x3 + "," + y1 +
            " L" + x2 + "," + y3 +
            " Q" + hc + "," + cy3 + " " + x5 + "," + y3 +
            " L" + x4 + "," + y1 +
            " Q" + cx2 + "," + cy1 + " " + r + "," + t +
            " L" + x6 + "," + y2 +
            " L" + r + "," + rh +
            " Q" + cx5 + "," + cy4 + " " + x5 + "," + y5 +
            " L" + x5 + "," + y6 +
            " Q" + hc + "," + cy6 + " " + x2 + "," + y6 +
            " L" + x2 + "," + y5 +
            " Q" + cx4 + "," + cy4 + " " + l + "," + rh +
            " L" + wd8 + "," + y2 +
            " z" +
            "M" + x2 + "," + y5 +
            " L" + x2 + "," + y3 +
            "M" + x5 + "," + y3 +
            " L" + x5 + "," + y5 +
            "M" + x3 + "," + y1 +
            " L" + x3 + "," + y7 +
            "M" + x4 + "," + y7 +
            " L" + x4 + "," + y1;
        } else if (shapType == "ellipseRibbon2") {
          var u1, y1, cu1, cy1, q3, q5, u3, y3, q6, q7, cu3, cy3, rh, q8, u2, y2,
            u5, y5, u6, y6, cu4, cy4, cu6, cy6, u7, y7, cu7, cy7;
          u1 = f1 * q2;
          y1 = b - u1;
          cu1 = f1 * cx1;
          cy1 = b - cu1;
          u3 = q5 + dy3;
          y3 = b - u3;
          q6 = dy1 + dy3 - u3;
          q7 = q6 + dy1;
          cu3 = q7 + dy3;
          cy3 = b - cu3;
          u2 = (q8 + rh) / 2;
          y2 = b - u2;
          u5 = q5 + rh;
          y5 = b - u5;
          u6 = u3 + rh;
          y6 = b - u6;
          cu4 = q9 + rh;
          cy4 = b - cu4;
          cu6 = cu3 + rh;
          cy6 = b - cu6;
          u7 = u1 + dy3;
          y7 = b - u7;
          cu7 = q1 + q1 - u7;
          cy7 = b - cu7;
          //
          d_val = "M" + l + "," + b +
            " L" + wd8 + "," + y2 +
            " L" + l + "," + q1 +
            " Q" + cx4 + "," + cy4 + " " + x2 + "," + y5 +
            " L" + x2 + "," + y6 +
            " Q" + hc + "," + cy6 + " " + x5 + "," + y6 +
            " L" + x5 + "," + y5 +
            " Q" + cx5 + "," + cy4 + " " + r + "," + q1 +
            " L" + x6 + "," + y2 +
            " L" + r + "," + b +
            " Q" + cx2 + "," + cy1 + " " + x4 + "," + y1 +
            " L" + x5 + "," + y3 +
            " Q" + hc + "," + cy3 + " " + x2 + "," + y3 +
            " L" + x3 + "," + y1 +
            " Q" + cx1 + "," + cy1 + " " + l + "," + b +
            " z" +
            "M" + x2 + "," + y3 +
            " L" + x2 + "," + y5 +
            "M" + x5 + "," + y5 +
            " L" + x5 + "," + y3 +
            "M" + x3 + "," + y7 +
            " L" + x3 + "," + y1 +
            "M" + x4 + "," + y1 +
            " L" + x4 + "," + y7;
        }
        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "line":
      case "straightConnector1":
      case "bentConnector4":
      case "bentConnector5":
        if (shapType === "bentConnector4" || shapType === "bentConnector5") {
          var connectorPoints = getBentConnectorPoints(shapType, node, w, h);
          result += "<polyline points='" + connectorPoints.map(function (point) { return point[0] + " " + point[1]; }).join(",") +
            "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray +
            "' fill='none' " + getConnectorMarkerAttributes(shpId, headEndNodeAttrs, tailEndNodeAttrs) + "/>";
          break;
        }
      case "curvedConnector2":
      case "curvedConnector3":
      case "curvedConnector4":
      case "curvedConnector5":
        var lineX2 = mapLineSizeToPx(getTextByPathList(slideXfrmNode, [ "a:ext", "attrs", "cx" ]), "x", groupContext, w);
        var lineY2 = mapLineSizeToPx(getTextByPathList(slideXfrmNode, [ "a:ext", "attrs", "cy" ]), "y", groupContext, h);
        // if (isFlipV) {
        //     result += "<line x1='" + w + "' y1='0' x2='0' y2='" + h + "' stroke='" + border.color +
        //         "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' ";
        // } else {
        result += "<line x1='0' y1='0' x2='" + lineX2 + "' y2='" + lineY2 + "' stroke='" + border.color +
          "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' " +
          getConnectorMarkerAttributes(shpId, headEndNodeAttrs, tailEndNodeAttrs);
        //}
        result += "/>";
        break;
      case "rightArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, sAdj1_val = 0.25;//0.5;
        var sAdj2, sAdj2_val = 0.5;
        var max_sAdj2_const = w / h;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              sAdj1_val = 0.5 - (parseInt(sAdj1.substr(4)) / 200000);
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              var sAdj2_val2 = parseInt(sAdj2.substr(4)) / 100000;
              sAdj2_val = 1 - ((sAdj2_val2) / max_sAdj2_const);
            }
          }
        }
        //console.log("w: "+w+"\nh: "+h+"\nsAdj1: "+sAdj1_val+"\nsAdj2: "+sAdj2_val);

        result += " <polygon points='" + w + " " + h / 2 + "," + sAdj2_val * w + " 0," + sAdj2_val * w + " " + sAdj1_val * h + ",0 " + sAdj1_val * h +
          ",0 " + (1 - sAdj1_val) * h + "," + sAdj2_val * w + " " + (1 - sAdj1_val) * h + ", " + sAdj2_val * w + " " + h + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "leftArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, sAdj1_val = 0.25;//0.5;
        var sAdj2, sAdj2_val = 0.5;
        var max_sAdj2_const = w / h;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              sAdj1_val = 0.5 - (parseInt(sAdj1.substr(4)) / 200000);
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              var sAdj2_val2 = parseInt(sAdj2.substr(4)) / 100000;
              sAdj2_val = (sAdj2_val2) / max_sAdj2_const;
            }
          }
        }
        //console.log("w: "+w+"\nh: "+h+"\nsAdj1: "+sAdj1_val+"\nsAdj2: "+sAdj2_val);

        result += " <polygon points='0 " + h / 2 + "," + sAdj2_val * w + " " + h + "," + sAdj2_val * w + " " + (1 - sAdj1_val) * h + "," + w + " " + (1 - sAdj1_val) * h +
          "," + w + " " + sAdj1_val * h + "," + sAdj2_val * w + " " + sAdj1_val * h + ", " + sAdj2_val * w + " 0' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "downArrow":
      case "flowChartOffpageConnector":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, sAdj1_val = 0.25;//0.5;
        var sAdj2, sAdj2_val = 0.5;
        var max_sAdj2_const = h / w;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              sAdj1_val = parseInt(sAdj1.substr(4)) / 200000;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              var sAdj2_val2 = parseInt(sAdj2.substr(4)) / 100000;
              sAdj2_val = (sAdj2_val2) / max_sAdj2_const;
            }
          }
        }

        if (shapType == "flowChartOffpageConnector") {
          sAdj1_val = 0.5;
          sAdj2_val = 0.212;
        }
        result += " <polygon points='" + (0.5 - sAdj1_val) * w + " 0," + (0.5 - sAdj1_val) * w + " " + (1 - sAdj2_val) * h + ",0 " + (1 - sAdj2_val) * h + "," + (w / 2) + " " + h +
          "," + w + " " + (1 - sAdj2_val) * h + "," + (0.5 + sAdj1_val) * w + " " + (1 - sAdj2_val) * h + ", " + (0.5 + sAdj1_val) * w + " 0' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "upArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, sAdj1_val = 0.25;//0.5;
        var sAdj2, sAdj2_val = 0.5;
        var max_sAdj2_const = h / w;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              sAdj1_val = parseInt(sAdj1.substr(4)) / 200000;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              var sAdj2_val2 = parseInt(sAdj2.substr(4)) / 100000;
              sAdj2_val = (sAdj2_val2) / max_sAdj2_const;
            }
          }
        }
        result += " <polygon points='" + (w / 2) + " 0,0 " + sAdj2_val * h + "," + (0.5 - sAdj1_val) * w + " " + sAdj2_val * h + "," + (0.5 - sAdj1_val) * w + " " + h +
          "," + (0.5 + sAdj1_val) * w + " " + h + "," + (0.5 + sAdj1_val) * w + " " + sAdj2_val * h + ", " + w + " " + sAdj2_val * h + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "leftRightArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, sAdj1_val = 0.25;
        var sAdj2, sAdj2_val = 0.25;
        var max_sAdj2_const = w / h;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              sAdj1_val = 0.5 - (parseInt(sAdj1.substr(4)) / 200000);
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              var sAdj2_val2 = parseInt(sAdj2.substr(4)) / 100000;
              sAdj2_val = (sAdj2_val2) / max_sAdj2_const;
            }
          }
        }
        //console.log("w: "+w+"\nh: "+h+"\nsAdj1: "+sAdj1_val+"\nsAdj2: "+sAdj2_val);

        result += " <polygon points='0 " + h / 2 + "," + sAdj2_val * w + " " + h + "," + sAdj2_val * w + " " + (1 - sAdj1_val) * h + "," + (1 - sAdj2_val) * w + " " + (1 - sAdj1_val) * h +
          "," + (1 - sAdj2_val) * w + " " + h + "," + w + " " + h / 2 + ", " + (1 - sAdj2_val) * w + " 0," + (1 - sAdj2_val) * w + " " + sAdj1_val * h + "," +
          sAdj2_val * w + " " + sAdj1_val * h + "," + sAdj2_val * w + " 0' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "upDownArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, sAdj1_val = 0.25;
        var sAdj2, sAdj2_val = 0.25;
        var max_sAdj2_const = h / w;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              sAdj1_val = 0.5 - (parseInt(sAdj1.substr(4)) / 200000);
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              var sAdj2_val2 = parseInt(sAdj2.substr(4)) / 100000;
              sAdj2_val = (sAdj2_val2) / max_sAdj2_const;
            }
          }
        }
        //console.log("w: "+w+"\nh: "+h+"\nsAdj1: "+sAdj1_val+"\nsAdj2: "+sAdj2_val);

        result += " <polygon points='" + w / 2 + " 0,0 " + sAdj2_val * h + "," + sAdj1_val * w + " " + sAdj2_val * h + "," + sAdj1_val * w + " " + (1 - sAdj2_val) * h +
          ",0 " + (1 - sAdj2_val) * h + "," + w / 2 + " " + h + ", " + w + " " + (1 - sAdj2_val) * h + "," + (1 - sAdj1_val) * w + " " + (1 - sAdj2_val) * h + "," +
          (1 - sAdj1_val) * w + " " + sAdj2_val * h + "," + w + " " + sAdj2_val * h + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";
        break;
      case "quadArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 22500 * slideFactor;
        var sAdj2, adj2 = 22500 * slideFactor;
        var sAdj3, adj3 = 22500 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        var cnstVal3 = 200000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * slideFactor;
            }
          }
        }
        var vc = h / 2, hc = w / 2, a1, a2, a3, q1, x1, x2, dx2, x3, dx3, x4, x5, x6, y2, y3, y4, y5, y6, maxAdj1,
          maxAdj3;
        var minWH = Math.min(w, h);
        if (adj2 < 0) a2 = 0
        else if (adj2 > cnstVal1) a2 = cnstVal1
        else a2 = adj2
        maxAdj1 = 2 * a2;
        if (adj1 < 0) a1 = 0
        else if (adj1 > maxAdj1) a1 = maxAdj1
        else a1 = adj1
        q1 = cnstVal2 - maxAdj1;
        maxAdj3 = q1 / 2;
        if (adj3 < 0) a3 = 0
        else if (adj3 > maxAdj3) a3 = maxAdj3
        else a3 = adj3
        x1 = minWH * a3 / cnstVal2;
        dx2 = minWH * a2 / cnstVal2;
        x2 = hc - dx2;
        x5 = hc + dx2;
        dx3 = minWH * a1 / cnstVal3;
        x3 = hc - dx3;
        x4 = hc + dx3;
        x6 = w - x1;
        y2 = vc - dx2;
        y5 = vc + dx2;
        y3 = vc - dx3;
        y4 = vc + dx3;
        y6 = h - x1;
        var d_val = "M" + 0 + "," + vc +
          " L" + x1 + "," + y2 +
          " L" + x1 + "," + y3 +
          " L" + x3 + "," + y3 +
          " L" + x3 + "," + x1 +
          " L" + x2 + "," + x1 +
          " L" + hc + "," + 0 +
          " L" + x5 + "," + x1 +
          " L" + x4 + "," + x1 +
          " L" + x4 + "," + y3 +
          " L" + x6 + "," + y3 +
          " L" + x6 + "," + y2 +
          " L" + w + "," + vc +
          " L" + x6 + "," + y5 +
          " L" + x6 + "," + y4 +
          " L" + x4 + "," + y4 +
          " L" + x4 + "," + y6 +
          " L" + x5 + "," + y6 +
          " L" + hc + "," + h +
          " L" + x2 + "," + y6 +
          " L" + x3 + "," + y6 +
          " L" + x3 + "," + y4 +
          " L" + x1 + "," + y4 +
          " L" + x1 + "," + y5 + " z";

        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "leftRightUpArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 25000 * slideFactor;
        var sAdj2, adj2 = 25000 * slideFactor;
        var sAdj3, adj3 = 25000 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        var cnstVal3 = 200000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * slideFactor;
            }
          }
        }
        var vc = h / 2, hc = w / 2, a1, a2, a3, q1, x1, x2, dx2, x3, dx3, x4, x5, x6, y2, dy2, y3, y4, y5, maxAdj1,
          maxAdj3;
        var minWH = Math.min(w, h);
        if (adj2 < 0) a2 = 0
        else if (adj2 > cnstVal1) a2 = cnstVal1
        else a2 = adj2
        maxAdj1 = 2 * a2;
        if (adj1 < 0) a1 = 0
        else if (adj1 > maxAdj1) a1 = maxAdj1
        else a1 = adj1
        q1 = cnstVal2 - maxAdj1;
        maxAdj3 = q1 / 2;
        if (adj3 < 0) a3 = 0
        else if (adj3 > maxAdj3) a3 = maxAdj3
        else a3 = adj3
        x1 = minWH * a3 / cnstVal2;
        dx2 = minWH * a2 / cnstVal2;
        x2 = hc - dx2;
        x5 = hc + dx2;
        dx3 = minWH * a1 / cnstVal3;
        x3 = hc - dx3;
        x4 = hc + dx3;
        x6 = w - x1;
        dy2 = minWH * a2 / cnstVal1;
        y2 = h - dy2;
        y4 = h - dx2;
        y3 = y4 - dx3;
        y5 = y4 + dx3;
        var d_val = "M" + 0 + "," + y4 +
          " L" + x1 + "," + y2 +
          " L" + x1 + "," + y3 +
          " L" + x3 + "," + y3 +
          " L" + x3 + "," + x1 +
          " L" + x2 + "," + x1 +
          " L" + hc + "," + 0 +
          " L" + x5 + "," + x1 +
          " L" + x4 + "," + x1 +
          " L" + x4 + "," + y3 +
          " L" + x6 + "," + y3 +
          " L" + x6 + "," + y2 +
          " L" + w + "," + y4 +
          " L" + x6 + "," + h +
          " L" + x6 + "," + y5 +
          " L" + x1 + "," + y5 +
          " L" + x1 + "," + h + " z";

        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "leftUpArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 25000 * slideFactor;
        var sAdj2, adj2 = 25000 * slideFactor;
        var sAdj3, adj3 = 25000 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        var cnstVal3 = 200000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * slideFactor;
            }
          }
        }
        var vc = h / 2, hc = w / 2, a1, a2, a3, x1, x2, dx4, dx3, x3, x4, x5, y2, y3, y4, y5, maxAdj1, maxAdj3;
        var minWH = Math.min(w, h);
        if (adj2 < 0) a2 = 0
        else if (adj2 > cnstVal1) a2 = cnstVal1
        else a2 = adj2
        maxAdj1 = 2 * a2;
        if (adj1 < 0) a1 = 0
        else if (adj1 > maxAdj1) a1 = maxAdj1
        else a1 = adj1
        maxAdj3 = cnstVal2 - maxAdj1;
        if (adj3 < 0) a3 = 0
        else if (adj3 > maxAdj3) a3 = maxAdj3
        else a3 = adj3
        x1 = minWH * a3 / cnstVal2;
        dx2 = minWH * a2 / cnstVal1;
        x2 = w - dx2;
        y2 = h - dx2;
        dx4 = minWH * a2 / cnstVal2;
        x4 = w - dx4;
        y4 = h - dx4;
        dx3 = minWH * a1 / cnstVal3;
        x3 = x4 - dx3;
        x5 = x4 + dx3;
        y3 = y4 - dx3;
        y5 = y4 + dx3;
        var d_val = "M" + 0 + "," + y4 +
          " L" + x1 + "," + y2 +
          " L" + x1 + "," + y3 +
          " L" + x3 + "," + y3 +
          " L" + x3 + "," + x1 +
          " L" + x2 + "," + x1 +
          " L" + x4 + "," + 0 +
          " L" + w + "," + x1 +
          " L" + x5 + "," + x1 +
          " L" + x5 + "," + y5 +
          " L" + x1 + "," + y5 +
          " L" + x1 + "," + h + " z";

        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "bentUpArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 25000 * slideFactor;
        var sAdj2, adj2 = 25000 * slideFactor;
        var sAdj3, adj3 = 25000 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        var cnstVal3 = 200000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * slideFactor;
            }
          }
        }
        var vc = h / 2, hc = w / 2, a1, a2, a3, dx1, x1, dx2, x2, dx3, x3, x4, y1, y2, dy2;
        var minWH = Math.min(w, h);
        if (adj1 < 0) a1 = 0
        else if (adj1 > cnstVal1) a1 = cnstVal1
        else a1 = adj1
        if (adj2 < 0) a2 = 0
        else if (adj2 > cnstVal1) a2 = cnstVal1
        else a2 = adj2
        if (adj3 < 0) a3 = 0
        else if (adj3 > maxAdj3) a3 = maxAdj3
        else a3 = adj3
        y1 = minWH * a3 / cnstVal2;
        dx1 = minWH * a2 / cnstVal1;
        x1 = w - dx1;
        dx3 = minWH * a2 / cnstVal2;
        x3 = w - dx3;
        dx2 = minWH * a1 / cnstVal3;
        x2 = x3 - dx2;
        x4 = x3 + dx2;
        dy2 = minWH * a1 / cnstVal2;
        y2 = h - dy2;
        var d_val = "M" + 0 + "," + y2 +
          " L" + x2 + "," + y2 +
          " L" + x2 + "," + y1 +
          " L" + x1 + "," + y1 +
          " L" + x3 + "," + 0 +
          " L" + w + "," + y1 +
          " L" + x4 + "," + y1 +
          " L" + x4 + "," + h +
          " L" + 0 + "," + h + " z";

        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "bentArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 25000 * slideFactor;
        var sAdj2, adj2 = 25000 * slideFactor;
        var sAdj3, adj3 = 25000 * slideFactor;
        var sAdj4, adj4 = 43750 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj4") {
              sAdj4 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj4 = parseInt(sAdj4.substr(4)) * slideFactor;
            }
          }
        }
        var a1, a2, a3, a4, x3, x4, y3, y4, y5, y6, maxAdj1, maxAdj4;
        var minWH = Math.min(w, h);
        if (adj2 < 0) a2 = 0
        else if (adj2 > cnstVal1) a2 = cnstVal1
        else a2 = adj2
        maxAdj1 = 2 * a2;
        if (adj1 < 0) a1 = 0
        else if (adj1 > maxAdj1) a1 = maxAdj1
        else a1 = adj1
        if (adj3 < 0) a3 = 0
        else if (adj3 > cnstVal1) a3 = cnstVal1
        else a3 = adj3
        var th, aw2, th2, dh2, ah, bw, bh, bs, bd, bd3, bd2,
          th = minWH * a1 / cnstVal2;
        aw2 = minWH * a2 / cnstVal2;
        th2 = th / 2;
        dh2 = aw2 - th2;
        ah = minWH * a3 / cnstVal2;
        bw = w - ah;
        bh = h - dh2;
        bs = (bw < bh) ? bw : bh;
        maxAdj4 = cnstVal2 * bs / minWH;
        if (adj4 < 0) a4 = 0
        else if (adj4 > maxAdj4) a4 = maxAdj4
        else a4 = adj4
        bd = minWH * a4 / cnstVal2;
        bd3 = bd - th;
        bd2 = (bd3 > 0) ? bd3 : 0;
        x3 = th + bd2;
        x4 = w - ah;
        y3 = dh2 + th;
        y4 = y3 + dh2;
        y5 = dh2 + bd;
        y6 = y3 + bd2;

        var d_val = "M" + 0 + "," + h +
          " L" + 0 + "," + y5 +
          shapeArc(bd, y5, bd, bd, 180, 270, false).replace("M", "L") +
          " L" + x4 + "," + dh2 +
          " L" + x4 + "," + 0 +
          " L" + w + "," + aw2 +
          " L" + x4 + "," + y4 +
          " L" + x4 + "," + y3 +
          " L" + x3 + "," + y3 +
          shapeArc(x3, y6, bd2, bd2, 270, 180, false).replace("M", "L") +
          " L" + th + "," + h + " z";

        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "uturnArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 25000 * slideFactor;
        var sAdj2, adj2 = 25000 * slideFactor;
        var sAdj3, adj3 = 25000 * slideFactor;
        var sAdj4, adj4 = 43750 * slideFactor;
        var sAdj5, adj5 = 75000 * slideFactor;
        var cnstVal1 = 25000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj4") {
              sAdj4 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj4 = parseInt(sAdj4.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj5") {
              sAdj5 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj5 = parseInt(sAdj5.substr(4)) * slideFactor;
            }
          }
        }
        var a1, a2, a3, a4, a5, q1, q2, q3, x3, x4, x5, x6, x7, x8, x9, y4, y5, minAdj5, maxAdj1, maxAdj3, maxAdj4;
        var minWH = Math.min(w, h);
        if (adj2 < 0) a2 = 0
        else if (adj2 > cnstVal1) a2 = cnstVal1
        else a2 = adj2
        maxAdj1 = 2 * a2;
        if (adj1 < 0) a1 = 0
        else if (adj1 > maxAdj1) a1 = maxAdj1
        else a1 = adj1
        q2 = a1 * minWH / h;
        q3 = cnstVal2 - q2;
        maxAdj3 = q3 * h / minWH;
        if (adj3 < 0) a3 = 0
        else if (adj3 > maxAdj3) a3 = maxAdj3
        else a3 = adj3
        q1 = a3 + a1;
        minAdj5 = q1 * minWH / h;
        if (adj5 < minAdj5) a5 = minAdj5
        else if (adj5 > cnstVal2) a5 = cnstVal2
        else a5 = adj5

        var th, aw2, th2, dh2, ah, bw, bs, bd, bd3, bd2,
          th = minWH * a1 / cnstVal2;
        aw2 = minWH * a2 / cnstVal2;
        th2 = th / 2;
        dh2 = aw2 - th2;
        y5 = h * a5 / cnstVal2;
        ah = minWH * a3 / cnstVal2;
        y4 = y5 - ah;
        x9 = w - dh2;
        bw = x9 / 2;
        bs = (bw < y4) ? bw : y4;
        maxAdj4 = cnstVal2 * bs / minWH;
        if (adj4 < 0) a4 = 0
        else if (adj4 > maxAdj4) a4 = maxAdj4
        else a4 = adj4
        bd = minWH * a4 / cnstVal2;
        bd3 = bd - th;
        bd2 = (bd3 > 0) ? bd3 : 0;
        x3 = th + bd2;
        x8 = w - aw2;
        x6 = x8 - aw2;
        x7 = x6 + dh2;
        x4 = x9 - bd;
        x5 = x7 - bd2;
        const cx = (th + x7) / 2
        const cy = (y4 + th) / 2
        var d_val = "M" + 0 + "," + h +
          " L" + 0 + "," + bd +
          shapeArc(bd, bd, bd, bd, 180, 270, false).replace("M", "L") +
          " L" + x4 + "," + 0 +
          shapeArc(x4, bd, bd, bd, 270, 360, false).replace("M", "L") +
          " L" + x9 + "," + y4 +
          " L" + w + "," + y4 +
          " L" + x8 + "," + y5 +
          " L" + x6 + "," + y4 +
          " L" + x7 + "," + y4 +
          " L" + x7 + "," + x3 +
          shapeArc(x5, x3, bd2, bd2, 0, -90, false).replace("M", "L") +
          " L" + x3 + "," + th +
          shapeArc(x3, x3, bd2, bd2, 270, 180, false).replace("M", "L") +
          " L" + th + "," + h + " z";

        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "stripedRightArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 50000 * slideFactor;
        var sAdj2, adj2 = 50000 * slideFactor;
        var cnstVal1 = 100000 * slideFactor;
        var cnstVal2 = 200000 * slideFactor;
        var cnstVal3 = 84375 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            }
          }
        }
        var a1, a2, x4, x5, dx5, x6, dx6, y1, dy1, y2, maxAdj2, vc = h / 2;
        var minWH = Math.min(w, h);
        maxAdj2 = cnstVal3 * w / minWH;
        if (adj1 < 0) a1 = 0
        else if (adj1 > cnstVal1) a1 = cnstVal1
        else a1 = adj1
        if (adj2 < 0) a2 = 0
        else if (adj2 > maxAdj2) a2 = maxAdj2
        else a2 = adj2
        x4 = minWH * 5 / 32;
        dx5 = minWH * a2 / cnstVal1;
        x5 = w - dx5;
        dy1 = h * a1 / cnstVal2;
        y1 = vc - dy1;
        y2 = vc + dy1;
        //dx6 = dy1*dx5/hd2;
        //x6 = w-dx6;
        var ssd8 = minWH / 8,
          ssd16 = minWH / 16,
          ssd32 = minWH / 32;
        var d_val = "M" + 0 + "," + y1 +
          " L" + ssd32 + "," + y1 +
          " L" + ssd32 + "," + y2 +
          " L" + 0 + "," + y2 + " z" +
          " M" + ssd16 + "," + y1 +
          " L" + ssd8 + "," + y1 +
          " L" + ssd8 + "," + y2 +
          " L" + ssd16 + "," + y2 + " z" +
          " M" + x4 + "," + y1 +
          " L" + x5 + "," + y1 +
          " L" + x5 + "," + 0 +
          " L" + w + "," + vc +
          " L" + x5 + "," + h +
          " L" + x5 + "," + y2 +
          " L" + x4 + "," + y2 + " z";

        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "notchedRightArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 50000 * slideFactor;
        var sAdj2, adj2 = 50000 * slideFactor;
        var cnstVal1 = 100000 * slideFactor;
        var cnstVal2 = 200000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            }
          }
        }
        var a1, a2, x1, x2, dx2, y1, dy1, y2, maxAdj2, vc = h / 2, hd2 = vc;
        var minWH = Math.min(w, h);
        maxAdj2 = cnstVal1 * w / minWH;
        if (adj1 < 0) a1 = 0
        else if (adj1 > cnstVal1) a1 = cnstVal1
        else a1 = adj1
        if (adj2 < 0) a2 = 0
        else if (adj2 > maxAdj2) a2 = maxAdj2
        else a2 = adj2
        dx2 = minWH * a2 / cnstVal1;
        x2 = w - dx2;
        dy1 = h * a1 / cnstVal2;
        y1 = vc - dy1;
        y2 = vc + dy1;
        x1 = dy1 * dx2 / hd2;
        var d_val = "M" + 0 + "," + y1 +
          " L" + x2 + "," + y1 +
          " L" + x2 + "," + 0 +
          " L" + w + "," + vc +
          " L" + x2 + "," + h +
          " L" + x2 + "," + y2 +
          " L" + 0 + "," + y2 +
          " L" + x1 + "," + vc + " z";

        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "homePlate":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var adj = 50000 * slideFactor;
        var cnstVal1 = 100000 * slideFactor;
        if (shapAdjst !== undefined) {
          adj = parseInt(shapAdjst.substr(4)) * slideFactor;
        }
        var a, x1, dx1, maxAdj, vc = h / 2;
        var minWH = Math.min(w, h);
        maxAdj = cnstVal1 * w / minWH;
        if (adj < 0) a = 0
        else if (adj > maxAdj) a = maxAdj
        else a = adj
        dx1 = minWH * a / cnstVal1;
        x1 = w - dx1;
        var d_val = "M" + 0 + "," + 0 +
          " L" + x1 + "," + 0 +
          " L" + w + "," + vc +
          " L" + x1 + "," + h +
          " L" + 0 + "," + h + " z";

        result += "<path  d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "chevron":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var adj = 50000 * slideFactor;
        var cnstVal1 = 100000 * slideFactor;
        if (shapAdjst !== undefined) {
          adj = parseInt(shapAdjst.substr(4)) * slideFactor;
        }
        var a, x1, dx1, x2, maxAdj, vc = h / 2;
        var minWH = Math.min(w, h);
        maxAdj = cnstVal1 * w / minWH;
        if (adj < 0) a = 0
        else if (adj > maxAdj) a = maxAdj
        else a = adj
        x1 = minWH * a / cnstVal1;
        x2 = w - x1;
        var d_val = "M" + 0 + "," + 0 +
          " L" + x2 + "," + 0 +
          " L" + w + "," + vc +
          " L" + x2 + "," + h +
          " L" + 0 + "," + h +
          " L" + x1 + "," + vc + " z";

        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";


        break;
      case "rightArrowCallout":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 25000 * slideFactor;
        var sAdj2, adj2 = 25000 * slideFactor;
        var sAdj3, adj3 = 25000 * slideFactor;
        var sAdj4, adj4 = 64977 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        var cnstVal3 = 200000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj4") {
              sAdj4 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj4 = parseInt(sAdj4.substr(4)) * slideFactor;
            }
          }
        }
        var maxAdj2, a2, maxAdj1, a1, maxAdj3, a3, q2, maxAdj4, a4, dy1, dy2, y1, y2, y3, y4, dx3, x3, x2, x1;
        var vc = h / 2, r = w, b = h, l = 0, t = 0;
        var ss = Math.min(w, h);
        maxAdj2 = cnstVal1 * h / ss;
        a2 = (adj2 < 0) ? 0 : (adj2 > maxAdj2) ? maxAdj2 : adj2;
        maxAdj1 = a2 * 2;
        a1 = (adj1 < 0) ? 0 : (adj1 > maxAdj1) ? maxAdj1 : adj1;
        maxAdj3 = cnstVal2 * w / ss;
        a3 = (adj3 < 0) ? 0 : (adj3 > maxAdj3) ? maxAdj3 : adj3;
        q2 = a3 * ss / w;
        maxAdj4 = cnstVal - q2;
        a4 = (adj4 < 0) ? 0 : (adj4 > maxAdj4) ? maxAdj4 : adj4;
        dy1 = ss * a2 / cnstVal2;
        dy2 = ss * a1 / cnstVal3;
        y1 = vc - dy1;
        y2 = vc - dy2;
        y3 = vc + dy2;
        y4 = vc + dy1;
        dx3 = ss * a3 / cnstVal2;
        x3 = r - dx3;
        x2 = w * a4 / cnstVal2;
        x1 = x2 / 2;
        var d_val = "M" + l + "," + t +
          " L" + x2 + "," + t +
          " L" + x2 + "," + y2 +
          " L" + x3 + "," + y2 +
          " L" + x3 + "," + y1 +
          " L" + r + "," + vc +
          " L" + x3 + "," + y4 +
          " L" + x3 + "," + y3 +
          " L" + x2 + "," + y3 +
          " L" + x2 + "," + b +
          " L" + l + "," + b +
          " z";
        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "downArrowCallout":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 25000 * slideFactor;
        var sAdj2, adj2 = 25000 * slideFactor;
        var sAdj3, adj3 = 25000 * slideFactor;
        var sAdj4, adj4 = 64977 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        var cnstVal3 = 200000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj4") {
              sAdj4 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj4 = parseInt(sAdj4.substr(4)) * slideFactor;
            }
          }
        }
        var maxAdj2, a2, maxAdj1, a1, maxAdj3, a3, q2, maxAdj4, a4, dx1, dx2, x1, x2, x3, x4, dy3, y3, y2, y1;
        var hc = w / 2, r = w, b = h, l = 0, t = 0;
        var ss = Math.min(w, h);

        maxAdj2 = cnstVal1 * w / ss;
        a2 = (adj2 < 0) ? 0 : (adj2 > maxAdj2) ? maxAdj2 : adj2;
        maxAdj1 = a2 * 2;
        a1 = (adj1 < 0) ? 0 : (adj1 > maxAdj1) ? maxAdj1 : adj1;
        maxAdj3 = cnstVal2 * h / ss;
        a3 = (adj3 < 0) ? 0 : (adj3 > maxAdj3) ? maxAdj3 : adj3;
        q2 = a3 * ss / h;
        maxAdj4 = cnstVal2 - q2;
        a4 = (adj4 < 0) ? 0 : (adj4 > maxAdj4) ? maxAdj4 : adj4;
        dx1 = ss * a2 / cnstVal2;
        dx2 = ss * a1 / cnstVal3;
        x1 = hc - dx1;
        x2 = hc - dx2;
        x3 = hc + dx2;
        x4 = hc + dx1;
        dy3 = ss * a3 / cnstVal2;
        y3 = b - dy3;
        y2 = h * a4 / cnstVal2;
        y1 = y2 / 2;
        var d_val = "M" + l + "," + t +
          " L" + r + "," + t +
          " L" + r + "," + y2 +
          " L" + x3 + "," + y2 +
          " L" + x3 + "," + y3 +
          " L" + x4 + "," + y3 +
          " L" + hc + "," + b +
          " L" + x1 + "," + y3 +
          " L" + x2 + "," + y3 +
          " L" + x2 + "," + y2 +
          " L" + l + "," + y2 +
          " z";
        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "leftArrowCallout":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 25000 * slideFactor;
        var sAdj2, adj2 = 25000 * slideFactor;
        var sAdj3, adj3 = 25000 * slideFactor;
        var sAdj4, adj4 = 64977 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        var cnstVal3 = 200000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj4") {
              sAdj4 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj4 = parseInt(sAdj4.substr(4)) * slideFactor;
            }
          }
        }
        var maxAdj2, a2, maxAdj1, a1, maxAdj3, a3, q2, maxAdj4, a4, dy1, dy2, y1, y2, y3, y4, x1, dx2, x2, x3;
        var vc = h / 2, r = w, b = h, l = 0, t = 0;
        var ss = Math.min(w, h);

        maxAdj2 = cnstVal1 * h / ss;
        a2 = (adj2 < 0) ? 0 : (adj2 > maxAdj2) ? maxAdj2 : adj2;
        maxAdj1 = a2 * 2;
        a1 = (adj1 < 0) ? 0 : (adj1 > maxAdj1) ? maxAdj1 : adj1;
        maxAdj3 = cnstVal2 * w / ss;
        a3 = (adj3 < 0) ? 0 : (adj3 > maxAdj3) ? maxAdj3 : adj3;
        q2 = a3 * ss / w;
        maxAdj4 = cnstVal2 - q2;
        a4 = (adj4 < 0) ? 0 : (adj4 > maxAdj4) ? maxAdj4 : adj4;
        dy1 = ss * a2 / cnstVal2;
        dy2 = ss * a1 / cnstVal3;
        y1 = vc - dy1;
        y2 = vc - dy2;
        y3 = vc + dy2;
        y4 = vc + dy1;
        x1 = ss * a3 / cnstVal2;
        dx2 = w * a4 / cnstVal2;
        x2 = r - dx2;
        x3 = (x2 + r) / 2;
        var d_val = "M" + l + "," + vc +
          " L" + x1 + "," + y1 +
          " L" + x1 + "," + y2 +
          " L" + x2 + "," + y2 +
          " L" + x2 + "," + t +
          " L" + r + "," + t +
          " L" + r + "," + b +
          " L" + x2 + "," + b +
          " L" + x2 + "," + y3 +
          " L" + x1 + "," + y3 +
          " L" + x1 + "," + y4 +
          " z";
        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "upArrowCallout":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 25000 * slideFactor;
        var sAdj2, adj2 = 25000 * slideFactor;
        var sAdj3, adj3 = 25000 * slideFactor;
        var sAdj4, adj4 = 64977 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        var cnstVal3 = 200000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj4") {
              sAdj4 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj4 = parseInt(sAdj4.substr(4)) * slideFactor;
            }
          }
        }
        var maxAdj2, a2, maxAdj1, a1, maxAdj3, a3, q2, maxAdj4, a4, dx1, dx2, x1, x2, x3, x4, y1, dy2, y2, y3;
        var hc = w / 2, r = w, b = h, l = 0, t = 0;
        var ss = Math.min(w, h);
        maxAdj2 = cnstVal1 * w / ss;
        a2 = (adj2 < 0) ? 0 : (adj2 > maxAdj2) ? maxAdj2 : adj2;
        maxAdj1 = a2 * 2;
        a1 = (adj1 < 0) ? 0 : (adj1 > maxAdj1) ? maxAdj1 : adj1;
        maxAdj3 = cnstVal2 * h / ss;
        a3 = (adj3 < 0) ? 0 : (adj3 > maxAdj3) ? maxAdj3 : adj3;
        q2 = a3 * ss / h;
        maxAdj4 = cnstVal2 - q2;
        a4 = (adj4 < 0) ? 0 : (adj4 > maxAdj4) ? maxAdj4 : adj4;
        dx1 = ss * a2 / cnstVal2;
        dx2 = ss * a1 / cnstVal3;
        x1 = hc - dx1;
        x2 = hc - dx2;
        x3 = hc + dx2;
        x4 = hc + dx1;
        y1 = ss * a3 / cnstVal2;
        dy2 = h * a4 / cnstVal2;
        y2 = b - dy2;
        y3 = (y2 + b) / 2;

        var d_val = "M" + l + "," + y2 +
          " L" + x2 + "," + y2 +
          " L" + x2 + "," + y1 +
          " L" + x1 + "," + y1 +
          " L" + hc + "," + t +
          " L" + x4 + "," + y1 +
          " L" + x3 + "," + y1 +
          " L" + x3 + "," + y2 +
          " L" + r + "," + y2 +
          " L" + r + "," + b +
          " L" + l + "," + b +
          " z";
        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "leftRightArrowCallout":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 25000 * slideFactor;
        var sAdj2, adj2 = 25000 * slideFactor;
        var sAdj3, adj3 = 25000 * slideFactor;
        var sAdj4, adj4 = 48123 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        var cnstVal3 = 200000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj4") {
              sAdj4 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj4 = parseInt(sAdj4.substr(4)) * slideFactor;
            }
          }
        }
        var maxAdj2, a2, maxAdj1, a1, maxAdj3, a3, q2, maxAdj4, a4, dy1, dy2, y1, y2, y3, y4, x1, x4, dx2, x2, x3;
        var vc = h / 2, hc = w / 2, r = w, b = h, l = 0, t = 0;
        var ss = Math.min(w, h);
        maxAdj2 = cnstVal1 * h / ss;
        a2 = (adj2 < 0) ? 0 : (adj2 > maxAdj2) ? maxAdj2 : adj2;
        maxAdj1 = a2 * 2;
        a1 = (adj1 < 0) ? 0 : (adj1 > maxAdj1) ? maxAdj1 : adj1;
        maxAdj3 = cnstVal1 * w / ss;
        a3 = (adj3 < 0) ? 0 : (adj3 > maxAdj3) ? maxAdj3 : adj3;
        q2 = a3 * ss / wd2;
        maxAdj4 = cnstVal2 - q2;
        a4 = (adj4 < 0) ? 0 : (adj4 > maxAdj4) ? maxAdj4 : adj4;
        dy1 = ss * a2 / cnstVal2;
        dy2 = ss * a1 / cnstVal3;
        y1 = vc - dy1;
        y2 = vc - dy2;
        y3 = vc + dy2;
        y4 = vc + dy1;
        x1 = ss * a3 / cnstVal2;
        x4 = r - x1;
        dx2 = w * a4 / cnstVal3;
        x2 = hc - dx2;
        x3 = hc + dx2;
        var d_val = "M" + l + "," + vc +
          " L" + x1 + "," + y1 +
          " L" + x1 + "," + y2 +
          " L" + x2 + "," + y2 +
          " L" + x2 + "," + t +
          " L" + x3 + "," + t +
          " L" + x3 + "," + y2 +
          " L" + x4 + "," + y2 +
          " L" + x4 + "," + y1 +
          " L" + r + "," + vc +
          " L" + x4 + "," + y4 +
          " L" + x4 + "," + y3 +
          " L" + x3 + "," + y3 +
          " L" + x3 + "," + b +
          " L" + x2 + "," + b +
          " L" + x2 + "," + y3 +
          " L" + x1 + "," + y3 +
          " L" + x1 + "," + y4 +
          " z";
        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "quadArrowCallout":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 18515 * slideFactor;
        var sAdj2, adj2 = 18515 * slideFactor;
        var sAdj3, adj3 = 18515 * slideFactor;
        var sAdj4, adj4 = 48123 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        var cnstVal3 = 200000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj4") {
              sAdj4 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj4 = parseInt(sAdj4.substr(4)) * slideFactor;
            }
          }
        }
        var vc = h / 2, hc = w / 2, r = w, b = h, l = 0, t = 0;
        var ss = Math.min(w, h);
        var a2, maxAdj1, a1, maxAdj3, a3, q2, maxAdj4, a4, dx2, dx3, ah, dx1, dy1, x8, x2, x7, x3, x6, x4, x5, y8, y2,
          y7, y3, y6, y4, y5;
        a2 = (adj2 < 0) ? 0 : (adj2 > cnstVal1) ? cnstVal1 : adj2;
        maxAdj1 = a2 * 2;
        a1 = (adj1 < 0) ? 0 : (adj1 > maxAdj1) ? maxAdj1 : adj1;
        maxAdj3 = cnstVal1 - a2;
        a3 = (adj3 < 0) ? 0 : (adj3 > maxAdj3) ? maxAdj3 : adj3;
        q2 = a3 * 2;
        maxAdj4 = cnstVal2 - q2;
        a4 = (adj4 < a1) ? a1 : (adj4 > maxAdj4) ? maxAdj4 : adj4;
        dx2 = ss * a2 / cnstVal2;
        dx3 = ss * a1 / cnstVal3;
        ah = ss * a3 / cnstVal2;
        dx1 = w * a4 / cnstVal3;
        dy1 = h * a4 / cnstVal3;
        x8 = r - ah;
        x2 = hc - dx1;
        x7 = hc + dx1;
        x3 = hc - dx2;
        x6 = hc + dx2;
        x4 = hc - dx3;
        x5 = hc + dx3;
        y8 = b - ah;
        y2 = vc - dy1;
        y7 = vc + dy1;
        y3 = vc - dx2;
        y6 = vc + dx2;
        y4 = vc - dx3;
        y5 = vc + dx3;
        var d_val = "M" + l + "," + vc +
          " L" + ah + "," + y3 +
          " L" + ah + "," + y4 +
          " L" + x2 + "," + y4 +
          " L" + x2 + "," + y2 +
          " L" + x4 + "," + y2 +
          " L" + x4 + "," + ah +
          " L" + x3 + "," + ah +
          " L" + hc + "," + t +
          " L" + x6 + "," + ah +
          " L" + x5 + "," + ah +
          " L" + x5 + "," + y2 +
          " L" + x7 + "," + y2 +
          " L" + x7 + "," + y4 +
          " L" + x8 + "," + y4 +
          " L" + x8 + "," + y3 +
          " L" + r + "," + vc +
          " L" + x8 + "," + y6 +
          " L" + x8 + "," + y5 +
          " L" + x7 + "," + y5 +
          " L" + x7 + "," + y7 +
          " L" + x5 + "," + y7 +
          " L" + x5 + "," + y8 +
          " L" + x6 + "," + y8 +
          " L" + hc + "," + b +
          " L" + x3 + "," + y8 +
          " L" + x4 + "," + y8 +
          " L" + x4 + "," + y7 +
          " L" + x2 + "," + y7 +
          " L" + x2 + "," + y5 +
          " L" + ah + "," + y5 +
          " L" + ah + "," + y6 +
          " z";

        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "curvedDownArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 25000 * slideFactor;
        var sAdj2, adj2 = 50000 * slideFactor;
        var sAdj3, adj3 = 25000 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * slideFactor;
            }
          }
        }
        var vc = h / 2, hc = w / 2, wd2 = w / 2, r = w, b = h, l = 0, t = 0, c3d4 = 270, cd2 = 180, cd4 = 90;
        var ss = Math.min(w, h);
        var maxAdj2, a2, a1, th, aw, q1, wR, q7, q8, q9, q10, q11, idy, maxAdj3, a3, ah, x3, q2, q3, q4, q5, dx, x5, x7,
          q6, dh, x4, x8, aw2, x6, y1, swAng, mswAng, iy, ix, q12, dang2, stAng, stAng2, swAng2, swAng3;

        maxAdj2 = cnstVal1 * w / ss;
        a2 = (adj2 < 0) ? 0 : (adj2 > maxAdj2) ? maxAdj2 : adj2;
        a1 = (adj1 < 0) ? 0 : (adj1 > cnstVal2) ? cnstVal2 : adj1;
        th = ss * a1 / cnstVal2;
        aw = ss * a2 / cnstVal2;
        q1 = (th + aw) / 4;
        wR = wd2 - q1;
        q7 = wR * 2;
        q8 = q7 * q7;
        q9 = th * th;
        q10 = q8 - q9;
        q11 = Math.sqrt(q10);
        idy = q11 * h / q7;
        maxAdj3 = cnstVal2 * idy / ss;
        a3 = (adj3 < 0) ? 0 : (adj3 > maxAdj3) ? maxAdj3 : adj3;
        ah = ss * adj3 / cnstVal2;
        x3 = wR + th;
        q2 = h * h;
        q3 = ah * ah;
        q4 = q2 - q3;
        q5 = Math.sqrt(q4);
        dx = q5 * wR / h;
        x5 = wR + dx;
        x7 = x3 + dx;
        q6 = aw - th;
        dh = q6 / 2;
        x4 = x5 - dh;
        x8 = x7 + dh;
        aw2 = aw / 2;
        x6 = r - aw2;
        y1 = b - ah;
        swAng = Math.atan(dx / ah);
        var swAngDeg = swAng * 180 / Math.PI;
        mswAng = -swAngDeg;
        iy = b - idy;
        ix = (wR + x3) / 2;
        q12 = th / 2;
        dang2 = Math.atan(q12 / idy);
        var dang2Deg = dang2 * 180 / Math.PI;
        stAng = c3d4 + swAngDeg;
        stAng2 = c3d4 - dang2Deg;
        swAng2 = dang2Deg - cd4;
        swAng3 = cd4 + dang2Deg;
        //var cX = x5 - Math.cos(stAng*Math.PI/180) * wR;
        //var cY = y1 - Math.sin(stAng*Math.PI/180) * h;

        var d_val = "M" + x6 + "," + b +
          " L" + x4 + "," + y1 +
          " L" + x5 + "," + y1 +
          shapeArc(wR, h, wR, h, stAng, (stAng + mswAng), false).replace("M", "L") +
          " L" + x3 + "," + t +
          shapeArc(x3, h, wR, h, c3d4, (c3d4 + swAngDeg), false).replace("M", "L") +
          " L" + (x5 + th) + "," + y1 +
          " L" + x8 + "," + y1 +
          " z" +
          "M" + x3 + "," + t +
          shapeArc(x3, h, wR, h, stAng2, (stAng2 + swAng2), false).replace("M", "L") +
          shapeArc(wR, h, wR, h, cd2, (cd2 + swAng3), false).replace("M", "L");

        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "curvedLeftArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 25000 * slideFactor;
        var sAdj2, adj2 = 50000 * slideFactor;
        var sAdj3, adj3 = 25000 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * slideFactor;
            }
          }
        }
        var vc = h / 2, hc = w / 2, hd2 = h / 2, r = w, b = h, l = 0, t = 0, c3d4 = 270, cd2 = 180, cd4 = 90;
        var ss = Math.min(w, h);
        var maxAdj2, a2, a1, th, aw, q1, hR, q7, q8, q9, q10, q11, iDx, maxAdj3, a3, ah, y3, q2, q3, q4, q5, dy, y5, y7,
          q6, dh, y4, y8, aw2, y6, x1, swAng, mswAng, ix, iy, q12, dang2, swAng2, swAng3, stAng3;

        maxAdj2 = cnstVal1 * h / ss;
        a2 = (adj2 < 0) ? 0 : (adj2 > maxAdj2) ? maxAdj2 : adj2;
        a1 = (adj1 < 0) ? 0 : (adj1 > a2) ? a2 : adj1;
        th = ss * a1 / cnstVal2;
        aw = ss * a2 / cnstVal2;
        q1 = (th + aw) / 4;
        hR = hd2 - q1;
        q7 = hR * 2;
        q8 = q7 * q7;
        q9 = th * th;
        q10 = q8 - q9;
        q11 = Math.sqrt(q10);
        iDx = q11 * w / q7;
        maxAdj3 = cnstVal2 * iDx / ss;
        a3 = (adj3 < 0) ? 0 : (adj3 > maxAdj3) ? maxAdj3 : adj3;
        ah = ss * a3 / cnstVal2;
        y3 = hR + th;
        q2 = w * w;
        q3 = ah * ah;
        q4 = q2 - q3;
        q5 = Math.sqrt(q4);
        dy = q5 * hR / w;
        y5 = hR + dy;
        y7 = y3 + dy;
        q6 = aw - th;
        dh = q6 / 2;
        y4 = y5 - dh;
        y8 = y7 + dh;
        aw2 = aw / 2;
        y6 = b - aw2;
        x1 = l + ah;
        swAng = Math.atan(dy / ah);
        mswAng = -swAng;
        ix = l + iDx;
        iy = (hR + y3) / 2;
        q12 = th / 2;
        dang2 = Math.atan(q12 / iDx);
        swAng2 = dang2 - swAng;
        swAng3 = swAng + dang2;
        stAng3 = -dang2;
        var swAngDg, swAng2Dg, swAng3Dg, stAng3dg;
        swAngDg = swAng * 180 / Math.PI;
        swAng2Dg = swAng2 * 180 / Math.PI;
        swAng3Dg = swAng3 * 180 / Math.PI;
        stAng3dg = stAng3 * 180 / Math.PI;

        var d_val = "M" + r + "," + y3 +
          shapeArc(l, hR, w, hR, 0, -cd4, false).replace("M", "L") +
          " L" + l + "," + t +
          shapeArc(l, y3, w, hR, c3d4, (c3d4 + cd4), false).replace("M", "L") +
          " L" + r + "," + y3 +
          shapeArc(l, y3, w, hR, 0, swAngDg, false).replace("M", "L") +
          " L" + x1 + "," + y7 +
          " L" + x1 + "," + y8 +
          " L" + l + "," + y6 +
          " L" + x1 + "," + y4 +
          " L" + x1 + "," + y5 +
          shapeArc(l, hR, w, hR, swAngDg, (swAngDg + swAng2Dg), false).replace("M", "L") +
          shapeArc(l, hR, w, hR, 0, -cd4, false).replace("M", "L") +
          shapeArc(l, y3, w, hR, c3d4, (c3d4 + cd4), false).replace("M", "L");

        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "curvedRightArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 25000 * slideFactor;
        var sAdj2, adj2 = 50000 * slideFactor;
        var sAdj3, adj3 = 25000 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * slideFactor;
            }
          }
        }
        var vc = h / 2, hc = w / 2, hd2 = h / 2, r = w, b = h, l = 0, t = 0, c3d4 = 270, cd2 = 180, cd4 = 90;
        var ss = Math.min(w, h);
        var maxAdj2, a2, a1, th, aw, q1, hR, q7, q8, q9, q10, q11, iDx, maxAdj3, a3, ah, y3, q2, q3, q4, q5, dy,
          y5, y7, q6, dh, y4, y8, aw2, y6, x1, swAng, stAng, mswAng, ix, iy, q12, dang2, swAng2, swAng3, stAng3;

        maxAdj2 = cnstVal1 * h / ss;
        a2 = (adj2 < 0) ? 0 : (adj2 > maxAdj2) ? maxAdj2 : adj2;
        a1 = (adj1 < 0) ? 0 : (adj1 > a2) ? a2 : adj1;
        th = ss * a1 / cnstVal2;
        aw = ss * a2 / cnstVal2;
        q1 = (th + aw) / 4;
        hR = hd2 - q1;
        q7 = hR * 2;
        q8 = q7 * q7;
        q9 = th * th;
        q10 = q8 - q9;
        q11 = Math.sqrt(q10);
        iDx = q11 * w / q7;
        maxAdj3 = cnstVal2 * iDx / ss;
        a3 = (adj3 < 0) ? 0 : (adj3 > maxAdj3) ? maxAdj3 : adj3;
        ah = ss * a3 / cnstVal2;
        y3 = hR + th;
        q2 = w * w;
        q3 = ah * ah;
        q4 = q2 - q3;
        q5 = Math.sqrt(q4);
        dy = q5 * hR / w;
        y5 = hR + dy;
        y7 = y3 + dy;
        q6 = aw - th;
        dh = q6 / 2;
        y4 = y5 - dh;
        y8 = y7 + dh;
        aw2 = aw / 2;
        y6 = b - aw2;
        x1 = r - ah;
        swAng = Math.atan(dy / ah);
        stAng = Math.PI + 0 - swAng;
        mswAng = -swAng;
        ix = r - iDx;
        iy = (hR + y3) / 2;
        q12 = th / 2;
        dang2 = Math.atan(q12 / iDx);
        swAng2 = dang2 - Math.PI / 2;
        swAng3 = Math.PI / 2 + dang2;
        stAng3 = Math.PI - dang2;

        var stAngDg, mswAngDg, swAngDg, swAng2dg;
        stAngDg = stAng * 180 / Math.PI;
        mswAngDg = mswAng * 180 / Math.PI;
        swAngDg = swAng * 180 / Math.PI;
        swAng2dg = swAng2 * 180 / Math.PI;

        var d_val = "M" + l + "," + hR +
          shapeArc(w, hR, w, hR, cd2, cd2 + mswAngDg, false).replace("M", "L") +
          " L" + x1 + "," + y5 +
          " L" + x1 + "," + y4 +
          " L" + r + "," + y6 +
          " L" + x1 + "," + y8 +
          " L" + x1 + "," + y7 +
          shapeArc(w, y3, w, hR, stAngDg, stAngDg + swAngDg, false).replace("M", "L") +
          " L" + l + "," + hR +
          shapeArc(w, hR, w, hR, cd2, cd2 + cd4, false).replace("M", "L") +
          " L" + r + "," + th +
          shapeArc(w, y3, w, hR, c3d4, c3d4 + swAng2dg, false).replace("M", "L")
        "";
        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "curvedUpArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 25000 * slideFactor;
        var sAdj2, adj2 = 50000 * slideFactor;
        var sAdj3, adj3 = 25000 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = parseInt(sAdj3.substr(4)) * slideFactor;
            }
          }
        }
        var vc = h / 2, hc = w / 2, wd2 = w / 2, r = w, b = h, l = 0, t = 0, c3d4 = 270, cd2 = 180, cd4 = 90;
        var ss = Math.min(w, h);
        var maxAdj2, a2, a1, th, aw, q1, wR, q7, q8, q9, q10, q11, idy, maxAdj3, a3, ah, x3, q2, q3, q4, q5, dx, x5, x7,
          q6, dh, x4, x8, aw2, x6, y1, swAng, mswAng, iy, ix, q12, dang2, swAng2, mswAng2, stAng3, swAng3, stAng2;

        maxAdj2 = cnstVal1 * w / ss;
        a2 = (adj2 < 0) ? 0 : (adj2 > maxAdj2) ? maxAdj2 : adj2;
        a1 = (adj1 < 0) ? 0 : (adj1 > cnstVal2) ? cnstVal2 : adj1;
        th = ss * a1 / cnstVal2;
        aw = ss * a2 / cnstVal2;
        q1 = (th + aw) / 4;
        wR = wd2 - q1;
        q7 = wR * 2;
        q8 = q7 * q7;
        q9 = th * th;
        q10 = q8 - q9;
        q11 = Math.sqrt(q10);
        idy = q11 * h / q7;
        maxAdj3 = cnstVal2 * idy / ss;
        a3 = (adj3 < 0) ? 0 : (adj3 > maxAdj3) ? maxAdj3 : adj3;
        ah = ss * adj3 / cnstVal2;
        x3 = wR + th;
        q2 = h * h;
        q3 = ah * ah;
        q4 = q2 - q3;
        q5 = Math.sqrt(q4);
        dx = q5 * wR / h;
        x5 = wR + dx;
        x7 = x3 + dx;
        q6 = aw - th;
        dh = q6 / 2;
        x4 = x5 - dh;
        x8 = x7 + dh;
        aw2 = aw / 2;
        x6 = r - aw2;
        y1 = t + ah;
        swAng = Math.atan(dx / ah);
        mswAng = -swAng;
        iy = t + idy;
        ix = (wR + x3) / 2;
        q12 = th / 2;
        dang2 = Math.atan(q12 / idy);
        swAng2 = dang2 - swAng;
        mswAng2 = -swAng2;
        stAng3 = Math.PI / 2 - swAng;
        swAng3 = swAng + dang2;
        stAng2 = Math.PI / 2 - dang2;

        var stAng2dg, swAng2dg, swAngDg, swAng2dg;
        stAng2dg = stAng2 * 180 / Math.PI;
        swAng2dg = swAng2 * 180 / Math.PI;
        stAng3dg = stAng3 * 180 / Math.PI;
        swAngDg = swAng * 180 / Math.PI;

        var d_val = //"M" + ix + "," +iy +
          shapeArc(wR, 0, wR, h, stAng2dg, stAng2dg + swAng2dg, false) + //.replace("M","L") +
          " L" + x5 + "," + y1 +
          " L" + x4 + "," + y1 +
          " L" + x6 + "," + t +
          " L" + x8 + "," + y1 +
          " L" + x7 + "," + y1 +
          shapeArc(x3, 0, wR, h, stAng3dg, stAng3dg + swAngDg, false).replace("M", "L") +
          " L" + wR + "," + b +
          shapeArc(wR, 0, wR, h, cd4, cd2, false).replace("M", "L") +
          " L" + th + "," + t +
          shapeArc(x3, 0, wR, h, cd2, cd4, false).replace("M", "L") +
          "";
        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "mathDivide":
      case "mathEqual":
      case "mathMinus":
      case "mathMultiply":
      case "mathNotEqual":
      case "mathPlus":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1;
        var sAdj2, adj2;
        var sAdj3, adj3;
        if (shapAdjst_ary !== undefined) {
          if (shapAdjst_ary.constructor === Array) {
            for (var i = 0; i < shapAdjst_ary.length; i++) {
              var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
              if (sAdj_name == "adj1") {
                sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
                adj1 = parseInt(sAdj1.substr(4));
              } else if (sAdj_name == "adj2") {
                sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
                adj2 = parseInt(sAdj2.substr(4));
              } else if (sAdj_name == "adj3") {
                sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
                adj3 = parseInt(sAdj3.substr(4));
              }
            }
          } else {
            sAdj1 = getTextByPathList(shapAdjst_ary, [ "attrs", "fmla" ]);
            adj1 = parseInt(sAdj1.substr(4));
          }
        }
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        var cnstVal3 = 200000 * slideFactor;
        var dVal;
        var hc = w / 2, vc = h / 2, hd2 = h / 2;
        if (shapType == "mathNotEqual") {
          if (shapAdjst_ary === undefined) {
            adj1 = 23520 * slideFactor;
            adj2 = 110 * Math.PI / 180;
            adj3 = 11760 * slideFactor;
          } else {
            adj1 = adj1 * slideFactor;
            adj2 = (adj2 / 60000) * Math.PI / 180;
            adj3 = adj3 * slideFactor;
          }
          var a1, crAng, a2a1, maxAdj3, a3, dy1, dy2, dx1, x1, x8, y2, y3, y1, y4,
            cadj2, xadj2, len, bhw, bhw2, x7, dx67, x6, dx57, x5, dx47, x4, dx37,
            x3, dx27, x2, rx7, rx6, rx5, rx4, rx3, rx2, dx7, rxt, lxt, rx, lx,
            dy3, dy4, ry, ly, dlx, drx, dly, dry, xC1, xC2, yC1, yC2, yC3, yC4;
          var angVal1 = 70 * Math.PI / 180, angVal2 = 110 * Math.PI / 180;
          var cnstVal4 = 73490 * slideFactor;
          //var cd4 = 90;
          a1 = (adj1 < 0) ? 0 : (adj1 > cnstVal1) ? cnstVal1 : adj1;
          crAng = (adj2 < angVal1) ? angVal1 : (adj2 > angVal2) ? angVal2 : adj2;
          a2a1 = a1 * 2;
          maxAdj3 = cnstVal2 - a2a1;
          a3 = (adj3 < 0) ? 0 : (adj3 > maxAdj3) ? maxAdj3 : adj3;
          dy1 = h * a1 / cnstVal2;
          dy2 = h * a3 / cnstVal3;
          dx1 = w * cnstVal4 / cnstVal3;
          x1 = hc - dx1;
          x8 = hc + dx1;
          y2 = vc - dy2;
          y3 = vc + dy2;
          y1 = y2 - dy1;
          y4 = y3 + dy1;
          cadj2 = crAng - Math.PI / 2;
          xadj2 = hd2 * Math.tan(cadj2);
          len = Math.sqrt(xadj2 * xadj2 + hd2 * hd2);
          bhw = len * dy1 / hd2;
          bhw2 = bhw / 2;
          x7 = hc + xadj2 - bhw2;
          dx67 = xadj2 * y1 / hd2;
          x6 = x7 - dx67;
          dx57 = xadj2 * y2 / hd2;
          x5 = x7 - dx57;
          dx47 = xadj2 * y3 / hd2;
          x4 = x7 - dx47;
          dx37 = xadj2 * y4 / hd2;
          x3 = x7 - dx37;
          dx27 = xadj2 * 2;
          x2 = x7 - dx27;
          rx7 = x7 + bhw;
          rx6 = x6 + bhw;
          rx5 = x5 + bhw;
          rx4 = x4 + bhw;
          rx3 = x3 + bhw;
          rx2 = x2 + bhw;
          dx7 = dy1 * hd2 / len;
          rxt = x7 + dx7;
          lxt = rx7 - dx7;
          rx = (cadj2 > 0) ? rxt : rx7;
          lx = (cadj2 > 0) ? x7 : lxt;
          dy3 = dy1 * xadj2 / len;
          dy4 = -dy3;
          ry = (cadj2 > 0) ? dy3 : 0;
          ly = (cadj2 > 0) ? 0 : dy4;
          dlx = w - rx;
          drx = w - lx;
          dly = h - ry;
          dry = h - ly;
          xC1 = (rx + lx) / 2;
          xC2 = (drx + dlx) / 2;
          yC1 = (ry + ly) / 2;
          yC2 = (y1 + y2) / 2;
          yC3 = (y3 + y4) / 2;
          yC4 = (dry + dly) / 2;

          dVal = "M" + x1 + "," + y1 +
            " L" + x6 + "," + y1 +
            " L" + lx + "," + ly +
            " L" + rx + "," + ry +
            " L" + rx6 + "," + y1 +
            " L" + x8 + "," + y1 +
            " L" + x8 + "," + y2 +
            " L" + rx5 + "," + y2 +
            " L" + rx4 + "," + y3 +
            " L" + x8 + "," + y3 +
            " L" + x8 + "," + y4 +
            " L" + rx3 + "," + y4 +
            " L" + drx + "," + dry +
            " L" + dlx + "," + dly +
            " L" + x3 + "," + y4 +
            " L" + x1 + "," + y4 +
            " L" + x1 + "," + y3 +
            " L" + x4 + "," + y3 +
            " L" + x5 + "," + y2 +
            " L" + x1 + "," + y2 +
            " z";
        } else if (shapType == "mathDivide") {
          if (shapAdjst_ary === undefined) {
            adj1 = 23520 * slideFactor;
            adj2 = 5880 * slideFactor;
            adj3 = 11760 * slideFactor;
          } else {
            adj1 = adj1 * slideFactor;
            adj2 = adj2 * slideFactor;
            adj3 = adj3 * slideFactor;
          }
          var a1, ma1, ma3h, ma3w, maxAdj3, a3, m4a3, maxAdj2, a2, dy1, yg, rad, dx1,
            y3, y4, a, y2, y1, y5, x1, x3, x2;
          var cnstVal4 = 1000 * slideFactor;
          var cnstVal5 = 36745 * slideFactor;
          var cnstVal6 = 73490 * slideFactor;
          a1 = (adj1 < cnstVal4) ? cnstVal4 : (adj1 > cnstVal5) ? cnstVal5 : adj1;
          ma1 = -a1;
          ma3h = (cnstVal6 + ma1) / 4;
          ma3w = cnstVal5 * w / h;
          maxAdj3 = (ma3h < ma3w) ? ma3h : ma3w;
          a3 = (adj3 < cnstVal4) ? cnstVal4 : (adj3 > maxAdj3) ? maxAdj3 : adj3;
          m4a3 = -4 * a3;
          maxAdj2 = cnstVal6 + m4a3 - a1;
          a2 = (adj2 < 0) ? 0 : (adj2 > maxAdj2) ? maxAdj2 : adj2;
          dy1 = h * a1 / cnstVal3;
          yg = h * a2 / cnstVal2;
          rad = h * a3 / cnstVal2;
          dx1 = w * cnstVal6 / cnstVal3;
          y3 = vc - dy1;
          y4 = vc + dy1;
          a = yg + rad;
          y2 = y3 - a;
          y1 = y2 - rad;
          y5 = h - y1;
          x1 = hc - dx1;
          x3 = hc + dx1;
          x2 = hc - rad;
          var cd4 = 90, c3d4 = 270;
          var cX1 = hc - Math.cos(c3d4 * Math.PI / 180) * rad;
          var cY1 = y1 - Math.sin(c3d4 * Math.PI / 180) * rad;
          var cX2 = hc - Math.cos(Math.PI / 2) * rad;
          var cY2 = y5 - Math.sin(Math.PI / 2) * rad;
          dVal = "M" + hc + "," + y1 +
            shapeArc(cX1, cY1, rad, rad, c3d4, c3d4 + 360, false).replace("M", "L") +
            " z" +
            " M" + hc + "," + y5 +
            shapeArc(cX2, cY2, rad, rad, cd4, cd4 + 360, false).replace("M", "L") +
            " z" +
            " M" + x1 + "," + y3 +
            " L" + x3 + "," + y3 +
            " L" + x3 + "," + y4 +
            " L" + x1 + "," + y4 +
            " z";
        } else if (shapType == "mathEqual") {
          if (shapAdjst_ary === undefined) {
            adj1 = 23520 * slideFactor;
            adj2 = 11760 * slideFactor;
          } else {
            adj1 = adj1 * slideFactor;
            adj2 = adj2 * slideFactor;
          }
          var cnstVal5 = 36745 * slideFactor;
          var cnstVal6 = 73490 * slideFactor;
          var a1, a2a1, mAdj2, a2, dy1, dy2, dx1, y2, y3, y1, y4, x1, x2, yC1, yC2;

          a1 = (adj1 < 0) ? 0 : (adj1 > cnstVal5) ? cnstVal5 : adj1;
          a2a1 = a1 * 2;
          mAdj2 = cnstVal2 - a2a1;
          a2 = (adj2 < 0) ? 0 : (adj2 > mAdj2) ? mAdj2 : adj2;
          dy1 = h * a1 / cnstVal2;
          dy2 = h * a2 / cnstVal3;
          dx1 = w * cnstVal6 / cnstVal3;
          y2 = vc - dy2;
          y3 = vc + dy2;
          y1 = y2 - dy1;
          y4 = y3 + dy1;
          x1 = hc - dx1;
          x2 = hc + dx1;
          yC1 = (y1 + y2) / 2;
          yC2 = (y3 + y4) / 2;
          dVal = "M" + x1 + "," + y1 +
            " L" + x2 + "," + y1 +
            " L" + x2 + "," + y2 +
            " L" + x1 + "," + y2 +
            " z" +
            "M" + x1 + "," + y3 +
            " L" + x2 + "," + y3 +
            " L" + x2 + "," + y4 +
            " L" + x1 + "," + y4 +
            " z";
        } else if (shapType == "mathMinus") {
          if (shapAdjst_ary === undefined) {
            adj1 = 23520 * slideFactor;
          } else {
            adj1 = adj1 * slideFactor;
          }
          var cnstVal6 = 73490 * slideFactor;
          var a1, dy1, dx1, y1, y2, x1, x2;
          a1 = (adj1 < 0) ? 0 : (adj1 > cnstVal2) ? cnstVal2 : adj1;
          dy1 = h * a1 / cnstVal3;
          dx1 = w * cnstVal6 / cnstVal3;
          y1 = vc - dy1;
          y2 = vc + dy1;
          x1 = hc - dx1;
          x2 = hc + dx1;

          dVal = "M" + x1 + "," + y1 +
            " L" + x2 + "," + y1 +
            " L" + x2 + "," + y2 +
            " L" + x1 + "," + y2 +
            " z";
        } else if (shapType == "mathMultiply") {
          if (shapAdjst_ary === undefined) {
            adj1 = 23520 * slideFactor;
          } else {
            adj1 = adj1 * slideFactor;
          }
          var cnstVal6 = 51965 * slideFactor;
          var a1, th, a, sa, ca, ta, dl, rw, lM, xM, yM, dxAM, dyAM,
            xA, yA, xB, yB, xBC, yBC, yC, xD, xE, yFE, xFE, xF, xL, yG, yH, yI, xC2, yC3;
          var ss = Math.min(w, h);
          a1 = (adj1 < 0) ? 0 : (adj1 > cnstVal6) ? cnstVal6 : adj1;
          th = ss * a1 / cnstVal2;
          a = Math.atan(h / w);
          sa = 1 * Math.sin(a);
          ca = 1 * Math.cos(a);
          ta = 1 * Math.tan(a);
          dl = Math.sqrt(w * w + h * h);
          rw = dl * cnstVal6 / cnstVal2;
          lM = dl - rw;
          xM = ca * lM / 2;
          yM = sa * lM / 2;
          dxAM = sa * th / 2;
          dyAM = ca * th / 2;
          xA = xM - dxAM;
          yA = yM + dyAM;
          xB = xM + dxAM;
          yB = yM - dyAM;
          xBC = hc - xB;
          yBC = xBC * ta;
          yC = yBC + yB;
          xD = w - xB;
          xE = w - xA;
          yFE = vc - yA;
          xFE = yFE / ta;
          xF = xE - xFE;
          xL = xA + xFE;
          yG = h - yA;
          yH = h - yB;
          yI = h - yC;
          xC2 = w - xM;
          yC3 = h - yM;

          dVal = "M" + xA + "," + yA +
            " L" + xB + "," + yB +
            " L" + hc + "," + yC +
            " L" + xD + "," + yB +
            " L" + xE + "," + yA +
            " L" + xF + "," + vc +
            " L" + xE + "," + yG +
            " L" + xD + "," + yH +
            " L" + hc + "," + yI +
            " L" + xB + "," + yH +
            " L" + xA + "," + yG +
            " L" + xL + "," + vc +
            " z";
        } else if (shapType == "mathPlus") {
          if (shapAdjst_ary === undefined) {
            adj1 = 23520 * slideFactor;
          } else {
            adj1 = adj1 * slideFactor;
          }
          var cnstVal6 = 73490 * slideFactor;
          var ss = Math.min(w, h);
          var a1, dx1, dy1, dx2, x1, x2, x3, x4, y1, y2, y3, y4;

          a1 = (adj1 < 0) ? 0 : (adj1 > cnstVal6) ? cnstVal6 : adj1;
          dx1 = w * cnstVal6 / cnstVal3;
          dy1 = h * cnstVal6 / cnstVal3;
          dx2 = ss * a1 / cnstVal3;
          x1 = hc - dx1;
          x2 = hc - dx2;
          x3 = hc + dx2;
          x4 = hc + dx1;
          y1 = vc - dy1;
          y2 = vc - dx2;
          y3 = vc + dx2;
          y4 = vc + dy1;

          dVal = "M" + x1 + "," + y2 +
            " L" + x2 + "," + y2 +
            " L" + x2 + "," + y1 +
            " L" + x3 + "," + y1 +
            " L" + x3 + "," + y2 +
            " L" + x4 + "," + y2 +
            " L" + x4 + "," + y3 +
            " L" + x3 + "," + y3 +
            " L" + x3 + "," + y4 +
            " L" + x2 + "," + y4 +
            " L" + x2 + "," + y3 +
            " L" + x1 + "," + y3 +
            " z";
        }
        result += "<path d='" + dVal + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        //console.log(shapType);
        break;
      case "can":
      case "flowChartMagneticDisk":
      case "flowChartMagneticDrum":
        var shapAdjst = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd", "attrs", "fmla" ]);
        var adj = 25000 * slideFactor;
        var cnstVal1 = 50000 * slideFactor;
        var cnstVal2 = 200000 * slideFactor;
        if (shapAdjst !== undefined) {
          adj = parseInt(shapAdjst.substr(4)) * slideFactor;
        }
        var ss = Math.min(w, h);
        var maxAdj, a, y1, y2, y3, dVal;
        if (shapType == "flowChartMagneticDisk" || shapType == "flowChartMagneticDrum") {
          adj = 50000 * slideFactor;
        }
        maxAdj = cnstVal1 * h / ss;
        a = (adj < 0) ? 0 : (adj > maxAdj) ? maxAdj : adj;
        y1 = ss * a / cnstVal2;
        y2 = y1 + y1;
        y3 = h - y1;
        var cd2 = 180, wd2 = w / 2;

        var tranglRott = "";
        if (shapType == "flowChartMagneticDrum") {
          tranglRott = "transform='rotate(90 " + w / 2 + "," + h / 2 + ")'";
        }
        dVal = shapeArc(wd2, y1, wd2, y1, 0, cd2, false) +
          shapeArc(wd2, y1, wd2, y1, cd2, cd2 + cd2, false).replace("M", "L") +
          " L" + w + "," + y3 +
          shapeArc(wd2, y3, wd2, y1, 0, cd2, false).replace("M", "L") +
          " L" + 0 + "," + y1;

        result += "<path " + tranglRott + " d='" + dVal + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "swooshArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var refr = slideFactor;
        var sAdj1, adj1 = 25000 * refr;
        var sAdj2, adj2 = 16667 * refr;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * refr;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = parseInt(sAdj2.substr(4)) * refr;
            }
          }
        }
        var cnstVal1 = 1 * refr;
        var cnstVal2 = 70000 * refr;
        var cnstVal3 = 75000 * refr;
        var cnstVal4 = 100000 * refr;
        var ss = Math.min(w, h);
        var ssd8 = ss / 8;
        var hd6 = h / 6;

        var a1, maxAdj2, a2, ad1, ad2, xB, yB, alfa, dx0, xC, dx1, yF, xF, xE, yE, dy2, dy22, dy3, yD, dy4, yP1, xP1,
          dy5, yP2, xP2;

        a1 = (adj1 < cnstVal1) ? cnstVal1 : (adj1 > cnstVal3) ? cnstVal3 : adj1;
        maxAdj2 = cnstVal2 * w / ss;
        a2 = (adj2 < 0) ? 0 : (adj2 > maxAdj2) ? maxAdj2 : adj2;
        ad1 = h * a1 / cnstVal4;
        ad2 = ss * a2 / cnstVal4;
        xB = w - ad2;
        yB = ssd8;
        alfa = (Math.PI / 2) / 14;
        dx0 = ssd8 * Math.tan(alfa);
        xC = xB - dx0;
        dx1 = ad1 * Math.tan(alfa);
        yF = yB + ad1;
        xF = xB + dx1;
        xE = xF + dx0;
        yE = yF + ssd8;
        dy2 = yE - 0;
        dy22 = dy2 / 2;
        dy3 = h / 20;
        yD = dy22 - dy3;
        dy4 = hd6;
        yP1 = hd6 + dy4;
        xP1 = w / 6;
        dy5 = hd6 / 2;
        yP2 = yF + dy5;
        xP2 = w / 4;

        var dVal = "M" + 0 + "," + h +
          " Q" + xP1 + "," + yP1 + " " + xB + "," + yB +
          " L" + xC + "," + 0 +
          " L" + w + "," + yD +
          " L" + xE + "," + yE +
          " L" + xF + "," + yF +
          " Q" + xP2 + "," + yP2 + " " + 0 + "," + h +
          " z";

        result += "<path d='" + dVal + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "circularArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 12500 * slideFactor;
        var sAdj2, adj2 = (1142319 / 60000) * Math.PI / 180;
        var sAdj3, adj3 = (20457681 / 60000) * Math.PI / 180;
        var sAdj4, adj4 = (10800000 / 60000) * Math.PI / 180;
        var sAdj5, adj5 = 12500 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = (parseInt(sAdj2.substr(4)) / 60000) * Math.PI / 180;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = (parseInt(sAdj3.substr(4)) / 60000) * Math.PI / 180;
            } else if (sAdj_name == "adj4") {
              sAdj4 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj4 = (parseInt(sAdj4.substr(4)) / 60000) * Math.PI / 180;
            } else if (sAdj_name == "adj5") {
              sAdj5 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj5 = parseInt(sAdj5.substr(4)) * slideFactor;
            }
          }
        }
        var vc = h / 2, hc = w / 2, r = w, b = h, l = 0, t = 0, wd2 = w / 2, hd2 = h / 2;
        var ss = Math.min(w, h);
        var a5, maxAdj1, a1, enAng, stAng, th, thh, th2, rw1, rh1, rw2, rh2, rw3, rh3, wtH, htH, dxH,
          dyH, xH, yH, rI, u1, u2, u3, u4, u5, u6, u7, u8, u9, u10, u11, u12, u13, u14, u15, u16, u17,
          u18, u19, u20, u21, maxAng, aAng, ptAng, wtA, htA, dxA, dyA, xA, yA, wtE, htE, dxE, dyE, xE, yE,
          dxG, dyG, xG, yG, dxB, dyB, xB, yB, sx1, sy1, sx2, sy2, rO, x1O, y1O, x2O, y2O, dxO, dyO, dO,
          q1, q2, DO, q3, q4, q5, q6, q7, q8, sdelO, ndyO, sdyO, q9, q10, q11, dxF1, q12, dxF2, adyO,
          q13, q14, dyF1, q15, dyF2, q16, q17, q18, q19, q20, q21, q22, dxF, dyF, sdxF, sdyF, xF, yF,
          x1I, y1I, x2I, y2I, dxI, dyI, dI, v1, v2, DI, v3, v4, v5, v6, v7, v8, sdelI, v9, v10, v11,
          dxC1, v12, dxC2, adyI, v13, v14, dyC1, v15, dyC2, v16, v17, v18, v19, v20, v21, v22, dxC, dyC,
          sdxC, sdyC, xC, yC, ist0, ist1, istAng, isw1, isw2, iswAng, p1, p2, p3, p4, p5, xGp, yGp,
          xBp, yBp, en0, en1, en2, sw0, sw1, swAng;
        var cnstVal1 = 25000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        var rdAngVal1 = (1 / 60000) * Math.PI / 180;
        var rdAngVal2 = (21599999 / 60000) * Math.PI / 180;
        var rdAngVal3 = 2 * Math.PI;

        a5 = (adj5 < 0) ? 0 : (adj5 > cnstVal1) ? cnstVal1 : adj5;
        maxAdj1 = a5 * 2;
        a1 = (adj1 < 0) ? 0 : (adj1 > maxAdj1) ? maxAdj1 : adj1;
        enAng = (adj3 < rdAngVal1) ? rdAngVal1 : (adj3 > rdAngVal2) ? rdAngVal2 : adj3;
        stAng = (adj4 < 0) ? 0 : (adj4 > rdAngVal2) ? rdAngVal2 : adj4; //////////////////////////////////////////
        th = ss * a1 / cnstVal2;
        thh = ss * a5 / cnstVal2;
        th2 = th / 2;
        rw1 = wd2 + th2 - thh;
        rh1 = hd2 + th2 - thh;
        rw2 = rw1 - th;
        rh2 = rh1 - th;
        rw3 = rw2 + th2;
        rh3 = rh2 + th2;
        wtH = rw3 * Math.sin(enAng);
        htH = rh3 * Math.cos(enAng);

        //dxH = rw3*Math.cos(Math.atan(wtH/htH));
        //dyH = rh3*Math.sin(Math.atan(wtH/htH));
        dxH = rw3 * Math.cos(Math.atan2(wtH, htH));
        dyH = rh3 * Math.sin(Math.atan2(wtH, htH));

        xH = hc + dxH;
        yH = vc + dyH;
        rI = (rw2 < rh2) ? rw2 : rh2;
        u1 = dxH * dxH;
        u2 = dyH * dyH;
        u3 = rI * rI;
        u4 = u1 - u3;
        u5 = u2 - u3;
        u6 = u4 * u5 / u1;
        u7 = u6 / u2;
        u8 = 1 - u7;
        u9 = Math.sqrt(u8);
        u10 = u4 / dxH;
        u11 = u10 / dyH;
        u12 = (1 + u9) / u11;

        //u13 = Math.atan(u12/1);
        u13 = Math.atan2(u12, 1);

        u14 = u13 + rdAngVal3;
        u15 = (u13 > 0) ? u13 : u14;
        u16 = u15 - enAng;
        u17 = u16 + rdAngVal3;
        u18 = (u16 > 0) ? u16 : u17;
        u19 = u18 - cd2;
        u20 = u18 - rdAngVal3;
        u21 = (u19 > 0) ? u20 : u18;
        maxAng = Math.abs(u21);
        aAng = (adj2 < 0) ? 0 : (adj2 > maxAng) ? maxAng : adj2;
        ptAng = enAng + aAng;
        wtA = rw3 * Math.sin(ptAng);
        htA = rh3 * Math.cos(ptAng);
        //dxA = rw3*Math.cos(Math.atan(wtA/htA));
        //dyA = rh3*Math.sin(Math.atan(wtA/htA));
        dxA = rw3 * Math.cos(Math.atan2(wtA, htA));
        dyA = rh3 * Math.sin(Math.atan2(wtA, htA));

        xA = hc + dxA;
        yA = vc + dyA;
        wtE = rw1 * Math.sin(stAng);
        htE = rh1 * Math.cos(stAng);

        //dxE = rw1*Math.cos(Math.atan(wtE/htE));
        //dyE = rh1*Math.sin(Math.atan(wtE/htE));
        dxE = rw1 * Math.cos(Math.atan2(wtE, htE));
        dyE = rh1 * Math.sin(Math.atan2(wtE, htE));

        xE = hc + dxE;
        yE = vc + dyE;
        dxG = thh * Math.cos(ptAng);
        dyG = thh * Math.sin(ptAng);
        xG = xH + dxG;
        yG = yH + dyG;
        dxB = thh * Math.cos(ptAng);
        dyB = thh * Math.sin(ptAng);
        xB = xH - dxB;
        yB = yH - dyB;
        sx1 = xB - hc;
        sy1 = yB - vc;
        sx2 = xG - hc;
        sy2 = yG - vc;
        rO = (rw1 < rh1) ? rw1 : rh1;
        x1O = sx1 * rO / rw1;
        y1O = sy1 * rO / rh1;
        x2O = sx2 * rO / rw1;
        y2O = sy2 * rO / rh1;
        dxO = x2O - x1O;
        dyO = y2O - y1O;
        dO = Math.sqrt(dxO * dxO + dyO * dyO);
        q1 = x1O * y2O;
        q2 = x2O * y1O;
        DO = q1 - q2;
        q3 = rO * rO;
        q4 = dO * dO;
        q5 = q3 * q4;
        q6 = DO * DO;
        q7 = q5 - q6;
        q8 = (q7 > 0) ? q7 : 0;
        sdelO = Math.sqrt(q8);
        ndyO = dyO * -1;
        sdyO = (ndyO > 0) ? -1 : 1;
        q9 = sdyO * dxO;
        q10 = q9 * sdelO;
        q11 = DO * dyO;
        dxF1 = (q11 + q10) / q4;
        q12 = q11 - q10;
        dxF2 = q12 / q4;
        adyO = Math.abs(dyO);
        q13 = adyO * sdelO;
        q14 = DO * dxO / -1;
        dyF1 = (q14 + q13) / q4;
        q15 = q14 - q13;
        dyF2 = q15 / q4;
        q16 = x2O - dxF1;
        q17 = x2O - dxF2;
        q18 = y2O - dyF1;
        q19 = y2O - dyF2;
        q20 = Math.sqrt(q16 * q16 + q18 * q18);
        q21 = Math.sqrt(q17 * q17 + q19 * q19);
        q22 = q21 - q20;
        dxF = (q22 > 0) ? dxF1 : dxF2;
        dyF = (q22 > 0) ? dyF1 : dyF2;
        sdxF = dxF * rw1 / rO;
        sdyF = dyF * rh1 / rO;
        xF = hc + sdxF;
        yF = vc + sdyF;
        x1I = sx1 * rI / rw2;
        y1I = sy1 * rI / rh2;
        x2I = sx2 * rI / rw2;
        y2I = sy2 * rI / rh2;
        dxI = x2I - x1I;
        dyI = y2I - y1I;
        dI = Math.sqrt(dxI * dxI + dyI * dyI);
        v1 = x1I * y2I;
        v2 = x2I * y1I;
        DI = v1 - v2;
        v3 = rI * rI;
        v4 = dI * dI;
        v5 = v3 * v4;
        v6 = DI * DI;
        v7 = v5 - v6;
        v8 = (v7 > 0) ? v7 : 0;
        sdelI = Math.sqrt(v8);
        v9 = sdyO * dxI;
        v10 = v9 * sdelI;
        v11 = DI * dyI;
        dxC1 = (v11 + v10) / v4;
        v12 = v11 - v10;
        dxC2 = v12 / v4;
        adyI = Math.abs(dyI);
        v13 = adyI * sdelI;
        v14 = DI * dxI / -1;
        dyC1 = (v14 + v13) / v4;
        v15 = v14 - v13;
        dyC2 = v15 / v4;
        v16 = x1I - dxC1;
        v17 = x1I - dxC2;
        v18 = y1I - dyC1;
        v19 = y1I - dyC2;
        v20 = Math.sqrt(v16 * v16 + v18 * v18);
        v21 = Math.sqrt(v17 * v17 + v19 * v19);
        v22 = v21 - v20;
        dxC = (v22 > 0) ? dxC1 : dxC2;
        dyC = (v22 > 0) ? dyC1 : dyC2;
        sdxC = dxC * rw2 / rI;
        sdyC = dyC * rh2 / rI;
        xC = hc + sdxC;
        yC = vc + sdyC;

        //ist0 = Math.atan(sdyC/sdxC);
        ist0 = Math.atan2(sdyC, sdxC);

        ist1 = ist0 + rdAngVal3;
        istAng = (ist0 > 0) ? ist0 : ist1;
        isw1 = stAng - istAng;
        isw2 = isw1 - rdAngVal3;
        iswAng = (isw1 > 0) ? isw2 : isw1;
        p1 = xF - xC;
        p2 = yF - yC;
        p3 = Math.sqrt(p1 * p1 + p2 * p2);
        p4 = p3 / 2;
        p5 = p4 - thh;
        xGp = (p5 > 0) ? xF : xG;
        yGp = (p5 > 0) ? yF : yG;
        xBp = (p5 > 0) ? xC : xB;
        yBp = (p5 > 0) ? yC : yB;

        //en0 = Math.atan(sdyF/sdxF);
        en0 = Math.atan2(sdyF, sdxF);

        en1 = en0 + rdAngVal3;
        en2 = (en0 > 0) ? en0 : en1;
        sw0 = en2 - stAng;
        sw1 = sw0 + rdAngVal3;
        swAng = (sw0 > 0) ? sw0 : sw1;

        var strtAng = stAng * 180 / Math.PI
        var endAng = strtAng + (swAng * 180 / Math.PI);
        var stiAng = istAng * 180 / Math.PI;
        var swiAng = iswAng * 180 / Math.PI;
        var ediAng = stiAng + swiAng;

        var d_val = shapeArc(w / 2, h / 2, rw1, rh1, strtAng, endAng, false) +
          " L" + xGp + "," + yGp +
          " L" + xA + "," + yA +
          " L" + xBp + "," + yBp +
          " L" + xC + "," + yC +
          shapeArc(w / 2, h / 2, rw2, rh2, stiAng, ediAng, false).replace("M", "L") +
          " z";
        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "leftCircularArrow":
        var shapAdjst_ary = getTextByPathList(node, [ "p:spPr", "a:prstGeom", "a:avLst", "a:gd" ]);
        var sAdj1, adj1 = 12500 * slideFactor;
        var sAdj2, adj2 = (-1142319 / 60000) * Math.PI / 180;
        var sAdj3, adj3 = (1142319 / 60000) * Math.PI / 180;
        var sAdj4, adj4 = (10800000 / 60000) * Math.PI / 180;
        var sAdj5, adj5 = 12500 * slideFactor;
        if (shapAdjst_ary !== undefined) {
          for (var i = 0; i < shapAdjst_ary.length; i++) {
            var sAdj_name = getTextByPathList(shapAdjst_ary[i], [ "attrs", "name" ]);
            if (sAdj_name == "adj1") {
              sAdj1 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj1 = parseInt(sAdj1.substr(4)) * slideFactor;
            } else if (sAdj_name == "adj2") {
              sAdj2 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj2 = (parseInt(sAdj2.substr(4)) / 60000) * Math.PI / 180;
            } else if (sAdj_name == "adj3") {
              sAdj3 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj3 = (parseInt(sAdj3.substr(4)) / 60000) * Math.PI / 180;
            } else if (sAdj_name == "adj4") {
              sAdj4 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj4 = (parseInt(sAdj4.substr(4)) / 60000) * Math.PI / 180;
            } else if (sAdj_name == "adj5") {
              sAdj5 = getTextByPathList(shapAdjst_ary[i], [ "attrs", "fmla" ]);
              adj5 = parseInt(sAdj5.substr(4)) * slideFactor;
            }
          }
        }
        var vc = h / 2, hc = w / 2, r = w, b = h, l = 0, t = 0, wd2 = w / 2, hd2 = h / 2;
        var ss = Math.min(w, h);
        var cnstVal1 = 25000 * slideFactor;
        var cnstVal2 = 100000 * slideFactor;
        var rdAngVal1 = (1 / 60000) * Math.PI / 180;
        var rdAngVal2 = (21599999 / 60000) * Math.PI / 180;
        var rdAngVal3 = 2 * Math.PI;
        var a5, maxAdj1, a1, enAng, stAng, th, thh, th2, rw1, rh1, rw2, rh2, rw3, rh3, wtH, htH, dxH, dyH, xH, yH, rI,
          u1, u2, u3, u4, u5, u6, u7, u8, u9, u10, u11, u12, u13, u14, u15, u16, u17, u18, u19, u20, u21, u22,
          minAng, u23, a2, aAng, ptAng, wtA, htA, dxA, dyA, xA, yA, wtE, htE, dxE, dyE, xE, yE, wtD, htD, dxD, dyD,
          xD, yD, dxG, dyG, xG, yG, dxB, dyB, xB, yB, sx1, sy1, sx2, sy2, rO, x1O, y1O, x2O, y2O, dxO, dyO, dO,
          q1, q2, DO, q3, q4, q5, q6, q7, q8, sdelO, ndyO, sdyO, q9, q10, q11, dxF1, q12, dxF2, adyO, q13, q14, dyF1,
          q15, dyF2, q16, q17, q18, q19, q20, q21, q22, dxF, dyF, sdxF, sdyF, xF, yF, x1I, y1I, x2I, y2I, dxI, dyI, dI,
          v1, v2, DI, v3, v4, v5, v6, v7, v8, sdelI, v9, v10, v11, dxC1, v12, dxC2, adyI, v13, v14, dyC1, v15, dyC2,
          v16,
          v17, v18, v19, v20, v21, v22, dxC, dyC, sdxC, sdyC, xC, yC, ist0, ist1, istAng0, isw1, isw2, iswAng0, istAng,
          iswAng, p1, p2, p3, p4, p5, xGp, yGp, xBp, yBp, en0, en1, en2, sw0, sw1, swAng, stAng0;

        a5 = (adj5 < 0) ? 0 : (adj5 > cnstVal1) ? cnstVal1 : adj5;
        maxAdj1 = a5 * 2;
        a1 = (adj1 < 0) ? 0 : (adj1 > maxAdj1) ? maxAdj1 : adj1;
        enAng = (adj3 < rdAngVal1) ? rdAngVal1 : (adj3 > rdAngVal2) ? rdAngVal2 : adj3;
        stAng = (adj4 < 0) ? 0 : (adj4 > rdAngVal2) ? rdAngVal2 : adj4;
        th = ss * a1 / cnstVal2;
        thh = ss * a5 / cnstVal2;
        th2 = th / 2;
        rw1 = wd2 + th2 - thh;
        rh1 = hd2 + th2 - thh;
        rw2 = rw1 - th;
        rh2 = rh1 - th;
        rw3 = rw2 + th2;
        rh3 = rh2 + th2;
        wtH = rw3 * Math.sin(enAng);
        htH = rh3 * Math.cos(enAng);
        dxH = rw3 * Math.cos(Math.atan2(wtH, htH));
        dyH = rh3 * Math.sin(Math.atan2(wtH, htH));
        xH = hc + dxH;
        yH = vc + dyH;
        rI = (rw2 < rh2) ? rw2 : rh2;
        u1 = dxH * dxH;
        u2 = dyH * dyH;
        u3 = rI * rI;
        u4 = u1 - u3;
        u5 = u2 - u3;
        u6 = u4 * u5 / u1;
        u7 = u6 / u2;
        u8 = 1 - u7;
        u9 = Math.sqrt(u8);
        u10 = u4 / dxH;
        u11 = u10 / dyH;
        u12 = (1 + u9) / u11;
        u13 = Math.atan2(u12, 1);
        u14 = u13 + rdAngVal3;
        u15 = (u13 > 0) ? u13 : u14;
        u16 = u15 - enAng;
        u17 = u16 + rdAngVal3;
        u18 = (u16 > 0) ? u16 : u17;
        u19 = u18 - cd2;
        u20 = u18 - rdAngVal3;
        u21 = (u19 > 0) ? u20 : u18;
        u22 = Math.abs(u21);
        minAng = u22 * -1;
        u23 = Math.abs(adj2);
        a2 = u23 * -1;
        aAng = (a2 < minAng) ? minAng : (a2 > 0) ? 0 : a2;
        ptAng = enAng + aAng;
        wtA = rw3 * Math.sin(ptAng);
        htA = rh3 * Math.cos(ptAng);
        dxA = rw3 * Math.cos(Math.atan2(wtA, htA));
        dyA = rh3 * Math.sin(Math.atan2(wtA, htA));
        xA = hc + dxA;
        yA = vc + dyA;
        wtE = rw1 * Math.sin(stAng);
        htE = rh1 * Math.cos(stAng);
        dxE = rw1 * Math.cos(Math.atan2(wtE, htE));
        dyE = rh1 * Math.sin(Math.atan2(wtE, htE));
        xE = hc + dxE;
        yE = vc + dyE;
        wtD = rw2 * Math.sin(stAng);
        htD = rh2 * Math.cos(stAng);
        dxD = rw2 * Math.cos(Math.atan2(wtD, htD));
        dyD = rh2 * Math.sin(Math.atan2(wtD, htD));
        xD = hc + dxD;
        yD = vc + dyD;
        dxG = thh * Math.cos(ptAng);
        dyG = thh * Math.sin(ptAng);
        xG = xH + dxG;
        yG = yH + dyG;
        dxB = thh * Math.cos(ptAng);
        dyB = thh * Math.sin(ptAng);
        xB = xH - dxB;
        yB = yH - dyB;
        sx1 = xB - hc;
        sy1 = yB - vc;
        sx2 = xG - hc;
        sy2 = yG - vc;
        rO = (rw1 < rh1) ? rw1 : rh1;
        x1O = sx1 * rO / rw1;
        y1O = sy1 * rO / rh1;
        x2O = sx2 * rO / rw1;
        y2O = sy2 * rO / rh1;
        dxO = x2O - x1O;
        dyO = y2O - y1O;
        dO = Math.sqrt(dxO * dxO + dyO * dyO);
        q1 = x1O * y2O;
        q2 = x2O * y1O;
        DO = q1 - q2;
        q3 = rO * rO;
        q4 = dO * dO;
        q5 = q3 * q4;
        q6 = DO * DO;
        q7 = q5 - q6;
        q8 = (q7 > 0) ? q7 : 0;
        sdelO = Math.sqrt(q8);
        ndyO = dyO * -1;
        sdyO = (ndyO > 0) ? -1 : 1;
        q9 = sdyO * dxO;
        q10 = q9 * sdelO;
        q11 = DO * dyO;
        dxF1 = (q11 + q10) / q4;
        q12 = q11 - q10;
        dxF2 = q12 / q4;
        adyO = Math.abs(dyO);
        q13 = adyO * sdelO;
        q14 = DO * dxO / -1;
        dyF1 = (q14 + q13) / q4;
        q15 = q14 - q13;
        dyF2 = q15 / q4;
        q16 = x2O - dxF1;
        q17 = x2O - dxF2;
        q18 = y2O - dyF1;
        q19 = y2O - dyF2;
        q20 = Math.sqrt(q16 * q16 + q18 * q18);
        q21 = Math.sqrt(q17 * q17 + q19 * q19);
        q22 = q21 - q20;
        dxF = (q22 > 0) ? dxF1 : dxF2;
        dyF = (q22 > 0) ? dyF1 : dyF2;
        sdxF = dxF * rw1 / rO;
        sdyF = dyF * rh1 / rO;
        xF = hc + sdxF;
        yF = vc + sdyF;
        x1I = sx1 * rI / rw2;
        y1I = sy1 * rI / rh2;
        x2I = sx2 * rI / rw2;
        y2I = sy2 * rI / rh2;
        dxI = x2I - x1I;
        dyI = y2I - y1I;
        dI = Math.sqrt(dxI * dxI + dyI * dyI);
        v1 = x1I * y2I;
        v2 = x2I * y1I;
        DI = v1 - v2;
        v3 = rI * rI;
        v4 = dI * dI;
        v5 = v3 * v4;
        v6 = DI * DI;
        v7 = v5 - v6;
        v8 = (v7 > 0) ? v7 : 0;
        sdelI = Math.sqrt(v8);
        v9 = sdyO * dxI;
        v10 = v9 * sdelI;
        v11 = DI * dyI;
        dxC1 = (v11 + v10) / v4;
        v12 = v11 - v10;
        dxC2 = v12 / v4;
        adyI = Math.abs(dyI);
        v13 = adyI * sdelI;
        v14 = DI * dxI / -1;
        dyC1 = (v14 + v13) / v4;
        v15 = v14 - v13;
        dyC2 = v15 / v4;
        v16 = x1I - dxC1;
        v17 = x1I - dxC2;
        v18 = y1I - dyC1;
        v19 = y1I - dyC2;
        v20 = Math.sqrt(v16 * v16 + v18 * v18);
        v21 = Math.sqrt(v17 * v17 + v19 * v19);
        v22 = v21 - v20;
        dxC = (v22 > 0) ? dxC1 : dxC2;
        dyC = (v22 > 0) ? dyC1 : dyC2;
        sdxC = dxC * rw2 / rI;
        sdyC = dyC * rh2 / rI;
        xC = hc + sdxC;
        yC = vc + sdyC;
        ist0 = Math.atan2(sdyC, sdxC);
        ist1 = ist0 + rdAngVal3;
        istAng0 = (ist0 > 0) ? ist0 : ist1;
        isw1 = stAng - istAng0;
        isw2 = isw1 + rdAngVal3;
        iswAng0 = (isw1 > 0) ? isw1 : isw2;
        istAng = istAng0 + iswAng0;
        iswAng = -iswAng0;
        p1 = xF - xC;
        p2 = yF - yC;
        p3 = Math.sqrt(p1 * p1 + p2 * p2);
        p4 = p3 / 2;
        p5 = p4 - thh;
        xGp = (p5 > 0) ? xF : xG;
        yGp = (p5 > 0) ? yF : yG;
        xBp = (p5 > 0) ? xC : xB;
        yBp = (p5 > 0) ? yC : yB;
        en0 = Math.atan2(sdyF, sdxF);
        en1 = en0 + rdAngVal3;
        en2 = (en0 > 0) ? en0 : en1;
        sw0 = en2 - stAng;
        sw1 = sw0 - rdAngVal3;
        swAng = (sw0 > 0) ? sw1 : sw0;
        stAng0 = stAng + swAng;

        var strtAng = stAng0 * 180 / Math.PI;
        var endAng = stAng * 180 / Math.PI;
        var stiAng = istAng * 180 / Math.PI;
        var swiAng = iswAng * 180 / Math.PI;
        var ediAng = stiAng + swiAng;

        var d_val = "M" + xE + "," + yE +
          " L" + xD + "," + yD +
          shapeArc(w / 2, h / 2, rw2, rh2, stiAng, ediAng, false).replace("M", "L") +
          " L" + xBp + "," + yBp +
          " L" + xA + "," + yA +
          " L" + xGp + "," + yGp +
          " L" + xF + "," + yF +
          shapeArc(w / 2, h / 2, rw1, rh1, strtAng, endAng, false).replace("M", "L") +
          " z";
        result += "<path d='" + d_val + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + border.color + "' stroke-width='" + border.width + "' stroke-dasharray='" + border.strokeDasharray + "' />";

        break;
      case "leftRightCircularArrow":
      case "chartPlus":
      case "chartStar":
      case "chartX":
      case "cornerTabs":
      case "flowChartOfflineStorage":
      case "folderCorner":
      case "funnel":
      case "lineInv":
      case "nonIsoscelesTrapezoid":
      case "plaqueTabs":
      case "squareTabs":
      case "upDownArrowCallout":
        console.log(shapType, " -unsupported shape type.");
        break;
      case undefined:
      default:
        console.warn("Undefine shape type.(" + shapType + ")");
    }

    result += "</svg>";

    result += "<div class='block " + getVerticalAlign(node, slideLayoutSpNode, slideMasterSpNode, type) + //block content
      " " + getContentDir(node, type, warpObj) +
      "' _id='" + id + "' _idx='" + idx + "' _type='" + type + "' _name='" + name +
      "' style='" +
      getPosition(slideXfrmNode, pNode, slideLayoutXfrmNode, slideMasterXfrmNode, sType, groupContext) +
      getSize(slideXfrmNode, slideLayoutXfrmNode, slideMasterXfrmNode, groupContext) +
      " z-index: " + order + ";" +
      "transform: rotate(" + ((txtRotate !== undefined) ? txtRotate : 0) + "deg);" +
      "'>";

    // TextBody
    if (node["p:txBody"] !== undefined && (isUserDrawnBg === undefined || isUserDrawnBg === true)) {
      if (type != "diagram" && type != "textBox") {
        type = "shape";
      }
      result += await genTextBody(node["p:txBody"], node, slideLayoutSpNode, slideMasterSpNode, type, idx, warpObj, undefined, groupContext); //type='shape'
    }
    result += "</div>";
  } else if (custShapType !== undefined) {
    //custGeom here - Amir ///////////////////////////////////////////////////////
    //http://officeopenxml.com/drwSp-custGeom.php
    var pathLstNode = getTextByPathList(custShapType, [ "a:pathLst" ]);
    var pathNodes = getTextByPathList(pathLstNode, [ "a:path" ]);
    //var pathNode = getTextByPathList(pathLstNode, ["a:path", "attrs"]);
    const attrs = pathNodes["attrs"] || {}
    var maxX = toFiniteNumber(attrs["w"], 21600);// * slideFactor;
    var maxY = toFiniteNumber(attrs["h"], 21600);// * slideFactor;
    var cX = (1 / maxX) * w;
    var cY = (1 / maxY) * h;
    //console.log("w = "+w+"\nh = "+h+"\nmaxX = "+maxX +"\nmaxY = " + maxY);
    //cheke if it is close shape

    //console.log("custShapType : ", custShapType, ", pathLstNode: ", pathLstNode, ", node: ", node);//, ", y:", y, ", w:", w, ", h:", h);

    var moveToNode = getTextByPathList(pathNodes, [ "a:moveTo" ]) || [];
    var total_shapes = moveToNode.length;

    var lnToNodes = pathNodes["a:lnTo"]; //total a:pt : 1
    var cubicBezToNodes = pathNodes["a:cubicBezTo"]; //total a:pt : 3
    var arcToNodes = pathNodes["a:arcTo"]; //total a:pt : 0?1? ; attrs: ~4 ()
    var closeNode = getTextByPathList(pathNodes, [ "a:close" ]); //total a:pt : 0
    //quadBezTo //total a:pt : 2 - TODO
    //console.log("ia moveToNode array: ", Array.isArray(moveToNode))
    if (!Array.isArray(moveToNode)) {
      moveToNode = [ moveToNode ];
    }
    //console.log("ia moveToNode array: ", Array.isArray(moveToNode))

    var multiSapeAry = [];
    if (moveToNode.length > 0) {
      //a:moveTo
      asArray(moveToNode).forEach(function (moveToItem) {
        var moveToPtNode = moveToItem["a:pt"];
        if (moveToPtNode !== undefined) {
          asArray(moveToPtNode).forEach(function (moveToNoPt) {
            var moveToAttrs = moveToNoPt["attrs"] || {};
            if (moveToAttrs["x"] === undefined || moveToAttrs["y"] === undefined) {
              return;
            }
            var ptObj = {};
            var spX = moveToAttrs["x"];//parseInt(moveToAttrs["x"]) * slideFactor;
            var spY = moveToAttrs["y"];//parseInt(moveToAttrs["y"]) * slideFactor;
            var ptOrdr = moveToAttrs["order"];
            ptObj.type = "movto";
            ptObj.order = toFiniteNumber(ptOrdr, multiSapeAry.length);
            ptObj.x = spX;
            ptObj.y = spY;
            multiSapeAry.push(ptObj);
            //console.log(key2, lnToNoPt);

          });
        }
      });
      //a:lnTo
      if (lnToNodes !== undefined) {
        asArray(lnToNodes).forEach(function (lnToItem) {
          var lnToPtNode = lnToItem["a:pt"];
          if (lnToPtNode !== undefined) {
            asArray(lnToPtNode).forEach(function (lnToNoPt) {
              var lnToAttrs = lnToNoPt["attrs"] || {};
              if (lnToAttrs["x"] === undefined || lnToAttrs["y"] === undefined) {
                return;
              }
              var ptObj = {};
              var ptX = lnToAttrs["x"];
              var ptY = lnToAttrs["y"];
              var ptOrdr = lnToAttrs["order"];
              ptObj.type = "lnto";
              ptObj.order = toFiniteNumber(ptOrdr, multiSapeAry.length);
              ptObj.x = ptX;
              ptObj.y = ptY;
              multiSapeAry.push(ptObj);
              //console.log(key2, lnToNoPt);
            });
          }
        });
      }
      //a:cubicBezTo
      if (cubicBezToNodes !== undefined) {

        var cubicBezToPtNodesAry = [];
        //console.log("cubicBezToNodes: ", cubicBezToNodes, ", is arry: ", Array.isArray(cubicBezToNodes))
        asArray(cubicBezToNodes).forEach(function (cubicBezToNode) {
          //console.log("cubicBezTo[" + key + "]:");
          cubicBezToPtNodesAry.push(cubicBezToNode["a:pt"]);
        });

        //console.log("cubicBezToNodes: ", cubicBezToPtNodesAry)
        cubicBezToPtNodesAry.forEach(function (key2) {
          //console.log("cubicBezToPtNodesAry: key2 : ", key2)
          key2 = asArray(key2);
          var nodeObj = {};
          nodeObj.type = "cubicBezTo";
          nodeObj.order = toFiniteNumber(getTextByPathList(key2[0], ["attrs", "order"]), multiSapeAry.length);
          var pts_ary = [];
          key2.forEach(function (pt) {
            var attrs = pt["attrs"] || {};
            if (attrs["x"] !== undefined && attrs["y"] !== undefined) {
              pts_ary.push({
                x: attrs["x"],
                y: attrs["y"]
              })
            }
          })
          if (pts_ary.length === 3) {
            nodeObj.cubBzPt = pts_ary;//key2;
            multiSapeAry.push(nodeObj);
          }
        });
      }
      //a:arcTo
      if (arcToNodes !== undefined) {
        asArray(arcToNodes).forEach(function (arcToNode) {
          var arcToNodesAttrs = arcToNode["attrs"] || {};
          if (
            arcToNodesAttrs["hR"] === undefined ||
            arcToNodesAttrs["wR"] === undefined ||
            arcToNodesAttrs["stAng"] === undefined ||
            arcToNodesAttrs["swAng"] === undefined
          ) {
            return;
          }
          var arcOrder = arcToNodesAttrs["order"];
          var hR = arcToNodesAttrs["hR"];
          var wR = arcToNodesAttrs["wR"];
          var stAng = arcToNodesAttrs["stAng"];
          var swAng = arcToNodesAttrs["swAng"];
          var shftX = 0;
          var shftY = 0;
          var arcToPtNode = getTextByPathList(arcToNode, [ "a:pt", "attrs" ]);
          if (arcToPtNode !== undefined) {
            shftX = arcToPtNode["x"];
            shftY = arcToPtNode["y"];
            //console.log("shftX: ",shftX," shftY: ",shftY)
          }
          var ptObj = {};
          ptObj.type = "arcTo";
          ptObj.order = toFiniteNumber(arcOrder, multiSapeAry.length);
          ptObj.hR = hR;
          ptObj.wR = wR;
          ptObj.stAng = stAng;
          ptObj.swAng = swAng;
          ptObj.shftX = shftX;
          ptObj.shftY = shftY;
          multiSapeAry.push(ptObj);
        });

      }
      //a:quadBezTo - TODO

      //a:close
      if (closeNode !== undefined) {

        // Object.keys(closeNode).forEach(function (key) {
        //     //console.log("cubicBezTo[" + key + "]:");
        //     cubicBezToPtNodesAry.push(closeNode[key]["a:pt"]);
        // });
        asArray(closeNode).forEach(function (closeItem) {
          //console.log("custShapType >> closeNode: key: ", key);
          var clsAttrs = closeItem["attrs"] || {};
          //var clsAttrs = closeNode["attrs"];
          var clsOrder = clsAttrs["order"];
          var ptObj = {};
          ptObj.type = "close";
          ptObj.order = toFiniteNumber(clsOrder, multiSapeAry.length);
          multiSapeAry.push(ptObj);

        });

      }

      // console.log("custShapType >> multiSapeAry: ", multiSapeAry);

      multiSapeAry.sort(function (a, b) {
        return a.order - b.order;
      });

      //console.log("custShapType >>sorted  multiSapeAry: ");
      //console.log(multiSapeAry);
      var k = 0;
      var isClose = false;
      var d = "";
      while (k < multiSapeAry.length) {

        if (multiSapeAry[k].type == "movto") {
          //start point
          var spX = toFiniteNumber(multiSapeAry[k].x, NaN) * cX;//slideFactor;
          var spY = toFiniteNumber(multiSapeAry[k].y, NaN) * cY;//slideFactor;
          if (!Number.isFinite(spX) || !Number.isFinite(spY)) {
            k++;
            continue;
          }
          // if (d == "") {
          //     d = "M" + spX + "," + spY;
          // } else {
          //     //shape without close : then close the shape and start new path
          //     result += "<path d='" + d + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          //         "' stroke='" + ((border === undefined) ? "" : border.color) + "' stroke-width='" + ((border === undefined) ? "" : border.width) + "' stroke-dasharray='" + ((border === undefined) ? "" : border.strokeDasharray) + "' ";
          //     result += "/>";

          //     if (headEndNodeAttrs !== undefined && (headEndNodeAttrs["type"] === "triangle" || headEndNodeAttrs["type"] === "arrow")) {
          //         result += "marker-start='url(#markerTriangle_" + shpId + ")' ";
          //     }
          //     if (tailEndNodeAttrs !== undefined && (tailEndNodeAttrs["type"] === "triangle" || tailEndNodeAttrs["type"] === "arrow")) {
          //         result += "marker-end='url(#markerTriangle_" + shpId + ")' ";
          //     }
          //     result += "/>";

          //     d = "M" + spX + "," + spY;
          //     isClose = true;
          // }

          d += " M" + spX + "," + spY;

        } else if (multiSapeAry[k].type == "lnto") {
          var Lx = toFiniteNumber(multiSapeAry[k].x, NaN) * cX;//slideFactor;
          var Ly = toFiniteNumber(multiSapeAry[k].y, NaN) * cY;//slideFactor;
          if (!Number.isFinite(Lx) || !Number.isFinite(Ly)) {
            k++;
            continue;
          }
          d += " L" + Lx + "," + Ly;

        } else if (multiSapeAry[k].type == "cubicBezTo") {
          var Cx1 = toFiniteNumber(multiSapeAry[k].cubBzPt[0].x, NaN) * cX;//slideFactor;
          var Cy1 = toFiniteNumber(multiSapeAry[k].cubBzPt[0].y, NaN) * cY;//slideFactor;
          var Cx2 = toFiniteNumber(multiSapeAry[k].cubBzPt[1].x, NaN) * cX;//slideFactor;
          var Cy2 = toFiniteNumber(multiSapeAry[k].cubBzPt[1].y, NaN) * cY;//slideFactor;
          var Cx3 = toFiniteNumber(multiSapeAry[k].cubBzPt[2].x, NaN) * cX;//slideFactor;
          var Cy3 = toFiniteNumber(multiSapeAry[k].cubBzPt[2].y, NaN) * cY;//slideFactor;
          if (![Cx1, Cy1, Cx2, Cy2, Cx3, Cy3].every(Number.isFinite)) {
            k++;
            continue;
          }
          d += " C" + Cx1 + "," + Cy1 + " " + Cx2 + "," + Cy2 + " " + Cx3 + "," + Cy3;
        } else if (multiSapeAry[k].type == "arcTo") {
          var hR = toFiniteNumber(multiSapeAry[k].hR, NaN) * cX;//slideFactor;
          var wR = toFiniteNumber(multiSapeAry[k].wR, NaN) * cY;//slideFactor;
          var stAng = toFiniteNumber(multiSapeAry[k].stAng, NaN) / 60000;
          var swAng = toFiniteNumber(multiSapeAry[k].swAng, NaN) / 60000;
          if (![hR, wR, stAng, swAng].every(Number.isFinite)) {
            k++;
            continue;
          }
          //var shftX = parseInt(multiSapeAry[k].shftX) * slideFactor;
          //var shftY = parseInt(multiSapeAry[k].shftY) * slideFactor;
          var endAng = stAng + swAng;

          d += shapeArc(wR, hR, wR, hR, stAng, endAng, false);
        } else if (multiSapeAry[k].type == "quadBezTo") {
          console.log("custShapType: quadBezTo - TODO")

        } else if (multiSapeAry[k].type == "close") {
          // result += "<path d='" + d + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          //     "' stroke='" + ((border === undefined) ? "" : border.color) + "' stroke-width='" + ((border === undefined) ? "" : border.width) + "' stroke-dasharray='" + ((border === undefined) ? "" : border.strokeDasharray) + "' ";
          // result += "/>";
          // d = "";
          // isClose = true;

          d += "z";
        }
        k++;
      }
      //if (!isClose) {
      //only one "moveTo" and no "close"
      if (d && !/NaN/.test(d)) {
        result += "<path d='" + d + "' fill='" + (!imgFillFlg ? (grndFillFlg ? "url(#linGrd_" + shpId + ")" : fillColor) : "url(#imgPtrn_" + shpId + ")") +
          "' stroke='" + ((border === undefined) ? "" : border.color) + "' stroke-width='" + ((border === undefined) ? "" : border.width) + "' stroke-dasharray='" + ((border === undefined) ? "" : border.strokeDasharray) + "' ";
        result += "/>";
      }
      //console.log(result);
    }

    result += "</svg>";
    result += "<div class='block " + getVerticalAlign(node, slideLayoutSpNode, slideMasterSpNode, type) + //block content
      " " + getContentDir(node, type, warpObj) +
      "' _id='" + id + "' _idx='" + idx + "' _type='" + type + "' _name='" + name +
      "' style='" +
      getPosition(slideXfrmNode, pNode, slideLayoutXfrmNode, slideMasterXfrmNode, sType, groupContext) +
      getSize(slideXfrmNode, slideLayoutXfrmNode, slideMasterXfrmNode, groupContext) +
      " z-index: " + order + ";" +
      "transform: rotate(" + ((txtRotate !== undefined) ? txtRotate : 0) + "deg);" +
      "'>";

    // TextBody
    if (node["p:txBody"] !== undefined && (isUserDrawnBg === undefined || isUserDrawnBg === true)) {
      if (type != "diagram" && type != "textBox") {
        type = "shape";
      }
      result += await genTextBody(node["p:txBody"], node, slideLayoutSpNode, slideMasterSpNode, type, idx, warpObj, undefined, groupContext); //type=shape
    }
    result += "</div>";

    // result = "";
  } else {

    result += "<div class='block " + getVerticalAlign(node, slideLayoutSpNode, slideMasterSpNode, type) +//block content
      " " + getContentDir(node, type, warpObj) +
      "' _id='" + id + "' _idx='" + idx + "' _type='" + type + "' _name='" + name +
      "' style='" +
      getPosition(slideXfrmNode, pNode, slideLayoutXfrmNode, slideMasterXfrmNode, sType, groupContext) +
      getSize(slideXfrmNode, slideLayoutXfrmNode, slideMasterXfrmNode, groupContext) +
      getBorder(node, pNode, false, "shape", warpObj) +
      await getShapeFill(node, pNode, false, warpObj, source) +
      " z-index: " + order + ";" +
      "transform: rotate(" + ((txtRotate !== undefined) ? txtRotate : 0) + "deg);" +
      "'>";

    // TextBody
    if (node["p:txBody"] !== undefined && (isUserDrawnBg === undefined || isUserDrawnBg === true)) {
      result += await genTextBody(node["p:txBody"], node, slideLayoutSpNode, slideMasterSpNode, type, idx, warpObj, undefined, groupContext);
    }
    result += "</div>";

  }
  //console.log("div block result:\n", result)
  return result;
}

function shapePie(H, w, adj1, adj2, isClose) {
  var pieVal = parseInt(adj2);
  var piAngle = parseInt(adj1);
  var size = parseInt(H),
    radius = (size / 2),
    value = pieVal - piAngle;
  if (value < 0) {
    value = 360 + value;
  }
  //console.log("value: ",value)
  value = Math.min(Math.max(value, 0), 360);

  //calculate x,y coordinates of the point on the circle to draw the arc to.
  var x = Math.cos((2 * Math.PI) / (360 / value));
  var y = Math.sin((2 * Math.PI) / (360 / value));


  //d is a string that describes the path of the slice.
  var longArc, d, rot;
  if (isClose) {
    longArc = (value <= 180) ? 0 : 1;
    d = "M" + radius + "," + radius + " L" + radius + "," + 0 + " A" + radius + "," + radius + " 0 " + longArc + ",1 " + (radius + y * radius) + "," + (radius - x * radius) + " z";
    rot = "rotate(" + (piAngle - 270) + ", " + radius + ", " + radius + ")";
  } else {
    longArc = (value <= 180) ? 0 : 1;
    var radius1 = radius;
    var radius2 = w / 2;
    d = "M" + radius1 + "," + 0 + " A" + radius2 + "," + radius1 + " 0 " + longArc + ",1 " + (radius2 + y * radius2) + "," + (radius1 - x * radius1);
    rot = "rotate(" + (piAngle + 90) + ", " + radius + ", " + radius + ")";
  }

  return [d, rot];
}
function shapeGear(w, h, points) {
  var innerRadius = h;//gear.innerRadius;
  var outerRadius = 1.5 * innerRadius;
  var cx = outerRadius;//Math.max(innerRadius, outerRadius),                   // center x
  const cy = outerRadius;//Math.max(innerRadius, outerRadius),                    // center y
  const notches = points,//gear.points,                      // num. of notches
    radiusO = outerRadius,                    // outer radius
    radiusI = innerRadius,                    // inner radius
    taperO = 50,                     // outer taper %
    taperI = 35,                     // inner taper %
    // pre-calculate values for loop
    pi2 = 2 * Math.PI,            // cache 2xPI (360deg)
    angle = pi2 / (notches * 2),    // angle between notches
    taperAI = angle * taperI * 0.005, // inner taper offset (100% = half notch)
    taperAO = angle * taperO * 0.005; // outer taper offset
  let a = angle,                  // iterator (angle)
    toggle = false;
  // move to starting point
  var d = " M" + (cx + radiusO * Math.cos(taperAO)) + " " + (cy + radiusO * Math.sin(taperAO));

  // loop
  for (; a <= pi2 + angle; a += angle) {
    // draw inner to outer line
    if (toggle) {
      d += " L" + (cx + radiusI * Math.cos(a - taperAI)) + "," + (cy + radiusI * Math.sin(a - taperAI));
      d += " L" + (cx + radiusO * Math.cos(a + taperAO)) + "," + (cy + radiusO * Math.sin(a + taperAO));
    } else { // draw outer to inner line
      d += " L" + (cx + radiusO * Math.cos(a - taperAO)) + "," + (cy + radiusO * Math.sin(a - taperAO)); // outer line
      d += " L" + (cx + radiusI * Math.cos(a + taperAI)) + "," + (cy + radiusI * Math.sin(a + taperAI));// inner line

    }
    // switch level
    toggle = !toggle;
  }
  // close the final line
  d += " ";
  return d;
}
function shapeArc(cX, cY, rX, rY, stAng, endAng, isClose) {
  var dData;
  var angle = stAng;
  if (endAng >= stAng) {
    while (angle <= endAng) {
      var radians = angle * (Math.PI / 180);  // convert degree to radians
      var x = cX + Math.cos(radians) * rX;
      var y = cY + Math.sin(radians) * rY;
      if (angle == stAng) {
        dData = " M" + x + " " + y;
      }
      dData += " L" + x + " " + y;
      angle++;
    }
  } else {
    while (angle > endAng) {
      var radians = angle * (Math.PI / 180);  // convert degree to radians
      var x = cX + Math.cos(radians) * rX;
      var y = cY + Math.sin(radians) * rY;
      if (angle == stAng) {
        dData = " M " + x + " " + y;
      }
      dData += " L " + x + " " + y;
      angle--;
    }
  }
  dData += (isClose ? " z" : "");
  return dData;
}

function getCustomGeometryPathData(custGeomNode, w, h) {
  var pathNodes = asArray(getTextByPathList(custGeomNode, ["a:pathLst", "a:path"]));
  var paths = [];

  pathNodes.forEach(function (pathNode) {
    var attrs = pathNode["attrs"] || {};
    var maxX = toFiniteNumber(attrs["w"], 21600);
    var maxY = toFiniteNumber(attrs["h"], 21600);
    var cX = maxX ? (1 / maxX) * w : 0;
    var cY = maxY ? (1 / maxY) * h : 0;
    var commands = [];

    asArray(getTextByPathList(pathNode, ["a:moveTo"])).forEach(function (moveToItem) {
      asArray(getTextByPathList(moveToItem, ["a:pt"])).forEach(function (pt) {
        var ptAttrs = pt["attrs"] || {};
        if (ptAttrs["x"] === undefined || ptAttrs["y"] === undefined) {
          return;
        }
        commands.push({
          type: "movto",
          order: toFiniteNumber(ptAttrs["order"], commands.length),
          x: ptAttrs["x"],
          y: ptAttrs["y"]
        });
      });
    });

    asArray(pathNode["a:lnTo"]).forEach(function (lnToItem) {
      asArray(getTextByPathList(lnToItem, ["a:pt"])).forEach(function (pt) {
        var ptAttrs = pt["attrs"] || {};
        if (ptAttrs["x"] === undefined || ptAttrs["y"] === undefined) {
          return;
        }
        commands.push({
          type: "lnto",
          order: toFiniteNumber(ptAttrs["order"], commands.length),
          x: ptAttrs["x"],
          y: ptAttrs["y"]
        });
      });
    });

    asArray(pathNode["a:cubicBezTo"]).forEach(function (cubicBezToNode) {
      var pts = [];
      asArray(cubicBezToNode["a:pt"]).forEach(function (pt) {
        var ptAttrs = pt["attrs"] || {};
        if (ptAttrs["x"] !== undefined && ptAttrs["y"] !== undefined) {
          pts.push({
            x: ptAttrs["x"],
            y: ptAttrs["y"]
          });
        }
      });
      if (pts.length === 3) {
        commands.push({
          type: "cubicBezTo",
          order: toFiniteNumber(getTextByPathList(cubicBezToNode, ["attrs", "order"]), commands.length),
          cubBzPt: pts
        });
      }
    });

    asArray(pathNode["a:arcTo"]).forEach(function (arcToNode) {
      var arcAttrs = arcToNode["attrs"] || {};
      if (
        arcAttrs["hR"] === undefined ||
        arcAttrs["wR"] === undefined ||
        arcAttrs["stAng"] === undefined ||
        arcAttrs["swAng"] === undefined
      ) {
        return;
      }
      commands.push({
        type: "arcTo",
        order: toFiniteNumber(arcAttrs["order"], commands.length),
        hR: arcAttrs["hR"],
        wR: arcAttrs["wR"],
        stAng: arcAttrs["stAng"],
        swAng: arcAttrs["swAng"]
      });
    });

    asArray(pathNode["a:close"]).forEach(function (closeItem) {
      commands.push({
        type: "close",
        order: toFiniteNumber(getTextByPathList(closeItem, ["attrs", "order"]), commands.length)
      });
    });

    commands.sort(function (a, b) {
      return a.order - b.order;
    });

    var d = "";
    commands.forEach(function (command) {
      if (command.type == "movto") {
        var spX = toFiniteNumber(command.x, NaN) * cX;
        var spY = toFiniteNumber(command.y, NaN) * cY;
        if (Number.isFinite(spX) && Number.isFinite(spY)) {
          d += " M" + formatSvgNumber(spX) + "," + formatSvgNumber(spY);
        }
      } else if (command.type == "lnto") {
        var lx = toFiniteNumber(command.x, NaN) * cX;
        var ly = toFiniteNumber(command.y, NaN) * cY;
        if (Number.isFinite(lx) && Number.isFinite(ly)) {
          d += " L" + formatSvgNumber(lx) + "," + formatSvgNumber(ly);
        }
      } else if (command.type == "cubicBezTo") {
        var cx1 = toFiniteNumber(command.cubBzPt[0].x, NaN) * cX;
        var cy1 = toFiniteNumber(command.cubBzPt[0].y, NaN) * cY;
        var cx2 = toFiniteNumber(command.cubBzPt[1].x, NaN) * cX;
        var cy2 = toFiniteNumber(command.cubBzPt[1].y, NaN) * cY;
        var cx3 = toFiniteNumber(command.cubBzPt[2].x, NaN) * cX;
        var cy3 = toFiniteNumber(command.cubBzPt[2].y, NaN) * cY;
        if ([cx1, cy1, cx2, cy2, cx3, cy3].every(Number.isFinite)) {
          d += " C" + formatSvgNumber(cx1) + "," + formatSvgNumber(cy1) +
            " " + formatSvgNumber(cx2) + "," + formatSvgNumber(cy2) +
            " " + formatSvgNumber(cx3) + "," + formatSvgNumber(cy3);
        }
      } else if (command.type == "arcTo") {
        var hR = toFiniteNumber(command.hR, NaN) * cX;
        var wR = toFiniteNumber(command.wR, NaN) * cY;
        var stAng = toFiniteNumber(command.stAng, NaN) / 60000;
        var swAng = toFiniteNumber(command.swAng, NaN) / 60000;
        if ([hR, wR, stAng, swAng].every(Number.isFinite)) {
          d += shapeArc(wR, hR, wR, hR, stAng, stAng + swAng, false);
        }
      } else if (command.type == "close") {
        d += " Z";
      }
    });

    if (d && !/NaN/.test(d)) {
      paths.push(d);
    }
  });

  return paths;
}

function shapeSnipRoundRect(w, h, adj1, adj2, shapeType, adjType) {
  /*
            shapeType: snip,round
            adjType: cornr1,cornr2,cornrAll,diag
            */
  var adjA, adjB, adjC, adjD;
  if (adjType == "cornr1") {
    adjA = 0;
    adjB = 0;
    adjC = 0;
    adjD = adj1;
  } else if (adjType == "cornr2") {
    adjA = adj1;
    adjB = adj2;
    adjC = adj2;
    adjD = adj1;
  } else if (adjType == "cornrAll") {
    adjA = adj1;
    adjB = adj1;
    adjC = adj1;
    adjD = adj1;
  } else if (adjType == "diag") {
    adjA = adj1;
    adjB = adj2;
    adjC = adj1;
    adjD = adj2;
  }
  //d is a string that describes the path of the slice.
  var d;
  if (shapeType == "round") {
    d = "M0" + "," + (h / 2 + (1 - adjB) * (h / 2)) + " Q" + 0 + "," + h + " " + adjB * (w / 2) + "," + h + " L" + (w / 2 + (1 - adjC) * (w / 2)) + "," + h +
      " Q" + w + "," + h + " " + w + "," + (h / 2 + (h / 2) * (1 - adjC)) + "L" + w + "," + (h / 2) * adjD +
      " Q" + w + "," + 0 + " " + (w / 2 + (w / 2) * (1 - adjD)) + ",0 L" + (w / 2) * adjA + ",0" +
      " Q" + 0 + "," + 0 + " 0," + (h / 2) * (adjA) + " z";
  } else if (shapeType == "snip") {
    d = "M0" + "," + adjA * (h / 2) + " L0" + "," + (h / 2 + (h / 2) * (1 - adjB)) + "L" + adjB * (w / 2) + "," + h +
      " L" + (w / 2 + (w / 2) * (1 - adjC)) + "," + h + "L" + w + "," + (h / 2 + (h / 2) * (1 - adjC)) +
      " L" + w + "," + adjD * (h / 2) + "L" + (w / 2 + (w / 2) * (1 - adjD)) + ",0 L" + ((w / 2) * adjA) + ",0 z";
  }
  return d;
}
/*
        function shapePolygon(sidesNum) {
            var sides  = sidesNum;
            var radius = 100;
            var angle  = 2 * Math.PI / sides;
            var points = [];

            for (var i = 0; i < sides; i++) {
                points.push(radius + radius * Math.sin(i * angle));
                points.push(radius - radius * Math.cos(i * angle));
            }

            return points;
        }
        */
async function processPicNode(node, warpObj, source, sType, groupContext) {
  //console.log("processPicNode node:", node, "source:", source, "sType:", sType, "warpObj;", warpObj);
  var rtrnData = "";
  var mediaPicFlag = false;
  var order = node["attrs"]["order"];

  var rid = node["p:blipFill"]["a:blip"]["attrs"]["r:embed"];
  var resObj;
  if (source == "slideMasterBg") {
    resObj = warpObj["masterResObj"];
  } else if (source == "slideLayoutBg") {
    resObj = warpObj["layoutResObj"];
  } else {
    //imgName = warpObj["slideResObj"][rid]["target"];
    resObj = warpObj["slideResObj"];
  }
  var imgName = resObj[rid]["target"];

  //console.log("processPicNode imgName:", imgName);
  var imgFileExt = extractFileExtension(imgName).toLowerCase();
  var zip = warpObj["zip"];
  var imgArrayBuffer = await zip.file(imgName).async('arraybuffer');
  var mimeType = "";
  var xfrmNode = node["p:spPr"]["a:xfrm"];
  if (xfrmNode === undefined) {
    var idx = getTextByPathList(node, ["p:nvPicPr", "p:nvPr", "p:ph", "attrs", "idx"]);
    var type = getTextByPathList(node, ["p:nvPicPr", "p:nvPr", "p:ph", "attrs", "type"]);
    if (idx !== undefined) {
      xfrmNode = getTextByPathList(warpObj["slideLayoutTables"], ["idxTable", idx, "p:spPr", "a:xfrm"]);
    }
  }
  ///////////////////////////////////////Amir//////////////////////////////
  var rotate = 0;
  var rotateNode = getTextByPathList(node, ["p:spPr", "a:xfrm", "attrs", "rot"]);
  if (rotateNode !== undefined) {
    rotate = angleToDegrees(rotateNode);
  }
  //video
  var vdoNode = getTextByPathList(node, ["p:nvPicPr", "p:nvPr", "a:videoFile"]);
  var mediaShapeId = getTextByPathList(node, ["p:nvPicPr", "p:cNvPr", "attrs", "id"]) || order || "0";
  var mediaIdPrefix = "pptx-media-" + ((warpObj && warpObj.slideNumber) || "0") + "-" + mediaShapeId;
  var vdoRid, vdoFile, vdoFileExt, vdoMimeType, uInt8Array, vdoMediaId, mediaSupportFlag = false, isVdeoLink = false;
  var mediaProcess = settings.mediaProcess;
  if (vdoNode !== undefined & mediaProcess) {
    vdoRid = vdoNode["attrs"]["r:link"];
    vdoFile = resObj[vdoRid]["target"];
    var checkIfLink = IsVideoLink(vdoFile);
    if (checkIfLink) {
      vdoFile = escapeHtml(vdoFile);
      //vdoBlob = vdoFile;
      isVdeoLink = true;
      mediaSupportFlag = true;
      mediaPicFlag = true;
    } else {
      vdoFileExt = extractFileExtension(vdoFile).toLowerCase();
      if (vdoFileExt == "mp4" || vdoFileExt == "webm" || vdoFileExt == "ogg") {
        uInt8Array = await zip.file(vdoFile).async('arraybuffer');
        vdoMimeType = getMimeType(vdoFileExt);
        vdoMediaId = mediaIdPrefix + "-video";
        MediaFiles.MsgQueue.push({
          id: vdoMediaId,
          kind: "video",
          mimeType: vdoMimeType,
          buffer: uInt8Array
        });
        mediaSupportFlag = true;
        mediaPicFlag = true;
      }
    }
  }
  //Audio
  var audioNode = getTextByPathList(node, ["p:nvPicPr", "p:nvPr", "a:audioFile"]);
  var audioRid, audioFile, audioFileExt, audioMimeType, uInt8ArrayAudio, audioMediaId;
  var audioPlayerFlag = false;
  var audioObjc;
  if (audioNode !== undefined & mediaProcess) {
    audioRid = audioNode["attrs"]["r:link"];
    audioFile = resObj[audioRid]["target"];
    audioFileExt = extractFileExtension(audioFile).toLowerCase();
    if (audioFileExt == "mp3" || audioFileExt == "wav" || audioFileExt == "ogg") {
      uInt8ArrayAudio = await zip.file(audioFile).async('arraybuffer');
      audioMimeType = audioFileExt == "ogg" ? "audio/ogg" : getMimeType(audioFileExt);
      audioMediaId = mediaIdPrefix + "-audio";
      MediaFiles.MsgQueue.push({
        id: audioMediaId,
        kind: "audio",
        mimeType: audioMimeType,
        buffer: uInt8ArrayAudio
      });
      var cx = parseInt(xfrmNode["a:ext"]["attrs"]["cx"]) * 20;
      var cy = xfrmNode["a:ext"]["attrs"]["cy"];
      var x = parseInt(xfrmNode["a:off"]["attrs"]["x"]) / 2.5;
      var y = xfrmNode["a:off"]["attrs"]["y"];
      audioObjc = {
        "a:ext": {
          "attrs": {
            "cx": cx,
            "cy": cy
          }
        },
        "a:off": {
          "attrs": {
            "x": x,
            "y": y

          }
        }
      }
      audioPlayerFlag = true;
      mediaSupportFlag = true;
      mediaPicFlag = true;
    }
  }
  //console.log(node)
  //////////////////////////////////////////////////////////////////////////
  mimeType = getMimeType(imgFileExt);
  var imageDataUrl = await getImageDataUrl(imgFileExt, imgArrayBuffer);
  if (!imageDataUrl && ((vdoNode === undefined && audioNode === undefined) || !mediaProcess || !mediaSupportFlag)) {
    return "";
  }
  var cropStyles = getBlipCropStyles(node["p:blipFill"]);
  var blipEffectStyles = getBlipEffectStyles(node["p:blipFill"]);
  var customGeometryPaths = [];
  var customGeometrySize = { width: 100, height: 100 };
  var customGeometryNode = getTextByPathList(node, ["p:spPr", "a:custGeom"]);
  if (customGeometryNode !== undefined && xfrmNode !== undefined) {
    var extAttrs = getTextByPathList(xfrmNode, ["a:ext", "attrs"]) || {};
    var picWidth = mapGroupSizeToPx(extAttrs["cx"], "x", groupContext);
    var picHeight = mapGroupSizeToPx(extAttrs["cy"], "y", groupContext);
    if (Number.isFinite(picWidth) && Number.isFinite(picHeight) && picWidth > 0 && picHeight > 0) {
      customGeometrySize = { width: picWidth, height: picHeight };
      customGeometryPaths = getCustomGeometryPathData(customGeometryNode, picWidth, picHeight);
    }
  }
  rtrnData = "<div class='block content' style='" +
    ((mediaProcess && audioPlayerFlag) ? getPosition(audioObjc, node, undefined, undefined, sType, groupContext) : getPosition(xfrmNode, node, undefined, undefined, sType, groupContext)) +
    ((mediaProcess && audioPlayerFlag) ? getSize(audioObjc, undefined, undefined, groupContext) : getSize(xfrmNode, undefined, undefined, groupContext)) +
    " z-index: " + order + ";" +
    "transform: rotate(" + rotate + "deg);" +
    (((vdoNode === undefined && audioNode === undefined) || !mediaProcess || !mediaSupportFlag) ? cropStyles.container + getPicturePresetClipStyles(node) : "") +
    "'>";
  if ((vdoNode === undefined && audioNode === undefined) || !mediaProcess || !mediaSupportFlag) {
    if (customGeometryPaths.length > 0) {
      var picClipId = "pptx_pic_clip_" + ((warpObj && warpObj.slideNumber) || "0") + "_" +
        (getTextByPathList(node, ["p:nvPicPr", "p:cNvPr", "attrs", "id"]) || order || customGeometryPaths.length);
      var svgImageX = customGeometrySize.width * cropStyles.svg.x / 100;
      var svgImageY = customGeometrySize.height * cropStyles.svg.y / 100;
      var svgImageWidth = customGeometrySize.width * cropStyles.svg.width / 100;
      var svgImageHeight = customGeometrySize.height * cropStyles.svg.height / 100;
      rtrnData += "<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' viewBox='0 0 " +
        formatSvgNumber(customGeometrySize.width) + " " + formatSvgNumber(customGeometrySize.height) +
        "' preserveAspectRatio='none' style='display:block;width:100%;height:100%;overflow:hidden;'>";
      rtrnData += "<defs><clipPath id='" + picClipId + "' clipPathUnits='userSpaceOnUse'>";
      customGeometryPaths.forEach(function (pathData) {
        rtrnData += "<path d='" + pathData + "' clip-rule='evenodd' fill-rule='evenodd'/>";
      });
      rtrnData += "</clipPath></defs>";
      rtrnData += "<image href='" + imageDataUrl + "' x='" + formatSvgNumber(svgImageX) + "' y='" + formatSvgNumber(svgImageY) +
        "' width='" + formatSvgNumber(svgImageWidth) + "' height='" + formatSvgNumber(svgImageHeight) +
        "' preserveAspectRatio='none' clip-path='url(#" + picClipId + ")' style='" + blipEffectStyles + "'/>";
      rtrnData += "</svg>";
    } else {
      rtrnData += "<img src='" + imageDataUrl + "' style='" + cropStyles.image + blipEffectStyles + "'/>";
    }
  } else if ((vdoNode !== undefined || audioNode !== undefined) && mediaProcess && mediaSupportFlag) {
    if (vdoNode !== undefined && !isVdeoLink) {
      rtrnData += "<video data-pptx-media-id='" + vdoMediaId + "' controls preload='metadata'" +
        (imageDataUrl ? " poster='" + imageDataUrl + "'" : "") +
        " style='width: 100%; height: 100%'>Your browser does not support the video tag.</video>";
    } else if (vdoNode !== undefined && isVdeoLink) {
      rtrnData += "<iframe   src='" + vdoFile + "' controls style='width: 100%; height: 100%'></iframe >";
    }
    if (audioNode !== undefined) {
      rtrnData += '<audio data-pptx-media-id="' + audioMediaId + '" controls preload="metadata"></audio>';
      //'<button onclick="audio_player.play()">Play</button>'+
      //'<button onclick="audio_player.pause()">Pause</button>';
    }
  }
  if (!mediaSupportFlag && mediaPicFlag) {
    rtrnData += "<span style='color:red;font-size:40px;position: absolute;'>This media file Not supported by HTML5</span>";
  }
  if ((vdoNode !== undefined || audioNode !== undefined) && !mediaProcess && mediaSupportFlag) {
    console.log("Founded supported media file but media process disabled (mediaProcess=false)");
  }
  rtrnData += "</div>";
  //console.log(rtrnData)
  return rtrnData;
}

async function processGraphicFrameNode(node, warpObj, source, sType, groupContext) {

  var result = "";
  var graphicTypeUri = getTextByPathList(node, ["a:graphic", "a:graphicData", "attrs", "uri"]);

  switch (graphicTypeUri) {
    case "http://schemas.openxmlformats.org/drawingml/2006/table":
      result = await genTable(node, warpObj, groupContext);
      break;
    case "http://schemas.openxmlformats.org/drawingml/2006/chart":
      result = await genChart(node, warpObj, groupContext);
      break;
    case "http://schemas.openxmlformats.org/drawingml/2006/diagram":
      result = await genDiagram(node, warpObj, source, sType, groupContext);
      break;
    case "http://schemas.openxmlformats.org/presentationml/2006/ole":
      //result = genDiagram(node, warpObj, source, sType);
      var oleObjNode = getTextByPathList(node, ["a:graphic", "a:graphicData", "mc:AlternateContent", "mc:Fallback","p:oleObj"]);

      if (oleObjNode === undefined) {
        oleObjNode = getTextByPathList(node, ["a:graphic", "a:graphicData", "p:oleObj"]);
      }
      //console.log("node:", node, "oleObjNode:", oleObjNode)
      if (oleObjNode !== undefined){
        result = await processGroupSpNode(oleObjNode, warpObj, source, groupContext);
      }
      break;
    default:
  }

  return result;
}

function processSpPrNode(node, warpObj) {

  /*
            * 2241 <xsd:complexType name="CT_ShapeProperties">
            * 2242   <xsd:sequence>
            * 2243     <xsd:element name="xfrm" type="CT_Transform2D"  minOccurs="0" maxOccurs="1"/>
            * 2244     <xsd:group   ref="EG_Geometry"                  minOccurs="0" maxOccurs="1"/>
            * 2245     <xsd:group   ref="EG_FillProperties"            minOccurs="0" maxOccurs="1"/>
            * 2246     <xsd:element name="ln" type="CT_LineProperties" minOccurs="0" maxOccurs="1"/>
            * 2247     <xsd:group   ref="EG_EffectProperties"          minOccurs="0" maxOccurs="1"/>
            * 2248     <xsd:element name="scene3d" type="CT_Scene3D"   minOccurs="0" maxOccurs="1"/>
            * 2249     <xsd:element name="sp3d" type="CT_Shape3D"      minOccurs="0" maxOccurs="1"/>
            * 2250     <xsd:element name="extLst" type="CT_OfficeArtExtensionList" minOccurs="0" maxOccurs="1"/>
            * 2251   </xsd:sequence>
            * 2252   <xsd:attribute name="bwMode" type="ST_BlackWhiteMode" use="optional"/>
            * 2253 </xsd:complexType>
            */

  // TODO:
}

var is_first_br = false;
async function genTextBody(textBodyNode, spNode, slideLayoutSpNode, slideMasterSpNode, type, idx, warpObj, tbl_col_width, groupContext) {
  var text = "";
  var slideMasterTextStyles = warpObj["slideMasterTextStyles"];

  if (textBodyNode === undefined) {
    return text;
  }
  //rtl : <p:txBody>
  //          <a:bodyPr wrap="square" rtlCol="1">

  var pFontStyle = getTextByPathList(spNode, [ "p:style", "a:fontRef" ]);
  //console.log("genTextBody spNode: ", getTextByPathList(spNode,["p:spPr","a:xfrm","a:ext"]));

  //var lstStyle = textBodyNode["a:lstStyle"];

  var apNode = textBodyNode["a:p"];
  if (apNode.constructor !== Array) {
    apNode = [ apNode ];
  }

  for (var i = 0; i < apNode.length; i++) {
    var pNode = apNode[i];
    var rNode = pNode["a:r"];
    var fldNode = pNode["a:fld"];
    var brNode = pNode["a:br"];
    if (rNode !== undefined) {
      rNode = (rNode.constructor === Array) ? rNode : [ rNode ];
    }
    if (rNode !== undefined && fldNode !== undefined) {
      fldNode = (fldNode.constructor === Array) ? fldNode : [ fldNode ];
      rNode = rNode.concat(fldNode)
    }
    if (rNode !== undefined && brNode !== undefined) {
      is_first_br = true;
      brNode = (brNode.constructor === Array) ? brNode : [ brNode ];
      brNode.forEach(function (item, indx) {
        item.type = "br";
      });
      if (brNode.length > 1) {
        brNode.shift();
      }
      rNode = rNode.concat(brNode)
      //console.log("single a:p  rNode:", rNode, "brNode:", brNode )
      rNode.sort(function (a, b) {
        return a.attrs.order - b.attrs.order;
      });
      //console.log("sorted rNode:",rNode)
    }
    //rtlStr = "";//"dir='"+isRTL+"'";
    var styleText = "";
    var marginsVer = getVerticalMargins(pNode, textBodyNode, type, idx, warpObj);
    if (marginsVer != "") {
      styleText = marginsVer;
    }
    if (styleText.indexOf("line-height:") === -1) {
      styleText += "line-height: " + DRAWINGML_SINGLE_LINE_HEIGHT + ";";
    }
    if (tbl_col_width !== undefined || type == "body" || type == "obj" || type == "shape") {
      styleText += "font-size: 0px;";
      //styleText += "line-height: 0;";
      styleText += "font-weight: 100;";
      styleText += "font-style: normal;";
    }
    var cssName = "";

    if (Object.prototype.hasOwnProperty.call(styleTable, styleText)) {
      cssName = styleTable[styleText]["name"];
    } else {
      cssName = "_css_" + (Object.keys(styleTable).length + 1);
      styleTable[styleText] = {
        "name": cssName,
        "text": styleText
      };
    }
    //console.log("textBodyNode: ", textBodyNode["a:lstStyle"])
    var prg_width_node = getTextByPathList(spNode, [ "p:spPr", "a:xfrm", "a:ext", "attrs", "cx" ]);
    if (prg_width_node === undefined) {
      prg_width_node = getTextByPathList(slideLayoutSpNode, [ "p:spPr", "a:xfrm", "a:ext", "attrs", "cx" ]);
    }
    if (prg_width_node === undefined) {
      prg_width_node = getTextByPathList(slideMasterSpNode, [ "p:spPr", "a:xfrm", "a:ext", "attrs", "cx" ]);
    }
    var prg_height_node = getTextByPathList(spNode, [ "p:spPr", "a:xfrm", "a:ext", "attrs", "cy" ]);
    if (prg_height_node === undefined) {
      prg_height_node = getTextByPathList(slideLayoutSpNode, [ "p:spPr", "a:xfrm", "a:ext", "attrs", "cy" ]);
    }
    if (prg_height_node === undefined) {
      prg_height_node = getTextByPathList(slideMasterSpNode, [ "p:spPr", "a:xfrm", "a:ext", "attrs", "cy" ]);
    }
    var sld_prg_width_px = prg_width_node !== undefined ? mapGroupSizeToPx(prg_width_node, "x", groupContext) : NaN;
    var sld_prg_width = Number.isFinite(sld_prg_width_px) ? ("width:" + sld_prg_width_px + "px;") : "width:inherit;";
    var sld_prg_height = "";
    var prg_dir = getPregraphDir(pNode, textBodyNode, idx, type, warpObj);
    text += "<div style='display: flex;" + sld_prg_width + sld_prg_height + "' class='slide-prgrph " + getHorizontalAlign(pNode, textBodyNode, idx, type, prg_dir, warpObj) + " " +
      prg_dir + " " + cssName + "' >";
    var buText_ary = await genBuChar(pNode, i, spNode, textBodyNode, pFontStyle, idx, type, warpObj);
    var isBullate = (buText_ary[0] !== undefined && buText_ary[0] !== null && buText_ary[0] != "") ? true : false;
    var bu_width = (buText_ary[1] !== undefined && buText_ary[1] !== null && isBullate) ? buText_ary[1] + buText_ary[2] : 0;
    text += (buText_ary[0] !== undefined) ? buText_ary[0] : "";
    //get text margin
    var margin_ary = getPregraphMargn(pNode, idx, type, isBullate, warpObj);
    var margin = margin_ary[0];
    var mrgin_val = margin_ary[1];
    if (prg_width_node === undefined && tbl_col_width !== undefined && tbl_col_width != 0) {
      //sorce : table text
      prg_width_node = tbl_col_width;
    }

    var prgrph_text = "";
    //var prgr_txt_art = [];
    var total_text_len = 0;
    var total_text_measured = false;
    if (rNode === undefined && pNode !== undefined) {
      // without r
      var prgr_text = await genSpanElement(pNode, undefined, spNode, textBodyNode, pFontStyle, slideLayoutSpNode, idx, type, 1, warpObj, isBullate);
      if (isBullate && typeof $ !== "undefined") {
        var txt_obj = $(prgr_text)
          .css({ 'position': 'absolute', 'float': 'left', 'white-space': 'nowrap', 'visibility': 'hidden' })
          .appendTo($('body'));
        total_text_len += txt_obj.outerWidth();
        total_text_measured = true;
        txt_obj.remove();
      }
      prgrph_text += prgr_text;
    } else if (rNode !== undefined) {
      // with multi r
      for (var j = 0; j < rNode.length; j++) {
        var prgr_text = await genSpanElement(rNode[j], j, pNode, textBodyNode, pFontStyle, slideLayoutSpNode, idx, type, rNode.length, warpObj, isBullate);
        if (isBullate && typeof $ !== "undefined") {
          var txt_obj = $(prgr_text)
            .css({ 'position': 'absolute', 'float': 'left', 'white-space': 'nowrap', 'visibility': 'hidden' })
            .appendTo($('body'));
          total_text_len += txt_obj.outerWidth();
          total_text_measured = true;
          txt_obj.remove();
        }
        prgrph_text += prgr_text;
      }
    }

    var prg_width_px = undefined;
    if (prg_width_node !== undefined) {
      prg_width_px = mapGroupSizeToPx(prg_width_node, "x", groupContext) - bu_width - mrgin_val;
    }
    if (isBullate) {
      //get prg_width_node if there is a bulltes
      //console.log("total_text_len: ", total_text_len, "prg_width_node:", prg_width_node)

      if (total_text_measured && prg_width_px !== undefined && total_text_len < prg_width_px) {
        prg_width_px = total_text_len + bu_width;
      }
    }
    var prg_width = ((prg_width_px !== undefined && !isNaN(prg_width_px)) ? ("width:" + prg_width_px) + "px;" : "width:inherit;");
    var paragraphContentHeight = tbl_col_width !== undefined
      ? "height:auto;min-height:0;max-height:100%;"
      : "height:100%;";
    var paragraphLineHeightMatch = /(?:^|;)line-height:\s*([^;]+)/.exec(styleText);
    var paragraphLineHeight = paragraphLineHeightMatch !== null
      ? paragraphLineHeightMatch[1]
      : DRAWINGML_SINGLE_LINE_HEIGHT;
    text += "<div style='" + paragraphContentHeight + "line-height:" + paragraphLineHeight + ";direction: initial;overflow-wrap:normal;word-wrap:normal;word-break:normal;" + prg_width + margin + "' >";
    text += prgrph_text;
    text += "</div>";
    text += "</div>";
  }

  return text;
}

async function genBuChar(node, i, spNode, textBodyNode, pFontStyle, idx, type, warpObj) {
  //console.log("genBuChar node: ", node, ", spNode: ", spNode, ", pFontStyle: ", pFontStyle, "type", type)
  ///////////////////////////////////////Amir///////////////////////////////
  var sldMstrTxtStyles = warpObj["slideMasterTextStyles"];
  var lstStyle = textBodyNode["a:lstStyle"];
  let bullet = ''

  var rNode = getTextByPathList(node, [ "a:r" ]);
  if (rNode !== undefined && rNode.constructor === Array) {
    rNode = rNode[0]; //bulvar only to first "a:r"
  }
  var lvl = parseInt(getTextByPathList(node["a:pPr"], [ "attrs", "lvl" ])) + 1;
  if (isNaN(lvl)) {
    lvl = 1;
  }
  var lvlStr = "a:lvl" + lvl + "pPr";
  var dfltBultColor, dfltBultSize, bultColor, bultSize, color_tye;

  if (rNode !== undefined) {
    dfltBultColor = await getFontColorPr(rNode, spNode, lstStyle, pFontStyle, lvl, idx, type, warpObj);
    color_tye = dfltBultColor[2];
    dfltBultSize = getFontSize(rNode, textBodyNode, pFontStyle, lvl, type, warpObj);
  } else {
    return "";
  }
  //console.log("Bulvar Size: " + bultSize);

  var bulvar = "", marRStr = "", marLStr = "", margin_val = 0, font_val = 0;
  /////////////////////////////////////////////////////////////////


  var pPrNode = node["a:pPr"];
  var BullNONE = getTextByPathList(pPrNode, [ "a:buNone" ]);
  if (BullNONE !== undefined) {
    return "";
  }

  var buType = "TYPE_NONE";

  var layoutMasterNode = getLayoutAndMasterNode(node, idx, type, warpObj);
  var pPrNodeLaout = layoutMasterNode.nodeLaout;
  var pPrNodeMaster = layoutMasterNode.nodeMaster;

  var buChar = getTextByPathList(pPrNode, [ "a:buChar", "attrs", "char" ]);
  var buNum = getTextByPathList(pPrNode, [ "a:buAutoNum", "attrs", "type" ]);
  var buPic = getTextByPathList(pPrNode, [ "a:buBlip" ]);
  if (buChar !== undefined) {
    buType = "TYPE_BULLET";
  }
  if (buNum !== undefined) {
    buType = "TYPE_NUMERIC";
  }
  if (buPic !== undefined) {
    buType = "TYPE_BULPIC";
  }

  var buFontSize = getTextByPathList(pPrNode, [ "a:buSzPts", "attrs", "val" ]);
  if (buFontSize === undefined) {
    buFontSize = getTextByPathList(pPrNode, [ "a:buSzPct", "attrs", "val" ]);
    if (buFontSize !== undefined) {
      var prcnt = parseInt(buFontSize) / 100000;
      //dfltBultSize = XXpt
      //var dfltBultSizeNoPt = dfltBultSize.substr(0, dfltBultSize.length - 2);
      var dfltBultSizeNoPt = parseInt(dfltBultSize, "px");
      bultSize = prcnt * (parseInt(dfltBultSizeNoPt)) + "px";// + "pt";
    }
  } else {
    bultSize = (parseInt(buFontSize) / 100) * fontSizeFactor + "px";
  }

  //get definde bulvar COLOR
  var buClrNode = getTextByPathList(pPrNode, [ "a:buClr" ]);


  if (buChar === undefined && buNum === undefined && buPic === undefined) {

    if (lstStyle !== undefined) {
      BullNONE = getTextByPathList(lstStyle, [ lvlStr, "a:buNone" ]);
      if (BullNONE !== undefined) {
        return "";
      }
      buType = "TYPE_NONE";
      buChar = getTextByPathList(lstStyle, [ lvlStr, "a:buChar", "attrs", "char" ]);
      buNum = getTextByPathList(lstStyle, [ lvlStr, "a:buAutoNum", "attrs", "type" ]);
      buPic = getTextByPathList(lstStyle, [ lvlStr, "a:buBlip" ]);
      if (buChar !== undefined) {
        buType = "TYPE_BULLET";
      }
      if (buNum !== undefined) {
        buType = "TYPE_NUMERIC";
      }
      if (buPic !== undefined) {
        buType = "TYPE_BULPIC";
      }
      if (buChar !== undefined || buNum !== undefined || buPic !== undefined) {
        pPrNode = lstStyle[lvlStr];
      }
    }
  }
  if (buChar === undefined && buNum === undefined && buPic === undefined) {
    //check in slidelayout and masterlayout - TODO
    if (pPrNodeLaout !== undefined) {
      BullNONE = getTextByPathList(pPrNodeLaout, [ "a:buNone" ]);
      if (BullNONE !== undefined) {
        return "";
      }
      buType = "TYPE_NONE";
      buChar = getTextByPathList(pPrNodeLaout, [ "a:buChar", "attrs", "char" ]);
      buNum = getTextByPathList(pPrNodeLaout, [ "a:buAutoNum", "attrs", "type" ]);
      buPic = getTextByPathList(pPrNodeLaout, [ "a:buBlip" ]);
      if (buChar !== undefined) {
        buType = "TYPE_BULLET";
      }
      if (buNum !== undefined) {
        buType = "TYPE_NUMERIC";
      }
      if (buPic !== undefined) {
        buType = "TYPE_BULPIC";
      }
    }
    if (buChar === undefined && buNum === undefined && buPic === undefined) {
      //masterlayout

      if (pPrNodeMaster !== undefined) {
        BullNONE = getTextByPathList(pPrNodeMaster, [ "a:buNone" ]);
        if (BullNONE !== undefined) {
          return "";
        }
        buType = "TYPE_NONE";
        buChar = getTextByPathList(pPrNodeMaster, [ "a:buChar", "attrs", "char" ]);
        buNum = getTextByPathList(pPrNodeMaster, [ "a:buAutoNum", "attrs", "type" ]);
        buPic = getTextByPathList(pPrNodeMaster, [ "a:buBlip" ]);
        if (buChar !== undefined) {
          buType = "TYPE_BULLET";
        }
        if (buNum !== undefined) {
          buType = "TYPE_NUMERIC";
        }
        if (buPic !== undefined) {
          buType = "TYPE_BULPIC";
        }
      }

    }

  }
  //rtl
  var getRtlVal = getTextByPathList(pPrNode, [ "attrs", "rtl" ]);
  if (getRtlVal === undefined) {
    getRtlVal = getTextByPathList(pPrNodeLaout, [ "attrs", "rtl" ]);
    if (getRtlVal === undefined && type != "shape") {
      getRtlVal = getTextByPathList(pPrNodeMaster, [ "attrs", "rtl" ]);
    }
  }
  var isRTL = false;
  if (getRtlVal !== undefined && getRtlVal == "1") {
    isRTL = true;
  }
  //align
  var alignNode = getTextByPathList(pPrNode, [ "attrs", "algn" ]); //"l" | "ctr" | "r" | "just" | "justLow" | "dist" | "thaiDist
  if (alignNode === undefined) {
    alignNode = getTextByPathList(pPrNodeLaout, [ "attrs", "algn" ]);
    if (alignNode === undefined) {
      alignNode = getTextByPathList(pPrNodeMaster, [ "attrs", "algn" ]);
    }
  }
  //indent?
  var indentNode = getTextByPathList(pPrNode, [ "attrs", "indent" ]);
  if (indentNode === undefined) {
    indentNode = getTextByPathList(pPrNodeLaout, [ "attrs", "indent" ]);
    if (indentNode === undefined) {
      indentNode = getTextByPathList(pPrNodeMaster, [ "attrs", "indent" ]);
    }
  }
  var indent = 0;
  if (indentNode !== undefined) {
    indent = parseInt(indentNode) * slideFactor;
  }
  //marL
  var marLNode = getTextByPathList(pPrNode, [ "attrs", "marL" ]);
  if (marLNode === undefined) {
    marLNode = getTextByPathList(pPrNodeLaout, [ "attrs", "marL" ]);
    if (marLNode === undefined) {
      marLNode = getTextByPathList(pPrNodeMaster, [ "attrs", "marL" ]);
    }
  }
  //console.log("genBuChar() isRTL", isRTL, "alignNode:", alignNode)
  if (marLNode !== undefined) {
    var marginLeft = parseInt(marLNode) * slideFactor;
    if (isRTL) {// && alignNode == "r") {
      marLStr = "padding-right:";// "margin-right: ";
    } else {
      marLStr = "padding-left:";//"margin-left: ";
    }
    margin_val = ((marginLeft + indent < 0) ? 0 : (marginLeft + indent));
    marLStr += margin_val + "px;";
  }

  //marR?
  var marRNode = getTextByPathList(pPrNode, [ "attrs", "marR" ]);
  if (marRNode === undefined && marLNode === undefined) {
    //need to check if this posble - TODO
    marRNode = getTextByPathList(pPrNodeLaout, [ "attrs", "marR" ]);
    if (marRNode === undefined) {
      marRNode = getTextByPathList(pPrNodeMaster, [ "attrs", "marR" ]);
    }
  }
  if (marRNode !== undefined) {
    var marginRight = parseInt(marRNode) * slideFactor;
    if (isRTL) {// && alignNode == "r") {
      marLStr = "padding-right:";// "margin-right: ";
    } else {
      marLStr = "padding-left:";//"margin-left: ";
    }
    marRStr += ((marginRight + indent < 0) ? 0 : (marginRight + indent)) + "px;";
  }

  if (buType != "TYPE_NONE") {
    //var buFontAttrs = getTextByPathList(pPrNode, ["a:buFont", "attrs"]);
  }
  //console.log("Bulvar Type: " + buType);
  //console.log("NumericTypr: " + buNum);
  //console.log("buChar: " + (buChar === undefined?'':buChar.charCodeAt(0)));
  //get definde bulvar COLOR
  if (buClrNode === undefined) {
    //lstStyle
    buClrNode = getTextByPathList(lstStyle, [ lvlStr, "a:buClr" ]);
  }
  if (buClrNode === undefined) {
    buClrNode = getTextByPathList(pPrNodeLaout, [ "a:buClr" ]);
    if (buClrNode === undefined) {
      buClrNode = getTextByPathList(pPrNodeMaster, [ "a:buClr" ]);
    }
  }
  var defBultColor;
  if (buClrNode !== undefined) {
    defBultColor = getSolidFill(buClrNode, undefined, undefined, warpObj);
  } else {
    if (pFontStyle !== undefined) {
      //console.log("genBuChar pFontStyle: ", pFontStyle)
      defBultColor = getSolidFill(pFontStyle, undefined, undefined, warpObj);
    }
  }
  if (defBultColor === undefined || defBultColor == "NONE") {
    bultColor = dfltBultColor;
  } else {
    bultColor = [ defBultColor, "", "solid" ];
    color_tye = "solid";
  }
  //console.log("genBuChar node:", node, "pPrNode", pPrNode, " buClrNode: ", buClrNode, "defBultColor:", defBultColor,"dfltBultColor:" , dfltBultColor , "bultColor:", bultColor)

  //console.log("genBuChar: buClrNode: ", buClrNode, "bultColor", bultColor)
  //get definde bulvar SIZE
  if (buFontSize === undefined) {
    buFontSize = getTextByPathList(pPrNodeLaout, [ "a:buSzPts", "attrs", "val" ]);
    if (buFontSize === undefined) {
      buFontSize = getTextByPathList(pPrNodeLaout, [ "a:buSzPct", "attrs", "val" ]);
      if (buFontSize !== undefined) {
        var prcnt = parseInt(buFontSize) / 100000;
        //var dfltBultSizeNoPt = dfltBultSize.substr(0, dfltBultSize.length - 2);
        var dfltBultSizeNoPt = parseInt(dfltBultSize, "px");
        bultSize = prcnt * (parseInt(dfltBultSizeNoPt)) + "px";// + "pt";
      }
    } else {
      bultSize = (parseInt(buFontSize) / 100) * fontSizeFactor + "px";
    }
  }
  if (buFontSize === undefined) {
    buFontSize = getTextByPathList(pPrNodeMaster, [ "a:buSzPts", "attrs", "val" ]);
    if (buFontSize === undefined) {
      buFontSize = getTextByPathList(pPrNodeMaster, [ "a:buSzPct", "attrs", "val" ]);
      if (buFontSize !== undefined) {
        var prcnt = parseInt(buFontSize) / 100000;
        //dfltBultSize = XXpt
        //var dfltBultSizeNoPt = dfltBultSize.substr(0, dfltBultSize.length - 2);
        var dfltBultSizeNoPt = parseInt(dfltBultSize, "px");
        bultSize = prcnt * (parseInt(dfltBultSizeNoPt)) + "px";// + "pt";
      }
    } else {
      bultSize = (parseInt(buFontSize) / 100) * fontSizeFactor + "px";
    }
  }
  if (buFontSize === undefined) {
    bultSize = dfltBultSize;
  }
  font_val = parseInt(bultSize, "px");
  ////////////////////////////////////////////////////////////////////////
  if (buType == "TYPE_BULLET") {
    var typefaceNode = getTextByPathList(pPrNode, [ "a:buFont", "attrs", "typeface" ]);
    var typeface = "";
    if (typefaceNode !== undefined) {
      var quotedTypeface = quoteCssFontFamily(typefaceNode);
      if (quotedTypeface !== undefined) {
        typeface = "font-family: " + quotedTypeface;
      }
    }
    // var marginLeft = parseInt(getTextByPathList(marLNode)) * slideFactor;
    // var marginRight = parseInt(getTextByPathList(marRNode)) * slideFactor;
    // if (isNaN(marginLeft)) {
    //     marginLeft = 328600 * slideFactor;
    // }
    // if (isNaN(marginRight)) {
    //     marginRight = 0;
    // }

    bulvar = "<div style='height: 100%;" + typeface + ";" +
      marLStr + marRStr +
      "font-size:" + bultSize + ";";

    //bulvar += "display: table-cell;";
    //"line-height: 0px;";
    if (color_tye == "solid") {
      if (bultColor[0] !== undefined && bultColor[0] != "") {
        bulvar += "color:#" + bultColor[0] + "; ";
      }
      if (bultColor[1] !== undefined && bultColor[1] != "" && bultColor[1] != ";") {
        bulvar += "text-shadow:" + bultColor[1] + ";";
      }
      //no highlight/background-color to bullet
      // if (bultColor[3] !== undefined && bultColor[3] != "") {
      //     styleText += "background-color: #" + bultColor[3] + ";";
      // }
    } else if (color_tye == "pattern" || color_tye == "pic" || color_tye == "gradient") {
      if (color_tye == "pattern") {
        bulvar += "background:" + bultColor[0][0] + ";";
        if (bultColor[0][1] !== null && bultColor[0][1] !== undefined && bultColor[0][1] != "") {
          bulvar += "background-size:" + bultColor[0][1] + ";";//" 2px 2px;" +
        }
        if (bultColor[0][2] !== null && bultColor[0][2] !== undefined && bultColor[0][2] != "") {
          bulvar += "background-position:" + bultColor[0][2] + ";";//" 2px 2px;" +
        }
        // bulvar += "-webkit-background-clip: text;" +
        //     "background-clip: text;" +
        //     "color: transparent;" +
        //     "-webkit-text-stroke: " + bultColor[1].border + ";" +
        //     "filter: " + bultColor[1].effcts + ";";
      } else if (color_tye == "pic") {
        bulvar += bultColor[0] + ";";
        // bulvar += "-webkit-background-clip: text;" +
        //     "background-clip: text;" +
        //     "color: transparent;" +
        //     "-webkit-text-stroke: " + bultColor[1].border + ";";

      } else if (color_tye == "gradient") {

        var colorAry = bultColor[0].color;
        var rot = bultColor[0].rot;

        bulvar += "background: linear-gradient(" + rot + "deg,";
        for (var i = 0; i < colorAry.length; i++) {
          if (i == colorAry.length - 1) {
            bulvar += "#" + colorAry[i] + ");";
          } else {
            bulvar += "#" + colorAry[i] + ", ";
          }
        }
        // bulvar += "color: transparent;" +
        //     "-webkit-background-clip: text;" +
        //     "background-clip: text;" +
        //     "-webkit-text-stroke: " + bultColor[1].border + ";";
      }
      bulvar += "-webkit-background-clip: text;" +
        "background-clip: text;" +
        "color: transparent;";
      if (bultColor[1].border !== undefined && bultColor[1].border !== "") {
        bulvar += "-webkit-text-stroke: " + bultColor[1].border + ";";
      }
      if (bultColor[1].effcts !== undefined && bultColor[1].effcts !== "") {
        bulvar += "filter: " + bultColor[1].effcts + ";";
      }
    }

    if (isRTL) {
      //bulvar += "display: inline-block;white-space: nowrap ;direction:rtl"; // float: right;
      bulvar += "white-space: nowrap ;direction:rtl"; // display: table-cell;;
    }
    var htmlBu = buChar;

    if (!isIE11) {
      //ie11 does not support unicode ?
      htmlBu = getHtmlBullet(typefaceNode, buChar);
    }
    bulvar += "'><div style='line-height: " + (font_val / 2) + "px;'>" + htmlBu + "</div></div>"; //font_val
    //}
    // else {
    //     marginLeft = 328600 * slideFactor * lvl;

    //     bulvar = "<div style='" + marLStr + "'>" + buChar + "</div>";
    // }
  } else if (buType == "TYPE_NUMERIC") { ///////////Amir///////////////////////////////
    //if (buFontAttrs !== undefined) {
    // var marginLeft = parseInt(getTextByPathList(pPrNode, ["attrs", "marL"])) * slideFactor;
    // var marginRight = parseInt(buFontAttrs["pitchFamily"]);

    // if (isNaN(marginLeft)) {
    //     marginLeft = 328600 * slideFactor;
    // }
    // if (isNaN(marginRight)) {
    //     marginRight = 0;
    // }
    //var typeface = buFontAttrs["typeface"];

    bulvar = "<div style='height: 100%;" + marLStr + marRStr +
      "color:#" + bultColor[0] + ";" +
      "font-size:" + bultSize + ";";// +
    //"line-height: 0px;";
    if (isRTL) {
      bulvar += "display: inline-block;white-space: nowrap ;direction:rtl;"; // float: right;
    } else {
      bulvar += "display: inline-block;white-space: nowrap ;direction:ltr;"; //float: left;
    }
    bulvar += "' data-bulltname = '" + buNum + "' data-bulltlvl = '" + lvl + "' class='numeric-bullet-style'></div>";
    // } else {
    //     marginLeft = 328600 * slideFactor * lvl;
    //     bulvar = "<div style='margin-left: " + marginLeft + "px;";
    //     if (isRTL) {
    //         bulvar += " float: right; direction:rtl;";
    //     } else {
    //         bulvar += " float: left; direction:ltr;";
    //     }
    //     bulvar += "' data-bulltname = '" + buNum + "' data-bulltlvl = '" + lvl + "' class='numeric-bullet-style'></div>";
    // }

  } else if (buType == "TYPE_BULPIC") { //PIC BULLET
    // var marginLeft = parseInt(getTextByPathList(pPrNode, ["attrs", "marL"])) * slideFactor;
    // var marginRight = parseInt(getTextByPathList(pPrNode, ["attrs", "marR"])) * slideFactor;

    // if (isNaN(marginRight)) {
    //     marginRight = 0;
    // }
    // //console.log("marginRight: "+marginRight)
    // //buPic
    // if (isNaN(marginLeft)) {
    //     marginLeft = 328600 * slideFactor;
    // } else {
    //     marginLeft = 0;
    // }
    //var buPicId = getTextByPathList(buPic, ["a:blip","a:extLst","a:ext","asvg:svgBlip" , "attrs", "r:embed"]);
    var buPicId = getTextByPathList(buPic, [ "a:blip", "attrs", "r:embed" ]);
    var svgPicPath = "";
    var buImg;
    if (buPicId !== undefined) {
      //svgPicPath = warpObj["slideResObj"][buPicId]["target"];
      //buImg = warpObj["zip"].file(svgPicPath).asText();
      //}else{
      //buPicId = getTextByPathList(buPic, ["a:blip", "attrs", "r:embed"]);
      var imgPath = warpObj["slideResObj"][buPicId]["target"];
      //console.log("imgPath: ", imgPath);
      var imgArrayBuffer = await warpObj["zip"].file(imgPath).async('arraybuffer');
      var imgExt = imgPath.split(".").pop();
      var imgMimeType = getMimeType(imgExt);
      buImg = "<img src='data:" + imgMimeType + ";base64," + base64ArrayBuffer(imgArrayBuffer) + "' style='width: 100%;'/>"// height: 100%
      //console.log("imgPath: "+imgPath+"\nimgMimeType: "+imgMimeType)
    }
    if (buPicId === undefined) {
      buImg = "&#8227;";
    }
    bulvar = "<div style='height: 100%;" + marLStr + marRStr +
      "width:" + bultSize + ";display: inline-block; ";// +
    //"line-height: 0px;";
    if (isRTL) {
      bulvar += "display: inline-block;white-space: nowrap ;direction:rtl;"; //direction:rtl; float: right;
    }
    bulvar += "'>" + buImg + "  </div>";
    //////////////////////////////////////////////////////////////////////////////////////
  }
  // else {
  //     bulvar = "<div style='margin-left: " + 328600 * slideFactor * lvl + "px" +
  //         "; margin-right: " + 0 + "px;'></div>";
  // }
  //console.log("genBuChar: width: ", $(bullet).outerWidth())
  return [ bulvar, margin_val, font_val ];//$(bullet).outerWidth()];
}
function getHtmlBullet(typefaceNode, buChar) {
  //http://www.alanwood.net/demos/wingdings.html
  //not work for IE11
  //console.log("genBuChar typefaceNode:", typefaceNode, " buChar:", buChar, "charCodeAt:", buChar.charCodeAt(0))
  switch (buChar) {
    case "§":
      return "&#9632;";//"■"; //9632 | U+25A0 | Black square
      break;
    case "q":
      return "&#10065;";//"❑"; // 10065 | U+2751 | Lower right shadowed white square
      break;
    case "v":
      return "&#10070;";//"❖"; //10070 | U+2756 | Black diamond minus white X
      break;
    case "Ø":
      return "&#11162;";//"⮚"; //11162 | U+2B9A | Three-D top-lighted rightwards equilateral arrowhead
      break;
    case "ü":
      return "&#10004;";//"✔";  //10004 | U+2714 | Heavy check mark
      break;
    default:
      if (/*typefaceNode == "Wingdings" ||*/ typefaceNode == "Wingdings 2" || typefaceNode == "Wingdings 3"){
        var wingCharCode =  getDingbatToUnicode(typefaceNode, buChar);
        if (wingCharCode !== null){
          return "&#" + wingCharCode + ";";
        }
      }
      return "&#" + (buChar.charCodeAt(0)) + ";";
  }
}
function getDingbatToUnicode(typefaceNode, buChar){
  const codePoint = buChar.codePointAt(0) & 0xFFF;
  return dingbatToUnicode.codePoint(typefaceNode, codePoint).codePoint
}

function getLayoutAndMasterNode(node, idx, type, warpObj) {
  var pPrNodeLaout, pPrNodeMaster;
  var pPrNode = node["a:pPr"];
  //lvl
  var lvl = 1;
  var lvlNode = getTextByPathList(pPrNode, ["attrs", "lvl"]);
  if (lvlNode !== undefined) {
    lvl = parseInt(lvlNode) + 1;
  }
  if (idx !== undefined) {
    //slidelayout
    pPrNodeLaout = getTextByPathList(warpObj["slideLayoutTables"]["idxTable"][idx], ["p:txBody", "a:lstStyle", "a:lvl" + lvl + "pPr"]);
    if (pPrNodeLaout === undefined) {
      pPrNodeLaout = getTextByPathList(warpObj["slideLayoutTables"]["idxTable"][idx], ["p:txBody", "a:p", "a:pPr"]);
      if (pPrNodeLaout === undefined) {
        pPrNodeLaout = getTextByPathList(warpObj["slideLayoutTables"]["idxTable"][idx], ["p:txBody", "a:p", (lvl - 1), "a:pPr"]);
      }
    }
  }
  if (type !== undefined) {
    //slidelayout
    var lvlStr = "a:lvl" + lvl + "pPr";
    if (pPrNodeLaout === undefined) {
      pPrNodeLaout = getTextByPathList(warpObj, ["slideLayoutTables", "typeTable", type, "p:txBody", "a:lstStyle", lvlStr]);
    }
    //masterlayout
    if (type == "title" || type == "ctrTitle") {
      pPrNodeMaster = getTextByPathList(warpObj, ["slideMasterTextStyles", "p:titleStyle", lvlStr]);
    } else if (type == "body" || type == "obj" || type == "subTitle") {
      pPrNodeMaster = getTextByPathList(warpObj, ["slideMasterTextStyles", "p:bodyStyle", lvlStr]);
    } else if (type == "shape" || type == "diagram") {
      pPrNodeMaster = getTextByPathList(warpObj, ["slideMasterTextStyles", "p:otherStyle", lvlStr]);
    } else if (type == "textBox") {
      pPrNodeMaster = getTextByPathList(warpObj, ["defaultTextStyle", lvlStr]);
    } else {
      pPrNodeMaster = getTextByPathList(warpObj, ["slideMasterTables", "typeTable", type, "p:txBody", "a:lstStyle", lvlStr]);
    }
  }
  return {
    "nodeLaout": pPrNodeLaout,
    "nodeMaster": pPrNodeMaster
  };
}
async function genSpanElement(node, rIndex, pNode, textBodyNode, pFontStyle, slideLayoutSpNode, idx, type, rNodeLength, warpObj, isBullate) {
  //https://codepen.io/imdunn/pen/GRgwaye ?
  var text_style = "";
  var lstStyle = textBodyNode["a:lstStyle"];
  var slideMasterTextStyles = warpObj["slideMasterTextStyles"];

  var text = node["a:t"];
  var fieldType = getTextByPathList(node, [ "a:fld", "attrs", "type" ]);
  if (typeof fieldType === "string" && fieldType.toLowerCase() === "slidenum") {
    text = String((warpObj && warpObj.slideNumber) || "");
  }
  //var text_count = text.length;

  var openElemnt = "<span";//"<bdi";
  var closeElemnt = "</span>";// "</bdi>";
  var styleText = "";
  if (text === undefined && node["type"] !== undefined) {
    if (is_first_br) {
      //openElemnt = "<br";
      //closeElemnt = "";
      //return "<br style='font-size: initial'>"
      is_first_br = false;
      return "<span class='line-break-br' ></span>";
    } else {
      // styleText += "display: block;";
      // openElemnt = "<sapn";
      // closeElemnt = "</sapn>";
    }

    styleText += "display: block;";
    //openElemnt = "<sapn";
    //closeElemnt = "</sapn>";
  } else {

    is_first_br = true;
  }
  if (typeof text !== 'string') {
    text = getTextByPathList(node, [ "a:fld", "a:t" ]);
    if (typeof text !== 'string') {
      text = "\u00a0";
      //return "<span class='text-block '>&nbsp;</span>";
    }
    // if (text === undefined) {
    //     return "";
    // }
  }

  var pPrNode = pNode["a:pPr"];
  //lvl
  var lvl = 1;
  var lvlNode = getTextByPathList(pPrNode, [ "attrs", "lvl" ]);
  if (lvlNode !== undefined) {
    lvl = parseInt(lvlNode) + 1;
  }
  //console.log("genSpanElement node: ", node, "rIndex: ", rIndex, ", pNode: ", pNode, ",pPrNode: ", pPrNode, "pFontStyle:", pFontStyle, ", idx: ", idx, "type:", type, warpObj);
  var layoutMasterNode = getLayoutAndMasterNode(pNode, idx, type, warpObj);
  var pPrNodeLaout = layoutMasterNode.nodeLaout;
  var pPrNodeMaster = layoutMasterNode.nodeMaster;

  //Language
  var lang = getTextByPathList(node, [ "a:rPr", "attrs", "lang" ]);
  var isRtlLan = (lang !== undefined && rtl_langs_array.indexOf(lang) !== -1) ? true : false;
  //rtl
  var getRtlVal = getTextByPathList(pPrNode, [ "attrs", "rtl" ]);
  if (getRtlVal === undefined) {
    getRtlVal = getTextByPathList(pPrNodeLaout, [ "attrs", "rtl" ]);
    if (getRtlVal === undefined && type != "shape") {
      getRtlVal = getTextByPathList(pPrNodeMaster, [ "attrs", "rtl" ]);
    }
  }
  var isRTL = false;
  var dirStr = "ltr";
  if (getRtlVal !== undefined && getRtlVal == "1") {
    isRTL = true;
    dirStr = "rtl";
  }

  var linkID = getTextByPathList(node, [ "a:rPr", "a:hlinkClick", "attrs", "r:id" ]);
  var linkTooltip = "";
  var defLinkClr;
  if (linkID !== undefined) {
    linkTooltip = getTextByPathList(node, [ "a:rPr", "a:hlinkClick", "attrs", "tooltip" ]);
    if (linkTooltip !== undefined) {
      linkTooltip = "title='" + escapeHtml(linkTooltip) + "'";
    }
    defLinkClr = getSchemeColorFromTheme("a:hlink", undefined, undefined, warpObj);

    var linkClrNode = getTextByPathList(node, [ "a:rPr", "a:solidFill" ]);// getTextByPathList(node, ["a:rPr", "a:solidFill"]);
    var rPrlinkClr = getSolidFill(linkClrNode, undefined, undefined, warpObj);


    //console.log("genSpanElement defLinkClr: ", defLinkClr, "rPrlinkClr:", rPrlinkClr)
    if (rPrlinkClr !== undefined && rPrlinkClr != "") {
      defLinkClr = rPrlinkClr;
    }

  }
  /////////////////////////////////////////////////////////////////////////////////////
  //getFontColor
  var fontClrPr = await getFontColorPr(node, pNode, lstStyle, pFontStyle, lvl, idx, type, warpObj);
  var fontClrType = fontClrPr[2];
  //console.log("genSpanElement fontClrPr: ", fontClrPr, "linkID", linkID);
  if (fontClrType == "solid") {
    if (linkID === undefined && fontClrPr[0] !== undefined && fontClrPr[0] != "") {
      styleText += "color: #" + fontClrPr[0] + ";";
    } else if (linkID !== undefined && defLinkClr !== undefined) {
      styleText += "color: #" + defLinkClr + ";";
    }

    if (fontClrPr[1] !== undefined && fontClrPr[1] != "" && fontClrPr[1] != ";") {
      styleText += "text-shadow:" + fontClrPr[1] + ";";
    }
    if (fontClrPr[3] !== undefined && fontClrPr[3] != "") {
      styleText += "background-color: #" + fontClrPr[3] + ";";
    }
  } else if (fontClrType == "pattern" || fontClrType == "pic" || fontClrType == "gradient") {
    if (fontClrType == "pattern") {
      styleText += "background:" + fontClrPr[0][0] + ";";
      if (fontClrPr[0][1] !== null && fontClrPr[0][1] !== undefined && fontClrPr[0][1] != "") {
        styleText += "background-size:" + fontClrPr[0][1] + ";";//" 2px 2px;" +
      }
      if (fontClrPr[0][2] !== null && fontClrPr[0][2] !== undefined && fontClrPr[0][2] != "") {
        styleText += "background-position:" + fontClrPr[0][2] + ";";//" 2px 2px;" +
      }
      // styleText += "-webkit-background-clip: text;" +
      //     "background-clip: text;" +
      //     "color: transparent;" +
      //     "-webkit-text-stroke: " + fontClrPr[1].border + ";" +
      //     "filter: " + fontClrPr[1].effcts + ";";
    } else if (fontClrType == "pic") {
      styleText += fontClrPr[0] + ";";
      // styleText += "-webkit-background-clip: text;" +
      //     "background-clip: text;" +
      //     "color: transparent;" +
      //     "-webkit-text-stroke: " + fontClrPr[1].border + ";";
    } else if (fontClrType == "gradient") {

      var colorAry = fontClrPr[0].color;
      var rot = fontClrPr[0].rot;

      styleText += "background: linear-gradient(" + rot + "deg,";
      for (var i = 0; i < colorAry.length; i++) {
        if (i == colorAry.length - 1) {
          styleText += "#" + colorAry[i] + ");";
        } else {
          styleText += "#" + colorAry[i] + ", ";
        }
      }
      // styleText += "-webkit-background-clip: text;" +
      //     "background-clip: text;" +
      //     "color: transparent;" +
      //     "-webkit-text-stroke: " + fontClrPr[1].border + ";";

    }
    styleText += "-webkit-background-clip: text;" +
      "background-clip: text;" +
      "color: transparent;";
    if (fontClrPr[1].border !== undefined && fontClrPr[1].border !== "") {
      styleText += "-webkit-text-stroke: " + fontClrPr[1].border + ";";
    }
    if (fontClrPr[1].effcts !== undefined && fontClrPr[1].effcts !== "") {
      styleText += "filter: " + fontClrPr[1].effcts + ";";
    }
  }
  var font_size = getFontSize(node, textBodyNode, pFontStyle, lvl, type, warpObj);
  //text_style += "font-size:" + font_size + ";"

  text_style += "font-size:" + font_size + ";" +
    // marLStr +
    "font-family:" + getFontType(node, type, warpObj, pFontStyle, text, lang, pPrNodeLaout, pPrNodeMaster, lvl) + ";" +
    "font-weight:" + getFontBold(node, type, slideMasterTextStyles, pPrNodeLaout, pPrNodeMaster, pNode) + ";" +
    "font-style:" + getFontItalic(node, type, slideMasterTextStyles, pPrNodeLaout, pPrNodeMaster, pNode) + ";" +
    "text-decoration:" + getFontDecoration(node, type, slideMasterTextStyles) + ";" +
    "text-align:" + getTextHorizontalAlign(node, pNode, type, warpObj) + ";" +
    "vertical-align:" + getTextVerticalAlign(node, type, slideMasterTextStyles) + ";";
  //rNodeLength
  //console.log("genSpanElement node:", node, "lang:", lang, "isRtlLan:", isRtlLan, "span parent dir:", dirStr)
  if (isRtlLan) { //|| rIndex === undefined
    styleText += "direction:rtl;";
  } else { //|| rIndex === undefined
    styleText += "direction:ltr;";
  }
  // } else if (dirStr == "rtl" && isRtlLan ) {
  //     styleText += "direction:rtl;";

  // } else if (dirStr == "ltr" && !isRtlLan ) {
  //     styleText += "direction:ltr;";
  // } else if (dirStr == "ltr" && isRtlLan){
  //     styleText += "direction:ltr;";
  // }else{
  //     styleText += "direction:inherit;";
  // }

  // if (dirStr == "rtl" && !isRtlLan) { //|| rIndex === undefined
  //     styleText += "direction:ltr;";
  // } else if (dirStr == "rtl" && isRtlLan) {
  //     styleText += "direction:rtl;";
  // } else if (dirStr == "ltr" && !isRtlLan) {
  //     styleText += "direction:ltr;";
  // } else if (dirStr == "ltr" && isRtlLan) {
  //     styleText += "direction:rtl;";
  // } else {
  //     styleText += "direction:inherit;";
  // }

  //     //"direction:" + dirStr + ";";
  //if (rNodeLength == 1 || rIndex == 0 ){
  //styleText += "display: table-cell;white-space: nowrap;";
  //}
  var highlight = getTextByPathList(node, [ "a:rPr", "a:highlight" ]);
  if (highlight !== undefined) {
    styleText += "background-color:#" + getSolidFill(highlight, undefined, undefined, warpObj) + ";";
    //styleText += "Opacity:" + getColorOpacity(highlight) + ";";
  }

  //letter-spacing:
  var spcNode = getTextByPathList(node, [ "a:rPr", "attrs", "spc" ]);
  if (spcNode === undefined) {
    spcNode = getTextByPathList(pPrNodeLaout, [ "a:defRPr", "attrs", "spc" ]);
    if (spcNode === undefined) {
      spcNode = getTextByPathList(pPrNodeMaster, [ "a:defRPr", "attrs", "spc" ]);
    }
  }
  if (spcNode !== undefined) {
    var ltrSpc = parseInt(spcNode) / 100; //pt
    styleText += "letter-spacing: " + ltrSpc + "px;";// + "pt;";
  }

  //Text Cap Types
  var capNode = getTextByPathList(node, [ "a:rPr", "attrs", "cap" ]);
  if (capNode === undefined) {
    capNode = getTextByPathList(pPrNodeLaout, [ "a:defRPr", "attrs", "cap" ]);
    if (capNode === undefined) {
      capNode = getTextByPathList(pPrNodeMaster, [ "a:defRPr", "attrs", "cap" ]);
    }
  }
  if (capNode == "small" || capNode == "all") {
    styleText += "text-transform: uppercase";
  }
  //styleText += "word-break: break-word;";
  //console.log("genSpanElement node: ", node, ", capNode: ", capNode, ",pPrNodeLaout: ", pPrNodeLaout, ", pPrNodeMaster: ", pPrNodeMaster, "warpObj:", warpObj);

  var cssName = "";

  if (Object.prototype.hasOwnProperty.call(styleTable, styleText)) {
    cssName = styleTable[styleText]["name"];
  } else {
    cssName = "_css_" + (Object.keys(styleTable).length + 1);
    styleTable[styleText] = {
      "name": cssName,
      "text": styleText
    };
  }
  var linkColorSyle = "";
  if (fontClrType == "solid" && linkID !== undefined) {
    linkColorSyle = "style='color: inherit;'";
  }

  if (linkID !== undefined && linkID != "") {
    var linkURL = sanitizePptxHyperlinkTarget(warpObj["slideResObj"][linkID]["target"]);
    if (linkURL !== "") {
      linkURL = escapeHtml(linkURL);
      return openElemnt + " class='text-block " + cssName + "' style='" + text_style + "'><a href='" + linkURL + "' " + linkColorSyle + "  " + linkTooltip + " target='_blank' rel='noopener noreferrer'>" +
        escapeTextForHtml(text) + "</a>" + closeElemnt;
    }
  }
  return openElemnt + " class='text-block " + cssName + "' style='" + text_style + "'>" + escapeTextForHtml(text) + closeElemnt;//"</bdi>";

}

function getPregraphMargn(pNode, idx, type, isBullate, warpObj){
  if (!isBullate){
    return ["",0];
  }
  var marLStr = "", marRStr = "" , maginVal = 0;
  var pPrNode = pNode["a:pPr"];
  var layoutMasterNode = getLayoutAndMasterNode(pNode, idx, type, warpObj);
  var pPrNodeLaout = layoutMasterNode.nodeLaout;
  var pPrNodeMaster = layoutMasterNode.nodeMaster;

  // var lang = getTextByPathList(node, ["a:rPr", "attrs", "lang"]);
  // var isRtlLan = (lang !== undefined && rtl_langs_array.indexOf(lang) !== -1) ? true : false;
  //rtl
  var getRtlVal = getTextByPathList(pPrNode, ["attrs", "rtl"]);
  if (getRtlVal === undefined) {
    getRtlVal = getTextByPathList(pPrNodeLaout, ["attrs", "rtl"]);
    if (getRtlVal === undefined && type != "shape") {
      getRtlVal = getTextByPathList(pPrNodeMaster, ["attrs", "rtl"]);
    }
  }
  var isRTL = false;
  var dirStr = "ltr";
  if (getRtlVal !== undefined && getRtlVal == "1") {
    isRTL = true;
    dirStr = "rtl";
  }

  //align
  var alignNode = getTextByPathList(pPrNode, ["attrs", "algn"]); //"l" | "ctr" | "r" | "just" | "justLow" | "dist" | "thaiDist
  if (alignNode === undefined) {
    alignNode = getTextByPathList(pPrNodeLaout, ["attrs", "algn"]);
    if (alignNode === undefined) {
      alignNode = getTextByPathList(pPrNodeMaster, ["attrs", "algn"]);
    }
  }
  //indent?
  var indentNode = getTextByPathList(pPrNode, ["attrs", "indent"]);
  if (indentNode === undefined) {
    indentNode = getTextByPathList(pPrNodeLaout, ["attrs", "indent"]);
    if (indentNode === undefined) {
      indentNode = getTextByPathList(pPrNodeMaster, ["attrs", "indent"]);
    }
  }
  var indent = 0;
  if (indentNode !== undefined) {
    indent = parseInt(indentNode) * slideFactor;
  }
  //
  //marL
  var marLNode = getTextByPathList(pPrNode, ["attrs", "marL"]);
  if (marLNode === undefined) {
    marLNode = getTextByPathList(pPrNodeLaout, ["attrs", "marL"]);
    if (marLNode === undefined) {
      marLNode = getTextByPathList(pPrNodeMaster, ["attrs", "marL"]);
    }
  }
  var marginLeft = 0;
  if (marLNode !== undefined) {
    marginLeft = parseInt(marLNode) * slideFactor;
  }
  if ((indentNode !== undefined || marLNode !== undefined)) {
    //var lvlIndent = defTabSz * lvl;

    if (isRTL) {// && alignNode == "r") {
      //marLStr = "margin-right: ";
      marLStr = "padding-right: ";
    } else {
      //marLStr = "margin-left: ";
      marLStr = "padding-left: ";
    }
    if (isBullate) {
      maginVal = Math.abs(0 - indent);
      marLStr += maginVal + "px;";  // (minus bullate numeric lenght/size - TODO
    } else {
      maginVal = Math.abs(marginLeft + indent);
      marLStr += maginVal + "px;";  // (minus bullate numeric lenght/size - TODO
    }
  }

  //marR?
  var marRNode = getTextByPathList(pPrNode, ["attrs", "marR"]);
  if (marRNode === undefined && marLNode === undefined) {
    //need to check if this posble - TODO
    marRNode = getTextByPathList(pPrNodeLaout, ["attrs", "marR"]);
    if (marRNode === undefined) {
      marRNode = getTextByPathList(pPrNodeMaster, ["attrs", "marR"]);
    }
  }
  if (marRNode !== undefined && isBullate) {
    var marginRight = parseInt(marRNode) * slideFactor;
    if (isRTL) {// && alignNode == "r") {
      //marRStr = "margin-right: ";
      marRStr = "padding-right: ";
    } else {
      //marRStr = "margin-left: ";
      marRStr = "padding-left: ";
    }
    marRStr += Math.abs(0 - indent) + "px;";
  }
  return [marLStr, maginVal];
}

export function genGlobalCSS() {
  var cssText = "";
  //console.log("styleTable: ", styleTable)
  for (var key of Object.keys(styleTable)) {
    var styleRecord = styleTable[key];
    if (!styleRecord || typeof styleRecord["name"] !== "string" || typeof styleRecord["text"] !== "string") {
      continue;
    }
    var tagname = "";
    //ADD suffix
    cssText += tagname + " ." + styleRecord["name"] +
      ((styleRecord["suffix"]) ? styleRecord["suffix"] : "") +
      "{" + styleRecord["text"] + "}\n"; //section > div
  }
  return cssText;
}

async function genTable(node, warpObj, groupContext) {
  var order = node["attrs"]["order"];
  var tableNode = getTextByPathList(node, [ "a:graphic", "a:graphicData", "a:tbl" ]);
  var xfrmNode = getTextByPathList(node, [ "p:xfrm" ]);
  /////////////////////////////////////////Amir////////////////////////////////////////////////
  var getTblPr = getTextByPathList(node, [ "a:graphic", "a:graphicData", "a:tbl", "a:tblPr" ]);
  var getColsGrid = getTextByPathList(node, [ "a:graphic", "a:graphicData", "a:tbl", "a:tblGrid", "a:gridCol" ]);
  var tblDir = "";
  if (getTblPr !== undefined) {
    var isRTL = getTblPr["attrs"]["rtl"];
    tblDir = (isRTL == 1 ? "dir=rtl" : "dir=ltr");
  }
  var firstRowAttr = getTblPr["attrs"]["firstRow"]; //associated element <a:firstRow> in the table styles
  var firstColAttr = getTblPr["attrs"]["firstCol"]; //associated element <a:firstCol> in the table styles
  var lastRowAttr = getTblPr["attrs"]["lastRow"]; //associated element <a:lastRow> in the table styles
  var lastColAttr = getTblPr["attrs"]["lastCol"]; //associated element <a:lastCol> in the table styles
  var bandRowAttr = getTblPr["attrs"]["bandRow"]; //associated element <a:band1H>, <a:band2H> in the table styles
  var bandColAttr = getTblPr["attrs"]["bandCol"]; //associated element <a:band1V>, <a:band2V> in the table styles
  //console.log("getTblPr: ", getTblPr);
  var tblStylAttrObj = {
    isFrstRowAttr: (firstRowAttr !== undefined && firstRowAttr == "1") ? 1 : 0,
    isFrstColAttr: (firstColAttr !== undefined && firstColAttr == "1") ? 1 : 0,
    isLstRowAttr: (lastRowAttr !== undefined && lastRowAttr == "1") ? 1 : 0,
    isLstColAttr: (lastColAttr !== undefined && lastColAttr == "1") ? 1 : 0,
    isBandRowAttr: (bandRowAttr !== undefined && bandRowAttr == "1") ? 1 : 0,
    isBandColAttr: (bandColAttr !== undefined && bandColAttr == "1") ? 1 : 0
  }

  var thisTblStyle;
  var tbleStyleId = getTblPr["a:tableStyleId"];
  if (tbleStyleId !== undefined) {
    var tbleStylList = tableStyles["a:tblStyleLst"]["a:tblStyle"];
    if (tbleStylList !== undefined) {
      if (tbleStylList.constructor === Array) {
        for (var k = 0; k < tbleStylList.length; k++) {
          if (tbleStylList[k]["attrs"]["styleId"] == tbleStyleId) {
            thisTblStyle = tbleStylList[k];
          }
        }
      } else {
        if (tbleStylList["attrs"]["styleId"] == tbleStyleId) {
          thisTblStyle = tbleStylList;
        }
      }
    }
  }
  if (thisTblStyle !== undefined) {
    thisTblStyle["tblStylAttrObj"] = tblStylAttrObj;
    warpObj["thisTbiStyle"] = thisTblStyle;
  }
  var tblStyl = getTextByPathList(thisTblStyle, [ "a:wholeTbl", "a:tcStyle" ]);
  var tblBorderStyl = getTextByPathList(tblStyl, [ "a:tcBdr" ]);
  var tbl_borders = "";
  if (tblBorderStyl !== undefined) {
    tbl_borders = getTableBorders(tblBorderStyl, warpObj);
  }
  var tbl_bgcolor = "";
  var tbl_opacity = 1;
  var tbl_bgFillschemeClr = getTextByPathList(thisTblStyle, [ "a:tblBg", "a:fillRef" ]);
  //console.log( "thisTblStyle:", thisTblStyle, "warpObj:", warpObj)
  if (tbl_bgFillschemeClr !== undefined) {
    tbl_bgcolor = getSolidFill(tbl_bgFillschemeClr, undefined, undefined, warpObj);
  }
  if (tbl_bgFillschemeClr === undefined) {
    tbl_bgFillschemeClr = getTextByPathList(thisTblStyle, [ "a:wholeTbl", "a:tcStyle", "a:fill", "a:solidFill" ]);
    tbl_bgcolor = getSolidFill(tbl_bgFillschemeClr, undefined, undefined, warpObj);
  }
  if (tbl_bgcolor !== "") {
    tbl_bgcolor = "background-color: #" + tbl_bgcolor + ";";
  }
  ////////////////////////////////////////////////////////////////////////////////////////////
  var tableHtml = "<table " + tblDir + " style='border-collapse:collapse;table-layout:fixed;box-sizing:border-box;overflow:hidden;" +
    getPosition(xfrmNode, node, undefined, undefined, "group", groupContext) +
    getSize(xfrmNode, undefined, undefined, groupContext) +
    " z-index: " + order + ";" +
    tbl_borders + ";" +
    tbl_bgcolor + "'>";

  var trNodes = tableNode["a:tr"];
  if (trNodes.constructor !== Array) {
    trNodes = [ trNodes ];
  }
  var tableRowHeights = trNodes.map(function (rowNode) {
    var height = parseInt(getTextByPathList(rowNode, [ "attrs", "h" ]));
    return Number.isFinite(height) && height > 0 ? height * slideFactor : 0;
  });
  //if (trNodes.constructor === Array) {
  //multi rows
  var totalrowSpan = 0;
  var rowSpanAry = [];
  for (var i = 0; i < trNodes.length; i++) {
    //////////////rows Style ////////////Amir
    var rowHeightParam = trNodes[i]["attrs"]["h"];
    var rowHeight = 0;
    var rowsStyl = "box-sizing:border-box;overflow:hidden;";
    if (rowHeightParam !== undefined) {
      rowHeight = parseInt(rowHeightParam) * slideFactor;
      rowsStyl += "height:" + rowHeight + "px;";
    }
    var fillColor = "";
    var row_borders = "";
    var fontClrPr = "";
    var fontWeight = "";
    var band_1H_fillColor;
    var band_2H_fillColor;

    if (thisTblStyle !== undefined && thisTblStyle["a:wholeTbl"] !== undefined) {
      var bgFillschemeClr = getTextByPathList(thisTblStyle, [ "a:wholeTbl", "a:tcStyle", "a:fill", "a:solidFill" ]);
      if (bgFillschemeClr !== undefined) {
        var local_fillColor = getSolidFill(bgFillschemeClr, undefined, undefined, warpObj);
        if (local_fillColor !== undefined) {
          fillColor = local_fillColor;
        }
      }
      var rowTxtStyl = getTextByPathList(thisTblStyle, [ "a:wholeTbl", "a:tcTxStyle" ]);
      if (rowTxtStyl !== undefined) {
        var local_fontColor = getSolidFill(rowTxtStyl, undefined, undefined, warpObj);
        if (local_fontColor !== undefined) {
          fontClrPr = local_fontColor;
        }

        var local_fontWeight = ((getTextByPathList(rowTxtStyl, [ "attrs", "b" ]) == "on") ? "bold" : "");
        if (local_fontWeight != "") {
          fontWeight = local_fontWeight
        }
      }
    }

    if (i == 0 && tblStylAttrObj["isFrstRowAttr"] == 1 && thisTblStyle !== undefined) {

      var bgFillschemeClr = getTextByPathList(thisTblStyle, [ "a:firstRow", "a:tcStyle", "a:fill", "a:solidFill" ]);
      if (bgFillschemeClr !== undefined) {
        var local_fillColor = getSolidFill(bgFillschemeClr, undefined, undefined, warpObj);
        if (local_fillColor !== undefined) {
          fillColor = local_fillColor;
        }
      }
      var borderStyl = getTextByPathList(thisTblStyle, [ "a:firstRow", "a:tcStyle", "a:tcBdr" ]);
      if (borderStyl !== undefined) {
        var local_row_borders = getTableBorders(borderStyl, warpObj);
        if (local_row_borders != "") {
          row_borders = local_row_borders;
        }
      }
      var rowTxtStyl = getTextByPathList(thisTblStyle, [ "a:firstRow", "a:tcTxStyle" ]);
      if (rowTxtStyl !== undefined) {
        var local_fontClrPr = getSolidFill(rowTxtStyl, undefined, undefined, warpObj);
        if (local_fontClrPr !== undefined) {
          fontClrPr = local_fontClrPr;
        }
        var local_fontWeight = ((getTextByPathList(rowTxtStyl, [ "attrs", "b" ]) == "on") ? "bold" : "");
        if (local_fontWeight !== "") {
          fontWeight = local_fontWeight;
        }
      }

    } else if (i > 0 && tblStylAttrObj["isBandRowAttr"] == 1 && thisTblStyle !== undefined) {
      fillColor = "";
      row_borders = undefined;
      if ((i % 2) == 0 && thisTblStyle["a:band2H"] !== undefined) {
        // console.log("i: ", i, 'thisTblStyle["a:band2H"]:', thisTblStyle["a:band2H"])
        //check if there is a row bg
        var bgFillschemeClr = getTextByPathList(thisTblStyle, [ "a:band2H", "a:tcStyle", "a:fill", "a:solidFill" ]);
        if (bgFillschemeClr !== undefined) {
          var local_fillColor = getSolidFill(bgFillschemeClr, undefined, undefined, warpObj);
          if (local_fillColor !== "") {
            fillColor = local_fillColor;
            band_2H_fillColor = local_fillColor;
          }
        }


        var borderStyl = getTextByPathList(thisTblStyle, [ "a:band2H", "a:tcStyle", "a:tcBdr" ]);
        if (borderStyl !== undefined) {
          var local_row_borders = getTableBorders(borderStyl, warpObj);
          if (local_row_borders != "") {
            row_borders = local_row_borders;
          }
        }
        var rowTxtStyl = getTextByPathList(thisTblStyle, [ "a:band2H", "a:tcTxStyle" ]);
        if (rowTxtStyl !== undefined) {
          var local_fontClrPr = getSolidFill(rowTxtStyl, undefined, undefined, warpObj);
          if (local_fontClrPr !== undefined) {
            fontClrPr = local_fontClrPr;
          }
        }

        var local_fontWeight = ((getTextByPathList(rowTxtStyl, [ "attrs", "b" ]) == "on") ? "bold" : "");

        if (local_fontWeight !== "") {
          fontWeight = local_fontWeight;
        }
      }
      if ((i % 2) != 0 && thisTblStyle["a:band1H"] !== undefined) {
        var bgFillschemeClr = getTextByPathList(thisTblStyle, [ "a:band1H", "a:tcStyle", "a:fill", "a:solidFill" ]);
        if (bgFillschemeClr !== undefined) {
          var local_fillColor = getSolidFill(bgFillschemeClr, undefined, undefined, warpObj);
          if (local_fillColor !== undefined) {
            fillColor = local_fillColor;
            band_1H_fillColor = local_fillColor;
          }
        }
        var borderStyl = getTextByPathList(thisTblStyle, [ "a:band1H", "a:tcStyle", "a:tcBdr" ]);
        if (borderStyl !== undefined) {
          var local_row_borders = getTableBorders(borderStyl, warpObj);
          if (local_row_borders != "") {
            row_borders = local_row_borders;
          }
        }
        var rowTxtStyl = getTextByPathList(thisTblStyle, [ "a:band1H", "a:tcTxStyle" ]);
        if (rowTxtStyl !== undefined) {
          var local_fontClrPr = getSolidFill(rowTxtStyl, undefined, undefined, warpObj);
          if (local_fontClrPr !== undefined) {
            fontClrPr = local_fontClrPr;
          }
          var local_fontWeight = ((getTextByPathList(rowTxtStyl, [ "attrs", "b" ]) == "on") ? "bold" : "");
          if (local_fontWeight != "") {
            fontWeight = local_fontWeight;
          }
        }
      }

    }
    //last row
    if (i == (trNodes.length - 1) && tblStylAttrObj["isLstRowAttr"] == 1 && thisTblStyle !== undefined) {
      var bgFillschemeClr = getTextByPathList(thisTblStyle, [ "a:lastRow", "a:tcStyle", "a:fill", "a:solidFill" ]);
      if (bgFillschemeClr !== undefined) {
        var local_fillColor = getSolidFill(bgFillschemeClr, undefined, undefined, warpObj);
        if (local_fillColor !== undefined) {
          fillColor = local_fillColor;
        }
        // var local_colorOpacity = getColorOpacity(bgFillschemeClr);
        // if(local_colorOpacity !== undefined){
        //     colorOpacity = local_colorOpacity;
        // }
      }
      var borderStyl = getTextByPathList(thisTblStyle, [ "a:lastRow", "a:tcStyle", "a:tcBdr" ]);
      if (borderStyl !== undefined) {
        var local_row_borders = getTableBorders(borderStyl, warpObj);
        if (local_row_borders != "") {
          row_borders = local_row_borders;
        }
      }
      var rowTxtStyl = getTextByPathList(thisTblStyle, [ "a:lastRow", "a:tcTxStyle" ]);
      if (rowTxtStyl !== undefined) {
        var local_fontClrPr = getSolidFill(rowTxtStyl, undefined, undefined, warpObj);
        if (local_fontClrPr !== undefined) {
          fontClrPr = local_fontClrPr;
        }

        var local_fontWeight = ((getTextByPathList(rowTxtStyl, [ "attrs", "b" ]) == "on") ? "bold" : "");
        if (local_fontWeight !== "") {
          fontWeight = local_fontWeight;
        }
      }
    }
    rowsStyl += ((row_borders !== undefined) ? row_borders : "");
    rowsStyl += ((fontClrPr !== undefined) ? " color: #" + fontClrPr + ";" : "");
    rowsStyl += ((fontWeight != "") ? " font-weight:" + fontWeight + ";" : "");
    if (fillColor !== undefined && fillColor != "") {
      //rowsStyl += "background-color: rgba(" + hexToRgbNew(fillColor) + "," + colorOpacity + ");";
      rowsStyl += "background-color: #" + fillColor + ";";
    }
    tableHtml += "<tr style='" + rowsStyl + "'>";
    ////////////////////////////////////////////////

    var tcNodes = trNodes[i]["a:tc"];
    if (tcNodes !== undefined) {
      if (tcNodes.constructor === Array) {
        //multi columns
        var j = 0;
        if (rowSpanAry.length == 0) {
          rowSpanAry = Array.apply(null, Array(tcNodes.length)).map(function () {
            return 0
          });
        }
        var totalColSpan = 0;
        while (j < tcNodes.length) {
          if (rowSpanAry[j] == 0 && totalColSpan == 0) {
            var a_sorce;
            //j=0 : first col
            if (j == 0 && tblStylAttrObj["isFrstColAttr"] == 1) {
              a_sorce = "a:firstCol";
              if (tblStylAttrObj["isLstRowAttr"] == 1 && i == (trNodes.length - 1) &&
                getTextByPathList(thisTblStyle, [ "a:seCell" ]) !== undefined) {
                a_sorce = "a:seCell";
              } else if (tblStylAttrObj["isFrstRowAttr"] == 1 && i == 0 &&
                getTextByPathList(thisTblStyle, [ "a:neCell" ]) !== undefined) {
                a_sorce = "a:neCell";
              }
            } else if ((j > 0 && tblStylAttrObj["isBandColAttr"] == 1) &&
              !(tblStylAttrObj["isFrstColAttr"] == 1 && i == 0) &&
              !(tblStylAttrObj["isLstRowAttr"] == 1 && i == (trNodes.length - 1)) &&
              j != (tcNodes.length - 1)) {

              if ((j % 2) != 0) {

                var aBandNode = getTextByPathList(thisTblStyle, [ "a:band2V" ]);
                if (aBandNode === undefined) {
                  aBandNode = getTextByPathList(thisTblStyle, [ "a:band1V" ]);
                  if (aBandNode !== undefined) {
                    a_sorce = "a:band2V";
                  }
                } else {
                  a_sorce = "a:band2V";
                }

              }
            }

            if (j == (tcNodes.length - 1) && tblStylAttrObj["isLstColAttr"] == 1) {
              a_sorce = "a:lastCol";
              if (tblStylAttrObj["isLstRowAttr"] == 1 && i == (trNodes.length - 1) && getTextByPathList(thisTblStyle, [ "a:swCell" ]) !== undefined) {
                a_sorce = "a:swCell";
              } else if (tblStylAttrObj["isFrstRowAttr"] == 1 && i == 0 && getTextByPathList(thisTblStyle, [ "a:nwCell" ]) !== undefined) {
                a_sorce = "a:nwCell";
              }
            }

            var cellParmAry = await getTableCellParams(tcNodes[j], getColsGrid, i, j, thisTblStyle, a_sorce, warpObj, tableRowHeights)
            var text = cellParmAry[0];
            var colStyl = cellParmAry[1];
            var cssName = cellParmAry[2];
            var rowSpan = cellParmAry[3];
            var colSpan = cellParmAry[4];


            if (rowSpan !== undefined) {
              totalrowSpan++;
              rowSpanAry[j] = parseInt(rowSpan) - 1;
              tableHtml += "<td class='" + cssName + "' data-row='" + i + "," + j + "' rowspan ='" +
                parseInt(rowSpan) + "' style='" + colStyl + "'>" + text + "</td>";
            } else if (colSpan !== undefined) {
              tableHtml += "<td class='" + cssName + "' data-row='" + i + "," + j + "' colspan = '" +
                parseInt(colSpan) + "' style='" + colStyl + "'>" + text + "</td>";
              totalColSpan = parseInt(colSpan) - 1;
            } else {
              tableHtml += "<td class='" + cssName + "' data-row='" + i + "," + j + "' style = '" + colStyl + "'>" + text + "</td>";
            }

          } else {
            if (rowSpanAry[j] != 0) {
              rowSpanAry[j] -= 1;
            }
            if (totalColSpan != 0) {
              totalColSpan--;
            }
          }
          j++;
        }
      } else {
        //single column

        var a_sorce;
        if (tblStylAttrObj["isFrstColAttr"] == 1 && !(tblStylAttrObj["isLstRowAttr"] == 1)) {
          a_sorce = "a:firstCol";

        } else if ((tblStylAttrObj["isBandColAttr"] == 1) && !(tblStylAttrObj["isLstRowAttr"] == 1)) {

          var aBandNode = getTextByPathList(thisTblStyle, [ "a:band2V" ]);
          if (aBandNode === undefined) {
            aBandNode = getTextByPathList(thisTblStyle, [ "a:band1V" ]);
            if (aBandNode !== undefined) {
              a_sorce = "a:band2V";
            }
          } else {
            a_sorce = "a:band2V";
          }
        }

        if (tblStylAttrObj["isLstColAttr"] == 1 && !(tblStylAttrObj["isLstRowAttr"] == 1)) {
          a_sorce = "a:lastCol";
        }


        var cellParmAry = await getTableCellParams(tcNodes, getColsGrid, i, undefined, thisTblStyle, a_sorce, warpObj, tableRowHeights)
        var text = cellParmAry[0];
        var colStyl = cellParmAry[1];
        var cssName = cellParmAry[2];
        var rowSpan = cellParmAry[3];

        if (rowSpan !== undefined) {
          tableHtml += "<td  class='" + cssName + "' rowspan='" + parseInt(rowSpan) + "' style = '" + colStyl + "'>" + text + "</td>";
        } else {
          tableHtml += "<td class='" + cssName + "' style='" + colStyl + "'>" + text + "</td>";
        }
      }
    }
    tableHtml += "</tr>";
  }
  //////////////////////////////////////////////////////////////////////////////////


  return tableHtml;
}

async function getTableCellParams(tcNodes, getColsGrid, row_idx, col_idx, thisTblStyle, cellSource, warpObj, tableRowHeights) {
  //thisTblStyle["a:band1V"] => thisTblStyle[cellSource]
  //text, cell-width, cell-borders,
  //var text = genTextBody(tcNodes["a:txBody"], tcNodes, undefined, undefined, undefined, undefined, warpObj);//tableStyles
  var rowSpan = getTextByPathList(tcNodes, [ "attrs", "rowSpan" ]);
  var colSpan = getTextByPathList(tcNodes, [ "attrs", "gridSpan" ]);
  var vMerge = getTextByPathList(tcNodes, [ "attrs", "vMerge" ]);
  var hMerge = getTextByPathList(tcNodes, [ "attrs", "hMerge" ]);
  var cellInsets = resolveDrawingMlTableCellInsets(
    getTextByPathList(tcNodes, [ "a:tcPr", "attrs" ]) || {}
  );
  var colStyl = "box-sizing:border-box;min-width:0;overflow:hidden;word-wrap:break-word;padding:0;";
  var colWidth;
  var celFillColor = "";
  var col_borders = "";
  var colFontClrPr = "";
  var colFontWeight = "";
  var lin_bottm = "",
    lin_top = "",
    lin_left = "",
    lin_right = "",
    lin_bottom_left_to_top_right = "",
    lin_top_left_to_bottom_right = "";

  var colSapnInt = parseInt(colSpan);
  var total_col_width = 0;
  if (!isNaN(colSapnInt) && colSapnInt > 1) {
    for (var k = 0; k < colSapnInt; k++) {
      total_col_width += parseInt(getTextByPathList(getColsGrid[col_idx + k], [ "attrs", "w" ]));
    }
  } else {
    total_col_width = getTextByPathList((col_idx === undefined) ? getColsGrid : getColsGrid[col_idx], [ "attrs", "w" ]);
  }


  var text = await genTextBody(tcNodes["a:txBody"], tcNodes, undefined, undefined, undefined, undefined, warpObj, total_col_width);//tableStyles
  var rowSpanCount = Number.isFinite(parseInt(rowSpan)) && parseInt(rowSpan) > 1
    ? parseInt(rowSpan)
    : 1;
  var cellHeight = Array.isArray(tableRowHeights)
    ? tableRowHeights.slice(row_idx, row_idx + rowSpanCount).reduce(function (total, height) {
      return total + height;
    }, 0)
    : 0;
  var cellHeightStyle = cellHeight > 0
    ? "height:" + cellHeight + "px;min-height:0;max-height:" + cellHeight + "px;"
    : "";
  text = "<div class='pptx-table-cell-content' style='box-sizing:border-box;overflow:hidden;line-height:" + DRAWINGML_SINGLE_LINE_HEIGHT + ";" +
    cellHeightStyle + "padding:" + cellInsets.top + "px " + cellInsets.right + "px " +
    cellInsets.bottom + "px " + cellInsets.left + "px;'>" + text + "</div>";
  if (cellHeight > 0) {
    colStyl += "height:" + cellHeight + "px;";
  }

  if (total_col_width != 0 /*&& row_idx == 0*/) {
    colWidth = parseInt(total_col_width) * slideFactor;
    colStyl += "width:" + colWidth + "px;";
  }

  //cell bords
  lin_bottm = getTextByPathList(tcNodes, [ "a:tcPr", "a:lnB" ]);
  if (lin_bottm === undefined && cellSource !== undefined) {
    if (cellSource !== undefined)
      lin_bottm = getTextByPathList(thisTblStyle[cellSource], [ "a:tcStyle", "a:tcBdr", "a:bottom", "a:ln" ]);
    if (lin_bottm === undefined) {
      lin_bottm = getTextByPathList(thisTblStyle, [ "a:wholeTbl", "a:tcStyle", "a:tcBdr", "a:bottom", "a:ln" ]);
    }
  }
  lin_top = getTextByPathList(tcNodes, [ "a:tcPr", "a:lnT" ]);
  if (lin_top === undefined) {
    if (cellSource !== undefined)
      lin_top = getTextByPathList(thisTblStyle[cellSource], [ "a:tcStyle", "a:tcBdr", "a:top", "a:ln" ]);
    if (lin_top === undefined) {
      lin_top = getTextByPathList(thisTblStyle, [ "a:wholeTbl", "a:tcStyle", "a:tcBdr", "a:top", "a:ln" ]);
    }
  }
  lin_left = getTextByPathList(tcNodes, [ "a:tcPr", "a:lnL" ]);
  if (lin_left === undefined) {
    if (cellSource !== undefined)
      lin_left = getTextByPathList(thisTblStyle[cellSource], [ "a:tcStyle", "a:tcBdr", "a:left", "a:ln" ]);
    if (lin_left === undefined) {
      lin_left = getTextByPathList(thisTblStyle, [ "a:wholeTbl", "a:tcStyle", "a:tcBdr", "a:left", "a:ln" ]);
    }
  }
  lin_right = getTextByPathList(tcNodes, [ "a:tcPr", "a:lnR" ]);
  if (lin_right === undefined) {
    if (cellSource !== undefined)
      lin_right = getTextByPathList(thisTblStyle[cellSource], [ "a:tcStyle", "a:tcBdr", "a:right", "a:ln" ]);
    if (lin_right === undefined) {
      lin_right = getTextByPathList(thisTblStyle, [ "a:wholeTbl", "a:tcStyle", "a:tcBdr", "a:right", "a:ln" ]);
    }
  }
  lin_bottom_left_to_top_right = getTextByPathList(tcNodes, [ "a:tcPr", "a:lnBlToTr" ]);
  lin_top_left_to_bottom_right = getTextByPathList(tcNodes, [ "a:tcPr", "a:InTlToBr" ]);

  if (lin_bottm !== undefined && lin_bottm != "") {
    var bottom_line_border = getBorder(lin_bottm, undefined, false, "", warpObj)
    if (bottom_line_border != "") {
      colStyl += "border-bottom:" + bottom_line_border + ";";
    }
  }
  if (lin_top !== undefined && lin_top != "") {
    var top_line_border = getBorder(lin_top, undefined, false, "", warpObj);
    if (top_line_border != "") {
      colStyl += "border-top: " + top_line_border + ";";
    }
  }
  if (lin_left !== undefined && lin_left != "") {
    var left_line_border = getBorder(lin_left, undefined, false, "", warpObj)
    if (left_line_border != "") {
      colStyl += "border-left: " + left_line_border + ";";
    }
  }
  if (lin_right !== undefined && lin_right != "") {
    var right_line_border = getBorder(lin_right, undefined, false, "", warpObj)
    if (right_line_border != "") {
      colStyl += "border-right:" + right_line_border + ";";
    }
  }

  //cell fill color custom
  var getCelFill = getTextByPathList(tcNodes, [ "a:tcPr" ]);
  if (getCelFill !== undefined && getCelFill != "") {
    var cellObj = {
      "p:spPr": getCelFill
    };
    celFillColor = await getShapeFill(cellObj, undefined, false, warpObj, "slide")
  }

  //cell fill color theme
  if (celFillColor == "" || celFillColor == "background-color: inherit;") {
    var bgFillschemeClr;
    if (cellSource !== undefined)
      bgFillschemeClr = getTextByPathList(thisTblStyle, [ cellSource, "a:tcStyle", "a:fill", "a:solidFill" ]);
    if (bgFillschemeClr !== undefined) {
      var local_fillColor = getSolidFill(bgFillschemeClr, undefined, undefined, warpObj);
      if (local_fillColor !== undefined) {
        celFillColor = " background-color: #" + local_fillColor + ";";
      }
    }
  }
  var cssName = "";
  if (celFillColor !== undefined && celFillColor != "") {
    if (Object.prototype.hasOwnProperty.call(styleTable, celFillColor)) {
      cssName = styleTable[celFillColor]["name"];
    } else {
      cssName = "_tbl_cell_css_" + (Object.keys(styleTable).length + 1);
      styleTable[celFillColor] = {
        "name": cssName,
        "text": celFillColor
      };
    }

  }

  //border
  // var borderStyl = getTextByPathList(thisTblStyle, [cellSource, "a:tcStyle", "a:tcBdr"]);
  // if (borderStyl !== undefined) {
  //     var local_col_borders = getTableBorders(borderStyl, warpObj);
  //     if (local_col_borders != "") {
  //         col_borders = local_col_borders;
  //     }
  // }
  // if (col_borders != "") {
  //     colStyl += col_borders;
  // }

  //Text style
  var rowTxtStyl;
  if (cellSource !== undefined) {
    rowTxtStyl = getTextByPathList(thisTblStyle, [ cellSource, "a:tcTxStyle" ]);
  }
  // if (rowTxtStyl === undefined) {
  //     rowTxtStyl = getTextByPathList(thisTblStyle, ["a:wholeTbl", "a:tcTxStyle"]);
  // }
  if (rowTxtStyl !== undefined) {
    var local_fontClrPr = getSolidFill(rowTxtStyl, undefined, undefined, warpObj);
    if (local_fontClrPr !== undefined) {
      colFontClrPr = local_fontClrPr;
    }
    var local_fontWeight = ((getTextByPathList(rowTxtStyl, [ "attrs", "b" ]) == "on") ? "bold" : "");
    if (local_fontWeight !== "") {
      colFontWeight = local_fontWeight;
    }
  }
  colStyl += ((colFontClrPr !== "") ? "color: #" + colFontClrPr + ";" : "");
  colStyl += ((colFontWeight != "") ? " font-weight:" + colFontWeight + ";" : "");

  return [ text, colStyl, cssName, rowSpan, colSpan ];
}

async function genChart(node, warpObj, groupContext) {

  var order = node["attrs"]["order"];
  var xfrmNode = getTextByPathList(node, ["p:xfrm"]);
  var result = "<div id='chart" + chartID + "' class='block content' style='" +
    getPosition(xfrmNode, node, undefined, undefined, "group", groupContext) + getSize(xfrmNode, undefined, undefined, groupContext) +
    " z-index: " + order + ";'></div>";

  var rid = node["a:graphic"]["a:graphicData"]["c:chart"]["attrs"]["r:id"];
  var refName = warpObj["slideResObj"][rid]["target"];
  var content = await readXmlFile(warpObj["zip"], refName);
  var plotArea = getTextByPathList(content, ["c:chartSpace", "c:chart", "c:plotArea"]);

  var chartData = null;
  for (var key in plotArea) {
    switch (key) {
      case "c:lineChart":
        chartData = {
          "type": "createChart",
          "data": {
            "chartID": "chart" + chartID,
            "chartType": "lineChart",
            "chartData": extractChartData(plotArea[key]["c:ser"])
          }
        };
        break;
      case "c:barChart":
        chartData = {
          "type": "createChart",
          "data": {
            "chartID": "chart" + chartID,
            "chartType": "barChart",
            "chartData": extractChartData(plotArea[key]["c:ser"])
          }
        };
        break;
      case "c:pieChart":
        chartData = {
          "type": "createChart",
          "data": {
            "chartID": "chart" + chartID,
            "chartType": "pieChart",
            "chartData": extractChartData(plotArea[key]["c:ser"])
          }
        };
        break;
      case "c:pie3DChart":
        chartData = {
          "type": "createChart",
          "data": {
            "chartID": "chart" + chartID,
            "chartType": "pie3DChart",
            "chartData": extractChartData(plotArea[key]["c:ser"])
          }
        };
        break;
      case "c:areaChart":
        chartData = {
          "type": "createChart",
          "data": {
            "chartID": "chart" + chartID,
            "chartType": "areaChart",
            "chartData": extractChartData(plotArea[key]["c:ser"])
          }
        };
        break;
      case "c:scatterChart":
        chartData = {
          "type": "createChart",
          "data": {
            "chartID": "chart" + chartID,
            "chartType": "scatterChart",
            "chartData": extractChartData(plotArea[key]["c:ser"])
          }
        };
        break;
      case "c:catAx":
        break;
      case "c:valAx":
        break;
      default:
    }
  }

  if (chartData !== null) {
    Charts.MsgQueue.push(chartData);
  }

  chartID++;
  return result;
}

async function genDiagram(node, warpObj, source, sType, groupContext) {
  //console.log(warpObj)
  //readXmlFile(zip, sldFileName)
  /**files define the diagram:
   * 1-colors#.xml,
   * 2-data#.xml,
   * 3-layout#.xml,
   * 4-quickStyle#.xml.
   * 5-drawing#.xml, which Microsoft added as an extension for persisting diagram layout information.
   */
    ///get colors#.xml, data#.xml , layout#.xml , quickStyle#.xml
  var order = node["attrs"]["order"];
  var zip = warpObj["zip"];
  var xfrmNode = getTextByPathList(node, ["p:xfrm"]);
  var dgmRelIds = getTextByPathList(node, ["a:graphic", "a:graphicData", "dgm:relIds", "attrs"]);
  //console.log(dgmRelIds)
  var dgmClrFileId = dgmRelIds["r:cs"];
  var dgmDataFileId = dgmRelIds["r:dm"];
  var dgmLayoutFileId = dgmRelIds["r:lo"];
  var dgmQuickStyleFileId = dgmRelIds["r:qs"];
  var dgmClrFileName = warpObj["slideResObj"][dgmClrFileId].target,
    dgmDataFileName = warpObj["slideResObj"][dgmDataFileId].target,
    dgmLayoutFileName = warpObj["slideResObj"][dgmLayoutFileId].target,
    dgmQuickStyleFileName = warpObj["slideResObj"][dgmQuickStyleFileId].target;
  //console.log("dgmClrFileName: " , dgmClrFileName,", dgmDataFileName: ",dgmDataFileName,", dgmLayoutFileName: ",dgmLayoutFileName,", dgmQuickStyleFileName: ",dgmQuickStyleFileName);
  var dgmClr = await readXmlFile(zip, dgmClrFileName);
  var dgmData = await readXmlFile(zip, dgmDataFileName);
  var dgmLayout = await readXmlFile(zip, dgmLayoutFileName);
  var dgmQuickStyle = await readXmlFile(zip, dgmQuickStyleFileName);
  //console.log(dgmClr,dgmData,dgmLayout,dgmQuickStyle)
  ///get drawing#.xml
  // var dgmDrwFileName = "";
  // var dataModelExt = getTextByPathList(dgmData, ["dgm:dataModel", "dgm:extLst", "a:ext", "dsp:dataModelExt", "attrs"]);
  // if (dataModelExt !== undefined) {
  //     var dgmDrwFileId = dataModelExt["relId"];
  //     dgmDrwFileName = warpObj["slideResObj"][dgmDrwFileId]["target"];
  // }
  // var dgmDrwFile = "";
  // if (dgmDrwFileName != "") {
  //     dgmDrwFile = await readXmlFile(zip, dgmDrwFileName);
  // }
  // var dgmDrwSpArray = getTextByPathList(dgmDrwFile, ["dsp:drawing", "dsp:spTree", "dsp:sp"]);
  //var dgmDrwSpArray = getTextByPathList(warpObj["digramFileContent"], ["dsp:drawing", "dsp:spTree", "dsp:sp"]);
  var dgmDrwSpArray = getTextByPathList(warpObj["digramFileContent"], ["p:drawing", "p:spTree", "p:sp"]);
  var rslt = "";
  if (dgmDrwSpArray !== undefined) {
    var dgmDrwSpArrayLen = dgmDrwSpArray.length;
    for (var i = 0; i < dgmDrwSpArrayLen; i++) {
      var dspSp = dgmDrwSpArray[i];
      // var dspSpObjToStr = JSON.stringify(dspSp);
      // var pSpStr = dspSpObjToStr.replace(/dsp:/g, "p:");
      // var pSpStrToObj = JSON.parse(pSpStr);
      //console.log("pSpStrToObj[" + i + "]: ", pSpStrToObj);
      //rslt += processSpNode(pSpStrToObj, node, warpObj, "diagramBg", sType)
      rslt += await processSpNode(dspSp, node, warpObj, "diagramBg", sType, groupContext)
    }
    // dgmDrwFile: "dsp:"-> "p:"
  }

  return "<div class='block diagram-content' style='" +
    getPosition(xfrmNode, node, undefined, undefined, sType, groupContext) +
    getSize(xfrmNode, undefined, undefined, groupContext) +
    "'>" + rslt + "</div>";
}

function getPosition(slideSpNode, pNode, slideLayoutSpNode, slideMasterSpNode, sType, groupContext) {
  var off;
  var x = -1, y = -1;

  if (slideSpNode !== undefined) {
    off = getTextByPathList(slideSpNode, ["a:off", "attrs"]);
  }

  if (off === undefined && slideLayoutSpNode !== undefined) {
    off = getTextByPathList(slideLayoutSpNode, ["a:off", "attrs"]);
  } else if (off === undefined && slideMasterSpNode !== undefined) {
    off = getTextByPathList(slideMasterSpNode, ["a:off", "attrs"]);
  }

  if (off === undefined) {
    return "";
  }

  x = mapGroupCoordinateToPx(off["x"], "x", groupContext);
  y = mapGroupCoordinateToPx(off["y"], "y", groupContext);

  return (isNaN(x) || isNaN(y)) ? "" : "top:" + y + "px; left:" + x + "px;";
}

function getSize(slideSpNode, slideLayoutSpNode, slideMasterSpNode, groupContext) {
  var ext = undefined;
  var w = -1, h = -1;

  if (slideSpNode !== undefined) {
    ext = getTextByPathList(slideSpNode, ["a:ext", "attrs"]);
  } else if (slideLayoutSpNode !== undefined) {
    ext = getTextByPathList(slideLayoutSpNode, ["a:ext", "attrs"]);
  } else if (slideMasterSpNode !== undefined) {
    ext = getTextByPathList(slideMasterSpNode, ["a:ext", "attrs"]);
  }

  if (ext === undefined) {
    return "";
  } else {
    w = mapGroupSizeToPx(ext["cx"], "x", groupContext);
    h = mapGroupSizeToPx(ext["cy"], "y", groupContext);
    return (isNaN(w) || isNaN(h)) ? "" : "width:" + w + "px; height:" + h + "px;";
  }

}
function getVerticalMargins(pNode, textBodyNode, type, idx, warpObj) {
  //margin-top ;
  //a:pPr => a:spcBef => a:spcPts (/100) | a:spcPct (/?)
  //margin-bottom
  //a:pPr => a:spcAft => a:spcPts (/100) | a:spcPct (/?)
  //+
  //a:pPr =>a:lnSpc => a:spcPts (/?) | a:spcPct (/?)
  //console.log("getVerticalMargins ", pNode, type,idx, warpObj)
  //var lstStyle = textBodyNode["a:lstStyle"];
  var lvl = 1
  var spcBefNode = getTextByPathList(pNode, ["a:pPr", "a:spcBef", "a:spcPts", "attrs", "val"]);
  var spcAftNode = getTextByPathList(pNode, ["a:pPr", "a:spcAft", "a:spcPts", "attrs", "val"]);
  var lnSpcNode = getTextByPathList(pNode, ["a:pPr", "a:lnSpc", "a:spcPct", "attrs", "val"]);
  var lnSpcNodeType = "Pct";
  if (lnSpcNode === undefined) {
    lnSpcNode = getTextByPathList(pNode, ["a:pPr", "a:lnSpc", "a:spcPts", "attrs", "val"]);
    if (lnSpcNode !== undefined) {
      lnSpcNodeType = "Pts";
    }
  }
  var lvlNode = getTextByPathList(pNode, ["a:pPr", "attrs", "lvl"]);
  if (lvlNode !== undefined) {
    lvl = parseInt(lvlNode) + 1;
  }
  var fontSize;
  if (getTextByPathList(pNode, ["a:r"]) !== undefined) {
    var fontSizeStr = getFontSize(pNode["a:r"], textBodyNode,undefined, lvl, type, warpObj);
    if (fontSizeStr != "inherit") {
      fontSize = parseInt(fontSizeStr, "px"); //pt
    }
  }
  //var spcBef = "";
  //console.log("getVerticalMargins 1", fontSizeStr, fontSize, lnSpcNode, parseInt(lnSpcNode) / 100000, spcBefNode, spcAftNode)
  // if(spcBefNode !== undefined){
  //     spcBef = "margin-top:" + parseInt(spcBefNode)/100 + "pt;"
  // }
  // else{
  //    //i did not found case with percentage
  //     spcBefNode = getTextByPathList(pNode, ["a:pPr", "a:spcBef", "a:spcPct","attrs","val"]);
  //     if(spcBefNode !== undefined){
  //         spcBef = "margin-top:" + parseInt(spcBefNode)/100 + "%;"
  //     }
  // }
  //var spcAft = "";
  // if(spcAftNode !== undefined){
  //     spcAft = "margin-bottom:" + parseInt(spcAftNode)/100 + "pt;"
  // }
  // else{
  //    //i did not found case with percentage
  //     spcAftNode = getTextByPathList(pNode, ["a:pPr", "a:spcAft", "a:spcPct","attrs","val"]);
  //     if(spcAftNode !== undefined){
  //         spcBef = "margin-bottom:" + parseInt(spcAftNode)/100 + "%;"
  //     }
  // }
  // if(spcAftNode !== undefined){
  //     //check in layout and then in master
  // }
  var isInLayoutOrMaster = true;
  if(type == "shape" || type == "textBox"){
    isInLayoutOrMaster = false;
  }
  if (isInLayoutOrMaster && (spcBefNode === undefined || spcAftNode === undefined || lnSpcNode === undefined)) {
    //check in layout
    if (idx !== undefined) {
      var laypPrNode = getTextByPathList(warpObj, ["slideLayoutTables", "idxTable", idx, "p:txBody", "a:p", (lvl - 1), "a:pPr"]);

      if (spcBefNode === undefined) {
        spcBefNode = getTextByPathList(laypPrNode, ["a:spcBef", "a:spcPts", "attrs", "val"]);
        // if(spcBefNode !== undefined){
        //     spcBef = "margin-top:" + parseInt(spcBefNode)/100 + "pt;"
        // }
        // else{
        //    //i did not found case with percentage
        //     spcBefNode = getTextByPathList(laypPrNode, ["a:spcBef", "a:spcPct","attrs","val"]);
        //     if(spcBefNode !== undefined){
        //         spcBef = "margin-top:" + parseInt(spcBefNode)/100 + "%;"
        //     }
        // }
      }

      if (spcAftNode === undefined) {
        spcAftNode = getTextByPathList(laypPrNode, ["a:spcAft", "a:spcPts", "attrs", "val"]);
        // if(spcAftNode !== undefined){
        //     spcAft = "margin-bottom:" + parseInt(spcAftNode)/100 + "pt;"
        // }
        // else{
        //    //i did not found case with percentage
        //     spcAftNode = getTextByPathList(laypPrNode, ["a:spcAft", "a:spcPct","attrs","val"]);
        //     if(spcAftNode !== undefined){
        //         spcBef = "margin-bottom:" + parseInt(spcAftNode)/100 + "%;"
        //     }
        // }
      }

      if (lnSpcNode === undefined) {
        lnSpcNode = getTextByPathList(laypPrNode, ["a:lnSpc", "a:spcPct", "attrs", "val"]);
        if (lnSpcNode === undefined) {
          lnSpcNode = getTextByPathList(laypPrNode, ["a:pPr", "a:lnSpc", "a:spcPts", "attrs", "val"]);
          if (lnSpcNode !== undefined) {
            lnSpcNodeType = "Pts";
          }
        }
      }
    }

  }
  if (isInLayoutOrMaster && (spcBefNode === undefined || spcAftNode === undefined || lnSpcNode === undefined)) {
    //check in master
    //slideMasterTextStyles
    var slideMasterTextStyles = warpObj["slideMasterTextStyles"];
    var dirLoc = "";
    var lvl = "a:lvl" + lvl + "pPr";
    switch (type) {
      case "title":
      case "ctrTitle":
        dirLoc = "p:titleStyle";
        break;
      case "body":
      case "obj":
      case "dt":
      case "ftr":
      case "sldNum":
      case "textBox":
        // case "shape":
        dirLoc = "p:bodyStyle";
        break;
      case "shape":
      //case "textBox":
      default:
        dirLoc = "p:otherStyle";
    }
    // if (type == "shape" || type == "textBox") {
    //     lvl = "a:lvl1pPr";
    // }
    var inLvlNode = getTextByPathList(slideMasterTextStyles, [dirLoc, lvl]);
    if (inLvlNode !== undefined) {
      if (spcBefNode === undefined) {
        spcBefNode = getTextByPathList(inLvlNode, ["a:spcBef", "a:spcPts", "attrs", "val"]);
        // if(spcBefNode !== undefined){
        //     spcBef = "margin-top:" + parseInt(spcBefNode)/100 + "pt;"
        // }
        // else{
        //    //i did not found case with percentage
        //     spcBefNode = getTextByPathList(inLvlNode, ["a:spcBef", "a:spcPct","attrs","val"]);
        //     if(spcBefNode !== undefined){
        //         spcBef = "margin-top:" + parseInt(spcBefNode)/100 + "%;"
        //     }
        // }
      }

      if (spcAftNode === undefined) {
        spcAftNode = getTextByPathList(inLvlNode, ["a:spcAft", "a:spcPts", "attrs", "val"]);
        // if(spcAftNode !== undefined){
        //     spcAft = "margin-bottom:" + parseInt(spcAftNode)/100 + "pt;"
        // }
        // else{
        //    //i did not found case with percentage
        //     spcAftNode = getTextByPathList(inLvlNode, ["a:spcAft", "a:spcPct","attrs","val"]);
        //     if(spcAftNode !== undefined){
        //         spcBef = "margin-bottom:" + parseInt(spcAftNode)/100 + "%;"
        //     }
        // }
      }

      if (lnSpcNode === undefined) {
        lnSpcNode = getTextByPathList(inLvlNode, ["a:lnSpc", "a:spcPct", "attrs", "val"]);
        if (lnSpcNode === undefined) {
          lnSpcNode = getTextByPathList(inLvlNode, ["a:pPr", "a:lnSpc", "a:spcPts", "attrs", "val"]);
          if (lnSpcNode !== undefined) {
            lnSpcNodeType = "Pts";
          }
        }
      }
    }
  }
  var spcBefor = 0, spcAfter = 0;
  var marginTopBottomStr = "";
  if (spcBefNode !== undefined) {
    spcBefor = parseInt(spcBefNode) / 100 * fontSizeFactor;
  }
  if (spcAftNode !== undefined) {
    spcAfter = parseInt(spcAftNode) / 100 * fontSizeFactor;
  }

  if (lnSpcNode !== undefined && fontSize !== undefined) {
    if (lnSpcNodeType == "Pts") {
      var lineHeightPx = parseInt(lnSpcNode) / 100 * fontSizeFactor;
      if (Number.isFinite(lineHeightPx) && lineHeightPx > 0) {
        marginTopBottomStr += "line-height: " + lineHeightPx + "px;";
      }
    } else {
      var fct = parseInt(lnSpcNode) / 100000;
      if (Number.isFinite(fct) && fct > 0) {
        marginTopBottomStr += "line-height: " + fct + ";";
      }
    }
  }

  if (spcBefNode !== undefined) {
    marginTopBottomStr += "margin-top: " + Math.max(0, spcBefor) + "px;";
  }
  if (spcAftNode !== undefined) {
    marginTopBottomStr += "margin-bottom: " + Math.max(0, spcAfter) + "px;";
  }

  //console.log("getVerticalMargins 2 fontSize:", fontSize, "lnSpcNode:", lnSpcNode, "spcLines:", spcLines, "spcBefor:", spcBefor, "spcAfter:", spcAfter)
  //console.log("getVerticalMargins 3 ", marginTopBottomStr, pNode, warpObj)

  //return spcAft + spcBef;
  return marginTopBottomStr;
}
function getHorizontalAlign(node, textBodyNode, idx, type, prg_dir, warpObj) {
  var algn = getTextByPathList(node, ["a:pPr", "attrs", "algn"]);
  if (algn === undefined) {
    //var layoutMasterNode = getLayoutAndMasterNode(node, idx, type, warpObj);
    // var pPrNodeLaout = layoutMasterNode.nodeLaout;
    // var pPrNodeMaster = layoutMasterNode.nodeMaster;
    var lvlIdx = 1;
    var lvlNode = getTextByPathList(node, ["a:pPr", "attrs", "lvl"]);
    if (lvlNode !== undefined) {
      lvlIdx = parseInt(lvlNode) + 1;
    }
    var lvlStr = "a:lvl" + lvlIdx + "pPr";

    var lstStyle = textBodyNode["a:lstStyle"];
    algn = getTextByPathList(lstStyle, [lvlStr, "attrs", "algn"]);

    if (algn === undefined && idx !== undefined ) {
      //slidelayout
      algn = getTextByPathList(warpObj["slideLayoutTables"]["idxTable"][idx], ["p:txBody", "a:lstStyle", lvlStr, "attrs", "algn"]);
      if (algn === undefined) {
        algn = getTextByPathList(warpObj["slideLayoutTables"]["idxTable"][idx], ["p:txBody", "a:p", "a:pPr", "attrs", "algn"]);
        if (algn === undefined) {
          algn = getTextByPathList(warpObj["slideLayoutTables"]["idxTable"][idx], ["p:txBody", "a:p", (lvlIdx - 1), "a:pPr", "attrs", "algn"]);
        }
      }
    }
    if (algn === undefined) {
      if (type !== undefined) {
        //slidelayout
        algn = getTextByPathList(warpObj, ["slideLayoutTables", "typeTable", type, "p:txBody", "a:lstStyle", lvlStr, "attrs", "algn"]);

        if (algn === undefined) {
          //masterlayout
          if (type == "title" || type == "ctrTitle") {
            algn = getTextByPathList(warpObj, ["slideMasterTextStyles", "p:titleStyle", lvlStr, "attrs", "algn"]);
          } else if (type == "body" || type == "obj" || type == "subTitle") {
            algn = getTextByPathList(warpObj, ["slideMasterTextStyles", "p:bodyStyle", lvlStr, "attrs", "algn"]);
          } else if (type == "shape" || type == "diagram") {
            algn = getTextByPathList(warpObj, ["slideMasterTextStyles", "p:otherStyle", lvlStr, "attrs", "algn"]);
          } else if (type == "textBox") {
            algn = getTextByPathList(warpObj, ["defaultTextStyle", lvlStr, "attrs", "algn"]);
          } else {
            algn = getTextByPathList(warpObj, ["slideMasterTables", "typeTable", type, "p:txBody", "a:lstStyle", lvlStr, "attrs", "algn"]);
          }
        }
      } else {
        algn = getTextByPathList(warpObj, ["slideMasterTextStyles", "p:bodyStyle", lvlStr, "attrs", "algn"]);
      }
    }
  }

  if (algn === undefined) {
    if (type == "title" || type == "subTitle" || type == "ctrTitle") {
      return "h-mid";
    } else if (type == "sldNum") {
      return "h-right";
    }
  }
  if (algn !== undefined) {
    switch (algn) {
      case "l":
        if (prg_dir == "pregraph-rtl"){
          //return "h-right";
          return "h-left-rtl";
        }else{
          return "h-left";
        }
        break;
      case "r":
        if (prg_dir == "pregraph-rtl") {
          //return "h-left";
          return "h-right-rtl";
        }else{
          return "h-right";
        }
        break;
      case "ctr":
        return "h-mid";
        break;
      case "just":
      case "dist":
      default:
        return "h-" + algn;
    }
  }
  //return algn === "ctr" ? "h-mid" : algn === "r" ? "h-right" : "h-left";
}
function getPregraphDir(node, textBodyNode, idx, type, warpObj) {
  var rtl = getTextByPathList(node, ["a:pPr", "attrs", "rtl"]);
  //console.log("getPregraphDir node:", node, "textBodyNode", textBodyNode, "rtl:", rtl, "idx", idx, "type", type, "warpObj", warpObj)


  if (rtl === undefined) {
    var layoutMasterNode = getLayoutAndMasterNode(node, idx, type, warpObj);
    var pPrNodeLaout = layoutMasterNode.nodeLaout;
    var pPrNodeMaster = layoutMasterNode.nodeMaster;
    rtl = getTextByPathList(pPrNodeLaout, ["attrs", "rtl"]);
    if (rtl === undefined && type != "shape") {
      rtl = getTextByPathList(pPrNodeMaster, ["attrs", "rtl"]);
    }
  }

  if (rtl == "1") {
    return "pregraph-rtl";
  } else if (rtl == "0") {
    return "pregraph-ltr";
  }
  return "pregraph-inherit";

  // var contentDir = getContentDir(type, warpObj);
  // console.log("getPregraphDir node:", node["a:r"], "rtl:", rtl, "idx", idx, "type", type, "contentDir:", contentDir)

  // if (contentDir == "content"){
  //     return "pregraph-ltr";
  // } else if (contentDir == "content-rtl"){
  //     return "pregraph-rtl";
  // }
  // return "";
}
function getVerticalAlign(node, slideLayoutSpNode, slideMasterSpNode, type) {

  //X, <a:bodyPr anchor="ctr">, <a:bodyPr anchor="b">
  var anchor = getTextByPathList(node, ["p:txBody", "a:bodyPr", "attrs", "anchor"]);
  //console.log("getVerticalAlign anchor:", anchor, "slideLayoutSpNode: ", slideLayoutSpNode)
  if (anchor === undefined) {
    //console.log("getVerticalAlign type:", type," node:", node, "slideLayoutSpNode:", slideLayoutSpNode, "slideMasterSpNode:", slideMasterSpNode)
    anchor = getTextByPathList(slideLayoutSpNode, ["p:txBody", "a:bodyPr", "attrs", "anchor"]);
    if (anchor === undefined) {
      anchor = getTextByPathList(slideMasterSpNode, ["p:txBody", "a:bodyPr", "attrs", "anchor"]);
      if (anchor === undefined) {
        //"If this attribute is omitted, then a value of t, or top is implied."
        anchor = "t";//getTextByPathList(slideMasterSpNode, ["p:txBody", "a:bodyPr", "attrs", "anchor"]);
      }
    }
  }
  //console.log("getVerticalAlign:", node, slideLayoutSpNode, slideMasterSpNode, type, anchor)
  return (anchor === "ctr")?"v-mid" : ((anchor === "b") ? "v-down" : "v-up");
}

function getContentDir(node, type, warpObj) {
  return "content";
  var defRtl = getTextByPathList(node, ["p:txBody", "a:lstStyle", "a:defPPr", "attrs", "rtl"]);
  if (defRtl !== undefined) {
    if (defRtl == "1"){
      return "content-rtl";
    } else if (defRtl == "0") {
      return "content";
    }
  }
  //var lvl1Rtl = getTextByPathList(node, ["p:txBody", "a:lstStyle", "lvl1pPr", "attrs", "rtl"]);
  // if (lvl1Rtl !== undefined) {
  //     if (lvl1Rtl == "1") {
  //         return "content-rtl";
  //     } else if (lvl1Rtl == "0") {
  //         return "content";
  //     }
  // }
  var rtlCol = getTextByPathList(node, ["p:txBody", "a:bodyPr", "attrs", "rtlCol"]);
  if (rtlCol !== undefined) {
    if (rtlCol == "1") {
      return "content-rtl";
    } else if (rtlCol == "0") {
      return "content";
    }
  }
  //console.log("getContentDir node:", node, "rtlCol:", rtlCol)

  if (type === undefined) {
    return "content";
  }
  var slideMasterTextStyles = warpObj["slideMasterTextStyles"];
  var dirLoc = "";

  switch (type) {
    case "title":
    case "ctrTitle":
      dirLoc = "p:titleStyle";
      break;
    case "body":
    case "dt":
    case "ftr":
    case "sldNum":
    case "textBox":
      dirLoc = "p:bodyStyle";
      break;
    case "shape":
      dirLoc = "p:otherStyle";
  }
  if (slideMasterTextStyles !== undefined && dirLoc !== "") {
    var dirVal = getTextByPathList(slideMasterTextStyles[dirLoc], ["a:lvl1pPr", "attrs", "rtl"]);
    if (dirVal == "1") {
      return "content-rtl";
    }
  }
  // else {
  //     if (type == "textBox") {
  //         var dirVal = getTextByPathList(warpObj, ["defaultTextStyle", "a:lvl1pPr", "attrs", "rtl"]);
  //         if (dirVal == "1") {
  //             return "content-rtl";
  //         }
  //     }
  // }
  return "content";
  //console.log("getContentDir() type:", type, "slideMasterTextStyles:", slideMasterTextStyles,"dirNode:",dirVal)
}

function hasEastAsianText(text, lang) {
  return /^(zh|ja|ko)(-|$)/i.test(lang || "") || /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(text || "");
}

function hasComplexScriptText(text, lang) {
  return rtl_langs_array.indexOf(lang) !== -1 || /^(ar|fa|he|ur|dv)(-|$)/i.test(lang || "") ||
    /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff]/.test(text || "");
}

function getThemeScript(lang, text) {
  if (/^zh-(tw|hk|mo)/i.test(lang || "")) {
    return "Hant";
  }
  if (/^zh/i.test(lang || "") || /[\u3400-\u9fff]/.test(text || "")) {
    return "Hans";
  }
  if (/^ja/i.test(lang || "") || /[\u3040-\u30ff]/.test(text || "")) {
    return "Jpan";
  }
  if (/^ko/i.test(lang || "") || /[\uac00-\ud7af]/.test(text || "")) {
    return "Hang";
  }
  if (/^(ar|fa|ur|dv)/i.test(lang || "") || /[\u0600-\u06ff]/.test(text || "")) {
    return "Arab";
  }
  if (/^he/i.test(lang || "") || /[\u0590-\u05ff]/.test(text || "")) {
    return "Hebr";
  }
  return undefined;
}

function getThemeScriptTypeface(fontGroupNode, lang, text) {
  var script = getThemeScript(lang, text);
  var fontNodes = getTextByPathList(fontGroupNode, ["a:font"]);
  if (script === undefined || fontNodes === undefined) {
    return undefined;
  }
  fontNodes = fontNodes.constructor === Array ? fontNodes : [fontNodes];
  for (var i = 0; i < fontNodes.length; i++) {
    if (getTextByPathList(fontNodes[i], ["attrs", "script"]) === script) {
      return getTextByPathList(fontNodes[i], ["attrs", "typeface"]);
    }
  }
  return undefined;
}

function resolveThemeTypeface(typeface, warpObj, lang, text) {
  if (typeface === undefined || typeface === "") {
    return undefined;
  }
  var match = /^\+(mj|mn)-(lt|ea|cs)$/.exec(typeface);
  if (match === null) {
    return typeface;
  }
  var fontGroup = match[1] === "mj" ? "a:majorFont" : "a:minorFont";
  var fontSlot = match[2] === "lt" ? "a:latin" : "a:" + match[2];
  var fontGroupNode = getTextByPathList(warpObj["themeContent"], ["a:theme", "a:themeElements", "a:fontScheme", fontGroup]);
  var resolved = getTextByPathList(fontGroupNode, [fontSlot, "attrs", "typeface"]);
  return resolved || getThemeScriptTypeface(fontGroupNode, lang, text);
}

function getThemeFontSlot(warpObj, fontIdx, slot, lang, text) {
  var fontGroup = fontIdx === "major" ? "a:majorFont" : "a:minorFont";
  var fontGroupNode = getTextByPathList(warpObj["themeContent"], ["a:theme", "a:themeElements", "a:fontScheme", fontGroup]);
  var typeface = getTextByPathList(fontGroupNode, ["a:" + slot, "attrs", "typeface"]);
  return typeface || getThemeScriptTypeface(fontGroupNode, lang, text);
}

function getFontSlotsFromRunProperties(rPrNode, warpObj, lang, text) {
  if (rPrNode === undefined) {
    return {};
  }
  return {
    latin: resolveThemeTypeface(getTextByPathList(rPrNode, ["a:latin", "attrs", "typeface"]), warpObj, lang, text),
    ea: resolveThemeTypeface(getTextByPathList(rPrNode, ["a:ea", "attrs", "typeface"]), warpObj, lang, text),
    cs: resolveThemeTypeface(getTextByPathList(rPrNode, ["a:cs", "attrs", "typeface"]), warpObj, lang, text),
    sym: resolveThemeTypeface(getTextByPathList(rPrNode, ["a:sym", "attrs", "typeface"]), warpObj, lang, text)
  };
}

function mergeFontSlots(target, source) {
  Object.keys(source).forEach(function (slot) {
    if ((target[slot] === undefined || target[slot] === "") && source[slot] !== undefined && source[slot] !== "") {
      target[slot] = source[slot];
    }
  });
}

function quoteCssFontFamily(fontName) {
  var normalizedFontName = sanitizePptxFontName(fontName);
  if (normalizedFontName === "") {
    return undefined;
  }
  if (/^(inherit|serif|sans-serif|monospace|cursive|fantasy|system-ui)$/i.test(normalizedFontName)) {
    return normalizedFontName;
  }
  return "\"" + normalizedFontName.replace(/\\/g, "\\\\").replace(/"/g, "\\\"") + "\"";
}

function getCssFontFamilies(fontName) {
  var cssFont = quoteCssFontFamily(fontName);
  if (cssFont === undefined) {
    return [];
  }

  var normalized = String(fontName).toLowerCase();
  var fallbacks = [];
  if (normalized === "calibri" || normalized === "calibri light" || normalized === "aptos" ||
      normalized === "aptos display" || normalized === "aptos narrow" || normalized === "aptos body") {
    fallbacks = [ "Helvetica Neue", "Arial", "sans-serif" ];
  } else if (normalized === "aharoni") {
    fallbacks = [ "Arial", "Helvetica Neue", "sans-serif" ];
  } else if (normalized === "poppins bold" || normalized === "poppins extrabold") {
    fallbacks = [ "Poppins", "Arial", "Helvetica Neue", "sans-serif" ];
  } else if (normalized === "poppins light" || normalized === "poppins" || normalized === "poppins regular") {
    fallbacks = [ "Arial", "Helvetica Neue", "sans-serif" ];
  } else if (normalized === "微软雅黑" || normalized === "microsoft yahei") {
    fallbacks = [ "Microsoft YaHei", "PingFang SC", "Helvetica Neue", "Arial", "sans-serif" ];
  }

  var families = [cssFont];
  fallbacks.forEach(function (fallback) {
    var fallbackCss = quoteCssFontFamily(fallback);
    if (fallbackCss !== undefined && families.indexOf(fallbackCss) === -1) {
      families.push(fallbackCss);
    }
  });
  return families;
}

function escapeTextForHtml(text) {
  var raw = String(text);
  var value = raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;")
    .replace(/\u00a0/g, "&nbsp;");

  // Pure whitespace runs (spaces/tabs) are often used as layout gaps between
  // Chinese/English fragments. Convert every space to &nbsp; so HTML does not
  // collapse the intentional width down to a single space.
  if (/^[\s\u00a0]*$/.test(raw)) {
    return value.replace(/ /g, "&nbsp;");
  }

  return value.replace(/ {2,}/g, function (spaces) {
    return " " + new Array(spaces.length).join("&nbsp;");
  });
}

function getDefaultFontIdx(type, pFontStyle) {
  var fontIdx = getTextByPathList(pFontStyle, ["attrs", "idx"]);
  if (fontIdx === "major" || fontIdx === "minor") {
    return fontIdx;
  }
  return (type == "title" || type == "subTitle" || type == "ctrTitle") ? "major" : "minor";
}

function getFontType(node, type, warpObj, pFontStyle, text, lang, pPrNodeLaout, pPrNodeMaster, lvl) {
  var slots = {};
  mergeFontSlots(slots, getFontSlotsFromRunProperties(getTextByPathList(node, ["a:rPr"]), warpObj, lang, text));
  mergeFontSlots(slots, getFontSlotsFromRunProperties(getTextByPathList(pPrNodeLaout, ["a:defRPr"]), warpObj, lang, text));
  mergeFontSlots(slots, getFontSlotsFromRunProperties(getTextByPathList(pPrNodeMaster, ["a:defRPr"]), warpObj, lang, text));

  var lvlpPr = "a:lvl" + lvl + "pPr";
  mergeFontSlots(slots, getFontSlotsFromRunProperties(getTextByPathList(warpObj["defaultTextStyle"], [lvlpPr, "a:defRPr"]), warpObj, lang, text));

  var fontIdx = getDefaultFontIdx(type, pFontStyle);
  mergeFontSlots(slots, {
    latin: getThemeFontSlot(warpObj, fontIdx, "latin", lang, text),
    ea: getThemeFontSlot(warpObj, fontIdx, "ea", lang, text),
    cs: getThemeFontSlot(warpObj, fontIdx, "cs", lang, text)
  });

  var preferred = hasComplexScriptText(text, lang) ? "cs" : (hasEastAsianText(text, lang) ? "ea" : "latin");
  var ordered = [slots[preferred], slots.latin, slots.ea, slots.cs, slots.sym];
  var families = [];
  ordered.forEach(function (fontName) {
    getCssFontFamilies(fontName).forEach(function (cssFont) {
      if (families.indexOf(cssFont) === -1) {
        families.push(cssFont);
      }
    });
  });

  return families.length ? families.join(",") : "inherit";
}

async function getFontColorPr(node, pNode, lstStyle, pFontStyle, lvl, idx, type, warpObj) {
  //text border using: text-shadow: -1px 0 black, 0 1px black, 1px 0 black, 0 -1px black;
  //{getFontColor(..) return color} -> getFontColorPr(..) return array[color,textBordr/shadow]
  //https://stackoverflow.com/questions/2570972/css-font-border
  //https://www.w3schools.com/cssref/css3_pr_text-shadow.asp
  //themeContent
  //console.log("getFontColorPr>> type:", type, ", node: ", node)
  var rPrNode = getTextByPathList(node, ["a:rPr"]);
  var filTyp, color, textBordr, colorType = "", highlightColor = "";
  //console.log("getFontColorPr type:", type, ", node: ", node, "pNode:", pNode, "pFontStyle:", pFontStyle)
  if (rPrNode !== undefined) {
    filTyp = getFillType(rPrNode);
    if (filTyp == "SOLID_FILL") {
      var solidFillNode = rPrNode["a:solidFill"];// getTextByPathList(node, ["a:rPr", "a:solidFill"]);
      color = getSolidFill(solidFillNode, undefined, undefined, warpObj);
      var highlightNode = rPrNode["a:highlight"];
      if (highlightNode !== undefined) {
        highlightColor = getSolidFill(highlightNode, undefined, undefined, warpObj);
      }
      colorType = "solid";
    } else if (filTyp == "PATTERN_FILL") {
      var pattFill = rPrNode["a:pattFill"];// getTextByPathList(node, ["a:rPr", "a:pattFill"]);
      color = getPatternFill(pattFill, warpObj);
      colorType = "pattern";
    } else if (filTyp == "PIC_FILL") {
      color = await getBgPicFill(rPrNode, "slideBg", warpObj, undefined, undefined);
      //color = getPicFill("slideBg", rPrNode["a:blipFill"], warpObj);
      colorType = "pic";
    } else if (filTyp == "GRADIENT_FILL") {
      var shpFill = rPrNode["a:gradFill"];
      color = getGradientFill(shpFill, warpObj);
      colorType = "gradient";
    }
  }
  if (color === undefined) {
    var paragraphDefRPr = getTextByPathList(pNode, ["a:pPr", "a:defRPr"]);
    if (paragraphDefRPr !== undefined) {
      filTyp = getFillType(paragraphDefRPr);
      if (filTyp == "SOLID_FILL") {
        var solidFillNode = paragraphDefRPr["a:solidFill"];
        color = getSolidFill(solidFillNode, undefined, undefined, warpObj);
        var highlightNode = paragraphDefRPr["a:highlight"];
        if (highlightNode !== undefined) {
          highlightColor = getSolidFill(highlightNode, undefined, undefined, warpObj);
        }
        colorType = "solid";
      } else if (filTyp == "PATTERN_FILL") {
        var pattFill = paragraphDefRPr["a:pattFill"];
        color = getPatternFill(pattFill, warpObj);
        colorType = "pattern";
      } else if (filTyp == "PIC_FILL") {
        color = await getBgPicFill(paragraphDefRPr, "slideBg", warpObj, undefined, undefined);
        colorType = "pic";
      } else if (filTyp == "GRADIENT_FILL") {
        var shpFill = paragraphDefRPr["a:gradFill"];
        color = getGradientFill(shpFill, warpObj);
        colorType = "gradient";
      }
    }
  }
  if (color === undefined && getTextByPathList(lstStyle, ["a:lvl" + lvl + "pPr", "a:defRPr"]) !== undefined) {
    //lstStyle
    var lstStyledefRPr = getTextByPathList(lstStyle, ["a:lvl" + lvl + "pPr", "a:defRPr"]);
    filTyp = getFillType(lstStyledefRPr);
    if (filTyp == "SOLID_FILL") {
      var solidFillNode = lstStyledefRPr["a:solidFill"];// getTextByPathList(node, ["a:rPr", "a:solidFill"]);
      color = getSolidFill(solidFillNode, undefined, undefined, warpObj);
      var highlightNode = lstStyledefRPr["a:highlight"];
      if (highlightNode !== undefined) {
        highlightColor = getSolidFill(highlightNode, undefined, undefined, warpObj);
      }
      colorType = "solid";
    } else if (filTyp == "PATTERN_FILL") {
      var pattFill = lstStyledefRPr["a:pattFill"];// getTextByPathList(node, ["a:rPr", "a:pattFill"]);
      color = getPatternFill(pattFill, warpObj);
      colorType = "pattern";
    } else if (filTyp == "PIC_FILL") {
      color = await getBgPicFill(lstStyledefRPr, "slideBg", warpObj, undefined, undefined);
      //color = getPicFill("slideBg", rPrNode["a:blipFill"], warpObj);
      colorType = "pic";
    } else if (filTyp == "GRADIENT_FILL") {
      var shpFill = lstStyledefRPr["a:gradFill"];
      color = getGradientFill(shpFill, warpObj);
      colorType = "gradient";
    }

  }
  if (color === undefined) {
    var sPstyle = getTextByPathList(pNode, ["p:style", "a:fontRef"]);
    if (sPstyle !== undefined) {
      color = getSolidFill(sPstyle, undefined, undefined, warpObj);
      if (color !== undefined) {
        colorType = "solid";
      }
      var highlightNode = sPstyle["a:highlight"]; //is "a:highlight" node in 'a:fontRef' ?
      if (highlightNode !== undefined) {
        highlightColor = getSolidFill(highlightNode, undefined, undefined, warpObj);
      }
    }
    if (color === undefined) {
      if (pFontStyle !== undefined) {
        color = getSolidFill(pFontStyle, undefined, undefined, warpObj);
        if (color !== undefined) {
          colorType = "solid";
        }
      }
    }
  }
  //console.log("getFontColorPr node", node, "colorType: ", colorType,"color: ",color)

  if (color === undefined) {

    var layoutMasterNode = getLayoutAndMasterNode(pNode, idx, type, warpObj);
    var pPrNodeLaout = layoutMasterNode.nodeLaout;
    var pPrNodeMaster = layoutMasterNode.nodeMaster;

    if (pPrNodeLaout !== undefined) {
      var defRpRLaout = getTextByPathList(pPrNodeLaout, ["a:defRPr", "a:solidFill"]);
      if (defRpRLaout !== undefined) {
        color = getSolidFill(defRpRLaout, undefined, undefined, warpObj);
        var highlightNode = getTextByPathList(pPrNodeLaout, ["a:defRPr", "a:highlight"]);
        if (highlightNode !== undefined) {
          highlightColor = getSolidFill(highlightNode, undefined, undefined, warpObj);
        }
        colorType = "solid";
      }
    }
    if (color === undefined) {

      if (pPrNodeMaster !== undefined) {
        var defRprMaster = getTextByPathList(pPrNodeMaster, ["a:defRPr", "a:solidFill"]);
        if (defRprMaster !== undefined) {
          color = getSolidFill(defRprMaster, undefined, undefined, warpObj);
          var highlightNode = getTextByPathList(pPrNodeMaster, ["a:defRPr", "a:highlight"]);
          if (highlightNode !== undefined) {
            highlightColor = getSolidFill(highlightNode, undefined, undefined, warpObj);
          }
          colorType = "solid";
        }
      }
    }
  }
  var txtEffects = [];
  var txtEffObj = {}
  //textBordr
  var txtBrdrNode = getTextByPathList(node, ["a:rPr", "a:ln"]);
  var textBordr = "";
  if (txtBrdrNode !== undefined && txtBrdrNode["a:noFill"] === undefined) {
    var txBrd = getBorder(node, pNode, false, "text", warpObj);
    var txBrdAry = txBrd.split(" ");
    //var brdSize = (parseInt(txBrdAry[0].substring(0, txBrdAry[0].indexOf("pt")))) + "px";
    var brdSize = (parseInt(txBrdAry[0].substring(0, txBrdAry[0].indexOf("px")))) + "px";
    var brdClr = txBrdAry[2];
    //var brdTyp = txBrdAry[1]; //not in use
    //console.log("getFontColorPr txBrdAry:", txBrdAry)
    if (colorType == "solid") {
      textBordr = "-" + brdSize + " 0 " + brdClr + ", 0 " + brdSize + " " + brdClr + ", " + brdSize + " 0 " + brdClr + ", 0 -" + brdSize + " " + brdClr;
      // if (oShadowStr != "") {
      //     textBordr += "," + oShadowStr;
      // } else {
      //     textBordr += ";";
      // }
      txtEffects.push(textBordr);
    } else {
      //textBordr = brdSize + " " + brdClr;
      txtEffObj.border = brdSize + " " + brdClr;
    }
  }
  // else {
  //     //if no border but exist/not exist shadow
  //     if (colorType == "solid") {
  //         textBordr = oShadowStr;
  //     } else {
  //         //TODO
  //     }
  // }
  var txtGlowNode = getTextByPathList(node, ["a:rPr", "a:effectLst", "a:glow"]);
  var oGlowStr = "";
  if (txtGlowNode !== undefined) {
    var glowClr = getSolidFill(txtGlowNode, undefined, undefined, warpObj);
    var rad = (txtGlowNode["attrs"]["rad"]) ? (txtGlowNode["attrs"]["rad"] * slideFactor) : 0;
    oGlowStr = "0 0 " + rad + "px #" + glowClr +
      ", 0 0 " + rad + "px #" + glowClr +
      ", 0 0 " + rad + "px #" + glowClr +
      ", 0 0 " + rad + "px #" + glowClr +
      ", 0 0 " + rad + "px #" + glowClr +
      ", 0 0 " + rad + "px #" + glowClr +
      ", 0 0 " + rad + "px #" + glowClr;
    if (colorType == "solid") {
      txtEffects.push(oGlowStr);
    } else {
      // txtEffObj.glow = {
      //     radiuse: rad,
      //     color: glowClr
      // }
      txtEffects.push(
        "drop-shadow(0 0 " + rad / 3 + "px #" + glowClr + ") " +
        "drop-shadow(0 0 " + rad * 2 / 3 + "px #" + glowClr + ") " +
        "drop-shadow(0 0 " + rad + "px #" + glowClr + ")"
      );
    }
  }
  var txtShadow = getTextByPathList(node, ["a:rPr", "a:effectLst", "a:outerShdw"]);
  var oShadowStr = "";
  if (txtShadow !== undefined) {
    //https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/drop-shadow()
    //https://stackoverflow.com/questions/60468487/css-text-with-linear-gradient-shadow-and-text-outline
    //https://css-tricks.com/creating-playful-effects-with-css-text-shadows/
    //https://designshack.net/articles/css/12-fun-css-text-shadows-you-can-copy-and-paste/

    var shadowClr = getSolidFill(txtShadow, undefined, undefined, warpObj);
    var outerShdwAttrs = txtShadow["attrs"];
    // algn: "bl"
    // dir: "2640000"
    // dist: "38100"
    // rotWithShape: "0/1" - Specifies whether the shadow rotates with the shape if the shape is rotated.
    //blurRad (Blur Radius) - Specifies the blur radius of the shadow.
    //kx (Horizontal Skew) - Specifies the horizontal skew angle.
    //ky (Vertical Skew) - Specifies the vertical skew angle.
    //sx (Horizontal Scaling Factor) - Specifies the horizontal scaling slideFactor; negative scaling causes a flip.
    //sy (Vertical Scaling Factor) - Specifies the vertical scaling slideFactor; negative scaling causes a flip.
    var algn = outerShdwAttrs["algn"];
    var dir = (outerShdwAttrs["dir"]) ? (parseInt(outerShdwAttrs["dir"]) / 60000) : 0;
    var dist = parseInt(outerShdwAttrs["dist"]) * slideFactor;//(px) //* (3 / 4); //(pt)
    var rotWithShape = outerShdwAttrs["rotWithShape"];
    var blurRad = (outerShdwAttrs["blurRad"]) ? (parseInt(outerShdwAttrs["blurRad"]) * slideFactor + "px") : "";
    var sx = (outerShdwAttrs["sx"]) ? (parseInt(outerShdwAttrs["sx"]) / 100000) : 1;
    var sy = (outerShdwAttrs["sy"]) ? (parseInt(outerShdwAttrs["sy"]) / 100000) : 1;
    var vx = dist * Math.sin(dir * Math.PI / 180);
    var hx = dist * Math.cos(dir * Math.PI / 180);

    //console.log("getFontColorPr outerShdwAttrs:", outerShdwAttrs, ", shadowClr:", shadowClr, ", algn: ", algn, ",dir: ", dir, ", dist: ", dist, ",rotWithShape: ", rotWithShape, ", color: ", color)

    if (!isNaN(vx) && !isNaN(hx)) {
      oShadowStr = hx + "px " + vx + "px " + blurRad + " #" + shadowClr;// + ";";
      if (colorType == "solid") {
        txtEffects.push(oShadowStr);
      } else {

        // txtEffObj.oShadow = {
        //     hx: hx,
        //     vx: vx,
        //     radius: blurRad,
        //     color: shadowClr
        // }

        //txtEffObj.oShadow = hx + "px " + vx + "px " + blurRad + " #" + shadowClr;

        txtEffects.push("drop-shadow(" + hx + "px " + vx + "px " + blurRad + " #" + shadowClr + ")");
      }
    }
    //console.log("getFontColorPr vx:", vx, ", hx: ", hx, ", sx: ", sx, ", sy: ", sy, ",oShadowStr: ", oShadowStr)
  }
  //console.log("getFontColorPr>>> color:", color)
  // if (color === undefined || color === "FFF") {
  //     color = "#000";
  // } else {
  //     color = "" + color;
  // }
  var text_effcts = "", txt_effects;
  if (colorType == "solid") {
    if (txtEffects.length > 0) {
      text_effcts = txtEffects.join(",");
    }
    txt_effects = text_effcts + ";"
  } else {
    if (txtEffects.length > 0) {
      text_effcts = txtEffects.join(" ");
    }
    txtEffObj.effcts = text_effcts;
    txt_effects = txtEffObj
  }
  //console.log("getFontColorPr txt_effects:", txt_effects)

  //return [color, textBordr, colorType];
  return [color, txt_effects, colorType, highlightColor];
}
function getFontSize(node, textBodyNode, pFontStyle, lvl, type, warpObj) {
  // if(type == "sldNum")
  //console.log("getFontSize node:", node, "lstStyle", lstStyle, "lvl:", lvl, 'type:', type, "warpObj:", warpObj)
  var lstStyle = (textBodyNode !== undefined)? textBodyNode["a:lstStyle"] : undefined;
  var lvlpPr = "a:lvl" + lvl + "pPr";
  var fontSize = undefined;
  var sz, kern;
  if (node["a:rPr"] !== undefined) {
    fontSize = parseInt(node["a:rPr"]["attrs"]["sz"]) / 100;
  }
  if (isNaN(fontSize) || fontSize === undefined && node["a:fld"] !== undefined) {
    sz = getTextByPathList(node["a:fld"], ["a:rPr", "attrs", "sz"]);
    fontSize = parseInt(sz) / 100;
  }
  if ((isNaN(fontSize) || fontSize === undefined) && node["a:t"] === undefined) {
    sz = getTextByPathList(node["a:endParaRPr"], [ "attrs", "sz"]);
    fontSize = parseInt(sz) / 100;
  }
  if ((isNaN(fontSize) || fontSize === undefined) && lstStyle !== undefined) {
    sz = getTextByPathList(lstStyle, [lvlpPr, "a:defRPr", "attrs", "sz"]);
    fontSize = parseInt(sz) / 100;
  }
  //a:spAutoFit
  var isAutoFit = false;
  var isKerning = false;
  if (textBodyNode !== undefined){
    var spAutoFitNode = getTextByPathList(textBodyNode, ["a:bodyPr", "a:spAutoFit"]);
    // if (spAutoFitNode === undefined) {
    //     spAutoFitNode = getTextByPathList(textBodyNode, ["a:bodyPr", "a:normAutofit"]);
    // }
    if (spAutoFitNode !== undefined){
      isAutoFit = true;
      isKerning = true;
    }
  }
  if (isNaN(fontSize) || fontSize === undefined) {
    // if (type == "shape" || type == "textBox") {
    //     type = "body";
    //     lvlpPr = "a:lvl1pPr";
    // }
    sz = getTextByPathList(warpObj["slideLayoutTables"], ["typeTable", type, "p:txBody", "a:lstStyle", lvlpPr, "a:defRPr", "attrs", "sz"]);
    fontSize = parseInt(sz) / 100;
    kern = getTextByPathList(warpObj["slideLayoutTables"], ["typeTable", type, "p:txBody", "a:lstStyle", lvlpPr, "a:defRPr", "attrs", "kern"]);
    if (isKerning && kern !== undefined && !isNaN(fontSize) && (fontSize - parseInt(kern) / 100) > 0){
      fontSize = fontSize - parseInt(kern) / 100;
    }
  }

  if (isNaN(fontSize) || fontSize === undefined) {
    // if (type == "shape" || type == "textBox") {
    //     type = "body";
    //     lvlpPr = "a:lvl1pPr";
    // }
    sz = getTextByPathList(warpObj["slideMasterTables"], ["typeTable", type, "p:txBody", "a:lstStyle", lvlpPr, "a:defRPr", "attrs", "sz"]);
    kern = getTextByPathList(warpObj["slideMasterTables"], ["typeTable", type, "p:txBody", "a:lstStyle", lvlpPr, "a:defRPr", "attrs", "kern"]);
    if (sz === undefined) {
      if (type == "title" || type == "subTitle" || type == "ctrTitle") {
        sz = getTextByPathList(warpObj["slideMasterTextStyles"], ["p:titleStyle", lvlpPr, "a:defRPr", "attrs", "sz"]);
        kern = getTextByPathList(warpObj["slideMasterTextStyles"], ["p:titleStyle", lvlpPr, "a:defRPr", "attrs", "kern"]);
      } else if (type == "body" || type == "obj" || type == "dt" || type == "sldNum") {
        sz = getTextByPathList(warpObj["slideMasterTextStyles"], ["p:bodyStyle", lvlpPr, "a:defRPr", "attrs", "sz"]);
        kern = getTextByPathList(warpObj["slideMasterTextStyles"], ["p:bodyStyle", lvlpPr, "a:defRPr", "attrs", "kern"]);
      }
      else if (type == "shape" || type === "textBox") {
        // Freeform shapes and text boxes inherit otherStyle, not body
        // placeholder typography.
        sz = getTextByPathList(warpObj["slideMasterTextStyles"], ["p:otherStyle", lvlpPr, "a:defRPr", "attrs", "sz"]);
        kern = getTextByPathList(warpObj["slideMasterTextStyles"], ["p:otherStyle", lvlpPr, "a:defRPr", "attrs", "kern"]);
        isKerning = false;
      }

      if (sz === undefined) {
        sz = getTextByPathList(warpObj["defaultTextStyle"], [lvlpPr, "a:defRPr", "attrs", "sz"]);
        kern = (kern === undefined)? getTextByPathList(warpObj["defaultTextStyle"], [lvlpPr, "a:defRPr", "attrs", "kern"]) : undefined;
        isKerning = false;
      }
      //  else if (type === undefined || type == "shape") {
      //     sz = getTextByPathList(warpObj["slideMasterTextStyles"], ["p:otherStyle", lvlpPr, "a:defRPr", "attrs", "sz"]);
      //     kern = getTextByPathList(warpObj["slideMasterTextStyles"], ["p:otherStyle", lvlpPr, "a:defRPr", "attrs", "kern"]);
      // }
      // else if (type == "textBox") {
      //     sz = getTextByPathList(warpObj["slideMasterTextStyles"], ["p:otherStyle", lvlpPr, "a:defRPr", "attrs", "sz"]);
      //     kern = getTextByPathList(warpObj["slideMasterTextStyles"], ["p:otherStyle", lvlpPr, "a:defRPr", "attrs", "kern"]);
      // }
    }
    fontSize = parseInt(sz) / 100;
    if (isKerning && kern !== undefined && !isNaN(fontSize) && ((fontSize - parseInt(kern) / 100) > parseInt(kern) / 100 )) {
      fontSize = fontSize - parseInt(kern) / 100;
      //fontSize =  parseInt(kern) / 100;
    }
  }

  var baseline = getTextByPathList(node, ["a:rPr", "attrs", "baseline"]);
  if (baseline !== undefined && !isNaN(fontSize)) {
    // PowerPoint renders superscript/subscript runs at two thirds of the
    // inherited size. Treating baseline as a point delta leaves those runs
    // almost full-size and can push following text onto a new line.
    fontSize *= 2 / 3;
  }

  if (!isNaN(fontSize)){
    var normAutofit = getTextByPathList(textBodyNode, ["a:bodyPr", "a:normAutofit", "attrs", "fontScale"]);
    if (normAutofit !== undefined && normAutofit != 0){
      //console.log("fontSize", fontSize, "normAutofit: ", normAutofit, normAutofit/100000)
      fontSize = Math.round(fontSize * (normAutofit / 100000))
    }
  }

  return isNaN(fontSize) ? ((type == "br") ? "initial" : "inherit") : (fontSize * fontSizeFactor + "px");// + "pt");
}

function getFontBold(node, type, slideMasterTextStyles, pPrNodeLaout, pPrNodeMaster, pNode) {
  var bold = getTextByPathList(node, ["a:rPr", "attrs", "b"]);
  if (bold === undefined) {
    bold = getTextByPathList(pNode, ["a:pPr", "a:defRPr", "attrs", "b"]);
  }
  if (bold === undefined) {
    bold = getTextByPathList(pPrNodeLaout, ["a:defRPr", "attrs", "b"]);
  }
  if (bold === undefined) {
    bold = getTextByPathList(pPrNodeMaster, ["a:defRPr", "attrs", "b"]);
  }
  return (bold === "1" || bold === true) ? "bold" : ((bold === "0" || bold === false) ? "normal" : "inherit");
}

function getFontItalic(node, type, slideMasterTextStyles, pPrNodeLaout, pPrNodeMaster, pNode) {
  var italic = getTextByPathList(node, ["a:rPr", "attrs", "i"]);
  if (italic === undefined) {
    italic = getTextByPathList(pNode, ["a:pPr", "a:defRPr", "attrs", "i"]);
  }
  if (italic === undefined) {
    italic = getTextByPathList(pPrNodeLaout, ["a:defRPr", "attrs", "i"]);
  }
  if (italic === undefined) {
    italic = getTextByPathList(pPrNodeMaster, ["a:defRPr", "attrs", "i"]);
  }
  return (italic === "1" || italic === true) ? "italic" : ((italic === "0" || italic === false) ? "normal" : "inherit");
}

function getFontDecoration(node, type, slideMasterTextStyles) {
  ///////////////////////////////Amir///////////////////////////////
  if (node["a:rPr"] !== undefined) {
    var underLine = node["a:rPr"]["attrs"]["u"] !== undefined ? node["a:rPr"]["attrs"]["u"] : "none";
    var strikethrough = node["a:rPr"]["attrs"]["strike"] !== undefined ? node["a:rPr"]["attrs"]["strike"] : 'noStrike';
    //console.log("strikethrough: "+strikethrough);

    if (underLine != "none" && strikethrough == "noStrike") {
      return "underline";
    } else if (underLine == "none" && strikethrough != "noStrike") {
      return "line-through";
    } else if (underLine != "none" && strikethrough != "noStrike") {
      return "underline line-through";
    } else {
      return "inherit";
    }
  } else {
    return "inherit";
  }
  /////////////////////////////////////////////////////////////////
  //return (node["a:rPr"] !== undefined && node["a:rPr"]["attrs"]["u"] === "sng") ? "underline" : "inherit";
}
////////////////////////////////////Amir/////////////////////////////////////
function getTextHorizontalAlign(node, pNode, type, warpObj) {
  //console.log("getTextHorizontalAlign: type: ", type, ", node: ", node)
  var getAlgn = getTextByPathList(node, ["a:pPr", "attrs", "algn"]);
  if (getAlgn === undefined) {
    getAlgn = getTextByPathList(pNode, ["a:pPr", "attrs", "algn"]);
  }
  if (getAlgn === undefined) {
    if (type == "title" || type == "ctrTitle" || type == "subTitle") {
      var lvlIdx = 1;
      var lvlNode = getTextByPathList(pNode, ["a:pPr", "attrs", "lvl"]);
      if (lvlNode !== undefined) {
        lvlIdx = parseInt(lvlNode) + 1;
      }
      var lvlStr = "a:lvl" + lvlIdx + "pPr";
      getAlgn = getTextByPathList(warpObj, ["slideLayoutTables", "typeTable", type, "p:txBody", "a:lstStyle", lvlStr, "attrs", "algn"]);
      if (getAlgn === undefined) {
        getAlgn = getTextByPathList(warpObj, ["slideMasterTables", "typeTable", type, "p:txBody", "a:lstStyle", lvlStr, "attrs", "algn"]);
        if (getAlgn === undefined) {
          getAlgn = getTextByPathList(warpObj, ["slideMasterTextStyles", "p:titleStyle", lvlStr, "attrs", "algn"]);
          if (getAlgn === undefined && type === "subTitle") {
            getAlgn = getTextByPathList(warpObj, ["slideMasterTextStyles", "p:bodyStyle", lvlStr, "attrs", "algn"]);
          }
        }
      }
    } else if (type == "body") {
      getAlgn = getTextByPathList(warpObj, ["slideMasterTextStyles", "p:bodyStyle", "a:lvl1pPr", "attrs", "algn"]);
    } else {
      getAlgn = getTextByPathList(warpObj, ["slideMasterTables", "typeTable", type, "p:txBody", "a:lstStyle", "a:lvl1pPr", "attrs", "algn"]);
    }

  }

  var align = "inherit";
  if (getAlgn !== undefined) {
    switch (getAlgn) {
      case "l":
        align = "left";
        break;
      case "r":
        align = "right";
        break;
      case "ctr":
        align = "center";
        break;
      case "just":
        align = "justify";
        break;
      case "dist":
        align = "justify";
        break;
      default:
        align = "inherit";
    }
  }
  return align;
}
/////////////////////////////////////////////////////////////////////
function getTextVerticalAlign(node, type, slideMasterTextStyles) {
  var baseline = getTextByPathList(node, ["a:rPr", "attrs", "baseline"]);
  return baseline === undefined ? "baseline" : (parseInt(baseline) / 1000) + "%";
}

function getTableBorders(node, warpObj) {
  var borderStyle = "";
  if (node["a:bottom"] !== undefined) {
    var obj = {
      "p:spPr": {
        "a:ln": node["a:bottom"]["a:ln"]
      }
    }
    var borders = getBorder(obj, undefined, false, "shape", warpObj);
    borderStyle += borders.replace("border", "border-bottom");
  }
  if (node["a:top"] !== undefined) {
    var obj = {
      "p:spPr": {
        "a:ln": node["a:top"]["a:ln"]
      }
    }
    var borders = getBorder(obj, undefined, false, "shape", warpObj);
    borderStyle += borders.replace("border", "border-top");
  }
  if (node["a:right"] !== undefined) {
    var obj = {
      "p:spPr": {
        "a:ln": node["a:right"]["a:ln"]
      }
    }
    var borders = getBorder(obj, undefined, false, "shape", warpObj);
    borderStyle += borders.replace("border", "border-right");
  }
  if (node["a:left"] !== undefined) {
    var obj = {
      "p:spPr": {
        "a:ln": node["a:left"]["a:ln"]
      }
    }
    var borders = getBorder(obj, undefined, false, "shape", warpObj);
    borderStyle += borders.replace("border", "border-left");
  }

  return borderStyle;
}
//////////////////////////////////////////////////////////////////
function getBorder(node, pNode, isSvgMode, bType, warpObj) {
  //console.log("getBorder", node, pNode, isSvgMode, bType)
  var cssText, lineNode, subNodeTxt;

  if (bType == "shape") {
    cssText = "border: ";
    lineNode = node["p:spPr"]["a:ln"];
    //subNodeTxt = "p:spPr";
    //node["p:style"]["a:lnRef"] =
  } else if (bType == "text") {
    cssText = "";
    lineNode = node["a:rPr"]["a:ln"];
    //subNodeTxt = "a:rPr";
  }

  //var is_noFill = getTextByPathList(node, ["p:spPr", "a:noFill"]);
  var is_noFill = getTextByPathList(lineNode, ["a:noFill"]);
  if (is_noFill !== undefined) {
    return "hidden";
  }

  //console.log("lineNode: ", lineNode)
  if (lineNode == undefined) {
    var lnRefNode = getTextByPathList(node, ["p:style", "a:lnRef"])
    if (lnRefNode !== undefined){
      var lnIdx = getTextByPathList(lnRefNode, ["attrs", "idx"]);
      //console.log("lnIdx:", lnIdx, "lnStyleLst:", warpObj["themeContent"]["a:theme"]["a:themeElements"]["a:fmtScheme"]["a:lnStyleLst"]["a:ln"][Number(lnIdx) -1])
      lineNode = warpObj["themeContent"]["a:theme"]["a:themeElements"]["a:fmtScheme"]["a:lnStyleLst"]["a:ln"][Number(lnIdx) - 1];
    }
  }
  if (lineNode == undefined) {
    //is table
    cssText = "";
    lineNode = node
  }

  var borderColor;
  if (lineNode !== undefined) {
    // Border width: 1pt = 12700, default = 0.75pt
    var borderWidth = parseInt(getTextByPathList(lineNode, ["attrs", "w"])) / 12700;
    if (isNaN(borderWidth) || borderWidth < 1) {
      cssText += (4/3) + "px ";//"1pt ";
    } else {
      cssText += borderWidth + "px ";// + "pt ";
    }
    // Border type
    var borderType = getTextByPathList(lineNode, ["a:prstDash", "attrs", "val"]);
    if (borderType === undefined) {
      borderType = getTextByPathList(lineNode, ["attrs", "cmpd"]);
    }
    var strokeDasharray = "0";
    switch (borderType) {
      case "solid":
        cssText += "solid";
        strokeDasharray = "0";
        break;
      case "dash":
        cssText += "dashed";
        strokeDasharray = "5";
        break;
      case "dashDot":
        cssText += "dashed";
        strokeDasharray = "5, 5, 1, 5";
        break;
      case "dot":
        cssText += "dotted";
        strokeDasharray = "1, 5";
        break;
      case "lgDash":
        cssText += "dashed";
        strokeDasharray = "10, 5";
        break;
      case "dbl":
        cssText += "double";
        strokeDasharray = "0";
        break;
      case "lgDashDotDot":
        cssText += "dashed";
        strokeDasharray = "10, 5, 1, 5, 1, 5";
        break;
      case "sysDash":
        cssText += "dashed";
        strokeDasharray = "5, 2";
        break;
      case "sysDashDot":
        cssText += "dashed";
        strokeDasharray = "5, 2, 1, 5";
        break;
      case "sysDashDotDot":
        cssText += "dashed";
        strokeDasharray = "5, 2, 1, 5, 1, 5";
        break;
      case "sysDot":
        cssText += "dotted";
        strokeDasharray = "2, 5";
        break;
      case undefined:
      //console.log(borderType);
      default:
        cssText += "solid";
        strokeDasharray = "0";
    }
    // Border color
    var fillTyp = getFillType(lineNode);
    //console.log("getBorder:node : fillTyp", fillTyp)
    if (fillTyp == "NO_FILL") {
      borderColor = isSvgMode ? "none" : "";//"background-color: initial;";
    } else if (fillTyp == "SOLID_FILL") {
      borderColor = getSolidFill(lineNode["a:solidFill"], undefined, undefined, warpObj);
    } else if (fillTyp == "GRADIENT_FILL") {
      borderColor = getVisibleGradientColor(getGradientFill(lineNode["a:gradFill"], warpObj, node));
      //console.log("shpFill",shpFill,grndColor.color)
    } else if (fillTyp == "PATTERN_FILL") {
      borderColor = getPatternFill(lineNode["a:pattFill"], warpObj);
    }

  }

  //console.log("getBorder:node : borderColor", borderColor)
  // 2. drawingML namespace
  if (borderColor === undefined) {
    //var schemeClrNode = getTextByPathList(node, ["p:style", "a:lnRef", "a:schemeClr"]);
    // if (schemeClrNode !== undefined) {
    //     var schemeClr = "a:" + getTextByPathList(schemeClrNode, ["attrs", "val"]);
    //     var borderColor = getSchemeColorFromTheme(schemeClr, undefined, undefined);
    // }
    var lnRefNode = getTextByPathList(node, ["p:style", "a:lnRef"]);
    //console.log("getBorder: lnRef : ", lnRefNode)
    if (lnRefNode !== undefined) {
      borderColor = getSolidFill(lnRefNode, undefined, undefined, warpObj);
    }

    // if (borderColor !== undefined) {
    //     var shade = getTextByPathList(schemeClrNode, ["a:shade", "attrs", "val"]);
    //     if (shade !== undefined) {
    //         shade = parseInt(shade) / 10000;
    //         var color = tinycolor("#" + borderColor);
    //         borderColor = color.darken(shade).toHex8();//.replace("#", "");
    //     }
    // }

  }

  //console.log("getBorder: borderColor : ", borderColor)
  if (borderColor === undefined) {
    if (isSvgMode) {
      borderColor = "none";
    } else {
      borderColor = "hidden";
    }
  } else {
    borderColor = "#" + borderColor; //wrong if not solid fill - TODO

  }
  cssText += " " + borderColor + " ";//wrong if not solid fill - TODO

  if (isSvgMode) {
    return { "color": borderColor, "width": borderWidth, "type": borderType, "strokeDasharray": strokeDasharray };
  } else {
    return cssText + ";";
  }
  // } else {
  //     if (isSvgMode) {
  //         return { "color": 'none', "width": '0', "type": 'none', "strokeDasharray": '0' };
  //     } else {
  //         return "hidden";
  //     }
  // }
}
async function getBackground(warpObj, slideSize, index) {
  //var rslt = "";
  var slideContent = warpObj["slideContent"];
  var slideLayoutContent = warpObj["slideLayoutContent"];
  var slideMasterContent = warpObj["slideMasterContent"];

  var nodesSldLayout = getTextByPathList(slideLayoutContent, [ "p:sldLayout", "p:cSld", "p:spTree" ]);
  var nodesSldMaster = getTextByPathList(slideMasterContent, [ "p:sldMaster", "p:cSld", "p:spTree" ]);
  // console.log("slideContent : ", slideContent)
  // console.log("slideLayoutContent : ", slideLayoutContent)
  // console.log("slideMasterContent : ", slideMasterContent)
  //console.log("warpObj : ", warpObj)
  var slideShowMasterSp = getTextByPathList(slideContent, [ "p:sld", "attrs", "showMasterSp" ]);
  var layoutShowMasterSp = getTextByPathList(slideLayoutContent, [ "p:sldLayout", "attrs", "showMasterSp" ]);
  var showMasterSp = slideShowMasterSp !== undefined ? slideShowMasterSp : layoutShowMasterSp;
  var shouldShowMasterSp = !(showMasterSp === "0" || showMasterSp === "false");
  //console.log("slideLayoutContent : ", slideLayoutContent, ", showMasterSp: ", showMasterSp)
  var bgColor = await getSlideBackgroundFill(warpObj, index) || "";
  var result = "<div class='slide-background slide-background-" + index + "' style='position:absolute;top:0;left:0;overflow:hidden;z-index:0;width:" + slideSize.width + "px; height:" + slideSize.height + "px;" + bgColor + "'>"

  if (nodesSldMaster !== undefined && shouldShowMasterSp) {
    for (var nodeKey in nodesSldMaster) {
      if (nodesSldMaster[nodeKey].constructor === Array) {
        for (var i = 0; i < nodesSldMaster[nodeKey].length; i++) {
          var ph_type = getTextByPathList(nodesSldMaster[nodeKey][i], [ "p:nvSpPr", "p:nvPr", "p:ph", "attrs", "type" ]);
          //if (node_ph_type_ary.indexOf(ph_type) > -1) {
          result += await processNodesInSlide(nodeKey, nodesSldMaster[nodeKey][i], nodesSldMaster, warpObj, "slideMasterBg"); //slideLayoutBg , slideMasterBg
          //}
        }
      } else {
        var ph_type = getTextByPathList(nodesSldMaster[nodeKey], [ "p:nvSpPr", "p:nvPr", "p:ph", "attrs", "type" ]);
        //if (node_ph_type_ary.indexOf(ph_type) > -1) {
        result += await processNodesInSlide(nodeKey, nodesSldMaster[nodeKey], nodesSldMaster, warpObj, "slideMasterBg"); //slideLayoutBg, slideMasterBg
        //}
      }
    }
  }
  if (nodesSldLayout !== undefined) {
    for (var nodeKey in nodesSldLayout) {
      if (nodesSldLayout[nodeKey].constructor === Array) {
        for (var i = 0; i < nodesSldLayout[nodeKey].length; i++) {
          var ph_type = getTextByPathList(nodesSldLayout[nodeKey][i], [ "p:nvSpPr", "p:nvPr", "p:ph", "attrs", "type" ]);
          if (ph_type != "pic") {
            result += await processNodesInSlide(nodeKey, nodesSldLayout[nodeKey][i], nodesSldLayout, warpObj, "slideLayoutBg"); //slideLayoutBg , slideMasterBg
          }
        }
      } else {
        var ph_type = getTextByPathList(nodesSldLayout[nodeKey], [ "p:nvSpPr", "p:nvPr", "p:ph", "attrs", "type" ]);
        if (ph_type != "pic") {
          result += await processNodesInSlide(nodeKey, nodesSldLayout[nodeKey], nodesSldLayout, warpObj, "slideLayoutBg"); //slideLayoutBg, slideMasterBg
        }
      }
    }
  }

  return result + "</div>";

}

function getOrderedThemeFillStyles(fillList) {
  var result = [];
  if (fillList === undefined) {
    return result;
  }
  Object.keys(fillList).forEach(function (key) {
    var fillNode = fillList[key];
    if (key == "attrs") {
      return;
    }
    if (fillNode.constructor === Array) {
      for (var i = 0; i < fillNode.length; i++) {
        var obj = {};
        obj[key] = fillNode[i];
        obj.idex = Number(getTextByPathList(fillNode[i], ["attrs", "order"])) || result.length + 1;
        obj.attrs = { order: obj.idex };
        result.push(obj);
      }
    } else {
      var obj = {};
      obj[key] = fillNode;
      obj.idex = Number(getTextByPathList(fillNode, ["attrs", "order"])) || result.length + 1;
      obj.attrs = { order: obj.idex };
      result.push(obj);
    }
  });
  return result.sort(function (a, b) {
    return a.idex - b.idex;
  });
}

function getThemeFillByIdx(warpObj, idx) {
  if (idx == 0 || idx == 1000) {
    return undefined;
  }
  var listName = idx > 1000 ? "a:bgFillStyleLst" : "a:fillStyleLst";
  var trueIdx = idx > 1000 ? idx - 1000 : idx;
  var fillList = getTextByPathList(warpObj["themeContent"], ["a:theme", "a:themeElements", "a:fmtScheme", listName]);
  var orderedFillStyles = getOrderedThemeFillStyles(fillList);
  return orderedFillStyles[trueIdx - 1];
}

async function renderBackgroundFill(fillNode, clrMap, phClr, slideMasterContent, warpObj, index, imageSource) {
  if (fillNode === undefined) {
    return undefined;
  }
  var bgFillTyp = getFillType(fillNode);
  if (bgFillTyp == "SOLID_FILL") {
    var sldFill = fillNode["a:solidFill"];
    var sldBgClr = getSolidFill(sldFill, clrMap, phClr, warpObj);
    return sldBgClr !== undefined ? "background: #" + sldBgClr + ";" : undefined;
  } else if (bgFillTyp == "GRADIENT_FILL") {
    return getBgGradientFill(fillNode, phClr, slideMasterContent, warpObj);
  } else if (bgFillTyp == "PIC_FILL") {
    return await getBgPicFill(fillNode, imageSource || "themeBg", warpObj, phClr, index);
  } else if (bgFillTyp == "PATTERN_FILL") {
    var bgPtrn = getPatternFill(fillNode["a:pattFill"], warpObj);
    if (bgPtrn !== undefined) {
      var bgStyle = "background: " + bgPtrn[0] + ";";
      if (bgPtrn[1] !== null && bgPtrn[1] !== undefined && bgPtrn[1] != "") {
        bgStyle += "background-size:" + bgPtrn[1] + ";";
      }
      if (bgPtrn[2] !== null && bgPtrn[2] !== undefined && bgPtrn[2] != "") {
        bgStyle += "background-position:" + bgPtrn[2] + ";";
      }
      return bgStyle;
    }
  }
  return undefined;
}

async function getThemeBackgroundFillByIdx(idx, clrMap, phClr, slideMasterContent, warpObj, index) {
  return await renderBackgroundFill(getThemeFillByIdx(warpObj, idx), clrMap, phClr, slideMasterContent, warpObj, index, "themeBg");
}

async function getSlideBackgroundFill(warpObj, index) {
  var slideContent = warpObj["slideContent"];
  var slideLayoutContent = warpObj["slideLayoutContent"];
  var slideMasterContent = warpObj["slideMasterContent"];

  //console.log("slideContent: ", slideContent)
  //console.log("slideLayoutContent: ", slideLayoutContent)
  //console.log("slideMasterContent: ", slideMasterContent)
  //getFillType(node)
  var bgPr = getTextByPathList(slideContent, [ "p:sld", "p:cSld", "p:bg", "p:bgPr" ]);
  var bgRef = getTextByPathList(slideContent, [ "p:sld", "p:cSld", "p:bg", "p:bgRef" ]);
  //console.log("slideContent >> bgPr: ", bgPr, ", bgRef: ", bgRef)
  var bgcolor;
  if (bgPr !== undefined) {
    //bgcolor = "background-color: blue;";
    var bgFillTyp = getFillType(bgPr);

    if (bgFillTyp == "SOLID_FILL") {
      var sldFill = bgPr["a:solidFill"];
      var clrMapOvr;
      var sldClrMapOvr = getTextByPathList(slideContent, [ "p:sld", "p:clrMapOvr", "a:overrideClrMapping", "attrs" ]);
      if (sldClrMapOvr !== undefined) {
        clrMapOvr = sldClrMapOvr;
      } else {
        var sldClrMapOvr = getTextByPathList(slideLayoutContent, [ "p:sldLayout", "p:clrMapOvr", "a:overrideClrMapping", "attrs" ]);
        if (sldClrMapOvr !== undefined) {
          clrMapOvr = sldClrMapOvr;
        } else {
          clrMapOvr = getTextByPathList(slideMasterContent, [ "p:sldMaster", "p:clrMap", "attrs" ]);
        }

      }
      var sldBgClr = getSolidFill(sldFill, clrMapOvr, undefined, warpObj);
      //var sldTint = getColorOpacity(sldFill);
      //console.log("bgColor: ", bgColor)
      //bgcolor = "background: rgba(" + hexToRgbNew(bgColor) + "," + sldTint + ");";
      bgcolor = "background: #" + sldBgClr + ";";

    } else if (bgFillTyp == "GRADIENT_FILL") {
      bgcolor = getBgGradientFill(bgPr, undefined, slideMasterContent, warpObj);
    } else if (bgFillTyp == "PIC_FILL") {
      //console.log("PIC_FILL - ", bgFillTyp, bgPr, warpObj);
      bgcolor = await getBgPicFill(bgPr, "slideBg", warpObj, undefined, index);

    }
    //console.log(slideContent,slideMasterContent,color_ary,tint_ary,rot,bgcolor)
  } else if (bgRef !== undefined) {
    //console.log("slideContent",bgRef)
    var clrMapOvr;
    var sldClrMapOvr = getTextByPathList(slideContent, [ "p:sld", "p:clrMapOvr", "a:overrideClrMapping", "attrs" ]);
    if (sldClrMapOvr !== undefined) {
      clrMapOvr = sldClrMapOvr;
    } else {
      var sldClrMapOvr = getTextByPathList(slideLayoutContent, [ "p:sldLayout", "p:clrMapOvr", "a:overrideClrMapping", "attrs" ]);
      if (sldClrMapOvr !== undefined) {
        clrMapOvr = sldClrMapOvr;
      } else {
        clrMapOvr = getTextByPathList(slideMasterContent, [ "p:sldMaster", "p:clrMap", "attrs" ]);
      }

    }
    var phClr = getSolidFill(bgRef, clrMapOvr, undefined, warpObj);

    // if (bgRef["a:srgbClr"] !== undefined) {
    //     phClr = getTextByPathList(bgRef, ["a:srgbClr", "attrs", "val"]); //#...
    // } else if (bgRef["a:schemeClr"] !== undefined) { //a:schemeClr
    //     var schemeClr = getTextByPathList(bgRef, ["a:schemeClr", "attrs", "val"]);
    //     phClr = getSchemeColorFromTheme("a:" + schemeClr, slideMasterContent, undefined); //#...
    // }
    var idx = Number(bgRef["attrs"]["idx"]);


    if (idx == 0 || idx == 1000) {
      //no background
    } else if (idx > 0 && idx < 1000) {
      //fillStyleLst in themeContent
      //themeContent["a:fmtScheme"]["a:fillStyleLst"]
      bgcolor = await getThemeBackgroundFillByIdx(idx, clrMapOvr, phClr, slideMasterContent, warpObj, index);
    } else if (idx > 1000) {
      //bgFillStyleLst  in themeContent
      //themeContent["a:fmtScheme"]["a:bgFillStyleLst"]
      var trueIdx = idx - 1000;
      // themeContent["a:theme"]["a:themeElements"]["a:fmtScheme"]["a:bgFillStyleLst"];
      var bgFillLst = warpObj["themeContent"]["a:theme"]["a:themeElements"]["a:fmtScheme"]["a:bgFillStyleLst"];
      var sortblAry = [];
      Object.keys(bgFillLst).forEach(function (key) {
        var bgFillLstTyp = bgFillLst[key];
        if (key != "attrs") {
          if (bgFillLstTyp.constructor === Array) {
            for (var i = 0; i < bgFillLstTyp.length; i++) {
              var obj = {};
              obj[key] = bgFillLstTyp[i];
              obj["idex"] = bgFillLstTyp[i]["attrs"]["order"];
              obj["attrs"] = {
                "order": bgFillLstTyp[i]["attrs"]["order"]
              }
              sortblAry.push(obj)
            }
          } else {
            var obj = {};
            obj[key] = bgFillLstTyp;
            obj["idex"] = bgFillLstTyp["attrs"]["order"];
            obj["attrs"] = {
              "order": bgFillLstTyp["attrs"]["order"]
            }
            sortblAry.push(obj)
          }
        }
      });
      var sortByOrder = sortblAry.slice(0);
      sortByOrder.sort(function (a, b) {
        return a.idex - b.idex;
      });
      var bgFillLstIdx = sortByOrder[trueIdx - 1];
      var bgFillTyp = getFillType(bgFillLstIdx);
      if (bgFillTyp == "SOLID_FILL") {
        var sldFill = bgFillLstIdx["a:solidFill"];
        var sldBgClr = getSolidFill(sldFill, clrMapOvr, undefined, warpObj);
        //var sldTint = getColorOpacity(sldFill);
        //bgcolor = "background: rgba(" + hexToRgbNew(phClr) + "," + sldTint + ");";
        bgcolor = "background: #" + sldBgClr + ";";
        //console.log("slideMasterContent - sldFill",sldFill)
      } else if (bgFillTyp == "GRADIENT_FILL") {
        bgcolor = getBgGradientFill(bgFillLstIdx, phClr, slideMasterContent, warpObj);
      } else if (bgFillTyp == "PIC_FILL") {
        bgcolor = await getBgPicFill(bgFillLstIdx, "themeBg", warpObj, phClr, index);
      } else if (bgFillTyp == "PATTERN_FILL") {
        bgcolor = await renderBackgroundFill(bgFillLstIdx, clrMapOvr, phClr, slideMasterContent, warpObj, index, "themeBg");
      } else {
        console.log(bgFillTyp)
      }
    }

  } else {
    bgPr = getTextByPathList(slideLayoutContent, [ "p:sldLayout", "p:cSld", "p:bg", "p:bgPr" ]);
    bgRef = getTextByPathList(slideLayoutContent, [ "p:sldLayout", "p:cSld", "p:bg", "p:bgRef" ]);
    //console.log("slideLayoutContent >> bgPr: ", bgPr, ", bgRef: ", bgRef)
    var clrMapOvr;
    var sldClrMapOvr = getTextByPathList(slideLayoutContent, [ "p:sldLayout", "p:clrMapOvr", "a:overrideClrMapping", "attrs" ]);
    if (sldClrMapOvr !== undefined) {
      clrMapOvr = sldClrMapOvr;
    } else {
      clrMapOvr = getTextByPathList(slideMasterContent, [ "p:sldMaster", "p:clrMap", "attrs" ]);
    }
    if (bgPr !== undefined) {
      var bgFillTyp = getFillType(bgPr);
      if (bgFillTyp == "SOLID_FILL") {
        var sldFill = bgPr["a:solidFill"];

        var sldBgClr = getSolidFill(sldFill, clrMapOvr, undefined, warpObj);
        //var sldTint = getColorOpacity(sldFill);
        // bgcolor = "background: rgba(" + hexToRgbNew(bgColor) + "," + sldTint + ");";
        bgcolor = "background: #" + sldBgClr + ";";
      } else if (bgFillTyp == "GRADIENT_FILL") {
        bgcolor = getBgGradientFill(bgPr, undefined, slideMasterContent, warpObj);
      } else if (bgFillTyp == "PIC_FILL") {
        bgcolor = await getBgPicFill(bgPr, "slideLayoutBg", warpObj, undefined, index);

      }
      //console.log("slideLayoutContent",bgcolor)
    } else if (bgRef !== undefined) {
      //bgcolor = "background: white;";
      var phClr = getSolidFill(bgRef, clrMapOvr, undefined, warpObj);
      var idx = Number(bgRef["attrs"]["idx"]);
      //console.log("phClr=", phClr, "idx=", idx)

      if (idx == 0 || idx == 1000) {
        //no background
      } else if (idx > 0 && idx < 1000) {
        //fillStyleLst in themeContent
        //themeContent["a:fmtScheme"]["a:fillStyleLst"]
        bgcolor = await getThemeBackgroundFillByIdx(idx, clrMapOvr, phClr, slideMasterContent, warpObj, index);
      } else if (idx > 1000) {
        //bgFillStyleLst  in themeContent
        //themeContent["a:fmtScheme"]["a:bgFillStyleLst"]
        var trueIdx = idx - 1000;
        var bgFillLst = warpObj["themeContent"]["a:theme"]["a:themeElements"]["a:fmtScheme"]["a:bgFillStyleLst"];
        var sortblAry = [];
        Object.keys(bgFillLst).forEach(function (key) {
          //console.log("cubicBezTo[" + key + "]:");
          var bgFillLstTyp = bgFillLst[key];
          if (key != "attrs") {
            if (bgFillLstTyp.constructor === Array) {
              for (var i = 0; i < bgFillLstTyp.length; i++) {
                var obj = {};
                obj[key] = bgFillLstTyp[i];
                obj["idex"] = bgFillLstTyp[i]["attrs"]["order"];
                obj["attrs"] = {
                  "order": bgFillLstTyp[i]["attrs"]["order"]
                }
                sortblAry.push(obj)
              }
            } else {
              var obj = {};
              obj[key] = bgFillLstTyp;
              obj["idex"] = bgFillLstTyp["attrs"]["order"];
              obj["attrs"] = {
                "order": bgFillLstTyp["attrs"]["order"]
              }
              sortblAry.push(obj)
            }
          }
        });
        var sortByOrder = sortblAry.slice(0);
        sortByOrder.sort(function (a, b) {
          return a.idex - b.idex;
        });
        var bgFillLstIdx = sortByOrder[trueIdx - 1];
        var bgFillTyp = getFillType(bgFillLstIdx);
        if (bgFillTyp == "SOLID_FILL") {
          var sldFill = bgFillLstIdx["a:solidFill"];
          //console.log("sldFill: ", sldFill)
          //var sldTint = getColorOpacity(sldFill);
          //bgcolor = "background: rgba(" + hexToRgbNew(phClr) + "," + sldTint + ");";
          var sldBgClr = getSolidFill(sldFill, clrMapOvr, phClr, warpObj);
          //console.log("bgcolor: ", bgcolor)
          bgcolor = "background: #" + sldBgClr + ";";
        } else if (bgFillTyp == "GRADIENT_FILL") {
          //console.log("GRADIENT_FILL: ", bgFillLstIdx, phClr)
          bgcolor = getBgGradientFill(bgFillLstIdx, phClr, slideMasterContent, warpObj);
        } else if (bgFillTyp == "PIC_FILL") {
          //theme rels
          //console.log("PIC_FILL - ", bgFillTyp, bgFillLstIdx, bgFillLst, warpObj);
          bgcolor = await getBgPicFill(bgFillLstIdx, "themeBg", warpObj, phClr, index);
        } else if (bgFillTyp == "PATTERN_FILL") {
          bgcolor = await renderBackgroundFill(bgFillLstIdx, clrMapOvr, phClr, slideMasterContent, warpObj, index, "themeBg");
        } else {
          console.log(bgFillTyp)
        }
      }
    } else {
      bgPr = getTextByPathList(slideMasterContent, [ "p:sldMaster", "p:cSld", "p:bg", "p:bgPr" ]);
      bgRef = getTextByPathList(slideMasterContent, [ "p:sldMaster", "p:cSld", "p:bg", "p:bgRef" ]);

      var clrMap = getTextByPathList(slideMasterContent, [ "p:sldMaster", "p:clrMap", "attrs" ]);
      //console.log("slideMasterContent >> bgPr: ", bgPr, ", bgRef: ", bgRef)
      if (bgPr !== undefined) {
        var bgFillTyp = getFillType(bgPr);
        if (bgFillTyp == "SOLID_FILL") {
          var sldFill = bgPr["a:solidFill"];
          var sldBgClr = getSolidFill(sldFill, clrMap, undefined, warpObj);
          // var sldTint = getColorOpacity(sldFill);
          // bgcolor = "background: rgba(" + hexToRgbNew(bgColor) + "," + sldTint + ");";
          bgcolor = "background: #" + sldBgClr + ";";
        } else if (bgFillTyp == "GRADIENT_FILL") {
          bgcolor = getBgGradientFill(bgPr, undefined, slideMasterContent, warpObj);
        } else if (bgFillTyp == "PIC_FILL") {
          bgcolor = await getBgPicFill(bgPr, "slideMasterBg", warpObj, undefined, index);
        }
      } else if (bgRef !== undefined) {
        //var obj={
        //    "a:solidFill": bgRef
        //}
        var phClr = getSolidFill(bgRef, clrMap, undefined, warpObj);
        // var phClr;
        // if (bgRef["a:srgbClr"] !== undefined) {
        //     phClr = getTextByPathList(bgRef, ["a:srgbClr", "attrs", "val"]); //#...
        // } else if (bgRef["a:schemeClr"] !== undefined) { //a:schemeClr
        //     var schemeClr = getTextByPathList(bgRef, ["a:schemeClr", "attrs", "val"]);

        //     phClr = getSchemeColorFromTheme("a:" + schemeClr, slideMasterContent, undefined); //#...
        // }
        var idx = Number(bgRef["attrs"]["idx"]);
        //console.log("phClr=", phClr, "idx=", idx)

        if (idx == 0 || idx == 1000) {
          //no background
        } else if (idx > 0 && idx < 1000) {
          //fillStyleLst in themeContent
          //themeContent["a:fmtScheme"]["a:fillStyleLst"]
          bgcolor = await getThemeBackgroundFillByIdx(idx, clrMap, phClr, slideMasterContent, warpObj, index);
        } else if (idx > 1000) {
          //bgFillStyleLst  in themeContent
          //themeContent["a:fmtScheme"]["a:bgFillStyleLst"]
          var trueIdx = idx - 1000;
          var bgFillLst = warpObj["themeContent"]["a:theme"]["a:themeElements"]["a:fmtScheme"]["a:bgFillStyleLst"];
          var sortblAry = [];
          Object.keys(bgFillLst).forEach(function (key) {
            //console.log("cubicBezTo[" + key + "]:");
            var bgFillLstTyp = bgFillLst[key];
            if (key != "attrs") {
              if (bgFillLstTyp.constructor === Array) {
                for (var i = 0; i < bgFillLstTyp.length; i++) {
                  var obj = {};
                  obj[key] = bgFillLstTyp[i];
                  obj["idex"] = bgFillLstTyp[i]["attrs"]["order"];
                  obj["attrs"] = {
                    "order": bgFillLstTyp[i]["attrs"]["order"]
                  }
                  sortblAry.push(obj)
                }
              } else {
                var obj = {};
                obj[key] = bgFillLstTyp;
                obj["idex"] = bgFillLstTyp["attrs"]["order"];
                obj["attrs"] = {
                  "order": bgFillLstTyp["attrs"]["order"]
                }
                sortblAry.push(obj)
              }
            }
          });
          var sortByOrder = sortblAry.slice(0);
          sortByOrder.sort(function (a, b) {
            return a.idex - b.idex;
          });
          var bgFillLstIdx = sortByOrder[trueIdx - 1];
          var bgFillTyp = getFillType(bgFillLstIdx);
          //console.log("bgFillLstIdx: ", bgFillLstIdx, ", bgFillTyp: ", bgFillTyp, ", phClr: ", phClr);
          if (bgFillTyp == "SOLID_FILL") {
            var sldFill = bgFillLstIdx["a:solidFill"];
            //console.log("sldFill: ", sldFill)
            //var sldTint = getColorOpacity(sldFill);
            //bgcolor = "background: rgba(" + hexToRgbNew(phClr) + "," + sldTint + ");";
            var sldBgClr = getSolidFill(sldFill, clrMap, phClr, warpObj);
            //console.log("bgcolor: ", bgcolor)
            bgcolor = "background: #" + sldBgClr + ";";
          } else if (bgFillTyp == "GRADIENT_FILL") {
            //console.log("GRADIENT_FILL: ", bgFillLstIdx, phClr)
            bgcolor = getBgGradientFill(bgFillLstIdx, phClr, slideMasterContent, warpObj);
          } else if (bgFillTyp == "PIC_FILL") {
            //theme rels
            // console.log("PIC_FILL - ", bgFillTyp, bgFillLstIdx, bgFillLst, warpObj);
            bgcolor = await getBgPicFill(bgFillLstIdx, "themeBg", warpObj, phClr, index);
          } else if (bgFillTyp == "PATTERN_FILL") {
            bgcolor = await renderBackgroundFill(bgFillLstIdx, clrMap, phClr, slideMasterContent, warpObj, index, "themeBg");
          } else {
            console.log(bgFillTyp)
          }
        }
      }
    }
  }

  //console.log("bgcolor: ", bgcolor)
  return bgcolor;
}
function getBgGradientFill(bgPr, phClr, slideMasterContent, warpObj) {
  var bgcolor = "";
  if (bgPr !== undefined) {
    var grdFill = bgPr["a:gradFill"];
    var gsLst = grdFill["a:gsLst"]["a:gs"];
    if (gsLst.constructor !== Array) {
      gsLst = [gsLst];
    }
    var clrMap = getTextByPathList(slideMasterContent, ["p:sldMaster", "p:clrMap", "attrs"]);
    //var startColorNode, endColorNode;
    var color_ary = [];
    var pos_ary = [];
    //var tint_ary = [];
    for (var i = 0; i < gsLst.length; i++) {
      var lo_tint;
      var lo_color = "";
      var lo_color = getSolidFill(gsLst[i], clrMap, phClr, warpObj);
      var pos = getTextByPathList(gsLst[i], ["attrs", "pos"])
      //console.log("pos: ", pos)
      if (pos !== undefined) {
        pos_ary[i] = pos / 1000 + "%";
      } else {
        pos_ary[i] = "";
      }
      //console.log("lo_color", lo_color)
      color_ary[i] = "#" + lo_color;
      //tint_ary[i] = (lo_tint !== undefined) ? parseInt(lo_tint) / 100000 : 1;
    }
    //get rot
    var lin = grdFill["a:lin"];
    var rot = 90;
    if (lin !== undefined) {
      rot = angleToDegrees(lin["attrs"]["ang"]);// + 270;
      //console.log("rot: ", rot)
      rot = rot + 90;
    }
    bgcolor = "background: linear-gradient(" + rot + "deg,";
    for (var i = 0; i < gsLst.length; i++) {
      if (i == gsLst.length - 1) {
        //if (phClr === undefined) {
        //bgcolor += "rgba(" + hexToRgbNew(color_ary[i]) + "," + tint_ary[i] + ")" + ");";
        bgcolor += color_ary[i] + " " + pos_ary[i] + ");";
        //} else {
        //bgcolor += "rgba(" + hexToRgbNew(phClr) + "," + tint_ary[i] + ")" + ");";
        // bgcolor += "" + phClr + ";";;
        //}
      } else {
        //if (phClr === undefined) {
        //bgcolor += "rgba(" + hexToRgbNew(color_ary[i]) + "," + tint_ary[i] + ")" + ", ";
        bgcolor += color_ary[i] + " " + pos_ary[i] + ", ";;
        //} else {
        //bgcolor += "rgba(" + hexToRgbNew(phClr) + "," + tint_ary[i] + ")" + ", ";
        // bgcolor += phClr + ", ";
        //}
      }
    }
  } else {
    if (phClr !== undefined) {
      //bgcolor = "rgba(" + hexToRgbNew(phClr) + ",0);";
      //bgcolor = phClr + ");";
      bgcolor = "background: #" + phClr + ";";
    }
  }
  return bgcolor;
}
async function getBgPicFill(bgPr, sorce, warpObj, phClr, index) {
  //console.log("getBgPicFill bgPr", bgPr)
  var bgcolor;
  var picFillBase64 = await getPicFill(sorce, bgPr["a:blipFill"], warpObj);
  if (picFillBase64 === undefined) {
    return undefined;
  }
  var ordr = getTextByPathList(bgPr, ["attrs", "order"]);
  var aBlipNode = getTextByPathList(bgPr, ["a:blipFill", "a:blip"]);
  //a:duotone
  var duotone = getTextByPathList(aBlipNode, ["a:duotone"]);
  if (duotone !== undefined) {
    //console.log("pic duotone: ", duotone)
    var clr_ary = [];
    // duotone.forEach(function (clr) {
    //     console.log("pic duotone clr: ", clr)
    // })
    Object.keys(duotone).forEach(function (clr_type) {
      //console.log("pic duotone clr: clr_type: ", clr_type, duotone[clr_type])
      if (clr_type != "attrs") {
        var obj = {};
        obj[clr_type] = duotone[clr_type];
        clr_ary.push(getSolidFill(obj, undefined, phClr, warpObj));
      }
      // Object.keys(duotone[clr_type]).forEach(function (clr) {
      //     if (clr != "order") {
      //         var obj = {};
      //         obj[clr_type] = duotone[clr_type][clr];
      //         clr_ary.push(getSolidFill(obj, undefined, phClr, warpObj));
      //     }
      // })
    })
    //console.log("pic duotone clr_ary: ", clr_ary);
    //filter: url(file.svg#filter-element-id)
    //https://codepen.io/bhenbe/pen/QEZOvd
    //https://www.w3schools.com/cssref/css3_pr_filter.asp

    // var color1 = clr_ary[0];
    // var color2 = clr_ary[1];
    // var cssName = "";

    // var styleText_before_after = "content: '';" +
    //     "display: block;" +
    //     "width: 100%;" +
    //     "height: 100%;" +
    //     // "z-index: 1;" +
    //     "position: absolute;" +
    //     "top: 0;" +
    //     "left: 0;";

    // var cssName = "slide-background-" + index + "::before," + " .slide-background-" + index + "::after";
    // styleTable[styleText_before_after] = {
    //     "name": cssName,
    //     "text": styleText_before_after
    // };


    // var styleText_after = "background-color: #" + clr_ary[1] + ";" +
    //     "mix-blend-mode: darken;";

    // cssName = "slide-background-" + index + "::after";
    // styleTable[styleText_after] = {
    //     "name": cssName,
    //     "text": styleText_after
    // };

    // var styleText_before = "background-color: #" + clr_ary[0] + ";" +
    //     "mix-blend-mode: lighten;";

    // cssName = "slide-background-" + index + "::before";
    // styleTable[styleText_before] = {
    //     "name": cssName,
    //     "text": styleText_before
    // };

  }
  //a:alphaModFix
  var aphaModFixNode = getTextByPathList(aBlipNode, ["a:alphaModFix", "attrs"])
  var imgOpacity = "";
  if (aphaModFixNode !== undefined && aphaModFixNode["amt"] !== undefined && aphaModFixNode["amt"] != "") {
    var amt = parseInt(aphaModFixNode["amt"]) / 100000;
    //var opacity = amt;
    imgOpacity = "opacity:" + amt + ";";

  }
  //a:tile

  var tileNode = getTextByPathList(bgPr, ["a:blipFill", "a:tile", "attrs"])
  var prop_style = "";
  if (tileNode !== undefined && tileNode["sx"] !== undefined) {
    var sx = (parseInt(tileNode["sx"]) / 100000);
    var sy = (parseInt(tileNode["sy"]) / 100000);
    var tx = (parseInt(tileNode["tx"]) / 100000);
    var ty = (parseInt(tileNode["ty"]) / 100000);
    var algn = tileNode["algn"]; //tl(top left),t(top), tr(top right), l(left), ctr(center), r(right), bl(bottom left), b(bottm) , br(bottom right)
    var flip = tileNode["flip"]; //none,x,y ,xy

    prop_style += "background-repeat: round;"; //repeat|repeat-x|repeat-y|no-repeat|space|round|initial|inherit;
    //prop_style += "background-size: 300px 100px;"; size (w,h,sx, sy) -TODO
    //prop_style += "background-position: 50% 40%;"; //offset (tx, ty) -TODO
  }
  //a:srcRect
  //a:stretch => a:fillRect =>attrs (l:-17000, r:-17000)
  var stretch = getTextByPathList(bgPr, ["a:blipFill", "a:stretch"]);
  if (stretch !== undefined) {
    //console.log("getBgPicFill=>bgPr: ", bgPr)
    // var top = fillRect["t"], right = fillRect["r"], bottom = fillRect["b"], left = fillRect["l"];
    prop_style += "background-repeat: no-repeat;";
    prop_style += "background-position: center;";
    // a:stretch fills the target rectangle; fillRect only adjusts source cropping.
    prop_style += "background-size: 100% 100%;";
  }
  bgcolor = "background: url(" + picFillBase64 + ");" + (ordr !== undefined ? " z-index: " + ordr + ";" : "") + prop_style + imgOpacity;

  return bgcolor;
}
// function hexToRgbNew(hex) {
//     var arrBuff = new ArrayBuffer(4);
//     var vw = new DataView(arrBuff);
//     vw.setUint32(0, parseInt(hex, 16), false);
//     var arrByte = new Uint8Array(arrBuff);
//     return arrByte[1] + "," + arrByte[2] + "," + arrByte[3];
// }
async function getShapeFill(node, pNode, isSvgMode, warpObj, source) {

  // 1. presentationML
  // p:spPr/ [a:noFill, solidFill, gradFill, blipFill, pattFill, grpFill]
  // From slide
  //Fill Type:
  //console.log("getShapeFill ShapeFill: ", node, ", isSvgMode; ", isSvgMode)
  var fillType = getFillType(getTextByPathList(node, [ "p:spPr" ]));
  //var noFill = getTextByPathList(node, ["p:spPr", "a:noFill"]);
  var fillColor;
  var shpFill;
  if (fillType == "NO_FILL") {
    return isSvgMode ? "none" : "";//"background-color: initial;";
  } else if (fillType == "SOLID_FILL") {
    shpFill = node["p:spPr"]["a:solidFill"];
    fillColor = getSolidFill(shpFill, undefined, undefined, warpObj);
  } else if (fillType == "GRADIENT_FILL") {
    shpFill = node["p:spPr"]["a:gradFill"];
    fillColor = getGradientFill(shpFill, warpObj, node);
    //console.log("shpFill",shpFill,grndColor.color)
  } else if (fillType == "PATTERN_FILL") {
    shpFill = node["p:spPr"]["a:pattFill"];
    fillColor = getPatternFill(shpFill, warpObj);
  } else if (fillType == "PIC_FILL") {
    shpFill = node["p:spPr"]["a:blipFill"];
    fillColor = await getPicFill(source, shpFill, warpObj);
  } else if (fillType == "GROUP_FILL") {
    // grpFill inherits the group's actual paint before the child shape's
    // theme fillRef. Resolving the style first replaces picture fills with a
    // fallback theme color and leaves grouped photo masks blank.
    var grpShpFill = getTextByPathList(pNode, [ "p:grpSpPr" ]);
    if (grpShpFill !== undefined) {
      return await getShapeFill(
        { "p:spPr": grpShpFill },
        node,
        isSvgMode,
        warpObj,
        source
      );
    }
  }
  //console.log("getShapeFill ShapeFill: ", node, ", isSvgMode; ", isSvgMode, ", fillType: ", fillType, ", fillColor: ", fillColor, ", source: ", source)


  // 2. drawingML namespace
  if (fillColor === undefined) {
    var clrName = getTextByPathList(node, [ "p:style", "a:fillRef" ]);
    var idx = parseInt(getTextByPathList(node, [ "p:style", "a:fillRef", "attrs", "idx" ]));
    if (idx == 0 || idx == 1000) {
      //no fill
      return isSvgMode ? "none" : "";
    } else if (idx > 0 && idx < 1000) {
      // <a:fillStyleLst> fill
    } else if (idx > 1000) {
      //<a:bgFillStyleLst>
    }
    fillColor = getSolidFill(clrName, undefined, undefined, warpObj);
  }
  // 3. is group fill
  if (fillColor === undefined) {
    var grpFill = getTextByPathList(node, [ "p:spPr", "a:grpFill" ]);
    if (grpFill !== undefined) {
      //fillColor = getSolidFill(clrName, undefined, undefined, undefined, warpObj);
      //get parent fill style - TODO
      //console.log("ShapeFill: grpFill: ", grpFill, ", pNode: ", pNode)
      var grpShpFill = pNode["p:grpSpPr"];
      var spShpNode = { "p:spPr": grpShpFill }
      return await getShapeFill(spShpNode, node, isSvgMode, warpObj, source);
    } else if (fillType == "NO_FILL") {
      return isSvgMode ? "none" : "";
    }
  }
  //console.log("ShapeFill: fillColor: ", fillColor, ", fillType; ", fillType)

  if (fillColor !== undefined) {
    if (fillType == "GRADIENT_FILL") {
      if (isSvgMode) {
        // console.log("GRADIENT_FILL color", fillColor.color[0])
        return fillColor;
      } else {
        var colorAry = fillColor.color;
        var rot = fillColor.rot;

        var bgcolor = "background: linear-gradient(" + rot + "deg,";
        for (var i = 0; i < colorAry.length; i++) {
          if (i == colorAry.length - 1) {
            bgcolor += "#" + colorAry[i] + ");";
          } else {
            bgcolor += "#" + colorAry[i] + ", ";
          }

        }
        return bgcolor;
      }
    } else if (fillType == "PIC_FILL") {
      if (isSvgMode) {
        return fillColor;
      } else {

        return "background-image:url(" + fillColor + ");";
      }
    } else if (fillType == "PATTERN_FILL") {
      /////////////////////////////////////////////////////////////Need to check -----------TODO
      // if (isSvgMode) {
      //     var color = tinycolor(fillColor);
      //     fillColor = color.toRgbString();

      //     return fillColor;
      // } else {
      var bgPtrn = "", bgSize = "", bgPos = "";
      bgPtrn = fillColor[0];
      if (fillColor[1] !== null && fillColor[1] !== undefined && fillColor[1] != "") {
        bgSize = " background-size:" + fillColor[1] + ";";
      }
      if (fillColor[2] !== null && fillColor[2] !== undefined && fillColor[2] != "") {
        bgPos = " background-position:" + fillColor[2] + ";";
      }
      return "background: " + bgPtrn + ";" + bgSize + bgPos;
      //}
    } else {
      if (isSvgMode) {
        var color = tinycolor(fillColor);
        fillColor = color.toRgbString();

        return fillColor;
      } else {
        //console.log(node,"fillColor: ",fillColor,"fillType: ",fillType,"isSvgMode: ",isSvgMode)
        return "background-color: #" + fillColor + ";";
      }
    }
  } else {
    if (isSvgMode) {
      return "none";
    } else {
      return "";
    }

  }

}
///////////////////////Amir//////////////////////////////
function getFillType(node = {}) {
  //Need to test/////////////////////////////////////////////
  //SOLID_FILL
  //PIC_FILL
  //GRADIENT_FILL
  //PATTERN_FILL
  //NO_FILL
  var fillType = "";
  if (node["a:noFill"] !== undefined) {
    fillType = "NO_FILL";
  }
  if (node["a:solidFill"] !== undefined) {
    fillType = "SOLID_FILL";
  }
  if (node["a:gradFill"] !== undefined) {
    fillType = "GRADIENT_FILL";
  }
  if (node["a:pattFill"] !== undefined) {
    fillType = "PATTERN_FILL";
  }
  if (node["a:blipFill"] !== undefined) {
    fillType = "PIC_FILL";
  }
  if (node["a:grpFill"] !== undefined) {
    fillType = "GROUP_FILL";
  }


  return fillType;
}
function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

function applyShapeFlipToGradientAngle(angle, ownerNode) {
  var xfrmAttrs = getTextByPathList(ownerNode, [ "p:spPr", "a:xfrm", "attrs" ]) || {};
  var flipH = xfrmAttrs["flipH"] === "1";
  var flipV = xfrmAttrs["flipV"] === "1";
  var result = angle;

  if (flipH) {
    result = 180 - result;
  }
  if (flipV) {
    result = -result;
  }

  return normalizeDegrees(result);
}

function getVisibleGradientColor(gradientFill) {
  var colors = gradientFill && gradientFill.color;
  if (!Array.isArray(colors) || !colors.length) {
    return undefined;
  }

  var bestColor = colors[0];
  var bestAlpha = -1;
  colors.forEach(function (color) {
    var parsed = tinycolor("#" + color);
    var alpha = parsed.getAlpha();
    if (alpha > bestAlpha) {
      bestColor = parsed.toHex8();
      bestAlpha = alpha;
    }
  });

  return bestColor;
}

function getGradientFill(node, warpObj, ownerNode) {
  //console.log("getGradientFill: node", node)
  var gsLst = asArray(node["a:gsLst"]["a:gs"]);
  //get start color
  var color_ary = [];
  var tint_ary = [];
  for (var i = 0; i < gsLst.length; i++) {
    var lo_tint;
    var lo_color = getSolidFill(gsLst[i], undefined, undefined, warpObj);
    //console.log("lo_color",lo_color)
    color_ary[i] = lo_color;
  }
  //get rot
  var lin = node["a:lin"];
  var rot = 0;
  if (lin !== undefined) {
    rot = angleToDegrees(lin["attrs"]["ang"]) + 90;
  }
  rot = applyShapeFlipToGradientAngle(rot, ownerNode);
  return {
    "color": color_ary,
    "rot": rot
  }
}
async function getPicFill(type, node, warpObj) {
  //Need to test/////////////////////////////////////////////
  //rId
  //TODO - Image Properties - Tile, Stretch, or Display Portion of Image
  //(http://officeopenxml.com/drwPic-tile.php)
  var img;
  var rId = node["a:blip"]["attrs"]["r:embed"];
  var imgPath;
  //console.log("getPicFill(...) rId: ", rId, ", warpObj: ", warpObj, ", type: ", type)
  if (type == "slideBg" || type == "slide") {
    imgPath = getTextByPathList(warpObj, [ "slideResObj", rId, "target" ]);
  } else if (type == "slideLayoutBg") {
    imgPath = getTextByPathList(warpObj, [ "layoutResObj", rId, "target" ]);
  } else if (type == "slideMasterBg") {
    imgPath = getTextByPathList(warpObj, [ "masterResObj", rId, "target" ]);
  } else if (type == "themeBg") {
    imgPath = getTextByPathList(warpObj, [ "themeResObj", rId, "target" ]);
  } else if (type == "diagramBg") {
    imgPath = getTextByPathList(warpObj, [ "diagramResObj", rId, "target" ]);
  }
  if (imgPath === undefined) {
    return undefined;
  }
  img = getTextByPathList(warpObj, [ "loaded-images", imgPath ]); //, type, rId
  if (img === undefined) {
    imgPath = escapeHtml(imgPath);


    var imgExt = imgPath.split(".").pop();
    if (imgExt == "xml") {
      return undefined;
    }
    var imgArrayBuffer = await warpObj["zip"].file(imgPath).async('arraybuffer');
    img = await getImageDataUrl(imgExt, imgArrayBuffer);
    //warpObj["loaded-images"][imgPath] = img; //"defaultTextStyle": defaultTextStyle,
    setTextByPathList(warpObj, [ "loaded-images", imgPath ], img); //, type, rId
  }
  return img;
}
function getPatternFill(node, warpObj) {
  //https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Images/Using_CSS_gradients
  //https://cssgradient.io/blog/css-gradient-text/
  //https://css-tricks.com/background-patterns-simplified-by-conic-gradients/
  //https://stackoverflow.com/questions/6705250/how-to-get-a-pattern-into-a-written-text-via-css
  //https://stackoverflow.com/questions/14072142/striped-text-in-css
  //https://css-tricks.com/stripes-css/
  //https://yuanchuan.dev/gradient-shapes/
  var fgColor = "", bgColor = "", prst = "";
  var bgClr = node["a:bgClr"];
  var fgClr = node["a:fgClr"];
  prst = node["attrs"]["prst"];
  fgColor = getSolidFill(fgClr, undefined, undefined, warpObj);
  bgColor = getSolidFill(bgClr, undefined, undefined, warpObj);
  //var angl_ary = getAnglefromParst(prst);
  //var ptrClr = "repeating-linear-gradient(" + angl + "deg,  #" + bgColor + ",#" + fgColor + " 2px);"
  //linear-gradient(0deg, black 10 %, transparent 10 %, transparent 90 %, black 90 %, black),
  //linear-gradient(90deg, black 10 %, transparent 10 %, transparent 90 %, black 90 %, black);
  var linear_gradient = getLinerGrandient(prst, bgColor, fgColor);
  //console.log("getPatternFill: node:", node, ", prst: ", prst, ", fgColor: ", fgColor, ", bgColor:", bgColor, ', linear_gradient: ', linear_gradient)
  return linear_gradient;
}

function getLinerGrandient(prst, bgColor, fgColor) {
  // dashDnDiag (Dashed Downward Diagonal)-V
  // dashHorz (Dashed Horizontal)-V
  // dashUpDiag(Dashed Upward DIagonal)-V
  // dashVert(Dashed Vertical)-V
  // diagBrick(Diagonal Brick)-V
  // divot(Divot)-VX
  // dkDnDiag(Dark Downward Diagonal)-V
  // dkHorz(Dark Horizontal)-V
  // dkUpDiag(Dark Upward Diagonal)-V
  // dkVert(Dark Vertical)-V
  // dotDmnd(Dotted Diamond)-VX
  // dotGrid(Dotted Grid)-V
  // horzBrick(Horizontal Brick)-V
  // lgCheck(Large Checker Board)-V
  // lgConfetti(Large Confetti)-V
  // lgGrid(Large Grid)-V
  // ltDnDiag(Light Downward Diagonal)-V
  // ltHorz(Light Horizontal)-V
  // ltUpDiag(Light Upward Diagonal)-V
  // ltVert(Light Vertical)-V
  // narHorz(Narrow Horizontal)-V
  // narVert(Narrow Vertical)-V
  // openDmnd(Open Diamond)-V
  // pct10(10 %)-V
  // pct20(20 %)-V
  // pct25(25 %)-V
  // pct30(30 %)-V
  // pct40(40 %)-V
  // pct5(5 %)-V
  // pct50(50 %)-V
  // pct60(60 %)-V
  // pct70(70 %)-V
  // pct75(75 %)-V
  // pct80(80 %)-V
  // pct90(90 %)-V
  // smCheck(Small Checker Board) -V
  // smConfetti(Small Confetti)-V
  // smGrid(Small Grid) -V
  // solidDmnd(Solid Diamond)-V
  // sphere(Sphere)-V
  // trellis(Trellis)-VX
  // wave(Wave)-V
  // wdDnDiag(Wide Downward Diagonal)-V
  // wdUpDiag(Wide Upward Diagonal)-V
  // weave(Weave)-V
  // zigZag(Zig Zag)-V
  // shingle(Shingle)-V
  // plaid(Plaid)-V
  // cross (Cross)
  // diagCross(Diagonal Cross)
  // dnDiag(Downward Diagonal)
  // horz(Horizontal)
  // upDiag(Upward Diagonal)
  // vert(Vertical)
  switch (prst) {
    case "smGrid":
      return ["linear-gradient(to right,  #" + fgColor + " -1px, transparent 1px ), " +
      "linear-gradient(to bottom,  #" + fgColor + " -1px, transparent 1px)  #" + bgColor + ";", "4px 4px"];
      break
    case "dotGrid":
      return ["linear-gradient(to right,  #" + fgColor + " -1px, transparent 1px ), " +
      "linear-gradient(to bottom,  #" + fgColor + " -1px, transparent 1px)  #" + bgColor + ";", "8px 8px"];
      break
    case "lgGrid":
      return ["linear-gradient(to right,  #" + fgColor + " -1px, transparent 1.5px ), " +
      "linear-gradient(to bottom,  #" + fgColor + " -1px, transparent 1.5px)  #" + bgColor + ";", "8px 8px"];
      break
    case "wdUpDiag":
      //return ["repeating-linear-gradient(-45deg,  #" + bgColor + ", #" + bgColor + " 1px,#" + fgColor + " 5px);"];
      return ["repeating-linear-gradient(-45deg, transparent 1px , transparent 4px, #" + fgColor + " 7px)" + "#" + bgColor + ";"];
      // return ["linear-gradient(45deg, transparent 0%, transparent calc(50% - 1px),  #" + fgColor + " 50%, transparent calc(50% + 1px),  transparent 100%) " +
      //     "#" + bgColor + ";", "6px 6px"];
      break
    case "dkUpDiag":
      return ["repeating-linear-gradient(-45deg, transparent 1px , #" + bgColor + " 5px)" + "#" + fgColor + ";"];
      break
    case "ltUpDiag":
      return ["repeating-linear-gradient(-45deg, transparent 1px , transparent 2px, #" + fgColor + " 4px)" + "#" + bgColor + ";"];
      break
    case "wdDnDiag":
      return ["repeating-linear-gradient(45deg, transparent 1px , transparent 4px, #" + fgColor + " 7px)" + "#" + bgColor + ";"];
      break
    case "dkDnDiag":
      return ["repeating-linear-gradient(45deg, transparent 1px , #" + bgColor + " 5px)" + "#" + fgColor + ";"];
      break
    case "ltDnDiag":
      return ["repeating-linear-gradient(45deg, transparent 1px , transparent 2px, #" + fgColor + " 4px)" + "#" + bgColor + ";"];
      break
    case "dkHorz":
      return ["repeating-linear-gradient(0deg, transparent 1px , transparent 2px, #" + bgColor + " 7px)" + "#" + fgColor + ";"];
      break
    case "ltHorz":
      return ["repeating-linear-gradient(0deg, transparent 1px , transparent 5px, #" + fgColor + " 7px)" + "#" + bgColor + ";"];
      break
    case "narHorz":
      return ["repeating-linear-gradient(0deg, transparent 1px , transparent 2px, #" + fgColor + " 4px)" + "#" + bgColor + ";"];
      break
    case "dkVert":
      return ["repeating-linear-gradient(90deg, transparent 1px , transparent 2px, #" + bgColor + " 7px)" + "#" + fgColor + ";"];
      break
    case "ltVert":
      return ["repeating-linear-gradient(90deg, transparent 1px , transparent 5px, #" + fgColor + " 7px)" + "#" + bgColor + ";"];
      break
    case "narVert":
      return ["repeating-linear-gradient(90deg, transparent 1px , transparent 2px, #" + fgColor + " 4px)" + "#" + bgColor + ";"];
      break
    case "lgCheck":
    case "smCheck":
      var size = "";
      var pos = "";
      if (prst == "lgCheck") {
        size = "8px 8px";
        pos = "0 0, 4px 4px, 4px 4px, 8px 8px";
      } else {
        size = "4px 4px";
        pos = "0 0, 2px 2px, 2px 2px, 4px 4px";
      }
      return ["linear-gradient(45deg,  #" + fgColor + " 25%, transparent 0, transparent 75%,  #" + fgColor + " 0), " +
      "linear-gradient(45deg,  #" + fgColor + " 25%, transparent 0, transparent 75%,  #" + fgColor + " 0) " +
      "#" + bgColor + ";", size, pos];
      break
    // case "smCheck":
    //     return ["linear-gradient(45deg, transparent 0%, transparent calc(50% - 0.5px),  #" + fgColor + " 50%, transparent calc(50% + 0.5px),  transparent 100%), " +
    //         "linear-gradient(-45deg, transparent 0%, transparent calc(50% - 0.5px) , #" + fgColor + " 50%, transparent calc(50% + 0.5px),  transparent 100%)  " +
    //         "#" + bgColor + ";", "4px 4px"];
    //     break

    case "dashUpDiag":
      return ["repeating-linear-gradient(152deg, #" + fgColor + ", #" + fgColor + " 5% , transparent 0, transparent 70%)" +
      "#" + bgColor + ";", "4px 4px"];
      break
    case "dashDnDiag":
      return ["repeating-linear-gradient(45deg, #" + fgColor + ", #" + fgColor + " 5% , transparent 0, transparent 70%)" +
      "#" + bgColor + ";", "4px 4px"];
      break
    case "diagBrick":
      return ["linear-gradient(45deg, transparent 15%,  #" + fgColor + " 30%, transparent 30%), " +
      "linear-gradient(-45deg, transparent 15%,  #" + fgColor + " 30%, transparent 30%), " +
      "linear-gradient(-45deg, transparent 65%,  #" + fgColor + " 80%, transparent 0) " +
      "#" + bgColor + ";", "4px 4px"];
      break
    case "horzBrick":
      return ["linear-gradient(335deg, #" + bgColor + " 1.6px, transparent 1.6px), " +
      "linear-gradient(155deg, #" + bgColor + " 1.6px, transparent 1.6px), " +
      "linear-gradient(335deg, #" + bgColor + " 1.6px, transparent 1.6px), " +
      "linear-gradient(155deg, #" + bgColor + " 1.6px, transparent 1.6px) " +
      "#" + fgColor + ";", "4px 4px", "0 0.15px, 0.3px 2.5px, 2px 2.15px, 2.35px 0.4px"];
      break

    case "dashVert":
      return ["linear-gradient(0deg,  #" + bgColor + " 30%, transparent 30%)," +
      "linear-gradient(90deg,transparent, transparent 40%, #" + fgColor + " 40%, #" + fgColor + " 60% , transparent 60%)" +
      "#" + bgColor + ";", "4px 4px"];
      break
    case "dashHorz":
      return ["linear-gradient(90deg,  #" + bgColor + " 30%, transparent 30%)," +
      "linear-gradient(0deg,transparent, transparent 40%, #" + fgColor + " 40%, #" + fgColor + " 60% , transparent 60%)" +
      "#" + bgColor + ";", "4px 4px"];
      break
    case "solidDmnd":
      return ["linear-gradient(135deg,  #" + fgColor + " 25%, transparent 25%), " +
      "linear-gradient(225deg,  #" + fgColor + " 25%, transparent 25%), " +
      "linear-gradient(315deg,  #" + fgColor + " 25%, transparent 25%), " +
      "linear-gradient(45deg,  #" + fgColor + " 25%, transparent 25%) " +
      "#" + bgColor + ";", "8px 8px"];
      break
    case "openDmnd":
      return ["linear-gradient(45deg, transparent 0%, transparent calc(50% - 0.5px),  #" + fgColor + " 50%, transparent calc(50% + 0.5px),  transparent 100%), " +
      "linear-gradient(-45deg, transparent 0%, transparent calc(50% - 0.5px) , #" + fgColor + " 50%, transparent calc(50% + 0.5px),  transparent 100%) " +
      "#" + bgColor + ";", "8px 8px"];
      break

    case "dotDmnd":
      return ["radial-gradient(#" + fgColor + " 15%, transparent 0), " +
      "radial-gradient(#" + fgColor + " 15%, transparent 0) " +
      "#" + bgColor + ";", "4px 4px", "0 0, 2px 2px"];
      break
    case "zigZag":
    case "wave":
      var size = "";
      if (prst == "zigZag") size = "0";
      else size = "1px";
      return ["linear-gradient(135deg,  #" + fgColor + " 25%, transparent 25%) 50px " + size + ", " +
      "linear-gradient(225deg,  #" + fgColor + " 25%, transparent 25%) 50px " + size + ", " +
      "linear-gradient(315deg,  #" + fgColor + " 25%, transparent 25%), " +
      "linear-gradient(45deg,  #" + fgColor + " 25%, transparent 25%) " +
      "#" + bgColor + ";", "4px 4px"];
      break
    case "lgConfetti":
    case "smConfetti":
      var size = "";
      if (prst == "lgConfetti") size = "4px 4px";
      else size = "2px 2px";
      return ["linear-gradient(135deg,  #" + fgColor + " 25%, transparent 25%) 50px 1px, " +
      "linear-gradient(225deg,  #" + fgColor + " 25%, transparent 25%), " +
      "linear-gradient(315deg,  #" + fgColor + " 25%, transparent 25%) 50px 1px , " +
      "linear-gradient(45deg,  #" + fgColor + " 25%, transparent 25%) " +
      "#" + bgColor + ";", size];
      break
    // case "weave":
    //     return ["linear-gradient(45deg,  #" + bgColor + " 5%, transparent 25%) 50px 0, " +
    //         "linear-gradient(135deg,  #" + bgColor + " 25%, transparent 25%) 50px 0, " +
    //         "linear-gradient(45deg,  #" + bgColor + " 25%, transparent 25%) " +
    //         "#" + fgColor + ";", "4px 4px"];
    //     //background: linear-gradient(45deg, #dca 12%, transparent 0, transparent 88%, #dca 0),
    //     //linear-gradient(135deg, transparent 37 %, #a85 0, #a85 63 %, transparent 0),
    //     //linear-gradient(45deg, transparent 37 %, #dca 0, #dca 63 %, transparent 0) #753;
    //     // background-size: 25px 25px;
    //     break;

    case "plaid":
      return ["linear-gradient(0deg, transparent, transparent 25%, #" + fgColor + "33 25%, #" + fgColor + "33 50%)," +
      "linear-gradient(90deg, transparent, transparent 25%, #" + fgColor + "66 25%, #" + fgColor + "66 50%) " +
      "#" + bgColor + ";", "4px 4px"];
      /**
       background-color: #6677dd;
       background-image:
       repeating-linear-gradient(0deg, transparent, transparent 35px, rgba(255, 255, 255, 0.2) 35px, rgba(255, 255, 255, 0.2) 70px),
       repeating-linear-gradient(90deg, transparent, transparent 35px, rgba(255,255,255,0.4) 35px, rgba(255,255,255,0.4) 70px);
       */
      break;
    case "sphere":
      return ["radial-gradient(#" + fgColor + " 50%, transparent 50%)," +
      "#" + bgColor + ";", "4px 4px"];
      break
    case "weave":
    case "shingle":
      return ["linear-gradient(45deg, #" + bgColor + " 1.31px , #" + fgColor + " 1.4px, #" + fgColor + " 1.5px, transparent 1.5px, transparent 4.2px, #" + fgColor + " 4.2px, #" + fgColor + " 4.3px, transparent 4.31px), " +
      "linear-gradient(-45deg,  #" + bgColor + " 1.31px , #" + fgColor + " 1.4px, #" + fgColor + " 1.5px, transparent 1.5px, transparent 4.2px, #" + fgColor + " 4.2px, #" + fgColor + " 4.3px, transparent 4.31px) 0 4px, " +
      "#" + bgColor + ";", "4px 8px"];
      break
    //background:
    //linear-gradient(45deg, #708090 1.31px, #d9ecff 1.4px, #d9ecff 1.5px, transparent 1.5px, transparent 4.2px, #d9ecff 4.2px, #d9ecff 4.3px, transparent 4.31px),
    //linear-gradient(-45deg, #708090 1.31px, #d9ecff 1.4px, #d9ecff 1.5px, transparent 1.5px, transparent 4.2px, #d9ecff 4.2px, #d9ecff 4.3px, transparent 4.31px)0 4px;
    //background-color:#708090;
    //background-size: 4px 8px;
    case "pct5":
    case "pct10":
    case "pct20":
    case "pct25":
    case "pct30":
    case "pct40":
    case "pct50":
    case "pct60":
    case "pct70":
    case "pct75":
    case "pct80":
    case "pct90":
    //case "dotDmnd":
    case "trellis":
    case "divot":
      var px_pr_ary;
      switch (prst) {
        case "pct5":
          px_pr_ary = ["0.3px", "10%", "2px 2px"];
          break
        case "divot":
          px_pr_ary = ["0.3px", "40%", "4px 4px"];
          break
        case "pct10":
          px_pr_ary = ["0.3px", "20%", "2px 2px"];
          break
        case "pct20":
          //case "dotDmnd":
          px_pr_ary = ["0.2px", "40%", "2px 2px"];
          break
        case "pct25":
          px_pr_ary = ["0.2px", "50%", "2px 2px"];
          break
        case "pct30":
          px_pr_ary = ["0.5px", "50%", "2px 2px"];
          break
        case "pct40":
          px_pr_ary = ["0.5px", "70%", "2px 2px"];
          break
        case "pct50":
          px_pr_ary = ["0.09px", "90%", "2px 2px"];
          break
        case "pct60":
          px_pr_ary = ["0.3px", "90%", "2px 2px"];
          break
        case "pct70":
        case "trellis":
          px_pr_ary = ["0.5px", "95%", "2px 2px"];
          break
        case "pct75":
          px_pr_ary = ["0.65px", "100%", "2px 2px"];
          break
        case "pct80":
          px_pr_ary = ["0.85px", "100%", "2px 2px"];
          break
        case "pct90":
          px_pr_ary = ["1px", "100%", "2px 2px"];
          break
      }
      return ["radial-gradient(#" + fgColor + " " + px_pr_ary[0] + ", transparent " + px_pr_ary[1] + ")," +
      "#" + bgColor + ";", px_pr_ary[2]];
      break
    default:
      return [0, 0];
  }
}

function getSolidFill(node, clrMap, phClr, warpObj) {

  if (node === undefined) {
    return undefined;
  }

  //console.log("getSolidFill node: ", node)
  var color = "";
  var clrNode;
  if (node["a:srgbClr"] !== undefined) {
    clrNode = node["a:srgbClr"];
    color = getTextByPathList(clrNode, ["attrs", "val"]); //#...
  } else if (node["a:schemeClr"] !== undefined) { //a:schemeClr
    clrNode = node["a:schemeClr"];
    var schemeClr = getTextByPathList(clrNode, ["attrs", "val"]);
    color = getSchemeColorFromTheme("a:" + schemeClr, clrMap, phClr, warpObj);
    //console.log("schemeClr: ", schemeClr, "color: ", color)
  } else if (node["a:scrgbClr"] !== undefined) {
    clrNode = node["a:scrgbClr"];
    //<a:scrgbClr r="50%" g="50%" b="50%"/>  //Need to test/////////////////////////////////////////////
    var defBultColorVals = clrNode["attrs"];
    var red = (defBultColorVals["r"].indexOf("%") != -1) ? defBultColorVals["r"].split("%").shift() : defBultColorVals["r"];
    var green = (defBultColorVals["g"].indexOf("%") != -1) ? defBultColorVals["g"].split("%").shift() : defBultColorVals["g"];
    var blue = (defBultColorVals["b"].indexOf("%") != -1) ? defBultColorVals["b"].split("%").shift() : defBultColorVals["b"];
    //var scrgbClr = red + "," + green + "," + blue;
    color = toHex(255 * (Number(red) / 100)) + toHex(255 * (Number(green) / 100)) + toHex(255 * (Number(blue) / 100));
    //console.log("scrgbClr: " + scrgbClr);

  } else if (node["a:prstClr"] !== undefined) {
    clrNode = node["a:prstClr"];
    //<a:prstClr val="black"/>  //Need to test/////////////////////////////////////////////
    var prstClr = getTextByPathList(clrNode, ["attrs", "val"]); //node["a:prstClr"]["attrs"]["val"];
    color = getColorName2Hex(prstClr);
    //console.log("blip prstClr: ", prstClr, " => hexClr: ", color);
  } else if (node["a:hslClr"] !== undefined) {
    clrNode = node["a:hslClr"];
    //<a:hslClr hue="14400000" sat="100%" lum="50%"/>  //Need to test/////////////////////////////////////////////
    var defBultColorVals = clrNode["attrs"];
    var hue = Number(defBultColorVals["hue"]) / 100000;
    var sat = Number((defBultColorVals["sat"].indexOf("%") != -1) ? defBultColorVals["sat"].split("%").shift() : defBultColorVals["sat"]) / 100;
    var lum = Number((defBultColorVals["lum"].indexOf("%") != -1) ? defBultColorVals["lum"].split("%").shift() : defBultColorVals["lum"]) / 100;
    //var hslClr = defBultColorVals["hue"] + "," + defBultColorVals["sat"] + "," + defBultColorVals["lum"];
    var hsl2rgb = hslToRgb(hue, sat, lum);
    color = toHex(hsl2rgb.r) + toHex(hsl2rgb.g) + toHex(hsl2rgb.b);
    //defBultColor = cnvrtHslColor2Hex(hslClr); //TODO
    // console.log("hslClr: " + hslClr);
  } else if (node["a:sysClr"] !== undefined) {
    clrNode = node["a:sysClr"];
    //<a:sysClr val="windowText" lastClr="000000"/>  //Need to test/////////////////////////////////////////////
    var sysClr = getTextByPathList(clrNode, ["attrs", "lastClr"]);
    if (sysClr !== undefined) {
      color = sysClr;
    }
  }
  color = sanitizeHexColor(color);
  //console.log("color: [%cstart]", "color: #" + color, tinycolor(color).toHslString(), color)

  //fix color -------------------------------------------------------- TODO
  //
  //1. "alpha":
  //Specifies the opacity as expressed by a percentage value.
  // [Example: The following represents a green solid fill which is 50 % opaque
  // < a: solidFill >
  //     <a:srgbClr val="00FF00">
  //         <a:alpha val="50%" />
  //     </a:srgbClr>
  // </a: solidFill >
  var isAlpha = false;
  var alpha = parseInt(getTextByPathList(clrNode, ["a:alpha", "attrs", "val"])) / 100000;
  //console.log("alpha: ", alpha)
  if (!isNaN(alpha)) {
    // var al_color = new colz.Color(color);
    // al_color.setAlpha(alpha);
    // var ne_color = al_color.rgba.toString();
    // color = (rgba2hex(ne_color))
    var al_color = tinycolor(color);
    al_color.setAlpha(alpha);
    color = al_color.toHex8()
    isAlpha = true;
    //console.log("al_color: ", al_color, ", color: ", color)
  }
  //2. "alphaMod":
  // Specifies the opacity as expressed by a percentage relative to the input color.
  //     [Example: The following represents a green solid fill which is 50 % opaque
  //     < a: solidFill >
  //         <a:srgbClr val="00FF00">
  //             <a:alphaMod val="50%" />
  //         </a:srgbClr>
  //     </a: solidFill >
  //3. "alphaOff":
  // Specifies the opacity as expressed by a percentage offset increase or decrease to the
  // input color.Increases never increase the opacity beyond 100 %, decreases never decrease
  // the opacity below 0 %.
  // [Example: The following represents a green solid fill which is 90 % opaque
  //     < a: solidFill >
  //         <a:srgbClr val="00FF00">
  //             <a:alphaOff val="-10%" />
  //         </a:srgbClr>
  //     </a: solidFill >

  //4. "blue":
  //Specifies the value of the blue component.The assigned value is specified as a
  //percentage with 0 % indicating minimal blue and 100 % indicating maximum blue.
  //  [Example: The following manipulates the fill from having RGB value RRGGBB = (00, FF, 00)
  //      to value RRGGBB = (00, FF, FF)
  //          <a: solidFill >
  //              <a:srgbClr val="00FF00">
  //                  <a:blue val="100%" />
  //              </a:srgbClr>
  //          </a: solidFill >
  //5. "blueMod"
  // Specifies the blue component as expressed by a percentage relative to the input color
  // component.Increases never increase the blue component beyond 100 %, decreases
  // never decrease the blue component below 0 %.
  // [Example: The following manipulates the fill from having RGB value RRGGBB = (00, 00, FF)
  //     to value RRGGBB = (00, 00, 80)
  //     < a: solidFill >
  //         <a:srgbClr val="0000FF">
  //             <a:blueMod val="50%" />
  //         </a:srgbClr>
  //     </a: solidFill >
  //6. "blueOff"
  // Specifies the blue component as expressed by a percentage offset increase or decrease
  // to the input color component.Increases never increase the blue component
  // beyond 100 %, decreases never decrease the blue component below 0 %.
  // [Example: The following manipulates the fill from having RGB value RRGGBB = (00, 00, FF)
  // to value RRGGBB = (00, 00, CC)
  //     < a: solidFill >
  //         <a:srgbClr val="00FF00">
  //             <a:blueOff val="-20%" />
  //         </a:srgbClr>
  //     </a: solidFill >

  //7. "comp" - This element specifies that the color rendered should be the complement of its input color with the complement
  // being defined as such.Two colors are called complementary if, when mixed they produce a shade of grey.For
  // instance, the complement of red which is RGB(255, 0, 0) is cyan.(<a:comp/>)

  //8. "gamma" - This element specifies that the output color rendered by the generating application should be the sRGB gamma
  //              shift of the input color.

  //9. "gray" - This element specifies a grayscale of its input color, taking into relative intensities of the red, green, and blue
  //              primaries.

  //10. "green":
  // Specifies the value of the green component. The assigned value is specified as a
  // percentage with 0 % indicating minimal green and 100 % indicating maximum green.
  // [Example: The following manipulates the fill from having RGB value RRGGBB = (00, 00, FF)
  // to value RRGGBB = (00, FF, FF)
  //     < a: solidFill >
  //         <a:srgbClr val="0000FF">
  //             <a:green val="100%" />
  //         </a:srgbClr>
  //     </a: solidFill >
  //11. "greenMod":
  // Specifies the green component as expressed by a percentage relative to the input color
  // component.Increases never increase the green component beyond 100 %, decreases
  // never decrease the green component below 0 %.
  // [Example: The following manipulates the fill from having RGB value RRGGBB = (00, FF, 00)
  // to value RRGGBB = (00, 80, 00)
  //     < a: solidFill >
  //         <a:srgbClr val="00FF00">
  //             <a:greenMod val="50%" />
  //         </a:srgbClr>
  //     </a: solidFill >
  //12. "greenOff":
  // Specifies the green component as expressed by a percentage offset increase or decrease
  // to the input color component.Increases never increase the green component
  // beyond 100 %, decreases never decrease the green component below 0 %.
  // [Example: The following manipulates the fill from having RGB value RRGGBB = (00, FF, 00)
  // to value RRGGBB = (00, CC, 00)
  //     < a: solidFill >
  //         <a:srgbClr val="00FF00">
  //             <a:greenOff val="-20%" />
  //         </a:srgbClr>
  //     </a: solidFill >

  //13. "hue" (This element specifies a color using the HSL color model):
  // This element specifies the input color with the specified hue, but with its saturation and luminance unchanged.
  // < a: solidFill >
  //     <a:hslClr hue="14400000" sat="100%" lum="50%">
  // </a:solidFill>
  // <a:solidFill>
  //     <a:hslClr hue="0" sat="100%" lum="50%">
  //         <a:hue val="14400000"/>
  //     <a:hslClr/>
  // </a:solidFill>

  //14. "hueMod" (This element specifies a color using the HSL color model):
  // Specifies the hue as expressed by a percentage relative to the input color.
  // [Example: The following manipulates the fill color from having RGB value RRGGBB = (00, FF, 00) to value RRGGBB = (FF, FF, 00)
  //         < a: solidFill >
  //             <a:srgbClr val="00FF00">
  //                 <a:hueMod val="50%" />
  //             </a:srgbClr>
  //         </a: solidFill >

  var hueMod = parseInt(getTextByPathList(clrNode, ["a:hueMod", "attrs", "val"])) / 100000;
  //console.log("hueMod: ", hueMod)
  if (!isNaN(hueMod)) {
    color = applyHueMod(color, hueMod, isAlpha);
  }
  //15. "hueOff"(This element specifies a color using the HSL color model):
  // Specifies the actual angular value of the shift.The result of the shift shall be between 0
  // and 360 degrees.Shifts resulting in angular values less than 0 are treated as 0. Shifts
  // resulting in angular values greater than 360 are treated as 360.
  // [Example:
  //     The following increases the hue angular value by 10 degrees.
  //     < a: solidFill >
  //         <a:hslClr hue="0" sat="100%" lum="50%"/>
  //             <a:hueOff val="600000"/>
  //     </a: solidFill >
  //var hueOff = parseInt(getTextByPathList(clrNode, ["a:hueOff", "attrs", "val"])) / 100000;
  // if (!isNaN(hueOff)) {
  //     //console.log("hueOff: ", hueOff, " (TODO)")
  //     //color = applyHueOff(color, hueOff, isAlpha);
  // }

  //16. "inv" (inverse)
  //This element specifies the inverse of its input color.
  //The inverse of red (1, 0, 0) is cyan (0, 1, 1 ).
  // The following represents cyan, the inverse of red:
  // <a:solidFill>
  //     <a:srgbClr val="FF0000">
  //         <a:inv />
  //     </a:srgbClr>
  // </a:solidFill>

  //17. "invGamma" - This element specifies that the output color rendered by the generating application should be the inverse sRGB
  //                  gamma shift of the input color.

  //18. "lum":
  // This element specifies the input color with the specified luminance, but with its hue and saturation unchanged.
  // Typically luminance values fall in the range[0 %, 100 %].
  // The following two solid fills are equivalent:
  // <a:solidFill>
  //     <a:hslClr hue="14400000" sat="100%" lum="50%">
  // </a:solidFill>
  // <a:solidFill>
  //     <a:hslClr hue="14400000" sat="100%" lum="0%">
  //         <a:lum val="50%" />
  //     <a:hslClr />
  // </a:solidFill>
  // [Example: The following manipulates the fill from having RGB value RRGGBB = (00, FF, 00)
  // to value RRGGBB = (00, 66, 00)
  //     < a: solidFill >
  //         <a:srgbClr val="00FF00">
  //             <a:lum val="20%" />
  //         </a:srgbClr>
  //     </a: solidFill >
  // end example]
  //19. "lumMod":
  // Specifies the luminance as expressed by a percentage relative to the input color.
  // Increases never increase the luminance beyond 100 %, decreases never decrease the
  // luminance below 0 %.
  // [Example: The following manipulates the fill from having RGB value RRGGBB = (00, FF, 00)
  //     to value RRGGBB = (00, 75, 00)
  //     < a: solidFill >
  //         <a:srgbClr val="00FF00">
  //             <a:lumMod val="50%" />
  //         </a:srgbClr>
  //     </a: solidFill >
  // end example]
  var lumMod = parseInt(getTextByPathList(clrNode, ["a:lumMod", "attrs", "val"])) / 100000;
  //console.log("lumMod: ", lumMod)
  if (!isNaN(lumMod)) {
    color = applyLumMod(color, lumMod, isAlpha);
  }
  //var lumMod_color = applyLumMod(color, 0.5);
  //console.log("lumMod_color: ", lumMod_color)
  //20. "lumOff"
  // Specifies the luminance as expressed by a percentage offset increase or decrease to the
  // input color.Increases never increase the luminance beyond 100 %, decreases never
  // decrease the luminance below 0 %.
  // [Example: The following manipulates the fill from having RGB value RRGGBB = (00, FF, 00)
  //     to value RRGGBB = (00, 99, 00)
  //     < a: solidFill >
  //         <a:srgbClr val="00FF00">
  //             <a:lumOff val="-20%" />
  //         </a:srgbClr>
  //     </a: solidFill >
  var lumOff = parseInt(getTextByPathList(clrNode, ["a:lumOff", "attrs", "val"])) / 100000;
  //console.log("lumOff: ", lumOff)
  if (!isNaN(lumOff)) {
    color = applyLumOff(color, lumOff, isAlpha);
  }


  //21. "red":
  // Specifies the value of the red component.The assigned value is specified as a percentage
  // with 0 % indicating minimal red and 100 % indicating maximum red.
  // [Example: The following manipulates the fill from having RGB value RRGGBB = (00, FF, 00)
  //     to value RRGGBB = (FF, FF, 00)
  //     < a: solidFill >
  //         <a:srgbClr val="00FF00">
  //             <a:red val="100%" />
  //         </a:srgbClr>
  //     </a: solidFill >
  //22. "redMod":
  // Specifies the red component as expressed by a percentage relative to the input color
  // component.Increases never increase the red component beyond 100 %, decreases never
  // decrease the red component below 0 %.
  // [Example: The following manipulates the fill from having RGB value RRGGBB = (FF, 00, 00)
  //     to value RRGGBB = (80, 00, 00)
  //     < a: solidFill >
  //         <a:srgbClr val="FF0000">
  //             <a:redMod val="50%" />
  //         </a:srgbClr>
  //     </a: solidFill >
  //23. "redOff":
  // Specifies the red component as expressed by a percentage offset increase or decrease to
  // the input color component.Increases never increase the red component beyond 100 %,
  //     decreases never decrease the red component below 0 %.
  //     [Example: The following manipulates the fill from having RGB value RRGGBB = (FF, 00, 00)
  //     to value RRGGBB = (CC, 00, 00)
  //     < a: solidFill >
  //         <a:srgbClr val="FF0000">
  //             <a:redOff val="-20%" />
  //         </a:srgbClr>
  //     </a: solidFill >

  //23. "sat":
  // This element specifies the input color with the specified saturation, but with its hue and luminance unchanged.
  // Typically saturation values fall in the range[0 %, 100 %].
  // [Example:
  //     The following two solid fills are equivalent:
  //     <a:solidFill>
  //         <a:hslClr hue="14400000" sat="100%" lum="50%">
  //     </a:solidFill>
  //     <a:solidFill>
  //         <a:hslClr hue="14400000" sat="0%" lum="50%">
  //             <a:sat val="100000" />
  //         <a:hslClr />
  //     </a:solidFill>
  // [Example: The following manipulates the fill from having RGB value RRGGBB = (00, FF, 00)
  //     to value RRGGBB = (40, C0, 40)
  //     < a: solidFill >
  //         <a:srgbClr val="00FF00">
  //             <a:sat val="50%" />
  //         </a:srgbClr>
  //     <a: solidFill >
  // end example]

  //24. "satMod":
  // Specifies the saturation as expressed by a percentage relative to the input color.
  // Increases never increase the saturation beyond 100 %, decreases never decrease the
  // saturation below 0 %.
  // [Example: The following manipulates the fill from having RGB value RRGGBB = (00, FF, 00)
  //     to value RRGGBB = (66, 99, 66)
  //     < a: solidFill >
  //         <a:srgbClr val="00FF00">
  //             <a:satMod val="20%" />
  //         </a:srgbClr>
  //     </a: solidFill >
  var satMod = parseInt(getTextByPathList(clrNode, ["a:satMod", "attrs", "val"])) / 100000;
  if (!isNaN(satMod)) {
    color = applySatMod(color, satMod, isAlpha);
  }
  //25. "satOff":
  // Specifies the saturation as expressed by a percentage offset increase or decrease to the
  // input color.Increases never increase the saturation beyond 100 %, decreases never
  // decrease the saturation below 0 %.
  // [Example: The following manipulates the fill from having RGB value RRGGBB = (00, FF, 00)
  //     to value RRGGBB = (19, E5, 19)
  //     < a: solidFill >
  //         <a:srgbClr val="00FF00">
  //             <a:satOff val="-20%" />
  //         </a:srgbClr>
  //     </a: solidFill >
  // var satOff = parseInt(getTextByPathList(clrNode, ["a:satOff", "attrs", "val"])) / 100000;
  // if (!isNaN(satOff)) {
  //     console.log("satOff: ", satOff, " (TODO)")
  // }

  //26. "shade":
  // This element specifies a darker version of its input color.A 10 % shade is 10 % of the input color combined with 90 % black.
  // [Example: The following manipulates the fill from having RGB value RRGGBB = (00, FF, 00)
  //     to value RRGGBB = (00, BC, 00)
  //     < a: solidFill >
  //         <a:srgbClr val="00FF00">
  //             <a:shade val="50%" />
  //         </a:srgbClr>
  //     </a: solidFill >
  // end example]
  var shade = parseInt(getTextByPathList(clrNode, ["a:shade", "attrs", "val"])) / 100000;
  if (!isNaN(shade)) {
    color = applyShade(color, shade, isAlpha);
  }
  //27.  "tint":
  // This element specifies a lighter version of its input color.A 10 % tint is 10 % of the input color combined with
  // 90 % white.
  // [Example: The following manipulates the fill from having RGB value RRGGBB = (00, FF, 00)
  //     to value RRGGBB = (BC, FF, BC)
  //     < a: solidFill >
  //         <a:srgbClr val="00FF00">
  //             <a:tint val="50%" />
  //         </a:srgbClr>
  //     </a: solidFill >
  var tint = parseInt(getTextByPathList(clrNode, ["a:tint", "attrs", "val"])) / 100000;
  if (!isNaN(tint)) {
    color = applyTint(color, tint, isAlpha);
  }
  //console.log("color [%cfinal]: ", "color: #" + color, tinycolor(color).toHslString(), color)

  return color;
}
function toHex(n) {
  var hex = n.toString(16);
  while (hex.length < 2) { hex = "0" + hex; }
  return hex;
}
function hslToRgb(hue, sat, light) {
  var t1, t2, r, g, b;
  hue = hue / 60;
  if (light <= 0.5) {
    t2 = light * (sat + 1);
  } else {
    t2 = light + sat - (light * sat);
  }
  t1 = light * 2 - t2;
  r = hueToRgb(t1, t2, hue + 2) * 255;
  g = hueToRgb(t1, t2, hue) * 255;
  b = hueToRgb(t1, t2, hue - 2) * 255;
  return { r: r, g: g, b: b };
}
function hueToRgb(t1, t2, hue) {
  if (hue < 0) hue += 6;
  if (hue >= 6) hue -= 6;
  if (hue < 1) return (t2 - t1) * hue + t1;
  else if (hue < 3) return t2;
  else if (hue < 4) return (t2 - t1) * (4 - hue) + t1;
  else return t1;
}
function getColorName2Hex(name) {
  var hex;
  var colorName = ['white', 'AliceBlue', 'AntiqueWhite', 'Aqua', 'Aquamarine', 'Azure', 'Beige', 'Bisque', 'black', 'BlanchedAlmond', 'Blue', 'BlueViolet', 'Brown', 'BurlyWood', 'CadetBlue', 'Chartreuse', 'Chocolate', 'Coral', 'CornflowerBlue', 'Cornsilk', 'Crimson', 'Cyan', 'DarkBlue', 'DarkCyan', 'DarkGoldenRod', 'DarkGray', 'DarkGrey', 'DarkGreen', 'DarkKhaki', 'DarkMagenta', 'DarkOliveGreen', 'DarkOrange', 'DarkOrchid', 'DarkRed', 'DarkSalmon', 'DarkSeaGreen', 'DarkSlateBlue', 'DarkSlateGray', 'DarkSlateGrey', 'DarkTurquoise', 'DarkViolet', 'DeepPink', 'DeepSkyBlue', 'DimGray', 'DimGrey', 'DodgerBlue', 'FireBrick', 'FloralWhite', 'ForestGreen', 'Fuchsia', 'Gainsboro', 'GhostWhite', 'Gold', 'GoldenRod', 'Gray', 'Grey', 'Green', 'GreenYellow', 'HoneyDew', 'HotPink', 'IndianRed', 'Indigo', 'Ivory', 'Khaki', 'Lavender', 'LavenderBlush', 'LawnGreen', 'LemonChiffon', 'LightBlue', 'LightCoral', 'LightCyan', 'LightGoldenRodYellow', 'LightGray', 'LightGrey', 'LightGreen', 'LightPink', 'LightSalmon', 'LightSeaGreen', 'LightSkyBlue', 'LightSlateGray', 'LightSlateGrey', 'LightSteelBlue', 'LightYellow', 'Lime', 'LimeGreen', 'Linen', 'Magenta', 'Maroon', 'MediumAquaMarine', 'MediumBlue', 'MediumOrchid', 'MediumPurple', 'MediumSeaGreen', 'MediumSlateBlue', 'MediumSpringGreen', 'MediumTurquoise', 'MediumVioletRed', 'MidnightBlue', 'MintCream', 'MistyRose', 'Moccasin', 'NavajoWhite', 'Navy', 'OldLace', 'Olive', 'OliveDrab', 'Orange', 'OrangeRed', 'Orchid', 'PaleGoldenRod', 'PaleGreen', 'PaleTurquoise', 'PaleVioletRed', 'PapayaWhip', 'PeachPuff', 'Peru', 'Pink', 'Plum', 'PowderBlue', 'Purple', 'RebeccaPurple', 'Red', 'RosyBrown', 'RoyalBlue', 'SaddleBrown', 'Salmon', 'SandyBrown', 'SeaGreen', 'SeaShell', 'Sienna', 'Silver', 'SkyBlue', 'SlateBlue', 'SlateGray', 'SlateGrey', 'Snow', 'SpringGreen', 'SteelBlue', 'Tan', 'Teal', 'Thistle', 'Tomato', 'Turquoise', 'Violet', 'Wheat', 'White', 'WhiteSmoke', 'Yellow', 'YellowGreen'];
  var colorHex = ['ffffff', 'f0f8ff', 'faebd7', '00ffff', '7fffd4', 'f0ffff', 'f5f5dc', 'ffe4c4', '000000', 'ffebcd', '0000ff', '8a2be2', 'a52a2a', 'deb887', '5f9ea0', '7fff00', 'd2691e', 'ff7f50', '6495ed', 'fff8dc', 'dc143c', '00ffff', '00008b', '008b8b', 'b8860b', 'a9a9a9', 'a9a9a9', '006400', 'bdb76b', '8b008b', '556b2f', 'ff8c00', '9932cc', '8b0000', 'e9967a', '8fbc8f', '483d8b', '2f4f4f', '2f4f4f', '00ced1', '9400d3', 'ff1493', '00bfff', '696969', '696969', '1e90ff', 'b22222', 'fffaf0', '228b22', 'ff00ff', 'dcdcdc', 'f8f8ff', 'ffd700', 'daa520', '808080', '808080', '008000', 'adff2f', 'f0fff0', 'ff69b4', 'cd5c5c', '4b0082', 'fffff0', 'f0e68c', 'e6e6fa', 'fff0f5', '7cfc00', 'fffacd', 'add8e6', 'f08080', 'e0ffff', 'fafad2', 'd3d3d3', 'd3d3d3', '90ee90', 'ffb6c1', 'ffa07a', '20b2aa', '87cefa', '778899', '778899', 'b0c4de', 'ffffe0', '00ff00', '32cd32', 'faf0e6', 'ff00ff', '800000', '66cdaa', '0000cd', 'ba55d3', '9370db', '3cb371', '7b68ee', '00fa9a', '48d1cc', 'c71585', '191970', 'f5fffa', 'ffe4e1', 'ffe4b5', 'ffdead', '000080', 'fdf5e6', '808000', '6b8e23', 'ffa500', 'ff4500', 'da70d6', 'eee8aa', '98fb98', 'afeeee', 'db7093', 'ffefd5', 'ffdab9', 'cd853f', 'ffc0cb', 'dda0dd', 'b0e0e6', '800080', '663399', 'ff0000', 'bc8f8f', '4169e1', '8b4513', 'fa8072', 'f4a460', '2e8b57', 'fff5ee', 'a0522d', 'c0c0c0', '87ceeb', '6a5acd', '708090', '708090', 'fffafa', '00ff7f', '4682b4', 'd2b48c', '008080', 'd8bfd8', 'ff6347', '40e0d0', 'ee82ee', 'f5deb3', 'ffffff', 'f5f5f5', 'ffff00', '9acd32'];
  var findIndx = colorName.indexOf(name);
  if (findIndx != -1) {
    hex = colorHex[findIndx];
  }
  return hex;
}
function getSchemeColorFromTheme(schemeClr, clrMap, phClr, warpObj) {
  //<p:clrMap ...> in slide master
  // e.g. tx2="dk2" bg2="lt2" tx1="dk1" bg1="lt1" slideLayoutClrOvride
  //console.log("getSchemeColorFromTheme: schemeClr: ", schemeClr, ",clrMap: ", clrMap)
  var slideLayoutClrOvride;
  if (clrMap !== undefined) {
    slideLayoutClrOvride = clrMap;//getTextByPathList(clrMap, ["p:sldMaster", "p:clrMap", "attrs"])
  } else {
    var sldClrMapOvr = getTextByPathList(warpObj["slideContent"], ["p:sld", "p:clrMapOvr", "a:overrideClrMapping", "attrs"]);
    if (sldClrMapOvr !== undefined) {
      slideLayoutClrOvride = sldClrMapOvr;
    } else {
      var sldClrMapOvr = getTextByPathList(warpObj["slideLayoutContent"], ["p:sldLayout", "p:clrMapOvr", "a:overrideClrMapping", "attrs"]);
      if (sldClrMapOvr !== undefined) {
        slideLayoutClrOvride = sldClrMapOvr;
      } else {
        slideLayoutClrOvride = getTextByPathList(warpObj["slideMasterContent"], ["p:sldMaster", "p:clrMap", "attrs"]);
      }

    }
  }
  //console.log("getSchemeColorFromTheme slideLayoutClrOvride: ", slideLayoutClrOvride);
  var schmClrName = schemeClr.substr(2);
  if (schmClrName == "phClr" && phClr !== undefined) {
    color = phClr;
  } else {
    if (slideLayoutClrOvride !== undefined) {
      switch (schmClrName) {
        case "tx1":
        case "tx2":
        case "bg1":
        case "bg2":
          schemeClr = "a:" + slideLayoutClrOvride[schmClrName];
          break;
      }
    } else {
      switch (schmClrName) {
        case "tx1":
          schemeClr = "a:dk1";
          break;
        case "tx2":
          schemeClr = "a:dk2";
          break;
        case "bg1":
          schemeClr = "a:lt1";
          break;
        case "bg2":
          schemeClr = "a:lt2";
          break;
      }
    }
    //console.log("getSchemeColorFromTheme:  schemeClr: ", schemeClr);
    var refNode = getTextByPathList(warpObj["themeContent"], ["a:theme", "a:themeElements", "a:clrScheme", schemeClr]);
    var color = getTextByPathList(refNode, ["a:srgbClr", "attrs", "val"]);
    //console.log("themeContent: color", color);
    if (color === undefined && refNode !== undefined) {
      color = getTextByPathList(refNode, ["a:sysClr", "attrs", "lastClr"]);
    }
  }
  //console.log(color)
  return sanitizeHexColor(color);
}

function extractChartData(serNode) {

  var dataMat = new Array();

  if (serNode === undefined) {
    return dataMat;
  }

  if (serNode["c:xVal"] !== undefined) {
    var dataRow = new Array();
    eachElement(serNode["c:xVal"]["c:numRef"]["c:numCache"]["c:pt"], function (innerNode, index) {
      dataRow.push(parseFloat(innerNode["c:v"]));
      return "";
    });
    dataMat.push(dataRow);
    dataRow = new Array();
    eachElement(serNode["c:yVal"]["c:numRef"]["c:numCache"]["c:pt"], function (innerNode, index) {
      dataRow.push(parseFloat(innerNode["c:v"]));
      return "";
    });
    dataMat.push(dataRow);
  } else {
    eachElement(serNode, function (innerNode, index) {
      var dataRow = new Array();
      var colName = getTextByPathList(innerNode, ["c:tx", "c:strRef", "c:strCache", "c:pt", "c:v"]) || index;

      // Category (string or number)
      var rowNames = {};
      if (getTextByPathList(innerNode, ["c:cat", "c:strRef", "c:strCache", "c:pt"]) !== undefined) {
        eachElement(innerNode["c:cat"]["c:strRef"]["c:strCache"]["c:pt"], function (innerNode, index) {
          rowNames[innerNode["attrs"]["idx"]] = innerNode["c:v"];
          return "";
        });
      } else if (getTextByPathList(innerNode, ["c:cat", "c:numRef", "c:numCache", "c:pt"]) !== undefined) {
        eachElement(innerNode["c:cat"]["c:numRef"]["c:numCache"]["c:pt"], function (innerNode, index) {
          rowNames[innerNode["attrs"]["idx"]] = innerNode["c:v"];
          return "";
        });
      }

      // Value
      if (getTextByPathList(innerNode, ["c:val", "c:numRef", "c:numCache", "c:pt"]) !== undefined) {
        eachElement(innerNode["c:val"]["c:numRef"]["c:numCache"]["c:pt"], function (innerNode, index) {
          dataRow.push({ x: innerNode["attrs"]["idx"], y: parseFloat(innerNode["c:v"]) });
          return "";
        });
      }

      dataMat.push({ key: colName, values: dataRow, xlabels: rowNames });
      return "";
    });
  }

  return dataMat;
}

// ===== Node functions =====
/**
 * getTextByPathStr
 * @param {Object} node
 * @param {string} pathStr
 */
function getTextByPathStr(node, pathStr) {
  return getTextByPathList(node, pathStr.trim().split(/\s+/));
}

/**
 * getTextByPathList
 * @param {Object} node
 * @param {string Array} path
 */
function getTextByPathList(node, path) {

  if (path.constructor !== Array) {
    throw Error("Error of path type! path is not array.");
  }

  if (node === undefined || node === null) {
    return undefined;
  }

  const l = path.length;
  for (let i = 0; i < l; i++) {
    node = node[path[i]];
    if (node === undefined || node === null) {
      return undefined;
    }
  }

  return node;
}
/**
 * setTextByPathList
 * @param {Object} node
 * @param {string Array} path
 * @param {string} value
 */
export function setTextByPathList(node, path, value) {

  if (path.constructor !== Array) {
    throw Error("Error of path type! path is not array.");
  }

  if (node === undefined || node === null || typeof node !== "object") {
    return undefined;
  }

  var obj = node;
  for (var i = 0; i < path.length; i++) {
    var p = path[i];
    if (i === path.length - 1) {
      Object.defineProperty(obj, p, {
        value: value,
        writable: true,
        enumerable: true,
        configurable: true
      });
      return value;
    }

    var next = Object.prototype.hasOwnProperty.call(obj, p) ? obj[p] : undefined;
    if (next === null || typeof next !== "object") {
      next = Object.create(null);
      Object.defineProperty(obj, p, {
        value: next,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
    obj = next;
  }
  return obj;
}

/**
 * eachElement
 * @param {Object} node
 * @param {function} doFunction
 */
function eachElement(node, doFunction) {
  if (node === undefined) {
    return;
  }
  var result = "";
  if (node.constructor === Array) {
    var l = node.length;
    for (var i = 0; i < l; i++) {
      result += doFunction(node[i], i);
    }
  } else {
    result += doFunction(node, 0);
  }
  return result;
}

// ===== Color functions =====
/**
 * applyShade
 * @param {string} rgbStr
 * @param {number} shadeValue
 */
function applyShade(rgbStr, shadeValue, isAlpha) {
  var color = tinycolor(rgbStr).toHsl();
  //console.log("applyShade  color: ", color, ", shadeValue: ", shadeValue)
  if (shadeValue >= 1) {
    shadeValue = 1;
  }
  var cacl_l = Math.min(color.l * shadeValue, 1);//;color.l * shadeValue + (1 - shadeValue);
  // if (isAlpha)
  //     return color.lighten(tintValue).toHex8();
  // return color.lighten(tintValue).toHex();
  if (isAlpha)
    return tinycolor({ h: color.h, s: color.s, l: cacl_l, a: color.a }).toHex8();
  return tinycolor({ h: color.h, s: color.s, l: cacl_l, a: color.a }).toHex();
}

/**
 * applyTint
 * @param {string} rgbStr
 * @param {number} tintValue
 */
function applyTint(rgbStr, tintValue, isAlpha) {
  var color = tinycolor(rgbStr).toHsl();
  //console.log("applyTint  color: ", color, ", tintValue: ", tintValue)
  if (tintValue >= 1) {
    tintValue = 1;
  }
  var cacl_l = color.l * tintValue + (1 - tintValue);
  // if (isAlpha)
  //     return color.lighten(tintValue).toHex8();
  // return color.lighten(tintValue).toHex();
  if (isAlpha)
    return tinycolor({ h: color.h, s: color.s, l: cacl_l, a: color.a }).toHex8();
  return tinycolor({ h: color.h, s: color.s, l: cacl_l, a: color.a }).toHex();
}

/**
 * applyLumOff
 * @param {string} rgbStr
 * @param {number} offset
 */
function applyLumOff(rgbStr, offset, isAlpha) {
  var color = tinycolor(rgbStr).toHsl();
  //console.log("applyLumOff  color.l: ", color.l, ", offset: ", offset, ", color.l + offset : ", color.l + offset)
  var lum = offset + color.l;
  if (lum >= 1) {
    if (isAlpha)
      return tinycolor({ h: color.h, s: color.s, l: 1, a: color.a }).toHex8();
    return tinycolor({ h: color.h, s: color.s, l: 1, a: color.a }).toHex();
  }
  if (isAlpha)
    return tinycolor({ h: color.h, s: color.s, l: lum, a: color.a }).toHex8();
  return tinycolor({ h: color.h, s: color.s, l: lum, a: color.a }).toHex();
}

/**
 * applyLumMod
 * @param {string} rgbStr
 * @param {number} multiplier
 */
function applyLumMod(rgbStr, multiplier, isAlpha) {
  var color = tinycolor(rgbStr).toHsl();
  //console.log("applyLumMod  color.l: ", color.l, ", multiplier: ", multiplier, ", color.l * multiplier : ", color.l * multiplier)
  var cacl_l = color.l * multiplier;
  if (cacl_l >= 1) {
    cacl_l = 1;
  }
  if (isAlpha)
    return tinycolor({ h: color.h, s: color.s, l: cacl_l, a: color.a }).toHex8();
  return tinycolor({ h: color.h, s: color.s, l: cacl_l, a: color.a }).toHex();
}


// /**
//  * applyHueMod
//  * @param {string} rgbStr
//  * @param {number} multiplier
//  */
function applyHueMod(rgbStr, multiplier, isAlpha) {
  var color = tinycolor(rgbStr).toHsl();
  //console.log("applyLumMod  color.h: ", color.h, ", multiplier: ", multiplier, ", color.h * multiplier : ", color.h * multiplier)

  var cacl_h = color.h * multiplier;
  if (cacl_h >= 360) {
    cacl_h = cacl_h - 360;
  }
  if (isAlpha)
    return tinycolor({ h: cocacl_h, s: color.s, l: color.l, a: color.a }).toHex8();
  return tinycolor({ h: cacl_h, s: color.s, l: color.l, a: color.a }).toHex();
}


// /**
//  * applyHueOff
//  * @param {string} rgbStr
//  * @param {number} offset
//  */
// function applyHueOff(rgbStr, offset, isAlpha) {
//     var color = tinycolor(rgbStr).toHsl();
//     //console.log("applyLumMod  color.h: ", color.h, ", offset: ", offset, ", color.h * offset : ", color.h * offset)

//     var cacl_h = color.h * offset;
//     if (cacl_h >= 360) {
//         cacl_h = cacl_h - 360;
//     }
//     if (isAlpha)
//         return tinycolor({ h: cocacl_h, s: color.s, l: color.l, a: color.a }).toHex8();
//     return tinycolor({ h: cacl_h, s: color.s, l: color.l, a: color.a }).toHex();
// }
// /**
//  * applySatMod
//  * @param {string} rgbStr
//  * @param {number} multiplier
//  */
function applySatMod(rgbStr, multiplier, isAlpha) {
  var color = tinycolor(rgbStr).toHsl();
  //console.log("applySatMod  color.s: ", color.s, ", multiplier: ", multiplier, ", color.s * multiplier : ", color.s * multiplier)
  var cacl_s = color.s * multiplier;
  if (cacl_s >= 1) {
    cacl_s = 1;
  }
  //return;
  // if (isAlpha)
  //     return tinycolor(rgbStr).saturate(multiplier * 100).toHex8();
  // return tinycolor(rgbStr).saturate(multiplier * 100).toHex();
  if (isAlpha)
    return tinycolor({ h: color.h, s: cacl_s, l: color.l, a: color.a }).toHex8();
  return tinycolor({ h: color.h, s: cacl_s, l: color.l, a: color.a }).toHex();
}

/**
 * rgba2hex
 * @param {string} rgbaStr
 */
function rgba2hex(rgbaStr) {
  var a,
    rgb = rgbaStr.replace(/\s/g, '').match(/^rgba?\((\d+),(\d+),(\d+),?([^,\s)]+)?/i),
    alpha = (rgb && rgb[4] || "").trim(),
    hex = rgb ?
      (rgb[1] | 1 << 8).toString(16).slice(1) +
      (rgb[2] | 1 << 8).toString(16).slice(1) +
      (rgb[3] | 1 << 8).toString(16).slice(1) : rgbaStr;

  if (alpha !== "") {
    a = alpha;
  } else {
    a = 0o1;
  }
  // multiply before convert to HEX
  a = ((a * 255) | 1 << 8).toString(16).slice(1)
  hex = hex + a;

  return hex;
}

///////////////////////Amir////////////////
function angleToDegrees(angle) {
  if (angle == "" || angle == null) {
    return 0;
  }
  return Math.round(angle / 60000);
}
// function degreesToRadians(degrees) {
//     //Math.PI
//     if (degrees == "" || degrees == null || degrees == undefined) {
//         return 0;
//     }
//     return degrees * (Math.PI / 180);
// }
function getMimeType(imgFileExt) {
  var mimeType = "";
  //console.log(imgFileExt)
  switch (imgFileExt.toLowerCase()) {
    case "jpg":
    case "jpeg":
      mimeType = "image/jpeg";
      break;
    case "png":
      mimeType = "image/png";
      break;
    case "gif":
      mimeType = "image/gif";
      break;
    case "emf": // Not native support
      mimeType = "image/x-emf";
      break;
    case "wmf": // Not native support
      mimeType = "image/x-wmf";
      break;
    case "svg":
      mimeType = "image/svg+xml";
      break;
    case "mp4":
      mimeType = "video/mp4";
      break;
    case "webm":
      mimeType = "video/webm";
      break;
    case "ogg":
      mimeType = "video/ogg";
      break;
    case "avi":
      mimeType = "video/avi";
      break;
    case "mpg":
      mimeType = "video/mpg";
      break;
    case "wmv":
      mimeType = "video/wmv";
      break;
    case "mp3":
      mimeType = "audio/mpeg";
      break;
    case "wav":
      mimeType = "audio/wav";
      break;
    case "tif":
    case "tiff":
      mimeType = "image/tiff";
      break;
  }
  return mimeType;
}
function getSvgGradient(w, h, angl, color_arry, shpId) {
  var stopsArray = getMiddleStops(color_arry.length - 2);

  var svgAngle = '',
    svgHeight = h,
    svgWidth = w,
    svg = '',
    xy_ary = SVGangle(angl, svgHeight, svgWidth),
    x1 = xy_ary[0],
    y1 = xy_ary[1],
    x2 = xy_ary[2],
    y2 = xy_ary[3];

  var sal = stopsArray.length,
    sr = sal < 20 ? 100 : 1000;
  svgAngle = ' gradientUnits="userSpaceOnUse" x1="' + x1 + '%" y1="' + y1 + '%" x2="' + x2 + '%" y2="' + y2 + '%"';
  svgAngle = '<linearGradient id="linGrd_' + shpId + '"' + svgAngle + '>\n';
  svg += svgAngle;

  for (var i = 0; i < sal; i++) {
    var tinClr = tinycolor("#" + color_arry[i]);
    var alpha = tinClr.getAlpha();
    //console.log("color: ", color_arry[i], ", rgba: ", tinClr.toHexString(), ", alpha: ", alpha)
    svg += '<stop offset="' + Math.round(parseFloat(stopsArray[i]) / 100 * sr) / sr + '" style="stop-color:' + tinClr.toHexString() + '; stop-opacity:' + (alpha) + ';"';
    svg += '/>\n'
  }

  svg += '</linearGradient>\n' + '';

  return svg
}
function getMiddleStops(s) {
  var sArry = ['0%', '100%'];
  if (s == 0) {
    return sArry;
  } else {
    var i = s;
    while (i--) {
      var middleStop = 100 - ((100 / (s + 1)) * (i + 1)), // AM: Ex - For 3 middle stops, progression will be 25%, 50%, and 75%, plus 0% and 100% at the ends.
        middleStopString = middleStop + "%";
      sArry.splice(-1, 0, middleStopString);
    } // AM: add into stopsArray before 100%
  }
  return sArry
}
function SVGangle(deg, svgHeight, svgWidth) {
  var w = parseFloat(svgWidth),
    h = parseFloat(svgHeight),
    ang = parseFloat(deg),
    o = 2,
    n = 2,
    wc = w / 2,
    hc = h / 2,
    tx1 = 2,
    ty1 = 2,
    tx2 = 2,
    ty2 = 2,
    k = (((ang % 360) + 360) % 360),
    j = (360 - k) * Math.PI / 180,
    i = Math.tan(j),
    l = hc - i * wc;

  if (k == 0) {
    tx1 = w,
      ty1 = hc,
      tx2 = 0,
      ty2 = hc
  } else if (k < 90) {
    n = w,
      o = 0
  } else if (k == 90) {
    tx1 = wc,
      ty1 = 0,
      tx2 = wc,
      ty2 = h
  } else if (k < 180) {
    n = 0,
      o = 0
  } else if (k == 180) {
    tx1 = 0,
      ty1 = hc,
      tx2 = w,
      ty2 = hc
  } else if (k < 270) {
    n = 0,
      o = h
  } else if (k == 270) {
    tx1 = wc,
      ty1 = h,
      tx2 = wc,
      ty2 = 0
  } else {
    n = w,
      o = h;
  }
  // AM: I could not quite figure out what m, n, and o are supposed to represent from the original code on visualcsstools.com.
  var m = o + (n / i),
    tx1 = tx1 == 2 ? i * (m - l) / (Math.pow(i, 2) + 1) : tx1,
    ty1 = ty1 == 2 ? i * tx1 + l : ty1,
    tx2 = tx2 == 2 ? w - tx1 : tx2,
    ty2 = ty2 == 2 ? h - ty1 : ty2,
    x1 = Math.round(tx2 / w * 100 * 100) / 100,
    y1 = Math.round(ty2 / h * 100 * 100) / 100,
    x2 = Math.round(tx1 / w * 100 * 100) / 100,
    y2 = Math.round(ty1 / h * 100 * 100) / 100;
  return [x1, y1, x2, y2];
}
async function getSvgImagePattern(blipFillNode, fill, shpId, warpObj, sharedFillContext) {
  const [ width, height ] = await getBase64ImageDimensions(fill);
  blipFillNode = blipFillNode || {};
  var tileNode = getTextByPathList(blipFillNode, ["a:tile", "attrs"])
  if (tileNode !== undefined && tileNode["sx"] !== undefined) {
    var sx = (parseInt(tileNode["sx"]) / 100000) * width;
    var sy = (parseInt(tileNode["sy"]) / 100000) * height;
  }

  const blipNode = blipFillNode["a:blip"] || {};
  var tialphaModFixNode = getTextByPathList(blipNode, ["a:alphaModFix", "attrs"])
  var imgOpacity = "";
  if (tialphaModFixNode !== undefined && tialphaModFixNode["amt"] !== undefined && tialphaModFixNode["amt"] != "") {
    var amt = parseInt(tialphaModFixNode["amt"]) / 100000;
    var opacity = amt;
    imgOpacity = "opacity='" + opacity + "'";
  }
  if (sharedFillContext !== undefined) {
    var sharedWidth = Math.max(1, sharedFillContext.width);
    var sharedHeight = Math.max(1, sharedFillContext.height);
    var crop = getBlipCropStyles(blipFillNode).svg;
    var sharedImageX = -sharedFillContext.x + sharedWidth * crop.x / 100;
    var sharedImageY = -sharedFillContext.y + sharedHeight * crop.y / 100;
    var sharedImageWidth = sharedWidth * crop.width / 100;
    var sharedImageHeight = sharedHeight * crop.height / 100;
    var sharedImageTransform = getInverseCenteredShapeTransform(sharedFillContext.shapeTransform || {});
    var sharedPatternWidth = Math.max(
      sharedWidth,
      toFiniteNumber(sharedFillContext.shapeTransform && sharedFillContext.shapeTransform.width, 0)
    );
    var sharedPatternHeight = Math.max(
      sharedHeight,
      toFiniteNumber(sharedFillContext.shapeTransform && sharedFillContext.shapeTransform.height, 0)
    );
    var ptrn = '<pattern id="imgPtrn_' + shpId + '" x="0" y="0" width="' +
      sharedPatternWidth + '" height="' + sharedPatternHeight + '" patternUnits="userSpaceOnUse">';
  } else if (sx !== undefined && sx != 0) {
    var ptrn = '<pattern id="imgPtrn_' + shpId + '" x="0" y="0"  width="' + sx + '" height="' + sy + '" patternUnits="userSpaceOnUse">';
  } else {
    var ptrn = '<pattern id="imgPtrn_' + shpId + '"  patternContentUnits="objectBoundingBox"  width="1" height="1">';
  }
  var duotoneNode = getTextByPathList(blipNode, ["a:duotone"])
  var fillterNode = "";
  var filterUrl = "";
  if (duotoneNode !== undefined) {
    //console.log("pic duotoneNode: ", duotoneNode)
    var clr_ary = [];
    Object.keys(duotoneNode).forEach(function (clr_type) {
      //Object.keys(duotoneNode[clr_type]).forEach(function (clr) {
      //console.log("blip pic duotone clr: ", duotoneNode[clr_type][clr], clr)
      if (clr_type != "attrs") {
        var obj = {};
        obj[clr_type] = duotoneNode[clr_type];
        //console.log("blip pic duotone obj: ", obj)
        var hexClr = getSolidFill(obj, undefined, undefined, warpObj)
        //clr_ary.push();

        var color = tinycolor("#" + hexClr);
        clr_ary.push(color.toRgb()); // { r: 255, g: 0, b: 0, a: 1 }
      }
      // })
    })

    if (clr_ary.length == 2) {

      fillterNode = '<filter id="svg_image_duotone"> ' +
        '<feColorMatrix type="matrix" values=".33 .33 .33 0 0' +
        '.33 .33 .33 0 0' +
        '.33 .33 .33 0 0' +
        '0 0 0 1 0">' +
        '</feColorMatrix>' +
        '<feComponentTransfer color-interpolation-filters="sRGB">' +
        //clr_ary.forEach(function(clr){
        '<feFuncR type="table" tableValues="' + clr_ary[0].r / 255 + ' ' + clr_ary[1].r / 255 + '"></feFuncR>' +
        '<feFuncG type="table" tableValues="' + clr_ary[0].g / 255 + ' ' + clr_ary[1].g / 255 + '"></feFuncG>' +
        '<feFuncB type="table" tableValues="' + clr_ary[0].b / 255 + ' ' + clr_ary[1].b / 255 + '"></feFuncB>' +
        //});
        '</feComponentTransfer>' +
        ' </filter>';
    }

    filterUrl = 'filter="url(#svg_image_duotone)"';

    ptrn += fillterNode;
  }

  fill = escapeHtml(fill);
  if (sharedFillContext !== undefined) {
    ptrn += '<image xlink:href="' + fill + '" x="' + sharedImageX + '" y="' +
      sharedImageY + '" width="' + sharedImageWidth + '" height="' +
      sharedImageHeight + '" preserveAspectRatio="none"' +
      (sharedImageTransform ? ' transform="' + sharedImageTransform + '"' : '') + ' ' + imgOpacity + ' ' +
      filterUrl + '></image>';
  } else if (sx !== undefined && sx != 0) {
    ptrn += '<image  xlink:href="' + fill + '" x="0" y="0" width="' + sx + '" height="' + sy + '" ' + imgOpacity + ' ' + filterUrl + '></image>';
  } else {
    ptrn += '<image  xlink:href="' + fill + '" preserveAspectRatio="none" width="1" height="1" ' + imgOpacity + ' ' + filterUrl + '></image>';
  }
  ptrn += '</pattern>';

  //console.log("getSvgImagePattern(...) pic_dim:", pic_dim, ", fillColor: ", fill, ", blipNode: ", blipNode, ",sx: ", sx, ", sy: ", sy, ", clr_ary: ", clr_ary, ", ptrn: ", ptrn)

  return ptrn;
}

async function getBase64ImageDimensions(imgSrc) {
  try {
    const image = await self.createImageBitmap(dataURLtoBlob(imgSrc));
    return [image.width, image.height];
  } catch (e) {
    return [1, 1];
  }
}

function dataURLtoBlob(dataurl) {
  let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while(n--){
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], {type:mime});
}

function base64ArrayBuffer(arrayBuffer) {
  var base64 = '';
  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var bytes = new Uint8Array(arrayBuffer);
  var byteLength = bytes.byteLength;
  var byteRemainder = byteLength % 3;
  var mainLength = byteLength - byteRemainder;

  var a, b, c, d;
  var chunk;

  for (var i = 0; i < mainLength; i = i + 3) {
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    a = (chunk & 16515072) >> 18;
    b = (chunk & 258048) >> 12;
    c = (chunk & 4032) >> 6;
    d = chunk & 63;
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
  }

  if (byteRemainder == 1) {
    chunk = bytes[mainLength];
    a = (chunk & 252) >> 2;
    b = (chunk & 3) << 4;
    base64 += encodings[a] + encodings[b] + '==';
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
    a = (chunk & 64512) >> 10;
    b = (chunk & 1008) >> 4;
    c = (chunk & 15) << 2;
    base64 += encodings[a] + encodings[b] + encodings[c] + '=';
  }

  return base64;
}

function IsVideoLink(vdoFile) {
  /*
            var ext = extractFileExtension(vdoFile);
            if (ext.length == 3){
                return false;
            }else{
                return true;
            }
            */
  var urlregex = /^(https?|ftp):\/\/([a-zA-Z0-9.-]+(:[a-zA-Z0-9.&%$-]+)*@)*((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(:[0-9]+)*(\/($|[a-zA-Z0-9.,?'\\+&%$#=~_-]+))*$/;
  return urlregex.test(vdoFile);
}

function extractFileExtension(filename) {
  return filename.substr((~-filename.lastIndexOf(".") >>> 0) + 2);
}

export function sanitizePptxHyperlinkTarget(value) {
  if (typeof value !== "string") {
    return "";
  }
  var normalized = value.trim();
  var compact = normalized.replace(/[\u0000-\u0020\u007f-\u009f]/g, "");
  if (/^(?:https?|ftp|mailto|tel):/i.test(compact)) {
    return normalized;
  }
  if (/^(?:\/\/|\\)/.test(normalized) || /^[a-z][a-z0-9+.-]*:/i.test(compact)) {
    return "";
  }
  return normalized;
}

export function sanitizeHexColor(value) {
  var normalized = String(value == null ? "" : value).trim();
  return /^[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(normalized) ? normalized : "000000";
}

export function sanitizePptxFontName(value) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029;{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 256);
}

export function escapeHtml(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text == null ? "" : text).replace(/[&<>"']/g, function (m) { return map[m]; });
}
