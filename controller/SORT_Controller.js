let sortService = require('../service/SORT_Service');

async function getNewSalesOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.getNewSalesOrderReturn(pool, values);
        return res.status(200).json({ message: `New Sales Order Return fetched Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getSalesOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.getSalesOrderReturn(pool, values.SalesOrderReturnID);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getAllSalesOrderReturns(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.getAllSalesOrderReturns(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function updateSalesOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.updateSalesOrderReturn(pool, values);
        return res.status(200).json({ message: 'Sales Order Return updated successfully', data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function deleteSalesOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.deleteSalesOrderReturn(pool, values);
        return res.status(200).json({ message: 'Sales Order Return deleted successfully' });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function addNewProductForSalesOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.addNewProductForSalesOrderReturn(pool, values);
        return res.status(200).json({ message: 'Product added to Sales Order Return successfully', data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getSalesOrderReturnProduct(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.getSalesOrderReturnProduct(pool, values.SalesOrderReturnProductID);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getSalesOrderReturnAllProducts(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.getSalesOrderReturnAllProducts(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function updateSalesOrderReturnProduct(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.updateSalesOrderReturnProduct(pool, values);
        return res.status(200).json({ message: `Product updated Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function deleteSalesOrderReturnProduct(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.deleteSalesOrderReturnProduct(pool, values);
        return res.status(200).json({ message: 'Product deleted from Sales Order Return successfully' });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getNewSalesOrderReturnReceiving(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.getNewSalesOrderReturnReceiving(pool, values);
        return res.status(200).json({ message: `Sales Order Return Receiving fetched Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getSalesOrderReturnReceiving(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.getSalesOrderReturnReceiving(pool, values.SalesOrderReturnReceivingID);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getAllSalesOrderReturnReceivings(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.getAllSalesOrderReturnReceivings(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function updateSalesOrderReturnReceiving(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.updateSalesOrderReturnReceiving(pool, values);
        return res.status(200).json({ message: `Sales Order Return Receiving updated Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function updateSalesOrderReturnReceivingStatus(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.updateSalesOrderReturnReceivingStatus(pool, values);
        return res.status(200).json({ message: `Sales Order Return Receiving status updated Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function deleteSalesOrderReturnReceiving(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.deleteSalesOrderReturnReceiving(pool, values);
        return res.status(200).json({ message: 'Sales Order Return Receiving deleted successfully' });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getAllSalesOrderReturnPutawayOrders(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.getAllSalesOrderReturnPutawayOrders(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function updateNewSalesOrderReturnPutawayOrder(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.updateNewSalesOrderReturnPutawayOrder(pool, values);
        return res.status(200).json({ message: `New Sales Order Return putaway order updated Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getSalesOrderReturnAllPendingProductsForPutaway(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.getSalesOrderReturnAllPendingProductsForPutaway(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getAllAvailablePalletTypesForSalesOrderReturnProduct(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.getAllAvailablePalletTypesForSalesOrderReturnProduct(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getAllSalesOrderReturnPutawayOrderAllocatedProducts(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.getAllSalesOrderReturnPutawayOrderAllocatedProducts(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function suggestBinForPutawaySalesOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.suggestBinForPutawaySalesOrderReturn(pool, values);
        return res.status(200).json({ message: `Fetched Bin Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function fetchAllAvailableBinsForPutawaySalesOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.fetchAllAvailableBinsForPutawaySalesOrderReturn(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function validateBinNumberForPutawaySalesOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.validateBinNumberForPutawaySalesOrderReturn(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function putProductIntoBinForPutawaySalesOrderReturn(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await sortService.putProductIntoBinForPutawaySalesOrderReturn(pool, values);
        return res.status(200).json({ message: `Product allocated to bin successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

module.exports.getNewSalesOrderReturn = getNewSalesOrderReturn;
module.exports.getSalesOrderReturn = getSalesOrderReturn;
module.exports.getAllSalesOrderReturns = getAllSalesOrderReturns;
module.exports.updateSalesOrderReturn = updateSalesOrderReturn;
module.exports.deleteSalesOrderReturn = deleteSalesOrderReturn;
module.exports.addNewProductForSalesOrderReturn = addNewProductForSalesOrderReturn;
module.exports.getSalesOrderReturnProduct = getSalesOrderReturnProduct;
module.exports.getSalesOrderReturnAllProducts = getSalesOrderReturnAllProducts;
module.exports.updateSalesOrderReturnProduct = updateSalesOrderReturnProduct;
module.exports.deleteSalesOrderReturnProduct = deleteSalesOrderReturnProduct;
module.exports.getNewSalesOrderReturnReceiving = getNewSalesOrderReturnReceiving;
module.exports.getSalesOrderReturnReceiving = getSalesOrderReturnReceiving;
module.exports.getAllSalesOrderReturnReceivings = getAllSalesOrderReturnReceivings;
module.exports.updateSalesOrderReturnReceiving = updateSalesOrderReturnReceiving;
module.exports.updateSalesOrderReturnReceivingStatus = updateSalesOrderReturnReceivingStatus;
module.exports.deleteSalesOrderReturnReceiving = deleteSalesOrderReturnReceiving;
module.exports.getAllSalesOrderReturnPutawayOrders = getAllSalesOrderReturnPutawayOrders;
module.exports.updateNewSalesOrderReturnPutawayOrder = updateNewSalesOrderReturnPutawayOrder;
module.exports.getSalesOrderReturnAllPendingProductsForPutaway = getSalesOrderReturnAllPendingProductsForPutaway;
module.exports.getAllAvailablePalletTypesForSalesOrderReturnProduct = getAllAvailablePalletTypesForSalesOrderReturnProduct;
module.exports.getAllSalesOrderReturnPutawayOrderAllocatedProducts = getAllSalesOrderReturnPutawayOrderAllocatedProducts;
module.exports.suggestBinForPutawaySalesOrderReturn = suggestBinForPutawaySalesOrderReturn;
module.exports.fetchAllAvailableBinsForPutawaySalesOrderReturn = fetchAllAvailableBinsForPutawaySalesOrderReturn;
module.exports.validateBinNumberForPutawaySalesOrderReturn = validateBinNumberForPutawaySalesOrderReturn;
module.exports.putProductIntoBinForPutawaySalesOrderReturn = putProductIntoBinForPutawaySalesOrderReturn;