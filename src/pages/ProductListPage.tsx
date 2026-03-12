import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/ProductCard';
import { ProductListRow } from '../components/ProductListRow';
import { StickyBottomCTA } from '../components/StickyBottomCTA';
import { shareProducts } from '../utils/shareUtils';
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

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Date filter state
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFilterOp, setDateFilterOp] = useState<DateFilterOp>('equal');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeDateFilter, setActiveDateFilter] = useState<DateFilter | undefined>();

  const [sharing, setSharing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectMode = selected.size > 0;

  const loadProducts = useCallback(() => {
    setLoading(true);
    getProducts(activeDateFilter).then((p) => {
      setProducts(p);
      setLoading(false);
    });
  }, [getProducts, activeDateFilter]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.trim().toUpperCase();
    if (!q) return products;
    return products.filter((p) => p.barcode.toUpperCase().includes(q));
  }, [products, searchQuery]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = new Set(filteredProducts.filter((p) => p.id !== undefined).map((p) => p.id!));
    setSelected(allIds);
  };

  const handleDeselectAll = () => {
    setSelected(new Set());
  };

  const handleDeleteSelected = async () => {
    for (const id of selected) {
      await deleteProduct(id);
    }
    setSelected(new Set());
    setConfirmDelete(false);
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
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        {selectMode ? (
          <>
            <div className="flex items-center gap-2">
              <button onClick={handleDeselectAll} className="w-10 h-10 flex items-center justify-center">
                <Icon name="close" size={22} className="text-on-surface" />
              </button>
              <span className="text-lg font-medium text-on-surface">{selected.size} selected</span>
            </div>
            <div className="flex items-center gap-1">
              {selected.size < filteredProducts.length ? (
                <button onClick={handleSelectAll} className="text-xs text-primary font-medium px-2 py-1">
                  Select All
                </button>
              ) : (
                <button onClick={handleDeselectAll} className="text-xs text-primary font-medium px-2 py-1">
                  Deselect All
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-medium text-on-surface">Products</h1>
              <span className="text-xs bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full font-medium">
                {filteredProducts.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                  showSearch ? 'bg-primary-container text-on-primary-container' : 'text-on-surface'
                }`}
              >
                <Icon name="search" size={22} />
              </button>
              <button
                onClick={() => { setShowDateFilter(!showDateFilter); if (!showDateFilter) setShowSearch(false); }}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                  activeDateFilter || showDateFilter ? 'bg-primary-container text-on-primary-container' : 'text-on-surface'
                }`}
              >
                <Icon name="filter_list" size={22} />
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface"
              >
                <Icon name={viewMode === 'grid' ? 'view_list' : 'grid_view'} size={22} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Search bar */}
      {showSearch && !selectMode && (
        <div className="mb-3 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            <Icon name="search" size={18} />
          </span>
          <input
            type="text"
            inputMode="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by barcode..."
            autoFocus
            className="w-full pl-10 pr-10 py-2.5 bg-surface-container rounded-full text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
      )}

      {/* Date filter panel */}
      {showDateFilter && !selectMode && (
        <div className="mb-3 bg-surface-container rounded-[var(--md-shape-md)] p-3 space-y-3">
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

          {activeDateFilter && (
            <div className="flex items-center gap-2">
              <MD3Chip label="Clear filter" selected={false} onClick={handleClearDateFilter} />
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
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-on-surface-variant text-sm">No products match "{searchQuery}"</p>
          <button onClick={() => setSearchQuery('')} className="text-primary font-medium text-sm">
            Clear search
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map((p) => (
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
          {filteredProducts.map((p) => (
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
              onClick={() => setConfirmDelete(true)}
              className="flex-1 !border-error !text-error"
            >
              <span className="flex items-center justify-center gap-1.5">
                <Icon name="delete" size={16} />
                Delete
              </span>
            </MD3Button>
            <MD3Button
              variant="filled"
              disabled={sharing}
              onClick={async () => {
                setSharing(true);
                const result = await shareProducts(selectedIds, 'csv', 'email');
                setSharing(false);
                if (result.success) {
                  setSelected(new Set());
                }
              }}
              className="flex-1"
            >
              <span className="flex items-center justify-center gap-1.5">
                <Icon name="share" size={16} />
                {sharing ? 'Preparing...' : 'Share'}
              </span>
            </MD3Button>
          </div>
        </StickyBottomCTA>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirmDelete(false)}>
          <div
            className="bg-surface rounded-[var(--md-shape-lg)] p-6 mx-6 max-w-sm w-full shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <Icon name="warning" size={24} className="text-error flex-shrink-0" />
              <h3 className="text-lg font-medium text-on-surface">Delete Products</h3>
            </div>
            <p className="text-sm text-on-surface-variant">
              Delete {selected.size} product{selected.size > 1 ? 's' : ''}? This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <MD3Button variant="text" onClick={() => setConfirmDelete(false)}>Cancel</MD3Button>
              <MD3Button variant="filled" onClick={handleDeleteSelected} className="!bg-error !text-on-error">Delete</MD3Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
