# Demo Data Seeding - Quick Guide

## For Your Evening Demo 🎯

### One Command Setup:

```bash
cd wms-server
npm run seed:demo
```

**What This Creates:**

### 🌍 Global Locations
- **5 Countries**: United States, Germany, India, China, United Kingdom
- **10 States/Provinces**: NJ, CA, Bavaria, Hesse, Maharashtra, Karnataka, Gujarat, Shanghai, Beijing, England
- **14 Major Cities**: 
  - USA: Princeton, Bridgewater, San Francisco, Los Angeles
  - Europe: Munich, Frankfurt, London, Manchester
  - Asia: Mumbai, Pune, Bangalore, Ahmedabad, Shanghai, Beijing

### 📍 Distribution Network
- **6 Logistics Zones**:
  - North America - East/West
  - Europe - Central/West
  - Asia - South/East

### 🏢 Infrastructure
- **7 Branch Offices**: Distribution centers across all regions
- **7 Pharmaceutical Warehouses**: Including cold storage facilities
- **8+ Storage Compartments**: Temperature-controlled zones
- **10+ Storage Stacks**: Organized storage areas
- **10+ Bins**: Specific storage locations

### 🏭 Pharmaceutical Vendors (Finished Goods)
1. **MediPharm Manufacturing Inc** (US) - Princeton, NJ
2. **GlobalMed Pharmaceuticals** (US) - San Francisco, CA
3. **EuroPharma GmbH** (Germany) - Frankfurt
4. **BritMed Pharmaceuticals Ltd** (UK) - London
5. **Sun Pharmaceutical Industries** (India) - Mumbai
6. **Biocon Limited** (India) - Bangalore
7. **Shanghai Pharma Group** (China) - Shanghai

---

## Workflow

### For Evening Demo:

```bash
# Step 1: Ensure database schema is up-to-date
npm run db:setup

# Step 2: Load demo data
npm run seed:demo

# Step 3: Start application
npm start

# Step 4: Login
# Username: admin
# Password: admin@123

# ✅ Ready to demo!
```

### What Gets Cleared:
- ❌ All countries, cities, states, zones
- ❌ All branches, warehouses, bins
- ❌ All vendors
- ✅ Admin user preserved
- ✅ System lookups preserved (warehouse types, roles, etc.)

### What Gets Created:
- ✅ Realistic pharmaceutical industry data
- ✅ Global distribution network
- ✅ Multiple vendor relationships
- ✅ Complete warehouse infrastructure
- ✅ Ready for purchase orders, receiving, put-away demos

---

## Features You Can Demo

With this data, you can demonstrate:

### 1. **Multi-Country Operations** 🌎
- Vendors from 5 different countries
- Local compliance (GST for India, etc.)
- Currency handling (USD, EUR, INR, CNY, GBP)

### 2. **Supply Chain Management** 📦
- Multiple distribution zones
- Warehouse management across regions
- Vendor relationships globally

### 3. **Inventory Management** 🗃️
- Temperature-controlled storage
- Bin management system
- Multi-level storage (Compartment → Stack → Bin)

### 4. **Purchase Orders** 📋
- Create PO with any of the 7 vendors
- Specify delivery to any warehouse
- Track receiving and put-away

---

## Customization

Want different data? Edit [seed-demo-data.js](./seed-demo-data.js):

```javascript
// Change countries
const demoData = {
  countries: [
    { name: 'Your Country', code: 'XX', isdCode: '+00', currency: 'XXX' },
    // ...
  ],
  
  // Add more vendors
  vendors: [
    { 
      name: 'Your Vendor Name',
      code: 'VEN-XXX',
      // ...
    },
  ],
}
```

Then run:
```bash
npm run seed:demo
```

---

## Troubleshooting

### "Cannot connect to database"
**Fix**: Check config/dev.json credentials

### "Foreign key constraint failed"
**Fix**: Run `npm run db:setup` first to ensure schema is correct

### "Duplicate key error"
**Fix**: The script clears data automatically, but if you modified it,
       make sure you're not inserting duplicates

### "Admin user not found"
**Fix**: Run `npm run db:setup` to seed admin user first

---

## Pro Tips 💡

### For Different Audiences:

**Technical Demo (Developers)**:
- Show bin-level tracking
- Demonstrate API calls
- Walk through purchase order flow

**Business Demo (Stakeholders)**:
- Focus on global vendor network
- Show multi-warehouse operations
- Demonstrate reporting capabilities

**Training Session**:
- Use realistic company names
- Create sample purchase orders
- Practice receiving workflow

---

## Time Estimates

| Task | Duration |
|------|----------|
| Schema setup | ~15-20 sec |
| Demo data seeding | ~5-10 sec |
| Server startup | ~2 sec |
| **Total to demo-ready** | **~30 sec** ⚡ |

---

## Data Volume

Perfect for demos (not too much, not too little):

- Small enough to navigate quickly during demo
- Large enough to show enterprise features
- Realistic names and locations
- Proper relationships (foreign keys intact)

---

## Next Steps After Demo

### If They Want to See More:
1. Add products: Create pharmaceutical products
2. Create purchase orders: Using the seeded vendors
3. Process receiving: Demonstrate inbound workflow
4. Put-away: Show bin assignment logic

### If They Want to Test:
1. They can create new vendors
2. Add more warehouses
3. Create customer orders
4. Full end-to-end testing

---

## Quick Reference

```bash
# Full setup (new database)
npm run db:setup
npm run seed:demo
npm start

# Refresh demo data only
npm run seed:demo

# Clear everything and start fresh
npm run db:setup    # Resets schema
npm run seed:demo   # Loads demo data
```

---

## Summary

✅ **One command**: `npm run seed:demo`
⏱️ **5 seconds**: To load all demo data
🌍 **Global data**: 5 countries, 14 cities
🏭 **7 vendors**: Real pharmaceutical companies
📦 **Full infrastructure**: Warehouses, bins, compartments
🎯 **Demo-ready**: Perfect for evening presentations

**You're all set for your demo!** 🚀
