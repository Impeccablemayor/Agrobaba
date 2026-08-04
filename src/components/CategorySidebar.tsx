import { useState } from 'react';
import { getSections, getChildren } from '../lib/categories';
import type { Category } from '../types';

const SECTION_ICONS: Record<string, string> = {
  produce: 'fa-wheat-awn',
  value_added: 'fa-jar',
  livestock: 'fa-cow',
  inputs: 'fa-flask',
  equipment: 'fa-tractor',
  services: 'fa-hand-holding-medical',
  land: 'fa-map',
  waste: 'fa-recycle',
  uncategorized: 'fa-box',
};

interface Props {
  categories: Category[];
  sectionId: string;
  categoryId: string;
  onSelectSection: (sectionId: string) => void;
  onSelectCategory: (sectionId: string, categoryId: string) => void;
}

export function CategorySidebar({ categories, sectionId, categoryId, onSelectSection, onSelectCategory }: Props) {
  const sections = getSections(categories);
  const [expanded, setExpanded] = useState<string | null>(sectionId !== 'all' ? sectionId : null);

  function toggleSection(id: string) {
    onSelectSection(id);
    setExpanded((current) => (current === id ? null : id));
  }

  return (
    <nav className="category-sidebar" aria-label="Shop categories">
      <div className="category-sidebar-title">Categories</div>

      <button
        className={`category-sidebar-item ${sectionId === 'all' ? 'active' : ''}`}
        onClick={() => { onSelectSection('all'); setExpanded(null); }}
      >
        <i className="fa-solid fa-border-all"></i>
        <span>All Listings</span>
      </button>

      {sections.map((section) => {
        const children = getChildren(categories, section.id);
        const isExpanded = expanded === section.id;
        const isActiveSection = sectionId === section.id;
        return (
          <div key={section.id} className="category-sidebar-group">
            <button
              className={`category-sidebar-item ${isActiveSection ? 'active' : ''}`}
              onClick={() => toggleSection(section.id)}
              aria-expanded={isExpanded}
            >
              <i className={`fa-solid ${SECTION_ICONS[section.section] || 'fa-box'}`}></i>
              <span>{section.name}</span>
              {children.length > 0 && (
                <i className={`fa-solid fa-chevron-down category-sidebar-chevron ${isExpanded ? 'open' : ''}`}></i>
              )}
            </button>

            {children.length > 0 && (
              <div className={`category-sidebar-subitems ${isExpanded ? 'open' : ''}`}>
                <div className="category-sidebar-subitems-inner">
                  {children.map((child) => (
                    <button
                      key={child.id}
                      className={`category-sidebar-subitem ${categoryId === child.id ? 'active' : ''}`}
                      onClick={() => onSelectCategory(section.id, child.id)}
                    >
                      {child.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
