import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { useSettings } from '../context/SettingsContext';
import { PhotoPreview } from '../components/PhotoPreview';
import { StickyBottomCTA } from '../components/StickyBottomCTA';
import { MD3TopBar } from '../components/md3/MD3TopBar';
import { MD3Button } from '../components/md3/MD3Button';
import { MD3Chip } from '../components/md3/MD3Chip';
import { Icon } from '../components/md3/Icon';
import { PRESET_TAGS } from '../types';
import type { Product, ProductImage } from '../types';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProductWithImages, deleteProduct, deleteImage, updateImageTag, updateProductMrp, updateProductQty } = useProducts();
  const { settings } = useSettings();
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);

  // Inline MRP editing
  const [editingMrp, setEditingMrp] = useState(false);
  const [mrpValue, setMrpValue] = useState('');

  // Inline Qty editing
  const [editingQty, setEditingQty] = useState(false);
  const [qtyValue, setQtyValue] = useState('');

  const reload = useCallback(() => {
    if (!id) return;
    getProductWithImages(Number(id)).then((data) => {
      if (data) {
        setProduct(data.product);
        setImages(data.images);
      } else {
        setProduct(null);
        setImages([]);
      }
      setLoading(false);
    });
  }, [id, getProductWithImages]);

  useEffect(() => { reload(); }, [reload]);

  const handleDelete = async () => {
    if (!product?.id) return;
    if (window.confirm('Delete this product? This cannot be undone.')) {
      await deleteProduct(product.id);
      navigate('/products');
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!window.confirm('Delete this photo?')) return;
    await deleteImage(imageId);
    const remaining = images.filter((img) => img.id !== imageId);
    setImages(remaining);
    if (remaining.length === 0 && product?.id) {
      await deleteProduct(product.id);
      navigate('/products');
    }
  };

  const handleChangeTag = async (imageId: number, newTag: string) => {
    await updateImageTag(imageId, newTag);
    setImages((prev) => prev.map((img) => (img.id === imageId ? { ...img, positionTag: newTag } : img)));
    setEditingTagId(null);
  };

  const handleStartEditMrp = () => {
    setMrpValue(product?.mrp || '');
    setEditingMrp(true);
  };

  const handleSaveMrp = async () => {
    if (!product?.id) return;
    const trimmed = mrpValue.trim();
    await updateProductMrp(product.id, trimmed || '');
    setProduct((prev) => prev ? { ...prev, mrp: trimmed || null } : prev);
    setEditingMrp(false);
  };

  const handleStartEditQty = () => {
    setQtyValue(product?.qty != null ? String(product.qty) : '');
    setEditingQty(true);
  };

  const handleSaveQty = async () => {
    if (!product?.id) return;
    const trimmed = qtyValue.trim();
    const qty = trimmed === '' ? null : parseInt(trimmed, 10);
    await updateProductQty(product.id, isNaN(qty as number) ? null : qty);
    setProduct((prev) => prev ? { ...prev, qty } : prev);
    setEditingQty(false);
  };

  const canEditTags = true;

  if (loading) {
    return <div className="p-4 text-center text-on-surface-variant pt-20">Loading...</div>;
  }

  if (!product) {
    return (
      <div className="p-4 text-center pt-20">
        <p className="text-on-surface-variant">Product not found</p>
        <button onClick={() => navigate('/products')} className="text-primary text-sm mt-2">
          Back to list
        </button>
      </div>
    );
  }

  const grouped = images.reduce<Record<string, ProductImage[]>>((acc, img) => {
    (acc[img.positionTag] ??= []).push(img);
    return acc;
  }, {});

  const allTags = [...PRESET_TAGS, ...settings.customTags];

  return (
    <>
      <MD3TopBar
        title="Product Details"
        leading={
          <button
            onClick={() => navigate('/products')}
            className="w-10 h-10 flex items-center justify-center rounded-full"
          >
            <Icon name="arrow-back" className="text-on-frame" />
          </button>
        }
      />
      <div className="p-4 max-w-sm mx-auto space-y-4 pb-40">
        {/* Info card */}
        <div className="bg-surface rounded-[var(--md-shape-md)] border border-outline-variant p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Barcode</span>
            <span className="font-mono font-medium text-on-surface">{product.barcode}</span>
          </div>

          {/* Editable MRP */}
          <div className="flex justify-between text-sm items-center">
            <span className="text-on-surface-variant">MRP</span>
            {editingMrp ? (
              <div className="flex items-center gap-1.5">
                <span className="text-on-surface-variant">₹</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={mrpValue}
                  onChange={(e) => setMrpValue(e.target.value)}
                  className="w-24 px-2 py-1 border border-primary rounded-[var(--md-shape-xs)] text-sm text-on-surface bg-transparent focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveMrp()}
                />
                <button onClick={handleSaveMrp} className="text-primary">
                  <Icon name="check" size={18} />
                </button>
                <button onClick={() => setEditingMrp(false)} className="text-on-surface-variant">
                  <Icon name="close" size={18} />
                </button>
              </div>
            ) : (
              <button onClick={handleStartEditMrp} className="flex items-center gap-1 group">
                <span className="font-medium text-on-surface">
                  {product.mrp ? `₹${product.mrp}` : '—'}
                </span>
                <Icon name="edit" size={14} className="text-on-surface-variant opacity-0 group-hover:opacity-100 group-active:opacity-100" />
              </button>
            )}
          </div>

          {/* Editable Qty */}
          <div className="flex justify-between text-sm items-center">
            <span className="text-on-surface-variant">Qty</span>
            {editingQty ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  value={qtyValue}
                  onChange={(e) => setQtyValue(e.target.value)}
                  className="w-20 px-2 py-1 border border-primary rounded-[var(--md-shape-xs)] text-sm text-on-surface bg-transparent focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveQty()}
                />
                <button onClick={handleSaveQty} className="text-primary">
                  <Icon name="check" size={18} />
                </button>
                <button onClick={() => setEditingQty(false)} className="text-on-surface-variant">
                  <Icon name="close" size={18} />
                </button>
              </div>
            ) : (
              <button onClick={handleStartEditQty} className="flex items-center gap-1 group">
                <span className="font-medium text-on-surface">
                  {product.qty != null ? product.qty : '—'}
                </span>
                <Icon name="edit" size={14} className="text-on-surface-variant opacity-0 group-hover:opacity-100 group-active:opacity-100" />
              </button>
            )}
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Captured</span>
            <span className="text-on-surface">{product.capturedAt.toLocaleString()}</span>
          </div>
        </div>

        {/* Images grouped by tag */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-on-surface-variant uppercase tracking-wide">
            Photos ({images.length})
          </h2>
          {Object.entries(grouped).map(([tag, imgs]) => (
            <div key={tag}>
              <p className="text-xs font-medium text-on-surface-variant mb-2 uppercase">{tag}</p>
              <div className="flex gap-3 flex-wrap">
                {imgs.map((img) => (
                  <div key={img.id} className="relative">
                    <PhotoPreview blob={img.blob} size="lg" />
                    {/* Delete photo */}
                    <button
                      onClick={() => img.id && handleDeleteImage(img.id)}
                      className="absolute -top-2 -right-2 w-7 h-7 bg-error text-on-error rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform"
                    >
                      <Icon name="close" size={14} />
                    </button>
                    {/* Editable tag chip (only for unsynced) */}
                    {canEditTags && (
                      <button
                        onClick={() => setEditingTagId(editingTagId === img.id ? null : (img.id ?? null))}
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-secondary-container text-on-secondary-container text-[10px] px-2.5 py-0.5 rounded-full font-medium shadow-sm whitespace-nowrap"
                      >
                        {img.positionTag}
                      </button>
                    )}
                    {/* Tag picker dropdown */}
                    {editingTagId === img.id && img.id && (
                      <div className="absolute top-full left-0 mt-4 z-10 bg-surface border border-outline-variant rounded-[var(--md-shape-sm)] shadow-lg p-2 min-w-[180px]">
                        <div className="flex flex-wrap gap-1">
                          {allTags.map((t) => (
                            <MD3Chip
                              key={t}
                              label={t}
                              selected={img.positionTag === t}
                              onClick={() => handleChangeTag(img.id!, t)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Delete product - in sticky CTA */}
        <StickyBottomCTA>
          <MD3Button variant="outlined" fullWidth onClick={handleDelete} className="!border-error !text-error">
            <span className="flex items-center justify-center gap-2">
              <Icon name="delete" size={18} />
              Delete Product
            </span>
          </MD3Button>
        </StickyBottomCTA>
      </div>
    </>
  );
}
