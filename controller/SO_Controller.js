let soService = require('../service/SO_Service');

async function getNewSalesOrder(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.getNewSalesOrder(pool, values);
        return res.status(200).json({ message: `New Sales Order fetched Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};



async function getSalesOrder(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.getSalesOrder(pool, values.SalesOrderID);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function getAllSalesOrders(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.getAllSalesOrders(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function updateSalesOrder(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.updateSalesOrder(pool, values);
        return res.status(200).json({ message: 'Sales order updated successfully', data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function deleteSalesOrder(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.deleteSalesOrder(pool, values);
        return res.status(200).json({ message: 'Sales order deleted successfully' });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function getAllAvailableBinProducts(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.getAllAvailableBinProducts(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function getAllBinProductsBatchNumbers(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.getAllBinProductsBatchNumbers(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};

async function addNewProductForSalesOrder(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.addNewProductForSalesOrder(pool, values);
        return res.status(200).json({ message: 'Product added to sales order successfully', data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}


async function getSalesOrderProduct(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.getSalesOrderProduct(pool, values.SalesOrderProductID);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getSalesOrderAllProducts(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.getSalesOrderAllProducts(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function updateSalesOrderProduct(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.updateSalesOrderProduct(pool, values);
        return res.status(200).json({ message: 'Sales order product updated successfully', data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function deleteSalesOrderProduct(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.deleteSalesOrderProduct(pool, values);
        return res.status(200).json({ message: 'Sales order product deleted successfully', data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getAllPickListOrders(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.getAllPickListOrders(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getSalesOrderAllPendingProductsForPicklist(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.getSalesOrderAllPendingProductsForPicklist(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}
async function getAllPicklistOrderPickedProducts(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.getAllPicklistOrderPickedProducts(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function suggestBinForPicklist(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.suggestBinForPicklist(pool, values);
        return res.status(200).json({ message: `Fetched Bin Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function fetchAllAvailableBinsForPicklist(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.fetchAllAvailableBinsForPicklist(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function validateBinNumberForPicklist(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.validateBinNumberForPicklist(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function pickProductFromBinForPicklist(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.pickProductFromBinForPicklist(pool, values);
        return res.status(200).json({ message: `Product picked successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getNewSalesOrderShipment(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.getNewSalesOrderShipment(pool, values);
        return res.status(200).json({ message: `New Sales Order Shipment fetched Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getSalesOrderShipment(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.getSalesOrderShipment(pool, values.SalesOrderShipmentID);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function getAllSalesOrderShipments(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.getAllSalesOrderShipments(pool, values);
        return res.status(200).json({ data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

async function updateSalesOrderShipment(req, res) {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    try {
        const result = await soService.updateSalesOrderShipment(pool, values);
        return res.status(200).json({ message: `Sales Order Shipment updated Successfully`, data: result });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

module.exports.getNewSalesOrder = getNewSalesOrder;
module.exports.getSalesOrder = getSalesOrder;
module.exports.getAllSalesOrders = getAllSalesOrders;
module.exports.updateSalesOrder = updateSalesOrder;
module.exports.deleteSalesOrder = deleteSalesOrder;
module.exports.getAllAvailableBinProducts = getAllAvailableBinProducts;
module.exports.getAllBinProductsBatchNumbers = getAllBinProductsBatchNumbers;
module.exports.addNewProductForSalesOrder = addNewProductForSalesOrder;
module.exports.getSalesOrderProduct = getSalesOrderProduct;
module.exports.getSalesOrderAllProducts = getSalesOrderAllProducts;
module.exports.updateSalesOrderProduct = updateSalesOrderProduct;
module.exports.deleteSalesOrderProduct = deleteSalesOrderProduct;
module.exports.getAllPickListOrders = getAllPickListOrders;
module.exports.getAllPicklistOrderPickedProducts = getAllPicklistOrderPickedProducts;
module.exports.getSalesOrderAllPendingProductsForPicklist = getSalesOrderAllPendingProductsForPicklist;
module.exports.suggestBinForPicklist = suggestBinForPicklist;
module.exports.fetchAllAvailableBinsForPicklist = fetchAllAvailableBinsForPicklist;
module.exports.validateBinNumberForPicklist = validateBinNumberForPicklist;
module.exports.pickProductFromBinForPicklist = pickProductFromBinForPicklist;
module.exports.getNewSalesOrderShipment = getNewSalesOrderShipment;
module.exports.getSalesOrderShipment = getSalesOrderShipment;
module.exports.getAllSalesOrderShipments = getAllSalesOrderShipments;
module.exports.updateSalesOrderShipment = updateSalesOrderShipment;