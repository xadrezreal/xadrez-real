"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPremiumOrAdmin = isPremiumOrAdmin;
exports.isAdmin = isAdmin;
function isPremiumOrAdmin(role) {
    return role === "PREMIUM" || role === "ADMIN";
}
function isAdmin(role) {
    return role === "ADMIN";
}
//# sourceMappingURL=roleHelper.js.map