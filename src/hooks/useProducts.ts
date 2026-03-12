import { useCallback } from 'react';
import { db } from '../db';
import type { Product, ProductImage, CapturedImage, DateFilter, DuplicateInfo } from '../types';

export function useProducts() {
  const createProduct = useCallback(
    async (
      barcode: string,
      mrp: string | null,
      images: CapturedImage[],
      qty?: number | null,
    ): Promise<number> => {
      const productId = await db.products.add({
        barcode,
        mrp,
        qty: qty ?? null,
        capturedAt: new Date(),
      });

      const now = new Date();
      for (let i = 0; i < images.length; i++) {
        const img = images[i];

        await db.images.add({
          productId: productId as number,
          blob: img.blob,
          positionTag: img.tag,
          capturedAt: now,
        } as ProductImage);
      }

      return productId as number;
    },
    [],
  );

  const addMoreImages = useCallback(
    async (existingProductId: number, newImages: CapturedImage[]) => {
      const product = await db.products.get(existingProductId);
      if (!product) return;

      const now = new Date();
      for (let i = 0; i < newImages.length; i++) {
        const img = newImages[i];

        await db.images.add({
          productId: existingProductId,
          blob: img.blob,
          positionTag: img.tag,
          capturedAt: now,
        } as ProductImage);
      }
    },
    [],
  );

  const replaceAllImages = useCallback(
    async (existingProductId: number, newImages: CapturedImage[]) => {
      const product = await db.products.get(existingProductId);
      if (!product) return;

      // Delete all old images
      await db.images.where('productId').equals(existingProductId).delete();

      // Add new images
      const now = new Date();
      for (let i = 0; i < newImages.length; i++) {
        const img = newImages[i];

        await db.images.add({
          productId: existingProductId,
          blob: img.blob,
          positionTag: img.tag,
          capturedAt: now,
        } as ProductImage);
      }
    },
    [],
  );

  const getProducts = useCallback(async (dateFilter?: DateFilter): Promise<Product[]> => {
    let results: Product[];

    if (dateFilter) {
      const startOfDay = (d: string) => new Date(d + 'T00:00:00');
      const endOfDay = (d: string) => new Date(d + 'T23:59:59.999');

      let collection;
      switch (dateFilter.op) {
        case 'equal':
          collection = db.products.where('capturedAt').between(startOfDay(dateFilter.date), endOfDay(dateFilter.date), true, true);
          break;
        case 'gte':
          collection = db.products.where('capturedAt').aboveOrEqual(startOfDay(dateFilter.date));
          break;
        case 'between':
          collection = db.products.where('capturedAt').between(
            startOfDay(dateFilter.date),
            endOfDay(dateFilter.dateTo || dateFilter.date),
            true,
            true,
          );
          break;
      }

      results = await collection.toArray();
      results.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
    } else {
      results = await db.products.reverse().sortBy('capturedAt');
    }

    return results;
  }, []);

  const getProductWithImages = useCallback(
    async (id: number): Promise<{ product: Product; images: ProductImage[] } | null> => {
      const product = await db.products.get(id);
      if (!product) return null;
      const images = await db.images.where('productId').equals(id).toArray();
      return { product, images };
    },
    [],
  );

  const getFirstImage = useCallback(async (productId: number): Promise<ProductImage | undefined> => {
    return db.images.where('productId').equals(productId).first();
  }, []);

  const deleteProduct = useCallback(async (id: number) => {
    await db.images.where('productId').equals(id).delete();
    await db.products.delete(id);
  }, []);

  const deleteImage = useCallback(async (imageId: number) => {
    await db.images.delete(imageId);
  }, []);

  const updateImageTag = useCallback(async (imageId: number, newTag: string) => {
    await db.images.update(imageId, { positionTag: newTag });
  }, []);

  const findByBarcode = useCallback(async (barcode: string): Promise<Product[]> => {
    return db.products.where('barcode').equals(barcode).toArray();
  }, []);

  const getDuplicateInfo = useCallback(async (barcode: string): Promise<DuplicateInfo[]> => {
    const products = await db.products.where('barcode').equals(barcode).toArray();
    const results: DuplicateInfo[] = [];

    for (const product of products) {
      if (!product.id) continue;
      const images = await db.images.where('productId').equals(product.id).toArray();
      const firstImage = images.length > 0 ? images[0] : null;
      results.push({
        product,
        thumbBlob: firstImage?.blob ?? null,
        imageCount: images.length,
      });
    }

    return results;
  }, []);

  const updateProductMrp = useCallback(async (productId: number, mrp: string) => {
    await db.products.update(productId, { mrp });
  }, []);

  const updateProductQty = useCallback(async (productId: number, qty: number | null) => {
    await db.products.update(productId, { qty });
  }, []);

  const getImageCount = useCallback(async (productId: number): Promise<number> => {
    return db.images.where('productId').equals(productId).count();
  }, []);

  return {
    createProduct,
    addMoreImages,
    replaceAllImages,
    getProducts,
    getProductWithImages,
    getFirstImage,
    deleteProduct,
    deleteImage,
    updateImageTag,
    findByBarcode,
    getDuplicateInfo,
    updateProductMrp,
    updateProductQty,
    getImageCount,
  };
}
