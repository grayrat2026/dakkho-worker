var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/resend.ts
var resend_exports = {};
__export(resend_exports, {
  sendEmail: () => sendEmail,
  sendTestEmail: () => sendTestEmail
});
async function sendEmail(env, to, subject, html) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Failed to send email" }));
    throw new Error(err.message || "Failed to send email");
  }
  return res.json();
}
async function sendTestEmail(env, to) {
  return sendEmail(
    env,
    to,
    "DAKKHO Admin - Test Email",
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #6366f1;">DAKKHO Admin Panel</h1>
      <h2>Test Email</h2>
      <p>This is a test email from the DAKKHO Admin Panel (Cloudflare Workers).</p>
      <p>If you received this email, your email configuration is working correctly.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #6b7280; font-size: 12px;">
        Sent from DAKKHO Admin API on Cloudflare Workers<br />
        Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}
      </p>
    </div>
    `
  );
}
var init_resend = __esm({
  "src/lib/resend.ts"() {
    "use strict";
  }
});

// src/lib/payment.ts
var payment_exports = {};
__export(payment_exports, {
  createBkashPayment: () => createBkashPayment,
  createPipraPayPayment: () => createPipraPayPayment,
  createSSLCommerzSession: () => createSSLCommerzSession,
  executeBkashPayment: () => executeBkashPayment,
  getBkashBaseURL: () => getBkashBaseURL,
  getPipraPayBaseURL: () => getPipraPayBaseURL,
  getPipraPayHeaders: () => getPipraPayHeaders,
  getSSLCommerzBaseURL: () => getSSLCommerzBaseURL,
  refundPipraPayPayment: () => refundPipraPayPayment,
  verifyPipraPayPayment: () => verifyPipraPayPayment,
  verifyPipraPayWebhookSignature: () => verifyPipraPayWebhookSignature,
  verifySSLCommerzPayment: () => verifySSLCommerzPayment
});
function getSSLCommerzBaseURL(sandbox) {
  return sandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";
}
async function createSSLCommerzSession(env, params) {
  if (!env.SSLCOMMERZ_STORE_ID || !env.SSLCOMMERZ_STORE_PASSWORD) {
    return { error: "SSLCommerz not configured. Set store credentials in Admin Panel." };
  }
  const config = {
    store_id: env.SSLCOMMERZ_STORE_ID,
    store_password: env.SSLCOMMERZ_STORE_PASSWORD,
    sandbox: true
    // Will read from payment_config
  };
  const baseURL = getSSLCommerzBaseURL(config.sandbox);
  const body = new URLSearchParams({
    store_id: config.store_id,
    store_passwd: config.store_password,
    total_amount: params.total_amount.toString(),
    currency: params.currency,
    tran_id: params.tran_id,
    success_url: params.success_url,
    fail_url: params.fail_url,
    cancel_url: params.cancel_url,
    cus_name: params.cus_name,
    cus_email: params.cus_email,
    cus_phone: params.cus_phone,
    cus_add1: params.cus_add1,
    cus_city: params.cus_city,
    product_name: params.product_name,
    product_category: params.product_category,
    product_profile: params.product_profile
  });
  try {
    const response = await fetch(`${baseURL}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    const result = await response.json();
    if (result.status === "SUCCESS") {
      return {
        sessionUrl: result.GatewayPageURL,
        sessionKey: result.sessionkey
      };
    } else {
      return { error: result.failedreason || "SSLCommerz session creation failed" };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "SSLCommerz request failed" };
  }
}
async function verifySSLCommerzPayment(env, tranId, valId) {
  if (!env.SSLCOMMERZ_STORE_ID || !env.SSLCOMMERZ_STORE_PASSWORD) {
    return false;
  }
  const baseURL = getSSLCommerzBaseURL(true);
  try {
    const response = await fetch(
      `${baseURL}/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${env.SSLCOMMERZ_STORE_ID}&store_passwd=${env.SSLCOMMERZ_STORE_PASSWORD}&v=1&format=json`
    );
    const result = await response.json();
    return result.status === "VALID" || result.status === "VALIDATED";
  } catch {
    return false;
  }
}
function getBkashBaseURL(sandbox) {
  return sandbox ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta" : "https://tokenized.pay.bka.sh/v1.2.0-beta";
}
async function getBkashToken(env) {
  if (!env.BKASH_USERNAME || !env.BKASH_PASSWORD || !env.BKASH_APP_KEY || !env.BKASH_APP_SECRET) {
    return null;
  }
  const baseURL = getBkashBaseURL(true);
  try {
    const response = await fetch(`${baseURL}/tokenized/checkout/token/grant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        username: env.BKASH_USERNAME,
        password: env.BKASH_PASSWORD
      },
      body: JSON.stringify({
        app_key: env.BKASH_APP_KEY,
        app_secret: env.BKASH_APP_SECRET
      })
    });
    const result = await response.json();
    return result.id_token || null;
  } catch {
    return null;
  }
}
async function createBkashPayment(env, params) {
  const token = await getBkashToken(env);
  if (!token) {
    return { error: "bKash not configured. Set credentials in Admin Panel." };
  }
  const baseURL = getBkashBaseURL(true);
  try {
    const response = await fetch(`${baseURL}/tokenized/checkout/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
        "x-app-key": env.BKASH_APP_KEY
      },
      body: JSON.stringify({
        mode: "0011",
        payerReference: params.merchantInvoiceNumber,
        callbackURL: params.successUrl,
        amount: params.amount.toString(),
        currency: params.currency || "BDT",
        intent: params.intent || "sale",
        merchantInvoiceNumber: params.merchantInvoiceNumber
      })
    });
    const result = await response.json();
    if (result.bkashURL) {
      return {
        paymentURL: result.bkashURL,
        paymentID: result.paymentID
      };
    } else {
      return { error: result.errorMessage || "bKash payment creation failed" };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "bKash request failed" };
  }
}
async function executeBkashPayment(env, paymentID) {
  const token = await getBkashToken(env);
  if (!token) {
    return { error: "bKash not configured" };
  }
  const baseURL = getBkashBaseURL(true);
  try {
    const response = await fetch(`${baseURL}/tokenized/checkout/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
        "x-app-key": env.BKASH_APP_KEY
      },
      body: JSON.stringify({ paymentID })
    });
    const result = await response.json();
    if (result.statusCode === "0000") {
      return {
        status: result.transactionStatus,
        trxID: result.trxID
      };
    } else {
      return { error: result.errorMessage || "bKash payment execution failed" };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "bKash execution failed" };
  }
}
function getPipraPayBaseURL(env) {
  return env.PIPRAPAY_BASE_URL || "https://pay.dakkho.pro.bd";
}
function getPipraPayHeaders(env) {
  return {
    "Content-Type": "application/json",
    "MHS-PIPRAPAY-API-KEY": env.PIPRAPAY_API_KEY || ""
  };
}
async function verifyPipraPayWebhookSignature(env, body, signatureHeader) {
  if (!signatureHeader) {
    return { valid: true, reason: "No signature header \u2014 consider enabling webhook signing in PipraPay dashboard" };
  }
  if (!env.PIPRAPAY_API_KEY) {
    return { valid: false, reason: "PIPRAPAY_API_KEY not configured \u2014 cannot verify webhook signature" };
  }
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(env.PIPRAPAY_API_KEY);
    const data = encoder.encode(body);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
    const computedHex = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (computedHex.length !== signatureHeader.length) {
      return { valid: false, reason: "Signature length mismatch" };
    }
    let result = 0;
    for (let i = 0; i < computedHex.length; i++) {
      result |= computedHex.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
    }
    if (result !== 0) {
      return { valid: false, reason: "Signature verification failed \u2014 computed HMAC does not match" };
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, reason: `Signature verification error: ${error instanceof Error ? error.message : "unknown"}` };
  }
}
async function createPipraPayPayment(env, params) {
  if (!env.PIPRAPAY_API_KEY) {
    return { error: "PipraPay not configured. Set API key in Admin Panel." };
  }
  const baseURL = getPipraPayBaseURL(env);
  try {
    const response = await fetch(`${baseURL}/api/checkout/redirect`, {
      method: "POST",
      headers: getPipraPayHeaders(env),
      body: JSON.stringify({
        full_name: params.full_name,
        email_address: params.email_address,
        mobile_number: params.mobile_number,
        amount: String(params.amount),
        currency: params.currency || "BDT",
        return_url: params.return_url,
        webhook_url: params.webhook_url,
        metadata: params.metadata
      })
    });
    const result = await response.json();
    if (result.pp_id && result.pp_url) {
      return {
        pp_id: result.pp_id,
        pp_url: result.pp_url
      };
    } else {
      return { error: result.message || result.error || "PipraPay payment creation failed" };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "PipraPay request failed" };
  }
}
async function verifyPipraPayPayment(env, ppId) {
  if (!env.PIPRAPAY_API_KEY) {
    return { error: "PipraPay not configured" };
  }
  const baseURL = getPipraPayBaseURL(env);
  try {
    const response = await fetch(`${baseURL}/api/verify-payment`, {
      method: "POST",
      headers: getPipraPayHeaders(env),
      body: JSON.stringify({ pp_id: ppId })
    });
    const result = await response.json();
    if (result.pp_id) {
      return {
        pp_id: result.pp_id,
        status: result.status || "unknown",
        amount: result.amount || "0",
        currency: result.currency || "BDT",
        payment_method: result.payment_method || "",
        metadata: result.metadata || {},
        created_at: result.created_at || "",
        updated_at: result.updated_at || ""
      };
    } else {
      return { error: result.message || result.error || "PipraPay verification failed" };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "PipraPay verification request failed" };
  }
}
async function refundPipraPayPayment(env, ppId) {
  if (!env.PIPRAPAY_API_KEY) {
    return { error: "PipraPay not configured" };
  }
  const baseURL = getPipraPayBaseURL(env);
  try {
    const response = await fetch(`${baseURL}/api/refund-payment`, {
      method: "POST",
      headers: getPipraPayHeaders(env),
      body: JSON.stringify({ pp_id: ppId })
    });
    const result = await response.json();
    if (result.status === "refunded" || result.success) {
      return { success: true };
    } else {
      return { error: result.message || result.error || "PipraPay refund failed" };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "PipraPay refund request failed" };
  }
}
var init_payment = __esm({
  "src/lib/payment.ts"() {
    "use strict";
  }
});

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/body.js
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
};
var handleParsingNestedValues = (form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
};
var _getQueryParam = (url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = (str) => tryDecode(str, decodeURIComponent_);
var HonoRequest = class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout) => this.#layout = layout;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = ((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  });
  this.match = match2;
  return match2(method, path);
}

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class _Node {
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = (children) => {
  for (const _ in children) {
    return true;
  }
  return false;
};
var Node2 = class _Node2 {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = (options) => {
  const opts = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: [],
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        if (opts.credentials) {
          return (origin) => origin || null;
        }
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*" || opts.credentials) {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*" || opts.credentials) {
      c.header("Vary", "Origin", { append: true });
    }
  };
};

// node_modules/hono/dist/utils/color.js
function getColorEnabled() {
  const { process, Deno } = globalThis;
  const isNoColor = typeof Deno?.noColor === "boolean" ? Deno.noColor : process !== void 0 ? (
    // eslint-disable-next-line no-unsafe-optional-chaining
    "NO_COLOR" in process?.env
  ) : false;
  return !isNoColor;
}
async function getColorEnabledAsync() {
  const { navigator } = globalThis;
  const cfWorkers = "cloudflare:workers";
  const isNoColor = navigator !== void 0 && navigator.userAgent === "Cloudflare-Workers" ? await (async () => {
    try {
      return "NO_COLOR" in ((await import(cfWorkers)).env ?? {});
    } catch {
      return false;
    }
  })() : !getColorEnabled();
  return !isNoColor;
}

// node_modules/hono/dist/middleware/logger/index.js
var humanize = (times) => {
  const [delimiter, separator] = [",", "."];
  const orderTimes = times.map((v) => v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + delimiter));
  return orderTimes.join(separator);
};
var time = (start) => {
  const delta = Date.now() - start;
  return humanize([delta < 1e3 ? delta + "ms" : Math.round(delta / 1e3) + "s"]);
};
var colorStatus = async (status) => {
  const colorEnabled = await getColorEnabledAsync();
  if (colorEnabled) {
    switch (status / 100 | 0) {
      case 5:
        return `\x1B[31m${status}\x1B[0m`;
      case 4:
        return `\x1B[33m${status}\x1B[0m`;
      case 3:
        return `\x1B[36m${status}\x1B[0m`;
      case 2:
        return `\x1B[32m${status}\x1B[0m`;
    }
  }
  return `${status}`;
};
async function log(fn, prefix, method, path, status = 0, elapsed) {
  const out = prefix === "<--" ? `${prefix} ${method} ${path}` : `${prefix} ${method} ${path} ${await colorStatus(status)} ${elapsed}`;
  fn(out);
}
var logger = (fn = console.log) => {
  return async function logger2(c, next) {
    const { method, url } = c.req;
    const path = url.slice(url.indexOf("/", 8));
    await log(fn, "<--", method, path);
    const start = Date.now();
    await next();
    await log(fn, "-->", method, path, c.res.status, time(start));
  };
};

// src/lib/auth.ts
async function adminAuthMiddleware(c, next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Authentication required. Provide Authorization: Bearer <token>" }, 401);
  }
  const token = authHeader.substring(7);
  if (!token) {
    return c.json({ error: "Invalid token" }, 401);
  }
  try {
    const session = await c.env.DB.prepare(
      "SELECT id, user_id, email, name, role, expires_at, is_active FROM admin_sessions WHERE id = ? AND is_active = 1"
    ).bind(token).first();
    if (!session) {
      return c.json({ error: "Invalid or expired session" }, 401);
    }
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < /* @__PURE__ */ new Date()) {
      await c.env.DB.prepare(
        "UPDATE admin_sessions SET is_active = 0 WHERE id = ?"
      ).bind(token).run();
      return c.json({ error: "Session expired. Please login again." }, 401);
    }
    c.set("user", {
      id: session.user_id,
      email: session.email,
      name: session.name || "",
      role: session.role
    });
    await next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return c.json({ error: "Authentication failed" }, 401);
  }
}

// src/lib/utils.ts
function generateId() {
  return crypto.randomUUID();
}
function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}
function getSessionExpiry(days = 7) {
  const expiresAt = /* @__PURE__ */ new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt.toISOString();
}
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
function normalizeKeys(data, allowedFields) {
  const allowedSet = new Set(allowedFields);
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    const snakeKey = camelToSnake(key);
    if (allowedSet.has(snakeKey)) {
      result[snakeKey] = value;
    } else if (allowedSet.has(key)) {
      result[key] = value;
    }
  }
  return result;
}

// src/lib/audit.ts
async function logAudit(env, adminId, action, resourceType, resourceId, details) {
  try {
    await env.DB.prepare(
      `INSERT INTO audit_logs (id, action, resource_type, resource_id, user_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      generateId(),
      action,
      resourceType,
      resourceId || null,
      adminId,
      details ? JSON.stringify(details) : "{}"
    ).run();
  } catch (error) {
    console.error("Audit log failed:", error);
  }
}

// src/lib/auth-password.ts
var PBKDF2_ITERATIONS = 1e5;
var SALT_LENGTH = 16;
var KEY_LENGTH = 256;
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    KEY_LENGTH
  );
  const saltHex = bufferToHex(salt);
  const hashHex = bufferToHex(new Uint8Array(derivedBits));
  return `${saltHex}:${hashHex}`;
}
async function verifyPassword(password, storedHash) {
  const parts = storedHash.split(":");
  if (parts.length === 1 && storedHash.length === 64) {
    const encoder2 = new TextEncoder();
    const data = encoder2.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256Hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return constantTimeEqual(sha256Hex, storedHash);
  }
  if (parts.length !== 2) return false;
  const [saltHex, hashHex] = parts;
  if (!saltHex || !hashHex) return false;
  const salt = hexToBuffer(saltHex);
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    KEY_LENGTH
  );
  const computedHash = bufferToHex(new Uint8Array(derivedBits));
  return constantTimeEqual(computedHash, hashHex);
}
async function authenticateUser(env, email, password) {
  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE email = ?"
  ).bind(email).first();
  if (!user) {
    return { success: false };
  }
  const u = user;
  if (!u.password_hash) {
    return { success: false };
  }
  if (u.password_migrated === 0) {
    const valid2 = await verifyPassword(password, u.password_hash);
    if (valid2) {
      await env.DB.prepare(
        "UPDATE users SET password_migrated = 1, updated_at = ? WHERE id = ?"
      ).bind((/* @__PURE__ */ new Date()).toISOString(), u.id).run();
      return {
        success: true,
        userId: u.id,
        userName: u.name || u.full_name || "",
        userEmail: u.email,
        userRole: u.role || "student",
        avatarUrl: u.avatar_url || "",
        needsMigration: true
      };
    }
    return { success: false };
  }
  const valid = await verifyPassword(password, u.password_hash);
  if (!valid) {
    return { success: false };
  }
  return {
    success: true,
    userId: u.id,
    userName: u.name || u.full_name || "",
    userEmail: u.email,
    userRole: u.role || "student",
    avatarUrl: u.avatar_url || "",
    needsMigration: false
  };
}
function bufferToHex(buffer) {
  return Array.from(buffer).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// src/routes/auth.ts
var authRoutes = new Hono2();
authRoutes.post("/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }
    const user = await c.env.DB.prepare(
      "SELECT id, email, full_name, role, password_hash, is_active FROM users WHERE email = ? AND is_active = 1"
    ).bind(email).first();
    if (!user) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    if (user.role !== "admin" && user.role !== "super_admin") {
      return c.json(
        { error: "Access denied. Admin role required. Your account does not have admin privileges." },
        403
      );
    }
    const expiresAt = getSessionExpiry(7);
    const sessionId = generateId();
    await c.env.DB.prepare(
      "DELETE FROM admin_sessions WHERE user_id = ?"
    ).bind(user.id).run();
    await c.env.DB.prepare(
      `INSERT INTO admin_sessions (id, user_id, email, name, role, ip_address, user_agent, expires_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
    ).bind(
      sessionId,
      user.id,
      user.email,
      user.full_name,
      user.role,
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
      c.req.header("user-agent") || "unknown",
      expiresAt
    ).run();
    return c.json({
      success: true,
      token: sessionId,
      user: { id: user.id, email: user.email, name: user.full_name, role: user.role }
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Login error:", error);
    return c.json({ error: message }, 401);
  }
});
authRoutes.post("/check", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ authenticated: false }, 401);
    }
    const token = authHeader.substring(7);
    const session = await c.env.DB.prepare(
      "SELECT id, user_id, email, name, role, expires_at, is_active FROM admin_sessions WHERE id = ? AND is_active = 1"
    ).bind(token).first();
    if (!session || new Date(session.expires_at) < /* @__PURE__ */ new Date()) {
      return c.json({ authenticated: false }, 401);
    }
    return c.json({
      authenticated: true,
      user: { id: session.user_id, email: session.email, name: session.name, role: session.role }
    });
  } catch {
    return c.json({ authenticated: false }, 401);
  }
});
authRoutes.delete("/logout", adminAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    await c.env.DB.prepare(
      "UPDATE admin_sessions SET is_active = 0 WHERE user_id = ?"
    ).bind(user.id).run();
    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
authRoutes.delete("/sessions", adminAuthMiddleware, async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "UPDATE admin_sessions SET is_active = 0 WHERE is_active = 1"
    ).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "CLEAR_ALL_SESSIONS", "auth", void 0, { action: "clear_all" });
    return c.json({ success: true, cleared: result.meta?.changes || 0 });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var auth_default = authRoutes;

// src/lib/r2.ts
async function uploadFile(bucket, key, body, contentType) {
  const result = await bucket.put(key, body, {
    httpMetadata: {
      contentType
    }
  });
  return result;
}
async function deleteFile(bucket, key) {
  await bucket.delete(key);
}
async function getFile(bucket, key) {
  return bucket.get(key);
}
async function checkBucket(bucket) {
  try {
    const result = await bucket.list({ limit: 1 });
    return true;
  } catch {
    return false;
  }
}
function getBucketForType(type, env) {
  switch (type) {
    case "videos":
    case "video":
      return env.R2_VIDEOS;
    case "thumbnails":
    case "thumbnail":
    case "images":
    case "image":
      return env.R2_THUMBNAILS;
    case "avatars":
    case "avatar":
      return env.R2_AVATARS;
    case "covers":
    case "cover":
    case "banners":
    case "banner":
      return env.R2_THUMBNAILS;
    // covers/banners use thumbnails bucket
    case "resources":
    case "resource":
    case "documents":
    case "document":
      return env.R2_RESOURCES;
    case "support-attachments":
    case "support":
      return env.R2_SUPPORT_ATTACHMENTS;
    default:
      return env.R2_RESOURCES;
  }
}
var R2_PUBLIC_URLS = {
  videos: "https://pub-e746ac3cc9cc4c6ebbd8dd4365dbab79.r2.dev",
  video: "https://pub-e746ac3cc9cc4c6ebbd8dd4365dbab79.r2.dev",
  thumbnails: "https://pub-60fdec4931744de9a37d73191723e1f8.r2.dev",
  thumbnail: "https://pub-60fdec4931744de9a37d73191723e1f8.r2.dev",
  images: "https://pub-60fdec4931744de9a37d73191723e1f8.r2.dev",
  image: "https://pub-60fdec4931744de9a37d73191723e1f8.r2.dev",
  avatars: "https://pub-06c9b4a41d0b402d847fb9139262cb70.r2.dev",
  avatar: "https://pub-06c9b4a41d0b402d847fb9139262cb70.r2.dev",
  covers: "https://pub-60fdec4931744de9a37d73191723e1f8.r2.dev",
  cover: "https://pub-60fdec4931744de9a37d73191723e1f8.r2.dev",
  banners: "https://pub-60fdec4931744de9a37d73191723e1f8.r2.dev",
  banner: "https://pub-60fdec4931744de9a37d73191723e1f8.r2.dev",
  resources: "https://pub-25692986d3ff446abba05633a1d20a9a.r2.dev",
  resource: "https://pub-25692986d3ff446abba05633a1d20a9a.r2.dev",
  documents: "https://pub-25692986d3ff446abba05633a1d20a9a.r2.dev",
  document: "https://pub-25692986d3ff446abba05633a1d20a9a.r2.dev"
};
function getPublicUrl(env, bucketType, key) {
  const envAny = env;
  const publicUrl = envAny.R2_PUBLIC_URL;
  if (publicUrl) {
    return `${publicUrl}/${key}`;
  }
  const bucketUrl = R2_PUBLIC_URLS[bucketType];
  if (bucketUrl) {
    return `${bucketUrl}/${key}`;
  }
  return `https://pub-25692986d3ff446abba05633a1d20a9a.r2.dev/${key}`;
}

// src/routes/system.ts
var systemRoutes = new Hono2();
systemRoutes.get("/status", async (c) => {
  try {
    const status = {};
    try {
      const result = await c.env.DB.prepare("SELECT 1 as ok").first();
      const tableCount = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'"
      ).first();
      status.d1 = {
        status: "connected",
        message: `D1 database working (${tableCount?.count || 0} tables)`
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      status.d1 = { status: "error", message: msg };
    }
    status.r2 = {};
    const buckets = {
      videos: { binding: c.env.R2_VIDEOS, name: "dakkho-videos" },
      thumbnails: { binding: c.env.R2_THUMBNAILS, name: "dakkho-thumbnails" },
      avatars: { binding: c.env.R2_AVATARS, name: "dakkho-avatars" },
      resources: { binding: c.env.R2_RESOURCES, name: "dakkho-resources" }
    };
    for (const [name, { binding, name: bucketName }] of Object.entries(buckets)) {
      try {
        const ok = await checkBucket(binding);
        status.r2[name] = ok ? { status: "connected", message: `Bucket "${bucketName}" accessible` } : { status: "error", message: `Bucket "${bucketName}" not found or inaccessible` };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        status.r2[name] = { status: "error", message: msg };
      }
    }
    try {
      await c.env.KV_CONFIG.put("_health_check", "ok", { expirationTtl: 60 });
      const val = await c.env.KV_CONFIG.get("_health_check");
      status.kv = val === "ok" ? { status: "connected", message: "Workers KV working" } : { status: "error", message: "KV read/write mismatch" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      status.kv = { status: "error", message: msg };
    }
    try {
      if (c.env.RESEND_API_KEY) {
        status.email = { status: "connected", message: "Resend API key configured" };
      } else {
        status.email = { status: "error", message: "Resend API key not configured" };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      status.email = { status: "error", message: msg };
    }
    return c.json(status);
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
systemRoutes.post("/api-key", adminAuthMiddleware, async (c) => {
  try {
    const { apiKey } = await c.req.json();
    if (!apiKey) {
      return c.json({ error: "API key is required" }, 400);
    }
    await c.env.KV_CONFIG.put("admin_api_key_override", apiKey);
    const user = c.get("user");
    await logAudit(c.env, user.id, "UPDATE_API_KEY", "system", void 0, {
      keyPrefix: apiKey.substring(0, 20) + "..."
    });
    return c.json({
      success: true,
      message: "API key stored in KV."
    });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var system_default = systemRoutes;

// src/routes/users.ts
var userRoutes = new Hono2();
userRoutes.use("*", adminAuthMiddleware);
userRoutes.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const search = c.req.query("search") || "";
    const role = c.req.query("role") || "";
    const status = c.req.query("status") || "";
    const offset = (page - 1) * limit;
    let where = "WHERE 1=1";
    const params = [];
    if (search) {
      where += " AND full_name LIKE ?";
      params.push(`%${search}%`);
    }
    if (role) {
      where += " AND role = ?";
      params.push(role);
    }
    if (status === "active") {
      where += " AND is_active = 1";
    }
    if (status === "inactive") {
      where += " AND is_active = 0";
    }
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM users ${where}`
    ).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(
      `SELECT u.id, u.email, u.full_name, u.phone, u.bio, u.institute_id, u.technology, u.semester, u.avatar_url, u.role, u.email_verified, u.is_active, u.enrolled_course_ids, u.created_at, u.updated_at, i.name as institute_name, t.name as technology_name FROM users u LEFT JOIN institutes i ON u.institute_id = i.id LEFT JOIN technologies t ON u.technology = t.short_code ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();
    return c.json({ documents: result.results, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
userRoutes.put("/", async (c) => {
  try {
    const data = await c.req.json();
    const { userId, ...updates } = data;
    if (!userId) {
      return c.json({ error: "User ID required" }, 400);
    }
    const allowedFields = ["full_name", "phone", "bio", "institute_id", "technology", "semester", "avatar_url", "role", "email_verified", "is_active", "enrolled_course_ids"];
    const setClauses = [];
    const setValues = [];
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`);
        setValues.push(value);
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = datetime('now')");
    setValues.push(userId);
    await c.env.DB.prepare(
      `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...setValues).run();
    if (updates.is_active === 0 || updates.is_active === false) {
      try {
        await c.env.DB.prepare(
          "DELETE FROM student_sessions WHERE user_id = ?"
        ).bind(userId).run();
      } catch {
      }
    }
    const updatedUser = await c.env.DB.prepare(
      "SELECT u.id, u.email, u.full_name, u.phone, u.bio, u.institute_id, u.technology, u.semester, u.avatar_url, u.role, u.email_verified, u.is_active, u.enrolled_course_ids, u.created_at, u.updated_at, i.name as institute_name, t.name as technology_name FROM users u LEFT JOIN institutes i ON u.institute_id = i.id LEFT JOIN technologies t ON u.technology = t.short_code WHERE u.id = ?"
    ).bind(userId).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "UPDATE_USER", "users", userId, updates);
    return c.json({ document: updatedUser });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
userRoutes.delete("/", async (c) => {
  try {
    const userId = c.req.query("id");
    if (!userId) {
      return c.json({ error: "User ID required" }, 400);
    }
    await c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "DELETE_USER", "users", userId);
    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
userRoutes.post("/create-instructor", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.fullName || !body.email || !body.password) {
      return c.json({ error: "fullName, email, and password are required" }, 400);
    }
    if (body.password.length < 8) {
      return c.json({ error: "Password must be at least 8 characters" }, 400);
    }
    const existing = await c.env.DB.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).bind(body.email).first();
    if (existing) {
      const userId2 = existing.id;
      const passwordHash2 = await hashPassword(body.password);
      await c.env.DB.prepare(
        `UPDATE users SET role = 'instructor', password_hash = ?, password_migrated = 1, full_name = ?, updated_at = ? WHERE id = ?`
      ).bind(passwordHash2, body.fullName, (/* @__PURE__ */ new Date()).toISOString(), userId2).run();
      const existingInstructor = await c.env.DB.prepare(
        "SELECT id FROM instructors WHERE id = ?"
      ).bind(userId2).first();
      if (existingInstructor) {
        await c.env.DB.prepare(
          `UPDATE instructors SET name = ?, email = ?, specialization = ?, bio = ?, updated_at = ? WHERE id = ?`
        ).bind(
          body.fullName,
          body.email,
          body.specialization || null,
          body.bio || null,
          (/* @__PURE__ */ new Date()).toISOString(),
          userId2
        ).run();
      } else {
        const avatarUrl = (await c.env.DB.prepare("SELECT avatar_url FROM users WHERE id = ?").bind(userId2).first())?.avatar_url || null;
        await c.env.DB.prepare(`
          INSERT INTO instructors (id, name, email, bio, avatar_url, specialization, rating, total_students, total_courses, social_links, is_active)
          VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, '{}', 1)
        `).bind(
          userId2,
          body.fullName,
          body.email,
          body.bio || null,
          avatarUrl,
          body.specialization || null
        ).run();
      }
      if (body.courseIds && body.courseIds.length > 0) {
        for (const courseId of body.courseIds) {
          try {
            await c.env.DB.prepare(
              "UPDATE courses SET instructor_id = ? WHERE id = ? AND instructor_id IS NULL"
            ).bind(userId2, courseId).run();
          } catch {
          }
          try {
            await c.env.DB.prepare(
              "INSERT OR IGNORE INTO course_instructors (course_id, instructor_id) VALUES (?, ?)"
            ).bind(courseId, userId2).run();
          } catch {
          }
        }
      }
      const user2 = c.get("user");
      await logAudit(c.env, user2.id, "CREATE_INSTRUCTOR", "users", userId2, { email: body.email, fullName: body.fullName });
      return c.json({
        success: true,
        instructorId: userId2,
        userId: userId2,
        message: "Existing user promoted to instructor"
      });
    }
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(body.password);
    await c.env.DB.prepare(`
      INSERT INTO users (id, email, full_name, phone, bio, role, password_hash, password_migrated, is_active, email_verified)
      VALUES (?, ?, ?, ?, ?, 'instructor', ?, 1, 1, 0)
    `).bind(
      userId,
      body.email,
      body.fullName,
      body.phone || null,
      body.bio || null,
      passwordHash
    ).run();
    await c.env.DB.prepare(`
      INSERT INTO instructors (id, name, email, bio, specialization, rating, total_students, total_courses, social_links, is_active)
      VALUES (?, ?, ?, ?, ?, 0, 0, 0, '{}', 1)
    `).bind(
      userId,
      body.fullName,
      body.email,
      body.bio || null,
      body.specialization || null
    ).run();
    if (body.courseIds && body.courseIds.length > 0) {
      for (const courseId of body.courseIds) {
        try {
          await c.env.DB.prepare(
            "UPDATE courses SET instructor_id = ? WHERE id = ? AND instructor_id IS NULL"
          ).bind(userId, courseId).run();
        } catch {
        }
        try {
          await c.env.DB.prepare(
            "INSERT OR IGNORE INTO course_instructors (course_id, instructor_id) VALUES (?, ?)"
          ).bind(courseId, userId).run();
        } catch {
        }
      }
    }
    const user = c.get("user");
    await logAudit(c.env, user.id, "CREATE_INSTRUCTOR", "users", userId, { email: body.email, fullName: body.fullName });
    return c.json({
      success: true,
      instructorId: userId,
      userId,
      tempPassword: body.password
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Create instructor error:", error);
    return c.json({ error: message }, 500);
  }
});
var users_default = userRoutes;

// src/routes/categories.ts
var categoryRoutes = new Hono2();
categoryRoutes.use("*", adminAuthMiddleware);
categoryRoutes.get("/", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "50");
    const countResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as total FROM categories"
    ).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(
      "SELECT * FROM categories ORDER BY sort_order ASC LIMIT ?"
    ).bind(limit).all();
    return c.json({ documents: result.results, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
categoryRoutes.post("/", async (c) => {
  try {
    const data = await c.req.json();
    const id = crypto.randomUUID();
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await c.env.DB.prepare(`
      INSERT INTO categories (id, name, slug, icon, color, parent_id, sort_order, course_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.name || "",
      slug,
      data.icon || null,
      data.color || null,
      data.parent_id || null,
      data.sort_order || 0,
      data.course_count || 0
    ).run();
    const created = await c.env.DB.prepare("SELECT * FROM categories WHERE id = ?").bind(id).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "CREATE_CATEGORY", "categories", id, data);
    return c.json({ document: created });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
categoryRoutes.put("/", async (c) => {
  try {
    const data = await c.req.json();
    const { categoryId, ...updates } = data;
    if (!categoryId) {
      return c.json({ error: "Category ID required" }, 400);
    }
    const allowedFields = ["name", "slug", "icon", "color", "parent_id", "sort_order", "course_count"];
    const setClauses = [];
    const setValues = [];
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`);
        setValues.push(value);
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = datetime('now')");
    setValues.push(String(categoryId));
    await c.env.DB.prepare(
      `UPDATE categories SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...setValues).run();
    const updated = await c.env.DB.prepare("SELECT * FROM categories WHERE id = ?").bind(String(categoryId)).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "UPDATE_CATEGORY", "categories", String(categoryId), updates);
    return c.json({ document: updated });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
categoryRoutes.delete("/", async (c) => {
  try {
    const categoryId = c.req.query("id");
    if (!categoryId) {
      return c.json({ error: "Category ID required" }, 400);
    }
    await c.env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(categoryId).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "DELETE_CATEGORY", "categories", categoryId);
    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var categories_default = categoryRoutes;

// src/routes/instructors.ts
var instructorRoutes = new Hono2();
instructorRoutes.use("*", adminAuthMiddleware);
instructorRoutes.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const search = c.req.query("search") || "";
    const offset = (page - 1) * limit;
    let where = "WHERE 1=1";
    const params = [];
    if (search) {
      where += " AND name LIKE ?";
      params.push(`%${search}%`);
    }
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM instructors ${where}`
    ).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(
      `SELECT * FROM instructors ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();
    return c.json({ documents: result.results, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
instructorRoutes.post("/", async (c) => {
  try {
    const rawData = await c.req.json();
    const allowedFields = ["name", "email", "bio", "avatar_url", "cover_url", "specialization", "rating", "total_students", "total_courses", "social_links", "is_active"];
    const data = normalizeKeys(rawData, allowedFields);
    const id = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO instructors (id, name, email, bio, avatar_url, cover_url, specialization, rating, total_students, total_courses, social_links, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.name || "",
      data.email || null,
      data.bio || null,
      data.avatar_url || null,
      data.cover_url || null,
      data.specialization || null,
      data.rating || 0,
      data.total_students || 0,
      data.total_courses || 0,
      data.social_links || "{}",
      data.is_active !== void 0 ? data.is_active ? 1 : 0 : 1
    ).run();
    const created = await c.env.DB.prepare("SELECT * FROM instructors WHERE id = ?").bind(id).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "CREATE_INSTRUCTOR", "instructors", id, data);
    return c.json({ document: created });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
instructorRoutes.put("/", async (c) => {
  try {
    const rawData = await c.req.json();
    const { instructorId, ...rawUpdates } = rawData;
    if (!instructorId) {
      return c.json({ error: "Instructor ID required" }, 400);
    }
    const allowedFields = ["name", "email", "bio", "avatar_url", "cover_url", "specialization", "rating", "total_students", "total_courses", "social_links", "is_active"];
    const updates = normalizeKeys(rawUpdates, allowedFields);
    const setClauses = [];
    const setValues = [];
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === "is_active") {
          setClauses.push(`${key} = ?`);
          setValues.push(value ? 1 : 0);
        } else {
          setClauses.push(`${key} = ?`);
          setValues.push(value);
        }
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = datetime('now')");
    setValues.push(String(instructorId));
    await c.env.DB.prepare(
      `UPDATE instructors SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...setValues).run();
    const updated = await c.env.DB.prepare("SELECT * FROM instructors WHERE id = ?").bind(String(instructorId)).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "UPDATE_INSTRUCTOR", "instructors", String(instructorId), updates);
    return c.json({ document: updated });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
instructorRoutes.delete("/", async (c) => {
  try {
    const instructorId = c.req.query("id");
    if (!instructorId) {
      return c.json({ error: "Instructor ID required" }, 400);
    }
    await c.env.DB.prepare("DELETE FROM instructors WHERE id = ?").bind(instructorId).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "DELETE_INSTRUCTOR", "instructors", instructorId);
    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var instructors_default = instructorRoutes;

// src/lib/instructor-auth.ts
async function validateInstructorSession(env, token) {
  try {
    const session = await env.DB.prepare(
      "SELECT user_id, email, name, avatar_url, expires_at, is_active FROM instructor_sessions WHERE id = ? AND is_active = 1"
    ).bind(token).first();
    if (!session) {
      return { authorized: false };
    }
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < /* @__PURE__ */ new Date()) {
      await env.DB.prepare(
        "UPDATE instructor_sessions SET is_active = 0 WHERE id = ?"
      ).bind(token).run();
      return { authorized: false };
    }
    return {
      authorized: true,
      userId: session.user_id,
      email: session.email,
      name: session.name || void 0,
      avatarUrl: session.avatar_url || void 0
    };
  } catch (error) {
    console.error("Instructor session validation error:", error);
    return { authorized: false };
  }
}
async function createInstructorSession(env, userId, email, name, ipAddress, deviceInfo, avatarUrl) {
  const sessionId = generateId();
  const expiresAt = getSessionExpiry(7);
  await env.DB.prepare(
    "DELETE FROM instructor_sessions WHERE user_id = ?"
  ).bind(userId).run();
  await env.DB.prepare(
    `INSERT INTO instructor_sessions (id, user_id, email, name, ip_address, device_info, expires_at, is_active, avatar_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
  ).bind(sessionId, userId, email, name, ipAddress || null, deviceInfo || null, expiresAt, avatarUrl || null).run();
  return sessionId;
}
async function deleteInstructorSession(env, token) {
  try {
    await env.DB.prepare(
      "UPDATE instructor_sessions SET is_active = 0 WHERE id = ?"
    ).bind(token).run();
    return true;
  } catch {
    return false;
  }
}

// src/lib/instructor-auth-middleware.ts
async function instructorAuthMiddleware(c, next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Authentication required. Provide Authorization: Bearer <token>" }, 401);
  }
  const token = authHeader.substring(7);
  if (!token) {
    return c.json({ error: "Invalid token" }, 401);
  }
  try {
    const result = await validateInstructorSession(c.env, token);
    if (!result.authorized) {
      return c.json({ error: "Invalid or expired instructor session" }, 401);
    }
    c.set("instructorId", result.userId);
    c.set("instructorEmail", result.email || "");
    c.set("instructorName", result.name || "");
    c.set("instructorAvatarUrl", result.avatarUrl || "");
    await next();
  } catch (error) {
    console.error("Instructor auth middleware error:", error);
    return c.json({ error: "Authentication failed" }, 401);
  }
}
async function instructorOrAdminMiddleware(c, next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Authentication required. Provide Authorization: Bearer <token>" }, 401);
  }
  const token = authHeader.substring(7);
  if (!token) {
    return c.json({ error: "Invalid token" }, 401);
  }
  try {
    const instructorResult = await validateInstructorSession(c.env, token);
    if (instructorResult.authorized) {
      c.set("authRole", "instructor");
      c.set("instructorId", instructorResult.userId);
      c.set("instructorEmail", instructorResult.email || "");
      c.set("instructorName", instructorResult.name || "");
      c.set("instructorAvatarUrl", instructorResult.avatarUrl || "");
      await next();
      return;
    }
    const adminSession = await c.env.DB.prepare(
      "SELECT id, user_id, email, name, role, expires_at, is_active FROM admin_sessions WHERE id = ? AND is_active = 1"
    ).bind(token).first();
    if (!adminSession) {
      return c.json({ error: "Invalid or expired session" }, 401);
    }
    const expiresAt = new Date(adminSession.expires_at);
    if (expiresAt < /* @__PURE__ */ new Date()) {
      await c.env.DB.prepare(
        "UPDATE admin_sessions SET is_active = 0 WHERE id = ?"
      ).bind(token).run();
      return c.json({ error: "Session expired. Please login again." }, 401);
    }
    c.set("authRole", "admin");
    c.set("instructorId", "");
    c.set("instructorEmail", adminSession.email);
    c.set("instructorName", adminSession.name || "");
    c.set("instructorAvatarUrl", "");
    c.set("adminId", adminSession.user_id);
    c.set("adminEmail", adminSession.email);
    c.set("adminName", adminSession.name || "");
    await next();
  } catch (error) {
    console.error("Instructor or admin auth middleware error:", error);
    return c.json({ error: "Authentication failed" }, 401);
  }
}

// src/routes/instructor.ts
var instructorRoutes2 = new Hono2();
function formatInstructorRow(row) {
  return {
    ...row,
    $id: row.id,
    avatarUrl: row.avatar_url || row.avatarUrl
  };
}
function formatCourseRow(row) {
  return {
    ...row,
    $id: row.id,
    $createdAt: row.created_at,
    isPublished: row.is_published,
    price: row.price_bdt ?? row.price,
    instructorId: row.instructor_id
  };
}
function formatVideoRow(row) {
  return {
    ...row,
    courseId: row.course_id,
    videoUrl: row.video_url
  };
}
function formatEnrollmentRow(row) {
  return {
    ...row,
    courseId: row.course_id,
    userId: row.user_id
  };
}
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
async function verifyCourseOwnership(env, courseId, instructorId) {
  const course = await env.DB.prepare("SELECT instructor_id FROM courses WHERE id = ?").bind(courseId).first();
  if (!course) return false;
  if (course.instructor_id === instructorId) return true;
  const junction = await env.DB.prepare("SELECT id FROM course_instructors WHERE course_id = ? AND instructor_id = ?").bind(courseId, instructorId).first();
  return !!junction;
}
instructorRoutes2.post("/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }
    const authResult = await authenticateUser(c.env, email, password);
    if (!authResult.success) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    const userId = authResult.userId;
    const userEmail = authResult.userEmail;
    const userName = authResult.userName;
    const userRole = authResult.userRole || "student";
    const avatarUrl = authResult.avatarUrl || "";
    if (userRole !== "instructor") {
      return c.json({ error: "This login is for instructors only. Please use the student or admin portal." }, 403);
    }
    const token = await createInstructorSession(
      c.env,
      userId,
      userEmail,
      userName,
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
      c.req.header("user-agent") || "unknown",
      avatarUrl
    );
    let profile = null;
    try {
      const row = await c.env.DB.prepare(
        "SELECT * FROM instructors WHERE id = ?"
      ).bind(userId).first();
      if (row) {
        profile = formatInstructorRow(row);
      }
    } catch {
    }
    return c.json({
      success: true,
      token,
      user: {
        id: userId,
        email: userEmail,
        name: userName,
        role: "instructor",
        avatarUrl,
        ...profile || {}
      }
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Instructor login error:", error);
    return c.json({ error: message }, 401);
  }
});
instructorRoutes2.post("/auth/forgot-password", async (c) => {
  try {
    const { email } = await c.req.json();
    if (!email) return c.json({ error: "Email is required" }, 400);
    const user = await c.env.DB.prepare(
      "SELECT id, email, name, role FROM users WHERE email = ? AND role = 'instructor'"
    ).bind(email).first();
    if (!user) {
      return c.json({ success: true, message: "If an instructor account exists with this email, you will receive a password reset code." });
    }
    const otp = String(Math.floor(1e5 + Math.random() * 9e5));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1e3).toISOString();
    await c.env.DB.prepare(`
      INSERT INTO otp_codes (target, code, type, expires_at, verified, attempts)
      VALUES (?, ?, 'password_reset', ?, 0, 0)
    `).bind(email, otp, expiresAt).run();
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${c.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: c.env.RESEND_FROM_EMAIL,
          to: [email],
          subject: "DAKKHO Instructor - Password Reset Code",
          html: `<div style="font-family:sans-serif;text-align:center;max-width:500px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#0a0a0a,#333);padding:24px;border-radius:16px 16px 0 0;">
              <h1 style="color:white;margin:0;font-size:20px;">DAKKHO Instructor</h1>
            </div>
            <div style="padding:24px;background:white;border-radius:0 0 16px 16px;">
              <h2 style="color:#1e293b;">Password Reset</h2>
              <p style="color:#64748b;">Your reset code:</p>
              <div style="background:#f1f5f9;padding:16px;border-radius:12px;margin:16px 0;">
                <span style="font-size:28px;font-weight:bold;letter-spacing:8px;color:#0a0a0a;">${otp}</span>
              </div>
              <p style="color:#94a3b8;font-size:13px;">Expires in 10 minutes. Do not share this code.</p>
            </div>
          </div>`
        })
      });
    } catch (err) {
      console.error("Failed to send OTP email:", err);
    }
    return c.json({ success: true, message: "If an instructor account exists with this email, you will receive a password reset code." });
  } catch {
    return c.json({ success: true, message: "If an instructor account exists with this email, you will receive a password reset code." });
  }
});
instructorRoutes2.post("/auth/reset-password", async (c) => {
  try {
    const { email, otp, password } = await c.req.json();
    if (!email || !otp || !password) {
      return c.json({ error: "email, otp, and password are required" }, 400);
    }
    if (password.length < 8) {
      return c.json({ error: "Password must be at least 8 characters" }, 400);
    }
    const otpRecord = await c.env.DB.prepare(
      "SELECT id, expires_at, verified FROM otp_codes WHERE target = ? AND code = ? AND type = 'password_reset' ORDER BY created_at DESC LIMIT 1"
    ).bind(email, otp).first();
    if (!otpRecord || otpRecord.verified || new Date(otpRecord.expires_at) < /* @__PURE__ */ new Date()) {
      return c.json({ error: "Invalid or expired OTP code" }, 400);
    }
    await c.env.DB.prepare("UPDATE otp_codes SET verified = 1 WHERE id = ?").bind(otpRecord.id).run();
    const user = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (!user) return c.json({ error: "User not found" }, 404);
    const passwordHash = await hashPassword(password);
    await c.env.DB.prepare(
      "UPDATE users SET password_hash = ?, password_migrated = 1, updated_at = ? WHERE id = ?"
    ).bind(passwordHash, (/* @__PURE__ */ new Date()).toISOString(), user.id).run();
    try {
      await c.env.DB.prepare("UPDATE instructor_sessions SET is_active = 0 WHERE user_id = ?").bind(user.id).run();
    } catch {
    }
    return c.json({ success: true, message: "Password has been reset successfully. Please login with your new password." });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/auth/check", instructorAuthMiddleware, async (c) => {
  try {
    const instructorId = c.get("instructorId");
    const instructorEmail = c.get("instructorEmail");
    const instructorName = c.get("instructorName");
    const instructorAvatarUrl = c.get("instructorAvatarUrl");
    return c.json({
      authenticated: true,
      user: {
        id: instructorId,
        email: instructorEmail,
        name: instructorName,
        avatarUrl: instructorAvatarUrl,
        role: "instructor"
      }
    });
  } catch (error) {
    return c.json({ authenticated: false }, 401);
  }
});
instructorRoutes2.delete("/auth/logout", instructorAuthMiddleware, async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.substring(7) || "";
    await deleteInstructorSession(c.env, token);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.post("/change-password", instructorAuthMiddleware, async (c) => {
  try {
    const instructorId = c.get("instructorId");
    const instructorEmail = c.get("instructorEmail");
    const { current_password, new_password } = await c.req.json();
    if (!current_password || !new_password) {
      return c.json({ error: "Current and new password are required" }, 400);
    }
    if (new_password.length < 8) {
      return c.json({ error: "New password must be at least 8 characters" }, 400);
    }
    const user = await c.env.DB.prepare(
      "SELECT id, email, password_hash, password_migrated FROM users WHERE id = ?"
    ).bind(instructorId).first();
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    if (user.password_hash && user.password_migrated === 1) {
      const valid = await verifyPassword(current_password, user.password_hash);
      if (!valid) {
        return c.json({ error: "Current password is incorrect" }, 400);
      }
    } else {
      const authResult = await authenticateUser(c.env, instructorEmail, current_password);
      if (!authResult.success) {
        return c.json({ error: "Current password is incorrect" }, 400);
      }
    }
    const newPasswordHash = await hashPassword(new_password);
    await c.env.DB.prepare(
      "UPDATE users SET password_hash = ?, password_migrated = 1, updated_at = ? WHERE id = ?"
    ).bind(newPasswordHash, (/* @__PURE__ */ new Date()).toISOString(), instructorId).run();
    return c.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/dashboard", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    let instructorId;
    if (authRole === "admin") {
      instructorId = c.req.query("instructorId") || "";
      if (!instructorId) {
        return c.json({ error: "instructorId query param required for admin access" }, 400);
      }
    } else {
      instructorId = c.get("instructorId");
    }
    let courseCount = 0;
    try {
      const cc = await c.env.DB.prepare("SELECT COUNT(*) as total FROM courses WHERE instructor_id = ?").bind(instructorId).first();
      courseCount = cc?.total || 0;
    } catch {
    }
    let totalStudents = 0;
    try {
      const ts = await c.env.DB.prepare(
        "SELECT COUNT(DISTINCT user_id) as total FROM enrollments WHERE course_id IN (SELECT id FROM courses WHERE instructor_id = ?)"
      ).bind(instructorId).first();
      totalStudents = ts?.total || 0;
    } catch {
    }
    let avgRating = 0;
    let totalReviews = 0;
    try {
      const rs = await c.env.DB.prepare(
        "SELECT AVG(rating) as avg, COUNT(*) as count FROM instructor_reviews WHERE instructor_id = ?"
      ).bind(instructorId).first();
      avgRating = rs?.avg ? Math.round(rs.avg * 10) / 10 : 0;
      totalReviews = rs?.count || 0;
    } catch {
    }
    let totalRevenue = 0;
    try {
      const rev = await c.env.DB.prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE course_id IN (SELECT id FROM courses WHERE instructor_id = ?) AND status = 'completed'"
      ).bind(instructorId).first();
      totalRevenue = rev?.total || 0;
    } catch {
    }
    let upcomingClasses = 0;
    try {
      const uc = await c.env.DB.prepare(
        "SELECT COUNT(*) as total FROM live_class_schedules WHERE instructor_id = ? AND scheduled_at > datetime('now') AND is_active = 1"
      ).bind(instructorId).first();
      upcomingClasses = uc?.total || 0;
    } catch {
    }
    return c.json({
      success: true,
      dashboard: {
        courseCount,
        totalStudents,
        avgRating,
        totalReviews,
        totalRevenue,
        upcomingClasses
      }
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/profile", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    let instructorId;
    if (authRole === "admin") {
      instructorId = c.req.query("instructorId") || "";
      if (!instructorId) {
        return c.json({ error: "instructorId query param required for admin access" }, 400);
      }
    } else {
      instructorId = c.get("instructorId");
    }
    const row = await c.env.DB.prepare(
      "SELECT * FROM instructors WHERE id = ?"
    ).bind(instructorId).first();
    if (!row) {
      return c.json({ error: "Instructor profile not found" }, 404);
    }
    const profile = formatInstructorRow(row);
    return c.json({ success: true, profile });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.put("/profile", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    let instructorId;
    if (authRole === "admin") {
      instructorId = c.req.query("instructorId") || "";
      if (!instructorId) {
        return c.json({ error: "instructorId query param required for admin access" }, 400);
      }
    } else {
      instructorId = c.get("instructorId");
    }
    const body = await c.req.json();
    const fieldMapping = {
      name: "name",
      bio: "bio",
      avatar: "avatar_url",
      avatarUrl: "avatar_url",
      specialization: "specialization",
      phone: "phone",
      department: "department"
    };
    const setClauses = [];
    const params = [];
    for (const [bodyField, dbColumn] of Object.entries(fieldMapping)) {
      if (body[bodyField] !== void 0) {
        setClauses.push(`${dbColumn} = ?`);
        params.push(body[bodyField]);
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = ?");
    params.push((/* @__PURE__ */ new Date()).toISOString());
    params.push(instructorId);
    await c.env.DB.prepare(
      `UPDATE instructors SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    if (body.name !== void 0 && authRole === "instructor") {
      try {
        await c.env.DB.prepare(
          "UPDATE instructor_sessions SET name = ? WHERE user_id = ? AND is_active = 1"
        ).bind(String(body.name), instructorId).run();
      } catch {
      }
    }
    if ((body.avatarUrl !== void 0 || body.avatar !== void 0) && authRole === "instructor") {
      try {
        const avatarVal = body.avatarUrl || body.avatar;
        await c.env.DB.prepare(
          "UPDATE instructor_sessions SET avatar_url = ? WHERE user_id = ? AND is_active = 1"
        ).bind(String(avatarVal), instructorId).run();
      } catch {
      }
    }
    const updatedRow = await c.env.DB.prepare(
      "SELECT * FROM instructors WHERE id = ?"
    ).bind(instructorId).first();
    const profile = formatInstructorRow(updatedRow);
    return c.json({ success: true, profile });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.post("/profile/avatar", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    let instructorId;
    if (authRole === "admin") {
      instructorId = c.req.query("instructorId") || "";
      if (!instructorId) {
        return c.json({ error: "instructorId query param required for admin access" }, 400);
      }
    } else {
      instructorId = c.get("instructorId");
    }
    const formData = await c.req.formData();
    const avatarEntry = formData.get("avatar");
    if (!avatarEntry || typeof avatarEntry === "string") {
      return c.json({ error: "No avatar file provided" }, 400);
    }
    const file = avatarEntry;
    try {
      const existingRow = await c.env.DB.prepare(
        "SELECT avatar_url FROM instructors WHERE id = ?"
      ).bind(instructorId).first();
      const oldAvatarUrl = existingRow?.avatar_url;
      if (oldAvatarUrl) {
        const uploadMatch = oldAvatarUrl.match(/\/upload\/avatars\/(.+)$/);
        if (uploadMatch?.[1]) {
          await c.env.R2_AVATARS.delete(uploadMatch[1]);
        }
      }
    } catch {
    }
    const key = `instructor/${instructorId}/${Date.now()}-${file.name || "avatar"}`;
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2_AVATARS.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type || "image/png" }
    });
    const avatarUrl = await getPublicUrl(c.env, "avatars", key);
    await c.env.DB.prepare(
      "UPDATE instructors SET avatar_url = ?, updated_at = ? WHERE id = ?"
    ).bind(avatarUrl, (/* @__PURE__ */ new Date()).toISOString(), instructorId).run();
    if (authRole === "instructor") {
      try {
        await c.env.DB.prepare(
          "UPDATE instructor_sessions SET avatar_url = ? WHERE user_id = ? AND is_active = 1"
        ).bind(avatarUrl, instructorId).run();
      } catch {
      }
    }
    return c.json({ success: true, avatar_url: avatarUrl });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/courses", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    let instructorId;
    if (authRole === "admin") {
      instructorId = c.req.query("instructorId") || "";
      if (!instructorId) {
        return c.json({ error: "instructorId query param required for admin access" }, 400);
      }
    } else {
      instructorId = c.get("instructorId");
    }
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = parseInt(c.req.query("offset") || "0");
    const result = await c.env.DB.prepare(
      "SELECT * FROM courses WHERE instructor_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).bind(instructorId, limit, offset).all();
    let coursesFromSubjects = [];
    try {
      const subjectResult = await c.env.DB.prepare(
        "SELECT DISTINCT course_id FROM course_instructors WHERE instructor_id = ?"
      ).bind(instructorId).all();
      coursesFromSubjects = subjectResult.results.map((r) => r.course_id);
    } catch {
    }
    const existingCourseIds = new Set(result.results.map((r) => r.id));
    const additionalCourses = [];
    for (const cid of coursesFromSubjects) {
      if (!existingCourseIds.has(cid)) {
        try {
          const course = await c.env.DB.prepare(
            "SELECT * FROM courses WHERE id = ?"
          ).bind(cid).first();
          if (course) {
            additionalCourses.push(course);
          }
        } catch {
        }
      }
    }
    const countResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as total FROM courses WHERE instructor_id = ?"
    ).bind(instructorId).first();
    const total = (countResult?.total || 0) + additionalCourses.length;
    const allCourses = [
      ...result.results.map((r) => formatCourseRow(r)),
      ...additionalCourses.map((r) => formatCourseRow(r))
    ];
    return c.json({ courses: allCourses, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/courses/:id", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const row = await c.env.DB.prepare(
      "SELECT * FROM courses WHERE id = ?"
    ).bind(courseId).first();
    if (!row) {
      return c.json({ error: "Course not found" }, 404);
    }
    let studentCount = 0;
    try {
      const enrollResult = await c.env.DB.prepare(
        "SELECT COUNT(*) as total FROM enrollments WHERE course_id = ?"
      ).bind(courseId).first();
      studentCount = enrollResult?.total || 0;
    } catch {
    }
    const course = formatCourseRow(row);
    return c.json({
      success: true,
      course,
      studentCount
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/courses/:id/students", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = parseInt(c.req.query("offset") || "0");
    const enrollResult = await c.env.DB.prepare(
      "SELECT * FROM enrollments WHERE course_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).bind(courseId, limit, offset).all();
    const countResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as total FROM enrollments WHERE course_id = ?"
    ).bind(courseId).first();
    const total = countResult?.total || 0;
    const enrichedStudents = [];
    for (const enrollment of enrollResult.results) {
      const userId = enrollment.user_id;
      let studentProfile = null;
      if (userId) {
        try {
          const userRow = await c.env.DB.prepare(
            "SELECT id, name, email, avatar_url FROM users WHERE id = ?"
          ).bind(userId).first();
          if (userRow) {
            studentProfile = userRow;
          }
        } catch {
        }
      }
      const formattedEnrollment = formatEnrollmentRow(enrollment);
      enrichedStudents.push({
        ...formattedEnrollment,
        student: studentProfile ? {
          id: studentProfile.id || userId,
          name: studentProfile.name || "",
          email: studentProfile.email || "",
          avatarUrl: studentProfile.avatar_url || ""
        } : { id: userId, name: "Unknown", email: "", avatarUrl: "" }
      });
    }
    return c.json({ students: enrichedStudents, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/courses/:id/videos", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const limit = parseInt(c.req.query("limit") || "100");
    const offset = parseInt(c.req.query("offset") || "0");
    const result = await c.env.DB.prepare(
      "SELECT * FROM videos WHERE course_id = ? ORDER BY sort_order ASC LIMIT ? OFFSET ?"
    ).bind(courseId, limit, offset).all();
    const countResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as total FROM videos WHERE course_id = ?"
    ).bind(courseId).first();
    const total = countResult?.total || 0;
    const videos = result.results.map((r) => formatVideoRow(r));
    return c.json({ videos, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.put("/courses/:id/videos/:videoId", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const videoId = c.req.param("videoId");
    const body = await c.req.json();
    const existing = await c.env.DB.prepare(
      "SELECT id FROM videos WHERE id = ? AND course_id = ?"
    ).bind(videoId, courseId).first();
    if (!existing) {
      return c.json({ error: "Video not found in this course" }, 404);
    }
    const fieldMapping = {
      title: "title",
      sort_order: "sort_order",
      sortOrder: "sort_order",
      is_preview: "is_preview",
      isPreview: "is_preview",
      is_published: "is_published",
      isPublished: "is_published",
      duration: "duration",
      thumbnail_url: "thumbnail_url",
      thumbnailUrl: "thumbnail_url"
    };
    const setClauses = [];
    const params = [];
    for (const [bodyField, dbColumn] of Object.entries(fieldMapping)) {
      if (body[bodyField] !== void 0) {
        setClauses.push(`${dbColumn} = ?`);
        params.push(body[bodyField]);
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = ?");
    params.push((/* @__PURE__ */ new Date()).toISOString());
    params.push(videoId);
    await c.env.DB.prepare(
      `UPDATE videos SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    const updatedRow = await c.env.DB.prepare(
      "SELECT * FROM videos WHERE id = ?"
    ).bind(videoId).first();
    const video = formatVideoRow(updatedRow);
    return c.json({ success: true, video });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/courses/:id/progress", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");
    const enrollResult = await c.env.DB.prepare(
      "SELECT * FROM enrollments WHERE course_id = ? LIMIT ? OFFSET ?"
    ).bind(courseId, limit, offset).all();
    const totalEnrollments = await c.env.DB.prepare(
      "SELECT COUNT(*) as total FROM enrollments WHERE course_id = ?"
    ).bind(courseId).first();
    let videoCount = 0;
    try {
      const videoCountResult = await c.env.DB.prepare(
        "SELECT COUNT(*) as total FROM videos WHERE course_id = ?"
      ).bind(courseId).first();
      videoCount = videoCountResult?.total || 0;
    } catch {
    }
    const progressList = [];
    for (const enrollment of enrollResult.results) {
      const userId = enrollment.user_id;
      let completedVideos = 0;
      let totalWatchTime = 0;
      let studentName = "Unknown";
      let studentEmail = "";
      if (userId) {
        try {
          const userRow = await c.env.DB.prepare(
            "SELECT full_name, email FROM users WHERE id = ?"
          ).bind(userId).first();
          if (userRow) {
            studentName = userRow.full_name || "Unknown";
            studentEmail = userRow.email || "";
          }
        } catch {
        }
        try {
          const wpStats = await c.env.DB.prepare(
            "SELECT COUNT(*) as total, SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed, COALESCE(SUM(watch_time), 0) as total_watch FROM watch_progress WHERE user_id = ? AND course_id = ?"
          ).bind(userId, courseId).first();
          completedVideos = wpStats?.completed || 0;
          totalWatchTime = wpStats?.total_watch || 0;
        } catch {
        }
      }
      const progressPercent = videoCount > 0 ? Math.round(completedVideos / videoCount * 100) : 0;
      progressList.push({
        userId,
        enrollmentId: enrollment.id,
        studentName,
        studentEmail,
        completedVideos,
        totalVideos: videoCount,
        progressPercent,
        totalWatchTime
      });
    }
    const avgProgress = progressList.length > 0 ? Math.round(progressList.reduce((sum, p) => sum + p.progressPercent, 0) / progressList.length) : 0;
    return c.json({
      success: true,
      courseId,
      totalStudents: totalEnrollments?.total || 0,
      totalVideos: videoCount,
      averageProgress: avgProgress,
      progress: progressList
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/courses/:id/analytics", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    let enrollmentCount = 0;
    try {
      const enrollResult = await c.env.DB.prepare(
        "SELECT COUNT(*) as total FROM enrollments WHERE course_id = ?"
      ).bind(courseId).first();
      enrollmentCount = enrollResult?.total || 0;
    } catch {
    }
    let videoCount = 0;
    try {
      const videoResult = await c.env.DB.prepare(
        "SELECT COUNT(*) as total FROM videos WHERE course_id = ?"
      ).bind(courseId).first();
      videoCount = videoResult?.total || 0;
    } catch {
    }
    let revenue = 0;
    let paymentCount = 0;
    try {
      const paymentStats = await c.env.DB.prepare(
        "SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM payments WHERE course_id = ? AND status = 'completed'"
      ).bind(courseId).first();
      paymentCount = paymentStats?.count || 0;
      revenue = paymentStats?.total || 0;
    } catch {
    }
    let avgRating = 0;
    let reviewCount = 0;
    try {
      const ratingStats = await c.env.DB.prepare(
        "SELECT AVG(rating) as avg, COUNT(*) as count FROM instructor_reviews WHERE course_id = ?"
      ).bind(courseId).first();
      avgRating = ratingStats?.avg ? Math.round(ratingStats.avg * 10) / 10 : 0;
      reviewCount = ratingStats?.count || 0;
    } catch {
    }
    let ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    try {
      const distStats = await c.env.DB.prepare(`
        SELECT
          SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
          SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
          SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
          SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
          SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
        FROM instructor_reviews WHERE course_id = ?
      `).bind(courseId).first();
      ratingDistribution = {
        5: distStats?.five_star || 0,
        4: distStats?.four_star || 0,
        3: distStats?.three_star || 0,
        2: distStats?.two_star || 0,
        1: distStats?.one_star || 0
      };
    } catch {
    }
    return c.json({
      success: true,
      analytics: {
        courseId,
        enrollmentCount,
        videoCount,
        revenue,
        paymentCount,
        avgRating,
        reviewCount,
        ratingDistribution
      }
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/schedule", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    let instructorId;
    if (authRole === "admin") {
      instructorId = c.req.query("instructorId") || "";
      if (!instructorId) {
        return c.json({ error: "instructorId query param required for admin access" }, 400);
      }
    } else {
      instructorId = c.get("instructorId");
    }
    const limit = parseInt(c.req.query("limit") || "20");
    const result = await c.env.DB.prepare(
      "SELECT * FROM live_class_schedules WHERE instructor_id = ? AND scheduled_at > datetime('now') AND is_active = 1 ORDER BY scheduled_at ASC LIMIT ?"
    ).bind(instructorId, limit).all();
    return c.json({ success: true, schedule: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/reviews", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    let instructorId;
    if (authRole === "admin") {
      instructorId = c.req.query("instructorId") || "";
      if (!instructorId) {
        return c.json({ error: "instructorId query param required for admin access" }, 400);
      }
    } else {
      instructorId = c.get("instructorId");
    }
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const offset = (page - 1) * limit;
    const reviews = await c.env.DB.prepare(
      `SELECT ir.*, u.full_name as student_name, u.email as student_email, u.avatar_url as student_avatar
       FROM instructor_reviews ir
       LEFT JOIN users u ON ir.user_id = u.id
       WHERE ir.instructor_id = ? ORDER BY ir.created_at DESC LIMIT ? OFFSET ?`
    ).bind(instructorId, limit, offset).all();
    const stats = await c.env.DB.prepare(`
      SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as total_reviews,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
      FROM instructor_reviews WHERE instructor_id = ?
    `).bind(instructorId).first();
    const totalReviews = stats?.total_reviews || 0;
    const distribution = {
      5: stats?.five_star || 0,
      4: stats?.four_star || 0,
      3: stats?.three_star || 0,
      2: stats?.two_star || 0,
      1: stats?.one_star || 0
    };
    return c.json({
      success: true,
      reviews: reviews.results,
      stats: {
        average_rating: totalReviews > 0 ? Math.round(stats?.average_rating * 10) / 10 : 0,
        total_reviews: totalReviews,
        rating_distribution: distribution
      },
      page,
      limit
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
function getInstructorId(c) {
  const authRole = c.get("authRole");
  if (authRole === "admin") {
    const id = c.req.query("instructorId") || "";
    if (!id) {
      return { instructorId: "", error: c.json({ error: "instructorId query param required for admin access" }, 400) };
    }
    return { instructorId: id, error: null };
  }
  return { instructorId: c.get("instructorId"), error: null };
}
instructorRoutes2.post("/courses", instructorOrAdminMiddleware, async (c) => {
  try {
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;
    const body = await c.req.json();
    const { title, description, level, language, price, technology_id, category_id, tags, semester, what_you_learn, subject_ids } = body;
    if (!title) {
      return c.json({ error: "title is required" }, 400);
    }
    const courseId = generateId();
    const slug = slugify(title);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await c.env.DB.prepare(`
      INSERT INTO courses (id, title, slug, description, instructor_id, technology_id, category_id, level, language, price, tags, semester, what_you_learn, is_published, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).bind(
      courseId,
      title,
      slug,
      description || null,
      instructorId,
      technology_id || null,
      category_id || null,
      level || "beginner",
      language || "bangla",
      price || 0,
      tags || null,
      semester || null,
      what_you_learn || null,
      now,
      now
    ).run();
    try {
      await c.env.DB.prepare(`
        INSERT INTO course_instructors (course_id, instructor_id, sort_order, created_at)
        VALUES (?, ?, 0, ?)
      `).bind(courseId, instructorId, now).run();
    } catch {
    }
    if (Array.isArray(subject_ids) && subject_ids.length > 0) {
      try {
        for (let i = 0; i < subject_ids.length; i++) {
          const subjectId = subject_ids[i];
          await c.env.DB.prepare(`
            INSERT OR IGNORE INTO course_subjects (course_id, subject_id, sort_order, created_at)
            VALUES (?, ?, ?, ?)
          `).bind(courseId, subjectId, i, now).run();
        }
      } catch {
      }
    }
    const packageName = title || "Course";
    try {
      await c.env.DB.prepare(`
        INSERT INTO course_packages (course_id, package_type, display_name, description, price, duration_months, max_users, is_auto_assign, is_active, created_by, created_at, updated_at)
        VALUES (?, 'single', ?, 'Single user access', ?, 6, 1, 1, 1, ?, ?, ?)
      `).bind(courseId, `${packageName} - Single`, price || 0, instructorId, now, now).run();
    } catch {
    }
    try {
      await c.env.DB.prepare(`
        INSERT INTO course_packages (course_id, package_type, display_name, description, price, duration_months, max_users, is_auto_assign, is_active, created_by, created_at, updated_at)
        VALUES (?, 'friend', ?, 'Friend pack - 2 users', ?, 6, 2, 1, 1, ?, ?, ?)
      `).bind(courseId, `${packageName} - Friend Pack`, (price || 0) * 1.5, instructorId, now, now).run();
    } catch {
    }
    const row = await c.env.DB.prepare("SELECT * FROM courses WHERE id = ?").bind(courseId).first();
    const course = formatCourseRow(row);
    return c.json({ success: true, course }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.put("/courses/:id", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: "You do not own this course or it does not exist" }, 403);
    }
    const body = await c.req.json();
    if (body.is_published === 1 || body.isPublished === 1) {
      try {
        const videoCount = await c.env.DB.prepare(
          "SELECT COUNT(*) as total FROM videos WHERE course_id = ?"
        ).bind(courseId).first();
        if (!videoCount || videoCount.total === 0) {
          return c.json({ error: "Cannot publish course without at least 1 video" }, 400);
        }
      } catch {
      }
    }
    const fieldMapping = {
      title: "title",
      description: "description",
      level: "level",
      language: "language",
      price: "price",
      technology_id: "technology_id",
      technologyId: "technology_id",
      category_id: "category_id",
      categoryId: "category_id",
      tags: "tags",
      semester: "semester",
      what_you_learn: "what_you_learn",
      whatYouLearn: "what_you_learn",
      is_published: "is_published",
      isPublished: "is_published",
      thumbnail_url: "thumbnail_url",
      thumbnailUrl: "thumbnail_url"
    };
    const setClauses = [];
    const params = [];
    for (const [bodyField, dbColumn] of Object.entries(fieldMapping)) {
      if (body[bodyField] !== void 0) {
        setClauses.push(`${dbColumn} = ?`);
        params.push(body[bodyField]);
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = ?");
    params.push((/* @__PURE__ */ new Date()).toISOString());
    params.push(courseId);
    await c.env.DB.prepare(
      `UPDATE courses SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    const updatedRow = await c.env.DB.prepare("SELECT * FROM courses WHERE id = ?").bind(courseId).first();
    const course = formatCourseRow(updatedRow);
    return c.json({ success: true, course });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.delete("/courses/:id", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: "You do not own this course or it does not exist" }, 403);
    }
    const course = await c.env.DB.prepare(
      "SELECT is_published FROM courses WHERE id = ?"
    ).bind(courseId).first();
    if (!course) {
      return c.json({ error: "Course not found" }, 404);
    }
    if (course.is_published === 1) {
      return c.json({ error: "Cannot delete a published course" }, 400);
    }
    try {
      const enrollCount = await c.env.DB.prepare(
        "SELECT COUNT(*) as total FROM enrollments WHERE course_id = ?"
      ).bind(courseId).first();
      if (enrollCount && enrollCount.total > 0) {
        return c.json({ error: "Cannot delete course with existing enrollments" }, 400);
      }
    } catch {
    }
    const relatedTables = [
      "DELETE FROM videos WHERE course_id = ?",
      "DELETE FROM lessons WHERE course_id = ?",
      "DELETE FROM chapters WHERE course_id = ?",
      "DELETE FROM course_resources WHERE course_id = ?",
      "DELETE FROM course_instructors WHERE course_id = ?",
      "DELETE FROM course_categories WHERE course_id = ?",
      "DELETE FROM course_subjects WHERE course_id = ?",
      "DELETE FROM course_learning_points WHERE course_id = ?",
      "DELETE FROM course_packages WHERE course_id = ?"
    ];
    for (const sql of relatedTables) {
      try {
        await c.env.DB.prepare(sql).bind(courseId).run();
      } catch {
      }
    }
    await c.env.DB.prepare("DELETE FROM courses WHERE id = ?").bind(courseId).run();
    return c.json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/courses/:id/curriculum", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: "You do not own this course or it does not exist" }, 403);
    }
    const courseRow = await c.env.DB.prepare("SELECT * FROM courses WHERE id = ?").bind(courseId).first();
    if (!courseRow) {
      return c.json({ error: "Course not found" }, 404);
    }
    const course = formatCourseRow(courseRow);
    let chapters = [];
    try {
      const chapterResult = await c.env.DB.prepare(
        "SELECT * FROM chapters WHERE course_id = ? ORDER BY sort_order ASC"
      ).bind(courseId).all();
      chapters = chapterResult.results;
    } catch {
    }
    const chaptersWithLessons = [];
    for (const chapter of chapters) {
      let lessons = [];
      try {
        const lessonResult = await c.env.DB.prepare(
          "SELECT * FROM lessons WHERE chapter_id = ? ORDER BY sort_order ASC"
        ).bind(chapter.id).all();
        lessons = lessonResult.results;
      } catch {
      }
      chaptersWithLessons.push({
        ...chapter,
        $id: chapter.id,
        lessons
      });
    }
    let resources = [];
    try {
      const resourceResult = await c.env.DB.prepare(
        "SELECT * FROM course_resources WHERE course_id = ? ORDER BY sort_order ASC"
      ).bind(courseId).all();
      resources = resourceResult.results;
    } catch {
    }
    return c.json({
      success: true,
      course,
      chapters: chaptersWithLessons,
      resources
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.post("/courses/:id/chapters", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: "You do not own this course or it does not exist" }, 403);
    }
    const body = await c.req.json();
    const { title, subject_id, description, sort_order } = body;
    if (!title) {
      return c.json({ error: "title is required" }, 400);
    }
    const chapterId = generateId();
    const slug = slugify(title);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let sortOrder = sort_order;
    if (sortOrder === void 0 || sortOrder === null) {
      try {
        const maxSort = await c.env.DB.prepare(
          "SELECT MAX(sort_order) as max_order FROM chapters WHERE course_id = ?"
        ).bind(courseId).first();
        sortOrder = (maxSort?.max_order ?? -1) + 1;
      } catch {
        sortOrder = 0;
      }
    }
    await c.env.DB.prepare(`
      INSERT INTO chapters (id, course_id, subject_id, title, slug, description, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      chapterId,
      courseId,
      subject_id || null,
      title,
      slug,
      description || null,
      sortOrder,
      now,
      now
    ).run();
    const row = await c.env.DB.prepare("SELECT * FROM chapters WHERE id = ?").bind(chapterId).first();
    const chapter = { ...row, $id: row.id };
    return c.json({ success: true, chapter }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.put("/courses/:id/chapters/:chapterId", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const chapterId = c.req.param("chapterId");
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: "You do not own this course or it does not exist" }, 403);
    }
    const existingChapter = await c.env.DB.prepare(
      "SELECT id FROM chapters WHERE id = ? AND course_id = ?"
    ).bind(chapterId, courseId).first();
    if (!existingChapter) {
      return c.json({ error: "Chapter not found in this course" }, 404);
    }
    const body = await c.req.json();
    const fieldMapping = {
      title: "title",
      subject_id: "subject_id",
      subjectId: "subject_id",
      description: "description",
      sort_order: "sort_order",
      sortOrder: "sort_order"
    };
    const setClauses = [];
    const params = [];
    for (const [bodyField, dbColumn] of Object.entries(fieldMapping)) {
      if (body[bodyField] !== void 0) {
        setClauses.push(`${dbColumn} = ?`);
        params.push(body[bodyField]);
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = ?");
    params.push((/* @__PURE__ */ new Date()).toISOString());
    params.push(chapterId);
    await c.env.DB.prepare(
      `UPDATE chapters SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    const updatedRow = await c.env.DB.prepare("SELECT * FROM chapters WHERE id = ?").bind(chapterId).first();
    const chapter = { ...updatedRow, $id: updatedRow.id };
    return c.json({ success: true, chapter });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.delete("/courses/:id/chapters/:chapterId", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const chapterId = c.req.param("chapterId");
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: "You do not own this course or it does not exist" }, 403);
    }
    const existingChapter = await c.env.DB.prepare(
      "SELECT id FROM chapters WHERE id = ? AND course_id = ?"
    ).bind(chapterId, courseId).first();
    if (!existingChapter) {
      return c.json({ error: "Chapter not found in this course" }, 404);
    }
    try {
      await c.env.DB.prepare("DELETE FROM lessons WHERE chapter_id = ?").bind(chapterId).run();
    } catch {
    }
    await c.env.DB.prepare("DELETE FROM chapters WHERE id = ?").bind(chapterId).run();
    return c.json({ success: true, message: "Chapter deleted successfully" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.post("/courses/:id/lessons", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: "You do not own this course or it does not exist" }, 403);
    }
    const body = await c.req.json();
    const { title, chapter_id, subject_id, description, lesson_type, sort_order, is_preview, duration, video_url, thumbnail_url, document_url } = body;
    if (!title || !chapter_id) {
      return c.json({ error: "title and chapter_id are required" }, 400);
    }
    const chapterCheck = await c.env.DB.prepare(
      "SELECT id, subject_id FROM chapters WHERE id = ? AND course_id = ?"
    ).bind(chapter_id, courseId).first();
    if (!chapterCheck) {
      return c.json({ error: "Chapter not found in this course" }, 404);
    }
    const finalSubjectId = subject_id || chapterCheck.subject_id || null;
    const lessonId = generateId();
    const slug = slugify(title);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let sortOrder = sort_order;
    if (sortOrder === void 0 || sortOrder === null) {
      try {
        const maxSort = await c.env.DB.prepare(
          "SELECT MAX(sort_order) as max_order FROM lessons WHERE chapter_id = ?"
        ).bind(chapter_id).first();
        sortOrder = (maxSort?.max_order ?? -1) + 1;
      } catch {
        sortOrder = 0;
      }
    }
    await c.env.DB.prepare(`
      INSERT INTO lessons (id, chapter_id, course_id, subject_id, title, slug, description, lesson_type, sort_order, is_preview, duration, video_url, thumbnail_url, document_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      lessonId,
      chapter_id,
      courseId,
      finalSubjectId,
      title,
      slug,
      description || null,
      lesson_type || "video",
      sortOrder,
      is_preview || 0,
      duration || 0,
      video_url || null,
      thumbnail_url || null,
      document_url || null,
      now,
      now
    ).run();
    const row = await c.env.DB.prepare("SELECT * FROM lessons WHERE id = ?").bind(lessonId).first();
    const lesson = { ...row, $id: row.id };
    return c.json({ success: true, lesson }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.put("/courses/:id/lessons/:lessonId", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const lessonId = c.req.param("lessonId");
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: "You do not own this course or it does not exist" }, 403);
    }
    const existingLesson = await c.env.DB.prepare(
      "SELECT id FROM lessons WHERE id = ? AND course_id = ?"
    ).bind(lessonId, courseId).first();
    if (!existingLesson) {
      return c.json({ error: "Lesson not found in this course" }, 404);
    }
    const body = await c.req.json();
    const fieldMapping = {
      title: "title",
      chapter_id: "chapter_id",
      chapterId: "chapter_id",
      subject_id: "subject_id",
      subjectId: "subject_id",
      description: "description",
      lesson_type: "lesson_type",
      lessonType: "lesson_type",
      sort_order: "sort_order",
      sortOrder: "sort_order",
      is_preview: "is_preview",
      isPreview: "is_preview",
      duration: "duration",
      video_url: "video_url",
      videoUrl: "video_url",
      thumbnail_url: "thumbnail_url",
      thumbnailUrl: "thumbnail_url",
      document_url: "document_url",
      documentUrl: "document_url"
    };
    const setClauses = [];
    const params = [];
    for (const [bodyField, dbColumn] of Object.entries(fieldMapping)) {
      if (body[bodyField] !== void 0) {
        setClauses.push(`${dbColumn} = ?`);
        params.push(body[bodyField]);
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = ?");
    params.push((/* @__PURE__ */ new Date()).toISOString());
    params.push(lessonId);
    await c.env.DB.prepare(
      `UPDATE lessons SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    const updatedRow = await c.env.DB.prepare("SELECT * FROM lessons WHERE id = ?").bind(lessonId).first();
    const lesson = { ...updatedRow, $id: updatedRow.id };
    return c.json({ success: true, lesson });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.delete("/courses/:id/lessons/:lessonId", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const lessonId = c.req.param("lessonId");
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: "You do not own this course or it does not exist" }, 403);
    }
    const existingLesson = await c.env.DB.prepare(
      "SELECT id FROM lessons WHERE id = ? AND course_id = ?"
    ).bind(lessonId, courseId).first();
    if (!existingLesson) {
      return c.json({ error: "Lesson not found in this course" }, 404);
    }
    await c.env.DB.prepare("DELETE FROM lessons WHERE id = ?").bind(lessonId).run();
    return c.json({ success: true, message: "Lesson deleted successfully" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/courses/:id/resources", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: "You do not own this course or it does not exist" }, 403);
    }
    let resources = [];
    try {
      const result = await c.env.DB.prepare(
        "SELECT * FROM course_resources WHERE course_id = ? ORDER BY sort_order ASC"
      ).bind(courseId).all();
      resources = result.results;
    } catch {
    }
    return c.json({ success: true, resources });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.post("/courses/:id/resources", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: "You do not own this course or it does not exist" }, 403);
    }
    const formData = await c.req.formData();
    const title = formData.get("title");
    const description = formData.get("description");
    const file_type = formData.get("file_type") || "pdf";
    const chapter_id = formData.get("chapter_id") || null;
    const lesson_id = formData.get("lesson_id") || null;
    if (!title) {
      return c.json({ error: "title is required" }, 400);
    }
    const fileEntry = formData.get("file");
    if (!fileEntry || typeof fileEntry === "string") {
      return c.json({ error: "No file provided" }, 400);
    }
    const file = fileEntry;
    const key = `course-resources/${courseId}/${Date.now()}-${file.name || "resource"}`;
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2_RESOURCES.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type || "application/octet-stream" }
    });
    const fileUrl = await getPublicUrl(c.env, "resources", key);
    const resourceId = generateId();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await c.env.DB.prepare(`
      INSERT INTO course_resources (id, course_id, chapter_id, lesson_id, title, description, file_url, file_type, file_size, sort_order, uploaded_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `).bind(
      resourceId,
      courseId,
      chapter_id,
      lesson_id,
      title,
      description || null,
      fileUrl,
      file_type,
      file.size || 0,
      instructorId,
      now,
      now
    ).run();
    const row = await c.env.DB.prepare("SELECT * FROM course_resources WHERE id = ?").bind(resourceId).first();
    const resource = { ...row, $id: row.id };
    return c.json({ success: true, resource }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.delete("/courses/:id/resources/:resourceId", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const resourceId = c.req.param("resourceId");
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: "You do not own this course or it does not exist" }, 403);
    }
    const existingResource = await c.env.DB.prepare(
      "SELECT id, file_url FROM course_resources WHERE id = ? AND course_id = ?"
    ).bind(resourceId, courseId).first();
    if (!existingResource) {
      return c.json({ error: "Resource not found in this course" }, 404);
    }
    try {
      const fileUrl = existingResource.file_url;
      if (fileUrl) {
        const urlParts = fileUrl.match(/\.r2\.dev\/(.+)$/);
        if (urlParts?.[1]) {
          await c.env.R2_RESOURCES.delete(urlParts[1]);
        }
      }
    } catch {
    }
    await c.env.DB.prepare("DELETE FROM course_resources WHERE id = ?").bind(resourceId).run();
    return c.json({ success: true, message: "Resource deleted successfully" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/notifications", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    let instructorId;
    if (authRole === "admin") {
      instructorId = c.req.query("instructorId") || "";
      if (!instructorId) {
        return c.json({ error: "instructorId query param required for admin access" }, 400);
      }
    } else {
      instructorId = c.get("instructorId");
    }
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = parseInt(c.req.query("offset") || "0");
    const unreadOnly = c.req.query("unread") === "true";
    let query = "SELECT * FROM notifications WHERE user_id = ?";
    const params = [instructorId];
    if (unreadOnly) {
      query += " AND read = 0";
    }
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    const result = await c.env.DB.prepare(query).bind(...params).all();
    let countQuery = "SELECT COUNT(*) as total FROM notifications WHERE user_id = ?";
    const countParams = [instructorId];
    if (unreadOnly) {
      countQuery += " AND read = 0";
    }
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first();
    const total = countResult?.total || 0;
    return c.json({ success: true, notifications: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.put("/notifications/:id/read", instructorOrAdminMiddleware, async (c) => {
  try {
    const notificationId = c.req.param("id");
    await c.env.DB.prepare(
      "UPDATE notifications SET read = 1 WHERE id = ?"
    ).bind(notificationId).run();
    return c.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.put("/notifications/read-all", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    let instructorId;
    if (authRole === "admin") {
      instructorId = c.req.query("instructorId") || "";
      if (!instructorId) {
        return c.json({ error: "instructorId query param required for admin access" }, 400);
      }
    } else {
      instructorId = c.get("instructorId");
    }
    await c.env.DB.prepare(
      "UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0"
    ).bind(instructorId).run();
    return c.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.post("/support/tickets", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    let instructorId;
    let instructorEmail;
    let instructorName;
    if (authRole === "admin") {
      instructorId = c.req.query("instructorId") || "";
      instructorEmail = c.req.query("instructorEmail") || "";
      instructorName = c.req.query("instructorName") || "";
    } else {
      instructorId = c.get("instructorId");
      instructorEmail = c.get("instructorEmail");
      instructorName = c.get("instructorName");
    }
    const body = await c.req.json();
    const { category, subject, description, priority } = body;
    if (!category || !subject || !description) {
      return c.json({ error: "category, subject, and description are required" }, 400);
    }
    const ticketId = `TK-${String(Math.floor(1e5 + Math.random() * 9e5))}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await c.env.DB.prepare(`
      INSERT INTO support_tickets (ticket_id, user_id, name, email, category, subject, description, priority, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `).bind(
      ticketId,
      instructorId,
      instructorName,
      instructorEmail,
      category,
      subject,
      description,
      priority || "medium",
      now,
      now
    ).run();
    return c.json({
      success: true,
      ticket: {
        ticketId,
        status: "open",
        createdAt: now
      }
    }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/support/tickets", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    let instructorId;
    if (authRole === "admin") {
      instructorId = c.req.query("instructorId") || "";
      if (!instructorId) {
        return c.json({ error: "instructorId query param required for admin access" }, 400);
      }
    } else {
      instructorId = c.get("instructorId");
    }
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = parseInt(c.req.query("offset") || "0");
    const status = c.req.query("status");
    let query = "SELECT * FROM support_tickets WHERE user_id = ?";
    const params = [instructorId];
    if (status) {
      query += " AND status = ?";
      params.push(status);
    }
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    const result = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, tickets: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/courses/:courseId/chapters", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("courseId");
    const result = await c.env.DB.prepare(
      "SELECT * FROM chapters WHERE course_id = ? ORDER BY sort_order ASC"
    ).bind(courseId).all();
    return c.json({ success: true, chapters: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.post("/courses/:courseId/chapters", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    const instructorId = authRole === "admin" ? c.req.query("instructorId") : c.get("instructorId");
    const courseId = c.req.param("courseId");
    if (!instructorId) {
      return c.json({ error: "instructorId is required" }, 400);
    }
    const owns = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!owns) {
      return c.json({ error: "You do not own this course" }, 403);
    }
    const body = await c.req.json();
    const { title, slug, description, subject_id, sort_order } = body;
    if (!title) {
      return c.json({ error: "title is required" }, 400);
    }
    const chapterId = generateId();
    const chapterSlug = slug || slugify(title);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await c.env.DB.prepare(`
      INSERT INTO chapters (id, course_id, subject_id, title, slug, description, sort_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      chapterId,
      courseId,
      subject_id || null,
      title,
      chapterSlug,
      description || null,
      sort_order || 0,
      now,
      now
    ).run();
    const row = await c.env.DB.prepare("SELECT * FROM chapters WHERE id = ?").bind(chapterId).first();
    return c.json({ success: true, chapter: row }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.put("/chapters/:id", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    const instructorId = authRole === "admin" ? c.req.query("instructorId") : c.get("instructorId");
    const chapterId = c.req.param("id");
    if (!instructorId) {
      return c.json({ error: "instructorId is required" }, 400);
    }
    const existing = await c.env.DB.prepare(
      "SELECT course_id FROM chapters WHERE id = ?"
    ).bind(chapterId).first();
    if (!existing) {
      return c.json({ error: "Chapter not found" }, 404);
    }
    const owns = await verifyCourseOwnership(c.env, existing.course_id, instructorId);
    if (!owns) {
      return c.json({ error: "You do not own this course" }, 403);
    }
    const body = await c.req.json();
    const fieldMapping = {
      title: "title",
      slug: "slug",
      description: "description",
      subject_id: "subject_id",
      subjectId: "subject_id",
      sort_order: "sort_order",
      sortOrder: "sort_order",
      is_active: "is_active",
      isActive: "is_active"
    };
    const setClauses = [];
    const params = [];
    for (const [bodyField, dbColumn] of Object.entries(fieldMapping)) {
      if (body[bodyField] !== void 0) {
        setClauses.push(`${dbColumn} = ?`);
        params.push(body[bodyField]);
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = ?");
    params.push((/* @__PURE__ */ new Date()).toISOString());
    params.push(chapterId);
    await c.env.DB.prepare(
      `UPDATE chapters SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    const row = await c.env.DB.prepare("SELECT * FROM chapters WHERE id = ?").bind(chapterId).first();
    return c.json({ success: true, chapter: row });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.delete("/chapters/:id", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    const instructorId = authRole === "admin" ? c.req.query("instructorId") : c.get("instructorId");
    const chapterId = c.req.param("id");
    if (!instructorId) {
      return c.json({ error: "instructorId is required" }, 400);
    }
    const existing = await c.env.DB.prepare(
      "SELECT course_id FROM chapters WHERE id = ?"
    ).bind(chapterId).first();
    if (!existing) {
      return c.json({ error: "Chapter not found" }, 404);
    }
    const owns = await verifyCourseOwnership(c.env, existing.course_id, instructorId);
    if (!owns) {
      return c.json({ error: "You do not own this course" }, 403);
    }
    await c.env.DB.prepare("DELETE FROM chapters WHERE id = ?").bind(chapterId).run();
    return c.json({ success: true, message: "Chapter deleted" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/courses/:courseId/lessons", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("courseId");
    const result = await c.env.DB.prepare(
      "SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order ASC"
    ).bind(courseId).all();
    return c.json({ success: true, lessons: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.post("/courses/:courseId/lessons", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    const instructorId = authRole === "admin" ? c.req.query("instructorId") : c.get("instructorId");
    const courseId = c.req.param("courseId");
    if (!instructorId) {
      return c.json({ error: "instructorId is required" }, 400);
    }
    const owns = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!owns) {
      return c.json({ error: "You do not own this course" }, 403);
    }
    const body = await c.req.json();
    const { title, chapter_id, slug, description, lesson_type, sort_order, is_preview, video_url, thumbnail_url, document_url } = body;
    if (!title) {
      return c.json({ error: "title is required" }, 400);
    }
    const lessonId = generateId();
    const lessonSlug = slug || slugify(title);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await c.env.DB.prepare(`
      INSERT INTO lessons (id, chapter_id, course_id, subject_id, title, slug, description, lesson_type, sort_order, is_preview, is_active, duration, video_url, thumbnail_url, document_url, created_at, updated_at)
      VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?)
    `).bind(
      lessonId,
      chapter_id || null,
      courseId,
      title,
      lessonSlug,
      description || null,
      lesson_type || "video",
      sort_order || 0,
      is_preview ? 1 : 0,
      video_url || null,
      thumbnail_url || null,
      document_url || null,
      now,
      now
    ).run();
    const row = await c.env.DB.prepare("SELECT * FROM lessons WHERE id = ?").bind(lessonId).first();
    return c.json({ success: true, lesson: row }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.put("/lessons/:id", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    const instructorId = authRole === "admin" ? c.req.query("instructorId") : c.get("instructorId");
    const lessonId = c.req.param("id");
    if (!instructorId) {
      return c.json({ error: "instructorId is required" }, 400);
    }
    const existing = await c.env.DB.prepare(
      "SELECT course_id FROM lessons WHERE id = ?"
    ).bind(lessonId).first();
    if (!existing) {
      return c.json({ error: "Lesson not found" }, 404);
    }
    const owns = await verifyCourseOwnership(c.env, existing.course_id, instructorId);
    if (!owns) {
      return c.json({ error: "You do not own this course" }, 403);
    }
    const body = await c.req.json();
    const fieldMapping = {
      title: "title",
      slug: "slug",
      description: "description",
      chapter_id: "chapter_id",
      chapterId: "chapter_id",
      lesson_type: "lesson_type",
      lessonType: "lesson_type",
      sort_order: "sort_order",
      sortOrder: "sort_order",
      is_preview: "is_preview",
      isPreview: "is_preview",
      is_active: "is_active",
      isActive: "is_active",
      duration: "duration",
      video_url: "video_url",
      videoUrl: "video_url",
      thumbnail_url: "thumbnail_url",
      thumbnailUrl: "thumbnail_url",
      document_url: "document_url",
      documentUrl: "document_url"
    };
    const setClauses = [];
    const params = [];
    for (const [bodyField, dbColumn] of Object.entries(fieldMapping)) {
      if (body[bodyField] !== void 0) {
        setClauses.push(`${dbColumn} = ?`);
        params.push(body[bodyField]);
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = ?");
    params.push((/* @__PURE__ */ new Date()).toISOString());
    params.push(lessonId);
    await c.env.DB.prepare(
      `UPDATE lessons SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    const row = await c.env.DB.prepare("SELECT * FROM lessons WHERE id = ?").bind(lessonId).first();
    return c.json({ success: true, lesson: row });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.delete("/lessons/:id", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    const instructorId = authRole === "admin" ? c.req.query("instructorId") : c.get("instructorId");
    const lessonId = c.req.param("id");
    if (!instructorId) {
      return c.json({ error: "instructorId is required" }, 400);
    }
    const existing = await c.env.DB.prepare(
      "SELECT course_id FROM lessons WHERE id = ?"
    ).bind(lessonId).first();
    if (!existing) {
      return c.json({ error: "Lesson not found" }, 404);
    }
    const owns = await verifyCourseOwnership(c.env, existing.course_id, instructorId);
    if (!owns) {
      return c.json({ error: "You do not own this course" }, 403);
    }
    await c.env.DB.prepare("DELETE FROM lessons WHERE id = ?").bind(lessonId).run();
    return c.json({ success: true, message: "Lesson deleted" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.post("/courses/:courseId/videos", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    const instructorId = authRole === "admin" ? c.req.query("instructorId") : c.get("instructorId");
    const courseId = c.req.param("courseId");
    if (!instructorId) {
      return c.json({ error: "instructorId is required" }, 400);
    }
    const owns = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!owns) {
      return c.json({ error: "You do not own this course" }, 403);
    }
    const body = await c.req.json();
    const { title, video_url, slug, duration, sort_order, is_preview, is_published, thumbnail_url, lesson_id, lesson_type } = body;
    if (!title || !video_url) {
      return c.json({ error: "title and video_url are required" }, 400);
    }
    const videoId = generateId();
    const videoSlug = slug || slugify(title);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await c.env.DB.prepare(`
      INSERT INTO videos (id, course_id, title, slug, video_url, thumbnail_url, duration, sort_order, is_preview, is_published, lesson_id, lesson_type, chapter_id, subject_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)
    `).bind(
      videoId,
      courseId,
      title,
      videoSlug,
      video_url,
      thumbnail_url || null,
      duration || 0,
      sort_order || 0,
      is_preview ? 1 : 0,
      is_published ? 1 : 0,
      lesson_id || null,
      lesson_type || null,
      now,
      now
    ).run();
    const row = await c.env.DB.prepare("SELECT * FROM videos WHERE id = ?").bind(videoId).first();
    const video = formatVideoRow(row);
    return c.json({ success: true, video }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.delete("/videos/:id", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    const instructorId = authRole === "admin" ? c.req.query("instructorId") : c.get("instructorId");
    const videoId = c.req.param("id");
    if (!instructorId) {
      return c.json({ error: "instructorId is required" }, 400);
    }
    const existing = await c.env.DB.prepare(
      "SELECT course_id FROM videos WHERE id = ?"
    ).bind(videoId).first();
    if (!existing) {
      return c.json({ error: "Video not found" }, 404);
    }
    const owns = await verifyCourseOwnership(c.env, existing.course_id, instructorId);
    if (!owns) {
      return c.json({ error: "You do not own this course" }, 403);
    }
    await c.env.DB.prepare("DELETE FROM videos WHERE id = ?").bind(videoId).run();
    return c.json({ success: true, message: "Video deleted" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/courses/:courseId/resources", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("courseId");
    const result = await c.env.DB.prepare(
      "SELECT * FROM course_resources WHERE course_id = ? ORDER BY sort_order ASC"
    ).bind(courseId).all();
    return c.json({ success: true, resources: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.post("/courses/:courseId/resources", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    const instructorId = authRole === "admin" ? c.req.query("instructorId") : c.get("instructorId");
    const courseId = c.req.param("courseId");
    if (!instructorId) {
      return c.json({ error: "instructorId is required" }, 400);
    }
    const owns = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!owns) {
      return c.json({ error: "You do not own this course" }, 403);
    }
    const body = await c.req.json();
    const { title, description, file_url, file_type, file_size, chapter_id, lesson_id, is_downloadable, sort_order } = body;
    if (!title || !file_url) {
      return c.json({ error: "title and file_url are required" }, 400);
    }
    const resourceId = generateId();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await c.env.DB.prepare(`
      INSERT INTO course_resources (id, course_id, chapter_id, lesson_id, title, description, file_url, file_type, file_size, is_downloadable, sort_order, uploaded_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      resourceId,
      courseId,
      chapter_id || null,
      lesson_id || null,
      title,
      description || null,
      file_url,
      file_type || null,
      file_size || null,
      is_downloadable ? 1 : 0,
      sort_order || 0,
      instructorId,
      now,
      now
    ).run();
    const row = await c.env.DB.prepare("SELECT * FROM course_resources WHERE id = ?").bind(resourceId).first();
    return c.json({ success: true, resource: row }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.put("/resources/:id", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    const instructorId = authRole === "admin" ? c.req.query("instructorId") : c.get("instructorId");
    const resourceId = c.req.param("id");
    if (!instructorId) {
      return c.json({ error: "instructorId is required" }, 400);
    }
    const existing = await c.env.DB.prepare(
      "SELECT course_id FROM course_resources WHERE id = ?"
    ).bind(resourceId).first();
    if (!existing) {
      return c.json({ error: "Resource not found" }, 404);
    }
    const owns = await verifyCourseOwnership(c.env, existing.course_id, instructorId);
    if (!owns) {
      return c.json({ error: "You do not own this course" }, 403);
    }
    const body = await c.req.json();
    const fieldMapping = {
      title: "title",
      description: "description",
      file_url: "file_url",
      fileUrl: "file_url",
      file_type: "file_type",
      fileType: "file_type",
      file_size: "file_size",
      fileSize: "file_size",
      chapter_id: "chapter_id",
      chapterId: "chapter_id",
      lesson_id: "lesson_id",
      lessonId: "lesson_id",
      is_downloadable: "is_downloadable",
      isDownloadable: "is_downloadable",
      sort_order: "sort_order",
      sortOrder: "sort_order"
    };
    const setClauses = [];
    const params = [];
    for (const [bodyField, dbColumn] of Object.entries(fieldMapping)) {
      if (body[bodyField] !== void 0) {
        setClauses.push(`${dbColumn} = ?`);
        params.push(body[bodyField]);
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = ?");
    params.push((/* @__PURE__ */ new Date()).toISOString());
    params.push(resourceId);
    await c.env.DB.prepare(
      `UPDATE course_resources SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    const row = await c.env.DB.prepare("SELECT * FROM course_resources WHERE id = ?").bind(resourceId).first();
    return c.json({ success: true, resource: row });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.delete("/resources/:id", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    const instructorId = authRole === "admin" ? c.req.query("instructorId") : c.get("instructorId");
    const resourceId = c.req.param("id");
    if (!instructorId) {
      return c.json({ error: "instructorId is required" }, 400);
    }
    const existing = await c.env.DB.prepare(
      "SELECT course_id FROM course_resources WHERE id = ?"
    ).bind(resourceId).first();
    if (!existing) {
      return c.json({ error: "Resource not found" }, 404);
    }
    const owns = await verifyCourseOwnership(c.env, existing.course_id, instructorId);
    if (!owns) {
      return c.json({ error: "You do not own this course" }, 403);
    }
    await c.env.DB.prepare("DELETE FROM course_resources WHERE id = ?").bind(resourceId).run();
    return c.json({ success: true, message: "Resource deleted" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.post("/schedule", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    const instructorId = authRole === "admin" ? c.req.query("instructorId") : c.get("instructorId");
    if (!instructorId) {
      return c.json({ error: "instructorId is required" }, 400);
    }
    const body = await c.req.json();
    const { title, course_id, scheduled_at, duration_minutes, meeting_url, platform, description } = body;
    if (!title || !scheduled_at || !duration_minutes || !meeting_url) {
      return c.json({ error: "title, scheduled_at, duration_minutes, and meeting_url are required" }, 400);
    }
    if (course_id) {
      const owns = await verifyCourseOwnership(c.env, course_id, instructorId);
      if (!owns) {
        return c.json({ error: "You do not own this course" }, 403);
      }
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await c.env.DB.prepare(`
      INSERT INTO live_class_schedules (title, course_id, instructor_id, scheduled_at, duration_minutes, meeting_url, platform, description, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      title,
      course_id || null,
      instructorId,
      scheduled_at,
      duration_minutes,
      meeting_url,
      platform || null,
      description || null,
      now,
      now
    ).run();
    const insertedId = result.meta?.last_row_id;
    const row = await c.env.DB.prepare(
      "SELECT * FROM live_class_schedules WHERE rowid = ?"
    ).bind(insertedId).first();
    return c.json({ success: true, schedule: row }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.put("/reviews/:id/reply", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    const instructorId = authRole === "admin" ? c.req.query("instructorId") : c.get("instructorId");
    const reviewId = c.req.param("id");
    if (!instructorId) {
      return c.json({ error: "instructorId is required" }, 400);
    }
    const existing = await c.env.DB.prepare(
      "SELECT instructor_id FROM instructor_reviews WHERE id = ?"
    ).bind(reviewId).first();
    if (!existing) {
      return c.json({ error: "Review not found" }, 404);
    }
    if (existing.instructor_id !== instructorId) {
      return c.json({ error: "You can only reply to reviews for yourself" }, 403);
    }
    const body = await c.req.json();
    const { reply_text } = body;
    if (!reply_text) {
      return c.json({ error: "reply_text is required" }, 400);
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await c.env.DB.prepare(
      "UPDATE instructor_reviews SET reply_text = ?, replied_at = ?, updated_at = ? WHERE id = ?"
    ).bind(reply_text, now, now, reviewId).run();
    const row = await c.env.DB.prepare("SELECT * FROM instructor_reviews WHERE id = ?").bind(reviewId).first();
    return c.json({ success: true, review: row });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.post("/support/tickets", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    const instructorId = authRole === "admin" ? c.req.query("instructorId") : c.get("instructorId");
    if (!instructorId) {
      return c.json({ error: "instructorId is required" }, 400);
    }
    const body = await c.req.json();
    const { category, subject, description, priority } = body;
    if (!category || !subject || !description) {
      return c.json({ error: "category, subject, and description are required" }, 400);
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await c.env.DB.prepare(`
      INSERT INTO support_tickets (user_id, category, subject, description, priority, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'open', ?, ?)
    `).bind(
      instructorId,
      category,
      subject,
      description,
      priority || "medium",
      now,
      now
    ).run();
    const insertedId = result.meta?.last_row_id;
    const row = await c.env.DB.prepare(
      "SELECT * FROM support_tickets WHERE rowid = ?"
    ).bind(insertedId).first();
    return c.json({ success: true, ticket: row }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.post("/support/tickets/:id/messages", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    const instructorId = authRole === "admin" ? c.req.query("instructorId") : c.get("instructorId");
    const ticketId = c.req.param("id");
    if (!instructorId) {
      return c.json({ error: "instructorId is required" }, 400);
    }
    const ticket = await c.env.DB.prepare(
      "SELECT user_id, status FROM support_tickets WHERE id = ?"
    ).bind(ticketId).first();
    if (!ticket) {
      return c.json({ error: "Ticket not found" }, 404);
    }
    if (ticket.user_id !== instructorId) {
      return c.json({ error: "You can only message on your own tickets" }, 403);
    }
    const body = await c.req.json();
    const { message } = body;
    if (!message) {
      return c.json({ error: "message is required" }, 400);
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await c.env.DB.prepare(`
      INSERT INTO support_messages (ticket_id, user_id, message, is_admin, created_at)
      VALUES (?, ?, ?, 0, ?)
    `).bind(ticketId, instructorId, message, now).run();
    if (ticket.status !== "open") {
      await c.env.DB.prepare(
        "UPDATE support_tickets SET status = 'waiting', updated_at = ? WHERE id = ?"
      ).bind(now, ticketId).run();
    } else {
      await c.env.DB.prepare(
        "UPDATE support_tickets SET updated_at = ? WHERE id = ?"
      ).bind(now, ticketId).run();
    }
    const insertedId = result.meta?.last_row_id;
    const row = await c.env.DB.prepare(
      "SELECT * FROM support_messages WHERE rowid = ?"
    ).bind(insertedId).first();
    return c.json({ success: true, message: row }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.post("/courses/:id/thumbnail", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    const instructorId = authRole === "admin" ? c.req.query("instructorId") : c.get("instructorId");
    const courseId = c.req.param("id");
    if (!instructorId) {
      return c.json({ error: "instructorId is required" }, 400);
    }
    const owns = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!owns) {
      return c.json({ error: "You do not own this course" }, 403);
    }
    const formData = await c.req.formData();
    const fileEntry = formData.get("thumbnail");
    if (!fileEntry || typeof fileEntry === "string") {
      return c.json({ error: "No thumbnail file provided" }, 400);
    }
    const file = fileEntry;
    const key = `courses/${courseId}/${Date.now()}-${file.name || "thumbnail"}`;
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2_THUMBNAILS.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type || "image/jpeg" }
    });
    const thumbnailUrl = await getPublicUrl(c.env, "thumbnails", key);
    await c.env.DB.prepare(
      "UPDATE courses SET thumbnail_url = ?, updated_at = ? WHERE id = ?"
    ).bind(thumbnailUrl, (/* @__PURE__ */ new Date()).toISOString(), courseId).run();
    return c.json({ success: true, thumbnail_url: thumbnailUrl });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.post("/courses/:courseId/videos/upload", instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get("authRole");
    const instructorId = authRole === "admin" ? c.req.query("instructorId") : c.get("instructorId");
    const courseId = c.req.param("courseId");
    if (!instructorId) {
      return c.json({ error: "instructorId is required" }, 400);
    }
    const owns = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!owns) {
      return c.json({ error: "You do not own this course" }, 403);
    }
    const formData = await c.req.formData();
    const title = formData.get("title");
    const chapter_id = formData.get("chapter_id") || null;
    const subject_id = formData.get("subject_id") || null;
    const lesson_type = formData.get("lesson_type") || "video";
    const sort_order = parseInt(formData.get("sort_order")) || 0;
    const is_preview = formData.get("is_preview") === "1" ? 1 : 0;
    const is_published = formData.get("is_published") === "1" ? 1 : 0;
    const duration = parseInt(formData.get("duration")) || 0;
    const description = formData.get("description") || null;
    if (!title) {
      return c.json({ error: "title is required" }, 400);
    }
    let videoUrl = "";
    let thumbnailUrl = "";
    let ccUrl = "";
    const videoEntry = formData.get("video");
    if (videoEntry && typeof videoEntry !== "string") {
      const videoFile = videoEntry;
      const videoKey = `courses/${courseId}/videos/${Date.now()}-${videoFile.name || "video.mp4"}`;
      const videoBuffer = await videoFile.arrayBuffer();
      await c.env.R2_VIDEOS.put(videoKey, videoBuffer, {
        httpMetadata: { contentType: videoFile.type || "video/mp4" }
      });
      videoUrl = await getPublicUrl(c.env, "videos", videoKey);
    } else {
      const externalUrl = formData.get("video_url");
      if (externalUrl) {
        videoUrl = externalUrl;
      }
    }
    const thumbEntry = formData.get("thumbnail");
    if (thumbEntry && typeof thumbEntry !== "string") {
      const thumbFile = thumbEntry;
      const thumbKey = `courses/${courseId}/thumbnails/${Date.now()}-${thumbFile.name || "thumbnail.jpg"}`;
      const thumbBuffer = await thumbFile.arrayBuffer();
      await c.env.R2_THUMBNAILS.put(thumbKey, thumbBuffer, {
        httpMetadata: { contentType: thumbFile.type || "image/jpeg" }
      });
      thumbnailUrl = await getPublicUrl(c.env, "thumbnails", thumbKey);
    }
    const ccEntry = formData.get("cc_file");
    if (ccEntry && typeof ccEntry !== "string") {
      const ccFile = ccEntry;
      const ccKey = `courses/${courseId}/subtitles/${Date.now()}-${ccFile.name || "subtitles.vtt"}`;
      const ccBuffer = await ccFile.arrayBuffer();
      await c.env.R2_RESOURCES.put(ccKey, ccBuffer, {
        httpMetadata: { contentType: ccFile.type || "text/vtt" }
      });
      ccUrl = await getPublicUrl(c.env, "resources", ccKey);
    }
    const videoId = generateId();
    const videoSlug = slugify(title);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await c.env.DB.prepare(`
      INSERT INTO videos (id, course_id, title, slug, video_url, thumbnail_url, duration, sort_order, is_preview, is_published, chapter_id, subject_id, lesson_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      videoId,
      courseId,
      title,
      videoSlug,
      videoUrl || null,
      thumbnailUrl || null,
      duration,
      sort_order,
      is_preview,
      is_published,
      chapter_id,
      subject_id,
      lesson_type || null,
      now,
      now
    ).run();
    if (ccUrl) {
      const resourceId = generateId();
      await c.env.DB.prepare(`
        INSERT INTO course_resources (id, course_id, chapter_id, lesson_id, title, description, file_url, file_type, sort_order, uploaded_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `).bind(
        resourceId,
        courseId,
        chapter_id,
        videoId,
        `${title} - Subtitles`,
        "Closed captions / subtitles",
        ccUrl,
        "vtt",
        instructorId,
        now,
        now
      ).run();
    }
    const row = await c.env.DB.prepare("SELECT * FROM videos WHERE id = ?").bind(videoId).first();
    const video = formatVideoRow(row);
    return c.json({ success: true, video, cc_url: ccUrl || void 0 }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/technologies", instructorOrAdminMiddleware, async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT * FROM technologies ORDER BY name ASC"
    ).all();
    return c.json({ success: true, technologies: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/subjects", instructorOrAdminMiddleware, async (c) => {
  try {
    const technologyId = c.req.query("technology_id");
    let query = "SELECT * FROM subjects";
    const params = [];
    if (technologyId) {
      query += " WHERE technology_id = ?";
      params.push(parseInt(technologyId));
    }
    query += " ORDER BY sort_order ASC, name ASC";
    const result = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, subjects: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.get("/courses/:id/subjects", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;
    const owns = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!owns) {
      return c.json({ error: "You do not own this course" }, 403);
    }
    let subjects = [];
    try {
      const result = await c.env.DB.prepare(`
        SELECT cs.*, s.name as subject_name, s.slug as subject_slug, s.technology_id
        FROM course_subjects cs
        LEFT JOIN subjects s ON cs.subject_id = s.id
        WHERE cs.course_id = ?
        ORDER BY cs.sort_order ASC
      `).bind(courseId).all();
      subjects = result.results;
    } catch {
    }
    return c.json({ success: true, subjects });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.post("/courses/:id/subjects", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;
    const owns = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!owns) {
      return c.json({ error: "You do not own this course" }, 403);
    }
    const body = await c.req.json();
    const { subject_id, sort_order } = body;
    if (!subject_id) {
      return c.json({ error: "subject_id is required" }, 400);
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await c.env.DB.prepare(`
        INSERT INTO course_subjects (course_id, subject_id, sort_order, created_at)
        VALUES (?, ?, ?, ?)
      `).bind(courseId, subject_id, sort_order || 0, now).run();
    } catch (err) {
      if (err?.message?.includes("UNIQUE") || err?.message?.includes("duplicate")) {
        return c.json({ error: "Subject already added to this course" }, 400);
      }
    }
    return c.json({ success: true, message: "Subject added to course" }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instructorRoutes2.delete("/courses/:id/subjects/:subjectId", instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param("id");
    const subjectId = c.req.param("subjectId");
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;
    const owns = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!owns) {
      return c.json({ error: "You do not own this course" }, 403);
    }
    await c.env.DB.prepare(
      "DELETE FROM course_subjects WHERE course_id = ? AND subject_id = ?"
    ).bind(courseId, subjectId).run();
    return c.json({ success: true, message: "Subject removed from course" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
var instructor_default = instructorRoutes2;

// src/routes/courses.ts
var courseRoutes = new Hono2();
courseRoutes.use("*", adminAuthMiddleware);
function slugify2(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
courseRoutes.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const search = c.req.query("search") || "";
    const level = c.req.query("level") || "";
    const published = c.req.query("published") || "";
    const featured = c.req.query("featured") || "";
    const offset = (page - 1) * limit;
    let where = "WHERE 1=1";
    const params = [];
    if (search) {
      where += " AND title LIKE ?";
      params.push(`%${search}%`);
    }
    if (level) {
      where += " AND level = ?";
      params.push(level);
    }
    if (published === "true") {
      where += " AND is_published = 1";
    }
    if (published === "false") {
      where += " AND is_published = 0";
    }
    if (featured === "true") {
      where += " AND is_featured = 1";
    }
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM courses ${where}`
    ).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(
      `SELECT * FROM courses ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();
    const enrichedResults = await Promise.all(result.results.map(async (course) => {
      const [cats, insts, subs, vidInfo] = await Promise.all([
        c.env.DB.prepare("SELECT category_id FROM course_categories WHERE course_id = ? ORDER BY sort_order").bind(course.id).all(),
        c.env.DB.prepare("SELECT instructor_id FROM course_instructors WHERE course_id = ? ORDER BY sort_order").bind(course.id).all(),
        c.env.DB.prepare("SELECT subject_id FROM course_subjects WHERE course_id = ? ORDER BY sort_order").bind(course.id).all(),
        c.env.DB.prepare("SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total_duration FROM videos WHERE course_id = ?").bind(course.id).first()
      ]);
      const videoCount = vidInfo?.count || 0;
      const totalDuration = vidInfo?.total_duration || 0;
      const avgDuration = videoCount > 0 ? Math.round(totalDuration / videoCount * 10) / 10 : 0;
      return {
        ...course,
        category_ids: cats.results.map((r) => r.category_id),
        instructor_ids: insts.results.map((r) => r.instructor_id),
        subject_ids: subs.results.map((r) => r.subject_id),
        total_videos: videoCount,
        duration: avgDuration,
        total_video_duration: totalDuration
      };
    }));
    return c.json({ documents: enrichedResults, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
courseRoutes.post("/", async (c) => {
  try {
    const rawData = await c.req.json();
    const allowedFields = ["title", "slug", "description", "thumbnail_url", "preview_video_url", "category_id", "instructor_id", "technology_id", "level", "language", "duration", "total_videos", "rating", "total_reviews", "total_students", "price", "is_featured", "is_published", "tags", "semester", "what_you_learn"];
    const data = normalizeKeys(rawData, allowedFields);
    const id = crypto.randomUUID();
    const slug = data.slug || slugify2(data.title);
    await c.env.DB.prepare(`
      INSERT INTO courses (id, title, slug, description, thumbnail_url, preview_video_url, category_id, instructor_id, technology_id, level, language, duration, total_videos, rating, total_reviews, total_students, price, is_featured, is_published, tags, semester, what_you_learn)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.title || "",
      slug,
      data.description || null,
      data.thumbnail_url || null,
      data.preview_video_url || null,
      data.category_id || null,
      data.instructor_id || null,
      data.technology_id || null,
      data.level || "beginner",
      data.language || "bangla",
      data.duration || 0,
      data.total_videos || 0,
      data.rating || 0,
      data.total_reviews || 0,
      data.total_students || 0,
      data.price || 0,
      data.is_featured ? 1 : 0,
      data.is_published ? 1 : 0,
      data.tags || null,
      data.semester || null,
      data.what_you_learn || null
    ).run();
    const categoryIds = rawData.category_ids ? JSON.parse(String(rawData.category_ids)) : rawData.category_id ? [rawData.category_id] : [];
    const instructorIds = rawData.instructor_ids ? JSON.parse(String(rawData.instructor_ids)) : rawData.instructor_id ? [rawData.instructor_id] : [];
    const subjectIds = rawData.subject_ids ? JSON.parse(String(rawData.subject_ids)) : [];
    if (categoryIds.length > 0) {
      await c.env.DB.prepare("DELETE FROM course_categories WHERE course_id = ?").bind(id).run();
      for (let i = 0; i < categoryIds.length; i++) {
        await c.env.DB.prepare("INSERT OR IGNORE INTO course_categories (course_id, category_id, sort_order) VALUES (?, ?, ?)").bind(id, String(categoryIds[i]), i).run();
      }
    }
    if (instructorIds.length > 0) {
      await c.env.DB.prepare("DELETE FROM course_instructors WHERE course_id = ?").bind(id).run();
      for (let i = 0; i < instructorIds.length; i++) {
        await c.env.DB.prepare("INSERT OR IGNORE INTO course_instructors (course_id, instructor_id, sort_order) VALUES (?, ?, ?)").bind(id, String(instructorIds[i]), i).run();
      }
    }
    if (subjectIds.length > 0) {
      await c.env.DB.prepare("DELETE FROM course_subjects WHERE course_id = ?").bind(id).run();
      for (let i = 0; i < subjectIds.length; i++) {
        await c.env.DB.prepare("INSERT OR IGNORE INTO course_subjects (course_id, subject_id, sort_order) VALUES (?, ?, ?)").bind(id, String(subjectIds[i]), i).run();
      }
    }
    const learningPoints = rawData.learning_points ? Array.isArray(rawData.learning_points) ? rawData.learning_points : JSON.parse(String(rawData.learning_points)) : [];
    if (learningPoints.length > 0) {
      await c.env.DB.prepare("DELETE FROM course_learning_points WHERE course_id = ?").bind(id).run();
      for (let i = 0; i < learningPoints.length; i++) {
        const pointText = typeof learningPoints[i] === "string" ? learningPoints[i] : learningPoints[i].point_text || "";
        if (pointText) {
          await c.env.DB.prepare("INSERT INTO course_learning_points (course_id, point_text, sort_order) VALUES (?, ?, ?)").bind(id, pointText, i).run();
        }
      }
    }
    const created = await c.env.DB.prepare("SELECT * FROM courses WHERE id = ?").bind(id).first();
    const coursePrice = data.price || 0;
    try {
      await c.env.DB.prepare(`
        INSERT INTO course_packages (course_id, package_type, price, duration_months, max_users, is_auto_assign, is_active, created_by)
        VALUES (?, 'single', ?, 6, 1, 1, 1, ?)
      `).bind(id, coursePrice, c.get("user")?.id || null).run();
      const friendPackPrice = Math.round(coursePrice * 1.6);
      await c.env.DB.prepare(`
        INSERT INTO course_packages (course_id, package_type, price, duration_months, max_users, is_auto_assign, is_active, created_by)
        VALUES (?, 'friend', ?, 6, 2, 1, 1, ?)
      `).bind(id, friendPackPrice, c.get("user")?.id || null).run();
    } catch (pkgErr) {
      console.error("Auto-package creation failed:", pkgErr);
    }
    const user = c.get("user");
    await logAudit(c.env, user.id, "CREATE_COURSE", "courses", id, data);
    return c.json({ document: created });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
courseRoutes.put("/", async (c) => {
  try {
    const rawData = await c.req.json();
    const { courseId, ...rawUpdates } = rawData;
    if (!courseId) {
      return c.json({ error: "Course ID required" }, 400);
    }
    const allowedFields = ["title", "slug", "description", "thumbnail_url", "preview_video_url", "category_id", "instructor_id", "technology_id", "level", "language", "duration", "total_videos", "rating", "total_reviews", "total_students", "price", "is_featured", "is_published", "tags", "semester", "what_you_learn"];
    const updates = normalizeKeys(rawUpdates, allowedFields);
    const setClauses = [];
    const setValues = [];
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === "is_featured" || key === "is_published") {
          setClauses.push(`${key} = ?`);
          setValues.push(value ? 1 : 0);
        } else {
          setClauses.push(`${key} = ?`);
          setValues.push(value);
        }
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = datetime('now')");
    setValues.push(String(courseId));
    await c.env.DB.prepare(
      `UPDATE courses SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...setValues).run();
    const categoryIds = rawData.category_ids ? JSON.parse(String(rawData.category_ids)) : rawData.category_id ? [rawData.category_id] : [];
    const instructorIds = rawData.instructor_ids ? JSON.parse(String(rawData.instructor_ids)) : rawData.instructor_id ? [rawData.instructor_id] : [];
    const subjectIds = rawData.subject_ids ? JSON.parse(String(rawData.subject_ids)) : [];
    if (categoryIds.length > 0) {
      await c.env.DB.prepare("DELETE FROM course_categories WHERE course_id = ?").bind(String(courseId)).run();
      for (let i = 0; i < categoryIds.length; i++) {
        await c.env.DB.prepare("INSERT OR IGNORE INTO course_categories (course_id, category_id, sort_order) VALUES (?, ?, ?)").bind(String(courseId), String(categoryIds[i]), i).run();
      }
    }
    if (instructorIds.length > 0) {
      await c.env.DB.prepare("DELETE FROM course_instructors WHERE course_id = ?").bind(String(courseId)).run();
      for (let i = 0; i < instructorIds.length; i++) {
        await c.env.DB.prepare("INSERT OR IGNORE INTO course_instructors (course_id, instructor_id, sort_order) VALUES (?, ?, ?)").bind(String(courseId), String(instructorIds[i]), i).run();
      }
    }
    if (subjectIds.length > 0) {
      await c.env.DB.prepare("DELETE FROM course_subjects WHERE course_id = ?").bind(String(courseId)).run();
      for (let i = 0; i < subjectIds.length; i++) {
        await c.env.DB.prepare("INSERT OR IGNORE INTO course_subjects (course_id, subject_id, sort_order) VALUES (?, ?, ?)").bind(String(courseId), String(subjectIds[i]), i).run();
      }
    }
    const learningPoints = rawData.learning_points ? Array.isArray(rawData.learning_points) ? rawData.learning_points : JSON.parse(String(rawData.learning_points)) : [];
    if (learningPoints.length > 0) {
      await c.env.DB.prepare("DELETE FROM course_learning_points WHERE course_id = ?").bind(String(courseId)).run();
      for (let i = 0; i < learningPoints.length; i++) {
        const pointText = typeof learningPoints[i] === "string" ? learningPoints[i] : learningPoints[i].point_text || "";
        if (pointText) {
          await c.env.DB.prepare("INSERT INTO course_learning_points (course_id, point_text, sort_order) VALUES (?, ?, ?)").bind(String(courseId), pointText, i).run();
        }
      }
    }
    const updated = await c.env.DB.prepare("SELECT * FROM courses WHERE id = ?").bind(String(courseId)).first();
    try {
      const existingPackages = await c.env.DB.prepare(
        "SELECT * FROM course_packages WHERE course_id = ?"
      ).bind(String(courseId)).all();
      const coursePrice = updates.price ?? (updated?.price || 0);
      if (existingPackages.results.length === 0) {
        await c.env.DB.prepare(`
          INSERT INTO course_packages (course_id, package_type, price, duration_months, max_users, is_auto_assign, is_active, created_by)
          VALUES (?, 'single', ?, 6, 1, 1, 1, 'auto')
        `).bind(String(courseId), coursePrice).run();
        const friendPackPrice = Math.round(coursePrice * 1.6);
        await c.env.DB.prepare(`
          INSERT INTO course_packages (course_id, package_type, price, duration_months, max_users, is_auto_assign, is_active, created_by)
          VALUES (?, 'friend', ?, 6, 2, 1, 1, 'auto')
        `).bind(String(courseId), friendPackPrice).run();
      } else if (updates.price !== void 0) {
        await c.env.DB.prepare(
          "UPDATE course_packages SET price = ?, updated_at = datetime('now') WHERE course_id = ? AND package_type = 'single' AND is_auto_assign = 1"
        ).bind(coursePrice, String(courseId)).run();
        const friendPackPrice = Math.round(coursePrice * 1.6);
        await c.env.DB.prepare(
          "UPDATE course_packages SET price = ?, updated_at = datetime('now') WHERE course_id = ? AND package_type = 'friend' AND is_auto_assign = 1"
        ).bind(friendPackPrice, String(courseId)).run();
      }
    } catch (pkgErr) {
      console.error("Auto-package sync failed:", pkgErr);
    }
    const user = c.get("user");
    await logAudit(c.env, user.id, "UPDATE_COURSE", "courses", String(courseId), updates);
    return c.json({ document: updated });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
courseRoutes.delete("/", async (c) => {
  try {
    const courseId = c.req.query("id");
    if (!courseId) {
      return c.json({ error: "Course ID required" }, 400);
    }
    await c.env.DB.prepare("DELETE FROM courses WHERE id = ?").bind(courseId).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "DELETE_COURSE", "courses", courseId);
    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var courses_default = courseRoutes;

// src/routes/videos.ts
var videoRoutes = new Hono2();
videoRoutes.use("*", adminAuthMiddleware);
videoRoutes.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const courseId = c.req.query("courseId") || "";
    const published = c.req.query("published") || "";
    const offset = (page - 1) * limit;
    let where = "WHERE 1=1";
    const params = [];
    if (courseId) {
      where += " AND course_id = ?";
      params.push(courseId);
    }
    if (published === "true") {
      where += " AND is_published = 1";
    }
    if (published === "false") {
      where += " AND is_published = 0";
    }
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM videos ${where}`
    ).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(
      `SELECT * FROM videos ${where} ORDER BY course_id, sort_order ASC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();
    return c.json({ documents: result.results, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
videoRoutes.post("/", async (c) => {
  try {
    const rawData = await c.req.json();
    const allowedFields = ["title", "slug", "description", "course_id", "video_url", "thumbnail_url", "duration", "sort_order", "is_preview", "is_published", "lesson_id", "lesson_type"];
    const data = normalizeKeys(rawData, allowedFields);
    const id = crypto.randomUUID();
    const slug = data.slug || (data.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const processingStatus = data.video_url && String(data.video_url).trim() !== "" ? "pending" : null;
    await c.env.DB.prepare(`
      INSERT INTO videos (id, title, slug, description, course_id, video_url, thumbnail_url, duration, sort_order, is_preview, is_published, lesson_id, lesson_type, processing_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.title || "",
      slug,
      data.description || null,
      data.course_id || "",
      data.video_url || null,
      data.thumbnail_url || null,
      data.duration || 0,
      data.sort_order || 0,
      data.is_preview ? 1 : 0,
      data.is_published ? 1 : 0,
      data.lesson_id || null,
      data.lesson_type || null,
      processingStatus
    ).run();
    const created = await c.env.DB.prepare("SELECT * FROM videos WHERE id = ?").bind(id).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "CREATE_VIDEO", "videos", id, data);
    return c.json({ document: created });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
videoRoutes.put("/", async (c) => {
  try {
    const rawData = await c.req.json();
    const { videoId, ...rawUpdates } = rawData;
    if (!videoId) {
      return c.json({ error: "Video ID required" }, 400);
    }
    const allowedFields = ["title", "slug", "description", "course_id", "video_url", "thumbnail_url", "duration", "sort_order", "is_preview", "is_published", "lesson_id", "lesson_type"];
    const updates = normalizeKeys(rawUpdates, allowedFields);
    const setClauses = [];
    const setValues = [];
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === "is_preview" || key === "is_published") {
          setClauses.push(`${key} = ?`);
          setValues.push(value ? 1 : 0);
        } else {
          setClauses.push(`${key} = ?`);
          setValues.push(value);
        }
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = datetime('now')");
    setValues.push(String(videoId));
    await c.env.DB.prepare(
      `UPDATE videos SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...setValues).run();
    const updated = await c.env.DB.prepare("SELECT * FROM videos WHERE id = ?").bind(String(videoId)).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "UPDATE_VIDEO", "videos", String(videoId), updates);
    return c.json({ document: updated });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
videoRoutes.delete("/", async (c) => {
  try {
    const videoId = c.req.query("id");
    if (!videoId) {
      return c.json({ error: "Video ID required" }, 400);
    }
    await c.env.DB.prepare("DELETE FROM videos WHERE id = ?").bind(videoId).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "DELETE_VIDEO", "videos", videoId);
    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var videos_default = videoRoutes;

// src/routes/institutes.ts
var instituteRoutes = new Hono2();
instituteRoutes.use("*", adminAuthMiddleware);
instituteRoutes.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = (page - 1) * limit;
    const countResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as total FROM institutes"
    ).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(
      "SELECT * FROM institutes ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).bind(limit, offset).all();
    return c.json({ documents: result.results, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
instituteRoutes.post("/", async (c) => {
  try {
    const data = await c.req.json();
    await c.env.DB.prepare(`
      INSERT INTO institutes (name, name_bn, division, district, eiin_number, type, is_requested, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.name || "",
      data.name_bn || null,
      data.division || null,
      data.district || null,
      data.eiin_number || null,
      data.type || "polytechnic",
      data.is_requested ? 1 : 0,
      data.is_active !== void 0 ? data.is_active ? 1 : 0 : 1
    ).run();
    const created = await c.env.DB.prepare(
      "SELECT * FROM institutes WHERE rowid = last_insert_rowid()"
    ).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "CREATE_INSTITUTE", "institutes", String(created?.id), data);
    return c.json({ document: created });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
instituteRoutes.put("/", async (c) => {
  try {
    const data = await c.req.json();
    const { instituteId, ...updates } = data;
    if (!instituteId) {
      return c.json({ error: "Institute ID required" }, 400);
    }
    const allowedFields = ["name", "name_bn", "division", "district", "eiin_number", "type", "is_requested", "requested_by", "approved_by", "approved_at", "is_active"];
    const setClauses = [];
    const setValues = [];
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === "is_requested" || key === "is_active") {
          setClauses.push(`${key} = ?`);
          setValues.push(value ? 1 : 0);
        } else {
          setClauses.push(`${key} = ?`);
          setValues.push(value);
        }
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = datetime('now')");
    setValues.push(String(instituteId));
    await c.env.DB.prepare(
      `UPDATE institutes SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...setValues).run();
    const updated = await c.env.DB.prepare("SELECT * FROM institutes WHERE id = ?").bind(String(instituteId)).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "UPDATE_INSTITUTE", "institutes", String(instituteId), updates);
    return c.json({ document: updated });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
instituteRoutes.delete("/", async (c) => {
  try {
    const instituteId = c.req.query("id");
    if (!instituteId) {
      return c.json({ error: "Institute ID required" }, 400);
    }
    await c.env.DB.prepare("DELETE FROM institutes WHERE id = ?").bind(instituteId).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "DELETE_INSTITUTE", "institutes", instituteId);
    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var institutes_default = instituteRoutes;

// src/lib/types.ts
var DEFAULT_CONFIG = {
  featureToggles: {
    downloads: true,
    bookmarks: true,
    certificates: true,
    liveSessions: true,
    achievements: true,
    assignments: true,
    discussions: true,
    community: true,
    leaderboard: true,
    studyGroups: true,
    peerConnections: true,
    feedback: true,
    pricing: true,
    referral: true
  },
  homePageSections: {
    sections: ["hero", "continue-watching", "categories", "new-releases", "live", "trending", "instructors", "leaderboard", "recommended"]
  },
  sidebarVisibility: {
    menu: true,
    departments: true,
    semesters: true,
    exams: true,
    community: true,
    general: true
  },
  bottomNavTabs: {
    tabs: [
      { id: "home", label: "Home", enabled: true, order: 0 },
      { id: "explore", label: "Explore", enabled: true, order: 1 },
      { id: "my-courses", label: "My Courses", enabled: true, order: 2 },
      { id: "watch-history", label: "Watch History", enabled: true, order: 3 },
      { id: "profile", label: "Profile", enabled: true, order: 4 }
    ]
  },
  topBarElements: {
    search: true,
    notifications: true,
    avatar: true,
    hamburger: true
  },
  cardStyle: "glass",
  contentProtection: {
    enabled: true,
    noCopy: true,
    noRightClick: true,
    noScreenshot: true,
    noPrint: true,
    customContextMenu: true,
    watermark: false,
    dragProtection: true
  }
};

// src/routes/config.ts
var configRoutes = new Hono2();
configRoutes.use("*", adminAuthMiddleware);
configRoutes.get("/", async (c) => {
  try {
    const cachedConfig = await c.env.KV_CONFIG.get("server_config", "json");
    if (cachedConfig) {
      return c.json(cachedConfig);
    }
    const { results } = await c.env.DB.prepare(
      "SELECT key, value FROM app_config"
    ).all();
    const configMap = {};
    for (const row of results) {
      try {
        configMap[row.key] = JSON.parse(row.value);
      } catch {
        configMap[row.key] = row.value;
      }
    }
    const config = {
      featureToggles: { ...DEFAULT_CONFIG.featureToggles, ...configMap.featureToggles },
      homePageSections: configMap.homePageSections || DEFAULT_CONFIG.homePageSections,
      sidebarVisibility: { ...DEFAULT_CONFIG.sidebarVisibility, ...configMap.sidebarVisibility },
      bottomNavTabs: configMap.bottomNavTabs || DEFAULT_CONFIG.bottomNavTabs,
      topBarElements: { ...DEFAULT_CONFIG.topBarElements, ...configMap.topBarElements },
      cardStyle: configMap.cardStyle || DEFAULT_CONFIG.cardStyle,
      contentProtection: { ...DEFAULT_CONFIG.contentProtection, ...configMap.contentProtection }
    };
    await c.env.KV_CONFIG.put("server_config", JSON.stringify(config), { expirationTtl: 300 });
    return c.json(config);
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
configRoutes.put("/", async (c) => {
  try {
    const config = await c.req.json();
    const sections = {
      featureToggles: config.featureToggles,
      homePageSections: config.homePageSections,
      sidebarVisibility: config.sidebarVisibility,
      bottomNavTabs: config.bottomNavTabs,
      topBarElements: config.topBarElements,
      cardStyle: config.cardStyle,
      contentProtection: config.contentProtection
    };
    for (const [key, value] of Object.entries(sections)) {
      await c.env.DB.prepare(
        `INSERT INTO app_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
      ).bind(key, JSON.stringify(value)).run();
    }
    await c.env.KV_CONFIG.put("server_config", JSON.stringify(config));
    await c.env.KV_CONFIG.put("config_updated_at", (/* @__PURE__ */ new Date()).toISOString());
    const user = c.get("user");
    await logAudit(c.env, user.id, "UPDATE_CONFIG", "config", void 0, config);
    return c.json({ success: true, config });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
configRoutes.put("/reset", async (c) => {
  try {
    const config = DEFAULT_CONFIG;
    const sections = {
      featureToggles: config.featureToggles,
      homePageSections: config.homePageSections,
      sidebarVisibility: config.sidebarVisibility,
      bottomNavTabs: config.bottomNavTabs,
      topBarElements: config.topBarElements,
      cardStyle: config.cardStyle,
      contentProtection: config.contentProtection
    };
    for (const [key, value] of Object.entries(sections)) {
      await c.env.DB.prepare(
        `INSERT INTO app_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
      ).bind(key, JSON.stringify(value)).run();
    }
    await c.env.KV_CONFIG.put("server_config", JSON.stringify(config));
    await c.env.KV_CONFIG.put("config_updated_at", (/* @__PURE__ */ new Date()).toISOString());
    const user = c.get("user");
    await logAudit(c.env, user.id, "RESET_CONFIG", "config", void 0, { action: "reset_to_defaults" });
    return c.json({ success: true, config });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var config_default = configRoutes;

// src/lib/onesignal.ts
async function sendPushNotification(env, payload) {
  try {
    const appId = env.ONE_SIGNAL_APP_ID;
    const restApiKey = env.ONE_SIGNAL_REST_API_KEY;
    if (!appId || !restApiKey) {
      console.warn("OneSignal not configured \u2014 skipping push notification");
      return { success: false, recipients: 0, errors: ["OneSignal not configured"] };
    }
    const body = {
      app_id: appId,
      headings: { en: payload.title, bn: payload.titleBn || payload.title },
      contents: { en: payload.message, bn: payload.messageBn || payload.message },
      data: payload.data || {}
    };
    if (payload.url) {
      body.url = payload.url;
    }
    if (payload.targetPlayerIds && payload.targetPlayerIds.length > 0) {
      body.include_player_ids = payload.targetPlayerIds;
    } else if (payload.targetSegment) {
      body.included_segments = [payload.targetSegment];
    } else {
      body.included_segments = ["All"];
    }
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${restApiKey}`
      },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    if (response.ok) {
      return {
        success: true,
        recipients: result.recipients || 0,
        errors: result.errors || []
      };
    } else {
      return {
        success: false,
        recipients: 0,
        errors: [result.errors?.[0] || "Unknown OneSignal error"]
      };
    }
  } catch (error) {
    console.error("OneSignal push error:", error);
    return {
      success: false,
      recipients: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"]
    };
  }
}
async function getUserPushTokens(env, userId) {
  try {
    const result = await env.DB.prepare(
      "SELECT push_token FROM user_push_tokens WHERE user_id = ? AND is_active = 1"
    ).bind(userId).all();
    return result.results.map((row) => row.push_token);
  } catch (error) {
    console.error("Failed to get user push tokens:", error);
    return [];
  }
}
async function getBatchUserPushTokens(env, userIds) {
  if (userIds.length === 0) return [];
  try {
    const placeholders = userIds.map(() => "?").join(",");
    const result = await env.DB.prepare(
      `SELECT DISTINCT push_token FROM user_push_tokens WHERE user_id IN (${placeholders}) AND is_active = 1`
    ).bind(...userIds).all();
    return result.results.map((row) => row.push_token);
  } catch (error) {
    console.error("Failed to get batch user push tokens:", error);
    return [];
  }
}
async function registerPushToken(env, userId, pushToken, deviceType, deviceInfo) {
  try {
    await env.DB.prepare(
      "UPDATE user_push_tokens SET is_active = 1, updated_at = datetime('now') WHERE user_id = ? AND push_token = ?"
    ).bind(userId, pushToken).run();
    await env.DB.prepare(`
      INSERT INTO user_push_tokens (id, user_id, push_token, device_type, device_info, is_active, created_at)
      SELECT ?, ?, ?, ?, ?, 1, datetime('now')
      WHERE NOT EXISTS (SELECT 1 FROM user_push_tokens WHERE user_id = ? AND push_token = ?)
    `).bind(generateId(), userId, pushToken, deviceType || null, deviceInfo || null, userId, pushToken).run();
  } catch (error) {
    console.error("Failed to register push token:", error);
    throw error;
  }
}
async function unregisterPushToken(env, pushToken) {
  try {
    await env.DB.prepare(
      "UPDATE user_push_tokens SET is_active = 0, updated_at = datetime('now') WHERE push_token = ?"
    ).bind(pushToken).run();
  } catch (error) {
    console.error("Failed to unregister push token:", error);
    throw error;
  }
}

// src/routes/notifications.ts
var notificationRoutes = new Hono2();
notificationRoutes.use("*", adminAuthMiddleware);
function isInQuietHours(quietHoursEnabled, quietStart, quietEnd) {
  if (!quietHoursEnabled) return false;
  const now = /* @__PURE__ */ new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = (quietStart || "22:00").split(":").map(Number);
  const [endH, endM] = (quietEnd || "08:00").split(":").map(Number);
  const startMinutes = (startH || 0) * 60 + (startM || 0);
  const endMinutes = (endH || 0) * 60 + (endM || 0);
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
}
function getCategoryPushColumn(category) {
  const map = {
    "course-update": "course_updates_push",
    "info": "course_updates_push",
    "success": "course_updates_push",
    "grades": "grades_push",
    "schedule": "schedule_push",
    "payment": "payment_push",
    "announcement": "promotions_push",
    "promotions": "promotions_push",
    "social": "social_push",
    "system": "system_push",
    "warning": "system_push",
    "error": "system_push",
    "support": "system_push"
  };
  return map[category] || map["info"];
}
async function checkDeliveryPrefs(env, userId, category) {
  try {
    const prefs = await env.DB.prepare(
      "SELECT * FROM notification_preferences WHERE user_id = ?"
    ).bind(userId).first();
    if (!prefs) {
      return { shouldDeliver: true, shouldPush: true };
    }
    if (!prefs.push_enabled) {
      const categoryCol2 = getCategoryPushColumn(category);
      const categoryEnabled2 = !!prefs[categoryCol2];
      if (!categoryEnabled2) {
        return { shouldDeliver: false, shouldPush: false };
      }
      return { shouldDeliver: true, shouldPush: false };
    }
    const categoryCol = getCategoryPushColumn(category);
    const categoryEnabled = !!prefs[categoryCol];
    if (!categoryEnabled) {
      return { shouldDeliver: false, shouldPush: false };
    }
    const quietHoursEnabled = !!prefs.quiet_hours_enabled;
    if (isInQuietHours(quietHoursEnabled, prefs.quiet_hours_start, prefs.quiet_hours_end)) {
      return { shouldDeliver: true, shouldPush: false };
    }
    return { shouldDeliver: true, shouldPush: true };
  } catch (error) {
    console.error("Failed to check delivery prefs:", error);
    return { shouldDeliver: true, shouldPush: true };
  }
}
notificationRoutes.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const userId = c.req.query("userId") || "";
    const offset = (page - 1) * limit;
    let where = "WHERE 1=1";
    const params = [];
    if (userId) {
      where += " AND user_id = ?";
      params.push(userId);
    }
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM notifications ${where}`
    ).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();
    const logsResult = await c.env.DB.prepare(
      "SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).bind(limit, offset).all();
    const documents = [
      ...result.results.map((row) => ({
        id: row.id,
        title: row.title,
        message: row.message,
        type: row.type || "info",
        category: row.category || "",
        userId: row.user_id,
        isRead: !!row.read,
        actionUrl: row.action_url,
        createdAt: row.created_at,
        source: "d1"
      })),
      ...logsResult.results.map((row) => ({
        id: `log-${row.id}`,
        title: row.title,
        message: row.message,
        type: row.metadata ? JSON.parse(row.metadata || "{}").notifType || "info" : "info",
        category: row.category || "",
        targetType: row.target_type,
        targetId: row.target_id,
        sentCount: row.sent_count,
        failedCount: row.failed_count,
        createdAt: row.created_at,
        source: "log"
      }))
    ];
    documents.sort((a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime());
    return c.json({ documents: documents.slice(0, limit), total: Math.max(total, documents.length) });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
notificationRoutes.post("/", async (c) => {
  try {
    const data = await c.req.json();
    const {
      title,
      message,
      type = "info",
      category = "info",
      targetAll,
      targetUserId,
      targetInstitute,
      targetTechnology,
      actionUrl,
      ...extraData
    } = data;
    if (!title || !message) {
      return c.json({ error: "Title and message are required" }, 400);
    }
    const effectiveCategory = category || type;
    const created = [];
    const skippedByPref = [];
    const silentDelivery = [];
    const pushDelivery = [];
    let failedCount = 0;
    let targetType = "user";
    let targetId = targetUserId || "";
    async function processUser(userId) {
      const { shouldDeliver, shouldPush } = await checkDeliveryPrefs(c.env, userId, effectiveCategory);
      if (!shouldDeliver) {
        skippedByPref.push(userId);
        return;
      }
      try {
        const notifId = crypto.randomUUID();
        await c.env.DB.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, category, read, action_url)
          VALUES (?, ?, ?, ?, ?, ?, 0, ?)
        `).bind(notifId, userId, title, message, type, effectiveCategory, actionUrl || null).run();
        created.push({ id: notifId, userId });
      } catch (docErr) {
        failedCount++;
        console.error("Failed to create notification for user:", userId, getErrorMessage(docErr));
        return;
      }
      if (shouldPush) {
        pushDelivery.push(userId);
      } else {
        silentDelivery.push(userId);
      }
    }
    if (targetAll) {
      targetType = "all";
      targetId = "all";
      let offset = 0;
      const batchLimit = 100;
      let hasMore = true;
      while (hasMore) {
        const usersResult = await c.env.DB.prepare(
          "SELECT id FROM users WHERE is_active = 1 LIMIT ? OFFSET ?"
        ).bind(batchLimit, offset).all();
        for (const user2 of usersResult.results) {
          await processUser(user2.id);
        }
        offset += batchLimit;
        hasMore = usersResult.results.length === batchLimit;
      }
    } else if (targetInstitute) {
      targetType = "institute";
      targetId = targetInstitute;
      const usersResult = await c.env.DB.prepare(
        "SELECT id FROM users WHERE institute_id = ? AND is_active = 1 LIMIT 500"
      ).bind(targetInstitute).all();
      for (const user2 of usersResult.results) {
        await processUser(user2.id);
      }
    } else if (targetTechnology) {
      targetType = "technology";
      targetId = targetTechnology;
      const usersResult = await c.env.DB.prepare(
        "SELECT id FROM users WHERE technology = ? AND is_active = 1 LIMIT 500"
      ).bind(targetTechnology).all();
      for (const user2 of usersResult.results) {
        await processUser(user2.id);
      }
    } else if (targetUserId) {
      await processUser(targetUserId);
    } else {
      return c.json({ error: "Specify targetAll, targetUserId, targetInstitute, or targetTechnology" }, 400);
    }
    try {
      if (pushDelivery.length > 0) {
        const pushTokens = await getBatchUserPushTokens(c.env, pushDelivery);
        if (pushTokens.length > 0) {
          await sendPushNotification(c.env, {
            title,
            message,
            targetPlayerIds: pushTokens,
            url: actionUrl || void 0
          });
        }
      }
      if (targetAll && pushDelivery.length === 0 && skippedByPref.length === 0) {
        await sendPushNotification(c.env, {
          title,
          message,
          targetSegment: "All",
          url: actionUrl || void 0
        });
      }
    } catch (pushErr) {
      console.error("Push notification failed:", getErrorMessage(pushErr));
    }
    const user = c.get("user");
    const logMetadata = JSON.stringify({
      notifType: type,
      category: effectiveCategory,
      actionUrl: actionUrl || "",
      skippedByPref: skippedByPref.length,
      silentDelivery: silentDelivery.length,
      pushDelivery: pushDelivery.length,
      ...extraData
    });
    await c.env.DB.prepare(`
      INSERT INTO notification_logs (type, category, title, message, target_type, target_id, sent_count, failed_count, metadata, created_by)
      VALUES ('in-app', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      effectiveCategory,
      title,
      message,
      targetType,
      targetId,
      created.length,
      failedCount,
      logMetadata,
      user.id
    ).run();
    await logAudit(c.env, user.id, "SEND_NOTIFICATION", "notifications", void 0, {
      targetType,
      targetId,
      targetAll,
      targetUserId,
      targetInstitute,
      targetTechnology,
      category: effectiveCategory,
      sentCount: created.length,
      failedCount,
      skippedByPref: skippedByPref.length,
      silentDelivery: silentDelivery.length,
      pushDelivery: pushDelivery.length
    });
    return c.json({
      created,
      count: created.length,
      failedCount,
      skippedByPref: skippedByPref.length,
      silentDelivery: silentDelivery.length,
      pushDelivery: pushDelivery.length,
      logged: true
    });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var notifications_default = notificationRoutes;

// src/routes/analytics.ts
var analyticsRoutes = new Hono2();
analyticsRoutes.use("*", adminAuthMiddleware);
analyticsRoutes.get("/", async (c) => {
  try {
    const [
      usersCount,
      coursesCount,
      videosCount,
      enrollmentsCount,
      activeSessions,
      newSignupsToday
    ] = await Promise.all([
      c.env.DB.prepare("SELECT COUNT(*) as total FROM users").first().catch(() => ({ total: 0 })),
      c.env.DB.prepare("SELECT COUNT(*) as total FROM courses").first().catch(() => ({ total: 0 })),
      c.env.DB.prepare("SELECT COUNT(*) as total FROM videos").first().catch(() => ({ total: 0 })),
      c.env.DB.prepare("SELECT COUNT(*) as total FROM enrollments").first().catch(() => ({ total: 0 })),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM admin_sessions WHERE is_active = 1 AND expires_at > datetime('now')").first().catch(() => ({ count: 0 })),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE date(created_at) = date('now')").first().catch(() => ({ count: 0 }))
    ]);
    const stats = {
      totalUsers: usersCount?.total || 0,
      totalCourses: coursesCount?.total || 0,
      totalVideos: videosCount?.total || 0,
      totalEnrollments: enrollmentsCount?.total || 0,
      activeSessions: activeSessions?.count || 0,
      newSignupsToday: newSignupsToday?.count || 0
    };
    const recentEnrollments = await c.env.DB.prepare(
      "SELECT e.*, u.full_name as user_name, c.title as course_title FROM enrollments e LEFT JOIN users u ON e.user_id = u.id LEFT JOIN courses c ON e.course_id = c.id ORDER BY e.created_at DESC LIMIT 10"
    ).all().catch(() => ({ results: [] }));
    const popularCourses = await c.env.DB.prepare(
      "SELECT * FROM courses ORDER BY total_students DESC LIMIT 5"
    ).all().catch(() => ({ results: [] }));
    let recentLogs = [];
    try {
      const logsResult = await c.env.DB.prepare(
        "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10"
      ).all();
      recentLogs = logsResult.results || [];
    } catch {
    }
    return c.json({
      stats,
      recentEnrollments: recentEnrollments.results,
      popularCourses: popularCourses.results,
      recentLogs
    });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
analyticsRoutes.get("/charts", async (c) => {
  try {
    const now = /* @__PURE__ */ new Date();
    const monthNames = [];
    const monthStarts = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthNames.push(d.toLocaleString("en", { month: "short" }));
      monthStarts.push(d.toISOString().split("T")[0]);
    }
    const enrollmentTrend = [];
    for (let i = 0; i < 6; i++) {
      const nextMonth = i < 5 ? monthStarts[i + 1] : now.toISOString().split("T")[0];
      const result = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM enrollments WHERE created_at >= ? AND created_at < ?"
      ).bind(monthStarts[i], nextMonth).first().catch(() => ({ count: 0 }));
      enrollmentTrend.push({
        month: monthNames[i],
        enrollments: result?.count || 0
      });
    }
    const levelResult = await c.env.DB.prepare(
      "SELECT level, COUNT(*) as count FROM courses GROUP BY level"
    ).all().catch(() => ({ results: [] }));
    const levelMap = { beginner: 0, intermediate: 0, advanced: 0, expert: 0 };
    for (const row of levelResult.results) {
      const level = (row.level || "beginner").toLowerCase();
      if (levelMap[level] !== void 0) {
        levelMap[level] = row.count;
      } else {
        levelMap["beginner"] += row.count;
      }
    }
    const courseDistribution = Object.entries(levelMap).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
    const userGrowth = [];
    let cumulative = 0;
    for (let i = 0; i < 6; i++) {
      const nextMonth = i < 5 ? monthStarts[i + 1] : now.toISOString().split("T")[0];
      const result = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM users WHERE created_at >= ? AND created_at < ?"
      ).bind(monthStarts[i], nextMonth).first().catch(() => ({ count: 0 }));
      cumulative += result?.count || 0;
      userGrowth.push({ month: monthNames[i], users: cumulative });
    }
    const totalBeforeWindow = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM users WHERE created_at < ?`
    ).bind(monthStarts[0]).first().catch(() => ({ count: 0 }));
    const baseline = totalBeforeWindow?.count || 0;
    const userGrowthWithBaseline = [];
    let cum = baseline;
    for (let i = 0; i < 6; i++) {
      const nextMonth = i < 5 ? monthStarts[i + 1] : now.toISOString().split("T")[0];
      const result = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM users WHERE created_at >= ? AND created_at < ?"
      ).bind(monthStarts[i], nextMonth).first().catch(() => ({ count: 0 }));
      cum += result?.count || 0;
      userGrowthWithBaseline.push({ month: monthNames[i], users: cum });
    }
    return c.json({
      enrollmentTrend,
      courseDistribution,
      userGrowth: userGrowthWithBaseline
    });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var analytics_default = analyticsRoutes;

// src/routes/upload.ts
var uploadRoutes = new Hono2();
uploadRoutes.use("*", adminAuthMiddleware);
uploadRoutes.post("/", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file");
    const bucket = formData.get("bucket");
    const prefix = formData.get("prefix") || "";
    if (!file || !bucket) {
      return c.json({ error: "File and bucket are required" }, 400);
    }
    const arrayBuffer = await file.arrayBuffer();
    const key = prefix ? `${prefix}/${Date.now()}-${file.name}` : `${Date.now()}-${file.name}`;
    const r2Bucket = getBucketForType(bucket, c.env);
    await uploadFile(r2Bucket, key, arrayBuffer, file.type);
    const url = getPublicUrl(c.env, bucket, key);
    const user = c.get("user");
    await logAudit(c.env, user.id, "UPLOAD_FILE", "r2", key, {
      bucket,
      fileName: file.name,
      size: file.size
    });
    return c.json({ url, key, bucket });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
uploadRoutes.delete("/", async (c) => {
  try {
    const bucket = c.req.query("bucket");
    const key = c.req.query("key");
    if (!bucket || !key) {
      return c.json({ error: "Bucket and key are required" }, 400);
    }
    const r2Bucket = getBucketForType(bucket, c.env);
    await deleteFile(r2Bucket, key);
    const user = c.get("user");
    await logAudit(c.env, user.id, "DELETE_FILE", "r2", key, { bucket });
    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var upload_default = uploadRoutes;

// src/routes/email.ts
init_resend();
var emailRoutes = new Hono2();
emailRoutes.use("*", adminAuthMiddleware);
emailRoutes.post("/test", async (c) => {
  try {
    const { to } = await c.req.json();
    if (!to) {
      return c.json({ error: "Recipient email is required" }, 400);
    }
    const result = await sendTestEmail(c.env, to);
    const user = c.get("user");
    await logAudit(c.env, user.id, "SEND_TEST_EMAIL", "email", void 0, { to });
    return c.json({ success: true, emailId: result.id });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
emailRoutes.post("/custom", async (c) => {
  try {
    const { to, subject, html } = await c.req.json();
    if (!to || !subject || !html) {
      return c.json({ error: "Recipient, subject, and HTML body are required" }, 400);
    }
    const result = await sendEmail(c.env, to, subject, html);
    const user = c.get("user");
    await logAudit(c.env, user.id, "SEND_CUSTOM_EMAIL", "email", void 0, { to, subject });
    return c.json({ success: true, emailId: result.id });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
emailRoutes.post("/template", async (c) => {
  try {
    const { to, templateId, variables } = await c.req.json();
    if (!to || !templateId) {
      return c.json({ error: "Recipient and template ID are required" }, 400);
    }
    return c.json({ success: true, message: "Use /custom endpoint with pre-rendered template HTML" });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var email_default = emailRoutes;

// src/routes/admin.ts
var adminRoutes = new Hono2();
adminRoutes.use("*", adminAuthMiddleware);
adminRoutes.get("/audit", async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
    const offset = parseInt(c.req.query("offset") || "0");
    const action = c.req.query("action");
    let query = "SELECT id, action, resource_type, resource_id, user_id, user_email, details, created_at FROM audit_logs";
    const params = [];
    if (action) {
      query += " WHERE action = ?";
      params.push(action);
    }
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    let countQuery = "SELECT COUNT(*) as total FROM audit_logs";
    const countParams = [];
    if (action) {
      countQuery += " WHERE action = ?";
      countParams.push(action);
    }
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first();
    return c.json({
      logs: results,
      total: countResult?.total || 0,
      limit,
      offset
    });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
adminRoutes.delete("/sessions", async (c) => {
  try {
    const user = c.get("user");
    await c.env.DB.prepare(
      "UPDATE admin_sessions SET is_active = 0 WHERE is_active = 1"
    ).run();
    await logAudit(c.env, user.id, "CLEAR_SESSIONS", "admin", void 0, { action: "clear_all" });
    return c.json({ success: true, message: "All sessions cleared" });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var admin_default = adminRoutes;

// src/routes/coupons.ts
var couponRoutes = new Hono2();
couponRoutes.use("*", adminAuthMiddleware);
couponRoutes.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = (page - 1) * limit;
    const activeOnly = c.req.query("active") === "true";
    let query = "SELECT * FROM coupons";
    let countQuery = "SELECT COUNT(*) as total FROM coupons";
    const params = [];
    if (activeOnly) {
      query += " WHERE is_active = 1";
      countQuery += " WHERE is_active = 1";
    }
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();
    return c.json({ coupons: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
couponRoutes.post("/", async (c) => {
  try {
    const data = await c.req.json();
    const { code, discount_type, discount_value, max_discount, min_purchase, usage_limit, per_user_limit, valid_from, valid_until, applicable_courses, applicable_technologies } = data;
    if (!code || !discount_type || !discount_value || !valid_from || !valid_until) {
      return c.json({ error: "code, discount_type, discount_value, valid_from, valid_until required" }, 400);
    }
    const existing = await c.env.DB.prepare("SELECT id FROM coupons WHERE code = ?").bind(code).first();
    if (existing) {
      return c.json({ error: "Coupon code already exists" }, 400);
    }
    const user = c.get("user");
    const result = await c.env.DB.prepare(`
      INSERT INTO coupons (code, discount_type, discount_value, max_discount, min_purchase, usage_limit, per_user_limit, valid_from, valid_until, applicable_courses, applicable_technologies, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).bind(
      code,
      discount_type,
      discount_value,
      max_discount || null,
      min_purchase || 0,
      usage_limit || null,
      per_user_limit || 1,
      valid_from,
      valid_until,
      applicable_courses ? JSON.stringify(applicable_courses) : null,
      applicable_technologies ? JSON.stringify(applicable_technologies) : null,
      user.id
    ).run();
    await logAudit(c.env, user.id, "CREATE_COUPON", "coupons", String(result.meta?.last_row_id), data);
    return c.json({ success: true, message: "Coupon created successfully" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
couponRoutes.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const user = c.get("user");
    const updates = [];
    const params = [];
    const allowedFields = ["discount_type", "discount_value", "max_discount", "min_purchase", "usage_limit", "per_user_limit", "valid_from", "valid_until", "is_active"];
    for (const field of allowedFields) {
      if (data[field] !== void 0) {
        updates.push(`${field} = ?`);
        params.push(data[field]);
      }
    }
    if (data.applicable_courses !== void 0) {
      updates.push("applicable_courses = ?");
      params.push(JSON.stringify(data.applicable_courses));
    }
    if (data.applicable_technologies !== void 0) {
      updates.push("applicable_technologies = ?");
      params.push(JSON.stringify(data.applicable_technologies));
    }
    if (updates.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }
    updates.push("updated_at = datetime('now')");
    params.push(id);
    await c.env.DB.prepare(
      `UPDATE coupons SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    await logAudit(c.env, user.id, "UPDATE_COUPON", "coupons", id, data);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
couponRoutes.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user");
    await c.env.DB.prepare(
      "UPDATE coupons SET is_active = 0, updated_at = datetime('now') WHERE id = ?"
    ).bind(id).run();
    await logAudit(c.env, user.id, "DEACTIVATE_COUPON", "coupons", id);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
var coupons_default = couponRoutes;

// src/routes/discounts.ts
var discountRoutes = new Hono2();
discountRoutes.use("*", adminAuthMiddleware);
discountRoutes.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = (page - 1) * limit;
    const activeOnly = c.req.query("active") === "true";
    let query = "SELECT * FROM discounts";
    let countQuery = "SELECT COUNT(*) as total FROM discounts";
    const params = [];
    if (activeOnly) {
      query += " WHERE is_active = 1";
      countQuery += " WHERE is_active = 1";
    }
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();
    return c.json({ discounts: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
discountRoutes.post("/", async (c) => {
  try {
    const data = await c.req.json();
    const { name, name_bn, description, discount_type, discount_value, applicable_type, applicable_ids, valid_from, valid_until, is_auto_apply } = data;
    if (!name || !discount_type || !discount_value || !applicable_type || !valid_from || !valid_until) {
      return c.json({ error: "name, discount_type, discount_value, applicable_type, valid_from, valid_until required" }, 400);
    }
    const user = c.get("user");
    const result = await c.env.DB.prepare(`
      INSERT INTO discounts (name, name_bn, description, discount_type, discount_value, applicable_type, applicable_ids, valid_from, valid_until, is_auto_apply, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).bind(
      name,
      name_bn || null,
      description || null,
      discount_type,
      discount_value,
      applicable_type,
      applicable_ids ? JSON.stringify(applicable_ids) : null,
      valid_from,
      valid_until,
      is_auto_apply ? 1 : 0,
      user.id
    ).run();
    await logAudit(c.env, user.id, "CREATE_DISCOUNT", "discounts", String(result.meta?.last_row_id), data);
    return c.json({ success: true, message: "Discount created successfully" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
discountRoutes.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const user = c.get("user");
    const updates = [];
    const params = [];
    const allowedFields = ["name", "name_bn", "description", "discount_type", "discount_value", "applicable_type", "valid_from", "valid_until", "is_auto_apply", "is_active"];
    for (const field of allowedFields) {
      if (data[field] !== void 0) {
        updates.push(`${field} = ?`);
        params.push(data[field]);
      }
    }
    if (data.applicable_ids !== void 0) {
      updates.push("applicable_ids = ?");
      params.push(JSON.stringify(data.applicable_ids));
    }
    if (updates.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }
    updates.push("updated_at = datetime('now')");
    params.push(id);
    await c.env.DB.prepare(
      `UPDATE discounts SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    await logAudit(c.env, user.id, "UPDATE_DISCOUNT", "discounts", id, data);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
discountRoutes.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user");
    await c.env.DB.prepare(
      "UPDATE discounts SET is_active = 0, updated_at = datetime('now') WHERE id = ?"
    ).bind(id).run();
    await logAudit(c.env, user.id, "DEACTIVATE_DISCOUNT", "discounts", id);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
var discounts_default = discountRoutes;

// src/routes/events.ts
var eventRoutes = new Hono2();
eventRoutes.use("*", adminAuthMiddleware);
eventRoutes.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = (page - 1) * limit;
    const type = c.req.query("type");
    const activeOnly = c.req.query("active") === "true";
    let query = "SELECT * FROM events";
    let countQuery = "SELECT COUNT(*) as total FROM events";
    const params = [];
    const conditions = [];
    if (type) {
      conditions.push("event_type = ?");
      params.push(type);
    }
    if (activeOnly) {
      conditions.push("is_active = 1");
    }
    if (conditions.length > 0) {
      const whereClause = " WHERE " + conditions.join(" AND ");
      query += whereClause;
      countQuery += whereClause;
    }
    query += " ORDER BY start_date DESC LIMIT ? OFFSET ?";
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();
    return c.json({ events: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
eventRoutes.post("/", async (c) => {
  try {
    const data = await c.req.json();
    const { title, title_bn, description, description_bn, event_type, banner_url, start_date, end_date, is_featured, metadata } = data;
    if (!title || !event_type || !start_date) {
      return c.json({ error: "title, event_type, start_date required" }, 400);
    }
    const user = c.get("user");
    const result = await c.env.DB.prepare(`
      INSERT INTO events (title, title_bn, description, description_bn, event_type, banner_url, start_date, end_date, is_featured, metadata, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).bind(
      title,
      title_bn || null,
      description || null,
      description_bn || null,
      event_type,
      banner_url || null,
      start_date,
      end_date || null,
      is_featured ? 1 : 0,
      metadata ? JSON.stringify(metadata) : "{}",
      user.id
    ).run();
    await logAudit(c.env, user.id, "CREATE_EVENT", "events", String(result.meta?.last_row_id), data);
    return c.json({ success: true, message: "Event created successfully" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
eventRoutes.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const user = c.get("user");
    const updates = [];
    const params = [];
    const allowedFields = ["title", "title_bn", "description", "description_bn", "event_type", "banner_url", "start_date", "end_date", "is_featured", "is_active"];
    for (const field of allowedFields) {
      if (data[field] !== void 0) {
        updates.push(`${field} = ?`);
        params.push(data[field]);
      }
    }
    if (data.metadata !== void 0) {
      updates.push("metadata = ?");
      params.push(JSON.stringify(data.metadata));
    }
    if (updates.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }
    updates.push("updated_at = datetime('now')");
    params.push(id);
    await c.env.DB.prepare(
      `UPDATE events SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    await logAudit(c.env, user.id, "UPDATE_EVENT", "events", id, data);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
eventRoutes.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user");
    await c.env.DB.prepare(
      "UPDATE events SET is_active = 0, updated_at = datetime('now') WHERE id = ?"
    ).bind(id).run();
    await logAudit(c.env, user.id, "DELETE_EVENT", "events", id);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
eventRoutes.post("/:id/broadcast", async (c) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user");
    const event = await c.env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(id).first();
    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }
    const e = event;
    const result = await sendPushNotification(c.env, {
      title: e.title,
      titleBn: e.title_bn || e.title,
      message: e.description || "Check out this event!",
      messageBn: e.description_bn || e.description || "\u098F\u0987 \u0987\u09AD\u09C7\u09A8\u09CD\u099F\u099F\u09BF \u09A6\u09C7\u0996\u09C1\u09A8!",
      url: `/events/${id}`
    });
    await c.env.DB.prepare(`
      INSERT INTO notification_logs (type, category, title, message, target_type, sent_count, failed_count, metadata, created_by)
      VALUES ('push', 'event', ?, ?, 'all', ?, ?, ?, ?)
    `).bind(e.title, e.description || "", result.recipients, result.errors.length, JSON.stringify({ event_id: id }), user.id).run();
    await logAudit(c.env, user.id, "BROADCAST_EVENT", "events", id);
    return c.json({ success: result.success, recipients: result.recipients });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
var events_default = eventRoutes;

// src/routes/live-classes.ts
var liveClassRoutes = new Hono2();
liveClassRoutes.use("*", adminAuthMiddleware);
liveClassRoutes.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = (page - 1) * limit;
    const status = c.req.query("status");
    let query = "SELECT * FROM live_class_schedules";
    let countQuery = "SELECT COUNT(*) as total FROM live_class_schedules";
    const params = [];
    if (status) {
      query += " WHERE status = ?";
      countQuery += " WHERE status = ?";
      params.push(status);
    }
    query += " ORDER BY scheduled_at DESC LIMIT ? OFFSET ?";
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();
    return c.json({ liveClasses: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
liveClassRoutes.post("/", async (c) => {
  try {
    const data = await c.req.json();
    const { course_id, title, title_bn, description, instructor_id, technology_id, scheduled_at, duration_minutes, meeting_url, platform } = data;
    if (!title || !scheduled_at) {
      return c.json({ error: "title and scheduled_at required" }, 400);
    }
    const user = c.get("user");
    const result = await c.env.DB.prepare(`
      INSERT INTO live_class_schedules (course_id, title, title_bn, description, instructor_id, technology_id, scheduled_at, duration_minutes, meeting_url, platform, status, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', 1, ?)
    `).bind(
      course_id || null,
      title,
      title_bn || null,
      description || null,
      instructor_id || null,
      technology_id || null,
      scheduled_at,
      duration_minutes || 60,
      meeting_url || null,
      platform || "jitsi",
      user.id
    ).run();
    await logAudit(c.env, user.id, "CREATE_LIVE_CLASS", "live_classes", String(result.meta?.last_row_id), data);
    return c.json({ success: true, message: "Live class scheduled successfully" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
liveClassRoutes.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const user = c.get("user");
    const updates = [];
    const params = [];
    const allowedFields = ["course_id", "title", "title_bn", "description", "instructor_id", "technology_id", "scheduled_at", "duration_minutes", "meeting_url", "platform", "status", "recording_url", "is_active"];
    for (const field of allowedFields) {
      if (data[field] !== void 0) {
        updates.push(`${field} = ?`);
        params.push(data[field]);
      }
    }
    if (updates.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }
    updates.push("updated_at = datetime('now')");
    params.push(id);
    await c.env.DB.prepare(
      `UPDATE live_class_schedules SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    await logAudit(c.env, user.id, "UPDATE_LIVE_CLASS", "live_classes", id, data);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
liveClassRoutes.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user");
    await c.env.DB.prepare(`
      UPDATE live_class_schedules SET status = 'cancelled', is_active = 0, updated_at = datetime('now') WHERE id = ?
    `).bind(id).run();
    await logAudit(c.env, user.id, "CANCEL_LIVE_CLASS", "live_classes", id);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
var live_classes_default = liveClassRoutes;

// src/routes/payments.ts
var paymentRoutes = new Hono2();
paymentRoutes.use("*", adminAuthMiddleware);
paymentRoutes.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = (page - 1) * limit;
    const status = c.req.query("status");
    const gateway = c.req.query("gateway");
    let query = "SELECT * FROM payments";
    let countQuery = "SELECT COUNT(*) as total FROM payments";
    const params = [];
    const conditions = [];
    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }
    if (gateway) {
      conditions.push("gateway = ?");
      params.push(gateway);
    }
    if (conditions.length > 0) {
      const whereClause = " WHERE " + conditions.join(" AND ");
      query += whereClause;
      countQuery += whereClause;
    }
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();
    return c.json({ payments: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
paymentRoutes.put("/:id/verify", async (c) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user");
    const payment = await c.env.DB.prepare("SELECT * FROM payments WHERE id = ?").bind(id).first();
    if (!payment) {
      return c.json({ error: "Payment not found" }, 404);
    }
    const p = payment;
    if (p.status !== "pending") {
      return c.json({ error: "Payment is not in pending status" }, 400);
    }
    await c.env.DB.prepare(`
      UPDATE payments SET status = 'verified', verified_by = ?, verified_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
    `).bind(user.id, id).run();
    if (p.package_id) {
      const pkg = await c.env.DB.prepare("SELECT * FROM course_packages WHERE id = ?").bind(p.package_id).first();
      if (pkg) {
        const pkgData = pkg;
        const expiresAt = new Date(Date.now() + pkgData.duration_months * 30 * 24 * 60 * 60 * 1e3).toISOString();
        await c.env.DB.prepare(`
          INSERT INTO user_packages (user_id, package_id, course_id, package_type, activated_at, expires_at, status)
          VALUES (?, ?, ?, ?, datetime('now'), ?, 'active')
        `).bind(p.user_id, p.package_id, pkgData.course_id, pkgData.package_type, expiresAt).run();
        try {
          const existingEnrollment = await c.env.DB.prepare(
            "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?"
          ).bind(p.user_id, p.course_id).first();
          if (!existingEnrollment) {
            const enrollmentId = crypto.randomUUID();
            await c.env.DB.prepare(`
              INSERT INTO enrollments (id, user_id, course_id, package_id, expires_at, status, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
            `).bind(enrollmentId, p.user_id, p.course_id, p.package_id, expiresAt).run();
          } else {
            await c.env.DB.prepare(`
              UPDATE enrollments SET status = 'active', expires_at = ?, updated_at = datetime('now')
              WHERE user_id = ? AND course_id = ?
            `).bind(expiresAt, p.user_id, p.course_id).run();
          }
        } catch (enrollErr) {
          try {
            const existingEnrollment = await c.env.DB.prepare(
              "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?"
            ).bind(p.user_id, p.course_id).first();
            if (!existingEnrollment) {
              const enrollmentId = crypto.randomUUID();
              await c.env.DB.prepare(`
                INSERT INTO enrollments (id, user_id, course_id, progress, completed, created_at, updated_at)
                VALUES (?, ?, ?, 0, 0, datetime('now'), datetime('now'))
              `).bind(enrollmentId, p.user_id, p.course_id).run();
            }
          } catch (fallbackErr) {
            console.error("Failed to create enrollment on payment verify:", fallbackErr);
          }
        }
      }
    }
    await logAudit(c.env, user.id, "VERIFY_PAYMENT", "payments", id);
    return c.json({ success: true, message: "Payment verified and package activated" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
paymentRoutes.put("/:id/reject", async (c) => {
  try {
    const id = c.req.param("id");
    const { reason } = await c.req.json();
    const user = c.get("user");
    const payment = await c.env.DB.prepare("SELECT * FROM payments WHERE id = ?").bind(id).first();
    if (!payment) {
      return c.json({ error: "Payment not found" }, 404);
    }
    await c.env.DB.prepare(`
      UPDATE payments SET status = 'failed', metadata = ?, verified_by = ?, verified_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
    `).bind(JSON.stringify({ rejection_reason: reason || "Rejected by admin" }), user.id, id).run();
    await logAudit(c.env, user.id, "REJECT_PAYMENT", "payments", id, { reason });
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
paymentRoutes.put("/:id/refund", async (c) => {
  try {
    const id = c.req.param("id");
    const { reason } = await c.req.json();
    const user = c.get("user");
    const payment = await c.env.DB.prepare("SELECT * FROM payments WHERE id = ?").bind(id).first();
    if (!payment) {
      return c.json({ error: "Payment not found" }, 404);
    }
    const p = payment;
    if (p.gateway === "piprapay" && p.gateway_payment_id) {
      const { refundPipraPayPayment: refundPipraPayPayment2 } = await Promise.resolve().then(() => (init_payment(), payment_exports));
      const refundResult = await refundPipraPayPayment2(c.env, p.gateway_payment_id);
      if ("error" in refundResult) {
        return c.json({ error: `PipraPay refund failed: ${refundResult.error}` }, 400);
      }
    }
    await c.env.DB.prepare(`
      UPDATE payments SET status = 'refunded', metadata = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(JSON.stringify({ refund_reason: reason || "Refunded" }), id).run();
    if (p.package_id) {
      await c.env.DB.prepare(`
        UPDATE user_packages SET status = 'cancelled' WHERE user_id = ? AND package_id = ? AND status = 'active'
      `).bind(p.user_id, p.package_id).run();
    }
    await logAudit(c.env, user.id, "REFUND_PAYMENT", "payments", id, { reason });
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
paymentRoutes.get("/config", async (c) => {
  try {
    const result = await c.env.DB.prepare("SELECT * FROM payment_config").all();
    return c.json({ configs: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
paymentRoutes.put("/config/:gateway", async (c) => {
  try {
    const gateway = c.req.param("gateway");
    const data = await c.req.json();
    const user = c.get("user");
    if (!["manual", "sslcommerz", "bkash", "piprapay"].includes(gateway)) {
      return c.json({ error: "Invalid gateway. Use: manual, sslcommerz, bkash, piprapay" }, 400);
    }
    if (data.is_active === 1 && gateway !== "manual") {
      await c.env.DB.prepare("UPDATE payment_config SET is_active = 0 WHERE gateway != 'manual'").run();
    }
    const updates = [];
    const params = [];
    if (data.is_active !== void 0) {
      updates.push("is_active = ?");
      params.push(data.is_active);
    }
    if (data.config !== void 0) {
      updates.push("config = ?");
      params.push(JSON.stringify(data.config));
    }
    if (data.sandbox_mode !== void 0) {
      updates.push("sandbox_mode = ?");
      params.push(data.sandbox_mode);
    }
    if (data.instructions !== void 0) {
      updates.push("instructions = ?");
      params.push(data.instructions);
    }
    if (data.instructions_bn !== void 0) {
      updates.push("instructions_bn = ?");
      params.push(data.instructions_bn);
    }
    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      params.push(gateway);
      await c.env.DB.prepare(
        `UPDATE payment_config SET ${updates.join(", ")} WHERE gateway = ?`
      ).bind(...params).run();
    }
    await logAudit(c.env, user.id, "UPDATE_PAYMENT_CONFIG", "payment_config", void 0, { gateway, ...data });
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
paymentRoutes.get("/config/:gateway/setup-guide", async (c) => {
  const gateway = c.req.param("gateway");
  const guides = {
    manual: {
      title: "Manual Payment Setup Guide",
      titleBn: "\u09AE\u09CD\u09AF\u09BE\u09A8\u09C1\u09AF\u09BC\u09BE\u09B2 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B8\u09C7\u099F\u0986\u09AA \u0997\u09BE\u0987\u09A1",
      steps: [
        "Set your bKash/Nagad number in the Instructions field",
        "Students will see these instructions when paying",
        "Students submit Transaction ID after payment",
        "Admin verifies payment manually from the Payments section",
        "Once verified, course access is automatically granted"
      ],
      fields: [
        { key: "instructions", label: "Payment Instructions (English)", type: "textarea" },
        { key: "instructions_bn", label: "Payment Instructions (Bengali)", type: "textarea" }
      ]
    },
    sslcommerz: {
      title: "SSLCommerz Setup Guide",
      titleBn: "SSLCommerz \u09B8\u09C7\u099F\u0986\u09AA \u0997\u09BE\u0987\u09A1",
      steps: [
        "Register at https://developer.sslcommerz.com",
        "Get your Store ID and Store Password",
        "Enter credentials below and save",
        "Switch to Live mode when ready (set sandbox_mode = 0)",
        "Set callback URLs in SSLCommerz dashboard: https://dakkho-admin-api.dakkho-admin.workers.dev/api/payments/sslcommerz/callback"
      ],
      fields: [
        { key: "store_id", label: "Store ID", type: "text" },
        { key: "store_password", label: "Store Password", type: "password" },
        { key: "sandbox_mode", label: "Sandbox Mode", type: "toggle" }
      ]
    },
    bkash: {
      title: "bKash Payment Setup Guide",
      titleBn: "bKash \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B8\u09C7\u099F\u0986\u09AA \u0997\u09BE\u0987\u09A1",
      steps: [
        "Register at https://merchant.bkash.com",
        "Get Username, Password, App Key, App Secret",
        "Enter credentials below and save",
        "Switch to Live mode when ready",
        "Set callback URL in bKash dashboard: https://dakkho-admin-api.dakkho-admin.workers.dev/api/payments/bkash/callback"
      ],
      fields: [
        { key: "username", label: "Username", type: "text" },
        { key: "password", label: "Password", type: "password" },
        { key: "app_key", label: "App Key", type: "text" },
        { key: "app_secret", label: "App Secret", type: "password" },
        { key: "sandbox_mode", label: "Sandbox Mode", type: "toggle" }
      ]
    },
    piprapay: {
      title: "PipraPay Setup Guide",
      titleBn: "PipraPay \u09B8\u09C7\u099F\u0986\u09AA \u0997\u09BE\u0987\u09A1",
      steps: [
        "Register at https://piprapay.com",
        "Create a brand and get your API Key",
        "Set API Key in Cloudflare Worker environment variables (PIPRAPAY_API_KEY)",
        "Set Base URL in Cloudflare Worker environment variables (PIPRAPAY_BASE_URL)",
        "Activate PipraPay gateway below",
        "Set webhook URL in PipraPay dashboard: https://dakkho-admin-api.dakkho-admin.workers.dev/api/payments/piprapay/webhook",
        "Students will be redirected to PipraPay for automatic payment via bKash/Nagad/Rocket"
      ],
      fields: [
        { key: "api_key", label: "API Key (set in Cloudflare env)", type: "password" },
        { key: "base_url", label: "Base URL", type: "text" },
        { key: "sandbox_mode", label: "Sandbox Mode", type: "toggle" }
      ]
    }
  };
  const guide = guides[gateway];
  if (!guide) {
    return c.json({ error: "Invalid gateway" }, 400);
  }
  return c.json(guide);
});
var payments_default = paymentRoutes;

// src/routes/institute-requests.ts
var instituteRequestRoutes = new Hono2();
instituteRequestRoutes.use("*", adminAuthMiddleware);
instituteRequestRoutes.get("/", async (c) => {
  try {
    const status = c.req.query("status") || "all";
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = (page - 1) * limit;
    let query = "SELECT * FROM institute_requests";
    let countQuery = "SELECT COUNT(*) as total FROM institute_requests";
    const params = [];
    if (status !== "all") {
      query += " WHERE status = ?";
      countQuery += " WHERE status = ?";
      params.push(status);
    }
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();
    return c.json({ requests: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instituteRequestRoutes.post("/", async (c) => {
  try {
    const data = await c.req.json();
    const { user_id, user_email, user_name, institute_name, institute_name_bn, division, district } = data;
    if (!user_id || !institute_name) {
      return c.json({ error: "user_id and institute_name are required" }, 400);
    }
    const existing = await c.env.DB.prepare(
      "SELECT id FROM institutes WHERE name = ? AND is_active = 1"
    ).bind(institute_name).first();
    if (existing) {
      return c.json({ error: "This institute already exists in the system" }, 400);
    }
    const pendingRequest = await c.env.DB.prepare(
      "SELECT id FROM institute_requests WHERE institute_name = ? AND status = ?"
    ).bind(institute_name, "pending").first();
    if (pendingRequest) {
      return c.json({ error: "A request for this institute is already pending" }, 400);
    }
    const result = await c.env.DB.prepare(`
      INSERT INTO institute_requests (user_id, user_email, user_name, institute_name, institute_name_bn, division, district, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(user_id, user_email || null, user_name || null, institute_name, institute_name_bn || null, division || null, district || null).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "CREATE_INSTITUTE_REQUEST", "institute_requests", String(result.meta?.last_row_id), data);
    return c.json({ success: true, message: "Institute request submitted successfully" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instituteRequestRoutes.put("/:id/approve", async (c) => {
  try {
    const id = c.req.param("id");
    const admin = c.get("user");
    const request = await c.env.DB.prepare(
      "SELECT * FROM institute_requests WHERE id = ? AND status = ?"
    ).bind(id, "pending").first();
    if (!request) {
      return c.json({ error: "Pending request not found" }, 404);
    }
    const req = request;
    await c.env.DB.prepare(`
      INSERT INTO institutes (name, name_bn, division, district, type, is_requested, requested_by, approved_by, approved_at, is_active)
      VALUES (?, ?, ?, ?, 'polytechnic', 1, ?, ?, datetime('now'), 1)
    `).bind(req.institute_name, req.institute_name_bn, req.division, req.district, req.user_id, admin.id).run();
    await c.env.DB.prepare(`
      UPDATE institute_requests SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).bind(admin.id, id).run();
    await logAudit(c.env, admin.id, "APPROVE_INSTITUTE_REQUEST", "institute_requests", id);
    try {
      const tokens = await getUserPushTokens(c.env, req.user_id);
      if (tokens.length > 0) {
        await sendPushNotification(c.env, {
          title: "Institute Request Approved!",
          titleBn: "\u0987\u09A8\u09B8\u09CD\u099F\u09BF\u099F\u09BF\u0989\u099F \u0985\u09A8\u09C1\u09B0\u09CB\u09A7 \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09BF\u09A4!",
          message: `Your request for "${req.institute_name}" has been approved.`,
          messageBn: `"${req.institute_name}" \u098F\u09B0 \u099C\u09A8\u09CD\u09AF \u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09A8\u09C1\u09B0\u09CB\u09A7 \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09BF\u09A4 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964`,
          targetPlayerIds: tokens
        });
      }
    } catch {
    }
    return c.json({ success: true, message: "Institute request approved and added to institutes" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
instituteRequestRoutes.put("/:id/reject", async (c) => {
  try {
    const id = c.req.param("id");
    const { admin_note } = await c.req.json();
    const admin = c.get("user");
    const request = await c.env.DB.prepare(
      "SELECT * FROM institute_requests WHERE id = ? AND status = ?"
    ).bind(id, "pending").first();
    if (!request) {
      return c.json({ error: "Pending request not found" }, 404);
    }
    const req = request;
    await c.env.DB.prepare(`
      UPDATE institute_requests SET status = 'rejected', admin_note = ?, reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).bind(admin_note || null, admin.id, id).run();
    await logAudit(c.env, admin.id, "REJECT_INSTITUTE_REQUEST", "institute_requests", id);
    try {
      const tokens = await getUserPushTokens(c.env, req.user_id);
      if (tokens.length > 0) {
        await sendPushNotification(c.env, {
          title: "Institute Request Update",
          titleBn: "\u0987\u09A8\u09B8\u09CD\u099F\u09BF\u099F\u09BF\u0989\u099F \u0985\u09A8\u09C1\u09B0\u09CB\u09A7 \u0986\u09AA\u09A1\u09C7\u099F",
          message: `Your request for "${req.institute_name}" was not approved. ${admin_note || ""}`,
          messageBn: `"${req.institute_name}" \u098F\u09B0 \u0985\u09A8\u09C1\u09B0\u09CB\u09A7 \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09BF\u09A4 \u09B9\u09AF\u09BC\u09A8\u09BF\u0964 ${admin_note || ""}`,
          targetPlayerIds: tokens
        });
      }
    } catch {
    }
    return c.json({ success: true, message: "Institute request rejected" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
var institute_requests_default = instituteRequestRoutes;

// src/lib/student-auth.ts
async function validateStudentSession(env, token) {
  try {
    const session = await env.DB.prepare(
      "SELECT user_id, email, name, expires_at, is_active FROM student_sessions WHERE id = ? AND is_active = 1"
    ).bind(token).first();
    if (!session) {
      return { authorized: false };
    }
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < /* @__PURE__ */ new Date()) {
      await env.DB.prepare(
        "UPDATE student_sessions SET is_active = 0 WHERE id = ?"
      ).bind(token).run();
      return { authorized: false };
    }
    let emailVerified = false;
    try {
      const user = await env.DB.prepare(
        "SELECT email_verified FROM users WHERE id = ?"
      ).bind(session.user_id).first();
      if (user) {
        emailVerified = !!user.email_verified;
      }
    } catch {
    }
    return {
      authorized: true,
      userId: session.user_id,
      email: session.email,
      name: session.name || void 0,
      emailVerified
    };
  } catch (error) {
    console.error("Student session validation error:", error);
    return { authorized: false };
  }
}
async function createStudentSession(env, userId, email) {
  const sessionId = generateId();
  const expiresAt = getSessionExpiry(30);
  await env.DB.prepare(
    `INSERT INTO student_sessions (id, user_id, email, expires_at, is_active, created_at)
     VALUES (?, ?, ?, ?, 1, datetime('now'))`
  ).bind(sessionId, userId, email, expiresAt).run();
  return sessionId;
}
async function deleteStudentSession(env, token) {
  try {
    await env.DB.prepare(
      "UPDATE student_sessions SET is_active = 0 WHERE id = ?"
    ).bind(token).run();
    return true;
  } catch {
    return false;
  }
}

// src/lib/student-auth-middleware.ts
async function studentAuthMiddleware(c, next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized \u2014 login required" }, 401);
  }
  const token = authHeader.substring(7);
  const result = await validateStudentSession(c.env, token);
  if (!result.authorized) {
    return c.json({ error: "Session expired \u2014 please login again" }, 401);
  }
  if (!result.emailVerified) {
    return c.json({ error: "Email verification required", code: "EMAIL_NOT_VERIFIED" }, 403);
  }
  c.set("studentId", result.userId);
  c.set("studentEmail", result.email || "");
  c.set("studentName", result.name || "");
  await next();
}

// src/routes/student-api.ts
var studentApiRoutes = new Hono2();
async function getStudentAuth(c) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authorized: false };
  }
  const token = authHeader.substring(7);
  const result = await validateStudentSession(c.env, token);
  return result;
}
async function getStudentUserDoc(env, userId) {
  try {
    const user = await env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(userId).first();
    return user;
  } catch {
    return null;
  }
}
async function getInstituteName(env, instituteId) {
  if (!instituteId) return null;
  try {
    const inst = await env.DB.prepare(
      "SELECT name FROM institutes WHERE id = ?"
    ).bind(instituteId).first();
    return inst?.name || null;
  } catch {
    return null;
  }
}
async function getTechnologyName(env, shortCode) {
  if (!shortCode) return null;
  try {
    const tech = await env.DB.prepare(
      "SELECT name FROM technologies WHERE short_code = ?"
    ).bind(shortCode).first();
    return tech?.name || null;
  } catch {
    return null;
  }
}
function transformConfigForStudent(config) {
  return {
    contentProtection: config.contentProtection,
    features: config.featureToggles,
    ui: {
      homeSections: config.homePageSections.sections,
      sidebarSections: config.sidebarVisibility,
      bottomNavTabs: config.bottomNavTabs.tabs.filter((t) => t.enabled).sort((a, b) => a.order - b.order).map((t) => t.id),
      topBarElements: config.topBarElements,
      cardStyle: config.cardStyle
    }
  };
}
studentApiRoutes.get("/config", async (c) => {
  try {
    const cachedConfig = await c.env.KV_CONFIG.get("server_config", "json");
    if (cachedConfig) {
      const config2 = cachedConfig;
      return c.json({ config: transformConfigForStudent(config2) });
    }
    const { results } = await c.env.DB.prepare(
      "SELECT key, value FROM app_config"
    ).all();
    const configMap = {};
    for (const row of results) {
      try {
        configMap[row.key] = JSON.parse(row.value);
      } catch {
        configMap[row.key] = row.value;
      }
    }
    const config = {
      featureToggles: { ...DEFAULT_CONFIG.featureToggles, ...configMap.featureToggles },
      homePageSections: configMap.homePageSections || DEFAULT_CONFIG.homePageSections,
      sidebarVisibility: { ...DEFAULT_CONFIG.sidebarVisibility, ...configMap.sidebarVisibility },
      bottomNavTabs: configMap.bottomNavTabs || DEFAULT_CONFIG.bottomNavTabs,
      topBarElements: { ...DEFAULT_CONFIG.topBarElements, ...configMap.topBarElements },
      cardStyle: configMap.cardStyle || DEFAULT_CONFIG.cardStyle,
      contentProtection: { ...DEFAULT_CONFIG.contentProtection, ...configMap.contentProtection }
    };
    await c.env.KV_CONFIG.put("server_config", JSON.stringify(config), { expirationTtl: 300 });
    return c.json({ config: transformConfigForStudent(config) });
  } catch (error) {
    return c.json({ config: transformConfigForStudent(DEFAULT_CONFIG) });
  }
});
studentApiRoutes.get("/config/payment", async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT id, gateway, is_active, instructions, instructions_bn, sandbox_mode FROM payment_config WHERE is_active = 1"
    ).all();
    return c.json({ paymentConfig: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/institutes", async (c) => {
  try {
    const division = c.req.query("division");
    const search = c.req.query("search");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = (page - 1) * limit;
    let query = "SELECT * FROM institutes WHERE is_active = 1";
    let countQuery = "SELECT COUNT(*) as total FROM institutes WHERE is_active = 1";
    const params = [];
    if (division) {
      query += " AND division = ?";
      countQuery += " AND division = ?";
      params.push(division);
    }
    if (search) {
      query += " AND (name LIKE ? OR name_bn LIKE ?)";
      countQuery += " AND (name LIKE ? OR name_bn LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    query += " ORDER BY is_requested ASC, name ASC LIMIT ? OFFSET ?";
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();
    return c.json({ institutes: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/institutes/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const result = await c.env.DB.prepare(
      "SELECT * FROM institutes WHERE id = ? AND is_active = 1"
    ).bind(id).first();
    if (!result) {
      return c.json({ error: "Institute not found" }, 404);
    }
    return c.json({ institute: result });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/technologies", async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT * FROM technologies WHERE is_active = 1 ORDER BY name ASC"
    ).all();
    return c.json({ technologies: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/events", async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT * FROM events WHERE is_active = 1 AND end_date >= date('now') ORDER BY start_date ASC"
    ).all();
    return c.json({ events: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/live-classes", async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT * FROM live_class_schedules WHERE is_active = 1 AND status IN ('scheduled', 'live') ORDER BY scheduled_at ASC"
    ).all();
    return c.json({ liveClasses: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/coupons/validate", async (c) => {
  try {
    const code = c.req.query("code");
    if (!code) {
      return c.json({ error: "Coupon code required" }, 400);
    }
    const coupon = await c.env.DB.prepare(
      "SELECT * FROM coupons WHERE code = ? AND is_active = 1"
    ).bind(code).first();
    if (!coupon) {
      return c.json({ valid: false, error: "Invalid coupon code" }, 404);
    }
    const cp = coupon;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (cp.valid_from > now || cp.valid_until < now) {
      return c.json({ valid: false, error: "Coupon has expired or is not yet active" });
    }
    if (cp.usage_limit && cp.usage_count >= cp.usage_limit) {
      return c.json({ valid: false, error: "Coupon usage limit reached" });
    }
    return c.json({
      valid: true,
      coupon: {
        code: cp.code,
        discount_type: cp.discount_type,
        discount_value: cp.discount_value,
        max_discount: cp.max_discount,
        min_purchase: cp.min_purchase
      }
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/course-packages", async (c) => {
  try {
    const courseId = c.req.query("courseId");
    if (!courseId) {
      return c.json({ error: "courseId required" }, 400);
    }
    const course = await c.env.DB.prepare(
      "SELECT id, price FROM courses WHERE id = ? AND is_published = 1"
    ).bind(courseId).first();
    if (!course) {
      return c.json({ packages: [] });
    }
    let result = await c.env.DB.prepare(
      "SELECT * FROM course_packages WHERE course_id = ? AND is_active = 1 ORDER BY price ASC"
    ).bind(courseId).all();
    if (course.price > 0) {
      const existingTypes = new Set(result.results.map((p) => p.package_type));
      let needsRefetch = false;
      if (!existingTypes.has("single")) {
        await c.env.DB.prepare(`
          INSERT INTO course_packages (course_id, package_type, price, duration_months, max_users, is_auto_assign, is_active, display_name, description)
          VALUES (?, 'single', ?, 6, 1, 1, 1, 'Single', '1 \u099C\u09A8 \u0987\u0989\u099C\u09BE\u09B0\u09C7\u09B0 \u099C\u09A8\u09CD\u09AF')
        `).bind(courseId, course.price).run();
        needsRefetch = true;
      }
      if (!existingTypes.has("dual")) {
        const duoPrice = Math.round(course.price * 1.15);
        await c.env.DB.prepare(`
          INSERT INTO course_packages (course_id, package_type, price, duration_months, max_users, is_auto_assign, is_active, display_name, description)
          VALUES (?, 'dual', ?, 6, 2, 1, 1, 'Duo', '2 \u099C\u09A8 \u0987\u0989\u099C\u09BE\u09B0\u09C7\u09B0 \u099C\u09A8\u09CD\u09AF \u2014 \u09AC\u09A8\u09CD\u09A7\u09C1\u0995\u09C7 \u09B6\u09C7\u09AF\u09BC\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8!')
        `).bind(courseId, duoPrice).run();
        needsRefetch = true;
      }
      if (needsRefetch) {
        result = await c.env.DB.prepare(
          'SELECT * FROM course_packages WHERE course_id = ? AND is_active = 1 AND package_type IN ("single", "dual") ORDER BY price ASC'
        ).bind(courseId).all();
      }
    }
    const filteredPackages = result.results.filter((p) => p.package_type === "single" || p.package_type === "dual");
    return c.json({ packages: filteredPackages });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/packages/mine", async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const result = await c.env.DB.prepare(`
      SELECT up.*, cp.package_type, cp.price, cp.duration_months, cp.course_id, cp.max_users,
             c.title as course_title, c.thumbnail_url as course_thumbnail
      FROM user_packages up
      JOIN course_packages cp ON up.package_id = cp.id
      LEFT JOIN courses c ON cp.course_id = c.id
      WHERE up.user_id = ?
      ORDER BY up.activated_at DESC
    `).bind(auth.userId).all();
    return c.json({ packages: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/users/lookup", async (c) => {
  try {
    const email = c.req.query("email");
    if (!email) {
      return c.json({ error: "email query parameter required" }, 400);
    }
    const user = await c.env.DB.prepare(
      "SELECT id, full_name, email, institute_id, technology, avatar_url FROM users WHERE email = ? AND is_active = 1"
    ).bind(email).first();
    if (!user) {
      return c.json({ found: false, user: null });
    }
    const u = user;
    const instituteName = await getInstituteName(c.env, u.institute_id || null);
    return c.json({
      found: true,
      user: {
        id: u.id,
        name: u.full_name,
        email: u.email,
        technology: u.technology || null,
        instituteName: instituteName || null,
        avatarUrl: u.avatar_url || null
      }
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/courses", async (c) => {
  try {
    const technology = c.req.query("technology") || "";
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = parseInt(c.req.query("offset") || "0");
    const search = c.req.query("search") || "";
    const level = c.req.query("level") || "";
    let where = "WHERE is_published = 1";
    const params = [];
    if (technology) {
      where += " AND technology_id = ?";
      params.push(technology);
    }
    if (search) {
      where += " AND title LIKE ?";
      params.push(`%${search}%`);
    }
    if (level) {
      where += " AND level = ?";
      params.push(level);
    }
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM courses ${where}`
    ).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(
      `SELECT * FROM courses ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();
    const enrichedCourses = await Promise.all(result.results.map(async (course) => {
      try {
        const vidStats = await c.env.DB.prepare(
          "SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total_duration FROM videos WHERE course_id = ?"
        ).bind(course.id).first();
        const vc = vidStats?.count || 0;
        const td = vidStats?.total_duration || 0;
        const avg = vc > 0 ? Math.round(td / vc * 10) / 10 : 0;
        return { ...course, duration: avg, total_videos: vc, total_video_duration: td };
      } catch {
        return course;
      }
    }));
    return c.json({ courses: enrichedCourses, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/courses/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const course = await c.env.DB.prepare(
      "SELECT * FROM courses WHERE id = ? AND is_published = 1"
    ).bind(id).first();
    if (!course) {
      return c.json({ error: "Course not found" }, 404);
    }
    let instructors = [];
    try {
      const instResult = await c.env.DB.prepare(
        "SELECT i.* FROM instructors i JOIN course_instructors ci ON i.id = ci.instructor_id WHERE ci.course_id = ? ORDER BY ci.sort_order ASC"
      ).bind(id).all();
      instructors = instResult.results;
    } catch {
    }
    let learningPoints = [];
    try {
      const lpResult = await c.env.DB.prepare(
        "SELECT id, point_text, sort_order FROM course_learning_points WHERE course_id = ? ORDER BY sort_order ASC"
      ).bind(id).all();
      learningPoints = lpResult.results;
    } catch {
    }
    let subjects = [];
    try {
      const subResult = await c.env.DB.prepare(
        "SELECT s.* FROM subjects s JOIN course_subjects cs ON s.id = cs.subject_id WHERE cs.course_id = ? ORDER BY cs.sort_order ASC"
      ).bind(id).all();
      subjects = subResult.results;
    } catch {
    }
    let videoStats = null;
    try {
      videoStats = await c.env.DB.prepare(
        "SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total_duration FROM videos WHERE course_id = ?"
      ).bind(id).first();
    } catch {
    }
    const videoCount = videoStats?.count || 0;
    const totalDuration = videoStats?.total_duration || 0;
    const avgDuration = videoCount > 0 ? Math.round(totalDuration / videoCount * 10) / 10 : 0;
    return c.json({
      course: {
        ...course,
        duration: avgDuration,
        total_videos: videoCount,
        total_video_duration: totalDuration
      },
      instructors,
      learningPoints,
      subjects
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/courses/:id/curriculum", async (c) => {
  try {
    const id = c.req.param("id");
    const course = await c.env.DB.prepare(
      "SELECT id FROM courses WHERE id = ? AND is_published = 1"
    ).bind(id).first();
    if (!course) {
      return c.json({ error: "Course not found" }, 404);
    }
    let subjects = [];
    try {
      const subResult = await c.env.DB.prepare(
        "SELECT s.* FROM subjects s JOIN course_subjects cs ON s.id = cs.subject_id WHERE cs.course_id = ? ORDER BY cs.sort_order ASC"
      ).bind(id).all();
      subjects = subResult.results;
    } catch {
    }
    let chapters = [];
    try {
      const chapResult = await c.env.DB.prepare(
        "SELECT * FROM chapters WHERE course_id = ? ORDER BY subject_id, sort_order ASC"
      ).bind(id).all();
      chapters = chapResult.results;
    } catch {
    }
    let lessons = [];
    try {
      const lesResult = await c.env.DB.prepare(
        "SELECT * FROM lessons WHERE course_id = ? ORDER BY chapter_id, sort_order ASC"
      ).bind(id).all();
      lessons = lesResult.results;
    } catch {
    }
    let videos = [];
    try {
      const vidResult = await c.env.DB.prepare(
        "SELECT * FROM videos WHERE course_id = ? ORDER BY sort_order ASC"
      ).bind(id).all();
      videos = vidResult.results;
    } catch {
    }
    let learningPoints = [];
    try {
      const lpResult = await c.env.DB.prepare(
        "SELECT id, point_text, sort_order FROM course_learning_points WHERE course_id = ? ORDER BY sort_order ASC"
      ).bind(id).all();
      learningPoints = lpResult.results;
    } catch {
    }
    return c.json({
      subjects,
      chapters,
      lessons,
      videos,
      learningPoints
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/courses/:id/videos", async (c) => {
  try {
    const id = c.req.param("id");
    const limit = parseInt(c.req.query("limit") || "100");
    const offset = parseInt(c.req.query("offset") || "0");
    const auth = await getStudentAuth(c);
    let isEnrolled = false;
    if (auth.authorized && auth.userId) {
      const enrollment = await c.env.DB.prepare(
        "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?"
      ).bind(auth.userId, id).first();
      isEnrolled = !!enrollment;
    }
    const countResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as total FROM videos WHERE course_id = ?"
    ).bind(id).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(
      "SELECT * FROM videos WHERE course_id = ? ORDER BY sort_order ASC LIMIT ? OFFSET ?"
    ).bind(id, limit, offset).all();
    const videos = result.results.map((video) => {
      if (!isEnrolled && !video.is_preview) {
        return {
          ...video,
          stream_url: null,
          is_locked: true
        };
      }
      return { ...video, is_locked: false };
    });
    return c.json({ videos, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/instructors", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = parseInt(c.req.query("offset") || "0");
    const search = c.req.query("search") || "";
    let where = "WHERE is_active = 1";
    const params = [];
    if (search) {
      where += " AND name LIKE ?";
      params.push(`%${search}%`);
    }
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM instructors ${where}`
    ).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(
      `SELECT * FROM instructors ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();
    return c.json({ instructors: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/instructors/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const instructor = await c.env.DB.prepare(
      "SELECT * FROM instructors WHERE id = ? AND is_active = 1"
    ).bind(id).first();
    if (!instructor) {
      return c.json({ error: "Instructor not found" }, 404);
    }
    return c.json({ instructor });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/instructors/:id/courses", async (c) => {
  try {
    const instructorId = c.req.param("id");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = parseInt(c.req.query("offset") || "0");
    const instructor = await c.env.DB.prepare(
      "SELECT id FROM instructors WHERE id = ? AND is_active = 1"
    ).bind(instructorId).first();
    if (!instructor) {
      return c.json({ error: "Instructor not found" }, 404);
    }
    const result = await c.env.DB.prepare(
      "SELECT * FROM courses WHERE instructor_id = ? AND is_published = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).bind(instructorId, limit, offset).all();
    const countResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as total FROM courses WHERE instructor_id = ? AND is_published = 1"
    ).bind(instructorId).first();
    const total = countResult?.total || 0;
    return c.json({ courses: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/video/stream-url", async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: "Unauthorized \u2014 login required to stream videos" }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: "Email verification required", code: "EMAIL_NOT_VERIFIED" }, 403);
    }
    const key = c.req.query("key");
    const bucket = c.req.query("bucket") || "videos";
    if (!key) {
      return c.json({ error: "key parameter required" }, 400);
    }
    const r2Bucket = getBucketForType(bucket, c.env);
    const fileInfo = await r2Bucket.head(key);
    if (!fileInfo) {
      return c.json({ error: "Video not found" }, 404);
    }
    if (auth.userId) {
      const video = await c.env.DB.prepare(
        "SELECT course_id, is_preview FROM videos WHERE video_url = ? OR id = ? LIMIT 1"
      ).bind(key, key).first();
      if (video) {
        const enrollment = await c.env.DB.prepare(
          "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?"
        ).bind(auth.userId, video.course_id).first();
        if (!enrollment && !video.is_preview) {
          return c.json({ error: "Not enrolled in this course" }, 403);
        }
      }
    }
    const url = getPublicUrl(c.env, bucket, key);
    return c.json({ url });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.post("/auth/signup", async (c) => {
  try {
    const { fullName, email, password, instituteId, technology } = await c.req.json();
    if (!fullName || !email || !password) {
      return c.json({ error: "fullName, email, and password are required" }, 400);
    }
    if (password.length < 8) {
      return c.json({ error: "Password must be at least 8 characters" }, 400);
    }
    const existing = await c.env.DB.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).bind(email).first();
    if (existing) {
      return c.json({ error: "An account with this email already exists" }, 400);
    }
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    await c.env.DB.prepare(`
      INSERT INTO users (id, email, full_name, institute_id, technology, role, email_verified, is_active, enrolled_course_ids, password_hash)
      VALUES (?, ?, ?, ?, ?, 'student', 0, 1, '[]', ?)
    `).bind(userId, email, fullName, instituteId || null, technology || null, passwordHash).run();
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO user_preferences (user_id, theme_mode, accent_color, font_size, border_radius, compact_mode)
      VALUES (?, 'system', '#0ea5e9', 16, 16, 0)
    `).bind(userId).run();
    await c.env.DB.prepare(
      "INSERT OR IGNORE INTO notification_preferences (user_id) VALUES (?)"
    ).bind(userId).run();
    const rateLimit = await checkDailyEmailRateLimit(c.env.DB, email);
    if (!rateLimit.allowed) {
      return c.json({ error: `Too many verification emails. You can send up to ${rateLimit.limit} emails per day. Please try again tomorrow.`, code: "RATE_LIMITED" }, 429);
    }
    const verifyOtp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1e3).toISOString();
    await c.env.DB.prepare(
      "INSERT INTO password_reset_otps (email, otp, purpose, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)"
    ).bind(email, verifyOtp, "email_verification", otpExpiresAt, (/* @__PURE__ */ new Date()).toISOString()).run();
    try {
      const { sendEmail: sendEmail2 } = await Promise.resolve().then(() => (init_resend(), resend_exports));
      await sendEmail2(c.env, email, "DAKKHO \u2014 Verify Your Email Address", `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0ea5e9; font-size: 28px; margin: 0;">DAKKHO</h1>
            <p style="color: #64748b; margin: 4px 0 0;">Bangladesh's Premier Polytechnic Platform</p>
          </div>
          <div style="background: #f8fafc; border-radius: 16px; padding: 32px; text-align: center;">
            <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 8px;">Welcome to DAKKHO, ${fullName}!</h2>
            <p style="color: #334155; font-size: 16px; margin: 0 0 24px;">Please verify your email address to get started.</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0ea5e9; background: white; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 16px; display: inline-block;">
              ${verifyOtp}
            </div>
            <p style="color: #64748b; font-size: 14px; margin: 16px 0 0;">This code expires in 10 minutes.</p>
            <p style="color: #94a3b8; font-size: 13px; margin: 8px 0 0;">If you did not create an account, please ignore this email.</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Sent from DAKKHO \u2014 Bangladesh's Premier Polytechnic Student Platform<br />
            noreply@dakkho.pro.bd
          </p>
        </div>
      `);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError.message);
    }
    const instituteName = await getInstituteName(c.env, instituteId || null);
    const technologyName = await getTechnologyName(c.env, technology || null);
    const token = await createStudentSession(c.env, userId, email);
    return c.json({
      success: true,
      token,
      userId,
      user: {
        id: userId,
        name: fullName,
        email,
        instituteId: instituteId || null,
        instituteName: instituteName || null,
        technology: technology || null,
        technologyName: technologyName || null,
        emailVerified: false,
        packages: [],
        themeMode: "system"
      }
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.post("/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }
    const user = await c.env.DB.prepare(
      "SELECT id, email, full_name, role, password_hash, institute_id, technology, email_verified, is_active FROM users WHERE email = ? AND is_active = 1"
    ).bind(email).first();
    if (!user) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    if (user.role === "admin" || user.role === "super_admin") {
      return c.json({ error: "Admin accounts cannot login here. Use the admin panel." }, 403);
    }
    let userPackages = [];
    try {
      const pkgResult = await c.env.DB.prepare(
        "SELECT up.*, cp.package_type, cp.price, cp.duration_months FROM user_packages up JOIN course_packages cp ON up.package_id = cp.id WHERE up.user_id = ? AND up.status = 'active' ORDER BY up.activated_at DESC"
      ).bind(user.id).all();
      userPackages = pkgResult.results;
    } catch {
    }
    let themeMode = "system";
    try {
      const prefs = await c.env.DB.prepare(
        "SELECT theme_mode FROM user_preferences WHERE user_id = ?"
      ).bind(user.id).first();
      if (prefs && prefs.theme_mode) {
        themeMode = prefs.theme_mode;
      }
    } catch {
    }
    const instituteName = await getInstituteName(c.env, user.institute_id || null);
    const technologyName = await getTechnologyName(c.env, user.technology || null);
    await c.env.DB.prepare("DELETE FROM student_sessions WHERE user_id = ?").bind(user.id).run();
    const token = await createStudentSession(c.env, user.id, user.email);
    return c.json({
      success: true,
      token,
      userId: user.id,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        instituteId: user.institute_id || null,
        instituteName: instituteName || null,
        technology: user.technology || null,
        technologyName: technologyName || null,
        emailVerified: !!user.email_verified,
        packages: userPackages,
        themeMode
      }
    });
  } catch (error) {
    const msg = getErrorMessage(error);
    return c.json({ error: msg.includes("Invalid") ? msg : "Invalid email or password" }, 401);
  }
});
studentApiRoutes.post("/auth/logout", async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ success: true });
    }
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.substring(7) || "";
    await deleteStudentSession(c.env, token);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/auth/me", async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const userDoc = await getStudentUserDoc(c.env, auth.userId);
    let userPackages = [];
    try {
      const pkgResult = await c.env.DB.prepare(
        "SELECT up.*, cp.package_type, cp.price, cp.duration_months FROM user_packages up JOIN course_packages cp ON up.package_id = cp.id WHERE up.user_id = ? AND up.status = 'active' ORDER BY up.activated_at DESC"
      ).bind(auth.userId).all();
      userPackages = pkgResult.results;
    } catch {
    }
    const u = userDoc;
    let themeMode = "system";
    try {
      const prefs = await c.env.DB.prepare(
        "SELECT theme_mode FROM user_preferences WHERE user_id = ?"
      ).bind(auth.userId).first();
      if (prefs && prefs.theme_mode) {
        themeMode = prefs.theme_mode;
      }
    } catch {
    }
    const instituteName = await getInstituteName(c.env, u?.institute_id || null);
    const technologyName = await getTechnologyName(c.env, u?.technology || null);
    return c.json({
      user: {
        id: auth.userId,
        name: u?.full_name || auth.name || "",
        email: auth.email || u?.email || "",
        phone: u?.phone || null,
        bio: u?.bio || null,
        semester: u?.semester || null,
        instituteId: u?.institute_id || null,
        instituteName: instituteName || null,
        technology: u?.technology || null,
        technologyName: technologyName || null,
        emailVerified: !!u?.email_verified,
        avatarUrl: u?.avatar_url || "",
        role: u?.role || "student",
        isActive: u?.is_active !== void 0 ? !!u?.is_active : true,
        packages: userPackages,
        themeMode
      }
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.post("/auth/verify-otp", async (c) => {
  try {
    const { email, otp } = await c.req.json();
    if (!email || !otp) {
      return c.json({ error: "email and otp are required" }, 400);
    }
    const otpRecord = await c.env.DB.prepare(
      "SELECT * FROM password_reset_otps WHERE email = ? AND otp = ? AND purpose = ? AND used = 0 ORDER BY created_at DESC LIMIT 1"
    ).bind(email, otp, "email_verification").first();
    if (!otpRecord) {
      const anyOtpRecord = await c.env.DB.prepare(
        "SELECT id, email, otp, purpose, used, expires_at FROM password_reset_otps WHERE email = ? AND otp = ? ORDER BY created_at DESC LIMIT 1"
      ).bind(email, otp).first();
      if (anyOtpRecord) {
        console.log(`OTP verify failed: email=${email}, otp=${otp}, found_purpose=${anyOtpRecord.purpose}, found_used=${anyOtpRecord.used}, expected_purpose=email_verification, expected_used=0`);
      } else {
        console.log(`OTP verify failed: no record found for email=${email}, otp=${otp}`);
      }
      return c.json({ success: false, message: "Invalid or expired OTP" }, 400);
    }
    if (new Date(otpRecord.expires_at) < /* @__PURE__ */ new Date()) {
      await c.env.DB.prepare(
        "UPDATE password_reset_otps SET used = 1 WHERE id = ?"
      ).bind(otpRecord.id).run();
      return c.json({ success: false, message: "OTP has expired. Please request a new one." }, 400);
    }
    await c.env.DB.prepare(
      "UPDATE password_reset_otps SET used = 1 WHERE id = ?"
    ).bind(otpRecord.id).run();
    const session = await c.env.DB.prepare(
      "SELECT user_id FROM student_sessions WHERE email = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1"
    ).bind(email).first();
    if (session?.user_id) {
      await c.env.DB.prepare(
        "UPDATE users SET email_verified = 1 WHERE id = ?"
      ).bind(session.user_id).run();
    } else {
      await c.env.DB.prepare(
        "UPDATE users SET email_verified = 1 WHERE email = ?"
      ).bind(email).run();
    }
    return c.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/auth/otp-cooldown", async (c) => {
  try {
    const email = c.req.query("email");
    if (!email) {
      return c.json({ error: "email query parameter is required" }, 400);
    }
    const lastOtp = await c.env.DB.prepare(
      "SELECT created_at FROM password_reset_otps WHERE email = ? ORDER BY created_at DESC LIMIT 1"
    ).bind(email).first();
    if (!lastOtp || !lastOtp.created_at) {
      return c.json({ cooldownSeconds: 0 });
    }
    const RESEND_COOLDOWN_SECONDS = 60;
    const sentAt = new Date(lastOtp.created_at).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - sentAt) / 1e3);
    const remaining = Math.max(0, RESEND_COOLDOWN_SECONDS - elapsed);
    return c.json({ cooldownSeconds: remaining });
  } catch (error) {
    return c.json({ cooldownSeconds: 0 });
  }
});
function generateOTP() {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const num = bytes[0] << 16 | bytes[1] << 8 | bytes[2];
  return (num % 1e6).toString().padStart(6, "0");
}
async function sendPasswordResetEmail(env, to, otp) {
  const { sendEmail: sendEmail2 } = await Promise.resolve().then(() => (init_resend(), resend_exports));
  await sendEmail2(
    env,
    to,
    "DAKKHO \u2014 Password Reset Code",
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #0ea5e9; font-size: 28px; margin: 0;">DAKKHO</h1>
        <p style="color: #64748b; margin: 4px 0 0;">Password Reset</p>
      </div>
      <div style="background: #f8fafc; border-radius: 16px; padding: 32px; text-align: center;">
        <p style="color: #334155; font-size: 16px; margin: 0 0 16px;">Your password reset code is:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0ea5e9; background: white; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 16px; display: inline-block;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 14px; margin: 16px 0 0;">This code expires in 5 minutes.</p>
        <p style="color: #94a3b8; font-size: 13px; margin: 8px 0 0;">If you did not request a password reset, please ignore this email.</p>
      </div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">
        Sent from DAKKHO \u2014 Bangladesh's Premier Polytechnic Student Platform<br />
        Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}
      </p>
    </div>
    `
  );
}
studentApiRoutes.put("/auth/profile", async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const body = await c.req.json();
    const { fullName, instituteId, technology, bio, phone, semester, avatarUrl } = body;
    const updates = [];
    const params = [];
    if (fullName !== void 0) {
      updates.push("full_name = ?");
      params.push(fullName);
    }
    if (instituteId !== void 0) {
      updates.push("institute_id = ?");
      params.push(instituteId);
    }
    if (technology !== void 0) {
      updates.push("technology = ?");
      params.push(technology);
    }
    if (bio !== void 0) {
      updates.push("bio = ?");
      params.push(bio);
    }
    if (phone !== void 0) {
      updates.push("phone = ?");
      params.push(phone);
    }
    if (semester !== void 0) {
      updates.push("semester = ?");
      params.push(semester);
    }
    if (avatarUrl !== void 0) {
      updates.push("avatar_url = ?");
      params.push(avatarUrl);
    }
    if (updates.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }
    updates.push("updated_at = datetime('now')");
    params.push(auth.userId);
    await c.env.DB.prepare(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    const updatedUser = await getStudentUserDoc(c.env, auth.userId);
    const u = updatedUser;
    const updatedInstituteName = await getInstituteName(c.env, u?.institute_id || null);
    const updatedTechnologyName = await getTechnologyName(c.env, u?.technology || null);
    return c.json({
      success: true,
      user: {
        id: auth.userId,
        name: u?.full_name || "",
        email: u?.email || auth.email || "",
        phone: u?.phone || null,
        bio: u?.bio || null,
        semester: u?.semester || null,
        instituteId: u?.institute_id || null,
        instituteName: updatedInstituteName || null,
        technology: u?.technology || null,
        technologyName: updatedTechnologyName || null,
        emailVerified: !!u?.email_verified,
        avatarUrl: u?.avatar_url || ""
      }
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.post("/auth/forgot-password", async (c) => {
  try {
    const { email } = await c.req.json();
    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }
    const user = await c.env.DB.prepare(
      "SELECT id FROM users WHERE email = ? AND is_active = 1"
    ).bind(email).first();
    if (user) {
      const rateLimit = await checkDailyEmailRateLimit(c.env.DB, email);
      if (!rateLimit.allowed) {
        return c.json({ success: true, message: "If an account exists with this email, a reset code has been sent." });
      }
      await c.env.DB.prepare(
        "DELETE FROM password_reset_otps WHERE email = ? AND used = 0 AND purpose = ?"
      ).bind(email, "password_reset").run();
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1e3).toISOString();
      await c.env.DB.prepare(
        "INSERT INTO password_reset_otps (email, otp, purpose, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)"
      ).bind(email, otp, "password_reset", expiresAt, (/* @__PURE__ */ new Date()).toISOString()).run();
      try {
        await sendPasswordResetEmail(c.env, email, otp);
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
      }
    }
    return c.json({ success: true, message: "If an account exists with this email, a reset code has been sent." });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.post("/auth/reset-password", async (c) => {
  try {
    const { email, otp, newPassword } = await c.req.json();
    if (!email || !otp || !newPassword) {
      return c.json({ error: "email, otp, and newPassword are required" }, 400);
    }
    if (newPassword.length < 8) {
      return c.json({ error: "Password must be at least 8 characters" }, 400);
    }
    const otpRecord = await c.env.DB.prepare(
      "SELECT id, otp, expires_at, used FROM password_reset_otps WHERE email = ? AND purpose = ? AND used = 0 ORDER BY created_at DESC LIMIT 1"
    ).bind(email, "password_reset").first();
    if (!otpRecord) {
      return c.json({ error: "Invalid or expired reset code. Please request a new one." }, 400);
    }
    if (new Date(otpRecord.expires_at) < /* @__PURE__ */ new Date()) {
      await c.env.DB.prepare(
        "UPDATE password_reset_otps SET used = 1 WHERE id = ?"
      ).bind(otpRecord.id).run();
      return c.json({ error: "Reset code has expired. Please request a new one." }, 400);
    }
    if (otpRecord.otp !== otp) {
      return c.json({ error: "Invalid reset code. Please try again." }, 400);
    }
    await c.env.DB.prepare(
      "UPDATE password_reset_otps SET used = 1 WHERE id = ?"
    ).bind(otpRecord.id).run();
    const newPasswordHash = await hashPassword(newPassword);
    await c.env.DB.prepare(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE email = ?"
    ).bind(newPasswordHash, email).run();
    await c.env.DB.prepare(
      "UPDATE student_sessions SET is_active = 0 WHERE email = ?"
    ).bind(email).run();
    return c.json({ success: true, message: "Password has been reset successfully." });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
var EMAIL_OTP_DAILY_LIMIT = 10;
async function checkDailyEmailRateLimit(db, email) {
  try {
    const now = /* @__PURE__ */ new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1e3).toISOString();
    const result = await db.prepare(
      "SELECT created_at FROM password_reset_otps WHERE email = ?"
    ).bind(email).all();
    const recentCount = result.results.filter((row) => {
      if (!row.created_at) return false;
      try {
        return new Date(row.created_at) >= new Date(twentyFourHoursAgo);
      } catch {
        return false;
      }
    }).length;
    return { allowed: recentCount < EMAIL_OTP_DAILY_LIMIT, count: recentCount, limit: EMAIL_OTP_DAILY_LIMIT };
  } catch {
    return { allowed: true, count: 0, limit: EMAIL_OTP_DAILY_LIMIT };
  }
}
studentApiRoutes.post("/auth/resend-otp", async (c) => {
  try {
    const { email } = await c.req.json();
    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }
    const user = await c.env.DB.prepare(
      "SELECT id FROM users WHERE email = ? AND is_active = 1"
    ).bind(email).first();
    if (user) {
      const userForPurpose = await c.env.DB.prepare(
        "SELECT email_verified FROM users WHERE email = ?"
      ).bind(email).first();
      const resendPurpose = userForPurpose && !userForPurpose.email_verified ? "email_verification" : "password_reset";
      const lastOtp = await c.env.DB.prepare(
        "SELECT created_at FROM password_reset_otps WHERE email = ? ORDER BY created_at DESC LIMIT 1"
      ).bind(email).first();
      if (lastOtp?.created_at) {
        const lastSentAt = new Date(lastOtp.created_at).getTime();
        const elapsedSec = Math.floor((Date.now() - lastSentAt) / 1e3);
        if (elapsedSec < 60) {
          return c.json({
            error: `Please wait ${60 - elapsedSec} seconds before requesting a new code.`,
            code: "COOLDOWN_ACTIVE",
            cooldownSeconds: 60 - elapsedSec
          }, 429);
        }
      }
      const rateLimit = await checkDailyEmailRateLimit(c.env.DB, email);
      if (!rateLimit.allowed) {
        return c.json({
          error: `Too many verification emails. You can send up to ${rateLimit.limit} emails per day. Please try again tomorrow.`,
          code: "RATE_LIMITED"
        }, 429);
      }
      await c.env.DB.prepare(
        "DELETE FROM password_reset_otps WHERE email = ? AND used = 0 AND purpose = ?"
      ).bind(email, resendPurpose).run();
      const otp = generateOTP();
      const expiryMinutes = resendPurpose === "email_verification" ? 10 : 5;
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1e3).toISOString();
      await c.env.DB.prepare(
        "INSERT INTO password_reset_otps (email, otp, purpose, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)"
      ).bind(email, otp, resendPurpose, expiresAt, (/* @__PURE__ */ new Date()).toISOString()).run();
      try {
        if (resendPurpose === "email_verification") {
          const { sendEmail: sendEmail2 } = await Promise.resolve().then(() => (init_resend(), resend_exports));
          await sendEmail2(c.env, email, "DAKKHO \u2014 Your Verification Code", `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0ea5e9; font-size: 28px; margin: 0;">DAKKHO</h1>
                <p style="color: #64748b; margin: 4px 0 0;">Email Verification</p>
              </div>
              <div style="background: #f8fafc; border-radius: 16px; padding: 32px; text-align: center;">
                <p style="color: #334155; font-size: 16px; margin: 0 0 16px;">Your email verification code is:</p>
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0ea5e9; background: white; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 16px; display: inline-block;">
                  ${otp}
                </div>
                <p style="color: #64748b; font-size: 14px; margin: 16px 0 0;">This code expires in ${expiryMinutes} minutes.</p>
                <p style="color: #94a3b8; font-size: 13px; margin: 8px 0 0;">If you did not request this, please ignore this email.</p>
              </div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                Sent from DAKKHO \u2014 Bangladesh's Premier Polytechnic Student Platform<br />
                noreply@dakkho.pro.bd
              </p>
            </div>
          `);
        } else {
          await sendPasswordResetEmail(c.env, email, otp);
        }
      } catch (emailError) {
        console.error("Failed to resend OTP email:", emailError);
      }
    }
    return c.json({ success: true, message: "If an account exists, a new code has been sent." });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.post("/institutes/requests", async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: "Email verification required", code: "EMAIL_NOT_VERIFIED" }, 403);
    }
    const data = await c.req.json();
    const { institute_name, institute_name_bn, division, district } = data;
    if (!institute_name) {
      return c.json({ error: "Institute name required" }, 400);
    }
    const existing = await c.env.DB.prepare(
      "SELECT id FROM institutes WHERE name = ? AND is_active = 1"
    ).bind(institute_name).first();
    if (existing) {
      return c.json({ error: "This institute already exists" }, 400);
    }
    const pending = await c.env.DB.prepare(
      "SELECT id FROM institute_requests WHERE institute_name = ? AND status = 'pending'"
    ).bind(institute_name).first();
    if (pending) {
      return c.json({ error: "A request for this institute is already pending" }, 400);
    }
    await c.env.DB.prepare(`
      INSERT INTO institute_requests (user_id, user_email, user_name, institute_name, institute_name_bn, division, district, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(auth.userId, auth.email, auth.name || null, institute_name, institute_name_bn || null, division || null, district || null).run();
    return c.json({ success: true, message: "Institute request submitted" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/institutes/requests/mine", async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: "Email verification required", code: "EMAIL_NOT_VERIFIED" }, 403);
    }
    const result = await c.env.DB.prepare(
      "SELECT * FROM institute_requests WHERE user_id = ? ORDER BY created_at DESC"
    ).bind(auth.userId).all();
    return c.json({ requests: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.post("/push/register", async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: "Email verification required", code: "EMAIL_NOT_VERIFIED" }, 403);
    }
    const { push_token, device_type, device_info } = await c.req.json();
    if (!push_token) {
      return c.json({ error: "push_token required" }, 400);
    }
    await registerPushToken(c.env, auth.userId, push_token, device_type, device_info);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.delete("/push/unregister", async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: "Email verification required", code: "EMAIL_NOT_VERIFIED" }, 403);
    }
    const { push_token } = await c.req.json();
    if (!push_token) {
      return c.json({ error: "push_token required" }, 400);
    }
    await unregisterPushToken(c.env, push_token);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/push/vapid-key", async (c) => {
  try {
    const publicKey = c.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return c.json({ error: "Web push not configured" }, 503);
    }
    return c.json({ publicKey });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.post("/push/subscribe", async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: "Email verification required", code: "EMAIL_NOT_VERIFIED" }, 403);
    }
    const { subscription } = await c.req.json();
    if (!subscription || !subscription.endpoint) {
      return c.json({ error: "subscription object with endpoint required" }, 400);
    }
    const subscriptionJson = JSON.stringify(subscription);
    const deviceType = "webpush";
    await env_push_upsert(c.env, auth.userId, subscription.endpoint, subscriptionJson, deviceType);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
async function env_push_upsert(env, userId, endpoint, subscriptionJson, deviceType) {
  const existing = await env.DB.prepare(
    "SELECT id FROM user_push_tokens WHERE user_id = ? AND push_token = ?"
  ).bind(userId, endpoint).first();
  if (existing) {
    await env.DB.prepare(
      "UPDATE user_push_tokens SET device_info = ?, is_active = 1, updated_at = datetime('now') WHERE user_id = ? AND push_token = ?"
    ).bind(subscriptionJson, userId, endpoint).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO user_push_tokens (id, user_id, push_token, device_type, device_info, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
    `).bind(generateId(), userId, endpoint, deviceType, subscriptionJson).run();
  }
}
studentApiRoutes.post("/payments/submit", async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: "Email verification required", code: "EMAIL_NOT_VERIFIED" }, 403);
    }
    const { package_id, trx_id, phone, proof_url, duoMemberEmail } = await c.req.json();
    if (!package_id || !trx_id) {
      return c.json({ error: "package_id and trx_id required" }, 400);
    }
    const pkg = await c.env.DB.prepare(
      "SELECT * FROM course_packages WHERE id = ? AND is_active = 1"
    ).bind(package_id).first();
    if (!pkg) {
      return c.json({ error: "Package not found" }, 404);
    }
    const p = pkg;
    const submitMetadata = JSON.stringify({ duoMemberEmail: duoMemberEmail || null });
    await c.env.DB.prepare(`
      INSERT INTO payments (user_id, package_id, course_id, amount, currency, gateway, trx_id_submitted, phone_submitted, proof_url, status, metadata)
      VALUES (?, ?, ?, ?, 'BDT', 'manual', ?, ?, ?, 'pending', ?)
    `).bind(auth.userId, package_id, p.course_id, p.price, trx_id, phone || null, proof_url || null, submitMetadata).run();
    return c.json({ success: true, message: "Payment submitted for verification" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
async function autoActivatePackage(env, userId, packageId, courseId) {
  const pkg = await env.DB.prepare("SELECT * FROM course_packages WHERE id = ?").bind(packageId).first();
  if (pkg) {
    const pkgData = pkg;
    const expiresAt = new Date(Date.now() + pkgData.duration_months * 30 * 24 * 60 * 60 * 1e3).toISOString();
    await env.DB.prepare(`
      INSERT INTO user_packages (user_id, package_id, course_id, package_type, activated_at, expires_at, status)
      VALUES (?, ?, ?, ?, datetime('now'), ?, 'active')
    `).bind(userId, packageId, courseId, pkgData.package_type, expiresAt).run();
    try {
      const existingEnrollment = await env.DB.prepare(
        "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?"
      ).bind(userId, courseId).first();
      if (!existingEnrollment) {
        const enrollmentId = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO enrollments (id, user_id, course_id, package_id, expires_at, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
        `).bind(enrollmentId, userId, courseId, packageId, expiresAt).run();
      } else {
        await env.DB.prepare(`
          UPDATE enrollments SET status = 'active', expires_at = ?, updated_at = datetime('now')
          WHERE user_id = ? AND course_id = ?
        `).bind(expiresAt, userId, courseId).run();
      }
    } catch (enrollErr) {
      try {
        const existingEnrollment = await env.DB.prepare(
          "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?"
        ).bind(userId, courseId).first();
        if (!existingEnrollment) {
          const enrollmentId = crypto.randomUUID();
          await env.DB.prepare(`
            INSERT INTO enrollments (id, user_id, course_id, progress, completed, created_at, updated_at)
            VALUES (?, ?, ?, 0, 0, datetime('now'), datetime('now'))
          `).bind(enrollmentId, userId, courseId).run();
        }
      } catch (fallbackErr) {
        console.error("Failed to create enrollment:", fallbackErr);
      }
    }
  }
}
studentApiRoutes.post("/payments/create", async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: "Email verification required", code: "EMAIL_NOT_VERIFIED" }, 403);
    }
    const { packageId, couponCode, duoMemberEmail } = await c.req.json();
    if (!packageId) {
      return c.json({ error: "packageId is required" }, 400);
    }
    const pipraPayConfig = await c.env.DB.prepare(
      "SELECT * FROM payment_config WHERE gateway = 'piprapay' AND is_active = 1"
    ).first();
    if (!pipraPayConfig) {
      return c.json({ error: "PipraPay payment is not available right now. Please use manual payment." }, 400);
    }
    const pkg = await c.env.DB.prepare(
      "SELECT * FROM course_packages WHERE id = ? AND is_active = 1"
    ).bind(packageId).first();
    if (!pkg) {
      return c.json({ error: "Package not found" }, 404);
    }
    const p = pkg;
    let finalAmount = p.price;
    if (couponCode) {
      const coupon = await c.env.DB.prepare(
        "SELECT * FROM coupons WHERE code = ? AND is_active = 1"
      ).bind(couponCode).first();
      if (coupon) {
        const cp = coupon;
        const now = (/* @__PURE__ */ new Date()).toISOString();
        if (cp.valid_from <= now && cp.valid_until >= now) {
          if (!cp.usage_limit || cp.usage_count < cp.usage_limit) {
            if (cp.discount_type === "percentage") {
              const discount = finalAmount * (cp.discount_value / 100);
              finalAmount = Math.max(0, finalAmount - (cp.max_discount ? Math.min(discount, cp.max_discount) : discount));
            } else if (cp.discount_type === "flat") {
              finalAmount = Math.max(0, finalAmount - cp.discount_value);
            }
            await c.env.DB.prepare(
              "UPDATE coupons SET usage_count = usage_count + 1 WHERE code = ?"
            ).bind(couponCode).run();
          }
        }
      }
    }
    const userDoc = await getStudentUserDoc(c.env, auth.userId);
    const u = userDoc;
    const fullName = u?.full_name || auth.name || "Student";
    const email = u?.email || auth.email || "";
    const phone = u?.phone || "";
    const paymentResult = await c.env.DB.prepare(`
      INSERT INTO payments (user_id, package_id, course_id, amount, currency, gateway, status, metadata)
      VALUES (?, ?, ?, ?, 'BDT', 'piprapay', 'pending', ?)
    `).bind(
      auth.userId,
      packageId,
      p.course_id,
      finalAmount,
      JSON.stringify({ couponCode: couponCode || null, originalPrice: p.price, discountedPrice: finalAmount, duoMemberEmail: duoMemberEmail || null })
    ).run();
    const paymentRow = await c.env.DB.prepare(
      "SELECT id FROM payments WHERE user_id = ? AND gateway = ? AND status = ? ORDER BY created_at DESC LIMIT 1"
    ).bind(auth.userId, "piprapay", "pending").first();
    const paymentId = paymentRow?.id;
    const { createPipraPayPayment: createPipraPayPayment2 } = await Promise.resolve().then(() => (init_payment(), payment_exports));
    const returnUrl = `https://dakkho-student.pages.dev/payment-result?pp_id={pp_id}&payment_id=${paymentId}`;
    const webhookUrl = `https://dakkho-admin-api.dakkho-admin.workers.dev/api/payments/piprapay/webhook`;
    const result = await createPipraPayPayment2(c.env, {
      full_name: fullName,
      email_address: email,
      mobile_number: phone || "0000000000",
      amount: finalAmount,
      currency: "BDT",
      return_url: returnUrl,
      webhook_url: webhookUrl,
      metadata: {
        user_id: auth.userId,
        package_id: packageId,
        course_id: p.course_id,
        payment_id: paymentId,
        duo_member_email: duoMemberEmail || null
      }
    });
    if ("error" in result) {
      await c.env.DB.prepare(
        "UPDATE payments SET status = 'failed', metadata = ? WHERE id = ?"
      ).bind(JSON.stringify({ error: result.error }), paymentId).run();
      return c.json({ error: result.error }, 400);
    }
    await c.env.DB.prepare(
      "UPDATE payments SET gateway_payment_id = ?, gateway_trx_id = ? WHERE id = ?"
    ).bind(result.pp_id, result.pp_id, paymentId).run();
    return c.json({
      success: true,
      pp_id: result.pp_id,
      pp_url: result.pp_url,
      payment_id: paymentId
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.post("/payments/verify", async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const { pp_id } = await c.req.json();
    if (!pp_id) {
      return c.json({ error: "pp_id is required" }, 400);
    }
    const payment = await c.env.DB.prepare(
      "SELECT * FROM payments WHERE gateway_payment_id = ? OR gateway_trx_id = ? ORDER BY created_at DESC LIMIT 1"
    ).bind(pp_id, pp_id).first();
    if (!payment) {
      return c.json({ error: "Payment not found" }, 404);
    }
    const p = payment;
    if (p.status === "verified") {
      return c.json({
        status: "completed",
        amount: p.amount,
        gateway: p.gateway,
        transaction_id: p.gateway_trx_id,
        enrolled_course_id: p.course_id
      });
    }
    const { verifyPipraPayPayment: verifyPipraPayPayment2 } = await Promise.resolve().then(() => (init_payment(), payment_exports));
    const result = await verifyPipraPayPayment2(c.env, pp_id);
    if ("error" in result) {
      return c.json({
        status: "error",
        amount: p.amount,
        gateway: p.gateway,
        transaction_id: p.gateway_trx_id,
        message: result.error
      });
    }
    const mappedStatus = result.status?.toLowerCase();
    if (mappedStatus === "completed" && p.status !== "verified") {
      await c.env.DB.prepare(`
        UPDATE payments SET status = 'verified', gateway_trx_id = ?, verified_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
      `).bind(pp_id, p.id).run();
      if (p.package_id && p.course_id) {
        await autoActivatePackage(c.env, p.user_id, p.package_id, p.course_id);
      }
      return c.json({
        status: "completed",
        amount: p.amount,
        gateway: p.gateway,
        transaction_id: pp_id,
        enrolled_course_id: p.course_id
      });
    } else if (mappedStatus === "failed") {
      await c.env.DB.prepare(
        "UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE id = ?"
      ).bind(p.id).run();
      return c.json({
        status: "failed",
        amount: p.amount,
        gateway: p.gateway,
        transaction_id: pp_id,
        message: "Payment was not completed successfully."
      });
    } else {
      return c.json({
        status: "pending",
        amount: p.amount,
        gateway: p.gateway,
        transaction_id: pp_id,
        message: "Payment is still being processed."
      });
    }
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.post("/payments/piprapay/webhook", async (c) => {
  try {
    const rawBody = await c.req.text();
    const signatureHeader = c.req.header("hh_signature");
    const { verifyPipraPayWebhookSignature: verifyPipraPayWebhookSignature2 } = await Promise.resolve().then(() => (init_payment(), payment_exports));
    const sigResult = await verifyPipraPayWebhookSignature2(c.env, rawBody, signatureHeader);
    if (!sigResult.valid) {
      console.warn("PipraPay webhook signature invalid:", sigResult.reason);
      return c.json({ error: "Invalid signature" }, 403);
    }
    if (sigResult.reason) {
      console.warn("PipraPay webhook signature warning:", sigResult.reason);
    }
    const body = JSON.parse(rawBody);
    const { pp_id, status, amount, currency, payment_method, metadata } = body;
    if (!pp_id || !status) {
      return c.json({ error: "Invalid webhook payload" }, 400);
    }
    const payment = await c.env.DB.prepare(
      "SELECT * FROM payments WHERE gateway_payment_id = ? OR gateway_trx_id = ? ORDER BY created_at DESC LIMIT 1"
    ).bind(pp_id, pp_id).first();
    if (!payment) {
      if (metadata?.payment_id) {
        const altPayment = await c.env.DB.prepare(
          "SELECT * FROM payments WHERE id = ?"
        ).bind(metadata.payment_id).first();
        if (altPayment) {
          const ap = altPayment;
          if (ap.status === "verified" || ap.status === "refunded") {
            return c.json({ success: true, message: "Already processed" });
          }
          const mappedStatus2 = status?.toLowerCase();
          if (mappedStatus2 === "completed") {
            await c.env.DB.prepare(`
              UPDATE payments SET status = 'verified', gateway_payment_id = ?, gateway_trx_id = ?, verified_at = datetime('now'), updated_at = datetime('now')
              WHERE id = ?
            `).bind(pp_id, pp_id, ap.id).run();
            if (ap.package_id && ap.course_id) {
              await autoActivatePackage(c.env, ap.user_id, ap.package_id, ap.course_id);
            }
          } else if (mappedStatus2 === "failed") {
            await c.env.DB.prepare(
              "UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE id = ?"
            ).bind(ap.id).run();
          } else if (mappedStatus2 === "refunded") {
            await c.env.DB.prepare(`
              UPDATE payments SET status = 'refunded', updated_at = datetime('now') WHERE id = ?
            `).bind(ap.id).run();
            if (ap.package_id) {
              await c.env.DB.prepare(`
                UPDATE user_packages SET status = 'cancelled' WHERE user_id = ? AND package_id = ? AND status = 'active'
              `).bind(ap.user_id, ap.package_id).run();
            }
          }
          return c.json({ success: true });
        }
      }
      return c.json({ error: "Payment not found" }, 404);
    }
    const p = payment;
    if (p.status === "verified" || p.status === "refunded") {
      return c.json({ success: true, message: "Already processed" });
    }
    const mappedStatus = status?.toLowerCase();
    if (mappedStatus === "completed") {
      await c.env.DB.prepare(`
        UPDATE payments SET status = 'verified', gateway_payment_id = ?, gateway_trx_id = ?, verified_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).bind(pp_id, pp_id, p.id).run();
      if (p.package_id && p.course_id) {
        await autoActivatePackage(c.env, p.user_id, p.package_id, p.course_id);
      }
    } else if (mappedStatus === "failed") {
      await c.env.DB.prepare(
        "UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE id = ?"
      ).bind(p.id).run();
    } else if (mappedStatus === "refunded") {
      await c.env.DB.prepare(
        "UPDATE payments SET status = 'refunded', updated_at = datetime('now') WHERE id = ?"
      ).bind(p.id).run();
      if (p.package_id) {
        await c.env.DB.prepare(`
          UPDATE user_packages SET status = 'cancelled' WHERE user_id = ? AND package_id = ? AND status = 'active'
        `).bind(p.user_id, p.package_id).run();
      }
    }
    return c.json({ success: true });
  } catch (error) {
    console.error("PipraPay webhook error:", error);
    return c.json({ success: true, error: "Internal error" });
  }
});
studentApiRoutes.get("/settings", async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: "Unauthorized \u2014 login required" }, 401);
    }
    const userId = auth.userId;
    let prefs = await c.env.DB.prepare(
      "SELECT * FROM notification_preferences WHERE user_id = ?"
    ).bind(userId).first();
    if (!prefs) {
      await c.env.DB.prepare(
        "INSERT OR IGNORE INTO notification_preferences (user_id) VALUES (?)"
      ).bind(userId).run();
      prefs = await c.env.DB.prepare(
        "SELECT * FROM notification_preferences WHERE user_id = ?"
      ).bind(userId).first();
    }
    if (!prefs) {
      return c.json({
        preferences: {
          pushEnabled: true,
          emailEnabled: true,
          smsEnabled: false,
          quietHoursEnabled: false,
          quietHoursStart: "22:00",
          quietHoursEnd: "08:00",
          courseUpdates: { push: true, email: true },
          grades: { push: true, email: true },
          schedule: { push: true, email: true },
          payment: { push: true, email: true },
          promotions: { push: false, email: false },
          social: { push: true, email: false },
          system: { push: true, email: true }
        }
      });
    }
    const p = prefs;
    return c.json({
      preferences: {
        pushEnabled: !!p.push_enabled,
        emailEnabled: !!p.email_enabled,
        smsEnabled: !!p.sms_enabled,
        quietHoursEnabled: !!p.quiet_hours_enabled,
        quietHoursStart: p.quiet_hours_start || "22:00",
        quietHoursEnd: p.quiet_hours_end || "08:00",
        courseUpdates: { push: !!p.course_updates_push, email: !!p.course_updates_email },
        grades: { push: !!p.grades_push, email: !!p.grades_email },
        schedule: { push: !!p.schedule_push, email: !!p.schedule_email },
        payment: { push: !!p.payment_push, email: !!p.payment_email },
        promotions: { push: !!p.promotions_push, email: !!p.promotions_email },
        social: { push: !!p.social_push, email: !!p.social_email },
        system: { push: !!p.system_push, email: !!p.system_email }
      }
    });
  } catch (error) {
    console.error("GET /settings error:", getErrorMessage(error));
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.put("/settings", async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: "Unauthorized \u2014 login required" }, 401);
    }
    const userId = auth.userId;
    const prefs = await c.req.json();
    await c.env.DB.prepare(`
      INSERT INTO notification_preferences (
        user_id, push_enabled, email_enabled, sms_enabled,
        quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
        course_updates_push, course_updates_email,
        grades_push, grades_email,
        schedule_push, schedule_email,
        payment_push, payment_email,
        promotions_push, promotions_email,
        social_push, social_email,
        system_push, system_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        push_enabled = excluded.push_enabled,
        email_enabled = excluded.email_enabled,
        sms_enabled = excluded.sms_enabled,
        quiet_hours_enabled = excluded.quiet_hours_enabled,
        quiet_hours_start = excluded.quiet_hours_start,
        quiet_hours_end = excluded.quiet_hours_end,
        course_updates_push = excluded.course_updates_push,
        course_updates_email = excluded.course_updates_email,
        grades_push = excluded.grades_push,
        grades_email = excluded.grades_email,
        schedule_push = excluded.schedule_push,
        schedule_email = excluded.schedule_email,
        payment_push = excluded.payment_push,
        payment_email = excluded.payment_email,
        promotions_push = excluded.promotions_push,
        promotions_email = excluded.promotions_email,
        social_push = excluded.social_push,
        social_email = excluded.social_email,
        system_push = excluded.system_push,
        system_email = excluded.system_email,
        updated_at = datetime('now')
    `).bind(
      userId,
      prefs.pushEnabled ? 1 : 0,
      prefs.emailEnabled ? 1 : 0,
      prefs.smsEnabled ? 1 : 0,
      prefs.quietHoursEnabled ? 1 : 0,
      prefs.quietHoursStart || "22:00",
      prefs.quietHoursEnd || "08:00",
      prefs.courseUpdates?.push ? 1 : 0,
      prefs.courseUpdates?.email ? 1 : 0,
      prefs.grades?.push ? 1 : 0,
      prefs.grades?.email ? 1 : 0,
      prefs.schedule?.push ? 1 : 0,
      prefs.schedule?.email ? 1 : 0,
      prefs.payment?.push ? 1 : 0,
      prefs.payment?.email ? 1 : 0,
      prefs.promotions?.push ? 1 : 0,
      prefs.promotions?.email ? 1 : 0,
      prefs.social?.push ? 1 : 0,
      prefs.social?.email ? 1 : 0,
      prefs.system?.push ? 1 : 0,
      prefs.system?.email ? 1 : 0
    ).run();
    return c.json({ success: true });
  } catch (error) {
    console.error("PUT /settings error:", getErrorMessage(error));
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
var studentAuthenticated = new Hono2();
studentAuthenticated.use("*", studentAuthMiddleware);
studentAuthenticated.get("/notifications", async (c) => {
  try {
    const userId = c.get("studentId");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = parseInt(c.req.query("offset") || "0");
    const unreadOnly = c.req.query("unread") === "true";
    let where = "WHERE user_id = ?";
    const params = [userId];
    if (unreadOnly) {
      where += " AND read = 0";
    }
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM notifications ${where}`
    ).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();
    const notifications = result.results.map((row) => ({
      id: row.id,
      title: row.title || "",
      message: row.message || "",
      type: row.type || "info",
      category: row.category || "",
      actionUrl: row.action_url || "",
      read: !!row.read,
      createdAt: row.created_at
    }));
    return c.json({ notifications, total });
  } catch (error) {
    return c.json({ notifications: [], total: 0 });
  }
});
studentAuthenticated.put("/notifications/:id/read", async (c) => {
  try {
    const userId = c.get("studentId");
    const notifId = c.req.param("id");
    const notif = await c.env.DB.prepare(
      "SELECT * FROM notifications WHERE id = ? AND user_id = ?"
    ).bind(notifId, userId).first();
    if (!notif) {
      return c.json({ error: "Notification not found" }, 404);
    }
    await c.env.DB.prepare(
      "UPDATE notifications SET read = 1 WHERE id = ?"
    ).bind(notifId).run();
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentAuthenticated.put("/notifications/read-all", async (c) => {
  try {
    const userId = c.get("studentId");
    const result = await c.env.DB.prepare(
      "UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0"
    ).bind(userId).run();
    return c.json({ success: true, count: result.meta?.changes || 0 });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentAuthenticated.get("/profile/stats", async (c) => {
  try {
    const userId = c.get("studentId");
    let coursesEnrolled = 0;
    try {
      const enrollResult = await c.env.DB.prepare(
        "SELECT COUNT(*) as total FROM enrollments WHERE user_id = ?"
      ).bind(userId).first();
      coursesEnrolled = enrollResult?.total || 0;
    } catch {
    }
    let certificates = 0;
    try {
      const certResult = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM user_packages WHERE user_id = ? AND status = 'completed'"
      ).bind(userId).first();
      certificates = certResult?.count || 0;
    } catch {
    }
    let currentStreak = 0;
    try {
      const activities = await c.env.DB.prepare(
        "SELECT DISTINCT date(created_at) as day FROM student_activity WHERE user_id = ? ORDER BY day DESC LIMIT 30"
      ).bind(userId).all();
      const days = activities.results.map((r) => r.day);
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 864e5).toISOString().split("T")[0];
      if (days.length > 0 && (days[0] === today || days[0] === yesterday)) {
        currentStreak = 1;
        for (let i = 1; i < days.length; i++) {
          const prev = new Date(days[i - 1]);
          const curr = new Date(days[i]);
          const diff = (prev.getTime() - curr.getTime()) / 864e5;
          if (diff === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    } catch {
    }
    const userDoc = await getStudentUserDoc(c.env, userId);
    const u = userDoc;
    let hoursWatched = 0;
    try {
      const watchResult = await c.env.DB.prepare(
        "SELECT SUM(CASE WHEN metadata LIKE '%watchMinutes%' THEN CAST(json_extract(metadata, '$.watchMinutes') AS REAL) ELSE 0 END) as total_minutes FROM student_activity WHERE user_id = ? AND activity_type = 'video_watch'"
      ).bind(userId).first();
      hoursWatched = Math.round((watchResult?.total_minutes || 0) / 60 * 10) / 10;
    } catch {
    }
    return c.json({
      stats: {
        coursesEnrolled,
        hoursWatched,
        certificates,
        currentStreak
      },
      profile: {
        phone: u?.phone || "",
        bio: u?.bio || "",
        semester: u?.semester || "",
        avatarUrl: u?.avatar_url || ""
      }
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentAuthenticated.get("/leaderboard", async (c) => {
  try {
    const technology = c.req.query("technology") || "";
    const period = c.req.query("period") || "week";
    const limit = parseInt(c.req.query("limit") || "20");
    const userId = c.get("studentId");
    const cacheKey = `leaderboard:${technology}:${period}`;
    const cached = await c.env.KV_CONFIG.get(cacheKey, "json");
    if (cached) {
      const result2 = cached;
      const yourEntry = result2.entries.find((e) => e.userId === userId);
      result2.yourRank = yourEntry ? yourEntry.rank : null;
      result2.yourXp = yourEntry ? yourEntry.xp : 0;
      return c.json(result2);
    }
    let dateFilter = "";
    if (period === "day") {
      dateFilter = `AND created_at >= date('now', '-1 day')`;
    } else if (period === "week") {
      dateFilter = `AND created_at >= date('now', '-7 days')`;
    } else if (period === "month") {
      dateFilter = `AND created_at >= date('now', '-30 days')`;
    }
    const d1Query = `
      SELECT
        user_id,
        SUM(CASE WHEN activity_type = 'video_watch' THEN 10 ELSE 0 END) as video_xp,
        SUM(CASE WHEN activity_type = 'quiz_complete' THEN 15 ELSE 0 END) as quiz_xp,
        SUM(CASE WHEN activity_type = 'assignment_submit' THEN 20 ELSE 0 END) as assignment_xp,
        SUM(CASE WHEN activity_type = 'streak_bonus' THEN 5 ELSE 0 END) as streak_xp,
        COUNT(DISTINCT date(created_at)) as active_days,
        COUNT(*) as total_activities
      FROM student_activity
      WHERE 1=1 ${dateFilter}
      GROUP BY user_id
      ORDER BY total_activities DESC
      LIMIT ?
    `;
    const result = await c.env.DB.prepare(d1Query).bind(limit).all();
    const entries = [];
    let rank = 1;
    let yourRank = null;
    let yourXp = 0;
    for (const row of result.results) {
      let userName = "Student";
      let userTechnology = "";
      try {
        const userDoc = await getStudentUserDoc(c.env, row.user_id);
        const u = userDoc;
        userName = u?.full_name || u?.name || "Student";
        userTechnology = u?.technology || "";
      } catch {
      }
      if (technology && userTechnology !== technology) continue;
      const totalXp = (row.video_xp || 0) + (row.quiz_xp || 0) + (row.assignment_xp || 0) + (row.streak_xp || 0);
      if (row.user_id === userId) {
        yourRank = rank;
        yourXp = totalXp;
      }
      entries.push({
        rank,
        userId: row.user_id,
        name: userName,
        technology: userTechnology,
        xp: totalXp,
        breakdown: {
          video: row.video_xp || 0,
          quiz: row.quiz_xp || 0,
          assignment: row.assignment_xp || 0,
          streak: row.streak_xp || 0
        },
        activeDays: row.active_days || 0,
        coursesCompleted: 0
      });
      rank++;
    }
    if (!yourRank) {
      yourXp = 0;
    }
    const response = {
      entries,
      yourRank,
      yourXp,
      period,
      technology: technology || "all"
    };
    await c.env.KV_CONFIG.put(cacheKey, JSON.stringify(response), { expirationTtl: 300 });
    return c.json(response);
  } catch (error) {
    return c.json({ entries: [], yourRank: null, yourXp: 0, error: getErrorMessage(error) }, 500);
  }
});
studentAuthenticated.get("/achievements", async (c) => {
  try {
    const userId = c.get("studentId");
    const definitions = await c.env.DB.prepare(
      "SELECT * FROM achievement_definitions WHERE is_active = 1 ORDER BY category, xp ASC"
    ).all();
    const unlocked = await c.env.DB.prepare(
      "SELECT * FROM student_achievements WHERE user_id = ?"
    ).bind(userId).all();
    const unlockedMap = /* @__PURE__ */ new Map();
    for (const row of unlocked.results) {
      unlockedMap.set(row.achievement_id, row.unlocked_at);
    }
    const achievements = definitions.results.map((def) => ({
      id: def.id,
      slug: def.slug,
      name: def.name,
      nameBn: def.name_bn,
      description: def.description,
      descriptionBn: def.description_bn,
      category: def.category,
      icon: def.icon,
      xp: def.xp,
      conditionType: def.condition_type,
      unlocked: unlockedMap.has(def.id),
      unlockedAt: unlockedMap.get(def.id) || null
    }));
    const totalXp = achievements.filter((a) => a.unlocked).reduce((sum, a) => sum + a.xp, 0);
    const unlockedCount = achievements.filter((a) => a.unlocked).length;
    return c.json({
      achievements,
      totalXp,
      unlockedCount,
      totalCount: achievements.length
    });
  } catch (error) {
    return c.json({ achievements: [], totalXp: 0, unlockedCount: 0, totalCount: 0 });
  }
});
studentAuthenticated.get("/activity", async (c) => {
  try {
    const userId = c.get("studentId");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = parseInt(c.req.query("offset") || "0");
    const activityType = c.req.query("type") || "";
    let query = "SELECT * FROM student_activity WHERE user_id = ?";
    const params = [userId];
    if (activityType) {
      query += " AND activity_type = ?";
      params.push(activityType);
    }
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    const result = await c.env.DB.prepare(query).bind(...params).all();
    const activities = result.results.map((row) => ({
      id: row.id,
      type: row.activity_type,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      title: row.title,
      description: row.description,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at
    }));
    return c.json({ activities, total: result.results.length });
  } catch (error) {
    return c.json({ activities: [], total: 0 });
  }
});
studentAuthenticated.put("/profile", async (c) => {
  try {
    const userId = c.get("studentId");
    const body = await c.req.json();
    const allowedFields = ["full_name", "phone", "bio", "semester", "technology", "institute_id"];
    const setClauses = [];
    const setValues = [];
    for (const field of allowedFields) {
      if (body[field] !== void 0) {
        setClauses.push(`${field} = ?`);
        setValues.push(body[field]);
      }
    }
    if (body.name !== void 0 && !body.full_name) {
      setClauses.push("full_name = ?");
      setValues.push(body.name);
    }
    if (body.instituteId !== void 0 && !body.institute_id) {
      setClauses.push("institute_id = ?");
      setValues.push(body.instituteId);
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = datetime('now')");
    setValues.push(userId);
    await c.env.DB.prepare(
      `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...setValues).run();
    await c.env.DB.prepare(`
      INSERT INTO student_activity (user_id, activity_type, resource_type, title, description)
      VALUES (?, 'profile_update', 'profile', 'Profile Updated', 'Updated profile information')
    `).bind(userId).run();
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentAuthenticated.post("/upload-avatar", async (c) => {
  try {
    const userId = c.get("studentId");
    const formData = await c.req.formData();
    const file = formData.get("avatar");
    if (!file) {
      return c.json({ error: "Avatar file required" }, 400);
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Invalid file type. Use JPEG, PNG, WebP, or GIF." }, 400);
    }
    if (file.size > 2 * 1024 * 1024) {
      return c.json({ error: "File too large. Maximum 2MB." }, 400);
    }
    const key = `${userId}/${Date.now()}-${file.name}`;
    await c.env.R2_AVATARS.put(key, file.stream(), {
      httpMetadata: { contentType: file.type }
    });
    const baseUrl = new URL(c.req.url).origin;
    const avatarUrl = `${baseUrl}/upload/avatars/${key}`;
    await c.env.DB.prepare(
      "UPDATE users SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(avatarUrl, userId).run();
    await c.env.DB.prepare(`
      INSERT INTO student_activity (user_id, activity_type, resource_type, title, description)
      VALUES (?, 'avatar_upload', 'profile', 'Avatar Updated', 'Updated profile picture')
    `).bind(userId).run();
    return c.json({ success: true, avatarUrl });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
var DEFAULT_PREFERENCES = {
  themeMode: "system",
  accentColor: "#0ea5e9",
  fontSize: 16,
  borderRadius: 16,
  compactMode: false,
  profileVisibility: "Friends",
  searchVisible: true,
  showEmail: false,
  showPhone: false,
  showProgress: true,
  activityStatus: true,
  readReceipts: true,
  dataSharing: false,
  analyticsOptOut: false,
  personalizedRecommendations: true,
  cookieConsent: "essential",
  contentProtectionEnabled: true,
  noCopy: true,
  noRightClick: true,
  noScreenshot: false,
  downloadQuality: "720p",
  wifiOnly: false,
  language: "bn"
};
studentAuthenticated.get("/preferences", async (c) => {
  try {
    const userId = c.get("studentId");
    const row = await c.env.DB.prepare(
      "SELECT * FROM user_preferences WHERE user_id = ?"
    ).bind(userId).first();
    if (!row) {
      return c.json({ preferences: DEFAULT_PREFERENCES });
    }
    const r = row;
    return c.json({
      preferences: {
        themeMode: r.theme_mode || "system",
        accentColor: r.accent_color || "#0ea5e9",
        fontSize: r.font_size || 16,
        borderRadius: r.border_radius || 16,
        compactMode: !!r.compact_mode,
        profileVisibility: r.profile_visibility || "Friends",
        searchVisible: !!r.search_visible,
        showEmail: !!r.show_email,
        showPhone: !!r.show_phone,
        showProgress: !!r.show_progress,
        activityStatus: !!r.activity_status,
        readReceipts: !!r.read_receipts,
        dataSharing: !!r.data_sharing,
        analyticsOptOut: !!r.analytics_opt_out,
        personalizedRecommendations: !!r.personalized_recommendations,
        cookieConsent: r.cookie_consent || "essential",
        contentProtectionEnabled: !!r.content_protection_enabled,
        noCopy: !!r.no_copy,
        noRightClick: !!r.no_right_click,
        noScreenshot: !!r.no_screenshot,
        downloadQuality: r.download_quality || "720p",
        wifiOnly: !!r.wifi_only,
        language: r.language || "bn"
      }
    });
  } catch (error) {
    return c.json({ preferences: DEFAULT_PREFERENCES });
  }
});
studentAuthenticated.put("/preferences", async (c) => {
  try {
    const userId = c.get("studentId");
    const prefs = await c.req.json();
    await c.env.DB.prepare(`
      INSERT INTO user_preferences (
        user_id, theme_mode, accent_color, font_size, border_radius, compact_mode,
        profile_visibility, search_visible, show_email, show_phone, show_progress,
        activity_status, read_receipts, data_sharing, analytics_opt_out,
        personalized_recommendations, cookie_consent,
        content_protection_enabled, no_copy, no_right_click, no_screenshot,
        download_quality, wifi_only, language
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        theme_mode = excluded.theme_mode,
        accent_color = excluded.accent_color,
        font_size = excluded.font_size,
        border_radius = excluded.border_radius,
        compact_mode = excluded.compact_mode,
        profile_visibility = excluded.profile_visibility,
        search_visible = excluded.search_visible,
        show_email = excluded.show_email,
        show_phone = excluded.show_phone,
        show_progress = excluded.show_progress,
        activity_status = excluded.activity_status,
        read_receipts = excluded.read_receipts,
        data_sharing = excluded.data_sharing,
        analytics_opt_out = excluded.analytics_opt_out,
        personalized_recommendations = excluded.personalized_recommendations,
        cookie_consent = excluded.cookie_consent,
        content_protection_enabled = excluded.content_protection_enabled,
        no_copy = excluded.no_copy,
        no_right_click = excluded.no_right_click,
        no_screenshot = excluded.no_screenshot,
        download_quality = excluded.download_quality,
        wifi_only = excluded.wifi_only,
        language = excluded.language,
        updated_at = datetime('now')
    `).bind(
      userId,
      prefs.themeMode || "system",
      prefs.accentColor || "#0ea5e9",
      prefs.fontSize || 16,
      prefs.borderRadius || 16,
      prefs.compactMode ? 1 : 0,
      prefs.profileVisibility || "Friends",
      prefs.searchVisible ? 1 : 0,
      prefs.showEmail ? 1 : 0,
      prefs.showPhone ? 1 : 0,
      prefs.showProgress ? 1 : 0,
      prefs.activityStatus ? 1 : 0,
      prefs.readReceipts ? 1 : 0,
      prefs.dataSharing ? 1 : 0,
      prefs.analyticsOptOut ? 1 : 0,
      prefs.personalizedRecommendations ? 1 : 0,
      prefs.cookieConsent || "essential",
      prefs.contentProtectionEnabled ? 1 : 0,
      prefs.noCopy ? 1 : 0,
      prefs.noRightClick ? 1 : 0,
      prefs.noScreenshot ? 1 : 0,
      prefs.downloadQuality || "720p",
      prefs.wifiOnly ? 1 : 0,
      prefs.language || "bn"
    ).run();
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentAuthenticated.get("/student/learning-stats", async (c) => {
  try {
    const userId = c.get("userId");
    const range = c.req.query("range") || "30d";
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const dailyData = [];
    try {
      const rows = await c.env.DB.prepare(`
        SELECT DATE(created_at) as day,
               COUNT(CASE WHEN activity_type = 'video_watch' THEN 1 END) as videos,
               COUNT(*) as activities
        FROM student_activity
        WHERE user_id = ? AND created_at >= datetime('now', '-${days} days')
        GROUP BY DATE(created_at)
        ORDER BY day ASC
      `).bind(userId).all();
      for (const row of rows.results || []) {
        dailyData.push({ date: row.day, videos: row.videos || 0, activities: row.activities || 0 });
      }
    } catch {
    }
    const subjectProgress = [];
    try {
      const rows = await c.env.DB.prepare(`
        SELECT t.name as technology, e.progress
        FROM enrollments e
        INNER JOIN courses c ON e.course_id = c.id
        LEFT JOIN technologies t ON c.technology_id = t.id
        WHERE e.user_id = ?
      `).bind(userId).all();
      for (const row of rows.results || []) {
        subjectProgress.push({ subject: row.technology || "General", progress: row.progress || 0 });
      }
    } catch {
    }
    let hoursWatched = 0;
    let coursesEnrolled = 0;
    let certificates = 0;
    let currentStreak = 0;
    try {
      const watchStats = await c.env.DB.prepare(
        "SELECT SUM(CASE WHEN metadata LIKE '%watchMinutes%' THEN CAST(json_extract(metadata, '$.watchMinutes') AS REAL) ELSE 0 END) as total_minutes FROM student_activity WHERE user_id = ? AND activity_type = 'video_watch'"
      ).bind(userId).first();
      hoursWatched = Math.round((watchStats?.total_minutes || 0) / 60 * 10) / 10;
    } catch {
    }
    try {
      const enrollCount = await c.env.DB.prepare(
        "SELECT COUNT(*) as total FROM enrollments WHERE user_id = ?"
      ).bind(userId).first();
      coursesEnrolled = enrollCount?.total || 0;
    } catch {
    }
    try {
      const certCount = await c.env.DB.prepare(
        "SELECT COUNT(*) as total FROM certificates WHERE user_id = ? AND status = 'issued'"
      ).bind(userId).first();
      certificates = certCount?.total || 0;
    } catch {
    }
    try {
      const streakRows = await c.env.DB.prepare(
        "SELECT DATE(created_at) as day FROM student_activity WHERE user_id = ? GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 30"
      ).bind(userId).all();
      const activeDays = (streakRows.results || []).map((r) => r.day);
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      let streak = 0;
      let checkDate = /* @__PURE__ */ new Date();
      if (!activeDays.includes(today)) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
      for (let i = 0; i < 60; i++) {
        const dateStr = checkDate.toISOString().split("T")[0];
        if (activeDays.includes(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      currentStreak = streak;
    } catch {
    }
    return c.json({
      dailyData,
      subjectProgress,
      overview: { hoursWatched, coursesEnrolled, certificates, currentStreak },
      range
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.route("/", studentAuthenticated);
studentApiRoutes.get("/enrollments/mine", async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized || !auth.userId) {
      return c.json({ error: "Login required" }, 401);
    }
    const result = await c.env.DB.prepare(`
      SELECT e.*, c.title as course_title, c.thumbnail_url as course_thumbnail,
             c.description as course_description, c.price as course_price,
             c.level as course_level, c.technology_id as course_technology_id,
             c.is_published, c.duration as course_duration,
             c.total_videos as course_total_videos,
             c.rating as course_rating, c.is_featured as course_is_featured
      FROM enrollments e
      LEFT JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ?
      ORDER BY e.created_at DESC
    `).bind(auth.userId).all();
    const activeEnrollments = result.results.filter((enr) => {
      if (enr.status === "expired") return false;
      if (enr.expires_at && new Date(enr.expires_at) < /* @__PURE__ */ new Date()) return false;
      return true;
    });
    return c.json({ enrollments: activeEnrollments });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/enrollments/check", async (c) => {
  try {
    const courseId = c.req.query("course_id");
    if (!courseId) {
      return c.json({ error: "course_id required" }, 400);
    }
    const auth = await getStudentAuth(c);
    let enrolled = false;
    let enrollment = null;
    let paymentStatus = "none";
    if (auth.authorized && auth.userId) {
      const enrollmentRecord = await c.env.DB.prepare(
        "SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?"
      ).bind(auth.userId, courseId).first();
      if (enrollmentRecord) {
        enrolled = true;
        enrollment = enrollmentRecord;
        const enr = enrollmentRecord;
        if (enr.status === "expired" || enr.expires_at && new Date(enr.expires_at) < /* @__PURE__ */ new Date()) {
          enrolled = false;
          paymentStatus = "expired";
        }
      }
      if (!enrolled) {
        const pendingPayment = await c.env.DB.prepare(
          "SELECT * FROM payments WHERE user_id = ? AND course_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1"
        ).bind(auth.userId, courseId).first();
        if (pendingPayment) {
          paymentStatus = "pending";
        }
      }
    }
    return c.json({ enrolled, enrollment, paymentStatus });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.post("/enroll", async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: "Login required" }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: "Email verification required", code: "EMAIL_NOT_VERIFIED" }, 403);
    }
    const { course_id, package_id } = await c.req.json();
    if (!course_id) {
      return c.json({ error: "course_id required" }, 400);
    }
    const existing = await c.env.DB.prepare(
      "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?"
    ).bind(auth.userId, course_id).first();
    if (existing) {
      return c.json({ error: "Already enrolled in this course", enrolled: true }, 400);
    }
    const course = await c.env.DB.prepare(
      "SELECT id, price FROM courses WHERE id = ? AND is_published = 1"
    ).bind(course_id).first();
    if (!course) {
      return c.json({ error: "Course not found" }, 404);
    }
    let packageIdToUse = package_id || null;
    let durationMonths = 6;
    if (package_id) {
      const pkg = await c.env.DB.prepare(
        "SELECT * FROM course_packages WHERE id = ? AND course_id = ? AND is_active = 1"
      ).bind(package_id, course_id).first();
      if (!pkg) {
        return c.json({ error: "Package not found" }, 404);
      }
      if (pkg.price > 0) {
        return c.json({ error: "This package requires payment. Use /payments/create instead." }, 400);
      }
      packageIdToUse = pkg.id;
      durationMonths = pkg.duration_months;
    } else {
      const coursePrice = course.price;
      if (coursePrice > 0) {
        const freePkg = await c.env.DB.prepare(
          "SELECT * FROM course_packages WHERE course_id = ? AND price = 0 AND is_active = 1 LIMIT 1"
        ).bind(course_id).first();
        if (freePkg) {
          packageIdToUse = freePkg.id;
          durationMonths = freePkg.duration_months;
        } else {
          return c.json({ error: "This course requires payment. Use /payments/create instead." }, 400);
        }
      }
    }
    let expiresAt = null;
    if (durationMonths !== null && durationMonths > 0) {
      const expDate = /* @__PURE__ */ new Date();
      expDate.setMonth(expDate.getMonth() + durationMonths);
      expiresAt = expDate.toISOString();
    }
    const enrollmentId = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT INTO enrollments (id, user_id, course_id, package_id, expires_at, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
    ).bind(enrollmentId, auth.userId, course_id, packageIdToUse, expiresAt, "active").run();
    return c.json({
      success: true,
      enrollment: {
        id: enrollmentId,
        user_id: auth.userId,
        course_id,
        package_id: packageIdToUse,
        expires_at: expiresAt,
        status: "active"
      }
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/student/notifications", studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get("studentId");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = parseInt(c.req.query("offset") || "0");
    const unreadOnly = c.req.query("unread") === "true";
    let query = "SELECT * FROM notifications WHERE user_id = ?";
    const params = [userId];
    if (unreadOnly) {
      query += " AND read = 0";
    }
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    const result = await c.env.DB.prepare(query).bind(...params).all();
    const countResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as total FROM notifications WHERE user_id = ?"
    ).bind(userId).first();
    const unreadResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as total FROM notifications WHERE user_id = ? AND read = 0"
    ).bind(userId).first();
    return c.json({
      notifications: result.results,
      total: countResult?.total || 0,
      unreadCount: unreadResult?.total || 0
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.put("/student/notifications/:id/read", studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get("studentId");
    const notificationId = c.req.param("id");
    await c.env.DB.prepare(
      "UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?"
    ).bind(notificationId, userId).run();
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.put("/student/notifications/read-all", studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get("studentId");
    await c.env.DB.prepare(
      "UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0"
    ).bind(userId).run();
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.get("/student/profile/stats", studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get("studentId");
    let enrolledCourses = 0;
    try {
      const enrollResult = await c.env.DB.prepare(
        "SELECT COUNT(*) as total FROM enrollments WHERE user_id = ?"
      ).bind(userId).first();
      enrolledCourses = enrollResult?.total || 0;
    } catch {
    }
    let completedCourses = 0;
    try {
      const completedResult = await c.env.DB.prepare(
        "SELECT COUNT(*) as total FROM enrollments WHERE user_id = ? AND completed = 1"
      ).bind(userId).first();
      completedCourses = completedResult?.total || 0;
    } catch {
    }
    let totalWatchTime = 0;
    try {
      const watchResult = await c.env.DB.prepare(
        "SELECT COALESCE(SUM(watch_time), 0) as total FROM watch_progress WHERE user_id = ?"
      ).bind(userId).first();
      totalWatchTime = watchResult?.total || 0;
    } catch {
    }
    let videosWatched = 0;
    try {
      const videoResult = await c.env.DB.prepare(
        "SELECT COUNT(DISTINCT resource_id) as total FROM student_activity WHERE user_id = ? AND activity_type = 'watch'"
      ).bind(userId).first();
      videosWatched = videoResult?.total || 0;
    } catch {
    }
    let activePackages = 0;
    try {
      const pkgResult = await c.env.DB.prepare(
        "SELECT COUNT(*) as total FROM user_packages WHERE user_id = ? AND status = 'active'"
      ).bind(userId).first();
      activePackages = pkgResult?.total || 0;
    } catch {
    }
    let streak = 0;
    try {
      const streakResult = await c.env.DB.prepare(
        `SELECT DATE(created_at) as day FROM student_activity WHERE user_id = ? GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 30`
      ).bind(userId).all();
      if (streakResult.results.length > 0) {
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 864e5).toISOString().split("T")[0];
        const firstDay = streakResult.results[0].day;
        if (firstDay === today || firstDay === yesterday) {
          streak = 1;
          for (let i = 1; i < streakResult.results.length; i++) {
            const prevDate = new Date(streakResult.results[i - 1].day);
            const currDate = new Date(streakResult.results[i].day);
            const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / 864e5);
            if (diffDays === 1) {
              streak++;
            } else {
              break;
            }
          }
        }
      }
    } catch {
    }
    return c.json({
      stats: {
        enrolledCourses,
        completedCourses,
        totalWatchTime,
        videosWatched,
        activePackages,
        streak
      }
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.put("/student/profile", studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get("studentId");
    const body = await c.req.json();
    const fieldMapping = {
      name: "full_name",
      fullName: "full_name",
      phone: "phone",
      bio: "bio",
      semester: "semester",
      instituteId: "institute_id",
      technology: "technology",
      avatarUrl: "avatar_url"
    };
    const setClauses = [];
    const params = [];
    for (const [bodyField, dbColumn] of Object.entries(fieldMapping)) {
      if (body[bodyField] !== void 0) {
        setClauses.push(`${dbColumn} = ?`);
        params.push(body[bodyField]);
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = ?");
    params.push((/* @__PURE__ */ new Date()).toISOString());
    params.push(userId);
    await c.env.DB.prepare(
      `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    const updatedUser = await c.env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(userId).first();
    const u = updatedUser;
    const instituteName = await getInstituteName(c.env, u?.institute_id || null);
    const technologyName = await getTechnologyName(c.env, u?.technology || null);
    return c.json({
      success: true,
      user: {
        id: userId,
        name: u?.full_name || "",
        email: u?.email || "",
        phone: u?.phone || null,
        bio: u?.bio || null,
        semester: u?.semester || null,
        instituteId: u?.institute_id || null,
        instituteName: instituteName || null,
        technology: u?.technology || null,
        technologyName: technologyName || null,
        avatarUrl: u?.avatar_url || ""
      }
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.post("/student/upload-avatar", studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get("studentId");
    const formData = await c.req.formData();
    const avatarEntry = formData.get("avatar");
    if (!avatarEntry || typeof avatarEntry === "string") {
      return c.json({ error: "No avatar file provided" }, 400);
    }
    const file = avatarEntry;
    try {
      const existingRow = await c.env.DB.prepare(
        "SELECT avatar_url FROM users WHERE id = ?"
      ).bind(userId).first();
      const oldAvatarUrl = existingRow?.avatar_url;
      if (oldAvatarUrl) {
        const uploadMatch = oldAvatarUrl.match(/\/upload\/avatars\/(.+)$/);
        if (uploadMatch?.[1]) {
          await c.env.R2_AVATARS.delete(uploadMatch[1]);
        }
      }
    } catch {
    }
    const key = `student/${userId}/${Date.now()}-${file.name || "avatar"}`;
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2_AVATARS.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type || "image/png" }
    });
    const avatarUrl = await getPublicUrl(c.env, "avatars", key);
    await c.env.DB.prepare(
      "UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?"
    ).bind(avatarUrl, (/* @__PURE__ */ new Date()).toISOString(), userId).run();
    return c.json({ success: true, avatarUrl });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.post("/student/change-password", studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get("studentId");
    const { currentPassword, newPassword } = await c.req.json();
    if (!currentPassword || !newPassword) {
      return c.json({ error: "currentPassword and newPassword are required" }, 400);
    }
    if (newPassword.length < 8) {
      return c.json({ error: "New password must be at least 8 characters" }, 400);
    }
    const user = await c.env.DB.prepare(
      "SELECT password_hash FROM users WHERE id = ?"
    ).bind(userId).first();
    if (!user?.password_hash) {
      return c.json({ error: "User not found" }, 404);
    }
    const validPassword = await verifyPassword(currentPassword, user.password_hash);
    if (!validPassword) {
      return c.json({ error: "Current password is incorrect" }, 401);
    }
    const newHash = await hashPassword(newPassword);
    await c.env.DB.prepare(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(newHash, userId).run();
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
studentApiRoutes.post("/student/delete-account", studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get("studentId");
    const { password, reason, feedback } = await c.req.json();
    if (!password) {
      return c.json({ error: "Password is required to delete your account" }, 400);
    }
    const user = await c.env.DB.prepare(
      "SELECT password_hash FROM users WHERE id = ?"
    ).bind(userId).first();
    if (!user?.password_hash) {
      return c.json({ error: "User not found" }, 404);
    }
    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return c.json({ error: "Password is incorrect" }, 401);
    }
    await c.env.DB.prepare("DELETE FROM enrollments WHERE user_id = ?").bind(userId).run();
    await c.env.DB.prepare("DELETE FROM watch_history WHERE user_id = ?").bind(userId).run();
    await c.env.DB.prepare("DELETE FROM student_sessions WHERE user_id = ?").bind(userId).run();
    await c.env.DB.prepare("DELETE FROM notification_tokens WHERE user_id = ?").bind(userId).run();
    await c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
var student_api_default = studentApiRoutes;

// src/routes/push.ts
var pushRoutes = new Hono2();
pushRoutes.use("*", adminAuthMiddleware);
pushRoutes.post("/broadcast", async (c) => {
  try {
    const { title, titleBn, message, messageBn, url, data } = await c.req.json();
    if (!title || !message) {
      return c.json({ error: "title and message required" }, 400);
    }
    const result = await sendPushNotification(c.env, {
      title,
      titleBn,
      message,
      messageBn,
      url,
      data,
      targetSegment: "All"
    });
    await c.env.DB.prepare(`
      INSERT INTO notification_logs (type, category, title, message, target_type, sent_count, failed_count, metadata, created_by)
      VALUES ('push', 'broadcast', ?, ?, 'all', ?, ?, ?, ?)
    `).bind(title, message, result.recipients, result.errors.length, JSON.stringify(data || {}), c.get("user").id).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "BROADCAST_PUSH", "notifications", void 0, { title, recipients: result.recipients });
    return c.json({ success: result.success, recipients: result.recipients, errors: result.errors });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
pushRoutes.post("/send", async (c) => {
  try {
    const { userIds, title, titleBn, message, messageBn, url, data } = await c.req.json();
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return c.json({ error: "userIds array required" }, 400);
    }
    if (!title || !message) {
      return c.json({ error: "title and message required" }, 400);
    }
    const tokens = await getBatchUserPushTokens(c.env, userIds);
    if (tokens.length === 0) {
      return c.json({ success: false, message: "No push tokens found for specified users" });
    }
    const result = await sendPushNotification(c.env, {
      title,
      titleBn,
      message,
      messageBn,
      url,
      data,
      targetPlayerIds: tokens
    });
    await c.env.DB.prepare(`
      INSERT INTO notification_logs (type, category, title, message, target_type, target_id, sent_count, failed_count, metadata, created_by)
      VALUES ('push', 'targeted', ?, ?, 'users', ?, ?, ?, ?, ?)
    `).bind(title, message, userIds.join(","), result.recipients, result.errors.length, JSON.stringify(data || {}), c.get("user").id).run();
    return c.json({ success: result.success, recipients: result.recipients, errors: result.errors });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
pushRoutes.get("/stats", async (c) => {
  try {
    const totalTokens = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM user_push_tokens WHERE is_active = 1"
    ).first();
    const recentLogs = await c.env.DB.prepare(
      "SELECT * FROM notification_logs WHERE type = 'push' ORDER BY created_at DESC LIMIT 10"
    ).all();
    return c.json({
      totalSubscribers: totalTokens?.count || 0,
      recentNotifications: recentLogs.results
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
pushRoutes.get("/logs", async (c) => {
  try {
    const type = c.req.query("type") || "all";
    const category = c.req.query("category") || "all";
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = (page - 1) * limit;
    let query = "SELECT * FROM notification_logs";
    let countQuery = "SELECT COUNT(*) as total FROM notification_logs";
    const params = [];
    const conditions = [];
    if (type !== "all") {
      conditions.push("type = ?");
      params.push(type);
    }
    if (category !== "all") {
      conditions.push("category = ?");
      params.push(category);
    }
    if (conditions.length > 0) {
      const whereClause = " WHERE " + conditions.join(" AND ");
      query += whereClause;
      countQuery += whereClause;
    }
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();
    return c.json({ logs: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
var push_default = pushRoutes;

// src/routes/technologies.ts
var techRoutes = new Hono2();
techRoutes.use("*", adminAuthMiddleware);
techRoutes.get("/", async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT * FROM technologies ORDER BY name ASC"
    ).all();
    return c.json({ technologies: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
techRoutes.post("/", async (c) => {
  try {
    const data = await c.req.json();
    const { name, name_bn, short_code, description } = data;
    if (!name) {
      return c.json({ error: "Name is required" }, 400);
    }
    if (short_code) {
      const existing = await c.env.DB.prepare(
        "SELECT id FROM technologies WHERE short_code = ?"
      ).bind(short_code).first();
      if (existing) {
        return c.json({ error: "Short code already exists" }, 400);
      }
    }
    await c.env.DB.prepare(`
      INSERT INTO technologies (name, name_bn, short_code, description)
      VALUES (?, ?, ?, ?)
    `).bind(name, name_bn || null, short_code || null, description || null).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "CREATE_TECHNOLOGY", "technologies", void 0, data);
    return c.json({ success: true, message: "Technology created" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
techRoutes.put("/", async (c) => {
  try {
    const data = await c.req.json();
    const { technologyId, ...updates } = data;
    if (!technologyId) {
      return c.json({ error: "technologyId is required" }, 400);
    }
    const existing = await c.env.DB.prepare(
      "SELECT id FROM technologies WHERE id = ?"
    ).bind(technologyId).first();
    if (!existing) {
      return c.json({ error: "Technology not found" }, 404);
    }
    const fields = [];
    const values = [];
    if (updates.name !== void 0) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.name_bn !== void 0) {
      fields.push("name_bn = ?");
      values.push(updates.name_bn);
    }
    if (updates.short_code !== void 0) {
      fields.push("short_code = ?");
      values.push(updates.short_code);
    }
    if (updates.description !== void 0) {
      fields.push("description = ?");
      values.push(updates.description);
    }
    if (updates.is_active !== void 0) {
      fields.push("is_active = ?");
      values.push(updates.is_active);
    }
    if (fields.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }
    fields.push("updated_at = datetime('now')");
    values.push(technologyId);
    await c.env.DB.prepare(
      `UPDATE technologies SET ${fields.join(", ")} WHERE id = ?`
    ).bind(...values).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "UPDATE_TECHNOLOGY", "technologies", String(technologyId), updates);
    return c.json({ success: true, message: "Technology updated" });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
techRoutes.delete("/", async (c) => {
  try {
    const technologyId = c.req.query("id");
    if (!technologyId) {
      return c.json({ error: "Technology ID required" }, 400);
    }
    await c.env.DB.prepare("DELETE FROM technologies WHERE id = ?").bind(technologyId).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "DELETE_TECHNOLOGY", "technologies", technologyId);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
var technologies_default = techRoutes;

// src/routes/subjects.ts
var subjectRoutes = new Hono2();
subjectRoutes.use("*", adminAuthMiddleware);
function slugify3(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
subjectRoutes.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const search = c.req.query("search") || "";
    const technologyId = c.req.query("technologyId") || "";
    const offset = (page - 1) * limit;
    let where = "WHERE 1=1";
    const params = [];
    if (search) {
      where += " AND name LIKE ?";
      params.push(`%${search}%`);
    }
    if (technologyId) {
      where += " AND technology_id = ?";
      params.push(technologyId);
    }
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM subjects ${where}`
    ).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(
      `SELECT * FROM subjects ${where} ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();
    return c.json({ documents: result.results, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
subjectRoutes.post("/", async (c) => {
  try {
    const rawData = await c.req.json();
    const allowedFields = ["name", "slug", "description", "icon", "color", "technology_id", "sort_order", "course_count", "is_active"];
    const data = normalizeKeys(rawData, allowedFields);
    const id = crypto.randomUUID();
    const slug = data.slug || slugify3(data.name);
    if (!data.name) {
      return c.json({ error: "Name is required" }, 400);
    }
    const existing = await c.env.DB.prepare(
      "SELECT id FROM subjects WHERE slug = ?"
    ).bind(slug).first();
    if (existing) {
      return c.json({ error: "Slug already exists" }, 400);
    }
    await c.env.DB.prepare(`
      INSERT INTO subjects (id, name, slug, description, icon, color, technology_id, sort_order, course_count, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.name,
      slug,
      data.description || null,
      data.icon || null,
      data.color || null,
      data.technology_id || null,
      data.sort_order || 0,
      data.course_count || 0,
      data.is_active !== void 0 ? data.is_active ? 1 : 0 : 1
    ).run();
    const created = await c.env.DB.prepare("SELECT * FROM subjects WHERE id = ?").bind(id).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "CREATE_SUBJECT", "subjects", id, data);
    return c.json({ document: created });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
subjectRoutes.put("/", async (c) => {
  try {
    const rawData = await c.req.json();
    const { subjectId, ...rawUpdates } = rawData;
    if (!subjectId) {
      return c.json({ error: "Subject ID required" }, 400);
    }
    const existing = await c.env.DB.prepare(
      "SELECT id FROM subjects WHERE id = ?"
    ).bind(String(subjectId)).first();
    if (!existing) {
      return c.json({ error: "Subject not found" }, 404);
    }
    const allowedFields = ["name", "slug", "description", "icon", "color", "technology_id", "sort_order", "course_count", "is_active"];
    const updates = normalizeKeys(rawUpdates, allowedFields);
    const setClauses = [];
    const setValues = [];
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === "is_active") {
          setClauses.push(`${key} = ?`);
          setValues.push(value ? 1 : 0);
        } else {
          setClauses.push(`${key} = ?`);
          setValues.push(value);
        }
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = datetime('now')");
    setValues.push(String(subjectId));
    await c.env.DB.prepare(
      `UPDATE subjects SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...setValues).run();
    const updated = await c.env.DB.prepare("SELECT * FROM subjects WHERE id = ?").bind(String(subjectId)).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "UPDATE_SUBJECT", "subjects", String(subjectId), updates);
    return c.json({ document: updated });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
subjectRoutes.delete("/", async (c) => {
  try {
    const id = c.req.query("id");
    if (!id) {
      return c.json({ error: "Subject ID required" }, 400);
    }
    await c.env.DB.prepare("DELETE FROM subjects WHERE id = ?").bind(id).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "DELETE_SUBJECT", "subjects", id);
    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var subjects_default = subjectRoutes;

// src/routes/chapters.ts
var chapterRoutes = new Hono2();
chapterRoutes.use("*", adminAuthMiddleware);
function slugify4(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
chapterRoutes.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const courseId = c.req.query("courseId") || "";
    const subjectId = c.req.query("subjectId") || "";
    const offset = (page - 1) * limit;
    let where = "WHERE 1=1";
    const params = [];
    if (courseId) {
      where += " AND course_id = ?";
      params.push(courseId);
    }
    if (subjectId) {
      where += " AND subject_id = ?";
      params.push(subjectId);
    }
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM chapters ${where}`
    ).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(
      `SELECT * FROM chapters ${where} ORDER BY course_id, subject_id, sort_order ASC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();
    return c.json({ documents: result.results, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
chapterRoutes.post("/", async (c) => {
  try {
    const rawData = await c.req.json();
    const allowedFields = ["course_id", "subject_id", "title", "slug", "description", "sort_order"];
    const data = normalizeKeys(rawData, allowedFields);
    const id = crypto.randomUUID();
    const slug = data.slug || slugify4(data.title || "");
    if (!data.title) {
      return c.json({ error: "Title is required" }, 400);
    }
    if (!data.course_id) {
      return c.json({ error: "Course ID is required" }, 400);
    }
    await c.env.DB.prepare(`
      INSERT INTO chapters (id, course_id, subject_id, title, slug, description, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.course_id,
      data.subject_id || null,
      data.title,
      slug,
      data.description || null,
      data.sort_order || 0
    ).run();
    const created = await c.env.DB.prepare("SELECT * FROM chapters WHERE id = ?").bind(id).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "CREATE_CHAPTER", "chapters", id, data);
    return c.json({ document: created });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
chapterRoutes.put("/", async (c) => {
  try {
    const rawData = await c.req.json();
    const { chapterId, ...rawUpdates } = rawData;
    if (!chapterId) {
      return c.json({ error: "Chapter ID required" }, 400);
    }
    const existing = await c.env.DB.prepare(
      "SELECT id FROM chapters WHERE id = ?"
    ).bind(String(chapterId)).first();
    if (!existing) {
      return c.json({ error: "Chapter not found" }, 404);
    }
    const allowedFields = ["course_id", "subject_id", "title", "slug", "description", "sort_order"];
    const updates = normalizeKeys(rawUpdates, allowedFields);
    const setClauses = [];
    const setValues = [];
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`);
        setValues.push(value);
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = datetime('now')");
    setValues.push(String(chapterId));
    await c.env.DB.prepare(
      `UPDATE chapters SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...setValues).run();
    const updated = await c.env.DB.prepare("SELECT * FROM chapters WHERE id = ?").bind(String(chapterId)).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "UPDATE_CHAPTER", "chapters", String(chapterId), updates);
    return c.json({ document: updated });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
chapterRoutes.delete("/", async (c) => {
  try {
    const id = c.req.query("id") || c.req.query("chapterId");
    if (!id) {
      return c.json({ error: "Chapter ID required" }, 400);
    }
    await c.env.DB.prepare("DELETE FROM chapters WHERE id = ?").bind(id).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "DELETE_CHAPTER", "chapters", id);
    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var chapters_default = chapterRoutes;

// src/routes/lessons.ts
var lessonRoutes = new Hono2();
lessonRoutes.use("*", adminAuthMiddleware);
function slugify5(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
lessonRoutes.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const courseId = c.req.query("courseId") || "";
    const chapterId = c.req.query("chapterId") || "";
    const subjectId = c.req.query("subjectId") || "";
    const offset = (page - 1) * limit;
    let where = "WHERE 1=1";
    const params = [];
    if (courseId) {
      where += " AND course_id = ?";
      params.push(courseId);
    }
    if (chapterId) {
      where += " AND chapter_id = ?";
      params.push(chapterId);
    }
    if (subjectId) {
      where += " AND subject_id = ?";
      params.push(subjectId);
    }
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM lessons ${where}`
    ).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(
      `SELECT * FROM lessons ${where} ORDER BY chapter_id, sort_order ASC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();
    return c.json({ documents: result.results, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
lessonRoutes.post("/", async (c) => {
  try {
    const rawData = await c.req.json();
    const allowedFields = [
      "chapter_id",
      "course_id",
      "subject_id",
      "title",
      "slug",
      "description",
      "lesson_type",
      "sort_order",
      "is_preview",
      "duration",
      "video_url",
      "thumbnail_url",
      "document_url"
    ];
    const data = normalizeKeys(rawData, allowedFields);
    const id = crypto.randomUUID();
    const slug = data.slug || slugify5(data.title || "");
    if (!data.title) {
      return c.json({ error: "Title is required" }, 400);
    }
    if (!data.chapter_id) {
      return c.json({ error: "Chapter ID is required" }, 400);
    }
    if (!data.course_id) {
      return c.json({ error: "Course ID is required" }, 400);
    }
    if (!data.subject_id) {
      const chapter = await c.env.DB.prepare(
        "SELECT subject_id FROM chapters WHERE id = ?"
      ).bind(String(data.chapter_id)).first();
      if (chapter && chapter.subject_id) {
        data.subject_id = chapter.subject_id;
      }
    }
    await c.env.DB.prepare(`
      INSERT INTO lessons (id, chapter_id, course_id, subject_id, title, slug, description, lesson_type, sort_order, is_preview, duration, video_url, thumbnail_url, document_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.chapter_id,
      data.course_id,
      data.subject_id || null,
      data.title,
      slug,
      data.description || null,
      data.lesson_type || "video",
      data.sort_order || 0,
      data.is_preview ? 1 : 0,
      data.duration || 0,
      data.video_url || null,
      data.thumbnail_url || null,
      data.document_url || null
    ).run();
    const created = await c.env.DB.prepare("SELECT * FROM lessons WHERE id = ?").bind(id).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "CREATE_LESSON", "lessons", id, data);
    return c.json({ document: created });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
lessonRoutes.put("/", async (c) => {
  try {
    const rawData = await c.req.json();
    const { lessonId, ...rawUpdates } = rawData;
    if (!lessonId) {
      return c.json({ error: "Lesson ID required" }, 400);
    }
    const existing = await c.env.DB.prepare(
      "SELECT id FROM lessons WHERE id = ?"
    ).bind(String(lessonId)).first();
    if (!existing) {
      return c.json({ error: "Lesson not found" }, 404);
    }
    const allowedFields = [
      "chapter_id",
      "course_id",
      "subject_id",
      "title",
      "slug",
      "description",
      "lesson_type",
      "sort_order",
      "is_preview",
      "duration",
      "video_url",
      "thumbnail_url",
      "document_url"
    ];
    const updates = normalizeKeys(rawUpdates, allowedFields);
    const setClauses = [];
    const setValues = [];
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === "is_preview") {
          setClauses.push(`${key} = ?`);
          setValues.push(value ? 1 : 0);
        } else {
          setClauses.push(`${key} = ?`);
          setValues.push(value);
        }
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = datetime('now')");
    setValues.push(String(lessonId));
    await c.env.DB.prepare(
      `UPDATE lessons SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...setValues).run();
    const updated = await c.env.DB.prepare("SELECT * FROM lessons WHERE id = ?").bind(String(lessonId)).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "UPDATE_LESSON", "lessons", String(lessonId), updates);
    return c.json({ document: updated });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
lessonRoutes.delete("/", async (c) => {
  try {
    const id = c.req.query("id") || c.req.query("lessonId");
    if (!id) {
      return c.json({ error: "Lesson ID required" }, 400);
    }
    await c.env.DB.prepare("DELETE FROM lessons WHERE id = ?").bind(id).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "DELETE_LESSON", "lessons", id);
    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var lessons_default = lessonRoutes;

// src/routes/learning-points.ts
var learningPointRoutes = new Hono2();
learningPointRoutes.use("*", adminAuthMiddleware);
learningPointRoutes.get("/", async (c) => {
  try {
    const courseId = c.req.query("courseId") || "";
    let where = "WHERE 1=1";
    const params = [];
    if (courseId) {
      where += " AND course_id = ?";
      params.push(courseId);
    }
    const result = await c.env.DB.prepare(
      `SELECT * FROM course_learning_points ${where} ORDER BY sort_order ASC`
    ).bind(...params).all();
    return c.json({ documents: result.results, total: result.results.length });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
learningPointRoutes.post("/", async (c) => {
  try {
    const rawData = await c.req.json();
    const allowedFields = ["course_id", "point_text", "sort_order"];
    const data = normalizeKeys(rawData, allowedFields);
    if (!data.course_id) {
      return c.json({ error: "Course ID is required" }, 400);
    }
    if (!data.point_text) {
      return c.json({ error: "Point text is required" }, 400);
    }
    const result = await c.env.DB.prepare(`
      INSERT INTO course_learning_points (course_id, point_text, sort_order)
      VALUES (?, ?, ?)
    `).bind(
      data.course_id,
      data.point_text,
      data.sort_order || 0
    ).run();
    const created = await c.env.DB.prepare(
      "SELECT * FROM course_learning_points WHERE course_id = ? AND point_text = ? ORDER BY created_at DESC LIMIT 1"
    ).bind(data.course_id, data.point_text).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "CREATE_LEARNING_POINT", "course_learning_points", created?.id, data);
    return c.json({ document: created });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
learningPointRoutes.put("/", async (c) => {
  try {
    const rawData = await c.req.json();
    const { id, ...rawUpdates } = rawData;
    if (!id) {
      return c.json({ error: "Learning point ID required" }, 400);
    }
    const existing = await c.env.DB.prepare(
      "SELECT id FROM course_learning_points WHERE id = ?"
    ).bind(Number(id)).first();
    if (!existing) {
      return c.json({ error: "Learning point not found" }, 404);
    }
    const allowedFields = ["point_text", "sort_order"];
    const updates = normalizeKeys(rawUpdates, allowedFields);
    const setClauses = [];
    const setValues = [];
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`);
        setValues.push(value);
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = datetime('now')");
    setValues.push(Number(id));
    await c.env.DB.prepare(
      `UPDATE course_learning_points SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...setValues).run();
    const updated = await c.env.DB.prepare("SELECT * FROM course_learning_points WHERE id = ?").bind(Number(id)).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "UPDATE_LEARNING_POINT", "course_learning_points", String(id), updates);
    return c.json({ document: updated });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
learningPointRoutes.delete("/", async (c) => {
  try {
    const id = c.req.query("id");
    if (!id) {
      return c.json({ error: "Learning point ID required" }, 400);
    }
    await c.env.DB.prepare("DELETE FROM course_learning_points WHERE id = ?").bind(Number(id)).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "DELETE_LEARNING_POINT", "course_learning_points", id);
    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var learning_points_default = learningPointRoutes;

// src/routes/packages.ts
var packageRoutes = new Hono2();
packageRoutes.use("*", adminAuthMiddleware);
packageRoutes.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const courseId = c.req.query("courseId") || "";
    const offset = (page - 1) * limit;
    let where = "WHERE 1=1";
    const params = [];
    if (courseId) {
      where += " AND course_id = ?";
      params.push(courseId);
    }
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM course_packages ${where}`
    ).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(
      `SELECT * FROM course_packages ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();
    return c.json({ documents: result.results, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
packageRoutes.post("/", async (c) => {
  try {
    const data = await c.req.json();
    await c.env.DB.prepare(`
      INSERT INTO course_packages (course_id, package_type, price, duration_months, max_users, is_auto_assign, is_active, created_by, display_name, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.course_id || "",
      data.package_type || "single",
      data.price || 0,
      data.duration_months || 6,
      data.max_users || 1,
      data.is_auto_assign !== void 0 ? data.is_auto_assign ? 1 : 0 : 1,
      data.is_active !== void 0 ? data.is_active ? 1 : 0 : 1,
      data.created_by || null,
      data.display_name || null,
      data.description || null
    ).run();
    const created = await c.env.DB.prepare(
      "SELECT * FROM course_packages WHERE rowid = last_insert_rowid()"
    ).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "CREATE_PACKAGE", "packages", String(created?.id), data);
    return c.json({ document: created });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
packageRoutes.put("/", async (c) => {
  try {
    const data = await c.req.json();
    const packageId = data.packageId || data.id;
    const updates = { ...data };
    delete updates.packageId;
    delete updates.id;
    if (!packageId) {
      return c.json({ error: "Package ID required" }, 400);
    }
    const allowedFields = ["course_id", "package_type", "price", "duration_months", "max_users", "is_auto_assign", "is_active", "display_name", "description"];
    const setClauses = [];
    const setValues = [];
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === "is_auto_assign" || key === "is_active") {
          setClauses.push(`${key} = ?`);
          setValues.push(value ? 1 : 0);
        } else {
          setClauses.push(`${key} = ?`);
          setValues.push(value);
        }
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = datetime('now')");
    setValues.push(String(packageId));
    await c.env.DB.prepare(
      `UPDATE course_packages SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...setValues).run();
    const updated = await c.env.DB.prepare("SELECT * FROM course_packages WHERE id = ?").bind(String(packageId)).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "UPDATE_PACKAGE", "packages", String(packageId), updates);
    return c.json({ document: updated });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
packageRoutes.delete("/", async (c) => {
  try {
    const packageId = c.req.query("id");
    if (!packageId) {
      return c.json({ error: "Package ID required" }, 400);
    }
    await c.env.DB.prepare("DELETE FROM course_packages WHERE id = ?").bind(packageId).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "DELETE_PACKAGE", "packages", packageId);
    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
packageRoutes.delete("/:id", async (c) => {
  try {
    const packageId = c.req.param("id");
    if (!packageId) {
      return c.json({ error: "Package ID required" }, 400);
    }
    await c.env.DB.prepare("DELETE FROM course_packages WHERE id = ?").bind(packageId).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "DELETE_PACKAGE", "packages", packageId);
    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var packages_default = packageRoutes;

// src/routes/enrollments.ts
var enrollmentRoutes = new Hono2();
enrollmentRoutes.use("*", adminAuthMiddleware);
enrollmentRoutes.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const userId = c.req.query("userId") || "";
    const courseId = c.req.query("courseId") || "";
    const offset = (page - 1) * limit;
    let where = "WHERE 1=1";
    const params = [];
    if (userId) {
      where += " AND e.user_id = ?";
      params.push(userId);
    }
    if (courseId) {
      where += " AND e.course_id = ?";
      params.push(courseId);
    }
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM enrollments e ${where}`
    ).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(
      `SELECT e.*, u.full_name as user_name, u.email as user_email, c.title as course_title
       FROM enrollments e
       LEFT JOIN users u ON e.user_id = u.id
       LEFT JOIN courses c ON e.course_id = c.id
       ${where}
       ORDER BY e.created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();
    return c.json({ documents: result.results, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
enrollmentRoutes.delete("/", async (c) => {
  try {
    const enrollmentId = c.req.query("id");
    if (!enrollmentId) {
      return c.json({ error: "Enrollment ID required" }, 400);
    }
    await c.env.DB.prepare("DELETE FROM enrollments WHERE id = ?").bind(enrollmentId).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "DELETE_ENROLLMENT", "enrollments", enrollmentId);
    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var enrollments_default = enrollmentRoutes;

// src/routes/achievements.ts
var achievementRoutes = new Hono2();
achievementRoutes.use("*", adminAuthMiddleware);
achievementRoutes.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const category = c.req.query("category") || "";
    const offset = (page - 1) * limit;
    let where = "WHERE 1=1";
    const params = [];
    if (category) {
      where += " AND ad.category = ?";
      params.push(category);
    }
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM achievement_definitions ad ${where}`
    ).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(
      `SELECT ad.*, 
        (SELECT COUNT(*) FROM student_achievements sa WHERE sa.achievement_id = ad.id) as unlock_count
       FROM achievement_definitions ad
       ${where}
       ORDER BY ad.category, ad.xp ASC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();
    return c.json({ documents: result.results, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
achievementRoutes.post("/", async (c) => {
  try {
    const data = await c.req.json();
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await c.env.DB.prepare(`
      INSERT INTO achievement_definitions (slug, name, name_bn, description, description_bn, category, icon, xp, condition_type, condition_value, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      slug,
      data.name || "",
      data.name_bn || null,
      data.description || "",
      data.description_bn || null,
      data.category || "learning",
      data.icon || "trophy",
      data.xp || 0,
      data.condition_type || "",
      data.condition_value || "",
      data.is_active !== void 0 ? data.is_active ? 1 : 0 : 1
    ).run();
    const created = await c.env.DB.prepare(
      "SELECT * FROM achievement_definitions WHERE rowid = last_insert_rowid()"
    ).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "CREATE_ACHIEVEMENT", "achievements", String(created?.id), data);
    return c.json({ document: created });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
achievementRoutes.put("/", async (c) => {
  try {
    const data = await c.req.json();
    const { achievementId, ...updates } = data;
    if (!achievementId) {
      return c.json({ error: "Achievement ID required" }, 400);
    }
    const allowedFields = ["slug", "name", "name_bn", "description", "description_bn", "category", "icon", "xp", "condition_type", "condition_value", "is_active"];
    const setClauses = [];
    const setValues = [];
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === "is_active") {
          setClauses.push(`${key} = ?`);
          setValues.push(value ? 1 : 0);
        } else {
          setClauses.push(`${key} = ?`);
          setValues.push(value);
        }
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setValues.push(String(achievementId));
    await c.env.DB.prepare(
      `UPDATE achievement_definitions SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...setValues).run();
    const updated = await c.env.DB.prepare("SELECT * FROM achievement_definitions WHERE id = ?").bind(String(achievementId)).first();
    const user = c.get("user");
    await logAudit(c.env, user.id, "UPDATE_ACHIEVEMENT", "achievements", String(achievementId), updates);
    return c.json({ document: updated });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
achievementRoutes.delete("/", async (c) => {
  try {
    const achievementId = c.req.query("id");
    if (!achievementId) {
      return c.json({ error: "Achievement ID required" }, 400);
    }
    await c.env.DB.prepare("DELETE FROM student_achievements WHERE achievement_id = ?").bind(achievementId).run();
    await c.env.DB.prepare("DELETE FROM achievement_definitions WHERE id = ?").bind(achievementId).run();
    const user = c.get("user");
    await logAudit(c.env, user.id, "DELETE_ACHIEVEMENT", "achievements", achievementId);
    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});
var achievements_default = achievementRoutes;

// src/routes/migrate.ts
var migrateRoutes = new Hono2();
async function execIgnore(db, sql) {
  try {
    await db.exec(sql);
    return { sql: sql.substring(0, 80), ok: true };
  } catch (e) {
    const msg = e?.message || String(e);
    if (msg.includes("already exists") || msg.includes("duplicate column name") || msg.includes("UNIQUE constraint failed")) {
      return { sql: sql.substring(0, 80), ok: true, error: `ignored: ${msg}` };
    }
    return { sql: sql.substring(0, 80), ok: false, error: msg };
  }
}
migrateRoutes.post("/", adminAuthMiddleware, async (c) => {
  const user = c.get("user");
  const results = [];
  const createTables = [
    `CREATE TABLE IF NOT EXISTS admin_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, email TEXT NOT NULL, name TEXT, role TEXT DEFAULT 'admin', ip_address TEXT, user_agent TEXT, created_at TEXT DEFAULT (datetime('now')), expires_at TEXT NOT NULL, is_active INTEGER DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '{}', description TEXT, updated_by TEXT, updated_at TEXT DEFAULT (datetime('now')), created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id TEXT, user_id TEXT, user_email TEXT, details TEXT DEFAULT '{}', ip_address TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, full_name TEXT NOT NULL, phone TEXT, bio TEXT, institute_id INTEGER, technology TEXT, semester INTEGER DEFAULT 1, avatar_url TEXT, role TEXT DEFAULT 'student', email_verified INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, enrolled_course_ids TEXT DEFAULT '[]', password_hash TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS courses (id TEXT PRIMARY KEY, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, description TEXT, thumbnail_url TEXT, preview_video_url TEXT, category_id TEXT, instructor_id TEXT, technology_id INTEGER, level TEXT DEFAULT 'beginner', language TEXT DEFAULT 'bangla', duration INTEGER DEFAULT 0, total_videos INTEGER DEFAULT 0, rating REAL DEFAULT 0, total_reviews INTEGER DEFAULT 0, total_students INTEGER DEFAULT 0, price REAL DEFAULT 0, is_featured INTEGER DEFAULT 0, is_published INTEGER DEFAULT 0, tags TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS videos (id TEXT PRIMARY KEY, title TEXT NOT NULL, slug TEXT NOT NULL, description TEXT, course_id TEXT NOT NULL, video_url TEXT, thumbnail_url TEXT, duration INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0, is_preview INTEGER DEFAULT 0, is_published INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS instructors (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, bio TEXT, avatar_url TEXT, cover_url TEXT, specialization TEXT, rating REAL DEFAULT 0, total_students INTEGER DEFAULT 0, total_courses INTEGER DEFAULT 0, social_links TEXT DEFAULT '{}', is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, icon TEXT, color TEXT, parent_id TEXT, sort_order INTEGER DEFAULT 0, course_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS enrollments (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, course_id TEXT NOT NULL, progress REAL DEFAULT 0, completed INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), UNIQUE(user_id, course_id))`,
    `CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT, title TEXT NOT NULL, message TEXT NOT NULL, type TEXT DEFAULT 'info', read INTEGER DEFAULT 0, category TEXT DEFAULT '', action_url TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS institutes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_bn TEXT, division TEXT, district TEXT, eiin_number TEXT, type TEXT DEFAULT 'polytechnic', is_requested INTEGER DEFAULT 0, requested_by TEXT, approved_by TEXT, approved_at TEXT, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS technologies (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_bn TEXT, short_code TEXT, description TEXT, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS institute_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, user_email TEXT, user_name TEXT, institute_name TEXT NOT NULL, institute_name_bn TEXT, division TEXT, district TEXT, status TEXT DEFAULT 'pending', admin_note TEXT, reviewed_by TEXT, reviewed_at TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS course_packages (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id TEXT NOT NULL, package_type TEXT NOT NULL, price REAL NOT NULL, duration_months INTEGER DEFAULT 6, max_users INTEGER DEFAULT 1, is_auto_assign INTEGER DEFAULT 1, is_active INTEGER DEFAULT 1, created_by TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS user_packages (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, package_id INTEGER NOT NULL, course_id TEXT NOT NULL, package_type TEXT NOT NULL, activated_at TEXT NOT NULL, expires_at TEXT NOT NULL, shared_with TEXT, status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS coupons (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, discount_type TEXT NOT NULL, discount_value REAL NOT NULL, max_discount REAL, min_purchase REAL DEFAULT 0, usage_limit INTEGER, usage_count INTEGER DEFAULT 0, per_user_limit INTEGER DEFAULT 1, valid_from TEXT NOT NULL, valid_until TEXT NOT NULL, applicable_courses TEXT, applicable_technologies TEXT, is_active INTEGER DEFAULT 1, created_by TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS discounts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_bn TEXT, description TEXT, discount_type TEXT NOT NULL, discount_value REAL NOT NULL, applicable_type TEXT NOT NULL, applicable_ids TEXT, valid_from TEXT NOT NULL, valid_until TEXT NOT NULL, is_auto_apply INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_by TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, title_bn TEXT, description TEXT, description_bn TEXT, event_type TEXT NOT NULL, banner_url TEXT, start_date TEXT NOT NULL, end_date TEXT, is_featured INTEGER DEFAULT 0, metadata TEXT DEFAULT '{}', is_active INTEGER DEFAULT 1, created_by TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS live_class_schedules (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id TEXT, title TEXT NOT NULL, title_bn TEXT, description TEXT, instructor_id TEXT, technology_id INTEGER, scheduled_at TEXT NOT NULL, duration_minutes INTEGER DEFAULT 60, meeting_url TEXT, platform TEXT DEFAULT 'jitsi', status TEXT DEFAULT 'scheduled', recording_url TEXT, is_active INTEGER DEFAULT 1, created_by TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS notification_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, category TEXT NOT NULL, title TEXT, message TEXT, target_type TEXT, target_id TEXT, sent_count INTEGER DEFAULT 0, failed_count INTEGER DEFAULT 0, metadata TEXT DEFAULT '{}', created_by TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS user_push_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, push_token TEXT NOT NULL, device_type TEXT, device_info TEXT, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS student_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE, email TEXT NOT NULL, name TEXT, device_info TEXT, ip_address TEXT, created_at TEXT DEFAULT (datetime('now')), expires_at TEXT NOT NULL, is_active INTEGER DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS user_2fa (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL UNIQUE, method TEXT DEFAULT 'email', totp_secret TEXT, totp_verified INTEGER DEFAULT 0, backup_codes TEXT, is_enabled INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS payment_config (id INTEGER PRIMARY KEY AUTOINCREMENT, gateway TEXT NOT NULL UNIQUE, is_active INTEGER DEFAULT 0, config TEXT DEFAULT '{}', sandbox_mode INTEGER DEFAULT 1, instructions TEXT, instructions_bn TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, package_id INTEGER, course_id TEXT, amount REAL NOT NULL, currency TEXT DEFAULT 'BDT', gateway TEXT NOT NULL, gateway_trx_id TEXT, gateway_payment_id TEXT, status TEXT DEFAULT 'pending', proof_url TEXT, trx_id_submitted TEXT, phone_submitted TEXT, verified_by TEXT, verified_at TEXT, metadata TEXT DEFAULT '{}', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS notification_preferences (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL UNIQUE, push_enabled INTEGER DEFAULT 1, email_enabled INTEGER DEFAULT 1, sms_enabled INTEGER DEFAULT 0, quiet_hours_start TEXT DEFAULT '22:00', quiet_hours_end TEXT DEFAULT '08:00', course_updates_push INTEGER DEFAULT 1, course_updates_email INTEGER DEFAULT 1, grades_push INTEGER DEFAULT 1, grades_email INTEGER DEFAULT 1, schedule_push INTEGER DEFAULT 1, schedule_email INTEGER DEFAULT 1, payment_push INTEGER DEFAULT 1, payment_email INTEGER DEFAULT 1, promotions_push INTEGER DEFAULT 0, promotions_email INTEGER DEFAULT 0, social_push INTEGER DEFAULT 1, social_email INTEGER DEFAULT 0, system_push INTEGER DEFAULT 1, system_email INTEGER DEFAULT 1, updated_at TEXT DEFAULT (datetime('now')), created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS student_activity (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, activity_type TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id TEXT, title TEXT NOT NULL, description TEXT, metadata TEXT DEFAULT '{}', created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS achievement_definitions (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, name_bn TEXT, description TEXT NOT NULL, description_bn TEXT, category TEXT NOT NULL, icon TEXT DEFAULT 'trophy', xp INTEGER DEFAULT 0, condition_type TEXT NOT NULL, condition_value TEXT NOT NULL, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS student_achievements (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, achievement_id INTEGER NOT NULL, unlocked_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (achievement_id) REFERENCES achievement_definitions(id), UNIQUE(user_id, achievement_id))`,
    `CREATE TABLE IF NOT EXISTS notification_sounds (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, file_url TEXT NOT NULL, is_default INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS user_preferences (user_id TEXT NOT NULL PRIMARY KEY, theme_mode TEXT DEFAULT 'system', accent_color TEXT DEFAULT '#0ea5e9', font_size INTEGER DEFAULT 16, border_radius INTEGER DEFAULT 16, compact_mode INTEGER DEFAULT 0, profile_visibility TEXT DEFAULT 'Friends', search_visible INTEGER DEFAULT 1, show_email INTEGER DEFAULT 0, show_phone INTEGER DEFAULT 0, show_progress INTEGER DEFAULT 1, activity_status INTEGER DEFAULT 1, read_receipts INTEGER DEFAULT 1, data_sharing INTEGER DEFAULT 0, analytics_opt_out INTEGER DEFAULT 0, personalized_recommendations INTEGER DEFAULT 1, cookie_consent TEXT DEFAULT 'essential', content_protection_enabled INTEGER DEFAULT 1, no_copy INTEGER DEFAULT 1, no_right_click INTEGER DEFAULT 1, no_screenshot INTEGER DEFAULT 0, download_quality TEXT DEFAULT '720p', wifi_only INTEGER DEFAULT 0, language TEXT DEFAULT 'bn', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS password_reset_otps (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, otp TEXT NOT NULL, purpose TEXT DEFAULT 'password_reset', expires_at TEXT NOT NULL, used INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS about_stats (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL, value TEXT NOT NULL, icon TEXT DEFAULT 'book-open', sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS about_team (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, role TEXT NOT NULL, avatar_url TEXT, icon TEXT DEFAULT 'users', sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS about_faq (id INTEGER PRIMARY KEY AUTOINCREMENT, question TEXT NOT NULL, answer TEXT NOT NULL, sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS subjects (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, description TEXT, icon TEXT, color TEXT, technology_id INTEGER, sort_order INTEGER DEFAULT 0, course_count INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS course_subjects (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id TEXT NOT NULL, subject_id TEXT NOT NULL, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), UNIQUE(course_id, subject_id))`,
    `CREATE TABLE IF NOT EXISTS course_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id TEXT NOT NULL, category_id TEXT NOT NULL, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), UNIQUE(course_id, category_id))`,
    `CREATE TABLE IF NOT EXISTS course_instructors (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id TEXT NOT NULL, instructor_id TEXT NOT NULL, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), UNIQUE(course_id, instructor_id))`
  ];
  const alterStatements = [
    // categories - parent_id is the known missing column
    `ALTER TABLE categories ADD COLUMN parent_id TEXT`,
    `ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0`,
    `ALTER TABLE categories ADD COLUMN course_count INTEGER DEFAULT 0`,
    `ALTER TABLE categories ADD COLUMN icon TEXT`,
    `ALTER TABLE categories ADD COLUMN color TEXT`,
    // courses - add any potentially missing columns
    `ALTER TABLE courses ADD COLUMN category_id TEXT`,
    `ALTER TABLE courses ADD COLUMN instructor_id TEXT`,
    `ALTER TABLE courses ADD COLUMN technology_id INTEGER`,
    `ALTER TABLE courses ADD COLUMN preview_video_url TEXT`,
    `ALTER TABLE courses ADD COLUMN tags TEXT`,
    `ALTER TABLE courses ADD COLUMN language TEXT DEFAULT 'bangla'`,
    `ALTER TABLE courses ADD COLUMN duration INTEGER DEFAULT 0`,
    `ALTER TABLE courses ADD COLUMN rating REAL DEFAULT 0`,
    `ALTER TABLE courses ADD COLUMN total_reviews INTEGER DEFAULT 0`,
    `ALTER TABLE courses ADD COLUMN total_students INTEGER DEFAULT 0`,
    `ALTER TABLE courses ADD COLUMN total_videos INTEGER DEFAULT 0`,
    // users - add any potentially missing columns
    `ALTER TABLE users ADD COLUMN phone TEXT`,
    `ALTER TABLE users ADD COLUMN bio TEXT`,
    `ALTER TABLE users ADD COLUMN semester INTEGER DEFAULT 1`,
    `ALTER TABLE users ADD COLUMN enrolled_course_ids TEXT DEFAULT '[]'`,
    `ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1`,
    // instructors - add any potentially missing columns
    `ALTER TABLE instructors ADD COLUMN cover_url TEXT`,
    `ALTER TABLE instructors ADD COLUMN specialization TEXT`,
    `ALTER TABLE instructors ADD COLUMN social_links TEXT DEFAULT '{}'`,
    `ALTER TABLE instructors ADD COLUMN rating REAL DEFAULT 0`,
    `ALTER TABLE instructors ADD COLUMN total_students INTEGER DEFAULT 0`,
    `ALTER TABLE instructors ADD COLUMN total_courses INTEGER DEFAULT 0`,
    // videos - add any potentially missing columns
    `ALTER TABLE videos ADD COLUMN slug TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE videos ADD COLUMN thumbnail_url TEXT`,
    `ALTER TABLE videos ADD COLUMN is_preview INTEGER DEFAULT 0`,
    // institutes - add any potentially missing columns
    `ALTER TABLE institutes ADD COLUMN type TEXT DEFAULT 'polytechnic'`,
    `ALTER TABLE institutes ADD COLUMN is_requested INTEGER DEFAULT 0`,
    `ALTER TABLE institutes ADD COLUMN requested_by TEXT`,
    `ALTER TABLE institutes ADD COLUMN approved_by TEXT`,
    `ALTER TABLE institutes ADD COLUMN approved_at TEXT`,
    // notifications - add any potentially missing columns
    `ALTER TABLE notifications ADD COLUMN action_url TEXT`,
    `ALTER TABLE notifications ADD COLUMN type TEXT DEFAULT 'info'`,
    // enrollments - add payment/enrollment-related columns
    `ALTER TABLE enrollments ADD COLUMN package_id INTEGER`,
    `ALTER TABLE enrollments ADD COLUMN expires_at TEXT`,
    `ALTER TABLE enrollments ADD COLUMN status TEXT DEFAULT 'active'`,
    // course_packages - add display name for custom packages
    `ALTER TABLE course_packages ADD COLUMN display_name TEXT`,
    `ALTER TABLE course_packages ADD COLUMN description TEXT`
  ];
  const createIndexes = [
    `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON admin_sessions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_expires ON admin_sessions(expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_config_key ON app_config(key)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
    `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,
    `CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)`,
    `CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug)`,
    `CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id)`,
    `CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published)`,
    `CREATE INDEX IF NOT EXISTS idx_courses_technology ON courses(technology_id)`,
    `CREATE INDEX IF NOT EXISTS idx_videos_course ON videos(course_id)`,
    `CREATE INDEX IF NOT EXISTS idx_videos_order ON videos(course_id, sort_order)`,
    `CREATE INDEX IF NOT EXISTS idx_instructors_active ON instructors(is_active)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug)`,
    `CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read)`,
    `CREATE INDEX IF NOT EXISTS idx_institutes_type ON institutes(type)`,
    `CREATE INDEX IF NOT EXISTS idx_institutes_division ON institutes(division)`,
    `CREATE INDEX IF NOT EXISTS idx_institutes_is_requested ON institutes(is_requested)`,
    `CREATE INDEX IF NOT EXISTS idx_institutes_name ON institutes(name)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_technologies_short_code ON technologies(short_code)`,
    `CREATE INDEX IF NOT EXISTS idx_institute_requests_status ON institute_requests(status)`,
    `CREATE INDEX IF NOT EXISTS idx_institute_requests_user ON institute_requests(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_course_packages_course ON course_packages(course_id)`,
    `CREATE INDEX IF NOT EXISTS idx_course_packages_type ON course_packages(package_type)`,
    `CREATE INDEX IF NOT EXISTS idx_course_packages_active ON course_packages(is_active)`,
    `CREATE INDEX IF NOT EXISTS idx_user_packages_user ON user_packages(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_user_packages_status ON user_packages(status)`,
    `CREATE INDEX IF NOT EXISTS idx_user_packages_expires ON user_packages(expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code)`,
    `CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active)`,
    `CREATE INDEX IF NOT EXISTS idx_coupons_valid ON coupons(valid_from, valid_until)`,
    `CREATE INDEX IF NOT EXISTS idx_discounts_active ON discounts(is_active)`,
    `CREATE INDEX IF NOT EXISTS idx_discounts_valid ON discounts(valid_from, valid_until)`,
    `CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type)`,
    `CREATE INDEX IF NOT EXISTS idx_events_active ON events(is_active)`,
    `CREATE INDEX IF NOT EXISTS idx_events_featured ON events(is_featured)`,
    `CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date)`,
    `CREATE INDEX IF NOT EXISTS idx_live_classes_status ON live_class_schedules(status)`,
    `CREATE INDEX IF NOT EXISTS idx_live_classes_scheduled ON live_class_schedules(scheduled_at)`,
    `CREATE INDEX IF NOT EXISTS idx_live_classes_course ON live_class_schedules(course_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notif_logs_type ON notification_logs(type)`,
    `CREATE INDEX IF NOT EXISTS idx_notif_logs_category ON notification_logs(category)`,
    `CREATE INDEX IF NOT EXISTS idx_notif_logs_created ON notification_logs(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON user_push_tokens(user_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_token ON user_push_tokens(push_token)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_student_sessions_user ON student_sessions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_student_sessions_expires ON student_sessions(expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_user_2fa_user ON user_2fa(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`,
    `CREATE INDEX IF NOT EXISTS idx_payments_gateway ON payments(gateway)`,
    `CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_student_activity_user ON student_activity(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_student_activity_type ON student_activity(activity_type)`,
    `CREATE INDEX IF NOT EXISTS idx_student_activity_created ON student_activity(created_at DESC)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_slug ON achievement_definitions(slug)`,
    `CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievement_definitions(category)`,
    `CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievement_definitions(is_active)`,
    `CREATE INDEX IF NOT EXISTS idx_student_achievements_user ON student_achievements(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_student_achievements_achievement ON student_achievements(achievement_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_user_prefs_user ON user_preferences(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON password_reset_otps(email)`,
    `CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires ON password_reset_otps(expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_password_reset_otps_purpose ON password_reset_otps(purpose)`,
    `CREATE INDEX IF NOT EXISTS idx_about_stats_active ON about_stats(is_active)`,
    `CREATE INDEX IF NOT EXISTS idx_about_stats_order ON about_stats(sort_order)`,
    `CREATE INDEX IF NOT EXISTS idx_about_team_active ON about_team(is_active)`,
    `CREATE INDEX IF NOT EXISTS idx_about_team_order ON about_team(sort_order)`,
    `CREATE INDEX IF NOT EXISTS idx_about_faq_active ON about_faq(is_active)`,
    `CREATE INDEX IF NOT EXISTS idx_about_faq_order ON about_faq(sort_order)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_slug ON subjects(slug)`,
    `CREATE INDEX IF NOT EXISTS idx_subjects_technology ON subjects(technology_id)`,
    `CREATE INDEX IF NOT EXISTS idx_subjects_active ON subjects(is_active)`,
    `CREATE INDEX IF NOT EXISTS idx_course_subjects_course ON course_subjects(course_id)`,
    `CREATE INDEX IF NOT EXISTS idx_course_subjects_subject ON course_subjects(subject_id)`,
    `CREATE INDEX IF NOT EXISTS idx_course_categories_course ON course_categories(course_id)`,
    `CREATE INDEX IF NOT EXISTS idx_course_categories_category ON course_categories(category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_course_instructors_course ON course_instructors(course_id)`,
    `CREATE INDEX IF NOT EXISTS idx_course_instructors_instructor ON course_instructors(instructor_id)`
  ];
  const seedStatements = [
    `INSERT OR IGNORE INTO app_config (key, value, description) VALUES ('app_settings', '{"appName":"DAKKHO","maintenanceMode":false,"maxUploadSize":500,"defaultLanguage":"bn"}', 'General app settings')`,
    `INSERT OR IGNORE INTO app_config (key, value, description) VALUES ('streaming', '{"defaultQuality":"720p","maxConcurrentStreams":3,"enableDVR":true,"enableChat":true}', 'Streaming config')`,
    `INSERT OR IGNORE INTO app_config (key, value, description) VALUES ('notifications', '{"pushEnabled":true,"emailEnabled":true,"smsEnabled":false}', 'Notification settings')`,
    `INSERT OR IGNORE INTO app_config (key, value, description) VALUES ('features', '{"enableCourses":true,"enableLiveClasses":true,"enableQuizzes":true,"enableCertificates":true,"enableLeaderboard":true}', 'Feature flags')`,
    `INSERT OR IGNORE INTO payment_config (gateway, is_active, config, sandbox_mode, instructions, instructions_bn) VALUES ('manual', 1, '{}', 0, 'Send payment via bKash/Nagad to 01XXXXXXXXX and submit your Transaction ID below.', 'bKash/Nagad \u098F 01XXXXXXXXX \u09A8\u09AE\u09CD\u09AC\u09B0\u09C7 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AA\u09BE\u09A0\u09BF\u09AF\u09BC\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 Transaction ID \u09A8\u09BF\u099A\u09C7 \u099C\u09AE\u09BE \u09A6\u09BF\u09A8\u0964')`,
    `INSERT OR IGNORE INTO payment_config (gateway, is_active, config, sandbox_mode, instructions, instructions_bn) VALUES ('sslcommerz', 0, '{}', 1, NULL, NULL)`,
    `INSERT OR IGNORE INTO payment_config (gateway, is_active, config, sandbox_mode, instructions, instructions_bn) VALUES ('bkash', 0, '{}', 1, NULL, NULL)`,
    `INSERT OR IGNORE INTO payment_config (gateway, is_active, config, sandbox_mode, instructions, instructions_bn) VALUES ('piprapay', 0, '{"api_key":"","base_url":"https://pay.dakkho.pro.bd"}', 0, 'Click "Pay Now" to pay via bKash/Nagad/Rocket automatically through PipraPay.', 'PipraPay \u098F\u09B0 \u09AE\u09BE\u09A7\u09CD\u09AF\u09AE\u09C7 "Pay Now" \u0995\u09CD\u09B2\u09BF\u0995 \u0995\u09B0\u09C7 bKash/Nagad/Rocket \u098F \u0985\u099F\u09CB\u09AE\u09C7\u099F\u09BF\u0995 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u0995\u09B0\u09C1\u09A8\u0964')`,
    `INSERT OR IGNORE INTO technologies (name, name_bn, short_code, description, is_active) VALUES ('Civil Technology', '\u09B8\u09BF\u09AD\u09BF\u09B2 \u099F\u09C7\u0995\u09A8\u09CB\u09B2\u099C\u09BF', 'CT', 'Civil Engineering Technology', 1)`,
    `INSERT OR IGNORE INTO technologies (name, name_bn, short_code, description, is_active) VALUES ('Computer Science & Technology', '\u0995\u09AE\u09CD\u09AA\u09BF\u0989\u099F\u09BE\u09B0 \u09B8\u09BE\u09AF\u09BC\u09C7\u09A8\u09CD\u09B8 \u0985\u09CD\u09AF\u09BE\u09A8\u09CD\u09A1 \u099F\u09C7\u0995\u09A8\u09CB\u09B2\u099C\u09BF', 'CST', 'Computer Science and Technology', 1)`,
    `INSERT OR IGNORE INTO technologies (name, name_bn, short_code, description, is_active) VALUES ('Electrical Technology', '\u0987\u09B2\u09C7\u0995\u099F\u09CD\u09B0\u09BF\u0995\u09CD\u09AF\u09BE\u09B2 \u099F\u09C7\u0995\u09A8\u09CB\u09B2\u099C\u09BF', 'ET', 'Electrical Engineering Technology', 1)`,
    `INSERT OR IGNORE INTO technologies (name, name_bn, short_code, description, is_active) VALUES ('Electro Medical Technology', '\u0987\u09B2\u09C7\u0995\u09CD\u099F\u09CD\u09B0\u09CB \u09AE\u09C7\u09A1\u09BF\u0995\u09CD\u09AF\u09BE\u09B2 \u099F\u09C7\u0995\u09A8\u09CB\u09B2\u099C\u09BF', 'EMT', 'Electro Medical Technology', 1)`,
    `INSERT OR IGNORE INTO technologies (name, name_bn, short_code, description, is_active) VALUES ('Electronics Technology', '\u0987\u09B2\u09C7\u0995\u099F\u09CD\u09B0\u09A8\u09BF\u0995\u09CD\u09B8 \u099F\u09C7\u0995\u09A8\u09CB\u09B2\u099C\u09BF', 'EnT', 'Electronics Engineering Technology', 1)`,
    `INSERT OR IGNORE INTO technologies (name, name_bn, short_code, description, is_active) VALUES ('Mechanical Technology', '\u09AE\u09C7\u0995\u09BE\u09A8\u09BF\u0995\u09CD\u09AF\u09BE\u09B2 \u099F\u09C7\u0995\u09A8\u09CB\u09B2\u099C\u09BF', 'MT', 'Mechanical Engineering Technology', 1)`,
    `INSERT OR IGNORE INTO technologies (name, name_bn, short_code, description, is_active) VALUES ('Power Technology', '\u09AA\u09BE\u0993\u09AF\u09BC\u09BE\u09B0 \u099F\u09C7\u0995\u09A8\u09CB\u09B2\u099C\u09BF', 'PT', 'Power Engineering Technology', 1)`,
    `INSERT OR IGNORE INTO achievement_definitions (slug, name, name_bn, description, description_bn, category, icon, xp, condition_type, condition_value) VALUES ('first-course', 'First Course', '\u09AA\u09CD\u09B0\u09A5\u09AE \u0995\u09CB\u09B0\u09CD\u09B8', 'Enroll in your first course', '\u09AA\u09CD\u09B0\u09A5\u09AE \u0995\u09CB\u09B0\u09CD\u09B8\u09C7 \u09AD\u09B0\u09CD\u09A4\u09BF \u09B9\u09A8', 'learning', 'book-open', 50, 'enrollment_count', '1')`,
    `INSERT OR IGNORE INTO achievement_definitions (slug, name, name_bn, description, description_bn, category, icon, xp, condition_type, condition_value) VALUES ('quick-learner', 'Quick Learner', '\u09A6\u09CD\u09B0\u09C1\u09A4 \u09B6\u09BF\u0995\u09CD\u09B7\u09BE\u09B0\u09CD\u09A5\u09C0', 'Complete 3 courses', '\u09E9\u099F\u09BF \u0995\u09CB\u09B0\u09CD\u09B8 \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u0995\u09B0\u09C1\u09A8', 'learning', 'zap', 150, 'completion_count', '3')`,
    `INSERT OR IGNORE INTO achievement_definitions (slug, name, name_bn, description, description_bn, category, icon, xp, condition_type, condition_value) VALUES ('top-student', 'Top Student', '\u09B6\u09C0\u09B0\u09CD\u09B7 \u09B6\u09BF\u0995\u09CD\u09B7\u09BE\u09B0\u09CD\u09A5\u09C0', 'Appear in top 10 leaderboard', '\u09B2\u09BF\u09A1\u09BE\u09B0\u09AC\u09CB\u09B0\u09CD\u09A1\u09C7 \u09B6\u09C0\u09B0\u09CD\u09B7 \u09E7\u09E6-\u098F \u0989\u09AA\u09B8\u09CD\u09A5\u09BF\u09A4 \u09B9\u09A8', 'learning', 'crown', 300, 'leaderboard_rank', '10')`,
    `INSERT OR IGNORE INTO achievement_definitions (slug, name, name_bn, description, description_bn, category, icon, xp, condition_type, condition_value) VALUES ('week-streak', 'Week Warrior', '\u09B8\u09AA\u09CD\u09A4\u09BE\u09B9 \u09AF\u09CB\u09A6\u09CD\u09A7\u09BE', '7-day learning streak', '\u09ED \u09A6\u09BF\u09A8\u09C7\u09B0 \u09B2\u09BE\u09B0\u09CD\u09A8\u09BF\u0982 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0995', 'streaks', 'flame', 100, 'streak_days', '7')`,
    `INSERT OR IGNORE INTO achievement_definitions (slug, name, name_bn, description, description_bn, category, icon, xp, condition_type, condition_value) VALUES ('month-streak', 'Monthly Master', '\u09AE\u09BE\u09B8\u09BF\u0995 \u09AE\u09BE\u09B8\u09CD\u099F\u09BE\u09B0', '30-day learning streak', '\u09E9\u09E6 \u09A6\u09BF\u09A8\u09C7\u09B0 \u09B2\u09BE\u09B0\u09CD\u09A8\u09BF\u0982 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0995', 'streaks', 'flame', 500, 'streak_days', '30')`,
    `INSERT OR IGNORE INTO achievement_definitions (slug, name, name_bn, description, description_bn, category, icon, xp, condition_type, condition_value) VALUES ('social-butterfly', 'Social Butterfly', '\u09B8\u09BE\u09AE\u09BE\u099C\u09BF\u0995 \u09AA\u09CD\u09B0\u099C\u09BE\u09AA\u09A4\u09BF', 'Join 3 study groups', '\u09E9\u099F\u09BF \u09B8\u09CD\u099F\u09BE\u09A1\u09BF \u0997\u09CD\u09B0\u09C1\u09AA\u09C7 \u09AF\u09CB\u0997 \u09A6\u09BF\u09A8', 'social', 'users', 75, 'group_count', '3')`,
    `INSERT OR IGNORE INTO achievement_definitions (slug, name, name_bn, description, description_bn, category, icon, xp, condition_type, condition_value) VALUES ('helper', 'Helpful Hand', '\u09B8\u09BE\u09B9\u09BE\u09AF\u09CD\u09AF\u0995\u09BE\u09B0\u09C0', 'Answer 10 questions', '\u09E7\u09E6\u099F\u09BF \u09AA\u09CD\u09B0\u09B6\u09CD\u09A8\u09C7\u09B0 \u0989\u09A4\u09CD\u09A4\u09B0 \u09A6\u09BF\u09A8', 'social', 'heart', 200, 'answer_count', '10')`,
    `INSERT OR IGNORE INTO achievement_definitions (slug, name, name_bn, description, description_bn, category, icon, xp, condition_type, condition_value) VALUES ('early-bird', 'Early Bird', '\u09AA\u09CD\u09B0\u09BE\u09A5\u09AE\u09BF\u0995 \u09AA\u09BE\u0996\u09BF', 'Join DAKKHO in first month', '\u09AA\u09CD\u09B0\u09A5\u09AE \u09AE\u09BE\u09B8\u09C7 DAKKHO-\u09A4\u09C7 \u09AF\u09CB\u0997 \u09A6\u09BF\u09A8', 'special', 'sunrise', 25, 'early_joiner', '1')`,
    `INSERT OR IGNORE INTO achievement_definitions (slug, name, name_bn, description, description_bn, category, icon, xp, condition_type, condition_value) VALUES ('certified', 'Certified Learner', '\u09AA\u09CD\u09B0\u09A4\u09CD\u09AF\u09AF\u09BC\u09BF\u09A4 \u09B6\u09BF\u0995\u09CD\u09B7\u09BE\u09B0\u09CD\u09A5\u09C0', 'Earn your first certificate', '\u09AA\u09CD\u09B0\u09A5\u09AE \u09B8\u09BE\u09B0\u09CD\u099F\u09BF\u09AB\u09BF\u0995\u09C7\u099F \u0985\u09B0\u09CD\u099C\u09A8 \u0995\u09B0\u09C1\u09A8', 'learning', 'award', 100, 'certificate_count', '1')`,
    `INSERT OR IGNORE INTO users (id, email, full_name, role, password_hash, is_active, email_verified) VALUES ('admin-001', 'admin@dakkho.pro.bd', 'DAKKHO Admin', 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 1, 1)`,
    `INSERT OR IGNORE INTO users (id, email, full_name, role, password_hash, is_active, email_verified) VALUES ('admin-002', 'himadrient@proton.me', 'DAKKHO Super Admin', 'super_admin', '1e93e5062e163f49c088f163cf93b702948533c8f905c8dcf24bf9156c0dfe03', 1, 1)`,
    // About page seed data
    `INSERT OR IGNORE INTO app_config (key, value, description) VALUES ('about_content', '{"aboutText":"DAKKHO is Bangladesh''s premier online learning platform built exclusively for polytechnic students. We provide high-quality video courses aligned with the BTEB curriculum, covering all major technologies from Web Development and Electronics to Civil Engineering and Architecture. Our platform connects students with expert instructors from across the country, making quality technical education accessible regardless of location or financial background.","missionText":"To democratize technical education in Bangladesh by providing world-class learning experiences to every polytechnic student. We believe that geographical boundaries or financial constraints should never be barriers to quality education. Through technology, community, and dedicated instructors, we are building the future skilled workforce of Bangladesh.","contactEmail":"support@dakkho.com.bd","contactPhone1":"+8809638113227","contactPhone2":"+8801632373707","contactAddress":"Radhaballav Road near DPHE, Rangpur","missionValues":["Accessible Education","Quality Content","Student First","Innovation"]}', 'About page content (text, mission, contact)')`,
    `INSERT OR IGNORE INTO about_stats (label, value, icon, sort_order, is_active) VALUES ('Courses', '50+', 'book-open', 1, 1)`,
    `INSERT OR IGNORE INTO about_stats (label, value, icon, sort_order, is_active) VALUES ('Students', '10K+', 'graduation-cap', 2, 1)`,
    `INSERT OR IGNORE INTO about_stats (label, value, icon, sort_order, is_active) VALUES ('Instructors', '50+', 'users', 3, 1)`,
    `INSERT OR IGNORE INTO about_stats (label, value, icon, sort_order, is_active) VALUES ('Institutes', '58', 'building-2', 4, 1)`,
    `INSERT OR IGNORE INTO about_team (name, role, icon, sort_order, is_active) VALUES ('Engr. Aminul Islam', 'Founder & CEO', 'graduation-cap', 1, 1)`,
    `INSERT OR IGNORE INTO about_team (name, role, icon, sort_order, is_active) VALUES ('Dr. Nadia Rahman', 'Chief Academic Officer', 'book-open', 2, 1)`,
    `INSERT OR IGNORE INTO about_team (name, role, icon, sort_order, is_active) VALUES ('Fahim Shahriar', 'Lead Developer', 'globe', 3, 1)`,
    `INSERT OR IGNORE INTO about_team (name, role, icon, sort_order, is_active) VALUES ('Sumaiya Khan', 'Head of Content', 'sparkles', 4, 1)`,
    `INSERT OR IGNORE INTO about_faq (question, answer, sort_order, is_active) VALUES ('What is DAKKHO?', 'DAKKHO is a comprehensive online learning platform designed specifically for polytechnic students in Bangladesh. We offer video courses, live sessions, assignments, and certifications aligned with the BTEB curriculum.', 1, 1)`,
    `INSERT OR IGNORE INTO about_faq (question, answer, sort_order, is_active) VALUES ('Is DAKKHO free to use?', 'Many courses on DAKKHO are completely free. Premium courses are available at affordable prices with financial aid options for deserving students. We believe quality education should be accessible to everyone.', 2, 1)`,
    `INSERT OR IGNORE INTO about_faq (question, answer, sort_order, is_active) VALUES ('How do I earn certificates?', 'Complete a course and pass all assignments with the required grade to earn a certificate. Certificates are digital and can be downloaded or shared directly from your profile.', 3, 1)`,
    `INSERT OR IGNORE INTO about_faq (question, answer, sort_order, is_active) VALUES ('Can I access courses offline?', 'Yes! You can download courses for offline viewing through our Downloads feature. Downloaded content is available without an internet connection for up to 30 days.', 4, 1)`,
    `INSERT OR IGNORE INTO about_faq (question, answer, sort_order, is_active) VALUES ('Who are the instructors?', 'Our instructors are experienced educators and industry professionals from polytechnic institutes across Bangladesh. They are vetted and trained to deliver high-quality, engaging content.', 5, 1)`,
    `INSERT OR IGNORE INTO about_faq (question, answer, sort_order, is_active) VALUES ('How do I get help if I am stuck?', 'Use the Discussion section to ask questions, join live Q&A sessions with instructors, or reach out to our support team via email or phone. We are here to help you succeed.', 6, 1)`
  ];
  for (const sql of createTables) {
    results.push(await execIgnore(c.env.DB, sql));
  }
  for (const sql of alterStatements) {
    results.push(await execIgnore(c.env.DB, sql));
  }
  for (const sql of createIndexes) {
    results.push(await execIgnore(c.env.DB, sql));
  }
  for (const sql of seedStatements) {
    results.push(await execIgnore(c.env.DB, sql));
  }
  try {
    const coursesWithoutPackages = await c.env.DB.prepare(`
      SELECT c.id, c.price FROM courses c
      WHERE c.is_published = 1 AND c.id NOT IN (
        SELECT DISTINCT course_id FROM course_packages
      )
    `).all();
    for (const course of coursesWithoutPackages.results) {
      const courseId = course.id;
      const coursePrice = course.price || 0;
      const existingPackages = await c.env.DB.prepare(
        "SELECT id FROM course_packages WHERE course_id = ? AND is_active = 1"
      ).bind(courseId).all();
      if (existingPackages.results.length > 0) {
        results.push({ sql: `Skipping auto-package for course ${courseId} (already has ${existingPackages.results.length} packages)`, ok: true });
        continue;
      }
      await c.env.DB.prepare(`
        INSERT INTO course_packages (course_id, package_type, price, duration_months, max_users, is_auto_assign, is_active, created_by, display_name, description)
        VALUES (?, 'single', ?, 6, 1, 1, 1, 'migration', 'Single', '1 \u099C\u09A8 \u0987\u0989\u099C\u09BE\u09B0\u09C7\u09B0 \u099C\u09A8\u09CD\u09AF')
      `).bind(courseId, coursePrice).run();
      const duoPackPrice = Math.round(coursePrice * 1.15);
      await c.env.DB.prepare(`
        INSERT INTO course_packages (course_id, package_type, price, duration_months, max_users, is_auto_assign, is_active, created_by, display_name, description)
        VALUES (?, 'dual', ?, 6, 2, 1, 1, 'migration', 'Duo', '2 \u099C\u09A8 \u0987\u0989\u099C\u09BE\u09B0\u09C7\u09B0 \u099C\u09A8\u09CD\u09AF \u2014 \u09AC\u09A8\u09CD\u09A7\u09C1\u0995\u09C7 \u09B6\u09C7\u09AF\u09BC\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8!')
      `).bind(courseId, duoPackPrice).run();
      results.push({ sql: `Auto-package for course ${courseId}`, ok: true });
    }
  } catch (autoPkgErr) {
    results.push({ sql: "Auto-package creation", ok: false, error: String(autoPkgErr) });
  }
  await logAudit(c.env, user.id, "RUN_MIGRATION", "system", void 0, {
    totalStatements: results.length,
    failed: results.filter((r) => !r.ok).length
  });
  const failed = results.filter((r) => !r.ok);
  const ignored = results.filter((r) => r.error?.startsWith("ignored:"));
  return c.json({
    success: failed.length === 0,
    message: `Migration complete: ${results.length} statements, ${ignored.length} ignored (already exists), ${failed.length} failed`,
    totalStatements: results.length,
    ignoredCount: ignored.length,
    failedCount: failed.length,
    failedStatements: failed.map((r) => ({ sql: r.sql, error: r.error })),
    results: results.map((r) => ({ sql: r.sql, ok: r.ok, error: r.error }))
  });
});
migrateRoutes.get("/", adminAuthMiddleware, async (c) => {
  try {
    const tables = await c.env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all();
    const tableInfo = {};
    for (const table of tables.results) {
      const tableName = table.name;
      if (tableName.startsWith("_cf_")) continue;
      try {
        const cols = await c.env.DB.prepare(`PRAGMA table_info('${tableName}')`).all();
        tableInfo[tableName] = cols.results.map((c2) => `${c2.name} (${c2.type})`);
      } catch {
        tableInfo[tableName] = ["ERROR reading columns"];
      }
    }
    return c.json({
      tableCount: tables.results.length,
      tables: tableInfo
    });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});
var migrate_default = migrateRoutes;

// src/routes/watch-history.ts
var watchHistoryRoutes = new Hono2();
watchHistoryRoutes.use("*", studentAuthMiddleware);
watchHistoryRoutes.get("/", async (c) => {
  try {
    const userId = c.get("studentId");
    const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);
    const offset = parseInt(c.req.query("offset") || "0");
    const { results } = await c.env.DB.prepare(
      `SELECT
        sa.id,
        sa.resource_id AS video_id,
        sa.title AS video_title,
        sa.metadata,
        sa.created_at AS watched_at,
        v.course_id,
        v.duration AS video_duration,
        v.thumbnail_url AS video_thumbnail,
        c.title AS course_name,
        c.thumbnail_url AS course_thumbnail
      FROM student_activity sa
      LEFT JOIN videos v ON v.id = sa.resource_id
      LEFT JOIN courses c ON c.id = v.course_id
      WHERE sa.user_id = ? AND sa.activity_type = 'watch'
      ORDER BY sa.created_at DESC
      LIMIT ? OFFSET ?`
    ).bind(userId, limit, offset).all();
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM student_activity WHERE user_id = ? AND activity_type = 'watch'`
    ).bind(userId).first();
    const history = results.map((row) => {
      let metadata = {};
      try {
        metadata = row.metadata ? JSON.parse(row.metadata) : {};
      } catch {
      }
      return {
        id: row.id,
        videoId: row.video_id,
        videoTitle: row.video_title || "",
        courseId: row.course_id || "",
        courseName: row.course_name || "",
        watchedAt: row.watched_at,
        progress: metadata.progress || 0,
        lastPosition: metadata.lastPosition || 0,
        duration: row.video_duration || metadata.duration || 0,
        videoThumbnail: row.video_thumbnail || "",
        courseThumbnail: row.course_thumbnail || ""
      };
    });
    return c.json({
      history,
      total: countResult?.total || 0,
      limit,
      offset
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Watch history GET error:", error);
    return c.json({ error: message }, 500);
  }
});
watchHistoryRoutes.post("/", async (c) => {
  try {
    const userId = c.get("studentId");
    const body = await c.req.json();
    if (!body.videoId) {
      return c.json({ error: "videoId is required" }, 400);
    }
    const id = generateId();
    const metadata = JSON.stringify({
      progress: body.progress || 0,
      lastPosition: body.lastPosition || 0,
      duration: body.duration || 0,
      courseId: body.courseId || ""
    });
    const existing = await c.env.DB.prepare(
      `SELECT id FROM student_activity WHERE user_id = ? AND activity_type = 'watch' AND resource_id = ?`
    ).bind(userId, body.videoId).first();
    if (existing) {
      await c.env.DB.prepare(
        `UPDATE student_activity
         SET title = ?, metadata = ?, created_at = datetime('now')
         WHERE id = ?`
      ).bind(body.videoTitle || "", metadata, existing.id).run();
      return c.json({
        success: true,
        id: existing.id,
        action: "updated"
      });
    }
    await c.env.DB.prepare(
      `INSERT INTO student_activity (id, user_id, activity_type, resource_type, resource_id, title, description, metadata, created_at)
       VALUES (?, ?, 'watch', 'video', ?, ?, '', ?, datetime('now'))`
    ).bind(id, userId, body.videoId, body.videoTitle || "", metadata).run();
    return c.json({
      success: true,
      id,
      action: "created"
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Watch history POST error:", error);
    return c.json({ error: message }, 500);
  }
});
watchHistoryRoutes.delete("/", async (c) => {
  try {
    const userId = c.get("studentId");
    const result = await c.env.DB.prepare(
      `DELETE FROM student_activity WHERE user_id = ? AND activity_type = 'watch'`
    ).bind(userId).run();
    return c.json({
      success: true,
      deleted: result.meta?.changes || 0
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Watch history DELETE all error:", error);
    return c.json({ error: message }, 500);
  }
});
watchHistoryRoutes.delete("/:id", async (c) => {
  try {
    const userId = c.get("studentId");
    const entryId = c.req.param("id");
    const result = await c.env.DB.prepare(
      `DELETE FROM student_activity WHERE id = ? AND user_id = ? AND activity_type = 'watch'`
    ).bind(entryId, userId).run();
    if (!result.meta?.changes) {
      return c.json({ error: "History entry not found" }, 404);
    }
    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Watch history DELETE single error:", error);
    return c.json({ error: message }, 500);
  }
});
var watch_history_default = watchHistoryRoutes;

// src/routes/about.ts
var DEFAULT_ABOUT_CONTENT = {
  aboutText: "DAKKHO is Bangladesh's premier online learning platform built exclusively for polytechnic students. We provide high-quality video courses aligned with the BTEB curriculum, covering all major technologies from Web Development and Electronics to Civil Engineering and Architecture. Our platform connects students with expert instructors from across the country, making quality technical education accessible regardless of location or financial background.",
  missionText: "To democratize technical education in Bangladesh by providing world-class learning experiences to every polytechnic student. We believe that geographical boundaries or financial constraints should never be barriers to quality education. Through technology, community, and dedicated instructors, we are building the future skilled workforce of Bangladesh.",
  contactEmail: "support@dakkho.com.bd",
  contactPhone1: "+8809638113227",
  contactPhone2: "+8801632373707",
  contactAddress: "Radhaballav Road near DPHE, Rangpur",
  missionValues: ["Accessible Education", "Quality Content", "Student First", "Innovation"]
};
var aboutPublicRoutes = new Hono2();
aboutPublicRoutes.get("/", async (c) => {
  try {
    const cached = await c.env.KV_CONFIG.get("about_page_data", "json");
    if (cached) {
      return c.json(cached);
    }
    const data = await fetchAboutData(c.env);
    await c.env.KV_CONFIG.put("about_page_data", JSON.stringify(data), { expirationTtl: 300 });
    return c.json(data);
  } catch (error) {
    return c.json({
      content: DEFAULT_ABOUT_CONTENT,
      stats: [],
      team: [],
      faq: []
    });
  }
});
var aboutAdminRoutes = new Hono2();
aboutAdminRoutes.use("*", adminAuthMiddleware);
aboutAdminRoutes.get("/", async (c) => {
  try {
    const data = await fetchAboutData(c.env);
    return c.json(data);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
aboutAdminRoutes.put("/content", async (c) => {
  try {
    const body = await c.req.json();
    const content = {
      aboutText: body.aboutText || DEFAULT_ABOUT_CONTENT.aboutText,
      missionText: body.missionText || DEFAULT_ABOUT_CONTENT.missionText,
      contactEmail: body.contactEmail || DEFAULT_ABOUT_CONTENT.contactEmail,
      contactPhone1: body.contactPhone1 || DEFAULT_ABOUT_CONTENT.contactPhone1,
      contactPhone2: body.contactPhone2 || DEFAULT_ABOUT_CONTENT.contactPhone2,
      contactAddress: body.contactAddress || DEFAULT_ABOUT_CONTENT.contactAddress,
      missionValues: body.missionValues || DEFAULT_ABOUT_CONTENT.missionValues
    };
    await c.env.DB.prepare(
      `INSERT INTO app_config (key, value, updated_at) VALUES ('about_content', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).bind(JSON.stringify(content)).run();
    await c.env.KV_CONFIG.delete("about_page_data");
    const user = c.get("user");
    await logAudit(c.env, user.id, "UPDATE_ABOUT_CONTENT", "about", void 0, content);
    return c.json({ success: true, content });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
aboutAdminRoutes.get("/stats", async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT * FROM about_stats ORDER BY sort_order ASC"
    ).all();
    return c.json({ stats: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
aboutAdminRoutes.post("/stats", async (c) => {
  try {
    const { label, value, icon, sortOrder, isActive } = await c.req.json();
    if (!label || !value) {
      return c.json({ error: "label and value are required" }, 400);
    }
    const result = await c.env.DB.prepare(
      `INSERT INTO about_stats (label, value, icon, sort_order, is_active) VALUES (?, ?, ?, ?, ?)`
    ).bind(label, value, icon || "book-open", sortOrder || 0, isActive !== void 0 ? isActive ? 1 : 0 : 1).run();
    await invalidateAboutCache(c.env);
    const user = c.get("user");
    await logAudit(c.env, user.id, "CREATE_ABOUT_STAT", "about_stats", void 0, { label, value });
    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
aboutAdminRoutes.put("/stats", async (c) => {
  try {
    const { id, label, value, icon, sortOrder, isActive } = await c.req.json();
    if (!id) {
      return c.json({ error: "id is required" }, 400);
    }
    const updates = [];
    const params = [];
    if (label !== void 0) {
      updates.push("label = ?");
      params.push(label);
    }
    if (value !== void 0) {
      updates.push("value = ?");
      params.push(value);
    }
    if (icon !== void 0) {
      updates.push("icon = ?");
      params.push(icon);
    }
    if (sortOrder !== void 0) {
      updates.push("sort_order = ?");
      params.push(sortOrder);
    }
    if (isActive !== void 0) {
      updates.push("is_active = ?");
      params.push(isActive ? 1 : 0);
    }
    if (updates.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }
    updates.push("updated_at = datetime('now')");
    params.push(id);
    await c.env.DB.prepare(
      `UPDATE about_stats SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    await invalidateAboutCache(c.env);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
aboutAdminRoutes.delete("/stats", async (c) => {
  try {
    const urlId = c.req.query("id");
    let id = urlId ? Number(urlId) : void 0;
    if (!id) {
      try {
        const body = await c.req.json();
        id = body?.id;
      } catch {
      }
    }
    if (!id) {
      return c.json({ error: "id is required" }, 400);
    }
    await c.env.DB.prepare("DELETE FROM about_stats WHERE id = ?").bind(id).run();
    await invalidateAboutCache(c.env);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
aboutAdminRoutes.get("/team", async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT * FROM about_team ORDER BY sort_order ASC"
    ).all();
    return c.json({ team: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
aboutAdminRoutes.post("/team", async (c) => {
  try {
    const { name, role, avatarUrl, icon, sortOrder, isActive } = await c.req.json();
    if (!name || !role) {
      return c.json({ error: "name and role are required" }, 400);
    }
    const result = await c.env.DB.prepare(
      `INSERT INTO about_team (name, role, avatar_url, icon, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(name, role, avatarUrl || null, icon || "users", sortOrder || 0, isActive !== void 0 ? isActive ? 1 : 0 : 1).run();
    await invalidateAboutCache(c.env);
    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
aboutAdminRoutes.put("/team", async (c) => {
  try {
    const { id, name, role, avatarUrl, icon, sortOrder, isActive } = await c.req.json();
    if (!id) {
      return c.json({ error: "id is required" }, 400);
    }
    const updates = [];
    const params = [];
    if (name !== void 0) {
      updates.push("name = ?");
      params.push(name);
    }
    if (role !== void 0) {
      updates.push("role = ?");
      params.push(role);
    }
    if (avatarUrl !== void 0) {
      updates.push("avatar_url = ?");
      params.push(avatarUrl);
    }
    if (icon !== void 0) {
      updates.push("icon = ?");
      params.push(icon);
    }
    if (sortOrder !== void 0) {
      updates.push("sort_order = ?");
      params.push(sortOrder);
    }
    if (isActive !== void 0) {
      updates.push("is_active = ?");
      params.push(isActive ? 1 : 0);
    }
    if (updates.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }
    updates.push("updated_at = datetime('now')");
    params.push(id);
    await c.env.DB.prepare(
      `UPDATE about_team SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    await invalidateAboutCache(c.env);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
aboutAdminRoutes.delete("/team", async (c) => {
  try {
    const urlId = c.req.query("id");
    let id = urlId ? Number(urlId) : void 0;
    if (!id) {
      try {
        const body = await c.req.json();
        id = body?.id;
      } catch {
      }
    }
    if (!id) {
      return c.json({ error: "id is required" }, 400);
    }
    await c.env.DB.prepare("DELETE FROM about_team WHERE id = ?").bind(id).run();
    await invalidateAboutCache(c.env);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
aboutAdminRoutes.get("/faq", async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT * FROM about_faq ORDER BY sort_order ASC"
    ).all();
    return c.json({ faq: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
aboutAdminRoutes.post("/faq", async (c) => {
  try {
    const { question, answer, sortOrder, isActive } = await c.req.json();
    if (!question || !answer) {
      return c.json({ error: "question and answer are required" }, 400);
    }
    const result = await c.env.DB.prepare(
      `INSERT INTO about_faq (question, answer, sort_order, is_active) VALUES (?, ?, ?, ?)`
    ).bind(question, answer, sortOrder || 0, isActive !== void 0 ? isActive ? 1 : 0 : 1).run();
    await invalidateAboutCache(c.env);
    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
aboutAdminRoutes.put("/faq", async (c) => {
  try {
    const { id, question, answer, sortOrder, isActive } = await c.req.json();
    if (!id) {
      return c.json({ error: "id is required" }, 400);
    }
    const updates = [];
    const params = [];
    if (question !== void 0) {
      updates.push("question = ?");
      params.push(question);
    }
    if (answer !== void 0) {
      updates.push("answer = ?");
      params.push(answer);
    }
    if (sortOrder !== void 0) {
      updates.push("sort_order = ?");
      params.push(sortOrder);
    }
    if (isActive !== void 0) {
      updates.push("is_active = ?");
      params.push(isActive ? 1 : 0);
    }
    if (updates.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }
    updates.push("updated_at = datetime('now')");
    params.push(id);
    await c.env.DB.prepare(
      `UPDATE about_faq SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    await invalidateAboutCache(c.env);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
aboutAdminRoutes.delete("/faq", async (c) => {
  try {
    const urlId = c.req.query("id");
    let id = urlId ? Number(urlId) : void 0;
    if (!id) {
      try {
        const body = await c.req.json();
        id = body?.id;
      } catch {
      }
    }
    if (!id) {
      return c.json({ error: "id is required" }, 400);
    }
    await c.env.DB.prepare("DELETE FROM about_faq WHERE id = ?").bind(id).run();
    await invalidateAboutCache(c.env);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
async function fetchAboutData(env) {
  const configRow = await env.DB.prepare(
    "SELECT value FROM app_config WHERE key = 'about_content'"
  ).first();
  let content = DEFAULT_ABOUT_CONTENT;
  if (configRow?.value) {
    try {
      content = { ...DEFAULT_ABOUT_CONTENT, ...JSON.parse(configRow.value) };
    } catch {
    }
  }
  const statsResult = await env.DB.prepare(
    "SELECT * FROM about_stats WHERE is_active = 1 ORDER BY sort_order ASC"
  ).all();
  const teamResult = await env.DB.prepare(
    "SELECT * FROM about_team WHERE is_active = 1 ORDER BY sort_order ASC"
  ).all();
  const faqResult = await env.DB.prepare(
    "SELECT * FROM about_faq WHERE is_active = 1 ORDER BY sort_order ASC"
  ).all();
  return {
    content,
    stats: statsResult.results,
    team: teamResult.results,
    faq: faqResult.results
  };
}
async function invalidateAboutCache(env) {
  try {
    await env.KV_CONFIG.delete("about_page_data");
  } catch {
  }
}

// src/lib/web-push.ts
function base64urlEncode(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64urlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - base64.length % 4) % 4;
  if (pad > 0) base64 += "=".repeat(pad);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
async function hmacSHA256(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, data);
}
async function hkdfExtract(salt, ikm) {
  return hmacSHA256(salt, ikm);
}
async function hkdfExpand(prk, info, length) {
  const hashLen = 32;
  const n = Math.ceil(length / hashLen);
  const infoBytes = new Uint8Array(info);
  let okm = new Uint8Array(0);
  let t = new Uint8Array(0);
  for (let i = 1; i <= n; i++) {
    const data = new Uint8Array(t.length + infoBytes.length + 1);
    data.set(t, 0);
    data.set(infoBytes, t.length);
    data[t.length + infoBytes.length] = i;
    t = new Uint8Array(await hmacSHA256(prk, data.buffer));
    const newOkm = new Uint8Array(okm.length + t.length);
    newOkm.set(okm, 0);
    newOkm.set(t, okm.length);
    okm = newOkm;
  }
  return okm.slice(0, length).buffer;
}
function derToRawSignature(derSig) {
  const der = new Uint8Array(derSig);
  let idx = 2;
  if (der[idx] !== 2) throw new Error("Invalid DER signature: missing r INTEGER tag");
  idx++;
  const rLen = der[idx++];
  const rDer = der.slice(idx, idx + rLen);
  idx += rLen;
  if (der[idx] !== 2) throw new Error("Invalid DER signature: missing s INTEGER tag");
  idx++;
  const sLen = der[idx++];
  const sDer = der.slice(idx, idx + sLen);
  const r = derIntegerTo32Bytes(rDer);
  const s = derIntegerTo32Bytes(sDer);
  const raw2 = new Uint8Array(64);
  raw2.set(r, 0);
  raw2.set(s, 32);
  return raw2.buffer;
}
function derIntegerTo32Bytes(derInt) {
  let value;
  if (derInt.length > 1 && derInt[0] === 0) {
    value = derInt.slice(1);
  } else {
    value = derInt;
  }
  if (value.length > 32) {
    throw new Error(`DER integer too long (${value.length} bytes); expected \u2264 32`);
  }
  const result = new Uint8Array(32);
  result.set(value, 32 - value.length);
  return result;
}
function concat(...arrays) {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}
function uint16BE(value) {
  return new Uint8Array([value >> 8 & 255, value & 255]);
}
function uint32BE(value) {
  return new Uint8Array([
    value >> 24 & 255,
    value >> 16 & 255,
    value >> 8 & 255,
    value & 255
  ]);
}
async function generateVapidJwt(privateKey, audience, subject) {
  const header = base64urlEncode(
    new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" }))
  );
  const payload = base64urlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1e3) + 43200,
        sub: subject
      })
    )
  );
  const signingInput = `${header}.${payload}`;
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    base64urlDecode(privateKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const derSignature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const rawSignature = derToRawSignature(derSignature);
  return `${signingInput}.${base64urlEncode(rawSignature)}`;
}
async function encryptPayload(payload, p256dh, auth) {
  const recipientPub = new Uint8Array(base64urlDecode(p256dh));
  const authKey = new Uint8Array(base64urlDecode(auth));
  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    // extractable — we need to export the public key
    ["deriveBits"]
  );
  const recipientCryptoKey = await crypto.subtle.importKey(
    "raw",
    recipientPub,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", $public: recipientCryptoKey },
    ephemeral.privateKey,
    256
    // 32 bytes
  );
  const ephemeralPub = new Uint8Array(
    await crypto.subtle.exportKey("raw", ephemeral.publicKey)
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hkdfExtract(authKey.buffer, sharedSecret);
  const context = concat(
    new TextEncoder().encode("P-256"),
    new Uint8Array([0]),
    uint16BE(recipientPub.length),
    recipientPub,
    uint16BE(ephemeralPub.length),
    ephemeralPub
  );
  const keyInfo = concat(
    new TextEncoder().encode("Content-Encoding: aes128gcm"),
    new Uint8Array([0]),
    context
  );
  const cek = await hkdfExpand(prk, keyInfo.buffer, 16);
  const nonceInfo = concat(
    new TextEncoder().encode("Content-Encoding: nonce"),
    new Uint8Array([0]),
    context
  );
  const nonce = await hkdfExpand(prk, nonceInfo.buffer, 12);
  const payloadBytes = new TextEncoder().encode(payload);
  const plaintext = new Uint8Array(payloadBytes.length + 1);
  plaintext.set(payloadBytes, 0);
  plaintext[payloadBytes.length] = 2;
  const aesKey = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce, tagLength: 128 },
    aesKey,
    plaintext
  );
  return concat(
    salt,
    uint32BE(4096),
    ephemeralPub,
    new Uint8Array(ciphertext)
  );
}
async function sendWebPush(env, subscription, payload, options) {
  try {
    const audience = new URL(subscription.endpoint).origin;
    const jwt = await generateVapidJwt(env.VAPID_PRIVATE_KEY, audience, env.VAPID_SUBJECT);
    const encrypted = await encryptPayload(
      JSON.stringify(payload),
      subscription.keys.p256dh,
      subscription.keys.auth
    );
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(options?.ttl ?? 2419200),
        Urgency: options?.urgency ?? "normal"
      },
      body: encrypted.buffer
    });
    return {
      success: response.ok,
      status: response.status,
      ...response.ok ? {} : { error: `Push service returned ${response.status}` }
    };
  } catch (err) {
    return {
      success: false,
      status: 0,
      error: err instanceof Error ? err.message : "Unknown error"
    };
  }
}

// src/routes/support.ts
function generateTicketId() {
  const date = /* @__PURE__ */ new Date();
  const dateStr = date.toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TK-${dateStr}-${rand}`;
}
async function getTelegramConfig(env) {
  try {
    const tokenRow = await env.DB.prepare(
      "SELECT value FROM app_config WHERE key = 'telegram_bot_token'"
    ).first();
    const chatIdsRow = await env.DB.prepare(
      "SELECT value FROM app_config WHERE key = 'telegram_chat_ids'"
    ).first();
    const botToken = tokenRow?.value || "";
    let chatIds = [];
    if (chatIdsRow?.value) {
      try {
        chatIds = JSON.parse(chatIdsRow.value);
      } catch {
        chatIds = [];
      }
    }
    return { botToken, chatIds };
  } catch {
    return { botToken: "", chatIds: [] };
  }
}
async function sendTelegramMessage(botToken, chatId, text, replyMarkup) {
  if (!botToken) return;
  try {
    const body = {
      chat_id: chatId,
      text,
      parse_mode: "HTML"
    };
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
  }
}
async function notifyNewTicket(env, ticket) {
  const { botToken, chatIds } = await getTelegramConfig(env);
  if (!botToken || chatIds.length === 0) return;
  const priorityEmoji = {
    low: "\u{1F7E2}",
    normal: "\u{1F7E1}",
    high: "\u{1F7E0}",
    urgent: "\u{1F534}"
  };
  const emoji = priorityEmoji[ticket.priority] || "\u{1F7E1}";
  const text = `\u{1F4E9} <b>New Support Ticket</b>

\u{1F3AB} Ticket: <code>${ticket.ticket_id}</code>
\u{1F4CC} Subject: ${ticket.subject}
\u{1F4C2} Category: ${ticket.category}
${emoji} Priority: ${ticket.priority.toUpperCase()}
\u{1F464} From: ${ticket.name || ticket.email}

\u{1F4AC} <i>${ticket.message.substring(0, 500)}${ticket.message.length > 500 ? "..." : ""}</i>

Reply: /reply ${ticket.ticket_id} Your message here
Resolve: /resolve ${ticket.ticket_id} Resolution details`;
  for (const chatId of chatIds) {
    await sendTelegramMessage(botToken, chatId, text);
  }
}
async function notifyTicketResolved(env, userId, ticketId, resolvedContent) {
  try {
    const timestamp = Math.floor(Date.now() / 1e3);
    const encodedContent = encodeURIComponent(resolvedContent.substring(0, 200));
    const url = `https://dakkho-student.pages.dev/help/contact-support/${ticketId}/${timestamp}/${encodedContent}`;
    await sendWebPushToUser(env, userId, {
      type: "ticket_resolved",
      ticketId,
      title: "Support Ticket Resolved",
      body: `Your ticket ${ticketId} has been resolved`,
      url
    });
    const tokens = await getUserPushTokens(env, userId);
    if (tokens.length === 0) return;
    await sendPushNotification(env, {
      title: "Support Ticket Resolved",
      titleBn: "\u09B8\u09BE\u09AA\u09CB\u09B0\u09CD\u099F \u099F\u09BF\u0995\u09C7\u099F \u09B8\u09AE\u09BE\u09A7\u09BE\u09A8 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7",
      message: `Your ticket ${ticketId} has been resolved`,
      messageBn: `\u0986\u09AA\u09A8\u09BE\u09B0 \u099F\u09BF\u0995\u09C7\u099F ${ticketId} \u09B8\u09AE\u09BE\u09A7\u09BE\u09A8 \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7`,
      url,
      data: {
        type: "ticket_resolved",
        ticketId,
        resolvedContent,
        url
      },
      targetPlayerIds: tokens
    });
  } catch (error) {
    console.error("Failed to send push notification:", error);
  }
}
async function notifyTicketReply(env, userId, ticketId, senderType, replyPreview) {
  try {
    if (senderType === "user") return;
    await sendWebPushToUser(env, userId, {
      type: "ticket_reply",
      ticketId,
      title: "New Support Reply",
      body: replyPreview.substring(0, 100),
      url: `https://dakkho-student.pages.dev/help/contact-support`
    });
    const tokens = await getUserPushTokens(env, userId);
    if (tokens.length === 0) return;
    const url = `https://dakkho-student.pages.dev/help/contact-support`;
    await sendPushNotification(env, {
      title: "New Support Reply",
      titleBn: "\u09A8\u09A4\u09C1\u09A8 \u09B8\u09BE\u09AA\u09CB\u09B0\u09CD\u099F \u09B0\u09BF\u09AA\u09CD\u09B2\u09BE\u0987",
      message: replyPreview.substring(0, 100),
      messageBn: replyPreview.substring(0, 100),
      url,
      data: {
        type: "ticket_reply",
        ticketId
      },
      targetPlayerIds: tokens
    });
  } catch (error) {
    console.error("Failed to send push notification for reply:", error);
  }
}
async function sendWebPushToUser(env, userId, payload) {
  try {
    if (!env.VAPID_PRIVATE_KEY || !env.VAPID_PUBLIC_KEY) return;
    const result = await env.DB.prepare(
      "SELECT push_token, device_type, device_info FROM user_push_tokens WHERE user_id = ? AND is_active = 1"
    ).bind(userId).all();
    for (const row of result.results) {
      if (row.device_type === "webpush" && row.device_info) {
        try {
          const subscription = JSON.parse(row.device_info);
          if (subscription.endpoint && subscription.keys) {
            await sendWebPush(env, subscription, payload);
          }
        } catch (e) {
          console.error("Failed to send web push:", e);
        }
      }
    }
  } catch (error) {
    console.error("Failed to send web push to user:", error);
  }
}
async function saveNotification(env, userId, title, message, actionUrl, type = "info", category = "") {
  try {
    await env.DB.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, category, read, action_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, datetime('now'), datetime('now'))
    `).bind(generateId(), userId, title, message, type, category, actionUrl).run();
  } catch (error) {
    console.error("Failed to save notification:", error);
  }
}
var supportPublicRoutes = new Hono2();
supportPublicRoutes.post("/tickets", async (c) => {
  try {
    const contentType = c.req.header("Content-Type") || "";
    let subject = "";
    let category = "General";
    let priority = "normal";
    let description = "";
    let userEmail = "";
    let userName = "";
    let userId = null;
    let attachmentUrls = [];
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const session = await c.env.DB.prepare(
          "SELECT user_id, email, name FROM student_sessions WHERE id = ? AND is_active = 1"
        ).bind(token).first();
        if (session) {
          userId = session.user_id;
          userEmail = session.email;
          userName = session.name || "";
        }
      } catch {
      }
    }
    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.formData();
      subject = formData.get("subject") || "";
      category = formData.get("category") || "General";
      priority = formData.get("priority") || "normal";
      description = formData.get("description") || "";
      userEmail = userEmail || formData.get("email") || "";
      userName = userName || formData.get("name") || "";
      const files = formData.getAll("files");
      for (const file of files) {
        if (!file || file.size === 0) continue;
        if (file.size > 10 * 1024 * 1024) continue;
        const arrayBuffer = await file.arrayBuffer();
        const key = `support/${Date.now()}-${file.name}`;
        await uploadFile(c.env.R2_SUPPORT_ATTACHMENTS, key, arrayBuffer, file.type);
        attachmentUrls.push(key);
      }
    } else {
      const body = await c.req.json();
      subject = body.subject || "";
      category = body.category || "General";
      priority = body.priority || "normal";
      description = body.description || "";
      userEmail = userEmail || body.email || "";
      userName = userName || body.name || "";
      attachmentUrls = body.attachmentUrls || [];
    }
    if (!subject.trim() || !description.trim()) {
      return c.json({ error: "Subject and description are required" }, 400);
    }
    if (!userEmail.trim()) {
      return c.json({ error: "Email is required" }, 400);
    }
    const ticketId = generateTicketId();
    await c.env.DB.prepare(`
      INSERT INTO support_tickets (ticket_id, user_id, name, email, subject, category, priority, status, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)
    `).bind(ticketId, userId, userName, userEmail, subject, category, priority, description).run();
    await c.env.DB.prepare(`
      INSERT INTO support_messages (ticket_id, sender_type, sender_name, message, attachments, source)
      VALUES (?, 'user', ?, ?, ?, 'app')
    `).bind(ticketId, userName || userEmail, description, JSON.stringify(attachmentUrls)).run();
    await notifyNewTicket(c.env, { ticket_id: ticketId, subject, category, priority, email: userEmail, name: userName, message: description });
    try {
      const supportEmail = c.env.RESEND_SUPPORT_EMAIL || "support@dakkho.pro.bd";
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0ea5e9;">DAKKHO Support</h2>
          <p>Hi ${userName || userEmail},</p>
          <p>Your support ticket has been created successfully.</p>
          <p><strong>Ticket ID:</strong> ${ticketId}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Category:</strong> ${category}</p>
          <p>Our team will respond within 24-48 hours.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">DAKKHO Academy \u2014 Support Team</p>
        </div>
      `;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${c.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: supportEmail,
          to: [userEmail],
          subject: `[DAKKHO Support] Ticket ${ticketId} Created`,
          html
        })
      });
    } catch (error) {
      console.error("Failed to send confirmation email:", error);
    }
    return c.json({
      success: true,
      ticketId,
      message: "Ticket created successfully"
    }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
supportPublicRoutes.get("/tickets", async (c) => {
  try {
    const email = c.req.query("email");
    const userId = c.req.query("userId");
    if (!email && !userId) {
      return c.json({ error: "email or userId is required" }, 400);
    }
    let query = "SELECT * FROM support_tickets WHERE ";
    const params = [];
    if (userId) {
      query += "user_id = ?";
      params.push(userId);
    } else {
      query += "email = ?";
      params.push(email);
    }
    query += " ORDER BY created_at DESC LIMIT 50";
    const result = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ tickets: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
supportPublicRoutes.get("/tickets/:ticketId", async (c) => {
  try {
    const ticketId = c.req.param("ticketId");
    const ticket = await c.env.DB.prepare(
      "SELECT * FROM support_tickets WHERE ticket_id = ?"
    ).bind(ticketId).first();
    if (!ticket) {
      return c.json({ error: "Ticket not found" }, 404);
    }
    const messages = await c.env.DB.prepare(
      "SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC"
    ).bind(ticketId).all();
    return c.json({ ticket, messages: messages.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
supportPublicRoutes.post("/tickets/:ticketId/messages", async (c) => {
  try {
    const ticketId = c.req.param("ticketId");
    const contentType = c.req.header("Content-Type") || "";
    let message = "";
    let senderName = "";
    let senderType = "user";
    let attachmentUrls = [];
    const ticket = await c.env.DB.prepare(
      "SELECT * FROM support_tickets WHERE ticket_id = ?"
    ).bind(ticketId).first();
    if (!ticket) {
      return c.json({ error: "Ticket not found" }, 404);
    }
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const session = await c.env.DB.prepare(
          "SELECT user_id, email, name FROM student_sessions WHERE id = ? AND is_active = 1"
        ).bind(token).first();
        if (session) {
          senderName = session.name || session.email;
        }
      } catch {
      }
    }
    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.formData();
      message = formData.get("message") || "";
      senderName = senderName || formData.get("name") || "";
      senderType = formData.get("senderType") || "user";
      const files = formData.getAll("files");
      for (const file of files) {
        if (!file || file.size === 0) continue;
        if (file.size > 10 * 1024 * 1024) continue;
        const arrayBuffer = await file.arrayBuffer();
        const key = `support/${ticketId}/${Date.now()}-${file.name}`;
        await uploadFile(c.env.R2_SUPPORT_ATTACHMENTS, key, arrayBuffer, file.type);
        attachmentUrls.push(key);
      }
    } else {
      const body = await c.req.json();
      message = body.message || "";
      senderName = senderName || body.name || "";
      senderType = body.senderType || "user";
      attachmentUrls = body.attachmentUrls || [];
    }
    if (!message.trim()) {
      return c.json({ error: "Message is required" }, 400);
    }
    await c.env.DB.prepare(`
      INSERT INTO support_messages (ticket_id, sender_type, sender_name, message, attachments, source)
      VALUES (?, ?, ?, ?, ?, 'app')
    `).bind(ticketId, senderType, senderName, message, JSON.stringify(attachmentUrls)).run();
    const newStatus = ticket.status === "resolved" ? "open" : ticket.status;
    await c.env.DB.prepare(
      "UPDATE support_tickets SET updated_at = datetime('now'), status = ? WHERE ticket_id = ?"
    ).bind(newStatus, ticketId).run();
    if (senderType === "user") {
      const { botToken, chatIds } = await getTelegramConfig(c.env);
      for (const chatId of chatIds) {
        await sendTelegramMessage(
          botToken,
          chatId,
          `\u{1F4AC} <b>User Reply on ${ticketId}</b>

\u{1F464} ${senderName}
\u{1F4AC} <i>${message.substring(0, 500)}${message.length > 500 ? "..." : ""}</i>

Reply: /reply ${ticketId} Your message here`
        );
      }
    }
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
supportPublicRoutes.get("/attachment-url", async (c) => {
  try {
    const key = c.req.query("key");
    if (!key) {
      return c.json({ error: "key is required" }, 400);
    }
    const file = await c.env.R2_SUPPORT_ATTACHMENTS.get(key);
    if (!file) {
      return c.json({ error: "File not found" }, 404);
    }
    const headers = new Headers();
    if (file.httpMetadata?.contentType) {
      headers.set("Content-Type", file.httpMetadata.contentType);
    }
    headers.set("Cache-Control", "public, max-age=86400");
    headers.set("Access-Control-Allow-Origin", "*");
    return new Response(file.body, { headers });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
var supportAdminRoutes = new Hono2();
supportAdminRoutes.use("*", adminAuthMiddleware);
supportAdminRoutes.get("/tickets", async (c) => {
  try {
    const status = c.req.query("status") || "all";
    const priority = c.req.query("priority") || "all";
    const category = c.req.query("category") || "all";
    const search = c.req.query("search") || "";
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = (page - 1) * limit;
    let query = "SELECT * FROM support_tickets";
    let countQuery = "SELECT COUNT(*) as total FROM support_tickets";
    const conditions = [];
    const params = [];
    if (status !== "all") {
      conditions.push("status = ?");
      params.push(status);
    }
    if (priority !== "all") {
      conditions.push("priority = ?");
      params.push(priority);
    }
    if (category !== "all") {
      conditions.push("category = ?");
      params.push(category);
    }
    if (search) {
      conditions.push("(subject LIKE ? OR ticket_id LIKE ? OR email LIKE ? OR name LIKE ?)");
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }
    if (conditions.length > 0) {
      const whereClause = " WHERE " + conditions.join(" AND ");
      query += whereClause;
      countQuery += whereClause;
    }
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;
    const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();
    return c.json({ tickets: result.results, total, page, limit });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
supportAdminRoutes.get("/tickets/:ticketId", async (c) => {
  try {
    const ticketId = c.req.param("ticketId");
    const ticket = await c.env.DB.prepare(
      "SELECT * FROM support_tickets WHERE ticket_id = ?"
    ).bind(ticketId).first();
    if (!ticket) {
      return c.json({ error: "Ticket not found" }, 404);
    }
    const messages = await c.env.DB.prepare(
      "SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC"
    ).bind(ticketId).all();
    return c.json({ ticket, messages: messages.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
supportAdminRoutes.post("/tickets/:ticketId/reply", async (c) => {
  try {
    const ticketId = c.req.param("ticketId");
    const contentType = c.req.header("Content-Type") || "";
    let message = "";
    let attachmentUrls = [];
    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.formData();
      message = formData.get("message") || "";
      const files = formData.getAll("files");
      for (const file of files) {
        if (!file || file.size === 0) continue;
        if (file.size > 10 * 1024 * 1024) continue;
        const arrayBuffer = await file.arrayBuffer();
        const key = `support/${ticketId}/${Date.now()}-${file.name}`;
        await uploadFile(c.env.R2_SUPPORT_ATTACHMENTS, key, arrayBuffer, file.type);
        attachmentUrls.push(key);
      }
    } else {
      const body = await c.req.json();
      message = body.message || "";
      attachmentUrls = body.attachmentUrls || [];
    }
    if (!message.trim() && attachmentUrls.length === 0) {
      return c.json({ error: "Message or attachment is required" }, 400);
    }
    const ticket = await c.env.DB.prepare(
      "SELECT * FROM support_tickets WHERE ticket_id = ?"
    ).bind(ticketId).first();
    if (!ticket) {
      return c.json({ error: "Ticket not found" }, 404);
    }
    const user = c.get("user");
    await c.env.DB.prepare(`
      INSERT INTO support_messages (ticket_id, sender_type, sender_name, message, attachments, source)
      VALUES (?, 'admin', ?, ?, ?, 'admin')
    `).bind(ticketId, user.name || "Admin", message, JSON.stringify(attachmentUrls)).run();
    if (ticket.status === "open") {
      await c.env.DB.prepare(
        "UPDATE support_tickets SET status = 'in_progress', updated_at = datetime('now') WHERE ticket_id = ?"
      ).bind(ticketId).run();
    } else {
      await c.env.DB.prepare(
        "UPDATE support_tickets SET updated_at = datetime('now') WHERE ticket_id = ?"
      ).bind(ticketId).run();
    }
    if (ticket.user_id) {
      await notifyTicketReply(c.env, ticket.user_id, ticketId, "admin", message);
      const timestamp = Math.floor(Date.now() / 1e3);
      const notifUrl = `https://dakkho-student.pages.dev/help/contact-support/${ticketId}`;
      await saveNotification(c.env, ticket.user_id, "New Support Reply", message.substring(0, 200), notifUrl, "info", "support");
    }
    const { botToken, chatIds } = await getTelegramConfig(c.env);
    for (const chatId of chatIds) {
      await sendTelegramMessage(
        botToken,
        chatId,
        `\u2705 <b>Admin Reply on ${ticketId}</b>

\u{1F464} ${user.name || "Admin"}
\u{1F4AC} <i>${message.substring(0, 500)}${message.length > 500 ? "..." : ""}</i>`
      );
    }
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
supportAdminRoutes.put("/tickets/:ticketId/resolve", async (c) => {
  try {
    const ticketId = c.req.param("ticketId");
    const { resolvedContent } = await c.req.json();
    if (!resolvedContent?.trim()) {
      return c.json({ error: "resolvedContent is required" }, 400);
    }
    const ticket = await c.env.DB.prepare(
      "SELECT * FROM support_tickets WHERE ticket_id = ?"
    ).bind(ticketId).first();
    if (!ticket) {
      return c.json({ error: "Ticket not found" }, 404);
    }
    const user = c.get("user");
    await c.env.DB.prepare(`
      UPDATE support_tickets
      SET status = 'resolved', resolved_content = ?, resolved_at = datetime('now'), resolved_by = ?, updated_at = datetime('now')
      WHERE ticket_id = ?
    `).bind(resolvedContent, user.name || "Admin", ticketId).run();
    await c.env.DB.prepare(`
      INSERT INTO support_messages (ticket_id, sender_type, sender_name, message, attachments, source)
      VALUES (?, 'admin', ?, ?, '[]', 'admin')
    `).bind(ticketId, user.name || "Admin", `\u2705 Ticket Resolved: ${resolvedContent}`).run();
    if (ticket.user_id) {
      await notifyTicketResolved(c.env, ticket.user_id, ticketId, resolvedContent);
      const timestamp = Math.floor(Date.now() / 1e3);
      const encodedContent = encodeURIComponent(resolvedContent.substring(0, 200));
      const notifUrl = `https://dakkho-student.pages.dev/help/contact-support/${ticketId}/${timestamp}/${encodedContent}`;
      await saveNotification(c.env, ticket.user_id, "Support Ticket Resolved", `Your ticket ${ticketId} has been resolved: ${resolvedContent.substring(0, 100)}`, notifUrl, "success", "support");
    }
    try {
      const supportEmail = c.env.RESEND_SUPPORT_EMAIL || "support@dakkho.pro.bd";
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">\u2705 Ticket Resolved</h2>
          <p>Hi ${ticket.email},</p>
          <p>Your support ticket has been resolved.</p>
          <p><strong>Ticket ID:</strong> ${ticketId}</p>
          <p><strong>Resolution:</strong> ${resolvedContent}</p>
          <p>If you need further assistance, feel free to reply to the ticket.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">DAKKHO Academy \u2014 Support Team</p>
        </div>
      `;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${c.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: supportEmail,
          to: [ticket.email],
          subject: `[DAKKHO Support] Ticket ${ticketId} Resolved`,
          html
        })
      });
    } catch (error) {
      console.error("Failed to send resolution email:", error);
    }
    const { botToken, chatIds } = await getTelegramConfig(c.env);
    for (const chatId of chatIds) {
      await sendTelegramMessage(
        botToken,
        chatId,
        `\u2705 <b>Ticket ${ticketId} Resolved</b>

\u{1F4DD} ${resolvedContent.substring(0, 500)}

Resolved by: ${user.name || "Admin"}`
      );
    }
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
supportAdminRoutes.put("/tickets/:ticketId/status", async (c) => {
  try {
    const ticketId = c.req.param("ticketId");
    const { status } = await c.req.json();
    const validStatuses = ["open", "in_progress", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      return c.json({ error: "Invalid status. Must be: open, in_progress, resolved, closed" }, 400);
    }
    const ticket = await c.env.DB.prepare(
      "SELECT * FROM support_tickets WHERE ticket_id = ?"
    ).bind(ticketId).first();
    if (!ticket) {
      return c.json({ error: "Ticket not found" }, 404);
    }
    await c.env.DB.prepare(
      "UPDATE support_tickets SET status = ?, updated_at = datetime('now') WHERE ticket_id = ?"
    ).bind(status, ticketId).run();
    if (ticket.user_id && status !== ticket.status) {
      const statusLabels = {
        open: "Open",
        in_progress: "In Progress",
        resolved: "Resolved",
        closed: "Closed"
      };
      const notifUrl = `https://dakkho-student.pages.dev/help/contact-support/${ticketId}`;
      const notifType = status === "resolved" ? "success" : status === "closed" ? "warning" : "info";
      await saveNotification(
        c.env,
        ticket.user_id,
        `Ticket Status Updated`,
        `Your ticket ${ticketId} status changed to ${statusLabels[status] || status}.`,
        notifUrl,
        notifType,
        "support"
      );
    }
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
supportAdminRoutes.get("/config", async (c) => {
  try {
    const tokenRow = await c.env.DB.prepare(
      "SELECT value FROM app_config WHERE key = 'telegram_bot_token'"
    ).first();
    const chatIdsRow = await c.env.DB.prepare(
      "SELECT value FROM app_config WHERE key = 'telegram_chat_ids'"
    ).first();
    const emailRow = await c.env.DB.prepare(
      "SELECT value FROM app_config WHERE key = 'support_email'"
    ).first();
    let chatIds = [];
    if (chatIdsRow?.value) {
      try {
        chatIds = JSON.parse(chatIdsRow.value);
      } catch {
      }
    }
    return c.json({
      telegramBotToken: tokenRow?.value ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" + tokenRow.value.slice(-6) : "",
      telegramChatIds: chatIds,
      supportEmail: emailRow?.value || ""
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
supportAdminRoutes.put("/config", async (c) => {
  try {
    const { telegramChatIds, supportEmail } = await c.req.json();
    if (telegramChatIds !== void 0) {
      await c.env.DB.prepare(
        `INSERT INTO app_config (key, value, updated_at) VALUES ('telegram_chat_ids', ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
      ).bind(JSON.stringify(telegramChatIds)).run();
    }
    if (supportEmail !== void 0) {
      await c.env.DB.prepare(
        `INSERT INTO app_config (key, value, updated_at) VALUES ('support_email', ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
      ).bind(supportEmail).run();
    }
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
supportAdminRoutes.get("/stats", async (c) => {
  try {
    const open = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'"
    ).first();
    const inProgress = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM support_tickets WHERE status = 'in_progress'"
    ).first();
    const resolved = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM support_tickets WHERE status = 'resolved'"
    ).first();
    const closed = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM support_tickets WHERE status = 'closed'"
    ).first();
    const total = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM support_tickets"
    ).first();
    return c.json({
      open: open?.count || 0,
      inProgress: inProgress?.count || 0,
      resolved: resolved?.count || 0,
      closed: closed?.count || 0,
      total: total?.count || 0
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
var telegramWebhookRoutes = new Hono2();
telegramWebhookRoutes.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const botToken = c.req.query("token");
    const { botToken: configToken } = await getTelegramConfig(c.env);
    if (!configToken || botToken !== configToken) {
      console.error("Telegram webhook auth failed. Token mismatch or missing config.");
      return c.json({ error: "Unauthorized" }, 401);
    }
    const message = body.message || body.callback_query?.message;
    const text = body.message?.text || "";
    const fromName = body.message?.from?.first_name || body.callback_query?.from?.first_name || "Admin";
    const chatId = String(body.message?.chat?.id || body.callback_query?.message?.chat?.id || "");
    if (!text && !body.callback_query) {
      return c.json({ ok: true });
    }
    const trimmedText = (text || "").trim();
    if (trimmedText === "/start") {
      await sendTelegramMessage(
        configToken,
        chatId,
        `\u{1F44B} <b>Welcome to DAKKHO Support Bot!</b>

Commands:
/tickets [status] \u2014 List tickets
/view TK-XXXXXX \u2014 View ticket
/reply TK-XXXXXX message \u2014 Reply to ticket
/resolve TK-XXXXXX details \u2014 Resolve ticket
/close TK-XXXXXX \u2014 Close ticket
/stats \u2014 Support statistics
/chatids \u2014 Show chat IDs`
      );
      return c.json({ ok: true });
    }
    if (trimmedText === "/chatids") {
      const { chatIds } = await getTelegramConfig(c.env);
      await sendTelegramMessage(
        configToken,
        chatId,
        `\u{1F4CB} <b>Chat IDs:</b>

` + chatIds.map((id, i) => `${i + 1}. <code>${id}</code>`).join("\n") + `

Current chat: <code>${chatId}</code>`
      );
      return c.json({ ok: true });
    }
    if (trimmedText === "/stats") {
      const open = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'"
      ).first();
      const inProgress = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM support_tickets WHERE status = 'in_progress'"
      ).first();
      const resolved = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM support_tickets WHERE status = 'resolved'"
      ).first();
      const total = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM support_tickets"
      ).first();
      await sendTelegramMessage(
        configToken,
        chatId,
        `\u{1F4CA} <b>Support Statistics</b>

\u{1F7E2} Open: ${open?.count || 0}
\u{1F7E1} In Progress: ${inProgress?.count || 0}
\u2705 Resolved: ${resolved?.count || 0}
\u{1F4CB} Total: ${total?.count || 0}`
      );
      return c.json({ ok: true });
    }
    const ticketsMatch = trimmedText.match(/^\/tickets(?:\s+(\w+))?$/);
    if (ticketsMatch) {
      const statusFilter = ticketsMatch[1] || "open";
      let query = "SELECT ticket_id, subject, status, priority, created_at FROM support_tickets";
      const params = [];
      if (statusFilter !== "all") {
        query += " WHERE status = ?";
        params.push(statusFilter);
      }
      query += " ORDER BY created_at DESC LIMIT 10";
      const result = await c.env.DB.prepare(query).bind(...params).all();
      if (result.results.length === 0) {
        await sendTelegramMessage(configToken, chatId, `No ${statusFilter} tickets found.`);
      } else {
        const statusEmoji = { open: "\u{1F7E2}", in_progress: "\u{1F7E1}", resolved: "\u2705", closed: "\u{1F512}" };
        const list = result.results.map(
          (t) => `${statusEmoji[t.status] || "\u26AA"} <code>${t.ticket_id}</code> \u2014 ${t.subject}
   ${t.priority.toUpperCase()} | ${t.created_at}`
        ).join("\n\n");
        await sendTelegramMessage(
          configToken,
          chatId,
          `\u{1F4CB} <b>${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Tickets:</b>

${list}

View: /view TK-XXXXXX
Reply: /reply TK-XXXXXX message
Resolve: /resolve TK-XXXXXX details`
        );
      }
      return c.json({ ok: true });
    }
    const viewMatch = trimmedText.match(/^\/view\s+(TK-[\w-]+)$/);
    if (viewMatch) {
      const ticketId = viewMatch[1];
      const ticket = await c.env.DB.prepare(
        "SELECT * FROM support_tickets WHERE ticket_id = ?"
      ).bind(ticketId).first();
      if (!ticket) {
        await sendTelegramMessage(configToken, chatId, `\u274C Ticket ${ticketId} not found.`);
        return c.json({ ok: true });
      }
      const messages = await c.env.DB.prepare(
        "SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC LIMIT 20"
      ).bind(ticketId).all();
      const statusEmoji = { open: "\u{1F7E2}", in_progress: "\u{1F7E1}", resolved: "\u2705", closed: "\u{1F512}" };
      let msgText = `\u{1F3AB} <b>Ticket ${ticketId}</b>

\u{1F4CC} Subject: ${ticket.subject}
\u{1F4C2} Category: ${ticket.category}
\u26A0\uFE0F Priority: ${ticket.priority.toUpperCase()}
${statusEmoji[ticket.status] || "\u26AA"} Status: ${ticket.status}
\u{1F464} User: ${ticket.name || ticket.email}
\u{1F4C5} Created: ${ticket.created_at}`;
      if (ticket.resolved_content) {
        msgText += `

\u2705 <b>Resolution:</b> ${ticket.resolved_content}`;
      }
      if (messages.results.length > 0) {
        msgText += "\n\n\u{1F4AC} <b>Messages:</b>";
        for (const msg of messages.results) {
          const senderIcon = msg.sender_type === "user" ? "\u{1F464}" : "\u{1F6E1}\uFE0F";
          msgText += `

${senderIcon} <b>${msg.sender_name || msg.sender_type}</b> (${msg.source})
${msg.message.substring(0, 300)}`;
        }
      }
      msgText += `

Reply: /reply ${ticketId} message
Resolve: /resolve ${ticketId} details`;
      await sendTelegramMessage(configToken, chatId, msgText);
      return c.json({ ok: true });
    }
    const replyMatch = trimmedText.match(/^\/reply\s+(TK-[\w-]+)\s+(.+)$/s);
    if (replyMatch) {
      const ticketId = replyMatch[1];
      const replyMessage = replyMatch[2].trim();
      const ticket = await c.env.DB.prepare(
        "SELECT * FROM support_tickets WHERE ticket_id = ?"
      ).bind(ticketId).first();
      if (!ticket) {
        await sendTelegramMessage(configToken, chatId, `\u274C Ticket ${ticketId} not found.`);
        return c.json({ ok: true });
      }
      await c.env.DB.prepare(`
        INSERT INTO support_messages (ticket_id, sender_type, sender_name, message, attachments, source)
        VALUES (?, 'telegram', ?, ?, '[]', 'telegram')
      `).bind(ticketId, fromName, replyMessage).run();
      if (ticket.status === "open") {
        await c.env.DB.prepare(
          "UPDATE support_tickets SET status = 'in_progress', updated_at = datetime('now') WHERE ticket_id = ?"
        ).bind(ticketId).run();
      } else {
        await c.env.DB.prepare(
          "UPDATE support_tickets SET updated_at = datetime('now') WHERE ticket_id = ?"
        ).bind(ticketId).run();
      }
      if (ticket.user_id) {
        await notifyTicketReply(c.env, ticket.user_id, ticketId, "telegram", replyMessage);
        const notifUrl = `https://dakkho-student.pages.dev/help/contact-support/${ticketId}`;
        await saveNotification(c.env, ticket.user_id, "New Support Reply", replyMessage.substring(0, 200), notifUrl, "info", "support");
      }
      await sendTelegramMessage(configToken, chatId, `\u2705 Reply sent on ${ticketId}`);
      return c.json({ ok: true });
    }
    const resolveMatch = trimmedText.match(/^\/resolve\s+(TK-[\w-]+)\s+(.+)$/s);
    if (resolveMatch) {
      const ticketId = resolveMatch[1];
      const resolvedContent = resolveMatch[2].trim();
      const ticket = await c.env.DB.prepare(
        "SELECT * FROM support_tickets WHERE ticket_id = ?"
      ).bind(ticketId).first();
      if (!ticket) {
        await sendTelegramMessage(configToken, chatId, `\u274C Ticket ${ticketId} not found.`);
        return c.json({ ok: true });
      }
      await c.env.DB.prepare(`
        UPDATE support_tickets
        SET status = 'resolved', resolved_content = ?, resolved_at = datetime('now'), resolved_by = ?, updated_at = datetime('now')
        WHERE ticket_id = ?
      `).bind(resolvedContent, `TG:${fromName}`, ticketId).run();
      await c.env.DB.prepare(`
        INSERT INTO support_messages (ticket_id, sender_type, sender_name, message, attachments, source)
        VALUES (?, 'telegram', ?, ?, '[]', 'telegram')
      `).bind(ticketId, fromName, `\u2705 Ticket Resolved: ${resolvedContent}`).run();
      if (ticket.user_id) {
        await notifyTicketResolved(c.env, ticket.user_id, ticketId, resolvedContent);
        const timestamp = Math.floor(Date.now() / 1e3);
        const encodedContent = encodeURIComponent(resolvedContent.substring(0, 200));
        const notifUrl = `https://dakkho-student.pages.dev/help/contact-support/${ticketId}/${timestamp}/${encodedContent}`;
        await saveNotification(c.env, ticket.user_id, "Support Ticket Resolved", `Ticket ${ticketId} resolved: ${resolvedContent.substring(0, 100)}`, notifUrl, "success", "support");
      }
      await sendTelegramMessage(configToken, chatId, `\u2705 Ticket ${ticketId} resolved!`);
      return c.json({ ok: true });
    }
    const closeMatch = trimmedText.match(/^\/close\s+(TK-[\w-]+)$/);
    if (closeMatch) {
      const ticketId = closeMatch[1];
      const ticket = await c.env.DB.prepare(
        "SELECT * FROM support_tickets WHERE ticket_id = ?"
      ).bind(ticketId).first();
      if (!ticket) {
        await sendTelegramMessage(configToken, chatId, `\u274C Ticket ${ticketId} not found.`);
        return c.json({ ok: true });
      }
      await c.env.DB.prepare(
        "UPDATE support_tickets SET status = 'closed', updated_at = datetime('now') WHERE ticket_id = ?"
      ).bind(ticketId).run();
      if (ticket.user_id) {
        const notifUrl = `https://dakkho-student.pages.dev/help/contact-support/${ticketId}`;
        await saveNotification(c.env, ticket.user_id, "Support Ticket Closed", `Your ticket ${ticketId} has been closed.`, notifUrl, "warning", "support");
      }
      await sendTelegramMessage(configToken, chatId, `\u{1F512} Ticket ${ticketId} closed.`);
      return c.json({ ok: true });
    }
    await sendTelegramMessage(
      configToken,
      chatId,
      `\u2753 Unknown command. Use /start to see available commands.`
    );
    return c.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return c.json({ ok: true });
  }
});

// src/routes/video-streaming.ts
var videoStreamingRoutes = new Hono2();
function generateStreamToken(videoId, sessionId, expiry, secret) {
  const data = `${videoId}:${sessionId}:${expiry}`;
  const encoded = btoa(JSON.stringify({ v: videoId, s: sessionId, e: expiry }));
  return encoded;
}
function validateStreamToken(token, videoId) {
  try {
    const decoded = JSON.parse(atob(token));
    if (decoded.v !== videoId) return { valid: false };
    if (decoded.e && Date.now() > decoded.e) return { valid: false };
    return { valid: true, sessionId: decoded.s, expiry: decoded.e };
  } catch {
    return { valid: false };
  }
}
videoStreamingRoutes.post("/session/:videoId", studentAuthMiddleware, async (c) => {
  try {
    const videoId = c.req.param("videoId");
    const userId = c.get("studentId");
    const video = await c.env.DB.prepare(
      "SELECT course_id, is_preview, processing_status, hls_ready, available_qualities FROM videos WHERE id = ?"
    ).bind(videoId).first();
    if (!video) {
      return c.json({ error: "Video not found" }, 404);
    }
    if (!video.is_preview) {
      const enrollment = await c.env.DB.prepare(
        "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?"
      ).bind(userId, video.course_id).first();
      if (!enrollment) {
        return c.json({ error: "Not enrolled in this course" }, 403);
      }
    }
    const sessionId = crypto.randomUUID();
    const expiry = Date.now() + 10 * 60 * 1e3;
    const token = generateStreamToken(videoId, sessionId, expiry, "dakkho-stream-secret");
    await c.env.KV_CONFIG.put(`stream:${sessionId}`, JSON.stringify({
      videoId,
      userId,
      token,
      expiry,
      createdAt: Date.now()
    }), { expirationTtl: 900 });
    return c.json({
      success: true,
      sessionId,
      token,
      expiresAt: expiry,
      hlsReady: video.hls_ready === 1,
      availableQualities: JSON.parse(video.available_qualities || "[]"),
      processingStatus: video.processing_status || "pending"
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
videoStreamingRoutes.get("/playlist/:videoId", async (c) => {
  try {
    const videoId = c.req.param("videoId");
    const session = c.req.query("session") || "";
    const token = c.req.query("token") || "";
    const validation = validateStreamToken(token, videoId);
    if (!validation.valid || !validation.sessionId) {
      return c.json({ error: "Invalid or expired token" }, 403);
    }
    const sessionData = await c.env.KV_CONFIG.get(`stream:${validation.sessionId}`);
    if (!sessionData) {
      return c.json({ error: "Session expired" }, 401);
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.token !== token || parsed.videoId !== videoId) {
      return c.json({ error: "Invalid session" }, 403);
    }
    const video = await c.env.DB.prepare(
      "SELECT hls_ready, available_qualities FROM videos WHERE id = ?"
    ).bind(videoId).first();
    if (!video || !video.hls_ready) {
      return c.json({ error: "HLS not ready yet" }, 404);
    }
    const qualities = JSON.parse(video.available_qualities || '["360p"]');
    const segExpiry = Math.floor(Date.now() / 1e3) + 300;
    const segToken = generateStreamToken(videoId, validation.sessionId, segExpiry * 1e3, "dakkho-stream-secret");
    const workerUrl = new URL(c.req.url).origin;
    let m3u8 = "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10\n";
    for (const quality of qualities) {
      const height = quality.replace("p", "");
      let bandwidth = "800000";
      let resolution = "640x360";
      if (quality === "720p") {
        bandwidth = "2800000";
        resolution = "1280x720";
      }
      if (quality === "1080p") {
        bandwidth = "5000000";
        resolution = "1920x1080";
      }
      m3u8 += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution}
`;
      m3u8 += `${workerUrl}/api/video/stream/variant/${videoId}/${quality}/playlist.m3u8?session=${validation.sessionId}&token=${segToken}&exp=${segExpiry}
`;
    }
    return new Response(m3u8, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-store, no-cache",
        "Access-Control-Allow-Origin": c.req.header("origin") || "*"
      }
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
videoStreamingRoutes.get("/variant/:videoId/:quality/playlist.m3u8", async (c) => {
  try {
    const videoId = c.req.param("videoId");
    const quality = c.req.param("quality");
    const session = c.req.query("session") || "";
    const token = c.req.query("token") || "";
    const exp = c.req.query("exp") || "";
    const validation = validateStreamToken(token, videoId);
    if (!validation.valid) {
      return c.json({ error: "Invalid or expired token" }, 403);
    }
    if (exp && Math.floor(Date.now() / 1e3) > parseInt(exp)) {
      return c.json({ error: "Token expired" }, 403);
    }
    const sessionData = await c.env.KV_CONFIG.get(`stream:${validation.sessionId}`);
    if (!sessionData) {
      return c.json({ error: "Session expired" }, 401);
    }
    const key = `${videoId}/hls/${quality}/playlist.m3u8`;
    const object = await c.env.R2_VIDEOS.get(key);
    if (!object) {
      return c.json({ error: "Quality playlist not found" }, 404);
    }
    let playlist = await object.text();
    const workerUrl = new URL(c.req.url).origin;
    const segExpiry = Math.floor(Date.now() / 1e3) + 300;
    const segToken = generateStreamToken(videoId, validation.sessionId, segExpiry * 1e3, "dakkho-stream-secret");
    playlist = playlist.replace(
      /seg_(\d+)\.ts/g,
      `${workerUrl}/api/video/stream/seg/${videoId}/${quality}/seg_$1.ts?session=${validation.sessionId}&token=${segToken}&exp=${segExpiry}`
    );
    return new Response(playlist, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-store, no-cache",
        "Access-Control-Allow-Origin": c.req.header("origin") || "*"
      }
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
videoStreamingRoutes.get("/seg/:videoId/:quality/:segFile", async (c) => {
  try {
    const videoId = c.req.param("videoId");
    const quality = c.req.param("quality");
    const segFile = c.req.param("segFile");
    const session = c.req.query("session") || "";
    const token = c.req.query("token") || "";
    const exp = c.req.query("exp") || "";
    const validation = validateStreamToken(token, videoId);
    if (!validation.valid) {
      return c.json({ error: "Invalid token" }, 403);
    }
    if (exp && Math.floor(Date.now() / 1e3) > parseInt(exp)) {
      return c.json({ error: "Token expired" }, 403);
    }
    const sessionData = await c.env.KV_CONFIG.get(`stream:${validation.sessionId}`);
    if (!sessionData) {
      return c.json({ error: "Session expired" }, 401);
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.videoId !== videoId) {
      return c.json({ error: "Invalid session for this video" }, 403);
    }
    const key = `${videoId}/hls/${quality}/${segFile}`;
    const object = await c.env.R2_VIDEOS.get(key);
    if (!object) {
      return c.json({ error: "Segment not found" }, 404);
    }
    const headers = new Headers();
    headers.set("Content-Type", "video/mp2t");
    headers.set("Cache-Control", "private, max-age=300");
    headers.set("Access-Control-Allow-Origin", c.req.header("origin") || "*");
    if (object.httpMetadata?.contentType) {
      headers.set("Content-Type", object.httpMetadata.contentType);
    }
    return new Response(object.body, { headers });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
videoStreamingRoutes.get("/info/:videoId", async (c) => {
  try {
    const videoId = c.req.param("videoId");
    const authHeader = c.req.header("Authorization");
    let isAuthorized = false;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const adminSession = await c.env.DB.prepare(
        "SELECT id FROM admin_sessions WHERE id = ? AND is_active = 1"
      ).bind(token).first();
      if (adminSession) {
        isAuthorized = true;
      }
    }
    if (!isAuthorized) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const video = await c.env.DB.prepare(
      `SELECT id, title, duration, video_url, thumbnail_url, course_id, is_preview,
              processing_status, hls_ready, available_qualities
       FROM videos WHERE id = ?`
    ).bind(videoId).first();
    if (!video) {
      return c.json({ error: "Video not found" }, 404);
    }
    return c.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        duration: video.duration,
        thumbnailUrl: video.thumbnail_url,
        isPreview: video.is_preview === 1,
        hlsReady: video.hls_ready === 1,
        availableQualities: JSON.parse(video.available_qualities || "[]"),
        processingStatus: video.processing_status || "pending",
        // Legacy fallback URL (for non-HLS mode)
        fallbackUrl: video.video_url
      }
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
videoStreamingRoutes.put("/processing-status/:videoId", adminAuthMiddleware, async (c) => {
  try {
    const videoId = c.req.param("videoId");
    const body = await c.req.json();
    const allowedFields = [
      "processing_status",
      "hls_ready",
      "available_qualities",
      "raw_deleted",
      "file_size_original",
      "file_size_360p",
      "file_size_720p",
      "file_size_1080p",
      "processing_started_at",
      "processing_completed_at",
      "processing_error"
    ];
    if (body.add_quality) {
      const current = await c.env.DB.prepare(
        "SELECT available_qualities FROM videos WHERE id = ?"
      ).bind(videoId).first();
      const existing = JSON.parse(current?.available_qualities || "[]");
      if (!existing.includes(body.add_quality)) {
        existing.push(body.add_quality);
        body.available_qualities = JSON.stringify(existing);
      }
      delete body.add_quality;
    }
    const setClauses = [];
    const setValues = [];
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`);
        setValues.push(value);
      }
    }
    if (setClauses.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    setClauses.push("updated_at = datetime('now')");
    setValues.push(videoId);
    await c.env.DB.prepare(
      `UPDATE videos SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...setValues).run();
    return c.json({ success: true, videoId, updated: setClauses.length });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
videoStreamingRoutes.get("/pending-transcode", adminAuthMiddleware, async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "5");
    const result = await c.env.DB.prepare(
      `SELECT id, title, video_url, duration, processing_status, created_at
       FROM videos 
       WHERE processing_status = 'pending' 
         AND video_url IS NOT NULL 
         AND video_url != ''
       ORDER BY created_at ASC 
       LIMIT ?`
    ).bind(limit).all();
    return c.json({
      success: true,
      videos: result.results,
      total: result.results.length
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
var video_streaming_default = videoStreamingRoutes;

// src/routes/unified-auth.ts
var unifiedAuthRoutes = new Hono2();
unifiedAuthRoutes.post("/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }
    const user = await c.env.DB.prepare(
      "SELECT id, email, full_name, role, password_hash, is_active, avatar_url FROM users WHERE email = ? AND is_active = 1"
    ).bind(email).first();
    if (!user) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    const role = user.role || "student";
    const token = generateId();
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const ua = c.req.header("user-agent") || "unknown";
    if (role === "admin" || role === "super_admin") {
      const expiresAt = getSessionExpiry(7);
      await c.env.DB.prepare("DELETE FROM admin_sessions WHERE user_id = ?").bind(user.id).run();
      await c.env.DB.prepare(
        `INSERT INTO admin_sessions (id, user_id, email, name, role, ip_address, user_agent, expires_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).bind(token, user.id, user.email, user.full_name, role, ip, ua, expiresAt).run();
    } else if (role === "instructor") {
      await c.env.DB.prepare("DELETE FROM instructor_sessions WHERE user_id = ?").bind(user.id).run();
      await c.env.DB.prepare(
        `INSERT INTO instructor_sessions (id, user_id, email, name, ip_address, device_info, expires_at, is_active, avatar_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
      ).bind(token, user.id, user.email, user.full_name, ip, ua, getSessionExpiry(7), user.avatar_url || null).run();
    } else {
      await c.env.DB.prepare("DELETE FROM student_sessions WHERE user_id = ?").bind(user.id).run();
      await c.env.DB.prepare(
        `INSERT INTO student_sessions (id, user_id, email, name, ip_address, device_info, expires_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
      ).bind(token, user.id, user.email, user.full_name, ip, ua, getSessionExpiry(30)).run();
    }
    return c.json({
      success: true,
      token,
      role,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role,
        avatarUrl: user.avatar_url || ""
      }
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Unified login error:", error);
    return c.json({ error: message }, 401);
  }
});
unifiedAuthRoutes.get("/check", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ authenticated: false }, 401);
    }
    const token = authHeader.substring(7);
    const adminSession = await c.env.DB.prepare(
      "SELECT user_id, email, name, role, expires_at, is_active FROM admin_sessions WHERE id = ? AND is_active = 1"
    ).bind(token).first();
    if (adminSession && new Date(adminSession.expires_at) > /* @__PURE__ */ new Date()) {
      return c.json({
        authenticated: true,
        role: adminSession.role || "admin",
        user: { id: adminSession.user_id, email: adminSession.email, name: adminSession.name, role: adminSession.role || "admin" }
      });
    }
    const instructorSession = await c.env.DB.prepare(
      "SELECT user_id, email, name, avatar_url, expires_at, is_active FROM instructor_sessions WHERE id = ? AND is_active = 1"
    ).bind(token).first();
    if (instructorSession && new Date(instructorSession.expires_at) > /* @__PURE__ */ new Date()) {
      return c.json({
        authenticated: true,
        role: "instructor",
        instructor: {
          id: instructorSession.user_id,
          email: instructorSession.email,
          name: instructorSession.name,
          avatar_url: instructorSession.avatar_url
        },
        user: {
          id: instructorSession.user_id,
          email: instructorSession.email,
          name: instructorSession.name,
          role: "instructor",
          avatarUrl: instructorSession.avatar_url || ""
        }
      });
    }
    const studentSession = await c.env.DB.prepare(
      "SELECT user_id, email, name, expires_at, is_active FROM student_sessions WHERE id = ? AND is_active = 1"
    ).bind(token).first();
    if (studentSession && new Date(studentSession.expires_at) > /* @__PURE__ */ new Date()) {
      return c.json({
        authenticated: true,
        role: "student",
        user: {
          id: studentSession.user_id,
          email: studentSession.email,
          name: studentSession.name,
          role: "student"
        }
      });
    }
    return c.json({ authenticated: false }, 401);
  } catch {
    return c.json({ authenticated: false }, 401);
  }
});
unifiedAuthRoutes.post("/logout", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ success: true });
    }
    const token = authHeader.substring(7);
    try {
      await c.env.DB.prepare("UPDATE admin_sessions SET is_active = 0 WHERE id = ?").bind(token).run();
    } catch {
    }
    try {
      await c.env.DB.prepare("UPDATE instructor_sessions SET is_active = 0 WHERE id = ?").bind(token).run();
    } catch {
    }
    try {
      await c.env.DB.prepare("UPDATE student_sessions SET is_active = 0 WHERE id = ?").bind(token).run();
    } catch {
    }
    return c.json({ success: true });
  } catch {
    return c.json({ success: true });
  }
});
var unified_auth_default = unifiedAuthRoutes;

// src/index.ts
var app = new Hono2();
app.use("*", cors({
  origin: [
    "https://grayrat2026.github.io",
    "https://dakkho.pro.bd",
    "http://localhost:3000",
    // Cloudflare Pages domains
    "https://dakkho-admin.pages.dev",
    // Student app domains
    "https://dakkhostudent.pages.dev",
    "https://dakkho-student.pages.dev",
    // Instructor app
    "https://dakkho-instructor.pages.dev"
  ],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "apikey", "mh-v-api-key", "mh-piprapay-api-key"],
  exposeHeaders: ["Content-Length"],
  maxAge: 86400,
  credentials: true
}));
app.use("*", logger());
app.get("/", (c) => c.json({
  service: "DAKKHO Admin API",
  version: "2.0.0",
  status: "healthy",
  timestamp: (/* @__PURE__ */ new Date()).toISOString(),
  runtime: "Cloudflare Workers",
  framework: "Hono",
  backend: "D1"
}));
app.route("/auth", unified_auth_default);
app.route("/admin/auth", auth_default);
app.route("/admin/system", system_default);
app.route("/admin/users", users_default);
app.route("/admin/categories", categories_default);
app.route("/admin/instructors", instructors_default);
app.route("/instructor", instructor_default);
app.route("/admin/courses", courses_default);
app.route("/admin/videos", videos_default);
app.route("/admin/institutes", institutes_default);
app.route("/admin/config", config_default);
app.route("/admin/notifications", notifications_default);
app.route("/admin/analytics", analytics_default);
app.route("/admin/upload", upload_default);
app.route("/admin/email", email_default);
app.route("/admin/admin", admin_default);
app.route("/admin/coupons", coupons_default);
app.route("/admin/discounts", discounts_default);
app.route("/admin/events", events_default);
app.route("/admin/live-classes", live_classes_default);
app.route("/admin/payments", payments_default);
app.route("/admin/institute-requests", institute_requests_default);
app.route("/admin/push", push_default);
app.route("/admin/technologies", technologies_default);
app.route("/admin/subjects", subjects_default);
app.route("/admin/chapters", chapters_default);
app.route("/admin/lessons", lessons_default);
app.route("/admin/learning-points", learning_points_default);
app.route("/admin/packages", packages_default);
app.route("/admin/enrollments", enrollments_default);
app.route("/admin/achievements", achievements_default);
app.route("/admin/migrate", migrate_default);
app.route("/api/about", aboutPublicRoutes);
app.route("/api/support", supportPublicRoutes);
app.route("/api/webhook/telegram", telegramWebhookRoutes);
app.route("/api/watch-history", watch_history_default);
app.route("/api/video/stream", video_streaming_default);
app.route("/api", student_api_default);
app.route("/admin/about", aboutAdminRoutes);
app.route("/admin/support", supportAdminRoutes);
app.get("/upload/:bucketType/:key{.+}", async (c) => {
  const bucketType = c.req.param("bucketType");
  const key = c.req.param("key");
  try {
    const r2Bucket = getBucketForType(bucketType, c.env);
    const file = await getFile(r2Bucket, key);
    if (!file) {
      return c.json({ error: "File not found" }, 404);
    }
    const headers = new Headers();
    if (file.httpMetadata?.contentType) {
      headers.set("Content-Type", file.httpMetadata.contentType);
    }
    headers.set("Cache-Control", "public, max-age=604800, immutable");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("CDN-Cache-Control", "public, max-age=2592000");
    return new Response(file.body, { headers });
  } catch (error) {
    return c.json({ error: "Failed to serve file" }, 500);
  }
});
app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: err.message || "Internal server error" }, 500);
});
var index_default = {
  fetch: app.fetch,
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3).toISOString().replace("T", " ").replace("Z", "");
        const tickets = await env.DB.prepare(
          "SELECT ticket_id FROM support_tickets WHERE status IN ('resolved', 'closed') AND updated_at < ? AND updated_at > ''"
        ).bind(cutoff).all();
        if (!tickets.results.length) return;
        let deletedCount = 0;
        for (const ticket of tickets.results) {
          const messages = await env.DB.prepare(
            "SELECT attachments FROM support_messages WHERE ticket_id = ? AND attachments NOT IN ('[]', '', 'null')"
          ).bind(ticket.ticket_id).all();
          for (const msg of messages.results) {
            try {
              const keys = JSON.parse(msg.attachments || "[]");
              for (const key of keys) {
                if (key && key.startsWith("support/")) {
                  try {
                    await env.R2_SUPPORT_ATTACHMENTS.delete(key);
                    deletedCount++;
                  } catch {
                  }
                }
              }
            } catch {
            }
          }
          await env.DB.prepare(
            "UPDATE support_messages SET attachments = '[]' WHERE ticket_id = ? AND attachments NOT IN ('[]', '', 'null')"
          ).bind(ticket.ticket_id).run();
        }
        console.log(`[Cron] Cleaned ${deletedCount} R2 attachments from ${tickets.results.length} old resolved/closed tickets`);
      } catch (error) {
        console.error("[Cron] Failed to clean up attachments:", error);
      }
    })());
  }
};
export {
  index_default as default
};
