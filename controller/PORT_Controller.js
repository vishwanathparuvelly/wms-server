let portService = require('../service/PORT_Service');

async function getNewPurchaseOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.getNewPurchaseOrderReturn(pool, values);
        return res.status(200).json({ message: `New Purchase Order Return fetched Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getPurchaseOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.getPurchaseOrderReturn(pool, values.PurchaseOrderReturnID);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getAllPurchaseOrderReturns(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.getAllPurchaseOrderReturns(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function updatePurchaseOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.updatePurchaseOrderReturn(pool, values);
        return res.status(200).json({ message: 'Purchase Order Return updated successfully', data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function deletePurchaseOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.deletePurchaseOrderReturn(pool, values);
        return res.status(200).json({ message: 'Purchase Order Return deleted successfully' });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getAllAvailableBinProducts(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.getAllAvailableBinProducts(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getAllBinProductsBatchNumbers(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.getAllBinProductsBatchNumbers(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function addNewProductForPurchaseOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.addNewProductForPurchaseOrderReturn(pool, values);
        return res.status(200).json({ message: 'Product added to Purchase Order Return successfully', data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getPurchaseOrderReturnProduct(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.getPurchaseOrderReturnProduct(pool, values.PurchaseOrderReturnProductID);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getPurchaseOrderReturnAllProducts(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.getPurchaseOrderReturnAllProducts(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function updatePurchaseOrderReturnProduct(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.updatePurchaseOrderReturnProduct(pool, values);
        return res.status(200).json({ message: 'Purchase Order Return product updated successfully', data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function deletePurchaseOrderReturnProduct(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.deletePurchaseOrderReturnProduct(pool, values);
        return res.status(200).json({ message: 'Purchase Order Return product deleted successfully', data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getAllPickListOrdersPurchaseOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.getAllPickListOrdersPurchaseOrderReturn(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getPurchaseOrderReturnAllPendingProductsForPicklist(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.getPurchaseOrderReturnAllPendingProductsForPicklist(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getAllPicklistOrderPickedProductsPurchaseOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.getAllPicklistOrderPickedProductsPurchaseOrderReturn(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function suggestBinForPicklistPurchaseOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.suggestBinForPicklistPurchaseOrderReturn(pool, values);
        return res.status(200).json({ message: `Fetched Bin Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function fetchAllAvailableBinsForPicklistPurchaseOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.fetchAllAvailableBinsForPicklistPurchaseOrderReturn(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function validateBinNumberForPicklistPurchaseOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.validateBinNumberForPicklistPurchaseOrderReturn(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function pickProductFromBinForPicklistPurchaseOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.pickProductFromBinForPicklistPurchaseOrderReturn(pool, values);
        return res.status(200).json({ message: `Product picked successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getNewPurchaseOrderReturnShipment(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.getNewPurchaseOrderReturnShipment(pool, values);
        return res.status(200).json({ message: `New Purchase Order Return Shipment fetched Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getPurchaseOrderReturnShipment(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.getPurchaseOrderReturnShipment(pool, values.PurchaseOrderReturnShipmentID);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getAllPurchaseOrderReturnShipments(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.getAllPurchaseOrderReturnShipments(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function updatePurchaseOrderReturnShipment(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await portService.updatePurchaseOrderReturnShipment(pool, values);
        return res.status(200).json({ message: `Purchase Order Return Shipment updated Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

module.exports.getNewPurchaseOrderReturn = getNewPurchaseOrderReturn;
module.exports.getPurchaseOrderReturn = getPurchaseOrderReturn;
module.exports.getAllPurchaseOrderReturns = getAllPurchaseOrderReturns;
module.exports.updatePurchaseOrderReturn = updatePurchaseOrderReturn;
module.exports.deletePurchaseOrderReturn = deletePurchaseOrderReturn;
module.exports.getAllAvailableBinProducts = getAllAvailableBinProducts;
module.exports.getAllBinProductsBatchNumbers = getAllBinProductsBatchNumbers;
module.exports.addNewProductForPurchaseOrderReturn = addNewProductForPurchaseOrderReturn;
module.exports.getPurchaseOrderReturnProduct = getPurchaseOrderReturnProduct;
module.exports.getPurchaseOrderReturnAllProducts = getPurchaseOrderReturnAllProducts;
module.exports.updatePurchaseOrderReturnProduct = updatePurchaseOrderReturnProduct;
module.exports.deletePurchaseOrderReturnProduct = deletePurchaseOrderReturnProduct;
module.exports.getAllPickListOrdersPurchaseOrderReturn = getAllPickListOrdersPurchaseOrderReturn;
module.exports.getPurchaseOrderReturnAllPendingProductsForPicklist = getPurchaseOrderReturnAllPendingProductsForPicklist;
module.exports.getAllPicklistOrderPickedProductsPurchaseOrderReturn = getAllPicklistOrderPickedProductsPurchaseOrderReturn;
module.exports.suggestBinForPicklistPurchaseOrderReturn = suggestBinForPicklistPurchaseOrderReturn;
module.exports.fetchAllAvailableBinsForPicklistPurchaseOrderReturn = fetchAllAvailableBinsForPicklistPurchaseOrderReturn;
module.exports.validateBinNumberForPicklistPurchaseOrderReturn = validateBinNumberForPicklistPurchaseOrderReturn;
module.exports.pickProductFromBinForPicklistPurchaseOrderReturn = pickProductFromBinForPicklistPurchaseOrderReturn;
module.exports.getNewPurchaseOrderReturnShipment = getNewPurchaseOrderReturnShipment;
module.exports.getPurchaseOrderReturnShipment = getPurchaseOrderReturnShipment;
module.exports.getAllPurchaseOrderReturnShipments = getAllPurchaseOrderReturnShipments;
module.exports.updatePurchaseOrderReturnShipment = updatePurchaseOrderReturnShipment;