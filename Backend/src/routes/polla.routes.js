const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const pollaController = require("../controllers/polla.controller");

const router = express.Router();

router.get("/catalogo", asyncHandler(pollaController.obtenerCatalogo));
router.get("/resumen", asyncHandler(pollaController.obtenerResumen));
router.get("/ranking", asyncHandler(pollaController.obtenerRanking));
router.get("/pronostico/:dni", asyncHandler(pollaController.consultarPronosticoPorDni));
router.post("/pronostico", asyncHandler(pollaController.registrarPronostico));

module.exports = router;
