'use client';

import React from 'react';
import {
  LayoutGrid,
  Coffee,
  Flame,
  Milk,
  Leaf,
  Croissant,
  UtensilsCrossed,
  Cookie,
  Wine,
  GlassWater,
  CupSoda,
  Cake,
  Sandwich,
  IceCream,
  Egg,
  Tag,
  Sparkles,
  Filter,
  Layers,
  ShoppingBag,
} from 'lucide-react';

export const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  LayoutGrid,
  Coffee,
  Flame,
  Milk,
  Leaf,
  Croissant,
  UtensilsCrossed,
  Cookie,
  Wine,
  GlassWater,
  CupSoda,
  Cake,
  Sandwich,
  IceCream,
  Egg,
  Tag,
  Sparkles,
  Filter,
  Layers,
  ShoppingBag,
};

// Professional SVG Vector Icons Catalog for Cafe Categories
export const AVAILABLE_CATEGORY_ICONS = [
  { id: 'Coffee', label: 'Kopi / Espresso', icon: Coffee },
  { id: 'Flame', label: 'Manual Brew', icon: Flame },
  { id: 'Leaf', label: 'Artisanal Tea', icon: Leaf },
  { id: 'Milk', label: 'Non-Coffee / Susu', icon: Milk },
  { id: 'CupSoda', label: 'Soda / Mocktail', icon: CupSoda },
  { id: 'Croissant', label: 'Pastry & Bakery', icon: Croissant },
  { id: 'UtensilsCrossed', label: 'Main Course', icon: UtensilsCrossed },
  { id: 'Cookie', label: 'Light Bites / Snack', icon: Cookie },
  { id: 'Sandwich', label: 'Sandwich / Toast', icon: Sandwich },
  { id: 'Cake', label: 'Dessert / Cake', icon: Cake },
  { id: 'Wine', label: 'Bottled Beverages', icon: Wine },
  { id: 'GlassWater', label: 'Fresh Water / Jus', icon: GlassWater },
  { id: 'IceCream', label: 'Es Krim / Gelato', icon: IceCream },
  { id: 'Sparkles', label: 'Signature / Promo', icon: Sparkles },
  { id: 'Tag', label: 'Menu Diskon', icon: Tag },
  { id: 'Layers', label: 'Kategori Umum', icon: Layers },
];

export function getCategoryIconComponent(
  iconName?: string | null,
  categoryName?: string
): React.ElementType {
  if (iconName && CATEGORY_ICON_MAP[iconName]) {
    return CATEGORY_ICON_MAP[iconName];
  }

  // Fallback by category name heuristics
  const name = (categoryName || '').toLowerCase();
  if (name.includes('semua') || name === 'all') return LayoutGrid;
  if (name.includes('espresso') || name.includes('kopi') || name.includes('coffee')) return Coffee;
  if (name.includes('manual') || name.includes('brew') || name.includes('v60') || name.includes('filter')) return Flame;
  if (name.includes('tea') || name.includes('teh')) return Leaf;
  if (name.includes('non-coffee') || name.includes('milk') || name.includes('susu') || name.includes('chocolate') || name.includes('cokelat')) return Milk;
  if (name.includes('pastry') || name.includes('bakery') || name.includes('croissant') || name.includes('roti')) return Croissant;
  if (name.includes('main') || name.includes('makan') || name.includes('nasi') || name.includes('mie') || name.includes('course')) return UtensilsCrossed;
  if (name.includes('snack') || name.includes('bites') || name.includes('camilan') || name.includes('cookie') || name.includes('kentang') || name.includes('fries')) return Cookie;
  if (name.includes('bottle') || name.includes('botol') || name.includes('liter')) return Wine;
  if (name.includes('dessert') || name.includes('ice') || name.includes('gelato')) return IceCream;
  if (name.includes('cake') || name.includes('kue')) return Cake;
  if (name.includes('sandwich') || name.includes('toast') || name.includes('burger')) return Sandwich;
  if (name.includes('soda') || name.includes('mocktail') || name.includes('syrup')) return CupSoda;

  return Coffee;
}

export function CategoryIcon({
  iconName,
  categoryName,
  className = 'w-4 h-4',
}: {
  iconName?: string | null;
  categoryName?: string;
  className?: string;
}) {
  const Icon = getCategoryIconComponent(iconName, categoryName);
  return <Icon className={className} />;
}
