import { useNavigate, useLocation } from 'react-router-dom';
import { useTour } from '../../context/TourContext';
import { Icon } from './Icon';

const tabs = [
  { path: '/capture', label: 'Capture', icon: 'camera' },
  { path: '/products', label: 'Products', icon: 'inventory' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];

export function MD3NavigationBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { startPageTour, isActive } = useTour();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-frame safe-area-pb">
      {/* Floating help button — hide during active tour */}
      {!isActive && <button
        data-tour="help-btn"
        onClick={startPageTour}
        className="absolute -top-14 right-3 w-11 h-11 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        title="Help & Guide"
      >
        <Icon name="help" size={22} />
      </button>}
      <div className="flex h-16">
        {tabs.map((tab) => {
          const active = location.pathname.startsWith(tab.path);
          const tourId = tab.path === '/capture' ? 'nav-capture' : tab.path === '/products' ? 'nav-products' : 'nav-settings';
          return (
            <button
              key={tab.path}
              data-tour={tourId}
              onClick={() => navigate(tab.path)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
            >
              <div
                className={`
                  flex items-center justify-center w-16 h-8 rounded-full transition-colors
                  ${active ? 'bg-primary-container' : 'bg-transparent'}
                `}
              >
                <Icon
                  name={tab.icon}
                  size={22}
                  className={active ? 'text-on-primary-container' : 'text-on-frame/70'}
                />
              </div>
              <span
                className={`text-xs ${
                  active ? 'text-on-frame font-semibold' : 'text-on-frame/70'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
