const templates = require("./views-compiled");

const ESCAPE_MAP = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
};

function escapeFn(markup) {
    if (markup == null) return "";
    return String(markup).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

function rethrow(err, str, filename, lineno) {
    if (err instanceof Error) {
        err.message = `${filename || "ejs"}:${lineno || "?"}\n${err.message}`;
        throw err;
    }
    throw new Error(String(err));
}

function normalizeViewPath(viewPath) {
    let normalized = String(viewPath || "").replace(/\\/g, "/");
    const viewsIdx = normalized.lastIndexOf("/views/");
    if (viewsIdx !== -1) {
        normalized = normalized.slice(viewsIdx + "/views/".length);
    } else if (normalized.startsWith("views/")) {
        normalized = normalized.slice("views/".length);
    }
    if (normalized.startsWith("./")) {
        normalized = normalized.slice(2);
    }
    if (!normalized.endsWith(".ejs")) {
        normalized += ".ejs";
    }
    return normalized;
}

function resolveRelativePath(fromView, targetPath) {
    const cleanTarget = String(targetPath || "").replace(/\\/g, "/");
    if (!cleanTarget.startsWith(".")) {
        return normalizeViewPath(cleanTarget);
    }
    const baseParts = normalizeViewPath(fromView).split("/");
    baseParts.pop();
    for (const part of cleanTarget.split("/")) {
        if (!part || part === ".") continue;
        if (part === "..") {
            baseParts.pop();
        } else {
            baseParts.push(part);
        }
    }
    let resolved = baseParts.join("/");
    if (!resolved.endsWith(".ejs")) {
        resolved += ".ejs";
    }
    return resolved;
}

function renderTemplate(viewName, locals) {
    const key = normalizeViewPath(viewName);
    const fn = templates[key];
    if (!fn) {
        throw new Error(`Precompiled view not found: ${key}`);
    }
    const include = (relPath, data) => {
        const target = resolveRelativePath(key, relPath);
        const mergedLocals = data ? { ...locals, ...data } : locals;
        return renderTemplate(target, mergedLocals);
    };
    return fn(locals, escapeFn, include, rethrow);
}

function cfEjsEngine(filePath, options, callback) {
    try {
        let selectedLayout = null;
        const locals = {
            ...options,
            layout(layoutName) {
                selectedLayout = layoutName ? normalizeViewPath(layoutName) : null;
            }
        };

        let html = renderTemplate(filePath, locals);
        if (selectedLayout) {
            html = renderTemplate(selectedLayout, { ...locals, body: html });
        }
        callback(null, html);
    } catch (err) {
        callback(err);
    }
}

cfEjsEngine.__express = cfEjsEngine;
cfEjsEngine.__isPrecompiled = true;
module.exports = cfEjsEngine;
