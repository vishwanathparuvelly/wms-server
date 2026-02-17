const countryService = require("../service/Country_Service");

async function addCountry(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await countryService.addCountry(pool, values);
    return res
      .status(201)
      .json({ message: "Country added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getCountry(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { CountryID } = req?.body;
  try {
    const result = await countryService.getCountry(pool, CountryID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllCountries(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await countryService.getAllCountries(pool, values);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}
async function getCountriesLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await countryService.getCountriesLite(pool, values);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateCountry(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await countryService.updateCountry(pool, values);
    return res
      .status(200)
      .json({ message: "Country updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteCountry(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await countryService.deleteCountry(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addCountry,
  getCountry,
  getAllCountries,
  updateCountry,
  deleteCountry,
  getCountriesLite,
};
