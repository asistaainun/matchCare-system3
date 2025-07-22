class RecommendationService {
  static async generateRecommendations(quizResults) {
    const { skinType, concerns, sensitivities } = quizResults;
    
    // 1. Base query - products suitable for skin type
    let whereClause = {};
    
    if (skinType && skinType !== 'unknown') {
      whereClause.suitable_for_skin_types = {
        [Op.or]: [
          { [Op.iLike]: `%${skinType}%` },
          { [Op.iLike]: '%all%' }
        ]
      };
    }
    
    // 2. Sensitivity filtering (EXCLUDE products)
    if (sensitivities?.fragrance) {
      whereClause.fragrance_free = true;
    }
    if (sensitivities?.alcohol) {
      whereClause.alcohol_free = true;
    }
    
    const products = await Product.findAll({
      where: whereClause,
      include: [{ model: Brand, attributes: ['name'] }],
      limit: 20
    });
    
    // 3. Score and rank products
    const scoredProducts = products.map(product => {
      const score = this.calculateMatchScore(product, quizResults);
      return {
        ...product.toJSON(),
        matchScore: score.total,
        reasoning: score.reasoning
      };
    });
    
    // 4. Sort by match score
    return scoredProducts
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 12);
  }
  
  static calculateMatchScore(product, quizResults) {
    let score = 50; // Base score
    const reasoning = [];
    
    // Skin type match
    if (product.suitable_for_skin_types?.includes(quizResults.skinType)) {
      score += 30;
      reasoning.push(`Perfect for ${quizResults.skinType} skin`);
    }
    
    // Concern addressing
    if (quizResults.concerns) {
      quizResults.concerns.forEach(concern => {
        if (product.addresses_concerns?.includes(concern)) {
          score += 15;
          reasoning.push(`Helps with ${concern}`);
        }
      });
    }
    
    // Sensitivity safety
    if (quizResults.sensitivities?.fragrance && product.fragrance_free) {
      score += 10;
      reasoning.push('Fragrance-free formula');
    }
    
    return {
      total: Math.min(score, 100),
      reasoning
    };
  }
}