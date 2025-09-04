// backend/constants/educationalContent.js
// 📚 HARDCODED EDUCATIONAL CONTENT - Stable & Rich Content

const SKIN_TYPES_EDUCATION = {
    overview: "Memahami jenis kulit Anda adalah dasar dari perawatan kulit yang efektif. Setiap jenis kulit memiliki karakteristik unik dan membutuhkan pendekatan perawatan yang berbeda.",
    
    types: {
        normal: {
            characteristics: [
                "Produksi minyak dan kelembapan yang seimbang",
                "Sedikit cacat atau noda",
                "Pori-pori hampir tidak terlihat",
                "Wajah bercahaya dan halus"
            ],
            identification: {
                morning_feel: "Nyaman dan seimbang",
                afternoon_feel: "Masih seimbang, sedikit kilau",
                pore_size: "Kecil hingga sedang",
                sensitivity: "Low sensitivity"
            },
            recommended_routine: [
                { step: "Cleanser", product: "Gentle cream or gel cleanser", frequency: "Pagi/Malam" },
                { step: "Toner", product: "Hydrating toner", frequency: "Pagi/Malam" },
                { step: "Serum", product: "Vitamin C (Pagi) or Retinol (Malam)", frequency: "Setiap Hari" },
                { step: "Moisturizer", product: "Lightweight, balanced moisturizer", frequency: "Pagi/Malam" },
                { step: "Sunscreen", product: "SPF 30+ broad spectrum", frequency: "Pagi" }
            ],
            key_ingredients: ["Niacinamide", "Hyaluronic Acid", "Vitamin C", "Ceramides"],
            avoid_ingredients: ["Harsh alcohols", "Strong fragrances"],
            tips: [
                "Jangan terlalu rumit dalam rutinitas Anda",
                "Fokus pada pencegahan daripada pengobatan",
                "Perkenalkan produk baru secara bertahap"
            ]
        },
        
        dry: {
            characteristics: [
                "Kencang, tidak nyaman",
                "Bercak kering atau kasar",
                "Garis halus lebih terlihat",
                "Penampilan kusam"
            ],
            identification: {
                morning_feel: "Kencang dan tidak nyaman",
                afternoon_feel: "Masih kencang, kemungkinan mengelupas",
                pore_size: "Kecil, hampir tidak terlihat",
                sensitivity: "Sensitivitas tinggi terhadap cuaca"
            },
            recommended_routine: [
                { step: "Cleanser", product: "Cream or oil-based cleanser", frequency: "Pagi/Malam" },
                { step: "Toner", product: "Hydrating essence or toner", frequency: "Pagi/Malam" },
                { step: "Serum", product: "Hyaluronic Acid or Ceramides", frequency: "Pagi/Malam" },
                { step: "Moisturizer", product: "Rich, occlusive moisturizer", frequency: "Pagi/Malam" },
                { step: "Face Oil", product: "Nourishing face oil", frequency: "Malam" },
                { step: "Sunscreen", product: "Moisturizing SPF 30+", frequency: "Pagi" }
            ],
            key_ingredients: ["Hyaluronic Acid", "Ceramides", "Squalane", "Glycerin", "Peptides"],
            avoid_ingredients: ["Alcohol", "Strong acids", "Fragrances", "Sulfates"],
            tips: [
                "Lapisi produk hidrasi",
                "Gunakan humidifier di malam hari",
                "Hindari air panas saat membersihkan"
            ]
        },
        
        oily: {
            characteristics: [
                "Berkilau, penampilan berminyak",
                "Pori-pori besar dan terlihat",
                "Rentan terhadap komedo dan jerawat",
                "Makeup cenderung luntur"
            ],
            identification: {
                morning_feel: "Berminyak, terutama di zona T",
                afternoon_feel: "Sangat berminyak dan berkilau",
                pore_size: "Besar dan terlihat",
                sensitivity: "Mungkin sensitif terhadap pengeringan berlebih"
            },
            recommended_routine: [
                { step: "Cleanser", product: "Gel or foaming cleanser", frequency: "Pagi/Sore" },
                { step: "Toner", product: "BHA or niacinamide toner", frequency: "Pagi/Sore" },
                { step: "Serum", product: "Niacinamide or Salicylic Acid", frequency: "Harian" },
                { step: "Moisturizer", product: "Lightweight, oil-free moisturizer", frequency: "Pagi/Malam" },
                { step: "Sunscreen", product: "Non-comedogenic SPF 30+", frequency: "Pagi" }
            ],
            key_ingredients: ["Niacinamide", "Salicylic Acid", "Benzoyl Peroxide", "Zinc", "Clay"],
            avoid_ingredients: ["Heavy oils", "Petrolatum", "Comedogenic ingredients"],
            tips: [
                "Jangan terlalu sering membersihkan atau mengeringkan kulit",
                "Gunakan kertas minyak sepanjang hari",
                "Pilih produk non-komedogenik"
            ]
        },
        
        combination: {
            characteristics: [
                "Zona T berminyak (dahi, hidung, dagu)",
                "Pipi normal hingga kering",
                "Ukuran pori campuran",
                "Kebutuhan berbeda di area yang berbeda"
            ],
            identification: {
                morning_feel: "Berminyak di zona T, normal/kering di pipi",
                afternoon_feel: "Sangat berminyak di zona T, nyaman di pipi",
                pore_size: "Besar di zona T, kecil di pipi",
                sensitivity: "Bervariasi berdasarkan zona"
            },
            recommended_routine: [
                { step: "Cleanser", product: "Gentle gel cleanser", frequency: "Pagi/Sore" },
                { step: "Toner", product: "Balancing toner", frequency: "Pagi/Sore" },
                { step: "Treatment", product: "BHA on T-zone, Hydrating serum on cheeks", frequency: "As needed" },
                { step: "Moisturizer", product: "Lightweight on T-zone, richer on cheeks", frequency: "Pagi/Malam" },
                { step: "Sunscreen", product: "Broad spectrum SPF 30+", frequency: "Pagi" }
            ],
            key_ingredients: ["Niacinamide", "Hyaluronic Acid", "Salicylic Acid", "Ceramides"],
            avoid_ingredients: ["One-size-fits-all products"],
            tips: [
                "Gunakan produk yang berbeda untuk area yang berbeda",
                "Pertimbangkan multi-masking", 
                "Jangan terlalu sering mengobati seluruh wajah"
            ]
        }
    }
};

const ROUTINE_GUIDE_EDUCATION = {
    overview: "Urutan rutinitas perawatan kulit yang tepat memastikan efektivitas produk maksimum dan mencegah konflik bahan.",
    
    basic_routine_order: [
        {
            step: 1,
            name: "Oil Cleanser", 
            time: ["Malam"],
            purpose: "Menghapus makeup, sunscreen, dan kotoran berbasis minyak",
            product_types: ["Cleansing oil", "Cleansing balm"],
            optional: true,
            duration: "30-60 detik"
        },
        {
            step: 2,
            name: "Water-based Cleanser",
            time: ["Pagi", "Malam"],
            purpose: "Menghapus kotoran berbasis air dan sisa-sisa yang tertinggal",
            product_types: ["Gel cleanser", "Foam cleanser", "Cream cleanser"],
            optional: false,
            duration: "30 detik"
        },
        {
            step: 3,
            name: "Exfoliant",
            time: ["Malam"],
            purpose: "Mengangkat sel-sel kulit mati, memperbaiki tekstur",
            product_types: ["AHA", "BHA", "Enzyme exfoliant"],
            optional: true,
            frequency: "2-3x per minggu",
            note: "Tidak untuk penggunaan harian"
        },
        {
            step: 4,
            name: "Toner/Essence",
            time: ["Pagi", "Malam"],
            purpose: "Menyeimbangkan pH, mempersiapkan kulit untuk produk selanjutnya",
            product_types: ["Hydrating toner", "Treatment toner", "Essence"],
            optional: true,
            application: "Tap lembut dengan tangan"
        },
        {
            step: 5,
            name: "Treatment Serum",
            time: ["bervariasi"],
            purpose: "Target specific skin concerns",
            product_types: ["Vitamin C (Pagi)", "Retinol (Malam)", "Niacinamide", "Hyaluronic Acid"],
            optional: true,
            note: "Pilih berdasarkan masalah kulit"
        },
        {
            step: 6,
            name: "Moisturizer",
            time: ["Pagi", "Malam"],
            purpose: "Menghidrasi kulit dan mengunci produk sebelumnya",
            product_types: ["Day moisturizer", "Night moisturizer", "Face cream"],
            optional: false,
            note: "Esensial untuk semua jenis kulit"
        },
        {
            step: 7,
            name: "Sunscreen",
            time: ["Pagi"],
            purpose: "Melindungi dari kerusakan UV",
            product_types: ["Chemical sunscreen", "Mineral sunscreen"], 
            optional: false,
            spf: "Minimum SPF 30",
            note: "Langkah terpenting"
        }
    ],
    
    routine_mistakes: [
        {
            mistake: "Menggunakan terlalu banyak produk sekaligus",
            solution: "Perkenalkan satu produk baru pada satu waktu"
        },
        {
            mistake: "Tidak menunggu antara langkah",
            solution: "Biarkan 30-60 detik antara setiap produk"
        },
        {
            mistake: "Menggunakan bahan aktif setiap hari segera",
            solution: "Mulai 1-2x per minggu dan tingkatkan toleransi"
        },
        {
            mistake: "Tidak menggunakan sunscreen",
            solution: "Jadikan SPF 30+ sebagai langkah harian yang tidak bisa dinegosiasikan"
        }
    ]
};

const INGREDIENTS_EDUCATION = {
    overview: "Memahami bahan-bahan perawatan kulit membantu Anda membuat keputusan yang tepat tentang produk dan membangun rutinitas yang efektif.",

    categories: {
        exfoliants: {
            description: "Ingredients yang membantu mengangkat sel-sel kulit mati dan memperbaiki tekstur kulit",
            ingredients: [
                {
                    name: "AHA (Alpha Hydroxy Acids)",
                    scientific_names: ["Glycolic Acid", "Lactic Acid", "Mandelic Acid"],
                    what_it_does: "Asam yang larut dalam air dan mengangkat sel-sel kulit mati di permukaan",
                    benefits: ["Improves texture", "Reduces fine lines", "Brightens complexion"],
                    best_for: ["Normal", "Dry", "Combination"],
                    avoid_if: ["Very sensitive skin", "Active breakouts"],
                    usage_tips: [
                        "Diawali 1-2x seminggu",
                        "Gunakan hanya di malam hari",
                        "Selalu ikuti dengan sunscreen"
                    ],
                    concentration_guide: {
                        beginner: "5-8%",
                        intermediate: "8-12%",
                        advanced: "12-15%"
                    }
                },
                {
                    name: "BHA (Beta Hydroxy Acid)", 
                    scientific_names: ["Salicylic Acid"],
                    what_it_does: "Asam yang larut dalam minyak dan dapat menembus pori-pori",
                    benefits: ["Unclogs pores", "Reduces blackheads", "Controls oil"],
                    best_for: ["Oily", "Combination", "Acne-prone"],
                    avoid_if: ["Very dry skin", "Aspirin allergy"],
                    usage_tips: [
                        "Diawali 2-3x seminggu",
                        "Dapat digunakan di pagi atau malam hari",
                        "Ikuti dengan moisturizer"
                    ],
                    concentration_guide: {
                        beginner: "0.5-1%",
                        intermediate: "1-2%",
                        advanced: "2%"
                    }
                }
            ]
        },
        
        anti_aging: {
            description: "Ingredients yang membantu mencegah dan mengurangi tanda-tanda penuaan",
            ingredients: [
                {
                    name: "Retinol/Retinoids",
                    scientific_names: ["Retinol", "Retinyl Palmitate", "Tretinoin"],
                    what_it_does: "Derivatif Vitamin A yang meningkatkan pergantian sel",
                    benefits: ["Reduces fine lines", "Improves texture", "Fades dark spots"],
                    best_for: ["All skin types (with proper introduction)"],
                    avoid_if: ["Pregnancy", "Breastfeeding"],
                    usage_tips: [
                        "Diawali sekali seminggu",
                        "Gunakan hanya di malam hari",
                        "Tingkatkan toleransi secara perlahan"
                    ],
                    concentration_guide: {
                        beginner: "0.25-0.5%",
                        intermediate: "0.5-1%",
                        advanced: "1%+"
                    }
                }
            ]
        },
        
        hydrating: {
            description: "Ingredients yang menarik dan mempertahankan kelembapan di kulit",
            ingredients: [
                {
                    name: "Hyaluronic Acid",
                    scientific_names: ["Sodium Hyaluronate", "Hyaluronic Acid"],
                    what_it_does: "Humectant yang dapat menahan 1000x beratnya dalam air",
                    benefits: ["Deep hydration", "Plumps skin", "Suitable for all skin types"],
                    best_for: ["All skin types"],
                    avoid_if: ["No known contraindications"],
                    usage_tips: [
                        "Oleskan pada kulit yang lembap",
                        "Ikuti dengan moisturizer", 
                        "Dapat digunakan di pagi dan malam hari"
                    ],
                    concentration_guide: {
                        effective: "0.1-2%"
                    }
                }
            ]
        }
    }
};

module.exports = {
    SKIN_TYPES_EDUCATION,
    ROUTINE_GUIDE_EDUCATION, 
    INGREDIENTS_EDUCATION
};