require('dotenv').config(); // Load env variables

const { Sequelize, DataTypes } = require('sequelize');
const InvoiceModel = require('./src/models/invoice');
const PartnerModel = require('./src/models/partner'); // Import Partner model
const config = require('./src/database/config.js').development; // Use development configuration

// Create a new Sequelize instance using the configuration details
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: false
  }
);

(async () => {
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    // Sync models (create tables if they do not exist)
    await sequelize.sync({ force: false });
    console.log('Database synchronized.');

    // Initialize Partner model and create a dummy partner if it doesn't exist
    const Partner = PartnerModel(sequelize, DataTypes);

// Cek apakah partner dengan UUID tertentu sudah ada
let dummyPartner = await Partner.findOne({ where: { uuid: "partner-uuid-123" } });

if (!dummyPartner) {
  // Jika tidak ada, buat partner baru
  dummyPartner = await Partner.create({
    uuid: "partner-uuid-123",
    client_id: "surya",
    client_secret: "suryasecret",
    email: "dummy@example.com",
    password: "dummyPassword",
    name: "Dummy Partner",
    created_at: new Date()
  });
  console.log("Dummy Partner created:", dummyPartner.toJSON());
} else {
  // Jika sudah ada, pastikan client_id dan client_secret diperbarui
  await dummyPartner.update({
    client_id: "surya",
    client_secret: "suryasecret"
  });
  console.log("Dummy Partner updated:", dummyPartner.toJSON());
}

    // Initialize the Invoice model
    const Invoice = InvoiceModel(sequelize, DataTypes);

    // Define your invoice data
    const invoiceData = {
      invoice_date: new Date(),
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due date one week later
      purchase_order_id: 123,
      total_amount: 1500.00,
      subtotal_amount: 1400.00,
      discount_amount: 100.00,
      payment_terms: "Net 30",
      file_url: null,
      status: "Processing",
      partner_id: "partner-uuid-123"
    };

    // Create a new Invoice record
    const newInvoice = await Invoice.create(invoiceData);
    console.log("New Invoice created:", newInvoice.toJSON());
  } catch (error) {
    console.error("Error during database operation:", error);
  } finally {
    await sequelize.close();
    console.log("Database connection closed.");
  }
})();