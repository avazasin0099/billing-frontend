// Business types offered at signup, each with a starter set of product categories.
// The owner picks a type (searchable) and then toggles which of these categories to create.
// Categories are plain strings; the backend persists the chosen ones as managed Category rows.

import {
  BookOpen,
  CakeSlice,
  Pill,
  Plug,
  Shirt,
  ShoppingCart,
  Sparkles,
  Store,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export interface BusinessType {
  id: string;
  label: string;
  icon: LucideIcon; // standard lucide line icon (no emoji)
  categories: string[];
}

export const BUSINESS_TYPES: BusinessType[] = [
  {
    id: 'grocery',
    label: 'Grocery / Kirana',
    icon: ShoppingCart,
    categories: [
      'Grocery Staples', 'Rice & Flour', 'Pulses & Dals', 'Spices & Masala', 'Oil & Ghee',
      'Snacks & Namkeen', 'Biscuits & Bakery', 'Beverages', 'Dairy & Eggs', 'Tea & Coffee',
      'Cleaning & Household', 'Personal Care', 'Packaged Food',
    ],
  },
  {
    id: 'electronics',
    label: 'Electronics & Appliances',
    icon: Plug,
    categories: [
      'Mobiles & Tablets', 'Laptops & Computers', 'TV & Audio', 'Home Appliances',
      'Kitchen Appliances', 'Cables & Chargers', 'Accessories', 'Cameras', 'Smart Devices',
      'Batteries & Power', 'Lighting',
    ],
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy / Medical',
    icon: Pill,
    categories: [
      'Prescription (Rx)', 'OTC Medicines', 'Wellness & Supplements', 'Baby Care',
      'Personal Care', 'Surgical & First Aid', 'Ayurvedic', 'Devices & Equipment',
    ],
  },
  {
    id: 'apparel',
    label: 'Apparel & Fashion',
    icon: Shirt,
    categories: [
      "Men's Wear", "Women's Wear", 'Kids Wear', 'Footwear', 'Ethnic Wear',
      'Winter Wear', 'Innerwear', 'Bags & Accessories', 'Jewellery',
    ],
  },
  {
    id: 'restaurant',
    label: 'Restaurant / Food',
    icon: UtensilsCrossed,
    categories: [
      'Starters', 'Main Course', 'Breads', 'Rice & Biryani', 'Chinese', 'South Indian',
      'Beverages', 'Desserts', 'Combos', 'Add-ons',
    ],
  },
  {
    id: 'hardware',
    label: 'Hardware & Paints',
    icon: Wrench,
    categories: [
      'Tools', 'Fasteners', 'Plumbing', 'Electrical', 'Paints', 'Adhesives',
      'Sanitary', 'Safety', 'Building Material',
    ],
  },
  {
    id: 'stationery',
    label: 'Stationery & Books',
    icon: BookOpen,
    categories: [
      'Notebooks', 'Pens & Pencils', 'Office Supplies', 'Art & Craft', 'Books',
      'School Supplies', 'Printing & Paper', 'Gifts',
    ],
  },
  {
    id: 'cosmetics',
    label: 'Cosmetics & Beauty',
    icon: Sparkles,
    categories: [
      'Skincare', 'Haircare', 'Makeup', 'Fragrances', 'Bath & Body',
      "Men's Grooming", 'Tools & Brushes', 'Beauty Accessories',
    ],
  },
  {
    id: 'hotel',
    label: 'Bakery / Sweets',
    icon: CakeSlice,
    categories: [
      'Cakes & Pastries', 'Sweets & Mithai', 'Cookies', 'Breads', 'Namkeen',
      'Chocolates', 'Dry Fruits', 'Beverages',
    ],
  },
  {
    id: 'general',
    label: 'General Store / Other',
    icon: Store,
    categories: [
      'General', 'Household', 'Personal Care', 'Food & Beverages', 'Stationery', 'Miscellaneous',
    ],
  },
];

export function getBusinessType(id?: string | null): BusinessType | undefined {
  if (!id) return undefined;
  return BUSINESS_TYPES.find((b) => b.id === id);
}
