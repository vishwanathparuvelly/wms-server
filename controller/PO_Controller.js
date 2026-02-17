let poService = require('../service/PO_Service');
let putawayService = require('../service/PutAway_Service');

async function getNewPurchaseOrder(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await poService.getNewPurchaseOrder(pool, values);
        return res.status(200).json({ message: `New Purchase Order fetched Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};



async function getPurchaseOrder(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await poService.getPurchaseOrder(pool, values.PurchaseOrderID);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function getAllPurchaseOrders(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await poService.getAllPurchaseOrders(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function updatePurchaseOrder(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await poService.updatePurchaseOrder(pool, values);
        return res.status(200).json({ message: 'Purchase order updated successfully', data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function deletePurchaseOrder(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await poService.deletePurchaseOrder(pool, values);
        return res.status(200).json({ message: 'Purchase order deleted successfully' });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};


async function addNewProductForPurchaseOrder(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await poService.addNewProductForPurchaseOrder(pool, values);
        return res.status(200).json({ message: 'Product added to purchase order successfully', data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function getPurchaseOrderProduct(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await poService.getPurchaseOrderProduct(pool, values.PurchaseOrderProductID);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function getPurchaseOrderAllProducts(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await poService.getPurchaseOrderAllProducts(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function updatePurchaseOrderProduct(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await poService.updatePurchaseOrderProduct(pool, values);
        return res.status(200).json({ message: `Product updated Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};
async function deletePurchaseOrderProduct(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await poService.deletePurchaseOrderProduct(pool, values);
        return res.status(200).json({ message: 'Product deleted from purchase order successfully' });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};


async function getNewPurchaseOrderReceiving(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await poService.getNewPurchaseOrderReceiving(pool, values);
        return res.status(200).json({ message: `Inbound Receiving fetched Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function getPurchaseOrderReceiving(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await poService.getPurchaseOrderReceiving(pool, values.PurchaseOrderReceivingID);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function getAllPurchaseOrderReceivings(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await poService.getAllPurchaseOrderReceivings(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function updatePurchaseOrderReceiving(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await poService.updatePurchaseOrderReceiving(pool, values);
        return res.status(200).json({ message: `Updated details Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function updatePurchaseOrderReceivingStatus(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await poService.updatePurchaseOrderReceivingStatus(pool, values);
        return res.status(200).json({ message: `Updated status Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function updatePurchaseOrderReceivingQuarantine(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await poService.updatePurchaseOrderReceivingQuarantine(pool, values);
        return res.status(200).json({ message: `Updated quarantine information successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};


async function deletePurchaseOrderReceiving(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await poService.deletePurchaseOrderReceiving(pool, values);
        return res.status(200).json({ message: 'Receiving deleted for purchase order successfully' });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function getAllPutawayOrders(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await putawayService.getAllPutawayOrders(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function updateNewPutawayOrder(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await putawayService.updateNewPutawayOrder(pool, values);
        return res.status(200).json({ message: `New putaway order updated Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function getPurchaseOrderAllPendingProductsForPutaway(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await putawayService.getPurchaseOrderAllPendingProductsForPutaway(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function getAllAvailablePalletTypesForPurchaseOrderProduct(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await putawayService.getAllAvailablePalletTypesForPurchaseOrderProduct(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};


async function getAllPutawayOrderAllocatedProducts(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await putawayService.getAllPutawayOrderAllocatedProducts(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function suggestBinForPutaway(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await putawayService.suggestBinForPutaway(pool, values);
        return res.status(200).json({ message: `Fetched Bin Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function fetchAllAvailableBinsForPutaway(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await putawayService.fetchAllAvailableBinsForPutaway(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function validateBinNumberForPutaway(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await putawayService.validateBinNumberForPutaway(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function getPurchaseOrderReceivingsForPutaway(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    values.user_id = req?.user?.id || 1;
    try {
        const result = await poService.getPurchaseOrderReceivingsForPutaway(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function putProductIntoBinForPutaway(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await putawayService.putProductIntoBinForPutaway(pool, values);
        return res.status(200).json({ message: `Product allocated to bin successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function putMaterialIntoBinForPutaway(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await putawayService.putMaterialIntoBinForPutaway(pool, values);
        return res.status(200).json({ message: `Material allocated to bin successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function getAllPutawayOrderAllocatedMaterials(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await putawayService.getAllPutawayOrderAllocatedMaterials(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

module.exports.getNewPurchaseOrder = getNewPurchaseOrder;
module.exports.getPurchaseOrder = getPurchaseOrder;
module.exports.getAllPurchaseOrders = getAllPurchaseOrders;
module.exports.updatePurchaseOrder = updatePurchaseOrder;
module.exports.deletePurchaseOrder = deletePurchaseOrder;
module.exports.addNewProductForPurchaseOrder = addNewProductForPurchaseOrder;
module.exports.getPurchaseOrderProduct = getPurchaseOrderProduct;
module.exports.getPurchaseOrderAllProducts = getPurchaseOrderAllProducts;
module.exports.updatePurchaseOrderProduct = updatePurchaseOrderProduct;
module.exports.deletePurchaseOrderProduct = deletePurchaseOrderProduct;
module.exports.getNewPurchaseOrderReceiving = getNewPurchaseOrderReceiving;
module.exports.getPurchaseOrderReceiving = getPurchaseOrderReceiving;
module.exports.getAllPurchaseOrderReceivings = getAllPurchaseOrderReceivings;
module.exports.getPurchaseOrderReceivingsForPutaway = getPurchaseOrderReceivingsForPutaway;
module.exports.updatePurchaseOrderReceiving = updatePurchaseOrderReceiving;
module.exports.updatePurchaseOrderReceivingStatus = updatePurchaseOrderReceivingStatus;
module.exports.updatePurchaseOrderReceivingQuarantine = updatePurchaseOrderReceivingQuarantine;
module.exports.deletePurchaseOrderReceiving = deletePurchaseOrderReceiving;
module.exports.getAllPutawayOrders = getAllPutawayOrders;
module.exports.updateNewPutawayOrder = updateNewPutawayOrder;
module.exports.getPurchaseOrderAllPendingProductsForPutaway = getPurchaseOrderAllPendingProductsForPutaway;
module.exports.getAllAvailablePalletTypesForPurchaseOrderProduct = getAllAvailablePalletTypesForPurchaseOrderProduct;
module.exports.getAllPutawayOrderAllocatedProducts = getAllPutawayOrderAllocatedProducts;
module.exports.suggestBinForPutaway = suggestBinForPutaway;
module.exports.fetchAllAvailableBinsForPutaway = fetchAllAvailableBinsForPutaway;
module.exports.validateBinNumberForPutaway = validateBinNumberForPutaway;
module.exports.putProductIntoBinForPutaway = putProductIntoBinForPutaway;
module.exports.putMaterialIntoBinForPutaway = putMaterialIntoBinForPutaway;
module.exports.getAllPutawayOrderAllocatedMaterials = getAllPutawayOrderAllocatedMaterials;
