import { Product } from '../product/product.model';

const SearchService = {
    /**
     * Image Search — matches uploaded image analysis against product fields
     * Uses: tags, colors, colorHex, aiLabels, name (text search)
     * Scoring: products with more matches rank higher
     */
    async searchByImage(payload: {
        labels: string[];
        colors: string[];
        colorHexes: string[];
        keywords: string[];
    }) {
        const { labels, colors, colorHexes, keywords } = payload;

        // Normalize all inputs to lowercase
        const normalizedLabels = labels.map(l => l.toLowerCase().trim());
        const normalizedColors = colors.map(c => c.toLowerCase().trim());
        const normalizedHexes = colorHexes.map(h => h.toLowerCase().trim());
        const allKeywords = keywords.map(k => k.toLowerCase().trim());

        // ── Build OR conditions for matching ──────────────────────
        const orConditions: any[] = [];

        // Match against tags
        if (normalizedLabels.length > 0) {
            orConditions.push({ tags: { $in: normalizedLabels } });
        }

        // Match against aiLabels
        if (normalizedLabels.length > 0) {
            orConditions.push({ aiLabels: { $in: normalizedLabels } });
        }

        // Match against colors
        if (normalizedColors.length > 0) {
            orConditions.push({ colors: { $in: normalizedColors } });
        }

        // Match against colorHex
        if (normalizedHexes.length > 0) {
            orConditions.push({ colorHex: { $in: normalizedHexes } });
        }

        // Match against name/description via regex
        if (allKeywords.length > 0) {
            const keywordRegex = allKeywords
                .filter(k => k.length > 2) // Skip very short words
                .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // Escape regex chars

            if (keywordRegex.length > 0) {
                orConditions.push({
                    name: { $regex: keywordRegex.join('|'), $options: 'i' },
                });
                orConditions.push({
                    description: { $regex: keywordRegex.join('|'), $options: 'i' },
                });
                orConditions.push({
                    brand: { $regex: keywordRegex.join('|'), $options: 'i' },
                });
            }
        }

        if (orConditions.length === 0) {
            return { products: [], searchMeta: { labels: [], colors: [], brand: null, category: null, totalResults: 0, matchType: 'none' } };
        }

        // ── Query: find products matching ANY condition ───────────
        const products = await Product.find({
            isDeleted: false,
            status: 'active',
            $or: orConditions,
        })
            .populate('category', 'name slug')
            .limit(50)
            .lean();

        // ── Score each product based on how many criteria it matches ──
        const scoredProducts = products.map((product: any) => {
            let score = 0;
            let maxScore = 0;

            // Tag matching (weight: 30)
            if (normalizedLabels.length > 0) {
                maxScore += 30;
                const productTags = (product.tags || []).map((t: string) => t.toLowerCase());
                const tagMatches = normalizedLabels.filter(l =>
                    productTags.some((t: string) => t.includes(l) || l.includes(t))
                ).length;
                score += Math.round((tagMatches / normalizedLabels.length) * 30);
            }

            // aiLabels matching (weight: 25)
            if (normalizedLabels.length > 0) {
                maxScore += 25;
                const productAiLabels = (product.aiLabels || []).map((l: string) => l.toLowerCase());
                const aiMatches = normalizedLabels.filter(l =>
                    productAiLabels.some((al: string) => al.includes(l) || l.includes(al))
                ).length;
                score += Math.round((aiMatches / normalizedLabels.length) * 25);
            }

            // Color name matching (weight: 25)
            if (normalizedColors.length > 0) {
                maxScore += 25;
                const productColors = (product.colors || []).map((c: string) => c.toLowerCase());
                const colorMatches = normalizedColors.filter(c =>
                    productColors.some((pc: string) => pc.includes(c) || c.includes(pc))
                ).length;
                score += Math.round((colorMatches / normalizedColors.length) * 25);
            }

            // Color hex matching (weight: 10)
            if (normalizedHexes.length > 0) {
                maxScore += 10;
                const productHexes = (product.colorHex || []).map((h: string) => h.toLowerCase());
                const hexMatches = normalizedHexes.filter(h => productHexes.includes(h)).length;
                score += Math.round((hexMatches / normalizedHexes.length) * 10);
            }

            // Name matching (weight: 10)
            if (allKeywords.length > 0) {
                maxScore += 10;
                const name = (product.name || '').toLowerCase();
                const nameMatches = allKeywords.filter(k => name.includes(k)).length;
                score += Math.round((nameMatches / allKeywords.length) * 10);
            }

            // Calculate percentage
            const searchScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

            return { ...product, searchScore };
        });

        // Sort by score descending
        scoredProducts.sort((a: any, b: any) => b.searchScore - a.searchScore);

        // Detect best match category & brand
        const topProduct = scoredProducts[0];
        const detectedCategory = topProduct?.category?.name || null;
        const detectedBrand = topProduct?.brand || null;

        return {
            products: scoredProducts,
            searchMeta: {
                labels: normalizedLabels,
                colors: normalizedColors,
                brand: detectedBrand,
                category: detectedCategory,
                totalResults: scoredProducts.length,
                matchType: scoredProducts.length > 0 ? 'ai-visual' : 'none',
            },
        };
    },
};

export default SearchService;
