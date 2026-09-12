/*
 * ofd.js - A Javascript class for reading and rendering ofd files
 * <https://github.com/DLTech21/ofd.js>
 *
 * Copyright (c) 2020. DLTech21 All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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
 * Display-only SES signature parser for File Viewer:
 * extracts seal picture bytes for preview, skips crypto verification
 * so ASN.1/国密校验不会进入预览主路径。
 */

import Hex from '../../lapo-asn1js/hex.js';
import Base64 from '../../lapo-asn1js/base64.js';
import ASN1 from '../../lapo-asn1js/asn1.js';

const reHex = /^\s*(?:[0-9A-Fa-f][0-9A-Fa-f]\s*)+$/;

const unwrapDefault = (mod) => (mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod);

const HexApi = unwrapDefault(Hex);
const Base64Api = unwrapDefault(Base64);
const ASN1Api = unwrapDefault(ASN1);

// SignedData is not an SES seal. In particular, tax invoices use the GM/T
// ContentInfo OID and draw their visible stamp as an ordinary page resource.
const signedDataOids = new Set(['1.2.840.113549.1.7.2', '1.2.156.10197.6.1.4.2.2']);
const universal = (node, number) => node?.tag?.tagClass === 0 && node.tag.tagNumber === number;
const parseSignedData = function (node) {
    if (!universal(node?.sub?.[0], 6)) return null;
    const oidNode = node.sub[0];
    const start = oidNode.stream.pos + oidNode.header;
    const oid = oidNode.stream.parseOID(start, start + oidNode.length).split('\n', 1)[0];
    if (!signedDataOids.has(oid)) throw new Error('Unsupported signature ContentInfo type');
    const wrapper = node.sub[1];
    const signed = wrapper?.sub?.[0];
    if (!universal(node, 16) || node.sub.length !== 2 ||
        wrapper?.tag?.tagClass !== 2 || wrapper.tag.tagNumber !== 0 ||
        !wrapper.tag.tagConstructed || wrapper.sub.length !== 1 ||
        !universal(signed, 16) || signed.sub.length < 4 ||
        !universal(signed.sub[0], 2) || !universal(signed.sub[1], 17) ||
        !universal(signed.sub[2], 16) || !universal(signed.sub[2]?.sub?.[0], 6) ||
        !universal(signed.sub.at(-1), 17)) {
        throw new Error('Malformed SignedData structure');
    }
    return {
        type: 'signed-data',
        verificationStatus: 'not-verified',
        verifyRet: null,
        SES_Signature: {
            format: 'signed-data', contentType: oid, displayOnly: true,
            verificationStatus: 'not-verified',
        },
    };
};

export const parseSesSignature = async function (zip, name, getEntry) {
    const entry = typeof getEntry === 'function' ? getEntry(zip, name) : zip.files[name];
    if (!entry) {
        return {};
    }
    try {
        const bytes = await entry.async('base64');
        return decodeText(bytes);
    } catch (e) {
        console.warn('[ofd] parseSesSignature failed', name, e);
        return {};
    }
};

const decodeText = function (val) {
    try {
        const der = reHex.test(val) ? HexApi.decode(val) : Base64Api.unarmor(val);
        return decode(der);
    } catch (e) {
        console.warn('[ofd] decode SES signature text failed', e);
        return {};
    }
};

const decode = function (der, offset) {
    offset = offset || 0;
    try {
        const root = ASN1Api.decode(der, offset);
        const signedData = parseSignedData(root);
        if (signedData) return signedData;
        const SES_Signature = decodeSES_Signature(root);
        const picture = SES_Signature?.toSign?.eseal?.esealInfo?.picture;
        if (!picture?.data?.byte?.length) {
            return {};
        }
        const type = (picture.type?.str || picture.type || '').toString().toLowerCase();
        return {
            ofdArray: picture.data.byte,
            type,
            // 预览只保留轻量元数据，避免把 DER/证书二进制塞进 DOM data-*。
            SES_Signature: {
                realVersion: SES_Signature.realVersion,
                displayOnly: true,
                verificationStatus: 'not-verified',
                pictureType: type,
                pictureWidth: picture.width,
                pictureHeight: picture.height,
                sealName: SES_Signature.toSign?.eseal?.esealInfo?.property?.name,
            },
            // Displaying an image is not cryptographic signature verification.
            verifyRet: null,
            verificationStatus: 'not-verified',
        };
    } catch (e) {
        console.warn('[ofd] decode SES signature failed', e);
        return {};
    }
};

const decodeUTCTime = function (str) {
    str = String(str || '').replace('Unrecognized time: ', '');
    str = str.replace('Z', '');
    str = str.substr(0, 1) < '5' ? '20' + str : '19' + str;
    return str;
};

const parseStringUTF = function (node) {
    if (!node) {
        return '';
    }
    return node.stream.parseStringUTF(node.stream.pos + node.header, node.stream.pos + node.header + node.length);
};

const parseInteger = function (node) {
    if (!node) {
        return undefined;
    }
    return node.stream.parseInteger(node.stream.pos + node.header, node.stream.pos + node.header + node.length);
};

const parseOctetBytes = function (node) {
    if (!node) {
        return new Uint8Array(0);
    }
    return node.stream.enc.subarray(node.stream.pos + node.header, node.stream.pos + node.header + node.length);
};

const parseTimeNode = function (node, utc) {
    if (!node) {
        return '';
    }
    const raw = node.stream.parseTime(node.stream.pos + node.header, node.stream.pos + node.header + node.length, utc);
    return decodeUTCTime(raw);
};

const decodeSES_Signature = function (asn1) {
    let SES_Signature;
    try {
        // V1
        const createDate = parseTimeNode(asn1.sub[0]?.sub[1]?.sub[0]?.sub[2]?.sub[3]);
        const validStart = parseTimeNode(asn1.sub[0]?.sub[1]?.sub[0]?.sub[2]?.sub[4]);
        const validEnd = parseTimeNode(asn1.sub[0]?.sub[1]?.sub[0]?.sub[2]?.sub[5]);
        const pictureNode = asn1.sub[0]?.sub[1]?.sub[0]?.sub[3];
        SES_Signature = {
            realVersion: 1,
            toSign: {
                eseal: {
                    esealInfo: {
                        property: {
                            name: parseStringUTF(asn1.sub[0]?.sub[1]?.sub[0]?.sub[2]?.sub[1]),
                            createDate,
                            validStart,
                            validEnd,
                        },
                        picture: {
                            type: parseStringUTF(pictureNode?.sub[0]),
                            data: { byte: parseOctetBytes(pictureNode?.sub[1]) },
                            width: parseInteger(pictureNode?.sub[2]),
                            height: parseInteger(pictureNode?.sub[3]),
                        },
                    },
                },
            },
        };
    } catch (e) {
        try {
            // V4
            const pictureNode = asn1.sub[0]?.sub[1]?.sub[0]?.sub[3];
            SES_Signature = {
                realVersion: 4,
                toSign: {
                    eseal: {
                        esealInfo: {
                            property: {
                                name: parseStringUTF(asn1.sub[0]?.sub[1]?.sub[0]?.sub[2]?.sub[1]),
                                createDate: asn1.sub[0]?.sub[1]?.sub[0]?.sub[2]?.sub[4]?.stream.parseTime(
                                    asn1.sub[0].sub[1].sub[0].sub[2].sub[4].stream.pos + asn1.sub[0].sub[1].sub[0].sub[2].sub[4].header,
                                    asn1.sub[0].sub[1].sub[0].sub[2].sub[4].stream.pos + asn1.sub[0].sub[1].sub[0].sub[2].sub[4].header + asn1.sub[0].sub[1].sub[0].sub[2].sub[4].length
                                ),
                                validStart: asn1.sub[0]?.sub[1]?.sub[0]?.sub[2]?.sub[5]?.stream.parseTime(
                                    asn1.sub[0].sub[1].sub[0].sub[2].sub[5].stream.pos + asn1.sub[0].sub[1].sub[0].sub[2].sub[5].header,
                                    asn1.sub[0].sub[1].sub[0].sub[2].sub[5].stream.pos + asn1.sub[0].sub[1].sub[0].sub[2].sub[5].header + asn1.sub[0].sub[1].sub[0].sub[2].sub[5].length
                                ),
                                validEnd: asn1.sub[0]?.sub[1]?.sub[0]?.sub[2]?.sub[6]?.stream.parseTime(
                                    asn1.sub[0].sub[1].sub[0].sub[2].sub[6].stream.pos + asn1.sub[0].sub[1].sub[0].sub[2].sub[6].header,
                                    asn1.sub[0].sub[1].sub[0].sub[2].sub[6].stream.pos + asn1.sub[0].sub[1].sub[0].sub[2].sub[6].header + asn1.sub[0].sub[1].sub[0].sub[2].sub[6].length
                                ),
                            },
                            picture: {
                                type: parseStringUTF(pictureNode?.sub[0]),
                                data: { byte: parseOctetBytes(pictureNode?.sub[1]) },
                                width: parseInteger(pictureNode?.sub[2]),
                                height: parseInteger(pictureNode?.sub[3]),
                            },
                        },
                    },
                },
            };
        } catch (inner) {
            console.warn('[ofd] unsupported SES signature structure', inner);
            SES_Signature = {};
        }
    }
    return SES_Signature;
};
