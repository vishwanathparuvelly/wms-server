// Dummy Category data for now
const DUMMY_CATEGORIES = [
  { categoryID: 1, categoryName: "Tablets" },
  { categoryID: 2, categoryName: "Capsules" },
  { categoryID: 3, categoryName: "Liquids" },
  { categoryID: 4, categoryName: "Injections" },
  { categoryID: 5, categoryName: "Creams & Ointments" },
  { categoryID: 6, categoryName: "Powders" },
  { categoryID: 7, categoryName: "Syrups" },
  { categoryID: 8, categoryName: "Drops" },
];

async function getCategories(req, res) {
  try {
    res.json({
      success: true,
      data: DUMMY_CATEGORIES,
    });
  } catch (err) {
    res.json({
      success: false,
      message: err.message,
      statusCode: 500,
    });
  }
}

async function getCategoriesLite(req, res) {
  try {
    const lite = DUMMY_CATEGORIES.map((cat) => ({
      categoryID: cat.categoryID,
      categoryName: cat.categoryName,
    }));
    res.json({
      success: true,
      data: lite,
    });
  } catch (err) {
    res.json({
      success: false,
      message: err.message,
      statusCode: 500,
    });
  }
}

module.exports.getCategories = getCategories;
module.exports.getCategoriesLite = getCategoriesLite;
