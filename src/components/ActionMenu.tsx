import { useEffect, useRef, useState } from 'react';

export interface ActionMenuItem {
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
}

export function ActionMenu({ items }: { items: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="action-menu" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button className="action-menu-trigger" onClick={() => setOpen((o) => !o)}>
        <i className="fa-solid fa-ellipsis-vertical"></i>
      </button>
      {open && (
        <div className="action-menu-dropdown">
          {items.map((item) => (
            <button
              key={item.label}
              className={`action-menu-item ${item.danger ? 'danger' : ''}`}
              onClick={() => { setOpen(false); item.onClick(); }}
            >
              <i className={`fa-solid ${item.icon}`}></i> {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
