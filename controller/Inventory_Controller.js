const initializePool = require('../database/db');
const inventoryService = require('../service/Inventory_Service');

/**
 * Get Material Inventory
 */
const getMaterialInventory = async (req, res, next) => {
    try {
        const pool = await initializePool();
        const filters = {
            WarehouseID: req.body.WarehouseID,
            SearchTerm: req.body.SearchTerm
        };
        
        const data = await inventoryService.getMaterialInventory(pool, filters);
        
        return res.status(200).json({
            ok: true,
            data: data,
            count: data.length
        });
    } catch (err) {
        return res.status(500).json({
            ok: false,
            message: err.message || 'Error fetching material inventory'
        });
    }
};

/**
 * Get Product Inventory
 */
const getProductInventory = async (req, res, next) => {
    try {
        const pool = await initializePool();
        const filters = {
            WarehouseID: req.body.WarehouseID,
            SearchTerm: req.body.SearchTerm,
            ShowNearExpiry: req.body.ShowNearExpiry
        };
        
        const data = await inventoryService.getProductInventory(pool, filters);
        
        return res.status(200).json({
            ok: true,
            data: data,
            count: data.length
        });
    } catch (err) {
        return res.status(500).json({
            ok: false,
            message: err.message || 'Error fetching product inventory'
        });
    }
};

/**
 * Get Inventory Statistics
 */
const getInventoryStats = async (req, res, next) => {
    try {
        const pool = await initializePool();
        const filters = {
            WarehouseID: req.body.WarehouseID
        };
        
        const data = await inventoryService.getInventoryStats(pool, filters);
        
        return res.status(200).json({
            ok: true,
            data: data
        });
    } catch (err) {
        return res.status(500).json({
            ok: false,
            message: err.message || 'Error fetching inventory stats'
        });
    }
};

module.exports = {
    getMaterialInventory,
    getProductInventory,
    getInventoryStats
};
