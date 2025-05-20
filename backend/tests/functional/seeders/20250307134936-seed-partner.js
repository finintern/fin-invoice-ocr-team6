'use strict';
const { v4: uuidv4 } = require('uuid');


module.exports = {
  up: async (queryInterface) => {
    return queryInterface.bulkInsert('partner', [
      {
        uuid: uuidv4(),
        email: 'admin@example.com',
        password: "password",
        name: 'Admin User',
        company_name: 'Admin Company',
        code: 'ADM001',
        role: 'admin',
        phone_number: '1234567890',
        menu: JSON.stringify({ allowedMenus: ['dashboard', 'settings', 'users'] }),
        auth: JSON.stringify({ permissions: ['create', 'read', 'update', 'delete'] }),
        config: JSON.stringify({ theme: 'light', notifications: true }),
        data_expiry_day: 30,
        client_id: 'client_' + uuidv4().substring(0, 8),
        client_secret: 'secret_' + uuidv4().substring(0, 8),
        two_factor_authentication: 'none',
        secret: null,
        status: 'approved',
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        last_login_at: new Date(),
        password_expired_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      },
      {
        uuid: 'uuid_dummy',
        email: 'dummy@example.com',
        password: 'password',
        name: 'Dummy Partner',
        company_name: 'Dummy Company',
        code: 'PRT001',
        role: 'partner',
        phone_number: '2345678901',
        menu: JSON.stringify({ allowedMenus: ['dashboard', 'invoices'] }),
        auth: JSON.stringify({ permissions: ['read', 'create'] }),
        config: JSON.stringify({ theme: 'dark', notifications: false }),
        data_expiry_day: 14,
        client_id: 'client_dummy',
        client_secret: 'secret_dummy',
        two_factor_authentication: 'inactive',
        secret: null,
        status: 'approved',
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        last_login_at: new Date(),
        password_expired_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      }, 
      {
        uuid: 'uuid_another',
        email: 'partner_another@example.com',
        password: 'password',
        name: 'Aanother Partner',
        company_name: 'Aanother Company',
        code: 'PRT001',
        role: 'partner',
        phone_number: '2345678901',
        menu: JSON.stringify({ allowedMenus: ['dashboard', 'invoices'] }),
        auth: JSON.stringify({ permissions: ['read', 'create'] }),
        config: JSON.stringify({ theme: 'dark', notifications: false }),
        data_expiry_day: 14,
        client_id: 'client_another',
        client_secret: 'secret_another',
        two_factor_authentication: 'inactive',
        secret: null,
        status: 'approved',
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        last_login_at: new Date(),
        password_expired_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      }
    ], {});
  },

  down: async (queryInterface) => {
    return queryInterface.bulkDelete('partner', null, {});
  }
};