// Business types offered at signup, each with a starter set of product categories.
// The owner picks a type (searchable) and then toggles which of these categories to create.
// Categories are plain strings; the backend persists the chosen ones as managed Category rows.

export interface BusinessType {
  id: string;
  label: string;
  icon: string; // emoji — keeps the picker dependency-free
  categories: string[];
}

export const BUSINESS_TYPES: BusinessType[] = [
  {
    id: 'grocery',
    label: 'Grocery / Kirana',
    icon: '🛒',
    categories: [
      'Grocery Staples', 'Rice & Flour', 'Pulses & Dals', 'Spices & Masala', 'Oil & Ghee',
      'Snacks & Namkeen', 'Biscuits & Bakery', 'Beverages', 'Dairy & Eggs', 'Tea & Coffee',
      'Cleaning & Household', 'Personal Care', 'Packaged Food',
    ],
  },
  {
    id: 'electronics',
    label: 'Electronics & Appliances',
    icon: '🔌',
    categories: [
      'Mobiles & Tablets', 'Laptops & Computers', 'TV & Audio', 'Home Appliances',
      'Kitchen Appliances', 'Cables & Chargers', 'Accessories', 'Cameras', 'Smart Devices',
      'Batteries & Power', 'Lighting',
    ],
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy / Medical',
    icon: '💊',
    categories: [
      'Prescription (Rx)', 'OTC Medicines', 'Wellness & Supplements', 'Baby Care',
      'Personal Care', 'Surgical & First Aid', 'Ayurvedic', 'Devices & Equipment',
    ],
  },
  {
    id: 'apparel',
    label: 'Apparel & Fashion',
    icon: '👕',
    categories: [
      "Men's Wear", "Women's Wear", 'Kids Wear', 'Footwear', 'Ethnic Wear',
      'Winter Wear', 'Innerwear', 'Bags & Accessories', 'Jewellery',
    ],
  },
  {
    id: 'restaurant',
    label: 'Restaurant / Food',
    icon: '🍽️',
    categories: [
      'Starters', 'Main Course', 'Breads', 'Rice & Biryani', 'Chinese', 'South Indian',
      'Beverages', 'Desserts', 'Combos', 'Add-ons',
    ],
  },
  {
    id: 'hardware',
    label: 'Hardware & Paints',
    icon: '🔧',
    categories: [
      'Tools', 'Fasteners', 'Plumbing', 'Electrical', 'Paints', 'Adhesives',
      'Sanitary', 'Safety', 'Building Material',
    ],
  },
  {
    id: 'stationery',
    label: 'Stationery & Books',
    icon: '📚',
    categories: [
      'Notebooks', 'Pens & Pencils', 'Office Supplies', 'Art & Craft', 'Books',
      'School Supplies', 'Printing & Paper', 'Gifts',
    ],
  },
  {
    id: 'cosmetics',
    label: 'Cosmetics & Beauty',
    icon: '💄',
    categories: [
      'Skincare', 'Haircare', 'Makeup', 'Fragrances', 'Bath & Body',
      "Men's Grooming", 'Tools & Brushes', 'Beauty Accessories',
    ],
  },
  {
    id: 'hotel',
    label: 'Bakery / Sweets',
    icon: '🧁',
    categories: [
      'Cakes & Pastries', 'Sweets & Mithai', 'Cookies', 'Breads', 'Namkeen',
      'Chocolates', 'Dry Fruits', 'Beverages',
    ],
  },
  {
    id: 'general',
    label: 'General Store / Other',
    icon: '🏪',
    categories: [
      'General', 'Household', 'Personal Care', 'Food & Beverages', 'Stationery', 'Miscellaneous',
    ],
  },
];

export function getBusinessType(id?: string | null): BusinessType | undefined {
  if (!id) return undefined;
  return BUSINESS_TYPES.find((b) => b.id === id);
}
