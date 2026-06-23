"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const arlStore_1 = require("../services/arlStore");
const router = (0, express_1.Router)();
router.get('/arl/trace/:id', async (req, res) => {
    const { id } = req.params;
    const trace = await (0, arlStore_1.getArlTrace)(id);
    res.json({ trace });
});
router.get('/arl/composite/:id', async (req, res) => {
    const { id } = req.params;
    const composite = await (0, arlStore_1.getArlComposite)(id);
    res.json({ composite });
});
router.get('/arl/drift/:id', async (req, res) => {
    const { id } = req.params;
    const drift = await (0, arlStore_1.getArlDrift)(id);
    res.json({ drift });
});
exports.default = router;
//# sourceMappingURL=cognitionArlRoutes.js.map