import { Link } from 'react-router-dom';

interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="breadcrumb">
      <ol className="breadcrumb">
        {items.map((item, i) =>
          item.href ? (
            <li key={i} className="breadcrumb-item"><Link to={item.href}>{item.label}</Link></li>
          ) : (
            <li key={i} className="breadcrumb-item active">{item.label}</li>
          )
        )}
      </ol>
    </nav>
  );
}