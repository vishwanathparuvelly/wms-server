const express = require("express");
const router = express.Router();
const poController = require("../controller/PO_Controller");
const soController = require("../controller/SO_Controller");
const portController = require("../controller/PORT_Controller");
const sortController = require("../controller/SORT_Controller");
const documentController = require("../controller/Document_Controller");
const { uploadSingle, handleUploadError } = require("../middleware/fileUpload");
const masterRoutes = require("./master_route"); // <-- Import the new master router
const dataHandlerRoutes = require("./dataHandler_Routes");

// --- Mount the Master Router ---
// All routes defined in master_route.js will now be prefixed with /master
router.use("/master", masterRoutes);
router.use("/data", dataHandlerRoutes);

// --- Document Routes ---
router.post("/documents/upload", uploadSingle, handleUploadError, (req, res) => {
  const pool = req.app.locals.dbPool;
  documentController.uploadDocument(req, res, pool);
});
router.get("/documents/list/:entityType/:entityID", (req, res) => {
  const pool = req.app.locals.dbPool;
  documentController.getDocumentsByEntity(req, res, pool);
});
router.post("/documents/list", (req, res) => {
  const pool = req.app.locals.dbPool;
  documentController.getDocumentsByEntityPost(req, res, pool);
});
router.get("/documents/download/:documentID", (req, res) => {
  const pool = req.app.locals.dbPool;
  documentController.downloadDocument(req, res, pool);
});
router.delete("/documents/delete/:documentID", (req, res) => {
  const pool = req.app.locals.dbPool;
  documentController.deleteDocument(req, res, pool);
});
router.post("/documents/delete", (req, res) => {
  const pool = req.app.locals.dbPool;
  documentController.deleteDocumentPost(req, res, pool);
});

router
  .route("/purchase_order/newPurchaseOrder")
  .post(poController.getNewPurchaseOrder);
router
  .route("/purchase_order/getPurchaseOrder")
  .post(poController.getPurchaseOrder);
router
  .route("/purchase_order/getAllPurchaseOrders")
  .post(poController.getAllPurchaseOrders);
router
  .route("/purchase_order/updatePurchaseOrder")
  .post(poController.updatePurchaseOrder);
router
  .route("/purchase_order/deletePurchaseOrder")
  .post(poController.deletePurchaseOrder);
router
  .route("/purchase_order/addNewProductForPurchaseOrder")
  .post(poController.addNewProductForPurchaseOrder);
router
  .route("/purchase_order/getPurchaseOrderProduct")
  .post(poController.getPurchaseOrderProduct);
router
  .route("/purchase_order/getPurchaseOrderAllProducts")
  .post(poController.getPurchaseOrderAllProducts);
router
  .route("/purchase_order/updatePurchaseOrderProduct")
  .post(poController.updatePurchaseOrderProduct);
router
  .route("/purchase_order/deletePurchaseOrderProduct")
  .post(poController.deletePurchaseOrderProduct);
router
  .route("/purchase_order/getNewPurchaseOrderReceiving")
  .post(poController.getNewPurchaseOrderReceiving);
router
  .route("/purchase_order/getPurchaseOrderReceiving")
  .post(poController.getPurchaseOrderReceiving);
router
  .route("/purchase_order/getAllPurchaseOrderReceivings")
  .post(poController.getAllPurchaseOrderReceivings);
router
  .route("/purchase_order/getPurchaseOrderReceivingsForPutaway")
  .post(poController.getPurchaseOrderReceivingsForPutaway);
router
  .route("/purchase_order/updatePurchaseOrderReceiving")
  .post(poController.updatePurchaseOrderReceiving);
router
  .route("/purchase_order/updatePurchaseOrderReceivingStatus")
  .post(poController.updatePurchaseOrderReceivingStatus);
router
  .route("/purchase_order/updatePurchaseOrderReceivingQuarantine")
  .post(poController.updatePurchaseOrderReceivingQuarantine);
router
  .route("/purchase_order/deletePurchaseOrderReceiving")
  .post(poController.deletePurchaseOrderReceiving);

router
  .route("/putaway/getAllPutawayOrders")
  .post(poController.getAllPutawayOrders);
router
  .route("/putaway/updateNewPutawayOrder")
  .post(poController.updateNewPutawayOrder);
router
  .route("/putaway/getPurchaseOrderAllPendingProductsForPutaway")
  .post(poController.getPurchaseOrderAllPendingProductsForPutaway);
router
  .route("/putaway/getAllAvailablePalletTypesForPurchaseOrderProduct")
  .post(poController.getAllAvailablePalletTypesForPurchaseOrderProduct);
router
  .route("/putaway/getAllPutawayOrderAllocatedProducts")
  .post(poController.getAllPutawayOrderAllocatedProducts);
router
  .route("/putaway/getAllPutawayOrderAllocatedMaterials")
  .post(poController.getAllPutawayOrderAllocatedMaterials);
router
  .route("/putaway/suggestBinForPutaway")
  .post(poController.suggestBinForPutaway);
router
  .route("/putaway/fetchAllAvailableBinsForPutaway")
  .post(poController.fetchAllAvailableBinsForPutaway);
router
  .route("/putaway/validateBinNumberForPutaway")
  .post(poController.validateBinNumberForPutaway);
router
  .route("/putaway/putProductIntoBinForPutaway")
  .post(poController.putProductIntoBinForPutaway);
router
  .route("/putaway/putMaterialIntoBinForPutaway")
  .post(poController.putMaterialIntoBinForPutaway);

router
  .route("/sales_order/getNewSalesOrder")
  .post(soController.getNewSalesOrder);
router.route("/sales_order/getSalesOrder").post(soController.getSalesOrder);
router
  .route("/sales_order/getAllSalesOrders")
  .post(soController.getAllSalesOrders);
router
  .route("/sales_order/updateSalesOrder")
  .post(soController.updateSalesOrder);
router
  .route("/sales_order/deleteSalesOrder")
  .post(soController.deleteSalesOrder);
router
  .route("/sales_order/getAllAvailableBinProducts")
  .post(soController.getAllAvailableBinProducts);
router
  .route("/sales_order/getAllBinProductsBatchNumbers")
  .post(soController.getAllBinProductsBatchNumbers);
router
  .route("/sales_order/addNewProductForSalesOrder")
  .post(soController.addNewProductForSalesOrder);
router
  .route("/sales_order/getSalesOrderProduct")
  .post(soController.getSalesOrderProduct);
router
  .route("/sales_order/getSalesOrderAllProducts")
  .post(soController.getSalesOrderAllProducts);
router
  .route("/sales_order/updateSalesOrderProduct")
  .post(soController.updateSalesOrderProduct);
router
  .route("/sales_order/deleteSalesOrderProduct")
  .post(soController.deleteSalesOrderProduct);

router
  .route("/picklist/getAllPickListOrders")
  .post(soController.getAllPickListOrders);
router
  .route("/picklist/getSalesOrderAllPendingProductsForPicklist")
  .post(soController.getSalesOrderAllPendingProductsForPicklist);
router
  .route("/picklist/getAllPicklistOrderPickedProducts")
  .post(soController.getAllPicklistOrderPickedProducts);
router
  .route("/picklist/suggestBinForPicklist")
  .post(soController.suggestBinForPicklist);
router
  .route("/picklist/fetchAllAvailableBinsForPicklist")
  .post(soController.fetchAllAvailableBinsForPicklist);
router
  .route("/picklist/validateBinNumberForPicklist")
  .post(soController.validateBinNumberForPicklist);
router
  .route("/picklist/pickProductFromBinForPicklist")
  .post(soController.pickProductFromBinForPicklist);

router
  .route("/shipment/getNewSalesOrderShipment")
  .post(soController.getNewSalesOrderShipment);
router
  .route("/shipment/getSalesOrderShipment")
  .post(soController.getSalesOrderShipment);
router
  .route("/shipment/getAllSalesOrderShipments")
  .post(soController.getAllSalesOrderShipments);
router
  .route("/shipment/updateSalesOrderShipment")
  .post(soController.updateSalesOrderShipment);

router
  .route("/purchase_order_return/getNewPurchaseOrderReturn")
  .post(portController.getNewPurchaseOrderReturn);
router
  .route("/purchase_order_return/getPurchaseOrderReturn")
  .post(portController.getPurchaseOrderReturn);
router
  .route("/purchase_order_return/getAllPurchaseOrderReturns")
  .post(portController.getAllPurchaseOrderReturns);
router
  .route("/purchase_order_return/updatePurchaseOrderReturn")
  .post(portController.updatePurchaseOrderReturn);
router
  .route("/purchase_order_return/deletePurchaseOrderReturn")
  .post(portController.deletePurchaseOrderReturn);
router
  .route("/purchase_order_return/getAllAvailableBinProducts")
  .post(portController.getAllAvailableBinProducts);
router
  .route("/purchase_order_return/getAllBinProductsBatchNumbers")
  .post(portController.getAllBinProductsBatchNumbers);
router
  .route("/purchase_order_return/addNewProductForPurchaseOrderReturn")
  .post(portController.addNewProductForPurchaseOrderReturn);
router
  .route("/purchase_order_return/getPurchaseOrderReturnProduct")
  .post(portController.getPurchaseOrderReturnProduct);
router
  .route("/purchase_order_return/getPurchaseOrderReturnAllProducts")
  .post(portController.getPurchaseOrderReturnAllProducts);
router
  .route("/purchase_order_return/updatePurchaseOrderReturnProduct")
  .post(portController.updatePurchaseOrderReturnProduct);
router
  .route("/purchase_order_return/deletePurchaseOrderReturnProduct")
  .post(portController.deletePurchaseOrderReturnProduct);

router
  .route("/picklist_port/getAllPickListOrdersPurchaseOrderReturn")
  .post(portController.getAllPickListOrdersPurchaseOrderReturn);
router
  .route("/picklist_port/getPurchaseOrderReturnAllPendingProductsForPicklist")
  .post(portController.getPurchaseOrderReturnAllPendingProductsForPicklist);
router
  .route("/picklist_port/getAllPicklistOrderPickedProductsPurchaseOrderReturn")
  .post(portController.getAllPicklistOrderPickedProductsPurchaseOrderReturn);
router
  .route("/picklist_port/suggestBinForPicklistPurchaseOrderReturn")
  .post(portController.suggestBinForPicklistPurchaseOrderReturn);
router
  .route("/picklist_port/fetchAllAvailableBinsForPicklistPurchaseOrderReturn")
  .post(portController.fetchAllAvailableBinsForPicklistPurchaseOrderReturn);
router
  .route("/picklist_port/validateBinNumberForPicklistPurchaseOrderReturn")
  .post(portController.validateBinNumberForPicklistPurchaseOrderReturn);
router
  .route("/picklist_port/pickProductFromBinForPicklistPurchaseOrderReturn")
  .post(portController.pickProductFromBinForPicklistPurchaseOrderReturn);

router
  .route("/shipment_port/getNewPurchaseOrderReturnShipment")
  .post(portController.getNewPurchaseOrderReturnShipment);
router
  .route("/shipment_port/getPurchaseOrderReturnShipment")
  .post(portController.getPurchaseOrderReturnShipment);
router
  .route("/shipment_port/getAllPurchaseOrderReturnShipments")
  .post(portController.getAllPurchaseOrderReturnShipments);
router
  .route("/shipment_port/updatePurchaseOrderReturnShipment")
  .post(portController.updatePurchaseOrderReturnShipment);

router
  .route("/sales_order_return/getNewSalesOrderReturn")
  .post(sortController.getNewSalesOrderReturn);
router
  .route("/sales_order_return/getSalesOrderReturn")
  .post(sortController.getSalesOrderReturn);
router
  .route("/sales_order_return/getAllSalesOrderReturns")
  .post(sortController.getAllSalesOrderReturns);
router
  .route("/sales_order_return/updateSalesOrderReturn")
  .post(sortController.updateSalesOrderReturn);
router
  .route("/sales_order_return/deleteSalesOrderReturn")
  .post(sortController.deleteSalesOrderReturn);
router
  .route("/sales_order_return/addNewProductForSalesOrderReturn")
  .post(sortController.addNewProductForSalesOrderReturn);
router
  .route("/sales_order_return/getSalesOrderReturnProduct")
  .post(sortController.getSalesOrderReturnProduct);
router
  .route("/sales_order_return/getSalesOrderReturnAllProducts")
  .post(sortController.getSalesOrderReturnAllProducts);
router
  .route("/sales_order_return/updateSalesOrderReturnProduct")
  .post(sortController.updateSalesOrderReturnProduct);
router
  .route("/sales_order_return/deleteSalesOrderReturnProduct")
  .post(sortController.deleteSalesOrderReturnProduct);
router
  .route("/sales_order_return/getNewSalesOrderReturnReceiving")
  .post(sortController.getNewSalesOrderReturnReceiving);
router
  .route("/sales_order_return/getSalesOrderReturnReceiving")
  .post(sortController.getSalesOrderReturnReceiving);
router
  .route("/sales_order_return/getAllSalesOrderReturnReceivings")
  .post(sortController.getAllSalesOrderReturnReceivings);
router
  .route("/sales_order_return/updateSalesOrderReturnReceiving")
  .post(sortController.updateSalesOrderReturnReceiving);
router
  .route("/sales_order_return/updateSalesOrderReturnReceivingStatus")
  .post(sortController.updateSalesOrderReturnReceivingStatus);
router
  .route("/sales_order_return/deleteSalesOrderReturnReceiving")
  .post(sortController.deleteSalesOrderReturnReceiving);

router
  .route("/putaway_sort/getAllSalesOrderReturnPutawayOrders")
  .post(sortController.getAllSalesOrderReturnPutawayOrders);
router
  .route("/putaway_sort/updateNewSalesOrderReturnPutawayOrder")
  .post(sortController.updateNewSalesOrderReturnPutawayOrder);
router
  .route("/putaway_sort/getSalesOrderReturnAllPendingProductsForPutaway")
  .post(sortController.getSalesOrderReturnAllPendingProductsForPutaway);
router
  .route("/putaway_sort/getAllAvailablePalletTypesForSalesOrderReturnProduct")
  .post(sortController.getAllAvailablePalletTypesForSalesOrderReturnProduct);
router
  .route("/putaway_sort/getAllSalesOrderReturnPutawayOrderAllocatedProducts")
  .post(sortController.getAllSalesOrderReturnPutawayOrderAllocatedProducts);
router
  .route("/putaway_sort/suggestBinForPutawaySalesOrderReturn")
  .post(sortController.suggestBinForPutawaySalesOrderReturn);
router
  .route("/putaway_sort/fetchAllAvailableBinsForPutawaySalesOrderReturn")
  .post(sortController.fetchAllAvailableBinsForPutawaySalesOrderReturn);
router
  .route("/putaway_sort/validateBinNumberForPutawaySalesOrderReturn")
  .post(sortController.validateBinNumberForPutawaySalesOrderReturn);
router
  .route("/putaway_sort/putProductIntoBinForPutawaySalesOrderReturn")
  .post(sortController.putProductIntoBinForPutawaySalesOrderReturn);

module.exports = router;
