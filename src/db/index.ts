import Dexie, { type Table } from 'dexie';
import type { AppSettings, Product, ProductImage } from '../types';

class CatalogueDB extends Dexie {
  settings!: Table<AppSettings>;
  products!: Table<Product>;
  images!: Table<ProductImage>;

  constructor() {
    super('lite-catalogue');

    this.version(1).stores({
      settings: '++id',
      products: '++id, barcode, syncStatus, capturedAt',
      images: '++id, productId, positionTag',
    });

    this.version(2).stores({
      settings: '++id',
      products: '++id, barcode, syncStatus, capturedAt',
      images: '++id, productId, positionTag',
      captureLog: '++id, productId, imageId, barcode, capturedAt, uploadStatus',
    }).upgrade((tx) => {
      return tx.table('products').toCollection().modify((product) => {
        if (product.ocrText === undefined) {
          product.ocrText = null;
        }
      });
    });

    this.version(3).stores({
      settings: '++id',
      products: '++id, barcode, syncStatus, capturedAt',
      images: '++id, productId, positionTag',
      captureLog: '++id, productId, imageId, barcode, capturedAt, uploadStatus',
    }).upgrade((tx) => {
      return tx.table('captureLog').toCollection().modify((entry) => {
        if (entry.mrp === undefined) {
          entry.mrp = '';
        }
      });
    });

    this.version(4).stores({
      settings: '++id',
      products: '++id, barcode, batchId, syncStatus, capturedAt',
      images: '++id, productId, positionTag',
      captureLog: '++id, productId, imageId, barcode, capturedAt, uploadStatus',
    }).upgrade((tx) => {
      return tx.table('products').toCollection().modify((product) => {
        if (product.batchId === undefined) {
          product.batchId = null;
        }
      });
    });

    // v5: Remove captureLog table, remove batchId index, clean up ocrText/batchId, add qty
    this.version(5).stores({
      settings: '++id',
      products: '++id, barcode, syncStatus, capturedAt',
      images: '++id, productId, positionTag',
      captureLog: null, // Drop captureLog table
    }).upgrade((tx) => {
      return tx.table('products').toCollection().modify((product) => {
        delete product.ocrText;
        delete product.batchId;
        if (product.qty === undefined) {
          product.qty = null;
        }
      });
    });

    // v6: Remove syncStatus from products
    this.version(6).stores({
      settings: '++id',
      products: '++id, barcode, capturedAt',
      images: '++id, productId, positionTag',
    }).upgrade((tx) => {
      return tx.table('products').toCollection().modify((product) => {
        delete product.syncStatus;
      });
    });
  }
}

export const db = new CatalogueDB();
