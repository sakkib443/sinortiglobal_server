import { SiteContent } from './siteContent.model';

const SiteContentService = {
    // Get site content (creates default if not exists)
    async get() {
        let content = await SiteContent.findOne({ _key: 'main' });
        if (!content) {
            content = await SiteContent.create({
                _key: 'main',
                ticker: [
                    { text: 'Supply', emoji: '', active: true, order: 0 },
                    { text: 'Solution', emoji: '', active: true, order: 1 },
                    { text: 'Satisfaction', emoji: '', active: true, order: 2 },
                    { text: '🎉 Special Offer: Get 50% OFF on all Electronics! Limited Time Only!', emoji: '🎉', active: true, order: 3 },
                    { text: '🚚 Free Shipping on orders over Tk.5000', emoji: '🚚', active: true, order: 4 },
                    { text: '💳 Extra 10% Cashback with bKash Payment', emoji: '💳', active: true, order: 5 },
                ],
                contact: {
                    phone: '01753923093',
                    whatsapp: '01322840808',
                    email: 'support@dominion.com',
                    address: 'Dhaka, Bangladesh',
                    hours: [
                        { day: 'Sunday – Thursday', time: '9:00 AM – 6:00 PM' },
                        { day: 'Friday', time: '2:00 PM – 6:00 PM' },
                        { day: 'Saturday', time: 'Closed' },
                    ],
                    tips: [
                        'Have your order ID ready for faster support',
                        'WhatsApp is the fastest way to reach us',
                        'Attach screenshots for product issues',
                    ],
                    socials: [
                        { label: 'Facebook', url: '#', color: '#1877F2' },
                        { label: 'Instagram', url: '#', color: '#E1306C' },
                        { label: 'YouTube', url: '#', color: '#FF0000' },
                    ],
                    subjects: ['Order Issue', 'Product Inquiry', 'Return / Refund', 'Delivery Problem', 'Payment Issue', 'Other'],
                },
                floating: {
                    phone: '+880 1753923093',
                    whatsapp: '8801322840808',
                    messenger: 'YOUR_PAGE_USERNAME',
                    showPhone: true,
                    showWhatsapp: true,
                    showMessenger: true,
                },
                footer: {
                    companyName: 'Dominion',
                    copyright: '',
                    links: [],
                },
                defaultTagline: 'Lower price than others but quality higher',
                seo: {
                    title: 'Dominion - Premium Online Shopping Experience',
                    description: 'Shop the latest products with amazing deals at Dominion. Premium quality products at best prices.',
                    keywords: 'dominion, ecommerce, online shopping, best deals, products, shop',
                },
                announcement: {
                    message: '',
                    bgColor: '#E4525C',
                    textColor: '#FFFFFF',
                    active: false,
                    dismissible: true,
                },
            });
        }
        return content;
    },

    // Update site content (partial update)
    async update(data: any) {
        const content = await SiteContent.findOneAndUpdate(
            { _key: 'main' },
            { $set: data },
            { new: true, upsert: true, runValidators: true }
        );
        return content;
    },

    // Update a specific section
    async updateSection(section: string, data: any) {
        const updateObj: any = {};
        updateObj[section] = data;
        const content = await SiteContent.findOneAndUpdate(
            { _key: 'main' },
            { $set: updateObj },
            { new: true, upsert: true, runValidators: true }
        );
        return content;
    },
};

export default SiteContentService;
