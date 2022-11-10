"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.max = exports.toString = exports.neq = exports.eq = exports.gte = exports.gt = exports.lte = exports.lt = exports.majorMinor = exports.minor = exports.major = exports.compare = exports.parse = void 0;
function parse(version) {
    return version.split('.').map(part => part.split('_').map(parseInt));
}
exports.parse = parse;
function compare(v1, v2) {
    var _a, _b, _c, _d;
    const sv1 = typeof v1 === 'string' ? parse(v1) : v1;
    const sv2 = typeof v2 === 'string' ? parse(v2) : v2;
    for (let i = 0; i < Math.max(sv1.length, sv2.length); i++) {
        const sv1i = (_a = sv1.at(i)) !== null && _a !== void 0 ? _a : [];
        const sv2i = (_b = sv2.at(i)) !== null && _b !== void 0 ? _b : [];
        for (let j = 0; j < Math.max(sv1i.length, sv2i.length); j++) {
            const sv1ij = (_c = sv1i.at(j)) !== null && _c !== void 0 ? _c : 0;
            const sv2ij = (_d = sv2i.at(j)) !== null && _d !== void 0 ? _d : 0;
            if (sv1ij > sv2ij) {
                return 1;
            }
            else if (sv1ij < sv2ij) {
                return -1;
            }
            else {
                continue;
            }
        }
    }
    return 0;
}
exports.compare = compare;
function major(version) {
    if (typeof version === 'string')
        version = parse(version);
    return version[0].join('_');
}
exports.major = major;
function minor(version) {
    if (typeof version === 'string')
        version = parse(version);
    return version[1].join('_');
}
exports.minor = minor;
function majorMinor(version) {
    if (typeof version === 'string')
        version = parse(version);
    return [major(version), minor(version)].join('.');
}
exports.majorMinor = majorMinor;
function lt(version1, version2) {
    return compare(version1, version2) === -1;
}
exports.lt = lt;
function lte(version1, version2) {
    const ordering = compare(version1, version2);
    return ordering === -1 || ordering === 0;
}
exports.lte = lte;
function gt(version1, version2) {
    return compare(version1, version2) === 1;
}
exports.gt = gt;
function gte(version1, version2) {
    const ordering = compare(version1, version2);
    return ordering === 1 || ordering === 0;
}
exports.gte = gte;
function eq(version1, version2) {
    return compare(version1, version2) === 0;
}
exports.eq = eq;
function neq(version1, version2) {
    return compare(version1, version2) !== 0;
}
exports.neq = neq;
function toString(version) {
    return version.join('.');
}
exports.toString = toString;
function max(versions) {
    const simvers = versions.map(version => {
        if (typeof version === 'string') {
            return parse(version);
        }
        else {
            return version;
        }
    });
    let maxSimVer = null;
    for (const simver of simvers) {
        if (maxSimVer === null) {
            maxSimVer = simver;
        }
        else {
            if (lt(maxSimVer, simver)) {
                maxSimVer = simver;
            }
        }
    }
    return maxSimVer === null ? null : toString(maxSimVer);
}
exports.max = max;
