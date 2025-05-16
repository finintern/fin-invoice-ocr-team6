require('dotenv').config();
const mysql = require('mysql2/promise');
const Sentry = require('../instrument');

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

exports.authenticate = async (clientId, clientSecret) => {
  return Sentry.startSpan(
    {
      name: "auth.authenticate",
      attributes: {
        clientId: clientId ? clientId.substring(0, 3) + '...' : 'undefined', // Only log partial client ID for security
      },
    },
    async (span) => {
      try {
        Sentry.addBreadcrumb({
          category: "auth",
          message: "Authentication attempt started",
          level: "info",
        });

        if (!clientId || !clientSecret) {
          Sentry.addBreadcrumb({
            category: "auth",
            message: "Authentication failed: Missing credentials",
            level: "warning",
          });
          return null;
        }

        const connection = await mysql.createConnection(dbConfig);
        try {
          Sentry.addBreadcrumb({
            category: "auth",
            message: "Database connection established",
            level: "info",
          });

          const query = `
            SELECT uuid, client_id, client_secret 
            FROM partner 
            WHERE client_id = ? AND client_secret = ?
          `;
          const [rows] = await connection.execute(query, [clientId, clientSecret]);

          if (rows.length === 0) {
            Sentry.addBreadcrumb({
              category: "auth",
              message: "Authentication failed: Invalid credentials",
              level: "warning",
            });
            
            // Capture message for failed authentication attempts to monitor security
            Sentry.captureMessage(`Failed authentication attempt for client ID: ${clientId.substring(0, 3)}...`, 
              { level: "warning" });
              
            return null;
          }

          Sentry.addBreadcrumb({
            category: "auth",
            message: "Authentication successful",
            level: "info",
            data: {
              partnerId: rows[0].uuid
            }
          });

          Sentry.captureMessage(`Successful authentication for partner: ${rows[0].uuid}`);
          return rows[0];
        } finally {
          await connection.end();
          Sentry.addBreadcrumb({
            category: "auth",
            message: "Database connection closed",
            level: "info",
          });
        }
      } catch (error) {
        Sentry.addBreadcrumb({
          category: "auth",
          message: `Authentication error: ${error.message}`,
          level: "error",
        });
        
        Sentry.captureException(error);
        throw error;
      } finally {
        span.end();
      }
    }
  );
};