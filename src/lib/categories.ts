import { api } from './api';
import type { Category, Role } from '../types';

interface ApiCategory {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
  section: string;
  level: number;
  allowedListingKinds: string[];
  sortOrder: number;
}

function mapCategory(c: ApiCategory): Category {
  return {
    id: String(c.id),
    code: c.code,
    name: c.name,
    parentId: c.parentId != null ? String(c.parentId) : null,
    section: c.section,
    level: c.level as Category['level'],
    allowedListingKinds: c.allowedListingKinds as Category['allowedListingKinds'],
    sortOrder: c.sortOrder,
  };
}

let cache: Category[] | null = null;

/** Categories are static reference data for the session - fetched once and cached. */
export async function getCategories(): Promise<Category[]> {
  if (cache) return cache;
  try {
    const data = await api.get<ApiCategory[]>('/api/categories');
    cache = (data || []).map(mapCategory).sort((a, b) => a.sortOrder - b.sortOrder);
    return cache;
  } catch {
    return [];
  }
}

export function getSections(categories: Category[]): Category[] {
  return categories.filter((c) => c.level === 1);
}

export function getChildren(categories: Category[], parentId: string): Category[] {
  return categories.filter((c) => c.parentId === parentId);
}

export function findCategory(categories: Category[], id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function hasChildren(categories: Category[], id: string): boolean {
  return categories.some((c) => c.parentId === id);
}

/** Which top-level sections a role's "post a listing" form should default to / offer. */
const ROLE_SECTIONS: Partial<Record<Role, string[]>> = {
  farmer: ['produce', 'value_added', 'livestock'],
  'agro-dealer': ['inputs', 'equipment'],
  'service-provider': ['services'],
};

export function getSectionsForRole(categories: Category[], role: Role): Category[] {
  const allowed = ROLE_SECTIONS[role];
  const sections = getSections(categories);
  if (!allowed) return sections; // admin, buyer -> everything
  return sections.filter((s) => allowed.includes(s.code));
}

/** Section codes a role's "post a listing" form should restrict to - undefined means no restriction (admin). */
export function getAllowedSectionCodesForRole(role: Role): string[] | undefined {
  return ROLE_SECTIONS[role];
}
