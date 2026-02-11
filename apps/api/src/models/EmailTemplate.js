/**
 * EmailTemplate Model
 * Stores customizable email templates with dynamic variables
 *
 * SCHEMA: Uses existing email_templates table schema
 * Database columns: id (integer), name, subject, body_html, category (enum),
 * active (boolean), updated_by_id (integer), created_at, updated_at
 */ export default (sequelize, DataTypes) => {
  const EmailTemplate = sequelize.define(
    'EmailTemplate',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Template name (e.g., "Welcome Email", "Order Confirmation")',
      },
      subject: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Email subject line with variable support {{variable}}',
      },
      bodyHtml: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'body_html',
        comment: 'HTML email body with variable support',
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Template category enum',
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      },
      updatedById: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'updated_by_id',
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      // VIRTUAL fields for backward compatibility
      slug: {
        type: DataTypes.VIRTUAL,
        get() {
          const name = this.getDataValue('name');
          return name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : null;
        },
        comment: 'Generated from name',
      },
      textBody: {
        type: DataTypes.VIRTUAL,
        allowNull: true,
        comment: 'Plain text fallback (not in schema)',
      },
      variables: {
        type: DataTypes.VIRTUAL,
        defaultValue: [],
        comment: 'Array of available variables (not in schema)',
      },
      isActive: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getDataValue('active');
        },
        comment: 'Maps to active field',
      },
      version: {
        type: DataTypes.VIRTUAL,
        defaultValue: 1,
        comment: 'Template version (not in schema)',
      },
    },
    {
      tableName: 'email_templates',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['name'], unique: true },
        { fields: ['category'] },
        { fields: ['updated_by_id'] },
      ],
    },
  );

  EmailTemplate.associate = (models) => {
    EmailTemplate.belongsTo(models.User, {
      foreignKey: 'updatedById',
      as: 'updatedBy',
    });
  };

  return EmailTemplate;
};
