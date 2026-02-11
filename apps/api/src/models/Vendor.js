/**
 * Vendor Model
 * Business profiles for book sellers with commission-based earnings
 * 8% platform commission, 92% vendor earnings
 */

export default (sequelize, DataTypes) => {
  const Vendor = sequelize.define(
    'Vendor',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        field: 'user_id', // Map to snake_case column name
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'References users.id (INTEGER)',
      },
      // Shop Information
      shopName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'shop_name',
        comment: 'Display name for vendor shop',
      },
      shopUrl: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        field: 'shop_url',
        comment: 'URL slug for vendor shop page',
      },

      // Contact Information
      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'phone_number',
      },

      // Business Details
      businessDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'business_description',
        comment: 'Vendor business description and details',
      },
      websiteUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'website_url',
      },
      // Social Media Links
      socialFacebook: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'social_facebook',
        comment: 'Facebook profile or page URL',
      },
      socialTwitter: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'social_twitter',
        comment: 'Twitter/X profile URL',
      },
      socialInstagram: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'social_instagram',
        comment: 'Instagram profile URL',
      },
      socialLinkedin: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'social_linkedin',
        comment: 'LinkedIn profile or company URL',
      },

      // Cloudinary image fields
      logoUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'logo_url',
        comment: 'Cloudinary URL for vendor logo',
      },
      logoPublicId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'logo_public_id',
        comment: 'Cloudinary public_id for logo deletion',
      },
      bannerUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'banner_url',
        comment: 'Cloudinary URL for vendor banner/cover photo',
      },
      bannerPublicId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'banner_public_id',
        comment: 'Cloudinary public_id for banner deletion',
      },
      // Commission & Financials
      commissionRate: {
        type: DataTypes.DECIMAL(5, 4),
        defaultValue: 0.08,
        allowNull: false,
        field: 'commission_rate',
        comment: 'Platform commission rate (default 8% = 0.08)',
      },
      // Balance Tracking
      balanceAvailable: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.0,
        allowNull: false,
        field: 'balance_available',
        comment: 'Vendor earnings available for immediate payout',
      },
      balancePending: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.0,
        allowNull: false,
        field: 'balance_pending',
        comment: 'Future payouts from orders not yet settled',
      },
      lifetimeGrossSales: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.0,
        allowNull: false,
        field: 'lifetime_gross_sales',
        comment: 'Total gross sales (before commission)',
      },
      lifetimeCommissionTaken: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.0,
        allowNull: false,
        field: 'lifetime_commission_taken',
        comment: 'Total platform commission taken (8%)',
      },
      lifetimeVendorEarnings: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.0,
        allowNull: false,
        field: 'lifetime_vendor_earnings',
        comment: 'Total vendor earnings (92% - after commission)',
      },
      // Status & Approval
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'active', 'suspended', 'archived'),
        defaultValue: 'pending',
        allowNull: false,
        comment: 'pending=awaiting approval, approved/active=can sell, rejected=denied',
      },
      rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'rejection_reason',
        comment: 'Reason for rejection (shown to applicant)',
      },
      adminNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'admin_notes',
        comment: 'Internal admin notes (not shown to vendor)',
      },
      approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'approved_at',
        comment: 'Timestamp when vendor was approved',
      },
      approvedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'approved_by',
        comment: 'Admin user ID who approved (INTEGER)',
        references: {
          model: 'users',
          key: 'id',
        },
      },
      // Featured Vendor Fields
      isFeatured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        field: 'is_featured',
        comment: 'Whether vendor is currently featured on booksellers page',
      },
      featuredStartDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'featured_start_date',
        comment: 'Start date/time for featured status (null = immediately)',
      },
      featuredEndDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'featured_end_date',
        comment: 'End date/time for featured status (null = no expiration)',
      },
      featuredPriority: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        field: 'featured_priority',
        comment: 'Display priority for featured vendors (higher = shown first)',
      },

      // Stripe Connect Fields
      stripeAccountId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'stripe_account_id',
        comment: 'Stripe Connect account ID for automatic payouts',
      },
      stripeAccountStatus: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'stripe_account_status',
        comment: 'Stripe account status: pending, active, restricted, inactive',
      },

      // Payout Settings
      payoutMethod: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'paypal',
        field: 'payout_method',
        comment: 'Preferred payout method: stripe or paypal',
      },
      paypalEmail: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'paypal_email',
        comment: 'PayPal email address for manual payouts',
      },

      // Display Order
      menuOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        field: 'menu_order',
        comment: 'Display order for vendors (lower = higher priority)',
      },
      wpVendorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'wp_vendor_id',
        comment: 'WordPress vendor/user ID for data sync',
      },
    },
    {
      tableName: 'vendors',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['user_id'], unique: true },
        { fields: ['shop_url'], unique: true },
        { fields: ['status'] },
        { fields: ['created_at'] },
        { fields: ['menu_order'] },
        { fields: ['wp_vendor_id'] },
      ],
    },
  );

  Vendor.associate = (models) => {
    // User relationship
    if (models.User) {
      Vendor.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }

    // Books relationship
    if (models.Book) {
      Vendor.hasMany(models.Book, {
        foreignKey: 'vendorId',
        as: 'books',
      });
    }

    // Products relationship
    if (models.Product) {
      Vendor.hasMany(models.Product, {
        foreignKey: 'vendorId',
        as: 'products',
      });
    }

    // Payout settings
    if (models.VendorPayoutSettings) {
      Vendor.hasOne(models.VendorPayoutSettings, {
        foreignKey: 'vendorId',
        as: 'payoutSettings',
      });
    }

    // Vendor earnings and payouts
    if (models.VendorEarning) {
      Vendor.hasMany(models.VendorEarning, {
        foreignKey: 'vendorId',
        as: 'earnings',
      });
    }

    if (models.VendorPayout) {
      Vendor.hasMany(models.VendorPayout, {
        foreignKey: 'vendorId',
        as: 'payouts',
      });
    }

    if (models.VendorWithdrawal) {
      Vendor.hasMany(models.VendorWithdrawal, {
        foreignKey: 'vendorId',
        as: 'withdrawals',
      });
    }
  };

  return Vendor;
};
