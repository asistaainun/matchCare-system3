const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const Brand = sequelize.define('Brand', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: DataTypes.TEXT
  // REMOVED: ontology_uri (not in actual database yet)
}, {
  tableName: 'brands',
  timestamps: true,
  underscored: true
});

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  brand_id: { type: DataTypes.INTEGER, references: { model: Brand, key: 'id' } },
  product_type: DataTypes.STRING,
  description: DataTypes.TEXT,
  how_to_use: DataTypes.TEXT,
  alcohol_free: { type: DataTypes.BOOLEAN, defaultValue: false },
  fragrance_free: { type: DataTypes.BOOLEAN, defaultValue: false },
  paraben_free: { type: DataTypes.BOOLEAN, defaultValue: false },
  sulfate_free: { type: DataTypes.BOOLEAN, defaultValue: false },
  silicone_free: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'products',
  timestamps: true,
  underscored: true
});

const Ingredient = sequelize.define('Ingredient', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  what_it_does: DataTypes.STRING,
  description: DataTypes.TEXT
}, {
  tableName: 'ingredients',
  timestamps: true,
  underscored: true
});

const ProductIngredient = sequelize.define('ProductIngredient', {
  product_id: { type: DataTypes.INTEGER, references: { model: Product, key: 'id' } },
  ingredient_id: { type: DataTypes.INTEGER, references: { model: Ingredient, key: 'id' } },
  is_key_ingredient: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'product_ingredients',
  timestamps: true,
  underscored: true
});

const UserProfile = sequelize.define('UserProfile', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  skin_type: { 
    type: DataTypes.ENUM('normal', 'dry', 'oily', 'combination'), 
    allowNull: false 
  },
  skin_concerns: { type: DataTypes.JSON, defaultValue: [] },
  sensitivities: { type: DataTypes.JSON, defaultValue: [] },
  session_id: DataTypes.STRING
}, {
  tableName: 'user_profiles',
  timestamps: true,
  underscored: true
});

// Associations
Brand.hasMany(Product, { foreignKey: 'brand_id' });
Product.belongsTo(Brand, { foreignKey: 'brand_id' });
Product.belongsToMany(Ingredient, { through: ProductIngredient, foreignKey: 'product_id' });
Ingredient.belongsToMany(Product, { through: ProductIngredient, foreignKey: 'ingredient_id' });

module.exports = { 
  sequelize, 
  Brand, 
  Product, 
  Ingredient, 
  ProductIngredient, 
  UserProfile 
};
