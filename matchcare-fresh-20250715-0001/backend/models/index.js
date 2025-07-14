const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const Brand = sequelize.define('Brand', {
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: DataTypes.TEXT
});

const Product = sequelize.define('Product', {
  name: { type: DataTypes.STRING, allowNull: false },
  brand_id: { type: DataTypes.INTEGER, references: { model: Brand, key: 'id' } },
  product_type: DataTypes.STRING,
  description: DataTypes.TEXT,
  how_to_use: DataTypes.TEXT,
  alcohol_free: { type: DataTypes.BOOLEAN, defaultValue: false },
  fragrance_free: { type: DataTypes.BOOLEAN, defaultValue: false },
  paraben_free: { type: DataTypes.BOOLEAN, defaultValue: false },
  sulfate_free: { type: DataTypes.BOOLEAN, defaultValue: false },
  silicone_free: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const Ingredient = sequelize.define('Ingredient', {
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  what_it_does: DataTypes.STRING,
  description: DataTypes.TEXT
});

const ProductIngredient = sequelize.define('ProductIngredient', {
  product_id: { type: DataTypes.INTEGER, references: { model: Product, key: 'id' } },
  ingredient_id: { type: DataTypes.INTEGER, references: { model: Ingredient, key: 'id' } },
  is_key_ingredient: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// Associations
Brand.hasMany(Product, { foreignKey: 'brand_id' });
Product.belongsTo(Brand, { foreignKey: 'brand_id' });
Product.belongsToMany(Ingredient, { through: ProductIngredient, foreignKey: 'product_id' });
Ingredient.belongsToMany(Product, { through: ProductIngredient, foreignKey: 'ingredient_id' });

module.exports = { sequelize, Brand, Product, Ingredient, ProductIngredient };
