/**
 * User Model
 * Authentication, authorization, and profile management
 *
 * Relationships:
 * - Vendor profile (1:1)
 * - Collector profile (1:1)
 * - Membership subscription (1:1)
 * - Orders, Cart, Wishlists, Auctions, Notifications
 */

import bcrypt from 'bcrypt';

export default (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: true, // Nullable for OAuth-only users
        field: 'hash',
      },
      password: {
        type: DataTypes.VIRTUAL,
        allowNull: true,
        validate: {
          len: [8, 100],
        },
      },
      name: {
        type: DataTypes.VIRTUAL,
        allowNull: true,
        get() {
          const firstName = this.getDataValue('firstName');
          const lastName = this.getDataValue('lastName');
          if (firstName && lastName) {
            return `${firstName} ${lastName}`;
          }
          return firstName || lastName || null;
        },
        comment: 'Full name (computed from first + last)',
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'first_name',
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'last_name',
      },
      phoneNumber: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'phone_number',
        comment: 'User phone number',
      },
      image: {
        type: DataTypes.VIRTUAL,
        allowNull: true,
        get() {
          return this.getDataValue('profilePhotoUrl') || null;
        },
        set(value) {
          this.setDataValue('profilePhotoUrl', value);
        },
        comment: 'Profile picture URL (virtual field mapping to profilePhotoUrl)',
      },
      // Cloudinary image fields
      profilePhotoUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'profile_photo_url',
        comment: 'Cloudinary URL for user profile photo',
      },
      profilePhotoPublicId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'profile_photo_public_id',
        comment: 'Cloudinary public_id for profile photo deletion',
      },
      // OAuth fields (VIRTUAL - columns don't exist in DB yet, will be added by migration)
      provider: {
        type: DataTypes.VIRTUAL,
        defaultValue: 'credentials',
        get() {
          return 'credentials'; // Default until migration adds the column
        },
        comment: 'Authentication provider: credentials, google, apple',
      },
      providerId: {
        type: DataTypes.VIRTUAL,
        defaultValue: null,
        get() {
          return null; // Default until migration adds the column
        },
        comment: 'User ID from OAuth provider',
      },
      emailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        field: 'email_verified',
        comment: 'Email verification status',
      },
      emailVerifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'email_verified_at',
        comment: 'Email verification timestamp',
      },
      // Role and permissions
      // Database enum: 'admin', 'vendor', 'customer' (lowercase)
      role: {
        type: DataTypes.ENUM('admin', 'vendor', 'customer'),
        defaultValue: 'customer',
        allowNull: false,
        field: 'role',
      },
      // Account status
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'pending', 'revoked'),
        defaultValue: 'active',
        allowNull: false,
        field: 'status',
        comment:
          'User account status: active (verified/normal), inactive (disabled), pending (awaiting verification), revoked (banned)',
      },
      // Session tracking
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_login_at',
        comment: 'Last login timestamp',
      },
      lastLogoutAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_logout_at',
        comment: 'Last logout timestamp',
      },
      isOnline: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        field: 'is_online',
        comment: 'Online status',
      },
      // Preferences
      defaultLanguage: {
        type: DataTypes.STRING(10),
        defaultValue: 'en',
        allowNull: false,
        field: 'default_language',
        comment: 'User preferred language: en, es, fr, de',
      },
      timezone: {
        type: DataTypes.STRING(50),
        defaultValue: 'UTC',
        allowNull: false,
        field: 'timezone',
        comment: 'User timezone preference',
      },
      currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'USD',
        allowNull: false,
        field: 'default_currency',
        comment: 'User currency preference (maps to default_currency column)',
      },
      // Notifications
      emailNotifications: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        field: 'email_notifications',
        comment: 'Email notifications preference',
      },
      marketingEmails: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        field: 'marketing_emails',
        comment: 'Marketing emails preference',
      },
      // Stripe fields
      stripeCustomerId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'stripe_customer_id',
        comment: 'Stripe customer ID for payment processing',
      },
      defaultPaymentMethodId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'default_payment_method_id',
        comment: 'Default Stripe payment method ID',
      },
      // Address fields (JSONB)
      billingAddress: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: 'billing_address',
        comment: 'Billing address stored as JSON',
      },
      shippingAddress: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: 'shipping_address',
        comment: 'Shipping address stored as JSON',
      },
      // Metadata
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {},
        allowNull: false,
        field: 'metadata',
        comment: 'Additional user metadata and preferences',
      },
      // ── Legacy WP auth fields (Phase C cutover) ──────────────────
      wpUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        field: 'wp_user_id',
        comment: 'Original WordPress user ID',
      },
      legacyPasswordHash: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
        field: 'legacy_password_hash',
        comment: 'WP password hash; cleared once bcrypt upgrade completes',
      },
      legacyHashType: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: null,
        field: 'legacy_hash_type',
        comment: 'phpass | md5 | null',
      },
      passwordMigratedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        field: 'password_migrated_at',
        comment: 'Timestamp of bcrypt upgrade from legacy hash',
      },
      wpRolesRaw: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        field: 'wp_roles_raw',
        comment: 'Raw WP capabilities PHP-serialized string',
      },
      passwordResetRequired: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'password_reset_required',
        comment: 'True when user must reset password before logging in',
      },
    },
    {
      tableName: 'users',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['email'], unique: true },
        { fields: ['role'] },
        { fields: ['provider'] },
        { fields: ['provider_id'] },
        { fields: ['provider', 'provider_id'] },
        { fields: ['email_verified'] },
        { fields: ['is_online'] },
        { fields: ['last_login_at'] },
      ],
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            // Trim password to handle potential whitespace from copy-paste (especially on Windows)
            user.password = user.password.trim();
            const salt = await bcrypt.genSalt(10);
            user.passwordHash = await bcrypt.hash(user.password, salt);
          }
          // Set name from firstName + lastName if not provided
          if (!user.name && (user.firstName || user.lastName)) {
            user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed('password') && user.password) {
            // Trim password to handle potential whitespace from copy-paste (especially on Windows)
            user.password = user.password.trim();
            const salt = await bcrypt.genSalt(10);
            user.passwordHash = await bcrypt.hash(user.password, salt);
          }
          // Update name if firstName or lastName changed
          if (user.changed('firstName') || user.changed('lastName')) {
            user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          }
        },
      },
    },
  );

  // Instance methods
  User.prototype.comparePassword = async function (candidatePassword) {
    if (!this.passwordHash) {
      return false; // OAuth-only users have no password
    }
    // Trim password to handle potential whitespace from copy-paste (especially on Windows)
    const trimmedPassword = candidatePassword ? candidatePassword.trim() : '';
    return bcrypt.compare(trimmedPassword, this.passwordHash);
  };

  User.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    delete values.passwordHash;
    delete values.password;
    delete values.legacyPasswordHash; // never expose WP hashes to clients
    delete values.wpRolesRaw; // internal audit field only
    return values;
  };

  User.prototype.isVendor = function () {
    return this.role === 'vendor';
  };

  User.prototype.isAdmin = function () {
    return this.role === 'admin';
  };

  User.prototype.isCollector = function () {
    return this.role === 'customer';
  };

  User.prototype.canAccessAdmin = function () {
    return this.role === 'admin';
  };

  User.prototype.updateLoginTimestamp = async function () {
    this.lastLoginAt = new Date();
    this.isOnline = true;
    await this.save();
  };

  User.prototype.updateLogoutTimestamp = async function () {
    this.lastLogoutAt = new Date();
    this.isOnline = false;
    await this.save();
  };

  // Class methods
  User.findByEmail = async function (email) {
    return this.findOne({ where: { email } });
  };

  // TEMPORARILY DISABLED: provider/providerId columns don't exist yet
  // Will be re-enabled after migrations add these columns
  User.findByProviderId = async function (_provider, _providerId) {
    // return this.findOne({ where: { provider, providerId } });
    return null; // Temporarily disabled - OAuth columns don't exist in DB
  };

  User.getOnlineUsers = async function () {
    return this.findAll({
      where: { isOnline: true },
      attributes: { exclude: ['passwordHash'] },
      order: [['lastLoginAt', 'DESC']],
    });
  };

  User.associate = (models) => {
    // Vendor profile (1:1 relationship)
    User.hasOne(models.Vendor, {
      foreignKey: 'userId',
      as: 'vendorProfile',
    });

    // Membership subscription (1:1 relationship)
    User.hasOne(models.MembershipSubscription, {
      foreignKey: 'userId',
      as: 'subscription',
    });

    // Order history
    User.hasMany(models.Order, {
      foreignKey: 'userId',
      as: 'orders',
    });

    // Shopping and wishlist
    User.hasOne(models.Cart, {
      foreignKey: 'userId',
      as: 'cart',
    });
    User.hasMany(models.Wishlist, {
      foreignKey: 'userId',
      as: 'wishlists',
    });
    User.hasMany(models.Reservation, {
      foreignKey: 'userId',
      as: 'reservations',
    });

    // Notifications
    User.hasMany(models.Notification, {
      foreignKey: 'userId',
      as: 'notifications',
    });

    // Auction participation
    User.hasMany(models.AuctionBid, {
      foreignKey: 'userId',
      as: 'bids',
    });
    User.hasMany(models.AuctionWin, {
      foreignKey: 'userId',
      as: 'auctionWins',
    });
  };

  return User;
};
