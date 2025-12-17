/**
 * Mock Stripe client for testing
 */

export const mockStripe = {
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    del: jest.fn(),
    list: jest.fn()
  },
  subscriptions: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    list: jest.fn()
  },
  paymentMethods: {
    create: jest.fn(),
    retrieve: jest.fn(),
    attach: jest.fn(),
    detach: jest.fn(),
    list: jest.fn()
  },
  invoices: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    list: jest.fn(),
    pay: jest.fn()
  },
  prices: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    list: jest.fn()
  },
  products: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    list: jest.fn()
  },
  webhooks: {
    constructEvent: jest.fn()
  }
};

export default mockStripe;
