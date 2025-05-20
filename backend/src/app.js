const express = require('express');
const invoiceRoutes = require('./routes/invoiceRoute');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoute');
const sandboxRoutes = require('./routes/sandboxRoute');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const healthRoutes = require('./routes/healthRoute');
const app = express();
app.disable("x-powered-by");


app.use('/health', healthRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/sandbox', sandboxRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
module.exports = app;