import { createHmac } from 'node:crypto';
import { URLSearchParams, parse as urlParse } from 'node:url';
import fetch from 'node-fetch';
import type { GetDocumentResponse } from './GetDocumentResponse';
import type { GetBillOfMaterialsResponse } from './GetBillOfMaterialsResponse';
import { GetElementsInDocumentOptional, GetElementsInDocumentResponse } from './GetElementsInDocument';

// creates random 25-character string
export const buildNonce = function () {
    var chars = [
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
        'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R',
        'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0',
        '1', '2', '3', '4', '5', '6', '7', '8', '9'
    ];
    var nonce = '';
    for (var i = 0; i < 25; i++) {
        nonce += chars[Math.floor(Math.random() * chars.length)];
    }
    return nonce;
}

export const copyObject = function (object: any) {
    if (object === null || typeof object !== 'object') {
        return object;
    }
    var copy = {} as any;
    var keys = Object.keys(object);
    for (var i = 0; i < keys.length; i++) {
        if (object.hasOwnProperty(keys[i])) {
            copy[keys[i]] = copyObject(object[keys[i]]);
        }
    }
    return copy;
}

export const buildDWMVEPath = function (opts: { resource: string, d?: string, w?: string, v?: string, m?: string, e?: string, subresource?: string }) {
    var path = '/api/' + opts.resource + '/d/' + opts.d;
    if ('w' in opts) {
        path += '/w/' + opts.w;
    } else if ('v' in opts) {
        path += '/v/' + opts.v;
    } else if ('m' in opts) {
        path += '/m/' + opts.m;
    }
    if ('e' in opts) {
        path += '/e/' + opts.e;
    }
    if ('subresource' in opts) {
        path += '/' + opts.subresource;
    }

    return path;
}

export const buildQueryString = function (opts: { query: any }) {
    if (!('query' in opts) || typeof opts.query !== 'object' || opts.query == null) {
        return '';
    }
    return new URLSearchParams(opts.query).toString()
    // return queryString.stringify(opts.query);
}

export const inputHeadersFromOpts = function (opts: { headers?: any }) {
    return (!('headers' in opts) || typeof opts.headers !== 'object' || opts.headers == null) ?
        {} : copyObject(opts.headers);
}

export type OnshapeApiCreds = {
    baseUrl?: string;
    accessKey: string;
    secretKey: string;
    debug: boolean;
};
export enum WVM {
    W = "w",
    V = "m",
    M = "m"
}

export interface GetPartsResponse {
    defaultColorHash: string
    ordinal: number
    propertySourceTypes: { [key: string]: any }
    isMesh: boolean
    state: string
    description: any
    revision: any
    partId: string
    bodyType: string
    elementId: string
    microversionId: string
    partNumber: any
    partQuery: string
    configurationId: string
    isHidden: boolean
    partIdentity: any
    isFlattenedBody: boolean
    thumbnailConfigurationId: string
    appearance: Appearance
    meshState: string
    name: string
}

export interface Appearance {
    isGenerated: boolean
    color: any[]
    opacity: number
}

export type GetOpts = {
    d: string
    w?: string
    v?: string
    m?: string
    e?: string
    resource: string
    subresource?: string
    baseUrl?: string,
    query?: { [key: string]: string }
} | {
    path?: string
    baseUrl?: string
    query?: { [key: string]: string }
}

export default class Onshape {
    private creds: OnshapeApiCreds;
    constructor(creds: OnshapeApiCreds) {
        this.creds = creds;
        if (!this.creds.baseUrl) {
            this.creds.baseUrl = "https://cad.onshape.com";
        }
        if (typeof this.creds.debug !== "boolean") {
            this.creds.debug = false;
        }
    }

    private buildHeaders(method: string, path: string, queryString: string, inputHeaders: string) {
        var headers = copyObject(inputHeaders);
        // the Date header needs to be reasonably (5 minutes) close to the server time when the request is received
        var authDate = (new Date()).toUTCString();
        // the On-Nonce header is a random (unique) string that serves to identify the request
        var onNonce = buildNonce();
        if (!('Content-Type' in headers)) {
            headers['Content-Type'] = 'application/json';
        }
        // the Authorization header needs to have this very particular format, which the server uses to validate the request
        // the access key is provided for the server to retrieve the API key; the signature is encrypted with the secret key
        var hmacString = (method + '\n' + onNonce + '\n' + authDate + '\n' +
            headers['Content-Type'] + '\n' + path + '\n' + queryString + '\n').toLowerCase();
        var hmac = createHmac('sha256', this.creds.secretKey);
        hmac.update(hmacString);
        var signature = hmac.digest('base64');
        var asign = 'On ' + this.creds.accessKey + ':HmacSHA256:' + signature;

        headers['On-Nonce'] = onNonce;
        headers['Date'] = authDate;
        headers['Authorization'] = asign;

        if (!('Accept' in headers)) {
            headers['Accept'] = 'application/vnd.onshape.v1+json';
        }

        return headers;
    }

    /*
     * opts: {
     *   d: document ID
     *   w: workspace ID (only one of w, v, m)
     *   v: version ID (only one of w, v, m)
     *   m: microversion ID (only one of w, v, m)
     *   e: elementId
     *   baseUrl: base URL; if present, overrides apikey.js
     *   resource: top-level resource (partstudios)
     *   subresource: sub-resource, if any (massproperties)
     *   path: from /api/...; if present, overrides the other options
     *   accept: accept header (default: application/vnd.onshape.v1+json)
     *   query: query object
     *   headers: headers object
     * }
     */
    public async get(opts: GetOpts) {
        let path = '';
        if ('path' in opts) {
            path = opts.path;
        } else {
            path = buildDWMVEPath(opts as any);
        }
        const baseUrl = ('baseUrl' in opts) ? opts.baseUrl : this.creds.baseUrl;
        const inputHeaders = inputHeadersFromOpts(opts as any);
        let queryString = buildQueryString(opts as any);
        const headers = this.buildHeaders('GET', path, queryString, inputHeaders);
        if (queryString !== '') queryString = '?' + queryString;
        const requestUrl = baseUrl + path + queryString;
        if (this.creds.debug) {
            console.log(`GET ${requestUrl}`);
        }
        let res = await fetch(requestUrl, {
            method: 'GET',
            headers: headers
        });
        return await res.json()

        // var req = protocol.request(requestOpts, function (res) {
        //     var wholeData = '';
        //     res.on('data', function (data) {
        //         wholeData += data;
        //     });
        //     res.on('end', function () {
        //         if (res.statusCode === 200) {
        //             cb(wholeData);
        //         } else if (res.statusCode === 307) {
        //             var redirectParsedUrl = url.parse(res.headers.location);
        //             console.log('Redirecting to ' + res.headers.location);
        //             // the redirect contains a query string, which the API key mechanism needs to encrypt
        //             var redirectOpts = {
        //                 baseUrl: redirectParsedUrl.protocol + '//' + redirectParsedUrl.host,
        //                 path: redirectParsedUrl.pathname,
        //                 headers: inputHeaders,
        //                 query: querystring.parse(redirectParsedUrl.query)
        //             };
        //             get(redirectOpts, cb);
        //         } else {
        //             console.log(requestOpts.method + ' ' + baseUrl + path + queryString);
        //             console.log('Status: ' + res.statusCode);
        //             if (wholeData) {
        //                 console.log(wholeData.toString());
        //             }
        //             util.error(errors.notOKError);
        //         }
        //     });
        // }).on('error', function (e) {
        //     console.log(requestOpts.method + ' ' + baseUrl + path + queryString);
        //     console.log(e);
        //     util.error(errors.getError);
        // });
        // req.end();
    };

    public async GetDocument(documentId: string): Promise<GetDocumentResponse> {
        const opts: GetOpts = {
            path: `/api/documents/${documentId}`
        };
        return this.get(opts) as any;
    }

    public async GetParts(documentId: string, wvm: WVM, wvmId: string, elementId: string): Promise<GetPartsResponse> {
        const opts: GetOpts = {
            d: documentId,
            e: elementId,
            resource: 'parts'
        };
        opts[wvm] = wvmId;
        return this.get(opts as any) as any;
    }

    // /api/documents/d/f2dd281fff1cee4d67627c2e/w/606e94ad4692296338edd039/elements?elementType=Assembly
    public async GetElementsInDocument(documentId: string, wvm: WVM, wvmId: string, optional: GetElementsInDocumentOptional = {}): Promise<GetElementsInDocumentResponse> {
        const opts: GetOpts = {
            d: documentId,
            resource: 'documents',
            subresource: 'elements',
            query: optional as any
        };
        opts[wvm] = wvmId;
        return this.get(opts) as any;
    }

    public async GetBillOfMaterials(documentId: string, wvm: WVM, wvmId: string, elementId: string): Promise<GetBillOfMaterialsResponse> {
        const opts: GetOpts = {
            d: documentId,
            e: elementId,
            resource: 'assemblies',
            subresource: 'bom'
        };
        opts[wvm] = wvmId;
        return this.get(opts as any) as any;
    }


}
