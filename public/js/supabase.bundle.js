// node_modules/@supabase/supabase-js/dist/umd/supabase.js
var supabase = (function(e) {
  function t(e2, t2) {
    var n2 = {};
    for (var r2 in e2) Object.prototype.hasOwnProperty.call(e2, r2) && t2.indexOf(r2) < 0 && (n2[r2] = e2[r2]);
    if (e2 != null && typeof Object.getOwnPropertySymbols == `function`) for (var i2 = 0, r2 = Object.getOwnPropertySymbols(e2); i2 < r2.length; i2++) t2.indexOf(r2[i2]) < 0 && Object.prototype.propertyIsEnumerable.call(e2, r2[i2]) && (n2[r2[i2]] = e2[r2[i2]]);
    return n2;
  }
  function n(e2, t2, n2, r2) {
    function i2(e3) {
      return e3 instanceof n2 ? e3 : new n2(function(t3) {
        t3(e3);
      });
    }
    return new (n2 ||= Promise)(function(n3, a2) {
      function o2(e3) {
        try {
          c2(r2.next(e3));
        } catch (e4) {
          a2(e4);
        }
      }
      function s2(e3) {
        try {
          c2(r2.throw(e3));
        } catch (e4) {
          a2(e4);
        }
      }
      function c2(e3) {
        e3.done ? n3(e3.value) : i2(e3.value).then(o2, s2);
      }
      c2((r2 = r2.apply(e2, t2 || [])).next());
    });
  }
  let r = (e2) => e2 ? (...t2) => e2(...t2) : (...e3) => fetch(...e3);
  var i = class extends Error {
    constructor(e2, t2 = `FunctionsError`, n2) {
      super(e2), this.name = t2, this.context = n2;
    }
    toJSON() {
      return { name: this.name, message: this.message, context: this.context };
    }
  }, a = class extends i {
    constructor(e2) {
      super(`Failed to send a request to the Edge Function`, `FunctionsFetchError`, e2);
    }
  }, o = class extends i {
    constructor(e2) {
      super(`Relay Error invoking the Edge Function`, `FunctionsRelayError`, e2);
    }
  }, s = class extends i {
    constructor(e2) {
      super(`Edge Function returned a non-2xx status code`, `FunctionsHttpError`, e2);
    }
  }, c;
  (function(e2) {
    e2.Any = `any`, e2.ApNortheast1 = `ap-northeast-1`, e2.ApNortheast2 = `ap-northeast-2`, e2.ApSouth1 = `ap-south-1`, e2.ApSoutheast1 = `ap-southeast-1`, e2.ApSoutheast2 = `ap-southeast-2`, e2.CaCentral1 = `ca-central-1`, e2.EuCentral1 = `eu-central-1`, e2.EuWest1 = `eu-west-1`, e2.EuWest2 = `eu-west-2`, e2.EuWest3 = `eu-west-3`, e2.SaEast1 = `sa-east-1`, e2.UsEast1 = `us-east-1`, e2.UsWest1 = `us-west-1`, e2.UsWest2 = `us-west-2`;
  })(c ||= {});
  var l = class {
    constructor(e2, { headers: t2 = {}, customFetch: n2, region: i2 = c.Any } = {}) {
      this.url = e2, this.headers = t2, this.region = i2, this.fetch = r(n2);
    }
    setAuth(e2) {
      this.headers.Authorization = `Bearer ${e2}`;
    }
    invoke(e2) {
      return n(this, arguments, void 0, function* (e3, t2 = {}) {
        let n2, r2;
        try {
          let { headers: i2, method: c2, body: l2, signal: u2, timeout: d2 } = t2, f2 = {}, { region: p2 } = t2;
          p2 ||= this.region;
          let m2 = new URL(`${this.url}/${e3}`);
          p2 && p2 !== `any` && (f2[`x-region`] = p2, m2.searchParams.set(`forceFunctionRegion`, p2));
          let h2;
          l2 && (i2 && !Object.prototype.hasOwnProperty.call(i2, `Content-Type`) || !i2) ? typeof Blob < `u` && l2 instanceof Blob || l2 instanceof ArrayBuffer ? (f2[`Content-Type`] = `application/octet-stream`, h2 = l2) : typeof l2 == `string` ? (f2[`Content-Type`] = `text/plain`, h2 = l2) : typeof FormData < `u` && l2 instanceof FormData ? h2 = l2 : (f2[`Content-Type`] = `application/json`, h2 = JSON.stringify(l2)) : h2 = l2 && typeof l2 != `string` && !(typeof Blob < `u` && l2 instanceof Blob) && !(l2 instanceof ArrayBuffer) && !(typeof FormData < `u` && l2 instanceof FormData) ? JSON.stringify(l2) : l2;
          let ee2 = u2;
          d2 && (r2 = new AbortController(), n2 = setTimeout(() => r2.abort(), d2), u2 ? (ee2 = r2.signal, u2.addEventListener(`abort`, () => r2.abort())) : ee2 = r2.signal);
          let g2 = yield this.fetch(m2.toString(), { method: c2 || `POST`, headers: Object.assign(Object.assign(Object.assign({}, f2), this.headers), i2), body: h2, signal: ee2 }).catch((e4) => {
            throw new a(e4);
          }), te2 = g2.headers.get(`x-relay-error`);
          if (te2 && te2 === `true`) throw new o(g2);
          if (!g2.ok) throw new s(g2);
          let _2 = (g2.headers.get(`Content-Type`) ?? `text/plain`).split(`;`)[0].trim(), ne2;
          return ne2 = _2 === `application/json` ? yield g2.json() : _2 === `application/octet-stream` || _2 === `application/pdf` ? yield g2.blob() : _2 === `text/event-stream` ? g2 : _2 === `multipart/form-data` ? yield g2.formData() : yield g2.text(), { data: ne2, error: null, response: g2 };
        } catch (e4) {
          return { data: null, error: e4, response: e4 instanceof s || e4 instanceof o ? e4.context : void 0 };
        } finally {
          n2 && clearTimeout(n2);
        }
      });
    }
  };
  let u = (e2) => Math.min(1e3 * 2 ** e2, 3e4), d = [520, 503], f = [`GET`, `HEAD`, `OPTIONS`];
  var p = class extends Error {
    constructor(e2) {
      super(e2.message), this.name = `PostgrestError`, this.details = e2.details, this.hint = e2.hint, this.code = e2.code;
    }
    toJSON() {
      return { name: this.name, message: this.message, details: this.details, hint: this.hint, code: this.code };
    }
  };
  function m(e2, t2) {
    return new Promise((n2) => {
      if (t2?.aborted) {
        n2();
        return;
      }
      let r2 = setTimeout(() => {
        t2?.removeEventListener(`abort`, i2), n2();
      }, e2);
      function i2() {
        clearTimeout(r2), n2();
      }
      t2?.addEventListener(`abort`, i2);
    });
  }
  function h(e2, t2, n2, r2) {
    return !(!r2 || n2 >= 3 || !f.includes(e2) || !d.includes(t2));
  }
  var ee = class {
    constructor(e2) {
      this.shouldThrowOnError = false, this.retryEnabled = true, this.method = e2.method, this.url = e2.url, this.headers = new Headers(e2.headers), this.schema = e2.schema, this.body = e2.body, this.shouldThrowOnError = e2.shouldThrowOnError ?? false, this.signal = e2.signal, this.isMaybeSingle = e2.isMaybeSingle ?? false, this.shouldStripNulls = e2.shouldStripNulls ?? false, this.urlLengthLimit = e2.urlLengthLimit ?? 8e3, this.retryEnabled = e2.retry ?? true, e2.fetch ? this.fetch = e2.fetch : this.fetch = fetch;
    }
    throwOnError() {
      return this.shouldThrowOnError = true, this;
    }
    stripNulls() {
      if (this.headers.get(`Accept`) === `text/csv`) throw Error(`stripNulls() cannot be used with csv()`);
      return this.shouldStripNulls = true, this;
    }
    setHeader(e2, t2) {
      return this.headers = new Headers(this.headers), this.headers.set(e2, t2), this;
    }
    retry(e2) {
      return this.retryEnabled = e2, this;
    }
    then(e2, t2) {
      var n2 = this;
      if (this.schema === void 0 || ([`GET`, `HEAD`].includes(this.method) ? this.headers.set(`Accept-Profile`, this.schema) : this.headers.set(`Content-Profile`, this.schema)), this.method !== `GET` && this.method !== `HEAD` && this.headers.set(`Content-Type`, `application/json`), this.shouldStripNulls) {
        let e3 = this.headers.get(`Accept`);
        e3 === `application/vnd.pgrst.object+json` ? this.headers.set(`Accept`, `application/vnd.pgrst.object+json;nulls=stripped`) : (!e3 || e3 === `application/json`) && this.headers.set(`Accept`, `application/vnd.pgrst.array+json;nulls=stripped`);
      }
      let r2 = this.fetch, i2 = (async () => {
        let e3 = 0;
        for (; ; ) {
          let t3 = new Headers(n2.headers);
          e3 > 0 && t3.set(`X-Retry-Count`, String(e3));
          let i3;
          try {
            i3 = await r2(n2.url.toString(), { method: n2.method, headers: t3, body: JSON.stringify(n2.body, (e4, t4) => typeof t4 == `bigint` ? t4.toString() : t4), signal: n2.signal });
          } catch (t4) {
            if (t4?.name === `AbortError` || t4?.code === `ABORT_ERR` || !f.includes(n2.method)) throw t4;
            if (n2.retryEnabled && e3 < 3) {
              let t5 = u(e3);
              e3++, await m(t5, n2.signal);
              continue;
            }
            throw t4;
          }
          if (h(n2.method, i3.status, e3, n2.retryEnabled)) {
            let t4 = i3.headers?.get(`Retry-After`) ?? null, r3 = t4 === null ? u(e3) : Math.max(0, parseInt(t4, 10) || 0) * 1e3;
            await i3.text(), e3++, await m(r3, n2.signal);
            continue;
          }
          return await n2.processResponse(i3);
        }
      })();
      return this.shouldThrowOnError || (i2 = i2.catch((e3) => {
        let t3 = ``, n3 = ``, r3 = ``, i3 = e3?.cause;
        if (i3) {
          let n4 = i3?.message ?? ``, r4 = i3?.code ?? ``;
          t3 = `${e3?.name ?? `FetchError`}: ${e3?.message}`, t3 += `

Caused by: ${i3?.name ?? `Error`}: ${n4}`, r4 && (t3 += ` (${r4})`), i3?.stack && (t3 += `
${i3.stack}`);
        } else t3 = e3?.stack ?? ``;
        let a2 = this.url.toString().length;
        return e3?.name === `AbortError` || e3?.code === `ABORT_ERR` ? (r3 = ``, n3 = `Request was aborted (timeout or manual cancellation)`, a2 > this.urlLengthLimit && (n3 += `. Note: Your request URL is ${a2} characters, which may exceed server limits. If selecting many fields, consider using views. If filtering with large arrays (e.g., .in('id', [many IDs])), consider using an RPC function to pass values server-side.`)) : (i3?.name === `HeadersOverflowError` || i3?.code === `UND_ERR_HEADERS_OVERFLOW`) && (r3 = ``, n3 = `HTTP headers exceeded server limits (typically 16KB)`, a2 > this.urlLengthLimit && (n3 += `. Your request URL is ${a2} characters. If selecting many fields, consider using views. If filtering with large arrays (e.g., .in('id', [200+ IDs])), consider using an RPC function instead.`)), { success: false, error: { message: `${e3?.name ?? `FetchError`}: ${e3?.message}`, details: t3, hint: n3, code: r3 }, data: null, count: null, status: 0, statusText: `` };
      })), i2.then(e2, t2);
    }
    async processResponse(e2) {
      var t2 = this;
      let n2 = null, r2 = null, i2 = null, a2 = e2.status, o2 = e2.statusText;
      if (e2.ok) {
        if (t2.method !== `HEAD`) {
          let n3 = await e2.text();
          n3 === `` || (r2 = t2.headers.get(`Accept`) === `text/csv` || t2.headers.get(`Accept`) && t2.headers.get(`Accept`)?.includes(`application/vnd.pgrst.plan+text`) ? n3 : JSON.parse(n3));
        }
        let s2 = t2.headers.get(`Prefer`)?.match(/count=(exact|planned|estimated)/), c2 = e2.headers.get(`content-range`)?.split(`/`);
        s2 && c2 && c2.length > 1 && (i2 = parseInt(c2[1])), t2.isMaybeSingle && Array.isArray(r2) && (r2.length > 1 ? (n2 = { code: `PGRST116`, details: `Results contain ${r2.length} rows, application/vnd.pgrst.object+json requires 1 row`, hint: null, message: `JSON object requested, multiple (or no) rows returned` }, r2 = null, i2 = null, a2 = 406, o2 = `Not Acceptable`) : r2 = r2.length === 1 ? r2[0] : null);
      } else {
        let i3 = await e2.text();
        try {
          n2 = JSON.parse(i3), Array.isArray(n2) && e2.status === 404 && (r2 = [], n2 = null, a2 = 200, o2 = `OK`);
        } catch {
          e2.status === 404 && i3 === `` ? (a2 = 204, o2 = `No Content`) : n2 = { message: i3 };
        }
        if (n2 && t2.shouldThrowOnError) throw new p(n2);
      }
      return { success: n2 === null, error: n2, data: r2, count: i2, status: a2, statusText: o2 };
    }
    returns() {
      return this;
    }
    overrideTypes() {
      return this;
    }
  }, g = class extends ee {
    select(e2) {
      let t2 = false, n2 = (e2 ?? `*`).split(``).map((e3) => /\s/.test(e3) && !t2 ? `` : (e3 === `"` && (t2 = !t2), e3)).join(``);
      return this.url.searchParams.set(`select`, n2), this.headers.append(`Prefer`, `return=representation`), this;
    }
    order(e2, { ascending: t2 = true, nullsFirst: n2, foreignTable: r2, referencedTable: i2 = r2 } = {}) {
      let a2 = i2 ? `${i2}.order` : `order`, o2 = this.url.searchParams.get(a2);
      return this.url.searchParams.set(a2, `${o2 ? `${o2},` : ``}${e2}.${t2 ? `asc` : `desc`}${n2 === void 0 ? `` : n2 ? `.nullsfirst` : `.nullslast`}`), this;
    }
    limit(e2, { foreignTable: t2, referencedTable: n2 = t2 } = {}) {
      let r2 = n2 === void 0 ? `limit` : `${n2}.limit`;
      return this.url.searchParams.set(r2, `${e2}`), this;
    }
    range(e2, t2, { foreignTable: n2, referencedTable: r2 = n2 } = {}) {
      let i2 = r2 === void 0 ? `offset` : `${r2}.offset`, a2 = r2 === void 0 ? `limit` : `${r2}.limit`;
      return this.url.searchParams.set(i2, `${e2}`), this.url.searchParams.set(a2, `${t2 - e2 + 1}`), this;
    }
    abortSignal(e2) {
      return this.signal = e2, this;
    }
    single() {
      return this.headers.set(`Accept`, `application/vnd.pgrst.object+json`), this;
    }
    maybeSingle() {
      return this.isMaybeSingle = true, this;
    }
    csv() {
      return this.headers.set(`Accept`, `text/csv`), this;
    }
    geojson() {
      return this.headers.set(`Accept`, `application/geo+json`), this;
    }
    explain({ analyze: e2 = false, verbose: t2 = false, settings: n2 = false, buffers: r2 = false, wal: i2 = false, format: a2 = `text` } = {}) {
      let o2 = [e2 ? `analyze` : null, t2 ? `verbose` : null, n2 ? `settings` : null, r2 ? `buffers` : null, i2 ? `wal` : null].filter(Boolean).join(`|`), s2 = this.headers.get(`Accept`) ?? `application/json`;
      return this.headers.set(`Accept`, `application/vnd.pgrst.plan+${a2}; for="${s2}"; options=${o2};`), this;
    }
    rollback() {
      return this.headers.append(`Prefer`, `tx=rollback`), this;
    }
    returns() {
      return this;
    }
    maxAffected(e2) {
      return this.headers.append(`Prefer`, `handling=strict`), this.headers.append(`Prefer`, `max-affected=${e2}`), this;
    }
  };
  let te = RegExp(`[,()]`);
  var _ = class extends g {
    eq(e2, t2) {
      return this.url.searchParams.append(e2, `eq.${t2}`), this;
    }
    neq(e2, t2) {
      return this.url.searchParams.append(e2, `neq.${t2}`), this;
    }
    gt(e2, t2) {
      return this.url.searchParams.append(e2, `gt.${t2}`), this;
    }
    gte(e2, t2) {
      return this.url.searchParams.append(e2, `gte.${t2}`), this;
    }
    lt(e2, t2) {
      return this.url.searchParams.append(e2, `lt.${t2}`), this;
    }
    lte(e2, t2) {
      return this.url.searchParams.append(e2, `lte.${t2}`), this;
    }
    like(e2, t2) {
      return this.url.searchParams.append(e2, `like.${t2}`), this;
    }
    likeAllOf(e2, t2) {
      return this.url.searchParams.append(e2, `like(all).{${t2.join(`,`)}}`), this;
    }
    likeAnyOf(e2, t2) {
      return this.url.searchParams.append(e2, `like(any).{${t2.join(`,`)}}`), this;
    }
    ilike(e2, t2) {
      return this.url.searchParams.append(e2, `ilike.${t2}`), this;
    }
    ilikeAllOf(e2, t2) {
      return this.url.searchParams.append(e2, `ilike(all).{${t2.join(`,`)}}`), this;
    }
    ilikeAnyOf(e2, t2) {
      return this.url.searchParams.append(e2, `ilike(any).{${t2.join(`,`)}}`), this;
    }
    regexMatch(e2, t2) {
      return this.url.searchParams.append(e2, `match.${t2}`), this;
    }
    regexIMatch(e2, t2) {
      return this.url.searchParams.append(e2, `imatch.${t2}`), this;
    }
    is(e2, t2) {
      return this.url.searchParams.append(e2, `is.${t2}`), this;
    }
    isDistinct(e2, t2) {
      return this.url.searchParams.append(e2, `isdistinct.${t2}`), this;
    }
    in(e2, t2) {
      let n2 = Array.from(new Set(t2)).map((e3) => typeof e3 == `string` && te.test(e3) ? `"${e3}"` : `${e3}`).join(`,`);
      return this.url.searchParams.append(e2, `in.(${n2})`), this;
    }
    notIn(e2, t2) {
      let n2 = Array.from(new Set(t2)).map((e3) => typeof e3 == `string` && te.test(e3) ? `"${e3}"` : `${e3}`).join(`,`);
      return this.url.searchParams.append(e2, `not.in.(${n2})`), this;
    }
    contains(e2, t2) {
      return typeof t2 == `string` ? this.url.searchParams.append(e2, `cs.${t2}`) : Array.isArray(t2) ? this.url.searchParams.append(e2, `cs.{${t2.join(`,`)}}`) : this.url.searchParams.append(e2, `cs.${JSON.stringify(t2)}`), this;
    }
    containedBy(e2, t2) {
      return typeof t2 == `string` ? this.url.searchParams.append(e2, `cd.${t2}`) : Array.isArray(t2) ? this.url.searchParams.append(e2, `cd.{${t2.join(`,`)}}`) : this.url.searchParams.append(e2, `cd.${JSON.stringify(t2)}`), this;
    }
    rangeGt(e2, t2) {
      return this.url.searchParams.append(e2, `sr.${t2}`), this;
    }
    rangeGte(e2, t2) {
      return this.url.searchParams.append(e2, `nxl.${t2}`), this;
    }
    rangeLt(e2, t2) {
      return this.url.searchParams.append(e2, `sl.${t2}`), this;
    }
    rangeLte(e2, t2) {
      return this.url.searchParams.append(e2, `nxr.${t2}`), this;
    }
    rangeAdjacent(e2, t2) {
      return this.url.searchParams.append(e2, `adj.${t2}`), this;
    }
    overlaps(e2, t2) {
      return typeof t2 == `string` ? this.url.searchParams.append(e2, `ov.${t2}`) : this.url.searchParams.append(e2, `ov.{${t2.join(`,`)}}`), this;
    }
    textSearch(e2, t2, { config: n2, type: r2 } = {}) {
      let i2 = ``;
      r2 === `plain` ? i2 = `pl` : r2 === `phrase` ? i2 = `ph` : r2 === `websearch` && (i2 = `w`);
      let a2 = n2 === void 0 ? `` : `(${n2})`;
      return this.url.searchParams.append(e2, `${i2}fts${a2}.${t2}`), this;
    }
    match(e2) {
      return Object.entries(e2).filter(([e3, t2]) => t2 !== void 0).forEach(([e3, t2]) => {
        this.url.searchParams.append(e3, `eq.${t2}`);
      }), this;
    }
    not(e2, t2, n2) {
      return this.url.searchParams.append(e2, `not.${t2}.${n2}`), this;
    }
    or(e2, { foreignTable: t2, referencedTable: n2 = t2 } = {}) {
      let r2 = n2 ? `${n2}.or` : `or`;
      return this.url.searchParams.append(r2, `(${e2})`), this;
    }
    filter(e2, t2, n2) {
      return this.url.searchParams.append(e2, `${t2}.${n2}`), this;
    }
  }, ne = class {
    constructor(e2, { headers: t2 = {}, schema: n2, fetch: r2, urlLengthLimit: i2 = 8e3, retry: a2 }) {
      this.url = e2, this.headers = new Headers(t2), this.schema = n2, this.fetch = r2, this.urlLengthLimit = i2, this.retry = a2;
    }
    cloneRequestState() {
      return { url: new URL(this.url.toString()), headers: new Headers(this.headers) };
    }
    select(e2, t2) {
      let { head: n2 = false, count: r2 } = t2 ?? {}, i2 = n2 ? `HEAD` : `GET`, a2 = false, o2 = (e2 ?? `*`).split(``).map((e3) => /\s/.test(e3) && !a2 ? `` : (e3 === `"` && (a2 = !a2), e3)).join(``), { url: s2, headers: c2 } = this.cloneRequestState();
      return s2.searchParams.set(`select`, o2), r2 && c2.append(`Prefer`, `count=${r2}`), new _({ method: i2, url: s2, headers: c2, schema: this.schema, fetch: this.fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
    }
    insert(e2, { count: t2, defaultToNull: n2 = true } = {}) {
      let { url: r2, headers: i2 } = this.cloneRequestState();
      if (t2 && i2.append(`Prefer`, `count=${t2}`), n2 || i2.append(`Prefer`, `missing=default`), Array.isArray(e2)) {
        let t3 = e2.reduce((e3, t4) => e3.concat(Object.keys(t4)), []);
        if (t3.length > 0) {
          let e3 = [...new Set(t3)].map((e4) => `"${e4}"`);
          r2.searchParams.set(`columns`, e3.join(`,`));
        }
      }
      return new _({ method: `POST`, url: r2, headers: i2, schema: this.schema, body: e2, fetch: this.fetch ?? fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
    }
    upsert(e2, { onConflict: t2, ignoreDuplicates: n2 = false, count: r2, defaultToNull: i2 = true } = {}) {
      let { url: a2, headers: o2 } = this.cloneRequestState();
      if (o2.append(`Prefer`, `resolution=${n2 ? `ignore` : `merge`}-duplicates`), t2 !== void 0 && a2.searchParams.set(`on_conflict`, t2), r2 && o2.append(`Prefer`, `count=${r2}`), i2 || o2.append(`Prefer`, `missing=default`), Array.isArray(e2)) {
        let t3 = e2.reduce((e3, t4) => e3.concat(Object.keys(t4)), []);
        if (t3.length > 0) {
          let e3 = [...new Set(t3)].map((e4) => `"${e4}"`);
          a2.searchParams.set(`columns`, e3.join(`,`));
        }
      }
      return new _({ method: `POST`, url: a2, headers: o2, schema: this.schema, body: e2, fetch: this.fetch ?? fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
    }
    update(e2, { count: t2 } = {}) {
      let { url: n2, headers: r2 } = this.cloneRequestState();
      return t2 && r2.append(`Prefer`, `count=${t2}`), new _({ method: `PATCH`, url: n2, headers: r2, schema: this.schema, body: e2, fetch: this.fetch ?? fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
    }
    delete({ count: e2 } = {}) {
      let { url: t2, headers: n2 } = this.cloneRequestState();
      return e2 && n2.append(`Prefer`, `count=${e2}`), new _({ method: `DELETE`, url: t2, headers: n2, schema: this.schema, fetch: this.fetch ?? fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
    }
  };
  function re(e2) {
    "@babel/helpers - typeof";
    return re = typeof Symbol == `function` && typeof Symbol.iterator == `symbol` ? function(e3) {
      return typeof e3;
    } : function(e3) {
      return e3 && typeof Symbol == `function` && e3.constructor === Symbol && e3 !== Symbol.prototype ? `symbol` : typeof e3;
    }, re(e2);
  }
  function ie(e2, t2) {
    if (re(e2) != `object` || !e2) return e2;
    var n2 = e2[Symbol.toPrimitive];
    if (n2 !== void 0) {
      var r2 = n2.call(e2, t2 || `default`);
      if (re(r2) != `object`) return r2;
      throw TypeError(`@@toPrimitive must return a primitive value.`);
    }
    return (t2 === `string` ? String : Number)(e2);
  }
  function ae(e2) {
    var t2 = ie(e2, `string`);
    return re(t2) == `symbol` ? t2 : t2 + ``;
  }
  function oe(e2, t2, n2) {
    return (t2 = ae(t2)) in e2 ? Object.defineProperty(e2, t2, { value: n2, enumerable: true, configurable: true, writable: true }) : e2[t2] = n2, e2;
  }
  function se(e2, t2) {
    var n2 = Object.keys(e2);
    if (Object.getOwnPropertySymbols) {
      var r2 = Object.getOwnPropertySymbols(e2);
      t2 && (r2 = r2.filter(function(t3) {
        return Object.getOwnPropertyDescriptor(e2, t3).enumerable;
      })), n2.push.apply(n2, r2);
    }
    return n2;
  }
  function ce(e2) {
    for (var t2 = 1; t2 < arguments.length; t2++) {
      var n2 = arguments[t2] == null ? {} : arguments[t2];
      t2 % 2 ? se(Object(n2), true).forEach(function(t3) {
        oe(e2, t3, n2[t3]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e2, Object.getOwnPropertyDescriptors(n2)) : se(Object(n2)).forEach(function(t3) {
        Object.defineProperty(e2, t3, Object.getOwnPropertyDescriptor(n2, t3));
      });
    }
    return e2;
  }
  var le = class e2 {
    constructor(e3, { headers: t2 = {}, schema: n2, fetch: r2, timeout: i2, urlLengthLimit: a2 = 8e3, retry: o2 } = {}) {
      this.url = e3, this.headers = new Headers(t2), this.schemaName = n2, this.urlLengthLimit = a2;
      let s2 = r2 ?? globalThis.fetch;
      i2 !== void 0 && i2 > 0 ? this.fetch = (e4, t3) => {
        let n3 = new AbortController(), r3 = setTimeout(() => n3.abort(), i2), a3 = t3?.signal;
        if (a3) {
          if (a3.aborted) return clearTimeout(r3), s2(e4, t3);
          let i3 = () => {
            clearTimeout(r3), n3.abort();
          };
          return a3.addEventListener(`abort`, i3, { once: true }), s2(e4, ce(ce({}, t3), {}, { signal: n3.signal })).finally(() => {
            clearTimeout(r3), a3.removeEventListener(`abort`, i3);
          });
        }
        return s2(e4, ce(ce({}, t3), {}, { signal: n3.signal })).finally(() => clearTimeout(r3));
      } : this.fetch = s2, this.retry = o2;
    }
    from(e3) {
      if (!e3 || typeof e3 != `string` || e3.trim() === ``) throw Error(`Invalid relation name: relation must be a non-empty string.`);
      return new ne(new URL(`${this.url}/${e3}`), { headers: new Headers(this.headers), schema: this.schemaName, fetch: this.fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
    }
    schema(t2) {
      return new e2(this.url, { headers: this.headers, schema: t2, fetch: this.fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
    }
    rpc(e3, t2 = {}, { head: n2 = false, get: r2 = false, count: i2 } = {}) {
      let a2, o2 = new URL(`${this.url}/rpc/${e3}`), s2, c2 = (e4) => typeof e4 == `object` && !!e4 && (!Array.isArray(e4) || e4.some(c2)), l2 = n2 && Object.values(t2).some(c2);
      l2 ? (a2 = `POST`, s2 = t2) : n2 || r2 ? (a2 = n2 ? `HEAD` : `GET`, Object.entries(t2).filter(([e4, t3]) => t3 !== void 0).map(([e4, t3]) => [e4, Array.isArray(t3) ? `{${t3.join(`,`)}}` : `${t3}`]).forEach(([e4, t3]) => {
        o2.searchParams.append(e4, t3);
      })) : (a2 = `POST`, s2 = t2);
      let u2 = new Headers(this.headers);
      return l2 ? u2.set(`Prefer`, i2 ? `count=${i2},return=minimal` : `return=minimal`) : i2 && u2.set(`Prefer`, `count=${i2}`), new _({ method: a2, url: o2, headers: u2, schema: this.schemaName, body: s2, fetch: this.fetch ?? fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
    }
  }, ue = class {
    constructor() {
    }
    static detectEnvironment() {
      if (typeof WebSocket < `u`) return { type: `native`, wsConstructor: WebSocket };
      let e2 = globalThis;
      if (typeof globalThis < `u` && e2.WebSocket !== void 0) return { type: `native`, wsConstructor: e2.WebSocket };
      let t2 = typeof global < `u` ? global : void 0;
      if (t2 && t2.WebSocket !== void 0) return { type: `native`, wsConstructor: t2.WebSocket };
      if (typeof globalThis < `u` && e2.WebSocketPair !== void 0 && globalThis.WebSocket === void 0) return { type: `cloudflare`, error: `Cloudflare Workers detected. WebSocket clients are not supported in Cloudflare Workers.`, workaround: `Use Cloudflare Workers WebSocket API for server-side WebSocket handling, or deploy to a different runtime.` };
      if (typeof globalThis < `u` && e2.EdgeRuntime || typeof navigator < `u` && navigator.userAgent?.includes(`Vercel-Edge`)) return { type: `unsupported`, error: `Edge runtime detected (Vercel Edge/Netlify Edge). WebSockets are not supported in edge functions.`, workaround: `Use serverless functions or a different deployment target for WebSocket functionality.` };
      let n2 = globalThis.process;
      if (n2) {
        let e3 = n2.versions;
        if (e3 && e3.node) {
          let t3 = e3.node, n3 = parseInt(t3.replace(/^v/, ``).split(`.`)[0]);
          return n3 >= 22 ? globalThis.WebSocket === void 0 ? { type: `unsupported`, error: `Node.js ${n3} detected but native WebSocket not found.`, workaround: `Provide a WebSocket implementation via the transport option.` } : { type: `native`, wsConstructor: globalThis.WebSocket } : { type: `unsupported`, error: `Node.js ${n3} detected without native WebSocket support.`, workaround: `For Node.js < 22, install "ws" package and provide it via the transport option:
import ws from "ws"
new RealtimeClient(url, { transport: ws })` };
        }
      }
      return { type: `unsupported`, error: `Unknown JavaScript runtime without WebSocket support.`, workaround: `Ensure you're running in a supported environment (browser, Node.js, Deno) or provide a custom WebSocket implementation.` };
    }
    static getWebSocketConstructor() {
      let e2 = this.detectEnvironment();
      if (e2.wsConstructor) return e2.wsConstructor;
      let t2 = e2.error || `WebSocket not supported in this environment.`;
      throw e2.workaround && (t2 += `

Suggested solution: ${e2.workaround}`), Error(t2);
    }
    static isWebSocketSupported() {
      try {
        let e2 = this.detectEnvironment();
        return e2.type === `native` || e2.type === `ws`;
      } catch {
        return false;
      }
    }
  };
  let v = { closed: `closed`, errored: `errored`, joined: `joined`, joining: `joining`, leaving: `leaving` }, de = { close: `phx_close`, error: `phx_error`, join: `phx_join`, reply: `phx_reply`, leave: `phx_leave`, access_token: `access_token` }, fe = { connecting: `connecting`, open: `open`, closing: `closing`, closed: `closed` };
  var pe = class {
    constructor(e2) {
      this.HEADER_LENGTH = 1, this.USER_BROADCAST_PUSH_META_LENGTH = 6, this.KINDS = { userBroadcastPush: 3, userBroadcast: 4 }, this.BINARY_ENCODING = 0, this.JSON_ENCODING = 1, this.BROADCAST_EVENT = `broadcast`, this.allowedMetadataKeys = [], this.allowedMetadataKeys = e2 ?? [];
    }
    encode(e2, t2) {
      if (e2.event === this.BROADCAST_EVENT && !(e2.payload instanceof ArrayBuffer) && typeof e2.payload.event == `string`) return t2(this._binaryEncodeUserBroadcastPush(e2));
      let n2 = [e2.join_ref, e2.ref, e2.topic, e2.event, e2.payload];
      return t2(JSON.stringify(n2));
    }
    _binaryEncodeUserBroadcastPush(e2) {
      return this._isArrayBuffer(e2.payload?.payload) ? this._encodeBinaryUserBroadcastPush(e2) : this._encodeJsonUserBroadcastPush(e2);
    }
    _encodeBinaryUserBroadcastPush(e2) {
      let t2 = e2.payload?.payload ?? new ArrayBuffer(0);
      return this._encodeUserBroadcastPush(e2, this.BINARY_ENCODING, t2);
    }
    _encodeJsonUserBroadcastPush(e2) {
      let t2 = e2.payload?.payload ?? {}, n2 = new TextEncoder().encode(JSON.stringify(t2)).buffer;
      return this._encodeUserBroadcastPush(e2, this.JSON_ENCODING, n2);
    }
    _encodeUserBroadcastPush(e2, t2, n2) {
      let r2 = e2.topic, i2 = e2.ref ?? ``, a2 = e2.join_ref ?? ``, o2 = e2.payload.event, s2 = this.allowedMetadataKeys ? this._pick(e2.payload, this.allowedMetadataKeys) : {}, c2 = Object.keys(s2).length === 0 ? `` : JSON.stringify(s2);
      if (a2.length > 255) throw Error(`joinRef length ${a2.length} exceeds maximum of 255`);
      if (i2.length > 255) throw Error(`ref length ${i2.length} exceeds maximum of 255`);
      if (r2.length > 255) throw Error(`topic length ${r2.length} exceeds maximum of 255`);
      if (o2.length > 255) throw Error(`userEvent length ${o2.length} exceeds maximum of 255`);
      if (c2.length > 255) throw Error(`metadata length ${c2.length} exceeds maximum of 255`);
      let l2 = this.USER_BROADCAST_PUSH_META_LENGTH + a2.length + i2.length + r2.length + o2.length + c2.length, u2 = new ArrayBuffer(this.HEADER_LENGTH + l2), d2 = new DataView(u2), f2 = 0;
      d2.setUint8(f2++, this.KINDS.userBroadcastPush), d2.setUint8(f2++, a2.length), d2.setUint8(f2++, i2.length), d2.setUint8(f2++, r2.length), d2.setUint8(f2++, o2.length), d2.setUint8(f2++, c2.length), d2.setUint8(f2++, t2), Array.from(a2, (e3) => d2.setUint8(f2++, e3.charCodeAt(0))), Array.from(i2, (e3) => d2.setUint8(f2++, e3.charCodeAt(0))), Array.from(r2, (e3) => d2.setUint8(f2++, e3.charCodeAt(0))), Array.from(o2, (e3) => d2.setUint8(f2++, e3.charCodeAt(0))), Array.from(c2, (e3) => d2.setUint8(f2++, e3.charCodeAt(0)));
      var p2 = new Uint8Array(u2.byteLength + n2.byteLength);
      return p2.set(new Uint8Array(u2), 0), p2.set(new Uint8Array(n2), u2.byteLength), p2.buffer;
    }
    decode(e2, t2) {
      if (this._isArrayBuffer(e2)) return t2(this._binaryDecode(e2));
      if (typeof e2 == `string`) {
        let [n2, r2, i2, a2, o2] = JSON.parse(e2);
        return t2({ join_ref: n2, ref: r2, topic: i2, event: a2, payload: o2 });
      }
      return t2({});
    }
    _binaryDecode(e2) {
      let t2 = new DataView(e2), n2 = t2.getUint8(0), r2 = new TextDecoder();
      switch (n2) {
        case this.KINDS.userBroadcast:
          return this._decodeUserBroadcast(e2, t2, r2);
      }
    }
    _decodeUserBroadcast(e2, t2, n2) {
      let r2 = t2.getUint8(1), i2 = t2.getUint8(2), a2 = t2.getUint8(3), o2 = t2.getUint8(4), s2 = this.HEADER_LENGTH + 4, c2 = n2.decode(e2.slice(s2, s2 + r2));
      s2 += r2;
      let l2 = n2.decode(e2.slice(s2, s2 + i2));
      s2 += i2;
      let u2 = n2.decode(e2.slice(s2, s2 + a2));
      s2 += a2;
      let d2 = e2.slice(s2, e2.byteLength), f2 = o2 === this.JSON_ENCODING ? JSON.parse(n2.decode(d2)) : d2, p2 = { type: this.BROADCAST_EVENT, event: l2, payload: f2 };
      return a2 > 0 && (p2.meta = JSON.parse(u2)), { join_ref: null, ref: null, topic: c2, event: this.BROADCAST_EVENT, payload: p2 };
    }
    _isArrayBuffer(e2) {
      return e2 instanceof ArrayBuffer || e2?.constructor?.name === `ArrayBuffer`;
    }
    _pick(e2, t2) {
      return !e2 || typeof e2 != `object` ? {} : Object.fromEntries(Object.entries(e2).filter(([e3]) => t2.includes(e3)));
    }
  }, y;
  (function(e2) {
    e2.abstime = `abstime`, e2.bool = `bool`, e2.date = `date`, e2.daterange = `daterange`, e2.float4 = `float4`, e2.float8 = `float8`, e2.int2 = `int2`, e2.int4 = `int4`, e2.int4range = `int4range`, e2.int8 = `int8`, e2.int8range = `int8range`, e2.json = `json`, e2.jsonb = `jsonb`, e2.money = `money`, e2.numeric = `numeric`, e2.oid = `oid`, e2.reltime = `reltime`, e2.text = `text`, e2.time = `time`, e2.timestamp = `timestamp`, e2.timestamptz = `timestamptz`, e2.timetz = `timetz`, e2.tsrange = `tsrange`, e2.tstzrange = `tstzrange`;
  })(y ||= {});
  let me = (e2, t2, n2 = {}) => {
    let r2 = n2.skipTypes ?? [];
    return t2 ? Object.keys(t2).reduce((n3, i2) => (n3[i2] = he(i2, e2, t2, r2), n3), {}) : {};
  }, he = (e2, t2, n2, r2) => {
    let i2 = t2.find((t3) => t3.name === e2)?.type, a2 = n2[e2];
    return i2 && !r2.includes(i2) ? ge(i2, a2) : _e(a2);
  }, ge = (e2, t2) => {
    if (e2.charAt(0) === `_`) return xe(t2, e2.slice(1, e2.length));
    switch (e2) {
      case y.bool:
        return ve(t2);
      case y.float4:
      case y.float8:
      case y.int2:
      case y.int4:
      case y.int8:
      case y.numeric:
      case y.oid:
        return ye(t2);
      case y.json:
      case y.jsonb:
        return be(t2);
      case y.timestamp:
        return Se(t2);
      case y.abstime:
      case y.date:
      case y.daterange:
      case y.int4range:
      case y.int8range:
      case y.money:
      case y.reltime:
      case y.text:
      case y.time:
      case y.timestamptz:
      case y.timetz:
      case y.tsrange:
      case y.tstzrange:
        return _e(t2);
      default:
        return _e(t2);
    }
  }, _e = (e2) => e2, ve = (e2) => {
    switch (e2) {
      case `t`:
        return true;
      case `f`:
        return false;
      default:
        return e2;
    }
  }, ye = (e2) => {
    if (typeof e2 == `string`) {
      let t2 = parseFloat(e2);
      if (!Number.isNaN(t2)) return t2;
    }
    return e2;
  }, be = (e2) => {
    if (typeof e2 == `string`) try {
      return JSON.parse(e2);
    } catch {
      return e2;
    }
    return e2;
  }, xe = (e2, t2) => {
    if (typeof e2 != `string`) return e2;
    let n2 = e2.length - 1, r2 = e2[n2];
    if (e2[0] === `{` && r2 === `}`) {
      let r3, i2 = e2.slice(1, n2);
      try {
        r3 = JSON.parse(`[` + i2 + `]`);
      } catch {
        r3 = i2 ? i2.split(`,`) : [];
      }
      return r3.map((e3) => ge(t2, e3));
    }
    return e2;
  }, Se = (e2) => typeof e2 == `string` ? e2.replace(` `, `T`) : e2, Ce = (e2) => {
    let t2 = new URL(e2);
    return t2.protocol = t2.protocol.replace(/^ws/i, `http`), t2.pathname = t2.pathname.replace(/\/+$/, ``).replace(/\/socket\/websocket$/i, ``).replace(/\/socket$/i, ``).replace(/\/websocket$/i, ``), t2.pathname === `` || t2.pathname === `/` ? t2.pathname = `/api/broadcast` : t2.pathname += `/api/broadcast`, t2.href;
  };
  var we = (e2) => typeof e2 == `function` ? e2 : function() {
    return e2;
  }, Te = typeof self < `u` ? self : null, b = typeof window < `u` ? window : null, x = Te || b || globalThis, Ee = `2.0.0`, De = 1e4, Oe = 1e3, S = { connecting: 0, open: 1, closing: 2, closed: 3 }, C = { closed: `closed`, errored: `errored`, joined: `joined`, joining: `joining`, leaving: `leaving` }, w = { close: `phx_close`, error: `phx_error`, join: `phx_join`, reply: `phx_reply`, leave: `phx_leave` }, ke = { longpoll: `longpoll`, websocket: `websocket` }, Ae = { complete: 4 }, je = `base64url.bearer.phx.`, Me = class {
    constructor(e2, t2, n2, r2) {
      this.channel = e2, this.event = t2, this.payload = n2 || function() {
        return {};
      }, this.receivedResp = null, this.timeout = r2, this.timeoutTimer = null, this.recHooks = [], this.sent = false, this.ref = void 0;
    }
    resend(e2) {
      this.timeout = e2, this.reset(), this.send();
    }
    send() {
      this.hasReceived(`timeout`) || (this.startTimeout(), this.sent = true, this.channel.socket.push({ topic: this.channel.topic, event: this.event, payload: this.payload(), ref: this.ref, join_ref: this.channel.joinRef() }));
    }
    receive(e2, t2) {
      return this.hasReceived(e2) && t2(this.receivedResp.response), this.recHooks.push({ status: e2, callback: t2 }), this;
    }
    reset() {
      this.cancelRefEvent(), this.ref = null, this.refEvent = null, this.receivedResp = null, this.sent = false;
    }
    destroy() {
      this.cancelRefEvent(), this.cancelTimeout();
    }
    matchReceive({ status: e2, response: t2, _ref: n2 }) {
      this.recHooks.filter((t3) => t3.status === e2).forEach((e3) => e3.callback(t2));
    }
    cancelRefEvent() {
      this.refEvent && this.channel.off(this.refEvent);
    }
    cancelTimeout() {
      clearTimeout(this.timeoutTimer), this.timeoutTimer = null;
    }
    startTimeout() {
      this.timeoutTimer && this.cancelTimeout(), this.ref = this.channel.socket.makeRef(), this.refEvent = this.channel.replyEventName(this.ref), this.channel.on(this.refEvent, (e2) => {
        this.cancelRefEvent(), this.cancelTimeout(), this.receivedResp = e2, this.matchReceive(e2);
      }), this.timeoutTimer = setTimeout(() => {
        this.trigger(`timeout`, {});
      }, this.timeout);
    }
    hasReceived(e2) {
      return this.receivedResp && this.receivedResp.status === e2;
    }
    trigger(e2, t2) {
      this.channel.trigger(this.refEvent, { status: e2, response: t2 });
    }
  }, Ne = class {
    constructor(e2, t2) {
      this.callback = e2, this.timerCalc = t2, this.timer = void 0, this.tries = 0;
    }
    reset() {
      this.tries = 0, clearTimeout(this.timer);
    }
    scheduleTimeout() {
      clearTimeout(this.timer), this.timer = setTimeout(() => {
        this.tries += 1, this.callback();
      }, this.timerCalc(this.tries + 1));
    }
  }, Pe = class {
    constructor(e2, t2, n2) {
      this.state = C.closed, this.topic = e2, this.params = we(t2 || {}), this.socket = n2, this.bindings = [], this.bindingRef = 0, this.timeout = this.socket.timeout, this.joinedOnce = false, this.joinPush = new Me(this, w.join, this.params, this.timeout), this.pushBuffer = [], this.stateChangeRefs = [], this.rejoinTimer = new Ne(() => {
        this.socket.isConnected() && this.rejoin();
      }, this.socket.rejoinAfterMs), this.stateChangeRefs.push(this.socket.onError(() => this.rejoinTimer.reset())), this.stateChangeRefs.push(this.socket.onOpen(() => {
        this.rejoinTimer.reset(), this.isErrored() && this.rejoin();
      })), this.joinPush.receive(`ok`, () => {
        this.state = C.joined, this.rejoinTimer.reset(), this.pushBuffer.forEach((e3) => e3.send()), this.pushBuffer = [];
      }), this.joinPush.receive(`error`, (e3) => {
        this.state = C.errored, this.socket.hasLogger() && this.socket.log(`channel`, `error ${this.topic}`, e3), this.socket.isConnected() && this.rejoinTimer.scheduleTimeout();
      }), this.onClose(() => {
        this.rejoinTimer.reset(), this.socket.hasLogger() && this.socket.log(`channel`, `close ${this.topic}`), this.state = C.closed, this.socket.remove(this);
      }), this.onError((e3) => {
        this.socket.hasLogger() && this.socket.log(`channel`, `error ${this.topic}`, e3), this.isJoining() && this.joinPush.reset(), this.state = C.errored, this.socket.isConnected() && this.rejoinTimer.scheduleTimeout();
      }), this.joinPush.receive(`timeout`, () => {
        this.socket.hasLogger() && this.socket.log(`channel`, `timeout ${this.topic}`, this.joinPush.timeout), new Me(this, w.leave, we({}), this.timeout).send(), this.state = C.errored, this.joinPush.reset(), this.socket.isConnected() && this.rejoinTimer.scheduleTimeout();
      }), this.on(w.reply, (e3, t3) => {
        this.trigger(this.replyEventName(t3), e3);
      });
    }
    join(e2 = this.timeout) {
      if (this.joinedOnce) throw Error(`tried to join multiple times. 'join' can only be called a single time per channel instance`);
      return this.timeout = e2, this.joinedOnce = true, this.rejoin(), this.joinPush;
    }
    teardown() {
      this.pushBuffer.forEach((e2) => e2.destroy()), this.pushBuffer = [], this.rejoinTimer.reset(), this.joinPush.destroy(), this.state = C.closed, this.bindings = [];
    }
    onClose(e2) {
      this.on(w.close, e2);
    }
    onError(e2) {
      return this.on(w.error, (t2) => e2(t2));
    }
    on(e2, t2) {
      let n2 = this.bindingRef++;
      return this.bindings.push({ event: e2, ref: n2, callback: t2 }), n2;
    }
    off(e2, t2) {
      this.bindings = this.bindings.filter((n2) => !(n2.event === e2 && (t2 === void 0 || t2 === n2.ref)));
    }
    canPush() {
      return this.socket.isConnected() && this.isJoined();
    }
    push(e2, t2, n2 = this.timeout) {
      if (t2 ||= {}, !this.joinedOnce) throw Error(`tried to push '${e2}' to '${this.topic}' before joining. Use channel.join() before pushing events`);
      let r2 = new Me(this, e2, function() {
        return t2;
      }, n2);
      return this.canPush() ? r2.send() : (r2.startTimeout(), this.pushBuffer.push(r2)), r2;
    }
    leave(e2 = this.timeout) {
      this.rejoinTimer.reset(), this.joinPush.cancelTimeout(), this.state = C.leaving;
      let t2 = () => {
        this.socket.hasLogger() && this.socket.log(`channel`, `leave ${this.topic}`), this.trigger(w.close, `leave`);
      }, n2 = new Me(this, w.leave, we({}), e2);
      return n2.receive(`ok`, () => t2()).receive(`timeout`, () => t2()), n2.send(), this.canPush() || n2.trigger(`ok`, {}), n2;
    }
    onMessage(e2, t2, n2) {
      return t2;
    }
    filterBindings(e2, t2, n2) {
      return true;
    }
    isMember(e2, t2, n2, r2) {
      return this.topic === e2 ? r2 && r2 !== this.joinRef() ? (this.socket.hasLogger() && this.socket.log(`channel`, `dropping outdated message`, { topic: e2, event: t2, payload: n2, joinRef: r2 }), false) : true : false;
    }
    joinRef() {
      return this.joinPush.ref;
    }
    rejoin(e2 = this.timeout) {
      this.isLeaving() || (this.socket.leaveOpenTopic(this.topic), this.state = C.joining, this.joinPush.resend(e2));
    }
    trigger(e2, t2, n2, r2) {
      let i2 = this.onMessage(e2, t2, n2, r2);
      if (t2 && !i2) throw Error(`channel onMessage callbacks must return the payload, modified or unmodified`);
      let a2 = this.bindings.filter((r3) => r3.event === e2 && this.filterBindings(r3, t2, n2));
      for (let e3 = 0; e3 < a2.length; e3++) a2[e3].callback(i2, n2, r2 || this.joinRef());
    }
    replyEventName(e2) {
      return `chan_reply_${e2}`;
    }
    isClosed() {
      return this.state === C.closed;
    }
    isErrored() {
      return this.state === C.errored;
    }
    isJoined() {
      return this.state === C.joined;
    }
    isJoining() {
      return this.state === C.joining;
    }
    isLeaving() {
      return this.state === C.leaving;
    }
  }, Fe = class {
    static request(e2, t2, n2, r2, i2, a2, o2) {
      if (x.XDomainRequest) {
        let n3 = new x.XDomainRequest();
        return this.xdomainRequest(n3, e2, t2, r2, i2, a2, o2);
      } else if (x.XMLHttpRequest) {
        let s2 = new x.XMLHttpRequest();
        return this.xhrRequest(s2, e2, t2, n2, r2, i2, a2, o2);
      } else if (x.fetch && x.AbortController) return this.fetchRequest(e2, t2, n2, r2, i2, a2, o2);
      else throw Error(`No suitable XMLHttpRequest implementation found`);
    }
    static fetchRequest(e2, t2, n2, r2, i2, a2, o2) {
      let s2 = { method: e2, headers: n2, body: r2 }, c2 = null;
      return i2 && (c2 = new AbortController(), setTimeout(() => c2.abort(), i2), s2.signal = c2.signal), x.fetch(t2, s2).then((e3) => e3.text()).then((e3) => this.parseJSON(e3)).then((e3) => o2 && o2(e3)).catch((e3) => {
        e3.name === `AbortError` && a2 ? a2() : o2 && o2(null);
      }), c2;
    }
    static xdomainRequest(e2, t2, n2, r2, i2, a2, o2) {
      return e2.timeout = i2, e2.open(t2, n2), e2.onload = () => {
        let t3 = this.parseJSON(e2.responseText);
        o2 && o2(t3);
      }, a2 && (e2.ontimeout = a2), e2.onprogress = () => {
      }, e2.send(r2), e2;
    }
    static xhrRequest(e2, t2, n2, r2, i2, a2, o2, s2) {
      e2.open(t2, n2, true), e2.timeout = a2;
      for (let [t3, n3] of Object.entries(r2)) e2.setRequestHeader(t3, n3);
      return e2.onerror = () => s2 && s2(null), e2.onreadystatechange = () => {
        e2.readyState === Ae.complete && s2 && s2(this.parseJSON(e2.responseText));
      }, o2 && (e2.ontimeout = o2), e2.send(i2), e2;
    }
    static parseJSON(e2) {
      if (!e2 || e2 === ``) return null;
      try {
        return JSON.parse(e2);
      } catch {
        return console && console.log(`failed to parse JSON response`, e2), null;
      }
    }
    static serialize(e2, t2) {
      let n2 = [];
      for (var r2 in e2) {
        if (!Object.prototype.hasOwnProperty.call(e2, r2)) continue;
        let i2 = t2 ? `${t2}[${r2}]` : r2, a2 = e2[r2];
        typeof a2 == `object` ? n2.push(this.serialize(a2, i2)) : n2.push(encodeURIComponent(i2) + `=` + encodeURIComponent(a2));
      }
      return n2.join(`&`);
    }
    static appendParams(e2, t2) {
      return Object.keys(t2).length === 0 ? e2 : `${e2}${e2.match(/\?/) ? `&` : `?`}${this.serialize(t2)}`;
    }
  }, Ie = (e2) => {
    let t2 = ``, n2 = new Uint8Array(e2), r2 = n2.byteLength;
    for (let e3 = 0; e3 < r2; e3++) t2 += String.fromCharCode(n2[e3]);
    return btoa(t2);
  }, T = class {
    constructor(e2, t2) {
      t2 && t2.length === 2 && t2[1].startsWith(je) && (this.authToken = atob(t2[1].slice(je.length))), this.endPoint = null, this.token = null, this.skipHeartbeat = true, this.reqs = /* @__PURE__ */ new Set(), this.awaitingBatchAck = false, this.currentBatch = null, this.currentBatchTimer = null, this.batchBuffer = [], this.onopen = function() {
      }, this.onerror = function() {
      }, this.onmessage = function() {
      }, this.onclose = function() {
      }, this.pollEndpoint = this.normalizeEndpoint(e2), this.readyState = S.connecting, setTimeout(() => this.poll(), 0);
    }
    normalizeEndpoint(e2) {
      return e2.replace(`ws://`, `http://`).replace(`wss://`, `https://`).replace(RegExp(`(.*)/` + ke.websocket), `$1/` + ke.longpoll);
    }
    endpointURL() {
      return Fe.appendParams(this.pollEndpoint, { token: this.token });
    }
    closeAndRetry(e2, t2, n2) {
      this.close(e2, t2, n2), this.readyState = S.connecting;
    }
    ontimeout() {
      this.onerror(`timeout`), this.closeAndRetry(1005, `timeout`, false);
    }
    isActive() {
      return this.readyState === S.open || this.readyState === S.connecting;
    }
    poll() {
      let e2 = { Accept: `application/json` };
      this.authToken && (e2[`X-Phoenix-AuthToken`] = this.authToken), this.ajax(`GET`, e2, null, () => this.ontimeout(), (e3) => {
        if (e3) {
          var { status: t2, token: n2, messages: r2 } = e3;
          if (t2 === 410 && this.token !== null) {
            this.onerror(410), this.closeAndRetry(3410, `session_gone`, false);
            return;
          }
          this.token = n2;
        } else t2 = 0;
        switch (t2) {
          case 200:
            r2.forEach((e4) => {
              setTimeout(() => this.onmessage({ data: e4 }), 0);
            }), this.poll();
            break;
          case 204:
            this.poll();
            break;
          case 410:
            this.readyState = S.open, this.onopen({}), this.poll();
            break;
          case 403:
            this.onerror(403), this.close(1008, `forbidden`, false);
            break;
          case 0:
          case 500:
            this.onerror(500), this.closeAndRetry(1011, `internal server error`, 500);
            break;
          default:
            throw Error(`unhandled poll status ${t2}`);
        }
      });
    }
    send(e2) {
      typeof e2 != `string` && (e2 = Ie(e2)), this.currentBatch ? this.currentBatch.push(e2) : this.awaitingBatchAck ? this.batchBuffer.push(e2) : (this.currentBatch = [e2], this.currentBatchTimer = setTimeout(() => {
        this.batchSend(this.currentBatch), this.currentBatch = null;
      }, 0));
    }
    batchSend(e2) {
      this.awaitingBatchAck = true, this.ajax(`POST`, { "Content-Type": `application/x-ndjson` }, e2.join(`
`), () => this.onerror(`timeout`), (e3) => {
        this.awaitingBatchAck = false, !e3 || e3.status !== 200 ? (this.onerror(e3 && e3.status), this.closeAndRetry(1011, `internal server error`, false)) : this.batchBuffer.length > 0 && (this.batchSend(this.batchBuffer), this.batchBuffer = []);
      });
    }
    close(e2, t2, n2) {
      for (let e3 of this.reqs) e3.abort();
      this.readyState = S.closed;
      let r2 = Object.assign({ code: 1e3, reason: void 0, wasClean: true }, { code: e2, reason: t2, wasClean: n2 });
      this.batchBuffer = [], clearTimeout(this.currentBatchTimer), this.currentBatchTimer = null, typeof CloseEvent < `u` ? this.onclose(new CloseEvent(`close`, r2)) : this.onclose(r2);
    }
    ajax(e2, t2, n2, r2, i2) {
      let a2;
      a2 = Fe.request(e2, this.endpointURL(), t2, n2, this.timeout, () => {
        this.reqs.delete(a2), r2();
      }, (e3) => {
        this.reqs.delete(a2), this.isActive() && i2(e3);
      }), this.reqs.add(a2);
    }
  }, Le = class e2 {
    constructor(t2, n2 = {}) {
      let r2 = n2.events || { state: `presence_state`, diff: `presence_diff` };
      this.state = {}, this.pendingDiffs = [], this.channel = t2, this.joinRef = null, this.caller = { onJoin: function() {
      }, onLeave: function() {
      }, onSync: function() {
      } }, this.channel.on(r2.state, (t3) => {
        let { onJoin: n3, onLeave: r3, onSync: i2 } = this.caller;
        this.joinRef = this.channel.joinRef(), this.state = e2.syncState(this.state, t3, n3, r3), this.pendingDiffs.forEach((t4) => {
          this.state = e2.syncDiff(this.state, t4, n3, r3);
        }), this.pendingDiffs = [], i2();
      }), this.channel.on(r2.diff, (t3) => {
        let { onJoin: n3, onLeave: r3, onSync: i2 } = this.caller;
        this.inPendingSyncState() ? this.pendingDiffs.push(t3) : (this.state = e2.syncDiff(this.state, t3, n3, r3), i2());
      });
    }
    onJoin(e3) {
      this.caller.onJoin = e3;
    }
    onLeave(e3) {
      this.caller.onLeave = e3;
    }
    onSync(e3) {
      this.caller.onSync = e3;
    }
    list(t2) {
      return e2.list(this.state, t2);
    }
    inPendingSyncState() {
      return !this.joinRef || this.joinRef !== this.channel.joinRef();
    }
    static syncState(e3, t2, n2, r2) {
      let i2 = this.clone(e3), a2 = {}, o2 = {};
      return this.map(i2, (e4, n3) => {
        t2[e4] || (o2[e4] = n3);
      }), this.map(t2, (e4, t3) => {
        let n3 = i2[e4];
        if (n3) {
          let r3 = t3.metas.map((e5) => e5.phx_ref), i3 = n3.metas.map((e5) => e5.phx_ref), s2 = t3.metas.filter((e5) => i3.indexOf(e5.phx_ref) < 0), c2 = n3.metas.filter((e5) => r3.indexOf(e5.phx_ref) < 0);
          s2.length > 0 && (a2[e4] = t3, a2[e4].metas = s2), c2.length > 0 && (o2[e4] = this.clone(n3), o2[e4].metas = c2);
        } else a2[e4] = t3;
      }), this.syncDiff(i2, { joins: a2, leaves: o2 }, n2, r2);
    }
    static syncDiff(e3, t2, n2, r2) {
      let { joins: i2, leaves: a2 } = this.clone(t2);
      return n2 ||= function() {
      }, r2 ||= function() {
      }, this.map(i2, (t3, r3) => {
        let i3 = e3[t3];
        if (e3[t3] = this.clone(r3), i3) {
          let n3 = e3[t3].metas.map((e4) => e4.phx_ref), r4 = i3.metas.filter((e4) => n3.indexOf(e4.phx_ref) < 0);
          e3[t3].metas.unshift(...r4);
        }
        n2(t3, i3, r3);
      }), this.map(a2, (t3, n3) => {
        let i3 = e3[t3];
        if (!i3) return;
        let a3 = n3.metas.map((e4) => e4.phx_ref);
        i3.metas = i3.metas.filter((e4) => a3.indexOf(e4.phx_ref) < 0), r2(t3, i3, n3), i3.metas.length === 0 && delete e3[t3];
      }), e3;
    }
    static list(e3, t2) {
      return t2 ||= function(e4, t3) {
        return t3;
      }, this.map(e3, (e4, n2) => t2(e4, n2));
    }
    static map(e3, t2) {
      return Object.getOwnPropertyNames(e3).map((n2) => t2(n2, e3[n2]));
    }
    static clone(e3) {
      return JSON.parse(JSON.stringify(e3));
    }
  }, Re = { HEADER_LENGTH: 1, META_LENGTH: 4, KINDS: { push: 0, reply: 1, broadcast: 2 }, encode(e2, t2) {
    if (e2.payload.constructor === ArrayBuffer) return t2(this.binaryEncode(e2));
    {
      let n2 = [e2.join_ref, e2.ref, e2.topic, e2.event, e2.payload];
      return t2(JSON.stringify(n2));
    }
  }, decode(e2, t2) {
    if (e2.constructor === ArrayBuffer) return t2(this.binaryDecode(e2));
    {
      let [n2, r2, i2, a2, o2] = JSON.parse(e2);
      return t2({ join_ref: n2, ref: r2, topic: i2, event: a2, payload: o2 });
    }
  }, binaryEncode(e2) {
    let { join_ref: t2, ref: n2, event: r2, topic: i2, payload: a2 } = e2, o2 = this.META_LENGTH + t2.length + n2.length + i2.length + r2.length, s2 = new ArrayBuffer(this.HEADER_LENGTH + o2), c2 = new DataView(s2), l2 = 0;
    c2.setUint8(l2++, this.KINDS.push), c2.setUint8(l2++, t2.length), c2.setUint8(l2++, n2.length), c2.setUint8(l2++, i2.length), c2.setUint8(l2++, r2.length), Array.from(t2, (e3) => c2.setUint8(l2++, e3.charCodeAt(0))), Array.from(n2, (e3) => c2.setUint8(l2++, e3.charCodeAt(0))), Array.from(i2, (e3) => c2.setUint8(l2++, e3.charCodeAt(0))), Array.from(r2, (e3) => c2.setUint8(l2++, e3.charCodeAt(0)));
    var u2 = new Uint8Array(s2.byteLength + a2.byteLength);
    return u2.set(new Uint8Array(s2), 0), u2.set(new Uint8Array(a2), s2.byteLength), u2.buffer;
  }, binaryDecode(e2) {
    let t2 = new DataView(e2), n2 = t2.getUint8(0), r2 = new TextDecoder();
    switch (n2) {
      case this.KINDS.push:
        return this.decodePush(e2, t2, r2);
      case this.KINDS.reply:
        return this.decodeReply(e2, t2, r2);
      case this.KINDS.broadcast:
        return this.decodeBroadcast(e2, t2, r2);
    }
  }, decodePush(e2, t2, n2) {
    let r2 = t2.getUint8(1), i2 = t2.getUint8(2), a2 = t2.getUint8(3), o2 = this.HEADER_LENGTH + this.META_LENGTH - 1, s2 = n2.decode(e2.slice(o2, o2 + r2));
    o2 += r2;
    let c2 = n2.decode(e2.slice(o2, o2 + i2));
    o2 += i2;
    let l2 = n2.decode(e2.slice(o2, o2 + a2));
    return o2 += a2, { join_ref: s2, ref: null, topic: c2, event: l2, payload: e2.slice(o2, e2.byteLength) };
  }, decodeReply(e2, t2, n2) {
    let r2 = t2.getUint8(1), i2 = t2.getUint8(2), a2 = t2.getUint8(3), o2 = t2.getUint8(4), s2 = this.HEADER_LENGTH + this.META_LENGTH, c2 = n2.decode(e2.slice(s2, s2 + r2));
    s2 += r2;
    let l2 = n2.decode(e2.slice(s2, s2 + i2));
    s2 += i2;
    let u2 = n2.decode(e2.slice(s2, s2 + a2));
    s2 += a2;
    let d2 = n2.decode(e2.slice(s2, s2 + o2));
    s2 += o2;
    let f2 = { status: d2, response: e2.slice(s2, e2.byteLength) };
    return { join_ref: c2, ref: l2, topic: u2, event: w.reply, payload: f2 };
  }, decodeBroadcast(e2, t2, n2) {
    let r2 = t2.getUint8(1), i2 = t2.getUint8(2), a2 = this.HEADER_LENGTH + 2, o2 = n2.decode(e2.slice(a2, a2 + r2));
    a2 += r2;
    let s2 = n2.decode(e2.slice(a2, a2 + i2));
    return a2 += i2, { join_ref: null, ref: null, topic: o2, event: s2, payload: e2.slice(a2, e2.byteLength) };
  } }, ze = class {
    constructor(e2, t2 = {}) {
      this.stateChangeCallbacks = { open: [], close: [], error: [], message: [] }, this.channels = [], this.sendBuffer = [], this.ref = 0, this.fallbackRef = null, this.timeout = t2.timeout || De, this.transport = t2.transport || x.WebSocket || T, this.conn = void 0, this.primaryPassedHealthCheck = false, this.longPollFallbackMs = t2.longPollFallbackMs, this.fallbackTimer = null;
      let n2 = null;
      try {
        n2 = x && x.sessionStorage;
      } catch {
      }
      this.sessionStore = t2.sessionStorage || n2, this.establishedConnections = 0, this.defaultEncoder = Re.encode.bind(Re), this.defaultDecoder = Re.decode.bind(Re), this.closeWasClean = true, this.disconnecting = false, this.binaryType = t2.binaryType || `arraybuffer`, this.connectClock = 1, this.pageHidden = false, this.encode = void 0, this.decode = void 0, this.transport === T ? (this.encode = this.defaultEncoder, this.decode = this.defaultDecoder) : (this.encode = t2.encode || this.defaultEncoder, this.decode = t2.decode || this.defaultDecoder);
      let r2 = null;
      b && b.addEventListener && (b.addEventListener(`pagehide`, (e3) => {
        this.conn && (this.disconnect(), r2 = this.connectClock);
      }), b.addEventListener(`pageshow`, (e3) => {
        r2 === this.connectClock && (r2 = null, this.connect());
      }), b.addEventListener(`visibilitychange`, () => {
        document.visibilityState === `hidden` ? this.pageHidden = true : (this.pageHidden = false, !this.isConnected() && !this.closeWasClean && this.teardown(() => this.connect()));
      })), this.heartbeatIntervalMs = t2.heartbeatIntervalMs || 3e4, this.autoSendHeartbeat = t2.autoSendHeartbeat ?? true, this.heartbeatCallback = t2.heartbeatCallback ?? (() => {
      }), this.rejoinAfterMs = (e3) => t2.rejoinAfterMs ? t2.rejoinAfterMs(e3) : [1e3, 2e3, 5e3][e3 - 1] || 1e4, this.reconnectAfterMs = (e3) => t2.reconnectAfterMs ? t2.reconnectAfterMs(e3) : [10, 50, 100, 150, 200, 250, 500, 1e3, 2e3][e3 - 1] || 5e3, this.logger = t2.logger || null, !this.logger && t2.debug && (this.logger = (e3, t3, n3) => {
        console.log(`${e3}: ${t3}`, n3);
      }), this.longpollerTimeout = t2.longpollerTimeout || 2e4, this.params = we(t2.params || {}), this.endPoint = `${e2}/${ke.websocket}`, this.vsn = t2.vsn || Ee, this.heartbeatTimeoutTimer = null, this.heartbeatTimer = null, this.heartbeatSentAt = null, this.pendingHeartbeatRef = null, this.reconnectTimer = new Ne(() => {
        if (this.pageHidden) {
          this.log(`Not reconnecting as page is hidden!`), this.teardown();
          return;
        }
        this.teardown(async () => {
          t2.beforeReconnect && await t2.beforeReconnect(), this.connect();
        });
      }, this.reconnectAfterMs), this.authToken = t2.authToken;
    }
    getLongPollTransport() {
      return T;
    }
    replaceTransport(e2) {
      this.connectClock++, this.closeWasClean = true, clearTimeout(this.fallbackTimer), this.reconnectTimer.reset(), this.conn &&= (this.conn.close(), null), this.transport = e2;
    }
    protocol() {
      return location.protocol.match(/^https/) ? `wss` : `ws`;
    }
    endPointURL() {
      let e2 = Fe.appendParams(Fe.appendParams(this.endPoint, this.params()), { vsn: this.vsn });
      return e2.charAt(0) === `/` ? e2.charAt(1) === `/` ? `${this.protocol()}:${e2}` : `${this.protocol()}://${location.host}${e2}` : e2;
    }
    disconnect(e2, t2, n2) {
      this.connectClock++, this.disconnecting = true, this.closeWasClean = true, clearTimeout(this.fallbackTimer), this.reconnectTimer.reset(), this.teardown(() => {
        this.disconnecting = false, e2 && e2();
      }, t2, n2);
    }
    connect(e2) {
      e2 && (console && console.log(`passing params to connect is deprecated. Instead pass :params to the Socket constructor`), this.params = we(e2)), !(this.conn && !this.disconnecting) && (this.longPollFallbackMs && this.transport !== T ? this.connectWithFallback(T, this.longPollFallbackMs) : this.transportConnect());
    }
    log(e2, t2, n2) {
      this.logger && this.logger(e2, t2, n2);
    }
    hasLogger() {
      return this.logger !== null;
    }
    onOpen(e2) {
      let t2 = this.makeRef();
      return this.stateChangeCallbacks.open.push([t2, e2]), t2;
    }
    onClose(e2) {
      let t2 = this.makeRef();
      return this.stateChangeCallbacks.close.push([t2, e2]), t2;
    }
    onError(e2) {
      let t2 = this.makeRef();
      return this.stateChangeCallbacks.error.push([t2, e2]), t2;
    }
    onMessage(e2) {
      let t2 = this.makeRef();
      return this.stateChangeCallbacks.message.push([t2, e2]), t2;
    }
    onHeartbeat(e2) {
      this.heartbeatCallback = e2;
    }
    ping(e2) {
      if (!this.isConnected()) return false;
      let t2 = this.makeRef(), n2 = Date.now();
      this.push({ topic: `phoenix`, event: `heartbeat`, payload: {}, ref: t2 });
      let r2 = this.onMessage((i2) => {
        i2.ref === t2 && (this.off([r2]), e2(Date.now() - n2));
      });
      return true;
    }
    transportName(e2) {
      switch (e2) {
        case T:
          return `LongPoll`;
        default:
          return e2.name;
      }
    }
    transportConnect() {
      this.connectClock++, this.closeWasClean = false;
      let e2;
      this.authToken && (e2 = [`phoenix`, `${je}${btoa(this.authToken).replace(/=/g, ``)}`]), this.conn = new this.transport(this.endPointURL(), e2), this.conn.binaryType = this.binaryType, this.conn.timeout = this.longpollerTimeout, this.conn.onopen = () => this.onConnOpen(), this.conn.onerror = (e3) => this.onConnError(e3), this.conn.onmessage = (e3) => this.onConnMessage(e3), this.conn.onclose = (e3) => this.onConnClose(e3);
    }
    getSession(e2) {
      return this.sessionStore && this.sessionStore.getItem(e2);
    }
    storeSession(e2, t2) {
      this.sessionStore && this.sessionStore.setItem(e2, t2);
    }
    connectWithFallback(e2, t2 = 2500) {
      clearTimeout(this.fallbackTimer);
      let n2 = false, r2 = true, i2, a2 = this.transportName(e2), o2 = (t3) => {
        this.log(`transport`, `falling back to ${a2}...`, t3), this.off([void 0, i2]), r2 = false, this.replaceTransport(e2), this.transportConnect();
      };
      if (this.getSession(`phx:fallback:${a2}`)) return o2(`memorized`);
      this.fallbackTimer = setTimeout(o2, t2), i2 = this.onError((e3) => {
        this.log(`transport`, `error`, e3), r2 && !n2 && (clearTimeout(this.fallbackTimer), o2(e3));
      }), this.fallbackRef && this.off([this.fallbackRef]), this.fallbackRef = this.onOpen(() => {
        if (n2 = true, !r2) {
          let t3 = this.transportName(e2);
          return this.primaryPassedHealthCheck || this.storeSession(`phx:fallback:${t3}`, `true`), this.log(`transport`, `established ${t3} fallback`);
        }
        clearTimeout(this.fallbackTimer), this.fallbackTimer = setTimeout(o2, t2), this.ping((e3) => {
          this.log(`transport`, `connected to primary after`, e3), this.primaryPassedHealthCheck = true, clearTimeout(this.fallbackTimer);
        });
      }), this.transportConnect();
    }
    clearHeartbeats() {
      clearTimeout(this.heartbeatTimer), clearTimeout(this.heartbeatTimeoutTimer);
    }
    onConnOpen() {
      this.hasLogger() && this.log(`transport`, `connected to ${this.endPointURL()}`), this.closeWasClean = false, this.disconnecting = false, this.establishedConnections++, this.flushSendBuffer(), this.reconnectTimer.reset(), this.autoSendHeartbeat && this.resetHeartbeat(), this.triggerStateCallbacks(`open`);
    }
    heartbeatTimeout() {
      if (this.pendingHeartbeatRef) {
        this.pendingHeartbeatRef = null, this.heartbeatSentAt = null, this.hasLogger() && this.log(`transport`, `heartbeat timeout. Attempting to re-establish connection`);
        try {
          this.heartbeatCallback(`timeout`);
        } catch (e2) {
          this.log(`error`, `error in heartbeat callback`, e2);
        }
        this.triggerChanError(Error(`heartbeat timeout`)), this.closeWasClean = false, this.teardown(() => this.reconnectTimer.scheduleTimeout(), Oe, `heartbeat timeout`);
      }
    }
    resetHeartbeat() {
      this.conn && this.conn.skipHeartbeat || (this.pendingHeartbeatRef = null, this.clearHeartbeats(), this.heartbeatTimer = setTimeout(() => this.sendHeartbeat(), this.heartbeatIntervalMs));
    }
    teardown(e2, t2, n2) {
      if (!this.conn) return e2 && e2();
      let r2 = this.conn;
      this.waitForBufferDone(r2, () => {
        t2 ? r2.close(t2, n2 || ``) : r2.close(), this.waitForSocketClosed(r2, () => {
          this.conn === r2 && (this.conn.onopen = function() {
          }, this.conn.onerror = function() {
          }, this.conn.onmessage = function() {
          }, this.conn.onclose = function() {
          }, this.conn = null), e2 && e2();
        });
      });
    }
    waitForBufferDone(e2, t2, n2 = 1) {
      if (n2 === 5 || !e2.bufferedAmount) {
        t2();
        return;
      }
      setTimeout(() => {
        this.waitForBufferDone(e2, t2, n2 + 1);
      }, 150 * n2);
    }
    waitForSocketClosed(e2, t2, n2 = 1) {
      if (n2 === 5 || e2.readyState === S.closed) {
        t2();
        return;
      }
      setTimeout(() => {
        this.waitForSocketClosed(e2, t2, n2 + 1);
      }, 150 * n2);
    }
    onConnClose(e2) {
      this.conn && (this.conn.onclose = () => {
      }), this.hasLogger() && this.log(`transport`, `close`, e2), this.triggerChanError(e2), this.clearHeartbeats(), this.closeWasClean || this.reconnectTimer.scheduleTimeout(), this.triggerStateCallbacks(`close`, e2);
    }
    onConnError(e2) {
      this.hasLogger() && this.log(`transport`, `error`, e2);
      let t2 = this.transport, n2 = this.establishedConnections;
      this.triggerStateCallbacks(`error`, e2, t2, n2), (t2 === this.transport || n2 > 0) && this.triggerChanError(e2);
    }
    triggerChanError(e2) {
      this.channels.forEach((t2) => {
        t2.isErrored() || t2.isLeaving() || t2.isClosed() || t2.trigger(w.error, e2);
      });
    }
    connectionState() {
      switch (this.conn && this.conn.readyState) {
        case S.connecting:
          return `connecting`;
        case S.open:
          return `open`;
        case S.closing:
          return `closing`;
        default:
          return `closed`;
      }
    }
    isConnected() {
      return this.connectionState() === `open`;
    }
    remove(e2) {
      this.off(e2.stateChangeRefs), this.channels = this.channels.filter((t2) => t2 !== e2);
    }
    off(e2) {
      for (let t2 in this.stateChangeCallbacks) this.stateChangeCallbacks[t2] = this.stateChangeCallbacks[t2].filter(([t3]) => e2.indexOf(t3) === -1);
    }
    channel(e2, t2 = {}) {
      let n2 = new Pe(e2, t2, this);
      return this.channels.push(n2), n2;
    }
    push(e2) {
      if (this.hasLogger()) {
        let { topic: t2, event: n2, payload: r2, ref: i2, join_ref: a2 } = e2;
        this.log(`push`, `${t2} ${n2} (${a2}, ${i2})`, r2);
      }
      this.isConnected() ? this.encode(e2, (e3) => this.conn.send(e3)) : this.sendBuffer.push(() => this.encode(e2, (e3) => this.conn.send(e3)));
    }
    makeRef() {
      let e2 = this.ref + 1;
      return e2 === this.ref ? this.ref = 0 : this.ref = e2, this.ref.toString();
    }
    sendHeartbeat() {
      if (!this.isConnected()) {
        try {
          this.heartbeatCallback(`disconnected`);
        } catch (e2) {
          this.log(`error`, `error in heartbeat callback`, e2);
        }
        return;
      }
      if (this.pendingHeartbeatRef) {
        this.heartbeatTimeout();
        return;
      }
      this.pendingHeartbeatRef = this.makeRef(), this.heartbeatSentAt = Date.now(), this.push({ topic: `phoenix`, event: `heartbeat`, payload: {}, ref: this.pendingHeartbeatRef });
      try {
        this.heartbeatCallback(`sent`);
      } catch (e2) {
        this.log(`error`, `error in heartbeat callback`, e2);
      }
      this.heartbeatTimeoutTimer = setTimeout(() => this.heartbeatTimeout(), this.heartbeatIntervalMs);
    }
    flushSendBuffer() {
      this.isConnected() && this.sendBuffer.length > 0 && (this.sendBuffer.forEach((e2) => e2()), this.sendBuffer = []);
    }
    onConnMessage(e2) {
      this.decode(e2.data, (e3) => {
        let { topic: t2, event: n2, payload: r2, ref: i2, join_ref: a2 } = e3;
        if (i2 && i2 === this.pendingHeartbeatRef) {
          let e4 = this.heartbeatSentAt ? Date.now() - this.heartbeatSentAt : void 0;
          this.clearHeartbeats();
          try {
            this.heartbeatCallback(r2.status === `ok` ? `ok` : `error`, e4);
          } catch (e5) {
            this.log(`error`, `error in heartbeat callback`, e5);
          }
          this.pendingHeartbeatRef = null, this.heartbeatSentAt = null, this.autoSendHeartbeat && (this.heartbeatTimer = setTimeout(() => this.sendHeartbeat(), this.heartbeatIntervalMs));
        }
        this.hasLogger() && this.log(`receive`, `${r2.status || ``} ${t2} ${n2} ${i2 && `(` + i2 + `)` || ``}`.trim(), r2);
        for (let e4 = 0; e4 < this.channels.length; e4++) {
          let o2 = this.channels[e4];
          o2.isMember(t2, n2, r2, a2) && o2.trigger(n2, r2, i2, a2);
        }
        this.triggerStateCallbacks(`message`, e3);
      });
    }
    triggerStateCallbacks(e2, ...t2) {
      try {
        this.stateChangeCallbacks[e2].forEach(([n2, r2]) => {
          try {
            r2(...t2);
          } catch (t3) {
            this.log(`error`, `error in ${e2} callback`, t3);
          }
        });
      } catch (t3) {
        this.log(`error`, `error triggering ${e2} callbacks`, t3);
      }
    }
    leaveOpenTopic(e2) {
      let t2 = this.channels.find((t3) => t3.topic === e2 && (t3.isJoined() || t3.isJoining()));
      t2 && (this.hasLogger() && this.log(`transport`, `leaving duplicate topic "${e2}"`), t2.leave());
    }
  }, Be = class e2 {
    constructor(t2, n2) {
      let r2 = Ue(n2);
      this.presence = new Le(t2.getChannel(), r2), this.presence.onJoin((n3, r3, i2) => {
        let a2 = e2.onJoinPayload(n3, r3, i2);
        t2.getChannel().trigger(`presence`, a2);
      }), this.presence.onLeave((n3, r3, i2) => {
        let a2 = e2.onLeavePayload(n3, r3, i2);
        t2.getChannel().trigger(`presence`, a2);
      }), this.presence.onSync(() => {
        t2.getChannel().trigger(`presence`, { event: `sync` });
      });
    }
    get state() {
      return e2.transformState(this.presence.state);
    }
    static transformState(e3) {
      return e3 = He(e3), Object.getOwnPropertyNames(e3).reduce((t2, n2) => {
        let r2 = e3[n2];
        return t2[n2] = Ve(r2), t2;
      }, {});
    }
    static onJoinPayload(e3, t2, n2) {
      return { event: `join`, key: e3, currentPresences: We(t2), newPresences: Ve(n2) };
    }
    static onLeavePayload(e3, t2, n2) {
      return { event: `leave`, key: e3, currentPresences: We(t2), leftPresences: Ve(n2) };
    }
  };
  function Ve(e2) {
    return e2.metas.map((e3) => (e3.presence_ref = e3.phx_ref, delete e3.phx_ref, delete e3.phx_ref_prev, e3));
  }
  function He(e2) {
    return JSON.parse(JSON.stringify(e2));
  }
  function Ue(e2) {
    return e2?.events && { events: e2.events };
  }
  function We(e2) {
    return e2?.metas ? Ve(e2) : [];
  }
  var Ge;
  (function(e2) {
    e2.SYNC = `sync`, e2.JOIN = `join`, e2.LEAVE = `leave`;
  })(Ge ||= {});
  var Ke = class {
    get state() {
      return this.presenceAdapter.state;
    }
    constructor(e2, t2) {
      this.channel = e2, this.presenceAdapter = new Be(this.channel.channelAdapter, t2);
    }
  };
  function qe(e2) {
    if (e2 instanceof Error) return e2;
    if (typeof e2 == `string`) return Error(e2);
    if (e2 && typeof e2 == `object`) {
      let t2 = e2;
      if (typeof t2.code == `number`) {
        let n2 = typeof t2.reason == `string` && t2.reason ? ` (${t2.reason})` : ``;
        return Error(`socket closed: ${t2.code}${n2}`, { cause: e2 });
      }
      return Error(`channel error: transport failure`, { cause: e2 });
    }
    return Error(`channel error: connection lost`);
  }
  var Je = class {
    constructor(e2, t2, n2) {
      let r2 = Ye(n2);
      this.channel = e2.getSocket().channel(t2, r2), this.socket = e2;
    }
    get state() {
      return this.channel.state;
    }
    set state(e2) {
      this.channel.state = e2;
    }
    get joinedOnce() {
      return this.channel.joinedOnce;
    }
    get joinPush() {
      return this.channel.joinPush;
    }
    get rejoinTimer() {
      return this.channel.rejoinTimer;
    }
    on(e2, t2) {
      return this.channel.on(e2, t2);
    }
    off(e2, t2) {
      this.channel.off(e2, t2);
    }
    subscribe(e2) {
      return this.channel.join(e2);
    }
    unsubscribe(e2) {
      return this.channel.leave(e2);
    }
    teardown() {
      this.channel.teardown();
    }
    onClose(e2) {
      this.channel.onClose(e2);
    }
    onError(e2) {
      return this.channel.onError(e2);
    }
    push(e2, t2, n2) {
      let r2;
      try {
        r2 = this.channel.push(e2, t2, n2);
      } catch {
        throw Error(`tried to push '${e2}' to '${this.channel.topic}' before joining. Use channel.subscribe() before pushing events`);
      }
      if (this.channel.pushBuffer.length > 100) {
        let e3 = this.channel.pushBuffer.shift();
        e3.cancelTimeout(), this.socket.log(`channel`, `discarded push due to buffer overflow: ${e3.event}`, e3.payload());
      }
      return r2;
    }
    updateJoinPayload(e2) {
      let t2 = this.channel.joinPush.payload();
      this.channel.joinPush.payload = () => Object.assign(Object.assign({}, t2), e2);
    }
    canPush() {
      return this.socket.isConnected() && this.state === v.joined;
    }
    isJoined() {
      return this.state === v.joined;
    }
    isJoining() {
      return this.state === v.joining;
    }
    isClosed() {
      return this.state === v.closed;
    }
    isLeaving() {
      return this.state === v.leaving;
    }
    updateFilterBindings(e2) {
      this.channel.filterBindings = e2;
    }
    updatePayloadTransform(e2) {
      this.channel.onMessage = e2;
    }
    getChannel() {
      return this.channel;
    }
  };
  function Ye(e2) {
    return { config: Object.assign({ broadcast: { ack: false, self: false }, presence: { key: ``, enabled: false }, private: false }, e2.config) };
  }
  var Xe;
  (function(e2) {
    e2.ALL = `*`, e2.INSERT = `INSERT`, e2.UPDATE = `UPDATE`, e2.DELETE = `DELETE`;
  })(Xe ||= {});
  var E;
  (function(e2) {
    e2.BROADCAST = `broadcast`, e2.PRESENCE = `presence`, e2.POSTGRES_CHANGES = `postgres_changes`, e2.SYSTEM = `system`;
  })(E ||= {});
  var D;
  (function(e2) {
    e2.SUBSCRIBED = `SUBSCRIBED`, e2.TIMED_OUT = `TIMED_OUT`, e2.CLOSED = `CLOSED`, e2.CHANNEL_ERROR = `CHANNEL_ERROR`;
  })(D ||= {});
  let Ze = v;
  var Qe = class e2 {
    get state() {
      return this.channelAdapter.state;
    }
    set state(e3) {
      this.channelAdapter.state = e3;
    }
    get joinedOnce() {
      return this.channelAdapter.joinedOnce;
    }
    get timeout() {
      return this.socket.timeout;
    }
    get joinPush() {
      return this.channelAdapter.joinPush;
    }
    get rejoinTimer() {
      return this.channelAdapter.rejoinTimer;
    }
    constructor(e3, t2 = { config: {} }, n2) {
      if (this.topic = e3, this.params = t2, this.socket = n2, this.bindings = {}, this.subTopic = e3.replace(/^realtime:/i, ``), this.params.config = Object.assign({ broadcast: { ack: false, self: false }, presence: { key: ``, enabled: false }, private: false }, t2.config), this.channelAdapter = new Je(this.socket.socketAdapter, e3, this.params), this.presence = new Ke(this), this._onClose(() => {
        this.socket._remove(this);
      }), this._updateFilterTransform(), this.broadcastEndpointURL = Ce(this.socket.socketAdapter.endPointURL()), this.private = this.params.config.private || false, !this.private && this.params.config?.broadcast?.replay) throw Error(`tried to use replay on public channel '${this.topic}'. It must be a private channel.`);
    }
    subscribe(e3, t2 = this.timeout) {
      if (this.socket.isConnected() || this.socket.connect(), this.channelAdapter.isClosed()) {
        let { config: { broadcast: n2, presence: r2, private: i2 } } = this.params, a2 = this.bindings.postgres_changes?.map((e4) => e4.filter) ?? [], o2 = !!this.bindings[E.PRESENCE] && this.bindings[E.PRESENCE].length > 0 || this.params.config.presence?.enabled === true, s2 = {}, c2 = { broadcast: n2, presence: Object.assign(Object.assign({}, r2), { enabled: o2 }), postgres_changes: a2, private: i2 };
        this.socket.accessTokenValue && (s2.access_token = this.socket.accessTokenValue), this._onError((t3) => {
          e3?.(D.CHANNEL_ERROR, qe(t3));
        }), this._onClose(() => e3?.(D.CLOSED)), this.updateJoinPayload(Object.assign({ config: c2 }, s2)), this._updateFilterMessage(), this.channelAdapter.subscribe(t2).receive(`ok`, async ({ postgres_changes: t3 }) => {
          if (this.socket._isManualToken() || this.socket.setAuth(), t3 === void 0) {
            e3?.(D.SUBSCRIBED);
            return;
          }
          this._updatePostgresBindings(t3, e3);
        }).receive(`error`, (t3) => {
          this.state = v.errored;
          let n3 = Object.values(t3).join(`, `) || `error`;
          e3?.(D.CHANNEL_ERROR, Error(n3, { cause: t3 }));
        }).receive(`timeout`, () => {
          e3?.(D.TIMED_OUT);
        });
      }
      return this;
    }
    _updatePostgresBindings(t2, n2) {
      let r2 = this.bindings.postgres_changes, i2 = r2?.length ?? 0, a2 = [];
      for (let o2 = 0; o2 < i2; o2++) {
        let i3 = r2[o2], { filter: { event: s2, schema: c2, table: l2, filter: u2 } } = i3, d2 = t2 && t2[o2];
        if (d2 && d2.event === s2 && e2.isFilterValueEqual(d2.schema, c2) && e2.isFilterValueEqual(d2.table, l2) && e2.isFilterValueEqual(d2.filter, u2)) a2.push(Object.assign(Object.assign({}, i3), { id: d2.id }));
        else {
          this.unsubscribe(), this.state = v.errored, n2?.(D.CHANNEL_ERROR, Error(`mismatch between server and client bindings for postgres changes`));
          return;
        }
      }
      this.bindings.postgres_changes = a2, this.state != v.errored && n2 && n2(D.SUBSCRIBED);
    }
    presenceState() {
      return this.presence.state;
    }
    async track(e3, t2 = {}) {
      return await this.send({ type: `presence`, event: `track`, payload: e3 }, t2.timeout || this.timeout);
    }
    async untrack(e3 = {}) {
      return await this.send({ type: `presence`, event: `untrack` }, e3);
    }
    on(e3, t2, n2) {
      let r2 = this.channelAdapter.isJoined() || this.channelAdapter.isJoining(), i2 = e3 === E.PRESENCE || e3 === E.POSTGRES_CHANGES;
      if (r2 && i2) throw this.socket.log(`channel`, `cannot add \`${e3}\` callbacks for ${this.topic} after \`subscribe()\`.`), Error(`cannot add \`${e3}\` callbacks for ${this.topic} after \`subscribe()\`.`);
      return this._on(e3, t2, n2);
    }
    async httpSend(e3, t2, n2 = {}) {
      if (t2 == null) return Promise.reject(Error(`Payload is required for httpSend()`));
      let r2 = { apikey: this.socket.apiKey ? this.socket.apiKey : ``, "Content-Type": `application/json` };
      this.socket.accessTokenValue && (r2.Authorization = `Bearer ${this.socket.accessTokenValue}`);
      let i2 = { method: `POST`, headers: r2, body: JSON.stringify({ messages: [{ topic: this.subTopic, event: e3, payload: t2, private: this.private }] }) }, a2 = await this._fetchWithTimeout(this.broadcastEndpointURL, i2, n2.timeout ?? this.timeout);
      if (a2.status === 202) return { success: true };
      let o2 = a2.statusText;
      try {
        let e4 = await a2.json();
        o2 = e4.error || e4.message || o2;
      } catch {
      }
      return Promise.reject(Error(o2));
    }
    async send(e3, t2 = {}) {
      if (!this.channelAdapter.canPush() && e3.type === `broadcast`) {
        console.warn(`Realtime send() is automatically falling back to REST API. This behavior will be deprecated in the future. Please use httpSend() explicitly for REST delivery.`);
        let { event: n2, payload: r2 } = e3, i2 = { apikey: this.socket.apiKey ? this.socket.apiKey : ``, "Content-Type": `application/json` };
        this.socket.accessTokenValue && (i2.Authorization = `Bearer ${this.socket.accessTokenValue}`);
        let a2 = { method: `POST`, headers: i2, body: JSON.stringify({ messages: [{ topic: this.subTopic, event: n2, payload: r2, private: this.private }] }) };
        try {
          let e4 = await this._fetchWithTimeout(this.broadcastEndpointURL, a2, t2.timeout ?? this.timeout);
          return await e4.body?.cancel(), e4.ok ? `ok` : `error`;
        } catch (e4) {
          return e4 instanceof Error && e4.name === `AbortError` ? `timed out` : `error`;
        }
      } else return new Promise((n2) => {
        let r2 = this.channelAdapter.push(e3.type, e3, t2.timeout || this.timeout);
        e3.type === `broadcast` && !this.params?.config?.broadcast?.ack && n2(`ok`), r2.receive(`ok`, () => n2(`ok`)), r2.receive(`error`, () => n2(`error`)), r2.receive(`timeout`, () => n2(`timed out`));
      });
    }
    updateJoinPayload(e3) {
      this.channelAdapter.updateJoinPayload(e3);
    }
    async unsubscribe(e3 = this.timeout) {
      return new Promise((t2) => {
        this.channelAdapter.unsubscribe(e3).receive(`ok`, () => t2(`ok`)).receive(`timeout`, () => t2(`timed out`)).receive(`error`, () => t2(`error`));
      });
    }
    teardown() {
      this.channelAdapter.teardown();
    }
    async _fetchWithTimeout(e3, t2, n2) {
      let r2 = new AbortController(), i2 = setTimeout(() => r2.abort(), n2), a2 = await this.socket.fetch(e3, Object.assign(Object.assign({}, t2), { signal: r2.signal }));
      return clearTimeout(i2), a2;
    }
    _on(e3, t2, n2) {
      let r2 = e3.toLocaleLowerCase(), i2 = { type: r2, filter: t2, callback: n2, ref: this.channelAdapter.on(e3, n2) };
      return this.bindings[r2] ? this.bindings[r2].push(i2) : this.bindings[r2] = [i2], this._updateFilterMessage(), this;
    }
    _onClose(e3) {
      this.channelAdapter.onClose(e3);
    }
    _onError(e3) {
      this.channelAdapter.onError(e3);
    }
    _updateFilterMessage() {
      this.channelAdapter.updateFilterBindings((e3, t2, n2) => {
        let r2 = e3.event.toLocaleLowerCase();
        if (this._notThisChannelEvent(r2, n2)) return false;
        let i2 = this.bindings[r2]?.find((t3) => t3.ref === e3.ref);
        if (!i2) return true;
        if ([`broadcast`, `presence`, `postgres_changes`].includes(r2)) if (`id` in i2) {
          let e4 = i2.id, n3 = i2.filter?.event;
          return e4 && t2.ids?.includes(e4) && (n3 === `*` || n3?.toLocaleLowerCase() === t2.data?.type.toLocaleLowerCase());
        } else {
          let e4 = i2?.filter?.event?.toLocaleLowerCase();
          return e4 === `*` || e4 === t2?.event?.toLocaleLowerCase();
        }
        else return i2.type.toLocaleLowerCase() === r2;
      });
    }
    _notThisChannelEvent(e3, t2) {
      let { close: n2, error: r2, leave: i2, join: a2 } = de;
      return t2 && [n2, r2, i2, a2].includes(e3) && t2 !== this.joinPush.ref;
    }
    _updateFilterTransform() {
      this.channelAdapter.updatePayloadTransform((e3, t2, n2) => {
        if (typeof t2 == `object` && `ids` in t2) {
          let e4 = t2.data, { schema: n3, table: r2, commit_timestamp: i2, type: a2, errors: o2 } = e4, s2 = { schema: n3, table: r2, commit_timestamp: i2, eventType: a2, new: {}, old: {}, errors: o2 };
          return Object.assign(Object.assign({}, s2), this._getPayloadRecords(e4));
        }
        return t2;
      });
    }
    copyBindings(e3) {
      if (this.joinedOnce) throw Error(`cannot copy bindings into joined channel`);
      for (let t2 in e3.bindings) for (let n2 of e3.bindings[t2]) this._on(n2.type, n2.filter, n2.callback);
    }
    static isFilterValueEqual(e3, t2) {
      return (e3 ?? void 0) === (t2 ?? void 0);
    }
    _getPayloadRecords(e3) {
      let t2 = { new: {}, old: {} };
      return (e3.type === `INSERT` || e3.type === `UPDATE`) && (t2.new = me(e3.columns, e3.record)), (e3.type === `UPDATE` || e3.type === `DELETE`) && (t2.old = me(e3.columns, e3.old_record)), t2;
    }
  }, $e = class {
    constructor(e2, t2) {
      this.socket = new ze(e2, t2);
    }
    get timeout() {
      return this.socket.timeout;
    }
    get endPoint() {
      return this.socket.endPoint;
    }
    get transport() {
      return this.socket.transport;
    }
    get heartbeatIntervalMs() {
      return this.socket.heartbeatIntervalMs;
    }
    get heartbeatCallback() {
      return this.socket.heartbeatCallback;
    }
    set heartbeatCallback(e2) {
      this.socket.heartbeatCallback = e2;
    }
    get heartbeatTimer() {
      return this.socket.heartbeatTimer;
    }
    get pendingHeartbeatRef() {
      return this.socket.pendingHeartbeatRef;
    }
    get reconnectTimer() {
      return this.socket.reconnectTimer;
    }
    get vsn() {
      return this.socket.vsn;
    }
    get encode() {
      return this.socket.encode;
    }
    get decode() {
      return this.socket.decode;
    }
    get reconnectAfterMs() {
      return this.socket.reconnectAfterMs;
    }
    get sendBuffer() {
      return this.socket.sendBuffer;
    }
    get stateChangeCallbacks() {
      return this.socket.stateChangeCallbacks;
    }
    connect() {
      this.socket.connect();
    }
    disconnect(e2, t2, n2, r2 = 1e4) {
      return new Promise((i2) => {
        setTimeout(() => i2(`timeout`), r2), this.socket.disconnect(() => {
          e2(), i2(`ok`);
        }, t2, n2);
      });
    }
    push(e2) {
      this.socket.push(e2);
    }
    log(e2, t2, n2) {
      this.socket.log(e2, t2, n2);
    }
    makeRef() {
      return this.socket.makeRef();
    }
    onOpen(e2) {
      this.socket.onOpen(e2);
    }
    onClose(e2) {
      this.socket.onClose(e2);
    }
    onError(e2) {
      this.socket.onError(e2);
    }
    onMessage(e2) {
      this.socket.onMessage(e2);
    }
    isConnected() {
      return this.socket.isConnected();
    }
    isConnecting() {
      return this.socket.connectionState() == fe.connecting;
    }
    isDisconnecting() {
      return this.socket.connectionState() == fe.closing;
    }
    connectionState() {
      return this.socket.connectionState();
    }
    endPointURL() {
      return this.socket.endPointURL();
    }
    sendHeartbeat() {
      this.socket.sendHeartbeat();
    }
    getSocket() {
      return this.socket;
    }
  };
  let et = { HEARTBEAT_INTERVAL: 25e3, RECONNECT_DELAY: 10, HEARTBEAT_TIMEOUT_FALLBACK: 100 }, tt = [1e3, 2e3, 5e3, 1e4];
  function nt() {
    let e2 = /* @__PURE__ */ new Map();
    return { get length() {
      return e2.size;
    }, clear() {
      e2.clear();
    }, getItem(t2) {
      return e2.has(t2) ? e2.get(t2) : null;
    }, key(t2) {
      return Array.from(e2.keys())[t2] ?? null;
    }, removeItem(t2) {
      e2.delete(t2);
    }, setItem(t2, n2) {
      e2.set(t2, String(n2));
    } };
  }
  function rt() {
    try {
      if (typeof globalThis < `u` && globalThis.sessionStorage) return globalThis.sessionStorage;
    } catch {
    }
    return nt();
  }
  var it = class {
    get endPoint() {
      return this.socketAdapter.endPoint;
    }
    get timeout() {
      return this.socketAdapter.timeout;
    }
    get transport() {
      return this.socketAdapter.transport;
    }
    get heartbeatCallback() {
      return this.socketAdapter.heartbeatCallback;
    }
    get heartbeatIntervalMs() {
      return this.socketAdapter.heartbeatIntervalMs;
    }
    get heartbeatTimer() {
      return this.worker ? this._workerHeartbeatTimer : this.socketAdapter.heartbeatTimer;
    }
    get pendingHeartbeatRef() {
      return this.worker ? this._pendingWorkerHeartbeatRef : this.socketAdapter.pendingHeartbeatRef;
    }
    get reconnectTimer() {
      return this.socketAdapter.reconnectTimer;
    }
    get vsn() {
      return this.socketAdapter.vsn;
    }
    get encode() {
      return this.socketAdapter.encode;
    }
    get decode() {
      return this.socketAdapter.decode;
    }
    get reconnectAfterMs() {
      return this.socketAdapter.reconnectAfterMs;
    }
    get sendBuffer() {
      return this.socketAdapter.sendBuffer;
    }
    get stateChangeCallbacks() {
      return this.socketAdapter.stateChangeCallbacks;
    }
    constructor(e2, t2) {
      if (this.channels = [], this.accessTokenValue = null, this.accessToken = null, this.apiKey = null, this.httpEndpoint = ``, this.headers = {}, this.params = {}, this.ref = 0, this.serializer = new pe(), this._manuallySetToken = false, this._authPromise = null, this._workerHeartbeatTimer = void 0, this._pendingWorkerHeartbeatRef = null, this._pendingDisconnectTimer = null, this._disconnectOnEmptyChannelsAfterMs = 0, this._resolveFetch = (e3) => e3 ? (...t3) => e3(...t3) : (...e4) => fetch(...e4), !t2?.params?.apikey) throw Error(`API key is required to connect to Realtime`);
      this.apiKey = t2.params.apikey, this.socketAdapter = new $e(e2, this._initializeOptions(t2)), this.httpEndpoint = Ce(e2), this.fetch = this._resolveFetch(t2?.fetch);
    }
    connect() {
      if (!(this.isConnecting() || this.isDisconnecting() || this.isConnected())) {
        this.accessToken && !this._authPromise && this._setAuthSafely(`connect`), this._setupConnectionHandlers();
        try {
          this.socketAdapter.connect();
        } catch (e2) {
          let t2 = e2.message;
          throw t2.includes(`Node.js`) ? Error(`${t2}

To use Realtime in Node.js, you need to provide a WebSocket implementation:

Option 1: Use Node.js 22+ which has native WebSocket support
Option 2: Install and provide the "ws" package:

  npm install ws

  import ws from "ws"
  const client = new RealtimeClient(url, {
    ...options,
    transport: ws
  })`) : Error(`WebSocket not available: ${t2}`);
        }
        this._handleNodeJsRaceCondition();
      }
    }
    endpointURL() {
      return this.socketAdapter.endPointURL();
    }
    async disconnect(e2, t2) {
      return this._cancelPendingDisconnect(), this.isDisconnecting() ? `ok` : await this.socketAdapter.disconnect(() => {
        clearInterval(this._workerHeartbeatTimer), this._terminateWorker();
      }, e2, t2);
    }
    getChannels() {
      return this.channels;
    }
    async removeChannel(e2) {
      let t2 = await e2.unsubscribe();
      return t2 === `ok` && e2.teardown(), t2;
    }
    async removeAllChannels() {
      let e2 = this.channels.map(async (e3) => {
        let t3 = await e3.unsubscribe();
        return e3.teardown(), t3;
      }), t2 = await Promise.all(e2);
      return await this.disconnect(), t2;
    }
    log(e2, t2, n2) {
      this.socketAdapter.log(e2, t2, n2);
    }
    connectionState() {
      return this.socketAdapter.connectionState() || fe.closed;
    }
    isConnected() {
      return this.socketAdapter.isConnected();
    }
    isConnecting() {
      return this.socketAdapter.isConnecting();
    }
    isDisconnecting() {
      return this.socketAdapter.isDisconnecting();
    }
    channel(e2, t2 = { config: {} }) {
      let n2 = `realtime:${e2}`, r2 = this.getChannels().find((e3) => e3.topic === n2);
      if (r2) return r2;
      {
        let n3 = new Qe(`realtime:${e2}`, t2, this);
        return this._cancelPendingDisconnect(), this.channels.push(n3), n3;
      }
    }
    push(e2) {
      this.socketAdapter.push(e2);
    }
    async setAuth(e2 = null) {
      this._authPromise = this._performAuth(e2);
      try {
        await this._authPromise;
      } finally {
        this._authPromise = null;
      }
    }
    _isManualToken() {
      return this._manuallySetToken;
    }
    async sendHeartbeat() {
      this.socketAdapter.sendHeartbeat();
    }
    onHeartbeat(e2) {
      this.socketAdapter.heartbeatCallback = this._wrapHeartbeatCallback(e2);
    }
    _makeRef() {
      return this.socketAdapter.makeRef();
    }
    _remove(e2) {
      this.channels = this.channels.filter((t2) => t2.topic !== e2.topic), this.channels.length === 0 && (this.log(`transport`, `no channels remaining, scheduling disconnect`), this._schedulePendingDisconnect());
    }
    _schedulePendingDisconnect() {
      if (this._cancelPendingDisconnect(), this._disconnectOnEmptyChannelsAfterMs === 0) {
        this.log(`transport`, `disconnecting immediately - no channels`), this.disconnect();
        return;
      }
      this._pendingDisconnectTimer = setTimeout(() => {
        this._pendingDisconnectTimer = null, this.channels.length === 0 && (this.log(`transport`, `deferred disconnect fired - no channels, disconnecting`), this.disconnect());
      }, this._disconnectOnEmptyChannelsAfterMs), this.log(`transport`, `deferred disconnect scheduled in ${this._disconnectOnEmptyChannelsAfterMs}ms`);
    }
    _cancelPendingDisconnect() {
      this._pendingDisconnectTimer !== null && (this.log(`transport`, `pending disconnect cancelled - channel activity detected`), clearTimeout(this._pendingDisconnectTimer), this._pendingDisconnectTimer = null);
    }
    async _performAuth(e2 = null) {
      let t2, n2 = false;
      if (e2) t2 = e2, n2 = true;
      else if (this.accessToken) try {
        t2 = await this.accessToken();
      } catch (e3) {
        this.log(`error`, `Error fetching access token from callback`, e3), t2 = this.accessTokenValue;
      }
      else t2 = this.accessTokenValue;
      n2 ? this._manuallySetToken = true : this.accessToken && (this._manuallySetToken = false), this.accessTokenValue != t2 && (this.accessTokenValue = t2, this.channels.forEach((e3) => {
        let n3 = { access_token: t2, version: `realtime-js/2.106.1` };
        t2 && e3.updateJoinPayload(n3), e3.joinedOnce && e3.channelAdapter.isJoined() && e3.channelAdapter.push(de.access_token, { access_token: t2 });
      }));
    }
    async _waitForAuthIfNeeded() {
      this._authPromise && await this._authPromise;
    }
    _setAuthSafely(e2 = `general`) {
      this._isManualToken() || this.setAuth().catch((t2) => {
        this.log(`error`, `Error setting auth in ${e2}`, t2);
      });
    }
    _setupConnectionHandlers() {
      this.socketAdapter.onOpen(() => {
        (this._authPromise || (this.accessToken && !this.accessTokenValue ? this.setAuth() : Promise.resolve())).catch((e2) => {
          this.log(`error`, `error waiting for auth on connect`, e2);
        }), this.worker && !this.workerRef && this._startWorkerHeartbeat();
      }), this.socketAdapter.onClose(() => {
        this.worker && this.workerRef && this._terminateWorker();
      }), this.socketAdapter.onMessage((e2) => {
        e2.ref && e2.ref === this._pendingWorkerHeartbeatRef && (this._pendingWorkerHeartbeatRef = null);
      });
    }
    _handleNodeJsRaceCondition() {
      this.socketAdapter.isConnected() && this.socketAdapter.getSocket().onConnOpen();
    }
    _wrapHeartbeatCallback(e2) {
      return (t2, n2) => {
        t2 == `sent` && this._setAuthSafely(), e2 && e2(t2, n2);
      };
    }
    _startWorkerHeartbeat() {
      this.workerUrl ? this.log(`worker`, `starting worker for from ${this.workerUrl}`) : this.log(`worker`, `starting default worker`);
      let e2 = this._workerObjectUrl(this.workerUrl);
      this.workerRef = new Worker(e2), this.workerRef.onerror = (e3) => {
        this.log(`worker`, `worker error`, e3.message), this._terminateWorker(), this.disconnect();
      }, this.workerRef.onmessage = (e3) => {
        e3.data.event === `keepAlive` && this.sendHeartbeat();
      }, this.workerRef.postMessage({ event: `start`, interval: this.heartbeatIntervalMs });
    }
    _terminateWorker() {
      this.workerRef &&= (this.log(`worker`, `terminating worker`), this.workerRef.terminate(), void 0);
    }
    _workerObjectUrl(e2) {
      let t2;
      if (e2) t2 = e2;
      else {
        let e3 = new Blob([`
  addEventListener("message", (e) => {
    if (e.data.event === "start") {
      setInterval(() => postMessage({ event: "keepAlive" }), e.data.interval);
    }
  });`], { type: `application/javascript` });
        t2 = URL.createObjectURL(e3);
      }
      return t2;
    }
    _initializeOptions(e2) {
      this.worker = e2?.worker ?? false, this.accessToken = e2?.accessToken ?? null;
      let t2 = {};
      t2.timeout = e2?.timeout ?? 1e4, t2.heartbeatIntervalMs = e2?.heartbeatIntervalMs ?? et.HEARTBEAT_INTERVAL, this._disconnectOnEmptyChannelsAfterMs = e2?.disconnectOnEmptyChannelsAfterMs ?? 2 * (e2?.heartbeatIntervalMs ?? et.HEARTBEAT_INTERVAL), t2.transport = e2?.transport ?? ue.getWebSocketConstructor(), t2.params = e2?.params, t2.logger = e2?.logger, t2.heartbeatCallback = this._wrapHeartbeatCallback(e2?.heartbeatCallback), t2.sessionStorage = e2?.sessionStorage ?? rt(), t2.reconnectAfterMs = e2?.reconnectAfterMs ?? ((e3) => tt[e3 - 1] || 1e4);
      let n2, r2, i2 = e2?.vsn ?? `2.0.0`;
      switch (i2) {
        case `1.0.0`:
          n2 = (e3, t3) => t3(JSON.stringify(e3)), r2 = (e3, t3) => t3(JSON.parse(e3));
          break;
        case `2.0.0`:
          n2 = this.serializer.encode.bind(this.serializer), r2 = this.serializer.decode.bind(this.serializer);
          break;
        default:
          throw Error(`Unsupported serializer version: ${t2.vsn}`);
      }
      if (t2.vsn = i2, t2.encode = e2?.encode ?? n2, t2.decode = e2?.decode ?? r2, t2.beforeReconnect = this._reconnectAuth.bind(this), (e2?.logLevel || e2?.log_level) && (this.logLevel = e2.logLevel || e2.log_level, t2.params = Object.assign(Object.assign({}, t2.params), { log_level: this.logLevel })), this.worker) {
        if (typeof window < `u` && !window.Worker) throw Error(`Web Worker is not supported`);
        this.workerUrl = e2?.workerUrl, t2.autoSendHeartbeat = !this.worker;
      }
      return t2;
    }
    async _reconnectAuth() {
      await this._waitForAuthIfNeeded(), this.isConnected() || this.connect();
    }
  }, at = class extends Error {
    constructor(e2, t2) {
      super(e2), this.name = `IcebergError`, this.status = t2.status, this.icebergType = t2.icebergType, this.icebergCode = t2.icebergCode, this.details = t2.details, this.isCommitStateUnknown = t2.icebergType === `CommitStateUnknownException` || [500, 502, 504].includes(t2.status) && t2.icebergType?.includes(`CommitState`) === true;
    }
    isNotFound() {
      return this.status === 404;
    }
    isConflict() {
      return this.status === 409;
    }
    isAuthenticationTimeout() {
      return this.status === 419;
    }
  };
  function ot(e2, t2, n2) {
    let r2 = new URL(t2, e2);
    if (n2) for (let [e3, t3] of Object.entries(n2)) t3 !== void 0 && r2.searchParams.set(e3, t3);
    return r2.toString();
  }
  async function st(e2) {
    return !e2 || e2.type === `none` ? {} : e2.type === `bearer` ? { Authorization: `Bearer ${e2.token}` } : e2.type === `header` ? { [e2.name]: e2.value } : e2.type === `custom` ? await e2.getHeaders() : {};
  }
  function ct(e2) {
    let t2 = e2.fetchImpl ?? globalThis.fetch;
    return { async request({ method: n2, path: r2, query: i2, body: a2, headers: o2 }) {
      let s2 = ot(e2.baseUrl, r2, i2), c2 = await st(e2.auth), l2 = await t2(s2, { method: n2, headers: { ...a2 ? { "Content-Type": `application/json` } : {}, ...c2, ...o2 }, body: a2 ? JSON.stringify(a2) : void 0 }), u2 = await l2.text(), d2 = (l2.headers.get(`content-type`) || ``).includes(`application/json`), f2 = d2 && u2 ? JSON.parse(u2) : u2;
      if (!l2.ok) {
        let e3 = d2 ? f2 : void 0, t3 = e3?.error;
        throw new at(t3?.message ?? `Request failed with status ${l2.status}`, { status: l2.status, icebergType: t3?.type, icebergCode: t3?.code, details: e3 });
      }
      return { status: l2.status, headers: l2.headers, data: f2 };
    } };
  }
  function lt(e2) {
    return e2.join(``);
  }
  var ut = class {
    constructor(e2, t2 = ``) {
      this.client = e2, this.prefix = t2;
    }
    async listNamespaces(e2) {
      let t2 = e2 ? { parent: lt(e2.namespace) } : void 0;
      return (await this.client.request({ method: `GET`, path: `${this.prefix}/namespaces`, query: t2 })).data.namespaces.map((e3) => ({ namespace: e3 }));
    }
    async createNamespace(e2, t2) {
      let n2 = { namespace: e2.namespace, properties: t2?.properties };
      return (await this.client.request({ method: `POST`, path: `${this.prefix}/namespaces`, body: n2 })).data;
    }
    async dropNamespace(e2) {
      await this.client.request({ method: `DELETE`, path: `${this.prefix}/namespaces/${lt(e2.namespace)}` });
    }
    async loadNamespaceMetadata(e2) {
      return { properties: (await this.client.request({ method: `GET`, path: `${this.prefix}/namespaces/${lt(e2.namespace)}` })).data.properties };
    }
    async namespaceExists(e2) {
      try {
        return await this.client.request({ method: `HEAD`, path: `${this.prefix}/namespaces/${lt(e2.namespace)}` }), true;
      } catch (e3) {
        if (e3 instanceof at && e3.status === 404) return false;
        throw e3;
      }
    }
    async createNamespaceIfNotExists(e2, t2) {
      try {
        return await this.createNamespace(e2, t2);
      } catch (e3) {
        if (e3 instanceof at && e3.status === 409) return;
        throw e3;
      }
    }
  };
  function O(e2) {
    return e2.join(``);
  }
  var dt = class {
    constructor(e2, t2 = ``, n2) {
      this.client = e2, this.prefix = t2, this.accessDelegation = n2;
    }
    async listTables(e2) {
      return (await this.client.request({ method: `GET`, path: `${this.prefix}/namespaces/${O(e2.namespace)}/tables` })).data.identifiers;
    }
    async createTable(e2, t2) {
      let n2 = {};
      return this.accessDelegation && (n2[`X-Iceberg-Access-Delegation`] = this.accessDelegation), (await this.client.request({ method: `POST`, path: `${this.prefix}/namespaces/${O(e2.namespace)}/tables`, body: t2, headers: n2 })).data.metadata;
    }
    async updateTable(e2, t2) {
      let n2 = await this.client.request({ method: `POST`, path: `${this.prefix}/namespaces/${O(e2.namespace)}/tables/${e2.name}`, body: t2 });
      return { "metadata-location": n2.data[`metadata-location`], metadata: n2.data.metadata };
    }
    async dropTable(e2, t2) {
      await this.client.request({ method: `DELETE`, path: `${this.prefix}/namespaces/${O(e2.namespace)}/tables/${e2.name}`, query: { purgeRequested: String(t2?.purge ?? false) } });
    }
    async loadTable(e2) {
      let t2 = {};
      return this.accessDelegation && (t2[`X-Iceberg-Access-Delegation`] = this.accessDelegation), (await this.client.request({ method: `GET`, path: `${this.prefix}/namespaces/${O(e2.namespace)}/tables/${e2.name}`, headers: t2 })).data.metadata;
    }
    async tableExists(e2) {
      let t2 = {};
      this.accessDelegation && (t2[`X-Iceberg-Access-Delegation`] = this.accessDelegation);
      try {
        return await this.client.request({ method: `HEAD`, path: `${this.prefix}/namespaces/${O(e2.namespace)}/tables/${e2.name}`, headers: t2 }), true;
      } catch (e3) {
        if (e3 instanceof at && e3.status === 404) return false;
        throw e3;
      }
    }
    async createTableIfNotExists(e2, t2) {
      try {
        return await this.createTable(e2, t2);
      } catch (n2) {
        if (n2 instanceof at && n2.status === 409) return await this.loadTable({ namespace: e2.namespace, name: t2.name });
        throw n2;
      }
    }
  }, ft = class {
    constructor(e2) {
      let t2 = `v1`;
      e2.catalogName && (t2 += `/${e2.catalogName}`), this.client = ct({ baseUrl: e2.baseUrl.endsWith(`/`) ? e2.baseUrl : `${e2.baseUrl}/`, auth: e2.auth, fetchImpl: e2.fetch }), this.accessDelegation = e2.accessDelegation?.join(`,`), this.namespaceOps = new ut(this.client, t2), this.tableOps = new dt(this.client, t2, this.accessDelegation);
    }
    async listNamespaces(e2) {
      return this.namespaceOps.listNamespaces(e2);
    }
    async createNamespace(e2, t2) {
      return this.namespaceOps.createNamespace(e2, t2);
    }
    async dropNamespace(e2) {
      await this.namespaceOps.dropNamespace(e2);
    }
    async loadNamespaceMetadata(e2) {
      return this.namespaceOps.loadNamespaceMetadata(e2);
    }
    async listTables(e2) {
      return this.tableOps.listTables(e2);
    }
    async createTable(e2, t2) {
      return this.tableOps.createTable(e2, t2);
    }
    async updateTable(e2, t2) {
      return this.tableOps.updateTable(e2, t2);
    }
    async dropTable(e2, t2) {
      await this.tableOps.dropTable(e2, t2);
    }
    async loadTable(e2) {
      return this.tableOps.loadTable(e2);
    }
    async namespaceExists(e2) {
      return this.namespaceOps.namespaceExists(e2);
    }
    async tableExists(e2) {
      return this.tableOps.tableExists(e2);
    }
    async createNamespaceIfNotExists(e2, t2) {
      return this.namespaceOps.createNamespaceIfNotExists(e2, t2);
    }
    async createTableIfNotExists(e2, t2) {
      return this.tableOps.createTableIfNotExists(e2, t2);
    }
  };
  function pt(e2) {
    "@babel/helpers - typeof";
    return pt = typeof Symbol == `function` && typeof Symbol.iterator == `symbol` ? function(e3) {
      return typeof e3;
    } : function(e3) {
      return e3 && typeof Symbol == `function` && e3.constructor === Symbol && e3 !== Symbol.prototype ? `symbol` : typeof e3;
    }, pt(e2);
  }
  function mt(e2, t2) {
    if (pt(e2) != `object` || !e2) return e2;
    var n2 = e2[Symbol.toPrimitive];
    if (n2 !== void 0) {
      var r2 = n2.call(e2, t2 || `default`);
      if (pt(r2) != `object`) return r2;
      throw TypeError(`@@toPrimitive must return a primitive value.`);
    }
    return (t2 === `string` ? String : Number)(e2);
  }
  function ht(e2) {
    var t2 = mt(e2, `string`);
    return pt(t2) == `symbol` ? t2 : t2 + ``;
  }
  function gt(e2, t2, n2) {
    return (t2 = ht(t2)) in e2 ? Object.defineProperty(e2, t2, { value: n2, enumerable: true, configurable: true, writable: true }) : e2[t2] = n2, e2;
  }
  function _t(e2, t2) {
    var n2 = Object.keys(e2);
    if (Object.getOwnPropertySymbols) {
      var r2 = Object.getOwnPropertySymbols(e2);
      t2 && (r2 = r2.filter(function(t3) {
        return Object.getOwnPropertyDescriptor(e2, t3).enumerable;
      })), n2.push.apply(n2, r2);
    }
    return n2;
  }
  function k(e2) {
    for (var t2 = 1; t2 < arguments.length; t2++) {
      var n2 = arguments[t2] == null ? {} : arguments[t2];
      t2 % 2 ? _t(Object(n2), true).forEach(function(t3) {
        gt(e2, t3, n2[t3]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e2, Object.getOwnPropertyDescriptors(n2)) : _t(Object(n2)).forEach(function(t3) {
        Object.defineProperty(e2, t3, Object.getOwnPropertyDescriptor(n2, t3));
      });
    }
    return e2;
  }
  var vt = class extends Error {
    constructor(e2, t2 = `storage`, n2, r2) {
      super(e2), this.__isStorageError = true, this.namespace = t2, this.name = t2 === `vectors` ? `StorageVectorsError` : `StorageError`, this.status = n2, this.statusCode = r2;
    }
    toJSON() {
      return { name: this.name, message: this.message, status: this.status, statusCode: this.statusCode };
    }
  };
  function yt(e2) {
    return typeof e2 == `object` && !!e2 && `__isStorageError` in e2;
  }
  var bt = class extends vt {
    constructor(e2, t2, n2, r2 = `storage`) {
      super(e2, r2, t2, n2), this.name = r2 === `vectors` ? `StorageVectorsApiError` : `StorageApiError`, this.status = t2, this.statusCode = n2;
    }
    toJSON() {
      return k({}, super.toJSON());
    }
  }, xt = class extends vt {
    constructor(e2, t2, n2 = `storage`) {
      super(e2, n2), this.name = n2 === `vectors` ? `StorageVectorsUnknownError` : `StorageUnknownError`, this.originalError = t2;
    }
  };
  function St(e2, t2, n2) {
    let r2 = k({}, e2), i2 = t2.toLowerCase();
    for (let e3 of Object.keys(r2)) e3.toLowerCase() === i2 && delete r2[e3];
    return r2[i2] = n2, r2;
  }
  function Ct(e2) {
    let t2 = {};
    for (let [n2, r2] of Object.entries(e2)) t2[n2.toLowerCase()] = r2;
    return t2;
  }
  let wt = (e2) => e2 ? (...t2) => e2(...t2) : (...e3) => fetch(...e3), Tt = (e2) => {
    if (typeof e2 != `object` || !e2) return false;
    let t2 = Object.getPrototypeOf(e2);
    return (t2 === null || t2 === Object.prototype || Object.getPrototypeOf(t2) === null) && !(Symbol.toStringTag in e2) && !(Symbol.iterator in e2);
  }, Et = (e2) => {
    if (Array.isArray(e2)) return e2.map((e3) => Et(e3));
    if (typeof e2 == `function` || e2 !== Object(e2)) return e2;
    let t2 = {};
    return Object.entries(e2).forEach(([e3, n2]) => {
      let r2 = e3.replace(/([-_][a-z])/gi, (e4) => e4.toUpperCase().replace(/[-_]/g, ``));
      t2[r2] = Et(n2);
    }), t2;
  }, Dt = (e2) => !e2 || typeof e2 != `string` || e2.length === 0 || e2.length > 100 || e2.trim() !== e2 || e2.includes(`/`) || e2.includes(`\\`) ? false : /^[\w!.\*'() &$@=;:+,?-]+$/.test(e2), Ot = (e2) => {
    if (typeof e2 == `object` && e2) {
      let t2 = e2;
      if (typeof t2.msg == `string`) return t2.msg;
      if (typeof t2.message == `string`) return t2.message;
      if (typeof t2.error_description == `string`) return t2.error_description;
      if (typeof t2.error == `string`) return t2.error;
      if (typeof t2.error == `object` && t2.error !== null) {
        let e3 = t2.error;
        if (typeof e3.message == `string`) return e3.message;
      }
    }
    return JSON.stringify(e2);
  }, kt = async (e2, t2, n2, r2) => {
    if (typeof e2 == `object` && e2 && `json` in e2 && typeof e2.json == `function`) {
      let n3 = e2, i2 = parseInt(String(n3.status), 10);
      Number.isFinite(i2) || (i2 = 500), n3.json().then((e3) => {
        let n4 = e3?.statusCode || e3?.code || i2 + ``;
        t2(new bt(Ot(e3), i2, n4, r2));
      }).catch(() => {
        let e3 = i2 + ``;
        t2(new bt(n3.statusText || `HTTP ${i2} error`, i2, e3, r2));
      });
    } else t2(new xt(Ot(e2), e2, r2));
  }, At = (e2, t2, n2, r2) => {
    let i2 = { method: e2, headers: t2?.headers || {} };
    if (e2 === `GET` || e2 === `HEAD` || !r2) return k(k({}, i2), n2);
    if (Tt(r2)) {
      let e3 = t2?.headers || {}, n3;
      for (let [t3, r3] of Object.entries(e3)) t3.toLowerCase() === `content-type` && (n3 = r3);
      i2.headers = St(e3, `Content-Type`, n3 ?? `application/json`), i2.body = JSON.stringify(r2);
    } else i2.body = r2;
    return t2?.duplex && (i2.duplex = t2.duplex), k(k({}, i2), n2);
  };
  async function jt(e2, t2, n2, r2, i2, a2, o2) {
    return new Promise((s2, c2) => {
      e2(n2, At(t2, r2, i2, a2)).then((e3) => {
        if (!e3.ok) throw e3;
        if (r2?.noResolveJson) return e3;
        if (o2 === `vectors`) {
          let t3 = e3.headers.get(`content-type`);
          if (e3.headers.get(`content-length`) === `0` || e3.status === 204 || !t3 || !t3.includes(`application/json`)) return {};
        }
        return e3.json();
      }).then((e3) => s2(e3)).catch((e3) => kt(e3, c2, r2, o2));
    });
  }
  function Mt(e2 = `storage`) {
    return { get: async (t2, n2, r2, i2) => jt(t2, `GET`, n2, r2, i2, void 0, e2), post: async (t2, n2, r2, i2, a2) => jt(t2, `POST`, n2, i2, a2, r2, e2), put: async (t2, n2, r2, i2, a2) => jt(t2, `PUT`, n2, i2, a2, r2, e2), head: async (t2, n2, r2, i2) => jt(t2, `HEAD`, n2, k(k({}, r2), {}, { noResolveJson: true }), i2, void 0, e2), remove: async (t2, n2, r2, i2, a2) => jt(t2, `DELETE`, n2, i2, a2, r2, e2) };
  }
  let { get: Nt, post: A, put: Pt, head: Ft, remove: It } = Mt(`storage`), j = Mt(`vectors`);
  var Lt = class {
    constructor(e2, t2 = {}, n2, r2 = `storage`) {
      this.shouldThrowOnError = false, this.url = e2, this.headers = Ct(t2), this.fetch = wt(n2), this.namespace = r2;
    }
    throwOnError() {
      return this.shouldThrowOnError = true, this;
    }
    setHeader(e2, t2) {
      return this.headers = St(this.headers, e2, t2), this;
    }
    async handleOperation(e2) {
      var t2 = this;
      try {
        return { data: await e2(), error: null };
      } catch (e3) {
        if (t2.shouldThrowOnError) throw e3;
        if (yt(e3)) return { data: null, error: e3 };
        throw e3;
      }
    }
  };
  let Rt;
  Rt = Symbol.toStringTag;
  var zt = class {
    constructor(e2, t2) {
      this.downloadFn = e2, this.shouldThrowOnError = t2, this[Rt] = `StreamDownloadBuilder`, this.promise = null;
    }
    then(e2, t2) {
      return this.getPromise().then(e2, t2);
    }
    catch(e2) {
      return this.getPromise().catch(e2);
    }
    finally(e2) {
      return this.getPromise().finally(e2);
    }
    getPromise() {
      return this.promise ||= this.execute(), this.promise;
    }
    async execute() {
      var e2 = this;
      try {
        return { data: (await e2.downloadFn()).body, error: null };
      } catch (t2) {
        if (e2.shouldThrowOnError) throw t2;
        if (yt(t2)) return { data: null, error: t2 };
        throw t2;
      }
    }
  };
  let Bt;
  Bt = Symbol.toStringTag;
  var Vt = class {
    constructor(e2, t2) {
      this.downloadFn = e2, this.shouldThrowOnError = t2, this[Bt] = `BlobDownloadBuilder`, this.promise = null;
    }
    asStream() {
      return new zt(this.downloadFn, this.shouldThrowOnError);
    }
    then(e2, t2) {
      return this.getPromise().then(e2, t2);
    }
    catch(e2) {
      return this.getPromise().catch(e2);
    }
    finally(e2) {
      return this.getPromise().finally(e2);
    }
    getPromise() {
      return this.promise ||= this.execute(), this.promise;
    }
    async execute() {
      var e2 = this;
      try {
        return { data: await (await e2.downloadFn()).blob(), error: null };
      } catch (t2) {
        if (e2.shouldThrowOnError) throw t2;
        if (yt(t2)) return { data: null, error: t2 };
        throw t2;
      }
    }
  };
  let Ht = { limit: 100, offset: 0, sortBy: { column: `name`, order: `asc` } }, Ut = { cacheControl: `3600`, contentType: `text/plain;charset=UTF-8`, upsert: false };
  var Wt = class extends Lt {
    constructor(e2, t2 = {}, n2, r2) {
      super(e2, t2, r2, `storage`), this.bucketId = n2;
    }
    async uploadOrUpdate(e2, t2, n2, r2) {
      var i2 = this;
      return i2.handleOperation(async () => {
        let a2, o2 = k(k({}, Ut), r2), s2 = k(k({}, i2.headers), e2 === `POST` && { "x-upsert": String(o2.upsert) }), c2 = o2.metadata;
        if (typeof Blob < `u` && n2 instanceof Blob ? (a2 = new FormData(), a2.append(`cacheControl`, o2.cacheControl), c2 && a2.append(`metadata`, i2.encodeMetadata(c2)), a2.append(``, n2)) : typeof FormData < `u` && n2 instanceof FormData ? (a2 = n2, a2.has(`cacheControl`) || a2.append(`cacheControl`, o2.cacheControl), c2 && !a2.has(`metadata`) && a2.append(`metadata`, i2.encodeMetadata(c2))) : (a2 = n2, s2[`cache-control`] = `max-age=${o2.cacheControl}`, s2[`content-type`] = o2.contentType, c2 && (s2[`x-metadata`] = i2.toBase64(i2.encodeMetadata(c2))), (typeof ReadableStream < `u` && a2 instanceof ReadableStream || a2 && typeof a2 == `object` && `pipe` in a2 && typeof a2.pipe == `function`) && !o2.duplex && (o2.duplex = `half`)), r2?.headers) for (let [e3, t3] of Object.entries(r2.headers)) s2 = St(s2, e3, t3);
        let l2 = i2._removeEmptyFolders(t2), u2 = i2._getFinalPath(l2), d2 = await (e2 == `PUT` ? Pt : A)(i2.fetch, `${i2.url}/object/${u2}`, a2, k({ headers: s2 }, o2?.duplex ? { duplex: o2.duplex } : {}));
        return { path: l2, id: d2.Id, fullPath: d2.Key };
      });
    }
    async upload(e2, t2, n2) {
      return this.uploadOrUpdate(`POST`, e2, t2, n2);
    }
    async uploadToSignedUrl(e2, t2, n2, r2) {
      var i2 = this;
      let a2 = i2._removeEmptyFolders(e2), o2 = i2._getFinalPath(a2), s2 = new URL(i2.url + `/object/upload/sign/${o2}`);
      return s2.searchParams.set(`token`, t2), i2.handleOperation(async () => {
        let e3, t3 = k(k({}, Ut), r2), o3 = k(k({}, i2.headers), { "x-upsert": String(t3.upsert) }), c2 = t3.metadata;
        if (typeof Blob < `u` && n2 instanceof Blob ? (e3 = new FormData(), e3.append(`cacheControl`, t3.cacheControl), c2 && e3.append(`metadata`, i2.encodeMetadata(c2)), e3.append(``, n2)) : typeof FormData < `u` && n2 instanceof FormData ? (e3 = n2, e3.has(`cacheControl`) || e3.append(`cacheControl`, t3.cacheControl), c2 && !e3.has(`metadata`) && e3.append(`metadata`, i2.encodeMetadata(c2))) : (e3 = n2, o3[`cache-control`] = `max-age=${t3.cacheControl}`, o3[`content-type`] = t3.contentType, c2 && (o3[`x-metadata`] = i2.toBase64(i2.encodeMetadata(c2))), (typeof ReadableStream < `u` && e3 instanceof ReadableStream || e3 && typeof e3 == `object` && `pipe` in e3 && typeof e3.pipe == `function`) && !t3.duplex && (t3.duplex = `half`)), r2?.headers) for (let [e4, t4] of Object.entries(r2.headers)) o3 = St(o3, e4, t4);
        return { path: a2, fullPath: (await Pt(i2.fetch, s2.toString(), e3, k({ headers: o3 }, t3?.duplex ? { duplex: t3.duplex } : {}))).Key };
      });
    }
    async createSignedUploadUrl(e2, t2) {
      var n2 = this;
      return n2.handleOperation(async () => {
        let r2 = n2._getFinalPath(e2), i2 = k({}, n2.headers);
        t2?.upsert && (i2[`x-upsert`] = `true`);
        let a2 = await A(n2.fetch, `${n2.url}/object/upload/sign/${r2}`, {}, { headers: i2 }), o2 = new URL(n2.url + a2.url), s2 = o2.searchParams.get(`token`);
        if (!s2) throw new vt(`No token returned by API`);
        return { signedUrl: o2.toString(), path: e2, token: s2 };
      });
    }
    async update(e2, t2, n2) {
      return this.uploadOrUpdate(`PUT`, e2, t2, n2);
    }
    async move(e2, t2, n2) {
      var r2 = this;
      return r2.handleOperation(async () => await A(r2.fetch, `${r2.url}/object/move`, { bucketId: r2.bucketId, sourceKey: e2, destinationKey: t2, destinationBucket: n2?.destinationBucket }, { headers: r2.headers }));
    }
    async copy(e2, t2, n2) {
      var r2 = this;
      return r2.handleOperation(async () => ({ path: (await A(r2.fetch, `${r2.url}/object/copy`, { bucketId: r2.bucketId, sourceKey: e2, destinationKey: t2, destinationBucket: n2?.destinationBucket }, { headers: r2.headers })).Key }));
    }
    async createSignedUrl(e2, t2, n2) {
      var r2 = this;
      return r2.handleOperation(async () => {
        let i2 = r2._getFinalPath(e2), a2 = typeof n2?.transform == `object` && n2.transform !== null && Object.keys(n2.transform).length > 0, o2 = await A(r2.fetch, `${r2.url}/object/sign/${i2}`, k({ expiresIn: t2 }, a2 ? { transform: n2.transform } : {}), { headers: r2.headers }), s2 = new URLSearchParams();
        n2?.download && s2.set(`download`, n2.download === true ? `` : n2.download), n2?.cacheNonce != null && s2.set(`cacheNonce`, String(n2.cacheNonce));
        let c2 = s2.toString();
        return { signedUrl: encodeURI(`${r2.url}${o2.signedURL}${c2 ? `&${c2}` : ``}`) };
      });
    }
    async createSignedUrls(e2, t2, n2) {
      var r2 = this;
      return r2.handleOperation(async () => {
        let i2 = await A(r2.fetch, `${r2.url}/object/sign/${r2.bucketId}`, { expiresIn: t2, paths: e2 }, { headers: r2.headers }), a2 = new URLSearchParams();
        n2?.download && a2.set(`download`, n2.download === true ? `` : n2.download), n2?.cacheNonce != null && a2.set(`cacheNonce`, String(n2.cacheNonce));
        let o2 = a2.toString();
        return i2.map((e3) => k(k({}, e3), {}, { signedUrl: e3.signedURL ? encodeURI(`${r2.url}${e3.signedURL}${o2 ? `&${o2}` : ``}`) : null }));
      });
    }
    download(e2, t2, n2) {
      let r2 = typeof t2?.transform == `object` && t2.transform !== null && Object.keys(t2.transform).length > 0 ? `render/image/authenticated` : `object`, i2 = new URLSearchParams();
      t2?.transform && this.applyTransformOptsToQuery(i2, t2.transform), t2?.cacheNonce != null && i2.set(`cacheNonce`, String(t2.cacheNonce));
      let a2 = i2.toString(), o2 = this._getFinalPath(e2);
      return new Vt(() => Nt(this.fetch, `${this.url}/${r2}/${o2}${a2 ? `?${a2}` : ``}`, { headers: this.headers, noResolveJson: true }, n2), this.shouldThrowOnError);
    }
    async info(e2) {
      var t2 = this;
      let n2 = t2._getFinalPath(e2);
      return t2.handleOperation(async () => Et(await Nt(t2.fetch, `${t2.url}/object/info/${n2}`, { headers: t2.headers })));
    }
    async exists(e2) {
      var t2 = this;
      let n2 = t2._getFinalPath(e2);
      try {
        return await Ft(t2.fetch, `${t2.url}/object/${n2}`, { headers: t2.headers }), { data: true, error: null };
      } catch (e3) {
        if (t2.shouldThrowOnError) throw e3;
        if (yt(e3)) {
          let t3 = e3 instanceof bt ? e3.status : e3 instanceof xt ? e3.originalError?.status : void 0;
          if (t3 !== void 0 && [400, 404].includes(t3)) return { data: false, error: e3 };
        }
        throw e3;
      }
    }
    getPublicUrl(e2, t2) {
      let n2 = this._getFinalPath(e2), r2 = new URLSearchParams();
      t2?.download && r2.set(`download`, t2.download === true ? `` : t2.download), t2?.transform && this.applyTransformOptsToQuery(r2, t2.transform), t2?.cacheNonce != null && r2.set(`cacheNonce`, String(t2.cacheNonce));
      let i2 = r2.toString(), a2 = typeof t2?.transform == `object` && t2.transform !== null && Object.keys(t2.transform).length > 0 ? `render/image` : `object`;
      return { data: { publicUrl: encodeURI(`${this.url}/${a2}/public/${n2}`) + (i2 ? `?${i2}` : ``) } };
    }
    async remove(e2) {
      var t2 = this;
      return t2.handleOperation(async () => await It(t2.fetch, `${t2.url}/object/${t2.bucketId}`, { prefixes: e2 }, { headers: t2.headers }));
    }
    async list(e2, t2, n2) {
      var r2 = this;
      return r2.handleOperation(async () => {
        let i2 = k(k(k({}, Ht), t2), {}, { prefix: e2 || `` });
        return await A(r2.fetch, `${r2.url}/object/list/${r2.bucketId}`, i2, { headers: r2.headers }, n2);
      });
    }
    async listV2(e2, t2) {
      var n2 = this;
      return n2.handleOperation(async () => {
        let r2 = k({}, e2);
        return await A(n2.fetch, `${n2.url}/object/list-v2/${n2.bucketId}`, r2, { headers: n2.headers }, t2);
      });
    }
    encodeMetadata(e2) {
      return JSON.stringify(e2);
    }
    toBase64(e2) {
      return typeof Buffer < `u` ? Buffer.from(e2).toString(`base64`) : btoa(e2);
    }
    _getFinalPath(e2) {
      return `${this.bucketId}/${e2.replace(/^\/+/, ``)}`;
    }
    _removeEmptyFolders(e2) {
      return e2.replace(/^\/|\/$/g, ``).replace(/\/+/g, `/`);
    }
    applyTransformOptsToQuery(e2, t2) {
      return t2.width && e2.set(`width`, t2.width.toString()), t2.height && e2.set(`height`, t2.height.toString()), t2.resize && e2.set(`resize`, t2.resize), t2.format && e2.set(`format`, t2.format), t2.quality && e2.set(`quality`, t2.quality.toString()), e2;
    }
  };
  let Gt = { "X-Client-Info": `storage-js/2.106.1` };
  var Kt = class extends Lt {
    constructor(e2, t2 = {}, n2, r2) {
      let i2 = new URL(e2);
      r2?.useNewHostname && /supabase\.(co|in|red)$/.test(i2.hostname) && !i2.hostname.includes(`storage.supabase.`) && (i2.hostname = i2.hostname.replace(`supabase.`, `storage.supabase.`));
      let a2 = i2.href.replace(/\/$/, ``), o2 = k(k({}, Gt), t2);
      super(a2, o2, n2, `storage`);
    }
    async listBuckets(e2) {
      var t2 = this;
      return t2.handleOperation(async () => {
        let n2 = t2.listBucketOptionsToQueryString(e2);
        return await Nt(t2.fetch, `${t2.url}/bucket${n2}`, { headers: t2.headers });
      });
    }
    async getBucket(e2) {
      var t2 = this;
      return t2.handleOperation(async () => await Nt(t2.fetch, `${t2.url}/bucket/${e2}`, { headers: t2.headers }));
    }
    async createBucket(e2, t2 = { public: false }) {
      var n2 = this;
      return n2.handleOperation(async () => await A(n2.fetch, `${n2.url}/bucket`, { id: e2, name: e2, type: t2.type, public: t2.public, file_size_limit: t2.fileSizeLimit, allowed_mime_types: t2.allowedMimeTypes }, { headers: n2.headers }));
    }
    async updateBucket(e2, t2) {
      var n2 = this;
      return n2.handleOperation(async () => await Pt(n2.fetch, `${n2.url}/bucket/${e2}`, { id: e2, name: e2, public: t2.public, file_size_limit: t2.fileSizeLimit, allowed_mime_types: t2.allowedMimeTypes }, { headers: n2.headers }));
    }
    async emptyBucket(e2) {
      var t2 = this;
      return t2.handleOperation(async () => await A(t2.fetch, `${t2.url}/bucket/${e2}/empty`, {}, { headers: t2.headers }));
    }
    async deleteBucket(e2) {
      var t2 = this;
      return t2.handleOperation(async () => await It(t2.fetch, `${t2.url}/bucket/${e2}`, {}, { headers: t2.headers }));
    }
    listBucketOptionsToQueryString(e2) {
      let t2 = {};
      return e2 && (`limit` in e2 && (t2.limit = String(e2.limit)), `offset` in e2 && (t2.offset = String(e2.offset)), e2.search && (t2.search = e2.search), e2.sortColumn && (t2.sortColumn = e2.sortColumn), e2.sortOrder && (t2.sortOrder = e2.sortOrder)), Object.keys(t2).length > 0 ? `?` + new URLSearchParams(t2).toString() : ``;
    }
  }, qt = class extends Lt {
    constructor(e2, t2 = {}, n2) {
      let r2 = e2.replace(/\/$/, ``), i2 = k(k({}, Gt), t2);
      super(r2, i2, n2, `storage`);
    }
    async createBucket(e2) {
      var t2 = this;
      return t2.handleOperation(async () => await A(t2.fetch, `${t2.url}/bucket`, { name: e2 }, { headers: t2.headers }));
    }
    async listBuckets(e2) {
      var t2 = this;
      return t2.handleOperation(async () => {
        let n2 = new URLSearchParams();
        e2?.limit !== void 0 && n2.set(`limit`, e2.limit.toString()), e2?.offset !== void 0 && n2.set(`offset`, e2.offset.toString()), e2?.sortColumn && n2.set(`sortColumn`, e2.sortColumn), e2?.sortOrder && n2.set(`sortOrder`, e2.sortOrder), e2?.search && n2.set(`search`, e2.search);
        let r2 = n2.toString(), i2 = r2 ? `${t2.url}/bucket?${r2}` : `${t2.url}/bucket`;
        return await Nt(t2.fetch, i2, { headers: t2.headers });
      });
    }
    async deleteBucket(e2) {
      var t2 = this;
      return t2.handleOperation(async () => await It(t2.fetch, `${t2.url}/bucket/${e2}`, {}, { headers: t2.headers }));
    }
    from(e2) {
      var t2 = this;
      if (!Dt(e2)) throw new vt(`Invalid bucket name: File, folder, and bucket names must follow AWS object key naming guidelines and should avoid the use of any other characters.`);
      let n2 = new ft({ baseUrl: this.url, catalogName: e2, auth: { type: `custom`, getHeaders: async () => t2.headers }, fetch: this.fetch }), r2 = this.shouldThrowOnError;
      return new Proxy(n2, { get(e3, t3) {
        let n3 = e3[t3];
        return typeof n3 == `function` ? async (...t4) => {
          try {
            return { data: await n3.apply(e3, t4), error: null };
          } catch (e4) {
            if (r2) throw e4;
            return { data: null, error: e4 };
          }
        } : n3;
      } });
    }
  }, Jt = class extends Lt {
    constructor(e2, t2 = {}, n2) {
      let r2 = e2.replace(/\/$/, ``), i2 = k(k({}, Gt), {}, { "Content-Type": `application/json` }, t2);
      super(r2, i2, n2, `vectors`);
    }
    async createIndex(e2) {
      var t2 = this;
      return t2.handleOperation(async () => await j.post(t2.fetch, `${t2.url}/CreateIndex`, e2, { headers: t2.headers }) || {});
    }
    async getIndex(e2, t2) {
      var n2 = this;
      return n2.handleOperation(async () => await j.post(n2.fetch, `${n2.url}/GetIndex`, { vectorBucketName: e2, indexName: t2 }, { headers: n2.headers }));
    }
    async listIndexes(e2) {
      var t2 = this;
      return t2.handleOperation(async () => await j.post(t2.fetch, `${t2.url}/ListIndexes`, e2, { headers: t2.headers }));
    }
    async deleteIndex(e2, t2) {
      var n2 = this;
      return n2.handleOperation(async () => await j.post(n2.fetch, `${n2.url}/DeleteIndex`, { vectorBucketName: e2, indexName: t2 }, { headers: n2.headers }) || {});
    }
  }, Yt = class extends Lt {
    constructor(e2, t2 = {}, n2) {
      let r2 = e2.replace(/\/$/, ``), i2 = k(k({}, Gt), {}, { "Content-Type": `application/json` }, t2);
      super(r2, i2, n2, `vectors`);
    }
    async putVectors(e2) {
      var t2 = this;
      if (e2.vectors.length < 1 || e2.vectors.length > 500) throw Error(`Vector batch size must be between 1 and 500 items`);
      return t2.handleOperation(async () => await j.post(t2.fetch, `${t2.url}/PutVectors`, e2, { headers: t2.headers }) || {});
    }
    async getVectors(e2) {
      var t2 = this;
      return t2.handleOperation(async () => await j.post(t2.fetch, `${t2.url}/GetVectors`, e2, { headers: t2.headers }));
    }
    async listVectors(e2) {
      var t2 = this;
      if (e2.segmentCount !== void 0) {
        if (e2.segmentCount < 1 || e2.segmentCount > 16) throw Error(`segmentCount must be between 1 and 16`);
        if (e2.segmentIndex !== void 0 && (e2.segmentIndex < 0 || e2.segmentIndex >= e2.segmentCount)) throw Error(`segmentIndex must be between 0 and ${e2.segmentCount - 1}`);
      }
      return t2.handleOperation(async () => await j.post(t2.fetch, `${t2.url}/ListVectors`, e2, { headers: t2.headers }));
    }
    async queryVectors(e2) {
      var t2 = this;
      return t2.handleOperation(async () => await j.post(t2.fetch, `${t2.url}/QueryVectors`, e2, { headers: t2.headers }));
    }
    async deleteVectors(e2) {
      var t2 = this;
      if (e2.keys.length < 1 || e2.keys.length > 500) throw Error(`Keys batch size must be between 1 and 500 items`);
      return t2.handleOperation(async () => await j.post(t2.fetch, `${t2.url}/DeleteVectors`, e2, { headers: t2.headers }) || {});
    }
  }, Xt = class extends Lt {
    constructor(e2, t2 = {}, n2) {
      let r2 = e2.replace(/\/$/, ``), i2 = k(k({}, Gt), {}, { "Content-Type": `application/json` }, t2);
      super(r2, i2, n2, `vectors`);
    }
    async createBucket(e2) {
      var t2 = this;
      return t2.handleOperation(async () => await j.post(t2.fetch, `${t2.url}/CreateVectorBucket`, { vectorBucketName: e2 }, { headers: t2.headers }) || {});
    }
    async getBucket(e2) {
      var t2 = this;
      return t2.handleOperation(async () => await j.post(t2.fetch, `${t2.url}/GetVectorBucket`, { vectorBucketName: e2 }, { headers: t2.headers }));
    }
    async listBuckets(e2 = {}) {
      var t2 = this;
      return t2.handleOperation(async () => await j.post(t2.fetch, `${t2.url}/ListVectorBuckets`, e2, { headers: t2.headers }));
    }
    async deleteBucket(e2) {
      var t2 = this;
      return t2.handleOperation(async () => await j.post(t2.fetch, `${t2.url}/DeleteVectorBucket`, { vectorBucketName: e2 }, { headers: t2.headers }) || {});
    }
  }, Zt = class extends Xt {
    constructor(e2, t2 = {}) {
      super(e2, t2.headers || {}, t2.fetch);
    }
    from(e2) {
      return new Qt(this.url, this.headers, e2, this.fetch);
    }
    async createBucket(e2) {
      var t2 = () => super.createBucket, n2 = this;
      return t2().call(n2, e2);
    }
    async getBucket(e2) {
      var t2 = () => super.getBucket, n2 = this;
      return t2().call(n2, e2);
    }
    async listBuckets(e2 = {}) {
      var t2 = () => super.listBuckets, n2 = this;
      return t2().call(n2, e2);
    }
    async deleteBucket(e2) {
      var t2 = () => super.deleteBucket, n2 = this;
      return t2().call(n2, e2);
    }
  }, Qt = class extends Jt {
    constructor(e2, t2, n2, r2) {
      super(e2, t2, r2), this.vectorBucketName = n2;
    }
    async createIndex(e2) {
      var t2 = () => super.createIndex, n2 = this;
      return t2().call(n2, k(k({}, e2), {}, { vectorBucketName: n2.vectorBucketName }));
    }
    async listIndexes(e2 = {}) {
      var t2 = () => super.listIndexes, n2 = this;
      return t2().call(n2, k(k({}, e2), {}, { vectorBucketName: n2.vectorBucketName }));
    }
    async getIndex(e2) {
      var t2 = () => super.getIndex, n2 = this;
      return t2().call(n2, n2.vectorBucketName, e2);
    }
    async deleteIndex(e2) {
      var t2 = () => super.deleteIndex, n2 = this;
      return t2().call(n2, n2.vectorBucketName, e2);
    }
    index(e2) {
      return new $t(this.url, this.headers, this.vectorBucketName, e2, this.fetch);
    }
  }, $t = class extends Yt {
    constructor(e2, t2, n2, r2, i2) {
      super(e2, t2, i2), this.vectorBucketName = n2, this.indexName = r2;
    }
    async putVectors(e2) {
      var t2 = () => super.putVectors, n2 = this;
      return t2().call(n2, k(k({}, e2), {}, { vectorBucketName: n2.vectorBucketName, indexName: n2.indexName }));
    }
    async getVectors(e2) {
      var t2 = () => super.getVectors, n2 = this;
      return t2().call(n2, k(k({}, e2), {}, { vectorBucketName: n2.vectorBucketName, indexName: n2.indexName }));
    }
    async listVectors(e2 = {}) {
      var t2 = () => super.listVectors, n2 = this;
      return t2().call(n2, k(k({}, e2), {}, { vectorBucketName: n2.vectorBucketName, indexName: n2.indexName }));
    }
    async queryVectors(e2) {
      var t2 = () => super.queryVectors, n2 = this;
      return t2().call(n2, k(k({}, e2), {}, { vectorBucketName: n2.vectorBucketName, indexName: n2.indexName }));
    }
    async deleteVectors(e2) {
      var t2 = () => super.deleteVectors, n2 = this;
      return t2().call(n2, k(k({}, e2), {}, { vectorBucketName: n2.vectorBucketName, indexName: n2.indexName }));
    }
  }, en = class extends Kt {
    constructor(e2, t2 = {}, n2, r2) {
      super(e2, t2, n2, r2);
    }
    from(e2) {
      return new Wt(this.url, this.headers, e2, this.fetch);
    }
    get vectors() {
      return new Zt(this.url + `/vector`, { headers: this.headers, fetch: this.fetch });
    }
    get analytics() {
      return new qt(this.url + `/iceberg`, this.headers, this.fetch);
    }
  };
  let tn = ``;
  tn = typeof Deno < `u` ? `deno` : typeof document < `u` ? `web` : typeof navigator < `u` && navigator.product === `ReactNative` ? `react-native` : `node`;
  let nn = { headers: { "X-Client-Info": `supabase-js-${tn}/2.106.1` } }, rn = { schema: `public` }, an = { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, flowType: `implicit` }, on = {}, sn = { enabled: false, respectSamplingDecision: true }, cn = null;
  function ln() {
    return cn === null && (cn = import("@opentelemetry/api").catch(() => null)), cn;
  }
  function un() {
    return n(this, void 0, void 0, function* () {
      try {
        let e2 = yield ln();
        if (!e2 || !e2.propagation || !e2.context) return null;
        let t2 = {};
        e2.propagation.inject(e2.context.active(), t2);
        let n2 = t2.traceparent;
        return n2 ? { traceparent: n2, tracestate: t2.tracestate, baggage: t2.baggage } : null;
      } catch {
        return null;
      }
    });
  }
  function dn(e2) {
    if (!e2 || typeof e2 != `string`) return null;
    let t2 = e2.split(`-`);
    if (t2.length !== 4) return null;
    let [n2, r2, i2, a2] = t2;
    if (n2.length !== 2 || r2.length !== 32 || i2.length !== 16 || a2.length !== 2) return null;
    let o2 = /^[0-9a-f]+$/i;
    return !o2.test(n2) || !o2.test(r2) || !o2.test(i2) || !o2.test(a2) || r2 === `00000000000000000000000000000000` || i2 === `0000000000000000` ? null : { version: n2, traceId: r2, parentId: i2, traceFlags: a2, isSampled: (parseInt(a2, 16) & 1) == 1 };
  }
  function fn(e2, t2) {
    if (!e2 || !t2 || t2.length === 0) return false;
    let n2;
    if (e2 instanceof URL) n2 = e2;
    else try {
      n2 = new URL(e2);
    } catch {
      return false;
    }
    for (let e3 of t2) try {
      if (typeof e3 == `string`) {
        if (pn(n2.hostname, e3)) return true;
      } else if (e3 instanceof RegExp) {
        if (e3.test(n2.hostname)) return true;
      } else if (typeof e3 == `function` && e3(n2)) return true;
    } catch {
      continue;
    }
    return false;
  }
  function pn(e2, t2) {
    if (t2 === e2) return true;
    if (t2.startsWith(`*.`)) {
      let n2 = t2.slice(2);
      if (e2.endsWith(n2) && (e2 === n2 || e2.endsWith(`.` + n2))) return true;
    }
    return false;
  }
  function mn(e2) {
    let t2 = [];
    try {
      let n2 = new URL(e2);
      t2.push(n2.hostname);
    } catch {
    }
    return t2.push(`*.supabase.co`, `*.supabase.in`), t2.push(`localhost`, `127.0.0.1`, `[::1]`), t2;
  }
  let hn = (e2) => e2 ? (...t2) => e2(...t2) : (...e3) => fetch(...e3), gn = () => Headers, _n = (e2, t2, n2, r2, i2) => {
    let a2 = hn(r2), o2 = gn(), s2 = i2?.enabled === true, c2 = i2?.respectSamplingDecision !== false, l2 = s2 ? mn(t2) : null;
    return async (t3, r3) => {
      let i3 = await n2() ?? e2, s3 = new o2(r3?.headers);
      if (s3.has(`apikey`) || s3.set(`apikey`, e2), s3.has(`Authorization`) || s3.set(`Authorization`, `Bearer ${i3}`), l2) {
        let e3 = await vn(t3, l2, c2);
        e3 && (e3.traceparent && !s3.has(`traceparent`) && s3.set(`traceparent`, e3.traceparent), e3.tracestate && !s3.has(`tracestate`) && s3.set(`tracestate`, e3.tracestate), e3.baggage && !s3.has(`baggage`) && s3.set(`baggage`, e3.baggage));
      }
      return a2(t3, { ...r3, headers: s3 });
    };
  };
  async function vn(e2, t2, n2) {
    if (!fn(typeof e2 == `string` || e2 instanceof URL ? e2 : e2.url, t2)) return null;
    let r2 = await un();
    if (!r2 || !r2.traceparent) return null;
    if (n2) {
      let e3 = dn(r2.traceparent);
      if (e3 && !e3.isSampled) return null;
    }
    return r2;
  }
  function yn(e2) {
    return typeof e2 == `boolean` ? { enabled: e2 } : e2;
  }
  function bn(e2) {
    return e2.endsWith(`/`) ? e2 : e2 + `/`;
  }
  function xn(e2, t2) {
    let { db: n2, auth: r2, realtime: i2, global: a2 } = e2, { db: o2, auth: s2, realtime: c2, global: l2 } = t2, u2 = yn(e2.tracePropagation), d2 = yn(t2.tracePropagation), f2 = { db: { ...o2, ...n2 }, auth: { ...s2, ...r2 }, realtime: { ...c2, ...i2 }, storage: {}, global: { ...l2, ...a2, headers: { ...l2?.headers ?? {}, ...a2?.headers ?? {} } }, tracePropagation: { enabled: u2?.enabled ?? d2?.enabled ?? false, respectSamplingDecision: u2?.respectSamplingDecision ?? d2?.respectSamplingDecision ?? true }, accessToken: async () => `` };
    return e2.accessToken ? f2.accessToken = e2.accessToken : delete f2.accessToken, f2;
  }
  function Sn(e2) {
    let t2 = e2?.trim();
    if (!t2) throw Error(`supabaseUrl is required.`);
    if (!t2.match(/^https?:\/\//i)) throw Error(`Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.`);
    try {
      return new URL(bn(t2));
    } catch {
      throw Error(`Invalid supabaseUrl: Provided URL is malformed.`);
    }
  }
  let Cn = `2.106.1`, wn = 30 * 1e3, Tn = 3 * wn, En = { "X-Client-Info": `gotrue-js/${Cn}` }, Dn = `X-Supabase-Api-Version`, On = { "2024-01-01": { timestamp: Date.parse(`2024-01-01T00:00:00.0Z`), name: `2024-01-01` } }, kn = /^([a-z0-9_-]{4})*($|[a-z0-9_-]{3}$|[a-z0-9_-]{2}$)$/i;
  var M = class extends Error {
    constructor(e2, t2, n2) {
      super(e2), this.__isAuthError = true, this.name = `AuthError`, this.status = t2, this.code = n2;
    }
    toJSON() {
      return { name: this.name, message: this.message, status: this.status, code: this.code };
    }
  };
  function N(e2) {
    return typeof e2 == `object` && !!e2 && `__isAuthError` in e2;
  }
  var An = class extends M {
    constructor(e2, t2, n2) {
      super(e2, t2, n2), this.name = `AuthApiError`, this.status = t2, this.code = n2;
    }
  };
  function jn(e2) {
    return N(e2) && e2.name === `AuthApiError`;
  }
  var P = class extends M {
    constructor(e2, t2) {
      super(e2), this.name = `AuthUnknownError`, this.originalError = t2;
    }
  }, F = class extends M {
    constructor(e2, t2, n2, r2) {
      super(e2, n2, r2), this.name = t2, this.status = n2;
    }
  }, I = class extends F {
    constructor() {
      super(`Auth session missing!`, `AuthSessionMissingError`, 400, void 0);
    }
  };
  function Mn(e2) {
    return N(e2) && e2.name === `AuthSessionMissingError`;
  }
  var L = class extends F {
    constructor() {
      super(`Auth session or user missing`, `AuthInvalidTokenResponseError`, 500, void 0);
    }
  }, Nn = class extends F {
    constructor(e2) {
      super(e2, `AuthInvalidCredentialsError`, 400, void 0);
    }
  }, Pn = class extends F {
    constructor(e2, t2 = null) {
      super(e2, `AuthImplicitGrantRedirectError`, 500, void 0), this.details = null, this.details = t2;
    }
    toJSON() {
      return Object.assign(Object.assign({}, super.toJSON()), { details: this.details });
    }
  };
  function Fn(e2) {
    return N(e2) && e2.name === `AuthImplicitGrantRedirectError`;
  }
  var In = class extends F {
    constructor(e2, t2 = null) {
      super(e2, `AuthPKCEGrantCodeExchangeError`, 500, void 0), this.details = null, this.details = t2;
    }
    toJSON() {
      return Object.assign(Object.assign({}, super.toJSON()), { details: this.details });
    }
  }, Ln = class extends F {
    constructor() {
      super(`PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device, or if the storage was cleared. For SSR frameworks (Next.js, SvelteKit, etc.), use @supabase/ssr on both the server and client to store the code verifier in cookies.`, `AuthPKCECodeVerifierMissingError`, 400, `pkce_code_verifier_not_found`);
    }
  };
  function Rn(e2) {
    return N(e2) && e2.name === `AuthPKCECodeVerifierMissingError`;
  }
  var zn = class extends F {
    constructor(e2, t2) {
      super(e2, `AuthRetryableFetchError`, t2, void 0);
    }
  };
  function Bn(e2) {
    return N(e2) && e2.name === `AuthRetryableFetchError`;
  }
  var Vn = class extends F {
    constructor(e2, t2, n2) {
      super(e2, `AuthWeakPasswordError`, t2, `weak_password`), this.reasons = n2;
    }
    toJSON() {
      return Object.assign(Object.assign({}, super.toJSON()), { reasons: this.reasons });
    }
  };
  function Hn(e2) {
    return N(e2) && e2.name === `AuthWeakPasswordError`;
  }
  var Un = class extends F {
    constructor(e2) {
      super(e2, `AuthInvalidJwtError`, 400, `invalid_jwt`);
    }
  };
  let Wn = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_`.split(``), Gn = ` 	
\r=`.split(``), Kn = (() => {
    let e2 = Array(128);
    for (let t2 = 0; t2 < e2.length; t2 += 1) e2[t2] = -1;
    for (let t2 = 0; t2 < Gn.length; t2 += 1) e2[Gn[t2].charCodeAt(0)] = -2;
    for (let t2 = 0; t2 < Wn.length; t2 += 1) e2[Wn[t2].charCodeAt(0)] = t2;
    return e2;
  })();
  function qn(e2, t2, n2) {
    if (e2 !== null) for (t2.queue = t2.queue << 8 | e2, t2.queuedBits += 8; t2.queuedBits >= 6; ) n2(Wn[t2.queue >> t2.queuedBits - 6 & 63]), t2.queuedBits -= 6;
    else if (t2.queuedBits > 0) for (t2.queue <<= 6 - t2.queuedBits, t2.queuedBits = 6; t2.queuedBits >= 6; ) n2(Wn[t2.queue >> t2.queuedBits - 6 & 63]), t2.queuedBits -= 6;
  }
  function Jn(e2, t2, n2) {
    let r2 = Kn[e2];
    if (r2 > -1) for (t2.queue = t2.queue << 6 | r2, t2.queuedBits += 6; t2.queuedBits >= 8; ) n2(t2.queue >> t2.queuedBits - 8 & 255), t2.queuedBits -= 8;
    else if (r2 === -2) return;
    else throw Error(`Invalid Base64-URL character "${String.fromCharCode(e2)}"`);
  }
  function Yn(e2) {
    let t2 = [], n2 = (e3) => {
      t2.push(String.fromCodePoint(e3));
    }, r2 = { utf8seq: 0, codepoint: 0 }, i2 = { queue: 0, queuedBits: 0 }, a2 = (e3) => {
      Qn(e3, r2, n2);
    };
    for (let t3 = 0; t3 < e2.length; t3 += 1) Jn(e2.charCodeAt(t3), i2, a2);
    return t2.join(``);
  }
  function Xn(e2, t2) {
    if (e2 <= 127) {
      t2(e2);
      return;
    } else if (e2 <= 2047) {
      t2(192 | e2 >> 6), t2(128 | e2 & 63);
      return;
    } else if (e2 <= 65535) {
      t2(224 | e2 >> 12), t2(128 | e2 >> 6 & 63), t2(128 | e2 & 63);
      return;
    } else if (e2 <= 1114111) {
      t2(240 | e2 >> 18), t2(128 | e2 >> 12 & 63), t2(128 | e2 >> 6 & 63), t2(128 | e2 & 63);
      return;
    }
    throw Error(`Unrecognized Unicode codepoint: ${e2.toString(16)}`);
  }
  function Zn(e2, t2) {
    for (let n2 = 0; n2 < e2.length; n2 += 1) {
      let r2 = e2.charCodeAt(n2);
      if (r2 > 55295 && r2 <= 56319) {
        let t3 = (r2 - 55296) * 1024 & 65535;
        r2 = (e2.charCodeAt(n2 + 1) - 56320 & 65535 | t3) + 65536, n2 += 1;
      }
      Xn(r2, t2);
    }
  }
  function Qn(e2, t2, n2) {
    if (t2.utf8seq === 0) {
      if (e2 <= 127) {
        n2(e2);
        return;
      }
      for (let n3 = 1; n3 < 6; n3 += 1) if (!(e2 >> 7 - n3 & 1)) {
        t2.utf8seq = n3;
        break;
      }
      if (t2.utf8seq === 2) t2.codepoint = e2 & 31;
      else if (t2.utf8seq === 3) t2.codepoint = e2 & 15;
      else if (t2.utf8seq === 4) t2.codepoint = e2 & 7;
      else throw Error(`Invalid UTF-8 sequence`);
      --t2.utf8seq;
    } else if (t2.utf8seq > 0) {
      if (e2 <= 127) throw Error(`Invalid UTF-8 sequence`);
      t2.codepoint = t2.codepoint << 6 | e2 & 63, --t2.utf8seq, t2.utf8seq === 0 && n2(t2.codepoint);
    }
  }
  function R(e2) {
    let t2 = [], n2 = { queue: 0, queuedBits: 0 }, r2 = (e3) => {
      t2.push(e3);
    };
    for (let t3 = 0; t3 < e2.length; t3 += 1) Jn(e2.charCodeAt(t3), n2, r2);
    return new Uint8Array(t2);
  }
  function $n(e2) {
    let t2 = [];
    return Zn(e2, (e3) => t2.push(e3)), new Uint8Array(t2);
  }
  function z(e2) {
    let t2 = [], n2 = { queue: 0, queuedBits: 0 }, r2 = (e3) => {
      t2.push(e3);
    };
    return e2.forEach((e3) => qn(e3, n2, r2)), qn(null, n2, r2), t2.join(``);
  }
  function er(e2) {
    return Math.round(Date.now() / 1e3) + e2;
  }
  function tr() {
    return /* @__PURE__ */ Symbol(`auth-callback`);
  }
  let B = () => typeof window < `u` && typeof document < `u`, V = { tested: false, writable: false }, nr = () => {
    if (!B()) return false;
    try {
      if (typeof globalThis.localStorage != `object`) return false;
    } catch {
      return false;
    }
    if (V.tested) return V.writable;
    let e2 = `lswt-${Math.random()}${Math.random()}`;
    try {
      globalThis.localStorage.setItem(e2, e2), globalThis.localStorage.removeItem(e2), V.tested = true, V.writable = true;
    } catch {
      V.tested = true, V.writable = false;
    }
    return V.writable;
  };
  function rr(e2) {
    let t2 = {}, n2 = new URL(e2);
    if (n2.hash && n2.hash[0] === `#`) try {
      new URLSearchParams(n2.hash.substring(1)).forEach((e3, n3) => {
        t2[n3] = e3;
      });
    } catch {
    }
    return n2.searchParams.forEach((e3, n3) => {
      t2[n3] = e3;
    }), t2;
  }
  let ir = (e2) => e2 ? (...t2) => e2(...t2) : (...e3) => fetch(...e3), ar = (e2) => typeof e2 == `object` && !!e2 && `status` in e2 && `ok` in e2 && `json` in e2 && typeof e2.json == `function`, H = async (e2, t2, n2) => {
    await e2.setItem(t2, JSON.stringify(n2));
  }, U = async (e2, t2) => {
    let n2 = await e2.getItem(t2);
    if (!n2) return null;
    try {
      return JSON.parse(n2);
    } catch {
      return null;
    }
  }, W = async (e2, t2) => {
    await e2.removeItem(t2);
  };
  var or = class e2 {
    constructor() {
      this.promise = new e2.promiseConstructor((e3, t2) => {
        this.resolve = e3, this.reject = t2;
      });
    }
  };
  or.promiseConstructor = Promise;
  function sr(e2) {
    let t2 = e2.split(`.`);
    if (t2.length !== 3) throw new Un(`Invalid JWT structure`);
    for (let e3 = 0; e3 < t2.length; e3++) if (!kn.test(t2[e3])) throw new Un(`JWT not in base64url format`);
    return { header: JSON.parse(Yn(t2[0])), payload: JSON.parse(Yn(t2[1])), signature: R(t2[2]), raw: { header: t2[0], payload: t2[1] } };
  }
  async function cr(e2) {
    return await new Promise((t2) => {
      setTimeout(() => t2(null), e2);
    });
  }
  function lr(e2, t2) {
    return new Promise((n2, r2) => {
      (async () => {
        for (let i2 = 0; i2 < 1 / 0; i2++) try {
          let r3 = await e2(i2);
          if (!t2(i2, null, r3)) {
            n2(r3);
            return;
          }
        } catch (e3) {
          if (!t2(i2, e3)) {
            r2(e3);
            return;
          }
        }
      })();
    });
  }
  function ur(e2) {
    return (`0` + e2.toString(16)).substr(-2);
  }
  function dr() {
    let e2 = new Uint32Array(56);
    if (typeof crypto > `u`) {
      let e3 = ``;
      for (let t2 = 0; t2 < 56; t2++) e3 += `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~`.charAt(Math.floor(Math.random() * 66));
      return e3;
    }
    return crypto.getRandomValues(e2), Array.from(e2, ur).join(``);
  }
  async function fr(e2) {
    let t2 = new TextEncoder().encode(e2), n2 = await crypto.subtle.digest(`SHA-256`, t2), r2 = new Uint8Array(n2);
    return Array.from(r2).map((e3) => String.fromCharCode(e3)).join(``);
  }
  async function pr(e2) {
    if (!(typeof crypto < `u` && crypto.subtle !== void 0 && typeof TextEncoder < `u`)) return console.warn(`WebCrypto API is not supported. Code challenge method will default to use plain instead of sha256.`), e2;
    let t2 = await fr(e2);
    return btoa(t2).replace(/\+/g, `-`).replace(/\//g, `_`).replace(/=+$/, ``);
  }
  async function G(e2, t2, n2 = false) {
    let r2 = dr(), i2 = r2;
    n2 && (i2 += `/recovery`), await H(e2, `${t2}-code-verifier`, i2);
    let a2 = await pr(r2);
    return [a2, r2 === a2 ? `plain` : `s256`];
  }
  let mr = /^2[0-9]{3}-(0[1-9]|1[0-2])-(0[1-9]|1[0-9]|2[0-9]|3[0-1])$/i;
  function hr(e2) {
    let t2 = e2.headers.get(Dn);
    if (!t2 || !t2.match(mr)) return null;
    try {
      return /* @__PURE__ */ new Date(`${t2}T00:00:00.0Z`);
    } catch {
      return null;
    }
  }
  function gr(e2) {
    if (!e2) throw Error(`Missing exp claim`);
    if (e2 <= Math.floor(Date.now() / 1e3)) throw Error(`JWT has expired`);
  }
  function _r(e2) {
    switch (e2) {
      case `RS256`:
        return { name: `RSASSA-PKCS1-v1_5`, hash: { name: `SHA-256` } };
      case `ES256`:
        return { name: `ECDSA`, namedCurve: `P-256`, hash: { name: `SHA-256` } };
      default:
        throw Error(`Invalid alg claim`);
    }
  }
  let vr = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  function K(e2) {
    if (!vr.test(e2)) throw Error(`@supabase/auth-js: Expected parameter to be UUID but is not`);
  }
  function q(e2) {
    if (!e2.passkey) throw Error("@supabase/auth-js: the passkey API is experimental and disabled by default. Enable it by passing `auth: { experimental: { passkey: true } }` to createClient (or to the GoTrueClient constructor).");
  }
  function yr() {
    return new Proxy({}, { get: (e2, t2) => {
      if (t2 === `__isUserNotAvailableProxy`) return true;
      if (typeof t2 == `symbol`) {
        let e3 = t2.toString();
        if (e3 === `Symbol(Symbol.toPrimitive)` || e3 === `Symbol(Symbol.toStringTag)` || e3 === `Symbol(util.inspect.custom)`) return;
      }
      throw Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Accessing the "${t2}" property of the session object is not supported. Please use getUser() instead.`);
    }, set: (e2, t2) => {
      throw Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Setting the "${t2}" property of the session object is not supported. Please use getUser() to fetch a user object you can manipulate.`);
    }, deleteProperty: (e2, t2) => {
      throw Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Deleting the "${t2}" property of the session object is not supported. Please use getUser() to fetch a user object you can manipulate.`);
    } });
  }
  function br(e2, t2) {
    return new Proxy(e2, { get: (e3, n2, r2) => {
      if (n2 === `__isInsecureUserWarningProxy`) return true;
      if (typeof n2 == `symbol`) {
        let t3 = n2.toString();
        if (t3 === `Symbol(Symbol.toPrimitive)` || t3 === `Symbol(Symbol.toStringTag)` || t3 === `Symbol(util.inspect.custom)` || t3 === `Symbol(nodejs.util.inspect.custom)`) return Reflect.get(e3, n2, r2);
      }
      return !t2.value && typeof n2 == `string` && (console.warn(`Using the user object as returned from supabase.auth.getSession() or from some supabase.auth.onAuthStateChange() events could be insecure! This value comes directly from the storage medium (usually cookies on the server) and may not be authentic. Use supabase.auth.getUser() instead which authenticates the data by contacting the Supabase Auth server.`), t2.value = true), Reflect.get(e3, n2, r2);
    } });
  }
  function xr(e2) {
    return JSON.parse(JSON.stringify(e2));
  }
  let J = (e2) => {
    if (typeof e2 == `object` && e2) {
      let t2 = e2;
      if (typeof t2.msg == `string`) return t2.msg;
      if (typeof t2.message == `string`) return t2.message;
      if (typeof t2.error_description == `string`) return t2.error_description;
      if (typeof t2.error == `string`) return t2.error;
    }
    return JSON.stringify(e2);
  }, Sr = [502, 503, 504, 520, 521, 522, 523, 524, 530];
  async function Cr(e2) {
    if (!ar(e2)) throw new zn(J(e2), 0);
    if (Sr.includes(e2.status)) throw new zn(J(e2), e2.status);
    let t2;
    try {
      t2 = await e2.json();
    } catch (e3) {
      throw new P(J(e3), e3);
    }
    let n2, r2 = hr(e2);
    if (r2 && r2.getTime() >= On[`2024-01-01`].timestamp && typeof t2 == `object` && t2 && typeof t2.code == `string` ? n2 = t2.code : typeof t2 == `object` && t2 && typeof t2.error_code == `string` && (n2 = t2.error_code), n2) {
      if (n2 === `weak_password`) throw new Vn(J(t2), e2.status, t2.weak_password?.reasons || []);
      if (n2 === `session_not_found`) throw new I();
    } else if (typeof t2 == `object` && t2 && typeof t2.weak_password == `object` && t2.weak_password && Array.isArray(t2.weak_password.reasons) && t2.weak_password.reasons.length && t2.weak_password.reasons.reduce((e3, t3) => e3 && typeof t3 == `string`, true)) throw new Vn(J(t2), e2.status, t2.weak_password.reasons);
    throw new An(J(t2), e2.status || 500, n2);
  }
  let wr = (e2, t2, n2, r2) => {
    let i2 = { method: e2, headers: t2?.headers || {} };
    return e2 === `GET` ? i2 : (i2.headers = Object.assign({ "Content-Type": `application/json;charset=UTF-8` }, t2?.headers), i2.body = JSON.stringify(r2), Object.assign(Object.assign({}, i2), n2));
  };
  async function Y(e2, t2, n2, r2) {
    let i2 = Object.assign({}, r2?.headers);
    i2[Dn] || (i2[Dn] = On[`2024-01-01`].name), r2?.jwt && (i2.Authorization = `Bearer ${r2.jwt}`);
    let a2 = r2?.query ?? {};
    r2?.redirectTo && (a2.redirect_to = r2.redirectTo);
    let o2 = await Tr(e2, t2, n2 + (Object.keys(a2).length ? `?` + new URLSearchParams(a2).toString() : ``), { headers: i2, noResolveJson: r2?.noResolveJson }, {}, r2?.body);
    return r2?.xform ? r2?.xform(o2) : { data: Object.assign({}, o2), error: null };
  }
  async function Tr(e2, t2, n2, r2, i2, a2) {
    let o2 = wr(t2, r2, i2, a2), s2;
    try {
      s2 = await e2(n2, Object.assign({}, o2));
    } catch (e3) {
      throw console.error(e3), new zn(J(e3), 0);
    }
    if (s2.ok || await Cr(s2), r2?.noResolveJson) return s2;
    try {
      return await s2.json();
    } catch (e3) {
      await Cr(e3);
    }
  }
  function X(e2) {
    let t2 = null;
    Ar(e2) && (t2 = Object.assign({}, e2), e2.expires_at || (t2.expires_at = er(e2.expires_in)));
    let n2 = e2.user ?? null;
    return { data: { session: t2, user: n2 }, error: null };
  }
  function Er(e2) {
    let t2 = X(e2);
    return !t2.error && e2.weak_password && typeof e2.weak_password == `object` && Array.isArray(e2.weak_password.reasons) && e2.weak_password.reasons.length && e2.weak_password.message && typeof e2.weak_password.message == `string` && e2.weak_password.reasons.reduce((e3, t3) => e3 && typeof t3 == `string`, true) && (t2.data.weak_password = e2.weak_password), t2;
  }
  function Z(e2) {
    return { data: { user: e2.user ?? e2 }, error: null };
  }
  function Dr(e2) {
    return { data: e2, error: null };
  }
  function Or(e2) {
    let { action_link: n2, email_otp: r2, hashed_token: i2, redirect_to: a2, verification_type: o2 } = e2, s2 = t(e2, [`action_link`, `email_otp`, `hashed_token`, `redirect_to`, `verification_type`]);
    return { data: { properties: { action_link: n2, email_otp: r2, hashed_token: i2, redirect_to: a2, verification_type: o2 }, user: Object.assign({}, s2) }, error: null };
  }
  function kr(e2) {
    return e2;
  }
  function Ar(e2) {
    return !!e2.access_token && !!e2.refresh_token && !!e2.expires_in;
  }
  let jr = [`global`, `local`, `others`];
  var Mr = class {
    _encodePathSegment(e2) {
      if (e2 === `.` || e2 === `..`) throw new M(`Invalid path segment`);
      return encodeURIComponent(e2);
    }
    constructor({ url: e2 = ``, headers: t2 = {}, fetch: n2, experimental: r2 }) {
      this.url = e2, this.headers = t2, this.fetch = ir(n2), this.experimental = r2 ?? {}, this.mfa = { listFactors: this._listFactors.bind(this), deleteFactor: this._deleteFactor.bind(this) }, this.oauth = { listClients: this._listOAuthClients.bind(this), createClient: this._createOAuthClient.bind(this), getClient: this._getOAuthClient.bind(this), updateClient: this._updateOAuthClient.bind(this), deleteClient: this._deleteOAuthClient.bind(this), regenerateClientSecret: this._regenerateOAuthClientSecret.bind(this) }, this.customProviders = { listProviders: this._listCustomProviders.bind(this), createProvider: this._createCustomProvider.bind(this), getProvider: this._getCustomProvider.bind(this), updateProvider: this._updateCustomProvider.bind(this), deleteProvider: this._deleteCustomProvider.bind(this) }, this.passkey = { listPasskeys: this._adminListPasskeys.bind(this), deletePasskey: this._adminDeletePasskey.bind(this) };
    }
    async signOut(e2, t2 = jr[0]) {
      if (jr.indexOf(t2) < 0) throw Error(`@supabase/auth-js: Parameter scope must be one of ${jr.join(`, `)}`);
      try {
        return await Y(this.fetch, `POST`, `${this.url}/logout?scope=${t2}`, { headers: this.headers, jwt: e2, noResolveJson: true }), { data: null, error: null };
      } catch (e3) {
        if (N(e3)) return { data: null, error: e3 };
        throw e3;
      }
    }
    async inviteUserByEmail(e2, t2 = {}) {
      try {
        return await Y(this.fetch, `POST`, `${this.url}/invite`, { body: { email: e2, data: t2.data }, headers: this.headers, redirectTo: t2.redirectTo, xform: Z });
      } catch (e3) {
        if (N(e3)) return { data: { user: null }, error: e3 };
        throw e3;
      }
    }
    async generateLink(e2) {
      try {
        let { options: n2 } = e2, r2 = t(e2, [`options`]), i2 = Object.assign(Object.assign({}, r2), n2);
        return `newEmail` in r2 && (i2.new_email = r2?.newEmail, delete i2.newEmail), await Y(this.fetch, `POST`, `${this.url}/admin/generate_link`, { body: i2, headers: this.headers, xform: Or, redirectTo: n2?.redirectTo });
      } catch (e3) {
        if (N(e3)) return { data: { properties: null, user: null }, error: e3 };
        throw e3;
      }
    }
    async createUser(e2) {
      try {
        return await Y(this.fetch, `POST`, `${this.url}/admin/users`, { body: e2, headers: this.headers, xform: Z });
      } catch (e3) {
        if (N(e3)) return { data: { user: null }, error: e3 };
        throw e3;
      }
    }
    async listUsers(e2) {
      try {
        let t2 = { nextPage: null, lastPage: 0, total: 0 }, n2 = await Y(this.fetch, `GET`, `${this.url}/admin/users`, { headers: this.headers, noResolveJson: true, query: { page: e2?.page?.toString() ?? ``, per_page: e2?.perPage?.toString() ?? `` }, xform: kr });
        if (n2.error) throw n2.error;
        let r2 = await n2.json(), i2 = n2.headers.get(`x-total-count`) ?? 0, a2 = n2.headers.get(`link`)?.split(`,`) ?? [];
        return a2.length > 0 && (a2.forEach((e3) => {
          let n3 = parseInt(e3.split(`;`)[0].split(`=`)[1].substring(0, 1)), r3 = JSON.parse(e3.split(`;`)[1].split(`=`)[1]);
          t2[`${r3}Page`] = n3;
        }), t2.total = parseInt(i2)), { data: Object.assign(Object.assign({}, r2), t2), error: null };
      } catch (e3) {
        if (N(e3)) return { data: { users: [] }, error: e3 };
        throw e3;
      }
    }
    async getUserById(e2) {
      K(e2);
      try {
        return await Y(this.fetch, `GET`, `${this.url}/admin/users/${e2}`, { headers: this.headers, xform: Z });
      } catch (e3) {
        if (N(e3)) return { data: { user: null }, error: e3 };
        throw e3;
      }
    }
    async updateUserById(e2, t2) {
      K(e2);
      try {
        return await Y(this.fetch, `PUT`, `${this.url}/admin/users/${e2}`, { body: t2, headers: this.headers, xform: Z });
      } catch (e3) {
        if (N(e3)) return { data: { user: null }, error: e3 };
        throw e3;
      }
    }
    async deleteUser(e2, t2 = false) {
      K(e2);
      try {
        return await Y(this.fetch, `DELETE`, `${this.url}/admin/users/${e2}`, { headers: this.headers, body: { should_soft_delete: t2 }, xform: Z });
      } catch (e3) {
        if (N(e3)) return { data: { user: null }, error: e3 };
        throw e3;
      }
    }
    async _listFactors(e2) {
      K(e2.userId);
      try {
        let { data: t2, error: n2 } = await Y(this.fetch, `GET`, `${this.url}/admin/users/${e2.userId}/factors`, { headers: this.headers, xform: (e3) => ({ data: { factors: e3 }, error: null }) });
        return { data: t2, error: n2 };
      } catch (e3) {
        if (N(e3)) return { data: null, error: e3 };
        throw e3;
      }
    }
    async _deleteFactor(e2) {
      K(e2.userId), K(e2.id);
      try {
        return { data: await Y(this.fetch, `DELETE`, `${this.url}/admin/users/${e2.userId}/factors/${e2.id}`, { headers: this.headers }), error: null };
      } catch (e3) {
        if (N(e3)) return { data: null, error: e3 };
        throw e3;
      }
    }
    async _listOAuthClients(e2) {
      try {
        let t2 = { nextPage: null, lastPage: 0, total: 0 }, n2 = await Y(this.fetch, `GET`, `${this.url}/admin/oauth/clients`, { headers: this.headers, noResolveJson: true, query: { page: e2?.page?.toString() ?? ``, per_page: e2?.perPage?.toString() ?? `` }, xform: kr });
        if (n2.error) throw n2.error;
        let r2 = await n2.json(), i2 = n2.headers.get(`x-total-count`) ?? 0, a2 = n2.headers.get(`link`)?.split(`,`) ?? [];
        return a2.length > 0 && (a2.forEach((e3) => {
          let n3 = parseInt(e3.split(`;`)[0].split(`=`)[1].substring(0, 1)), r3 = JSON.parse(e3.split(`;`)[1].split(`=`)[1]);
          t2[`${r3}Page`] = n3;
        }), t2.total = parseInt(i2)), { data: Object.assign(Object.assign({}, r2), t2), error: null };
      } catch (e3) {
        if (N(e3)) return { data: { clients: [] }, error: e3 };
        throw e3;
      }
    }
    async _createOAuthClient(e2) {
      try {
        return await Y(this.fetch, `POST`, `${this.url}/admin/oauth/clients`, { body: e2, headers: this.headers, xform: (e3) => ({ data: e3, error: null }) });
      } catch (e3) {
        if (N(e3)) return { data: null, error: e3 };
        throw e3;
      }
    }
    async _getOAuthClient(e2) {
      try {
        let t2 = this._encodePathSegment(e2);
        return await Y(this.fetch, `GET`, `${this.url}/admin/oauth/clients/${t2}`, { headers: this.headers, xform: (e3) => ({ data: e3, error: null }) });
      } catch (e3) {
        if (N(e3)) return { data: null, error: e3 };
        throw e3;
      }
    }
    async _updateOAuthClient(e2, t2) {
      try {
        let n2 = this._encodePathSegment(e2);
        return await Y(this.fetch, `PUT`, `${this.url}/admin/oauth/clients/${n2}`, { body: t2, headers: this.headers, xform: (e3) => ({ data: e3, error: null }) });
      } catch (e3) {
        if (N(e3)) return { data: null, error: e3 };
        throw e3;
      }
    }
    async _deleteOAuthClient(e2) {
      try {
        let t2 = this._encodePathSegment(e2);
        return await Y(this.fetch, `DELETE`, `${this.url}/admin/oauth/clients/${t2}`, { headers: this.headers, noResolveJson: true }), { data: null, error: null };
      } catch (e3) {
        if (N(e3)) return { data: null, error: e3 };
        throw e3;
      }
    }
    async _regenerateOAuthClientSecret(e2) {
      try {
        let t2 = this._encodePathSegment(e2);
        return await Y(this.fetch, `POST`, `${this.url}/admin/oauth/clients/${t2}/regenerate_secret`, { headers: this.headers, xform: (e3) => ({ data: e3, error: null }) });
      } catch (e3) {
        if (N(e3)) return { data: null, error: e3 };
        throw e3;
      }
    }
    async _listCustomProviders(e2) {
      try {
        let t2 = {};
        return e2?.type && (t2.type = e2.type), await Y(this.fetch, `GET`, `${this.url}/admin/custom-providers`, { headers: this.headers, query: t2, xform: (e3) => ({ data: { providers: e3?.providers ?? [] }, error: null }) });
      } catch (e3) {
        if (N(e3)) return { data: { providers: [] }, error: e3 };
        throw e3;
      }
    }
    async _createCustomProvider(e2) {
      try {
        return await Y(this.fetch, `POST`, `${this.url}/admin/custom-providers`, { body: e2, headers: this.headers, xform: (e3) => ({ data: e3, error: null }) });
      } catch (e3) {
        if (N(e3)) return { data: null, error: e3 };
        throw e3;
      }
    }
    async _getCustomProvider(e2) {
      try {
        let t2 = this._encodePathSegment(e2);
        return await Y(this.fetch, `GET`, `${this.url}/admin/custom-providers/${t2}`, { headers: this.headers, xform: (e3) => ({ data: e3, error: null }) });
      } catch (e3) {
        if (N(e3)) return { data: null, error: e3 };
        throw e3;
      }
    }
    async _updateCustomProvider(e2, t2) {
      try {
        let n2 = this._encodePathSegment(e2);
        return await Y(this.fetch, `PUT`, `${this.url}/admin/custom-providers/${n2}`, { body: t2, headers: this.headers, xform: (e3) => ({ data: e3, error: null }) });
      } catch (e3) {
        if (N(e3)) return { data: null, error: e3 };
        throw e3;
      }
    }
    async _deleteCustomProvider(e2) {
      try {
        let t2 = this._encodePathSegment(e2);
        return await Y(this.fetch, `DELETE`, `${this.url}/admin/custom-providers/${t2}`, { headers: this.headers, noResolveJson: true }), { data: null, error: null };
      } catch (e3) {
        if (N(e3)) return { data: null, error: e3 };
        throw e3;
      }
    }
    async _adminListPasskeys(e2) {
      q(this.experimental), K(e2.userId);
      try {
        return await Y(this.fetch, `GET`, `${this.url}/admin/users/${e2.userId}/passkeys`, { headers: this.headers, xform: (e3) => ({ data: e3, error: null }) });
      } catch (e3) {
        if (N(e3)) return { data: null, error: e3 };
        throw e3;
      }
    }
    async _adminDeletePasskey(e2) {
      q(this.experimental), K(e2.userId), K(e2.passkeyId);
      try {
        return await Y(this.fetch, `DELETE`, `${this.url}/admin/users/${e2.userId}/passkeys/${e2.passkeyId}`, { headers: this.headers, noResolveJson: true }), { data: null, error: null };
      } catch (e3) {
        if (N(e3)) return { data: null, error: e3 };
        throw e3;
      }
    }
  };
  function Nr(e2 = {}) {
    return { getItem: (t2) => e2[t2] || null, setItem: (t2, n2) => {
      e2[t2] = n2;
    }, removeItem: (t2) => {
      delete e2[t2];
    } };
  }
  let Q = { debug: !!(globalThis && nr() && globalThis.localStorage && globalThis.localStorage.getItem(`supabase.gotrue-js.locks.debug`) === `true`) };
  var Pr = class extends Error {
    constructor(e2) {
      super(e2), this.isAcquireTimeout = true;
    }
  }, Fr = class extends Pr {
  }, Ir = class extends Pr {
  };
  async function Lr(e2, t2, n2) {
    Q.debug && console.log(`@supabase/gotrue-js: navigatorLock: acquire lock`, e2, t2);
    let r2 = new globalThis.AbortController(), i2;
    t2 > 0 && (i2 = setTimeout(() => {
      r2.abort(), Q.debug && console.log(`@supabase/gotrue-js: navigatorLock acquire timed out`, e2);
    }, t2)), await Promise.resolve();
    try {
      return await globalThis.navigator.locks.request(e2, t2 === 0 ? { mode: `exclusive`, ifAvailable: true } : { mode: `exclusive`, signal: r2.signal }, async (r3) => {
        if (r3) {
          clearTimeout(i2), Q.debug && console.log(`@supabase/gotrue-js: navigatorLock: acquired`, e2, r3.name);
          try {
            return await n2();
          } finally {
            Q.debug && console.log(`@supabase/gotrue-js: navigatorLock: released`, e2, r3.name);
          }
        } else if (t2 === 0) throw Q.debug && console.log(`@supabase/gotrue-js: navigatorLock: not immediately available`, e2), new Fr(`Acquiring an exclusive Navigator LockManager lock "${e2}" immediately failed`);
        else {
          if (Q.debug) try {
            let e3 = await globalThis.navigator.locks.query();
            console.log(`@supabase/gotrue-js: Navigator LockManager state`, JSON.stringify(e3, null, `  `));
          } catch (e3) {
            console.warn(`@supabase/gotrue-js: Error when querying Navigator LockManager state`, e3);
          }
          return console.warn(`@supabase/gotrue-js: Navigator LockManager returned a null lock when using #request without ifAvailable set to true, it appears this browser is not following the LockManager spec https://developer.mozilla.org/en-US/docs/Web/API/LockManager/request`), clearTimeout(i2), await n2();
        }
      });
    } catch (a2) {
      if (t2 > 0 && clearTimeout(i2), typeof a2 == `object` && a2 && `name` in a2 && a2.name === `AbortError` && t2 > 0) {
        if (r2.signal.aborted) return Q.debug && console.log(`@supabase/gotrue-js: navigatorLock: acquire timeout, recovering by stealing lock`, e2), console.warn(`@supabase/gotrue-js: Lock "${e2}" was not released within ${t2}ms. This may indicate an orphaned lock from a component unmount (e.g., React Strict Mode). Forcefully acquiring the lock to recover.`), await Promise.resolve().then(() => globalThis.navigator.locks.request(e2, { mode: `exclusive`, steal: true }, async (t3) => {
          if (t3) {
            Q.debug && console.log(`@supabase/gotrue-js: navigatorLock: recovered (stolen)`, e2, t3.name);
            try {
              return await n2();
            } finally {
              Q.debug && console.log(`@supabase/gotrue-js: navigatorLock: released (stolen)`, e2, t3.name);
            }
          } else return console.warn(`@supabase/gotrue-js: Navigator LockManager returned null lock even with steal: true`), await n2();
        }));
        throw Q.debug && console.log(`@supabase/gotrue-js: navigatorLock: lock was stolen by another request`, e2), new Fr(`Lock "${e2}" was released because another request stole it`);
      }
      throw a2;
    }
  }
  let Rr = {};
  async function zr(e2, t2, n2) {
    let r2 = Rr[e2] ?? Promise.resolve(), i2 = (async () => {
      try {
        return await r2, null;
      } catch {
        return null;
      }
    })(), a2 = (async () => {
      let r3 = null;
      try {
        let n3 = t2 >= 0 ? new Promise((n4, i3) => {
          r3 = setTimeout(() => {
            console.warn(`@supabase/gotrue-js: Lock "${e2}" acquisition timed out after ${t2}ms. This may be caused by another operation holding the lock. Consider increasing lockAcquireTimeout or checking for stuck operations.`), i3(new Ir(`Acquiring process lock with name "${e2}" timed out`));
          }, t2);
        }) : null;
        await Promise.race([i2, n3].filter((e3) => e3)), r3 !== null && clearTimeout(r3);
      } catch (e3) {
        if (r3 !== null && clearTimeout(r3), e3 instanceof Pr) throw e3;
      }
      return await n2();
    })();
    return Rr[e2] = (async () => {
      try {
        return await a2;
      } catch (e3) {
        if (e3 instanceof Pr) {
          try {
            await r2;
          } catch {
          }
          return null;
        }
        throw e3;
      }
    })(), await a2;
  }
  function Br() {
    if (typeof globalThis != `object`) try {
      Object.defineProperty(Object.prototype, `__magic__`, { get: function() {
        return this;
      }, configurable: true }), __magic__.globalThis = __magic__, delete Object.prototype.__magic__;
    } catch {
      typeof self < `u` && (self.globalThis = self);
    }
  }
  function Vr(e2) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(e2)) throw Error(`@supabase/auth-js: Address "${e2}" is invalid.`);
    return e2.toLowerCase();
  }
  function Hr(e2) {
    return parseInt(e2, 16);
  }
  function Ur(e2) {
    let t2 = new TextEncoder().encode(e2);
    return `0x` + Array.from(t2, (e3) => e3.toString(16).padStart(2, `0`)).join(``);
  }
  function Wr(e2) {
    let { chainId: t2, domain: n2, expirationTime: r2, issuedAt: i2 = /* @__PURE__ */ new Date(), nonce: a2, notBefore: o2, requestId: s2, resources: c2, scheme: l2, uri: u2, version: d2 } = e2;
    if (!Number.isInteger(t2)) throw Error(`@supabase/auth-js: Invalid SIWE message field "chainId". Chain ID must be a EIP-155 chain ID. Provided value: ${t2}`);
    if (!n2) throw Error(`@supabase/auth-js: Invalid SIWE message field "domain". Domain must be provided.`);
    if (a2 && a2.length < 8) throw Error(`@supabase/auth-js: Invalid SIWE message field "nonce". Nonce must be at least 8 characters. Provided value: ${a2}`);
    if (!u2) throw Error(`@supabase/auth-js: Invalid SIWE message field "uri". URI must be provided.`);
    if (d2 !== `1`) throw Error(`@supabase/auth-js: Invalid SIWE message field "version". Version must be '1'. Provided value: ${d2}`);
    if (e2.statement?.includes(`
`)) throw Error(`@supabase/auth-js: Invalid SIWE message field "statement". Statement must not include '\\n'. Provided value: ${e2.statement}`);
    let f2 = Vr(e2.address), p2 = `${l2 ? `${l2}://${n2}` : n2} wants you to sign in with your Ethereum account:
${f2}

${e2.statement ? `${e2.statement}
` : ``}`, m2 = `URI: ${u2}
Version: ${d2}
Chain ID: ${t2}${a2 ? `
Nonce: ${a2}` : ``}
Issued At: ${i2.toISOString()}`;
    if (r2 && (m2 += `
Expiration Time: ${r2.toISOString()}`), o2 && (m2 += `
Not Before: ${o2.toISOString()}`), s2 && (m2 += `
Request ID: ${s2}`), c2) {
      let e3 = `
Resources:`;
      for (let t3 of c2) {
        if (!t3 || typeof t3 != `string`) throw Error(`@supabase/auth-js: Invalid SIWE message field "resources". Every resource must be a valid string. Provided value: ${t3}`);
        e3 += `
- ${t3}`;
      }
      m2 += e3;
    }
    return `${p2}
${m2}`;
  }
  var $ = class extends Error {
    constructor({ message: e2, code: t2, cause: n2, name: r2 }) {
      super(e2, { cause: n2 }), this.__isWebAuthnError = true, this.name = r2 ?? (n2 instanceof Error ? n2.name : void 0) ?? `Unknown Error`, this.code = t2;
    }
    toJSON() {
      return { name: this.name, message: this.message, code: this.code };
    }
  }, Gr = class extends $ {
    constructor(e2, t2) {
      super({ code: `ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`, cause: t2, message: e2 }), this.name = `WebAuthnUnknownError`, this.originalError = t2;
    }
  };
  function Kr({ error: e2, options: t2 }) {
    let { publicKey: n2 } = t2;
    if (!n2) throw Error(`options was missing required publicKey property`);
    if (e2.name === `AbortError`) {
      if (t2.signal instanceof AbortSignal) return new $({ message: `Registration ceremony was sent an abort signal`, code: `ERROR_CEREMONY_ABORTED`, cause: e2 });
    } else if (e2.name === `ConstraintError`) {
      if (n2.authenticatorSelection?.requireResidentKey === true) return new $({ message: `Discoverable credentials were required but no available authenticator supported it`, code: `ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT`, cause: e2 });
      if (t2.mediation === `conditional` && n2.authenticatorSelection?.userVerification === `required`) return new $({ message: `User verification was required during automatic registration but it could not be performed`, code: `ERROR_AUTO_REGISTER_USER_VERIFICATION_FAILURE`, cause: e2 });
      if (n2.authenticatorSelection?.userVerification === `required`) return new $({ message: `User verification was required but no available authenticator supported it`, code: `ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT`, cause: e2 });
    } else if (e2.name === `InvalidStateError`) return new $({ message: `The authenticator was previously registered`, code: `ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED`, cause: e2 });
    else if (e2.name === `NotAllowedError`) return new $({ message: e2.message, code: `ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`, cause: e2 });
    else if (e2.name === `NotSupportedError`) return n2.pubKeyCredParams.filter((e3) => e3.type === `public-key`).length === 0 ? new $({ message: `No entry in pubKeyCredParams was of type "public-key"`, code: `ERROR_MALFORMED_PUBKEYCREDPARAMS`, cause: e2 }) : new $({ message: `No available authenticator supported any of the specified pubKeyCredParams algorithms`, code: `ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG`, cause: e2 });
    else if (e2.name === `SecurityError`) {
      let t3 = window.location.hostname;
      if ($r(t3)) {
        if (n2.rp.id !== t3) return new $({ message: `The RP ID "${n2.rp.id}" is invalid for this domain`, code: `ERROR_INVALID_RP_ID`, cause: e2 });
      } else return new $({ message: `${window.location.hostname} is an invalid domain`, code: `ERROR_INVALID_DOMAIN`, cause: e2 });
    } else if (e2.name === `TypeError`) {
      if (n2.user.id.byteLength < 1 || n2.user.id.byteLength > 64) return new $({ message: `User ID was not between 1 and 64 characters`, code: `ERROR_INVALID_USER_ID_LENGTH`, cause: e2 });
    } else if (e2.name === `UnknownError`) return new $({ message: `The authenticator was unable to process the specified options, or could not create a new credential`, code: `ERROR_AUTHENTICATOR_GENERAL_ERROR`, cause: e2 });
    return new $({ message: `a Non-Webauthn related error has occurred`, code: `ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`, cause: e2 });
  }
  function qr({ error: e2, options: t2 }) {
    let { publicKey: n2 } = t2;
    if (!n2) throw Error(`options was missing required publicKey property`);
    if (e2.name === `AbortError`) {
      if (t2.signal instanceof AbortSignal) return new $({ message: `Authentication ceremony was sent an abort signal`, code: `ERROR_CEREMONY_ABORTED`, cause: e2 });
    } else if (e2.name === `NotAllowedError`) return new $({ message: e2.message, code: `ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`, cause: e2 });
    else if (e2.name === `SecurityError`) {
      let t3 = window.location.hostname;
      if ($r(t3)) {
        if (n2.rpId !== t3) return new $({ message: `The RP ID "${n2.rpId}" is invalid for this domain`, code: `ERROR_INVALID_RP_ID`, cause: e2 });
      } else return new $({ message: `${window.location.hostname} is an invalid domain`, code: `ERROR_INVALID_DOMAIN`, cause: e2 });
    } else if (e2.name === `UnknownError`) return new $({ message: `The authenticator was unable to process the specified options, or could not create a new assertion signature`, code: `ERROR_AUTHENTICATOR_GENERAL_ERROR`, cause: e2 });
    return new $({ message: `a Non-Webauthn related error has occurred`, code: `ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`, cause: e2 });
  }
  let Jr = new class {
    createNewAbortSignal() {
      if (this.controller) {
        let e3 = Error(`Cancelling existing WebAuthn API call for new one`);
        e3.name = `AbortError`, this.controller.abort(e3);
      }
      let e2 = new AbortController();
      return this.controller = e2, e2.signal;
    }
    cancelCeremony() {
      if (this.controller) {
        let e2 = Error(`Manually cancelling existing WebAuthn API call`);
        e2.name = `AbortError`, this.controller.abort(e2), this.controller = void 0;
      }
    }
  }();
  function Yr(e2) {
    if (!e2) throw Error(`Credential creation options are required`);
    if (typeof PublicKeyCredential < `u` && `parseCreationOptionsFromJSON` in PublicKeyCredential && typeof PublicKeyCredential.parseCreationOptionsFromJSON == `function`) return PublicKeyCredential.parseCreationOptionsFromJSON(e2);
    let { challenge: n2, user: r2, excludeCredentials: i2 } = e2, a2 = t(e2, [`challenge`, `user`, `excludeCredentials`]), o2 = R(n2).buffer, s2 = Object.assign(Object.assign({}, r2), { id: R(r2.id).buffer }), c2 = Object.assign(Object.assign({}, a2), { challenge: o2, user: s2 });
    if (i2 && i2.length > 0) {
      c2.excludeCredentials = Array(i2.length);
      for (let e3 = 0; e3 < i2.length; e3++) {
        let t2 = i2[e3];
        c2.excludeCredentials[e3] = Object.assign(Object.assign({}, t2), { id: R(t2.id).buffer, type: t2.type || `public-key`, transports: t2.transports });
      }
    }
    return c2;
  }
  function Xr(e2) {
    if (!e2) throw Error(`Credential request options are required`);
    if (typeof PublicKeyCredential < `u` && `parseRequestOptionsFromJSON` in PublicKeyCredential && typeof PublicKeyCredential.parseRequestOptionsFromJSON == `function`) return PublicKeyCredential.parseRequestOptionsFromJSON(e2);
    let { challenge: n2, allowCredentials: r2 } = e2, i2 = t(e2, [`challenge`, `allowCredentials`]), a2 = R(n2).buffer, o2 = Object.assign(Object.assign({}, i2), { challenge: a2 });
    if (r2 && r2.length > 0) {
      o2.allowCredentials = Array(r2.length);
      for (let e3 = 0; e3 < r2.length; e3++) {
        let t2 = r2[e3];
        o2.allowCredentials[e3] = Object.assign(Object.assign({}, t2), { id: R(t2.id).buffer, type: t2.type || `public-key`, transports: t2.transports });
      }
    }
    return o2;
  }
  function Zr(e2) {
    if (`toJSON` in e2 && typeof e2.toJSON == `function`) return e2.toJSON();
    let t2 = e2;
    return { id: e2.id, rawId: e2.id, response: { attestationObject: z(new Uint8Array(e2.response.attestationObject)), clientDataJSON: z(new Uint8Array(e2.response.clientDataJSON)) }, type: `public-key`, clientExtensionResults: e2.getClientExtensionResults(), authenticatorAttachment: t2.authenticatorAttachment ?? void 0 };
  }
  function Qr(e2) {
    if (`toJSON` in e2 && typeof e2.toJSON == `function`) return e2.toJSON();
    let t2 = e2, n2 = e2.getClientExtensionResults(), r2 = e2.response;
    return { id: e2.id, rawId: e2.id, response: { authenticatorData: z(new Uint8Array(r2.authenticatorData)), clientDataJSON: z(new Uint8Array(r2.clientDataJSON)), signature: z(new Uint8Array(r2.signature)), userHandle: r2.userHandle ? z(new Uint8Array(r2.userHandle)) : void 0 }, type: `public-key`, clientExtensionResults: n2, authenticatorAttachment: t2.authenticatorAttachment ?? void 0 };
  }
  function $r(e2) {
    return e2 === `localhost` || /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(e2);
  }
  function ei() {
    return !!(B() && `PublicKeyCredential` in window && window.PublicKeyCredential && `credentials` in navigator && typeof (navigator == null ? void 0 : navigator.credentials)?.create == `function` && typeof (navigator == null ? void 0 : navigator.credentials)?.get == `function`);
  }
  async function ti(e2) {
    try {
      let t2 = await navigator.credentials.create(e2);
      return t2 ? t2 instanceof PublicKeyCredential ? { data: t2, error: null } : { data: null, error: new Gr(`Browser returned unexpected credential type`, t2) } : { data: null, error: new Gr(`Empty credential response`, t2) };
    } catch (t2) {
      return { data: null, error: Kr({ error: t2, options: e2 }) };
    }
  }
  async function ni(e2) {
    try {
      let t2 = await navigator.credentials.get(e2);
      return t2 ? t2 instanceof PublicKeyCredential ? { data: t2, error: null } : { data: null, error: new Gr(`Browser returned unexpected credential type`, t2) } : { data: null, error: new Gr(`Empty credential response`, t2) };
    } catch (t2) {
      return { data: null, error: qr({ error: t2, options: e2 }) };
    }
  }
  let ri = { hints: [`security-key`], authenticatorSelection: { authenticatorAttachment: `cross-platform`, requireResidentKey: false, userVerification: `preferred`, residentKey: `discouraged` }, attestation: `direct` }, ii = { userVerification: `preferred`, hints: [`security-key`], attestation: `direct` };
  function ai(...e2) {
    let t2 = (e3) => typeof e3 == `object` && !!e3 && !Array.isArray(e3), n2 = (e3) => e3 instanceof ArrayBuffer || ArrayBuffer.isView(e3), r2 = {};
    for (let i2 of e2) if (i2) for (let e3 in i2) {
      let a2 = i2[e3];
      if (a2 !== void 0) if (Array.isArray(a2)) r2[e3] = a2;
      else if (n2(a2)) r2[e3] = a2;
      else if (t2(a2)) {
        let n3 = r2[e3];
        t2(n3) ? r2[e3] = ai(n3, a2) : r2[e3] = ai(a2);
      } else r2[e3] = a2;
    }
    return r2;
  }
  function oi(e2, t2) {
    return ai(ri, e2, t2 || {});
  }
  function si(e2, t2) {
    return ai(ii, e2, t2 || {});
  }
  var ci = class {
    constructor(e2) {
      this.client = e2, this.enroll = this._enroll.bind(this), this.challenge = this._challenge.bind(this), this.verify = this._verify.bind(this), this.authenticate = this._authenticate.bind(this), this.register = this._register.bind(this);
    }
    async _enroll(e2) {
      return this.client.mfa.enroll(Object.assign(Object.assign({}, e2), { factorType: `webauthn` }));
    }
    async _challenge({ factorId: e2, webauthn: t2, friendlyName: n2, signal: r2 }, i2) {
      try {
        let { data: a2, error: o2 } = await this.client.mfa.challenge({ factorId: e2, webauthn: t2 });
        if (!a2) return { data: null, error: o2 };
        let s2 = r2 ?? Jr.createNewAbortSignal();
        if (a2.webauthn.type === `create`) {
          let { user: e3 } = a2.webauthn.credential_options.publicKey;
          if (!e3.name) {
            let t3 = n2;
            if (t3) e3.name = `${e3.id}:${t3}`;
            else {
              let t4 = (await this.client.getUser()).data.user, n3 = t4?.user_metadata?.name || t4?.email || t4?.id || `User`;
              e3.name = `${e3.id}:${n3}`;
            }
          }
          e3.displayName ||= e3.name;
        }
        switch (a2.webauthn.type) {
          case `create`: {
            let { data: t3, error: n3 } = await ti({ publicKey: oi(a2.webauthn.credential_options.publicKey, i2?.create), signal: s2 });
            return t3 ? { data: { factorId: e2, challengeId: a2.id, webauthn: { type: a2.webauthn.type, credential_response: t3 } }, error: null } : { data: null, error: n3 };
          }
          case `request`: {
            let t3 = si(a2.webauthn.credential_options.publicKey, i2?.request), { data: n3, error: r3 } = await ni(Object.assign(Object.assign({}, a2.webauthn.credential_options), { publicKey: t3, signal: s2 }));
            return n3 ? { data: { factorId: e2, challengeId: a2.id, webauthn: { type: a2.webauthn.type, credential_response: n3 } }, error: null } : { data: null, error: r3 };
          }
        }
      } catch (e3) {
        return N(e3) ? { data: null, error: e3 } : { data: null, error: new P(`Unexpected error in challenge`, e3) };
      }
    }
    async _verify({ challengeId: e2, factorId: t2, webauthn: n2 }) {
      return this.client.mfa.verify({ factorId: t2, challengeId: e2, webauthn: n2 });
    }
    async _authenticate({ factorId: e2, webauthn: { rpId: t2 = typeof window < `u` ? window.location.hostname : void 0, rpOrigins: n2 = typeof window < `u` ? [window.location.origin] : void 0, signal: r2 } = {} }, i2) {
      if (!t2) return { data: null, error: new M(`rpId is required for WebAuthn authentication`) };
      try {
        if (!ei()) return { data: null, error: new P(`Browser does not support WebAuthn`, null) };
        let { data: a2, error: o2 } = await this.challenge({ factorId: e2, webauthn: { rpId: t2, rpOrigins: n2 }, signal: r2 }, { request: i2 });
        if (!a2) return { data: null, error: o2 };
        let { webauthn: s2 } = a2;
        return this._verify({ factorId: e2, challengeId: a2.challengeId, webauthn: { type: s2.type, rpId: t2, rpOrigins: n2, credential_response: s2.credential_response } });
      } catch (e3) {
        return N(e3) ? { data: null, error: e3 } : { data: null, error: new P(`Unexpected error in authenticate`, e3) };
      }
    }
    async _register({ friendlyName: e2, webauthn: { rpId: t2 = typeof window < `u` ? window.location.hostname : void 0, rpOrigins: n2 = typeof window < `u` ? [window.location.origin] : void 0, signal: r2 } = {} }, i2) {
      if (!t2) return { data: null, error: new M(`rpId is required for WebAuthn registration`) };
      try {
        if (!ei()) return { data: null, error: new P(`Browser does not support WebAuthn`, null) };
        let { data: a2, error: o2 } = await this._enroll({ friendlyName: e2 });
        if (!a2) return await this.client.mfa.listFactors().then((t3) => t3.data?.all.find((t4) => t4.factor_type === `webauthn` && t4.friendly_name === e2 && t4.status !== `unverified`)).then((e3) => e3 ? this.client.mfa.unenroll({ factorId: e3?.id }) : void 0), { data: null, error: o2 };
        let { data: s2, error: c2 } = await this._challenge({ factorId: a2.id, friendlyName: a2.friendly_name, webauthn: { rpId: t2, rpOrigins: n2 }, signal: r2 }, { create: i2 });
        return s2 ? this._verify({ factorId: a2.id, challengeId: s2.challengeId, webauthn: { rpId: t2, rpOrigins: n2, type: s2.webauthn.type, credential_response: s2.webauthn.credential_response } }) : { data: null, error: c2 };
      } catch (e3) {
        return N(e3) ? { data: null, error: e3 } : { data: null, error: new P(`Unexpected error in register`, e3) };
      }
    }
  };
  Br();
  let li = { url: `http://localhost:9999`, storageKey: `supabase.auth.token`, autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, headers: En, flowType: `implicit`, debug: false, hasCustomAuthorizationHeader: false, throwOnError: false, lockAcquireTimeout: 5e3, skipAutoInitialize: false, experimental: {} };
  async function ui(e2, t2, n2) {
    return await n2();
  }
  let di = {};
  var fi = class e2 {
    get jwks() {
      return di[this.storageKey]?.jwks ?? { keys: [] };
    }
    set jwks(e3) {
      di[this.storageKey] = Object.assign(Object.assign({}, di[this.storageKey]), { jwks: e3 });
    }
    get jwks_cached_at() {
      return di[this.storageKey]?.cachedAt ?? -(2 ** 53 - 1);
    }
    set jwks_cached_at(e3) {
      di[this.storageKey] = Object.assign(Object.assign({}, di[this.storageKey]), { cachedAt: e3 });
    }
    constructor(t2) {
      var n2;
      this.userStorage = null, this.memoryStorage = null, this.stateChangeEmitters = /* @__PURE__ */ new Map(), this.autoRefreshTicker = null, this.autoRefreshTickTimeout = null, this.visibilityChangedCallback = null, this.refreshingDeferred = null, this.initializePromise = null, this.detectSessionInUrl = true, this.hasCustomAuthorizationHeader = false, this.suppressGetSessionWarning = false, this.lockAcquired = false, this.pendingInLock = [], this.broadcastChannel = null, this.logger = console.log;
      let r2 = Object.assign(Object.assign({}, li), t2);
      if (this.storageKey = r2.storageKey, this.instanceID = e2.nextInstanceID[this.storageKey] ?? 0, e2.nextInstanceID[this.storageKey] = this.instanceID + 1, this.logDebugMessages = !!r2.debug, typeof r2.debug == `function` && (this.logger = r2.debug), this.instanceID > 0 && B()) {
        let e3 = `${this._logPrefix()} Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.`;
        console.warn(e3), this.logDebugMessages && console.trace(e3);
      }
      if (this.persistSession = r2.persistSession, this.autoRefreshToken = r2.autoRefreshToken, this.experimental = r2.experimental ?? {}, this.admin = new Mr({ url: r2.url, headers: r2.headers, fetch: r2.fetch, experimental: this.experimental }), this.url = r2.url, this.headers = r2.headers, this.fetch = ir(r2.fetch), this.lock = r2.lock || ui, this.detectSessionInUrl = r2.detectSessionInUrl, this.flowType = r2.flowType, this.hasCustomAuthorizationHeader = r2.hasCustomAuthorizationHeader, this.throwOnError = r2.throwOnError, this.lockAcquireTimeout = r2.lockAcquireTimeout, r2.lock ? this.lock = r2.lock : this.persistSession && B() && (globalThis == null ? void 0 : globalThis.navigator)?.locks ? this.lock = Lr : this.lock = ui, this.jwks || (this.jwks = { keys: [] }, this.jwks_cached_at = -(2 ** 53 - 1)), this.mfa = { verify: this._verify.bind(this), enroll: this._enroll.bind(this), unenroll: this._unenroll.bind(this), challenge: this._challenge.bind(this), listFactors: this._listFactors.bind(this), challengeAndVerify: this._challengeAndVerify.bind(this), getAuthenticatorAssuranceLevel: this._getAuthenticatorAssuranceLevel.bind(this), webauthn: new ci(this) }, this.oauth = { getAuthorizationDetails: this._getAuthorizationDetails.bind(this), approveAuthorization: this._approveAuthorization.bind(this), denyAuthorization: this._denyAuthorization.bind(this), listGrants: this._listOAuthGrants.bind(this), revokeGrant: this._revokeOAuthGrant.bind(this) }, this.passkey = { startRegistration: this._startPasskeyRegistration.bind(this), verifyRegistration: this._verifyPasskeyRegistration.bind(this), startAuthentication: this._startPasskeyAuthentication.bind(this), verifyAuthentication: this._verifyPasskeyAuthentication.bind(this), list: this._listPasskeys.bind(this), update: this._updatePasskey.bind(this), delete: this._deletePasskey.bind(this) }, this.persistSession ? (r2.storage ? this.storage = r2.storage : nr() ? this.storage = globalThis.localStorage : (this.memoryStorage = {}, this.storage = Nr(this.memoryStorage)), r2.userStorage && (this.userStorage = r2.userStorage)) : (this.memoryStorage = {}, this.storage = Nr(this.memoryStorage)), B() && globalThis.BroadcastChannel && this.persistSession && this.storageKey) {
        try {
          this.broadcastChannel = new globalThis.BroadcastChannel(this.storageKey);
        } catch (e3) {
          console.error(`Failed to create a new BroadcastChannel, multi-tab state changes will not be available`, e3);
        }
        (n2 = this.broadcastChannel) == null || n2.addEventListener(`message`, async (e3) => {
          this._debug(`received broadcast notification from other tab or client`, e3);
          try {
            await this._notifyAllSubscribers(e3.data.event, e3.data.session, false);
          } catch (e4) {
            this._debug(`#broadcastChannel`, `error`, e4);
          }
        });
      }
      r2.skipAutoInitialize || this.initialize().catch((e3) => {
        this._debug(`#initialize()`, `error`, e3);
      });
    }
    isThrowOnErrorEnabled() {
      return this.throwOnError;
    }
    _returnResult(e3) {
      if (this.throwOnError && e3 && e3.error) throw e3.error;
      return e3;
    }
    _logPrefix() {
      return `GoTrueClient@${this.storageKey}:${this.instanceID} (${Cn}) ${(/* @__PURE__ */ new Date()).toISOString()}`;
    }
    _debug(...e3) {
      return this.logDebugMessages && this.logger(this._logPrefix(), ...e3), this;
    }
    async initialize() {
      return this.initializePromise ||= (async () => await this._acquireLock(this.lockAcquireTimeout, async () => await this._initialize()))(), await this.initializePromise;
    }
    async _initialize() {
      try {
        let e3 = {}, t2 = `none`;
        if (B() && (e3 = rr(window.location.href), this._isImplicitGrantCallback(e3) ? t2 = `implicit` : await this._isPKCECallback(e3) && (t2 = `pkce`)), B() && this.detectSessionInUrl && t2 !== `none`) {
          let { data: n2, error: r2 } = await this._getSessionFromURL(e3, t2);
          if (r2) {
            if (this._debug(`#_initialize()`, `error detecting session from URL`, r2), Fn(r2)) {
              let e4 = r2.details?.code;
              if (e4 === `identity_already_exists` || e4 === `identity_not_found` || e4 === `single_identity_not_deletable`) return { error: r2 };
            }
            return { error: r2 };
          }
          let { session: i2, redirectType: a2 } = n2;
          return this._debug(`#_initialize()`, `detected session in URL`, i2, `redirect type`, a2), await this._saveSession(i2), setTimeout(async () => {
            a2 === `recovery` ? await this._notifyAllSubscribers(`PASSWORD_RECOVERY`, i2) : await this._notifyAllSubscribers(`SIGNED_IN`, i2);
          }, 0), { error: null };
        }
        return await this._recoverAndRefresh(), { error: null };
      } catch (e3) {
        return N(e3) ? this._returnResult({ error: e3 }) : this._returnResult({ error: new P(`Unexpected error during initialization`, e3) });
      } finally {
        await this._handleVisibilityChange(), this._debug(`#_initialize()`, `end`);
      }
    }
    async signInAnonymously(e3) {
      try {
        let { data: t2, error: n2 } = await Y(this.fetch, `POST`, `${this.url}/signup`, { headers: this.headers, body: { data: e3?.options?.data ?? {}, gotrue_meta_security: { captcha_token: e3?.options?.captchaToken } }, xform: X });
        if (n2 || !t2) return this._returnResult({ data: { user: null, session: null }, error: n2 });
        let r2 = t2.session, i2 = t2.user;
        return t2.session && (await this._saveSession(t2.session), await this._notifyAllSubscribers(`SIGNED_IN`, r2)), this._returnResult({ data: { user: i2, session: r2 }, error: null });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: { user: null, session: null }, error: e4 });
        throw e4;
      }
    }
    async signUp(e3) {
      try {
        let t2;
        if (`email` in e3) {
          let { email: n3, password: r3, options: i3 } = e3, a3 = null, o2 = null;
          this.flowType === `pkce` && ([a3, o2] = await G(this.storage, this.storageKey)), t2 = await Y(this.fetch, `POST`, `${this.url}/signup`, { headers: this.headers, redirectTo: i3?.emailRedirectTo, body: { email: n3, password: r3, data: i3?.data ?? {}, gotrue_meta_security: { captcha_token: i3?.captchaToken }, code_challenge: a3, code_challenge_method: o2 }, xform: X });
        } else if (`phone` in e3) {
          let { phone: n3, password: r3, options: i3 } = e3;
          t2 = await Y(this.fetch, `POST`, `${this.url}/signup`, { headers: this.headers, body: { phone: n3, password: r3, data: i3?.data ?? {}, channel: i3?.channel ?? `sms`, gotrue_meta_security: { captcha_token: i3?.captchaToken } }, xform: X });
        } else throw new Nn(`You must provide either an email or phone number and a password`);
        let { data: n2, error: r2 } = t2;
        if (r2 || !n2) return await W(this.storage, `${this.storageKey}-code-verifier`), this._returnResult({ data: { user: null, session: null }, error: r2 });
        let i2 = n2.session, a2 = n2.user;
        return n2.session && (await this._saveSession(n2.session), await this._notifyAllSubscribers(`SIGNED_IN`, i2)), this._returnResult({ data: { user: a2, session: i2 }, error: null });
      } catch (e4) {
        if (await W(this.storage, `${this.storageKey}-code-verifier`), N(e4)) return this._returnResult({ data: { user: null, session: null }, error: e4 });
        throw e4;
      }
    }
    async signInWithPassword(e3) {
      try {
        let t2;
        if (`email` in e3) {
          let { email: n3, password: r3, options: i2 } = e3;
          t2 = await Y(this.fetch, `POST`, `${this.url}/token?grant_type=password`, { headers: this.headers, body: { email: n3, password: r3, gotrue_meta_security: { captcha_token: i2?.captchaToken } }, xform: Er });
        } else if (`phone` in e3) {
          let { phone: n3, password: r3, options: i2 } = e3;
          t2 = await Y(this.fetch, `POST`, `${this.url}/token?grant_type=password`, { headers: this.headers, body: { phone: n3, password: r3, gotrue_meta_security: { captcha_token: i2?.captchaToken } }, xform: Er });
        } else throw new Nn(`You must provide either an email or phone number and a password`);
        let { data: n2, error: r2 } = t2;
        if (r2) return this._returnResult({ data: { user: null, session: null }, error: r2 });
        if (!n2 || !n2.session || !n2.user) {
          let e4 = new L();
          return this._returnResult({ data: { user: null, session: null }, error: e4 });
        }
        return n2.session && (await this._saveSession(n2.session), await this._notifyAllSubscribers(`SIGNED_IN`, n2.session)), this._returnResult({ data: Object.assign({ user: n2.user, session: n2.session }, n2.weak_password ? { weakPassword: n2.weak_password } : null), error: r2 });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: { user: null, session: null }, error: e4 });
        throw e4;
      }
    }
    async signInWithOAuth(e3) {
      return await this._handleProviderSignIn(e3.provider, { redirectTo: e3.options?.redirectTo, scopes: e3.options?.scopes, queryParams: e3.options?.queryParams, skipBrowserRedirect: e3.options?.skipBrowserRedirect });
    }
    async exchangeCodeForSession(e3) {
      return await this.initializePromise, this._acquireLock(this.lockAcquireTimeout, async () => this._exchangeCodeForSession(e3));
    }
    async signInWithWeb3(e3) {
      let { chain: t2 } = e3;
      switch (t2) {
        case `ethereum`:
          return await this.signInWithEthereum(e3);
        case `solana`:
          return await this.signInWithSolana(e3);
        default:
          throw Error(`@supabase/auth-js: Unsupported chain "${t2}"`);
      }
    }
    async signInWithEthereum(e3) {
      let t2, n2;
      if (`message` in e3) t2 = e3.message, n2 = e3.signature;
      else {
        let { chain: r2, wallet: i2, statement: a2, options: o2 } = e3, s2;
        if (B()) if (typeof i2 == `object`) s2 = i2;
        else {
          let e4 = window;
          if (`ethereum` in e4 && typeof e4.ethereum == `object` && `request` in e4.ethereum && typeof e4.ethereum.request == `function`) s2 = e4.ethereum;
          else throw Error(`@supabase/auth-js: No compatible Ethereum wallet interface on the window object (window.ethereum) detected. Make sure the user already has a wallet installed and connected for this app. Prefer passing the wallet interface object directly to signInWithWeb3({ chain: 'ethereum', wallet: resolvedUserWallet }) instead.`);
        }
        else {
          if (typeof i2 != `object` || !o2?.url) throw Error(`@supabase/auth-js: Both wallet and url must be specified in non-browser environments.`);
          s2 = i2;
        }
        let c2 = new URL(o2?.url ?? window.location.href), l2 = await s2.request({ method: `eth_requestAccounts` }).then((e4) => e4).catch(() => {
          throw Error(`@supabase/auth-js: Wallet method eth_requestAccounts is missing or invalid`);
        });
        if (!l2 || l2.length === 0) throw Error(`@supabase/auth-js: No accounts available. Please ensure the wallet is connected.`);
        let u2 = Vr(l2[0]), d2 = o2?.signInWithEthereum?.chainId;
        d2 ||= Hr(await s2.request({ method: `eth_chainId` })), t2 = Wr({ domain: c2.host, address: u2, statement: a2, uri: c2.href, version: `1`, chainId: d2, nonce: o2?.signInWithEthereum?.nonce, issuedAt: o2?.signInWithEthereum?.issuedAt ?? /* @__PURE__ */ new Date(), expirationTime: o2?.signInWithEthereum?.expirationTime, notBefore: o2?.signInWithEthereum?.notBefore, requestId: o2?.signInWithEthereum?.requestId, resources: o2?.signInWithEthereum?.resources }), n2 = await s2.request({ method: `personal_sign`, params: [Ur(t2), u2] });
      }
      try {
        let { data: r2, error: i2 } = await Y(this.fetch, `POST`, `${this.url}/token?grant_type=web3`, { headers: this.headers, body: Object.assign({ chain: `ethereum`, message: t2, signature: n2 }, e3.options?.captchaToken ? { gotrue_meta_security: { captcha_token: e3.options?.captchaToken } } : null), xform: X });
        if (i2) throw i2;
        if (!r2 || !r2.session || !r2.user) {
          let e4 = new L();
          return this._returnResult({ data: { user: null, session: null }, error: e4 });
        }
        return r2.session && (await this._saveSession(r2.session), await this._notifyAllSubscribers(`SIGNED_IN`, r2.session)), this._returnResult({ data: Object.assign({}, r2), error: i2 });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: { user: null, session: null }, error: e4 });
        throw e4;
      }
    }
    async signInWithSolana(e3) {
      let t2, n2;
      if (`message` in e3) t2 = e3.message, n2 = e3.signature;
      else {
        let { chain: r2, wallet: i2, statement: a2, options: o2 } = e3, s2;
        if (B()) if (typeof i2 == `object`) s2 = i2;
        else {
          let e4 = window;
          if (`solana` in e4 && typeof e4.solana == `object` && (`signIn` in e4.solana && typeof e4.solana.signIn == `function` || `signMessage` in e4.solana && typeof e4.solana.signMessage == `function`)) s2 = e4.solana;
          else throw Error(`@supabase/auth-js: No compatible Solana wallet interface on the window object (window.solana) detected. Make sure the user already has a wallet installed and connected for this app. Prefer passing the wallet interface object directly to signInWithWeb3({ chain: 'solana', wallet: resolvedUserWallet }) instead.`);
        }
        else {
          if (typeof i2 != `object` || !o2?.url) throw Error(`@supabase/auth-js: Both wallet and url must be specified in non-browser environments.`);
          s2 = i2;
        }
        let c2 = new URL(o2?.url ?? window.location.href);
        if (`signIn` in s2 && s2.signIn) {
          let e4 = await s2.signIn(Object.assign(Object.assign(Object.assign({ issuedAt: (/* @__PURE__ */ new Date()).toISOString() }, o2?.signInWithSolana), { version: `1`, domain: c2.host, uri: c2.href }), a2 ? { statement: a2 } : null)), r3;
          if (Array.isArray(e4) && e4[0] && typeof e4[0] == `object`) r3 = e4[0];
          else if (e4 && typeof e4 == `object` && `signedMessage` in e4 && `signature` in e4) r3 = e4;
          else throw Error(`@supabase/auth-js: Wallet method signIn() returned unrecognized value`);
          if (`signedMessage` in r3 && `signature` in r3 && (typeof r3.signedMessage == `string` || r3.signedMessage instanceof Uint8Array) && r3.signature instanceof Uint8Array) t2 = typeof r3.signedMessage == `string` ? r3.signedMessage : new TextDecoder().decode(r3.signedMessage), n2 = r3.signature;
          else throw Error(`@supabase/auth-js: Wallet method signIn() API returned object without signedMessage and signature fields`);
        } else {
          if (!(`signMessage` in s2) || typeof s2.signMessage != `function` || !(`publicKey` in s2) || typeof s2 != `object` || !s2.publicKey || !(`toBase58` in s2.publicKey) || typeof s2.publicKey.toBase58 != `function`) throw Error(`@supabase/auth-js: Wallet does not have a compatible signMessage() and publicKey.toBase58() API`);
          t2 = [`${c2.host} wants you to sign in with your Solana account:`, s2.publicKey.toBase58(), ...a2 ? [``, a2, ``] : [``], `Version: 1`, `URI: ${c2.href}`, `Issued At: ${o2?.signInWithSolana?.issuedAt ?? (/* @__PURE__ */ new Date()).toISOString()}`, ...o2?.signInWithSolana?.notBefore ? [`Not Before: ${o2.signInWithSolana.notBefore}`] : [], ...o2?.signInWithSolana?.expirationTime ? [`Expiration Time: ${o2.signInWithSolana.expirationTime}`] : [], ...o2?.signInWithSolana?.chainId ? [`Chain ID: ${o2.signInWithSolana.chainId}`] : [], ...o2?.signInWithSolana?.nonce ? [`Nonce: ${o2.signInWithSolana.nonce}`] : [], ...o2?.signInWithSolana?.requestId ? [`Request ID: ${o2.signInWithSolana.requestId}`] : [], ...o2?.signInWithSolana?.resources?.length ? [`Resources`, ...o2.signInWithSolana.resources.map((e5) => `- ${e5}`)] : []].join(`
`);
          let e4 = await s2.signMessage(new TextEncoder().encode(t2), `utf8`);
          if (!e4 || !(e4 instanceof Uint8Array)) throw Error(`@supabase/auth-js: Wallet signMessage() API returned an recognized value`);
          n2 = e4;
        }
      }
      try {
        let { data: r2, error: i2 } = await Y(this.fetch, `POST`, `${this.url}/token?grant_type=web3`, { headers: this.headers, body: Object.assign({ chain: `solana`, message: t2, signature: z(n2) }, e3.options?.captchaToken ? { gotrue_meta_security: { captcha_token: e3.options?.captchaToken } } : null), xform: X });
        if (i2) throw i2;
        if (!r2 || !r2.session || !r2.user) {
          let e4 = new L();
          return this._returnResult({ data: { user: null, session: null }, error: e4 });
        }
        return r2.session && (await this._saveSession(r2.session), await this._notifyAllSubscribers(`SIGNED_IN`, r2.session)), this._returnResult({ data: Object.assign({}, r2), error: i2 });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: { user: null, session: null }, error: e4 });
        throw e4;
      }
    }
    async _exchangeCodeForSession(e3) {
      let [t2, n2] = (await U(this.storage, `${this.storageKey}-code-verifier`) ?? ``).split(`/`);
      try {
        if (!t2 && this.flowType === `pkce`) throw new Ln();
        let { data: r2, error: i2 } = await Y(this.fetch, `POST`, `${this.url}/token?grant_type=pkce`, { headers: this.headers, body: { auth_code: e3, code_verifier: t2 }, xform: X });
        if (await W(this.storage, `${this.storageKey}-code-verifier`), i2) throw i2;
        if (!r2 || !r2.session || !r2.user) {
          let e4 = new L();
          return this._returnResult({ data: { user: null, session: null, redirectType: null }, error: e4 });
        }
        return r2.session && (await this._saveSession(r2.session), await this._notifyAllSubscribers(n2 === `recovery` ? `PASSWORD_RECOVERY` : `SIGNED_IN`, r2.session)), this._returnResult({ data: Object.assign(Object.assign({}, r2), { redirectType: n2 ?? null }), error: i2 });
      } catch (e4) {
        if (await W(this.storage, `${this.storageKey}-code-verifier`), N(e4)) return this._returnResult({ data: { user: null, session: null, redirectType: null }, error: e4 });
        throw e4;
      }
    }
    async signInWithIdToken(e3) {
      try {
        let { options: t2, provider: n2, token: r2, access_token: i2, nonce: a2 } = e3, { data: o2, error: s2 } = await Y(this.fetch, `POST`, `${this.url}/token?grant_type=id_token`, { headers: this.headers, body: { provider: n2, id_token: r2, access_token: i2, nonce: a2, gotrue_meta_security: { captcha_token: t2?.captchaToken } }, xform: X });
        if (s2) return this._returnResult({ data: { user: null, session: null }, error: s2 });
        if (!o2 || !o2.session || !o2.user) {
          let e4 = new L();
          return this._returnResult({ data: { user: null, session: null }, error: e4 });
        }
        return o2.session && (await this._saveSession(o2.session), await this._notifyAllSubscribers(`SIGNED_IN`, o2.session)), this._returnResult({ data: o2, error: s2 });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: { user: null, session: null }, error: e4 });
        throw e4;
      }
    }
    async signInWithOtp(e3) {
      try {
        if (`email` in e3) {
          let { email: t2, options: n2 } = e3, r2 = null, i2 = null;
          this.flowType === `pkce` && ([r2, i2] = await G(this.storage, this.storageKey));
          let { error: a2 } = await Y(this.fetch, `POST`, `${this.url}/otp`, { headers: this.headers, body: { email: t2, data: n2?.data ?? {}, create_user: n2?.shouldCreateUser ?? true, gotrue_meta_security: { captcha_token: n2?.captchaToken }, code_challenge: r2, code_challenge_method: i2 }, redirectTo: n2?.emailRedirectTo });
          return this._returnResult({ data: { user: null, session: null }, error: a2 });
        }
        if (`phone` in e3) {
          let { phone: t2, options: n2 } = e3, { data: r2, error: i2 } = await Y(this.fetch, `POST`, `${this.url}/otp`, { headers: this.headers, body: { phone: t2, data: n2?.data ?? {}, create_user: n2?.shouldCreateUser ?? true, gotrue_meta_security: { captcha_token: n2?.captchaToken }, channel: n2?.channel ?? `sms` } });
          return this._returnResult({ data: { user: null, session: null, messageId: r2?.message_id }, error: i2 });
        }
        throw new Nn(`You must provide either an email or phone number.`);
      } catch (e4) {
        if (await W(this.storage, `${this.storageKey}-code-verifier`), N(e4)) return this._returnResult({ data: { user: null, session: null }, error: e4 });
        throw e4;
      }
    }
    async verifyOtp(e3) {
      try {
        let t2, n2;
        `options` in e3 && (t2 = e3.options?.redirectTo, n2 = e3.options?.captchaToken);
        let { data: r2, error: i2 } = await Y(this.fetch, `POST`, `${this.url}/verify`, { headers: this.headers, body: Object.assign(Object.assign({}, e3), { gotrue_meta_security: { captcha_token: n2 } }), redirectTo: t2, xform: X });
        if (i2) throw i2;
        if (!r2) throw Error(`An error occurred on token verification.`);
        let a2 = r2.session, o2 = r2.user;
        return a2?.access_token && (await this._saveSession(a2), await this._notifyAllSubscribers(e3.type == `recovery` ? `PASSWORD_RECOVERY` : `SIGNED_IN`, a2)), this._returnResult({ data: { user: o2, session: a2 }, error: null });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: { user: null, session: null }, error: e4 });
        throw e4;
      }
    }
    async signInWithSSO(e3) {
      try {
        let t2 = null, n2 = null;
        this.flowType === `pkce` && ([t2, n2] = await G(this.storage, this.storageKey));
        let r2 = await Y(this.fetch, `POST`, `${this.url}/sso`, { body: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, `providerId` in e3 ? { provider_id: e3.providerId } : null), `domain` in e3 ? { domain: e3.domain } : null), { redirect_to: e3.options?.redirectTo ?? void 0 }), e3?.options?.captchaToken ? { gotrue_meta_security: { captcha_token: e3.options.captchaToken } } : null), { skip_http_redirect: true, code_challenge: t2, code_challenge_method: n2 }), headers: this.headers, xform: Dr });
        return r2.data?.url && B() && !e3.options?.skipBrowserRedirect && window.location.assign(r2.data.url), this._returnResult(r2);
      } catch (e4) {
        if (await W(this.storage, `${this.storageKey}-code-verifier`), N(e4)) return this._returnResult({ data: null, error: e4 });
        throw e4;
      }
    }
    async reauthenticate() {
      return await this.initializePromise, await this._acquireLock(this.lockAcquireTimeout, async () => await this._reauthenticate());
    }
    async _reauthenticate() {
      try {
        return await this._useSession(async (e3) => {
          let { data: { session: t2 }, error: n2 } = e3;
          if (n2) throw n2;
          if (!t2) throw new I();
          let { error: r2 } = await Y(this.fetch, `GET`, `${this.url}/reauthenticate`, { headers: this.headers, jwt: t2.access_token });
          return this._returnResult({ data: { user: null, session: null }, error: r2 });
        });
      } catch (e3) {
        if (N(e3)) return this._returnResult({ data: { user: null, session: null }, error: e3 });
        throw e3;
      }
    }
    async resend(e3) {
      try {
        let t2 = `${this.url}/resend`;
        if (`email` in e3) {
          let { email: n2, type: r2, options: i2 } = e3, { error: a2 } = await Y(this.fetch, `POST`, t2, { headers: this.headers, body: { email: n2, type: r2, gotrue_meta_security: { captcha_token: i2?.captchaToken } }, redirectTo: i2?.emailRedirectTo });
          return this._returnResult({ data: { user: null, session: null }, error: a2 });
        } else if (`phone` in e3) {
          let { phone: n2, type: r2, options: i2 } = e3, { data: a2, error: o2 } = await Y(this.fetch, `POST`, t2, { headers: this.headers, body: { phone: n2, type: r2, gotrue_meta_security: { captcha_token: i2?.captchaToken } } });
          return this._returnResult({ data: { user: null, session: null, messageId: a2?.message_id }, error: o2 });
        }
        throw new Nn(`You must provide either an email or phone number and a type`);
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: { user: null, session: null }, error: e4 });
        throw e4;
      }
    }
    async getSession() {
      return await this.initializePromise, await this._acquireLock(this.lockAcquireTimeout, async () => this._useSession(async (e3) => e3));
    }
    async _acquireLock(e3, t2) {
      this._debug(`#_acquireLock`, `begin`, e3);
      try {
        if (this.lockAcquired) {
          let e4 = this.pendingInLock.length ? this.pendingInLock[this.pendingInLock.length - 1] : Promise.resolve(), n2 = (async () => (await e4, await t2()))();
          return this.pendingInLock.push((async () => {
            try {
              await n2;
            } catch {
            }
          })()), n2;
        }
        return await this.lock(`lock:${this.storageKey}`, e3, async () => {
          this._debug(`#_acquireLock`, `lock acquired for storage key`, this.storageKey);
          try {
            this.lockAcquired = true;
            let e4 = t2();
            for (this.pendingInLock.push((async () => {
              try {
                await e4;
              } catch {
              }
            })()), await e4; this.pendingInLock.length; ) {
              let e5 = [...this.pendingInLock];
              await Promise.all(e5), this.pendingInLock.splice(0, e5.length);
            }
            return await e4;
          } finally {
            this._debug(`#_acquireLock`, `lock released for storage key`, this.storageKey), this.lockAcquired = false;
          }
        });
      } finally {
        this._debug(`#_acquireLock`, `end`);
      }
    }
    async _useSession(e3) {
      this._debug(`#_useSession`, `begin`);
      try {
        return await e3(await this.__loadSession());
      } finally {
        this._debug(`#_useSession`, `end`);
      }
    }
    async __loadSession() {
      this._debug(`#__loadSession()`, `begin`), this.lockAcquired || this._debug(`#__loadSession()`, `used outside of an acquired lock!`, Error().stack);
      try {
        let e3 = null, t2 = await U(this.storage, this.storageKey);
        if (this._debug(`#getSession()`, `session from storage`, t2), t2 !== null && (this._isValidSession(t2) ? e3 = t2 : (this._debug(`#getSession()`, `session from storage is not valid`), await this._removeSession())), !e3) return { data: { session: null }, error: null };
        let n2 = e3.expires_at ? e3.expires_at * 1e3 - Date.now() < Tn : false;
        if (this._debug(`#__loadSession()`, `session has${n2 ? `` : ` not`} expired`, `expires_at`, e3.expires_at), !n2) {
          if (this.userStorage) {
            let t3 = await U(this.userStorage, this.storageKey + `-user`);
            t3?.user ? e3.user = t3.user : e3.user = yr();
          }
          if (this.storage.isServer && e3.user && !e3.user.__isUserNotAvailableProxy) {
            let t3 = { value: this.suppressGetSessionWarning };
            e3.user = br(e3.user, t3), t3.value && (this.suppressGetSessionWarning = true);
          }
          return { data: { session: e3 }, error: null };
        }
        let { data: r2, error: i2 } = await this._callRefreshToken(e3.refresh_token);
        return i2 ? this._returnResult({ data: { session: null }, error: i2 }) : this._returnResult({ data: { session: r2 }, error: null });
      } finally {
        this._debug(`#__loadSession()`, `end`);
      }
    }
    async getUser(e3) {
      if (e3) return await this._getUser(e3);
      await this.initializePromise;
      let t2 = await this._acquireLock(this.lockAcquireTimeout, async () => await this._getUser());
      return t2.data.user && (this.suppressGetSessionWarning = true), t2;
    }
    async _getUser(e3) {
      try {
        return e3 ? await Y(this.fetch, `GET`, `${this.url}/user`, { headers: this.headers, jwt: e3, xform: Z }) : await this._useSession(async (e4) => {
          let { data: t2, error: n2 } = e4;
          if (n2) throw n2;
          return !t2.session?.access_token && !this.hasCustomAuthorizationHeader ? { data: { user: null }, error: new I() } : await Y(this.fetch, `GET`, `${this.url}/user`, { headers: this.headers, jwt: t2.session?.access_token ?? void 0, xform: Z });
        });
      } catch (e4) {
        if (N(e4)) return Mn(e4) && (await this._removeSession(), await W(this.storage, `${this.storageKey}-code-verifier`)), this._returnResult({ data: { user: null }, error: e4 });
        throw e4;
      }
    }
    async updateUser(e3, t2 = {}) {
      return await this.initializePromise, await this._acquireLock(this.lockAcquireTimeout, async () => await this._updateUser(e3, t2));
    }
    async _updateUser(e3, t2 = {}) {
      try {
        return await this._useSession(async (n2) => {
          let { data: r2, error: i2 } = n2;
          if (i2) throw i2;
          if (!r2.session) throw new I();
          let a2 = r2.session, o2 = null, s2 = null;
          this.flowType === `pkce` && e3.email != null && ([o2, s2] = await G(this.storage, this.storageKey));
          let { data: c2, error: l2 } = await Y(this.fetch, `PUT`, `${this.url}/user`, { headers: this.headers, redirectTo: t2?.emailRedirectTo, body: Object.assign(Object.assign({}, e3), { code_challenge: o2, code_challenge_method: s2 }), jwt: a2.access_token, xform: Z });
          if (l2) throw l2;
          return a2.user = c2.user, await this._saveSession(a2), await this._notifyAllSubscribers(`USER_UPDATED`, a2), this._returnResult({ data: { user: a2.user }, error: null });
        });
      } catch (e4) {
        if (await W(this.storage, `${this.storageKey}-code-verifier`), N(e4)) return this._returnResult({ data: { user: null }, error: e4 });
        throw e4;
      }
    }
    async setSession(e3) {
      return await this.initializePromise, await this._acquireLock(this.lockAcquireTimeout, async () => await this._setSession(e3));
    }
    async _setSession(e3) {
      try {
        if (!e3.access_token || !e3.refresh_token) throw new I();
        let t2 = Date.now() / 1e3, n2 = t2, r2 = true, i2 = null, { payload: a2 } = sr(e3.access_token);
        if (a2.exp && (n2 = a2.exp, r2 = n2 <= t2), r2) {
          let { data: t3, error: n3 } = await this._callRefreshToken(e3.refresh_token);
          if (n3) return this._returnResult({ data: { user: null, session: null }, error: n3 });
          if (!t3) return { data: { user: null, session: null }, error: null };
          i2 = t3;
        } else {
          let { data: r3, error: a3 } = await this._getUser(e3.access_token);
          if (a3) return this._returnResult({ data: { user: null, session: null }, error: a3 });
          i2 = { access_token: e3.access_token, refresh_token: e3.refresh_token, user: r3.user, token_type: `bearer`, expires_in: n2 - t2, expires_at: n2 }, await this._saveSession(i2), await this._notifyAllSubscribers(`SIGNED_IN`, i2);
        }
        return this._returnResult({ data: { user: i2.user, session: i2 }, error: null });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: { session: null, user: null }, error: e4 });
        throw e4;
      }
    }
    async refreshSession(e3) {
      return await this.initializePromise, await this._acquireLock(this.lockAcquireTimeout, async () => await this._refreshSession(e3));
    }
    async _refreshSession(e3) {
      try {
        return await this._useSession(async (t2) => {
          if (!e3) {
            let { data: n3, error: r3 } = t2;
            if (r3) throw r3;
            e3 = n3.session ?? void 0;
          }
          if (!e3?.refresh_token) throw new I();
          let { data: n2, error: r2 } = await this._callRefreshToken(e3.refresh_token);
          return r2 ? this._returnResult({ data: { user: null, session: null }, error: r2 }) : n2 ? this._returnResult({ data: { user: n2.user, session: n2 }, error: null }) : this._returnResult({ data: { user: null, session: null }, error: null });
        });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: { user: null, session: null }, error: e4 });
        throw e4;
      }
    }
    async _getSessionFromURL(e3, t2) {
      try {
        if (!B()) throw new Pn(`No browser detected.`);
        if (e3.error || e3.error_description || e3.error_code) throw new Pn(e3.error_description || `Error in URL with unspecified error_description`, { error: e3.error || `unspecified_error`, code: e3.error_code || `unspecified_code` });
        switch (t2) {
          case `implicit`:
            if (this.flowType === `pkce`) throw new In(`Not a valid PKCE flow url.`);
            break;
          case `pkce`:
            if (this.flowType === `implicit`) throw new Pn(`Not a valid implicit grant flow url.`);
            break;
          default:
        }
        if (t2 === `pkce`) {
          if (this._debug(`#_initialize()`, `begin`, `is PKCE flow`, true), !e3.code) throw new In(`No code detected.`);
          let { data: t3, error: n3 } = await this._exchangeCodeForSession(e3.code);
          if (n3) throw n3;
          let r3 = new URL(window.location.href);
          return r3.searchParams.delete(`code`), window.history.replaceState(window.history.state, ``, r3.toString()), { data: { session: t3.session, redirectType: t3.redirectType ?? null }, error: null };
        }
        let { provider_token: n2, provider_refresh_token: r2, access_token: i2, refresh_token: a2, expires_in: o2, expires_at: s2, token_type: c2 } = e3;
        if (!i2 || !o2 || !a2 || !c2) throw new Pn(`No session defined in URL`);
        let l2 = Math.round(Date.now() / 1e3), u2 = parseInt(o2), d2 = l2 + u2;
        s2 && (d2 = parseInt(s2));
        let f2 = d2 - l2;
        f2 * 1e3 <= wn && console.warn(`@supabase/gotrue-js: Session as retrieved from URL expires in ${f2}s, should have been closer to ${u2}s`);
        let p2 = d2 - u2;
        l2 - p2 >= 120 ? console.warn(`@supabase/gotrue-js: Session as retrieved from URL was issued over 120s ago, URL could be stale`, p2, d2, l2) : l2 - p2 < 0 && console.warn(`@supabase/gotrue-js: Session as retrieved from URL was issued in the future? Check the device clock for skew`, p2, d2, l2);
        let { data: m2, error: h2 } = await this._getUser(i2);
        if (h2) throw h2;
        let ee2 = { provider_token: n2, provider_refresh_token: r2, access_token: i2, expires_in: u2, expires_at: d2, refresh_token: a2, token_type: c2, user: m2.user };
        return window.location.hash = ``, this._debug(`#_getSessionFromURL()`, `clearing window.location.hash`), this._returnResult({ data: { session: ee2, redirectType: e3.type }, error: null });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: { session: null, redirectType: null }, error: e4 });
        throw e4;
      }
    }
    _isImplicitGrantCallback(e3) {
      return typeof this.detectSessionInUrl == `function` ? this.detectSessionInUrl(new URL(window.location.href), e3) : !!(e3.access_token || e3.error_description);
    }
    async _isPKCECallback(e3) {
      let t2 = await U(this.storage, `${this.storageKey}-code-verifier`);
      return !!(e3.code && t2);
    }
    async signOut(e3 = { scope: `global` }) {
      return await this.initializePromise, await this._acquireLock(this.lockAcquireTimeout, async () => await this._signOut(e3));
    }
    async _signOut({ scope: e3 } = { scope: `global` }) {
      return await this._useSession(async (t2) => {
        let { data: n2, error: r2 } = t2;
        if (r2 && !Mn(r2)) return this._returnResult({ error: r2 });
        let i2 = n2.session?.access_token;
        if (i2) {
          let { error: t3 } = await this.admin.signOut(i2, e3);
          if (t3 && !(jn(t3) && (t3.status === 404 || t3.status === 401 || t3.status === 403) || Mn(t3))) return this._returnResult({ error: t3 });
        }
        return e3 !== `others` && (await this._removeSession(), await W(this.storage, `${this.storageKey}-code-verifier`)), this._returnResult({ error: null });
      });
    }
    onAuthStateChange(e3) {
      let t2 = tr(), n2 = { id: t2, callback: e3, unsubscribe: () => {
        this._debug(`#unsubscribe()`, `state change callback with id removed`, t2), this.stateChangeEmitters.delete(t2);
      } };
      return this._debug(`#onAuthStateChange()`, `registered callback with id`, t2), this.stateChangeEmitters.set(t2, n2), (async () => {
        await this.initializePromise, await this._acquireLock(this.lockAcquireTimeout, async () => {
          this._emitInitialSession(t2);
        });
      })(), { data: { subscription: n2 } };
    }
    async _emitInitialSession(e3) {
      return await this._useSession(async (t2) => {
        try {
          let { data: { session: n2 }, error: r2 } = t2;
          if (r2) throw r2;
          await this.stateChangeEmitters.get(e3)?.callback(`INITIAL_SESSION`, n2), this._debug(`INITIAL_SESSION`, `callback id`, e3, `session`, n2);
        } catch (t3) {
          await this.stateChangeEmitters.get(e3)?.callback(`INITIAL_SESSION`, null), this._debug(`INITIAL_SESSION`, `callback id`, e3, `error`, t3), Mn(t3) ? console.warn(t3) : console.error(t3);
        }
      });
    }
    async resetPasswordForEmail(e3, t2 = {}) {
      let n2 = null, r2 = null;
      this.flowType === `pkce` && ([n2, r2] = await G(this.storage, this.storageKey, true));
      try {
        return await Y(this.fetch, `POST`, `${this.url}/recover`, { body: { email: e3, code_challenge: n2, code_challenge_method: r2, gotrue_meta_security: { captcha_token: t2.captchaToken } }, headers: this.headers, redirectTo: t2.redirectTo });
      } catch (e4) {
        if (await W(this.storage, `${this.storageKey}-code-verifier`), N(e4)) return this._returnResult({ data: null, error: e4 });
        throw e4;
      }
    }
    async getUserIdentities() {
      try {
        let { data: e3, error: t2 } = await this.getUser();
        if (t2) throw t2;
        return this._returnResult({ data: { identities: e3.user.identities ?? [] }, error: null });
      } catch (e3) {
        if (N(e3)) return this._returnResult({ data: null, error: e3 });
        throw e3;
      }
    }
    async linkIdentity(e3) {
      return `token` in e3 ? this.linkIdentityIdToken(e3) : this.linkIdentityOAuth(e3);
    }
    async linkIdentityOAuth(e3) {
      try {
        let { data: t2, error: n2 } = await this._useSession(async (t3) => {
          let { data: n3, error: r2 } = t3;
          if (r2) throw r2;
          let i2 = await this._getUrlForProvider(`${this.url}/user/identities/authorize`, e3.provider, { redirectTo: e3.options?.redirectTo, scopes: e3.options?.scopes, queryParams: e3.options?.queryParams, skipBrowserRedirect: true });
          return await Y(this.fetch, `GET`, i2, { headers: this.headers, jwt: n3.session?.access_token ?? void 0 });
        });
        if (n2) throw n2;
        return B() && !e3.options?.skipBrowserRedirect && window.location.assign(t2?.url), this._returnResult({ data: { provider: e3.provider, url: t2?.url }, error: null });
      } catch (t2) {
        if (N(t2)) return this._returnResult({ data: { provider: e3.provider, url: null }, error: t2 });
        throw t2;
      }
    }
    async linkIdentityIdToken(e3) {
      return await this._useSession(async (t2) => {
        try {
          let { error: n2, data: { session: r2 } } = t2;
          if (n2) throw n2;
          let { options: i2, provider: a2, token: o2, access_token: s2, nonce: c2 } = e3, { data: l2, error: u2 } = await Y(this.fetch, `POST`, `${this.url}/token?grant_type=id_token`, { headers: this.headers, jwt: r2?.access_token ?? void 0, body: { provider: a2, id_token: o2, access_token: s2, nonce: c2, link_identity: true, gotrue_meta_security: { captcha_token: i2?.captchaToken } }, xform: X });
          return u2 ? this._returnResult({ data: { user: null, session: null }, error: u2 }) : !l2 || !l2.session || !l2.user ? this._returnResult({ data: { user: null, session: null }, error: new L() }) : (l2.session && (await this._saveSession(l2.session), await this._notifyAllSubscribers(`USER_UPDATED`, l2.session)), this._returnResult({ data: l2, error: u2 }));
        } catch (e4) {
          if (await W(this.storage, `${this.storageKey}-code-verifier`), N(e4)) return this._returnResult({ data: { user: null, session: null }, error: e4 });
          throw e4;
        }
      });
    }
    async unlinkIdentity(e3) {
      try {
        return await this._useSession(async (t2) => {
          let { data: n2, error: r2 } = t2;
          if (r2) throw r2;
          return await Y(this.fetch, `DELETE`, `${this.url}/user/identities/${e3.identity_id}`, { headers: this.headers, jwt: n2.session?.access_token ?? void 0 });
        });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: null, error: e4 });
        throw e4;
      }
    }
    async _refreshAccessToken(e3) {
      let t2 = `#_refreshAccessToken(${e3.substring(0, 5)}...)`;
      this._debug(t2, `begin`);
      try {
        let n2 = Date.now();
        return await lr(async (n3) => (n3 > 0 && await cr(200 * 2 ** (n3 - 1)), this._debug(t2, `refreshing attempt`, n3), await Y(this.fetch, `POST`, `${this.url}/token?grant_type=refresh_token`, { body: { refresh_token: e3 }, headers: this.headers, xform: X })), (e4, t3) => {
          let r2 = 200 * 2 ** e4;
          return t3 && Bn(t3) && Date.now() + r2 - n2 < wn;
        });
      } catch (e4) {
        if (this._debug(t2, `error`, e4), N(e4)) return this._returnResult({ data: { session: null, user: null }, error: e4 });
        throw e4;
      } finally {
        this._debug(t2, `end`);
      }
    }
    _isValidSession(e3) {
      return typeof e3 == `object` && !!e3 && `access_token` in e3 && `refresh_token` in e3 && `expires_at` in e3;
    }
    async _handleProviderSignIn(e3, t2) {
      let n2 = await this._getUrlForProvider(`${this.url}/authorize`, e3, { redirectTo: t2.redirectTo, scopes: t2.scopes, queryParams: t2.queryParams });
      return this._debug(`#_handleProviderSignIn()`, `provider`, e3, `options`, t2, `url`, n2), B() && !t2.skipBrowserRedirect && window.location.assign(n2), { data: { provider: e3, url: n2 }, error: null };
    }
    async _recoverAndRefresh() {
      let e3 = `#_recoverAndRefresh()`;
      this._debug(e3, `begin`);
      try {
        let t2 = await U(this.storage, this.storageKey);
        if (t2 && this.userStorage) {
          let e4 = await U(this.userStorage, this.storageKey + `-user`);
          !this.storage.isServer && Object.is(this.storage, this.userStorage) && !e4 && (e4 = { user: t2.user }, await H(this.userStorage, this.storageKey + `-user`, e4)), t2.user = e4?.user ?? yr();
        } else if (t2 && !t2.user && !t2.user) {
          let e4 = await U(this.storage, this.storageKey + `-user`);
          e4 && e4?.user ? (t2.user = e4.user, await W(this.storage, this.storageKey + `-user`), await H(this.storage, this.storageKey, t2)) : t2.user = yr();
        }
        if (this._debug(e3, `session from storage`, t2), !this._isValidSession(t2)) {
          this._debug(e3, `session is not valid`), t2 !== null && await this._removeSession();
          return;
        }
        let n2 = (t2.expires_at ?? 1 / 0) * 1e3 - Date.now() < Tn;
        if (this._debug(e3, `session has${n2 ? `` : ` not`} expired with margin of ${Tn}s`), n2) {
          if (this.autoRefreshToken && t2.refresh_token) {
            let { error: n3 } = await this._callRefreshToken(t2.refresh_token);
            n3 && (console.error(n3), Bn(n3) || (this._debug(e3, `refresh failed with a non-retryable error, removing the session`, n3), await this._removeSession()));
          }
        } else if (t2.user && t2.user.__isUserNotAvailableProxy === true) try {
          let { data: n3, error: r2 } = await this._getUser(t2.access_token);
          !r2 && n3?.user ? (t2.user = n3.user, await this._saveSession(t2), await this._notifyAllSubscribers(`SIGNED_IN`, t2)) : this._debug(e3, `could not get user data, skipping SIGNED_IN notification`);
        } catch (t3) {
          console.error(`Error getting user data:`, t3), this._debug(e3, `error getting user data, skipping SIGNED_IN notification`, t3);
        }
        else await this._notifyAllSubscribers(`SIGNED_IN`, t2);
      } catch (t2) {
        this._debug(e3, `error`, t2), console.error(t2);
        return;
      } finally {
        this._debug(e3, `end`);
      }
    }
    async _callRefreshToken(e3) {
      var t2, n2;
      if (!e3) throw new I();
      if (this.refreshingDeferred) return this.refreshingDeferred.promise;
      let r2 = `#_callRefreshToken(${e3.substring(0, 5)}...)`;
      this._debug(r2, `begin`);
      try {
        this.refreshingDeferred = new or();
        let { data: t3, error: n3 } = await this._refreshAccessToken(e3);
        if (n3) throw n3;
        if (!t3.session) throw new I();
        await this._saveSession(t3.session), await this._notifyAllSubscribers(`TOKEN_REFRESHED`, t3.session);
        let r3 = { data: t3.session, error: null };
        return this.refreshingDeferred.resolve(r3), r3;
      } catch (e4) {
        if (this._debug(r2, `error`, e4), N(e4)) {
          let n3 = { data: null, error: e4 };
          return Bn(e4) || await this._removeSession(), (t2 = this.refreshingDeferred) == null || t2.resolve(n3), n3;
        }
        throw (n2 = this.refreshingDeferred) == null || n2.reject(e4), e4;
      } finally {
        this.refreshingDeferred = null, this._debug(r2, `end`);
      }
    }
    async _notifyAllSubscribers(e3, t2, n2 = true) {
      let r2 = `#_notifyAllSubscribers(${e3})`;
      this._debug(r2, `begin`, t2, `broadcast = ${n2}`);
      try {
        this.broadcastChannel && n2 && this.broadcastChannel.postMessage({ event: e3, session: t2 });
        let r3 = [], i2 = Array.from(this.stateChangeEmitters.values()).map(async (n3) => {
          try {
            await n3.callback(e3, t2);
          } catch (e4) {
            r3.push(e4);
          }
        });
        if (await Promise.all(i2), r3.length > 0) {
          for (let e4 = 0; e4 < r3.length; e4 += 1) console.error(r3[e4]);
          throw r3[0];
        }
      } finally {
        this._debug(r2, `end`);
      }
    }
    async _saveSession(e3) {
      this._debug(`#_saveSession()`, e3), this.suppressGetSessionWarning = true, await W(this.storage, `${this.storageKey}-code-verifier`);
      let t2 = Object.assign({}, e3), n2 = t2.user && t2.user.__isUserNotAvailableProxy === true;
      if (this.userStorage) {
        !n2 && t2.user && await H(this.userStorage, this.storageKey + `-user`, { user: t2.user });
        let e4 = Object.assign({}, t2);
        delete e4.user;
        let r2 = xr(e4);
        await H(this.storage, this.storageKey, r2);
      } else {
        let e4 = xr(t2);
        await H(this.storage, this.storageKey, e4);
      }
    }
    async _removeSession() {
      this._debug(`#_removeSession()`), this.suppressGetSessionWarning = false, await W(this.storage, this.storageKey), await W(this.storage, this.storageKey + `-code-verifier`), await W(this.storage, this.storageKey + `-user`), this.userStorage && await W(this.userStorage, this.storageKey + `-user`), await this._notifyAllSubscribers(`SIGNED_OUT`, null);
    }
    _removeVisibilityChangedCallback() {
      this._debug(`#_removeVisibilityChangedCallback()`);
      let e3 = this.visibilityChangedCallback;
      this.visibilityChangedCallback = null;
      try {
        e3 && B() && window != null && window.removeEventListener && window.removeEventListener(`visibilitychange`, e3);
      } catch (e4) {
        console.error(`removing visibilitychange callback failed`, e4);
      }
    }
    async _startAutoRefresh() {
      await this._stopAutoRefresh(), this._debug(`#_startAutoRefresh()`);
      let e3 = setInterval(() => this._autoRefreshTokenTick(), wn);
      this.autoRefreshTicker = e3, e3 && typeof e3 == `object` && typeof e3.unref == `function` ? e3.unref() : typeof Deno < `u` && typeof Deno.unrefTimer == `function` && Deno.unrefTimer(e3);
      let t2 = setTimeout(async () => {
        await this.initializePromise, await this._autoRefreshTokenTick();
      }, 0);
      this.autoRefreshTickTimeout = t2, t2 && typeof t2 == `object` && typeof t2.unref == `function` ? t2.unref() : typeof Deno < `u` && typeof Deno.unrefTimer == `function` && Deno.unrefTimer(t2);
    }
    async _stopAutoRefresh() {
      this._debug(`#_stopAutoRefresh()`);
      let e3 = this.autoRefreshTicker;
      this.autoRefreshTicker = null, e3 && clearInterval(e3);
      let t2 = this.autoRefreshTickTimeout;
      this.autoRefreshTickTimeout = null, t2 && clearTimeout(t2);
    }
    async startAutoRefresh() {
      this._removeVisibilityChangedCallback(), await this._startAutoRefresh();
    }
    async stopAutoRefresh() {
      this._removeVisibilityChangedCallback(), await this._stopAutoRefresh();
    }
    async _autoRefreshTokenTick() {
      this._debug(`#_autoRefreshTokenTick()`, `begin`);
      try {
        await this._acquireLock(0, async () => {
          try {
            let e3 = Date.now();
            try {
              return await this._useSession(async (t2) => {
                let { data: { session: n2 } } = t2;
                if (!n2 || !n2.refresh_token || !n2.expires_at) {
                  this._debug(`#_autoRefreshTokenTick()`, `no session`);
                  return;
                }
                let r2 = Math.floor((n2.expires_at * 1e3 - e3) / wn);
                this._debug(`#_autoRefreshTokenTick()`, `access token expires in ${r2} ticks, a tick lasts ${wn}ms, refresh threshold is 3 ticks`), r2 <= 3 && await this._callRefreshToken(n2.refresh_token);
              });
            } catch (e4) {
              console.error(`Auto refresh tick failed with error. This is likely a transient error.`, e4);
            }
          } finally {
            this._debug(`#_autoRefreshTokenTick()`, `end`);
          }
        });
      } catch (e3) {
        if (e3 instanceof Pr) this._debug(`auto refresh token tick lock not available`);
        else throw e3;
      }
    }
    async _handleVisibilityChange() {
      if (this._debug(`#_handleVisibilityChange()`), !B() || !(window != null && window.addEventListener)) return this.autoRefreshToken && this.startAutoRefresh(), false;
      try {
        this.visibilityChangedCallback = async () => {
          try {
            await this._onVisibilityChanged(false);
          } catch (e3) {
            this._debug(`#visibilityChangedCallback`, `error`, e3);
          }
        }, window == null || window.addEventListener(`visibilitychange`, this.visibilityChangedCallback), await this._onVisibilityChanged(true);
      } catch (e3) {
        console.error(`_handleVisibilityChange`, e3);
      }
    }
    async _onVisibilityChanged(e3) {
      let t2 = `#_onVisibilityChanged(${e3})`;
      this._debug(t2, `visibilityState`, document.visibilityState), document.visibilityState === `visible` ? (this.autoRefreshToken && this._startAutoRefresh(), e3 || (await this.initializePromise, await this._acquireLock(this.lockAcquireTimeout, async () => {
        if (document.visibilityState !== `visible`) {
          this._debug(t2, `acquired the lock to recover the session, but the browser visibilityState is no longer visible, aborting`);
          return;
        }
        await this._recoverAndRefresh();
      }))) : document.visibilityState === `hidden` && this.autoRefreshToken && this._stopAutoRefresh();
    }
    async _getUrlForProvider(e3, t2, n2) {
      let r2 = [`provider=${encodeURIComponent(t2)}`];
      if (n2?.redirectTo && r2.push(`redirect_to=${encodeURIComponent(n2.redirectTo)}`), n2?.scopes && r2.push(`scopes=${encodeURIComponent(n2.scopes)}`), this.flowType === `pkce`) {
        let [e4, t3] = await G(this.storage, this.storageKey), n3 = new URLSearchParams({ code_challenge: `${encodeURIComponent(e4)}`, code_challenge_method: `${encodeURIComponent(t3)}` });
        r2.push(n3.toString());
      }
      if (n2?.queryParams) {
        let e4 = new URLSearchParams(n2.queryParams);
        r2.push(e4.toString());
      }
      return n2?.skipBrowserRedirect && r2.push(`skip_http_redirect=${n2.skipBrowserRedirect}`), `${e3}?${r2.join(`&`)}`;
    }
    async _unenroll(e3) {
      try {
        return await this._useSession(async (t2) => {
          let { data: n2, error: r2 } = t2;
          return r2 ? this._returnResult({ data: null, error: r2 }) : await Y(this.fetch, `DELETE`, `${this.url}/factors/${e3.factorId}`, { headers: this.headers, jwt: n2?.session?.access_token });
        });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: null, error: e4 });
        throw e4;
      }
    }
    async _enroll(e3) {
      try {
        return await this._useSession(async (t2) => {
          let { data: n2, error: r2 } = t2;
          if (r2) return this._returnResult({ data: null, error: r2 });
          let i2 = Object.assign({ friendly_name: e3.friendlyName, factor_type: e3.factorType }, e3.factorType === `phone` ? { phone: e3.phone } : e3.factorType === `totp` ? { issuer: e3.issuer } : {}), { data: a2, error: o2 } = await Y(this.fetch, `POST`, `${this.url}/factors`, { body: i2, headers: this.headers, jwt: n2?.session?.access_token });
          return o2 ? this._returnResult({ data: null, error: o2 }) : (e3.factorType === `totp` && a2.type === `totp` && a2?.totp?.qr_code && (a2.totp.qr_code = `data:image/svg+xml;utf-8,${a2.totp.qr_code}`), this._returnResult({ data: a2, error: null }));
        });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: null, error: e4 });
        throw e4;
      }
    }
    async _verify(e3) {
      return this._acquireLock(this.lockAcquireTimeout, async () => {
        try {
          return await this._useSession(async (t2) => {
            let { data: n2, error: r2 } = t2;
            if (r2) return this._returnResult({ data: null, error: r2 });
            let i2 = Object.assign({ challenge_id: e3.challengeId }, `webauthn` in e3 ? { webauthn: Object.assign(Object.assign({}, e3.webauthn), { credential_response: e3.webauthn.type === `create` ? Zr(e3.webauthn.credential_response) : Qr(e3.webauthn.credential_response) }) } : { code: e3.code }), { data: a2, error: o2 } = await Y(this.fetch, `POST`, `${this.url}/factors/${e3.factorId}/verify`, { body: i2, headers: this.headers, jwt: n2?.session?.access_token });
            return o2 ? this._returnResult({ data: null, error: o2 }) : (await this._saveSession(Object.assign({ expires_at: Math.round(Date.now() / 1e3) + a2.expires_in }, a2)), await this._notifyAllSubscribers(`MFA_CHALLENGE_VERIFIED`, a2), this._returnResult({ data: a2, error: o2 }));
          });
        } catch (e4) {
          if (N(e4)) return this._returnResult({ data: null, error: e4 });
          throw e4;
        }
      });
    }
    async _challenge(e3) {
      return this._acquireLock(this.lockAcquireTimeout, async () => {
        try {
          return await this._useSession(async (t2) => {
            let { data: n2, error: r2 } = t2;
            if (r2) return this._returnResult({ data: null, error: r2 });
            let i2 = await Y(this.fetch, `POST`, `${this.url}/factors/${e3.factorId}/challenge`, { body: e3, headers: this.headers, jwt: n2?.session?.access_token });
            if (i2.error) return i2;
            let { data: a2 } = i2;
            if (a2.type !== `webauthn`) return { data: a2, error: null };
            switch (a2.webauthn.type) {
              case `create`:
                return { data: Object.assign(Object.assign({}, a2), { webauthn: Object.assign(Object.assign({}, a2.webauthn), { credential_options: Object.assign(Object.assign({}, a2.webauthn.credential_options), { publicKey: Yr(a2.webauthn.credential_options.publicKey) }) }) }), error: null };
              case `request`:
                return { data: Object.assign(Object.assign({}, a2), { webauthn: Object.assign(Object.assign({}, a2.webauthn), { credential_options: Object.assign(Object.assign({}, a2.webauthn.credential_options), { publicKey: Xr(a2.webauthn.credential_options.publicKey) }) }) }), error: null };
            }
          });
        } catch (e4) {
          if (N(e4)) return this._returnResult({ data: null, error: e4 });
          throw e4;
        }
      });
    }
    async _challengeAndVerify(e3) {
      let { data: t2, error: n2 } = await this._challenge({ factorId: e3.factorId });
      return n2 ? this._returnResult({ data: null, error: n2 }) : await this._verify({ factorId: e3.factorId, challengeId: t2.id, code: e3.code });
    }
    async _listFactors() {
      let { data: { user: e3 }, error: t2 } = await this.getUser();
      if (t2) return { data: null, error: t2 };
      let n2 = { all: [], phone: [], totp: [], webauthn: [] };
      for (let t3 of e3?.factors ?? []) n2.all.push(t3), t3.status === `verified` && n2[t3.factor_type].push(t3);
      return { data: n2, error: null };
    }
    async _getAuthenticatorAssuranceLevel(e3) {
      if (e3) try {
        let { payload: t3 } = sr(e3), n3 = null;
        t3.aal && (n3 = t3.aal);
        let r3 = n3, { data: { user: i3 }, error: a3 } = await this.getUser(e3);
        if (a3) return this._returnResult({ data: null, error: a3 });
        (i3?.factors?.filter((e4) => e4.status === `verified`) ?? []).length > 0 && (r3 = `aal2`);
        let o3 = t3.amr || [];
        return { data: { currentLevel: n3, nextLevel: r3, currentAuthenticationMethods: o3 }, error: null };
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: null, error: e4 });
        throw e4;
      }
      let { data: { session: t2 }, error: n2 } = await this.getSession();
      if (n2) return this._returnResult({ data: null, error: n2 });
      if (!t2) return { data: { currentLevel: null, nextLevel: null, currentAuthenticationMethods: [] }, error: null };
      let { payload: r2 } = sr(t2.access_token), i2 = null;
      r2.aal && (i2 = r2.aal);
      let a2 = i2;
      (t2.user.factors?.filter((e4) => e4.status === `verified`) ?? []).length > 0 && (a2 = `aal2`);
      let o2 = r2.amr || [];
      return { data: { currentLevel: i2, nextLevel: a2, currentAuthenticationMethods: o2 }, error: null };
    }
    async _getAuthorizationDetails(e3) {
      try {
        return await this._useSession(async (t2) => {
          let { data: { session: n2 }, error: r2 } = t2;
          return r2 ? this._returnResult({ data: null, error: r2 }) : n2 ? await Y(this.fetch, `GET`, `${this.url}/oauth/authorizations/${e3}`, { headers: this.headers, jwt: n2.access_token, xform: (e4) => ({ data: e4, error: null }) }) : this._returnResult({ data: null, error: new I() });
        });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: null, error: e4 });
        throw e4;
      }
    }
    async _approveAuthorization(e3, t2) {
      try {
        return await this._useSession(async (n2) => {
          let { data: { session: r2 }, error: i2 } = n2;
          if (i2) return this._returnResult({ data: null, error: i2 });
          if (!r2) return this._returnResult({ data: null, error: new I() });
          let a2 = await Y(this.fetch, `POST`, `${this.url}/oauth/authorizations/${e3}/consent`, { headers: this.headers, jwt: r2.access_token, body: { action: `approve` }, xform: (e4) => ({ data: e4, error: null }) });
          return a2.data && a2.data.redirect_url && B() && !t2?.skipBrowserRedirect && window.location.assign(a2.data.redirect_url), a2;
        });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: null, error: e4 });
        throw e4;
      }
    }
    async _denyAuthorization(e3, t2) {
      try {
        return await this._useSession(async (n2) => {
          let { data: { session: r2 }, error: i2 } = n2;
          if (i2) return this._returnResult({ data: null, error: i2 });
          if (!r2) return this._returnResult({ data: null, error: new I() });
          let a2 = await Y(this.fetch, `POST`, `${this.url}/oauth/authorizations/${e3}/consent`, { headers: this.headers, jwt: r2.access_token, body: { action: `deny` }, xform: (e4) => ({ data: e4, error: null }) });
          return a2.data && a2.data.redirect_url && B() && !t2?.skipBrowserRedirect && window.location.assign(a2.data.redirect_url), a2;
        });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: null, error: e4 });
        throw e4;
      }
    }
    async _listOAuthGrants() {
      try {
        return await this._useSession(async (e3) => {
          let { data: { session: t2 }, error: n2 } = e3;
          return n2 ? this._returnResult({ data: null, error: n2 }) : t2 ? await Y(this.fetch, `GET`, `${this.url}/user/oauth/grants`, { headers: this.headers, jwt: t2.access_token, xform: (e4) => ({ data: e4, error: null }) }) : this._returnResult({ data: null, error: new I() });
        });
      } catch (e3) {
        if (N(e3)) return this._returnResult({ data: null, error: e3 });
        throw e3;
      }
    }
    async _revokeOAuthGrant(e3) {
      try {
        return await this._useSession(async (t2) => {
          let { data: { session: n2 }, error: r2 } = t2;
          return r2 ? this._returnResult({ data: null, error: r2 }) : n2 ? (await Y(this.fetch, `DELETE`, `${this.url}/user/oauth/grants`, { headers: this.headers, jwt: n2.access_token, query: { client_id: e3.clientId }, noResolveJson: true }), { data: {}, error: null }) : this._returnResult({ data: null, error: new I() });
        });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: null, error: e4 });
        throw e4;
      }
    }
    async fetchJwk(e3, t2 = { keys: [] }) {
      let n2 = t2.keys.find((t3) => t3.kid === e3);
      if (n2) return n2;
      let r2 = Date.now();
      if (n2 = this.jwks.keys.find((t3) => t3.kid === e3), n2 && this.jwks_cached_at + 6e5 > r2) return n2;
      let { data: i2, error: a2 } = await Y(this.fetch, `GET`, `${this.url}/.well-known/jwks.json`, { headers: this.headers });
      if (a2) throw a2;
      return !i2.keys || i2.keys.length === 0 || (this.jwks = i2, this.jwks_cached_at = r2, n2 = i2.keys.find((t3) => t3.kid === e3), !n2) ? null : n2;
    }
    async getClaims(e3, t2 = {}) {
      try {
        let n2 = e3;
        if (!n2) {
          let { data: e4, error: t3 } = await this.getSession();
          if (t3 || !e4.session) return this._returnResult({ data: null, error: t3 });
          n2 = e4.session.access_token;
        }
        let { header: r2, payload: i2, signature: a2, raw: { header: o2, payload: s2 } } = sr(n2);
        t2?.allowExpired || gr(i2.exp);
        let c2 = !r2.alg || r2.alg.startsWith(`HS`) || !r2.kid || !(`crypto` in globalThis && `subtle` in globalThis.crypto) ? null : await this.fetchJwk(r2.kid, t2?.keys ? { keys: t2.keys } : t2?.jwks);
        if (!c2) {
          let { error: e4 } = await this.getUser(n2);
          if (e4) throw e4;
          return { data: { claims: i2, header: r2, signature: a2 }, error: null };
        }
        let l2 = _r(r2.alg), u2 = await crypto.subtle.importKey(`jwk`, c2, l2, true, [`verify`]);
        if (!await crypto.subtle.verify(l2, u2, a2, $n(`${o2}.${s2}`))) throw new Un(`Invalid JWT signature`);
        return { data: { claims: i2, header: r2, signature: a2 }, error: null };
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: null, error: e4 });
        throw e4;
      }
    }
    async signInWithPasskey(e3) {
      q(this.experimental);
      try {
        if (!ei()) return this._returnResult({ data: null, error: new P(`Browser does not support WebAuthn`, null) });
        let { data: t2, error: n2 } = await this._startPasskeyAuthentication({ options: { captchaToken: e3?.options?.captchaToken } });
        if (n2 || !t2) return this._returnResult({ data: null, error: n2 });
        let { data: r2, error: i2 } = await ni({ publicKey: Xr(t2.options), signal: e3?.options?.signal ?? Jr.createNewAbortSignal() });
        if (i2 || !r2) return this._returnResult({ data: null, error: i2 ?? new P(`WebAuthn ceremony failed`, null) });
        let a2 = Qr(r2);
        return this._verifyPasskeyAuthentication({ challengeId: t2.challenge_id, credential: a2 });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: null, error: e4 });
        throw e4;
      }
    }
    async registerPasskey(e3) {
      q(this.experimental);
      try {
        if (!ei()) return this._returnResult({ data: null, error: new P(`Browser does not support WebAuthn`, null) });
        let { data: t2, error: n2 } = await this._startPasskeyRegistration();
        if (n2 || !t2) return this._returnResult({ data: null, error: n2 });
        let { data: r2, error: i2 } = await ti({ publicKey: Yr(t2.options), signal: e3?.options?.signal ?? Jr.createNewAbortSignal() });
        if (i2 || !r2) return this._returnResult({ data: null, error: i2 ?? new P(`WebAuthn ceremony failed`, null) });
        let a2 = Zr(r2);
        return this._verifyPasskeyRegistration({ challengeId: t2.challenge_id, credential: a2 });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: null, error: e4 });
        throw e4;
      }
    }
    async _startPasskeyRegistration() {
      q(this.experimental);
      try {
        return await this._useSession(async (e3) => {
          let { data: { session: t2 }, error: n2 } = e3;
          if (n2) return this._returnResult({ data: null, error: n2 });
          if (!t2) return this._returnResult({ data: null, error: new I() });
          let { data: r2, error: i2 } = await Y(this.fetch, `POST`, `${this.url}/passkeys/registration/options`, { headers: this.headers, jwt: t2.access_token, body: {} });
          return i2 ? this._returnResult({ data: null, error: i2 }) : this._returnResult({ data: r2, error: null });
        });
      } catch (e3) {
        if (N(e3)) return this._returnResult({ data: null, error: e3 });
        throw e3;
      }
    }
    async _verifyPasskeyRegistration(e3) {
      q(this.experimental);
      try {
        return await this._useSession(async (t2) => {
          let { data: { session: n2 }, error: r2 } = t2;
          if (r2) return this._returnResult({ data: null, error: r2 });
          if (!n2) return this._returnResult({ data: null, error: new I() });
          let { data: i2, error: a2 } = await Y(this.fetch, `POST`, `${this.url}/passkeys/registration/verify`, { headers: this.headers, jwt: n2.access_token, body: { challenge_id: e3.challengeId, credential: e3.credential } });
          return a2 ? this._returnResult({ data: null, error: a2 }) : this._returnResult({ data: i2, error: null });
        });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: null, error: e4 });
        throw e4;
      }
    }
    async _startPasskeyAuthentication(e3) {
      q(this.experimental);
      try {
        let { data: t2, error: n2 } = await Y(this.fetch, `POST`, `${this.url}/passkeys/authentication/options`, { headers: this.headers, body: { gotrue_meta_security: { captcha_token: e3?.options?.captchaToken } } });
        return n2 ? this._returnResult({ data: null, error: n2 }) : this._returnResult({ data: t2, error: null });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: null, error: e4 });
        throw e4;
      }
    }
    async _verifyPasskeyAuthentication(e3) {
      q(this.experimental);
      try {
        let { data: t2, error: n2 } = await Y(this.fetch, `POST`, `${this.url}/passkeys/authentication/verify`, { headers: this.headers, body: { challenge_id: e3.challengeId, credential: e3.credential }, xform: X });
        return n2 ? this._returnResult({ data: null, error: n2 }) : (t2.session && (await this._saveSession(t2.session), await this._notifyAllSubscribers(`SIGNED_IN`, t2.session)), this._returnResult({ data: t2, error: null }));
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: null, error: e4 });
        throw e4;
      }
    }
    async _listPasskeys() {
      q(this.experimental);
      try {
        return await this._useSession(async (e3) => {
          let { data: { session: t2 }, error: n2 } = e3;
          if (n2) return this._returnResult({ data: null, error: n2 });
          if (!t2) return this._returnResult({ data: null, error: new I() });
          let { data: r2, error: i2 } = await Y(this.fetch, `GET`, `${this.url}/passkeys`, { headers: this.headers, jwt: t2.access_token, xform: (e4) => ({ data: e4, error: null }) });
          return i2 ? this._returnResult({ data: null, error: i2 }) : this._returnResult({ data: r2, error: null });
        });
      } catch (e3) {
        if (N(e3)) return this._returnResult({ data: null, error: e3 });
        throw e3;
      }
    }
    async _updatePasskey(e3) {
      q(this.experimental);
      try {
        return await this._useSession(async (t2) => {
          let { data: { session: n2 }, error: r2 } = t2;
          if (r2) return this._returnResult({ data: null, error: r2 });
          if (!n2) return this._returnResult({ data: null, error: new I() });
          let { data: i2, error: a2 } = await Y(this.fetch, `PATCH`, `${this.url}/passkeys/${e3.passkeyId}`, { headers: this.headers, jwt: n2.access_token, body: { friendly_name: e3.friendlyName } });
          return a2 ? this._returnResult({ data: null, error: a2 }) : this._returnResult({ data: i2, error: null });
        });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: null, error: e4 });
        throw e4;
      }
    }
    async _deletePasskey(e3) {
      q(this.experimental);
      try {
        return await this._useSession(async (t2) => {
          let { data: { session: n2 }, error: r2 } = t2;
          if (r2) return this._returnResult({ data: null, error: r2 });
          if (!n2) return this._returnResult({ data: null, error: new I() });
          let { error: i2 } = await Y(this.fetch, `DELETE`, `${this.url}/passkeys/${e3.passkeyId}`, { headers: this.headers, jwt: n2.access_token, noResolveJson: true });
          return i2 ? this._returnResult({ data: null, error: i2 }) : this._returnResult({ data: null, error: null });
        });
      } catch (e4) {
        if (N(e4)) return this._returnResult({ data: null, error: e4 });
        throw e4;
      }
    }
  };
  fi.nextInstanceID = {};
  var pi = fi, mi = Mr, hi = pi, gi = class extends hi {
    constructor(e2) {
      super(e2);
    }
  }, _i = class {
    constructor(e2, t2, n2) {
      this.supabaseUrl = e2, this.supabaseKey = t2;
      let r2 = Sn(e2);
      if (!t2) throw Error(`supabaseKey is required.`);
      this.realtimeUrl = new URL(`realtime/v1`, r2), this.realtimeUrl.protocol = this.realtimeUrl.protocol.replace(`http`, `ws`), this.authUrl = new URL(`auth/v1`, r2), this.storageUrl = new URL(`storage/v1`, r2), this.functionsUrl = new URL(`functions/v1`, r2);
      let i2 = `sb-${r2.hostname.split(`.`)[0]}-auth-token`, a2 = { db: rn, realtime: on, auth: { ...an, storageKey: i2 }, global: nn, tracePropagation: sn }, o2 = xn(n2 ?? {}, a2);
      this.settings = o2, this.storageKey = o2.auth.storageKey ?? ``, this.headers = o2.global.headers ?? {}, o2.accessToken ? (this.accessToken = o2.accessToken, this.auth = new Proxy({}, { get: (e3, t3) => {
        throw Error(`@supabase/supabase-js: Supabase Client is configured with the accessToken option, accessing supabase.auth.${String(t3)} is not possible`);
      } })) : this.auth = this._initSupabaseAuthClient(o2.auth ?? {}, this.headers, o2.global.fetch), this.fetch = _n(t2, e2, this._getAccessToken.bind(this), o2.global.fetch, o2.tracePropagation), this.realtime = this._initRealtimeClient({ headers: this.headers, accessToken: this._getAccessToken.bind(this), fetch: this.fetch, ...o2.realtime }), this.accessToken && Promise.resolve(this.accessToken()).then((e3) => this.realtime.setAuth(e3)).catch((e3) => console.warn(`Failed to set initial Realtime auth token:`, e3)), this.rest = new le(new URL(`rest/v1`, r2).href, { headers: this.headers, schema: o2.db.schema, fetch: this.fetch, timeout: o2.db.timeout, urlLengthLimit: o2.db.urlLengthLimit }), this.storage = new en(this.storageUrl.href, this.headers, this.fetch, n2?.storage), o2.accessToken || this._listenForAuthEvents();
    }
    get functions() {
      return new l(this.functionsUrl.href, { headers: this.headers, customFetch: this.fetch });
    }
    from(e2) {
      return this.rest.from(e2);
    }
    schema(e2) {
      return this.rest.schema(e2);
    }
    rpc(e2, t2 = {}, n2 = { head: false, get: false, count: void 0 }) {
      return this.rest.rpc(e2, t2, n2);
    }
    channel(e2, t2 = { config: {} }) {
      return this.realtime.channel(e2, t2);
    }
    getChannels() {
      return this.realtime.getChannels();
    }
    removeChannel(e2) {
      return this.realtime.removeChannel(e2);
    }
    removeAllChannels() {
      return this.realtime.removeAllChannels();
    }
    async _getAccessToken() {
      if (this.accessToken) return await this.accessToken();
      let { data: e2 } = await this.auth.getSession();
      return e2.session?.access_token ?? this.supabaseKey;
    }
    _initSupabaseAuthClient({ autoRefreshToken: e2, persistSession: t2, detectSessionInUrl: n2, storage: r2, userStorage: i2, storageKey: a2, flowType: o2, lock: s2, debug: c2, throwOnError: l2, experimental: u2, lockAcquireTimeout: d2, skipAutoInitialize: f2 }, p2, m2) {
      let h2 = { Authorization: `Bearer ${this.supabaseKey}`, apikey: `${this.supabaseKey}` };
      return new gi({ url: this.authUrl.href, headers: { ...h2, ...p2 }, storageKey: a2, autoRefreshToken: e2, persistSession: t2, detectSessionInUrl: n2, storage: r2, userStorage: i2, flowType: o2, lock: s2, debug: c2, throwOnError: l2, experimental: u2, fetch: m2, lockAcquireTimeout: d2, skipAutoInitialize: f2, hasCustomAuthorizationHeader: Object.keys(this.headers).some((e3) => e3.toLowerCase() === `authorization`) });
    }
    _initRealtimeClient(e2) {
      return new it(this.realtimeUrl.href, { ...e2, params: { apikey: this.supabaseKey, ...e2?.params } });
    }
    _listenForAuthEvents() {
      return this.auth.onAuthStateChange((e2, t2) => {
        this._handleTokenChanged(e2, `CLIENT`, t2?.access_token);
      });
    }
    _handleTokenChanged(e2, t2, n2) {
      (e2 === `TOKEN_REFRESHED` || e2 === `SIGNED_IN`) && this.changedAccessToken !== n2 ? (this.changedAccessToken = n2, this.realtime.setAuth(n2)) : e2 === `SIGNED_OUT` && (this.realtime.setAuth(), t2 == `STORAGE` && this.auth.signOut(), this.changedAccessToken = void 0);
    }
  };
  let vi = (e2, t2, n2) => new _i(e2, t2, n2);
  function yi() {
    if (typeof window < `u`) return false;
    let e2 = globalThis.process;
    if (!e2) return false;
    let t2 = e2.version;
    if (t2 == null) return false;
    let n2 = t2.match(/^v(\d+)\./);
    return n2 ? parseInt(n2[1], 10) <= 18 : false;
  }
  return yi() && console.warn(`\u26A0\uFE0F  Node.js 18 and below are deprecated and will no longer be supported in future versions of @supabase/supabase-js. Please upgrade to Node.js 20 or later. For more information, visit: https://github.com/orgs/supabase/discussions/37217`), e.AuthAdminApi = mi, e.AuthApiError = An, e.AuthClient = hi, e.AuthError = M, e.AuthImplicitGrantRedirectError = Pn, e.AuthInvalidCredentialsError = Nn, e.AuthInvalidJwtError = Un, e.AuthInvalidTokenResponseError = L, e.AuthPKCECodeVerifierMissingError = Ln, e.AuthPKCEGrantCodeExchangeError = In, e.AuthRetryableFetchError = zn, e.AuthSessionMissingError = I, e.AuthUnknownError = P, e.AuthWeakPasswordError = Vn, e.CustomAuthError = F, Object.defineProperty(e, `FunctionRegion`, { enumerable: true, get: function() {
    return c;
  } }), e.FunctionsError = i, e.FunctionsFetchError = a, e.FunctionsHttpError = s, e.FunctionsRelayError = o, e.GoTrueAdminApi = Mr, e.GoTrueClient = pi, e.NavigatorLockAcquireTimeoutError = Fr, e.PostgrestError = p, e.REALTIME_CHANNEL_STATES = Ze, Object.defineProperty(e, `REALTIME_LISTEN_TYPES`, { enumerable: true, get: function() {
    return E;
  } }), Object.defineProperty(e, `REALTIME_POSTGRES_CHANGES_LISTEN_EVENT`, { enumerable: true, get: function() {
    return Xe;
  } }), Object.defineProperty(e, `REALTIME_PRESENCE_LISTEN_EVENTS`, { enumerable: true, get: function() {
    return Ge;
  } }), Object.defineProperty(e, `REALTIME_SUBSCRIBE_STATES`, { enumerable: true, get: function() {
    return D;
  } }), e.RealtimeChannel = Qe, e.RealtimeClient = it, e.RealtimePresence = Ke, e.SIGN_OUT_SCOPES = jr, e.StorageApiError = bt, e.SupabaseClient = _i, e.WebSocketFactory = ue, e.createClient = vi, e.isAuthApiError = jn, e.isAuthError = N, e.isAuthImplicitGrantRedirectError = Fn, e.isAuthPKCECodeVerifierMissingError = Rn, e.isAuthRetryableFetchError = Bn, e.isAuthSessionMissingError = Mn, e.isAuthWeakPasswordError = Hn, e.lockInternals = Q, e.navigatorLock = Lr, e.processLock = zr, e;
})({});
