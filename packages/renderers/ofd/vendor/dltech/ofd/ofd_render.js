/*
 * ofd.js - A Javascript class for reading and rendering ofd files
 * <https://github.com/DLTech21/ofd.js>
 *
 * Copyright (c) 2020. DLTech21 All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

import {
    calPathPoint,
    calTextPoint,
    converterDpi, convertPathAbbreviatedDatatoPoint,
    getFontFamily,
    parseColor,
    parseCtm,
    parseStBox,
    setPageScal,
    converterBox, setMaxPageScal,
} from "./ofd_util.js";

export const renderPageBox = function (screenWidth, pages, document) {
    let pageBoxs = [];
    for (const page of pages) {
        let boxObj = {};
        boxObj['id'] = Object.keys(page)[0];
        boxObj['box'] = calPageBox(screenWidth, document, page);
        pageBoxs.push(boxObj);
    }
    return pageBoxs;
}

export const calPageBox = function (screenWidth, document, page) {
    const area = page[Object.keys(page)[0]]['json']['ofd:Area'];
    let box;
    if (area) {
        const physicalBox = area['ofd:PhysicalBox']
        if (physicalBox) {
            box = (physicalBox);
        } else {
            const applicationBox = area['ofd:ApplicationBox']
            if (applicationBox) {
                box = (applicationBox);
            } else {
                const contentBox = area['ofd:ContentBox']
                if (contentBox) {
                    box = (contentBox);
                }
            }
        }
    } else {
        let documentArea = document['ofd:CommonData']['ofd:PageArea']
        const physicalBox = documentArea['ofd:PhysicalBox']
        if (physicalBox) {
            box = (physicalBox);
        } else {
            const applicationBox = documentArea['ofd:ApplicationBox']
            if (applicationBox) {
                box = (applicationBox);
            } else {
                const contentBox = documentArea['ofd:ContentBox']
                if (contentBox) {
                    box = (contentBox);
                }
            }
        }
    }
    let array = box.split(' ');
    const scale = ((screenWidth - 10) / parseFloat(array[2])).toFixed(1);
    setMaxPageScal(scale);
    setPageScal(scale);
    box = parseStBox( box);
    box = converterBox(box)
    return box;
}

export const calPageBoxScale = function (document, page) {
    const area = page[Object.keys(page)[0]]['json']['ofd:Area'];
    let box;
    if (area) {
        const physicalBox = area['ofd:PhysicalBox']
        if (physicalBox) {
            box = (physicalBox);
        } else {
            const applicationBox = area['ofd:ApplicationBox']
            if (applicationBox) {
                box = (applicationBox);
            } else {
                const contentBox = area['ofd:ContentBox']
                if (contentBox) {
                    box = (contentBox);
                }
            }
        }
    } else {
        let documentArea = document['ofd:CommonData']['ofd:PageArea']
        const physicalBox = documentArea['ofd:PhysicalBox']
        if (physicalBox) {
            box = (physicalBox);
        } else {
            const applicationBox = documentArea['ofd:ApplicationBox']
            if (applicationBox) {
                box = (applicationBox);
            } else {
                const contentBox = documentArea['ofd:ContentBox']
                if (contentBox) {
                    box = (contentBox);
                }
            }
        }
    }
    box = parseStBox( box);
    box = converterBox(box)
    return box;
}

// OFD 的 PathObject/TextObject/Layer 通常通过 DrawParam 引用共享颜色/线宽，
// 而不是在对象上直接写 ofd:FillColor / ofd:StrokeColor；DrawParam 之间还能通过
// Relative 相互继承。三处（Layer、PathObject、TextObject）都需要同样的解析规则，
// 否则引用 DrawParam 取色的对象会因为拿不到颜色而被当成透明，完全不可见。
const resolveDrawParamStyle = function (drawParamResObj, drawParamId, base) {
    let fillColor = base?.fillColor ?? null;
    let strokeColor = base?.strokeColor ?? null;
    let lineWith = base?.lineWith;
    if (!drawParamId || !drawParamResObj || !drawParamResObj[drawParamId]) {
        return { fillColor, strokeColor, lineWith };
    }
    let drawParam = drawParamId;
    if (drawParamResObj[drawParam]['relative']) {
        drawParam = drawParamResObj[drawParam]['relative'];
        if (drawParamResObj[drawParam] && drawParamResObj[drawParam]['FillColor']) {
            fillColor = parseColor(drawParamResObj[drawParam]['FillColor']);
        }
        if (drawParamResObj[drawParam] && drawParamResObj[drawParam]['StrokeColor']) {
            strokeColor = parseColor(drawParamResObj[drawParam]['StrokeColor']);
        }
        if (drawParamResObj[drawParam] && drawParamResObj[drawParam]['LineWidth']) {
            lineWith = converterDpi(drawParamResObj[drawParam]['LineWidth']);
        }
        drawParam = drawParamId;
    }
    if (drawParamResObj[drawParam]['FillColor']) {
        fillColor = parseColor(drawParamResObj[drawParam]['FillColor']);
    }
    if (drawParamResObj[drawParam]['StrokeColor']) {
        strokeColor = parseColor(drawParamResObj[drawParam]['StrokeColor']);
    }
    if (drawParamResObj[drawParam]['LineWidth']) {
        lineWith = converterDpi(drawParamResObj[drawParam]['LineWidth']);
    }
    return { fillColor, strokeColor, lineWith };
}

// 根据模板来渲染层节点
const renderLayerFromTemplate = function (tpls, template, pageDiv, fontResObj, drawParamResObj, multiMediaResObj) {
    let array = [];
    const layers = tpls[template['@_TemplateID']]['json']['ofd:Content']['ofd:Layer'];
    array = array.concat(layers);
    for (let layer of array) {
        if (layer) {
            renderLayer(pageDiv, fontResObj, drawParamResObj, multiMediaResObj, layer, false);
        }
    }
}

export const renderPage = function (pageDiv, page, tpls, fontResObj, drawParamResObj, multiMediaResObj) {
    const pageId = Object.keys(page)[0];
    const template = page[pageId]['json']['ofd:Template'];
    if (Array.isArray(template)) { // 当使用多个模板时
        template.forEach(item => {
            /**
             * 此处只满足 ZOrder 相同的情况
             * 若 ZOrder 不同，可能需要根据 ZOrder 排序来渲染
             * 参考 http://www.dajs.gov.cn/attach/0/88a7620d9d3f4e13b2baa52ab3487854.pdf 第 18 页 ZOrder 的属性说明
             */
            if (item) {
                renderLayerFromTemplate(tpls, item, pageDiv, fontResObj, drawParamResObj, multiMediaResObj);
            }
        });
    } else if (template) { // 当使用单个模板时
        renderLayerFromTemplate(tpls, template, pageDiv, fontResObj, drawParamResObj, multiMediaResObj);
    } else {
        // OFD 页面可以不声明模板，只包含正文内容层；这种情况继续渲染正文层即可。
    }

    const contentLayers = page[pageId]?.json?.['ofd:Content']?.['ofd:Layer'];
    let array = [];
    array = array.concat(contentLayers);
    for (let contentLayer of array) {
        if (contentLayer) {
            renderLayer(pageDiv, fontResObj, drawParamResObj, multiMediaResObj, contentLayer, false);
        }
    }
    if (page[pageId].stamp) {
        for (const stamp of page[pageId].stamp) {
          if (stamp.type === 'ofd') {
            renderSealPage(pageDiv, stamp.obj.pages, stamp.obj.tpls, true, stamp.stamp.stampAnnot, stamp.obj.fontResObj, stamp.obj.drawParamResObj, stamp.obj.multiMediaResObj, stamp.stamp.sealObj.SES_Signature, stamp.stamp.signedInfo);
          } else if (stamp.type === 'png') {
              let sealBoundary = converterBox(stamp.obj.boundary);
              const oid = Array.isArray(stamp.stamp.stampAnnot)?stamp.stamp.stampAnnot[0]['pfIndex']:stamp.stamp.stampAnnot['pfIndex'];
              let element = renderImageOnDiv(pageDiv.style.width, pageDiv.style.height, stamp.obj.img, sealBoundary, stamp.obj.clip, true, stamp.stamp.sealObj.SES_Signature, stamp.stamp.signedInfo,oid);
              pageDiv.appendChild(element);
          }
        }
    }
    if (page[pageId].annotation) {
        for (const annotation of page[pageId].annotation) {
            renderAnnotation(pageDiv, annotation, fontResObj, drawParamResObj, multiMediaResObj);
        }
    }
}

const renderAnnotation = function (pageDiv, annotation, fontResObj, drawParamResObj, multiMediaResObj) {
    let div = document.createElement('div');
    div.setAttribute('style', `overflow: hidden;z-index:${annotation['pfIndex']};position:relative;`)
    let boundary = annotation['appearance']?.['@_Boundary'];
    if (boundary) {
        let divBoundary = converterBox(parseStBox(boundary));
        div.setAttribute('style', `overflow: hidden;z-index:${annotation['pfIndex']};position:absolute; left: ${divBoundary.x}px; top: ${divBoundary.y}px; width: ${divBoundary.w}px; height: ${divBoundary.h}px`)
    }
    const contentLayer = annotation['appearance'];
    renderLayer(div, fontResObj, drawParamResObj, multiMediaResObj, contentLayer, false);
    pageDiv.appendChild(div);

}

const renderSealPage = function (pageDiv, pages, tpls, isStampAnnot, stampAnnot, fontResObj, drawParamResObj, multiMediaResObj, SES_Signature, signedInfo) {
    for (const page of pages) {
        const pageId = Object.keys(page)[0];
        let stampAnnotBoundary = {x: 0, y: 0, w: 0, h: 0};
        if (isStampAnnot && stampAnnot) {
            stampAnnotBoundary = stampAnnot.boundary;
        }
        let divBoundary = converterBox(stampAnnotBoundary);
        let div = document.createElement('div');
        div.setAttribute("name","seal_img_div");
        div.setAttribute('style', `cursor: pointer; overflow: hidden; position:absolute; left: ${divBoundary.x}px; top: ${divBoundary.y}px; width: ${divBoundary.w}px; height: ${divBoundary.h}px`)
        div.setAttribute('data-ses-signature', `${JSON.stringify(SES_Signature || {})}`);
        div.setAttribute('data-signed-info', `${JSON.stringify(signedInfo || {})}`);
        const template = page[pageId]['json']['ofd:Template'];
        if (template) {
            const layers = tpls[template['@_TemplateID']]['json']['ofd:Content']['ofd:Layer'];
            let array = [];
            array = array.concat(layers);
            for (let layer of array) {
                if (layer) {
                    renderLayer(div, fontResObj, drawParamResObj, multiMediaResObj, layer,  isStampAnnot);
                }
            }
        }
        const contentLayers = page[pageId]['json']['ofd:Content']['ofd:Layer'];
        let array = [];
        array = array.concat(contentLayers);
        for (let contentLayer of array) {
            if (contentLayer) {
                renderLayer(div, fontResObj, drawParamResObj, multiMediaResObj, contentLayer, isStampAnnot);
            }
        }
        pageDiv.appendChild(div);
    }
}

const renderLayer = function (pageDiv, fontResObj, drawParamResObj, multiMediaResObj, layer, isStampAnnot) {
    const layerStyle = resolveDrawParamStyle(drawParamResObj, layer?.['@_DrawParam'], {
        fillColor: null,
        strokeColor: null,
        lineWith: converterDpi(0.353),
    });
    let fillColor = layerStyle.fillColor;
    let strokeColor = layerStyle.strokeColor;
    let lineWith = layerStyle.lineWith;
    const imageObjects = layer?.['ofd:ImageObject'];
    let imageObjectArray = [];
    imageObjectArray = imageObjectArray.concat(imageObjects);
    for (const imageObject of imageObjectArray) {
        if (imageObject) {
            let element = renderImageObject(pageDiv.style.width, pageDiv.style.height, multiMediaResObj, imageObject)
            pageDiv.appendChild(element);
        }
    }
    const pathObjects = layer?.['ofd:PathObject'];
    let pathObjectArray = [];
    pathObjectArray = pathObjectArray.concat(pathObjects);
    for (const pathObject of pathObjectArray) {
        if (pathObject) {
            let svg = renderPathObject(drawParamResObj, pathObject, fillColor, strokeColor, lineWith, isStampAnnot)
            pageDiv.appendChild(svg);
        }
    }
    const textObjects = layer?.['ofd:TextObject'];
    let textObjectArray = [];
    textObjectArray = textObjectArray.concat(textObjects);
    for (const textObject of textObjectArray) {
        if (textObject) {
            let svg = renderTextObject(drawParamResObj, fontResObj, textObject, fillColor, strokeColor);
            pageDiv.appendChild(svg);
        }
    }
    const pageBlocks = layer?.['ofd:PageBlock'];
    let pageBlockArray = [];
    pageBlockArray = pageBlockArray.concat(pageBlocks);
    for (const pageBlock of pageBlockArray) {
        if (pageBlock) {
            // 部分 OFD（如 OFD R&W 导出的版式）把正文对象包在 PageBlock 里，需递归渲染。
            renderLayer(pageDiv, fontResObj, drawParamResObj, multiMediaResObj, pageBlock, isStampAnnot);
        }
    }
}

// ImageObject 的 CTM 坐标系以 Boundary 左上角为原点，不是页面原点。
// 常见 OFD 会把尺寸写在 CTM，把页面位置写在 Boundary，此时 e/f 为 0；
// OFD R&W 则会给图像一个整页 Boundary，再用 CTM 的 e/f 在该 Boundary 内定位。
// 两类文件都必须将 Boundary 原点与 CTM 平移叠加；直接把 e/f 当页面
// 坐标会导致所有 e/f=0 的普通图片集中跑到页面左上角。
const parseImageCtm = function (ctm) {
    if (!ctm) {
        return null;
    }
    const values = String(ctm).trim().split(/\s+/).map(Number);
    return values.length === 6 && values.every(value => Number.isFinite(value)) ? values : null;
}

const resolveImageGeometry = function (imageObject) {
    const sourceBoundary = parseStBox(imageObject['@_Boundary']);
    const boundary = converterBox(sourceBoundary);
    const ctmValues = parseImageCtm(imageObject['@_CTM']);
    if (!ctmValues) {
        return { boundary, matrix: null };
    }
    const [a, b, c, d, e, f] = ctmValues;
    const isAxisAligned = Math.abs(b) < 1e-6 && Math.abs(c) < 1e-6;
    if (isAxisAligned) {
        // CTM 把单位正方形映射到 Boundary 内部坐标系，
        // a/d 为宽高，e/f 为相对 Boundary 原点的平移（mm）。
        const ctmBoundary = converterBox({
            x: sourceBoundary.x + Math.min(e, e + a),
            y: sourceBoundary.y + Math.min(f, f + d),
            w: Math.abs(a),
            h: Math.abs(d),
        });
        return { boundary: ctmBoundary, matrix: null };
    }
    // 存在旋转/斜切时使用矩阵直接变换单位方块，但仍需叠加
    // Boundary 原点，否则旋转图像也会被错放到页面左上角。
    return {
        boundary,
        matrix: [a, b, c, d, sourceBoundary.x + e, sourceBoundary.y + f],
    };
}

export const renderImageObject = function (pageWidth, pageHeight, multiMediaResObj, imageObject){
    const { boundary, matrix } = resolveImageGeometry(imageObject);
    const resId = imageObject['@_ResourceID'];
    const imageResource = multiMediaResObj ? multiMediaResObj[resId] : null;
    if (!imageResource || typeof imageResource !== 'object') {
        return renderMissingImageObject(boundary, imageObject['pfIndex']);
    }
    if (imageResource.format === 'gbig2') {
        const img = imageResource.img;
        const width = imageResource.width;
        const height = imageResource.height;
        return renderImageOnCanvas(img, width, height, boundary, imageObject['pfIndex']);
    } else if (matrix) {
        return renderImageWithMatrix(imageResource.img, matrix, imageObject['pfIndex']);
    } else {
        return renderImageOnDiv(pageWidth, pageHeight, imageResource.img, boundary, false, false, null, null, imageObject['pfIndex']);
    }
}

const renderImageWithMatrix = function (imgSrc, ctmValues, oid) {
    const [a, b, c, d, e, f] = ctmValues;
    const unit = converterDpi(1);
    let img = document.createElement('img');
    img.src = imgSrc;
    img.setAttribute('width', `${unit}`);
    img.setAttribute('height', `${unit}`);
    img.setAttribute('style', `position:absolute;left:0;top:0;transform-origin:0 0;transform:matrix(${a}, ${b}, ${c}, ${d}, ${converterDpi(e)}, ${converterDpi(f)});z-index:${oid}`);
    return img;
}

const renderMissingImageObject = function (boundary, oid){
    let div = document.createElement('div');
    div.setAttribute('style', `overflow: hidden; position: absolute; left: ${boundary.x}px; top: ${boundary.y}px; width: ${boundary.w}px; height: ${boundary.h}px;z-index: ${oid}`)
    return div;
}

const renderImageOnCanvas = function (img, imgWidth, imgHeight, boundary, oid){
    const arr = new Uint8ClampedArray(4 * imgWidth * imgHeight);
    for (var i = 0; i < img.length; i++) {
        arr[4 * i] = img[i];
        arr[4 * i + 1] = img[i];
        arr[4 * i + 2] = img[i];
        arr[4 * i + 3] = 255;
    }
    let imageData = new ImageData(arr, imgWidth, imgHeight);
    let canvas = document.createElement('canvas');
    canvas.width = imgWidth;
    canvas.height = imgHeight;
    let context = canvas.getContext('2d');
    context.putImageData(imageData, 0, 0);
    canvas.setAttribute('style', `left: ${boundary.x}px; top: ${boundary.y}px; width: ${boundary.w}px; height: ${boundary.h}px;z-index: ${oid}`)
    canvas.style.position = 'absolute';
    return canvas;
}

export const renderImageOnDiv = function (pageWidth, pageHeight, imgSrc, boundary, clip, isStampAnnot, SES_Signature, signedInfo, oid) {
    let div = document.createElement('div');
    if(isStampAnnot)
    {
        div.setAttribute("name","seal_img_div");
        div.setAttribute('data-ses-signature', `${JSON.stringify(SES_Signature || {})}`);
        div.setAttribute('data-signed-info', `${JSON.stringify(signedInfo || {})}`);
    }
    let img = document.createElement('img');
    img.src = imgSrc;
    img.setAttribute('width', '100%');
    img.setAttribute('height', '100%');
    div.appendChild(img);
    let c = '';
    if (clip) {
        clip = converterBox(clip);
        c = `clip: rect(${clip.y}px, ${clip.w + clip.x}px, ${clip.h + clip.y}px, ${clip.x}px)`
    }
    // Preserve the stamp geometry declared by OFD. Oversized or partially
    // off-page seals are clipped by the page container, matching OFD readers;
    // shrinking or moving the seal here changes both its position and scale.
    div.setAttribute('style', `cursor: pointer; overflow: hidden; position: absolute; left: ${boundary.x}px; top: ${boundary.y}px; width: ${boundary.w}px; height: ${boundary.h}px; ${c};z-index: ${oid}`)
    return div;
}

export const renderTextObject = function (drawParamResObj, fontResObj, textObject, defaultFillColor, defaultStrokeColor) {
    let defaultFillOpacity = 1;
    let boundary = parseStBox(textObject['@_Boundary']);
    boundary = converterBox(boundary);
    const ctm = textObject['@_CTM'];
    const hScale = textObject['@_HScale'];
    const font = textObject['@_Font'];
    const weight = textObject['@_Weight'];
    const size = converterDpi(parseFloat(textObject['@_Size']));
    let array = [];
    array = array.concat(textObject['ofd:TextCode']);
    const textCodePointList = calTextPoint(array);
    let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('version', '1.1');
    const objectStyle = resolveDrawParamStyle(drawParamResObj, textObject['@_DrawParam'], {
        fillColor: defaultFillColor,
        strokeColor: defaultStrokeColor,
    });
    defaultFillColor = objectStyle.fillColor;
    defaultStrokeColor = objectStyle.strokeColor;
    const fillColor = textObject['ofd:FillColor'];
    if (fillColor) {
        defaultFillColor = parseColor(fillColor['@_Value']);
        let alpha = fillColor['@_Alpha'];
        if (alpha) {
            defaultFillOpacity = alpha>1? alpha/255:alpha;
        }
    }
    for (const textCodePoint of textCodePointList) {
        if (textCodePoint && !isNaN(textCodePoint.x)) {
            let text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', textCodePoint.xPositions?.join(' ') || textCodePoint.x);
            text.setAttribute('y', textCodePoint.yPositions?.join(' ') || textCodePoint.y);
            text.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
            text.textContent = textCodePoint.text;
            if (ctm) {
                const ctms = parseCtm(ctm);
                text.setAttribute('transform', `matrix(${ctms[0]} ${ctms[1]} ${ctms[2]} ${ctms[3]} ${converterDpi(ctms[4])} ${converterDpi(ctms[5])})`)
            }
            if (hScale) {
                text.setAttribute('transform', `matrix(${hScale}, 0, 0, 1, ${(1-hScale)*textCodePoint.x}, 0)`)
                // text.setAttribute('transform-origin', `${textCodePoint.x}`);
            }
            const textFillColor = defaultFillColor || defaultStrokeColor || 'rgb(0, 0, 0)';
            text.setAttribute('fill', textFillColor);
            text.setAttribute('fill-opacity', defaultFillOpacity);
            text.setAttribute('style', `white-space:pre;font-weight: ${weight};font-size:${size}px;font-family: ${getFontFamily(fontResObj[font])};color:${textFillColor};`)
            svg.appendChild(text);
        }

    }
    let width = boundary.w;
    let height = boundary.h;
    let left = boundary.x;
    let top = boundary.y;
    svg.setAttribute('style', `overflow:visible;position:absolute;width:${width}px;height:${height}px;left:${left}px;top:${top}px;z-index:${textObject['pfIndex']}`);
    return svg;
}

const buildSvgPathData = function (points) {
    let d = '';
    for (const point of points) {
        if (point.type === 'M') {
            d += `M${point.x} ${point.y} `;
        } else if (point.type === 'L') {
            d += `L${point.x} ${point.y} `;
        } else if (point.type === 'Q') {
            d += `Q${point.x1} ${point.y1} ${point.x2} ${point.y2} `;
        } else if (point.type === 'B') {
            d += `C${point.x1} ${point.y1} ${point.x2} ${point.y2} ${point.x3} ${point.y3} `;
        } else if (point.type === 'C') {
            d += `Z`;
        }
    }
    return d;
}

// OFD 的装饰性 PathObject（如色带、圆角背景）经常共用一个近乎整页的 Boundary，
// 真正可见的形状由 Clips 裁剪出来；不处理 Clips 会让这些路径以整块矩形铺满并
// 盖住下层图片/文字。Clips 下可以有多个 Clip（依次相交），每个 Clip 下可以有
// 多个 Area（在该 Clip 内取并集），语义上等价于 SVG 里逐层嵌套 clip-path。
const appendClipAreaPath = function (clipPathEl, area) {
    const clipShape = area?.['ofd:Path'];
    const abbreviatedData = clipShape?.['ofd:AbbreviatedData'];
    if (!clipShape || !abbreviatedData) {
        return;
    }
    const clipPoints = calPathPoint(convertPathAbbreviatedDatatoPoint(abbreviatedData));
    const clipPathShape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    clipPathShape.setAttribute('d', buildSvgPathData(clipPoints));
    const clipCtm = clipShape['@_CTM'];
    if (clipCtm) {
        const ctms = parseCtm(clipCtm);
        clipPathShape.setAttribute('transform', `matrix(${ctms[0]} ${ctms[1]} ${ctms[2]} ${ctms[3]} ${converterDpi(ctms[4])} ${converterDpi(ctms[5])})`);
    }
    clipPathEl.appendChild(clipPathShape);
}

const applyClips = function (svgRoot, contentEl, clips) {
    const clipList = clips?.['ofd:Clip'];
    if (!clipList) {
        return contentEl;
    }
    let clipArray = [];
    clipArray = clipArray.concat(clipList);
    let defs = null;
    let current = contentEl;
    let clipIndex = 0;
    for (const clip of clipArray) {
        const areas = clip?.['ofd:Area'];
        if (!clip || !areas) {
            continue;
        }
        if (!defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            svgRoot.appendChild(defs);
        }
        const clipPathEl = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        const clipId = `ofd-clip-${clipIndex++}-${Math.random().toString(36).slice(2, 8)}`;
        clipPathEl.setAttribute('id', clipId);
        let areaArray = [];
        areaArray = areaArray.concat(areas);
        for (const area of areaArray) {
            if (area) {
                appendClipAreaPath(clipPathEl, area);
            }
        }
        defs.appendChild(clipPathEl);
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('clip-path', `url(#${clipId})`);
        group.appendChild(current);
        current = group;
    }
    return current;
}

export const renderPathObject = function (drawParamResObj, pathObject, defaultFillColor, defaultStrokeColor, defaultLineWith, isStampAnnot) {
    let boundary = parseStBox(pathObject['@_Boundary']);
    boundary = converterBox(boundary);
    let lineWidth = pathObject['@_LineWidth'];
    const abbreviatedData = pathObject['ofd:AbbreviatedData'];
    const points = calPathPoint(convertPathAbbreviatedDatatoPoint(abbreviatedData));
    const ctm = pathObject['@_CTM'];
    let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('version', '1.1');
    let path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    if (lineWidth) {
        defaultLineWith = converterDpi(lineWidth);
    }
    const drawParam = pathObject['@_DrawParam'];
    if (drawParam) {
        lineWidth = drawParamResObj[drawParam]?.LineWidth;
        if (lineWidth) {
            defaultLineWith = converterDpi(lineWidth);
        }
    }
    // PathObject 自身没有内联 ofd:FillColor/StrokeColor 时，颜色通常来自其引用的 DrawParam；
    // 先按 DrawParam 解析出默认色，再让内联颜色（若存在）覆盖，否则文字/图形轮廓会因为
    // 拿不到颜色而按 fill:none 处理，变成不可见。
    const objectStyle = resolveDrawParamStyle(drawParamResObj, drawParam, {
        fillColor: defaultFillColor,
        strokeColor: defaultStrokeColor,
    });
    defaultFillColor = objectStyle.fillColor;
    defaultStrokeColor = objectStyle.strokeColor;
    if (ctm) {
        const ctms = parseCtm(ctm);
        path.setAttribute('transform', `matrix(${ctms[0]} ${ctms[1]} ${ctms[2]} ${ctms[3]} ${converterDpi(ctms[4])} ${converterDpi(ctms[5])})`)
    }
    let strokeStyle = '';
    const strokeColor = pathObject['ofd:StrokeColor'];
    if (strokeColor) {
        defaultStrokeColor = parseColor(strokeColor['@_Value'])
    }
    let fillStyle = 'fill: none;';
    const fillColor = pathObject['ofd:FillColor'];
    if (fillColor) {
        defaultFillColor = parseColor(fillColor['@_Value'])
    }
    if (defaultLineWith > 0 && !defaultStrokeColor) {
        defaultStrokeColor = defaultFillColor;
        if (!defaultStrokeColor) {
            defaultStrokeColor = 'rgb(0, 0, 0)';
        }
    }
    strokeStyle = `stroke:${defaultStrokeColor};stroke-width:${defaultLineWith}px;`;
    if (pathObject['@_Stroke'] == 'false') {
        strokeStyle = ``;
    }
    if (pathObject['@_Fill'] != 'false') {
        fillStyle = `fill:${isStampAnnot ? 'none' : defaultFillColor ? defaultFillColor : 'none'};`;
    }
    path.setAttribute('style', `${strokeStyle};${fillStyle}`)
    path.setAttribute('d', buildSvgPathData(points));
    svg.appendChild(applyClips(svg, path, pathObject['ofd:Clips']));
    let width = isStampAnnot ? boundary.w : Math.ceil(boundary.w);
    let height = isStampAnnot ? boundary.h : Math.ceil(boundary.h);
    let left = boundary.x;
    let top = boundary.y;
    svg.setAttribute('style', `overflow:visible;position:absolute;width:${width}px;height:${height}px;left:${left}px;top:${top}px;z-index:${pathObject['pfIndex']}`);
    return svg;
}
