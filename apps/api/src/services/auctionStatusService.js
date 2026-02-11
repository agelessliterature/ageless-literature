/**
 * Auction Status Service
 * Handles automatic auction status transitions
 */

import db from '../models/index.js';
import { Op } from 'sequelize';

const { Auction } = db;

export const updateAuctionStatuses = async () => {
  try {
    const now = new Date();
    
    const activatedCount = await Auction.update(
      { status: 'active' },
      {
        where: {
          status: 'upcoming',
          start_date: { [Op.lte]: now }
        }
      }
    );
    
    const endedCount = await Auction.update(
      { status: 'ended' },
      {
        where: {
          status: 'active',
          end_date: { [Op.lte]: now }
        }
      }
    );
    
    if (activatedCount[0] > 0 || endedCount[0] > 0) {
      console.log(`[Auction Status] Updated: ${activatedCount[0]} activated, ${endedCount[0]} ended`);
    }
    
    return {
      activated: activatedCount[0],
      ended: endedCount[0]
    };
  } catch (error) {
    console.error('[Auction Status] Error:', error);
    throw error;
  }
};

export const getAuctionStatusStats = async () => {
  try {
    const stats = await Auction.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });
    
    return stats.reduce((acc, stat) => {
      acc[stat.status] = parseInt(stat.get('count'));
      return acc;
    }, {});
  } catch (error) {
    console.error('[Auction Status] Error getting stats:', error);
    throw error;
  }
};
