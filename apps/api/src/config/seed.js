/**
 * Database Seeder
 * Creates default data in local/dev environments
 */

export const seedDatabase = async () => {
  try {
    const environment = process.env.NODE_ENV || 'development';

    // Only seed in local/development environments
    if (environment === 'development' || environment === 'local') {
      // Seeding logic would go here
      console.log('Seeding database for development environment');
    } else {
      console.log('Skipping seed in production environment');
    }
  } catch (error) {
    console.error('Seeding error:', error);
  }
};
