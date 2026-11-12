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

import {calPageBox, calPageBoxScale, renderPage} from "./ofd_render.js";
import {pipeline} from "./pipeline.js";
import {
    getDocRoots,
    parseSingleDoc,
    unzipOfd
} from "./ofd_parser.js";
import {getPageScal, setPageScal} from "./ofd_util.js";

export const parseOfdDocument = function (options) {
    if (options.ofd instanceof File || options.ofd instanceof Blob || options.ofd instanceof ArrayBuffer) {
        doParseOFD(options);
    } else {
        options.fail?.(new Error('OFD 预览只接收 File、Blob 或 ArrayBuffer 数据'));
    }
}

const doParseOFD = function (options) {
    pipeline.call(this, async () => await unzipOfd(options.ofd), getDocRoots, parseSingleDoc)
        .then(res => {
            if (options.success) {
                options.success(res);
            }
        })
        .catch(res => {
            if (options.fail) {
                options.fail(res);
            }
        });
}

export const renderOfd = function (screenWidth, ofd) {
    let divArray = [];
    if (!ofd) {
        return divArray;
    }
    for (const page of ofd.pages) {
        let box = calPageBox(screenWidth, ofd.document, page);
        const pageId = Object.keys(page)[0];
        let pageDiv = document.createElement('div');
        pageDiv.id = pageId;
        pageDiv.setAttribute('style', `margin-bottom: 20px;position: relative;width:${box.w}px;height:${box.h}px;background: white;overflow:hidden;`)
        renderPage(pageDiv, page, ofd.tpls, ofd.fontResObj, ofd.drawParamResObj, ofd.multiMediaResObj);
        divArray.push(pageDiv);
    }
    return divArray;
}

export const renderOfdByScale = function (ofd) {
    let divArray = [];
    if (!ofd) {
        return divArray;
    }
    for (const page of ofd.pages) {
        let box = calPageBoxScale(ofd.document, page);
        const pageId = Object.keys(page)[0];
        let pageDiv = document.createElement('div');
        pageDiv.id = pageId;
        pageDiv.setAttribute('style', `margin-bottom: 20px;position: relative;width:${box.w}px;height:${box.h}px;background: white;overflow:hidden;`)
        renderPage(pageDiv, page, ofd.tpls, ofd.fontResObj, ofd.drawParamResObj, ofd.multiMediaResObj);
        divArray.push(pageDiv);
    }
    return divArray;
}

export const digestCheck = function (options) {
    // 当前预览链路只负责浏览器端展示，不执行签章摘要校验，避免把 ASN.1/国密校验运行时引入异步块。
    return options?.arr ? false : false
}

export const setPageScale = function (scale) {
    setPageScal(scale);
}

export const getPageScale = function () {
    return getPageScal();
}

export { calPageBox, calPageBoxScale, renderPage }
