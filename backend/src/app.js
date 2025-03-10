const express = require('express');
const invoiceRoutes = require('./routes/invoiceRoutes')
const app = express();
app.disable("x-powered-by");

app.use(express.json());

app.use('/api/invoices', invoiceRoutes);
app.disable('x-powered-by');
module.exports = app;