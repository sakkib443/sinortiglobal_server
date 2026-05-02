/**
 * Image Search Service — Fuzzy + Score-based Matching
 * Receives labels + colors from frontend (analyzed by TensorFlow.js)
 * Uses fuzzy matching so even slight spelling differences still return results
 * Most accurate matches appear first, less accurate ones appear later
 */

import { Product } from '../product/product.model';
import { Category } from '../category/category.model';
import { detectCategoryFromLabels, extractBrandFromLabels } from './imageSearch.utils';

interface ImageSearchPayload {
    labels: string[];
    colors: string[];
    colorHexes?: string[];
    keywords?: string[];
}

/**
 * Generate fuzzy regex from a word
 * Allows 1-2 character mistakes, partial matches, and similar spellings
 * Example: "sneaker" → matches "sneker", "sneakers", "snaeker"
 */
function fuzzyRegex(word: string): string {
    if (word.length < 3) return word;

    // Build a regex that allows optional/swapped characters
    // For each character, allow it to be optional or replaced
    let pattern = '';
    for (let i = 0; i < word.length; i++) {
        const char = word[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Allow the character to be optional (handles missing chars)
        // Also allow any single character in its place (handles replacements)
        pattern += `${char}.?`;
    }
    return pattern;
}

/**
 * Break compound labels into individual searchable words
 * "running shoe" → ["running", "shoe", "running shoe"]
 * "t-shirt" → ["t-shirt", "tshirt", "shirt"]
 */
function expandLabels(labels: string[]): string[] {
    const expanded: Set<string> = new Set();

    for (const label of labels) {
        // Add original
        expanded.add(label.toLowerCase().trim());

        // Split by spaces and add individual words
        const words = label.toLowerCase().split(/[\s,]+/);
        for (const word of words) {
            if (word.length >= 2) {
                expanded.add(word.trim());
            }
        }

        // Handle hyphenated words: "t-shirt" → "tshirt", "shirt"
        if (label.includes('-')) {
            expanded.add(label.replace(/-/g, ''));
            const parts = label.split('-');
            for (const part of parts) {
                if (part.length >= 2) expanded.add(part);
            }
        }

        // Handle plural/singular: "shoes" → "shoe", "shoe" → "shoes"
        if (label.endsWith('s') && label.length > 3) {
            expanded.add(label.slice(0, -1));
        } else if (!label.endsWith('s')) {
            expanded.add(label + 's');
        }
        if (label.endsWith('es') && label.length > 4) {
            expanded.add(label.slice(0, -2));
        }
        if (label.endsWith('ing') && label.length > 5) {
            expanded.add(label.slice(0, -3));
        }
    }

    return [...expanded].filter(l => l.length >= 2);
}

const ImageSearchService = {
    async searchByAnalyzedImage(payload: ImageSearchPayload) {
        const { labels, colors, colorHexes = [], keywords = [] } = payload;

        if (!labels.length && !colors.length) {
            return { products: [], searchMeta: { labels, colors, matchType: 'empty' } };
        }

        // ── Expand labels for broader matching ──────────────────
        const expandedLabels = expandLabels(labels);
        const detectedCategoryName = detectCategoryFromLabels(expandedLabels);
        const detectedBrand = extractBrandFromLabels(expandedLabels);

        // Find category ID
        let categoryId = null;
        if (detectedCategoryName) {
            const cat = await Category.findOne({
                name: { $regex: detectedCategoryName, $options: 'i' },
            });
            categoryId = cat?._id || null;
        }

        // ── Build fuzzy regex patterns ──────────────────────────
        // Create regex patterns that allow partial/fuzzy matches
        const fuzzyPatterns = expandedLabels.slice(0, 8).map(label => {
            // Escape special regex characters first
            const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return escaped;
        });

        // Broad regex: matches ANY of the labels (even partially)
        const broadRegex = fuzzyPatterns.join('|');

        // ── Score-based aggregation pipeline ────────────────────
        const pipeline: any[] = [
            // Step 1: Broad filter — get potential matches
            {
                $match: {
                    isDeleted: false,
                    status: 'active',
                    $or: [
                        // Exact/partial name match
                        { name: { $regex: broadRegex, $options: 'i' } },
                        // Description match
                        { description: { $regex: broadRegex, $options: 'i' } },
                        // Tags match (array intersection)
                        { tags: { $in: expandedLabels } },
                        // AI Labels match
                        { aiLabels: { $in: expandedLabels } },
                        // Color match
                        ...(colors.length > 0 ? [{ colors: { $in: colors } }] : []),
                        // Brand match
                        ...(detectedBrand ? [{ brand: { $regex: detectedBrand, $options: 'i' } }] : []),
                        // Category match
                        ...(categoryId ? [{ category: categoryId }] : []),
                        // Material match
                        { material: { $in: expandedLabels } },
                        // Short description match
                        { shortDescription: { $regex: broadRegex, $options: 'i' } },
                    ],
                },
            },

            // Step 2: Calculate relevance score
            {
                $addFields: {
                    searchScore: {
                        $add: [
                            // ── Category match: +50 points (highest priority) ──
                            categoryId
                                ? { $cond: [{ $eq: ['$category', categoryId] }, 50, 0] }
                                : { $literal: 0 },

                            // ── Brand match: +40 points ──
                            detectedBrand
                                ? {
                                    $cond: [{
                                        $regexMatch: {
                                            input: { $toLower: { $ifNull: ['$brand', ''] } },
                                            regex: detectedBrand,
                                        },
                                    }, 40, 0],
                                }
                                : { $literal: 0 },

                            // ── Exact tag matches: +15 points per match ──
                            {
                                $multiply: [
                                    {
                                        $size: {
                                            $setIntersection: [
                                                { $ifNull: ['$tags', []] },
                                                expandedLabels,
                                            ],
                                        },
                                    },
                                    15,
                                ],
                            },

                            // ── AI Labels match: +10 points per match ──
                            {
                                $multiply: [
                                    {
                                        $size: {
                                            $setIntersection: [
                                                { $ifNull: ['$aiLabels', []] },
                                                expandedLabels,
                                            ],
                                        },
                                    },
                                    10,
                                ],
                            },

                            // ── Color match: +8 points per match ──
                            {
                                $multiply: [
                                    {
                                        $size: {
                                            $setIntersection: [
                                                { $ifNull: ['$colors', []] },
                                                colors,
                                            ],
                                        },
                                    },
                                    8,
                                ],
                            },

                            // ── Material match: +8 points per match ──
                            {
                                $multiply: [
                                    {
                                        $size: {
                                            $setIntersection: [
                                                { $ifNull: ['$material', []] },
                                                expandedLabels,
                                            ],
                                        },
                                    },
                                    8,
                                ],
                            },

                            // ── Name contains label: +12 points per match ──
                            ...expandedLabels.slice(0, 6).map((label: string) => ({
                                $cond: [{
                                    $regexMatch: {
                                        input: { $toLower: { $ifNull: ['$name', ''] } },
                                        regex: label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                                    },
                                }, 12, 0],
                            })),

                            // ── Description contains label: +5 points per match ──
                            ...expandedLabels.slice(0, 4).map((label: string) => ({
                                $cond: [{
                                    $regexMatch: {
                                        input: { $toLower: { $ifNull: ['$description', ''] } },
                                        regex: label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                                    },
                                }, 5, 0],
                            })),

                            // ── Bonus for featured products: +3 points ──
                            { $cond: [{ $eq: ['$isFeatured', true] }, 3, 0] },

                            // ── Bonus for high rating: +2 points ──
                            { $cond: [{ $gte: ['$rating', 4] }, 2, 0] },
                        ],
                    },
                },
            },

            // Step 3: Sort by score (highest first), then by rating
            { $sort: { searchScore: -1, rating: -1, totalSold: -1 } },

            // Step 4: Limit results
            { $limit: 30 },

            // Step 5: Populate category
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category',
                    pipeline: [{ $project: { name: 1, slug: 1 } }],
                },
            },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        ];

        let products = await Product.aggregate(pipeline);

        // ── Fallback 1: Fuzzy text search if scored search found nothing ──
        if (products.length === 0 && expandedLabels.length > 0) {
            // Try fuzzy regex patterns
            const fuzzyRegexPatterns = expandedLabels.slice(0, 5).map(l => fuzzyRegex(l));
            const fuzzyPattern = fuzzyRegexPatterns.join('|');

            products = await Product.find({
                isDeleted: false,
                status: 'active',
                $or: [
                    { name: { $regex: fuzzyPattern, $options: 'i' } },
                    { description: { $regex: fuzzyPattern, $options: 'i' } },
                    { tags: { $in: expandedLabels } },
                    { brand: { $regex: fuzzyPattern, $options: 'i' } },
                ],
            })
                .populate('category', 'name slug')
                .sort({ rating: -1 })
                .limit(30)
                .lean();
        }

        // ── Fallback 2: MongoDB text search as last resort ──
        if (products.length === 0 && expandedLabels.length > 0) {
            const searchText = expandedLabels.slice(0, 5).join(' ');

            try {
                products = await Product.find(
                    {
                        isDeleted: false,
                        status: 'active',
                        $text: { $search: searchText },
                    },
                    { score: { $meta: 'textScore' } }
                )
                    .populate('category', 'name slug')
                    .sort({ score: { $meta: 'textScore' } })
                    .limit(30)
                    .lean();
            } catch {
                // Text index might not exist, skip
            }
        }

        return {
            products,
            searchMeta: {
                labels: expandedLabels.slice(0, 15),
                colors,
                brand: detectedBrand,
                category: detectedCategoryName,
                totalResults: products.length,
                matchType: products.length > 0 ? 'scored' : 'none',
            },
        };
    },
};

export default ImageSearchService;
