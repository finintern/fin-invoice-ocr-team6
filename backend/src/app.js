const express = require('express');
const invoiceRoutes = require('./routes/invoiceRoute');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoute');
const sandboxRoutes = require('./routes/sandboxRoute');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const app = express();
app.disable("x-powered-by");

app.use(express.json());

app.use('/api/invoices', invoiceRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/sandbox', sandboxRoutes);
// Setup Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Export the app
module.exports = app;