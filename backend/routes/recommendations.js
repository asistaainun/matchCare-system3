const express = require('express');
const { Product, Brand, Ingredient } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// Basic recommendation algorithm (pre-SPARQL)
router.post('/api/recommendations', async (req, res) => {
  try {
    const { skin_type, concerns, sensitivities, session_id } = req.body;

    console.log('🎯 Generating recommendations for:', {
      skin_type,
      concerns: concerns?.length || 0,
      sensitivities: sensitivities?.length || 0
    });

    // 1. Basic filtering berdasarkan skin type
    let baseFilter = { is_active: true };
    
    // 2. Filter berdasarkan concerns (mapping sederhana)
    const concernMapping = {
      'acne': ['acne', 'salicylic', 'benzoyl peroxide', 'niacinamide'],
      'dryness': ['hyaluronic acid', 'ceramide', 'glycerin', 'moisturizing'],
      'oiliness': ['niacinamide', 'salicylic acid', 'clay', 'oil control'],
      'sensitivity': ['gentle', 'fragrance free', 'hypoallergenic'],
      'dark_spots': ['vitamin c', 'niacinamide', 'kojic acid', 'arbutin'],
      'wrinkles': ['retinol', 'peptide', 'vitamin c', 'anti aging']
    };

    // 3. Build search terms dari concerns
    let searchTerms = [];
    if (concerns && concerns.length > 0) {
      concerns.forEach(concern => {
        const terms = concernMapping[concern.toLowerCase()];
        if (terms) searchTerms.push(...terms);
      });
    }

    // 4. Filter products berdasarkan search terms
    let productFilter = { ...baseFilter };
    if (searchTerms.length > 0) {
      productFilter[Op.or] = [
        { name: { [Op.iLike]: `%${searchTerms.join('%')}%` } },
        { description: { [Op.iLike]: `%${searchTerms.join('%')}%` } },
        { key_ingredients_csv: { [Op.iLike]: `%${searchTerms.join('%')}%` } }
      ];
    }

    // 5. Exclude products dengan sensitivities
    if (sensitivities && sensitivities.length > 0) {
      const sensitivityFilter = {
        [Op.and]: sensitivities.map(sensitivity => {
          switch(sensitivity.toLowerCase()) {
            case 'fragrance':
              return { fragrance_free: true };
            case 'alcohol':
              return { alcohol_free: true };
            case 'paraben':
              return { paraben_free: true };
            case 'sulfate':
              return { sulfate_free: true };
            case 'silicone':
              return { silicone_free: true };
            default:
              return {};
          }
        })
      };
      productFilter = { ...productFilter, ...sensitivityFilter };
    }

    // 6. Query products dengan include Brand
    const recommendations = await Product.findAll({
      where: productFilter,
      include: [
        {
          model: Brand,
          as: 'brand',
          attributes: ['id', 'name']
        }
      ],
      limit: 20,
      order: [['id', 'ASC']] // Simple ordering untuk sekarang
    });

    // 7. Score dan rank products (basic algorithm)
    const scoredProducts = recommendations.map(product => {
      let score = 50; // Base score

      // Score berdasarkan skin type match
      if (skin_type && product.suitable_for_skin_types) {
        const suitableTypes = product.suitable_for_skin_types.toLowerCase();
        if (suitableTypes.includes(skin_type.toLowerCase())) {
          score += 30;
        }
      }

      // Score berdasarkan concern match
      if (concerns && concerns.length > 0) {
        concerns.forEach(concern => {
          const productText = `${product.name} ${product.description} ${product.key_ingredients_csv}`.toLowerCase();
          const concernTerms = concernMapping[concern.toLowerCase()] || [];
          
          concernTerms.forEach(term => {
            if (productText.includes(term.toLowerCase())) {
              score += 10;
            }
          });
        });
      }

      // Bonus untuk safety flags
      if (sensitivities && sensitivities.length > 0) {
        sensitivities.forEach(sensitivity => {
          switch(sensitivity.toLowerCase()) {
            case 'fragrance':
              if (product.fragrance_free) score += 15;
              break;
            case 'alcohol':
              if (product.alcohol_free) score += 15;
              break;
            case 'paraben':
              if (product.paraben_free) score += 15;
              break;
          }
        });
      }

      return {
        ...product.toJSON(),
        recommendation_score: score,
        recommendation_reason: generateRecommendationReason(product, skin_type, concerns, sensitivities)
      };
    });

    // 8. Sort by score
    const sortedRecommendations = scoredProducts
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, 12); // Top 12 recommendations

    // 9. Generate insights
    const insights = generateInsights(skin_type, concerns, sensitivities, sortedRecommendations.length);

    res.json({
      success: true,
      data: {
        recommendations: sortedRecommendations,
        insights,
        filters_applied: {
          skin_type,
          concerns,
          sensitivities,
          total_found: sortedRecommendations.length
        },
        algorithm_version: 'basic_v1.0'
      },
      message: `Found ${sortedRecommendations.length} personalized recommendations`
    });

  } catch (error) {
    console.error('❌ Recommendation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations',
      error: error.message
    });
  }
});

// Helper function untuk generate recommendation reason
function generateRecommendationReason(product, skinType, concerns, sensitivities) {
  let reasons = [];

  if (skinType && product.suitable_for_skin_types?.toLowerCase().includes(skinType.toLowerCase())) {
    reasons.push(`Perfect for ${skinType} skin`);
  }

  if (concerns && concerns.length > 0) {
    const matchedConcerns = concerns.filter(concern => {
      const productText = `${product.name} ${product.description}`.toLowerCase();
      return productText.includes(concern.toLowerCase());
    });
    
    if (matchedConcerns.length > 0) {
      reasons.push(`Targets ${matchedConcerns.join(', ')}`);
    }
  }

  if (sensitivities && sensitivities.length > 0) {
    const safetyFeatures = [];
    if (product.fragrance_free && sensitivities.includes('fragrance')) safetyFeatures.push('fragrance-free');
    if (product.alcohol_free && sensitivities.includes('alcohol')) safetyFeatures.push('alcohol-free');
    if (product.paraben_free && sensitivities.includes('paraben')) safetyFeatures.push('paraben-free');
    
    if (safetyFeatures.length > 0) {
      reasons.push(`Safe choice: ${safetyFeatures.join(', ')}`);
    }
  }

  return reasons.length > 0 ? reasons.join(' • ') : 'Recommended based on your profile';
}

// Helper function untuk generate insights
function generateInsights(skinType, concerns, sensitivities, recommendationCount) {
  const insights = [];

  if (recommendationCount === 0) {
    insights.push({
      type: 'warning',
      message: 'No products found matching all your criteria. Try adjusting your preferences.'
    });
  } else if (recommendationCount < 5) {
    insights.push({
      type: 'info', 
      message: 'Limited options found. Consider exploring similar products or adjusting filters.'
    });
  } else {
    insights.push({
      type: 'success',
      message: `Great! Found ${recommendationCount} products tailored for your ${skinType} skin.`
    });
  }

  if (concerns && concerns.length > 3) {
    insights.push({
      type: 'tip',
      message: 'Focus on 1-2 main concerns first for more targeted results.'
    });
  }

  if (sensitivities && sensitivities.length > 0) {
    insights.push({
      type: 'safety',
      message: `Filtered out products with ${sensitivities.join(', ')} for your safety.`
    });
  }

  return insights;
}

module.exports = router;