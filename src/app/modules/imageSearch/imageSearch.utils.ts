/**
 * Image Search Utility Functions
 * Category mapping, brand detection, etc.
 */

// ── Category mapping: MobileNet/Vision labels → your DB categories ──
export const LABEL_TO_CATEGORY_MAP: Record<string, string[]> = {
    'Electronics': [
        'phone', 'cellphone', 'cell phone', 'smartphone', 'mobile phone',
        'laptop', 'notebook', 'computer', 'desktop', 'monitor', 'screen',
        'tablet', 'ipad', 'keyboard', 'mouse', 'headphone', 'earphone',
        'speaker', 'camera', 'charger', 'cable', 'smartwatch', 'gadget',
        'electronic', 'television', 'tv', 'remote', 'printer', 'router',
        'microphone', 'projector', 'hard drive', 'usb', 'power bank',
    ],
    'Fashion': [
        'shirt', 't-shirt', 'tshirt', 'dress', 'clothing', 'jacket',
        'jeans', 'pants', 'sweater', 'hoodie', 'coat', 'top', 'blouse',
        'skirt', 'suit', 'shorts', 'trouser', 'jersey', 'polo',
        'garment', 'apparel', 'uniform', 'vest', 'cardigan', 'sweatshirt',
        'tank top', 'pajama', 'legging', 'denim',
    ],
    'Footwear': [
        'shoe', 'sneaker', 'boot', 'sandal', 'slipper', 'heel',
        'loafer', 'footwear', 'running shoe', 'oxford', 'moccasin',
        'flip flop', 'clog', 'trainer', 'basketball shoe',
    ],
    'Accessories': [
        'watch', 'bag', 'handbag', 'wallet', 'belt', 'sunglasses',
        'jewelry', 'necklace', 'ring', 'bracelet', 'cap', 'hat',
        'scarf', 'tie', 'backpack', 'purse', 'clutch', 'tote',
        'luggage', 'suitcase', 'glasses', 'eyeglasses',
    ],
    'Beauty': [
        'cosmetic', 'makeup', 'lipstick', 'perfume', 'cream', 'lotion',
        'skincare', 'soap', 'shampoo', 'mascara', 'foundation',
        'nail polish', 'serum', 'moisturizer', 'sunscreen',
    ],
    'Home': [
        'furniture', 'lamp', 'pillow', 'blanket', 'curtain', 'rug',
        'vase', 'decoration', 'kitchen', 'table', 'chair', 'sofa',
        'couch', 'bed', 'shelf', 'cabinet', 'drawer', 'mirror',
        'candle', 'clock', 'frame', 'plant pot',
    ],
    'Sports': [
        'ball', 'racket', 'gym', 'fitness', 'yoga', 'bicycle',
        'helmet', 'sports', 'dumbbell', 'treadmill', 'bat',
        'glove', 'skateboard', 'surfboard', 'tennis',
    ],
    'Books': [
        'book', 'notebook', 'diary', 'magazine', 'stationery',
        'pen', 'pencil', 'journal', 'planner', 'calendar',
    ],
};

/**
 * Detect category from labels
 */
export function detectCategoryFromLabels(labels: string[]): string | null {
    for (const [category, keywords] of Object.entries(LABEL_TO_CATEGORY_MAP)) {
        for (const label of labels) {
            const lowerLabel = label.toLowerCase();
            if (keywords.some(kw => lowerLabel.includes(kw) || kw.includes(lowerLabel))) {
                return category;
            }
        }
    }
    return null;
}

/**
 * Known brands for OCR/label matching
 */
const KNOWN_BRANDS = [
    'nike', 'adidas', 'samsung', 'apple', 'sony', 'puma', 'gucci',
    'zara', 'h&m', 'levi', 'asus', 'dell', 'hp', 'lenovo', 'xiaomi',
    'realme', 'oppo', 'vivo', 'huawei', 'oneplus', 'google', 'microsoft',
    'lg', 'philips', 'canon', 'nikon', 'reebok', 'new balance',
    'under armour', 'converse', 'vans', 'fila', 'skechers', 'timberland',
    'ray-ban', 'oakley', 'casio', 'fossil', 'tommy hilfiger', 'calvin klein',
    'ralph lauren', 'versace', 'prada', 'louis vuitton', 'chanel', 'dior',
    'burberry', 'armani', 'boss', 'lacoste',
];

/**
 * Extract brand from labels/text
 */
export function extractBrandFromLabels(labels: string[]): string | null {
    const combined = labels.join(' ').toLowerCase();
    return KNOWN_BRANDS.find(brand => combined.includes(brand)) || null;
}
