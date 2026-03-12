import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/ProductCard';
import { ProductListRow } from '../components/ProductListRow';
import { StickyBottomCTA } from '../components/StickyBottomCTA';
import { ShareDialog } from '../components/ShareDialog';
import { MD3Chip } from '../components/md3/MD3Chip';
import { MD3Button } from '../components/md3/MD3Button';
import { MD3TextField } from '../components/md3/MD3TextField';
import { Icon } from '../components/md3/Icon';
import type { Product, ViewMode, DateFilter, DateFilterOp } from '../types';

const DATE_FILTER_MODES: { value: DateFilterOp; label: string }[] = [
  { value: 'equal', label: 'On date' },
  { value: 'gte', label: 'After date' },
  { value: 'between', label: 'Between' },
];

export function ProductListPage() {
  const { getProducts, deleteProduct } = useProducts();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Date filter state
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFilterOp, setDateFilterOp] = useState<DateFilterOp>('equal');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeDateFilter, setActiveDateFilter] = useState<DateFilter | undefined>();

  // Share dialog state
  const [shareTarget, setShareTarget] = useState<'email' | 'gdrive' | null>(null);

  const selectMode = selected.size > 0;

  const loadProducts = useCallback(() => {
    setLoading(true);
    getProducts(activeDateFilter).then((p) => {
      setProducts(p);
      setLoading(false);
    });
  }, [getProducts, activeDateFilter]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = new Set(products.filter((p) => p.id !== undefined).map((p) => p.id!));
    setSelected(allIds);
  };

  const handleDeselectAll = () => {
    setSelected(new Set());
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Delete ${selected.size} product(s)? This cannot be undone.`)) return;
    for (const id of selected) {
      await deleteProduct(id);
    }
    setSelected(new Set());
    loadProducts();
  };

  const handleCardAction = (product: Product) => {
    if (selectMode) {
      if (product.id) toggleSelect(product.id);
    } else {
      navigate(`/products/${product.id}`);
    }
  };

  const handleLongPress = (product: Product) => {
    if (product.id) toggleSelect(product.id);
  };

  const handleApplyDateFilter = () => {
    if (!dateFrom) return;
    setActiveDateFilter({
      op: dateFilterOp,
      date: dateFrom,
      dateTo: dateFilterOp === 'between' ? dateTo : undefined,
    });
  };

  const handleClearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
    setActiveDateFilter(undefined);
  };

  const selectedIds = Array.from(selected);

  return (
    <div className="p-4 max-w-lg mx-auto pb-40">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        {selectMode ? (
          <>
            <div className="flex items-center gap-2">
              <button onClick={handleDeselectAll} className="w-10 h-10 flex items-center justify-center">
                <Icon name="close" size={22} className="text-on-surface" />
              </button>
              <span className="text-lg font-medium text-on-surface">{selected.size} selected</span>
            </div>
            <div className="flex items-center gap-1">
              {selected.size < products.length ? (
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-primary font-medium px-2 py-1"
                >
                  Select All
                </button>
              ) : (
                <button
                  onClick={handleDeselectAll}
                  className="text-xs text-primary font-medium px-2 py-1"
                >
                  Deselect All
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-medium text-on-surface">Products</h1>
            <div className="flex items-center gap-1">
              <span className="text-sm text-on-surface-variant mr-2">{products.length}</span>
              <button
                onClick={() => setShowDateFilter(!showDateFilter)}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                  activeDateFilter ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'
                }`}
              >
                <Icon name="filter_list" size={20} />
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant"
              >
                <Icon name={viewMode === 'grid' ? 'view_list' : 'grid_view'} size={20} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Date filter panel */}
      {showDateFilter && !selectMode && (
        <div className="mb-4 bg-surface-container rounded-[var(--md-shape-md)] p-3 space-y-3">
          {/* Date filter mode chips */}
          <div className="flex gap-2">
            {DATE_FILTER_MODES.map((m) => (
              <MD3Chip
                key={m.value}
                label={m.label}
                selected={dateFilterOp === m.value}
                onClick={() => setDateFilterOp(m.value)}
              />
            ))}
          </div>

          {/* Date inputs */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <MD3TextField
                label={dateFilterOp === 'between' ? 'From' : 'Date'}
                value={dateFrom}
                onChange={setDateFrom}
                type="date"
              />
            </div>
            {dateFilterOp === 'between' && (
              <div className="flex-1">
                <MD3TextField
                  label="To"
                  value={dateTo}
                  onChange={setDateTo}
                  type="date"
                />
              </div>
            )}
            <MD3Button variant="tonal" onClick={handleApplyDateFilter}>
              <Icon name="search" size={18} />
            </MD3Button>
          </div>

          {/* Active filter badge */}
          {activeDateFilter && (
            <div className="flex items-center gap-2">
              <MD3Chip
                label="Clear filter"
                selected={false}
                onClick={handleClearDateFilter}
              />
              <span className="text-xs text-on-surface-variant">
                {activeDateFilter.op === 'equal' && `On ${activeDateFilter.date}`}
                {activeDateFilter.op === 'gte' && `After ${activeDateFilter.date}`}
                {activeDateFilter.op === 'between' && `${activeDateFilter.date} to ${activeDateFilter.dateTo}`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Product list */}
      {loading ? (
        <div className="text-center text-on-surface-variant py-12">Loading...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-4xl">📦</p>
          <p className="text-on-surface-variant">No products yet</p>
          <button
            onClick={() => navigate('/capture')}
            className="text-primary font-medium text-sm"
          >
            Start capturing
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-3">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onClick={() => handleCardAction(p)}
              onLongPress={() => handleLongPress(p)}
              selected={selectMode && p.id !== undefined && selected.has(p.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((p) => (
            <ProductListRow
              key={p.id}
              product={p}
              onClick={() => handleCardAction(p)}
              onLongPress={() => handleLongPress(p)}
              selected={selectMode && p.id !== undefined && selected.has(p.id)}
            />
          ))}
        </div>
      )}

      {/* Selection CTA */}
      {selectMode && (
        <StickyBottomCTA>
          <div className="flex gap-2">
            <MD3Button
              variant="outlined"
              onClick={handleDeleteSelected}
              className="flex-1 !border-error !text-error"
            >
              <span className="flex items-center justify-center gap-1.5">
                <Icon name="delete" size={16} />
                Delete
              </span>
            </MD3Button>
            <MD3Button
              variant="tonal"
              onClick={() => setShareTarget('email')}
              className="flex-1"
            >
              <span className="flex items-center justify-center gap-1.5">
                <Icon name="mail" size={16} />
                Email
              </span>
            </MD3Button>
            <MD3Button
              variant="tonal"
              onClick={() => setShareTarget('gdrive')}
              className="flex-1"
            >
              <span className="flex items-center justify-center gap-1.5">
                <Icon name="cloud_upload" size={16} />
                Drive
              </span>
            </MD3Button>
          </div>
        </StickyBottomCTA>
      )}

      {/* Share dialog */}
      {shareTarget && (
        <ShareDialog
          productIds={selectedIds}
          target={shareTarget}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}
