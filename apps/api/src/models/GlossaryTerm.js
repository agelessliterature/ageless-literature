export default (sequelize, DataTypes) => {
  const GlossaryTerm = sequelize.define(
    'GlossaryTerm',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      term: { type: DataTypes.STRING, allowNull: false, unique: true },
      definition: { type: DataTypes.TEXT, allowNull: false },
      category: { type: DataTypes.STRING, allowNull: true },
      slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    },
    { tableName: 'glossary_terms', timestamps: true },
  );

  return GlossaryTerm;
};
